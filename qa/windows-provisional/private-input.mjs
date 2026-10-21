import {execFileSync} from 'node:child_process';
import {safeEnv,powershellModules} from './private-host.mjs';
export async function privateInput(kind){
 if(process.env.CHEVENI_PACKAGE_TEST_INPUT==='fictional-only'){let b='';for await(const c of process.stdin){b+=c;if(b.length>16384)throw Error('INPUT_TOO_LARGE');}return JSON.parse(b);}
 if(process.platform!=='win32')throw Error('WINDOWS_PRIVATE_FORM_REQUIRED');
 const script=powershellModules+`[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);Add-Type -AssemblyName System.Windows.Forms;
 $kind='${kind==='pending'?'pending':'verify'}';
 if($kind -eq 'pending'){$d=New-Object Windows.Forms.FolderBrowserDialog;$d.Description='Carpeta de laboratorio ficticio propia, no el paquete';if($d.ShowDialog() -ne 'OK'){'null';exit};@{root=$d.SelectedPath}|ConvertTo-Json -Compress;exit};
 $d=New-Object Windows.Forms.OpenFileDialog;$d.Title='Elegir archivo provisional .cva (solo ficticio)';$d.Filter='Respaldo cifrado|*.cva';if($d.ShowDialog() -ne 'OK'){'null';exit};$data=$d.FileName;
 $d.Title='Elegir archivo de clave cifrada .cclave';$d.Filter='Clave cifrada|*.cclave';if($d.ShowDialog() -ne 'OK'){'null';exit};$key=$d.FileName;
 $f=New-Object Windows.Forms.Form;$f.Text='Frase privada local: no se imprime';$f.Width=520;$f.Height=150;$f.StartPosition='CenterScreen';
 $t=New-Object Windows.Forms.TextBox;$t.Left=12;$t.Top=15;$t.Width=470;$t.UseSystemPasswordChar=$true;$f.Controls.Add($t);
 $b=New-Object Windows.Forms.Button;$b.Text='Verificar';$b.Left=12;$b.Top=50;$b.DialogResult='OK';$f.Controls.Add($b);$f.AcceptButton=$b;
 if($f.ShowDialog() -ne 'OK'){$f.Dispose();'null';exit};$result=@{dataFile=$data;keyFile=$key;passphrase=$t.Text};$t.Text='';$f.Dispose();$result|ConvertTo-Json -Compress;`;
 try{return JSON.parse(execFileSync('powershell.exe',['-NoLogo','-NoProfile','-STA','-Command',script],{env:safeEnv(),encoding:'utf8',maxBuffer:32768,windowsHide:true,stdio:['pipe','pipe','pipe']}));}catch{throw Error('PRIVATE_FORM_FAILED');}
}
