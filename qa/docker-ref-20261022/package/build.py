"""Deterministic, flat ZIP. No tools downloaded or credentials accessed."""
import hashlib,json,zipfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
NAME='CHE-VENI-PROVISIONAL-WINDOWS-20261022'
EXPECTED={
    '00-INICIAR.cmd','01-LABORATORIO-FICTICIO.cmd','02-PREPARAR-CAPTURA.cmd',
    '03-CAPTURA-REAL-PENDIENTE-AUTORIZACION.cmd','04-VERIFICAR-ARCHIVOS.cmd',
    '05-RESTAURAR-SOLO-DESTINO-DESCARTABLE.cmd','06-LIMPIAR-PENDIENTES.cmd',
    'LEEME-PRIMERO.txt','LIMITES-Y-EVIDENCIA.md','build.py','docker-fictional.mjs','docker-image-reference.test.mjs',
    'future-dev-plan.mjs','iniciar.mjs','package-io.mjs','package-lab.mjs',
    'package-pg17-smoke.mjs','package-safety.test.mjs','private-host.mjs',
    'private-input.mjs','provisional-crypto.mjs'
}
def build():
    actual={p.name for p in ROOT.iterdir() if p.name!='MANIFEST.json'}
    if actual!=EXPECTED or any(not (ROOT/n).is_file() or (ROOT/n).is_symlink() for n in EXPECTED): raise RuntimeError('PACKAGE_SOURCE_INVENTORY_MISMATCH')
    # Canonical source bytes regardless of a Windows checkout's autocrlf setting.
    for name in sorted(EXPECTED):
        p=ROOT/name
        content=p.read_bytes().replace(b'\r\n',b'\n')
        if name.endswith('.cmd'): content=content.replace(b'\n',b'\r\n')
        p.write_bytes(content)
    paths=sorted((p for p in ROOT.iterdir() if p.is_file() and p.name!='MANIFEST.json'),key=lambda p:p.name)
    if any(p.suffix in ('.cva','.cclave','.zip') or p.name.startswith('.') for p in paths): raise RuntimeError('NO_BACKUPS_OR_ARCHIVES_IN_PACKAGE')
    files=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]
    (ROOT/'MANIFEST.json').write_text(json.dumps({'package':NAME,'realCaptureAuthorized':False,'files':files},indent=2)+'\n',encoding='utf8',newline='\n')
    target=ROOT.parent/(NAME+'.zip')
    # STORE avoids platform/zlib-dependent compressed bytes; this package is tiny.
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_STORED) as z:
        for p in sorted(ROOT.iterdir(),key=lambda p:p.name):
            if p.is_file():
                i=zipfile.ZipInfo(p.name,(2026,10,22,0,0,0));i.compress_type=zipfile.ZIP_STORED;i.create_system=3;i.external_attr=0o100644<<16
                z.writestr(i,p.read_bytes(),compress_type=zipfile.ZIP_STORED)
    digest=hashlib.sha256(target.read_bytes()).hexdigest()
    print(json.dumps({'zip':target.name,'sha256':digest,'manifestFiles':len(files),'archiveFiles':len(files)+1}))
if __name__=='__main__':build()
