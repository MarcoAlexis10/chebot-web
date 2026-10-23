@echo off
setlocal
cd /d "%~dp0"
node.exe "%~dp0entry.mjs"
if errorlevel 1 echo Operacion detenida. No reintentar una captura iniciada.
pause
endlocal
