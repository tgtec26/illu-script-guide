// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 미리보기 라벨 겹침 풀기 (05_수학/math_label_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/math_label_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}
var SCRIPT_KEY = "MiddleMath";

// 중학교 수학: 도형 표기·수직선·좌표평면·통계·작도·전개도·원의 성질·색칠한 부분·도형 문제·실생활 그래프·수형도를 한 창의 탭으로 묶었다.
// 탭마다 필요한 선택이 다르다 (표기: 직선 패스, 작도: 선분·각·삼각형, 원: 원 패스 — 선택이 없으면 마지막에 쓴 지름(없으면 40mm)의 원을 대지 가운데에 새로 그린다, 나머지는 선택 없음).
// 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "MiddleMath/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    // ==== 화살촉 (모든 탭 공통: 창 아래의 화살촉 모양·크기) ====
    // 작살형(평가원식)가 기본이다. 규격(길이·반폭·오목)은 registerHead로 등록하고, 모양·크기가 바뀌면 applyHeadStyle()이 등록된 규격을 다시 쓴다.
    // 규격의 length는 작살형(평가원식) 머리 길이로 보고, 모양은 아래 카탈로그를 같은 배율로 그린다. 선이 머리와 만나는 거리가 길이 − 오목이라
    // 오목을 고른 모양의 lineEnd에 맞춘다(삼각형 7.7, 꺾쇠 0.8, 제비꼬리 7, 작살형 9 — 작살형 길이 12.1 기준).
    var HEAD_EXAM = 3;
    var HEAD_SHAPES = ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"];
    // 화살촉 4종류: 일러스트레이터 화살촉을 선 두께 1pt·100%로 확장해 잰 외곽(사용자가 준 SVG). 끝이 원점, 뒤쪽이 +y, 가로는 방향의 직각. 단위 pt.
    // 순서는 모양 목록(삼각형, 꺾쇠, 제비꼬리, 작살형)과 같다. length는 끝에서 가장 먼 점, lineEnd는 선이 머리 속에서 끝나는 끝에서의 거리다
    var HEAD_CATALOG = [
        {length: 8.6, lineEnd: 7.7, poly: [[0, 0], [4.95, 8.6], [-4.95, 8.6]]},
        {length: 8, lineEnd: 0.8, poly: [[0, 0], [4.8, 7.3], [4.84, 7.6], [4.8, 8], [4.45, 8], [4.1, 7.8], [0, 1.3], [-4.1, 7.8], [-4.45, 8], [-4.8, 8], [-4.84, 7.6], [-4.8, 7.3]]},
        {length: 9.9, lineEnd: 7, poly: [[0, 0], [4.1, 9.9], [0, 7.6], [-4.1, 9.9]]},
        {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]}
    ];

    // 선택지가 적고 짧으면 드롭다운 대신 한 줄 라디오 (클릭 1번). 드롭다운의 selection.index 대신 .index, selection = n 대신 setRadioChoice
    function addRadioChoice(parent, items) {
        var g = parent.add("group");
        g.alignChildren = ["left", "center"];
        g.spacing = 12;
        g.radios = [];
        g.index = 0;
        for (var i = 0; i < items.length; i++) {
            var r = g.add("radiobutton", undefined, items[i]);
            r.onClick = (function(k) { return function() { g.index = k; if (g.onChange) g.onChange(); }; })(i);
            g.radios.push(r);
        }
        return g;
    }
    function setRadioChoice(g, n) {
        g.index = n;
        for (var i = 0; i < g.radios.length; i++) g.radios[i].value = (i === n);
    }

    // 끝 tip, 방향 단위 벡터 d, 배율 k(카탈로그 1pt가 k)로 shape 모양의 점들
    function catalogPoints(shape, tip, d, k) {
        var n = [-d[1], d[0]];
        var poly = HEAD_CATALOG[shape].poly;
        var out = [];
        for (var i = 0; i < poly.length; i++) {
            out.push([tip[0] - d[0] * poly[i][1] * k + n[0] * poly[i][0] * k, tip[1] - d[1] * poly[i][1] * k + n[1] * poly[i][0] * k]);
        }
        return out;
    }
    var HEAD_PREF_KEY = "MiddleMath/head";
    var HEAD_SIZE_RANGE = [30, 300];
    var headStyle = {shape: HEAD_EXAM, size: 100};
    var headSpecs = [];
    loadHeadStyle();

    function registerHead(spec) {
        spec.base = {length: spec.length, halfWidth: spec.halfWidth, notch: spec.notch};
        headSpecs.push(spec);
        applyHeadSpec(spec);
        return spec;
    }

    function applyHeadSpec(spec) {
        var s = headStyle.size / 100;
        var b = spec.base;
        spec.length = b.length * s;
        spec.halfWidth = b.halfWidth * s;
        spec.notch = spec.length - HEAD_CATALOG[headStyle.shape].lineEnd * spec.length / HEAD_CATALOG[HEAD_EXAM].length;
        spec.rear = HEAD_CATALOG[headStyle.shape].length * spec.length / HEAD_CATALOG[HEAD_EXAM].length;   // 화살촉 끝에서 뒤끝까지(pt): 그래프는 X축 화살촉 뒤끝까지 진행한다 (그림 제작 규칙 7.7)
    }

    function applyHeadStyle() {
        for (var i = 0; i < headSpecs.length; i++) applyHeadSpec(headSpecs[i]);
    }

    // 화살촉 점들 {points, closed}. 끝 tip, 방향 d, 규격 spec, 규격에 곱하는 배율 scale(없으면 1). 등록 안 한 규격은 늘 작살형(평가원식)다
    function headShapeFor(tip, d, spec, scale) {
        var k = spec.length * (scale === undefined ? 1 : scale) / HEAD_CATALOG[HEAD_EXAM].length;
        return {points: catalogPoints(spec.base ? headStyle.shape : HEAD_EXAM, tip, d, k), closed: true};
    }

    // 화살촉은 채운 닫힌 패스다
    function paintHead(path, closed, color) {
        path.stroked = false;
        path.filled = true;
        path.fillColor = color;
    }

    function loadHeadStyle() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(HEAD_PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v1" || p.length !== 3) return;
        var shape = parseInt(p[1], 10);
        var size = parseFloat(p[2]);
        if (shape >= 0 && shape < HEAD_SHAPES.length) headStyle.shape = shape;
        if (!isNaN(size) && size >= HEAD_SIZE_RANGE[0] && size <= HEAD_SIZE_RANGE[1]) headStyle.size = Math.round(size / 5) * 5;
    }

    function saveHeadStyle() {
        try { app.preferences.setStringPreference(HEAD_PREF_KEY, ["v1", headStyle.shape, headStyle.size].join("|")); } catch (e) {}
    }

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeGeoMarksEngine(), makeNumberLineEngine(), makeCoordPlaneEngine(), makeStatChartEngine(), makeConstructionEngine(), makeNetEngine(), makeCirclePropsEngine(), makeShadedAreaEngine(), makeFigureProblemEngine(), makeLifeGraphEngine(), makeTreeDiagramEngine()];

    var win = new Window("dialog", "중학교 수학");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.spacing = 4;
    win.margins = 12;

    // 탭 줄(tabbedpanel)은 탭 수만큼 폭을 차지해 창이 넓어진다. 선택 줄과 겹쳐 쌓은 페이지로 대신한다
    var holder;
    var pages = [];
    var tabBar;
    var radios = [];
    var tabList = null;
    var tabLabels = [];
    for (engineIndex = 0; engineIndex < engines.length; engineIndex++) tabLabels.push(engines[engineIndex].label);
    // 탭 선택 줄: 라디오 버튼이 기본이고, 너무 넓을 때만 드롭다운 (00_세팅/ui_tab_helper.jsxinc의 tabSelectorNeedsDropdown)
    if (typeof tabSelectorNeedsDropdown !== "function" || tabSelectorNeedsDropdown(tabLabels)) {
        tabList = win.add("dropdownlist", undefined, tabLabels);
        tabList.alignment = ["left", "center"];
        tabList.selection = 0;
    } else {
        tabBar = win.add("group");
        tabBar.alignChildren = ["left", "center"];
        tabBar.spacing = 12;
    }
    holder = win.add("group");
    holder.orientation = "stack";
    holder.alignChildren = ["fill", "top"];
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = holder.add("group");
        page.orientation = "column";
        page.alignChildren = "fill";
        page.spacing = 4;
        pages.push(page);
        if (tabList === null) radios.push(tabBar.add("radiobutton", undefined, engines[engineIndex].label));
        engines[engineIndex].error = engines[engineIndex].addRows(page);
        if (engines[engineIndex].error) {
            page.enabled = false;
            if (tabList === null) radios[engineIndex].helpTip = engines[engineIndex].error;
        }
    }

    // 화살촉 크기 (모든 탭 공통): 라벨 (단위): | 입력창 | 스크롤바 | R
    var headSizeGroup = win.add("group");
    headSizeGroup.alignChildren = ["left", "center"];
    headSizeGroup.add("statictext", undefined, "화살촉 크기 (%):").preferredSize.width = 100;
    var headSizeInput = headSizeGroup.add("edittext", undefined, String(headStyle.size));
    headSizeInput.characters = 6;
    headSizeInput.justify = "center";
    var headSizeBar = headSizeGroup.add("scrollbar", undefined, headStyle.size, HEAD_SIZE_RANGE[0], HEAD_SIZE_RANGE[1]);
    headSizeBar.stepdelta = 5;
    headSizeBar.jumpdelta = 50;
    headSizeBar.preferredSize.width = 196;
    var headSizeReset = headSizeGroup.add("button", undefined, "R");
    headSizeReset.preferredSize.width = 34;
    headSizeReset.helpTip = "처음 값으로 되돌리기";

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var headShapeList = footer.add("dropdownlist", undefined, [HEAD_SHAPES[3], HEAD_SHAPES[2], HEAD_SHAPES[0], HEAD_SHAPES[1]]);
    headShapeList.selection = [2, 3, 1, 0][headStyle.shape];
    headShapeList.helpTip = "모든 탭의 화살촉 모양. 작살형이 평가원식(기본). 모두 일러스트레이터 화살촉을 측정한 모양";
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    // 저장된 탭이 선택에 맞지 않으면 선택을 쓰는 탭부터(앞에서부터) 가능한 탭을 연다
    var tabIndex = 0;
    try {
        var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
        if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
    } catch (tabError) {}
    if (engines[tabIndex].error) {
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) {
            if (!engines[engineIndex].error) { tabIndex = engineIndex; break; }
        }
    }
    var engine = engines[tabIndex];
    if (tabList === null) radios[tabIndex].value = true;
    else tabList.selection = tabIndex;

    function selectTab(next) {
        if (next === tabIndex) return;
        if (engines[next].error) {
            if (tabList === null) { radios[next].value = false; radios[tabIndex].value = true; }
            else tabList.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        engine.clearPreview();
        pages[tabIndex].visible = false;
        tabIndex = next;
        pages[tabIndex].visible = true;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    }
    function radioHandler(index) { return function() { selectTab(index); }; }
    if (tabList === null) {
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) radios[engineIndex].onClick = radioHandler(engineIndex);
    } else {
        tabList.onChange = function() { if (tabList.selection !== null) selectTab(tabList.selection.index); };
    }
    // 페이지는 겹쳐 쌓여 가장 큰 페이지 크기로 잡힌다. 선택되지 않은 페이지는 창이 뜬 뒤(onShow)에 숨긴다.
    // 레이아웃 전에 layout()을 부르면 늘어난 크기가 굳어 창이 줄지 않는다
    function hideInactivePages() {
        for (var pageIndex = 0; pageIndex < pages.length; pageIndex++) pages[pageIndex].visible = pageIndex === tabIndex;
    }
    previewCheck.onClick = function() { engine.setPreview(previewCheck.value); };
    okButton.onClick = function() {
        if (!engine.commit()) return;
        saveHeadStyle();
        try { app.preferences.setStringPreference(TAB_PREF_KEY, String(tabIndex)); } catch (saveError) {}
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    // 화살촉 모양·크기: 등록된 규격을 다시 쓰고 지금 탭의 미리보기를 다시 그린다
    headShapeList.onChange = function() {
        if (!headShapeList.selection) return;
        headStyle.shape = [3, 2, 0, 1][headShapeList.selection.index];
        applyHeadStyle();
        engine.updatePreview();
    };
    function commitHeadSize(value) {
        value = Math.min(HEAD_SIZE_RANGE[1], Math.max(HEAD_SIZE_RANGE[0], Math.round(value / 5) * 5));
        headSizeInput.text = String(value);
        try { headSizeBar.value = value; } catch (barError) {}
        if (value === headStyle.size) return;
        headStyle.size = value;
        applyHeadStyle();
        engine.updatePreview();
    }
    headSizeBar.onChanging = function() { commitHeadSize(headSizeBar.value); };
    headSizeBar.onChange = function() { commitHeadSize(headSizeBar.value); };
    headSizeReset.onClick = function() { commitHeadSize(100); };
    headSizeInput.onChange = function() {
        var value = parseFloat(String(headSizeInput.text).replace(",", "."));
        commitHeadSize(isNaN(value) ? headStyle.size : value);
    };

    // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
    win.onShow = function() { hideInactivePages(); engine.setPreview(previewCheck.value); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    if (result !== 1) engine.clearPreview();
    try { app.redraw(); } catch (redrawError) {}

    // 음수 숫자(-2, -1/2, -π)를 점 위·아래에 둘 때는 빼기 기호를 빼고 숫자 가운데를 점에 맞춘다(평가원 그림).
    // 글자를 이만큼 가로로 옮기면 된다. 빼기를 지운 사본으로 숫자 너비를 재므로 서체·크기가 달라도 맞다
    function negativeNumberShift(frame, dir) {
        if (dir[0] !== 0 || dir[1] === 0) return 0;
        if (!/^[-−][0-9.π]/.test(frame.contents)) return 0;
        try {
            var full = frame.geometricBounds;
            var probe = frame.duplicate();
            probe.textRange.characters[0].remove();
            var rest = probe.geometricBounds;
            probe.remove();
            return -((full[2] - full[0]) - (rest[2] - rest[0])) / 2;
        } catch (e) { return 0; }
    }

    // ==== 표기 (원래 Object_GeoMarks.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 도형 표기: 선택한 다각형(직선 패스 하나)에 수학 교재식 표기를 붙인다.
    // 꼭짓점 이름(A, B, C…: 맨 위 꼭짓점부터 반시계 방향), 각마다 호(1~3겹)·직각 표시와 글자(60°, x 등),
    // 변마다 같은 길이 눈금(1~3개)·평행 표시(>, >>)와 글자(6 cm 등).
    // 선 두께는 평가원 수능 그림 측정값(보조선 약 0.36pt)과 과학 스크립트 기준(보조선 0.3pt)에 맞춰 0.3pt가 기본이다.
    // 도형 선은 기본으로 0.8pt(평가원 메인 선 측정값 약 0.84pt, 과학 메인 선 0.8pt)로 맞춘다. 끄면 원래 두께 그대로.
    // 표기는 도형 바로 위에 그룹으로 만든다.
    function makeGeoMarksEngine() {
        var api = {label: "표기", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "GeoMarks/settings";
            var MM_TO_PT = 2.834645669;
            var MAX_VERTICES = 8;
            var POSITION_LIMIT_MM = 30;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 수학 기호(π, √, θ …)
            var GS_SYMBOLS = "\u02D8\u00B0\u00B1\u00B7\u221E\u2248\u2260";   // GSMediumB1에 있는 기호 (˘ 자리에 °)
            var ENG_BASELINE_PT = 0.5;
            var MARK_GAP_MM = 0.7;   // 겹호·눈금·평행 표시 사이 간격
            var SHAPE_STROKE_PT = 0.8;
            var DIMENSION_LABEL_GAP_MM = 0.7;   // 치수선 글자 윤곽에서 흰 배경까지 (기하.jsx와 같다)

            var VERTEX_MARKS = ["없음", "호", "호 2겹", "호 3겹", "직각"];
            var SIDE_MARKS = ["없음", "눈금 1", "눈금 2", "눈금 3", "평행 >", "평행 >>"];

            var doc = app.activeDocument;

            var target = null;
            var sel = doc.selection;
            if (sel && sel.length === 1 && sel[0].typename === "PathItem") target = sel[0];
            if (target === null) {
                return "직선으로 된 도형(패스) 하나를 선택해주세요.";
            }

            var closed = target.closed;
            var rawPoints = [];
            for (var p = 0; p < target.pathPoints.length; p++) {
                var anchor = target.pathPoints[p].anchor;
                rawPoints.push([anchor[0], anchor[1]]);
            }
            rawPoints = dedupePoints(rawPoints, closed);
            if (rawPoints.length < (closed ? 3 : 2) || rawPoints.length > MAX_VERTICES) {
                return "꼭짓점이 " + (closed ? 3 : 2) + "~" + MAX_VERTICES + "개인 패스를 선택해주세요.";
            }
            var vertexCount = rawPoints.length;
            var sideCount = closed ? vertexCount : vertexCount - 1;

            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var showNames = true;
            var startLetter = "A";
            var clockwise = false;
            var fontPt = 8;
            var labelGapMm = 1.2;
            var arcRadiusMm = 3;
            var tickMm = 1.6;
            var strokePt = 0.3;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var normalizeStroke = true;
            var showDimensions = false;   // 변 글자를 점선 치수선 위에
            var dimensionRiseMm = 3;
            var vertexMarks = [], vertexTexts = [], sideMarks = [], sideTexts = [];
            for (var v = 0; v < vertexCount; v++) {
                vertexMarks.push(0);
                vertexTexts.push("");
                sideMarks.push(0);
                sideTexts.push("");
            }
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {fontPt: fontPt, labelGapMm: labelGapMm, arcRadiusMm: arcRadiusMm, tickMm: tickMm, strokePt: strokePt, offsetXmm: offsetXmm, offsetYmm: offsetYmm, dimensionRiseMm: dimensionRiseMm};
            applySettings();

            var previewGroup = null;
            var originalStroked = target.stroked;
            var originalStrokeWidth = target.strokeWidth;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var namePanel = addPanel(win, "꼭짓점 이름");
            var nameRow = namePanel.add("group");
            var showNamesCheck = nameRow.add("checkbox", undefined, "표시");
            nameRow.add("statictext", undefined, "시작 글자:");
            var startInput = nameRow.add("edittext", undefined, startLetter);
            startInput.characters = 3;
            var clockwiseCheck = nameRow.add("checkbox", undefined, "시계 방향");
            clockwiseCheck.helpTip = "맨 위 꼭짓점부터 이름을 붙인다. 기본은 반시계 방향(A 위, B 왼쪽 아래, C 오른쪽 아래)";

            var markPanel = addPanel(win, "각 · 변 표기", "fold1");
            markPanel.add("statictext", undefined, "각: 표시 / 글자 (60°, x)      변: 표시 / 글자 (6 cm)");
            var markRows = [];
            for (var r = 0; r < vertexCount; r++) markRows.push(addMarkRow(markPanel, r));

            var dimensionPanel = addPanel(win, "치수선", "dimensions");
            var dimensionCheck = dimensionPanel.add("checkbox", undefined, "점선 치수선");
            dimensionCheck.helpTip = "변 글자를 바깥쪽 곡선의 가운데에 두고, 글자 양쪽으로 점선 치수선을 그립니다";
            var dimensionControls = addValueRow(dimensionPanel, "높이", "mm", dimensionRiseMm, 0.5, 10, 0.5, 1);

            var sizePanel = addPanel(win, "크기");
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var gapControls = addValueRow(sizePanel, "글자 간격", "mm", labelGapMm, 0, 5, 0.1, 1);
            var arcControls = addValueRow(sizePanel, "호 반지름", "mm", arcRadiusMm, 1, 10, 0.1, 1);
            var tickControls = addValueRow(sizePanel, "눈금 길이", "mm", tickMm, 0.5, 5, 0.1, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var normalizeCheck = lineWidthPanel.add("checkbox", undefined, "도형 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
            normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
            var strokeControls = addValueRow(lineWidthPanel, "표기", "pt", strokePt, 0.1, 1, 0.05, 2);
            strokeControls.input.helpTip = "각의 호·직각 표시, 변의 같은 길이 눈금·평행 표시";

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);


            showNamesCheck.value = showNames;
            clockwiseCheck.value = clockwise;
            normalizeCheck.value = normalizeStroke;
            dimensionCheck.value = showDimensions;
            enableDimensionControls();
            refreshRowCaptions();

            showNamesCheck.onClick = function() { showNames = showNamesCheck.value; updatePreview(); };
            clockwiseCheck.onClick = function() { clockwise = clockwiseCheck.value; updatePreview(); };
            startInput.onChanging = function() {
                var text = String(startInput.text).replace(/\s/g, "");
                if (text.length === 0) return;
                startLetter = text.charAt(0);
                refreshRowCaptions();
                updatePreview();
            };
            normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
            function enableDimensionControls() {
                dimensionControls.input.enabled = dimensionControls.slider.enabled = dimensionControls.reset.enabled = showDimensions;
            }
            dimensionCheck.onClick = function() { showDimensions = dimensionCheck.value; enableDimensionControls(); updatePreview(); };

            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            bindValueRow(gapControls, function(value) { labelGapMm = value; }, initial.labelGapMm);
            bindValueRow(arcControls, function(value) { arcRadiusMm = value; }, initial.arcRadiusMm);
            bindValueRow(tickControls, function(value) { tickMm = value; }, initial.tickMm);
            bindValueRow(strokeControls, function(value) { strokePt = value; }, initial.strokePt);
            bindValueRow(dimensionControls, function(value) { dimensionRiseMm = value; }, initial.dimensionRiseMm);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            function clearPreview() {
                try {
                    target.stroked = originalStroked;
                    target.strokeWidth = originalStrokeWidth;
                } catch (restoreError) {}
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                if (normalizeStroke) {
                    target.stroked = true;
                    target.strokeWidth = SHAPE_STROKE_PT;
                }
                var order = orderVertices(rawPoints, closed, clockwise);
                var marks = buildMarks(order, closed, {
                    names: showNames ? vertexNames(startLetter, vertexCount) : null,
                    vertexMarks: vertexMarks, vertexTexts: vertexTexts,
                    sideMarks: sideMarks, sideTexts: sideTexts,
                    arcRadius: arcRadiusMm * MM_TO_PT, gap: MARK_GAP_MM * MM_TO_PT,
                    tick: tickMm * MM_TO_PT, labelGap: labelGapMm * MM_TO_PT,
                    dimensionRise: showDimensions ? dimensionRiseMm * MM_TO_PT : 0
                });

                previewGroup = target.parent.groupItems.add();
                previewGroup.move(target, ElementPlacement.PLACEBEFORE);
                previewGroup.name = "도형 표기";
                for (var i = 0; i < marks.paths.length; i++) drawMarkPath(marks.paths[i]);
                for (var j = 0; j < marks.texts.length; j++) {
                    var item = drawLabel(marks.texts[j]);
                    if (marks.texts[j].dimension) addDimension(marks.texts[j], item);
                }
                if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            function drawMarkPath(mark) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < mark.points.length; i++) anchors.push(mark.points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < mark.points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = mark.points[j].left;
                    point.rightDirection = mark.points[j].right;
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = strokePt;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                return path;
            }

            // 점선 치수선 (기하.jsx와 같은 모양): 표기 두께의 점선 베지어 하나 + 글자 윤곽에서 띄운 흰 배경 + 글자를 한 그룹으로.
            // 곡선은 꼭짓점 중심에서 도형 선 두께의 절반만큼 물러난다.
            // 기울어진 변은 글상자 모서리가 변 쪽으로 내려와 흰 배경이 도형 변·눈금을 덮으므로,
            // 흰 배경이 변에서 clear(눈금 끝, 적어도 도형 선 두께 절반)만큼 떨어질 때까지 그 변의 곡선만 높이고 글자도 옮긴다
            function addDimension(label, item) {
                if (!item) return;
                var spec = label.dimension;
                var shapeWidth = normalizeStroke ? SHAPE_STROKE_PT : originalStrokeWidth;
                var gap = DIMENSION_LABEL_GAP_MM * MM_TO_PT;
                var bounds = dimensionLabelBounds(item);
                var rect = [bounds[0] - gap, bounds[1] + gap, bounds[2] + gap, bounds[3] - gap];
                var middle = [(spec.a[0] + spec.b[0]) / 2, (spec.a[1] + spec.b[1]) / 2];
                var corners = [[rect[0], rect[1]], [rect[2], rect[1]], [rect[0], rect[3]], [rect[2], rect[3]]];
                var low = Infinity;
                for (var k = 0; k < corners.length; k++) low = Math.min(low, (corners[k][0] - middle[0]) * spec.normal[0] + (corners[k][1] - middle[1]) * spec.normal[1]);
                var clear = Math.max(spec.clear, shapeWidth / 2), rise = spec.rise;
                if (low < clear) {
                    var lift = clear - low, dx = spec.normal[0] * lift, dy = spec.normal[1] * lift;
                    rise += lift;
                    item.translate(dx, dy);
                    rect = [rect[0] + dx, rect[1] + dy, rect[2] + dx, rect[3] + dy];
                }
                var pieces = dimensionCurve(spec.a, spec.b, spec.normal, rise, shapeWidth / 2);
                if (pieces.length === 0) return;
                var group = previewGroup.groupItems.add();
                group.name = "치수선 " + label.text;
                var curve = drawMarkPath(pieces[0]);
                curve.name = "점선 베지어";
                curve.strokeDashes = [2, 1.5];
                curve.move(group, ElementPlacement.PLACEATEND);
                var mask = group.pathItems.rectangle(rect[1], rect[0], rect[2] - rect[0], rect[1] - rect[3]);
                mask.name = "글자 배경";
                mask.stroked = false;
                mask.filled = true;
                mask.fillColor = makeGray(0);
                mask.fillOverprint = false;
                item.move(group, ElementPlacement.PLACEATBEGINNING);
            }

            // 실제 글자 윤곽을 재어 숫자·영문·분수 모두 같은 여백을 준다 (기하.jsx와 같다)
            function dimensionLabelBounds(item) {
                var copy = null;
                try {
                    copy = item.duplicate();
                    if (copy.typename === "TextFrame") copy = copy.createOutline();
                    else outlineChildren(copy);
                    var bounds = copy.visibleBounds;
                    return [bounds[0], bounds[1], bounds[2], bounds[3]];
                } catch (e) {
                    var fallback = item.visibleBounds;
                    return [fallback[0], fallback[1], fallback[2], fallback[3]];
                } finally {
                    if (copy !== null) try { copy.remove(); } catch (removeError) {}
                }
                function outlineChildren(group) {
                    for (var i = group.pageItems.length - 1; i >= 0; i--) {
                        var child = group.pageItems[i];
                        if (child.typename === "TextFrame") child.createOutline();
                        else if (child.typename === "GroupItem") outlineChildren(child);
                    }
                }
            }

            // at에서 dir 방향으로 gap만큼 떨어진 곳에 글자의 가까운 가장자리가 오게 둔다
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function drawLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    return buildStackedLabel(previewGroup, label, fontPt, label.gap, stackFrame, stackBar);
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var reach = label.gap + halfW * Math.abs(label.dir[0]) + halfH * Math.abs(label.dir[1]);
                var x = label.at[0] + label.dir[0] * reach;
                var y = label.at[1] + label.dir[1] * reach;
                // 좁은 각: 글자를 감싸는 원이 두 변에 닿지 않을 만큼 꼭짓점에서 멀리
                if (label.vertex && label.halfAngle > 0 && label.halfAngle < Math.PI / 2) {
                    var fit = Math.sqrt(halfW * halfW + halfH * halfH) / Math.sin(label.halfAngle);
                    var current = Math.sqrt(Math.pow(x - label.vertex[0], 2) + Math.pow(y - label.vertex[1], 2));
                    if (fit > current) {
                        x = label.vertex[0] + label.dir[0] * fit;
                        y = label.vertex[1] + label.dir[1] * fit;
                    }
                }
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
                return frame;
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt).
            // 따로 떨어진 소문자 한 글자(x, a)는 변수라 GSMediItaC1. 꼭짓점 이름(upright)은 기울이지 않는다
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if (isKoreanOrSpace(code)) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126 && GS_SYMBOLS.indexOf(text.charAt(i)) < 0) {
                        attributes.textFont = eqnFont;   // √3 cm, 2π 같은 기호
                        attributes.baselineShift = 0;
                    } else if (!upright && isVariableLetter(text, i)) {
                        attributes.textFont = italicFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
            }

            function isKoreanOrSpace(code) {
                return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
            }

            function isVariableLetter(text, i) {
                return /[a-z]/.test(text.charAt(i)) && !/[A-Za-z]/.test(text.charAt(i - 1)) && !/[A-Za-z]/.test(text.charAt(i + 1));
            }

            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-geo-marks.js)
            // -------------------------------------------------------
            // 겹친 점(닫힌 패스의 끝=처음 포함)을 지운다
            function dedupePoints(points, isClosed) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var last = out[out.length - 1];
                    if (last && Math.abs(last[0] - points[i][0]) < 0.01 && Math.abs(last[1] - points[i][1]) < 0.01) continue;
                    out.push(points[i]);
                }
                if (isClosed && out.length > 1) {
                    var first = out[0], end = out[out.length - 1];
                    if (Math.abs(first[0] - end[0]) < 0.01 && Math.abs(first[1] - end[1]) < 0.01) out.pop();
                }
                return out;
            }

            // 닫힌 도형: 맨 위(같으면 왼쪽) 꼭짓점부터 반시계(y 위쪽 좌표) 순서. 열린 패스: 패스 순서 그대로
            function orderVertices(points, isClosed, isClockwise) {
                var list = points.slice();
                if (isClosed) {
                    if (signedArea(list) < 0) list.reverse();
                    var top = 0;
                    for (var i = 1; i < list.length; i++) {
                        if (list[i][1] > list[top][1] + 0.5 || (Math.abs(list[i][1] - list[top][1]) <= 0.5 && list[i][0] < list[top][0])) top = i;
                    }
                    list = list.slice(top).concat(list.slice(0, top));
                    if (isClockwise) list = [list[0]].concat(list.slice(1).reverse());
                } else if (isClockwise) {
                    list.reverse();
                }
                return list;
            }

            function signedArea(points) {
                var sum = 0;
                for (var i = 0; i < points.length; i++) {
                    var a = points[i], b = points[(i + 1) % points.length];
                    sum += a[0] * b[1] - b[0] * a[1];
                }
                return sum / 2;
            }

            function vertexNames(first, count) {
                var names = [];
                for (var i = 0; i < count; i++) names.push(String.fromCharCode(first.charCodeAt(0) + i));
                return names;
            }

            // 표기를 경로(점마다 anchor·left·right)와 글자(at에서 dir 쪽으로 gap)로 만든다
            function buildMarks(points, isClosed, opt) {
                var n = points.length;
                var sides = isClosed ? n : n - 1;
                var turn = signedArea(points) < 0 ? -1 : 1;
                var paths = [], texts = [];

                for (var i = 0; i < n; i++) {
                    var vertex = points[i];
                    var hasPrev = isClosed || i > 0, hasNext = isClosed || i < n - 1;
                    var prev = hasPrev ? points[(i - 1 + n) % n] : null;
                    var next = hasNext ? points[(i + 1) % n] : null;

                    var outward;
                    if (prev && next) {
                        var span = angleSpan(vertex, prev, next, turn, isClosed);
                        var mid = span.start + span.sweep / 2;
                        var inward = [Math.cos(mid), Math.sin(mid)];
                        outward = [-inward[0], -inward[1]];
                        var mark = opt.vertexMarks[i] || 0;
                        var reach = opt.arcRadius;
                        if (mark >= 1 && mark <= 3) {
                            for (var k = 0; k < mark; k++) paths.push(arcPath(vertex, opt.arcRadius + k * opt.gap, span.start, span.sweep));
                            reach = opt.arcRadius + (mark - 1) * opt.gap;
                        } else if (mark === 4) {
                            paths.push(rightAnglePath(vertex, span.start, opt.arcRadius * 0.7));
                            reach = opt.arcRadius * 0.7 * Math.SQRT2;
                        }
                        if (opt.vertexTexts[i]) texts.push({ text: opt.vertexTexts[i], at: offsetPoint(vertex, inward, reach), dir: inward, gap: opt.labelGap, vertex: vertex, halfAngle: span.sweep / 2 });
                    } else {
                        // 열린 패스의 끝점: 이웃에서 멀어지는 쪽
                        outward = unit(sub(vertex, prev || next));
                    }
                    if (opt.names) texts.push({ text: opt.names[i], at: vertex, dir: outward, gap: opt.labelGap, upright: true });
                }

                for (var s = 0; s < sides; s++) {
                    var a = points[s], b = points[(s + 1) % n];
                    var along = unit(sub(b, a));
                    var normal = [along[1] * turn, -along[0] * turn];   // 도형 바깥쪽
                    var middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                    var sideMark = opt.sideMarks[s] || 0;
                    var count = sideMark <= 3 ? sideMark : sideMark - 3;
                    for (var c = 0; c < count; c++) {
                        var center = offsetPoint(middle, along, (c - (count - 1) / 2) * opt.gap);
                        if (sideMark <= 3) {
                            paths.push(linePath([offsetPoint(center, normal, -opt.tick / 2), offsetPoint(center, normal, opt.tick / 2)]));
                        } else {
                            // 평행 표시는 어느 변이든 오른쪽(세로 변은 위쪽)을 가리켜야 서로 평행으로 읽힌다
                            var pointing = (along[0] < -1e-6 || (Math.abs(along[0]) <= 1e-6 && along[1] < 0)) ? [-along[0], -along[1]] : along;
                            var tip = offsetPoint(center, pointing, opt.tick * 0.3);
                            var back = offsetPoint(tip, pointing, -opt.tick * 0.6);
                            paths.push(linePath([offsetPoint(back, normal, opt.tick * 0.45), tip, offsetPoint(back, normal, -opt.tick * 0.45)]));
                        }
                    }
                    var clear = sideMark >= 1 && sideMark <= 3 ? opt.tick / 2 : (sideMark > 3 ? opt.tick * 0.45 : 0);
                    if (opt.sideTexts[s] && opt.dimensionRise > 0) {
                        // 점선 치수선: 글자를 바깥쪽으로 dimensionRise만큼 부푼 곡선의 꼭대기 가운데에
                        texts.push({ text: opt.sideTexts[s], at: offsetPoint(middle, normal, opt.dimensionRise), dir: [0, 0], gap: 0,
                            dimension: { a: a, b: b, normal: normal, rise: opt.dimensionRise, clear: clear } });
                    } else if (opt.sideTexts[s]) texts.push({ text: opt.sideTexts[s], at: offsetPoint(middle, normal, clear), dir: normal, gap: opt.labelGap });
                }
                return { paths: paths, texts: texts };
            }

            // 치수선은 하나의 3차 베지어다 (기하.jsx와 같다). 글자 부분도 자르지 않는다.
            // 꼭짓점 중심에서 retreat(도형 선 두께의 절반)만큼 물러난다
            function dimensionCurve(a, b, normal, rise, retreat) {
                var dx = b[0] - a[0], dy = b[1] - a[1], length = Math.sqrt(dx * dx + dy * dy);
                if (length < 1e-6) return [];
                function Q(t) { return [a[0] + dx * t + normal[0] * 4 * rise * t * (1 - t), a[1] + dy * t + normal[1] * 4 * rise * t * (1 - t)]; }
                function D(t) { return [dx + normal[0] * 4 * rise * (1 - 2 * t), dy + normal[1] * 4 * rise * (1 - 2 * t)]; }
                function piece(t0, t1) {
                    var p = Q(t0), q = Q(t1), dp = D(t0), dq = D(t1), scale = (t1 - t0) / 3;
                    return {kind: "dimension", closed: false, points: [
                        {anchor: p, left: p, right: [p[0] + dp[0] * scale, p[1] + dp[1] * scale]},
                        {anchor: q, left: [q[0] - dq[0] * scale, q[1] - dq[1] * scale], right: q}]};
                }
                retreat = Math.max(0, retreat || 0);
                var low = 0, high = 0.5;
                var end = Q(high), ex = end[0] - a[0], ey = end[1] - a[1];
                if (retreat >= Math.sqrt(ex * ex + ey * ey)) return [];
                if (retreat > 0) {
                    for (var step = 0; step < 24; step++) {
                        var mid = (low + high) / 2, at = Q(mid);
                        var ox = at[0] - a[0], oy = at[1] - a[1];
                        if (ox * ox + oy * oy < retreat * retreat) low = mid; else high = mid;
                    }
                }
                var inset = retreat > 0 ? (low + high) / 2 : 0;
                return [piece(inset, 1 - inset)];
            }

            // 꼭짓점 안쪽 각: start에서 반시계로 sweep(라디안). 열린 패스는 작은 쪽 각
            function angleSpan(vertex, prev, next, turn, isClosed) {
                var toPrev = Math.atan2(prev[1] - vertex[1], prev[0] - vertex[0]);
                var toNext = Math.atan2(next[1] - vertex[1], next[0] - vertex[0]);
                var start = turn > 0 ? toNext : toPrev;
                var end = turn > 0 ? toPrev : toNext;
                var sweep = end - start;
                while (sweep < 0) sweep += Math.PI * 2;
                while (sweep >= Math.PI * 2) sweep -= Math.PI * 2;
                if (!isClosed && sweep > Math.PI) {
                    start = end;
                    sweep = Math.PI * 2 - sweep;
                }
                return { start: start, sweep: sweep };
            }

            // 90°씩 나눈 3차 베지어 원호
            function arcPath(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radius;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var anchor = [center[0] + radius * cos, center[1] + radius * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: anchor,
                        left: i === 0 ? anchor : [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                        right: i === pieces ? anchor : [anchor[0] + tangent[0], anchor[1] + tangent[1]]
                    });
                }
                return { points: points };
            }

            // 직각 표시: 두 변을 따라 size만큼 간 두 점을 잇는 꺾은선
            function rightAnglePath(vertex, start, size) {
                var u = [Math.cos(start), Math.sin(start)];
                var w = [-u[1], u[0]];
                var p1 = offsetPoint(vertex, u, size);
                var p2 = offsetPoint(p1, w, size);
                return linePath([p1, p2, offsetPoint(vertex, w, size)]);
            }

            function linePath(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points };
            }

            function offsetPoint(point, dir, distance) {
                return [point[0] + dir[0] * distance, point[1] + dir[1] * distance];
            }

            function sub(a, b) {
                return [a[0] - b[0], a[1] - b[1]];
            }

            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
                return [v[0] / length, v[1] / length];
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = ["left", "top"];
                panel.margins = [12, 16, 12, 12];
                panel.spacing = 6;
                return panel;
            }

            // 한 행에 꼭짓점 하나와 그 꼭짓점에서 나가는 변 하나
            function addMarkRow(parent, index) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var vertexCaption = row.add("statictext", undefined, "∠W");
                vertexCaption.preferredSize.width = 26;
                var vertexList = row.add("dropdownlist", undefined, VERTEX_MARKS);
                vertexList.selection = vertexMarks[index];
                var vertexInput = row.add("edittext", undefined, vertexTexts[index]);
                vertexInput.characters = 6;
                var angleOn = closed || (index > 0 && index < vertexCount - 1);
                vertexList.enabled = angleOn;
                vertexInput.enabled = angleOn;

                var sideCaption = row.add("statictext", undefined, "WW");
                sideCaption.preferredSize.width = 26;
                var sideList = row.add("dropdownlist", undefined, SIDE_MARKS);
                sideList.selection = sideMarks[index];
                var sideInput = row.add("edittext", undefined, sideTexts[index]);
                sideInput.characters = 6;
                var sideOn = index < sideCount;
                sideCaption.visible = sideOn;
                sideList.visible = sideOn;
                sideInput.visible = sideOn;

                vertexList.onChange = function() { vertexMarks[index] = vertexList.selection ? vertexList.selection.index : 0; updatePreview(); };
                sideList.onChange = function() { sideMarks[index] = sideList.selection ? sideList.selection.index : 0; updatePreview(); };
                vertexInput.onChanging = function() { vertexTexts[index] = vertexInput.text; updatePreview(); };
                sideInput.onChanging = function() { sideTexts[index] = sideInput.text; updatePreview(); };
                return { vertexCaption: vertexCaption, sideCaption: sideCaption };
            }

            function refreshRowCaptions() {
                var names = vertexNames(startLetter, vertexCount);
                for (var i = 0; i < markRows.length; i++) {
                    markRows[i].vertexCaption.text = "∠" + names[i];
                    markRows[i].sideCaption.text = names[i] + names[(i + 1) % vertexCount];
                }
            }

            function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (" + unit + "):").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM_TO_PT;
                    setter(value);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0 || previewGroup === null) return;
                    previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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

            function roundTo(value, step) {
                return Math.round(value / step) * step;
            }

            function formatNumber(value, decimals) {
                return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원. 각·변 표기는 꼭짓점 수와 열림/닫힘이 같을 때만 되살린다
            // -------------------------------------------------------
            function saveSettings() {
                var parts = [
                    "v3",
                    showNames ? "1" : "0", encodeURIComponent(startLetter), clockwise ? "1" : "0",
                    fontPt, labelGapMm, arcRadiusMm, tickMm, strokePt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0", normalizeStroke ? "1" : "0",
                    vertexCount + (closed ? "c" : "o"),
                    vertexMarks.join(","), encodeList(vertexTexts), sideMarks.join(","), encodeList(sideTexts),
                    showDimensions ? "1" : "0", dimensionRiseMm
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function encodeList(list) {
                var out = [];
                for (var i = 0; i < list.length; i++) out.push(encodeURIComponent(list[i]));
                return out.join(",");
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                // v3 = v2 + 점선 치수선(켬, 높이). v2도 읽는다
                if (!((p[0] === "v2" && p.length === 18) || (p[0] === "v3" && p.length === 20))) return;
                try {
                    showNames = p[1] === "1";
                    var letter = decodeURIComponent(p[2]);
                    if (letter.length === 1) startLetter = letter;
                    clockwise = p[3] === "1";
                    fontPt = restoreNumber(p[4], fontPt, 5, 14);
                    labelGapMm = restoreNumber(p[5], labelGapMm, 0, 5);
                    arcRadiusMm = restoreNumber(p[6], arcRadiusMm, 1, 10);
                    tickMm = restoreNumber(p[7], tickMm, 0.5, 5);
                    strokePt = restoreNumber(p[8], strokePt, 0.1, 1);
                    offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[11] === "1";
                    normalizeStroke = p[12] === "1";
                    if (p[0] === "v3") {
                        showDimensions = p[18] === "1";
                        dimensionRiseMm = restoreNumber(p[19], dimensionRiseMm, 0.5, 10);
                    }
                    if (p[13] !== vertexCount + (closed ? "c" : "o")) return;
                    var vm = p[14].split(","), vt = p[15].split(","), sm = p[16].split(","), st = p[17].split(",");
                    if (vm.length !== vertexCount || vt.length !== vertexCount || sm.length !== vertexCount || st.length !== vertexCount) return;
                    for (var i = 0; i < vertexCount; i++) {
                        vertexMarks[i] = restoreIndex(vm[i], VERTEX_MARKS.length);
                        sideMarks[i] = restoreIndex(sm[i], SIDE_MARKS.length);
                        vertexTexts[i] = decodeURIComponent(vt[i]);
                        sideTexts[i] = decodeURIComponent(st[i]);
                    }
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }

            function restoreIndex(text, length) {
                var value = parseInt(text, 10);
                return (isNaN(value) || value < 0 || value >= length) ? 0 : value;
            }
        }
        return api;
    }

    // ==== 수직선 (원래 Object_NumberLine.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 수직선: 정수 눈금과 숫자, 보조 눈금, 점(A=-2.5, B=3/4, P=√2), 부등식의 해(-1<x<=3)를 그린다.
    // 해는 교과서처럼 경계에 ●(포함)·○(미포함)을 찍고 그 위로 꺾어 올린 선으로 범위를 표시한다.
    // 선 두께는 평가원 그림 측정값에 맞춘 과학 기준: 수직선·눈금 0.4pt, 해 선 0.8pt. 축·눈금·해 선은 따로 조절한다.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeNumberLineEngine() {
        var api = {label: "수직선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "NumberLine/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var TICK_PT = 0.4;
            var SOLUTION_PT = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 1;
            var PAIR_GAP_MM = 14;   // 대응: 아래 수직선까지
            var SHADE_K = 15;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };   // pt. 평가원 축 화살촉 (좌표평면 탭과 같다)
            registerHead(ARROW);

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var minValue = -5;
            var maxValue = 5;
            var unitMm = 8;
            var subdivisions = 1;
            var tickMm = 1.6;
            var solutionMm = 4;
            var fontPt = 8;
            var showNumbers = true;
            var pointsText = "";
            var inequalityText = "";
            var numberStep = 1;           // 숫자 간격 (2면 2마다)
            var plusSign = false;         // 양수에 + (+1, +2)
            var arrowEnds = false;        // 양 끝 화살촉 (끝이 없는 해 선도)
            var axisName = "";            // 오른쪽 끝 아래 글자 (x)
            var tickLabelText = "";       // 눈금 글자 -2:-a, 2:a
            var shadeMode = 0;            // 0 칠하지 않음, 1 공통부분, 2 해 전체
            var moveText = "";            // 이동 화살표 2>5:+3
            var pairText = "";            // 대응 -2>-4:×2 (아래 수직선)
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {minValue: minValue, maxValue: maxValue, unitMm: unitMm, subdivisions: subdivisions, tickMm: tickMm, fontPt: fontPt, solutionMm: solutionMm, numberStep: numberStep, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {axis: AXIS_PT, tick: TICK_PT, graph: SOLUTION_PT};
            loadLineWidths();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var rangePanel = addPanel(win, "범위 · 눈금", "fold2");
            var minControls = addValueRow(rangePanel, "최솟값", "", minValue, -20, 19, 1, 0);
            var maxControls = addValueRow(rangePanel, "최댓값", "", maxValue, -19, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 3, 40, 0.5, 1);
            var subControls = addValueRow(rangePanel, "칸 나누기", "칸", subdivisions, 1, 10, 1, 0);
            subControls.input.helpTip = "1 사이를 몇 칸으로 나눌지. 1이면 보조 눈금 없음";
            var tickControls = addValueRow(rangePanel, "눈금 길이", "mm", tickMm, 0.5, 5, 0.1, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var numbersCheck = rangePanel.add("checkbox", undefined, "정수 눈금에 숫자 표시");
            var stepControls = addValueRow(rangePanel, "숫자 간격", "", numberStep, 1, 10, 1, 0);
            stepControls.input.helpTip = "2면 2마다 숫자 (-4, -2, 0, 2, …)";
            var plusCheck = rangePanel.add("checkbox", undefined, "양수에 + 붙이기 (+1, +2)");
            var endsCheck = rangePanel.add("checkbox", undefined, "양 끝 화살촉 (끝이 없는 해 선도)");
            var axisNameInput = addTextRow(rangePanel, "축 이름:", axisName, "오른쪽 끝 아래에 붙는 글자 (x, t)");
            var tickLabelInput = addTextRow(rangePanel, "눈금 글자:", tickLabelText, "값:글자. 그 값에 눈금을 긋고 숫자 대신 글자를 쓴다 (-2:-a, 0:0, 2:a, 3:a-1)");

            var markPanel = addPanel(win, "점 · 해", "fold4");
            var pointsRow = markPanel.add("group");
            pointsRow.add("statictext", undefined, "점:").preferredSize.width = 40;
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 300;
            pointsInput.helpTip = "쉼표로 구분. 이름=값 (A=-2.5, B=3/4, P=√2, Q=1-√3). 이름 없이 값만 쓰면 점만 찍는다";
            var inequalityRow = markPanel.add("group");
            inequalityRow.add("statictext", undefined, "해:").preferredSize.width = 40;
            var inequalityInput = inequalityRow.add("edittext", undefined, inequalityText);
            inequalityInput.preferredSize.width = 300;
            inequalityInput.helpTip = "x>2, x<=-1, -1<x<=3, x≥2 처럼. <=는 ≤, >=는 ≥와 같다. 쉼표로 여러 개를 쓰면 한 칸씩 높여 겹친다(연립부등식). 뒤에 :①처럼 이름을 붙이면 선 가운데에 넣는다. x<=0 또는 x>=3은 같은 높이에 두 구간";
            var solutionControls = addValueRow(markPanel, "해 선 높이", "mm", solutionMm, 0, 15, 0.5, 1);
            solutionControls.input.helpTip = "0이면 수직선 위에 굵게 겹친다 (구간)";
            var shadeRow = markPanel.add("group");
            shadeRow.add("statictext", undefined, "칠하기:").preferredSize.width = 40;
            var shadeList = shadeRow.add("dropdownlist", undefined, ["칠하지 않음", "공통부분", "해 전체"]);
            var arrowPanel = addPanel(win, "화살표", "foldArrows");
            var moveInput = addTextRow(arrowPanel, "이동:", moveText, "시작>끝:글자. 수직선 위에 가로 화살표와 시작·끝 점선 (덧셈·뺄셈, 점의 이동). 쉼표로 여러 개를 쓰면 한 줄씩 위로");
            var pairInput = addTextRow(arrowPanel, "대응:", pairText, "위 값>아래 값:글자. 아래에 수직선을 하나 더 긋고 위 점에서 아래 점으로 화살표 (부등식의 성질). 숫자는 두 수직선 모두 위에 쓴다");
            var messageText = markPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 340;

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var solutionWidthControls = addValueRow(lineWidthPanel, "해 선", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            axisWidthControls.input.helpTip = "수직선과 ○ 테두리";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(solutionWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            numbersCheck.value = showNumbers;
            plusCheck.value = plusSign;
            endsCheck.value = arrowEnds;
            shadeList.selection = shadeMode;

            bindValueRow(minControls, function(value) {
                minValue = value;
                if (maxValue <= minValue) { maxValue = minValue + 1; setRowValue(maxControls, maxValue); }
            }, initial.minValue);
            bindValueRow(maxControls, function(value) {
                maxValue = value;
                if (minValue >= maxValue) { minValue = maxValue - 1; setRowValue(minControls, minValue); }
            }, initial.maxValue);
            bindValueRow(unitControls, function(value) { unitMm = value; }, initial.unitMm);
            bindValueRow(subControls, function(value) { subdivisions = value; }, initial.subdivisions);
            bindValueRow(tickControls, function(value) { tickMm = value; }, initial.tickMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            bindValueRow(solutionControls, function(value) { solutionMm = value; }, initial.solutionMm);
            numbersCheck.onClick = function() { showNumbers = numbersCheck.value; updatePreview(); };
            bindValueRow(stepControls, function(value) { numberStep = value; }, initial.numberStep);
            plusCheck.onClick = function() { plusSign = plusCheck.value; updatePreview(); };
            endsCheck.onClick = function() { arrowEnds = endsCheck.value; updatePreview(); };
            axisNameInput.onChanging = function() { axisName = axisNameInput.text; updatePreview(); };
            tickLabelInput.onChanging = function() { tickLabelText = tickLabelInput.text; updatePreview(); };
            shadeList.onChange = function() { if (shadeList.selection) { shadeMode = shadeList.selection.index; updatePreview(); } };
            moveInput.onChanging = function() { moveText = moveInput.text; updatePreview(); };
            pairInput.onChanging = function() { pairText = pairInput.text; updatePreview(); };
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
            inequalityInput.onChanging = function() { inequalityText = inequalityInput.text; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

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
                var points = parsePoints(pointsText);
                var solutions = parseSolutions(inequalityText);
                var tickLabels = parseTickLabels(tickLabelText), moves = parseMoves(moveText), pairs = parseMoves(pairText);
                var problems = [];
                if (points.bad.length > 0) problems.push("읽지 못한 점: " + points.bad.join(", "));
                if (solutions === null) problems.push("해를 읽지 못함");
                if (tickLabels === null) problems.push("눈금 글자를 읽지 못함");
                if (moves === null) problems.push("이동을 읽지 못함");
                if (pairs === null) problems.push("대응을 읽지 못함");
                messageText.text = problems.length > 0 ? problems.join(" / ") : " ";

                var drawing = buildNumberLine({
                    min: minValue, max: maxValue, unit: unitMm * MM_TO_PT, subdivisions: subdivisions,
                    tick: tickMm * MM_TO_PT, showNumbers: showNumbers, points: points.list,
                    solutions: solutions || [], solutionHeight: solutionMm * MM_TO_PT, dotRadius: DOT_RADIUS_MM * MM_TO_PT,
                    fontPt: fontPt, head: ARROW, ends: arrowEnds, axisName: axisName, plusSign: plusSign,
                    numberStep: numberStep, tickLabels: tickLabels || [], shade: shadeMode,
                    moves: moves || [], pairs: pairs || [], pairGap: PAIR_GAP_MM * MM_TO_PT
                });

                previewGroup = layer.groupItems.add();
                previewGroup.name = "수직선";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f].points);
                for (var i = 0; i < drawing.lines.length; i++) {
                    var line = drawing.lines[i];
                    if (line.guide) addLine(line.points, GUIDE_PT, GUIDE_DASH);
                    else addLine(line.points, line.main ? SOLUTION_PT : (line.tick ? TICK_PT : AXIS_PT));
                }
                for (var h = 0; h < drawing.heads.length; h++) addArrow(drawing.heads[h]);
                for (var j = 0; j < drawing.dots.length; j++) addDot(drawing.dots[j]);
                for (var k = 0; k < drawing.texts.length; k++) addLabel(drawing.texts[k]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            function addLine(points, width, dashes) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = width;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (dashes) path.strokeDashes = dashes;
            }

            // 칠하기 (공통부분·해 전체): 선 없이 K15, 맨 뒤
            function addFill(points) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(SHADE_K);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉
            function addArrow(arrow) {
                var head = headShapeFor(arrow.tip, arrow.dir, ARROW);
                var path = previewGroup.pathItems.add();
                path.setEntirePath(head.points);
                path.closed = head.closed;
                paintHead(path, head.closed, makeGray(100));
            }

            // ● 포함(검정 채움) · ○ 미포함(흰 채움 + 선)
            function addDot(dot) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(dot.open ? 0 : 100);
                circle.stroked = dot.open;
                if (dot.open) {
                    circle.strokeColor = makeGray(100);
                    circle.strokeWidth = AXIS_PT;
                }
            }

            // at에서 위(dir=1) 또는 아래(dir=-1)로 간격을 두고 글자 가운데를 맞춘다
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfH = (b[1] - b[3]) / 2;
                var y = label.at[1] + label.dir * (label.clear + LABEL_GAP_MM * MM_TO_PT + halfH);
                frame.translate(label.at[0] + negativeNumberShift(frame, [0, label.dir]) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-number-line.js). 0이 원점, 1 = unit pt
            // -------------------------------------------------------
            function buildNumberLine(opt) {
                var lines = [], dots = [], texts = [], fills = [], heads = [];
                var margin = opt.unit * 0.6;
                var left = opt.min * opt.unit - margin, right = opt.max * opt.unit + margin;
                var cut = opt.head ? opt.head.length - opt.head.notch : 0, ends = !!(opt.ends && opt.head);
                var pairs = opt.pairs || [], moves = opt.moves || [], tickLabels = opt.tickLabels || [], step = opt.numberStep || 1;
                var fontPt = opt.fontPt || 8, numberDir = pairs.length > 0 ? 1 : -1;
                var axisYs = pairs.length > 0 ? [0, -opt.pairGap] : [0];

                // 수직선(대응이 있으면 아래에 하나 더): 끝 화살촉을 켜면 양 끝에 촉, 선은 촉 속에서 끝난다
                for (var ay = 0; ay < axisYs.length; ay++) {
                    var y0 = axisYs[ay];
                    lines.push({ points: [[left + (ends ? cut : 0), y0], [right - (ends ? cut : 0), y0]] });
                    if (ends) heads.push({ tip: [left, y0], dir: [-1, 0] }, { tip: [right, y0], dir: [1, 0] });
                    var steps = (opt.max - opt.min) * opt.subdivisions;
                    for (var i = 0; i <= steps; i++) {
                        var value = opt.min + i / opt.subdivisions;
                        var major = i % opt.subdivisions === 0;
                        var half = (major ? opt.tick : opt.tick * 0.6) / 2;
                        var x = value * opt.unit;
                        lines.push({ points: [[x, y0 - half], [x, y0 + half]], tick: true });
                        var whole = Math.round(value);
                        if (!major || !opt.showNumbers || whole % step !== 0 || tickLabelAt(tickLabels, value) !== null) continue;
                        texts.push({ text: (opt.plusSign && whole > 0 ? "+" : "") + String(whole), at: [x, y0], dir: numberDir, clear: opt.tick / 2 });
                    }
                    // 눈금 글자(-a, a, a-1): 그 값에 큰 눈금과 글자. 같은 자리의 숫자는 뺐다
                    for (var tl = 0; tl < tickLabels.length; tl++) {
                        var tx = tickLabels[tl].value * opt.unit;
                        lines.push({ points: [[tx, y0 - opt.tick / 2], [tx, y0 + opt.tick / 2]], tick: true });
                        texts.push({ text: tickLabels[tl].text, at: [tx, y0], dir: numberDir, clear: opt.tick / 2 });
                    }
                }
                if (opt.axisName) texts.push({ text: opt.axisName, at: [right, 0], dir: -1, clear: opt.tick / 2 });

                // 해: 쉼표로 나눈 해마다 높이를 한 칸씩 올린다(또는으로 이은 조각은 같은 높이). 해 선 높이 0이면 수직선 위에 굵게 겹친다
                var solutions = opt.solutions || (opt.solution ? [{ pieces: [opt.solution] }] : []);
                var h = opt.solutionHeight, rise = Math.max(h * 0.75, fontPt * 1.2), heights = [];
                for (var si = 0; si < solutions.length; si++) {
                    var sy = h === 0 ? 0 : h + si * rise;
                    heights.push(sy);
                    for (var pi = 0; pi < solutions[si].pieces.length; pi++) solutionPiece(solutions[si].pieces[pi], sy);
                }
                // 칠하기: 1 공통부분(모든 해가 겹치는 곳, 가장 낮은 해 선까지), 2 해 전체(조각마다 그 해 선까지)
                if (opt.shade && h > 0 && solutions.length > 0) {
                    var spans = opt.shade === 1 ? commonSpans(solutions) : [];
                    for (var sp = 0; sp < spans.length; sp++) fillSpan(spans[sp], heights[0]);
                    for (var sj = 0; opt.shade === 2 && sj < solutions.length; sj++) {
                        for (var pj = 0; pj < solutions[sj].pieces.length; pj++) fillSpan(pieceSpan(solutions[sj].pieces[pj]), heights[sj]);
                    }
                }

                // 이동 화살표(2>5:+3): 해보다 위에 한 줄씩(글자 자리만큼 띄워), 시작·끝 자리에 수직선부터 올라오는 점선, 글자는 화살표 가운데 위
                var moveBase = heights.length > 0 ? heights[heights.length - 1] + rise : Math.max(h, rise), guides = [];
                for (var mi = 0; mi < moves.length; mi++) {
                    var my = moveBase + mi * (rise + fontPt), mx0 = moves[mi].from * opt.unit, mx1 = moves[mi].to * opt.unit;   // 줄 사이에 글자 한 줄
                    if (mx0 === mx1) continue;
                    var md = mx1 > mx0 ? 1 : -1;
                    lines.push({ points: [[mx0, my], [mx1 - md * cut, my]], main: true });
                    heads.push({ tip: [mx1, my], dir: [md, 0] });
                    addGuide(mx0, my + fontPt * 0.5);
                    addGuide(mx1, my + fontPt * 0.5);
                    if (moves[mi].label) texts.push({ text: moves[mi].label, at: [(mx0 + mx1) / 2, my], dir: 1, clear: 0 });
                }
                for (var gi = 0; gi < guides.length; gi++) lines.push({ points: [[guides[gi][0], 0], [guides[gi][0], guides[gi][1]]], guide: true });

                // 대응(-2>-4:×2): 위 수직선의 점에서 아래 수직선의 점으로 화살표. 글자는 화살표 가운데 높이에서 수직선 가운데 쪽으로 비켜 놓는다
                var middle = (opt.min + opt.max) / 2 * opt.unit;
                for (var qi = 0; qi < pairs.length; qi++) {
                    var top = [pairs[qi].from * opt.unit, 0], bottom = [pairs[qi].to * opt.unit, -opt.pairGap];
                    dots.push({ at: top, open: false }, { at: bottom, open: false });
                    var dx = bottom[0] - top[0], dy = bottom[1] - top[1] + 2 * opt.dotRadius, len = Math.sqrt(dx * dx + dy * dy);
                    var ux = dx / len, uy = dy / len, tip = [bottom[0], bottom[1] + opt.dotRadius];
                    lines.push({ points: [[top[0], -opt.dotRadius], [tip[0] - ux * cut, tip[1] - uy * cut]] });
                    heads.push({ tip: tip, dir: [ux, uy] });
                    if (!pairs[qi].label) continue;
                    // 가로로만 비킨다: 글자 반 너비 + 틈 + 기운 화살표가 글자 반 높이 동안 옆으로 가는 만큼.
                    // 다른 화살표와 엇갈리면 그 화살표에서 먼 쪽(교과서 ×(-2) 그림), 아니면 수직선 가운데 쪽
                    var mid = (pairs[qi].from + pairs[qi].to) / 2, side = mid * opt.unit <= middle ? 1 : -1;
                    for (var qj = 0; qj < pairs.length; qj++) {
                        if (qj !== qi && (pairs[qj].from - pairs[qi].from) * (pairs[qj].to - pairs[qi].to) < 0) side = mid >= (pairs[qj].from + pairs[qj].to) / 2 ? 1 : -1;
                    }
                    var off = labelHalfWidth(pairs[qi].label, fontPt) + fontPt * 0.35 + fontPt * 0.5 * Math.abs(ux / uy);
                    texts.push({ text: pairs[qi].label, at: [(top[0] + tip[0]) / 2 + side * off, (top[1] + tip[1]) / 2], dir: 0, clear: 0 });
                }

                for (var p = 0; p < opt.points.length; p++) {
                    var point = opt.points[p];
                    var px = point.value * opt.unit;
                    dots.push({ at: [px, 0], open: false });
                    if (point.name) texts.push({ text: point.name, at: [px, 0], dir: 1, clear: opt.dotRadius });
                }
                return { lines: lines, dots: dots, texts: texts, fills: fills, heads: heads };

                // 조각 하나: 경계에 ●○, 그 위로 꺾어 올린 선. 끝이 없는 쪽은 수직선 끝까지(끝 화살촉을 켜면 촉). 이름은 선 가운데를 끊고 넣는다
                function solutionPiece(piece, y) {
                    var lowX = piece.lower ? piece.lower.value * opt.unit : left, highX = piece.upper ? piece.upper.value * opt.unit : right;
                    var start = piece.lower ? lowX : lowX + (ends ? cut : 0), end = piece.upper ? highX : highX - (ends ? cut : 0);
                    var rising = y > 0 ? opt.dotRadius : 0, half = piece.label ? labelHalfWidth(piece.label, fontPt) + fontPt * 0.25 : 0;
                    var cx = (lowX + highX) / 2, inline = piece.label && y > 0 && end - start > 2 * half + fontPt;
                    var first = [], second = [];
                    if (piece.lower && rising > 0) first.push([lowX, rising]);
                    first.push([start, y]);
                    if (inline) { first.push([cx - half, y]); second.push([cx + half, y]); }
                    (inline ? second : first).push([end, y]);
                    if (piece.upper && rising > 0) (inline ? second : first).push([highX, rising]);
                    lines.push({ points: first, main: true });
                    if (inline) lines.push({ points: second, main: true });
                    if (piece.label) texts.push({ text: piece.label, at: [cx, y], dir: inline ? 0 : 1, clear: 0 });
                    if (ends && !piece.lower) heads.push({ tip: [left, y], dir: [-1, 0] });
                    if (ends && !piece.upper) heads.push({ tip: [right, y], dir: [1, 0] });
                    if (piece.lower) dots.push({ at: [lowX, 0], open: !piece.lower.closed });
                    if (piece.upper) dots.push({ at: [highX, 0], open: !piece.upper.closed });
                }

                function pieceSpan(piece) {
                    return [piece.lower ? piece.lower.value * opt.unit : left, piece.upper ? piece.upper.value * opt.unit : right];
                }

                // 모든 해(조각들의 합)가 함께 덮는 구간들
                function commonSpans(list) {
                    var common = [[left, right]];
                    for (var c = 0; c < list.length; c++) {
                        var next = [];
                        for (var a = 0; a < common.length; a++) {
                            for (var b = 0; b < list[c].pieces.length; b++) {
                                var span = pieceSpan(list[c].pieces[b]), lo = Math.max(common[a][0], span[0]), hi = Math.min(common[a][1], span[1]);
                                if (hi > lo) next.push([lo, hi]);
                            }
                        }
                        common = next;
                    }
                    return common;
                }

                function fillSpan(span, y) {
                    fills.push({ points: [[span[0], 0], [span[1], 0], [span[1], y], [span[0], y]] });
                }

                function addGuide(x, y) {
                    for (var g = 0; g < guides.length; g++) {
                        if (Math.abs(guides[g][0] - x) < 1e-6) { guides[g][1] = Math.max(guides[g][1], y); return; }
                    }
                    guides.push([x, y]);
                }
            }

            // 눈금 글자 중 그 값에 놓인 것의 글자 (없으면 null)
            function tickLabelAt(list, value) {
                for (var i = 0; i < list.length; i++) if (Math.abs(list[i].value - value) < 1e-9) return list[i].text;
                return null;
            }

            // 글자 너비의 반(pt) 어림: 영문·숫자·기호는 0.55em, 그 밖(①, 한글, ×)은 1em
            function labelHalfWidth(text, fontPt) {
                var w = 0;
                for (var i = 0; i < text.length; i++) w += text.charCodeAt(i) < 128 ? 0.55 : 1;
                return w * fontPt / 2;
            }

            // 해 "x>3:①, x<=-1:② 또는 x>=5" → [{pieces: [{lower, upper, label}]}]. 쉼표로 해를, "또는"(or)으로 같은 높이의 조각을 나눈다.
            // 빈 글이면 [], 하나라도 못 읽으면 null
            function parseSolutions(text) {
                var items = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < items.length; i++) {
                    var pieces = items[i].split("또는").join("|").split(" or ").join("|").split("|"), list = [];
                    for (var j = 0; j < pieces.length; j++) {
                        var piece = pieces[j], colon = piece.indexOf(":"), label = "";
                        if (colon >= 0) { label = piece.substring(colon + 1).replace(/^\s+|\s+$/g, ""); piece = piece.substring(0, colon); }
                        if (piece.replace(/\s/g, "") === "") { if (label !== "" || pieces.length > 1) return null; continue; }
                        var bound = parseInequality(piece);
                        if (bound === null) return null;
                        list.push({ lower: bound.lower, upper: bound.upper, label: label });
                    }
                    if (list.length > 0) out.push({ pieces: list });
                }
                return out;
            }

            // "2>5:+3, -1>2" → [{from, to, label}] (이동 화살표·대응 화살표). 빈 글이면 [], 하나라도 못 읽으면 null
            function parseMoves(text) {
                var items = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i], colon = item.indexOf(":"), label = "";
                    if (colon >= 0) { label = item.substring(colon + 1).replace(/^\s+|\s+$/g, ""); item = item.substring(0, colon); }
                    if (item.replace(/\s/g, "") === "" && label === "") continue;
                    var gt = item.indexOf(">");
                    if (gt < 0) return null;
                    var from = evaluate(item.substring(0, gt)), to = evaluate(item.substring(gt + 1));
                    if (from === null || to === null) return null;
                    out.push({ from: from, to: to, label: label });
                }
                return out;
            }

            // 눈금 글자 "-2:-a, 2:a" → [{value, text}]. 빈 글이면 [], 하나라도 못 읽으면 null
            function parseTickLabels(text) {
                var items = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < items.length; i++) {
                    if (items[i].replace(/\s/g, "") === "") continue;
                    var colon = items[i].indexOf(":");
                    if (colon < 0) return null;
                    var value = evaluate(items[i].substring(0, colon)), label = items[i].substring(colon + 1).replace(/^\s+|\s+$/g, "");
                    if (value === null || label === "") return null;
                    out.push({ value: value, text: label });
                }
                return out;
            }

            // "A=-2.5, B=3/4, √2" → [{name, value}], 못 읽은 항목은 bad
            function parsePoints(text) {
                var list = [], bad = [];
                var parts = String(text).split(/[,，]/);
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/^\s+|\s+$/g, "");
                    if (part === "") continue;
                    var name = "", expression = part;
                    var eq = part.indexOf("=");
                    if (eq >= 0) {
                        name = part.substring(0, eq).replace(/\s/g, "");
                        expression = part.substring(eq + 1);
                    }
                    var value = evaluate(expression);
                    if (value === null) bad.push(part);
                    else list.push({ name: name, value: value });
                }
                return { list: list, bad: bad };
            }

            // "-1<x<=3", "x≥2", "2>x" → {lower:{value,closed}|null, upper:…}. 빈 칸은 해 없음, 못 읽으면 null.
            // 정규식으로 통째 맞추지 않는다: ExtendScript는 (.+?)가 든 패턴이 실패하면 멈춘다("y" 입력 시 일러 정지)
            function parseInequality(text) {
                var source = String(text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=").split("=<").join("<=").split("=>").join(">=");
                if (source === "") return { lower: null, upper: null };
                var at = -1;
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch >= "a" && ch <= "z") {
                        if (at >= 0) return null;
                        at = i;
                    }
                }
                if (at < 0) return null;
                var left = source.substring(0, at), right = source.substring(at + 1);
                if (left === "" && right === "") return null;
                var result = { lower: null, upper: null };
                if (left !== "") {
                    var leftOp = left.slice(-2) === "<=" || left.slice(-2) === ">=" ? left.slice(-2) : left.slice(-1);
                    if (leftOp !== "<" && leftOp !== ">" && leftOp !== "<=" && leftOp !== ">=") return null;
                    var leftValue = evaluate(left.substring(0, left.length - leftOp.length));
                    if (leftValue === null) return null;
                    var leftBound = { value: leftValue, closed: leftOp.length === 2 };
                    if (leftOp.charAt(0) === "<") result.lower = leftBound;
                    else result.upper = leftBound;
                }
                if (right !== "") {
                    var rightOp = right.substring(0, 2) === "<=" || right.substring(0, 2) === ">=" ? right.substring(0, 2) : right.charAt(0);
                    if (rightOp !== "<" && rightOp !== ">" && rightOp !== "<=" && rightOp !== ">=") return null;
                    var rightValue = evaluate(right.substring(rightOp.length));
                    if (rightValue === null) return null;
                    var rightBound = { value: rightValue, closed: rightOp.length === 2 };
                    if (rightOp.charAt(0) === "<") {
                        if (result.upper) return null;
                        result.upper = rightBound;
                    } else {
                        if (result.lower) return null;
                        result.lower = rightBound;
                    }
                }
                if (result.lower && result.upper && result.lower.value > result.upper.value) return null;
                return result;
            }

            // 숫자·분수·√·괄호·사칙연산만 계산한다 (eval을 쓰지 않는다). 못 읽으면 null
            function evaluate(text) {
                var s = String(text).replace(/\s/g, "").replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function expression() {
                    var value = term();
                    while (peek() === "+" || peek() === "-") {
                        var op = s.charAt(pos++);
                        var right = term();
                        value = op === "+" ? value + right : value - right;
                    }
                    return value;
                }
                function term() {
                    var value = unary();
                    while (peek() === "*" || peek() === "/" || peek() === "√" || peek() === "(") {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        var right = unary();
                        value = op === "/" ? value / right : value * right;   // 2√3, 2(1+√2)는 곱
                    }
                    return value;
                }
                function unary() {
                    if (peek() === "-") { pos++; return -unary(); }
                    if (peek() === "+") { pos++; return unary(); }
                    if (peek() === "√") { pos++; return Math.sqrt(unary()); }
                    if (peek() === "(") {
                        pos++;
                        var inner = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return inner;
                    }
                    var begin = pos;
                    var dots = 0;
                    while ((peek() >= "0" && peek() <= "9") || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var number = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
                    return number;
                }
                try {
                    if (s === "") return null;
                    var result = expression();
                    if (pos !== s.length || isNaN(result) || !isFinite(result)) return null;
                    return result;
                } catch (e) {
                    return null;
                }
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "graph") { SOLUTION_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "tick") return TICK_PT;
                if (group === "graph") return SOLUTION_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (p.length === 5 && p[0] === "v2") groups = ["axis", "graph", "guide", "tick"];   // 2026-10-14 잠시 쓴 5칸 v2 (수직선·좌표평면)
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addTextRow(parent, label, value, tip) {
                var row = parent.add("group");
                row.add("statictext", undefined, label).preferredSize.width = 60;
                var input = row.add("edittext", undefined, value);
                input.preferredSize.width = 280;
                input.helpTip = tip;
                return input;
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
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
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var parts = [
                    "v2", minValue, maxValue, unitMm, subdivisions, tickMm, solutionMm, fontPt,
                    showNumbers ? "1" : "0", encodeURIComponent(pointsText), encodeURIComponent(inequalityText),
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
                    numberStep, plusSign ? "1" : "0", arrowEnds ? "1" : "0", encodeURIComponent(axisName), encodeURIComponent(tickLabelText),
                    shadeMode, encodeURIComponent(moveText), encodeURIComponent(pairText)
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (!((p[0] === "v1" && p.length === 14) || (p[0] === "v2" && p.length === 22))) return;
                try {
                    var low = restoreNumber(p[1], minValue, -20, 19);
                    var high = restoreNumber(p[2], maxValue, -19, 20);
                    if (low < high) { minValue = Math.round(low); maxValue = Math.round(high); }
                    unitMm = restoreNumber(p[3], unitMm, 3, 40);
                    subdivisions = Math.round(restoreNumber(p[4], subdivisions, 1, 10));
                    tickMm = restoreNumber(p[5], tickMm, 0.5, 5);
                    solutionMm = restoreNumber(p[6], solutionMm, p[0] === "v1" ? 1 : 0, 15);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    showNumbers = p[8] === "1";
                    pointsText = decodeURIComponent(p[9]);
                    inequalityText = decodeURIComponent(p[10]);
                    offsetXmm = restoreNumber(p[11], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[12], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[13] === "1";
                    if (p[0] === "v2") {
                        numberStep = Math.round(restoreNumber(p[14], numberStep, 1, 10));
                        plusSign = p[15] === "1";
                        arrowEnds = p[16] === "1";
                        axisName = decodeURIComponent(p[17]);
                        tickLabelText = decodeURIComponent(p[18]);
                        shadeMode = Math.round(restoreNumber(p[19], shadeMode, 0, 2));
                        moveText = decodeURIComponent(p[20]);
                        pairText = decodeURIComponent(p[21]);
                    }
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 좌표평면 (원래 Object_CoordPlane.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 좌표평면: x축·y축(끝에 가늘고 뾰족한 화살촉, x·y·O), 격자, 정수 눈금과 숫자,
    // 함수 그래프 5개까지(y=2x+1, y=-x^2+4, y=6/x, y=√x, y=2^x, y=log_2 x, y=sin 2x, y=|x-1|), 점(A(2,3))과 두 축으로 내린 점선을 그린다.
    // 그래프 끝 이름은 식·㉠㉡㉢·(가)(나)(다) 중에서 고르고, 부등식(y<=-x+4, y>=0, x>=0)을 모두 만족하는 영역을 K로 칠한다.
    // 축 없이 모눈만 그릴 수도 있다(모눈종이 위 도형). 고등학교용: 가로축 π 단위 눈금, 점근선(x=1, y=2) 점선, y=x 점선, 두 그래프의 교점 A·B…
    // GSMediumB1에 없는 기호(π, √ …)는 HancomEQN으로 넣는다.
    // 선 두께는 평가원 수능 그림 측정값(축 약 0.36pt, 그래프 약 0.84pt)에 맞춘 과학 기준: 축·눈금 0.4pt, 그래프 0.8pt, 보조선 0.3pt.
    // 그래프는 함수값과 기울기로 만든 베지어(에르미트)라 적은 점으로 매끄럽고, 좌표 범위 밖은 잘라낸다.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    // 입력 파싱은 글자 단위로 한다: ExtendScript는 (.+?)가 든 정규식이 실패하면 멈추고, 등호로 시작하는 정규식은 문법 오류다.
    function makeCoordPlaneEngine() {
        var api = {label: "좌표평면", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "CoordPlane/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var FUNCTION_COUNT = 5;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 수학 기호(π, √, θ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var TICK_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var HATCH_MM = 1;   // 빗금 간격 (선은 보조선 굵기)
            var OPEN_DOT_PT = 0.5;   // 빈 점(○) 테두리 (구간별 함수 탭과 같다)
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };   // pt. 평가원 축 화살촉처럼 가늘고 뒤가 파인 모양
            registerHead(ARROW);
            var SYMBOL_FONT_NAME = "Batang";   // ㉠, (가) 같은 그래프 이름 (한글·영문 서체 적용 규칙: 바탕체, 한 단계 크게)
            var NAME_STYLES = ["없음", "식", "㉠ ㉡ ㉢", "(가) (나) (다)"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);
            var symbolFont = findTextFont([SYMBOL_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var xMin = -5, xMax = 5, yMin = -5, yMax = 5;
            var unitMm = 6;
            var fontPt = 8;
            var showGrid = false;
            var showNumbers = true;
            var functionTexts = ["y=2x+1", "", "", "", ""];
            var parameterA = 1, parameterB = 0, parameterC = 0;
            var parametricX = "", parametricY = "", parametricMin = "0", parametricMax = "2π";   // 매개변수곡선 x(t)·y(t)와 t 범위
            var pointsText = "";
            var showCoords = true;
            var showGuides = true;
            var nameStyle = 1;   // 그래프 끝 이름: 없음 · 식 · ㉠ · (가)
            var hideAxes = false;
            var xAxisName = "x", yAxisName = "y";   // 축 이름 (t, v(t), x(cm) 등)
            var arrowText = "";                     // 화살표 (0,1)>(1,1):+1, A>B, f1:3>1:x→1
            var axisMode = 0;                       // 축 모양: 0 두 축, 1 x축만(부등식 개형 그림), 2 축 없이 그래프만
            var xTick = 1, yTick = 1;               // 눈금 간격 (10이면 10, 20, 30 …). 격자도 같은 간격
            var regionText = "";
            var regionK = 15;
            var piAxis = false;
            var showIntersections = false;
            var showIdentity = false;
            var asymptoteText = "";
            var tangentText = "";   // 접선 1:2 = 1번 식의 x=2에서의 접선
            var regionHatch = false, regionHatch2 = false;   // 칠하기 대신 빗금 (첫째 45°, 둘째 -45°)
            var axisMarkText = "";   // 축 위 글자 x=1:a, y=2:k: 그 값에 눈금과 글자
            var lineDashes = [false, false, false, false, false];   // 식마다 그래프를 점선으로
            var nameTexts = ["", "", "", "", ""];   // 그래프마다 직접 쓰는 이름(l, C_1 …)
            var nameAts = [0, 0, 0, 0, 0];           // 이름 자리: 0 오른쪽 끝, 1 왼쪽 끝(바깥), 2 왼쪽 끝(안쪽)
            var lineText = "";                        // 실선 수직·수평선 x=2, y=-1
            var showLineNames = true;
            var labelText = "";                       // 자유 글자 A(0.4,1.5) B(2,3): 점·선 없이 글자만
            var segmentText = "";                     // 선분 O-P, P-Q (점 이름으로)
            var regionText2 = "";
            var regionK2 = 35;
            var showTicks = true;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unitMm: unitMm, fontPt: fontPt, regionK: regionK, regionK2: regionK2, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {axis: AXIS_PT, tick: TICK_PT, graph: GRAPH_PT, guide: GUIDE_PT, grid: GRID_PT};
            loadLineWidths();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var rangePanel = addPanel(win, "범위 · 눈금", "fold3");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -200, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 200, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -200, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 200, 1, 0);
            var xTickControls = addValueRow(rangePanel, "x 눈금 간격", "", xTick, 0.1, 50, 0.1, 1);
            var yTickControls = addValueRow(rangePanel, "y 눈금 간격", "", yTick, 0.1, 50, 0.1, 1);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 0.2, 20, 0.1, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var axisChecks = rangePanel.add("group");
            var gridCheck = axisChecks.add("checkbox", undefined, "격자");
            var numbersCheck = axisChecks.add("checkbox", undefined, "눈금 숫자");
            var piCheck = axisChecks.add("checkbox", undefined, "가로축 π 단위");
            piCheck.helpTip = "x 최솟값·최댓값을 π/2 단위로 본다 (4 → 2π). 눈금은 π/2, π, 3π/2 …";
            var hideAxesCheck = axisChecks.add("checkbox", undefined, "축 없이 모눈");
            hideAxesCheck.helpTip = "축·화살촉·눈금 숫자를 빼고 격자만 그린다 (모눈종이 위 도형, 격자점 위 꼭짓점)";
            var tickCheck = axisChecks.add("checkbox", undefined, "눈금선");
            tickCheck.helpTip = "축의 짧은 눈금선(눈금 숫자와 따로). 끄면 눈금선 없이 축만 그린다";
            var axisNameRow = rangePanel.add("group");
            axisNameRow.add("statictext", undefined, "축 모양:");
            var axisModeList = axisNameRow.add("dropdownlist", undefined, ["두 축", "x축만 (부등식 개형 그림)", "축 없이 그래프만"]);
            axisModeList.selection = axisMode;
            axisNameRow.add("statictext", undefined, "축 이름 x:");
            var xAxisNameInput = axisNameRow.add("edittext", undefined, xAxisName);
            xAxisNameInput.characters = 5;
            axisNameRow.add("statictext", undefined, "y:");
            var yAxisNameInput = axisNameRow.add("edittext", undefined, yAxisName);
            yAxisNameInput.characters = 5;
            xAxisNameInput.helpTip = "가로축 끝 글자: t, x(cm) 등. 비우면 쓰지 않는다";
            yAxisNameInput.helpTip = "세로축 끝 글자: v(t), s, f(x) 등. 비우면 쓰지 않는다";
            var axisMarkRow = rangePanel.add("group");
            axisMarkRow.add("statictext", undefined, "축 위 글자:");
            var axisMarkInput = axisMarkRow.add("edittext", undefined, axisMarkText);
            axisMarkInput.preferredSize.width = 250;
            axisMarkInput.helpTip = "축의 그 값에 눈금을 긋고 글자를 쓴다(x축은 아래, y축은 왼쪽). x=1:a, x=π/2:α, y=2:k처럼 쉼표로. 같은 자리의 눈금 숫자와 겹치면 '눈금 숫자'를 끈다";

            var functionPanel = addPanel(win, "함수 그래프");
            var functionInputs = [];
            for (var f = 0; f < FUNCTION_COUNT; f++) {
                var functionRow = functionPanel.add("group");
                functionRow.add("statictext", undefined, (f + 1) + ":").preferredSize.width = 20;
                var functionInput = functionRow.add("edittext", undefined, functionTexts[f]);
                functionInput.preferredSize.width = 320;
                functionInput.helpTip = "y=2x+1, y=-x^2+4, y=6/x, y=√x, y=2^x, y=log_2 x, y=ln x, y=sin 2x, y=|x-1|, y=e^x. a·b·c는 계수 패널에서 조절한다. ^는 거듭제곱, 곱셈 기호는 생략해도 된다. 식 뒤에 {0<=x<2}처럼 정의역을 쓰면 그 범위만 그리고 끝점에 ●(포함)·○(빠짐)";
                functionInputs.push(functionInput);
            }
            var paramPanel = addPanel(win, "계수 a·b·c", "foldParameters");
            var paramAControls = addValueRow(paramPanel, "a", "", parameterA, -10, 10, 0.1, 1);
            var paramBControls = addValueRow(paramPanel, "b", "", parameterB, -10, 10, 0.1, 1);
            var paramCControls = addValueRow(paramPanel, "c", "", parameterC, -10, 10, 0.1, 1);
            var curvePanel = addPanel(win, "매개변수곡선", "foldParametric");
            var curveXRow = curvePanel.add("group");
            curveXRow.add("statictext", undefined, "x(t):").preferredSize.width = 34;
            var curveXInput = curveXRow.add("edittext", undefined, parametricX);
            curveXInput.preferredSize.width = 300;
            curveXInput.helpTip = "t로 나타낸 x 좌표 (매개변수로 나타낸 곡선): 3cos(t). a·b·c 계수도 쓸 수 있다. x(t)·y(t)를 둘 다 써야 그린다";
            var curveYRow = curvePanel.add("group");
            curveYRow.add("statictext", undefined, "y(t):").preferredSize.width = 34;
            var curveYInput = curveYRow.add("edittext", undefined, parametricY);
            curveYInput.preferredSize.width = 300;
            curveYInput.helpTip = "t로 나타낸 y 좌표: 2sin(t)";
            var curveRangeRow = curvePanel.add("group");
            curveRangeRow.add("statictext", undefined, "t:").preferredSize.width = 34;
            var curveMinInput = curveRangeRow.add("edittext", undefined, parametricMin);
            curveMinInput.characters = 6;
            curveMinInput.helpTip = "t 시작값. π와 분수를 쓸 수 있다";
            curveRangeRow.add("statictext", undefined, "~");
            var curveMaxInput = curveRangeRow.add("edittext", undefined, parametricMax);
            curveMaxInput.characters = 6;
            curveMaxInput.helpTip = "t 끝값. 시작값보다 커야 한다";
            var functionChecks = functionPanel.add("group");
            functionChecks.add("statictext", undefined, "이름:");
            var nameList = functionChecks.add("dropdownlist", undefined, NAME_STYLES);
            nameList.selection = nameStyle;
            nameList.helpTip = "그래프 끝에 붙일 이름. ㉠·(가)는 식을 넣은 순서대로 붙는다";
            var intersectCheck = functionChecks.add("checkbox", undefined, "교점 A, B …");
            var identityCheck = functionChecks.add("checkbox", undefined, "y=x 점선");
            var asymptoteRow = functionPanel.add("group");
            asymptoteRow.add("statictext", undefined, "점근선:");
            var asymptoteInput = asymptoteRow.add("edittext", undefined, asymptoteText);
            asymptoteInput.preferredSize.width = 290;
            asymptoteInput.helpTip = "x=1, y=2처럼 쉼표로 나눈다 (x=π/2도 된다). 점선으로 그린다";
            var tangentRow = functionPanel.add("group");
            tangentRow.add("statictext", undefined, "접선:");
            var tangentInput = tangentRow.add("edittext", undefined, tangentText);
            tangentInput.preferredSize.width = 290;
            tangentInput.helpTip = "식 번호:x. 1:2는 1번 식의 x=2에서의 접선(그래프 굵기 직선, 접점에 점). 쉼표로 여러 개: 1:2, 2:-1/2";
            var arrowRow = functionPanel.add("group");
            arrowRow.add("statictext", undefined, "화살표:");
            var arrowInput = arrowRow.add("edittext", undefined, arrowText);
            arrowInput.preferredSize.width = 280;
            arrowInput.helpTip = "끝점>끝점(뒤에 :글자). 끝점은 (x,y)나 점 칸의 이름: 평행이동·증가량(+1, +2)·벡터. f1:3>1은 1번 그래프를 따라 x=3에서 x=1 쪽으로 다가가는 화살표. 쉼표로 여러 개";
            var lineRow = functionPanel.add("group");
            lineRow.add("statictext", undefined, "실선:");
            var lineInput = lineRow.add("edittext", undefined, lineText);
            lineInput.preferredSize.width = 200;
            lineInput.helpTip = "x=2, y=-1처럼 쉼표로 나눈다. 그래프와 같은 굵기의 실선 수직·수평선 (점근선은 점선)";
            var lineNamesCheck = lineRow.add("checkbox", undefined, "식 글자");
            lineNamesCheck.helpTip = "실선 옆에 그 식(x=2)을 쓴다";
            var regionRow = functionPanel.add("group");
            regionRow.add("statictext", undefined, "칠하기:");
            var regionInput = regionRow.add("edittext", undefined, regionText);
            regionInput.preferredSize.width = 290;
            regionInput.helpTip = "모두 만족하는 영역을 칠한다. y<=-x+4, y>=0, x>=0처럼 쉼표로 나눈다 (y 부등식은 식, x 부등식은 수). 두 직선과 축으로 둘러싸인 도형 등";
            var regionKControls = addValueRow(functionPanel, "칠하기 농도", "K", regionK, 5, 60, 5, 0);
            var hatchCheck = functionPanel.add("checkbox", undefined, "칠하기 대신 빗금 (45°)");
            hatchCheck.helpTip = "칠한 영역을 회색 대신 보조선 굵기의 빗금으로 채운다";
            var region2Row = functionPanel.add("group");
            region2Row.add("statictext", undefined, "둘째 칠하기:");
            var region2Input = region2Row.add("edittext", undefined, regionText2);
            region2Input.preferredSize.width = 250;
            region2Input.helpTip = "첫째와 따로 한 영역을 더 칠한다 (영역 A, B를 서로 다른 농도로). 쓰는 법은 칠하기와 같다";
            var regionK2Controls = addValueRow(functionPanel, "둘째 농도", "K", regionK2, 5, 60, 5, 0);
            var hatch2Check = functionPanel.add("checkbox", undefined, "둘째도 빗금 (-45°, 겹치면 엇갈림)");

            // 그래프 이름 직접 쓰기: 식을 넣은 그래프마다 이름과 자리 (비우면 위 '이름' 설정대로)
            var namePanel = addPanel(win, "그래프 이름 (직접 쓰기)", "fold4");
            var nameInputs = [], placeLists = [], dashChecks = [];
            var PLACE_NAMES = ["끝 (오른쪽)", "시작 (왼쪽 바깥)", "시작 (오른쪽 안쪽)"];
            for (var nf = 0; nf < FUNCTION_COUNT; nf++) {
                var nameRow = namePanel.add("group");
                nameRow.add("statictext", undefined, (nf + 1) + ":").preferredSize.width = 20;
                var nameInput = nameRow.add("edittext", undefined, nameTexts[nf]);
                nameInput.preferredSize.width = 150;
                nameInput.helpTip = "그래프 옆에 쓸 이름 (l, C_1, y=f(x) 등). 쓰면 '이름' 설정과 상관없이 붙는다. 한글은 곧게 쓴다";
                var placeList = nameRow.add("dropdownlist", undefined, PLACE_NAMES);
                placeList.selection = nameAts[nf];
                placeList.preferredSize.width = 150;
                var dashCheck = nameRow.add("checkbox", undefined, "점선");
                dashCheck.value = lineDashes[nf];
                dashCheck.helpTip = "이 그래프를 그래프 굵기의 점선으로 그린다";
                nameInputs.push(nameInput);
                placeLists.push(placeList);
                dashChecks.push(dashCheck);
            }

            var pointPanel = addPanel(win, "점");
            var pointsRow = pointPanel.add("group");
            pointsRow.add("statictext", undefined, "점:").preferredSize.width = 20;
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 320;
            pointsInput.helpTip = "A(2,3) B(-1,-2) P(1/2,√2). 이름 없이 (2,3)만 써도 된다. 좌표에 f(3)처럼 쓰면 1번 식(g는 2번, h는 3번)의 값을 계산해 넣는다: P(3,f(3)). 닫는 괄호 뒤에 o를 붙이면 속이 빈 점(○): A(1,2)o";
            var segmentRow = pointPanel.add("group");
            segmentRow.add("statictext", undefined, "선분:").preferredSize.width = 20;
            var segmentInput = segmentRow.add("edittext", undefined, segmentText);
            segmentInput.preferredSize.width = 320;
            segmentInput.helpTip = "점 이름으로 선분을 긋는다 (원점은 O). 쉼표로 여러 개: O-P, P-Q. 이름이 _로 시작하는 점은 점·이름 없이 선분·안내선의 기준으로만 쓴다";
            var labelRow = pointPanel.add("group");
            labelRow.add("statictext", undefined, "글자:").preferredSize.width = 20;
            var labelInput = labelRow.add("edittext", undefined, labelText);
            labelInput.preferredSize.width = 320;
            labelInput.helpTip = "점이나 점선 없이 그 자리 가운데에 글자만 쓴다: A(0.4,1.5) B(2,3). 좌표에 f(3)처럼 1번 식의 값을 쓸 수 있다 (g는 2번, h는 3번)";
            var pointChecks = pointPanel.add("group");
            var coordsCheck = pointChecks.add("checkbox", undefined, "좌표 함께 표시");
            var guidesCheck = pointChecks.add("checkbox", undefined, "축까지 점선");
            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "점에서 축까지 점선, 점근선, y=x. 이것들이 없으면 바뀌는 것이 없다";
            gridWidthControls.input.helpTip = "격자를 켰을 때의 회색 모눈선";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            gridCheck.value = showGrid;
            numbersCheck.value = showNumbers;
            hideAxesCheck.value = hideAxes;
            coordsCheck.value = showCoords;
            guidesCheck.value = showGuides;
            piCheck.value = piAxis;
            intersectCheck.value = showIntersections;
            identityCheck.value = showIdentity;
            tickCheck.value = showTicks;
            lineNamesCheck.value = showLineNames;

            bindValueRow(xMinControls, function(value) { xMin = value; }, initial.xMin);
            bindValueRow(xMaxControls, function(value) { xMax = value; }, initial.xMax);
            bindValueRow(yMinControls, function(value) { yMin = value; }, initial.yMin);
            bindValueRow(yMaxControls, function(value) { yMax = value; }, initial.yMax);
            bindValueRow(unitControls, function(value) { unitMm = value; }, initial.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            bindValueRow(paramAControls, function(value) { parameterA = value; }, 1);
            bindValueRow(paramBControls, function(value) { parameterB = value; }, 0);
            bindValueRow(paramCControls, function(value) { parameterC = value; }, 0);
            gridCheck.onClick = function() { showGrid = gridCheck.value; updatePreview(); };
            numbersCheck.onClick = function() { showNumbers = numbersCheck.value; updatePreview(); };
            nameList.onChange = function() { nameStyle = nameList.selection ? nameList.selection.index : 0; updatePreview(); };
            hideAxesCheck.onClick = function() { hideAxes = hideAxesCheck.value; updatePreview(); };
            axisModeList.onChange = function() { axisMode = axisModeList.selection ? axisModeList.selection.index : 0; updatePreview(); };
            xAxisNameInput.onChanging = function() { xAxisName = xAxisNameInput.text; updatePreview(); };
            yAxisNameInput.onChanging = function() { yAxisName = yAxisNameInput.text; updatePreview(); };
            bindValueRow(xTickControls, function(value) { xTick = value; }, 1);
            bindValueRow(yTickControls, function(value) { yTick = value; }, 1);
            regionInput.onChanging = function() { regionText = regionInput.text; updatePreview(); };
            bindValueRow(regionKControls, function(value) { regionK = value; }, initial.regionK);
            coordsCheck.onClick = function() { showCoords = coordsCheck.value; updatePreview(); };
            guidesCheck.onClick = function() { showGuides = guidesCheck.value; updatePreview(); };
            piCheck.onClick = function() { piAxis = piCheck.value; updatePreview(); };
            intersectCheck.onClick = function() { showIntersections = intersectCheck.value; updatePreview(); };
            identityCheck.onClick = function() { showIdentity = identityCheck.value; updatePreview(); };
            asymptoteInput.onChanging = function() { asymptoteText = asymptoteInput.text; updatePreview(); };
            tangentInput.onChanging = function() { tangentText = tangentInput.text; updatePreview(); };
            arrowInput.onChanging = function() { arrowText = arrowInput.text; updatePreview(); };
            tickCheck.onClick = function() { showTicks = tickCheck.value; updatePreview(); };
            lineInput.onChanging = function() { lineText = lineInput.text; updatePreview(); };
            lineNamesCheck.onClick = function() { showLineNames = lineNamesCheck.value; updatePreview(); };
            region2Input.onChanging = function() { regionText2 = region2Input.text; updatePreview(); };
            axisMarkInput.onChanging = function() { axisMarkText = axisMarkInput.text; updatePreview(); };
            hatchCheck.value = regionHatch;
            hatch2Check.value = regionHatch2;
            hatchCheck.onClick = function() { regionHatch = hatchCheck.value; updatePreview(); };
            hatch2Check.onClick = function() { regionHatch2 = hatch2Check.value; updatePreview(); };
            bindValueRow(regionK2Controls, function(value) { regionK2 = value; }, initial.regionK2);
            segmentInput.onChanging = function() { segmentText = segmentInput.text; updatePreview(); };
            labelInput.onChanging = function() { labelText = labelInput.text; updatePreview(); };
            curveXInput.onChanging = function() { parametricX = curveXInput.text; updatePreview(); };
            curveYInput.onChanging = function() { parametricY = curveYInput.text; updatePreview(); };
            curveMinInput.onChanging = function() { parametricMin = curveMinInput.text; updatePreview(); };
            curveMaxInput.onChanging = function() { parametricMax = curveMaxInput.text; updatePreview(); };
            for (var ni = 0; ni < FUNCTION_COUNT; ni++) bindNameRow(ni);
            for (var fi = 0; fi < FUNCTION_COUNT; fi++) bindFunctionInput(fi);
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function bindNameRow(index) {
                nameInputs[index].onChanging = function() { nameTexts[index] = nameInputs[index].text; updatePreview(); };
                placeLists[index].onChange = function() {
                    nameAts[index] = placeLists[index].selection ? placeLists[index].selection.index : 0;
                    updatePreview();
                };
                dashChecks[index].onClick = function() { lineDashes[index] = dashChecks[index].value; updatePreview(); };
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
                var functions = [], byIndex = [];
                var variables = {a: parameterA, b: parameterB, c: parameterC};
                for (var i = 0; i < FUNCTION_COUNT; i++) {
                    if (String(functionTexts[i]).replace(/\s/g, "") === "") continue;
                    // 식 뒤의 {0<=x<2}는 정의역: 범위 밖은 그리지 않고 끝점에 ●·○ (웹 math-coord-plane.js와 같다)
                    var braces = splitDomain(functionTexts[i]);
                    var domain = braces ? parseDomain(braces.domainText) : null;
                    var body = braces ? braces.body : functionTexts[i];
                    var compiled = braces && domain === null ? null : compileFunction(body, variables);
                    if (compiled === null) problems.push((i + 1) + "번 식");
                    else {
                        functions.push({ fn: domain ? restrict(compiled, domain) : compiled, raw: compiled, domain: domain, label: String(body).replace(/^\s+|\s+$/g, ""), name: String(nameTexts[i]).replace(/^\s+|\s+$/g, ""), at: nameAts[i], dashed: lineDashes[i] });
                        byIndex[i] = functions[functions.length - 1].fn;
                    }
                }
                // 접선: 식 번호와 x. 없는 식이거나 그 점에서 미분할 수 없으면 알린다 (웹 math-coord-plane.js와 같다)
                var tangents = [], tangentItems = parseTangents(tangentText);
                if (tangentItems === null) problems.push("접선");
                else {
                    for (var ti = 0; ti < tangentItems.length; ti++) {
                        var tfn = byIndex[tangentItems[ti].index];
                        if (!tfn || tangentSegment(tfn, tangentItems[ti].x, -1e9, 1e9, -1e9, 1e9) === null) problems.push("접선 " + (tangentItems[ti].index + 1) + ":" + tangentItems[ti].xText);
                        else tangents.push({fn: tfn, x: tangentItems[ti].x});
                    }
                }
                // 화살표: 점 이름은 점 칸의 점(이름이 _로 시작하는 숨은 점도), 그래프는 식 번호 (웹 math-coord-plane.js와 같다)
                var vectors = [], arrowItems = parseArrows(arrowText);
                // 점 이름 해석은 아래에서 점을 읽은 뒤에 한다
                // 점·글자 좌표 안의 f(3), g(1/2) 같은 함수값을 식의 값으로 바꾼다
                var values = functionValueTable(functionTexts, variables);
                var points = parsePointList(substituteFunctionValues(pointsText, values));
                if (points.bad.length > 0) problems.push("점 " + points.bad.join(", "));
                if (arrowItems === null) problems.push("화살표");
                else {
                    for (var ai = 0; ai < arrowItems.length; ai++) {
                        var ar = arrowItems[ai];
                        if (ar.kind === "graph") {
                            if (!byIndex[ar.index]) problems.push("화살표 " + ar.text);
                            else vectors.push({kind: "graph", fn: byIndex[ar.index], x0: ar.x0, x1: ar.x1, label: ar.label});
                            continue;
                        }
                        var ends = [ar.from, ar.to], found = [];
                        for (var ae = 0; ae < 2; ae++) {
                            if (ends[ae].name === undefined) { found.push(ends[ae]); continue; }
                            var hit = null;
                            for (var ap = 0; ap < points.list.length; ap++) if (points.list[ap].name === ends[ae].name) hit = {x: points.list[ap].x, y: points.list[ap].y};
                            found.push(hit);
                        }
                        if (found[0] === null || found[1] === null) problems.push("화살표 " + ar.text);
                        else vectors.push({kind: "line", from: found[0], to: found[1], label: ar.label});
                    }
                }
                var notes = parsePointList(substituteFunctionValues(labelText, values));
                if (notes.bad.length > 0) problems.push("글자 " + notes.bad.join(", "));
                var segments = parseSegments(segmentText, points.list);
                if (segments === null) problems.push("선분");
                var solidLines = parseSolidLines(lineText);
                if (solidLines === null) problems.push("실선");
                var region2 = parseRegion(regionText2);
                if (region2 === null) problems.push("둘째 칠하기");
                var asymptotes = parseAsymptotes(asymptoteText);
                if (asymptotes === null) problems.push("점근선");
                var region = parseRegion(regionText);
                if (region === null) problems.push("칠하기");
                var axisMarks = parseAxisMarks(axisMarkText);
                if (axisMarks === null) problems.push("축 위 글자");
                // 매개변수곡선: x(t)·y(t)가 둘 다 있어야 그린다 (웹 math-coord-plane.js readCoordPlaneInputs와 같다)
                var parametric = null;
                var px = String(parametricX).replace(/^\s+|\s+$/g, ""), py = String(parametricY).replace(/^\s+|\s+$/g, "");
                if (px !== "" || py !== "") {
                    var curveX = px === "" ? null : compileFunction(px, variables, true), curveY = py === "" ? null : compileFunction(py, variables, true);
                    var curveT0 = evaluateNumber(String(parametricMin).replace(/\s/g, "")), curveT1 = evaluateNumber(String(parametricMax).replace(/\s/g, ""));
                    if (curveX === null || curveY === null) problems.push("매개변수 식");
                    else if (curveT0 === null || curveT1 === null || !(curveT1 > curveT0)) problems.push("매개변수 범위");
                    else parametric = {fx: curveX, fy: curveY, t0: curveT0, t1: curveT1};
                }
                messageText.text = problems.length > 0 ? "읽지 못함: " + problems.join(" / ") : " ";

                var drawing = buildPlane({
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT,
                    xName: xAxisName, yName: yAxisName, axisMode: axisMode, xTick: xTick, yTick: yTick, vectors: vectors,
                    tick: TICK_MM * MM_TO_PT, grid: showGrid, numbers: showNumbers,
                    functions: functions, parametric: parametric, tangents: tangents, nameStyle: nameStyle, hideAxes: hideAxes, region: region || [],
                    points: points.list, coords: showCoords, guides: showGuides,
                    piAxis: piAxis, intersections: showIntersections, identity: showIdentity, asymptotes: asymptotes || [], fontSize: fontPt,
                    ticks: showTicks, solidLines: solidLines || [], lineNames: showLineNames, notes: notesWithNames(notes.list),
                    segments: segments || [], region2: region2 || [], axisMarks: axisMarks || []
                });

                previewGroup = layer.groupItems.add();
                previewGroup.name = "좌표평면";
                for (var j = 0; j < drawing.lines.length; j++) addPath(drawing.lines[j]);
                for (var k = 0; k < drawing.arrows.length; k++) addArrow(drawing.arrows[k]);
                for (var od = 0; od < drawing.openDots.length; od++) addOpenDot(drawing.openDots[od]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                // 칠한 영역은 격자보다 뒤로
                // 빗금을 고르면 칠하기 대신 평행선 (첫째 45°, 둘째 -45°)
                for (var r = 0; r < drawing.fills.length; r++) {
                    if (regionHatch) addHatch(drawing.fills[r], Math.PI / 4); else addFill(drawing.fills[r], regionK);
                }
                for (var r2 = 0; r2 < drawing.fills2.length; r2++) {
                    if (regionHatch2) addHatch(drawing.fills2[r2], -Math.PI / 4); else addFill(drawing.fills2[r2], regionK2);
                }
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"tick"|"graph"|"grid"|"guide"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
                path.setEntirePath(anchors);
                if (line.kind === "graph" || line.curved) {
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
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : (line.kind === "tick" ? TICK_PT : (line.kind === "grid" ? GRID_PT : GUIDE_PT)));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide" || line.dashed) path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 빗금: 영역 안의 평행선(보조선 굵기), 칠하기처럼 맨 뒤
            function addHatch(points, angle) {
                var pieces = hatchSegments(points, HATCH_MM * MM_TO_PT, angle);
                for (var h = pieces.length - 1; h >= 0; h--) {
                    var path = previewGroup.pathItems.add();
                    path.setEntirePath(pieces[h]);
                    path.closed = false;
                    path.filled = false;
                    path.stroked = true;
                    path.strokeColor = makeGray(100);
                    path.strokeWidth = GUIDE_PT;
                    path.strokeCap = StrokeCap.BUTTENDCAP;
                    path.zOrder(ZOrderMethod.SENDTOBACK);
                }
            }

            // 칠한 영역: 선 없는 닫힌 패스, K regionK, 맨 뒤
            function addFill(points, fillK) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(fillK);
                path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var shape = ARROW;
                var head = headShapeFor(arrow.tip, arrow.dir, shape);
                var path = previewGroup.pathItems.add();
                path.setEntirePath(head.points);
                path.closed = head.closed;
                paintHead(path, head.closed, makeGray(100));
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // 속이 빈 점(○): 흰 속에 OPEN_DOT_PT 테두리
            function addOpenDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(0);
                circle.stroked = true;
                circle.strokeColor = makeGray(100);
                circle.strokeWidth = OPEN_DOT_PT;
            }

            // at에서 dir 쪽으로 gap(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                // ㉠, (가): 글자 전체를 바탕체로 한 단계 크게
                if (label.symbol) {
                    attributes.textFont = symbolFont;
                    attributes.size = fontPt + 1;
                    attributes.baselineShift = 0;
                }
                if (label.sup) {
                    for (var s = 0; s < label.sup.length; s++) {
                        var character = frame.textRange.characters[label.sup[s]];
                        var supAttributes = character.characterAttributes;
                        supAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    }
                }
                if (label.sub) {
                    for (var u = 0; u < label.sub.length; u++) {
                        var subCharacter = frame.textRange.characters[label.sub[u]];
                        var subAttributes = subCharacter.characterAttributes;
                        subAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                    }
                }
                // sin·log 같은 함수 이름은 기울이지 않는다
                if (label.roman) {
                    for (var r = 0; r < label.roman.length; r++) {
                        var romanCharacter = frame.textRange.characters[label.roman[r]];
                        var romanAttributes = romanCharacter.characterAttributes;
                        romanAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 소문자 변수(x, y, f)는 GSMediItaC1. 점 이름·O(upright)는 기울이지 않는다.
            // GSMediumB1에 없는 기호(π, √, θ, − 같은 ASCII 밖 글자)는 HancomEQN
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
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
                // 가로축 π 단위면 최솟값·최댓값은 π/2의 몇 배
                var xStep = opt.piAxis ? Math.PI / 2 : 1;
                var xLo = opt.xMin * xStep, xHi = opt.xMax * xStep;
                // 축 끝 여유는 눈금 한 칸 기준 (눈금 간격이 10이면 여유도 10배)
                var xSpan = opt.xTick > 0 ? opt.xTick : 1, ySpan = opt.yTick > 0 ? opt.yTick : 1;
                var left = Math.min(xLo, 0) - 0.5 * xSpan, right = xHi + 0.8 * xSpan;
                // 그래프는 X축 화살촉 가장 왼쪽(뒤끝)까지 진행한다 (그림 제작 규칙 7.7)
                var plotHi = Math.max(xHi, right - (ARROW.rear || ARROW.length) / u);
                var bottom = Math.min(opt.yMin, 0) - 0.5 * ySpan, top = opt.yMax + 0.8 * ySpan;

                // 눈금 간격 xTick·yTick의 배수만 (k = 눈금 번호). 소수 간격의 부동소수점 오차는 10자리에서 자른다 (웹 math-coord-plane.js와 같다)
                var xTick = opt.xTick > 0 ? opt.xTick : 1, yTick = opt.yTick > 0 ? opt.yTick : 1;
                var stepsOf = function(lo, hi, step) {
                    var out = [];
                    for (var k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) out.push(Number((k * step).toFixed(10)));
                    return out;
                };
                var xs = stepsOf(opt.xMin, opt.xMax, xTick), ys = stepsOf(opt.yMin, opt.yMax, yTick);
                var axisMode = opt.axisMode || 0;
                // 축 없이 모눈: 격자(0 줄 포함)만
                if (opt.hideAxes) {
                    for (var hx = 0; hx < xs.length; hx++) lines.push(straight([[xs[hx] * xStep * u, opt.yMin * u], [xs[hx] * xStep * u, opt.yMax * u]], "grid"));
                    for (var hy = 0; hy < ys.length; hy++) lines.push(straight([[xLo * u, ys[hy] * u], [xHi * u, ys[hy] * u]], "grid"));
                } else if (opt.grid) {
                    for (var gx = 0; gx < xs.length; gx++) if (xs[gx] !== 0) lines.push(straight([[xs[gx] * xStep * u, opt.yMin * u], [xs[gx] * xStep * u, opt.yMax * u]], "grid"));
                    for (var gy = 0; gy < ys.length; gy++) if (ys[gy] !== 0) lines.push(straight([[xLo * u, ys[gy] * u], [xHi * u, ys[gy] * u]], "grid"));
                }

                // 축은 화살촉 뒤에서 끝낸다 (선 끝이 뾰족한 촉 밖으로 나오지 않게). 축 모양 1은 x축만, 2는 축 없음
                var axisName = function(name, at, dir) {
                    var d = formulaDisplay(String(name));
                    texts.push({ text: d.text, sup: d.sup, sub: d.sub, roman: d.roman, at: at, dir: dir, clear: 0 });
                };
                if (!opt.hideAxes && axisMode !== 2) {
                    lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                    arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                    if (opt.xName !== "") axisName(opt.xName === undefined ? "x" : opt.xName, [right * u, 0], [0, -1]);
                    if (axisMode !== 1) {
                        lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                        arrows.push({ tip: [0, top * u], dir: [0, 1] });
                        if (opt.yName !== "") axisName(opt.yName === undefined ? "y" : opt.yName, [0, top * u], [-1, 0]);
                        texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], clear: 0, upright: true });
                    }

                    for (var tx = 0; tx < xs.length; tx++) {
                        if (xs[tx] === 0) continue;
                        var tickX = xs[tx] * xStep * u;
                        if (opt.ticks !== false) lines.push(straight([[tickX, -opt.tick / 2], [tickX, opt.tick / 2]], "tick"));
                        if (opt.numbers) texts.push({ text: opt.piAxis ? piLabel(xs[tx]) : String(xs[tx]), at: [tickX, 0], dir: [0, -1], clear: opt.tick / 2 });
                    }
                    for (var ty = 0; axisMode !== 1 && ty < ys.length; ty++) {
                        if (ys[ty] === 0) continue;
                        if (opt.ticks !== false) lines.push(straight([[-opt.tick / 2, ys[ty] * u], [opt.tick / 2, ys[ty] * u]], "tick"));
                        if (opt.numbers) texts.push({ text: String(ys[ty]), at: [0, ys[ty] * u], dir: [-1, 0], clear: opt.tick / 2 });
                    }
                }
                // 축 위 글자: 그 값에 눈금, x축은 아래·y축은 왼쪽에 글자 (변수 a, α 등. 웹 math-coord-plane.js와 같다)
                var marks = opt.axisMarks || [];
                for (var am = 0; am < marks.length; am++) {
                    var onX = marks[am].axis === "x", markAt = onX ? [marks[am].value * u, 0] : [0, marks[am].value * u], markDisplay = formulaDisplay(marks[am].text);
                    lines.push(straight(onX ? [[markAt[0], -opt.tick / 2], [markAt[0], opt.tick / 2]] : [[-opt.tick / 2, markAt[1]], [opt.tick / 2, markAt[1]]], "tick"));
                    texts.push({ text: markDisplay.text, sup: markDisplay.sup, sub: markDisplay.sub, roman: markDisplay.roman, at: markAt, dir: onX ? [0, -1] : [-1, 0], clear: opt.tick / 2 });
                }

                for (var a = 0; a < opt.asymptotes.length; a++) {
                    var line = opt.asymptotes[a];
                    if (line.axis === "x") lines.push(straight([[line.value * u, opt.yMin * u], [line.value * u, opt.yMax * u]], "guide"));
                    else lines.push(straight([[xLo * u, line.value * u], [plotHi * u, line.value * u]], "guide"));
                }
                // 실선 수직·수평선: 그래프와 같은 굵기. 식 글자는 수직선은 위쪽 끝 오른쪽에, 수평선은 오른쪽 끝 위에
                var solid = opt.solidLines || [];
                for (var sl = 0; sl < solid.length; sl++) {
                    var solidLine = solid[sl];
                    var vertical = solidLine.axis === "x";
                    if (vertical) lines.push(straight([[solidLine.value * u, opt.yMin * u], [solidLine.value * u, opt.yMax * u]], "graph"));
                    else lines.push(straight([[xLo * u, solidLine.value * u], [plotHi * u, solidLine.value * u]], "graph"));
                    if (opt.lineNames) {
                        var lineDisplay = formulaDisplay(solidLine.text);
                        texts.push({ text: lineDisplay.text, sup: lineDisplay.sup, sub: lineDisplay.sub, roman: lineDisplay.roman,
                            at: vertical ? [solidLine.value * u, opt.yMax * u] : [plotHi * u, solidLine.value * u], dir: vertical ? [1, 0] : [0, 1], clear: 0 });
                    }
                }
                if (opt.identity) {
                    var lo = Math.max(xLo, opt.yMin), hi = Math.min(xHi, opt.yMax);
                    if (hi > lo) lines.push(straight([[lo * u, lo * u], [hi * u, hi * u]], "guide"));
                }

                // 매개변수곡선: 함수 그래프와 같은 굵기·상자(가로는 화살촉 뒤끝까지)
                if (opt.parametric) {
                    var curves = plotParametric(opt.parametric.fx, opt.parametric.fy, opt.parametric.t0, opt.parametric.t1, xLo, plotHi, opt.yMin, opt.yMax);
                    for (var pc = 0; pc < curves.length; pc++) lines.push({ points: toBezierCurve(curves[pc], u), kind: "graph" });
                }

                var formulaLabels = [];
                for (var f = 0; f < opt.functions.length; f++) {
                    var segments = plotFunction(opt.functions[f].fn, xLo, plotHi, opt.yMin, opt.yMax);
                    for (var s = 0; s < segments.length; s++) {
                        if (segments[s].length < 2) continue;
                        var graphLine = { points: toBezier(segments[s], u), kind: "graph" };
                        if (opt.functions[f].dashed) graphLine.dashed = true;   // 식마다 고른 점선
                        lines.push(graphLine);
                    }
                    var custom = opt.functions[f].name || "";
                    if ((opt.nameStyle > 0 || custom !== "") && segments.length > 0) {
                        // 놓는 자리: 0 오른쪽 끝(기본), 1·2 왼쪽 끝(바깥·안쪽)
                        var place = opt.functions[f].at || 0;
                        var lastSegment = segments[segments.length - 1];
                        var anchor = place === 0 ? lastSegment[lastSegment.length - 1] : segments[0][0];
                        var nameDir = place === 1 ? [-1, 0] : [1, 0];
                        if (custom !== "") {
                            // 직접 쓴 이름은 '이름' 설정과 상관없이 붙인다. 한글이 들면 곧게(이탤릭 없이) 쓴다
                            var own = formulaDisplay(custom), uprightAll = [];
                            if (hasHangul(custom)) for (var ri = 0; ri < own.text.length; ri++) uprightAll.push(ri);
                            formulaLabels.push({ text: own.text, sup: own.sup, sub: own.sub, roman: uprightAll.length ? uprightAll : own.roman, at: [anchor.x * u, anchor.y * u], dir: nameDir, clear: 0 });
                        } else if (opt.nameStyle === 1) {
                            var display = formulaDisplay(opt.functions[f].label);
                            formulaLabels.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: [anchor.x * u, anchor.y * u], dir: nameDir, clear: 0 });
                        } else {
                            formulaLabels.push({ text: graphSymbol(opt.nameStyle, f), symbol: true, at: [anchor.x * u, anchor.y * u], dir: nameDir, clear: 0 });
                        }
                    }
                }
                // 끝점이 가까운 식 글자는 위에서부터 한 줄 간격 이상 벌린다
                formulaLabels.sort(function(p, q) { return q.at[1] - p.at[1]; });
                var lineGap = (opt.fontSize || 8) * 1.3;
                for (var fl = 0; fl < formulaLabels.length; fl++) {
                    for (var prior = 0; prior < fl; prior++) {
                        var upper = formulaLabels[prior], lower = formulaLabels[fl];
                        if (Math.abs(upper.at[0] - lower.at[0]) < lineGap * 4 && upper.at[1] - lower.at[1] < lineGap) {
                            lower.at = [lower.at[0], upper.at[1] - lineGap];
                        }
                    }
                    texts.push(formulaLabels[fl]);
                }

                if (opt.intersections) {
                    var crossings = findIntersections(opt.functions, xLo, xHi, opt.yMin, opt.yMax);
                    for (var c = 0; c < crossings.length; c++) {
                        var cross = [crossings[c].x * u, crossings[c].y * u];
                        dots.push(cross);
                        texts.push({ text: String.fromCharCode(65 + c), at: cross, dir: [0.7071, 0.7071], clear: 0, upright: true });
                    }
                }

                // 접선: 그래프 굵기 직선(상자로 자름)과 접점
                var tangents = opt.tangents || [];
                for (var tg = 0; tg < tangents.length; tg++) {
                    var touch = tangentSegment(tangents[tg].fn, tangents[tg].x, xLo, plotHi, opt.yMin, opt.yMax);
                    if (touch === null) continue;
                    lines.push(straight([[touch[0][0] * u, touch[0][1] * u], [touch[1][0] * u, touch[1][1] * u]], "graph"));
                    var ty0 = tangents[tg].fn(tangents[tg].x);
                    if (tangents[tg].x >= xLo && tangents[tg].x <= plotHi && ty0 >= opt.yMin && ty0 <= opt.yMax) dots.push([tangents[tg].x * u, ty0 * u]);
                }

// 화살표: 축 굵기 선과 화살촉(선은 촉 속에서 끝난다). 직선은 가운데 옆(진행 방향의 위쪽)에 글자,
                // 그래프 화살표는 곡선에서 1.2 mm 위쪽으로 띄워 x0에서 x1 쪽으로 따라간다
                var vectors = opt.vectors || [], cut = ARROW.length - ARROW.notch;
                for (var vi = 0; vi < vectors.length; vi++) {
                    var vec = vectors[vi], vpts;
                    if (vec.kind === "graph") {
                        vpts = [];
                        var off = 1.2 * 2.834645669, n = 8;   // 짧은 호라 9개 앵커면 매끈하다 (그림 제작 규칙 3.10)
                        for (var vs = 0; vs <= n; vs++) {
                            var vx = vec.x0 + (vec.x1 - vec.x0) * vs / n, h = Math.abs(vec.x1 - vec.x0) * 1e-4 + 1e-9;
                            var vy = vec.fn(vx), slope = (vec.fn(vx + h) - vec.fn(vx - h)) / (2 * h);
                            if (typeof vy !== "number" || !isFinite(vy) || !isFinite(slope)) continue;
                            var nl = Math.sqrt(1 + slope * slope);
                            vpts.push([vx * u - slope / nl * off, vy * u + 1 / nl * off]);
                        }
                        if (vpts.length < 2) continue;
                    } else vpts = [[vec.from.x * u, vec.from.y * u], [vec.to.x * u, vec.to.y * u]];
                    var tip = vpts[vpts.length - 1], prev = vpts[vpts.length - 2];
                    var dl = Math.sqrt((tip[0] - prev[0]) * (tip[0] - prev[0]) + (tip[1] - prev[1]) * (tip[1] - prev[1])) || 1;
                    var vd = [(tip[0] - prev[0]) / dl, (tip[1] - prev[1]) / dl];
                    var shaft = vpts.slice(0, -1).concat([[tip[0] - vd[0] * cut, tip[1] - vd[1] * cut]]);
                    lines.push(vec.kind === "graph" ? { points: smoothBezier(shaft), kind: "axis", curved: true } : straight(shaft, "axis"));
                    arrows.push({ tip: tip, dir: vd });
                    if (vec.label) {
                        var a0 = vpts[0], mid = vpts[Math.floor(vpts.length / 2)];
                        if (vec.kind !== "graph") mid = [(a0[0] + tip[0]) / 2, (a0[1] + tip[1]) / 2];
                        var nd = [-vd[1], vd[0]];
                        if (nd[1] < 0 || (Math.abs(nd[1]) < 1e-9 && nd[0] < 0)) nd = [-nd[0], -nd[1]];
                        var vdisp = formulaDisplay(vec.label);
                        texts.push({ text: vdisp.text, sup: vdisp.sup, sub: vdisp.sub, roman: vdisp.roman, at: mid, dir: nd, clear: 0 });
                    }
                }

                // 정의역 끝점: 포함은 ●, 빠짐은 ○ (끝점이 그림 상자 안에 있을 때만)
                var openDots = [];
                for (var df = 0; df < opt.functions.length; df++) {
                    var dom = opt.functions[df].domain;
                    if (!dom) continue;
                    var ends = [[dom.lo, dom.loIn], [dom.hi, dom.hiIn]];
                    for (var de = 0; de < 2; de++) {
                        var ex = ends[de][0];
                        if (!isFinite(ex) || ex < xLo || ex > plotHi) continue;
                        var ey = opt.functions[df].raw(ex);
                        if (typeof ey !== "number" || !isFinite(ey) || ey < opt.yMin || ey > opt.yMax) continue;
                        (ends[de][1] ? dots : openDots).push([ex * u, ey * u]);
                    }
                }

                for (var p = 0; p < opt.points.length; p++) {
                    var point = opt.points[p];
                    var at = [point.x * u, point.y * u];
                    if (opt.guides) {
                        if (point.y !== 0) lines.push(straight([at, [at[0], 0]], "guide"));
                        if (point.x !== 0) lines.push(straight([at, [0, at[1]]], "guide"));
                    }
                    // 이름이 _로 시작하는 점은 점도 이름도 그리지 않고 선분·안내선의 기준으로만 쓴다
                    if (point.name.charAt(0) === "_") continue;
                    (point.open ? openDots : dots).push(at);
                    var name = point.name;
                    if (opt.coords) name += "(" + point.xText + ", " + point.yText + ")";
                    if (name) texts.push({ text: name, at: at, dir: [point.x < 0 ? -0.7071 : 0.7071, 0.7071], clear: 0, upright: true });
                }
                // 선분: 점 이름으로 이은 그래프 굵기 선
                var segs = opt.segments || [];
                for (var sg = 0; sg < segs.length; sg++) lines.push(straight([[segs[sg][0][0] * u, segs[sg][0][1] * u], [segs[sg][1][0] * u, segs[sg][1][1] * u]], "graph"));
                // 자유 글자: 그 자리 가운데에 글자만 (점·점선 없음)
                var notes = opt.notes || [];
                for (var nt = 0; nt < notes.length; nt++) texts.push({ text: notes[nt].name, at: [notes[nt].x * u, notes[nt].y * u], dir: [0, 0], clear: 0 });
                function regionFills(conditions) {
                    var out = [];
                    if (!conditions || conditions.length === 0) return out;
                    var polygons = regionPolygons(conditions, xLo, plotHi, opt.yMin, opt.yMax);
                    for (var rp = 0; rp < polygons.length; rp++) {
                        var scaled = [];
                        for (var rq = 0; rq < polygons[rp].length; rq++) scaled.push([polygons[rp][rq][0] * u, polygons[rp][rq][1] * u]);
                        out.push(scaled);
                    }
                    return out;
                }
                return { lines: lines, arrows: arrows, dots: dots, openDots: openDots, texts: texts, fills: regionFills(opt.region), fills2: regionFills(opt.region2) };
            }

            // 그래프 이름 기호: ㉠㉡㉢… (2) 또는 (가)(나)(다)… (3). index는 0부터
            function graphSymbol(style, index) {
                if (style === 2) return String.fromCharCode(0x3260 + index);
                return "(" + "가나다라마바사".charAt(index) + ")";
            }

            // 칠하기 조건 "y<=-x+4, y>=0, x>=0" → [{axis:"y"|"x", less:bool, fn 또는 value}]. 빈 글이면 [], 못 읽으면 null
            function parseRegion(text) {
                var list = [], parts = String(text).split(",");
                for (var i = 0; i < parts.length; i++) {
                    var piece = parts[i].replace(/\s/g, "").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/−/g, "-");
                    if (piece === "") continue;
                    var axis = piece.charAt(0);
                    if (axis !== "x" && axis !== "y") return null;
                    var rest = piece.substring(1), op = rest.charAt(0);
                    if (op !== "<" && op !== ">") return null;
                    var body = rest.substring(rest.charAt(1) === "=" ? 2 : 1);
                    if (body === "") return null;
                    var item = { axis: axis, less: op === "<" };
                    if (axis === "y") {
                        item.fn = compileFunction("y=" + body);
                        if (item.fn === null) return null;
                    } else {
                        item.value = evaluateNumber(body);
                        if (item.value === null) return null;
                    }
                    list.push(item);
                }
                return list;
            }

            // 조건을 모두 만족하는 영역을 [x0, x1]×[y0, y1] 안에서 닫힌 다각형(좌표 단위)들로. x를 촘촘히 나눠 위·아래 끝을 잇고,
            // 영역이 시작·끝나는 x는 이분법으로 맞춘다. 한 줄에 놓인 점은 지워 직선 경계는 두 점만 남긴다
            function regionPolygons(conditions, x0, x1, y0, y1) {
                var lo = x0, hi = x1, i;
                for (i = 0; i < conditions.length; i++) {
                    if (conditions[i].axis !== "x") continue;
                    if (conditions[i].less) hi = Math.min(hi, conditions[i].value);
                    else lo = Math.max(lo, conditions[i].value);
                }
                if (hi - lo < 1e-9) return [];
                function bounds(x) {
                    var bottom = y0, top = y1;
                    for (var k = 0; k < conditions.length; k++) {
                        var c = conditions[k];
                        if (c.axis !== "y") continue;
                        var y;
                        try { y = c.fn(x); } catch (e) { return null; }
                        if (typeof y !== "number" || !isFinite(y)) return null;
                        if (c.less) top = Math.min(top, y);
                        else bottom = Math.max(bottom, y);
                    }
                    return top - bottom > 1e-9 ? [bottom, top] : null;
                }
                function edge(inside, outside) {
                    for (var t = 0; t < 50; t++) {
                        var mid = (inside + outside) / 2;
                        if (bounds(mid) !== null) inside = mid;
                        else outside = mid;
                    }
                    return inside;
                }
                var N = 400, polygons = [], run = null, prevX = lo, prevIn = false;
                for (i = 0; i <= N; i++) {
                    var x = lo + (hi - lo) * i / N, b = bounds(x);
                    if (b !== null) {
                        if (run === null) {
                            run = [];
                            if (i > 0 && !prevIn) {
                                var start = edge(x, prevX), sb = bounds(start);
                                if (sb !== null) run.push([start, sb]);
                            }
                        }
                        run.push([x, b]);
                    } else if (run !== null) {
                        var stop = edge(prevX, x), eb = bounds(stop);
                        if (eb !== null) run.push([stop, eb]);
                        polygons.push(closeRun(run));
                        run = null;
                    }
                    prevX = x;
                    prevIn = b !== null;
                }
                if (run !== null) polygons.push(closeRun(run));
                return polygons;

                function closeRun(samples) {
                    var upper = [], lower = [];
                    for (var s = 0; s < samples.length; s++) {
                        upper.push([samples[s][0], samples[s][1][1]]);
                        lower.push([samples[s][0], samples[s][1][0]]);
                    }
                    lower.reverse();
                    // 위·아래 경계가 한 점에서 만나는 끝(꼭짓점)은 한 번만 넣는다. 두 번 넣으면 dropCollinear가 둘 다 지워 꼭짓점이 사라진다
                    if (samples[0][1][1] - samples[0][1][0] < 1e-6) lower.pop();
                    if (samples.length > 1 && samples[samples.length - 1][1][1] - samples[samples.length - 1][1][0] < 1e-6) lower.shift();
                    return dropCollinear(upper.concat(lower));
                }
            }

            // 앞뒤 점을 잇는 직선에서 거의 벗어나지 않는 점을 지운다 (닫힌 다각형)
            function dropCollinear(points) {
                var kept = [];
                for (var i = 0; i < points.length; i++) {
                    var prev = kept.length > 0 ? kept[kept.length - 1] : points[points.length - 1];
                    var here = points[i], next = points[(i + 1) % points.length];
                    var dx = next[0] - prev[0], dy = next[1] - prev[1], length = Math.sqrt(dx * dx + dy * dy);
                    if (length < 1e-12) { if (Math.abs(here[0] - prev[0]) + Math.abs(here[1] - prev[1]) > 1e-9) kept.push(here); continue; }
                    var off = Math.abs((here[0] - prev[0]) * dy - (here[1] - prev[1]) * dx) / length;
                    if (off > 1e-6) kept.push(here);
                }
                return kept;
            }

            // π/2의 k배 눈금 글자: π/2, π, 3π/2, 2π, -π/2 …
            function piLabel(k) {
                var sign = k < 0 ? "-" : "", n = Math.abs(k);
                if (n % 2 === 0) return sign + (n === 2 ? "" : String(n / 2)) + "π";
                return sign + (n === 1 ? "" : String(n)) + "π/2";
            }

            // 두 그래프가 만나는 점 (범위 안, x 순서). 부호가 바뀌는 곳을 이분법으로 찾는다 (접하기만 하는 점은 못 찾는다)
            function findIntersections(functions, x0, x1, y0, y1) {
                var found = [], N = 800;
                function value(fn, x) {
                    var y;
                    try { y = fn(x); } catch (e) { return NaN; }
                    return (typeof y === "number" && isFinite(y)) ? y : NaN;
                }
                function add(fn, x) {
                    var y = value(fn, x);
                    if (isNaN(y) || y < y0 - 1e-9 || y > y1 + 1e-9) return;
                    for (var k = 0; k < found.length; k++) if (Math.abs(found[k].x - x) < (x1 - x0) * 1e-6) return;
                    found.push({ x: x, y: y });
                }
                for (var i = 0; i < functions.length; i++) {
                    for (var j = i + 1; j < functions.length; j++) {
                        var f = functions[i].fn, g = functions[j].fn;
                        var diff = function(x) { return value(f, x) - value(g, x); };
                        var prevX = x0, prev = diff(x0);
                        if (prev === 0) add(f, x0);
                        for (var s = 1; s <= N; s++) {
                            var x = x0 + (x1 - x0) * s / N, d = diff(x);
                            if (d === 0) add(f, x);
                            else if (!isNaN(prev) && !isNaN(d) && prev * d < 0) {
                                var a = prevX, b = x, da = prev;
                                for (var t = 0; t < 60; t++) {
                                    var m = (a + b) / 2, dm = diff(m);
                                    if (isNaN(dm)) break;
                                    if (da * dm <= 0) b = m;
                                    else { a = m; da = dm; }
                                }
                                var root = (a + b) / 2;
                                // 불연속(tan, 1/x)에서 부호만 바뀐 곳은 교점이 아니다
                                if (Math.abs(diff(root)) < 1e-6 * (1 + Math.abs(value(f, root)))) add(f, root);
                            }
                            prevX = x;
                            prev = d;
                        }
                    }
                }
                found.sort(function(p, q) { return p.x - q.x; });
                return found;
            }

            // "x=1, y=2" → [{axis, value}]. 빈 칸은 [], 못 읽으면 null
            // 1번~5번 식의 함수값표: f·f1=1번, g·f2=2번, h·f3=3번, f4, f5. 읽지 못한 칸은 null
            function functionValueTable(functionTexts, variables) {
                var table = {}, names = [["f", "f1"], ["g", "f2"], ["h", "f3"], ["f4"], ["f5"]];
                for (var i = 0; i < names.length; i++) {
                    var text = (functionTexts || [])[i] || "";
                    // 식 뒤의 정의역 {…}은 떼고, 범위 밖 값은 NaN(못 계산)
                    var braces = splitDomain(text), domain = braces ? parseDomain(braces.domainText) : null;
                    var fn = text.replace(/\s/g, "") === "" || (braces && domain === null) ? null : compileFunction(braces ? braces.body : text, variables);
                    if (fn !== null && domain !== null) fn = restrict(fn, domain);
                    for (var k = 0; k < names[i].length; k++) table[names[i][k]] = fn;
                }
                return table;
            }

            // 점·글자 입력 안의 f(3), g(1/2) 같은 함수값을 숫자로 바꾼다. 못 계산하면(없는 식, 정의역 밖) 그대로 두어 읽기 오류로 보이게 한다
            function substituteFunctionValues(text, table) {
                return String(text).replace(/\b(f[1-5]?|g|h)\(([^()]*)\)/g, function(whole, name, arg) {
                    var fn = table[name];
                    if (!fn) return whole;
                    var x = evaluateNumber(arg);
                    if (x === null) return whole;
                    var y;
                    try { y = fn(x); } catch (e) { return whole; }
                    if (typeof y !== "number" || !isFinite(y)) return whole;
                    return String(Math.round(y * 10000) / 10000);
                });
            }

            // 실선 수직·수평선 "x=2, y=-1" → [{axis, value, text}] (text는 식 글자로 쓸 원래 글). 빈 글이면 [], 못 읽으면 null
            function parseSolidLines(text) {
                var parts = String(text).split(","), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    var axis = part.charAt(0);
                    if ((axis !== "x" && axis !== "y") || part.charAt(1) !== "=") return null;
                    var value = evaluateNumber(part.substring(2));
                    if (value === null) return null;
                    list.push({ axis: axis, value: value, text: part });
                }
                return list;
            }

            // 선분 "O-P, P-Q" → [[[x, y], [x, y]], …]. 점 이름은 점 목록의 이름(원점은 O). 모르는 이름이면 null
            function parseSegments(text, points) {
                var table = { O: [0, 0] }, i;
                for (i = 0; i < points.length; i++) if (points[i].name) table[points[i].name] = [points[i].x, points[i].y];
                var parts = String(text).split(","), list = [];
                for (i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "").split("–").join("-").split("−").join("-");
                    if (part === "") continue;
                    var ends = part.split("-");
                    if (ends.length !== 2 || !table[ends[0]] || !table[ends[1]]) return null;
                    list.push([table[ends[0]], table[ends[1]]]);
                }
                return list;
            }

            function hasHangul(text) {
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    if (code >= 0xAC00 && code <= 0xD7A3) return true;
                }
                return false;
            }

            // 자유 글자 목록에서 이름이 있는 것만
            function notesWithNames(list) {
                var out = [];
                for (var i = 0; i < list.length; i++) if (list[i].name !== "") out.push(list[i]);
                return out;
            }

            function parseAsymptotes(text) {
                var parts = String(text).split(","), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    var axis = part.charAt(0);
                    if ((axis !== "x" && axis !== "y") || part.charAt(1) !== "=") return null;
                    var value = evaluateNumber(part.substring(2));
                    if (value === null) return null;
                    list.push({ axis: axis, value: value });
                }
                return list;
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

            // 매개변수곡선 (x(t), y(t)), t0 ≤ t ≤ t1을 [x0,x1]×[y0,y1] 안에서 그린다. plotFunction과 같은 방식이다(적응 분할 →
            // 에르미트로 빼도 되는 점 지우기, 그림 제작 규칙 3.10). 점마다 접선 (dx/dt, dy/dt)을 두고, 상자 밖·정의되지 않는 곳·
            // 상자 안에서 건너뛰는 곳(불연속)에서 끊는다. 점: {t, x, y, dx, dy}
            function plotParametric(fx, fy, t0, t1, x0, x1, y0, y1) {
                var TOLERANCE = 0.004, MAX_DEPTH = 12, PIECES = 64, LIMIT = 4000;
                var mx = (x1 - x0) * 1e-9, my = (y1 - y0) * 1e-9;
                var jump = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) / 50;
                var segments = [], current = null, count = 0;

                function value(t) {
                    var x, y;
                    try { x = fx(t); y = fy(t); } catch (e) { return null; }
                    return (typeof x === "number" && isFinite(x) && typeof y === "number" && isFinite(y)) ? [x, y] : null;
                }
                function inside(t) {
                    var p = value(t);
                    return p !== null && p[0] >= x0 - mx && p[0] <= x1 + mx && p[1] >= y0 - my && p[1] <= y1 + my;
                }
                function slope(t) {
                    var h = 1e-5 * (1 + Math.abs(t)), a = value(t - h), b = value(t + h), c = value(t);
                    if (a !== null && b !== null) return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)];
                    if (b !== null && c !== null) return [(b[0] - c[0]) / h, (b[1] - c[1]) / h];
                    if (a !== null && c !== null) return [(c[0] - a[0]) / h, (c[1] - a[1]) / h];
                    return [0, 0];
                }
                function emit(t) {
                    if (current === null) {
                        current = [];
                        segments.push(current);
                    }
                    if (count++ > LIMIT) return;
                    var p = value(t), d = slope(t);
                    current.push({ t: t, x: Math.min(x1, Math.max(x0, p[0])), y: Math.min(y1, Math.max(y0, p[1])), dx: d[0], dy: d[1] });
                }
                function finish() { current = null; }
                function edge(inT, outT) {
                    for (var i = 0; i < 40; i++) {
                        var mid = (inT + outT) / 2;
                        if (inside(mid)) inT = mid;
                        else outT = mid;
                    }
                    return inT;
                }
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
                    var h = b - a, pa = value(a), pb = value(b), pm = value(mid), da = slope(a), db = slope(b);
                    var gx = (pa[0] + pb[0]) / 2 + h * (da[0] - db[0]) / 8 - pm[0], gy = (pa[1] + pb[1]) / 2 + h * (da[1] - db[1]) / 8 - pm[1];
                    if (depth < MAX_DEPTH && Math.sqrt(gx * gx + gy * gy) > TOLERANCE) {
                        refine(a, mid, depth + 1);
                        refine(mid, b, depth + 1);
                    } else if (depth >= MAX_DEPTH && Math.sqrt((pb[0] - pa[0]) * (pb[0] - pa[0]) + (pb[1] - pa[1]) * (pb[1] - pa[1])) > jump) {
                        finish();   // 아주 짧은 t 사이에서 크게 건너뛴다: 상자 안의 불연속
                        emit(b);
                    } else {
                        emit(b);
                    }
                }

                for (var i = 0; i < PIECES; i++) {
                    var a = t0 + (t1 - t0) * i / PIECES, b = t0 + (t1 - t0) * (i + 1) / PIECES;
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
                    } else {
                        finish();
                    }
                }
                var out = [];
                for (var k = 0; k < segments.length; k++) if (segments[k].length > 1) out.push(simplify(segments[k]));
                return out;

                // 빼도 앞뒤 점의 에르미트 곡선이 곡선에서 벗어나지 않는 점은 지운다 (직선은 두 점만 남는다)
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
                    var h = q.t - p.t;
                    for (var j = 1; j < 8; j++) {
                        var s = j / 8, actual = value(p.t + h * s);
                        if (actual === null || !inside(p.t + h * s)) return false;
                        var s2 = s * s, s3 = s2 * s;
                        var h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
                        var ex = h00 * p.x + h10 * h * p.dx + h01 * q.x + h11 * h * q.dx - actual[0];
                        var ey = h00 * p.y + h10 * h * p.dy + h01 * q.y + h11 * h * q.dy - actual[1];
                        if (Math.sqrt(ex * ex + ey * ey) > TOLERANCE) return false;
                    }
                    return true;
                }
            }

            // 매개변수곡선 점 → 베지어: 핸들 = 이웃까지 t 간격의 1/3만큼 접선 (dx/dt, dy/dt) 방향
            function toBezierCurve(points, unit) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    var anchor = [p.x * unit, p.y * unit];
                    var left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (p.t - points[i - 1].t) / 3;
                        left = [(p.x - p.dx * hl) * unit, (p.y - p.dy * hl) * unit];
                    }
                    if (i < points.length - 1) {
                        var hr = (points[i + 1].t - p.t) / 3;
                        right = [(p.x + p.dx * hr) * unit, (p.y + p.dy * hr) * unit];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
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

            // 식 표시: ^와 *는 빼고 ^ 다음은 위첨자, _ 다음은 아래첨자(log_2 → log₂). sin·cos·tan·log·ln은 똑바로(roman),
            // 그 뒤에 괄호·첨자가 없으면 한 칸 띄운다 (sin x). pi는 π
            function formulaDisplay(text) {
                var source = String(text).replace(/\s/g, "").split("pi").join("π");
                var FUNCS = ["arcsin", "arccos", "arctan", "sqrt", "sin", "cos", "tan", "sec", "log", "ln"];
                var out = "", sup = [], sub = [], roman = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) {
                                marks.push(out.length);
                                out += source.charAt(j);
                            }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                                marks.push(out.length);
                                out += source.charAt(++i);
                            }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    var name = null;
                    for (var k = 0; k < FUNCS.length; k++) if (source.substr(i, FUNCS[k].length) === FUNCS[k]) { name = FUNCS[k]; break; }
                    if (name) {
                        for (var n = 0; n < name.length; n++) {
                            roman.push(out.length);
                            out += name.charAt(n);
                        }
                        i += name.length - 1;
                        var after = source.charAt(i + 1);
                        if (after !== "" && after !== "(" && after !== "_" && after !== "^") out += " ";
                        continue;
                    }
                    out += ch;
                }
                return { text: out, sup: sup, sub: sub, roman: roman };
            }

            // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null.
            // 2x, 1/2x(=½x), x^2, √x, |x-1|, 2^x, e^x, π(pi), sin 2x, cos(x+1), tan x, log_2 x, log x(밑 10), ln x
            // parameter가 참이면 t를 변수로 읽는다(매개변수곡선 x(t)·y(t)). 함수의 인자 자리에 t가 들어간다
            function compileFunction(text, variables, parameter) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["arcsin", "arccos", "arctan", "sqrt", "sin", "cos", "tan", "sec", "log", "ln", "pi", "e", "x"];
                if (variables) NAMES = NAMES.concat(["a", "b", "c"]);
                if (parameter) {
                    // x 대신 t. tan·sqrt가 먼저 맞도록 맨 뒤에 (웹 math-function.js와 같은 ES3 코드)
                    var named = [];
                    for (var n = 0; n < NAMES.length; n++) if (NAMES[n] !== "x") named.push(NAMES[n]);
                    NAMES = named.concat(["t"]);
                }
                var FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan, sec: function(v) { return 1 / Math.cos(v); } };
                var pos = 0, absDepth = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function nameAt() {
                    for (var i = 0; i < NAMES.length; i++) if (s.substr(pos, NAMES[i].length) === NAMES[i]) return NAMES[i];
                    return null;
                }
                // 곱셈 기호 없이 이어지는 인수의 시작 (2x, 2√3, 2(x+1), 2sin x, 2|x|)
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || nameAt() !== null || (ch === "|" && absDepth === 0);
                }
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
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        else op = "*";
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
                // 함수 인수: 괄호면 그 괄호, 아니면 곱셈으로 이어진 인수들 (sin 2x = sin(2x), 다음 함수 이름 앞에서 끝)
                function argument() {
                    if (peek() === "(") return primary();
                    var node = power();
                    while (startsFactor() && peek() !== "(" && !isFunctionName(nameAt())) node = binary("*", node, power());
                    return node;
                }
                function isFunctionName(name) { return Object.prototype.hasOwnProperty.call(FUNCS, name) || name === "log" || name === "ln"; }
                function primary() {
                    var ch = peek();
                    if (ch === "|") {
                        pos++;
                        absDepth++;
                        var inside = expression();
                        if (peek() !== "|") throw new Error("abs");
                        pos++;
                        absDepth--;
                        return function(x) { return Math.abs(inside(x)); };
                    }
                    var name = nameAt();
                    if (name !== null) {
                        pos += name.length;
                        if (name === (parameter ? "t" : "x")) return function(x) { return x; };
                        if (variables && (name === "a" || name === "b" || name === "c")) { var value = variables[name]; return function() { return value; }; }
                        if (name === "pi") return function() { return Math.PI; };
                        if (name === "e") return function() { return Math.E; };
                        if (name === "log") {
                            var base = function() { return 10; };
                            if (peek() === "_") { pos++; base = primary(); }
                            var logArg = argument();
                            return function(x) { return Math.log(logArg(x)) / Math.log(base(x)); };
                        }
                        var arg = argument();
                        if (name === "ln") return function(x) { return Math.log(arg(x)); };
                        var fn = FUNCS[name];
                        return function(x) { return fn(arg(x)); };
                    }
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
            // 식 뒤의 정의역 글을 뗀다: "y=x^2 {0<=x<2}" → {body: "y=x^2 ", domainText: "0<=x<2"}. 중괄호가 없으면 null,
            // 닫는 괄호가 없거나 뒤에 글이 더 있으면 domainText가 null (일러 ExtendScript가 멈추지 않게 정규식 match 없이 읽는다)
            function splitDomain(text) {
                var s = String(text), open = s.indexOf("\u007B"), close = s.lastIndexOf("\u007D");
                if (open < 0) return null;
                if (close < open || s.substring(close + 1).replace(/\s/g, "") !== "") return { body: s.substring(0, open), domainText: null };
                return { body: s.substring(0, open), domainText: s.substring(open + 1, close) };
            }

            // 정의역 "0<=x<2", "-1<x≤3", "x>=1", "x<5" → {lo, loIn, hi, hiIn} (없는 쪽은 ±Infinity). 못 읽거나 비면 null
            function parseDomain(text) {
                if (text === null) return null;
                var s = String(text).replace(/\s/g, "").split("\u2264").join("<=").split("\u2265").join(">=");
                var at = s.indexOf("x");
                if (at < 0 || s.indexOf("x", at + 1) >= 0) return null;
                var left = s.substring(0, at), right = s.substring(at + 1), ops = ["<=", ">=", "<", ">"];
                if (left === "" && right === "") return null;
                var d = { lo: -Infinity, loIn: false, hi: Infinity, hiIn: false };
                // 수와 부등호. numberOnLeft면 "0<=" 꼴(수가 x 왼쪽), 아니면 "<2" 꼴
                function bound(part, numberOnLeft) {
                    for (var i = 0; i < ops.length; i++) {
                        var op = ops[i], hit = numberOnLeft ? part.length > op.length && part.substring(part.length - op.length) === op : part.indexOf(op) === 0;
                        if (!hit) continue;
                        var numText = numberOnLeft ? part.substring(0, part.length - op.length) : part.substring(op.length);
                        if (/[<>=]/.test(numText)) return false;
                        var v = evaluateNumber(numText);
                        if (v === null) return false;
                        var lower = numberOnLeft ? op.charAt(0) === "<" : op.charAt(0) === ">";
                        if (lower) { d.lo = v; d.loIn = op.length === 2; } else { d.hi = v; d.hiIn = op.length === 2; }
                        return true;
                    }
                    return false;
                }
                if (left !== "" && !bound(left, true)) return null;
                if (right !== "" && !bound(right, false)) return null;
                return d.lo < d.hi ? d : null;
            }

            // 정의역 밖에서는 NaN을 돌려주는 함수 (그래프·교점·함수값이 범위를 따른다)
            function restrict(fn, d) {
                return function(x) {
                    if (x < d.lo || x > d.hi) return NaN;
                    return fn(x);
                };
            }

            // 접선 "1:2, 2:-1/2" → [{index(0부터), x, xText}]. 비면 []. 식 번호(1~5)나 x를 못 읽으면 null
            function parseTangents(text) {
                var parts = String(text).split(";").join(",").split(","), out = [];
                for (var i = 0; i < parts.length; i++) {
                    var item = parts[i].replace(/\s/g, "");
                    if (item === "") continue;
                    var colon = item.indexOf(":");
                    if (colon < 0) return null;
                    var index = parseInt(item.substring(0, colon), 10), xText = item.substring(colon + 1);
                    var x = xText === "" ? null : evaluateNumber(xText);
                    if (!(index >= 1 && index <= 5) || String(index) !== item.substring(0, colon) || x === null) return null;
                    out.push({ index: index - 1, x: x, xText: xText });
                }
                return out;
            }

            // 함수 fn의 x=a에서의 접선을 상자 [x0,x1]×[y0,y1]로 자른 선분 [[x,y],[x,y]]. 정의되지 않거나 꺾인 점(|x|의 꼭짓점)이거나
            // 상자를 지나지 않으면 null
            function tangentSegment(fn, a, x0, x1, y0, y1) {
                var h = 1e-5 * (1 + Math.abs(a)), ya = fn(a), yl = fn(a - h), yr = fn(a + h);
                if (!isFinite(ya) || !isFinite(yl) || !isFinite(yr)) return null;
                var m = (yr - yl) / (2 * h), left = (ya - yl) / h, right = (yr - ya) / h;
                if (Math.abs(left - right) > 1e-3 * (1 + Math.abs(m))) return null;
                var lo = -Infinity, hi = Infinity, d = [1, m], p = [a, ya];
                var checks = [[-d[0], p[0] - x0], [d[0], x1 - p[0]], [-d[1], p[1] - y0], [d[1], y1 - p[1]]];
                for (var i = 0; i < 4; i++) {
                    var q = checks[i][0], r = checks[i][1];
                    if (q === 0) {
                        if (r < 0) return null;
                        continue;
                    }
                    var t = r / q;
                    if (q < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
                }
                if (!(lo < hi)) return null;
                return [[p[0] + lo * d[0], p[1] + lo * d[1]], [p[0] + hi * d[0], p[1] + hi * d[1]]];
            }

            // 화살표 "(0,1)>(1,1):+1, A>B, f1:3>1:x→1" → [{kind: "line", from, to, label, text} | {kind: "graph", index, x0, x1, label, text}].
            // 끝점은 점 이름 {name} 또는 좌표 {x, y}. 괄호 밖 쉼표로 나눈다. 빈 글이면 [], 하나라도 못 읽으면 null
            function parseArrows(text) {
                var items = [], depth = 0, cur = "", s = String(text), i, k;
                for (i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "(") depth++;
                    if (ch === ")") depth--;
                    if (ch === "," && depth === 0) { items.push(cur); cur = ""; } else cur += ch;
                }
                items.push(cur);
                var out = [];
                for (k = 0; k < items.length; k++) {
                    var item = items[k].replace(/^\s+|\s+$/g, "");
                    if (item === "") continue;
                    // 그래프: f번호:x0>x1(:글자)
                    if (/^f[1-5]:/.test(item)) {
                        var parts = item.split(":"), ends = (parts[1] || "").split(">");
                        var x0 = ends.length === 2 ? evaluateNumber(ends[0].replace(/\s/g, "")) : null, x1 = ends.length === 2 ? evaluateNumber(ends[1].replace(/\s/g, "")) : null;
                        if (x0 === null || x1 === null || parts.length > 3) return null;
                        out.push({ kind: "graph", index: Number(item.charAt(1)) - 1, x0: x0, x1: x1, label: (parts[2] || "").replace(/^\s+|\s+$/g, ""), text: item });
                        continue;
                    }
                    // 직선: 끝점>끝점(:글자). 괄호 밖의 첫 >와 그 뒤 첫 :
                    var gt = -1, colon = -1;
                    depth = 0;
                    for (i = 0; i < item.length; i++) {
                        var c = item.charAt(i);
                        if (c === "(") depth++;
                        else if (c === ")") depth--;
                        else if (depth === 0 && c === ">" && gt < 0) gt = i;
                        else if (depth === 0 && c === ":" && gt >= 0 && colon < 0) colon = i;
                    }
                    if (gt < 0) return null;
                    var from = arrowEnd(item.substring(0, gt)), to = arrowEnd(colon >= 0 ? item.substring(gt + 1, colon) : item.substring(gt + 1));
                    if (from === null || to === null) return null;
                    out.push({ kind: "line", from: from, to: to, label: colon >= 0 ? item.substring(colon + 1).replace(/^\s+|\s+$/g, "") : "", text: item });
                }
                return out;
            }

            // 화살표 끝점: "(x,y)" → {x, y}, 점 이름 → {name}. 못 읽으면 null
            function arrowEnd(text) {
                var t = String(text).replace(/\s/g, "");
                if (t === "") return null;
                if (t.charAt(0) === "(" && t.charAt(t.length - 1) === ")") {
                    var comma = t.indexOf(",");
                    if (comma < 0) return null;
                    var x = evaluateNumber(t.substring(1, comma)), y = evaluateNumber(t.substring(comma + 1, t.length - 1));
                    return x === null || y === null ? null : { x: x, y: y };
                }
                return /^[A-Za-z_][A-Za-z0-9_']*$/.test(t) ? { name: t } : null;
            }

            // 점 목록 → 매끈한 베지어 점 (이웃 점을 잇는 방향의 1/3 길이 핸들)
            function smoothBezier(pts) {
                var out = [];
                for (var i = 0; i < pts.length; i++) {
                    var a = pts[i > 0 ? i - 1 : i], b = pts[i < pts.length - 1 ? i + 1 : i], scale = (i > 0 && i < pts.length - 1) ? 6 : 3;
                    var t = [(b[0] - a[0]) / scale, (b[1] - a[1]) / scale];
                    out.push({ anchor: pts[i], left: i > 0 ? [pts[i][0] - t[0], pts[i][1] - t[1]] : pts[i], right: i < pts.length - 1 ? [pts[i][0] + t[0], pts[i][1] + t[1]] : pts[i] });
                }
                return out;
            }

            // 빗금: 다각형(점 목록) 안을 angle(라디안) 방향의 평행선으로 채운다. 선은 원점을 지나는 선에서 gap 간격마다 놓여 두 영역의 빗금이 줄을 맞춘다.
            // 한 줄이 다각형 변과 만나는 점을 정렬해 두 개씩 이어 안쪽 조각만 남긴다(오목해도 된다). 경계와 겹치는 줄과 길이 0인 조각은 뺀다. [[p, q], …]
            function hatchSegments(polygon, gap, angle) {
                var d = [Math.cos(angle), Math.sin(angle)], n = [-d[1], d[0]], lo = Infinity, hi = -Infinity, out = [];
                for (var i = 0; i < polygon.length; i++) {
                    var level0 = polygon[i][0] * n[0] + polygon[i][1] * n[1];
                    lo = Math.min(lo, level0);
                    hi = Math.max(hi, level0);
                }
                for (var k = Math.floor(lo / gap + 1e-9) + 1; k * gap < hi - 1e-9; k++) {
                    var level = k * gap, hits = [];
                    for (var j = 0; j < polygon.length; j++) {
                        var p = polygon[j], q = polygon[(j + 1) % polygon.length];
                        var sp = p[0] * n[0] + p[1] * n[1], sq = q[0] * n[0] + q[1] * n[1];
                        if ((sp <= level) === (sq <= level)) continue;
                        var t = (level - sp) / (sq - sp);
                        hits.push((p[0] + (q[0] - p[0]) * t) * d[0] + (p[1] + (q[1] - p[1]) * t) * d[1]);
                    }
                    hits.sort(function(a, b) { return a - b; });
                    for (var h = 0; h + 1 < hits.length; h += 2) {
                        if (hits[h + 1] - hits[h] < 1e-6) continue;   // 한 점에서 닿기만 하는 곳(겹친 변·꼭짓점)
                        out.push([[level * n[0] + hits[h] * d[0], level * n[1] + hits[h] * d[1]], [level * n[0] + hits[h + 1] * d[0], level * n[1] + hits[h + 1] * d[1]]]);
                    }
                }
                return out;
            }

            // 축 위 글자 "x=1:a, x=π/2:α, y=2:k" → [{axis, value, text}]. 빈 글이면 [], 하나라도 못 읽으면 null
            function parseAxisMarks(text) {
                var parts = String(text).split(","), out = [];
                for (var i = 0; i < parts.length; i++) {
                    var item = parts[i].replace(/^\s+|\s+$/g, "");
                    if (item === "") continue;
                    var colon = item.indexOf(":");
                    if (colon < 0) return null;
                    var head = item.substring(0, colon).replace(/\s/g, ""), label = item.substring(colon + 1).replace(/^\s+|\s+$/g, "");
                    var axis = head.charAt(0), value = head.charAt(1) === "=" ? evaluateNumber(head.substring(2)) : null;
                    if ((axis !== "x" && axis !== "y") || value === null || label === "") return null;
                    out.push({ axis: axis, value: value, text: label });
                }
                return out;
            }

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
                    // 닫는 괄호 바로 뒤의 o(또는 ○)는 속이 빈 점: A(1,2)o
                    var hollow = (s.charAt(close + 1) === "o" || s.charAt(close + 1) === "\u25CB") && /^[\s,;]?$/.test(s.charAt(close + 2));
                    if (x === null || y === null) bad.push(s.substring(i, close + 1));
                    else list.push(hollow ? { name: name, x: x, y: y, xText: xText, yText: yText, open: true } : { name: name, x: x, y: y, xText: xText, yText: yText });
                    i = close + (hollow ? 2 : 1);
                }
                return { list: list, bad: bad };
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "graph") { GRAPH_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "grid") { GRID_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "tick") return TICK_PT;
                if (group === "graph") return GRAPH_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "grid") return GRID_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (p.length === 5 && p[0] === "v2") groups = ["axis", "graph", "guide", "tick"];   // 2026-10-14 잠시 쓴 5칸 v2 (수직선·좌표평면)
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
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
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var parts = [
                    "v10", xMin, xMax, yMin, yMax, unitMm, fontPt,
                    showGrid ? "1" : "0", showNumbers ? "1" : "0", nameStyle,
                    encodeList(functionTexts),
                    encodeURIComponent(pointsText), showCoords ? "1" : "0", showGuides ? "1" : "0",
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
                    piAxis ? "1" : "0", showIntersections ? "1" : "0", showIdentity ? "1" : "0", encodeURIComponent(asymptoteText),
                    hideAxes ? "1" : "0", encodeURIComponent(regionText), regionK,
                    encodeList(nameTexts), nameAts.join(","), encodeURIComponent(lineText), showLineNames ? "1" : "0",
                    encodeURIComponent(labelText), encodeURIComponent(segmentText), encodeURIComponent(regionText2), regionK2, showTicks ? "1" : "0", parameterA, parameterB, parameterC,
                    encodeURIComponent(parametricX), encodeURIComponent(parametricY), encodeURIComponent(parametricMin), encodeURIComponent(parametricMax),
                    encodeURIComponent(tangentText),
                    regionHatch ? "1" : "0", regionHatch2 ? "1" : "0", encodeURIComponent(axisMarkText), lineDashes.join(","),
                    encodeURIComponent(xAxisName), encodeURIComponent(yAxisName), axisMode, xTick, yTick, encodeURIComponent(arrowText)
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function encodeList(list) {
                var out = [];
                for (var i = 0; i < list.length; i++) out.push(encodeURIComponent(list[i]));
                return out.join(",");
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                // v3(옛 저장본)도 읽는다: 새 항목은 처음 값으로 둔다. v6 = v5 + 매개변수곡선 4칸, v7 = v6 + 접선, v8 = v7 + 빗금 둘·축 위 글자·점선
                if (!((p[0] === "v10" && p.length === 51) || (p[0] === "v9" && p.length === 50) || (p[0] === "v8" && p.length === 45) || (p[0] === "v7" && p.length === 41) || (p[0] === "v6" && p.length === 40) || (p[0] === "v5" && p.length === 36) || (p[0] === "v4" && p.length === 33) || (p[0] === "v3" && p.length === 24))) return;
                try {
                    xMin = Math.round(restoreNumber(p[1], xMin, -200, 0));
                    xMax = Math.round(restoreNumber(p[2], xMax, 1, 200));
                    yMin = Math.round(restoreNumber(p[3], yMin, -200, 0));
                    yMax = Math.round(restoreNumber(p[4], yMax, 1, 200));
                    unitMm = restoreNumber(p[5], unitMm, 0.2, 20);
                    fontPt = restoreNumber(p[6], fontPt, 5, 14);
                    showGrid = p[7] === "1";
                    showNumbers = p[8] === "1";
                    nameStyle = Math.round(restoreNumber(p[9], nameStyle, 0, NAME_STYLES.length - 1));
                    var texts = p[10].split(",");
                    if (texts.length === FUNCTION_COUNT) {
                        for (var t = 0; t < FUNCTION_COUNT; t++) functionTexts[t] = decodeURIComponent(texts[t]);
                    }
                    pointsText = decodeURIComponent(p[11]);
                    showCoords = p[12] === "1";
                    showGuides = p[13] === "1";
                    offsetXmm = restoreNumber(p[14], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[15], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[16] === "1";
                    piAxis = p[17] === "1";
                    showIntersections = p[18] === "1";
                    showIdentity = p[19] === "1";
                    asymptoteText = decodeURIComponent(p[20]);
                    hideAxes = p[21] === "1";
                    regionText = decodeURIComponent(p[22]);
                    regionK = restoreNumber(p[23], regionK, 5, 60);
                    if (p[0] === "v4" || p[0] === "v5" || p[0] === "v6" || p[0] === "v7" || p[0] === "v8" || p[0] === "v9" || p[0] === "v10") {
                        var savedNames = p[24].split(",");
                        if (savedNames.length === FUNCTION_COUNT) {
                            for (var sn = 0; sn < FUNCTION_COUNT; sn++) nameTexts[sn] = decodeURIComponent(savedNames[sn]);
                        }
                        var savedPlaces = p[25].split(",");
                        if (savedPlaces.length === FUNCTION_COUNT) {
                            for (var sp = 0; sp < FUNCTION_COUNT; sp++) nameAts[sp] = Math.round(restoreNumber(savedPlaces[sp], 0, 0, 2));
                        }
                        lineText = decodeURIComponent(p[26]);
                        showLineNames = p[27] === "1";
                        labelText = decodeURIComponent(p[28]);
                        segmentText = decodeURIComponent(p[29]);
                        regionText2 = decodeURIComponent(p[30]);
                        regionK2 = restoreNumber(p[31], regionK2, 5, 60);
                        showTicks = p[32] === "1";
                        if (p[0] === "v5" || p[0] === "v6" || p[0] === "v7" || p[0] === "v8" || p[0] === "v9" || p[0] === "v10") {
                            parameterA = restoreNumber(p[33], parameterA, -10, 10);
                            parameterB = restoreNumber(p[34], parameterB, -10, 10);
                            parameterC = restoreNumber(p[35], parameterC, -10, 10);
                        }
                        if (p[0] === "v7" || p[0] === "v8" || p[0] === "v9" || p[0] === "v10") tangentText = decodeURIComponent(p[40]);
                        if (p[0] === "v8" || p[0] === "v9" || p[0] === "v10") {
                            regionHatch = p[41] === "1";
                            regionHatch2 = p[42] === "1";
                            axisMarkText = decodeURIComponent(p[43]);
                            var savedDashes = p[44].split(",");
                            if (savedDashes.length === FUNCTION_COUNT) {
                                for (var sd = 0; sd < FUNCTION_COUNT; sd++) lineDashes[sd] = savedDashes[sd] === "true";
                            }
                        }
                        if (p[0] === "v9" || p[0] === "v10") {
                            xAxisName = decodeURIComponent(p[45]);
                            yAxisName = decodeURIComponent(p[46]);
                            axisMode = Math.round(restoreNumber(p[47], axisMode, 0, 2));
                            xTick = restoreNumber(p[48], xTick, 0.1, 50);
                            yTick = restoreNumber(p[49], yTick, 0.1, 50);
                        }
                        if (p[0] === "v10") arrowText = decodeURIComponent(p[50]);
                        if (p[0] === "v6" || p[0] === "v7" || p[0] === "v8" || p[0] === "v9" || p[0] === "v10") {
                            parametricX = decodeURIComponent(p[36]);
                            parametricY = decodeURIComponent(p[37]);
                            parametricMin = decodeURIComponent(p[38]);
                            parametricMax = decodeURIComponent(p[39]);
                        }
                    }
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 통계 (원래 Object_StatChart.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
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
    function makeStatChartEngine() {
        var api = {label: "통계", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "StatChart/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var TEXT_WIDTH = 300;
            var KINDS = ["히스토그램 · 도수분포다각형", "상자그림", "산점도", "줄기와 잎 그림", "막대 · 꺾은선 그래프", "띠그래프 · 원그래프", "도수분포표"];
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var TICK_PT = 0.4;
            var MAIN_PT = 0.8;
            var EDGE_PT = 0.4;
            var BAR_K = 15;
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var BOX_HEIGHT_MM = 6;
            var WAVE_ROOM_MM = 5;     // 물결선으로 줄인 세로축 0~시작값 칸의 높이
            var WAVE_HALF_MM = 1.6;   // 물결선 반 너비 (세로축 양쪽으로)
            var WAVE_AMP_MM = 0.5;    // 물결 높이
            var WAVE_GAP_MM = 1;      // 두 물결선 사이
            var BAND_MM = 10;         // 띠그래프의 띠 높이
            var SCALE_GAP_MM = 3;     // 띠와 위 0~100 (%) 눈금줄 사이
            var GUIDE_PT = 0.3;                 // 산점도 모눈·y=x 점선 (보조선)
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var LABEL_GAP_MM = 0.8;
            var LEGEND_GAP_MM = 1;           // 축 범례와 축(또는 눈금 숫자·글자) 사이 간격 (그림 제작 규칙)
            var LEGEND_LINE_HEIGHT = 1;      // 세로로 쌓은 범례의 줄 간격(글자 크기 배). 1 = 일러스트레이터 세로쓰기와 같은 간격
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };   // pt. 좌표평면과 같은 평가원식 화살촉
            registerHead(ARROW);

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
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
            var scatterGrid = false, scatterIdentity = false;   // 산점도 모눈(K30)·y=x 점선
            var stemUnit = "";   // 줄기와 잎 그림 범례의 단위: (1|2는 12점)
            // 막대·꺾은선 그래프: 항목, 값(| 로 집단, 꺾은선만), 꺾은선(끄면 막대), 세로축 시작(0보다 크면 물결선), 가로 모눈
            var categoryText = "월, 화, 수, 목, 금", valueText = "12, 15, 9, 18, 14", categoryLine = false, categoryStart = "", categoryGrid = true;
            var ratioPie = false;   // 띠그래프·원그래프: 항목·값 칸을 같이 쓴다. 켜면 원그래프
            var xName = "(cm)";
            var yName = "(명)";
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {widthMm: widthMm, heightMm: heightMm, fontPt: fontPt, classStart: classStart, classWidth: classWidth, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {axis: AXIS_PT, tick: TICK_PT, graph: MAIN_PT, edge: EDGE_PT};
            loadLineWidths();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var kindRow = win.add("group");
            kindRow.add("statictext", undefined, "종류:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;

            var sizePanel = addPanel(win, "크기");
            var widthControls = addValueRow(sizePanel, "너비", "mm", widthMm, 20, 150, 1, 0);
            var heightControls = addValueRow(sizePanel, "높이", "mm", heightMm, 15, 120, 1, 0);
            heightControls.input.helpTip = "상자그림에는 쓰지 않는다";
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var histogramPanel = addPanel(win, "도수분포");
            var startControls = addValueRow(histogramPanel, "첫 계급 시작", "", classStart, 0, 1000, 1, 0);
            var classControls = addValueRow(histogramPanel, "계급 크기", "", classWidth, 0.5, 100, 0.5, 1);
            var frequencyInput = addTextRow(histogramPanel, "도수:", frequencyText, "계급마다 도수를 쉼표로 (2, 5, 8, 4, 1). 두 집단 비교: 1반: 2, 5, 8 | 2반: 1, 6, 7 (막대 없이 다각형을 겹치고 둘째는 점선)");
            var histogramChecks = histogramPanel.add("group");
            var barsCheck = histogramChecks.add("checkbox", undefined, "히스토그램");
            var polygonCheck = histogramChecks.add("checkbox", undefined, "도수분포다각형");
            var relativeCheck = histogramChecks.add("checkbox", undefined, "상대도수");

            var dataPanel = addPanel(win, "자료");
            var boxInput = addTextRow(dataPanel, "상자그림:", boxText, "자료 값을 쉼표로 (3, 5, 6, 7, …). 여러 집단 비교: 1반: 3, 5, 7 | 2반: 4, 6, 8 (같은 수직선 위에 위에서부터 쌓는다)");
            var scatterInput = addTextRow(dataPanel, "산점도:", scatterText, "(x,y) 순서쌍을 공백으로 ((160,50) (165,55))");
            var scatterChecks = dataPanel.add("group");
            var scatterGridCheck = scatterChecks.add("checkbox", undefined, "모눈");
            scatterGridCheck.helpTip = "산점도 눈금마다 회색(K30) 모눈";
            var scatterIdentityCheck = scatterChecks.add("checkbox", undefined, "y=x 점선");
            scatterIdentityCheck.helpTip = "두 값을 비교하는 기준선 y=x (보조 점선)";
            var tableButton = dataPanel.add("button", undefined, "이 도수로 히스토그램 그리기");
            tableButton.helpTip = "도수분포표: 상자그림 칸의 자료를 도수분포 칸의 첫 계급 시작·계급 크기로 세어 도수 칸에 넣고 히스토그램으로 바꾼다";
            var stemUnitInput = addTextRow(dataPanel, "단위:", stemUnit, "줄기와 잎 그림 범례 (1|2는 12점)의 단위. 자료는 상자그림 칸(0 이상의 정수)을 쓴다");

            var categoryPanel = addPanel(win, "항목 · 값");
            var categoryInput = addTextRow(categoryPanel, "항목:", categoryText, "가로축에 차례로 쓸 항목 이름을 쉼표로 (월, 화, 수 / 9시, 10시, 11시)");
            var valueInput = addTextRow(categoryPanel, "값:", valueText, "항목마다 값을 쉼표로, 항목 수와 같게. 꺾은선 두 개: 서울: 2, 5, 9 | 부산: 4, 7, 11 (둘째는 점선, 이름은 끝 점 오른쪽)");
            var categoryStartInput = addTextRow(categoryPanel, "세로축 시작:", categoryStart, "비우면 0. 0보다 크게 쓰면(10 등) 세로축 0과 그 값 사이를 물결선(≈)으로 줄인다. 가장 작은 값 이하로 쓴다");
            var categoryChecks = categoryPanel.add("group");
            var categoryLineCheck = categoryChecks.add("checkbox", undefined, "꺾은선 (끄면 막대)");
            var categoryGridCheck = categoryChecks.add("checkbox", undefined, "가로 모눈");
            categoryGridCheck.helpTip = "세로축 눈금마다 회색(K30) 가로선";
            var ratioPieCheck = categoryPanel.add("checkbox", undefined, "원그래프 (끄면 띠그래프)");
            ratioPieCheck.helpTip = "띠그래프·원그래프: 값을 백분율로 바꿔 쓰고, 반올림한 백분율의 합이 100이 되게 맞춘다. 띠그래프 칸에 글자가 넘치면 너비를 늘린다";

            var axisPanel = addPanel(win, "축 이름", "fold6");
            var xNameInput = addTextRow(axisPanel, "가로:", xName, "가로축 끝에 붙는 글자 (cm), 키 (cm)");
            var yNameInput = addTextRow(axisPanel, "세로:", yName, "세로축 위에 붙는 글자 (명). 상대도수를 켜면 비워도 된다");
            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var edgeWidthControls = addValueRow(lineWidthPanel, "막대 테두리", "pt", currentLineWidth("edge"), 0.1, 2, 0.1, 1);
            edgeWidthControls.input.helpTip = "히스토그램 막대의 테두리";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(edgeWidthControls, function(value) { setLineWidth("edge", value); }, LINE_DEFAULTS.edge);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            barsCheck.value = showBars;
            polygonCheck.value = showPolygon;
            relativeCheck.value = relative;
            scatterGridCheck.value = scatterGrid;
            scatterIdentityCheck.value = scatterIdentity;
            categoryLineCheck.value = categoryLine;
            categoryGridCheck.value = categoryGrid;
            ratioPieCheck.value = ratioPie;
            refreshEnabled();

            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(widthControls, function(value) { widthMm = value; }, initial.widthMm);
            bindValueRow(heightControls, function(value) { heightMm = value; }, initial.heightMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            bindValueRow(startControls, function(value) { classStart = value; }, initial.classStart);
            bindValueRow(classControls, function(value) { classWidth = value; }, initial.classWidth);
            frequencyInput.onChanging = function() { frequencyText = frequencyInput.text; updatePreview(); };
            boxInput.onChanging = function() { boxText = boxInput.text; updatePreview(); };
            scatterInput.onChanging = function() { scatterText = scatterInput.text; updatePreview(); };
            xNameInput.onChanging = function() { xName = xNameInput.text; updatePreview(); };
            yNameInput.onChanging = function() { yName = yNameInput.text; updatePreview(); };
            barsCheck.onClick = function() { showBars = barsCheck.value; updatePreview(); };
            polygonCheck.onClick = function() { showPolygon = polygonCheck.value; updatePreview(); };
            relativeCheck.onClick = function() { relative = relativeCheck.value; updatePreview(); };
            scatterGridCheck.onClick = function() { scatterGrid = scatterGridCheck.value; updatePreview(); };
            scatterIdentityCheck.onClick = function() { scatterIdentity = scatterIdentityCheck.value; updatePreview(); };
            stemUnitInput.onChanging = function() { stemUnit = stemUnitInput.text; updatePreview(); };
            tableButton.onClick = function() {
                var counted = parseNumberList(boxText), table = counted !== null && counted.length > 0 ? frequencyTable(counted, classStart, classWidth) : null;
                if (table === null || table.counts.length > 30) return;
                frequencyText = table.counts.join(", ");
                frequencyInput.text = frequencyText;
                kind = 0;
                kindList.selection = 0;
                refreshEnabled();
                updatePreview();
            };
            categoryInput.onChanging = function() { categoryText = categoryInput.text; updatePreview(); };
            valueInput.onChanging = function() { valueText = valueInput.text; updatePreview(); };
            categoryStartInput.onChanging = function() { categoryStart = categoryStartInput.text; updatePreview(); };
            categoryLineCheck.onClick = function() { categoryLine = categoryLineCheck.value; updatePreview(); };
            categoryGridCheck.onClick = function() { categoryGrid = categoryGridCheck.value; updatePreview(); };
            ratioPieCheck.onClick = function() { ratioPie = ratioPieCheck.value; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function refreshEnabled() {
                histogramPanel.enabled = kind === 0 || kind === 6;
                frequencyInput.parent.enabled = kind === 0;
                histogramChecks.enabled = kind === 0 || kind === 6;
                barsCheck.enabled = kind === 0;
                polygonCheck.enabled = kind === 0;
                tableButton.enabled = kind === 6;
                boxInput.parent.enabled = kind === 1 || kind === 3 || kind === 6;
                stemUnitInput.parent.enabled = kind === 3;
                scatterInput.parent.enabled = kind === 2;
                scatterChecks.enabled = kind === 2;
                categoryPanel.enabled = kind === 4 || kind === 5;
                categoryStartInput.parent.enabled = kind === 4;
                categoryChecks.enabled = kind === 4;
                ratioPieCheck.enabled = kind === 5;
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
                    var groups = parseGroups(frequencyText), sameCount = groups !== null;
                    for (var gi = 1; sameCount && gi < groups.length; gi++) if (groups[gi].values.length !== groups[0].values.length) sameCount = false;
                    if (groups === null) problem = "도수를 읽지 못함";
                    else if (!sameCount) problem = "집단마다 계급 수가 같아야 합니다";
                    else drawing = buildHistogramGroups(size, classStart, classWidth, groups, showBars, showPolygon, relative);
                } else if (kind === 1) {
                    var boxes = parseGroups(boxText), enough = boxes !== null;
                    for (var bi = 0; enough && bi < boxes.length; bi++) if (boxes[bi].values.length < 2) enough = false;
                    if (!enough) problem = "자료를 2개 이상 넣어주세요";
                    else drawing = buildBoxPlotGroups(size, boxes, BOX_HEIGHT_MM * MM_TO_PT);
                } else if (kind === 3) {
                    var stems = parseNumberList(boxText), whole = stems !== null && stems.length > 0;
                    for (var si = 0; whole && si < stems.length; si++) if (stems[si] < 0 || stems[si] !== Math.floor(stems[si])) whole = false;
                    if (!whole) problem = "자료는 0 이상의 정수로 넣어주세요";
                    else drawing = buildStemLeaf(stems, fontPt, stemUnit);
                } else if (kind === 4) {
                    var categories = parseCategories(categoryText), series = parseGroups(valueText), fits = series !== null;
                    for (var ci = 0; fits && ci < series.length; ci++) if (series[ci].values.length !== categories.length) fits = false;
                    var startText = categoryStart.replace(/^\s+|\s+$/g, ""), start = startText === "" ? 0 : strictNumber(startText), above = true;
                    for (ci = 0; fits && above && start !== null && ci < series.length; ci++) {
                        for (var cv = 0; cv < series[ci].values.length; cv++) if (series[ci].values[cv] < start) above = false;
                    }
                    if (categories.length === 0) problem = "항목을 넣어주세요";
                    else if (!fits) problem = "값을 항목 수와 같게 넣어주세요";
                    else if (!categoryLine && series.length > 1) problem = "막대그래프는 한 집단만 그립니다";
                    else if (start === null || start < 0) problem = "세로축 시작을 읽지 못함";
                    else if (!above) problem = "세로축 시작은 가장 작은 값 이하로";
                    else drawing = buildCategoryChart(size, categories, series, categoryLine, start, categoryGrid);
                } else if (kind === 6) {
                    var counted = parseNumberList(boxText), table = counted !== null && counted.length > 0 ? frequencyTable(counted, classStart, classWidth) : null;
                    if (counted === null || counted.length === 0) problem = "자료를 읽지 못함";
                    else if (table === null) problem = "자료는 첫 계급 시작 이상으로";
                    else if (table.counts.length > 30) problem = "계급이 30개 이하가 되게 계급 크기를 키워 주세요";
                    else drawing = buildFrequencyTable(counted, classStart, classWidth, relative, fontPt, xName, yName);
                } else if (kind === 5) {
                    var parts5 = parseCategories(categoryText), shares = parseGroups(valueText), sum5 = 0, negative = false;
                    var fits5 = shares !== null && shares[0].values.length === parts5.length;
                    for (var ri = 1; fits5 && ri < shares.length; ri++) if (shares[ri].values.length !== parts5.length) fits5 = false;
                    for (ri = 0; fits5 && ri < shares[0].values.length; ri++) {
                        if (shares[0].values[ri] < 0) negative = true;
                        sum5 += shares[0].values[ri];
                    }
                    if (parts5.length === 0) problem = "항목을 넣어주세요";
                    else if (!fits5) problem = "값을 항목 수와 같게 넣어주세요";
                    else if (shares.length > 1) problem = "한 집단만 그립니다";
                    else if (negative || sum5 <= 0) problem = "값은 0 이상, 합은 0보다 크게";
                    else drawing = buildRatioChart(size, parts5, shares[0].values, ratioPie, fontPt);
                } else {
                    var pairs = parsePairs(scatterText);
                    if (pairs === null || pairs.length === 0) problem = "순서쌍을 읽지 못함";
                    else drawing = buildScatter(size, pairs, {grid: scatterGrid, identity: scatterIdentity});
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
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                addLegends(drawing);
                previewGroup.translate(viewCenter[0] - size.width / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - size.height / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points, main, tick, closed, dashed(둘째 집단 다각형), grid(산점도 모눈 K30), guide(y=x 보조 점선), curve(베지어 점의 물결선)}
            function addLine(line) {
                var path = previewGroup.pathItems.add();
                if (line.curve) {
                    // 물결선: 앵커와 핸들이 있는 베지어 점
                    for (var lp = 0; lp < line.points.length; lp++) {
                        var point = path.pathPoints.add();
                        point.anchor = line.points[lp].anchor;
                        point.leftDirection = line.points[lp].left;
                        point.rightDirection = line.points[lp].right;
                        point.pointType = PointType.SMOOTH;
                    }
                } else path.setEntirePath(line.points);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.grid ? GRID_K : 100);
                path.strokeWidth = line.main ? MAIN_PT : (line.grid || line.guide ? GUIDE_PT : (line.tick ? TICK_PT : AXIS_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.dashed || line.guide) path.strokeDashes = GUIDE_DASH;
            }

            // [left, bottom, right, top]
            function addBar(bar) {
                var rect = previewGroup.pathItems.rectangle(bar[3], bar[0], bar[2] - bar[0], bar[3] - bar[1]);
                rect.filled = true;
                rect.fillColor = makeGray(BAR_K);
                rect.stroked = true;
                rect.strokeColor = makeGray(100);
                rect.strokeWidth = EDGE_PT;
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var shape = ARROW;
                var head = headShapeFor(arrow.tip, arrow.dir, shape);
                var path = previewGroup.pathItems.add();
                path.setEntirePath(head.points);
                path.closed = head.closed;
                paintHead(path, head.closed, makeGray(100));
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
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
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 축 범례(그림 제작 규칙): 다른 글자를 모두 놓은 뒤에 놓는다. X는 가로 글자를 축 아래 1mm에 오른쪽 끝(align "center"면 가운데)을 at에 맞추고,
            // Y는 글자를 세워 한 글자씩 위→아래로 쌓아(글상자 하나, 줄은 \r, 가운데 맞춤) 축 왼쪽 1mm에 윗끝을 at에 맞춘다.
            // 다른 글자와 겹치면 그 글자에서 1mm 띄운다(글상자 기준. 다른 라벨도 글상자 기준으로 놓인다)
            function addLegends(drawing) {
                var legends = drawing.legends || [];
                if (legends.length === 0) return;
                var gap = LEGEND_GAP_MM * MM_TO_PT, boxes = [], frames = previewGroup.textFrames, i, k;
                for (i = 0; i < frames.length; i++) {
                    var fb = frames[i].geometricBounds;
                    boxes.push([fb[0], fb[3], fb[2], fb[1]]);
                }
                for (i = 0; i < legends.length; i++) {
                    var legend = legends[i], stack = legend.kind === "y", rows = legendRows(legend.text);
                    if (rows.length === 0) continue;
                    var frame = previewGroup.textFrames.add();
                    frame.contents = stack ? rows.join("\r") : legend.text;
                    var range = frame.textRange;
                    range.characterAttributes.size = fontPt;
                    range.characterAttributes.fillColor = makeGray(100);
                    applyTextFonts(frame);
                    if (stack) applyStackedFonts(frame, legend.text);
                    if (stack) {
                        range.paragraphAttributes.justification = Justification.CENTER;
                        range.characterAttributes.autoLeading = false;
                        range.characterAttributes.leading = fontPt * LEGEND_LINE_HEIGHT;
                    }
                    var b = frame.geometricBounds, w = b[2] - b[0], h = b[1] - b[3], x0, y0, top, right;
                    if (!stack) {
                        var x1 = legend.align === "center" ? legend.at[0] + w / 2 : legend.at[0];
                        x0 = x1 - w;
                        top = legendTop(legend.at[1], x0, x1, h, gap, boxes);
                        frame.translate(x0 - b[0], top - b[1]);
                        boxes.push([x0, top - h, x1, top]);
                    } else {
                        y0 = legend.at[1] - h;
                        right = legendRight(legend.at[0], y0, legend.at[1], w, gap, boxes);
                        frame.translate(right - b[2], legend.at[1] - b[1]);
                        boxes.push([right - w, y0, right, legend.at[1]]);
                    }
                }
            }

            // 축 범례 배치 규칙(웹 generators/axis-legend.js와 같다). 사각형은 [왼쪽, 아래, 오른쪽, 위], y 위쪽 +
            // 세로 범례의 줄: 글자 하나씩(공백도 한 줄)
            function legendRows(text) {
                var rows = [], str = String(text);
                for (var i = 0; i < str.length; i++) rows.push(str.charAt(i));
                return rows;
            }

            // X 범례 윗변의 y. 축선 아래 gap에서 시작해, gap만큼 넓힌 글자 상자와 겹치면 그 글자 아래 gap으로 내린다
            function legendTop(axisY, x0, x1, h, gap, boxes) {
                var top = axisY - gap;
                for (var i = 0; i < 64; i++) {
                    var hit = null;
                    for (var k = 0; k < boxes.length; k++) {
                        var b = boxes[k];
                        if (b[2] + gap > x0 && b[0] - gap < x1 && top > b[1] - gap && top - h < b[3] + gap) { hit = b; break; }
                    }
                    if (!hit) break;
                    top = hit[1] - gap;
                }
                return top;
            }

            // Y 범례 오른쪽 끝의 x. 축선 왼쪽 gap에서 시작해, gap만큼 넓힌 글자 상자와 겹치면 그 글자 왼쪽 gap으로 옮긴다
            function legendRight(axisX, y0, y1, w, gap, boxes) {
                var right = axisX - gap;
                for (var i = 0; i < 64; i++) {
                    var hit = null;
                    for (var k = 0; k < boxes.length; k++) {
                        var b = boxes[k];
                        if (b[3] + gap > y0 && b[1] - gap < y1 && right > b[0] - gap && right - w < b[2] + gap) { hit = b; break; }
                    }
                    if (!hit) break;
                    right = hit[0] - gap;
                }
                return right;
            }

            // 쌓은 글자는 줄바꿈이 끼어 이웃 글자가 사라지므로, 원래 글자(legend.text)의 이웃으로 서체를 다시 정한다
            // (따로 떨어진 소문자 한 글자(x)만 이탤릭, (cm)의 c·m은 똑바로)
            function applyStackedFonts(frame, original) {
                for (var i = 0; i < original.length; i++) {
                    var ch = original.charAt(i), code = original.charCodeAt(i);
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) continue;
                    var attributes = frame.textRange.characters[2 * i].characterAttributes;
                    if (/[a-z]/.test(ch) && !/[A-Za-z]/.test(original.charAt(i - 1)) && !/[A-Za-z]/.test(original.charAt(i + 1))) attributes.textFont = italicFont;
                    else if (code <= 126) attributes.textFont = engFont;
                }
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
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
                return buildHistogramGroups(size, start, width, [{ name: "", values: frequencies }], bars, polygon, isRelative);
            }

            // 집단이 둘 이상이면 막대 없이 도수분포다각형을 겹친다(둘째 집단은 점선). 집단 이름은 다각형 꼭대기 위에 (웹 math-stat-chart.js와 같다)
            function buildHistogramGroups(size, start, width, groups, bars, polygon, isRelative) {
                var out = emptyDrawing();
                var n = groups[0].values.length, many = groups.length > 1;
                var top = 0, series = [];
                for (var g = 0; g < groups.length; g++) {
                    var frequencies = groups[g].values, total = 0, ys = [];
                    for (var i = 0; i < n; i++) total += frequencies[i];
                    for (var j = 0; j < n; j++) {
                        ys.push(isRelative ? (total > 0 ? frequencies[j] / total : 0) : frequencies[j]);
                        top = Math.max(top, ys[j]);
                    }
                    series.push(ys);
                }
                var yAxis = niceAxis(0, top > 0 ? top : 1);
                var sx = size.width / (n + 2), sy = size.height / yAxis.max;

                addAxes(out, size, size.xName, size.yName);
                addYTicks(out, yAxis, sy, size.tick);
                for (var b = 0; b <= n; b++) {
                    var x = (b + 1) * sx;
                    out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]], tick: true });
                    out.texts.push({ text: formatValue(start + b * width, width), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
                }
                if (bars && !many) {
                    for (var c = 0; c < n; c++) if (series[0][c] > 0) out.bars.push([(c + 1) * sx, 0, (c + 2) * sx, series[0][c] * sy]);
                }
                if (polygon || many) {
                    for (var s = 0; s < series.length; s++) {
                        var points = [[0.5 * sx, 0]], peak = 1;
                        for (var p = 0; p < n; p++) {
                            points.push([(p + 1.5) * sx, series[s][p] * sy]);
                            if (points[p + 1][1] > points[peak][1]) peak = p + 1;
                        }
                        points.push([(n + 1.5) * sx, 0]);
                        out.lines.push(s > 0 ? { points: points, main: true, dashed: true } : { points: points, main: true });
                        for (var q = 0; q < points.length; q++) out.dots.push(points[q]);
                        if (groups[s].name) out.texts.push({ text: groups[s].name, at: points[peak], dir: [0, 1], clear: 0 });
                    }
                }
                return out;
            }

            // 가로 수직선 위에 상자그림. 상자는 축 위로 boxHeight
            function buildBoxPlot(size, values, boxHeight) {
                return buildBoxPlotGroups(size, [{ name: "", values: values }], boxHeight);
            }

            // 집단마다 상자그림 하나를 같은 수직선 위에 위에서부터 쌓는다(첫 집단이 맨 위). 이름은 상자 높이 가운데의 축 왼쪽에
            function buildBoxPlotGroups(size, groups, boxHeight) {
                var out = emptyDrawing();
                var low = Infinity, high = -Infinity, stats = [];
                for (var g = 0; g < groups.length; g++) {
                    stats.push(quartiles(groups[g].values));
                    low = Math.min(low, stats[g].min);
                    high = Math.max(high, stats[g].max);
                }
                var axis = niceAxis(low, high);
                var scale = size.width / (axis.max - axis.min);
                function X(v) { return (v - axis.min) * scale; }

                out.lines.push({ points: [[0, 0], [size.width, 0]] });
                for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
                    var x = X(v);
                    out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]], tick: true });
                    out.texts.push({ text: formatValue(v, axis.step), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
                }
                // 화살촉 없이 눈금만 있는 축이라 X 범례(그림 제작 규칙)는 가운데 정렬
                if (size.xName) out.legends.push({ kind: "x", align: "center", text: size.xName, at: [size.width / 2, 0] });

                var cap = boxHeight * 0.25;
                for (var k = 0; k < stats.length; k++) {
                    var s = stats[k];
                    var y0 = boxHeight * 0.8 + (stats.length - 1 - k) * boxHeight * 1.6, y1 = y0 + boxHeight, mid = (y0 + y1) / 2;
                    out.lines.push({ points: [[X(s.q1), y0], [X(s.q3), y0], [X(s.q3), y1], [X(s.q1), y1]], closed: true, main: true });
                    out.lines.push({ points: [[X(s.median), y0], [X(s.median), y1]], main: true });
                    out.lines.push({ points: [[X(s.min), mid], [X(s.q1), mid]], main: true });
                    out.lines.push({ points: [[X(s.q3), mid], [X(s.max), mid]], main: true });
                    out.lines.push({ points: [[X(s.min), mid - cap], [X(s.min), mid + cap]], main: true });
                    out.lines.push({ points: [[X(s.max), mid - cap], [X(s.max), mid + cap]], main: true });
                    if (groups[k].name) out.texts.push({ text: groups[k].name, at: [Math.min(0, X(s.min)), mid], dir: [-1, 0], clear: 0 });
                }
                return out;
            }

            // extras: {grid: 눈금마다 K30 모눈, identity: y=x 점선(두 축이 같이 담는 범위)}. 없으면 예전과 같다
            function buildScatter(size, pairs, extras) {
                var out = emptyDrawing();
                var xs = [], ys = [];
                for (var i = 0; i < pairs.length; i++) {
                    xs.push(pairs[i][0]);
                    ys.push(pairs[i][1]);
                }
                var xAxis = padAxis(niceAxis(Math.min.apply(null, xs), Math.max.apply(null, xs)), xs);
                var yAxis = padAxis(niceAxis(Math.min.apply(null, ys), Math.max.apply(null, ys)), ys);
                var sx = size.width / (xAxis.max - xAxis.min), sy = size.height / (yAxis.max - yAxis.min);

                // 모눈은 축보다 먼저(뒤에) 그린다
                if (extras && extras.grid) {
                    for (var gx = xAxis.min + xAxis.step; gx <= xAxis.max + xAxis.step / 2; gx += xAxis.step) out.lines.push({ points: [[(gx - xAxis.min) * sx, 0], [(gx - xAxis.min) * sx, size.height]], grid: true });
                    for (var gy = yAxis.min + yAxis.step; gy <= yAxis.max + yAxis.step / 2; gy += yAxis.step) out.lines.push({ points: [[0, (gy - yAxis.min) * sy], [size.width, (gy - yAxis.min) * sy]], grid: true });
                }
                addAxes(out, size, size.xName, size.yName);
                if (extras && extras.identity) {
                    var lo = Math.max(xAxis.min, yAxis.min), hi = Math.min(xAxis.max, yAxis.max);
                    if (hi > lo) out.lines.push({ points: [[(lo - xAxis.min) * sx, (lo - yAxis.min) * sy], [(hi - xAxis.min) * sx, (hi - yAxis.min) * sy]], guide: true });
                }
                for (var v = xAxis.min; v <= xAxis.max + xAxis.step / 2; v += xAxis.step) {
                    var x = (v - xAxis.min) * sx;
                    if (v > xAxis.min) out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]], tick: true });
                    out.texts.push({ text: formatValue(v, xAxis.step), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
                }
                for (var w = yAxis.min + yAxis.step; w <= yAxis.max + yAxis.step / 2; w += yAxis.step) {
                    var y = (w - yAxis.min) * sy;
                    out.lines.push({ points: [[-size.tick / 2, y], [size.tick / 2, y]], tick: true });
                    out.texts.push({ text: formatValue(w, yAxis.step), at: [0, y], dir: [-1, 0], clear: size.tick / 2 });
                }
                // 세로축 맨 아래 값은 가로축 첫 값과 겹치지 않게 모서리 왼쪽에
                out.texts.push({ text: formatValue(yAxis.min, yAxis.step), at: [0, 0], dir: [-1, 0], clear: size.tick / 2 });
                for (var p = 0; p < pairs.length; p++) out.dots.push([(pairs[p][0] - xAxis.min) * sx, (pairs[p][1] - yAxis.min) * sy]);
                return out;
            }

            // 줄기와 잎 그림(한쪽형). 줄기 = 십의 자리 이상, 잎 = 일의 자리(작은 수부터). 가장 작은 줄기부터 큰 줄기까지 빈 줄기도 쓴다.
            // 머리 "줄기 | 잎" 아래 가로선, 줄기와 잎 사이 세로선. 범례 "(1|2는 12점)"은 가장 작은 자료로, 표 오른쪽 아래에.
            // 글자 크기 fontPt로 칸을 정한다. 왼쪽 위가 (0,0), 아래로 내려간다 (pt, y 위쪽 양수)
            function buildStemLeaf(values, fontPt, unit) {
                var out = emptyDrawing();
                var sorted = values.slice().sort(function(a, b) { return a - b; });
                var lowStem = Math.floor(sorted[0] / 10), highStem = Math.floor(sorted[sorted.length - 1] / 10);
                var rows = [], widest = 0;
                for (var stem = lowStem; stem <= highStem; stem++) rows.push({ stem: stem, leaves: [] });
                for (var i = 0; i < sorted.length; i++) rows[Math.floor(sorted[i] / 10) - lowStem].leaves.push(sorted[i] % 10);
                for (var r = 0; r < rows.length; r++) widest = Math.max(widest, rows[r].leaves.length);
                var rowH = fontPt * 1.7, leafGap = fontPt * 1.1;
                var stemW = fontPt * (1.6 + 0.6 * String(highStem).length);
                var leafW = leafGap * (Math.max(widest, 3) + 1), width = stemW + leafW, bottom = -rowH * (rows.length + 1) - rowH * 0.2;
                out.texts.push({ text: "줄기", at: [stemW / 2, -rowH / 2], dir: [0, 0], clear: 0 });
                out.texts.push({ text: "잎", at: [stemW + leafW / 2, -rowH / 2], dir: [0, 0], clear: 0 });
                out.lines.push({ points: [[0, -rowH], [width, -rowH]] });
                out.lines.push({ points: [[stemW, 0], [stemW, bottom]] });
                for (var k = 0; k < rows.length; k++) {
                    var y = -rowH * (k + 1.5);
                    out.texts.push({ text: String(rows[k].stem), at: [stemW / 2, y], dir: [0, 0], clear: 0 });
                    for (var j = 0; j < rows[k].leaves.length; j++) out.texts.push({ text: String(rows[k].leaves[j]), at: [stemW + leafGap * (j + 1), y], dir: [0, 0], clear: 0 });
                }
                // 잎 숫자를 읽은 소리의 받침에 맞춘 조사: 0 영·1 일·3 삼·6 육·7 칠·8 팔은 "은", 2 이·4 사·5 오·9 구는 "는"
                var leaf = sorted[0] % 10, particle = "013678".indexOf(String(leaf)) >= 0 ? "은" : "는";
                out.texts.push({ text: "(" + Math.floor(sorted[0] / 10) + "|" + leaf + particle + " " + sorted[0] + unit + ")", at: [width, bottom - rowH * 0.6], dir: [-1, 0], clear: 0 });
                return out;
            }

            // 막대그래프·꺾은선그래프. 항목마다 한 칸, 막대는 칸 너비의 0.6(가운데), 꺾은선은 칸 가운데 점을 잇는다(집단이 둘 이상이면 둘째부터 점선,
            // 이름은 마지막 점 오른쪽). start가 0보다 크면 세로축 0과 start 사이를 물결선 두 줄로 줄이고 세로축을 그 사이에서 끊는다.
            // grid면 눈금마다 가로 모눈(K30)
            function buildCategoryChart(size, categories, groups, line, start, grid) {
                var out = emptyDrawing();
                var n = categories.length, top = start, room = start > 0 ? WAVE_ROOM_MM * MM_TO_PT : 0;
                for (var g = 0; g < groups.length; g++) for (var i = 0; i < n; i++) top = Math.max(top, groups[g].values[i]);
                var axis = niceAxis(start, top > start ? top : start + 1);
                var sx = size.width / n, sy = (size.height - room) / (axis.max - axis.min);
                function yOf(v) { return room + (v - axis.min) * sy; }

                // 모눈은 축보다 먼저(뒤에) 그린다
                if (grid) {
                    for (var gv = room > 0 ? axis.min : axis.min + axis.step; gv <= axis.max + axis.step / 2; gv += axis.step) out.lines.push({ points: [[0, yOf(gv)], [size.width, yOf(gv)]], grid: true });
                }
                addAxes(out, size, size.xName, size.yName);
                if (room > 0) {
                    // 세로축을 두 물결선 사이에서 끊는다. 물결선은 축 굵기
                    var yAxis = out.lines[out.lines.length - 1], mid = room / 2, gap = WAVE_GAP_MM * MM_TO_PT / 2;
                    yAxis.points = [[0, mid + gap], yAxis.points[1]];
                    out.lines.push({ points: [[0, 0], [0, mid - gap]] });
                    out.lines.push({ points: wavePath(0, mid - gap, WAVE_HALF_MM * MM_TO_PT, WAVE_AMP_MM * MM_TO_PT), curve: true });
                    out.lines.push({ points: wavePath(0, mid + gap, WAVE_HALF_MM * MM_TO_PT, WAVE_AMP_MM * MM_TO_PT), curve: true });
                    out.texts.push({ text: "0", at: [0, 0], dir: [-1, 0], clear: size.tick / 2 });
                }
                for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
                    if (v > axis.min || room > 0) out.lines.push({ points: [[-size.tick / 2, yOf(v)], [size.tick / 2, yOf(v)]] });
                    out.texts.push({ text: formatValue(v, axis.step), at: [0, yOf(v)], dir: [-1, 0], clear: size.tick / 2 });
                }
                for (var c = 0; c < n; c++) out.texts.push({ text: categories[c], at: [(c + 0.5) * sx, 0], dir: [0, -1], clear: 0 });
                if (!line) {
                    for (var b = 0; b < n; b++) if (groups[0].values[b] > 0) out.bars.push([(b + 0.2) * sx, 0, (b + 0.8) * sx, yOf(groups[0].values[b])]);
                    return out;
                }
                for (var s = 0; s < groups.length; s++) {
                    var points = [];
                    for (var p = 0; p < n; p++) points.push([(p + 0.5) * sx, yOf(groups[s].values[p])]);
                    out.lines.push(s > 0 ? { points: points, main: true, dashed: true } : { points: points, main: true });
                    for (var q = 0; q < points.length; q++) out.dots.push(points[q]);
                    if (groups[s].name) out.texts.push({ text: groups[s].name, at: points[n - 1], dir: [1, 0], clear: 0 });
                }
                return out;
            }

            // 물결선 한 줄: (cx, cy)를 가운데로 가로 [cx-half, cx+half]에서 위로 한 번, 아래로 한 번 (높이 amp). 앵커 셋의 베지어
            function wavePath(cx, cy, half, amp) {
                var h = half / 3, k = amp * 4 / 3;
                return [
                    { anchor: [cx - half, cy], left: [cx - half, cy], right: [cx - half + h, cy + k] },
                    { anchor: [cx, cy], left: [cx - h, cy + k], right: [cx + h, cy - k] },
                    { anchor: [cx + half, cy], left: [cx + half - h, cy - k], right: [cx + half, cy] }
                ];
            }

            // "월, 화, 수" 또는 "월 화 수" → ["월","화","수"]. 쉼표가 있으면 쉼표로만 나눈다(항목 안의 공백을 지킨다)
            function parseCategories(text) {
                var s = String(text), parts = s.indexOf(",") >= 0 || s.indexOf("，") >= 0 ? s.split(/[,，]/) : s.split(/\s+/), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var item = parts[i].replace(/^\s+|\s+$/g, "");
                    if (item !== "") list.push(item);
                }
                return list;
            }

            // 띠그래프·원그래프(비율그래프). 값을 정수 백분율(합 100)로 바꿔, 띠는 왼쪽부터 칸을 나누고 위에 0~100 (%) 눈금줄,
            // 원은 12시 방향에서 시계 방향으로 나누고 둘레 5 %마다 바깥 눈금과 0·25·50·75. 칸마다 가운데에 이름, 그 아래에 (25 %).
            // 띠는 왼쪽 아래가 (0,0), 원은 중심이 (r, r)
            function buildRatioChart(size, categories, values, pie, fontPt) {
                var out = emptyDrawing();
                var pct = percentages(values), n = categories.length, at = 0, shift = fontPt * 0.55;
                if (!pie) {
                    var w = size.width, h = BAND_MM * MM_TO_PT, scaleY = h + SCALE_GAP_MM * MM_TO_PT;
                    out.lines.push({ points: [[0, 0], [w, 0], [w, h], [0, h]], closed: true });
                    out.lines.push({ points: [[0, scaleY], [w, scaleY]] });
                    for (var t = 0; t <= 10; t++) {
                        out.lines.push({ points: [[w * t / 10, scaleY], [w * t / 10, scaleY - size.tick]], tick: true });
                        out.texts.push({ text: String(t * 10), at: [w * t / 10, scaleY], dir: [0, 1], clear: 0 });
                    }
                    out.texts.push({ text: "(%)", at: [w + fontPt * 1.8, scaleY], dir: [0, 1], clear: 0 });   // 100 오른쪽, 같은 줄
                    for (var i = 0; i < n; i++) {
                        if (pct[i] <= 0) continue;
                        var x0 = w * at / 100, x1 = w * (at + pct[i]) / 100;
                        if (at > 0) out.lines.push({ points: [[x0, 0], [x0, h]] });
                        out.texts.push({ text: categories[i], at: [(x0 + x1) / 2, h / 2 + shift], dir: [0, 0], clear: 0 });
                        out.texts.push({ text: "(" + pct[i] + " %)", at: [(x0 + x1) / 2, h / 2 - shift], dir: [0, 0], clear: 0 });
                        at += pct[i];
                    }
                    return out;
                }
                var r = Math.min(size.width, size.height) / 2, c = [r, r], count = 0;
                function clockDir(percent) { return [Math.sin(percent * Math.PI / 50), Math.cos(percent * Math.PI / 50)]; }
                for (var k = 0; k < n; k++) if (pct[k] > 0) count++;
                out.lines.push({ points: circleCurve(c[0], c[1], r), closed: true, curve: true });
                for (var m = 0; m < 20; m++) {
                    var d = clockDir(m * 5), edge = [c[0] + d[0] * r, c[1] + d[1] * r], tip = [c[0] + d[0] * (r + size.tick), c[1] + d[1] * (r + size.tick)];
                    out.lines.push({ points: [edge, tip], tick: true });
                    if (m % 5 === 0) out.texts.push({ text: String(m * 5), at: tip, dir: d, clear: 0 });
                }
                for (var j = 0; j < n; j++) {
                    if (pct[j] <= 0) continue;
                    var s0 = clockDir(at), mid = clockDir(at + pct[j] / 2), center = [c[0] + mid[0] * r * 0.6, c[1] + mid[1] * r * 0.6];
                    if (count > 1) out.lines.push({ points: [c, [c[0] + s0[0] * r, c[1] + s0[1] * r]] });
                    out.texts.push({ text: categories[j], at: [center[0], center[1] + shift], dir: [0, 0], clear: 0 });
                    out.texts.push({ text: "(" + pct[j] + " %)", at: [center[0], center[1] - shift], dir: [0, 0], clear: 0 });
                    at += pct[j];
                }
                return out;
            }

            // 값 → 정수 백분율. 내림한 뒤 모자란 만큼 나머지가 큰 항목부터(같으면 앞 항목부터) 1씩 더해 합을 100으로
            function percentages(values) {
                var total = 0, out = [], rest = [], sum = 0;
                for (var i = 0; i < values.length; i++) total += values[i];
                for (var j = 0; j < values.length; j++) {
                    var exact = values[j] * 100 / total;
                    out.push(Math.floor(exact + 1e-9));
                    rest.push({ index: j, remainder: exact - out[j] });
                    sum += out[j];
                }
                rest.sort(function(a, b) { return b.remainder - a.remainder || a.index - b.index; });
                for (var k = 0; k < 100 - sum; k++) out[rest[k].index]++;
                return out;
            }

            // 원 하나: 오른쪽·위·왼쪽·아래 앵커 넷을 반시계로 잇는 베지어
            function circleCurve(cx, cy, r) {
                var k = r * 0.5522847498;
                return [
                    { anchor: [cx + r, cy], left: [cx + r, cy - k], right: [cx + r, cy + k] },
                    { anchor: [cx, cy + r], left: [cx + k, cy + r], right: [cx - k, cy + r] },
                    { anchor: [cx - r, cy], left: [cx - r, cy + k], right: [cx - r, cy - k] },
                    { anchor: [cx, cy - r], left: [cx - k, cy - r], right: [cx + k, cy - r] }
                ];
            }

            // 자료를 계급으로 센다. 계급은 start부터 width씩 [a, b) (a 이상 b 미만)이고 가장 큰 자료를 담을 때까지 이어진다.
            // bounds는 계급의 경계(계급 수 + 1개). start보다 작은 자료가 있으면 null
            function frequencyTable(values, start, width) {
                var high = Math.max.apply(null, values), low = Math.min.apply(null, values);
                if (low < start - width * 1e-9) return null;
                var n = Math.floor((high - start) / width + 1e-9) + 1, bounds = [], counts = [];
                for (var i = 0; i <= n; i++) bounds.push(roundTo(start + i * width, width / 1000));
                for (var j = 0; j < n; j++) counts.push(0);
                for (var k = 0; k < values.length; k++) counts[Math.min(n - 1, Math.floor((values[k] - start) / width + 1e-9))]++;
                return { bounds: bounds, counts: counts };
            }

            // 도수분포표(중1): 머리 [계급(단위) | 도수(단위) | 상대도수], 계급마다 "a 이상 ~ b 미만", 맨 아래 합계. 칸은 모두 가운데 맞춤, 선은 축 굵기.
            // 머리 이름은 가로·세로축 이름 칸을 쓴다: "(cm)"처럼 단위뿐이면 앞에 "계급"·"도수"를 붙이고, "키(cm)"처럼 쓰면 그대로.
            // 상대도수는 소수 둘째 자리까지. 왼쪽 위가 (0,0), 아래로 내려간다
            function buildFrequencyTable(values, start, width, relative, fontPt, xName, yName) {
                var out = emptyDrawing(), table = frequencyTable(values, start, width), total = values.length;
                var heads = [xName === "" || xName.charAt(0) === "(" ? "계급" + xName : xName, yName === "" || yName.charAt(0) === "(" ? "도수" + yName : yName];
                var widths = [fontPt * 12, fontPt * 6.5], rowH = fontPt * 2.2, rows = [heads];
                if (relative) {
                    heads.push("상대도수");
                    widths.push(fontPt * 6.5);
                }
                for (var i = 0; i < table.counts.length; i++) {
                    var row = [formatValue(table.bounds[i], width) + " 이상 ~ " + formatValue(table.bounds[i + 1], width) + " 미만", String(table.counts[i])];
                    if (relative) row.push(String(Math.round(table.counts[i] / total * 100) / 100));
                    rows.push(row);
                }
                rows.push(relative ? ["합계", String(total), "1"] : ["합계", String(total)]);
                var right = 0;
                for (var w = 0; w < widths.length; w++) right += widths[w];
                for (var r = 0; r <= rows.length; r++) out.lines.push({ points: [[0, -r * rowH], [right, -r * rowH]] });
                var x = 0;
                for (var c = 0; c <= widths.length; c++) {
                    out.lines.push({ points: [[x, 0], [x, -rows.length * rowH]] });
                    if (c === widths.length) break;
                    for (var t = 0; t < rows.length; t++) out.texts.push({ text: rows[t][c], at: [x + widths[c] / 2, -(t + 0.5) * rowH], dir: [0, 0], clear: 0 });
                    x += widths[c];
                }
                return out;
            }

            // 산점도: 가장 작은 자료가 축 위에 얹히지 않게 한 칸 넓힌다
            function padAxis(axis, values) {
                if (Math.min.apply(null, values) - axis.min < axis.step * 0.25) axis.min = roundTo(axis.min - axis.step, axis.step / 1000);
                return axis;
            }

            function emptyDrawing() {
                return { bars: [], lines: [], arrows: [], dots: [], texts: [], legends: [] };
            }

            // 왼쪽 아래 (0,0)에서 시작하는 두 축과 평가원식 화살촉, 축 이름
            function addAxes(out, size, xLabel, yLabel) {
                var right = size.width + ARROW.length * 2.5, top = size.height + ARROW.length * 2.5;
                out.lines.push({ points: [[0, 0], [right - ARROW.length + ARROW.notch, 0]] });
                out.lines.push({ points: [[0, 0], [0, top - ARROW.length + ARROW.notch]] });
                out.arrows.push({ tip: [right, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top], dir: [0, 1] });
                // 축 범례(그림 제작 규칙, addLegends가 다른 글자를 모두 놓은 뒤에 놓는다): X는 축 아래 1mm에 화살촉 끝 오른쪽 정렬,
                // Y는 글자를 세워 쌓고 축 왼쪽 1mm에 위 끝 정렬. 눈금 숫자와 겹치면 그 숫자에서 1mm
                if (xLabel) out.legends.push({ kind: "x", text: xLabel, at: [right, 0] });
                if (yLabel) out.legends.push({ kind: "y", text: yLabel, at: [0, top] });
            }

            function addYTicks(out, axis, scale, tick) {
                for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
                    var y = (v - axis.min) * scale;
                    if (v > axis.min) out.lines.push({ points: [[-tick / 2, y], [tick / 2, y]], tick: true });
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

            // "1반: 3, 5, 7 | 2반: 4, 6, 8" → [{name, values}]. | 로 집단을 나누고, 앞의 "이름:"은 집단 이름(없으면 "").
            // 집단 하나라도 숫자 목록을 못 읽거나 비면 null
            function parseGroups(text) {
                var parts = String(text).split("|"), groups = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i], colon = part.indexOf(":"), name = "";
                    if (colon >= 0) {
                        name = part.substring(0, colon).replace(/^\s+|\s+$/g, "");
                        part = part.substring(colon + 1);
                    }
                    var values = parseNumberList(part);
                    if (values === null || values.length === 0) return null;
                    groups.push({ name: name, values: values });
                }
                return groups;
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
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "graph") { MAIN_PT = value; }
                if (group === "edge") { EDGE_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "tick") return TICK_PT;
                if (group === "graph") return MAIN_PT;
                if (group === "edge") return EDGE_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
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
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var parts = [
                    "v5", kind, widthMm, heightMm, fontPt, classStart, classWidth, encodeURIComponent(frequencyText),
                    showBars ? "1" : "0", showPolygon ? "1" : "0", relative ? "1" : "0",
                    encodeURIComponent(boxText), encodeURIComponent(scatterText), encodeURIComponent(xName), encodeURIComponent(yName),
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0", scatterGrid ? "1" : "0", scatterIdentity ? "1" : "0", encodeURIComponent(stemUnit),
                    encodeURIComponent(categoryText), encodeURIComponent(valueText), categoryLine ? "1" : "0", encodeURIComponent(categoryStart), categoryGrid ? "1" : "0",
                    ratioPie ? "1" : "0"
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                // v2 = v1 + 산점도 모눈·y=x, v3 = v2 + 줄기와 잎 단위, v4 = v3 + 막대·꺾은선, v5 = v4 + 원그래프. 앞 판도 읽는다
                if (!((p[0] === "v5" && p.length === 27) || (p[0] === "v4" && p.length === 26) || (p[0] === "v3" && p.length === 21) || (p[0] === "v2" && p.length === 20) || (p[0] === "v1" && p.length === 18))) return;
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
                    if (p[0] === "v2" || p[0] === "v3" || p[0] === "v4" || p[0] === "v5") {
                        scatterGrid = p[18] === "1";
                        scatterIdentity = p[19] === "1";
                    }
                    if (p[0] === "v3" || p[0] === "v4" || p[0] === "v5") stemUnit = decodeURIComponent(p[20]);
                    if (p[0] === "v4" || p[0] === "v5") {
                        categoryText = decodeURIComponent(p[21]);
                        valueText = decodeURIComponent(p[22]);
                        categoryLine = p[23] === "1";
                        categoryStart = decodeURIComponent(p[24]);
                        categoryGrid = p[25] === "1";
                    }
                    if (p[0] === "v5") ratioPie = p[26] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 작도 (원래 Object_Construction.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 작도·삼각형의 오심: 선택한 직선 패스에 따라
    // - 선분(점 2개): 수직이등분선
    // - 각(열린 패스, 점 3개): 가운데 꼭짓점의 각의 이등분선
    // - 삼각형(닫힌 패스, 점 3개): 외심 O(수직이등분선·외접원), 내심 I(각의 이등분선·내접원·접점까지 수선), 무게중심 G(중선)
    // 작도 흔적을 켜면 교과서처럼 컴퍼스 호를 남긴다(수직이등분선: 두 끝점에서 같은 반지름, 각의 이등분선: 꼭짓점에서 한 번, 두 변 위의 점에서 한 번).
    // 선 두께는 평가원 그림 기준: 원 0.8pt, 보조선·작도 흔적 0.3pt. 도형 선은 기본으로 0.8pt로 맞춘다(끄면 그대로).
    function makeConstructionEngine() {
        var api = {label: "작도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "Construction/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 30;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var MARK_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var SHAPE_STROKE_PT = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["circumcenter", "perpBisectors", "circumcircle", "incenter", "angleBisectors", "incircle",
                "tangentFeet", "centroid", "medians", "traces", "dashed"];

            var doc = app.activeDocument;

            var target = null;
            var sel = doc.selection;
            if (sel && sel.length === 1 && sel[0].typename === "PathItem") target = sel[0];
            if (target === null) {
                return "선분(점 2개), 각(열린 패스, 점 3개), 삼각형(닫힌 패스, 점 3개) 중 하나를 선택해주세요.";
            }
            var rawPoints = [];
            for (var p = 0; p < target.pathPoints.length; p++) {
                var anchor = target.pathPoints[p].anchor;
                rawPoints.push([anchor[0], anchor[1]]);
            }
            rawPoints = dedupePoints(rawPoints, target.closed);
            var mode = detectMode(rawPoints, target.closed);
            if (mode === null) {
                return "선분(점 2개), 각(열린 패스, 점 3개), 삼각형(닫힌 패스, 점 3개) 중 하나를 선택해주세요.";
            }
            var MODE_NAMES = { segment: "선분 → 수직이등분선", angle: "각 → 각의 이등분선", triangle: "삼각형 → 오심" };

            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var opt = {
                circumcenter: true, perpBisectors: true, circumcircle: true,
                incenter: false, angleBisectors: false, incircle: false, tangentFeet: false,
                centroid: false, medians: false,
                traces: true, dashed: true, extendMm: 3
            };
            var normalizeStroke = true;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {extendMm: opt.extendMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {graph: MAIN_PT, guide: GUIDE_PT, mark: MARK_PT};
            loadLineWidths();

            var previewGroup = null;
            var originalStroked = target.stroked;
            var originalStrokeWidth = target.strokeWidth;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다
            win.add("statictext", undefined, "대상: " + MODE_NAMES[mode]);

            var trianglePanel = addPanel(win, "삼각형");
            var circumRow = trianglePanel.add("group");
            var circumcenterCheck = circumRow.add("checkbox", undefined, "외심 O");
            var perpCheck = circumRow.add("checkbox", undefined, "수직이등분선");
            var circumcircleCheck = circumRow.add("checkbox", undefined, "외접원");
            var inRow = trianglePanel.add("group");
            var incenterCheck = inRow.add("checkbox", undefined, "내심 I");
            var angleCheck = inRow.add("checkbox", undefined, "각의 이등분선");
            var incircleCheck = inRow.add("checkbox", undefined, "내접원");
            var feetCheck = inRow.add("checkbox", undefined, "접점 수선");
            feetCheck.helpTip = "내심에서 세 변에 내린 수선 (내접원의 반지름)";
            var centroidRow = trianglePanel.add("group");
            var centroidCheck = centroidRow.add("checkbox", undefined, "무게중심 G");
            var mediansCheck = centroidRow.add("checkbox", undefined, "중선");
            trianglePanel.enabled = mode === "triangle";

            var stylePanel = addPanel(win, "표시", "fold5");
            var styleRow = stylePanel.add("group");
            var tracesCheck = styleRow.add("checkbox", undefined, "작도 흔적(컴퍼스 호)");
            var dashedCheck = styleRow.add("checkbox", undefined, "보조선 점선");
            var extendControls = addValueRow(stylePanel, "보조선 연장", "mm", opt.extendMm, 0, 15, 0.5, 1);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var normalizeCheck = lineWidthPanel.add("checkbox", undefined, "도형 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
            normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var markWidthControls = addValueRow(lineWidthPanel, "작도 흔적", "pt", currentLineWidth("mark"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "수직이등분선, 각의 이등분선, 중선, 접점 수선";
            markWidthControls.input.helpTip = "컴퍼스 호 (작도 흔적)";
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(markWidthControls, function(value) { setLineWidth("mark", value); }, LINE_DEFAULTS.mark);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);


            bindOption(circumcenterCheck, "circumcenter");
            bindOption(perpCheck, "perpBisectors");
            bindOption(circumcircleCheck, "circumcircle");
            bindOption(incenterCheck, "incenter");
            bindOption(angleCheck, "angleBisectors");
            bindOption(incircleCheck, "incircle");
            bindOption(feetCheck, "tangentFeet");
            bindOption(centroidCheck, "centroid");
            bindOption(mediansCheck, "medians");
            bindOption(tracesCheck, "traces");
            bindOption(dashedCheck, "dashed");
            normalizeCheck.value = normalizeStroke;
            normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
            bindValueRow(extendControls, function(value) { opt.extendMm = value; }, initial.extendMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
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
                try {
                    target.stroked = originalStroked;
                    target.strokeWidth = originalStrokeWidth;
                } catch (restoreError) {}
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                if (normalizeStroke) {
                    target.stroked = true;
                    target.strokeWidth = SHAPE_STROKE_PT;
                }
                var drawing = buildConstruction(rawPoints, mode, opt, opt.extendMm * MM_TO_PT);
                previewGroup = target.parent.groupItems.add();
                previewGroup.move(target, ElementPlacement.PLACEBEFORE);
                previewGroup.name = "작도";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var j = 0; j < drawing.circles.length; j++) addCircle(drawing.circles[j]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"guide"|"trace"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < line.points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = line.points[j].left;
                    point.rightDirection = line.points[j].right;
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "trace" ? MARK_PT : GUIDE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                if (line.kind === "guide" && opt.dashed) path.strokeDashes = GUIDE_DASH;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
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
                var reach = DOT_RADIUS_MM * MM_TO_PT + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt). O·I·G는 똑바로
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
                    attributes.textFont = korean ? korFont : engFont;
                    attributes.baselineShift = korean ? 0 : ENG_BASELINE_PT;
                }
            }

            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-construction.js)
            // -------------------------------------------------------
            // 겹친 점(닫힌 패스의 끝=처음 포함)을 지운다
            function dedupePoints(points, isClosed) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var last = out[out.length - 1];
                    if (last && Math.abs(last[0] - points[i][0]) < 0.01 && Math.abs(last[1] - points[i][1]) < 0.01) continue;
                    out.push(points[i]);
                }
                if (isClosed && out.length > 1) {
                    var first = out[0], end = out[out.length - 1];
                    if (Math.abs(first[0] - end[0]) < 0.01 && Math.abs(first[1] - end[1]) < 0.01) out.pop();
                }
                return out;
            }

            // 점이 한 직선 위에 있으면(넓이 0) 각·삼각형이 아니다
            function detectMode(points, isClosed) {
                if (points.length === 2 && !isClosed) return "segment";
                if (points.length !== 3) return null;
                var area = cross(sub(points[1], points[0]), sub(points[2], points[0]));
                if (Math.abs(area) < 1e-6 * (1 + Math.pow(dist(points[0], points[1]) + dist(points[1], points[2]), 2))) return null;
                return isClosed ? "triangle" : "angle";
            }

            function buildConstruction(points, kind, o, extend) {
                var out = { lines: [], circles: [], dots: [], texts: [] };
                if (kind === "segment") {
                    perpendicularBisector(out, points[0], points[1], null, o.traces, extend);
                    return out;
                }
                if (kind === "angle") {
                    angleBisector(out, points[1], points[0], points[2], null, o.traces, extend);
                    return out;
                }
                var A = points[0], B = points[1], C = points[2];
                var sides = [[A, B, C], [B, C, A], [C, A, B]];   // [끝점, 끝점, 마주 보는 꼭짓점]

                var O = circumcenter(A, B, C);
                if (o.perpBisectors) for (var s = 0; s < 3; s++) perpendicularBisector(out, sides[s][0], sides[s][1], O, o.traces, extend);
                if (o.circumcircle) out.circles.push({ center: O, radius: dist(O, A) });
                if (o.circumcenter) addCenter(out, O, "O", points);

                var incircle = incenter(A, B, C);
                var I = incircle.center;
                if (o.angleBisectors) {
                    for (var v = 0; v < 3; v++) angleBisector(out, sides[v][2], sides[v][0], sides[v][1], I, o.traces, extend);
                }
                if (o.tangentFeet) {
                    for (var f = 0; f < 3; f++) out.lines.push(guide([I, footOfPerpendicular(I, sides[f][0], sides[f][1])]));
                }
                if (o.incircle) out.circles.push({ center: I, radius: incircle.radius });
                if (o.incenter) addCenter(out, I, "I", points);

                var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
                if (o.medians) {
                    for (var m = 0; m < 3; m++) out.lines.push(guide([sides[m][2], midpoint(sides[m][0], sides[m][1])]));
                }
                if (o.centroid) addCenter(out, G, "G", points);
                return out;
            }

            // 점과 이름. 이름은 가장 가까운 꼭짓점에서 멀어지는 쪽 (겹치면 오른쪽 아래)
            function addCenter(out, at, name, vertices) {
                var nearest = vertices[0];
                for (var i = 1; i < vertices.length; i++) if (dist(at, vertices[i]) < dist(at, nearest)) nearest = vertices[i];
                var away = dist(at, nearest) > 1e-6 ? unit(sub(at, nearest)) : [0.7071, -0.7071];
                out.dots.push(at);
                out.texts.push({ text: name, at: at, dir: away });
            }

            // 선분 AB의 수직이등분선. through(외심)가 있으면 그 점까지 덮고, 양 끝을 extend만큼 더 뻗는다
            function perpendicularBisector(out, A, B, through, traces, extend) {
                var M = midpoint(A, B), length = dist(A, B);
                var n = unit([-(B[1] - A[1]), B[0] - A[0]]);
                var radius = length * 0.7;
                var reach = Math.sqrt(radius * radius - length * length / 4);   // 두 호의 교점까지
                var low = -reach, high = reach;
                if (through) {
                    var t = dot(sub(through, M), n);
                    low = Math.min(0, t) - length * 0.15;
                    high = Math.max(0, t) + length * 0.15;
                    if (traces) { low = Math.min(low, -reach); high = Math.max(high, reach); }
                }
                out.lines.push(guide([offset(M, n, low - extend), offset(M, n, high + extend)]));
                if (traces) {
                    var sweep = 24 * Math.PI / 180;
                    for (var side = -1; side <= 1; side += 2) {
                        var P = offset(M, n, side * reach);
                        out.lines.push(trace(arcPoints(A, radius, angleOf(sub(P, A)) - sweep / 2, sweep)));
                        out.lines.push(trace(arcPoints(B, radius, angleOf(sub(P, B)) - sweep / 2, sweep)));
                    }
                }
            }

            // 꼭짓점 V에서 두 변 VP, VN 사이 각의 이등분선. through(내심)가 있으면 마주 보는 변까지(삼각형), 없으면 작도점 너머로
            function angleBisector(out, V, P, N, through, traces, extend) {
                var u = unit(sub(P, V)), w = unit(sub(N, V));
                var bisector = unit([u[0] + w[0], u[1] + w[1]]);
                var half = Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) / 2;
                var r1 = Math.min(dist(V, P), dist(V, N)) * 0.35;
                var X = offset(V, u, r1), Y = offset(V, w, r1);
                var r2 = dist(X, Y) * 0.8;
                // X, Y에서 같은 반지름 r2로 그린 호의 교점 (V에서 먼 쪽)
                var Z = offset(midpoint(X, Y), bisector, Math.sqrt(Math.max(0, r2 * r2 - Math.pow(dist(X, Y) / 2, 2))));
                var end;
                if (through) {
                    end = lineIntersection(V, bisector, P, sub(N, P));
                } else {
                    end = offset(V, bisector, Math.max(dist(V, Z), Math.min(dist(V, P), dist(V, N)) * 0.8) + extend);
                }
                out.lines.push(guide([V, end]));
                if (traces) {
                    // u에서 반시계로 w까지. 180°를 넘으면 w에서 반시계로 u까지 (작은 쪽 각)
                    var start = angleOf(u);
                    var sweep = angleOf(w) - start;
                    while (sweep < 0) sweep += Math.PI * 2;
                    if (sweep > Math.PI) { start = angleOf(w); sweep = Math.PI * 2 - sweep; }
                    var margin = 8 * Math.PI / 180;
                    out.lines.push(trace(arcPoints(V, r1, start - margin, sweep + margin * 2)));
                    var small = Math.max(20 * Math.PI / 180, half * 0.5);
                    out.lines.push(trace(arcPoints(X, r2, angleOf(sub(Z, X)) - small / 2, small)));
                    out.lines.push(trace(arcPoints(Y, r2, angleOf(sub(Z, Y)) - small / 2, small)));
                }
            }

            function circumcenter(A, B, C) {
                var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
                var a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
                return [
                    (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d,
                    (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d
                ];
            }

            function incenter(A, B, C) {
                var a = dist(B, C), b = dist(C, A), c = dist(A, B), perimeter = a + b + c;
                var center = [(a * A[0] + b * B[0] + c * C[0]) / perimeter, (a * A[1] + b * B[1] + c * C[1]) / perimeter];
                var area = Math.abs(cross(sub(B, A), sub(C, A))) / 2;
                return { center: center, radius: area * 2 / perimeter };
            }

            function footOfPerpendicular(point, A, B) {
                var d = unit(sub(B, A));
                return offset(A, d, dot(sub(point, A), d));
            }

            // P + t·d와 Q + s·e의 교점
            function lineIntersection(P, d, Q, e) {
                var t = cross(sub(Q, P), e) / cross(d, e);
                return offset(P, d, t);
            }

            // 3차 베지어 원호 (90°씩 나눈다)
            function arcPoints(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radius;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var a = [center[0] + radius * cos, center[1] + radius * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: a,
                        left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                        right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
                    });
                }
                return points;
            }

            function guide(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: "guide" };
            }

            function trace(points) {
                return { points: points, kind: "trace" };
            }

            function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
            function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function angleOf(v) { return Math.atan2(v[1], v[0]); }
            function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
                return [v[0] / length, v[1] / length];
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { MAIN_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "mark") { MARK_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return MAIN_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "mark") return MARK_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = ["left", "top"];
                panel.margins = [12, 16, 12, 12];
                panel.spacing = 6;
                return panel;
            }

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (" + unitText + "):").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", flags, opt.extendMm, normalizeStroke ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 8 || p[1].length !== FLAG_KEYS.length) return;
                for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
                opt.extendMm = restoreNumber(p[2], opt.extendMm, 0, 15);
                normalizeStroke = p[3] === "1";
                fontPt = restoreNumber(p[4], fontPt, 5, 14);
                offsetXmm = restoreNumber(p[5], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[6], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[7] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 전개도 (원래 Object_Net.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 전개도: 정육면체(11가지), 직육면체, 각기둥, 각뿔, 원기둥, 원뿔, 정사면체, 정팔면체, 정이십면체.
    // 면을 다각형으로 만든 뒤 두 면이 나누는 모서리는 접는 선(점선), 한 면에만 있는 모서리는 바깥선으로 그린다.
    // 선 두께는 평가원 그림 기준: 바깥선 0.8pt, 접는 선 0.4pt.
    // 정십이면체는 접히는지 검증할 방법이 없어 뺐다. 정육면체 11가지는 tests/check-net.js에서 굴려 접어 확인한다.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeNetEngine() {
        var api = {label: "전개도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "Net/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var OUTLINE_PT = 0.8;
            var FOLD_PT = 0.4;
            var FOLD_DASH = [2, 1.5];
            var LABEL_GAP_MM = 0.8;          // 길이 글자와 모서리 사이
            var ENG_BASELINE_PT = 0.5;
            // 길이 글자 칸에 쓰는 크기 항목 이름 (USES에서 전개도 번호·밑면 변 수를 뺀 순서)
            var LENGTH_NAMES = {side: "한 변", depth: "세로", height: "높이", lateral: "옆모서리", radius: "반지름", slant: "모선"};
            var KINDS = ["정육면체", "직육면체", "각기둥", "각뿔", "원기둥", "원뿔", "정사면체", "정팔면체", "정이십면체"];
            // 각 종류가 쓰는 입력 (다이얼로그에서 나머지는 끈다)
            var USES = [
                ["net", "side"], ["side", "depth", "height"], ["count", "side", "height"], ["count", "side", "lateral"],
                ["radius", "height"], ["radius", "slant"], ["side"], ["side"], ["side"]
            ];

            var doc = app.activeDocument;
            var korFont = findTextFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
            var engFont = findTextFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
            var italicFont = findTextFont(["GSMediItaC1", "GSMediumB1"]);
            var eqnFont = findTextFont(["HancomEQN", "GSMediumB1"]);
            var symbolFont = findTextFont(["Batang", "SpoqaHanSansNeo-Regular"]);
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();

            // 옵션 (길이는 mm)
            var kind = 0;
            var values = { net: 1, count: 4, side: 15, depth: 10, height: 20, lateral: 20, radius: 8, slant: 20 };
            var dashedFolds = true;
            // 표시: 면 글자(위에서 아래·왼쪽에서 오른쪽, 끝의 *는 칠하기), 길이 글자(크기 항목 순서), 주사위 눈, 칠하기 농도, 글자 크기
            var faceText = "", lengthText = "", dicePips = false, shadeK = 20, fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {net: values.net, count: values.count, side: values.side, depth: values.depth, height: values.height, lateral: values.lateral, radius: values.radius, slant: values.slant, offsetXmm: offsetXmm, offsetYmm: offsetYmm, shadeK: shadeK, fontPt: fontPt};
            applySettings();
            var LINE_DEFAULTS = {graph: OUTLINE_PT, guide: FOLD_PT};
            loadLineWidths();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var kindRow = win.add("group");
            kindRow.add("statictext", undefined, "종류:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;

            var sizePanel = addPanel(win, "크기");
            var rows = {
                net: addValueRow(sizePanel, "전개도 번호", "", values.net, 1, 11, 1, 0),
                count: addValueRow(sizePanel, "밑면 변 수", "", values.count, 3, 8, 1, 0),
                side: addValueRow(sizePanel, "한 변 · 너비", "mm", values.side, 3, 60, 0.5, 1),
                depth: addValueRow(sizePanel, "깊이", "mm", values.depth, 3, 60, 0.5, 1),
                height: addValueRow(sizePanel, "높이", "mm", values.height, 3, 80, 0.5, 1),
                lateral: addValueRow(sizePanel, "옆모서리", "mm", values.lateral, 3, 80, 0.5, 1),
                radius: addValueRow(sizePanel, "반지름", "mm", values.radius, 2, 40, 0.5, 1),
                slant: addValueRow(sizePanel, "모선", "mm", values.slant, 3, 80, 0.5, 1)
            };
            rows.net.input.helpTip = "1~6: 1-4-1형, 7~9: 2-3-1형, 10: 2-2-2형, 11: 3-3형";
            var dashedCheck = sizePanel.add("checkbox", undefined, "접는 선 점선");
            var markPanel = addPanel(win, "표시");
            var faceInput = addTextInputRow(markPanel, "면 글자", faceText,
                "면마다 쓸 글자를 쉼표로 나눠 쓴다. 면 순서는 위에서 아래, 같은 줄은 왼쪽에서 오른쪽(원기둥·원뿔은 원과 부채꼴도 한 면). 비우면 건너뛰고, 끝에 *를 붙이면 그 면을 칠한다 (가,나*,,라). ㉠·(가)·①은 바탕체");
            var lengthInput = addTextInputRow(markPanel, "길이 글자", lengthText, "");
            var pipCheck = markPanel.add("checkbox", undefined, "주사위 눈 (정육면체 1~6)");
            var shadeControls = addValueRow(markPanel, "칠하기 농도", "K", shadeK, 5, 60, 5, 0);
            var fontControls = addValueRow(markPanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            dashedCheck.value = dashedFolds;
            refreshEnabled();

            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            for (var key in rows) bindKeyRow(key);
            dashedCheck.onClick = function() { dashedFolds = dashedCheck.value; updatePreview(); };
            pipCheck.value = dicePips;
            pipCheck.onClick = function() { dicePips = pipCheck.value; updatePreview(); };
            faceInput.onChange = function() { faceText = faceInput.text; updatePreview(); };
            lengthInput.onChange = function() { lengthText = lengthInput.text; updatePreview(); };
            bindValueRow(shadeControls, function(value) { shadeK = value; }, initial.shadeK);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function bindKeyRow(key) {
                bindValueRow(rows[key], function(value) { values[key] = value; }, initial[key]);
            }

            function refreshEnabled() {
                for (var key in rows) {
                    var used = false;
                    for (var i = 0; i < USES[kind].length; i++) if (USES[kind][i] === key) used = true;
                    rows[key].input.parent.enabled = used;
                }
                var names = [], keys = lengthKeys();
                for (var k = 0; k < keys.length; k++) names.push(LENGTH_NAMES[keys[k]]);
                lengthInput.helpTip = "이 종류의 길이를 " + names.join(", ") + " 순서로 쉼표로 나눠 쓴다 (예: 5 cm, x). 같은 길이의 바깥 모서리 중 가장 아래쪽에 붙고, 반지름은 밑면 원에 반지름 선을, 모선은 부채꼴 변에 붙는다";
            }

            function lengthKeys() {
                var keys = [];
                for (var i = 0; i < USES[kind].length; i++) if (USES[kind][i] !== "net" && USES[kind][i] !== "count") keys.push(USES[kind][i]);
                return keys;
            }

            // 라벨 | 넓은 글 입력칸. 글은 Enter·포커스 이동(onChange) 때 반영한다
            function addTextInputRow(parent, label, value, tip) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + ":").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, value);
                input.preferredSize.width = 220;
                input.helpTip = tip;
                return input;
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
                var sizes = {};
                for (var key in values) sizes[key] = key === "net" || key === "count" ? values[key] : values[key] * MM_TO_PT;
                var net = buildNet(kind, sizes);
                messageText.text = net.message || " ";
                if (net.faces.length === 0 && net.circles.length === 0 && net.sectors.length === 0) return;
                var drawing = netLines(net);

                var marks = netMarks(net, lengthKeys(), sizes, {faceText: faceText, lengthText: lengthText, dicePips: dicePips});

                previewGroup = layer.groupItems.add();
                previewGroup.name = "전개도 (" + KINDS[kind] + ")";
                // 칠하기 → 선 → 원 → 반지름 선 → 주사위 눈 → 글자 순서
                for (var f = 0; f < marks.fills.length; f++) addRegionFill(marks.fills[f]);
                for (var i = 0; i < drawing.length; i++) addPath(drawing[i]);
                for (var c = 0; c < net.circles.length; c++) addCircle(net.circles[c]);
                for (var m = 0; m < marks.lines.length; m++) addPath(straight(marks.lines[m], false, true), true);
                for (var d = 0; d < marks.pips.length; d++) addPip(marks.pips[d]);
                for (var l = 0; l < marks.labels.length; l++) addLabel(marks.labels[l]);
                var b = netBounds(net);
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, fold}. solid면 접는 선 두께의 실선(반지름 선)
            function addPath(line, solid) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < line.points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = line.points[j].left;
                    point.rightDirection = line.points[j].right;
                }
                path.closed = line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.fold ? FOLD_PT : OUTLINE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.fold && dashedFolds && !solid) path.strokeDashes = FOLD_DASH;
            }

            // 칠할 자리: 면(다각형)·원·부채꼴
            function addRegionFill(region) {
                var path;
                if (region.kind === "circle") {
                    var r = region.circle.radius;
                    path = previewGroup.pathItems.ellipse(region.circle.center[1] + r, region.circle.center[0] - r, r * 2, r * 2);
                } else {
                    var points = region.kind === "sector"
                        ? [{anchor: region.sector.center, left: region.sector.center, right: region.sector.center}].concat(arcPoints(region.sector.center, region.sector.radius, region.sector.start, region.sector.sweep))
                        : straight(region.points, true, false).points;
                    path = previewGroup.pathItems.add();
                    var anchors = [];
                    for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                    path.setEntirePath(anchors);
                    for (var j = 0; j < points.length; j++) {
                        path.pathPoints[j].leftDirection = points[j].left;
                        path.pathPoints[j].rightDirection = points[j].right;
                    }
                    path.closed = true;
                }
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(shadeK);
            }

            function addPip(pip) {
                var r = pip.radius;
                var dot = previewGroup.pathItems.ellipse(pip.center[1] + r, pip.center[0] - r, r * 2, r * 2);
                dot.stroked = false;
                dot.filled = true;
                dot.fillColor = makeGray(100);
            }

            // 면 글자는 면 가운데(dir 0), 길이 글자는 모서리에서 바깥쪽으로 간격을 두고 가까운 가장자리가 오게
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var attributes = frame.textRange.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                // ㉠, (가), ①: 글자 전체를 바탕체로 한 단계 크게. 글자마다 서체를 나눈 뒤 전체 속성을 바꾸면 illegal text range가 나므로 둘 중 하나만 한다
                if (label.symbol) {
                    attributes.textFont = symbolFont;
                    attributes.size = fontPt + 1;
                    attributes.baselineShift = 0;
                } else applyTextFonts(frame, label.upright);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2, dir = label.dir;
                var reach = (dir[0] === 0 && dir[1] === 0) ? 0 : LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt),
            // 소문자 변수(x)는 GSMediItaC1, GSMediumB1에 없는 기호는 HancomEQN
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var attributes = frame.textRange.characters[i].characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
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

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = OUTLINE_PT;
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-net.js). 길이는 pt
            // -------------------------------------------------------
            // 정육면체 전개도 11가지: 칸 [열, 행] 6개
            function cubeNets() {
                var nets = [];
                var ends = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]];   // 1-4-1형: 가운데 줄 4칸 위·아래 한 칸씩
                for (var i = 0; i < ends.length; i++) {
                    nets.push([[ends[i][0], 0], [0, 1], [1, 1], [2, 1], [3, 1], [ends[i][1], 2]]);
                }
                for (var x = 1; x <= 3; x++) nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [x, 2]]);   // 2-3-1형
                nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]]);   // 2-2-2형
                nets.push([[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]);   // 3-3형
                return nets;
            }

            // {faces:[[점…] 반시계], circles:[{center,radius}], sectors:[{center,radius,start,sweep}], message}
            function buildNet(kindIndex, v) {
                var net = { faces: [], circles: [], sectors: [], message: "" };
                var s = v.side;
                if (kindIndex === 0) {
                    var cells = cubeNets()[Math.max(0, Math.min(10, Math.round(v.net) - 1))];
                    for (var i = 0; i < cells.length; i++) {
                        var x = cells[i][0] * s, y = -cells[i][1] * s;
                        net.faces.push(rect(x, y - s, s, s));
                    }
                } else if (kindIndex === 1) {
                    // 옆면 네 개(가로 a·세로 b·a·b) 한 줄, 첫 a 면의 위·아래에 윗면·밑면
                    var a = s, b = v.depth, c = v.height, xs = [0, a, a + b, 2 * a + b, 2 * a + 2 * b];
                    for (var k = 0; k < 4; k++) net.faces.push(rect(xs[k], 0, xs[k + 1] - xs[k], c));
                    net.faces.push(rect(0, c, a, b));
                    net.faces.push(rect(0, -b, a, b));
                } else if (kindIndex === 2) {
                    var n = Math.round(v.count), h = v.height, middle = Math.floor((n - 1) / 2);
                    for (var f = 0; f < n; f++) net.faces.push(rect(f * s, 0, s, h));
                    net.faces.push(regularOnEdge([middle * s, h], [(middle + 1) * s, h], n));
                    net.faces.push(regularOnEdge([(middle + 1) * s, 0], [middle * s, 0], n));
                } else if (kindIndex === 3) {
                    var m = Math.round(v.count);
                    var circumradius = s / (2 * Math.sin(Math.PI / m));
                    if (v.lateral <= s / 2) {
                        net.message = "옆모서리가 한 변의 절반보다 길어야 합니다";
                        return net;
                    }
                    if (v.lateral <= circumradius) net.message = "옆모서리가 짧아 각뿔로 접히지 않습니다 (" + (circumradius / 2.834645669).toFixed(1) + "mm보다 길게)";
                    var base = regularOnEdge([0, 0], [s, 0], m);
                    net.faces.push(base);
                    var slantHeight = Math.sqrt(v.lateral * v.lateral - s * s / 4);
                    for (var e = 0; e < m; e++) {
                        var p = base[e], q = base[(e + 1) % m];
                        var outward = unit([q[1] - p[1], -(q[0] - p[0])]);
                        var apex = offset(midpoint(p, q), outward, slantHeight);
                        net.faces.push([q, p, apex]);
                    }
                } else if (kindIndex === 4) {
                    var r = v.radius, width = 2 * Math.PI * r;
                    net.faces.push(rect(0, 0, width, v.height));
                    net.circles.push({ center: [width / 2, v.height + r], radius: r });
                    net.circles.push({ center: [width / 2, -r], radius: r });
                } else if (kindIndex === 5) {
                    if (v.radius >= v.slant) {
                        net.message = "모선이 반지름보다 길어야 합니다";
                        return net;
                    }
                    var angle = 2 * Math.PI * v.radius / v.slant;
                    net.sectors.push({ center: [0, 0], radius: v.slant, start: -Math.PI / 2 - angle / 2, sweep: angle });
                    net.circles.push({ center: [0, -v.slant - v.radius], radius: v.radius });
                } else if (kindIndex === 6) {
                    var center = regularOnEdge([s, 0], [0, 0], 3);   // 꼭짓점이 아래로 향한 가운데 삼각형
                    net.faces.push(center);
                    for (var t = 0; t < 3; t++) net.faces.push(regularOnEdge(center[(t + 1) % 3], center[t], 3));
                } else if (kindIndex === 7) {
                    // 한 꼭짓점에 모인 네 면(부채 모양)과 그 바깥 변마다 한 면
                    var ring = [];
                    for (var j = 0; j <= 4; j++) {
                        var theta = (210 - 60 * j) * Math.PI / 180;
                        ring.push([s * Math.cos(theta), s * Math.sin(theta)]);
                    }
                    for (var g = 0; g < 4; g++) {
                        var fan = ccw([[0, 0], ring[g], ring[g + 1]]);
                        net.faces.push(fan);
                        net.faces.push(attachOutside(fan, ring[g], ring[g + 1], 3));
                    }
                } else if (kindIndex === 8) {
                    // 삼각형 10개 띠와 위·아래 5개씩
                    var hh = s * Math.sqrt(3) / 2;
                    for (var u = 0; u < 5; u++) {
                        var b0 = [u * s, 0], b1 = [(u + 1) * s, 0], t0 = [(u + 0.5) * s, hh], t1 = [(u + 1.5) * s, hh];
                        net.faces.push([b0, b1, t0]);
                        net.faces.push([t0, b1, t1]);
                        net.faces.push(regularOnEdge(t0, t1, 3));
                        net.faces.push(regularOnEdge(b1, b0, 3));
                    }
                }
                return net;
            }

            // 모서리 → 바깥선(한 면에만) · 접는 선(두 면이 나눔). 바깥선은 이어지는 한 패스로 묶는다
            function netLines(net) {
                var edges = {}, order = [];
                for (var f = 0; f < net.faces.length; f++) {
                    var face = net.faces[f];
                    for (var i = 0; i < face.length; i++) {
                        var a = face[i], b = face[(i + 1) % face.length];
                        var key = edgeKey(a, b);
                        if (!edges[key]) { edges[key] = { a: a, b: b, count: 0 }; order.push(key); }
                        edges[key].count++;
                    }
                }
                var lines = [], boundary = [];
                for (var k = 0; k < order.length; k++) {
                    var edge = edges[order[k]];
                    if (edge.count > 1) lines.push(straight([edge.a, edge.b], false, true));
                    else boundary.push(edge);
                }
                var loops = chainLoops(boundary);
                if (loops === null) {
                    for (var j = 0; j < boundary.length; j++) lines.push(straight([boundary[j].a, boundary[j].b], false, false));
                } else {
                    for (var l = 0; l < loops.length; l++) lines.push(straight(loops[l], true, false));
                }
                for (var s = 0; s < net.sectors.length; s++) {
                    var sector = net.sectors[s];
                    var points = [{ anchor: sector.center, left: sector.center, right: sector.center }].concat(
                        arcPoints(sector.center, sector.radius, sector.start, sector.sweep));
                    lines.push({ points: points, closed: true, fold: false });
                }
                return lines;
            }

            // 바깥 모서리를 이어 닫힌 고리들로. 한 점에 모서리가 2개가 아니면 null (따로 그린다)
            function chainLoops(edges) {
                var at = {};
                for (var i = 0; i < edges.length; i++) {
                    var ka = pointKey(edges[i].a), kb = pointKey(edges[i].b);
                    (at[ka] = at[ka] || []).push(i);
                    (at[kb] = at[kb] || []).push(i);
                }
                for (var key in at) if (at[key].length !== 2) return null;
                var used = [], loops = [];
                for (var start = 0; start < edges.length; start++) {
                    if (used[start]) continue;
                    var loop = [edges[start].a], current = start, point = edges[start].b;
                    used[start] = true;
                    while (pointKey(point) !== pointKey(loop[0])) {
                        loop.push(point);
                        var pair = at[pointKey(point)];
                        current = used[pair[0]] ? pair[1] : pair[0];
                        if (used[current]) return null;
                        used[current] = true;
                        point = pointKey(edges[current].a) === pointKey(point) ? edges[current].b : edges[current].a;
                    }
                    loops.push(loop);
                }
                return loops;
            }

            function netBounds(net) {
                var b = [Infinity, -Infinity, -Infinity, Infinity];   // left, top, right, bottom
                function add(x, y) {
                    b[0] = Math.min(b[0], x); b[2] = Math.max(b[2], x);
                    b[1] = Math.max(b[1], y); b[3] = Math.min(b[3], y);
                }
                for (var f = 0; f < net.faces.length; f++) for (var i = 0; i < net.faces[f].length; i++) add(net.faces[f][i][0], net.faces[f][i][1]);
                for (var c = 0; c < net.circles.length; c++) {
                    var circle = net.circles[c];
                    add(circle.center[0] - circle.radius, circle.center[1] - circle.radius);
                    add(circle.center[0] + circle.radius, circle.center[1] + circle.radius);
                }
                for (var s = 0; s < net.sectors.length; s++) {
                    var sector = net.sectors[s];
                    add(sector.center[0], sector.center[1]);
                    for (var t = 0; t <= 32; t++) {
                        var angle = sector.start + sector.sweep * t / 32;
                        add(sector.center[0] + sector.radius * Math.cos(angle), sector.center[1] + sector.radius * Math.sin(angle));
                    }
                }
                return b;
            }

            function rect(x, y, w, h) {
                return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
            }

            // 모서리 a→b의 왼쪽에 정n각형 (반시계)
            function regularOnEdge(a, b, n) {
                var points = [a, b], d = sub(b, a);
                for (var i = 2; i < n; i++) {
                    var angle = 2 * Math.PI * (i - 1) / n;
                    var step = [d[0] * Math.cos(angle) - d[1] * Math.sin(angle), d[0] * Math.sin(angle) + d[1] * Math.cos(angle)];
                    var last = points[points.length - 1];
                    points.push([last[0] + step[0], last[1] + step[1]]);
                }
                return points;
            }

            // 반시계 face의 모서리 p–q 바깥에 정n각형
            function attachOutside(face, p, q, n) {
                for (var i = 0; i < face.length; i++) {
                    var a = face[i], b = face[(i + 1) % face.length];
                    if (pointKey(a) === pointKey(p) && pointKey(b) === pointKey(q)) return regularOnEdge(q, p, n);
                    if (pointKey(a) === pointKey(q) && pointKey(b) === pointKey(p)) return regularOnEdge(p, q, n);
                }
                return regularOnEdge(q, p, n);
            }

            function ccw(points) {
                var area = 0;
                for (var i = 0; i < points.length; i++) {
                    var a = points[i], b = points[(i + 1) % points.length];
                    area += a[0] * b[1] - b[0] * a[1];
                }
                return area < 0 ? points.slice().reverse() : points;
            }

            function straight(anchors, closed, fold) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, closed: closed, fold: fold };
            }

            // 3차 베지어 원호 (90°씩 나눈다)
            function arcPoints(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radius;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var a = [center[0] + radius * cos, center[1] + radius * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: a,
                        left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                        right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
                    });
                }
                return points;
            }

            function pointKey(p) { return Math.round(p[0] * 100) + "," + Math.round(p[1] * 100); }
            function edgeKey(a, b) {
                var ka = pointKey(a), kb = pointKey(b);
                return ka < kb ? ka + "|" + kb : kb + "|" + ka;
            }
            function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
            // 글자를 붙일 자리(면·원·부채꼴)를 읽는 순서로: 위에서 아래, 같은 줄은 왼쪽에서 오른쪽. 줄은 가장 작은 자리 크기의 1/4 안이면 같다
            function netRegions(net) {
                var regions = [], i, k;
                for (i = 0; i < net.faces.length; i++) {
                    var f = net.faces[i], cx = 0, cy = 0, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
                    for (k = 0; k < f.length; k++) {
                        cx += f[k][0] / f.length; cy += f[k][1] / f.length;
                        x0 = Math.min(x0, f[k][0]); x1 = Math.max(x1, f[k][0]); y0 = Math.min(y0, f[k][1]); y1 = Math.max(y1, f[k][1]);
                    }
                    regions.push({kind: "poly", points: f, center: [cx, cy], size: Math.min(x1 - x0, y1 - y0)});
                }
                for (i = 0; i < net.circles.length; i++) regions.push({kind: "circle", circle: net.circles[i], center: net.circles[i].center, size: net.circles[i].radius});
                for (i = 0; i < net.sectors.length; i++) {
                    var sc = net.sectors[i], mid = sc.start + sc.sweep / 2;
                    regions.push({kind: "sector", sector: sc, center: [sc.center[0] + Math.cos(mid) * sc.radius * 0.6, sc.center[1] + Math.sin(mid) * sc.radius * 0.6], size: sc.radius * 0.5});
                }
                var tol = Infinity;
                for (i = 0; i < regions.length; i++) tol = Math.min(tol, regions[i].size * 0.25);
                regions.sort(function(a, b) { return Math.abs(a.center[1] - b.center[1]) > tol ? b.center[1] - a.center[1] : a.center[0] - b.center[0]; });
                return regions;
            }

            // 한 면에만 있는 모서리(바깥 모서리)와 그 면의 가운데(inside)
            function netOuterEdges(net) {
                var edges = {}, order = [], out = [];
                for (var f = 0; f < net.faces.length; f++) {
                    var face = net.faces[f], cx = 0, cy = 0, k;
                    for (k = 0; k < face.length; k++) { cx += face[k][0] / face.length; cy += face[k][1] / face.length; }
                    for (k = 0; k < face.length; k++) {
                        var a = face[k], b = face[(k + 1) % face.length], key = edgeKey(a, b);
                        if (!edges[key]) { edges[key] = {a: a, b: b, inside: [cx, cy], count: 0}; order.push(key); }
                        edges[key].count++;
                    }
                }
                for (var j = 0; j < order.length; j++) if (edges[order[j]].count === 1) out.push(edges[order[j]]);
                return out;
            }

            // ㉠·(가)·①은 바탕체로 한 단계 크게(그림 제작 규칙 5.3), 홀로 쓴 소문자(x)만 변수로 기울인다(5.5)
            function netLabelStyle(text) {
                return {upright: !/^[a-z]$/.test(text), symbol: /^([\u3260-\u327F\u2460-\u2473]|\([가-힣]\))$/.test(text)};
            }

            // 주사위 눈 자리 (가운데 0, 모서리 ±1)
            function netPipSpots(n) {
                var c = [0, 0], tl = [-1, 1], tr = [1, 1], bl = [-1, -1], br = [1, -1], ml = [-1, 0], mr = [1, 0];
                return [[], [c], [tl, br], [tl, c, br], [tl, tr, bl, br], [tl, tr, c, bl, br], [tl, tr, ml, mr, bl, br]][n] || [];
            }

            // 면 글자(faceText)·칠하기(끝의 *)·주사위 눈(dicePips)·길이 글자(lengthText, keys 순서) → {fills: 자리, pips, labels, lines: 반지름 선}
            function netMarks(net, keys, sizes, o) {
                var marks = {fills: [], pips: [], labels: [], lines: []};
                var regions = netRegions(net), items = String(o.faceText || "").split(","), circleLabels = [], i, k;
                for (i = 0; i < regions.length && i < items.length; i++) {
                    var raw = items[i].replace(/^\s+|\s+$/g, ""), text = raw.replace(/\*$/, "").replace(/\s+$/, ""), region = regions[i];
                    if (/\*$/.test(raw)) marks.fills.push(region);
                    if (text === "") continue;
                    if (o.dicePips && region.kind === "poly" && region.points.length === 4 && /^[1-6]$/.test(text)) {
                        var spots = netPipSpots(Number(text)), side = region.size;
                        for (k = 0; k < spots.length; k++) {
                            marks.pips.push({center: [region.center[0] + spots[k][0] * side * 0.27, region.center[1] + spots[k][1] * side * 0.27], radius: side * (text === "1" ? 0.13 : 0.09)});
                        }
                        continue;
                    }
                    var style = netLabelStyle(text), faceLabel = {text: text, at: region.center, dir: [0, 0], upright: style.upright, symbol: style.symbol};
                    marks.labels.push(faceLabel);
                    if (region.kind === "circle") circleLabels.push({circle: region.circle, label: faceLabel});
                }
                var lengths = String(o.lengthText || "").split(","), edges = netOuterEdges(net), used = {};
                for (i = 0; i < keys.length && i < lengths.length; i++) {
                    var label = lengths[i].replace(/^\s+|\s+$/g, ""), key = keys[i], size = sizes[key];
                    if (label === "") continue;
                    var lstyle = netLabelStyle(label);
                    if (key === "radius" && net.circles.length > 0) {
                        // 면 글자가 없는 원 중 가장 아래에 가운데에서 오른쪽으로 반지름 선, 글자는 그 위.
                        // 모든 원에 글자가 있으면 가장 아래 원에 긋고 그 원의 면 글자를 반지름 선 왼쪽으로 비킨다
                        var low = null, lowLabeled = null, c;
                        for (k = 0; k < net.circles.length; k++) {
                            var labeledAt = null;
                            for (c = 0; c < circleLabels.length; c++) if (circleLabels[c].circle === net.circles[k]) labeledAt = circleLabels[c].label;
                            if (labeledAt === null && (low === null || net.circles[k].center[1] < low.center[1])) low = net.circles[k];
                            if (lowLabeled === null || net.circles[k].center[1] < lowLabeled.circle.center[1]) lowLabeled = {circle: net.circles[k], label: labeledAt};
                        }
                        if (low === null) {
                            low = lowLabeled.circle;
                            lowLabeled.label.at = [low.center[0] - low.radius * 0.5, low.center[1]];
                        }
                        var end = [low.center[0] + low.radius, low.center[1]];
                        marks.lines.push([low.center, end]);
                        marks.labels.push({text: label, at: midpoint(low.center, end), dir: [0, 1], upright: lstyle.upright, symbol: lstyle.symbol});
                        continue;
                    }
                    if (key === "slant" && net.sectors.length > 0) {
                        // 부채꼴의 시작 쪽 반지름 변: 부채꼴은 반시계로 열리므로 바깥은 시계 방향 법선
                        var sc = net.sectors[0], tip = [sc.center[0] + Math.cos(sc.start) * sc.radius, sc.center[1] + Math.sin(sc.start) * sc.radius];
                        var along = unit(sub(tip, sc.center));
                        marks.labels.push({text: label, at: midpoint(sc.center, tip), dir: [along[1], -along[0]], upright: lstyle.upright, symbol: lstyle.symbol});
                        continue;
                    }
                    // 같은 길이의 바깥 모서리 중 가장 아래(같으면 왼쪽)에, 그 면의 바깥쪽으로. 이미 쓴 모서리는 건너뛴다
                    var best = -1, bestY = 0, bestX = 0;
                    for (k = 0; k < edges.length; k++) {
                        var ed = edges[k], len = Math.sqrt((ed.b[0] - ed.a[0]) * (ed.b[0] - ed.a[0]) + (ed.b[1] - ed.a[1]) * (ed.b[1] - ed.a[1]));
                        if (used[k] || !(size > 0) || Math.abs(len - size) > size * 0.005) continue;
                        var my = (ed.a[1] + ed.b[1]) / 2, mx = (ed.a[0] + ed.b[0]) / 2;
                        if (best < 0 || my < bestY - 1e-6 || (Math.abs(my - bestY) <= 1e-6 && mx < bestX)) { best = k; bestY = my; bestX = mx; }
                    }
                    if (best < 0) continue;
                    used[best] = true;
                    var be = edges[best], at = midpoint(be.a, be.b), d = unit(sub(be.b, be.a)), n = [d[1], -d[0]];
                    if ((be.inside[0] - at[0]) * n[0] + (be.inside[1] - at[1]) * n[1] > 0) n = [-n[0], -n[1]];
                    marks.labels.push({text: label, at: at, dir: [n[0] + 0, n[1] + 0], upright: lstyle.upright, symbol: lstyle.symbol});   // + 0: -0을 0으로
                }
                return marks;
            }

            // -------------------------------------------------------
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-net.js). 길이는 pt
            // -------------------------------------------------------

            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
                return [v[0] / length, v[1] / length];
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { OUTLINE_PT = value; }
                if (group === "guide") { FOLD_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return OUTLINE_PT;
                if (group === "guide") return FOLD_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                if (p.length !== 4 || p[0] !== "v1") return;
                var groups = ["axis", "graph", "guide"];
                for (var i = 0; i < 3; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var groups = ["axis", "graph", "guide"], parts = ["v1"];
                for (var i = 0; i < 3; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(groups[i]) ? String(currentLineWidth(groups[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = ["left", "top"];
                panel.margins = [12, 16, 12, 12];
                panel.spacing = 6;
                return panel;
            }

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unitText ? " (" + unitText + "):" : ":")).preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var parts = ["v2", kind, values.net, values.count, values.side, values.depth, values.height, values.lateral,
                    values.radius, values.slant, dashedFolds ? "1" : "0", offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
                    encodeURIComponent(faceText), encodeURIComponent(lengthText), dicePips ? "1" : "0", shadeK, fontPt];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                // v2는 표시(면 글자·길이 글자·주사위 눈·칠하기 농도·글자 크기)까지 19칸, 옛 v1은 14칸
                if (!((p[0] === "v2" && p.length === 19) || (p[0] === "v1" && p.length === 14))) return;
                kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                values.net = Math.round(restoreNumber(p[2], values.net, 1, 11));
                values.count = Math.round(restoreNumber(p[3], values.count, 3, 8));
                values.side = restoreNumber(p[4], values.side, 3, 60);
                values.depth = restoreNumber(p[5], values.depth, 3, 60);
                values.height = restoreNumber(p[6], values.height, 3, 80);
                values.lateral = restoreNumber(p[7], values.lateral, 3, 80);
                values.radius = restoreNumber(p[8], values.radius, 2, 40);
                values.slant = restoreNumber(p[9], values.slant, 3, 80);
                dashedFolds = p[10] === "1";
                offsetXmm = restoreNumber(p[11], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[12], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[13] === "1";
                if (p[0] === "v2") {
                    try {
                        faceText = decodeURIComponent(p[14]);
                        lengthText = decodeURIComponent(p[15]);
                    } catch (decodeError) {}
                    dicePips = p[16] === "1";
                    shadeK = restoreNumber(p[17], shadeK, 5, 60);
                    fontPt = restoreNumber(p[18], fontPt, 5, 14);
                }
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 원 (원래 Object_CircleProps.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 원의 성질: 선택한 원(선택이 없으면 마지막에 쓴 지름, 없으면 40mm의 원을 대지 가운데에 새로 그린다) 위의 점 A·B·P·T를 각도(오른쪽 0°, 반시계)로 정하고
    // 현 AB, 반지름 OA·OB, 원주각 ∠APB, 중심각·원주각 표시와 각도 값, 중심에서 현에 내린 수선 OM(직각 표시),
    // 부채꼴 AOB(A에서 반시계로 B까지), T에서의 접선(직각 표시), 원 밖의 점 Q에서 그은 두 접선 QC·QD,
    // 내접 사각형 ABCD(마주 보는 두 각), 접선과 현 TA가 이루는 각과 원주각 ∠TPA를 골라 그린다.
    // 선 두께는 평가원 그림 기준: 현·반지름·접선 0.8pt, 수선·보조선(점선)·각 표시 0.3pt. 원 선은 기본으로 0.8pt로 맞춘다(끄면 그대로).
    function makeCirclePropsEngine() {
        var api = {label: "원", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "CircleProps/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 30;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var MARK_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var SECTOR_K = 15;
            var SHAPE_STROKE_PT = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["center", "chord", "radii", "inscribed", "inscribedMark", "centralMark", "values",
                "perpendicular", "sector", "tangent", "external", "names", "quad", "tangentChord"];
            var ANGLE_KEYS = ["a", "b", "p", "t", "q", "c", "d"];

            var doc = app.activeDocument;

            // 선택이 비면 마지막에 쓴 지름(없으면 기본 지름)의 원을 대지 가운데에 새로 그린다. 원 패스는 미리보기를 처음 그릴 때 만든다
            var FRAME_KEY = PREF_KEY + "/frame";
            var DEFAULT_FRAME_MM = {w: 40, h: 40};
            var target = null;
            var generated = false;
            var center, radius;
            var sel = doc.selection;
            if (sel && sel.length > 0) {
                if (sel.length === 1 && sel[0].typename === "PathItem" && sel[0].closed) target = sel[0];
                var bounds = target ? target.geometricBounds : null;
                if (target === null || Math.abs((bounds[2] - bounds[0]) - (bounds[1] - bounds[3])) > (bounds[2] - bounds[0]) * 0.01 ||
                        !anchorsOnCircle(target, bounds)) {
                    return "가로·세로가 같은 원(패스) 하나를 선택해주세요.";
                }
                center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
                radius = (bounds[2] - bounds[0]) / 2;
            } else {
                generated = true;
                var frame = loadFrame(DEFAULT_FRAME_MM.w, DEFAULT_FRAME_MM.h);
                var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
                center = [(artboardRect[0] + artboardRect[2]) / 2, (artboardRect[1] + artboardRect[3]) / 2];
                radius = frame.w * MM_TO_PT / 2;
            }

            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션 (각도는 도)
            var opt = {
                center: true, chord: true, radii: true, inscribed: true, inscribedMark: true, centralMark: true, values: false,
                perpendicular: false, sector: false, tangent: false, external: false, names: true, quad: false, tangentChord: false,
                a: 210, b: 330, p: 100, t: 45, q: 0, c: 20, d: 120, qDistance: 2, markMm: 3
            };
            var normalizeStroke = true;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {a: opt.a, b: opt.b, p: opt.p, t: opt.t, q: opt.q, c: opt.c, d: opt.d, qDistance: opt.qDistance, markMm: opt.markMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {graph: MAIN_PT, guide: GUIDE_PT, mark: MARK_PT};
            loadLineWidths();

            var previewGroup = null;
            var originalStroked = target ? target.stroked : true;
            var originalStrokeWidth = target ? target.strokeWidth : SHAPE_STROKE_PT;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var elementPanel = addPanel(win, "그릴 것");
            var checks = {};
            addCheckRow(elementPanel, [["center", "중심 O"], ["chord", "현 AB"], ["radii", "반지름 OA·OB"]]);
            addCheckRow(elementPanel, [["inscribed", "원주각 ∠APB"], ["inscribedMark", "원주각 표시"], ["centralMark", "중심각 표시"]]);
            addCheckRow(elementPanel, [["values", "각도 값"], ["perpendicular", "수선 OM"], ["sector", "부채꼴 AOB"]]);
            addCheckRow(elementPanel, [["tangent", "T의 접선"], ["external", "Q의 두 접선"], ["names", "점 이름"]]);
            addCheckRow(elementPanel, [["quad", "내접 사각형 ABCD"], ["tangentChord", "접선과 현 TA"]]);
            checks.quad.helpTip = "원 위의 A, B, C, D를 이은 사각형. 각도 값을 켜면 마주 보는 두 각 ∠A, ∠C (합 180°)";
            checks.tangentChord.helpTip = "T의 접선과 현 TA가 이루는 각, 그 각 안의 호 TA에 대한 원주각 ∠TPA (P는 반대쪽 호 위)";
            checks.sector.helpTip = "A에서 반시계로 B까지";
            checks.external.helpTip = "원 밖의 점 Q에서 그은 두 접선 QC·QD";

            var anglePanel = addPanel(win, "점 위치 (오른쪽 0°, 반시계)");
            var angleRows = {
                a: addValueRow(anglePanel, "A", "°", opt.a, 0, 359, 1, 0),
                b: addValueRow(anglePanel, "B", "°", opt.b, 0, 359, 1, 0),
                p: addValueRow(anglePanel, "P", "°", opt.p, 0, 359, 1, 0),
                t: addValueRow(anglePanel, "T", "°", opt.t, 0, 359, 1, 0),
                q: addValueRow(anglePanel, "Q 방향", "°", opt.q, 0, 359, 1, 0),
                c: addValueRow(anglePanel, "C (사각형)", "°", opt.c, 0, 359, 1, 0),
                d: addValueRow(anglePanel, "D (사각형)", "°", opt.d, 0, 359, 1, 0)
            };
            var distanceControls = addValueRow(anglePanel, "Q 거리", "반지름 배", opt.qDistance, 1.2, 4, 0.1, 1);

            var sizePanel = addPanel(win, "크기");
            var markControls = addValueRow(sizePanel, "각 표시 반지름", "mm", opt.markMm, 1, 10, 0.1, 1);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var normalizeCheck = lineWidthPanel.add("checkbox", undefined, "원 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
            normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var markWidthControls = addValueRow(lineWidthPanel, "표시", "pt", currentLineWidth("mark"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "점선: 수선 OM, 중심에서 접점·Q까지 OC·OD·OQ";
            markWidthControls.input.helpTip = "원주각·중심각·접선과 현의 각 호, 직각 표시";
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(markWidthControls, function(value) { setLineWidth("mark", value); }, LINE_DEFAULTS.mark);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);


            normalizeCheck.value = normalizeStroke;
            normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
            for (var k = 0; k < ANGLE_KEYS.length; k++) bindAngleRow(ANGLE_KEYS[k]);
            bindValueRow(distanceControls, function(value) { opt.qDistance = value; }, initial.qDistance);
            bindValueRow(markControls, function(value) { opt.markMm = value; }, initial.markMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                if (!generated) saveFrame(radius * 2 / MM_TO_PT);
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview(true);
                app.redraw();
            };
            return null;

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                    checks[items[i][0]] = check;
                }
            }

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
                    updatePreview();
                };
            }

            function bindAngleRow(key) {
                bindValueRow(angleRows[key], function(value) { opt[key] = value; }, initial[key]);
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview(!previewEnabled);
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            // removeGenerated: 새로 그린 원도 지운다 (미리보기를 끄거나 취소·탭 이동)
            function clearPreview(removeGenerated) {
                if (target !== null && !generated) {
                    try {
                        target.stroked = originalStroked;
                        target.strokeWidth = originalStrokeWidth;
                    } catch (restoreError) {}
                }
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
                if (removeGenerated && generated && target !== null) {
                    try { target.remove(); } catch (e) {}
                    target = null;
                }
            }

            // 선택이 없을 때의 원: 면 없음, 검은 선 0.8pt (선택한 원에 맞춰 주는 모양과 같다)
            function ensureTarget() {
                if (target !== null) return;
                target = doc.activeLayer.pathItems.ellipse(center[1] + radius, center[0] - radius, radius * 2, radius * 2);
                target.filled = false;
                target.stroked = true;
                target.strokeColor = makeGray(100);
                target.strokeWidth = SHAPE_STROKE_PT;
            }

            function loadFrame(fallbackW, fallbackH) {
                try {
                    var p = app.preferences.getStringPreference(FRAME_KEY).split("|");
                    if (p.length === 3 && p[0] === "v1") {
                        var w = parseFloat(p[1]), h = parseFloat(p[2]);
                        if (w > 0.1 && h > 0.1 && w <= 2000 && h <= 2000) return {w: w, h: h};
                    }
                } catch (e) {}
                return {w: fallbackW, h: fallbackH};
            }

            function saveFrame(diameterMm) {
                try { app.preferences.setStringPreference(FRAME_KEY, ["v1", diameterMm.toFixed(2), diameterMm.toFixed(2)].join("|")); } catch (e) {}
            }

            function buildPreview() {
                ensureTarget();
                if (normalizeStroke) {
                    target.stroked = true;
                    target.strokeWidth = SHAPE_STROKE_PT;
                }
                // 부채꼴 채우기는 원 선의 안쪽 가장자리까지만 (선을 덮지 않게)
                var drawing = buildCircleFigure(center, radius, opt, opt.markMm * MM_TO_PT, target.stroked ? target.strokeWidth / 2 : 0);
                previewGroup = target.parent.groupItems.add();
                previewGroup.move(target, ElementPlacement.PLACEBEFORE);
                previewGroup.name = "원의 성질";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            function drawBezier(points, closed) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                }
                path.closed = closed;
                return path;
            }

            // line: {points, kind:"main"|"guide"|"mark"}
            function addPath(line) {
                var path = drawBezier(line.points, !!line.closed);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "mark" ? MARK_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = line.closed ? StrokeJoin.BEVELENDJOIN : StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function addFill(points) {
                var path = drawBezier(points, true);
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(SECTOR_K);
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
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
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt). 점 이름은 똑바로
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
                    attributes.textFont = korean ? korFont : engFont;
                    attributes.baselineShift = korean ? 0 : ENG_BASELINE_PT;
                }
            }

            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
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

            // 가로·세로가 같은 삼각형·사각형은 원이 아니다: 모든 앵커가 중심에서 반지름만큼 떨어져 있어야 한다
            function anchorsOnCircle(path, box) {
                var cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, r = (box[2] - box[0]) / 2;
                if (path.pathPoints.length < 4) return false;
                for (var i = 0; i < path.pathPoints.length; i++) {
                    var a = path.pathPoints[i].anchor;
                    if (Math.abs(Math.sqrt((a[0] - cx) * (a[0] - cx) + (a[1] - cy) * (a[1] - cy)) - r) > r * 0.02) return false;
                }
                return true;
            }

            // -------------------------------------------------------
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-circle-props.js)
            // -------------------------------------------------------
            function buildCircleFigure(O, r, o, markR, fillInset) {
                var out = { fills: [], lines: [], dots: [], texts: [] };
                var rad = Math.PI / 180;
                function on(deg) { return [O[0] + r * Math.cos(deg * rad), O[1] + r * Math.sin(deg * rad)]; }
                function name(text, point) { if (o.names) out.texts.push({ text: text, at: point, dir: unit(sub(point, O)) }); }
                var A = on(o.a), B = on(o.b), P = on(o.p);
                var sweep = ((o.b - o.a) % 360 + 360) % 360 * rad;   // A에서 반시계로 B까지 (중심각)
                var usesAB = o.chord || o.radii || o.inscribed || o.centralMark || o.perpendicular || o.sector || o.quad;

                if (o.sector) out.fills.push([plain(O)].concat(arcPoints(O, r - (fillInset || 0), o.a * rad, sweep)));
                if (o.chord && !o.radii && !o.inscribed) out.lines.push(line([A, B], "main"));
                if (o.radii) {
                    if (o.chord) out.lines.push(line([O, A, B], "main", true));
                    else out.lines.push(line([A, O, B], "main"));
                }
                if (o.centralMark && sweep > 0) {
                    out.lines.push({ points: arcPoints(O, markR, o.a * rad, sweep), kind: "mark" });
                    if (o.values) out.texts.push({ text: formatDegrees(sweep / rad), at: O, dir: unitAt(o.a * rad + sweep / 2), clear: markR });
                }
                if (o.inscribed) {
                    out.lines.push(line([A, P, B], "main", !!o.chord));
                    name("P", P);
                    var span = smallAngle(P, A, B);
                    if (o.inscribedMark) out.lines.push({ points: arcPoints(P, markR, span.start, span.sweep), kind: "mark" });
                    if (o.values) out.texts.push({ text: formatDegrees(span.sweep / rad), at: P, dir: unitAt(span.start + span.sweep / 2), clear: markR });
                }
                if (o.perpendicular) {
                    var M = midpoint(A, B);
                    if (dist(O, M) > r * 1e-6) {
                        out.lines.push(line([O, M], "guide"));
                        out.lines.push(rightAngle(M, unit(sub(O, M)), unit(sub(B, M)), markR * 0.6));
                        name("M", M);
                    }
                }
                if (usesAB) {
                    name("A", A);
                    name("B", B);
                }
                if (o.quad) {
                    // 원 위의 네 점을 A에서 반시계 순서로 이어 사각형 (마주 보는 두 각의 합 180°)
                    var Cq = on(o.c), Dq = on(o.d);
                    var ring = [[o.a, A, "A"], [o.b, B, "B"], [o.c, Cq, "C"], [o.d, Dq, "D"]];
                    ring.sort(function(u, v) { return ((u[0] - o.a) % 360 + 360) % 360 - ((v[0] - o.a) % 360 + 360) % 360; });
                    out.lines.push(line([ring[0][1], ring[1][1], ring[2][1], ring[3][1]], "main", true));
                    name("C", Cq);
                    name("D", Dq);
                    if (o.values || o.inscribedMark) {
                        for (var qi = 0; qi < 4; qi++) {
                            if (ring[qi][2] !== "A" && ring[qi][2] !== "C") continue;
                            var V = ring[qi][1], span2 = smallAngle(V, ring[(qi + 3) % 4][1], ring[(qi + 1) % 4][1]);
                            if (o.inscribedMark) out.lines.push({ points: arcPoints(V, markR, span2.start, span2.sweep), kind: "mark" });
                            if (o.values) out.texts.push({ text: formatDegrees(span2.sweep / rad), at: V, dir: unitAt(span2.start + span2.sweep / 2), clear: markR });
                        }
                    }
                }
                if (o.tangent || o.tangentChord) {
                    var T = on(o.t), along = [-Math.sin(o.t * rad), Math.cos(o.t * rad)];
                    out.lines.push(line([offset(T, along, -r * 0.9), offset(T, along, r * 0.9)], "main"));
                    if (o.tangent) {
                        out.lines.push(line([O, T], "main"));
                        out.lines.push(rightAngle(T, unit(sub(O, T)), along, markR * 0.6));
                    }
                    name("T", T);
                }
                if (o.tangentChord) {
                    // 현 TA와 접선이 이루는 각은 P의 반대쪽 (그 각 안의 호 TA 위에 P가 없게), 원주각 ∠TPA와 같다
                    var T2 = on(o.t), along2 = [-Math.sin(o.t * rad), Math.cos(o.t * rad)], TA = sub(A, T2);
                    var sideP = TA[0] * (P[1] - T2[1]) - TA[1] * (P[0] - T2[0]);
                    var sideRay = TA[0] * along2[1] - TA[1] * along2[0];
                    var ray = (sideP > 0) === (sideRay > 0) ? [-along2[0], -along2[1]] : along2;
                    // TA는 닫힌 삼각형의 마지막 변이다.
                    out.lines.push(line([T2, P, A], "main", true));
                    var chordSpan = smallAngle(T2, A, offset(T2, ray, r));
                    var pSpan = smallAngle(P, T2, A);
                    out.lines.push({ points: arcPoints(T2, markR, chordSpan.start, chordSpan.sweep), kind: "mark" });
                    out.lines.push({ points: arcPoints(P, markR, pSpan.start, pSpan.sweep), kind: "mark" });
                    if (o.values) {
                        out.texts.push({ text: formatDegrees(chordSpan.sweep / rad), at: T2, dir: unitAt(chordSpan.start + chordSpan.sweep / 2), clear: markR });
                        out.texts.push({ text: formatDegrees(pSpan.sweep / rad), at: P, dir: unitAt(pSpan.start + pSpan.sweep / 2), clear: markR });
                    }
                    if (!usesAB) name("A", A);
                    if (!o.inscribed) name("P", P);
                }
                if (o.external) {
                    var Q = [O[0] + o.qDistance * r * Math.cos(o.q * rad), O[1] + o.qDistance * r * Math.sin(o.q * rad)];
                    var alpha = Math.acos(1 / o.qDistance) / rad;
                    var C = on(o.q + alpha), D = on(o.q - alpha);
                    out.lines.push(line([C, Q, D], "main"));
                    out.lines.push(line([O, C], "guide"));
                    out.lines.push(line([O, D], "guide"));
                    out.lines.push(line([O, Q], "guide"));
                    out.lines.push(rightAngle(C, unit(sub(O, C)), unit(sub(Q, C)), markR * 0.6));
                    out.lines.push(rightAngle(D, unit(sub(O, D)), unit(sub(Q, D)), markR * 0.6));
                    name("Q", Q);
                    // 내접 사각형이 C, D를 쓰면 접점은 E, F
                    name(o.quad ? "E" : "C", C);
                    name(o.quad ? "F" : "D", D);
                }
                if (o.center) {
                    out.dots.push(O);
                    // 중심각·반지름·부채꼴이 있으면 그 반대쪽, 없으면 아래
                    var away = (o.centralMark || o.radii || o.sector) && sweep > 0 ? unitAt(o.a * rad + sweep / 2 + Math.PI) : [0, -1];
                    if (o.names) out.texts.push({ text: "O", at: O, dir: away, clear: DOT_RADIUS_MM * 2.834645669 });
                }
                return out;
            }

            // V에서 두 점 쪽 선분 사이의 작은 각: 시작 방향과 반시계 크기(라디안)
            function smallAngle(V, A, B) {
                var start = angleOf(sub(A, V)), sweep = angleOf(sub(B, V)) - start;
                while (sweep < 0) sweep += Math.PI * 2;
                if (sweep > Math.PI) {
                    start = angleOf(sub(B, V));
                    sweep = Math.PI * 2 - sweep;
                }
                return { start: start, sweep: sweep };
            }

            function rightAngle(V, d1, d2, size) {
                var p1 = offset(V, d1, size);
                return line([p1, offset(p1, d2, size), offset(V, d2, size)], "mark");
            }

            // 60°, 47.5° (소수 한 자리까지, .0은 뺀다)
            function formatDegrees(value) {
                var rounded = Math.round(value * 10) / 10;
                return (rounded === Math.round(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1)) + "°";
            }

            // 3차 베지어 원호 (90°씩 나눈다)
            function arcPoints(c, radiusValue, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radiusValue;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var a = [c[0] + radiusValue * cos, c[1] + radiusValue * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: a,
                        left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                        right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
                    });
                }
                return points;
            }

            function line(anchors, kind, closed) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push(plain(anchors[i]));
                return { points: points, kind: kind, closed: !!closed };
            }

            function plain(p) { return { anchor: p, left: p, right: p }; }
            function unitAt(angle) { return [Math.cos(angle), Math.sin(angle)]; }
            function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function angleOf(v) { return Math.atan2(v[1], v[0]); }
            function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0, -1];
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { MAIN_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "mark") { MARK_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return MAIN_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "mark") return MARK_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = ["left", "top"];
                panel.margins = [12, 16, 12, 12];
                panel.spacing = 6;
                return panel;
            }

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (" + unitText + "):").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var angles = [];
                for (var j = 0; j < ANGLE_KEYS.length; j++) angles.push(opt[ANGLE_KEYS[j]]);
                var parts = ["v1", flags, angles.join(","), opt.qDistance, opt.markMm, normalizeStroke ? "1" : "0", fontPt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 10 || p[1].length !== FLAG_KEYS.length) return;
                var angles = p[2].split(",");
                if (angles.length !== ANGLE_KEYS.length) return;
                for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
                for (var j = 0; j < ANGLE_KEYS.length; j++) opt[ANGLE_KEYS[j]] = Math.round(restoreNumber(angles[j], opt[ANGLE_KEYS[j]], 0, 359));
                opt.qDistance = restoreNumber(p[3], opt.qDistance, 1.2, 4);
                opt.markMm = restoreNumber(p[4], opt.markMm, 1, 10);
                normalizeStroke = p[5] === "1";
                fontPt = restoreNumber(p[6], fontPt, 5, 14);
                offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[9] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 색칠한 부분 ====
    // 색칠한 부분의 넓이·둘레 문제 그림: 정사각형·원·부채꼴에 사분원·반원·원을 겹친 교과서 모양 9가지를 골라 그린다.
    // 칠한 영역은 호와 선분을 이어 붙인 닫힌 패스(구멍이 있으면 복합 패스)라 패스파인더 없이 정확하다. 도형 선은 따로 위에 긋는다.
    // 문제 길이 L(한 변·반지름·지름)로 넓이와 둘레를 25π/2, 10π+10처럼 π를 남겨 창에 보여 준다.
    // 선 두께: 도형 0.8pt, 반지름 보조선·각 표시 0.3pt. 칠하기는 K. 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeShadedAreaEngine() {
        var api = {label: "색칠한 부분", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "MiddleShadedArea/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(π, °)
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var MARK_PT = 0.3;
            var DOT_RADIUS_MM = 0.5;
            var LABEL_GAP_MM = 0.8;
            // 모양: 이름, L의 뜻, 비율·각 행을 쓰는지
            var SHAPES = [
                { name: "사분원 - 반원", length: "한 변", ratio: false, angle: false },
                { name: "두 사분원 (잎)", length: "한 변", ratio: false, angle: false },
                { name: "정사각형 - 사분원", length: "한 변", ratio: false, angle: false },
                { name: "정사각형 - 원", length: "한 변", ratio: false, angle: false },
                { name: "네 반원 (꽃잎)", length: "한 변", ratio: false, angle: false },
                { name: "원 - 내접 정사각형", length: "반지름", ratio: false, angle: false },
                { name: "고리 (동심원)", length: "큰 반지름", ratio: true, angle: true },
                { name: "부채꼴", length: "반지름", ratio: false, angle: true },
                { name: "반원 속 두 반원", length: "지름 AB", ratio: true, angle: false }
            ];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["names", "center", "lengthText"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var shape = 0;
            var sizeMm = 36;
            var lengthValue = 10;
            var ratioPercent = 50;
            var angleDeg = 120;
            var shadeK = 20;
            var fontPt = 8;
            var unitText = "cm";
            var opt = { names: true, center: true, lengthText: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {lengthValue: lengthValue, ratioPercent: ratioPercent, angleDeg: angleDeg, sizeMm: sizeMm, shadeK: shadeK, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {graph: MAIN_PT, guide: GUIDE_PT, mark: MARK_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var shapePanel = addPanel(win, "모양");
            var shapeRow = shapePanel.add("group");
            shapeRow.add("statictext", undefined, "모양:");
            var shapeNames = [];
            for (var sn = 0; sn < SHAPES.length; sn++) shapeNames.push(SHAPES[sn].name);
            var shapeList = shapeRow.add("dropdownlist", undefined, shapeNames);
            shapeList.selection = shape;
            var lengthControls = addValueRow(shapePanel, "한 변 L", "", lengthValue, 1, 30, 1, 0);
            lengthControls.input.helpTip = "문제에 나오는 길이. 넓이·둘레 계산에 쓴다";
            var ratioControls = addValueRow(shapePanel, "비율", "%", ratioPercent, 10, 90, 5, 0);
            ratioControls.input.helpTip = "고리: 작은 반지름 = 큰 반지름의 몇 %. 반원 속 두 반원: 점 C가 AB의 몇 % 자리";
            var angleControls = addValueRow(shapePanel, "중심각", "°", angleDeg, 10, 360, 5, 0);
            angleControls.input.helpTip = "부채꼴·고리의 중심각. 고리를 360°로 두면 원 두 개 사이 전체";

            var drawPanel = addPanel(win, "그리기");
            var sizeControls = addValueRow(drawPanel, "크기", "mm", sizeMm, 10, 80, 1, 0);
            sizeControls.input.helpTip = "그림에서 L의 길이";
            var shadeControls = addValueRow(drawPanel, "칠하기 농도", "K", shadeK, 5, 60, 5, 0);
            var fontControls = addValueRow(drawPanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var checkRow = drawPanel.add("group");
            var namesCheck = checkRow.add("checkbox", undefined, "꼭짓점 이름");
            var centerCheck = checkRow.add("checkbox", undefined, "중심 O");
            var lengthCheck = checkRow.add("checkbox", undefined, "길이 글자");
            var unitInput = checkRow.add("edittext", undefined, unitText);
            unitInput.preferredSize.width = 40;
            unitInput.helpTip = "길이 글자의 단위 (10 cm). 비우면 수만";

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var markWidthControls = addValueRow(lineWidthPanel, "표시", "pt", currentLineWidth("mark"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "반지름 선 (원 - 내접 정사각형, 360° 고리)";
            markWidthControls.input.helpTip = "중심각 호 (부채꼴, 고리)";
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(markWidthControls, function(value) { setLineWidth("mark", value); }, LINE_DEFAULTS.mark);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            namesCheck.value = opt.names;
            centerCheck.value = opt.center;
            lengthCheck.value = opt.lengthText;
            refreshRows();
            shapeList.onChange = function() {
                shape = shapeList.selection ? shapeList.selection.index : 0;
                refreshRows();
                updatePreview();
            };
            bindValueRow(lengthControls, function(value) { lengthValue = value; }, initial.lengthValue);
            bindValueRow(ratioControls, function(value) { ratioPercent = value; }, initial.ratioPercent);
            bindValueRow(angleControls, function(value) { angleDeg = value; }, initial.angleDeg);
            bindValueRow(sizeControls, function(value) { sizeMm = value; }, initial.sizeMm);
            bindValueRow(shadeControls, function(value) { shadeK = value; }, initial.shadeK);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            namesCheck.onClick = function() { opt.names = namesCheck.value; updatePreview(); };
            centerCheck.onClick = function() { opt.center = centerCheck.value; updatePreview(); };
            lengthCheck.onClick = function() { opt.lengthText = lengthCheck.value; updatePreview(); };
            unitInput.onChanging = function() { unitText = unitInput.text; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            // 모양에 따라 L 행 이름을 바꾸고 쓰지 않는 행은 흐리게
            function refreshRows() {
                lengthControls.input.parent.children[0].text = SHAPES[shape].length + " L:";
                ratioControls.input.parent.enabled = SHAPES[shape].ratio;
                angleControls.input.parent.enabled = SHAPES[shape].angle;
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
                var drawing = buildShaded({
                    shape: shape, size: sizeMm * MM_TO_PT, length: lengthValue, ratio: ratioPercent / 100, angle: angleDeg,
                    names: opt.names, center: opt.center, lengthText: opt.lengthText, unit: unitText
                });
                messageText.text = drawing.notes.join("\n");
                previewGroup = layer.groupItems.add();
                previewGroup.name = "색칠한 부분";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                // 도형 가운데를 화면 가운데에
                previewGroup.translate(viewCenter[0] - drawing.center[0] + offsetXmm * MM_TO_PT, viewCenter[1] - drawing.center[1] + offsetYmm * MM_TO_PT);
            }

            // 칠하기: 고리(닫힌 점 목록)가 하나면 패스, 여럿이면 복합 패스(구멍). 선 없음
            function addFill(rings) {
                var holder = rings.length > 1 ? previewGroup.compoundPathItems.add() : null;
                for (var r = 0; r < rings.length; r++) {
                    var path = holder ? holder.pathItems.add() : previewGroup.pathItems.add();
                    setPoints(path, rings[r]);
                    path.closed = true;
                    path.stroked = false;
                    path.filled = true;
                    path.fillColor = makeGray(shadeK);
                }
            }

            // line: {points:[{anchor,left,right}], closed, kind:"main"|"guide"|"mark"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                setPoints(path, line.points);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "mark" ? MARK_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            function setPoints(path, points) {
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < points.length; j++) {
                    path.pathPoints[j].leftDirection = points[j].left;
                    path.pathPoints[j].rightDirection = points[j].right;
                }
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var attributes = frame.textRange.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 소문자 변수(x, y, f)는 GSMediItaC1. 점 이름·O(upright)는 기울이지 않는다.
            // GSMediumB1에 없는 기호(π, √, θ, − 같은 ASCII 밖 글자)는 HancomEQN
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-shaded-area.js). 단위 pt, size = L의 길이
            // -------------------------------------------------------
            function buildShaded(o) {
                var S = o.size, L = o.length, t = o.ratio, deg = o.angle, rad = deg * Math.PI / 180;
                var out = { fills: [], lines: [], dots: [], texts: [], notes: [], center: [0, 0] };
                var lengthLabel = formatValue(L) + (o.unit ? " " + o.unit : "");
                // 정사각형 ABCD: A 왼쪽 위, B 왼쪽 아래, C 오른쪽 아래, D 오른쪽 위
                var A = [0, S], B = [0, 0], C = [S, 0], D = [S, S], M = [S / 2, S / 2];
                var area, perimeter;
                function square() { return { points: polyline([A, B, C, D]), closed: true, kind: "main" }; }
                function squareNames() {
                    if (!o.names) return;
                    out.texts.push({ text: "A", at: A, dir: [-0.7071, 0.7071], upright: true });
                    out.texts.push({ text: "B", at: B, dir: [-0.7071, -0.7071], upright: true });
                    out.texts.push({ text: "C", at: C, dir: [0.7071, -0.7071], upright: true });
                    out.texts.push({ text: "D", at: D, dir: [0.7071, 0.7071], upright: true });
                }
                function sideLength() { if (o.lengthText) out.texts.push({ text: lengthLabel, at: [S / 2, 0], dir: [0, -1], upright: true }); }

                if (o.shape === 0) {
                    // 부채꼴 BCD(중심 C)에서 CD를 지름으로 하는 반원을 뺀 부분
                    out.fills.push([join([polyline([B, C]), arc([S, S / 2], S / 2, -90, -270), arc(C, S, 90, 180)])]);
                    out.lines.push(square(), open(arc(C, S, 90, 180)), open(arc([S, S / 2], S / 2, -90, -270)));
                    squareNames();
                    sideLength();
                    area = [0, 1 / 8];
                    perimeter = [1, 1];
                    out.center = M;
                } else if (o.shape === 1) {
                    // 중심 B, D인 두 사분원이 겹친 잎
                    out.fills.push([join([arc(B, S, 0, 90), arc(D, S, 180, 270)])]);
                    out.lines.push(square(), open(arc(B, S, 0, 90)), open(arc(D, S, 180, 270)));
                    squareNames();
                    sideLength();
                    area = [-1, 1 / 2];
                    perimeter = [0, 1];
                    out.center = M;
                } else if (o.shape === 2) {
                    // 정사각형에서 중심 B인 사분원을 뺀 귀퉁이
                    out.fills.push([join([polyline([A, D, C]), arc(B, S, 0, 90)])]);
                    out.lines.push(square(), open(arc(B, S, 0, 90)));
                    squareNames();
                    sideLength();
                    area = [1, -1 / 4];
                    perimeter = [2, 1 / 2];
                    out.center = M;
                } else if (o.shape === 3) {
                    // 정사각형에서 내접원을 뺀 네 귀퉁이
                    out.fills.push([polyline([A, B, C, D]), circle(M, S / 2)]);
                    out.lines.push(square(), { points: circle(M, S / 2), closed: true, kind: "main" });
                    squareNames();
                    sideLength();
                    centerMark(M);
                    area = [1, -1 / 4];
                    perimeter = [4, 1];
                    out.center = M;
                } else if (o.shape === 4) {
                    // 네 변을 지름으로 안쪽에 그린 반원 네 개가 겹친 꽃잎
                    var mids = [[0, S / 2], [S / 2, 0], [S, S / 2], [S / 2, S]], starts = [-90, 0, 90, 180];
                    for (var k = 0; k < 4; k++) {
                        var here = mids[k], next = mids[(k + 1) % 4], a0 = starts[k];
                        // 모서리에서 가운데까지 이 반원의 호, 가운데에서 모서리까지 다음 반원의 호
                        out.fills.push([join([arc(here, S / 2, a0, a0 + 90), arc(next, S / 2, a0 + 180, a0 + 270)])]);
                        out.lines.push(open(arc(here, S / 2, a0, a0 + 180)));
                    }
                    out.lines.push(square());
                    squareNames();
                    sideLength();
                    area = [-1, 1 / 2];
                    perimeter = [0, 2];
                    out.center = M;
                } else if (o.shape === 5) {
                    // 원에서 내접 정사각형을 뺀 부분 (L = 반지름)
                    var h = S / Math.SQRT2, O = [0, 0];
                    var corners = [[-h, h], [-h, -h], [h, -h], [h, h]];
                    out.fills.push([circle(O, S), polyline(corners)]);
                    out.lines.push({ points: circle(O, S), closed: true, kind: "main" }, { points: polyline(corners), closed: true, kind: "main" });
                    if (o.names) {
                        var cornerNames = ["A", "B", "C", "D"];
                        for (var c = 0; c < 4; c++) out.texts.push({ text: cornerNames[c], at: corners[c], dir: unitVector(corners[c]), upright: true });
                    }
                    radiusLine(O, [S, 0]);
                    centerMark(O);
                    area = [-2, 1];
                    perimeter = [0, 2, 4];   // 2πr + 4√2 r
                } else if (o.shape === 6) {
                    // 중심이 같은 두 원 사이 (중심각이 360°보다 작으면 부채꼴 고리)
                    var R2 = S * t, O6 = [0, 0];
                    if (deg >= 360) {
                        out.fills.push([circle(O6, S), circle(O6, R2)]);
                        out.lines.push({ points: circle(O6, S), closed: true, kind: "main" }, { points: circle(O6, R2), closed: true, kind: "main" });
                        radiusLine(O6, [S, 0]);
                        perimeter = [0, 2 * (1 + t)];
                    } else {
                        var b0 = 90 - deg / 2, b1 = 90 + deg / 2;
                        out.fills.push([join([arc(O6, S, b0, b1), polyline([polar(O6, S, b1), polar(O6, R2, b1)]), arc(O6, R2, b1, b0)])]);
                        out.lines.push({ points: join([polyline([O6, polar(O6, S, b0)]), arc(O6, S, b0, b1), polyline([polar(O6, S, b1), O6])]), closed: true, kind: "main" });
                        out.lines.push(open(arc(O6, R2, b0, b1)));
                        angleMark(O6, b0, b1);
                        if (o.lengthText) out.texts.push({ text: lengthLabel, at: polar(O6, S / 2, b0), dir: normalOf(b0, -1), upright: true });
                        perimeter = [2 * (1 - t), deg / 360 * 2 * (1 + t)];
                    }
                    centerMark(O6);
                    area = [0, deg / 360 * (1 - t * t)];
                } else if (o.shape === 7) {
                    // 부채꼴 (중심각은 위쪽 가운데로 벌린다)
                    var O7 = [0, 0], c0 = 90 - deg / 2, c1 = 90 + deg / 2;
                    var sector = join([polyline([O7, polar(O7, S, c0)]), arc(O7, S, c0, c1), polyline([polar(O7, S, c1), O7])]);
                    out.fills.push([sector]);
                    out.lines.push({ points: sector, closed: true, kind: "main" });
                    angleMark(O7, c0, c1);
                    centerMark(O7);
                    if (o.lengthText) out.texts.push({ text: lengthLabel, at: polar(O7, S / 2, c0), dir: normalOf(c0, -1), upright: true });
                    area = [0, deg / 360];
                    perimeter = [2, deg / 360 * 2];
                } else {
                    // 지름 AB 위의 점 C로 나눈 두 반원을 큰 반원에서 뺀 부분 (아르벨로스)
                    var A8 = [0, 0], B8 = [S, 0], C8 = [S * t, 0];
                    var big = arc([S / 2, 0], S / 2, 180, 0), right = arc([S * (1 + t) / 2, 0], S * (1 - t) / 2, 0, 180), left = arc([S * t / 2, 0], S * t / 2, 0, 180);
                    out.fills.push([join([big, right, left])]);
                    out.lines.push(open(big), open(right), open(left), { points: polyline([A8, B8]), closed: false, kind: "main" });
                    if (o.names) {
                        out.texts.push({ text: "A", at: A8, dir: [0, -1], upright: true });
                        out.texts.push({ text: "C", at: C8, dir: [0, -1], upright: true });
                        out.texts.push({ text: "B", at: B8, dir: [0, -1], upright: true });
                    }
                    if (o.lengthText) out.texts.push({ text: "AB = " + lengthLabel, at: [S / 2, S / 2], dir: [0, 1], upright: true });
                    area = [0, t * (1 - t) / 4];
                    perimeter = [0, 1];
                    out.center = [S / 2, S / 4];
                }
                // 복합 패스는 0이 아닌 감기 규칙이라 바깥 고리는 반시계, 구멍은 시계 방향이어야 뚫린다
                for (var fi = 0; fi < out.fills.length; fi++) {
                    for (var ri = 0; ri < out.fills[fi].length; ri++) out.fills[fi][ri] = orient(out.fills[fi][ri], ri === 0);
                }
                out.notes.push("넓이 = " + termsText([area[0] * L * L, area[1] * L * L, 0]));
                out.notes.push("둘레 = " + termsText([perimeter[0] * L, perimeter[1] * L, (perimeter[2] || 0) * L]));
                return out;

                function centerMark(at) {
                    if (!o.center) return;
                    out.dots.push(at);
                    out.texts.push({ text: "O", at: at, dir: [-0.7071, -0.7071], upright: true });
                }
                function radiusLine(from, to) {
                    out.lines.push({ points: polyline([from, to]), closed: false, kind: "guide" });
                    if (o.lengthText) out.texts.push({ text: lengthLabel, at: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], dir: [0, 1], upright: true });
                }
                function angleMark(at, a0, a1) {
                    var r = S * 0.18;
                    out.lines.push({ points: arc(at, r, a0, a1), closed: false, kind: "mark" });
                    out.texts.push({ text: formatValue(a1 - a0) + "°", at: at, dir: unitVector(polar([0, 0], 1, (a0 + a1) / 2)), clear: r, upright: true });
                }
            }

            // 넓이·둘레 글자: [상수, π의 계수, √2의 계수] → 25π/2, 10π+10, 100-25π, 20π+40√2
            function termsText(terms) {
                var parts = [];
                if (Math.abs(terms[1]) > 1e-9) parts.push({ v: terms[1], suffix: "π" });
                if (Math.abs(terms[0]) > 1e-9) parts.push({ v: terms[0], suffix: "" });
                if (Math.abs(terms[2]) > 1e-9) parts.push({ v: terms[2], suffix: "√2" });
                // 음수 항이 앞에 오지 않게 양수 항을 먼저
                parts.sort(function(p, q) { return (q.v > 0 ? 1 : 0) - (p.v > 0 ? 1 : 0); });
                if (parts.length === 0) return "0";
                var text = "";
                for (var i = 0; i < parts.length; i++) {
                    var v = parts[i].v, body = coefficientText(Math.abs(v), parts[i].suffix);
                    text += i === 0 ? (v < 0 ? "-" : "") + body : (v < 0 ? " - " : " + ") + body;
                }
                return text;
            }

            // 계수와 붙는 기호: 25π/2, π, 3/4, 2√2 (분모 12까지, 아니면 소수 둘째 자리)
            function coefficientText(v, suffix) {
                for (var q = 1; q <= 12; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) > 1e-9) continue;
                    var top = (p === 1 && suffix ? "" : String(p)) + suffix;
                    return q === 1 ? top : top + "/" + q;
                }
                return formatValue(v) + suffix;
            }

            // 호: center, 반지름 r, a0°에서 a1°까지 (a1 < a0면 시계 방향). 90°마다 나눈 베지어 점 목록
            function arc(center, r, a0, a1) {
                var pieces = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 1e-9));
                var step = (a1 - a0) / pieces * Math.PI / 180, handle = 4 / 3 * Math.tan(step / 4) * r, points = [];
                for (var i = 0; i <= pieces; i++) {
                    var a = a0 * Math.PI / 180 + step * i, c = Math.cos(a), s = Math.sin(a);
                    var anchor = [center[0] + r * c, center[1] + r * s], tangent = [-s * handle, c * handle];
                    points.push({
                        anchor: anchor,
                        left: i > 0 ? [anchor[0] - tangent[0], anchor[1] - tangent[1]] : anchor,
                        right: i < pieces ? [anchor[0] + tangent[0], anchor[1] + tangent[1]] : anchor
                    });
                }
                return points;
            }

            function circle(center, r) {
                var points = arc(center, r, 0, 360);
                points[0].left = points[points.length - 1].left;
                points.pop();
                return points;
            }

            function polyline(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return points;
            }

            // 조각들을 이어 닫힌 점 목록으로: 앞 조각의 끝과 다음 조각의 처음이 같은 점이면 하나로 합친다(마지막 끝 = 처음)
            function join(pieces) {
                var points = [];
                for (var p = 0; p < pieces.length; p++) {
                    for (var i = 0; i < pieces[p].length; i++) {
                        var pt = pieces[p][i], last = points[points.length - 1];
                        if (last && Math.abs(last.anchor[0] - pt.anchor[0]) < 1e-6 && Math.abs(last.anchor[1] - pt.anchor[1]) < 1e-6) {
                            last.right = pt.right;
                            continue;
                        }
                        points.push({ anchor: pt.anchor, left: pt.left, right: pt.right });
                    }
                }
                var first = points[0], end = points[points.length - 1];
                if (points.length > 1 && Math.abs(first.anchor[0] - end.anchor[0]) < 1e-6 && Math.abs(first.anchor[1] - end.anchor[1]) < 1e-6) {
                    first.left = end.left;
                    points.pop();
                }
                return points;
            }

            // 닫힌 점 목록을 반시계(ccw) 또는 시계 방향으로. 뒤집을 때는 앞뒤 핸들도 바꾼다
            function orient(points, ccw) {
                var twice = 0;
                for (var i = 0; i < points.length; i++) {
                    var p = points[i], q = points[(i + 1) % points.length];
                    // 조각을 앵커·핸들 네 점의 꺾은선으로 본 넓이 (방향만 알면 된다)
                    var chain = [p.anchor, p.right, q.left, q.anchor];
                    for (var k = 0; k < 3; k++) twice += chain[k][0] * chain[k + 1][1] - chain[k + 1][0] * chain[k][1];
                }
                if ((twice > 0) === ccw) return points;
                var reversed = [];
                for (var j = points.length - 1; j >= 0; j--) reversed.push({ anchor: points[j].anchor, left: points[j].right, right: points[j].left });
                return reversed;
            }

            function open(points) { return { points: points, closed: false, kind: "main" }; }
            function polar(center, r, degrees) { var a = degrees * Math.PI / 180; return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)]; }
            // 반지름 방향 degrees에 수직인 방향 (side -1: 시계 쪽)
            function normalOf(degrees, side) { var a = degrees * Math.PI / 180; return [-Math.sin(a) * side, Math.cos(a) * side]; }
            function unitVector(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1]); return l > 0 ? [v[0] / l, v[1] / l] : [0, 1]; }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { MAIN_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "mark") { MARK_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return MAIN_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "mark") return MARK_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
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
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", shape, lengthValue, ratioPercent, angleDeg, sizeMm, shadeK, fontPt, flags, encodeURIComponent(unitText),
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 13 || p[8].length !== FLAG_KEYS.length) return;
                try {
                    shape = Math.round(restoreNumber(p[1], shape, 0, SHAPES.length - 1));
                    lengthValue = restoreNumber(p[2], lengthValue, 1, 30);
                    ratioPercent = restoreNumber(p[3], ratioPercent, 10, 90);
                    angleDeg = restoreNumber(p[4], angleDeg, 10, 360);
                    sizeMm = restoreNumber(p[5], sizeMm, 10, 80);
                    shadeK = restoreNumber(p[6], shadeK, 5, 60);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[8].charAt(i) === "1";
                    unitText = decodeURIComponent(p[9]);
                    offsetXmm = restoreNumber(p[10], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[11], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[12] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }

        }
        return api;
    }
    // ==== 도형 문제 ====
    // 기출에 자주 나오는 도형 그림 여덟 가지를 수치로 정확히 그린다.
    // 피타고라스(직각삼각형 세 변 위의 정사각형 □ADEB·□ACHI·□BFGC, 수선 AK, 보조선 CD·AF, 넓이가 같은 □ADEB와 □BFKJ 칠하기),
    // 평행선과 선분의 비(세 평행선 l·m·n과 두 직선), 사다리꼴 ABCD와 AD∥EF∥BC(대각선 AC와 교점 G),
    // 넓이 모형(큰 정사각형에서 작은 정사각형을 뺀 도형과 재배열한 직사각형, 곱셈 공식 직사각형 (a+b)(c+d)),
    // 원 묶음과 끈(한 줄·삼각형·사각형 격자로 놓은 원을 끈으로 묶은 모양: 선분 + 부채꼴 호). 계산값(길이·넓이·끈 길이)은 창에 보여 준다.
    // 확률 소재: 번호 공과 주머니, 숫자 카드, 주사위 눈, 갈림길, 회전판(12시에서 시계 방향으로 나눈 칸·칸 글자·*로 칠한 칸·바늘, 같은 글자의 칸 수로 구한 확률).
    // 선 두께: 도형 0.8pt, 보조선 0.3pt 점선. 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeFigureProblemEngine() {
        var api = {label: "도형 문제", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "MiddleFigureProblem/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(π, ∥)
            var SYMBOL_FONT_NAME = "Batang";   // (가), (나) (한글·영문 서체 적용 규칙: 바탕체, 한 단계 크게)
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var MARK_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var DOT_RADIUS_MM = 0.5;
            var LABEL_GAP_MM = 0.8;
            var RIGHT_MARK_MM = 1.5;
            var PARAM_COUNT = 4;
            // 종류: 이름, 수치 행 4개 [이름, 최솟값, 최댓값, 한 단계, 기본값](없으면 null), 「추가」 체크박스 뜻, 조각 이름 행을 쓰는지
            var KINDS = [
                { name: "피타고라스 (세 정사각형)", params: [["AB", 1, 20, 0.5, 3], ["AC", 1, 20, 0.5, 4], null, null], extra: "넓이 같은 부분 칠하기" },
                { name: "평행선과 선분의 비", params: [["위 간격", 0.5, 10, 0.5, 2], ["아래 간격", 0.5, 10, 0.5, 3], ["둘째 직선 (°)", 20, 160, 5, 65], ["첫째 직선 (°)", 20, 160, 5, 105]], extra: "" },
                { name: "사다리꼴과 평행선", params: [["AD", 1, 20, 0.5, 4], ["BC", 1, 20, 0.5, 8], ["AE:AB (%)", 10, 90, 5, 40], null], extra: "대각선 AC" },
                { name: "넓이: 정사각형 - 정사각형", params: [["큰 변 a", 1, 20, 0.5, 5], ["작은 변 b", 0.5, 19, 0.5, 2], null, null], extra: "재배열한 직사각형 (나)" },
                { name: "넓이: 곱셈 공식", params: [["가로 1", 0.5, 20, 0.5, 3], ["가로 2", 0.5, 20, 0.5, 2], ["세로 1", 0.5, 20, 0.5, 3], ["세로 2", 0.5, 20, 0.5, 2]], extra: "", pieces: "조각 이름:" },
                { name: "원 묶음: 한 줄", params: [["반지름 r", 0.5, 10, 0.5, 3], ["원 개수", 2, 8, 1, 3], null, null], extra: "" },
                { name: "원 묶음: 삼각형", params: [["반지름 r", 0.5, 10, 0.5, 3], ["줄 수", 2, 4, 1, 2], null, null], extra: "" },
                { name: "원 묶음: 사각형", params: [["반지름 r", 0.5, 10, 0.5, 3], ["가로 개수", 1, 5, 1, 2], ["세로 개수", 1, 4, 1, 2], null], extra: "" },
                { name: "확률: 공 주머니", params: [["공 개수", 2, 20, 1, 12], ["한 줄 개수", 2, 8, 1, 4], null, null], extra: "주머니 그리기" },
                { name: "확률: 숫자 카드", params: [null, null, null, null], extra: "", pieces: "카드 글자:" },
                { name: "확률: 주사위", params: [["주사위 개수", 1, 3, 1, 2], ["첫째 눈", 1, 6, 1, 3], ["둘째 눈", 1, 6, 1, 5], ["셋째 눈", 1, 6, 1, 6]], extra: "" },
                { name: "확률: 갈림길", params: [["갈림 횟수", 1, 4, 1, 2], null, null, null], extra: "갈림길마다 1/2" },
                { name: "확률: 회전판", params: [["칸 수", 2, 12, 1, 6], ["바늘 각 (°)", 0, 355, 5, 30], null, null], extra: "바늘 그리기", pieces: "칸 글자:" }
            ];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["names", "guides", "lengths", "extra"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);
            var symbolFont = findTextFont([SYMBOL_FONT_NAME, KOR_FONT_NAME]);

            // 옵션. params[종류][행]은 종류마다 따로 기억한다
            var kind = 0;
            var params = [];
            for (var pk = 0; pk < KINDS.length; pk++) {
                params.push([]);
                for (var pr = 0; pr < PARAM_COUNT; pr++) params[pk].push(KINDS[pk].params[pr] ? KINDS[pk].params[pr][4] : 0);
            }
            var piecesAcross = "a,b", piecesDown = "a,b";
            var cardText = "1,2,3,4,5,6,7";
            var spinnerText = "1,2,3,4,5,6";   // 회전판 칸 글자 (끝의 *는 그 칸을 칠한다)
            var unitMm = 6;
            var shadeK = 20;
            var fontPt = 8;
            var opt = { names: true, guides: true, lengths: true, extra: false };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {unitMm: unitMm, shadeK: shadeK, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {graph: MAIN_PT, guide: GUIDE_PT, mark: MARK_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var kindPanel = addPanel(win, "도형");
            var kindRow = kindPanel.add("group");
            kindRow.add("statictext", undefined, "종류:");
            var kindNames = [];
            for (var kn = 0; kn < KINDS.length; kn++) kindNames.push(KINDS[kn].name);
            var kindList = kindRow.add("dropdownlist", undefined, kindNames);
            kindList.selection = kind;
            var paramControls = [];
            for (var pc = 0; pc < PARAM_COUNT; pc++) paramControls.push(addValueRow(kindPanel, "값", "", 1, 0, 100, 1, 1));
            var piecesRow = kindPanel.add("group");
            piecesRow.add("statictext", undefined, "조각 이름:").preferredSize.width = LABEL_WIDTH;
            var acrossInput = piecesRow.add("edittext", undefined, piecesAcross);
            acrossInput.preferredSize.width = 80;
            acrossInput.helpTip = "가로 두 조각의 이름 (a,b / x,3). 넓이 글자는 두 이름의 곱으로 쓴다 (ab, a², 3x)";
            var downInput = piecesRow.add("edittext", undefined, piecesDown);
            downInput.preferredSize.width = 80;
            downInput.helpTip = "세로 두 조각의 이름";

            var drawPanel = addPanel(win, "그리기");
            var unitControls = addValueRow(drawPanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var shadeControls = addValueRow(drawPanel, "칠하기 농도", "K", shadeK, 5, 60, 5, 0);
            var fontControls = addValueRow(drawPanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var checkRow = drawPanel.add("group");
            var namesCheck = checkRow.add("checkbox", undefined, "점 이름");
            var guidesCheck = checkRow.add("checkbox", undefined, "보조선");
            var lengthsCheck = checkRow.add("checkbox", undefined, "길이 글자");
            var extraCheck = drawPanel.add("checkbox", undefined, "추가");

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var markWidthControls = addValueRow(lineWidthPanel, "표시", "pt", currentLineWidth("mark"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "점선 보조선 (보조선을 켰을 때)";
            markWidthControls.input.helpTip = "직각 표시, 원 묶음의 반지름 선";
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(markWidthControls, function(value) { setLineWidth("mark", value); }, LINE_DEFAULTS.mark);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            namesCheck.value = opt.names;
            guidesCheck.value = opt.guides;
            lengthsCheck.value = opt.lengths;
            extraCheck.value = opt.extra;
            refreshRows();
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshRows();
                updatePreview();
            };
            for (var bp = 0; bp < PARAM_COUNT; bp++) bindParamRow(bp);
            acrossInput.onChanging = function() {
                if (isCardKind()) cardText = acrossInput.text;
                else if (isSpinnerKind()) spinnerText = acrossInput.text;
                else piecesAcross = acrossInput.text;
                updatePreview();
            };
            downInput.onChanging = function() { piecesDown = downInput.text; updatePreview(); };
            bindValueRow(unitControls, function(value) { unitMm = value; }, initial.unitMm);
            bindValueRow(shadeControls, function(value) { shadeK = value; }, initial.shadeK);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            namesCheck.onClick = function() { opt.names = namesCheck.value; updatePreview(); };
            guidesCheck.onClick = function() { opt.guides = guidesCheck.value; updatePreview(); };
            lengthsCheck.onClick = function() { opt.lengths = lengthsCheck.value; updatePreview(); };
            extraCheck.onClick = function() { opt.extra = extraCheck.value; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            // 종류가 바뀌면 수치 행의 이름·범위·값을 그 종류 것으로 바꾸고, 쓰지 않는 행은 흐리게
            function refreshRows() {
                for (var i = 0; i < PARAM_COUNT; i++) {
                    var spec = KINDS[kind].params[i], controls = paramControls[i];
                    controls.input.parent.enabled = !!spec;
                    if (!spec) {
                        controls.input.parent.children[0].text = "-";
                        continue;
                    }
                    controls.input.parent.children[0].text = spec[0] + ":";
                    controls.min = spec[1];
                    controls.max = spec[2];
                    controls.step = spec[3];
                    controls.decimals = spec[3] < 1 ? 1 : 0;
                    try {
                        controls.slider.minvalue = spec[1];
                        controls.slider.maxvalue = spec[2];
                        controls.slider.stepdelta = spec[3];
                        controls.slider.jumpdelta = spec[3] * 10;
                    } catch (e) {}
                    setRowValue(controls, params[kind][i]);
                }
                // 곱셈 공식은 가로·세로 조각 이름, 숫자 카드는 카드 글자 하나, 회전판은 칸 글자 하나
                piecesRow.enabled = !!KINDS[kind].pieces;
                piecesRow.children[0].text = KINDS[kind].pieces || "조각 이름:";
                acrossInput.text = isCardKind() ? cardText : (isSpinnerKind() ? spinnerText : piecesAcross);
                acrossInput.helpTip = isSpinnerKind() ? "12시에서 시계 방향으로 칸마다 쓸 글자를 쉼표로 나눠 쓴다. 끝에 *를 붙이면 그 칸을 칠한다 (1,2*,3)" : "";
                downInput.enabled = !isCardKind() && !isSpinnerKind();
                extraCheck.enabled = KINDS[kind].extra !== "";
                extraCheck.text = KINDS[kind].extra !== "" ? KINDS[kind].extra : "추가";
            }

            function isCardKind() { return KINDS[kind].name === "확률: 숫자 카드"; }
            function isSpinnerKind() { return KINDS[kind].name === "확률: 회전판"; }

            function bindParamRow(index) {
                bindValueRow(paramControls[index], function(value) { params[kind][index] = value; }, function() { return KINDS[kind].params[index][4]; });
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
                var drawing = buildFigure({
                    kind: kind, p: params[kind], across: piecesAcross, down: piecesDown, cards: cardText, spinner: spinnerText, unit: unitMm * MM_TO_PT,
                    names: opt.names, guides: opt.guides, lengths: opt.lengths, extra: opt.extra
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";
                previewGroup = layer.groupItems.add();
                previewGroup.name = "도형 문제";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var q = 0; q < drawing.pips.length; q++) addPip(drawing.pips[q]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] - drawing.center[0] + offsetXmm * MM_TO_PT, viewCenter[1] - drawing.center[1] + offsetYmm * MM_TO_PT);
            }

            // 주사위 눈: 검은 원 (선 없음)
            function addPip(points) {
                var path = previewGroup.pathItems.add();
                setPoints(path, points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(100);
            }

            function addFill(points) {
                var path = previewGroup.pathItems.add();
                setPoints(path, points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(shadeK);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"main"|"guide"|"thin"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                setPoints(path, line.points);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "thin" ? MARK_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function setPoints(path, points) {
                var anchors = [];
                for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < points.length; j++) {
                    path.pathPoints[j].leftDirection = points[j].left;
                    path.pathPoints[j].rightDirection = points[j].right;
                }
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 gap(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                // ㉠, (가): 글자 전체를 바탕체로 한 단계 크게
                if (label.symbol) {
                    attributes.textFont = symbolFont;
                    attributes.size = fontPt + 1;
                    attributes.baselineShift = 0;
                }
                if (label.sup) {
                    for (var s = 0; s < label.sup.length; s++) {
                        var character = frame.textRange.characters[label.sup[s]];
                        var supAttributes = character.characterAttributes;
                        supAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    }
                }
                if (label.sub) {
                    for (var u = 0; u < label.sub.length; u++) {
                        var subCharacter = frame.textRange.characters[label.sub[u]];
                        var subAttributes = subCharacter.characterAttributes;
                        subAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                    }
                }
                // sin·log 같은 함수 이름은 기울이지 않는다
                if (label.roman) {
                    for (var r = 0; r < label.roman.length; r++) {
                        var romanCharacter = frame.textRange.characters[label.roman[r]];
                        var romanAttributes = romanCharacter.characterAttributes;
                        romanAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 소문자 변수(x, y, f)는 GSMediItaC1. 점 이름·O(upright)는 기울이지 않는다.
            // GSMediumB1에 없는 기호(π, √, θ, − 같은 ASCII 밖 글자)는 HancomEQN
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-figure-problem.js). 단위 pt, 1 = unit
            // -------------------------------------------------------
            function buildFigure(o) {
                var u = o.unit, p = o.p;
                var out = { fills: [], lines: [], dots: [], pips: [], texts: [], notes: [], center: [0, 0] };
                var all = [];   // 가운데 맞춤용 점
                function S(q) { var pt = [q[0] * u, q[1] * u]; all.push(pt); return pt; }
                function seg(a, b, kind) { out.lines.push({ points: polyline([S(a), S(b)]), closed: false, kind: kind || "main" }); }
                function poly(list, kind) { var pts = []; for (var i = 0; i < list.length; i++) pts.push(S(list[i])); out.lines.push({ points: polyline(pts), closed: true, kind: kind || "main" }); }
                function fillPoly(list) { var pts = []; for (var i = 0; i < list.length; i++) pts.push(S(list[i])); out.fills.push(polyline(pts)); }
                function name(text, at, from) { if (o.names) out.texts.push({ text: text, at: S(at), dir: awayFrom(at, from), upright: true }); }
                function length(text, a, b, from) {
                    if (!o.lengths) return;
                    var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                    out.texts.push({ text: text, at: S(mid), dir: awayFrom(mid, from) });
                }

                if (o.kind === 0) {
                    // 빗변 BC를 아래 가로로, A를 위에. □ADEB, □ACHI는 바깥쪽, □BFGC는 아래
                    var c = p[0], b = p[1], a = Math.sqrt(b * b + c * c);
                    var B = [0, 0], C = [a, 0], A = [c * c / a, b * c / a], J = [A[0], 0];
                    var mid = [a / 2, A[1] / 3];
                    var nAB = outward(A, B, C), nAC = outward(A, C, B);
                    var D = [A[0] + nAB[0] * c, A[1] + nAB[1] * c], E = [B[0] + nAB[0] * c, B[1] + nAB[1] * c];
                    var I = [A[0] + nAC[0] * b, A[1] + nAC[1] * b], H = [C[0] + nAC[0] * b, C[1] + nAC[1] * b];
                    var F = [0, -a], G = [a, -a], K = [A[0], -a];
                    if (o.extra) {
                        fillPoly([A, D, E, B]);
                        fillPoly([B, F, K, J]);
                    }
                    poly([A, B, C]);
                    poly([A, D, E, B]);
                    poly([A, C, H, I]);
                    poly([B, F, G, C]);
                    if (o.guides) {
                        seg(A, K, "guide");
                        seg(C, D, "guide");
                        seg(A, F, "guide");
                    }
                    rightMark(A, B, C);
                    var names0 = [["A", A], ["B", B], ["C", C], ["D", D], ["E", E], ["F", F], ["G", G], ["H", H], ["I", I]];
                    for (var n0 = 0; n0 < names0.length; n0++) name(names0[n0][0], names0[n0][1], mid);
                    if (o.guides) { name("J", J, [A[0], A[1]]); name("K", K, [A[0], 0]); }
                    length(numText(c), A, B, mid);
                    length(numText(b), A, C, mid);
                    out.notes.push("BC² = AB² + AC² = " + numText(c * c) + " + " + numText(b * b) + " = " + numText(a * a) + ", BC = " + rootText(a * a));
                    out.notes.push("□ADEB = □BFKJ = " + numText(c * c) + ", □ACHI = □JKGC = " + numText(b * b));
                } else if (o.kind === 1) {
                    // 세 평행선 l, m, n (위에서부터)과 두 직선이 만나는 점 A, B, C / A′, B′, C′
                    var g1 = p[0], g2 = p[1], t2 = p[2] * Math.PI / 180, t1 = p[3] * Math.PI / 180;
                    var yl = g1 + g2, ym = g2, yn = 0, gap = 4;
                    function onLine(x0, theta, y) { return [x0 + (y - ym) / Math.tan(theta), y]; }
                    var A1 = onLine(0, t1, yl), B1 = onLine(0, t1, ym), C1 = onLine(0, t1, yn);
                    var A2 = onLine(gap, t2, yl), B2 = onLine(gap, t2, ym), C2 = onLine(gap, t2, yn);
                    var xs = [A1[0], C1[0], A2[0], C2[0]];
                    var left = Math.min.apply(null, xs) - 1.5, right = Math.max.apply(null, xs) + 1.5;
                    var ys = [yl, ym, yn], lineNames = ["l", "m", "n"];
                    for (var k = 0; k < 3; k++) {
                        seg([left, ys[k]], [right, ys[k]]);
                        if (o.names) out.texts.push({ text: lineNames[k], at: S([right, ys[k]]), dir: [1, 0] });
                    }
                    var ext = 1;
                    seg(extend(C1, A1, ext), extend(A1, C1, ext));
                    seg(extend(C2, A2, ext), extend(A2, C2, ext));
                    var inner = [(B1[0] + B2[0]) / 2, ym];
                    var pts1 = [["A", A1], ["B", B1], ["C", C1], ["A′", A2], ["B′", B2], ["C′", C2]];
                    for (var q = 0; q < pts1.length; q++) {
                        out.dots.push(S(pts1[q][1]));
                        if (o.names) out.texts.push({ text: pts1[q][0], at: S(pts1[q][1]), dir: [pts1[q][1][0] < inner[0] ? -0.7071 : 0.7071, 0.7071], upright: true });
                    }
                    var AB = dist(A1, B1), BC = dist(B1, C1), AB2 = dist(A2, B2), BC2 = dist(B2, C2);
                    length(numText(AB), A1, B1, inner);
                    length(numText(BC), B1, C1, inner);
                    length(numText(AB2), A2, B2, inner);
                    length(numText(BC2), B2, C2, inner);
                    out.notes.push("l∥m∥n이면 AB : BC = A′B′ : B′C′ = " + numText(g1) + " : " + numText(g2));
                    out.notes.push("AB = " + numText(AB) + ", BC = " + numText(BC) + ", A′B′ = " + numText(AB2) + ", B′C′ = " + numText(BC2));
                } else if (o.kind === 2) {
                    // 사다리꼴 ABCD (AD∥BC, A 왼쪽 위), AE:AB = t인 EF∥BC
                    var ad = p[0], bc = p[1], t = p[2] / 100;
                    var h = (ad + bc) * 0.35, shift = (bc - ad) * 0.35;
                    var B2d = [0, 0], C2d = [bc, 0], A2d = [shift, h], D2d = [shift + ad, h];
                    var E2d = lerp(A2d, B2d, t), F2d = lerp(D2d, C2d, t), centerT = [(bc + shift + ad) / 3, h / 2];
                    poly([A2d, B2d, C2d, D2d]);
                    seg(E2d, F2d);
                    var ef = ad + (bc - ad) * t;
                    if (o.extra) {
                        seg(A2d, C2d, o.guides ? "guide" : "main");
                        var G2d = lerp(A2d, C2d, t);
                        out.dots.push(S(G2d));
                        name("G", G2d, [G2d[0], G2d[1] - 1]);
                        out.notes.push("EG = BC × AE/AB = " + numText(bc * t) + ", GF = AD × EB/AB = " + numText(ad * (1 - t)));
                    }
                    var names2 = [["A", A2d], ["B", B2d], ["C", C2d], ["D", D2d], ["E", E2d], ["F", F2d]];
                    for (var n2 = 0; n2 < names2.length; n2++) name(names2[n2][0], names2[n2][1], centerT);
                    length(numText(ad), A2d, D2d, centerT);
                    length(numText(bc), B2d, C2d, centerT);
                    out.notes.unshift("EF = AD + (BC - AD) × AE/AB = " + numText(ef));
                } else if (o.kind === 3) {
                    // 한 변 a인 정사각형에서 한 변 b인 정사각형을 오른쪽 위에서 잘라낸 도형 (가), 재배열한 직사각형 (나)
                    var sa = p[0], sb = Math.min(p[1], p[0] - 0.5);
                    if (p[1] > sb) out.notes.push("b는 a보다 작아야 해서 " + numText(sb) + "로 그림");
                    var L = [[0, 0], [sa, 0], [sa, sa - sb], [sa - sb, sa - sb], [sa - sb, sa], [0, sa]];
                    fillPoly(L);
                    poly(L);
                    if (o.guides) {
                        seg([sa - sb, sa], [sa, sa], "guide");
                        seg([sa, sa - sb], [sa, sa], "guide");
                    }
                    var cL = [sa / 2, sa / 2];
                    if (o.lengths) {
                        out.texts.push({ text: "a", at: S([sa / 2, 0]), dir: [0, -1] });
                        out.texts.push({ text: "a", at: S([0, sa / 2]), dir: [-1, 0] });
                        out.texts.push({ text: "b", at: S([sa - sb / 2, sa - sb]), dir: [0, -1] });
                    }
                    if (o.extra) {
                        var x0 = sa + 3, w = sa + sb, hh = sa - sb;
                        var R = [[x0, 0], [x0 + w, 0], [x0 + w, hh], [x0, hh]];
                        fillPoly(R);
                        poly(R);
                        if (o.guides) seg([x0 + sa, 0], [x0 + sa, hh], "guide");
                        if (o.lengths) {
                            out.texts.push({ text: "a+b", at: S([x0 + w / 2, 0]), dir: [0, -1] });
                            out.texts.push({ text: "a-b", at: S([x0 + w, hh / 2]), dir: [1, 0] });
                        }
                        if (o.names) {
                            out.texts.push({ text: "(가)", at: S([sa / 2, 0]), dir: [0, -1], clear: 12, symbol: true });
                            out.texts.push({ text: "(나)", at: S([x0 + w / 2, 0]), dir: [0, -1], clear: 12, symbol: true });
                        }
                    }
                    out.notes.push("a² - b² = (a+b)(a-b) = " + numText(sa * sa - sb * sb) + " (a = " + numText(sa) + ", b = " + numText(sb) + ")");
                } else if (o.kind === 4) {
                    // 가로 두 조각·세로 두 조각으로 나눈 직사각형, 칸마다 두 조각 이름의 곱
                    var wa = [p[0], p[1]], hb = [p[2], p[3]];
                    var ax = splitNames(o.across), dy = splitNames(o.down);
                    var W = wa[0] + wa[1], Hh = hb[0] + hb[1];
                    poly([[0, 0], [W, 0], [W, Hh], [0, Hh]]);
                    seg([wa[0], 0], [wa[0], Hh]);
                    seg([0, hb[1]], [W, hb[1]]);
                    var terms = [];
                    for (var row = 0; row < 2; row++) {
                        for (var col = 0; col < 2; col++) {
                            var term = productText(dy[row], ax[col]);
                            terms.push(term);
                            var cx = col === 0 ? wa[0] / 2 : wa[0] + wa[1] / 2, cy = row === 0 ? hb[1] + hb[0] / 2 : hb[1] / 2;
                            out.texts.push({ text: term.text, sup: term.sup, at: S([cx, cy]), dir: [0, 0] });
                        }
                    }
                    if (o.lengths) {
                        out.texts.push({ text: ax[0], at: S([wa[0] / 2, Hh]), dir: [0, 1] });
                        out.texts.push({ text: ax[1], at: S([wa[0] + wa[1] / 2, Hh]), dir: [0, 1] });
                        out.texts.push({ text: dy[0], at: S([0, hb[1] + hb[0] / 2]), dir: [-1, 0] });
                        out.texts.push({ text: dy[1], at: S([0, hb[1] / 2]), dir: [-1, 0] });
                    }
                    out.notes.push("(" + ax[0] + "+" + ax[1] + ")(" + dy[0] + "+" + dy[1] + ") = " + expansionText(terms));
                } else if (o.kind === 8) {
                    // 번호 공: 지름 2 단위인 원을 한 줄에 cols개씩, 가운데에 번호. 주머니는 공을 감싸는 둥근 자루와 묶은 목
                    var count = Math.round(p[0]), cols = Math.round(p[1]), rowsB = Math.ceil(count / cols);
                    for (var bi2 = 0; bi2 < count; bi2++) {
                        var row2 = Math.floor(bi2 / cols), col2 = bi2 % cols;
                        // 마지막 줄은 가운데로
                        var inRow = row2 === rowsB - 1 ? count - row2 * cols : cols;
                        var bx = (col2 - (inRow - 1) / 2) * 2.2, by = (rowsB - 1 - row2) * 2.2;
                        out.lines.push({ points: circlePoints(S([bx, by]), u), closed: true, kind: "main" });
                        out.texts.push({ text: String(bi2 + 1), at: S([bx, by]), dir: [0, 0], upright: true });
                    }
                    if (o.extra) {
                        var halfW = cols * 1.1 + 0.8, top = (rowsB - 1) * 2.2 + 1.8, bottom = -1.8;
                        out.lines.push({ points: bagPoints(halfW, top, bottom, u), closed: true, kind: "main" });
                        S([-halfW, bottom]); S([halfW, top + 2]);
                    }
                    out.notes.push("공 " + count + "개 (1 ~ " + count + "), 한 개를 꺼낼 때 모든 경우의 수 " + count);
                } else if (o.kind === 9) {
                    // 숫자 카드: 둥근 직사각형(가로 2, 세로 2.8 단위)을 한 줄로
                    var cards = String(o.cards).replace(/\s/g, "").split(",");
                    var shown2 = [];
                    for (var ci2 = 0; ci2 < cards.length; ci2++) if (cards[ci2] !== "") shown2.push(cards[ci2]);
                    for (var cj = 0; cj < shown2.length; cj++) {
                        var x0c = cj * 2.5;
                        out.lines.push({ points: roundRectPoints(S([x0c, 0]), 2 * u, 2.8 * u, 0.3 * u), closed: true, kind: "main" });
                        out.texts.push({ text: shown2[cj], at: S([x0c + 1, 1.4]), dir: [0, 0], upright: true });
                    }
                    var n2 = shown2.length;
                    out.notes.push("카드 " + n2 + "장: 두 장으로 만드는 두 자리 수 최대 " + n2 * (n2 - 1) + "가지 (0이 있으면 십의 자리에 못 옴)");
                } else if (o.kind === 10) {
                    // 주사위 앞면: 한 변 3 단위 둥근 정사각형과 눈 (표준 배치)
                    var diceCount = Math.round(p[0]), faces = [p[1], p[2], p[3]], sum = 0;
                    for (var di = 0; di < diceCount; di++) {
                        var dx0 = di * 4, value = Math.round(faces[di]);
                        sum += value;
                        out.lines.push({ points: roundRectPoints(S([dx0, 0]), 3 * u, 3 * u, 0.45 * u), closed: true, kind: "main" });
                        var spots = pipSpots(value);
                        for (var sp = 0; sp < spots.length; sp++) {
                            out.pips.push(circlePoints(S([dx0 + 1.5 + spots[sp][0] * 0.85, 1.5 + spots[sp][1] * 0.85]), (value === 1 ? 0.42 : 0.3) * u));
                        }
                    }
                    out.notes.push("눈 " + faces.slice(0, diceCount).join(", ") + (diceCount > 1 ? " (합 " + sum + ")" : "") + ", 모든 경우의 수 " + Math.pow(6, diceCount));
                } else if (o.kind === 11) {
                    // 갈림길: 위에서 출발해 갈림마다 양쪽으로 갈라지고 다시 만나는 길 (파스칼 삼각형). 끝 지점 A, B, C … 와 확률
                    var levels = Math.round(p[0]), dxL = 2, dyL = 2.4;
                    var node = function(k, i) { return [(i - k / 2) * dxL, -k * dyL]; };
                    seg([0, dyL * 0.6], node(0, 0));
                    for (var k2 = 0; k2 < levels; k2++) {
                        for (var i2 = 0; i2 <= k2; i2++) {
                            seg(node(k2, i2), node(k2 + 1, i2));
                            seg(node(k2, i2), node(k2 + 1, i2 + 1));
                            out.dots.push(S(node(k2, i2)));
                            if (o.extra) {
                                var l1 = lerp(node(k2, i2), node(k2 + 1, i2), 0.5), r1 = lerp(node(k2, i2), node(k2 + 1, i2 + 1), 0.5);
                                out.texts.push({ text: "1/2", at: S(l1), dir: [-0.8944, 0.4472] });
                                out.texts.push({ text: "1/2", at: S(r1), dir: [0.8944, 0.4472] });
                            }
                        }
                    }
                    var probs = [], total = Math.pow(2, levels), comb = 1;
                    for (var e2 = 0; e2 <= levels; e2++) {
                        var endName = String.fromCharCode(65 + e2);
                        if (o.names) out.texts.push({ text: endName, at: S(node(levels, e2)), dir: [0, -1], upright: true });
                        probs.push(endName + " " + fractionText(comb, total));
                        comb = comb * (levels - e2) / (e2 + 1);
                    }
                    out.notes.push("끝 지점에 갈 확률: " + probs.join(", ") + " (갈림 " + levels + "번, 갈림길마다 1/2)");
                } else if (o.kind === 12) {
                    // 회전판: 반지름 3 단위인 원을 칸 수만큼 똑같이 나눈다. 첫 칸은 12시에서 시계 방향, 칸 글자는 쉼표로 나누고 끝의 *는 그 칸을 칠한다.
                    // 바늘은 가운데에서 12시부터 시계 방향으로 잰 각도를 가리키고, 어느 각도에서도 칸 글자(반지름의 0.66배)에 닿지 않게 0.48배까지만 긋는다.
                    // 확률은 같은 글자의 칸 수 / 전체 칸 수
                    var nS = Math.round(p[0]), RS = 3, stepS = 360 / nS, spinLabels = String(o.spinner === undefined ? "" : o.spinner).split(","), counts = {}, order = [];
                    for (var si = 0; si < nS; si++) {
                        var rawS = si < spinLabels.length ? spinLabels[si].replace(/^\s+|\s+$/g, "") : "", shadeS = /\*$/.test(rawS), labelS = rawS.replace(/\*$/, "");
                        if (shadeS) {
                            var sector = [[0, 0]];
                            for (var sk = 0; sk <= 24; sk++) sector.push(spinnerPoint(si * stepS + stepS * sk / 24, RS));
                            fillPoly(sector);
                        }
                        if (labelS === "") continue;
                        out.texts.push({ text: labelS, at: S(spinnerPoint((si + 0.5) * stepS, RS * 0.66)), dir: [0, 0], upright: true });
                        if (!counts.hasOwnProperty(labelS)) { counts[labelS] = 0; order.push(labelS); }
                        counts[labelS]++;
                    }
                    out.lines.push({ points: circlePoints(S([0, 0]), RS * u), closed: true, kind: "main" });
                    S([-RS, -RS]); S([RS, RS]);
                    for (si = 0; si < nS; si++) seg([0, 0], spinnerPoint(si * stepS, RS));
                    if (o.extra) {
                        var tipS = spinnerPoint(p[1], RS * 0.48), dirS = unitVector(tipS), baseS = [tipS[0] - dirS[0] * 0.45, tipS[1] - dirS[1] * 0.45];
                        seg([0, 0], baseS);
                        out.pips.push(polyline([S(tipS), S([baseS[0] - dirS[1] * 0.18, baseS[1] + dirS[0] * 0.18]), S([baseS[0] + dirS[1] * 0.18, baseS[1] - dirS[0] * 0.18])]));
                        out.dots.push(S([0, 0]));
                    }
                    var probsS = [];
                    for (var oi = 0; oi < order.length; oi++) probsS.push(order[oi] + " → " + fractionText(counts[order[oi]], nS));
                    out.notes.push("칸 " + nS + "개: " + probsS.join(", "));
                } else {
                    // 원 묶음: 중심을 반지름 1 단위로 놓고, 중심들의 볼록 껍질을 반지름만큼 밖으로 민 끈
                    var r = p[0], centers = circleLayout(o.kind, p);
                    var hull = convexHull(centers), belt = beltPoints(hull, 1);
                    for (var ci = 0; ci < centers.length; ci++) {
                        var cc = S([centers[ci][0], centers[ci][1]]);
                        out.lines.push({ points: circlePoints(cc, u), closed: true, kind: "main" });
                        if (o.guides) out.dots.push(cc);
                    }
                    var beltScaled = [];
                    for (var bi = 0; bi < belt.length; bi++) beltScaled.push({ anchor: S(belt[bi].anchor), left: [belt[bi].left[0] * u, belt[bi].left[1] * u], right: [belt[bi].right[0] * u, belt[bi].right[1] * u] });
                    out.lines.push({ points: beltScaled, closed: true, kind: "main" });
                    if (o.guides && hull.length > 1) {
                        var hullPts = [];
                        for (var hi2 = 0; hi2 < hull.length; hi2++) hullPts.push(S(hull[hi2]));
                        out.lines.push({ points: polyline(hullPts), closed: hull.length > 2, kind: "guide" });
                    }
                    if (o.lengths) {
                        var first = centers[0];
                        seg(first, [first[0], first[1] - 1], "thin");
                        out.texts.push({ text: numText(r), at: S([first[0], first[1] - 0.5]), dir: [-1, 0] });
                    }
                    var hullLength = 0;
                    for (var hl = 0; hl < hull.length; hl++) hullLength += dist(hull[hl], hull[(hl + 1) % hull.length]);
                    if (hull.length === 2) hullLength = 2 * dist(hull[0], hull[1]);
                    out.notes.push("끈 길이 = 선분 " + numText(hullLength * r) + " + 호 " + numText(2 * r) + "π = " + numText(2 * r) + "π + " + numText(hullLength * r));
                    out.notes.push("원 " + centers.length + "개, 반지름 " + numText(r) + " (호를 모으면 원 한 바퀴)");
                }

                // 그림 전체의 가운데
                if (all.length > 0) {
                    var x0b = all[0][0], x1b = all[0][0], y0b = all[0][1], y1b = all[0][1];
                    for (var ai = 1; ai < all.length; ai++) {
                        x0b = Math.min(x0b, all[ai][0]); x1b = Math.max(x1b, all[ai][0]);
                        y0b = Math.min(y0b, all[ai][1]); y1b = Math.max(y1b, all[ai][1]);
                    }
                    out.center = [(x0b + x1b) / 2, (y0b + y1b) / 2];
                }
                return out;

                function rightMark(at, a1, a2) {
                    var s = RIGHT_MARK_MM * 2.834645669 / u, d1 = unitVector([a1[0] - at[0], a1[1] - at[1]]), d2 = unitVector([a2[0] - at[0], a2[1] - at[1]]);
                    var p1 = [at[0] + d1[0] * s, at[1] + d1[1] * s], p2 = [p1[0] + d2[0] * s, p1[1] + d2[1] * s], p3 = [at[0] + d2[0] * s, at[1] + d2[1] * s];
                    out.lines.push({ points: polyline([S(p1), S(p2), S(p3)]), closed: false, kind: "thin" });
                }
            }

            // 공 주머니: 아래가 둥근 자루, 위로 좁아진 목과 묶은 끈 (반지름·높이는 단위 좌표, u로 pt 변환)
            // 회전판 위의 점: 12시에서 시계 방향으로 deg도, 가운데에서 r (단위 좌표)
            function spinnerPoint(deg, r) {
                var a = deg * Math.PI / 180;
                return [r * Math.sin(a), r * Math.cos(a)];
            }

            function bagPoints(halfW, top, bottom, u) {
                var neck = halfW * 0.35, r = Math.min(halfW, (top - bottom) / 2) * 0.8;
                var pieces = [
                    arcPoints([(-halfW + r) * u, (bottom + r) * u], r * u, 180, 270),
                    arcPoints([(halfW - r) * u, (bottom + r) * u], r * u, 270, 360),
                    polyline([[halfW * u, (top - 1) * u], [neck * u, (top + 0.8) * u], [neck * 1.4 * u, (top + 1.6) * u], [-neck * 1.4 * u, (top + 1.6) * u], [-neck * u, (top + 0.8) * u], [-halfW * u, (top - 1) * u]])
                ];
                return join(pieces);
            }

            // 모서리가 둥근 직사각형 (왼쪽 아래 corner, 가로 w, 세로 h, 모서리 반지름 r, pt)
            function roundRectPoints(corner, w, h, r) {
                var x = corner[0], y = corner[1];
                return join([
                    arcPoints([x + r, y + r], r, 180, 270),
                    arcPoints([x + w - r, y + r], r, 270, 360),
                    arcPoints([x + w - r, y + h - r], r, 0, 90),
                    arcPoints([x + r, y + h - r], r, 90, 180)
                ]);
            }

            // 주사위 눈 자리 (가운데 0, 모서리 ±1)
            function pipSpots(value) {
                var c = [0, 0], tl = [-1, 1], tr = [1, 1], bl = [-1, -1], br = [1, -1], ml = [-1, 0], mr = [1, 0];
                return [[c], [tl, br], [tl, c, br], [tl, tr, bl, br], [tl, tr, c, bl, br], [tl, tr, ml, mr, bl, br]][Math.max(1, Math.min(6, value)) - 1];
            }

            // 기약분수 p/q
            function fractionText(p, q) {
                var a = Math.round(p), b = Math.round(q);
                function gcd(x, y) { return y === 0 ? x : gcd(y, x % y); }
                var g = gcd(a, b);
                return b / g === 1 ? String(a / g) : (a / g) + "/" + (b / g);
            }

            // 선분 PQ에서 R의 반대쪽으로 향하는 단위 법선
            function outward(P, Q, R) {
                var d = unitVector([Q[0] - P[0], Q[1] - P[1]]), n = [-d[1], d[0]];
                var side = (R[0] - P[0]) * n[0] + (R[1] - P[1]) * n[1];
                return side > 0 ? [-n[0], -n[1]] : n;
            }

            // at에서 from의 반대쪽 방향 (글자 자리)
            function awayFrom(at, from) { return unitVector([at[0] - from[0], at[1] - from[1]]); }
            function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            // from → to 방향으로 to를 by만큼 더 늘인 점
            function extend(from, to, by) { var d = unitVector([to[0] - from[0], to[1] - from[1]]); return [to[0] + d[0] * by, to[1] + d[1] * by]; }
            function unitVector(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1]); return l > 0 ? [v[0] / l, v[1] / l] : [0, 1]; }

            // 원 묶음의 중심 (반지름 1 단위, 이웃한 원의 중심 사이 2)
            function circleLayout(kindIndex, p) {
                var list = [], i, j;
                if (kindIndex === 5) {
                    for (i = 0; i < Math.round(p[1]); i++) list.push([2 * i, 0]);
                } else if (kindIndex === 6) {
                    var rows = Math.round(p[1]);
                    for (i = 0; i < rows; i++) {
                        for (j = 0; j < rows - i; j++) list.push([2 * j + i, i * Math.sqrt(3)]);
                    }
                } else {
                    for (i = 0; i < Math.round(p[2]); i++) {
                        for (j = 0; j < Math.round(p[1]); j++) list.push([2 * j, 2 * i]);
                    }
                }
                return list;
            }

            // 볼록 껍질 (반시계, 한 줄에 놓인 점은 뺀다). 점이 모두 한 줄이면 양 끝 두 점
            function convexHull(points) {
                var pts = points.slice().sort(function(a, b) { return a[0] - b[0] || a[1] - b[1]; });
                if (pts.length < 3) return pts;
                function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
                var lower = [], upper = [], i;
                for (i = 0; i < pts.length; i++) {
                    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 1e-9) lower.pop();
                    lower.push(pts[i]);
                }
                for (i = pts.length - 1; i >= 0; i--) {
                    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 1e-9) upper.pop();
                    upper.push(pts[i]);
                }
                lower.pop();
                upper.pop();
                var hull = lower.concat(upper);
                return hull;
            }

            // 반시계 볼록 껍질을 r만큼 밖으로 민 닫힌 곡선: 모서리마다 부채꼴 호, 변마다 선분 (베지어 점 목록)
            function beltPoints(hull, r) {
                if (hull.length === 1) return circlePoints(hull[0], r);
                var pieces = [], n = hull.length;
                for (var i = 0; i < n; i++) {
                    var prev = hull[(i - 1 + n) % n], here = hull[i], next = hull[(i + 1) % n];
                    var dIn = unitVector([here[0] - prev[0], here[1] - prev[1]]), dOut = unitVector([next[0] - here[0], next[1] - here[1]]);
                    // 반시계 껍질의 바깥 법선은 진행 방향의 오른쪽 (d₁, -d₀)
                    var a0 = Math.atan2(-dIn[0], dIn[1]) * 180 / Math.PI, a1 = Math.atan2(-dOut[0], dOut[1]) * 180 / Math.PI;
                    while (a1 < a0 - 1e-9) a1 += 360;
                    pieces.push(arcPoints(here, r, a0, a1));
                }
                return join(pieces);
            }

            function circlePoints(center, r) {
                var points = arcPoints(center, r, 0, 360);
                points[0].left = points[points.length - 1].left;
                points.pop();
                return points;
            }

            // 호: center, 반지름 r, a0°에서 a1°까지. 90°마다 나눈 베지어 점 목록
            function arcPoints(center, r, a0, a1) {
                var pieces = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 90 - 1e-9));
                var step = (a1 - a0) / pieces * Math.PI / 180, handle = 4 / 3 * Math.tan(step / 4) * r, points = [];
                for (var i = 0; i <= pieces; i++) {
                    var a = a0 * Math.PI / 180 + step * i, c = Math.cos(a), s = Math.sin(a);
                    var anchor = [center[0] + r * c, center[1] + r * s], tangent = [-s * handle, c * handle];
                    points.push({
                        anchor: anchor,
                        left: i > 0 ? [anchor[0] - tangent[0], anchor[1] - tangent[1]] : anchor,
                        right: i < pieces ? [anchor[0] + tangent[0], anchor[1] + tangent[1]] : anchor
                    });
                }
                return points;
            }

            // 조각들을 이어 닫힌 점 목록으로 (이어지는 점은 하나로, 마지막 끝 = 처음). 조각 사이가 떨어져 있으면 선분으로 잇는다
            function join(pieces) {
                var points = [];
                for (var p = 0; p < pieces.length; p++) {
                    for (var i = 0; i < pieces[p].length; i++) {
                        var pt = pieces[p][i], last = points[points.length - 1];
                        if (last && Math.abs(last.anchor[0] - pt.anchor[0]) < 1e-6 && Math.abs(last.anchor[1] - pt.anchor[1]) < 1e-6) {
                            last.right = pt.right;
                            continue;
                        }
                        points.push({ anchor: pt.anchor, left: pt.left, right: pt.right });
                    }
                }
                var first = points[0], end = points[points.length - 1];
                if (points.length > 1 && Math.abs(first.anchor[0] - end.anchor[0]) < 1e-6 && Math.abs(first.anchor[1] - end.anchor[1]) < 1e-6) {
                    first.left = end.left;
                    points.pop();
                }
                return points;
            }

            function polyline(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return points;
            }

            // "a,b" → ["a", "b"] (모자라면 a, b로 채운다)
            function splitNames(text) {
                var parts = String(text).replace(/\s/g, "").split(",");
                return [parts[0] || "a", parts[1] || "b"];
            }

            // 두 조각 이름의 곱: 수 부분은 곱하고 문자는 알파벳 순으로, 같은 문자는 거듭제곱 (a·a → a², 3·x → 3x, 2a·3b → 6ab)
            // {text, sup: 위첨자 글자 위치}
            function productText(p, q) {
                var a = splitTerm(p), b = splitTerm(q);
                var coef = a.coef * b.coef, letters = (a.letters + b.letters).split("").sort();
                var text = "", sup = [];
                if (coef !== 1 || letters.length === 0) text += formatValue(coef);
                for (var i = 0; i < letters.length; ) {
                    var j = i;
                    while (j < letters.length && letters[j] === letters[i]) j++;
                    text += letters[i];
                    if (j - i > 1) { sup.push(text.length); text += String(j - i); }
                    i = j;
                }
                return { text: text, sup: sup };
            }

            function splitTerm(text) {
                var s = String(text), i = 0;
                while (i < s.length && ((s.charAt(i) >= "0" && s.charAt(i) <= "9") || s.charAt(i) === ".")) i++;
                var number = i > 0 ? parseFloat(s.substring(0, i)) : 1;
                return { coef: isNaN(number) ? 1 : number, letters: s.substring(i) };
            }

            // 네 칸의 곱을 같은 항끼리 모아 전개식으로: a²+2ab+b², x²+5x+6
            function expansionText(terms) {
                var keys = [], sums = {}, i;
                for (i = 0; i < terms.length; i++) {
                    var t = terms[i], k = 0, coef = "";
                    while (k < t.text.length && ((t.text.charAt(k) >= "0" && t.text.charAt(k) <= "9") || t.text.charAt(k) === ".")) k++;
                    var body = t.text.substring(k), value = k > 0 ? parseFloat(t.text.substring(0, k)) : 1;
                    // 위첨자 자리를 ²로 적은 이름
                    var shown = "";
                    for (var c = 0; c < body.length; c++) {
                        var isSup = false;
                        for (var sp = 0; sp < t.sup.length; sp++) if (t.sup[sp] === c + k) isSup = true;
                        shown += isSup ? (body.charAt(c) === "2" ? "²" : "^" + body.charAt(c)) : body.charAt(c);
                    }
                    if (!(shown in sums)) { keys.push(shown); sums[shown] = 0; }
                    sums[shown] += value;
                }
                var out = "";
                for (i = 0; i < keys.length; i++) {
                    var v = sums[keys[i]], coefText = keys[i] === "" ? formatValue(v) : (v === 1 ? "" : formatValue(v));
                    out += (i > 0 ? "+" : "") + coefText + keys[i];
                }
                return out;
            }

            // 0 이상의 수: 정수, 분수(분모 6까지), 아니면 소수 둘째 자리
            function numText(v) {
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) < 1e-9) return q === 1 ? String(p) : p + "/" + q;
                }
                return formatValue(v);
            }

            // √n: 제곱수면 정수, 아니면 k√m, 정수가 아니면 소수
            function rootText(n) {
                if (Math.abs(n - Math.round(n)) > 1e-9) return formatValue(Math.sqrt(n));
                n = Math.round(n);
                var outside = 1, inside = n;
                for (var k = 2; k * k <= inside; k++) {
                    while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
                }
                if (inside === 1) return String(outside);
                return (outside === 1 ? "" : String(outside)) + "√" + inside;
            }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { MAIN_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "mark") { MARK_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return MAIN_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "mark") return MARK_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
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
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(typeof initial === "function" ? initial() : initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var flags = "", values = [];
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                for (var k = 0; k < KINDS.length; k++) values.push(params[k].join(","));
                var parts = ["v3", kind, values.join(";"), encodeURIComponent(piecesAcross), encodeURIComponent(piecesDown), unitMm, shadeK, fontPt, flags,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0", encodeURIComponent(cardText), encodeURIComponent(spinnerText)];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                // v3는 회전판 칸 글자까지 14칸, 옛 v2는 회전판이 생기기 전(13칸, 종류 12개)이다
                var fieldCount = p[0] === "v3" ? 14 : (p[0] === "v2" ? 13 : -1);
                if (p.length !== fieldCount || p[8].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    var groups = p[2].split(";");
                    if (groups.length <= KINDS.length) {
                        for (var k = 0; k < groups.length; k++) {
                            var values = groups[k].split(",");
                            if (values.length !== PARAM_COUNT) continue;
                            for (var i = 0; i < PARAM_COUNT; i++) {
                                var spec = KINDS[k].params[i];
                                if (spec) params[k][i] = restoreNumber(values[i], params[k][i], spec[1], spec[2]);
                            }
                        }
                    }
                    piecesAcross = decodeURIComponent(p[3]);
                    piecesDown = decodeURIComponent(p[4]);
                    unitMm = restoreNumber(p[5], unitMm, 2, 20);
                    shadeK = restoreNumber(p[6], shadeK, 5, 60);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    for (var f = 0; f < FLAG_KEYS.length; f++) opt[FLAG_KEYS[f]] = p[8].charAt(f) === "1";
                    offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[11] === "1";
                    cardText = decodeURIComponent(p[12]);
                    if (fieldCount === 14) spinnerText = decodeURIComponent(p[13]);
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }

        }
        return api;
    }
    // ==== 실생활 그래프 ====
    // 실생활 그래프: 가로·세로 눈금 단위가 다른 좌표축(시간–거리, 시간–온도 …)에 점을 이은 꺾은선을 그린다.
    // 점은 (0,0) (5,400) (9,0) (12,0) (20,1000)처럼 넣고, 축 이름은 x(분)·y(m)처럼 따로 쓴다.
    // 눈금 숫자는 모든 눈금, 점의 좌표만(교과서처럼 5, 9, 12, 20과 400, 1000), 없음 중에서 고르고, 점에서 두 축까지 점선을 넣을 수 있다.
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 점선·격자 0.3pt. 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeLifeGraphEngine() {
        var api = {label: "실생활 그래프", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "MiddleLifeGraph/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var TICK_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var LEGEND_GAP_MM = 1;           // 축 범례와 축(또는 눈금 숫자·글자) 사이 간격 (그림 제작 규칙)
            var LEGEND_LINE_HEIGHT = 1;      // 세로로 쌓은 범례의 줄 간격(글자 크기 배). 1 = 일러스트레이터 세로쓰기와 같은 간격
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };
            registerHead(ARROW);
            var NUMBER_MODES = ["모든 눈금", "점의 좌표만", "없음"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["dots", "guides", "grid"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var pointsText = "(0,0) (5,400) (9,0) (12,0) (20,1000)";
            var xName = "x(분)", yName = "y(m)";
            var xMax = 20, xStep = 5, yMax = 1000, yStep = 200;
            var widthMm = 60, heightMm = 40;
            var numberMode = 1;
            var fontPt = 8;
            var opt = { dots: false, guides: true, grid: false };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {xMax: xMax, xStep: xStep, yMax: yMax, yStep: yStep, widthMm: widthMm, heightMm: heightMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];
            var LINE_DEFAULTS = {axis: AXIS_PT, tick: TICK_PT, graph: GRAPH_PT, guide: GUIDE_PT, grid: GRID_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var dataPanel = addPanel(win, "자료");
            var pointsRow = dataPanel.add("group");
            pointsRow.add("statictext", undefined, "점:").preferredSize.width = 40;
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 300;
            pointsInput.helpTip = "(0,0) (5,400) (9,0)처럼 순서대로. 이 순서로 선을 잇는다";
            var namesRow = dataPanel.add("group");
            namesRow.add("statictext", undefined, "축 이름:").preferredSize.width = 40;
            var xNameInput = namesRow.add("edittext", undefined, xName);
            xNameInput.preferredSize.width = 110;
            xNameInput.helpTip = "가로축 끝 글자 (x(분), 시간(초))";
            var yNameInput = namesRow.add("edittext", undefined, yName);
            yNameInput.preferredSize.width = 110;
            yNameInput.helpTip = "세로축 끝 글자 (y(m), 온도(℃))";

            var axisPanel = addPanel(win, "눈금", "fold7");
            var xMaxControls = addValueRow(axisPanel, "x 최댓값", "", xMax, 1, 500, 1, 1);
            var xStepControls = addValueRow(axisPanel, "x 눈금 간격", "", xStep, 0.5, 100, 0.5, 1);
            var yMaxControls = addValueRow(axisPanel, "y 최댓값", "", yMax, 1, 10000, 1, 1);
            var yStepControls = addValueRow(axisPanel, "y 눈금 간격", "", yStep, 0.5, 2000, 0.5, 1);
            var numberRow = axisPanel.add("group");
            numberRow.add("statictext", undefined, "눈금 숫자:");
            var numberList = addRadioChoice(numberRow, NUMBER_MODES);
            setRadioChoice(numberList, numberMode);
            var checkRow = axisPanel.add("group");
            var dotsCheck = checkRow.add("checkbox", undefined, "점 찍기");
            var guidesCheck = checkRow.add("checkbox", undefined, "축까지 점선");
            var gridCheck = checkRow.add("checkbox", undefined, "격자");

            var sizePanel = addPanel(win, "크기");
            var widthControls = addValueRow(sizePanel, "너비", "mm", widthMm, 20, 150, 1, 0);
            var heightControls = addValueRow(sizePanel, "높이", "mm", heightMm, 20, 150, 1, 0);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "점에서 두 축까지 점선 (축까지 점선)";
            gridWidthControls.input.helpTip = "격자를 켰을 때의 회색 모눈선";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            dotsCheck.value = opt.dots;
            guidesCheck.value = opt.guides;
            gridCheck.value = opt.grid;
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
            xNameInput.onChanging = function() { xName = xNameInput.text; updatePreview(); };
            yNameInput.onChanging = function() { yName = yNameInput.text; updatePreview(); };
            bindValueRow(xMaxControls, function(value) { xMax = value; }, initial.xMax);
            bindValueRow(xStepControls, function(value) { xStep = value; }, initial.xStep);
            bindValueRow(yMaxControls, function(value) { yMax = value; }, initial.yMax);
            bindValueRow(yStepControls, function(value) { yStep = value; }, initial.yStep);
            numberList.onChange = function() { numberMode = numberList.index; updatePreview(); };
            dotsCheck.onClick = function() { opt.dots = dotsCheck.value; updatePreview(); };
            guidesCheck.onClick = function() { opt.guides = guidesCheck.value; updatePreview(); };
            gridCheck.onClick = function() { opt.grid = gridCheck.value; updatePreview(); };
            bindValueRow(widthControls, function(value) { widthMm = value; }, initial.widthMm);
            bindValueRow(heightControls, function(value) { heightMm = value; }, initial.heightMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

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
                var parsed = parseDataPoints(pointsText);
                messageText.text = parsed.bad.length > 0 ? "읽지 못함: " + parsed.bad.join(", ") : " ";
                var drawing = buildLifeGraph({
                    points: parsed.list, xName: xName, yName: yName, xMax: xMax, xStep: xStep, yMax: yMax, yStep: yStep,
                    width: widthMm * MM_TO_PT, height: heightMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, numberMode: numberMode,
                    dots: opt.dots, guides: opt.guides, grid: opt.grid
                });
                previewGroup = layer.groupItems.add();
                previewGroup.name = "실생활 그래프";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                addLegends(drawing);
                previewGroup.translate(viewCenter[0] - widthMm * MM_TO_PT / 2 + offsetXmm * MM_TO_PT, viewCenter[1] - heightMm * MM_TO_PT / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[[x,y]…], kind:"axis"|"tick"|"graph"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(line.points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : (line.kind === "tick" ? TICK_PT : (line.kind === "grid" ? GRID_PT : GUIDE_PT)));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var shape = ARROW;
                var head = headShapeFor(arrow.tip, arrow.dir, shape);
                var path = previewGroup.pathItems.add();
                path.setEntirePath(head.points);
                path.closed = head.closed;
                paintHead(path, head.closed, makeGray(100));
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 gap(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addLabel(label) {
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                // ㉠, (가): 글자 전체를 바탕체로 한 단계 크게
                if (label.symbol) {
                    attributes.textFont = symbolFont;
                    attributes.size = fontPt + 1;
                    attributes.baselineShift = 0;
                }
                if (label.sup) {
                    for (var s = 0; s < label.sup.length; s++) {
                        var character = frame.textRange.characters[label.sup[s]];
                        var supAttributes = character.characterAttributes;
                        supAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    }
                }
                if (label.sub) {
                    for (var u = 0; u < label.sub.length; u++) {
                        var subCharacter = frame.textRange.characters[label.sub[u]];
                        var subAttributes = subCharacter.characterAttributes;
                        subAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                    }
                }
                // sin·log 같은 함수 이름은 기울이지 않는다
                if (label.roman) {
                    for (var r = 0; r < label.roman.length; r++) {
                        var romanCharacter = frame.textRange.characters[label.roman[r]];
                        var romanAttributes = romanCharacter.characterAttributes;
                        romanAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 축 범례(그림 제작 규칙): 다른 글자를 모두 놓은 뒤에 놓는다. X는 가로 글자를 축 아래 1mm에 오른쪽 끝(align "center"면 가운데)을 at에 맞추고,
            // Y는 글자를 세워 한 글자씩 위→아래로 쌓아(글상자 하나, 줄은 \r, 가운데 맞춤) 축 왼쪽 1mm에 윗끝을 at에 맞춘다.
            // 다른 글자와 겹치면 그 글자에서 1mm 띄운다(글상자 기준. 다른 라벨도 글상자 기준으로 놓인다)
            function addLegends(drawing) {
                var legends = drawing.legends || [];
                if (legends.length === 0) return;
                var gap = LEGEND_GAP_MM * MM_TO_PT, boxes = [], frames = previewGroup.textFrames, i, k;
                for (i = 0; i < frames.length; i++) {
                    var fb = frames[i].geometricBounds;
                    boxes.push([fb[0], fb[3], fb[2], fb[1]]);
                }
                for (i = 0; i < legends.length; i++) {
                    var legend = legends[i], stack = legend.kind === "y", rows = legendRows(legend.text);
                    if (rows.length === 0) continue;
                    var frame = previewGroup.textFrames.add();
                    frame.contents = stack ? rows.join("\r") : legend.text;
                    var range = frame.textRange;
                    range.characterAttributes.size = fontPt;
                    range.characterAttributes.fillColor = makeGray(100);
                    applyTextFonts(frame, false);
                    if (stack) {
                        range.paragraphAttributes.justification = Justification.CENTER;
                        range.characterAttributes.autoLeading = false;
                        range.characterAttributes.leading = fontPt * LEGEND_LINE_HEIGHT;
                    }
                    var b = frame.geometricBounds, w = b[2] - b[0], h = b[1] - b[3], x0, y0, top, right;
                    if (!stack) {
                        var x1 = legend.align === "center" ? legend.at[0] + w / 2 : legend.at[0];
                        x0 = x1 - w;
                        top = legendTop(legend.at[1], x0, x1, h, gap, boxes);
                        frame.translate(x0 - b[0], top - b[1]);
                        boxes.push([x0, top - h, x1, top]);
                    } else {
                        y0 = legend.at[1] - h;
                        right = legendRight(legend.at[0], y0, legend.at[1], w, gap, boxes);
                        frame.translate(right - b[2], legend.at[1] - b[1]);
                        boxes.push([right - w, y0, right, legend.at[1]]);
                    }
                }
            }

            // 축 범례 배치 규칙(웹 generators/axis-legend.js와 같다). 사각형은 [왼쪽, 아래, 오른쪽, 위], y 위쪽 +
            // 세로 범례의 줄: 글자 하나씩(공백도 한 줄)
            function legendRows(text) {
                var rows = [], str = String(text);
                for (var i = 0; i < str.length; i++) rows.push(str.charAt(i));
                return rows;
            }

            // X 범례 윗변의 y. 축선 아래 gap에서 시작해, gap만큼 넓힌 글자 상자와 겹치면 그 글자 아래 gap으로 내린다
            function legendTop(axisY, x0, x1, h, gap, boxes) {
                var top = axisY - gap;
                for (var i = 0; i < 64; i++) {
                    var hit = null;
                    for (var k = 0; k < boxes.length; k++) {
                        var b = boxes[k];
                        if (b[2] + gap > x0 && b[0] - gap < x1 && top > b[1] - gap && top - h < b[3] + gap) { hit = b; break; }
                    }
                    if (!hit) break;
                    top = hit[1] - gap;
                }
                return top;
            }

            // Y 범례 오른쪽 끝의 x. 축선 왼쪽 gap에서 시작해, gap만큼 넓힌 글자 상자와 겹치면 그 글자 왼쪽 gap으로 옮긴다
            function legendRight(axisX, y0, y1, w, gap, boxes) {
                var right = axisX - gap;
                for (var i = 0; i < 64; i++) {
                    var hit = null;
                    for (var k = 0; k < boxes.length; k++) {
                        var b = boxes[k];
                        if (b[3] + gap > y0 && b[1] - gap < y1 && right > b[0] - gap && right - w < b[2] + gap) { hit = b; break; }
                    }
                    if (!hit) break;
                    right = hit[0] - gap;
                }
                return right;
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 소문자 변수(x, y, f)는 GSMediItaC1. 점 이름·O(upright)는 기울이지 않는다.
            // GSMediumB1에 없는 기호(π, √, θ, − 같은 ASCII 밖 글자)는 HancomEQN
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                var inUnit = false;   // y(m)처럼 괄호 안은 단위라 기울이지 않는다
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    if (code === 40) inUnit = true;
                    else if (code === 41) inUnit = false;
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && !inUnit && code >= 97 && code <= 122) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-life-graph.js). 원점 (0,0), 가로 xMax = width pt, 세로 yMax = height pt
            // -------------------------------------------------------
            // "(0,0) (5,400)" → {list: [{x, y}], bad: [읽지 못한 조각]}. 정규식 match 없이 괄호로 나눈다
            function parseDataPoints(text) {
                var list = [], bad = [], pieces = String(text).split(")");
                for (var i = 0; i < pieces.length; i++) {
                    var piece = pieces[i].replace(/\s/g, "");
                    if (piece === "") continue;
                    var open = piece.indexOf("(");
                    var body = open >= 0 ? piece.substring(open + 1) : piece;
                    var parts = body.split(",");
                    var x = parseFloat(parts[0]), y = parseFloat(parts[1]);
                    if (open < 0 || parts.length !== 2 || isNaN(x) || isNaN(y)) bad.push(piece + ")");
                    else list.push({ x: x, y: y });
                }
                return { list: list, bad: bad };
            }

            function buildLifeGraph(o) {
                var sx = o.width / o.xMax, sy = o.height / o.yMax;
                var lines = [], arrows = [], dots = [], texts = [];
                function P(x, y) { return [x * sx, y * sy]; }
                var right = o.width + 6, top = o.height + 6;

                // 눈금 값: 간격마다 (최댓값까지)
                var xTicks = ticks(o.xMax, o.xStep), yTicks = ticks(o.yMax, o.yStep);
                if (o.grid) {
                    for (var gx = 0; gx < xTicks.length; gx++) lines.push({ points: [P(xTicks[gx], 0), P(xTicks[gx], o.yMax)], kind: "grid" });
                    for (var gy = 0; gy < yTicks.length; gy++) lines.push({ points: [P(0, yTicks[gy]), P(o.xMax, yTicks[gy])], kind: "grid" });
                }
                lines.push({ points: [[0, 0], [right - ARROW.length + ARROW.notch, 0]], kind: "axis" });
                lines.push({ points: [[0, 0], [0, top - ARROW.length + ARROW.notch]], kind: "axis" });
                arrows.push({ tip: [right, 0], dir: [1, 0] });
                arrows.push({ tip: [0, top], dir: [0, 1] });
                // 축 범례(그림 제작 규칙, addLegends가 다른 글자를 모두 놓은 뒤에 놓는다): X는 축 아래 1mm에 화살촉 끝 오른쪽 정렬,
                // Y는 글자를 세워 쌓고 축 왼쪽 1mm에 위 끝 정렬. 눈금 숫자와 겹치면 그 숫자에서 1mm
                var legends = [];
                if (o.xName) legends.push({ kind: "x", text: o.xName, at: [right, 0] });
                if (o.yName) legends.push({ kind: "y", text: o.yName, at: [0, top] });
                texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });

                // 눈금: 모든 눈금이면 간격마다, 점의 좌표만이면 점의 x·y 값 자리에만
                var xMarks = xTicks, yMarks = yTicks;
                if (o.numberMode === 1) {
                    xMarks = [];
                    yMarks = [];
                    for (var p = 0; p < o.points.length; p++) {
                        addUnique(xMarks, o.points[p].x);
                        addUnique(yMarks, o.points[p].y);
                    }
                }
                for (var tx = 0; tx < xMarks.length; tx++) {
                    if (Math.abs(xMarks[tx]) < 1e-9 || xMarks[tx] > o.xMax + 1e-9) continue;
                    var at = P(xMarks[tx], 0);
                    lines.push({ points: [[at[0], -o.tick / 2], [at[0], o.tick / 2]], kind: "tick" });
                    if (o.numberMode !== 2) texts.push({ text: formatValue(xMarks[tx]), at: at, dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var ty = 0; ty < yMarks.length; ty++) {
                    if (Math.abs(yMarks[ty]) < 1e-9 || yMarks[ty] > o.yMax + 1e-9) continue;
                    var aty = P(0, yMarks[ty]);
                    lines.push({ points: [[-o.tick / 2, aty[1]], [o.tick / 2, aty[1]]], kind: "tick" });
                    if (o.numberMode !== 2) texts.push({ text: formatValue(yMarks[ty]), at: aty, dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 점선 (점에서 두 축까지), 꺾은선, 점
                if (o.guides) {
                    for (var gp = 0; gp < o.points.length; gp++) {
                        var q = o.points[gp];
                        if (Math.abs(q.y) > 1e-9 && Math.abs(q.x) > 1e-9) lines.push({ points: [P(q.x, 0), P(q.x, q.y)], kind: "guide" });
                        if (Math.abs(q.x) > 1e-9 && Math.abs(q.y) > 1e-9) lines.push({ points: [P(0, q.y), P(q.x, q.y)], kind: "guide" });
                    }
                }
                if (o.points.length >= 2) {
                    var path = [];
                    for (var lp = 0; lp < o.points.length; lp++) path.push(P(o.points[lp].x, o.points[lp].y));
                    lines.push({ points: path, kind: "graph" });
                }
                if (o.dots) for (var dp = 0; dp < o.points.length; dp++) dots.push(P(o.points[dp].x, o.points[dp].y));
                return { lines: lines, arrows: arrows, dots: dots, texts: texts, legends: legends };
            }

            function ticks(max, step) {
                var list = [];
                if (!(step > 0)) return list;
                for (var k = 1; k * step <= max + 1e-9 && k < 1000; k++) list.push(Math.round(k * step * 1e6) / 1e6);
                return list;
            }

            function addUnique(list, value) {
                for (var i = 0; i < list.length; i++) if (Math.abs(list[i] - value) < 1e-9) return;
                list.push(value);
            }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "graph") { GRAPH_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "grid") { GRID_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "tick") return TICK_PT;
                if (group === "graph") return GRAPH_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "grid") return GRID_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                // v1(축·그래프·보조선)도 읽는다. v2는 LINE_KEYS 순서 9칸
                var groups = null;
                if (p.length === 4 && p[0] === "v1") groups = ["axis", "graph", "guide"];
                if (p.length === 10 && p[0] === "v2") groups = LINE_KEYS;
                if (groups === null) return;
                for (var i = 0; i < groups.length; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var parts = ["v2"];
                for (var i = 0; i < LINE_KEYS.length; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(LINE_KEYS[i]) ? String(currentLineWidth(LINE_KEYS[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
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
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", encodeURIComponent(pointsText), encodeURIComponent(xName), encodeURIComponent(yName), xMax, xStep, yMax, yStep,
                    widthMm, heightMm, numberMode, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 16 || p[12].length !== FLAG_KEYS.length) return;
                try {
                    pointsText = decodeURIComponent(p[1]);
                    xName = decodeURIComponent(p[2]);
                    yName = decodeURIComponent(p[3]);
                    xMax = restoreNumber(p[4], xMax, 1, 500);
                    xStep = restoreNumber(p[5], xStep, 0.5, 100);
                    yMax = restoreNumber(p[6], yMax, 1, 10000);
                    yStep = restoreNumber(p[7], yStep, 0.5, 2000);
                    widthMm = restoreNumber(p[8], widthMm, 20, 150);
                    heightMm = restoreNumber(p[9], heightMm, 20, 150);
                    numberMode = Math.round(restoreNumber(p[10], numberMode, 0, NUMBER_MODES.length - 1));
                    fontPt = restoreNumber(p[11], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[12].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[13], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[14], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[15] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }

        }
        return api;
    }
    // ==== 수형도 (원래 Object_TreeDiagram.jsx) ====
    // 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 경우의 수 수형도: 단계별 선택지("앞, 뒤 / 앞, 뒤 / 앞, 뒤")를 왼쪽→오른쪽 나무로 펼친다.
    // '중복 없이'를 켜면 앞 단계에서 나온 것은 빼고 펼친다(A, B, C에서 두 개를 뽑아 세우기 등).
    // 끝 가지 오른쪽에 결과를 (앞, 뒤) 또는 AB처럼 붙인다. 분류 계통도(들여쓰기 입력)와 달리 가지를 자동으로 만든다.
    // 연결선은 0.4pt. 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeTreeDiagramEngine() {
        var api = {label: "수형도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "TreeDiagram/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var MAX_LEAVES = 200;
            var RESULT_STYLES = ["결과 없음", "(앞, 뒤)처럼 괄호", "AB처럼 붙여 쓰기"];
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var LINE_PT = 0.4;
            var LINE_GAP_MM = 1;

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var stagesText = "앞, 뒤 / 앞, 뒤 / 앞, 뒤";
            var noRepeat = false;
            var resultStyle = 1;
            var stageGapMm = 14;
            var rowGapMm = 5;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var initial = {stageGapMm: stageGapMm, rowGapMm: rowGapMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_DEFAULTS = {graph: LINE_PT};
            loadLineWidths();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var inputPanel = addPanel(win, "단계별 선택지");
            var stagesInput = inputPanel.add("edittext", undefined, stagesText);
            stagesInput.preferredSize.width = 360;
            stagesInput.helpTip = "단계는 /, 선택지는 쉼표로 나눈다. 예: 앞, 뒤 / 앞, 뒤 / 1, 2, 3, 4, 5, 6";
            var optionRow = inputPanel.add("group");
            var noRepeatCheck = optionRow.add("checkbox", undefined, "중복 없이 (앞에서 나온 것 빼기)");
            var resultRow = inputPanel.add("group");
            resultRow.add("statictext", undefined, "끝 결과:");
            var resultList = resultRow.add("dropdownlist", undefined, RESULT_STYLES);
            resultList.selection = resultStyle;
            var messageText = inputPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var sizePanel = addPanel(win, "크기");
            var stageControls = addValueRow(sizePanel, "단계 간격", "mm", stageGapMm, 6, 40, 0.5, 1);
            var rowControls = addValueRow(sizePanel, "줄 간격", "mm", rowGapMm, 2, 15, 0.5, 1);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            noRepeatCheck.value = noRepeat;

            stagesInput.onChanging = function() { stagesText = stagesInput.text; updatePreview(); };
            noRepeatCheck.onClick = function() { noRepeat = noRepeatCheck.value; updatePreview(); };
            resultList.onChange = function() { resultStyle = resultList.selection ? resultList.selection.index : 0; updatePreview(); };
            bindValueRow(stageControls, function(value) { stageGapMm = value; }, initial.stageGapMm);
            bindValueRow(rowControls, function(value) { rowGapMm = value; }, initial.rowGapMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, initial.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, initial.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, initial.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
                return true;
            };

            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

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
                var stages = parseStages(stagesText);
                if (stages === null) {
                    messageText.text = "단계를 읽지 못함 (빈 단계가 있음)";
                    return;
                }
                var tree = layoutTree(stages, noRepeat, stageGapMm * MM_TO_PT, rowGapMm * MM_TO_PT, MAX_LEAVES);
                if (tree === null) {
                    messageText.text = "끝 가지가 " + MAX_LEAVES + "개를 넘습니다";
                    return;
                }
                messageText.text = "모두 " + tree.leaves + "가지";
                if (tree.nodes.length === 0) return;

                previewGroup = layer.groupItems.add();
                previewGroup.name = "수형도";
                var gap = LINE_GAP_MM * MM_TO_PT;
                var halfWidths = [];
                for (var i = 0; i < tree.nodes.length; i++) {
                    var node = tree.nodes[i];
                    var frame = addText(node.label, node.x, node.y);
                    var b = frame.geometricBounds;
                    halfWidths.push((b[2] - b[0]) / 2);
                    if (node.parent >= 0) {
                        var parent = tree.nodes[node.parent];
                        addLine([parent.x + halfWidths[node.parent] + gap, parent.y], [node.x - halfWidths[i] - gap, node.y]);
                    }
                    if (node.leaf && resultStyle > 0) {
                        var result = resultStyle === 1 ? "(" + node.path.join(", ") + ")" : node.path.join("");
                        var resultFrame = addText(result, 0, node.y);
                        var rb = resultFrame.geometricBounds;
                        resultFrame.translate(node.x + halfWidths[i] + stageGapMm * MM_TO_PT * 0.5 - rb[0], 0);
                    }
                }
                var bounds = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (bounds[0] + bounds[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (bounds[1] + bounds[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            function addLine(a, b) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath([a, b]);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = LINE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
            }

            // 가운데가 (x, y)인 글자
            // 쌓은 분수 라벨(\frac{1}{2}, frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/\u00B0/g, "\u02D8");
                var attributes = frame.textRange.characterAttributes;
                attributes.size = size;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, upright);
                return frame;
            }

            function stackBar(group, x0, x1, y) {
                var bar = group.pathItems.add();
                bar.setEntirePath([[x0, y], [x1, y]]);
                bar.filled = false;
                bar.stroked = true;
                bar.strokeColor = makeGray(100);
                bar.strokeWidth = 0.4;
                return bar;
            }

            function addText(text, x, y) {
                if (typeof buildStackedLabel === "function" && hasFractionText(text)) {
                    return buildStackedLabel(previewGroup, {text: text, at: [x, y], dir: [0, 0], upright: true}, fontPt, 0, stackFrame, stackBar);
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
                return frame;
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt)
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
                    attributes.textFont = korean ? korFont : engFont;
                    attributes.baselineShift = korean ? 0 : ENG_BASELINE_PT;
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-tree-diagram.js)
            // -------------------------------------------------------
            // "앞, 뒤 / 앞, 뒤" → [["앞","뒤"],["앞","뒤"]]. 빈 단계가 있으면 null (입력 중 끝의 /는 무시)
            function parseStages(text) {
                var parts = String(text).split("/");
                var stages = [];
                for (var i = 0; i < parts.length; i++) {
                    var items = [];
                    var pieces = parts[i].split(",");
                    for (var j = 0; j < pieces.length; j++) {
                        var item = pieces[j].replace(/^\s+|\s+$/g, "");
                        if (item !== "") items.push(item);
                    }
                    if (items.length === 0) {
                        if (i === parts.length - 1 && i > 0) continue;
                        return null;
                    }
                    stages.push(items);
                }
                return stages;
            }

            // 나무를 펼쳐 마디마다 {label, x, y, parent, leaf, path}. 끝 가지는 한 줄씩, 부모는 자식들 가운데.
            // 끝 가지가 limit를 넘으면 null
            function layoutTree(stages, withoutRepeat, stageGap, rowGap, limit) {
                var nodes = [], leafCount = 0, tooMany = false;
                function grow(depth, parentIndex, path) {
                    var ys = [];
                    var choices = stages[depth];
                    for (var i = 0; i < choices.length && !tooMany; i++) {
                        if (withoutRepeat && contains(path, choices[i])) continue;
                        var index = nodes.length;
                        var nextPath = path.concat([choices[i]]);
                        nodes.push({ label: choices[i], x: depth * stageGap, y: 0, parent: parentIndex, leaf: false, path: nextPath });
                        var last = depth + 1 >= stages.length;
                        var childYs = last ? [] : grow(depth + 1, index, nextPath);
                        if (!last && childYs.length === 0) {
                            nodes.pop();   // 중복 없이 뽑다가 다음 단계에 남은 게 없으면 이 가지는 없다
                            continue;
                        }
                        if (last) {
                            if (leafCount >= limit) { tooMany = true; nodes.pop(); break; }
                            nodes[index].leaf = true;
                            nodes[index].y = -leafCount * rowGap;
                            leafCount++;
                        } else {
                            nodes[index].y = (childYs[0] + childYs[childYs.length - 1]) / 2;
                        }
                        ys.push(nodes[index].y);
                    }
                    return ys;
                }
                grow(0, -1, []);
                if (tooMany) return null;
                return { nodes: nodes, leaves: leafCount };
            }

            function contains(list, value) {
                for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
                return false;
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { LINE_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return LINE_PT;
                return 0;
            }

            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
                if (p.length !== 4 || p[0] !== "v1") return;
                var groups = ["axis", "graph", "guide"];
                for (var i = 0; i < 3; i++) {
                    var value = parseFloat(p[i + 1]);
                    if (!isNaN(value) && LINE_DEFAULTS.hasOwnProperty(groups[i])) setLineWidth(groups[i], Math.min(2, Math.max(0.1, value)));
                }
            }

            function saveLineWidths() {
                var groups = ["axis", "graph", "guide"], parts = ["v1"];
                for (var i = 0; i < 3; i++) parts.push(LINE_DEFAULTS.hasOwnProperty(groups[i]) ? String(currentLineWidth(groups[i])) : "");
                try { app.preferences.setStringPreference(PREF_KEY + "/lines", parts.join("|")); } catch (e) {}
            }

            function addPanel(parent, title, foldKey) {
                // foldKey를 주면 접는 패널(기본 접힘)이다. body에 행을 넣는다 (헬퍼가 없으면 일반 패널)
                if (foldKey && typeof makeCollapsiblePanel === "function") {
                    var body = makeCollapsiblePanel(parent, title, true, SCRIPT_KEY + "/" + foldKey);
                    body.alignChildren = ["left", "top"];
                    body.spacing = 6;
                    return body;
                }
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = ["left", "top"];
                panel.margins = [12, 16, 12, 12];
                panel.spacing = 6;
                return panel;
            }

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (" + unitText + "):").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";
                return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter, initial) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(initial); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, initial) {
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
                saveLineWidths();
                var parts = ["v1", encodeURIComponent(stagesText), noRepeat ? "1" : "0", resultStyle, stageGapMm, rowGapMm, fontPt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 10) return;
                try {
                    stagesText = decodeURIComponent(p[1]);
                    noRepeat = p[2] === "1";
                    resultStyle = Math.round(restoreNumber(p[3], resultStyle, 0, RESULT_STYLES.length - 1));
                    stageGapMm = restoreNumber(p[4], stageGapMm, 6, 40);
                    rowGapMm = restoreNumber(p[5], rowGapMm, 2, 15);
                    fontPt = restoreNumber(p[6], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[9] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
})();
