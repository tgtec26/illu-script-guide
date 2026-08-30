// Object_AxisTickMarks.jsx
#include "Object_setdash_align_helper.jsxinc"
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 사각형 선택 → L자 축(또는 상자) + 눈금 + 숫자 + 보조선 + 축 범례 생성
// 범례는 축이 아니라 눈금 숫자의 바깥 경계를 기준으로 간격을 띄운다

(function() {
    if (app.documents.length === 0) {
        alert("문서가 열려있지 않습니다.");
        return;
    }

    var PREF_KEY = "AxisTickMarks/settings";
    // 화살표 이름은 Illustrator UI 언어를 따른다 (한국어판 기준)
    var ARROW_NAME = "화살표 1";

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length === 0) {
        alert("사각형을 선택해주세요.");
        return;
    }

    var rect = sel[0];
    if (rect.typename !== "PathItem") {
        alert("PathItem(사각형)을 선택해주세요.");
        return;
    }

    // 단위·스타일 상수
    var mmToPt = 2.834645669;
    var tickLength = 1.0 * mmToPt;
    var tickWeight = 0.4;
    var gridWeight = 0.3;
    var gridDashPattern = [2, 1];
    var axisWeight = 0.4;
    var arrowMargin = 3.0 * mmToPt;

    // 사각형 좌표 (원본은 미리보기 동안 숨겼다가 확정 시 삭제)
    var bounds = rect.geometricBounds;
    var leftX = bounds[0];
    var topY = bounds[1];
    var rightX = bounds[2];
    var bottomY = bounds[3];
    var originX = leftX;
    var originY = bottomY;
    var rectWasHidden = rect.hidden;

    var blackColor = new CMYKColor();
    blackColor.cyan = 0;
    blackColor.magenta = 0;
    blackColor.yellow = 0;
    blackColor.black = 100;

    var gridColor = new CMYKColor();
    gridColor.cyan = 0;
    gridColor.magenta = 0;
    gridColor.yellow = 0;
    gridColor.black = 80;

    var tickFont = app.textFonts.getByName("GSMediumB1");
    var legendFont = getFont("SpoqaHanSansNeo-Regular");

    // readOptions()가 채우는 옵션 값들
    var xCount = 5, yCount = 5;
    var xStart = 1, xStep = 1, yStart = 1, yStep = 1;
    var xLabelOffset = 0, yLabelOffset = 0;
    var useLegend = true, useZero = true, useArrow = true;
    var useBox = false, useXGrid = false, useYGrid = false;
    var legendAtCenter = false;
    var xLegendText = "", yLegendText = "";
    var legendGap = 1 * mmToPt;

    var previewEnabled = true;
    var previewGroup = null;

    // -------------------------------------------------------
    // ScriptUI 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "눈금 설정");

    var shapeGroup = dlg.add("group");
    shapeGroup.add("statictext", undefined, "형태:");
    var axisShapeRadio = shapeGroup.add("radiobutton", undefined, "축 2개 (L자 + 화살촉)");
    var boxShapeRadio = shapeGroup.add("radiobutton", undefined, "사각형 유지");
    axisShapeRadio.value = true;

    // 0 = 그 축에 눈금 없음
    var TICK_COUNT_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8];

    dlg.add("statictext", undefined, "Y축(왼쪽) 눈금 갯수:");
    var yGroup = dlg.add("group");
    var yBtns = [];
    for (var m = 0; m < TICK_COUNT_OPTIONS.length; m++) {
        var btn2 = yGroup.add("radiobutton", undefined, String(TICK_COUNT_OPTIONS[m]));
        if (TICK_COUNT_OPTIONS[m] === 5) btn2.value = true;
        yBtns.push(btn2);
    }

    var yValueGroup = dlg.add("group");
    yValueGroup.add("statictext", undefined, "Y축 시작 숫자:");
    var yStartInput = yValueGroup.add("edittext", undefined, "1");
    yStartInput.characters = 6;
    yValueGroup.add("statictext", undefined, "간격:");
    var yStepInput = yValueGroup.add("edittext", undefined, "1");
    yStepInput.characters = 6;

    var yOffsetGroup = dlg.add("group");
    yOffsetGroup.add("statictext", undefined, "Y축과 숫자 간격:");
    var yOffsetHalfBtn = yOffsetGroup.add("radiobutton", undefined, "0.5mm");
    var yOffsetOneBtn = yOffsetGroup.add("radiobutton", undefined, "1mm");
    yOffsetOneBtn.value = true;

    dlg.add("statictext", undefined, "X축(아래쪽) 눈금 갯수:");
    var xGroup = dlg.add("group");
    var xBtns = [];
    for (var n = 0; n < TICK_COUNT_OPTIONS.length; n++) {
        var btn = xGroup.add("radiobutton", undefined, String(TICK_COUNT_OPTIONS[n]));
        if (TICK_COUNT_OPTIONS[n] === 5) btn.value = true;
        xBtns.push(btn);
    }

    var xValueGroup = dlg.add("group");
    xValueGroup.add("statictext", undefined, "X축 시작 숫자:");
    var xStartInput = xValueGroup.add("edittext", undefined, "1");
    xStartInput.characters = 6;
    xValueGroup.add("statictext", undefined, "간격:");
    var xStepInput = xValueGroup.add("edittext", undefined, "1");
    xStepInput.characters = 6;

    var xOffsetGroup = dlg.add("group");
    xOffsetGroup.add("statictext", undefined, "X축과 숫자 간격:");
    var xOffsetHalfBtn = xOffsetGroup.add("radiobutton", undefined, "0.5mm");
    var xOffsetOneBtn = xOffsetGroup.add("radiobutton", undefined, "1mm");
    xOffsetOneBtn.value = true;

    var gridGroupRow = dlg.add("group");
    gridGroupRow.add("statictext", undefined, "보조선:");
    var xGridCheck = gridGroupRow.add("checkbox", undefined, "X축 보조선");
    var yGridCheck = gridGroupRow.add("checkbox", undefined, "Y축 보조선");

    var legendPanel = dlg.add("panel", undefined, "축 범례");
    legendPanel.orientation = "column";
    legendPanel.alignChildren = "left";
    legendPanel.margins = 10;

    var legendCheck = legendPanel.add("checkbox", undefined, "축 범례 넣기");
    legendCheck.value = true;

    var legendTextGroup = legendPanel.add("group");
    legendTextGroup.add("statictext", undefined, "X축:");
    var xLegendInput = legendTextGroup.add("edittext", undefined, "시간");
    xLegendInput.characters = 8;
    legendTextGroup.add("statictext", undefined, "Y축:");
    var yLegendInput = legendTextGroup.add("edittext", undefined, "거리");
    yLegendInput.characters = 8;

    var legendPosGroup = legendPanel.add("group");
    legendPosGroup.add("statictext", undefined, "범례 위치:");
    var legendEndRadio = legendPosGroup.add("radiobutton", undefined, "끝");
    var legendCenterRadio = legendPosGroup.add("radiobutton", undefined, "중앙");
    legendEndRadio.value = true;

    var legendGapGroup = legendPanel.add("group");
    legendGapGroup.add("statictext", undefined, "숫자와 범례 간격:");
    var legendGapDownBtn = legendGapGroup.add("button", undefined, "◀");
    legendGapDownBtn.preferredSize.width = 22;
    var legendGapInput = legendGapGroup.add("edittext", undefined, "1");
    legendGapInput.characters = 6;
    legendGapInput.justify = "center";
    var legendGapUpBtn = legendGapGroup.add("button", undefined, "▶");
    legendGapUpBtn.preferredSize.width = 22;
    legendGapGroup.add("statictext", undefined, "mm");

    var zeroCheck = legendPanel.add("checkbox", undefined, "원점에 0 넣기 (대각선 2mm)");
    zeroCheck.value = true;

    var arrowCheck = legendPanel.add("checkbox", undefined, "축 양 끝에 화살표 1 넣기");
    arrowCheck.value = true;

    var btnGroup = dlg.add("group");
    var previewCheck = btnGroup.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var btnSpacer = btnGroup.add("group");
    btnSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okBtn = btnGroup.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    btnGroup.add("button", undefined, "취소", { name: "cancel" });

    function updateArrowEnabled() {
        // 사각형 유지 모드에서는 축 끝이 없어 화살표를 붙일 수 없다
        arrowCheck.enabled = axisShapeRadio.value;
    }

    // 모든 컨트롤 변경 시 미리보기 갱신
    function onOptionChanged() {
        updateArrowEnabled();
        updatePreview();
    }

    axisShapeRadio.onClick = onOptionChanged;
    boxShapeRadio.onClick = onOptionChanged;
    for (var rb = 0; rb < yBtns.length; rb++) {
        yBtns[rb].onClick = updatePreview;
        xBtns[rb].onClick = updatePreview;
    }
    yStartInput.onChanging = updatePreview;
    yStepInput.onChanging = updatePreview;
    xStartInput.onChanging = updatePreview;
    xStepInput.onChanging = updatePreview;
    yOffsetHalfBtn.onClick = updatePreview;
    yOffsetOneBtn.onClick = updatePreview;
    xOffsetHalfBtn.onClick = updatePreview;
    xOffsetOneBtn.onClick = updatePreview;
    xGridCheck.onClick = updatePreview;
    yGridCheck.onClick = updatePreview;
    legendCheck.onClick = updatePreview;
    xLegendInput.onChanging = updatePreview;
    yLegendInput.onChanging = updatePreview;
    legendEndRadio.onClick = updatePreview;
    legendCenterRadio.onClick = updatePreview;
    legendGapInput.onChanging = updatePreview;
    legendGapDownBtn.onClick = function() { stepLegendGap(-1); };
    legendGapUpBtn.onClick = function() { stepLegendGap(1); };

    // 버튼 한 번 = 0.1mm. 0.1 격자에 맞춰 움직인다.
    function stepLegendGap(direction) {
        var value = parseNumber(legendGapInput.text);
        if (value === null) value = 1;
        value = Math.round((value + direction * 0.1) * 10) / 10;
        if (value < 0) value = 0;
        legendGapInput.text = String(value);
        updatePreview();
    }
    zeroCheck.onClick = updatePreview;
    arrowCheck.onClick = updatePreview;
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okBtn.onClick = function() {
        if (!readOptions(true)) return;
        saveSettings();
        dlg.close(1);
    };

    applySettings();
    updateArrowEnabled();

    rect.hidden = true;
    rect.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = drawAxisTicks(true);
        rect.remove();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        rect.hidden = rectWasHidden;
        rect.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 옵션 읽기
    // -------------------------------------------------------
    function readOptions(showAlert) {
        var values = [
            parseNumber(xStartInput.text),
            parseNumber(xStepInput.text),
            parseNumber(yStartInput.text),
            parseNumber(yStepInput.text)
        ];
        for (var v = 0; v < values.length; v++) {
            if (values[v] === null) {
                if (showAlert) alert("시작 숫자와 간격을 숫자로 입력해주세요.");
                return false;
            }
        }
        var gapValue = parseNumber(legendGapInput.text);
        if (legendCheck.value && gapValue === null) {
            if (showAlert) alert("숫자와 범례 간격을 숫자로 입력해주세요.");
            return false;
        }

        xStart = values[0];
        xStep = values[1];
        yStart = values[2];
        yStep = values[3];
        xCount = getSelectedCount(xBtns);
        yCount = getSelectedCount(yBtns);
        yLabelOffset = (yOffsetHalfBtn.value ? 0.5 : 1.0) * mmToPt;
        xLabelOffset = (xOffsetHalfBtn.value ? 0.5 : 1.0) * mmToPt;
        useLegend = legendCheck.value;
        useZero = zeroCheck.value;
        xLegendText = xLegendInput.text;
        yLegendText = yLegendInput.text;
        legendGap = (gapValue === null ? 1 : gapValue) * mmToPt;
        useBox = boxShapeRadio.value;
        useXGrid = xGridCheck.value;
        useYGrid = yGridCheck.value;
        useArrow = arrowCheck.value && !useBox;
        legendAtCenter = legendCenterRadio.value;
        return true;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        if (!readOptions(false)) {
            app.redraw();
            return;
        }
        previewGroup = drawAxisTicks(false);
        previewGroup.name = "AxisTickMarks Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // -------------------------------------------------------
    // 그리기. isFinal이 아니면 느린 액션(파선 정렬, 화살표)은 생략한다.
    // -------------------------------------------------------
    function drawAxisTicks(isFinal) {
        var group = doc.groupItems.add();
        group.name = "AxisTickMarks";

        var xLabelLowest = null;
        var yLabelLeftmost = null;

        // 축: L자(위쪽 끝 → 원점 → 오른쪽 끝) 또는 사각형 상자
        var axis = group.pathItems.add();
        if (useBox) {
            axis.setEntirePath([
                [originX, topY],
                [originX, originY],
                [rightX, originY],
                [rightX, topY]
            ]);
            axis.closed = true;
        } else {
            axis.setEntirePath([
                [originX, topY],
                [originX, originY],
                [rightX, originY]
            ]);
        }
        axis.stroked = true;
        axis.strokeColor = blackColor;
        axis.strokeWidth = axisWeight;
        axis.filled = false;

        // 보조선: 80K 파선. 눈금 위치를 따라 반대쪽 끝까지 긋는다
        var gridLineGroup = group.groupItems.add();
        gridLineGroup.name = "Grid Lines";

        function addGridLine(x1, y1, x2, y2) {
            var line = gridLineGroup.pathItems.add();
            line.setEntirePath([[x1, y1], [x2, y2]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = gridColor;
            line.strokeWidth = gridWeight;
            try { line.strokeDashes = gridDashPattern; } catch (e) {}
        }

        // 눈금 간격: 상자 모드는 화살표 여백이 필요 없어 모서리까지 편다
        var endMargin = useBox ? 0 : arrowMargin;
        var xSpacing = xCount > 0 ? (rightX - endMargin - originX) / xCount : 0;
        var ySpacing = yCount > 0 ? (topY - endMargin - originY) / yCount : 0;

        // 텍스트 아웃라인 기준 배치 함수
        function createAlignedLabel(text, anchorX, anchorY, alignMode) {
            var tf = doc.textFrames.add();
            tf.contents = text;
            tf.textRange.characterAttributes.size = 8;
            tf.textRange.characterAttributes.textFont = tickFont;
            tf.textRange.characterAttributes.fillColor = blackColor;
            tf.top = anchorY;
            tf.left = anchorX;

            var gb = glyphBounds(tf);
            var glyphTop = gb[1];
            var glyphRight = gb[2];
            var glyphCenterX = (gb[0] + gb[2]) / 2;
            var glyphCenterY = (gb[1] + gb[3]) / 2;

            if (alignMode === "bottom") {
                tf.top = tf.top + (anchorY - xLabelOffset - glyphTop);
                tf.left = tf.left + (anchorX - glyphCenterX);
                var placedBottom = anchorY - xLabelOffset - (glyphTop - gb[3]);
                if (xLabelLowest === null || placedBottom < xLabelLowest) xLabelLowest = placedBottom;
            } else if (alignMode === "left") {
                tf.left = tf.left + (anchorX - yLabelOffset - glyphRight);
                tf.top = tf.top + (anchorY - glyphCenterY);
                var placedLeft = anchorX - yLabelOffset - (glyphRight - gb[0]);
                if (yLabelLeftmost === null || placedLeft < yLabelLeftmost) yLabelLeftmost = placedLeft;
            }

            tf.move(group, ElementPlacement.PLACEATEND);
        }

        function createLegendText(text, font, vertical) {
            var tf = doc.textFrames.add();
            tf.contents = text;
            if (vertical) tf.orientation = TextOrientation.VERTICAL;
            var attr = tf.textRange.characterAttributes;
            if (font !== null) attr.textFont = font;
            attr.size = 8;
            attr.fillColor = blackColor;
            return tf;
        }

        // X축 눈금 (갯수 0이면 눈금 없는 축)
        for (var i = 0; xCount > 0 && i <= xCount; i++) {
            var xPos = originX + xSpacing * i;

            var tick = group.pathItems.add();
            tick.setEntirePath([[xPos, originY], [xPos, originY + tickLength]]);
            tick.stroked = true;
            tick.strokeColor = blackColor;
            tick.strokeWidth = tickWeight;
            tick.filled = false;

            if (i > 0) {
                if (useXGrid && xPos < rightX - 0.01) {
                    addGridLine(xPos, originY, xPos, topY);
                }
                createAlignedLabel(formatNumber(xStart + xStep * (i - 1)), xPos, originY, "bottom");
            }
        }

        // Y축 눈금 (갯수 0이면 눈금 없는 축)
        for (var j = 0; yCount > 0 && j <= yCount; j++) {
            var yPos = originY + ySpacing * j;

            var tick2 = group.pathItems.add();
            tick2.setEntirePath([[originX, yPos], [originX + tickLength, yPos]]);
            tick2.stroked = true;
            tick2.strokeColor = blackColor;
            tick2.strokeWidth = tickWeight;
            tick2.filled = false;

            if (j > 0) {
                if (useYGrid && yPos < topY - 0.01) {
                    addGridLine(originX, yPos, rightX, yPos);
                }
                createAlignedLabel(formatNumber(yStart + yStep * (j - 1)), originX, yPos, "left");
            }
        }

        // 축 범례: 숫자 라벨의 바깥 경계에서 지정한 간격만큼 더 바깥에 배치
        if (useLegend) {
            var xLegendBase = (xLabelLowest === null) ? (originY - xLabelOffset) : xLabelLowest;
            var yLegendBase = (yLabelLeftmost === null) ? (originX - yLabelOffset) : yLabelLeftmost;

            if (xLegendText !== "") {
                var xLegend = createLegendText(xLegendText, legendFont, false);
                var xb = glyphBounds(xLegend);
                // 끝: X축 오른쪽 끝 정렬 / 중앙: 축 가운데 정렬. 숫자줄 아래로 간격만큼
                var xLegendLeft = legendAtCenter
                    ? (originX + rightX) / 2 - (xb[2] - xb[0]) / 2
                    : rightX - (xb[2] - xb[0]);
                moveGlyphTo(xLegend, xLegendLeft, xLegendBase - legendGap);
                xLegend.move(group, ElementPlacement.PLACEATEND);
            }

            if (yLegendText !== "") {
                var yLegend = createLegendText(yLegendText, legendFont, true);
                var yb = glyphBounds(yLegend);
                // 끝: Y축 위 끝 정렬 / 중앙: 축 가운데 정렬. 숫자열 왼쪽으로 간격만큼
                var yLegendTop = legendAtCenter
                    ? (originY + topY) / 2 + (yb[1] - yb[3]) / 2
                    : topY;
                moveGlyphTo(yLegend, yLegendBase - legendGap - (yb[2] - yb[0]), yLegendTop);
                yLegend.move(group, ElementPlacement.PLACEATEND);
            }
        }

        // 원점 0: 원점에서 좌하단 45도 대각선 2mm (글자 중심 기준)
        if (useZero) {
            var zeroGap = 2 * mmToPt / Math.sqrt(2);
            var zeroText = createLegendText("0", tickFont, false);
            var zb = glyphBounds(zeroText);
            moveGlyphTo(
                zeroText,
                originX - zeroGap - (zb[2] - zb[0]) / 2,
                originY - zeroGap + (zb[1] - zb[3]) / 2
            );
            zeroText.move(group, ElementPlacement.PLACEATEND);
        }

        if (gridLineGroup.pathItems.length > 0) {
            // 파선을 모퉁이와 패스 끝에 맞춰 정렬(스트로크 패널의 두 번째 파선 옵션).
            // 액션을 거치는 느린 작업이라 미리보기에서는 생략한다.
            if (isFinal) {
                applyDashPatternToItems([gridLineGroup], gridDashPattern, false);
            }
            gridLineGroup.zOrder(ZOrderMethod.SENDTOBACK);
        } else {
            gridLineGroup.remove();
        }

        // 축 양 끝 화살표: DOM에 노출되지 않는 속성이라 액션으로 적용. 미리보기에서는 생략
        if (isFinal && useArrow) {
            applyAxisArrowheads(axis);
        }

        return group;
    }

    // -------------------------------------------------------
    // 공용 헬퍼
    // -------------------------------------------------------
    function getFont(name) {
        try {
            return app.textFonts.getByName(name);
        } catch (e) {
            return null;
        }
    }

    // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
    function glyphBounds(tf) {
        var dup = tf.duplicate();
        var outline = dup.createOutline();
        var gb = outline.geometricBounds; // [left, top, right, bottom]
        outline.remove();
        return gb;
    }

    // 글리프 경계의 (left, top)이 목표 지점에 오도록 이동
    function moveGlyphTo(tf, targetLeft, targetTop) {
        var gb = glyphBounds(tf);
        tf.translate(targetLeft - gb[0], targetTop - gb[1]);
    }

    function getSelectedCount(btns) {
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].value) return TICK_COUNT_OPTIONS[i];
        }
        return 5;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function formatNumber(value) {
        var rounded = Math.round(value * 10000) / 10000;
        return String(rounded);
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            "v6",
            getSelectedCount(yBtns),
            yStartInput.text,
            yStepInput.text,
            yOffsetHalfBtn.value ? "0.5" : "1",
            getSelectedCount(xBtns),
            xStartInput.text,
            xStepInput.text,
            xOffsetHalfBtn.value ? "0.5" : "1",
            legendCheck.value ? "1" : "0",
            xLegendInput.text,
            yLegendInput.text,
            legendGapInput.text,
            zeroCheck.value ? "1" : "0",
            arrowCheck.value ? "1" : "0",
            boxShapeRadio.value ? "1" : "0",
            legendCenterRadio.value ? "1" : "0",
            xGridCheck.value ? "1" : "0",
            yGridCheck.value ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v6" || p.length < 19) return;
        try {
            selectCount(yBtns, parseInt(p[1], 10));
            yStartInput.text = p[2];
            yStepInput.text = p[3];
            yOffsetHalfBtn.value = (p[4] === "0.5");
            yOffsetOneBtn.value = !yOffsetHalfBtn.value;
            selectCount(xBtns, parseInt(p[5], 10));
            xStartInput.text = p[6];
            xStepInput.text = p[7];
            xOffsetHalfBtn.value = (p[8] === "0.5");
            xOffsetOneBtn.value = !xOffsetHalfBtn.value;
            legendCheck.value = (p[9] === "1");
            xLegendInput.text = p[10];
            yLegendInput.text = p[11];
            if (parseNumber(p[12]) !== null) legendGapInput.text = p[12];
            zeroCheck.value = (p[13] === "1");
            arrowCheck.value = (p[14] === "1");
            boxShapeRadio.value = (p[15] === "1");
            axisShapeRadio.value = !boxShapeRadio.value;
            legendCenterRadio.value = (p[16] === "1");
            legendEndRadio.value = !legendCenterRadio.value;
            xGridCheck.value = (p[17] === "1");
            yGridCheck.value = (p[18] === "1");
        } catch (e) {}
    }

    function selectCount(btns, count) {
        for (var i = 0; i < btns.length; i++) {
            if (TICK_COUNT_OPTIONS[i] === count) {
                for (var j = 0; j < btns.length; j++) {
                    btns[j].value = (j === i);
                }
                return;
            }
        }
    }

    // -------------------------------------------------------
    // 화살표 액션
    // -------------------------------------------------------
    function applyAxisArrowheads(axisPath) {
        var actionSetName = "Codex_AxisTools";
        var actionName = "AxisArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_AxisArrowheads.aia");

        try {
            doc.selection = null;
            axisPath.selected = true;

            writeArrowheadAction(actionFile, actionSetName, actionName);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살표 이름은 UI 언어에 따라 다르다. 실패해도 축 자체는 그대로 남는다.
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

    function writeArrowheadAction(actionFile, actionSetName, actionName) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var arrow = toActionHex(ARROW_NAME);
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
        lines.push("            /value " + axisWeight);
        lines.push("            /unit 592476268");
        lines.push("        }");
        // 시작 화살표
        lines.push("        /parameter-2 {");
        lines.push("            /key 1634231345");
        lines.push("            /showInPalette -1");
        lines.push("            /type (ustring)");
        lines.push("            /value [ " + arrow.length);
        lines.push("                " + arrow.hex);
        lines.push("            ]");
        lines.push("        }");
        // 끝 화살표
        lines.push("        /parameter-3 {");
        lines.push("            /key 1634231346");
        lines.push("            /showInPalette -1");
        lines.push("            /type (ustring)");
        lines.push("            /value [ " + arrow.length);
        lines.push("                " + arrow.hex);
        lines.push("            ]");
        lines.push("        }");
        // 시작/끝 화살표 크기 100%
        lines.push("        /parameter-4 {");
        lines.push("            /key 1634951985");
        lines.push("            /showInPalette -1");
        lines.push("            /type (real)");
        lines.push("            /value 100.0");
        lines.push("        }");
        lines.push("        /parameter-5 {");
        lines.push("            /key 1634951986");
        lines.push("            /showInPalette -1");
        lines.push("            /type (real)");
        lines.push("            /value 100.0");
        lines.push("        }");
        // 화살표 정렬: 패스 끝의 팁
        lines.push("        /parameter-6 {");
        lines.push("            /key 1634230636");
        lines.push("            /showInPalette -1");
        lines.push("            /type (enumerated)");
        lines.push("            /name [ 17");
        lines.push("                ED8CA8EC8AA420EB819DEC9D9820ED8C81");
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
