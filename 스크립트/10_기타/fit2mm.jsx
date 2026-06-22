/*
  fit2mm.jsx
  기능: 선택한 에셋(선택이 없으면 현재 대지 위 에셋)에 맞춰 현재 대지를 2mm 여백으로 조정합니다.
*/

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }

    var MM_TO_PT = 2.834645669;
    var MARGIN = 2 * MM_TO_PT;
    var doc = app.activeDocument;
    var activeArtboardIndex = doc.artboards.getActiveArtboardIndex();
    var artboard = doc.artboards[activeArtboardIndex];
    var artboardRect = artboard.artboardRect; // [left, top, right, bottom]
    var items = [];
    var bounds = null;

    function rememberState(states, item, prop) {
        try {
            if (typeof item[prop] === "undefined") return;
            states.push({
                item: item,
                prop: prop,
                value: item[prop]
            });
        } catch (e) {}
    }

    function makeEditableAndVisible(item) {
        var states = [];
        var current = item;

        while (current && current.typename !== "Document") {
            rememberState(states, current, "locked");
            rememberState(states, current, "hidden");
            rememberState(states, current, "visible");

            try {
                if (typeof current.locked !== "undefined") current.locked = false;
            } catch (e1) {}

            try {
                if (typeof current.hidden !== "undefined") current.hidden = false;
            } catch (e2) {}

            try {
                if (typeof current.visible !== "undefined") current.visible = true;
            } catch (e3) {}

            current = current.parent;
        }

        return states;
    }

    function restoreStates(states) {
        for (var i = states.length - 1; i >= 0; i--) {
            try {
                states[i].item[states[i].prop] = states[i].value;
            } catch (e) {}
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

    function rectsOverlap(a, b) {
        return !(a[2] < b[0] || a[0] > b[2] || a[3] > b[1] || a[1] < b[3]);
    }

    function unionBounds(a, b) {
        if (!a) return [b[0], b[1], b[2], b[3]];
        return [
            Math.min(a[0], b[0]),
            Math.max(a[1], b[1]),
            Math.max(a[2], b[2]),
            Math.min(a[3], b[3])
        ];
    }

    function getClippingBounds(groupItem) {
        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (child.clipping) {
                return readVisibleBounds(child);
            }
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

    function addItemBounds(item, requireArtboardOverlap) {
        var itemBounds = getItemBounds(item);
        if (!itemBounds) return;
        if (requireArtboardOverlap && !rectsOverlap(itemBounds, artboardRect)) return;

        bounds = unionBounds(bounds, itemBounds);
    }

    if (doc.selection.length > 0) {
        items = doc.selection;
        for (var s = 0; s < items.length; s++) {
            addItemBounds(items[s], false);
        }
    } else {
        for (var i = 0; i < doc.pageItems.length; i++) {
            if (doc.pageItems[i].parent.typename === "GroupItem" ||
                doc.pageItems[i].parent.typename === "CompoundPathItem") {
                continue;
            }
            addItemBounds(doc.pageItems[i], true);
        }
    }

    if (!bounds) {
        alert("대지에 맞출 에셋을 찾지 못했습니다.");
        return;
    }

    artboard.artboardRect = [
        bounds[0] - MARGIN,
        bounds[1] + MARGIN,
        bounds[2] + MARGIN,
        bounds[3] - MARGIN
    ];

    app.redraw();
})();
