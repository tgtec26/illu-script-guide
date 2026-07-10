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
    if (width <= 0 ||
            Math.abs(width - height) > Math.max(0.1, width * 0.01) ||
            !hasCircularPathPoints(source)) {
        alert("가로와 세로 크기가 같은 원을 선택해주세요.");
        return;
    }

    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;
    var radius = width / 2;
    var longitudeCount = 1;
    var latitudeCount = 1;
    var LINE_WIDTH_PT = 0.3;
    var gridRotation = 0;
    var viewX = 0;
    var viewY = 0;
    var viewZ = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    var dlg = new Window("dialog", "오브젝트 스피어");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var gridPanel = dlg.add("panel", undefined, "경도선과 위도선");
    gridPanel.orientation = "column";
    gridPanel.alignChildren = "fill";

    var longitudeRow = gridPanel.add("group");
    longitudeRow.add("statictext", undefined, "경도선 수");
    var longitudeInput = longitudeRow.add("edittext", undefined, String(longitudeCount));
    longitudeInput.characters = 6;
    longitudeRow.add("statictext", undefined, "개  (0 = 없음, 1 = 2등분, 2 = 4등분)");
    var longitudeSlider = gridPanel.add("slider", undefined, longitudeCount, 0, 24);
    longitudeSlider.preferredSize.width = 380;
    longitudeSlider.stepdelta = 1;

    var latitudeRow = gridPanel.add("group");
    latitudeRow.add("statictext", undefined, "위도선 수");
    var latitudeInput = latitudeRow.add("edittext", undefined, String(latitudeCount));
    latitudeInput.characters = 6;
    latitudeRow.add("statictext", undefined, "개  (0 = 없음, 1 ~ 5)");
    var latitudeSlider = gridPanel.add("slider", undefined, latitudeCount, 0, 5);
    latitudeSlider.preferredSize.width = 380;
    latitudeSlider.stepdelta = 1;
    gridPanel.add("statictext", undefined, "순서: 적도 → 북30° → 남30° → 북60° → 남60°");

    var rotationRow = gridPanel.add("group");
    rotationRow.add("statictext", undefined, "경도선 회전");
    var rotationInput = rotationRow.add("edittext", undefined, formatSignedAngle(gridRotation));
    rotationInput.characters = 7;
    rotationRow.add("statictext", undefined, "°  (-180 ~ +180)");
    var rotationSlider = gridPanel.add("slider", undefined, gridRotation, -180, 180);
    rotationSlider.preferredSize.width = 380;

    var viewPanel = dlg.add("panel", undefined, "구를 바라보는 시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var xControls = addAngleControls(viewPanel, "X축", viewX);
    var yControls = addAngleControls(viewPanel, "Y축", viewY);
    var zControls = addAngleControls(viewPanel, "Z축", viewZ);

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    var okButton = buttons.add("button", undefined, "확인", {name: "ok"});
    var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

    longitudeSlider.onChanging = function() {
        longitudeCount = Math.round(longitudeSlider.value);
        longitudeInput.text = String(longitudeCount);
        updatePreview();
    };
    longitudeInput.onChanging = function() {
        var value = parseNumber(longitudeInput.text);
        if (value !== null && value >= 0 && value <= 24) {
            longitudeCount = Math.round(value);
            longitudeSlider.value = longitudeCount;
            updatePreview();
        }
    };
    longitudeInput.onChange = function() {
        longitudeCount = normalizeIntegerInput(longitudeInput, longitudeSlider, longitudeCount, 0, 24);
        updatePreview();
    };

    latitudeSlider.onChanging = function() {
        latitudeCount = Math.round(latitudeSlider.value);
        latitudeInput.text = String(latitudeCount);
        updatePreview();
    };
    latitudeInput.onChanging = function() {
        var value = parseNumber(latitudeInput.text);
        if (value !== null && value >= 0 && value <= 5) {
            latitudeCount = Math.round(value);
            latitudeSlider.value = latitudeCount;
            updatePreview();
        }
    };
    latitudeInput.onChange = function() {
        latitudeCount = normalizeIntegerInput(latitudeInput, latitudeSlider, latitudeCount, 0, 5);
        updatePreview();
    };

    rotationSlider.onChanging = function() {
        gridRotation = Math.round(rotationSlider.value);
        rotationInput.text = formatSignedAngle(gridRotation);
        updatePreview();
    };
    rotationInput.onChanging = function() {
        var value = parseNumber(rotationInput.text);
        if (value !== null && value >= -180 && value <= 180) {
            gridRotation = value;
            rotationSlider.value = value;
            updatePreview();
        }
    };
    rotationInput.onChange = function() {
        gridRotation = normalizeAngleInput(rotationInput, rotationSlider, gridRotation);
        updatePreview();
    };

    bindViewControls(xControls, function(value) { viewX = value; }, function() { return viewX; });
    bindViewControls(yControls, function(value) { viewY = value; }, function() { return viewY; });
    bindViewControls(zControls, function(value) { viewZ = value; }, function() { return viewZ; });

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        var validLongitude = parseNumber(longitudeInput.text);
        var validLatitude = parseNumber(latitudeInput.text);
        if (validLongitude === null || validLongitude < 0 || validLongitude > 24) {
            alert("경도선 수는 0부터 24 사이의 정수로 입력해주세요.");
            return;
        }
        if (validLatitude === null || validLatitude < 0 || validLatitude > 5) {
            alert("위도선 수는 0부터 5 사이의 정수로 입력해주세요.");
            return;
        }
        longitudeCount = Math.round(validLongitude);
        latitudeCount = Math.round(validLatitude);
        if (!commitAngleInput(rotationInput, function(value) { gridRotation = value; }) ||
                !commitAngleInput(xControls.input, function(value) { viewX = value; }) ||
                !commitAngleInput(yControls.input, function(value) { viewY = value; }) ||
                !commitAngleInput(zControls.input, function(value) { viewZ = value; })) {
            alert("회전 각도는 -180부터 +180 사이로 입력해주세요.");
            return;
        }
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
        var finalGroup = createSphere();
        finalGroup.name = "Sphere";
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

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createSphere();
        previewGroup.name = "Sphere Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function createSphere() {
        var group = source.layer.groupItems.add();
        var globe = source.duplicate(group, ElementPlacement.PLACEATBEGINNING);
        globe.hidden = false;
        globe.selected = false;
        globe.name = "Sphere Outline";
        copyStrokeStyle(source, globe);

        var i;
        if (longitudeCount > 0) {
            var longitudeSpacing = 180 / longitudeCount;
            var firstLongitude = 90 + gridRotation - (longitudeCount - 1) * longitudeSpacing / 2;
            for (i = 0; i < longitudeCount; i++) {
                drawLongitude(group, firstLongitude + i * longitudeSpacing);
            }
        }

        var latitudeSequence = [0, 30, -30, 60, -60];
        for (i = 0; i < latitudeCount; i++) {
            drawLatitude(group, latitudeSequence[i]);
        }
        return group;
    }

    function drawLongitude(group, longitudeDegrees) {
        var samples = [];
        var longitude = longitudeDegrees * Math.PI / 180;
        var steps = 72;
        for (var i = 0; i < steps; i++) {
            var latitude = -Math.PI / 2 + 2 * Math.PI * i / steps;
            samples.push(projectRotatedPoint(
                Math.cos(latitude) * Math.cos(longitude),
                Math.sin(latitude),
                Math.cos(latitude) * Math.sin(longitude)
            ));
        }
        drawVisibleSamples(group, samples);
    }

    function drawLatitude(group, latitudeDegrees) {
        var samples = [];
        var latitude = latitudeDegrees * Math.PI / 180;
        var steps = 72;
        for (var i = 0; i < steps; i++) {
            var longitude = 2 * Math.PI * i / steps;
            samples.push(projectRotatedPoint(
                Math.cos(latitude) * Math.cos(longitude),
                Math.sin(latitude),
                Math.cos(latitude) * Math.sin(longitude)
            ));
        }
        drawVisibleSamples(group, samples);
    }

    function projectRotatedPoint(x, y, z) {
        var rx = viewX * Math.PI / 180;
        var ry = viewY * Math.PI / 180;
        var rz = viewZ * Math.PI / 180;
        var cosValue = Math.cos(rx);
        var sinValue = Math.sin(rx);
        var nextY = y * cosValue - z * sinValue;
        var nextZ = y * sinValue + z * cosValue;
        y = nextY;
        z = nextZ;

        cosValue = Math.cos(ry);
        sinValue = Math.sin(ry);
        var nextX = x * cosValue + z * sinValue;
        nextZ = -x * sinValue + z * cosValue;
        x = nextX;
        z = nextZ;

        cosValue = Math.cos(rz);
        sinValue = Math.sin(rz);
        nextX = x * cosValue - y * sinValue;
        nextY = x * sinValue + y * cosValue;
        return {x: nextX, y: nextY, z: z};
    }

    function drawVisibleSamples(group, samples) {
        var invisibleIndex = -1;
        var i;
        for (i = 0; i < samples.length; i++) {
            if (samples[i].z < 0) {
                invisibleIndex = i;
                break;
            }
        }

        if (invisibleIndex < 0) {
            makeSmoothPath(group, samples, true);
            return;
        }

        var current = null;
        var count = samples.length;
        for (i = 0; i < count; i++) {
            var a = samples[(invisibleIndex + i) % count];
            var b = samples[(invisibleIndex + i + 1) % count];
            var aVisible = a.z >= 0;
            var bVisible = b.z >= 0;

            if (!aVisible && bVisible) {
                current = [intersectHorizon(a, b), b];
            } else if (aVisible && bVisible) {
                if (current === null) current = [a];
                current.push(b);
            } else if (aVisible && !bVisible) {
                if (current === null) current = [a];
                current.push(intersectHorizon(a, b));
                makeSmoothPath(group, current, false);
                current = null;
            }
        }
    }

    function intersectHorizon(a, b) {
        var denominator = a.z - b.z;
        var amount = Math.abs(denominator) < 0.0000001 ? 0 : a.z / denominator;
        return {
            x: a.x + (b.x - a.x) * amount,
            y: a.y + (b.y - a.y) * amount,
            z: 0
        };
    }

    function makeSmoothPath(group, points, closed) {
        if (points.length < 2) return null;
        var path = group.pathItems.add();
        var anchors = [];
        var i;
        for (i = 0; i < points.length; i++) {
            anchors.push([centerX + points[i].x * radius, centerY + points[i].y * radius]);
        }
        path.setEntirePath(anchors);
        path.closed = closed;
        path.filled = false;
        copyStrokeStyle(source, path);

        for (i = 0; i < anchors.length; i++) {
            var previousIndex = i - 1;
            var nextIndex = i + 1;
            if (closed) {
                previousIndex = (i - 1 + anchors.length) % anchors.length;
                nextIndex = (i + 1) % anchors.length;
            }
            var anchor = anchors[i];
            var left = anchor;
            var right = anchor;
            if (previousIndex >= 0 && nextIndex < anchors.length) {
                var dx = (anchors[nextIndex][0] - anchors[previousIndex][0]) / 6;
                var dy = (anchors[nextIndex][1] - anchors[previousIndex][1]) / 6;
                left = [anchor[0] - dx, anchor[1] - dy];
                right = [anchor[0] + dx, anchor[1] + dy];
            } else if (nextIndex < anchors.length) {
                right = [anchor[0] + (anchors[nextIndex][0] - anchor[0]) / 3,
                    anchor[1] + (anchors[nextIndex][1] - anchor[1]) / 3];
            } else if (previousIndex >= 0) {
                left = [anchor[0] - (anchor[0] - anchors[previousIndex][0]) / 3,
                    anchor[1] - (anchor[1] - anchors[previousIndex][1]) / 3];
            }
            path.pathPoints[i].leftDirection = left;
            path.pathPoints[i].rightDirection = right;
            path.pathPoints[i].pointType = PointType.SMOOTH;
        }
        return path;
    }

    function copyStrokeStyle(from, to) {
        to.stroked = true;
        if (from.stroked) {
            try { to.strokeColor = from.strokeColor; } catch(e) {}
            to.strokeWidth = LINE_WIDTH_PT;
            try { to.strokeDashes = from.strokeDashes; } catch(e3) {}
            try { to.strokeDashOffset = from.strokeDashOffset; } catch(e4) {}
            try { to.strokeCap = from.strokeCap; } catch(e5) {}
            try { to.strokeJoin = from.strokeJoin; } catch(e6) {}
            try { to.strokeMiterLimit = from.strokeMiterLimit; } catch(e7) {}
        } else {
            try { to.strokeColor = doc.defaultStrokeColor; } catch(e8) {}
            to.strokeWidth = LINE_WIDTH_PT;
        }
        try { to.opacity = from.opacity; } catch(e9) {}
    }

    function normalizeIntegerInput(input, slider, fallback, minimum, maximum) {
        var value = parseNumber(input.text);
        if (value === null) value = fallback;
        value = clamp(Math.round(value), minimum, maximum);
        input.text = String(value);
        slider.value = value;
        return value;
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

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function formatSignedAngle(value) {
        var rounded = Math.round(value * 10) / 10;
        return (rounded > 0 ? "+" : "") + String(rounded);
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
