"""Deterministic, flat, fictional-only Windows package; no prior ZIP is touched."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipInfo,ZipFile,ZIP_STORED
import json,posixpath,re,sys

ROOT=Path(__file__).resolve().parent
SOURCES=['capture-adapter.mjs','desktop-lab.mjs','envelope-v2.mjs','fixture-child.mjs',
 'journal.mjs','process-source.mjs','reconstruction.mjs','source-capability.mjs',
 'windows-entry.mjs','approved/private-host.mjs','approved/provisional-crypto.mjs',
 'approved/docker-fictional.mjs','approved/package-io.mjs','qa/pg-fixture.mjs',
 'qa/closed-target.mjs','00-LABORATORIO-NUEVO-FICTICIO.cmd','LEEME-LABORATORIO-NUEVO.txt']
NAMES={s:s.replace('/','-') for s in SOURCES}
def build(directory,archive):
 directory,archive=Path(directory).resolve(),Path(archive).resolve()
 if directory.exists() or archive.exists():raise ValueError('EXISTING_ARTIFACT_PRESERVED')
 directory.mkdir(mode=0o700)
 for src,name in NAMES.items():
  data=(ROOT/src).read_bytes().decode('utf-8')
  if src.endswith('.mjs'):
   def replace(match):
    quote,relative=match.group(1),match.group(2)
    resolved=posixpath.normpath(posixpath.join(posixpath.dirname(src),relative))
    if resolved not in NAMES:raise ValueError('UNPACKAGED_MODULE_'+resolved)
    return quote+'./'+NAMES[resolved]+quote
   data=re.sub(r"(['\"])(\.\.?/[^'\"]+\.mjs)\1",replace,data)
  data=data.replace('\r\n','\n')
  if src.endswith('.cmd'):data=data.replace('\n','\r\n')
  (directory/name).write_bytes(data.encode('utf-8'))
 files=[]
 for p in sorted(directory.iterdir(),key=lambda x:x.name):
  b=p.read_bytes();files.append({'name':p.name,'bytes':len(b),'sha256':sha256(b).hexdigest()})
 manifest={'package':'CHEVENI_NEW_ADAPTER_FICTIONAL_ONLY_20261022','date':'2026-10-22',
  'remoteConnectionEnabled':False,'realCaptureApproved':False,'files':files}
 (directory/'MANIFEST.json').write_bytes((json.dumps(manifest,indent=2)+'\n').encode('utf-8'))
 with archive.open('xb') as stream,ZipFile(stream,'w',compression=ZIP_STORED) as z:
  for p in sorted(directory.iterdir(),key=lambda x:x.name):
   info=ZipInfo(p.name,(2026,10,22,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
   z.writestr(info,p.read_bytes())
 with ZipFile(archive) as z:
  assert z.testzip() is None and all('/' not in n for n in z.namelist())
  for item in files:
   assert sha256(z.read(item['name'])).hexdigest()==item['sha256']
 return {'sha256':sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,'manifestFiles':len(files),'zipEntries':len(files)+1}
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('usage: build-desktop-package.py NEW_DIRECTORY NEW_ZIP')
 print(json.dumps(build(sys.argv[1],sys.argv[2])))
