"""Deterministic, flat ZIP. No tools downloaded or credentials accessed."""
import hashlib,json,zipfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
NAME='CHE-VENI-PROVISIONAL-WINDOWS-20261021'
def build():
    paths=sorted(p for p in ROOT.iterdir() if p.is_file() and p.name!='MANIFEST.json')
    if any(p.suffix in ('.cva','.cclave','.zip') or p.name.startswith('.') for p in paths): raise RuntimeError('NO_BACKUPS_OR_ARCHIVES_IN_PACKAGE')
    files=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
    (ROOT/'MANIFEST.json').write_text(json.dumps({'package':NAME,'realCaptureAuthorized':False,'files':files},indent=2)+'\n',encoding='utf8',newline='\n')
    target=ROOT.parent/(NAME+'.zip')
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p in sorted(ROOT.iterdir()):
            if p.is_file():
                i=zipfile.ZipInfo(p.name,(2026,10,21,0,0,0));i.compress_type=zipfile.ZIP_DEFLATED;i.create_system=3;i.external_attr=0o100644<<16
                z.writestr(i,p.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    digest=hashlib.sha256(target.read_bytes()).hexdigest()
    print(json.dumps({'zip':target.name,'sha256':digest,'manifestFiles':len(files),'archiveFiles':len(files)+1}))
if __name__=='__main__':build()
