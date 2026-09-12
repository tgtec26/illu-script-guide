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
    var sourceWidth = bounds[2] - bounds[0];
    var sourceHeight = bounds[1] - bounds[3];
    if (sourceWidth <= 0 ||
            Math.abs(sourceWidth - sourceHeight) > Math.max(0.1, sourceWidth * 0.01) ||
            !hasCircularPathPoints(source)) {
        alert("가로와 세로 크기가 같은 원을 선택해주세요.");
        return;
    }

    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;   // 다이얼로그를 만들기 전에 있어야 한다
    var MM_TO_PT = 2.83464567;
    var SIZE_STEP_MM = 0.05;
    var LINE_WIDTH_PT = 0.3;
    var POSITION_LIMIT_MM = 100;
    var OFFSET_STEP_MM = 0.1;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var MIN_TURNS = 5;
    var MAX_TURNS = 10;
    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;
    var sourceDiameterMm = sourceWidth / MM_TO_PT;
    var coilWidthMm = roundTo(sourceDiameterMm, SIZE_STEP_MM);
    var maxCoilWidthMm = Math.max(SIZE_STEP_MM, roundTo(sourceDiameterMm * 5, SIZE_STEP_MM));
    var coilHeightMm = roundTo(sourceDiameterMm * 2, SIZE_STEP_MM);
    var maxCoilHeightMm = Math.max(SIZE_STEP_MM, roundTo(sourceDiameterMm * 8, SIZE_STEP_MM));
    var turnCount = 6;
    // 폭·높이는 선택한 원에서 계산하므로 저장하지 않는다. 감는 횟수만 기억한다.
    var PREF_KEY = "ObjectCoilSpring/settings";
    applySavedSettings();
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    var dlg = new Window("dialog", "오브젝트 코일 스프링");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var sizePanel = dlg.add("panel", undefined, "크기");
    sizePanel.orientation = "column";
    sizePanel.alignChildren = "fill";

    var widthRow = sizePanel.add("group");
    widthRow.add("statictext", undefined, "좌우 폭");
    var widthInput = widthRow.add("edittext", undefined, formatNumber(coilWidthMm, 2));
    widthInput.characters = 8;
    widthRow.add("statictext", undefined, "mm");
    var widthSlider = addSliderWithSteps(sizePanel, coilWidthMm, SIZE_STEP_MM, maxCoilWidthMm, SIZE_STEP_MM);
    widthSlider.preferredSize.width = 266;
    widthSlider.stepdelta = SIZE_STEP_MM;

    var heightRow = sizePanel.add("group");
    heightRow.add("statictext", undefined, "위아래 높이");
    var heightInput = heightRow.add("edittext", undefined, formatNumber(coilHeightMm, 2));
    heightInput.characters = 8;
    heightRow.add("statictext", undefined, "mm");
    var heightSlider = addSliderWithSteps(sizePanel, coilHeightMm, SIZE_STEP_MM, maxCoilHeightMm, SIZE_STEP_MM);
    heightSlider.preferredSize.width = 266;
    heightSlider.stepdelta = SIZE_STEP_MM;

    var turnsPanel = dlg.add("panel", undefined, "코일");
    turnsPanel.orientation = "column";
    turnsPanel.alignChildren = "fill";
    var turnsRow = turnsPanel.add("group");
    turnsRow.add("statictext", undefined, "감는 횟수");
    var turnsInput = turnsRow.add("edittext", undefined, String(turnCount));
    turnsInput.characters = 6;
    turnsRow.add("statictext", undefined, "회  (5 ~ 10)");
    var turnsSlider = addSliderWithSteps(turnsPanel, turnCount, MIN_TURNS, MAX_TURNS, 1);
    turnsSlider.preferredSize.width = 266;
    turnsSlider.stepdelta = 1;

    var positionPanel = dlg.add("panel", undefined, "위치");
    positionPanel.orientation = "column";
    positionPanel.alignChildren = "left";
    var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmm);
    var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmm);
    // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindOffsetControls(offsetXControls, true);
    bindOffsetControls(offsetYControls, false);

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = buttons.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

    widthSlider.onChanging = function() {
        coilWidthMm = roundTo(widthSlider.value, SIZE_STEP_MM);
        widthInput.text = formatNumber(coilWidthMm, 2);
        updatePreview();
    };
    widthInput.onChanging = function() {
        var value = parseNumber(widthInput.text);
        if (value !== null && value >= SIZE_STEP_MM && value <= maxCoilWidthMm) {
            coilWidthMm = roundTo(value, SIZE_STEP_MM);
            widthSlider.value = coilWidthMm;
            updatePreview();
        }
    };
    widthInput.onChange = function() {
        coilWidthMm = normalizeSizeInput(widthInput, widthSlider, coilWidthMm, SIZE_STEP_MM, maxCoilWidthMm);
        updatePreview();
    };

    heightSlider.onChanging = function() {
        coilHeightMm = roundTo(heightSlider.value, SIZE_STEP_MM);
        heightInput.text = formatNumber(coilHeightMm, 2);
        updatePreview();
    };
    heightInput.onChanging = function() {
        var value = parseNumber(heightInput.text);
        if (value !== null && value >= SIZE_STEP_MM && value <= maxCoilHeightMm) {
            coilHeightMm = roundTo(value, SIZE_STEP_MM);
            heightSlider.value = coilHeightMm;
            updatePreview();
        }
    };
    heightInput.onChange = function() {
        coilHeightMm = normalizeSizeInput(heightInput, heightSlider, coilHeightMm, SIZE_STEP_MM, maxCoilHeightMm);
        updatePreview();
    };

    turnsSlider.onChanging = function() {
        turnCount = Math.round(turnsSlider.value);
        turnsInput.text = String(turnCount);
        updatePreview();
    };
    turnsInput.onChanging = function() {
        var value = parseNumber(turnsInput.text);
        if (value !== null && value >= MIN_TURNS && value <= MAX_TURNS) {
            turnCount = Math.round(value);
            turnsSlider.value = turnCount;
            updatePreview();
        }
    };
    turnsInput.onChange = function() {
        turnCount = normalizeIntegerInput(turnsInput, turnsSlider, turnCount, MIN_TURNS, MAX_TURNS);
        updatePreview();
    };

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        var validWidth = parseNumber(widthInput.text);
        var validHeight = parseNumber(heightInput.text);
        var validTurns = parseNumber(turnsInput.text);
        if (validWidth === null || validWidth < SIZE_STEP_MM || validWidth > maxCoilWidthMm) {
            alert("좌우 폭은 " + formatNumber(SIZE_STEP_MM, 2) + "mm부터 " +
                formatNumber(maxCoilWidthMm, 2) + "mm 사이로 입력해주세요.");
            return;
        }
        if (validHeight === null || validHeight < SIZE_STEP_MM || validHeight > maxCoilHeightMm) {
            alert("위아래 높이는 " + formatNumber(SIZE_STEP_MM, 2) + "mm부터 " +
                formatNumber(maxCoilHeightMm, 2) + "mm 사이로 입력해주세요.");
            return;
        }
        if (validTurns === null || validTurns < MIN_TURNS || validTurns > MAX_TURNS) {
            alert("코일 감는 횟수는 5부터 10 사이의 정수로 입력해주세요.");
            return;
        }
        coilWidthMm = roundTo(validWidth, SIZE_STEP_MM);
        coilHeightMm = roundTo(validHeight, SIZE_STEP_MM);
        turnCount = Math.round(validTurns);
        saveSettings();
        dlg.close(1);
    };

    cancelButton.onClick = function() { dlg.close(0); };

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY,
                ["v2", turnCount, offsetXmm, offsetYmm].join("|"));
        } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if ((p[0] !== "v1" && p[0] !== "v2") || p.length < 2) return;
        var turns = parseInt(p[1], 10);
        if (turns >= MIN_TURNS && turns <= MAX_TURNS) turnCount = turns;
        if (p[0] === "v2" && p.length >= 4) {
            var offX = parseFloat(p[2]);
            var offY = parseFloat(p[3]);
            if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
            if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
        }
    }

    source.hidden = true;
    source.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        source.hidden = false;
        var finalGroup = createCoilSpring();
        moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        finalGroup.name = "Coil Spring";
        try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        source.remove();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createCoilSpring();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        previewGroup.name = "Coil Spring Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    // 슬라이더 양옆 ◀▶: step만큼 옮기고 드래그와 같은 onChanging 핸들러를 부른다
    function addSliderWithSteps(parent, value, minimum, maximum, step) {
        var row = parent.add("group");
        row.spacing = 3;
        row.alignChildren = ["left", "center"];
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
        function nudge(delta) {
            var next = Math.min(maximum, Math.max(minimum, Math.round((slider.value + delta) / step) * step));
            if (next === slider.value) return;
            slider.value = next;
            if (slider.onChanging) slider.onChanging();
            if (slider.onChange) slider.onChange();
        }
        minus.onClick = function() { nudge(-step); };
        plus.onClick = function() { nudge(step); };
        return slider;
    }

    // 위치 행: 라벨 · 입력칸 · 단위 · 화살표 버튼 · 슬라이더
    function addOffsetControls(parent, label, value) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = 70;
        var input = row.add("edittext", undefined, formatNumber(value, 1));
        input.characters = 6;
        row.add("statictext", undefined, "mm");
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value,
            -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        slider.preferredSize.width = 140;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;
        return {input: input, slider: slider, down: down, up: up};
    }

    // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindOffsetControls(controls, isX) {
        function current() { return isX ? offsetXmm : offsetYmm; }
        function commit(value) {
            if (value === null || !isFinite(value)) return;
            value = clamp(roundTo(value, OFFSET_STEP_MM), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var delta = (value - current()) * MM_TO_PT;
            if (isX) offsetXmm = value;
            else offsetYmm = value;
            controls.input.text = formatNumber(value, 1);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0 || previewGroup === null) return;
            moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? current() : value);
        };
        controls.down.onClick = function() { commit(current() - OFFSET_STEP_MM); };
        controls.up.onClick = function() { commit(current() + OFFSET_STEP_MM); };
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function createCoilSpring() {
        var group = source.layer.groupItems.add();
        var width = coilWidthMm * MM_TO_PT;
        var height = coilHeightMm * MM_TO_PT;
        var radiusX = width / 2;
        var pitch = height / turnCount;
        var ellipseHeight = Math.min(width * 0.32, pitch * 0.82);
        var radiusY = Math.max(LINE_WIDTH_PT * 3, ellipseHeight / 2);
        var topY = centerY + height / 2;
        var bottomY = centerY - height / 2;
        var startY = topY - radiusY;
        var endY = bottomY + radiusY;

        drawCoilSpringPath(group, radiusX, radiusY, topY, startY, endY, bottomY);
        return group;
    }

    function drawCoilSpringPath(group, radiusX, radiusY, topY, startY, endY, bottomY) {
        var startT = Math.PI / 2;
        var endT = startT + Math.PI * 2 * (turnCount - 0.5);
        var span = endT - startT;
        var segmentCount = Math.max(16, turnCount * 8);
        var delta = span / segmentCount;
        var baselineStartY = startY - radiusY * Math.sin(startT);
        var baselineEndY = endY - radiusY * Math.sin(endT);
        var ySlope = (baselineEndY - baselineStartY) / span;
        var handleFactor = 4 / 3 * Math.tan(delta / 4);
        var path = group.pathItems.add();
        var anchors = [];
        var derivatives = [];
        var i;
        anchors.push([centerX, topY]);
        derivatives.push(null);
        for (i = 0; i <= segmentCount; i++) {
            var t = startT + delta * i;
            anchors.push([
                centerX + radiusX * Math.cos(t),
                baselineStartY + ySlope * (t - startT) + radiusY * Math.sin(t)
            ]);
            derivatives.push({
                x: -radiusX * Math.sin(t),
                y: ySlope + radiusY * Math.cos(t)
            });
        }
        anchors.push([centerX, bottomY]);
        derivatives.push(null);
        path.setEntirePath(anchors);
        path.closed = false;
        path.filled = false;
        applyStroke(path);

        for (i = 1; i < anchors.length - 1; i++) {
            var anchor = anchors[i];
            var left = anchor;
            var right = anchor;
            if (i > 1) {
                left = [
                    anchor[0] - derivatives[i].x * handleFactor,
                    anchor[1] - derivatives[i].y * handleFactor
                ];
            }
            if (i < anchors.length - 2) {
                right = [
                    anchor[0] + derivatives[i].x * handleFactor,
                    anchor[1] + derivatives[i].y * handleFactor
                ];
            }
            setSmooth(path.pathPoints[i], left, right);
        }
        path.pathPoints[0].pointType = PointType.CORNER;
        path.pathPoints[1].pointType = PointType.CORNER;
        path.pathPoints[path.pathPoints.length - 2].pointType = PointType.CORNER;
        path.pathPoints[path.pathPoints.length - 1].pointType = PointType.CORNER;
        return path;
    }

    function setSmooth(point, left, right) {
        point.leftDirection = left;
        point.rightDirection = right;
        point.pointType = PointType.SMOOTH;
    }

    function applyStroke(path) {
        path.stroked = true;
        path.strokeWidth = LINE_WIDTH_PT;
        if (source.stroked) {
            try { path.strokeColor = source.strokeColor; } catch(e) {}
            try { path.strokeDashes = source.strokeDashes; } catch(e2) {}
            try { path.strokeDashOffset = source.strokeDashOffset; } catch(e3) {}
            try { path.strokeCap = source.strokeCap; } catch(e4) {}
            try { path.strokeJoin = source.strokeJoin; } catch(e5) {}
            try { path.strokeMiterLimit = source.strokeMiterLimit; } catch(e6) {}
        } else {
            try { path.strokeColor = doc.defaultStrokeColor; } catch(e7) {}
        }
        try { path.opacity = source.opacity; } catch(e8) {}
    }

    function normalizeSizeInput(input, slider, fallback, minimum, maximum) {
        var value = parseNumber(input.text);
        if (value === null) value = fallback;
        value = clamp(roundTo(value, SIZE_STEP_MM), minimum, maximum);
        input.text = formatNumber(value, 2);
        slider.value = value;
        return value;
    }

    function normalizeIntegerInput(input, slider, fallback, minimum, maximum) {
        var value = parseNumber(input.text);
        if (value === null) value = fallback;
        value = clamp(Math.round(value), minimum, maximum);
        input.text = String(value);
        slider.value = value;
        return value;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function formatNumber(value, decimals) {
        return String(Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals));
    }

    function roundTo(value, step) {
        return Math.round(value / step) * step;
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

    function hasCircularPathPoints(item) {
        if (!item.pathPoints || item.pathPoints.length !== 4) return false;
        for (var i = 0; i < item.pathPoints.length; i++) {
            var point = item.pathPoints[i];
            var leftIsAnchor = point.leftDirection[0] === point.anchor[0] &&
                point.leftDirection[1] === point.anchor[1];
            var rightIsAnchor = point.rightDirection[0] === point.anchor[0] &&
                point.rightDirection[1] === point.anchor[1];
            if (leftIsAnchor && rightIsAnchor) return false;
        }
        return true;
    }
})();
