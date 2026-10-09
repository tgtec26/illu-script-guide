#!/bin/bash
# 대화상자 편집 서버 실행 (맥: 파인더에서 더블클릭). 켜져 있던 서버는 끄고 새로 켠 뒤 브라우저로 연다 (크롬이 없으면 기본 브라우저)
cd "$(dirname "$0")/.." || exit 1
pkill -f "tools/ui-admin.js" 2>/dev/null
sleep 0.5
(sleep 1; open -a "Google Chrome" http://127.0.0.1:5200 2>/dev/null || open http://127.0.0.1:5200) &
node tools/ui-admin.js
