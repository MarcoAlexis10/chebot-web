@echo off
setlocal
set "CV_NODE=%LOCALAPPDATA%\CheVeniA1\herramientas\node-v24.21.0-win-x64\node.exe"
if exist "%CV_NODE%" goto run
set "CV_NODE=%LOCALAPPDATA%\CheVeniA1\herramientas\node-v24.19.0-win-x64\node.exe"
if exist "%CV_NODE%" goto run
set "CV_NODE=node"
:run
if "%CHEVENI_NEW_ADAPTER_DIAGNOSTIC%"=="1" goto diagnostic
"%CV_NODE%" "%~dp0windows-entry.mjs"
goto done
:diagnostic
"%CV_NODE%" "%~dp0windows-entry.mjs" --diagnostic
:done
set "CV_RESULT=%ERRORLEVEL%"
if not "%CHEVENI_PACKAGE_NO_PAUSE%"=="1" pause
exit /b %CV_RESULT%
