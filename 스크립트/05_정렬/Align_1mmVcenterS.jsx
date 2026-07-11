/* [가로 정렬 스크립트 - 작은 개체 고정 & 클리핑 마스크 대응]
  1. 면적이 가장 '작은' 개체 고정 (Key Object)
  2. 나머지 개체는 중심점(X좌표)을 비교하여 좌/우 그룹으로 분류
  3. 모든 개체를 Key Object의 '세로 중앙(Center Y)'에 맞춤
  4. 좌/우로 1mm 간격으로 차례대로 배치
  5. 텍스트는 글자 모양(Glyph), 클리핑 마스크는 마스크 경로 기준
*/

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

    // --- [핵심 함수] 실제 눈에 보이는 경계값 구하기 ---
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
        // 2. 클리핑 마스크 처리 (마스크 경로 기준)
        else if (obj.typename === "GroupItem" && obj.clipped) {
            for (var i = 0; i < obj.pageItems.length; i++) {
                var currItem = obj.pageItems[i];
                if (currItem.clipping) {
                    bounds = currItem.geometricBounds;
                    break;
                }
            }
            if (!bounds) bounds = obj.visibleBounds;
        }
        // 3. 일반 그룹: 보이는 자식들의 실제 경계 합집합 (바운딩 박스 대신)
        else if (obj.typename === "GroupItem") {
            bounds = getGroupVisibleBounds(obj);
            if (!bounds) bounds = obj.visibleBounds;
        }
        // 4. 일반 개체
        else {
            bounds = obj.geometricBounds;
        }
        return bounds;
    }

    // 그룹 내부의 보이는 자식들을 재귀적으로 훑어 실제 경계를 합집합
    function getGroupVisibleBounds(groupItem) {
        var gb = null;
        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (!child || child.hidden || child.clipping) continue;
            var cb = getRealBounds(child);
            if (!cb) continue;
            gb = gb ? [Math.min(gb[0], cb[0]), Math.max(gb[1], cb[1]), Math.max(gb[2], cb[2]), Math.min(gb[3], cb[3])] : cb;
        }
        return gb;
    }

    // --- 헬퍼 함수들 ---
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

    // --- 1. 기준 개체 선정 (면적이 가장 '작은' 것) ---
    var keyObject = sel[0];
    var minArea = getWidth(sel[0]) * getHeight(sel[0]);
    
    for (var i = 1; i < sel.length; i++) {
        var area = getWidth(sel[i]) * getHeight(sel[i]);
        if (area < minArea) {
            minArea = area;
            keyObject = sel[i];
        }
    }
    
    // 기준 개체 정보
    var keyBounds = getRealBounds(keyObject);
    var keyCenterY = (keyBounds[1] + keyBounds[3]) / 2; 
    var keyLeft = keyBounds[0];
    var keyRight = keyBounds[2];
    var keyCenterX = (keyLeft + keyRight) / 2;

    var rightObjects = [];
    var leftObjects = [];
    
    // --- 2. 좌/우 그룹 분류 ---
    for (var i = 0; i < sel.length; i++) {
        if (sel[i] == keyObject) continue;
        var objCenterX = getCenterX(sel[i]);
        if (objCenterX > keyCenterX) {
            rightObjects.push(sel[i]);
        } else {
            leftObjects.push(sel[i]);
        }
    }
    
    // --- 3. 정렬 순서 (기준점에 가까운 순서대로) ---
    rightObjects.sort(function(a, b) { return getCenterX(a) - getCenterX(b); });
    leftObjects.sort(function(a, b) { return getCenterX(b) - getCenterX(a); });
    
    var gap = 2.834645669; // 1mm
    
    // --- 4. 오른쪽 개체 배치 ---
    var currentRightEdge = keyRight;
    for (var i = 0; i < rightObjects.length; i++) {
        var obj = rightObjects[i];
        var objWidth = getWidth(obj);
        var myCenterY = getCenterY(obj);
        var deltaY = keyCenterY - myCenterY; // 세로 중앙 정렬량
        
        var currentBounds = getRealBounds(obj);
        var newLeft = currentRightEdge + gap;
        var deltaX = newLeft - currentBounds[0];
        
        obj.translate(deltaX, deltaY);
        currentRightEdge = newLeft + objWidth;
    }
    
    // --- 5. 왼쪽 개체 배치 ---
    var currentLeftEdge = keyLeft;
    for (var i = 0; i < leftObjects.length; i++) {
        var obj = leftObjects[i];
        var objWidth = getWidth(obj);
        var myCenterY = getCenterY(obj);
        var deltaY = keyCenterY - myCenterY; // 세로 중앙 정렬량
        
        var currentBounds = getRealBounds(obj);
        var newLeft = currentLeftEdge - gap - objWidth;
        var deltaX = newLeft - currentBounds[0];
        
        obj.translate(deltaX, deltaY);
        currentLeftEdge = newLeft;
    }
})();