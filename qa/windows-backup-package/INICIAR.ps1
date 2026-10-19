param([ValidateSet('Inicio','Preflight','Laboratorio','Respaldar','Verificar','Restaurar')][string]$Modo='Inicio',[switch]$SelfTest)
$ErrorActionPreference='Stop'
$env:SUPABASE_TELEMETRY_DISABLED='1';$env:DO_NOT_TRACK='1'
$Script:HomeDir=$PSScriptRoot
$Script:NodeVersion='24.21.0'
$Script:NodeHash='158f7685b44de51f6c0df1d153526cbcd3e1bc739a8dfc607721cef75de9e541'
$Script:CliHash='2606459be86e12e03fb6f6b9aa12a02aa00cfe21374857ec837a09c70b837eca'
$Script:PgImage='postgres:17.11-bookworm@sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826'
$Script:Tools=Join-Path $env:LOCALAPPDATA 'CheVeniA1\herramientas'
function Stop-Safe([string]$Code){throw $Code}
function Assert-Package {
 $manifest=Join-Path $Script:HomeDir 'MANIFEST.json'
 if(-not(Test-Path -LiteralPath $manifest)){Stop-Safe 'MANIFEST_AUSENTE'}
 foreach($item in (Get-Content -Raw -LiteralPath $manifest|ConvertFrom-Json).files){
  if($item.path -match '(^[\\/]|\.\.|:)'){Stop-Safe 'MANIFEST_INVALIDO'}
  $f=Join-Path $Script:HomeDir $item.path
  if(-not(Test-Path -LiteralPath $f -PathType Leaf)){Stop-Safe 'PAQUETE_INCOMPLETO'}
  if((Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.sha256){Stop-Safe 'PAQUETE_MODIFICADO'}
 }
}
function Paths-Separate([string]$A,[string]$B){
 $a1=[IO.Path]::GetFullPath($A).TrimEnd('\','/');$b1=[IO.Path]::GetFullPath($B).TrimEnd('\','/')
 return -not ($a1.Equals($b1,[StringComparison]::OrdinalIgnoreCase) -or $a1.StartsWith($b1+'\',[StringComparison]::OrdinalIgnoreCase) -or $b1.StartsWith($a1+'\',[StringComparison]::OrdinalIgnoreCase))
}
function Get-Preflight {
 $docker=Get-Command docker -ErrorAction SilentlyContinue
 $linux=$false;$local=$false
 if($docker -and -not $env:DOCKER_HOST -and -not $env:DOCKER_CONTEXT){try{$endpoint=(& docker context inspect --format '{{json .Endpoints.docker.Host}}' 2>$null)|ConvertFrom-Json;$local=($endpoint -like 'npipe://*');if($local){$value=& docker info --format '{{.OSType}}' 2>$null;$linux=($LASTEXITCODE -eq 0 -and "$value".Trim() -eq 'linux')}}catch{}}
 return [pscustomobject]@{status='diagnostico_sin_conexion_a_DEV';windows64=[Environment]::Is64BitOperatingSystem;powershell=$PSVersionTable.PSVersion.ToString();dockerEncontrado=[bool]$docker;dockerLocalVerificado=$local;dockerLinuxDisponible=$linux;instalacionesRealizadas=$false;respaldoRealEjecutado=$false}
}
function Ensure-Download([string]$Url,[string]$Hash,[string]$Destination){
 $folder=Split-Path $Destination -Parent;New-Item -ItemType Directory -Force -Path $folder|Out-Null
 if(Test-Path -LiteralPath $Destination){if((Get-FileHash -LiteralPath $Destination).Hash.ToLowerInvariant() -eq $Hash){return};Remove-Item -LiteralPath $Destination -Force}
 [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
 (New-Object System.Net.WebClient).DownloadFile($Url,$Destination)
 if((Get-FileHash -LiteralPath $Destination).Hash.ToLowerInvariant() -ne $Hash){Remove-Item -LiteralPath $Destination -Force;Stop-Safe 'DESCARGA_NO_VERIFICADA'}
}
function Ensure-Node {
 $zip=Join-Path $Script:Tools 'node.zip';$node=Join-Path $Script:Tools ('node-v'+$Script:NodeVersion+'-win-x64\node.exe')
 Ensure-Download ('https://nodejs.org/dist/v'+$Script:NodeVersion+'/node-v'+$Script:NodeVersion+'-win-x64.zip') $Script:NodeHash $zip
 # Re-extract the verified ZIP so a cached executable is never trusted blindly.
 Expand-Archive -LiteralPath $zip -DestinationPath $Script:Tools -Force
 return $node
}
function Ensure-Cli {
 $zip=Join-Path $Script:Tools 'supabase.zip'
 Ensure-Download 'https://github.com/supabase/cli/releases/download/v2.121.0/supabase_2.121.0_windows_amd64.zip' $Script:CliHash $zip
 $dir=Join-Path $Script:Tools 'supabase';Expand-Archive -LiteralPath $zip -DestinationPath $dir -Force
 return (Join-Path $dir 'supabase.exe')
}
function Invoke-PrivateNode([string]$Command,$Payload){
 $node=Ensure-Node;$psi=New-Object System.Diagnostics.ProcessStartInfo
 $psi.FileName=$node;$psi.Arguments='"'+(Join-Path $Script:HomeDir 'cli.mjs')+'" '+$Command
 $psi.UseShellExecute=$false;$psi.CreateNoWindow=$true;$psi.RedirectStandardInput=$true;$psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true
 foreach($unsafe in @('NODE_OPTIONS','NODE_TLS_REJECT_UNAUTHORIZED','NODE_EXTRA_CA_CERTS')){[void]$psi.EnvironmentVariables.Remove($unsafe)}
 $psi.StandardOutputEncoding=New-Object System.Text.UTF8Encoding($false);$psi.StandardErrorEncoding=New-Object System.Text.UTF8Encoding($false)
 $process=New-Object System.Diagnostics.Process;$process.StartInfo=$psi;[void]$process.Start()
 $out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync()
 $json=$Payload|ConvertTo-Json -Depth 50 -Compress;$bytes=[System.Text.Encoding]::UTF8.GetBytes($json);$process.StandardInput.BaseStream.Write($bytes,0,$bytes.Length);$process.StandardInput.BaseStream.Close();$json=$null;$bytes=$null
 $process.WaitForExit();$raw=$out.Result
 try{$result=$raw|ConvertFrom-Json}catch{Stop-Safe 'HERRAMIENTA_PRIVADA_FALLO'}
 if($process.ExitCode -ne 0 -or -not $result.ok){if($result.code -match '^[A-Z][A-Z0-9_]+$'){Stop-Safe $result.code};Stop-Safe 'HERRAMIENTA_PRIVADA_FALLO'}
 return $result
}
function Require-Docker {
 if(-not(Get-Preflight).dockerLinuxDisponible){Stop-Safe 'DOCKER_DESKTOP_LINUX_REQUERIDO_VER_LEEME'}
 & docker pull $Script:PgImage 1>$null 2>$null
 if($LASTEXITCODE -ne 0){Stop-Safe 'NO_SE_PUDO_DESCARGAR_CLIENTE_POSTGRES'}
}
function Ask-Fields([string]$Title,$Fields){
 Add-Type -AssemblyName System.Windows.Forms
 $f=New-Object System.Windows.Forms.Form;$f.Text=$Title;$f.Width=[Math]::Min(820,[System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Width-40);$f.Height=[Math]::Min([System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Height-80,155+55*$Fields.Count);$f.StartPosition='CenterScreen';$f.AutoScroll=$true
 $boxes=@{};$y=12
 foreach($item in $Fields){$label=New-Object System.Windows.Forms.Label;$label.Text=$item.Label;$label.Left=12;$label.Top=$y;$label.Width=760;$f.Controls.Add($label)
  $box=New-Object System.Windows.Forms.TextBox;$box.Left=12;$box.Top=$y+22;$box.Width=690;if($item.Default){$box.Text=$item.Default};if($item.Kind -eq 'secret'){$box.UseSystemPasswordChar=$true};$f.Controls.Add($box);$boxes[$item.Name]=$box
  if($item.Kind -eq 'file' -or $item.Kind -eq 'folder'){$button=New-Object System.Windows.Forms.Button;$button.Text='...';$button.Left=715;$button.Top=$y+20;$button.Width=60
   $target=$box;$kind=$item.Kind;$button.Add_Click({if($kind -eq 'folder'){$d=New-Object System.Windows.Forms.FolderBrowserDialog}else{$d=New-Object System.Windows.Forms.OpenFileDialog};if($d.ShowDialog() -eq 'OK') {if($kind -eq 'folder'){$target.Text=$d.SelectedPath}else{$target.Text=$d.FileName}}}.GetNewClosure());$f.Controls.Add($button)}
  $y+=55
 }
 $ok=New-Object System.Windows.Forms.Button;$ok.Text='Continuar';$ok.Left=12;$ok.Top=$y+10;$ok.DialogResult='OK';$f.Controls.Add($ok);$f.AcceptButton=$ok
 if($f.ShowDialog() -ne 'OK'){return $null};$values=@{};foreach($name in $boxes.Keys){$values[$name]=$boxes[$name].Text;$boxes[$name].Text=''};$f.Dispose();return $values
}
function Show-Result($Result){
 # Never pass credential objects, raw errors or process stderr here.
 $safe=$Result|ConvertTo-Json -Depth 8;Write-Host $safe
 Add-Type -AssemblyName System.Windows.Forms
 [void][System.Windows.Forms.MessageBox]::Show($safe,'Che Veni A1 - resultado')
}
function Invoke-Capture {
 Require-Docker
 $fields=@(
 @{Name='host';Label='Host de Connect / Session pooler, puerto 5432 (sin URL ni clave)';Default='db.tyvwgsdzqipusodxtydv.supabase.co'},
 @{Name='user';Label='Usuario de Connect';Default='postgres'},@{Name='password';Label='Contrasena actual de base de datos (solo memoria)';Kind='secret'},
 @{Name='storageKey';Label='Clave actual service_role/secret para lectura Storage (solo memoria)';Kind='secret'},@{Name='managementToken';Label='Acceso administrativo existente para GET raiz Vault (solo memoria)';Kind='secret'},
 @{Name='ca';Label='Certificado CA descargado desde Connect (archivo PEM)';Kind='file'},@{Name='journal';Label='Registro independiente ACTUAL de revocaciones';Kind='file'},
 @{Name='external';Label='Configuracion externa privada revisada (JSON; ver cobertura)';Kind='file'},@{Name='receipts';Label='Recibos de ventana/cierre W01-W10 y custodia (JSON)';Kind='file'},
 @{Name='backupFolder';Label='Carpeta privada para el respaldo cifrado, fuera del ZIP';Kind='folder'},@{Name='keyFolder';Label='Carpeta SEPARADA para clave cifrada, idealmente USB';Kind='folder'},
 @{Name='passphrase';Label='Frase privada de custodia: 20 caracteres o mas, no se guarda';Kind='secret'},@{Name='repeat';Label='Repetir frase privada de custodia';Kind='secret'},
 @{Name='confirmation';Label='Para permitir LECTURA real, escribir RESPALDAR DEV'}
 )
 $p=Ask-Fields 'Respaldo DEV privado - no cambia credenciales ni datos' $fields;if(-not $p){return}
 if($p.passphrase -ne $p.repeat -or $p.passphrase.Length -lt 20){Stop-Safe 'FRASES_NO_COINCIDEN_O_CORTAS'}
 if(-not(Paths-Separate $p.backupFolder $p.keyFolder) -or -not(Paths-Separate $p.backupFolder $Script:HomeDir) -or -not(Paths-Separate $p.keyFolder $Script:HomeDir)){Stop-Safe 'CARPETAS_DE_CUSTODIA_NO_SEPARADAS'}
 if($p.confirmation -ne 'RESPALDAR DEV'){Stop-Safe 'NO_AUTORIZADO'}
 $receipts=Get-Content -Raw -LiteralPath $p.receipts|ConvertFrom-Json
 if($receipts.confirmation -ne $p.confirmation){Stop-Safe 'RECIBOS_INCOMPLETOS'}
 $key=Invoke-PrivateNode 'key-create' @{passphrase=$p.passphrase}
 $name='CHE-VENI-DEV-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+([Guid]::NewGuid().ToString('N').Substring(0,6))
 $keyPath=Join-Path $p.keyFolder ($name+'.cclave');$output=Join-Path $p.backupFolder ($name+'.cva')
 if((Test-Path -LiteralPath $keyPath) -or (Test-Path -LiteralPath $output)){Stop-Safe 'ARCHIVO_YA_EXISTE'}
 [IO.File]::WriteAllBytes($keyPath,[Convert]::FromBase64String($key.wrapped))
 $opened=Invoke-PrivateNode 'key-open' @{keyFile=$keyPath;passphrase=$p.passphrase};if($opened.key -ne $key.key){Stop-Safe 'CUSTODIA_NO_VERIFICADA'}
 $payload=@{key=$key.key;output=$output;source=@{project='tyvwgsdzqipusodxtydv';host=$p.host;port=5432;database='postgres';user=$p.user;password=$p.password;storageKey=$p.storageKey;managementToken=$p.managementToken;ca=[IO.File]::ReadAllText($p.ca)};journal=[Convert]::ToBase64String([IO.File]::ReadAllBytes($p.journal));external=(Get-Content -Raw -LiteralPath $p.external|ConvertFrom-Json);receipts=$receipts}
 try{$result=Invoke-PrivateNode 'capture' $payload;Show-Result $result}finally{$payload=$null;$p=$null;$key=$null;$opened=$null}
}
function Invoke-Verify {
 $p=Ask-Fields 'Verificar respaldo cifrado - sin conexion a DEV' @(@{Name='backup';Label='Respaldo .cva';Kind='file'},@{Name='keyFile';Label='Clave CIFRADA .cclave de custodia separada';Kind='file'},@{Name='passphrase';Label='Frase privada de custodia';Kind='secret'});if(-not $p){return}
 try{$key=Invoke-PrivateNode 'key-open' $p;Show-Result (Invoke-PrivateNode 'verify' @{backup=$p.backup;key=$key.key})}finally{$p=$null;$key=$null}
}
function Invoke-LocalRestore {
 Require-Docker
 $p=Ask-Fields 'Restauracion SOLO descartable local, con limpieza obligatoria' @(@{Name='backup';Label='Respaldo .cva';Kind='file'},@{Name='keyFile';Label='Clave cifrada .cclave';Kind='file'},@{Name='passphrase';Label='Frase privada';Kind='secret'},@{Name='currentJournal';Label='Registro independiente ACTUAL de revocaciones';Kind='file'},@{Name='confirmation';Label='Escribir RESTAURAR SOLO LOCAL; requiere equipo privado y datos autorizados'})
 if(-not $p){return};if($p.confirmation -ne 'RESTAURAR SOLO LOCAL'){Stop-Safe 'NO_AUTORIZADO'}
 $cli=Ensure-Cli;$key=Invoke-PrivateNode 'key-open' $p;$id=[Guid]::NewGuid().ToString('N').Substring(0,12);$network='cheveni-a1-'+$id
 $ownedInitialized=$false;$ownedNetwork=$false
 $work=Join-Path $env:LOCALAPPDATA ('CheVeniA1\descartables\'+$id);New-Item -ItemType Directory -Path $work|Out-Null
 try{
  & $cli init --workdir $work --yes --agent no 1>$null 2>$null;if($LASTEXITCODE -ne 0){Stop-Safe 'INICIO_LOCAL_FALLO'}
  $config=Join-Path $work 'supabase\config.toml';$text=[IO.File]::ReadAllText($config);$text=$text -replace '(?m)^project_id\s*=.*$',('project_id = "cheveni_a1_'+$id+'"');[IO.File]::WriteAllText($config,$text,(New-Object System.Text.UTF8Encoding($false)));$ownedInitialized=$true
  & docker network create --label ('cheveni.a1.discardable='+$id) -o 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1' $network 1>$null 2>$null;if($LASTEXITCODE -ne 0){Stop-Safe 'RED_LOCAL_FALLO'};$ownedNetwork=$true
  & $cli start --workdir $work --network-id $network --agent no --exclude realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor 1>$null 2>$null;if($LASTEXITCODE -ne 0){Stop-Safe 'STACK_LOCAL_FALLO'}
  $ids=& docker ps --filter ('network='+$network) --format '{{.ID}}'
  foreach($container in $ids){$info=(& docker inspect $container|ConvertFrom-Json)[0];if($info.Name -ne ('/supabase_db_cheveni_a1_'+$id)){& docker stop $container 1>$null 2>$null}}
  $isolated=Invoke-PrivateNode 'isolate-bootstrap' @{container=('supabase_db_cheveni_a1_'+$id);network=$network;runId=$id}
  Show-Result (Invoke-PrivateNode 'restore-local' @{backup=$p.backup;key=$key.key;currentJournal=$p.currentJournal;container=('supabase_db_cheveni_a1_'+$id);network=$network;runId=$id})
 }finally{
  if($ownedInitialized){& $cli stop --workdir $work --no-backup --agent no 1>$null 2>$null}
  $left=& docker ps -a --filter ('network='+$network) --format '{{.ID}}'
  if($left){Write-Host 'LIMPIEZA_LOCAL_INCOMPLETA_NO_GO'}else{if($ownedNetwork){& docker network rm $network 1>$null 2>$null};Remove-Item -LiteralPath $work -Recurse -Force;Write-Host 'DESTINO_DESCARTABLE_DESTRUIDO'}
  $key=$null;$p=$null
 }
}
if($SelfTest){
 Assert-Package
 if(-not(Paths-Separate 'C:\respaldo' 'D:\custodia')){Stop-Safe 'TEST_SEPARACION'}
 if(Paths-Separate 'C:\respaldo' 'C:\respaldo\clave'){Stop-Safe 'TEST_ANIDADO'}
 if(Paths-Separate 'C:\respaldo' 'c:\RESPALDO'){Stop-Safe 'TEST_MAYUSCULAS'}
 Write-Output 'WINDOWS_HELPERS_PASS'
 $phrase=[Guid]::NewGuid().ToString('N')+[Guid]::NewGuid().ToString('N')+[char]0x00f1;$created=Invoke-PrivateNode 'key-create' @{passphrase=$phrase};Write-Output 'WINDOWS_CREATE_PASS'
 $temp=Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString('N')+'.cclave')
 try{[IO.File]::WriteAllBytes($temp,[Convert]::FromBase64String($created.wrapped));$opened=Invoke-PrivateNode 'key-open' @{keyFile=$temp;passphrase=$phrase};if($opened.key -ne $created.key){Stop-Safe 'TEST_PIPE_PRIVADO'};Write-Output 'WINDOWS_PRIVATE_PIPE_PASS';$cli=Ensure-Cli;$version=& $cli --version 2>$null;if($LASTEXITCODE -ne 0 -or "$version".Trim() -ne '2.121.0'){Stop-Safe 'CLI_WINDOWS_NO_VERIFICADA'};Write-Output 'WINDOWS_CLI_PASS'}finally{Remove-Item -LiteralPath $temp -Force;$created=$null;$opened=$null;$phrase=$null}
 exit 0
}
try{
 Assert-Package
 if($Modo -eq 'Preflight'){Get-Preflight|ConvertTo-Json;exit 0}
 if($Modo -eq 'Inicio'){
  Show-Result (Get-Preflight)
  Write-Host 'No se ha conectado a DEV. 1: requisitos, 2: laboratorio ficticio, 3: respaldo real futuro, 4: verificar, 5: restaurar SOLO local, 0: salir.'
  $choice=Read-Host 'Opcion'
  switch($choice){'1'{$Modo='Preflight'}'2'{$Modo='Laboratorio'}'3'{$Modo='Respaldar'}'4'{$Modo='Verificar'}'5'{$Modo='Restaurar'}default{exit 0}}
 }
 switch($Modo){
  'Preflight'{Show-Result(Get-Preflight)}
  'Respaldar'{Invoke-Capture}
  'Verificar'{Invoke-Verify}
  'Restaurar'{Invoke-LocalRestore}
  'Laboratorio'{Require-Docker;$node=Ensure-Node;$cli=Ensure-Cli;$env:CHEVENI_LAB_CLI=$cli;& $node (Join-Path $Script:HomeDir 'laboratorio.mjs');if($LASTEXITCODE -ne 0){Stop-Safe 'LABORATORIO_NO_APROBADO'}}
 }
}catch{if($_.Exception.Message -match '^[A-Z][A-Z0-9_]+$'){$code=$_.Exception.Message}else{$code='ASISTENTE_DETENIDO_VER_LEEME'};Write-Host $code;exit 1}
