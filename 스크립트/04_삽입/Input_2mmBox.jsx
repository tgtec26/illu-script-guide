// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Input_2mmBox.jsx
  기능: 선택한 개체(여러 개면 전체)의 보이는 영역에서 상하좌우 2mm 여백을 둔 0.3pt 사각형을 그립니다.
    - 보이는 영역 = 선 두께 포함, 클리핑 그룹은 마스크 범위, 잠김·숨김 상태는 잠시 풀고 잰 뒤 되돌림
    - 다이얼로그 없이 바로 그리고, 새 사각형을 선택합니다
  사용법: 개체를 선택하고 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var MM_TO_PT = 2.834645669;
    var MARGIN = 2 * MM_TO_PT;
    var STROKE_PT = 0.3;
    var doc = app.activeDocument;
    var selection = doc.selection;

    if (!selection || selection.length === 0) {
        alert("사각형을 두를 개체를 선택해주세요.");
        return;
    }

    var bounds = null;
    for (var s = 0; s < selection.length; s++) {
        var itemBounds = getItemBounds(selection[s]);
        if (itemBounds) bounds = unionBounds(bounds, itemBounds);
    }
    if (!bounds) {
        alert("선택한 개체의 영역을 잴 수 없습니다.");
        return;
    }

    var box = doc.activeLayer.pathItems.rectangle(
        bounds[1] + MARGIN, bounds[0] - MARGIN,
        (bounds[2] - bounds[0]) + MARGIN * 2, (bounds[1] - bounds[3]) + MARGIN * 2);
    box.filled = false;
    box.stroked = true;
    box.strokeWidth = STROKE_PT;
    box.strokeColor = makeBlack();
    box.strokeDashes = [];
    box.name = "2mm Box";

    doc.selection = null;
    box.selected = true;
    app.redraw();

    // -------------------------------------------------------
    // 보이는 영역 (10_기타/fit2mm.jsx와 동일)
    // -------------------------------------------------------
    function rememberState(states, item, prop) {
        try {
            if (typeof item[prop] === "undefined") return;
            states.push({item: item, prop: prop, value: item[prop]});
        } catch (e) {}
    }

    function makeEditableAndVisible(item) {
        var states = [];
        var current = item;
        while (current && current.typename !== "Document") {
            rememberState(states, current, "locked");
            rememberState(states, current, "hidden");
            rememberState(states, current, "visible");
            try { if (typeof current.locked !== "undefined") current.locked = false; } catch (e1) {}
            try { if (typeof current.hidden !== "undefined") current.hidden = false; } catch (e2) {}
            try { if (typeof current.visible !== "undefined") current.visible = true; } catch (e3) {}
            current = current.parent;
        }
        return states;
    }

    function restoreStates(states) {
        for (var i = states.length - 1; i >= 0; i--) {
            try { states[i].item[states[i].prop] = states[i].value; } catch (e) {}
        }
    }

    function readVisibleBounds(item) {
        var states = makeEditableAndVisible(item);
        try {
            return item.visibleBounds;
        } finally {
            restoreStates(states);
        }
    }

    function unionBounds(a, b) {
        if (!a) return [b[0], b[1], b[2], b[3]];
        return [Math.min(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
    }

    function getClippingBounds(groupItem) {
        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (child.clipping) return readVisibleBounds(child);
            if (child.typename === "GroupItem") {
                var nested = getClippingBounds(child);
                if (nested) return nested;
            }
        }
        return null;
    }

    function getGroupContentBounds(groupItem) {
        var groupBounds = null;
        for (var i = 0; i < groupItem.pageItems.length; i++) {
            groupBounds = unionBounds(groupBounds, getItemBounds(groupItem.pageItems[i]));
        }
        return groupBounds;
    }

    function getItemBounds(item) {
        if (!item || item.guides) return null;
        var states = makeEditableAndVisible(item);
        try {
            if (item.typename === "GroupItem" && item.clipped) {
                return getClippingBounds(item) || item.visibleBounds;
            }
            if (item.typename === "GroupItem") {
                return getGroupContentBounds(item) || item.visibleBounds;
            }
            return item.visibleBounds;
        } catch (e) {
            return null;
        } finally {
            restoreStates(states);
        }
    }

    function makeBlack() {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = 100;
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = 0;
        rgb.green = 0;
        rgb.blue = 0;
        return rgb;
    }
})();
