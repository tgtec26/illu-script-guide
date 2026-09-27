#!/bin/bash
# 일러스트레이터 프로브 실행기 (macOS). AI가 스크립트를 일러에서 검증할 때 이것으로만 돌린다.
# - 일러 CPU가 8% 아래로 내려갈 때까지 기다린 뒤 보낸다 (앞 실행이 끝나기 전에 쌓지 않는다)
# - 경고창을 띄우지 않고(DONTDISPLAYALERTS), 프로브가 만든 문서는 저장하지 않고 닫는다
# - AppleScript 제한 시간을 600초로 두고 중간에 끊지 않는다 (timeout 명령으로 끊어도 일러는 계속 실행하고 다음 요청이 쌓인다)
# 사용: tools/illu-probe.sh /경로/probe.jsx   → probe.jsx의 마지막 식 값과 걸린 시간·일러 CPU를 출력
# 프로브는 한 번에 한 경우만, 10초 안쪽으로 (길면 일러의 AIHangMonitor가 응답 없음으로 보고 아이콘이 튀며 CPU를 계속 쓴다)
probe="$1"; wrap="${probe%.jsx}.wrap.jsx"
[ -f "$probe" ] || { echo "프로브 파일이 없음: $probe"; exit 1; }
pid=$(pgrep -f "MacOS/Adobe Illustrator$") || { echo "일러가 꺼져 있음"; exit 1; }
for i in $(seq 1 60); do c=$(ps -o %cpu= -p "$pid" | tr -d ' '); awk "BEGIN{exit !($c<8)}" && break; sleep 2; done
cat > "$wrap" <<JS
var __level = app.userInteractionLevel, __docs = app.documents.length, __out;
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
try { __out = \$.evalFile(new File("$probe")); }
catch (e) { __out = "ERROR: " + e + " line " + e.line; }
finally {
    while (app.documents.length > __docs) app.documents[0].close(SaveOptions.DONOTSAVECHANGES);
    app.userInteractionLevel = __level;
}
__out;
JS
start=$(date +%s)
osascript -e "with timeout of 600 seconds" -e "tell application id \"com.adobe.illustrator\" to do javascript (POSIX file \"$wrap\")" -e "end timeout"
echo "[${probe##*/}: $(( $(date +%s) - start ))s, 일러 cpu $(ps -o %cpu= -p "$pid" | tr -d ' ')%]"
