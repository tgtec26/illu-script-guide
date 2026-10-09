@echo off
chcp 65001 >nul
rem 대화상자 편집 서버 실행 (윈도우: 더블클릭). 브라우저를 열고 서버를 켠다
cd /d "%~dp0.."
start "" http://127.0.0.1:5200
node tools/ui-admin.js
