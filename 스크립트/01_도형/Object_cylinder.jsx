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
    var HEIGHT_STEP_MM = 0.05;
    var DIAMETER_STEP_MM = 0.05;
    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;
    var diameterMm = diameter / MM_TO_PT;
    var innerDiameterMm = 0;
    var maxInnerDiameterMm = Math.max(0, roundTo(diameterMm - DIAMETER_STEP_MM, DIAMETER_STEP_MM));
    var maxHeightMm = 50;
    var heightMm = Math.min(maxHeightMm, roundTo(diameterMm, HEIGHT_STEP_MM));
    var viewAngle = 70;
    var viewY = 0;
    var viewZ = 0;
    var isVertical = true;
    var divisionsEnabled = false;
    var divisionCount = 2;
    var divisionRotation = 90;
    var divisionRatioText = "";
    var K_STEP = 10;
    var FACE_TOP = 0;
    var FACE_INNER = 1;
    var FACE_OUTER = 2;
    var faceK = [0, 0, 0];
    var activeFace = FACE_TOP;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    // 외경은 선택한 원에서 오므로 저장하지 않는다. 내경·높이는 새 원 크기에 맞춰 잘라서 복원한다.
    var PREF_KEY = "ObjectCylinder/settings";
    applySavedSettings();

    var LABEL_WIDTH = 58;
    var SLIDER_WIDTH = 170;
    var STEP_BUTTON_WIDTH = 30;

    var dlg = new Window("dialog", "오브젝트 실린더");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var sizePanel = addPanel(dlg, "크기 (외경 " + formatNumber(diameterMm, 2) + "mm)");
    var innerControls = addValueRow(
        sizePanel,
        "내경",
        "mm",
        formatNumber(innerDiameterMm, 2),
        0,
        Math.max(DIAMETER_STEP_MM, maxInnerDiameterMm),
        DIAMETER_STEP_MM
    );
    var innerDiameterInput = innerControls.input;
    var innerDiameterSlider = innerControls.slider;
    var heightControls = addValueRow(
        sizePanel,
        "높이",
        "mm",
        formatNumber(heightMm, 2),
        0,
        maxHeightMm,
        HEIGHT_STEP_MM
    );
    var heightInput = heightControls.input;
    var heightSlider = heightControls.slider;

    var viewPanel = addPanel(dlg, "시점");
    var xControls = addAngleRow(viewPanel, "X축", viewAngle, true);
    var yControls = addAngleRow(viewPanel, "Y축", viewY, true);
    var zControls = addAngleRow(viewPanel, "Z축", viewZ, true);

    var shapePanel = addPanel(dlg, "방향 · 분할선");

    var directionRow = shapePanel.add("group");
    directionRow.alignChildren = ["left", "center"];
    var directionLabel = directionRow.add("statictext", undefined, "방향");
    directionLabel.preferredSize.width = LABEL_WIDTH;
    var verticalRadio = directionRow.add("radiobutton", undefined, "상하");
    var horizontalRadio = directionRow.add("radiobutton", undefined, "좌우");
    verticalRadio.value = isVertical;
    horizontalRadio.value = !isVertical;
    var divisionCheck = directionRow.add("checkbox", undefined, "분할선");
    divisionCheck.value = divisionsEnabled;
    var countGroup = directionRow.add("group");
    countGroup.alignChildren = ["left", "center"];
    var countInput = countGroup.add("edittext", undefined, String(divisionCount));
    countInput.characters = 4;
    countInput.justify = "center";
    var countDownButton = countGroup.add("button", undefined, "◀");
    countDownButton.preferredSize.width = 22;
    var countSlider = countGroup.add("slider", undefined, divisionCount, 2, 24);
    countSlider.preferredSize.width = 110;
    var countUpButton = countGroup.add("button", undefined, "▶");
    countUpButton.preferredSize.width = 22;

    var rotationControls = addAngleRow(shapePanel, "분할 회전", divisionRotation);
    var rotationInput = rotationControls.input;
    var rotationSlider = rotationControls.slider;
    var rotationRow = rotationControls.row;

    var ratioRow = shapePanel.add("group");
    ratioRow.alignChildren = ["left", "center"];
    var ratioLabel = ratioRow.add("statictext", undefined, "분할 비율");
    ratioLabel.preferredSize.width = LABEL_WIDTH;
    var ratioInput = ratioRow.add("edittext", undefined, divisionRatioText);
    ratioInput.preferredSize.width = 200;
    ratioRow.add("statictext", undefined, "(예: 43,11,40,6 · 빈칸=균등)");

    setDivisionControlsEnabled(divisionsEnabled);

    var colorPanel = addPanel(dlg, "컬러");
    var colorRow = colorPanel.add("group");
    colorRow.alignChildren = ["left", "center"];
    var topFaceRadio = colorRow.add("radiobutton", undefined, "보이는면");
    var innerFaceRadio = colorRow.add("radiobutton", undefined, "내부");
    var outerFaceRadio = colorRow.add("radiobutton", undefined, "외부");
    topFaceRadio.value = true;
    var kDownButton = colorRow.add("button", undefined, "◀");
    kDownButton.preferredSize.width = STEP_BUTTON_WIDTH;
    var kValueText = colorRow.add("statictext", undefined, "000K");
    kValueText.preferredSize.width = 42;
    kValueText.justify = "center";
    var kUpButton = colorRow.add("button", undefined, "▶");
    kUpButton.preferredSize.width = STEP_BUTTON_WIDTH;

    setInnerFaceEnabled(innerDiameterMm > 0);
    updateKDisplay();

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    innerDiameterSlider.onChanging = function() {
        innerDiameterMm = clamp(
            roundTo(innerDiameterSlider.value, DIAMETER_STEP_MM),
            0,
            maxInnerDiameterMm
        );
        innerDiameterInput.text = formatNumber(innerDiameterMm, 2);
        setInnerFaceEnabled(innerDiameterMm > 0);
        updatePreview();
    };

    innerDiameterInput.onChanging = function() {
        var value = parseNumber(innerDiameterInput.text);
        if (value !== null && value >= 0 && value < diameterMm) {
            innerDiameterMm = clamp(roundTo(value, DIAMETER_STEP_MM), 0, maxInnerDiameterMm);
            innerDiameterSlider.value = innerDiameterMm;
            setInnerFaceEnabled(innerDiameterMm > 0);
            updatePreview();
        }
    };

    innerControls.down.onClick = function() { stepInnerDiameter(-1); };
    innerControls.up.onClick = function() { stepInnerDiameter(1); };

    // 버튼 한 번 = 0.1mm
    function stepInnerDiameter(direction) {
        innerDiameterMm = clamp(roundTo(innerDiameterMm + direction * 0.1, 0.1), 0, maxInnerDiameterMm);
        innerDiameterInput.text = formatNumber(innerDiameterMm, 2);
        innerDiameterSlider.value = innerDiameterMm;
        setInnerFaceEnabled(innerDiameterMm > 0);
        updatePreview();
    }

    innerDiameterInput.onChange = function() {
        var value = parseNumber(innerDiameterInput.text);
        if (value === null || value < 0 || value >= diameterMm) value = innerDiameterMm;
        innerDiameterMm = clamp(roundTo(value, DIAMETER_STEP_MM), 0, maxInnerDiameterMm);
        innerDiameterSlider.value = innerDiameterMm;
        innerDiameterInput.text = formatNumber(innerDiameterMm, 2);
        setInnerFaceEnabled(innerDiameterMm > 0);
        updatePreview();
    };

    heightSlider.onChanging = function() {
        heightMm = roundTo(heightSlider.value, HEIGHT_STEP_MM);
        heightInput.text = formatNumber(heightMm, 2);
        updatePreview();
    };

    heightControls.down.onClick = function() { stepHeight(-1); };
    heightControls.up.onClick = function() { stepHeight(1); };

    // 버튼 한 번 = 0.1mm
    function stepHeight(direction) {
        heightMm = clamp(roundTo(heightMm + direction * 0.1, 0.1), 0, maxHeightMm);
        heightInput.text = formatNumber(heightMm, 2);
        heightSlider.value = heightMm;
        updatePreview();
    }

    heightInput.onChanging = function() {
        var value = parseNumber(heightInput.text);
        if (value !== null && value >= 0) {
            heightMm = roundTo(value, HEIGHT_STEP_MM);
            heightSlider.value = clamp(heightMm, 0, maxHeightMm);
            updatePreview();
        }
    };

    heightInput.onChange = function() {
        var value = parseNumber(heightInput.text);
        if (value === null || value < 0) {
            heightInput.text = formatNumber(heightMm, 2);
            return;
        }
        heightMm = roundTo(value, HEIGHT_STEP_MM);
        heightSlider.value = clamp(heightMm, 0, maxHeightMm);
        heightInput.text = formatNumber(heightMm, 2);
        updatePreview();
    };

    bindAngleControls(xControls, function(value) { viewAngle = value; }, function() { return viewAngle; });
    bindAngleControls(yControls, function(value) { viewY = value; }, function() { return viewY; });
    bindAngleControls(zControls, function(value) { viewZ = value; }, function() { return viewZ; });

    verticalRadio.onClick = function() {
        isVertical = true;
        updatePreview();
    };

    horizontalRadio.onClick = function() {
        isVertical = false;
        updatePreview();
    };

    divisionCheck.onClick = function() {
        divisionsEnabled = divisionCheck.value;
        setDivisionControlsEnabled(divisionsEnabled);
        updatePreview();
    };

    countInput.onChanging = function() {
        var value = parseNumber(countInput.text);
        if (value !== null && value >= 2) {
            divisionCount = Math.round(value);
            updatePreview();
        }
    };

    countInput.onChange = function() {
        var value = parseNumber(countInput.text);
        if (value === null || value < 2) value = divisionCount;
        divisionCount = Math.max(2, Math.round(value));
        countInput.text = String(divisionCount);
        countSlider.value = clamp(divisionCount, 2, 24);
        updatePreview();
    };

    ratioInput.onChanging = updatePreview;
    countSlider.onChanging = function() {
        divisionCount = clamp(Math.round(countSlider.value), 2, 24);
        countInput.text = String(divisionCount);
        updatePreview();
    };
    countDownButton.onClick = function() { stepDivisionCount(-1); };
    countUpButton.onClick = function() { stepDivisionCount(1); };

    function stepDivisionCount(delta) {
        divisionCount = clamp(divisionCount + delta, 2, 24);
        countInput.text = String(divisionCount);
        countSlider.value = divisionCount;
        updatePreview();
    }

    rotationSlider.onChanging = function() {
        divisionRotation = Math.round(rotationSlider.value);
        rotationInput.text = formatSignedAngle(divisionRotation);
        updatePreview();
    };

    rotationInput.onChanging = function() {
        var value = parseNumber(rotationInput.text);
        if (value !== null && value >= -180 && value <= 180) {
            divisionRotation = value;
            rotationSlider.value = value;
            updatePreview();
        }
    };

    rotationInput.onChange = function() {
        var value = parseNumber(rotationInput.text);
        if (value === null) value = divisionRotation;
        divisionRotation = clamp(value, -180, 180);
        rotationSlider.value = divisionRotation;
        rotationInput.text = formatSignedAngle(divisionRotation);
        updatePreview();
    };

    topFaceRadio.onClick = function() {
        activeFace = FACE_TOP;
        updateKDisplay();
    };

    innerFaceRadio.onClick = function() {
        activeFace = FACE_INNER;
        updateKDisplay();
    };

    outerFaceRadio.onClick = function() {
        activeFace = FACE_OUTER;
        updateKDisplay();
    };

    kDownButton.onClick = function() {
        stepK(-K_STEP);
    };

    kUpButton.onClick = function() {
        stepK(K_STEP);
    };

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        var validHeight = parseNumber(heightInput.text);
        var validAngle = parseNumber(xControls.input.text);
        var validAngleY = parseNumber(yControls.input.text);
        var validAngleZ = parseNumber(zControls.input.text);
        var validInnerDiameter = parseNumber(innerDiameterInput.text);
        if (validInnerDiameter === null || validInnerDiameter < 0 || validInnerDiameter >= diameterMm) {
            alert("내경은 0 이상, 외경보다 작은 값으로 입력해주세요.");
            return;
        }
        if (validHeight === null || validHeight < 0) {
            alert("높이는 0 이상의 숫자로 입력해주세요.");
            return;
        }
        if (!isValidAngle(validAngle) || !isValidAngle(validAngleY) || !isValidAngle(validAngleZ)) {
            alert("시점 각도는 -180부터 +180 사이로 입력해주세요.");
            return;
        }
        var validCount = parseNumber(countInput.text);
        var validRotation = parseNumber(rotationInput.text);
        if (divisionsEnabled && (validCount === null || validCount < 2)) {
            alert("분할 수는 2 이상의 정수로 입력해주세요.");
            return;
        }
        if (divisionsEnabled && (validRotation === null || validRotation < -180 || validRotation > 180)) {
            alert("분할선 회전은 -180부터 +180 사이로 입력해주세요.");
            return;
        }
        heightMm = roundTo(validHeight, HEIGHT_STEP_MM);
        innerDiameterMm = clamp(
            roundTo(validInnerDiameter, DIAMETER_STEP_MM),
            0,
            maxInnerDiameterMm
        );
        viewAngle = validAngle;
        viewY = validAngleY;
        viewZ = validAngleZ;
        divisionCount = Math.max(2, Math.round(validCount));
        divisionRotation = validRotation;
        divisionRatioText = ratioInput.text;
        saveSettings();
        dlg.close(1);
    };

    cancelButton.onClick = function() {
        dlg.close(0);
    };

    source.hidden = true;
    source.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        source.hidden = false;
        var finalGroup = buildCylinder();
        finalGroup.name = "Cylinder";
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
        previewGroup = buildCylinder();
        previewGroup.name = "Cylinder Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    // 원기둥 축을 3D로 회전시킨 뒤, 그 축이 만드는 두 값으로 환산해서 그린다.
    //  - 화면과 이루는 각(캡 타원의 납작한 정도) → createCylinder의 시점 각도
    //  - 화면상 축 방향 → 완성된 도형의 회전
    // 원기둥은 회전 대칭이라 이 두 값이 모양을 모두 결정한다.
    function getCylinderAxis() {
        var rx = (90 - viewAngle) * Math.PI / 180;
        var ry = viewY * Math.PI / 180;
        var rz = viewZ * Math.PI / 180;

        // 세운 원기둥의 축 (0, 1, 0)에 X → Y → Z 순서로 회전을 적용
        var x = 0;
        var y = Math.cos(rx);
        var z = Math.sin(rx);

        var nextX = (x * Math.cos(ry)) + (z * Math.sin(ry));
        z = (-x * Math.sin(ry)) + (z * Math.cos(ry));
        x = nextX;

        nextX = (x * Math.cos(rz)) - (y * Math.sin(rz));
        y = (x * Math.sin(rz)) + (y * Math.cos(rz));
        x = nextX;

        return {x: x, y: y, z: z};
    }

    function getViewGeometry() {
        var axis = getCylinderAxis();
        var planarLength = Math.sqrt((axis.x * axis.x) + (axis.y * axis.y));
        var tilt = Math.asin(clamp(axis.z, -1, 1)) * 180 / Math.PI;

        // createCylinder는 각도의 부호로 앞뒤 캡을 정하므로 축의 깊이 방향을 부호로 옮긴다
        var angle = axis.z >= 0 ? (90 - tilt) : -(90 + tilt);
        var rotation = 0;
        if (planarLength > 0.000001) {
            rotation = (Math.atan2(axis.y, axis.x) * 180 / Math.PI) - 90;
        }
        if (!isVertical) {
            rotation += 90;
        }

        return {angle: angle, rotation: rotation};
    }

    function buildCylinder() {
        var view = getViewGeometry();
        var group = createCylinder(heightMm * MM_TO_PT, view.angle, true);
        if (Math.abs(view.rotation) > 0.0001) {
            // 도형 전체의 중심을 축으로 돌려야 제자리에서 회전한다.
            // 캡(원본 원) 중심을 축으로 잡으면 몸통이 반대편으로 돌아 도형이 통째로 이동한다.
            try {
                group.rotate(view.rotation, true, true, true, true, Transformation.CENTER);
            } catch (e) {}
        }
        return group;
    }

    function isValidAngle(value) {
        return value !== null && value >= -180 && value <= 180;
    }

    function saveSettings() {
        var parts = [
            "v3", viewAngle, viewY, viewZ,
            isVertical ? "1" : "0",
            divisionsEnabled ? "1" : "0",
            divisionCount, divisionRotation,
            faceK[0], faceK[1], faceK[2],
            encodeURIComponent(divisionRatioText),
            innerDiameterMm, heightMm
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length < 14) return;
        viewAngle = restoreNumber(p[1], viewAngle, -180, 180);
        viewY = restoreNumber(p[2], viewY, -180, 180);
        viewZ = restoreNumber(p[3], viewZ, -180, 180);
        isVertical = (p[4] === "1");
        divisionsEnabled = (p[5] === "1");
        divisionCount = Math.round(restoreNumber(p[6], divisionCount, 2, 24));
        divisionRotation = restoreNumber(p[7], divisionRotation, -180, 180);
        for (var i = 0; i < 3; i++) {
            faceK[i] = Math.round(restoreNumber(p[8 + i], faceK[i], 0, 100));
        }
        try { divisionRatioText = decodeURIComponent(p[11]); } catch (e2) {}
        innerDiameterMm = roundTo(restoreNumber(p[12], innerDiameterMm, 0, maxInnerDiameterMm), DIAMETER_STEP_MM);
        heightMm = roundTo(restoreNumber(p[13], heightMm, 0, maxHeightMm), HEIGHT_STEP_MM);
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

    // 라벨 · (0 버튼) · 입력칸 · 단위 · 슬라이더를 한 줄에 배치
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
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = 22;
        var slider = row.add("slider", undefined, Number(value), minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        slider.stepdelta = step;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = 22;
        return {row: row, input: input, slider: slider, reset: reset, down: down, up: up};
    }

    function addAngleRow(parent, label, value, hasReset) {
        return addValueRow(parent, label, "°", formatSignedAngle(value), -180, 180, 1, hasReset);
    }

    function bindAngleControls(controls, setter, getter) {
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
            var value = parseNumber(controls.input.text);
            if (value === null) value = getter();
            value = clamp(value, -180, 180);
            setter(value);
            controls.input.text = formatSignedAngle(value);
            controls.slider.value = value;
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

        // 버튼 한 번 = 5도. 5도 격자에 맞춰 움직인다.
        function stepAngle(direction) {
            var value = clamp(Math.round((getter() + direction * 5) / 5) * 5, -180, 180);
            setter(value);
            controls.input.text = formatSignedAngle(value);
            controls.slider.value = value;
            updatePreview();
        }
        controls.down.onClick = function() { stepAngle(-1); };
        controls.up.onClick = function() { stepAngle(1); };
    }


    function setDivisionControlsEnabled(enabled) {
        countGroup.enabled = enabled;
        rotationRow.enabled = enabled;
        ratioRow.enabled = enabled;
    }

    function setInnerFaceEnabled(enabled) {
        innerFaceRadio.enabled = enabled;
        if (enabled || activeFace !== FACE_INNER) return;
        activeFace = FACE_TOP;
        topFaceRadio.value = true;
        updateKDisplay();
    }

    function updateKDisplay() {
        kValueText.text = faceK[activeFace] + "K";
    }

    function stepK(delta) {
        faceK[activeFace] = clamp(faceK[activeFace] + delta, 0, 100);
        updateKDisplay();
        updatePreview();
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

    function createCylinder(cylinderHeight, angleDegrees, vertical) {
        var radians = angleDegrees * Math.PI / 180;
        var projectedLength = cylinderHeight * Math.abs(Math.sin(radians));
        var capScale = Math.abs(Math.cos(radians));
        var minorSize = Math.max(0.01, diameter * capScale);
        var deltaX = vertical ? 0 : projectedLength;
        var deltaY = vertical ? -projectedLength : 0;
        var secondX = centerX + deltaX;
        var secondY = centerY + deltaY;
        var group = source.layer.groupItems.add();
        var innerRatio = diameterMm > 0 ? innerDiameterMm / diameterMm : 0;

        if (Math.abs(projectedLength) < 0.01 || cylinderHeight < 0.01) {
            makeFrontFace(group, centerX, centerY, diameter, diameter, innerRatio);
            if (divisionsEnabled) {
                var singleCapPoints = getDivisionPoints(
                    centerX,
                    centerY,
                    centerX,
                    centerY,
                    diameter,
                    diameter,
                    innerRatio,
                    getDivisionAngles()
                );
                for (var singleIndex = 0; singleIndex < singleCapPoints.length; singleIndex++) {
                    var singleDivision = makeLine(
                        group,
                        singleCapPoints[singleIndex].innerFront[0],
                        singleCapPoints[singleIndex].innerFront[1],
                        singleCapPoints[singleIndex].front[0],
                        singleCapPoints[singleIndex].front[1]
                    );
                    copyStrokeStyle(source, singleDivision);
                }
            }
            return group;
        }

        var rearIsSecond = angleDegrees >= 0;
        var rearX = rearIsSecond ? secondX : centerX;
        var rearY = rearIsSecond ? secondY : centerY;
        var frontX = rearIsSecond ? centerX : secondX;
        var frontY = rearIsSecond ? centerY : secondY;
        var capWidth = vertical ? diameter : minorSize;
        var capHeight = vertical ? minorSize : diameter;
        var innerRadiusX = capWidth / 2 * innerRatio;
        var innerRadiusY = capHeight / 2 * innerRatio;
        var holeGeometry = innerRatio > 0 ?
            innerHoleGeometry(frontX, frontY, rearX, rearY, innerRadiusX, innerRadiusY) :
            {mode: "solid"};

        var bodyFill = makeBodyFill(
            group,
            frontX,
            frontY,
            rearX,
            rearY,
            capWidth / 2,
            capHeight / 2,
            innerRadiusX,
            innerRadiusY
        );
        bodyFill.stroked = false;
        applyFill(bodyFill, faceK[FACE_OUTER]);
        try { bodyFill.zOrder(ZOrderMethod.SENDTOBACK); } catch(bodyFillOrderError) {}

        var rearCap = makeRearRim(
            group,
            rearX,
            rearY,
            capWidth,
            capHeight,
            rearX - frontX,
            rearY - frontY
        );
        copyStrokeStyle(source, rearCap);

        var sideLineA;
        var sideLineB;
        if (vertical) {
            sideLineA = makeLine(group, centerX - diameter / 2, centerY, secondX - diameter / 2, secondY);
            sideLineB = makeLine(group, centerX + diameter / 2, centerY, secondX + diameter / 2, secondY);
        } else {
            sideLineA = makeLine(group, centerX, centerY + diameter / 2, secondX, secondY + diameter / 2);
            sideLineB = makeLine(group, centerX, centerY - diameter / 2, secondX, secondY - diameter / 2);
        }
        copyStrokeStyle(source, sideLineA);
        copyStrokeStyle(source, sideLineB);

        var divisionPoints = divisionsEnabled ? getDivisionPoints(
            frontX,
            frontY,
            rearX,
            rearY,
            capWidth,
            capHeight,
            innerRatio,
            getDivisionAngles()
        ) : [];
        for (var divisionIndex = 0; divisionIndex < divisionPoints.length; divisionIndex++) {
            var divisionPoint = divisionPoints[divisionIndex];
            if (divisionPoint.visibleOnSide) {
                var bodyDivision = makeLine(
                    group,
                    divisionPoint.front[0],
                    divisionPoint.front[1],
                    divisionPoint.rear[0],
                    divisionPoint.rear[1]
                );
                copyStrokeStyle(source, bodyDivision);
            }
        }

        if (innerRatio > 0) {
            drawInnerHoleFill(group, frontX, frontY, rearX, rearY,
                innerRadiusX, innerRadiusY, holeGeometry);
        }

        var frontFaceItems = makeFrontFace(group, frontX, frontY, capWidth, capHeight, innerRatio);
        for (var faceIndex = 0; faceIndex < frontFaceItems.length; faceIndex++) {
            try { frontFaceItems[faceIndex].zOrder(ZOrderMethod.BRINGTOFRONT); } catch(e3) {}
        }

        if (innerRatio > 0) {
            for (var innerDivisionIndex = 0; innerDivisionIndex < divisionPoints.length; innerDivisionIndex++) {
                var innerDivisionPoint = divisionPoints[innerDivisionIndex];
                if (innerDivisionPoint.visibleOnInnerWall) {
                    var innerWallDivision = makeLine(
                        group,
                        innerDivisionPoint.innerFront[0],
                        innerDivisionPoint.innerFront[1],
                        innerDivisionPoint.innerWallEnd[0],
                        innerDivisionPoint.innerWallEnd[1]
                    );
                    copyStrokeStyle(source, innerWallDivision);
                }
            }
        }

        for (var capDivisionIndex = 0; capDivisionIndex < divisionPoints.length; capDivisionIndex++) {
            var capDivisionPoint = divisionPoints[capDivisionIndex];
            var capDivision = makeLine(
                group,
                capDivisionPoint.innerFront[0],
                capDivisionPoint.innerFront[1],
                capDivisionPoint.front[0],
                capDivisionPoint.front[1]
            );
            copyStrokeStyle(source, capDivision);
        }
        return group;
    }

    // 쉼표로 구분한 비율 목록. 2개 이상, 전부 0보다 커야 유효. 아니면 null(균등 분할).
    function parseDivisionRatios(text) {
        var pieces = String(text).split(",");
        var ratios = [];
        for (var i = 0; i < pieces.length; i++) {
            var piece = pieces[i].replace(/^\s+|\s+$/g, "");
            if (piece === "") continue;
            var value = parseFloat(piece);
            if (isNaN(value) || value <= 0) return null;
            ratios.push(value);
        }
        return ratios.length >= 2 ? ratios : null;
    }

    // 분할선 각도 목록: 비율이 있으면 누적 비율 위치(12시부터 시계 방향), 없으면 균등
    function getDivisionAngles() {
        var rotationRadians = divisionRotation * Math.PI / 180;
        var ratios = parseDivisionRatios(ratioInput.text);
        var angles = [];

        if (ratios !== null) {
            var total = 0;
            for (var r = 0; r < ratios.length; r++) total += ratios[r];
            var cumulative = 0;
            for (var i = 0; i < ratios.length; i++) {
                angles.push(rotationRadians - (cumulative / total) * Math.PI * 2);
                cumulative += ratios[i];
            }
        } else {
            for (var j = 0; j < divisionCount; j++) {
                angles.push(rotationRadians + (Math.PI * 2 * j / divisionCount));
            }
        }
        return angles;
    }

    function getDivisionPoints(frontX, frontY, rearX, rearY, capWidth, capHeight, innerRatio, angles) {
        var points = [];
        var axisX = rearX - frontX;
        var axisY = rearY - frontY;
        var holeRadiusX = capWidth / 2 * innerRatio;
        var holeRadiusY = capHeight / 2 * innerRatio;

        for (var i = 0; i < angles.length; i++) {
            var angle = angles[i];
            var radialX = capWidth / 2 * Math.cos(angle);
            var radialY = capHeight / 2 * Math.sin(angle);
            var sideDot = radialX * axisX + radialY * axisY;
            var innerX = radialX * innerRatio;
            var innerY = radialY * innerRatio;
            // 내부 벽 분할선은 벽면을 따라 뒤쪽 구멍 테두리(t=1)까지 가되,
            // 깊은 원기둥에서는 그 전에 앞 구멍 타원을 벗어나는 지점에서 멈춘다.
            var wallT = 1;
            if (holeRadiusX > 0 && holeRadiusY > 0) {
                var axisU = axisX / holeRadiusX;
                var axisV = axisY / holeRadiusY;
                var axisLen2 = axisU * axisU + axisV * axisV;
                var axisDot = Math.cos(angle) * axisU + Math.sin(angle) * axisV;
                if (axisLen2 > 0 && axisDot < 0) wallT = Math.min(1, -2 * axisDot / axisLen2);
            }
            points.push({
                front: [frontX + radialX, frontY + radialY],
                innerFront: [frontX + innerX, frontY + innerY],
                innerWallEnd: [frontX + innerX + wallT * axisX, frontY + innerY + wallT * axisY],
                rear: [rearX + radialX, rearY + radialY],
                visibleOnSide: sideDot > 0.0001,
                visibleOnInnerWall: sideDot < -0.0001
            });
        }
        return points;
    }

    function makeCap(group, x, y, width, height) {
        return group.pathItems.ellipse(y + height / 2, x - width / 2, width, height);
    }

    function makeFrontFace(group, x, y, width, height, innerRatio) {
        var items = [];
        var outerCap;

        if (innerRatio <= 0) {
            outerCap = makeCap(group, x, y, width, height);
            applyFill(outerCap, faceK[FACE_TOP]);
            copyStrokeStyle(source, outerCap);
            items.push(outerCap);
            return items;
        }

        var fillSegments = makeRingFillSegments(group, x, y, width, height, innerRatio);
        for (var fillIndex = 0; fillIndex < fillSegments.length; fillIndex++) {
            items.push(fillSegments[fillIndex]);
        }

        outerCap = makeCap(group, x, y, width, height);
        outerCap.filled = false;
        copyStrokeStyle(source, outerCap);
        try { outerCap.opacity = source.opacity; } catch(e) {}
        items.push(outerCap);

        var innerCap = makeCap(group, x, y, width * innerRatio, height * innerRatio);
        innerCap.filled = false;
        copyStrokeStyle(source, innerCap);
        items.push(innerCap);
        return items;
    }

    // Paints what is seen through the hole. "wall": the tube is deep enough that the
    // opening is fully backed by inner wall (opaque inner color). "crescent": part of
    // the opening shows inner wall, the rest sees through the tube (left unpainted so
    // the background shows). "seethrough": nothing to paint.
    function drawInnerHoleFill(group, frontX, frontY, rearX, rearY, radiusX, radiusY, geo) {
        if (geo.mode === "wall") {
            var wall = createPathFromPoints(group, ellipseFullPoints(frontX, frontY, radiusX, radiusY), true);
            wall.stroked = false;
            applyFill(wall, faceK[FACE_INNER]);
            return;
        }
        if (geo.mode !== "crescent") return;

        var frontSweep = pickArcSweep(frontX, frontY, radiusX, radiusY,
            geo.frontAngle1, geo.frontAngle2, rearX, rearY, radiusX, radiusY, false);
        var rearSweep = pickArcSweep(rearX, rearY, radiusX, radiusY,
            geo.rearAngle2, geo.rearAngle1, frontX, frontY, radiusX, radiusY, true);

        var frontPoints = [];
        appendArcPoints(frontPoints, frontX, frontY, radiusX, radiusY, geo.frontAngle1, frontSweep, false);
        var rearPoints = [];
        appendArcPoints(rearPoints, rearX, rearY, radiusX, radiusY, geo.rearAngle2, rearSweep, false);
        // 두 호가 만나는 접점에서는 이어지는 구간을 그리는 호의 접선 핸들을 써야
        // 곡선이 경계 밖(비쳐 보여야 하는 영역)으로 불거지지 않는다.
        frontPoints[frontPoints.length - 1].rightDirection = rearPoints[0].rightDirection;
        frontPoints[frontPoints.length - 1].corner = true;
        frontPoints[0].leftDirection = rearPoints[rearPoints.length - 1].leftDirection;
        frontPoints[0].corner = true;
        var points = frontPoints.concat(rearPoints.slice(1, rearPoints.length - 1));

        var crescent = createPathFromPoints(group, points, true);
        crescent.stroked = false;
        applyFill(crescent, faceK[FACE_INNER]);

        var farRim = makeArcPath(group, rearX, rearY, radiusX, radiusY, geo.rearAngle2, rearSweep);
        copyStrokeStyle(source, farRim);
    }

    function makeRingFillSegments(group, x, y, width, height, innerRatio) {
        var segments = [];
        var outerRadiusX = width / 2;
        var outerRadiusY = height / 2;
        var innerRadiusX = outerRadiusX * innerRatio;
        var innerRadiusY = outerRadiusY * innerRatio;
        for (var i = 0; i < 4; i++) {
            var startAngle = i * Math.PI / 2;
            var endAngle = (i + 1) * Math.PI / 2;
            var segment = makeRingSegment(
                group,
                x,
                y,
                outerRadiusX,
                outerRadiusY,
                innerRadiusX,
                innerRadiusY,
                startAngle,
                endAngle
            );
            segment.stroked = false;
            applyFill(segment, faceK[FACE_TOP]);
            segments.push(segment);
        }
        return segments;
    }

    function makeRingSegment(group, x, y, outerRadiusX, outerRadiusY,
            innerRadiusX, innerRadiusY, startAngle, endAngle) {
        var handleScale = 0.5522847498;
        var outerStart = ellipsePoint(x, y, outerRadiusX, outerRadiusY, startAngle);
        var outerEnd = ellipsePoint(x, y, outerRadiusX, outerRadiusY, endAngle);
        var innerEnd = ellipsePoint(x, y, innerRadiusX, innerRadiusY, endAngle);
        var innerStart = ellipsePoint(x, y, innerRadiusX, innerRadiusY, startAngle);
        var path = group.pathItems.add();
        path.setEntirePath([outerStart, outerEnd, innerEnd, innerStart]);
        path.closed = true;

        var outerStartTangent = ellipseTangent(outerRadiusX, outerRadiusY, startAngle, handleScale);
        var outerEndTangent = ellipseTangent(outerRadiusX, outerRadiusY, endAngle, handleScale);
        var innerEndTangent = ellipseTangent(innerRadiusX, innerRadiusY, endAngle, handleScale);
        var innerStartTangent = ellipseTangent(innerRadiusX, innerRadiusY, startAngle, handleScale);

        setPathPoint(path.pathPoints[0], outerStart, outerStart,
            addPoint(outerStart, outerStartTangent));
        setPathPoint(path.pathPoints[1], outerEnd,
            subtractPoint(outerEnd, outerEndTangent), outerEnd);
        setPathPoint(path.pathPoints[2], innerEnd, innerEnd,
            subtractPoint(innerEnd, innerEndTangent));
        setPathPoint(path.pathPoints[3], innerStart,
            addPoint(innerStart, innerStartTangent), innerStart);
        return path;
    }

    function ellipseTangent(radiusX, radiusY, angle, scale) {
        return [-radiusX * Math.sin(angle) * scale, radiusY * Math.cos(angle) * scale];
    }

    function appendArcPoints(points, x, y, radiusX, radiusY, startAngle, sweep, skipFirst) {
        var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 0.000001));
        var step = sweep / count;
        var handleScale = 4 / 3 * Math.tan(step / 4);
        for (var i = skipFirst ? 1 : 0; i <= count; i++) {
            var angle = startAngle + step * i;
            var anchor = ellipsePoint(x, y, radiusX, radiusY, angle);
            var tangent = ellipseTangent(radiusX, radiusY, angle, handleScale);
            points.push({
                anchor: anchor,
                leftDirection: subtractPoint(anchor, tangent),
                rightDirection: addPoint(anchor, tangent),
                corner: false
            });
        }
    }

    function createPathFromPoints(container, points, closed) {
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        var path = container.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = closed;
        path.filled = false;
        for (var j = 0; j < points.length; j++) {
            var pathPoint = path.pathPoints[j];
            pathPoint.anchor = points[j].anchor;
            pathPoint.leftDirection = points[j].leftDirection;
            pathPoint.rightDirection = points[j].rightDirection;
            pathPoint.pointType = points[j].corner ? PointType.CORNER : PointType.SMOOTH;
        }
        return path;
    }

    function makeArcPath(group, x, y, radiusX, radiusY, startAngle, sweep) {
        var points = [];
        appendCornerArc(points, x, y, radiusX, radiusY, startAngle, sweep);
        return createPathFromPoints(group, points, false);
    }

    // 양 끝 핸들을 앵커로 눌러 직선 변과 각지게 이어지는 호를 추가한다.
    function appendCornerArc(points, x, y, radiusX, radiusY, startAngle, sweep) {
        var start = points.length;
        appendArcPoints(points, x, y, radiusX, radiusY, startAngle, sweep, false);
        points[start].leftDirection = points[start].anchor;
        points[start].corner = true;
        var last = points.length - 1;
        points[last].rightDirection = points[last].anchor;
        points[last].corner = true;
    }

    function cornerPoint(anchor) {
        return {anchor: anchor, leftDirection: anchor, rightDirection: anchor, corner: true};
    }

    // 옆면과 뒤 테두리를 하나로 채우는 몸통 경로. 앞 캡 중심선 변에서 앞 구멍(내경)의
    // 뒤쪽 절반을 물어내, 구멍으로 비쳐 보여야 하는 배경을 가리지 않는다.
    // 물린 부분 중 내부 벽이 보이는 곳은 이후 drawInnerHoleFill이 위에 다시 칠한다.
    function makeBodyFill(group, frontX, frontY, rearX, rearY,
            outerRadiusX, outerRadiusY, innerRadiusX, innerRadiusY) {
        var axisAngle = Math.atan2(rearY - frontY, rearX - frontX);
        var perpAngle = axisAngle + Math.PI / 2;
        var points = [];
        points.push(cornerPoint(ellipsePoint(frontX, frontY, outerRadiusX, outerRadiusY, perpAngle)));
        if (innerRadiusX > 0 && innerRadiusY > 0) {
            appendCornerArc(points, frontX, frontY, innerRadiusX, innerRadiusY, perpAngle, -Math.PI);
        }
        points.push(cornerPoint(ellipsePoint(frontX, frontY, outerRadiusX, outerRadiusY, perpAngle + Math.PI)));
        appendCornerArc(points, rearX, rearY, outerRadiusX, outerRadiusY, perpAngle + Math.PI, Math.PI);
        return createPathFromPoints(group, points, true);
    }

    function ellipseFullPoints(x, y, radiusX, radiusY) {
        var points = [];
        appendArcPoints(points, x, y, radiusX, radiusY, 0, Math.PI * 2, false);
        points.pop();
        return points;
    }

    function ellipseContains(px, py, cx, cy, radiusX, radiusY) {
        var nx = (px - cx) / radiusX;
        var ny = (py - cy) / radiusY;
        return nx * nx + ny * ny < 1;
    }

    // Intersection of two congruent, axis-aligned ellipses (front hole opening and
    // rear hole opening) that share radii but differ in center. Normalizing by the
    // radii turns them into unit circles, so the classic circle-circle intersection
    // gives the two crossing points; those are mapped back to ellipse space.
    function innerHoleGeometry(frontX, frontY, rearX, rearY, radiusX, radiusY) {
        if (radiusX <= 0 || radiusY <= 0) return {mode: "seethrough"};
        var fx = frontX / radiusX, fy = frontY / radiusY;
        var gx = rearX / radiusX, gy = rearY / radiusY;
        var dx = gx - fx, dy = gy - fy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.000001) return {mode: "seethrough"};
        if (d >= 2) return {mode: "wall"};
        var half = Math.sqrt(1 - (d / 2) * (d / 2));
        var midX = (fx + gx) / 2, midY = (fy + gy) / 2;
        var perpX = -dy / d, perpY = dx / d;
        var n1X = midX + half * perpX, n1Y = midY + half * perpY;
        var n2X = midX - half * perpX, n2Y = midY - half * perpY;
        return {
            mode: "crescent",
            frontAngle1: Math.atan2(n1Y - fy, n1X - fx),
            frontAngle2: Math.atan2(n2Y - fy, n2X - fx),
            rearAngle1: Math.atan2(n1Y - gy, n1X - gx),
            rearAngle2: Math.atan2(n2Y - gy, n2X - gx)
        };
    }

    // Choose which way to travel from a1 to a2 along an ellipse so the arc's midpoint
    // is inside (or outside) a reference ellipse; returns the signed sweep.
    function pickArcSweep(cx, cy, radiusX, radiusY, a1, a2,
            refX, refY, refRadiusX, refRadiusY, wantInside) {
        var sweep = a2 - a1;
        while (sweep <= 0) sweep += Math.PI * 2;
        var midAngle = a1 + sweep / 2;
        var midPoint = ellipsePoint(cx, cy, radiusX, radiusY, midAngle);
        var inside = ellipseContains(midPoint[0], midPoint[1], refX, refY, refRadiusX, refRadiusY);
        if (inside !== wantInside) sweep -= Math.PI * 2;
        return sweep;
    }

    function addPoint(point, delta) {
        return [point[0] + delta[0], point[1] + delta[1]];
    }

    function subtractPoint(point, delta) {
        return [point[0] - delta[0], point[1] - delta[1]];
    }

    function setPathPoint(pathPoint, anchor, leftDirection, rightDirection) {
        pathPoint.anchor = anchor;
        pathPoint.leftDirection = leftDirection;
        pathPoint.rightDirection = rightDirection;
        pathPoint.pointType = PointType.CORNER;
    }

    function makeRearRim(group, x, y, width, height, axisX, axisY) {
        var radiusX = width / 2;
        var radiusY = height / 2;
        var centerAngle = Math.atan2(axisY / radiusY, axisX / radiusX);
        var startAngle = centerAngle - Math.PI / 2;
        var middleAngle = centerAngle;
        var endAngle = centerAngle + Math.PI / 2;
        var handleScale = 0.5522847498;
        var arc = group.pathItems.add();
        var angles = [startAngle, middleAngle, endAngle];

        arc.setEntirePath([
            ellipsePoint(x, y, radiusX, radiusY, startAngle),
            ellipsePoint(x, y, radiusX, radiusY, middleAngle),
            ellipsePoint(x, y, radiusX, radiusY, endAngle)
        ]);
        arc.closed = false;
        arc.filled = false;

        for (var i = 0; i < arc.pathPoints.length; i++) {
            var point = arc.pathPoints[i];
            var angle = angles[i];
            var anchor = ellipsePoint(x, y, radiusX, radiusY, angle);
            var tangentX = -radiusX * Math.sin(angle) * handleScale;
            var tangentY = radiusY * Math.cos(angle) * handleScale;
            point.anchor = anchor;
            point.leftDirection = i === 0 ? anchor : [anchor[0] - tangentX, anchor[1] - tangentY];
            point.rightDirection = i === arc.pathPoints.length - 1 ? anchor :
                [anchor[0] + tangentX, anchor[1] + tangentY];
            point.pointType = PointType.SMOOTH;
        }
        return arc;
    }

    function ellipsePoint(x, y, radiusX, radiusY, angle) {
        return [x + radiusX * Math.cos(angle), y + radiusY * Math.sin(angle)];
    }

    function makeLine(group, x1, y1, x2, y2) {
        var line = group.pathItems.add();
        line.setEntirePath([[x1, y1], [x2, y2]]);
        line.closed = false;
        line.filled = false;
        return line;
    }

    function copyStrokeStyle(from, to) {
        to.stroked = from.stroked;
        if (!from.stroked) return;
        try { to.strokeColor = from.strokeColor; } catch(e) {}
        try { to.strokeWidth = from.strokeWidth; } catch(e2) {}
        try { to.strokeDashes = from.strokeDashes; } catch(e3) {}
        try { to.strokeDashOffset = from.strokeDashOffset; } catch(e4) {}
        try { to.strokeCap = from.strokeCap; } catch(e5) {}
        try { to.strokeJoin = from.strokeJoin; } catch(e6) {}
        try { to.strokeMiterLimit = from.strokeMiterLimit; } catch(e7) {}
    }

    function getSelectedCircle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        return item.typename === "PathItem" && item.closed ? item : null;
    }

    function hasCircularPathPoints(item) {
        if (item.pathPoints.length !== 4) return false;
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

    function parseNumber(value) {
        var number = parseFloat(String(value).replace(",", "."));
        return isNaN(number) ? null : number;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function roundTo(value, step) {
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    function formatSignedAngle(value) {
        value = Math.round(value);
        return value > 0 ? "+" + value : String(value);
    }
})();
