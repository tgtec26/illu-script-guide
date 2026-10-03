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
// 점 A~E: 체크한 점을 (온도, 용해도) 자리에 점과 글자로 찍는다. "포화"를 켜면 고른 물질의 그 온도 용해도를 입력창에 넣고
// 그려진 곡선 위에 찍으며(글자는 곡선 위쪽 바깥), 끄면 입력한 용해도 자리에 찍는다(글자는 오른쪽).
// 물질의 측정 범위 밖이거나 용해도가 그래프 위쪽(Y_MAX)을 넘으면 입력창에 "범위 밖"을 보이고 점은 찍지 않는다.

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
    var RESET_BUTTON_WIDTH = 34;
    var NAME_COLUMN_WIDTH = 120;
    var RADIO_COLUMN_WIDTH = 30;
    var POINT_CHECK_WIDTH = 44;
    var POINT_TEMP_WIDTH = 50;
    var POINT_SUB_WIDTH = 96;
    var POINT_SAT_WIDTH = 52;
    var POINT_VALUE_WIDTH = 56;
    var POINT_NAMES = ["A", "B", "C", "D", "E"];
    var POINT_COUNT = POINT_NAMES.length;
    var POINT_SIZE_MIN_MM = 0.5;
    var POINT_SIZE_MAX_MM = 5;
    var POINT_LABEL_GAP_MM = 0.3;   // 점 가장자리와 글자 윤곽 사이
    var OUT_OF_RANGE = "범위 밖";

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
    var pointSizeMm = 1.5;
    var glyphOffsetCache = {};
    var pointOn = [false, false, false, false, false];
    var pointSat = [true, true, false, true, true];
    var pointSub = [1, 1, 1, 1, 1];
    var pointT = [20, 40, 40, 60, 80];
    var pointV = [0, 0, 30, 0, 0];

    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다. 사각형을 선택했으면 크기는 사각형을 따른다
    var DEFAULTS = {widthMm: widthMm, heightMm: heightMm, pointSizeMm: pointSizeMm, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
    applySettings();
    for (var z = 0; z < POINT_COUNT; z++) {
        if (pointSat[z]) pointV[z] = saturatedValue(pointSub[z], pointT[z]);
    }

    // 그래프 왼쪽 위 기준점(pt). 사각형이 있으면 사각형 모서리, 없으면 대지 가운데에서 기본 크기로
    var originLeft, originTop;
    if (rect !== null) {
        var rb = rect.geometricBounds;
        originLeft = rb[0];
        originTop = rb[1];
        widthMm = clamp(Math.round((rb[2] - rb[0]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM);
        heightMm = clamp(Math.round((rb[1] - rb[3]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM);
        DEFAULTS.widthMm = widthMm;
        DEFAULTS.heightMm = heightMm;
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

    var pointPanel = addPanel(dlg, "점");
    var pointHeader = pointPanel.add("group");
    pointHeader.alignChildren = ["left", "center"];
    pointHeader.add("group").preferredSize.width = POINT_CHECK_WIDTH;
    pointHeader.add("statictext", undefined, "온도 (°C)").preferredSize.width = POINT_TEMP_WIDTH;
    pointHeader.add("statictext", undefined, "물질").preferredSize.width = POINT_SUB_WIDTH;
    pointHeader.add("group").preferredSize.width = POINT_SAT_WIDTH;
    pointHeader.add("statictext", undefined, "용해도 (g)").preferredSize.width = POINT_VALUE_WIDTH + 20;
    var pointTempInputs = [];
    var pointSubLists = [];
    var pointValueInputs = [];
    for (var pointIndex = 0; pointIndex < POINT_COUNT; pointIndex++) {
        addPointRow(pointIndex);
    }
    var pointSizeControls = addValueRow(pointPanel, "점 크기", "mm", pointSizeMm,
        POINT_SIZE_MIN_MM, POINT_SIZE_MAX_MM, 0.1, 1);

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
    setRowValue(pointSizeControls, pointSizeMm);
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
    bindSizeRow(widthControls, function(v) { widthMm = v; }, DEFAULTS.widthMm);
    bindSizeRow(heightControls, function(v) { heightMm = v; }, DEFAULTS.heightMm);
    bindSizeRow(pointSizeControls, function(v) { pointSizeMm = v; }, DEFAULTS.pointSizeMm);
    bindPositionRow(offsetXControls, function() { return offsetXmm; },
        function(v) { offsetXmm = v; }, true, DEFAULTS.offsetXmm);
    bindPositionRow(offsetYControls, function() { return offsetYmm; },
        function(v) { offsetYmm = v; }, false, DEFAULTS.offsetYmm);

    okButton.onClick = function() {
        // 입력창에서 바로 확인을 눌러 onChange가 오지 않은 값도 반영한다
        if (syncAllPoints() && previewGroup !== null) updatePreview();
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

        // 점 A~E. 포화 점은 그려진 곡선(꺾은선이면 그 선, 단순한 곡선이면 베지어) 위에 얹는다
        var fitCache = {};
        for (var pn = 0; pn < POINT_COUNT; pn++) {
            if (!pointOn[pn] || pointV[pn] === null) continue;
            var pointY = py(pointV[pn]);
            var rising = true;
            if (pointSat[pn]) {
                pointY = drawnCurveY(pointSub[pn], pointT[pn], px, py, fitCache);
                rising = isRising(pointSub[pn], pointT[pn]);
            }
            drawPoint(group, px(pointT[pn]), pointY, POINT_NAMES[pn], pointSat[pn], rising);
        }
        return group;
    }

    // 값이 Y_MAX를 넘는 곡선은 위쪽 변에서 잘라 그린다
    function curveScreenPoints(substance, px, py) {
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
        return points;
    }

    function drawCurve(group, substance, dashes, px, py) {
        var points = curveScreenPoints(substance, px, py);
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

    // 물질 index의 온도 t(℃) 용해도(1 ℃ 간격 값을 직선으로 이음). 측정 범위 밖이면 null
    function substanceValueAt(index, t) {
        var samples = SUBSTANCES[index].samples;
        var first = samples[0][0];
        var offset = t - first;
        if (offset < 0 || offset > samples.length - 1) return null;
        var low = Math.floor(offset);
        if (low >= samples.length - 1) return samples[samples.length - 1][1];
        return samples[low][1] + (offset - low) * (samples[low + 1][1] - samples[low][1]);
    }

    // 온도 t에서 곡선이 오르는 중인지 (±1 ℃ 값 비교, 측정 범위 끝에서는 범위 안으로 맞춘다)
    function isRising(index, t) {
        var samples = SUBSTANCES[index].samples;
        var first = samples[0][0], last = samples[samples.length - 1][0];
        return substanceValueAt(index, Math.min(last, t + 1)) >= substanceValueAt(index, Math.max(first, t - 1));
    }

    // 점 입력창에 넣을 포화 용해도(소수 첫째 자리). 측정 범위 밖이거나 그래프 위쪽을 넘으면 null
    function saturatedValue(index, t) {
        var value = substanceValueAt(index, t);
        if (value === null || value > Y_MAX) return null;
        return round1(value);
    }

    // 그려진 곡선 위 온도 t의 높이(pt)
    function drawnCurveY(index, t, px, py, fitCache) {
        var points = curveScreenPoints(SUBSTANCES[index], px, py);
        var x = px(t);
        if (simpleCurve) {
            if (!fitCache[index]) fitCache[index] = fitBezier(points, BEZIER_TOLERANCE_MM * MM_TO_PT);
            var fitted = curveYAt(fitCache[index], x);
            if (fitted !== null) return fitted;
        }
        for (var i = 1; i < points.length; i++) {
            if (x <= points[i][0] + 1e-6) {
                var fraction = (x - points[i - 1][0]) / (points[i][0] - points[i - 1][0]);
                return points[i - 1][1] + fraction * (points[i][1] - points[i - 1][1]);
            }
        }
        return points[points.length - 1][1];
    }

    // 점과 글자. 곡선 위의 점은 곡선 바깥쪽인 위쪽에(곡선이 오르면 왼쪽 위, 내리면 오른쪽 위), 곡선 밖의 점은 오른쪽에 글자를 붙인다.
    // 간격은 점 가장자리에서 글자 윤곽까지 잰다 (위쪽은 윤곽 상자의 모서리를 점 중심에서 대각선으로 둔다)
    function drawPoint(group, x, y, name, onCurve, rising) {
        var radius = pointSizeMm * MM_TO_PT / 2;
        var dot = group.pathItems.ellipse(y + radius, x - radius, radius * 2, radius * 2);
        dot.filled = true;
        dot.fillColor = grayK100;
        dot.stroked = false;
        var distance = radius + POINT_LABEL_GAP_MM * MM_TO_PT;
        var label = addText(group, name);
        var b = label.geometricBounds;
        var o = glyphOffsets(label, name);
        var glyphLeft = b[0] + o[0], glyphTop = b[1] + o[1], glyphRight = b[2] + o[2], glyphBottom = b[3] + o[3];
        if (onCurve) {
            var corner = distance / Math.SQRT2;
            if (rising) label.translate(x - corner - glyphRight, y + corner - glyphBottom);
            else label.translate(x + corner - glyphLeft, y + corner - glyphBottom);
        } else {
            label.translate(x + distance - glyphLeft, y - (glyphTop + glyphBottom) / 2);
        }
    }

    // 글자 틀 경계(geometricBounds)는 글자 윤곽보다 커서(윗줄·아랫줄 여백) 그대로 쓰면 점과 글자가 떨어져 보인다.
    // 윤곽선을 만들어 윤곽 경계와 틀 경계의 차이 [왼쪽, 위, 오른쪽, 아래]를 글자마다 한 번만 재 둔다
    function glyphOffsets(label, name) {
        if (glyphOffsetCache[name]) return glyphOffsetCache[name];
        var offsets = [0, 0, 0, 0];
        try {
            var frameBounds = label.geometricBounds;
            var outline = label.duplicate().createOutline();
            var glyph = outline.geometricBounds;
            outline.remove();
            for (var i = 0; i < 4; i++) offsets[i] = glyph[i] - frameBounds[i];
        } catch (e) {}
        glyphOffsetCache[name] = offsets;
        return offsets;
    }

    // -------------------------------------------------------
    // 점 A~E 행: [체크 글자] [온도] [물질] [포화] [용해도]
    // -------------------------------------------------------
    function addPointRow(index) {
        var row = pointPanel.add("group");
        row.alignChildren = ["left", "center"];
        var check = row.add("checkbox", undefined, POINT_NAMES[index]);
        check.preferredSize.width = POINT_CHECK_WIDTH;
        var tempInput = row.add("edittext", undefined, String(pointT[index]));
        tempInput.preferredSize.width = POINT_TEMP_WIDTH;
        var substanceNames = [];
        for (var n = 0; n < SUBSTANCE_COUNT; n++) substanceNames.push(SUBSTANCES[n].formula);
        var substanceList = row.add("dropdownlist", undefined, substanceNames);
        substanceList.preferredSize.width = POINT_SUB_WIDTH;
        substanceList.selection = pointSub[index];
        var satCheck = row.add("checkbox", undefined, "포화");
        satCheck.preferredSize.width = POINT_SAT_WIDTH;
        var valueInput = row.add("edittext", undefined, pointV[index] === null ? OUT_OF_RANGE : formatNumber(pointV[index], 1));
        valueInput.preferredSize.width = POINT_VALUE_WIDTH + 20;
        check.value = pointOn[index];
        satCheck.value = pointSat[index];
        valueInput.enabled = !pointSat[index];
        pointTempInputs.push(tempInput);
        pointSubLists.push(substanceList);
        pointValueInputs.push(valueInput);

        check.onClick = function() {
            pointOn[index] = check.value;
            updatePreview();
        };
        substanceList.onChange = function() {
            if (substanceList.selection === null) return;
            pointSub[index] = substanceList.selection.index;
            syncPoint(index);
            updatePreview();
        };
        satCheck.onClick = function() {
            pointSat[index] = satCheck.value;
            valueInput.enabled = !pointSat[index];
            if (!pointSat[index] && pointV[index] === null) pointV[index] = 0;
            syncPoint(index);
            updatePreview();
        };
        tempInput.onChange = valueInput.onChange = function() {
            syncPoint(index);
            updatePreview();
        };
    }

    // 입력창 글자를 읽어 값을 정리하고(범위·소수 첫째 자리), 포화면 용해도를 그 물질·온도의 포화값으로 채운다
    function syncPoint(index) {
        var temperature = parseNumber(pointTempInputs[index].text);
        pointT[index] = clamp(round1(temperature === null ? pointT[index] : temperature), 0, X_MAX);
        pointTempInputs[index].text = String(pointT[index]);
        if (pointSat[index]) {
            pointV[index] = saturatedValue(pointSub[index], pointT[index]);
        } else {
            var amount = parseNumber(pointValueInputs[index].text);
            pointV[index] = clamp(round1(amount === null ? (pointV[index] === null ? 0 : pointV[index]) : amount), 0, Y_MAX);
        }
        pointValueInputs[index].text = pointV[index] === null ? OUT_OF_RANGE : formatNumber(pointV[index], 1);
    }

    // 값이 하나라도 바뀌었으면 true
    function syncAllPoints() {
        var changed = false;
        for (var i = 0; i < POINT_COUNT; i++) {
            var oldT = pointT[i], oldV = pointV[i];
            syncPoint(i);
            if (pointT[i] !== oldT || pointV[i] !== oldV) changed = true;
        }
        return changed;
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

    // 베지어 마디들(x가 왼쪽에서 오른쪽으로 커진다)로 그린 곡선의 x 위치 높이. 곡선 범위 밖이면 null
    function curveYAt(segments, x) {
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (x < segment[0][0] - 1e-6 || x > segment[3][0] + 1e-6) continue;
            var low = 0, high = 1;
            for (var n = 0; n < 40; n++) {
                var middle = (low + high) / 2;
                if (bezierAt(segment, middle)[0] < x) low = middle;
                else high = middle;
            }
            return bezierAt(segment, (low + high) / 2)[1];
        }
        return null;
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
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        return {
            input: input, slider: slider, reset: reset,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindSizeRow(controls, setter, initial) {
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
        controls.reset.onClick = function() { commit(initial); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? current : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX, initial) {
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
        controls.reset.onClick = function() { commit(initial); };
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

    function round1(value) {
        return Math.round(value * 10) / 10;
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
        var on = [];
        var sat = [];
        var sub = [];
        for (var p = 0; p < POINT_COUNT; p++) {
            on.push(pointOn[p] ? "1" : "0");
            sat.push(pointSat[p] ? "1" : "0");
            sub.push(pointSub[p]);
        }
        var parts = [
            "v5",
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
            styles.join(""),
            pointSizeMm,
            on.join(""),
            sat.join(""),
            sub.join(""),
            pointT.join(","),
            pointV.join(",")
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v5" || p.length !== 19) return;
        if (p[11].length !== SUBSTANCE_COUNT || p[12].length !== SUBSTANCE_COUNT) return;
        var temperatures = p[17].split(",");
        var amounts = p[18].split(",");
        if (p[14].length !== POINT_COUNT || p[15].length !== POINT_COUNT || p[16].length !== POINT_COUNT
            || temperatures.length !== POINT_COUNT || amounts.length !== POINT_COUNT) return;
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
        pointSizeMm = round1(restoreNumber(p[13], pointSizeMm, POINT_SIZE_MIN_MM, POINT_SIZE_MAX_MM));
        for (var q = 0; q < POINT_COUNT; q++) {
            var subIndex = parseInt(p[16].charAt(q), 10);
            pointOn[q] = (p[14].charAt(q) === "1");
            pointSat[q] = (p[15].charAt(q) === "1");
            pointSub[q] = (subIndex >= 0 && subIndex < SUBSTANCE_COUNT) ? subIndex : pointSub[q];
            pointT[q] = round1(restoreNumber(temperatures[q], pointT[q], 0, X_MAX));
            pointV[q] = round1(restoreNumber(amounts[q], pointV[q] === null ? 0 : pointV[q], 0, Y_MAX));
        }
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, minimum, maximum);
    }
})();
