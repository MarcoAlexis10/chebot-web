"""PowerShell workflow -> Python ConPTY -> Windows Node; synthetic input only.
Never print/store the raw console transcript or typed fixture strings.
No source, Docker, Supabase, credential, network or capture operation.
"""
import ctypes as C
from ctypes import wintypes as W
import json,os,re,shutil,subprocess,sys,threading,time,tempfile
from pathlib import Path
if sys.platform!='win32': raise SystemExit('WINDOWS_CONPTY_REQUIRED')
k=C.WinDLL('kernel32',use_last_error=True)
HANDLE=W.HANDLE; SIZE=C.c_size_t; LPVOID=C.c_void_p
class COORD(C.Structure): _fields_=[('X',C.c_short),('Y',C.c_short)]
class STARTUPINFOW(C.Structure):
 _fields_=[('cb',W.DWORD),('lpReserved',W.LPWSTR),('lpDesktop',W.LPWSTR),('lpTitle',W.LPWSTR),('dwX',W.DWORD),('dwY',W.DWORD),('dwXSize',W.DWORD),('dwYSize',W.DWORD),('dwXCountChars',W.DWORD),('dwYCountChars',W.DWORD),('dwFillAttribute',W.DWORD),('dwFlags',W.DWORD),('wShowWindow',W.WORD),('cbReserved2',W.WORD),('lpReserved2',LPVOID),('hStdInput',HANDLE),('hStdOutput',HANDLE),('hStdError',HANDLE)]
class STARTUPINFOEXW(C.Structure): _fields_=[('StartupInfo',STARTUPINFOW),('lpAttributeList',LPVOID)]
class PROCESS_INFORMATION(C.Structure): _fields_=[('hProcess',HANDLE),('hThread',HANDLE),('dwProcessId',W.DWORD),('dwThreadId',W.DWORD)]
def proto(name,args,result):
 f=getattr(k,name);f.argtypes=args;f.restype=result;return f
pipe=proto('CreatePipe',[C.POINTER(HANDLE),C.POINTER(HANDLE),LPVOID,W.DWORD],W.BOOL)
close=proto('CloseHandle',[HANDLE],W.BOOL)
createpty=proto('CreatePseudoConsole',[COORD,HANDLE,HANDLE,W.DWORD,C.POINTER(HANDLE)],C.c_long)
closepty=proto('ClosePseudoConsole',[HANDLE],None)
initattrs=proto('InitializeProcThreadAttributeList',[LPVOID,W.DWORD,W.DWORD,C.POINTER(SIZE)],W.BOOL)
setattrlist=proto('UpdateProcThreadAttribute',[LPVOID,W.DWORD,SIZE,LPVOID,SIZE,LPVOID,LPVOID],W.BOOL)
delattrs=proto('DeleteProcThreadAttributeList',[LPVOID],None)
createprocess=proto('CreateProcessW',[W.LPCWSTR,W.LPWSTR,LPVOID,LPVOID,W.BOOL,W.DWORD,LPVOID,W.LPCWSTR,C.POINTER(STARTUPINFOW),C.POINTER(PROCESS_INFORMATION)],W.BOOL)
read=proto('ReadFile',[HANDLE,LPVOID,W.DWORD,C.POINTER(W.DWORD),LPVOID],W.BOOL)
write=proto('WriteFile',[HANDLE,LPVOID,W.DWORD,C.POINTER(W.DWORD),LPVOID],W.BOOL)
exitcode=proto('GetExitCodeProcess',[HANDLE,C.POINTER(W.DWORD)],W.BOOL)
terminate=proto('TerminateProcess',[HANDLE,W.UINT],W.BOOL)
worker=Path(__file__).with_name('console-worker.mjs').resolve();node=shutil.which('node')
assert node,'NODE_REQUIRED'
bootstrap_temp=tempfile.TemporaryDirectory(prefix='cv-tty-native-console-')
bootstrap=str(Path(bootstrap_temp.name).resolve()/'ConsoleBootstrap.exe')
csc=Path(os.environ['SystemRoot'])/'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
compiled=subprocess.run([str(csc),'/nologo','/target:exe','/out:'+bootstrap,str(worker.with_name('ConsoleBootstrap.cs'))],capture_output=True,text=True)
assert compiled.returncode==0,'QA_CONSOLE_BOOTSTRAP_COMPILE_FAILED'
cleanenv={key:os.environ[key] for key in ['PATH','Path','SystemRoot','SYSTEMROOT','WINDIR','USERPROFILE','LOCALAPPDATA','TEMP','TMP','ComSpec'] if key in os.environ}
cleanenv['CI']='true';cleanenv['GITHUB_ACTIONS']='true'
def strip_vt(raw):
 s=raw.decode('utf-8','replace')
 s=re.sub(r'\x1b\][^\x07]*?(?:\x07|\x1b\\)','',s)
 return re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]','',s)
def result_from(text):
 m=re.search(r'CV_TTY_RESULT:(\{[^\r\n]*\})',text)
 if not m: raise AssertionError('CONSOLE_RESULT_REQUIRED')
 r=json.loads(m.group(1));assert not r.get('fixtureFailed'),'CONSOLE_FIXTURE_FAILED';assert r.get('nodeVersion')=='24.19.0','EXACT_NODE_VERSION_REQUIRED';return r

