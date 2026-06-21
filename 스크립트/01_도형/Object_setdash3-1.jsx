/*
  Illustrator Script: Apply Dashed Line (2pt Dash, 1pt Gap)
  Description: 선택된 객체의 선을 점선(2pt)과 간격(1pt) 패턴으로 변경합니다.
*/

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
    var dashPattern = [3, 1]; 

    // 4. 객체 처리 함수 (재귀적용)
    function applyDashedLine(item) {
        // 그룹 (Group) -> 내부 아이템 순회
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                applyDashedLine(item.pageItems[i]);
            }
        } 
        // 복합 패스 (Compound Path) -> 내부 패스 순회
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                applyToPath(item.pathItems[j]);
            }
        } 
        // 일반 패스 (Path)
        else if (item.typename === "PathItem") {
            applyToPath(item);
        }
    }

    // 5. 실제 패스에 속성 적용
    function applyToPath(pathItem) {
        try {
            pathItem.stroked = true; // 선(Stroke) 활성화
            pathItem.strokeDashes = dashPattern; // [2, 1] 패턴 적용
            
            // (선택사항) 끝 모양을 깔끔하게 하려면 아래 주석을 해제하세요.
            // pathItem.strokeCap = StrokeCap.BUTTENDCAP; 
        } catch(e) {
            // 잠겨있거나 수정 불가능한 레이어의 경우 에러 무시
        }
    }

    // 6. 실행
    for (var k = 0; k < sel.length; k++) {
        applyDashedLine(sel[k]);
    }

})();