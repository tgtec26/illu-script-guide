/*
  Illustrator Script: Force Black Stroke (100K)
  Description: 선택된 모든 객체의 선(Stroke)을 K=100(검정)으로 변경합니다.
  (선이 없는 객체도 선을 활성화하여 칠합니다.)
*/

(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택 확인
    if (sel.length === 0) {
        alert("선 색상을 검정(100K)으로 변경할 객체를 선택해주세요.");
        return;
    }

    // 3. 문서 모드에 맞는 '검정색(Black)' 정의
    var blackColor;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        // CMYK 모드: C,M,Y는 0이고 K만 100
        blackColor = new CMYKColor();
        blackColor.cyan = 0;
        blackColor.magenta = 0;
        blackColor.yellow = 0;
        blackColor.black = 100;
    } else {
        // RGB 모드: 완전한 검정 (0,0,0)
        blackColor = new RGBColor();
        blackColor.red = 0;
        blackColor.green = 0;
        blackColor.blue = 0;
    }

    // 4. 객체 처리 함수 (재귀 호출)
    function makeStrokeBlack(item) {
        // 그룹(Group) 처리
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                makeStrokeBlack(item.pageItems[i]);
            }
        } 
        // 복합 패스(Compound Path) 처리
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                var subPath = item.pathItems[j];
                subPath.stroked = true; // 선 켜기
                subPath.strokeColor = blackColor; // 색상 적용
            }
        } 
        // 일반 패스(Path) 처리
        else if (item.typename === "PathItem") {
            item.stroked = true; // 선 켜기
            item.strokeColor = blackColor; // 색상 적용
        }
        // 텍스트(Text) 처리
        else if (item.typename === "TextFrame") {
            item.textRange.stroked = true;
            item.textRange.strokeColor = blackColor;
        }
    }

    // 5. 실행
    for (var i = 0; i < sel.length; i++) {
        makeStrokeBlack(sel[i]);
    }

})();