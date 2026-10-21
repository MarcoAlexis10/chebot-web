@echo off
setlocal DisableDelayedExpansion
set "NODE_OPTIONS="
set "NODE_TLS_REJECT_UNAUTHORIZED="
set "NODE_EXTRA_CA_CERTS="
set "CHEVENI_PROVISIONAL_NODE="
if exist "%LOCALAPPDATA%\CheVeniA1\herramientas\node-v24.21.0-win-x64\node.exe" set "CHEVENI_PROVISIONAL_NODE=%LOCALAPPDATA%\CheVeniA1\herramientas\node-v24.21.0-win-x64\node.exe"
if not defined CHEVENI_PROVISIONAL_NODE if exist "%LOCALAPPDATA%\CheVeniA1\herramientas\node-v24.19.0-win-x64\node.exe" set "CHEVENI_PROVISIONAL_NODE=%LOCALAPPDATA%\CheVeniA1\herramientas\node-v24.19.0-win-x64\node.exe"
if not defined CHEVENI_PROVISIONAL_NODE for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined CHEVENI_PROVISIONAL_NODE set "CHEVENI_PROVISIONAL_NODE=%%N"
if not defined CHEVENI_PROVISIONAL_NODE goto missing
powershell.exe -NoLogo -NoProfile -NonInteractive -Command "$s=Get-AuthenticodeSignature -LiteralPath $env:CHEVENI_PROVISIONAL_NODE;if($s.Status -ne 'Valid' -or $s.SignerCertificate.Subject -notmatch 'OpenJS|Node.js'){exit 1}" >nul 2>nul
if errorlevel 1 goto unsigned
"%CHEVENI_PROVISIONAL_NODE%" "%~dp0iniciar.mjs" DIAGNOSTICO-LOCAL
set "RC=%ERRORLEVEL%"
goto done
:missing
echo NODE_FIRMADO_INSTALADO_NO_ENCONTRADO
set "RC=1"
goto done
:unsigned
echo NODE_SIGNATURE_NOT_VERIFIED_NO_CHANGES
set "RC=1"
:done
if not defined CHEVENI_PACKAGE_NO_PAUSE pause
exit /b %RC%
