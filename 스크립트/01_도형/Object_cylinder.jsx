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
    var heightMm = roundTo(diameterMm, HEIGHT_STEP_MM);
    var maxHeightMm = Math.max(HEIGHT_STEP_MM, roundTo(diameterMm * 5, HEIGHT_STEP_MM));
    var viewAngle = 70;
    var isVertical = true;
    var divisionsEnabled = false;
    var divisionCount = 2;
    var divisionRotation = 90;
    var K_STEP = 10;
    var FACE_TOP = 0;
    var FACE_INNER = 1;
    var FACE_OUTER = 2;
    var faceK = [0, 0, 0];
    var activeFace = FACE_TOP;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    var dlg = new Window("dialog", "오브젝트 실린더");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var diameterPanel = dlg.add("panel", undefined, "지름");
    diameterPanel.orientation = "column";
    diameterPanel.alignChildren = "fill";
    var outerDiameterRow = diameterPanel.add("group");
    outerDiameterRow.add("statictext", undefined, "외경");
    outerDiameterRow.add("statictext", undefined, formatNumber(diameterMm, 2) + " mm");
    var innerDiameterRow = diameterPanel.add("group");
    innerDiameterRow.add("statictext", undefined, "내경(지름)");
    var innerDiameterInput = innerDiameterRow.add("edittext", undefined, "0.00");
    innerDiameterInput.characters = 8;
    innerDiameterRow.add("statictext", undefined, "mm");
    var innerDiameterSlider = diameterPanel.add(
        "slider",
        undefined,
        innerDiameterMm,
        0,
        Math.max(DIAMETER_STEP_MM, maxInnerDiameterMm)
    );
    innerDiameterSlider.preferredSize.width = 360;
    innerDiameterSlider.stepdelta = DIAMETER_STEP_MM;

    var heightPanel = dlg.add("panel", undefined, "원기둥 높이");
    heightPanel.orientation = "column";
    heightPanel.alignChildren = "fill";
    var heightRow = heightPanel.add("group");
    heightRow.add("statictext", undefined, "높이");
    var heightInput = heightRow.add("edittext", undefined, formatNumber(heightMm, 2));
    heightInput.characters = 8;
    heightRow.add("statictext", undefined, "mm");
    var heightSlider = heightPanel.add("slider", undefined, heightMm, 0, maxHeightMm);
    heightSlider.preferredSize.width = 360;
    heightSlider.stepdelta = HEIGHT_STEP_MM;

    var viewPanel = dlg.add("panel", undefined, "바라보는 시점");
    viewPanel.orientation = "column";
    viewPanel.alignChildren = "fill";
    var viewRow = viewPanel.add("group");
    viewRow.add("statictext", undefined, "각도");
    var viewInput = viewRow.add("edittext", undefined, String(viewAngle));
    viewInput.characters = 8;
    viewRow.add("statictext", undefined, "°  (-180 ~ +180)");
    var viewSlider = viewPanel.add("slider", undefined, viewAngle, -180, 180);
    viewSlider.preferredSize.width = 360;

    var directionPanel = dlg.add("panel", undefined, "원기둥 방향");
    directionPanel.orientation = "row";
    var verticalRadio = directionPanel.add("radiobutton", undefined, "상하");
    var horizontalRadio = directionPanel.add("radiobutton", undefined, "좌우");
    verticalRadio.value = true;

    var divisionPanel = dlg.add("panel", undefined, "분할선");
    divisionPanel.orientation = "column";
    divisionPanel.alignChildren = "fill";
    var divisionCheck = divisionPanel.add("checkbox", undefined, "분할선 표시");
    divisionCheck.value = false;

    var countRow = divisionPanel.add("group");
    countRow.add("statictext", undefined, "분할 수");
    var countInput = countRow.add("edittext", undefined, String(divisionCount));
    countInput.characters = 8;
    var countSlider = divisionPanel.add("slider", undefined, divisionCount, 2, 24);
    countSlider.preferredSize.width = 360;
    countSlider.stepdelta = 1;

    var rotationRow = divisionPanel.add("group");
    rotationRow.add("statictext", undefined, "회전");
    var rotationInput = rotationRow.add("edittext", undefined, String(divisionRotation));
    rotationInput.characters = 8;
    rotationRow.add("statictext", undefined, "°  (-180 ~ +180)");
    var rotationSlider = divisionPanel.add("slider", undefined, divisionRotation, -180, 180);
    rotationSlider.preferredSize.width = 360;

    setDivisionControlsEnabled(false);

    var colorPanel = dlg.add("panel", undefined, "컬러");
    colorPanel.orientation = "column";
    colorPanel.alignChildren = "fill";
    var faceRow = colorPanel.add("group");
    var topFaceRadio = faceRow.add("radiobutton", undefined, "보이는면");
    var innerFaceRadio = faceRow.add("radiobutton", undefined, "내부");
    var outerFaceRadio = faceRow.add("radiobutton", undefined, "외부");
    topFaceRadio.value = true;

    var kRow = colorPanel.add("group");
    var kDownButton = kRow.add("button", undefined, "◀");
    kDownButton.preferredSize.width = 40;
    var kValueText = kRow.add("statictext", undefined, "000K");
    kValueText.preferredSize.width = 60;
    kValueText.justify = "center";
    var kUpButton = kRow.add("button", undefined, "▶");
    kUpButton.preferredSize.width = 40;

    setInnerFaceEnabled(false);
    updateKDisplay();

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    var okButton = buttons.add("button", undefined, "확인", {name: "ok"});
    var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

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

    viewSlider.onChanging = function() {
        viewAngle = Math.round(viewSlider.value);
        viewInput.text = formatSignedAngle(viewAngle);
        updatePreview();
    };

    viewInput.onChanging = function() {
        var value = parseNumber(viewInput.text);
        if (value !== null && value >= -180 && value <= 180) {
            viewAngle = value;
            viewSlider.value = value;
            updatePreview();
        }
    };

    viewInput.onChange = function() {
        var value = parseNumber(viewInput.text);
        if (value === null) value = viewAngle;
        viewAngle = clamp(value, -180, 180);
        viewSlider.value = viewAngle;
        viewInput.text = formatSignedAngle(viewAngle);
        updatePreview();
    };

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

    countSlider.onChanging = function() {
        divisionCount = Math.round(countSlider.value);
        countInput.text = String(divisionCount);
        updatePreview();
    };

    countInput.onChanging = function() {
        var value = parseNumber(countInput.text);
        if (value !== null && value >= 2) {
            divisionCount = Math.round(value);
            countSlider.value = clamp(divisionCount, 2, 24);
            updatePreview();
        }
    };

    countInput.onChange = function() {
        var value = parseNumber(countInput.text);
        if (value === null || value < 2) value = divisionCount;
        divisionCount = Math.max(2, Math.round(value));
        countSlider.value = clamp(divisionCount, 2, 24);
        countInput.text = String(divisionCount);
        updatePreview();
    };

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
        var validAngle = parseNumber(viewInput.text);
        var validInnerDiameter = parseNumber(innerDiameterInput.text);
        if (validInnerDiameter === null || validInnerDiameter < 0 || validInnerDiameter >= diameterMm) {
            alert("내경은 0 이상, 외경보다 작은 값으로 입력해주세요.");
            return;
        }
        if (validHeight === null || validHeight < 0) {
            alert("높이는 0 이상의 숫자로 입력해주세요.");
            return;
        }
        if (validAngle === null || validAngle < -180 || validAngle > 180) {
            alert("시점은 -180부터 +180 사이로 입력해주세요.");
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
        divisionCount = Math.max(2, Math.round(validCount));
        divisionRotation = validRotation;
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
        var finalGroup = createCylinder(heightMm * MM_TO_PT, viewAngle, isVertical);
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
        previewGroup = createCylinder(heightMm * MM_TO_PT, viewAngle, isVertical);
        previewGroup.name = "Cylinder Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function setDivisionControlsEnabled(enabled) {
        countRow.enabled = enabled;
        countSlider.enabled = enabled;
        rotationRow.enabled = enabled;
        rotationSlider.enabled = enabled;
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
                    divisionCount,
                    divisionRotation
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
            divisionCount,
            divisionRotation
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

    function getDivisionPoints(frontX, frontY, rearX, rearY, capWidth, capHeight, innerRatio, count, rotation) {
        var points = [];
        var axisX = rearX - frontX;
        var axisY = rearY - frontY;
        var holeRadiusX = capWidth / 2 * innerRatio;
        var holeRadiusY = capHeight / 2 * innerRatio;
        var rotationRadians = rotation * Math.PI / 180;

        for (var i = 0; i < count; i++) {
            var angle = rotationRadians + (Math.PI * 2 * i / count);
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
