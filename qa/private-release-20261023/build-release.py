"""Reproducible PREPARED folder, NOT a diagnostic ZIP; refuses existing output."""
from pathlib import Path
import re,json,hashlib,sys
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
out=Path(sys.argv[1]).resolve()
if out.exists(): raise SystemExit('EXISTING_OUTPUT_PRESERVED')
seeds=['entry.mjs','runtime.mjs','LEEME-PRIVADO.txt']
queue=[HERE/n for n in seeds]
seen={}
while queue:
 p=queue.pop().resolve()
 if p in seen: continue
 if not p.is_relative_to(ROOT): raise SystemExit('DEPENDENCY_OUTSIDE_RELEASE_ROOT')
 b=p.read_bytes();seen[p]=b
 if p.suffix=='.mjs':
  text=b.decode()
  for rel in re.findall(r"(?:from\s*|import\s*\(|new URL\s*\()\s*['\"](\.[^'\"]+)['\"]",text):
   queue.append((p.parent/rel).resolve())
names={}
for p in seen:
 if p.name in names: raise SystemExit('FLAT_NAME_COLLISION')
 names[p.name]=p
# Includes only code/trusted schema, not tests, examples, rows, private files or credentials.
out.mkdir(mode=0o700)
for p,b in seen.items():
 text=b.decode().replace('\r\n','\n')
 for dep in seen:
  if dep==p: continue
  # Relative imports and URL references retain semantics in the flat folder.
  import os
  rel=os.path.relpath(dep,p.parent).replace('\\','/')
  if not rel.startswith('.'): rel='./'+rel
  text=text.replace("'"+rel+"'","'./"+dep.name+"'").replace('"'+rel+'"','"./'+dep.name+'"')
 (out/p.name).write_bytes(text.encode())
files=[{'name':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.iterdir(),key=lambda p:p.name)]
m={'kind':'CHEVENI_PRIVATE_PREPARED_V1','devEnabled':False,'files':files}
raw=(json.dumps(m,ensure_ascii=False,indent=2)+'\n').encode();(out/'MANIFEST.json').write_bytes(raw)
print(json.dumps({'manifestFiles':len(files),'manifestSha256':hashlib.sha256(raw).hexdigest(),'remoteConnectionEnabled':False,'zipProduced':False}))
