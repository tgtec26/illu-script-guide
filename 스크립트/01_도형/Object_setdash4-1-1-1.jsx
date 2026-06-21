/*
  Illustrator Script: Apply Chain Line (Fixed)
  Description: 1점 쇄선(긴선4pt, 간격1pt, 짧은선1pt, 간격1pt) 적용
*/

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

    // 4. 객체 처리 함수 (재귀 탐색)
    function processItem(item) {
        // 그룹(Group)인 경우 내부 요소 탐색
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                processItem(item.pageItems[i]);
            }
        } 
        // 복합 패스(Compound Path)인 경우 내부 패스 탐색
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                applyToPath(item.pathItems[j]);
            }
        } 
        // 일반 패스(Path)인 경우 바로 적용
        else if (item.typename === "PathItem") {
            applyToPath(item);
        }
    }

    // 5. 실제 선 적용 함수
    function applyToPath(pathItem) {
        try {
            pathItem.stroked = true;             // 선 활성화
            pathItem.strokeDashes = dashPattern; // 점선 패턴 적용
            pathItem.strokeCap = StrokeCap.BUTTENDCAP; // 선 끝 모양 단면 처리
        } catch(e) {
            // 잠긴 레이어 등 오류 발생 시 무시
        }
    }

    // 6. 실행 루프
    for (var k = 0; k < sel.length; k++) {
        processItem(sel[k]);
    }

})(); // <-- 이 마지막 괄호들이 꼭 포함되어야 합니다.