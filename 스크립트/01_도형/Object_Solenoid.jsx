/*
  Object_Solenoid.jsx
  기능: 선택한 사각형을 도선(원기둥)으로 바꾸고 코일을 감습니다.
    - 코일은 실제 나선의 투영이라 감긴 횟수와 무관하게 이전-다음 코일이 이어져 보입니다.
    - 앞쪽 반턴은 도선 위, 뒤쪽 반턴은 도선 뒤에 그려집니다.
    - 횟수가 적을수록 한 코일의 좌우 폭이 넓어지고, 많을수록 좁아집니다(피치에 비례).
  사용법: 가로로 긴 사각형을 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 사각형을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectSolenoid/settings";
    var MM = 2.834645669;
    var KAPPA = 0.5522847;

    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!sel || sel.length !== 1 || sel[0].typename !== "PathItem") {
        alert("도선이 될 사각형 하나를 선택해주세요.\n\n" +
            "사각형의 가로가 도선 길이, 세로가 도선 굵기가 됩니다.");
        return;
    }

    var rect = sel[0];
    var bounds = rect.geometricBounds; // [left, top, right, bottom]
    var leftX = bounds[0];
    var rightX = bounds[2];
    var centerY = (bounds[1] + bounds[3]) / 2;
    var rodRadius = (bounds[1] - bounds[3]) / 2;
    var rodLength = rightX - leftX;

    if (rodLength <= 0 || rodRadius <= 0) {
        alert("가로와 세로 크기가 있는 사각형을 선택해주세요.");
        return;
    }

    var coilWeight = 2;
    var turnCount = 8;
    var coilGapMm = 1;      // 도선 표면과 코일 사이 거리
    var viewAngleDeg = 20;  // 시점 각도: +면 왼쪽 끝면, -면 오른쪽 끝면이 보임
    var previewEnabled = true;
    var previewGroup = null;
    var rectWasHidden = rect.hidden;

    // 그라데이션은 문서당 한 번만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
    var _rodGradient = null;
    var _rodGradientReady = false;

    applySavedSettings();

    var LABEL_WIDTH = 66;
    var SLIDER_WIDTH = 180;

    var dlg = new Window("dialog", "코일 감긴 도선");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var optionPanel = addPanel(dlg, "코일");
    var weightField = addNumberField(optionPanel, "코일 굵기", "pt", coilWeight, 0.1, 0.1, 5);
    var turnField = addNumberField(optionPanel, "감긴 횟수", "회", turnCount, 1, 1, 20);
    var gapField = addNumberField(optionPanel, "코일 간격", "mm", coilGapMm, 0.1, 0, 3);

    var rodPanel = addPanel(dlg, "금속 막대");
    var viewField = addNumberField(rodPanel, "시점 각도", "°", viewAngleDeg, 1, -60, 60);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    rect.hidden = true;
    rect.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = drawSolenoid();
        finalGroup.name = "Solenoid";
        try { finalGroup.move(rect, ElementPlacement.PLACEBEFORE); } catch (e) {}
        rect.remove();
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        rect.hidden = rectWasHidden;
        rect.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    function drawSolenoid() {
        var group = doc.activeLayer.groupItems.add();
        var black = makeGray(100);

        // 코일 세로 반지름 = 도선 반지름 + 간격 옵션
        var b = rodRadius + coilGapMm * MM;
        var capRx = getCapRx();
        var margin = capRx + 2 * MM;
        var usable = rodLength - 2 * margin;

        if (usable <= 0) {
            // 코일을 감을 자리가 없으면 도선만 그린다
            drawRod(group, black, capRx);
            return group;
        }


        // 루프 좌우 폭은 피치(코일 간격)에 비례시켜 연결된 느낌을 만든다.
        // a가 피치에 걸려 있으므로 한 번 추정 후 다시 계산해 수렴시킨다.
        var a = clampValue((usable / turnCount) * 0.35, b * 0.10, b * 0.95);
        var pitch = (usable - 2 * a) / turnCount;
        a = clampValue(pitch * 0.35, b * 0.10, b * 0.95);
        pitch = (usable - 2 * a) / turnCount;

        if (pitch <= 0) {
            drawRod(group, black, capRx);
            return group;
        }

        var startX = leftX + margin + a;

        // 나선: x = startX + pitch·θ/2π + a·sinθ, y = centerY + b·cosθ
        function helixPoint(t) {
            // -cos 으로 시작(θ=0)과 끝이 아래쪽에 오게 한다
            return [startX + pitch * t / (2 * Math.PI) + a * Math.sin(t), centerY - b * Math.cos(t)];
        }
        function helixTangent(t) {
            return [a * Math.cos(t) + pitch / (2 * Math.PI), b * Math.sin(t)];
        }

        // 반턴(π) 하나를 π/2 두 구간의 베지어 패스로 그린다
        function drawHalfTurn(container, startT) {
            var thetas = [startT, startT + Math.PI / 2, startT + Math.PI];
            var handle = Math.PI / 6; // Δθ/3
            var path = container.pathItems.add();

            for (var i = 0; i < thetas.length; i++) {
                var t = thetas[i];
                var anchor = helixPoint(t);
                var tangent = helixTangent(t);
                var point = path.pathPoints.add();
                point.anchor = anchor;
                point.leftDirection = (i === 0) ? anchor :
                    [anchor[0] - tangent[0] * handle, anchor[1] - tangent[1] * handle];
                point.rightDirection = (i === thetas.length - 1) ? anchor :
                    [anchor[0] + tangent[0] * handle, anchor[1] + tangent[1] * handle];
                point.pointType = PointType.SMOOTH;
            }

            path.closed = false;
            path.filled = false;
            path.stroked = true;
            path.strokeColor = black;
            path.strokeWidth = coilWeight;
            try {
                path.strokeCap = StrokeCap.ROUNDENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
            } catch (e) {}
            return path;
        }

        // 뒤쪽 반턴들(도선 뒤) → 도선 → 앞쪽 반턴들(도선 위) 순서로 쌓는다
        for (var back = 0; back < turnCount; back++) {
            drawHalfTurn(group, 2 * back * Math.PI + Math.PI);
        }

        drawRod(group, black, capRx);

        for (var front = 0; front < turnCount; front++) {
            drawHalfTurn(group, 2 * front * Math.PI);
        }

        return group;
    }

    // 도선: 양 끝이 반타원인 실루엣(세로 그라데이션) + 왼쪽 끝면 타원
    function getCapRx() {
        return rodRadius * Math.sin(Math.abs(viewAngleDeg) * Math.PI / 180);
    }

    function drawRod(container, black, capRx) {
        var topY = centerY + rodRadius;
        var bottomY = centerY - rodRadius;

        var body = container.pathItems.add();
        addCorner(body, [leftX, topY], [leftX - capRx * KAPPA, topY], true);
        addCorner(body, [leftX - capRx, centerY],
            [leftX - capRx, centerY + rodRadius * KAPPA],
            [leftX - capRx, centerY - rodRadius * KAPPA]);
        addCorner(body, [leftX, bottomY], [leftX - capRx * KAPPA, bottomY], false);
        addCorner(body, [rightX, bottomY], [rightX + capRx * KAPPA, bottomY], true);
        addCorner(body, [rightX + capRx, centerY],
            [rightX + capRx, centerY - rodRadius * KAPPA],
            [rightX + capRx, centerY + rodRadius * KAPPA]);
        addCorner(body, [rightX, topY], [rightX + capRx * KAPPA, topY], false);
        body.closed = true;
        body.stroked = true;
        body.strokeColor = black;
        body.strokeWidth = 0.8;
        body.filled = true;
        applyRodFill(body);

        // 끝면: 시점 각도가 +면 왼쪽, -면 오른쪽에서 보인다. 0이면 안 보임
        if (Math.abs(viewAngleDeg) >= 1 && capRx > 0.01) {
            var faceLeft = viewAngleDeg > 0 ? (leftX - capRx) : (rightX - capRx);
            var cap = container.pathItems.ellipse(
                centerY + rodRadius, faceLeft, capRx * 2, rodRadius * 2);
            cap.filled = true;
            cap.fillColor = makeGray(22);
            cap.stroked = true;
            cap.strokeColor = black;
            cap.strokeWidth = 0.8;
        }
        return body;
    }

    // 실루엣 꼭짓점 추가. 곡선 쪽 핸들 하나(또는 둘)만 지정한다.
    // outHandle=true 면 진행 방향(right), false 면 반대(left)에 핸들을 둔다.
    function addCorner(path, anchor, handleA, handleBOrOut) {
        var point = path.pathPoints.add();
        point.anchor = anchor;
        if (handleBOrOut === true) {
            point.leftDirection = anchor;
            point.rightDirection = handleA;
        } else if (handleBOrOut === false) {
            point.leftDirection = handleA;
            point.rightDirection = anchor;
        } else {
            point.leftDirection = handleA;
            point.rightDirection = handleBOrOut;
        }
        point.pointType = PointType.CORNER;
        return point;
    }

    // 몸통에 세로 그라데이션. 그라데이션 적용이 거부되면 단색으로 남긴다.
    function applyRodFill(item) {
        item.fillColor = makeGray(18);

        var gradient = getRodGradient();
        if (!gradient) return;

        try {
            var gradientColor = new GradientColor();
            gradientColor.gradient = gradient;
            item.fillColor = gradientColor;
            // 기본 그라데이션은 가로 방향이므로 도형만 +90도 돌렸다가
            // 그라데이션까지 포함해 -90도 되돌려 세로 방향으로 만든다.
            // 이 방향이어야 밝은 띠가 중심 위쪽에 온다.
            item.rotate(90, true, false, false, false, Transformation.CENTER);
            item.rotate(-90, true, true, true, true, Transformation.CENTER);
        } catch (e) {
            item.fillColor = makeGray(18);
        }
    }

    function getRodGradient() {
        if (_rodGradientReady) return _rodGradient;
        _rodGradientReady = true;
        try {
            var stops = [
                {pos: 0, color: cmyk(0, 0, 0, 45)},
                {pos: 40, color: cmyk(0, 0, 0, 6), mid: 50},
                {pos: 100, color: cmyk(0, 0, 0, 52)}
            ];
            var gradient = doc.gradients.add();
            gradient.name = "SolenoidRod_" + (new Date().getTime());
            gradient.type = GradientType.LINEAR;
            while (gradient.gradientStops.length < stops.length) gradient.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                gradient.gradientStops[i].rampPoint = stops[i].pos;
                gradient.gradientStops[i].color = stops[i].color;
                if (stops[i].mid) gradient.gradientStops[i].midPoint = stops[i].mid;
            }
            _rodGradient = gradient;
        } catch (e) {
            _rodGradient = null;
        }
        return _rodGradient;
    }

    function cmyk(c, m, y, k) {
        var color = new CMYKColor();
        color.cyan = c;
        color.magenta = m;
        color.yellow = y;
        color.black = k;
        return color;
    }

    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            return cmyk(0, 0, 0, k);
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    // -------------------------------------------------------
    // 미리보기 · 입력
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        previewGroup = drawSolenoid();
        previewGroup.name = "Solenoid Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function readFields(showAlert) {
        var weight = parseNumber(weightField.input.text);
        var turns = parseNumber(turnField.input.text);
        var gap = parseNumber(gapField.input.text);
        var view = parseNumber(viewField.input.text);

        if (weight === null || weight <= 0) {
            if (showAlert) alert("코일 굵기는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }
        if (turns === null || turns < 1) {
            if (showAlert) alert("감긴 횟수는 1 이상의 정수로 입력해주세요.");
            return false;
        }
        if (gap === null || gap < 0) {
            if (showAlert) alert("코일 간격은 0 이상의 숫자로 입력해주세요.");
            return false;
        }
        if (view === null || view < -60 || view > 60) {
            if (showAlert) alert("시점 각도는 -60부터 60 사이로 입력해주세요.");
            return false;
        }

        coilWeight = weight;
        turnCount = Math.round(turns);
        coilGapMm = gap;
        viewAngleDeg = view;
        return true;
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨 · 입력칸 · 단위 · 슬라이더를 한 줄에 배치.
    // 슬라이더를 끌면 단위에 맞춰 연속으로 값이 바뀐다.
    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.characters = 5;
        input.justify = "center";
        row.add("statictext", undefined, unit);
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = 22;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;

        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = 22;

        var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};
        down.onClick = function() { stepField(field, -1); };
        up.onClick = function() { stepField(field, 1); };

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampValue(stepped, field.minimum, field.maximum));
            updatePreview();
        };
        input.onChanging = updatePreview;
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampValue(parsed, field.minimum, field.maximum);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            updatePreview();
        };
        return field;
    }

    // 버튼 한 번 = 1단계. 세밀 조절용.
    function stepField(field, direction) {
        var value = parseNumber(field.input.text);
        if (value === null) value = field.minimum;
        value = Math.round((value + (field.step * direction)) / field.step) * field.step;
        value = clampValue(value, field.minimum, field.maximum);
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
        updatePreview();
    }

    function clampValue(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function formatValue(value) {
        return String(Math.round(value * 100) / 100);
    }

    function saveSettings() {
        var parts = ["v2", coilWeight, turnCount, coilGapMm, viewAngleDeg];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length < 5) return;

        var weight = parseFloat(p[1]);
        var turns = parseInt(p[2], 10);
        var gap = parseFloat(p[3]);
        var view = parseFloat(p[4]);
        if (weight > 0) coilWeight = clampValue(weight, 0.1, 5);
        if (turns >= 1) turnCount = clampValue(turns, 1, 20);
        if (gap >= 0) coilGapMm = clampValue(gap, 0, 3);
        if (view >= -60 && view <= 60) viewAngleDeg = view;
    }
})();
