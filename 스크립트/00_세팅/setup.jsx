/*
  setup.jsx — 새 PC 일러스트 환경 일괄 세팅 (환경설정 + 액션).
  실행: File > Scripts > setup

  적용 항목 (값은 기존 PC에서 추출해 그대로 복제):
    5) 단위: 일반 mm (+ 획/문자 동일)
    6) 키보드 증감: 0.05mm
    7) 문자 크기/행간 증감: 1pt
    8) 고정점·핸들: 가장 크게
    2) 기본 액션 세트 제거 + 내 액션(cjhaction*.aia) 로드

  적용 후 현재값을 다시 읽어 alert로 자가검증한다.
*/
(function () {
    var P = app.preferences;

    function si(k, v) { try { P.setIntegerPreference(k, v); } catch (e) {} }
    function sr(k, v) { try { P.setRealPreference(k, v); } catch (e) {} }

    // 5) 단위: 일반(General) = mm  (rulerType 1=mm, 2=pt — 실험으로 확정)
    si("rulerType", 1);

    // 6) 키보드 증감 0.05mm  (= 0.05 * 72 / 25.4 pt)
    sr("cursorKeyLength", 0.1417322835);

    // 7) 문자 크기/행간 증감 1pt  (real 타입)
    sr("text/sizeIncrement", 1.0);

    // 8) 고정점·핸들 가장 크게
    si("selectedAnchorMarkType", 9);
    si("unselectedAnchorMarkType", 1);
    si("directionHandleMarkType", 4);
    si("DSLargeHandles", 1);
    si("anchorSizePref", 11);   // 크기(Size) 슬라이더: 최대 (4칸; 최소5 최대11). Cloud Prefs에 저장됨

    // 2) 액션: 기본 세트 제거 후 내 액션 로드
    var actionResult = loadMyActions();

    // 자가검증
    var v = [];
    v.push("단위 rulerType = " + P.getIntegerPreference("rulerType") + "  (목표 1=mm)");
    v.push("키증감 cursorKeyLength = " + P.getRealPreference("cursorKeyLength") + "  (목표 ~0.1417)");
    v.push("문자증감 text/sizeIncrement = " + P.getRealPreference("text/sizeIncrement") + "  (목표 1)");
    v.push("고정점 selectedAnchorMarkType = " + P.getIntegerPreference("selectedAnchorMarkType") + "  (목표 9)");
    v.push("핸들 DSLargeHandles = " + P.getIntegerPreference("DSLargeHandles") + "  (목표 1)");
    v.push("크기 anchorSizePref = " + P.getIntegerPreference("anchorSizePref") + "  (목표 11=최대)");
    v.push("액션: " + actionResult);

    alert(
        "환경 세팅 완료.\n\n" + v.join("\n") +
        "\n\n※ 단위/문자증감은 일러스트 재시작 후 UI에 반영될 수 있음.\n" +
        "※ 단축키는 [편집>키보드 단축키]에서 'cjh250907' 1회 선택 필요."
    );

    function loadMyActions() {
        try {
            var here = new File($.fileName).parent;          // setup.jsx 폴더
            var aias = here.getFiles("*.aia");
            if (!aias || aias.length === 0) {
                return "건너뜀 (.aia 없음: " + here.fsName + ")";
            }
            // 기본 액션 세트 제거 (이름 다를 수 있어 후보 모두 시도)
            var defaults = ["기본 작업", "Default Actions", "기본 액션"];
            for (var i = 0; i < defaults.length; i++) {
                try { app.unloadAction(defaults[i], ""); } catch (e) {}
            }
            app.loadAction(aias[0]);
            return "로드됨 (" + aias[0].name + ")";
        } catch (e) {
            return "실패: " + e;
        }
    }
})();
