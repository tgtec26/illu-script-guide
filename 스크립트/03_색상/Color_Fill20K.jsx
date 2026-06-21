/*
  Illustrator Script: Force Fill 20K (Pure Black Fixed)
  Description: 선택된 객체의 면(Fill)을 CMY 혼합 없는 순수 20% 회색(K=20)으로 변경합니다.
*/

(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    // 2. 선택 확인
    if (sel.length === 0) {
        alert("20K(회색)로 칠할 객체를 선택해주세요.");
        return;
    }

    // 3. 20K 색상 정의 (수정됨)
    var targetColor;
    
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        // [핵심 수정] CMYKColor 대신 GrayColor 사용
        // 이렇게 해야 프로파일 영향을 받지 않고 K 채널에만 20%가 들어갑니다.
        targetColor = new GrayColor();
        targetColor.gray = 20; // K=20
    } else {
        // RGB 모드: 20% Black = 80% White
        // (RGB에서는 회색을 만드려면 R=G=B가 같아야 함)
        var rgbVal = 255 * 0.8; 
        targetColor = new RGBColor();
        targetColor.red = rgbVal;
        targetColor.green = rgbVal;
        targetColor.blue = rgbVal;
    }

    // 4. 객체 처리 함수
    function applyColor(item) {
        // 그룹일 경우 재귀함수로 내부 진입
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                applyColor(item.pageItems[i]);
            }
        } 
        // 복합 패스(Compound Path) 처리
        else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                var subPath = item.pathItems[j];
                subPath.filled = true;
                subPath.fillColor = targetColor;
            }
        } 
        // 일반 패스(Path) 처리
        else if (item.typename === "PathItem") {
            item.filled = true; // 면 강제 활성화
            item.fillColor = targetColor;
        }
        // 텍스트(Text) 처리
        else if (item.typename === "TextFrame") {
            item.textRange.fillColor = targetColor;
        }
    }

    // 5. 실행
    for (var i = 0; i < sel.length; i++) {
        applyColor(sel[i]);
    }

})();