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

// 3D → 2D 라인: 입체 도형·돌출·회전체를 한 창의 탭으로 묶었다. 시점·선과 면·위치는 세 탭이 같이 쓴다.
// 라이노에서 3D를 만들고 2D로 뽑던 작업을 일러스트레이터 안에서 끝내기 위한 스크립트.
//   입체 도형: 선택 없이(또는 기준 개체 하나) 실행. 모든 도형이 볼록이라 "면이 앞을 보는가"만으로 숨은선을 가른다.
//   돌출: 패스 하나 이상 선택. 닫힌 패스는 뚜껑 있는 기둥, 열린 패스는 띠. 겹친 깊이가 홀수인 곳이 구멍이다.
//   회전체: 단면 패스 + 축(앵커 2개 직선) 선택. 사각형에 접한 선 → 원기둥, 원과 떨어진 선 → 도넛.
//   돌출·회전체는 볼록이 아닐 수 있어 숨은선을 눈 쪽으로 쏜 광선이 막히는지로 가른다.
// 선택에 맞지 않는 탭은 흐리게 두고, 마지막에 쓴 탭이 선택에 맞으면 그 탭을 연다.
(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;

    var MM_TO_PT = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var HIDDEN_DASH = [2, 1];
    var LABEL_WIDTH = 96;
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var CUSTOM_PRESET_COUNT = 4;
    var ANGLE_STEP = 0.1;
    var OFFSET_STEP_MM = 0.1;
    var POSITION_LIMIT_MM = 100;
    var ROW_SPACING = 4;            // 세로로 쌓인 행 사이 간격 (기본값보다 좁게)
    var PANEL_MARGINS = [10, 10, 10, 4]; // 패널 안쪽 여백 [왼, 위, 오른, 아래]. 위는 제목 자리
    var WINDOW_MARGINS = [12, 10, 12, 8];
    var LIVE_INTERVAL_MS = 60;      // 슬라이더를 끄는 동안 미리보기를 다시 그리는 최소 간격
    var FACING_EPSILON = 1e-9;      // 이보다 작은 면 방향값은 옆에서 본 것(앞뒤 없음)으로 본다
    var MAX_ARC_SPAN = Math.PI / 4; // 베지어 한 구간이 감당할 최대 각도

    var HIDDEN_NONE = 0;
    var HIDDEN_DASHED = 1;
    var HIDDEN_SOLID = 2;

    var FILL_NONE = 0;
    var FILL_FLAT = 1;
    var FILL_LIT = 2;

    // 세 탭이 같이 쓰는 옵션
    var tabIndex = 0;
    var rotY = 45;      // 가로 회전 (턴테이블). 회전체는 쓰지 않는다
    var rotX = 35.3;    // 위아래 기울기
    var rotZ = 0;       // 화면 회전
    var perspectiveOn = false;
    var perspectiveMm = 300;
    var hiddenMode = HIDDEN_DASHED;
    var fillMode = FILL_LIT;
    var brightness = 70;       // 100 - K 중간값
    var contrast = 40;         // 가장 밝은 면과 가장 어두운 면의 K 차이
    var lightAzimuth = -35;    // 광원 방위 (°). 음수 = 왼쪽
    var lightElevation = 50;   // 광원 높이 (°). 90 = 바로 위
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previewGroup = null;
    var lastLiveRender = 0;     // 슬라이더를 끄는 동안 마지막으로 미리보기를 그린 시각
    // 커스텀 시점 프리셋 4개: {y, x, z, perspective, distance}. 설정과 별도 키에 저장해 설정 버전이 바뀌어도 남는다
    var PRESET_KEY = "Object3DLine/presets";
    var LEGACY_PRESET_KEY = "ObjectSolid3D/presets";  // 탭으로 묶기 전 입체 도형이 저장한 프리셋. 새 키가 비었을 때만 읽는다
    var customPresets = [];
    var presetSaveMode = false;
    var originX = 0;
    var originY = 0;
    var viewMatrix = null;
    var eyeZ = 0;
    var strokeColor = makeStrokeColor();
    var documentIsCmyk = false;
    try { documentIsCmyk = doc.documentColorSpace === DocumentColorSpace.CMYK; } catch (colorSpaceError) {}
    var kColorCache = {};       // K값별 채움색. 면마다 새로 만들지 않는다

    // ---- 선택 읽기 ------------------------------------------------------------
    // 엔진마다 선택을 따로 해석한다. 맞지 않으면 error에 안내문이 남고 그 탭은 꺼진다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    var engines = [makeSolidEngine(), makeExtrudeEngine(), makeRevolveEngine()];
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        engines[engineIndex].error = engines[engineIndex].prepare(selectedItems);
    }

    var PREF_KEY = "Object3DLine/settings";
    applySavedSettings();
    // 저장된 탭이 선택에 맞지 않으면 선택을 가장 구체적으로 쓰는 탭(회전체 > 돌출 > 입체 도형)으로 연다
    if (engines[tabIndex].error) {
        for (engineIndex = engines.length - 1; engineIndex >= 0; engineIndex--) {
            if (!engines[engineIndex].error) { tabIndex = engineIndex; break; }
        }
    }
    var engine = engines[tabIndex];
    originX = engine.originX;
    originY = engine.originY;

    var win = new Window("dialog", "3D → 2D 라인");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.margins = WINDOW_MARGINS;

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = "fill";
    for (engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = tabs.add("tab", undefined, engines[engineIndex].label);
        page.orientation = "column";
        page.alignChildren = "fill";
        page.helpTip = engines[engineIndex].hint;
        // 엔진 행이 없는 탭(회전체)만 안내문을 글줄로 둔다. 있으면 첫 패널 제목이 안내문이다
        if (!engines[engineIndex].addRows(page)) page.add("statictext", undefined, engines[engineIndex].hint);
        if (engines[engineIndex].error) {
            page.enabled = false;
            page.helpTip = engines[engineIndex].error;
        }
    }
    tabs.selection = tabIndex;

    var viewPanel = win.add("panel", undefined, "시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var rotYControl = addNumberRow(viewPanel, "가로 회전 (°)", rotY, -180, 180, ANGLE_STEP, 1,
        "물체를 세로축 둘레로 돌린다. +면 앞면이 오른쪽으로 돌아간다 (회전체는 축 둘레 회전이 뜻이 없어 쓰지 않는다)", function(value, live) {
            rotY = value;
            updatePreview(live);
        }, true);
    var rotXControl = addNumberRow(viewPanel, "위아래 기울기 (°)", rotX, -180, 180, ANGLE_STEP, 1,
        "앞뒤로 눕힌다. +면 위에서 내려다본다", function(value, live) {
            rotX = value;
            updatePreview(live);
        }, true);
    var rotZControl = addNumberRow(viewPanel, "화면 회전 (°)", rotZ, -180, 180, ANGLE_STEP, 1,
        "화면을 보는 채로 그림을 돌린다", function(value, live) {
            rotZ = value;
            updatePreview(live);
        }, true);

    var presetRow = viewPanel.add("group");
    presetRow.alignChildren = ["left", "center"];
    presetRow.add("statictext", undefined, "시점 프리셋:").preferredSize.width = LABEL_WIDTH;
    var frontButton = presetRow.add("button", undefined, "정면");
    var isoButton = presetRow.add("button", undefined, "등각");
    var sideButton = presetRow.add("button", undefined, "측면");
    var topButton = presetRow.add("button", undefined, "윗면");

    var customRow = viewPanel.add("group");
    customRow.alignChildren = ["left", "center"];
    var customCaption = customRow.add("statictext", undefined, "커스텀:");
    customCaption.preferredSize.width = LABEL_WIDTH;
    customCaption.helpTip = "저장을 누른 뒤 번호를 누르면 지금 시점(회전·기울기·화면 회전·원근)이 그 번호에 저장된다";
    var customButtons = [];
    for (var presetIndex = 0; presetIndex < CUSTOM_PRESET_COUNT; presetIndex++) {
        var customButton = customRow.add("button", undefined, String(presetIndex + 1));
        customButton.preferredSize.width = RESET_BUTTON_WIDTH + 6;
        customButtons.push(customButton);
    }
    var presetSaveButton = customRow.add("button", undefined, "저장");
    presetSaveButton.helpTip = "누른 뒤 1~4 번호를 누르면 지금 시점이 저장된다. 다시 누르면 취소";

    var perspectiveCheck = viewPanel.add("checkbox", undefined, "원근 적용 (끄면 평행 투영 = 등각 도면)");
    perspectiveCheck.value = perspectiveOn;
    var perspectiveControl = addNumberRow(viewPanel, "시점 거리 (mm)", perspectiveMm, 50, 2000, 10, 0,
        "가까울수록 원근이 강해진다", function(value, live) {
            perspectiveMm = value;
            updatePreview(live);
        });

    var linePanel = win.add("panel", undefined, "선과 면");
    linePanel.orientation = "column";
    linePanel.alignChildren = "fill";
    var hiddenRow = linePanel.add("group");
    hiddenRow.alignChildren = ["left", "center"];
    hiddenRow.add("statictext", undefined, "숨은선:").preferredSize.width = LABEL_WIDTH;
    var hiddenList = hiddenRow.add("dropdownlist", undefined, ["표시 안 함", "파선", "실선"]);
    hiddenList.selection = hiddenMode;
    hiddenList.preferredSize.width = SLIDER_WIDTH + 60;

    var fillRow = linePanel.add("group");
    fillRow.alignChildren = ["left", "center"];
    var fillCaption = fillRow.add("statictext", undefined, "면 채우기:");
    fillCaption.preferredSize.width = LABEL_WIDTH;
    fillCaption.helpTip = "광원 자동: 화면 기준 광원으로 면마다 K값을 정한다 (정육면체 등각: 윗면 > 앞면 > 옆면). 곡면은 펴진 조각 수만큼 단계가 진다";
    var fillList = fillRow.add("dropdownlist", undefined, ["없음", "단일 음영", "광원 자동"]);
    fillList.selection = fillMode;
    fillList.preferredSize.width = SLIDER_WIDTH + 60;
    var brightnessControl = addNumberRow(linePanel, "밝기 (%)", brightness, 0, 100, 1, 0,
        "면 K값의 중간. 100이면 K0(흰색), 0이면 K100", function(value, live) {
            brightness = value;
            updateLighting(live);
        });
    var contrastControl = addNumberRow(linePanel, "대비 (%)", contrast, 0, 100, 1, 0,
        "밝은 면과 어두운 면의 K 차이", function(value, live) {
            contrast = value;
            updateLighting(live);
        });
    var lightAzimuthControl = addNumberRow(linePanel, "광원 방위 (°)", lightAzimuth, -90, 90, 1, 0,
        "화면 기준 광원 좌우 위치. 음수 = 왼쪽, 0 = 정면", function(value, live) {
            lightAzimuth = value;
            updateLighting(live);
        });
    var lightElevationControl = addNumberRow(linePanel, "광원 높이 (°)", lightElevation, 0, 90, 1, 0,
        "화면 기준 광원 높이. 90 = 바로 위", function(value, live) {
            lightElevation = value;
            updateLighting(live);
        });

    var positionPanel = win.add("panel", undefined, "위치");
    positionPanel.orientation = "column";
    positionPanel.alignChildren = "fill";
    var offsetXControl = addNumberRow(positionPanel, "가로 이동 (mm)", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, OFFSET_STEP_MM, 1, "", function(value) {
            moveOffset(value, true);
        });
    var offsetYControl = addNumberRow(positionPanel, "세로 이동 (mm)", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, OFFSET_STEP_MM, 1, "", function(value) {
            moveOffset(value, false);
        });

    var buttonRow = win.add("group");
    buttonRow.alignment = "right";
    var previewCheck = buttonRow.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = buttonRow.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = buttonRow.add("button", undefined, "취소", {name: "cancel"});

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        if (engines[next].error) {
            // 꺼진 탭은 눌리지 않지만, 혹시 눌리면 되돌리고 이유를 알린다
            tabs.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        tabIndex = next;
        engine = engines[tabIndex];
        originX = engine.originX;
        originY = engine.originY;
        syncEngineRows();
        updatePreview();
    };
    perspectiveCheck.onClick = function() {
        perspectiveOn = perspectiveCheck.value;
        perspectiveControl.row.enabled = perspectiveOn;
        updatePreview();
    };
    hiddenList.onChange = function() {
        hiddenMode = hiddenList.selection ? hiddenList.selection.index : HIDDEN_NONE;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    fillList.onChange = function() {
        fillMode = fillList.selection ? fillList.selection.index : FILL_NONE;
        syncFillRows();
        updatePreview();
    };

    frontButton.onClick = function() { setView(0, 0, 0); };
    isoButton.onClick = function() { setView(45, 35.3, 0); };
    sideButton.onClick = function() { setView(90, 0, 0); };
    topButton.onClick = function() { setView(0, 90, 0); };
    rotYControl.reset.onClick = function() { rotYControl.set(0); };
    rotXControl.reset.onClick = function() { rotXControl.set(0); };
    rotZControl.reset.onClick = function() { rotZControl.set(0); };
    presetSaveButton.onClick = function() { setPresetSaveMode(!presetSaveMode); };
    for (presetIndex = 0; presetIndex < CUSTOM_PRESET_COUNT; presetIndex++) {
        customButtons[presetIndex].onClick = makeCustomPresetHandler(presetIndex);
    }
    loadCustomPresets();
    refreshCustomButtons();

    okButton.onClick = function() {
        saveSettings();
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    syncEngineRows();
    perspectiveControl.row.enabled = perspectiveOn;
    updatePreview();

    tightenRows(win);
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = engine.create(false, true);
        if (finalGroup !== null) {
            translateItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            engine.finish(finalGroup);
            try {
                doc.selection = null;
                finalGroup.selected = true;
            } catch (selectError) {}
        }
    }
    app.redraw();

    // ---- 다이얼로그 도우미 ------------------------------------------------

    // 숫자 조절 행: 라벨 (단위): | 입력창 | 스크롤바
    function addNumberRow(parent, labelText, value, minimum, maximum, step, decimals, tip, onCommit, hasReset) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var caption = row.add("statictext", undefined, labelText + ":");
        caption.preferredSize.width = LABEL_WIDTH;
        if (tip) caption.helpTip = tip;
        var input = row.add("edittext", undefined, formatValue(value, decimals));
        input.characters = 6;
        if (tip) input.helpTip = tip;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        // 슬라이더 오른쪽의 0 버튼. 값을 0으로 되돌린다
        var reset = null;
        if (hasReset) {
            reset = row.add("button", undefined, "0");
            reset.preferredSize.width = RESET_BUTTON_WIDTH;
            reset.helpTip = "0으로 초기화";
        }

        var control = {row: row, caption: caption, input: input, slider: slider, reset: reset, value: value};

        // live: 슬라이더를 끄는 중. 손을 떼면(onChange) live 없이 한 번 더 온다
        function commit(raw, silent, live) {
            var parsed = parseNumber(raw);
            if (parsed === null) parsed = control.value;
            parsed = clamp(roundTo(parsed, step), minimum, maximum);
            control.value = parsed;
            input.text = formatValue(parsed, decimals);
            try { slider.value = parsed; } catch (sliderError) {}
            if (!silent) onCommit(parsed, !!live);
        }

        slider.onChanging = function() { commit(slider.value, false, true); };
        slider.onChange = function() { commit(slider.value); };
        // 타이핑 중에는 입력창 글자를 건드리지 않는다. 범위 안 값일 때만 즉시 반영한다
        input.onChanging = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null || parsed < minimum || parsed > maximum) return;
            control.value = parsed;
            try { slider.value = parsed; } catch (sliderError) {}
            onCommit(parsed);
        };
        input.onChange = function() { commit(input.text); };
        control.set = function(newValue, silent) { commit(newValue, silent); };
        return control;
    }

    // 세로로 쌓인 컨테이너(창·패널·탭)의 행 간격을 좁힌다. 가로 행 안의 간격은 그대로 둔다
    function tightenRows(container) {
        if (container.orientation === "column") container.spacing = ROW_SPACING;
        if (container.type === "panel") container.margins = PANEL_MARGINS;
        var children = container.children;
        for (var i = 0; children && i < children.length; i++) {
            if (children[i].children) tightenRows(children[i]);
        }
    }

    // 탭을 바꾸면 그 엔진이 쓰는 행만 켠다
    function syncEngineRows() {
        rotYControl.row.enabled = engine.usesRotY;
        sideButton.enabled = engine.usesRotY;
        syncFillRows();
        engine.sync();
    }

    function syncFillRows() {
        brightnessControl.row.enabled = fillMode !== FILL_NONE;
        contrastControl.row.enabled = fillMode === FILL_LIT;
        lightAzimuthControl.row.enabled = fillMode === FILL_LIT;
        lightElevationControl.row.enabled = fillMode === FILL_LIT;
        engine.sync();
    }

    // 끄는 동안 와이어프레임만 그리는 엔진(돌출)은 광원 값이 보이지 않으므로 손을 뗄 때만 그린다
    function updateLighting(live) {
        if (live && engine.liveWireframe) return;
        updatePreview(live);
    }

    function setView(y, x, z) {
        if (presetSaveMode) setPresetSaveMode(false);
        rotY = y;
        rotX = x;
        rotZ = z;
        rotYControl.set(y, true);
        rotXControl.set(x, true);
        rotZControl.set(z, true);
        updatePreview();
    }

    function applyPerspective(on, distanceMm) {
        perspectiveOn = on;
        perspectiveMm = distanceMm;
        perspectiveCheck.value = on;
        perspectiveControl.set(distanceMm, true);
        perspectiveControl.row.enabled = on;
    }

    function makeCustomPresetHandler(index) {
        return function() {
            if (presetSaveMode) {
                customPresets[index] = {y: rotY, x: rotX, z: rotZ, perspective: perspectiveOn, distance: perspectiveMm};
                saveCustomPresets();
                setPresetSaveMode(false);
                refreshCustomButtons();
                return;
            }
            var preset = customPresets[index];
            if (!preset) return;
            applyPerspective(preset.perspective, preset.distance);
            setView(preset.y, preset.x, preset.z);
        };
    }

    function setPresetSaveMode(on) {
        presetSaveMode = on;
        presetSaveButton.text = on ? "번호 클릭" : "저장";
        refreshCustomButtons();
    }

    // 저장된 번호는 툴팁에 각도를 보여주고, 빈 번호는 흐리게 둔다
    function refreshCustomButtons() {
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) {
            var preset = customPresets[i];
            customButtons[i].enabled = presetSaveMode || !!preset;
            customButtons[i].helpTip = preset
                ? "가로 " + formatValue(preset.y, 1) + "° / 기울기 " + formatValue(preset.x, 1) + "° / 화면 " +
                    formatValue(preset.z, 1) + "°" + (preset.perspective ? " / 원근 " + preset.distance + "mm" : "")
                : "비어 있음. 저장을 누른 뒤 이 번호를 누르면 저장";
        }
    }

    function saveCustomPresets() {
        var parts = ["v1"];
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) {
            var preset = customPresets[i];
            parts.push(preset ? [preset.y, preset.x, preset.z, preset.perspective ? 1 : 0, preset.distance].join(",") : "");
        }
        try { app.preferences.setStringPreference(PRESET_KEY, parts.join("|")); } catch (saveError) {}
    }

    function loadCustomPresets() {
        customPresets = [];
        var raw = "";
        try { raw = app.preferences.getStringPreference(PRESET_KEY); } catch (readError) { return; }
        if (!raw) { try { raw = app.preferences.getStringPreference(LEGACY_PRESET_KEY); } catch (legacyError) { return; } }
        if (!raw) return;
        var parts = String(raw).split("|");
        if (parts[0] !== "v1" || parts.length !== CUSTOM_PRESET_COUNT + 1) return;
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) {
            customPresets[i] = parseCustomPreset(parts[i + 1]);
        }
    }

    function parseCustomPreset(text) {
        if (!text) return null;
        var f = String(text).split(",");
        if (f.length !== 5) return null;
        var y = restoreNumber(f[0], null, -180, 180);
        var x = restoreNumber(f[1], null, -180, 180);
        var z = restoreNumber(f[2], null, -180, 180);
        var distance = restoreNumber(f[4], null, 50, 2000);
        if (y === null || x === null || z === null || distance === null) return null;
        return {y: y, x: x, z: z, perspective: f[3] === "1", distance: distance};
    }

    // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    function moveOffset(value, isX) {
        var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
        if (isX) offsetXmm = value;
        else offsetYmm = value;
        if (delta === 0 || previewGroup === null) return;
        translateItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
        app.redraw();
    }

    function translateItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (translateError) {}
    }

    // live: 슬라이더를 끄는 동안. 직전 그리기에서 얼마 안 지났으면 건너뛰고, 엔진에 따라 와이어프레임만 그린다.
    // 손을 떼면 live 없이 다시 불려 완전히 그린다
    function updatePreview(live) {
        if (live && new Date().getTime() - lastLiveRender < LIVE_INTERVAL_MS) return;
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = engine.create(!!live, false);
        if (previewGroup !== null) {
            translateItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            previewGroup.name = "3DLine Preview";
        }
        app.redraw();
        if (live) lastLiveRender = new Date().getTime();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (removeError) {}
        previewGroup = null;
    }

    // 공통 항목 뒤에 엔진별 항목을 순서대로 잇는다. 엔진 항목 수가 바뀌면 v를 올린다
    function saveSettings() {
        var parts = ["v1", tabIndex, rotY, rotX, rotZ, perspectiveOn ? 1 : 0, perspectiveMm, hiddenMode,
            offsetXmm, offsetYmm, fillMode, brightness, contrast, lightAzimuth, lightElevation];
        for (var i = 0; i < engines.length; i++) parts = parts.concat(engines[i].saveFields());
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (saveError) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (readError) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        var expected = 15;
        for (var i = 0; i < engines.length; i++) expected += engines[i].fieldCount;
        if (p[0] !== "v1" || p.length !== expected) return;
        tabIndex = restoreInteger(p[1], tabIndex, 0, engines.length - 1);
        rotY = restoreNumber(p[2], rotY, -180, 180);
        rotX = restoreNumber(p[3], rotX, -180, 180);
        rotZ = restoreNumber(p[4], rotZ, -180, 180);
        perspectiveOn = p[5] === "1";
        perspectiveMm = restoreNumber(p[6], perspectiveMm, 50, 2000);
        hiddenMode = restoreInteger(p[7], hiddenMode, HIDDEN_NONE, HIDDEN_SOLID);
        offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        fillMode = restoreInteger(p[10], fillMode, FILL_NONE, FILL_LIT);
        brightness = restoreNumber(p[11], brightness, 0, 100);
        contrast = restoreNumber(p[12], contrast, 0, 100);
        lightAzimuth = restoreNumber(p[13], lightAzimuth, -90, 90);
        lightElevation = restoreNumber(p[14], lightElevation, 0, 90);
        var at = 15;
        for (i = 0; i < engines.length; i++) {
            engines[i].restoreFields(p.slice(at, at + engines[i].fieldCount));
            at += engines[i].fieldCount;
        }
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null || value < minimum || value > maximum) return fallback;
        return value;
    }

    function restoreInteger(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        value = Math.round(value);
        if (value < minimum || value > maximum) return fallback;
        return value;
    }

    // ==== 공통 기하 ==========================================================
    // 모델 좌표: 원점 중심, X 오른쪽, Y 위, Z 화면 앞. 회전 뒤 Z가 클수록 보는 사람과 가깝다.
    // 세 엔진이 같이 쓰는 시점 행렬·투영·광원·색·선 스타일·베지어 도우미. 엔진 안에 같은 이름이 있으면 그쪽이 우선한다.

    // 회전 행렬과 시점 거리를 한 번만 계산해 둔다
    function beginView(model) {
        var ry = rotY * Math.PI / 180;
        var rx = rotX * Math.PI / 180;
        var rz = rotZ * Math.PI / 180;
        var matY = [[Math.cos(ry), 0, Math.sin(ry)], [0, 1, 0], [-Math.sin(ry), 0, Math.cos(ry)]];
        var matX = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]];
        var matZ = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
        // 가로 회전(Y) → 위아래 기울기(X) → 화면 회전(Z). 턴테이블 위의 물체를 보는 순서다 (회전체는 자기 beginView를 쓴다)
        viewMatrix = multiplyMatrix(matZ, multiplyMatrix(matX, matY));
        // 눈이 도형 안으로 들어가지 않도록 최소 거리를 둔다
        eyeZ = Math.max(perspectiveMm * MM_TO_PT, model.radius * 1.5 + 1);
    }

    function multiplyMatrix(a, b) {
        var out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (var r = 0; r < 3; r++) {
            for (var c = 0; c < 3; c++) {
                out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
            }
        }
        return out;
    }

    // 회전 행렬은 직교 행렬이라 전치가 역행렬이다
    function toModel(v) {
        var m = viewMatrix;
        return [
            m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
            m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
            m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]
        ];
    }

    // 모델 좌표의 점에서 눈을 향하는 단위 벡터
    function viewDirectionAt(point) {
        if (!perspectiveOn) return toModel([0, 0, 1]);
        var vp = toView(point);
        return normalize(toModel([-vp[0], -vp[1], eyeZ - vp[2]]));
    }

    function toView(p) {
        var m = viewMatrix;
        return [
            m[0][0] * p[0] + m[0][1] * p[1] + m[0][2] * p[2],
            m[1][0] * p[0] + m[1][1] * p[1] + m[1][2] * p[2],
            m[2][0] * p[0] + m[2][1] * p[1] + m[2][2] * p[2]
        ];
    }

    // 뷰 좌표의 점을 아트보드 좌표로 투영한다
    function projectView(v) {
        if (!perspectiveOn) return [originX + v[0], originY + v[1]];
        var factor = eyeZ / (eyeZ - v[2]);
        return [originX + v[0] * factor, originY + v[1] * factor];
    }

    function projectModel(p) {
        return projectView(toView(p));
    }

    // 면(점 p, 법선 n)이 보는 사람 쪽을 향하면 양수. 평행 투영은 Z 성분, 원근은 눈까지의 벡터와 내적
    function facingModel(p, n) {
        var vp = toView(p);
        var vn = toView(n);
        if (!perspectiveOn) return vn[2];
        return vn[0] * (-vp[0]) + vn[1] * (-vp[1]) + vn[2] * (eyeZ - vp[2]);
    }

    function lightVector() {
        var az = lightAzimuth * Math.PI / 180;
        var el = lightElevation * Math.PI / 180;
        return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    }

    // 뷰 좌표 법선 → 0(어두움)~1(밝음). 반쪽 램버트라 빛을 등진 면도 서로 구분된다
    function shadeOfViewNormal(viewNormal) {
        return 0.5 + 0.5 * dot(viewNormal, lightVector());
    }

    function kFromShade(shade) {
        var midK = 100 - brightness;
        if (fillMode === FILL_FLAT) return Math.round(clamp(midK, 0, 100));
        return Math.round(clamp(midK - (shade - 0.5) * contrast, 0, 100));
    }

    // 곡선 구간을 화면 좌표에서 베지어로 근사한다. 접선은 수치 미분, 핸들 길이는 원호 공식(4/3·tan(δ/4))
    function makeCurvePath(group, curve, t0, t1, closed) {
        var total = t1 - t0;
        var segmentCount = arcSegmentCount(total);
        var delta = total / segmentCount;
        var anchorCount = closed ? segmentCount : segmentCount + 1;
        var handleFactor = 4 / 3 * Math.tan(delta / 4);
        var anchors = [];
        var tangents = [];
        var i;
        for (i = 0; i < anchorCount; i++) {
            var t = t0 + delta * i;
            anchors.push(projectModel(curve.pointAt(t)));
            tangents.push(screenTangent(curve, t));
        }
        var path = group.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = closed;
        for (i = 0; i < anchors.length; i++) {
            var anchor = anchors[i];
            var left = anchor;
            var right = anchor;
            if (closed || i > 0) {
                left = [anchor[0] - tangents[i][0] * handleFactor, anchor[1] - tangents[i][1] * handleFactor];
            }
            if (closed || i < anchors.length - 1) {
                right = [anchor[0] + tangents[i][0] * handleFactor, anchor[1] + tangents[i][1] * handleFactor];
            }
            var point = path.pathPoints[i];
            point.leftDirection = left;
            point.rightDirection = right;
            point.pointType = PointType.SMOOTH;
        }
        return path;
    }

    // 구간 수. 반원이 부동소수점 오차로 π보다 살짝 커도 구간이 하나 더 생기지 않게 허용 오차를 둔다
    function arcSegmentCount(total) {
        return Math.max(1, Math.ceil(Math.abs(total) / MAX_ARC_SPAN - 1e-6));
    }

    function screenTangent(curve, t) {
        var h = 0.0005;
        var before = projectModel(curve.pointAt(t - h));
        var after = projectModel(curve.pointAt(t + h));
        return [(after[0] - before[0]) / (2 * h), (after[1] - before[1]) / (2 * h)];
    }

    // 호와 직선을 이어 붙인 닫힌 패스. 이음점은 앞 구간의 왼손잡이·뒤 구간의 오른손잡이를 합친다
    function makeOutlinePath(group, segments) {
        var nodes = [];
        var i;
        var k;
        for (i = 0; i < segments.length; i++) {
            var seg = segments[i];
            var pieces = [];
            if (seg.kind === "line") {
                var a = projectModel(seg.a);
                var b = projectModel(seg.b);
                pieces.push({anchor: a, left: a, right: a});
                pieces.push({anchor: b, left: b, right: b});
            } else {
                var total = seg.t1 - seg.t0;
                var count = arcSegmentCount(total);
                var delta = total / count;
                var handleFactor = 4 / 3 * Math.tan(delta / 4);
                for (k = 0; k <= count; k++) {
                    var t = seg.t0 + delta * k;
                    var anchor = projectModel(seg.curve.pointAt(t));
                    var tangent = screenTangent(seg.curve, t);
                    pieces.push({
                        anchor: anchor,
                        left: k === 0 ? anchor : [anchor[0] - tangent[0] * handleFactor, anchor[1] - tangent[1] * handleFactor],
                        right: k === count ? anchor : [anchor[0] + tangent[0] * handleFactor, anchor[1] + tangent[1] * handleFactor]
                    });
                }
            }
            for (k = 0; k < pieces.length; k++) {
                var last = nodes.length > 0 ? nodes[nodes.length - 1] : null;
                if (last !== null && k === 0 && samePoint(last.anchor, pieces[k].anchor)) {
                    last.right = pieces[k].right;
                } else {
                    nodes.push(pieces[k]);
                }
            }
        }
        // 닫힌 고리: 끝점이 시작점과 같으면 합친다
        if (nodes.length > 1 && samePoint(nodes[0].anchor, nodes[nodes.length - 1].anchor)) {
            nodes[0].left = nodes[nodes.length - 1].left;
            nodes.pop();
        }
        var anchors = [];
        for (i = 0; i < nodes.length; i++) anchors.push(nodes[i].anchor);
        var path = group.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = true;
        for (i = 0; i < nodes.length; i++) {
            var point = path.pathPoints[i];
            point.leftDirection = nodes[i].left;
            point.rightDirection = nodes[i].right;
            point.pointType = isCornerNode(nodes[i]) ? PointType.CORNER : PointType.SMOOTH;
        }
        return path;
    }

    // 한쪽 핸들이 없거나 두 핸들이 일직선이 아니면 모서리점이다 (호와 호가 만나는 렌즈 꼭짓점 등)
    function isCornerNode(node) {
        var lx = node.left[0] - node.anchor[0];
        var ly = node.left[1] - node.anchor[1];
        var rx = node.right[0] - node.anchor[0];
        var ry = node.right[1] - node.anchor[1];
        var leftLen = Math.sqrt(lx * lx + ly * ly);
        var rightLen = Math.sqrt(rx * rx + ry * ry);
        if (leftLen < 1e-6 || rightLen < 1e-6) return true;
        // 반대 방향으로 나란하면 sin ≈ 0, cos ≈ -1
        var sine = (lx * ry - ly * rx) / (leftLen * rightLen);
        var cosine = (lx * rx + ly * ry) / (leftLen * rightLen);
        return Math.abs(sine) > 0.01 || cosine > 0;
    }

    function samePoint(a, b) {
        return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    }

    function applyFill(path, k) {
        path.stroked = false;
        path.filled = true;
        try { path.fillColor = makeKColor(k); } catch (fillError) {}
    }

    function distance2(a, b) {
        return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
    }

    function applyStroke(path, dashed) {
        path.filled = false;
        applyStrokeStyle(path, dashed);
    }

    function applyStrokeStyle(path, dashed) {
        path.stroked = true;
        path.strokeWidth = LINE_WIDTH_PT;
        try { path.strokeColor = strokeColor; } catch (colorError) {}
        try { path.strokeDashes = dashed ? HIDDEN_DASH : []; } catch (dashError) {}
        try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (capError) {}
        try { path.strokeJoin = StrokeJoin.MITERENDJOIN; } catch (joinError) {}
    }

    function makeKColor(k) {
        if (kColorCache[k]) return kColorCache[k];
        var color;
        if (documentIsCmyk) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = k;
        } else {
            color = new RGBColor();
            var gray = Math.round(255 * (1 - k / 100));
            color.red = gray;
            color.green = gray;
            color.blue = gray;
        }
        kColorCache[k] = color;
        return color;
    }

    function makeStrokeColor() {
        var color;
        try {
            if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                color = new CMYKColor();
                color.cyan = 0;
                color.magenta = 0;
                color.yellow = 0;
                color.black = 100;
            } else {
                color = new RGBColor();
                color.red = 0;
                color.green = 0;
                color.blue = 0;
            }
        } catch (colorError) {
            color = null;
        }
        return color;
    }

    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

    function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }

    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

    function cross(a, b) {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    function length(a) { return Math.sqrt(dot(a, a)); }

    function normalize(a) {
        var len = length(a);
        if (len < 1e-12) return [0, 0, 0];
        return scale(a, 1 / len);
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function formatValue(value, decimals) {
        var factor = Math.pow(10, decimals);
        return String(Math.round(value * factor) / factor);
    }

    function roundTo(value, step) {
        return Math.round(value / step) * step;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    // ==== 입체 도형 엔진 =====================================================
    // 엔진 인터페이스: label·hint·usesRotY·liveWireframe / prepare(items)→오류문 또는 null, originX·originY /
    // addRows(page)·sync() / create(live, finalOutput)→그룹 / finish(group) / fieldCount·saveFields()·restoreFields(fields)

    function makeSolidEngine() {
        var SIZE_STEP_MM = 0.1;
        var MAX_SIZE_MM = 200;
        var SIDES_MIN = 3;
        var SIDES_MAX = 24;
        var CURVE_SAMPLES = 144;      // 곡선 가시성 판정 샘플 수

    // sides = 면 수·밑면 회전을 쓰는 도형, taper = 윗면 비율을 쓰는 도형, regular = 가로 하나로 균등 확대하는 정다면체
    var SHAPES = [
        {id: "box", label: "직육면체 (육면체)"},
        {id: "tetra", label: "정사면체", regular: true},
        {id: "octa", label: "정팔면체", regular: true},
        {id: "dodeca", label: "정십이면체", regular: true},
        {id: "icosa", label: "정이십면체", regular: true},
        {id: "prism", label: "각기둥 (삼각기둥 등)", sides: true},
        {id: "pyramid", label: "각뿔", sides: true},
        {id: "frustum", label: "각뿔대", sides: true, taper: true},
        {id: "cylinder", label: "원기둥"},
        {id: "cone", label: "원뿔"},
        {id: "conefrustum", label: "원뿔대", taper: true},
        {id: "tube", label: "빨대 (속 빈 원기둥)", taper: true, tube: true}
    ];

        var shapeIndex = 0;
        var widthMm = 20;
        var depthMm = 20;
        var heightMm = 20;
        var linkWidthDepth = true;
        var sideCount = 6;
        var baseRotation = 0;
        var topRatio = 50;

        // 실행 시 선택한 오브젝트가 있으면 그 중심을 생성 기준점으로 쓰고, 확인 시 지운다.
        // (취소하면 그대로 둔다.) 선택이 없으면 화면 중앙에 만든다.
        var guideItem = null;
        var shapeList, sidesCaption, sidesInput, sidesArrows, baseRotationControl, topRatioControl, widthControl, depthControl, heightControl, linkCheck;

        var api = {
            label: "입체 도형",
            hint: "선택 없이 실행. 개체를 하나 골랐으면 그 중심에 만든다",
            usesRotY: true,
            liveWireframe: false,
            originX: 0,
            originY: 0,
            fieldCount: 8,
            prepare: prepare,
            addRows: addRows,
            sync: syncShapeRows,
            create: createSolid,
            finish: finish,
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        function prepare(items) {
            try {
                if (items.length > 0 && items[0].visibleBounds) {
                    guideItem = items[0];
                    var gb = guideItem.visibleBounds;
                    api.originX = (gb[0] + gb[2]) / 2;
                    api.originY = (gb[1] + gb[3]) / 2;
                } else {
                    var centerPoint = doc.views[0].centerPoint;
                    api.originX = centerPoint[0];
                    api.originY = centerPoint[1];
                }
            } catch (originError) {
                api.originX = 0;
                api.originY = 0;
            }
            return null;
        }

        function addRows(page) {
            var shapePanel = page.add("panel", undefined, api.hint);
            shapePanel.orientation = "column";
            shapePanel.alignChildren = "fill";

            var shapeRow = shapePanel.add("group");
            shapeRow.alignChildren = ["left", "center"];
            shapeRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
            shapeList = shapeRow.add("dropdownlist", undefined, shapeLabels());
            shapeList.selection = shapeIndex;
            shapeList.preferredSize.width = SLIDER_WIDTH;
            // 면 수는 슬라이더 없이 종류 옆에 입력창 + 위아래 화살표만 둔다 (각기둥·각뿔·각뿔대에서만 켜진다)
            sidesCaption = shapeRow.add("statictext", undefined, "면 수:");
            sidesCaption.helpTip = "밑면 각의 수. 3이면 삼각기둥·삼각뿔";
            sidesInput = shapeRow.add("edittext", undefined, String(sideCount));
            sidesInput.characters = 3;
            sidesInput.helpTip = sidesCaption.helpTip;
            // 세로 스크롤바는 아래 화살표가 값을 키우므로 뒤집어서 위 화살표 = +1
            sidesArrows = shapeRow.add("scrollbar", undefined, SIDES_MAX + SIDES_MIN - sideCount, SIDES_MIN, SIDES_MAX);
            sidesArrows.preferredSize = [16, 24];
            sidesArrows.stepdelta = 1;
            sidesArrows.jumpdelta = 1;
            sidesArrows.onChanging = function() { setSideCount(SIDES_MAX + SIDES_MIN - sidesArrows.value); };
            sidesArrows.onChange = sidesArrows.onChanging;
            sidesInput.onChange = function() { setSideCount(parseNumber(sidesInput.text)); };
            baseRotationControl = addNumberRow(shapePanel, "밑면 회전 (°)", baseRotation, 0, 360, 1, 0,
                "밑면 다각형만 제자리에서 돌린다 (도형의 모양). 시점 프리셋을 눌러도 유지된다", function(value, live) {
                    baseRotation = value;
                    updatePreview(live);
                });
            topRatioControl = addNumberRow(shapePanel, "윗면 비율 (%)", topRatio, 0, 100, 1, 0,
                "밑면 대비 윗면 크기. 0이면 뿔이 된다", function(value, live) {
                    topRatio = value;
                    updatePreview(live);
                });

            var sizePanel = shapePanel;
            widthControl = addNumberRow(sizePanel, "가로 (mm)", widthMm, SIZE_STEP_MM, MAX_SIZE_MM,
                SIZE_STEP_MM, 1, "밑면의 가로 지름(정다면체는 가로 폭)", function(value, live) {
                    widthMm = value;
                    if (linkWidthDepth && depthMm !== value) {
                        depthMm = value;
                        depthControl.set(value, true);
                    }
                    updatePreview(live);
                });
            depthControl = addNumberRow(sizePanel, "세로 (mm)", depthMm, SIZE_STEP_MM, MAX_SIZE_MM,
                SIZE_STEP_MM, 1, "밑면의 세로 지름(안쪽 깊이)", function(value, live) {
                    depthMm = value;
                    if (linkWidthDepth && widthMm !== value) {
                        widthMm = value;
                        widthControl.set(value, true);
                    }
                    updatePreview(live);
                });
            heightControl = addNumberRow(sizePanel, "높이 (mm)", heightMm, SIZE_STEP_MM, MAX_SIZE_MM,
                SIZE_STEP_MM, 1, "세로축(Y) 방향 높이", function(value, live) {
                    heightMm = value;
                    updatePreview(live);
                });
            linkCheck = sizePanel.add("checkbox", undefined, "가로·세로 같게 (정원·정다각형 유지)");
            linkCheck.value = linkWidthDepth;
            return true;

            shapeList.onChange = function() {
                shapeIndex = shapeList.selection ? shapeList.selection.index : 0;
                syncShapeRows();
                updatePreview();
            };
            linkCheck.onClick = function() {
                linkWidthDepth = linkCheck.value;
                if (linkWidthDepth && depthMm !== widthMm) {
                    depthMm = widthMm;
                    depthControl.set(widthMm, true);
                    updatePreview();
                }
            };
        }

        function setSideCount(value) {
            if (value === null) value = sideCount;
            value = clamp(Math.round(value), SIDES_MIN, SIDES_MAX);
            sideCount = value;
            sidesInput.text = String(value);
            try { sidesArrows.value = SIDES_MAX + SIDES_MIN - value; } catch (arrowError) {}
            updatePreview();
        }

        function shapeLabels() {
            var labels = [];
            for (var i = 0; i < SHAPES.length; i++) labels.push(SHAPES[i].label);
            return labels;
        }

        function syncShapeRows() {
            if (!shapeList) return;
            var shape = SHAPES[shapeIndex];
            sidesCaption.enabled = shape.sides === true;
            sidesInput.enabled = shape.sides === true;
            sidesArrows.enabled = shape.sides === true;
            baseRotationControl.row.enabled = shape.sides === true;
            topRatioControl.row.enabled = shape.taper === true;
            // 빨대는 같은 행으로 뚫린 내경을 정한다
            topRatioControl.caption.text = shape.tube === true ? "내경 비율 (%):" : "윗면 비율 (%):";
            // 정다면체는 가로 하나로 크기를 정한다
            depthControl.row.enabled = shape.regular !== true;
            heightControl.row.enabled = shape.regular !== true;
            linkCheck.enabled = shape.regular !== true;
        }

        function finish(group) {
            group.name = "Solid3D " + SHAPES[shapeIndex].label;
            if (guideItem !== null) {
                try { group.move(guideItem, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
                try { guideItem.remove(); } catch (removeError) {}
                guideItem = null;
            }
        }

        function saveFields() {
            return [shapeIndex, widthMm, depthMm, heightMm, linkWidthDepth ? 1 : 0, sideCount, baseRotation, topRatio];
        }

        function restoreFields(f) {
            shapeIndex = restoreInteger(f[0], shapeIndex, 0, SHAPES.length - 1);
            widthMm = restoreNumber(f[1], widthMm, SIZE_STEP_MM, MAX_SIZE_MM);
            depthMm = restoreNumber(f[2], depthMm, SIZE_STEP_MM, MAX_SIZE_MM);
            heightMm = restoreNumber(f[3], heightMm, SIZE_STEP_MM, MAX_SIZE_MM);
            linkWidthDepth = f[4] === "1";
            sideCount = restoreInteger(f[5], sideCount, SIDES_MIN, SIDES_MAX);
            baseRotation = restoreNumber(f[6], baseRotation, 0, 360);
            topRatio = restoreNumber(f[7], topRatio, 0, 100);
        }

        // ---- 그리기 -----------------------------------------------------------
        // 모델 좌표: 원점 중심, X 오른쪽, Y 위, Z 화면 앞. 회전 뒤 Z가 클수록 보는 사람과 가깝다.

        function createSolid() {
            var model = buildModel();
            beginView(model);

            var parts = collectParts(model);
            var group;
            try {
                group = doc.groupItems.add();
            } catch (groupError) {
                return null;
            }
            try {
                // 쌓는 순서: 면 → 숨은선 → 보이는 선. 숨은선이 면에 가려지지 않는다
                if (fillMode !== FILL_NONE) {
                    var fillGroup = group.groupItems.add();
                    fillGroup.name = "면";
                    drawFills(fillGroup, collectFills(model));
                }
                var lineGroup = group.groupItems.add();
                lineGroup.name = "선";
                if (hiddenMode !== HIDDEN_NONE) drawParts(lineGroup, parts.hidden, hiddenMode === HIDDEN_DASHED);
                drawParts(lineGroup, parts.visible, false);
            } catch (drawError) {
                try { group.remove(); } catch (cleanupError) {}
                return null;
            }
            return group;
        }

        function refsFacing(refs) {
            var best = -Infinity;
            for (var i = 0; i < refs.length; i++) {
                var value = facingModel(refs[i].p, refs[i].n);
                if (value > best) best = value;
            }
            return best;
        }

        function collectParts(model) {
            var parts = {visible: [], hidden: []};
            var i;

            var faceFacing = [];
            for (i = 0; i < model.faces.length; i++) {
                faceFacing.push(facingModel(model.faces[i].center, model.faces[i].normal));
            }

            // 직선 모서리: 이웃한 면 중 하나라도 앞을 보면 보이는 선
            for (i = 0; i < model.edges.length; i++) {
                var edge = model.edges[i];
                var visible = edge.faces.length === 0;
                for (var f = 0; f < edge.faces.length && !visible; f++) {
                    if (faceFacing[edge.faces[f]] >= -FACING_EPSILON) visible = true;
                }
                (visible ? parts.visible : parts.hidden).push({kind: "line", a: edge.a, b: edge.b});
            }

            // 곡면의 외곽선(실루엣): 항상 보인다
            if (model.round) {
                var silhouettes = findSilhouettes(model.round);
                for (i = 0; i < silhouettes.length; i++) {
                    parts.visible.push({kind: "line", a: silhouettes[i].a, b: silhouettes[i].b});
                    // 빨대 안쪽 벽의 모선은 벽에 가려 늘 숨은선이다 (같은 t에서 안쪽 반지름으로)
                    if (model.tube) {
                        parts.hidden.push({kind: "line", a: model.tube.innerPoint(silhouettes[i].t, 0),
                            b: model.tube.innerPoint(silhouettes[i].t, 1)});
                    }
                }
            }

            // 곡선 모서리(원기둥·원뿔의 테두리): 보이는 구간과 숨은 구간으로 나눈다
            for (i = 0; i < model.curves.length; i++) {
                var curve = model.curves[i];
                var spans = splitCurve(curve);
                for (var s = 0; s < spans.length; s++) {
                    (spans[s].visible ? parts.visible : parts.hidden).push({
                        kind: "arc", curve: curve, t0: spans[s].t0, t1: spans[s].t1, closed: spans[s].closed
                    });
                }
            }
            return parts;
        }

        function drawParts(group, list, dashed) {
            for (var i = 0; i < list.length; i++) {
                var part = list[i];
                var path;
                if (part.kind === "line") {
                    path = group.pathItems.add();
                    path.setEntirePath([projectModel(part.a), projectModel(part.b)]);
                    path.closed = false;
                } else {
                    path = makeCurvePath(group, part.curve, part.t0, part.t1, part.closed);
                }
                applyStroke(path, dashed);
            }
        }

        // ---- 면 음영 -------------------------------------------------------------
        // 광원은 화면(보는 사람) 기준으로 고정된다. 물체를 돌리면 빛을 받는 면이 바뀐다

        // 채울 면 목록: {kind: "poly"|"cap"|"outline", ..., k}
        function collectFills(model) {
            var fills = [];
            var i;
            for (i = 0; i < model.faces.length; i++) {
                var face = model.faces[i];
                if (facingModel(face.center, face.normal) <= FACING_EPSILON) continue;
                fills.push({kind: "poly", points: face.points, k: kFromShade(shadeOfViewNormal(toView(face.normal)))});
            }
            if (model.round) collectRoundFills(model, fills);
            return fills;
        }

        function collectRoundFills(model, fills) {
            var round = model.round;
            var i;
            // 옆면: 실루엣 사이의 보이는 구간을 윤곽선으로 채운다. 톤은 보이는 구간의 평균 밝기
            var silhouettes = findSilhouettes(round);
            var lateral = null;
            if (silhouettes.length >= 2) {
                var tA = silhouettes[0].t;
                var tB = silhouettes[1].t;
                var midFacing = facingModel(round.pointAt((tA + tB) / 2, 0.5), round.normalAt((tA + tB) / 2, 0.5));
                lateral = midFacing >= 0 ? {t0: tA, t1: tB} : {t0: tB, t1: tA + 2 * Math.PI};
            } else if (facingModel(round.pointAt(0, 0.5), round.normalAt(0, 0.5)) > FACING_EPSILON) {
                lateral = {t0: 0, t1: 2 * Math.PI, whole: true};
            }
            if (lateral !== null) {
                var shadeSum = 0;
                var shadeSamples = 24;
                for (i = 0; i < shadeSamples; i++) {
                    var t = lateral.t0 + (lateral.t1 - lateral.t0) * (i + 0.5) / shadeSamples;
                    shadeSum += shadeOfViewNormal(toView(round.normalAt(t, 0.5)));
                }
                fills.push({kind: "outline", round: round, span: lateral, k: kFromShade(shadeSum / shadeSamples)});
            }
            if (model.tube) {
                collectTubeFills(model, fills);
                return;
            }
            // 뚜껑: 앞을 보는 것만
            for (i = 0; i < model.curves.length; i++) {
                var cap = model.curves[i].refsAt(0)[0];
                if (facingModel(cap.p, cap.n) <= FACING_EPSILON) continue;
                fills.push({kind: "cap", curve: model.curves[i], k: kFromShade(shadeOfViewNormal(toView(cap.n)))});
            }
        }

        // 빨대: 보는 쪽 끝은 고리(바깥 원 - 안쪽 원), 구멍 안은 먼 안쪽 벽만 채우고 관통해 보이는 부분은 비운다
        function collectTubeFills(model, fills) {
            var tube = model.tube;
            var round = model.round;
            var nearEnd = -1;
            var i;
            if (facingModel([0, tube.yTop, 0], [0, 1, 0]) > FACING_EPSILON) nearEnd = 1;
            else if (facingModel([0, tube.yBottom, 0], [0, -1, 0]) > FACING_EPSILON) nearEnd = 0;
            if (nearEnd < 0) return;
            var farEnd = 1 - nearEnd;
            var capNormal = nearEnd === 1 ? [0, 1, 0] : [0, -1, 0];
            // curves: [0] 바깥 아래, [1] 바깥 위, [2] 안쪽 아래, [3] 안쪽 위
            var nearOuter = model.curves[nearEnd];
            var nearInner = model.curves[2 + nearEnd];
            var farInner = model.curves[2 + farEnd];
            fills.push({kind: "annulus", outer: nearOuter, inner: nearInner, k: kFromShade(shadeOfViewNormal(toView(capNormal)))});

            // 안쪽 벽 톤: 바깥 법선이 뒤를 보는 띠(= 안쪽 벽이 보이는 띠)에서 안쪽 법선(-n)으로 평균
            var shadeSum = 0;
            var shadeCount = 0;
            for (i = 0; i < 48; i++) {
                var t = 2 * Math.PI * (i + 0.5) / 48;
                var n = round.normalAt(t, 0.5);
                if (facingModel(round.pointAt(t, 0.5), n) >= 0) continue;
                shadeSum += shadeOfViewNormal(toView(scale(n, -1)));
                shadeCount++;
            }
            if (shadeCount === 0) return;
            var wallK = kFromShade(shadeSum / shadeCount);

            // 가까운 안쪽 테두리 중 먼 구멍과 겹치는 호(렌즈 경계)를 찾는다
            var lensCurve = {
                pointAt: nearInner.pointAt,
                visibilityAt: function(u) { return tube.ratio - exitRadius(tube, nearInner.pointAt(u), farEnd, -1) + 1e-9; },
                tMin: 0,
                tMax: 2 * Math.PI,
                closed: true
            };
            var nearSpans = splitCurve(lensCurve);
            var farSpans = splitCurve(farInner);
            var wallSpan = null;
            var lensSpan = null;
            for (i = 0; i < nearSpans.length; i++) {
                if (!nearSpans[i].visible) wallSpan = nearSpans[i];
            }
            for (i = 0; i < farSpans.length; i++) {
                if (farSpans[i].visible) lensSpan = farSpans[i];
            }
            if (wallSpan === null) return;                       // 축 방향으로 보면 구멍이 그대로 뚫려 보인다
            if (wallSpan.closed || lensSpan === null || lensSpan.closed) {
                // 먼 구멍이 전혀 안 보인다: 안쪽 원 전체가 벽
                fills.push({kind: "cap", curve: nearInner, k: wallK});
                return;
            }
            var nearEndPoint = projectModel(nearInner.pointAt(wallSpan.t1));
            var farStart = projectModel(farInner.pointAt(lensSpan.t0));
            var farEndPoint = projectModel(farInner.pointAt(lensSpan.t1));
            var farForward = distance2(farEndPoint, nearEndPoint) > distance2(farStart, nearEndPoint);
            fills.push({kind: "segments", k: wallK, segments: [
                {kind: "arc", curve: nearInner, t0: wallSpan.t0, t1: wallSpan.t1},
                farForward ? {kind: "arc", curve: farInner, t0: lensSpan.t0, t1: lensSpan.t1}
                    : {kind: "arc", curve: farInner, t0: lensSpan.t1, t1: lensSpan.t0}
            ]});
        }

        function drawFills(group, fills) {
            for (var i = 0; i < fills.length; i++) {
                var fill = fills[i];
                var path;
                if (fill.kind === "poly") {
                    var anchors = [];
                    for (var k = 0; k < fill.points.length; k++) anchors.push(projectModel(fill.points[k]));
                    path = group.pathItems.add();
                    path.setEntirePath(anchors);
                    path.closed = true;
                } else if (fill.kind === "cap") {
                    path = makeCurvePath(group, fill.curve, fill.curve.tMin, fill.curve.tMax, true);
                } else if (fill.kind === "annulus") {
                    drawAnnulus(group, fill.outer, fill.inner, fill.k);
                    continue;
                } else if (fill.kind === "segments") {
                    path = makeOutlinePath(group, fill.segments);
                } else {
                    path = makeLateralOutline(group, fill.round, fill.span);
                }
                applyFill(path, fill.k);
            }
        }

        // 곡면 옆면 윤곽: 아래 테두리 호 → 실루엣 모선 → 위 테두리 호(역방향) → 실루엣 모선
        function makeLateralOutline(group, round, span) {
            var bottom = {pointAt: function(t) { return round.pointAt(t, 0); }};
            var top = {pointAt: function(t) { return round.pointAt(t, 1); }};
            var apex = round.pointAt(0, 1);
            var topIsApex = length(sub(apex, round.pointAt(Math.PI / 2, 1))) < 1e-9;
            var segments = [];
            if (span.whole) {
                // 축 방향에서 본 원뿔: 밑면 원 전체가 옆면 윤곽
                return makeCurvePath(group, bottom, 0, 2 * Math.PI, true);
            }
            segments.push({kind: "arc", curve: bottom, t0: span.t0, t1: span.t1});
            if (topIsApex) {
                segments.push({kind: "line", a: bottom.pointAt(span.t1), b: apex});
                segments.push({kind: "line", a: apex, b: bottom.pointAt(span.t0)});
            } else {
                segments.push({kind: "line", a: bottom.pointAt(span.t1), b: top.pointAt(span.t1)});
                segments.push({kind: "arc", curve: top, t0: span.t1, t1: span.t0});
                segments.push({kind: "line", a: top.pointAt(span.t0), b: bottom.pointAt(span.t0)});
            }
            return makeOutlinePath(group, segments);
        }

        // 고리: 복합 패스에 바깥 원과 안쪽 원을 넣고 짝수-홀수 규칙으로 구멍을 낸다
        function drawAnnulus(group, outerCurve, innerCurve, k) {
            var compound = null;
            try { compound = group.compoundPathItems.add(); } catch (compoundError) { compound = null; }
            if (compound === null) {
                applyFill(makeCurvePath(group, outerCurve, 0, 2 * Math.PI, true), k);
                return;
            }
            var outerPath = makeCurvePath(compound, outerCurve, 0, 2 * Math.PI, true);
            var innerPath = makeCurvePath(compound, innerCurve, 0, 2 * Math.PI, true);
            applyFill(outerPath, k);
            applyFill(innerPath, k);
            try { outerPath.evenodd = true; } catch (evenOddError) {}
            try { innerPath.evenodd = true; } catch (evenOddError2) {}
        }

        // 곡선 위 각 점의 "앞을 보는 정도"를 샘플링해 부호가 바뀌는 곳에서 자른다
        function splitCurve(curve) {
            var tMin = curve.tMin;
            var span = curve.tMax - curve.tMin;
            var values = [];
            var i;
            for (i = 0; i <= CURVE_SAMPLES; i++) {
                values.push(curveFacing(curve, tMin + span * i / CURVE_SAMPLES));
            }
            // 닫힌 곡선은 마지막 샘플을 첫 샘플과 비교한다. t=2π에서 부동소수점 오차로 부호가 흔들려 교차를 놓치지 않게
            if (curve.closed) values[CURVE_SAMPLES] = values[0];
            var crossings = [];
            for (i = 0; i < CURVE_SAMPLES; i++) {
                if ((values[i] >= 0) !== (values[i + 1] >= 0)) {
                    crossings.push(refineCrossing(curve, tMin + span * i / CURVE_SAMPLES,
                        tMin + span * (i + 1) / CURVE_SAMPLES));
                }
            }
            var spans = [];
            if (crossings.length === 0) {
                spans.push({t0: tMin, t1: curve.tMax, visible: values[0] >= 0, closed: curve.closed});
                return spans;
            }
            var t0;
            var t1;
            if (curve.closed) {
                for (i = 0; i < crossings.length; i++) {
                    t0 = crossings[i];
                    t1 = (i + 1 < crossings.length) ? crossings[i + 1] : crossings[0] + span;
                    spans.push({t0: t0, t1: t1, visible: curveFacing(curve, (t0 + t1) / 2) >= 0, closed: false});
                }
                return spans;
            }
            t0 = tMin;
            for (i = 0; i <= crossings.length; i++) {
                t1 = (i < crossings.length) ? crossings[i] : curve.tMax;
                if (t1 > t0) {
                    spans.push({t0: t0, t1: t1, visible: curveFacing(curve, (t0 + t1) / 2) >= 0, closed: false});
                }
                t0 = t1;
            }
            return spans;
        }

        function curveFacing(curve, t) {
            if (curve.visibilityAt) return curve.visibilityAt(t);
            return refsFacing(curve.refsAt(t));
        }

        function refineCrossing(curve, tA, tB) {
            var fA = curveFacing(curve, tA);
            var visibleAtA = fA >= 0;
            for (var i = 0; i < 30; i++) {
                var tM = (tA + tB) / 2;
                var fM = curveFacing(curve, tM);
                if ((fM >= 0) === visibleAtA) tA = tM;
                else tB = tM;
            }
            return (tA + tB) / 2;
        }

        // 곡면의 실루엣 모선: 옆면 법선이 시선과 직각이 되는 t를 찾아 아래 테두리 → 위 테두리(또는 꼭짓점)를 잇는다
        function findSilhouettes(round) {
            var samples = 360;
            var values = [];
            var i;
            for (i = 0; i <= samples; i++) {
                var t = 2 * Math.PI * i / samples;
                values.push(facingModel(round.pointAt(t, 0.5), round.normalAt(t, 0.5)));
            }
            values[samples] = values[0]; // 2π = 0, 부동소수점 오차로 부호가 갈리지 않게
            var lines = [];
            // 축 방향에서 보면 옆면 전체가 시선과 직각(값이 ±1e-17로 흔들림)이라 실루엣이 없다
            var maxAbs = 0;
            for (i = 0; i <= samples; i++) maxAbs = Math.max(maxAbs, Math.abs(values[i]));
            if (maxAbs < 1e-9) return lines;
            for (i = 0; i < samples; i++) {
                if ((values[i] >= 0) === (values[i + 1] >= 0)) continue;
                var tA = 2 * Math.PI * i / samples;
                var tB = 2 * Math.PI * (i + 1) / samples;
                var visibleAtA = values[i] >= 0;
                for (var k = 0; k < 30; k++) {
                    var tM = (tA + tB) / 2;
                    var fM = facingModel(round.pointAt(tM, 0.5), round.normalAt(tM, 0.5));
                    if ((fM >= 0) === visibleAtA) tA = tM;
                    else tB = tM;
                }
                var tStar = (tA + tB) / 2;
                lines.push({t: tStar, a: round.pointAt(tStar, 0), b: round.pointAt(tStar, 1)});
            }
            return lines;
        }

        // ---- 모델 만들기 --------------------------------------------------------
        // 결과: {faces, edges, curves, round, radius}
        //   faces[i]  = {points, normal, center}  평면 다각형 면 (법선은 바깥쪽·단위 길이)
        //   edges[i]  = {a, b, faces: [면 번호...]} 직선 모서리. faces가 비면 항상 보이는 선
        //   curves[i] = {pointAt(t), refsAt(t), tMin, tMax, closed} 곡선 모서리
        //   round     = {pointAt(t, s), normalAt(t, s)} 곡면 (실루엣 계산용)

        function buildModel() {
            var kind = SHAPES[shapeIndex].id;
            var halfW = Math.max(0.01, widthMm * MM_TO_PT / 2);
            var halfD = Math.max(0.01, depthMm * MM_TO_PT / 2);
            var height = Math.max(0.01, heightMm * MM_TO_PT);
            if (kind === "tube") {
                return buildTubeModel(halfW, halfD, height);
            }
            if (kind === "cylinder" || kind === "cone" || kind === "conefrustum") {
                return buildRoundModel(kind, halfW, halfD, height);
            }
            if (kind === "prism" || kind === "pyramid" || kind === "frustum") {
                return buildPrismModel(kind, halfW, halfD, height);
            }
            return buildPlatonicModel(kind, halfW, halfD, height);
        }

        // 각기둥·각뿔·각뿔대: 밑면 다각형은 XZ 평면. 밑면 회전 0이면 한 변이 정면을 보게 놓는다 (4각이면 반듯한 상자)
        function buildPrismModel(kind, halfW, halfD, height) {
            var n = sideCount;
            var topScale = kind === "pyramid" ? 0 : (kind === "frustum" ? topRatio / 100 : 1);
            var yBottom = -height / 2;
            var yTop = height / 2;
            var startAngle = baseRotation * Math.PI / 180 + Math.PI / 2 + Math.PI / n;
            var verts = [];
            var faces = [];
            var i;
            var bottom = [];
            var top = [];
            for (i = 0; i < n; i++) {
                var angle = startAngle + 2 * Math.PI * i / n;
                verts.push([halfW * Math.cos(angle), yBottom, halfD * Math.sin(angle)]);
                bottom.push(i);
            }
            if (topScale > 0) {
                for (i = 0; i < n; i++) {
                    var topAngle = startAngle + 2 * Math.PI * i / n;
                    verts.push([halfW * topScale * Math.cos(topAngle), yTop, halfD * topScale * Math.sin(topAngle)]);
                    top.push(n + i);
                }
            } else {
                verts.push([0, yTop, 0]);
            }
            faces.push(bottom);
            if (topScale > 0) faces.push(top);
            for (i = 0; i < n; i++) {
                var j = (i + 1) % n;
                if (topScale > 0) faces.push([i, j, n + j, n + i]);
                else faces.push([i, j, n]);
            }
            return makePolyModel(verts, faces);
        }

        // 정다면체: 단위 좌표를 한 면이 바닥에 오게 세운 뒤, 바운딩 박스 중심을 원점에 두고 가로·높이·세로에 맞춰 늘린다
        function buildPlatonicModel(kind, halfW, halfD, height) {
            var data = platonicData(kind);
            var verts = data.verts;
            if (kind === "tetra" || kind === "dodeca" || kind === "icosa") {
                verts = standOnFace(verts, data.faces);
            }
            var low = [Infinity, Infinity, Infinity];
            var high = [-Infinity, -Infinity, -Infinity];
            var i;
            var axis;
            for (i = 0; i < verts.length; i++) {
                for (axis = 0; axis < 3; axis++) {
                    low[axis] = Math.min(low[axis], verts[i][axis]);
                    high[axis] = Math.max(high[axis], verts[i][axis]);
                }
            }
            var halfExtent = [
                Math.max(1e-9, (high[0] - low[0]) / 2),
                Math.max(1e-9, (high[1] - low[1]) / 2),
                Math.max(1e-9, (high[2] - low[2]) / 2)
            ];
            // 정다면체는 가로 폭 기준으로 균등하게, 직육면체는 축마다 따로 늘린다
            var regular = SHAPES[shapeIndex].regular === true;
            var factor = [halfW / halfExtent[0], height / 2 / halfExtent[1], halfD / halfExtent[2]];
            if (regular) factor = [factor[0], factor[0], factor[0]];
            var scaled = [];
            for (i = 0; i < verts.length; i++) {
                var p = [0, 0, 0];
                for (axis = 0; axis < 3; axis++) {
                    p[axis] = (verts[i][axis] - (low[axis] + high[axis]) / 2) * factor[axis];
                }
                scaled.push(p);
            }
            return makePolyModel(scaled, data.faces);
        }

        // 가장 아래를 향한 면의 법선을 정확히 -Y로 돌리고, 그 면의 한 꼭짓점이 뒤(-Z)를 보게 돌려
        // 앞쪽에 수평 모서리가 오는 교과서 자세로 만든다
        function standOnFace(verts, faces) {
            var bottomIndex = 0;
            var bottomNormal = null;
            var i;
            for (i = 0; i < faces.length; i++) {
                var ring = faces[i];
                var normal = normalize(cross(sub(verts[ring[1]], verts[ring[0]]), sub(verts[ring[2]], verts[ring[0]])));
                if (dot(normal, verts[ring[0]]) < 0) normal = scale(normal, -1);
                if (bottomNormal === null || normal[1] < bottomNormal[1]) {
                    bottomNormal = normal;
                    bottomIndex = i;
                }
            }
            var rotated = rotateVectorsOnto(verts, bottomNormal, [0, -1, 0]);
            var first = rotated[faces[bottomIndex][0]];
            var azimuth = Math.atan2(first[0], first[2]);
            var spin = Math.PI - azimuth;
            var c = Math.cos(spin);
            var s = Math.sin(spin);
            var out = [];
            for (i = 0; i < rotated.length; i++) {
                var v = rotated[i];
                out.push([v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]);
            }
            return out;
        }

        // from 방향이 to 방향이 되도록 모든 점을 회전한다 (로드리게스 공식)
        function rotateVectorsOnto(verts, from, to) {
            var axis = cross(from, to);
            var sinA = length(axis);
            var cosA = dot(from, to);
            if (sinA < 1e-9) {
                if (cosA > 0) return verts;
                // 정반대 방향: from에 수직인 아무 축으로 180° 돌린다
                axis = normalize(cross(from, Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
                sinA = 0;
                cosA = -1;
            } else {
                axis = scale(axis, 1 / sinA);
            }
            var out = [];
            for (var i = 0; i < verts.length; i++) {
                var v = verts[i];
                var term1 = scale(v, cosA);
                var term2 = scale(cross(axis, v), sinA);
                var term3 = scale(axis, dot(axis, v) * (1 - cosA));
                out.push(add(add(term1, term2), term3));
            }
            return out;
        }

        function platonicData(kind) {
            var phi = (1 + Math.sqrt(5)) / 2;
            var inv = 1 / phi;
            var verts;
            var faces;
            var i;
            if (kind === "tetra") {
                verts = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
                faces = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
                return {verts: verts, faces: faces};
            }
            if (kind === "octa") {
                verts = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
                faces = [];
                for (i = 0; i < 8; i++) {
                    faces.push([i & 1, 2 + ((i >> 1) & 1), 4 + ((i >> 2) & 1)]);
                }
                return {verts: verts, faces: faces};
            }
            if (kind === "dodeca") {
                verts = signCombos([1, 1, 1]).concat(
                    cyclicCombos([0, inv, phi]));
                // 면 법선 방향 = 쌍대인 정이십면체의 꼭짓점 방향 (이 좌표계에서는 (±1, 0, ±φ)의 순환)
                var dodecaNormals = cyclicCombos([1, 0, phi]);
                faces = clusterFaces(verts, dodecaNormals);
                return {verts: verts, faces: faces};
            }
            if (kind === "icosa") {
                verts = cyclicCombos([0, 1, phi]);
                // 면 법선 방향 = 쌍대인 정십이면체의 꼭짓점 방향 ((±1,±1,±1)과 (±1/φ, 0, ±φ)의 순환)
                var icosaNormals = signCombos([1, 1, 1]).concat(cyclicCombos([inv, 0, phi]));
                faces = clusterFaces(verts, icosaNormals);
                return {verts: verts, faces: faces};
            }
            // 직육면체
            verts = signCombos([1, 1, 1]);
            faces = [];
            var boxNormals = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
            faces = clusterFaces(verts, boxNormals);
            return {verts: verts, faces: faces};
        }

        // (±a, ±b, ±c) 여덟 가지 (0인 성분은 부호를 나누지 않는다)
        function signCombos(base) {
            var out = [];
            var seen = {};
            for (var i = 0; i < 8; i++) {
                var p = [
                    base[0] * ((i & 1) ? -1 : 1),
                    base[1] * ((i & 2) ? -1 : 1),
                    base[2] * ((i & 4) ? -1 : 1)
                ];
                var key = p.join(",");
                if (seen[key]) continue;
                seen[key] = true;
                out.push(p);
            }
            return out;
        }

        // (a,b,c)의 순환 치환 세 가지에 각각 부호 조합을 적용
        function cyclicCombos(base) {
            var out = [];
            out = out.concat(signCombos([base[0], base[1], base[2]]));
            out = out.concat(signCombos([base[2], base[0], base[1]]));
            out = out.concat(signCombos([base[1], base[2], base[0]]));
            return out;
        }

        // 법선 방향마다 그 방향으로 가장 멀리 있는 꼭짓점들을 모아 면으로 만든다 (볼록 다면체 전용)
        function clusterFaces(verts, normals) {
            var faces = [];
            for (var i = 0; i < normals.length; i++) {
                var n = normalize(normals[i]);
                var best = -Infinity;
                var j;
                var d;
                for (j = 0; j < verts.length; j++) {
                    d = dot(verts[j], n);
                    if (d > best) best = d;
                }
                var picked = [];
                for (j = 0; j < verts.length; j++) {
                    d = dot(verts[j], n);
                    if (d > best - 1e-6) picked.push(j);
                }
                faces.push(orderRing(verts, picked, n));
            }
            return faces;
        }

        // 면 위의 꼭짓점을 법선 둘레 각도 순서로 세운다
        function orderRing(verts, picked, n) {
            var center = [0, 0, 0];
            var i;
            for (i = 0; i < picked.length; i++) {
                center = add(center, verts[picked[i]]);
            }
            center = scale(center, 1 / picked.length);
            var helper = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
            var u = normalize(cross(n, helper));
            var v = cross(n, u);
            var entries = [];
            for (i = 0; i < picked.length; i++) {
                var rel = sub(verts[picked[i]], center);
                entries.push({index: picked[i], angle: Math.atan2(dot(rel, v), dot(rel, u))});
            }
            entries.sort(function(a, b) { return a.angle - b.angle; });
            var ring = [];
            for (i = 0; i < entries.length; i++) ring.push(entries[i].index);
            return ring;
        }

        // 꼭짓점 + 면(꼭짓점 번호 순환)으로 면 법선과 모서리(이웃 면 포함)를 만든다
        function makePolyModel(verts, faceIndexLists) {
            var faces = [];
            var edges = [];
            var edgeMap = {};
            var radius = 0;
            var i;
            var k;
            for (i = 0; i < verts.length; i++) {
                radius = Math.max(radius, length(verts[i]));
            }
            for (i = 0; i < faceIndexLists.length; i++) {
                var ring = faceIndexLists[i];
                var points = [];
                var center = [0, 0, 0];
                for (k = 0; k < ring.length; k++) {
                    points.push(verts[ring[k]]);
                    center = add(center, verts[ring[k]]);
                }
                center = scale(center, 1 / ring.length);
                var normal = normalize(cross(sub(points[1], points[0]), sub(points[2], points[0])));
                // 원점이 도형 안에 있으므로 중심 방향과 반대면 뒤집어 바깥을 향하게 한다
                if (dot(normal, center) < 0) normal = scale(normal, -1);
                faces.push({points: points, normal: normal, center: center});

                for (k = 0; k < ring.length; k++) {
                    var a = ring[k];
                    var b = ring[(k + 1) % ring.length];
                    var key = a < b ? a + "_" + b : b + "_" + a;
                    if (!edgeMap[key]) {
                        edgeMap[key] = {a: verts[a], b: verts[b], faces: []};
                        edges.push(edgeMap[key]);
                    }
                    edgeMap[key].faces.push(i);
                }
            }
            return {faces: faces, edges: edges, curves: [], round: null, radius: radius};
        }

        // 원기둥·원뿔·원뿔대: 옆면 P(t,s) = (A(s)cos t, y(s), C(s)sin t)
        function buildRoundModel(kind, halfW, halfD, height) {
            var topScale = kind === "cone" ? 0 : (kind === "conefrustum" ? topRatio / 100 : 1);
            var bottomX = halfW;
            var bottomZ = halfD;
            var deltaX = halfW * topScale - bottomX;
            var deltaZ = halfD * topScale - bottomZ;
            var yBottom = -height / 2;

            function pointAt(t, s) {
                var ax = bottomX + deltaX * s;
                var az = bottomZ + deltaZ * s;
                return [ax * Math.cos(t), yBottom + height * s, az * Math.sin(t)];
            }
            // ∂P/∂t × ∂P/∂s 를 바깥쪽으로 맞춘 법선
            function normalAt(t, s) {
                var ax = bottomX + deltaX * s;
                var az = bottomZ + deltaZ * s;
                var ct = Math.cos(t);
                var st = Math.sin(t);
                return normalize([
                    az * height * ct,
                    -(az * deltaX * ct * ct + ax * deltaZ * st * st),
                    ax * height * st
                ]);
            }

            var curves = [];
            curves.push(makeRim(pointAt, normalAt, 0, [0, yBottom, 0], [0, -1, 0]));
            if (topScale > 0) {
                curves.push(makeRim(pointAt, normalAt, 1, [0, yBottom + height, 0], [0, 1, 0]));
            }
            var radius = Math.sqrt(Math.max(halfW, halfD) * Math.max(halfW, halfD) + height * height / 4);
            return {faces: [], edges: [], curves: curves, round: {pointAt: pointAt, normalAt: normalAt}, radius: radius};
        }

        // 빨대: 바깥은 원기둥 그대로, 안쪽 테두리 두 개를 더한다. 내경 비율은 윗면 비율 행을 쓴다
        function buildTubeModel(halfW, halfD, height) {
            var model = buildRoundModel("cylinder", halfW, halfD, height);
            var ratio = clamp(topRatio, 1, 99) / 100;
            var tube = {ratio: ratio, halfW: halfW, halfD: halfD, yBottom: -height / 2, yTop: height / 2, height: height};
            tube.innerPoint = function(t, s) {
                return [halfW * ratio * Math.cos(t), tube.yBottom + height * s, halfD * ratio * Math.sin(t)];
            };
            model.curves.push(makeInnerRim(tube, 0));
            model.curves.push(makeInnerRim(tube, 1));
            model.tube = tube;
            return model;
        }

        // 안쪽 테두리: 그 끝의 뚜껑이 앞을 보면 전부 보이고, 아니면 시선이 반대쪽 구멍으로 빠져나가는 점만 보인다
        function makeInnerRim(tube, end) {
            var capCenter = [0, end === 0 ? tube.yBottom : tube.yTop, 0];
            var capNormal = [0, end === 0 ? -1 : 1, 0];
            return {
                pointAt: function(t) { return tube.innerPoint(t, end); },
                visibilityAt: function(t) {
                    var capFacing = facingModel(capCenter, capNormal);
                    if (capFacing > FACING_EPSILON) return capFacing;
                    // 두 구멍이 겹쳐 보이는 축 방향에서는 값이 0 근처라 보이는 쪽으로 기운다
                    return tube.ratio - exitRadius(tube, tube.innerPoint(t, end), 1 - end, 1) + 1e-9;
                },
                tMin: 0,
                tMax: 2 * Math.PI,
                closed: true
            };
        }

        // point에서 시선 방향(direction +1: 눈 쪽, -1: 반대쪽)으로 나아가 targetEnd 끝면에 닿았을 때의
        // 정규화 반지름(바깥 반지름 = 1). 내경 비율보다 작으면 구멍을 지난다. 닿지 못하면 아주 큰 값
        function exitRadius(tube, point, targetEnd, direction) {
            var v = scale(viewDirectionAt(point), direction);
            var targetY = targetEnd === 0 ? tube.yBottom : tube.yTop;
            if (Math.abs(v[1]) < 1e-9) return 1e9;
            var sRay = (targetY - point[1]) / v[1];
            if (sRay < 0) return 1e9;
            var x = (point[0] + v[0] * sRay) / tube.halfW;
            var z = (point[2] + v[2] * sRay) / tube.halfD;
            return Math.sqrt(x * x + z * z);
        }

        // 테두리 원: 뚜껑 면(고정 법선)과 옆면(t마다 다른 법선) 둘 중 하나라도 앞을 보면 보인다
        function makeRim(pointAt, normalAt, s, capCenter, capNormal) {
            return {
                pointAt: function(t) { return pointAt(t, s); },
                refsAt: function(t) {
                    return [
                        {p: capCenter, n: capNormal},
                        {p: pointAt(t, s), n: normalAt(t, s)}
                    ];
                },
                tMin: 0,
                tMax: 2 * Math.PI,
                closed: true
            };
        }

        // ---- 벡터·숫자 도우미 ---------------------------------------------------

        return api;
    }

    // ==== 돌출 엔진 ==========================================================

    function makeExtrudeEngine() {
        var DEPTH_MIN_MM = 0.5;
        var DEPTH_MAX_MM = 300;
        var CURVE_PIECES = 12;          // 베지어 한 구간을 펴는 조각 수
        var CORNER_COS = Math.cos(2 * Math.PI / 180); // 접선이 2° 넘게 꺾이면 모서리
        var CURVE_SAMPLES_PER_SEG = 12; // 테두리 곡선 가시성 판정 샘플 수 (베지어 한 구간당)
        var CURVE_SAMPLES_MIN = 96;
        var CURVE_SAMPLES_MAX = 480;
        var RULING_SAMPLES = 48;        // 모선(세로 능선) 가시성 판정 샘플 수
        var CROSSING_STEPS = 12;        // 보임/숨음 경계를 좁히는 이분법 횟수. 샘플 간격의 1/4096이라 화면 0.01pt 안이다
        var RAY_LIFT = 1e-4;            // 열린 띠에서 광선을 쏘기 전에 점을 바깥 법선 쪽으로 띄우는 비율 (× 모델 반지름)
        var PROBE_STEP = 1e-4;          // 모서리 점이 속으로 들어가는지 볼 때 시선 쪽으로 내딛는 비율 (× 모델 반지름)
        var MIN_SPAN_PT = 1.5;          // 이보다 짧은 보임/숨음 구간은 이웃에 합친다 (실루엣 근처의 떨림 제거)
        var FILL_OVERLAP_PT = 0.15;     // 이웃 면끼리 이만큼 겹쳐 채워 안티에일리어싱 실금을 없앤다. 선 두께(0.3) 절반이라 선 밑에 숨는다
        var CAP_DEPTH_BIAS = 1e9;       // 뚜껑은 옆면을 모두 그린 뒤에 그린다 (화가 알고리즘 정렬값)

        var depthMm = 20;   // 돌출 깊이
        var mergeFaces = false;    // 단일 음영일 때 보이는 선을 면의 획으로 붙인다 (셰이프 빌더로 합친 구조)
        var setPointType = false;   // 확정 출력만 앵커 종류(모서리/매끄러움)를 넣는다. 미리보기는 생략해 DOM 호출을 줄인다
        var contours = [];      // [{anchors, points, closed, hole, uTotal}] 모델 좌표의 단면 테두리
        var solidClosed = true; // 닫힌 패스만 고르면 뚜껑 있는 기둥, 하나라도 열려 있으면 뚜껑 없는 띠
        var sourceSelection = [];   // 확인하면 지울 원본(선택한 그대로). 그룹은 통째로 지운다
        var mergeCheck = null;

        var api = {
            label: "돌출",
            hint: "패스를 하나 이상 선택. 확인하면 원본은 지운다",
            usesRotY: true,
            liveWireframe: true,
            originX: 0,
            originY: 0,
            fieldCount: 2,
            prepare: prepare,
            addRows: addRows,
            sync: syncRows,
            create: createSolid,
            finish: finish,
            saveFields: saveFields,
            restoreFields: restoreFields
        };

        // 패스 하나 이상(복합 패스·그룹 안쪽도 받는다)
        function prepare(items) {
            sourceSelection = items;
            var sourceItems = [];
            collectPaths(items, sourceItems);
            if (sourceItems.length === 0) return "돌출할 패스를 하나 이상 선택한 뒤 실행해주세요.";
            var prepared = prepareContours(sourceItems);
            if (prepared.error) return prepared.error;
            contours = prepared.contours;
            solidClosed = prepared.closed;
            api.originX = prepared.centerX;
            api.originY = prepared.centerY;
            return null;
        }

        function addRows(page) {
            var solidPanel = page.add("panel", undefined, api.hint);
            solidPanel.orientation = "column";
            solidPanel.alignChildren = "fill";
            addNumberRow(solidPanel, "깊이 (mm)", depthMm, DEPTH_MIN_MM, DEPTH_MAX_MM, 0.5, 1,
                "패스를 앞뒤로 미는 거리. 원본 자리는 가운데", function(value, live) {
                    depthMm = value;
                    updatePreview(live);
                });
            mergeCheck = solidPanel.add("checkbox", undefined, "면에 선 합치기 (단일 음영)");
            mergeCheck.value = mergeFaces;
            mergeCheck.helpTip = "보이는 선을 따로 두지 않고 면마다 획으로 붙인다 (셰이프 빌더로 합친 것과 같은 구조). 숨은선은 그대로 따로 둔다. " +
                "오목한 도형은 앞면이 뒷면을 덮는 순서에 기대므로 선이 어긋날 수 있다";
            mergeCheck.onClick = function() {
                mergeFaces = mergeCheck.value;
                updatePreview();
            };
            return true;
        }

        function syncRows() {
            if (mergeCheck) mergeCheck.enabled = fillMode === FILL_FLAT;
        }

        function finish(group) {
            group.name = "Extrude3D";
            try { group.move(sourceSelection[0], ElementPlacement.PLACEBEFORE); } catch (moveError) {}
            for (var removeIndex = 0; removeIndex < sourceSelection.length; removeIndex++) {
                try { sourceSelection[removeIndex].remove(); } catch (removeError) {}
            }
        }

        function saveFields() {
            return [depthMm, mergeFaces ? 1 : 0];
        }

        function restoreFields(f) {
            depthMm = restoreNumber(f[0], depthMm, DEPTH_MIN_MM, DEPTH_MAX_MM);
            mergeFaces = f[1] === "1";
        }

        // 선택 안의 패스를 모은다. 복합 패스와 그룹은 한 겹씩 벗겨 들어간다
        function collectPaths(items, out) {
            if (!items) return;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.typename === "PathItem") {
                    if (item.pathPoints.length >= 2) out.push(item);
                } else if (item.typename === "CompoundPathItem") {
                    collectPaths(item.pathItems, out);
                } else if (item.typename === "GroupItem") {
                    collectPaths(item.pageItems, out);
                }
            }
        }
        // ---- 테두리 펴기 ----------------------------------------------------------
        // 선택 패스를 모델 좌표(원본 가운데가 원점, Z가 돌출 방향)의 테두리로 바꾼다.
        // contour = {anchors, closed, segCount, points, hole, index}
        //   anchors[i] = {anchor: [x, y], left, right}   원본 베지어 점
        //   points[k]  = {x, y, u, corner}               펴낸 점. u는 베지어 파라미터(구간 번호 + 0~1)
        // 방향은 "재료가 진행 방향 왼쪽"으로 맞춘다. 바깥 테두리는 반시계, 구멍은 시계 방향

        function prepareContours(items) {
            var raw = [];
            var allClosed = true;
            var minX = Infinity;
            var maxX = -Infinity;
            var minY = Infinity;
            var maxY = -Infinity;
            var i;
            var k;
            for (i = 0; i < items.length; i++) {
                var item = items[i];
                var anchors = [];
                for (k = 0; k < item.pathPoints.length; k++) {
                    var pp = item.pathPoints[k];
                    anchors.push({
                        anchor: [pp.anchor[0], pp.anchor[1]],
                        left: [pp.leftDirection[0], pp.leftDirection[1]],
                        right: [pp.rightDirection[0], pp.rightDirection[1]]
                    });
                }
                if (anchors.length < 2) continue;
                var closed = !!item.closed;
                if (!closed) allClosed = false;
                raw.push({anchors: anchors, closed: closed});
            }
            if (raw.length === 0) return {error: "앵커가 2개 이상인 패스를 선택해주세요."};

            for (i = 0; i < raw.length; i++) {
                raw[i].segCount = raw[i].closed ? raw[i].anchors.length : raw[i].anchors.length - 1;
                raw[i].points = flattenContour(raw[i].anchors, raw[i].closed);
                for (k = 0; k < raw[i].points.length; k++) {
                    minX = Math.min(minX, raw[i].points[k].x);
                    maxX = Math.max(maxX, raw[i].points[k].x);
                    minY = Math.min(minY, raw[i].points[k].y);
                    maxY = Math.max(maxY, raw[i].points[k].y);
                }
            }
            var centerX = (minX + maxX) / 2;
            var centerY = (minY + maxY) / 2;
            for (i = 0; i < raw.length; i++) {
                shiftContour(raw[i], -centerX, -centerY);
            }

            // 다른 닫힌 테두리 안에 몇 겹이나 들어 있는지 센다. 홀수면 구멍
            for (i = 0; i < raw.length; i++) {
                var depth = 0;
                if (raw[i].closed) {
                    for (k = 0; k < raw.length; k++) {
                        if (k === i || !raw[k].closed) continue;
                        if (polygonContains(raw[k].points, raw[i].points[0])) depth++;
                    }
                }
                raw[i].hole = (depth % 2) === 1;
                raw[i].index = i;
                // 닫힌 테두리는 재료가 왼쪽에 오도록 방향을 맞춘다 (바깥 반시계, 구멍 시계)
                if (raw[i].closed) {
                    var wantPositive = !raw[i].hole;
                    if ((polygonArea(raw[i].points) >= 0) !== wantPositive) reverseContour(raw[i]);
                }
            }
            return {contours: raw, closed: allClosed, centerX: centerX, centerY: centerY};
        }

        // 베지어 구간마다 CURVE_PIECES개로 편다. corner가 true면 접선이 꺾이는 앵커
        function flattenContour(anchors, closed) {
            var n = anchors.length;
            var segCount = closed ? n : n - 1;
            var points = [];
            var i;
            var k;
            for (i = 0; i < segCount; i++) {
                var p0 = anchors[i];
                var p3 = anchors[(i + 1) % n];
                points.push({x: p0.anchor[0], y: p0.anchor[1], u: i, corner: isCornerAnchor(anchors, i, closed)});
                var straight = samePoint2(p0.right, p0.anchor) && samePoint2(p3.left, p3.anchor);
                if (straight) continue;
                for (k = 1; k < CURVE_PIECES; k++) {
                    var b = bezierPoint(p0.anchor, p0.right, p3.left, p3.anchor, k / CURVE_PIECES);
                    points.push({x: b[0], y: b[1], u: i + k / CURVE_PIECES, corner: false});
                }
            }
            if (!closed) {
                var last = anchors[n - 1];
                points.push({x: last.anchor[0], y: last.anchor[1], u: segCount, corner: true});
            }
            return points;
        }

        // 들어오는 접선과 나가는 접선이 2° 넘게 다르면 모서리. 열린 패스의 양끝도 모서리
        function isCornerAnchor(anchors, i, closed) {
            var n = anchors.length;
            if (!closed && (i === 0 || i === n - 1)) return true;
            var p = anchors[i];
            var prev = anchors[(i - 1 + n) % n];
            var next = anchors[(i + 1) % n];
            var incoming = samePoint2(p.left, p.anchor) ? sub2(p.anchor, prev.right) : sub2(p.anchor, p.left);
            var outgoing = samePoint2(p.right, p.anchor) ? sub2(next.left, p.anchor) : sub2(p.right, p.anchor);
            var lenIn = Math.sqrt(incoming[0] * incoming[0] + incoming[1] * incoming[1]);
            var lenOut = Math.sqrt(outgoing[0] * outgoing[0] + outgoing[1] * outgoing[1]);
            if (lenIn < 1e-9 || lenOut < 1e-9) return true;
            return (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (lenIn * lenOut) < CORNER_COS;
        }

        function shiftContour(contour, dx, dy) {
            var i;
            for (i = 0; i < contour.anchors.length; i++) {
                var a = contour.anchors[i];
                a.anchor = [a.anchor[0] + dx, a.anchor[1] + dy];
                a.left = [a.left[0] + dx, a.left[1] + dy];
                a.right = [a.right[0] + dx, a.right[1] + dy];
            }
            for (i = 0; i < contour.points.length; i++) {
                contour.points[i].x += dx;
                contour.points[i].y += dy;
            }
        }

        // 진행 방향을 뒤집는다. 앵커 순서를 거꾸로 하고 좌우 핸들을 맞바꾼 뒤 다시 편다
        function reverseContour(contour) {
            var flipped = [];
            for (var i = contour.anchors.length - 1; i >= 0; i--) {
                var a = contour.anchors[i];
                flipped.push({anchor: a.anchor, left: a.right, right: a.left});
            }
            contour.anchors = flipped;
            contour.points = flattenContour(contour.anchors, contour.closed);
        }

        // 부호 있는 넓이 (반시계가 +)
        function polygonArea(points) {
            var area = 0;
            for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
                area += points[j].x * points[i].y - points[i].x * points[j].y;
            }
            return area / 2;
        }

        function polygonContains(points, target) {
            var inside = false;
            for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
                var a = points[i];
                var b = points[j];
                if ((a.y > target.y) !== (b.y > target.y) &&
                    target.x < (b.x - a.x) * (target.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
            }
            return inside;
        }

        function bezierPoint(p0, p1, p2, p3, u) {
            var v = 1 - u;
            var a = v * v * v;
            var b = 3 * v * v * u;
            var c = 3 * v * u * u;
            var d = u * u * u;
            return [
                a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]
            ];
        }

        function bezierTangent(p0, p1, p2, p3, u) {
            var v = 1 - u;
            var a = 3 * v * v;
            var b = 6 * v * u;
            var c = 3 * u * u;
            return [
                a * (p1[0] - p0[0]) + b * (p2[0] - p1[0]) + c * (p3[0] - p2[0]),
                a * (p1[1] - p0[1]) + b * (p2[1] - p1[1]) + c * (p3[1] - p2[1])
            ];
        }

        function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }

        function samePoint2(a, b) {
            return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
        }

        // ---- 모델 -----------------------------------------------------------------
        // 모델 좌표: 원본 패스가 놓인 평면이 XY, 돌출은 Z. 앞면 z = +halfDepth, 뒷면 z = -halfDepth.
        // 회전 뒤 뷰 좌표의 Z가 클수록 보는 사람과 가깝다

        function buildModel() {
            var halfDepth = depthMm * MM_TO_PT / 2;
            var radius = halfDepth;
            for (var c = 0; c < contours.length; c++) {
                var pts = contours[c].points;
                for (var i = 0; i < pts.length; i++) {
                    radius = Math.max(radius, Math.sqrt(pts[i].x * pts[i].x + pts[i].y * pts[i].y + halfDepth * halfDepth));
                }
            }
            return {contours: contours, halfDepth: halfDepth, radius: Math.max(radius, 0.01), closed: solidClosed};
        }

        // 베지어 구간 s의 제어점 4개
        function segControls(contour, s) {
            var n = contour.anchors.length;
            var a = contour.anchors[s];
            var b = contour.anchors[(s + 1) % n];
            return [a.anchor, a.right, b.left, b.anchor];
        }

        // 파라미터 u(구간 번호 + 0~1)를 [구간, 지역 t]로 나눈다. 닫힌 테두리는 한 바퀴 접는다
        function splitU(contour, u) {
            var segCount = contour.segCount;
            if (contour.closed) {
                u = u % segCount;
                if (u < 0) u += segCount;
            } else {
                u = Math.max(0, Math.min(segCount, u));
            }
            var s = Math.floor(u);
            var t = u - s;
            if (s >= segCount) {
                s = segCount - 1;
                t = 1;
            }
            return {seg: s, t: t};
        }

        function pointAtU(contour, u) {
            var split = splitU(contour, u);
            var ctrl = segControls(contour, split.seg);
            return bezierPoint(ctrl[0], ctrl[1], ctrl[2], ctrl[3], split.t);
        }

        function tangentAtU(contour, u) {
            var split = splitU(contour, u);
            var ctrl = segControls(contour, split.seg);
            var tangent = bezierTangent(ctrl[0], ctrl[1], ctrl[2], ctrl[3], split.t);
            // 길이 0 접선(핸들이 앵커에 붙은 꼭짓점)은 이웃 파라미터로 대신 잡는다
            if (Math.abs(tangent[0]) < 1e-9 && Math.abs(tangent[1]) < 1e-9) {
                var nudged = split.t < 0.5 ? 1e-4 : -1e-4;
                tangent = bezierTangent(ctrl[0], ctrl[1], ctrl[2], ctrl[3], split.t + nudged);
            }
            return tangent;
        }

        // 옆면의 바깥 법선(재료는 진행 방향 왼쪽이므로 오른쪽이 바깥). Z 성분은 0
        function normalAtU(contour, u) {
            var tangent = tangentAtU(contour, u);
            var n = normalize2([tangent[1], -tangent[0]]);
            return [n[0], n[1], 0];
        }

        // 모서리 앵커에서는 양쪽 법선의 가운데를 쓴다
        function jointNormalAtU(contour, u) {
            var back = normalAtU(contour, u - 1e-4);
            var ahead = normalAtU(contour, u + 1e-4);
            var sum = [back[0] + ahead[0], back[1] + ahead[1]];
            if (Math.abs(sum[0]) < 1e-12 && Math.abs(sum[1]) < 1e-12) return ahead;
            var n = normalize2(sum);
            return [n[0], n[1], 0];
        }

        function modelPoint(contour, u, z) {
            var p = pointAtU(contour, u);
            return [p[0], p[1], z];
        }

        // ---- 시점 -----------------------------------------------------------------

        // ---- 숨은선: 광선 교차 --------------------------------------------------
        // 점에서 눈 쪽으로 광선을 쏴 기둥에 막히면 숨은 점.
        // 옆면은 테두리 곡선을 Z로 민 면이라, 광선을 XY로 눌러 곡선과 만나는 곳을 3차방정식으로 바로 푼다.
        // 닫힌 기둥: 바깥 법선이 광선을 마주보는 면(광선이 속으로 들어가는 곳)만 센다. 뒤쪽 능선처럼 면이
        //   모두 등을 돌린 점은 광선이 나가기만 해서 잡히지 않으므로, 모서리 점은 따로 속으로 들어가는지 본다(probeInside).
        // 열린 띠: 안팎이 없어 아무 면이나 만나면 가림. 대신 점을 살짝 띄워 자기 면에 걸리지 않게 한다.
        // minLambdaFactor: 이 비율(× 모델 반지름)보다 가까운 교차는 무시한다. 실루엣 모선처럼 광선이 제 곡면을
        //   스치는 자리에서 생기는 가짜 교차를 걸러낸다
        function occluded(model, point, normal, minLambdaFactor) {
            var enteringOnly = model.closed;
            var p = enteringOnly ? point : add(point, scale(normal, model.radius * RAY_LIFT));
            var v = viewDirectionAt(p);
            var epsilon = model.radius * (minLambdaFactor || 1e-6);
            var h = model.halfDepth;
            var dx = v[0];
            var dy = v[1];
            var dd = dx * dx + dy * dy;
            var c;
            var s;
            var k;
            if (dd > 1e-18) {
                for (c = 0; c < model.contours.length; c++) {
                    var contour = model.contours[c];
                    for (s = 0; s < contour.segCount; s++) {
                        var ctrl = segControls(contour, s);
                        var roots = rayCurveRoots(ctrl, p, dx, dy);
                        for (k = 0; k < roots.length; k++) {
                            var t = roots[k];
                            var q = bezierPoint(ctrl[0], ctrl[1], ctrl[2], ctrl[3], t);
                            var lambda = ((q[0] - p[0]) * dx + (q[1] - p[1]) * dy) / dd;
                            if (lambda <= epsilon) continue;
                            var z = p[2] + lambda * v[2];
                            if (z < -h || z > h) continue;
                            if (!enteringOnly) return true;
                            var tangent = bezierTangent(ctrl[0], ctrl[1], ctrl[2], ctrl[3], t);
                            // 바깥 법선 (ty, -tx)과 시선이 마주보면 광선이 속으로 들어간다
                            if (tangent[1] * dx - tangent[0] * dy < 0) return true;
                        }
                    }
                }
            }
            if (model.closed && Math.abs(v[2]) > 1e-12) {
                for (var sign = 1; sign >= -1; sign -= 2) {
                    if (sign * v[2] >= 0) continue; // 등을 돌린 뚜껑만 광선이 들어간다
                    var lam = (sign * h - p[2]) / v[2];
                    if (lam <= epsilon) continue;
                    if (insideProfile(model, p[0] + lam * dx, p[1] + lam * dy)) return true;
                }
            }
            return false;
        }

        // 광선을 XY로 누른 직선과 베지어 구간이 만나는 t (0 이상 1 이하)
        function rayCurveRoots(ctrl, p, dx, dy) {
            // f(t) = (B(t) - p) × d = dx·(By - py) - dy·(Bx - px). 제어점마다 값을 내면 번스타인 계수
            var f0 = dx * (ctrl[0][1] - p[1]) - dy * (ctrl[0][0] - p[0]);
            var f1 = dx * (ctrl[1][1] - p[1]) - dy * (ctrl[1][0] - p[0]);
            var f2 = dx * (ctrl[2][1] - p[1]) - dy * (ctrl[2][0] - p[0]);
            var f3 = dx * (ctrl[3][1] - p[1]) - dy * (ctrl[3][0] - p[0]);
            return bernsteinRoots(f0, f1, f2, f3);
        }

        // 번스타인 계수 4개로 적힌 3차식의 [0, 1] 구간 실근
        function bernsteinRoots(f0, f1, f2, f3) {
            // 볼록 껍질 성질: 네 계수의 부호가 같으면 구간 안에 근이 없다. 대부분은 여기서 끝난다
            if ((f0 > 0 && f1 > 0 && f2 > 0 && f3 > 0) || (f0 < 0 && f1 < 0 && f2 < 0 && f3 < 0)) return [];
            var a = -f0 + 3 * f1 - 3 * f2 + f3;
            var b = 3 * f0 - 6 * f1 + 3 * f2;
            var c = -3 * f0 + 3 * f1;
            var d = f0;
            var roots = solveCubic(a, b, c, d);
            var inRange = [];
            for (var i = 0; i < roots.length; i++) {
                if (roots[i] >= -1e-9 && roots[i] <= 1 + 1e-9) inRange.push(clamp(roots[i], 0, 1));
            }
            return inRange;
        }

        // 3차방정식 실근. 최고차항이 없으면 2차·1차로 내려간다
        function solveCubic(a, b, c, d) {
            if (Math.abs(a) < 1e-12) return solveQuadratic(b, c, d);
            var p = b / a;
            var q = c / a;
            var r = d / a;
            // t = x - p/3 로 옮겨 x³ + Ax + B = 0
            var shift = p / 3;
            var A = q - p * p / 3;
            var B = 2 * p * p * p / 27 - p * q / 3 + r;
            var disc = B * B / 4 + A * A * A / 27;
            var roots = [];
            if (disc > 1e-18) {
                var sqrtDisc = Math.sqrt(disc);
                roots.push(cubeRoot(-B / 2 + sqrtDisc) + cubeRoot(-B / 2 - sqrtDisc) - shift);
            } else if (disc > -1e-18) {
                var u = cubeRoot(-B / 2);
                roots.push(2 * u - shift);
                roots.push(-u - shift);
            } else {
                var m = 2 * Math.sqrt(-A / 3);
                var theta = Math.acos(clamp(3 * B / (A * m), -1, 1)) / 3;
                for (var k = 0; k < 3; k++) {
                    roots.push(m * Math.cos(theta - 2 * Math.PI * k / 3) - shift);
                }
            }
            return roots;
        }

        function solveQuadratic(a, b, c) {
            if (Math.abs(a) < 1e-12) {
                if (Math.abs(b) < 1e-12) return [];
                return [-c / b];
            }
            var disc = b * b - 4 * a * c;
            if (disc < 0) return [];
            var root = Math.sqrt(disc);
            return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
        }

        function cubeRoot(value) {
            return value < 0 ? -Math.pow(-value, 1 / 3) : Math.pow(value, 1 / 3);
        }

        // (x, y)가 단면 안인가. 오른쪽으로 광선을 쏴 테두리 곡선을 지나는 횟수가 홀수면 안 (짝수-홀수 규칙)
        function insideProfile(model, x, y) {
            var crossings = 0;
            for (var c = 0; c < model.contours.length; c++) {
                var contour = model.contours[c];
                if (!contour.closed) continue;
                for (var s = 0; s < contour.segCount; s++) {
                    var ctrl = segControls(contour, s);
                    var roots = bernsteinRoots(ctrl[0][1] - y, ctrl[1][1] - y, ctrl[2][1] - y, ctrl[3][1] - y);
                    for (var k = 0; k < roots.length; k++) {
                        var t = roots[k];
                        if (t >= 1 - 1e-9) continue; // 구간 끝은 다음 구간의 시작으로 한 번만 센다
                        if (bezierPoint(ctrl[0], ctrl[1], ctrl[2], ctrl[3], t)[0] > x) crossings++;
                    }
                }
            }
            return (crossings % 2) === 1;
        }

        // 모서리 점이 시선 쪽으로 한 발 내디디면 속인가. 모서리는 1차라 이것으로 충분하다.
        // 경계 위에 걸치지 않도록 바깥 법선 쪽으로 아주 조금 더 띄워 보이는 쪽으로 기울인다
        function probeInside(model, p, normal) {
            var step = model.radius * PROBE_STEP;
            var probe = add(add(p, scale(viewDirectionAt(p), step)), scale(normal, step * 0.01));
            if (probe[2] < -model.halfDepth || probe[2] > model.halfDepth) return false;
            return insideProfile(model, probe[0], probe[1]);
        }

        // ---- 그릴 곡선 ------------------------------------------------------------
        // 1) 뚜껑 테두리: 앞뒤 두 장. 원본 패스를 그대로 옮긴 곡선이라 파라미터도 원본과 같다
        // 2) 모선: 세로 능선. 모서리 앵커마다 하나, 매끄러운 곳은 실루엣(법선이 시선과 직각)마다 하나

        function contourCurve(model, contour, capSign) {
            var z = capSign * model.halfDepth;
            var capNormal = [0, 0, capSign];
            // 샘플 자리의 단면 점과 바깥 방향은 시점·깊이와 무관하다. 테두리에 한 번만 계산해 두고 회전마다 다시 쓴다
            if (!contour.sampleGeometry) contour.sampleGeometry = {front: [], back: []};
            var cache = contour.sampleGeometry[capSign > 0 ? "front" : "back"];
            function geometryAt(u, sampleIndex) {
                var geo = sampleIndex === undefined ? null : cache[sampleIndex];
                if (geo) return geo;
                var xy = pointAtU(contour, u);
                var side = jointNormalAtU(contour, u);
                // 뚜껑과 옆면이 만나는 모서리라 바깥 방향은 두 법선의 가운데
                geo = {x: xy[0], y: xy[1], n: model.closed ? normalize(add(side, capNormal)) : side};
                if (sampleIndex !== undefined) cache[sampleIndex] = geo;
                return geo;
            }
            return {
                kind: "curve",
                contour: contour,
                tMin: 0,
                tMax: contour.segCount,
                closed: contour.closed,
                samples: clamp(contour.segCount * CURVE_SAMPLES_PER_SEG, CURVE_SAMPLES_MIN, CURVE_SAMPLES_MAX),
                pointAt: function(u) { return modelPoint(contour, u, z); },
                // sampleIndex: splitCurve의 고른 샘플 번호. 있으면 캐시를 쓴다
                visibilityAt: function(u, sampleIndex) {
                    var geo = geometryAt(u, sampleIndex);
                    var p = [geo.x, geo.y, z];
                    if (model.closed && probeInside(model, p, geo.n)) return -1;
                    return occluded(model, p, geo.n) ? -1 : 1;
                }
            };
        }

        function rulingCurve(model, ruling) {
            var contour = ruling.contour;
            var h = model.halfDepth;
            var n = ruling.corner ? jointNormalAtU(contour, ruling.u) : normalAtU(contour, ruling.u);
            var base = pointAtU(contour, ruling.u);
            return {
                kind: "line",
                tMin: 0,
                tMax: 1,
                closed: false,
                samples: RULING_SAMPLES,
                pointAt: function(s) { return [base[0], base[1], -h + 2 * h * s]; },
                visibilityAt: function(s) {
                    var p = [base[0], base[1], -h + 2 * h * s];
                    if (ruling.corner) {
                        if (model.closed && probeInside(model, p, n)) return -1;
                        return occluded(model, p, n) ? -1 : 1;
                    }
                    // 실루엣 모선: 오목한 쪽이면 제 곡면에 가린다. 광선은 곡면을 스치므로 가까운 교차를 무시한다
                    if (model.closed && !ruling.convex) return -1;
                    return occluded(model, p, n, 1e-3) ? -1 : 1;
                }
            };
        }

        // 모선 목록. corner면 실제 능선, 아니면 실루엣
        function collectRulings(model) {
            var rulings = [];
            for (var c = 0; c < model.contours.length; c++) {
                var contour = model.contours[c];
                var pts = contour.points;
                var count = pts.length;
                var edgeCount = contour.closed ? count : count - 1;
                var i;
                // 펴낸 조각마다 가운데에서 면 방향을 재 둔다. 이웃 조각끼리 부호가 갈리는 자리가 실루엣
                var facing = [];
                var midUs = [];
                for (i = 0; i < edgeCount; i++) {
                    var a = pts[i];
                    var b = pts[(i + 1) % count];
                    var endU = (i + 1 === count) ? contour.segCount : b.u;
                    var midU = (a.u + endU) / 2;
                    midUs.push(midU);
                    facing.push(facingModel([(a.x + b.x) / 2, (a.y + b.y) / 2, 0], normalAtU(contour, midU)));
                }
                for (i = 0; i < count; i++) {
                    if (pts[i].corner) {
                        rulings.push({contour: contour, u: pts[i].u, corner: true, convex: true});
                        continue;
                    }
                    if (!contour.closed && (i === 0 || i >= edgeCount)) continue;
                    var prevEdge = (i === 0) ? edgeCount - 1 : i - 1;
                    if ((facing[prevEdge] >= 0) === (facing[i] >= 0)) continue;
                    var uA = midUs[prevEdge];
                    var uB = midUs[i];
                    if (uB < uA) uB += contour.segCount; // 마지막 조각과 첫 조각 사이
                    rulings.push({
                        contour: contour,
                        u: refineSilhouette(contour, uA, uB),
                        corner: false,
                        convex: isConvexAt(pts, i, count, contour.closed)
                    });
                }
            }
            return rulings;
        }

        // 두 조각 가운데 사이에서 법선·시선 내적이 0이 되는 u를 이분법으로 좁힌다
        function refineSilhouette(contour, uA, uB) {
            var a = uA;
            var b = uB;
            var valueA = silhouetteValue(contour, a);
            for (var i = 0; i < 30; i++) {
                var m = (a + b) / 2;
                if ((silhouetteValue(contour, m) >= 0) === (valueA >= 0)) a = m;
                else b = m;
            }
            return (a + b) / 2;
        }

        function silhouetteValue(contour, u) {
            var p = pointAtU(contour, u);
            return facingModel([p[0], p[1], 0], normalAtU(contour, u));
        }

        // 재료가 왼쪽이므로 왼쪽으로 꺾이면(외적 +) 그 자리의 곡면은 바깥으로 볼록하다
        function isConvexAt(points, i, count, closed) {
            var prev = points[(i - 1 + count) % count];
            var here = points[i];
            var next = points[(i + 1) % count];
            if (!closed && (i === 0 || i === count - 1)) return true;
            var ax = here.x - prev.x;
            var ay = here.y - prev.y;
            var bx = next.x - here.x;
            var by = next.y - here.y;
            return ax * by - ay * bx >= 0;
        }

        // ---- 그리기 ---------------------------------------------------------------

        // light: 숨은선 판정과 면 없이 모든 선을 실선으로 (슬라이더를 끄는 동안). finalOutput: 확정 출력(앵커 종류까지 넣는다)
        function createSolid(light, finalOutput) {
            var model = buildModel();
            beginView(model);
            setPointType = !!finalOutput;

            var parts = collectParts(model, light);
            var group;
            try {
                group = doc.groupItems.add();
            } catch (groupError) {
                return null;
            }
            try {
                // 쌓는 순서: 면 → 숨은선 → 보이는 선. 숨은선이 면에 가려지지 않는다.
                // 면에 선을 합치면 보이는 선은 면의 획이 대신하므로 선 그룹에는 숨은선만 남는다
                var merged = facesMerged() && !light;
                if (fillMode !== FILL_NONE && !light) {
                    var fillGroup = group.groupItems.add();
                    fillGroup.name = "면";
                    drawFills(fillGroup, collectFills(model));
                }
                var drawHidden = hiddenMode !== HIDDEN_NONE && parts.hidden.length > 0;
                if (!merged || drawHidden) {
                    var lineGroup = group.groupItems.add();
                    lineGroup.name = "선";
                    if (drawHidden) drawParts(lineGroup, parts.hidden, hiddenMode === HIDDEN_DASHED);
                    if (!merged) drawParts(lineGroup, parts.visible, false);
                }
            } catch (drawError) {
                try { group.remove(); } catch (cleanupError) {}
                return null;
            }
            return group;
        }

        // 그릴 곡선을 모아 보임/숨음 구간으로 자른다. light면 자르지 않고 통째로 보이는 것으로 둔다
        function collectParts(model, light) {
            var parts = {visible: [], hidden: []};
            var curves = [];
            var i;
            var s;
            for (i = 0; i < model.contours.length; i++) {
                curves.push(contourCurve(model, model.contours[i], 1));
                curves.push(contourCurve(model, model.contours[i], -1));
            }
            var rulings = collectRulings(model);
            for (i = 0; i < rulings.length; i++) curves.push(rulingCurve(model, rulings[i]));

            for (i = 0; i < curves.length; i++) {
                var curve = curves[i];
                var spans = light
                    ? [{t0: curve.tMin, t1: curve.tMax, visible: true, closed: curve.closed}]
                    : mergeShortSpans(curve, splitCurve(curve));
                for (s = 0; s < spans.length; s++) {
                    (spans[s].visible ? parts.visible : parts.hidden).push({
                        kind: curve.kind, curve: curve, t0: spans[s].t0, t1: spans[s].t1, closed: spans[s].closed
                    });
                }
            }
            return parts;
        }

        // 곡선 위 각 점의 "보이는 정도"를 샘플링해 부호가 바뀌는 곳에서 자른다
        function splitCurve(curve) {
            var sampleCount = curve.samples;
            var tMin = curve.tMin;
            var span = curve.tMax - curve.tMin;
            var values = [];
            var i;
            for (i = 0; i <= sampleCount; i++) {
                values.push(curve.visibilityAt(tMin + span * i / sampleCount, i));
            }
            // 닫힌 곡선은 마지막 샘플을 첫 샘플과 비교한다
            if (curve.closed) values[sampleCount] = values[0];
            var crossings = [];
            for (i = 0; i < sampleCount; i++) {
                if ((values[i] >= 0) !== (values[i + 1] >= 0)) {
                    crossings.push(refineCrossing(curve, tMin + span * i / sampleCount,
                        tMin + span * (i + 1) / sampleCount));
                }
            }
            var spans = [];
            if (crossings.length === 0) {
                spans.push({t0: tMin, t1: curve.tMax, visible: values[0] >= 0, closed: curve.closed});
                return spans;
            }
            var t0;
            var t1;
            if (curve.closed) {
                for (i = 0; i < crossings.length; i++) {
                    t0 = crossings[i];
                    t1 = (i + 1 < crossings.length) ? crossings[i + 1] : crossings[0] + span;
                    spans.push({t0: t0, t1: t1, visible: curve.visibilityAt((t0 + t1) / 2) >= 0, closed: false});
                }
                return spans;
            }
            t0 = tMin;
            for (i = 0; i <= crossings.length; i++) {
                t1 = (i < crossings.length) ? crossings[i] : curve.tMax;
                if (t1 > t0) {
                    spans.push({t0: t0, t1: t1, visible: curve.visibilityAt((t0 + t1) / 2) >= 0, closed: false});
                }
                t0 = t1;
            }
            return spans;
        }

        function refineCrossing(curve, tA, tB) {
            var visibleAtA = curve.visibilityAt(tA) >= 0;
            for (var i = 0; i < CROSSING_STEPS; i++) {
                var tM = (tA + tB) / 2;
                if ((curve.visibilityAt(tM) >= 0) === visibleAtA) tA = tM;
                else tB = tM;
            }
            return (tA + tB) / 2;
        }

        // 화면에서 MIN_SPAN_PT보다 짧은 구간은 판정이 흔들린 것으로 보고 이웃 구간에 흡수시킨다.
        // 가장 짧은 것부터 하나씩 없애면 양옆(같은 보임 상태)이 하나로 합쳐진다. 닫힌 곡선은 끝과 처음도 이웃이다
        function mergeShortSpans(curve, spans) {
            var i;
            for (;;) {
                if (spans.length < 2) return spans;
                var shortest = -1;
                var shortestLength = MIN_SPAN_PT;
                for (i = 0; i < spans.length; i++) {
                    var len = spanScreenLength(curve, spans[i]);
                    if (len < shortestLength) {
                        shortestLength = len;
                        shortest = i;
                    }
                }
                if (shortest < 0) return spans;
                var n = spans.length;
                if (n === 2) {
                    // 하나만 남는다: 살아남은 구간이 전체를 덮는다
                    return [{t0: curve.tMin, t1: curve.tMax, visible: spans[1 - shortest].visible, closed: curve.closed}];
                }
                var prevIndex = (shortest - 1 + n) % n;
                var nextIndex = (shortest + 1) % n;
                var prev = spans[prevIndex];
                var next = spans[nextIndex];
                if (!curve.closed && (shortest === 0 || shortest === n - 1)) {
                    // 열린 곡선의 끝 구간: 하나뿐인 이웃이 끝까지 늘어난다
                    if (shortest === 0) next.t0 = spans[0].t0;
                    else prev.t1 = spans[n - 1].t1;
                    spans.splice(shortest, 1);
                    continue;
                }
                // 이전 구간이 짧은 구간과 다음 구간까지 덮는다. 닫힌 곡선에서 순환이 꼬이지 않게 길이를 더해 붙인다
                var merged = {t0: prev.t0, t1: prev.t1 + (spans[shortest].t1 - spans[shortest].t0) + (next.t1 - next.t0),
                    visible: prev.visible, closed: false};
                var rebuilt = [];
                for (i = 0; i < n; i++) {
                    if (i === shortest || i === nextIndex) continue;
                    rebuilt.push(i === prevIndex ? merged : spans[i]);
                }
                spans = rebuilt;
            }
        }

        function spanScreenLength(curve, span) {
            var samples = 8;
            var total = 0;
            var last = projectModel(curve.pointAt(span.t0));
            for (var i = 1; i <= samples; i++) {
                var next = projectModel(curve.pointAt(span.t0 + (span.t1 - span.t0) * i / samples));
                total += Math.sqrt(distance2(last, next));
                last = next;
            }
            return total;
        }

        function drawParts(group, list, dashed) {
            for (var i = 0; i < list.length; i++) {
                var part = list[i];
                var path = part.kind === "line"
                    ? makeLinePath(group, part.curve, part.t0, part.t1)
                    : makeCurvePath(group, part.curve, part.t0, part.t1, part.closed);
                if (path !== null) applyStroke(path, dashed);
            }
        }

        // ---- 패스 만들기 ----------------------------------------------------------
        // 곡선 파라미터 u는 원본 베지어 구간 번호라, 구간마다 앵커를 하나씩 두고 핸들을 접선 × 구간폭 / 3으로 주면
        // 평행 투영에서는 원본 곡선이 그대로 재현된다 (3차 베지어를 쪼개는 공식과 같다)

        function makeCurvePath(group, curve, t0, t1, closed) {
            var nodes = curveNodes(curve, t0, t1, closed);
            if (nodes.length < 2) return null;
            return makePathFromNodes(group, nodes, closed);
        }

        function makeLinePath(group, curve, t0, t1) {
            var a = projectModel(curve.pointAt(t0));
            var b = projectModel(curve.pointAt(t1));
            if (distance2(a, b) < 1e-12) return null;
            var path = group.pathItems.add();
            path.setEntirePath([a, b]);
            path.closed = false;
            return path;
        }

        // [t0, t1] 구간의 앵커 목록. 구간 경계(정수 u)마다 앵커를 둔다. t1 < t0이면 거꾸로 걷는다
        function curveNodes(curve, t0, t1, closed) {
            var step = (t1 >= t0) ? 1 : -1;
            var breaks = [t0];
            var t = (step > 0) ? Math.floor(t0 + 1e-9) + 1 : Math.ceil(t0 - 1e-9) - 1;
            var guard = 0;
            while (((step > 0 && t < t1 - 1e-9) || (step < 0 && t > t1 + 1e-9)) && guard++ < 4096) {
                breaks.push(t);
                t += step;
            }
            if (!closed) breaks.push(t1);
            var period = t1 - t0;
            var nodes = [];
            var n = breaks.length;
            for (var i = 0; i < n; i++) {
                var u = breaks[i];
                var anchor = projectModel(curve.pointAt(u));
                var duPrev = (i > 0) ? u - breaks[i - 1] : (closed ? u + period - breaks[n - 1] : 0);
                var duNext = (i + 1 < n) ? breaks[i + 1] - u : (closed ? breaks[0] + period - u : 0);
                var left = anchor;
                var right = anchor;
                if (duPrev !== 0 && !straightSegmentAt(curve, u, -1)) {
                    var back = screenTangentAt(curve, u, -1);
                    left = [anchor[0] - back[0] * duPrev / 3, anchor[1] - back[1] * duPrev / 3];
                }
                if (duNext !== 0 && !straightSegmentAt(curve, u, 1)) {
                    var ahead = screenTangentAt(curve, u, 1);
                    right = [anchor[0] + ahead[0] * duNext / 3, anchor[1] + ahead[1] * duNext / 3];
                }
                nodes.push({anchor: anchor, left: left, right: right, corner: isCornerAtU(curve, u)});
            }
            return nodes;
        }

        // u에서 direction 쪽 베지어 구간이 직선(핸들이 앵커에 붙음)인가. 투영해도 직선이라 핸들이 필요 없다
        function straightSegmentAt(curve, u, direction) {
            var contour = curve.contour;
            if (!contour) return false;
            var ctrl = segControls(contour, splitU(contour, u + direction * 1e-6).seg);
            return samePoint2(ctrl[0], ctrl[1]) && samePoint2(ctrl[2], ctrl[3]);
        }

        // 한쪽 방향으로만 본 화면 접선 (모서리 앵커에서는 양쪽 접선이 다르다)
        function screenTangentAt(curve, u, direction) {
            var h = 1e-4;
            var here = projectModel(curve.pointAt(u));
            var there = projectModel(curve.pointAt(u + direction * h));
            return [(there[0] - here[0]) / (direction * h), (there[1] - here[1]) / (direction * h)];
        }

        function isCornerAtU(curve, u) {
            var contour = curve.contour;
            if (!contour) return false;
            var rounded = Math.round(u);
            if (Math.abs(u - rounded) > 1e-6) return false;
            var index = rounded % contour.anchors.length;
            if (index < 0) index += contour.anchors.length;
            for (var i = 0; i < contour.points.length; i++) {
                if (Math.abs(contour.points[i].u - index) < 1e-9) return contour.points[i].corner;
            }
            return true;
        }

        function makePathFromNodes(group, nodes, closed) {
            var anchors = [];
            var i;
            for (i = 0; i < nodes.length; i++) anchors.push(nodes[i].anchor);
            var path = group.pathItems.add();
            path.setEntirePath(anchors);
            path.closed = !!closed;
            var points = path.pathPoints;
            for (i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                // setEntirePath는 핸들이 앵커에 붙은 모서리점을 만든다. 그대로인 핸들은 다시 넣지 않는다 (DOM 호출 절감)
                var leftMoved = !samePoint(node.left, node.anchor);
                var rightMoved = !samePoint(node.right, node.anchor);
                if (!leftMoved && !rightMoved && !setPointType) continue;
                var point = points[i];
                if (leftMoved) point.leftDirection = node.left;
                if (rightMoved) point.rightDirection = node.right;
                if (setPointType) point.pointType = (node.corner || isCornerNode(node)) ? PointType.CORNER : PointType.SMOOTH;
            }
            return path;
        }

        // 곡선 조각과 직선 조각을 이어 붙인 닫힌 패스 (면 채우기용)
        function makeOutlinePath(group, segments) {
            var nodes = [];
            var i;
            var k;
            for (i = 0; i < segments.length; i++) {
                var segment = segments[i];
                var pieces;
                if (segment.kind === "line") {
                    var a = projectModel(segment.a);
                    var b = projectModel(segment.b);
                    pieces = [{anchor: a, left: a, right: a, corner: true}, {anchor: b, left: b, right: b, corner: true}];
                } else {
                    pieces = curveNodes(segment.curve, segment.t0, segment.t1, false);
                }
                for (k = 0; k < pieces.length; k++) {
                    var last = nodes.length > 0 ? nodes[nodes.length - 1] : null;
                    if (last !== null && k === 0 && samePoint(last.anchor, pieces[k].anchor)) {
                        last.right = pieces[k].right;
                    } else {
                        nodes.push(pieces[k]);
                    }
                }
            }
            // 끝점이 시작점과 같으면 합친다
            if (nodes.length > 1 && samePoint(nodes[0].anchor, nodes[nodes.length - 1].anchor)) {
                nodes[0].left = nodes[nodes.length - 1].left;
                nodes.pop();
            }
            if (nodes.length < 3) return null;
            return makePathFromNodes(group, nodes, true);
        }

        // ---- 면 음영 -------------------------------------------------------------
        // 광원은 화면(보는 사람) 기준으로 고정된다. 물체를 돌리면 빛을 받는 면이 바뀐다.
        // 면 = 펴낸 조각마다 하나인 옆면 띠 + 앞뒤 뚜껑. 먼 면부터 그려 가까운 면이 덮게 한다(화가 알고리즘)

        // z 높이의 테두리 곡선 (면 채우기용)
        function zCurve(contour, z) {
            return {
                contour: contour,
                pointAt: function(u) { return modelPoint(contour, u, z); }
            };
        }

        // 채울 면 목록 (먼 것부터). 펴낸 조각마다 옆면 띠를 재고, 이웃한 띠가 같은 쪽·같은 K면 한 장으로 합친다.
        // 단일 음영은 K가 다 같아 보이는 옆면이 통째로 한 장이 되고, 광원 자동은 K가 갈리는 곳마다 나뉘어 그라데이션이 된다
        function collectFills(model) {
            var fills = [];
            var h = model.halfDepth;
            // 면에 선을 합치면 획이 이음새를 덮으므로 겹침 여유를 두지 않는다. 그래야 획이 실제 모서리에 놓인다
            var overlap = facesMerged() ? 0 : FILL_OVERLAP_PT;
            var zPad = model.closed ? Math.min(overlap, 0.2 * h) : 0;
            var c;
            var i;
            for (c = 0; c < model.contours.length; c++) {
                var contour = model.contours[c];
                var pts = contour.points;
                var count = pts.length;
                var edgeCount = contour.closed ? count : count - 1;
                var edges = [];   // 조각마다 보이는 띠 또는 null
                for (i = 0; i < edgeCount; i++) {
                    edges.push(null);
                    var u0 = pts[i].u;
                    var u1 = (i + 1 === count) ? contour.segCount : pts[i + 1].u;
                    var midU = (u0 + u1) / 2;
                    var mid = modelPoint(contour, midU, 0);
                    var normal = normalAtU(contour, midU);
                    var facing = facingModel(mid, normal);
                    var side = 1;
                    if (model.closed) {
                        if (facing <= FACING_EPSILON) continue;
                    } else {
                        if (Math.abs(facing) <= FACING_EPSILON) continue;
                        side = facing > 0 ? 1 : -1;
                    }
                    // 이웃 띠와 조금 겹쳐 안티에일리어싱 실금을 없앤다. 열린 띠의 양끝은 늘리지 않는다
                    var screenLength = Math.sqrt(distance2(projectModel(modelPoint(contour, u0, 0)),
                        projectModel(modelPoint(contour, u1, 0))));
                    var du = screenLength > 1e-6
                        ? Math.min(overlap / screenLength, 0.25) * (u1 - u0)
                        : 0;
                    edges[i] = {
                        u0: u0 - ((!contour.closed && i === 0) ? 0 : du),
                        u1: u1 + ((!contour.closed && i === edgeCount - 1) ? 0 : du),
                        cut: pts[i].corner,   // 모서리 앵커에서 시작하는 조각. 여기서 면이 갈린다
                        side: side,
                        k: kFromShade(shadeOfViewNormal(toView(scale(normal, side))))
                    };
                }
                var runs = mergeFillRuns(contour, edges);
                for (i = 0; i < runs.length; i++) {
                    var runMidU = (runs[i].u0 + runs[i].u1) / 2;
                    fills.push({
                        kind: "band",
                        contour: contour,
                        u0: runs[i].u0,
                        u1: runs[i].u1,
                        zLow: -h - zPad,
                        zHigh: h + zPad,
                        k: runs[i].k,
                        depth: (toView(modelPoint(contour, runMidU, -h))[2] + toView(modelPoint(contour, runMidU, h))[2]) / 2
                    });
                }
            }
            if (model.closed) {
                for (var sign = 1; sign >= -1; sign -= 2) {
                    var capPoint = [0, 0, sign * h];
                    var capNormal = [0, 0, sign];
                    if (facingModel(capPoint, capNormal) <= FACING_EPSILON) continue;
                    // 앞을 보는 뚜껑은 어느 옆면보다도 앞이다(광선은 뚜껑으로 빠져나간다). 늘 마지막에 그린다
                    fills.push({
                        kind: "cap",
                        z: sign * h,
                        k: kFromShade(shadeOfViewNormal(toView(capNormal))),
                        depth: CAP_DEPTH_BIAS + toView(capPoint)[2]
                    });
                }
            }
            fills.sort(function(a, b) { return a.depth - b.depth; });
            return fills;
        }

        // 이웃한 조각 띠를 같은 쪽·같은 K끼리 잇는다. 모서리 앵커(세로 능선이 그어지는 자리)에서는 잇지 않아 상자는 옆면마다 한 장이다.
        // 닫힌 테두리는 마지막 조각과 첫 조각도 이웃이라 그 자리에서 이어지면 한 바퀴를 넘겨 u를 이어 붙인다 (닫힌 테두리의 u는 한 바퀴마다 접힌다)
        function mergeFillRuns(contour, edges) {
            var runs = [];
            var run = null;
            var i;
            for (i = 0; i < edges.length; i++) {
                var edge = edges[i];
                if (edge && run && !edge.cut && run.side === edge.side && run.k === edge.k) {
                    run.u1 = edge.u1;
                    continue;
                }
                run = edge ? {u0: edge.u0, u1: edge.u1, side: edge.side, k: edge.k} : null;
                if (run) runs.push(run);
            }
            if (contour.closed && runs.length > 1 && edges[0] && !edges[0].cut && edges[edges.length - 1]) {
                var head = runs[0];
                var tail = runs[runs.length - 1];
                if (head.side === tail.side && head.k === tail.k) {
                    tail.u1 = head.u1 + contour.segCount;
                    runs.shift();
                }
            }
            return runs;
        }

        function drawFills(group, fills) {
            for (var i = 0; i < fills.length; i++) {
                var fill = fills[i];
                if (fill.kind === "cap") drawCap(group, fill);
                else drawBand(group, fill);
            }
        }

        // 옆면 띠: 뒤쪽 테두리 호 → 모선 → 앞쪽 테두리 호(역방향) → 모선
        function drawBand(group, fill) {
            var contour = fill.contour;
            var low = zCurve(contour, fill.zLow);
            var high = zCurve(contour, fill.zHigh);
            var path = makeOutlinePath(group, [
                {kind: "curve", curve: low, t0: fill.u0, t1: fill.u1},
                {kind: "line", a: modelPoint(contour, fill.u1, fill.zLow), b: modelPoint(contour, fill.u1, fill.zHigh)},
                {kind: "curve", curve: high, t0: fill.u1, t1: fill.u0},
                {kind: "line", a: modelPoint(contour, fill.u0, fill.zHigh), b: modelPoint(contour, fill.u0, fill.zLow)}
            ]);
            finishFace(path, fill.k);
        }

        // 뚜껑: 닫힌 테두리가 여럿이면 복합 패스에 넣고 짝수-홀수 규칙으로 구멍을 낸다
        function drawCap(group, fill) {
            var closedContours = [];
            var i;
            for (i = 0; i < contours.length; i++) {
                if (contours[i].closed) closedContours.push(contours[i]);
            }
            if (closedContours.length === 0) return;
            if (closedContours.length === 1) {
                finishFace(makeCurvePath(group, zCurve(closedContours[0], fill.z), 0, closedContours[0].segCount, true), fill.k);
                return;
            }
            var compound = null;
            try { compound = group.compoundPathItems.add(); } catch (compoundError) { compound = null; }
            var target = compound === null ? group : compound;
            for (i = 0; i < closedContours.length; i++) {
                var path = makeCurvePath(target, zCurve(closedContours[i], fill.z), 0, closedContours[i].segCount, true);
                finishFace(path, fill.k);
                if (path !== null) {
                    try { path.evenodd = true; } catch (evenOddError) {}
                }
            }
        }

        // 면에 선 합치기가 실제로 켜지는 조건: 단일 음영일 때만. 광원 자동은 띠마다 획이 생겨 그라데이션 사이에 줄이 그어진다
        function facesMerged() {
            return mergeFaces && fillMode === FILL_FLAT;
        }

        // 면 마무리: 채우고, 면에 선을 합치는 중이면 획도 붙인다
        function finishFace(path, k) {
            if (path === null) return;
            path.filled = true;
            try { path.fillColor = makeKColor(k); } catch (fillError) {}
            if (facesMerged()) applyStrokeStyle(path, false);
            else path.stroked = false;
        }

        // ---- 벡터·숫자 도우미 ---------------------------------------------------

        function normalize2(v) {
            var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            if (len < 1e-12) return [0, 1];
            return [v[0] / len, v[1] / len];
        }

        return api;
    }

    // ==== 회전체 엔진 ========================================================

    function makeRevolveEngine() {
        var CURVE_PIECES = 12;          // 베지어 한 구간을 펴는 조각 수
        var CORNER_COS = Math.cos(2 * Math.PI / 180); // 접선이 2° 넘게 꺾이면 모서리
        var CURVE_SAMPLES = 144;        // 곡선 가시성 판정 샘플 수 (한 단계당 최소 4개)
        var SMALL_ARC = 0.5;            // 이보다 짧은 테두리 호는 실루엣 이음새로 보고 가운데 한 점만 찍는다
        var AXIS_EPSILON = 0.01;        // 축에서 이만큼(pt) 안이면 축 위로 본다
        var RAY_LIFT = 1e-4;            // 열린 껍질에서 광선을 쏘기 전에 점을 바깥 법선 쪽으로 띄우는 비율 (× 모델 반지름)
        var PROBE_STEP = 1e-4;          // 모서리 점이 속으로 들어가는지 볼 때 시선 쪽으로 내딛는 비율 (× 모델 반지름)
        var MIN_SPAN_PT = 1.5;          // 이보다 짧은 보임/숨음 구간은 이웃에 합친다 (실루엣 첨점 근처의 떨림 제거)
        var FILL_OVERLAP_PT = 0.15;     // 이웃 띠끼리 이만큼 겹쳐 채워 안티에일리어싱 실금을 없앤다. 선 두께(0.3) 절반 아래라 선 밑에 숨는다
        var LOCAL_FACETS = 3;           // 실루엣 점의 광선이 매끄럽게 이어진 이웃 조각 몇 개까지는 자기 곡면으로 보고 무시하는가

        var axisAngle = Math.PI / 2;  // 문서에서 축이 향한 각도. 시점 0이면 그린 그대로 보이게 화면 회전에 합친다
        var profilePoints = [];       // [{r, y, corner}] 축 기준 단면 (r = 축에서 거리, y = 축 방향)
        var profileClosed = true;
        var profileItem = null;
        var axisItem = null;
        var axisA = null;
        var axisB = null;
        var axisU = null;
        var axisW = null;

        var api = {
            label: "회전체",
            hint: "단면 패스 + 축 직선(앵커 2개) 선택. 확인하면 둘 다 지운다",
            usesRotY: false,
            liveWireframe: false,
            originX: 0,
            originY: 0,
            fieldCount: 0,
            prepare: prepare,
            addRows: function() { return false; },
            sync: function() {},
            create: createSolid,
            finish: finish,
            saveFields: function() { return []; },
            restoreFields: function() {}
        };

        // 단면 패스 하나와 축(앵커 2개짜리 열린 직선) 하나
        function prepare(items) {
            if (items.length !== 2 || items[0].typename !== "PathItem" || items[1].typename !== "PathItem") {
                return "단면 패스와 축이 될 직선, 두 개를 선택한 뒤 실행해주세요.";
            }
            var firstIsAxis = isAxisPath(items[0]);
            var secondIsAxis = isAxisPath(items[1]);
            if (firstIsAxis === secondIsAxis) {
                return firstIsAxis
                    ? "둘 다 직선입니다. 축은 앵커 2개짜리 열린 직선 하나여야 합니다."
                    : "축을 찾지 못했습니다. 앵커 2개짜리 열린 직선을 축으로 함께 선택해주세요.";
            }
            axisItem = firstIsAxis ? items[0] : items[1];
            profileItem = firstIsAxis ? items[1] : items[0];

            axisA = axisItem.pathPoints[0].anchor;
            axisB = axisItem.pathPoints[1].anchor;
            axisU = normalize2([axisB[0] - axisA[0], axisB[1] - axisA[1]]);
            // 어느 쪽으로 그렸든 축의 + 방향은 화면 위쪽(가로면 오른쪽). 그래야 "위아래 기울기 +"가 늘 위에서 내려다보는 시점이 된다
            if (axisU[1] < 0 || (axisU[1] === 0 && axisU[0] < 0)) {
                var swap = axisA;
                axisA = axisB;
                axisB = swap;
                axisU = [-axisU[0], -axisU[1]];
            }
            axisW = [-axisU[1], axisU[0]];
            axisAngle = Math.atan2(axisU[1], axisU[0]);

            var anchors = [];
            for (var pointIndex = 0; pointIndex < profileItem.pathPoints.length; pointIndex++) {
                var pp = profileItem.pathPoints[pointIndex];
                anchors.push({anchor: toAxisSpace(pp.anchor), left: toAxisSpace(pp.leftDirection), right: toAxisSpace(pp.rightDirection)});
            }
            profileClosed = profileItem.closed;
            var flattened = flattenProfile(anchors, profileClosed);
            if (flattened.error) return flattened.error;
            profilePoints = flattened.points;
            api.originX = axisA[0] + axisU[0] * flattened.yMid;
            api.originY = axisA[1] + axisU[1] * flattened.yMid;
            return null;
        }

        function finish(group) {
            group.name = "Revolve3D";
            try { group.move(profileItem, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
            try { profileItem.remove(); } catch (removeProfileError) {}
            try { axisItem.remove(); } catch (removeAxisError) {}
        }

        function isAxisPath(item) {
            return !item.closed && item.pathPoints.length === 2;
        }

        // 문서 좌표 → 축 좌표 [r, y]. r은 축의 왼쪽이 +, y는 축 A→B 방향
        function toAxisSpace(p) {
            var dx = p[0] - axisA[0];
            var dy = p[1] - axisA[1];
            return [dx * axisW[0] + dy * axisW[1], dx * axisU[0] + dy * axisU[1]];
        }

        function normalize2(v) {
            var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            if (len < 1e-12) return [0, 1];
            return [v[0] / len, v[1] / len];
        }
        // ---- 단면 펴기 ------------------------------------------------------------
        // anchors[i] = {anchor: [r, y], left: [r, y], right: [r, y]} 축 좌표의 패스 점.
        // 결과 점의 corner가 true면 접선이 꺾이는 곳(테두리 원을 그린다). 곡선 구간은 CURVE_PIECES개 직선으로 편다

        function flattenProfile(anchors, closed) {
            var n = anchors.length;
            if (n < 2) return {error: "단면 패스에 앵커가 2개 이상 있어야 합니다."};
            var points = [];
            var segmentCount = closed ? n : n - 1;
            var i;
            var k;
            for (i = 0; i < segmentCount; i++) {
                var p0 = anchors[i];
                var p3 = anchors[(i + 1) % n];
                points.push({r: p0.anchor[0], y: p0.anchor[1], corner: isCornerAnchor(anchors, i, closed)});
                if (samePoint2(p0.right, p0.anchor) && samePoint2(p3.left, p3.anchor)) continue;
                for (k = 1; k < CURVE_PIECES; k++) {
                    var b = bezierPoint(p0.anchor, p0.right, p3.left, p3.anchor, k / CURVE_PIECES);
                    points.push({r: b[0], y: b[1], corner: false});
                }
            }
            if (!closed) {
                var last = anchors[n - 1];
                points.push({r: last.anchor[0], y: last.anchor[1], corner: true});
            }

            // 단면은 축의 한쪽에만 있어야 한다. 왼쪽이면 r을 뒤집어 +로 맞춘다
            var maxR = -Infinity;
            var minR = Infinity;
            var maxY = -Infinity;
            var minY = Infinity;
            for (i = 0; i < points.length; i++) {
                maxR = Math.max(maxR, points[i].r);
                minR = Math.min(minR, points[i].r);
                maxY = Math.max(maxY, points[i].y);
                minY = Math.min(minY, points[i].y);
            }
            if (maxR > AXIS_EPSILON && minR < -AXIS_EPSILON) {
                return {error: "단면이 축을 가로지릅니다. 축이 단면의 바깥이나 가장자리에 닿게 옮겨주세요."};
            }
            var flip = maxR <= AXIS_EPSILON;
            var yMid = (minY + maxY) / 2;
            for (i = 0; i < points.length; i++) {
                var r = flip ? -points[i].r : points[i].r;
                points[i].r = r < AXIS_EPSILON ? 0 : r;
                points[i].y -= yMid;
            }
            return {points: points, yMid: yMid};
        }

        // 들어오는 접선과 나가는 접선이 2° 넘게 다르면 모서리. 열린 패스의 양끝도 모서리
        function isCornerAnchor(anchors, i, closed) {
            var n = anchors.length;
            if (!closed && (i === 0 || i === n - 1)) return true;
            var p = anchors[i];
            var prev = anchors[(i - 1 + n) % n];
            var next = anchors[(i + 1) % n];
            var incoming = samePoint2(p.left, p.anchor) ? sub2(p.anchor, prev.right) : sub2(p.anchor, p.left);
            var outgoing = samePoint2(p.right, p.anchor) ? sub2(next.left, p.anchor) : sub2(p.right, p.anchor);
            var lenIn = Math.sqrt(incoming[0] * incoming[0] + incoming[1] * incoming[1]);
            var lenOut = Math.sqrt(outgoing[0] * outgoing[0] + outgoing[1] * outgoing[1]);
            if (lenIn < 1e-9 || lenOut < 1e-9) return true;
            return (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (lenIn * lenOut) < CORNER_COS;
        }

        function bezierPoint(p0, p1, p2, p3, u) {
            var v = 1 - u;
            var a = v * v * v;
            var b = 3 * v * v * u;
            var c = 3 * v * u * u;
            var d = u * u * u;
            return [
                a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
                a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]
            ];
        }

        function sub2(a, b) { return [a[0] - b[0], a[1] - b[1]]; }

        function samePoint2(a, b) {
            return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
        }

        // ---- 그리기 -----------------------------------------------------------
        // 모델 좌표: 원점은 단면의 축 방향 중심, Y가 축, X·Z가 반지름 방향. 회전 뒤 Z가 클수록 보는 사람과 가깝다.

        function createSolid() {
            var model = buildModel();
            beginView(model);

            var parts = collectParts(model);
            var group;
            try {
                group = doc.groupItems.add();
            } catch (groupError) {
                return null;
            }
            try {
                // 쌓는 순서: 면 → 숨은선 → 보이는 선. 숨은선이 면에 가려지지 않는다
                if (fillMode !== FILL_NONE) {
                    var fillGroup = group.groupItems.add();
                    fillGroup.name = "면";
                    drawFills(fillGroup, collectFills(model));
                }
                var lineGroup = group.groupItems.add();
                lineGroup.name = "선";
                if (hiddenMode !== HIDDEN_NONE) drawParts(lineGroup, parts.hidden, hiddenMode === HIDDEN_DASHED);
                drawParts(lineGroup, parts.visible, false);
            } catch (drawError) {
                try { group.remove(); } catch (cleanupError) {}
                return null;
            }
            return group;
        }

        // 회전 행렬과 시점 거리를 한 번만 계산해 둔다
        function beginView(model) {
            var rx = rotX * Math.PI / 180;
            var rz = rotZ * Math.PI / 180;
            var ra = axisAngle - Math.PI / 2;
            var matX = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]];
            var matZ = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
            var matAxis = [[Math.cos(ra), -Math.sin(ra), 0], [Math.sin(ra), Math.cos(ra), 0], [0, 0, 1]];
            // 위아래 기울기(X) → 화면 회전(Z) → 문서에 그린 축 방향(Z). 회전체라 축 둘레 회전은 뜻이 없다
            viewMatrix = multiplyMatrix(matAxis, multiplyMatrix(matZ, matX));
            // 눈이 도형 안으로 들어가지 않도록 최소 거리를 둔다
            eyeZ = Math.max(perspectiveMm * MM_TO_PT, model.radius * 1.5 + 1);
        }

        // ---- 모델 만들기 --------------------------------------------------------
        // 결과: {segments, rims, radius}
        //   segments[i] = {r0, y0, r1, y1, smoothStart} 단면 한 조각을 돌린 원뿔대. smoothStart면 앞 조각과 매끄럽게 이어진다
        //   rims[i]     = {r, y} 모서리에 생기는 테두리 원

        function buildModel() {
            var pts = profilePoints;
            var n = pts.length;
            var count = profileClosed ? n : n - 1;
            var segments = [];
            var rims = [];
            var radius = 0;
            var i;
            for (i = 0; i < count; i++) {
                var a = pts[i];
                var b = pts[(i + 1) % n];
                if (Math.abs(a.r - b.r) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) continue;
                // 축 위에 놓인 조각은 돌려도 선이라 면이 없다 (반원을 축으로 닫아 만든 구 등)
                if (a.r <= 0 && b.r <= 0) continue;
                segments.push({r0: a.r, y0: a.y, r1: b.r, y1: b.y, smoothStart: !a.corner});
            }
            // 닫힌 단면은 부호 있는 넓이로 바깥쪽을 정한다 (반시계면 진행 방향의 오른쪽이 바깥)
            var area = 0;
            for (i = 0; i < n; i++) {
                var p = pts[i];
                var q = pts[(i + 1) % n];
                area += p.r * q.y - q.r * p.y;
            }
            var model = {segments: segments, rims: rims, radius: 0.01, outwardSign: area >= 0 ? 1 : -1};
            assignCurvature(segments, model.outwardSign);
            assignRuns(segments);
            for (i = 0; i < n; i++) {
                radius = Math.max(radius, Math.sqrt(pts[i].r * pts[i].r + pts[i].y * pts[i].y));
                if (!pts[i].corner || pts[i].r <= 0) continue;
                var duplicate = false;
                for (var k = 0; k < rims.length && !duplicate; k++) {
                    duplicate = Math.abs(rims[k].r - pts[i].r) < 1e-9 && Math.abs(rims[k].y - pts[i].y) < 1e-9;
                }
                if (!duplicate) rims.push({r: pts[i].r, y: pts[i].y, segs: segmentsAt(segments, pts[i].r, pts[i].y)});
            }
            model.radius = Math.max(radius, 0.01);
            return model;
        }

        // 매끄럽게 이어진 이웃 조각 사이의 꺾임각으로 조각마다 단면 곡률을 매긴다 (바깥 법선 기준 볼록이 +).
        // 편 조각은 직선이라 곡률이 0인데, 실루엣이 국소적으로 보이는지는 원래 곡면의 곡률로 판단해야 한다
        function assignCurvature(segments, outwardSign) {
            var n = segments.length;
            var i;
            for (i = 0; i < n; i++) {
                segments[i].curvature = 0;
                segments[i].curvatureCount = 0;
            }
            for (i = 0; i < n; i++) {
                var j = (i + 1) % n;
                if (j === 0 && !profileClosed) break;
                if (!segments[j].smoothStart || !sharesRing(segments[i], segments[j])) continue;
                var a = segments[i];
                var b = segments[j];
                var ar = a.r1 - a.r0;
                var ay = a.y1 - a.y0;
                var br = b.r1 - b.r0;
                var by = b.y1 - b.y0;
                var turn = Math.atan2(ar * by - ay * br, ar * br + ay * by);
                var lengthA = Math.sqrt(ar * ar + ay * ay);
                var lengthB = Math.sqrt(br * br + by * by);
                var k = outwardSign * turn / ((lengthA + lengthB) / 2);
                a.curvature += k;
                a.curvatureCount++;
                b.curvature += k;
                b.curvatureCount++;
            }
            for (i = 0; i < n; i++) {
                if (segments[i].curvatureCount > 0) segments[i].curvature /= segments[i].curvatureCount;
            }
        }

        // 모서리 없이 매끄럽게 이어진 조각 묶음(run)과 그 안의 순번. 실루엣 점 근처의 자기 곡면 조각을 가려낼 때 쓴다
        function assignRuns(segments) {
            var n = segments.length;
            var run = -1;
            var position = 0;
            var i;
            for (i = 0; i < n; i++) {
                var continues = i > 0 && segments[i].smoothStart && sharesRing(segments[i - 1], segments[i]);
                if (!continues) {
                    run++;
                    position = 0;
                }
                segments[i].run = run;
                segments[i].runPosition = position++;
                segments[i].index = i;
            }
            // 닫힌 단면에서 마지막 조각과 첫 조각이 매끄럽게 이어지면 두 run은 같은 run. 첫 run을 마지막 run 뒤에 붙인다
            var wraps = n > 1 && profileClosed && segments[0].smoothStart && sharesRing(segments[n - 1], segments[0]);
            var runLength = [];
            for (i = 0; i < n; i++) runLength[segments[i].run] = (runLength[segments[i].run] || 0) + 1;
            if (wraps && run > 0) {
                var lastRun = run;
                var lastLength = runLength[lastRun];
                for (i = 0; i < n && segments[i].run === 0; i++) {
                    segments[i].run = lastRun;
                    segments[i].runPosition += lastLength;
                }
                runLength[lastRun] += runLength[0];
                runLength[0] = 0;
            }
            for (i = 0; i < n; i++) {
                segments[i].runLength = runLength[segments[i].run];
                segments[i].runCyclic = wraps && run === 0;
            }
        }

        // 두 조각이 같은 매끄러운 묶음에서 LOCAL_FACETS 이내로 가까운가
        function nearbyFacets(a, b) {
            if (a.run !== b.run) return false;
            var gap = Math.abs(a.runPosition - b.runPosition);
            if (a.runCyclic) gap = Math.min(gap, a.runLength - gap);
            return gap <= LOCAL_FACETS;
        }

        // 점 (r, y)를 끝으로 가지는 조각들
        function segmentsAt(segments, r, y) {
            var found = [];
            for (var i = 0; i < segments.length; i++) {
                var seg = segments[i];
                if ((Math.abs(seg.r0 - r) < 1e-9 && Math.abs(seg.y0 - y) < 1e-9) ||
                    (Math.abs(seg.r1 - r) < 1e-9 && Math.abs(seg.y1 - y) < 1e-9)) found.push(seg);
            }
            return found;
        }

        function ringPoint(r, y, t) {
            return [r * Math.cos(t), y, r * Math.sin(t)];
        }

        // 조각 옆면 위의 점 P(t, s)
        function segmentPoint(seg, t, s) {
            return ringPoint(seg.r0 + (seg.r1 - seg.r0) * s, seg.y0 + (seg.y1 - seg.y0) * s, t);
        }

        // 조각 옆면 법선 (∂P/∂t × ∂P/∂s 방향, 크기는 무시). 단면 진행 방향에 따라 안팎이 정해지지만 부호만 일관되면 된다
        function segmentNormal(seg, t) {
            var dy = seg.y1 - seg.y0;
            var dr = seg.r1 - seg.r0;
            return [dy * Math.cos(t), -dr, dy * Math.sin(t)];
        }

        // 바깥을 향한 단위 법선. 닫힌 단면은 넓이 부호로 정한다.
        // 열린 껍질은 양쪽이 다 바깥이라 축에서 먼 쪽(테두리 원이 볼록한 쪽)을, 원판이면 눈 쪽을 바깥으로 본다
        function outwardNormal(model, seg, t, p) {
            var n = normalize(segmentNormal(seg, t));
            if (profileClosed) return scale(n, model.outwardSign);
            var radial = n[0] * Math.cos(t) + n[2] * Math.sin(t);
            if (Math.abs(radial) > 1e-9) return radial > 0 ? n : scale(n, -1);
            return facingModel(p, n) >= 0 ? n : scale(n, -1);
        }

        // 실루엣 점이 국소적으로 숨는가: 시선 방향의 법곡률이 음수면 곡면이 시선 쪽으로 휘어 올라와 점을 가린다.
        // 회전면의 주곡률은 단면 곡률 κm(조각에 매긴 값)과 위도원 곡률 κp = n_r / r. κn = κm·cos²θ + κp·sin²θ
        function locallyHidden(model, segs, t, p, n) {
            var v = viewDirectionAt(p);
            var tangent = sub(v, scale(n, dot(v, n)));
            if (length(tangent) < 1e-9) return false;
            tangent = normalize(tangent);
            var meridian = [0, 0, 0];
            var km = 0;
            for (var i = 0; i < segs.length; i++) {
                var dr = segs[i].r1 - segs[i].r0;
                var dy = segs[i].y1 - segs[i].y0;
                meridian = add(meridian, normalize([dr * Math.cos(t), dy, dr * Math.sin(t)]));
                km += segs[i].curvature;
            }
            meridian = normalize(meridian);
            km /= segs.length;
            var radius = Math.sqrt(p[0] * p[0] + p[2] * p[2]);
            var kp = radius < 1e-9 ? 0 : (n[0] * Math.cos(t) + n[2] * Math.sin(t)) / radius;
            var parallel = [-Math.sin(t), 0, Math.cos(t)];
            var cm = dot(tangent, meridian);
            var cp = dot(tangent, parallel);
            return km * cm * cm + kp * cp * cp < -1e-12;
        }

        // 여러 조각이 만나는 점(테두리·이음 호)의 바깥 방향: 각 조각 법선의 합
        function jointNormal(model, segs, t, p) {
            var sum = [0, 0, 0];
            for (var i = 0; i < segs.length; i++) sum = add(sum, outwardNormal(model, segs[i], t, p));
            if (length(sum) < 1e-9 && segs.length > 0) return outwardNormal(model, segs[0], t, p);
            return normalize(sum);
        }

        // ---- 숨은선: 광선 교차 --------------------------------------------------
        // 점에서 눈 쪽으로 광선을 쏴 회전면 조각(원뿔대)에 막히면 숨은 점.
        // 광선 위 점의 축 거리²는 λ의 2차식, 원뿔대 반지름은 λ의 1차식이라 교차는 2차방정식 하나로 풀린다.
        // 닫힌 단면: 바깥 법선이 광선을 마주보는 면(광선이 속으로 들어가는 곳)만 센다. 실루엣 점은 접평면이 곡면을
        //   가르므로 편 조각 기준으로는 광선이 처음부터 속에 있다가 나오는 수가 있는데, 그건 가림이 아니다.
        //   점 자체가 속으로 들어가는지는 따로 판단한다 (locallyHidden, probeInside). 그래서 점이 놓인 조각과
        //   매끄럽게 이어진 이웃 조각(localSegs 근처)은 자기 곡면으로 보고 건너뛴다 — 편 조각의 요철이 만든 가짜 진입.
        // 열린 껍질: 안팎이 없어 아무 면이나 만나면 가림. 대신 점을 살짝 띄워 자기 면의 요철에 걸리지 않게 한다
        function occluded(model, point, normal, localSegs) {
            var enteringOnly = profileClosed;
            var p = enteringOnly ? point : add(point, scale(normal, model.radius * RAY_LIFT));
            var v = viewDirectionAt(p);
            var epsilon = model.radius * 1e-6;
            var px = p[0];
            var py = p[1];
            var pz = p[2];
            var vx = v[0];
            var vy = v[1];
            var vz = v[2];
            for (var i = 0; i < model.segments.length; i++) {
                var seg = model.segments[i];
                if (enteringOnly && localSegs && isLocalFacet(seg, localSegs)) continue;
                var dy = seg.y1 - seg.y0;
                var dr = seg.r1 - seg.r0;
                if (Math.abs(dy) < 1e-9) {
                    // 납작한 고리(원판): 그 높이에 닿는 λ 하나
                    if (Math.abs(vy) < 1e-12) continue;
                    var lambda = (seg.y0 - py) / vy;
                    if (lambda <= epsilon) continue;
                    var hx = px + lambda * vx;
                    var hz = pz + lambda * vz;
                    var hr = Math.sqrt(hx * hx + hz * hz);
                    if (hr < Math.min(seg.r0, seg.r1) || hr > Math.max(seg.r0, seg.r1)) continue;
                    if (!enteringOnly || entersAt(model, seg, [hx, seg.y0, hz], v)) return true;
                    continue;
                }
                // r(λ) = a + bλ, s(λ) = (py + λvy - y0) / dy
                var a = seg.r0 + dr * (py - seg.y0) / dy;
                var b = dr * vy / dy;
                var qa = vx * vx + vz * vz - b * b;
                var qb = 2 * (px * vx + pz * vz - a * b);
                var qc = px * px + pz * pz - a * a;
                var roots = solveQuadratic(qa, qb, qc);
                for (var k = 0; k < roots.length; k++) {
                    var lam = roots[k];
                    if (lam <= epsilon) continue;
                    var s = (py + lam * vy - seg.y0) / dy;
                    if (s < 0 || s > 1) continue;
                    if (a + b * lam < 0) continue; // 반지름이 음수인 거울상 해
                    if (!enteringOnly || entersAt(model, seg, [px + lam * vx, py + lam * vy, pz + lam * vz], v)) return true;
                }
            }
            return false;
        }

        function isLocalFacet(seg, localSegs) {
            for (var i = 0; i < localSegs.length; i++) {
                if (nearbyFacets(seg, localSegs[i])) return true;
            }
            return false;
        }

        function entersAt(model, seg, hit, v) {
            var t = Math.atan2(hit[2], hit[0]);
            return dot(outwardNormal(model, seg, t, hit), v) < 0;
        }

        // 모서리 점(테두리 원)이 시선 쪽으로 한 발 내디디면 속인가. 모서리는 1차라 이것으로 충분하다.
        // 정면처럼 원판을 옆에서 보는 경우 한 발이 경계 위에 놓이므로, 바깥 법선 쪽으로 아주 조금 더 띄워 보이는 쪽으로 기울인다
        function probeInside(model, p, normal) {
            var step = model.radius * PROBE_STEP;
            var probe = add(add(p, scale(viewDirectionAt(p), step)), scale(normal, step * 0.01));
            return insideProfile(Math.sqrt(probe[0] * probe[0] + probe[2] * probe[2]), probe[1]);
        }

        // (r, y)가 닫힌 단면 다각형 안인가 (짝수-홀수)
        function insideProfile(r, y) {
            var pts = profilePoints;
            var inside = false;
            for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                var a = pts[i];
                var b = pts[j];
                if ((a.y > y) !== (b.y > y) && r < (b.r - a.r) * (y - a.y) / (b.y - a.y) + a.r) inside = !inside;
            }
            return inside;
        }

        function solveQuadratic(a, b, c) {
            if (Math.abs(a) < 1e-12) {
                if (Math.abs(b) < 1e-12) return [];
                return [-c / b];
            }
            var disc = b * b - 4 * a * c;
            if (disc < 0) return [];
            var root = Math.sqrt(disc);
            return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
        }

        // ---- 실루엣 ---------------------------------------------------------------
        // 편 단면은 다면체와 같다. 실루엣 = 조각 옆면에서 법선⊥시선인 모선 + 매끄러운 이음 테두리 중 양쪽 조각의 앞뒤가 갈리는 호.
        // 모선 끝과 호 끝은 같은 t를 공유하므로 노드로 이어 붙여 한 줄로 걷는다

        // 조각 옆면의 실루엣 모선 t (0개 또는 2개). dy·ρ·cos(t-φ) = dr·Vy 를 푼다. 원근이면 시선이 점마다 달라 몇 번 되풀이한다
        function silhouetteRoots(seg) {
            var dy = seg.y1 - seg.y0;
            var dr = seg.r1 - seg.r0;
            if (Math.abs(dy) < 1e-9) return [];
            var roots = [];
            for (var sign = 1; sign >= -1; sign -= 2) {
                var t = 0;
                var found = false;
                var iterations = perspectiveOn ? 8 : 1;
                for (var k = 0; k < iterations; k++) {
                    var v = viewDirectionAt(segmentPoint(seg, t, 0.5));
                    var rho = Math.sqrt(v[0] * v[0] + v[2] * v[2]);
                    if (rho < 1e-9) { found = false; break; }
                    var c = dr * v[1] / (dy * rho);
                    if (c > 1 || c < -1) { found = false; break; }
                    t = Math.atan2(v[2], v[0]) + sign * Math.acos(c);
                    found = true;
                }
                if (found) roots.push(normalizeAngle(t));
            }
            return roots;
        }

        function normalizeAngle(t) {
            var twoPi = 2 * Math.PI;
            t = t % twoPi;
            if (t < 0) t += twoPi;
            return t;
        }

        // 결과: 사슬 목록. 사슬 = {steps: [...], closed}
        //   step = {kind: "line", seg, t, s0, s1}  조각 위 모선 (s0→s1)
        //          {kind: "arc", r, y, t0, t1}      테두리 위 호 (t0→t1)
        function findSilhouettes(model) {
            var segs = model.segments;
            var n = segs.length;
            var nodes = [];   // {ring, t, edges: []}
            var edges = [];   // {kind, nodes: [a, b], ...}
            var ringNodes = []; // ringNodes[j] = 링 j 위 노드 목록
            var i;
            var k;
            for (i = 0; i <= n; i++) ringNodes.push([]);

            function addNode(ring, t) {
                var node = {ring: ring, t: t, edges: []};
                nodes.push(node);
                ringNodes[ring].push(node);
                return node;
            }
            function addEdge(edge) {
                edges.push(edge);
                edge.nodes[0].edges.push(edge);
                edge.nodes[1].edges.push(edge);
            }

            // 링 j = 조각 j의 시작(= 조각 j-1의 끝). 닫힌 단면이면 링 n = 링 0
            for (i = 0; i < n; i++) {
                var roots = silhouetteRoots(segs[i]);
                for (k = 0; k < roots.length; k++) {
                    var endRing = (i + 1 === n && profileClosed) ? 0 : i + 1;
                    var start = addNode(i, roots[k]);
                    var end = addNode(endRing, roots[k]);
                    addEdge({kind: "line", seg: segs[i], t: roots[k], nodes: [start, end]});
                }
            }

            // 매끄러운 링마다 앞뒤 조각의 앞·뒤 방향이 갈리는 호를 잇는다
            for (i = 0; i < n; i++) {
                var prevIndex = i === 0 ? (profileClosed ? n - 1 : -1) : i - 1;
                if (prevIndex < 0 || !segs[i].smoothStart) continue;
                var ring = i;
                var r = segs[i].r0;
                var y = segs[i].y0;
                if (r <= 0) continue;
                if (!sharesRing(segs[prevIndex], segs[i])) continue; // 길이 0 조각을 건너뛰어 링이 어긋나면 잇지 않는다
                var list = ringNodes[ring].slice(0);
                list.sort(function(p, q) { return p.t - q.t; });
                if (list.length === 0) {
                    if (facingDiffers(segs[prevIndex], segs[i], r, y, 0)) {
                        addEdge({kind: "arc", r: r, y: y, t0: 0, t1: 2 * Math.PI, segs: [segs[prevIndex], segs[i]],
                            nodes: [addNode(ring, 0), addNode(ring, 2 * Math.PI)], full: true});
                    }
                    continue;
                }
                for (k = 0; k < list.length; k++) {
                    var nodeA = list[k];
                    var nodeB = list[(k + 1) % list.length];
                    var t0 = nodeA.t;
                    var t1 = k + 1 < list.length ? nodeB.t : nodeB.t + 2 * Math.PI;
                    if (t1 - t0 < 1e-12) continue;
                    if (!facingDiffers(segs[prevIndex], segs[i], r, y, (t0 + t1) / 2)) continue;
                    addEdge({kind: "arc", r: r, y: y, t0: t0, t1: t1, segs: [segs[prevIndex], segs[i]], nodes: [nodeA, nodeB]});
                }
            }

            // 노드를 따라 걷는다. 각 노드는 보통 변 2개(모선 + 호)라 한 줄로 이어진다
            var chains = [];
            for (i = 0; i < edges.length; i++) {
                if (edges[i].visited) continue;
                if (edges[i].full) {
                    edges[i].visited = true;
                    chains.push({steps: [stepOf(edges[i], edges[i].nodes[0])], closed: true});
                    continue;
                }
                // 뒤로 끝까지 가서 시작점을 찾는다
                var edge = edges[i];
                var node = edge.nodes[0];
                var startEdge = edge;
                var startNode = node;
                var closed = false;
                for (var guard = 0; guard <= edges.length; guard++) {
                    var back = nextEdge(node, edge);
                    if (back === null) break;
                    if (back === startEdge) { closed = true; break; }
                    edge = back;
                    node = otherNode(edge, node);
                }
                var steps = [];
                var enterNode = closed ? startNode : node;
                edge = closed ? startEdge : edge;
                for (;;) {
                    edge.visited = true;
                    steps.push(stepOf(edge, enterNode));
                    var exitNode = otherNode(edge, enterNode);
                    var forward = nextEdge(exitNode, edge);
                    if (forward === null) break;
                    edge = forward;
                    enterNode = exitNode;
                }
                chains.push({steps: steps, closed: closed});
            }
            return chains;
        }

        function sharesRing(prevSeg, seg) {
            return Math.abs(prevSeg.r1 - seg.r0) < 1e-9 && Math.abs(prevSeg.y1 - seg.y0) < 1e-9;
        }

        // 링 위 t에서 앞 조각과 뒤 조각의 앞뒤 방향이 다른가
        function facingDiffers(prevSeg, seg, r, y, t) {
            var p = ringPoint(r, y, t);
            var fa = facingModel(p, segmentNormal(prevSeg, t));
            var fb = facingModel(p, segmentNormal(seg, t));
            return (fa >= 0) !== (fb >= 0);
        }

        function otherNode(edge, node) {
            return edge.nodes[0] === node ? edge.nodes[1] : edge.nodes[0];
        }

        function nextEdge(node, fromEdge) {
            for (var i = 0; i < node.edges.length; i++) {
                if (node.edges[i] !== fromEdge && !node.edges[i].visited) return node.edges[i];
            }
            return null;
        }

        // 변을 enterNode 쪽에서 들어가는 방향의 step으로 바꾼다
        function stepOf(edge, enterNode) {
            var forward = edge.nodes[0] === enterNode;
            if (edge.kind === "line") {
                return {kind: "line", seg: edge.seg, t: edge.t, s0: forward ? 0 : 1, s1: forward ? 1 : 0};
            }
            return {kind: "arc", r: edge.r, y: edge.y, t0: forward ? edge.t0 : edge.t1, t1: forward ? edge.t1 : edge.t0,
                segs: edge.segs, full: edge.full === true};
        }

        // 사슬을 u ∈ [0, steps.length] 로 매개화한 곡선. 한 step이 u 1칸
        function chainCurve(model, chain) {
            var steps = chain.steps;
            function locate(u) {
                if (chain.closed) u = ((u % steps.length) + steps.length) % steps.length;
                var index = Math.floor(u);
                if (index >= steps.length) index = steps.length - 1;
                if (index < 0) index = 0;
                var f = u - index;
                var step = steps[index];
                if (step.kind === "line") {
                    return {step: step, t: step.t, p: segmentPoint(step.seg, step.t, step.s0 + (step.s1 - step.s0) * f)};
                }
                var t = step.t0 + (step.t1 - step.t0) * f;
                return {step: step, t: t, p: ringPoint(step.r, step.y, t)};
            }
            function pointAt(u) {
                return locate(u).p;
            }
            function visibilityAt(u) {
                var at = locate(u);
                var segs = at.step.kind === "line" ? [at.step.seg] : at.step.segs;
                var normal = jointNormal(model, segs, at.t, at.p);
                if (profileClosed && locallyHidden(model, segs, at.t, at.p, normal)) return -1;
                return occluded(model, at.p, normal, segs) ? -1 : 1;
            }
            return {
                pointAt: pointAt,
                visibilityAt: visibilityAt,
                tMin: 0,
                tMax: steps.length,
                closed: chain.closed,
                samples: Math.max(CURVE_SAMPLES, steps.length * 4),
                steps: steps
            };
        }

        function rimCurve(model, rim) {
            function pointAt(t) { return ringPoint(rim.r, rim.y, t); }
            return {
                pointAt: pointAt,
                visibilityAt: function(t) {
                    var p = pointAt(t);
                    var normal = jointNormal(model, rim.segs, t, p);
                    if (profileClosed && probeInside(model, p, normal)) return -1;
                    return occluded(model, p, normal, null) ? -1 : 1;
                },
                tMin: 0,
                tMax: 2 * Math.PI,
                closed: true
            };
        }

        function collectParts(model) {
            var parts = {visible: [], hidden: []};
            var i;
            var s;
            var spans;
            for (i = 0; i < model.rims.length; i++) {
                var rim = rimCurve(model, model.rims[i]);
                spans = mergeShortSpans(rim, splitCurve(rim));
                for (s = 0; s < spans.length; s++) {
                    (spans[s].visible ? parts.visible : parts.hidden).push({
                        kind: "arc", curve: rim, t0: spans[s].t0, t1: spans[s].t1, closed: spans[s].closed
                    });
                }
            }
            var chains = findSilhouettes(model);
            for (i = 0; i < chains.length; i++) {
                var curve = chainCurve(model, chains[i]);
                spans = mergeShortSpans(curve, splitCurve(curve));
                for (s = 0; s < spans.length; s++) {
                    (spans[s].visible ? parts.visible : parts.hidden).push({
                        kind: "chain", curve: curve, t0: spans[s].t0, t1: spans[s].t1, closed: spans[s].closed
                    });
                }
            }
            return parts;
        }

        // 화면에서 MIN_SPAN_PT보다 짧은 구간은 판정이 흔들린 것으로 보고 이웃 구간에 흡수시킨다.
        // 가장 짧은 것부터 하나씩 없애면 양옆(같은 보임 상태)이 하나로 합쳐진다. 닫힌 곡선은 끝과 처음도 이웃이다
        function mergeShortSpans(curve, spans) {
            var i;
            for (;;) {
                if (spans.length < 2) return spans;
                var shortest = -1;
                var shortestLength = MIN_SPAN_PT;
                for (i = 0; i < spans.length; i++) {
                    var len = spanScreenLength(curve, spans[i]);
                    if (len < shortestLength) {
                        shortestLength = len;
                        shortest = i;
                    }
                }
                if (shortest < 0) return spans;
                var n = spans.length;
                if (n === 2) {
                    // 하나만 남는다: 살아남은 구간이 전체를 덮는다
                    return [{t0: curve.tMin, t1: curve.tMax, visible: spans[1 - shortest].visible, closed: curve.closed}];
                }
                var prevIndex = (shortest - 1 + n) % n;
                var nextIndex = (shortest + 1) % n;
                var prev = spans[prevIndex];
                var next = spans[nextIndex];
                if (!curve.closed && (shortest === 0 || shortest === n - 1)) {
                    // 열린 곡선의 끝 구간: 하나뿐인 이웃이 끝까지 늘어난다
                    if (shortest === 0) next.t0 = spans[0].t0;
                    else prev.t1 = spans[n - 1].t1;
                    spans.splice(shortest, 1);
                    continue;
                }
                // 이전 구간이 짧은 구간과 다음 구간까지 덮는다. 닫힌 곡선에서 순환이 꼬이지 않게 길이를 더해 붙인다
                var merged = {t0: prev.t0, t1: prev.t1 + (spans[shortest].t1 - spans[shortest].t0) + (next.t1 - next.t0),
                    visible: prev.visible, closed: false};
                var rebuilt = [];
                for (i = 0; i < n; i++) {
                    if (i === shortest || i === nextIndex) continue;
                    rebuilt.push(i === prevIndex ? merged : spans[i]);
                }
                spans = rebuilt;
            }
        }

        function spanScreenLength(curve, span) {
            var samples = 8;
            var total = 0;
            var last = projectModel(curve.pointAt(span.t0));
            for (var i = 1; i <= samples; i++) {
                var next = projectModel(curve.pointAt(span.t0 + (span.t1 - span.t0) * i / samples));
                total += Math.sqrt(distance2(last, next));
                last = next;
            }
            return total;
        }

        function drawParts(group, list, dashed) {
            for (var i = 0; i < list.length; i++) {
                var part = list[i];
                var path = part.kind === "arc"
                    ? makeCurvePath(group, part.curve, part.t0, part.t1, part.closed)
                    : makeChainPath(group, part.curve, part.t0, part.t1, part.closed);
                if (path !== null) applyStroke(path, dashed);
            }
        }

        // 곡선 위 각 점의 "앞을 보는 정도"를 샘플링해 부호가 바뀌는 곳에서 자른다
        function splitCurve(curve) {
            var sampleCount = curve.samples || CURVE_SAMPLES;
            var tMin = curve.tMin;
            var span = curve.tMax - curve.tMin;
            var values = [];
            var i;
            for (i = 0; i <= sampleCount; i++) {
                values.push(curve.visibilityAt(tMin + span * i / sampleCount));
            }
            // 닫힌 곡선은 마지막 샘플을 첫 샘플과 비교한다. 끝에서 부동소수점 오차로 부호가 흔들려 교차를 놓치지 않게
            if (curve.closed) values[sampleCount] = values[0];
            var crossings = [];
            for (i = 0; i < sampleCount; i++) {
                if ((values[i] >= 0) !== (values[i + 1] >= 0)) {
                    crossings.push(refineCrossing(curve, tMin + span * i / sampleCount,
                        tMin + span * (i + 1) / sampleCount));
                }
            }
            var spans = [];
            if (crossings.length === 0) {
                spans.push({t0: tMin, t1: curve.tMax, visible: values[0] >= 0, closed: curve.closed});
                return spans;
            }
            var t0;
            var t1;
            if (curve.closed) {
                for (i = 0; i < crossings.length; i++) {
                    t0 = crossings[i];
                    t1 = (i + 1 < crossings.length) ? crossings[i + 1] : crossings[0] + span;
                    spans.push({t0: t0, t1: t1, visible: curve.visibilityAt((t0 + t1) / 2) >= 0, closed: false});
                }
                return spans;
            }
            t0 = tMin;
            for (i = 0; i <= crossings.length; i++) {
                t1 = (i < crossings.length) ? crossings[i] : curve.tMax;
                if (t1 > t0) {
                    spans.push({t0: t0, t1: t1, visible: curve.visibilityAt((t0 + t1) / 2) >= 0, closed: false});
                }
                t0 = t1;
            }
            return spans;
        }

        function refineCrossing(curve, tA, tB) {
            var visibleAtA = curve.visibilityAt(tA) >= 0;
            for (var i = 0; i < 30; i++) {
                var tM = (tA + tB) / 2;
                if ((curve.visibilityAt(tM) >= 0) === visibleAtA) tA = tM;
                else tB = tM;
            }
            return (tA + tB) / 2;
        }

        // 실루엣 사슬 [u0, u1] 구간을 패스로 만든다.
        // 앵커: 양끝 + 짧은 호(이음새)의 가운데(이웃 앵커로 매끄럽게) + 긴 호의 끝과 π/4마다(원호 접선으로). 모선 안쪽은 직선이라 앵커가 없다
        function makeChainPath(group, curve, u0, u1, closed) {
            var steps = curve.steps;
            var entries = [];   // {u, kind: "smooth"|"corner"|"arc"}
            var i;
            var k;
            // 열린 구간은 양끝을 따로 넣는다. 닫힌 사슬은 [u0, u1) 한 바퀴: u1 자리 앵커는 u0 자리로 돌려 넣고 u 순으로 정렬한다
            var period = closed ? curve.tMax : 0;
            if (!closed) entries.push({u: u0, kind: "smooth"});
            var first = Math.floor(u0);
            var last = Math.ceil(u1);
            for (i = first; i < last; i++) {
                var step = steps[i % steps.length];
                if (step.kind !== "arc") continue;
                var span = Math.abs(step.t1 - step.t0);
                if (span <= SMALL_ARC) {
                    pushEntry(entries, i + 0.5, "smooth", u0, u1, period);
                    continue;
                }
                var count = arcSegmentCount(span);
                for (k = 0; k <= count; k++) {
                    var isEnd = (k === 0 || k === count) && !step.full;
                    pushEntry(entries, i + k / count, isEnd ? "corner" : "arc", u0, u1, period);
                }
            }
            if (!closed) entries.push({u: u1, kind: "smooth"});
            if (closed) entries.sort(function(a, b) { return a.u - b.u; });
            if (entries.length < 2) return null;

            var nodes = [];
            for (i = 0; i < entries.length; i++) {
                nodes.push({u: entries[i].u, kind: entries[i].kind, p: projectModel(curve.pointAt(entries[i].u))});
            }
            var count2 = nodes.length;
            for (i = 0; i < count2; i++) {
                var node = nodes[i];
                var prev = (i > 0) ? nodes[i - 1] : (closed ? nodes[count2 - 1] : null);
                var next = (i + 1 < count2) ? nodes[i + 1] : (closed ? nodes[0] : null);
                var duPrev = prev ? wrapDu(node.u - prev.u, curve.tMax) : 0;
                var duNext = next ? wrapDu(next.u - node.u, curve.tMax) : 0;
                if (node.kind === "smooth") {
                    // 이웃 앵커 차이로 접선을 잡는다 (Catmull-Rom)
                    var tangent;
                    if (prev && next) tangent = [(next.p[0] - prev.p[0]) / 2, (next.p[1] - prev.p[1]) / 2];
                    else if (next) tangent = [next.p[0] - node.p[0], next.p[1] - node.p[1]];
                    else tangent = [node.p[0] - prev.p[0], node.p[1] - prev.p[1]];
                    node.left = prev ? [node.p[0] - tangent[0] / 3, node.p[1] - tangent[1] / 3] : node.p;
                    node.right = next ? [node.p[0] + tangent[0] / 3, node.p[1] + tangent[1] / 3] : node.p;
                } else {
                    // 호 위: 실제 미분으로 접선을 잡는다. 호 끝은 양쪽 미분이 달라 모서리점
                    var h = 1e-4;
                    var back = node.kind === "corner" ? projectModel(curve.pointAt(node.u - h)) : null;
                    var ahead = node.kind === "corner" ? projectModel(curve.pointAt(node.u + h)) : null;
                    var central = node.kind === "arc" ? screenTangentU(curve, node.u) : null;
                    var leftT = central || [(node.p[0] - back[0]) / h, (node.p[1] - back[1]) / h];
                    var rightT = central || [(ahead[0] - node.p[0]) / h, (ahead[1] - node.p[1]) / h];
                    node.left = prev ? [node.p[0] - leftT[0] * duPrev / 3, node.p[1] - leftT[1] * duPrev / 3] : node.p;
                    node.right = next ? [node.p[0] + rightT[0] * duNext / 3, node.p[1] + rightT[1] * duNext / 3] : node.p;
                }
            }
            var anchors = [];
            for (i = 0; i < count2; i++) anchors.push(nodes[i].p);
            var path = group.pathItems.add();
            path.setEntirePath(anchors);
            path.closed = closed;
            for (i = 0; i < count2; i++) {
                var point = path.pathPoints[i];
                point.leftDirection = nodes[i].left;
                point.rightDirection = nodes[i].right;
                point.pointType = nodes[i].kind === "corner" ? PointType.CORNER : PointType.SMOOTH;
            }
            return path;
        }

        // 열린 구간은 양끝을 뺀 안쪽만, 닫힌 구간(period > 0)은 u1을 u0으로 접어 [u0, u1) 안만 받는다
        function pushEntry(entries, u, kind, u0, u1, period) {
            if (period > 0) {
                if (u >= u1 - 1e-9) u -= period;
                if (u < u0 - 1e-9) return;
            } else if (u <= u0 + 1e-9 || u >= u1 - 1e-9) {
                return;
            }
            for (var i = 0; i < entries.length; i++) {
                if (Math.abs(entries[i].u - u) < 1e-9) return;
            }
            entries.push({u: u, kind: kind});
        }

        function wrapDu(du, period) {
            while (du < 0) du += period;
            return du;
        }

        function screenTangentU(curve, u) {
            var h = 1e-4;
            var before = projectModel(curve.pointAt(u - h));
            var after = projectModel(curve.pointAt(u + h));
            return [(after[0] - before[0]) / (2 * h), (after[1] - before[1]) / (2 * h)];
        }

        // ---- 면 음영 -------------------------------------------------------------
        // 광원은 화면(보는 사람) 기준으로 고정된다. 물체를 돌리면 빛을 받는 면이 바뀐다.
        // 면 = 단면 조각을 돌린 띠. 띠마다 앞을 보는 구간(실루엣 사이)만 윤곽으로 채우고, 먼 띠부터 그려 가까운 띠가 덮게 한다.
        // 띠 하나는 앞뒤로 얇아 무게중심 깊이로 정렬해도 대개 맞다. 스치는 각도에서 어긋날 수 있다

        // 채울 띠 목록 (먼 것부터): {kind: "outline"|"ring", ..., k, depth}
        function collectFills(model) {
            var fills = [];
            for (var i = 0; i < model.segments.length; i++) {
                var seg = model.segments[i];
                var portions = facingPortions(model, seg);
                for (var k = 0; k < portions.length; k++) {
                    var fill = makeBandFill(model, seg, portions[k]);
                    if (fill !== null) fills.push(fill);
                }
            }
            fills.sort(function(a, b) { return a.depth - b.depth; });
            return fills;
        }

        // 띠에서 한쪽 면이 보는 사람을 향하는 t 구간. {t0, t1, full, side}. side = +1 바깥면, -1 안쪽면(열린 껍질만)
        function facingPortions(model, seg) {
            var portions = [];
            var dy = seg.y1 - seg.y0;
            var roots = Math.abs(dy) < 1e-9 ? [] : silhouetteRoots(seg);
            var facing;
            if (roots.length < 2) {
                var p0 = segmentPoint(seg, 0, 0.5);
                facing = facingModel(p0, outwardNormal(model, seg, 0, p0));
                if (Math.abs(facing) <= FACING_EPSILON) return portions;
                if (facing > 0) portions.push({t0: 0, t1: 2 * Math.PI, full: true, side: 1});
                else if (!profileClosed) portions.push({t0: 0, t1: 2 * Math.PI, full: true, side: -1});
                return portions;
            }
            var tA = Math.min(roots[0], roots[1]);
            var tB = Math.max(roots[0], roots[1]);
            var pm = segmentPoint(seg, (tA + tB) / 2, 0.5);
            facing = facingModel(pm, outwardNormal(model, seg, (tA + tB) / 2, pm));
            var inside = {t0: tA, t1: tB, full: false};
            var outside = {t0: tB, t1: tA + 2 * Math.PI, full: false};
            var front = facing >= 0 ? inside : outside;
            var back = facing >= 0 ? outside : inside;
            front.side = 1;
            back.side = -1;
            portions.push(front);
            if (!profileClosed) portions.push(back);
            return portions;
        }

        function makeBandFill(model, seg, portion) {
            var samples = 8;
            var shadeSum = 0;
            var depthSum = 0;
            var i;
            for (i = 0; i < samples; i++) {
                var t = portion.t0 + (portion.t1 - portion.t0) * (i + 0.5) / samples;
                var p = segmentPoint(seg, t, 0.5);
                var n = scale(outwardNormal(model, seg, t, p), portion.side);
                shadeSum += shadeOfViewNormal(toView(n));
                depthSum += toView(segmentPoint(seg, t, 0))[2] + toView(segmentPoint(seg, t, 1))[2];
            }
            var fill = {k: kFromShade(shadeSum / samples), depth: depthSum / (2 * samples)};
            var hasBottom = seg.r0 > AXIS_EPSILON;
            var hasTop = seg.r1 > AXIS_EPSILON;
            // 띠를 양끝(s)과 양옆(t)으로 조금 늘려 이웃 띠와 겹치게 한다. 꼭짓점 쪽은 늘리지 않는다
            var bandLength = Math.sqrt((seg.r1 - seg.r0) * (seg.r1 - seg.r0) + (seg.y1 - seg.y0) * (seg.y1 - seg.y0));
            var extend = Math.min(FILL_OVERLAP_PT, 0.1 * bandLength) / bandLength;
            var s0 = hasBottom ? -extend : 0;
            var s1 = hasTop ? 1 + extend : 1;
            var rBottom = seg.r0 + (seg.r1 - seg.r0) * s0;
            var rTop = seg.r0 + (seg.r1 - seg.r0) * s1;
            var bottom = ringCurve(rBottom, seg.y0 + (seg.y1 - seg.y0) * s0);
            var top = ringCurve(rTop, seg.y0 + (seg.y1 - seg.y0) * s1);
            if (portion.full) {
                // 온 바퀴: 고리(두 테두리 사이) 또는 원판(한쪽이 꼭짓점)
                fill.kind = "ring";
                fill.outer = hasBottom ? bottom : top;
                fill.inner = (hasBottom && hasTop) ? top : null;
                return fill;
            }
            var span = portion.t1 - portion.t0;
            var dtBottom = hasBottom ? Math.min(FILL_OVERLAP_PT / rBottom, (2 * Math.PI - span) / 2) : 0;
            var dtTop = hasTop ? Math.min(FILL_OVERLAP_PT / rTop, (2 * Math.PI - span) / 2) : 0;
            // 아래 테두리 호 → 모선 → 위 테두리 호(역방향) → 모선. 꼭짓점 쪽 호는 점 하나라 뺀다
            var segments = [];
            if (hasBottom) segments.push({kind: "arc", curve: bottom, t0: portion.t0 - dtBottom, t1: portion.t1 + dtBottom});
            segments.push({kind: "line", a: segmentPoint(seg, portion.t1 + dtBottom, s0), b: segmentPoint(seg, portion.t1 + dtTop, s1)});
            if (hasTop) segments.push({kind: "arc", curve: top, t0: portion.t1 + dtTop, t1: portion.t0 - dtTop});
            segments.push({kind: "line", a: segmentPoint(seg, portion.t0 - dtTop, s1), b: segmentPoint(seg, portion.t0 - dtBottom, s0)});
            fill.kind = "outline";
            fill.segments = segments;
            return fill;
        }

        function ringCurve(r, y) {
            return {pointAt: function(t) { return ringPoint(r, y, t); }};
        }

        function drawFills(group, fills) {
            for (var i = 0; i < fills.length; i++) {
                var fill = fills[i];
                if (fill.kind === "ring") {
                    drawRing(group, fill.outer, fill.inner, fill.k);
                } else {
                    applyFill(makeOutlinePath(group, fill.segments), fill.k);
                }
            }
        }

        // 고리: 복합 패스에 두 원을 넣고 짝수-홀수 규칙으로 구멍을 낸다. 안쪽 원이 없으면 원판
        function drawRing(group, outerCurve, innerCurve, k) {
            if (innerCurve === null) {
                applyFill(makeCurvePath(group, outerCurve, 0, 2 * Math.PI, true), k);
                return;
            }
            var compound = null;
            try { compound = group.compoundPathItems.add(); } catch (compoundError) { compound = null; }
            if (compound === null) {
                applyFill(makeCurvePath(group, outerCurve, 0, 2 * Math.PI, true), k);
                return;
            }
            var outerPath = makeCurvePath(compound, outerCurve, 0, 2 * Math.PI, true);
            var innerPath = makeCurvePath(compound, innerCurve, 0, 2 * Math.PI, true);
            applyFill(outerPath, k);
            applyFill(innerPath, k);
            try { outerPath.evenodd = true; } catch (evenOddError) {}
            try { innerPath.evenodd = true; } catch (evenOddError2) {}
        }

        // ---- 벡터·숫자 도우미 ---------------------------------------------------

        return api;
    }
})();
