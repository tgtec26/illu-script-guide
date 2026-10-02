// Object_Solubility.jsx
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

// 용해도 곡선 그래프를 그린다.
// 사각형을 선택하고 실행하면 그 사각형의 왼쪽 위 모서리와 크기를 그래프 영역으로 쓰고(사각형은 확인 때 지운다),
// 선택이 없으면 대지 가운데에 기본 크기로 그린다.
// X축은 온도 0~100 ℃, Y축은 용해도 0~160 g/물 100 g (눈금 20 간격, 보조선은 20 또는 10 간격).
// 곡선 값은 CRC Handbook·Lange's Handbook 계열 값을 정리한 Wikipedia "Solubility table"의 측정점이다.
// 측정점이 없는 온도는 측정점 사이를 곡선으로 이은 것이고, 측정 범위 밖으로는 곡선을 늘이지 않는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "Solubility/settings";
    var MM_TO_PT = 2.834645669;
    var SIZE_MIN_MM = 30;
    var SIZE_MAX_MM = 250;
    var POSITION_LIMIT_MM = 300;
    var LABEL_WIDTH = 70;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var NAME_COLUMN_WIDTH = 120;
    var RADIO_COLUMN_WIDTH = 30;

    var AXIS_PT = 0.4;
    var TICK_PT = 0.4;
    var TICK_MM = 1;
    var GRID_PT = 0.3;
    var GRID_DASH = [2, 1];
    var CURVE_PT = 0.8;
    var FONT_PT = 8;
    var ENG_BASELINE_PT = 0.5;
    var SUB_SCALE = 0.7;
    var TEXT_GAP_MM = 1;
    var NAME_GAP_MM = 0.8;
    var X_MAX = 100;
    var Y_MAX = 160;
    var AXIS_STEP = 20;
    var GRID_FINE_STEP = 10;
    var AXIS_TITLE_GAP_MM = 1;
    var NAME_KOREAN = 0, NAME_FORMULA = 1, NAME_NONE = 2;
    var BEZIER_TOLERANCE_MM = 0.7;
    // ° 는 GSMediumB1의 U+02D8 글리프로 넣는다
    var X_TITLE = "온도(\u02D8C)";
    var Y_TITLE = "용해도(g/물 100 g)";

    // 선 1~5
    var LINE_STYLES = [
        { name: "실선", dashes: [] },
        { name: "1-1 파선", dashes: [1, 1] },
        { name: "2-1 파선", dashes: [2, 1] },
        { name: "3-1 파선", dashes: [3, 1] },
        { name: "4-1-1-1 1점 쇄선", dashes: [4, 1, 1, 1] }
    ];

    // 앞의 5개가 다이얼로그 맨 위에 온다.
    // points: [온도(℃), 용해도(g/물 100 g)] 측정점. labelT·side: 이름을 붙일 온도와 곡선의 위쪽(1)/아래쪽(-1)
    var SUBSTANCES = [
        { kor: "질산 나트륨", formula: "NaNO3", labelT: 20, side: 1,
          points: [[0, 73], [10, 80.8], [20, 87.6], [30, 94.9], [40, 102], [60, 122], [80, 148], [100, 180]] },
        { kor: "질산 칼륨", formula: "KNO3", labelT: 55, side: -1,
          points: [[0, 13.3], [10, 20.9], [20, 31.6], [30, 45.8], [40, 63.9], [50, 85.5], [60, 110], [70, 138], [80, 169], [90, 202], [100, 246]] },
        { kor: "염화 칼륨", formula: "KCl", labelT: 88, side: 1,
          points: [[0, 28], [10, 31.2], [20, 34.2], [30, 37.2], [40, 40.1], [50, 42.6], [60, 45.8], [80, 51.3], [90, 53.9], [100, 56.3]] },
        { kor: "염화 나트륨", formula: "NaCl", labelT: 92, side: -1,
          points: [[0, 35.65], [10, 35.72], [20, 35.89], [30, 36.09], [40, 36.37], [50, 36.69], [60, 37.04], [70, 37.46], [80, 37.93], [90, 38.47], [100, 38.99]] },
        { kor: "황산 구리(II)", formula: "CuSO4\u00B75H2O", labelT: 70, side: 1,
          points: [[0, 23.1], [10, 27.5], [20, 32], [30, 37.8], [40, 44.6], [60, 61.8], [80, 83.8], [100, 114]] },
        { kor: "염화 칼슘", formula: "CaCl2", labelT: 48, side: 1,
          points: [[0, 59.5], [10, 64.7], [20, 74.5], [30, 100], [40, 128], [60, 137], [80, 147], [90, 154], [100, 159]] },
        { kor: "질산 납(II)", formula: "Pb(NO3)2", labelT: 16, side: 1,
          points: [[0, 37.5], [10, 46.2], [20, 54.3], [30, 63.4], [40, 72.1], [60, 91.6], [80, 111], [100, 133]] },
        { kor: "다이크로뮴산 칼륨", formula: "K2Cr2O7", labelT: 80, side: -1,
          points: [[0, 4.7], [10, 7], [20, 12.3], [30, 18.1], [40, 26.3], [50, 34], [60, 45.6], [80, 73], [100, 102]] },
        { kor: "염소산 칼륨", formula: "KClO3", labelT: 68, side: -1,
          points: [[0, 3.3], [10, 5.2], [20, 7.3], [30, 10.1], [40, 13.9], [60, 23.8], [80, 37.5], [90, 46], [100, 56.3]] },
        { kor: "황산 세륨(III)", formula: "Ce2(SO4)3", labelT: 42, side: 1,
          points: [[0, 21.4], [20, 9.84], [30, 7.24], [40, 5.63], [60, 3.87]] }
    ];
    var SUBSTANCE_COUNT = SUBSTANCES.length;

    var doc = app.activeDocument;
    var grayK100 = makeGray(100);
    var grayK80 = makeGray(80);
    var korFont = findTextFont(["SpoqaHanSansNeo-Regular"]);
    var engFont = findTextFont(["GSMediumB1"]);

    for (var s = 0; s < SUBSTANCE_COUNT; s++) {
        SUBSTANCES[s].samples = sampleCurve(SUBSTANCES[s].points);
    }

    // 선택된 사각형이 있으면 그래프 영역으로 쓴다
    var rect = null;
    for (var q = 0; q < doc.selection.length; q++) {
        if (doc.selection[q].typename === "PathItem" && doc.selection[q].closed) {
            rect = doc.selection[q];
            break;
        }
    }
    var rectHidden = rect ? rect.hidden : false;

    // 다이얼로그가 다루는 옵션 값
    var widthMm = 80;
    var heightMm = 80;
    var gridOn = false;
    var gridFine = false;
    var simpleCurve = false;
    var tickOutside = false;
    var nameMode = NAME_KOREAN;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var curveOn = [];
    var curveStyle = [];
    for (var d = 0; d < SUBSTANCE_COUNT; d++) {
        curveOn.push(false);
        curveStyle.push(0);
    }
    curveOn[1] = true; curveStyle[1] = 0;
    curveOn[3] = true; curveStyle[3] = 1;
    curveOn[2] = true; curveStyle[2] = 2;

    applySettings();

    // 그래프 왼쪽 위 기준점(pt). 사각형이 있으면 사각형 모서리, 없으면 대지 가운데에서 기본 크기로
    var originLeft, originTop;
    if (rect !== null) {
        var rb = rect.geometricBounds;
        originLeft = rb[0];
        originTop = rb[1];
        widthMm = clamp(Math.round((rb[2] - rb[0]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM);
        heightMm = clamp(Math.round((rb[1] - rb[3]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM);
    } else {
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        originLeft = (ab[0] + ab[2]) / 2 - widthMm * MM_TO_PT / 2;
        originTop = (ab[1] + ab[3]) / 2 + heightMm * MM_TO_PT / 2;
    }

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "용해도 곡선");
    dlg.alignChildren = "fill";

    var sizePanel = addPanel(dlg, "크기");
    var widthControls = addValueRow(sizePanel, "너비", "mm", widthMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);
    var heightControls = addValueRow(sizePanel, "높이", "mm", heightMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);

    var gridPanel = addPanel(dlg, "보조선·눈금");
    var gridCheck = gridPanel.add("checkbox", undefined, "파선 보조선 (끄면 축에 눈금)");
    var gridStepGroup = gridPanel.add("group");
    gridStepGroup.add("statictext", undefined, "보조선 간격:");
    var gridCoarseRadio = gridStepGroup.add("radiobutton", undefined, "20 단위");
    var gridFineRadio = gridStepGroup.add("radiobutton", undefined, "10 단위");
    var tickGroup = gridPanel.add("group");
    tickGroup.add("statictext", undefined, "눈금 위치:");
    var tickInRadio = tickGroup.add("radiobutton", undefined, "안쪽");
    var tickOutRadio = tickGroup.add("radiobutton", undefined, "바깥쪽");

    var curvePanel = addPanel(dlg, "용해도 곡선");
    var simpleCheck = curvePanel.add("checkbox", undefined, "단순한 곡선 (베지어, 점 최소화)");
    simpleCheck.helpTip = "측정점을 지나는 곡선을 점이 적은 베지어 곡선으로 근사한다 (오차 " + BEZIER_TOLERANCE_MM + " mm 이내)";
    var headerRow = curvePanel.add("group");
    headerRow.alignChildren = ["left", "center"];
    headerRow.spacing = 0;
    headerRow.add("group").preferredSize.width = NAME_COLUMN_WIDTH;
    for (var h = 0; h < LINE_STYLES.length; h++) {
        var headerLabel = headerRow.add("statictext", undefined, "선 " + (h + 1));
        headerLabel.preferredSize.width = RADIO_COLUMN_WIDTH;
        headerLabel.helpTip = LINE_STYLES[h].name;
    }
    var curveChecks = [];
    var curveRadios = [];
    for (var i = 0; i < SUBSTANCE_COUNT; i++) {
        var row = curvePanel.add("group");
        row.alignChildren = ["left", "center"];
        row.spacing = 0;
        var check = row.add("checkbox", undefined, SUBSTANCES[i].formula);
        check.preferredSize.width = NAME_COLUMN_WIDTH;
        curveChecks.push(check);
        var radios = [];
        for (var r = 0; r < LINE_STYLES.length; r++) {
            var radio = row.add("radiobutton", undefined, "");
            radio.preferredSize.width = RADIO_COLUMN_WIDTH;
            radio.helpTip = "선 " + (r + 1) + ": " + LINE_STYLES[r].name;
            radios.push(radio);
        }
        curveRadios.push(radios);
    }

    var namePanel = addPanel(dlg, "물질 이름");
    var nameGroup = namePanel.add("group");
    var nameKorRadio = nameGroup.add("radiobutton", undefined, "한글 이름");
    var nameFormulaRadio = nameGroup.add("radiobutton", undefined, "화학식");
    var nameNoneRadio = nameGroup.add("radiobutton", undefined, "넣지 않음");

    var positionPanel = addPanel(dlg, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    // 저장된 값을 화면에 반영
    gridCheck.value = gridOn;
    simpleCheck.value = simpleCurve;
    gridCoarseRadio.value = !gridFine;
    gridFineRadio.value = gridFine;
    gridStepGroup.enabled = gridOn;
    tickInRadio.value = !tickOutside;
    tickOutRadio.value = tickOutside;
    tickGroup.enabled = !gridOn;
    nameKorRadio.value = (nameMode === NAME_KOREAN);
    nameFormulaRadio.value = (nameMode === NAME_FORMULA);
    nameNoneRadio.value = (nameMode === NAME_NONE);
    previewCheck.value = previewEnabled;
    setRowValue(widthControls, widthMm);
    setRowValue(heightControls, heightMm);
    setRowValue(offsetXControls, offsetXmm);
    setRowValue(offsetYControls, offsetYmm);
    for (var k = 0; k < SUBSTANCE_COUNT; k++) {
        curveChecks[k].value = curveOn[k];
        curveRadios[k][curveStyle[k]].value = true;
    }

    gridCheck.onClick = function() {
        gridOn = gridCheck.value;
        gridStepGroup.enabled = gridOn;
        tickGroup.enabled = !gridOn;
        updatePreview();
    };
    simpleCheck.onClick = function() {
        simpleCurve = simpleCheck.value;
        updatePreview();
    };
    gridCoarseRadio.onClick = gridFineRadio.onClick = function() {
        gridFine = gridFineRadio.value;
        updatePreview();
    };
    tickInRadio.onClick = tickOutRadio.onClick = function() {
        tickOutside = tickOutRadio.value;
        updatePreview();
    };
    nameKorRadio.onClick = function() { setNameMode(NAME_KOREAN); };
    nameFormulaRadio.onClick = function() { setNameMode(NAME_FORMULA); };
    nameNoneRadio.onClick = function() { setNameMode(NAME_NONE); };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    for (var b = 0; b < SUBSTANCE_COUNT; b++) {
        bindCurveRow(b);
    }

    // 크기는 다시 그리고, 위치는 미리보기 그룹만 옮긴다
    bindSizeRow(widthControls, function(v) { widthMm = v; });
    bindSizeRow(heightControls, function(v) { heightMm = v; });
    bindPositionRow(offsetXControls, function() { return offsetXmm; },
        function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; },
        function(v) { offsetYmm = v; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) {
            setOriginalHidden(true);
            buildPreview();
        }
        if (rect !== null) {
            try { rect.remove(); } catch (removeError) {}
        }
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        restoreOriginal();
        app.redraw();
    }

    function setNameMode(mode) {
        nameMode = mode;
        updatePreview();
    }

    function bindCurveRow(index) {
        curveChecks[index].onClick = function() {
            curveOn[index] = curveChecks[index].value;
            updatePreview();
        };
        for (var r = 0; r < LINE_STYLES.length; r++) {
            (function(styleIndex) {
                curveRadios[index][styleIndex].onClick = function() {
                    curveStyle[index] = styleIndex;
                    updatePreview();
                };
            })(r);
        }
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            setOriginalHidden(true);
            buildPreview();
        } else {
            restoreOriginal();
        }
        app.redraw();
    }

    function buildPreview() {
        previewGroup = buildGraph();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup !== null) moveItem(previewGroup, deltaX, deltaY);
    }

    function moveItem(item, deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function setOriginalHidden(hidden) {
        if (rect !== null) try { rect.hidden = hidden; } catch (e) {}
    }

    function restoreOriginal() {
        if (rect !== null) try { rect.hidden = rectHidden; } catch (e) {}
    }

    // -------------------------------------------------------
    // 그래프 그리기
    // -------------------------------------------------------
    function buildGraph() {
        var group = findEditableLayer().groupItems.add();
        group.name = "용해도 곡선";

        var width = widthMm * MM_TO_PT;
        var height = heightMm * MM_TO_PT;
        var left = originLeft;
        var bottom = originTop - height;
        var right = left + width;
        var top = originTop;
        function px(t) { return left + t / X_MAX * width; }
        function py(v) { return bottom + v / Y_MAX * height; }

        var tick = TICK_MM * MM_TO_PT;
        var textGap = TEXT_GAP_MM * MM_TO_PT;
        var tickDirection = tickOutside ? -1 : 1;
        var labelGap = textGap + (!gridOn && tickOutside ? tick : 0);

        // 보조선은 맨 아래에 깔린다 (축 끝 값의 선이 위·오른쪽 테두리를 겸한다)
        if (gridOn) {
            var gridStep = gridFine ? GRID_FINE_STEP : AXIS_STEP;
            for (var gx = gridStep; gx <= X_MAX; gx += gridStep) {
                addLine(group, px(gx), bottom, px(gx), top, GRID_PT, grayK80, GRID_DASH);
            }
            for (var gy = gridStep; gy <= Y_MAX; gy += gridStep) {
                addLine(group, left, py(gy), right, py(gy), GRID_PT, grayK80, GRID_DASH);
            }
        }

        // 곡선
        for (var i = 0; i < SUBSTANCE_COUNT; i++) {
            if (!curveOn[i]) continue;
            drawCurve(group, SUBSTANCES[i], LINE_STYLES[curveStyle[i]].dashes, px, py);
        }

        addLine(group, left, bottom, right, bottom, AXIS_PT, grayK100, null);
        addLine(group, left, bottom, left, top, AXIS_PT, grayK100, null);

        // 눈금과 눈금 숫자: X는 축 아래, Y는 축 왼쪽
        var labelsBottom = bottom - labelGap;
        var labelsLeft = left - labelGap;
        for (var vx = 0; vx <= X_MAX; vx += AXIS_STEP) {
            if (!gridOn) addLine(group, px(vx), bottom, px(vx), bottom + tick * tickDirection, TICK_PT, grayK100, null);
            var xLabel = addText(group, String(vx));
            var xb = xLabel.geometricBounds;
            xLabel.translate(px(vx) - (xb[0] + xb[2]) / 2, bottom - labelGap - xb[1]);
            labelsBottom = Math.min(labelsBottom, xLabel.geometricBounds[3]);
        }
        for (var vy = 0; vy <= Y_MAX; vy += AXIS_STEP) {
            if (!gridOn) addLine(group, left, py(vy), left + tick * tickDirection, py(vy), TICK_PT, grayK100, null);
            var yLabel = addText(group, String(vy));
            var yb = yLabel.geometricBounds;
            yLabel.translate(left - labelGap - yb[2], py(vy) - (yb[1] + yb[3]) / 2);
            labelsLeft = Math.min(labelsLeft, yLabel.geometricBounds[0]);
        }

        // 축 제목: X는 숫자 아래 가운데, Y는 숫자 왼쪽에 세로로
        var titleGap = AXIS_TITLE_GAP_MM * MM_TO_PT;
        var xTitle = addText(group, X_TITLE);
        var xtb = xTitle.geometricBounds;
        xTitle.translate((left + right) / 2 - (xtb[0] + xtb[2]) / 2, labelsBottom - titleGap - xtb[1]);
        var yTitle = addText(group, Y_TITLE);
        yTitle.rotate(90);
        var ytb = yTitle.geometricBounds;
        yTitle.translate(labelsLeft - titleGap - ytb[2], (bottom + top) / 2 - (ytb[1] + ytb[3]) / 2);
        return group;
    }

    // 값이 Y_MAX를 넘는 곡선은 위쪽 변에서 잘라 그린다
    function drawCurve(group, substance, dashes, px, py) {
        var points = [];
        var samples = substance.samples;
        for (var n = 0; n < samples.length; n++) {
            var t = samples[n][0], value = samples[n][1];
            if (value > Y_MAX) {
                var previous = samples[n - 1];
                var fraction = (Y_MAX - previous[1]) / (value - previous[1]);
                points.push([px(previous[0] + fraction), py(Y_MAX)]);
                break;
            }
            points.push([px(t), py(value)]);
        }
        var path = group.pathItems.add();
        if (simpleCurve) setBezierPath(path, fitBezier(points, BEZIER_TOLERANCE_MM * MM_TO_PT));
        else path.setEntirePath(points);
        styleStroke(path, CURVE_PT, grayK100, dashes);

        // 이름: 곡선에 나란히 기울여 위(1) 또는 아래(-1)에 붙인다
        if (nameMode === NAME_NONE) return;
        var i = Math.max(1, Math.min(substance.labelT, points.length - 2));
        var tangentX = points[i + 1][0] - points[i - 1][0];
        var tangentY = points[i + 1][1] - points[i - 1][1];
        var length = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
        var label = addText(group, nameMode === NAME_KOREAN ? substance.kor : substance.formula);
        var lb = label.geometricBounds;
        var distance = NAME_GAP_MM * MM_TO_PT + (lb[1] - lb[3]) / 2;
        var centerX = points[i][0] - tangentY / length * substance.side * distance;
        var centerY = points[i][1] + tangentX / length * substance.side * distance;
        label.translate(centerX - (lb[0] + lb[2]) / 2, centerY - (lb[1] + lb[3]) / 2);
        label.rotate(Math.atan2(tangentY, tangentX) * 180 / Math.PI);
    }

    function addLine(group, x1, y1, x2, y2, width, color, dashes) {
        var path = group.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        styleStroke(path, width, color, dashes);
        return path;
    }

    // 점 목록에 가장 가까운 베지어 곡선 마디들로 바꾼다 (Schneider 알고리즘, Graphics Gems "FitCurves").
    // 허용 오차(pt) 안에서 마디(앵커)가 가장 적게 나오도록 오차가 큰 곳에서 나눈다
    function setBezierPath(path, segments) {
        var anchors = [segments[0][0]];
        for (var i = 0; i < segments.length; i++) anchors.push(segments[i][3]);
        path.setEntirePath(anchors);
        for (var j = 0; j < segments.length; j++) {
            path.pathPoints[j].rightDirection = segments[j][1];
            path.pathPoints[j + 1].leftDirection = segments[j][2];
        }
    }

    function fitBezier(points, tolerance) {
        var n = points.length;
        var segments = [];
        fitCubic(points, 0, n - 1, vUnit(vSub(points[1], points[0])), vUnit(vSub(points[n - 2], points[n - 1])),
            tolerance * tolerance, segments);
        return segments;
    }

    function fitCubic(pts, first, last, tan1, tan2, errorSq, out) {
        if (last - first === 1) {
            var gap = vLen(vSub(pts[last], pts[first])) / 3;
            out.push([pts[first], vAdd(pts[first], vMul(tan1, gap)), vAdd(pts[last], vMul(tan2, gap)), pts[last]]);
            return;
        }
        var u = chordParameters(pts, first, last);
        var bezier = generateBezier(pts, first, last, u, tan1, tan2);
        var result = maxFitError(pts, first, last, bezier, u);
        if (result.error < errorSq) {
            out.push(bezier);
            return;
        }
        if (result.error < errorSq * 4) {
            for (var pass = 0; pass < 4; pass++) {
                u = reparameterize(pts, first, last, u, bezier);
                bezier = generateBezier(pts, first, last, u, tan1, tan2);
                result = maxFitError(pts, first, last, bezier, u);
                if (result.error < errorSq) {
                    out.push(bezier);
                    return;
                }
            }
        }
        var center = vUnit(vSub(pts[result.split - 1], pts[result.split + 1]));
        fitCubic(pts, first, result.split, tan1, center, errorSq, out);
        fitCubic(pts, result.split, last, vMul(center, -1), tan2, errorSq, out);
    }

    function generateBezier(pts, first, last, u, tan1, tan2) {
        var p0 = pts[first], p3 = pts[last];
        var c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
        for (var i = 0; i <= last - first; i++) {
            var t = u[i], m = 1 - t;
            var b1 = m * m * m, b2 = 3 * t * m * m, b3 = 3 * t * t * m, b4 = t * t * t;
            var a1 = vMul(tan1, b2), a2 = vMul(tan2, b3);
            c00 += vDot(a1, a1);
            c01 += vDot(a1, a2);
            c11 += vDot(a2, a2);
            var rest = vSub(pts[first + i], vAdd(vMul(p0, b1 + b2), vMul(p3, b3 + b4)));
            x0 += vDot(a1, rest);
            x1 += vDot(a2, rest);
        }
        var det = c00 * c11 - c01 * c01;
        var alpha1 = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det;
        var alpha2 = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
        var segment = vLen(vSub(p3, p0));
        if (alpha1 < 1e-6 * segment || alpha2 < 1e-6 * segment) alpha1 = alpha2 = segment / 3;
        return [p0, vAdd(p0, vMul(tan1, alpha1)), vAdd(p3, vMul(tan2, alpha2)), p3];
    }

    function bezierAt(b, t) {
        var m = 1 - t;
        return vAdd(vAdd(vMul(b[0], m * m * m), vMul(b[1], 3 * t * m * m)),
            vAdd(vMul(b[2], 3 * t * t * m), vMul(b[3], t * t * t)));
    }

    function maxFitError(pts, first, last, bezier, u) {
        var worst = 0;
        var split = Math.floor((last - first + 1) / 2) + first;
        for (var i = first + 1; i < last; i++) {
            var d = vSub(bezierAt(bezier, u[i - first]), pts[i]);
            var distSq = vDot(d, d);
            if (distSq >= worst) {
                worst = distSq;
                split = i;
            }
        }
        return { error: worst, split: split };
    }

    function chordParameters(pts, first, last) {
        var u = [0];
        for (var i = first + 1; i <= last; i++) u.push(u[i - first - 1] + vLen(vSub(pts[i], pts[i - 1])));
        for (var j = 1; j <= last - first; j++) u[j] = u[j] / u[last - first];
        return u;
    }

    // 뉴턴-랩슨으로 점마다 곡선 위 가장 가까운 매개변수를 다시 찾는다
    function reparameterize(pts, first, last, u, bezier) {
        var next = [];
        var d1 = [], d2 = [];
        for (var k = 0; k < 3; k++) d1.push(vMul(vSub(bezier[k + 1], bezier[k]), 3));
        for (var l = 0; l < 2; l++) d2.push(vMul(vSub(d1[l + 1], d1[l]), 2));
        for (var i = 0; i <= last - first; i++) {
            var t = u[i], m = 1 - t;
            var diff = vSub(bezierAt(bezier, t), pts[first + i]);
            var slope = vAdd(vAdd(vMul(d1[0], m * m), vMul(d1[1], 2 * m * t)), vMul(d1[2], t * t));
            var curve = vAdd(vMul(d2[0], m), vMul(d2[1], t));
            var denominator = vDot(slope, slope) + vDot(diff, curve);
            next.push(denominator === 0 ? t : t - vDot(diff, slope) / denominator);
        }
        return next;
    }

    function vAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function vSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function vMul(a, k) { return [a[0] * k, a[1] * k]; }
    function vDot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    function vLen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
    function vUnit(a) { var l = vLen(a); return [a[0] / l, a[1] / l]; }

    function styleStroke(path, width, color, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = width;
        path.strokeColor = color;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        path.strokeDashes = dashes ? dashes : [];
    }

    // 측정점 [[온도, 값], ...]을 1 ℃ 간격으로 늘린다 (단조 3차 보간: 측정점 사이에서 값이 튀지 않는다).
    // 측정 범위(첫·끝 온도) 밖으로는 늘리지 않는다
    function sampleCurve(points) {
        var n = points.length;
        var widths = [];
        var slopes = [];
        var tangents = [];
        for (var k = 0; k < n - 1; k++) {
            widths.push(points[k + 1][0] - points[k][0]);
            slopes.push((points[k + 1][1] - points[k][1]) / widths[k]);
        }
        tangents.push(slopes[0]);
        for (var m = 1; m < n - 1; m++) {
            var a = slopes[m - 1], b = slopes[m];
            if (a * b <= 0) {
                tangents.push(0);
            } else {
                var w1 = 2 * widths[m] + widths[m - 1];
                var w2 = widths[m] + 2 * widths[m - 1];
                tangents.push((w1 + w2) / (w1 / a + w2 / b));
            }
        }
        tangents.push(slopes[n - 2]);

        var samples = [];
        var seg = 0;
        for (var t = points[0][0]; t <= points[n - 1][0]; t++) {
            while (seg < n - 2 && t > points[seg + 1][0]) seg++;
            var h = widths[seg];
            var u = (t - points[seg][0]) / h;
            var u2 = u * u, u3 = u2 * u;
            samples.push([t, (2 * u3 - 3 * u2 + 1) * points[seg][1] + (u3 - 2 * u2 + u) * h * tangents[seg]
                + (-2 * u3 + 3 * u2) * points[seg + 1][1] + (u3 - u2) * h * tangents[seg + 1]]);
        }
        return samples;
    }

    // -------------------------------------------------------
    // 글자 (서체 규칙: 한글·공백 Spoqa, 영문·숫자·기호 GSMediumB1 +0.5pt, 화학식 숫자는 아래첨자)
    // -------------------------------------------------------
    function addText(group, text) {
        var frame = group.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = FONT_PT;
        frame.textRange.characterAttributes.fillColor = grayK100;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else if (isSubscript(text, i)) {
                attributes.textFont = engFont;
                attributes.size = FONT_PT * SUB_SCALE;
                attributes.baselineShift = ENG_BASELINE_PT - FONT_PT * 0.25;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
        return frame;
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    // 영문자나 ")" 바로 뒤의 숫자 (NaNO3, Pb(NO3)2)
    function isSubscript(text, i) {
        if (i === 0 || !/[0-9]/.test(text.charAt(i))) return false;
        return /[A-Za-z)]/.test(text.charAt(i - 1));
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
        return {
            input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindSizeRow(controls, setter) {
        var current = parseNumber(controls.input.text);
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === current) return;
            current = value;
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? current : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
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
    // 설정 저장 · 복원 (사각형을 선택했으면 크기는 사각형을 따른다)
    // -------------------------------------------------------
    function saveSettings() {
        var checks = [];
        var styles = [];
        for (var i = 0; i < SUBSTANCE_COUNT; i++) {
            checks.push(curveOn[i] ? "1" : "0");
            styles.push(curveStyle[i]);
        }
        var parts = [
            "v4",
            widthMm,
            heightMm,
            gridOn ? "1" : "0",
            gridFine ? "1" : "0",
            simpleCurve ? "1" : "0",
            tickOutside ? "1" : "0",
            nameMode,
            offsetXmm,
            offsetYmm,
            previewEnabled ? "1" : "0",
            checks.join(""),
            styles.join("")
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v4" || p.length !== 13) return;
        if (p[11].length !== SUBSTANCE_COUNT || p[12].length !== SUBSTANCE_COUNT) return;
        widthMm = restoreNumber(p[1], widthMm, SIZE_MIN_MM, SIZE_MAX_MM);
        heightMm = restoreNumber(p[2], heightMm, SIZE_MIN_MM, SIZE_MAX_MM);
        gridOn = (p[3] === "1");
        gridFine = (p[4] === "1");
        simpleCurve = (p[5] === "1");
        tickOutside = (p[6] === "1");
        nameMode = (p[7] === "1") ? NAME_FORMULA : (p[7] === "2") ? NAME_NONE : NAME_KOREAN;
        offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        previewEnabled = (p[10] === "1");
        for (var i = 0; i < SUBSTANCE_COUNT; i++) {
            curveOn[i] = (p[11].charAt(i) === "1");
            var style = parseInt(p[12].charAt(i), 10);
            curveStyle[i] = (style >= 0 && style < LINE_STYLES.length) ? style : 0;
        }
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, minimum, maximum);
    }
})();
