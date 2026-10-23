"""Deterministic flat operational ZIP. No credentials, network, Docker or source connection."""
from pathlib import Path
import hashlib,json,sys,zipfile
HERE=Path(__file__).resolve().parent
src=HERE/'source'
out=Path(sys.argv[1]).resolve()
if out.exists(): raise SystemExit('EXISTING_OUTPUT_PRESERVED')
files=[]
for p in sorted(src.iterdir()):
 if not p.is_file() or p.is_symlink() or p.name=='MANIFEST.json': raise SystemExit('SOURCE_SET_REJECTED')
 files.append((p.name,p.read_bytes()))
m={'kind':'CHEVENI_ASUS_ONE_CAPTURE_V1','project':'tyvwgsdzqipusodxtydv','devEnabled':True,'maximumCaptures':1,
 'authorization':'CHEVENI-DEV-ONE-CAPTURE-20261023','files':[{'name':n,'sha256':hashlib.sha256(b).hexdigest()} for n,b in files]}
raw=(json.dumps(m,ensure_ascii=False,indent=2)+'\n').encode()
files.append(('MANIFEST.json',raw))
# ZIP_STORED avoids dependence on zlib versions for reproducible bytes.
with zipfile.ZipFile(out,'x',compression=zipfile.ZIP_STORED) as z:
 for n,b in sorted(files):
  i=zipfile.ZipInfo(n,(2026,10,23,0,0,0));i.compress_type=zipfile.ZIP_STORED;i.create_system=3;i.external_attr=0o100600<<16;z.writestr(i,b)
print(json.dumps({'name':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'manifestFiles':len(m['files']),'manifestSha256':hashlib.sha256(raw).hexdigest(),'realConnectionExecuted':False}))
