@echo off
chcp 65001 >nul
setlocal
set "SCRIPT_DIR=%~dp0"
echo 새 PC 전체 세팅 (스크립트 + 단축키 + 화살표)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%update-windows.ps1" -Full
if errorlevel 1 (
  echo.
  echo 세팅 실패.
  pause
)
