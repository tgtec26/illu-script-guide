/*
  Illustrator Script: Crop Clipping Masks To Visible Area
  기능: 선택한 클리핑 마스크 그룹에서 가려진 부분을 실제로 삭제하고,
        클리핑된 보이는 부분만 남깁니다.

  Based on TrimMasks.jsx by Sergey Osokin.
  원본 방식처럼 임시 액션으로 Pathfinder > Crop을 호출합니다.
*/

//@target illustrator

(function () {
    var ACTION_SET = "Codex-Trim-Mask";
    var ACTION_NAME = "Trim-Mask";
    var SAVE_MASK = true;
    var MODE_OUTLINE_LINES = 1;
    var MODE_RELEASE_LINES = 2;
    var MODE_CLIP_LIVE_LINES = 3;

    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }

    if (parseInt(app.version, 10) < 16) {
        alert("이 스크립트는 Illustrator CS6 이상에서만 사용할 수 있습니다.");
        return;
    }

    var doc = app.activeDocument;
    var oldInteraction = app.userInteractionLevel;
    var oldScreenMode = doc.views[0].screenMode;

    if (!doc.selection || doc.selection.length === 0 || doc.selection.typename === "TextRange") {
        alert("클리핑 마스크로 잘라낼 객체를 선택해주세요.");
        return;
    }

    var targets = collectClippedGroupsFromSelection(doc.selection);
    if (targets.length === 0) {
        alert("선택 항목에서 클리핑 마스크 그룹을 찾지 못했습니다.");
        return;
    }

    var mode = showOptionsDialog();
    if (!mode) {
        return;
    }

    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {
        createCropAction(ACTION_SET, ACTION_NAME);

        targets.sort(function (a, b) {
            return getDepth(b) - getDepth(a);
        });

        if (targets.length > 10) {
            doc.views[0].screenMode = ScreenMode.FULLSCREEN;
        }

        var attr = {
            mOpacity: 100,
            mBlending: BlendModes.NORMAL
        };
        var doneCount = 0;
        var skipCount = 0;
        var failCount = 0;

        for (var i = 0; i < targets.length; i++) {
            deselect();
            try {
                if (!isUsableClippedGroup(targets[i])) {
                    skipCount++;
                    continue;
                }

                fixFillRule(targets[i]);
                trim(targets[i], attr, SAVE_MASK, ACTION_SET, ACTION_NAME, mode);
                doneCount++;
            } catch (e) {
                failCount++;
            }
        }

        deselect();

        var msg = "완료: " + doneCount + "개의 클리핑 마스크를 보이는 부분만 남기도록 잘랐습니다.";
        if (skipCount > 0) msg += "\n건너뜀: " + skipCount + "개 (잠김/숨김/처리 불가)";
        if (failCount > 0) msg += "\n실패: " + failCount + "개";
        msg += "\n\n※ 결과가 이상하면 실행 직후 Ctrl+Z로 되돌릴 수 있습니다.";
        alert(msg);
    } catch (e2) {
        alert("오류가 발생했습니다.\n" + e2);
    } finally {
        try {
            app.unloadAction(ACTION_SET, "");
        } catch (e3) {}
        try {
            doc.views[0].screenMode = oldScreenMode;
        } catch (e4) {}
        app.userInteractionLevel = oldInteraction;
    }

    function createCropAction(actionSet, actionName) {
        var actionStr = [
            "   /version 3",
            "/name [" + actionSet.length + " " + ascii2Hex(actionSet) + "]",
            "/actionCount 1",
            "/action-1 {",
            "/name [" + actionName.length + " " + ascii2Hex(actionName) + "]",
            "  /keyIndex 0",
            "  /colorIndex 0",
            "  /isOpen 1",
            "  /eventCount 1",
            "  /event-1 {",
            "    /useRulersIn1stQuadrant 0",
            "    /internalName (ai_plugin_pathfinder)",
            "    /localizedName [ 10",
            "      5061746866696e646572",
            "    ]",
            "   /isOpen 0",
            "    /isOn 1",
            "    /hasDialog 0",
            "    /parameterCount 1",
            "    /parameter-1 {",
            "      /key 1851878757",
            "      /showInPalette 4294967295",
            "      /type (enumerated)",
            "      /name [ 4",
            "        43726f70",
            "      ]",
            "      /value 9",
            "    }",
            "  }",
            "}"
        ].join("\n");

        var actionFile = new File(Folder.temp + "/" + actionSet + ".aia");
        actionFile.open("w");
        actionFile.write(actionStr);
        actionFile.close();
        app.loadAction(actionFile);
        actionFile.remove();
    }

    function ascii2Hex(str) {
        return str.replace(/./g, function (ch) {
            return ch.charCodeAt(0).toString(16);
        });
    }

    function collectClippedGroupsFromSelection(selection) {
        var result = [];

        for (var i = 0; i < selection.length; i++) {
            collectAncestorClippedGroups(selection[i], result);
            collectDescendantClippedGroups(selection[i], result);
        }

        return result;
    }

    function collectAncestorClippedGroups(item, result) {
        var current = item;
        while (current && current.typename !== "Document") {
            if (isClippedGroup(current)) {
                addUnique(result, current);
            }
            current = current.parent;
        }
    }

    function collectDescendantClippedGroups(item, result) {
        if (isClippedGroup(item)) {
            addUnique(result, item);
        }

        if (!item.pageItems) {
            return;
        }

        for (var i = 0; i < item.pageItems.length; i++) {
            collectDescendantClippedGroups(item.pageItems[i], result);
        }
    }

    function addUnique(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return;
        }
        arr.push(item);
    }

    function isGroup(item) {
        return item && item.typename === "GroupItem";
    }

    function isClippedGroup(item) {
        try {
            return isGroup(item) && item.clipped;
        } catch (e) {
            return false;
        }
    }

    function isUsableClippedGroup(group) {
        if (!isClippedGroup(group)) {
            return false;
        }

        if (group.locked || group.hidden) {
            return false;
        }

        var parent = group.parent;
        while (parent && parent.typename !== "Document") {
            if (parent.typename === "Layer") {
                if (parent.locked || !parent.visible) return false;
            } else {
                if (parent.locked || parent.hidden) return false;
            }
            parent = parent.parent;
        }

        return true;
    }

    function showOptionsDialog() {
        var win = new Window("dialog", "클리핑 마스크 자르기");
        win.orientation = "column";
        win.alignChildren = "fill";
        win.margins = 15;

        var panel = win.add("panel", undefined, "처리 방식");
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.margins = [12, 18, 12, 12];

        var optOutline = panel.add("radiobutton", undefined, "1. 선을 윤곽선화해서 함께 Crop");
        var optRelease = panel.add("radiobutton", undefined, "2. 선은 클리핑에서 빼고, 면만 Crop");
        var optClipLive = panel.add("radiobutton", undefined, "3. 사각 마스크 기준으로 선을 live 상태로 잘라내고, 면은 Crop");
        optOutline.value = true;

        var note = win.add("statictext", undefined, "3번은 사각형 클리핑 마스크와 직선 구간 중심의 라인에 맞춘 옵션입니다.", { multiline: true });
        note.preferredSize.width = 430;

        var buttons = win.add("group");
        buttons.alignment = "right";
        var cancel = buttons.add("button", undefined, "취소", { name: "cancel" });
        var ok = buttons.add("button", undefined, "실행", { name: "ok" });

        var result = 0;
        ok.onClick = function () {
            if (optClipLive.value) {
                result = MODE_CLIP_LIVE_LINES;
            } else if (optRelease.value) {
                result = MODE_RELEASE_LINES;
            } else {
                result = MODE_OUTLINE_LINES;
            }
            win.close();
        };
        cancel.onClick = function () {
            result = 0;
            win.close();
        };

        win.show();
        return result;
    }

    function trim(item, attr, isSaveMask, actionSet, actionName, mode) {
        if (item.opacity < 100) attr.mOpacity = item.opacity;
        if (item.blendingMode !== BlendModes.NORMAL) attr.mBlending = item.blendingMode;

        if (mode === MODE_OUTLINE_LINES) {
            outlineOpenStrokes(item);
        } else if (mode === MODE_RELEASE_LINES) {
            releaseOpenStrokes(item);
        } else if (mode === MODE_CLIP_LIVE_LINES) {
            clipOpenStrokesToMaskRect(item);
        }

        outlineText(item);

        item.selected = true;
        compoundPathsNormalize(selection);

        if (isSaveMask) {
            duplicateMask(item, attr.mOpacity, attr.mBlending);
        }

        item.selected = true;
        if (isSaveMask && selection.length > 0) {
            selection = selection[0];
        }

        app.doScript(actionName, actionSet);

        if (selection.length > 0) {
            if (attr.mOpacity < 100) selection[0].opacity = attr.mOpacity;
            if (attr.mBlending !== BlendModes.NORMAL) selection[0].blendingMode = attr.mBlending;
        }

        attr.mOpacity = 100;
        attr.mBlending = BlendModes.NORMAL;
    }

    function outlineText(group) {
        try {
            for (var i = 0; i < group.pageItems.length; i++) {
                var currItem = group.pageItems[i];

                if (currItem.typename === "TextFrame") {
                    var textColor = currItem.textRange.fillColor;
                    currItem.selected = true;
                    app.executeMenuCommand("outline");

                    for (var j = 0; j < selection.length; j++) {
                        if (selection[j].typename === "PathItem") {
                            selection[j].fillColor = textColor;
                        }

                        if (selection[j].typename === "CompoundPathItem") {
                            if (selection[j].pathItems.length === 0) {
                                var tempPath = selection[j].pathItems.add();
                            }
                            selection[j].pathItems[0].fillColor = textColor;
                            if (tempPath) tempPath.remove();
                        }
                    }
                    deselect();
                }

                if (isGroup(currItem)) {
                    outlineText(currItem);
                }
            }
        } catch (e) {}
    }

    function outlineOpenStrokes(group) {
        try {
            var strokes = [];
            collectOpenStrokes(group, strokes);

            if (strokes.length === 0) {
                return;
            }

            deselect();
            for (var i = 0; i < strokes.length; i++) {
                strokes[i].selected = true;
            }
            app.executeMenuCommand("outline");
            deselect();
        } catch (e) {}
    }

    function releaseOpenStrokes(group) {
        try {
            var strokes = [];
            collectOpenStrokes(group, strokes);

            for (var i = 0; i < strokes.length; i++) {
                try {
                    strokes[i].move(group, ElementPlacement.PLACEBEFORE);
                } catch (e) {}
            }

            redraw();
        } catch (e2) {}
    }

    function clipOpenStrokesToMaskRect(group) {
        var rect = getMaskRect(group);
        if (!rect) {
            releaseOpenStrokes(group);
            return;
        }

        var strokes = [];
        collectOpenStrokes(group, strokes);

        for (var i = 0; i < strokes.length; i++) {
            try {
                clipOneStrokeToRect(strokes[i], rect, group);
            } catch (e) {}
        }

        redraw();
    }

    function getMaskRect(group) {
        var mask = findClippingPath(group);
        if (!mask) {
            return null;
        }

        var b = mask.geometricBounds;
        return {
            left: Math.min(b[0], b[2]),
            right: Math.max(b[0], b[2]),
            bottom: Math.min(b[1], b[3]),
            top: Math.max(b[1], b[3])
        };
    }

    function findClippingPath(item) {
        if (item.typename === "PathItem") {
            try {
                if (item.clipping) return item;
            } catch (e) {}
            return null;
        }

        if (item.typename === "CompoundPathItem") {
            try {
                for (var i = 0; i < item.pathItems.length; i++) {
                    if (item.pathItems[i].clipping) return item;
                }
            } catch (e2) {}
            return null;
        }

        if (!item.pageItems) {
            return null;
        }

        for (var j = 0; j < item.pageItems.length; j++) {
            var found = findClippingPath(item.pageItems[j]);
            if (found) return found;
        }

        return null;
    }

    function clipOneStrokeToRect(pathItem, rect, clipGroup) {
        if (!pathItem.pathPoints || pathItem.pathPoints.length < 2) {
            return;
        }

        var segments = [];
        var current = [];

        var segmentCount = pathItem.closed ? pathItem.pathPoints.length : pathItem.pathPoints.length - 1;

        for (var i = 0; i < segmentCount; i++) {
            var p1 = pathItem.pathPoints[i].anchor;
            var p2 = pathItem.pathPoints[(i + 1) % pathItem.pathPoints.length].anchor;
            var clipped = clipSegmentToRect(p1[0], p1[1], p2[0], p2[1], rect);

            if (!clipped) {
                if (current.length > 1) {
                    segments.push(current);
                }
                current = [];
                continue;
            }

            var a = [clipped.x1, clipped.y1];
            var b = [clipped.x2, clipped.y2];

            if (current.length === 0) {
                current.push(a);
                current.push(b);
            } else if (samePoint(current[current.length - 1], a)) {
                current.push(b);
            } else {
                if (current.length > 1) {
                    segments.push(current);
                }
                current = [a, b];
            }
        }

        if (current.length > 1) {
            segments.push(current);
        }

        for (var j = 0; j < segments.length; j++) {
            var newPath = clipGroup.parent.pathItems.add();
            newPath.setEntirePath(segments[j]);
            copyStrokeStyle(pathItem, newPath);
            newPath.move(clipGroup, ElementPlacement.PLACEBEFORE);
        }

        pathItem.remove();
    }

    function clipSegmentToRect(x1, y1, x2, y2, rect) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var t0 = 0;
        var t1 = 1;

        var checks = [
            [-dx, x1 - rect.left],
            [dx, rect.right - x1],
            [-dy, y1 - rect.bottom],
            [dy, rect.top - y1]
        ];

        for (var i = 0; i < checks.length; i++) {
            var p = checks[i][0];
            var q = checks[i][1];

            if (Math.abs(p) < 0.000001) {
                if (q < 0) return null;
            } else {
                var r = q / p;
                if (p < 0) {
                    if (r > t1) return null;
                    if (r > t0) t0 = r;
                } else {
                    if (r < t0) return null;
                    if (r < t1) t1 = r;
                }
            }
        }

        return {
            x1: x1 + t0 * dx,
            y1: y1 + t0 * dy,
            x2: x1 + t1 * dx,
            y2: y1 + t1 * dy
        };
    }

    function samePoint(a, b) {
        return Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001;
    }

    function copyStrokeStyle(src, dst) {
        dst.filled = false;
        dst.stroked = true;

        try { dst.strokeColor = src.strokeColor; } catch (e) {}
        try { dst.strokeWidth = src.strokeWidth; } catch (e2) {}
        try { dst.strokeCap = src.strokeCap; } catch (e3) {}
        try { dst.strokeJoin = src.strokeJoin; } catch (e4) {}
        try { dst.strokeMiterLimit = src.strokeMiterLimit; } catch (e5) {}
        try { dst.strokeDashes = src.strokeDashes; } catch (e6) {}
        try { dst.strokeDashOffset = src.strokeDashOffset; } catch (e7) {}
        try { dst.opacity = src.opacity; } catch (e8) {}
        try { dst.blendingMode = src.blendingMode; } catch (e9) {}
        try { dst.name = src.name; } catch (e10) {}
    }

    function collectOpenStrokes(item, result) {
        if (item.typename === "PathItem") {
            try {
                if (!item.clipping && item.stroked && item.strokeWidth > 0 &&
                    (!item.closed || !item.filled)) {
                    result.push(item);
                }
            } catch (e) {}
            return;
        }

        if (!item.pageItems) {
            return;
        }

        for (var i = 0; i < item.pageItems.length; i++) {
            collectOpenStrokes(item.pageItems[i], result);
        }
    }

    function ungroup(items) {
        for (var i = 0; i < items.length; i++) {
            if (isGroup(items[i])) {
                var j = items[i].pageItems.length;
                while (j--) {
                    items[i].pageItems[0].locked = false;
                    items[i].pageItems[0].hidden = false;
                    items[i].pageItems[0].moveBefore(items[i]);
                }
                items[i].remove();
            }
        }
    }

    function compoundPathFix(item) {
        selection = [item];
        app.executeMenuCommand("noCompoundPath");
        ungroup(selection);
        app.executeMenuCommand("compoundPath");
        deselect();
    }

    function compoundPathsNormalize(items) {
        var i = items.length;
        while (i--) {
            if (isGroup(items[i])) {
                compoundPathsNormalize(items[i].pageItems);
            } else if (items[i].typename === "CompoundPathItem") {
                compoundPathFix(items[i]);
            }
        }
    }

    function duplicateMask(group, opacity, blending) {
        try {
            for (var i = 0; i < group.pageItems.length; i++) {
                var currItem = group.pageItems[i];
                var itemType = currItem.typename;
                var zeroPath = itemType === "CompoundPathItem" ? currItem.pathItems[0] : currItem;

                if ((itemType === "PathItem" || itemType === "CompoundPathItem") &&
                    zeroPath.clipping) {
                    var maskClone = currItem.duplicate(group, ElementPlacement.PLACEAFTER);
                    clearClippingFlag(maskClone);
                    if (opacity < 100) maskClone.opacity = opacity;
                    if (blending !== BlendModes.NORMAL) maskClone.blendingMode = blending;
                }
            }
            redraw();
        } catch (e) {}
    }

    function clearClippingFlag(item) {
        try {
            if (item.typename === "PathItem") {
                item.clipping = false;
                return;
            }

            if (item.typename === "CompoundPathItem") {
                for (var i = 0; i < item.pathItems.length; i++) {
                    item.pathItems[i].clipping = false;
                }
            }
        } catch (e) {}
    }

    function fixFillRule(item) {
        for (var i = 0; i < item.pageItems.length; i++) {
            var currItem = item.pageItems[i];

            if (isGroup(currItem)) {
                fixFillRule(currItem);
            } else {
                if (currItem.typename === "CompoundPathItem" && currItem.pathItems.length > 0) {
                    currItem = currItem.pathItems[0];
                }
                try {
                    currItem.evenodd = false;
                } catch (e) {}
            }
        }
    }

    function deselect() {
        selection = null;
        redraw();
    }

    function getDepth(item) {
        var depth = 0;
        var current = item;
        while (current && current.parent && current.parent.typename !== "Document") {
            depth++;
            current = current.parent;
        }
        return depth;
    }
})();
