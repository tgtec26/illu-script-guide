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

    var MM_TO_PT = 2.83464567;
    var SIZE_STEP_MM = 0.05;
    var LINE_WIDTH_PT = 0.3;
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
    var widthSlider = sizePanel.add("slider", undefined, coilWidthMm, SIZE_STEP_MM, maxCoilWidthMm);
    widthSlider.preferredSize.width = 380;
    widthSlider.stepdelta = SIZE_STEP_MM;

    var heightRow = sizePanel.add("group");
    heightRow.add("statictext", undefined, "위아래 높이");
    var heightInput = heightRow.add("edittext", undefined, formatNumber(coilHeightMm, 2));
    heightInput.characters = 8;
    heightRow.add("statictext", undefined, "mm");
    var heightSlider = sizePanel.add("slider", undefined, coilHeightMm, SIZE_STEP_MM, maxCoilHeightMm);
    heightSlider.preferredSize.width = 380;
    heightSlider.stepdelta = SIZE_STEP_MM;

    var turnsPanel = dlg.add("panel", undefined, "코일");
    turnsPanel.orientation = "column";
    turnsPanel.alignChildren = "fill";
    var turnsRow = turnsPanel.add("group");
    turnsRow.add("statictext", undefined, "감는 횟수");
    var turnsInput = turnsRow.add("edittext", undefined, String(turnCount));
    turnsInput.characters = 6;
    turnsRow.add("statictext", undefined, "회  (5 ~ 10)");
    var turnsSlider = turnsPanel.add("slider", undefined, turnCount, MIN_TURNS, MAX_TURNS);
    turnsSlider.preferredSize.width = 380;
    turnsSlider.stepdelta = 1;

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    var okButton = buttons.add("button", undefined, "확인", {name: "ok"});
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
        dlg.close(1);
    };

    cancelButton.onClick = function() { dlg.close(0); };

    source.hidden = true;
    source.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        source.hidden = false;
        var finalGroup = createCoilSpring();
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
        previewGroup.name = "Coil Spring Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
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
