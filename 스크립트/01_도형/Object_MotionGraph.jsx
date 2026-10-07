// Object_MotionGraph.jsx
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

// 시간에 따른 이동거리·속력 그래프: 축(원점 O, 시간)과 그래프 하나를 그린다.
//   - 모양 5가지: 일정, 일정하게 증가(원점에서 직선), 일정하게 감소(y축에서 시작해 x축에서 끝나는 직선),
//     점점 빠르게 증가(원점에서 아래로 볼록한 곡선, 끝이 거의 수직), 점점 느리게 증가(위로 볼록한 곡선, 시작이 거의 수직).
//     곡선은 앵커 둘짜리 베지어 하나이고, 위로 볼록은 아래로 볼록을 y = x 기준으로 맞바꾼 모양이다.
//   - y축 이름은 이동거리 또는 속력. 한 글자씩 세로로 쌓아 y축 위쪽 왼쪽에 둔다. x축 이름은 시간(오른쪽 끝 아래), 원점에 O.
//   - 일정은 x축에서 y값(mm)만큼 위에 가로선을 긋는다. 나머지 모양의 높이는 정해져 있다.
//   - 사각형을 하나 선택하고 실행하면 그 사각형의 가운데와 크기를 축의 크기(너비·높이)로 쓰고(사각형은 확인할 때 지운다),
//     선택이 없으면 대지 가운데에 기본 크기로 그린다. 크기는 다이얼로그에서도 고칠 수 있다.
//   - 축 0.4pt 검정(K 100), 그래프 0.8pt 회색(K 60), 글자 8pt 검정. 축 끝에는 평가원식 화살촉을 붙인다.
//   - 글자 서체는 한글·공백 Spoqa, 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
//   - 확인하면 원본 사각형은 지워지고 축·그래프·글자가 든 그룹 하나가 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectMotionGraph/settings";
    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var FONT_PT = 8;
    var AXIS_PT = 0.4;
    var GRAPH_PT = 0.8;
    var AXIS_K = 100;
    var GRAPH_K = 60;
    // 축 끝 화살촉(pt): 길이, 반너비, 뒤쪽 오목 (07_수학의 평가원식 화살촉과 같은 치수)
    var ARROW = {length: 4, halfWidth: 1.3, notch: 1};
    // 화살촉 모양: 제비꼬리가 위의 평가원식(기본)이다
    var HEAD_TRIANGLE = 0;
    var HEAD_CHEVRON = 1;
    var HEAD_SWALLOW = 2;
    var HEAD_HARPOON = 3;
    var HEAD_SHAPES = ["삼각형", "꺾쇠 (열린 V)", "제비꼬리 (평가원식)", "작살형 (화살표 3)"];
    // 그래프가 차지하는 비율: 가로(축 길이 기준), 곡선·증가선 끝 높이, 감소선 시작 높이
    var GRAPH_X_RATIO = 0.9;
    var Y_TOP_RATIO = 0.88;
    var Y_START_DOWN_RATIO = 0.76;
    // 곡선(점점 빠르게 증가): 시작 손잡이 길이(가로 비율)와 끝 손잡이 높이(Y_TOP 비율). 위로 볼록은 두 값을 가로·세로에 맞바꿔 쓴다
    var CURVE_START_HANDLE = 0.55;
    var CURVE_END_HANDLE = 0.4;
    // y값(일정)은 축 높이의 이 비율까지만
    var Y_CONST_MAX_RATIO = 0.95;
    var TEXT_GAP_MM = 1;
    var PATTERNS = ["일정", "일정하게 증가", "일정하게 감소", "점점 빠르게 증가 (아래로 볼록)",
        "점점 느리게 증가 (위로 볼록)"];
    var Y_NAMES = ["이동거리", "속력"];
    var X_NAME = "시간";

    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var POSITION_LIMIT_MM = 100;
    var WIDTH_RANGE = [15, 200];
    // 세로로 쌓은 이동거리(4줄)가 y축 안에 들어오는 높이부터
    var HEIGHT_RANGE = [20, 200];
    var Y_VALUE_RANGE = [1, 200];

    // 숫자 옵션: 키, 범위, 한 단계, 소수 자리. 저장 순서도 이 순서다
    var NUMBER_KEYS = ["yValue", "width", "height", "offsetX", "offsetY", "headSize"];
    var SPECS = {
        yValue: {range: Y_VALUE_RANGE, step: 0.5, decimals: 1},
        width: {range: WIDTH_RANGE, step: 0.5, decimals: 1},
        height: {range: HEIGHT_RANGE, step: 0.5, decimals: 1},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        headSize: {range: [30, 300], step: 5, decimals: 0}
    };

    var doc = app.activeDocument;
    var korFont = findTextFont([KOR_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME]);

    // 선택한 사각형이 있으면 그 가운데·크기를 쓴다
    var rect = getSelectedRectangle(doc.selection);
    var rectWasHidden = rect ? rect.hidden : false;
    var centerX;
    var centerY;
    if (rect) {
        var bounds = rect.geometricBounds; // [left, top, right, bottom]
        centerX = (bounds[0] + bounds[2]) / 2;
        centerY = (bounds[1] + bounds[3]) / 2;
    } else {
        var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        centerX = (artboardRect[0] + artboardRect[2]) / 2;
        centerY = (artboardRect[1] + artboardRect[3]) / 2;
    }

    // 옵션
    var options = {
        pattern: 0, yKind: 1,
        yValue: 18, width: 32, height: 29,
        offsetX: 0, offsetY: 0, headSize: 100, headShape: HEAD_SWALLOW,
        previewOn: true
    };
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var d = 0; d < NUMBER_KEYS.length; d++) DEFAULTS[NUMBER_KEYS[d]] = options[NUMBER_KEYS[d]];
    applySettings();
    if (rect) {
        options.width = clamp(Math.round((bounds[2] - bounds[0]) / MM * 2) / 2, WIDTH_RANGE[0], WIDTH_RANGE[1]);
        options.height = clamp(Math.round((bounds[1] - bounds[3]) / MM * 2) / 2, HEIGHT_RANGE[0], HEIGHT_RANGE[1]);
        // 선택한 사각형이 있으면 그 크기가 처음 값이다
        DEFAULTS.width = options.width;
        DEFAULTS.height = options.height;
    }

    var previewGroup = null;
    var rows = {};

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "시간 그래프 (이동거리·속력)");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var graphPanel = addPanel(dlg, "그래프");
    var patternGroup = graphPanel.add("group");
    patternGroup.orientation = "column";
    patternGroup.alignChildren = ["left", "center"];
    patternGroup.spacing = 4;
    var patternRadios = [];
    for (var p = 0; p < PATTERNS.length; p++) {
        patternRadios.push(patternGroup.add("radiobutton", undefined, PATTERNS[p]));
        bindPatternRadio(patternRadios[p], p);
    }
    var yKindRow = graphPanel.add("group");
    yKindRow.alignChildren = ["left", "center"];
    yKindRow.add("statictext", undefined, "y축 이름:").preferredSize.width = LABEL_WIDTH;
    var yKindRadios = [];
    for (var k = 0; k < Y_NAMES.length; k++) {
        yKindRadios.push(yKindRow.add("radiobutton", undefined, Y_NAMES[k]));
        bindYKindRadio(yKindRadios[k], k);
    }
    addRow(graphPanel, "yValue", "y값", "mm");
    rows.yValue.input.helpTip = "일정일 때 x축에서 가로선까지의 높이. 축 높이의 95 %까지";

    var sizePanel = addPanel(dlg, "크기 (축 길이)");
    addRow(sizePanel, "width", "너비", "mm");
    addRow(sizePanel, "height", "높이", "mm");

    var headPanel = addPanel(dlg, "화살촉");
    var headShapeRow = headPanel.add("group");
    headShapeRow.alignChildren = ["left", "center"];
    headShapeRow.add("statictext", undefined, "모양:").preferredSize.width = LABEL_WIDTH;
    var headShapeList = headShapeRow.add("dropdownlist", undefined, HEAD_SHAPES);
    headShapeList.selection = options.headShape;
    headShapeList.helpTip = "제비꼬리는 평가원식. 삼각형·제비꼬리·작살형은 채운 모양, 꺾쇠는 축 굵기의 열린 선";
    addRow(headPanel, "headSize", "크기", "%");

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
    previewCheck.value = options.previewOn;
    syncRadios();
    headShapeList.onChange = function() {
        if (!headShapeList.selection) return;
        options.headShape = headShapeList.selection.index;
        updatePreview();
    };

    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) {
            if (rect) rect.hidden = true;
            buildPreview();
        }
        if (rect) { try { rect.remove(); } catch (removeError) {} }
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    if (rect) rect.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        if (rect) {
            rect.hidden = rectWasHidden;
            rect.selected = true;
        }
    }
    app.redraw();

    // 라디오 버튼 상태와 y값 입력(일정에서만)을 옵션에 맞춘다
    function syncRadios() {
        for (var i = 0; i < patternRadios.length; i++) patternRadios[i].value = (options.pattern === i);
        for (var j = 0; j < yKindRadios.length; j++) yKindRadios[j].value = (options.yKind === j);
        rows.yValue.input.enabled = options.pattern === 0;
        rows.yValue.slider.enabled = options.pattern === 0;
        rows.yValue.reset.enabled = options.pattern === 0;
    }

    function bindPatternRadio(radio, index) {
        radio.onClick = function() {
            options.pattern = index;
            syncRadios();
            updatePreview();
        };
    }

    function bindYKindRadio(radio, index) {
        radio.onClick = function() {
            options.yKind = index;
            updatePreview();
        };
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (options.previewOn) {
            if (rect) rect.hidden = true;
            buildPreview();
        } else if (rect) {
            rect.hidden = rectWasHidden;
        }
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

    function buildPreview() {
        // 지금 크기에서 그릴 수 없는 값은 줄여서 입력창에도 되돌려 준다
        var o = clampOptions(options);
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var numberKey = NUMBER_KEYS[i];
            if (o.hasOwnProperty(numberKey) && o[numberKey] !== options[numberKey]) {
                options[numberKey] = o[numberKey];
                showRowValue(rows[numberKey], o[numberKey]);
            }
        }

        var g = graphGeometry({
            left: centerX - o.width * MM / 2, bottom: centerY - o.height * MM / 2,
            width: o.width * MM, height: o.height * MM, pattern: options.pattern, yValue: o.yValue * MM
        });

        var host = rect ? rect.parent : findEditableLayer();
        previewGroup = host.groupItems.add();
        previewGroup.name = "MotionGraph";
        if (rect) previewGroup.move(rect, ElementPlacement.PLACEBEFORE);
        var group = previewGroup;

        var axisColor = makeGray(AXIS_K);
        var graph = drawPath(group, g.graph, false);
        graph.name = "Graph";
        styleStroke(graph, makeGray(GRAPH_K), GRAPH_PT);
        for (var a = 0; a < g.axes.length; a++) {
            var axis = g.axes[a];
            var headScale = options.headSize / 100;
            var inset = shaftInset(options.headShape, headScale);
            var lineEnd = [axis.tip[0] - axis.dir[0] * inset, axis.tip[1] - axis.dir[1] * inset];
            var line = drawPath(group, [corner(axis.from[0], axis.from[1]), corner(lineEnd[0], lineEnd[1])], false);
            line.name = a === 0 ? "AxisX" : "AxisY";
            styleStroke(line, axisColor, AXIS_PT);
            var headShape = arrowHeadShape(axis.tip, axis.dir, headScale, options.headShape);
            var head = drawPath(group, headShape.points, headShape.closed);
            head.name = a === 0 ? "AxisXHead" : "AxisYHead";
            if (headShape.closed) {
                head.stroked = false;
                head.filled = true;
                head.fillColor = axisColor;
            } else {
                styleStroke(head, axisColor, AXIS_PT);
                head.strokeJoin = StrokeJoin.MITERENDJOIN;
            }
        }

        var gap = TEXT_GAP_MM * MM;
        var origin = makeText(group, "O");
        origin.name = "LabelO";
        placeText(origin, g.axes[1].from[0], g.axes[1].from[1] - gap, "r", "t");
        var xLabel = makeText(group, X_NAME);
        xLabel.name = "LabelX";
        placeText(xLabel, g.axes[0].tip[0], g.axes[0].tip[1] - gap, "r", "t");
        // 한 글자씩 세로로 쌓아 y축 끝 높이에서 시작한다
        var yLabel = makeText(group, Y_NAMES[options.yKind].split("").join("\r"));
        yLabel.name = "LabelY";
        placeText(yLabel, g.axes[1].tip[0] - gap, g.axes[1].tip[1], "r", "t");

        if (o.offsetX !== 0 || o.offsetY !== 0) group.translate(o.offsetX * MM, o.offsetY * MM);
    }

    // -------------------------------------------------------
    // 기하 (mm 옵션 → 그릴 수 있는 범위로 줄이기)
    // -------------------------------------------------------
    // y값은 축 높이의 95 %까지
    function clampOptions(o) {
        var width = clamp(o.width, WIDTH_RANGE[0], WIDTH_RANGE[1]);
        var height = clamp(o.height, HEIGHT_RANGE[0], HEIGHT_RANGE[1]);
        return {
            width: width, height: height,
            yValue: clamp(o.yValue, Y_VALUE_RANGE[0], Math.min(Y_VALUE_RANGE[1], height * Y_CONST_MAX_RATIO)),
            offsetX: o.offsetX, offsetY: o.offsetY
        };
    }

    // 축(x축·y축: 시작, 선 끝, 화살촉 끝, 방향)과 그래프의 점 목록(pt). 축은 (left, bottom)에서 오른쪽·위쪽으로 width·height만큼.
    // 축 선은 화살촉의 오목한 점에서 끝나 끝이 뾰족하게 보인다. 그래프는 x 방향으로 축 길이의 GRAPH_X_RATIO까지
    function graphGeometry(g) {
        var notchBack = ARROW.length - ARROW.notch;
        var xTip = [g.left + g.width, g.bottom];
        var yTip = [g.left, g.bottom + g.height];
        var spanX = g.width * GRAPH_X_RATIO;
        var yTop = g.height * Y_TOP_RATIO;
        var points;
        if (g.pattern === 0) {
            points = [corner(g.left, g.bottom + g.yValue), corner(g.left + spanX, g.bottom + g.yValue)];
        } else if (g.pattern === 1) {
            points = [corner(g.left, g.bottom), corner(g.left + spanX, g.bottom + yTop)];
        } else if (g.pattern === 2) {
            points = [corner(g.left, g.bottom + g.height * Y_START_DOWN_RATIO), corner(g.left + spanX, g.bottom)];
        } else if (g.pattern === 3) {
            points = [
                {anchor: [g.left, g.bottom], left: [g.left, g.bottom],
                    right: [g.left + spanX * CURVE_START_HANDLE, g.bottom]},
                {anchor: [g.left + spanX, g.bottom + yTop], left: [g.left + spanX, g.bottom + yTop * CURVE_END_HANDLE],
                    right: [g.left + spanX, g.bottom + yTop]}
            ];
        } else {
            points = [
                {anchor: [g.left, g.bottom], left: [g.left, g.bottom],
                    right: [g.left, g.bottom + yTop * CURVE_START_HANDLE]},
                {anchor: [g.left + spanX, g.bottom + yTop], left: [g.left + spanX * CURVE_END_HANDLE, g.bottom + yTop],
                    right: [g.left + spanX, g.bottom + yTop]}
            ];
        }
        return {
            axes: [
                {from: [g.left, g.bottom], to: [xTip[0] - notchBack, xTip[1]], tip: xTip, dir: [1, 0]},
                {from: [g.left, g.bottom], to: [yTip[0], yTip[1] - notchBack], tip: yTip, dir: [0, 1]}
            ],
            graph: points
        };
    }

    // 축 끝 화살촉: 끝점, 뒤쪽 두 날개, 오목한 점. scale은 크기 배율(1 = 100%)
    function arrowHeadPoints(tip, d, scale) {
        var k = scale === undefined ? 1 : scale;
        var n = [-d[1], d[0]];
        var back = [tip[0] - d[0] * ARROW.length * k, tip[1] - d[1] * ARROW.length * k];
        return [
            corner(tip[0], tip[1]),
            corner(back[0] + n[0] * ARROW.halfWidth * k, back[1] + n[1] * ARROW.halfWidth * k),
            corner(back[0] + d[0] * ARROW.notch * k, back[1] + d[1] * ARROW.notch * k),
            corner(back[0] - n[0] * ARROW.halfWidth * k, back[1] - n[1] * ARROW.halfWidth * k)
        ];
    }

    // 화살촉 모양: 위 네 점에서 만든다(작살형은 일러 화살표 3에서 따로). 삼각형·제비꼬리·작살형은 채운 닫힌 패스, 꺾쇠는 열린 선
    function arrowHeadShape(tip, d, scale, shape) {
        var p = arrowHeadPoints(tip, d, scale);
        if (shape === HEAD_CHEVRON) return {points: [p[1], p[0], p[3]], closed: false};
        if (shape === HEAD_TRIANGLE) return {points: [p[0], p[1], p[3]], closed: true};
        if (shape === HEAD_HARPOON) {
            // 일러 화살표 3: 머리 길이 L에 날개 반폭 0.306 L, 중간(끝에서 0.504 L) 반폭 0.116 L, 홈은 끝에서 0.818 L
            var len = ARROW.length * (scale === undefined ? 1 : scale);
            var n = [-d[1], d[0]];
            var at = function(f, w) { return corner(tip[0] - d[0] * len * f + n[0] * len * w, tip[1] - d[1] * len * f + n[1] * len * w); };
            return {points: [at(0, 0), at(0.504, 0.116), at(1, 0.306), at(0.818, 0), at(1, -0.306), at(0.504, -0.116)], closed: true};
        }
        return {points: p, closed: true};
    }

    // 축 선이 화살촉 쪽에서 끝나는 거리(pt): 제비꼬리는 오목한 점, 삼각형은 밑변 조금 앞, 꺾쇠는 끝점
    function shaftInset(shape, scale) {
        if (shape === HEAD_CHEVRON) return 0;
        if (shape === HEAD_TRIANGLE) return ARROW.length * scale * 0.9;
        if (shape === HEAD_HARPOON) return ARROW.length * scale * 0.75;
        return (ARROW.length - ARROW.notch) * scale;
    }

    function corner(x, y) {
        return {anchor: [x, y], left: [x, y], right: [x, y]};
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawPath(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            var smooth = (points[j].left[0] !== points[j].anchor[0] || points[j].left[1] !== points[j].anchor[1]) &&
                (points[j].right[0] !== points[j].anchor[0] || points[j].right[1] !== points[j].anchor[1]);
            point.pointType = smooth ? PointType.SMOOTH : PointType.CORNER;
        }
        path.closed = closed;
        return path;
    }

    function styleStroke(path, color, width) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
    }

    // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt).
    // 크기를 정한 뒤에 부른다. 줄바꿈(\r)은 건드리지 않는다
    function makeText(container, text) {
        var frame = container.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = FONT_PT;
        frame.textRange.characterAttributes.fillColor = makeGray(AXIS_K);
        applyTextFonts(frame);
        return frame;
    }

    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code === 13) continue;
            var attributes = frame.textRange.characters[i].characterAttributes;
            if (isKoreanOrSpace(code)) {
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
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v;
        rgb.green = v;
        rgb.blue = v;
        return rgb;
    }

    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            if (point.leftDirection[0] !== point.anchor[0] ||
                    point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] ||
                    point.rightDirection[1] !== point.anchor[1]) return null;
            pushDistinct(xs, point.anchor[0]);
            pushDistinct(ys, point.anchor[1]);
        }
        if (xs.length !== 2 || ys.length !== 2) return null;
        return item;
    }

    function pushDistinct(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (Math.abs(list[i] - value) < 0.01) return;
        }
        list.push(value);
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

    // 라벨 (단위): | 입력창 | 스크롤바
    function addRow(parent, key, label, unit) {
        var spec = SPECS[key];
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (" + unit + "):").preferredSize.width = LABEL_WIDTH;
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
        rows[key] = {input: input, slider: slider, reset: reset, min: spec.range[0], max: spec.range[1], step: spec.step, decimals: spec.decimals};
        return rows[key];
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
    // 설정 저장 · 복원 ("v2" + 모양 + y축 이름 + 화살촉 모양 + 숫자 + 미리보기 순서. 확인할 때만 저장)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v2", options.pattern, options.yKind, options.headShape];
        for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        parts.push(options.previewOn ? "1" : "0");
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 5 + NUMBER_KEYS.length) return;
        var pattern = parseInt(p[1], 10);
        var yKind = parseInt(p[2], 10);
        if (pattern >= 0 && pattern < PATTERNS.length) options.pattern = pattern;
        if (yKind >= 0 && yKind < Y_NAMES.length) options.yKind = yKind;
        var headShape = parseInt(p[3], 10);
        if (headShape >= 0 && headShape < HEAD_SHAPES.length) options.headShape = headShape;
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[4 + i]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
        options.previewOn = (p[4 + NUMBER_KEYS.length] === "1");
    }
})();
