/*
  Illustrator Script: Apply Expanding Arrow Style
  Description: 선택한 패스에 8pt 선, 끝 화살표 3번(20%), 폭 속성1을 적용합니다.
*/

(function() {
    if (app.documents.length === 0) return;

    var STROKE_WIDTH_PT = 8;
    var ARROW_SCALE = 20;

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("확장 화살표를 적용할 선을 선택해주세요.");
        return;
    }

    var paths = [];
    for (var i = 0; i < sel.length; i++) {
        collectPathItems(sel[i], paths);
    }

    if (paths.length === 0) {
        alert("선택 항목 안에 적용 가능한 패스가 없습니다.");
        return;
    }

    var originalSelection = getSelectionArray(doc);

    for (var p = 0; p < paths.length; p++) {
        applyBaseStroke(paths[p]);
    }

    var locale = getAppLocale();
    var isKorean = locale === "" || locale.indexOf("ko") === 0;
    var arrowName = isKorean ? "화살표 3" : "Arrow 3";
    var profileName = isKorean ? "폭 속성1" : "Width Profile 1";

    applyArrowActionToPaths(doc, paths, arrowName, profileName);

    restoreSelection(doc, originalSelection);

    if (!hasWidthProfile(profileName)) {
        alert("화살표는 적용했지만 가변 폭 프로파일 '" + profileName + "'을(를) 찾지 못했습니다.\n\n" +
            "이 기기에 프로파일이 아직 등록되지 않은 상태입니다.\n" +
            "일러스트레이터를 완전히 종료한 뒤 script-action-update 를 다시 실행하면 자동으로 등록됩니다.\n\n" +
            "직접 만들려면: 선을 하나 그린 뒤 폭 도구로 시작점 폭을 0까지 줄이고,\n" +
            "획 패널의 프로파일 목록에서 '프로파일에 추가'로 '" + profileName + "' 이름으로 저장하세요.");
    }

    // 프로파일 프리셋 파일에 해당 이름이 있는지 확인한다.
    // 파일을 읽을 수 없으면 판단을 보류하고 경고를 띄우지 않는다.
    function hasWidthProfile(name) {
        try {
            // 설정 폴더 위치: macOS는 ~/Library/Preferences, Windows는 %APPDATA%
            var settingsName = "Adobe Illustrator " + parseInt(app.version, 10) + " Settings";
            var settingsFolder = /mac/i.test($.os)
                ? Folder(Folder("~/Library/Preferences").fsName + "/" + settingsName)
                : Folder(Folder.userData.fsName + "/Adobe/" + settingsName);
            if (!settingsFolder.exists) return true;

            var marker = utf8Hex(name).toLowerCase();
            var localeFolders = settingsFolder.getFiles(function(f) { return f instanceof Folder; });
            for (var i = 0; i < localeFolders.length; i++) {
                var presetFile = File(localeFolders[i].fsName + "/가변 폭 속성");
                if (!presetFile.exists) continue;

                presetFile.encoding = "UTF-8";
                presetFile.open("r");
                var contents = presetFile.read();
                presetFile.close();
                if (String(contents).toLowerCase().indexOf(marker) !== -1) return true;
            }
            return false;
        } catch (e) {
            return true;
        }
    }

    function collectPathItems(item, result) {
        if (!item) return;

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectPathItems(item.pageItems[i], result);
            }
        } else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                result.push(item.pathItems[j]);
            }
        } else if (item.typename === "PathItem") {
            result.push(item);
        }
    }

    function applyBaseStroke(pathItem) {
        try {
            pathItem.stroked = true;
            pathItem.filled = false;
            pathItem.strokeWidth = STROKE_WIDTH_PT;
            pathItem.strokeCap = StrokeCap.BUTTENDCAP;
            pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
            pathItem.strokeDashes = [];
        } catch(e) {}
    }

    function applyArrowActionToPaths(doc, paths, arrowName, profileName) {
        var actionSetName = "Codex_ExpandArrow";
        var actionName = "Arrow";
        var actionFile = new File(Folder.temp + "/Codex_ExpandArrow.aia");

        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) {
                paths[i].selected = true;
            }

            removeActionSetIfLoaded(actionSetName);
            writeArrowAction(actionFile, actionSetName, actionName, arrowName, profileName);
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch(e) {
            // Locale-specific arrow names can fail on non-matching Illustrator installs.
        } finally {
            removeActionSetIfLoaded(actionSetName);
            try {
                actionFile.remove();
            } catch(removeError) {}
        }
    }

    function applyProfileActionToPaths(doc, paths, profileName) {
        var actionSetName = "Codex_ExpandArrowProfile";
        var actionName = "Profile";
        var actionFile = new File(Folder.temp + "/Codex_ExpandArrowProfile.aia");

        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) {
                paths[i].selected = true;
            }

            removeActionSetIfLoaded(actionSetName);
            writeProfileAction(actionFile, actionSetName, actionName, profileName);
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch(e) {
            // Profile names are localized; the base arrow style remains applied.
        } finally {
            removeActionSetIfLoaded(actionSetName);
            try {
                actionFile.remove();
            } catch(removeError) {}
        }
    }

    function writeArrowAction(actionFile, actionSetName, actionName, arrowName, profileName) {
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
        addArrowStrokeEvent(lines, 1, arrowName, profileName, ARROW_SCALE);

        lines.push("}");

        writeActionFile(actionFile, lines);
    }

    function addArrowStrokeEvent(lines, eventIndex, arrowName, profileName, arrowScale) {
        lines.push("    /event-" + eventIndex + " {");
        lines.push("        /useRulersIn1stQuadrant 0");
        lines.push("        /internalName (ai_plugin_setStroke)");
        lines.push("        /localizedName [ 10");
        lines.push("            536574205374726F6B65");
        lines.push("        ]");
        lines.push("        /isOpen 1");
        lines.push("        /isOn 1");
        lines.push("        /hasDialog 0");
        lines.push("        /parameterCount 12");

        // 파라미터 순서는 Illustrator가 실제로 녹화한 액션과 동일하게 두고,
        // 녹화본에 없던 폭 프로파일만 맨 뒤에 덧붙인다
        addUnitRealParameter(lines, 1, 2003072104, STROKE_WIDTH_PT);
        addEnumeratedParameter(lines, 2, 1667330094, "중단 단면", 0);
        addRealParameter(lines, 3, 1836344690, 10);
        addEnumeratedParameter(lines, 4, 1785686382, "각진 연결", 0);
        addIntegerParameter(lines, 5, 1684825454, 0);
        addBooleanParameter(lines, 6, 1684104298, 0);
        addUStringParameter(lines, 7, 1634231345, getNoneArrowName());
        addUStringParameter(lines, 8, 1634231346, arrowName);
        addRealParameter(lines, 9, 1634951986, arrowScale);
        addEnumeratedParameter(lines, 10, 1634230636, "패스 끝의 팁", 0);
        addEnumeratedParameter(lines, 11, 1634494318, "가운데", 0);
        addUStringParameter(lines, 12, 2003858022, profileName);

        lines.push("    }");
    }

    function writeProfileAction(actionFile, actionSetName, actionName, profileName) {
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
        lines.push("        /parameterCount 1");

        addUStringParameter(lines, 1, 2003858022, profileName);

        lines.push("    }");
        lines.push("}");

        writeActionFile(actionFile, lines);
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

    function addRealParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (real)");
        lines.push("            /value " + formatReal(value));
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

    function addUStringParameter(lines, index, key, value) {
        lines.push("        /parameter-" + index + " {");
        lines.push("            /key " + key);
        lines.push("            /showInPalette -1");
        lines.push("            /type (ustring)");
        lines.push("            /value [ " + utf8HexLength(value));
        lines.push("                " + utf8Hex(value));
        lines.push("            ]");
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

    function getAppLocale() {
        try {
            return String(app.locale).toLowerCase();
        } catch(e) {
            return "";
        }
    }

    function getNoneArrowName() {
        var locale = getAppLocale();
        return locale === "" || locale.indexOf("ko") === 0 ? "[없음]" : "[None]";
    }

    function formatReal(value) {
        // 일러스트 액션 파서는 real/unit real 값에 소수점을 요구함 (20 → 20.0).
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
