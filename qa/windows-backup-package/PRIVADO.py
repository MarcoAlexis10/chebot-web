#!/usr/bin/env python3
"""Private terminal alternative. Never run in CI; credentials use hidden input."""
import base64,getpass,json,os,pathlib,secrets,subprocess,sys
HERE=pathlib.Path(__file__).resolve().parent
PG_IMAGE='postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826'
def invoke(mode,payload):
    env=os.environ.copy()
    for name in ['NODE_OPTIONS','NODE_TLS_REJECT_UNAUTHORIZED','NODE_EXTRA_CA_CERTS']:env.pop(name,None)
    r=subprocess.run(['node',str(HERE/'cli.mjs'),mode],input=json.dumps(payload).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env)
    try: value=json.loads(r.stdout)
    except Exception: raise RuntimeError('HERRAMIENTA_PRIVADA_FALLO') from None
    if r.returncode or not value.get('ok'): raise RuntimeError(value.get('code','HERRAMIENTA_PRIVADA_FALLO'))
    return value
def datafile(prompt):return pathlib.Path(input(prompt).strip()).expanduser().resolve()
def main():
    if os.getenv('CI') or os.getenv('GITHUB_ACTIONS'):raise RuntimeError('CAPTURA_REAL_BLOQUEADA_EN_CI')
    print('Entorno privado: no se crea un servicio ni un proyecto. Node 24, Docker LOCAL Linux y Python 3 deben estar disponibles.')
    mode=sys.argv[1] if len(sys.argv)>1 else input('Modo: verificar o respaldar (por defecto salir): ').strip()
    if mode=='verificar':
        backup=datafile('Archivo cifrado .cva: ');kf=datafile('Clave cifrada .cclave: ');phrase=getpass.getpass('Frase privada: ')
        key=invoke('key-open',{'keyFile':str(kf),'passphrase':phrase})['key'];print(json.dumps(invoke('verify',{'backup':str(backup),'key':key})));return
    if mode!='respaldar':return
    if input('Para lectura real escribir RESPALDAR DEV: ').strip()!='RESPALDAR DEV':return
    private={}
    if os.getenv('CODESPACES') or os.getenv('CLOUD_SHELL'):
        print('Solo continuar si verificaste cuenta personal, cuota disponible, NINGUN medio de pago, espacio privado y CERO puertos publicados. No se comprueba la facturacion desde este script.')
        if input('Escribir ENTORNO PRIVADO Y GRATUITO VERIFICADO: ')!='ENTORNO PRIVADO Y GRATUITO VERIFICADO':return
        private={k:True for k in ['ownerVerified','noPaymentMethod','freeQuotaVerified','noPublicPorts']}
    version=subprocess.run(['node','-p','process.versions.node.split(".")[0]'],capture_output=True,text=True,check=True).stdout.strip()
    if version!='24':raise RuntimeError('NODE_24_REQUERIDO')
    subprocess.run(['docker','pull',PG_IMAGE],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
    backup_dir=datafile('Carpeta PRIVADA de respaldos fuera del repositorio: ');key_dir=datafile('Carpeta SEPARADA de claves cifradas: ')
    if backup_dir==key_dir or backup_dir in key_dir.parents or key_dir in backup_dir.parents or backup_dir==HERE or key_dir==HERE or HERE in backup_dir.parents or HERE in key_dir.parents or backup_dir in HERE.parents or key_dir in HERE.parents:raise RuntimeError('CUSTODIA_NO_SEPARADA')
    backup_dir.mkdir(parents=True,exist_ok=True,mode=0o700);key_dir.mkdir(parents=True,exist_ok=True,mode=0o700)
    phrase=getpass.getpass('Frase de custodia, minimo 20 caracteres: ')
    if phrase!=getpass.getpass('Repetir frase: '):raise RuntimeError('FRASES_NO_COINCIDEN')
    k=invoke('key-create',{'passphrase':phrase});name='CHE-VENI-DEV-'+secrets.token_hex(6)
    key_file=key_dir/(name+'.cclave')
    with key_file.open('xb') as f:f.write(base64.b64decode(k['wrapped']))
    os.chmod(key_file,0o600)
    assert invoke('key-open',{'keyFile':str(key_file),'passphrase':phrase})['key']==k['key']
    host=input('Host de Connect, directo o session pooler: ').strip();user=input('Usuario de Connect: ').strip()
    source={'project':'tyvwgsdzqipusodxtydv','database':'postgres','port':5432,'host':host,'user':user,'password':getpass.getpass('Contrasena actual DB: '),'storageKey':getpass.getpass('Clave actual Storage: '),'managementToken':getpass.getpass('Acceso administrativo existente: '),'ca':datafile('Certificado CA PEM: ').read_text()}
    journal=datafile('Registro independiente vigente: ').read_bytes();external=json.loads(datafile('Configuracion externa privada JSON: ').read_text());receipts=json.loads(datafile('Recibos W01-W10 JSON: ').read_text())
    result=invoke('capture',{'source':source,'key':k['key'],'output':str(backup_dir/(name+'.cva')),'journal':base64.b64encode(journal).decode(),'external':external,'receipts':receipts,'privateEnvironment':private})
    print(json.dumps(result));print('Descargar SOLO los dos archivos CIFRADOS por separado. La frase se custodia fuera del entorno. No subir a Git. Destruir el entorno remoto al finalizar.')
if __name__=='__main__':
    try:main()
    except Exception as e:
        message=str(e);print(message if message.replace('_','').isalnum() and message.isupper() else 'ENTORNO_PRIVADO_DETENIDO',file=sys.stderr);sys.exit(1)
