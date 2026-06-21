/*
  Illustrator Script: Force Black Fill (100K)
  Description: 선택된 모든 객체의 면(Fill)을 K=100(검정)으로 변경합니다.
  (면이 없는 객체도 면을 생성하여 칠합니다.)
*/

(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택 확인
    if (sel.length === 0) {
        alert("검정색(100K)으로 칠할 객체를 선택해주세요.");
        return;
    }

    // 3. 문서 모드에 맞는 '검정색(Black)' 정의
    var blackColor;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        blackColor = new CMYKColor();
        blackColor.cyan = 0;
        blackColor.magenta = 0;
        blackColor.yellow = 0;
        blackColor.black = 100; // K값을 100으로 설정
    } else {
        // RGB 모드에서는 R,G,B 모두 0이 가장 어두운 검정
        blackColor = new RGBColor();
        blackColor.red = 0;
        blackColor.green = 0;
        blackColor.blue = 0;
    }

    // 4. 객체 처리 함수 (재귀 호출)
    function makeFillBlack(item) {
        // 그룹(Group) 처리
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                makeFillBlack(item.pageItems[i]);
            }
        } 
        // 복합 패스(Compound Path) 처리
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                var subPath = item.pathItems[j];
                subPath.filled = true; // 면 활성화
                subPath.fillColor = blackColor;
            }
        } 
        // 일반 패스(Path) 처리
        else if (item.typename === "PathItem") {
            item.filled = true; // 면 활성화
            item.fillColor = blackColor;
        }
        // 텍스트(Text) 처리
        else if (item.typename === "TextFrame") {
            item.textRange.fillColor = blackColor;
        }
    }

    // 5. 실행
    for (var i = 0; i < sel.length; i++) {
        makeFillBlack(sel[i]);
    }

})();