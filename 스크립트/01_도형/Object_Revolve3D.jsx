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

// 회전체: 단면(패스)과 축(2점 직선)을 선택하면 단면을 축 둘레로 돌린 입체를 2D 라인 드로잉으로 만든다.
// 사각형에 접한 선 → 원기둥, 원과 떨어진 선 → 도넛. 시점은 Object_Solid3D.jsx처럼 기울기·화면 회전으로 잡는다.
// 회전체는 볼록이 아니므로(도넛, 홈 파인 병) 숨은선은 면 방향이 아니라 눈 쪽으로 쏜 광선이 회전면에 막히는지로 가른다.
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
    var CURVE_PIECES = 12;          // 베지어 한 구간을 펴는 조각 수
    var CORNER_COS = Math.cos(2 * Math.PI / 180); // 접선이 2° 넘게 꺾이면 모서리
    var CURVE_SAMPLES = 144;        // 곡선 가시성 판정 샘플 수 (한 단계당 최소 4개)
    var MAX_ARC_SPAN = Math.PI / 4; // 베지어 한 구간이 감당할 최대 각도
    var SMALL_ARC = 0.5;            // 이보다 짧은 테두리 호는 실루엣 이음새로 보고 가운데 한 점만 찍는다
    var AXIS_EPSILON = 0.01;        // 축에서 이만큼(pt) 안이면 축 위로 본다
    var RAY_LIFT = 1e-4;            // 열린 껍질에서 광선을 쏘기 전에 점을 바깥 법선 쪽으로 띄우는 비율 (× 모델 반지름)
    var PROBE_STEP = 1e-4;          // 모서리 점이 속으로 들어가는지 볼 때 시선 쪽으로 내딛는 비율 (× 모델 반지름)
    var MIN_SPAN_PT = 1.5;          // 이보다 짧은 보임/숨음 구간은 이웃에 합친다 (실루엣 첨점 근처의 떨림 제거)
    var LOCAL_FACETS = 3;           // 실루엣 점의 광선이 매끄럽게 이어진 이웃 조각 몇 개까지는 자기 곡면으로 보고 무시하는가

    var HIDDEN_NONE = 0;
    var HIDDEN_DASHED = 1;
    var HIDDEN_SOLID = 2;

    var rotX = 35.3;    // 위아래 기울기
    var rotZ = 0;       // 화면 회전
    var perspectiveOn = false;
    var perspectiveMm = 300;
    var hiddenMode = HIDDEN_DASHED;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previewGroup = null;
    // 커스텀 시점 프리셋 4개: {x, z, perspective, distance}. 설정과 별도 키에 저장해 설정 버전이 바뀌어도 남는다
    var PRESET_KEY = "ObjectRevolve3D/presets";
    var customPresets = [];
    var presetSaveMode = false;
    var originX = 0;
    var originY = 0;
    var axisAngle = Math.PI / 2;  // 문서에서 축이 향한 각도. 시점 0이면 그린 그대로 보이게 화면 회전에 합친다
    var profilePoints = [];       // [{r, y, corner}] 축 기준 단면 (r = 축에서 거리, y = 축 방향)
    var profileClosed = true;
    var viewMatrix = null;
    var eyeZ = 0;
    var strokeColor = makeStrokeColor();

    // ---- 선택 읽기 ------------------------------------------------------------
    // 단면 패스 하나와 축(앵커 2개짜리 열린 직선) 하나. 확인하면 둘 다 지운다

    var profileItem = null;
    var axisItem = null;
    var sel = doc.selection;
    if (!sel || sel.length !== 2 || sel[0].typename !== "PathItem" || sel[1].typename !== "PathItem") {
        alert("단면 패스와 축이 될 직선, 두 개를 선택한 뒤 실행해주세요.");
        return;
    }
    var firstIsAxis = isAxisPath(sel[0]);
    var secondIsAxis = isAxisPath(sel[1]);
    if (firstIsAxis === secondIsAxis) {
        alert(firstIsAxis
            ? "둘 다 직선입니다. 축은 앵커 2개짜리 열린 직선 하나여야 합니다."
            : "축을 찾지 못했습니다. 앵커 2개짜리 열린 직선을 축으로 함께 선택해주세요.");
        return;
    }
    axisItem = firstIsAxis ? sel[0] : sel[1];
    profileItem = firstIsAxis ? sel[1] : sel[0];

    var axisA = axisItem.pathPoints[0].anchor;
    var axisB = axisItem.pathPoints[1].anchor;
    var axisU = normalize2([axisB[0] - axisA[0], axisB[1] - axisA[1]]);
    // 어느 쪽으로 그렸든 축의 + 방향은 화면 위쪽(가로면 오른쪽). 그래야 "위아래 기울기 +"가 늘 위에서 내려다보는 시점이 된다
    if (axisU[1] < 0 || (axisU[1] === 0 && axisU[0] < 0)) {
        var swap = axisA;
        axisA = axisB;
        axisB = swap;
        axisU = [-axisU[0], -axisU[1]];
    }
    var axisW = [-axisU[1], axisU[0]];
    axisAngle = Math.atan2(axisU[1], axisU[0]);

    var anchors = [];
    for (var pointIndex = 0; pointIndex < profileItem.pathPoints.length; pointIndex++) {
        var pp = profileItem.pathPoints[pointIndex];
        anchors.push({anchor: toAxisSpace(pp.anchor), left: toAxisSpace(pp.leftDirection), right: toAxisSpace(pp.rightDirection)});
    }
    profileClosed = profileItem.closed;
    var flattened = flattenProfile(anchors, profileClosed);
    if (flattened.error) {
        alert(flattened.error);
        return;
    }
    profilePoints = flattened.points;
    originX = axisA[0] + axisU[0] * flattened.yMid;
    originY = axisA[1] + axisU[1] * flattened.yMid;

    var PREF_KEY = "ObjectRevolve3D/settings";
    applySavedSettings();

    var win = new Window("dialog", "회전체 (3D → 2D 라인)");
    win.orientation = "column";
    win.alignChildren = "fill";

    var viewPanel = win.add("panel", undefined, "시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var rotXControl = addNumberRow(viewPanel, "위아래 기울기 (°)", rotX, -180, 180, ANGLE_STEP, 1,
        "축을 앞뒤로 눕힌다. +면 위에서 내려다본다", function(value) {
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
    var topButton = presetRow.add("button", undefined, "윗면");

    var customRow = viewPanel.add("group");
    customRow.alignChildren = ["left", "center"];
    var customCaption = customRow.add("statictext", undefined, "커스텀:");
    customCaption.preferredSize.width = LABEL_WIDTH;
    customCaption.helpTip = "저장을 누른 뒤 번호를 누르면 지금 시점(기울기·화면 회전·원근)이 그 번호에 저장된다";
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

    var linePanel = win.add("panel", undefined, "선");
    linePanel.orientation = "column";
    linePanel.alignChildren = "fill";
    var hiddenRow = linePanel.add("group");
    hiddenRow.alignChildren = ["left", "center"];
    hiddenRow.add("statictext", undefined, "숨은선:").preferredSize.width = LABEL_WIDTH;
    var hiddenList = hiddenRow.add("dropdownlist", undefined, ["표시 안 함", "파선", "실선"]);
    hiddenList.selection = hiddenMode;
    hiddenList.preferredSize.width = SLIDER_WIDTH + 60;

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
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    frontButton.onClick = function() { setView(0, 0); };
    isoButton.onClick = function() { setView(35.3, 0); };
    topButton.onClick = function() { setView(90, 0); };
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

    perspectiveControl.row.enabled = perspectiveOn;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = createSolid();
        if (finalGroup !== null) {
            translateItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            finalGroup.name = "Revolve3D";
            try { finalGroup.move(profileItem, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
            try { profileItem.remove(); } catch (removeProfileError) {}
            try { axisItem.remove(); } catch (removeAxisError) {}
            try {
                doc.selection = null;
                finalGroup.selected = true;
            } catch (selectError) {}
        }
    }
    app.redraw();

    // ---- 선택 도우미 ----------------------------------------------------------

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

    function setView(x, z) {
        if (presetSaveMode) setPresetSaveMode(false);
        rotX = x;
        rotZ = z;
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
                customPresets[index] = {x: rotX, z: rotZ, perspective: perspectiveOn, distance: perspectiveMm};
                saveCustomPresets();
                setPresetSaveMode(false);
                refreshCustomButtons();
                return;
            }
            var preset = customPresets[index];
            if (!preset) return;
            applyPerspective(preset.perspective, preset.distance);
            setView(preset.x, preset.z);
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
                ? "기울기 " + formatValue(preset.x, 1) + "° / 화면 " + formatValue(preset.z, 1) + "°" +
                    (preset.perspective ? " / 원근 " + preset.distance + "mm" : "")
                : "비어 있음. 저장을 누른 뒤 이 번호를 누르면 저장";
        }
    }

    function saveCustomPresets() {
        var parts = ["v1"];
        for (var i = 0; i < CUSTOM_PRESET_COUNT; i++) {
            var preset = customPresets[i];
            parts.push(preset ? [preset.x, preset.z, preset.perspective ? 1 : 0, preset.distance].join(",") : "");
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
        if (f.length !== 4) return null;
        var x = restoreNumber(f[0], null, -180, 180);
        var z = restoreNumber(f[1], null, -180, 180);
        var distance = restoreNumber(f[3], null, 50, 2000);
        if (x === null || z === null || distance === null) return null;
        return {x: x, z: z, perspective: f[2] === "1", distance: distance};
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
            previewGroup.name = "Revolve3D Preview";
        }
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (removeError) {}
        previewGroup = null;
    }

    function saveSettings() {
        var parts = ["v1", rotX, rotZ, perspectiveOn ? 1 : 0, perspectiveMm, hiddenMode, offsetXmm, offsetYmm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (saveError) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (readError) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v1" || p.length !== 8) return;
        rotX = restoreNumber(p[1], rotX, -180, 180);
        rotZ = restoreNumber(p[2], rotZ, -180, 180);
        perspectiveOn = p[3] === "1";
        perspectiveMm = restoreNumber(p[4], perspectiveMm, 50, 2000);
        hiddenMode = restoreInteger(p[5], hiddenMode, HIDDEN_NONE, HIDDEN_SOLID);
        offsetXmm = restoreNumber(p[6], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[7], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
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
            // 숨은선을 먼저 깔고 보이는 선을 위에 얹는다
            if (hiddenMode !== HIDDEN_NONE) drawParts(group, parts.hidden, hiddenMode === HIDDEN_DASHED);
            drawParts(group, parts.visible, false);
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

    function distance2(a, b) {
        return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
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

    // ---- 벡터·숫자 도우미 ---------------------------------------------------

    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
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
