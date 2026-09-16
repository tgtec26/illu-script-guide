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

// 빛 번짐: 선택한 정원을 중심으로 사방으로 갈라지는 빛줄기·후광을 만든다 (별, 광원, 폭발 표현)
(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 원을 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var source = getSelectedCircle(doc.selection);
    if (source === null) {
        alert("원 패스 하나만 선택해주세요.");
        return;
    }

    var bounds = source.geometricBounds;
    var width = bounds[2] - bounds[0];
    var height = bounds[1] - bounds[3];
    if (width <= 0 || Math.abs(width - height) > Math.max(0.1, width * 0.01)) {
        alert("가로와 세로 크기가 같은 원을 선택해주세요.");
        return;
    }

    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;
    var radius = width / 2;
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var OFFSET_STEP_MM = 0.1;
    var LIMITS = {
        rayCount: [2, 64],
        rayLength: [0.5, 12],
        lengthVar: [0, 100],
        rayWidth: [1, 50],
        widthVar: [0, 100],
        rotation: [0, 360],
        halo: [0, 6],
        core: [0.1, 3],
        brightness: [5, 100]
    };

    // 스타일 프리셋: 빛줄기 수 · 길이(반지름 배) · 길이 변화(%) · 변화 방식 · 폭(%) · 폭 변화(%) · 번짐(반지름 배)
    var PRESETS = [
        {name: "반짝임 (4갈래)", rayCount: 4, rayLength: 5, lengthVar: 0, lengthMode: 1, rayWidth: 10, widthVar: 0, halo: 1.5},
        {name: "별빛 (8갈래)", rayCount: 8, rayLength: 4, lengthVar: 50, lengthMode: 1, rayWidth: 9, widthVar: 50, halo: 1.8},
        {name: "조명 (가로등)", rayCount: 16, rayLength: 2.5, lengthVar: 25, lengthMode: 0, rayWidth: 7, widthVar: 25, halo: 2.5},
        {name: "폭발 (섬광)", rayCount: 36, rayLength: 4, lengthVar: 75, lengthMode: 0, rayWidth: 5, widthVar: 60, halo: 2}
    ];
    var LENGTH_MODES = ["무작위", "번갈아"];
    // 문서 색상 모드에 맞춰 RGB/CMYK 중 하나를 쓴다. neutral(무채색)은 중심도 같은 색, 나머지는 중심이 흰색
    var COLORS = [
        {name: "흰색", rgb: [255, 255, 255], cmyk: [0, 0, 0, 0], neutral: true},
        {name: "노랑", rgb: [255, 230, 80], cmyk: [0, 8, 80, 0]},
        {name: "주황", rgb: [255, 160, 40], cmyk: [0, 45, 90, 0]},
        {name: "하늘", rgb: [120, 200, 255], cmyk: [50, 10, 0, 0]},
        {name: "파랑", rgb: [60, 110, 255], cmyk: [75, 55, 0, 0]},
        {name: "빨강", rgb: [255, 70, 60], cmyk: [0, 85, 75, 0]},
        {name: "연두", rgb: [150, 230, 90], cmyk: [40, 0, 75, 0]},
        {name: "회색", rgb: [128, 128, 128], cmyk: [0, 0, 0, 50], neutral: true},
        {name: "검정", rgb: [0, 0, 0], cmyk: [0, 0, 0, 100], neutral: true}
    ];

    var styleIndex = 1;
    var colorIndex = 0;
    var haloColorIndex = 0;
    var rayCount = PRESETS[styleIndex].rayCount;
    var rayLength = PRESETS[styleIndex].rayLength;
    var lengthVar = PRESETS[styleIndex].lengthVar;
    var lengthMode = PRESETS[styleIndex].lengthMode;
    var rayWidth = PRESETS[styleIndex].rayWidth;
    var widthVar = PRESETS[styleIndex].widthVar;
    var rotation = 0;
    var haloRatio = PRESETS[styleIndex].halo;
    var brightness = 100;
    var coreVisible = true;
    var coreRatio = 1;
    var seed = 12345;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;
    var gradients = {};
    var tintedKey = "";

    var PREF_KEY = "LightBurst/settings";
    applySavedSettings();

    var dlg = new Window("dialog", "빛 번짐");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var stylePanel = dlg.add("panel", undefined, "스타일");
    stylePanel.orientation = "column";
    stylePanel.alignChildren = "left";
    var styleRow = stylePanel.add("group");
    styleRow.alignChildren = ["left", "center"];
    styleRow.add("statictext", undefined, "광원 종류:").preferredSize.width = 90;
    var styleList = styleRow.add("dropdownlist", undefined, presetNames());
    styleList.preferredSize.width = 196;
    styleList.selection = styleIndex;
    styleList.helpTip = "고르면 아래 빛줄기·번짐 값을 프리셋으로 채운다. 이후 값은 자유롭게 고칠 수 있다";
    var colorRow = stylePanel.add("group");
    colorRow.alignChildren = ["left", "center"];
    colorRow.add("statictext", undefined, "빛줄기 색:").preferredSize.width = 90;
    var colorList = colorRow.add("dropdownlist", undefined, colorNames());
    colorList.preferredSize.width = 196;
    colorList.selection = colorIndex;
    colorList.helpTip = "중심과 빛줄기 색. 유채색은 중심이 흰색으로 타오르고, 흰색·회색·검정은 중심도 같은 색";
    var brightnessRow = addNumberRow(stylePanel, "밝기 (%):", "전체 불투명도. 검정 + 밝기 50 = 흰 종이 위 50% 회색", brightness, LIMITS.brightness, 1, 0);

    var corePanel = dlg.add("panel", undefined, "중심");
    corePanel.orientation = "column";
    corePanel.alignChildren = "left";
    var coreCheck = corePanel.add("checkbox", undefined, "중심 원 표시");
    coreCheck.value = coreVisible;
    coreCheck.helpTip = "끄면 빛줄기와 번짐만 남는다";
    var coreRow = addNumberRow(corePanel, "중심 크기 (배):", "선택한 원 반지름 대비. 1 = 원 크기 그대로. 빛줄기·번짐 기준은 그대로 선택한 원", coreRatio, LIMITS.core, 0.1, 1);

    var rayPanel = dlg.add("panel", undefined, "빛줄기");
    rayPanel.orientation = "column";
    rayPanel.alignChildren = "left";
    var countRow = addNumberRow(rayPanel, "갈라짐 수 (개):", "빛줄기 개수 2 ~ 64", rayCount, LIMITS.rayCount, 1, 0);
    var lengthRow = addNumberRow(rayPanel, "길이 (배):", "원 반지름의 몇 배까지 뻗는지", rayLength, LIMITS.rayLength, 0.1, 1);
    var varRow = addNumberRow(rayPanel, "길이 변화 (%):", "0 = 모두 같은 길이, 100 = 가장 짧은 줄기가 최대 길이의 15%", lengthVar, LIMITS.lengthVar, 1, 0);
    var modeRow = rayPanel.add("group");
    modeRow.alignChildren = ["left", "center"];
    modeRow.add("statictext", undefined, "변화 방식:").preferredSize.width = 90;
    var modeList = modeRow.add("dropdownlist", undefined, LENGTH_MODES);
    modeList.preferredSize.width = 120;
    modeList.selection = lengthMode;
    modeList.helpTip = "무작위: 줄기마다 다른 길이, 번갈아: 긴 줄기와 짧은 줄기가 교대";
    var shuffleButton = modeRow.add("button", undefined, "다시 섞기");
    shuffleButton.helpTip = "무작위 길이를 새로 뽑는다";
    var widthRow = addNumberRow(rayPanel, "폭 (%):", "중심에서의 줄기 밑변 폭, 원 반지름 대비", rayWidth, LIMITS.rayWidth, 1, 0);
    var widthVarRow = addNumberRow(rayPanel, "폭 변화 (%):", "길이 변화와 같은 순서로 줄어든다: 긴 줄기는 굵고 짧은 줄기는 가늘게. 0 = 모두 같은 폭", widthVar, LIMITS.widthVar, 1, 0);
    var rotationRow = addNumberRow(rayPanel, "회전 (°):", "첫 줄기는 12시 방향, 시계 반대로 회전", rotation, LIMITS.rotation, 1, 0);

    var haloPanel = dlg.add("panel", undefined, "번짐");
    haloPanel.orientation = "column";
    haloPanel.alignChildren = "left";
    var haloRow = addNumberRow(haloPanel, "번짐 크기 (배):", "중심 뒤 후광의 반지름, 원 반지름 대비. 0 = 없음", haloRatio, LIMITS.halo, 0.1, 1);
    var haloColorRow = haloPanel.add("group");
    haloColorRow.alignChildren = ["left", "center"];
    haloColorRow.add("statictext", undefined, "번짐 색:").preferredSize.width = 90;
    var haloColorList = haloColorRow.add("dropdownlist", undefined, colorNames());
    haloColorList.preferredSize.width = 196;
    haloColorList.selection = haloColorIndex;
    haloColorList.helpTip = "후광 색. 빛줄기 색과 다르게 둘 수 있다 (예: 번짐 회색 + 빛줄기 흰색)";

    var positionPanel = dlg.add("panel", undefined, "위치");
    positionPanel.orientation = "column";
    positionPanel.alignChildren = "left";
    var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmm);
    var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmm);

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = buttons.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

    styleList.onChange = function() {
        if (!styleList.selection) return;
        styleIndex = styleList.selection.index;
        var preset = PRESETS[styleIndex];
        rayCount = preset.rayCount;
        rayLength = preset.rayLength;
        lengthVar = preset.lengthVar;
        lengthMode = preset.lengthMode;
        rayWidth = preset.rayWidth;
        widthVar = preset.widthVar;
        haloRatio = preset.halo;
        setRow(countRow, rayCount);
        setRow(lengthRow, rayLength);
        setRow(varRow, lengthVar);
        setRow(widthRow, rayWidth);
        setRow(widthVarRow, widthVar);
        setRow(haloRow, haloRatio);
        modeList.selection = lengthMode;
        updatePreview();
    };
    colorList.onChange = function() {
        if (!colorList.selection) return;
        colorIndex = colorList.selection.index;
        updatePreview();
    };
    haloColorList.onChange = function() {
        if (!haloColorList.selection) return;
        haloColorIndex = haloColorList.selection.index;
        updatePreview();
    };
    modeList.onChange = function() {
        if (!modeList.selection) return;
        lengthMode = modeList.selection.index;
        updatePreview();
    };
    coreCheck.onClick = function() {
        coreVisible = coreCheck.value;
        updatePreview();
    };
    shuffleButton.onClick = function() {
        seed = nextRandom(seed);
        updatePreview();
    };

    bindNumberRow(countRow, function(value) { rayCount = value; });
    bindNumberRow(lengthRow, function(value) { rayLength = value; });
    bindNumberRow(varRow, function(value) { lengthVar = value; });
    bindNumberRow(widthRow, function(value) { rayWidth = value; });
    bindNumberRow(widthVarRow, function(value) { widthVar = value; });
    bindNumberRow(rotationRow, function(value) { rotation = value; });
    bindNumberRow(haloRow, function(value) { haloRatio = value; });
    bindNumberRow(brightnessRow, function(value) { brightness = value; });
    bindNumberRow(coreRow, function(value) { coreRatio = value; });

    // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindOffsetControls(offsetXControls, true);
    bindOffsetControls(offsetYControls, false);

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        var rows = [countRow, lengthRow, varRow, widthRow, widthVarRow, rotationRow, haloRow, brightnessRow, coreRow];
        for (var i = 0; i < rows.length; i++) {
            var value = parseNumber(rows[i].input.text);
            if (value === null || value < rows[i].min || value > rows[i].max) {
                alert(rows[i].label + " 값은 " + rows[i].min + "부터 " + rows[i].max + " 사이로 입력해주세요.");
                return;
            }
            rows[i].setter(snap(value, rows[i].step));
        }
        saveSettings();
        dlg.close(1);
    };
    cancelButton.onClick = function() { dlg.close(0); };

    source.hidden = true;
    source.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        source.hidden = false;
        var finalGroup = createBurst();
        moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        finalGroup.name = "LightBurst";
        try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
        source.remove();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        removeGradients();
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    function saveSettings() {
        var parts = ["v5", styleIndex, colorIndex, rayCount, rayLength, lengthVar, lengthMode,
            rayWidth, rotation, haloRatio, seed, offsetXmm, offsetYmm, brightness, haloColorIndex, widthVar,
            coreVisible ? 1 : 0, coreRatio];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v5" || p.length !== 18) return;
        var style = parseInt(p[1], 10);
        var color = parseInt(p[2], 10);
        var count = parseInt(p[3], 10);
        var length = parseFloat(p[4]);
        var variation = parseFloat(p[5]);
        var mode = parseInt(p[6], 10);
        var rayW = parseFloat(p[7]);
        var rot = parseFloat(p[8]);
        var halo = parseFloat(p[9]);
        var savedSeed = parseInt(p[10], 10);
        var offX = parseFloat(p[11]);
        var offY = parseFloat(p[12]);
        var bright = parseFloat(p[13]);
        var haloColor = parseInt(p[14], 10);
        var widthV = parseFloat(p[15]);
        var coreOn = parseInt(p[16], 10);
        var coreR = parseFloat(p[17]);
        if (style >= 0 && style < PRESETS.length) styleIndex = style;
        if (color >= 0 && color < COLORS.length) colorIndex = color;
        if (haloColor >= 0 && haloColor < COLORS.length) haloColorIndex = haloColor;
        if (inRange(count, LIMITS.rayCount)) rayCount = count;
        if (inRange(length, LIMITS.rayLength)) rayLength = length;
        if (inRange(variation, LIMITS.lengthVar)) lengthVar = variation;
        if (mode === 0 || mode === 1) lengthMode = mode;
        if (inRange(rayW, LIMITS.rayWidth)) rayWidth = rayW;
        if (inRange(widthV, LIMITS.widthVar)) widthVar = widthV;
        if (inRange(rot, LIMITS.rotation)) rotation = rot;
        if (inRange(halo, LIMITS.halo)) haloRatio = halo;
        if (savedSeed > 0 && savedSeed < 2147483647) seed = savedSeed;
        if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
        if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
        if (inRange(bright, LIMITS.brightness)) brightness = bright;
        if (coreOn === 0 || coreOn === 1) coreVisible = coreOn === 1;
        if (inRange(coreR, LIMITS.core)) coreRatio = coreR;
    }

    function inRange(value, limit) {
        return !isNaN(value) && value >= limit[0] && value <= limit[1];
    }

    function presetNames() {
        var names = [];
        for (var i = 0; i < PRESETS.length; i++) names.push(PRESETS[i].name);
        return names;
    }

    function colorNames() {
        var names = [];
        for (var i = 0; i < COLORS.length; i++) names.push(COLORS[i].name);
        return names;
    }

    // 숫자 행: 라벨 (단위): | 입력창 | 스크롤바(‹ › 내장)
    function addNumberRow(parent, label, help, value, limit, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = 90;
        caption.helpTip = help;
        var input = row.add("edittext", undefined, formatValue(value, decimals));
        input.characters = 6;
        input.helpTip = help;
        var slider = row.add("scrollbar", undefined, value, limit[0], limit[1]);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = 196;
        return {label: label.replace(/\s*\(.*$/, ""), input: input, slider: slider,
            min: limit[0], max: limit[1], step: step, decimals: decimals, setter: null};
    }

    function bindNumberRow(row, setter) {
        row.setter = setter;
        function commit(value, fromSlider) {
            value = snap(clamp(value, row.min, row.max), row.step);
            setter(value);
            row.input.text = formatValue(value, row.decimals);
            if (!fromSlider) { try { row.slider.value = value; } catch (e) {} }
            updatePreview();
        }
        row.slider.onChanging = function() { commit(row.slider.value, true); };
        row.slider.onChange = function() { commit(row.slider.value, true); };
        row.input.onChanging = function() {
            var value = parseNumber(row.input.text);
            if (value === null || value < row.min || value > row.max) return;
            setter(snap(value, row.step));
            try { row.slider.value = value; } catch (e) {}
            updatePreview();
        };
        row.input.onChange = function() {
            var value = parseNumber(row.input.text);
            if (value === null) value = row.slider.value;
            commit(value, false);
        };
    }

    function setRow(row, value) {
        row.input.text = formatValue(value, row.decimals);
        try { row.slider.value = value; } catch (e) {}
    }

    function snap(value, step) {
        return Math.round(value / step) * step;
    }

    function formatValue(value, decimals) {
        var factor = Math.pow(10, decimals);
        return String(Math.round(value * factor) / factor);
    }

    // 위치 행: 라벨 · 입력칸 · 슬라이더
    function addOffsetControls(parent, label, value) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (mm):").preferredSize.width = 90;
        var input = row.add("edittext", undefined, formatValue(value, 1));
        input.characters = 6;
        var slider = row.add("scrollbar", undefined, value, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        slider.stepdelta = OFFSET_STEP_MM;
        slider.jumpdelta = OFFSET_STEP_MM * 10;
        slider.preferredSize.width = 196;
        return {input: input, slider: slider};
    }

    // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindOffsetControls(controls, isX) {
        function commit(value) {
            if (value === null || !isFinite(value)) return;
            value = snap(clamp(value, -POSITION_LIMIT_MM, POSITION_LIMIT_MM), OFFSET_STEP_MM);
            var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
            if (isX) offsetXmm = value;
            else offsetYmm = value;
            controls.input.text = formatValue(value, 1);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0 || previewGroup === null) return;
            moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        function current() { return isX ? offsetXmm : offsetYmm; }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? current() : value);
        };
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createBurst();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        previewGroup.name = "LightBurst Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // 아래부터 후광 → 빛줄기 → 중심(켠 경우) 순서로 쌓는다 (add()는 그룹 맨 앞에 넣으므로 나중 것이 위)
    function createBurst() {
        tintGradients();
        var group = source.layer.groupItems.add();
        if (haloRatio > 0) {
            var haloRadius = radius * haloRatio;
            var halo = group.pathItems.ellipse(centerY + haloRadius, centerX - haloRadius, haloRadius * 2, haloRadius * 2);
            halo.name = "Halo";
            fillRadial(halo, gradients.halo, haloRadius);
        }
        // 폭도 같은 seed로 뽑아 길이와 같은 비율로 줄어든다 (긴 줄기 = 굵은 줄기)
        var lengths = rayLengths(rayCount, rayLength * radius, lengthVar, lengthMode, seed);
        var halfWidths = rayLengths(rayCount, radius * rayWidth / 100, widthVar, lengthMode, seed);
        for (var i = 0; i < rayCount; i++) {
            var angle = 90 + rotation + 360 * i / rayCount;
            var ray = group.pathItems.add();
            ray.name = "Ray";
            writePath(ray, rayOutline(centerX, centerY, angle, lengths[i], halfWidths[i]));
            fillRadial(ray, gradients.ray, lengths[i]);
        }
        if (coreVisible) {
            var coreRadius = radius * coreRatio;
            var core = group.pathItems.ellipse(centerY + coreRadius, centerX - coreRadius, coreRadius * 2, coreRadius * 2);
            core.name = "Core";
            fillRadial(core, gradients.core, coreRadius);
        }
        // 밝기는 그룹 불투명도 하나로 건다. 겹치는 줄기·후광이 따로 진해지지 않는다
        try { group.opacity = brightness; } catch (e) {}
        return group;
    }

    // 방사형 그라데이션은 각도가 없어 스크립트가 각도를 못 정하는 문제(프로젝트 공통)를 피한다.
    // 중심을 원 중심에 두고 길이만 주면 줄기마다 끝에서 정확히 투명해진다
    function fillRadial(path, gradient, length) {
        var gradientColor = new GradientColor();
        gradientColor.gradient = gradient;
        gradientColor.origin = [centerX, centerY];
        gradientColor.length = length;
        path.stroked = false;
        path.filled = true;
        path.fillColor = gradientColor;
    }

    // 그라데이션 셋(중심·줄기·후광)은 실행당 한 번 만들고 색이 바뀔 때만 스톱 색을 다시 쓴다
    function tintGradients() {
        var key = colorIndex + "|" + haloColorIndex;
        if (tintedKey === key) return;
        tintedKey = key;
        var color = makeColor(COLORS[colorIndex]);
        var haloColor = makeColor(COLORS[haloColorIndex]);
        var center = COLORS[colorIndex].neutral ? color : makeColor(COLORS[0]);
        setStops(getGradient("core"), [
            {pos: 0, color: center, opacity: 100},
            {pos: 45, color: color, opacity: 100, mid: 50},
            {pos: 100, color: color, opacity: 0, mid: 40}
        ]);
        setStops(getGradient("ray"), [
            {pos: 0, color: color, opacity: 100, mid: 35},
            {pos: 100, color: color, opacity: 0}
        ]);
        setStops(getGradient("halo"), [
            {pos: 0, color: haloColor, opacity: 70, mid: 40},
            {pos: 100, color: haloColor, opacity: 0}
        ]);
    }

    function getGradient(key) {
        if (gradients[key]) return gradients[key];
        var gradient = doc.gradients.add();
        // 그라데이션 이름은 31자 제한. 넘으면 "the name was not found"로 죽는다
        gradient.name = "LB_" + key + "_" + (new Date().getTime());
        gradient.type = GradientType.RADIAL;
        gradients[key] = gradient;
        return gradient;
    }

    function setStops(gradient, stops) {
        while (gradient.gradientStops.length < stops.length) gradient.gradientStops.add();
        for (var i = 0; i < stops.length; i++) {
            var stop = gradient.gradientStops[i];
            stop.rampPoint = stops[i].pos;
            stop.color = stops[i].color;
            stop.opacity = stops[i].opacity;
            if (stops[i].mid !== undefined) stop.midPoint = stops[i].mid;
        }
    }

    function removeGradients() {
        for (var key in gradients) {
            if (!gradients.hasOwnProperty(key)) continue;
            try { gradients[key].remove(); } catch (e) {}
        }
        gradients = {};
    }

    function makeColor(entry) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = entry.cmyk[0];
            cmyk.magenta = entry.cmyk[1];
            cmyk.yellow = entry.cmyk[2];
            cmyk.black = entry.cmyk[3];
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = entry.rgb[0];
        rgb.green = entry.rgb[1];
        rgb.blue = entry.rgb[2];
        return rgb;
    }

    function writePath(path, points) {
        var anchors = [];
        var i;
        for (i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        path.closed = true;
        for (i = 0; i < points.length; i++) {
            path.pathPoints[i].leftDirection = points[i].left;
            path.pathPoints[i].rightDirection = points[i].right;
            path.pathPoints[i].pointType = PointType.CORNER;
        }
    }

    // 줄기 길이(폭도 같은 식): 변화 0 = 모두 base. 무작위는 줄기마다 seed로 뽑고, 번갈아는 홀수 번째만 줄인다.
    // 가장 짧아도 base의 15%는 남긴다
    function rayLengths(count, base, variation, mode, seed) {
        var lengths = [];
        var amount = variation / 100;
        var state = seed;
        for (var i = 0; i < count; i++) {
            var factor;
            if (mode === 1) {
                factor = i % 2;
            } else {
                state = nextRandom(state);
                factor = state / 2147483647;
            }
            lengths.push(base * Math.max(0.15, 1 - amount * factor));
        }
        return lengths;
    }

    // Park-Miller 선형 합동 난수. 1 ~ 2147483646 사이 정수를 돌려준다
    function nextRandom(state) {
        var hi = Math.floor(state / 127773);
        var lo = state % 127773;
        var next = 16807 * lo - 2836 * hi;
        if (next <= 0) next += 2147483647;
        return next;
    }

    // 바늘 모양 줄기: 밑변 양끝(중심 좌우 halfWidth) → 끝점. 옆선은 안쪽으로 오목하게 휘어 끝이 날카롭다.
    // 축 방향 angle(°, 시계 반대, 0 = 오른쪽). 점은 앵커·왼쪽 핸들·오른쪽 핸들
    function rayOutline(cx, cy, angleDeg, length, halfWidth) {
        var rad = angleDeg * Math.PI / 180;
        var ux = Math.cos(rad), uy = Math.sin(rad);   // 축 방향
        var vx = -uy, vy = ux;                        // 축의 왼쪽
        function at(along, side) {
            return [cx + ux * along + vx * side, cy + uy * along + vy * side];
        }
        var left = at(0, halfWidth);
        var tip = at(length, 0);
        var right = at(0, -halfWidth);
        // 옆선은 이차 곡선(제어점: 축 쪽으로 85%, 길이 30% 지점)을 삼차 핸들로 바꾼다
        var controlLeft = at(length * 0.3, halfWidth * 0.15);
        var controlRight = at(length * 0.3, -halfWidth * 0.15);
        return [
            {anchor: left, left: left, right: lerp(left, controlLeft, 2 / 3)},
            {anchor: tip, left: lerp(tip, controlLeft, 2 / 3), right: lerp(tip, controlRight, 2 / 3)},
            {anchor: right, left: lerp(right, controlRight, 2 / 3), right: right}
        ];
    }

    function lerp(a, b, t) {
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function getSelectedCircle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping || !item.closed) return null;
        return item;
    }
})();
