// FICTIONAL cache-lookup fixture. No daemon, sockets, credentials or SQL.
using System;
using System.IO;
using System.Reflection;
class DockerCacheFixture {
 const string Image="postgres@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826";
 static int Main(string[] args) {
  File.AppendAllText(Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),"calls.txt"),String.Join(" ",args)+Environment.NewLine);
  int offset=0;
  if(args.Length>=2 && args[0]=="--host") {
   if(args[1]!="npipe:////./pipe/dockerDesktopLinuxEngine")return 81;
   offset=2;
  }
  string[] a=new string[args.Length-offset];Array.Copy(args,offset,a,0,a.Length);
  if(a.Length==2 && a[0]=="context" && a[1]=="inspect") {
   Console.WriteLine("[{\"Endpoints\":{\"docker\":{\"Host\":\"npipe:////./pipe/dockerDesktopLinuxEngine\"}}}]");return 0;
  }
  if(a.Length==3 && a[0]=="info" && a[1]=="--format" && a[2]=="{{.OSType}}") {Console.WriteLine("linux");return 0;}
  if(a.Length==3 && a[0]=="image" && a[1]=="inspect") {
   if(a[2]!=Image)return 23;
   Console.WriteLine("[{\"RepoDigests\":[\""+Image+"\"]}]");return 0;
  }
  // Mutation and every unknown operation are refused by this fixture.
  return 82;
 }
}
