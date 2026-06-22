/*
  Illustrator Script: Delete Ghost Objects (Protect Clipping Masks)
  기능: 면/선이 없고 투명한 객체를 삭제하되, 클리핑 마스크는 보존합니다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }
    
    var doc = app.activeDocument;
    var deletedCount = 0;
    
    // 객체가 완전히 투명한지 확인하는 함수
    function isCompletelyTransparent(item) {
        
        // 1. [핵심 수정] 클리핑 마스크인지 확인 (PathItem, CompoundPathItem 등)
        // item.clipping이 true면 마스크 역할을 하는 도형이므로 삭제 대상에서 제외
        if (item.hasOwnProperty("clipping") && item.clipping === true) {
            return false;
        }

        // 2. 그룹, 텍스트, 이미지 등은 제외 (내부 순환은 checkAndDeleteTransparent에서 처리)
        if (item.typename === "GroupItem" || 
            item.typename === "TextFrame" || 
            item.typename === "PlacedItem" ||
            item.typename === "RasterItem" ||
            item.typename === "SymbolItem") {
            return false;
        }
        
        // 3. 투명도(Opacity)가 0이면 무조건 투명으로 간주
        if (item.opacity === 0) {
            return true;
        }

        // 4. 컴파운드 패스 처리
        if (item.typename === "CompoundPathItem") {
            var hasFill = false;
            var hasStroke = false;
            
            if (item.pathItems.length > 0) {
                var firstPath = item.pathItems[0];
                
                if (firstPath.filled) {
                    try {
                        if (firstPath.fillColor.typename !== "NoColor") hasFill = true;
                    } catch(e) {}
                }
                
                if (firstPath.stroked) {
                    try {
                        if (firstPath.strokeColor.typename !== "NoColor" && firstPath.strokeWidth > 0) hasStroke = true;
                    } catch(e) {}
                }
            }
            return !hasFill && !hasStroke;
        }
        
        // 5. 일반 패스(PathItem) 처리
        var hasFill = false;
        var hasStroke = false;
        
        // Fill 확인
        if (item.filled) {
            try {
                if (item.fillColor.typename !== "NoColor") hasFill = true;
            } catch(e) {}
        }
        
        // Stroke 확인
        if (item.stroked) {
            try {
                if (item.strokeColor.typename !== "NoColor" && item.strokeWidth > 0) hasStroke = true;
            } catch(e) {}
        }
        
        // Fill도 Stroke도 없으면 투명
        return !hasFill && !hasStroke;
    }
    
    // 재귀적으로 아이템 검사 및 삭제
    function checkAndDeleteTransparent(items) {
        for (var i = items.length - 1; i >= 0; i--) {
            var item = items[i];
            
            // 그룹인 경우 내부로 진입
            if (item.typename === "GroupItem") {
                checkAndDeleteTransparent(item.pageItems);
                
                // (선택 사항) 내용물이 다 지워져서 빈 껍데기만 남은 그룹도 삭제하고 싶다면 아래 주석 해제
                /*
                if (item.pageItems.length === 0) {
                    item.remove();
                    deletedCount++;
                }
                */
                continue;
            }
            
            // 투명 객체 판별 후 삭제
            if (isCompletelyTransparent(item)) {
                item.remove();
                deletedCount++;
            }
        }
    }
    
    // 레이어 잠금 확인 후 실행
    for (var i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];
        if (!layer.locked && layer.visible) {
            checkAndDeleteTransparent(layer.pageItems);
        }
    }
    
    alert("완료: " + deletedCount + "개의 불필요한 투명 객체를 삭제했습니다.\n(클리핑 마스크는 보존되었습니다.)");
})();