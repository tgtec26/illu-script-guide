// [최종] 가장 작은 도형(또는 글자) 고정
// 클리핑 마스크 대응 및 텍스트 글리프 기준 1mm 간격 정렬
// 마지막 실행 스크립트 기록 → Align_RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;
    
    if (sel.length < 2) {
        alert("최소 2개 이상의 개체를 선택해주세요.");
        return;
    }

    // [핵심 함수] 개체의 '진짜 눈에 보이는' 경계값 구하기
    function getRealBounds(obj) {
        var bounds;

        // 1. 텍스트 프레임 처리 (글자 모양 기준)
        if (obj.typename === "TextFrame") {
            var tempObj = obj.duplicate();
            var outlined = null;
            try {
                outlined = tempObj.createOutline();
                bounds = outlined.geometricBounds; 
            } catch(e) {
                bounds = obj.geometricBounds;
            } finally {
                try {
                    if (outlined) outlined.remove();
                    if (tempObj) tempObj.remove();
                } catch(removeError) {}
            }
        } 
        // 2. 클리핑 마스크 처리 (가장 중요)
        else if (obj.typename === "GroupItem" && obj.clipped) {
            // 그룹 내부를 돌며 'clipping' 속성이 true인 경로를 찾음
            for (var i = 0; i < obj.pageItems.length; i++) {
                var currItem = obj.pageItems[i];
                if (currItem.clipping) {
                    bounds = currItem.geometricBounds;
                    break;
                }
            }
            // 마스크 경로를 못 찾은 경우를 대비한 예외 처리
            if (!bounds) bounds = obj.visibleBounds;
        }
        // 3. 일반 개체
        else {
            bounds = obj.geometricBounds;
        }
        return bounds;
    }

    // 헬퍼 함수들
    function getWidth(obj) {
        var bounds = getRealBounds(obj);
        return bounds[2] - bounds[0];
    }
    
    function getHeight(obj) {
        var bounds = getRealBounds(obj);
        return Math.abs(bounds[1] - bounds[3]);
    }
    
    function getCenterX(obj) {
        var bounds = getRealBounds(obj);
        return (bounds[0] + bounds[2]) / 2;
    }
    
    function getCenterY(obj) {
        var bounds = getRealBounds(obj);
        return (bounds[1] + bounds[3]) / 2;
    }

    // 이동 함수
    function setPosition(obj, targetLeft, targetTop) {
        var currentBounds = getRealBounds(obj);
        var currentLeft = currentBounds[0];
        var currentTop = currentBounds[1];
        
        var deltaX = targetLeft - currentLeft;
        var deltaY = targetTop - currentTop;
        
        obj.translate(deltaX, deltaY);
    }

    // 1. 기준 개체 선정 (면적이 가장 작은 것 고정)
    var keyObject = sel[0];
    var minArea = getWidth(sel[0]) * getHeight(sel[0]);
    
    for (var i = 1; i < sel.length; i++) {
        var area = getWidth(sel[i]) * getHeight(sel[i]);
        if (area < minArea) {
            minArea = area;
            keyObject = sel[i];
        }
    }
    
    // 기준 개체 정보 계산
    var keyBounds = getRealBounds(keyObject);
    var keyCenterY = (keyBounds[1] + keyBounds[3]) / 2;
    var keyCenterX = (keyBounds[0] + keyBounds[2]) / 2;
    var keyTop = keyBounds[1];
    var keyBottom = keyBounds[3];
    
    var upperObjects = [];
    var lowerObjects = [];
    
    // 2. 위/아래 그룹 분류
    for (var i = 0; i < sel.length; i++) {
        if (sel[i] == keyObject) continue;
        var objCenterY = getCenterY(sel[i]);
        if (objCenterY > keyCenterY) {
            upperObjects.push(sel[i]);
        } else {
            lowerObjects.push(sel[i]);
        }
    }
    
    // 3. 정렬
    upperObjects.sort(function(a, b) { return getCenterY(a) - getCenterY(b); });
    lowerObjects.sort(function(a, b) { return getCenterY(b) - getCenterY(a); });
    
    var gap = 2.834645669; // 1mm
    
    // 4. 위쪽 배치
    var currentLevel = keyTop; 
    for (var i = 0; i < upperObjects.length; i++) {
        var obj = upperObjects[i];
        var objHeight = getHeight(obj);
        var objWidth = getWidth(obj);
        var newLeft = keyCenterX - (objWidth / 2);
        var newTop = currentLevel + gap + objHeight;
        setPosition(obj, newLeft, newTop);
        currentLevel = newTop;
    }
    
    // 5. 아래쪽 배치
    var currentLevelDown = keyBottom;
    for (var i = 0; i < lowerObjects.length; i++) {
        var obj = lowerObjects[i];
        var objWidth = getWidth(obj);
        var objHeight = getHeight(obj);
        var newLeft = keyCenterX - (objWidth / 2);
        var newTop = currentLevelDown - gap;
        setPosition(obj, newLeft, newTop);
        currentLevelDown = newTop - objHeight;
    }
})();