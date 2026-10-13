#!/bin/bash
# Finder에서 더블클릭하면 서버를 실행하고 UI 관리 페이지를 연다.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
UI_ADMIN_PORT="${UI_ADMIN_PORT:-5200}"
export UI_ADMIN_PORT
UI_ADMIN_URL="http://127.0.0.1:$UI_ADMIN_PORT/"

open_page() {
    open -a "Google Chrome" "$UI_ADMIN_URL" 2>/dev/null || open "$UI_ADMIN_URL"
}

if curl --silent --fail --max-time 1 "$UI_ADMIN_URL" >/dev/null; then
    echo "서버가 실행 중입니다. UI 관리 페이지를 엽니다."
    open_page
    exit $?
fi

if ! command -v node >/dev/null 2>&1; then
    echo "Node.js를 찾지 못했습니다. Node.js 설치 후 다시 실행하세요."
    read -r -p "엔터를 누르면 닫힙니다. "
    exit 1
fi

node tools/ui-admin.js "$@" &
UI_ADMIN_PID=$!
trap 'kill "$UI_ADMIN_PID" 2>/dev/null || true' EXIT
trap 'exit 130' INT TERM

for ((UI_ADMIN_TRY=0; UI_ADMIN_TRY<40; UI_ADMIN_TRY++)); do
    if curl --silent --fail --max-time 1 "$UI_ADMIN_URL" >/dev/null; then
        open_page
        echo "이 터미널을 열어 두세요. 서버를 종료하려면 Ctrl+C를 누르세요."
        wait "$UI_ADMIN_PID"
        exit $?
    fi
    if ! kill -0 "$UI_ADMIN_PID" 2>/dev/null; then
        echo "서버를 실행하지 못했습니다. 위 오류를 확인하세요."
        wait "$UI_ADMIN_PID"
        exit 1
    fi
    sleep 0.25
done

echo "서버가 응답하지 않습니다: $UI_ADMIN_URL"
exit 1
