// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 미리보기 라벨 겹침 풀기 (07_수학/math_label_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/math_label_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 고등학교 기하: 평면 도형(삼각형·원·각 그림), 3D 입체(기둥·뿔·원기둥·원뿔·구), 이차곡선(포물선·타원·쌍곡선)과 그 접선, 평면벡터, 공간도형(정사영·삼수선·두 평면이 이루는 각) 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
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
    var engines = [makeGeometryEngine(), makeSolid3DEngine(), makeConicEngine(), makeConicTangentEngine(), makeVectorEngine(), makeSpaceEngine()];

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

            // 글자 서체 (02_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
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

            // 글자 서체 (02_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
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
    // ==== 도형 ====
    // 평면기하 그림(삼각형·사각형·원·각·같은 길이 눈금)을 점 좌표로 그린다. 웹 도구 "기하 도형"과 같은 글 형식이다.
    // 점 이름(A(0,3) B(0,0))을 먼저 정하고 그 이름으로 선분(A-B-C-A)·점선·원(ABC 세 점, AB 지름, O:3 중심과 반지름, O~A 중심과 지나는 점)
    // ·각 표시(BAC:60° 꼭짓점 A, ABC:R 직각, BAC::2 호 2겹)·같은 길이 눈금(AB:1)·변 길이 글자(AB:5)·점 찍기를 적는다.
    // 좌표는 같은 길이 단위로 쓰고(길이가 3, 4, √13이면 그 수 그대로) 그림 크기는 가장 긴 쪽을 mm로 맞춘다. 숫자는 √·분수·π도 된다.
    // 점 이름 O_1은 O₁처럼 아래첨자가 된다. 점 이름 글자 방향은 u d l r ul ur dl dr로 고칠 수 있다.
    // 선 두께: 도형 0.8pt(조절 가능), 각 호·직각·눈금 0.3pt, 점선 도형과 같은 굵기. 선택은 필요 없다.
    function makeGeometryEngine() {
        var api = {label: "도형", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathGeometry/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var TEXT_WIDTH = 300;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′, √, π, θ …)
            var GS_SYMBOLS = "˘°±·";   // GSMediumB1에 있는 기호 (° 는 ˘ 로 바꿔 쓴다)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var ARROW = {length: 4, halfWidth: 1.3, notch: 1};
            registerHead(ARROW);
            var MARK_PT = 0.3;
            var MARK_GAP_MM = 0.7;
            var DOT_RADIUS_MM = 0.6;
            var GUIDE_DASH = [2, 1.5];
            var KAPPA = 0.5522847498;
            var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
            var TEXT_KEYS = ["pointsText", "segmentText", "dashedText", "circleText", "ellipseText", "angleText", "tickText", "lengthText", "dotText", "labelDirText"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var text = {pointsText: "A(0,3) B(0,0) C(4,0)", segmentText: "A-B-C-A", dashedText: "", circleText: "", ellipseText: "",
                angleText: "ABC:R", tickText: "", lengthText: "AB:3, BC:4", dotText: "", labelDirText: ""};
            var showNames = true;
            var showAxes = false;
            var sizeMm = 50;
            var fontPt = 8;
            var labelGapMm = 1.2;
            var arcRadiusMm = 3;
            var tickMm = 1.6;
            var strokePt = 0.8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {sizeMm: sizeMm, fontPt: fontPt, labelGapMm: labelGapMm, arcRadiusMm: arcRadiusMm, tickMm: tickMm, strokePt: strokePt,
                offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var pointPanel = addPanel(win, "점");
            var inputs = {};
            addTextRow(pointPanel, "점", "pointsText", "점 이름과 좌표: A(0,3) B(0,0) C(4,0). 같은 길이 단위로 쓴다 (√13, 1/2, π도 된다). 이름은 O_1처럼 아래첨자도 된다");
            addTextRow(pointPanel, "선분", "segmentText", "이어 그릴 점 이름: A-B-C-A, A-D (쉼표로 나눈다)");
            addTextRow(pointPanel, "점선", "dashedText", "점선으로 이을 점 이름: A-D");
            addTextRow(pointPanel, "원", "circleText", "ABC 세 점을 지나는 원, AB 지름이 AB인 원, O:3 중심 O·반지름 3, (1,2):3 좌표 중심, O~A 중심 O에 A를 지나는 원");
            addTextRow(pointPanel, "타원", "ellipseText", "O:6x4 중심 O·가로 반지름 6·세로 반지름 4, (1,2):6x4 좌표 중심, 6x4 중심 원점 (쉼표로 여러 개, x 대신 ×도 된다)");
            addTextRow(pointPanel, "각", "angleText", "BAC:60° (꼭짓점 A에서 AB와 AC 사이의 각), ABC:R 직각 표시, BAC 글자 없이 호, BAC:60°:2 호 2겹");

            var markPanel = addPanel(win, "표시");
            addTextRow(markPanel, "같은 길이", "tickText", "AB:1, CD:2 — 변 가운데에 눈금 1~3개");
            addTextRow(markPanel, "변 길이", "lengthText", "AB:5, BC:2√3 — 변 가운데에서 바깥쪽에 글자");
            addTextRow(markPanel, "점 찍기", "dotText", "점으로 찍을 점 이름: P Q");
            addTextRow(markPanel, "글자 방향", "labelDirText", "점 이름 글자 방향: A:ul, P:r (u 위, d 아래, l 왼쪽, r 오른쪽, ul·ur·dl·dr 대각선). 안 쓰면 그림 가운데에서 바깥쪽");
            var nameCheck = markPanel.add("checkbox", undefined, "점 이름 쓰기");
            nameCheck.value = showNames;
            var axesCheck = markPanel.add("checkbox", undefined, "좌표축 (원점 O)");
            axesCheck.value = showAxes;
            axesCheck.helpTip = "원점을 지나는 x축·y축과 화살촉, 글자 x·y·O. 점 좌표의 원점이 기준";

            var sizePanel = addPanel(win, "크기");
            var sizeControls = addValueRow(sizePanel, "그림 크기", "mm", sizeMm, 20, 140, 1, 0);
            sizeControls.input.helpTip = "그림에서 가장 긴 쪽의 길이";
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var strokeControls = addValueRow(sizePanel, "선 두께", "pt", strokePt, 0.1, 1.5, 0.1, 1);
            var gapControls = addValueRow(sizePanel, "글자 간격", "mm", labelGapMm, 0, 5, 0.1, 1);
            var arcControls = addValueRow(sizePanel, "각 호 반지름", "mm", arcRadiusMm, 1, 10, 0.5, 1);
            var tickControls = addValueRow(sizePanel, "눈금 길이", "mm", tickMm, 0.5, 5, 0.1, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            nameCheck.onClick = function() { showNames = nameCheck.value; updatePreview(); };
            axesCheck.onClick = function() { showAxes = axesCheck.value; updatePreview(); };
            bindValueRow(sizeControls, function(value) { sizeMm = value; }, DEFAULTS.sizeMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, DEFAULTS.fontPt);
            bindValueRow(strokeControls, function(value) { strokePt = value; }, DEFAULTS.strokePt);
            bindValueRow(gapControls, function(value) { labelGapMm = value; }, DEFAULTS.labelGapMm);
            bindValueRow(arcControls, function(value) { arcRadiusMm = value; }, DEFAULTS.arcRadiusMm);
            bindValueRow(tickControls, function(value) { tickMm = value; }, DEFAULTS.tickMm);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, DEFAULTS.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 그릴 것이 없으면 확정하지 않는다
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

            function addTextRow(parent, label, key, tip) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + ":").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, text[key]);
                input.preferredSize.width = TEXT_WIDTH;
                input.helpTip = tip;
                input.onChange = function() { text[key] = input.text; updatePreview(); };
                inputs[key] = input;
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
                var drawing = buildGeometry();
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";
                if (drawing.lines.length === 0 && drawing.dots.length === 0 && drawing.texts.length === 0) return;
                previewGroup = layer.groupItems.add();
                previewGroup.name = "도형";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var ar = 0; ar < drawing.arrows.length; ar++) addArrow(drawing.arrows[ar]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"main"|"dashed"|"mark"}
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
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "mark" ? Math.min(MARK_PT, strokePt) : (line.kind === "axis" ? AXIS_PT : strokePt);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "dashed") path.strokeDashes = GUIDE_DASH;
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var head = headShapeFor(arrow.tip, arrow.dir, ARROW);
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup·sub: 첨자 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/°/g, "˘");
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var s;
                for (s = 0; label.sup && s < label.sup.length; s++) frame.textRange.characters[label.sup[s]].characterAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                for (s = 0; label.sub && s < label.sub.length; s++) frame.textRange.characters[label.sub[s]].characterAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var gap = labelGapMm * MM_TO_PT;
                if (label.halfAngle > 0 && label.halfAngle < Math.PI / 2) {
                    // 좁은 각의 글자가 두 변에 닿지 않게 꼭짓점에서 더 멀리
                    var near = gap + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                    var cx = label.at[0] + dir[0] * near, cy = label.at[1] + dir[1] * near;
                    var fit = Math.sqrt(halfW * halfW + halfH * halfH) / Math.sin(label.halfAngle);
                    var current = Math.sqrt((cx - label.vertex[0]) * (cx - label.vertex[0]) + (cy - label.vertex[1]) * (cy - label.vertex[1]));
                    if (fit > current) label.clear = fit - current;
                }
                var reach = (label.clear || 0) + gap + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체: 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1, 그 밖의 기호 HancomEQN. 점 이름·숫자(upright)는 똑바로
            function applyTextFonts(frame, upright) {
                var contents = frame.contents;
                for (var i = 0; i < contents.length; i++) {
                    var code = contents.charCodeAt(i);
                    var attributes = frame.textRange.characters[i].characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126 && GS_SYMBOLS.indexOf(contents.charAt(i)) < 0) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && /[a-z]/.test(contents.charAt(i)) && !/[A-Za-z]/.test(contents.charAt(i - 1)) && !/[A-Za-z]/.test(contents.charAt(i + 1))) {
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
            // 글 읽기 (일러 DOM을 쓰지 않는다)
            // -------------------------------------------------------
            // 숫자·분수·√·π 식 (2√3/3, √13, 1/2, π/3). 못 읽으면 null
            function evalNumber(source) {
                var s = String(source).split("−").join("-").split("×").join("*").split("÷").join("/").split("π").join("pi").replace(/\s/g, "");
                if (s === "") return null;
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || s.substr(pos, 2) === "pi";
                }
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
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        if (peek() === "*") { pos++; value = value * unary(); }
                        else if (peek() === "/") { pos++; value = value / unary(); }
                        else value = value * unary();
                    }
                    return value;
                }
                function unary() {
                    if (peek() === "-") { pos++; return -unary(); }
                    if (peek() === "+") { pos++; return unary(); }
                    var base = atom();
                    if (peek() === "^") { pos++; return Math.pow(base, unary()); }
                    return base;
                }
                function atom() {
                    var ch = peek();
                    if (ch === "(") {
                        pos++;
                        var inner = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return inner;
                    }
                    if (ch === "√") {
                        pos++;
                        var arg = peek() === "(" ? atom() : number();
                        if (arg < 0) throw new Error("sqrt");
                        return Math.sqrt(arg);
                    }
                    if (s.substr(pos, 2) === "pi") { pos += 2; return Math.PI; }
                    return number();
                }
                function number() {
                    var begin = pos, dots = 0;
                    while (isDigit(peek()) || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var value = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(value)) throw new Error("number");
                    return value;
                }
                try {
                    var result = expression();
                    if (pos !== s.length || !isFinite(result)) return null;
                    return result;
                } catch (e) {
                    return null;
                }
            }

            // 괄호 밖의 쉼표·세미콜론·줄바꿈으로 나눈다 ("(1,2):3" 안의 쉼표는 지킨다)
            function splitItems(source) {
                var out = [], depth = 0, current = "";
                var s = String(source);
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "(") depth++;
                    else if (ch === ")") depth = Math.max(0, depth - 1);
                    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n" || ch === "\r")) { out.push(current); current = ""; } else current += ch;
                }
                out.push(current);
                var trimmed = [];
                for (var j = 0; j < out.length; j++) {
                    var item = out[j].replace(/^\s+|\s+$/g, "");
                    if (item !== "") trimmed.push(item);
                }
                return trimmed;
            }

            // "ABC", "A-B-C", "A B" → [A, B, C]. 점 이름은 긴 것부터 맞춘다 (P1, A′ 같은 이름). 모르는 글자가 있으면 null
            function tokenizeNames(source, names) {
                var s = String(source).replace(/[\s\-–−]/g, "");
                var sorted = names.slice().sort(function(a, b) { return b.length - a.length; });
                var out = [];
                var i = 0;
                while (i < s.length) {
                    var hit = null;
                    for (var k = 0; k < sorted.length; k++) {
                        if (s.substr(i, sorted[k].length) === sorted[k]) { hit = sorted[k]; break; }
                    }
                    if (hit === null) return null;
                    out.push(hit);
                    i += hit.length;
                }
                return out;
            }

            // "A(2,3) B(-1,-2)" → 이름 → [x, y]. 괄호 밖의 공백·쉼표·세미콜론은 구분자
            function readPoints(source, notes) {
                var s = String(source);
                var names = [], table = {};
                var i = 0;
                while (i < s.length) {
                    var ch = s.charAt(i);
                    if (ch === " " || ch === "," || ch === ";" || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
                    var open = s.indexOf("(", i);
                    var close = open >= 0 ? s.indexOf(")", open) : -1;
                    if (open < 0 || close < 0) {
                        notes.push("점 " + s.substring(i).replace(/\s+$/, ""));
                        break;
                    }
                    var name = s.substring(i, open).replace(/\s/g, "");
                    var inside = s.substring(open + 1, close);
                    var comma = inside.indexOf(",");
                    var x = comma >= 0 ? evalNumber(inside.substring(0, comma)) : null;
                    var y = comma >= 0 ? evalNumber(inside.substring(comma + 1)) : null;
                    if (x === null || y === null) notes.push("점 " + s.substring(i, close + 1));
                    else if (name === "") notes.push("점 이름 없음: (" + inside + ")");
                    else if (table.hasOwnProperty(name)) notes.push("점 이름 겹침: " + name);
                    else { table[name] = [x, y]; names.push(name); }
                    i = close + 1;
                }
                return {names: names, table: table};
            }

            // "A-B-C-A, A-D" → [[A,B],[B,C],[C,A],[A,D]]
            function readChains(source, names, label, notes) {
                var pairs = [];
                var items = splitItems(source);
                for (var i = 0; i < items.length; i++) {
                    var t = tokenizeNames(items[i], names);
                    if (t === null || t.length < 2) { notes.push(label + " " + items[i]); continue; }
                    for (var k = 0; k + 1 < t.length; k++) pairs.push([t[k], t[k + 1]]);
                }
                return pairs;
            }

            // "AB:5" → {names:[A,B], text:"5"}
            function readPairTexts(source, names, label, notes) {
                var out = [];
                var items = splitItems(source);
                for (var i = 0; i < items.length; i++) {
                    var colon = items[i].indexOf(":");
                    var t = tokenizeNames(colon >= 0 ? items[i].substring(0, colon) : items[i], names);
                    if (t === null || t.length !== 2) { notes.push(label + " " + items[i]); continue; }
                    out.push({names: t, text: colon >= 0 ? items[i].substring(colon + 1).replace(/^\s+|\s+$/g, "") : ""});
                }
                return out;
            }

            // 세 점을 지나는 원. 한 직선 위의 점이면 null
            function circumcircle(a, b, c) {
                var d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
                if (Math.abs(d) < 1e-12) return null;
                var a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
                var ux = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
                var uy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
                return {c: [ux, uy], r: Math.sqrt((a[0] - ux) * (a[0] - ux) + (a[1] - uy) * (a[1] - uy))};
            }

            // 원: "ABC"(세 점), "AB"(지름), "O:3", "(1,2):3", "O~A"
            function readCircles(source, table, names, notes) {
                var out = [];
                var items = splitItems(source);
                for (var i = 0; i < items.length; i++) {
                    var item = items[i], circle = null, t, u;
                    if (item.indexOf("~") >= 0) {
                        var halves = item.split("~");
                        t = tokenizeNames(halves[0], names);
                        u = tokenizeNames(halves[1] || "", names);
                        if (t && u && t.length === 1 && u.length === 1) {
                            var p = table[t[0]], q = table[u[0]];
                            circle = {c: p, r: Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]))};
                        }
                    } else if (item.indexOf(":") >= 0) {
                        var colon = item.lastIndexOf(":");
                        var head = item.substring(0, colon).replace(/^\s+|\s+$/g, "");
                        var radius = evalNumber(item.substring(colon + 1));
                        var center = null;
                        if (head.charAt(0) === "(" && head.charAt(head.length - 1) === ")") {
                            var inside = head.substring(1, head.length - 1), comma = inside.indexOf(",");
                            var cx = comma >= 0 ? evalNumber(inside.substring(0, comma)) : null;
                            var cy = comma >= 0 ? evalNumber(inside.substring(comma + 1)) : null;
                            if (cx !== null && cy !== null) center = [cx, cy];
                        } else {
                            t = tokenizeNames(head, names);
                            if (t && t.length === 1) center = table[t[0]];
                        }
                        if (center && radius !== null && radius > 0) circle = {c: center, r: radius};
                    } else {
                        t = tokenizeNames(item, names);
                        if (t && t.length === 2) {
                            var a = table[t[0]], b = table[t[1]];
                            circle = {c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
                                r: Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])) / 2};
                        } else if (t && t.length === 3) circle = circumcircle(table[t[0]], table[t[1]], table[t[2]]);
                    }
                    if (circle) out.push(circle); else notes.push("원 " + item);
                }
                return out;
            }

            // 타원: "O:6x4"(중심 O, 가로 반지름 6·세로 반지름 4), "(1,2):6x4", "6x4"(중심 원점). x 대신 ×도 된다
            function readEllipses(source, table, names, notes) {
                var out = [];
                var items = splitItems(source);
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var colon = item.lastIndexOf(":");
                    var head = colon >= 0 ? item.substring(0, colon).replace(/^\s+|\s+$/g, "") : "";
                    var radii = (colon >= 0 ? item.substring(colon + 1) : item).replace(/\s/g, "").split(/[x\u00D7]/);
                    var rx = radii.length === 2 ? evalNumber(radii[0]) : null, ry = radii.length === 2 ? evalNumber(radii[1]) : null;
                    var center = colon < 0 ? [0, 0] : null;
                    if (head.charAt(0) === "(" && head.charAt(head.length - 1) === ")") {
                        var inside = head.substring(1, head.length - 1), comma = inside.indexOf(",");
                        var cx = comma >= 0 ? evalNumber(inside.substring(0, comma)) : null;
                        var cy = comma >= 0 ? evalNumber(inside.substring(comma + 1)) : null;
                        if (cx !== null && cy !== null) center = [cx, cy];
                    } else if (head !== "") {
                        var t = tokenizeNames(head, names);
                        if (t && t.length === 1) center = table[t[0]];
                    }
                    if (center && rx !== null && ry !== null && rx > 0 && ry > 0) out.push({c: center, rx: rx, ry: ry});
                    else notes.push("타원 " + item);
                }
                return out;
            }

            // 각: "BAC:60°"(꼭짓점 A, 변 AB·AC), "ABC:R"(직각), "BAC"(글자 없이 호), "BAC:60°:2"(호 2겹)
            function readAngles(source, names, notes) {
                var out = [];
                var items = splitItems(source);
                for (var i = 0; i < items.length; i++) {
                    var parts = items[i].split(":");
                    var t = tokenizeNames(parts[0], names);
                    if (t === null || t.length !== 3) { notes.push("각 " + items[i]); continue; }
                    var label = (parts[1] || "").replace(/^\s+|\s+$/g, "");
                    var right = /^(r|R|직각|90°?|π\/2)$/.test(label);
                    var arcs = Math.min(3, Math.max(1, parseInt(parts[2], 10) || 1));
                    out.push({names: t, text: right ? "" : label, right: right, arcs: arcs});
                }
                return out;
            }

            // 글자에 ^(위첨자)·_(아래첨자)가 있으면 첨자로 나눈다 (O_1 → O₁). 없으면 글자 그대로
            function display(source) {
                if (source.indexOf("^") < 0 && source.indexOf("_") < 0) return {text: source};
                var out = "", sup = [], sub = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) { marks.push(out.length); out += source.charAt(j); }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") { marks.push(out.length); out += source.charAt(++i); }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    out += ch;
                }
                return {text: out, sup: sup, sub: sub};
            }

            // -------------------------------------------------------
            // 그림 계산 (원점 가운데, pt)
            // -------------------------------------------------------
            function straight(anchors, kind, closed) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({anchor: anchors[i], left: anchors[i], right: anchors[i]});
                return {points: points, kind: kind, closed: closed};
            }

            function circleLine(cx, cy, r) {
                var k = r * KAPPA;
                return {kind: "main", closed: true, points: [
                    {anchor: [cx + r, cy], left: [cx + r, cy - k], right: [cx + r, cy + k]},
                    {anchor: [cx, cy + r], left: [cx + k, cy + r], right: [cx - k, cy + r]},
                    {anchor: [cx - r, cy], left: [cx - r, cy + k], right: [cx - r, cy - k]},
                    {anchor: [cx, cy - r], left: [cx - k, cy - r], right: [cx + k, cy - r]}]};
            }

            function unitVector(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length < 1e-9 ? [0, 0] : [v[0] / length, v[1] / length];
            }

            function offsetPoint(p, d, length) { return [p[0] + d[0] * length, p[1] + d[1] * length]; }

            function arcPoints(center, radius, start, sweep) {
                var steps = Math.max(6, Math.ceil(sweep / (Math.PI / 24)));
                var out = [];
                for (var i = 0; i <= steps; i++) {
                    var a = start + sweep * i / steps;
                    out.push([center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)]);
                }
                return out;
            }

            // 꼭짓점 v에서 start 방향 변과 그 +90° 변 사이의 직각 표시 (ㄴ 모양 세 점)
            function rightAnglePoints(v, start, size) {
                var u = [Math.cos(start), Math.sin(start)], w = [-u[1], u[0]];
                var a = offsetPoint(v, u, size), c = offsetPoint(v, w, size);
                return [a, [a[0] + w[0] * size, a[1] + w[1] * size], c];
            }

            function buildGeometry() {
                var out = {lines: [], arrows: [], dots: [], texts: [], notes: []};
                var notes = out.notes;
                var read = readPoints(text.pointsText, notes);
                var names = read.names, table = read.table;
                if (names.length === 0) {
                    if (notes.length === 0) notes.push("점을 적어 주세요 (예: A(0,3) B(0,0) C(4,0))");
                    return out;
                }
                var segments = readChains(text.segmentText, names, "선분", notes);
                var dashed = readChains(text.dashedText, names, "점선", notes);
                var circles = readCircles(text.circleText, table, names, notes);
                var ellipses = readEllipses(text.ellipseText, table, names, notes);
                var angles = readAngles(text.angleText, names, notes);
                var ticks = readPairTexts(text.tickText, names, "눈금", notes);
                var lengths = readPairTexts(text.lengthText, names, "길이", notes);
                var dotNames = [], i, k, t;
                var dotItems = splitItems(text.dotText);
                for (i = 0; i < dotItems.length; i++) {
                    t = tokenizeNames(dotItems[i], names);
                    if (t === null) notes.push("점 찍기 " + dotItems[i]); else for (k = 0; k < t.length; k++) dotNames.push(t[k]);
                }
                var dirOverride = {};
                var dirItems = splitItems(text.labelDirText);
                for (i = 0; i < dirItems.length; i++) {
                    var m = dirItems[i].split(":");
                    t = tokenizeNames(m[0], names);
                    var code = (m[1] || "").replace(/\s/g, "");
                    if (t === null || t.length !== 1 || !DIRS.hasOwnProperty(code)) { notes.push("글자 방향 " + dirItems[i]); continue; }
                    dirOverride[t[0]] = code;
                }

                // 그림 전체를 sizeMm로 맞추고 가운데를 원점에
                var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
                for (i = 0; i < names.length; i++) {
                    var q = table[names[i]];
                    x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]);
                }
                for (i = 0; i < circles.length; i++) {
                    x0 = Math.min(x0, circles[i].c[0] - circles[i].r); x1 = Math.max(x1, circles[i].c[0] + circles[i].r);
                    y0 = Math.min(y0, circles[i].c[1] - circles[i].r); y1 = Math.max(y1, circles[i].c[1] + circles[i].r);
                }
                for (i = 0; i < ellipses.length; i++) {
                    x0 = Math.min(x0, ellipses[i].c[0] - ellipses[i].rx); x1 = Math.max(x1, ellipses[i].c[0] + ellipses[i].rx);
                    y0 = Math.min(y0, ellipses[i].c[1] - ellipses[i].ry); y1 = Math.max(y1, ellipses[i].c[1] + ellipses[i].ry);
                }
                // 좌표축: 원점과 화살촉·글자 자리까지 그림 범위에 넣는다
                var axes = null;
                if (showAxes) {
                    var span0 = Math.max(x1 - x0, y1 - y0, 1e-9);
                    axes = {l: Math.min(x0, 0) - 0.1 * span0, r: x1 + 0.12 * span0, b: Math.min(y0, 0) - 0.1 * span0, t: y1 + 0.12 * span0};
                    x0 = Math.min(x0, axes.l); x1 = Math.max(x1, axes.r); y0 = Math.min(y0, axes.b); y1 = Math.max(y1, axes.t);
                }
                var extent = Math.max(x1 - x0, y1 - y0) || 1;
                var scale = sizeMm * MM_TO_PT / extent, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
                function T(p) { return [(p[0] - mx) * scale, (p[1] - my) * scale]; }
                function P(name) { return T(table[name]); }

                for (i = 0; i < circles.length; i++) {
                    var cc = T(circles[i].c);
                    out.lines.push(circleLine(cc[0], cc[1], circles[i].r * scale));
                }
                for (i = 0; i < ellipses.length; i++) {
                    var ec = T(ellipses[i].c), er = ellipses[i];
                    var ek = KAPPA, rxp = er.rx * scale, ryp = er.ry * scale;
                    out.lines.push({kind: "main", closed: true, points: [
                        {anchor: [ec[0] + rxp, ec[1]], left: [ec[0] + rxp, ec[1] - ek * ryp], right: [ec[0] + rxp, ec[1] + ek * ryp]},
                        {anchor: [ec[0], ec[1] + ryp], left: [ec[0] + ek * rxp, ec[1] + ryp], right: [ec[0] - ek * rxp, ec[1] + ryp]},
                        {anchor: [ec[0] - rxp, ec[1]], left: [ec[0] - rxp, ec[1] + ek * ryp], right: [ec[0] - rxp, ec[1] - ek * ryp]},
                        {anchor: [ec[0], ec[1] - ryp], left: [ec[0] - ek * rxp, ec[1] - ryp], right: [ec[0] + ek * rxp, ec[1] - ryp]}]});
                }
                if (axes) {
                    var cut = ARROW.length - ARROW.notch;
                    var axO = T([0, 0]), axR = T([axes.r, 0]), axL = T([axes.l, 0]), axT = T([0, axes.t]), axB = T([0, axes.b]);
                    out.lines.push(straight([axL, [axR[0] - cut, axR[1]]], "axis", false));
                    out.lines.push(straight([axB, [axT[0], axT[1] - cut]], "axis", false));
                    out.arrows.push({tip: axR, dir: [1, 0]}, {tip: axT, dir: [0, 1]});
                    out.texts.push({text: "x", at: axR, dir: [0, -1], clear: 0}, {text: "y", at: axT, dir: [-1, 0], clear: 0});
                    if (!table.hasOwnProperty("O")) out.texts.push({text: "O", at: axO, dir: [-0.7071, -0.7071], clear: 0, upright: true});
                }
                for (i = 0; i < segments.length; i++) out.lines.push(straight([P(segments[i][0]), P(segments[i][1])], "main", false));
                for (i = 0; i < dashed.length; i++) out.lines.push(straight([P(dashed[i][0]), P(dashed[i][1])], "dashed", false));

                var arcR = arcRadiusMm * MM_TO_PT, gap = MARK_GAP_MM * MM_TO_PT, tick = tickMm * MM_TO_PT;

                // 점 이름: 그림 가운데에서 바깥쪽으로 (글자 방향으로 고칠 수 있다)
                var cx0 = 0, cy0 = 0;
                for (i = 0; i < names.length; i++) { var pp = P(names[i]); cx0 += pp[0]; cy0 += pp[1]; }
                var centroid = [cx0 / names.length, cy0 / names.length];
                if (showNames) {
                    for (i = 0; i < names.length; i++) {
                        var at = P(names[i]);
                        var dir;
                        if (dirOverride.hasOwnProperty(names[i])) dir = unitVector(DIRS[dirOverride[names[i]]]);
                        else {
                            dir = unitVector([at[0] - centroid[0], at[1] - centroid[1]]);
                            if (dir[0] === 0 && dir[1] === 0) dir = [0, 1];
                        }
                        var nameLabel = display(names[i]);
                        nameLabel.at = at; nameLabel.dir = dir; nameLabel.upright = true;
                        out.texts.push(nameLabel);
                    }
                }

                // 각: 호(겹 수만큼) 또는 직각 표시, 글자는 각 안쪽에
                for (i = 0; i < angles.length; i++) {
                    var angle = angles[i];
                    var pb = P(angle.names[0]), v = P(angle.names[1]), pc = P(angle.names[2]);
                    var toB = Math.atan2(pb[1] - v[1], pb[0] - v[0]), toC = Math.atan2(pc[1] - v[1], pc[0] - v[0]);
                    var d = toC - toB;
                    while (d > Math.PI) d -= Math.PI * 2;
                    while (d <= -Math.PI) d += Math.PI * 2;
                    var start = d >= 0 ? toB : toC, sweep = Math.abs(d);
                    var reach = arcR;
                    if (angle.right) {
                        out.lines.push(straight(rightAnglePoints(v, start, arcR * 0.7), "mark", false));
                        reach = arcR * 0.7 * Math.SQRT2;
                    } else {
                        for (k = 0; k < angle.arcs; k++) out.lines.push(straight(arcPoints(v, arcR + k * gap, start, sweep), "mark", false));
                        reach = arcR + (angle.arcs - 1) * gap;
                    }
                    if (angle.text) {
                        var mid = start + sweep / 2, inward = [Math.cos(mid), Math.sin(mid)];
                        var angleLabel = display(angle.text);
                        angleLabel.at = offsetPoint(v, inward, reach); angleLabel.dir = inward;
                        angleLabel.vertex = v; angleLabel.halfAngle = sweep / 2;
                        angleLabel.clear = 0.01;   // 각 안쪽 글자는 옮기지 않는 라벨로 둔다 (addLabel이 좁은 각이면 늘린다)
                        out.texts.push(angleLabel);
                    }
                }

                // 같은 길이 눈금: 변 가운데에 수직으로
                var tickKeys = {};
                for (i = 0; i < ticks.length; i++) {
                    var count = Math.min(3, Math.max(1, parseInt(ticks[i].text, 10) || 1));
                    var ta = P(ticks[i].names[0]), tb = P(ticks[i].names[1]);
                    var along = unitVector([tb[0] - ta[0], tb[1] - ta[1]]), normal = [-along[1], along[0]];
                    var middle = [(ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2];
                    for (k = 0; k < count; k++) {
                        var tc = offsetPoint(middle, along, (k - (count - 1) / 2) * gap);
                        out.lines.push(straight([offsetPoint(tc, normal, -tick / 2), offsetPoint(tc, normal, tick / 2)], "mark", false));
                    }
                    tickKeys[ticks[i].names[0] + "|" + ticks[i].names[1]] = true;
                    tickKeys[ticks[i].names[1] + "|" + ticks[i].names[0]] = true;
                }

                // 변 길이 글자: 변 가운데에서 그림 바깥쪽으로
                for (i = 0; i < lengths.length; i++) {
                    if (!lengths[i].text) continue;
                    var la = P(lengths[i].names[0]), lb = P(lengths[i].names[1]);
                    var lalong = unitVector([lb[0] - la[0], lb[1] - la[1]]);
                    var lnormal = [-lalong[1], lalong[0]];
                    var lmid = [(la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2];
                    if (lnormal[0] * (lmid[0] - centroid[0]) + lnormal[1] * (lmid[1] - centroid[1]) < 0) lnormal = [-lnormal[0], -lnormal[1]];
                    var lengthLabel = display(lengths[i].text);
                    lengthLabel.at = lmid; lengthLabel.dir = lnormal;
                    lengthLabel.clear = tickKeys[lengths[i].names[0] + "|" + lengths[i].names[1]] ? tick / 2 : 0;
                    out.texts.push(lengthLabel);
                }

                for (i = 0; i < dotNames.length; i++) out.dots.push(P(dotNames[i]));
                return out;
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
                return {input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals};
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

            function parseNumber(source) {
                var value = parseFloat(String(source).replace(",", ".").replace(/[^0-9.\-]/g, ""));
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
            // 설정 저장 · 복원 (글은 encodeURIComponent로 | 가 섞이지 않게)
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v2"];
                for (var i = 0; i < TEXT_KEYS.length; i++) parts.push(encodeURIComponent(text[TEXT_KEYS[i]]));
                parts.push(showNames ? "1" : "0", showAxes ? "1" : "0", sizeMm, fontPt, labelGapMm, arcRadiusMm, tickMm, strokePt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0");
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v2" || p.length !== 22) return;
                try {
                    var restored = {};
                    for (var i = 0; i < TEXT_KEYS.length; i++) restored[TEXT_KEYS[i]] = decodeURIComponent(p[1 + i]);
                    for (i = 0; i < TEXT_KEYS.length; i++) text[TEXT_KEYS[i]] = restored[TEXT_KEYS[i]];
                    showNames = p[11] === "1";
                    showAxes = p[12] === "1";
                    sizeMm = restoreNumber(p[13], sizeMm, 20, 140);
                    fontPt = restoreNumber(p[14], fontPt, 5, 14);
                    labelGapMm = restoreNumber(p[15], labelGapMm, 0, 5);
                    arcRadiusMm = restoreNumber(p[16], arcRadiusMm, 1, 10);
                    tickMm = restoreNumber(p[17], tickMm, 0.5, 5);
                    strokePt = restoreNumber(p[18], strokePt, 0.1, 1.5);
                    offsetXmm = restoreNumber(p[19], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[20], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[21] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(source, fallback, minimum, maximum) {
                var value = parseNumber(source);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 3D 입체 ====
    // 수능·모의평가의 기둥·뿔·원기둥·원뿔·구 그림을 정사영 시점(방위각·고도)으로 그리고, 보이지 않는 모서리는 점선으로 그린다. 웹 도구 "3D 입체도형"과 같은 그림이다.
    // 기본 도형의 꼭짓점 이름: n각기둥 위 A1..An·아래 B1..Bn, n각뿔 꼭짓점 P·밑면 A1..An, 원기둥 위 중심 O1·아래 중심 O2, 원뿔 꼭짓점 V·밑면 중심 O, 구 중심 O.
    // 좌표계는 밑면이 z=0, 앞이 -y, 위가 +z. "직접 좌표"는 프리셋 없이 점 이름(x,y,z)과 선분 목록만으로 그린다. 프리셋에도 점·선분·점선을 덧붙일 수 있다.
    // 선 두께: 실선·점선 0.8pt(조절). 선택은 필요 없다.
    function makeSolid3DEngine() {
        var api = {label: "3D 입체", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathSolid3D/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var TEXT_WIDTH = 300;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(√, π …)
            var GS_SYMBOLS = "˘°±·";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MARK_PT = 0.3;
            var DOT_RADIUS_MM = 0.6;
            var GUIDE_DASH = [2, 1.5];
            var CURVE_STEPS = 96;
            var PRESETS = ["직접 좌표", "n각기둥", "n각뿔", "원기둥", "원뿔", "구"];
            var DIRS = {u: [0, 1], d: [0, -1], l: [-1, 0], r: [1, 0], ul: [-1, 1], ur: [1, 1], dl: [-1, -1], dr: [1, -1]};
            var TEXT_KEYS = ["radiusText", "heightText", "pointsText", "segmentText", "dashedText", "dotText", "labelDirText"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var text = {radiusText: "2", heightText: "3", pointsText: "", segmentText: "", dashedText: "", dotText: "", labelDirText: ""};
            var preset = 1;
            var sides = 4;
            var showNames = true;
            var showHidden = true;
            var azimuthDeg = 20;
            var elevationDeg = 25;
            var sizeMm = 50;
            var fontPt = 8;
            var labelGapMm = 1.2;
            var strokePt = 0.8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {sides: sides, azimuthDeg: azimuthDeg, elevationDeg: elevationDeg, sizeMm: sizeMm, fontPt: fontPt,
                labelGapMm: labelGapMm, strokePt: strokePt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var solidPanel = addPanel(win, "입체");
            var inputs = {};
            var presetRow = solidPanel.add("group");
            presetRow.add("statictext", undefined, "도형:").preferredSize.width = LABEL_WIDTH;
            var presetList = presetRow.add("dropdownlist", undefined, PRESETS);
            presetList.selection = preset;
            presetList.helpTip = "직접 좌표는 아래 덧붙이기의 점·선분만 그린다";
            var sidesControls = addValueRow(solidPanel, "밑면 변 수", "", sides, 3, 8, 1, 0);
            addTextRow(solidPanel, "밑면 반지름", "radiusText", "밑면의 외접원 반지름(원기둥·원뿔·구는 반지름). 수·√·분수·π 가능. 정사각형 한 변이 a이면 a/√2");
            addTextRow(solidPanel, "높이", "heightText", "밑면에서 위까지 (구는 쓰지 않는다)");
            var checkRow = solidPanel.add("group");
            var nameCheck = checkRow.add("checkbox", undefined, "점 이름 쓰기");
            nameCheck.value = showNames;
            var hiddenCheck = checkRow.add("checkbox", undefined, "가려진 모서리 점선");
            hiddenCheck.value = showHidden;

            var extraPanel = addPanel(win, "덧붙이기");
            addTextRow(extraPanel, "점", "pointsText", "이름(x,y,z): P(2,0,1.5). 밑면이 z=0, 위가 +z, 앞이 -y. 직접 좌표 도형은 이 점들만 쓴다");
            addTextRow(extraPanel, "선분", "segmentText", "점 이름으로 잇는 실선: P-A3, A1-A3 (쉼표로 여러 개)");
            addTextRow(extraPanel, "점선", "dashedText", "점선 선분(높이·가려진 선): O-V");
            addTextRow(extraPanel, "점 찍기", "dotText", "점을 작은 원으로 찍는다. 원기둥·원뿔·구의 중심은 여기에 적을 때만 이름이 붙는다");
            addTextRow(extraPanel, "이름 방향", "labelDirText", "A1:ul, P:r (u 위, d 아래, l 왼쪽, r 오른쪽, ul·ur·dl·dr 대각선). 안 쓰면 그림 가운데에서 바깥쪽");

            var viewPanel = addPanel(win, "시점 · 크기");
            var azimuthControls = addValueRow(viewPanel, "방위각", "°", azimuthDeg, -80, 80, 1, 0);
            var elevationControls = addValueRow(viewPanel, "고도", "°", elevationDeg, 5, 80, 1, 0);
            var sizeControls = addValueRow(viewPanel, "그림 크기", "mm", sizeMm, 20, 140, 1, 0);
            var fontControls = addValueRow(viewPanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var gapControls = addValueRow(viewPanel, "글자 간격", "mm", labelGapMm, 0, 5, 0.1, 1);
            var strokeControls = addValueRow(viewPanel, "선 두께", "pt", strokePt, 0.1, 1.5, 0.1, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            presetList.onChange = function() { preset = presetList.selection ? presetList.selection.index : 0; refreshEnabled(); updatePreview(); };
            nameCheck.onClick = function() { showNames = nameCheck.value; updatePreview(); };
            hiddenCheck.onClick = function() { showHidden = hiddenCheck.value; updatePreview(); };
            bindValueRow(sidesControls, function(value) { sides = value; }, DEFAULTS.sides);
            bindValueRow(azimuthControls, function(value) { azimuthDeg = value; }, DEFAULTS.azimuthDeg);
            bindValueRow(elevationControls, function(value) { elevationDeg = value; }, DEFAULTS.elevationDeg);
            bindValueRow(sizeControls, function(value) { sizeMm = value; }, DEFAULTS.sizeMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, DEFAULTS.fontPt);
            bindValueRow(gapControls, function(value) { labelGapMm = value; }, DEFAULTS.labelGapMm);
            bindValueRow(strokeControls, function(value) { strokePt = value; }, DEFAULTS.strokePt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, DEFAULTS.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, DEFAULTS.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 그릴 것이 없으면 확정하지 않는다
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
                sidesControls.input.parent.enabled = preset === 1 || preset === 2;
            }

            function addTextRow(parent, label, key, tip) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + ":").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, text[key]);
                input.preferredSize.width = TEXT_WIDTH;
                input.helpTip = tip;
                input.onChange = function() { text[key] = input.text; updatePreview(); };
                inputs[key] = input;
            }
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
                var drawing = buildSolid3D();
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";
                if (drawing.lines.length === 0 && drawing.dots.length === 0) return;
                previewGroup = layer.groupItems.add();
                previewGroup.name = "3D 입체";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

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
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "mark" ? Math.min(MARK_PT, strokePt) : (line.kind === "axis" ? AXIS_PT : strokePt);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "dashed") path.strokeDashes = GUIDE_DASH;
            }
            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/°/g, "˘");
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var s;
                for (s = 0; label.sup && s < label.sup.length; s++) frame.textRange.characters[label.sup[s]].characterAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                for (s = 0; label.sub && s < label.sub.length; s++) frame.textRange.characters[label.sub[s]].characterAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var gap = labelGapMm * MM_TO_PT;
                if (label.halfAngle > 0 && label.halfAngle < Math.PI / 2) {
                    // 좁은 각의 글자가 두 변에 닿지 않게 꼭짓점에서 더 멀리
                    var near = gap + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                    var cx = label.at[0] + dir[0] * near, cy = label.at[1] + dir[1] * near;
                    var fit = Math.sqrt(halfW * halfW + halfH * halfH) / Math.sin(label.halfAngle);
                    var current = Math.sqrt((cx - label.vertex[0]) * (cx - label.vertex[0]) + (cy - label.vertex[1]) * (cy - label.vertex[1]));
                    if (fit > current) label.clear = fit - current;
                }
                var reach = (label.clear || 0) + gap + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }
            function applyTextFonts(frame, upright) {
                var contents = frame.contents;
                for (var i = 0; i < contents.length; i++) {
                    var code = contents.charCodeAt(i);
                    var attributes = frame.textRange.characters[i].characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126 && GS_SYMBOLS.indexOf(contents.charAt(i)) < 0) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && /[a-z]/.test(contents.charAt(i)) && !/[A-Za-z]/.test(contents.charAt(i - 1)) && !/[A-Za-z]/.test(contents.charAt(i + 1))) {
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
            function findEditableLayer() {
                var active = doc.activeLayer;
                if (!active.locked && active.visible) return active;
                for (var i = 0; i < doc.layers.length; i++) {
                    if (!doc.layers[i].locked && doc.layers[i].visible) return doc.layers[i];
                }
                return doc.layers.add();
            }
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
            function evalNumber(source) {
                var s = String(source).split("−").join("-").split("×").join("*").split("÷").join("/").split("π").join("pi").replace(/\s/g, "");
                if (s === "") return null;
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || s.substr(pos, 2) === "pi";
                }
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
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        if (peek() === "*") { pos++; value = value * unary(); }
                        else if (peek() === "/") { pos++; value = value / unary(); }
                        else value = value * unary();
                    }
                    return value;
                }
                function unary() {
                    if (peek() === "-") { pos++; return -unary(); }
                    if (peek() === "+") { pos++; return unary(); }
                    var base = atom();
                    if (peek() === "^") { pos++; return Math.pow(base, unary()); }
                    return base;
                }
                function atom() {
                    var ch = peek();
                    if (ch === "(") {
                        pos++;
                        var inner = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return inner;
                    }
                    if (ch === "√") {
                        pos++;
                        var arg = peek() === "(" ? atom() : number();
                        if (arg < 0) throw new Error("sqrt");
                        return Math.sqrt(arg);
                    }
                    if (s.substr(pos, 2) === "pi") { pos += 2; return Math.PI; }
                    return number();
                }
                function number() {
                    var begin = pos, dots = 0;
                    while (isDigit(peek()) || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var value = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(value)) throw new Error("number");
                    return value;
                }
                try {
                    var result = expression();
                    if (pos !== s.length || !isFinite(result)) return null;
                    return result;
                } catch (e) {
                    return null;
                }
            }
            function splitItems(source) {
                var out = [], depth = 0, current = "";
                var s = String(source);
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "(") depth++;
                    else if (ch === ")") depth = Math.max(0, depth - 1);
                    if (depth === 0 && (ch === "," || ch === ";" || ch === "\n" || ch === "\r")) { out.push(current); current = ""; } else current += ch;
                }
                out.push(current);
                var trimmed = [];
                for (var j = 0; j < out.length; j++) {
                    var item = out[j].replace(/^\s+|\s+$/g, "");
                    if (item !== "") trimmed.push(item);
                }
                return trimmed;
            }
            function tokenizeNames(source, names) {
                var s = String(source).replace(/[\s\-–−]/g, "");
                var sorted = names.slice().sort(function(a, b) { return b.length - a.length; });
                var out = [];
                var i = 0;
                while (i < s.length) {
                    var hit = null;
                    for (var k = 0; k < sorted.length; k++) {
                        if (s.substr(i, sorted[k].length) === sorted[k]) { hit = sorted[k]; break; }
                    }
                    if (hit === null) return null;
                    out.push(hit);
                    i += hit.length;
                }
                return out;
            }
            function display(source) {
                if (source.indexOf("^") < 0 && source.indexOf("_") < 0) return {text: source};
                var out = "", sup = [], sub = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) { marks.push(out.length); out += source.charAt(j); }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") { marks.push(out.length); out += source.charAt(++i); }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    out += ch;
                }
                return {text: out, sup: sup, sub: sub};
            }
            function straight(anchors, kind, closed) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({anchor: anchors[i], left: anchors[i], right: anchors[i]});
                return {points: points, kind: kind, closed: closed};
            }
            function unitVector(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length < 1e-9 ? [0, 0] : [v[0] / length, v[1] / length];
            }

            // -------------------------------------------------------
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-solid3d.js)
            // -------------------------------------------------------
            function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
            function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
            function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

            // 시점: 보는 쪽 d(대상에서 보는 사람 쪽), 화면 오른쪽 r, 화면 위 up
            function makeView(az, el) {
                var a = az * Math.PI / 180, e = el * Math.PI / 180;
                var d = [-Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e)];
                var r = [Math.cos(a), -Math.sin(a), 0];
                return {d: d, r: r, up: cross3(d, r)};
            }

            // 3D 점 목록 "A(0,0,0) B(1,2,3)". 숫자는 √·분수·π도 된다
            function parsePoints3D(source) {
                var s = String(source);
                var list = [], bad = [];
                var i = 0;
                while (i < s.length) {
                    var ch = s.charAt(i);
                    if (ch === " " || ch === "," || ch === ";" || ch === "\t" || ch === "\n" || ch === "\r") { i++; continue; }
                    var open = s.indexOf("(", i);
                    var close = open >= 0 ? s.indexOf(")", open) : -1;
                    if (open < 0 || close < 0) { bad.push(s.substring(i).replace(/\s+$/, "")); break; }
                    var name = s.substring(i, open).replace(/\s/g, "");
                    var parts = s.substring(open + 1, close).split(",");
                    var values = [];
                    for (var k = 0; k < parts.length; k++) values.push(evalNumber(parts[k]));
                    var ok = parts.length === 3 && values[0] !== null && values[1] !== null && values[2] !== null;
                    if (!ok) bad.push(s.substring(i, close + 1));
                    else if (name === "") bad.push("이름 없음: " + s.substring(open, close + 1));
                    else list.push({name: name, p: values});
                    i = close + 1;
                }
                return {list: list, bad: bad};
            }

            // 밑면 꼭짓점: 위에서 보아 반시계, 첫 점이 앞쪽 왼쪽 (n=4 → 225°)
            function ringPoint(R, n, i, z) {
                var ang = (270 - 180 / n + 360 * i / n) * Math.PI / 180;
                return [R * Math.cos(ang), R * Math.sin(ang), z];
            }

            // 다면체: faces는 꼭짓점 이름 목록(각 면). 모서리는 이웃한 이름 쌍, 면의 바깥 법선
            function polyhedron(table, faces) {
                var edges = [], keyIndex = {}, i, k, a, b;
                for (i = 0; i < faces.length; i++) {
                    for (k = 0; k < faces[i].length; k++) {
                        a = faces[i][k]; b = faces[i][(k + 1) % faces[i].length];
                        var key = a < b ? a + "|" + b : b + "|" + a;
                        if (!keyIndex.hasOwnProperty(key)) { keyIndex[key] = edges.length; edges.push({a: a, b: b, faces: []}); }
                        edges[keyIndex[key]].faces.push(i);
                    }
                }
                var center = [0, 0, 0], count = 0;
                for (var name in table) if (table.hasOwnProperty(name)) {
                    for (k = 0; k < 3; k++) center[k] += table[name][k];
                    count++;
                }
                for (k = 0; k < 3; k++) center[k] /= count;
                var normals = [];
                for (i = 0; i < faces.length; i++) {
                    var p0 = table[faces[i][0]], p1 = table[faces[i][1]], p2 = table[faces[i][2]];
                    var n3 = cross3(sub3(p1, p0), sub3(p2, p0));
                    var fc = [0, 0, 0];
                    for (k = 0; k < faces[i].length; k++) for (var c = 0; c < 3; c++) fc[c] += table[faces[i][k]][c] / faces[i].length;
                    if (dot3(n3, sub3(fc, center)) < 0) n3 = [-n3[0], -n3[1], -n3[2]];
                    normals.push(n3);
                }
                return {edges: edges, normals: normals};
            }

            // 프리셋: {names, table, labelled(이름을 쓸 점), poly(다면체), curves}
            function buildPreset(R, h) {
                var names = [], table = {}, labelled = {};
                var n = Math.min(8, Math.max(3, Math.round(sides)));
                function put(name, p, label) { names.push(name); table[name] = p; if (label) labelled[name] = true; }
                var i;
                if (preset === 1 || preset === 2) {
                    var ring = [], top = [];
                    for (i = 0; i < n; i++) {
                        // 기둥은 아래가 B, 위가 A. 뿔은 밑면이 A
                        var baseName = (preset === 1 ? "B" : "A") + (i + 1);
                        put(baseName, ringPoint(R, n, i, 0), true); ring.push(baseName);
                        if (preset === 1) { put("A" + (i + 1), ringPoint(R, n, i, h), true); top.push("A" + (i + 1)); }
                    }
                    var faces = [];
                    if (preset === 1) {
                        faces.push(top, ring);
                        for (i = 0; i < n; i++) faces.push([top[i], top[(i + 1) % n], ring[(i + 1) % n], ring[i]]);
                    } else {
                        put("P", [0, 0, h], true);
                        faces.push(ring);
                        for (i = 0; i < n; i++) faces.push([ring[i], ring[(i + 1) % n], "P"]);
                    }
                    return {names: names, table: table, labelled: labelled, poly: polyhedron(table, faces), curves: null};
                }
                if (preset === 3) { put("O1", [0, 0, h], false); put("O2", [0, 0, 0], false); return {names: names, table: table, labelled: labelled, poly: null, curves: "cylinder"}; }
                if (preset === 4) { put("V", [0, 0, h], true); put("O", [0, 0, 0], false); return {names: names, table: table, labelled: labelled, poly: null, curves: "cone"}; }
                if (preset === 5) { put("O", [0, 0, 0], false); return {names: names, table: table, labelled: labelled, poly: null, curves: "sphere"}; }
                return {names: names, table: table, labelled: labelled, poly: null, curves: null};
            }

            // 닫힌 곡선(원) 위의 점 목록 → 보이는/가려진 조각. flags[i]가 같은 점끼리 잇는다
            function ringRuns(ring, flags) {
                var n = ring.length, i, allSame = true;
                for (i = 1; i < n; i++) if (flags[i] !== flags[0]) allSame = false;
                if (allSame) return [{pts: ring.concat([ring[0]]), hidden: !flags[0]}];
                var start = 0;
                while (flags[start] === flags[(start - 1 + n) % n]) start++;
                var runs = [], cur = {pts: [], hidden: !flags[start]};
                for (var k = 0; k <= n; k++) {
                    i = (start + k) % n;
                    if (k < n && flags[i] === !cur.hidden) cur.pts.push(ring[i]);
                    else { cur.pts.push(ring[i]); runs.push(cur); cur = {pts: [ring[i]], hidden: !flags[i]}; }
                }
                var kept = [];
                for (k = 0; k < runs.length; k++) if (runs[k].pts.length > 1) kept.push(runs[k]);
                return kept;
            }

            function buildSolid3D() {
                var out = {lines: [], arrows: [], dots: [], texts: [], notes: []};
                var notes = out.notes;
                var R = evalNumber(text.radiusText), h = evalNumber(text.heightText);
                if (preset !== 0 && (R === null || !(R > 0))) notes.push("반지름(밑면의 외접원)을 확인하세요");
                if (preset !== 0 && preset !== 5 && (h === null || !(h > 0))) notes.push("높이를 확인하세요");
                if (notes.length > 0) return out;

                var pre = buildPreset(R === null ? 1 : R, h === null ? 1 : h);
                var user = parsePoints3D(text.pointsText);
                var i, k;
                for (i = 0; i < user.bad.length; i++) notes.push("점 " + user.bad[i]);
                var table = {}, names = [], userNames = {};
                for (i = 0; i < pre.names.length; i++) { table[pre.names[i]] = pre.table[pre.names[i]]; names.push(pre.names[i]); }
                for (i = 0; i < user.list.length; i++) {
                    if (table.hasOwnProperty(user.list[i].name)) notes.push("점 이름 겹침: " + user.list[i].name);
                    else { table[user.list[i].name] = user.list[i].p; names.push(user.list[i].name); userNames[user.list[i].name] = true; }
                }
                if (names.length === 0) { if (notes.length === 0) notes.push("점을 적어 주세요 (예: A(0,0,0) B(1,0,0))"); return out; }

                var view = makeView(azimuthDeg, Math.max(5, Math.min(80, elevationDeg)));
                function S(p) { return [dot3(p, view.r), dot3(p, view.up)]; }
                function readChains(source, label) {
                    var pairs = [];
                    var items = splitItems(source);
                    for (var a = 0; a < items.length; a++) {
                        var t = tokenizeNames(items[a], names);
                        if (t === null || t.length < 2) { notes.push(label + " " + items[a]); continue; }
                        for (var b = 0; b + 1 < t.length; b++) pairs.push([t[b], t[b + 1]]);
                    }
                    return pairs;
                }
                var solid = readChains(text.segmentText, "선분"), dashed = readChains(text.dashedText, "점선");
                var dotNames = [], dotItems = splitItems(text.dotText);
                for (i = 0; i < dotItems.length; i++) {
                    var dt = tokenizeNames(dotItems[i], names);
                    if (dt === null) notes.push("점 찍기 " + dotItems[i]); else for (k = 0; k < dt.length; k++) dotNames.push(dt[k]);
                }
                var dirOverride = {}, dirItems = splitItems(text.labelDirText);
                for (i = 0; i < dirItems.length; i++) {
                    var m = dirItems[i].split(":");
                    var nt = tokenizeNames(m[0], names);
                    var code = (m[1] || "").replace(/\s/g, "");
                    if (nt === null || nt.length !== 1 || !DIRS.hasOwnProperty(code)) { notes.push("글자 방향 " + dirItems[i]); continue; }
                    dirOverride[nt[0]] = code;
                }

                // 그릴 선들을 화면 좌표로 모은다: {pts, hidden, user}
                var lines = [];
                function nearSide(p, c) { return dot3(sub3(p, c), view.d) > 1e-9; }
                if (pre.poly) {
                    for (i = 0; i < pre.poly.edges.length; i++) {
                        var e = pre.poly.edges[i], visible = false;
                        for (k = 0; k < e.faces.length; k++) if (dot3(pre.poly.normals[e.faces[k]], view.d) > 1e-9) visible = true;
                        lines.push({pts: [S(table[e.a]), S(table[e.b])], hidden: !visible, user: false});
                    }
                }
                function circle3(z, r) {
                    var ring = [];
                    for (var s = 0; s < CURVE_STEPS; s++) {
                        var t = 2 * Math.PI * s / CURVE_STEPS;
                        ring.push([r * Math.cos(t), r * Math.sin(t), z]);
                    }
                    return ring;
                }
                function ringLines(ring3, centerZ, whole) {
                    var flags = [], pts = [];
                    for (var s = 0; s < ring3.length; s++) { pts.push(S(ring3[s])); flags.push(whole || nearSide(ring3[s], [0, 0, centerZ])); }
                    var runs = ringRuns(pts, flags);
                    for (var q = 0; q < runs.length; q++) lines.push({pts: runs[q].pts, hidden: runs[q].hidden, user: false});
                }
                var sphereRadius = 0;
                var bottom, xs, lo, hi;
                if (pre.curves === "cylinder" || pre.curves === "cone") {
                    bottom = circle3(0, R);
                    ringLines(bottom, 0, false);
                    if (pre.curves === "cylinder") {
                        ringLines(circle3(h, R), h, true);
                        // 옆면의 윤곽: 화면 가로로 가장 바깥인 두 점
                        xs = [];
                        for (i = 0; i < bottom.length; i++) xs.push(S(bottom[i])[0]);
                        lo = 0; hi = 0;
                        for (i = 1; i < xs.length; i++) { if (xs[i] < xs[lo]) lo = i; if (xs[i] > xs[hi]) hi = i; }
                        var sides2 = [lo, hi];
                        for (k = 0; k < 2; k++) lines.push({pts: [S(bottom[sides2[k]]), S([bottom[sides2[k]][0], bottom[sides2[k]][1], h])], hidden: false, user: false});
                    } else {
                        // 원뿔의 윤곽: 꼭짓점에서 밑면 타원에 그은 두 접선 (꼭짓점에서 본 각이 가장 큰·작은 점)
                        var apex = S([0, 0, h]), base0 = S([0, 0, 0]), axis = [base0[0] - apex[0], base0[1] - apex[1]];
                        var angs = [];
                        for (i = 0; i < bottom.length; i++) {
                            var q = S(bottom[i]), w = [q[0] - apex[0], q[1] - apex[1]];
                            angs.push(Math.atan2(axis[0] * w[1] - axis[1] * w[0], axis[0] * w[0] + axis[1] * w[1]));
                        }
                        lo = 0; hi = 0;
                        for (i = 1; i < angs.length; i++) { if (angs[i] < angs[lo]) lo = i; if (angs[i] > angs[hi]) hi = i; }
                        var tangents = [lo, hi];
                        for (k = 0; k < 2; k++) lines.push({pts: [apex, S(bottom[tangents[k]])], hidden: false, user: false});
                    }
                }
                if (pre.curves === "sphere") {
                    sphereRadius = R;
                    ringLines(circle3(0, R), 0, false);
                }
                for (i = 0; i < solid.length; i++) lines.push({pts: [S(table[solid[i][0]]), S(table[solid[i][1]])], hidden: false, user: true});
                for (i = 0; i < dashed.length; i++) lines.push({pts: [S(table[dashed[i][0]]), S(table[dashed[i][1]])], hidden: true, user: true});

                // 화면 크기에 맞추기
                var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
                function grow(p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
                for (i = 0; i < lines.length; i++) for (k = 0; k < lines[i].pts.length; k++) grow(lines[i].pts[k]);
                for (i = 0; i < names.length; i++) grow(S(table[names[i]]));
                if (sphereRadius > 0) { var sc = S([0, 0, 0]); grow([sc[0] - sphereRadius, sc[1] - sphereRadius]); grow([sc[0] + sphereRadius, sc[1] + sphereRadius]); }
                var extent = Math.max(x1 - x0, y1 - y0) || 1;
                var scale = sizeMm * MM_TO_PT / extent, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
                function T(p) { return [(p[0] - mx) * scale, (p[1] - my) * scale]; }

                if (sphereRadius > 0) {
                    var c = T(S([0, 0, 0])), rr = sphereRadius * scale, outline = [];
                    for (i = 0; i < CURVE_STEPS; i++) outline.push([c[0] + rr * Math.cos(2 * Math.PI * i / CURVE_STEPS), c[1] + rr * Math.sin(2 * Math.PI * i / CURVE_STEPS)]);
                    out.lines.push(straight(outline, "main", true));
                }
                for (i = 0; i < lines.length; i++) {
                    if (lines[i].hidden && !showHidden && !lines[i].user) continue;
                    var pts = [];
                    for (k = 0; k < lines[i].pts.length; k++) pts.push(T(lines[i].pts[k]));
                    out.lines.push(straight(pts, lines[i].hidden ? "dashed" : "main", false));
                }

                // 점 이름: 그림 가운데에서 바깥쪽으로. 프리셋의 중심 점은 이름을 쓰지 않는다(점 찍기에 적으면 쓴다)
                var cx = 0, cy = 0, inDots = {};
                for (i = 0; i < names.length; i++) { var cp = T(S(table[names[i]])); cx += cp[0]; cy += cp[1]; }
                var centroid = [cx / names.length, cy / names.length];
                for (i = 0; i < dotNames.length; i++) inDots[dotNames[i]] = true;
                if (showNames) {
                    for (i = 0; i < names.length; i++) {
                        var name = names[i];
                        if (!(pre.labelled.hasOwnProperty(name) || userNames.hasOwnProperty(name) || inDots.hasOwnProperty(name))) continue;
                        var at = T(S(table[name]));
                        var dir;
                        if (dirOverride.hasOwnProperty(name)) dir = unitVector(DIRS[dirOverride[name]]);
                        else {
                            dir = unitVector([at[0] - centroid[0], at[1] - centroid[1]]);
                            if (Math.abs(at[0] - centroid[0]) + Math.abs(at[1] - centroid[1]) < 1e-6) dir = [0, 1];
                        }
                        var label = display(name.replace(/^([A-Za-z])(\d+)$/, "$1_$2"));
                        label.at = at; label.dir = dir; label.upright = true;
                        out.texts.push(label);
                    }
                }
                for (i = 0; i < dotNames.length; i++) out.dots.push(T(S(table[dotNames[i]])));
                return out;
            }

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
                return {input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals};
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
            function parseNumber(source) {
                var value = parseFloat(String(source).replace(",", ".").replace(/[^0-9.\-]/g, ""));
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
            // 설정 저장 · 복원 (글은 encodeURIComponent로 | 가 섞이지 않게)
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v1"];
                for (var i = 0; i < TEXT_KEYS.length; i++) parts.push(encodeURIComponent(text[TEXT_KEYS[i]]));
                parts.push(preset, sides, showNames ? "1" : "0", showHidden ? "1" : "0", azimuthDeg, elevationDeg, sizeMm, fontPt, labelGapMm, strokePt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0");
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 21) return;
                try {
                    var restored = {};
                    for (var i = 0; i < TEXT_KEYS.length; i++) restored[TEXT_KEYS[i]] = decodeURIComponent(p[1 + i]);
                    for (i = 0; i < TEXT_KEYS.length; i++) text[TEXT_KEYS[i]] = restored[TEXT_KEYS[i]];
                    preset = Math.round(restoreNumber(p[8], preset, 0, PRESETS.length - 1));
                    sides = Math.round(restoreNumber(p[9], sides, 3, 8));
                    showNames = p[10] === "1";
                    showHidden = p[11] === "1";
                    azimuthDeg = restoreNumber(p[12], azimuthDeg, -80, 80);
                    elevationDeg = restoreNumber(p[13], elevationDeg, 5, 80);
                    sizeMm = restoreNumber(p[14], sizeMm, 20, 140);
                    fontPt = restoreNumber(p[15], fontPt, 5, 14);
                    labelGapMm = restoreNumber(p[16], labelGapMm, 0, 5);
                    strokePt = restoreNumber(p[17], strokePt, 0.1, 1.5);
                    offsetXmm = restoreNumber(p[18], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[19], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[20] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(source, fallback, minimum, maximum) {
                var value = parseNumber(source);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
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

            // 글자 서체 (02_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
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

            // 글자 서체 (02_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
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
