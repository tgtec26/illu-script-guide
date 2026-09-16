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

// 돌출(익스트루드): 선택한 패스를 그대로 앞뒤로 밀어 만든 기둥을 2D 라인 드로잉으로 만든다.
// 닫힌 패스는 앞뒤 뚜껑이 있는 기둥, 열린 패스는 뚜껑 없는 띠(굽은 면)가 된다.
// 여러 개를 선택하면 겹친 깊이가 홀수인 곳이 구멍(도넛, ㅁ자 파이프)이다.
// 시점은 Object_Solid3D.jsx처럼 가로 회전·위아래 기울기·화면 회전으로 잡는다.
// 기둥은 볼록이 아닐 수 있으므로(ㄱ자, 별 모양) 숨은선은 면 방향이 아니라 눈 쪽으로 쏜 광선이 막히는지로 가른다.
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
    var DEPTH_MIN_MM = 0.5;
    var DEPTH_MAX_MM = 300;
    var CURVE_PIECES = 12;          // 베지어 한 구간을 펴는 조각 수
    var CORNER_COS = Math.cos(2 * Math.PI / 180); // 접선이 2° 넘게 꺾이면 모서리
    var CURVE_SAMPLES_PER_SEG = 12; // 테두리 곡선 가시성 판정 샘플 수 (베지어 한 구간당)
    var CURVE_SAMPLES_MIN = 96;
    var CURVE_SAMPLES_MAX = 480;
    var RULING_SAMPLES = 48;        // 모선(세로 능선) 가시성 판정 샘플 수
    var CROSSING_STEPS = 12;        // 보임/숨음 경계를 좁히는 이분법 횟수. 샘플 간격의 1/4096이라 화면 0.01pt 안이다
    var LIVE_INTERVAL_MS = 60;      // 슬라이더를 끄는 동안 미리보기를 다시 그리는 최소 간격
    var RAY_LIFT = 1e-4;            // 열린 띠에서 광선을 쏘기 전에 점을 바깥 법선 쪽으로 띄우는 비율 (× 모델 반지름)
    var PROBE_STEP = 1e-4;          // 모서리 점이 속으로 들어가는지 볼 때 시선 쪽으로 내딛는 비율 (× 모델 반지름)
    var MIN_SPAN_PT = 1.5;          // 이보다 짧은 보임/숨음 구간은 이웃에 합친다 (실루엣 근처의 떨림 제거)
    var FACING_EPSILON = 1e-9;      // 이보다 작은 면 방향값은 옆에서 본 것(앞뒤 없음)으로 본다
    var FILL_OVERLAP_PT = 0.15;     // 이웃 면끼리 이만큼 겹쳐 채워 안티에일리어싱 실금을 없앤다. 선 두께(0.3) 절반이라 선 밑에 숨는다
    var CAP_DEPTH_BIAS = 1e9;       // 뚜껑은 옆면을 모두 그린 뒤에 그린다 (화가 알고리즘 정렬값)

    var HIDDEN_NONE = 0;
    var HIDDEN_DASHED = 1;
    var HIDDEN_SOLID = 2;

    var FILL_NONE = 0;
    var FILL_FLAT = 1;
    var FILL_LIT = 2;

    var depthMm = 20;   // 돌출 깊이
    var rotY = 25;      // 가로 회전 (턴테이블)
    var rotX = -15;     // 위아래 기울기
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
    var setPointType = false;   // 확정 출력만 앵커 종류(모서리/매끄러움)를 넣는다. 미리보기는 생략해 DOM 호출을 줄인다
    // 커스텀 시점 프리셋 4개: {y, x, z, perspective, distance}. 설정과 별도 키에 저장해 설정 버전이 바뀌어도 남는다
    var PRESET_KEY = "ObjectExtrude3D/presets";
    var customPresets = [];
    var presetSaveMode = false;
    var originX = 0;
    var originY = 0;
    var contours = [];      // [{anchors, points, closed, hole, uTotal}] 모델 좌표의 단면 테두리
    var solidClosed = true; // 닫힌 패스만 고르면 뚜껑 있는 기둥, 하나라도 열려 있으면 뚜껑 없는 띠
    var viewMatrix = null;
    var eyeZ = 0;
    var strokeColor = makeStrokeColor();
    var documentIsCmyk = false;
    try { documentIsCmyk = doc.documentColorSpace === DocumentColorSpace.CMYK; } catch (colorSpaceError) {}
    var kColorCache = {};       // K값별 채움색. 면마다 새로 만들지 않는다

    // ---- 선택 읽기 ------------------------------------------------------------
    // 패스 하나 이상(복합 패스·그룹 안쪽도 받는다). 확인하면 원본은 지운다

    var selectedItems = [];   // 확인하면 지울 원본(선택한 그대로). 그룹은 통째로 지운다
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);
    var sourceItems = [];     // 그 안에서 찾아낸 패스
    collectPaths(selectedItems, sourceItems);
    if (sourceItems.length === 0) {
        alert("돌출할 패스를 하나 이상 선택한 뒤 실행해주세요.");
        return;
    }

    var prepared = prepareContours(sourceItems);
    if (prepared.error) {
        alert(prepared.error);
        return;
    }
    contours = prepared.contours;
    solidClosed = prepared.closed;
    originX = prepared.centerX;
    originY = prepared.centerY;

    var PREF_KEY = "ObjectExtrude3D/settings";
    applySavedSettings();

    var win = new Window("dialog", "돌출 (3D → 2D 라인)");
    win.orientation = "column";
    win.alignChildren = "fill";

    var solidPanel = win.add("panel", undefined, "입체");
    solidPanel.orientation = "column";
    solidPanel.alignChildren = "fill";
    var depthControl = addNumberRow(solidPanel, "깊이 (mm)", depthMm, DEPTH_MIN_MM, DEPTH_MAX_MM, 0.5, 1,
        "패스를 앞뒤로 미는 거리. 원본 자리는 가운데", function(value, live) {
            depthMm = value;
            updatePreview(live);
        });

    var viewPanel = win.add("panel", undefined, "시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var rotYControl = addNumberRow(viewPanel, "가로 회전 (°)", rotY, -180, 180, ANGLE_STEP, 1,
        "세로축을 중심으로 돌린다 (턴테이블)", function(value, live) {
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
    customCaption.helpTip = "저장을 누른 뒤 번호를 누르면 지금 시점(회전·기울기·원근)이 그 번호에 저장된다";
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
    fillCaption.helpTip = "광원 자동: 화면 기준 광원으로 면마다 K값을 정한다. 곡면은 펴진 조각 수만큼 단계가 진다";
    var fillList = fillRow.add("dropdownlist", undefined, ["없음", "단일 음영", "광원 자동"]);
    fillList.selection = fillMode;
    fillList.preferredSize.width = SLIDER_WIDTH + 60;
    var brightnessControl = addNumberRow(linePanel, "밝기 (%)", brightness, 0, 100, 1, 0,
        "면 K값의 중간. 100이면 K0(흰색), 0이면 K100", function(value, live) {
            brightness = value;
            if (!live) updatePreview();
        });
    var contrastControl = addNumberRow(linePanel, "대비 (%)", contrast, 0, 100, 1, 0,
        "밝은 면과 어두운 면의 K 차이", function(value, live) {
            contrast = value;
            if (!live) updatePreview();
        });
    var lightAzimuthControl = addNumberRow(linePanel, "광원 방위 (°)", lightAzimuth, -90, 90, 1, 0,
        "화면 기준 광원 좌우 위치. 음수 = 왼쪽, 0 = 정면", function(value, live) {
            lightAzimuth = value;
            if (!live) updatePreview();
        });
    var lightElevationControl = addNumberRow(linePanel, "광원 높이 (°)", lightElevation, 0, 90, 1, 0,
        "화면 기준 광원 높이. 90 = 바로 위", function(value, live) {
            lightElevation = value;
            if (!live) updatePreview();
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

    perspectiveCheck.onClick = function() {
        perspectiveOn = perspectiveCheck.value;
        perspectiveControl.row.enabled = perspectiveOn;
        updatePreview();
    };
    hiddenList.onChange = function() {
        hiddenMode = hiddenList.selection ? hiddenList.selection.index : HIDDEN_NONE;
        updatePreview();
    };
    fillList.onChange = function() {
        fillMode = fillList.selection ? fillList.selection.index : FILL_NONE;
        syncFillRows();
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
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

    syncFillRows();
    perspectiveControl.row.enabled = perspectiveOn;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = createSolid(false, true);
        if (finalGroup !== null) {
            translateItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            finalGroup.name = "Extrude3D";
            try { finalGroup.move(selectedItems[0], ElementPlacement.PLACEBEFORE); } catch (moveError) {}
            for (var removeIndex = 0; removeIndex < selectedItems.length; removeIndex++) {
                try { selectedItems[removeIndex].remove(); } catch (removeError) {}
            }
            try {
                doc.selection = null;
                finalGroup.selected = true;
            } catch (selectError) {}
        }
    }
    app.redraw();

    // ---- 선택 도우미 ----------------------------------------------------------

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
                ? "가로 " + formatValue(preset.y, 1) + "° / 기울기 " + formatValue(preset.x, 1) +
                    "° / 화면 " + formatValue(preset.z, 1) + "°" +
                    (preset.perspective ? " / 원근 " + preset.distance + "mm" : "")
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

    // live: 슬라이더를 끄는 동안. 숨은선 판정과 면 없이 와이어프레임만 그리고, 직전 그리기에서 얼마 안 지났으면 건너뛴다.
    // 손을 떼면 live 없이 다시 불려 완전히 그린다
    function updatePreview(live) {
        if (live && new Date().getTime() - lastLiveRender < LIVE_INTERVAL_MS) return;
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createSolid(live, false);
        if (previewGroup !== null) {
            translateItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            previewGroup.name = "Extrude3D Preview";
        }
        app.redraw();
        if (live) lastLiveRender = new Date().getTime();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (removeError) {}
        previewGroup = null;
    }

    function saveSettings() {
        var parts = ["v1", depthMm, rotY, rotX, rotZ, perspectiveOn ? 1 : 0, perspectiveMm, hiddenMode,
            offsetXmm, offsetYmm, fillMode, brightness, contrast, lightAzimuth, lightElevation];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (saveError) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (readError) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v1" || p.length !== 15) return;
        depthMm = restoreNumber(p[1], depthMm, DEPTH_MIN_MM, DEPTH_MAX_MM);
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

    // 회전 행렬과 시점 거리를 한 번만 계산해 둔다
    function beginView(model) {
        var ry = rotY * Math.PI / 180;
        var rx = rotX * Math.PI / 180;
        var rz = rotZ * Math.PI / 180;
        var matY = [[Math.cos(ry), 0, Math.sin(ry)], [0, 1, 0], [-Math.sin(ry), 0, Math.cos(ry)]];
        var matX = [[1, 0, 0], [0, Math.cos(rx), -Math.sin(rx)], [0, Math.sin(rx), Math.cos(rx)]];
        var matZ = [[Math.cos(rz), -Math.sin(rz), 0], [Math.sin(rz), Math.cos(rz), 0], [0, 0, 1]];
        // 가로 회전(Y) → 위아래 기울기(X) → 화면 회전(Z). Solid3D와 같은 순서다
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

    // 면(점 p, 법선 n)이 보는 사람 쪽을 향하면 양수
    function facingModel(p, n) {
        var vp = toView(p);
        var vn = toView(n);
        if (!perspectiveOn) return vn[2];
        return vn[0] * (-vp[0]) + vn[1] * (-vp[1]) + vn[2] * (eyeZ - vp[2]);
    }

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
            // 쌓는 순서: 면 → 숨은선 → 보이는 선. 숨은선이 면에 가려지지 않는다
            if (fillMode !== FILL_NONE && !light) {
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

    function distance2(a, b) {
        return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
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

    function applyStroke(path, dashed) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = LINE_WIDTH_PT;
        try { path.strokeColor = strokeColor; } catch (colorError) {}
        try { path.strokeDashes = dashed ? HIDDEN_DASH : []; } catch (dashError) {}
        try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (capError) {}
        try { path.strokeJoin = StrokeJoin.MITERENDJOIN; } catch (joinError) {}
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

    function samePoint(a, b) {
        return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
    }

    // 한쪽 핸들이 없거나 두 핸들이 일직선이 아니면 모서리점이다
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

    // ---- 면 음영 -------------------------------------------------------------
    // 광원은 화면(보는 사람) 기준으로 고정된다. 물체를 돌리면 빛을 받는 면이 바뀐다.
    // 면 = 펴낸 조각마다 하나인 옆면 띠 + 앞뒤 뚜껑. 먼 면부터 그려 가까운 면이 덮게 한다(화가 알고리즘)

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

    // z 높이의 테두리 곡선 (면 채우기용)
    function zCurve(contour, z) {
        return {
            contour: contour,
            pointAt: function(u) { return modelPoint(contour, u, z); }
        };
    }

    // 채울 면 목록 (먼 것부터)
    function collectFills(model) {
        var fills = [];
        var h = model.halfDepth;
        var zPad = model.closed ? Math.min(FILL_OVERLAP_PT, 0.2 * h) : 0;
        var c;
        var i;
        for (c = 0; c < model.contours.length; c++) {
            var contour = model.contours[c];
            var pts = contour.points;
            var count = pts.length;
            var edgeCount = contour.closed ? count : count - 1;
            for (i = 0; i < edgeCount; i++) {
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
                    ? Math.min(FILL_OVERLAP_PT / screenLength, 0.25) * (u1 - u0)
                    : 0;
                var duStart = (!contour.closed && i === 0) ? 0 : du;
                var duEnd = (!contour.closed && i === edgeCount - 1) ? 0 : du;
                fills.push({
                    kind: "band",
                    contour: contour,
                    u0: u0 - duStart,
                    u1: u1 + duEnd,
                    zLow: -h - zPad,
                    zHigh: h + zPad,
                    k: kFromShade(shadeOfViewNormal(toView(scale(normal, side)))),
                    depth: (toView(modelPoint(contour, midU, -h))[2] + toView(modelPoint(contour, midU, h))[2]) / 2
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
        applyFill(path, fill.k);
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
            applyFill(makeCurvePath(group, zCurve(closedContours[0], fill.z), 0, closedContours[0].segCount, true), fill.k);
            return;
        }
        var compound = null;
        try { compound = group.compoundPathItems.add(); } catch (compoundError) { compound = null; }
        var target = compound === null ? group : compound;
        for (i = 0; i < closedContours.length; i++) {
            var path = makeCurvePath(target, zCurve(closedContours[i], fill.z), 0, closedContours[i].segCount, true);
            applyFill(path, fill.k);
            if (path !== null) {
                try { path.evenodd = true; } catch (evenOddError) {}
            }
        }
    }

    function applyFill(path, k) {
        if (path === null) return;
        path.stroked = false;
        path.filled = true;
        try { path.fillColor = makeKColor(k); } catch (fillError) {}
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

    // ---- 벡터·숫자 도우미 ---------------------------------------------------

    function normalize2(v) {
        var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        if (len < 1e-12) return [0, 1];
        return [v[0] / len, v[1] / len];
    }

    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function length3(a) { return Math.sqrt(dot(a, a)); }
    function normalize(a) {
        var len = length3(a);
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
