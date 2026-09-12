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
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var OFFSET_STEP_MM = 0.1;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var sourceWasHidden = source.hidden;

    var PREF_KEY = "ObjectSphere/settings";
    applySavedSettings();

    var dlg = new Window("dialog", "오브젝트 스피어");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var gridPanel = dlg.add("panel", undefined, "경도선과 위도선");
    gridPanel.orientation = "column";
    gridPanel.alignChildren = "fill";

    var longitudeRow = gridPanel.add("group");
    longitudeRow.alignChildren = ["left", "center"];
    var longitudeLabel = longitudeRow.add("statictext", undefined, "경도선 수 (개):");
    longitudeLabel.preferredSize.width = 90;
    longitudeLabel.helpTip = "0 = 없음, 1 = 2등분, 2 = 4등분";
    var longitudeInput = longitudeRow.add("edittext", undefined, String(longitudeCount));
    longitudeInput.characters = 6;
    var longitudeSlider = addSliderWithSteps(longitudeRow, longitudeCount, 0, 24, 1);

    var latitudeRow = gridPanel.add("group");
    latitudeRow.alignChildren = ["left", "center"];
    var latitudeLabel = latitudeRow.add("statictext", undefined, "위도선 수 (개):");
    latitudeLabel.preferredSize.width = 90;
    latitudeLabel.helpTip = "0 = 없음, 1 ~ 11";
    var latitudeInput = latitudeRow.add("edittext", undefined, String(latitudeCount));
    latitudeInput.characters = 6;
    var latitudeSlider = addSliderWithSteps(latitudeRow, latitudeCount, 0, 11, 1);
    gridPanel.add("statictext", undefined,
        "순서: 적도 → 북15° → 남15° → 북30° → 남30° → 북45°");
    gridPanel.add("statictext", undefined,
        "      → 남45° → 북60° → 남60° → 북75° → 남75°");

    var rotationRow = gridPanel.add("group");
    rotationRow.alignChildren = ["left", "center"];
    var rotationLabel = rotationRow.add("statictext", undefined, "경도선 회전 (°):");
    rotationLabel.preferredSize.width = 90;
    rotationLabel.helpTip = "-180 ~ +180";
    var rotationInput = rotationRow.add("edittext", undefined, formatSignedAngle(gridRotation));
    rotationInput.characters = 6;
    var rotationSlider = addSliderWithSteps(rotationRow, gridRotation, -180, 180, 1);

    var viewPanel = dlg.add("panel", undefined, "구를 바라보는 시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var xControls = addAngleControls(viewPanel, "X축", viewX);
    var yControls = addAngleControls(viewPanel, "Y축", viewY);
    var zControls = addAngleControls(viewPanel, "Z축", viewZ);
    var resetViewButton = viewPanel.add("button", undefined, "시점 리셋");
    resetViewButton.alignment = "right";

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
        if (value !== null && value >= 0 && value <= 11) {
            latitudeCount = Math.round(value);
            latitudeSlider.value = latitudeCount;
            updatePreview();
        }
    };
    latitudeInput.onChange = function() {
        latitudeCount = normalizeIntegerInput(latitudeInput, latitudeSlider, latitudeCount, 0, 11);
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
    resetViewButton.onClick = resetViewControls;

    // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindOffsetControls(offsetXControls, true);
    bindOffsetControls(offsetYControls, false);

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
        if (validLatitude === null || validLatitude < 0 || validLatitude > 11) {
            alert("위도선 수는 0부터 11 사이의 정수로 입력해주세요.");
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
        var finalGroup = createSphere();
        moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
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

    function saveSettings() {
        var parts = ["v2", longitudeCount, latitudeCount, gridRotation, viewX, viewY, viewZ,
            offsetXmm, offsetYmm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if ((p[0] !== "v1" && p[0] !== "v2") || p.length < 7) return;
        var lon = parseInt(p[1], 10);
        var lat = parseInt(p[2], 10);
        var rot = parseFloat(p[3]);
        var vx = parseFloat(p[4]);
        var vy = parseFloat(p[5]);
        var vz = parseFloat(p[6]);
        if (lon >= 0 && lon <= 24) longitudeCount = lon;
        if (lat >= 0 && lat <= 11) latitudeCount = lat;
        if (rot >= -180 && rot <= 180) gridRotation = rot;
        if (vx >= -180 && vx <= 180) viewX = vx;
        if (vy >= -180 && vy <= 180) viewY = vy;
        if (vz >= -180 && vz <= 180) viewZ = vz;
        if (p[0] === "v2" && p.length >= 9) {
            var offX = parseFloat(p[7]);
            var offY = parseFloat(p[8]);
            if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
            if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
        }
    }

    // step 단위로 움직이는 스크롤바(‹ › 내장)
    function addSliderWithSteps(row, value, minimum, maximum, step) {
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = 196;
        return slider;
    }

    // 위치 행: 라벨 · 입력칸 · 단위 · 화살표 버튼 · 슬라이더
    function addOffsetControls(parent, label, value) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (mm):").preferredSize.width = 70;
        var input = row.add("edittext", undefined, formatOffset(value));
        input.characters = 6;
        var slider = row.add("scrollbar", undefined, value,
            -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        slider.stepdelta = OFFSET_STEP_MM;
        slider.jumpdelta = OFFSET_STEP_MM * 10;
        slider.preferredSize.width = 196;
        return {input: input, slider: slider};
    }

    // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindOffsetControls(controls, isX) {
        function commit(value) {
            if (value === null || !isFinite(value)) return;
            value = Math.round(value / OFFSET_STEP_MM) * OFFSET_STEP_MM;
            if (value < -POSITION_LIMIT_MM) value = -POSITION_LIMIT_MM;
            if (value > POSITION_LIMIT_MM) value = POSITION_LIMIT_MM;
            var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
            if (isX) offsetXmm = value;
            else offsetYmm = value;
            controls.input.text = formatOffset(value);
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

    function formatOffset(value) {
        return String(Math.round(value * 10) / 10);
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function addAngleControls(parent, label, value) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var caption = row.add("statictext", undefined, label + " (°):");
        caption.preferredSize.width = 90;
        caption.helpTip = "-180 ~ +180";
        var input = row.add("edittext", undefined, formatSignedAngle(value));
        input.characters = 6;
        var slider = addSliderWithSteps(row, value, -180, 180, 1);
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

    function resetViewControls() {
        viewX = 0;
        viewY = 0;
        viewZ = 0;
        xControls.input.text = formatSignedAngle(0);
        yControls.input.text = formatSignedAngle(0);
        zControls.input.text = formatSignedAngle(0);
        xControls.slider.value = 0;
        yControls.slider.value = 0;
        zControls.slider.value = 0;
        updatePreview();
    }

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createSphere();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
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

        var latitudeSequence = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75];
        for (i = 0; i < latitudeCount; i++) {
            drawLatitude(group, latitudeSequence[i]);
        }
        return group;
    }

    function drawLongitude(group, longitudeDegrees) {
        var longitude = longitudeDegrees * Math.PI / 180;
        drawParametricVisibleCurve(
            group,
            {x: 0, y: 0, z: 0},
            {x: Math.cos(longitude), y: 0, z: Math.sin(longitude)},
            {x: 0, y: 1, z: 0}
        );
    }

    function drawLatitude(group, latitudeDegrees) {
        var latitude = latitudeDegrees * Math.PI / 180;
        drawParametricVisibleCurve(
            group,
            {x: 0, y: Math.sin(latitude), z: 0},
            {x: Math.cos(latitude), y: 0, z: 0},
            {x: 0, y: 0, z: Math.cos(latitude)}
        );
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

    function drawParametricVisibleCurve(group, curveCenter, cosineBasis, sineBasis) {
        var projectedCenter = projectRotatedPoint(curveCenter.x, curveCenter.y, curveCenter.z);
        var projectedCosine = projectRotatedPoint(cosineBasis.x, cosineBasis.y, cosineBasis.z);
        var projectedSine = projectRotatedPoint(sineBasis.x, sineBasis.y, sineBasis.z);
        var samples = [];
        var steps = 72;
        var i;
        for (i = 0; i < steps; i++) {
            var angle = 2 * Math.PI * i / steps;
            samples.push({
                angle: angle,
                visibility: projectedCenter.z +
                    projectedCosine.z * Math.cos(angle) +
                    projectedSine.z * Math.sin(angle)
            });
        }

        var invisibleIndex = -1;
        for (i = 0; i < samples.length; i++) {
            if (samples[i].visibility < 0) {
                invisibleIndex = i;
                break;
            }
        }

        if (invisibleIndex < 0) {
            makeParametricBezierPath(
                group,
                projectedCenter,
                projectedCosine,
                projectedSine,
                0,
                2 * Math.PI,
                true
            );
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
                makeParametricBezierPath(
                    group,
                    projectedCenter,
                    projectedCosine,
                    projectedSine,
                    startAngle,
                    endAngle,
                    false
                );
                startAngle = null;
            }
        }
    }

    function interpolateVisibilityAngle(a, b, aAngle, bAngle) {
        var denominator = a.visibility - b.visibility;
        var amount = Math.abs(denominator) < 0.0000001 ? 0 : a.visibility / denominator;
        return aAngle + (bAngle - aAngle) * amount;
    }

    function makeParametricBezierPath(group, curveCenter, cosineBasis, sineBasis,
            startAngle, endAngle, closed) {
        var span = endAngle - startAngle;
        var segmentCount = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)));
        var delta = span / segmentCount;
        var handleFactor = 4 / 3 * Math.tan(delta / 4);
        var anchorCount = closed ? segmentCount : segmentCount + 1;
        var path = group.pathItems.add();
        var anchors = [];
        var derivatives = [];
        var i;
        for (i = 0; i < anchorCount; i++) {
            var angle = startAngle + delta * i;
            var cosine = Math.cos(angle);
            var sine = Math.sin(angle);
            anchors.push([
                centerX + (curveCenter.x + cosineBasis.x * cosine + sineBasis.x * sine) * radius,
                centerY + (curveCenter.y + cosineBasis.y * cosine + sineBasis.y * sine) * radius
            ]);
            derivatives.push({
                x: (-cosineBasis.x * sine + sineBasis.x * cosine) * radius,
                y: (-cosineBasis.y * sine + sineBasis.y * cosine) * radius
            });
        }
        path.setEntirePath(anchors);
        path.closed = closed;
        path.filled = false;
        copyStrokeStyle(source, path);

        for (i = 0; i < anchors.length; i++) {
            var anchor = anchors[i];
            var left = anchor;
            var right = anchor;
            if (closed || i > 0) {
                left = [anchor[0] - derivatives[i].x * handleFactor,
                    anchor[1] - derivatives[i].y * handleFactor];
            }
            if (closed || i < anchors.length - 1) {
                right = [anchor[0] + derivatives[i].x * handleFactor,
                    anchor[1] + derivatives[i].y * handleFactor];
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
