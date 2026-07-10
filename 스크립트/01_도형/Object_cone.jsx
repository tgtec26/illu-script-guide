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
    var faceK = [0, 0];
    var activeFace = FACE_TOP;
    var K_STEP = 10;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    var dlg = new Window("dialog", "오브젝트 콘");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var sizePanel = dlg.add("panel", undefined, "크기");
    sizePanel.orientation = "column";
    sizePanel.alignChildren = "fill";

    var baseRow = sizePanel.add("group");
    baseRow.add("statictext", undefined, "밑면 지름");
    var baseInput = baseRow.add("edittext", undefined, formatNumber(baseDiameterMm, 2));
    baseInput.characters = 8;
    baseRow.add("statictext", undefined, "mm");
    var baseSlider = sizePanel.add("slider", undefined, baseDiameterMm, SIZE_STEP_MM, maxBaseDiameterMm);
    baseSlider.preferredSize.width = 380;
    baseSlider.stepdelta = SIZE_STEP_MM;

    var topRow = sizePanel.add("group");
    topRow.add("statictext", undefined, "윗면 지름");
    var topInput = topRow.add("edittext", undefined, formatNumber(topDiameterMm, 2));
    topInput.characters = 8;
    topRow.add("statictext", undefined, "mm");
    var topSlider = sizePanel.add("slider", undefined, topDiameterMm, 0, baseDiameterMm);
    topSlider.preferredSize.width = 380;
    topSlider.stepdelta = SIZE_STEP_MM;

    var heightRow = sizePanel.add("group");
    heightRow.add("statictext", undefined, "높이");
    var heightInput = heightRow.add("edittext", undefined, formatNumber(heightMm, 2));
    heightInput.characters = 8;
    heightRow.add("statictext", undefined, "mm");
    var heightSlider = sizePanel.add("slider", undefined, heightMm, SIZE_STEP_MM, maxHeightMm);
    heightSlider.preferredSize.width = 380;
    heightSlider.stepdelta = SIZE_STEP_MM;

    var divisionPanel = dlg.add("panel", undefined, "분할선");
    divisionPanel.orientation = "column";
    divisionPanel.alignChildren = "fill";
    var divisionRow = divisionPanel.add("group");
    divisionRow.add("statictext", undefined, "분할선 수");
    var divisionInput = divisionRow.add("edittext", undefined, String(divisionCount));
    divisionInput.characters = 6;
    divisionRow.add("statictext", undefined, "개  (0 = 없음, 1 = 1/2, 2 = 1/3·2/3)");
    var divisionSlider = divisionPanel.add("slider", undefined, divisionCount, 0, 24);
    divisionSlider.preferredSize.width = 380;
    divisionSlider.stepdelta = 1;

    var viewPanel = dlg.add("panel", undefined, "콘을 바라보는 시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var xControls = addAngleControls(viewPanel, "X축", viewX);
    var yControls = addAngleControls(viewPanel, "Y축", viewY);
    var zControls = addAngleControls(viewPanel, "Z축", viewZ);

    var colorPanel = dlg.add("panel", undefined, "컬러");
    colorPanel.orientation = "column";
    colorPanel.alignChildren = "fill";
    var faceRow = colorPanel.add("group");
    var topFaceRadio = faceRow.add("radiobutton", undefined, "윗면");
    var sideFaceRadio = faceRow.add("radiobutton", undefined, "옆면");
    topFaceRadio.value = true;

    var kRow = colorPanel.add("group");
    var kDownButton = kRow.add("button", undefined, "◀");
    kDownButton.preferredSize.width = 40;
    var kValueText = kRow.add("statictext", undefined, "0K");
    kValueText.preferredSize.width = 60;
    kValueText.justify = "center";
    var kUpButton = kRow.add("button", undefined, "▶");
    kUpButton.preferredSize.width = 40;

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    var okButton = buttons.add("button", undefined, "확인", {name: "ok"});
    var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

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

    divisionSlider.onChanging = function() {
        divisionCount = Math.round(divisionSlider.value);
        divisionInput.text = String(divisionCount);
        updatePreview();
    };
    divisionInput.onChanging = function() {
        var value = parseNumber(divisionInput.text);
        if (value !== null && value >= 0 && value <= 24) {
            divisionCount = Math.round(value);
            divisionSlider.value = divisionCount;
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

    function addAngleControls(parent, label, value) {
        var row = parent.add("group");
        row.add("statictext", undefined, label);
        var input = row.add("edittext", undefined, formatSignedAngle(value));
        input.characters = 7;
        row.add("statictext", undefined, "°  (-180 ~ +180)");
        var slider = parent.add("slider", undefined, value, -180, 180);
        slider.preferredSize.width = 380;
        return {input: input, slider: slider};
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
        var basePoints = makeProjectedRing(0, baseRadius);
        var topPoints = makeProjectedRing(coneHeight, topRadius);
        var hullInput = [];
        var i;
        for (i = 0; i < basePoints.length; i++) hullInput.push(basePoints[i]);
        for (i = 0; i < topPoints.length; i++) hullInput.push(topPoints[i]);
        var hull = convexHull(hullInput);

        var side = makePath(group, hull, true);
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
            var topFace = makeSmoothClosedPath(group, topPoints);
            topFace.name = "Cone Top";
            applyFill(topFace, faceK[FACE_TOP]);
            copyStrokeStyle(source, topFace);
        }
        if (baseNormal.z > 0.0001) {
            var baseFace = makeSmoothClosedPath(group, basePoints);
            baseFace.name = "Cone Bottom";
            applySourceFill(baseFace);
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
            var point = rotatePoint(
                ringRadius * Math.cos(angle),
                axisHeight,
                ringRadius * Math.sin(angle)
            );
            var normal = rotatePoint(Math.cos(angle), sideSlope, Math.sin(angle));
            samples.push({
                x: centerX + point.x,
                y: centerY + point.y,
                visibility: normal.z
            });
        }
        drawVisibleDivisionSamples(group, samples);
    }

    function drawVisibleDivisionSamples(group, samples) {
        var invisibleIndex = -1;
        var i;
        for (i = 0; i < samples.length; i++) {
            if (samples[i].visibility < 0) {
                invisibleIndex = i;
                break;
            }
        }
        if (invisibleIndex < 0) {
            var closedLine = makeSmoothClosedPath(group, samples);
            closedLine.filled = false;
            copyStrokeStyle(source, closedLine);
            return;
        }

        var current = null;
        var count = samples.length;
        for (i = 0; i < count; i++) {
            var a = samples[(invisibleIndex + i) % count];
            var b = samples[(invisibleIndex + i + 1) % count];
            var aVisible = a.visibility >= 0;
            var bVisible = b.visibility >= 0;
            if (!aVisible && bVisible) {
                current = [interpolateVisibilityEdge(a, b), b];
            } else if (aVisible && bVisible) {
                if (current === null) current = [a];
                current.push(b);
            } else if (aVisible && !bVisible) {
                if (current === null) current = [a];
                current.push(interpolateVisibilityEdge(a, b));
                var visibleLine = makeSmoothOpenPath(group, current);
                copyStrokeStyle(source, visibleLine);
                current = null;
            }
        }
    }

    function interpolateVisibilityEdge(a, b) {
        var denominator = a.visibility - b.visibility;
        var amount = Math.abs(denominator) < 0.0000001 ? 0 : a.visibility / denominator;
        return {
            x: a.x + (b.x - a.x) * amount,
            y: a.y + (b.y - a.y) * amount,
            visibility: 0
        };
    }

    function makeProjectedRing(axisHeight, ringRadius) {
        var points = [];
        var steps = ringRadius < 0.001 ? 1 : 72;
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
                z: rotated.z
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

    function makeSmoothClosedPath(group, points) {
        var path = makePath(group, points, true);
        var count = path.pathPoints.length;
        for (var i = 0; i < count; i++) {
            var previous = points[(i - 1 + count) % count];
            var next = points[(i + 1) % count];
            var anchor = path.pathPoints[i].anchor;
            var dx = (next.x - previous.x) / 6;
            var dy = (next.y - previous.y) / 6;
            path.pathPoints[i].leftDirection = [anchor[0] - dx, anchor[1] - dy];
            path.pathPoints[i].rightDirection = [anchor[0] + dx, anchor[1] + dy];
            path.pathPoints[i].pointType = PointType.SMOOTH;
        }
        return path;
    }

    function makeSmoothOpenPath(group, points) {
        var path = makePath(group, points, false);
        path.filled = false;
        var count = path.pathPoints.length;
        for (var i = 0; i < count; i++) {
            var anchor = path.pathPoints[i].anchor;
            var left = anchor;
            var right = anchor;
            if (i > 0 && i < count - 1) {
                var dx = (points[i + 1].x - points[i - 1].x) / 6;
                var dy = (points[i + 1].y - points[i - 1].y) / 6;
                left = [anchor[0] - dx, anchor[1] - dy];
                right = [anchor[0] + dx, anchor[1] + dy];
            } else if (i < count - 1) {
                right = [anchor[0] + (points[i + 1].x - points[i].x) / 3,
                    anchor[1] + (points[i + 1].y - points[i].y) / 3];
            } else if (i > 0) {
                left = [anchor[0] - (points[i].x - points[i - 1].x) / 3,
                    anchor[1] - (points[i].y - points[i - 1].y) / 3];
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

    function applySourceFill(item) {
        item.filled = source.filled;
        if (source.filled) {
            try { item.fillColor = source.fillColor; } catch(e) {}
        }
        try { item.opacity = source.opacity; } catch(e2) {}
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
