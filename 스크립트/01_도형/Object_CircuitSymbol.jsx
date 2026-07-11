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

        meterRadius: 7,
        meterStroke: 0.3,
        meterUnderlineStroke: 0.3
    };

    var SYMBOLS = [
        { key: "resistor",     label: "저항" },
        { key: "battery",      label: "직렬 전지" },
        { key: "ac",           label: "교류 전원" },
        { key: "switchOpen",   label: "열린 스위치" },
        { key: "switchClosed", label: "닫힌 스위치" },
        { key: "inductor",     label: "인덕터(코일)" },
        { key: "capacitor",    label: "축전기" },
        { key: "ammeter",      label: "전류계 (A)" },
        { key: "voltmeter",    label: "전압계 (V)" }
    ];

    // ===== 다이얼로그 =====
    var dlg = new Window("dialog", "회로 기호 삽입");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var pnl = dlg.add("panel", undefined, "기호 선택");
    pnl.orientation = "column";
    pnl.alignChildren = "left";
    pnl.margins = 15;

    var radios = [];
    for (var i = 0; i < SYMBOLS.length; i++) {
        radios[i] = pnl.add("radiobutton", undefined, SYMBOLS[i].label);
    }
    radios[0].value = true;

    var btns = dlg.add("group");
    btns.alignment = "right";
    btns.add("button", undefined, "취소", { name: "cancel" });
    btns.add("button", undefined, "실행", { name: "ok" });

    if (dlg.show() !== 1) return;

    var chosen = null;
    for (var r = 0; r < radios.length; r++) {
        if (radios[r].value) { chosen = SYMBOLS[r].key; break; }
    }
    if (!chosen) return;

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

    function pt(u, v) {
        return [cx + u * ca - v * sa, cy + u * sa + v * ca];
    }

    // 기호별 라인 절단 폭(중심에서 절반)
    var halfGap;
    switch (chosen) {
        case "resistor":     halfGap = CFG.resistorHalf; break;
        case "battery":      halfGap = CFG.batterySpacing / 2; break;
        case "ac":           halfGap = CFG.acRadius; break;
        case "switchOpen":
        case "switchClosed": halfGap = CFG.switchHalf + CFG.switchContactR; break;
        case "inductor":     halfGap = coilHalfWidth(); break;
        case "capacitor":    halfGap = CFG.capHalfGap; break;
        case "ammeter":
        case "voltmeter":    halfGap = CFG.meterRadius; break;
    }

    if (lineLen <= halfGap * 2 + 2) {
        alert("라인이 기호보다 짧습니다. 더 긴 라인을 선택해주세요.");
        return;
    }

    // ===== 라인 절단: 원본을 왼쪽 절반으로, 복제본을 오른쪽 절반으로 =====
    var secondHalf = line.duplicate();
    line.setEntirePath([p1, pt(-halfGap, 0)]);
    secondHalf.setEntirePath([pt(halfGap, 0), p2]);

    // ===== 기호 그리기 =====
    var group = line.layer.groupItems.add();
    group.name = "Circuit Symbol";
    try { group.move(line, ElementPlacement.PLACEBEFORE); } catch (e) {}

    switch (chosen) {
        case "resistor":     drawResistor(); break;
        case "battery":      drawBattery(); break;
        case "ac":           drawAC(); break;
        case "switchOpen":   drawSwitch(true); break;
        case "switchClosed": drawSwitch(false); break;
        case "inductor":     drawInductor(); break;
        case "capacitor":    drawCapacitor(); break;
        case "ammeter":      drawMeter("A"); break;
        case "voltmeter":    drawMeter("V"); break;
    }

    doc.selection = null;
    group.selected = true;
    app.redraw();

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
        addCircle(cx, cy, CFG.acRadius, CFG.acCircleStroke, false);

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

    function drawMeter(letter) {
        addCircle(cx, cy, CFG.meterRadius, CFG.meterStroke, false);
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
            if (line.stroked) tf.textRange.characterAttributes.fillColor = line.strokeColor;
        } catch (e2) {}
        // 글자 바운딩 박스 중심을 원 중심에 맞춤
        var b = tf.geometricBounds;
        tf.translate(cx - (b[0] + b[2]) / 2, cy - (b[1] + b[3]) / 2);

        // 글자 아래 밑줄 (회전 없이 수평)
        var nb = tf.geometricBounds;   // 이동 후 최종 위치
        var underlineY = nb[3] - 1;    // 글자 하단에서 1pt 아래
        var underline = group.pathItems.add();
        underline.setEntirePath([[nb[0], underlineY], [nb[2], underlineY]]);
        underline.closed = false;
        styleStroke(underline, CFG.meterUnderlineStroke);
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
        if (line.stroked) {
            try { path.strokeColor = line.strokeColor; } catch (e) {}
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
