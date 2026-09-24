// Object_ForceDiagram.jsx
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

// 힘 화살표: 선택한 물체(아무 개체 하나)의 경계 상자를 기준으로 힘 화살표를 붙인다.
//   - 중력: 가운데에서 아래로. 부력: 가운데에서 위로. 수직항력: 바닥에서 위로 (중력과 겹치지 않게 너비의 20% 비켜서).
//   - 마찰력: 바닥 가운데에서 운동 방향과 반대로. 작용한 힘: 밀기는 뒤쪽 옆면을 향해 들어오고, 당기기는 앞쪽 옆면에서 나간다.
//   - 운동 방향 화살표: 물체(와 위로 뻗은 화살표 끝) 위에 떨어져서 운동 방향으로.
//   - 화살표는 선 + 끝 화살촉(임시 액션), 이름은 화살표 끝 옆에 둔다. 결과는 물체와 따로 된 그룹 하나.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectForceDiagram/settings";
    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    // 힘 종류: 이름, 기본 길이(mm)
    var FORCES = [
        {name: "중력", length: 12},
        {name: "부력", length: 10},
        {name: "수직항력", length: 12},
        {name: "마찰력", length: 8},
        {name: "작용한 힘", length: 12},
        {name: "운동 방향", length: 10}
    ];
    var APPLIED_MODES = ["밀기", "당기기"];
    var LABEL_WIDTH = 110;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 50;
    var LENGTH_RANGE = [1, 60];
    var WIDTH_RANGE = [0.1, 3];
    var HEAD_RANGE = [20, 300];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    if (!doc.selection || doc.selection.length !== 1) {
        alert("힘을 붙일 물체 하나를 선택해주세요.");
        return;
    }
    var target = doc.selection[0];
    var bounds = target.geometricBounds;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var enabled = [true, false, false, false, false, false];
    var lengths = [];
    for (var f = 0; f < FORCES.length; f++) lengths.push(FORCES[f].length);
    var movingRight = true;
    var appliedMode = 0;
    var lineWidth = 0.5;
    var headScale = 60;
    var labelsOn = true;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "힘 화살표");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var forcePanel = addPanel(dlg, "힘 (길이 mm)");
    var forceRows = [];
    for (var r = 0; r < FORCES.length; r++) forceRows.push(addForceRow(forcePanel, FORCES[r].name, lengths[r], enabled[r]));
    var directionRow = forcePanel.add("group");
    directionRow.add("statictext", undefined, "운동 방향:").preferredSize.width = LABEL_WIDTH;
    var rightRadio = directionRow.add("radiobutton", undefined, "오른쪽");
    var leftRadio = directionRow.add("radiobutton", undefined, "왼쪽");
    var appliedRow = forcePanel.add("group");
    appliedRow.add("statictext", undefined, "작용한 힘:").preferredSize.width = LABEL_WIDTH;
    var appliedRadios = [];
    for (var a = 0; a < APPLIED_MODES.length; a++) appliedRadios.push(appliedRow.add("radiobutton", undefined, APPLIED_MODES[a]));
    directionRow.helpTip = "마찰력은 반대로, 작용한 힘·운동 방향 화살표는 이쪽으로";

    var stylePanel = addPanel(dlg, "모양");
    var widthRow = addValueRow(stylePanel, "선 두께", "pt", lineWidth, WIDTH_RANGE[0], WIDTH_RANGE[1], 0.1, 1);
    var headRow = addValueRow(stylePanel, "화살촉 크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);
    var labelCheck = stylePanel.add("checkbox", undefined, "힘 이름 표시");
    var fontRow = addValueRow(stylePanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    rightRadio.value = movingRight;
    leftRadio.value = !movingRight;
    appliedRadios[appliedMode].value = true;
    labelCheck.value = labelsOn;
    syncEnabled();

    for (var fr = 0; fr < forceRows.length; fr++) bindForceRow(forceRows[fr], fr);
    rightRadio.onClick = function() { movingRight = true; updatePreview(); };
    leftRadio.onClick = function() { movingRight = false; updatePreview(); };
    for (var ar = 0; ar < appliedRadios.length; ar++) {
        appliedRadios[ar].onClick = (function(index) {
            return function() { appliedMode = index; updatePreview(); };
        })(ar);
    }
    labelCheck.onClick = function() { labelsOn = labelCheck.value; syncEnabled(); updatePreview(); };
    bindValueRow(widthRow, function() { return lineWidth; }, function(v) { lineWidth = v; });
    bindValueRow(headRow, function() { return headScale; }, function(v) { headScale = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var confirmed = dlg.show() === 1;
    if (!confirmed) clearPreview();
    doc.selection = null;
    try { (confirmed && previewGroup !== null ? previewGroup : target).selected = true; } catch (selectError) {}
    app.redraw();

    function syncEnabled() {
        for (var i = 0; i < forceRows.length; i++) {
            forceRows[i].input.enabled = enabled[i];
            forceRows[i].slider.enabled = enabled[i];
        }
        for (var j = 0; j < appliedRadios.length; j++) appliedRadios[j].enabled = enabled[4];
        fontRow.input.enabled = fontRow.slider.enabled = labelsOn;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        var arrows = forceArrows(bounds, enabled, mmList(lengths), movingRight, appliedMode === 0, 1.5 * MM, labelsOn ? fontPt : 0);
        if (arrows.length === 0) return;
        previewGroup = target.layer.groupItems.add();
        previewGroup.name = "힘 화살표";
        previewGroup.move(target, ElementPlacement.PLACEBEFORE);
        var black = makeGray(100);
        var paths = [];
        for (var i = 0; i < arrows.length; i++) {
            var line = previewGroup.pathItems.add();
            line.setEntirePath([arrows[i].from, arrows[i].to]);
            line.name = arrows[i].name;
            line.filled = false;
            line.stroked = true;
            line.strokeColor = black;
            line.strokeWidth = lineWidth;
            paths.push(line);
            if (labelsOn) addLabel(arrows[i]);
        }
        applyArrowheads(paths, lineWidth, headScale);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    // 이름은 화살표 끝 너머, 화살표 방향으로 조금 떨어진 곳에 가운데를 둔다 (가로 화살표는 위쪽)
    function addLabel(arrow) {
        var text = previewGroup.textFrames.add();
        text.contents = arrow.name;
        text.textRange.characterAttributes.size = fontPt;
        text.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(text);
        var b = text.geometricBounds;
        var w = b[2] - b[0];
        var h = b[1] - b[3];
        var dx = arrow.to[0] - arrow.from[0];
        var dy = arrow.to[1] - arrow.from[1];
        var x, y;
        if (Math.abs(dy) >= Math.abs(dx)) {
            // 세로 화살표: 끝 옆(오른쪽)에
            x = arrow.to[0] + 1 * MM + w / 2;
            y = arrow.to[1] - (dy > 0 ? h / 2 : -h / 2);
        } else {
            // 가로 화살표: 가운데 위(바닥 화살표는 아래)에
            x = (arrow.from[0] + arrow.to[0]) / 2;
            y = arrow.to[1] + (arrow.below ? -h / 2 - 1 * MM : h / 2 + 1 * MM);
        }
        text.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

    function mmList(values) {
        var out = [];
        for (var i = 0; i < values.length; i++) out.push(values[i] * MM);
        return out;
    }

    // -------------------------------------------------------
    // 화살표 위치 (순수 계산)
    // -------------------------------------------------------
    // bounds [left, top, right, bottom], on·length는 FORCES 순서. gap은 운동 방향 화살표와 그 아래 것 사이,
    // labelRoom은 위로 뻗어 물체 위로 나온 화살표 끝의 이름 자리. 돌려주는 것: [{name, from, to, below}]
    function forceArrows(b, on, length, right, push, gap, labelRoom) {
        var cx = (b[0] + b[2]) / 2;
        var cy = (b[1] + b[3]) / 2;
        var sign = right ? 1 : -1;
        var back = right ? b[0] : b[2];     // 운동 방향의 뒤쪽 옆면
        var front = right ? b[2] : b[0];
        var list = [];
        if (on[0]) list.push({name: "중력", from: [cx, cy], to: [cx, cy - length[0]]});
        if (on[1]) list.push({name: "부력", from: [cx, cy], to: [cx, cy + length[1]]});
        var normalX = cx + (b[2] - b[0]) * 0.2;
        if (on[2]) list.push({name: "수직항력", from: [normalX, b[3]], to: [normalX, b[3] + length[2]]});
        if (on[3]) list.push({name: "마찰력", from: [cx, b[3]], to: [cx - sign * length[3], b[3]], below: true});
        if (on[4]) {
            if (push) list.push({name: "작용한 힘", from: [back - sign * length[4], cy], to: [back, cy]});
            else list.push({name: "작용한 힘", from: [front, cy], to: [front + sign * length[4], cy]});
        }
        if (on[5]) {
            var top = b[1];
            for (var i = 0; i < list.length; i++) top = Math.max(top, list[i].to[1] + (list[i].to[1] > b[1] ? labelRoom : 0));
            var y = top + gap;
            list.push({name: "운동 방향", from: [cx - sign * length[5] / 2, y], to: [cx + sign * length[5] / 2, y]});
        }
        return list;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    // 화살촉은 DOM에 없는 속성이라 임시 액션으로 끝 화살촉만 넣는다
    function applyArrowheads(paths, weight, scale) {
        if (paths.length === 0) return;
        var actionSetName = "Codex_ForceDiagram";
        var actionName = "ForceArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_ForceArrowheads.aia");
        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) paths[i].selected = true;
            writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살촉 이름은 UI 언어에 따라 다르다. 실패해도 선은 그대로 남는다
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
        return {hex: hex, length: bytes.length};
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var arrow = toActionHex(ARROW_NAME);
        var lines = [
            "/version 3",
            "/name [ " + setName.length, "    " + setName.hex, "]",
            "/isOpen 1",
            "/actionCount 1",
            "/action-1 {",
            "    /name [ " + name.length, "        " + name.hex, "    ]",
            "    /keyIndex 0",
            "    /colorIndex 0",
            "    /isOpen 1",
            "    /eventCount 1",
            "    /event-1 {",
            "        /useRulersIn1stQuadrant 0",
            "        /internalName (ai_plugin_setStroke)",
            "        /localizedName [ 10", "            536574205374726F6B65", "        ]",
            "        /isOpen 1",
            "        /isOn 1",
            "        /hasDialog 0",
            "        /parameterCount 4",
            // 선 두께 (pt)
            "        /parameter-1 {",
            "            /key 2003072104",
            "            /showInPalette -1",
            "            /type (unit real)",
            "            /value " + weight,
            "            /unit 592476268",
            "        }",
            // 끝 화살촉
            "        /parameter-2 {",
            "            /key 1634231346",
            "            /showInPalette -1",
            "            /type (ustring)",
            "            /value [ " + arrow.length, "                " + arrow.hex, "            ]",
            "        }",
            // 끝 화살촉 크기 (%)
            "        /parameter-3 {",
            "            /key 1634951986",
            "            /showInPalette -1",
            "            /type (real)",
            "            /value " + scale + ".0",
            "        }",
            // 화살촉 정렬: 패스 끝의 팁
            "        /parameter-4 {",
            "            /key 1634230636",
            "            /showInPalette -1",
            "            /type (enumerated)",
            "            /name [ 17", "                ED8CA8EC8AA420EB819DEC9D9820ED8C81", "            ]",
            "            /value 0",
            "        }",
            "    }",
            "}"
        ];
        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
    }

    // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는
    // GSMediumB1(기준선 +0.5pt). 항목 기호 (가)(나)는 바탕 1.25배, ㉠·ⓐ는 바탕 1.125배 (8pt 기준 10pt·9pt).
    // 크기를 정한 뒤에 부른다
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            var bracket = batangFont !== null && isBracketLabel(text, i);
            if (bracket || (batangFont !== null && isCircledLabel(code))) {
                attributes.textFont = batangFont;
                attributes.size = attributes.size * (bracket ? 1.25 : 1.125);
                attributes.baselineShift = 0;
            } else if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    // i번째 글자가 "(한글 한 글자)" 세 글자 안에 드는가
    function isBracketLabel(text, i) {
        for (var start = i - 2; start <= i; start++) {
            if (start < 0 || start + 2 >= text.length) continue;
            var inner = text.charCodeAt(start + 1);
            if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return true;
        }
        return false;
    }

    // ㉠㉡… ⓐⓑ…
    function isCircledLabel(code) {
        return (code >= 0x3260 && code <= 0x327F) || (code >= 0x24D0 && code <= 0x24E9);
    }

    // 없으면 null (바탕이 없으면 항목 기호도 Spoqa로 둔다)
    function findOptionalFont(name) {
        try { return app.textFonts.getByName(name); } catch (e) { return null; }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
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

    // 체크 박스 | 입력창 | 스크롤바 (힘 이름 자리에 체크 박스를 둔 값 행)
    function addForceRow(parent, label, value, on) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var check = row.add("checkbox", undefined, label);
        check.preferredSize.width = LABEL_WIDTH;
        check.value = on;
        var input = row.add("edittext", undefined, formatNumber(value, 1));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, LENGTH_RANGE[0], LENGTH_RANGE[1]);
        slider.stepdelta = 0.5;
        slider.jumpdelta = 5;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {check: check, input: input, slider: slider, min: LENGTH_RANGE[0], max: LENGTH_RANGE[1], step: 0.5, decimals: 1};
    }

    function bindForceRow(controls, index) {
        controls.check.onClick = function() {
            enabled[index] = controls.check.value;
            syncEnabled();
            updatePreview();
        };
        bindValueRow(controls, function() { return lengths[index]; }, function(v) { lengths[index] = v; });
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals};
    }

    // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === getter()) return;
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM;
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
        var flags = [];
        for (var i = 0; i < enabled.length; i++) flags.push(enabled[i] ? "1" : "0");
        var parts = ["v1", flags.join(""), lengths.join(","), movingRight ? "1" : "0", appliedMode, lineWidth, headScale,
            labelsOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 12) return;
        var restored = p[2].split(",");
        if (p[1].length !== FORCES.length || restored.length !== FORCES.length) return;
        for (var i = 0; i < FORCES.length; i++) {
            enabled[i] = p[1].charAt(i) === "1";
            lengths[i] = restoreNumber(restored[i], lengths[i], LENGTH_RANGE, 0.5);
        }
        movingRight = p[3] === "1";
        appliedMode = restoreNumber(p[4], appliedMode, [0, APPLIED_MODES.length - 1], 1);
        lineWidth = restoreNumber(p[5], lineWidth, WIDTH_RANGE, 0.1);
        headScale = restoreNumber(p[6], headScale, HEAD_RANGE, 10);
        labelsOn = p[7] === "1";
        fontPt = restoreNumber(p[8], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[9], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[10], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[11] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
