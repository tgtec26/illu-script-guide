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
        if (isClippingItem(item)) {
            return false;
        }

        // 2. 컴파운드 패스 처리
        if (item.typename === "CompoundPathItem") {
            return isTransparentCompoundPath(item);
        }

        // 3. 일반 패스(PathItem)만 삭제 후보로 처리합니다.
        // 라이브 패스파인더/플러그인 개체는 화면에 보이는 선/면이 DOM의 filled/stroked로
        // 드러나지 않을 수 있어 삭제 대상에서 제외합니다.
        if (item.typename !== "PathItem") {
            return false;
        }

        return isTransparentPath(item);
    }

    function isTransparentCompoundPath(item) {
        if (item.opacity === 0) {
            return true;
        }

        if (item.pathItems.length === 0) {
            return true;
        }

        for (var i = 0; i < item.pathItems.length; i++) {
            if (!isTransparentPath(item.pathItems[i])) {
                return false;
            }
        }

        return true;
    }

    function isTransparentPath(pathItem) {
        if (isClippingItem(pathItem)) {
            return false;
        }

        if (pathItem.opacity === 0) {
            return true;
        }

        return !hasVisibleFill(pathItem) && !hasVisibleStroke(pathItem);
    }

    function hasVisibleFill(pathItem) {
        if (!pathItem.filled) {
            return false;
        }

        try {
            return pathItem.fillColor.typename !== "NoColor";
        } catch(e) {
            return false;
        }
    }

    function hasVisibleStroke(pathItem) {
        if (!pathItem.stroked) {
            return false;
        }

        try {
            return pathItem.strokeColor.typename !== "NoColor" && pathItem.strokeWidth > 0;
        } catch(e) {
            return false;
        }
    }

    function isClippingItem(item) {
        try {
            if (item.hasOwnProperty("clipping") && item.clipping === true) {
                return true;
            }
        } catch(e) {}

        if (item.typename === "CompoundPathItem") {
            try {
                for (var i = 0; i < item.pathItems.length; i++) {
                    if (isClippingItem(item.pathItems[i])) {
                        return true;
                    }
                }
            } catch(e) {}
        }

        return false;
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
