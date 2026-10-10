#!/bin/bash
# 대상 일러스트레이터 번들 ID. 기본은 2027 베타, 정식판이면 ILLU_APP_ID=com.adobe.illustrator
APP_ID="${ILLU_APP_ID:-com.adobe.illustratorBeta}"
# 일러스트레이터 프로브 실행기 (macOS). AI가 스크립트를 일러에서 검증할 때 이것으로만 돌린다.
# 배경: osascript의 do javascript가 주 스레드를 몇 초 이상 막으면 일러의 AIHangMonitor(응답 없음 감시)가 걸려
#       Dock 아이콘이 튀고, 끝난 뒤에도 그 스레드가 CPU 한 코어를 헛돌며 쓴다 (11초짜리 한 번으로도 걸렸다).
#       풀려면 문서가 0개일 때 일러를 다시 켜야 한다. 그래서 프로브는 5초 안쪽으로 짧게 한다.
# - 일러가 1분 안에 한가해지지 않으면 보내지 않는다 (종료 코드 2)
# - 경고창을 띄우지 않고(DONTDISPLAYALERTS), 중간에 끊지 않는다 (timeout으로 끊어도 일러는 계속 실행하고 요청이 쌓인다)
# - 테스트 문서 하나(프로브 폴더의 illu-probe.ai)를 계속 쓴다. 문서 만들기(3~4초)를 매번 하지 않으려는 것.
#   프로브가 시작될 때 그 문서가 활성 문서이고 안이 비어 있다. 프로브는 app.documents.add()를 부르지 말고
#   app.activeDocument에 그린 뒤 필요하면 대지 크기(artboards[0].artboardRect)를 정하고 PNG로 내보낸다.
#   프로브가 따로 연 문서는 끝나면 저장하지 않고 닫는다.
# 사용: tools/illu-probe.sh /경로/probe.jsx   → probe.jsx의 마지막 식 값, 걸린 시간, 일러 상태를 출력
probe="$1"; wrap="${probe%.jsx}.wrap.jsx"; docfile="$(dirname "$probe")/illu-probe.ai"
[ -f "$probe" ] || { echo "프로브 파일이 없음: $probe"; exit 1; }
pid=$(pgrep -x "Adobe Illustrator") || { echo "일러가 꺼져 있음"; exit 1; }
idle() { local c; c=$(ps -o %cpu= -p "$pid" | tr -d ' '); awk "BEGIN{exit !($c<8)}"; }
for i in $(seq 1 30); do idle && break; sleep 2; done
# 1분 넘게 바쁘면 원인을 본다: AIHangMonitor가 헛돌면(시계만 읽는 샘플이 많으면) 보내지 않고,
# 확장 패널(CC 라이브러리 등)의 계속 다시 그리기 같은 배경 부하면 보낸다 (그 부하는 프로브와 무관)
if ! idle; then
    f=$(mktemp); sample "$pid" 1 -file "$f" >/dev/null 2>&1
    spin=$(awk '/Thread_.*AIHangMonitor/{t=1; next} /Thread_/{t=0} t && /mach_continuous_time|clock_gettime/ {match($0,/[0-9]+ /); n+=substr($0,RSTART,RLENGTH)} END{print n+0}' "$f"); rm -f "$f"
    if [ "$spin" -gt 200 ]; then
        echo "일러의 응답 없음 감시(AIHangMonitor)가 헛도는 중 — 보내지 않음. 문서를 닫고(0개) 일러를 다시 켠 뒤 실행"; exit 2
    fi
    echo "(일러 배경 부하 cpu $(ps -o %cpu= -p "$pid" | tr -d ' ')% — 감시 스레드는 정상이라 보냄)"
fi
cat > "$wrap" <<JS
// 일러의 스크립트 엔진은 실행 사이에 전역 변수를 기억한다. var만 쓰면 앞 실행의 값이 남으니 매번 명시적으로 비운다
var __level = app.userInteractionLevel, __out = undefined, __file = new File("$docfile"), __doc = null;
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
try {
    for (var __i = 0; __i < app.documents.length; __i++) {
        try { if (app.documents[__i].fullName.fsName === __file.fsName) __doc = app.documents[__i]; } catch (__e) {}
    }
    if (__doc === null) {
        if (__file.exists) __doc = app.open(__file);
        else { __doc = app.documents.add(DocumentColorSpace.CMYK, 400, 400); __doc.saveAs(__file); }
    }
    __doc.activate();
    while (__doc.pageItems.length > 0) __doc.pageItems[0].remove();
    __doc.selection = null;
} catch (e) { __out = "ERROR(준비): " + e; }
var __docs = app.documents.length;
if (__out === undefined) {
    try { __out = \$.evalFile(new File("$probe")); }
    catch (e) { __out = "ERROR: " + e + " line " + e.line; }
    finally {
        while (app.documents.length > __docs) {
            var __extra = app.documents[0] === __doc ? app.documents[1] : app.documents[0];
            __extra.close(SaveOptions.DONOTSAVECHANGES);
        }
        app.userInteractionLevel = __level;
    }
} else app.userInteractionLevel = __level;
__out;
JS
start=$(date +%s)
osascript -e "with timeout of 600 seconds" -e "tell application id \"$APP_ID\" to do javascript (POSIX file \"$wrap\")" -e "end timeout"
took=$(( $(date +%s) - start ))
for i in $(seq 1 15); do idle && break; sleep 2; done
state="한가"; idle || state="바쁨 (다음 실행 때 원인을 다시 본다)"
echo "[${probe##*/}: ${took}s, 일러 ${state}]"
[ "$took" -gt 5 ] && echo "  (5초를 넘김: 프로브를 더 쪼갤 것)"
exit 0
