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
        var previousDefaultStrokeColor = getDefaultStrokeColor(doc);
        var previousDefaultStrokeWidth = getDefaultStrokeWidth(doc);

        try {
            // 새로 추가되는 선이 흰색 1pt가 되도록 기본 선 속성을 맞춘다.
            doc.defaultStrokeColor = whiteColor;
            doc.defaultStrokeWidth = STROKE_WIDTH;
            // 사용자가 녹화한 6이벤트 액션(문자 밖 획·칠 + 둥근 연결)을 그대로 재생.
            applyStrokeStyleAction(doc);
        } finally {
            restoreDefaultStroke(doc, previousDefaultStrokeColor, previousDefaultStrokeWidth);
        }
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

    // 사용자가 녹화한 test2 액션(6이벤트)을 바이트 단위로 그대로 생성한다.
    // 선 색상 선택 → 새 선 추가 → 칠 색상 선택 → 새 칠 추가 → 선 색상 선택 → 선 속성(둥근 연결)
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
        lines.push("    /eventCount 6");

        pushSetColorFocus(lines, 1, "ec84a020ec8389ec8381", 0);              // 선 색상
        pushAppearanceEvent(lines, 2, "ec838820ec84a020ecb694eab080", 2);    // 새 선 추가
        pushSetColorFocus(lines, 3, "ecb9a020ec8389ec8381", 1);              // 칠 색상
        pushAppearanceEvent(lines, 4, "ec838820ecb9a020ecb694eab080", 1);    // 새 칠 추가
        pushSetColorFocus(lines, 5, "ec84a020ec8389ec8381", 0);              // 선 색상
        pushSetStrokeEvent(lines, 6);                                        // 선 속성(둥근 연결)

        lines.push("}");

        writeActionFile(actionFile, lines);
    }

    function pushSetColorFocus(lines, idx, nameHex, boolVal) {
        lines.push("    /event-" + idx + " {");
        lines.push("        /useRulersIn1stQuadrant 0");
        lines.push("        /internalName (ai_plugin_setColor)");
        lines.push("        /localizedName [ 13");
        lines.push("            ec8389ec838120ec84a4eca095");   // 색상 설정
        lines.push("        ]");
        lines.push("        /isOpen 0");
        lines.push("        /isOn 1");
        lines.push("        /hasDialog 0");
        lines.push("        /parameterCount 2");
        lines.push("        /parameter-1 {");
        lines.push("            /key 1768186740");
        lines.push("            /showInPalette -1");
        lines.push("            /type (ustring)");
        lines.push("            /value [ " + (nameHex.length / 2));
        lines.push("                " + nameHex);
        lines.push("            ]");
        lines.push("        }");
        lines.push("        /parameter-2 {");
        lines.push("            /key 1718185068");
        lines.push("            /showInPalette -1");
        lines.push("            /type (boolean)");
        lines.push("            /value " + boolVal);
        lines.push("        }");
        lines.push("    }");
    }

    function pushAppearanceEvent(lines, idx, itemNameHex, value) {
        lines.push("    /event-" + idx + " {");
        lines.push("        /useRulersIn1stQuadrant 0");
        lines.push("        /internalName (ai_plugin_appearance)");
        lines.push("        /localizedName [ 6");
        lines.push("            ebaaa8ec9691");   // 모양
        lines.push("        ]");
        lines.push("        /isOpen 0");
        lines.push("        /isOn 1");
        lines.push("        /hasDialog 0");
        lines.push("        /parameterCount 1");
        lines.push("        /parameter-1 {");
        lines.push("            /key 1835363957");
        lines.push("            /showInPalette -1");
        lines.push("            /type (enumerated)");
        lines.push("            /name [ " + (itemNameHex.length / 2));
        lines.push("                " + itemNameHex);
        lines.push("            ]");
        lines.push("            /value " + value);
        lines.push("        }");
        lines.push("    }");
    }

    function pushSetStrokeEvent(lines, idx) {
        lines.push("    /event-" + idx + " {");
        lines.push("        /useRulersIn1stQuadrant 0");
        lines.push("        /internalName (ai_plugin_setStroke)");
        lines.push("        /localizedName [ 10");
        lines.push("            ec84a020ec84a4eca095");   // 선 설정
        lines.push("        ]");
        lines.push("        /isOpen 0");
        lines.push("        /isOn 1");
        lines.push("        /hasDialog 0");
        lines.push("        /parameterCount 6");
        addUnitRealParameter(lines, 1, 2003072104, STROKE_WIDTH);            // 선 두께 1pt
        addEnumeratedParameterHex(lines, 2, 1667330094, "eca091ed959c20eb8ba8eba9b4", 0); // 단면
        addEnumeratedParameterHex(lines, 3, 1785686382, "eb91a5eab7bc20ec97b0eab2b0", 1); // 둥근 연결
        addIntegerParameter(lines, 4, 1684825454, 0);
        addBooleanParameter(lines, 5, 1684104298, 0);
        addEnumeratedParameterHex(lines, 6, 1634494318, "eab080ec9ab4eb8db0", 0);         // 가운데 정렬
        lines.push("    }");
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
        lines.push("            /showInPalette -1");
        lines.push("            /type (unit real)");
        lines.push("            /value " + formatReal(value));
        lines.push("            /unit 592476268");
        lines.push("        }");
    }

    function addIntegerParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (integer)");
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
        lines.push("            /showInPalette -1");
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
