/* [가로+세로 가운데 정렬 - 작은 개체 고정]
  1. 면적이 가장 작은 개체를 기준 개체(Key Object)로 고정
  2. 나머지 개체의 가로 중심과 세로 중심을 기준 개체의 중심점에 맞춤
  3. 텍스트는 글자 모양(Glyph), 클리핑 마스크는 마스크 경로 기준 계산
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

    function getRealBounds(obj) {
        var bounds;

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
        } else if (obj.typename === "GroupItem") {
            bounds = getGroupRealBounds(obj);
            if (!bounds) bounds = obj.geometricBounds;
        } else {
            bounds = obj.geometricBounds;
        }

        return bounds;
    }

    function getGroupRealBounds(groupItem) {
        var bounds = null;

        if (groupItem.clipped) {
            bounds = getClippingBounds(groupItem);
            if (bounds) return bounds;
        }

        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (isClippingPath(child)) continue;

            var childBounds = getRealBounds(child);
            bounds = unionBounds(bounds, childBounds);
        }

        return bounds;
    }

    function getClippingBounds(groupItem) {
        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (isClippingPath(child)) {
                return child.geometricBounds;
            }
            if (child.typename === "GroupItem") {
                var nested = getClippingBounds(child);
                if (nested) return nested;
            }
        }
        return null;
    }

    function isClippingPath(item) {
        if (item.typename === "PathItem") {
            return item.clipping;
        }
        if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) {
                if (item.pathItems[i].clipping) return true;
            }
        }
        return false;
    }

    function unionBounds(boundsA, boundsB) {
        if (!boundsB) return boundsA;
        if (!boundsA) return [boundsB[0], boundsB[1], boundsB[2], boundsB[3]];

        return [
            Math.min(boundsA[0], boundsB[0]),
            Math.max(boundsA[1], boundsB[1]),
            Math.max(boundsA[2], boundsB[2]),
            Math.min(boundsA[3], boundsB[3])
        ];
    }

    function getWidth(obj) {
        var bounds = getRealBounds(obj);
        return bounds[2] - bounds[0];
    }

    function getHeight(obj) {
        var bounds = getRealBounds(obj);
        return Math.abs(bounds[1] - bounds[3]);
    }

    function getArea(obj) {
        return getWidth(obj) * getHeight(obj);
    }

    function getCenterX(obj) {
        var bounds = getRealBounds(obj);
        return (bounds[0] + bounds[2]) / 2;
    }

    function getCenterY(obj) {
        var bounds = getRealBounds(obj);
        return (bounds[1] + bounds[3]) / 2;
    }

    function alignToKeyCenter(obj, keyCenterX, keyCenterY) {
        var deltaX = keyCenterX - getCenterX(obj);
        var deltaY = keyCenterY - getCenterY(obj);
        obj.translate(deltaX, deltaY);
    }

    var keyObject = sel[0];
    var minArea = getArea(sel[0]);

    for (var i = 1; i < sel.length; i++) {
        var area = getArea(sel[i]);
        if (area < minArea) {
            minArea = area;
            keyObject = sel[i];
        }
    }

    var keyCenterX = getCenterX(keyObject);
    var keyCenterY = getCenterY(keyObject);

    for (var j = 0; j < sel.length; j++) {
        if (sel[j] === keyObject) continue;
        alignToKeyCenter(sel[j], keyCenterX, keyCenterY);
    }
})();
