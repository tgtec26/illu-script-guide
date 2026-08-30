/*
  Illustrator Script: Apply Dashed Line (2pt Dash, 1pt Gap)
  Description: 선택된 객체의 선을 점선(2pt)과 간격(1pt) 패턴으로 변경합니다.
*/

#include "Object_setdash_align_helper.jsxinc"
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}


(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택 확인
    if (sel.length === 0) {
        alert("점선을 적용할 대상을 선택해주세요.");
        return;
    }

    // 3. 점선 패턴 정의 [점선길이, 간격]
    var dashPattern = [2, 1]; 

    // 6. 실행 (전체 한 번에 처리)
    applyDashPatternToItems(sel, dashPattern, false);

})();
