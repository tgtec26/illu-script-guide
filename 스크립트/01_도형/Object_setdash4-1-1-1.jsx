/*
  Illustrator Script: Apply Chain Line (Fixed)
  Description: 1점 쇄선(긴선4pt, 간격1pt, 짧은선1pt, 간격1pt) 적용
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
        alert("대상을 선택해주세요.");
        return;
    }

    // 3. 패턴 정의: [긴 선, 간격, 짧은 선, 간격]
    var dashPattern = [4, 1, 1, 1]; 

    // 6. 실행 (전체 한 번에 처리)
    applyDashPatternToItems(sel, dashPattern, true);

})(); // <-- 이 마지막 괄호들이 꼭 포함되어야 합니다.