def run_console(mode):
 ir,iw,orr,ow,pc=HANDLE(),HANDLE(),HANDLE(),HANDLE(),HANDLE();pi=PROCESS_INFORMATION();attrs=None
 chunks=[];mutex=threading.Lock();reader=None;success=False
 try:
  assert pipe(C.byref(ir),C.byref(iw),None,0),'CONPTY_INPUT_PIPE_FAILED'
  assert pipe(C.byref(orr),C.byref(ow),None,0),'CONPTY_OUTPUT_PIPE_FAILED'
  assert createpty(COORD(2000,80),ir,ow,0,C.byref(pc))==0,'CONPTY_CREATE_FAILED'
  close(ir);ir=HANDLE();close(ow);ow=HANDLE()
  size=SIZE();initattrs(None,1,0,C.byref(size));attrs=C.create_string_buffer(size.value)
  assert initattrs(attrs,1,0,C.byref(size)),'CONPTY_ATTRIBUTE_INIT_FAILED'
  assert setattrlist(attrs,0,0x00020016,pc,C.sizeof(HANDLE),None,None),'CONPTY_ATTRIBUTE_FAILED'
  si=STARTUPINFOEXW();si.StartupInfo.cb=C.sizeof(si);si.lpAttributeList=C.cast(attrs,LPVOID)
  argv=[bootstrap,node,str(worker),mode]
  cmd=C.create_unicode_buffer(subprocess.list2cmdline(argv))
  block=C.create_unicode_buffer('\0'.join(key+'='+value for key,value in sorted(cleanenv.items(),key=lambda x:x[0].upper()))+'\0\0')
  assert createprocess(bootstrap,cmd,None,None,False,0x00080000|0x00000400,block,str(worker.parent),C.cast(C.byref(si),C.POINTER(STARTUPINFOW)),C.byref(pi)),'CONPTY_PROCESS_FAILED'
  def consume():
   b=C.create_string_buffer(4096);n=W.DWORD()
   while read(orr,b,len(b),C.byref(n),None) and n.value:
    with mutex:
     chunks.append(b.raw[:n.value])
     if sum(map(len,chunks))>2*1024*1024: return
  reader=threading.Thread(target=consume,daemon=True);reader.start()
  def send(s):
   b=s.encode();n=W.DWORD();assert write(iw,b,len(b),C.byref(n),None) and n.value==len(b),'CONPTY_SYNTHETIC_INPUT_FAILED'
  sent=set();deadline=time.monotonic()+35
  while time.monotonic()<deadline:
   with mutex: text=strip_vt(b''.join(chunks))
   for i in range(2 if mode=='legacy' else 6):
    key='menu'+str(i)
    if key not in sent and 'CV_MENU_'+str(i)+':' in text: send('FICTIONAL_MENU\r');sent.add(key)
   if mode=='fixed':
    for key,prompt,value in [('password','Credencial existente de la base','FICTIONAL_PASSWORD_TTY_20261024'),('phrase','Frase nueva de recuperaci','FICTIONAL_RECOVERY_PHRASE_ONLY_20261024'),('confirm','Repet','FICTIONAL_RECOVERY_PHRASE_ONLY_20261024')]:
     if key not in sent and prompt in text: send(value+'\r');sent.add(key)
   if mode=='cancel' and 'cancel' not in sent and 'Credencial existente de la base' in text: send('\x03');sent.add('cancel')
   code=W.DWORD();assert exitcode(pi.hProcess,C.byref(code)),'CONPTY_EXIT_CHECK_FAILED'
   if code.value!=259:
    closepty(pc);pc=HANDLE()
    reader.join(2)
    with mutex: text=strip_vt(b''.join(chunks))
    if 'CV_TTY_RESULT:' not in text:
     print(json.dumps({'fixtureDiagnostic':True,'mode':mode,'processExit':code.value,'outputBytes':sum(map(len,chunks)),'menuMarkers':text.count('CV_MENU_'),'resultMarker':('CV_TTY_RESULT' in text),'syntaxError':('SyntaxError' in text),'moduleNotFound':('MODULE_NOT_FOUND' in text or 'ERR_MODULE_NOT_FOUND' in text),'powershellParserError':('ParserError' in text),'commandNotFound':('CommandNotFoundException' in text),'referenceError':('ReferenceError' in text)}))
    r=result_from(text)
    assert code.value==0,'CONSOLE_PROCESS_EXIT_FAILED'
    assert 'FICTIONAL_PASSWORD_TTY_20261024' not in text and 'FICTIONAL_RECOVERY_PHRASE_ONLY_20261024' not in text,'SYNTHETIC_HIDDEN_INPUT_WAS_ECHOED'
    r['secretEchoDetected']=False;r['windowsConPTY']=True;success=True;return r
   time.sleep(.02)
  raise AssertionError('CONPTY_CASE_TIMEOUT')
 finally:
  if pi.hProcess and not success: terminate(pi.hProcess,1)
  if pc: closepty(pc)
  if reader: reader.join(2)
  for h in [pi.hThread,pi.hProcess,ir,iw,orr,ow]:
   if h: close(h)
  if attrs is not None: delattrs(attrs)

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
print(json.dumps({'focusedCases':6,'status':'PASS','realWindowsTTY':True,'transport':'PowerShell workflow -> ConPTY -> native console handles -> Windows Node 24.19.0','syntheticOnly':True,'sourceConnected':False,'captureAttemptClaimed':False}))
