"""Only TTY fix scope and updated operational manifest; no approved suite."""
from pathlib import Path
import tempfile,subprocess,sys,json,zipfile,hashlib
root=Path(__file__).resolve().parents[2]
old=json.loads(Path(__file__).with_name('baseline-manifest.json').read_bytes())
with tempfile.TemporaryDirectory(prefix='cv-tty-fix-package-') as d:
 d=Path(d).resolve();a=d/'one.zip';b=d/'two.zip'
 for p in [a,b]: subprocess.run([sys.executable,str(root/'build-release.py'),str(p)],capture_output=True,text=True,check=True)
 assert a.read_bytes()==b.read_bytes(),'TTY_FIX_NOT_REPRODUCIBLE'
 with zipfile.ZipFile(a) as z:
  m=json.loads(z.read('MANIFEST.json'));oldmap={f['name']:f['sha256'] for f in old['files']};newmap={f['name']:f['sha256'] for f in m['files']}
  assert set(newmap)-set(oldmap)=={'menu-input.mjs'} and not(set(oldmap)-set(newmap)),'UNEXPECTED_TTY_SCOPE'
  changed=[n for n in oldmap if oldmap[n]!=newmap[n]]
  assert changed==['entry.mjs'],'PREVIOUSLY_APPROVED_MODULE_CHANGED'
  assert newmap['private-input.mjs']==oldmap['private-input.mjs'],'HIDDEN_INPUT_GUARDS_CHANGED'
  for f in m['files']: assert hashlib.sha256(z.read(f['name'])).hexdigest()==f['sha256']
  assert len(z.namelist())==len(m['files'])+1 and all('/' not in n and '\\' not in n for n in z.namelist())
  target=d/'flat';z.extractall(target)
 v=json.loads(subprocess.run(['node',str(target/'entry.mjs'),'--verify-only'],capture_output=True,text=True,check=True).stdout)
 assert v['sourceConnected'] is False and v['manifestFiles']==30
 # Authorization and latch behavior are carried byte-for-byte, never reset/re-run.
 assert newmap['policy.mjs']==oldmap['policy.mjs'] and newmap['one-shot.mjs']==oldmap['one-shot.mjs']
 print(json.dumps({'status':'PASS','scope':'menu-to-hidden-input-only','approvedFilesUnchanged':28,'changedExisting':['entry.mjs'],'added':['menu-input.mjs'],'manifestFiles':30,'manifestSha256':hashlib.sha256((target/'MANIFEST.json').read_bytes()).hexdigest(),'zipSha256':hashlib.sha256(a.read_bytes()).hexdigest(),'zipBytes':a.stat().st_size,'sourceConnected':False,'captureAttemptClaimed':False}))
