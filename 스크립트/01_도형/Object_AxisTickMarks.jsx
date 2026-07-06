// Object_AxisTickMarks.jsx
// 사각형 선택 → 윗선/오른쪽선 삭제 → 아래선/왼쪽선(0.8pt) + 화살표 + 눈금 + 숫자 생성

(function() {
    if (app.documents.length === 0) {
        alert("문서가 열려있지 않습니다.");
        return;
    }

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

    dlg.add("statictext", undefined, "X축(아래쪽) 눈금 갯수:");
    var xGroup = dlg.add("group");
    var xBtns = [];
    for (var n = 2; n <= 9; n++) {
        var btn = xGroup.add("radiobutton", undefined, n.toString());
        if (n === 5) btn.value = true;
        xBtns.push(btn);
    }

    dlg.add("statictext", undefined, "Y축(왼쪽) 눈금 갯수:");
    var yGroup = dlg.add("group");
    var yBtns = [];
    for (var m = 2; m <= 9; m++) {
        var btn2 = yGroup.add("radiobutton", undefined, m.toString());
        if (m === 5) btn2.value = true;
        yBtns.push(btn2);
    }

    var btnGroup = dlg.add("group");
    btnGroup.add("button", undefined, "확인", { name: "ok" });
    btnGroup.add("button", undefined, "취소", { name: "cancel" });

    if (dlg.show() !== 1) return;

    var xCount = 0, yCount = 0;
    for (var a = 0; a < xBtns.length; a++) {
        if (xBtns[a].value) { xCount = a + 2; break; }
    }
    for (var b = 0; b < yBtns.length; b++) {
        if (yBtns[b].value) { yCount = b + 2; break; }
    }

    // 단위 변환
    var mmToPt = 2.834645669;
    var tickLength = 1.0 * mmToPt;
    var tickWeight = 0.4;
    var axisWeight = 0.4;
    var endMargin = 3.0 * mmToPt;
    var labelOffset = 1.0 * mmToPt;

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
            tf.top = tf.top + (anchorY - labelOffset - glyphTop);
            tf.left = tf.left + (anchorX - glyphCenterX);
        }
        else if (alignMode === "left") {
            tf.left = tf.left + (anchorX - labelOffset - glyphRight);
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
            createAlignedLabel(i.toString(), xPos, originY, "bottom");
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
            createAlignedLabel(j.toString(), originX, yPos, "left");
        }
    }

    doc.selection = null;
})();
