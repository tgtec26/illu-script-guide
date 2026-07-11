/*
  Illustrator Script: Text White Stroke Fill Appearance
  Description: 선택한 문자에 모양 패널 기준 새 선, 새 면을 추가하고 선을 흰색 1pt 둥근 연결로 설정합니다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var STROKE_WIDTH = 1;
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("문자를 선택하고 실행해주세요.");
        return;
    }

    var textFrames = [];
    for (var i = 0; i < sel.length; i++) {
        collectTextFrames(sel[i], textFrames);
    }

    if (textFrames.length === 0) {
        alert("선택 항목 중 처리할 수 있는 문자가 없습니다.");
        return;
    }

    var originalSelection = getSelectionArray(doc);
    var whiteColor = makeWhiteColor(doc);

    doc.selection = null;
    for (var t = 0; t < textFrames.length; t++) {
        // 문자 자체에는 획을 추가하지 않는다(모양 패널의 새 획/새 면만 사용).
        textFrames[t].selected = true;
    }

    addAppearanceStrokeThenFill(doc, whiteColor);
    restoreSelection(doc, originalSelection);

    function collectTextFrames(item, result) {
        if (!item) return;

        if (item.typename === "TextFrame") {
            result.push(item);
        } else if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectTextFrames(item.pageItems[i], result);
            }
        }
    }

    function addAppearanceStrokeThenFill(doc, whiteColor) {
        var lines = [];
        addNewStrokeEvent(lines, 1);
        addNewFillEvent(lines, 2);
        var previousDefaultStrokeColor = getDefaultStrokeColor(doc);
        var previousDefaultStrokeWidth = getDefaultStrokeWidth(doc);

        try {
            doc.defaultStrokeColor = whiteColor;
            doc.defaultStrokeWidth = STROKE_WIDTH;
            app.executeMenuCommand("Adobe New Stroke Shortcut");
        } catch (e) {
            alert("모양 패널의 새 선을 추가할 수 없습니다.");
            return;
        }

        try {
            app.executeMenuCommand("Adobe New Fill Shortcut");
        } catch (e2) {
            alert("모양 패널의 새 면을 추가할 수 없습니다.");
        }

        // 둥근 연결은 새 면 추가 이후(맨 마지막)에 적용해야 되돌려지지 않는다.
        applyStrokeStyleAction(doc);

        restoreDefaultStroke(doc, previousDefaultStrokeColor, previousDefaultStrokeWidth);
    }

    function addNewStrokeEvent(lines, eventIndex) {
        lines.push("Add New Stroke " + eventIndex);
    }

    function addNewFillEvent(lines, eventIndex) {
        lines.push("Add New Fill " + eventIndex);
    }

    function applyStrokeStyleAction(doc) {
        // 액션셋 이름을 매 실행 고유하게 만들어, 이전 실행이 남긴 동일 이름 셋과
        // 충돌해 loadAction이 실패(→ 각진 기본값 유지)하는 것을 방지한다.
        var stamp = (new Date()).getTime();
        var actionSetName = "Codex_TWSFA_" + stamp;
        var actionName = "SetWhiteRoundStroke";
        var actionFile = new File(Folder.temp + "/Codex_TWSFA_" + stamp + ".aia");

        try {
            removeActionSetIfLoaded(actionSetName);
            writeStrokeAction(actionFile, actionSetName, actionName);
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (e) {
            // 새 선은 이미 추가되어 있으므로, 액션 실패 시 문자 기본 선 속성만 유지합니다.
        } finally {
            removeActionSetIfLoaded(actionSetName);
            try {
                actionFile.remove();
            } catch (removeError) {}
        }
    }

    function writeStrokeAction(actionFile, actionSetName, actionName) {
        var lines = [];

        lines.push("/version 3");
        lines.push("/name [ " + actionSetName.length);
        lines.push("    " + asciiHex(actionSetName));
        lines.push("]");
        lines.push("/isOpen 1");
        lines.push("/actionCount 1");
        lines.push("/action-1 {");
        lines.push("    /name [ " + actionName.length);
        lines.push("        " + asciiHex(actionName));
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
        lines.push("        /parameterCount 6");

        // 녹화된 "둥근 연결" 액션과 바이트 단위로 동일하게 구성.
        // (miter-limit 파라미터를 넣으면 각진 연결로 처리되므로 제외한다.)
        addUnitRealParameter(lines, 1, 2003072104, STROKE_WIDTH);            // 선 두께
        addEnumeratedParameterHex(lines, 2, 1667330094, "eca091ed959c20eb8ba8eba9b4", 0); // 단면
        addEnumeratedParameterHex(lines, 3, 1785686382, "eb91a5eab7bc20ec97b0eab2b0", 1); // 둥근 연결
        addIntegerParameter(lines, 4, 1684825454, 0);
        addBooleanParameter(lines, 5, 1684104298, 0);
        addEnumeratedParameterHex(lines, 6, 1634494318, "eab080ec9ab4eb8db0", 0);         // 가운데 정렬

        lines.push("    }");
        lines.push("}");

        writeActionFile(actionFile, lines);
    }

    function makeWhiteColor(documentRef) {
        var color;
        if (documentRef.documentColorSpace === DocumentColorSpace.RGB) {
            color = new RGBColor();
            color.red = 255;
            color.green = 255;
            color.blue = 255;
        } else {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = 0;
        }
        return color;
    }

    function getDefaultStrokeColor(doc) {
        try {
            return doc.defaultStrokeColor;
        } catch (e) {
            return null;
        }
    }

    function getDefaultStrokeWidth(doc) {
        try {
            return doc.defaultStrokeWidth;
        } catch (e) {
            return null;
        }
    }

    function restoreDefaultStroke(doc, color, width) {
        try {
            if (color) {
                doc.defaultStrokeColor = color;
            }
        } catch (e) {}

        try {
            if (width !== null) {
                doc.defaultStrokeWidth = width;
            }
        } catch (e2) {}
    }

    function writeActionFile(actionFile, lines) {
        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
    }

    function addUnitRealParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette 4294967295");
        lines.push("            /type (unit real)");
        lines.push("            /value " + formatReal(value));
        lines.push("            /unit 592476268");
        lines.push("        }");
    }

    function addIntegerParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette 4294967295");
        lines.push("            /type (integer)");
        lines.push("            /value " + value);
        lines.push("        }");
    }

    function addBooleanParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette 4294967295");
        lines.push("            /type (boolean)");
        lines.push("            /value " + value);
        lines.push("        }");
    }

    // 이름을 원본 액션의 UTF-8 hex 그대로 기록(로케일/인코딩 차이로 인한 불일치 방지)
    function addEnumeratedParameterHex(lines, index, key, hexName, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (enumerated)");
        lines.push("            /name [ " + (hexName.length / 2));
        lines.push("                " + hexName);
        lines.push("            ]");
        lines.push("            /value " + value);
        lines.push("        }");
    }

    function addEnumeratedParameter(lines, index, key, name, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette 4294967295");
        lines.push("            /type (enumerated)");
        lines.push("            /name [ " + utf8HexLength(name));
        lines.push("                " + utf8Hex(name));
        lines.push("            ]");
        lines.push("            /value " + value);
        lines.push("        }");
    }

    function getSelectionArray(doc) {
        var selected = [];
        try {
            for (var i = 0; i < doc.selection.length; i++) {
                selected.push(doc.selection[i]);
            }
        } catch (e) {}
        return selected;
    }

    function restoreSelection(doc, selected) {
        try {
            doc.selection = null;
            for (var i = 0; i < selected.length; i++) {
                try {
                    selected[i].selected = true;
                } catch (e) {}
            }
        } catch (e2) {}
    }

    function removeActionSetIfLoaded(actionSetName) {
        try {
            app.unloadAction(actionSetName, "");
        } catch (e) {}
    }

    function formatReal(value) {
        return (value % 1 === 0) ? value + ".0" : String(value);
    }

    function asciiHex(text) {
        var hex = "";
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i).toString(16).toUpperCase();
            while (code.length < 2) code = "0" + code;
            hex += code;
        }
        return hex;
    }

    function utf8Hex(text) {
        var bytes = unescape(encodeURIComponent(text));
        var hex = "";
        for (var i = 0; i < bytes.length; i++) {
            var code = bytes.charCodeAt(i).toString(16).toUpperCase();
            while (code.length < 2) code = "0" + code;
            hex += code;
        }
        return hex;
    }

    function utf8HexLength(text) {
        return utf8Hex(text).length / 2;
    }
})();
