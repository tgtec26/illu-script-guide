// Object_StatChart.jsx
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

// 통계 그래프: 중학교 통계 단원의 세 가지 그래프를 그린다.
// - 히스토그램·도수분포다각형: 첫 계급의 시작값·계급 크기·도수(2, 5, 8, 4, 1)로 막대와 다각형(양 끝 도수 0인 계급까지), 상대도수로도
// - 상자그림: 자료(3, 5, 7, …)로 최솟값·제1사분위수·중앙값·제3사분위수·최댓값 (사분위수는 중앙값을 뺀 아래·위 절반의 중앙값)
// - 산점도: (160,50) (165,55) … 순서쌍
// 선 두께는 평가원 그림 측정값에 맞춘 과학 기준: 축·막대 테두리 0.4pt, 다각형·상자 0.8pt.
// 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
// 입력 파싱은 글자 단위로 한다: ExtendScript는 (.+?)가 든 정규식이 실패하면 멈추고, 등호로 시작하는 정규식은 문법 오류다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "StatChart/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var LABEL_WIDTH = 100;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var TEXT_WIDTH = 300;
    var KINDS = ["히스토그램 · 도수분포다각형", "상자그림", "산점도"];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ITALIC_FONT_NAME = "GSMediItaC1";
    var ENG_BASELINE_PT = 0.5;
    var AXIS_PT = 0.4;
    var MAIN_PT = 0.8;
    var BAR_K = 15;
    var TICK_MM = 1.2;
    var DOT_RADIUS_MM = 0.6;
    var BOX_HEIGHT_MM = 6;
    var LABEL_GAP_MM = 0.8;
    var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };   // pt. 좌표평면과 같은 평가원식 화살촉

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var layer = findEditableLayer();
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var kind = 0;
    var widthMm = 60;
    var heightMm = 40;
    var fontPt = 8;
    var classStart = 140;
    var classWidth = 5;
    var frequencyText = "2, 5, 8, 4, 1";
    var showBars = true;
    var showPolygon = false;
    var relative = false;
    var boxText = "3, 5, 6, 7, 8, 9, 10, 12, 15";
    var scatterText = "(160,50) (165,55) (170,58) (155,48) (175,65)";
    var xName = "(cm)";
    var yName = "(명)";
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    applySettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "통계 그래프");
    win.alignChildren = "fill";

    var kindRow = win.add("group");
    kindRow.add("statictext", undefined, "종류:");
    var kindList = kindRow.add("dropdownlist", undefined, KINDS);
    kindList.selection = kind;

    var sizePanel = addPanel(win, "크기");
    var widthControls = addValueRow(sizePanel, "가로", "mm", widthMm, 20, 150, 1, 0);
    var heightControls = addValueRow(sizePanel, "세로", "mm", heightMm, 15, 120, 1, 0);
    heightControls.input.helpTip = "상자그림에는 쓰지 않는다";
    var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

    var histogramPanel = addPanel(win, "도수분포");
    var startControls = addValueRow(histogramPanel, "첫 계급 시작", "", classStart, 0, 1000, 1, 0);
    var classControls = addValueRow(histogramPanel, "계급 크기", "", classWidth, 0.5, 100, 0.5, 1);
    var frequencyInput = addTextRow(histogramPanel, "도수:", frequencyText, "계급마다 도수를 쉼표로 (2, 5, 8, 4, 1)");
    var histogramChecks = histogramPanel.add("group");
    var barsCheck = histogramChecks.add("checkbox", undefined, "히스토그램");
    var polygonCheck = histogramChecks.add("checkbox", undefined, "도수분포다각형");
    var relativeCheck = histogramChecks.add("checkbox", undefined, "상대도수");

    var dataPanel = addPanel(win, "자료");
    var boxInput = addTextRow(dataPanel, "상자그림:", boxText, "자료 값을 쉼표로 (3, 5, 6, 7, …)");
    var scatterInput = addTextRow(dataPanel, "산점도:", scatterText, "(x,y) 순서쌍을 공백으로 ((160,50) (165,55))");

    var axisPanel = addPanel(win, "축 이름");
    var xNameInput = addTextRow(axisPanel, "가로:", xName, "가로축 끝에 붙는 글자 (cm), 키 (cm)");
    var yNameInput = addTextRow(axisPanel, "세로:", yName, "세로축 위에 붙는 글자 (명). 상대도수를 켜면 비워도 된다");
    var messageText = win.add("statictext", undefined, " ");
    messageText.preferredSize.width = 360;

    var positionPanel = addPanel(win, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}

    barsCheck.value = showBars;
    polygonCheck.value = showPolygon;
    relativeCheck.value = relative;
    previewCheck.value = previewEnabled;
    refreshEnabled();

    kindList.onChange = function() {
        kind = kindList.selection ? kindList.selection.index : 0;
        refreshEnabled();
        updatePreview();
    };
    bindValueRow(widthControls, function(value) { widthMm = value; });
    bindValueRow(heightControls, function(value) { heightMm = value; });
    bindValueRow(fontControls, function(value) { fontPt = value; });
    bindValueRow(startControls, function(value) { classStart = value; });
    bindValueRow(classControls, function(value) { classWidth = value; });
    frequencyInput.onChanging = function() { frequencyText = frequencyInput.text; updatePreview(); };
    boxInput.onChanging = function() { boxText = boxInput.text; updatePreview(); };
    scatterInput.onChanging = function() { scatterText = scatterInput.text; updatePreview(); };
    xNameInput.onChanging = function() { xName = xNameInput.text; updatePreview(); };
    yNameInput.onChanging = function() { yName = yNameInput.text; updatePreview(); };
    barsCheck.onClick = function() { showBars = barsCheck.value; updatePreview(); };
    polygonCheck.onClick = function() { showPolygon = polygonCheck.value; updatePreview(); };
    relativeCheck.onClick = function() { relative = relativeCheck.value; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        if (previewGroup !== null) previewGroup.selected = true;
        win.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    if (win.show() !== 1) {
        clearPreview();
        app.redraw();
    }

    function refreshEnabled() {
        histogramPanel.enabled = kind === 0;
        boxInput.parent.enabled = kind === 1;
        scatterInput.parent.enabled = kind === 2;
        heightControls.input.parent.enabled = kind !== 1;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
    }

    function buildPreview() {
        var size = { width: widthMm * MM_TO_PT, height: heightMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, xName: xName, yName: yName };
        var drawing = null, problem = "";
        if (kind === 0) {
            var frequencies = parseNumberList(frequencyText);
            if (frequencies === null || frequencies.length === 0) problem = "도수를 읽지 못함";
            else drawing = buildHistogram(size, classStart, classWidth, frequencies, showBars, showPolygon, relative);
        } else if (kind === 1) {
            var values = parseNumberList(boxText);
            if (values === null || values.length < 2) problem = "자료를 2개 이상 넣어주세요";
            else drawing = buildBoxPlot(size, values, BOX_HEIGHT_MM * MM_TO_PT);
        } else {
            var pairs = parsePairs(scatterText);
            if (pairs === null || pairs.length === 0) problem = "순서쌍을 읽지 못함";
            else drawing = buildScatter(size, pairs);
        }
        messageText.text = problem || " ";
        if (drawing === null) return;

        previewGroup = layer.groupItems.add();
        previewGroup.name = "통계 그래프 (" + KINDS[kind] + ")";
        for (var i = 0; i < drawing.bars.length; i++) addBar(drawing.bars[i]);
        for (var j = 0; j < drawing.lines.length; j++) addLine(drawing.lines[j]);
        for (var k = 0; k < drawing.arrows.length; k++) addArrow(drawing.arrows[k]);
        for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
        for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
        previewGroup.translate(viewCenter[0] - size.width / 2 + offsetXmm * MM_TO_PT,
            viewCenter[1] - size.height / 2 + offsetYmm * MM_TO_PT);
    }

    // line: {points, main}
    function addLine(line) {
        var path = previewGroup.pathItems.add();
        path.setEntirePath(line.points);
        path.closed = !!line.closed;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = line.main ? MAIN_PT : AXIS_PT;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
    }

    // [left, bottom, right, top]
    function addBar(bar) {
        var rect = previewGroup.pathItems.rectangle(bar[3], bar[0], bar[2] - bar[0], bar[3] - bar[1]);
        rect.filled = true;
        rect.fillColor = makeGray(BAR_K);
        rect.stroked = true;
        rect.strokeColor = makeGray(100);
        rect.strokeWidth = AXIS_PT;
    }

    // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
    function addArrow(arrow) {
        var d = arrow.dir, n = [-d[1], d[0]];
        var tip = arrow.tip;
        var back = [tip[0] - d[0] * ARROW.length, tip[1] - d[1] * ARROW.length];
        var path = previewGroup.pathItems.add();
        path.setEntirePath([
            tip,
            [back[0] + n[0] * ARROW.halfWidth, back[1] + n[1] * ARROW.halfWidth],
            [back[0] + d[0] * ARROW.notch, back[1] + d[1] * ARROW.notch],
            [back[0] - n[0] * ARROW.halfWidth, back[1] - n[1] * ARROW.halfWidth]
        ]);
        path.closed = true;
        path.stroked = false;
        path.filled = true;
        path.fillColor = makeGray(100);
    }

    function addDot(at) {
        var r = DOT_RADIUS_MM * MM_TO_PT;
        var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
        circle.stroked = false;
        circle.filled = true;
        circle.fillColor = makeGray(100);
    }

    // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
    function addLabel(label) {
        var frame = previewGroup.textFrames.add();
        frame.contents = label.text;
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
        var dir = label.dir;
        var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
        var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
    // 따로 떨어진 소문자 한 글자(x)는 변수라 GSMediItaC1
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var character = frame.textRange.characters[i];
            var attributes = character.characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else if (/[a-z]/.test(text.charAt(i)) && !/[A-Za-z]/.test(text.charAt(i - 1)) && !/[A-Za-z]/.test(text.charAt(i + 1))) {
                attributes.textFont = italicFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
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
    // 계산 (일러 DOM을 쓰지 않는다 → tests/check-stat-chart.js). 그래프 왼쪽 아래가 (0,0)
    // -------------------------------------------------------
    // 계급 i(0부터)는 가로 [i+1, i+2] 칸. 앞뒤 한 칸은 도수 0인 계급이라 다각형이 축에서 시작하고 끝난다
    function buildHistogram(size, start, width, frequencies, bars, polygon, isRelative) {
        var out = emptyDrawing();
        var n = frequencies.length;
        var total = 0, top = 0;
        for (var i = 0; i < n; i++) total += frequencies[i];
        var ys = [];
        for (var j = 0; j < n; j++) {
            ys.push(isRelative ? (total > 0 ? frequencies[j] / total : 0) : frequencies[j]);
            top = Math.max(top, ys[j]);
        }
        var yAxis = niceAxis(0, top > 0 ? top : 1);
        var sx = size.width / (n + 2), sy = size.height / yAxis.max;

        addAxes(out, size, size.xName, size.yName);
        addYTicks(out, yAxis, sy, size.tick);
        for (var b = 0; b <= n; b++) {
            var x = (b + 1) * sx;
            out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]] });
            out.texts.push({ text: formatValue(start + b * width, width), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
        }
        if (bars) {
            for (var c = 0; c < n; c++) if (ys[c] > 0) out.bars.push([(c + 1) * sx, 0, (c + 2) * sx, ys[c] * sy]);
        }
        if (polygon) {
            var points = [[0.5 * sx, 0]];
            for (var p = 0; p < n; p++) points.push([(p + 1.5) * sx, ys[p] * sy]);
            points.push([(n + 1.5) * sx, 0]);
            out.lines.push({ points: points, main: true });
            for (var q = 0; q < points.length; q++) out.dots.push(points[q]);
        }
        return out;
    }

    // 가로 수직선 위에 상자그림. 상자는 축 위로 boxHeight
    function buildBoxPlot(size, values, boxHeight) {
        var out = emptyDrawing();
        var s = quartiles(values);
        var axis = niceAxis(s.min, s.max);
        var scale = size.width / (axis.max - axis.min);
        function X(v) { return (v - axis.min) * scale; }

        out.lines.push({ points: [[0, 0], [size.width, 0]] });
        for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
            var x = X(v);
            out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]] });
            out.texts.push({ text: formatValue(v, axis.step), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
        }
        if (size.xName) out.texts.push({ text: size.xName, at: [size.width, 0], dir: [1, 0], clear: 0 });

        var y0 = boxHeight * 0.8, y1 = y0 + boxHeight, mid = (y0 + y1) / 2;
        out.lines.push({ points: [[X(s.q1), y0], [X(s.q3), y0], [X(s.q3), y1], [X(s.q1), y1]], closed: true, main: true });
        out.lines.push({ points: [[X(s.median), y0], [X(s.median), y1]], main: true });
        out.lines.push({ points: [[X(s.min), mid], [X(s.q1), mid]], main: true });
        out.lines.push({ points: [[X(s.q3), mid], [X(s.max), mid]], main: true });
        var cap = boxHeight * 0.25;
        out.lines.push({ points: [[X(s.min), mid - cap], [X(s.min), mid + cap]], main: true });
        out.lines.push({ points: [[X(s.max), mid - cap], [X(s.max), mid + cap]], main: true });
        return out;
    }

    function buildScatter(size, pairs) {
        var out = emptyDrawing();
        var xs = [], ys = [];
        for (var i = 0; i < pairs.length; i++) {
            xs.push(pairs[i][0]);
            ys.push(pairs[i][1]);
        }
        var xAxis = padAxis(niceAxis(Math.min.apply(null, xs), Math.max.apply(null, xs)), xs);
        var yAxis = padAxis(niceAxis(Math.min.apply(null, ys), Math.max.apply(null, ys)), ys);
        var sx = size.width / (xAxis.max - xAxis.min), sy = size.height / (yAxis.max - yAxis.min);

        addAxes(out, size, size.xName, size.yName);
        for (var v = xAxis.min; v <= xAxis.max + xAxis.step / 2; v += xAxis.step) {
            var x = (v - xAxis.min) * sx;
            if (v > xAxis.min) out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]] });
            out.texts.push({ text: formatValue(v, xAxis.step), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
        }
        for (var w = yAxis.min + yAxis.step; w <= yAxis.max + yAxis.step / 2; w += yAxis.step) {
            var y = (w - yAxis.min) * sy;
            out.lines.push({ points: [[-size.tick / 2, y], [size.tick / 2, y]] });
            out.texts.push({ text: formatValue(w, yAxis.step), at: [0, y], dir: [-1, 0], clear: size.tick / 2 });
        }
        // 세로축 맨 아래 값은 가로축 첫 값과 겹치지 않게 모서리 왼쪽에
        out.texts.push({ text: formatValue(yAxis.min, yAxis.step), at: [0, 0], dir: [-1, 0], clear: size.tick / 2 });
        for (var p = 0; p < pairs.length; p++) out.dots.push([(pairs[p][0] - xAxis.min) * sx, (pairs[p][1] - yAxis.min) * sy]);
        return out;
    }

    // 산점도: 가장 작은 자료가 축 위에 얹히지 않게 한 칸 넓힌다
    function padAxis(axis, values) {
        if (Math.min.apply(null, values) - axis.min < axis.step * 0.25) axis.min = roundTo(axis.min - axis.step, axis.step / 1000);
        return axis;
    }

    function emptyDrawing() {
        return { bars: [], lines: [], arrows: [], dots: [], texts: [] };
    }

    // 왼쪽 아래 (0,0)에서 시작하는 두 축과 평가원식 화살촉, 축 이름
    function addAxes(out, size, xLabel, yLabel) {
        var right = size.width + ARROW.length * 2.5, top = size.height + ARROW.length * 2.5;
        out.lines.push({ points: [[0, 0], [right - ARROW.length + ARROW.notch, 0]] });
        out.lines.push({ points: [[0, 0], [0, top - ARROW.length + ARROW.notch]] });
        out.arrows.push({ tip: [right, 0], dir: [1, 0] });
        out.arrows.push({ tip: [0, top], dir: [0, 1] });
        if (xLabel) out.texts.push({ text: xLabel, at: [right, 0], dir: [1, 0], clear: 0 });
        if (yLabel) out.texts.push({ text: yLabel, at: [0, top], dir: [0, 1], clear: 0 });
    }

    function addYTicks(out, axis, scale, tick) {
        for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
            var y = (v - axis.min) * scale;
            if (v > axis.min) out.lines.push({ points: [[-tick / 2, y], [tick / 2, y]] });
            out.texts.push({ text: formatValue(v, axis.step), at: [0, y], dir: [-1, 0], clear: tick / 2 });
        }
    }

    // low~high를 담는 눈금: 간격은 1·2·5×10ⁿ, 칸은 6개 이하 (상대도수는 0.1 간격이 되게)
    function niceAxis(low, high) {
        if (high <= low) high = low + 1;
        var raw = (high - low) / 5;
        var power = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
        var step = power;
        var candidates = [1, 2, 5, 10];
        for (var i = 0; i < candidates.length; i++) {
            step = candidates[i] * power;
            if ((high - low) / step <= 6) break;
        }
        var min = Math.floor(low / step + 1e-9) * step;
        var max = Math.ceil(high / step - 1e-9) * step;
        if (max <= min) max = min + step;
        return { min: roundTo(min, step / 1000), max: roundTo(max, step / 1000), step: step };
    }

    // 간격의 소수 자리에 맞춘 글자 (0은 그냥 0)
    function formatValue(value, step) {
        if (Math.abs(value) < step * 1e-6) return "0";
        var decimals = 0;
        while (decimals < 6 && Math.abs(step * Math.pow(10, decimals) - Math.round(step * Math.pow(10, decimals))) > 1e-9) decimals++;
        return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
    }

    // 중학교 교과서 방식: 중앙값을 뺀 아래·위 절반의 중앙값이 제1·제3사분위수
    function quartiles(values) {
        var sorted = values.slice().sort(function(a, b) { return a - b; });
        var n = sorted.length, half = Math.floor(n / 2);
        return {
            min: sorted[0], max: sorted[n - 1], median: median(sorted),
            q1: median(sorted.slice(0, half)), q3: median(sorted.slice(n - half))
        };
    }

    function median(sorted) {
        var n = sorted.length;
        return n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }

    // "2, 5, 8" 또는 "2 5 8" → [2,5,8]. 하나라도 숫자가 아니면 null
    function parseNumberList(text) {
        var parts = String(text).split(/[\s,，]+/);
        var list = [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === "") continue;
            var value = strictNumber(parts[i]);
            if (value === null) return null;
            list.push(value);
        }
        return list;
    }

    // "(160,50) (165,55)" → [[160,50],[165,55]]. 괄호 밖 공백·쉼표·세미콜론은 구분자. 못 읽으면 null
    function parsePairs(text) {
        var s = String(text), list = [], i = 0;
        while (i < s.length) {
            var ch = s.charAt(i);
            if (ch === " " || ch === "," || ch === ";" || ch === "\t") { i++; continue; }
            if (ch !== "(") return null;
            var close = s.indexOf(")", i);
            if (close < 0) return null;
            var inner = s.substring(i + 1, close);
            var comma = inner.indexOf(",");
            if (comma < 0) return null;
            var x = strictNumber(inner.substring(0, comma)), y = strictNumber(inner.substring(comma + 1));
            if (x === null || y === null) return null;
            list.push([x, y]);
            i = close + 1;
        }
        return list;
    }

    // 부호·숫자·소수점만 있는 수 ("1e3", "12abc"는 null)
    function strictNumber(text) {
        var s = String(text).replace(/\s/g, "").split("−").join("-");
        if (s === "") return null;
        var dots = 0, digits = 0;
        for (var i = 0; i < s.length; i++) {
            var ch = s.charAt(i);
            if (ch === "-" && i === 0) continue;
            if (ch === ".") { dots++; continue; }
            if (ch < "0" || ch > "9") return null;
            digits++;
        }
        if (digits === 0 || dots > 1) return null;
        return parseFloat(s);
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

    function addTextRow(parent, label, value, tip) {
        var row = parent.add("group");
        row.add("statictext", undefined, label).preferredSize.width = 60;
        var input = row.add("edittext", undefined, value);
        input.preferredSize.width = TEXT_WIDTH;
        input.helpTip = tip;
        return input;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
    }

    function setRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindValueRow(controls, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setRowValue(controls, value);
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? controls.slider.value : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            setRowValue(controls, value);
            if (delta === 0 || previewGroup === null) return;
            previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            "v1", kind, widthMm, heightMm, fontPt, classStart, classWidth, encodeURIComponent(frequencyText),
            showBars ? "1" : "0", showPolygon ? "1" : "0", relative ? "1" : "0",
            encodeURIComponent(boxText), encodeURIComponent(scatterText), encodeURIComponent(xName), encodeURIComponent(yName),
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 18) return;
        try {
            kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
            widthMm = restoreNumber(p[2], widthMm, 20, 150);
            heightMm = restoreNumber(p[3], heightMm, 15, 120);
            fontPt = restoreNumber(p[4], fontPt, 5, 14);
            classStart = restoreNumber(p[5], classStart, 0, 1000);
            classWidth = restoreNumber(p[6], classWidth, 0.5, 100);
            frequencyText = decodeURIComponent(p[7]);
            showBars = p[8] === "1";
            showPolygon = p[9] === "1";
            relative = p[10] === "1";
            boxText = decodeURIComponent(p[11]);
            scatterText = decodeURIComponent(p[12]);
            xName = decodeURIComponent(p[13]);
            yName = decodeURIComponent(p[14]);
            offsetXmm = restoreNumber(p[15], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            offsetYmm = restoreNumber(p[16], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            previewEnabled = p[17] === "1";
        } catch (restoreError) {}
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }
})();
