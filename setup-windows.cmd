@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%setup-windows.ps1" -PauseOnExit %*
exit /b %errorlevel%
