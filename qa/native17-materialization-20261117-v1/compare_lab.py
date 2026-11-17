#!/usr/bin/env python3
"""Compare A57 command TEXT to the proposed pure plan; execute neither recipe."""
import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import review

ROOT=Path(__file__).resolve().parent

def literal_reference(text):
    block=re.search(r"<<'PY'\n(.*?)\nPY\n```",text,re.S)
    if not block:raise ValueError('A57_LITERAL_BLOCK_MISSING')
    tree=ast.parse(block[1]);argv=None;shell=None
    # Reading a literal AST is not eval/exec of the historical command.
    for node in ast.walk(tree):
        if not isinstance(node,ast.Assign):continue
        names=[t.id for t in node.targets if isinstance(t,ast.Name)]
        if 'cmd' in names:
            if argv is not None or not isinstance(node.value,ast.List):raise ValueError('A57_ARGV_SHAPE')
            argv=[]
            for elt in node.value.elts:
                if isinstance(elt,ast.Constant) and isinstance(elt.value,str):argv.append(elt.value)
                elif ast.unparse(elt) in ['str(usr)','str(identity)','str(fd)','script']:argv.append('<'+ast.unparse(elt)+'>')
                else:raise ValueError('A57_UNSUPPORTED_DYNAMIC_ARGV')
        if 'script' in names:
            if shell is not None or not isinstance(node.value,ast.Constant) or not isinstance(node.value.value,str):raise ValueError('A57_SCRIPT_SHAPE')
            shell=node.value.value
    if not argv or shell is None:raise ValueError('A57_COMPONENT_MISSING')
    return dict(argvText=argv,scope='--scope' in text,
                tasks=32 if '-p TasksMax=32' in text else None,
                memoryBytes=1073741824 if '-p MemoryMax=1G' in text else None,
                swapBoundObserved=False,runtimeBoundObserved=False,
                uidArgumentPresent='--uid' in argv,
                fsyncOff='fsync=off' in shell,noSync='--no-sync' in shell,
                socket='/scratch' if 'unix_socket_directories=/scratch' in shell else None,
                port=55432 if 'port=55432' in shell else None,
                inheritedFd='pass_fds=(fd,)' in block[1],
                sourceClass='COMMAND_TEXT_AND_OWNER_SCREENSHOTS_NOT_SHELL_EXPORT')

def compare(reference,plan):
    local=next(p for p in plan['phases'] if p['id']=='local-unit')['argv']
    bwrap=local[local.index('bwrap'):]
    delta=[
      dict(component='task cap',historical=reference['tasks'],proposed=plan['limits']['tasks'],requires='effective pids/cgroup observation'),
      dict(component='unit/FD handoff',historical='scope + libseccomp memfd/pass_fds',proposed='service + checked file opened inside unit',requires='review fd_entry, identity and real fd inheritance; CLI remains held'),
      dict(component='identity',historical='owner-reported UID1000; no explicit --uid in argv',proposed='--uid/--gid 65534',requires='actual mapping, passwd/group and peer authentication; no assumed equivalence'),
      dict(component='mount layout',historical='/usr readonly + /etc identity + /scratch,/tmp tmpfs',proposed='root payload + /data,/tmp,/socket,/run,/sys tmpfs',requires='exact payload paths, read-only/size/mode and binary/library hashes'),
      dict(component='socket and port',historical=[reference['socket'],reference['port']],proposed=['/socket',6543],requires='peer identity and socket mode/path observation'),
      dict(component='persistence',historical='--no-sync/fsync off',proposed='fsync/synchronous_commit/full_page_writes on; tmpfs',requires='neither proves crash/power durability or A2'),
      dict(component='new limits/flags',historical='no observed swap/runtime cap in reference',proposed='swap0/runtime120/cap-drop ALL/unshare-cgroup',requires='separate review and measured limits; never inferred from A57=0')]
    if '--uid' not in bwrap or bwrap[bwrap.index('--uid')+1]!='65534':raise ValueError('PROPOSED_RECIPE_DRIFT')
    return dict(state='HELD_RECIPES_NOT_EQUIVALENT',executionEnabled=False,
                historicalReference=reference,differences=delta,
                nativeCasesAuthorized=False,postgresExecuted=False,
                safeNext='Read package/tests and local metadata only under explicit owner authorization; do not execute either recipe automatically.')

def main():
    review.assess(ROOT)
    sources=json.loads(review.input_bytes(ROOT,'SOURCE-PINS.json'))['sources']
    paths=['qa/reviews/native17-local-image-selector-20261117/A57-OWNER-COMMAND-REFERENCE.md',
           'qa/native17-post-asus-20261117-v1/lab/lab.py']
    data=[]
    for path in paths:
        pins=[s for s in sources if s['path']==path and s['ref']=='da08acf0142b11348aaaebbb869b4433e74e7574' and s['repository']=='MarcoAlexis10/chebot-web']
        if len(pins)!=1:raise ValueError('COMPARISON_SOURCE_PIN_MISSING')
        value=review.input_bytes(ROOT.parents[1],path)
        blob=hashlib.sha1(b'blob '+str(len(value)).encode()+b'\0'+value).hexdigest()
        if blob!=pins[0]['gitBlob'] or review.digest(value)!=pins[0]['sha256']:raise ValueError('COMPARISON_SOURCE_DRIFT')
        data.append(value)
    text=data[0].decode('utf8');path=ROOT.parents[1]/paths[1]
    spec=importlib.util.spec_from_file_location('held_lab_plan_only',path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return compare(literal_reference(text),module.plan({}))

if __name__=='__main__':print(json.dumps(main(),indent=2,ensure_ascii=False))
