import hashlib,json,pathlib,sys,zipfile
root=pathlib.Path(__file__).resolve().parent
excluded={'MANIFEST.json','build-package.py'}
def files():
    for p in sorted(root.rglob('*')):
        if not p.is_file() or p.is_symlink():continue
        rel=p.relative_to(root)
        if rel.parts[0] in ['__pycache__','tools','privado'] or rel.name in excluded or rel.suffix in ['.zip','.cva','.cclave','.pyc','.log']:continue
        if rel.parts[0]=='node_modules' and not (p.suffix in ['.js','.cjs','.mjs','.json'] or p.name.upper().startswith(('LICENSE','LICENCE','COPYING'))):continue
        yield p,rel.as_posix()
inventory=[{'path':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p,name in files()]
(root/'MANIFEST.json').write_text(json.dumps({'format':1,'files':inventory},indent=2)+'\n',encoding='utf8')
if '--manifest-only' not in sys.argv:
    dest=root.parent/'CHE-VENI-A1-WINDOWS.zip'
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p,name in files():z.write(p,name)
        z.write(root/'MANIFEST.json','MANIFEST.json')
    print(json.dumps({'zip':str(dest),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'files':len(inventory)+1}))
