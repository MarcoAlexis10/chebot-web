"""Focused Windows ConPTY regression, run from PowerShell, fictional input only.
Uses pinned pywinpty 3.1.0 ONLY in disposable QA, not in the operational ZIP.
Low-level PTY API: no loopback socket, raw transcript logging or source adapter.
"""
import json,os,re,shutil,subprocess,sys,time,signal
from pathlib import Path
if sys.platform!='win32': raise SystemExit('WINDOWS_CONPTY_REQUIRED')
from winpty import PTY,Backend,__version__
assert __version__=='3.1.0','PINNED_QA_PTY_REQUIRED'
worker=Path(__file__).with_name('console-worker.mjs').resolve();node=shutil.which('node')
assert node,'NODE_REQUIRED'
cleanenv={key:os.environ[key] for key in ['PATH','SystemRoot','WINDIR','USERPROFILE','LOCALAPPDATA','APPDATA','TEMP','TMP','ComSpec','PATHEXT'] if key in os.environ}
cleanenv['CI']='true';cleanenv['GITHUB_ACTIONS']='true'
def strip_vt(s):
 s=re.sub(r'\x1b\][^\x07]*?(?:\x07|\x1b\\)','',s)
 return re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',s)
def result_from(text):
 m=re.search(r'CV_TTY_RESULT:(\{[^\r\n]*\})',text)
 if not m: raise AssertionError('CONSOLE_RESULT_REQUIRED')
 r=json.loads(m.group(1));assert not r.get('fixtureFailed'),'CONSOLE_FIXTURE_FAILED'
 assert r.get('nodeVersion')=='24.19.0','EXACT_NODE_VERSION_REQUIRED';return r

def run_console(mode):
 p=PTY(2000,80,backend=Backend.ConPTY);chunks=[];sent=set()
 env='\0'.join(k+'='+v for k,v in sorted(cleanenv.items(),key=lambda x:x[0].upper()))+'\0'
 try:
  p.spawn(node,cwd=str(worker.parent),env=env,cmdline=' '+subprocess.list2cmdline([str(worker),mode]))
  deadline=time.monotonic()+30;dead_at=None
  while time.monotonic()<deadline:
   try:
    piece=p.read(blocking=False)
    if piece: chunks.append(piece)
   except EOFError: pass
   assert sum(map(len,chunks))<2*1024*1024,'CONSOLE_OUTPUT_BOUND'
   text=strip_vt(''.join(chunks))
   for i in range(2 if mode=='legacy' else 6):
    key='menu'+str(i)
    if key not in sent and 'CV_MENU_'+str(i)+':' in text: p.write('FICTIONAL_MENU\r');sent.add(key)
   if mode=='fixed':
    for key,prompt,value in [('password','Credencial existente de la base','FICTIONAL_PASSWORD_TTY_20261024'),('phrase','Frase nueva de recuperaci','FICTIONAL_RECOVERY_PHRASE_ONLY_20261024'),('confirm','Repet','FICTIONAL_RECOVERY_PHRASE_ONLY_20261024')]:
     if key not in sent and prompt in text: p.write(value+'\r');sent.add(key)
   if mode=='cancel' and 'cancel' not in sent and 'Credencial existente de la base' in text: p.write('\x03');sent.add('cancel')
   if not p.isalive():
    if dead_at is None: dead_at=time.monotonic()
    if 'CV_TTY_RESULT:' in text:
     r=result_from(text);assert p.get_exitstatus()==0,'CONSOLE_PROCESS_EXIT_FAILED'
     assert 'FICTIONAL_PASSWORD_TTY_20261024' not in text and 'FICTIONAL_RECOVERY_PHRASE_ONLY_20261024' not in text,'SYNTHETIC_HIDDEN_INPUT_WAS_ECHOED'
     r['secretEchoDetected']=False;r['windowsConPTY']=True;return r
    if time.monotonic()-dead_at>1: raise AssertionError('CONSOLE_RESULT_REQUIRED')
   time.sleep(.01)
  raise AssertionError('CONPTY_CASE_TIMEOUT')
 finally:
  if p.isalive(): os.kill(p.pid,signal.SIGTERM)
  p.cancel_io()
  del p

def tty_checks(r):
 for key in ['before','afterMenus','afterHidden']:
  v=r[key];assert v['inputTTY'] and v['outputTTY'] and v['setRawMode']=='function','REAL_TTY_CHECK_NOT_PRESERVED'
 assert not r['sourceConnected'],'SOURCE_CONNECTION_FORBIDDEN'

results=[]
for mode in ['legacy','fixed','foreign','cancel','timeout']:
 r=run_console(mode);tty_checks(r)
 if mode=='legacy':
  assert r['afterMenus']['data']==1 and r['afterMenus']['dataNames']==['onData'] and r['afterMenus']['keypress']==0 and r['code']=='EXCLUSIVE_LOCAL_TTY_REQUIRED' and not r['credentialsMatched'],'LEGACY_INCIDENT_NOT_REPRODUCED'
 else:
  assert r['afterMenus']['data']==0 and r['afterHidden']['data']==0 and not r['afterHidden']['raw'],'FIXED_TRANSITION_NOT_CLEAN'
  if mode=='fixed': assert r['code']=='NONE' and r['credentialsMatched'],'FIXED_HIDDEN_INPUT_FAILED'
  if mode=='foreign': assert r['code']=='EXCLUSIVE_LOCAL_TTY_REQUIRED' and r['foreignPreserved'],'FOREIGN_LISTENER_PROTECTION_WEAKENED'
  if mode=='cancel': assert r['code']=='PRIVATE_INPUT_INTERRUPTED','CANCEL_GUARD_FAILED'
  if mode=='timeout': assert r['code']=='PRIVATE_INPUT_TIMEOUT','TIMEOUT_GUARD_FAILED'
 results.append(r);print(json.dumps({'case':mode,'status':'PASS',**r}))
r=subprocess.run([node,str(worker),'non-tty'],capture_output=True,text=True,env=cleanenv,timeout=10,check=True)
v=result_from(r.stdout);assert v['code']=='EXCLUSIVE_LOCAL_TTY_REQUIRED' and not v['before']['inputTTY'] and not v['sourceConnected'],'NON_TTY_GUARD_WEAKENED'
print(json.dumps({'case':'non-tty','status':'PASS',**v}))
print(json.dumps({'focusedCases':6,'status':'PASS','realWindowsTTY':True,'transport':'PowerShell workflow -> pinned pywinpty ConPTY -> native Windows Node 24.19.0','syntheticOnly':True,'sourceConnected':False,'captureAttemptClaimed':False}))
