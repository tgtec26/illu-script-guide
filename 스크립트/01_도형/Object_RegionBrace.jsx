// Object_RegionBrace.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 어떤 영역을 묶어서 가리키는 중괄호 선을 만든다.
// 직선 선택 → 0.5pt로 맞추고 가운데를 잘라 두 선으로 나눈 뒤,
// 바깥 끝에는 화살표 7, 가운데(자른) 끝에는 화살표 6을 붙이고 그룹으로 묶는다.
// 가로선은 왼쪽·오른쪽, 세로선은 위쪽·아래쪽을 바깥으로 본다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "RegionBrace/settings";
    var STROKE_WIDTH = 0.5;
    var ARROW_SCALE = 100.0;
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 30;
    var LABEL_WIDTH = 70;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 105;
    var STEP_BUTTON_WIDTH = 34;

    var doc = app.activeDocument;

    var targets = [];
    collectStraightPaths(doc.selection, targets);

    if (targets.length === 0) {
        alert("점 2개짜리 직선을 선택해주세요.");
        return;
    }

    // 원래 표시 상태를 기억해 두고 미리보기 동안만 숨긴다
    var originalHidden = [];
    for (var t = 0; t < targets.length; t++) {
        originalHidden.push(targets[t].hidden);
    }

    // 화살표 이름과 정렬 이름은 Illustrator UI 언어를 따른다
    var locale = "";
    try { locale = String(app.locale).toLowerCase(); } catch (localeError) {}
    var isKorean = (locale === "" || locale.indexOf("ko") === 0);
    var ARROW_OUTER = isKorean ? "화살표 7" : "Arrow 7";
    var ARROW_INNER = isKorean ? "화살표 6" : "Arrow 6";
    var ALIGN_TIP_NAME = isKorean ? "패스 끝의 팁" : "Tip of arrow at end of path";

    // 다이얼로그가 다루는 옵션 값
    // 가로선은 상하로, 세로선은 좌우로 뒤집힌다
    var flipHorizontalLine = false;
    var flipVerticalLine = false;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previewGroups = [];

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "영역 중괄호");
    dlg.alignChildren = "fill";

    dlg.add("statictext", undefined, "대상: " + targets.length + "개");

    var flipPanel = addPanel(dlg, "화살표 반전");
    var flipHorizontalCheck = flipPanel.add("checkbox", undefined, "상하 반전 (가로선)");
    var flipVerticalCheck = flipPanel.add("checkbox", undefined, "좌우 반전 (세로선)");

    var positionPanel = addPanel(dlg, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    applySettings();
    flipHorizontalCheck.value = flipHorizontalLine;
    flipVerticalCheck.value = flipVerticalLine;
    previewCheck.value = previewEnabled;
    setRowValue(offsetXControls, offsetXmm);
    setRowValue(offsetYControls, offsetYmm);

    flipHorizontalCheck.onClick = function() {
        flipHorizontalLine = flipHorizontalCheck.value;
        updatePreview();
    };
    flipVerticalCheck.onClick = function() {
        flipVerticalLine = flipVerticalCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; },
        function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; },
        function(v) { offsetYmm = v; }, false);

    okButton.onClick = function() {
        if (previewGroups.length === 0) {
            setOriginalsHidden(true);
            buildPreview();
        }
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].remove(); } catch (removeError) {}
        }
        saveSettings();
        doc.selection = null;
        for (var g = 0; g < previewGroups.length; g++) {
            try { previewGroups[g].selected = true; } catch (selectError) {}
        }
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        restoreOriginals();
        app.redraw();
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            setOriginalsHidden(true);
            buildPreview();
        } else {
            restoreOriginals();
        }
        app.redraw();
    }

    function buildPreview() {
        for (var i = 0; i < targets.length; i++) {
            var group = makeBrace(targets[i]);
            if (group === null) continue;
            moveItem(group, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            previewGroups.push(group);
        }
    }

    function clearPreview() {
        for (var i = 0; i < previewGroups.length; i++) {
            try { previewGroups[i].remove(); } catch (e) {}
        }
        previewGroups = [];
    }

    function movePreview(deltaX, deltaY) {
        for (var i = 0; i < previewGroups.length; i++) {
            moveItem(previewGroups[i], deltaX, deltaY);
        }
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function setOriginalsHidden(hidden) {
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].hidden = hidden; } catch (e) {}
        }
    }

    function restoreOriginals() {
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].hidden = originalHidden[i]; } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 한 직선을 두 조각으로 나누고 화살표를 붙인다 (원본은 그대로 둔다)
    // -------------------------------------------------------
    function makeBrace(path) {
        var a, b;
        try {
            a = path.pathPoints[0].anchor;
            b = path.pathPoints[1].anchor;
        } catch (pointError) {
            return null;
        }

        // 가로/세로 판정은 더 긴 축을 따른다 (사선은 가까운 쪽으로 본다)
        var horizontal = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);

        // 바깥 → 안쪽 순서가 되도록 시작점을 왼쪽(가로) 또는 위쪽(세로)으로 맞춘다
        var first = a, second = b;
        if (horizontal ? (a[0] > b[0]) : (a[1] < b[1])) {
            first = b;
            second = a;
        }

        var swap = horizontal ? flipHorizontalLine : flipVerticalLine;
        var outerName = swap ? ARROW_INNER : ARROW_OUTER;
        var innerName = swap ? ARROW_OUTER : ARROW_INNER;

        var mid = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];

        var group = path.parent.groupItems.add();
        group.move(path, ElementPlacement.PLACEBEFORE);

        // 원본을 복제해 색·레이어 같은 나머지 속성을 그대로 물려받는다
        var head = makeSegment(path, group, first, mid);
        var tail = makeSegment(path, group, mid, second);

        // 시작점이 바깥, 끝점이 가운데인 조각 / 그 반대인 조각
        applyArrowheads(head, outerName, innerName);
        applyArrowheads(tail, innerName, outerName);

        return group;
    }

    function makeSegment(path, group, startPoint, endPoint) {
        var segment = path.duplicate(group, ElementPlacement.PLACEATEND);
        segment.setEntirePath([[startPoint[0], startPoint[1]], [endPoint[0], endPoint[1]]]);
        segment.closed = false;
        segment.hidden = false;
        segment.stroked = true;
        segment.strokeWidth = STROKE_WIDTH;
        return segment;
    }

    // -------------------------------------------------------
    // 대상 수집
    // -------------------------------------------------------
    function collectStraightPaths(items, out) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            collectStraightPath(items[i], out);
        }
    }

    function collectStraightPath(item, out) {
        if (!item) return;

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectStraightPath(item.pageItems[i], out);
            }
        } else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                collectStraightPath(item.pathItems[j], out);
            }
        } else if (item.typename === "PathItem" && !item.closed && item.pathPoints.length === 2) {
            out.push(item);
        }
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.alignChildren = ["left", "top"];
        panel.margins = [12, 16, 12, 12];
        panel.spacing = 6;
        return panel;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        row.add("statictext", undefined, unit);
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;
        return {
            input: input, slider: slider, down: down, up: up,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
        controls.down.onClick = function() { commit(getter() - controls.step); };
        controls.up.onClick = function() { commit(getter() + controls.step); };
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(",", ".").replace(/[^0-9.\-]/g, ""));
        return isNaN(value) ? null : value;
    }

    function clamp(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function roundTo(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        var factor = Math.pow(10, decimals);
        var rounded = Math.round(value * factor) / factor;
        var text = String(rounded);
        if (decimals <= 0) return text;
        var dot = text.indexOf(".");
        if (dot === -1) {
            text += ".";
            dot = text.length - 1;
        }
        while (text.length - dot - 1 < decimals) text += "0";
        return text;
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            "v2",
            flipHorizontalLine ? "1" : "0",
            flipVerticalLine ? "1" : "0",
            offsetXmm,
            offsetYmm,
            previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length < 6) return;
        flipHorizontalLine = (p[1] === "1");
        flipVerticalLine = (p[2] === "1");
        offsetXmm = restoreNumber(p[3], offsetXmm);
        offsetYmm = restoreNumber(p[4], offsetYmm);
        previewEnabled = (p[5] === "1");
    }

    function restoreNumber(text, fallback) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    }

    // -------------------------------------------------------
    // 화살표 액션 (화살촉은 DOM에 없어서 임시 .aia로 처리한다)
    // -------------------------------------------------------
    function applyArrowheads(pathItem, startName, endName) {
        var actionSetName = "Codex_RegionBrace";
        var actionName = "BraceArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_RegionBrace.aia");

        try {
            doc.selection = null;
            pathItem.selected = true;

            writeArrowheadAction(actionFile, actionSetName, actionName, startName, endName);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살표 이름은 UI 언어에 따라 다르다. 실패해도 잘린 선은 그대로 남는다.
        }

        try { app.unloadAction(actionSetName, ""); } catch (e2) {}
        try { actionFile.remove(); } catch (e3) {}
        doc.selection = null;
    }

    // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
    function toActionHex(text) {
        var bytes = [];
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }
        var hex = "";
        for (var j = 0; j < bytes.length; j++) {
            var part = bytes[j].toString(16).toUpperCase();
            if (part.length < 2) part = "0" + part;
            hex += part;
        }
        return { hex: hex, length: bytes.length };
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, startName, endName) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var startArrow = toActionHex(startName);
        var endArrow = toActionHex(endName);
        var alignName = toActionHex(ALIGN_TIP_NAME);
        var lines = [];

        lines.push("/version 3");
        lines.push("/name [ " + setName.length);
        lines.push("    " + setName.hex);
        lines.push("]");
        lines.push("/isOpen 1");
        lines.push("/actionCount 1");
        lines.push("/action-1 {");
        lines.push("    /name [ " + name.length);
        lines.push("        " + name.hex);
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

        // 선 두께 (pt)
        lines.push("        /parameter-1 {");
        lines.push("            /key 2003072104");
        lines.push("            /showInPalette -1");
        lines.push("            /type (unit real)");
        lines.push("            /value " + STROKE_WIDTH);
        lines.push("            /unit 592476268");
        lines.push("        }");
        // 시작 화살표
        lines.push("        /parameter-2 {");
        lines.push("            /key 1634231345");
        lines.push("            /showInPalette -1");
        lines.push("            /type (ustring)");
        lines.push("            /value [ " + startArrow.length);
        lines.push("                " + startArrow.hex);
        lines.push("            ]");
        lines.push("        }");
        // 끝 화살표
        lines.push("        /parameter-3 {");
        lines.push("            /key 1634231346");
        lines.push("            /showInPalette -1");
        lines.push("            /type (ustring)");
        lines.push("            /value [ " + endArrow.length);
        lines.push("                " + endArrow.hex);
        lines.push("            ]");
        lines.push("        }");
        // 시작/끝 화살표 크기
        lines.push("        /parameter-4 {");
        lines.push("            /key 1634951985");
        lines.push("            /showInPalette -1");
        lines.push("            /type (real)");
        lines.push("            /value " + ARROW_SCALE);
        lines.push("        }");
        lines.push("        /parameter-5 {");
        lines.push("            /key 1634951986");
        lines.push("            /showInPalette -1");
        lines.push("            /type (real)");
        lines.push("            /value " + ARROW_SCALE);
        lines.push("        }");
        // 화살표 정렬: 패스 끝의 팁
        lines.push("        /parameter-6 {");
        lines.push("            /key 1634230636");
        lines.push("            /showInPalette -1");
        lines.push("            /type (enumerated)");
        lines.push("            /name [ " + alignName.length);
        lines.push("                " + alignName.hex);
        lines.push("            ]");
        lines.push("            /value 0");
        lines.push("        }");

        lines.push("    }");
        lines.push("}");

        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
    }
})();
