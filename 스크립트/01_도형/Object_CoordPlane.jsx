// Object_CoordPlane.jsx
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

// 좌표평면: x축·y축(끝에 가늘고 뾰족한 화살촉, x·y·O), 격자, 정수 눈금과 숫자,
// 함수 그래프 3개까지(y=2x+1, y=-x^2+4, y=6/x, y=1/2x, y=√x), 점(A(2,3))과 두 축으로 내린 점선을 그린다.
// 선 두께는 평가원 수능 그림 측정값(축 약 0.36pt, 그래프 약 0.84pt)에 맞춘 과학 기준: 축 0.4pt, 그래프 0.8pt, 보조선 0.3pt.
// 그래프는 함수값과 기울기로 만든 베지어(에르미트)라 적은 점으로 매끄럽고, 좌표 범위 밖은 잘라낸다.
// 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
// 입력 파싱은 글자 단위로 한다: ExtendScript는 (.+?)가 든 정규식이 실패하면 멈추고, 등호로 시작하는 정규식은 문법 오류다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "CoordPlane/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var LABEL_WIDTH = 100;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var FUNCTION_COUNT = 3;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ITALIC_FONT_NAME = "GSMediItaC1";
    var ENG_BASELINE_PT = 0.5;
    var AXIS_PT = 0.4;
    var GRAPH_PT = 0.8;
    var GUIDE_PT = 0.3;
    var GRID_K = 30;
    var GUIDE_DASH = [2, 1.5];
    var TICK_MM = 1.2;
    var DOT_RADIUS_MM = 0.6;
    var LABEL_GAP_MM = 0.8;
    var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };   // pt. 평가원 축 화살촉처럼 가늘고 뒤가 파인 모양

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var layer = findEditableLayer();
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var xMin = -5, xMax = 5, yMin = -5, yMax = 5;
    var unitMm = 6;
    var fontPt = 8;
    var showGrid = false;
    var showNumbers = true;
    var functionTexts = ["y=2x+1", "", ""];
    var pointsText = "";
    var showCoords = true;
    var showGuides = true;
    var showFormulas = true;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    applySettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "좌표평면");
    win.alignChildren = "fill";

    var rangePanel = addPanel(win, "범위 · 눈금");
    var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
    var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
    var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
    var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
    var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
    var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
    var axisChecks = rangePanel.add("group");
    var gridCheck = axisChecks.add("checkbox", undefined, "격자");
    var numbersCheck = axisChecks.add("checkbox", undefined, "눈금 숫자");

    var functionPanel = addPanel(win, "함수 그래프");
    var functionInputs = [];
    for (var f = 0; f < FUNCTION_COUNT; f++) {
        var functionRow = functionPanel.add("group");
        functionRow.add("statictext", undefined, (f + 1) + ":").preferredSize.width = 20;
        var functionInput = functionRow.add("edittext", undefined, functionTexts[f]);
        functionInput.preferredSize.width = 320;
        functionInput.helpTip = "y=2x+1, y=-x^2+4, y=6/x, y=1/2x, y=√x, y=(x-1)^2. ^는 거듭제곱, 곱셈 기호는 생략해도 된다";
        functionInputs.push(functionInput);
    }
    var formulaCheck = functionPanel.add("checkbox", undefined, "그래프 끝에 식 표시");

    var pointPanel = addPanel(win, "점");
    var pointsRow = pointPanel.add("group");
    pointsRow.add("statictext", undefined, "점:").preferredSize.width = 20;
    var pointsInput = pointsRow.add("edittext", undefined, pointsText);
    pointsInput.preferredSize.width = 320;
    pointsInput.helpTip = "A(2,3) B(-1,-2) P(1/2,√2). 이름 없이 (2,3)만 써도 된다";
    var pointChecks = pointPanel.add("group");
    var coordsCheck = pointChecks.add("checkbox", undefined, "좌표 함께 표시");
    var guidesCheck = pointChecks.add("checkbox", undefined, "축까지 점선");
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

    gridCheck.value = showGrid;
    numbersCheck.value = showNumbers;
    formulaCheck.value = showFormulas;
    coordsCheck.value = showCoords;
    guidesCheck.value = showGuides;
    previewCheck.value = previewEnabled;

    bindValueRow(xMinControls, function(value) { xMin = value; });
    bindValueRow(xMaxControls, function(value) { xMax = value; });
    bindValueRow(yMinControls, function(value) { yMin = value; });
    bindValueRow(yMaxControls, function(value) { yMax = value; });
    bindValueRow(unitControls, function(value) { unitMm = value; });
    bindValueRow(fontControls, function(value) { fontPt = value; });
    gridCheck.onClick = function() { showGrid = gridCheck.value; updatePreview(); };
    numbersCheck.onClick = function() { showNumbers = numbersCheck.value; updatePreview(); };
    formulaCheck.onClick = function() { showFormulas = formulaCheck.value; updatePreview(); };
    coordsCheck.onClick = function() { showCoords = coordsCheck.value; updatePreview(); };
    guidesCheck.onClick = function() { showGuides = guidesCheck.value; updatePreview(); };
    for (var fi = 0; fi < FUNCTION_COUNT; fi++) bindFunctionInput(fi);
    pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        previewGroup.selected = true;
        win.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    if (win.show() !== 1) {
        clearPreview();
        app.redraw();
    }

    function bindFunctionInput(index) {
        functionInputs[index].onChanging = function() {
            functionTexts[index] = functionInputs[index].text;
            updatePreview();
        };
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
        var problems = [];
        var functions = [];
        for (var i = 0; i < FUNCTION_COUNT; i++) {
            if (String(functionTexts[i]).replace(/\s/g, "") === "") continue;
            var compiled = compileFunction(functionTexts[i]);
            if (compiled === null) problems.push((i + 1) + "번 식");
            else functions.push({ fn: compiled, label: functionTexts[i] });
        }
        var points = parsePointList(pointsText);
        if (points.bad.length > 0) problems.push("점 " + points.bad.join(", "));
        messageText.text = problems.length > 0 ? "읽지 못함: " + problems.join(" / ") : " ";

        var drawing = buildPlane({
            xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT,
            tick: TICK_MM * MM_TO_PT, grid: showGrid, numbers: showNumbers,
            functions: functions, formulas: showFormulas,
            points: points.list, coords: showCoords, guides: showGuides
        });

        previewGroup = layer.groupItems.add();
        previewGroup.name = "좌표평면";
        for (var j = 0; j < drawing.lines.length; j++) addPath(drawing.lines[j]);
        for (var k = 0; k < drawing.arrows.length; k++) addArrow(drawing.arrows[k]);
        for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
        for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
        previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
    }

    // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"grid"|"guide"}
    function addPath(line) {
        var path = previewGroup.pathItems.add();
        var anchors = [];
        for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
        path.setEntirePath(anchors);
        if (line.kind === "graph") {
            for (var j = 0; j < line.points.length; j++) {
                var point = path.pathPoints[j];
                point.leftDirection = line.points[j].left;
                point.rightDirection = line.points[j].right;
            }
        }
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
        path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
        if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
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

    // at에서 dir 쪽으로 gap(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
    function addLabel(label) {
        var frame = previewGroup.textFrames.add();
        frame.contents = label.text;
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame, label.upright);
        if (label.sup) {
            for (var s = 0; s < label.sup.length; s++) {
                var character = frame.textRange.characters[label.sup[s]];
                var supAttributes = character.characterAttributes;
                supAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
            }
        }
        var b = frame.geometricBounds;
        var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
        var dir = label.dir;
        var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
        var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
    // 소문자 변수(x, y, f)는 GSMediItaC1. 점 이름·O(upright)는 기울이지 않는다
    function applyTextFonts(frame, upright) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var character = frame.textRange.characters[i];
            var attributes = character.characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else if (!upright && code >= 97 && code <= 122) {
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
    // 계산 (일러 DOM을 쓰지 않는다 → tests/check-coord-plane.js). 원점 (0,0), 1 = unit pt
    // -------------------------------------------------------
    function buildPlane(opt) {
        var u = opt.unit;
        var lines = [], arrows = [], dots = [], texts = [];
        var left = Math.min(opt.xMin, 0) - 0.5, right = opt.xMax + 0.8;
        var bottom = Math.min(opt.yMin, 0) - 0.5, top = opt.yMax + 0.8;

        if (opt.grid) {
            for (var gx = opt.xMin; gx <= opt.xMax; gx++) if (gx !== 0) lines.push(straight([[gx * u, opt.yMin * u], [gx * u, opt.yMax * u]], "grid"));
            for (var gy = opt.yMin; gy <= opt.yMax; gy++) if (gy !== 0) lines.push(straight([[opt.xMin * u, gy * u], [opt.xMax * u, gy * u]], "grid"));
        }

        // 축은 화살촉 뒤에서 끝낸다 (선 끝이 뾰족한 촉 밖으로 나오지 않게)
        lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
        lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
        arrows.push({ tip: [right * u, 0], dir: [1, 0] });
        arrows.push({ tip: [0, top * u], dir: [0, 1] });
        texts.push({ text: "x", at: [right * u, 0], dir: [0, -1], clear: 0 });
        texts.push({ text: "y", at: [0, top * u], dir: [-1, 0], clear: 0 });
        texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], clear: 0, upright: true });

        for (var tx = opt.xMin; tx <= opt.xMax; tx++) {
            if (tx === 0) continue;
            lines.push(straight([[tx * u, -opt.tick / 2], [tx * u, opt.tick / 2]], "axis"));
            if (opt.numbers) texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: opt.tick / 2 });
        }
        for (var ty = opt.yMin; ty <= opt.yMax; ty++) {
            if (ty === 0) continue;
            lines.push(straight([[-opt.tick / 2, ty * u], [opt.tick / 2, ty * u]], "axis"));
            if (opt.numbers) texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: opt.tick / 2 });
        }

        for (var f = 0; f < opt.functions.length; f++) {
            var segments = plotFunction(opt.functions[f].fn, opt.xMin, opt.xMax, opt.yMin, opt.yMax);
            for (var s = 0; s < segments.length; s++) {
                if (segments[s].length < 2) continue;
                lines.push({ points: toBezier(segments[s], u), kind: "graph" });
            }
            if (opt.formulas && segments.length > 0) {
                var lastSegment = segments[segments.length - 1];
                var end = lastSegment[lastSegment.length - 1];
                var display = formulaDisplay(opt.functions[f].label);
                texts.push({ text: display.text, sup: display.sup, at: [end.x * u, end.y * u], dir: [1, 0], clear: 0 });
            }
        }

        for (var p = 0; p < opt.points.length; p++) {
            var point = opt.points[p];
            var at = [point.x * u, point.y * u];
            if (opt.guides) {
                if (point.y !== 0) lines.push(straight([at, [at[0], 0]], "guide"));
                if (point.x !== 0) lines.push(straight([at, [0, at[1]]], "guide"));
            }
            dots.push(at);
            var name = point.name;
            if (opt.coords) name += "(" + point.xText + ", " + point.yText + ")";
            if (name) texts.push({ text: name, at: at, dir: [point.x < 0 ? -0.7071 : 0.7071, 0.7071], clear: 0, upright: true });
        }
        return { lines: lines, arrows: arrows, dots: dots, texts: texts };
    }

    function straight(anchors, kind) {
        var points = [];
        for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
        return { points: points, kind: kind };
    }

    // 좌표 범위 [x0,x1]×[y0,y1] 안에 드는 조각들. 각 점 {x, y, m(기울기)}
    function plotFunction(fn, x0, x1, y0, y1) {
        var TOLERANCE = 0.004, MAX_DEPTH = 10, STEP = 0.25, LIMIT = 4000;
        var margin = (y1 - y0) * 1e-9;
        var segments = [], current = null, count = 0;

        function value(x) {
            var y;
            try { y = fn(x); } catch (e) { return NaN; }
            return (typeof y === "number" && isFinite(y)) ? y : NaN;
        }
        function inside(x) {
            var y = value(x);
            return !isNaN(y) && y >= y0 - margin && y <= y1 + margin;
        }
        function slope(x) {
            var h = 1e-5 * (1 + Math.abs(x));
            var a = value(x - h), b = value(x + h), c = value(x);
            if (!isNaN(a) && !isNaN(b)) return (b - a) / (2 * h);
            if (!isNaN(b)) return (b - c) / h;
            if (!isNaN(a)) return (c - a) / h;
            return 0;
        }
        function emit(x) {
            if (current === null) {
                current = [];
                segments.push(current);
            }
            if (count++ > LIMIT) return;
            var y = Math.min(y1, Math.max(y0, value(x)));
            current.push({ x: x, y: y, m: slope(x) });
        }
        function finish() { current = null; }
        // 안(inX)과 밖(outX) 사이 경계. 안쪽 끝을 돌려준다
        function edge(inX, outX) {
            for (var i = 0; i < 40; i++) {
                var mid = (inX + outX) / 2;
                if (inside(mid)) inX = mid;
                else outX = mid;
            }
            return inX;
        }
        // a는 이미 넣었다. b까지 넣는다
        function refine(a, b, depth) {
            var mid = (a + b) / 2;
            if (!inside(mid)) {
                var cut = edge(a, mid);
                if (cut > a) refine(a, cut, depth + 1);
                finish();
                var resume = edge(b, mid);
                emit(resume);
                if (b > resume) refine(resume, b, depth + 1);
                return;
            }
            var h = b - a;
            var ya = value(a), yb = value(b);
            var guess = (ya + yb) / 2 + h * (slope(a) - slope(b)) / 8;
            if (depth < MAX_DEPTH && Math.abs(guess - value(mid)) > TOLERANCE) {
                refine(a, mid, depth + 1);
                refine(mid, b, depth + 1);
            } else {
                emit(b);
            }
        }

        var steps = Math.ceil((x1 - x0) / STEP);
        for (var i = 0; i < steps; i++) {
            var a = x0 + (x1 - x0) * i / steps, b = x0 + (x1 - x0) * (i + 1) / steps;
            var inA = inside(a), inB = inside(b);
            if (inA && current === null) emit(a);
            if (inA && inB) {
                refine(a, b, 0);
            } else if (inA) {
                var last = edge(a, b);
                if (last > a) refine(a, last, 0);
                finish();
            } else if (inB) {
                var first = edge(b, a);
                emit(first);
                refine(first, b, 0);
            }
        }
        for (var k = 0; k < segments.length; k++) segments[k] = simplify(segments[k]);
        return segments;

        // 빼도 앞뒤 점의 에르미트 곡선이 함수에서 벗어나지 않는 점은 지운다 (직선은 두 점만 남는다)
        function simplify(points) {
            if (points.length < 3) return points;
            var kept = [points[0]];
            for (var i = 1; i < points.length - 1; i++) {
                if (!fits(kept[kept.length - 1], points[i + 1])) kept.push(points[i]);
            }
            kept.push(points[points.length - 1]);
            return kept;
        }
        function fits(p, q) {
            var h = q.x - p.x;
            for (var j = 1; j < 8; j++) {
                var t = j / 8, x = p.x + h * t, y = value(x);
                if (isNaN(y) || y < y0 - margin || y > y1 + margin) return false;
                var t2 = t * t, t3 = t2 * t;
                var guess = (2 * t3 - 3 * t2 + 1) * p.y + (t3 - 2 * t2 + t) * h * p.m + (-2 * t3 + 3 * t2) * q.y + (t3 - t2) * h * q.m;
                if (Math.abs(guess - y) > TOLERANCE) return false;
            }
            return true;
        }
    }

    // 에르미트 → 베지어: 핸들 = 이웃까지 x 간격의 1/3만큼 접선 방향
    function toBezier(points, unit) {
        var out = [];
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            var anchor = [p.x * unit, p.y * unit];
            var left = anchor, right = anchor;
            if (i > 0) {
                var hl = (p.x - points[i - 1].x) / 3;
                left = [(p.x - hl) * unit, (p.y - p.m * hl) * unit];
            }
            if (i < points.length - 1) {
                var hr = (points[i + 1].x - p.x) / 3;
                right = [(p.x + hr) * unit, (p.y + p.m * hr) * unit];
            }
            out.push({ anchor: anchor, left: left, right: right });
        }
        return out;
    }

    // 식 표시: ^와 *는 빼고, ^ 다음 숫자·글자 하나(또는 숫자들)는 위첨자
    function formulaDisplay(text) {
        var source = String(text).replace(/\s/g, "");
        var out = "", sup = [];
        for (var i = 0; i < source.length; i++) {
            var ch = source.charAt(i);
            if (ch === "*") continue;
            if (ch === "^") {
                var next = source.charAt(i + 1);
                if (next >= "0" && next <= "9") {
                    while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                        sup.push(out.length);
                        out += source.charAt(++i);
                    }
                } else if (next !== "") {
                    sup.push(out.length);
                    out += source.charAt(++i);
                }
                continue;
            }
            out += ch;
        }
        return { text: out, sup: sup };
    }

    // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null
    function compileFunction(text) {
        var s = String(text).replace(/\s/g, "").split("−").join("-").split("×").join("*").split("÷").join("/").split("²").join("^2").split("³").join("^3");
        var eq = s.indexOf("=");
        if (eq >= 0) s = s.substring(eq + 1);
        if (s === "") return null;
        var pos = 0;
        function peek() { return s.charAt(pos); }
        function isDigit(ch) { return ch >= "0" && ch <= "9"; }
        function expression() {
            var node = term();
            while (peek() === "+" || peek() === "-") {
                var op = s.charAt(pos++);
                node = binary(op, node, term());
            }
            return node;
        }
        function term() {
            var node = unary();
            while (peek() === "*" || peek() === "/" || peek() === "√" || peek() === "(" || peek() === "x" || isDigit(peek()) || peek() === ".") {
                var op = peek();
                if (op === "*" || op === "/") pos++;
                else op = "*";   // 2x, 2√3, 2(x+1)
                node = binary(op, node, power());
            }
            return node;
        }
        function unary() {
            if (peek() === "-") { pos++; return negate(unary()); }
            if (peek() === "+") { pos++; return unary(); }
            return power();
        }
        function power() {
            var base = primary();
            if (peek() === "^") {
                pos++;
                return binary("^", base, unary());
            }
            return base;
        }
        function primary() {
            var ch = peek();
            if (ch === "x") { pos++; return function(x) { return x; }; }
            if (ch === "√") { pos++; var inner = power(); return function(x) { return Math.sqrt(inner(x)); }; }
            if (ch === "(") {
                pos++;
                var node = expression();
                if (peek() !== ")") throw new Error("paren");
                pos++;
                return node;
            }
            var begin = pos, dots = 0;
            while (isDigit(peek()) || peek() === ".") {
                if (peek() === ".") dots++;
                pos++;
            }
            var number = parseFloat(s.substring(begin, pos));
            if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
            return function() { return number; };
        }
        function negate(node) { return function(x) { return -node(x); }; }
        function binary(op, a, b) {
            if (op === "+") return function(x) { return a(x) + b(x); };
            if (op === "-") return function(x) { return a(x) - b(x); };
            if (op === "*") return function(x) { return a(x) * b(x); };
            if (op === "/") return function(x) { return a(x) / b(x); };
            return function(x) { return Math.pow(a(x), b(x)); };
        }
        try {
            var fn = expression();
            if (pos !== s.length) return null;
            return fn;
        } catch (e) {
            return null;
        }
    }

    // 숫자·분수·√ 값 (점 좌표용)
    function evaluateNumber(text) {
        var fn = compileFunction(text);
        if (fn === null || String(text).indexOf("x") >= 0) return null;
        var value = fn(0);
        return isFinite(value) ? value : null;
    }

    // "A(2,3) B(-1,-2) (1/2,√2)" → [{name, x, y, xText, yText}]. 괄호 밖의 공백·쉼표·세미콜론은 구분자
    function parsePointList(text) {
        var s = String(text);
        var list = [], bad = [];
        var i = 0;
        while (i < s.length) {
            var ch = s.charAt(i);
            if (ch === " " || ch === "," || ch === ";" || ch === "\t") { i++; continue; }
            var open = s.indexOf("(", i);
            var close = open >= 0 ? s.indexOf(")", open) : -1;
            if (open < 0 || close < 0) {
                bad.push(s.substring(i).replace(/\s+$/, ""));
                break;
            }
            var name = s.substring(i, open).replace(/\s/g, "");
            var inside = s.substring(open + 1, close);
            var comma = inside.indexOf(",");
            var xText = comma >= 0 ? inside.substring(0, comma).replace(/\s/g, "") : "";
            var yText = comma >= 0 ? inside.substring(comma + 1).replace(/\s/g, "") : "";
            var x = comma >= 0 ? evaluateNumber(xText) : null;
            var y = comma >= 0 ? evaluateNumber(yText) : null;
            if (x === null || y === null) bad.push(s.substring(i, close + 1));
            else list.push({ name: name, x: x, y: y, xText: xText, yText: yText });
            i = close + 1;
        }
        return { list: list, bad: bad };
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
            "v1", xMin, xMax, yMin, yMax, unitMm, fontPt,
            showGrid ? "1" : "0", showNumbers ? "1" : "0", showFormulas ? "1" : "0",
            encodeURIComponent(functionTexts[0]), encodeURIComponent(functionTexts[1]), encodeURIComponent(functionTexts[2]),
            encodeURIComponent(pointsText), showCoords ? "1" : "0", showGuides ? "1" : "0",
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 19) return;
        try {
            xMin = Math.round(restoreNumber(p[1], xMin, -20, 0));
            xMax = Math.round(restoreNumber(p[2], xMax, 1, 20));
            yMin = Math.round(restoreNumber(p[3], yMin, -20, 0));
            yMax = Math.round(restoreNumber(p[4], yMax, 1, 20));
            unitMm = restoreNumber(p[5], unitMm, 2, 20);
            fontPt = restoreNumber(p[6], fontPt, 5, 14);
            showGrid = p[7] === "1";
            showNumbers = p[8] === "1";
            showFormulas = p[9] === "1";
            functionTexts = [decodeURIComponent(p[10]), decodeURIComponent(p[11]), decodeURIComponent(p[12])];
            pointsText = decodeURIComponent(p[13]);
            showCoords = p[14] === "1";
            showGuides = p[15] === "1";
            offsetXmm = restoreNumber(p[16], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            offsetYmm = restoreNumber(p[17], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            previewEnabled = p[18] === "1";
        } catch (restoreError) {}
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }
})();
