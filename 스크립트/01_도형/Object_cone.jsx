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
    var diameter = bounds[2] - bounds[0];
    var sourceHeight = bounds[1] - bounds[3];
    if (diameter <= 0 ||
            Math.abs(diameter - sourceHeight) > Math.max(0.1, diameter * 0.01) ||
            !hasCircularPathPoints(source)) {
        alert("가로와 세로 크기가 같은 원을 선택해주세요.");
        return;
    }

    var MM_TO_PT = 2.83464567;
    var SIZE_STEP_MM = 0.05;
    var LINE_WIDTH_PT = 0.3;
    var RING_SAMPLE_COUNT = 24;
    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;
    var diameterMm = diameter / MM_TO_PT;
    var baseDiameterMm = roundTo(diameterMm, SIZE_STEP_MM);
    var maxBaseDiameterMm = Math.max(SIZE_STEP_MM, roundTo(diameterMm * 5, SIZE_STEP_MM));
    var topDiameterMm = 0;
    var heightMm = roundTo(diameterMm, SIZE_STEP_MM);
    var maxHeightMm = Math.max(SIZE_STEP_MM, roundTo(diameterMm * 5, SIZE_STEP_MM));
    var viewX = 20;
    var viewY = 0;
    var viewZ = 0;
    var divisionCount = 0;
    var FACE_TOP = 0;
    var FACE_SIDE = 1;
    var FACE_BOTTOM = 2;
    var faceK = [0, 0, 0];
    var activeFace = FACE_TOP;
    var K_STEP = 10;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    // 크기는 선택한 원에서 계산하므로 저장하지 않는다. 시점·분할선·컬러만 기억한다.
    var PREF_KEY = "ObjectCone/settings";
    applySavedSettings();

    var LABEL_WIDTH = 58;
    var SLIDER_WIDTH = 200;
    var STEP_BUTTON_WIDTH = 30;

    var dlg = new Window("dialog", "오브젝트 콘");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var sizePanel = addPanel(dlg, "크기");
    var baseControls = addSizeRow(sizePanel, "밑면 지름", baseDiameterMm, SIZE_STEP_MM, maxBaseDiameterMm);
    var baseInput = baseControls.input;
    var baseSlider = baseControls.slider;
    var topControls = addSizeRow(sizePanel, "윗면 지름", topDiameterMm, 0, baseDiameterMm);
    var topInput = topControls.input;
    var topSlider = topControls.slider;
    var heightControls = addSizeRow(sizePanel, "높이", heightMm, SIZE_STEP_MM, maxHeightMm);
    var heightInput = heightControls.input;
    var heightSlider = heightControls.slider;

    var viewPanel = addPanel(dlg, "시점");
    var xControls = addAngleControls(viewPanel, "X축", viewX);
    var yControls = addAngleControls(viewPanel, "Y축", viewY);
    var zControls = addAngleControls(viewPanel, "Z축", viewZ);

    var extraPanel = addPanel(dlg, "분할선 · 컬러");

    var divisionRow = extraPanel.add("group");
    divisionRow.alignChildren = ["left", "center"];
    var divisionLabel = divisionRow.add("statictext", undefined, "분할선");
    divisionLabel.preferredSize.width = LABEL_WIDTH;
    var divisionInput = divisionRow.add("edittext", undefined, String(divisionCount));
    divisionInput.characters = 4;
    divisionInput.justify = "center";
    var divisionDownButton = divisionRow.add("button", undefined, "◀");
    divisionDownButton.preferredSize.width = 22;
    var divisionSlider = divisionRow.add("slider", undefined, divisionCount, 0, 24);
    divisionSlider.preferredSize.width = SLIDER_WIDTH;
    var divisionUpButton = divisionRow.add("button", undefined, "▶");
    divisionUpButton.preferredSize.width = 22;

    var colorRow = extraPanel.add("group");
    colorRow.alignChildren = ["left", "center"];
    var colorLabel = colorRow.add("statictext", undefined, "컬러");
    colorLabel.preferredSize.width = LABEL_WIDTH;
    var topFaceRadio = colorRow.add("radiobutton", undefined, "윗면");
    var sideFaceRadio = colorRow.add("radiobutton", undefined, "옆면");
    var bottomFaceRadio = colorRow.add("radiobutton", undefined, "아랫면");
    topFaceRadio.value = true;
    var kDownButton = colorRow.add("button", undefined, "◀");
    kDownButton.preferredSize.width = STEP_BUTTON_WIDTH;
    var kValueText = colorRow.add("statictext", undefined, "0K");
    kValueText.preferredSize.width = 42;
    kValueText.justify = "center";
    var kUpButton = colorRow.add("button", undefined, "▶");
    kUpButton.preferredSize.width = STEP_BUTTON_WIDTH;
    updateKDisplay();

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인", {name: "ok"});
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    baseSlider.onChanging = function() {
        baseDiameterMm = roundTo(baseSlider.value, SIZE_STEP_MM);
        baseInput.text = formatNumber(baseDiameterMm, 2);
        updateTopDiameterLimit();
        updatePreview();
    };
    baseInput.onChanging = function() {
        var value = parseNumber(baseInput.text);
        if (value !== null && value >= SIZE_STEP_MM && value <= maxBaseDiameterMm) {
            baseDiameterMm = roundTo(value, SIZE_STEP_MM);
            baseSlider.value = baseDiameterMm;
            updateTopDiameterLimit();
            updatePreview();
        }
    };
    baseInput.onChange = function() {
        var value = parseNumber(baseInput.text);
        if (value === null) value = baseDiameterMm;
        baseDiameterMm = clamp(roundTo(value, SIZE_STEP_MM), SIZE_STEP_MM, maxBaseDiameterMm);
        baseInput.text = formatNumber(baseDiameterMm, 2);
        baseSlider.value = baseDiameterMm;
        updateTopDiameterLimit();
        updatePreview();
    };

    topSlider.onChanging = function() {
        topDiameterMm = roundTo(topSlider.value, SIZE_STEP_MM);
        topInput.text = formatNumber(topDiameterMm, 2);
        updatePreview();
    };
    topInput.onChanging = function() {
        var value = parseNumber(topInput.text);
        if (value !== null && value >= 0 && value <= baseDiameterMm) {
            topDiameterMm = roundTo(value, SIZE_STEP_MM);
            topSlider.value = topDiameterMm;
            updatePreview();
        }
    };
    topInput.onChange = function() {
        var value = parseNumber(topInput.text);
        if (value === null) value = topDiameterMm;
        topDiameterMm = clamp(roundTo(value, SIZE_STEP_MM), 0, baseDiameterMm);
        topInput.text = formatNumber(topDiameterMm, 2);
        topSlider.value = topDiameterMm;
        updatePreview();
    };

    heightSlider.onChanging = function() {
        heightMm = roundTo(heightSlider.value, SIZE_STEP_MM);
        heightInput.text = formatNumber(heightMm, 2);
        updatePreview();
    };
    heightInput.onChanging = function() {
        var value = parseNumber(heightInput.text);
        if (value !== null && value > 0) {
            heightMm = roundTo(value, SIZE_STEP_MM);
            heightSlider.value = clamp(heightMm, SIZE_STEP_MM, maxHeightMm);
            updatePreview();
        }
    };
    heightInput.onChange = function() {
        var value = parseNumber(heightInput.text);
        if (value === null || value <= 0) value = heightMm;
        heightMm = Math.max(SIZE_STEP_MM, roundTo(value, SIZE_STEP_MM));
        heightInput.text = formatNumber(heightMm, 2);
        heightSlider.value = clamp(heightMm, SIZE_STEP_MM, maxHeightMm);
        updatePreview();
    };

    divisionInput.onChanging = function() {
        var value = parseNumber(divisionInput.text);
        if (value !== null && value >= 0 && value <= 24) {
            divisionCount = Math.round(value);
            updatePreview();
        }
    };
    divisionInput.onChange = function() {
        var value = parseNumber(divisionInput.text);
        if (value === null) value = divisionCount;
        divisionCount = clamp(Math.round(value), 0, 24);
        divisionInput.text = String(divisionCount);
        divisionSlider.value = divisionCount;
        updatePreview();
    };
    divisionSlider.onChanging = function() {
        divisionCount = clamp(Math.round(divisionSlider.value), 0, 24);
        divisionInput.text = String(divisionCount);
        updatePreview();
    };
    divisionDownButton.onClick = function() { stepDivision(-1); };
    divisionUpButton.onClick = function() { stepDivision(1); };

    function stepDivision(delta) {
        divisionCount = clamp(divisionCount + delta, 0, 24);
        divisionInput.text = String(divisionCount);
        divisionSlider.value = divisionCount;
        updatePreview();
    }

    bindViewControls(xControls, function(value) { viewX = value; }, function() { return viewX; });
    bindViewControls(yControls, function(value) { viewY = value; }, function() { return viewY; });
    bindViewControls(zControls, function(value) { viewZ = value; }, function() { return viewZ; });

    topFaceRadio.onClick = function() {
        activeFace = FACE_TOP;
        updateKDisplay();
    };
    sideFaceRadio.onClick = function() {
        activeFace = FACE_SIDE;
        updateKDisplay();
    };
    bottomFaceRadio.onClick = function() {
        activeFace = FACE_BOTTOM;
        updateKDisplay();
    };
    kDownButton.onClick = function() { stepK(-K_STEP); };
    kUpButton.onClick = function() { stepK(K_STEP); };

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        var validBase = parseNumber(baseInput.text);
        var validTop = parseNumber(topInput.text);
        var validHeight = parseNumber(heightInput.text);
        var validDivision = parseNumber(divisionInput.text);
        if (validBase === null || validBase < SIZE_STEP_MM || validBase > maxBaseDiameterMm) {
            alert("밑면 지름은 " + formatNumber(SIZE_STEP_MM, 2) + "mm부터 " +
                formatNumber(maxBaseDiameterMm, 2) + "mm 사이로 입력해주세요.");
            return;
        }
        if (validTop === null || validTop < 0 || validTop > validBase) {
            alert("윗면 지름은 0 이상, 밑면 지름 이하로 입력해주세요.");
            return;
        }
        if (validHeight === null || validHeight <= 0) {
            alert("높이는 0보다 큰 숫자로 입력해주세요.");
            return;
        }
        if (validDivision === null || validDivision < 0 || validDivision > 24) {
            alert("분할선 수는 0부터 24 사이의 정수로 입력해주세요.");
            return;
        }
        if (!commitAngleInput(xControls.input, function(value) { viewX = value; }) ||
                !commitAngleInput(yControls.input, function(value) { viewY = value; }) ||
                !commitAngleInput(zControls.input, function(value) { viewZ = value; })) {
            alert("회전 각도는 -180부터 +180 사이로 입력해주세요.");
            return;
        }
        baseDiameterMm = clamp(roundTo(validBase, SIZE_STEP_MM), SIZE_STEP_MM, maxBaseDiameterMm);
        topDiameterMm = clamp(roundTo(validTop, SIZE_STEP_MM), 0, baseDiameterMm);
        heightMm = Math.max(SIZE_STEP_MM, roundTo(validHeight, SIZE_STEP_MM));
        divisionCount = clamp(Math.round(validDivision), 0, 24);
        saveSettings();
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
        var finalGroup = createCone();
        finalGroup.name = "Cone";
        try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        source.remove();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    function saveSettings() {
        var parts = ["v1", viewX, viewY, viewZ, divisionCount, faceK[0], faceK[1], faceK[2]];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 8) return;
        viewX = restoreNumber(p[1], viewX, -180, 180);
        viewY = restoreNumber(p[2], viewY, -180, 180);
        viewZ = restoreNumber(p[3], viewZ, -180, 180);
        divisionCount = Math.round(restoreNumber(p[4], divisionCount, 0, 24));
        for (var i = 0; i < 3; i++) {
            faceK[i] = Math.round(restoreNumber(p[5 + i], faceK[i], 0, 100));
        }
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨 · 입력칸 · 단위 · 슬라이더를 한 줄에 배치
    function addValueRow(parent, label, unit, value, minimum, maximum, step, hasReset) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label);
        // 0 버튼이 붙는 줄은 라벨을 줄여서 다른 줄과 폭을 맞춘다
        labelText.preferredSize.width = hasReset ? (LABEL_WIDTH - 32) : LABEL_WIDTH;
        var reset = null;
        if (hasReset) {
            reset = row.add("button", undefined, "0");
            reset.preferredSize.width = 22;
        }
        var input = row.add("edittext", undefined, value);
        input.characters = 6;
        input.justify = "right";
        row.add("statictext", undefined, unit);
        var slider = row.add("slider", undefined, Number(value), minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        slider.stepdelta = step;
        return {input: input, slider: slider, reset: reset};
    }

    function addSizeRow(parent, label, value, minimum, maximum) {
        return addValueRow(parent, label, "mm", formatNumber(value, 2), minimum, maximum, SIZE_STEP_MM);
    }

    function addAngleControls(parent, label, value) {
        return addValueRow(parent, label, "°", formatSignedAngle(value), -180, 180, 1, true);
    }

    function bindViewControls(controls, setter, getter) {
        controls.slider.onChanging = function() {
            var value = Math.round(controls.slider.value);
            setter(value);
            controls.input.text = formatSignedAngle(value);
            updatePreview();
        };
        controls.input.onChanging = function() {
            var value = parseNumber(controls.input.text);
            if (value !== null && value >= -180 && value <= 180) {
                setter(value);
                controls.slider.value = value;
                updatePreview();
            }
        };
        controls.input.onChange = function() {
            var value = normalizeAngleInput(controls.input, controls.slider, getter());
            setter(value);
            updatePreview();
        };
        if (controls.reset) {
            controls.reset.onClick = function() {
                setter(0);
                controls.input.text = formatSignedAngle(0);
                controls.slider.value = 0;
                updatePreview();
            };
        }
    }

    function updateKDisplay() {
        kValueText.text = faceK[activeFace] + "K";
    }

    function updateTopDiameterLimit() {
        try { topSlider.maxvalue = baseDiameterMm; } catch(e) {}
        if (topDiameterMm <= baseDiameterMm) return;
        topDiameterMm = baseDiameterMm;
        topInput.text = formatNumber(topDiameterMm, 2);
        topSlider.value = topDiameterMm;
    }


    function stepK(delta) {
        faceK[activeFace] = clamp(faceK[activeFace] + delta, 0, 100);
        updateKDisplay();
        updatePreview();
    }

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createCone();
        previewGroup.name = "Cone Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function createCone() {
        var group = source.layer.groupItems.add();
        var baseRadius = baseDiameterMm * MM_TO_PT / 2;
        var topRadius = topDiameterMm * MM_TO_PT / 2;
        var coneHeight = heightMm * MM_TO_PT;
        var basePoints = makeProjectedRing(0, baseRadius, 0);
        var topPoints = makeProjectedRing(coneHeight, topRadius, 1);
        var hullInput = [];
        var i;
        for (i = 0; i < basePoints.length; i++) hullInput.push(basePoints[i]);
        for (i = 0; i < topPoints.length; i++) hullInput.push(topPoints[i]);
        var hull = convexHull(hullInput);

        var side = makeSmoothHullPath(group, hull);
        side.name = "Cone Side";
        applyFill(side, faceK[FACE_SIDE]);
        copyStrokeStyle(source, side);

        var sideSlope = coneHeight > 0 ? (baseRadius - topRadius) / coneHeight : 0;
        for (i = 1; i <= divisionCount; i++) {
            var fraction = i / (divisionCount + 1);
            var divisionHeight = coneHeight * fraction;
            var divisionRadius = baseRadius + (topRadius - baseRadius) * fraction;
            drawDivisionRing(group, divisionHeight, divisionRadius, sideSlope);
        }

        var topNormal = rotatePoint(0, 1, 0);
        var baseNormal = rotatePoint(0, -1, 0);
        if (topRadius > 0.001 && topNormal.z > 0.0001) {
            var topFace = makeRingBezierPath(group, coneHeight, topRadius, 0, 2 * Math.PI, true);
            topFace.name = "Cone Top";
            applyFill(topFace, faceK[FACE_TOP]);
            copyStrokeStyle(source, topFace);
        }
        if (baseNormal.z > 0.0001) {
            var baseFace = makeRingBezierPath(group, 0, baseRadius, 0, 2 * Math.PI, true);
            baseFace.name = "Cone Bottom";
            applyFill(baseFace, faceK[FACE_BOTTOM]);
            copyStrokeStyle(source, baseFace);
        }
        return group;
    }

    function drawDivisionRing(group, axisHeight, ringRadius, sideSlope) {
        if (ringRadius < 0.001) return;
        var samples = [];
        var steps = 72;
        for (var i = 0; i < steps; i++) {
            var angle = 2 * Math.PI * i / steps;
            var normal = rotatePoint(Math.cos(angle), sideSlope, Math.sin(angle));
            samples.push({
                angle: angle,
                visibility: normal.z
            });
        }
        drawVisibleDivisionSamples(group, samples, axisHeight, ringRadius);
    }

    function drawVisibleDivisionSamples(group, samples, axisHeight, ringRadius) {
        var invisibleIndex = -1;
        var i;
        for (i = 0; i < samples.length; i++) {
            if (samples[i].visibility < 0) {
                invisibleIndex = i;
                break;
            }
        }
        if (invisibleIndex < 0) {
            var closedLine = makeRingBezierPath(group, axisHeight, ringRadius, 0, 2 * Math.PI, true);
            closedLine.filled = false;
            copyStrokeStyle(source, closedLine);
            return;
        }

        var startAngle = null;
        var count = samples.length;
        for (i = 0; i < count; i++) {
            var a = samples[(invisibleIndex + i) % count];
            var b = samples[(invisibleIndex + i + 1) % count];
            var aAngle = a.angle;
            var bAngle = b.angle;
            while (aAngle < samples[invisibleIndex].angle) aAngle += 2 * Math.PI;
            while (bAngle <= aAngle) bAngle += 2 * Math.PI;
            var aVisible = a.visibility >= 0;
            var bVisible = b.visibility >= 0;
            if (!aVisible && bVisible) {
                startAngle = interpolateVisibilityAngle(a, b, aAngle, bAngle);
            } else if (aVisible && !bVisible) {
                if (startAngle === null) startAngle = aAngle;
                var endAngle = interpolateVisibilityAngle(a, b, aAngle, bAngle);
                var visibleLine = makeRingBezierPath(
                    group,
                    axisHeight,
                    ringRadius,
                    startAngle,
                    endAngle,
                    false
                );
                copyStrokeStyle(source, visibleLine);
                startAngle = null;
            }
        }
    }

    function interpolateVisibilityAngle(a, b, aAngle, bAngle) {
        var denominator = a.visibility - b.visibility;
        var amount = Math.abs(denominator) < 0.0000001 ? 0 : a.visibility / denominator;
        return aAngle + (bAngle - aAngle) * amount;
    }

    function makeProjectedRing(axisHeight, ringRadius, ringId) {
        var points = [];
        var steps = ringRadius < 0.001 ? 1 : RING_SAMPLE_COUNT;
        for (var i = 0; i < steps; i++) {
            var angle = steps === 1 ? 0 : 2 * Math.PI * i / steps;
            var rotated = rotatePoint(
                ringRadius * Math.cos(angle),
                axisHeight,
                ringRadius * Math.sin(angle)
            );
            points.push({
                x: centerX + rotated.x,
                y: centerY + rotated.y,
                z: rotated.z,
                isApex: ringRadius < 0.001,
                ring: ringId
            });
        }
        return points;
    }

    function rotatePoint(x, y, z) {
        var rx = viewX * Math.PI / 180;
        var ry = viewY * Math.PI / 180;
        var rz = viewZ * Math.PI / 180;
        var cosine = Math.cos(rx);
        var sine = Math.sin(rx);
        var nextY = y * cosine - z * sine;
        var nextZ = y * sine + z * cosine;
        y = nextY;
        z = nextZ;

        cosine = Math.cos(ry);
        sine = Math.sin(ry);
        var nextX = x * cosine + z * sine;
        nextZ = -x * sine + z * cosine;
        x = nextX;
        z = nextZ;

        cosine = Math.cos(rz);
        sine = Math.sin(rz);
        nextX = x * cosine - y * sine;
        nextY = x * sine + y * cosine;
        return {x: nextX, y: nextY, z: z};
    }

    function convexHull(points) {
        if (points.length <= 2) return points;
        var sorted = points.slice(0);
        sorted.sort(function(a, b) {
            if (Math.abs(a.x - b.x) > 0.000001) return a.x - b.x;
            return a.y - b.y;
        });
        var lower = [];
        var upper = [];
        var i;
        for (i = 0; i < sorted.length; i++) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
                lower.pop();
            }
            lower.push(sorted[i]);
        }
        for (i = sorted.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
                upper.pop();
            }
            upper.push(sorted[i]);
        }
        lower.pop();
        upper.pop();
        return lower.concat(upper);
    }

    function cross(origin, a, b) {
        return (a.x - origin.x) * (b.y - origin.y) -
            (a.y - origin.y) * (b.x - origin.x);
    }

    function makePath(group, points, closed) {
        var path = group.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push([points[i].x, points[i].y]);
        path.setEntirePath(anchors);
        path.closed = closed;
        return path;
    }

    // 실루엣에서 서로 다른 링(또는 꼭짓점)을 잇는 구간은 원뿔의 모선이므로 직선으로 둔다
    function isSilhouetteEdge(a, b) {
        return a.isApex || b.isApex || a.ring !== b.ring;
    }

    function makeSmoothHullPath(group, points) {
        var path = makePath(group, points, true);
        var count = path.pathPoints.length;
        for (var i = 0; i < count; i++) {
            var previous = points[(i - 1 + count) % count];
            var next = points[(i + 1) % count];
            var current = points[i];
            var anchor = path.pathPoints[i].anchor;
            var leftIsStraight = isSilhouetteEdge(previous, current);
            var rightIsStraight = isSilhouetteEdge(current, next);

            if (current.isApex || (leftIsStraight && rightIsStraight)) {
                path.pathPoints[i].leftDirection = anchor;
                path.pathPoints[i].rightDirection = anchor;
                path.pathPoints[i].pointType = PointType.CORNER;
                continue;
            }

            // 접선 방향은 곡선 쪽 이웃만 사용한다.
            // 모선 끝점에서 반대쪽 꼭짓점까지의 긴 현을 쓰면 핸들이 과도하게 길어져 밑면이 부풀어 오른다.
            var tangentX, tangentY;
            if (leftIsStraight) {
                tangentX = next.x - current.x;
                tangentY = next.y - current.y;
            } else if (rightIsStraight) {
                tangentX = current.x - previous.x;
                tangentY = current.y - previous.y;
            } else {
                tangentX = (next.x - previous.x) / 2;
                tangentY = (next.y - previous.y) / 2;
            }

            var tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
            if (tangentLength < 0.000001) {
                path.pathPoints[i].leftDirection = anchor;
                path.pathPoints[i].rightDirection = anchor;
                path.pathPoints[i].pointType = PointType.CORNER;
                continue;
            }
            tangentX /= tangentLength;
            tangentY /= tangentLength;

            // 핸들 길이는 각 이웃까지의 실제 거리 기준(현의 1/3)
            var leftLength = leftIsStraight ? 0 : distanceBetween(current, previous) / 3;
            var rightLength = rightIsStraight ? 0 : distanceBetween(current, next) / 3;

            path.pathPoints[i].leftDirection = [
                anchor[0] - tangentX * leftLength,
                anchor[1] - tangentY * leftLength
            ];
            path.pathPoints[i].rightDirection = [
                anchor[0] + tangentX * rightLength,
                anchor[1] + tangentY * rightLength
            ];
            path.pathPoints[i].pointType =
                (leftIsStraight || rightIsStraight) ? PointType.CORNER : PointType.SMOOTH;
        }
        return path;
    }

    function distanceBetween(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function makeRingBezierPath(group, axisHeight, ringRadius, startAngle, endAngle, closed) {
        var span = endAngle - startAngle;
        var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)));
        var delta = span / segmentCount;
        var handleFactor = 4 / 3 * Math.tan(delta / 4);
        var anchorCount = closed ? segmentCount : segmentCount + 1;
        var points = [];
        var derivatives = [];
        var i;
        for (i = 0; i < anchorCount; i++) {
            var angle = startAngle + delta * i;
            var point = rotatePoint(
                ringRadius * Math.cos(angle),
                axisHeight,
                ringRadius * Math.sin(angle)
            );
            var derivative = rotatePoint(
                -ringRadius * Math.sin(angle),
                0,
                ringRadius * Math.cos(angle)
            );
            points.push({x: centerX + point.x, y: centerY + point.y});
            derivatives.push(derivative);
        }

        var path = makePath(group, points, closed);
        path.filled = false;
        var count = path.pathPoints.length;
        for (i = 0; i < count; i++) {
            var anchor = path.pathPoints[i].anchor;
            var left = anchor;
            var right = anchor;
            if (closed || i > 0) {
                left = [anchor[0] - derivatives[i].x * handleFactor,
                    anchor[1] - derivatives[i].y * handleFactor];
            }
            if (closed || i < count - 1) {
                right = [anchor[0] + derivatives[i].x * handleFactor,
                    anchor[1] + derivatives[i].y * handleFactor];
            }
            path.pathPoints[i].leftDirection = left;
            path.pathPoints[i].rightDirection = right;
            path.pathPoints[i].pointType = PointType.SMOOTH;
        }
        return path;
    }

    function makeKColor(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var gray = new GrayColor();
        gray.gray = k;
        return gray;
    }

    function applyFill(item, k) {
        item.filled = true;
        item.fillColor = makeKColor(k);
        try { item.opacity = source.opacity; } catch(e) {}
    }

    function copyStrokeStyle(from, to) {
        to.stroked = true;
        if (from.stroked) {
            try { to.strokeColor = from.strokeColor; } catch(e) {}
            try { to.strokeDashes = from.strokeDashes; } catch(e2) {}
            try { to.strokeDashOffset = from.strokeDashOffset; } catch(e3) {}
            try { to.strokeCap = from.strokeCap; } catch(e4) {}
            try { to.strokeJoin = from.strokeJoin; } catch(e5) {}
            try { to.strokeMiterLimit = from.strokeMiterLimit; } catch(e6) {}
        } else {
            try { to.strokeColor = doc.defaultStrokeColor; } catch(e7) {}
        }
        to.strokeWidth = LINE_WIDTH_PT;
    }

    function normalizeAngleInput(input, slider, fallback) {
        var value = parseNumber(input.text);
        if (value === null) value = fallback;
        value = clamp(value, -180, 180);
        input.text = formatSignedAngle(value);
        slider.value = value;
        return value;
    }

    function commitAngleInput(input, setter) {
        var value = parseNumber(input.text);
        if (value === null || value < -180 || value > 180) return false;
        setter(value);
        return true;
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

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function formatNumber(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    function formatSignedAngle(value) {
        var rounded = Math.round(value * 10) / 10;
        return (rounded > 0 ? "+" : "") + String(rounded);
    }

    function roundTo(value, step) {
        return Math.round(value / step) * step;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
})();
