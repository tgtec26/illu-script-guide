#target Illustrator

/*
  Object_CircuitSymbol.jsx
  기능: 선택한 직선(앵커 2개)의 정중앙에 회로 기호를 삽입합니다.
        라인은 기호 폭만큼 잘리고, 수평/수직/사선 방향에 맞게 기호가 회전됩니다.
  기호: 저항, 직렬 전지, 교류 전원, 열린 스위치, 닫힌 스위치, 인덕터(코일), 축전기, 전류계, 전압계
  사용법: 직선 하나를 선택한 뒤 실행하세요.
*/

(function () {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!sel || sel.typename === "TextRange" || sel.length !== 1 ||
        sel[0].typename !== "PathItem" || sel[0].pathPoints.length !== 2) {
        alert("직선(앵커 2개짜리 패스) 하나를 선택하고 실행해주세요.");
        return;
    }
    var line = sel[0];

    var MM = 2.834645669;   // 1mm = 2.834645669pt

    // ===== 크기 설정 — 필요하면 여기 숫자만 조정 =====
    var CFG = {
        fontName: "GSMediumB1",
        textSize: 8,

        resistorHalf: 2 * MM,       // 저항 전체 폭 4mm의 절반
        resistorAmp: 0.75 * MM,     // 진폭 (전체 높이 1.5mm의 절반)
        resistorStroke: 0.5,

        batteryLongHalf: 1.5 * MM,  // 긴 극판 높이 3mm의 절반
        batteryShortHalf: 0.75 * MM,// 짧은 극판 높이 1.5mm의 절반
        batterySpacing: 0.6 * MM,   // 두 극판 사이 간격 0.6mm
        batteryLongStroke: 0.5,
        batteryShortStroke: 1.0,

        acRadius: 2 * MM,           // 원 지름 4mm의 절반
        acCircleStroke: 0.3,
        acWaveHalf: 1.6 * MM,       // 물결 폭의 절반 (SVG 모양을 이 폭에 맞춰 축소)
        acWaveStroke: 0.5,

        switchHalf: 1.75 * MM,  // 접점 사이 거리 3.5mm의 절반
        switchContactR: 1.1,
        switchContactStroke: 0.3,
        switchLeverStroke: 0.5,
        switchOpenAngle: 25,    // 열린 스위치 레버 각도(도)

        coilBumps: 4,           // 위쪽 반원 개수
        coilRadius: 0.75 * MM,  // 코일 반지름 (전체 높이 1.5mm = 2r)
        coilAdvance: 2.5 * MM / (7 * Math.PI), // 전진량 (전체 폭 4mm = 7aπ + 2r*2)
        coilStroke: 0.3,

        capHalfGap: 0.35 * MM,  // 극판 사이 간격 0.7mm의 절반
        capPlateHalf: 1.5 * MM, // 극판 높이 3mm의 절반
        capStroke: 0.5,

        meterRadius: 2 * MM,    // 원 지름 4mm의 절반
        meterStroke: 0.3,
        meterUnderlineStroke: 0.3,
        meterUnderlineGap: 0.4 * MM  // 글자 하단과 밑줄 사이 간격
    };

    var SYMBOLS = [
        { key: "resistor",     label: "저항" },
        { key: "battery",      label: "직렬 전지" },
        { key: "ac",           label: "교류 전원" },
        { key: "switchOpen",   label: "열린 스위치" },
        { key: "switchClosed", label: "닫힌 스위치" },
        { key: "inductor",     label: "인덕터(코일)" },
        { key: "capacitor",    label: "축전기" },
        { key: "ammeterDC",    label: "전류계(직류) A" },
        { key: "voltmeterDC",  label: "전압계(직류) V" },
        { key: "ammeterAC",    label: "전류계(교류) A" },
        { key: "voltmeterAC",  label: "전압계(교류) V" }
    ];

    // ===== 다이얼로그 =====
    var queue = [];   // 클릭한 기호들 {key, label}
    var dlg = new Window("dialog", "회로 기호 삽입");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var pnl = dlg.add("panel", undefined, "기호 (클릭한 순서대로 선 방향에 배치)");
    pnl.orientation = "row";
    pnl.alignChildren = "top";
    pnl.margins = 15;
    pnl.spacing = 8;

    // 버튼 2열 배치
    var col1 = pnl.add("group"); col1.orientation = "column"; col1.alignChildren = "fill";
    var col2 = pnl.add("group"); col2.orientation = "column"; col2.alignChildren = "fill";
    for (var i = 0; i < SYMBOLS.length; i++) {
        var col = (i % 2 === 0) ? col1 : col2;
        var b = col.add("button", undefined, SYMBOLS[i].label);
        b.preferredSize.width = 150;
        b.onClick = makeAddHandler(SYMBOLS[i].key, SYMBOLS[i].label);
    }

    var seqPnl = dlg.add("panel", undefined, "삽입 순서 (항목 선택 후 편집)");
    seqPnl.orientation = "row";
    seqPnl.alignChildren = "fill";
    seqPnl.margins = 12;

    var seqList = seqPnl.add("listbox", undefined, [], { multiselect: false });
    seqList.preferredSize = [250, 96];

    var editCol = seqPnl.add("group");
    editCol.orientation = "column";
    editCol.alignChildren = "fill";
    var btnUp = editCol.add("button", undefined, "▲ 위로");
    var btnDown = editCol.add("button", undefined, "▼ 아래로");
    var btnDel = editCol.add("button", undefined, "삭제");
    var btnClear = editCol.add("button", undefined, "전체 초기화");

    var btns = dlg.add("group");
    btns.alignment = "right";
    btns.add("button", undefined, "취소", { name: "cancel" });
    btns.add("button", undefined, "실행", { name: "ok" });

    function makeAddHandler(key, label) {
        return function () {
            queue.push({ key: key, label: label });
            refreshSeq();
            seqList.selection = queue.length - 1;
        };
    }
    function selIndex() {
        return seqList.selection ? seqList.selection.index : -1;
    }
    function refreshSeq() {
        var s = selIndex();
        seqList.removeAll();
        for (var k = 0; k < queue.length; k++) {
            seqList.add("item", (k + 1) + ". " + queue[k].label);
        }
        if (s >= 0 && s < queue.length) seqList.selection = s;
    }
    btnDel.onClick = function () {
        var s = selIndex();
        if (s < 0) return;
        queue.splice(s, 1);
        refreshSeq();
        if (queue.length) seqList.selection = Math.min(s, queue.length - 1);
    };
    btnUp.onClick = function () {
        var s = selIndex();
        if (s <= 0) return;
        var t = queue[s - 1]; queue[s - 1] = queue[s]; queue[s] = t;
        refreshSeq();
        seqList.selection = s - 1;
    };
    btnDown.onClick = function () {
        var s = selIndex();
        if (s < 0 || s >= queue.length - 1) return;
        var t = queue[s + 1]; queue[s + 1] = queue[s]; queue[s] = t;
        refreshSeq();
        seqList.selection = s + 1;
    };
    btnClear.onClick = function () { queue = []; refreshSeq(); };

    if (dlg.show() !== 1) return;
    if (queue.length === 0) { alert("기호를 하나 이상 선택해주세요."); return; }

    // ===== 좌표계: 라인 중심 기준 (u=라인 방향, v=수직 방향) =====
    var p1 = [line.pathPoints[0].anchor[0], line.pathPoints[0].anchor[1]];
    var p2 = [line.pathPoints[1].anchor[0], line.pathPoints[1].anchor[1]];
    var cx = (p1[0] + p2[0]) / 2;
    var cy = (p1[1] + p2[1]) / 2;
    var dx = p2[0] - p1[0];
    var dy = p2[1] - p1[1];
    var lineLen = Math.sqrt(dx * dx + dy * dy);
    if (lineLen < 1) {
        alert("라인 길이가 너무 짧습니다.");
        return;
    }
    var ca = dx / lineLen;
    var sa = dy / lineLen;

    // 현재 그리는 기호의 중심(절대 좌표). 기호마다 갱신됨. pt()는 이 중심 기준.
    var mx = cx, my = cy;

    function pt(u, v) {
        return [mx + u * ca - v * sa, my + u * sa + v * ca];
    }

    // ===== 각 기호를 선 방향 따라 균등 분배 (N개 → 1/(N+1), 2/(N+1) ... 지점) =====
    var N = queue.length;
    var spacing = lineLen / (N + 1);        // 분배 지점 간격
    var centers = [];                       // 각 기호 중심의 u좌표(라인 중심 기준)
    for (var i = 0; i < N; i++) {
        centers[i] = -lineLen / 2 + spacing * (i + 1);
        queue[i].hg = halfGapFor(queue[i].key);
    }

    // 공간 검증: 도선 경계가 순증가해야 함(겹치면 공간 부족)
    var bounds = [-lineLen / 2];
    for (var i = 0; i < N; i++) {
        bounds.push(centers[i] - queue[i].hg);
        bounds.push(centers[i] + queue[i].hg);
    }
    bounds.push(lineLen / 2);
    for (var i = 1; i < bounds.length; i++) {
        if (bounds[i] < bounds[i - 1] - 0.01) {
            alert("라인이 너무 짧아 기호들이 겹칩니다.\n더 긴 라인을 선택하거나 기호 수를 줄여주세요.");
            return;
        }
    }

    // ===== 도선 스타일 저장 후, 기호 사이를 세그먼트로 재구성 =====
    var wLayer = line.layer;
    var wStroked = line.stroked;
    var wColor = wStroked ? line.strokeColor : null;
    var wWidth = wStroked ? line.strokeWidth : 0;

    addWireSegment(-lineLen / 2, centers[0] - queue[0].hg);
    for (var i = 1; i < N; i++) {
        addWireSegment(centers[i - 1] + queue[i - 1].hg, centers[i] - queue[i].hg);
    }
    addWireSegment(centers[N - 1] + queue[N - 1].hg, lineLen / 2);

    line.remove();

    // ===== 기호 그리기 =====
    var group = wLayer.groupItems.add();
    group.name = "Circuit Symbols";

    for (var i = 0; i < N; i++) {
        mx = cx + centers[i] * ca;
        my = cy + centers[i] * sa;
        drawSymbol(queue[i].key);
    }

    doc.selection = null;
    group.selected = true;
    app.redraw();

    // ===== 배치 헬퍼 =====

    function halfGapFor(key) {
        switch (key) {
            case "resistor":     return CFG.resistorHalf;
            case "battery":      return CFG.batterySpacing / 2;
            case "ac":           return CFG.acRadius;
            case "switchOpen":
            case "switchClosed": return CFG.switchHalf + CFG.switchContactR;
            case "inductor":     return coilHalfWidth();
            case "capacitor":    return CFG.capHalfGap;
            case "ammeterDC":
            case "voltmeterDC":
            case "ammeterAC":
            case "voltmeterAC":  return CFG.meterRadius;
        }
        return 0;
    }

    function lineAt(u) { return [cx + u * ca, cy + u * sa]; }

    function addWireSegment(uStart, uEnd) {
        if (uEnd - uStart < 0.01) return;   // 기호가 선 끝에 붙는 경우 빈 세그먼트 생략
        var seg = wLayer.pathItems.add();
        seg.setEntirePath([lineAt(uStart), lineAt(uEnd)]);
        seg.closed = false;
        seg.filled = false;
        seg.stroked = wStroked;
        if (wStroked) { seg.strokeColor = wColor; seg.strokeWidth = wWidth; }
    }

    function drawSymbol(key) {
        switch (key) {
            case "resistor":     drawResistor(); break;
            case "battery":      drawBattery(); break;
            case "ac":           drawAC(); break;
            case "switchOpen":   drawSwitch(true); break;
            case "switchClosed": drawSwitch(false); break;
            case "inductor":     drawInductor(); break;
            case "capacitor":    drawCapacitor(); break;
            case "ammeterDC":    drawMeter("A", false); break;
            case "voltmeterDC":  drawMeter("V", false); break;
            case "ammeterAC":    drawMeter("A", true); break;
            case "voltmeterAC":  drawMeter("V", true); break;
        }
    }

    // ===== 기호 함수들 =====

    function drawResistor() {
        var w = CFG.resistorHalf;
        var a = CFG.resistorAmp;
        var seg = w * 2 / 12;
        var anchors = [pt(-w, 0)];
        var sign = 1;
        for (var i = 1; i <= 11; i += 2) {
            anchors.push(pt(-w + seg * i, a * sign));
            sign = -sign;
        }
        anchors.push(pt(w, 0));

        // 직선 지그재그 + 모퉁이만 둥근 연결(strokeJoin)
        var path = addLine(anchors, CFG.resistorStroke);
        try { path.strokeJoin = StrokeJoin.ROUNDENDJOIN; } catch (e) {}
    }

    function drawBattery() {
        var half = CFG.batterySpacing / 2;
        // 긴 극판(+극) 하나 + 짧은 극판(-극) 하나 = 전지 1개
        addLine([pt(-half, -CFG.batteryLongHalf), pt(-half, CFG.batteryLongHalf)], CFG.batteryLongStroke);
        addLine([pt(half, -CFG.batteryShortHalf), pt(half, CFG.batteryShortHalf)], CFG.batteryShortStroke);
    }

    function drawAC() {
        addCircle(mx, my, CFG.acRadius, CFG.acCircleStroke, false);

        // 물결: 사용자 제공 SVG(자산 2.svg) 좌표를 그대로 재현.
        // SVG 좌표계(y 아래로 증가)를 중심 정렬 후 뒤집고, acWaveHalf 폭에 맞춰 균일 축소.
        var SVG_CX = 5.205, SVG_CY = 2.69, SVG_HALF = 4.965; // SVG 상의 중심/반폭
        var s = CFG.acWaveHalf / SVG_HALF;
        function w(X, Y) { return pt((X - SVG_CX) * s, -(Y - SVG_CY) * s); }

        var anchors = [
            w(0.24, 2.69),
            w(2.72, 5.13),
            w(5.20, 2.69),
            w(7.69, 0.25),
            w(10.17, 2.69)
        ];
        var wave = group.pathItems.add();
        wave.setEntirePath(anchors);
        wave.closed = false;

        var pp = wave.pathPoints;
        pp[0].rightDirection = w(0.99, 4.80); pp[0].pointType = PointType.CORNER;
        pp[1].leftDirection  = w(2.13, 5.13); pp[1].rightDirection = w(3.39, 5.13); pp[1].pointType = PointType.SMOOTH;
        pp[2].leftDirection  = w(4.46, 4.80); pp[2].rightDirection = w(5.95, 0.58); pp[2].pointType = PointType.SMOOTH;
        pp[3].leftDirection  = w(7.08, 0.25); pp[3].rightDirection = w(8.41, 0.25); pp[3].pointType = PointType.SMOOTH;
        pp[4].leftDirection  = w(9.43, 0.58); pp[4].pointType = PointType.CORNER;
        styleStroke(wave, CFG.acWaveStroke);
    }

    function drawSwitch(isOpen) {
        var h = CFG.switchHalf;
        var leverEnd;
        if (isOpen) {
            var rad = CFG.switchOpenAngle * Math.PI / 180;
            var leverLen = h * 2 + 1;
            leverEnd = pt(-h + leverLen * Math.cos(rad), leverLen * Math.sin(rad));
        } else {
            leverEnd = pt(h, 0);
        }
        addLine([pt(-h, 0), leverEnd], CFG.switchLeverStroke);
        // 접점 원 (흰색 채움으로 레버 시작점을 가림)
        var c1 = pt(-h, 0);
        var c2 = pt(h, 0);
        addCircle(c1[0], c1[1], CFG.switchContactR, CFG.switchContactStroke, true);
        addCircle(c2[0], c2[1], CFG.switchContactR, CFG.switchContactStroke, true);
    }

    function coilHalfWidth() {
        var a = CFG.coilAdvance;
        var b = CFG.coilRadius;
        var spanT = Math.PI * (2 * (CFG.coilBumps - 1) + 1); // 시작 -π/2 ~ 끝
        return (a * spanT + 2 * b) / 2;
    }

    function drawInductor() {
        // 프롤레이트 사이클로이드: 위쪽 큰 반원 + 아래쪽 작은 고리
        var a = CFG.coilAdvance;
        var b = CFG.coilRadius;
        var t0 = -Math.PI / 2;
        var t1 = Math.PI * 2 * (CFG.coilBumps - 1) + Math.PI / 2;
        var segments = CFG.coilBumps * 8;
        var delta = (t1 - t0) / segments;
        var uMid = a * (t0 + t1) / 2;
        var handleFactor = 4 / 3 * Math.tan(delta / 4);

        var anchors = [];
        var derivs = [];
        for (var i = 0; i <= segments; i++) {
            var t = t0 + delta * i;
            anchors.push(pt(a * t + b * Math.sin(t) - uMid, b * Math.cos(t)));
            // 도함수를 u-v계에서 계산 후 회전 변환
            var du = a + b * Math.cos(t);
            var dv = -b * Math.sin(t);
            derivs.push([du * ca - dv * sa, du * sa + dv * ca]);
        }

        var path = group.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = false;
        for (var j = 0; j < anchors.length; j++) {
            var pp = path.pathPoints[j];
            var an = anchors[j];
            var d = derivs[j];
            if (j > 0) {
                pp.leftDirection = [an[0] - d[0] * handleFactor, an[1] - d[1] * handleFactor];
            }
            if (j < anchors.length - 1) {
                pp.rightDirection = [an[0] + d[0] * handleFactor, an[1] + d[1] * handleFactor];
            }
            pp.pointType = (j === 0 || j === anchors.length - 1) ? PointType.CORNER : PointType.SMOOTH;
        }
        styleStroke(path, CFG.coilStroke);
    }

    function drawCapacitor() {
        var g = CFG.capHalfGap;
        var h = CFG.capPlateHalf;
        addLine([pt(-g, -h), pt(-g, h)], CFG.capStroke);
        addLine([pt(g, -h), pt(g, h)], CFG.capStroke);
    }

    function drawMeter(letter, isAC) {
        addCircle(mx, my, CFG.meterRadius, CFG.meterStroke, false);
        var tf = group.textFrames.add();
        tf.contents = letter;
        var attrs = tf.textRange.characterAttributes;
        attrs.size = CFG.textSize;
        try {
            attrs.textFont = app.textFonts.getByName(CFG.fontName);
        } catch (e) {
            alert("폰트를 찾지 못해 기본 폰트로 넣습니다: " + CFG.fontName);
        }
        try {
            if (wStroked) tf.textRange.characterAttributes.fillColor = wColor;
        } catch (e2) {}

        // 실제 보이는 글자(잉크) 경계를 아웃라인 복제본으로 측정
        var ob;
        var dup = tf.duplicate();
        var outline = dup.createOutline();
        ob = outline.geometricBounds;   // [left, top, right, bottom] — 폰트 여백 없는 실제 글자 경계
        outline.remove();

        // 잉크 경계 중심을 원 중심에 맞춤 (밑줄 공간 확보를 위해 0.3mm 위로 보정)
        var dx = mx - (ob[0] + ob[2]) / 2;
        var dy = my - (ob[1] + ob[3]) / 2 + 0.3 * MM;
        tf.translate(dx, dy);

        // 밑줄: 이동 후 잉크 하단에서 0.4mm 아래 (회전 없이 수평)
        var underlineY = (ob[3] + dy) - CFG.meterUnderlineGap;
        if (isAC) {
            drawMeterWave(mx, underlineY);   // 교류: 물결(~)
        } else {
            // 직류: 직선, 글자 폭만큼
            var left = ob[0] + dx;
            var right = ob[2] + dx;
            var underline = group.pathItems.add();
            underline.setEntirePath([[left, underlineY], [right, underlineY]]);
            underline.closed = false;
            styleStroke(underline, CFG.meterUnderlineStroke);
        }
    }

    // 교류 계기 밑줄 물결: 자산 3/4.svg 좌표(기준선 y=9.24, 중심 x=5.82) 그대로 사용
    function drawMeterWave(centerX, baseY) {
        function W(X, Y) { return [centerX + (X - 5.82), baseY - (Y - 9.24)]; }
        var wave = group.pathItems.add();
        wave.setEntirePath([W(2.64, 9.24), W(5.82, 9.24), W(9.00, 9.24)]);
        wave.closed = false;
        var pp = wave.pathPoints;
        pp[0].rightDirection = W(3.03, 8.56); pp[0].pointType = PointType.CORNER;
        pp[1].leftDirection  = W(4.66, 8.23); pp[1].rightDirection = W(6.98, 10.25); pp[1].pointType = PointType.SMOOTH;
        pp[2].leftDirection  = W(8.63, 9.88); pp[2].pointType = PointType.CORNER;
        styleStroke(wave, CFG.meterUnderlineStroke);
    }

    // ===== 공통 헬퍼 =====

    function addLine(points, strokeW) {
        var path = group.pathItems.add();
        path.setEntirePath(points);
        path.closed = false;
        styleStroke(path, strokeW);
        return path;
    }

    function addCircle(centerX, centerY, radius, strokeW, whiteFill) {
        var circle = group.pathItems.ellipse(
            centerY + radius, centerX - radius, radius * 2, radius * 2
        );
        styleStroke(circle, strokeW);
        if (whiteFill) {
            circle.filled = true;
            circle.fillColor = makeWhite();
        }
        return circle;
    }

    function styleStroke(path, strokeW) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = strokeW;
        if (wStroked) {
            try { path.strokeColor = wColor; } catch (e) {}
        }
        try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e2) {}
        try { path.strokeDashes = []; } catch (e3) {}
    }

    function makeWhite() {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 0; cmyk.yellow = 0; cmyk.black = 0;
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = 255; rgb.green = 255; rgb.blue = 255;
        return rgb;
    }
})();
