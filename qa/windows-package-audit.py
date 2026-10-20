from pathlib import Path
import zipfile,hashlib,json,re,tempfile,subprocess
p=Path(__file__).resolve().parent/'CHE-VENI-A1-WINDOWS-20261020.zip'
with zipfile.ZipFile(p) as z:
 names=z.namelist();m=json.loads(z.read('MANIFEST.json'))
 assert '00-INICIAR.cmd' in names and all('/' not in n or n.startswith('node_modules/') for n in names)
 assert set(names)=={'MANIFEST.json'}|{f['path'] for f in m['files']}
 for f in m['files']:
  b=z.read(f['path']);assert len(b)==f['bytes'] and hashlib.sha256(b).hexdigest()==f['sha256']
 for n in names:
  assert not n.endswith(('.cva','.cclave','.dump','.pem','.key','.log','.sql')) and n.split('/')[-1] not in {'.env','auth.json'}
  assert not re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|gh[pousr]_[a-zA-Z0-9]{30,}|sb_secret_[a-zA-Z0-9_-]{20,}',z.read(n))
 with tempfile.TemporaryDirectory(prefix='cheveni-package-audit-') as d:
  z.extractall(d)
  code='''import {randomBytes} from 'node:crypto';import {writeFileSync,rmSync} from 'node:fs';import {spawnSync} from 'node:child_process';import {REQUIRED,part,encryptPayload} from './core.mjs';
const key=randomBytes(32),payload={format:2,project:'tyvwgsdzqipusodxtydv',fictional:true,createdAt:'fictional',parts:REQUIRED.map(n=>part(n,randomBytes(30)))};
writeFileSync('fictional.cva',encryptPayload(payload,key));try{const r=spawnSync(process.execPath,['cli.mjs','verify'],{input:'\\ufeff'+JSON.stringify({backup:'fictional.cva',key:key.toString('base64')}),encoding:'utf8'});if(r.status!==0||!JSON.parse(r.stdout).fictional)throw Error('ZIP_CLI_FAILED');console.log('ZIP_CLI_FICTIONAL_VERIFY_PASS');}finally{rmSync('fictional.cva');}
'''
  r=subprocess.run(['node','--input-type=module','-e',code],cwd=d,capture_output=True,text=True)
  if r.returncode:raise RuntimeError('ZIP_CLI_FAILED')
print(json.dumps({'flatRoot':True,'manifestFilesVerified':len(names),'forbiddenFiles':0,'credentialPatterns':0,'packagedCliFictionalVerify':True,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}))
