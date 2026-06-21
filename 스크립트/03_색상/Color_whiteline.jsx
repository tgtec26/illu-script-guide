/*
  Illustrator Script: Force White Stroke
  Description: 선택된 모든 객체의 선(Stroke)을 무조건 흰색으로 변경합니다.
  (선이 없는 객체도 선을 활성화하여 흰색을 칠합니다.)
*/

(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택 확인
    if (sel.length === 0) {
        alert("선 색상을 변경할 객체를 선택해주세요.");
        return;
    }

    // 3. 문서 모드에 맞는 흰색 정의
    var whiteColor;
    if (doc.documentColorSpace === DocumentColorSpace.RGB) {
        whiteColor = new RGBColor();
        whiteColor.red = 255;
        whiteColor.green = 255;
        whiteColor.blue = 255;
    } else {
        whiteColor = new CMYKColor();
        whiteColor.cyan = 0;
        whiteColor.magenta = 0;
        whiteColor.yellow = 0;
        whiteColor.black = 0;
    }

    // 4. 객체 처리 함수 (재귀 호출)
    function makeStrokeWhite(item) {
        // 그룹(Group) 처리
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                makeStrokeWhite(item.pageItems[i]);
            }
        } 
        // 복합 패스(Compound Path) 처리
        else if (item.typename === "CompoundPathItem") {
            // 복합 패스 내부의 모든 패스에 적용
            for (var j = 0; j < item.pathItems.length; j++) {
                var subPath = item.pathItems[j];
                subPath.stroked = true; // 선 활성화
                subPath.strokeColor = whiteColor; // 흰색 적용
            }
        } 
        // 일반 패스(Path) 처리
        else if (item.typename === "PathItem") {
            item.stroked = true; // 선이 없었다면 켬
            item.strokeColor = whiteColor; // 흰색 적용
        }
        // 텍스트(Text) 처리
        else if (item.typename === "TextFrame") {
            // 텍스트는 선을 주면 가독성이 떨어질 수 있으나, 요청대로 적용함
            item.textRange.stroked = true;
            item.textRange.strokeColor = whiteColor;
        }
    }

    // 5. 실행
    for (var i = 0; i < sel.length; i++) {
        makeStrokeWhite(sel[i]);
    }

})();