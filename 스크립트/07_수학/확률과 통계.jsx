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
var SCRIPT_KEY = "HighStatistics";

// 고등학교 확률과 통계: 경우의 수(도로망·색칠·최단 경로·원순열), 확률 수형도(곱셈정리·베이즈), 확률분포(정규·이항) 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 고등학교 수학은 과목별 스크립트 다섯 개(공통수학·수학Ⅰ·수학Ⅱ·확률과 통계·기하)로 나뉘어 있고, 탭마다 저장 키는 예전 그대로다.
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighStatistics/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

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
    var HEAD_PREF_KEY = "HighStatistics/head";
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
    var engines = [makeCountEngine(), makeProbTreeEngine(), makeDistributionEngine()];

    var win = new Window("dialog", "확률과 통계");
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

    // ==== 경우의 수 ====
    // 경우의 수 도식: 도로망(마을을 한 줄로 놓고 A-B:3처럼 준 도로 수만큼 곡선, 건너뛰는 도로는 가운데 마을 위로)과
    // 색칠 지도(가로 4칸, 가운데 원 + 네 조각, 위 한 칸 + 아래 세 칸), 격자 최단 경로(A 왼쪽 아래 → B 오른쪽 위, 지나는 점 P,
    // 막힌 길 ×, 교차점마다 A에서 오는 경로 수), 원순열(원탁·정사각형·직사각형 탁자에 둘러앉기)을 그린다. 선 0.8pt. 선택은 필요 없다.
    function makeCountEngine() {
        var api = {label: "경우의 수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathCount/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var DOT_RADIUS_MM = 0.8;
            var LABEL_GAP_MM = 1;
            var MODES = ["도로망", "색칠 지도", "격자 최단 경로", "원순열 (둘러앉기)"];
            var TABLES = ["원탁", "정사각형 탁자", "직사각형 탁자"];
            var MAPS = ["가로 4칸 (A~D)", "가운데 원 + 네 조각 (A~E)", "위 한 칸 + 아래 세 칸 (A~D)"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var mode = 0;
            var roadsText = "A-B:3, B-C:2, A-C:1";
            var townGapMm = 25;
            var roadGapMm = 4;
            var mapIndex = 1;
            var mapMm = 40;
            var gridCols = 5, gridRows = 3, gridCellMm = 8;
            var passText = "";
            var blockedText = "";
            var gridNumbers = true;
            var tableShape = 0, seatCount = 5, sideA = 2, sideB = 1, tableMm = 30;
            var seatNames = "";
            var rotationArrow = false;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {townGapMm: townGapMm, roadGapMm: roadGapMm, mapMm: mapMm, gridCols: gridCols, gridRows: gridRows, gridCellMm: gridCellMm, seatCount: seatCount, sideA: sideA, sideB: sideB, tableMm: tableMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var modeRow = win.add("group");
            modeRow.add("statictext", undefined, "종류:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;

            var roadPanel = addPanel(win, "도로망");
            var roadsRow = roadPanel.add("group");
            roadsRow.add("statictext", undefined, "도로:");
            var roadsInput = roadsRow.add("edittext", undefined, roadsText);
            roadsInput.preferredSize.width = 300;
            roadsInput.helpTip = "A-B:3, B-C:2처럼 '마을-마을:도로 수'를 쉼표로. 마을은 나온 순서대로 한 줄에 놓는다";
            var townControls = addValueRow(roadPanel, "마을 간격", "mm", townGapMm, 10, 60, 0.5, 1);
            var roadControls = addValueRow(roadPanel, "도로 간격", "mm", roadGapMm, 1.5, 10, 0.5, 1);
            var messageText = roadPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var mapPanel = addPanel(win, "색칠 지도", "fold1");
            var mapRow = mapPanel.add("group");
            mapRow.add("statictext", undefined, "모양:");
            var mapList = mapRow.add("dropdownlist", undefined, MAPS);
            mapList.selection = mapIndex;
            var mapControls = addValueRow(mapPanel, "크기", "mm", mapMm, 20, 100, 1, 0);

            var gridPanel = addPanel(win, "격자 최단 경로 (A 왼쪽 아래 → B 오른쪽 위)", "fold2");
            var colsControls = addValueRow(gridPanel, "가로", "칸", gridCols, 1, 10, 1, 0);
            var rowsControls = addValueRow(gridPanel, "세로", "칸", gridRows, 1, 10, 1, 0);
            var cellControls = addValueRow(gridPanel, "칸 크기", "mm", gridCellMm, 4, 20, 0.5, 1);
            var passRow = gridPanel.add("group");
            passRow.add("statictext", undefined, "지나는 점 P:");
            var passInput = passRow.add("edittext", undefined, passText);
            passInput.preferredSize.width = 60;
            passInput.helpTip = "A에서 가로로 2칸, 세로로 1칸이면 2,1. 비우면 없음";
            var gridNumbersCheck = passRow.add("checkbox", undefined, "교차점에 경로 수");
            gridNumbersCheck.value = gridNumbers;
            var blockedRow = gridPanel.add("group");
            blockedRow.add("statictext", undefined, "막힌 길:");
            var blockedInput = blockedRow.add("edittext", undefined, blockedText);
            blockedInput.preferredSize.width = 280;
            blockedInput.helpTip = "이웃한 두 교차점을 잇는 길. 1,0-2,0; 3,2-3,3처럼 세미콜론으로. 길 위에 ×를 그린다";
            var gridMessage = gridPanel.add("statictext", undefined, " ");
            gridMessage.preferredSize.width = 360;

            var seatPanel = addPanel(win, "원순열 (둘러앉기)", "fold3");
            var tableRow = seatPanel.add("group");
            tableRow.add("statictext", undefined, "탁자:");
            var tableList = tableRow.add("dropdownlist", undefined, TABLES);
            tableList.selection = tableShape;
            var arrowCheck = tableRow.add("checkbox", undefined, "회전 화살표");
            arrowCheck.value = rotationArrow;
            var seatControls = addValueRow(seatPanel, "원탁 인원", "명", seatCount, 3, 10, 1, 0);
            var sideAControls = addValueRow(seatPanel, "긴 변 인원", "명", sideA, 1, 4, 1, 0);
            sideAControls.input.helpTip = "정사각형 탁자는 모든 변이 이 인원";
            var sideBControls = addValueRow(seatPanel, "짧은 변 인원", "명", sideB, 0, 4, 1, 0);
            var tableControls = addValueRow(seatPanel, "탁자 크기", "mm", tableMm, 10, 80, 1, 0);
            var namesRow = seatPanel.add("group");
            namesRow.add("statictext", undefined, "이름:");
            var namesInput = namesRow.add("edittext", undefined, seatNames);
            namesInput.preferredSize.width = 280;
            namesInput.helpTip = "위 가운데 자리부터 시계 방향으로 쉼표로 (A, B, 엄마, 아빠). 비우면 A, B, C …, 모자라면 빈 자리";
            var seatMessage = seatPanel.add("statictext", undefined, " ");
            seatMessage.preferredSize.width = 360;

            var sizePanel = addPanel(win, "글자 · 위치");
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var offsetXControls = addValueRow(sizePanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(sizePanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            roadsInput.onChanging = function() { roadsText = roadsInput.text; updatePreview(); };
            mapList.onChange = function() { mapIndex = mapList.selection ? mapList.selection.index : 0; updatePreview(); };
            bindValueRow(townControls, function(value) { townGapMm = value; }, defaults.townGapMm);
            bindValueRow(roadControls, function(value) { roadGapMm = value; }, defaults.roadGapMm);
            bindValueRow(mapControls, function(value) { mapMm = value; }, defaults.mapMm);
            bindValueRow(colsControls, function(value) { gridCols = value; }, defaults.gridCols);
            bindValueRow(rowsControls, function(value) { gridRows = value; }, defaults.gridRows);
            bindValueRow(cellControls, function(value) { gridCellMm = value; }, defaults.gridCellMm);
            passInput.onChanging = function() { passText = passInput.text; updatePreview(); };
            blockedInput.onChanging = function() { blockedText = blockedInput.text; updatePreview(); };
            gridNumbersCheck.onClick = function() { gridNumbers = gridNumbersCheck.value; updatePreview(); };
            tableList.onChange = function() { tableShape = tableList.selection ? tableList.selection.index : 0; refreshEnabled(); updatePreview(); };
            arrowCheck.onClick = function() { rotationArrow = arrowCheck.value; updatePreview(); };
            bindValueRow(seatControls, function(value) { seatCount = value; }, defaults.seatCount);
            bindValueRow(sideAControls, function(value) { sideA = value; }, defaults.sideA);
            bindValueRow(sideBControls, function(value) { sideB = value; }, defaults.sideB);
            bindValueRow(tableControls, function(value) { tableMm = value; }, defaults.tableMm);
            namesInput.onChanging = function() { seatNames = namesInput.text; updatePreview(); };
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 도로를 못 읽으면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(mode === 2 ? gridMessage.text : messageText.text);
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
                roadPanel.enabled = mode === 0;
                mapPanel.enabled = mode === 1;
                gridPanel.enabled = mode === 2;
                seatPanel.enabled = mode === 3;
                seatControls.input.parent.enabled = tableShape === 0;
                sideAControls.input.parent.enabled = tableShape !== 0;
                sideBControls.input.parent.enabled = tableShape === 2;
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
                var drawing;
                if (mode === 0) {
                    var roads = parseRoads(roadsText);
                    if (roads === null || roads.edges.length === 0) {
                        messageText.text = "도로를 읽지 못함 (예: A-B:3, B-C:2)";
                        return;
                    }
                    messageText.text = " ";
                    drawing = buildRoads(roads, townGapMm * MM_TO_PT, roadGapMm * MM_TO_PT);
                } else if (mode === 1) {
                    drawing = buildMap(mapIndex, mapMm * MM_TO_PT);
                } else if (mode === 2) {
                    var pass = String(passText).replace(/\s/g, "") === "" ? null : parseLatticePoint(passText);
                    var blocked = parseBlocked(blockedText);
                    if ((pass === null && String(passText).replace(/\s/g, "") !== "") || blocked === null) {
                        gridMessage.text = pass === null && String(passText).replace(/\s/g, "") !== "" ? "P를 읽지 못함 (예: 2,1)" : "막힌 길을 읽지 못함 (예: 1,0-2,0; 3,2-3,3)";
                        return;
                    }
                    drawing = buildGrid(Math.round(gridCols), Math.round(gridRows), gridCellMm * MM_TO_PT, pass, blocked, gridNumbers);
                    gridMessage.text = drawing.note;
                } else {
                    drawing = buildSeats(tableShape, Math.round(seatCount), Math.round(sideA), Math.round(sideB), tableMm * MM_TO_PT, seatNames, rotationArrow, fontPt);
                    seatMessage.text = drawing.note;
                }
                previewGroup = layer.groupItems.add();
                previewGroup.name = MODES[mode];
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var c = 0; c < drawing.circles.length; c++) addCircle(drawing.circles[c]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                var b = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed}
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
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = true;
                path.fillColor = makeGray(0);
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

            // dir이 [0,0]이면 at에 가운데를 맞추고, 아니면 dir 쪽으로 간격을 둔다
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = label.small ? fontPt * 0.8 : fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (dir[0] === 0 && dir[1] === 0) ? 0 : (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자 GSMediumB1(기준선 +0.5pt). 마을·영역 이름은 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-count.js)
            // -------------------------------------------------------
            // "A-B:3, B-C:2" → {towns:["A","B","C"], edges:[{from, to, count}]}. 못 읽으면 null (글자 단위로 읽는다)
            function parseRoads(text) {
                var parts = String(text).split(","), towns = [], edges = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    var dash = part.indexOf("-"), colon = part.indexOf(":");
                    if (dash <= 0 || colon <= dash + 1 || colon === part.length - 1) return null;
                    var from = part.substring(0, dash), to = part.substring(dash + 1, colon), countText = part.substring(colon + 1);
                    for (var c = 0; c < countText.length; c++) if (countText.charAt(c) < "0" || countText.charAt(c) > "9") return null;
                    var count = parseInt(countText, 10);
                    if (count < 1 || count > 8 || from === to) return null;
                    if (indexOf(towns, from) < 0) towns.push(from);
                    if (indexOf(towns, to) < 0) towns.push(to);
                    edges.push({ from: indexOf(towns, from), to: indexOf(towns, to), count: count });
                }
                return { towns: towns, edges: edges };
            }

            function indexOf(list, value) {
                for (var i = 0; i < list.length; i++) if (list[i] === value) return i;
                return -1;
            }

            // 마을은 가로 한 줄. 이웃 마을 사이 도로는 가운데 기준 위아래로 나란히, 건너뛰는 도로는 위로 크게 휜다
            function buildRoads(roads, townGap, roadGap) {
                var out = { lines: [], circles: [], dots: [], texts: [] };
                var positions = [];
                for (var i = 0; i < roads.towns.length; i++) positions.push([i * townGap, 0]);
                for (var e = 0; e < roads.edges.length; e++) {
                    var edge = roads.edges[e];
                    var p = positions[Math.min(edge.from, edge.to)], q = positions[Math.max(edge.from, edge.to)];
                    var skip = Math.abs(edge.to - edge.from) - 1;
                    for (var k = 0; k < edge.count; k++) {
                        var height = skip > 0 ? townGap * 0.35 * skip + roadGap * (k + 1) : roadGap * (k - (edge.count - 1) / 2);
                        out.lines.push({ points: bentRoad(p, q, height), closed: false });
                    }
                }
                for (var t = 0; t < positions.length; t++) {
                    out.dots.push(positions[t]);
                    out.texts.push({ text: roads.towns[t], at: positions[t], dir: [0, -1], clear: DOT_RADIUS_MM * 2.834645669 });
                }
                return out;
            }

            // p에서 q로 가는 길. 가운데가 height만큼(위 +) 휘는 곡선 (2차 베지어를 3차로), 0이면 직선
            function bentRoad(p, q, height) {
                var mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + height * 2];   // 2차 베지어 조절점: 곡선 꼭대기가 height
                var h1 = [p[0] + (mid[0] - p[0]) * 2 / 3, p[1] + (mid[1] - p[1]) * 2 / 3];
                var h2 = [q[0] + (mid[0] - q[0]) * 2 / 3, q[1] + (mid[1] - q[1]) * 2 / 3];
                return [{ anchor: p, left: p, right: h1 }, { anchor: q, left: h2, right: q }];
            }

            // 색칠 지도: 바깥 사각형(가로 size, 세로 size·0.7)과 나누는 선, 영역 이름
            function buildMap(index, size) {
                var out = { lines: [], circles: [], dots: [], texts: [] };
                var w = size, h = size * 0.7;
                out.lines.push({ points: [plain([0, 0]), plain([w, 0]), plain([w, h]), plain([0, h])], closed: true });
                function cut(a, b) { out.lines.push({ points: [plain(a), plain(b)], closed: false }); }
                function name(text, x, y) { out.texts.push({ text: text, at: [x, y], dir: [0, 0] }); }
                if (index === 0) {
                    for (var i = 1; i < 4; i++) cut([w * i / 4, 0], [w * i / 4, h]);
                    for (var j = 0; j < 4; j++) name("ABCD".charAt(j), w * (j + 0.5) / 4, h / 2);
                } else if (index === 1) {
                    cut([w / 2, 0], [w / 2, h]);
                    cut([0, h / 2], [w, h / 2]);
                    out.circles.push({ center: [w / 2, h / 2], radius: h * 0.22 });
                    name("A", w / 4, h * 3 / 4); name("B", w * 3 / 4, h * 3 / 4);
                    name("C", w / 4, h / 4); name("D", w * 3 / 4, h / 4); name("E", w / 2, h / 2);
                } else {
                    cut([0, h / 2], [w, h / 2]);
                    cut([w / 3, 0], [w / 3, h / 2]);
                    cut([w * 2 / 3, 0], [w * 2 / 3, h / 2]);
                    name("A", w / 2, h * 3 / 4);
                    for (var k = 0; k < 3; k++) name("BCD".charAt(k), w * (k + 0.5) / 3, h / 4);
                }
                return out;
            }

            function plain(p) { return { anchor: p, left: p, right: p }; }

            // 둘러앉기: 탁자(원·정사각형·직사각형)와 자리(흰 원 + 이름). 자리는 위 가운데부터 시계 방향.
            // 경우의 수 = n! / (같은 배치가 되는 회전 수): 원탁 n, 정사각형 4, 직사각형 2
            function buildSeats(shape, count, sideA, sideB, size, namesText, arrow, fontSize) {
                var out = { lines: [], circles: [], dots: [], texts: [], note: "" };
                var seatR = Math.max(fontSize * 0.9, size * 0.07), gap = seatR * 1.5;
                var seats = [], turns;
                if (shape === 0) {
                    var R = size / 2;
                    out.circles.push({ center: [0, 0], radius: R });
                    for (var i = 0; i < count; i++) {
                        var angle = Math.PI / 2 - 2 * Math.PI * i / count;
                        seats.push([(R + gap) * Math.cos(angle), (R + gap) * Math.sin(angle)]);
                    }
                    turns = count;
                } else {
                    var perLong = sideA, perShort = shape === 1 ? sideA : sideB;
                    var w = size, h = shape === 1 ? size : size * 0.55;
                    out.lines.push({ points: [plain([-w / 2, -h / 2]), plain([w / 2, -h / 2]), plain([w / 2, h / 2]), plain([-w / 2, h / 2])], closed: true });
                    // 위 변(왼→오), 오른쪽 변(위→아래), 아래 변(오→왼), 왼쪽 변(아래→위)
                    function side(k, from, to, normal) {
                        for (var j = 0; j < k; j++) {
                            var t = (j + 0.5) / k;
                            seats.push([from[0] + (to[0] - from[0]) * t + normal[0] * gap, from[1] + (to[1] - from[1]) * t + normal[1] * gap]);
                        }
                    }
                    side(perLong, [-w / 2, h / 2], [w / 2, h / 2], [0, 1]);
                    side(perShort, [w / 2, h / 2], [w / 2, -h / 2], [1, 0]);
                    side(perLong, [w / 2, -h / 2], [-w / 2, -h / 2], [0, -1]);
                    side(perShort, [-w / 2, -h / 2], [-w / 2, h / 2], [-1, 0]);
                    // 정사각형은 90°마다, 직사각형은 180°마다 같은 배치
                    turns = shape === 1 ? 4 : 2;
                }
                var names = String(namesText).replace(/^\s+|\s+$/g, "") === "" ? [] : String(namesText).split(",");
                for (var s = 0; s < seats.length; s++) {
                    out.circles.push({ center: seats[s], radius: seatR });
                    var name = names.length === 0 ? String.fromCharCode(65 + s) : (s < names.length ? names[s].replace(/^\s+|\s+$/g, "") : "");
                    if (name !== "") out.texts.push({ text: name, at: seats[s], dir: [0, 0] });
                }
                // 회전 화살표: 탁자 오른쪽 위 바깥에서 시계 방향으로 도는 호와 V자 화살촉
                if (arrow) {
                    var r = (shape === 0 ? size / 2 : Math.sqrt(size * size / 4 + (shape === 1 ? size * size / 4 : size * size * 0.0756))) + gap + seatR * 2.2;
                    var a0 = Math.PI * 0.42, a1 = Math.PI * 0.08, k = 4 / 3 * Math.tan((a0 - a1) / 4);
                    var p0 = [r * Math.cos(a0), r * Math.sin(a0)], p1 = [r * Math.cos(a1), r * Math.sin(a1)];
                    out.lines.push({ points: [
                        { anchor: p0, left: p0, right: [p0[0] + r * k * Math.sin(a0), p0[1] - r * k * Math.cos(a0)] },
                        { anchor: p1, left: [p1[0] - r * k * Math.sin(a1), p1[1] + r * k * Math.cos(a1)], right: p1 }
                    ], closed: false });
                    var tangent = [Math.sin(a1), -Math.cos(a1)], normal = [Math.cos(a1), Math.sin(a1)], head = seatR * 0.8;
                    out.lines.push({ points: [
                        plain([p1[0] - tangent[0] * head + normal[0] * head * 0.6, p1[1] - tangent[1] * head + normal[1] * head * 0.6]),
                        plain(p1),
                        plain([p1[0] - tangent[0] * head - normal[0] * head * 0.6, p1[1] - tangent[1] * head - normal[1] * head * 0.6])
                    ], closed: false });
                }
                var n = seats.length, total = factorial(n) / turns;
                var how = shape === 0 ? "(" + n + "-1)! = " : n + "!/" + turns + " = ";
                out.note = TABLES[shape] + " " + n + "명: " + how + total + "가지";
                return out;
            }

            function factorial(n) {
                var value = 1;
                for (var i = 2; i <= n; i++) value *= i;
                return value;
            }

            // 격자 교차점 "2,1" 또는 "(2,1)" → [2, 1]. 못 읽으면 null
            function parseLatticePoint(text) {
                var s = String(text).replace(/[\s()]/g, ""), comma = s.indexOf(",");
                if (comma <= 0 || comma === s.length - 1) return null;
                var x = wholeNumber(s.substring(0, comma)), y = wholeNumber(s.substring(comma + 1));
                return x === null || y === null ? null : [x, y];
            }

            function wholeNumber(text) {
                if (text === "") return null;
                for (var i = 0; i < text.length; i++) if (text.charAt(i) < "0" || text.charAt(i) > "9") return null;
                return parseInt(text, 10);
            }

            // "1,0-2,0; 3,2-3,3" → ["1,0-2,0", "3,2-3,3"] (작은 쪽이 앞). 이웃한 두 교차점이 아니면 null, 빈 칸은 []
            function parseBlocked(text) {
                var parts = String(text).split(";"), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    var dash = part.indexOf("-");
                    if (dash < 0) return null;
                    var p = parseLatticePoint(part.substring(0, dash)), q = parseLatticePoint(part.substring(dash + 1));
                    if (p === null || q === null || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) !== 1) return null;
                    list.push(edgeKey(p, q));
                }
                return list;
            }

            function edgeKey(p, q) {
                var first = p[0] + p[1] < q[0] + q[1] ? p : q, second = first === p ? q : p;
                return first[0] + "," + first[1] + "-" + second[0] + "," + second[1];
            }

            // (x0, y0)에서 (x1, y1)까지 오른쪽·위로만 가는 최단 경로 수 (막힌 길 제외). 각 교차점의 수를 담은 표도 돌려준다
            function countPaths(x0, y0, x1, y1, blocked) {
                var ways = {};
                function key(x, y) { return x + "," + y; }
                function isBlocked(a, b) { for (var i = 0; i < blocked.length; i++) if (blocked[i] === edgeKey(a, b)) return true; return false; }
                for (var x = x0; x <= x1; x++) {
                    for (var y = y0; y <= y1; y++) {
                        if (x === x0 && y === y0) { ways[key(x, y)] = 1; continue; }
                        var total = 0;
                        if (x > x0 && !isBlocked([x - 1, y], [x, y])) total += ways[key(x - 1, y)];
                        if (y > y0 && !isBlocked([x, y - 1], [x, y])) total += ways[key(x, y - 1)];
                        ways[key(x, y)] = total;
                    }
                }
                return { total: ways[key(x1, y1)], ways: ways };
            }

            // 격자: 가로 cols칸, 세로 rows칸 (칸 크기 cell). 막힌 길에 ×, A·B(·P) 점과 이름, 교차점마다 A에서 오는 경로 수
            function buildGrid(cols, rows, cell, pass, blocked, numbers) {
                var out = { lines: [], circles: [], dots: [], texts: [], note: "" };
                for (var gx = 0; gx <= cols; gx++) out.lines.push({ points: [plain([gx * cell, 0]), plain([gx * cell, rows * cell])], closed: false });
                for (var gy = 0; gy <= rows; gy++) out.lines.push({ points: [plain([0, gy * cell]), plain([cols * cell, gy * cell])], closed: false });
                var inside = [];
                for (var b = 0; b < blocked.length; b++) {
                    var ends = blocked[b].split("-"), p = ends[0].split(","), q = ends[1].split(",");
                    var px = parseInt(p[0], 10), py = parseInt(p[1], 10), qx = parseInt(q[0], 10), qy = parseInt(q[1], 10);
                    if (Math.max(px, qx) > cols || Math.max(py, qy) > rows) continue;
                    inside.push(blocked[b]);
                    var mx = (px + qx) / 2 * cell, my = (py + qy) / 2 * cell, s = cell * 0.14;
                    out.lines.push({ points: [plain([mx - s, my - s]), plain([mx + s, my + s])], closed: false });
                    out.lines.push({ points: [plain([mx - s, my + s]), plain([mx + s, my - s])], closed: false });
                }
                var all = countPaths(0, 0, cols, rows, inside);
                out.dots.push([0, 0], [cols * cell, rows * cell]);
                out.texts.push({ text: "A", at: [0, 0], dir: [-0.7071, -0.7071] }, { text: "B", at: [cols * cell, rows * cell], dir: [0.7071, 0.7071] });
                if (numbers) {
                    for (var x = 0; x <= cols; x++) {
                        for (var y = 0; y <= rows; y++) {
                            if ((x === 0 && y === 0)) continue;
                            out.texts.push({ text: String(all.ways[x + "," + y]), at: [x * cell, y * cell], dir: [-0.7071, 0.7071], small: true });
                        }
                    }
                }
                var note = "A → B 최단 경로 " + all.total + "가지";
                if (pass !== null) {
                    if (pass[0] > cols || pass[1] > rows) note += " (P가 격자 밖)";
                    else {
                        var first = countPaths(0, 0, pass[0], pass[1], inside), second = countPaths(pass[0], pass[1], cols, rows, inside);
                        out.dots.push([pass[0] * cell, pass[1] * cell]);
                        out.texts.push({ text: "P", at: [pass[0] * cell, pass[1] * cell], dir: [0.7071, -0.7071] });
                        note += ", P를 지나는 경로 " + first.total + " × " + second.total + " = " + first.total * second.total + "가지";
                    }
                }
                out.note = note;
                return out;
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

            function bindValueRow(controls, setter, defaultValue) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(defaultValue); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, defaultValue) {
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
                controls.reset.onClick = function() { commit(defaultValue); };
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
                var parts = ["v3", mode, encodeURIComponent(roadsText), townGapMm, roadGapMm, mapIndex, mapMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
                    gridCols, gridRows, gridCellMm, encodeURIComponent(passText), encodeURIComponent(blockedText), gridNumbers ? "1" : "0",
                    tableShape, seatCount, sideA, sideB, tableMm, encodeURIComponent(seatNames), rotationArrow ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v3" || p.length !== 24) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    roadsText = decodeURIComponent(p[2]);
                    townGapMm = restoreNumber(p[3], townGapMm, 10, 60);
                    roadGapMm = restoreNumber(p[4], roadGapMm, 1.5, 10);
                    mapIndex = Math.round(restoreNumber(p[5], mapIndex, 0, MAPS.length - 1));
                    mapMm = restoreNumber(p[6], mapMm, 20, 100);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[10] === "1";
                    gridCols = Math.round(restoreNumber(p[11], gridCols, 1, 10));
                    gridRows = Math.round(restoreNumber(p[12], gridRows, 1, 10));
                    gridCellMm = restoreNumber(p[13], gridCellMm, 4, 20);
                    passText = decodeURIComponent(p[14]);
                    blockedText = decodeURIComponent(p[15]);
                    gridNumbers = p[16] === "1";
                    tableShape = Math.round(restoreNumber(p[17], tableShape, 0, TABLES.length - 1));
                    seatCount = Math.round(restoreNumber(p[18], seatCount, 3, 10));
                    sideA = Math.round(restoreNumber(p[19], sideA, 1, 4));
                    sideB = Math.round(restoreNumber(p[20], sideB, 0, 4));
                    tableMm = restoreNumber(p[21], tableMm, 10, 80);
                    seatNames = decodeURIComponent(p[22]);
                    rotationArrow = p[23] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 확률분포 ====
    // 확률분포 그림: 정규분포 N(m, σ²) 곡선(두 번째 분포를 겹쳐 비교할 수 있다)과 이항분포 B(n, p) 막대(정규분포 근사 곡선).
    // P(a≤X≤b), P(X≥a), P(X≤b) 영역을 칠하고, 확률(표준화한 Z 범위 포함)·평균·분산을 창에 보여 준다.
    // 축 아래 글자는 값(50, 60) 또는 문자(m, a, b, m+σ)로 고른다. 세로축은 두지 않는다(교과서·평가원 그림처럼).
    // 선 두께: 곡선 0.8pt, 축·막대 테두리 0.4pt, 평균 점선 0.3pt. 선택은 필요 없다.
    function makeDistributionEngine() {
        var api = {label: "확률분포", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathDistribution/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(σ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var CURVE_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            registerHead(ARROW);
            var TAIL_SIGMAS = 3.5;   // 곡선은 평균에서 ±3.5σ까지 (끝 높이가 꼭대기의 0.2%라 축에 닿아 보인다)
            var BAR_RATIO = 0.6;     // 막대 폭 / 막대 간격
            var MODES = ["정규분포", "이항분포"];
            var AXIS_NAMES = ["x", "z", "없음"];
            var SHADES = ["칠하지 않음", "a ≤ X ≤ b", "X ≥ a", "X ≤ b"];
            var LABELS = ["값", "문자 (m, a, b)"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["second", "meanLine", "sigmaTicks", "approx"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var mode = 0;
            var axisName = 0;
            var mean = 50, sigma = 10;
            var mean2 = 60, sigma2 = 5;
            var trials = 10, chance = 0.5;
            var shade = 1;
            var labelKind = 0;
            var aValue = 40, bValue = 70;
            var widthMm = 80, heightMm = 25;
            var shadeK = 20;
            var fontPt = 8;
            var opt = { second: false, meanLine: true, sigmaTicks: false, approx: false };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {mean: mean, sigma: sigma, mean2: mean2, sigma2: sigma2, trials: trials, chance: chance, aValue: aValue, bValue: bValue, shadeK: shadeK, widthMm: widthMm, heightMm: heightMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var distPanel = addPanel(win, "분포");
            var modeRow = distPanel.add("group");
            modeRow.add("statictext", undefined, "종류:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;
            modeRow.add("statictext", undefined, "축 이름:");
            var axisList = modeRow.add("dropdownlist", undefined, AXIS_NAMES);
            axisList.selection = axisName;
            var meanControls = addValueRow(distPanel, "평균 m", "", mean, -500, 500, 0.5, 1);
            var sigmaControls = addValueRow(distPanel, "표준편차 σ", "", sigma, 0.1, 100, 0.1, 1);
            var secondRow = distPanel.add("group");
            var secondCheck = secondRow.add("checkbox", undefined, "두 번째 정규분포 겹치기");
            bindOption(secondCheck, "second");
            var mean2Controls = addValueRow(distPanel, "평균 m₂", "", mean2, -500, 500, 0.5, 1);
            var sigma2Controls = addValueRow(distPanel, "표준편차 σ₂", "", sigma2, 0.1, 100, 0.1, 1);
            var trialsControls = addValueRow(distPanel, "시행 횟수 n", "", trials, 1, 40, 1, 0);
            var chanceControls = addValueRow(distPanel, "확률 p", "", chance, 0.01, 0.99, 0.01, 2);

            var probPanel = addPanel(win, "확률");
            var shadeRow = probPanel.add("group");
            shadeRow.add("statictext", undefined, "칠하기:");
            var shadeList = shadeRow.add("dropdownlist", undefined, SHADES);
            shadeList.selection = shade;
            shadeRow.add("statictext", undefined, "글자:");
            var labelList = shadeRow.add("dropdownlist", undefined, LABELS);
            labelList.selection = labelKind;
            var aControls = addValueRow(probPanel, "a", "", aValue, -500, 500, 0.5, 1);
            var bControls = addValueRow(probPanel, "b", "", bValue, -500, 500, 0.5, 1);
            var shadeControls = addValueRow(probPanel, "음영", "K", shadeK, 5, 60, 5, 0);

            var stylePanel = addPanel(win, "표시", "fold4");
            var widthControls = addValueRow(stylePanel, "너비", "mm", widthMm, 30, 200, 1, 0);
            var heightControls = addValueRow(stylePanel, "높이", "mm", heightMm, 10, 100, 1, 0);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var checkRow = stylePanel.add("group");
            var meanCheck = checkRow.add("checkbox", undefined, "평균 점선");
            bindOption(meanCheck, "meanLine");
            var sigmaCheck = checkRow.add("checkbox", undefined, "m±σ, m±2σ 눈금");
            bindOption(sigmaCheck, "sigmaTicks");
            var approxCheck = checkRow.add("checkbox", undefined, "정규분포 근사");
            approxCheck.helpTip = "이항분포 막대 위에 N(np, np(1-p)) 곡선을 겹친다";
            bindOption(approxCheck, "approx");

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
            axisList.onChange = function() { axisName = axisList.selection ? axisList.selection.index : 0; updatePreview(); };
            bindValueRow(meanControls, function(value) { mean = value; }, defaults.mean);
            bindValueRow(sigmaControls, function(value) { sigma = value; }, defaults.sigma);
            bindValueRow(mean2Controls, function(value) { mean2 = value; }, defaults.mean2);
            bindValueRow(sigma2Controls, function(value) { sigma2 = value; }, defaults.sigma2);
            bindValueRow(trialsControls, function(value) { trials = value; }, defaults.trials);
            bindValueRow(chanceControls, function(value) { chance = value; }, defaults.chance);
            shadeList.onChange = function() { shade = shadeList.selection ? shadeList.selection.index : 0; refreshEnabled(); updatePreview(); };
            labelList.onChange = function() { labelKind = labelList.selection ? labelList.selection.index : 0; updatePreview(); };
            bindValueRow(aControls, function(value) { aValue = value; }, defaults.aValue);
            bindValueRow(bControls, function(value) { bValue = value; }, defaults.bValue);
            bindValueRow(shadeControls, function(value) { shadeK = value; }, defaults.shadeK);
            bindValueRow(widthControls, function(value) { widthMm = value; }, defaults.widthMm);
            bindValueRow(heightControls, function(value) { heightMm = value; }, defaults.heightMm);
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

            function refreshEnabled() {
                var normal = mode === 0;
                meanControls.input.parent.enabled = normal;
                sigmaControls.input.parent.enabled = normal;
                secondRow.enabled = normal;
                mean2Controls.input.parent.enabled = normal;
                sigma2Controls.input.parent.enabled = normal;
                trialsControls.input.parent.enabled = !normal;
                chanceControls.input.parent.enabled = !normal;
                sigmaCheck.enabled = normal;
                approxCheck.enabled = !normal;
                aControls.input.parent.enabled = shade === 1 || shade === 2;
                bControls.input.parent.enabled = shade === 1 || shade === 3;
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
                var o = {
                    width: widthMm * MM_TO_PT, height: heightMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, shadeK: shadeK,
                    axisName: axisName < 2 ? AXIS_NAMES[axisName] : "", shade: shade, a: aValue, b: bValue, letters: labelKind === 1,
                    meanLine: opt.meanLine
                };
                var drawing;
                if (mode === 0) {
                    o.curves = [{ m: mean, s: sigma }];
                    if (opt.second) o.curves.push({ m: mean2, s: sigma2 });
                    o.sigmaTicks = opt.sigmaTicks;
                    drawing = buildNormal(o);
                } else {
                    o.n = Math.round(trials);
                    o.p = chance;
                    o.approx = opt.approx;
                    drawing = buildBinomial(o);
                }
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join(" · ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "확률분포";
                for (var s = 0; s < drawing.fills.length; s++) addFill(drawing.fills[s]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] - o.width / 2 + offsetXmm * MM_TO_PT, viewCenter[1] - o.height / 2 + offsetYmm * MM_TO_PT);
            }

            // 칠한 영역·막대: {points:[{anchor,left,right}], k, stroked}
            function addFill(fill) {
                var path = previewGroup.pathItems.add();
                setBezier(path, fill.points);
                path.closed = true;
                path.filled = fill.k > 0;
                if (fill.k > 0) path.fillColor = makeGray(fill.k);
                path.stroked = !!fill.stroked;
                if (fill.stroked) {
                    path.strokeColor = makeGray(100);
                    path.strokeWidth = AXIS_PT;
                    path.strokeJoin = StrokeJoin.MITERENDJOIN;
                }
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"curve"|"guide"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                setBezier(path, line.points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "curve" ? CURVE_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function setBezier(path, points) {
                var anchors = [], curved = false;
                for (var i = 0; i < points.length; i++) {
                    anchors.push(points[i].anchor);
                    if (points[i].left !== points[i].anchor || points[i].right !== points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (!curved) return;
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                }
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sub: 아래첨자 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                if (label.sub) {
                    for (var s = 0; s < label.sub.length; s++) {
                        var subAttributes = frame.textRange.characters[label.sub[s]].characterAttributes;
                        subAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
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
            // GSMediumB1에 없는 기호(σ)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-distribution.js). 그림은 (0,0)~(width, height)
            // -------------------------------------------------------
            // 정규분포: o.curves [{m, s}], 가장 높은 꼭대기가 height, 모든 곡선의 ±3.5σ가 가로 길이에 들어간다
            function buildNormal(o) {
                var out = { fills: [], lines: [], arrows: [], texts: [], notes: [] };
                var lo = Infinity, hi = -Infinity, peak = 0;
                for (var i = 0; i < o.curves.length; i++) {
                    var c = o.curves[i];
                    lo = Math.min(lo, c.m - TAIL_SIGMAS * c.s);
                    hi = Math.max(hi, c.m + TAIL_SIGMAS * c.s);
                    peak = Math.max(peak, normalDensity(c.m, c.m, c.s));
                }
                var sx = o.width / (hi - lo), sy = o.height / peak;
                function X(v) { return (v - lo) * sx; }
                var first = o.curves[0];
                var range = shadeRange(o, lo, hi);

                // 칠하기 (첫 번째 분포)
                if (range !== null) {
                    var edge = normalPoints(first.m, first.s, range[0], range[1], lo, sx, sy);
                    var closing = straight([[X(range[1]), 0], [X(range[0]), 0]]);
                    out.fills.push({ points: edge.concat(closing), k: o.shadeK });
                    // 한쪽 확률은 그림 밖(±3.5σ 너머)의 꼬리까지 더한다
                    var upper = o.shade === 2 ? 1 : normalCdf((range[1] - first.m) / first.s);
                    var lower = o.shade === 3 ? 0 : normalCdf((range[0] - first.m) / first.s);
                    var p = upper - lower;
                    out.notes.push(probabilityText(o, range, first) + " = " + formatValue(p, 4));
                }

                addAxis(out, o, 0, o.width);
                for (var k = 0; k < o.curves.length; k++) {
                    var curve = o.curves[k];
                    out.lines.push({ points: normalPoints(curve.m, curve.s, curve.m - TAIL_SIGMAS * curve.s, curve.m + TAIL_SIGMAS * curve.s, lo, sx, sy), kind: "curve" });
                    if (o.meanLine) out.lines.push({ points: straight([[X(curve.m), 0], [X(curve.m), normalDensity(curve.m, curve.m, curve.s) * sy]]), kind: "guide" });
                }

                // 축 아래 글자: 평균, (m±σ, m±2σ), a·b. 같은 자리의 글자는 하나만
                var marks = [];
                for (var m = 0; m < o.curves.length; m++) {
                    var name = o.curves.length > 1 ? "m" + (m + 1) : "m";
                    marks.push({ v: o.curves[m].m, text: o.letters ? name : formatValue(o.curves[m].m, 2), sub: o.letters && o.curves.length > 1 ? [1] : null });
                }
                if (o.sigmaTicks) {
                    var steps = [-2, -1, 1, 2];
                    for (var st = 0; st < steps.length; st++) {
                        var n = steps[st], letter = (n < 0 ? "-" : "+") + (Math.abs(n) === 1 ? "" : String(Math.abs(n))) + "σ";
                        marks.push({ v: first.m + n * first.s, text: o.letters ? "m" + letter : formatValue(first.m + n * first.s, 2) });
                    }
                }
                addRangeMarks(marks, o, range);
                placeMarks(out, marks, X, o.tick);
                return out;
            }

            // 이항분포 B(n, p): k = 0 … n 막대, 가장 높은 막대가 height. 칠하는 범위의 막대는 K로
            function buildBinomial(o) {
                var out = { fills: [], lines: [], arrows: [], texts: [], notes: [] };
                var n = o.n, p = o.p, probs = [], top = 0;
                for (var k = 0; k <= n; k++) {
                    probs.push(binomialProbability(n, k, p));
                    top = Math.max(top, probs[k]);
                }
                var mu = n * p, variance = n * p * (1 - p), sd = Math.sqrt(variance);
                if (o.approx) top = Math.max(top, normalDensity(mu, mu, sd));
                var step = o.width / (n + 2), sy = o.height / top;
                function X(v) { return (v + 1) * step; }
                var range = shadeRange(o, -0.5, n + 0.5);
                var sum = 0;
                for (var b = 0; b <= n; b++) {
                    var shaded = range !== null && b >= range[0] - 1e-9 && b <= range[1] + 1e-9;
                    if (shaded) sum += probs[b];
                    var h = probs[b] * sy, half = step * BAR_RATIO / 2;
                    if (h < 0.05) continue;
                    out.fills.push({ points: straight([[X(b) - half, 0], [X(b) + half, 0], [X(b) + half, h], [X(b) - half, h]]), k: shaded ? o.shadeK : 0, stroked: true });
                }
                out.notes.push("E(X) = " + formatValue(mu, 2) + ", V(X) = " + formatValue(variance, 2) + ", σ(X) = " + formatValue(sd, 2));
                if (range !== null) out.notes.push(probabilityText(o, range, null) + " = " + formatValue(sum, 4));

                addAxis(out, o, 0, o.width);
                if (o.approx && sd > 0) {
                    var from = Math.max(-1, mu - TAIL_SIGMAS * sd), to = Math.min(n + 1, mu + TAIL_SIGMAS * sd);
                    out.lines.push({ points: normalPoints(mu, sd, from, to, -1, step, sy), kind: "curve" });
                }
                if (o.meanLine) out.lines.push({ points: straight([[X(mu), 0], [X(mu), o.height]]), kind: "guide" });

                // 막대 아래 k (많으면 5칸마다)
                var every = n <= 15 ? 1 : 5, marks = [];
                for (var t = 0; t <= n; t += every) marks.push({ v: t, text: String(t), tickless: true });
                addRangeMarks(marks, o, range);
                placeMarks(out, marks, X, o.tick);
                return out;
            }

            // 칠할 x 범위 [시작, 끝] (그림 범위로 자른다). 칠하지 않으면 null
            function shadeRange(o, lo, hi) {
                if (o.shade === 0) return null;
                var from = o.shade === 1 ? Math.min(o.a, o.b) : (o.shade === 2 ? o.a : lo);
                var to = o.shade === 1 ? Math.max(o.a, o.b) : (o.shade === 2 ? hi : o.b);
                from = Math.max(from, lo);
                to = Math.min(to, hi);
                return to - from > 1e-9 ? [from, to] : null;
            }

            // a·b 글자 (칠하는 쪽 끝만)
            function addRangeMarks(marks, o, range) {
                if (range === null) return;
                if (o.shade !== 3) marks.push({ v: o.a, text: o.letters ? "a" : formatValue(o.a, 2) });
                if (o.shade !== 2) marks.push({ v: o.b, text: o.letters ? "b" : formatValue(o.b, 2) });
            }

            function placeMarks(out, marks, X, tick) {
                var used = [];
                for (var i = 0; i < marks.length; i++) {
                    var x = X(marks[i].v), taken = false;
                    for (var j = 0; j < used.length; j++) if (Math.abs(used[j] - x) < 0.5) taken = true;
                    if (taken) continue;
                    used.push(x);
                    if (!marks[i].tickless) out.lines.push({ points: straight([[x, -tick / 2], [x, tick / 2]]), kind: "axis" });
                    var label = { text: marks[i].text, at: [x, 0], dir: [0, -1], clear: tick / 2, upright: !isNaN(parseFloat(marks[i].text)) };
                    if (marks[i].sub) label.sub = marks[i].sub;
                    out.texts.push(label);
                }
            }

            function addAxis(out, o, left, right) {
                var margin = o.width * 0.04, end = right + margin + ARROW.length;
                out.lines.push({ points: straight([[left - margin, 0], [end - ARROW.length + ARROW.notch, 0]]), kind: "axis" });
                out.arrows.push({ tip: [end, 0], dir: [1, 0] });
                if (o.axisName) out.texts.push({ text: o.axisName, at: [end, 0], dir: [0, -1] });
            }

            // P(a≤X≤b) = P(-1≤Z≤2). first가 없으면(이항분포) 표준화하지 않는다
            function probabilityText(o, range, first) {
                var v = o.axisName === "z" ? "Z" : "X";
                function part(a, b, fa, fb) {
                    if (o.shade === 2) return "P(" + v + "≥" + fa(a) + ")";
                    if (o.shade === 3) return "P(" + v + "≤" + fb(b) + ")";
                    return "P(" + fa(a) + "≤" + v + "≤" + fb(b) + ")";
                }
                function plain(value) { return formatValue(value, 2); }
                var text = part(range[0], range[1], plain, plain);
                if (first && v === "X") {
                    v = "Z";
                    text += " = " + part(range[0], range[1],
                        function(value) { return formatValue((value - first.m) / first.s, 2); },
                        function(value) { return formatValue((value - first.m) / first.s, 2); });
                }
                return text;
            }

            // 정규분포 곡선 [from, to]를 베지어로. 앵커는 끝점과 그 사이 평균에서 0.5σ 간격 (에르미트 → 베지어)
            function normalPoints(m, s, from, to, lo, sx, sy) {
                var xs = [from], k = Math.floor((from - m) / (s / 2)) + 1;
                for (var x = m + k * s / 2; x < to - s * 1e-6; x = m + (++k) * s / 2) if (x > from + s * 1e-6) xs.push(x);
                xs.push(to);
                var out = [];
                for (var i = 0; i < xs.length; i++) {
                    var v = xs[i], y = normalDensity(v, m, s), slope = -(v - m) / (s * s) * y;
                    var anchor = [(v - lo) * sx, y * sy], left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (v - xs[i - 1]) / 3;
                        left = [(v - hl - lo) * sx, (y - slope * hl) * sy];
                    }
                    if (i < xs.length - 1) {
                        var hr = (xs[i + 1] - v) / 3;
                        right = [(v + hr - lo) * sx, (y + slope * hr) * sy];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
            }

            function normalDensity(x, m, s) {
                var z = (x - m) / s;
                return Math.exp(-z * z / 2) / (s * Math.sqrt(2 * Math.PI));
            }

            // 표준정규분포의 누적확률 P(Z≤z). erf 근사 (Abramowitz–Stegun 7.1.26, 오차 1.5e-7)
            function normalCdf(z) {
                var x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
                var erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
                return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
            }

            function binomialProbability(n, k, p) {
                var c = 1;
                for (var i = 1; i <= k; i++) c = c * (n - k + i) / i;
                return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
            }

            function straight(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return points;
            }

            // 소수 digits자리까지, 뒤의 0은 뺀다
            function formatValue(v, digits) {
                var scale = Math.pow(10, digits), r = Math.round(v * scale) / scale;
                return String(r === 0 ? 0 : r);
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

            function bindValueRow(controls, setter, defaultValue) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(defaultValue); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, defaultValue) {
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
                controls.reset.onClick = function() { commit(defaultValue); };
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
                var parts = ["v1", mode, axisName, mean, sigma, mean2, sigma2, trials, chance, shade, labelKind, aValue, bValue, shadeK,
                    widthMm, heightMm, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 21 || p[17].length !== FLAG_KEYS.length) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    axisName = Math.round(restoreNumber(p[2], axisName, 0, AXIS_NAMES.length - 1));
                    mean = restoreNumber(p[3], mean, -500, 500);
                    sigma = restoreNumber(p[4], sigma, 0.1, 100);
                    mean2 = restoreNumber(p[5], mean2, -500, 500);
                    sigma2 = restoreNumber(p[6], sigma2, 0.1, 100);
                    trials = Math.round(restoreNumber(p[7], trials, 1, 40));
                    chance = restoreNumber(p[8], chance, 0.01, 0.99);
                    shade = Math.round(restoreNumber(p[9], shade, 0, SHADES.length - 1));
                    labelKind = Math.round(restoreNumber(p[10], labelKind, 0, LABELS.length - 1));
                    aValue = restoreNumber(p[11], aValue, -500, 500);
                    bValue = restoreNumber(p[12], bValue, -500, 500);
                    shadeK = restoreNumber(p[13], shadeK, 5, 60);
                    widthMm = restoreNumber(p[14], widthMm, 30, 200);
                    heightMm = restoreNumber(p[15], heightMm, 10, 100);
                    fontPt = restoreNumber(p[16], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[17].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[18], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[19], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[20] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 확률 수형도 ====
    // 확률 수형도: 두 단계 수형도의 가지마다 확률을 적고 끝에 곱(곱셈정리)을 붙인다.
    // 1단계 "A 0.3, B 0.7", 2단계 "E 0.8, Eᶜ 0.2 | E 0.4, Eᶜ 0.6" (1단계 가지마다 |로 나눔, 하나면 모든 가지에 같게).
    // 확률은 소수·분수(1/3) 모두 되고, 분수를 쓰면 곱도 기약분수로 적는다. 관심 사건(E)을 주면
    // P(E) = 끝 확률의 합, P(A|E) = P(A∩E)/P(E) (베이즈)를 창에 보여 준다. 합이 1이 아닌 묶음은 알려 준다.
    // 선 0.4pt. 선택은 필요 없다.
    function makeProbTreeEngine() {
        var api = {label: "확률 수형도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighStatisticsProbTree/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(ᶜ, × …)
            var ENG_BASELINE_PT = 0.5;
            var LINE_PT = 0.4;
            var LABEL_GAP_MM = 0.8;

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var firstText = "A 0.3, B 0.7";
            var secondText = "E 0.8, Eᶜ 0.2 | E 0.4, Eᶜ 0.6";
            var eventText = "E";
            var showProducts = true;
            var stageMm = 22;
            var rowMm = 8;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var defaults = {stageMm: stageMm, rowMm: rowMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var treePanel = addPanel(win, "가지와 확률");
            var firstRow = treePanel.add("group");
            firstRow.add("statictext", undefined, "1단계:").preferredSize.width = 44;
            var firstInput = firstRow.add("edittext", undefined, firstText);
            firstInput.preferredSize.width = 290;
            firstInput.helpTip = "이름 확률을 쉼표로: A 0.3, B 0.7 또는 주머니1 1/2, 주머니2 1/2";
            var secondRow = treePanel.add("group");
            secondRow.add("statictext", undefined, "2단계:").preferredSize.width = 44;
            var secondInput = secondRow.add("edittext", undefined, secondText);
            secondInput.preferredSize.width = 290;
            secondInput.helpTip = "1단계 가지마다 |로 나눈다 (E 0.8, Eᶜ 0.2 | E 0.4, Eᶜ 0.6). 묶음이 하나면 모든 가지에 같게. 비우면 1단계만";
            var eventRow = treePanel.add("group");
            eventRow.add("statictext", undefined, "관심 사건:").preferredSize.width = 60;
            var eventInput = eventRow.add("edittext", undefined, eventText);
            eventInput.preferredSize.width = 60;
            eventInput.helpTip = "2단계 가지 이름. P(E)와 P(1단계|E)를 계산한다. 비우면 계산하지 않는다";
            var productsCheck = eventRow.add("checkbox", undefined, "끝에 곱 적기");
            productsCheck.value = showProducts;
            var stageControls = addValueRow(treePanel, "단계 간격", "mm", stageMm, 10, 60, 0.5, 1);
            var rowControls = addValueRow(treePanel, "줄 간격", "mm", rowMm, 4, 20, 0.5, 1);
            var fontControls = addValueRow(treePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            firstInput.onChanging = function() { firstText = firstInput.text; updatePreview(); };
            secondInput.onChanging = function() { secondText = secondInput.text; updatePreview(); };
            eventInput.onChanging = function() { eventText = eventInput.text; updatePreview(); };
            productsCheck.onClick = function() { showProducts = productsCheck.value; updatePreview(); };
            bindValueRow(stageControls, function(value) { stageMm = value; }, defaults.stageMm);
            bindValueRow(rowControls, function(value) { rowMm = value; }, defaults.rowMm);
            bindValueRow(fontControls, function(value) { fontPt = value; }, defaults.fontPt);
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true, defaults.offsetXmm);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false, defaults.offsetYmm);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 가지를 못 읽으면 확정하지 않는다
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
                var tree = parseTree(firstText, secondText);
                if (tree.error) {
                    messageText.text = tree.error;
                    return;
                }
                var drawing = buildProbTree(tree, stageMm * MM_TO_PT, rowMm * MM_TO_PT, showProducts, eventText);
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "확률 수형도";
                for (var i = 0; i < drawing.lines.length; i++) addLine(drawing.lines[i]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                var b = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT, viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            function addLine(points) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = LINE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
            }

            // at에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다. small: 80% 크기 (가지 위 확률)
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = label.small ? fontPt * 0.85 : fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = LABEL_GAP_MM * MM_TO_PT * (label.small ? 0.5 : 1) + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/한글·영문 서체 적용.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 그 밖의 기호(ᶜ, ×)는 HancomEQN.
            // 사건 이름·확률은 똑바로 쓴다 (교과서 수형도)
            // ᶜ는 HancomEQN에도 글리프가 없어 네모로 나온다 → 일반 c를 위첨자로 (벤다이어그램 탭과 같게)
            function applyTextFonts(frame) {
                var original = frame.contents;
                var text = original.replace(/ᶜ/g, "c");
                if (text !== original) frame.contents = text;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if (original.charCodeAt(i) === 0x1D9C) {
                        attributes.textFont = engFont;
                        attributes.baselineShift = 0;
                        attributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    } else if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-prob-tree.js). 확률은 분수 {n, d}로 계산한다
            // -------------------------------------------------------
            // "0.3" → {n:3, d:10}, "1/3" → {n:1, d:3}, "2" → {n:2, d:1}. 못 읽으면 null
            function parseProbability(text) {
                var s = String(text).replace(/\s/g, "");
                var slash = s.indexOf("/");
                if (slash >= 0) {
                    var top = parseProbability(s.substring(0, slash)), bottom = parseProbability(s.substring(slash + 1));
                    if (top === null || bottom === null || bottom.n === 0) return null;
                    return reduce({ n: top.n * bottom.d, d: top.d * bottom.n });
                }
                if (s === "") return null;
                var dot = s.indexOf("."), digits = s.replace(".", "");
                if (digits === "" || s.indexOf(".", dot + 1) >= 0 && dot >= 0) return null;
                for (var i = 0; i < digits.length; i++) if (digits.charAt(i) < "0" || digits.charAt(i) > "9") return null;
                var d = dot < 0 ? 1 : Math.pow(10, s.length - dot - 1);
                return reduce({ n: parseInt(digits, 10), d: d });
            }

            function gcd(a, b) {
                a = Math.abs(a); b = Math.abs(b);
                while (b) { var t = a % b; a = b; b = t; }
                return a || 1;
            }
            function reduce(f) { var g = gcd(f.n, f.d); return { n: f.n / g, d: f.d / g }; }
            function times(a, b) { return reduce({ n: a.n * b.n, d: a.d * b.d }); }
            function plus(a, b) { return reduce({ n: a.n * b.d + b.n * a.d, d: a.d * b.d }); }
            function divide(a, b) { return reduce({ n: a.n * b.d, d: a.d * b.n }); }
            function isOne(f) { return f.n === f.d; }

            // 분수로 적을지(입력에 /가 있으면) 소수로 적을지
            function probText(f, asFraction) {
                if (asFraction) return f.d === 1 ? String(f.n) : f.n + "/" + f.d;
                var r = Math.round(f.n / f.d * 10000) / 10000;
                return String(r);
            }

            // "A 0.3, B 0.7" → [{name, p, text}]. 이름과 확률 사이는 빈칸 또는 콜론. 못 읽으면 null
            function parseGroup(text) {
                var parts = String(text).split(","), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/^\s+|\s+$/g, "");
                    if (part === "") continue;
                    var cut = Math.max(part.lastIndexOf(" "), part.lastIndexOf(":"));
                    if (cut <= 0) return null;
                    var name = part.substring(0, cut).replace(/[\s:]+$/, ""), valueText = part.substring(cut + 1);
                    var p = parseProbability(valueText);
                    if (name === "" || p === null) return null;
                    list.push({ name: name, p: p, text: valueText.replace(/\s/g, "") });
                }
                return list.length > 0 ? list : null;
            }

            // 두 단계를 읽어 {first:[…], second:[[…] (1단계 가지마다)], fraction, error}
            function parseTree(firstInput, secondInput) {
                var first = parseGroup(firstInput);
                if (first === null) return { error: "1단계를 읽지 못함 (예: A 0.3, B 0.7)" };
                var second = [];
                if (String(secondInput).replace(/\s/g, "") !== "") {
                    var groups = String(secondInput).split("|");
                    if (groups.length !== 1 && groups.length !== first.length) return { error: "2단계 묶음 수(|로 나눔)가 1단계 가지 수와 다름" };
                    for (var g = 0; g < first.length; g++) {
                        var group = parseGroup(groups[groups.length === 1 ? 0 : g]);
                        if (group === null) return { error: "2단계 " + (g + 1) + "번 묶음을 읽지 못함 (예: E 0.8, Eᶜ 0.2)" };
                        second.push(group);
                    }
                }
                var fraction = String(firstInput + secondInput).indexOf("/") >= 0;
                return { first: first, second: second, fraction: fraction };
            }

            // 뿌리는 왼쪽 가운데, 끝 가지를 한 줄씩 위에서 아래로. 가지 확률은 선 가운데 위, 곱은 끝 이름 오른쪽
            function buildProbTree(tree, stageGap, rowGap, products, eventName) {
                var out = { lines: [], texts: [], notes: [] };
                var leaves = [], rows = 0;
                var nameGap = rowGap * 0.9;   // 이름 글자와 선 사이
                for (var i = 0; i < tree.first.length; i++) rows += tree.second.length > 0 ? tree.second[i].length : 1;
                var y = (rows - 1) * rowGap / 2, root = [0, 0];
                var sumChecks = [];
                if (!isOne(sumOf(tree.first))) sumChecks.push("1단계 합이 1이 아님");
                for (var a = 0; a < tree.first.length; a++) {
                    var branch = tree.first[a], children = tree.second.length > 0 ? tree.second[a] : [];
                    var count = Math.max(children.length, 1);
                    var top = y, midY = y - (count - 1) * rowGap / 2;
                    var node = [stageGap, midY];
                    edge(out, root, node, branch.text);
                    out.texts.push({ text: branch.name, at: node, dir: [1, 0] });
                    if (children.length === 0) {
                        leaves.push({ path: [branch], p: branch.p, at: node });
                        y -= rowGap;
                        continue;
                    }
                    if (!isOne(sumOf(children))) sumChecks.push("2단계 " + (a + 1) + "번 묶음 합이 1이 아님");
                    var start = [node[0] + nameGap * 1.6, node[1]];
                    for (var b = 0; b < children.length; b++) {
                        var leaf = [stageGap * 2 + nameGap * 1.6, top - b * rowGap];
                        edge(out, start, leaf, children[b].text);
                        out.texts.push({ text: children[b].name, at: leaf, dir: [1, 0] });
                        leaves.push({ path: [branch, children[b]], p: times(branch.p, children[b].p), at: leaf });
                    }
                    y -= count * rowGap;
                }
                if (products) {
                    var column = 0;
                    for (var c = 0; c < leaves.length; c++) column = Math.max(column, leaves[c].at[0]);
                    for (var l = 0; l < leaves.length; l++) {
                        var parts = [];
                        for (var k = 0; k < leaves[l].path.length; k++) parts.push(leaves[l].path[k].text);
                        var text = parts.join("×") + (parts.length > 1 ? " = " + probText(leaves[l].p, tree.fraction) : "");
                        out.texts.push({ text: text, at: [column + nameGap * 2.4, leaves[l].at[1]], dir: [1, 0] });
                    }
                }
                out.notes = sumChecks;
                // 관심 사건: P(E) = 끝 확률의 합, P(첫 가지|E)
                var target = String(eventName || "").replace(/^\s+|\s+$/g, "");
                if (target !== "" && tree.second.length > 0) {
                    var total = { n: 0, d: 1 }, terms = [], found = [];
                    for (var m = 0; m < leaves.length; m++) {
                        if (leaves[m].path[1].name !== target) continue;
                        total = plus(total, leaves[m].p);
                        terms.push(probText(leaves[m].p, tree.fraction));
                        found.push(leaves[m]);
                    }
                    if (found.length === 0) out.notes.push("2단계에 '" + target + "' 가지가 없음");
                    else {
                        out.notes.push("P(" + target + ") = " + terms.join(" + ") + " = " + probText(total, tree.fraction));
                        if (total.n > 0) {
                            var bayes = [];
                            for (var q = 0; q < found.length; q++) bayes.push("P(" + found[q].path[0].name + "|" + target + ") = " + probText(divide(found[q].p, total), tree.fraction));
                            out.notes.push(bayes.join(", "));
                        }
                    }
                }
                return out;
            }

            function sumOf(list) {
                var total = { n: 0, d: 1 };
                for (var i = 0; i < list.length; i++) total = plus(total, list[i].p);
                return total;
            }

            // 가지 선 (이름 글자 앞에서 끝나게)과 선 가운데 위의 확률
            function edge(out, from, to, text) {
                out.lines.push([from, to]);
                var mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
                var dx = to[0] - from[0], dy = to[1] - from[1], length = Math.sqrt(dx * dx + dy * dy);
                var normal = [-dy / length, dx / length];
                if (normal[1] < 0) normal = [-normal[0], -normal[1]];
                out.texts.push({ text: text, at: mid, dir: normal, small: true });
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

            function bindValueRow(controls, setter, defaultValue) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.reset.onClick = function() { commit(defaultValue); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX, defaultValue) {
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
                controls.reset.onClick = function() { commit(defaultValue); };
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
                var parts = ["v1", encodeURIComponent(firstText), encodeURIComponent(secondText), encodeURIComponent(eventText), showProducts ? "1" : "0",
                    stageMm, rowMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 11) return;
                try {
                    firstText = decodeURIComponent(p[1]);
                    secondText = decodeURIComponent(p[2]);
                    eventText = decodeURIComponent(p[3]);
                    showProducts = p[4] === "1";
                    stageMm = restoreNumber(p[5], stageMm, 10, 60);
                    rowMm = restoreNumber(p[6], rowMm, 4, 20);
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
})();
