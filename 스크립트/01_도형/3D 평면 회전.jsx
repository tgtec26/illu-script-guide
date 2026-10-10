// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 기존 메뉴·단축키 유지: 3D → 2D 라인의 평면 회전 탭으로 연결한다.
(function() {
    var previous = typeof __3DLineStartTab === "undefined" ? null : __3DLineStartTab;
    try {
        __3DLineStartTab = "평면 회전";
        $.evalFile(new File(new File($.fileName).parent.fsName + "/3D.jsx"));
    } catch (openError) {
        alert("3D → 2D 라인 스크립트를 열 수 없습니다.\n" + openError);
    } finally {
        __3DLineStartTab = previous;
    }
})();
