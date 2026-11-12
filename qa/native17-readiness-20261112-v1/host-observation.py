"""Read-only metadata inventory. Does not run binaries, sockets or infrastructure."""
from pathlib import Path
import json
import os
import resource
import shutil

def observe():
    keys={'Uid','Gid','NSpid','CapEff','CapBnd','NoNewPrivs','Seccomp','Seccomp_filters'}
    status={k:v.strip() for line in Path('/proc/self/status').read_text().splitlines() if ':' in line for k,v in [line.split(':',1)] if k in keys}
    ns={n:{'self':os.readlink('/proc/self/ns/'+n),'pid1':os.readlink('/proc/1/ns/'+n)} for n in ['user','pid','net','mnt']}
    paths=['/usr/lib/postgresql','/usr/pgsql-17','/opt/postgresql']
    limits={}
    for name in ['memory.max','pids.max','cpu.max','memory.swap.max','memory/memory.limit_in_bytes','pids/pids.max','cpu/cpu.cfs_quota_us','cpu/cpu.cfs_period_us']:
        p=Path('/sys/fs/cgroup')/name
        limits[name]=p.read_text().strip() if p.is_file() else None
    mounts=Path('/proc/self/mountinfo').read_text().splitlines()
    return {
      'observation':'CURRENT_WORK_METADATA_ONLY','date':'2026-11-12',
      'noChildBinariesExecuted':True,'noSocketsOpened':True,'noCredentialEnvironmentValuesRead':True,'pathUsedOnlyForBinaryLookup':True,
      'uid':os.getuid(),'status':status,'namespaces':ns,
      'binariesLocatedNotExecuted':{n:shutil.which(n) for n in ['postgres','initdb','pg_ctl','psql','unshare','bwrap','node']},
      'knownInstallationDirs':{d:sorted(p.name for p in Path(d).iterdir()) if Path(d).is_dir() else None for d in paths},
      'cgroupLimits':limits,
      'rlimits':{n:list(resource.getrlimit(getattr(resource,n))) for n in ['RLIMIT_NPROC','RLIMIT_AS','RLIMIT_NOFILE','RLIMIT_CPU','RLIMIT_FSIZE']},
      'mountCount':len(mounts),'sharedMountCount':sum('shared:' in s for s in mounts),
      'routeEntries':len(Path('/proc/net/route').read_text().splitlines()[1:]),
      'nativeVersionObserved':False,'disposableMountPidResourcePerimeterAccredited':False,
      'remoteResourcesInspected':False,'otherHostsClaimedAbsent':False,
      'hostDecision':'HOST_NOT_AVAILABLE','betaDecision':'NO-GO',
      'scopeLimit':'No accredited host among currently inspectable authorized resources. Not a global inventory.'}

if __name__=='__main__':
    print(json.dumps(observe(),indent=2))
