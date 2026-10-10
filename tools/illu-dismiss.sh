#!/bin/bash
# 일러 모달 창을 접근성(System Events)으로 대신 닫는다. 자리를 비운 사이 일러가 모달에서 멈춰 작업이 끊기는 것을 막는다.
#   tools/illu-dismiss.sh           한 번 훑고 끝낸다
#   tools/illu-dismiss.sh --watch   2초마다 계속 훑는다 (Ctrl+C로 끝냄. 프로브·MCP 실행 중 백그라운드로 켜 둔다)
# 안전한 창만 닫고, 모르는 창은 글만 보고하고 그대로 둔다.
#   Wacom 드라이버 경고        → 확인
#   충돌 복구 알림             → 복구된 문서가 전부 "무제-N"(내 테스트 문서)일 때만 취소. 다른 문서가 있으면 두고 알린다
# 필요: 이 터미널(또는 Claude 앱)에 시스템 설정 > 개인정보 보호 및 보안 > 손쉬운 사용 권한
# ILLU_APP_ID로 대상 앱을 바꾼다(기본: 일러 2027 베타)

APP_ID="${ILLU_APP_ID:-com.adobe.illustratorBeta}"

pass() {
osascript - "$APP_ID" <<'EOF'
on countOf(needle, hay)
    set AppleScript's text item delimiters to needle
    set n to (count of text items of hay) - 1
    set AppleScript's text item delimiters to ""
    return n
end countOf

on pressFirst(w, names)
    tell application "System Events"
        repeat with nm in names
            try
                click (first button of w whose name is (nm as text))
                return nm as text
            end try
        end repeat
    end tell
    return ""
end pressFirst

on handle(w)
    set btns to {}
    set texts to {}
    tell application "System Events"
        try
            set btns to name of every button of w
        end try
        try
            set texts to value of every static text of w
        end try
    end tell
    set okLabels to {"확인", "OK"}
    set cancelLabels to {"취소", "Cancel"}
    set hasButton to false
    repeat with b in btns
        try
            if (b as text) is in (okLabels & cancelLabels) then set hasButton to true
        end try
    end repeat
    if not hasButton then return ""
    set joined to ""
    repeat with t in texts
        try
            set joined to joined & (t as text) & " "
        end try
    end repeat
    if joined contains "Wacom" then
        set pressed to my pressFirst(w, okLabels)
        return "clicked [" & pressed & "] Wacom 경고"
    end if
    if joined contains "충돌에서 복구" or joined contains "recovered from a crash" then
        set nRecovered to (my countOf("복구됨", joined)) + (my countOf("recovered", joined)) - (my countOf("recovered from a crash", joined))
        set nScratch to (my countOf("무제-", joined)) + (my countOf("Untitled-", joined))
        if nScratch > 0 and nScratch is nRecovered then
            set pressed to my pressFirst(w, cancelLabels)
            return "clicked [" & pressed & "] 충돌 복구(테스트 문서 " & nScratch & "개)"
        end if
        return "skipped 충돌 복구: 테스트 문서가 아닌 것이 있다 → " & joined
    end if
    return "skipped 모르는 창 → " & joined
end handle

on run argv
    set appId to item 1 of argv
    set report to ""
    tell application "System Events"
        set ps to (every process whose bundle identifier is appId)
        if (count of ps) is 0 then return "no-process"
        tell item 1 of ps
            set ws to windows
            repeat with w in ws
                set r to my handle(w)
                if r is not "" then set report to report & r & linefeed
                try
                    repeat with s in (sheets of w)
                        set r2 to my handle(s)
                        if r2 is not "" then set report to report & r2 & linefeed
                    end repeat
                end try
            end repeat
        end tell
    end tell
    return report
end run
EOF
}

if [ "$1" = "--watch" ]; then
    while true; do
        out=$(pass 2>&1)
        [ -n "$out" ] && [ "$out" != "no-process" ] && echo "$(date +%H:%M:%S) $out"
        sleep 2
    done
else
    out=$(pass 2>&1)
    echo "${out:-창 없음}"
fi
