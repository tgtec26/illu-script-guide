// Object_Parallax.jsx
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

// 별까지의 거리: 화면 가운데에 두 모식도 중 하나를 그린다.
//   - 연주 시차: 태양을 가운데 둔 지구 공전 궤도(납작한 타원, 파선)의 양 끝에 6개월 간격 지구 두 개,
//     태양 바로 위 '별 거리'에 별. 두 지구에서 별을 지나는 시선을 배경 별 줄까지 늘려(별 너머는 파선) 별이 보이는
//     자리를 표시한다. 별에서 태양 쪽 선과 오른쪽 지구 쪽 선 사이 각이 연주 시차 p, 두 시선 사이 각이 시차(2p).
//     배경 별은 배치 번호로 위치·크기를 흩고, '랜덤' 단추를 누를 때마다 새 번호로 다시 흩는다.
//   - 거리와 밝기: 광원에서 거리 r, 2r, 3r…에 놓은 정사각형 화면(한 변 1, 2, 3…배)을 3차원으로 두고
//     화면마다 1, 4, 9…칸으로 나눈다. 광원에서 네 선이 모든 화면 꼭짓점을 지난다. 밝기는 1, 1/4, 1/9…
//     시점(가로 회전·위아래 기울기·화면 회전, 원근)은 Object_3DLine.jsx와 같다. 화면이 모두 평행해서
//     눈에서 먼 층(광원·화면 사이 빛 구간·화면)부터 그리면 앞뒤 가림이 맞는다.
// 두 종류는 탭으로 나뉘어 옵션이 따로 있고, 글자·위치 패널만 같이 쓴다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectParallax/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var GUIDE_DASH = [2, 1.5];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["연주 시차", "거리와 밝기"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var ORBIT_RANGE = [5, 80];
    var DISTANCE_RANGE = [20, 200];
    var FLATTEN_RANGE = [10, 100];
    var BACKGROUND_RANGE = [5, 60];
    var STEP_RANGE = [5, 80];
    var SCREEN_RANGE = [2, 40];
    var SCREENS_RANGE = [2, 4];
    var FONT_RANGE = [5, 20];
    var SUN_RANGE = [1, 30];
    var EARTH_RANGE = [0.5, 15];
    var STAR_RANGE = [1, 15];
    var BG_COUNT_RANGE = [3, 30];
    var SOURCE_RANGE = [0.5, 20];
    var SEED_MAX = 9999;
    var VIEW_RANGE = [-180, 180];
    var PERSPECTIVE_RANGE = [50, 2000];
    var RESET_BUTTON_WIDTH = 34;
    var CUSTOM_PRESET_COUNT = 4;
    var PRESET_KEY = "ObjectParallax/viewPresets";
    // 시점 프리셋 (Object_3DLine.jsx와 같은 값)
    var VIEW_PRESETS = [{name: "정면", y: 0, x: 0, z: 0}, {name: "등각", y: 45, x: 35.3, z: 0},
        {name: "측면", y: 90, x: 0, z: 0}, {name: "윗면", y: 0, x: 90, z: 0}];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var orbitMm = 20;
    var distanceMm = 70;
    var flatten = 35;
    var backgroundMm = 20;
    var stepMm = 25;
    var screenMm = 8;
    var screenCount = 3;
    var sunMm = 5;
    var earthMm = 2.4;
    var starMm = 3.6;
    var bgCount = 7;
    var bgSeed = 1;
    var sourceMm = 2.4;
    var rotYDeg = 30;
    var rotXDeg = 15;
    var rotZDeg = 0;
    var perspectiveOn = false;
    var perspectiveMm = 300;
    var backgroundOn = true;
    var parallaxOn = true;
    var doubleOn = false;
    var labelsOn = true;
    var gridOn = true;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "별까지의 거리");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    // 종류는 탭으로 나누고, 탭마다 제 옵션만 둔다. 글자·위치는 두 탭이 같이 쓴다
    var tabs = dlg.add("tabbedpanel");
    tabs.alignChildren = "fill";
    var kindTabs = [];
    for (var k = 0; k < KINDS.length; k++) {
        var tab = tabs.add("tab", undefined, KINDS[k]);
        tab.alignChildren = ["left", "top"];
        tab.margins = [12, 12, 12, 12];
        tab.spacing = 6;
        kindTabs.push(tab);
    }
    var pTab = kindTabs[0], bTab = kindTabs[1];
    var orbitRow = addValueRow(pTab, "궤도 반지름", "mm", orbitMm, ORBIT_RANGE[0], ORBIT_RANGE[1], 1, 0);
    var distanceRow = addValueRow(pTab, "별 거리", "mm", distanceMm, DISTANCE_RANGE[0], DISTANCE_RANGE[1], 1, 0);
    var flattenRow = addValueRow(pTab, "궤도 납작함", "%", flatten, FLATTEN_RANGE[0], FLATTEN_RANGE[1], 5, 0);
    flattenRow.input.helpTip = "궤도 세로 반지름 ÷ 가로 반지름. 100이면 원";
    var starRow = addValueRow(pTab, "별 크기", "mm", starMm, STAR_RANGE[0], STAR_RANGE[1], 0.1, 1);
    starRow.input.helpTip = "관측하는 별의 지름. 배경 별은 이 크기의 35~85%에서 흩는다";
    var sunRow = addValueRow(pTab, "태양 크기", "mm", sunMm, SUN_RANGE[0], SUN_RANGE[1], 0.1, 1);
    var earthRow = addValueRow(pTab, "지구 크기", "mm", earthMm, EARTH_RANGE[0], EARTH_RANGE[1], 0.1, 1);
    var pCheckRow = pTab.add("group");
    var backgroundCheck = pCheckRow.add("checkbox", undefined, "배경 별");
    var parallaxCheck = pCheckRow.add("checkbox", undefined, "연주 시차 p");
    var doubleCheck = pCheckRow.add("checkbox", undefined, "시차 2p");
    var backgroundRow = addValueRow(pTab, "배경 별 간격", "mm", backgroundMm, BACKGROUND_RANGE[0], BACKGROUND_RANGE[1], 1, 0);
    backgroundRow.input.helpTip = "별에서 배경 별 줄까지 거리";
    var bgCountRow = addValueRow(pTab, "배경 별 수", "개", bgCount, BG_COUNT_RANGE[0], BG_COUNT_RANGE[1], 1, 0);
    var shuffleButton = bgCountRow.input.parent.add("button", undefined, "랜덤");
    shuffleButton.helpTip = "배경 별의 위치·크기를 새로 흩는다";

    var stepRow = addValueRow(bTab, "거리 간격 r", "mm", stepMm, STEP_RANGE[0], STEP_RANGE[1], 1, 0);
    var screenRow = addValueRow(bTab, "첫 화면 변", "mm", screenMm, SCREEN_RANGE[0], SCREEN_RANGE[1], 0.5, 1);
    var screensRow = addValueRow(bTab, "화면 수", "개", screenCount, SCREENS_RANGE[0], SCREENS_RANGE[1], 1, 0);
    var sourceRow = addValueRow(bTab, "광원 크기", "mm", sourceMm, SOURCE_RANGE[0], SOURCE_RANGE[1], 0.1, 1);
    var gridCheck = bTab.add("checkbox", undefined, "화면 칸");
    // 시점 (Object_3DLine.jsx 입체 도형과 같은 방식): 가로 회전(Y) → 위아래 기울기(X) → 화면 회전(Z), 원근은 선택
    var viewPanel = addPanel(bTab, "시점");
    var rotYRow = addValueRow(viewPanel, "가로 회전", "°", rotYDeg, VIEW_RANGE[0], VIEW_RANGE[1], 1, 1);
    rotYRow.input.helpTip = "세로축 둘레로 돌린다";
    var rotXRow = addValueRow(viewPanel, "위아래 기울기", "°", rotXDeg, VIEW_RANGE[0], VIEW_RANGE[1], 1, 1);
    rotXRow.input.helpTip = "+면 위에서 내려다본다";
    var rotZRow = addValueRow(viewPanel, "화면 회전", "°", rotZDeg, VIEW_RANGE[0], VIEW_RANGE[1], 1, 1);
    var viewRows = [rotYRow, rotXRow, rotZRow];
    for (var vr = 0; vr < viewRows.length; vr++) {
        var zero = viewRows[vr].input.parent.add("button", undefined, "0");
        zero.preferredSize.width = RESET_BUTTON_WIDTH;
        viewRows[vr].reset = zero;
    }
    var presetRow = viewPanel.add("group");
    presetRow.add("statictext", undefined, "시점 프리셋:").preferredSize.width = LABEL_WIDTH;
    var presetButtons = [];
    for (var pr = 0; pr < VIEW_PRESETS.length; pr++) presetButtons.push(presetRow.add("button", undefined, VIEW_PRESETS[pr].name));
    var customRow = viewPanel.add("group");
    var customCaption = customRow.add("statictext", undefined, "커스텀:");
    customCaption.preferredSize.width = LABEL_WIDTH;
    customCaption.helpTip = "저장을 누른 뒤 번호를 누르면 지금 시점(회전·기울기·화면 회전·원근)이 그 번호에 저장된다";
    var customButtons = [];
    for (var cb = 0; cb < CUSTOM_PRESET_COUNT; cb++) {
        var customButton = customRow.add("button", undefined, String(cb + 1));
        customButton.preferredSize.width = RESET_BUTTON_WIDTH + 6;
        customButtons.push(customButton);
    }
    var presetSaveButton = customRow.add("button", undefined, "저장");
    presetSaveButton.helpTip = "누른 뒤 1~4 번호를 누르면 지금 시점이 저장된다. 다시 누르면 취소";
    var perspectiveCheck = viewPanel.add("checkbox", undefined, "원근 적용 (끄면 평행 투영)");
    var perspectiveRow = addValueRow(viewPanel, "시점 거리", "mm", perspectiveMm, PERSPECTIVE_RANGE[0], PERSPECTIVE_RANGE[1], 10, 0);
    perspectiveRow.input.helpTip = "가까울수록 원근이 강해진다";
    tabs.selection = kindTabs[kind];

    var markPanel = addPanel(dlg, "글자");
    var labelsCheck = markPanel.add("checkbox", undefined, "글자 넣기");
    var fontRow = addValueRow(markPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    backgroundCheck.value = backgroundOn;
    parallaxCheck.value = parallaxOn;
    doubleCheck.value = doubleOn;
    gridCheck.value = gridOn;
    labelsCheck.value = labelsOn;
    perspectiveCheck.value = perspectiveOn;
    syncEnabled();

    // Tab에는 index가 없어 제목으로 찾는다
    tabs.onChange = function() {
        if (!tabs.selection) return;
        for (var i = 0; i < KINDS.length; i++) if (tabs.selection.text === KINDS[i]) kind = i;
        updatePreview();
    };
    backgroundCheck.onClick = function() { backgroundOn = backgroundCheck.value; syncEnabled(); updatePreview(); };
    parallaxCheck.onClick = function() { parallaxOn = parallaxCheck.value; updatePreview(); };
    doubleCheck.onClick = function() { doubleOn = doubleCheck.value; updatePreview(); };
    gridCheck.onClick = function() { gridOn = gridCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    perspectiveCheck.onClick = function() { perspectiveOn = perspectiveCheck.value; syncEnabled(); updatePreview(); };
    bindValueRow(orbitRow, function() { return orbitMm; }, function(v) { orbitMm = v; });
    bindValueRow(distanceRow, function() { return distanceMm; }, function(v) { distanceMm = v; });
    bindValueRow(flattenRow, function() { return flatten; }, function(v) { flatten = v; });
    bindValueRow(backgroundRow, function() { return backgroundMm; }, function(v) { backgroundMm = v; });
    bindValueRow(stepRow, function() { return stepMm; }, function(v) { stepMm = v; });
    bindValueRow(screenRow, function() { return screenMm; }, function(v) { screenMm = v; });
    bindValueRow(screensRow, function() { return screenCount; }, function(v) { screenCount = v; });
    bindValueRow(bgCountRow, function() { return bgCount; }, function(v) { bgCount = v; });
    bindValueRow(starRow, function() { return starMm; }, function(v) { starMm = v; });
    bindValueRow(sunRow, function() { return sunMm; }, function(v) { sunMm = v; });
    bindValueRow(earthRow, function() { return earthMm; }, function(v) { earthMm = v; });
    bindValueRow(sourceRow, function() { return sourceMm; }, function(v) { sourceMm = v; });
    bindValueRow(rotYRow, function() { return rotYDeg; }, function(v) { rotYDeg = v; });
    bindValueRow(rotXRow, function() { return rotXDeg; }, function(v) { rotXDeg = v; });
    bindValueRow(rotZRow, function() { return rotZDeg; }, function(v) { rotZDeg = v; });
    bindValueRow(perspectiveRow, function() { return perspectiveMm; }, function(v) { perspectiveMm = v; });
    rotYRow.reset.onClick = function() { setView(0, rotXDeg, rotZDeg, perspectiveOn, perspectiveMm); };
    rotXRow.reset.onClick = function() { setView(rotYDeg, 0, rotZDeg, perspectiveOn, perspectiveMm); };
    rotZRow.reset.onClick = function() { setView(rotYDeg, rotXDeg, 0, perspectiveOn, perspectiveMm); };
    for (var pb = 0; pb < presetButtons.length; pb++) {
        presetButtons[pb].onClick = (function(preset) {
            return function() { setView(preset.y, preset.x, preset.z, perspectiveOn, perspectiveMm); };
        })(VIEW_PRESETS[pb]);
    }
    var presetSaveMode = false;
    var customPresets = loadCustomPresets();
    refreshCustomButtons();
    presetSaveButton.onClick = function() {
        presetSaveMode = !presetSaveMode;
        presetSaveButton.text = presetSaveMode ? "번호 클릭" : "저장";
        refreshCustomButtons();
    };
    for (var cp = 0; cp < customButtons.length; cp++) {
        customButtons[cp].onClick = (function(index) {
            return function() {
                if (presetSaveMode) {
                    customPresets[index] = {y: rotYDeg, x: rotXDeg, z: rotZDeg, perspective: perspectiveOn, distance: perspectiveMm};
                    saveCustomPresets();
                    presetSaveMode = false;
                    presetSaveButton.text = "저장";
                    refreshCustomButtons();
                    return;
                }
                var preset = customPresets[index];
                if (preset) setView(preset.y, preset.x, preset.z, preset.perspective, preset.distance);
            };
        })(cp);
    }
    shuffleButton.onClick = function() {
        bgSeed = Math.floor(Math.random() * SEED_MAX) + 1;
        updatePreview();
    };
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var confirmed = dlg.show() === 1;
    if (!confirmed) clearPreview();
    if (confirmed && previewGroup !== null) {
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // 배경 별 행은 배경 별을 켰을 때만, 시점 거리는 원근을 켰을 때만
    function syncEnabled() {
        setRowEnabled(backgroundRow, backgroundOn);
        setRowEnabled(bgCountRow, backgroundOn);
        shuffleButton.enabled = backgroundOn;
        setRowEnabled(perspectiveRow, perspectiveOn);
    }

    // 시점을 한 번에 바꾸고 행을 맞춘다
    function setView(y, x, z, perspective, distance) {
        rotYDeg = y;
        rotXDeg = x;
        rotZDeg = z;
        perspectiveOn = perspective;
        perspectiveMm = distance;
        var values = [[rotYRow, y], [rotXRow, x], [rotZRow, z], [perspectiveRow, distance]];
        for (var i = 0; i < values.length; i++) {
            values[i][0].input.text = formatNumber(values[i][1], values[i][0].decimals);
            try { values[i][0].slider.value = values[i][1]; } catch (e) {}
        }
        perspectiveCheck.value = perspective;
        syncEnabled();
        updatePreview();
    }

    // 저장된 번호는 툴팁에 각도를 보여주고, 빈 번호는 흐리게 둔다
    function refreshCustomButtons() {
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) {
            var preset = customPresets[i];
            customButtons[i].enabled = presetSaveMode || !!preset;
            customButtons[i].helpTip = preset
                ? "가로 " + preset.y + "° / 기울기 " + preset.x + "° / 화면 " + preset.z + "°" + (preset.perspective ? " / 원근 " + preset.distance + "mm" : "")
                : "비어 있음. 저장을 누른 뒤 이 번호를 누르면 저장";
        }
    }

    // 커스텀 시점은 설정과 다른 키에 둔다 (설정 버전이 바뀌어도 남는다)
    function saveCustomPresets() {
        var parts = ["v1"];
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) {
            var preset = customPresets[i];
            parts.push(preset ? [preset.y, preset.x, preset.z, preset.perspective ? 1 : 0, preset.distance].join(",") : "");
        }
        try { app.preferences.setStringPreference(PRESET_KEY, parts.join("|")); } catch (e) {}
    }

    function loadCustomPresets() {
        var list = [];
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) list.push(null);
        var raw = "";
        try { raw = app.preferences.getStringPreference(PRESET_KEY); } catch (e) { return list; }
        if (!raw) return list;
        var parts = String(raw).split("|");
        if (parts[0] !== "v1" || parts.length !== CUSTOM_PRESET_COUNT + 1) return list;
        for (var j = 0; j < CUSTOM_PRESET_COUNT; j++) {
            var f = parts[j + 1] ? parts[j + 1].split(",") : [];
            if (f.length !== 5) continue;
            var y = parseNumber(f[0]), x = parseNumber(f[1]), z = parseNumber(f[2]), d = parseNumber(f[4]);
            if (y === null || x === null || z === null || d === null) continue;
            list[j] = {y: clamp(y, VIEW_RANGE[0], VIEW_RANGE[1]), x: clamp(x, VIEW_RANGE[0], VIEW_RANGE[1]),
                z: clamp(z, VIEW_RANGE[0], VIEW_RANGE[1]), perspective: f[3] === "1", distance: clamp(d, PERSPECTIVE_RANGE[0], PERSPECTIVE_RANGE[1])};
        }
        return list;
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        previewGroup = layer.groupItems.add();
        previewGroup.name = KINDS[kind];
        if (kind === 0) {
            drawParallax();
        } else {
            drawBrightness();
        }
        // 그린 것의 가운데를 화면 가운데로
        var b = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM,
            viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM);
    }

    function drawParallax() {
        var starR = starMm * MM / 2, sunD = sunMm * MM, earthD = earthMm * MM;
        var g = parallaxGeometry(orbitMm * MM, distanceMm * MM, flatten / 100, backgroundMm * MM, bgCount, bgSeed, starR);
        var orbit = previewGroup.pathItems.ellipse(g.orbitHeight / 2, -g.earths[1][0], g.earths[1][0] * 2, g.orbitHeight);
        styleLine(orbit, GUIDE_DASH);
        orbit.name = "공전 궤도";
        // 시선: 지구 → 별은 실선, 별 → 배경 별은 파선
        for (var i = 0; i < 2; i++) {
            addLine([g.earths[i], g.star], null, "시선");
            if (backgroundOn) addLine([g.star, g.apparent[i]], GUIDE_DASH, "시선 연장");
        }
        addLine([[0, 0], g.star], GUIDE_DASH, "별 – 태양");
        var gap = fontPt * 0.9;
        if (parallaxOn) {
            addArcMark(g.star, [0, -1], g.earths[1], Math.min(12 * MM, g.star[1] * 0.3), labelsOn ? "p" : "");
        }
        if (doubleOn) {
            addArcMark(g.star, [g.earths[0][0] - g.star[0], g.earths[0][1] - g.star[1]], g.earths[1],
                Math.min(20 * MM, g.star[1] * 0.5), labelsOn ? "2p" : "");
        }
        if (backgroundOn) {
            for (var s = 0; s < g.background.length; s++) {
                var bg = addStar(g.background[s].p, g.background[s].r, 20);
                bg.name = "배경 별";
            }
            for (var a = 0; a < 2; a++) {
                var ghost = addStar(g.apparent[a], starR, 0);
                ghost.stroked = true;
                ghost.strokeColor = makeGray(100);
                ghost.strokeWidth = LINE_WIDTH_PT;
                ghost.strokeDashes = [1, 1];
                ghost.name = "보이는 위치";
            }
        }
        addDisc([0, 0], sunD, 30, "태양");
        for (var e = 0; e < 2; e++) addDisc(g.earths[e], earthD, 60, "지구");
        var target = addStar(g.star, starR, 100);
        target.name = "별";
        if (!labelsOn) return;
        addText("태양", 0, -sunD / 2 - gap);
        addText("지구", g.earths[0][0], g.earths[0][1] - earthD / 2 - gap);
        addText("6개월 후", g.earths[1][0], g.earths[1][1] - earthD / 2 - gap);
        addText("별", g.star[0] + starR + gap * 1.2, g.star[1]);
        addLine([[0, 0], g.earths[1]], null, "1 AU");
        addText("1 AU", g.earths[1][0] / 2, gap * 0.9);
    }

    // 거리와 밝기는 3차원으로 두고 시점대로 돌려 그린다. 화면은 모두 x축에 수직인 평행한 면이라
    // 눈에서 x 방향으로 먼 층(광원·빛 구간·화면)부터 그리면 가림이 맞다
    function drawBrightness() {
        var step = stepMm * MM;
        var screens = brightnessScreens(step, screenMm * MM, screenCount);
        var center = [step * (screenCount + 1) / 2, 0, 0];
        var m = viewMatrix(rotYDeg, rotXDeg, rotZDeg);
        var eyeZ = perspectiveOn ? perspectiveMm * MM : 0;
        var toScreen = makeProjector(m, center, eyeZ);
        var eye = viewerX(m, center, eyeZ);
        var sourceD = sourceMm * MM;
        var source = toScreen([0, 0, 0]);
        var items = [{x: 0, draw: function() { addDisc(source, sourceD, 100, "광원"); }}];
        for (var i = 0; i < screens.length; i++) {
            var fromX = i === 0 ? 0 : screens[i - 1].x;
            items.push({x: (fromX + screens[i].x) / 2, draw: makeLightDraw(i)});
            items.push({x: screens[i].x, draw: makeFaceDraw(i)});
        }
        items.sort(function(p, q) { return Math.abs(q.x - eye) - Math.abs(p.x - eye); });
        for (var d = 0; d < items.length; d++) items[d].draw();
        if (!labelsOn) return;
        var gap = fontPt * 0.9;
        addText("광원", source[0], source[1] - sourceD / 2 - gap);
        for (var s = 0; s < screens.length; s++) {
            var n = s + 1;
            var flat = projectAll(screens[s].corners);
            var cx = 0, low = flat[0][1];
            for (var c = 0; c < 4; c++) {
                cx += flat[c][0] / 4;
                low = Math.min(low, flat[c][1]);
            }
            addText((n === 1 ? "" : n) + "r", cx, low - gap);
            addText(n === 1 ? "밝기 1" : "1/" + (n * n), cx, low - gap * 2.4);
        }

        function projectAll(points) {
            var list = [];
            for (var k = 0; k < points.length; k++) list.push(toScreen(points[k]));
            return list;
        }

        // 광원(또는 앞 화면)의 네 꼭짓점 → 이 화면의 네 꼭짓점
        function makeLightDraw(index) {
            return function() {
                for (var k = 0; k < 4; k++) {
                    var from = index === 0 ? [0, 0, 0] : screens[index - 1].corners[k];
                    addLine(projectAll([from, screens[index].corners[k]]), null, "빛");
                }
            };
        }

        function makeFaceDraw(index) {
            return function() {
                var face = previewGroup.pathItems.add();
                face.setEntirePath(projectAll(screens[index].corners));
                face.closed = true;
                face.filled = true;
                face.fillColor = makeGray(10);
                face.stroked = true;
                face.strokeColor = makeGray(100);
                face.strokeWidth = LINE_WIDTH_PT;
                face.name = "화면 " + (index + 1);
                if (!gridOn) return;
                for (var l = 0; l < screens[index].grid.length; l++) addLine(projectAll(screens[index].grid[l]), null, "칸");
            };
        }
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

    // -------------------------------------------------------
    // 기하 (순수 계산, 태양·광원이 (0, 0))
    // -------------------------------------------------------
    // 연주 시차: 지구 두 개(궤도 양 끝), 별(태양 위), 배경 별 줄, 두 시선이 배경 줄과 만나는 점.
    // 배경 별 {p, r}: 배치 번호(seed)로 줄 둘레에 위치를, 별 반지름의 35~85%로 크기를 흩고, 보이는 위치나
    // 다른 배경 별과 겹치면 다시 뽑는다(여러 번 실패하면 그 별은 뺀다)
    function parallaxGeometry(orbit, distance, flattenRatio, backgroundGap, count, seed, starR) {
        var star = [0, distance];
        var earths = [[-orbit, 0], [orbit, 0]];
        var rowY = distance + backgroundGap;
        var apparent = [];
        for (var i = 0; i < 2; i++) {
            var t = rowY / distance;
            apparent.push([earths[i][0] + (star[0] - earths[i][0]) * t, rowY]);
        }
        var span = Math.max(Math.abs(apparent[0][0]), orbit) * 1.4;
        var random = makeRandom(seed);
        var background = [];
        for (var s = 0; s < count; s++) {
            for (var tries = 0; tries < 30; tries++) {
                var r = starR * (0.35 + 0.5 * random());
                var p = [(random() * 2 - 1) * span, rowY + (random() - 0.5) * backgroundGap * 0.8];
                var clear = true;
                for (var q = 0; q < 2 && clear; q++) clear = dist(p, apparent[q]) > starR * 1.6 + r;
                for (var b = 0; b < background.length && clear; b++) clear = dist(p, background[b].p) > (background[b].r + r) * 1.3;
                if (clear) {
                    background.push({p: p, r: r});
                    break;
                }
            }
        }
        return {
            star: star, earths: earths, orbitHeight: orbit * 2 * flattenRatio, apparent: apparent, background: background
        };
    }

    function dist(a, b) {
        return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]));
    }

    // 같은 seed면 같은 수열 (0 이상 1 미만)
    function makeRandom(seedValue) {
        var state = (seedValue * 2654435761) % 4294967296;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // center에서 from 방향(벡터) → to 점 방향까지 작은 쪽으로 도는 각 구간 (라디안)
    function arcBetween(center, from, to) {
        var a0 = Math.atan2(from[1], from[0]);
        var a1 = Math.atan2(to[1] - center[1], to[0] - center[0]);
        var sweep = a1 - a0;
        while (sweep > Math.PI) sweep -= 2 * Math.PI;
        while (sweep < -Math.PI) sweep += 2 * Math.PI;
        return {start: a0, end: a0 + sweep};
    }

    // 거리와 밝기: 광원은 원점, n번째 화면은 x = n × step에 놓인 한 변 n × side 정사각형(y 위, z 앞), n × n칸
    function brightnessScreens(step, side, count) {
        var list = [];
        for (var n = 1; n <= count; n++) {
            var x = step * n;
            var half = side * n / 2;
            var corners = [[x, -half, half], [x, half, half], [x, half, -half], [x, -half, -half]];
            var grid = [];
            for (var g = 1; g < n; g++) {
                var u = -half + side * g;
                grid.push([[x, u, -half], [x, u, half]]);
                grid.push([[x, -half, u], [x, half, u]]);
            }
            list.push({x: x, corners: corners, grid: grid});
        }
        return list;
    }

    // 가로 회전(Y) → 위아래 기울기(X) → 화면 회전(Z) (Object_3DLine.jsx와 같은 순서). 뷰 z가 클수록 눈에 가깝다
    function viewMatrix(yDeg, xDeg, zDeg) {
        var y = yDeg * Math.PI / 180, x = xDeg * Math.PI / 180, z = zDeg * Math.PI / 180;
        var matY = [[Math.cos(y), 0, Math.sin(y)], [0, 1, 0], [-Math.sin(y), 0, Math.cos(y)]];
        var matX = [[1, 0, 0], [0, Math.cos(x), -Math.sin(x)], [0, Math.sin(x), Math.cos(x)]];
        var matZ = [[Math.cos(z), -Math.sin(z), 0], [Math.sin(z), Math.cos(z), 0], [0, 0, 1]];
        return multiply(matZ, multiply(matX, matY));
    }

    function multiply(a, b) {
        var out = [];
        for (var r = 0; r < 3; r++) {
            out.push([]);
            for (var c = 0; c < 3; c++) out[r].push(a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c]);
        }
        return out;
    }

    // center를 중심으로 돌려 화면 좌표로. eyeZ가 0이면 평행 투영, 아니면 눈이 center 앞 eyeZ에 있는 원근
    function makeProjector(m, center, eyeZ) {
        return function(p) {
            var d = [p[0] - center[0], p[1] - center[1], p[2] - center[2]];
            var v = [];
            for (var r = 0; r < 3; r++) v.push(m[r][0] * d[0] + m[r][1] * d[1] + m[r][2] * d[2]);
            if (!eyeZ) return [v[0], v[1]];
            // ponytail: 눈 뒤로 넘어간 점은 눈앞 10%로 눌러 둔다. 시점 거리를 장면보다 짧게 두면 일그러진다
            var factor = eyeZ / Math.max(eyeZ - v[2], eyeZ * 0.1);
            return [v[0] * factor, v[1] * factor];
        };
    }

    // 눈의 x 좌표 (모형 좌표). 평행 투영이면 보는 방향으로 아주 먼 곳
    function viewerX(m, center, eyeZ) {
        return eyeZ ? center[0] + eyeZ * m[2][0] : center[0] + 1e9 * m[2][0];
    }

    // 중심 (cx, cy), 반지름 r인 원호를 from → to(라디안)로 90° 이하 조각마다 베지어 하나
    function arcPoints(cx, cy, r, from, to) {
        var sweep = to - from;
        var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
        var step = sweep / pieces;
        var handle = 4 / 3 * Math.tan(step / 4) * r;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var angle = from + step * i;
            var p = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
            var tangent = [-Math.sin(angle) * handle, Math.cos(angle) * handle];
            points.push({
                anchor: p,
                left: i === 0 ? p : [p[0] - tangent[0], p[1] - tangent[1]],
                right: i === pieces ? p : [p[0] + tangent[0], p[1] + tangent[1]]
            });
        }
        return points;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function styleLine(path, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_WIDTH_PT;
        if (dashes) path.strokeDashes = dashes;
    }

    function addLine(points, dashes, name) {
        var line = previewGroup.pathItems.add();
        line.setEntirePath(points);
        styleLine(line, dashes);
        line.name = name;
        return line;
    }

    function addDisc(center, diameter, k, name) {
        var disc = previewGroup.pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
        disc.filled = true;
        disc.fillColor = makeGray(k);
        disc.stroked = true;
        disc.strokeColor = makeGray(100);
        disc.strokeWidth = LINE_WIDTH_PT;
        disc.name = name;
        return disc;
    }

    // 다섯 꼭짓점 별. k가 0이면 칠하지 않는다
    function addStar(center, radius, k) {
        var star = previewGroup.pathItems.star(center[0], center[1], radius, radius * 0.45, 5);
        star.stroked = false;
        star.filled = k > 0;
        if (k > 0) star.fillColor = makeGray(k);
        return star;
    }

    // 각 표시: center에서 from 방향 → to 점 방향 원호와 그 바깥의 글자
    function addArcMark(center, from, to, r, label) {
        var arc = arcBetween(center, from, to);
        var mark = drawBezier(previewGroup, arcPoints(center[0], center[1], r, arc.start, arc.end), false);
        styleLine(mark, null);
        mark.name = "각 표시";
        if (!label) return;
        var middle = (arc.start + arc.end) / 2;
        var textR = r + fontPt * 0.9;
        addText(label, center[0] + textR * Math.cos(middle), center[1] + textR * Math.sin(middle));
    }

    function drawBezier(container, points, closed) {
        var path = container.pathItems.add();
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

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
        return frame;
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

    // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는
    // GSMediumB1(기준선 +0.5pt). 항목 기호 (가)(나)는 바탕 1.25배, ㉠·ⓐ는 바탕 1.125배 (8pt 기준 10pt·9pt).
    // 크기를 정한 뒤에 부른다
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            var bracket = batangFont !== null && isBracketLabel(text, i);
            if (bracket || (batangFont !== null && isCircledLabel(code))) {
                attributes.textFont = batangFont;
                attributes.size = attributes.size * (bracket ? 1.25 : 1.125);
                attributes.baselineShift = 0;
            } else if (isKoreanOrSpace(code)) {
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

    // i번째 글자가 "(한글 한 글자)" 세 글자 안에 드는가
    function isBracketLabel(text, i) {
        for (var start = i - 2; start <= i; start++) {
            if (start < 0 || start + 2 >= text.length) continue;
            var inner = text.charCodeAt(start + 1);
            if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return true;
        }
        return false;
    }

    // ㉠㉡… ⓐⓑ…
    function isCircledLabel(code) {
        return (code >= 0x3260 && code <= 0x327F) || (code >= 0x24D0 && code <= 0x24E9);
    }

    // 없으면 null (바탕이 없으면 항목 기호도 Spoqa로 둔다)
    function findOptionalFont(name) {
        try { return app.textFonts.getByName(name); } catch (e) { return null; }
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
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals};
    }

    // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === getter()) return;
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM;
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
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v3", kind, orbitMm, distanceMm, flatten, backgroundMm, stepMm, screenMm, screenCount,
            backgroundOn ? "1" : "0", parallaxOn ? "1" : "0", doubleOn ? "1" : "0", labelsOn ? "1" : "0", gridOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0", sunMm, earthMm, starMm, bgCount, bgSeed, sourceMm,
            rotYDeg, rotXDeg, rotZDeg, perspectiveOn ? "1" : "0", perspectiveMm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length !== 29) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        orbitMm = restoreNumber(p[2], orbitMm, ORBIT_RANGE, 1);
        distanceMm = restoreNumber(p[3], distanceMm, DISTANCE_RANGE, 1);
        flatten = restoreNumber(p[4], flatten, FLATTEN_RANGE, 5);
        backgroundMm = restoreNumber(p[5], backgroundMm, BACKGROUND_RANGE, 1);
        stepMm = restoreNumber(p[6], stepMm, STEP_RANGE, 1);
        screenMm = restoreNumber(p[7], screenMm, SCREEN_RANGE, 0.5);
        screenCount = restoreNumber(p[8], screenCount, SCREENS_RANGE, 1);
        backgroundOn = p[9] === "1";
        parallaxOn = p[10] === "1";
        doubleOn = p[11] === "1";
        labelsOn = p[12] === "1";
        gridOn = p[13] === "1";
        fontPt = restoreNumber(p[14], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[15], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[16], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[17] === "1";
        sunMm = restoreNumber(p[18], sunMm, SUN_RANGE, 0.1);
        earthMm = restoreNumber(p[19], earthMm, EARTH_RANGE, 0.1);
        starMm = restoreNumber(p[20], starMm, STAR_RANGE, 0.1);
        bgCount = restoreNumber(p[21], bgCount, BG_COUNT_RANGE, 1);
        bgSeed = restoreNumber(p[22], bgSeed, [1, SEED_MAX], 1);
        sourceMm = restoreNumber(p[23], sourceMm, SOURCE_RANGE, 0.1);
        rotYDeg = restoreNumber(p[24], rotYDeg, VIEW_RANGE, 1);
        rotXDeg = restoreNumber(p[25], rotXDeg, VIEW_RANGE, 1);
        rotZDeg = restoreNumber(p[26], rotZDeg, VIEW_RANGE, 1);
        perspectiveOn = p[27] === "1";
        perspectiveMm = restoreNumber(p[28], perspectiveMm, PERSPECTIVE_RANGE, 10);
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
