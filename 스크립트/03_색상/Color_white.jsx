/*
  Illustrator Script: Force White Fill
  Description: 선택된 모든 객체의 면(Fill)을 무조건 흰색으로 변경합니다.
  (면이 없는 객체도 면을 생성하여 흰색을 칠합니다.)
*/

(function() {
    // 1. 문서가 열려있는지 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택된 객체가 없으면 종료
    if (sel.length === 0) {
        alert("흰색으로 칠할 객체를 선택해주세요.");
        return;
    }

    // 3. 문서 색상 모드에 맞는 '흰색' 정의
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

    // 4. 객체 처리 함수 (그룹, 복합 패스 포함)
    function makeWhite(item) {
        // 그룹인 경우 재귀 호출로 내부 아이템까지 진입
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                makeWhite(item.pageItems[i]);
            }
        } 
        // 복합 패스인 경우 내부 패스들을 순회
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                var subPath = item.pathItems[j];
                subPath.filled = true; // 면 활성화
                subPath.fillColor = whiteColor; // 흰색 적용
            }
        } 
        // 일반 패스인 경우
        else if (item.typename === "PathItem") {
            item.filled = true; // 면 활성화 (면이 없던 선 객체도 면이 생김)
            item.fillColor = whiteColor; // 흰색 적용
        }
        // 텍스트 박스인 경우 (글자 색상 변경)
        else if (item.typename === "TextFrame") {
            item.textRange.fillColor = whiteColor;
        }
    }

    // 5. 선택된 모든 객체에 실행
    for (var i = 0; i < sel.length; i++) {
        makeWhite(sel[i]);
    }

})();