// 파선 오프셋 미세 조정 스크립트 v3
(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    if (doc.selection.length === 0) {
        alert("파선 객체를 선택해주세요.");
        return;
    }

    var targets = [];
    collectDashedPaths(doc.selection, targets);

    if (targets.length === 0) {
        alert("점선이 적용된 선 객체를 선택해주세요.");
        return;
    }

    for (var i = 0; i < targets.length; i++) {
        disableDashCornerAlignment(targets[i].item);
    }

    var pendingOffset = targets[0].originalOffset;
    var isApplied = true;

    var dlg = new Window("dialog", "파선 패턴 이동");
    dlg.alignChildren = "fill";

    var infoPanel = dlg.add("panel", undefined, "현재 설정");
    infoPanel.alignChildren = "left";

    var currentDashText = infoPanel.add("statictext", undefined, "점선: -");
    var currentGapText = infoPanel.add("statictext", undefined, "간격: -");
    var currentOffsetText = infoPanel.add("statictext", undefined, "오프셋: 0 pt");
    var targetCountText = infoPanel.add("statictext", undefined, "대상: " + targets.length + "개");

    var controlPanel = dlg.add("panel", undefined, "조정");
    controlPanel.alignChildren = "left";

    var stepGroup = controlPanel.add("group");
    stepGroup.add("statictext", undefined, "이동 간격:");
    var stepInput = stepGroup.add("edittext", undefined, "0.5");
    stepInput.characters = 8;
    stepGroup.add("statictext", undefined, "pt");

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var btnGroup = controlPanel.add("group");
    var btnLeft = btnGroup.add("button", undefined, "◄ 왼쪽");
    var btnRight = btnGroup.add("button", undefined, "오른쪽 ►");
    var btnReset = btnGroup.add("button", undefined, "리셋");

    var closeGroup = dlg.add("group");
    closeGroup.alignment = "center";
    var cancelBtn = closeGroup.add("button", undefined, "취소", { name: "cancel" });
    var okBtn = closeGroup.add("button", undefined, "확인", { name: "ok" });

    updateInfo();
    applyPendingOffset();

    btnLeft.onClick = function() {
        shiftOffset(-getStep());
    };

    btnRight.onClick = function() {
        shiftOffset(getStep());
    };

    btnReset.onClick = function() {
        pendingOffset = 0;
        updatePreviewState();
    };

    previewCheck.onClick = function() {
        updatePreviewState();
    };

    okBtn.onClick = function() {
        applyPendingOffset();
        dlg.close(1);
    };

    cancelBtn.onClick = function() {
        restoreOriginalOffsets();
        dlg.close(0);
    };

    if (dlg.show() !== 1) {
        restoreOriginalOffsets();
    }

    function shiftOffset(delta) {
        pendingOffset += delta;
        updatePreviewState();
    }

    function updatePreviewState() {
        if (previewCheck.value) {
            applyPendingOffset();
        } else if (isApplied) {
            restoreOriginalOffsets();
        }
        updateInfo();
    }

    function applyPendingOffset() {
        for (var i = 0; i < targets.length; i++) {
            try {
                targets[i].item.strokeDashOffset = pendingOffset;
            } catch(e) {}
        }
        isApplied = true;
        app.redraw();
    }

    function restoreOriginalOffsets() {
        for (var i = 0; i < targets.length; i++) {
            try {
                targets[i].item.strokeDashOffset = targets[i].originalOffset;
            } catch(e) {}
        }
        isApplied = false;
        app.redraw();
    }

    function updateInfo() {
        var dashes = targets[0].item.strokeDashes;
        if (dashes.length >= 2) {
            currentDashText.text = "점선: " + dashes[0] + " pt";
            currentGapText.text = "간격: " + dashes[1] + " pt";
        } else {
            currentDashText.text = "점선: -";
            currentGapText.text = "간격: -";
        }
        currentOffsetText.text = "오프셋: " + pendingOffset.toFixed(2) + " pt";
        targetCountText.text = "대상: " + targets.length + "개";
    }

    function getStep() {
        var step = parseFloat(String(stepInput.text).replace(",", "."));
        return isNaN(step) ? 0.5 : step;
    }

    function collectDashedPaths(items, out) {
        for (var i = 0; i < items.length; i++) {
            collectDashedPath(items[i], out);
        }
    }

    function collectDashedPath(item, out) {
        if (!item) return;

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectDashedPath(item.pageItems[i], out);
            }
        } else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                collectDashedPath(item.pathItems[j], out);
            }
        } else if (item.typename === "PathItem" && item.stroked && item.strokeDashes.length > 0) {
            out.push({
                item: item,
                originalOffset: safeNumber(item.strokeDashOffset, 0)
            });
        }
    }

    function disableDashCornerAlignment(pathItem) {
        var originalSelection = getSelectionArray(doc);
        var actionSetName = "Codex_DashShift";
        var actionName = "DisableDashCornerAlignment";
        var actionFile = new File(Folder.temp + "/Codex_DashShift.aia");
        var dashPattern = pathItem.strokeDashes;
        var dashOffset = safeNumber(pathItem.strokeDashOffset, 0);
        var strokeStyle = captureStrokeStyle(pathItem);

        try {
            doc.selection = null;
            pathItem.selected = true;

            removeActionSetIfLoaded(actionSetName);
            writeDashCornerAlignmentOffAction(actionFile, actionSetName, actionName, strokeStyle);

            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);

            restoreDashState(pathItem, dashPattern, dashOffset);
            restoreStrokeStyle(pathItem, strokeStyle);
        } catch(e) {
            try {
                restoreDashState(pathItem, dashPattern, dashOffset);
                restoreStrokeStyle(pathItem, strokeStyle);
            } catch(restoreError) {}
        } finally {
            try {
                restoreStrokeStyle(pathItem, strokeStyle);
            } catch(finalRestoreError) {}
            removeActionSetIfLoaded(actionSetName);
            try {
                actionFile.remove();
            } catch(removeError) {}
            restoreSelection(doc, originalSelection);
        }
    }

    function restoreDashState(pathItem, dashPattern, dashOffset) {
        pathItem.strokeDashes = dashPattern;
        pathItem.strokeDashOffset = dashOffset;
    }

    function captureStrokeStyle(pathItem) {
        var style = {};
        try {
            style.strokeCapValue = pathItem.strokeCap === StrokeCap.ROUNDENDCAP ? 1 :
                (pathItem.strokeCap === StrokeCap.PROJECTINGENDCAP ? 2 : 0);
        } catch(e) {}
        try {
            style.strokeJoinValue = pathItem.strokeJoin === StrokeJoin.ROUNDENDJOIN ? 1 :
                (pathItem.strokeJoin === StrokeJoin.BEVELENDJOIN ? 2 : 0);
        } catch(e2) {}
        try { style.strokeMiterLimit = safeNumber(pathItem.strokeMiterLimit, 10); } catch(e3) {}
        return style;
    }

    function restoreStrokeStyle(pathItem, style) {
        if (!style) return;
        try {
            if (style.strokeCapValue !== undefined) {
                pathItem.strokeCap = style.strokeCapValue === 1 ? StrokeCap.ROUNDENDCAP :
                    (style.strokeCapValue === 2 ? StrokeCap.PROJECTINGENDCAP : StrokeCap.BUTTENDCAP);
            }
        } catch(e) {}
        try {
            if (style.strokeJoinValue !== undefined) {
                pathItem.strokeJoin = style.strokeJoinValue === 1 ? StrokeJoin.ROUNDENDJOIN :
                    (style.strokeJoinValue === 2 ? StrokeJoin.BEVELENDJOIN : StrokeJoin.MITERENDJOIN);
            }
        } catch(e2) {}
        try {
            if (style.strokeMiterLimit !== undefined) pathItem.strokeMiterLimit = style.strokeMiterLimit;
        } catch(e3) {}
    }

    function writeDashCornerAlignmentOffAction(actionFile, actionSetName, actionName, strokeStyle) {
        var lines = [];

        lines.push("/version 3");
        lines.push("/name [ " + actionSetName.length);
        lines.push("    " + stringToHex(actionSetName));
        lines.push("]");
        lines.push("/isOpen 1");
        lines.push("/actionCount 1");
        lines.push("/action-1 {");
        lines.push("    /name [ " + actionName.length);
        lines.push("        " + stringToHex(actionName));
        lines.push("    ]");
        lines.push("    /keyIndex 0");
        lines.push("    /colorIndex 0");
        lines.push("    /isOpen 1");
        lines.push("    /eventCount 1");
        lines.push("    /event-1 {");
        lines.push("        /useRulersIn1stQuadrant 0");
        lines.push("        /internalName (ai_plugin_setStroke)");
        lines.push("        /localizedName [ 10");
        lines.push("            536574205374726F6B65");
        lines.push("        ]");
        lines.push("        /isOpen 1");
        lines.push("        /isOn 1");
        lines.push("        /hasDialog 0");
        lines.push("        /parameterCount 4");

        addEnumeratedParameter(lines, 1, 1667330094, getStrokeCapName(strokeStyle), strokeStyle.strokeCapValue);
        addRealParameter(lines, 2, 1836344690, strokeStyle.strokeMiterLimit);
        addEnumeratedParameter(lines, 3, 1785686382, getStrokeJoinName(strokeStyle), strokeStyle.strokeJoinValue);
        addBooleanParameter(lines, 4, 1684104298, 0);

        lines.push("    }");
        lines.push("}");

        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
    }

    function getStrokeCapName(style) {
        return style.strokeCapValue === 1 ? "Round Cap" :
            (style.strokeCapValue === 2 ? "Projecting Cap" : "Butt Cap");
    }

    function getStrokeJoinName(style) {
        return style.strokeJoinValue === 1 ? "Round Join" :
            (style.strokeJoinValue === 2 ? "Bevel Join" : "Miter Join");
    }

    function addRealParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (real)");
        lines.push("            /value " + safeNumber(value, 10));
        lines.push("        }");
    }

    function addEnumeratedParameter(lines, index, key, name, value) {
        value = value === undefined ? 0 : value;
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (enumerated)");
        lines.push("            /name [ " + name.length);
        lines.push("                " + stringToHex(name));
        lines.push("            ]");
        lines.push("            /value " + value);
        lines.push("        }");
    }

    function addBooleanParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (boolean)");
        lines.push("            /value " + value);
        lines.push("        }");
    }

    function getSelectionArray(doc) {
        var selected = [];
        try {
            for (var i = 0; i < doc.selection.length; i++) {
                selected.push(doc.selection[i]);
            }
        } catch(e) {}
        return selected;
    }

    function restoreSelection(doc, selected) {
        try {
            doc.selection = null;
            for (var i = 0; i < selected.length; i++) {
                try {
                    selected[i].selected = true;
                } catch(e) {}
            }
        } catch(e) {}
    }

    function removeActionSetIfLoaded(actionSetName) {
        try {
            app.unloadAction(actionSetName, "");
        } catch(e) {}
    }

    function safeNumber(value, fallback) {
        value = parseFloat(value);
        return isNaN(value) ? fallback : value;
    }

    function stringToHex(text) {
        var hex = "";
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i).toString(16).toUpperCase();
            while (code.length < 2) code = "0" + code;
            hex += code;
        }
        return hex;
    }
})();
