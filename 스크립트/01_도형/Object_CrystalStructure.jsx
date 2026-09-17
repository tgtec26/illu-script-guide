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

// 결정 구조: 입방정계 단위세포·다이아몬드·흑연 생성기를 한 창의 탭으로 묶었다.
// 구 3D 조명·외곽선·색상 표현·관찰 각도(오른쪽·왼쪽·앞뒤 거리)·위치는 탭들이 같이 쓴다.
// 입방정계는 탭이 둘이다. 1은 관찰 각도(모서리 각도로 그림을 정하는 제도 방식), 2는 3D 라인과 같은 시점
// (가로 회전·위아래 기울기·화면 회전으로 물체를 돌리는 카메라 방식). 격자 계산과 그리기는 같다.
// 각 탭의 격자 계산과 그리기는 원래 스크립트 그대로이고, 탭마다 자기 투영 행렬을 따로 가진다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;               // 1mm = 2.834645669pt
    var PREVIEW_NAME = "CrystalStructure_Preview";
    // 탭으로 묶기 전 스크립트들이 남겼을 수 있는 미리보기 홀더 이름
    var LEGACY_PREVIEW_NAMES = ["CubicLattice_Preview", "DiamondCrystal_Preview", "GraphiteCrystal_Preview"];

    var sliderSyncers = []; // 값 변경(복원 등) 후 라벨 텍스트를 다시 맞추는 함수 목록
    var engines = [makeCubicEngine("angles"), makeCubicEngine("rotation"), makeDiamondEngine(), makeGraphiteEngine()];
    var tabIndex = 0;
    var engine = engines[0];

    // --- ScriptUI ---
    var win = new Window("dialog", "결정 구조 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 4;
    win.margins = 12;

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = ["fill", "top"];
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = tabs.add("tab", undefined, engines[engineIndex].label);
        page.orientation = "column";
        page.alignChildren = ["fill", "top"];
        page.spacing = 4;
        engines[engineIndex].addRows(page);
    }

    var pnlOptions = win.add("panel", undefined, "옵션");
    pnlOptions.alignChildren = "left";
    pnlOptions.spacing = 2;
    var optionRow1 = pnlOptions.add("group");
    optionRow1.spacing = 16;
    var chkLit3D = optionRow1.add("checkbox", undefined, "구 3D 조명 효과");
    chkLit3D.value = true;
    var chkOutline = optionRow1.add("checkbox", undefined, "구 외곽선");
    chkOutline.value = true;
    var chkPreview = optionRow1.add("checkbox", undefined, "미리보기");
    chkPreview.value = true;
    var optionRow2 = pnlOptions.add("group");
    optionRow2.spacing = 16;
    optionRow2.add("statictext", undefined, "색상 표현:");
    var radColor = optionRow2.add("radiobutton", undefined, "컬러");
    var radGray = optionRow2.add("radiobutton", undefined, "회색 음영");
    radGray.value = true;

    // 관찰 각도(제도 방식)와 시점(3D 라인 방식) 행을 같은 자리에 겹쳐 두고, 탭이 쓰는 쪽만 보인다
    var pnlView = win.add("panel", undefined, "관찰 각도 (오른쪽 + 왼쪽 + 상단 = 360°)");
    pnlView.alignChildren = ["fill", "top"];
    pnlView.spacing = 2;
    var viewStack = pnlView.add("group");
    viewStack.orientation = "stack";
    viewStack.alignChildren = ["left", "top"];
    var pnlAngles = viewStack.add("group");
    pnlAngles.orientation = "column";
    pnlAngles.alignChildren = "left";
    pnlAngles.spacing = 2;
    var pnlRotation = viewStack.add("group");
    pnlRotation.orientation = "column";
    pnlRotation.alignChildren = "left";
    pnlRotation.spacing = 2;
    function addAngleSlider(labelText, initialValue) {
        var slider = addSliderRow(pnlAngles, labelText, 90, 91, 179, initialValue, "°", 1);
        var syncValue = slider.syncLabel;
        slider.syncLabel = function() { syncValue(); updateTopAngleText(); };
        return slider;
    }
    var sldAngleR = addAngleSlider("오른쪽 각도", 131);
    var sldAngleL = addAngleSlider("왼쪽 각도", 109);
    var sldDepth = addSliderRow(pnlAngles, "앞·뒤 면 거리", 90, 40, 160, 100, "%", 1);
    var angleInfoRow = pnlAngles.add("group");
    angleInfoRow.add("statictext", undefined, "상단 각도(자동):");
    var txtTopAngle = angleInfoRow.add("statictext", undefined, "120°");
    function updateTopAngleText() {
        if (!txtTopAngle) return;
        txtTopAngle.text = Math.round(360 - sldAngleR.value - sldAngleL.value) + "°";
    }
    // depth가 null이면 앞·뒤 면 거리는 그대로 둔다
    function setAnglePreset(rightAngle, leftAngle, depth) {
        sldAngleR.value = rightAngle;
        sldAngleL.value = leftAngle;
        if (depth !== null) sldDepth.value = depth;
        sldAngleR.syncLabel();
        sldAngleL.syncLabel();
        sldDepth.syncLabel();
        updatePreview();
    }
    var anglePresetRow = pnlAngles.add("group");
    var anglePresets = [
        ["Isometric", 120, 120, 100], ["Dimetric", 110, 110, null], ["Trimetric", 120, 105, null],
        ["Tetrahedral", 131, 109, 88], ["Layered", 132, 108, 78]];
    for (var presetIndex = 0; presetIndex < anglePresets.length; presetIndex++) {
        anglePresetRow.add("button", undefined, anglePresets[presetIndex][0]).onClick = makePresetHandler(anglePresets[presetIndex]);
    }
    function makePresetHandler(preset) {
        return function() { setAnglePreset(preset[1], preset[2], preset[3]); };
    }
    updateTopAngleText();

    // 3D 라인과 같은 시점. 기본값은 관찰 각도의 등각(x축 오른쪽 아래, z축 왼쪽 아래)과 같은 방향.
    // 격자 그리기가 선형 투영이라 원근은 없다
    var sldRotY = addSliderRow(pnlRotation, "가로 회전", 90, -180, 180, -45, "°", 0.1);
    var sldRotX = addSliderRow(pnlRotation, "위아래 기울기", 90, -180, 180, 35.3, "°", 0.1);
    var sldRotZ = addSliderRow(pnlRotation, "화면 회전", 90, -180, 180, 0, "°", 0.1);
    var rotationPresetRow = pnlRotation.add("group");
    rotationPresetRow.add("statictext", undefined, "시점 프리셋:");
    var rotationPresets = [["정면", 0, 0, 0], ["등각", -45, 35.3, 0], ["측면", -90, 0, 0], ["윗면", 0, 90, 0]];
    for (presetIndex = 0; presetIndex < rotationPresets.length; presetIndex++) {
        rotationPresetRow.add("button", undefined, rotationPresets[presetIndex][0]).onClick = makeRotationPresetHandler(rotationPresets[presetIndex]);
    }
    function makeRotationPresetHandler(preset) {
        return function() {
            sldRotY.value = preset[1];
            sldRotX.value = preset[2];
            sldRotZ.value = preset[3];
            sldRotY.syncLabel();
            sldRotX.syncLabel();
            sldRotZ.syncLabel();
            updatePreview();
        };
    }
    function syncViewPanel() {
        pnlAngles.visible = engine.usesViewAngles;
        pnlRotation.visible = !engine.usesViewAngles;
        pnlView.text = engine.usesViewAngles ? "관찰 각도 (오른쪽 + 왼쪽 + 상단 = 360°)" : "시점 (3D 라인 방식)";
    }

    // --- 위치 (미리보기를 다시 그리지 않고 옮긴다) ---
    var pnlPosition = win.add("panel", undefined, "위치");
    pnlPosition.alignChildren = "left";
    pnlPosition.spacing = 2;
    var sldOffsetX = addSliderRow(pnlPosition, "가로 이동", 90, -100, 100, 0, "mm", 0.1);
    var sldOffsetY = addSliderRow(pnlPosition, "세로 이동", 90, -100, 100, 0, "mm", 0.1);
    var offsetXmm = 0;
    var offsetYmm = 0;
    sldOffsetX.onChanging = function() { sldOffsetX.syncLabel(); moveOffset(sldOffsetX.value, true); };
    sldOffsetX.onChange = sldOffsetX.onChanging;
    sldOffsetY.onChanging = function() { sldOffsetY.syncLabel(); moveOffset(sldOffsetY.value, false); };
    sldOffsetY.onChange = sldOffsetY.onChanging;
    function moveOffset(value, isX) {
        var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM;
        if (isX) offsetXmm = value;
        else offsetYmm = value;
        if (delta === 0) return;
        translateItems(previewItems, isX ? delta : 0, isX ? 0 : delta);
        try { app.redraw(); } catch (e) {}
    }
    function translateItems(items, deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;
        for (var i = 0; i < items.length; i++) { try { items[i].translate(deltaX, deltaY); } catch (e) {} }
    }

    var btnGenerate = win.add("button", undefined, "생성하기", {name: "ok"});
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}
    btnGenerate.preferredSize.height = 40;

    // --- 아트보드 실시간 미리보기 ---
    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) { try { previewItems[i].remove(); } catch (e) {} }
        previewItems = [];
    }
    function removeLeftoverPreviews() {
        try {
            var d = app.activeDocument;
            for (var i = d.groupItems.length - 1; i >= 0; i--) {
                var name = d.groupItems[i].name;
                var stale = name === PREVIEW_NAME;
                for (var j = 0; j < LEGACY_PREVIEW_NAMES.length; j++) if (name === LEGACY_PREVIEW_NAMES[j]) stale = true;
                if (stale) { try { d.groupItems[i].remove(); } catch (e) {} }
            }
        } catch (e) {}
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        engine.syncEnabled();
        clearPreview();
        if (chkPreview.value && engine.validate() === null) {
            try {
                var holder = app.activeDocument.activeLayer.groupItems.add();
                holder.name = PREVIEW_NAME;
                previewItems = [holder];
                engine.draw(holder);
                translateItems(previewItems, offsetXmm * MM, offsetYmm * MM);
            } catch (e) {
                clearPreview();
            }
        }
        try { app.redraw(); } catch (e) {}
    }
    chkLit3D.onClick = updatePreview;
    chkOutline.onClick = updatePreview;
    radColor.onClick = updatePreview;
    radGray.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        tabIndex = next;
        engine = engines[tabIndex];
        syncViewPanel();
        updatePreview();
    };

    // --- 옵션 기억 ---
    // 공통 항목(탭·옵션·색상·각도·이동) 뒤에 탭별 항목을 순서대로 잇는다. 항목 수가 바뀌면 v를 올린다
    var PREF_KEY = "CrystalStructure/settings";
    function collectSettings() {
        var parts = ["v1", tabIndex,
            chkLit3D.value ? "1" : "0",
            chkOutline.value ? "1" : "0",
            chkPreview.value ? "1" : "0",
            radColor.value ? "color" : "gray",
            sldAngleR.value,
            sldAngleL.value,
            sldDepth.value,
            sldRotY.value,
            sldRotX.value,
            sldRotZ.value,
            offsetXmm,
            offsetYmm];
        for (var i = 0; i < engines.length; i++) parts = parts.concat(engines[i].saveFields());
        return parts.join("|");
    }
    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, collectSettings()); } catch (e) {}
    }
    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        var expected = 14;
        for (var i = 0; i < engines.length; i++) expected += engines[i].fieldCount;
        if (p[0] !== "v1" || p.length !== expected) return;
        try {
            tabIndex = restoreInteger(p[1], 0, 0, engines.length - 1);
            chkLit3D.value = (p[2] === "1");
            chkOutline.value = (p[3] === "1");
            chkPreview.value = (p[4] === "1");
            radColor.value = (p[5] === "color");
            radGray.value = !radColor.value;
            restoreSlider(sldAngleR, p[6]);
            restoreSlider(sldAngleL, p[7]);
            restoreSlider(sldDepth, p[8]);
            restoreSlider(sldRotY, p[9]);
            restoreSlider(sldRotX, p[10]);
            restoreSlider(sldRotZ, p[11]);
            restoreSlider(sldOffsetX, p[12]);
            restoreSlider(sldOffsetY, p[13]);
            offsetXmm = sldOffsetX.value;
            offsetYmm = sldOffsetY.value;
            var at = 14;
            for (i = 0; i < engines.length; i++) {
                engines[i].restoreFields(p.slice(at, at + engines[i].fieldCount));
                at += engines[i].fieldCount;
            }
            syncSliderLabels();
            updateTopAngleText();
        } catch (e) {}
    }
    // 슬라이더는 [min,max]로 스스로 클램프하므로 숫자인지만 본다
    function restoreSlider(sld, text) {
        var value = parseFloat(text);
        if (isFinite(value)) sld.value = value;
    }
    function restoreInteger(text, fallback, minimum, maximum) {
        var value = parseInt(text, 10);
        if (!isFinite(value) || value < minimum || value > maximum) return fallback;
        return value;
    }

    btnGenerate.onClick = function() {
        var problem = engine.validate();
        if (problem !== null) { alert(problem); return; }
        saveSettings();
        win.close(1);
    };

    removeLeftoverPreviews();
    applySettings();
    engine = engines[tabIndex];
    tabs.selection = tabIndex;
    syncViewPanel();
    for (engineIndex = 0; engineIndex < engines.length; engineIndex++) engines[engineIndex].syncEnabled();

    win.onShow = function() { updatePreview(); };
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();

    clearPreview();
    try { app.redraw(); } catch (e) {}
    if (result === 1 && app.documents.length > 0) {
        try {
            translateItems(engine.draw(app.activeDocument.activeLayer), offsetXmm * MM, offsetYmm * MM);
        } catch (e) { alert("생성 오류: " + e); }
        try { app.redraw(); } catch (e) {}
    }

    // ---- 다이얼로그 도우미 ------------------------------------------------

    // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장)
    // 입력창은 드래그와 같은 순서로 onChanging → onChange를 부른다(뒤에 바꿔 단 핸들러도 그대로 탄다)
    function addSliderRow(parent, labelText, labelWidth, minV, maxV, initV, unit, step) {
        var row = parent.add("group");
        row.spacing = 3;
        var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
        label.preferredSize.width = labelWidth;
        var input = row.add("edittext", undefined, "");
        input.characters = 5;
        var slider = row.add("scrollbar", undefined, initV, minV, maxV);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = 196;
        var decimals = step < 1 ? 1 : 0;
        slider.syncLabel = function() { input.text = slider.value.toFixed(decimals); };
        slider.syncLabel();
        slider.onChanging = function() { slider.syncLabel(); };
        slider.onChange = function() { slider.syncLabel(); updatePreview(); };
        function setValue(value) {
            value = Math.min(maxV, Math.max(minV, Math.round(value / step) * step));
            if (value === slider.value) { slider.syncLabel(); return; }
            slider.value = value;
            slider.onChanging();
            slider.onChange();
        }
        input.onChange = function() {
            var typed = Number(input.text);
            if (!isFinite(typed) || !/\S/.test(input.text)) { slider.syncLabel(); return; }
            setValue(typed);
        };
        sliderSyncers.push(slider.syncLabel);
        return slider;
    }
    function syncSliderLabels() { for (var i = 0; i < sliderSyncers.length; i++) sliderSyncers[i](); }
    function scaleSlider(sld, ratio) {
        if (!isFinite(ratio) || ratio <= 0) return;
        sld.value = sld.value * ratio;
        sld.syncLabel();
    }
    function colorModeValue() { return radColor.value ? "color" : "gray"; }
    // 그리기 함수가 그룹 하나 또는 배열을 돌려주므로 배열로 맞춘다
    function asArray(items) {
        if (items === null || items === undefined) return [];
        return items.length !== undefined && items.typename === undefined ? items : [items];
    }

    // ==== 입방정계 엔진 =======================================================
    // 엔진 인터페이스: label·usesViewAngles / addRows(page) / validate()→오류문 또는 null / syncEnabled() /
    // draw(layer)→배열 / fieldCount·saveFields()·restoreFields(fields)
    // variant "angles": 공용 관찰 각도로 투영. "rotation": 탭 안의 시점(가로 회전·위아래 기울기·화면 회전)으로 투영

    function makeCubicEngine(variant) {
        var MM = 2.834645669;               // 1mm = 2.834645669pt
        var LINE_WIDTH_PT = 0.3;
        // Object_isometric.jsx와 같은 코너각 체계. x축은 오른쪽 아래, z축은
        // 왼쪽 아래, y축은 위를 향한다. 깊이 벡터도 같은 각도에서 계산한다.
        var SCREEN_X = [0, 0, 0];
        var SCREEN_Y = [0, 0, 0];
        var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;
        function setProjectionAngles(angleR, angleL, depthPercent) {
            var alphaR = (angleR - 90) * Math.PI / 180;
            var alphaL = (angleL - 90) * Math.PI / 180;
            var depthScale = (depthPercent === undefined ? 100 : depthPercent) / 100;
            var cosR = Math.cos(alphaR), sinR = Math.sin(alphaR);
            var cosL = Math.cos(alphaL), sinL = Math.sin(alphaL);
            // 가까운 면(x-y 평면)의 크기는 유지하고, 먼 면으로 이어지는 z축만
            // 압축·확장하여 두 평행한 면 사이의 화면상 거리를 조절한다.
            SCREEN_X = [cosR, 0, -depthScale * cosL];
            SCREEN_Y = [-sinR, 1, -depthScale * sinL];

            // 두 화면축의 영공간(null space)이 카메라 깊이 방향이다.
            var rawView = [
                depthScale * cosL,
                depthScale * Math.sin(alphaR + alphaL),
                cosR
            ];
            var viewLength = Math.sqrt(
                rawView[0] * rawView[0] +
                rawView[1] * rawView[1] +
                rawView[2] * rawView[2]
            );
            VIEW_X = rawView[0] / viewLength;
            VIEW_Y = rawView[1] / viewLength;
            VIEW_Z = rawView[2] / viewLength;
        }
        setProjectionAngles(131, 109, 100);

        // 단위세포 좌표는 격자상수를 1로 둔 분수 좌표.
        var CELL_CORNERS = [
            [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
            [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
        ];
        var CELL_EDGES = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        var FACE_CENTERS = [
            [0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5],
            [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]
        ];
        var LATTICES = [
            { key: "sc",  label: "단순 입방" },
            { key: "bcc", label: "체심 입방" },
            { key: "fcc", label: "면심 입방" },
            { key: "nacl", label: "NaCl" },
            { key: "cscl", label: "CsCl" },
            { key: "i2", label: "I2 (아이오딘)" },
            { key: "co2", label: "CO2 (드라이아이스)" }
        ];
        var MODES = [
            { key: "wire", label: "라인 + 작은 구" },
            { key: "pack", label: "밀집 구(전체 원자)" },
            { key: "cut",  label: "단위세포 절단" }
        ];

        function latticePoints(key) {
            var pts = [], i;
            for (i = 0; i < CELL_CORNERS.length; i++) pts.push(CELL_CORNERS[i]);
            if (key === "bcc" || key === "cscl") pts.push([0.5, 0.5, 0.5]);
            if (key === "fcc" || key === "i2" || key === "co2") {
                for (i = 0; i < FACE_CENTERS.length; i++) pts.push(FACE_CENTERS[i]);
            }
            return pts;
        }

        // 구가 서로 닿는 지름 / 격자상수 비율. sc는 모서리, bcc는 체대각선, fcc는 면대각선으로 접촉.
        function touchRatio(key) {
            if (key === "bcc" || key === "cscl") return Math.sqrt(3) / 2;
            if (key === "fcc") return Math.sqrt(2) / 2;
            // I2는 FCC 격자점마다 작은 원자 두 개가 겹쳐 보이는 분자 모형이다.
            if (key === "i2") return 0.22;
            // CO2의 중앙 탄소 원자 지름. 말단 산소는 otherTouchRatio에서 정한다.
            if (key === "co2") return 0.22;
            if (key === "nacl") return 1;
            return 1;
        }

        function otherTouchRatio(key) {
            if (key === "co2") return 0.16;
            return touchRatio(key);
        }

        function siteRoleAtPoint(key, p) {
            if (key === "nacl") {
                return (Math.round(p[0]) + Math.round(p[1]) + Math.round(p[2])) % 2;
            }
            return 0;
        }

        function latticeSites(key, span) {
            var sites = [];
            var seen = {};
            function addSite(p, role) {
                var coordinateKey =
                    Math.round(p[0] * 2) + "_" +
                    Math.round(p[1] * 2) + "_" +
                    Math.round(p[2] * 2);
                if (seen[coordinateKey]) return;
                seen[coordinateKey] = true;
                sites.push({ p: p, role: role });
            }
            function offsetPoint(p, x, y, z) {
                return [p[0] + x, p[1] + y, p[2] + z];
            }

            for (var x = 0; x < span; x++) {
                for (var y = 0; y < span; y++) {
                    for (var z = 0; z < span; z++) {
                        var i;
                        for (i = 0; i < CELL_CORNERS.length; i++) {
                            var cornerPoint = offsetPoint(CELL_CORNERS[i], x, y, z);
                            addSite(cornerPoint, siteRoleAtPoint(key, cornerPoint));
                        }
                        if (key === "bcc" || key === "cscl") {
                            addSite([x + 0.5, y + 0.5, z + 0.5], 1);
                        } else if (key === "fcc" || key === "i2" || key === "co2") {
                            for (i = 0; i < FACE_CENTERS.length; i++) {
                                addSite(
                                    offsetPoint(FACE_CENTERS[i], x, y, z),
                                    (key === "i2" || key === "co2") ? 0 : 1
                                );
                            }
                        }
                    }
                }
            }
            return sites;
        }

        // I2의 각 FCC 격자점은 같은 크기·색의 원자 두 개가 결합된 분자 중심이다.
        // 위치에 따라 세 방향을 순환시켜 모든 분자가 한 덩어리처럼 겹치지 않게 한다.
        function atomSites(key, span, atomDiameterRatio, otherDiameterRatio) {
            var centers = latticeSites(key, span);
            if (key !== "i2" && key !== "co2") return centers;
            var atoms = [];
            var iodineDirections = [[1, 0.35, 0], [0, 1, 0.35], [0.35, 0, 1]];
            // CO2 축은 카메라 깊이 방향에 수직인 화면 평면 안에서 회전시킨다.
            // 따라서 관찰 각도를 바꾸어도 O-C-O 세 원자가 한 점으로 겹치지 않는다.
            var carbonDioxideDirections = [];
            for (var directionIndex = 0; directionIndex < 4; directionIndex++) {
                var directionAngle = directionIndex * Math.PI / 4;
                var directionCos = Math.cos(directionAngle);
                var directionSin = Math.sin(directionAngle);
                carbonDioxideDirections.push([
                    SCREEN_X[0] * directionCos + SCREEN_Y[0] * directionSin,
                    SCREEN_X[1] * directionCos + SCREEN_Y[1] * directionSin,
                    SCREEN_X[2] * directionCos + SCREEN_Y[2] * directionSin
                ]);
            }
            var directions = key === "i2" ? iodineDirections : carbonDioxideDirections;
            for (var i = 0; i < centers.length; i++) {
                var p = centers[i].p;
                var selector = Math.abs(
                    Math.round(p[0] * 2) +
                    Math.round(p[1] * 2) * 3 +
                    Math.round(p[2] * 2) * 5
                ) % directions.length;
                var direction = directions[selector];
                var length = Math.sqrt(
                    direction[0] * direction[0] +
                    direction[1] * direction[1] +
                    direction[2] * direction[2]
                );
                var separation = key === "i2" ?
                    atomDiameterRatio * 0.72 :
                    // CO2는 공간 채움 모형처럼 산소가 탄소 안쪽으로 깊게 겹친다.
                    (atomDiameterRatio + otherDiameterRatio) / 2 * 0.52;
                var offset = [
                    direction[0] / length * separation / 2,
                    direction[1] / length * separation / 2,
                    direction[2] / length * separation / 2
                ];
                if (key === "i2") {
                    atoms.push({
                        p: [p[0] - offset[0], p[1] - offset[1], p[2] - offset[2]],
                        role: 0,
                        molecule: i
                    });
                    atoms.push({
                        p: [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]],
                        role: 0,
                        molecule: i
                    });
                } else {
                    // O=C=O: 중앙 탄소(role 0)와 동일 거리의 말단 산소(role 1).
                    atoms.push({
                        p: [p[0] - offset[0] * 2, p[1] - offset[1] * 2, p[2] - offset[2] * 2],
                        role: 1,
                        molecule: i,
                        moleculeOrder: 0
                    });
                    atoms.push({
                        p: [p[0], p[1], p[2]],
                        role: 0,
                        molecule: i,
                        moleculeOrder: 1
                    });
                    atoms.push({
                        p: [p[0] + offset[0] * 2, p[1] + offset[1] * 2, p[2] + offset[2] * 2],
                        role: 1,
                        molecule: i,
                        moleculeOrder: 2
                    });
                }
            }
            return atoms;
        }

        function cellEdgeSegments(span) {
            var segments = [];
            function add(a, b, hidden) {
                segments.push({ a: a, b: b, hidden: hidden });
            }
            var x, y, z;
            for (x = 0; x < span; x++) {
                for (y = 0; y <= span; y++) {
                    for (z = 0; z <= span; z++) {
                        add([x, y, z], [x + 1, y, z], y === 0 && z === 0);
                    }
                }
            }
            for (x = 0; x <= span; x++) {
                for (y = 0; y < span; y++) {
                    for (z = 0; z <= span; z++) {
                        add([x, y, z], [x, y + 1, z], x === 0 && z === 0);
                    }
                }
            }
            for (x = 0; x <= span; x++) {
                for (y = 0; y <= span; y++) {
                    for (z = 0; z < span; z++) {
                        add([x, y, z], [x, y, z + 1], x === 0 && y === 0);
                    }
                }
            }
            return segments;
        }

        function screenPoint(p, edge, ox, oy) {
            return [
                ox + edge * (SCREEN_X[0] * p[0] + SCREEN_X[1] * p[1] + SCREEN_X[2] * p[2]),
                oy + edge * (SCREEN_Y[0] * p[0] + SCREEN_Y[1] * p[1] + SCREEN_Y[2] * p[2])
            ];
        }

        // 값이 작은 원자부터 그리면 가까운 원자가 먼 원자를 자연스럽게 가린다.
        function viewDepth(p) {
            return VIEW_X * p[0] + VIEW_Y * p[1] + VIEW_Z * p[2];
        }

        // 직교투영 큐브의 실루엣(육각형). 절단 모드의 투영 경계로 쓴다.
        function convexHull(points) {
            var pts = points.slice(0);
            pts.sort(function(a, b) { return (a[0] - b[0]) || (a[1] - b[1]); });
            function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
            var lower = [], upper = [], i;
            for (i = 0; i < pts.length; i++) {
                while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
                lower.push(pts[i]);
            }
            for (i = pts.length - 1; i >= 0; i--) {
                while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
                upper.push(pts[i]);
            }
            lower.pop(); upper.pop();
            return lower.concat(upper);
        }
        function cellSilhouette(edge, ox, oy, span) {
            span = span ? span : 1;
            var projected = [];
            for (var i = 0; i < CELL_CORNERS.length; i++) {
                projected.push(screenPoint([
                    CELL_CORNERS[i][0] * span,
                    CELL_CORNERS[i][1] * span,
                    CELL_CORNERS[i][2] * span
                ], edge, ox, oy));
            }
            return convexHull(projected);
        }

        function cellBounds(edge, ox, oy, span) {
            span = span ? span : 1;
            var left = 1e30, top = -1e30, right = -1e30, bottom = 1e30;
            for (var i = 0; i < CELL_CORNERS.length; i++) {
                var s = screenPoint([
                    CELL_CORNERS[i][0] * span,
                    CELL_CORNERS[i][1] * span,
                    CELL_CORNERS[i][2] * span
                ], edge, ox, oy);
                if (s[0] < left) left = s[0];
                if (s[0] > right) right = s[0];
                if (s[1] > top) top = s[1];
                if (s[1] < bottom) bottom = s[1];
            }
            return [left, top, right, bottom];
        }

        function kColor(k) {
            var c = new CMYKColor();
            c.cyan = 0; c.magenta = 0; c.yellow = 0; c.black = k;
            return c;
        }

        function rgbColor(red, green, blue) {
            var c = new RGBColor();
            c.red = Math.max(0, Math.min(255, red));
            c.green = Math.max(0, Math.min(255, green));
            c.blue = Math.max(0, Math.min(255, blue));
            return c;
        }

        function adjustedRgb(rgb, brightness) {
            var value = Math.max(40, Math.min(160, brightness));
            var result = [], i;
            if (value <= 100) {
                for (i = 0; i < 3; i++) result[i] = rgb[i] * value / 100;
            } else {
                var towardWhite = (value - 100) / 60;
                for (i = 0; i < 3; i++) result[i] = rgb[i] + (255 - rgb[i]) * towardWhite;
            }
            return result;
        }

        function adjustedK(k, brightness) {
            var value = Math.max(40, Math.min(160, brightness));
            // 100%에서는 원래 K값을 유지하고, 최저 밝기(40%)에서는
            // 기본 음영과 관계없이 K90에 도달하도록 선형 보간한다.
            if (value <= 100) return Math.min(90, k + (90 - k) * (100 - value) / 60);
            return Math.max(0, k * (160 - value) / 60);
        }

        function roleBrightness(o, isCorner) {
            return isCorner ? o.cornerBrightness : o.otherBrightness;
        }

        function dot3(a, b) {
            return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        }

        function normalize3(v) {
            var len = Math.sqrt(dot3(v, v));
            if (len < 1e-12) return [0, 0, 0];
            return [v[0] / len, v[1] / len, v[2] / len];
        }

        function cross3(a, b) {
            return [
                a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0]
            ];
        }

        function boundaryCount(p, span) {
            span = span ? span : 1;
            var count = 0;
            for (var i = 0; i < 3; i++) if (p[i] < 1e-9 || p[i] > span - 1e-9) count++;
            return count;
        }

        // 그라데이션은 문서당 1회만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
        var _gradCache = null, _gradCacheDoc = null;
        function makeRadialGradient(doc, name, lightColor, darkColor, midPoint) {
            var grad = doc.gradients.add();
            grad.name = name + "_" + (new Date().getTime());
            grad.type = GradientType.RADIAL;
            for (var stopIndex = grad.gradientStops.length; stopIndex < 2; stopIndex++) grad.gradientStops.add();
            grad.gradientStops[0].rampPoint = 0;
            grad.gradientStops[0].midPoint = midPoint ? midPoint : 28;
            grad.gradientStops[0].color = lightColor;
            grad.gradientStops[1].rampPoint = 100;
            grad.gradientStops[1].color = darkColor;
            return grad;
        }

        function getGradients(doc) {
            if (_gradCache && _gradCacheDoc === doc) return _gradCache;
            _gradCache = {
                sphere: makeRadialGradient(doc, "CubicSphere", kColor(0), kColor(80), 13.3),
                wireSphere: makeRadialGradient(doc, "CubicWireSphere", kColor(0), kColor(80), 13.3),
                otherWireSphere: makeRadialGradient(doc, "OtherWire", kColor(0), kColor(80), 13.3),
                cutCenterGray: makeRadialGradient(doc, "CutGray", kColor(0), kColor(55), 13.3),
                corner: makeRadialGradient(
                    doc, "CubicCorner",
                    rgbColor(232, 105, 101), rgbColor(118, 25, 31), 28
                ),
                center: makeRadialGradient(
                    doc, "CubicCenter",
                    rgbColor(184, 214, 91), rgbColor(67, 103, 30), 28
                )
            };
            _gradCacheDoc = doc;
            return _gradCache;
        }

        function setGradientColors(gradient, lightColor, darkColor) {
            gradient.gradientStops[0].color = lightColor;
            gradient.gradientStops[1].color = darkColor;
        }

        function configureGradients(grads, o) {
            var cornerLight = adjustedRgb([232, 105, 101], o.cornerBrightness);
            var cornerDark = adjustedRgb([118, 25, 31], o.cornerBrightness);
            var otherLight = adjustedRgb([184, 214, 91], o.otherBrightness);
            var otherDark = adjustedRgb([67, 103, 30], o.otherBrightness);
            setGradientColors(
                grads.corner,
                rgbColor(cornerLight[0], cornerLight[1], cornerLight[2]),
                rgbColor(cornerDark[0], cornerDark[1], cornerDark[2])
            );
            setGradientColors(
                grads.center,
                rgbColor(otherLight[0], otherLight[1], otherLight[2]),
                rgbColor(otherDark[0], otherDark[1], otherDark[2])
            );
            setGradientColors(
                grads.wireSphere,
                kColor(adjustedK(0, o.cornerBrightness)),
                kColor(adjustedK(80, o.cornerBrightness))
            );
            setGradientColors(
                grads.otherWireSphere,
                kColor(adjustedK(0, o.otherBrightness)),
                kColor(adjustedK(80, o.otherBrightness))
            );
            setGradientColors(
                grads.cutCenterGray,
                kColor(adjustedK(0, o.otherBrightness)),
                kColor(adjustedK(55, o.otherBrightness))
            );
        }

        var byRotation = variant === "rotation";
        var chkLattice, chkMode, radOneCell, radEightCells, chkHiddenDashed;
        var sldCell, sldCornerSphere, sldOtherSphere, sldCornerBrightness, sldOtherBrightness, sldGap;
        var prevCell = 20;

        // 그리기 직전에 투영을 정한다. 시점 방식은 3D 라인의 회전 행렬(가로 Y → 기울기 X → 화면 Z)에서
        // 화면 x·y 축과 깊이 방향을 그대로 읽는다. 선형 투영이라 원근은 없다
        function applyProjection(o) {
            if (byRotation) setProjectionRotation(o.rotY, o.rotX, o.rotZ);
            else setProjectionAngles(o.angleR, o.angleL, o.depthPercent);
        }
        function setProjectionRotation(rotY, rotX, rotZ) {
            var ry = rotY * Math.PI / 180, rx = rotX * Math.PI / 180, rz = rotZ * Math.PI / 180;
            var matY = [[Math.cos(ry), 0, Math.sin(ry)], [0, 1, 0], [-Math.sin(ry), 0, Math.cos(ry)]];
            var matX = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]];
            var matZ = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
            var m = multiply3(matZ, multiply3(matX, matY));
            SCREEN_X = m[0];
            SCREEN_Y = m[1];
            VIEW_X = m[2][0];
            VIEW_Y = m[2][1];
            VIEW_Z = m[2][2];
        }
        function multiply3(a, b) {
            var out = [];
            for (var i = 0; i < 3; i++) {
                out.push([]);
                for (var j = 0; j < 3; j++) out[i].push(a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]);
            }
            return out;
        }

        var api = {
            label: byRotation ? "입방정계2" : "입방정계1",
            usesViewAngles: !byRotation,
            fieldCount: 10,
            addRows: addRows,
            validate: validate,
            syncEnabled: syncEnabled,
            draw: function(layer) { return asArray(drawWith(layer)); },
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function addRows(page) {
            var pnlLattice = page.add("panel", undefined, "격자 유형 (다중 선택)");
            pnlLattice.alignChildren = "left";
            pnlLattice.spacing = 2;
            chkLattice = [];
            var latticeRow = null;
            for (var li = 0; li < LATTICES.length; li++) {
                if (li % 4 === 0) latticeRow = pnlLattice.add("group");   // 두 줄로 나눠 폭을 줄인다
                chkLattice[li] = latticeRow.add("checkbox", undefined, LATTICES[li].label);
                chkLattice[li].value = li < 3;
                chkLattice[li].onClick = function() {
                    syncIodineControls();
                    updatePreview();
                };
            }

            var pnlCells = page.add("panel", undefined, "셀 구성 · 표현 방식 (다중 선택)");
            pnlCells.alignChildren = "left";
            pnlCells.spacing = 2;
            var cellRow = pnlCells.add("group");
            radOneCell = cellRow.add("radiobutton", undefined, "1셀");
            radEightCells = cellRow.add("radiobutton", undefined, "8셀 (2×2×2)");
            radOneCell.value = true;
            radOneCell.onClick = updatePreview;
            radEightCells.onClick = updatePreview;
            var modeRow = pnlCells.add("group");
            chkMode = [];
            for (var mi = 0; mi < MODES.length; mi++) {
                chkMode[mi] = modeRow.add("checkbox", undefined, MODES[mi].label);
                chkMode[mi].onClick = updatePreview;
            }
            chkMode[0].value = true;
            chkHiddenDashed = pnlCells.add("checkbox", undefined, "숨김선 점선 표시 (해제: 실선)");
            chkHiddenDashed.value = true;
            chkHiddenDashed.onClick = updatePreview;

            var pnlSize = page.add("panel", undefined, "크기·밝기 조절");
            pnlSize.alignChildren = "left";
            pnlSize.spacing = 2;
            // 밀집·절단 모드의 구 지름은 접촉 조건에서 자동 계산되므로 슬라이더는 라인 모드에만 쓰인다.
            sldCell = addSliderRow(pnlSize, "셀 한 변", 135, 5, 80, 20, "mm", 0.1);
            sldCornerSphere = addSliderRow(pnlSize, "꼭짓점 구 지름(라인)", 135, 0.5, 20, 3, "mm", 0.1);
            sldOtherSphere = addSliderRow(pnlSize, "나머지 구 지름(라인)", 135, 0.5, 20, 3, "mm", 0.1);
            sldCornerBrightness = addSliderRow(pnlSize, "꼭짓점 밝기", 135, 40, 160, 100, "%", 1);
            sldOtherBrightness = addSliderRow(pnlSize, "나머지 밝기", 135, 40, 160, 100, "%", 1);
            sldGap = addSliderRow(pnlSize, "셀 간격", 135, 0, 40, 8, "mm", 0.1);

            linkIodineSliders(sldCornerSphere, sldOtherSphere);
            linkIodineSliders(sldCornerBrightness, sldOtherBrightness);

            // 셀 한 변을 바꾸면 구 지름과 간격이 같은 비율로 따라온다.
            prevCell = sldCell.value;
            sldCell.onChanging = function() {
                var r = sldCell.value / prevCell;
                scaleSlider(sldCornerSphere, r);
                scaleSlider(sldOtherSphere, r);
                scaleSlider(sldGap, r);
                prevCell = sldCell.value;
                sldCell.syncLabel();
            };
            sldCell.onChange = function() { sldCell.syncLabel(); updatePreview(); };
        }

        function isIodineSelected() {
            for (var i = 0; i < LATTICES.length; i++) {
                if (LATTICES[i].key === "i2") return chkLattice[i].value;
            }
            return false;
        }
        function syncIodinePair(source, target) {
            source.syncLabel();
            if (!isIodineSelected()) return;
            target.value = source.value;
            target.syncLabel();
        }
        function linkIodineSliders(first, second) {
            first.onChanging = function() { syncIodinePair(first, second); };
            first.onChange = function() { syncIodinePair(first, second); updatePreview(); };
            second.onChanging = function() { syncIodinePair(second, first); };
            second.onChange = function() { syncIodinePair(second, first); updatePreview(); };
        }
        function syncIodineControls() {
            if (!isIodineSelected()) return;
            sldOtherSphere.value = sldCornerSphere.value;
            sldOtherBrightness.value = sldCornerBrightness.value;
            sldOtherSphere.syncLabel();
            sldOtherBrightness.syncLabel();
        }

        function getSelectedLattices() {
            var sel = [];
            for (var i = 0; i < chkLattice.length; i++) if (chkLattice[i].value) sel.push(LATTICES[i].key);
            return sel;
        }
        function getSelectedModes() {
            var sel = [];
            for (var i = 0; i < chkMode.length; i++) if (chkMode[i].value) sel.push(MODES[i].key);
            return sel;
        }
        function validate() {
            if (getSelectedLattices().length === 0) return "격자 유형을 선택하세요.";
            if (getSelectedModes().length === 0) return "표현 방식을 선택하세요.";
            return null;
        }
        function syncEnabled() {
            sldCornerSphere.enabled = chkMode[0].value;
            sldOtherSphere.enabled = chkMode[0].value;
            chkHiddenDashed.enabled = chkMode[0].value && radOneCell.value;
        }
        function drawWith(targetLayer) {
            var lattices = getSelectedLattices(), modes = getSelectedModes();
            if (lattices.length === 0 || modes.length === 0) return [];
            return drawCells({
                lattices: lattices,
                modes: modes,
                lit3D: chkLit3D.value,
                outline: chkOutline.value,
                hiddenDashed: chkHiddenDashed.value && radOneCell.value,
                colorMode: colorModeValue(),
                cellSpan: radEightCells.value ? 2 : 1,
                angleR: sldAngleR.value,
                angleL: sldAngleL.value,
                depthPercent: sldDepth.value,
                rotY: sldRotY.value,
                rotX: sldRotX.value,
                rotZ: sldRotZ.value,
                cellMM: sldCell.value,
                cornerSphereMM: sldCornerSphere.value,
                otherSphereMM: sldOtherSphere.value,
                cornerBrightness: sldCornerBrightness.value,
                otherBrightness: sldOtherBrightness.value,
                gapMM: sldGap.value
            }, targetLayer);
        }

        function saveFields() {
            var lat = "", mod = "", i;
            for (i = 0; i < chkLattice.length; i++) lat += chkLattice[i].value ? "1" : "0";
            for (i = 0; i < chkMode.length; i++) mod += chkMode[i].value ? "1" : "0";
            return [lat, mod, radEightCells.value ? "2" : "1", chkHiddenDashed.value ? "1" : "0",
                sldCell.value, sldCornerSphere.value, sldOtherSphere.value,
                sldCornerBrightness.value, sldOtherBrightness.value, sldGap.value];
        }
        function restoreFields(f) {
            var i;
            for (i = 0; i < chkLattice.length && i < f[0].length; i++) chkLattice[i].value = (f[0].charAt(i) === "1");
            for (i = 0; i < chkMode.length && i < f[1].length; i++) chkMode[i].value = (f[1].charAt(i) === "1");
            radEightCells.value = (f[2] === "2");
            radOneCell.value = !radEightCells.value;
            chkHiddenDashed.value = (f[3] === "1");
            restoreSlider(sldCell, f[4]);
            restoreSlider(sldCornerSphere, f[5]);
            restoreSlider(sldOtherSphere, f[6]);
            restoreSlider(sldCornerBrightness, f[7]);
            restoreSlider(sldOtherBrightness, f[8]);
            restoreSlider(sldGap, f[9]);
            syncIodineControls();
            prevCell = sldCell.value;
        }

        // --- 그리기 ---
        // Object_MoleculeModel.jsx의 핵과 같은 방식: 좌측 상단에 중심을 둔 큰
        // 방사형 그라데이션 원을 실제 구 크기의 원으로 클리핑한다.
        function drawNucleusLitSphere(parent, cx, cy, dia, o, grads, isCorner, brightOtherGray) {
            var r = dia / 2;
            var hx = cx - r * 0.35;
            var hy = cy + r * 0.35;
            var gradientRadius = r * 1.7;
            var sphereGroup = parent.groupItems.add();
            var clippedGroup = sphereGroup.groupItems.add();

            var gc = new GradientColor();
            gc.gradient = o.colorMode === "color" ?
                (isCorner ? grads.corner : grads.center) :
                (isCorner ? grads.wireSphere :
                    (brightOtherGray ? grads.cutCenterGray : grads.otherWireSphere));
            var big = clippedGroup.pathItems.ellipse(
                hy + gradientRadius,
                hx - gradientRadius,
                gradientRadius * 2,
                gradientRadius * 2
            );
            big.filled = true;
            big.stroked = false;
            big.fillColor = gc;

            var mask = clippedGroup.pathItems.ellipse(cy + r, cx - r, dia, dia);
            mask.filled = false;
            mask.stroked = false;
            mask.clipping = true;
            clippedGroup.clipped = true;

            if (o.outline) {
                var outline = sphereGroup.pathItems.ellipse(cy + r, cx - r, dia, dia);
                outline.filled = false;
                outline.stroked = true;
                outline.strokeWidth = LINE_WIDTH_PT;
                outline.strokeColor = kColor(100);
            }
            return sphereGroup;
        }

        function drawSphere(parent, cx, cy, dia, o, grads, nucleusLighting, isCorner, brightOtherGray) {
            if (o.lit3D && nucleusLighting) {
                return drawNucleusLitSphere(parent, cx, cy, dia, o, grads, isCorner, brightOtherGray);
            }
            var r = dia / 2;
            var circle = parent.pathItems.ellipse(cy + r, cx - r, dia, dia);
            circle.filled = true;
            if (o.lit3D) {
                var gc = new GradientColor();
                gc.gradient = grads.sphere;
                gc.matrix = app.getIdentityMatrix();
                gc.origin = [cx - r * 0.35, cy + r * 0.35]; // 왼쪽 위 하이라이트
                gc.length = r * 1.7;
                circle.fillColor = gc;
            } else {
                var brightness = roleBrightness(o, isCorner);
                if (o.colorMode === "color") {
                    var flatRgb = adjustedRgb(
                        isCorner ? [184, 52, 55] : [132, 168, 47],
                        brightness
                    );
                    circle.fillColor = rgbColor(flatRgb[0], flatRgb[1], flatRgb[2]);
                } else {
                    circle.fillColor = kColor(adjustedK(
                        !isCorner && brightOtherGray ? 0 : 15,
                        brightness
                    ));
                }
            }
            circle.stroked = o.outline;
            if (o.outline) {
                circle.strokeWidth = LINE_WIDTH_PT;
                circle.strokeColor = kColor(100);
            }
            return circle;
        }

        function clipPolygonAtPlane(poly, axis, limit, keepGreater) {
            var out = [];
            if (poly.length === 0) return out;
            var previous = poly[poly.length - 1];
            var previousInside = keepGreater ? previous[axis] >= limit - 1e-9 : previous[axis] <= limit + 1e-9;
            for (var i = 0; i < poly.length; i++) {
                var current = poly[i];
                var currentInside = keepGreater ? current[axis] >= limit - 1e-9 : current[axis] <= limit + 1e-9;
                if (currentInside !== previousInside) {
                    var denominator = current[axis] - previous[axis];
                    var t = Math.abs(denominator) < 1e-12 ? 0 : (limit - previous[axis]) / denominator;
                    out.push([
                        previous[0] + (current[0] - previous[0]) * t,
                        previous[1] + (current[1] - previous[1]) * t,
                        previous[2] + (current[2] - previous[2]) * t
                    ]);
                }
                if (currentInside) out.push(current);
                previous = current;
                previousInside = currentInside;
            }
            return out;
        }

        function clipPolygonToCell(poly, span) {
            span = span ? span : 1;
            var out = poly, axis;
            for (axis = 0; axis < 3 && out.length > 0; axis++) {
                out = clipPolygonAtPlane(out, axis, 0, true);
                out = clipPolygonAtPlane(out, axis, span, false);
            }
            return out;
        }

        function addMeshFace(faces, polygon, normal, baseColor, isCutFace, span) {
            var clipped = clipPolygonToCell(polygon, span);
            if (clipped.length < 3) return;
            var clean = [];
            for (var c = 0; c < clipped.length; c++) {
                var previous = clean.length > 0 ? clean[clean.length - 1] : null;
                if (!previous ||
                    Math.abs(previous[0] - clipped[c][0]) > 1e-8 ||
                    Math.abs(previous[1] - clipped[c][1]) > 1e-8 ||
                    Math.abs(previous[2] - clipped[c][2]) > 1e-8) {
                    clean.push(clipped[c]);
                }
            }
            if (clean.length > 2 &&
                Math.abs(clean[0][0] - clean[clean.length - 1][0]) < 1e-8 &&
                Math.abs(clean[0][1] - clean[clean.length - 1][1]) < 1e-8 &&
                Math.abs(clean[0][2] - clean[clean.length - 1][2]) < 1e-8) {
                clean.pop();
            }
            if (clean.length < 3) return;
            var edgeA = [clean[1][0] - clean[0][0], clean[1][1] - clean[0][1], clean[1][2] - clean[0][2]];
            var edgeB = [clean[2][0] - clean[0][0], clean[2][1] - clean[0][1], clean[2][2] - clean[0][2]];
            var areaNormal = cross3(edgeA, edgeB);
            if (dot3(areaNormal, areaNormal) < 1e-14) return;
            var depth = 0;
            for (var i = 0; i < clean.length; i++) {
                depth += VIEW_X * clean[i][0] + VIEW_Y * clean[i][1] + VIEW_Z * clean[i][2];
            }
            faces.push({
                points: clean,
                normal: normalize3(normal),
                depth: depth / clean.length,
                baseColor: baseColor,
                cutFace: isCutFace
            });
        }

        function spherePoint(center, radius, latitude, longitude) {
            var cosLatitude = Math.cos(latitude);
            return [
                center[0] + radius * cosLatitude * Math.cos(longitude),
                center[1] + radius * Math.sin(latitude),
                center[2] + radius * cosLatitude * Math.sin(longitude)
            ];
        }

        function addSphereSurface(faces, center, radius, baseColor, span) {
            var latitudeSteps = span > 1 ? 8 : 12;
            var longitudeSteps = span > 1 ? 16 : 24;
            for (var la = 0; la < latitudeSteps; la++) {
                var lat0 = -Math.PI / 2 + Math.PI * la / latitudeSteps;
                var lat1 = -Math.PI / 2 + Math.PI * (la + 1) / latitudeSteps;
                for (var lo = 0; lo < longitudeSteps; lo++) {
                    var lon0 = Math.PI * 2 * lo / longitudeSteps;
                    var lon1 = Math.PI * 2 * (lo + 1) / longitudeSteps;
                    var p00 = spherePoint(center, radius, lat0, lon0);
                    var p01 = spherePoint(center, radius, lat0, lon1);
                    var p10 = spherePoint(center, radius, lat1, lon0);
                    var p11 = spherePoint(center, radius, lat1, lon1);
                    var triangles = [[p00, p10, p11], [p00, p11, p01]];
                    for (var t = 0; t < triangles.length; t++) {
                        var tri = triangles[t];
                        var centroidNormal = normalize3([
                            (tri[0][0] + tri[1][0] + tri[2][0]) / 3 - center[0],
                            (tri[0][1] + tri[1][1] + tri[2][1]) / 3 - center[1],
                            (tri[0][2] + tri[1][2] + tri[2][2]) / 3 - center[2]
                        ]);
                        if (dot3(centroidNormal, [VIEW_X, VIEW_Y, VIEW_Z]) > 0) {
                            addMeshFace(faces, tri, centroidNormal, baseColor, false, span);
                        }
                    }
                }
            }
        }

        function addCutDisks(faces, center, radius, baseColor, span) {
            span = span ? span : 1;
            var diskSteps = span > 1 ? 24 : 32;
            for (var axis = 0; axis < 3; axis++) {
                var side = -1;
                if (center[axis] < 1e-9) side = 0;
                else if (center[axis] > span - 1e-9) side = 1;
                if (side < 0) continue;

                var normal = [0, 0, 0];
                normal[axis] = side === 0 ? -1 : 1;
                if (dot3(normal, [VIEW_X, VIEW_Y, VIEW_Z]) <= 0) continue;

                var axisU = (axis === 0) ? 1 : 0;
                var axisV = (axis === 2) ? 1 : 2;
                if (axis === 1) axisV = 2;
                for (var i = 0; i < diskSteps; i++) {
                    var angle0 = Math.PI * 2 * i / diskSteps;
                    var angle1 = Math.PI * 2 * (i + 1) / diskSteps;
                    var p0 = [center[0], center[1], center[2]];
                    var p1 = [center[0], center[1], center[2]];
                    var p2 = [center[0], center[1], center[2]];
                    p1[axisU] += radius * Math.cos(angle0);
                    p1[axisV] += radius * Math.sin(angle0);
                    p2[axisU] += radius * Math.cos(angle1);
                    p2[axisV] += radius * Math.sin(angle1);
                    addMeshFace(faces, [p0, p1, p2], normal, baseColor, true, span);
                }
            }
        }

        function shadeMeshColor(baseColor, normal, lit3D, isCutFace) {
            if (!lit3D) return rgbColor(baseColor[0], baseColor[1], baseColor[2]);
            var light = normalize3([-0.45, 0.8, 0.55]);
            var amount = Math.max(0, dot3(normal, light));
            // 절단면은 평면이므로 명암 범위를 좁혀 균일하게, 구면은 방사형
            // 그라데이션으로 표현한다. 둘의 경계가 색과 광택 모두에서 구분된다.
            var factor = (isCutFace ? 0.76 : 0.48) + (isCutFace ? 0.16 : 0.52) * amount;
            return rgbColor(baseColor[0] * factor, baseColor[1] * factor, baseColor[2] * factor);
        }

        function projectedHullFromFaces(faces, edge, ox, oy) {
            var projected = [];
            for (var i = 0; i < faces.length; i++) {
                for (var p = 0; p < faces[i].points.length; p++) {
                    projected.push(screenPoint(faces[i].points[p], edge, ox, oy));
                }
            }
            return projected.length >= 3 ? convexHull(projected) : [];
        }

        function drawBezierHull(parent, hull, fillColor, o, useGradient) {
            if (hull.length < 3) return null;
            var path = parent.pathItems.add();
            path.setEntirePath(hull);
            path.closed = true;
            path.filled = true;
            path.fillColor = fillColor;
            path.stroked = o.outline;
            if (o.outline) {
                path.strokeWidth = LINE_WIDTH_PT;
                path.strokeColor = kColor(100);
            }

            var points = path.pathPoints;
            for (var i = 0; i < hull.length; i++) {
                var previous = hull[(i + hull.length - 1) % hull.length];
                var anchor = hull[i];
                var next = hull[(i + 1) % hull.length];
                var toPrevious = [previous[0] - anchor[0], previous[1] - anchor[1]];
                var toNext = [next[0] - anchor[0], next[1] - anchor[1]];
                var previousLength = Math.sqrt(toPrevious[0] * toPrevious[0] + toPrevious[1] * toPrevious[1]);
                var nextLength = Math.sqrt(toNext[0] * toNext[0] + toNext[1] * toNext[1]);
                var turn = 1;
                if (previousLength > 1e-9 && nextLength > 1e-9) {
                    turn = (toPrevious[0] * toNext[0] + toPrevious[1] * toNext[1]) /
                        (previousLength * nextLength);
                }

                // 원호처럼 완만한 지점만 Catmull-Rom 방식의 베지어 핸들로 바꾼다.
                // 셀 절단선이 만나는 모서리는 코너로 남겨 절단 형상이 무너지지 않게 한다.
                if (turn < -0.82) {
                    var tangentX = (next[0] - previous[0]) / 6;
                    var tangentY = (next[1] - previous[1]) / 6;
                    points[i].leftDirection = [anchor[0] - tangentX, anchor[1] - tangentY];
                    points[i].rightDirection = [anchor[0] + tangentX, anchor[1] + tangentY];
                    points[i].pointType = PointType.SMOOTH;
                } else {
                    points[i].leftDirection = anchor;
                    points[i].rightDirection = anchor;
                    points[i].pointType = PointType.CORNER;
                }
            }

            if (useGradient && o.lit3D) {
                var left = 1e30, top = -1e30, right = -1e30, bottom = 1e30;
                for (i = 0; i < hull.length; i++) {
                    if (hull[i][0] < left) left = hull[i][0];
                    if (hull[i][0] > right) right = hull[i][0];
                    if (hull[i][1] > top) top = hull[i][1];
                    if (hull[i][1] < bottom) bottom = hull[i][1];
                }
                var gc = new GradientColor();
                gc.gradient = useGradient;
                gc.matrix = app.getIdentityMatrix();
                gc.origin = [left + (right - left) * 0.3, top - (top - bottom) * 0.28];
                gc.length = Math.max(right - left, top - bottom) * 0.82;
                path.fillColor = gc;
            }
            return path;
        }

        function drawCutCell(parent, key, o, ox, oy, edge, grads) {
            var atomRecords = [];
            var cornerDiameterRatio = touchRatio(key);
            var otherDiameterRatio = otherTouchRatio(key);
            var sites = atomSites(key, o.cellSpan, cornerDiameterRatio, otherDiameterRatio);
            for (var i = 0; i < sites.length; i++) {
                var point = sites[i].p;
                // role 0은 적색/어두운 이온, role 1은 녹색/밝은 이온이다.
                var isCorner = sites[i].role === 0;
                var rawBaseColor = o.colorMode === "color" ?
                    (isCorner ? [184, 52, 55] : [132, 168, 47]) :
                    (isCorner ? [128, 128, 128] : [180, 180, 180]);
                var baseColor = adjustedRgb(rawBaseColor, roleBrightness(o, isCorner));
                var radius = (isCorner ? cornerDiameterRatio : otherDiameterRatio) / 2;
                var parts = [];
                var atomFaces = [];
                addSphereSurface(atomFaces, point, radius, baseColor, o.cellSpan);
                addCutDisks(atomFaces, point, radius, baseColor, o.cellSpan);

                var curvedFaces = [];
                var cutGroups = {};
                for (var f = 0; f < atomFaces.length; f++) {
                    if (!atomFaces[f].cutFace) {
                        curvedFaces.push(atomFaces[f]);
                    } else {
                        var n = atomFaces[f].normal;
                        var groupKey = Math.round(n[0]) + "_" + Math.round(n[1]) + "_" + Math.round(n[2]);
                        if (!cutGroups[groupKey]) cutGroups[groupKey] = [];
                        cutGroups[groupKey].push(atomFaces[f]);
                    }
                }

                var bodyHull = projectedHullFromFaces(curvedFaces, edge, ox, oy);
                if (bodyHull.length >= 3) {
                    parts.push({
                        hull: bodyHull,
                        depth: -1e30,
                        baseColor: baseColor,
                        normal: normalize3([VIEW_X, VIEW_Y, VIEW_Z]),
                        cutFace: false,
                        gradient: o.colorMode === "color" ?
                            (isCorner ? grads.corner : grads.center) :
                            (isCorner ? grads.wireSphere : grads.cutCenterGray)
                    });
                }

                for (var keyName in cutGroups) {
                    if (!cutGroups.hasOwnProperty(keyName)) continue;
                    var cutHull = projectedHullFromFaces(cutGroups[keyName], edge, ox, oy);
                    if (cutHull.length < 3) continue;
                    var averageDepth = 0;
                    for (f = 0; f < cutGroups[keyName].length; f++) averageDepth += cutGroups[keyName][f].depth;
                    parts.push({
                        hull: cutHull,
                        depth: averageDepth / cutGroups[keyName].length + 1e-5,
                        baseColor: baseColor,
                        normal: cutGroups[keyName][0].normal,
                        cutFace: true,
                        gradient: null
                    });
                }
                // 한 원자의 구면과 절단면을 다른 원자의 패스 사이에 섞지 않는다.
                // 구면을 먼저 그리고, 보이는 절단 평면을 그 위에 깊이순으로 올린다.
                parts.sort(function(a, b) {
                    if (a.cutFace !== b.cutFace) return a.cutFace ? 1 : -1;
                    return a.depth - b.depth;
                });
                atomRecords.push({
                    depth: viewDepth(point),
                    parts: parts,
                    corner: isCorner,
                    index: i,
                    molecule: sites[i].molecule,
                    moleculeOrder: sites[i].moleculeOrder
                });
            }

            atomRecords.sort(function(a, b) {
                var depthDifference = a.depth - b.depth;
                if (Math.abs(depthDifference) > 1e-9) return depthDifference;
                if (key === "co2" && a.molecule === b.molecule) {
                    return a.moleculeOrder - b.moleculeOrder;
                }
                // 접촉점에서 깊이가 같으면 꼭짓점 원자를 마지막에 두어 잘린
                // 1/8 구의 경계가 면심 원자 아래로 사라지지 않게 한다.
                if (a.corner !== b.corner) return a.corner ? 1 : -1;
                return a.index - b.index;
            });

            for (var atomIndex = 0; atomIndex < atomRecords.length; atomIndex++) {
                var atomGroup = parent.groupItems.add();
                atomGroup.name = "CubicAtom_" + atomRecords[atomIndex].index;
                var atomParts = atomRecords[atomIndex].parts;
                for (var partIndex = 0; partIndex < atomParts.length; partIndex++) {
                    var part = atomParts[partIndex];
                    var fill = shadeMeshColor(
                        part.baseColor,
                        part.normal,
                        o.lit3D,
                        part.cutFace
                    );
                    drawBezierHull(atomGroup, part.hull, fill, o, part.gradient);
                }
            }

            if (o.outline) {
                var hull = cellSilhouette(edge, ox, oy, o.cellSpan);
                var frame = parent.pathItems.add();
                frame.setEntirePath(hull);
                frame.closed = true;
                frame.filled = false;
                frame.stroked = true;
                frame.strokeWidth = LINE_WIDTH_PT;
                frame.strokeColor = kColor(100);
            }
        }

        function drawWireCell(parent, key, o, ox, oy, edge, grads) {
            var records = [];
            var segments = cellEdgeSegments(o.cellSpan);
            for (var e = 0; e < segments.length; e++) {
                // 격자 모서리는 꼭짓점 원자의 중심을 잇지만, 실제 그림에서는 구의
                // 외곽에서 끝나야 한다. 화면상 구 반지름만큼 양 끝을 먼저 잘라낸다.
                var rawStart = screenPoint(segments[e].a, edge, ox, oy);
                var rawEnd = screenPoint(segments[e].b, edge, ox, oy);
                var screenLength = Math.sqrt(
                    (rawEnd[0] - rawStart[0]) * (rawEnd[0] - rawStart[0]) +
                    (rawEnd[1] - rawStart[1]) * (rawEnd[1] - rawStart[1])
                );
                var startRole = siteRoleAtPoint(key, segments[e].a);
                var endRole = siteRoleAtPoint(key, segments[e].b);
                var startRadius =
                    (startRole === 0 ? o.cornerSphereMM : o.otherSphereMM) * MM / 2 +
                    LINE_WIDTH_PT / 2;
                var endRadius =
                    (endRole === 0 ? o.cornerSphereMM : o.otherSphereMM) * MM / 2 +
                    LINE_WIDTH_PT / 2;
                var trimStart = screenLength > 1e-9 ? Math.min(0.49, startRadius / screenLength) : 0;
                var trimEnd = screenLength > 1e-9 ? Math.min(0.49, endRadius / screenLength) : 0;
                var trimmedA = [
                    segments[e].a[0] + (segments[e].b[0] - segments[e].a[0]) * trimStart,
                    segments[e].a[1] + (segments[e].b[1] - segments[e].a[1]) * trimStart,
                    segments[e].a[2] + (segments[e].b[2] - segments[e].a[2]) * trimStart
                ];
                var trimmedB = [
                    segments[e].b[0] + (segments[e].a[0] - segments[e].b[0]) * trimEnd,
                    segments[e].b[1] + (segments[e].a[1] - segments[e].b[1]) * trimEnd,
                    segments[e].b[2] + (segments[e].a[2] - segments[e].b[2]) * trimEnd
                ];

                // 점선은 대시 간격이 이어지도록 한 패스로 유지하고, 실선은 깊이
                // 판정을 정밀하게 하기 위해 짧은 구간으로 나눈다.
                var subdivisions = segments[e].hidden && o.hiddenDashed ? 1 : 6;
                for (var part = 0; part < subdivisions; part++) {
                    var t0 = part / subdivisions;
                    var t1 = (part + 1) / subdivisions;
                    var a = [
                        trimmedA[0] + (trimmedB[0] - trimmedA[0]) * t0,
                        trimmedA[1] + (trimmedB[1] - trimmedA[1]) * t0,
                        trimmedA[2] + (trimmedB[2] - trimmedA[2]) * t0
                    ];
                    var b = [
                        trimmedA[0] + (trimmedB[0] - trimmedA[0]) * t1,
                        trimmedA[1] + (trimmedB[1] - trimmedA[1]) * t1,
                        trimmedA[2] + (trimmedB[2] - trimmedA[2]) * t1
                    ];
                    records.push({
                        type: "line",
                        a: a,
                        b: b,
                        hidden: segments[e].hidden,
                        depth: (viewDepth(a) + viewDepth(b)) / 2
                    });
                }
            }

            var wireCornerRatio = o.cornerSphereMM * MM / edge;
            var wireOtherRatio = o.otherSphereMM * MM / edge;
            var sites = atomSites(key, o.cellSpan, wireCornerRatio, wireOtherRatio);
            for (var i = 0; i < sites.length; i++) {
                records.push({
                    type: "atom",
                    site: sites[i],
                    depth: viewDepth(sites[i].p)
                });
            }

            records.sort(function(a, b) {
                var depthDifference = a.depth - b.depth;
                if (Math.abs(depthDifference) > 1e-9) return depthDifference;
                if (
                    key === "co2" &&
                    a.type === "atom" && b.type === "atom" &&
                    a.site.molecule === b.site.molecule
                ) {
                    return a.site.moleculeOrder - b.site.moleculeOrder;
                }
                // 같은 깊이에서는 선을 먼저 그려 원자의 외곽이 연결선을 덮는다.
                if (a.type !== b.type) return a.type === "line" ? -1 : 1;
                return 0;
            });

            for (i = 0; i < records.length; i++) {
                if (records[i].type === "line") {
                    var start = screenPoint(records[i].a, edge, ox, oy);
                    var end = screenPoint(records[i].b, edge, ox, oy);
                    var line = parent.pathItems.add();
                    line.setEntirePath([start, end]);
                    line.filled = false;
                    line.stroked = true;
                    line.strokeWidth = LINE_WIDTH_PT;
                    line.strokeColor = kColor(100);
                    if (records[i].hidden && o.hiddenDashed) line.strokeDashes = [3, 2];
                } else {
                    var site = records[i].site;
                    var center = screenPoint(site.p, edge, ox, oy);
                    var isCorner = site.role === 0;
                    var dia = (isCorner ? o.cornerSphereMM : o.otherSphereMM) * MM;
                    drawSphere(parent, center[0], center[1], dia, o, grads, true, isCorner, false);
                }
            }
        }

        function drawCell(parent, key, mode, o, ox, oy, edge, grads) {
            var g = parent.groupItems.add();
            g.name = "CubicLattice_" + key + "_" + mode;

            if (mode === "cut") {
                drawCutCell(g, key, o, ox, oy, edge, grads);
                return g;
            }

            if (mode === "wire") {
                drawWireCell(g, key, o, ox, oy, edge, grads);
                return g;
            }

            // 카메라 깊이순으로 뒤에서 앞으로 그린다. z값만 비교하면 서로 다른
            // x/y 평면의 FCC 면심 원자가 잘못 포개진다.
            var packCornerRatio = touchRatio(key);
            var packOtherRatio = otherTouchRatio(key);
            var sites = atomSites(key, o.cellSpan, packCornerRatio, packOtherRatio);
            sites.sort(function(p, q) {
                var d = viewDepth(p.p) - viewDepth(q.p);
                if (Math.abs(d) > 1e-9) return d;
                if (key === "co2" && p.molecule === q.molecule) {
                    return p.moleculeOrder - q.moleculeOrder;
                }
                var sp = screenPoint(p.p, 1, 0, 0);
                var sq = screenPoint(q.p, 1, 0, 0);
                return (sq[1] - sp[1]) || (sp[0] - sq[0]);
            });
            var holder = g;
            for (var i = 0; i < sites.length; i++) {
                var s = screenPoint(sites[i].p, edge, ox, oy);
                var isCorner = sites[i].role === 0;
                var dia = edge * (isCorner ? packCornerRatio : packOtherRatio);
                drawSphere(
                    holder,
                    s[0],
                    s[1],
                    dia,
                    o,
                    grads,
                    mode === "pack",
                    isCorner,
                    mode === "pack"
                );
            }

            return g;
        }

        function drawCells(o, targetLayer) {
            if (app.documents.length === 0) return [];
            applyProjection(o);
            var doc = app.activeDocument;
            var layer = targetLayer ? targetLayer : doc.activeLayer;
            var grads = getGradients(doc);
            configureGradients(grads, o);
            var edge = o.cellMM * MM;
            var gap = o.gapMM * MM;
            var unitBounds = cellBounds(1, 0, 0, o.cellSpan);
            var cellW = edge * (unitBounds[2] - unitBounds[0]);
            var cellH = edge * (unitBounds[1] - unitBounds[3]);
            var cols = o.lattices.length, rows = o.modes.length;
            var totalW = cols * cellW + (cols - 1) * gap;
            var totalH = rows * cellH + (rows - 1) * gap;
            var vc = doc.activeView.centerPoint;
            var left0 = vc[0] - totalW / 2, top0 = vc[1] + totalH / 2;

            var created = [];
            for (var r = 0; r < rows; r++) {
                for (var c = 0; c < cols; c++) {
                    // ox/oy는 격자 원점 [0,0,0]의 투영 위치다.
                    var ox = left0 + c * (cellW + gap) - edge * unitBounds[0];
                    var oy = top0 - r * (cellH + gap) - edge * unitBounds[1];
                    created.push(drawCell(layer, o.lattices[c], o.modes[r], o, ox, oy, edge, grads));
                }
            }
            return created;
        }

        return api;
    }

    // ==== 다이아몬드 엔진 =====================================================

    function makeDiamondEngine() {
        var MM = 2.834645669;
        var FRAME_WIDTH_PT = 0.3;
        var SCREEN_X = [0, 0, 0];
        var SCREEN_Y = [0, 0, 0];
        var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;
        var DIAMOND_NEIGHBOR_DISTANCE = Math.sqrt(3) / 4;

        function clamp(value, minValue, maxValue) {
            return Math.max(minValue, Math.min(maxValue, value));
        }

        function setProjectionAngles(angleR, angleL, depthPercent) {
            var alphaR = (angleR - 90) * Math.PI / 180;
            var alphaL = (angleL - 90) * Math.PI / 180;
            var depthScale = (depthPercent === undefined ? 100 : depthPercent) / 100;
            var cosR = Math.cos(alphaR), sinR = Math.sin(alphaR);
            var cosL = Math.cos(alphaL), sinL = Math.sin(alphaL);
            SCREEN_X = [cosR, 0, -depthScale * cosL];
            SCREEN_Y = [-sinR, 1, -depthScale * sinL];
            var rawView = [
                depthScale * cosL,
                depthScale * Math.sin(alphaR + alphaL),
                cosR
            ];
            var length = Math.sqrt(
                rawView[0] * rawView[0] +
                rawView[1] * rawView[1] +
                rawView[2] * rawView[2]
            );
            VIEW_X = rawView[0] / length;
            VIEW_Y = rawView[1] / length;
            VIEW_Z = rawView[2] / length;
        }
        setProjectionAngles(131, 109, 100);

        var DIAMOND_BASIS = [
            [0, 0, 0],
            [0, 0.5, 0.5],
            [0.5, 0, 0.5],
            [0.5, 0.5, 0],
            [0.25, 0.25, 0.25],
            [0.25, 0.75, 0.75],
            [0.75, 0.25, 0.75],
            [0.75, 0.75, 0.25]
        ];

        function coordinateKey(point) {
            return (
                Math.round(point[0] * 10000) + "_" +
                Math.round(point[1] * 10000) + "_" +
                Math.round(point[2] * 10000)
            );
        }

        function diamondSitesInBounds(minimum, maximum) {
            var sites = [];
            var seen = {};
            var translationMinimum = Math.floor(minimum) - 1;
            var translationMaximum = Math.ceil(maximum) + 1;
            for (var tx = translationMinimum; tx <= translationMaximum; tx++) {
                for (var ty = translationMinimum; ty <= translationMaximum; ty++) {
                    for (var tz = translationMinimum; tz <= translationMaximum; tz++) {
                        for (var basisIndex = 0; basisIndex < DIAMOND_BASIS.length; basisIndex++) {
                            var basis = DIAMOND_BASIS[basisIndex];
                            var point = [
                                basis[0] + tx,
                                basis[1] + ty,
                                basis[2] + tz
                            ];
                            if (
                                point[0] < minimum - 1e-9 || point[0] > maximum + 1e-9 ||
                                point[1] < minimum - 1e-9 || point[1] > maximum + 1e-9 ||
                                point[2] < minimum - 1e-9 || point[2] > maximum + 1e-9
                            ) continue;
                            var key = coordinateKey(point);
                            if (seen[key]) continue;
                            seen[key] = true;
                            sites.push({ p: point, key: key });
                        }
                    }
                }
            }
            return sites;
        }

        // 주변 주기 셀까지 생성한 뒤 지정한 셀 경계 안의 원자만 남긴다.
        // 이 방식으로 꼭짓점과 여섯 면의 FCC 원자가 빠지지 않는다.
        function diamondSites(span) {
            return diamondSitesInBounds(0, span);
        }

        function diamondBonds(sites) {
            var bonds = [];
            var targetSquared = DIAMOND_NEIGHBOR_DISTANCE * DIAMOND_NEIGHBOR_DISTANCE;
            for (var i = 0; i < sites.length; i++) {
                for (var j = i + 1; j < sites.length; j++) {
                    var dx = sites[i].p[0] - sites[j].p[0];
                    var dy = sites[i].p[1] - sites[j].p[1];
                    var dz = sites[i].p[2] - sites[j].p[2];
                    var distanceSquared = dx * dx + dy * dy + dz * dz;
                    if (Math.abs(distanceSquared - targetSquared) < 1e-8) {
                        bonds.push({ a: i, b: j });
                    }
                }
            }
            return bonds;
        }

        // 셀 경계 원자의 셀 밖 최근접 이웃을 한 겹 포함해 모든 경계 탄소의
        // 네 정사면체 결합이 끊기지 않도록 한다.
        function completeDiamondNetwork(span) {
            var coreSites = diamondSites(span);
            var extendedSites = diamondSitesInBounds(-0.25, span + 0.25);
            var extendedBonds = diamondBonds(extendedSites);
            var coreKeys = {};
            var keepKeys = {};
            var i;
            for (i = 0; i < coreSites.length; i++) {
                coreKeys[coreSites[i].key] = true;
                keepKeys[coreSites[i].key] = true;
            }
            for (i = 0; i < extendedBonds.length; i++) {
                var siteA = extendedSites[extendedBonds[i].a];
                var siteB = extendedSites[extendedBonds[i].b];
                if (coreKeys[siteA.key] || coreKeys[siteB.key]) {
                    keepKeys[siteA.key] = true;
                    keepKeys[siteB.key] = true;
                }
            }
            var sites = [];
            var oldToNew = {};
            for (i = 0; i < extendedSites.length; i++) {
                if (!keepKeys[extendedSites[i].key]) continue;
                oldToNew[i] = sites.length;
                sites.push(extendedSites[i]);
            }
            var bonds = [];
            for (i = 0; i < extendedBonds.length; i++) {
                if (
                    oldToNew[extendedBonds[i].a] !== undefined &&
                    oldToNew[extendedBonds[i].b] !== undefined
                ) {
                    bonds.push({
                        a: oldToNew[extendedBonds[i].a],
                        b: oldToNew[extendedBonds[i].b]
                    });
                }
            }
            return { sites: sites, bonds: bonds, coreKeys: coreKeys };
        }

        // 세 개의 정사면체 단으로 이루어진 유한 피라미드 클러스터.
        // 기하학적 행은 1-1-3-3-6이며, 마지막 경계 탄소는 1~2개의
        // 결합만 남겨 피라미드 실루엣을 유지한다.
        function diamondPyramidGeometry(levels) {
            var bondLength = DIAMOND_NEIGHBOR_DISTANCE;
            // 관찰 투영에서도 각 행이 위아래로 분리되도록 높이 성분을 충분히 둔다.
            var layerDrop = bondLength * 0.68;
            var horizontalRadius = Math.sqrt(
                bondLength * bondLength - layerDrop * layerDrop
            );
            var directions = [];
            for (var directionIndex = 0; directionIndex < 3; directionIndex++) {
                var angle = directionIndex * Math.PI * 2 / 3;
                directions.push([
                    horizontalRadius * Math.cos(angle),
                    horizontalRadius * Math.sin(angle)
                ]);
            }
            var sites = [];
            var bonds = [];
            var apexIndex = sites.length;
            sites.push({
                p: [0, bondLength, 0],
                key: "pyramid_apex",
                tier: 0,
                row: 0
            });
            var upperCenterIndex = sites.length;
            sites.push({
                p: [0, 0, 0],
                key: "pyramid_upper_center",
                tier: 0,
                row: 1
            });
            bonds.push({ a: apexIndex, b: upperCenterIndex });

            var upperLowerIndices = [];
            var lowerCenterIndices = [];
            var i, j;
            for (i = 0; i < 3; i++) {
                upperLowerIndices[i] = sites.length;
                sites.push({
                    p: [directions[i][0], -layerDrop, directions[i][1]],
                    key: "pyramid_upper_lower_" + i,
                    tier: 0,
                    row: 2
                });
                bonds.push({ a: upperCenterIndex, b: upperLowerIndices[i] });

                lowerCenterIndices[i] = sites.length;
                sites.push({
                    p: [
                        directions[i][0],
                        -layerDrop - bondLength,
                        directions[i][1]
                    ],
                    key: "pyramid_lower_center_" + i,
                    tier: 1,
                    row: 3
                });
                bonds.push({ a: upperLowerIndices[i], b: lowerCenterIndices[i] });
            }
            var lowerMap = {};
            for (i = 0; i < 3; i++) {
                for (j = 0; j < 3; j++) {
                    var lowerPoint = [
                        directions[i][0] + directions[j][0],
                        -bondLength - layerDrop * 2,
                        directions[i][1] + directions[j][1]
                    ];
                    var lowerKey = coordinateKey(lowerPoint);
                    var lowerIndex = lowerMap[lowerKey];
                    if (lowerIndex === undefined) {
                        lowerIndex = sites.length;
                        lowerMap[lowerKey] = lowerIndex;
                        sites.push({
                            p: lowerPoint,
                            key: "pyramid_lower_" + lowerKey,
                            tier: 2,
                            row: 4
                        });
                    }
                    bonds.push({ a: lowerCenterIndices[i], b: lowerIndex });
                }
            }
            return { sites: sites, bonds: bonds };
        }

        function cellEdgeSegments(span) {
            var segments = [];
            function add(a, b) { segments.push({ a: a, b: b }); }
            var x, y, z;
            for (x = 0; x < span; x++) {
                for (y = 0; y <= span; y++) {
                    for (z = 0; z <= span; z++) add([x, y, z], [x + 1, y, z]);
                }
            }
            for (x = 0; x <= span; x++) {
                for (y = 0; y < span; y++) {
                    for (z = 0; z <= span; z++) add([x, y, z], [x, y + 1, z]);
                }
            }
            for (x = 0; x <= span; x++) {
                for (y = 0; y <= span; y++) {
                    for (z = 0; z < span; z++) add([x, y, z], [x, y, z + 1]);
                }
            }
            return segments;
        }

        function screenPoint(point, edge, ox, oy) {
            return [
                ox + edge * (
                    SCREEN_X[0] * point[0] +
                    SCREEN_X[1] * point[1] +
                    SCREEN_X[2] * point[2]
                ),
                oy + edge * (
                    SCREEN_Y[0] * point[0] +
                    SCREEN_Y[1] * point[1] +
                    SCREEN_Y[2] * point[2]
                )
            ];
        }

        function viewDepth(point) {
            return VIEW_X * point[0] + VIEW_Y * point[1] + VIEW_Z * point[2];
        }

        function rgbColor(r, g, b) {
            var color = new RGBColor();
            color.red = clamp(r, 0, 255);
            color.green = clamp(g, 0, 255);
            color.blue = clamp(b, 0, 255);
            return color;
        }

        function kColor(k) {
            var color = new GrayColor();
            color.gray = clamp(k, 0, 100);
            return color;
        }

        function adjustedRgb(rgb, brightness) {
            var value = clamp(brightness, 40, 160);
            var result = [], i;
            if (value <= 100) {
                for (i = 0; i < 3; i++) result[i] = rgb[i] * value / 100;
            } else {
                var towardWhite = (value - 100) / 60;
                for (i = 0; i < 3; i++) {
                    result[i] = rgb[i] + (255 - rgb[i]) * towardWhite;
                }
            }
            return result;
        }

        function adjustedK(k, brightness) {
            var value = clamp(brightness, 40, 160);
            if (value <= 100) return Math.min(90, k + (90 - k) * (100 - value) / 60);
            return Math.max(0, k * (160 - value) / 60);
        }

        var gradientCache = null;
        var gradientCacheDoc = null;

        function getCarbonGradient(documentRef) {
            if (gradientCache && gradientCacheDoc === documentRef) return gradientCache;
            var gradient = documentRef.gradients.add();
            gradient.name = "DiamondCarbon_" + (new Date().getTime());
            gradient.type = GradientType.RADIAL;
            for (var stopIndex = gradient.gradientStops.length; stopIndex < 2; stopIndex++) gradient.gradientStops.add();
            gradient.gradientStops[0].rampPoint = 0;
            gradient.gradientStops[0].midPoint = 13.3;
            gradient.gradientStops[1].rampPoint = 100;
            gradientCache = gradient;
            gradientCacheDoc = documentRef;
            return gradient;
        }

        function configureGradient(gradient, options) {
            if (options.colorMode === "color") {
                var light = adjustedRgb([220, 236, 244], options.brightness);
                var dark = adjustedRgb([65, 89, 105], options.brightness);
                gradient.gradientStops[0].color = rgbColor(light[0], light[1], light[2]);
                gradient.gradientStops[1].color = rgbColor(dark[0], dark[1], dark[2]);
            } else {
                gradient.gradientStops[0].color = kColor(adjustedK(0, options.brightness));
                gradient.gradientStops[1].color = kColor(adjustedK(80, options.brightness));
            }
        }

        function flatAtomColor(options) {
            if (options.colorMode === "color") {
                var rgb = adjustedRgb([92, 118, 134], options.brightness);
                return rgbColor(rgb[0], rgb[1], rgb[2]);
            }
            return kColor(adjustedK(55, options.brightness));
        }

        function drawLitSphere(parent, cx, cy, diameter, options, gradient) {
            var radius = diameter / 2;
            var highlightX = cx - radius * 0.35;
            var highlightY = cy + radius * 0.35;
            var gradientRadius = radius * 1.7;
            var sphereGroup = parent.groupItems.add();
            var clippedGroup = sphereGroup.groupItems.add();
            var gradientColor = new GradientColor();
            gradientColor.gradient = gradient;
            gradientColor.matrix = app.getIdentityMatrix();
            gradientColor.origin = [highlightX - gradientRadius, highlightY + gradientRadius];
            gradientColor.length = gradientRadius * 2;
            var largeCircle = clippedGroup.pathItems.ellipse(
                highlightY + gradientRadius,
                highlightX - gradientRadius,
                gradientRadius * 2,
                gradientRadius * 2
            );
            largeCircle.filled = true;
            largeCircle.stroked = false;
            largeCircle.fillColor = gradientColor;
            var mask = clippedGroup.pathItems.ellipse(
                cy + radius, cx - radius, diameter, diameter
            );
            mask.filled = false;
            mask.stroked = false;
            mask.clipping = true;
            clippedGroup.clipped = true;
            if (options.outline) {
                var outline = sphereGroup.pathItems.ellipse(
                    cy + radius, cx - radius, diameter, diameter
                );
                outline.filled = false;
                outline.stroked = true;
                outline.strokeWidth = FRAME_WIDTH_PT;
                outline.strokeColor = kColor(100);
            }
        }

        function drawSphere(parent, cx, cy, diameter, options, gradient) {
            if (options.lit3D) {
                drawLitSphere(parent, cx, cy, diameter, options, gradient);
                return;
            }
            var radius = diameter / 2;
            var circle = parent.pathItems.ellipse(cy + radius, cx - radius, diameter, diameter);
            circle.filled = true;
            circle.fillColor = flatAtomColor(options);
            circle.stroked = options.outline;
            if (options.outline) {
                circle.strokeWidth = FRAME_WIDTH_PT;
                circle.strokeColor = kColor(100);
            }
        }

        function projectedBounds(sites, span, edge, includeFrame) {
            var points = [];
            for (var i = 0; i < sites.length; i++) points.push(sites[i].p);
            if (includeFrame) {
                points.push([0, 0, 0], [span, 0, 0], [0, span, 0], [0, 0, span]);
                points.push([span, span, 0], [span, 0, span], [0, span, span], [span, span, span]);
            }
            var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
            for (i = 0; i < points.length; i++) {
                var projected = screenPoint(points[i], edge, 0, 0);
                if (projected[0] < left) left = projected[0];
                if (projected[0] > right) right = projected[0];
                if (projected[1] > top) top = projected[1];
                if (projected[1] < bottom) bottom = projected[1];
            }
            return [left, top, right, bottom];
        }

        function drawTrimmedLine(parent, a, b, trimRadius, width, color, dashed) {
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var length = Math.sqrt(dx * dx + dy * dy);
            var start = [a[0], a[1]], end = [b[0], b[1]];
            if (length > trimRadius * 2 + 0.01) {
                var ratio = trimRadius / length;
                start = [a[0] + dx * ratio, a[1] + dy * ratio];
                end = [b[0] - dx * ratio, b[1] - dy * ratio];
            }
            var line = parent.pathItems.add();
            line.setEntirePath([start, end]);
            line.filled = false;
            line.stroked = true;
            line.strokeWidth = width;
            line.strokeColor = color;
            if (dashed) line.strokeDashes = [3, 2];
        }

        function drawDiamond(options, targetParent) {
            setProjectionAngles(options.angleR, options.angleL, options.depthPercent);
            var documentRef = app.activeDocument;
            var parent = targetParent ? targetParent : documentRef.activeLayer;
            var group = parent.groupItems.add();
            group.name = "DiamondCrystal";
            var isPyramid = options.shape === "pyramid";
            var span = isPyramid ? options.pyramidLevels : options.cellSpan;
            var edge = options.cellMM * MM;
            var atomDiameter = options.atomMM * MM;
            var atomRadius = atomDiameter / 2 + options.bondWidth / 2;
            var geometry;
            if (isPyramid) {
                geometry = diamondPyramidGeometry(options.pyramidLevels);
            } else if (options.completeBoundary) {
                geometry = completeDiamondNetwork(span);
            } else {
                var cellSites = diamondSites(span);
                geometry = { sites: cellSites, bonds: diamondBonds(cellSites) };
            }
            var sites = geometry.sites;
            var bonds = geometry.bonds;
            var frames = isPyramid ? [] : cellEdgeSegments(span);
            var bounds = projectedBounds(sites, span, edge, !isPyramid && options.showCell);
            var artboard = documentRef.artboards[documentRef.artboards.getActiveArtboardIndex()].artboardRect;
            var ox = (artboard[0] + artboard[2]) / 2 - (bounds[0] + bounds[2]) / 2;
            var oy = (artboard[1] + artboard[3]) / 2 - (bounds[1] + bounds[3]) / 2;
            var centerDepth = 0;
            for (var depthIndex = 0; depthIndex < sites.length; depthIndex++) {
                centerDepth += viewDepth(sites[depthIndex].p);
            }
            centerDepth = sites.length > 0 ? centerDepth / sites.length : 0;
            var records = [];
            var i;

            if (options.showCell && !isPyramid) {
                for (i = 0; i < frames.length; i++) {
                    var frameMidpoint = [
                        (frames[i].a[0] + frames[i].b[0]) / 2,
                        (frames[i].a[1] + frames[i].b[1]) / 2,
                        (frames[i].a[2] + frames[i].b[2]) / 2
                    ];
                    records.push({
                        type: "frame",
                        a: frames[i].a,
                        b: frames[i].b,
                        depth: viewDepth(frameMidpoint),
                        hidden: viewDepth(frameMidpoint) < centerDepth - 1e-9
                    });
                }
            }
            if (options.showBonds) {
                for (i = 0; i < bonds.length; i++) {
                    var bondA = sites[bonds[i].a].p;
                    var bondB = sites[bonds[i].b].p;
                    var bondMidpoint = [
                        (bondA[0] + bondB[0]) / 2,
                        (bondA[1] + bondB[1]) / 2,
                        (bondA[2] + bondB[2]) / 2
                    ];
                    records.push({
                        type: "bond",
                        a: bondA,
                        b: bondB,
                        depth: viewDepth(bondMidpoint),
                        hidden: viewDepth(bondMidpoint) < centerDepth - 1e-9
                    });
                }
            }
            for (i = 0; i < sites.length; i++) {
                records.push({
                    type: "atom",
                    site: sites[i],
                    depth: viewDepth(sites[i].p)
                });
            }
            records.sort(function(a, b) {
                var difference = a.depth - b.depth;
                if (Math.abs(difference) > 1e-9) return difference;
                if (a.type !== b.type) return a.type === "atom" ? 1 : -1;
                return 0;
            });

            var gradient = getCarbonGradient(documentRef);
            configureGradient(gradient, options);
            for (i = 0; i < records.length; i++) {
                var record = records[i];
                if (record.type === "atom") {
                    var atomPoint = screenPoint(record.site.p, edge, ox, oy);
                    drawSphere(group, atomPoint[0], atomPoint[1], atomDiameter, options, gradient);
                } else {
                    var start = screenPoint(record.a, edge, ox, oy);
                    var end = screenPoint(record.b, edge, ox, oy);
                    var dashed = options.hiddenDashed && record.hidden && (isPyramid || span === 1);
                    drawTrimmedLine(
                        group,
                        start,
                        end,
                        atomRadius,
                        record.type === "frame" ? FRAME_WIDTH_PT : options.bondWidth,
                        record.type === "frame" ? kColor(100) : kColor(85),
                        dashed
                    );
                }
            }
            return group;
        }

        var radOneCell, radEightCells, radPyramid, chkCell, chkBonds, chkCompleteBoundary, chkHiddenDashed;
        var sldCell, sldAtom, sldBondWidth, sldBrightness;

        var api = {
            label: "다이아몬드",
            usesViewAngles: true,
            fieldCount: 10,
            addRows: addRows,
            validate: function() { return null; },
            syncEnabled: syncEnabled,
            draw: function(layer) { return asArray(drawDiamond(collectOptions(), layer)); },
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function addRows(page) {
            var pnlCell = page.add("panel", undefined, "셀 구성");
            pnlCell.orientation = "row";
            radOneCell = pnlCell.add("radiobutton", undefined, "1셀");
            radEightCells = pnlCell.add("radiobutton", undefined, "8셀 (2×2×2)");
            radPyramid = pnlCell.add("radiobutton", undefined, "피라미드 클러스터");
            radOneCell.value = true;
            radOneCell.onClick = updatePreview;
            radEightCells.onClick = updatePreview;
            radPyramid.onClick = updatePreview;

            var pnlDisplay = page.add("panel", undefined, "표현 방식");
            pnlDisplay.alignChildren = "left";
            pnlDisplay.spacing = 2;
            var displayRow1 = pnlDisplay.add("group");   // 두 줄로 나눠 폭을 줄인다
            displayRow1.spacing = 16;
            chkCell = displayRow1.add("checkbox", undefined, "단위세포 라인");
            chkCell.value = true;
            chkBonds = displayRow1.add("checkbox", undefined, "C-C 결합선");
            chkBonds.value = true;
            var displayRow2 = pnlDisplay.add("group");
            displayRow2.spacing = 16;
            chkCompleteBoundary = displayRow2.add("checkbox", undefined, "경계 결합 완성");
            chkCompleteBoundary.value = true;
            chkHiddenDashed = displayRow2.add("checkbox", undefined, "숨김선 점선 (해제: 실선)");
            chkHiddenDashed.value = true;
            chkCell.onClick = updatePreview;
            chkBonds.onClick = updatePreview;
            chkCompleteBoundary.onClick = updatePreview;
            chkHiddenDashed.onClick = updatePreview;

            var pnlSize = page.add("panel", undefined, "크기·밝기 조절");
            pnlSize.orientation = "column";
            pnlSize.alignChildren = "left";
            pnlSize.spacing = 2;
            sldCell = addSliderRow(pnlSize, "셀 한 변", 112, 8, 80, 28, "mm", 0.1);
            var pyramidInfoRow = pnlSize.add("group");
            var pyramidInfoLabel = pyramidInfoRow.add("statictext", undefined, "피라미드 층");
            pyramidInfoLabel.preferredSize.width = 112;
            pyramidInfoRow.add("statictext", undefined, "3층 (고정)");
            sldAtom = addSliderRow(pnlSize, "탄소 구 지름", 112, 1, 12, 4, "mm", 0.1);
            sldBondWidth = addSliderRow(pnlSize, "결합선 굵기", 112, 0.1, 2, 0.5, "pt", 0.1);
            sldBrightness = addSliderRow(pnlSize, "탄소 밝기", 112, 40, 160, 100, "%", 1);
        }

        function syncEnabled() {
            var isPyramid = radPyramid.value;
            chkCell.enabled = !isPyramid;
            chkCompleteBoundary.enabled = !isPyramid;
            chkHiddenDashed.enabled =
                (isPyramid || radOneCell.value) &&
                ((!isPyramid && chkCell.value) || chkBonds.value);
        }

        function collectOptions() {
            return {
                shape: radPyramid.value ? "pyramid" : "cell",
                cellSpan: radEightCells.value ? 2 : 1,
                pyramidLevels: 3,
                showCell: chkCell.value && !radPyramid.value,
                showBonds: chkBonds.value,
                completeBoundary: chkCompleteBoundary.value && !radPyramid.value,
                hiddenDashed: chkHiddenDashed.value && (radOneCell.value || radPyramid.value),
                lit3D: chkLit3D.value,
                outline: chkOutline.value,
                colorMode: colorModeValue(),
                cellMM: sldCell.value,
                atomMM: sldAtom.value,
                bondWidth: sldBondWidth.value,
                brightness: sldBrightness.value,
                angleR: sldAngleR.value,
                angleL: sldAngleL.value,
                depthPercent: sldDepth.value
            };
        }

        function saveFields() {
            return [radPyramid.value ? "pyramid" : "cell", radEightCells.value ? "2" : "1",
                chkCell.value ? "1" : "0", chkBonds.value ? "1" : "0", chkCompleteBoundary.value ? "1" : "0",
                chkHiddenDashed.value ? "1" : "0", sldCell.value, sldAtom.value, sldBondWidth.value, sldBrightness.value];
        }
        function restoreFields(f) {
            radPyramid.value = (f[0] === "pyramid");
            radEightCells.value = !radPyramid.value && (f[1] === "2");
            radOneCell.value = !radPyramid.value && !radEightCells.value;
            chkCell.value = (f[2] === "1");
            chkBonds.value = (f[3] === "1");
            chkCompleteBoundary.value = (f[4] === "1");
            chkHiddenDashed.value = (f[5] === "1");
            restoreSlider(sldCell, f[6]);
            restoreSlider(sldAtom, f[7]);
            restoreSlider(sldBondWidth, f[8]);
            restoreSlider(sldBrightness, f[9]);
        }

        return api;
    }

    // ==== 흑연 엔진 ===========================================================

    function makeGraphiteEngine() {
        var MM = 2.834645669;
        var LINE_WIDTH_PT = 0.3;
        var SQRT3 = Math.sqrt(3);
        var SCREEN_X = [0, 0, 0];
        var SCREEN_Y = [0, 0, 0];
        var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;

        function clamp(value, minValue, maxValue) {
            return Math.max(minValue, Math.min(maxValue, value));
        }

        // Object_isometric.jsx와 같은 코너 각도 체계. x/z는 흑연 층,
        // y는 적층 방향이며 앞·뒤 면 거리는 z축 길이만 조절한다.
        function setProjectionAngles(angleR, angleL, depthPercent) {
            var alphaR = (angleR - 90) * Math.PI / 180;
            var alphaL = (angleL - 90) * Math.PI / 180;
            var depthScale = (depthPercent === undefined ? 100 : depthPercent) / 100;
            var cosR = Math.cos(alphaR), sinR = Math.sin(alphaR);
            var cosL = Math.cos(alphaL), sinL = Math.sin(alphaL);
            SCREEN_X = [cosR, 0, -depthScale * cosL];
            SCREEN_Y = [-sinR, 1, -depthScale * sinL];
            var rawView = [
                depthScale * cosL,
                depthScale * Math.sin(alphaR + alphaL),
                cosR
            ];
            var length = Math.sqrt(
                rawView[0] * rawView[0] +
                rawView[1] * rawView[1] +
                rawView[2] * rawView[2]
            );
            VIEW_X = rawView[0] / length;
            VIEW_Y = rawView[1] / length;
            VIEW_Z = rawView[2] / length;
        }
        setProjectionAngles(132, 108, 100);

        function pointKey(x, z) {
            return Math.round(x * 10000) + "_" + Math.round(z * 10000);
        }

        // 정육각형을 가로·세로로 융합하여 중복 원자와 중복 결합을 제거한다.
        function generateHoneycombSheet(columns, rows, shiftX, shiftZ) {
            var atoms = [];
            var bonds = [];
            var atomMap = {};
            var bondMap = {};

            function addAtom(x, z) {
                var key = pointKey(x, z);
                if (atomMap[key] !== undefined) return atomMap[key];
                var index = atoms.length;
                atoms.push({ x: x, z: z, key: key });
                atomMap[key] = index;
                return index;
            }

            function addBond(a, b) {
                var low = Math.min(a, b), high = Math.max(a, b);
                var key = low + "_" + high;
                if (bondMap[key]) return;
                bondMap[key] = true;
                bonds.push({ a: low, b: high });
            }

            for (var column = 0; column < columns; column++) {
                for (var row = 0; row < rows; row++) {
                    var centerX = column * 1.5 + shiftX;
                    var centerZ = SQRT3 * (row + (column % 2) * 0.5) + shiftZ;
                    var vertexIndices = [];
                    for (var corner = 0; corner < 6; corner++) {
                        var angle = corner * Math.PI / 3;
                        vertexIndices.push(addAtom(
                            centerX + Math.cos(angle),
                            centerZ + Math.sin(angle)
                        ));
                    }
                    for (corner = 0; corner < 6; corner++) {
                        addBond(vertexIndices[corner], vertexIndices[(corner + 1) % 6]);
                    }
                }
            }
            return { atoms: atoms, bonds: bonds };
        }

        function buildGraphiteGeometry(columns, rows, layerCount, layerGapRatio, stacking, interlayer) {
            var atoms = [];
            var bonds = [];
            var layerMaps = [];
            var layerAtomIndices = [];

            for (var layer = 0; layer < layerCount; layer++) {
                var isShifted = stacking === "AB" && layer % 2 === 1;
                var sheet = generateHoneycombSheet(columns, rows, isShifted ? 1 : 0, 0);
                var indexMap = [];
                var positionMap = {};
                layerAtomIndices[layer] = [];
                for (var atomIndex = 0; atomIndex < sheet.atoms.length; atomIndex++) {
                    var sheetAtom = sheet.atoms[atomIndex];
                    var globalIndex = atoms.length;
                    atoms.push({
                        p: [sheetAtom.x, layer * layerGapRatio, sheetAtom.z],
                        layer: layer,
                        sheetKey: sheetAtom.key
                    });
                    indexMap[atomIndex] = globalIndex;
                    positionMap[sheetAtom.key] = globalIndex;
                    layerAtomIndices[layer].push(globalIndex);
                }
                layerMaps[layer] = positionMap;
                for (var bondIndex = 0; bondIndex < sheet.bonds.length; bondIndex++) {
                    bonds.push({
                        a: indexMap[sheet.bonds[bondIndex].a],
                        b: indexMap[sheet.bonds[bondIndex].b],
                        interlayer: false
                    });
                }
            }

            if (interlayer) {
                for (layer = 1; layer < layerCount; layer++) {
                    var lowerMap = layerMaps[layer - 1];
                    var upperIndices = layerAtomIndices[layer];
                    for (var upper = 0; upper < upperIndices.length; upper++) {
                        var upperIndex = upperIndices[upper];
                        var upperAtom = atoms[upperIndex];
                        if (lowerMap[upperAtom.sheetKey] !== undefined) {
                            bonds.push({
                                a: lowerMap[upperAtom.sheetKey],
                                b: upperIndex,
                                interlayer: true
                            });
                        }
                    }
                }
            }
            return { atoms: atoms, bonds: bonds };
        }

        function screenPoint(p, scale, ox, oy) {
            return [
                ox + scale * (SCREEN_X[0] * p[0] + SCREEN_X[1] * p[1] + SCREEN_X[2] * p[2]),
                oy + scale * (SCREEN_Y[0] * p[0] + SCREEN_Y[1] * p[1] + SCREEN_Y[2] * p[2])
            ];
        }

        function viewDepth(p) {
            return VIEW_X * p[0] + VIEW_Y * p[1] + VIEW_Z * p[2];
        }

        function rgbColor(r, g, b) {
            var color = new RGBColor();
            color.red = clamp(r, 0, 255);
            color.green = clamp(g, 0, 255);
            color.blue = clamp(b, 0, 255);
            return color;
        }

        function kColor(k) {
            var color = new GrayColor();
            color.gray = clamp(k, 0, 100);
            return color;
        }

        function adjustedRgb(rgb, brightness) {
            var value = clamp(brightness, 40, 160);
            var result = [], i;
            if (value <= 100) {
                for (i = 0; i < 3; i++) result[i] = rgb[i] * value / 100;
            } else {
                var towardWhite = (value - 100) / 60;
                for (i = 0; i < 3; i++) {
                    result[i] = rgb[i] + (255 - rgb[i]) * towardWhite;
                }
            }
            return result;
        }

        function adjustedK(k, brightness) {
            var value = clamp(brightness, 40, 160);
            if (value <= 100) return Math.min(90, k + (90 - k) * (100 - value) / 60);
            return Math.max(0, k * (160 - value) / 60);
        }

        var gradientCache = null;
        var gradientCacheDoc = null;

        function makeRadialGradient(doc, name) {
            var gradient = doc.gradients.add();
            gradient.name = name + "_" + (new Date().getTime());
            gradient.type = GradientType.RADIAL;
            for (var stopIndex = gradient.gradientStops.length; stopIndex < 2; stopIndex++) gradient.gradientStops.add();
            gradient.gradientStops[0].rampPoint = 0;
            gradient.gradientStops[0].midPoint = 13.3;
            gradient.gradientStops[1].rampPoint = 100;
            return gradient;
        }

        function getGradient(doc) {
            if (gradientCache && gradientCacheDoc === doc) return gradientCache;
            gradientCache = makeRadialGradient(doc, "GraphiteCarbon");
            gradientCacheDoc = doc;
            return gradientCache;
        }

        function configureGradient(gradient, options) {
            if (options.colorMode === "color") {
                var lightRgb = adjustedRgb([205, 218, 225], options.brightness);
                var darkRgb = adjustedRgb([42, 54, 62], options.brightness);
                gradient.gradientStops[0].color = rgbColor(lightRgb[0], lightRgb[1], lightRgb[2]);
                gradient.gradientStops[1].color = rgbColor(darkRgb[0], darkRgb[1], darkRgb[2]);
            } else {
                gradient.gradientStops[0].color = kColor(adjustedK(0, options.brightness));
                gradient.gradientStops[1].color = kColor(adjustedK(80, options.brightness));
            }
        }

        function flatCarbonColor(options) {
            if (options.colorMode === "color") {
                var rgb = adjustedRgb([72, 86, 96], options.brightness);
                return rgbColor(rgb[0], rgb[1], rgb[2]);
            }
            return kColor(adjustedK(55, options.brightness));
        }

        function drawLitSphere(parent, cx, cy, diameter, options, gradient) {
            var radius = diameter / 2;
            var highlightX = cx - radius * 0.35;
            var highlightY = cy + radius * 0.35;
            var gradientRadius = radius * 1.7;
            var sphereGroup = parent.groupItems.add();
            var clippedGroup = sphereGroup.groupItems.add();
            var gradientColor = new GradientColor();
            gradientColor.gradient = gradient;
            gradientColor.matrix = app.getIdentityMatrix();
            gradientColor.origin = [highlightX - gradientRadius, highlightY + gradientRadius];
            gradientColor.length = gradientRadius * 2;

            var largeCircle = clippedGroup.pathItems.ellipse(
                highlightY + gradientRadius,
                highlightX - gradientRadius,
                gradientRadius * 2,
                gradientRadius * 2
            );
            largeCircle.filled = true;
            largeCircle.stroked = false;
            largeCircle.fillColor = gradientColor;

            var mask = clippedGroup.pathItems.ellipse(
                cy + radius, cx - radius, diameter, diameter
            );
            mask.filled = false;
            mask.stroked = false;
            mask.clipping = true;
            clippedGroup.clipped = true;

            if (options.outline) {
                var outline = sphereGroup.pathItems.ellipse(
                    cy + radius, cx - radius, diameter, diameter
                );
                outline.filled = false;
                outline.stroked = true;
                outline.strokeWidth = LINE_WIDTH_PT;
                outline.strokeColor = kColor(100);
            }
        }

        function drawSphere(parent, cx, cy, diameter, options, gradient) {
            if (options.lit3D) {
                drawLitSphere(parent, cx, cy, diameter, options, gradient);
                return;
            }
            var radius = diameter / 2;
            var circle = parent.pathItems.ellipse(cy + radius, cx - radius, diameter, diameter);
            circle.filled = true;
            circle.fillColor = flatCarbonColor(options);
            circle.stroked = options.outline;
            if (options.outline) {
                circle.strokeWidth = LINE_WIDTH_PT;
                circle.strokeColor = kColor(100);
            }
        }

        function geometryProjectedBounds(geometry, scale) {
            var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
            for (var i = 0; i < geometry.atoms.length; i++) {
                var point = screenPoint(geometry.atoms[i].p, scale, 0, 0);
                if (point[0] < left) left = point[0];
                if (point[0] > right) right = point[0];
                if (point[1] > top) top = point[1];
                if (point[1] < bottom) bottom = point[1];
            }
            return [left, top, right, bottom];
        }

        function drawGraphite(options, targetParent) {
            setProjectionAngles(options.angleR, options.angleL, options.depthPercent);
            var documentRef = app.activeDocument;
            var parent = targetParent ? targetParent : documentRef.activeLayer;
            var group = parent.groupItems.add();
            group.name = "GraphiteCrystal";
            var scale = options.bondMM * MM;
            var layerGapRatio = options.layerGapMM / options.bondMM;
            var geometry = buildGraphiteGeometry(
                options.columns,
                options.rows,
                options.layers,
                layerGapRatio,
                options.stacking,
                options.interlayer
            );
            var bounds = geometryProjectedBounds(geometry, scale);
            var artboard = documentRef.artboards[documentRef.artboards.getActiveArtboardIndex()].artboardRect;
            var artCenterX = (artboard[0] + artboard[2]) / 2;
            var artCenterY = (artboard[1] + artboard[3]) / 2;
            var projectedCenterX = (bounds[0] + bounds[2]) / 2;
            var projectedCenterY = (bounds[1] + bounds[3]) / 2;
            var ox = artCenterX - projectedCenterX;
            var oy = artCenterY - projectedCenterY;
            var atomDiameter = options.atomMM * MM;
            var atomRadius = atomDiameter / 2 + LINE_WIDTH_PT / 2;
            var records = [];

            for (var bondIndex = 0; bondIndex < geometry.bonds.length; bondIndex++) {
                var bond = geometry.bonds[bondIndex];
                var atomA = geometry.atoms[bond.a];
                var atomB = geometry.atoms[bond.b];
                records.push({
                    type: "bond",
                    a: atomA.p,
                    b: atomB.p,
                    interlayer: bond.interlayer,
                    depth: (viewDepth(atomA.p) + viewDepth(atomB.p)) / 2
                });
            }
            for (var atomIndex = 0; atomIndex < geometry.atoms.length; atomIndex++) {
                records.push({
                    type: "atom",
                    atom: geometry.atoms[atomIndex],
                    depth: viewDepth(geometry.atoms[atomIndex].p)
                });
            }
            records.sort(function(a, b) {
                var difference = a.depth - b.depth;
                if (Math.abs(difference) > 1e-9) return difference;
                if (a.type !== b.type) return a.type === "bond" ? -1 : 1;
                return 0;
            });

            var gradient = getGradient(documentRef);
            configureGradient(gradient, options);
            for (var recordIndex = 0; recordIndex < records.length; recordIndex++) {
                var record = records[recordIndex];
                if (record.type === "atom") {
                    var atomPoint = screenPoint(record.atom.p, scale, ox, oy);
                    drawSphere(group, atomPoint[0], atomPoint[1], atomDiameter, options, gradient);
                } else {
                    var start = screenPoint(record.a, scale, ox, oy);
                    var end = screenPoint(record.b, scale, ox, oy);
                    var dx = end[0] - start[0], dy = end[1] - start[1];
                    var screenLength = Math.sqrt(dx * dx + dy * dy);
                    if (screenLength > atomRadius * 2 + 0.01) {
                        var trim = atomRadius / screenLength;
                        start = [start[0] + dx * trim, start[1] + dy * trim];
                        end = [end[0] - dx * trim, end[1] - dy * trim];
                    }
                    var line = group.pathItems.add();
                    line.setEntirePath([start, end]);
                    line.filled = false;
                    line.stroked = true;
                    line.strokeWidth = LINE_WIDTH_PT;
                    line.strokeColor = record.interlayer ? kColor(65) : kColor(100);
                    if (record.interlayer) line.strokeDashes = [3, 2];
                }
            }
            return group;
        }

        var radAB, radAA, chkInterlayer;
        var sldColumns, sldRows, sldLayers, sldBond, sldLayerGap, sldAtom, sldBrightness;

        var api = {
            label: "흑연",
            usesViewAngles: true,
            fieldCount: 9,
            addRows: addRows,
            validate: function() { return null; },
            syncEnabled: function() {},
            draw: function(layer) { return asArray(drawGraphite(collectOptions(), layer)); },
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function addRows(page) {
            var pnlStack = page.add("panel", undefined, "적층 구조");
            pnlStack.orientation = "row";
            pnlStack.alignChildren = "left";
            radAB = pnlStack.add("radiobutton", undefined, "AB 적층 (흑연)");
            radAA = pnlStack.add("radiobutton", undefined, "AA 적층");
            radAB.value = true;
            radAB.onClick = updatePreview;
            radAA.onClick = updatePreview;
            chkInterlayer = pnlStack.add("checkbox", undefined, "층간 점선");
            chkInterlayer.value = true;
            chkInterlayer.onClick = updatePreview;

            var pnlGeometry = page.add("panel", undefined, "격자·크기 조절");
            pnlGeometry.orientation = "column";
            pnlGeometry.alignChildren = "left";
            pnlGeometry.spacing = 2;
            sldColumns = addSliderRow(pnlGeometry, "가로 육각형", 112, 1, 10, 4, "", 1);
            sldRows = addSliderRow(pnlGeometry, "세로 육각형", 112, 1, 8, 3, "", 1);
            sldLayers = addSliderRow(pnlGeometry, "적층 수", 112, 1, 8, 3, "", 1);
            sldBond = addSliderRow(pnlGeometry, "C-C 결합 길이", 112, 2, 15, 6, "mm", 0.1);
            sldLayerGap = addSliderRow(pnlGeometry, "층간 거리", 112, 3, 35, 14, "mm", 0.1);
            sldAtom = addSliderRow(pnlGeometry, "탄소 구 지름", 112, 1, 12, 4, "mm", 0.1);
            sldBrightness = addSliderRow(pnlGeometry, "탄소 밝기", 112, 40, 160, 100, "%", 1);
        }

        function collectOptions() {
            return {
                stacking: radAB.value ? "AB" : "AA",
                interlayer: chkInterlayer.value,
                lit3D: chkLit3D.value,
                outline: chkOutline.value,
                colorMode: colorModeValue(),
                columns: Math.round(sldColumns.value),
                rows: Math.round(sldRows.value),
                layers: Math.round(sldLayers.value),
                bondMM: sldBond.value,
                layerGapMM: sldLayerGap.value,
                atomMM: sldAtom.value,
                brightness: sldBrightness.value,
                angleR: sldAngleR.value,
                angleL: sldAngleL.value,
                depthPercent: sldDepth.value
            };
        }

        function saveFields() {
            return [radAB.value ? "AB" : "AA", chkInterlayer.value ? "1" : "0",
                Math.round(sldColumns.value), Math.round(sldRows.value), Math.round(sldLayers.value),
                sldBond.value, sldLayerGap.value, sldAtom.value, sldBrightness.value];
        }
        function restoreFields(f) {
            radAB.value = (f[0] !== "AA");
            radAA.value = !radAB.value;
            chkInterlayer.value = (f[1] === "1");
            restoreSlider(sldColumns, f[2]);
            restoreSlider(sldRows, f[3]);
            restoreSlider(sldLayers, f[4]);
            restoreSlider(sldBond, f[5]);
            restoreSlider(sldLayerGap, f[6]);
            restoreSlider(sldAtom, f[7]);
            restoreSlider(sldBrightness, f[8]);
        }

        return api;
    }
})();
