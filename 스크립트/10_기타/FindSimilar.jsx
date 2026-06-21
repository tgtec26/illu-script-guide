/*
  FindSimilar.jsx
  기능: 선택한 기준 개체와 비슷한 개체를 조건별로 찾아 선택합니다.
*/

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var initialSelection = doc.selection;

    if (!initialSelection || initialSelection.length < 1) {
        alert("기준 개체를 1개 선택한 뒤 실행하세요.");
        return;
    }

    var referenceItem = initialSelection[0];

    var win = new Window("dialog", "Find Similar");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.margins = 16;

    var scopePanel = win.add("panel", undefined, "검색 범위");
    scopePanel.orientation = "column";
    scopePanel.alignChildren = "left";
    scopePanel.margins = 12;
    var rbDoc = scopePanel.add("radiobutton", undefined, "문서 전체");
    var rbSelection = scopePanel.add("radiobutton", undefined, "현재 선택 안");
    rbDoc.value = true;

    var conditionPanel = win.add("panel", undefined, "조건");
    conditionPanel.orientation = "column";
    conditionPanel.alignChildren = "left";
    conditionPanel.margins = 12;

    var row1 = conditionPanel.add("group");
    row1.orientation = "row";
    var chkGeometry = row1.add("checkbox", undefined, "Geometry");
    var chkObjectType = row1.add("checkbox", undefined, "Object Type");
    var chkSize = row1.add("checkbox", undefined, "Size");

    var row2 = conditionPanel.add("group");
    row2.orientation = "row";
    var chkFill = row2.add("checkbox", undefined, "Fill");
    var chkStroke = row2.add("checkbox", undefined, "Stroke");
    var chkStrokeWidth = row2.add("checkbox", undefined, "Stroke Width");
    var chkOpacity = row2.add("checkbox", undefined, "Opacity");

    chkGeometry.value = true;
    chkObjectType.value = true;
    chkFill.value = true;
    chkStroke.value = true;
    chkStrokeWidth.value = true;
    chkSize.value = true;
    chkOpacity.value = false;

    var geoPanel = win.add("panel", undefined, "Geometry 옵션");
    geoPanel.orientation = "column";
    geoPanel.alignChildren = "left";
    geoPanel.margins = 12;

    var geoRow1 = geoPanel.add("group");
    geoRow1.orientation = "row";
    var chkScaleAllowed = geoRow1.add("checkbox", undefined, "Scale allowed");
    var chkRotationAllowed = geoRow1.add("checkbox", undefined, "Rotation allowed");
    var chkMirrorAllowed = geoRow1.add("checkbox", undefined, "Mirror allowed");

    chkScaleAllowed.value = false;
    chkRotationAllowed.value = false;
    chkMirrorAllowed.value = false;

    var tolRow = geoPanel.add("group");
    tolRow.orientation = "row";
    tolRow.add("statictext", undefined, "Tolerance:");
    var inputTolerance = tolRow.add("edittext", undefined, "0.5");
    inputTolerance.characters = 6;
    tolRow.add("statictext", undefined, "pt / color");

    var btns = win.add("group");
    btns.alignment = "center";
    btns.add("button", undefined, "찾기", { name: "ok" });
    btns.add("button", undefined, "취소", { name: "cancel" });

    if (win.show() !== 1) return;

    var tolerance = parseFloat(inputTolerance.text);
    if (isNaN(tolerance) || tolerance < 0) tolerance = 0.5;

    var options = {
        geometry: chkGeometry.value,
        objectType: chkObjectType.value,
        fill: chkFill.value,
        stroke: chkStroke.value,
        strokeWidth: chkStrokeWidth.value,
        size: chkSize.value,
        opacity: chkOpacity.value,
        scaleAllowed: chkScaleAllowed.value,
        rotationAllowed: chkRotationAllowed.value,
        mirrorAllowed: chkMirrorAllowed.value,
        tolerance: tolerance
    };

    var candidates = rbSelection.value ? selectionCandidates(initialSelection, referenceItem) : documentCandidates(doc, referenceItem);
    var matches = [];

    for (var i = 0; i < candidates.length; i++) {
        try {
            if (itemMatches(referenceItem, candidates[i], options)) {
                matches.push(candidates[i]);
            }
        } catch (e) {}
    }

    doc.selection = null;
    for (var m = 0; m < matches.length; m++) {
        try {
            matches[m].selected = true;
        } catch (e2) {}
    }

    alert("완료: " + matches.length + "개를 찾았습니다.");

    function selectionCandidates(selectionItems, refItem) {
        var result = [];
        for (var i = 0; i < selectionItems.length; i++) {
            if (selectionItems[i] !== refItem && isUsableItem(selectionItems[i])) {
                result.push(selectionItems[i]);
            }
        }
        return result;
    }

    function documentCandidates(document, refItem) {
        var result = [];
        for (var i = 0; i < document.pageItems.length; i++) {
            var item = document.pageItems[i];
            if (item === refItem) continue;
            if (!isTopLevelItem(item)) continue;
            if (!isUsableItem(item)) continue;
            result.push(item);
        }
        return result;
    }

    function isTopLevelItem(item) {
        return item.parent && item.parent.typename !== "GroupItem" && item.parent.typename !== "CompoundPathItem";
    }

    function isUsableItem(item) {
        if (!item || item.guides) return false;
        var current = item;
        while (current && current.typename !== "Document") {
            if (current.locked || current.hidden || current.visible === false) return false;
            current = current.parent;
        }
        return true;
    }

    function itemMatches(refItem, testItem, opts) {
        if (opts.objectType && refItem.typename !== testItem.typename) return false;
        if (opts.size && !sizeMatches(refItem, testItem, opts.tolerance)) return false;
        if (opts.opacity && Math.abs(refItem.opacity - testItem.opacity) > opts.tolerance) return false;
        if (opts.fill && !styleListMatches(getFillList(refItem), getFillList(testItem), opts.tolerance)) return false;
        if (opts.stroke && !styleListMatches(getStrokeList(refItem), getStrokeList(testItem), opts.tolerance)) return false;
        if (opts.strokeWidth && !strokeWidthListMatches(getStrokeWidthList(refItem), getStrokeWidthList(testItem), opts.tolerance)) return false;
        if (opts.geometry && !geometryMatches(refItem, testItem, opts)) return false;
        return true;
    }

    function sizeMatches(a, b, tol) {
        var ab = safeBounds(a);
        var bb = safeBounds(b);
        if (!ab || !bb) return false;
        var aw = Math.abs(ab[2] - ab[0]);
        var ah = Math.abs(ab[1] - ab[3]);
        var bw = Math.abs(bb[2] - bb[0]);
        var bh = Math.abs(bb[1] - bb[3]);
        return Math.abs(aw - bw) <= tol && Math.abs(ah - bh) <= tol;
    }

    function safeBounds(item) {
        try {
            return item.geometricBounds;
        } catch (e) {
            try {
                return item.visibleBounds;
            } catch (e2) {
                return null;
            }
        }
    }

    function getFillList(item) {
        return getStyleList(item, "fill");
    }

    function getStrokeList(item) {
        return getStyleList(item, "stroke");
    }

    function getStrokeWidthList(item) {
        var paths = collectPathItems(item);
        var result = [];
        for (var i = 0; i < paths.length; i++) {
            if (paths[i].stroked) result.push(paths[i].strokeWidth);
            else result.push(0);
        }
        return result.sort(numericSort);
    }

    function getStyleList(item, mode) {
        var paths = collectPathItems(item);
        var result = [];
        for (var i = 0; i < paths.length; i++) {
            if (mode === "fill") {
                result.push(paths[i].filled ? colorKey(paths[i].fillColor) : "NoFill");
            } else {
                result.push(paths[i].stroked ? colorKey(paths[i].strokeColor) : "NoStroke");
            }
        }
        return result.sort();
    }

    function collectPathItems(item) {
        var result = [];
        collectPathItemsInto(item, result);
        return result;
    }

    function collectPathItemsInto(item, result) {
        if (!item) return;
        if (item.typename === "PathItem") {
            if (!item.guides && !item.clipping) result.push(item);
            return;
        }
        if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) {
                if (!item.pathItems[i].guides && !item.pathItems[i].clipping) result.push(item.pathItems[i]);
            }
            return;
        }
        if (item.typename === "GroupItem") {
            for (var g = 0; g < item.pageItems.length; g++) {
                collectPathItemsInto(item.pageItems[g], result);
            }
            return;
        }
        if (item.typename === "TextFrame") {
            var temp = null;
            var outline = null;
            try {
                temp = item.duplicate();
                outline = temp.createOutline();
                collectPathItemsInto(outline, result);
            } catch (e) {
            } finally {
                try {
                    if (outline) outline.remove();
                    if (temp) temp.remove();
                } catch (removeError) {}
            }
        }
    }

    function colorKey(color) {
        if (!color) return "None";
        try {
            if (color.typename === "RGBColor") {
                return "RGB:" + round(color.red, 2) + "," + round(color.green, 2) + "," + round(color.blue, 2);
            }
            if (color.typename === "CMYKColor") {
                return "CMYK:" + round(color.cyan, 2) + "," + round(color.magenta, 2) + "," + round(color.yellow, 2) + "," + round(color.black, 2);
            }
            if (color.typename === "GrayColor") {
                return "Gray:" + round(color.gray, 2);
            }
            if (color.typename === "NoColor") {
                return "NoColor";
            }
            return color.typename;
        } catch (e) {
            return "Unknown";
        }
    }

    function styleListMatches(a, b, tol) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (!colorsMatch(a[i], b[i], tol)) return false;
        }
        return true;
    }

    function colorsMatch(a, b, tol) {
        if (a === b) return true;
        var pa = parseColorKey(a);
        var pb = parseColorKey(b);
        if (!pa || !pb || pa.type !== pb.type || pa.values.length !== pb.values.length) return false;
        for (var i = 0; i < pa.values.length; i++) {
            if (Math.abs(pa.values[i] - pb.values[i]) > tol) return false;
        }
        return true;
    }

    function parseColorKey(key) {
        var parts = String(key).split(":");
        if (parts.length !== 2) return null;
        var nums = parts[1].split(",");
        var values = [];
        for (var i = 0; i < nums.length; i++) {
            var n = parseFloat(nums[i]);
            if (isNaN(n)) return null;
            values.push(n);
        }
        return { type: parts[0], values: values };
    }

    function strokeWidthListMatches(a, b, tol) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (Math.abs(a[i] - b[i]) > tol) return false;
        }
        return true;
    }

    function geometryMatches(refItem, testItem, opts) {
        var refGeometry = geometrySignature(refItem, opts);
        var testGeometry = geometrySignature(testItem, opts);
        if (refGeometry.length !== testGeometry.length) return false;

        refGeometry.sort(signatureSort);
        testGeometry.sort(signatureSort);

        for (var i = 0; i < refGeometry.length; i++) {
            if (!pathSignatureMatches(refGeometry[i], testGeometry[i], opts)) return false;
        }
        return true;
    }

    function geometrySignature(item, opts) {
        var paths = collectPathItems(item);
        var result = [];
        for (var i = 0; i < paths.length; i++) {
            result.push(pathSignature(paths[i], opts));
        }
        return result;
    }

    function pathSignature(pathItem, opts) {
        var points = [];
        for (var i = 0; i < pathItem.pathPoints.length; i++) {
            var p = pathItem.pathPoints[i];
            points.push([p.anchor[0], p.anchor[1]]);
        }

        var normalized = normalizePoints(points, opts);
        return {
            closed: pathItem.closed,
            count: points.length,
            points: normalized
        };
    }

    function normalizePoints(points, opts) {
        if (!points.length) return [];

        var cx = 0;
        var cy = 0;
        for (var i = 0; i < points.length; i++) {
            cx += points[i][0];
            cy += points[i][1];
        }
        cx /= points.length;
        cy /= points.length;

        var shifted = [];
        var maxX = 0;
        var maxY = 0;
        for (var j = 0; j < points.length; j++) {
            var x = points[j][0] - cx;
            var y = points[j][1] - cy;
            shifted.push([x, y]);
            maxX = Math.max(maxX, Math.abs(x));
            maxY = Math.max(maxY, Math.abs(y));
        }

        if (opts.rotationAllowed && shifted.length) {
            var first = firstNonZeroPoint(shifted);
            var angle = Math.atan2(first[1], first[0]);
            shifted = rotatePoints(shifted, -angle);
        }

        var scaleX = opts.scaleAllowed ? (maxX || 1) : 1;
        var scaleY = opts.scaleAllowed ? (maxY || 1) : 1;
        var normalized = [];
        for (var k = 0; k < shifted.length; k++) {
            normalized.push([shifted[k][0] / scaleX, shifted[k][1] / scaleY]);
        }
        return normalized;
    }

    function firstNonZeroPoint(points) {
        for (var i = 0; i < points.length; i++) {
            if (Math.abs(points[i][0]) > 0.0001 || Math.abs(points[i][1]) > 0.0001) return points[i];
        }
        return [1, 0];
    }

    function rotatePoints(points, angle) {
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        var result = [];
        for (var i = 0; i < points.length; i++) {
            var x = points[i][0];
            var y = points[i][1];
            result.push([x * cos - y * sin, x * sin + y * cos]);
        }
        return result;
    }

    function pathSignatureMatches(a, b, opts) {
        if (a.closed !== b.closed || a.count !== b.count) return false;
        if (pointListMatches(a.points, b.points, opts.tolerance)) return true;
        if (opts.mirrorAllowed) {
            var mirrored = [];
            for (var i = 0; i < b.points.length; i++) {
                mirrored.push([-b.points[i][0], b.points[i][1]]);
            }
            return pointListMatches(a.points, mirrored, opts.tolerance);
        }
        return false;
    }

    function pointListMatches(a, b, tol) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
            if (Math.abs(a[i][0] - b[i][0]) > tol || Math.abs(a[i][1] - b[i][1]) > tol) {
                return false;
            }
        }
        return true;
    }

    function round(value, digits) {
        var m = Math.pow(10, digits);
        return Math.round(value * m) / m;
    }

    function numericSort(a, b) {
        return a - b;
    }

    function signatureSort(a, b) {
        if (a.count !== b.count) return a.count - b.count;
        if (a.closed !== b.closed) return a.closed ? -1 : 1;
        return 0;
    }
})();
