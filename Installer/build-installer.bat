@echo off
setlocal
pwsh -NoProfile -File "%~dp0..\build-scripts\write-version.ps1"
if errorlevel 1 exit /b %errorlevel%
pushd "%~dp0"
"C:\Program Files (x86)\NSIS\makensis.exe" -V4 -INPUTCHARSET UTF8 installer.nsi
set "BUILD_RESULT=%errorlevel%"
popd
exit /b %BUILD_RESULT%
