@echo off
chcp 65001 >nul
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
if exist "release\泡泡桌面伙伴-Portable\泡泡桌面伙伴.exe" (
  start "" "release\泡泡桌面伙伴-Portable\泡泡桌面伙伴.exe" --settings
) else (
  start "" "node_modules\electron\dist\electron.exe" . --settings
)
