// Object_AxisTickMarks.jsx
// 사각형 선택 → 윗선/오른쪽선 삭제 → 아래선/왼쪽선(0.8pt) + 화살표 + 눈금 + 숫자 생성

(function() {
    if (app.documents.length === 0) {
        alert("문서가 열려있지 않습니다.");
        return;
    }

    var PREF_KEY = "AxisTickMarks/settings";

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

    // -------------------------------------------------------
    // ScriptUI 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "눈금 설정");

    dlg.add("statictext", undefined, "Y축(왼쪽) 눈금 갯수:");
    var yGroup = dlg.add("group");
    var yBtns = [];
    for (var m = 2; m <= 9; m++) {
        var btn2 = yGroup.add("radiobutton", undefined, m.toString());
        if (m === 5) btn2.value = true;
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
    for (var n = 2; n <= 9; n++) {
        var btn = xGroup.add("radiobutton", undefined, n.toString());
        if (n === 5) btn.value = true;
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

    var btnGroup = dlg.add("group");
    var okBtn = btnGroup.add("button", undefined, "확인", { name: "ok" });
    btnGroup.add("button", undefined, "취소", { name: "cancel" });

    var xStart = 1, xStep = 1, yStart = 1, yStep = 1;

    applySettings();

    okBtn.onClick = function() {
        var values = [
            parseNumber(xStartInput.text),
            parseNumber(xStepInput.text),
            parseNumber(yStartInput.text),
            parseNumber(yStepInput.text)
        ];
        for (var v = 0; v < values.length; v++) {
            if (values[v] === null) {
                alert("시작 숫자와 간격을 숫자로 입력해주세요.");
                return;
            }
        }
        xStart = values[0];
        xStep = values[1];
        yStart = values[2];
        yStep = values[3];
        saveSettings();
        dlg.close(1);
    };

    if (dlg.show() !== 1) return;

    var xCount = 0, yCount = 0;
    for (var a = 0; a < xBtns.length; a++) {
        if (xBtns[a].value) { xCount = a + 2; break; }
    }
    for (var b = 0; b < yBtns.length; b++) {
        if (yBtns[b].value) { yCount = b + 2; break; }
    }
    var yLabelOffsetMm = yOffsetHalfBtn.value ? 0.5 : 1.0;
    var xLabelOffsetMm = xOffsetHalfBtn.value ? 0.5 : 1.0;

    function getSelectedCount(btns) {
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].value) return i + 2;
        }
        return 5;
    }

    function saveSettings() {
        var parts = [
            "v2",
            getSelectedCount(yBtns),
            yStartInput.text,
            yStepInput.text,
            yOffsetHalfBtn.value ? "0.5" : "1",
            getSelectedCount(xBtns),
            xStartInput.text,
            xStepInput.text,
            xOffsetHalfBtn.value ? "0.5" : "1"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length < 9) return;
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
        } catch (e) {}
    }

    function selectCount(btns, count) {
        if (!(count >= 2 && count <= 9)) return;
        for (var i = 0; i < btns.length; i++) {
            btns[i].value = (i + 2 === count);
        }
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

    // 단위 변환
    var mmToPt = 2.834645669;
    var tickLength = 1.0 * mmToPt;
    var tickWeight = 0.4;
    var axisWeight = 0.4;
    var endMargin = 3.0 * mmToPt;
    var xLabelOffset = xLabelOffsetMm * mmToPt;
    var yLabelOffset = yLabelOffsetMm * mmToPt;

    // 사각형 좌표 저장 후 삭제
    var bounds = rect.geometricBounds;
    var leftX = bounds[0];
    var topY = bounds[1];
    var rightX = bounds[2];
    var bottomY = bounds[3];

    var originX = leftX;
    var originY = bottomY;

    rect.remove();

    // 색상
    var blackColor = new CMYKColor();
    blackColor.cyan = 0;
    blackColor.magenta = 0;
    blackColor.yellow = 0;
    blackColor.black = 100;

    // 그룹 생성
    var group = doc.groupItems.add();
    group.name = "AxisTickMarks";

    // -------------------------------------------------------
    // X축 + Y축: 하나의 L자형 패스로 원점에서 연결
    // 위쪽 끝 → 원점 → 오른쪽 끝
    // -------------------------------------------------------
    var axis = group.pathItems.add();
    axis.setEntirePath([
        [originX, topY],       // Y축 위쪽 끝
        [originX, originY],    // 원점
        [rightX, originY]      // X축 오른쪽 끝
    ]);
    axis.stroked = true;
    axis.strokeColor = blackColor;
    axis.strokeWidth = axisWeight;
    axis.filled = false;

    // -------------------------------------------------------
    // 눈금 간격 계산
    // -------------------------------------------------------
    var xEnd = rightX - endMargin;
    var xSpacing = (xEnd - originX) / xCount;

    var yEnd = topY - endMargin;
    var ySpacing = (yEnd - originY) / yCount;

    var tickFont = app.textFonts.getByName("GSMediumB1");

    // 텍스트 아웃라인 기준 배치 함수
    function createAlignedLabel(text, anchorX, anchorY, alignMode) {
        var tf = doc.textFrames.add();
        tf.contents = text;
        tf.textRange.characterAttributes.size = 8;
        tf.textRange.characterAttributes.textFont = tickFont;
        tf.textRange.characterAttributes.fillColor = blackColor;
        tf.top = anchorY;
        tf.left = anchorX;

        var tfCopy = tf.duplicate();
        var outlined = tfCopy.createOutline();
        var gb = outlined.geometricBounds;
        var glyphTop = gb[1];
        var glyphRight = gb[2];
        var glyphCenterX = (gb[0] + gb[2]) / 2;
        var glyphCenterY = (gb[1] + gb[3]) / 2;

        outlined.remove();

        if (alignMode === "bottom") {
            tf.top = tf.top + (anchorY - xLabelOffset - glyphTop);
            tf.left = tf.left + (anchorX - glyphCenterX);
        }
        else if (alignMode === "left") {
            tf.left = tf.left + (anchorX - yLabelOffset - glyphRight);
            tf.top = tf.top + (anchorY - glyphCenterY);
        }

        tf.move(group, ElementPlacement.PLACEATEND);
    }

    // X축 눈금 생성
    for (var i = 0; i <= xCount; i++) {
        var xPos = originX + xSpacing * i;

        var tick = group.pathItems.add();
        tick.setEntirePath([[xPos, originY], [xPos, originY + tickLength]]);
        tick.stroked = true;
        tick.strokeColor = blackColor;
        tick.strokeWidth = tickWeight;
        tick.filled = false;

        if (i > 0) {
            createAlignedLabel(formatNumber(xStart + xStep * (i - 1)), xPos, originY, "bottom");
        }
    }

    // Y축 눈금 생성
    for (var j = 0; j <= yCount; j++) {
        var yPos = originY + ySpacing * j;

        var tick2 = group.pathItems.add();
        tick2.setEntirePath([[originX, yPos], [originX + tickLength, yPos]]);
        tick2.stroked = true;
        tick2.strokeColor = blackColor;
        tick2.strokeWidth = tickWeight;
        tick2.filled = false;

        if (j > 0) {
            createAlignedLabel(formatNumber(yStart + yStep * (j - 1)), originX, yPos, "left");
        }
    }

    doc.selection = null;
})();
