// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 미리보기 라벨 겹침 풀기 (07_수학/math_label_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/math_label_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 고등학교 기하: 이차곡선(포물선·타원·쌍곡선)과 그 접선, 평면벡터, 공간도형(정사영·삼수선·두 평면이 이루는 각) 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 고등학교 수학은 과목별 스크립트 다섯 개(공통수학·수학Ⅰ·수학Ⅱ·확률과 통계·기하)로 나뉘어 있고, 탭마다 저장 키는 예전 그대로다.
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighGeometry/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

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
    var HEAD_PREF_KEY = "HighGeometry/head";
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
    var engines = [makeConicEngine(), makeConicTangentEngine(), makeVectorEngine(), makeSpaceEngine()];

    var win = new Window("dialog", "기하");
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
    tabBar = win.add("group");
    tabBar.alignChildren = ["left", "center"];
    tabBar.spacing = 12;
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

    // ==== 이차곡선 ====
    // 이차곡선: 포물선 y²=4px(x²=4py), 타원 x²/a²+y²/b²=1, 쌍곡선 x²/a²-y²/b²=±1을 좌표평면에 그린다. 중심(꼭짓점)을 (m, n)으로 옮길 수 있다.
    // 초점 F·F′, 꼭짓점, 준선(포물선)·점근선(쌍곡선), 곡선 위의 점 P와 초점까지 선분(포물선은 준선까지 수선 PH), P에서의 접선을 고른다.
    // 계산은 주축이 가로인 표준형에서 하고 세로면 x·y를 바꾼다. 타원은 4점 베지어, 포물선은 정확한 이차 베지어, 쌍곡선은 에르미트 베지어.
    // 선 두께: 축 0.4pt, 곡선·접선 0.8pt, 초점까지 선분 0.4pt, 준선·점근선·수선 점선 0.3pt. 선택은 필요 없다.
    function makeConicEngine() {
        var api = {label: "이차곡선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathConic/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′, √ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var THIN_PT = 0.4;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            registerHead(ARROW);
            var KAPPA = 0.5522847498;   // 타원을 베지어 4개로
            var KINDS = ["포물선", "타원", "쌍곡선"];
            var DIRECTIONS = ["가로 (y²=4px, =1)", "세로 (x²=4py, =-1)"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["foci", "vertices", "equation", "guides", "coords", "point", "focalLines", "tangent", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 1;
            var direction = 0;
            var pValue = 1;
            var aValue = 3, bValue = 2;
            var mValue = 0, nValue = 0;
            var angle = 60;
            var opt = { foci: true, vertices: true, equation: true, guides: true, coords: false, point: false, focalLines: true, tangent: false,
                grid: false, numbers: true };
            var unitMm = 6;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {pValue: pValue, aValue: aValue, bValue: bValue, mValue: mValue, nValue: nValue, angle: angle,
                unitMm: unitMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var curvePanel = addPanel(win, "곡선");
            var kindRow = curvePanel.add("group");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var directionList = kindRow.add("dropdownlist", undefined, DIRECTIONS);
            directionList.selection = direction;
            directionList.helpTip = "포물선: 가로 y²=4px, 세로 x²=4py. 쌍곡선: 가로 …=1, 세로 …=-1. 타원은 a, b 중 큰 쪽이 장축";
            var pControls = addValueRow(curvePanel, "p", "", pValue, -5, 5, 0.5, 1);
            var aControls = addValueRow(curvePanel, "a", "", aValue, 0.5, 10, 0.5, 1);
            var bControls = addValueRow(curvePanel, "b", "", bValue, 0.5, 10, 0.5, 1);
            var mControls = addValueRow(curvePanel, "중심 이동 m", "", mValue, -10, 10, 0.5, 1);
            var nControls = addValueRow(curvePanel, "중심 이동 n", "", nValue, -10, 10, 0.5, 1);

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["foci", "초점 F, F′"], ["vertices", "꼭짓점"], ["equation", "식 글자"]]);
            addCheckRow(markPanel, [["guides", "준선·점근선"], ["coords", "좌표 함께"], ["point", "곡선 위의 점 P"]]);
            addCheckRow(markPanel, [["focalLines", "P에서 초점까지"], ["tangent", "P에서의 접선"]]);
            var angleControls = addValueRow(markPanel, "P 위치", "°", angle, -180, 180, 5, 0);
            angleControls.input.helpTip = "타원 (a cos θ, b sin θ), 쌍곡선 (a/cos θ, b tan θ), 포물선은 θ/2의 tan으로 곡선 전체를 돈다";

            var planePanel = addPanel(win, "좌표평면");
            var unitControls = addValueRow(planePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(planePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(planePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            directionList.onChange = function() { direction = directionList.selection ? directionList.selection.index : 0; updatePreview(); };
            bindValueRow(pControls, function(value) { pValue = value; }, DEFAULTS.pValue);
            bindValueRow(aControls, function(value) { aValue = value; }, DEFAULTS.aValue);
            bindValueRow(bControls, function(value) { bValue = value; }, DEFAULTS.bValue);
            bindValueRow(mControls, function(value) { mValue = value; }, DEFAULTS.mValue);
            bindValueRow(nControls, function(value) { nValue = value; }, DEFAULTS.nValue);
            bindValueRow(angleControls, function(value) { angle = value; }, DEFAULTS.angle);
            bindValueRow(unitControls, function(value) { unitMm = value; }, DEFAULTS.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, DEFAULTS.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, DEFAULTS.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. p = 0이면 확정하지 않는다
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
                pControls.input.parent.enabled = kind === 0;
                aControls.input.parent.enabled = kind !== 0;
                bControls.input.parent.enabled = kind !== 0;
                directionList.enabled = kind !== 1;
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
                if (kind === 0 && Math.abs(pValue) < 1e-9) {
                    messageText.text = "포물선은 p가 0이 아니어야 함";
                    return;
                }
                var drawing = buildConic({
                    kind: kind, vertical: direction === 1, p: pValue, a: aValue, b: bValue, m: mValue, n: nValue, angle: angle,
                    unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, foci: opt.foci, vertices: opt.vertices, equation: opt.equation,
                    guides: opt.guides, coords: opt.coords, point: opt.point, focalLines: opt.focalLines, tangent: opt.tangent,
                    grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "이차곡선";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"main"|"thin"|"guide"|"grid"}
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
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "thin" || line.kind === "axis" ? (line.kind === "thin" ? THIN_PT : AXIS_PT) : GUIDE_PT);
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

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
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

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(′, √)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-conic.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 표준형(주축 가로, 중심 원점)의 모양: A(주축 쪽), B, c(초점), R(그리는 반폭), 세로인지
            function conicShape(o) {
                var shape = { kind: o.kind, vertical: o.vertical, A: 0, B: 0, c: 0, p: o.p };
                if (o.kind === 0) {
                    shape.c = o.p;
                    shape.R = Math.ceil(Math.abs(o.p) * 3) + 1;
                } else if (o.kind === 1) {
                    shape.vertical = o.b > o.a;
                    shape.A = Math.max(o.a, o.b);
                    shape.B = Math.min(o.a, o.b);
                    shape.c = Math.sqrt(shape.A * shape.A - shape.B * shape.B);
                    shape.R = Math.ceil(shape.A) + 1;
                } else {
                    shape.A = o.vertical ? o.b : o.a;
                    shape.B = o.vertical ? o.a : o.b;
                    shape.c = Math.sqrt(o.a * o.a + o.b * o.b);
                    shape.R = Math.ceil(Math.max(shape.c, shape.B) * 1.5) + 1;
                }
                return shape;
            }

            function buildConic(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var shape = conicShape(o), R = shape.R, A = shape.A, B = shape.B, c = shape.c, p = o.p;
                var center = [o.m, o.n];
                // 표준형 좌표 → 그림 좌표(pt)
                function W(q) { var v = shape.vertical ? [q[1], q[0]] : q; return [(center[0] + v[0]) * u, (center[1] + v[1]) * u]; }
                function real(q) { var v = shape.vertical ? [q[1], q[0]] : q; return [center[0] + v[0], center[1] + v[1]]; }
                function outward(q) { var v = shape.vertical ? [q[1], q[0]] : q; return unit(v); }
                function pathOf(points) {
                    var list = [];
                    for (var i = 0; i < points.length; i++) list.push({ anchor: W(points[i].anchor), left: W(points[i].left), right: W(points[i].right) });
                    return list;
                }

                // 축: 원점과 그리는 범위가 들어가게
                var xMin = Math.floor(Math.min(0, center[0] - R)), xMax = Math.ceil(Math.max(0, center[0] + R));
                var yMin = Math.floor(Math.min(0, center[1] - R)), yMax = Math.ceil(Math.max(0, center[1] + R));
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
                        out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = yMin; ty <= yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                        out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 곡선
                var curves = conicCurves(shape);
                for (var k = 0; k < curves.length; k++) out.lines.push({ points: pathOf(curves[k].points), closed: curves[k].closed, kind: "main" });

                // 준선(포물선)·점근선(쌍곡선)
                if (o.guides && o.kind === 0) out.lines.push(straight([W([-p, -R]), W([-p, R])], "guide"));
                if (o.guides && o.kind === 2) {
                    var s = R / Math.max(A, B);
                    out.lines.push(straight([W([-A * s, -B * s]), W([A * s, B * s])], "guide"));
                    out.lines.push(straight([W([-A * s, B * s]), W([A * s, -B * s])], "guide"));
                }

                // 초점
                var foci = o.kind === 0 ? [[p, 0]] : (c > 1e-9 ? [[c, 0], [-c, 0]] : []);
                if (o.foci) {
                    var focusNames = ["F", "F′"];
                    for (var f = 0; f < foci.length; f++) {
                        out.dots.push(W(foci[f]));
                        var name = focusNames[f] + (o.coords ? pointText(real(foci[f])) : "");
                        out.texts.push({ text: name, at: W(foci[f]), dir: outward([0, -1]), upright: true });
                    }
                }
                // 꼭짓점: 포물선 V(원점이면 O라 생략), 타원 A A′ B B′, 쌍곡선 A A′
                if (o.vertices) {
                    var tips = o.kind === 0 ? [[[0, 0], "V"]] : [[[A, 0], "A"], [[-A, 0], "A′"]];
                    if (o.kind === 1) tips.push([[0, B], "B"], [[0, -B], "B′"]);
                    for (var v = 0; v < tips.length; v++) {
                        var tipReal = real(tips[v][0]);
                        if (Math.abs(tipReal[0]) < 1e-9 && Math.abs(tipReal[1]) < 1e-9) continue;
                        // 타원은 바깥쪽, 포물선은 열린 반대쪽, 쌍곡선은 두 가지 사이 쪽 (축 선을 피해 아래로 비스듬히)
                        var side = o.kind === 0 ? (p > 0 ? -1 : 1) : (tips[v][0][0] > 0 ? -1 : 1);
                        var dir = o.kind === 1 ? outward(tips[v][0]) : outward([side, -1]);
                        var label = tips[v][1] + (o.coords ? pointText(tipReal) : "");
                        out.texts.push({ text: label, at: W(tips[v][0]), dir: dir, upright: true });
                    }
                }

                // 식 글자 (그리는 범위 오른쪽 위)
                var equation = conicEquation(o);
                if (o.equation) out.texts.push({ text: equation.text, sup: equation.sup, at: [(center[0] + R) * u, (center[1] + R) * u], dir: [-0.7071, -0.7071] });
                out.notes.push(equationNote(o, shape));

                // 곡선 위의 점 P
                if (o.point) {
                    var P = pointOnConic(shape, o.angle);
                    if (P === null) out.notes.push("P가 무한히 멀어 그릴 수 없음 (θ를 바꾼다)");
                    else {
                        out.dots.push(W(P));
                        out.texts.push({ text: "P", at: W(P), dir: outward(o.kind === 0 ? [P[0] - p, P[1]] : P), upright: true });
                        if (o.focalLines) {
                            for (var fl = 0; fl < foci.length; fl++) out.lines.push(straight([W(P), W(foci[fl])], "thin"));
                            if (o.kind === 0) {
                                out.lines.push(straight([W(P), W([-p, P[1]])], "guide"));
                                out.texts.push({ text: "H", at: W([-p, P[1]]), dir: outward([p > 0 ? -1 : 1, 0]), upright: true });
                                out.notes.push("PF = PH = " + formatValue(dist(P, foci[0])));
                            } else if (o.kind === 1) {
                                var sum = foci.length === 2 ? dist(P, foci[0]) + dist(P, foci[1]) : 2 * dist(P, [0, 0]);
                                out.notes.push("PF + PF′ = " + formatValue(sum) + " (장축의 길이)");
                            } else {
                                out.notes.push("|PF - PF′| = " + formatValue(Math.abs(dist(P, foci[0]) - dist(P, foci[1]))) + " (주축의 길이)");
                            }
                        }
                        if (o.tangent) {
                            var normal = o.kind === 0 ? [-4 * p, 2 * P[1]] : (o.kind === 1 ? [P[0] / (A * A), P[1] / (B * B)] : [P[0] / (A * A), -P[1] / (B * B)]);
                            var nReal = shape.vertical ? [normal[1], normal[0]] : normal, PR = real(P);
                            var len = Math.sqrt(nReal[0] * nReal[0] + nReal[1] * nReal[1]);
                            var L = { a: nReal[0] / len, b: nReal[1] / len, c: -(nReal[0] * PR[0] + nReal[1] * PR[1]) / len };
                            var seg = clipLine(L, [center[0] - R, center[0] + R, center[1] - R, center[1] + R]);
                            if (seg !== null) out.lines.push(straight([[seg[0][0] * u, seg[0][1] * u], [seg[1][0] * u, seg[1][1] * u]], "main"));
                            out.notes.push("P" + "(" + formatValue(PR[0]) + ", " + formatValue(PR[1]) + ")에서의 접선 " + lineEquation(L));
                        }
                    }
                }
                return out;
            }

            // 표준형 곡선을 베지어로 (각 점 {anchor, left, right}, 표준형 좌표)
            function conicCurves(shape) {
                var R = shape.R, A = shape.A, B = shape.B;
                if (shape.kind === 1) {
                    var list = [], dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                    for (var i = 0; i < 4; i++) {
                        var d = dirs[i], anchor = [d[0] * A, d[1] * B], t = [-d[1] * A * KAPPA, d[0] * B * KAPPA];
                        list.push({ anchor: anchor, left: [anchor[0] - t[0], anchor[1] - t[1]], right: [anchor[0] + t[0], anchor[1] + t[1]] });
                    }
                    return [{ points: list, closed: true }];
                }
                if (shape.kind === 0) {
                    // y² = 4px, |y| ≤ h (|x| ≤ R): 이차 베지어는 3차로 정확히 옮겨진다. 제어점은 두 끝 접선이 만나는 (-x끝, 0)
                    var p = shape.p, h = Math.min(R, Math.sqrt(4 * Math.abs(p) * R));
                    var x = h * h / (4 * p), Q = [-x, 0], P0 = [x, -h], P2 = [x, h];
                    var c1 = [P0[0] + (Q[0] - P0[0]) * 2 / 3, P0[1] + (Q[1] - P0[1]) * 2 / 3];
                    var c2 = [P2[0] + (Q[0] - P2[0]) * 2 / 3, P2[1] + (Q[1] - P2[1]) * 2 / 3];
                    return [{ points: [{ anchor: P0, left: P0, right: c1 }, { anchor: P2, left: c2, right: P2 }], closed: false }];
                }
                // 쌍곡선 (A cosh s, B sinh s): |x|, |y| ≤ R까지, 16칸 에르미트
                var S = Math.min(asinh(R / B), acosh(Math.max(1, R / A)));
                var curves = [];
                for (var side = 1; side >= -1; side -= 2) {
                    var points = [], N = 16;
                    for (var k = 0; k <= N; k++) {
                        var s = -S + 2 * S * k / N, h2 = 2 * S / N / 3;
                        var pt = [side * A * cosh(s), B * sinh(s)], dv = [side * A * sinh(s), B * cosh(s)];
                        points.push({ anchor: pt, left: k > 0 ? [pt[0] - dv[0] * h2, pt[1] - dv[1] * h2] : pt, right: k < N ? [pt[0] + dv[0] * h2, pt[1] + dv[1] * h2] : pt });
                    }
                    curves.push({ points: points, closed: false });
                }
                return curves;
            }

            // 표준형에서 θ에 해당하는 곡선 위의 점. 쌍곡선에서 cos θ ≈ 0이면 null
            function pointOnConic(shape, degrees) {
                var t = degrees * Math.PI / 180;
                if (shape.kind === 1) return [shape.A * Math.cos(t), shape.B * Math.sin(t)];
                if (shape.kind === 0) {
                    if (Math.abs(Math.cos(t / 2)) < 1e-3) return null;
                    var s = Math.tan(t / 2);
                    return [shape.p * s * s, 2 * shape.p * s];
                }
                if (Math.abs(Math.cos(t)) < 0.05) return null;
                return [shape.A / Math.cos(t), shape.B * Math.tan(t)];
            }

            // 식 글자와 위첨자 위치: x2/9+y2/4=1, (x-1)2/9-(y+2)2/4=-1, y2=8x, (y-1)2=-4(x+2)
            function conicEquation(o) {
                var text = "", sup = [];
                function square(name, shift) {
                    if (Math.abs(shift) < 1e-12) text += name;
                    else text += "(" + name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift)) + ")";
                    sup.push(text.length);
                    text += "2";
                }
                function linear(name, shift) {
                    return Math.abs(shift) < 1e-12 ? name : "(" + name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift)) + ")";
                }
                if (o.kind === 0) {
                    var coef = formatValue(4 * o.p);
                    if (o.vertical) { square("x", o.m); text += "=" + (coef === "1" ? "" : (coef === "-1" ? "-" : coef)) + linear("y", o.n); }
                    else { square("y", o.n); text += "=" + (coef === "1" ? "" : (coef === "-1" ? "-" : coef)) + linear("x", o.m); }
                    return { text: text, sup: sup };
                }
                square("x", o.m);
                text += "/" + formatValue(o.a * o.a) + (o.kind === 1 ? "+" : "-");
                square("y", o.n);
                text += "/" + formatValue(o.b * o.b) + "=" + (o.kind === 2 && o.vertical ? "-1" : "1");
                return { text: text, sup: sup };
            }

            // 창에 보이는 첫 줄: 식과 초점·준선·점근선
            function equationNote(o, shape) {
                var eq = conicEquation(o), shown = "";
                for (var i = 0; i < eq.text.length; i++) {
                    var isSup = false;
                    for (var j = 0; j < eq.sup.length; j++) if (eq.sup[j] === i) isSup = true;
                    shown += isSup ? "²" : eq.text.charAt(i);
                }
                var c = shape.c, focusText;
                if (o.kind === 0) {
                    var f = shape.vertical ? [o.m, o.n + o.p] : [o.m + o.p, o.n];
                    focusText = "초점 (" + formatValue(f[0]) + ", " + formatValue(f[1]) + "), 준선 " + (shape.vertical ? "y=" + formatValue(o.n - o.p) : "x=" + formatValue(o.m - o.p));
                } else {
                    var cText = radicalText(shape.kind === 1 ? shape.A * shape.A - shape.B * shape.B : o.a * o.a + o.b * o.b);
                    focusText = "초점 " + (shape.vertical ? "(" + formatValue(o.m) + ", " + shiftText(o.n, cText) + ")" : "(" + shiftText(o.m, cText) + ", " + formatValue(o.n) + ")");
                    if (o.kind === 2) focusText += ", 점근선 기울기 ±" + formatValue(o.b / o.a);
                }
                return shown + " · " + focusText;
            }

            function pointText(realPoint) {
                return "(" + formatValue(realPoint[0]) + ", " + formatValue(realPoint[1]) + ")";
            }

            function shiftText(shift, radical) {
                return Math.abs(shift) < 1e-12 ? "±" + radical : formatValue(shift) + "±" + radical;
            }

            // √(value): 정수면 k√m으로 줄이고, 제곱수면 정수, 아니면 소수 둘째 자리
            function radicalText(value) {
                if (Math.abs(value - Math.round(value)) > 1e-9) return formatValue(Math.sqrt(value));
                var n = Math.round(value);
                if (n === 0) return "0";
                var outside = 1, inside = n;
                for (var k = 2; k * k <= inside; k++) {
                    while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
                }
                if (inside === 1) return String(outside);
                return (outside === 1 ? "" : String(outside)) + "√" + inside;
            }

            function cosh(x) { return (Math.exp(x) + Math.exp(-x)) / 2; }
            function sinh(x) { return (Math.exp(x) - Math.exp(-x)) / 2; }
            function asinh(x) { return Math.log(x + Math.sqrt(x * x + 1)); }
            function acosh(x) { return Math.log(x + Math.sqrt(x * x - 1)); }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }

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

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", kind, direction, pValue, aValue, bValue, mValue, nValue, angle, flags, unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 15 || p[9].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    direction = Math.round(restoreNumber(p[2], direction, 0, DIRECTIONS.length - 1));
                    pValue = restoreNumber(p[3], pValue, -5, 5);
                    aValue = restoreNumber(p[4], aValue, 0.5, 10);
                    bValue = restoreNumber(p[5], bValue, 0.5, 10);
                    mValue = restoreNumber(p[6], mValue, -10, 10);
                    nValue = restoreNumber(p[7], nValue, -10, 10);
                    angle = restoreNumber(p[8], angle, -180, 180);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[9].charAt(i) === "1";
                    unitMm = restoreNumber(p[10], unitMm, 2, 20);
                    fontPt = restoreNumber(p[11], fontPt, 5, 14);
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
    // ==== 이차곡선 접선 ====
    // 이차곡선의 접선 세 가지: 곡선 위의 점 P에서의 접선, 기울기가 m인 접선, 곡선 밖의 점 A에서 그은 접선.
    // 곡선은 중심(꼭짓점)이 원점인 표준형이다: 포물선 y²=4px(x²=4py), 타원 x²/a²+y²/b²=1, 쌍곡선 x²/a²-y²/b²=±1.
    // 곡선을 αx²+βy²+γx+δy+ε=0으로 두고, 점 (x₁, y₁)에서의 접선(극선) αx₁x+βy₁y+γ(x+x₁)/2+δ(y+y₁)/2+ε=0으로 세 경우를 한 식으로 푼다.
    // 기울기 m: y=mx+k를 넣은 이차방정식의 판별식이 0인 k. 밖의 점 A: A의 극선과 곡선이 만나는 두 점이 접점이다(접점을 잇는 선을 고를 수 있다).
    // 접선의 식은 y=2x±√13처럼 근호·분수로 쓰고 창에도 보여 준다. 선 두께: 축 0.4pt, 곡선·접선 0.8pt, 접점을 잇는 선 0.3pt 점선. 선택은 필요 없다.
    function makeConicTangentEngine() {
        var api = {label: "이차곡선 접선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathConicTangent/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′, √ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var THIN_PT = 0.4;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            registerHead(ARROW);
            var KAPPA = 0.5522847498;   // 타원을 베지어 4개로
            var KINDS = ["포물선", "타원", "쌍곡선"];
            var DIRECTIONS = ["가로 (y²=4px, =1)", "세로 (x²=4py, =-1)"];
            var MODES = ["곡선 위의 점 P에서", "기울기가 m인 접선", "곡선 밖의 점 A에서"];
            var TOUCH_NAMES = ["P", "Q"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["equation", "lineText", "names", "coords", "chord", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 1;
            var direction = 0;
            var pValue = 1;
            var aValue = 3, bValue = 2;
            var mode = 2;
            var angle = 60;
            var slope = 1;
            var x0Value = 4, y0Value = 3;
            var opt = { equation: true, lineText: true, names: true, coords: false, chord: false, grid: false, numbers: true };
            var unitMm = 6;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {pValue: pValue, aValue: aValue, bValue: bValue, angle: angle, slope: slope, x0Value: x0Value,
                y0Value: y0Value, unitMm: unitMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var curvePanel = addPanel(win, "곡선 (중심·꼭짓점은 원점)");
            var kindRow = curvePanel.add("group");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var directionList = kindRow.add("dropdownlist", undefined, DIRECTIONS);
            directionList.selection = direction;
            directionList.helpTip = "포물선: 가로 y²=4px, 세로 x²=4py. 쌍곡선: 가로 …=1, 세로 …=-1. 타원은 a, b 중 큰 쪽이 장축";
            var pControls = addValueRow(curvePanel, "p", "", pValue, -5, 5, 0.5, 1);
            var aControls = addValueRow(curvePanel, "a", "", aValue, 0.5, 10, 0.5, 1);
            var bControls = addValueRow(curvePanel, "b", "", bValue, 0.5, 10, 0.5, 1);

            var tangentPanel = addPanel(win, "접선");
            var modeRow = tangentPanel.add("group");
            modeRow.add("statictext", undefined, "종류:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;
            var angleControls = addValueRow(tangentPanel, "P 위치", "°", angle, -180, 180, 5, 0);
            angleControls.input.helpTip = "타원 (a cos θ, b sin θ), 쌍곡선 (a/cos θ, b tan θ), 포물선은 θ/2의 tan으로 곡선 전체를 돈다";
            var slopeControls = addValueRow(tangentPanel, "기울기 m", "", slope, -5, 5, 0.25, 2);
            var x0Controls = addValueRow(tangentPanel, "A의 x좌표", "", x0Value, -10, 10, 0.5, 1);
            var y0Controls = addValueRow(tangentPanel, "A의 y좌표", "", y0Value, -10, 10, 0.5, 1);

            var checkBoxes = {};
            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["equation", "곡선의 식"], ["lineText", "접선의 식"], ["names", "접점 P, Q"]]);
            addCheckRow(markPanel, [["coords", "좌표 함께"], ["chord", "접점을 잇는 선"]]);
            checkBoxes.chord.helpTip = "밖의 점 A에서 그은 두 접선의 접점을 점선으로 잇는다 (A의 극선)";

            var planePanel = addPanel(win, "좌표평면");
            var unitControls = addValueRow(planePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(planePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(planePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            directionList.onChange = function() { direction = directionList.selection ? directionList.selection.index : 0; updatePreview(); };
            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(pControls, function(value) { pValue = value; }, DEFAULTS.pValue);
            bindValueRow(aControls, function(value) { aValue = value; }, DEFAULTS.aValue);
            bindValueRow(bControls, function(value) { bValue = value; }, DEFAULTS.bValue);
            bindValueRow(angleControls, function(value) { angle = value; }, DEFAULTS.angle);
            bindValueRow(slopeControls, function(value) { slope = value; }, DEFAULTS.slope);
            bindValueRow(x0Controls, function(value) { x0Value = value; }, DEFAULTS.x0Value);
            bindValueRow(y0Controls, function(value) { y0Value = value; }, DEFAULTS.y0Value);
            bindValueRow(unitControls, function(value) { unitMm = value; }, DEFAULTS.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, DEFAULTS.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, DEFAULTS.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. p = 0이면 확정하지 않는다
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
                pControls.input.parent.enabled = kind === 0;
                aControls.input.parent.enabled = kind !== 0;
                bControls.input.parent.enabled = kind !== 0;
                directionList.enabled = kind !== 1;
                angleControls.input.parent.enabled = mode === 0;
                slopeControls.input.parent.enabled = mode === 1;
                x0Controls.input.parent.enabled = mode === 2;
                y0Controls.input.parent.enabled = mode === 2;
                checkBoxes.chord.enabled = mode === 2;
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                    checkBoxes[items[i][0]] = check;
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
                if (kind === 0 && Math.abs(pValue) < 1e-9) {
                    messageText.text = "포물선은 p가 0이 아니어야 함";
                    return;
                }
                var drawing = buildTangent({
                    kind: kind, vertical: direction === 1, p: pValue, a: aValue, b: bValue, mode: mode, angle: angle, slope: slope,
                    x0: x0Value, y0: y0Value, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, equation: opt.equation,
                    lineText: opt.lineText, names: opt.names, coords: opt.coords, chord: opt.chord, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "이차곡선 접선";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"main"|"thin"|"guide"|"grid"}
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
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "thin" || line.kind === "axis" ? (line.kind === "thin" ? THIN_PT : AXIS_PT) : GUIDE_PT);
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

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
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

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(′, √)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-conic-tangent.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 곡선 αx²+βy²+γx+δy+ε=0의 계수 (실제 좌표, 세로 방향 반영)
            function conicQuadratic(o) {
                if (o.kind === 0) return o.vertical ? { al: 1, be: 0, ga: 0, de: -4 * o.p, ep: 0 } : { al: 0, be: 1, ga: -4 * o.p, de: 0, ep: 0 };
                if (o.kind === 1) return { al: 1 / (o.a * o.a), be: 1 / (o.b * o.b), ga: 0, de: 0, ep: -1 };
                return { al: 1 / (o.a * o.a), be: -1 / (o.b * o.b), ga: 0, de: 0, ep: o.vertical ? 1 : -1 };
            }

            function conicValue(Q, x, y) {
                return Q.al * x * x + Q.be * y * y + Q.ga * x + Q.de * y + Q.ep;
            }

            // 점 X의 극선 (X가 곡선 위면 X에서의 접선). {a, b, c}는 ax+by+c=0, (a, b)가 단위 벡터. 선이 없으면 null
            function polarLine(Q, X) {
                return normalLine(Q.al * X[0] + Q.ga / 2, Q.be * X[1] + Q.de / 2, Q.ga * X[0] / 2 + Q.de * X[1] / 2 + Q.ep);
            }

            function normalLine(a, b, c) {
                var length = Math.sqrt(a * a + b * b);
                if (length < 1e-12) return null;
                return { a: a / length, b: b / length, c: c / length };
            }

            // 직선 L과 곡선의 교점 (0~2개, x가 작은 것부터)
            function meetLine(Q, L) {
                var p0 = [-L.a * L.c, -L.b * L.c], d = [-L.b, L.a];
                var A2 = Q.al * d[0] * d[0] + Q.be * d[1] * d[1];
                var B2 = 2 * Q.al * p0[0] * d[0] + 2 * Q.be * p0[1] * d[1] + Q.ga * d[0] + Q.de * d[1];
                var C2 = conicValue(Q, p0[0], p0[1]);
                var ts = [];
                if (Math.abs(A2) < 1e-12) {
                    if (Math.abs(B2) > 1e-12) ts.push(-C2 / B2);
                } else {
                    var D = B2 * B2 - 4 * A2 * C2;
                    if (D > 1e-12) ts.push((-B2 - Math.sqrt(D)) / (2 * A2), (-B2 + Math.sqrt(D)) / (2 * A2));
                    else if (D > -1e-12) ts.push(-B2 / (2 * A2));
                }
                var points = [];
                for (var i = 0; i < ts.length; i++) points.push([p0[0] + d[0] * ts[i], p0[1] + d[1] * ts[i]]);
                points.sort(function(u, v) { return u[0] - v[0] || u[1] - v[1]; });
                return points;
            }

            // 기울기 m인 접선 y=mx+k의 k와 접점. y=mx+k를 넣은 x의 이차식의 판별식이 0인 k를 푼다
            function slopeTangents(Q, m) {
                var A2 = Q.al + Q.be * m * m;
                if (Math.abs(A2) < 1e-12) return [];   // 포물선의 축·쌍곡선의 점근선과 나란한 직선은 한 점에서 만나기만 한다
                var qa = -4 * Q.al * Q.be, qb = 4 * Q.be * m * Q.ga - 4 * Q.al * Q.de;
                var qc = (Q.ga + Q.de * m) * (Q.ga + Q.de * m) - 4 * A2 * Q.ep;
                var ks = [];
                if (Math.abs(qa) < 1e-12) {
                    if (Math.abs(qb) > 1e-12) ks.push(-qc / qb);
                } else {
                    var D = qb * qb - 4 * qa * qc;
                    if (D > 1e-12) ks.push((-qb + Math.sqrt(D)) / (2 * qa), (-qb - Math.sqrt(D)) / (2 * qa));
                    else if (D > -1e-12) ks.push(-qb / (2 * qa));
                }
                ks.sort(function(u, v) { return v - u; });
                var list = [];
                for (var i = 0; i < ks.length; i++) {
                    var x = -(2 * Q.be * m * ks[i] + Q.ga + Q.de * m) / (2 * A2);
                    list.push({ k: ks[i], touch: [x, m * x + ks[i]] });
                }
                return list;
            }

            function buildTangent(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [], tangents: [] };
                var shape = conicShape(o), R = shape.R, Q = conicQuadratic(o);
                function W(q) { var v = shape.vertical ? [q[1], q[0]] : q; return [v[0] * u, v[1] * u]; }
                function S(q) { return [q[0] * u, q[1] * u]; }
                function real(q) { return shape.vertical ? [q[1], q[0]] : q; }
                function pathOf(points) {
                    var list = [];
                    for (var i = 0; i < points.length; i++) list.push({ anchor: W(points[i].anchor), left: W(points[i].left), right: W(points[i].right) });
                    return list;
                }

                // 축: 곡선과 점 A가 들어가게
                var A = [o.x0, o.y0];
                var xMin = -R, xMax = R, yMin = -R, yMax = R;
                if (o.mode === 2) {
                    xMin = Math.min(xMin, A[0] - 1); xMax = Math.max(xMax, A[0] + 1);
                    yMin = Math.min(yMin, A[1] - 1); yMax = Math.max(yMax, A[1] + 1);
                }
                xMin = Math.floor(xMin); xMax = Math.ceil(xMax); yMin = Math.floor(yMin); yMax = Math.ceil(yMax);
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
                        out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = yMin; ty <= yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                        out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 곡선과 식
                var curves = conicCurves(shape);
                for (var k = 0; k < curves.length; k++) out.lines.push({ points: pathOf(curves[k].points), closed: curves[k].closed, kind: "main" });
                var origin = { kind: o.kind, vertical: o.vertical, p: o.p, a: o.a, b: o.b, m: 0, n: 0 };
                var equation = conicEquation(origin);
                if (o.equation) out.texts.push({ text: equation.text, sup: equation.sup, at: [R * u, R * u], dir: [-0.7071, -0.7071] });
                out.notes.push(equationNote(origin, shape));

                // 접선 목록 {line, touch}
                var tangents = [], summary = "";
                if (o.mode === 0) {
                    var P = pointOnConic(shape, o.angle);
                    if (P === null) out.notes.push("P가 무한히 멀어 그릴 수 없음 (θ를 바꾼다)");
                    else {
                        var PR = real(P);
                        tangents.push({ line: polarLine(Q, PR), touch: PR });
                        summary = "P" + pointText(PR) + "에서의 접선: ";
                    }
                } else if (o.mode === 1) {
                    var list = slopeTangents(Q, o.slope);
                    for (var s = 0; s < list.length; s++) tangents.push({ line: normalLine(o.slope, -1, list[s].k), touch: list[s].touch });
                    summary = "기울기 " + numText(o.slope) + "인 접선: ";
                    if (list.length === 0) out.notes.push("기울기가 " + numText(o.slope) + "인 접선은 없음");
                } else {
                    out.dots.push(S(A));
                    out.texts.push({ text: "A" + (o.coords ? pointText(A) : ""), at: S(A), dir: unit(A), upright: true });
                    var g = conicValue(Q, A[0], A[1]);
                    if (Math.abs(g) < 1e-9) {
                        tangents.push({ line: polarLine(Q, A), touch: A });
                        out.notes.push("A가 곡선 위에 있어 A에서의 접선 하나");
                    } else {
                        var polar = polarLine(Q, A), touches = polar === null ? [] : meetLine(Q, polar);
                        for (var m = 0; m < touches.length; m++) tangents.push({ line: normalLine(touches[m][1] - A[1], A[0] - touches[m][0], touches[m][0] * A[1] - A[0] * touches[m][1]), touch: touches[m] });
                        if (touches.length === 0) out.notes.push("A에서 그은 접선은 없음 (A가 곡선 안쪽)");
                        if (o.chord && touches.length === 2) out.lines.push(straight([S(touches[0]), S(touches[1])], "guide"));
                    }
                    summary = "A" + pointText(A) + "에서 그은 접선: ";
                }

                // 접선: 그림 범위 끝까지, 식 글자는 오른쪽 끝에. 접점은 점과 P, Q
                var box = [xMin, xMax, yMin, yMax], texts = [], touchNotes = [];
                for (var t = 0; t < tangents.length; t++) {
                    var L = tangents[t].line, T = tangents[t].touch;
                    if (L === null) continue;
                    var seg = clipLine(L, box), eq = lineText(L);
                    texts.push(eq);
                    out.tangents.push({ line: L, touch: T, text: eq });
                    if (seg !== null) {
                        out.lines.push(straight([S(seg[0]), S(seg[1])], "main"));
                        if (o.lineText) out.texts.push({ text: eq, at: S(seg[1]), dir: unit([seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]]) });
                    }
                    if (o.mode === 2 && Math.abs(T[0] - A[0]) < 1e-9 && Math.abs(T[1] - A[1]) < 1e-9) continue;
                    out.dots.push(S(T));
                    var name = tangents.length === 1 ? "P" : TOUCH_NAMES[t];
                    touchNotes.push(name + pointText(T));
                    if (o.names) {
                        var grad = [2 * Q.al * T[0] + Q.ga, 2 * Q.be * T[1] + Q.de];
                        out.texts.push({ text: name + (o.coords ? pointText(T) : ""), at: S(T), dir: unit(grad), upright: true });
                    }
                }
                if (texts.length > 0) out.notes.push(summary + texts.join(", "));
                if (touchNotes.length > 0 && o.mode !== 0) out.notes.push("접점 " + touchNotes.join(", "));
                return out;
            }

            // ax+by+c=0 → y=2x+√13, y=-x/2… 대신 y=-(1/2)x+3, x=3. 계수는 정수·분수·근호로 쓸 수 있으면 그렇게
            function lineText(L) {
                if (Math.abs(L.b) < 1e-12) return "x=" + signedText(-L.c / L.a);
                var m = -L.a / L.b, k = -L.c / L.b, text = "y=";
                if (Math.abs(m) > 1e-9) {
                    var mText = numText(Math.abs(m));
                    text += (m < 0 ? "-" : "") + (mText === "1" ? "" : (mText.indexOf("/") >= 0 ? "(" + mText + ")" : mText)) + "x";
                    if (Math.abs(k) > 1e-9) text += (k < 0 ? "-" : "+") + numText(Math.abs(k));
                    return text;
                }
                return text + signedText(k);
            }

            function signedText(v) {
                return (v < -1e-9 ? "-" : "") + numText(Math.abs(v));
            }

            // 0 이상의 수: 정수, 분수(분모 6까지), 근호(√13, 2√10, √13/2), 아니면 소수 둘째 자리
            function numText(v) {
                if (v < 0) return "-" + numText(-v);
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) < 1e-9) return q === 1 ? String(p) : p + "/" + q;
                }
                for (var d = 1; d <= 6; d++) {
                    var n = Math.round(v * v * d * d);
                    if (n > 0 && Math.abs(n - v * v * d * d) < 1e-6) return radicalText(n) + (d === 1 ? "" : "/" + d);
                }
                return formatValue(v);
            }

            // -------------------------------------------------------
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-conic.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 표준형(주축 가로, 중심 원점)의 모양: A(주축 쪽), B, c(초점), R(그리는 반폭), 세로인지
            function conicShape(o) {
                var shape = { kind: o.kind, vertical: o.vertical, A: 0, B: 0, c: 0, p: o.p };
                if (o.kind === 0) {
                    shape.c = o.p;
                    shape.R = Math.ceil(Math.abs(o.p) * 3) + 1;
                } else if (o.kind === 1) {
                    shape.vertical = o.b > o.a;
                    shape.A = Math.max(o.a, o.b);
                    shape.B = Math.min(o.a, o.b);
                    shape.c = Math.sqrt(shape.A * shape.A - shape.B * shape.B);
                    shape.R = Math.ceil(shape.A) + 1;
                } else {
                    shape.A = o.vertical ? o.b : o.a;
                    shape.B = o.vertical ? o.a : o.b;
                    shape.c = Math.sqrt(o.a * o.a + o.b * o.b);
                    shape.R = Math.ceil(Math.max(shape.c, shape.B) * 1.5) + 1;
                }
                return shape;
            }

            // 표준형 곡선을 베지어로 (각 점 {anchor, left, right}, 표준형 좌표)
            function conicCurves(shape) {
                var R = shape.R, A = shape.A, B = shape.B;
                if (shape.kind === 1) {
                    var list = [], dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                    for (var i = 0; i < 4; i++) {
                        var d = dirs[i], anchor = [d[0] * A, d[1] * B], t = [-d[1] * A * KAPPA, d[0] * B * KAPPA];
                        list.push({ anchor: anchor, left: [anchor[0] - t[0], anchor[1] - t[1]], right: [anchor[0] + t[0], anchor[1] + t[1]] });
                    }
                    return [{ points: list, closed: true }];
                }
                if (shape.kind === 0) {
                    // y² = 4px, |y| ≤ h (|x| ≤ R): 이차 베지어는 3차로 정확히 옮겨진다. 제어점은 두 끝 접선이 만나는 (-x끝, 0)
                    var p = shape.p, h = Math.min(R, Math.sqrt(4 * Math.abs(p) * R));
                    var x = h * h / (4 * p), Q = [-x, 0], P0 = [x, -h], P2 = [x, h];
                    var c1 = [P0[0] + (Q[0] - P0[0]) * 2 / 3, P0[1] + (Q[1] - P0[1]) * 2 / 3];
                    var c2 = [P2[0] + (Q[0] - P2[0]) * 2 / 3, P2[1] + (Q[1] - P2[1]) * 2 / 3];
                    return [{ points: [{ anchor: P0, left: P0, right: c1 }, { anchor: P2, left: c2, right: P2 }], closed: false }];
                }
                // 쌍곡선 (A cosh s, B sinh s): |x|, |y| ≤ R까지, 16칸 에르미트
                var S = Math.min(asinh(R / B), acosh(Math.max(1, R / A)));
                var curves = [];
                for (var side = 1; side >= -1; side -= 2) {
                    var points = [], N = 16;
                    for (var k = 0; k <= N; k++) {
                        var s = -S + 2 * S * k / N, h2 = 2 * S / N / 3;
                        var pt = [side * A * cosh(s), B * sinh(s)], dv = [side * A * sinh(s), B * cosh(s)];
                        points.push({ anchor: pt, left: k > 0 ? [pt[0] - dv[0] * h2, pt[1] - dv[1] * h2] : pt, right: k < N ? [pt[0] + dv[0] * h2, pt[1] + dv[1] * h2] : pt });
                    }
                    curves.push({ points: points, closed: false });
                }
                return curves;
            }

            // 표준형에서 θ에 해당하는 곡선 위의 점. 쌍곡선에서 cos θ ≈ 0이면 null
            function pointOnConic(shape, degrees) {
                var t = degrees * Math.PI / 180;
                if (shape.kind === 1) return [shape.A * Math.cos(t), shape.B * Math.sin(t)];
                if (shape.kind === 0) {
                    if (Math.abs(Math.cos(t / 2)) < 1e-3) return null;
                    var s = Math.tan(t / 2);
                    return [shape.p * s * s, 2 * shape.p * s];
                }
                if (Math.abs(Math.cos(t)) < 0.05) return null;
                return [shape.A / Math.cos(t), shape.B * Math.tan(t)];
            }

            // 식 글자와 위첨자 위치: x2/9+y2/4=1, (x-1)2/9-(y+2)2/4=-1, y2=8x, (y-1)2=-4(x+2)
            function conicEquation(o) {
                var text = "", sup = [];
                function square(name, shift) {
                    if (Math.abs(shift) < 1e-12) text += name;
                    else text += "(" + name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift)) + ")";
                    sup.push(text.length);
                    text += "2";
                }
                function linear(name, shift) {
                    return Math.abs(shift) < 1e-12 ? name : "(" + name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift)) + ")";
                }
                if (o.kind === 0) {
                    var coef = formatValue(4 * o.p);
                    if (o.vertical) { square("x", o.m); text += "=" + (coef === "1" ? "" : (coef === "-1" ? "-" : coef)) + linear("y", o.n); }
                    else { square("y", o.n); text += "=" + (coef === "1" ? "" : (coef === "-1" ? "-" : coef)) + linear("x", o.m); }
                    return { text: text, sup: sup };
                }
                square("x", o.m);
                text += "/" + formatValue(o.a * o.a) + (o.kind === 1 ? "+" : "-");
                square("y", o.n);
                text += "/" + formatValue(o.b * o.b) + "=" + (o.kind === 2 && o.vertical ? "-1" : "1");
                return { text: text, sup: sup };
            }

            // 창에 보이는 첫 줄: 식과 초점·준선·점근선
            function equationNote(o, shape) {
                var eq = conicEquation(o), shown = "";
                for (var i = 0; i < eq.text.length; i++) {
                    var isSup = false;
                    for (var j = 0; j < eq.sup.length; j++) if (eq.sup[j] === i) isSup = true;
                    shown += isSup ? "²" : eq.text.charAt(i);
                }
                var c = shape.c, focusText;
                if (o.kind === 0) {
                    var f = shape.vertical ? [o.m, o.n + o.p] : [o.m + o.p, o.n];
                    focusText = "초점 (" + formatValue(f[0]) + ", " + formatValue(f[1]) + "), 준선 " + (shape.vertical ? "y=" + formatValue(o.n - o.p) : "x=" + formatValue(o.m - o.p));
                } else {
                    var cText = radicalText(shape.kind === 1 ? shape.A * shape.A - shape.B * shape.B : o.a * o.a + o.b * o.b);
                    focusText = "초점 " + (shape.vertical ? "(" + formatValue(o.m) + ", " + shiftText(o.n, cText) + ")" : "(" + shiftText(o.m, cText) + ", " + formatValue(o.n) + ")");
                    if (o.kind === 2) focusText += ", 점근선 기울기 ±" + formatValue(o.b / o.a);
                }
                return shown + " · " + focusText;
            }

            function pointText(realPoint) {
                return "(" + formatValue(realPoint[0]) + ", " + formatValue(realPoint[1]) + ")";
            }

            function shiftText(shift, radical) {
                return Math.abs(shift) < 1e-12 ? "±" + radical : formatValue(shift) + "±" + radical;
            }

            // √(value): 정수면 k√m으로 줄이고, 제곱수면 정수, 아니면 소수 둘째 자리
            function radicalText(value) {
                if (Math.abs(value - Math.round(value)) > 1e-9) return formatValue(Math.sqrt(value));
                var n = Math.round(value);
                if (n === 0) return "0";
                var outside = 1, inside = n;
                for (var k = 2; k * k <= inside; k++) {
                    while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
                }
                if (inside === 1) return String(outside);
                return (outside === 1 ? "" : String(outside)) + "√" + inside;
            }

            function cosh(x) { return (Math.exp(x) + Math.exp(-x)) / 2; }
            function sinh(x) { return (Math.exp(x) - Math.exp(-x)) / 2; }
            function asinh(x) { return Math.log(x + Math.sqrt(x * x + 1)); }
            function acosh(x) { return Math.log(x + Math.sqrt(x * x - 1)); }

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

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", kind, direction, pValue, aValue, bValue, mode, angle, slope, x0Value, y0Value, flags, unitMm, fontPt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 17 || p[11].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    direction = Math.round(restoreNumber(p[2], direction, 0, DIRECTIONS.length - 1));
                    pValue = restoreNumber(p[3], pValue, -5, 5);
                    aValue = restoreNumber(p[4], aValue, 0.5, 10);
                    bValue = restoreNumber(p[5], bValue, 0.5, 10);
                    mode = Math.round(restoreNumber(p[6], mode, 0, MODES.length - 1));
                    angle = restoreNumber(p[7], angle, -180, 180);
                    slope = restoreNumber(p[8], slope, -5, 5);
                    x0Value = restoreNumber(p[9], x0Value, -10, 10);
                    y0Value = restoreNumber(p[10], y0Value, -10, 10);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[11].charAt(i) === "1";
                    unitMm = restoreNumber(p[12], unitMm, 2, 20);
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
    // ==== 벡터 ====
    // 평면벡터: a⃗=(a₁, a₂), b⃗=(b₁, b₂)를 원점에서 그리고, a⃗+b⃗(평행사변형·꼬리에 머리), a⃗-b⃗, ka⃗+lb⃗ 중 하나를 더한다.
    // 사잇각 θ(호), a⃗의 b⃗ 위로의 정사영(수선과 직각 표시), 성분(축까지 점선), 점 이름 O·A·B·C, 좌표축·격자를 고른다.
    // 벡터 글자는 글자 위에 작은 화살표를 직접 그린다(글꼴에 결합 화살표가 없어도 된다). 크기·내적·사잇각은 창에 보여 준다.
    // 선 두께: 벡터 0.8pt, 보조 벡터(ka⃗, lb⃗) 0.4pt, 축 0.4pt, 점선·호·직각 표시 0.3pt. 선택은 필요 없다.
    function makeVectorEngine() {
        var api = {label: "벡터", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathVector/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(θ)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var THIN_PT = 0.4;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.5;
            var RIGHT_MARK_MM = 1.5;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            registerHead(ARROW);
            var VECTOR_ARROW = { length: 3.2, halfWidth: 1.2, notch: 0.8 };
            registerHead(VECTOR_ARROW);
            var OVER_ARROW = { length: 1.4, halfWidth: 0.55, notch: 0.3 };   // 글자 위 화살표
            var OPERATIONS = ["a, b만", "a+b (평행사변형)", "a+b (꼬리에 머리)", "a-b", "ka+lb"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["angle", "projection", "components", "points", "axes", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var a1 = 3, a2 = 1, b1 = 1, b2 = 2;
            var operation = 1;
            var kValue = 2, lValue = -1;
            var opt = { angle: true, projection: false, components: false, points: false, axes: true, grid: false, numbers: true };
            var unitMm = 8;
            var fontPt = 9;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {a1: a1, a2: a2, b1: b1, b2: b2, kValue: kValue, lValue: lValue, unitMm: unitMm, fontPt: fontPt,
                offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var vectorPanel = addPanel(win, "벡터");
            var a1Controls = addValueRow(vectorPanel, "a 성분 x", "", a1, -10, 10, 0.5, 1);
            var a2Controls = addValueRow(vectorPanel, "a 성분 y", "", a2, -10, 10, 0.5, 1);
            var b1Controls = addValueRow(vectorPanel, "b 성분 x", "", b1, -10, 10, 0.5, 1);
            var b2Controls = addValueRow(vectorPanel, "b 성분 y", "", b2, -10, 10, 0.5, 1);
            var operationRow = vectorPanel.add("group");
            operationRow.add("statictext", undefined, "연산:");
            var operationList = operationRow.add("dropdownlist", undefined, OPERATIONS);
            operationList.selection = operation;
            var kControls = addValueRow(vectorPanel, "k", "", kValue, -5, 5, 0.5, 1);
            var lControls = addValueRow(vectorPanel, "l", "", lValue, -5, 5, 0.5, 1);

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["angle", "사잇각 θ"], ["projection", "a의 b 위 정사영"], ["components", "성분 점선"]]);
            addCheckRow(markPanel, [["points", "점 O, A, B, C"], ["axes", "좌표축"], ["grid", "격자"]]);
            addCheckRow(markPanel, [["numbers", "눈금 숫자"]]);
            var unitControls = addValueRow(markPanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(markPanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            bindValueRow(a1Controls, function(value) { a1 = value; }, DEFAULTS.a1);
            bindValueRow(a2Controls, function(value) { a2 = value; }, DEFAULTS.a2);
            bindValueRow(b1Controls, function(value) { b1 = value; }, DEFAULTS.b1);
            bindValueRow(b2Controls, function(value) { b2 = value; }, DEFAULTS.b2);
            operationList.onChange = function() {
                operation = operationList.selection ? operationList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(kControls, function(value) { kValue = value; }, DEFAULTS.kValue);
            bindValueRow(lControls, function(value) { lValue = value; }, DEFAULTS.lValue);
            bindValueRow(unitControls, function(value) { unitMm = value; }, DEFAULTS.unitMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, DEFAULTS.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, DEFAULTS.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 영벡터면 확정하지 않는다
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
                kControls.input.parent.enabled = operation === 4;
                lControls.input.parent.enabled = operation === 4;
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
                if ((a1 === 0 && a2 === 0) || (b1 === 0 && b2 === 0)) {
                    messageText.text = "a, b는 영벡터가 아니어야 함";
                    return;
                }
                var drawing = buildVectors({
                    a: [a1, a2], b: [b1, b2], operation: operation, k: kValue, l: lValue, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    mark: RIGHT_MARK_MM * MM_TO_PT, angle: opt.angle, projection: opt.projection, components: opt.components, points: opt.points,
                    axes: opt.axes, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "벡터";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"main"|"thin"|"guide"|"mark"|"grid"}
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
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "thin" ? THIN_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양). shape: 축·벡터·글자 위 화살표
            function addArrow(arrow) {
                var shape = arrow.shape === "vector" ? VECTOR_ARROW : (arrow.shape === "over" ? OVER_ARROW : ARROW);
                var head = headShapeFor(arrow.tip, arrow.dir, shape, arrow.scale || 1);
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

            // 글자: {text 또는 parts:[{text, vector}], at, dir, clear, upright}. parts면 조각마다 글상자를 만들어 한 줄로 잇고,
            // vector인 조각(a, b) 위에 작은 화살표를 그린다. at에서 dir 쪽으로 간격을 두고 전체의 가까운 가장자리가 오게 둔다
            function addLabel(label) {
                var parts = label.parts || [{ text: label.text, vector: false }];
                var itemsBefore = previewGroup.pageItems.length;
                var frames = [], x = 0;
                for (var i = 0; i < parts.length; i++) {
                    var frame = previewGroup.textFrames.add();
                    frame.contents = parts[i].text;
                    var attributes = frame.textRange.characterAttributes;
                    attributes.size = fontPt;
                    attributes.fillColor = makeGray(100);
                    applyTextFonts(frame, label.upright);
                    var fb = frame.geometricBounds;
                    frame.translate(x - fb[0], 0);
                    x += fb[2] - fb[0] + fontPt * 0.05;
                    frames.push(frame);
                }
                var left = Infinity, top = -Infinity, right = -Infinity, bottom = Infinity;
                for (var f = 0; f < frames.length; f++) {
                    var b = frames[f].geometricBounds;
                    left = Math.min(left, b[0]); top = Math.max(top, b[1]); right = Math.max(right, b[2]); bottom = Math.min(bottom, b[3]);
                }
                var hasArrow = false;
                for (var v = 0; v < parts.length; v++) if (parts[v].vector) hasArrow = true;
                var arrowRise = hasArrow ? fontPt * 0.28 : 0;
                var halfW = (right - left) / 2, halfH = (top + arrowRise - bottom) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var cx = label.at[0] + dir[0] * reach, cy = label.at[1] + dir[1] * reach;
                var dx = cx + (frames.length === 1 ? negativeNumberShift(frames[0], dir) : 0) - (left + right) / 2, dy = cy - (bottom + top + arrowRise) / 2;
                for (var m = 0; m < frames.length; m++) {
                    frames[m].translate(dx, dy);
                    if (!parts[m].vector) continue;
                    // 글자 위 화살표: 글자 폭의 가운데 80%, 윗변에서 조금 위
                    var fb2 = frames[m].geometricBounds, w = fb2[2] - fb2[0];
                    var y = top + dy + fontPt * 0.12, x0 = fb2[0] + w * 0.1, x1 = fb2[2] - w * 0.02 + fontPt * 0.1;
                    var scale = fontPt / 9;
                    addPath({ points: [plain([x0, y]), plain([x1 - OVER_ARROW.length * scale + OVER_ARROW.notch * scale, y])], kind: "mark" });
                    addArrow({ tip: [x1, y], dir: [1, 0], shape: "over", scale: scale });
                }
                // 글자 여러 개·화살표로 된 라벨은 한 그룹으로 묶어 겹침 풀기(untangleLabels)가 한 덩어리로 옮기게 한다
                var made = previewGroup.pageItems.length - itemsBefore;
                if (made > 1) {
                    var holder = previewGroup.groupItems.add();
                    for (var k = made; k >= 1; k--) previewGroup.pageItems[k].move(holder, ElementPlacement.PLACEATEND);
                    label.item = holder;
                }
            }

            function plain(p) { return { anchor: p, left: p, right: p }; }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(θ)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-vector.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function buildVectors(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var A = o.a, B = o.b, O = [0, 0];
                function S(p) { return [p[0] * u, p[1] * u]; }
                var drawn = [];   // [from, to, kind, parts]
                var vA = [{ text: "a", vector: true }], vB = [{ text: "b", vector: true }];

                if (o.operation === 0) {
                    drawn.push([O, A, "main", vA], [O, B, "main", vB]);
                } else if (o.operation === 1) {
                    var C = add(A, B);
                    drawn.push([O, A, "main", vA], [O, B, "main", vB], [O, C, "main", vA.concat([{ text: "+" }], vB)]);
                    out.lines.push(straight([S(A), S(C)], "guide"), straight([S(B), S(C)], "guide"));
                } else if (o.operation === 2) {
                    var C2 = add(A, B);
                    drawn.push([O, A, "main", vA], [A, C2, "main", vB], [O, C2, "main", vA.concat([{ text: "+" }], vB)]);
                } else if (o.operation === 3) {
                    drawn.push([O, A, "main", vA], [O, B, "main", vB], [B, A, "main", vA.concat([{ text: "-" }], vB)]);
                } else {
                    var kA = scale(A, o.k), lB = scale(B, o.l), R = add(kA, lB);
                    drawn.push([O, A, "main", vA], [O, B, "main", vB]);
                    if (o.k !== 0 && o.k !== 1) drawn.push([O, kA, "thin", [{ text: coefText(o.k) }].concat(vA)]);
                    if (o.l !== 0 && o.l !== 1) drawn.push([O, lB, "thin", [{ text: coefText(o.l) }].concat(vB)]);
                    if (o.k !== 0 && o.l !== 0) out.lines.push(straight([S(kA), S(R)], "guide"), straight([S(lB), S(R)], "guide"));
                    if (Math.abs(R[0]) + Math.abs(R[1]) > 1e-9) drawn.push([O, R, "main", combinationParts(o.k, o.l)]);
                }

                // 좌표축: 모든 끝점과 원점이 들어가게
                var xs = [0], ys = [0];
                for (var i = 0; i < drawn.length; i++) { xs.push(drawn[i][0][0], drawn[i][1][0]); ys.push(drawn[i][0][1], drawn[i][1][1]); }
                var xMin = Math.floor(Math.min.apply(null, xs)) - 1, xMax = Math.ceil(Math.max.apply(null, xs)) + 1;
                var yMin = Math.floor(Math.min.apply(null, ys)) - 1, yMax = Math.ceil(Math.max.apply(null, ys)) + 1;
                if (o.axes) {
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
                    if (o.numbers) {
                        for (var tx = xMin; tx <= xMax; tx++) {
                            if (tx === 0) continue;
                            out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                            out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                        }
                        for (var ty = yMin; ty <= yMax; ty++) {
                            if (ty === 0) continue;
                            out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                            out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                        }
                    }
                }

                // 성분 점선 (원점에서 그린 a, b)
                if (o.components) {
                    var tips = [A, B];
                    for (var c = 0; c < tips.length; c++) {
                        if (tips[c][1] !== 0) out.lines.push(straight([S(tips[c]), S([tips[c][0], 0])], "guide"));
                        if (tips[c][0] !== 0) out.lines.push(straight([S(tips[c]), S([0, tips[c][1]])], "guide"));
                    }
                }

                // 사잇각 θ: 원점에서 a, b 사이 작은 호
                var theta = Math.acos(clampValue(dot(A, B) / (len(A) * len(B)), -1, 1));
                if (o.angle && theta > 1e-6) {
                    var r = Math.min(len(A), len(B), 2) * 0.3 * u, start = Math.atan2(A[1], A[0]), end = Math.atan2(B[1], B[0]);
                    var sweep = end - start;
                    while (sweep > Math.PI) sweep -= 2 * Math.PI;
                    while (sweep < -Math.PI) sweep += 2 * Math.PI;
                    out.lines.push({ points: arcPoints([0, 0], r, start, sweep), kind: "mark" });
                    var mid = start + sweep / 2;
                    out.texts.push({ text: "θ", at: [r * Math.cos(mid), r * Math.sin(mid)], dir: [Math.cos(mid), Math.sin(mid)] });
                }

                // 정사영: a의 b 위로의 정사영. 발 H, 수선(점선), 직각 표시, 정사영 벡터(0.4pt)
                if (o.projection) {
                    var H = scale(B, dot(A, B) / dot(B, B));
                    if (len(sub(A, H)) > 1e-9) {
                        out.lines.push(straight([S(A), S(H)], "guide"));
                        var along = unit(B), up = unit(sub(A, H)), s = o.mark;
                        var h = S(H);
                        out.lines.push(straight([[h[0] + along[0] * s, h[1] + along[1] * s], [h[0] + (along[0] + up[0]) * s, h[1] + (along[1] + up[1]) * s], [h[0] + up[0] * s, h[1] + up[1] * s]], "mark"));
                    }
                    if (len(H) > 1e-9) drawn.push([O, H, "thin", null]);
                    out.notes.push("정사영의 길이 |a|cos θ = " + formatValue(dot(A, B) / len(B)));
                }

                // 벡터: 선은 화살촉 뒤에서 끝낸다. 이름은 가운데에서 수직으로, 모든 끝점의 무게중심에서 먼 쪽
                var G = [0, 0];
                for (var gi = 0; gi < drawn.length; gi++) G = add(G, scale(S(drawn[gi][1]), 1 / drawn.length));
                for (var v = 0; v < drawn.length; v++) {
                    var from = S(drawn[v][0]), to = S(drawn[v][1]), d = unit(sub(to, from));
                    var cut = VECTOR_ARROW.length - VECTOR_ARROW.notch;
                    out.lines.push(straight([from, [to[0] - d[0] * cut, to[1] - d[1] * cut]], drawn[v][2]));
                    out.arrows.push({ tip: to, dir: d, shape: "vector" });
                    if (drawn[v][3]) {
                        var midpoint = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
                        var normal = [-d[1], d[0]];
                        if (dot(normal, sub(midpoint, G)) < 0) normal = [d[1], -d[0]];
                        out.texts.push({ parts: drawn[v][3], at: midpoint, dir: normal });
                    }
                }

                // 점 이름 O, A, B, C
                if (o.points) {
                    out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                    out.texts.push({ text: "A", at: S(A), dir: unit(A), upright: true });
                    out.texts.push({ text: "B", at: S(B), dir: unit(B), upright: true });
                    if (o.operation === 1 || o.operation === 2) out.texts.push({ text: "C", at: S(add(A, B)), dir: unit(add(A, B)), upright: true });
                } else if (o.axes) {
                    out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                }

                out.notes.unshift("|a| = " + formatValue(len(A)) + ", |b| = " + formatValue(len(B)) + ", a·b = " + formatValue(dot(A, B)) +
                    ", θ = " + formatValue(theta * 180 / Math.PI) + "°");
                if (o.operation === 1 || o.operation === 2) out.notes.splice(1, 0, "a+b = " + pairText(add(A, B)) + ", |a+b| = " + formatValue(len(add(A, B))));
                if (o.operation === 3) out.notes.splice(1, 0, "a-b = " + pairText(sub(A, B)) + ", |a-b| = " + formatValue(len(sub(A, B))));
                if (o.operation === 4) {
                    var result = add(scale(A, o.k), scale(B, o.l));
                    out.notes.splice(1, 0, coefText(o.k) + "a" + (o.l < 0 ? "-" : "+") + coefText(Math.abs(o.l)) + "b = " + pairText(result) + ", 크기 " + formatValue(len(result)));
                }
                return out;
            }

            // 2a-b, -a+3b … 글자 조각
            function combinationParts(k, l) {
                var parts = [];
                if (k !== 0) parts.push({ text: coefText(k) }, { text: "a", vector: true });
                if (l !== 0) parts.push({ text: (l < 0 ? "-" : (k !== 0 ? "+" : "")) + coefText(Math.abs(l)) }, { text: "b", vector: true });
                var cleaned = [];
                for (var i = 0; i < parts.length; i++) if (parts[i].text !== "") cleaned.push(parts[i]);
                return cleaned;
            }

            // 계수 글자: 1은 비우고 -1은 -
            function coefText(k) {
                var text = formatValue(k);
                return text === "1" ? "" : (text === "-1" ? "-" : text);
            }

            // 원 위 호 (반시계 sweep, 90°마다 나눈 베지어)
            function arcPoints(c, r, start, sweep) {
                var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2))), step = sweep / pieces;
                var k = 4 / 3 * Math.tan(step / 4), out = [];
                for (var i = 0; i <= pieces; i++) {
                    var t = start + step * i, p = [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)], d = [-Math.sin(t) * r * k, Math.cos(t) * r * k];
                    out.push({ anchor: p, left: i > 0 ? [p[0] - d[0], p[1] - d[1]] : p, right: i < pieces ? [p[0] + d[0], p[1] + d[1]] : p });
                }
                return out;
            }

            function pairText(p) { return "(" + formatValue(p[0]) + ", " + formatValue(p[1]) + ")"; }
            function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function scale(a, k) { return [a[0] * k, a[1] * k]; }
            function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
            function len(a) { return Math.sqrt(dot(a, a)); }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }
            function clampValue(value, minimum, maximum) {
                return value < minimum ? minimum : (value > maximum ? maximum : value);
            }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", a1, a2, b1, b2, operation, kValue, lValue, flags, unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14 || p[8].length !== FLAG_KEYS.length) return;
                try {
                    a1 = restoreNumber(p[1], a1, -10, 10);
                    a2 = restoreNumber(p[2], a2, -10, 10);
                    b1 = restoreNumber(p[3], b1, -10, 10);
                    b2 = restoreNumber(p[4], b2, -10, 10);
                    operation = Math.round(restoreNumber(p[5], operation, 0, OPERATIONS.length - 1));
                    kValue = restoreNumber(p[6], kValue, -5, 5);
                    lValue = restoreNumber(p[7], lValue, -5, 5);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[8].charAt(i) === "1";
                    unitMm = restoreNumber(p[9], unitMm, 2, 20);
                    fontPt = restoreNumber(p[10], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[11], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[12], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[13] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 공간도형 ====
    // 공간도형(기하): 평면을 평행사변형으로 보는 사투상(깊이 방향 0.5배, 30°)으로 세 가지 그림을 그린다.
    // - 정사영: 평면 α 위의 선분 AB와 정사영 A′B′, 수선 AA′·BB′(점선), A에서 A′B′에 평행한 보조선과 각 θ. A′B′ = AB cos θ
    // - 삼수선 정리: 평면 밖의 점 P, 수선의 발 H, 평면 위의 직선 l, H에서 l에 내린 수선의 발 M, 직각 표시 (PH⊥α, HM⊥l → PM⊥l)
    // - 두 평면이 이루는 각: 교선 l에서 만나는 평면 α, β, l에 수직인 두 선분과 각 θ, β 위의 점을 α로 내린 정사영(선택)
    // 직각 표시는 3차원에서 만든 작은 정사각형을 투상해 기울기가 맞다. 길이는 mm, 계산은 창에 보여 준다.
    // 선 두께: 평면 0.4pt, 도형 0.8pt, 수선·보조선 점선 0.3pt, 직각 표시·각 호 0.3pt. 선택은 필요 없다.
    function makeSpaceEngine() {
        var api = {label: "공간도형", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighGeometrySpace/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(α, β, θ, ′)
            var ENG_BASELINE_PT = 0.5;
            var PLANE_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var DOT_RADIUS_MM = 0.5;
            var MARK_MM = 2;
            var LABEL_GAP_MM = 0.8;
            var DEPTH = { scale: 0.5, angle: 30 };   // 사투상: 깊이(y)를 0.5배, 30° 방향으로
            var MODES = ["정사영", "삼수선 정리", "두 평면이 이루는 각"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["marks", "names", "projection"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var mode = 0;
            var planeMm = 60;
            var thetaDeg = 35;
            var lengthMm = 40;
            var heightMm = 10;
            var distanceMm = 15;
            var directionDeg = 15;
            var fontPt = 9;
            var opt = { marks: true, names: true, projection: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {planeMm: planeMm, thetaDeg: thetaDeg, lengthMm: lengthMm, heightMm: heightMm, distanceMm: distanceMm,
                directionDeg: directionDeg, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var shapePanel = addPanel(win, "그림");
            var modeRow = shapePanel.add("group");
            modeRow.add("statictext", undefined, "종류:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;
            var planeControls = addValueRow(shapePanel, "평면 너비", "mm", planeMm, 30, 120, 1, 0);
            var thetaControls = addValueRow(shapePanel, "각 θ", "°", thetaDeg, 5, 85, 1, 0);
            var lengthControls = addValueRow(shapePanel, "선분 AB", "mm", lengthMm, 10, 100, 1, 0);
            var heightControls = addValueRow(shapePanel, "높이", "mm", heightMm, 0, 60, 0.5, 1);
            heightControls.input.helpTip = "정사영: A의 높이 AA′, 삼수선: PH";
            var distanceControls = addValueRow(shapePanel, "HM 거리", "mm", distanceMm, 3, 60, 0.5, 1);
            var directionControls = addValueRow(shapePanel, "평면 위 방향", "°", directionDeg, -80, 80, 1, 0);
            directionControls.input.helpTip = "정사영의 A′B′, 삼수선의 직선 l이 가로와 이루는 각 (평면 위에서)";
            var checkRow = shapePanel.add("group");
            var marksCheck = checkRow.add("checkbox", undefined, "직각 표시");
            bindOption(marksCheck, "marks");
            var namesCheck = checkRow.add("checkbox", undefined, "점·평면 이름");
            bindOption(namesCheck, "names");
            var projectionCheck = checkRow.add("checkbox", undefined, "β 위 점의 정사영");
            bindOption(projectionCheck, "projection");
            var fontControls = addValueRow(shapePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(planeControls, function(value) { planeMm = value; }, DEFAULTS.planeMm);
            bindValueRow(thetaControls, function(value) { thetaDeg = value; }, DEFAULTS.thetaDeg);
            bindValueRow(lengthControls, function(value) { lengthMm = value; }, DEFAULTS.lengthMm);
            bindValueRow(heightControls, function(value) { heightMm = value; }, DEFAULTS.heightMm);
            bindValueRow(distanceControls, function(value) { distanceMm = value; }, DEFAULTS.distanceMm);
            bindValueRow(directionControls, function(value) { directionDeg = value; }, DEFAULTS.directionDeg);
            bindValueRow(fontControls, function(value) { fontPt = value; }, DEFAULTS.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, DEFAULTS.offsetYmm);

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

            function refreshEnabled() {
                thetaControls.input.parent.enabled = mode !== 1;
                lengthControls.input.parent.enabled = mode === 0;
                heightControls.input.parent.enabled = mode !== 2;
                distanceControls.input.parent.enabled = mode === 1;
                directionControls.input.parent.enabled = mode !== 2;
                projectionCheck.enabled = mode === 2;
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
                var drawing = buildSpace({
                    mode: mode, plane: planeMm, theta: thetaDeg, length: lengthMm, height: heightMm, distance: distanceMm,
                    direction: directionDeg, marks: opt.marks, names: opt.names, projection: opt.projection, mark: MARK_MM
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "공간도형";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                var b = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT, viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[[x,y]…] (mm), closed, kind:"plane"|"main"|"guide"|"mark"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push([line.points[i][0] * MM_TO_PT, line.points[i][1] * MM_TO_PT]);
                path.setEntirePath(anchors);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "plane" ? PLANE_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] * MM_TO_PT + r, at[0] * MM_TO_PT - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at(mm)에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다
            function addLabel(label) {
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
                var reach = LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] * MM_TO_PT + dir[0] * reach, y = label.at[1] * MM_TO_PT + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(α, β, θ, ′)는 HancomEQN. 점 이름(upright)은 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-space.js). 공간 좌표 (x 가로, y 깊이, z 위), mm
            // -------------------------------------------------------
            // 사투상: 깊이 y는 0.5배로 줄여 30° 방향으로 민다
            function project(p) {
                var a = DEPTH.angle * Math.PI / 180;
                return [p[0] + p[1] * DEPTH.scale * Math.cos(a), p[2] + p[1] * DEPTH.scale * Math.sin(a)];
            }

            function buildSpace(o) {
                var out = { lines: [], dots: [], texts: [], notes: [] };
                var W = o.plane, D = o.plane * 0.75, rad = Math.PI / 180;
                function line(points, kind, closed) {
                    var list = [];
                    for (var i = 0; i < points.length; i++) list.push(project(points[i]));
                    out.lines.push({ points: list, kind: kind, closed: !!closed });
                }
                function name(text, p, dir, upright) {
                    if (o.names) out.texts.push({ text: text, at: project(p), dir: dir, upright: upright !== false });
                }
                function dot(p) { out.dots.push(project(p)); }
                function mark(at, u, v) {
                    if (!o.marks) return;
                    var s = o.mark, a = unit3(u), b = unit3(v);
                    line([add3(at, scale3(a, s)), add3(add3(at, scale3(a, s)), scale3(b, s)), add3(at, scale3(b, s))], "mark");
                }
                function arc(at, u, v, r, label) {
                    var a = unit3(u), b = unit3(v), angle = Math.acos(Math.max(-1, Math.min(1, dot3(a, b)))), points = [];
                    for (var i = 0; i <= 16; i++) {
                        var t = angle * i / 16, p = add3(scale3(a, Math.sin(angle - t) / Math.sin(angle)), scale3(b, Math.sin(t) / Math.sin(angle)));
                        points.push(add3(at, scale3(p, r)));
                    }
                    line(points, "mark");
                    var mid = unit3(add3(a, b)), tip = project(add3(at, scale3(mid, r))), base = project(at);
                    out.texts.push({ text: label, at: tip, dir: unit2([tip[0] - base[0], tip[1] - base[1]]) });
                }
                var planeCorners = [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]];

                if (o.mode === 0) {
                    // 정사영: A′에서 방향 φ로 A′B′ = AB cos θ, A는 높이 h, B는 h + AB sin θ
                    line(planeCorners, "plane", true);
                    name("α", [W, D, 0], [0.7071, 0.7071], false);
                    var phi = o.direction * rad, dir = [Math.cos(phi), Math.sin(phi), 0];
                    var theta = o.theta * rad, projLength = o.length * Math.cos(theta);
                    var A1 = [W * 0.2, D * 0.3, 0], B1 = add3(A1, scale3(dir, projLength));
                    var A = [A1[0], A1[1], o.height], B = [B1[0], B1[1], o.height + o.length * Math.sin(theta)];
                    line([A, B], "main");
                    line([A1, B1], "main");
                    if (o.height > 0) line([A, A1], "guide");
                    line([B, B1], "guide");
                    // A에서 A′B′에 평행한 보조선 AC와 각 θ
                    var C = add3(A, scale3(dir, projLength));
                    line([A, C], "guide");
                    arc(A, sub3(C, A), sub3(B, A), Math.min(8, o.length * 0.3), "θ");
                    mark(A1, [0, 0, 1], dir);
                    mark(B1, [0, 0, 1], scale3(dir, -1));
                    var back = [-dir[0], -dir[1]];
                    name("A", A, unit2([back[0], 0.4]));
                    name("B", B, [0, 1]);
                    name("A′", A1, [0, -1]);
                    name("B′", B1, [0.7071, -0.7071]);
                    for (var pd = 0; pd < 4; pd++) dot([A, B, A1, B1][pd]);
                    out.notes.push("A′B′ = AB cos θ = " + fmt(o.length) + " × cos " + fmt(o.theta) + "° = " + fmt(projLength) + " (mm)");
                } else if (o.mode === 1) {
                    // 삼수선: PH ⊥ α, HM ⊥ l → PM ⊥ l
                    line(planeCorners, "plane", true);
                    name("α", [W, D, 0], [0.7071, 0.7071], false);
                    var ph = o.direction * rad, along = [Math.cos(ph), Math.sin(ph), 0], normal = [-Math.sin(ph), Math.cos(ph), 0];
                    if (normal[1] > 0) normal = scale3(normal, -1);   // M은 H보다 앞(아래)쪽
                    var H = [W * 0.45, D * 0.6, 0], P = [H[0], H[1], o.height], M = add3(H, scale3(normal, o.distance));
                    var ends = clipToPlane(M, along, W, D);
                    if (ends !== null) {
                        line(ends, "main");
                        name("l", ends[1], [0.7071, 0.7071], false);
                    }
                    line([P, H], "main");
                    line([H, M], "main");
                    line([P, M], "main");
                    mark(H, [0, 0, 1], sub3(M, H));
                    mark(M, along, sub3(H, M));
                    mark(M, scale3(along, -1), sub3(P, M));
                    name("P", P, [0, 1]);
                    name("H", H, [0.7071, 0.7071]);
                    name("M", M, [0, -1]);
                    for (var qd = 0; qd < 3; qd++) dot([P, H, M][qd]);
                    var pm = Math.sqrt(o.height * o.height + o.distance * o.distance);
                    out.notes.push("PH ⊥ α, HM ⊥ l 이면 PM ⊥ l (삼수선 정리)");
                    out.notes.push("PM = √(PH² + HM²) = " + fmt(pm) + " (mm)");
                } else {
                    // 두 평면: 교선 l은 앞쪽 가로선. α는 수평, β는 l을 축으로 θ만큼 세운 면
                    var theta2 = o.theta * rad, up = [0, Math.cos(theta2), Math.sin(theta2)];
                    line(planeCorners, "plane", true);
                    line([[0, 0, 0], [W, 0, 0], add3([W, 0, 0], scale3(up, D)), scale3(up, D)], "plane", true);
                    name("α", [W, D, 0], [0.7071, -0.7071], false);
                    name("β", add3([W, 0, 0], scale3(up, D)), [0.7071, 0.7071], false);
                    name("l", [W, 0, 0], [1, 0], false);
                    var O = [W * 0.4, 0, 0], Qa = [O[0], D * 0.6, 0], Qb = add3(O, scale3(up, D * 0.6));
                    line([O, Qa], "main");
                    line([O, Qb], "main");
                    mark(O, [1, 0, 0], [0, 1, 0]);
                    mark(O, [1, 0, 0], up);
                    arc(O, [0, 1, 0], up, D * 0.18, "θ");
                    name("O", O, [0, -1]);
                    dot(O);
                    if (o.projection) {
                        var foot = [Qb[0], Qb[1], 0];
                        line([Qb, foot], "guide");
                        mark(foot, [0, 0, 1], [0, -1, 0]);
                        name("Q", Qb, [-0.7071, 0.7071]);
                        name("Q′", foot, [0.7071, -0.7071]);
                        dot(Qb);
                        dot(foot);
                        out.notes.push("OQ′ = OQ cos θ, 정사영의 넓이 S′ = S cos θ (cos " + fmt(o.theta) + "° = " + fmt(Math.cos(theta2)) + ")");
                    } else {
                        out.notes.push("두 평면이 이루는 각 θ = " + fmt(o.theta) + "° (교선 l에 수직인 두 직선이 이루는 각)");
                    }
                }
                return out;
            }

            // 점 p를 지나고 방향 d인 직선을 평면 사각형 [0,W]×[0,D] (z=0) 안으로 자른 두 끝. 안 지나면 null
            function clipToPlane(p, d, W, D) {
                var t0 = -1e9, t1 = 1e9;
                var bounds = [[0, 0, W], [1, 0, D]];
                for (var i = 0; i < bounds.length; i++) {
                    var axis = bounds[i][0], lo = bounds[i][1], hi = bounds[i][2];
                    if (Math.abs(d[axis]) < 1e-12) {
                        if (p[axis] < lo || p[axis] > hi) return null;
                        continue;
                    }
                    var a = (lo - p[axis]) / d[axis], b = (hi - p[axis]) / d[axis];
                    t0 = Math.max(t0, Math.min(a, b));
                    t1 = Math.min(t1, Math.max(a, b));
                }
                if (t1 - t0 < 1e-9) return null;
                return [add3(p, scale3(d, t0)), add3(p, scale3(d, t1))];
            }

            function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
            function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
            function scale3(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
            function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
            function unit3(a) {
                var length = Math.sqrt(dot3(a, a));
                return length > 0 ? scale3(a, 1 / length) : [1, 0, 0];
            }
            function unit2(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            function fmt(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
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
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", mode, planeMm, thetaDeg, lengthMm, heightMm, distanceMm, directionDeg, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 13 || p[9].length !== FLAG_KEYS.length) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    planeMm = restoreNumber(p[2], planeMm, 30, 120);
                    thetaDeg = restoreNumber(p[3], thetaDeg, 5, 85);
                    lengthMm = restoreNumber(p[4], lengthMm, 10, 100);
                    heightMm = restoreNumber(p[5], heightMm, 0, 60);
                    distanceMm = restoreNumber(p[6], distanceMm, 3, 60);
                    directionDeg = restoreNumber(p[7], directionDeg, -80, 80);
                    fontPt = restoreNumber(p[8], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[9].charAt(i) === "1";
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
})();
