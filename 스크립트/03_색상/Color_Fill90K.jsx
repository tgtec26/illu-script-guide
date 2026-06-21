/*
  Illustrator Script: Force Fill 90K (Pure Black Fixed)
  Description: 선택된 객체의 면(Fill)을 CMY 혼합 없는 순수 90% 회색(K=90)으로 변경합니다.
*/

(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택 확인
    if (sel.length === 0) {
        alert("90K(회색)로 칠할 객체를 선택해주세요.");
        return;
    }

    // 3. 90K 색상 정의
    var targetColor;
    
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        // [핵심] GrayColor 객체를 사용하여 순수 K값만 90% 적용
        targetColor = new GrayColor();
        targetColor.gray = 90; // K=90
    } else {
        // RGB 모드: 90% Black = 10% White (매우 어두움)
        var rgbVal = 255 * 0.1; 
        targetColor = new RGBColor();
        targetColor.red = rgbVal;
        targetColor.green = rgbVal;
        targetColor.blue = rgbVal;
    }

    // 4. 객체 처리 함수
    function applyColor(item) {
        // 그룹 (Group)
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                applyColor(item.pageItems[i]);
            }
        } 
        // 복합 패스 (Compound Path)
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                var subPath = item.pathItems[j];
                subPath.filled = true;
                subPath.fillColor = targetColor;
            }
        } 
        // 일반 패스 (Path)
        else if (item.typename === "PathItem") {
            item.filled = true; // 면 강제 활성화
            item.fillColor = targetColor;
        }
        // 텍스트 (Text)
        else if (item.typename === "TextFrame") {
            item.textRange.fillColor = targetColor;
        }
    }

    // 5. 실행
    for (var i = 0; i < sel.length; i++) {
        applyColor(sel[i]);
    }

})();