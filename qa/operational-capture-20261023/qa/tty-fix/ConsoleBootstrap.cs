// QA only. Bind the child to genuine attached CONIN$/CONOUT$ handles; never fake isTTY.
using System;
using System.Runtime.InteropServices;
using System.Text;
public class ConsoleBootstrap {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct SI {
  public int cb;public string reserved,desktop,title;public int x,y,xSize,ySize,xChars,yChars,fill,flags;public short show,reserved2;public IntPtr reservedPtr,input,output,error;
 }
 [StructLayout(LayoutKind.Sequential)] struct PI {public IntPtr process,thread;public int pid,tid;}
 [StructLayout(LayoutKind.Sequential)] struct SA {public int length;public IntPtr descriptor;[MarshalAs(UnmanagedType.Bool)]public bool inherit;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFileW(string name,uint access,uint share,ref SA sa,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetConsoleMode(IntPtr h,out uint mode);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetStdHandle(int which,IntPtr h);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcessW(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SI si,out PI pi);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h,uint timeout);
 [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr h,out uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
 // All three arguments are controlled QA executable/script/mode paths; no credentials.
 static string Quote(string s) {if(s.Contains("\"")||s.EndsWith("\\"))throw new ArgumentException();return "\""+s+"\"";}
 public static int Main(string[] args) {
  if(args.Length!=3)return 90;
  SA sa=new SA();sa.length=Marshal.SizeOf(typeof(SA));sa.inherit=true;
  IntPtr input=CreateFileW("CONIN$",0xC0000000,3,ref sa,3,0,IntPtr.Zero);
  IntPtr output=CreateFileW("CONOUT$",0xC0000000,3,ref sa,3,0,IntPtr.Zero);
  uint mode;if(input==new IntPtr(-1)||output==new IntPtr(-1)||!GetConsoleMode(input,out mode)||!GetConsoleMode(output,out mode))return 91;
  if(!SetStdHandle(-10,input)||!SetStdHandle(-11,output)||!SetStdHandle(-12,output))return 92;
  SI si=new SI();si.cb=Marshal.SizeOf(typeof(SI));si.flags=0x100;si.input=input;si.output=output;si.error=output;
  PI pi;var command=new StringBuilder(Quote(args[0])+" "+Quote(args[1])+" "+Quote(args[2]));
  if(!CreateProcessW(args[0],command,IntPtr.Zero,IntPtr.Zero,true,0,IntPtr.Zero,Environment.CurrentDirectory,ref si,out pi))return 93;
  WaitForSingleObject(pi.process,0xFFFFFFFF);uint exit;GetExitCodeProcess(pi.process,out exit);
  CloseHandle(pi.thread);CloseHandle(pi.process);CloseHandle(input);CloseHandle(output);return (int)exit;
 }
}
