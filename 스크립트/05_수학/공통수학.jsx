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
var SCRIPT_KEY = "HighMathCommon";

// 고등학교 공통수학: 이차함수(이차방정식·부등식)·도형의 이동·원과 직선·부등식의 영역·집합(벤다이어그램)·유리함수와 무리함수·대응 그림(함수) 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 고등학교 수학은 과목별 스크립트 다섯 개(공통수학·수학Ⅰ·수학Ⅱ·확률과 통계·기하)로 나뉘어 있고, 탭마다 저장 키는 예전 그대로다.
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighCommon/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

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
    var HEAD_PREF_KEY = "HighCommon/head";
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
    var RESET_BUTTON_WIDTH = 34;

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeQuadraticEngine(), makeMoveEngine(), makeCircleLineEngine(), makeInequalityEngine(), makeVennEngine(), makeRationalEngine(), makeMappingEngine(), makeDivisionEngine()];

    var win = new Window("dialog", "공통수학");
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

    // 저장된 탭이 선택에 맞지 않으면 앞에서부터 가능한 탭을 연다
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
    // 어느 탭도 선택에 맞지 않으면 여기서 끝낸다 — 꺼진 탭을 tabs.selection에 넣으면 ScriptUI가 유형 오류를 던진다
    if (engines[tabIndex].error) {
        var problems = [];
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) problems.push("[" + engines[engineIndex].label + "] " + engines[engineIndex].error);
        alert("선택이 어느 탭에도 맞지 않습니다.\n\n" + problems.join("\n"));
        return;
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

    // ==== 도형의 이동 ====
    // 도형의 이동: 점(A(1,2) B(4,1) C(2,4))으로 준 도형을 평행이동하거나 x축·y축·원점·y=x·y=-x, 점 (a, b), 직선 x=a·y=b에 대하여
    // 대칭이동한 그림을 좌표평면에 그린다. 옮긴 점은 A′, B′ …(프라임은 HancomEQN). 대칭축은 점선과 이름,
    // 대응점은 점선으로 잇고(평행이동은 끝에 작은 화살촉), 좌표 범위는 도형이 들어가게 자동으로 정한다.
    // 선 두께: 축 0.4pt, 도형 0.8pt, 대칭축·대응점 점선 0.3pt. 선택은 필요 없다.
    function makeMoveEngine() {
        var api = {label: "도형의 이동", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathMove/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var TICK_PT = 0.4;
            var GRID_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };
            registerHead(ARROW);
            var SMALL_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 };
            registerHead(SMALL_ARROW);
            var KINDS = ["평행이동 (a, b)", "x축 대칭", "y축 대칭", "원점 대칭", "y=x 대칭", "y=-x 대칭",
                "점 (a, b) 대칭", "직선 x=a 대칭", "직선 y=b 대칭"];
            var KIND_USES = [[true, true], [false, false], [false, false], [false, false], [false, false], [false, false],
                [true, true], [true, false], [false, true]];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["grid", "numbers", "links", "coords", "dashedOriginal"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var pointsText = "A(1,2) B(4,1) C(2,4)";
            var kind = 4;
            var aValue = 2;
            var bValue = -1;
            var opt = { grid: false, numbers: true, links: true, coords: false, dashedOriginal: false };
            var unitMm = 5;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {aValue: aValue, bValue: bValue, unitMm: unitMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];   // 선 두께 저장 순서(v2)
            var LINE_DEFAULTS = {axis: AXIS_PT, graph: MAIN_PT, guide: GUIDE_PT, tick: TICK_PT, grid: GRID_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var shapePanel = addPanel(win, "도형과 이동");
            var pointsRow = shapePanel.add("group");
            pointsRow.add("statictext", undefined, "도형:");
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 300;
            pointsInput.helpTip = "A(1,2) B(4,1) C(2,4)처럼. 점 1개는 점, 2개는 선분, 3개 이상은 다각형. 1/2 같은 분수도 된다";
            var kindRow = shapePanel.add("group");
            kindRow.add("statictext", undefined, "이동:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var aControls = addValueRow(shapePanel, "a", "", aValue, -10, 10, 0.5, 1);
            var bControls = addValueRow(shapePanel, "b", "", bValue, -10, 10, 0.5, 1);
            var messageText = shapePanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var stylePanel = addPanel(win, "표시");
            var checks = {};
            addCheckRow(stylePanel, [["grid", "격자"], ["numbers", "눈금 숫자"], ["links", "대응점 잇기"]]);
            addCheckRow(stylePanel, [["coords", "좌표 함께"], ["dashedOriginal", "원래 도형 점선"]]);
            var unitControls = addValueRow(stylePanel, "단위 길이", "mm", unitMm, 2, 15, 0.5, 1);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "대칭축 점선, 대응점을 잇는 점선";
            gridWidthControls.input.helpTip = "격자를 켰을 때 그리는 회색 모눈선";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(aControls, function(value) { aValue = value; }, defaults.aValue);
            bindValueRow(bControls, function(value) { bValue = value; }, defaults.bValue);
            bindValueRow(unitControls, function(value) { unitMm = value; }, defaults.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 도형을 못 읽으면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(messageText.text);
                    return false;
                }
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

            function refreshEnabled() {
                aControls.input.parent.enabled = KIND_USES[kind][0];
                bControls.input.parent.enabled = KIND_USES[kind][1];
            }

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
                var parsed = parseShape(pointsText);
                if (parsed === null || parsed.length === 0) {
                    messageText.text = "도형을 읽지 못함 (예: A(1,2) B(4,1))";
                    return;
                }
                messageText.text = " ";
                var drawing = buildMove(parsed, kind, aValue, bValue, {
                    unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, grid: opt.grid, numbers: opt.numbers,
                    links: opt.links, coords: opt.coords, dashedOriginal: opt.dashedOriginal
                });
                previewGroup = layer.groupItems.add();
                previewGroup.name = "도형의 이동";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[[x,y]…], closed, kind:"axis"|"tick"|"main"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(line.points);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "axis" ? AXIS_PT : (line.kind === "tick" ? TICK_PT : (line.kind === "grid" ? GRID_PT : GUIDE_PT)));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.dashed) path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var shape = arrow.small ? SMALL_ARROW : ARROW;
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
                applyTextFonts(frame, label.upright);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(′)는 HancomEQN. 점 이름(upright)은 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-move.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // "A(1,2) B(4,1)" → [{name, x, y}]. 괄호 밖 공백·쉼표·세미콜론은 구분자. 못 읽으면 null
            function parseShape(text) {
                var s = String(text), list = [], i = 0;
                while (i < s.length) {
                    var ch = s.charAt(i);
                    if (ch === " " || ch === "," || ch === ";" || ch === "\t") { i++; continue; }
                    var open = s.indexOf("(", i), close = open >= 0 ? s.indexOf(")", open) : -1;
                    if (open < 0 || close < 0) return null;
                    var inner = s.substring(open + 1, close), comma = inner.indexOf(",");
                    if (comma < 0) return null;
                    var x = fraction(inner.substring(0, comma)), y = fraction(inner.substring(comma + 1));
                    if (x === null || y === null) return null;
                    list.push({ name: s.substring(i, open).replace(/\s/g, ""), x: x, y: y });
                    i = close + 1;
                }
                return list;
            }

            // "-3", "2.5", "1/2", "-3/4" (글자 단위로 읽는다)
            function fraction(text) {
                var s = String(text).replace(/\s/g, "").split("−").join("-");
                var slash = s.indexOf("/");
                if (slash >= 0) {
                    var top = fraction(s.substring(0, slash)), bottom = fraction(s.substring(slash + 1));
                    return top === null || bottom === null || bottom === 0 ? null : top / bottom;
                }
                if (s === "" || s === "-") return null;
                var dots = 0;
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "-" && i === 0) continue;
                    if (ch === ".") { dots++; continue; }
                    if (ch < "0" || ch > "9") return null;
                }
                return dots > 1 ? null : parseFloat(s);
            }

            function transformPoint(p, kindIndex, a, b) {
                var x = p[0], y = p[1];
                switch (kindIndex) {
                    case 0: return [x + a, y + b];
                    case 1: return [x, -y];
                    case 2: return [-x, y];
                    case 3: return [-x, -y];
                    case 4: return [y, x];
                    case 5: return [-y, -x];
                    case 6: return [2 * a - x, 2 * b - y];
                    case 7: return [2 * a - x, y];
                    default: return [x, 2 * b - y];
                }
            }

            function buildMove(shape, kindIndex, a, b, o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [] };
                var original = [], moved = [];
                for (var i = 0; i < shape.length; i++) {
                    original.push([shape[i].x, shape[i].y]);
                    moved.push(transformPoint(original[i], kindIndex, a, b));
                }
                // 좌표 범위: 도형·옮긴 도형·원점(·대칭점)이 들어가게, 정수로 한 칸 여유
                var xs = [0], ys = [0];
                for (var k = 0; k < original.length; k++) { xs.push(original[k][0], moved[k][0]); ys.push(original[k][1], moved[k][1]); }
                if (kindIndex === 6) { xs.push(a); ys.push(b); }
                if (kindIndex === 7) xs.push(a);
                if (kindIndex === 8) ys.push(b);
                var xMin = Math.floor(Math.min.apply(null, xs)) - 1, xMax = Math.ceil(Math.max.apply(null, xs)) + 1;
                var yMin = Math.floor(Math.min.apply(null, ys)) - 1, yMax = Math.ceil(Math.max.apply(null, ys)) + 1;
                var right = xMax + 0.6, top = yMax + 0.6;

                if (o.grid) {
                    for (var gx = xMin; gx <= xMax; gx++) if (gx !== 0) out.lines.push({ points: [[gx * u, yMin * u], [gx * u, yMax * u]], kind: "grid" });
                    for (var gy = yMin; gy <= yMax; gy++) if (gy !== 0) out.lines.push({ points: [[xMin * u, gy * u], [xMax * u, gy * u]], kind: "grid" });
                }
                out.lines.push({ points: [[xMin * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], kind: "axis" });
                out.lines.push({ points: [[0, yMin * u], [0, top * u - ARROW.length + ARROW.notch]], kind: "axis" });
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                if (o.numbers) {
                    for (var tx = xMin; tx <= xMax; tx++) {
                        if (tx === 0) continue;
                        out.lines.push({ points: [[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], kind: "tick" });
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = yMin; ty <= yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push({ points: [[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], kind: "tick" });
                        out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 대칭축(점선)과 이름, 대칭점
                var axis = null, axisName = "";
                if (kindIndex === 4) { axis = [[Math.max(xMin, yMin), Math.max(xMin, yMin)], [Math.min(xMax, yMax), Math.min(xMax, yMax)]]; axisName = "y=x"; }
                if (kindIndex === 5) { var lo = Math.max(xMin, -yMax), hi = Math.min(xMax, -yMin); axis = [[lo, -lo], [hi, -hi]]; axisName = "y=-x"; }
                if (kindIndex === 7) { axis = [[a, yMin], [a, yMax]]; axisName = "x=" + formatValue(a); }
                if (kindIndex === 8) { axis = [[xMin, b], [xMax, b]]; axisName = "y=" + formatValue(b); }
                if (axis) {
                    out.lines.push({ points: [[axis[0][0] * u, axis[0][1] * u], [axis[1][0] * u, axis[1][1] * u]], kind: "guide", dashed: true });
                    out.texts.push({ text: axisName, at: [axis[1][0] * u, axis[1][1] * u], dir: kindIndex === 8 ? [1, 0] : [0.7071, 0.7071] });
                }
                if (kindIndex === 6) {
                    out.dots.push([a * u, b * u]);
                    out.texts.push({ text: "(" + formatValue(a) + ", " + formatValue(b) + ")", at: [a * u, b * u], dir: [0.7071, -0.7071], upright: true });
                }

                // 도형과 옮긴 도형
                var closed = original.length >= 3;
                out.lines.push({ points: scale(original, u), closed: closed, kind: "main", dashed: o.dashedOriginal });
                out.lines.push({ points: scale(moved, u), closed: closed, kind: "main" });
                if (original.length === 1) {
                    out.dots.push([original[0][0] * u, original[0][1] * u]);
                    out.dots.push([moved[0][0] * u, moved[0][1] * u]);
                }
                var c0 = centroid(original), c1 = centroid(moved);
                for (var p = 0; p < original.length; p++) {
                    var from = [original[p][0] * u, original[p][1] * u], to = [moved[p][0] * u, moved[p][1] * u];
                    var name = shape[p].name;
                    if (o.links && dist(from, to) > 1e-6) {
                        if (kindIndex === 0) {
                            var along = unit(sub(to, from));
                            out.lines.push({ points: [from, [to[0] - along[0] * SMALL_ARROW.length * 0.9, to[1] - along[1] * SMALL_ARROW.length * 0.9]], kind: "guide", dashed: true });
                            out.arrows.push({ tip: to, dir: along, small: true });
                        } else {
                            out.lines.push({ points: [from, to], kind: "guide", dashed: true });
                        }
                    }
                    if (name) {
                        var t0 = name + (o.coords ? "(" + formatValue(original[p][0]) + ", " + formatValue(original[p][1]) + ")" : "");
                        var t1 = name + "′" + (o.coords ? "(" + formatValue(moved[p][0]) + ", " + formatValue(moved[p][1]) + ")" : "");
                        out.texts.push({ text: t0, at: from, dir: labelDir(original[p], c0, original.length), upright: true });
                        out.texts.push({ text: t1, at: to, dir: labelDir(moved[p], c1, moved.length), upright: true });
                    }
                }
                return out;
            }

            // 다각형이면 무게중심에서 멀어지는 쪽, 점·선분이면 오른쪽 위
            function labelDir(p, center, count) {
                if (count < 3) return [0.7071, 0.7071];
                return unit(sub(p, center));
            }

            function centroid(points) {
                var x = 0, y = 0;
                for (var i = 0; i < points.length; i++) { x += points[i][0]; y += points[i][1]; }
                return [x / points.length, y / points.length];
            }

            function formatValue(v) {
                return String(Math.round(v * 100) / 100);
            }

            function scale(points, u) {
                var out = [];
                for (var i = 0; i < points.length; i++) out.push([points[i][0] * u, points[i][1] * u]);
                return out;
            }

            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·눈금·그래프·보조선·모눈): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "graph") { MAIN_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "grid") { GRID_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "graph") return MAIN_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "tick") return TICK_PT;
                if (group === "grid") return GRID_PT;
                return 0;
            }

            // v1(축·그래프·보조선 3개)도 읽는다. 새로 생긴 칸은 v1에 없으므로 기본값 그대로다
            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", encodeURIComponent(pointsText), kind, aValue, bValue, flags, unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 11 || p[5].length !== FLAG_KEYS.length) return;
                try {
                    pointsText = decodeURIComponent(p[1]);
                    kind = Math.round(restoreNumber(p[2], kind, 0, KINDS.length - 1));
                    aValue = restoreNumber(p[3], aValue, -10, 10);
                    bValue = restoreNumber(p[4], bValue, -10, 10);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[5].charAt(i) === "1";
                    unitMm = restoreNumber(p[6], unitMm, 2, 15);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[10] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 원과 직선 ====
    // 원과 직선의 방정식: 원 (x-a)²+(y-b)²=r², 직선(y=2x+1, x=3, 2x+y-4=0), 점 P를 좌표평면에 그린다.
    // 원과 직선의 교점(A, B 또는 접점 T)과 위치 관계, 중심에서 직선까지 거리 d(수선의 발 H·직각 표시),
    // 점 P에서 원에 그은 두 접선(접점 T₁, T₂), 점 P와 직선 사이 거리를 고른다. 값과 식은 창에 보여 준다.
    // 좌표 범위는 원·점이 들어가게 자동으로 정한다. 선 두께: 축 0.4pt, 원·직선·접선 0.8pt, 점선·직각 표시 0.3pt.
    function makeCircleLineEngine() {
        var api = {label: "원과 직선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathCircleLine/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(√ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var TICK_PT = 0.4;
            var GRID_PT = 0.3;
            var MARK_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var RIGHT_MARK_MM = 1.5;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };
            registerHead(ARROW);
            var KAPPA = 0.5522847498;   // 원을 베지어 4개로
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["circle", "radius", "crossings", "centerDistance", "tangents", "pointDistance", "equations", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var centerX = 1, centerY = 1, radius = 2;
            var lineText = "y=x+2";
            var pointText = "P(4,3)";
            var opt = { circle: true, radius: true, crossings: true, centerDistance: true, tangents: false, pointDistance: false,
                equations: true, grid: false, numbers: true };
            var unitMm = 6;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {centerX: centerX, centerY: centerY, radius: radius, unitMm: unitMm, fontPt: fontPt, offsetXmm: offsetXmm,
                offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];   // 선 두께 저장 순서(v2)
            var LINE_DEFAULTS = {axis: AXIS_PT, graph: MAIN_PT, guide: GUIDE_PT, tick: TICK_PT, grid: GRID_PT, mark: MARK_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var circlePanel = addPanel(win, "원 (x-a)²+(y-b)²=r²");
            addCheckRow(circlePanel, [["circle", "원"], ["radius", "중심·반지름"]]);
            var aControls = addValueRow(circlePanel, "중심 a", "", centerX, -10, 10, 0.5, 1);
            var bControls = addValueRow(circlePanel, "중심 b", "", centerY, -10, 10, 0.5, 1);
            var rControls = addValueRow(circlePanel, "반지름 r", "", radius, 0.5, 10, 0.5, 1);

            var linePanel = addPanel(win, "직선 · 점");
            var lineRow = linePanel.add("group");
            lineRow.add("statictext", undefined, "직선:").preferredSize.width = 36;
            var lineInput = lineRow.add("edittext", undefined, lineText);
            lineInput.preferredSize.width = 300;
            lineInput.helpTip = "y=2x+1, x=3, 2x+y-4=0, y=-1/2x+3. 비우면 직선을 그리지 않는다";
            var pointRow = linePanel.add("group");
            pointRow.add("statictext", undefined, "점:").preferredSize.width = 36;
            var pointInput = pointRow.add("edittext", undefined, pointText);
            pointInput.preferredSize.width = 300;
            pointInput.helpTip = "P(4,3)처럼 하나. 1/2, √2도 된다. 비우면 점을 그리지 않는다";
            addCheckRow(linePanel, [["crossings", "원과 직선의 교점"], ["centerDistance", "중심과 직선 거리"], ["equations", "식 글자"]]);
            addCheckRow(linePanel, [["tangents", "P에서 그은 접선"], ["pointDistance", "P와 직선 거리"]]);

            var planePanel = addPanel(win, "좌표평면");
            var unitControls = addValueRow(planePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(planePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(planePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            var markWidthControls = addValueRow(lineWidthPanel, "표시", "pt", currentLineWidth("mark"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "중심·P에서 직선에 내린 수선 점선";
            gridWidthControls.input.helpTip = "격자를 켰을 때 그리는 회색 모눈선";
            markWidthControls.input.helpTip = "수선의 발에 그리는 직각 표시";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);
            bindValueRow(markWidthControls, function(value) { setLineWidth("mark", value); }, LINE_DEFAULTS.mark);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            bindValueRow(aControls, function(value) { centerX = value; }, defaults.centerX);
            bindValueRow(bControls, function(value) { centerY = value; }, defaults.centerY);
            bindValueRow(rControls, function(value) { radius = value; }, defaults.radius);
            lineInput.onChanging = function() { lineText = lineInput.text; updatePreview(); };
            pointInput.onChanging = function() { pointText = pointInput.text; updatePreview(); };
            bindValueRow(unitControls, function(value) { unitMm = value; }, defaults.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

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

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                }
            }

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
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                var problems = [];
                var line = null, point = null;
                if (String(lineText).replace(/\s/g, "") !== "") {
                    line = parseLine(lineText);
                    if (line === null) problems.push("직선을 읽지 못함 (예: y=2x+1, x=3, 2x+y-4=0)");
                }
                if (String(pointText).replace(/\s/g, "") !== "") {
                    point = parsePoint(pointText);
                    if (point === null) problems.push("점을 읽지 못함 (예: P(4,3))");
                }
                var drawing = buildCircleLine({
                    center: [centerX, centerY], r: radius, line: line, point: point, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    mark: RIGHT_MARK_MM * MM_TO_PT, circle: opt.circle, radius: opt.radius, crossings: opt.crossings,
                    centerDistance: opt.centerDistance, tangents: opt.tangents, pointDistance: opt.pointDistance,
                    equations: opt.equations, grid: opt.grid, numbers: opt.numbers
                });
                var notes = problems.concat(drawing.notes);
                messageText.text = notes.length > 0 ? notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "원과 직선";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"tick"|"main"|"guide"|"mark"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [], curved = false;
                for (var i = 0; i < line.points.length; i++) {
                    anchors.push(line.points[i].anchor);
                    if (line.points[i].left !== line.points[i].anchor || line.points[i].right !== line.points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (curved) {
                    for (var j = 0; j < line.points.length; j++) {
                        var point = path.pathPoints[j];
                        point.leftDirection = line.points[j].left;
                        point.rightDirection = line.points[j].right;
                    }
                }
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "axis" ? AXIS_PT : (line.kind === "tick" ? TICK_PT : (line.kind === "grid" ? GRID_PT : (line.kind === "mark" ? MARK_PT : GUIDE_PT))));
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup/sub: 위·아래첨자 글자 위치
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
                var marks = [[label.sup, FontBaselineOption.SUPERSCRIPT], [label.sub, FontBaselineOption.SUBSCRIPT]];
                for (var m = 0; m < marks.length; m++) {
                    if (!marks[m][0]) continue;
                    for (var s = 0; s < marks[m][0].length; s++) {
                        var markAttributes = frame.textRange.characters[marks[m][0][s]].characterAttributes;
                        markAttributes.baselinePosition = marks[m][1];
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(√)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-circle-line.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function buildCircleLine(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var C = o.center, r = o.r, L = o.line, P = o.point ? [o.point.x, o.point.y] : null;
                function S(p) { return [p[0] * u, p[1] * u]; }

                // 좌표 범위: 원·점·원점이 들어가게, 정수로 한 칸 여유
                var xs = [0], ys = [0];
                if (o.circle) { xs.push(C[0] - r, C[0] + r); ys.push(C[1] - r, C[1] + r); }
                if (P) { xs.push(P[0]); ys.push(P[1]); }
                var xMin = Math.floor(Math.min.apply(null, xs)) - 1, xMax = Math.ceil(Math.max.apply(null, xs)) + 1;
                var yMin = Math.floor(Math.min.apply(null, ys)) - 1, yMax = Math.ceil(Math.max.apply(null, ys)) + 1;
                var box = [xMin, xMax, yMin, yMax];
                var right = xMax + 0.6, top = yMax + 0.6;

                if (o.grid) {
                    for (var gx = xMin; gx <= xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, yMin * u], [gx * u, yMax * u]], "grid"));
                    for (var gy = yMin; gy <= yMax; gy++) if (gy !== 0) out.lines.push(straight([[xMin * u, gy * u], [xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[xMin * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, yMin * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                if (o.numbers) {
                    for (var tx = xMin; tx <= xMax; tx++) {
                        if (tx === 0) continue;
                        out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "tick"));
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = yMin; ty <= yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "tick"));
                        out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 원, 중심, 반지름(오른쪽 위 45°)
                if (o.circle) {
                    out.lines.push({ points: circlePoints(S(C), r * u), closed: true, kind: "main" });
                    if (o.radius) {
                        out.dots.push(S(C));
                        out.texts.push({ text: "C", at: S(C), dir: [-0.7071, -0.7071], upright: true });
                        var rim = [C[0] + r * 0.7071, C[1] + r * 0.7071];
                        out.lines.push(straight([S(C), S(rim)], "main"));
                        out.texts.push({ text: "r", at: S([(C[0] + rim[0]) / 2, (C[1] + rim[1]) / 2]), dir: [-0.7071, 0.7071] });
                    }
                    if (o.equations) {
                        var eq = circleEquation(C, r);
                        out.texts.push({ text: eq.text, sup: eq.sup, at: S([C[0] - r * 0.7071, C[1] + r * 0.7071]), dir: [-0.7071, 0.7071] });
                    }
                }

                // 직선
                if (L) {
                    var seg = clipLine(L, box);
                    if (seg !== null) {
                        out.lines.push(straight([S(seg[0]), S(seg[1])], "main"));
                        if (o.equations) {
                            var end = seg[1][1] >= seg[0][1] ? seg[1] : seg[0];
                            out.texts.push({ text: lineEquation(L), at: S(end), dir: [0.7071, 0.7071] });
                        }
                    }
                    if (o.circle) {
                        var H = footOn(L, C), d = distanceTo(L, C);
                        var relation = d < r - 1e-9 ? "두 점에서 만남" : (d <= r + 1e-9 ? "접함" : "만나지 않음");
                        out.notes.push("중심과 직선 거리 d = " + formatValue(d) + ", r = " + formatValue(r) + " → " + relation);
                        if (o.centerDistance && d > 1e-9) {
                            out.lines.push(straight([S(C), S(H)], "guide"));
                            addRightMark(out, H, L, C, u, o.mark);
                            out.texts.push({ text: "H", at: S(H), dir: awayFrom(H, C), upright: true });
                            out.texts.push({ text: "d", at: S([(C[0] + H[0]) / 2, (C[1] + H[1]) / 2]), dir: perpendicular(sub(H, C)) });
                        }
                        if (o.crossings) {
                            var points = crossings(L, C, r);
                            var names = points.length === 1 ? ["T"] : ["A", "B"];
                            for (var k = 0; k < points.length; k++) {
                                out.dots.push(S(points[k]));
                                out.texts.push({ text: names[k], at: S(points[k]), dir: awayFrom(points[k], C), upright: true });
                            }
                            if (points.length > 0) out.notes.push("교점 " + pointList(points, names));
                        }
                    }
                }

                // 점 P, P에서 그은 접선, P와 직선 거리
                if (P) {
                    out.dots.push(S(P));
                    out.texts.push({ text: o.point.name || "P", at: S(P), dir: o.circle ? awayFrom(P, C) : [0.7071, 0.7071], upright: true });
                    if (o.tangents && o.circle) {
                        var touch = tangentPoints(P, C, r);
                        if (touch === null) out.notes.push("P가 원 안에 있어 접선을 그을 수 없음");
                        else {
                            var eqs = [];
                            for (var tp = 0; tp < touch.length; tp++) {
                                var tangent = touch.length === 1 ? lineThrough(P, [P[0] - (P[1] - C[1]), P[1] + (P[0] - C[0])]) : lineThrough(P, touch[tp]);
                                var tseg = clipLine(tangent, box);
                                if (tseg !== null) out.lines.push(straight([S(tseg[0]), S(tseg[1])], "main"));
                                eqs.push(lineEquation(tangent));
                                if (touch.length === 2) {
                                    out.dots.push(S(touch[tp]));
                                    out.texts.push({ text: "T" + (tp + 1), sub: [1], at: S(touch[tp]), dir: awayFrom(touch[tp], C), upright: true });
                                }
                            }
                            out.notes.push("접선 " + eqs.join(", "));
                        }
                    }
                    if (o.pointDistance && L) {
                        var F = footOn(L, P), pd = distanceTo(L, P);
                        out.notes.push("P와 직선 거리 = " + formatValue(pd));
                        if (pd > 1e-9) {
                            out.lines.push(straight([S(P), S(F)], "guide"));
                            addRightMark(out, F, L, P, u, o.mark);
                        }
                    }
                }
                return out;
            }

            // 발 F에서 직선 방향과 점 쪽 방향으로 한 변 size인 직각 표시
            function addRightMark(out, F, L, toward, u, size) {
                var along = unit([-L.b, L.a]), up = unit(sub(toward, F));
                var p = [F[0] * u, F[1] * u];
                out.lines.push(straight([
                    [p[0] + along[0] * size, p[1] + along[1] * size],
                    [p[0] + (along[0] + up[0]) * size, p[1] + (along[1] + up[1]) * size],
                    [p[0] + up[0] * size, p[1] + up[1] * size]
                ], "mark"));
            }

            // "y=2x+1", "x=3", "2x+y-4=0" → {a, b, c} (ax+by+c=0, a²+b²=1로 맞춘다). 일차식이 아니면 null
            function parseLine(text) {
                var s = String(text).replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq <= 0 || eq === s.length - 1 || s.indexOf("=", eq + 1) >= 0) return null;
                var left = side(s.substring(0, eq)), right = side(s.substring(eq + 1));
                if (left === null || right === null) return null;
                function L(x, y) { return left(x, y) - right(x, y); }
                var c = L(0, 0), a = L(1, 0) - c, b = L(0, 1) - c;
                if (!isFinite(a) || !isFinite(b) || !isFinite(c)) return null;
                var tests = [[2, 3], [-1.5, 0.5], [4, -2]];
                for (var i = 0; i < tests.length; i++) {
                    var expect = a * tests[i][0] + b * tests[i][1] + c;
                    if (Math.abs(L(tests[i][0], tests[i][1]) - expect) > 1e-9 * (1 + Math.abs(expect))) return null;
                }
                var n = Math.sqrt(a * a + b * b);
                if (n < 1e-12) return null;
                return { a: a / n, b: b / n, c: c / n };
                // 한쪽 식을 (x, y)의 함수로. y는 괄호로 감싼 수로 바꿔 x의 식으로 읽는다
                function side(expr) {
                    var cache = {};
                    return function(x, y) {
                        var key = String(y);
                        if (!(key in cache)) cache[key] = compileFunction(expr.split("y").join("(" + (y < 0 ? "0" + y : y) + ")"));
                        if (cache[key] === null) return NaN;
                        return cache[key](x);
                    };
                }
            }

            // "P(4,3)" → {name, x, y}. 좌표는 1/2, √2도 된다
            function parsePoint(text) {
                var s = String(text).replace(/\s/g, "");
                var open = s.indexOf("("), close = s.lastIndexOf(")"), comma = s.indexOf(",", open);
                if (open < 0 || close < comma || comma < 0) return null;
                var fx = compileFunction(s.substring(open + 1, comma)), fy = compileFunction(s.substring(comma + 1, close));
                if (fx === null || fy === null || s.substring(open + 1, close).indexOf("x") >= 0) return null;
                var x = fx(0), y = fy(0);
                if (!isFinite(x) || !isFinite(y)) return null;
                return { name: s.substring(0, open), x: x, y: y };
            }

            function distanceTo(L, p) { return Math.abs(L.a * p[0] + L.b * p[1] + L.c); }
            function footOn(L, p) {
                var t = L.a * p[0] + L.b * p[1] + L.c;
                return [p[0] - L.a * t, p[1] - L.b * t];
            }

            // 원과 직선의 교점 (x 순서). 접하면 하나
            function crossings(L, C, r) {
                var d = distanceTo(L, C), H = footOn(L, C);
                if (d > r + 1e-9) return [];
                if (d >= r - 1e-9) return [H];
                var h = Math.sqrt(r * r - d * d), dir = [-L.b, L.a];
                var p = [H[0] + dir[0] * h, H[1] + dir[1] * h], q = [H[0] - dir[0] * h, H[1] - dir[1] * h];
                return p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) ? [p, q] : [q, p];
            }

            // P에서 원에 그은 접선의 접점 두 개. P가 원 위면 [P], 안이면 null
            function tangentPoints(P, C, r) {
                var v = sub(P, C), dist = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                if (dist < r - 1e-9) return null;
                if (dist <= r + 1e-9) return [P];
                var base = Math.atan2(v[1], v[0]), spread = Math.acos(r / dist);
                return [[C[0] + r * Math.cos(base + spread), C[1] + r * Math.sin(base + spread)],
                    [C[0] + r * Math.cos(base - spread), C[1] + r * Math.sin(base - spread)]];
            }

            function lineThrough(p, q) {
                var a = q[1] - p[1], b = p[0] - q[0], n = Math.sqrt(a * a + b * b);
                return { a: a / n, b: b / n, c: -(a * p[0] + b * p[1]) / n };
            }

            // 직선이 [x0,x1]×[y0,y1] 안에 드는 선분 (Liang–Barsky). 안 지나면 null
            function clipLine(L, box) {
                var p0 = [-L.a * L.c, -L.b * L.c], d = [-L.b, L.a];
                var t0 = -1e6, t1 = 1e6;
                var checks = [[-d[0], p0[0] - box[0]], [d[0], box[1] - p0[0]], [-d[1], p0[1] - box[2]], [d[1], box[3] - p0[1]]];
                for (var i = 0; i < checks.length; i++) {
                    var pk = checks[i][0], qk = checks[i][1];
                    if (Math.abs(pk) < 1e-12) {
                        if (qk < 0) return null;
                        continue;
                    }
                    var t = qk / pk;
                    if (pk < 0) t0 = Math.max(t0, t);
                    else t1 = Math.min(t1, t);
                }
                if (t1 - t0 < 1e-9) return null;
                var a = [p0[0] + d[0] * t0, p0[1] + d[1] * t0], b = [p0[0] + d[0] * t1, p0[1] + d[1] * t1];
                return a[0] < b[0] || (Math.abs(a[0] - b[0]) < 1e-12 && a[1] < b[1]) ? [a, b] : [b, a];
            }

            // y = 2x + 1, y = -x/2 … 대신 소수 둘째 자리 (y = -0.5x + 3), 세로선은 x = 3
            function lineEquation(L) {
                if (Math.abs(L.b) < 1e-12) return "x=" + formatValue(-L.c / L.a);
                var m = -L.a / L.b, k = -L.c / L.b;
                var mText = formatValue(m), kText = formatValue(Math.abs(k));
                if (mText === "0") return "y=" + formatValue(k);
                var text = "y=" + (mText === "1" ? "" : (mText === "-1" ? "-" : mText)) + "x";
                if (kText !== "0") text += (k < 0 ? "-" : "+") + kText;
                return text;
            }

            // (x-1)²+(y+2)²=4 (²는 위첨자 2)
            function circleEquation(C, r) {
                var text = "", sup = [];
                function square(name, center) {
                    if (Math.abs(center) < 1e-12) text += name;
                    else text += "(" + name + (center > 0 ? "-" : "+") + formatValue(Math.abs(center)) + ")";
                    sup.push(text.length);
                    text += "2";
                }
                square("x", C[0]);
                text += "+";
                square("y", C[1]);
                text += "=" + formatValue(r * r);
                return { text: text, sup: sup };
            }

            function pointList(points, names) {
                var parts = [];
                for (var i = 0; i < points.length; i++) parts.push(names[i] + "(" + formatValue(points[i][0]) + ", " + formatValue(points[i][1]) + ")");
                return parts.join(", ");
            }

            // 중심 (cx, cy), 반지름 r인 원: 오른쪽에서 시작해 반시계로 앵커 4개
            function circlePoints(c, r) {
                var h = r * KAPPA, out = [];
                var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                for (var i = 0; i < 4; i++) {
                    var d = dirs[i], t = [-d[1], d[0]];
                    var anchor = [c[0] + d[0] * r, c[1] + d[1] * r];
                    out.push({ anchor: anchor, left: [anchor[0] - t[0] * h, anchor[1] - t[1] * h], right: [anchor[0] + t[0] * h, anchor[1] + t[1] * h] });
                }
                return out;
            }

            function awayFrom(p, center) {
                var v = sub(p, center);
                return Math.abs(v[0]) + Math.abs(v[1]) < 1e-9 ? [0.7071, 0.7071] : unit(v);
            }

            function perpendicular(v) {
                var n = unit([-v[1], v[0]]);
                return n[1] < 0 ? [-n[0], -n[1]] : n;
            }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
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
            function compileFunction(text) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["arcsin", "arccos", "arctan", "sqrt", "sin", "cos", "tan", "sec", "log", "ln", "pi", "e", "x"];
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
                        if (name === "x") return function(x) { return x; };
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

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·눈금·그래프·보조선·모눈·표시): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "graph") { MAIN_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "grid") { GRID_PT = value; }
                if (group === "mark") { MARK_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "graph") return MAIN_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "tick") return TICK_PT;
                if (group === "grid") return GRID_PT;
                if (group === "mark") return MARK_PT;
                return 0;
            }

            // v1(축·그래프·보조선 3개)도 읽는다. 새로 생긴 칸은 v1에 없으므로 기본값 그대로다
            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", centerX, centerY, radius, encodeURIComponent(lineText), encodeURIComponent(pointText), flags,
                    unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 12 || p[6].length !== FLAG_KEYS.length) return;
                try {
                    centerX = restoreNumber(p[1], centerX, -10, 10);
                    centerY = restoreNumber(p[2], centerY, -10, 10);
                    radius = restoreNumber(p[3], radius, 0.5, 10);
                    lineText = decodeURIComponent(p[4]);
                    pointText = decodeURIComponent(p[5]);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[6].charAt(i) === "1";
                    unitMm = restoreNumber(p[7], unitMm, 2, 20);
                    fontPt = restoreNumber(p[8], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[11] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 부등식의 영역 ====
    // 부등식의 영역: 부등식 3개까지(y>2x+1, y<=-x^2+4, x^2+y^2<=4, 2x+3y<6, x>1)를 모두 만족하는 영역을 칠한다.
    // 경계선은 등호가 있으면(≤, ≥) 실선, 없으면(<, >) 점선 (교과서 규칙). 식 글자를 경계선 끝에 붙일 수 있다.
    // 읽는 꼴: y ⋚ f(x) (곡선), 일차식(직선), x ⋚ c (세로선), x²·y² 계수가 같은 이차식(원). 그 밖의 식은 알려 준다.
    // 칠하기는 가로로 촘촘히 나눈 x마다 모든 부등식을 만족하는 y 구간을 정확히 구해 위·아래 끝을 이은 면으로 만든다
    // (패스파인더를 쓰지 않는다). 선 두께: 축 0.4pt, 경계 0.8pt(점선 포함). 선택은 필요 없다.
    function makeInequalityEngine() {
        var api = {label: "부등식 영역", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathInequality/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var INEQUALITY_COUNT = 3;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(≤, ≥)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var BOUNDARY_PT = 0.8;
            var TICK_PT = 0.4;
            var GRID_PT = 0.4;
            var GRID_K = 30;
            var BOUNDARY_DASH = [3, 2];
            var TICK_MM = 1.2;
            var LABEL_GAP_MM = 0.8;
            var COLUMNS = 240;   // 칠하기 가로 나눔
            var KAPPA = 0.5522847498;
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };
            registerHead(ARROW);
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["shade", "formulas", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var texts = ["y<=-x^2+4", "y>=x", ""];
            var xMin = -3, xMax = 3, yMin = -3, yMax = 5;
            var unitMm = 6;
            var shadeK = 20;
            var fontPt = 8;
            var opt = { shade: true, formulas: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {shadeK: shadeK, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unitMm: unitMm, fontPt: fontPt,
                offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];   // 선 두께 저장 순서(v2)
            var LINE_DEFAULTS = {axis: AXIS_PT, graph: BOUNDARY_PT, tick: TICK_PT, grid: GRID_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var inequalityPanel = addPanel(win, "부등식 (모두 만족하는 영역)");
            var inputs = [];
            for (var q = 0; q < INEQUALITY_COUNT; q++) {
                var row = inequalityPanel.add("group");
                row.add("statictext", undefined, (q + 1) + ":").preferredSize.width = 20;
                var input = row.add("edittext", undefined, texts[q]);
                input.preferredSize.width = 320;
                input.helpTip = "y>2x+1, y<=-x^2+4, x^2+y^2<=4, (x-1)^2+y^2>1, 2x+3y<6, x>1. <=는 ≤, >=는 ≥";
                inputs.push(input);
            }
            addCheckRow(inequalityPanel, [["shade", "영역 칠하기"], ["formulas", "식 글자"]]);
            var shadeControls = addValueRow(inequalityPanel, "음영", "K", shadeK, 5, 60, 5, 0);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            gridWidthControls.input.helpTip = "격자를 켰을 때 그리는 회색 모눈선";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            for (var bi = 0; bi < INEQUALITY_COUNT; bi++) bindInput(bi);
            bindValueRow(shadeControls, function(value) { shadeK = value; }, defaults.shadeK);
            bindValueRow(xMinControls, function(value) { xMin = value; }, defaults.xMin);
            bindValueRow(xMaxControls, function(value) { xMax = value; }, defaults.xMax);
            bindValueRow(yMinControls, function(value) { yMin = value; }, defaults.yMin);
            bindValueRow(yMaxControls, function(value) { yMax = value; }, defaults.yMax);
            bindValueRow(unitControls, function(value) { unitMm = value; }, defaults.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

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

            function bindInput(index) {
                inputs[index].onChanging = function() { texts[index] = inputs[index].text; updatePreview(); };
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                }
            }

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
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                var list = [], problems = [];
                for (var i = 0; i < INEQUALITY_COUNT; i++) {
                    if (String(texts[i]).replace(/\s/g, "") === "") continue;
                    var parsed = parseInequality(texts[i]);
                    if (parsed === null) problems.push((i + 1) + "번을 읽지 못함");
                    else list.push(parsed);
                }
                var drawing = buildInequality({
                    list: list, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    shade: opt.shade, shadeK: shadeK, formulas: opt.formulas, grid: opt.grid, numbers: opt.numbers, fontSize: fontPt
                });
                var notes = problems.concat(drawing.notes);
                messageText.text = notes.length > 0 ? notes.join(" · ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "부등식의 영역";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var l = 0; l < drawing.lines.length; l++) addPath(drawing.lines[l]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // 칠한 영역: {points:[[x,y]…], k}
            function addFill(fill) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(fill.points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(fill.k);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"tick"|"boundary"|"grid", dashed}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [], curved = false;
                for (var i = 0; i < line.points.length; i++) {
                    anchors.push(line.points[i].anchor);
                    if (line.points[i].left !== line.points[i].anchor || line.points[i].right !== line.points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (curved) {
                    for (var j = 0; j < line.points.length; j++) {
                        var point = path.pathPoints[j];
                        point.leftDirection = line.points[j].left;
                        point.rightDirection = line.points[j].right;
                    }
                }
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "boundary" ? BOUNDARY_PT : (line.kind === "tick" ? TICK_PT : (line.kind === "grid" ? GRID_PT : AXIS_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.dashed) path.strokeDashes = BOUNDARY_DASH;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup/sub/roman: 첨자·똑바로 쓸 글자 위치
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
                var marks = [[label.sup, "sup"], [label.sub, "sub"], [label.roman, "roman"]];
                for (var m = 0; m < marks.length; m++) {
                    if (!marks[m][0]) continue;
                    for (var s = 0; s < marks[m][0].length; s++) {
                        var markAttributes = frame.textRange.characters[marks[m][0][s]].characterAttributes;
                        if (marks[m][1] === "sup") markAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                        else if (marks[m][1] === "sub") markAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                        else markAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(≤, ≥)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-inequality.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 부등식 하나 → {text, strict, kind, …}
            //   kind "above"/"below": y > f(x) / y < f(x) (fn)
            //   kind "right"/"left":  x > c / x < c (c)
            //   kind "inside"/"outside": 원 (cx, cy, r)
            // 일차식 ax+by+c ⋚ 0은 b ≠ 0이면 above/below, b = 0이면 right/left로 바꾼다. 못 읽으면 null
            function parseInequality(text) {
                var s = String(text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=").split("=<").join("<=").split("=>").join(">=");
                var at = -1, op = "";
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "<" || ch === ">") { at = i; op = s.charAt(i + 1) === "=" ? ch + "=" : ch; break; }
                }
                if (at <= 0 || at + op.length >= s.length) return null;
                var left = s.substring(0, at), right = s.substring(at + op.length);
                if (left.indexOf("<") >= 0 || left.indexOf(">") >= 0 || right.indexOf("<") >= 0 || right.indexOf(">") >= 0) return null;
                var greater = op.charAt(0) === ">", strict = op.length === 1;
                var result = { text: text, strict: strict };
                // y ⋚ f(x), f(x) ⋚ y
                if ((left === "y" || right === "y") && (left === "y" ? right : left).indexOf("y") < 0) {
                    var other = left === "y" ? right : left;
                    var fn = compileFunction(other);
                    if (fn === null) return null;
                    var yGreater = left === "y" ? greater : !greater;
                    result.kind = yGreater ? "above" : "below";
                    result.fn = fn;
                    result.label = "y" + (yGreater ? ">" : "<") + other;
                    return result;
                }
                // 나머지는 G(x, y) = left - right ⋚ 0
                function G(x, y) { return evalSide(left, x, y) - evalSide(right, x, y); }
                var g00 = G(0, 0), g10 = G(1, 0), gm10 = G(-1, 0), g01 = G(0, 1), g0m1 = G(0, -1), g11 = G(1, 1);
                if (isNaN(g00) || isNaN(g10) || isNaN(gm10) || isNaN(g01) || isNaN(g0m1) || isNaN(g11)) return null;
                var k = (g10 + gm10 - 2 * g00) / 2, ky = (g01 + g0m1 - 2 * g00) / 2;
                var D = (g10 - gm10) / 2, E = (g01 - g0m1) / 2, F = g00;
                if (Math.abs(k - ky) > 1e-9 || Math.abs(g11 - (k * 2 + D + E + F)) > 1e-9) return null;
                // 다른 점에서도 맞는지 (x³ 같은 식 걸러내기)
                var probes = [[2, -3], [-1.5, 2.5], [3, 1]];
                for (var p = 0; p < probes.length; p++) {
                    var px = probes[p][0], py = probes[p][1], want = k * (px * px + py * py) + D * px + E * py + F;
                    if (Math.abs(G(px, py) - want) > 1e-7 * (1 + Math.abs(want))) return null;
                }
                if (Math.abs(k) < 1e-12) {
                    if (Math.abs(D) < 1e-12 && Math.abs(E) < 1e-12) return null;
                    if (Math.abs(E) < 1e-12) {
                        // D x + F ⋚ 0 → x ⋚ -F/D
                        result.c = -F / D;
                        result.kind = (greater === (D > 0)) ? "right" : "left";
                        return result;
                    }
                    // D x + E y + F ⋚ 0 → y ⋚ (-D x - F)/E
                    var slope = -D / E, cut = -F / E;
                    result.kind = (greater === (E > 0)) ? "above" : "below";
                    result.fn = function(x) { return slope * x + cut; };
                    result.line = { slope: slope, cut: cut };
                    return result;
                }
                // k(x² + y²) + D x + E y + F ⋚ 0 → 원
                var cx = -D / (2 * k) + 0, cy = -E / (2 * k) + 0, r2 = cx * cx + cy * cy - F / k;   // + 0: -0 → 0
                if (!(r2 > 1e-12)) return null;
                result.cx = cx;
                result.cy = cy;
                result.r = Math.sqrt(r2);
                result.kind = (greater === (k > 0)) ? "outside" : "inside";
                return result;
            }

            // 한쪽 식의 (x, y) 값. y는 괄호로 감싼 수로 바꿔 x의 식으로 읽는다
            function evalSide(expr, x, y) {
                if (expr.indexOf("y") < 0) {
                    var fx = compileFunction(expr);
                    return fx === null ? NaN : fx(x);
                }
                var fn = compileFunction(expr.split("y").join("(" + (y < 0 ? "0" + y : y) + ")"));
                return fn === null ? NaN : fn(x);
            }

            // x에서 부등식 하나를 만족하는 y 구간들 [[lo, hi]…] (등호 여부는 칠하기에서 무시한다)
            function intervalsAt(ineq, x) {
                var INF = 1e9;
                if (ineq.kind === "above" || ineq.kind === "below") {
                    var y;
                    try { y = ineq.fn(x); } catch (e) { return []; }
                    if (typeof y !== "number" || !isFinite(y)) return [];
                    return ineq.kind === "above" ? [[y, INF]] : [[-INF, y]];
                }
                if (ineq.kind === "right" || ineq.kind === "left") {
                    return (ineq.kind === "right" ? x > ineq.c : x < ineq.c) ? [[-INF, INF]] : [];
                }
                var dx = x - ineq.cx, h2 = ineq.r * ineq.r - dx * dx;
                if (h2 <= 0) return ineq.kind === "inside" ? [] : [[-INF, INF]];
                var h = Math.sqrt(h2);
                return ineq.kind === "inside" ? [[ineq.cy - h, ineq.cy + h]] : [[-INF, ineq.cy - h], [ineq.cy + h, INF]];
            }

            function intersectIntervals(a, b) {
                var out = [];
                for (var i = 0; i < a.length; i++) {
                    for (var j = 0; j < b.length; j++) {
                        var lo = Math.max(a[i][0], b[j][0]), hi = Math.min(a[i][1], b[j][1]);
                        if (hi > lo) out.push([lo, hi]);
                    }
                }
                out.sort(function(p, q) { return p[0] - q[0]; });
                return out;
            }

            // 영역을 면들로: x마다 구간을 구하고, 구간 수가 같은 동안 위·아래 끝을 이어 한 면으로. 반환 [[[x,y]…]…] (좌표 단위)
            function regionPolygons(list, x0, x1, y0, y1, columns) {
                var polygons = [], open = null;
                function close() {
                    if (open === null) return;
                    for (var i = 0; i < open.length; i++) {
                        var poly = open[i];
                        if (poly.upper.length >= 2) polygons.push(poly.lower.concat(poly.upper.reverse()));
                    }
                    open = null;
                }
                for (var c = 0; c <= columns; c++) {
                    var x = x0 + (x1 - x0) * c / columns;
                    var spans = [[y0, y1]];
                    for (var k = 0; k < list.length; k++) spans = intersectIntervals(spans, intervalsAt(list[k], x));
                    if (open !== null && open.length !== spans.length) close();
                    if (spans.length === 0) continue;
                    if (open === null) {
                        open = [];
                        for (var s = 0; s < spans.length; s++) open.push({ lower: [], upper: [] });
                    }
                    for (var t = 0; t < spans.length; t++) {
                        open[t].lower.push([x, spans[t][0]]);
                        open[t].upper.push([x, spans[t][1]]);
                    }
                }
                close();
                return polygons;
            }

            function buildInequality(o) {
                var u = o.unit;
                var out = { fills: [], lines: [], arrows: [], texts: [], notes: [] };
                var box = [o.xMin, o.xMax, o.yMin, o.yMax];

                var left = Math.min(o.xMin, 0) - 0.5, right = o.xMax + 0.8, bottom = Math.min(o.yMin, 0) - 0.5, top = o.yMax + 0.8;
                // 경계선과 칠한 영역은 X축 화살촉 가장 왼쪽(뒤끝)까지 진행한다 (그림 제작 규칙 7.7)
                var plotHi = Math.max(o.xMax, right - (ARROW.rear || ARROW.length) / u);
                if (o.grid) {
                    for (var gx = o.xMin; gx <= o.xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, o.yMin * u], [gx * u, o.yMax * u]], "grid"));
                    for (var gy = o.yMin; gy <= o.yMax; gy++) if (gy !== 0) out.lines.push(straight([[o.xMin * u, gy * u], [o.xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = o.xMin; tx <= o.xMax; tx++) {
                    if (tx === 0) continue;
                    out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "tick"));
                    if (o.numbers) out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var ty = o.yMin; ty <= o.yMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "tick"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 영역
                if (o.list.length > 0 && o.shade) {
                    var polygons = regionPolygons(o.list, o.xMin, plotHi, o.yMin, o.yMax, COLUMNS);
                    for (var p = 0; p < polygons.length; p++) {
                        var pts = [];
                        for (var q = 0; q < polygons[p].length; q++) pts.push([polygons[p][q][0] * u, polygons[p][q][1] * u]);
                        out.fills.push({ points: pts, k: o.shadeK });
                    }
                    if (polygons.length === 0) out.notes.push("모두 만족하는 영역이 범위 안에 없음");
                }

                // 경계선: 등호가 없으면 점선
                var formulaLabels = [];
                for (var b = 0; b < o.list.length; b++) {
                    var ineq = o.list[b], end = null;
                    if (ineq.kind === "above" || ineq.kind === "below") {
                        var segments = plotFunction(ineq.fn, o.xMin, plotHi, o.yMin, o.yMax);
                        for (var s = 0; s < segments.length; s++) {
                            if (segments[s].length < 2) continue;
                            out.lines.push({ points: toBezier(segments[s], u), kind: "boundary", dashed: ineq.strict });
                            var last = segments[s][segments[s].length - 1];
                            end = [last.x * u, last.y * u];
                        }
                    } else if (ineq.kind === "right" || ineq.kind === "left") {
                        if (ineq.c >= o.xMin && ineq.c <= o.xMax) {
                            out.lines.push(straight([[ineq.c * u, o.yMin * u], [ineq.c * u, o.yMax * u]], "boundary", ineq.strict));
                            end = [ineq.c * u, o.yMax * u];
                        }
                    } else {
                        out.lines.push({ points: circlePoints([ineq.cx * u, ineq.cy * u], ineq.r * u), closed: true, kind: "boundary", dashed: ineq.strict });
                        end = [(ineq.cx + ineq.r * 0.7071) * u, (ineq.cy + ineq.r * 0.7071) * u];
                    }
                    if (o.formulas && end) {
                        var display = formulaDisplay(boundaryText(ineq));
                        formulaLabels.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: end, dir: [0.7071, 0.7071] });
                    }
                }
                formulaLabels.sort(function(p1, p2) { return p2.at[1] - p1.at[1]; });
                var lineGap = (o.fontSize || 8) * 1.3;
                for (var fl = 0; fl < formulaLabels.length; fl++) {
                    for (var prior = 0; prior < fl; prior++) {
                        var upper = formulaLabels[prior], lower = formulaLabels[fl];
                        if (Math.abs(upper.at[0] - lower.at[0]) < lineGap * 4 && upper.at[1] - lower.at[1] < lineGap) lower.at = [lower.at[0], upper.at[1] - lineGap];
                    }
                    out.texts.push(formulaLabels[fl]);
                }
                return out;
            }

            // 경계선의 식 글자 (부등호를 =로): y=-x^2+4, x=1, x^2+y^2=4
            function boundaryText(ineq) {
                var s = String(ineq.text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=");
                var out = "";
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "<" || ch === ">") {
                        out += "=";
                        if (s.charAt(i + 1) === "=") i++;
                        continue;
                    }
                    out += ch;
                }
                return out;
            }

            // 중심 c, 반지름 r인 원: 오른쪽에서 시작해 반시계로 앵커 4개
            function circlePoints(c, r) {
                var h = r * KAPPA, out = [];
                var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                for (var i = 0; i < 4; i++) {
                    var d = dirs[i], t = [-d[1], d[0]];
                    var anchor = [c[0] + d[0] * r, c[1] + d[1] * r];
                    out.push({ anchor: anchor, left: [anchor[0] - t[0] * h, anchor[1] - t[1] * h], right: [anchor[0] + t[0] * h, anchor[1] + t[1] * h] });
                }
                return out;
            }

            function straight(anchors, kind, dashed) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind, dashed: !!dashed };
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
            function compileFunction(text) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["arcsin", "arccos", "arctan", "sqrt", "sin", "cos", "tan", "sec", "log", "ln", "pi", "e", "x"];
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
                        if (name === "x") return function(x) { return x; };
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

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·눈금·그래프·모눈): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "graph") { BOUNDARY_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "grid") { GRID_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "graph") return BOUNDARY_PT;
                if (group === "tick") return TICK_PT;
                if (group === "grid") return GRID_PT;
                return 0;
            }

            // v1(축·그래프·보조선 3개)도 읽는다. 새로 생긴 칸은 v1에 없으므로 기본값 그대로다
            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", encodeURIComponent(texts[0]), encodeURIComponent(texts[1]), encodeURIComponent(texts[2]),
                    xMin, xMax, yMin, yMax, unitMm, shadeK, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 15 || p[11].length !== FLAG_KEYS.length) return;
                try {
                    texts = [decodeURIComponent(p[1]), decodeURIComponent(p[2]), decodeURIComponent(p[3])];
                    xMin = Math.round(restoreNumber(p[4], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[5], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[6], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[7], yMax, 1, 20));
                    unitMm = restoreNumber(p[8], unitMm, 2, 20);
                    shadeK = restoreNumber(p[9], shadeK, 5, 60);
                    fontPt = restoreNumber(p[10], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[11].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[12], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[13], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[14] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 벤다이어그램 ====
    // 벤다이어그램: 전체집합 U(사각형) 안에 집합 2개(A, B) 또는 3개(A, B, C)를 교과서처럼 겹쳐 그리고,
    // 집합 식(A∩B, A∪B, A-B, (A∪B)ᶜ, A∩Bᶜ∩C …)이 나타내는 영역을 칠한다.
    // 칠하는 영역은 조각을 겹치지 않고 원호를 이어 붙인 패스 하나(구멍은 복합 패스)로 만들어 조각 사이 틈이 없다.
    // 입력은 ∩ 대신 n·&, ∪ 대신 u·+, ᶜ 대신 '·^c도 받는다. 선 두께: 원·사각형 0.8pt.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeVennEngine() {
        var api = {label: "벤다이어그램", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathVenn/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var LABEL_GAP_MM = 0.8;
            var COUNTS = ["2개 (A, B)", "3개 (A, B, C)", "1개 (A)"];
            var ARRANGEMENTS = ["겹침", "서로소 (떨어진 두 원)", "포함 (B가 A 안에)"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var setCount = 0;
            var shadeText = "A∩B";
            var shadeK = 25;
            var radiusMm = 12;
            var overlapPct = 45;
            var fontPt = 8;
            var arrangement = 0;          // 2개일 때 0 겹침, 1 서로소, 2 포함(B⊂A)
            var showUniverse = true;      // 전체집합 틀
            var universeName = "U";
            var setNames = "";            // "P, Q" (비우면 A, B, C)
            var regionText = "";          // 영역 글자 "A-B: 1, 3; A∩B: 2"
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {radiusMm: radiusMm, overlapPct: overlapPct, shadeK: shadeK, fontPt: fontPt, offsetXmm: offsetXmm,
                offsetYmm: offsetYmm};
            applySettings();
            var LINE_DEFAULTS = {graph: MAIN_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var setPanel = addPanel(win, "집합");
            var countRow = setPanel.add("group");
            countRow.add("statictext", undefined, "집합 수:");
            var countList = addRadioChoice(countRow, COUNTS);
            setRadioChoice(countList, setCount);
            var shadeRow = setPanel.add("group");
            shadeRow.add("statictext", undefined, "색칠:");
            var shadeInput = shadeRow.add("edittext", undefined, shadeText);
            shadeInput.preferredSize.width = 300;
            shadeInput.helpTip = "A∩B, A∪B, A-B, (A∪B)ᶜ, A∩Bᶜ∩C, U, ∅. ∩ 대신 n 또는 &, ∪ 대신 u 또는 +, ᶜ 대신 ' 또는 ^c. 비우면 칠하지 않는다";
            var arrangeRow = setPanel.add("group");
            arrangeRow.add("statictext", undefined, "배치:");
            var arrangeList = arrangeRow.add("dropdownlist", undefined, ARRANGEMENTS);
            arrangeList.helpTip = "집합이 2개일 때만 (3개는 늘 겹침)";
            var regionRow = setPanel.add("group");
            regionRow.add("statictext", undefined, "영역 글자:");
            var regionInput = regionRow.add("edittext", undefined, regionText);
            regionInput.preferredSize.width = 270;
            regionInput.helpTip = "영역 식: 글자를 ;로 나눠 쓴다 (A-B: 1, 3; A∩B: 2; (A∪B)ᶜ: 5). 식은 영역 하나여야 하고, 글자는 그 영역 안에서 경계와 가장 먼 곳에 놓는다";
            var namesRow = setPanel.add("group");
            namesRow.add("statictext", undefined, "집합 이름:");
            var namesInput = namesRow.add("edittext", undefined, setNames);
            namesInput.preferredSize.width = 80;
            namesInput.helpTip = "쉼표로 한 글자씩 (P, Q). 색칠·영역 식도 이 이름으로 쓴다. 비우면 A, B, C";
            var universeCheck = namesRow.add("checkbox", undefined, "전체집합 틀");
            var universeInput = namesRow.add("edittext", undefined, universeName);
            universeInput.preferredSize.width = 40;
            universeInput.helpTip = "틀 왼쪽 위 글자 (U, S)";
            var messageText = setPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var sizePanel = addPanel(win, "크기");
            var radiusControls = addValueRow(sizePanel, "원 반지름", "mm", radiusMm, 5, 40, 0.5, 1);
            var overlapControls = addValueRow(sizePanel, "겹침", "%", overlapPct, 10, 80, 1, 0);
            overlapControls.input.helpTip = "두 원이 겹치는 정도 (지름에 대한 비율)";
            var shadeControls = addValueRow(sizePanel, "음영 농도", "K", shadeK, 5, 60, 1, 0);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            arrangeList.selection = arrangement;
            universeCheck.value = showUniverse;
            countList.onChange = function() { setCount = countList.index; updatePreview(); };
            arrangeList.onChange = function() { if (arrangeList.selection) { arrangement = arrangeList.selection.index; updatePreview(); } };
            regionInput.onChanging = function() { regionText = regionInput.text; updatePreview(); };
            namesInput.onChanging = function() { setNames = namesInput.text; updatePreview(); };
            universeCheck.onClick = function() { showUniverse = universeCheck.value; updatePreview(); };
            universeInput.onChanging = function() { universeName = universeInput.text; updatePreview(); };
            shadeInput.onChanging = function() { shadeText = shadeInput.text; updatePreview(); };
            bindValueRow(radiusControls, function(value) { radiusMm = value; }, defaults.radiusMm);
            bindValueRow(overlapControls, function(value) { overlapPct = value; }, defaults.overlapPct);
            bindValueRow(shadeControls, function(value) { shadeK = value; }, defaults.shadeK);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

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
                var n = vennSetCount(setCount), problems = [];
                var universe = universeName.replace(/\s/g, "") || "U";
                var names = parseSetNames(setNames, n, universe);
                if (names === null) { problems.push("집합 이름을 쓸 수 없음"); names = parseSetNames("", n); }
                var layout = vennLayout(n, radiusMm * MM_TO_PT, overlapPct / 100, {arrangement: arrangement, names: names, universeName: universe, universe: showUniverse});
                var masks = parseSetExpression(shadeText, n, names, universe);
                if (masks === null) problems.unshift("색칠 식을 읽지 못함");
                var regions = parseRegionTexts(regionText, n, names, universe, presentMasks(layout));
                if (regions === null) problems.push("영역 글자를 읽지 못함");
                messageText.text = problems.length > 0 ? problems.join(" / ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "벤다이어그램";
                if (masks !== null && masks.length > 0) addFill(regionLoops(layout, masks));
                var rect = layout.rect;
                if (layout.universe) addOutline([[rect[0], rect[1]], [rect[2], rect[1]], [rect[2], rect[3]], [rect[0], rect[3]]]);
                for (var c = 0; c < layout.circles.length; c++) addCircle(layout.circles[c]);
                for (var t = 0; t < layout.labels.length; t++) addLabel(layout.labels[t]);
                for (var g = 0; regions && g < regions.length; g++) addLabel({text: regions[g].text, at: regionPoint(layout, regions[g].mask), dir: [0, 0]});
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // 고리들 → 칠만 있는 복합 패스 (바깥 고리 반시계, 구멍 시계 방향이라 0이 아닌 감기 규칙으로 구멍이 뚫린다)
            function addFill(loops) {
                if (loops.length === 0) return;
                var compound = previewGroup.compoundPathItems.add();
                for (var i = 0; i < loops.length; i++) {
                    var path = compound.pathItems.add();
                    var anchors = [];
                    for (var j = 0; j < loops[i].length; j++) anchors.push(loops[i][j].anchor);
                    path.setEntirePath(anchors);
                    for (var k = 0; k < loops[i].length; k++) {
                        var point = path.pathPoints[k];
                        point.leftDirection = loops[i][k].left;
                        point.rightDirection = loops[i][k].right;
                    }
                    path.closed = true;
                    path.stroked = false;
                    path.filled = true;
                    path.fillColor = makeGray(shadeK);
                }
            }

            function addOutline(corners) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(corners);
                path.closed = true;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
            }

            // at에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다 (inside면 at에 가운데를 맞춘다)
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
                var reach = LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문 GSMediumB1(기준선 +0.5pt), 없는 기호는 HancomEQN. 집합 이름은 똑바로
            function applyTextFonts(frame) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-venn.js). 영역은 비트 마스크: A=1, B=2, C=4, 어느 집합에도 없음=0
            // -------------------------------------------------------
            // 집합 수 칸(0: 2개, 1: 3개, 2: 1개) → 원 개수
            function vennSetCount(setCount) {
                return setCount === 2 ? 1 : setCount + 2;
            }

            // 원 배치: 2개는 좌우, 3개는 A 왼쪽 위·B 오른쪽 위·C 아래. overlap은 지름에 대한 겹침 비율
            // opt(없어도 된다): arrangement(2개일 때 0 겹침, 1 서로소, 2 포함 B⊂A), names(집합 이름), universeName, universe(false면 U 틀·이름 없음)
            function vennLayout(n, r, overlap, opt) {
                opt = opt || {};
                var circles = [], labels = [];
                var d = r * (1 - overlap);   // 중심에서 원점까지 (2개일 때 두 중심 거리 = 2d)
                var names = opt.names || ["A", "B", "C"], arrangement = n === 2 ? opt.arrangement || 0 : 0;
                if (n === 1) {
                    circles = [{ center: [0, 0], radius: r }];
                } else if (arrangement === 1) {
                    circles = [{ center: [-r * 1.25, 0], radius: r }, { center: [r * 1.25, 0], radius: r }];   // 서로소: 두 원 사이 0.5r
                } else if (arrangement === 2) {
                    circles = [{ center: [0, 0], radius: r }, { center: [r * 0.3, -r * 0.15], radius: r * 0.45 }];   // 포함: 작은 B가 A 안
                } else if (n === 2) {
                    circles = [{ center: [-d, 0], radius: r }, { center: [d, 0], radius: r }];
                } else {
                    var k = 2 * d / Math.sqrt(3);   // 세 중심이 한 변 2d인 정삼각형
                    circles = [
                        { center: [-d, k / 2], radius: r },
                        { center: [d, k / 2], radius: r },
                        { center: [0, -k], radius: r }
                    ];
                }
                var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
                for (var i = 0; i < circles.length; i++) {
                    var c = circles[i], cr = c.radius;
                    left = Math.min(left, c.center[0] - cr); right = Math.max(right, c.center[0] + cr);
                    top = Math.max(top, c.center[1] + cr); bottom = Math.min(bottom, c.center[1] - cr);
                    // 이름은 원 바깥, 그림 가운데에서 멀어지는 쪽 위로 (원 하나·포함의 A는 왼쪽 위)
                    var away = c.center[0] === 0 ? [0.7071, -0.7071] : [c.center[0] < 0 ? -0.7071 : 0.7071, 0.7071];
                    if (n === 3 && i === 2) away = [0.7071, -0.7071];
                    if (i === 0 && (n === 1 || arrangement === 2)) away = [-0.7071, 0.7071];
                    labels.push({ text: names[i], at: [c.center[0] + away[0] * cr, c.center[1] + away[1] * cr], dir: away });
                }
                var margin = r * 0.35, wide = n === 1 ? r * 0.5 : 0;
                var rect = [left - margin - wide, top + margin + r * 0.15, right + margin + wide, bottom - margin];   // left, top, right, bottom
                if (opt.universe !== false) labels.push({ text: opt.universeName || "U", at: [rect[0], rect[1]], dir: [0.7071, -0.7071] });
                return { circles: circles, rect: rect, labels: labels, n: n, universe: opt.universe !== false };
            }

            function membership(layout, p) {
                var mask = 0;
                for (var i = 0; i < layout.circles.length; i++) {
                    var c = layout.circles[i];
                    if ((p[0] - c.center[0]) * (p[0] - c.center[0]) + (p[1] - c.center[1]) * (p[1] - c.center[1]) < c.radius * c.radius) mask |= (1 << i);
                }
                return mask;
            }

            // 색칠할 영역(마스크 목록)의 경계 고리들. 각 고리는 {anchor,left,right} 점 목록 (칠할 쪽이 진행 방향 왼쪽)
            function regionLoops(layout, masks) {
                var inSet = {};
                for (var m = 0; m < masks.length; m++) inSet[masks[m]] = true;
                if (layout.universe === false) inSet[0] = false;   // U 틀이 없으면 바깥은 칠하지 않는다
                var arcs = [];
                for (var i = 0; i < layout.circles.length; i++) {
                    var c = layout.circles[i], angles = [];
                    for (var j = 0; j < layout.circles.length; j++) {
                        if (j === i) continue;
                        var hits = circleIntersections(c, layout.circles[j]);
                        for (var h = 0; h < hits.length; h++) angles.push(Math.atan2(hits[h][1] - c.center[1], hits[h][0] - c.center[0]));
                    }
                    angles.sort(function(p, q) { return p - q; });
                    if (angles.length === 0) angles = [0];
                    for (var a = 0; a < angles.length; a++) {
                        var a0 = angles[a], a1 = a + 1 < angles.length ? angles[a + 1] : angles[0] + Math.PI * 2;
                        if (a1 - a0 < 1e-9) continue;
                        var mid = (a0 + a1) / 2, eps = c.radius * 1e-4;
                        var inner = membership(layout, [c.center[0] + (c.radius - eps) * Math.cos(mid), c.center[1] + (c.radius - eps) * Math.sin(mid)]);
                        var outer = membership(layout, [c.center[0] + (c.radius + eps) * Math.cos(mid), c.center[1] + (c.radius + eps) * Math.sin(mid)]);
                        var insideShaded = !!inSet[inner], outsideShaded = !!inSet[outer];
                        if (insideShaded === outsideShaded) continue;
                        // 칠할 쪽이 원 안이면 반시계, 바깥이면 시계 방향으로 따라간다
                        arcs.push(insideShaded ? arcPoints(c.center, c.radius, a0, a1 - a0) : arcPoints(c.center, c.radius, a1, a0 - a1));
                    }
                }
                var loops = chainArcs(arcs);
                if (inSet[0]) {
                    var r = layout.rect;
                    loops.push([plain([r[0], r[3]]), plain([r[2], r[3]]), plain([r[2], r[1]]), plain([r[0], r[1]])]);   // 반시계
                }
                return loops;
            }

            // 끝점이 이어지는 호들을 닫힌 고리로 묶는다
            function chainArcs(arcs) {
                var used = [], loops = [];
                function key(p) { return Math.round(p[0] * 1000) + "," + Math.round(p[1] * 1000); }
                for (var s = 0; s < arcs.length; s++) {
                    if (used[s]) continue;
                    used[s] = true;
                    var loop = arcs[s].slice(), startKey = key(loop[0].anchor);
                    for (var guard = 0; guard < arcs.length && key(loop[loop.length - 1].anchor) !== startKey; guard++) {
                        var endKey = key(loop[loop.length - 1].anchor), next = -1;
                        for (var t = 0; t < arcs.length; t++) if (!used[t] && key(arcs[t][0].anchor) === endKey) { next = t; break; }
                        if (next < 0) break;
                        used[next] = true;
                        var last = loop.pop();
                        var first = arcs[next][0];
                        loop.push({ anchor: last.anchor, left: last.left, right: first.right });
                        for (var q = 1; q < arcs[next].length; q++) loop.push(arcs[next][q]);
                    }
                    // 닫기: 마지막 점(= 처음 점)의 들어오는 핸들을 처음 점으로 옮긴다
                    var tail = loop.pop();
                    loop[0] = { anchor: loop[0].anchor, left: tail.left, right: loop[0].right };
                    loops.push(loop);
                }
                return loops;
            }

            function circleIntersections(c1, c2) {
                var dx = c2.center[0] - c1.center[0], dy = c2.center[1] - c1.center[1];
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d === 0 || d >= c1.radius + c2.radius || d <= Math.abs(c1.radius - c2.radius)) return [];
                var a = (c1.radius * c1.radius - c2.radius * c2.radius + d * d) / (2 * d);
                var h = Math.sqrt(Math.max(0, c1.radius * c1.radius - a * a));
                var mx = c1.center[0] + a * dx / d, my = c1.center[1] + a * dy / d;
                return [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
            }

            // 집합 식 → 칠할 영역 마스크 목록 (마스크 0~2ⁿ-1). 빈 칸은 [], 못 읽으면 null
            // 우선순위: ᶜ(뒤에 붙음) > ∩ > ∪·- (왼쪽부터)
            // names: 집합 이름(없으면 A, B, C), universeName: 전체집합 이름(U는 늘 된다)
            function parseSetExpression(text, n, names, universeName) {
                var s = String(text).replace(/\s/g, "").split("^c").join("ᶜ").split("'").join("ᶜ").split("′").join("ᶜ");
                if (s === "") return [];
                var all = [];
                for (var m = 0; m < (1 << n); m++) all.push(m);
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function union() {
                    var left = intersection();
                    while (peek() === "∪" || peek() === "u" || peek() === "+" || peek() === "-" || peek() === "−") {
                        var op = s.charAt(pos++);
                        var right = intersection();
                        left = (op === "-" || op === "−") ? filter(left, function(x) { return !has(right, x); }) : merge(left, right);
                    }
                    return left;
                }
                function intersection() {
                    var left = complement();
                    while (peek() === "∩" || peek() === "n" || peek() === "&") {
                        pos++;
                        var right = complement();
                        left = filter(left, function(x) { return has(right, x); });
                    }
                    return left;
                }
                function complement() {
                    var value = primary();
                    while (peek() === "ᶜ") {
                        pos++;
                        var inner = value;
                        value = filter(all, function(x) { return !has(inner, x); });
                    }
                    return value;
                }
                function primary() {
                    var ch = peek();
                    if (ch === "(") {
                        pos++;
                        var inner = union();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return inner;
                    }
                    pos++;
                    if (ch === "U" || (universeName && ch === universeName)) return all.slice();
                    if (ch === "∅" || ch === "Ø") return [];
                    var index = ch === "" ? -1 : (names ? names.join("") : "ABC").indexOf(ch);
                    if (index < 0 || index >= n) throw new Error("name");
                    return filter(all, function(x) { return (x & (1 << index)) !== 0; });
                }
                function has(list, x) { for (var i = 0; i < list.length; i++) if (list[i] === x) return true; return false; }
                function filter(list, keep) { var out = []; for (var i = 0; i < list.length; i++) if (keep(list[i])) out.push(list[i]); return out; }
                function merge(a, b) { var out = a.slice(); for (var i = 0; i < b.length; i++) if (!has(out, b[i])) out.push(b[i]); return out; }
                try {
                    var result = union();
                    if (pos !== s.length) return null;
                    result.sort(function(p, q) { return p - q; });
                    return result;
                } catch (e) {
                    return null;
                }
            }

            // 집합 이름 "P, Q" → ["P", "Q"]. 비운 자리는 A, B, C. 이름은 한 글자이고 서로 달라야 하며 식 기호(n u U ∩ ∪ …)는 안 된다. 못 쓰면 null
            function parseSetNames(text, n, universeName) {
                var parts = String(text).split(/[,，]/), out = [], defaults = ["A", "B", "C"];
                for (var i = 0; i < n; i++) {
                    var name = i < parts.length ? parts[i].replace(/\s/g, "") : "";
                    if (name === "") name = defaults[i];
                    if (name.length !== 1 || "nuU&+-−()∩∪ᶜ'′^∅Ø".indexOf(name) >= 0 || name === universeName) return null;
                    for (var j = 0; j < out.length; j++) if (out[j] === name) return null;
                    out.push(name);
                }
                return out;
            }

            // 영역 글자 "A-B: 1, 3; A∩B: 2; (A∪B)ᶜ: 5" → [{mask, text}]. 식은 그림에 있는 영역(present, 없으면 모두) 하나를 가리켜야 한다.
            // 빈 글이면 [], 못 읽으면 null
            function parseRegionTexts(text, n, names, universeName, present) {
                var items = String(text).split(";"), out = [];
                for (var i = 0; i < items.length; i++) {
                    if (items[i].replace(/\s/g, "") === "") continue;
                    var colon = items[i].indexOf(":");
                    if (colon < 0) return null;
                    var masks = parseSetExpression(items[i].substring(0, colon), n, names, universeName);
                    var label = items[i].substring(colon + 1).replace(/^\s+|\s+$/g, "");
                    if (masks !== null && present) {
                        var kept = [];
                        for (var m = 0; m < masks.length; m++) for (var q = 0; q < present.length; q++) if (present[q] === masks[m]) kept.push(masks[m]);
                        masks = kept;
                    }
                    if (masks === null || masks.length !== 1 || label === "") return null;
                    out.push({ mask: masks[0], text: label });
                }
                return out;
            }

            // 그림에 실제로 있는 영역들 (포함 배치에는 'B만' 영역이 없다)
            function presentMasks(layout) {
                var seen = [], r = layout.rect, N = 60;
                for (var i = 0; i <= N; i++) {
                    for (var j = 0; j <= N; j++) {
                        var mask = membership(layout, [r[0] + (r[2] - r[0]) * i / N, r[3] + (r[1] - r[3]) * j / N]);
                        if (!seen[mask]) seen[mask] = true;
                    }
                }
                var out = [];
                for (var k = 0; k < seen.length; k++) if (seen[k]) out.push(k);
                return out;
            }

            // 영역 안에서 경계(원·U 틀)와 집합 이름 자리에서 가장 먼 점: U 틀 안을 격자로 훑는다. 이름 자리는 at에서 dir 쪽으로 반지름의 0.2만큼
            function regionPoint(layout, mask) {
                var r = layout.rect, best = null, bestGap = -1, N = 60, size = layout.circles[0].radius * 0.2, spots = [];
                for (var l = 0; l < layout.labels.length; l++) {
                    var lb = layout.labels[l];
                    spots.push([lb.at[0] + lb.dir[0] * size, lb.at[1] + lb.dir[1] * size]);
                }
                for (var i = 0; i <= N; i++) {
                    for (var j = 0; j <= N; j++) {
                        var p = [r[0] + (r[2] - r[0]) * i / N, r[3] + (r[1] - r[3]) * j / N];
                        if (membership(layout, p) !== mask) continue;
                        var gap = Math.min(p[0] - r[0], r[2] - p[0], p[1] - r[3], r[1] - p[1]);
                        for (var k = 0; k < layout.circles.length; k++) {
                            var c = layout.circles[k];
                            gap = Math.min(gap, Math.abs(Math.sqrt((p[0] - c.center[0]) * (p[0] - c.center[0]) + (p[1] - c.center[1]) * (p[1] - c.center[1])) - c.radius));
                        }
                        for (var t = 0; t < spots.length; t++) gap = Math.min(gap, Math.sqrt((p[0] - spots[t][0]) * (p[0] - spots[t][0]) + (p[1] - spots[t][1]) * (p[1] - spots[t][1])) - size);
                        if (gap > bestGap + 1e-9) { bestGap = gap; best = p; }
                    }
                }
                return best || [0, 0];
            }

            // 3차 베지어 원호 (90°씩 나눈다, sweep이 음수면 시계 방향)
            function arcPoints(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
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

            function plain(p) { return { anchor: p, left: p, right: p }; }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·그래프·보조선): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { MAIN_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return MAIN_PT;
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
                var parts = ["v2", setCount, encodeURIComponent(shadeText), shadeK, radiusMm, overlapPct, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
                    arrangement, showUniverse ? "1" : "0", encodeURIComponent(universeName), encodeURIComponent(setNames), encodeURIComponent(regionText)];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (!((p[0] === "v1" && p.length === 10) || (p[0] === "v2" && p.length === 15))) return;
                try {
                    setCount = Math.round(restoreNumber(p[1], setCount, 0, COUNTS.length - 1));
                    shadeText = decodeURIComponent(p[2]);
                    shadeK = restoreNumber(p[3], shadeK, 5, 60);
                    radiusMm = restoreNumber(p[4], radiusMm, 5, 40);
                    overlapPct = restoreNumber(p[5], overlapPct, 10, 80);
                    fontPt = restoreNumber(p[6], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[9] === "1";
                    if (p[0] === "v2") {
                        arrangement = Math.round(restoreNumber(p[10], arrangement, 0, ARRANGEMENTS.length - 1));
                        showUniverse = p[11] === "1";
                        universeName = decodeURIComponent(p[12]);
                        setNames = decodeURIComponent(p[13]);
                        regionText = decodeURIComponent(p[14]);
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

    // ==== 대응 그림 ====
    // 대응 그림: 집합 X, Y(, Z)를 세로 타원으로 나란히 두고 원소(점과 글자)를 화살표로 잇는다 (함수·역함수·합성함수).
    // 위쪽 X ─f→ Y ─g→ Z 함수 이름 화살표, 합성 곡선 화살표(g∘f), 첫째 대응의 치역을 감싼 작은 타원 칠하기, 타원 아래 글자(정의역·공역).
    // 계산 함수(buildMapping 등)는 웹 sci-illu-web generators/math-mapping.js와 글자 그대로 같다 (tests/check-mapping.js).
    // 선 두께: 타원 0.8pt, 화살표·치역 타원 0.4pt. 선택은 필요 없다.
    function makeMappingEngine() {
        var api = {label: "대응 그림", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathMapping/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(∘)
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var AXIS_PT = 0.4;
            var LABEL_GAP_MM = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var RANGE_K = 15;
            var SMALL_ARROW = registerHead({ length: 3.63, halfWidth: 1.18, notch: 0.93 });   // 대응 화살표 촉: 축 화살촉의 0.75배

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var setNames = "X, Y";
            var elementTexts = ["1, 2, 3", "a, b, c", ""];
            var pairTexts = ["1>a, 2>b, 3>c", ""];
            var functionNames = "";
            var composite = "";
            var underText = "";
            var showRange = false;
            var spacingMm = 6;
            var gapMm = 22;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {spacingMm: spacingMm, gapMm: gapMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_DEFAULTS = {axis: AXIS_PT, graph: MAIN_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var setPanel = addPanel(win, "집합 · 원소");
            var namesInput = addTextRow(setPanel, "집합 이름:", setNames, "쉼표로 2개 또는 3개 (X, Y, Z). 3개면 합성함수 그림");
            var elementInputs = [];
            for (var ei = 0; ei < 3; ei++) elementInputs.push(addTextRow(setPanel, ["첫째", "둘째", "셋째"][ei] + " 원소:", elementTexts[ei], "쉼표로. 위에서부터 놓는다" + (ei === 2 ? " (집합이 3개일 때)" : "")));
            var mapPanel = addPanel(win, "대응");
            var pairInputs = [];
            for (var pi = 0; pi < 2; pi++) pairInputs.push(addTextRow(mapPanel, ["첫째→둘째", "둘째→셋째"][pi] + ":", pairTexts[pi], "왼쪽 원소>오른쪽 원소 (1>a, 2>b). 거꾸로(역대응)는 1<a처럼 <를 쓴다"));
            var namesFnInput = addTextRow(mapPanel, "함수 이름:", functionNames, "쉼표로 (f, g). 집합 이름 사이에 X ─f→ Y 화살표를 긋는다. 비우면 긋지 않는다");
            var compositeInput = addTextRow(mapPanel, "합성 이름:", composite, "집합이 3개일 때 첫 집합에서 끝 집합으로 가는 위쪽 곡선 화살표와 이름 (g∘f)");
            var underInput = addTextRow(mapPanel, "아래 글자:", underText, "쉼표로 타원마다 아래에 쓸 글자 (정의역, 공역)");
            var rangeCheck = mapPanel.add("checkbox", undefined, "치역 칠하기 (첫째 대응이 닿는 원소들)");
            rangeCheck.value = showRange;
            var messageText = mapPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var sizePanel = addPanel(win, "크기");
            var spacingControls = addValueRow(sizePanel, "원소 간격", "mm", spacingMm, 3, 15, 0.5, 1);
            var gapControls = addValueRow(sizePanel, "타원 사이", "mm", gapMm, 8, 60, 1, 0);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var graphWidthControls = addValueRow(lineWidthPanel, "타원", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var axisWidthControls = addValueRow(lineWidthPanel, "화살표", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            namesInput.onChanging = function() { setNames = namesInput.text; updatePreview(); };
            for (var eb = 0; eb < 3; eb++) elementInputs[eb].onChanging = (function(k) { return function() { elementTexts[k] = elementInputs[k].text; updatePreview(); }; })(eb);
            for (var pb = 0; pb < 2; pb++) pairInputs[pb].onChanging = (function(k) { return function() { pairTexts[k] = pairInputs[k].text; updatePreview(); }; })(pb);
            namesFnInput.onChanging = function() { functionNames = namesFnInput.text; updatePreview(); };
            compositeInput.onChanging = function() { composite = compositeInput.text; updatePreview(); };
            underInput.onChanging = function() { underText = underInput.text; updatePreview(); };
            rangeCheck.onClick = function() { showRange = rangeCheck.value; updatePreview(); };
            bindValueRow(spacingControls, function(value) { spacingMm = value; }, defaults.spacingMm);
            bindValueRow(gapControls, function(value) { gapMm = value; }, defaults.gapMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

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

            // 입력 글 → buildMapping 옵션 (웹 readMappingInputs와 같은 의미)
            function readInputs() {
                var problems = [], ORD = ["첫째", "둘째", "셋째"];
                var names = splitList(setNames);
                var bad = names.length < 2 || names.length > 3;
                for (var n = 0; n < names.length; n++) if (names[n] === "") bad = true;
                if (bad) problems.push("집합 이름");
                var count = names.length === 3 && names[2] !== "" ? 3 : 2, sets = [], maps = [];
                for (var i = 0; i < count; i++) {
                    var elements = parseElements(elementTexts[i]);
                    if (elements === null) problems.push(ORD[i] + " 집합 원소");
                    sets.push({ name: names[i] || "", elements: elements || [] });
                }
                for (var m = 0; m + 1 < count; m++) {
                    var pairs = parsePairs(pairTexts[m], sets[m].elements, sets[m + 1].elements);
                    if (pairs === null) problems.push(ORD[m] + " 대응");
                    maps.push(pairs || []);
                }
                return { sets: sets, maps: maps, names: splitList(functionNames), under: splitList(underText), problems: problems };
            }

            function splitList(text) {
                var parts = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < parts.length; i++) out.push(parts[i].replace(/^\s+|\s+$/g, ""));
                return out;
            }

            function buildPreview() {
                var input = readInputs();
                messageText.text = input.problems.length > 0 ? "읽지 못함: " + input.problems.join(", ") : " ";
                var d = buildMapping({
                    sets: input.sets, maps: input.maps, names: input.names, under: input.under, composite: composite.replace(/^\s+|\s+$/g, ""),
                    range: showRange, spacing: spacingMm * MM_TO_PT, gap: gapMm * MM_TO_PT, fontPt: fontPt,
                    dotRadius: DOT_RADIUS_MM * MM_TO_PT, head: SMALL_ARROW
                });
                previewGroup = layer.groupItems.add();
                previewGroup.name = "대응 그림";
                for (var f = 0; f < d.fills.length; f++) addEllipse(d.fills[f], AXIS_PT, RANGE_K);
                for (var e = 0; e < d.ellipses.length; e++) addEllipse(d.ellipses[e], MAIN_PT, null);
                for (var l = 0; l < d.lines.length; l++) addLine(d.lines[l]);
                for (var h = 0; h < d.heads.length; h++) addArrow(d.heads[h]);
                for (var p = 0; p < d.dots.length; p++) addDot(d.dots[p].at);
                for (var t = 0; t < d.texts.length; t++) addLabel(d.texts[t]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            function addEllipse(e, width, fillK) {
                var path = previewGroup.pathItems.ellipse(e.center[1] + e.b, e.center[0] - e.a, e.a * 2, e.b * 2);
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = width;
                path.filled = fillK !== null;
                if (fillK !== null) path.fillColor = makeGray(fillK);
            }

            // 곧은 선은 points, 합성 곡선은 curve({anchor, left, right})
            function addLine(line) {
                var path = previewGroup.pathItems.add(), pts = line.curve || line.points, anchors = [];
                for (var i = 0; i < pts.length; i++) anchors.push(line.curve ? pts[i].anchor : pts[i]);
                path.setEntirePath(anchors);
                if (line.curve) {
                    for (var j = 0; j < pts.length; j++) {
                        path.pathPoints[j].leftDirection = pts[j].left;
                        path.pathPoints[j].rightDirection = pts[j].right;
                    }
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = AXIS_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
            }

            function addArrow(arrow) {
                var head = headShapeFor(arrow.tip, arrow.dir, SMALL_ARROW);
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

            // at에서 dir 쪽으로 clear + 간격을 두고 글자의 가까운 가장자리가 오게 둔다
            function addLabel(label) {
                if (label.text === "") return;
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var attributes = frame.textRange.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                frame.translate(label.at[0] + dir[0] * reach + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, label.at[1] + dir[1] * reach - (b[1] + b[3]) / 2);
            }

            // 글자 서체: 한글·공백 Spoqa, 따로 떨어진 소문자 한 글자(a, x, f)는 변수라 GSMediItaC1, 그 밖 영문·숫자 GSMediumB1(기준선 +0.5pt), 없는 기호(∘)는 HancomEQN
            function applyTextFonts(frame) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-mapping.js). 웹 generators/math-mapping.js와 글자 그대로 같다
            // -------------------------------------------------------
            // opt: sets [{name, elements}], maps [[{from, to, back}]] (집합 i → i+1), names(위 화살표 함수 이름), composite(합성 이름),
            //   under(타원 아래 글자), range(첫째 대응의 치역 칠하기), spacing(원소 간격), gap(타원 사이), fontPt, dotRadius, head {length, notch}
            function buildMapping(opt) {
                var ellipses = [], fills = [], lines = [], heads = [], dots = [], texts = [];
                var sets = opt.sets, count = sets.length, most = 1, cut = opt.head.length - opt.head.notch, gapText = opt.dotRadius + 2.27;
                for (var i = 0; i < count; i++) most = Math.max(most, sets[i].elements.length);
                var b = (most - 1) * opt.spacing / 2 + opt.spacing * 0.85, shifts = [], half = 0;
                // 글자가 타원 안에 들도록: 집합마다 가장 긴 원소 글자 너비로 점 자리를 정하고, 그만큼 타원을 넓힌다(높이는 폭의 1.35배 이상, 교과서처럼 세로로 긴 타원)
                for (var w = 0; w < count; w++) {
                    var widest = 0;
                    for (var e = 0; e < sets[w].elements.length; e++) widest = Math.max(widest, textWidth(sets[w].elements[e], opt.fontPt));
                    shifts.push(Math.max(b * 0.58 * 0.3, (widest + gapText) / 2));
                    half = Math.max(half, shifts[w] + widest / 2 + gapText / 2 + opt.fontPt * 0.4);
                }
                b = Math.max(b, half * 1.35);
                var narrow = Math.sqrt(Math.max(0.2, 1 - Math.pow(((most - 1) / 2 * opt.spacing + opt.fontPt * 0.5) / b, 2)));
                var a = Math.max(b * 0.58, half / narrow);
                var places = [], leaves = [];   // 집합마다 원소 점 자리, 나가는 화살표가 시작하는 자리
                for (var s = 0; s < count; s++) {
                    var cx = s * (2 * a + opt.gap), list = sets[s].elements, spots = [], outs = [];
                    // 첫 집합은 점이 오른쪽·글자 왼쪽, 그 밖은 점이 왼쪽·글자 오른쪽. 가운데 집합에서 나가는 화살표는 글자 뒤에서 시작한다
                    var dotX = s === 0 ? cx + shifts[s] : cx - shifts[s], dir = s === 0 ? [-1, 0] : [1, 0];
                    for (var k = 0; k < list.length; k++) {
                        var at = [dotX, ((list.length - 1) / 2 - k) * opt.spacing];
                        spots.push(at);
                        outs.push(s === 0 || s === count - 1 ? at : [dotX + gapText + textWidth(list[k], opt.fontPt), at[1]]);
                        dots.push({ at: at });
                        texts.push({ text: list[k], at: at, dir: dir, clear: opt.dotRadius });
                    }
                    places.push(spots);
                    leaves.push(outs);
                    ellipses.push({ center: [cx, 0], a: a, b: b });
                    texts.push({ text: sets[s].name, at: [cx, b], dir: [0, 1], clear: 0 });
                    if (opt.under[s]) texts.push({ text: opt.under[s], at: [cx, -b], dir: [0, -1], clear: 0 });
                }
                // 대응 화살표: 점(가운데 집합은 글자 뒤)에서 조금 떨어져 나가 다음 점 앞에서 멈춘다. back이면 오른쪽 원소에서 왼쪽 원소로
                for (var m = 0; m < opt.maps.length; m++) {
                    for (var p = 0; p < opt.maps[m].length; p++) {
                        var pair = opt.maps[m][p];
                        if (pair.back) arrow(places[m + 1][pair.to], leaves[m][pair.from], opt.dotRadius * 1.8, opt.dotRadius * 1.8);
                        else arrow(leaves[m][pair.from], places[m + 1][pair.to], opt.dotRadius * 1.8, opt.dotRadius * 1.8);
                    }
                }
                // 위쪽 함수 이름 화살표: 집합 이름 사이 (X ─f→ Y)
                var nameY = b + opt.fontPt * 0.75, halfName = opt.fontPt * 0.45 + 2;
                for (var f = 0; f + 1 < count; f++) {
                    if (!opt.names[f]) continue;
                    var x0 = f * (2 * a + opt.gap), x1 = (f + 1) * (2 * a + opt.gap);
                    arrow([x0, nameY], [x1, nameY], halfName + 2, halfName + 2);
                    texts.push({ text: opt.names[f], at: [(x0 + x1) / 2, nameY], dir: [0, 1], clear: 0 });
                }
                // 합성 곡선 화살표: 첫 집합 이름 위에서 끝 집합 이름 위로 (g∘f)
                if (opt.composite && count === 3) {
                    var p0 = [0, nameY + opt.fontPt * 0.9], p3 = [2 * (2 * a + opt.gap), p0[1]], rise = opt.fontPt * 2, w = p3[0] - p0[0];
                    var c1 = [p0[0] + w * 0.2, p0[1] + rise], c2 = [p3[0] - w * 0.2, p3[1] + rise];
                    var tx = p3[0] - c2[0], ty = p3[1] - c2[1], tl = Math.sqrt(tx * tx + ty * ty);
                    var end3 = [p3[0] - tx / tl * cut, p3[1] - ty / tl * cut];
                    lines.push({ curve: [{ anchor: p0, left: p0, right: c1 }, { anchor: end3, left: c2, right: end3 }] });
                    heads.push({ tip: p3, dir: [tx / tl, ty / tl] });
                    texts.push({ text: opt.composite, at: [w / 2, p0[1] + rise * 0.75], dir: [0, 1], clear: 0 });
                }
                // 치역: 첫째 대응이 닿는 둘째 집합 원소들을 위아래로 감싸는 작은 타원
                if (opt.range && opt.maps.length > 0) {
                    var low = Infinity, high = -Infinity;
                    for (var r = 0; r < opt.maps[0].length; r++) {
                        if (opt.maps[0][r].back) continue;
                        var y = places[1][opt.maps[0][r].to][1];
                        low = Math.min(low, y); high = Math.max(high, y);
                    }
                    if (high >= low) fills.push({ center: [2 * a + opt.gap, (low + high) / 2], a: a * 0.72, b: (high - low) / 2 + opt.spacing * 0.5 });
                }
                return { ellipses: ellipses, fills: fills, lines: lines, heads: heads, dots: dots, texts: texts };

                function arrow(from, to, startGap, endGap) {
                    var dx = to[0] - from[0], dy = to[1] - from[1], len = Math.sqrt(dx * dx + dy * dy);
                    if (len <= startGap + endGap + cut) return;
                    var ux = dx / len, uy = dy / len, tip = [to[0] - ux * endGap, to[1] - uy * endGap];
                    lines.push({ points: [[from[0] + ux * startGap, from[1] + uy * startGap], [tip[0] - ux * cut, tip[1] - uy * cut]] });
                    heads.push({ tip: tip, dir: [ux, uy] });
                }
            }

            // 글자 너비(pt) 어림: 영문·숫자·기호는 0.55em, 그 밖(한글, ∘)은 1em
            function textWidth(text, fontPt) {
                var w = 0;
                for (var i = 0; i < text.length; i++) w += text.charCodeAt(i) < 128 ? 0.55 : 1;
                return w * fontPt;
            }

            // 원소 "1, 2, 3" → ["1", "2", "3"]. 빈 글이면 [], 같은 원소가 있으면 null
            function parseElements(text) {
                var parts = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < parts.length; i++) {
                    var item = parts[i].replace(/^\s+|\s+$/g, "");
                    if (item === "") continue;
                    for (var j = 0; j < out.length; j++) if (out[j] === item) return null;
                    out.push(item);
                }
                return out;
            }

            // 대응 "1>a, 2>b, 3<c" → [{from, to, back}]. 왼쪽 글자는 왼쪽 집합 원소, 오른쪽 글자는 오른쪽 집합 원소.
            // >는 왼쪽에서 오른쪽으로, <는 오른쪽에서 왼쪽으로(역대응). 빈 글이면 [], 못 읽으면 null
            function parsePairs(text, from, to) {
                var parts = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < parts.length; i++) {
                    var item = parts[i].replace(/^\s+|\s+$/g, "");
                    if (item === "") continue;
                    var gt = item.indexOf(">"), lt = item.indexOf("<"), at = gt >= 0 ? gt : lt;
                    if (at < 0 || (gt >= 0 && lt >= 0)) return null;
                    var left = indexOf(from, item.substring(0, at)), right = indexOf(to, item.substring(at + 1));
                    if (left < 0 || right < 0) return null;
                    out.push({ from: left, to: right, back: lt >= 0 });
                }
                return out;

                function indexOf(list, name) {
                    name = name.replace(/^\s+|\s+$/g, "");
                    for (var k = 0; k < list.length; k++) if (list[k] === name) return k;
                    return -1;
                }
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(타원·화살표): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "graph") { MAIN_PT = value; }
                if (group === "axis") { AXIS_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "graph") return MAIN_PT;
                if (group === "axis") return AXIS_PT;
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

            function addTextRow(parent, label, value, tip) {
                var row = parent.add("group");
                row.add("statictext", undefined, label).preferredSize.width = 80;
                var input = row.add("edittext", undefined, value);
                input.preferredSize.width = 260;
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
                var parts = ["v1", encodeURIComponent(setNames), encodeURIComponent(elementTexts[0]), encodeURIComponent(elementTexts[1]), encodeURIComponent(elementTexts[2]),
                    encodeURIComponent(pairTexts[0]), encodeURIComponent(pairTexts[1]), encodeURIComponent(functionNames), encodeURIComponent(composite), encodeURIComponent(underText),
                    showRange ? "1" : "0", spacingMm, gapMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 17) return;
                try {
                    setNames = decodeURIComponent(p[1]);
                    elementTexts = [decodeURIComponent(p[2]), decodeURIComponent(p[3]), decodeURIComponent(p[4])];
                    pairTexts = [decodeURIComponent(p[5]), decodeURIComponent(p[6])];
                    functionNames = decodeURIComponent(p[7]);
                    composite = decodeURIComponent(p[8]);
                    underText = decodeURIComponent(p[9]);
                    showRange = p[10] === "1";
                    spacingMm = restoreNumber(p[11], spacingMm, 3, 15);
                    gapMm = restoreNumber(p[12], gapMm, 8, 60);
                    fontPt = restoreNumber(p[13], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[14], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[15], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[16] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 세로셈 ====
    // 세로셈: 조립제법(제수·계수 줄·곱 줄·합 줄, ㄴ자 선, ×a 화살표), 거꾸로 나눗셈(연속 나눗셈, 최대공약수·최소공배수),
    // 다항식 나눗셈 세로셈(몫 줄, 곱과 나머지 줄). 식을 넣으면 계산해 채우고, 끄면 빈칸 상자가 된다.
    // 계산 함수(buildDivision 등)는 웹 sci-illu-web generators/math-division.js와 글자 그대로 같다 (tests/check-division.js).
    // 선 두께: 칸 선·화살표 0.4pt. 선택은 필요 없다.
    function makeDivisionEngine() {
        var api = {label: "세로셈", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathDivision/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var LABEL_GAP_MM = 0.8;
            var CELL_ARROW = registerHead({ length: 3.63, halfWidth: 1.18, notch: 0.93 });   // ×a 화살표 촉: 축 화살촉의 0.75배
            var KIND_NAMES = ["조립제법", "거꾸로 나눗셈 (연속 나눗셈)", "다항식 나눗셈 세로셈"];
            // 방법을 바꿀 때 식 칸이 아직 예시 그대로면 새 방법의 예시로 바꾼다
            var SAMPLES = [["x^3-3x^2+4x-2", "x-2"], ["12, 18", "2, 3"], ["2x^3-x^2+3x+1", "x^2+1"]];
            var ROW_LABELS = [["나뉠 식:", "제수 x−a:"], ["나뉠 수:", "나누는 수:"], ["나뉠 식:", "제수:"]];
            var ROW_TIPS = [
                ["조립제법으로 나눌 다항식 (x^3-3x^2+4x-2). 계수만 쉼표로 써도 된다 (1, -3, 4, -2). 빠진 차수는 0", "x-2처럼 최고차 계수가 1인 일차식, 또는 a만 (2). 계수가 1이 아니면 알림에서 알려 준다"],
                ["나눌 수들을 쉼표로 (12, 18). 둘이면 최대공약수·최소공배수를 알려 준다", "위에서부터 차례로 나눌 수를 쉼표로 (2, 3). 줄마다 모든 수를 이 수로 나눈다"],
                ["나뉠 다항식 (x^2+x-3). 변수는 x 하나, 계수는 분수·소수도 된다", "나누는 다항식 (x-1, 2x+1)"]
            ];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 0;
            var dividendText = SAMPLES[0][0];
            var divisorText = SAMPLES[0][1];
            var showAnswer = true;
            var showArrows = true;
            var cellWmm = 10;
            var cellHmm = 8;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {cellWmm: cellWmm, cellHmm: cellHmm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_DEFAULTS = {axis: AXIS_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var formPanel = addPanel(win, "방법 · 식");
            var kindRow = formPanel.add("group");
            kindRow.add("statictext", undefined, "방법:").preferredSize.width = 80;
            var kindList = kindRow.add("dropdownlist", undefined, KIND_NAMES);
            kindList.selection = kind;
            kindList.preferredSize.width = 260;
            var dividendInput = addTextRow(formPanel, ROW_LABELS[kind][0], dividendText, ROW_TIPS[kind][0]);
            var divisorInput = addTextRow(formPanel, ROW_LABELS[kind][1], divisorText, ROW_TIPS[kind][1]);
            var answerCheck = formPanel.add("checkbox", undefined, "답 채우기 (끄면 빈칸 상자)");
            answerCheck.value = showAnswer;
            var arrowsCheck = formPanel.add("checkbox", undefined, "×a 화살표");
            arrowsCheck.value = showArrows;
            arrowsCheck.enabled = kind === 0;
            var messageText = formPanel.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [360, 34];

            var sizePanel = addPanel(win, "크기");
            var cellWControls = addValueRow(sizePanel, "칸 너비", "mm", cellWmm, 6, 30, 1, 0);
            var cellHControls = addValueRow(sizePanel, "칸 높이", "mm", cellHmm, 5, 20, 0.5, 1);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "칸 선·화살표", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            kindList.onChange = function() {
                var next = kindList.selection === null ? kind : kindList.selection.index;
                if (next === kind) return;
                if (dividendText === SAMPLES[kind][0] && divisorText === SAMPLES[kind][1]) {
                    dividendText = SAMPLES[next][0];
                    divisorText = SAMPLES[next][1];
                    dividendInput.text = dividendText;
                    divisorInput.text = divisorText;
                }
                kind = next;
                dividendInput.parent.children[0].text = ROW_LABELS[kind][0];
                divisorInput.parent.children[0].text = ROW_LABELS[kind][1];
                dividendInput.helpTip = ROW_TIPS[kind][0];
                divisorInput.helpTip = ROW_TIPS[kind][1];
                arrowsCheck.enabled = kind === 0;
                updatePreview();
            };
            dividendInput.onChanging = function() { dividendText = dividendInput.text; updatePreview(); };
            divisorInput.onChanging = function() { divisorText = divisorInput.text; updatePreview(); };
            answerCheck.onClick = function() { showAnswer = answerCheck.value; updatePreview(); };
            arrowsCheck.onClick = function() { showArrows = arrowsCheck.value; updatePreview(); };
            bindValueRow(cellWControls, function(value) { cellWmm = value; }, defaults.cellWmm);
            bindValueRow(cellHControls, function(value) { cellHmm = value; }, defaults.cellHmm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

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
                var d = buildDivision({
                    kind: kind, dividend: dividendText, divisor: divisorText, answer: showAnswer, arrows: showArrows,
                    fontPt: fontPt, cellW: cellWmm * MM_TO_PT, cellH: cellHmm * MM_TO_PT, pad: 3 * MM_TO_PT, arrowCut: CELL_ARROW.length - CELL_ARROW.notch
                });
                var message = [];
                if (d.problems.length > 0) message.push("읽지 못함: " + d.problems.join(", "));
                for (var n = 0; n < d.notes.length; n++) message.push(d.notes[n]);
                messageText.text = message.length > 0 ? message.join("\n") : " ";
                previewGroup = layer.groupItems.add();
                previewGroup.name = "세로셈";
                for (var l = 0; l < d.lines.length; l++) addLine(d.lines[l].points);
                for (var a = 0; a < d.arrows.length; a++) addArrow(d.arrows[a]);
                for (var t = 0; t < d.texts.length; t++) {
                    var shown = display(d.texts[t].text);
                    addLabel({ text: shown.text, sup: shown.sup, at: d.texts[t].at, dir: [0, 0] });
                }
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            function addLine(points) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = AXIS_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
            }

            function addArrow(arrow) {
                var head = headShapeFor(arrow.tip, arrow.dir, CELL_ARROW);
                var path = previewGroup.pathItems.add();
                path.setEntirePath(head.points);
                path.closed = head.closed;
                paintHead(path, head.closed, makeGray(100));
            }

            // 쌓은 분수 라벨(frac(1,2))의 글상자와 막대 (05_수학/math_label_helper.jsxinc의 buildStackedLabel이 부른다)
            function stackFrame(group, str, size, upright) {
                var frame = group.textFrames.add();
                frame.contents = str.replace(/°/g, "˘");
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

            // 칸 가운데(at)에 글자 가운데를 맞춘다. sup: 위첨자로 올릴 글자 번호
            function addLabel(label) {
                if (label.text === "") return;
                if (typeof buildStackedLabel === "function" && hasFractionText(label.text)) {
                    buildStackedLabel(previewGroup, label, fontPt, LABEL_GAP_MM * MM_TO_PT, stackFrame, stackBar);
                    return;
                }
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var attributes = frame.textRange.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, false);
                for (var s = 0; s < label.sup.length; s++) frame.textRange.characters[label.sup[s]].characterAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                var b = frame.geometricBounds;
                frame.translate(label.at[0] + negativeNumberShift(frame, label.dir) - (b[0] + b[2]) / 2, label.at[1] - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(×, −)는 HancomEQN
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-division.js). 웹 generators/math-division.js와 글자 그대로 같다
            // -------------------------------------------------------
            // opt: kind(0 조립제법·1 거꾸로 나눗셈·2 다항식 나눗셈), dividend·divisor(입력 글), answer(답 채우기), arrows(×a 화살표),
            //   fontPt, cellW·cellH(기본 칸 크기 pt), pad(글자 양옆 여백 pt), arrowCut(화살촉 길이−홈 pt)
            // 글자의 ^ 다음 숫자는 위첨자로 나눈다 (x^2 → x², 위치는 sup). 항 앞 부호 "+ "·"- "와 공백은 그대로 둔다
            function display(text) {
                var out = "", sup = [];
                for (var i = 0; i < text.length; i++) {
                    if (text.charAt(i) !== "^") { out += text.charAt(i); continue; }
                    while (i + 1 < text.length && text.charAt(i + 1) >= "0" && text.charAt(i + 1) <= "9") { sup.push(out.length); out += text.charAt(++i); }
                }
                return { text: out, sup: sup };
            }

            // -------------------------------------------------------
            // 계산 (일러 DOM을 쓰지 않는다 → illu-script-guide tests/check-division.js). 유리수는 {n, d}(d > 0, 기약)
            // -------------------------------------------------------
            function buildDivision(opt) {
                var out = { lines: [], arrows: [], texts: [], notes: [], problems: [] };
                var kind = opt.kind, plan;   // plan: {cells: [{text, row, col}], boxes: [{row, col}], rows, cols, ...}
                if (kind === 1) plan = planLadder(opt, out);
                else {
                    var dividend = parsePoly(opt.dividend);
                    if (dividend === null) dividend = kind === 0 ? parseCoefficients(opt.dividend) : null;
                    var divisor = kind === 0 ? parseRoot(opt.divisor) : parsePoly(opt.divisor);
                    if (dividend === null) out.problems.push("나뉠 식");
                    if (divisor === null) out.problems.push("제수");
                    if (out.problems.length > 0) return out;
                    if (kind === 0 && divisor.leading !== undefined) { out.notes.push("조립제법의 제수는 x−a 꼴(최고차 계수 1)이어야 합니다"); return out; }
                    plan = kind === 0 ? planSynthetic(opt, out, dividend, divisor) : planLong(opt, out, dividend, divisor);
                }
                if (plan === null || plan.cells.length === 0) return out;

                // 열 너비·줄 높이: 기본 칸 크기와 글자 너비+여백 중 큰 쪽
                var pad = opt.pad, i, j, colW = [], rowH = [];
                for (j = 0; j < plan.cols; j++) colW.push(opt.cellW);
                for (i = 0; i < plan.rows; i++) rowH.push(opt.cellH);
                for (i = 0; i < plan.cells.length; i++) {
                    var c = plan.cells[i];
                    colW[c.col] = Math.max(colW[c.col], textWidth(c.text, opt.fontPt) + pad);
                }
                var X = [0], Y = [0];
                for (j = 0; j < plan.cols; j++) X.push(X[X.length - 1] + colW[j]);
                for (i = 0; i < plan.rows; i++) Y.push(Y[Y.length - 1] + rowH[i]);
                var totalW = X[plan.cols], totalH = Y[plan.rows];
                function P(x, y) { return [x - totalW / 2, totalH / 2 - y]; }   // 왼쪽 위가 원점(y 아래쪽) → 가운데·y 위쪽
                function cx(col) { return (X[col] + X[col + 1]) / 2; }
                function cy(row) { return (Y[row] + Y[row + 1]) / 2; }
                for (i = 0; i < plan.cells.length; i++) out.texts.push({ text: plan.cells[i].text, at: P(cx(plan.cells[i].col), cy(plan.cells[i].row)) });
                for (i = 0; i < plan.boxes.length; i++) {
                    var b = plan.boxes[i], hw = Math.min(colW[b.col], opt.cellW) * 0.3, hh = rowH[b.row] * 0.3;
                    var x0 = cx(b.col) - hw, x1 = cx(b.col) + hw, y0 = cy(b.row) - hh, y1 = cy(b.row) + hh;
                    out.lines.push({ points: [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1), P(x0, y0)] });
                }
                for (i = 0; i < plan.segments.length; i++) {
                    var s = plan.segments[i];   // {x0, y0, x1, y1}: 칸 경계 좌표(열·줄 번호의 경계, 소수는 칸 안 위치)
                    out.lines.push({ points: [P(edgeX(s.x0), edgeY(s.y0)), P(edgeX(s.x1), edgeY(s.y1))] });
                }
                var cut = opt.arrowCut;
                for (i = 0; i < plan.arrows.length; i++) {
                    var a = plan.arrows[i], from = P(edgeX(a.x0), edgeY(a.y0)), tip = P(edgeX(a.x1), edgeY(a.y1));
                    var dv = [tip[0] - from[0], tip[1] - from[1]], dl = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]);
                    out.lines.push({ points: [from, [tip[0] - dv[0] / dl * cut, tip[1] - dv[1] / dl * cut]] });
                    out.arrows.push({ tip: tip, dir: [dv[0] / dl, dv[1] / dl] });
                }
                // 경계 좌표: 정수 k는 k번째 경계, k + t(0<t<1)는 그 칸 안의 위치
                function edgeX(v) { var k = Math.floor(v + 1e-9), t = v - k; return k >= plan.cols ? X[plan.cols] : X[k] + (X[k + 1] - X[k]) * t; }
                function edgeY(v) { var k = Math.floor(v + 1e-9), t = v - k; return k >= plan.rows ? Y[plan.rows] : Y[k] + (Y[k + 1] - Y[k]) * t; }
                return out;
            }

            // 글자 너비(pt) 어림: 숫자·영문 0.55em, 공백 0.3em, 위첨자 한 글자 0.4em, frac(a,b)는 분자·분모 중 긴 쪽
            function textWidth(text, fontPt) {
                var s = String(text), w = 0, i = 0;
                while (i < s.length) {
                    if (s.substring(i, i + 5) === "frac(") {
                        var close = s.indexOf(")", i), body = s.substring(i + 5, close).split(",");
                        w += Math.max(body[0].length, (body[1] || "").length) * 0.55;
                        i = close + 1;
                    } else if (s.charAt(i) === "^") {
                        i++;
                        while (i < s.length && s.charAt(i) >= "0" && s.charAt(i) <= "9") { w += 0.4; i++; }
                    } else { w += s.charAt(i) === " " ? 0.3 : (s.charCodeAt(i) < 128 ? 0.55 : 1); i++; }
                }
                return w * fontPt;
            }

            // ── 조립제법 ────────────────────────────────────────────
            // 칸 배치: 0열 제수, 1~n+1열 계수. 0줄 계수, 1줄 곱(계수 i의 곱은 i+1열에), 2줄 합
            function planSynthetic(opt, out, dividend, root) {
                var s = syntheticDivision(dividend, root), n = dividend.length;
                var plan = { cells: [], boxes: [], segments: [], arrows: [], rows: 3, cols: n + 1 }, i;
                plan.cells.push({ text: ratText(root), row: 0, col: 0 });
                for (i = 0; i < n; i++) plan.cells.push({ text: ratText(dividend[i]), row: 0, col: i + 1 });
                for (i = 0; i < n - 1; i++) {
                    if (opt.answer) plan.cells.push({ text: ratText(s.middle[i]), row: 1, col: i + 2 }); else plan.boxes.push({ row: 1, col: i + 2 });
                }
                for (i = 0; i < n; i++) {
                    if (opt.answer) plan.cells.push({ text: ratText(s.bottom[i]), row: 2, col: i + 1 }); else plan.boxes.push({ row: 2, col: i + 1 });
                }
                plan.segments.push({ x0: 1, y0: 0, x1: 1, y1: 2 });   // 제수 오른쪽 세로선 (계수 줄·곱 줄)
                plan.segments.push({ x0: 1, y0: 2, x1: n + 1, y1: 2 });   // 곱 줄 아래 가로선
                if (opt.arrows) {
                    for (i = 0; i < n - 1; i++) plan.arrows.push({ x0: i + 1.85, y0: 2.25, x1: i + 2.15, y1: 1.85 });   // 합 칸 → 다음 곱 칸 (×a). 빈칸 상자(칸 가운데 ±0.3) 바깥에서 시작해 바깥에서 끝난다
                }
                var q = s.bottom.slice(0, n - 1), rem = s.bottom[n - 1];
                out.notes.push(opt.dividend.indexOf("x") >= 0 ? "몫 " + polyText(q) + ", 나머지 " + ratFlat(rem) : "몫 계수 " + ratList(q) + ", 나머지 " + ratFlat(rem));
                return plan;
            }

            // 조립제법 계산: coefficients 높은 차수부터, root = a (x−a로 나눔). middle[i] = bottom[i]·a (i = 0…n−2), bottom[0] = c0, bottom[i] = c[i] + middle[i−1]
            function syntheticDivision(coefficients, root) {
                var middle = [], bottom = [coefficients[0]], i;
                for (i = 1; i < coefficients.length; i++) {
                    middle.push(ratMul(bottom[i - 1], root));
                    bottom.push(ratAdd(coefficients[i], middle[i - 1]));
                }
                return { middle: middle, bottom: bottom };
            }

            // 제수 "x-2" 또는 숫자 "2"(= x−2로 나눔) → 근 a. 최고차 계수가 1이 아니면 {leading}을 붙여 돌려준다. 못 읽으면 null
            function parseRoot(text) {
                var t = String(text).replace(/\s/g, "");
                if (t === "") return null;
                if (t.indexOf("x") < 0) return parseRational(t);
                var p = parsePoly(t);
                if (p === null || p.length !== 2 || p[0].d !== 1 || p[0].n === 0) return null;
                if (p[0].n !== 1) { var odd = ratNeg(ratDiv(p[1], p[0])); odd.leading = p[0]; return odd; }
                return ratNeg(p[1]);
            }

            // "1, -3, 4, -2" → 계수 목록(높은 차수부터). 못 읽으면 null
            function parseCoefficients(text) {
                var parts = String(text).split(/[,，]/), out = [];
                for (var i = 0; i < parts.length; i++) {
                    var v = parseRational(parts[i]);
                    if (v === null) return null;
                    out.push(v);
                }
                return out.length > 0 ? out : null;
            }

            // ── 거꾸로 나눗셈 ───────────────────────────────────────
            // 칸 배치: 0열 나누는 수, 1~k열 수. 0줄 처음 수, 그 아래 줄마다 나눈 값. 마지막 줄은 나누는 수가 없다
            function planLadder(opt, out) {
                var numbers = parseIntegers(opt.dividend), divisors = parseIntegers(opt.divisor);
                if (numbers === null || numbers.length === 0) out.problems.push("수");
                if (divisors === null || divisors.length === 0) out.problems.push("나누는 수");
                if (out.problems.length > 0) return null;
                var rows = [numbers], i, j;
                for (i = 0; i < divisors.length; i++) {
                    var next = [];
                    for (j = 0; j < numbers.length; j++) {
                        if (rows[i][j] % divisors[i] !== 0) { out.notes.push(rows[i][j] + "은(는) " + divisors[i] + "로 나누어떨어지지 않습니다"); return null; }
                        next.push(rows[i][j] / divisors[i]);
                    }
                    rows.push(next);
                }
                var m = divisors.length, k = numbers.length;
                var plan = { cells: [], boxes: [], segments: [], arrows: [], rows: m + 1, cols: k + 1 };
                for (i = 0; i < m; i++) plan.cells.push({ text: String(divisors[i]), row: i, col: 0 });
                for (i = 0; i <= m; i++) for (j = 0; j < k; j++) {
                    if (i === 0 || opt.answer) plan.cells.push({ text: String(rows[i][j]), row: i, col: j + 1 }); else plan.boxes.push({ row: i, col: j + 1 });
                }
                plan.segments.push({ x0: 1, y0: 0, x1: 1, y1: m });   // 나누는 수 오른쪽 세로선(ㄴ의 세로)
                for (i = 0; i < m; i++) plan.segments.push({ x0: 1, y0: i + 1, x1: k + 1, y1: i + 1 });   // 줄마다 아래 가로선(ㄴ의 가로)
                var last = rows[m], g = last[0];
                for (j = 1; j < k; j++) g = gcd(g, last[j]);
                var product = 1;
                for (i = 0; i < m; i++) product *= divisors[i];
                if (k > 1 && g > 1) out.notes.push("마지막 줄 " + last.join(", ") + "에 공약수 " + g + "이(가) 남아 더 나눌 수 있습니다");
                else if (k === 2) {
                    var lcm = product;
                    for (j = 0; j < k; j++) lcm *= last[j];
                    out.notes.push("최대공약수 " + divisors.join("×") + " = " + product + ", 최소공배수 " + product + "×" + last.join("×") + " = " + lcm);
                }
                return plan;
            }

            function parseIntegers(text) {
                var parts = String(text).split(/[,，\s]+/), out = [];
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i] === "") continue;
                    var v = Number(parts[i]);
                    if (!(v >= 1) || v !== Math.floor(v) || v > 1e9) return null;
                    out.push(v);
                }
                return out;
            }

            function gcd(a, b) {
                while (b) { var t = a % b; a = b; b = t; }
                return a;
            }

            // ── 다항식 나눗셈 세로셈 ─────────────────────────────────
            // 칸 배치: 0열 제수, 1~(차수+1)열 차수별(높은 차수가 왼쪽). 0줄 몫, 1줄 나뉠 식, 그 아래 단계마다 곱 줄·나머지 줄.
            // 빈칸 모드(answer false)는 몫·곱·나머지 칸을 상자로 둔다
            function planLong(opt, out, dividend, divisor) {
                var r = polyDivide(dividend, divisor);
                if (r === null) { out.problems.push("제수"); return null; }
                var nCols = trimPoly(dividend).length, plan = { cells: [], boxes: [], segments: [], arrows: [], rows: 2, cols: nCols + 1 }, i, step;
                plan.cells.push({ text: polyText(divisor), row: 1, col: 0 });
                addPolyRow(plan, trimPoly(dividend), 1, nCols, true, true);
                addPolyRow(plan, r.quotient, 0, nCols, opt.answer, true);
                var row = 2;
                plan.segments.push({ x0: 1, y0: 1, x1: nCols + 1, y1: 1 });   // 나뉠 식 위 가로선
                for (i = 0; i < r.steps.length; i++) {
                    step = r.steps[i];
                    addPolyRow(plan, step.product, row, nCols, opt.answer, false);
                    plan.segments.push({ x0: nCols - step.product.length + 1, y0: row + 1, x1: nCols + 1, y1: row + 1 });   // 곱 줄 아래 가로선
                    addPolyRow(plan, step.remainder, row + 1, nCols, opt.answer, false);
                    row += 2;
                }
                plan.rows = row;
                plan.segments.push({ x0: 1, y0: 1, x1: 1, y1: row });   // 제수와 나뉠 식 사이 세로선
                out.notes.push("몫 " + polyText(r.quotient) + ", 나머지 " + polyText(r.remainder));
                return plan;
            }

            // 계수 줄(높은 차수부터)을 차수 칸에 놓는다. 오른쪽 끝이 상수항 칸. 0 계수는 건너뛴다.
            // filled false면 글자 대신 상자. compact는 맨 앞 항의 음수를 "-x"로 붙여 쓴다 (몫·나뉠 식 같은 식 줄), 아니면 "- 1"처럼 부호를 띄운다
            function addPolyRow(plan, coefficients, row, nCols, filled, compact) {
                var shift = nCols - coefficients.length, first = true;
                for (var i = 0; i < coefficients.length; i++) {
                    if (coefficients[i].n === 0) continue;
                    if (filled) plan.cells.push({ text: termText(coefficients[i], coefficients.length - 1 - i, first, !compact), row: row, col: shift + i + 1 });
                    else plan.boxes.push({ row: row, col: shift + i + 1 });
                    first = false;
                }
            }

            // 나눗셈 한 번: 몫, 나머지와 단계(곱, 그 뺀 나머지). 계수는 높은 차수부터 앞의 0 없이. 제수가 0이면 null
            function polyDivide(dividend, divisor) {
                var b = trimPoly(divisor), remainder = trimPoly(dividend), steps = [];
                if (b.length === 0) return null;
                while (remainder.length >= b.length) {
                    var q = ratDiv(remainder[0], b[0]), product = [], next = [], i;
                    for (i = 0; i < remainder.length; i++) product.push(i < b.length ? ratMul(b[i], q) : ratZero());
                    for (i = 1; i < remainder.length; i++) next.push(ratSub(remainder[i], product[i]));
                    steps.push({ quotientCoefficient: q, degree: remainder.length - b.length, product: product, remainder: trimPoly(next) });
                    remainder = trimPoly(next);
                }
                // 몫: 단계마다 차수가 내려가므로 건너뛴 차수는 0으로 채워 높은 차수부터 차례로 맞춘다
                var quotient = [], k, s;
                for (k = steps.length > 0 ? steps[0].degree : -1; k >= 0; k--) {
                    var found = ratZero();
                    for (s = 0; s < steps.length; s++) if (steps[s].degree === k) found = steps[s].quotientCoefficient;
                    quotient.push(found);
                }
                return { quotient: quotient, remainder: remainder, steps: steps };
            }

            function trimPoly(p) {
                var i = 0;
                while (i < p.length && p[i].n === 0) i++;
                return p.slice(i);
            }

            // ── 다항식 ──────────────────────────────────────────────
            // "x^3-3x^2+4x-2" → 계수(높은 차수부터, 빠진 차수는 0). 변수는 x 하나. 못 읽으면 null
            function parsePoly(text) {
                var s = String(text).replace(/\s/g, "").replace(/−/g, "-");
                if (s === "") return null;
                var terms = [], cur = "", i;
                for (i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if ((ch === "+" || ch === "-") && cur !== "" && cur.charAt(cur.length - 1) !== "^") { terms.push(cur); cur = ch; } else cur += ch;
                }
                if (cur !== "") terms.push(cur);
                var byDegree = {}, top = 0;
                for (i = 0; i < terms.length; i++) {
                    var t = terms[i], sign = 1;
                    if (t.charAt(0) === "+") t = t.substring(1); else if (t.charAt(0) === "-") { sign = -1; t = t.substring(1); }
                    if (t === "") return null;
                    var x = t.indexOf("x"), coef, degree;
                    if (x < 0) { coef = parseRational(t); degree = 0; }
                    else {
                        var before = t.substring(0, x), after = t.substring(x + 1);
                        coef = before === "" ? rat(1, 1) : parseRational(before);
                        if (after === "") degree = 1;
                        else if (after.charAt(0) === "^" && /^[0-9]+$/.test(after.substring(1))) degree = parseInt(after.substring(1), 10);
                        else return null;
                    }
                    if (coef === null || degree > 30) return null;
                    if (sign < 0) coef = ratNeg(coef);
                    byDegree[degree] = byDegree.hasOwnProperty(degree) ? ratAdd(byDegree[degree], coef) : coef;
                    top = Math.max(top, degree);
                }
                var out = [];
                for (i = top; i >= 0; i--) out.push(byDegree.hasOwnProperty(i) ? byDegree[i] : ratZero());
                return out;
            }

            // 한 항의 글자: 첫 항은 음수일 때만 - (spaced면 "- 1"처럼 한 칸 띄움), 그 밖은 "+ 2x", "- 3" (부호 뒤 한 칸). 계수 1은 상수항이 아니면 생략.
            // 분수 계수는 x가 있으면 (1/2)x, 상수항이면 frac(1,2)(쌓은 분수). flat이면 상수항도 1/2 (알림 글)
            function termText(coef, degree, first, spaced, flat) {
                var negative = coef.n < 0, magnitude = ratAbs(coef), body;
                if (degree === 0) body = flat ? ratFlat(magnitude) : ratText(magnitude);
                else {
                    var c = magnitude.n === 1 && magnitude.d === 1 ? "" : (magnitude.d === 1 ? String(magnitude.n) : "(" + ratFlat(magnitude) + ")");
                    body = c + "x" + (degree > 1 ? "^" + degree : "");
                }
                if (first) return (negative ? (spaced ? "- " : "-") : "") + body;
                return (negative ? "- " : "+ ") + body;
            }

            // 계수 줄 → "x^2-x+2" (알림에 쓰는 한 줄 식)
            function polyText(coefficients) {
                var p = trimPoly(coefficients), text = "";
                if (p.length === 0) return "0";
                for (var i = 0; i < p.length; i++) {
                    if (p[i].n === 0) continue;
                    var t = termText(p[i], p.length - 1 - i, text === "", false, true);
                    text += text === "" ? t : t.charAt(0) + t.substring(2);
                }
                return text;
            }

            // ── 유리수 ──────────────────────────────────────────────
            function rat(n, d) {
                if (d < 0) { n = -n; d = -d; }
                var g = gcd(Math.abs(n), d) || 1;
                return { n: n / g, d: d / g };
            }

            function ratZero() { return { n: 0, d: 1 }; }

            function ratAdd(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }

            function ratSub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }

            function ratMul(a, b) { return rat(a.n * b.n, a.d * b.d); }

            function ratDiv(a, b) { return rat(a.n * b.d, a.d * b.n); }

            function ratNeg(a) { return { n: -a.n, d: a.d }; }

            function ratAbs(a) { return { n: Math.abs(a.n), d: a.d }; }

            // "3", "-1/2", "0.25" → {n, d}. 못 읽으면 null
            function parseRational(text) {
                var s = String(text).replace(/\s/g, "").replace(/−/g, "-");
                if (s === "") return null;
                var slash = s.indexOf("/");
                if (slash >= 0) {
                    var a = parseDecimal(s.substring(0, slash)), b = parseDecimal(s.substring(slash + 1));
                    if (a === null || b === null || b.n === 0) return null;
                    return ratDiv(a, b);
                }
                return parseDecimal(s);
            }

            function parseDecimal(s) {
                if (!/^[+-]?[0-9]+(\.[0-9]{1,4})?$/.test(s)) return null;
                var dot = s.indexOf("."), digits = dot < 0 ? 0 : s.length - dot - 1, scale = Math.pow(10, digits);
                return rat(Math.round(parseFloat(s) * scale), scale);
            }

            // 칸 글자: 정수는 그대로, 분수는 frac(n,d) (음수는 앞에 -)
            function ratText(v) {
                if (v.d === 1) return String(v.n);
                return (v.n < 0 ? "-" : "") + "frac(" + Math.abs(v.n) + "," + v.d + ")";
            }

            // 한 줄 글자(알림·다항식 항): 분수는 1/2
            function ratFlat(v) { return v.d === 1 ? String(v.n) : v.n + "/" + v.d; }

            function ratList(list) {
                var parts = [];
                for (var i = 0; i < list.length; i++) parts.push(ratFlat(list[i]));
                return parts.join(", ");
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(칸 선·화살표): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
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

            function addTextRow(parent, label, value, tip) {
                var row = parent.add("group");
                row.add("statictext", undefined, label).preferredSize.width = 80;
                var input = row.add("edittext", undefined, value);
                input.preferredSize.width = 260;
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
                var parts = ["v1", kind, encodeURIComponent(dividendText), encodeURIComponent(divisorText), showAnswer ? "1" : "0", showArrows ? "1" : "0",
                    cellWmm, cellHmm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 12) return;
                try {
                    kind = restoreNumber(p[1], kind, 0, 2);
                    dividendText = decodeURIComponent(p[2]);
                    divisorText = decodeURIComponent(p[3]);
                    showAnswer = p[4] === "1";
                    showArrows = p[5] === "1";
                    cellWmm = restoreNumber(p[6], cellWmm, 6, 30);
                    cellHmm = restoreNumber(p[7], cellHmm, 5, 20);
                    fontPt = restoreNumber(p[8], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[11] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 이차함수 ====
    // 이차함수와 이차방정식·부등식: y=ax²+bx+c의 포물선(정확한 베지어)에 꼭짓점, 축(점선), x절편(값 또는 α·β), y절편을 표시하고,
    // 이차부등식 f(x)>0 (≥, <, ≤)의 해를 x축 위 굵은 선분(경계는 ●/○)으로 나타낸다. 직선 y=mx+n을 겹쳐 교점을 찍을 수 있다.
    // 판별식, 근, 부등식의 해, 직선과의 위치 관계를 창에 보여 준다.
    // 선 두께: 축 0.4pt, 포물선·직선 0.8pt, 해 선분 2pt, 점선 0.3pt. 선택은 필요 없다.
    function makeQuadraticEngine() {
        var api = {label: "이차함수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighCommonQuadratic/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(α, β, √)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var SOLUTION_PT = 2;
            var GUIDE_PT = 0.3;
            var TICK_PT = 0.4;
            var GRID_PT = 0.3;
            var OPEN_DOT_PT = 0.5;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.7;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };
            registerHead(ARROW);
            var INEQUALITIES = ["없음", "f(x) > 0", "f(x) ≥ 0", "f(x) < 0", "f(x) ≤ 0"];
            var ROOT_LABELS = ["값", "α, β"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["vertex", "axisLine", "roots", "intercept", "line", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var aValue = 1, bValue = -4, cValue = 3;
            var mValue = 1, nValue = -1;
            var inequality = 3;
            var rootLabel = 0;
            var xMin = -2, xMax = 6, yMin = -2, yMax = 6;
            var unitMm = 6;
            var fontPt = 8;
            var opt = { vertex: true, axisLine: true, roots: true, intercept: true, line: false, formula: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {aValue: aValue, bValue: bValue, cValue: cValue, mValue: mValue, nValue: nValue, xMin: xMin, xMax: xMax,
                yMin: yMin, yMax: yMax, unitMm: unitMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];   // 선 두께 저장 순서(v2)
            var LINE_DEFAULTS = {axis: AXIS_PT, graph: GRAPH_PT, guide: GUIDE_PT, tick: TICK_PT, grid: GRID_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "y = ax² + bx + c");
            var aControls = addValueRow(functionPanel, "a", "", aValue, -5, 5, 0.5, 1);
            var bControls = addValueRow(functionPanel, "b", "", bValue, -10, 10, 0.5, 1);
            var cControls = addValueRow(functionPanel, "c", "", cValue, -10, 10, 0.5, 1);
            var solveRow = functionPanel.add("group");
            solveRow.add("statictext", undefined, "부등식:");
            var inequalityList = solveRow.add("dropdownlist", undefined, INEQUALITIES);
            inequalityList.selection = inequality;
            solveRow.add("statictext", undefined, "근 글자:");
            var rootList = addRadioChoice(solveRow, ROOT_LABELS);
            setRadioChoice(rootList, rootLabel);
            addCheckRow(functionPanel, [["vertex", "꼭짓점"], ["axisLine", "축 점선"], ["roots", "x절편"]]);
            addCheckRow(functionPanel, [["intercept", "y절편"], ["formula", "식 글자"], ["line", "직선 y=mx+n"]]);
            var mControls = addValueRow(functionPanel, "직선 m", "", mValue, -10, 10, 0.5, 1);
            var nControls = addValueRow(functionPanel, "직선 n", "", nValue, -10, 10, 0.5, 1);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "꼭짓점을 지나는 대칭축 점선";
            gridWidthControls.input.helpTip = "격자를 켰을 때 그리는 회색 모눈선";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            bindValueRow(aControls, function(value) { aValue = value; }, defaults.aValue);
            bindValueRow(bControls, function(value) { bValue = value; }, defaults.bValue);
            bindValueRow(cControls, function(value) { cValue = value; }, defaults.cValue);
            inequalityList.onChange = function() { inequality = inequalityList.selection ? inequalityList.selection.index : 0; updatePreview(); };
            rootList.onChange = function() { rootLabel = rootList.index; updatePreview(); };
            bindValueRow(mControls, function(value) { mValue = value; }, defaults.mValue);
            bindValueRow(nControls, function(value) { nValue = value; }, defaults.nValue);
            bindValueRow(xMinControls, function(value) { xMin = value; }, defaults.xMin);
            bindValueRow(xMaxControls, function(value) { xMax = value; }, defaults.xMax);
            bindValueRow(yMinControls, function(value) { yMin = value; }, defaults.yMin);
            bindValueRow(yMaxControls, function(value) { yMax = value; }, defaults.yMax);
            bindValueRow(unitControls, function(value) { unitMm = value; }, defaults.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. a = 0이면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(messageText.text);
                    return false;
                }
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

            function refreshEnabled() {
                mControls.input.parent.enabled = opt.line;
                nControls.input.parent.enabled = opt.line;
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                }
            }

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
                    refreshEnabled();
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
                if (Math.abs(aValue) < 1e-9) {
                    messageText.text = "a는 0이 아니어야 함";
                    return;
                }
                var drawing = buildQuadratic({
                    a: aValue, b: bValue, c: cValue, m: mValue, n: nValue, inequality: inequality, letters: rootLabel === 1,
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    vertex: opt.vertex, axisLine: opt.axisLine, roots: opt.roots, intercept: opt.intercept, line: opt.line,
                    formula: opt.formula, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "이차함수";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"tick"|"graph"|"solution"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [], curved = false;
                for (var i = 0; i < line.points.length; i++) {
                    anchors.push(line.points[i].anchor);
                    if (line.points[i].left !== line.points[i].anchor || line.points[i].right !== line.points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (curved) {
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
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "solution" ? SOLUTION_PT : (line.kind === "axis" ? AXIS_PT : (line.kind === "tick" ? TICK_PT : (line.kind === "grid" ? GRID_PT : GUIDE_PT))));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
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

            // 점 {at, open}: 채운 점(●) 또는 속이 흰 점(○)
            function addDot(dot) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(dot.open ? 0 : 100);
                circle.stroked = !!dot.open;
                if (dot.open) {
                    circle.strokeColor = makeGray(100);
                    circle.strokeWidth = OPEN_DOT_PT;
                }
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
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
                if (label.sup) {
                    for (var s = 0; s < label.sup.length; s++) {
                        var supAttributes = frame.textRange.characters[label.sup[s]].characterAttributes;
                        supAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(α, β, √)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-quadratic.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // ax²+bx+c = 0의 실근 (작은 것부터). 중근은 하나
            function quadraticRoots(a, b, c) {
                var D = b * b - 4 * a * c;
                if (D < -1e-12) return [];
                if (Math.abs(D) <= 1e-12) return [-b / (2 * a)];
                var s = Math.sqrt(D), r1 = (-b - s) / (2 * a), r2 = (-b + s) / (2 * a);
                return r1 < r2 ? [r1, r2] : [r2, r1];
            }

            // 포물선 [x0, x1] 조각: 이차 베지어를 3차로 (정확). 조절점은 두 끝 접선의 교점
            function parabolaPiece(a, b, c, x0, x1, u) {
                function f(x) { return a * x * x + b * x + c; }
                var P0 = [x0, f(x0)], P2 = [x1, f(x1)], slope = 2 * a * x0 + b;
                var Q = [(x0 + x1) / 2, f(x0) + slope * (x1 - x0) / 2];
                var c1 = [P0[0] + (Q[0] - P0[0]) * 2 / 3, P0[1] + (Q[1] - P0[1]) * 2 / 3];
                var c2 = [P2[0] + (Q[0] - P2[0]) * 2 / 3, P2[1] + (Q[1] - P2[1]) * 2 / 3];
                function S(p) { return [p[0] * u, p[1] * u]; }
                return [{ anchor: S(P0), left: S(P0), right: S(c1) }, { anchor: S(P2), left: S(c2), right: S(P2) }];
            }

            // 포물선이 y 범위 [y0, y1] 안에 드는 x 구간들 (볼록한 쪽 끝만 자르면 된다; 꼭짓점이 범위 밖이면 둘로 나뉠 수 있다)
            function visibleIntervals(a, b, c, x0, x1, y0, y1) {
                var cuts = [x0, x1];
                var bounds = [y0, y1];
                for (var i = 0; i < 2; i++) {
                    var r = quadraticRoots(a, b, c - bounds[i]);
                    for (var j = 0; j < r.length; j++) if (r[j] > x0 && r[j] < x1) cuts.push(r[j]);
                }
                cuts.sort(function(p, q) { return p - q; });
                var list = [];
                for (var k = 0; k + 1 < cuts.length; k++) {
                    var mid = (cuts[k] + cuts[k + 1]) / 2, y = a * mid * mid + b * mid + c;
                    if (cuts[k + 1] - cuts[k] > 1e-9 && y >= y0 - 1e-9 && y <= y1 + 1e-9) list.push([cuts[k], cuts[k + 1]]);
                }
                return list;
            }

            // 부등식의 해: kind 1 >0, 2 ≥0, 3 <0, 4 ≤0 → {intervals:[[lo, hi, loIn, hiIn]], points:[x], text}
            function solveInequality(a, b, c, kind) {
                var roots = quadraticRoots(a, b, c), greater = kind === 1 || kind === 2, closed = kind === 2 || kind === 4;
                var positiveOutside = a > 0;   // a > 0이면 두 근 바깥에서 양수
                var outside = greater === positiveOutside, I = Infinity;
                var result = { intervals: [], points: [], text: "" };
                if (roots.length === 2) {
                    var p = fmt(roots[0]), q = fmt(roots[1]);
                    if (outside) {
                        result.intervals.push([-I, roots[0], false, closed], [roots[1], I, closed, false]);
                        result.text = "x " + (closed ? "≤ " : "< ") + p + " 또는 x " + (closed ? "≥ " : "> ") + q;
                    } else {
                        result.intervals.push([roots[0], roots[1], closed, closed]);
                        result.text = p + (closed ? " ≤ x ≤ " : " < x < ") + q;
                    }
                } else if (roots.length === 1) {
                    var r = fmt(roots[0]);
                    if (outside) {
                        if (closed) { result.intervals.push([-I, I, false, false]); result.text = "모든 실수"; }
                        else { result.intervals.push([-I, roots[0], false, false], [roots[0], I, false, false]); result.text = "x ≠ " + r + "인 모든 실수"; }
                    } else if (closed) { result.points.push(roots[0]); result.text = "x = " + r; }
                    else result.text = "해가 없음";
                } else {
                    if (outside) { result.intervals.push([-I, I, false, false]); result.text = "모든 실수"; }
                    else result.text = "해가 없음";
                }
                return result;
            }

            function buildQuadratic(o) {
                var u = o.unit, a = o.a, b = o.b, c = o.c;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                function f(x) { return a * x * x + b * x + c; }
                function inView(p) { return p[0] >= o.xMin - 1e-9 && p[0] <= o.xMax + 1e-9 && p[1] >= o.yMin - 1e-9 && p[1] <= o.yMax + 1e-9; }
                function S(p) { return [p[0] * u, p[1] * u]; }

                var left = Math.min(o.xMin, 0) - 0.5, right = o.xMax + 0.8, bottom = Math.min(o.yMin, 0) - 0.5, top = o.yMax + 0.8;
                // 포물선·직선·열린 해는 X축 화살촉 가장 왼쪽(뒤끝)까지 진행한다 (그림 제작 규칙 7.7)
                var plotHi = Math.max(o.xMax, right - (ARROW.rear || ARROW.length) / u);
                if (o.grid) {
                    for (var gx = o.xMin; gx <= o.xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, o.yMin * u], [gx * u, o.yMax * u]], "grid"));
                    for (var gy = o.yMin; gy <= o.yMax; gy++) if (gy !== 0) out.lines.push(straight([[o.xMin * u, gy * u], [o.xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = o.xMin; tx <= o.xMax; tx++) {
                    if (tx === 0) continue;
                    out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "tick"));
                    if (o.numbers) out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var ty = o.yMin; ty <= o.yMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "tick"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 포물선 (y 범위 안 조각들)
                var pieces = visibleIntervals(a, b, c, o.xMin, plotHi, o.yMin, o.yMax), lastEnd = null;
                for (var p = 0; p < pieces.length; p++) {
                    out.lines.push({ points: parabolaPiece(a, b, c, pieces[p][0], pieces[p][1], u), kind: "graph" });
                    lastEnd = S([pieces[p][1], f(pieces[p][1])]);
                }
                if (o.formula && lastEnd) {
                    var eq = quadraticText(a, b, c);
                    out.texts.push({ text: eq.text, sup: eq.sup, at: lastEnd, dir: [1, 0] });
                }

                var vx = -b / (2 * a), vy = f(vx), roots = quadraticRoots(a, b, c), D = b * b - 4 * a * c;
                if (o.axisLine) out.lines.push(straight([[vx * u, o.yMin * u], [vx * u, o.yMax * u]], "guide"));
                if (o.vertex && inView([vx, vy])) {
                    out.dots.push({ at: S([vx, vy]) });
                    out.texts.push({ text: "(" + fmt(vx) + ", " + fmt(vy) + ")", at: S([vx, vy]), dir: [0, a > 0 ? -1 : 1], upright: true });
                }
                if (o.roots) {
                    var names = roots.length === 2 ? ["α", "β"] : ["α"];
                    for (var r = 0; r < roots.length; r++) {
                        if (!inView([roots[r], 0])) continue;
                        out.dots.push({ at: S([roots[r], 0]) });
                        out.texts.push({ text: o.letters ? names[r] : fmt(roots[r]), at: S([roots[r], 0]), dir: [r === 0 ? -0.7071 : 0.7071, a > 0 ? 0.7071 : -0.7071], upright: !o.letters });
                    }
                }
                if (o.intercept && inView([0, c])) {
                    out.dots.push({ at: S([0, c]) });
                    out.texts.push({ text: fmt(c), at: S([0, c]), dir: [0.7071, 0.7071], upright: true });
                }

                // 부등식의 해: x축 위 굵은 선분과 경계 점
                if (o.inequality > 0) {
                    var solution = solveInequality(a, b, c, o.inequality);
                    for (var s = 0; s < solution.intervals.length; s++) {
                        var seg = solution.intervals[s], lo = Math.max(seg[0], o.xMin), hi = Math.min(seg[1], plotHi);
                        if (hi - lo > 1e-9) out.lines.push(straight([[lo * u, 0], [hi * u, 0]], "solution"));
                        if (isFinite(seg[0]) && seg[0] >= o.xMin) out.dots.push({ at: [seg[0] * u, 0], open: !seg[2] });
                        if (isFinite(seg[1]) && seg[1] <= o.xMax) out.dots.push({ at: [seg[1] * u, 0], open: !seg[3] });
                    }
                    for (var sp = 0; sp < solution.points.length; sp++) out.dots.push({ at: [solution.points[sp] * u, 0] });
                    out.notes.push(INEQUALITIES[o.inequality] + "의 해: " + solution.text);
                }

                // 직선과 교점
                if (o.line) {
                    var yl0 = o.m * o.xMin + o.n, yl1 = o.m * plotHi + o.n;
                    var seg2 = clipSegment([o.xMin, yl0], [plotHi, yl1], o.yMin, o.yMax);
                    if (seg2) out.lines.push(straight([S(seg2[0]), S(seg2[1])], "graph"));
                    var meet = quadraticRoots(a, b - o.m, c - o.n), D2 = (b - o.m) * (b - o.m) - 4 * a * (c - o.n);
                    for (var k = 0; k < meet.length; k++) {
                        var P = [meet[k], f(meet[k])];
                        if (inView(P)) out.dots.push({ at: S(P) });
                    }
                    out.notes.push("직선과: D = " + fmt(D2) + " → " + (D2 > 1e-9 ? "두 점에서 만남" : (D2 >= -1e-9 ? "접함" : "만나지 않음")) +
                        (meet.length > 0 ? " (x = " + joinValues(meet) + ")" : ""));
                }

                out.notes.unshift("꼭짓점 (" + fmt(vx) + ", " + fmt(vy) + "), 판별식 D = " + fmt(D) + (roots.length > 0 ? ", 근 x = " + joinValues(roots) : ", 실근 없음"));
                return out;
            }

            // (x0, y0)-(x1, y1) 선분을 y 범위로 자른다. 안 지나면 null
            function clipSegment(p, q, y0, y1) {
                var t0 = 0, t1 = 1, dy = q[1] - p[1];
                if (Math.abs(dy) < 1e-12) return p[1] >= y0 && p[1] <= y1 ? [p, q] : null;
                var ta = (y0 - p[1]) / dy, tb = (y1 - p[1]) / dy;
                t0 = Math.max(t0, Math.min(ta, tb));
                t1 = Math.min(t1, Math.max(ta, tb));
                if (t1 - t0 < 1e-9) return null;
                function at(t) { return [p[0] + (q[0] - p[0]) * t, p[1] + dy * t]; }
                return [at(t0), at(t1)];
            }

            // y=x2-4x+3 (a=1, -1은 부호만), 위첨자 2 위치. 계수는 소수로 (1/2x²는 1/(2x²)로 읽히므로 분수로 쓰지 않는다)
            function quadraticText(a, b, c) {
                function coefText(v) { var r = Math.round(v * 100) / 100; return String(r === 0 ? 0 : r); }
                var text = "y=", sup = [];
                var aText = coefText(a);
                text += aText === "1" ? "" : (aText === "-1" ? "-" : aText);
                text += "x";
                sup.push(text.length);
                text += "2";
                if (b !== 0) {
                    var bText = coefText(Math.abs(b));
                    text += (b < 0 ? "-" : "+") + (bText === "1" ? "" : bText) + "x";
                }
                if (c !== 0) text += (c < 0 ? "-" : "+") + coefText(Math.abs(c));
                return { text: text, sup: sup };
            }

            function joinValues(list) {
                var parts = [];
                for (var i = 0; i < list.length; i++) parts.push(fmt(list[i]));
                return parts.join(", ");
            }

            // 정수·분수(분모 6까지)·√로 알아볼 수 있으면 그렇게 (p ± √q 꼴은 소수)
            function fmt(v) {
                if (Math.abs(v) < 1e-9) return "0";
                var sign = v < 0 ? "-" : "", a = Math.abs(v);
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(a * q);
                    if (Math.abs(p / q - a) < 1e-9 * (1 + a)) return sign + (q === 1 ? String(p) : p + "/" + q);
                }
                var square = a * a;
                if (Math.abs(square - Math.round(square)) < 1e-9 * (1 + square)) return sign + "√" + Math.round(square);
                return String(Math.round(v * 100) / 100);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·눈금·그래프·보조선·모눈): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "graph") { GRAPH_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "grid") { GRID_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "graph") return GRAPH_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "tick") return TICK_PT;
                if (group === "grid") return GRID_PT;
                return 0;
            }

            // v1(축·그래프·보조선 3개)도 읽는다. 새로 생긴 칸은 v1에 없으므로 기본값 그대로다
            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", aValue, bValue, cValue, mValue, nValue, inequality, rootLabel, xMin, xMax, yMin, yMax, unitMm, fontPt, flags,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 18 || p[14].length !== FLAG_KEYS.length) return;
                try {
                    aValue = restoreNumber(p[1], aValue, -5, 5);
                    bValue = restoreNumber(p[2], bValue, -10, 10);
                    cValue = restoreNumber(p[3], cValue, -10, 10);
                    mValue = restoreNumber(p[4], mValue, -10, 10);
                    nValue = restoreNumber(p[5], nValue, -10, 10);
                    inequality = Math.round(restoreNumber(p[6], inequality, 0, INEQUALITIES.length - 1));
                    rootLabel = Math.round(restoreNumber(p[7], rootLabel, 0, ROOT_LABELS.length - 1));
                    xMin = Math.round(restoreNumber(p[8], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[9], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[10], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[11], yMax, 1, 20));
                    unitMm = restoreNumber(p[12], unitMm, 2, 20);
                    fontPt = restoreNumber(p[13], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[14].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[15], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[16], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[17] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 유리·무리함수 ====
    // 유리함수 y=k/(x-p)+q의 두 가지(쌍곡선)와 점근선 x=p, y=q(점선), 무리함수 y=±√(a(x-p))+q와 시작점 (p, q)를 좌표평면에 그린다.
    // 무리함수는 r=√(a(x-p))로 놓으면 x가 r의 이차식, y가 일차식이라 베지어 한 조각이 정확하다. 쌍곡선은 ln|x-p|를 매개로
    // 한 도막씩 에르미트 3차 곡선으로 잇는다(오차는 단위 길이의 1/10000 아래). 절편, 식 글자, 정의역·치역을 창에 보여 준다.
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 점근선 0.3pt 점선. 선택은 필요 없다.
    function makeRationalEngine() {
        var api = {label: "유리·무리함수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighCommonRational/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(√)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var TICK_PT = 0.4;
            var GRID_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.7;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4.84, halfWidth: 1.573, notch: 1.24 };
            registerHead(ARROW);
            var HYPERBOLA_STEP = 0.25;   // ln|x-p| 간격. 도막 하나의 오차가 단위 길이의 1/10000 아래
            var KINDS = ["유리함수 y = k/(x-p)+q", "무리함수 y = √(a(x-p))+q", "무리함수 y = -√(a(x-p))+q"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["asymptote", "start", "intercepts", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 0;
            var kValue = 2, aValue = 1, pValue = 1, qValue = 1;
            var xMin = -3, xMax = 6, yMin = -3, yMax = 6;
            var unitMm = 6;
            var fontPt = 8;
            var opt = { asymptote: true, start: true, intercepts: true, formula: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {kValue: kValue, aValue: aValue, pValue: pValue, qValue: qValue, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax,
                unitMm: unitMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();
            var LINE_KEYS = ["axis", "graph", "guide", "tick", "grid", "mark", "thin", "table", "edge"];   // 선 두께 저장 순서(v2)
            var LINE_DEFAULTS = {axis: AXIS_PT, graph: GRAPH_PT, guide: GUIDE_PT, tick: TICK_PT, grid: GRID_PT};
            loadLineWidths();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "함수");
            var kindRow = functionPanel.add("group");
            kindRow.add("statictext", undefined, "함수:").preferredSize.width = LABEL_WIDTH;
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var kControls = addValueRow(functionPanel, "k (유리)", "", kValue, -10, 10, 0.5, 1);
            var aControls = addValueRow(functionPanel, "a (무리)", "", aValue, -5, 5, 0.5, 1);
            var pControls = addValueRow(functionPanel, "p", "", pValue, -10, 10, 0.5, 1);
            var qControls = addValueRow(functionPanel, "q", "", qValue, -10, 10, 0.5, 1);
            var checks = {};
            addCheckRow(functionPanel, [["asymptote", "점근선"], ["start", "시작점"], ["intercepts", "절편"]]);
            addCheckRow(functionPanel, [["formula", "식 글자"]]);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var lineWidthPanel = addPanel(win, "선 두께", "lineWidths");
            var axisWidthControls = addValueRow(lineWidthPanel, "축", "pt", currentLineWidth("axis"), 0.1, 2, 0.1, 1);
            var tickWidthControls = addValueRow(lineWidthPanel, "눈금", "pt", currentLineWidth("tick"), 0.1, 2, 0.1, 1);
            var graphWidthControls = addValueRow(lineWidthPanel, "그래프", "pt", currentLineWidth("graph"), 0.1, 2, 0.1, 1);
            var guideWidthControls = addValueRow(lineWidthPanel, "보조선", "pt", currentLineWidth("guide"), 0.1, 2, 0.1, 1);
            var gridWidthControls = addValueRow(lineWidthPanel, "모눈", "pt", currentLineWidth("grid"), 0.1, 2, 0.1, 1);
            guideWidthControls.input.helpTip = "점근선 점선";
            gridWidthControls.input.helpTip = "격자를 켰을 때 그리는 회색 모눈선";
            bindValueRow(axisWidthControls, function(value) { setLineWidth("axis", value); }, LINE_DEFAULTS.axis);
            bindValueRow(tickWidthControls, function(value) { setLineWidth("tick", value); }, LINE_DEFAULTS.tick);
            bindValueRow(graphWidthControls, function(value) { setLineWidth("graph", value); }, LINE_DEFAULTS.graph);
            bindValueRow(guideWidthControls, function(value) { setLineWidth("guide", value); }, LINE_DEFAULTS.guide);
            bindValueRow(gridWidthControls, function(value) { setLineWidth("grid", value); }, LINE_DEFAULTS.grid);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(kControls, function(value) { kValue = value; }, defaults.kValue);
            bindValueRow(aControls, function(value) { aValue = value; }, defaults.aValue);
            bindValueRow(pControls, function(value) { pValue = value; }, defaults.pValue);
            bindValueRow(qControls, function(value) { qValue = value; }, defaults.qValue);
            bindValueRow(xMinControls, function(value) { xMin = value; }, defaults.xMin);
            bindValueRow(xMaxControls, function(value) { xMax = value; }, defaults.xMax);
            bindValueRow(yMinControls, function(value) { yMin = value; }, defaults.yMin);
            bindValueRow(yMaxControls, function(value) { yMax = value; }, defaults.yMax);
            bindValueRow(unitControls, function(value) { unitMm = value; }, defaults.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. k = 0(유리)이나 a = 0(무리)이면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(messageText.text);
                    return false;
                }
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

            function refreshEnabled() {
                kControls.input.parent.enabled = kind === 0;
                aControls.input.parent.enabled = kind > 0;
                checks.asymptote.enabled = kind === 0;
                checks.start.enabled = kind > 0;
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    checks[items[i][0]] = check;
                    bindOption(check, items[i][0]);
                }
            }

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
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                if (kind === 0 && Math.abs(kValue) < 1e-9) {
                    messageText.text = "k는 0이 아니어야 함";
                    return;
                }
                if (kind > 0 && Math.abs(aValue) < 1e-9) {
                    messageText.text = "a는 0이 아니어야 함";
                    return;
                }
                var drawing = buildRational({
                    kind: kind, k: kValue, a: aValue, p: pValue, q: qValue,
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    asymptote: opt.asymptote, start: opt.start, intercepts: opt.intercepts, formula: opt.formula,
                    grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = kind === 0 ? "유리함수" : "무리함수";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"tick"|"graph"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [], curved = false;
                for (var i = 0; i < line.points.length; i++) {
                    anchors.push(line.points[i].anchor);
                    if (line.points[i].left !== line.points[i].anchor || line.points[i].right !== line.points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (curved) {
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

            function addDot(dot) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(100);
                circle.stroked = false;
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

            // 글자 서체 (07_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(√)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-rational.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 쌍곡선 한 가지에서 w = |x-p|가 범위 안에 드는 구간. kk = k × (가지 방향 ±1)이면 y - q = kk / w.
            // y - q ∈ [vLo, vHi], w ∈ [wLo, wHi]. 없으면 null
            function branchRange(kk, vLo, vHi, wLo, wHi) {
                var w0, w1;
                if (kk > 0) {
                    if (vHi <= 0) return null;
                    w0 = kk / vHi;
                    w1 = vLo > 0 ? kk / vLo : Infinity;
                } else {
                    if (vLo >= 0) return null;
                    w0 = kk / vLo;
                    w1 = vHi < 0 ? kk / vHi : Infinity;
                }
                w0 = Math.max(w0, wLo);
                w1 = Math.min(w1, wHi);
                return w1 - w0 > 1e-9 ? [w0, w1] : null;
            }

            // 쌍곡선 가지: x = p + side·w, y = q + k/(side·w), w ∈ [w0, w1]. t = ln w를 매개로 에르미트 도막을 잇는다
            function hyperbolaBranch(k, p, q, side, w0, w1, u) {
                var t0 = Math.log(w0), t1 = Math.log(w1);
                var count = Math.max(1, Math.ceil((t1 - t0) / HYPERBOLA_STEP)), h = (t1 - t0) / count;
                var points = [];
                for (var i = 0; i <= count; i++) {
                    var w = Math.exp(t0 + h * i);
                    var P = [p + side * w, q + k / (side * w)], D = [side * w, -k / (side * w)];   // dP/dt
                    var left = i === 0 ? P : [P[0] - D[0] * h / 3, P[1] - D[1] * h / 3];
                    var right = i === count ? P : [P[0] + D[0] * h / 3, P[1] + D[1] * h / 3];
                    points.push({ anchor: [P[0] * u, P[1] * u], left: [left[0] * u, left[1] * u], right: [right[0] * u, right[1] * u] });
                }
                return points;
            }

            // 무리함수에서 r = √(a(x-p))가 범위 안에 드는 구간 (x = p + r²/a, y = q + s·r). 없으면 null
            function rootRange(s, a, p, q, xMin, xMax, yMin, yMax) {
                var lo = Math.min(a * (xMin - p), a * (xMax - p)), hi = Math.max(a * (xMin - p), a * (xMax - p));
                if (hi < 0) return null;
                var r0 = Math.sqrt(Math.max(lo, 0)), r1 = Math.sqrt(hi);
                var y0 = s > 0 ? yMin - q : q - yMax, y1 = s > 0 ? yMax - q : q - yMin;   // s·r ∈ [yMin-q, yMax-q]
                r0 = Math.max(r0, y0, 0);
                r1 = Math.min(r1, y1);
                return r1 - r0 > 1e-9 ? [r0, r1] : null;
            }

            // 무리함수 [r0, r1] 조각: x가 r의 이차식, y가 일차식이라 에르미트 3차 한 조각이 정확하다
            function rootPiece(s, a, p, q, r0, r1, u) {
                var h = r1 - r0;
                function P(r) { return [p + r * r / a, q + s * r]; }
                function D(r) { return [2 * r / a, s]; }
                var A = P(r0), B = P(r1), DA = D(r0), DB = D(r1);
                function S(v) { return [v[0] * u, v[1] * u]; }
                return [
                    { anchor: S(A), left: S(A), right: S([A[0] + DA[0] * h / 3, A[1] + DA[1] * h / 3]) },
                    { anchor: S(B), left: S([B[0] - DB[0] * h / 3, B[1] - DB[1] * h / 3]), right: S(B) }
                ];
            }

            function buildRational(o) {
                var u = o.unit, p = o.p, q = o.q;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                function inView(v) { return v[0] >= o.xMin - 1e-9 && v[0] <= o.xMax + 1e-9 && v[1] >= o.yMin - 1e-9 && v[1] <= o.yMax + 1e-9; }
                function S(v) { return [v[0] * u, v[1] * u]; }

                var left = Math.min(o.xMin, 0) - 0.5, right = o.xMax + 0.8, bottom = Math.min(o.yMin, 0) - 0.5, top = o.yMax + 0.8;
                // 유리·무리함수 그래프는 X축 화살촉 가장 왼쪽(뒤끝)까지 진행한다 (그림 제작 규칙 7.7)
                var plotHi = Math.max(o.xMax, right - (ARROW.rear || ARROW.length) / u);
                if (o.grid) {
                    for (var gx = o.xMin; gx <= o.xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, o.yMin * u], [gx * u, o.yMax * u]], "grid"));
                    for (var gy = o.yMin; gy <= o.yMax; gy++) if (gy !== 0) out.lines.push(straight([[o.xMin * u, gy * u], [o.xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = o.xMin; tx <= o.xMax; tx++) {
                    if (tx === 0) continue;
                    out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "tick"));
                    if (o.numbers) out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var ty = o.yMin; ty <= o.yMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "tick"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 절편 글자는 그래프가 지나지 않는 쪽에: 오르는 그래프면 x절편은 왼쪽 위, 내리는 그래프면 오른쪽 위. y절편은 축 오른쪽
                var rising, formulaAt = null, formulaDir = [1, 0], xCut = null, yCut = null;
                if (o.kind === 0) {
                    var k = o.k;
                    rising = k < 0;
                    var vLo = o.yMin - q, vHi = o.yMax - q;
                    var sides = [1, -1];
                    for (var b = 0; b < 2; b++) {
                        var side = sides[b];
                        var wLo = Math.max(side > 0 ? o.xMin - p : p - plotHi, 0), wHi = side > 0 ? plotHi - p : p - o.xMin;
                        var range = wHi > 0 ? branchRange(k * side, vLo, vHi, wLo, wHi) : null;
                        if (!range) continue;
                        out.lines.push({ points: hyperbolaBranch(k, p, q, side, range[0], range[1], u), kind: "graph" });
                        // 식 글자는 점근선 쪽 가파른 끝에 (먼 끝은 점근선 y=q의 이름과 겹친다)
                        if (formulaAt === null) {
                            formulaAt = S([p + side * range[0], q + k / (side * range[0])]);
                            formulaDir = [side, 0];
                        }
                    }
                    if (o.asymptote) {
                        if (p >= o.xMin && p <= o.xMax) {
                            out.lines.push(straight([[p * u, o.yMin * u], [p * u, o.yMax * u]], "guide"));
                            out.texts.push({ text: "x=" + fmt(p), at: [p * u, o.yMax * u], dir: [0, 1] });
                        }
                        if (q >= o.yMin && q <= o.yMax) {
                            out.lines.push(straight([[o.xMin * u, q * u], [plotHi * u, q * u]], "guide"));
                            out.texts.push({ text: "y=" + fmt(q), at: [plotHi * u, q * u], dir: [1, 0] });
                        }
                    }
                    if (Math.abs(p) > 1e-9) yCut = q - k / p;
                    if (Math.abs(q) > 1e-9) xCut = p - k / q;
                    if (o.formula && formulaAt) out.texts.push({ text: rationalText(k, p, q), at: formulaAt, dir: formulaDir });
                    out.notes.push("점근선 x = " + fmt(p) + ", y = " + fmt(q));
                    out.notes.push("정의역 {x | x ≠ " + fmt(p) + "}, 치역 {y | y ≠ " + fmt(q) + "}");
                } else {
                    var s = o.kind === 1 ? 1 : -1, a = o.a;
                    rising = s * a > 0;
                    var rr = rootRange(s, a, p, q, o.xMin, plotHi, o.yMin, o.yMax);
                    if (rr) {
                        out.lines.push({ points: rootPiece(s, a, p, q, rr[0], rr[1], u), kind: "graph" });
                        formulaAt = S([p + rr[1] * rr[1] / a, q + s * rr[1]]);
                        formulaDir = [a > 0 ? 1 : -1, 0];
                    }
                    if (o.start && inView([p, q])) {
                        out.dots.push({ at: S([p, q]) });
                        out.texts.push({ text: "(" + fmt(p) + ", " + fmt(q) + ")", at: S([p, q]), dir: [a > 0 ? -0.7071 : 0.7071, s > 0 ? -0.7071 : 0.7071], upright: true });
                    }
                    if (-a * p >= 0) yCut = q + s * Math.sqrt(-a * p);
                    if (-q * s >= 0) xCut = p + q * q / a;
                    if (o.formula && formulaAt) out.texts.push({ text: rootText(s, a, p, q), at: formulaAt, dir: formulaDir });
                    out.notes.push("시작점 (" + fmt(p) + ", " + fmt(q) + ")");
                    out.notes.push("정의역 {x | x " + (a > 0 ? "≥ " : "≤ ") + fmt(p) + "}, 치역 {y | y " + (s > 0 ? "≥ " : "≤ ") + fmt(q) + "}");
                }

                if (o.intercepts) {
                    // 시작점이나 원점과 겹치는 절편은 한 번만. 정수 절편은 눈금 숫자가 이미 있으면 점만 찍는다
                    var cutText = function(v) { return o.numbers && Math.abs(v - Math.round(v)) < 1e-9 ? null : fmt(v); };
                    if (xCut !== null && inView([xCut, 0]) && Math.abs(xCut) > 1e-9 && !(o.kind > 0 && o.start && Math.abs(q) < 1e-9)) {
                        out.dots.push({ at: [xCut * u, 0] });
                        if (cutText(xCut)) out.texts.push({ text: fmt(xCut), at: [xCut * u, 0], dir: [rising ? -0.7071 : 0.7071, 0.7071], upright: true });
                    }
                    if (yCut !== null && inView([0, yCut]) && Math.abs(yCut) > 1e-9 && !(o.kind > 0 && o.start && Math.abs(p) < 1e-9)) {
                        out.dots.push({ at: [0, yCut * u] });
                        if (cutText(yCut)) out.texts.push({ text: fmt(yCut), at: [0, yCut * u], dir: [0.7071, rising ? -0.7071 : 0.7071], upright: true });
                    }
                }
                if (formulaAt === null) out.notes.push("그래프가 범위 밖에 있음");
                return out;
            }

            function coefText(v) { var r = Math.round(v * 100) / 100; return String(r === 0 ? 0 : r); }

            // x-p를 글자로: x, x-1, x+2.5
            function shiftText(p) {
                if (Math.abs(p) < 1e-9) return "x";
                return "x" + (p > 0 ? "-" : "+") + coefText(Math.abs(p));
            }

            function tailText(q) {
                if (Math.abs(q) < 1e-9) return "";
                return (q > 0 ? "+" : "-") + coefText(Math.abs(q));
            }

            // y=2/(x-1)+1, y=-3/x
            function rationalText(k, p, q) {
                var denominator = Math.abs(p) < 1e-9 ? "x" : "(" + shiftText(p) + ")";
                return "y=" + coefText(k) + "/" + denominator + tailText(q);
            }

            // y=√x, y=-√(2x-2)+1, y=√(-x+3). 근호 안은 ax-ap로 풀어 쓴다
            function rootText(s, a, p, q) {
                var aText = coefText(a), inner = aText === "1" ? "x" : (aText === "-1" ? "-x" : aText + "x");
                var c = -a * p;
                if (Math.abs(c) > 1e-9) inner += (c > 0 ? "+" : "-") + coefText(Math.abs(c));
                return "y=" + (s < 0 ? "-" : "") + "√" + (inner === "x" ? "x" : "(" + inner + ")") + tailText(q);
            }

            // 정수·분수(분모 6까지)·√로 알아볼 수 있으면 그렇게
            function fmt(v) {
                if (Math.abs(v) < 1e-9) return "0";
                var sign = v < 0 ? "-" : "", a = Math.abs(v);
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(a * q);
                    if (Math.abs(p / q - a) < 1e-9 * (1 + a)) return sign + (q === 1 ? String(p) : p + "/" + q);
                }
                var square = a * a;
                if (Math.abs(square - Math.round(square)) < 1e-9 * (1 + square)) return sign + "√" + Math.round(square);
                return String(Math.round(v * 100) / 100);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            // 선 두께(축·눈금·그래프·보조선·모눈): 기본값은 위 상수. 바꾼 값은 PREF_KEY + "/lines"에 따로 저장하고 다음에 불러온다
            function setLineWidth(group, value) {
                if (group === "axis") { AXIS_PT = value; }
                if (group === "graph") { GRAPH_PT = value; }
                if (group === "guide") { GUIDE_PT = value; }
                if (group === "tick") { TICK_PT = value; }
                if (group === "grid") { GRID_PT = value; }
            }

            function currentLineWidth(group) {
                if (group === "axis") return AXIS_PT;
                if (group === "graph") return GRAPH_PT;
                if (group === "guide") return GUIDE_PT;
                if (group === "tick") return TICK_PT;
                if (group === "grid") return GRID_PT;
                return 0;
            }

            // v1(축·그래프·보조선 3개)도 읽는다. 새로 생긴 칸은 v1에 없으므로 기본값 그대로다
            function loadLineWidths() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY + "/lines"); } catch (e) { return; }
                var p = raw ? raw.split("|") : [];
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", kind, kValue, aValue, pValue, qValue, xMin, xMax, yMin, yMax, unitMm, fontPt, flags,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 16 || p[12].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    kValue = restoreNumber(p[2], kValue, -10, 10);
                    aValue = restoreNumber(p[3], aValue, -5, 5);
                    pValue = restoreNumber(p[4], pValue, -10, 10);
                    qValue = restoreNumber(p[5], qValue, -10, 10);
                    xMin = Math.round(restoreNumber(p[6], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[7], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[8], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[9], yMax, 1, 20));
                    unitMm = restoreNumber(p[10], unitMm, 2, 20);
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
})();
