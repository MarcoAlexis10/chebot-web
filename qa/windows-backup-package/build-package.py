#!/usr/bin/env python3
"""Build only reviewed operator files and runtime dependencies, never a workdir sweep."""
from pathlib import Path
import hashlib,json,sys,zipfile
root=Path(__file__).resolve().parent
ALLOWED_ROOT={
 '00-INICIAR.cmd','INICIAR.ps1','PRIVADO.py','LEEME-PRIMERO.txt',
 'COBERTURA-Y-RECUPERACION.md','ENTORNO-PRIVADO.md','CONTINUIDAD-QA.md','EVIDENCIA-QA.md',
 'RECIBOS-PLANTILLA.json','CONFIGURACION-REFERENCIAS-PLANTILLA.json',
 'core.mjs','backup.mjs','restore-isolated.mjs','pg-tools.mjs','cli.mjs',
 'laboratorio.mjs','package-tests.mjs','package.json','package-lock.json','.gitignore'
}
def files():
    for name in sorted(ALLOWED_ROOT):
        p=root/name
        if p.is_file() and not p.is_symlink():yield p,name
    for p in sorted((root/'node_modules').rglob('*')):
        if not p.is_file() or p.is_symlink():continue
        rel=p.relative_to(root)
        if any(x.lower() in {'test','tests','testing','fixtures','__tests__'} for x in rel.parts):continue
        if p.name.endswith(('.test.js','.spec.js')):continue
        if p.suffix in {'.js','.cjs','.mjs','.json'} or p.name.upper().startswith(('LICENSE','LICENCE','COPYING')):yield p,rel.as_posix()
inventory=[{'path':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p,name in files()]
(root/'MANIFEST.json').write_text(json.dumps({'format':1,'files':inventory},indent=2)+'\n',encoding='utf8')
if '--manifest-only' not in sys.argv:
    dest=root.parent/'CHE-VENI-A1-WINDOWS.zip'
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p,name in files():z.write(p,name)
        z.write(root/'MANIFEST.json','MANIFEST.json')
    print(json.dumps({'zip':str(dest),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'files':len(inventory)+1}))
