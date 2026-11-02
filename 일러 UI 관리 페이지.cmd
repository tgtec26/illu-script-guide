@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js를 찾지 못했습니다. Node.js LTS 설치 후 이 파일을 다시 실행해주세요.
    echo https://nodejs.org/
    pause
    exit /b 1
)
node tools\ui-admin-launch.js %*
if errorlevel 1 (
    echo UI 관리 페이지를 실행하지 못했습니다. 위 오류를 확인해주세요.
    pause
    exit /b 1
)
