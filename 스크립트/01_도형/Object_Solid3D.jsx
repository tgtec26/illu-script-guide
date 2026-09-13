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

// 입체 도형을 만들어 원하는 시점으로 돌린 뒤 2D 라인 드로잉으로 남긴다.
// 라이노에서 3D를 만들고 2D로 뽑던 작업을 일러스트레이터 안에서 끝내기 위한 스크립트.
// 모든 도형은 볼록(convex)이라 "면이 앞을 보는가"만으로 숨은선을 정확히 가른다.
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
    var SIZE_STEP_MM = 0.1;
    var MAX_SIZE_MM = 200;
    var ANGLE_STEP = 0.1;
    var OFFSET_STEP_MM = 0.1;
    var POSITION_LIMIT_MM = 100;
    var CURVE_SAMPLES = 144;      // 곡선 가시성 판정 샘플 수
    var MAX_ARC_SPAN = Math.PI / 4; // 베지어 한 구간이 감당할 최대 각도
    var FACING_EPSILON = 1e-9;

    var HIDDEN_NONE = 0;
    var HIDDEN_DASHED = 1;
    var HIDDEN_SOLID = 2;

    var FILL_NONE = 0;
    var FILL_FLAT = 1;
    var FILL_LIT = 2;

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
        {id: "conefrustum", label: "원뿔대", taper: true}
    ];

    var shapeIndex = 0;
    var widthMm = 20;
    var depthMm = 20;
    var heightMm = 20;
    var linkWidthDepth = true;
    var sideCount = 6;
    var baseRotation = 0;
    var topRatio = 50;
    var rotY = 45;      // 가로 회전 (턴테이블)
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
    // 커스텀 시점 프리셋 4개: {y, x, z, perspective, distance}. 설정과 별도 키에 저장해 설정 버전이 바뀌어도 남는다
    var PRESET_KEY = "ObjectSolid3D/presets";
    var customPresets = [];
    var presetSaveMode = false;
    var originX = 0;
    var originY = 0;
    var viewMatrix = null;
    var eyeZ = 0;
    var strokeColor = makeStrokeColor();

    // 실행 시 선택한 오브젝트가 있으면 그 중심을 생성 기준점으로 쓰고, 확인 시 지운다.
    // (취소하면 그대로 둔다.) 선택이 없으면 화면 중앙에 만든다.
    var guideItem = null;
    try {
        var sel = doc.selection;
        if (sel && sel.length > 0 && sel[0].visibleBounds) {
            guideItem = sel[0];
            var gb = guideItem.visibleBounds;
            originX = (gb[0] + gb[2]) / 2;
            originY = (gb[1] + gb[3]) / 2;
        } else {
            var centerPoint = doc.views[0].centerPoint;
            originX = centerPoint[0];
            originY = centerPoint[1];
        }
    } catch (originError) {
        originX = 0;
        originY = 0;
    }

    var PREF_KEY = "ObjectSolid3D/settings";
    applySavedSettings();

    var win = new Window("dialog", "입체 도형 (3D → 2D 라인)");
    win.orientation = "column";
    win.alignChildren = "fill";

    var shapePanel = win.add("panel", undefined, "도형");
    shapePanel.orientation = "column";
    shapePanel.alignChildren = "fill";

    var shapeRow = shapePanel.add("group");
    shapeRow.alignChildren = ["left", "center"];
    shapeRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var shapeList = shapeRow.add("dropdownlist", undefined, shapeLabels());
    shapeList.selection = shapeIndex;
    shapeList.preferredSize.width = SLIDER_WIDTH + 60;

    var sidesControl = addNumberRow(shapePanel, "면 수 (개)", sideCount, 3, 24, 1, 0,
        "밑면 각의 수. 3이면 삼각기둥·삼각뿔", function(value) {
            sideCount = value;
            updatePreview();
        });
    var baseRotationControl = addNumberRow(shapePanel, "밑면 회전 (°)", baseRotation, 0, 360, 1, 0,
        "밑면 다각형만 제자리에서 돌린다 (도형의 모양). 시점 프리셋을 눌러도 유지된다", function(value) {
            baseRotation = value;
            updatePreview();
        });
    var topRatioControl = addNumberRow(shapePanel, "윗면 비율 (%)", topRatio, 0, 100, 1, 0,
        "밑면 대비 윗면 크기. 0이면 뿔이 된다", function(value) {
            topRatio = value;
            updatePreview();
        });

    var sizePanel = win.add("panel", undefined, "크기");
    sizePanel.orientation = "column";
    sizePanel.alignChildren = "fill";
    var widthControl = addNumberRow(sizePanel, "가로 (mm)", widthMm, SIZE_STEP_MM, MAX_SIZE_MM,
        SIZE_STEP_MM, 1, "밑면의 가로 지름(정다면체는 가로 폭)", function(value) {
            widthMm = value;
            if (linkWidthDepth && depthMm !== value) {
                depthMm = value;
                depthControl.set(value, true);
            }
            updatePreview();
        });
    var depthControl = addNumberRow(sizePanel, "세로 (mm)", depthMm, SIZE_STEP_MM, MAX_SIZE_MM,
        SIZE_STEP_MM, 1, "밑면의 세로 지름(안쪽 깊이)", function(value) {
            depthMm = value;
            if (linkWidthDepth && widthMm !== value) {
                widthMm = value;
                widthControl.set(value, true);
            }
            updatePreview();
        });
    var heightControl = addNumberRow(sizePanel, "높이 (mm)", heightMm, SIZE_STEP_MM, MAX_SIZE_MM,
        SIZE_STEP_MM, 1, "세로축(Y) 방향 높이", function(value) {
            heightMm = value;
            updatePreview();
        });
    var linkCheck = sizePanel.add("checkbox", undefined, "가로·세로 같게 (정원·정다각형 유지)");
    linkCheck.value = linkWidthDepth;

    var viewPanel = win.add("panel", undefined, "시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var rotYControl = addNumberRow(viewPanel, "가로 회전 (°)", rotY, -180, 180, ANGLE_STEP, 1,
        "물체를 세로축 둘레로 돌린다. +면 앞면이 오른쪽으로 돌아간다", function(value) {
            rotY = value;
            updatePreview();
        }, true);
    var rotXControl = addNumberRow(viewPanel, "위아래 기울기 (°)", rotX, -180, 180, ANGLE_STEP, 1,
        "+면 위에서 내려다본다", function(value) {
            rotX = value;
            updatePreview();
        }, true);
    var rotZControl = addNumberRow(viewPanel, "화면 회전 (°)", rotZ, -180, 180, ANGLE_STEP, 1,
        "화면을 보는 채로 그림을 돌린다", function(value) {
            rotZ = value;
            updatePreview();
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
        "가까울수록 원근이 강해진다", function(value) {
            perspectiveMm = value;
            updatePreview();
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
    fillCaption.helpTip = "광원 자동: 화면 기준 광원으로 면마다 K값을 정한다 (정육면체 등각: 윗면 > 앞면 > 옆면)";
    var fillList = fillRow.add("dropdownlist", undefined, ["없음", "단일 음영", "광원 자동"]);
    fillList.selection = fillMode;
    fillList.preferredSize.width = SLIDER_WIDTH + 60;
    var brightnessControl = addNumberRow(linePanel, "밝기 (%)", brightness, 0, 100, 1, 0,
        "면 K값의 중간. 100이면 K0(흰색), 0이면 K100", function(value) {
            brightness = value;
            updatePreview();
        });
    var contrastControl = addNumberRow(linePanel, "대비 (%)", contrast, 0, 100, 1, 0,
        "밝은 면과 어두운 면의 K 차이", function(value) {
            contrast = value;
            updatePreview();
        });
    var lightAzimuthControl = addNumberRow(linePanel, "광원 방위 (°)", lightAzimuth, -90, 90, 1, 0,
        "화면 기준 광원 좌우 위치. 음수 = 왼쪽, 0 = 정면", function(value) {
            lightAzimuth = value;
            updatePreview();
        });
    var lightElevationControl = addNumberRow(linePanel, "광원 높이 (°)", lightElevation, 0, 90, 1, 0,
        "화면 기준 광원 높이. 90 = 바로 위", function(value) {
            lightElevation = value;
            updatePreview();
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

    syncShapeRows();
    syncFillRows();
    perspectiveControl.row.enabled = perspectiveOn;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = createSolid();
        if (finalGroup !== null) {
            translateItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            finalGroup.name = "Solid3D " + SHAPES[shapeIndex].label;
            if (guideItem !== null) {
                try { finalGroup.move(guideItem, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
                try { guideItem.remove(); } catch (removeError) {}
                guideItem = null;
            }
            try {
                doc.selection = null;
                finalGroup.selected = true;
            } catch (selectError) {}
        }
    }
    app.redraw();

    // ---- 다이얼로그 도우미 ------------------------------------------------

    function shapeLabels() {
        var labels = [];
        for (var i = 0; i < SHAPES.length; i++) labels.push(SHAPES[i].label);
        return labels;
    }

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

        var control = {row: row, input: input, slider: slider, reset: reset, value: value};

        function commit(raw, silent) {
            var parsed = parseNumber(raw);
            if (parsed === null) parsed = control.value;
            parsed = clamp(roundTo(parsed, step), minimum, maximum);
            control.value = parsed;
            input.text = formatValue(parsed, decimals);
            try { slider.value = parsed; } catch (sliderError) {}
            if (!silent) onCommit(parsed);
        }

        slider.onChanging = function() { commit(slider.value); };
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

    function syncShapeRows() {
        var shape = SHAPES[shapeIndex];
        sidesControl.row.enabled = shape.sides === true;
        baseRotationControl.row.enabled = shape.sides === true;
        topRatioControl.row.enabled = shape.taper === true;
        // 정다면체는 가로 하나로 크기를 정한다
        depthControl.row.enabled = shape.regular !== true;
        heightControl.row.enabled = shape.regular !== true;
        linkCheck.enabled = shape.regular !== true;
    }

    function syncFillRows() {
        brightnessControl.row.enabled = fillMode !== FILL_NONE;
        contrastControl.row.enabled = fillMode === FILL_LIT;
        lightAzimuthControl.row.enabled = fillMode === FILL_LIT;
        lightElevationControl.row.enabled = fillMode === FILL_LIT;
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

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createSolid();
        if (previewGroup !== null) {
            translateItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            previewGroup.name = "Solid3D Preview";
        }
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (removeError) {}
        previewGroup = null;
    }

    function saveSettings() {
        var parts = ["v2", shapeIndex, widthMm, depthMm, heightMm, linkWidthDepth ? 1 : 0,
            sideCount, baseRotation, topRatio, rotY, rotX, rotZ,
            perspectiveOn ? 1 : 0, perspectiveMm, hiddenMode, offsetXmm, offsetYmm,
            fillMode, brightness, contrast, lightAzimuth, lightElevation];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (saveError) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (readError) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v2" || p.length !== 22) return;
        shapeIndex = restoreInteger(p[1], shapeIndex, 0, SHAPES.length - 1);
        widthMm = restoreNumber(p[2], widthMm, SIZE_STEP_MM, MAX_SIZE_MM);
        depthMm = restoreNumber(p[3], depthMm, SIZE_STEP_MM, MAX_SIZE_MM);
        heightMm = restoreNumber(p[4], heightMm, SIZE_STEP_MM, MAX_SIZE_MM);
        linkWidthDepth = p[5] === "1";
        sideCount = restoreInteger(p[6], sideCount, 3, 24);
        baseRotation = restoreNumber(p[7], baseRotation, 0, 360);
        topRatio = restoreNumber(p[8], topRatio, 0, 100);
        rotY = restoreNumber(p[9], rotY, -180, 180);
        rotX = restoreNumber(p[10], rotX, -180, 180);
        rotZ = restoreNumber(p[11], rotZ, -180, 180);
        perspectiveOn = p[12] === "1";
        perspectiveMm = restoreNumber(p[13], perspectiveMm, 50, 2000);
        hiddenMode = restoreInteger(p[14], hiddenMode, HIDDEN_NONE, HIDDEN_SOLID);
        offsetXmm = restoreNumber(p[15], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[16], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        fillMode = restoreInteger(p[17], fillMode, FILL_NONE, FILL_LIT);
        brightness = restoreNumber(p[18], brightness, 0, 100);
        contrast = restoreNumber(p[19], contrast, 0, 100);
        lightAzimuth = restoreNumber(p[20], lightAzimuth, -90, 90);
        lightElevation = restoreNumber(p[21], lightElevation, 0, 90);
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

    // 회전 행렬과 시점 거리를 한 번만 계산해 둔다
    function beginView(model) {
        var ry = rotY * Math.PI / 180;
        var rx = rotX * Math.PI / 180;
        var rz = rotZ * Math.PI / 180;
        var matY = [[Math.cos(ry), 0, Math.sin(ry)], [0, 1, 0], [-Math.sin(ry), 0, Math.cos(ry)]];
        var matX = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]];
        var matZ = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
        // 가로 회전(Y) → 위아래 기울기(X) → 화면 회전(Z). 턴테이블 위의 물체를 보는 순서다
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

    function applyStroke(path, dashed) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = LINE_WIDTH_PT;
        try { path.strokeColor = strokeColor; } catch (colorError) {}
        try { path.strokeDashes = dashed ? HIDDEN_DASH : []; } catch (dashError) {}
        try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (capError) {}
        try { path.strokeJoin = StrokeJoin.MITERENDJOIN; } catch (joinError) {}
    }

    // ---- 면 음영 -------------------------------------------------------------
    // 광원은 화면(보는 사람) 기준으로 고정된다. 물체를 돌리면 빛을 받는 면이 바뀐다

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
        // 뚜껑: 앞을 보는 것만
        for (i = 0; i < model.curves.length; i++) {
            var cap = model.curves[i].refsAt(0)[0];
            if (facingModel(cap.p, cap.n) <= FACING_EPSILON) continue;
            fills.push({kind: "cap", curve: model.curves[i], k: kFromShade(shadeOfViewNormal(toView(cap.n)))});
        }
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
            point.pointType = samePoint(nodes[i].left, nodes[i].anchor) || samePoint(nodes[i].right, nodes[i].anchor)
                ? PointType.CORNER : PointType.SMOOTH;
        }
        return path;
    }

    function samePoint(a, b) {
        return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    }

    function applyFill(path, k) {
        path.stroked = false;
        path.filled = true;
        try { path.fillColor = makeKColor(k); } catch (fillError) {}
    }

    function makeKColor(k) {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
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
})();
