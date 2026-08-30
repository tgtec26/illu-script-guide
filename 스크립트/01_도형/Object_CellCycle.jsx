/*
  Illustrator Script: Cell Cycle Diagram
  Description: 세포 주기 도넛 다이어그램을 만든다.
               외경·내경, 4구간의 비율(%)과 제목, 내경을 도는 흰색 화살표를 다이얼로그로 조절한다.
*/

#include "Object_expand_arrow_helper.jsxinc"
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}


(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    var doc = app.activeDocument;

    var MM_TO_PT = 2.83464567;
    var LINE_WIDTH = 0.3;              // 외경 원·분할선·화살표 테두리 굵기(pt)
    var CENTER_TEXT = "세포\r주기";
    var CENTER_FONT_SIZE = 8;
    var LABEL_FONT_SIZE = 8;           // G1기 · S기 · G2기 · M기
    var CIRCLED_FONT_SIZE = 9;         // ㉠ ㉡ ㉢
    var SECTOR_COUNT = 4;
    var PREF_KEY = "ObjectCellCycle/settings";

    var SUB1 = String.fromCharCode(0x2081);
    var SUB2 = String.fromCharCode(0x2082);

    // display: 다이얼로그 라디오 표시, contents: 실제로 삽입되는 문자
    // subscriptIndex: 아래 첨자로 내릴 문자 위치(없으면 -1), circled: 원문자(바탕체) 여부
    var LABEL_CHOICES = [
        {display: "G" + SUB1 + "기", contents: "G1기", subscriptIndex: 1, circled: false},
        {display: "S기", contents: "S기", subscriptIndex: -1, circled: false},
        {display: "G" + SUB2 + "기", contents: "G2기", subscriptIndex: 1, circled: false},
        {display: "M기", contents: "M기", subscriptIndex: -1, circled: false},
        {display: String.fromCharCode(0x3260), contents: String.fromCharCode(0x3260), subscriptIndex: -1, circled: true},
        {display: String.fromCharCode(0x3261), contents: String.fromCharCode(0x3261), subscriptIndex: -1, circled: true},
        {display: String.fromCharCode(0x3262), contents: String.fromCharCode(0x3262), subscriptIndex: -1, circled: true}
    ];

    var korFont = getFont("SpoqaHanSansNeo-Regular");
    var engFont = getFont("GSMediumB1");
    var circledFont = getFont("Batang");

    var outerMm = 40;
    var innerMm = 16;
    var percents = [40, 30, 20, 10];
    var labelIndexes = [0, 1, 2, 3];
    var arrowWidthPt = 3;
    var arrowScale = 200;
    var gapDeg = 6;
    var previewEnabled = true;
    var previewGroup = null;

    applySavedSettings();

    var LABEL_WIDTH = 66;
    var SLIDER_WIDTH = 150;

    var dlg = new Window("dialog", "세포 주기");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var sizePanel = addPanel(dlg, "크기");
    var outerControls = addValueRow(sizePanel, "외경", "mm", outerMm, 5, 200, 0.5, 2);
    var innerControls = addValueRow(sizePanel, "내경", "mm", innerMm, 1, 199.5, 0.5, 2);

    var sectorPanel = addPanel(dlg, "구간 (12시부터 시계 방향)");
    var sectorInputs = [];
    for (var s = 0; s < SECTOR_COUNT; s++) {
        var sectorRow = sectorPanel.add("group");
        sectorRow.alignChildren = ["left", "center"];
        var sectorLabel = sectorRow.add("statictext", undefined, "구간 " + (s + 1));
        sectorLabel.preferredSize.width = LABEL_WIDTH;
        var percentInput = sectorRow.add("edittext", undefined, formatNumber(percents[s], 1));
        percentInput.characters = 5;
        percentInput.justify = "right";
        sectorRow.add("statictext", undefined, "%");
        sectorInputs.push(percentInput);

        var radioGroup = sectorRow.add("group");
        radioGroup.alignChildren = ["left", "center"];
        radioGroup.spacing = 4;
        for (var c = 0; c < LABEL_CHOICES.length; c++) {
            var radio = radioGroup.add("radiobutton", undefined, LABEL_CHOICES[c].display);
            radio.value = (labelIndexes[s] === c);
            radio.onClick = makeLabelHandler(s, c);
        }

        sectorInputs[s].onChange = makePercentHandler(s);
    }
    var totalRow = sectorPanel.add("group");
    var totalText = totalRow.add("statictext", undefined, "");
    totalText.preferredSize.width = 260;

    var arrowPanel = addPanel(dlg, "내부 화살표");
    var arrowWidthControls = addValueRow(arrowPanel, "굵기", "pt", arrowWidthPt, 0.5, 30, 0.5, 1);
    var arrowScaleControls = addValueRow(arrowPanel, "화살촉 크기", "%", arrowScale, 10, 800, 1, 0);
    var gapControls = addValueRow(arrowPanel, "간격", "°", gapDeg, 0, 60, 1, 0);
    var arrowNote = arrowPanel.add("statictext", undefined, "미리보기는 슬라이더를 놓는 순간 화살촉까지 그립니다 (흰색 채움은 확인 후 적용).");
    arrowNote.preferredSize.width = 380;

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(outerControls,
        function() { return outerMm; },
        function(value) {
            outerMm = value;
            limitInnerDiameter();
        });
    bindValueRow(innerControls,
        function() { return innerMm; },
        function(value) { innerMm = value; });
    bindValueRow(arrowWidthControls,
        function() { return arrowWidthPt; },
        function(value) { arrowWidthPt = value; });
    bindValueRow(arrowScaleControls,
        function() { return arrowScale; },
        function(value) { arrowScale = value; });
    bindValueRow(gapControls,
        function() { return gapDeg; },
        function(value) { gapDeg = value; });

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        if (innerMm >= outerMm) {
            alert("내경은 외경보다 작아야 합니다.");
            return;
        }
        if (getPercentTotal() <= 0) {
            alert("구간 비율은 0보다 큰 값으로 입력해주세요.");
            return;
        }
        saveSettings();
        dlg.close(1);
    };

    cancelButton.onClick = function() {
        dlg.close(0);
    };

    limitInnerDiameter();
    updateTotalText();
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = buildDiagram(true, true);
        finalGroup.name = "Cell Cycle";
        doc.selection = null;
        try { finalGroup.selected = true; } catch (e) {}
    }
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    // 화살촉은 액션으로만 붙일 수 있어 느리다. 슬라이더를 끄는 동안(withArrowheads=false)은
    // 굵기만 보여주고, 손을 뗀 순간 화살촉까지 그린다.
    function updatePreview(withArrowheads) {
        clearPreview();
        updateTotalText();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = buildDiagram(withArrowheads !== false, false);
        previewGroup.name = "Cell Cycle Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // -------------------------------------------------------
    // 도형 생성
    // -------------------------------------------------------
    // withArrowheads: 화살촉 액션을 적용할지, expandArrows: 면으로 확장·병합해 흰색으로 채울지
    function buildDiagram(withArrowheads, expandArrows) {
        var center = getViewCenter();
        var cx = center[0];
        var cy = center[1];
        var outerR = outerMm * MM_TO_PT / 2;
        var innerR = innerMm * MM_TO_PT / 2;
        var black = makeBlackColor();

        var group = doc.groupItems.add();

        var outerCircle = group.pathItems.ellipse(cy + outerR, cx - outerR, outerR * 2, outerR * 2);
        applyOutline(outerCircle, black, LINE_WIDTH);

        var bounds = getSectorBounds();
        for (var i = 0; i < SECTOR_COUNT; i++) {
            var divisionLine = makeLine(group,
                cx + innerR * Math.cos(bounds[i]), cy + innerR * Math.sin(bounds[i]),
                cx + outerR * Math.cos(bounds[i]), cy + outerR * Math.sin(bounds[i]));
            applyOutline(divisionLine, black, LINE_WIDTH);
        }

        var labelRadius = (innerR + outerR) / 2;
        for (var j = 0; j < SECTOR_COUNT; j++) {
            var midAngle = bounds[j] + (bounds[j + 1] - bounds[j]) / 2;
            addLabelText(group, LABEL_CHOICES[labelIndexes[j]],
                cx + labelRadius * Math.cos(midAngle),
                cy + labelRadius * Math.sin(midAngle));
        }

        addCenterText(group, cx, cy);

        // 화살표는 마지막에 그려 분할선 위를 덮는다
        var arcs = [];
        for (var k = 0; k < SECTOR_COUNT; k++) {
            var sweep = bounds[k + 1] - bounds[k];
            var gap = Math.min(gapDeg * Math.PI / 180, Math.abs(sweep) * 0.8);
            var start = bounds[k] - gap / 2;
            var arc = makeArcPath(group, cx, cy, innerR, start, sweep + gap);
            applyOutline(arc, black, arrowWidthPt);
            arcs.push(arc);
        }

        if (withArrowheads) {
            applyArrowheadAction(arcs);
        }
        if (expandArrows) {
            outlineArrows(group, arcs);
        }

        return group;
    }

    // 12시에서 시작해 시계 방향으로 도는 구간 경계 각도(라디안). 길이는 구간 수 + 1.
    function getSectorBounds() {
        var total = getPercentTotal();
        var bounds = [Math.PI / 2];
        var cumulative = 0;
        for (var i = 0; i < SECTOR_COUNT; i++) {
            cumulative += percents[i];
            bounds.push(Math.PI / 2 - (cumulative / total) * Math.PI * 2);
        }
        return bounds;
    }

    function makeLine(group, x1, y1, x2, y2) {
        var path = group.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        return path;
    }

    // 90°마다 나눈 베지어 호의 점 목록. 부호가 있는 sweep이 진행 방향(음수=시계 방향)을 정한다.
    function arcPoints(cx, cy, radius, startAngle, sweep) {
        var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 0.000001));
        var step = sweep / count;
        var handleScale = 4 / 3 * Math.tan(step / 4);
        var points = [];
        for (var i = 0; i <= count; i++) {
            var angle = startAngle + step * i;
            var anchor = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
            var tangent = [-radius * Math.sin(angle) * handleScale, radius * Math.cos(angle) * handleScale];
            points.push({
                anchor: anchor,
                left: [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: [anchor[0] + tangent[0], anchor[1] + tangent[1]]
            });
        }
        return points;
    }

    function buildPathFromPoints(group, points, closed) {
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        var path = group.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = closed;
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.anchor = points[j].anchor;
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = points[j].corner ? PointType.CORNER : PointType.SMOOTH;
        }
        return path;
    }

    function makeArcPath(group, cx, cy, radius, startAngle, sweep) {
        return buildPathFromPoints(group, arcPoints(cx, cy, radius, startAngle, sweep), false);
    }

    function applyOutline(pathItem, color, width) {
        pathItem.filled = false;
        pathItem.stroked = true;
        pathItem.strokeColor = color;
        pathItem.strokeWidth = width;
        pathItem.strokeCap = StrokeCap.BUTTENDCAP;
        pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        pathItem.strokeDashes = [];
    }

    // -------------------------------------------------------
    // 문자
    // -------------------------------------------------------
    function addLabelText(group, choice, x, y) {
        var frame = group.textFrames.add();
        frame.contents = choice.contents;
        if (choice.circled) {
            applyFontToRange(frame.textRange, circledFont, CIRCLED_FONT_SIZE, 0);
        } else {
            applyKoEnFont(frame, LABEL_FONT_SIZE);
            if (choice.subscriptIndex >= 0) {
                try {
                    frame.characters[choice.subscriptIndex].characterAttributes.baselinePosition =
                        FontBaselineOption.SUBSCRIPT;
                } catch (e) {}
            }
        }
        centerFrame(frame, x, y);
        return frame;
    }

    function addCenterText(group, x, y) {
        var frame = group.textFrames.add();
        frame.contents = CENTER_TEXT;
        applyFontToRange(frame.textRange, korFont, CENTER_FONT_SIZE, 0);
        try { frame.textRange.paragraphAttributes.justification = Justification.CENTER; } catch (e) {}
        centerFrame(frame, x, y);
        return frame;
    }

    // Text_koen과 같은 규칙: 한글·공백은 스포카한산스, 나머지는 GSMedium + 기준선 0.5pt
    function applyKoEnFont(frame, size) {
        for (var i = 0; i < frame.characters.length; i++) {
            var character = frame.characters[i];
            var text = character.contents;
            var code = text.charCodeAt(0);
            var isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
            var isSpace = (text === " " || code === 32 || code === 160);
            if (isKorean || isSpace) {
                applyFontToRange(character, korFont, size, 0);
            } else {
                applyFontToRange(character, engFont, size, 0.5);
            }
        }
    }

    function applyFontToRange(range, font, size, baselineShift) {
        try { range.characterAttributes.size = size; } catch (e) {}
        try { range.characterAttributes.textFont = font; } catch (e2) {}
        try { range.characterAttributes.baselineShift = baselineShift; } catch (e3) {}
    }

    function centerFrame(frame, x, y) {
        try {
            frame.position = [x - frame.width / 2, y + frame.height / 2];
        } catch (e) {}
    }

    function getFont(name) {
        try {
            return app.textFonts.getByName(name);
        } catch (e) {
            return app.textFonts[0];
        }
    }

    // -------------------------------------------------------
    // 화살촉 · 확장
    // -------------------------------------------------------
    // 화살촉은 DOM에 없어 임시 액션으로 적용한다 (AGENTS.md 참고)
    function applyArrowheadAction(paths) {
        var actionSetName = "Codex_CellCycle";
        var actionName = "CellCycleArrow";
        var actionFile = new File(Folder.temp + "/Codex_CellCycleArrow.aia");
        var locale = getAppLocale();
        var isKorean = locale === "" || locale.indexOf("ko") === 0;
        var arrowName = isKorean ? "화살표 3" : "Arrow 3";

        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) {
                paths[i].selected = true;
            }
            removeActionSetIfLoaded(actionSetName);
            writeArrowheadAction(actionFile, actionSetName, actionName, arrowName);
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (e) {
            // 화살표 이름은 UI 언어를 따른다. 실패해도 호 자체는 그대로 남는다.
        }

        removeActionSetIfLoaded(actionSetName);
        try { actionFile.remove(); } catch (e2) {}
        doc.selection = null;
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, arrowName) {
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
        lines.push("        /parameterCount 5");
        addUnitRealParameter(lines, 1, 2003072104, arrowWidthPt);
        addUStringParameter(lines, 2, 1634231345, getNoneArrowName());
        addUStringParameter(lines, 3, 1634231346, arrowName);
        addRealParameter(lines, 4, 1634951986, arrowScale);
        addEnumeratedParameter(lines, 5, 1634230636, "패스 끝의 팁", 0);
        lines.push("    }");
        lines.push("}");

        writeActionFile(actionFile, lines);
    }

    // 손으로 만들 때와 같은 순서: 모양 확장(화살촉을 패스로) → 확장(획을 면으로) → 병합.
    // 화살표를 하나씩 처리해야 병합 대상이 그 화살표의 몸통과 화살촉으로만 좁혀진다.
    // 여러 개를 한꺼번에 확장하면 선택 항목이 전체 조각의 목록이 되어 병합이 헛돈다.
    function outlineArrows(group, paths) {
        for (var i = 0; i < paths.length; i++) {
            doc.selection = null;
            try {
                paths[i].selected = true;
            } catch (e) {
                continue;
            }

            // 모양 확장: 화살촉이 패스가 되고 몸통은 획인 채로 그룹에 묶인다
            try {
                app.executeMenuCommand("expandStyle");
            } catch (expandError) {
                continue;
            }

            // 확장(획 → 면). 메뉴 명령("outline", "OffsetPath v22", "Expand3")과
            // 임시 .aia 재현은 먹히지 않았고, 설치된 확장 액션 클릭은 잘 되는 것을 확인함.
            // setup이 모든 기기에 등록하는 그 액션(최종훈 > 확장)을 직접 호출한다.
            applyExpandAction();

            // 병합. 메뉴 명령(Live Pathfinder Add)은 이 환경에서 먹히지 않아
            // 확장과 같은 방식으로 설치된 액션(최종훈 > 도형 합치기)을 호출한다.
            try {
                app.doScript("도형 합치기", "최종훈");
            } catch (uniteError) {
                alert("액션 팔레트에서 '최종훈 > 도형 합치기' 액션을 찾을 수 없습니다.\n" +
                    "00_세팅의 setup을 다시 실행한 뒤 스크립트를 사용해주세요.\n" +
                    "화살촉과 몸통은 병합되지 않은 상태로 남습니다.");
            }

            var united = snapshotSelection();
            for (var k = 0; k < united.length; k++) {
                applyArrowFill(united[k]);
                try { united[k].move(group, ElementPlacement.PLACEATBEGINNING); } catch (moveError) {}
            }
        }

        doc.selection = null;
    }

    // Object > 확장. setup(00_세팅)이 액션 팔레트에 등록해 두는 "최종훈 > 확장" 액션을
    // 그대로 호출한다 (확장 + 그룹 풀기). 임시 .aia로 재현한 ai_plugin_expand는
    // 먹히지 않았고, 설치된 액션은 정상 동작하는 것을 확인함.
    function applyExpandAction() {
        try {
            app.doScript("확장", "최종훈");
        } catch (e) {
            alert("액션 팔레트에서 '최종훈 > 확장' 액션을 찾을 수 없습니다.\n" +
                "00_세팅의 setup을 다시 실행한 뒤 스크립트를 사용해주세요.\n" +
                "화살표는 확장되지 않은 획 상태로 남습니다.");
        }
    }

    function snapshotSelection() {
        var items = [];
        try {
            for (var i = 0; i < doc.selection.length; i++) {
                items.push(doc.selection[i]);
            }
        } catch (e) {}
        return items;
    }

    function applyArrowFill(item) {
        var white = makeWhiteColor(doc);
        var black = makeBlackColor();
        var parts = [];
        collectPathItems(item, parts);
        for (var i = 0; i < parts.length; i++) {
            // 확장이 실패해 열린 획으로 남은 패스는 건드리지 않는다.
            // 흰색 면 + 0.3pt로 덮으면 실패가 얇은 선처럼 보여 원인을 찾기 어렵다.
            try { if (!parts[i].closed) continue; } catch (closedError) {}
            try {
                parts[i].filled = true;
                parts[i].fillColor = white;
                parts[i].stroked = true;
                parts[i].strokeColor = black;
                parts[i].strokeWidth = LINE_WIDTH;
                parts[i].strokeCap = StrokeCap.BUTTENDCAP;
                parts[i].strokeJoin = StrokeJoin.ROUNDENDJOIN;
                parts[i].strokeDashes = [];
            } catch (styleError) {}
        }
    }

    function makeBlackColor() {
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

    function getViewCenter() {
        try {
            var view = doc.activeView ? doc.activeView : doc.views[0];
            return [view.centerPoint[0], view.centerPoint[1]];
        } catch (e) {
            return [0, 0];
        }
    }

    // -------------------------------------------------------
    // 다이얼로그 도우미
    // -------------------------------------------------------
    function makeLabelHandler(sectorIndex, choiceIndex) {
        return function() {
            labelIndexes[sectorIndex] = choiceIndex;
            updatePreview();
        };
    }

    function makePercentHandler(sectorIndex) {
        return function() {
            var value = parseNumber(sectorInputs[sectorIndex].text);
            if (value === null || value <= 0) value = percents[sectorIndex];
            percents[sectorIndex] = clamp(value, 0.1, 100);
            sectorInputs[sectorIndex].text = formatNumber(percents[sectorIndex], 1);
            updatePreview();
        };
    }

    function getPercentTotal() {
        var total = 0;
        for (var i = 0; i < SECTOR_COUNT; i++) total += percents[i];
        return total;
    }

    function updateTotalText() {
        var total = getPercentTotal();
        var message = "합계 " + formatNumber(total, 1) + "%";
        if (Math.abs(total - 100) > 0.05) {
            message += " (100%가 아니므로 비율대로 나눕니다)";
        }
        totalText.text = message;
    }

    // 내경은 외경보다 항상 작게 유지한다
    function limitInnerDiameter() {
        var maxInner = Math.max(0.5, outerMm - 0.5);
        innerControls.max = maxInner;
        try { innerControls.slider.maxvalue = maxInner; } catch (e) {}
        if (innerMm > maxInner) {
            innerMm = maxInner;
            innerControls.input.text = formatNumber(innerMm, 2);
            try { innerControls.slider.value = innerMm; } catch (e2) {}
        }
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨 · 입력칸 · 단위 · ◀ · 슬라이더 · ▶ 를 한 줄에 배치
    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label);
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "right";
        var unitText = row.add("statictext", undefined, unit);
        unitText.preferredSize.width = 18;
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = 22;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = 22;
        return {
            row: row, input: input, slider: slider, down: down, up: up,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value, withArrowheads) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview(withArrowheads);
        }
        // 끄는 동안은 가벼운 미리보기, 손을 뗀 뒤(onChange)에 화살촉까지 그린다
        controls.slider.onChanging = function() { commit(controls.slider.value, false); };
        controls.slider.onChange = function() { commit(controls.slider.value, true); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value, true);
        };
        controls.down.onClick = function() { commit(getter() - controls.step, true); };
        controls.up.onClick = function() { commit(getter() + controls.step, true); };
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(/[^0-9.\-]/g, ""));
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
    // 옵션 저장
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", outerMm, innerMm];
        for (var i = 0; i < SECTOR_COUNT; i++) parts.push(percents[i]);
        for (var j = 0; j < SECTOR_COUNT; j++) parts.push(labelIndexes[j]);
        parts.push(arrowWidthPt, arrowScale, gapDeg);
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 14) return;
        outerMm = restoreNumber(p[1], outerMm, 5, 200);
        innerMm = restoreNumber(p[2], innerMm, 1, 199.5);
        if (innerMm >= outerMm) innerMm = Math.max(1, outerMm - 0.5);
        for (var i = 0; i < SECTOR_COUNT; i++) {
            percents[i] = restoreNumber(p[3 + i], percents[i], 0.1, 100);
        }
        for (var j = 0; j < SECTOR_COUNT; j++) {
            labelIndexes[j] = Math.round(restoreNumber(p[7 + j], labelIndexes[j], 0, LABEL_CHOICES.length - 1));
        }
        arrowWidthPt = restoreNumber(p[11], arrowWidthPt, 0.5, 30);
        arrowScale = restoreNumber(p[12], arrowScale, 10, 800);
        gapDeg = restoreNumber(p[13], gapDeg, 0, 60);
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
