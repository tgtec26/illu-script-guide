// Object_Interference.jsx
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

// 파동의 간섭(보강·상쇄): 같은 매질에서 마주 달리는 두 파동이 겹치는 모습을 한 장면으로 그린다.
//   - 파동 1은 오른쪽(→), 파동 2는 왼쪽(←)으로 진행한다. 위치는 각 파동 중심의 x(mm, 그림 가운데가 0)다.
//     두 중심이 같으면 완전히 겹친 순간(위상이 같으면 보강, 반대면 상쇄), 조금 어긋나면 부분 중첩,
//     더 벌어지면 겹치지 않는다. 파동 1이 왼쪽이면 중첩 전, 오른쪽이면 중첩 후.
//   - 파형: 펄스(봉우리 하나, 폭이 파장 칸. 위상은 0°면 위로, 180°면 아래로) 또는
//     사인 묶음(파장 몇 개만 있는 사인파, 위상 0~360°).
//   - 합성파는 두 파동의 변위를 더한 값이다(중첩의 원리). 진폭·모양이 다르면 상쇄여도 완전히 0이 되지 않는다.
//   - 겹치면 각 파동은 연한 점선, 합성파는 실선. 겹치지 않으면 각 파동을 실선으로 그린다.
//   - 진행 방향 화살표, 매질의 점(가운데 x=0에 고정), 상태 글자(중첩 전/중첩/중첩 후, 같은·반대 위상으로 중첩)는 켜고 끌 수 있다.
//   - 진폭·파장을 같게 하면 파동 2가 파동 1을 따라간다. 선 두께와 색(파동 1·2, 합성파, 화살표)을 고른다.
//   - 확인하면 미리보기 그룹이 그대로 결과로 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectInterference/settings";

    // ==== 순수 기하 시작 (tests/check-interference.js 가 이 구간을 그대로 읽는다) ====
    // 파동 w = {kind, center, amp, wl, phase, cycles}: 중심 x, 진폭, 파장(펄스는 폭), 위상(도), 사인 묶음의 파장 수. 길이는 mm
    var PULSE = 0;
    var TRAIN = 1;
    // 곡선 앵커 간격: 파장당 이 개수. 손잡이를 정확한 기울기로 맞추므로 이 정도면 눈으로 구별이 안 된다
    var SAMPLES_PER_WAVELENGTH = 10;
    var LINE_MARGIN_MM = 1;
    var ARROW_LEN_MM = 8;
    var HEAD_LEN_MM = 1.6;
    var HEAD_TRIANGLE = 0;
    var HEAD_CHEVRON = 1;
    var HEAD_SWALLOW = 2;
    var HEAD_SHAPES = ["삼각형", "꺾쇠 (열린 V)", "제비꼬리"];
    var HEAD_HALF_MM = 0.55;
    var ARROW_GAP_MM = 3;
    var ARROW_STACK_MM = 3;

    // 파동이 0이 아닌 구간의 반길이
    function halfSupport(w) {
        return (w.kind === PULSE ? w.wl : w.wl * w.cycles) / 2;
    }

    // 펄스 위상은 0°(위)·180°(아래) 둘뿐이다. 90° 이상 270° 미만이면 180°로
    function snapPulsePhase(phase) {
        return (phase >= 90 && phase < 270) ? 180 : 0;
    }

    // 파동 하나의 변위 y와 기울기 d(= dy/dx).
    //   펄스: 봉우리 0.5(1 + cos). 구간 끝에서 값과 기울기가 모두 0이라 기준선에 매끄럽게 붙는다.
    //   사인 묶음: cos(2πu/파장 + 위상)에 같은 봉우리 모양의 창을 곱한다.
    function waveAt(w, x) {
        var u = x - w.center;
        var half = halfSupport(w);
        if (u <= -half || u >= half) return {y: 0, d: 0};
        var span = 2 * half;
        var bell = 0.5 * (1 + Math.cos(2 * Math.PI * u / span));
        var bellD = -0.5 * Math.sin(2 * Math.PI * u / span) * 2 * Math.PI / span;
        if (w.kind === PULSE) {
            var sign = snapPulsePhase(w.phase) === 180 ? -1 : 1;
            return {y: sign * w.amp * bell, d: sign * w.amp * bellD};
        }
        var k = 2 * Math.PI / w.wl;
        var angle = k * u + w.phase * Math.PI / 180;
        var carrier = Math.cos(angle);
        var carrierD = -Math.sin(angle) * k;
        return {y: w.amp * bell * carrier, d: w.amp * (bellD * carrier + bell * carrierD)};
    }

    // 중첩의 원리: 합성파는 각 파동의 변위를 더한 것
    function sumAt(waves, x) {
        var y = 0;
        var d = 0;
        for (var i = 0; i < waves.length; i++) {
            var v = waveAt(waves[i], x);
            y += v.y;
            d += v.d;
        }
        return {y: y, d: d};
    }

    // 두 파동의 0이 아닌 구간이 겹치는가 (맞닿기만 하면 겹치지 않은 것)
    function wavesOverlap(a, b) {
        return Math.abs(a.center - b.center) < halfSupport(a) + halfSupport(b);
    }

    // from~to 구간의 합성 곡선을 3차 베지어 점 목록으로. 앵커는 같은 간격, 손잡이는 정확한 기울기(에르미트 → 베지어).
    // 파동의 구간 끝에서는 구간을 끊어 거기도 앵커를 둔다. 점: {anchor, left, right} (mm)
    function curvePoints(waves, from, to) {
        if (to <= from) return [];
        var cuts = [from, to];
        var minWl = waves[0].wl;
        for (var i = 0; i < waves.length; i++) {
            var half = halfSupport(waves[i]);
            if (waves[i].wl < minWl) minWl = waves[i].wl;
            if (waves[i].center - half > from && waves[i].center - half < to) cuts.push(waves[i].center - half);
            if (waves[i].center + half > from && waves[i].center + half < to) cuts.push(waves[i].center + half);
        }
        cuts.sort(function(p, q) { return p - q; });
        var unique = [cuts[0]];
        for (var c = 1; c < cuts.length; c++) {
            if (cuts[c] - unique[unique.length - 1] > 1e-9) unique.push(cuts[c]);
        }

        var points = [];
        for (var s = 0; s < unique.length - 1; s++) {
            var a = unique[s];
            var b = unique[s + 1];
            var count = Math.max(2, Math.ceil((b - a) / (minWl / SAMPLES_PER_WAVELENGTH)));
            var h = (b - a) / count;
            for (var n = 0; n <= count; n++) {
                var x = n === count ? b : a + h * n;
                var v = sumAt(waves, x);
                var rightHandle = [x + h / 3, v.y + v.d * h / 3];
                if (n === 0 && s > 0) {
                    // 앞 구간 끝 점과 같은 점: 오른쪽 손잡이만 새 구간 간격으로 다시 잡는다
                    points[points.length - 1].right = rightHandle;
                } else {
                    points.push({anchor: [x, v.y], left: [x - h / 3, v.y - v.d * h / 3], right: rightHandle});
                }
            }
        }
        points[0].left = [points[0].anchor[0], points[0].anchor[1]];
        var last = points[points.length - 1];
        last.right = [last.anchor[0], last.anchor[1]];
        return points;
    }

    // 기준선의 양 끝 x: 너비의 절반과, 파동이 끝나는 곳에서 조금 더 나간 곳 중 바깥쪽
    function lineExtent(width, waves) {
        var left = -width / 2;
        var right = width / 2;
        for (var i = 0; i < waves.length; i++) {
            var half = halfSupport(waves[i]);
            if (waves[i].center - half - LINE_MARGIN_MM < left) left = waves[i].center - half - LINE_MARGIN_MM;
            if (waves[i].center + half + LINE_MARGIN_MM > right) right = waves[i].center + half + LINE_MARGIN_MM;
        }
        return [left, right];
    }

    // 합성 곡선의 가장 높은 y (0 이상)
    function curveTop(waves) {
        var lo = waves[0].center - halfSupport(waves[0]);
        var hi = waves[0].center + halfSupport(waves[0]);
        for (var i = 1; i < waves.length; i++) {
            lo = Math.min(lo, waves[i].center - halfSupport(waves[i]));
            hi = Math.max(hi, waves[i].center + halfSupport(waves[i]));
        }
        var top = 0;
        for (var n = 0; n <= 400; n++) {
            var y = sumAt(waves, lo + (hi - lo) * n / 400).y;
            if (y > top) top = y;
        }
        return top;
    }

    // 진행 방향 화살표 높이 [파동 1, 파동 2]: 곡선 위쪽. 겹치면 합성파보다 위.
    // 두 화살표가 가로로 겹치면 파동 2 것을 한 칸 올린다
    function arrowHeights(w1, w2) {
        var sumTop = wavesOverlap(w1, w2) ? curveTop([w1, w2]) : 0;
        var y1 = Math.max(curveTop([w1]), sumTop) + ARROW_GAP_MM;
        var y2 = Math.max(curveTop([w2]), sumTop) + ARROW_GAP_MM;
        if (Math.abs(w1.center - w2.center) < ARROW_LEN_MM + 1.5) y2 = Math.max(y1, y2) + ARROW_STACK_MM;
        return [y1, y2];
    }

    // 화살표: 몸통 두 점과 화살촉 점들 (mm). headScale은 화살촉 배율(1 = 100%), headShape는 모양.
    //   삼각형·제비꼬리: 채운 닫힌 패스. 몸통은 화살촉 속으로 조금 들어가 틈이 없다.
    //   꺾쇠: 열린 선 [날개, 끝, 날개]. 몸통이 끝점까지 간다.
    function arrowShape(tailX, tipX, y, headScale, headShape) {
        var dir = tipX > tailX ? 1 : -1;
        var k = headScale === undefined ? 1 : headScale;
        var len = HEAD_LEN_MM * k;
        var half = HEAD_HALF_MM * k;
        var back = tipX - dir * len;
        if (headShape === HEAD_CHEVRON) {
            return {line: [[tailX, y], [tipX, y]], head: [[back, y + half], [tipX, y], [back, y - half]], closed: false};
        }
        if (headShape === HEAD_SWALLOW) {
            // 홈은 밑변에서 머리 길이의 0.3 앞
            return {line: [[tailX, y], [tipX - dir * len * 0.6, y]],
                head: [[tipX, y], [back, y + half], [tipX - dir * len * 0.7, y], [back, y - half]], closed: true};
        }
        return {
            line: [[tailX, y], [tipX - dir * len * 0.9, y]],
            head: [[tipX, y], [back, y + half], [back, y - half]],
            closed: true
        };
    }

    // 위치와 위상으로 정하는 상태 글자
    function stateCaption(w1, w2) {
        if (!wavesOverlap(w1, w2)) return w1.center < w2.center ? "중첩 전" : "중첩 후";
        var diff = Math.abs(w1.phase - w2.phase) % 360;
        if (diff < 1 || diff > 359) return "같은 위상으로 중첩";
        if (Math.abs(diff - 180) < 1) return "반대 위상으로 중첩";
        return "중첩";
    }
    // ==== 순수 기하 끝 ====

    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var FONT_PT = 8;
    var ARROW_STROKE_PT = 0.75;
    var DASH_PT = [3, 2];
    var DASHED_OPACITY = 60;
    var DOT_RADIUS_MM = 0.8;
    var CAPTION_GAP_MM = 3;
    var SHAPES = ["펄스 (봉우리 하나)", "사인 묶음 (파장 여러 개)"];
    var COLORS = [
        {name: "보라", cmyk: [50, 55, 0, 0], rgb: [130, 112, 190]},
        {name: "빨강", cmyk: [0, 100, 100, 0], rgb: [237, 28, 36]},
        {name: "초록", cmyk: [80, 10, 100, 10], rgb: [46, 139, 58]},
        {name: "파랑", cmyk: [100, 60, 0, 0], rgb: [0, 114, 188]},
        {name: "주황", cmyk: [0, 60, 100, 0], rgb: [247, 148, 29]},
        {name: "검정", cmyk: [0, 0, 0, 100], rgb: [0, 0, 0]},
        {name: "회색", cmyk: [0, 0, 0, 50], rgb: [147, 149, 152]}
    ];

    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var POSITION_LIMIT_MM = 100;
    var COLOR_LIST_WIDTH = 70;

    // 숫자 옵션: 키, 범위, 한 단계, 소수 자리. 저장 순서도 이 순서다
    var NUMBER_KEYS = ["width", "cycles", "lineWidth", "pos1", "phase1", "amp1", "wl1", "pos2", "phase2", "amp2", "wl2",
        "offsetX", "offsetY", "headSize"];
    var WAVE_POS_RANGE = [-120, 120];
    var PHASE_RANGE_TRAIN = [0, 360];
    var SPECS = {
        width: {range: [40, 250], step: 1, decimals: 0},
        cycles: {range: [1, 6], step: 1, decimals: 0},
        lineWidth: {range: [0.25, 3], step: 0.05, decimals: 2},
        pos1: {range: WAVE_POS_RANGE, step: 0.5, decimals: 1},
        phase1: {range: PHASE_RANGE_TRAIN, step: 5, decimals: 0},
        amp1: {range: [1, 40], step: 0.5, decimals: 1},
        wl1: {range: [4, 100], step: 0.5, decimals: 1},
        pos2: {range: WAVE_POS_RANGE, step: 0.5, decimals: 1},
        phase2: {range: PHASE_RANGE_TRAIN, step: 5, decimals: 0},
        amp2: {range: [1, 40], step: 0.5, decimals: 1},
        wl2: {range: [4, 100], step: 0.5, decimals: 1},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        headSize: {range: [30, 300], step: 5, decimals: 0}
    };

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME]);

    // 옵션
    var options = {
        shape: PULSE, sameAmp: true, sameWl: true,
        arrowsOn: true, dotOn: true, captionOn: true,
        colorWave1: 0, colorWave2: 0, colorSum: 0, colorArrow1: 1, colorArrow2: 2,
        width: 100, cycles: 2, lineWidth: 0.75,
        pos1: -25, phase1: 0, amp1: 10, wl1: 20,
        pos2: 25, phase2: 0, amp2: 10, wl2: 20,
        offsetX: 0, offsetY: 0, headSize: 100, headShape: HEAD_TRIANGLE,
        previewOn: true
    };
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var d = 0; d < NUMBER_KEYS.length; d++) DEFAULTS[NUMBER_KEYS[d]] = options[NUMBER_KEYS[d]];
    applySettings();

    var previewGroup = null;
    var rows = {};

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "파동의 간섭 (보강·상쇄)");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "파형");
    var shapeRow = shapePanel.add("group");
    shapeRow.alignChildren = ["left", "center"];
    shapeRow.add("statictext", undefined, "파형:").preferredSize.width = LABEL_WIDTH;
    var shapeList = shapeRow.add("dropdownlist", undefined, SHAPES);
    shapeList.selection = options.shape;
    addRow(shapePanel, "cycles", "파장 수", "개");
    rows.cycles.input.helpTip = "사인 묶음에서 파동 하나에 든 파장의 수";
    addRow(shapePanel, "width", "기준선 너비", "mm");
    rows.width.input.helpTip = "파동이 이 길이를 넘어가면 기준선이 파동에 맞춰 늘어납니다";

    var wave1Panel = addPanel(dlg, "파동 1 (→ 오른쪽으로 진행)");
    addRow(wave1Panel, "pos1", "위치", "mm");
    addRow(wave1Panel, "phase1", "위상", "°");
    addRow(wave1Panel, "amp1", "진폭", "mm");
    addRow(wave1Panel, "wl1", "파장", "mm");
    rows.pos1.input.helpTip = "파동 중심의 가로 위치. 그림 가운데가 0";

    var wave2Panel = addPanel(dlg, "파동 2 (← 왼쪽으로 진행)");
    var sameRow = wave2Panel.add("group");
    sameRow.alignChildren = ["left", "center"];
    var sameAmpCheck = sameRow.add("checkbox", undefined, "진폭을 파동 1과 같게");
    var sameWlCheck = sameRow.add("checkbox", undefined, "파장을 파동 1과 같게");
    var presetRow = wave2Panel.add("group");
    presetRow.alignChildren = ["left", "center"];
    presetRow.add("statictext", undefined, "위상 맞추기:").preferredSize.width = LABEL_WIDTH;
    var constructiveButton = presetRow.add("button", undefined, "보강 (같은 위상)");
    var destructiveButton = presetRow.add("button", undefined, "상쇄 (반대 위상)");
    constructiveButton.helpTip = "파동 2의 위상을 파동 1과 같게";
    destructiveButton.helpTip = "파동 2의 위상을 파동 1보다 180° 어긋나게";
    addRow(wave2Panel, "pos2", "위치", "mm");
    addRow(wave2Panel, "phase2", "위상", "°");
    addRow(wave2Panel, "amp2", "진폭", "mm");
    addRow(wave2Panel, "wl2", "파장", "mm");

    var stylePanel = addPanel(dlg, "선·색·표시");
    stylePanel.spacing = 5;
    addRow(stylePanel, "lineWidth", "선 두께", "pt");
    addRow(stylePanel, "headSize", "화살촉 크기", "%");
    var waveColorRow = stylePanel.add("group");
    waveColorRow.alignChildren = ["left", "center"];
    waveColorRow.add("statictext", undefined, "파동 색:").preferredSize.width = LABEL_WIDTH;
    var colorWave1List = addColorList(waveColorRow, "colorWave1", "파동 1");
    var colorWave2List = addColorList(waveColorRow, "colorWave2", "파동 2");
    var sumColorRow = stylePanel.add("group");
    sumColorRow.alignChildren = ["left", "center"];
    sumColorRow.add("statictext", undefined, "합성파 색:").preferredSize.width = LABEL_WIDTH;
    var colorSumList = addColorList(sumColorRow, "colorSum", "합성파와 기준선");
    var arrowColorRow = stylePanel.add("group");
    arrowColorRow.alignChildren = ["left", "center"];
    arrowColorRow.add("statictext", undefined, "화살표 색:").preferredSize.width = LABEL_WIDTH;
    var colorArrow1List = addColorList(arrowColorRow, "colorArrow1", "파동 1 화살표");
    var colorArrow2List = addColorList(arrowColorRow, "colorArrow2", "파동 2 화살표");
    var headShapeList = arrowColorRow.add("dropdownlist", undefined, HEAD_SHAPES);
    headShapeList.selection = options.headShape;
    headShapeList.helpTip = "화살촉 모양. 삼각형·제비꼬리는 채운 모양, 꺾쇠는 선 굵기의 열린 선";

    var showRow = stylePanel.add("group");
    showRow.alignChildren = ["left", "center"];
    var arrowsCheck = showRow.add("checkbox", undefined, "진행 방향 화살표");
    var dotCheck = showRow.add("checkbox", undefined, "매질의 점");
    var captionCheck = showRow.add("checkbox", undefined, "상태 글자");
    dotCheck.helpTip = "그림 가운데(x=0)에 찍는 점. 상쇄 때 그 자리가 움직이지 않는 것을 보여 줍니다";
    captionCheck.helpTip = "중첩 전·중첩·중첩 후, 같은·반대 위상으로 중첩을 위치와 위상으로 정해 위에 적습니다";

    var positionPanel = addPanel(dlg, "위치");
    addRow(positionPanel, "offsetX", "가로", "mm");
    addRow(positionPanel, "offsetY", "세로", "mm");

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    for (var n = 0; n < NUMBER_KEYS.length; n++) {
        if (NUMBER_KEYS[n] === "offsetX") {
            bindPositionRow(rows.offsetX, "offsetX", true);
        } else if (NUMBER_KEYS[n] === "offsetY") {
            bindPositionRow(rows.offsetY, "offsetY", false);
        } else {
            bindValueRow(rows[NUMBER_KEYS[n]], NUMBER_KEYS[n]);
        }
    }
    sameAmpCheck.value = options.sameAmp;
    sameWlCheck.value = options.sameWl;
    arrowsCheck.value = options.arrowsOn;
    dotCheck.value = options.dotOn;
    captionCheck.value = options.captionOn;
    previewCheck.value = options.previewOn;
    applyShapeMode();
    applyArrowMode();

    shapeList.onChange = function() {
        if (!shapeList.selection) return;
        options.shape = shapeList.selection.index;
        applyShapeMode();
        updatePreview();
    };
    sameAmpCheck.onClick = function() { options.sameAmp = sameAmpCheck.value; updatePreview(); };
    sameWlCheck.onClick = function() { options.sameWl = sameWlCheck.value; updatePreview(); };
    constructiveButton.onClick = function() { setPhase2(options.phase1); };
    destructiveButton.onClick = function() { setPhase2((options.phase1 + 180) % 360); };
    headShapeList.onChange = function() {
        if (!headShapeList.selection) return;
        options.headShape = headShapeList.selection.index;
        updatePreview();
    };
    arrowsCheck.onClick = function() { options.arrowsOn = arrowsCheck.value; applyArrowMode(); updatePreview(); };
    dotCheck.onClick = function() { options.dotOn = dotCheck.value; updatePreview(); };
    captionCheck.onClick = function() { options.captionOn = captionCheck.value; updatePreview(); };
    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
    }
    app.redraw();

    // 펄스는 위상이 0°·180°뿐이고 파장 칸이 폭이다. 사인 묶음만 파장 수를 쓴다
    function applyShapeMode() {
        var pulse = options.shape === PULSE;
        shapeList.selection = options.shape;
        var keys = ["phase1", "phase2"];
        for (var i = 0; i < keys.length; i++) {
            var phaseRow = rows[keys[i]];
            phaseRow.max = pulse ? 180 : PHASE_RANGE_TRAIN[1];
            phaseRow.step = pulse ? 180 : SPECS[keys[i]].step;
            try {
                phaseRow.slider.maxvalue = phaseRow.max;
                phaseRow.slider.stepdelta = phaseRow.step;
                phaseRow.slider.jumpdelta = pulse ? 180 : phaseRow.step * 10;
            } catch (e) {}
            if (pulse) options[keys[i]] = snapPulsePhase(options[keys[i]]);
            showRowValue(phaseRow, options[keys[i]]);
        }
        setRowEnabled(rows.cycles, !pulse);
        var wlText = (pulse ? "폭" : "파장") + " (mm):";
        rows.wl1.label.text = wlText;
        rows.wl2.label.text = wlText;
    }

    // 화살표를 끄면 화살촉 모양·크기를 잠근다
    function applyArrowMode() {
        headShapeList.enabled = options.arrowsOn;
        setRowEnabled(rows.headSize, options.arrowsOn);
    }

    function setPhase2(value) {
        value = clamp(roundTo(value, rows.phase2.step), rows.phase2.min, rows.phase2.max);
        options.phase2 = value;
        showRowValue(rows.phase2, value);
        updatePreview();
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
        controls.reset.enabled = enabled;
    }

    // 같게 한 값은 파동 1을 따라가고 그 행은 잠근다
    function syncLinks() {
        if (options.sameAmp) {
            options.amp2 = options.amp1;
            showRowValue(rows.amp2, options.amp2);
        }
        if (options.sameWl) {
            options.wl2 = options.wl1;
            showRowValue(rows.wl2, options.wl2);
        }
        setRowEnabled(rows.amp2, !options.sameAmp);
        setRowEnabled(rows.wl2, !options.sameWl);
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        syncLinks();
        clearPreview();
        if (options.previewOn) buildPreview();
        app.redraw();
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

    function makeWaves() {
        return [
            {kind: options.shape, center: options.pos1, amp: options.amp1, wl: options.wl1, phase: options.phase1, cycles: options.cycles},
            {kind: options.shape, center: options.pos2, amp: options.amp2, wl: options.wl2, phase: options.phase2, cycles: options.cycles}
        ];
    }

    function buildPreview() {
        var waves = makeWaves();
        var overlapped = wavesOverlap(waves[0], waves[1]);
        var extent = lineExtent(options.width, waves);

        previewGroup = findEditableLayer().groupItems.add();
        previewGroup.name = "Interference";
        var group = previewGroup;
        var waveColors = [options.colorWave1, options.colorWave2];

        var base = drawPath(group, toPage([corner([extent[0], 0]), corner([extent[1], 0])]));
        base.name = "Baseline";
        styleStroke(base, makeColor(options.colorSum), options.lineWidth);

        if (overlapped) {
            // 각 파동은 연한 점선, 그 위에 합성파 실선
            for (var i = 0; i < 2; i++) {
                var half = halfSupport(waves[i]);
                var dashed = drawPath(group, toPage(curvePoints([waves[i]], waves[i].center - half, waves[i].center + half)));
                dashed.name = "Wave" + (i + 1) + "Dashed";
                styleStroke(dashed, makeColor(waveColors[i]), options.lineWidth);
                dashed.strokeDashes = DASH_PT;
                dashed.opacity = DASHED_OPACITY;
            }
            var from = Math.min(waves[0].center - halfSupport(waves[0]), waves[1].center - halfSupport(waves[1]));
            var to = Math.max(waves[0].center + halfSupport(waves[0]), waves[1].center + halfSupport(waves[1]));
            var sum = drawPath(group, toPage(curvePoints(waves, from, to)));
            sum.name = "Sum";
            styleStroke(sum, makeColor(options.colorSum), options.lineWidth);
        } else {
            for (var j = 0; j < 2; j++) {
                var halfJ = halfSupport(waves[j]);
                var solid = drawPath(group, toPage(curvePoints([waves[j]], waves[j].center - halfJ, waves[j].center + halfJ)));
                solid.name = "Wave" + (j + 1);
                styleStroke(solid, makeColor(waveColors[j]), options.lineWidth);
            }
        }

        var heights = arrowHeights(waves[0], waves[1]);
        if (options.arrowsOn) {
            drawArrow(group, "Arrow1", arrowShape(waves[0].center - ARROW_LEN_MM / 2, waves[0].center + ARROW_LEN_MM / 2, heights[0], options.headSize / 100, options.headShape),
                makeColor(options.colorArrow1));
            drawArrow(group, "Arrow2", arrowShape(waves[1].center + ARROW_LEN_MM / 2, waves[1].center - ARROW_LEN_MM / 2, heights[1], options.headSize / 100, options.headShape),
                makeColor(options.colorArrow2));
        }

        if (options.dotOn) {
            var dotY = sumAt(waves, 0).y;
            var center = pagePoint([0, dotY]);
            var r = DOT_RADIUS_MM * MM;
            var dot = group.pathItems.ellipse(center[1] + r, center[0] - r, 2 * r, 2 * r);
            dot.name = "Dot";
            dot.stroked = false;
            dot.filled = true;
            dot.fillColor = makeColor(5);
        }

        if (options.captionOn) {
            var caption = group.textFrames.add();
            caption.contents = stateCaption(waves[0], waves[1]);
            caption.name = "Caption";
            caption.textRange.characterAttributes.size = FONT_PT;
            caption.textRange.characterAttributes.textFont = korFont;
            caption.textRange.characterAttributes.fillColor = makeColor(5);
            var top = options.arrowsOn ? Math.max(heights[0], heights[1]) : curveTop(waves);
            var captionAt = pagePoint([(extent[0] + extent[1]) / 2, top + CAPTION_GAP_MM]);
            placeText(caption, captionAt[0], captionAt[1], "c", "b");
        }

        if (options.offsetX !== 0 || options.offsetY !== 0) group.translate(options.offsetX * MM, options.offsetY * MM);
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function corner(p) {
        return {anchor: [p[0], p[1]], left: [p[0], p[1]], right: [p[0], p[1]]};
    }

    // mm 점 목록(그림 가운데가 원점, 위가 +) → 문서 좌표(pt)
    function toPage(points) {
        var out = [];
        for (var i = 0; i < points.length; i++) {
            out.push({
                anchor: pagePoint(points[i].anchor),
                left: pagePoint(points[i].left),
                right: pagePoint(points[i].right)
            });
        }
        return out;
    }

    function pagePoint(p) {
        return [viewCenter[0] + p[0] * MM, viewCenter[1] + p[1] * MM];
    }

    // 점마다 anchor·left·right가 문서 좌표인 열린 패스
    function drawPath(container, points) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            path.pathPoints[j].leftDirection = points[j].left;
            path.pathPoints[j].rightDirection = points[j].right;
        }
        path.closed = false;
        return path;
    }

    function styleStroke(path, color, width) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    }

    // 몸통 선과 채운 화살촉을 한 그룹으로
    function drawArrow(container, name, shape, color) {
        var arrow = container.groupItems.add();
        arrow.name = name;
        var line = drawPath(arrow, toPage([corner(shape.line[0]), corner(shape.line[1])]));
        line.name = name + "Body";
        styleStroke(line, color, ARROW_STROKE_PT);
        var head = arrow.pathItems.add();
        var headPoints = [];
        for (var h = 0; h < shape.head.length; h++) headPoints.push(pagePoint(shape.head[h]));
        head.setEntirePath(headPoints);
        head.closed = shape.closed;
        head.name = name + "Head";
        if (shape.closed) {
            head.stroked = false;
            head.filled = true;
            head.fillColor = color;
        } else {
            styleStroke(head, color, ARROW_STROKE_PT);
            head.strokeJoin = StrokeJoin.MITERENDJOIN;
        }
        return arrow;
    }

    function makeColor(index) {
        var c = COLORS[index];
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = c.cmyk[0];
            cmyk.magenta = c.cmyk[1];
            cmyk.yellow = c.cmyk[2];
            cmyk.black = c.cmyk[3];
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = c.rgb[0];
        rgb.green = c.rgb[1];
        rgb.blue = c.rgb[2];
        return rgb;
    }

    // 글자 테두리의 가로 기준(l 왼쪽, c 가운데, r 오른쪽)과 세로 기준(t 위, m 가운데, b 아래)이 (x, y)에 오도록 옮긴다
    function placeText(frame, x, y, h, v) {
        var b = frame.geometricBounds; // [left, top, right, bottom]
        var dx = h === "l" ? x - b[0] : (h === "r" ? x - b[2] : x - (b[0] + b[2]) / 2);
        var dy = v === "t" ? y - b[1] : (v === "b" ? y - b[3] : y - (b[1] + b[3]) / 2);
        frame.translate(dx, dy);
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // 잠기거나 숨긴 레이어에 넣으면 MRAP 오류가 난다. 편집할 수 있는 레이어를 고른다
    function findEditableLayer() {
        var active = doc.activeLayer;
        if (!active.locked && active.visible) return active;
        for (var i = 0; i < doc.layers.length; i++) {
            if (!doc.layers[i].locked && doc.layers[i].visible) return doc.layers[i];
        }
        return doc.layers.add();
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

    // 라벨 (단위): | 입력창 | 스크롤바 | R
    function addRow(parent, key, label, unit) {
        var spec = SPECS[key];
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label + " (" + unit + "):");
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(options[key], spec.decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, options[key], spec.range[0], spec.range[1]);
        slider.stepdelta = spec.step;
        slider.jumpdelta = spec.step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        rows[key] = {label: labelText, input: input, slider: slider, reset: reset,
            min: spec.range[0], max: spec.range[1], step: spec.step, decimals: spec.decimals};
        return rows[key];
    }

    // 색 고르기 목록. 고르면 바로 옵션에 쓰고 미리보기를 다시 그린다
    function addColorList(parent, key, helpText) {
        var names = [];
        for (var i = 0; i < COLORS.length; i++) names.push(COLORS[i].name);
        var list = parent.add("dropdownlist", undefined, names);
        list.preferredSize.width = COLOR_LIST_WIDTH;
        list.helpTip = helpText;
        list.selection = options[key];
        list.onChange = function() {
            if (!list.selection) return;
            options[key] = list.selection.index;
            updatePreview();
        };
        return list;
    }

    // 값을 그대로(단계로 반올림하지 않고) 입력창과 스크롤바에 보여 준다
    function showRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = clamp(value, controls.min, controls.max); } catch (e) {}
    }

    // 값이 바뀌면 옵션에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, key) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            showRowValue(controls, value);
            if (value === options[key]) return;
            options[key] = value;
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, key, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - options[key]) * MM;
            options[key] = value;
            showRowValue(controls, value);
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
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
        return Math.round(Math.round(value / step) * step * 1000000) / 1000000;
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
    // "v2" + 파형 + 같게 둘 + 표시 셋 + 색 다섯 + 미리보기 + 숫자(NUMBER_KEYS 순서) + 화살촉 모양. 확인할 때만 저장
    // -------------------------------------------------------
    function flag(value) { return value ? "1" : "0"; }

    function saveSettings() {
        var parts = ["v2", options.shape, flag(options.sameAmp), flag(options.sameWl),
            flag(options.arrowsOn), flag(options.dotOn), flag(options.captionOn),
            options.colorWave1, options.colorWave2, options.colorSum, options.colorArrow1, options.colorArrow2,
            flag(options.previewOn)];
        for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        parts.push(options.headShape);
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 14 + NUMBER_KEYS.length) return;
        var shape = parseInt(p[1], 10);
        if (shape === PULSE || shape === TRAIN) options.shape = shape;
        options.sameAmp = (p[2] === "1");
        options.sameWl = (p[3] === "1");
        options.arrowsOn = (p[4] === "1");
        options.dotOn = (p[5] === "1");
        options.captionOn = (p[6] === "1");
        var colorKeys = ["colorWave1", "colorWave2", "colorSum", "colorArrow1", "colorArrow2"];
        for (var c = 0; c < colorKeys.length; c++) {
            var colorIndex = parseInt(p[7 + c], 10);
            if (colorIndex >= 0 && colorIndex < COLORS.length) options[colorKeys[c]] = colorIndex;
        }
        options.previewOn = (p[12] === "1");
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[13 + i]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
        var headShape = parseInt(p[13 + NUMBER_KEYS.length], 10);
        if (headShape >= 0 && headShape < HEAD_SHAPES.length) options.headShape = headShape;
    }
})();
