@echo off
:: 관리자 권한으로 자동 상승 후 정션 설치 실행
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File','\"%~dp0link-scripts-windows.ps1\"'"
