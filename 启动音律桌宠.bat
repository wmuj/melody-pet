@echo off
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
if not exist "dist\index.html" (
  call npm run build
  if errorlevel 1 exit /b 1
)
if not exist "native\bin\voice-bridge.exe" (
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-helper.ps1
  if errorlevel 1 exit /b 1
)
if not exist "native\bin\smtc-bridge.exe" (
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-helper.ps1
  if errorlevel 1 exit /b 1
)
start "" "node_modules\electron\dist\electron.exe" .
