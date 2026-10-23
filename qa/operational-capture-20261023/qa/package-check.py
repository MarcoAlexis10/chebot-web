from pathlib import Path
import tempfile,subprocess,sys,hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cv-new-operational-package-') as d:
 d=Path(d).resolve();a=d/'one.zip';b=d/'two.zip'
 for p in [a,b]:
  r=subprocess.run([sys.executable,str(root/'build-release.py'),str(p)],capture_output=True,text=True,check=True)
 assert a.read_bytes()==b.read_bytes()
 before=hashlib.sha256(a.read_bytes()).hexdigest()
 r=subprocess.run([sys.executable,str(root/'build-release.py'),str(a)],capture_output=True,text=True)
 assert r.returncode!=0 and 'EXISTING_OUTPUT_PRESERVED' in r.stderr
 assert hashlib.sha256(a.read_bytes()).hexdigest()==before
 target=d/'flat'
 with zipfile.ZipFile(a) as z:
  assert len(z.namelist())==len(set(z.namelist())) and all('/' not in n and '\\' not in n for n in z.namelist())
  z.extractall(target)
 m=json.loads((target/'MANIFEST.json').read_bytes())
 assert len(m['files'])==len(list(target.iterdir()))-1
 for e in m['files']: assert hashlib.sha256((target/e['name']).read_bytes()).hexdigest()==e['sha256']
 r=subprocess.run(['node',str(target/'entry.mjs'),'--verify-only'],capture_output=True,text=True,check=True)
 v=json.loads(r.stdout);assert v['sourceConnected'] is False and v['manifestFiles']==len(m['files'])
 # Real entry in this noninteractive CI/Work test must fail before local identity,
 # credentials, Docker or a source attempt. NO connection operation is run.
 r=subprocess.run(['node',str(target/'entry.mjs')],capture_output=True,text=True)
 assert r.returncode!=0 and 'ASUS_LOCAL_OWNER_SESSION_REQUIRED' in r.stderr
 (target/'policy.mjs').write_bytes((target/'policy.mjs').read_bytes()+b'\n// FICTIONAL TAMPER\n')
 r=subprocess.run(['node',str(target/'entry.mjs'),'--verify-only'],capture_output=True,text=True)
 assert r.returncode!=0 and 'RELEASE_FILE_HASH_MISMATCH' in r.stderr
 print(json.dumps({'newPackageChecks':5,'status':'PASS','sha256':before,'files':len(m['files']),'sourceConnected':False,'realCaptureExecuted':False}))
