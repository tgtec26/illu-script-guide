@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%script-action-update-windows.ps1" %*
if errorlevel 1 (
  echo.
  echo Update failed.
  pause
)
