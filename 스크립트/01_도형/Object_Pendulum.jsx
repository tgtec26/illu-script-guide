/*
  Object_Pendulum.jsx
  기능: 선택한 수평선(천장)에 진자 운동 그림을 그립니다.
    - 실제 위치는 실선, 중앙과 반대편 끝은 파선
    - 피벗을 중심으로 한 진자 궤적(파선 호)
    - 각도 θ 표시, 진자 길이 l 표시, 수평선과 수직선 사이 직각 표시
    - 공은 좌측 상단 하이라이트를 넣은 3D 구
  사용법: 수평선 하나를 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 수평선을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectPendulum/settings";
    var MM = 2.834645669;

    var doc = app.activeDocument;
    var ceiling = getSelectedLine(doc.selection);
    if (ceiling === null) {
        alert("천장이 될 수평선 하나를 선택해주세요.\n\n" +
            "선택 도구(V)로 직선 패스 하나를 선택한 뒤 실행하면\n" +
            "그 선의 가운데를 진자의 고정점으로 삼습니다.");
        return;
    }

    var ceilingBounds = ceiling.geometricBounds;
    var pivotX = (ceilingBounds[0] + ceilingBounds[2]) / 2;
    var pivotY = (ceilingBounds[1] + ceilingBounds[3]) / 2;

    var lengthMm = 30;
    var angleDeg = 25;
    var ballMm = 6;
    var showTheta = true;
    var showLength = true;
    var lengthLabel = "l";
    var showTrail = true;
    var showRightAngle = true;
    var bulgePercent = 11;
    var thetaRadiusPercent = 30;
    var ball3D = true;
    var previewEnabled = true;
    var previewGroup = null;

    // 그라데이션은 문서당 한 번만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
    // 미리보기가 아래 함수 선언보다 먼저 실행되므로 상태는 여기서 초기화한다.
    var _sphereGradient = null;
    var _sphereGradientReady = false;

    applySavedSettings();

    var LABEL_WIDTH = 66;
    var SLIDER_WIDTH = 180;

    var dlg = new Window("dialog", "진자 운동");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var sizePanel = addPanel(dlg, "크기");
    var lengthField = addNumberField(sizePanel, "진자 길이", "mm", lengthMm, 1, 1, 500);
    var angleField = addNumberField(sizePanel, "진자 각도", "°", angleDeg, 1, 1, 89);
    var ballField = addNumberField(sizePanel, "공 크기", "mm", ballMm, 0.5, 0.5, 100);

    var markPanel = addPanel(dlg, "표시");
    var thetaCheck = markPanel.add("checkbox", undefined, "각도 θ 표시");
    thetaCheck.value = showTheta;

    var thetaRadiusField = addNumberField(markPanel, "θ 호 거리", "%", thetaRadiusPercent, 1, 3, 95);

    var lengthRow = markPanel.add("group");
    lengthRow.alignChildren = ["left", "center"];
    var lengthCheck = lengthRow.add("checkbox", undefined, "진자 길이 표시");
    lengthCheck.value = showLength;
    var lengthLabelInput = lengthRow.add("edittext", undefined, lengthLabel);
    lengthLabelInput.characters = 4;

    var bulgeField = addNumberField(markPanel, "묶음 부풀기", "%", bulgePercent, 1, 0, 60);

    var trailCheck = markPanel.add("checkbox", undefined, "진자 궤적 표시");
    trailCheck.value = showTrail;
    var rightAngleCheck = markPanel.add("checkbox", undefined, "직각 표시");
    rightAngleCheck.value = showRightAngle;
    var ball3DCheck = markPanel.add("checkbox", undefined, "공 3D 조명 효과");
    ball3DCheck.value = ball3D;

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인", {name: "ok"});
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    thetaCheck.onClick = updatePreview;
    lengthCheck.onClick = updatePreview;
    lengthLabelInput.onChanging = updatePreview;
    trailCheck.onClick = updatePreview;
    rightAngleCheck.onClick = updatePreview;
    ball3DCheck.onClick = updatePreview;
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    updatePreview();
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        try {
            var finalGroup = drawPendulum();
            finalGroup.name = "Pendulum";
            saveSettings();
            doc.selection = null;
            finalGroup.selected = true;
        } catch (e) {
            alert("진자를 그리는 중 오류가 발생했습니다.\n\n" +
                "단계: " + lastStep + "\n오류: " + e + (e && e.line ? " (줄 " + e.line + ")" : ""));
        }
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    // 어느 단계에서 실패했는지 알 수 있도록 진행 상황을 기록한다
    var lastStep = "";

    function drawPendulum() {
        lastStep = "그룹 만들기";
        var group = doc.activeLayer.groupItems.add();
        var length = lengthMm * MM;
        var ballDia = ballMm * MM;
        var radians = angleDeg * Math.PI / 180;

        var black = makeBlack();
        var gray = makeGray(60);

        // 세 위치: 실제(왼쪽), 중앙(수직 아래), 반대편 끝(오른쪽)
        var actual = [pivotX - length * Math.sin(radians), pivotY - length * Math.cos(radians)];
        var center = [pivotX, pivotY - length];
        var opposite = [pivotX + length * Math.sin(radians), pivotY - length * Math.cos(radians)];

        // 궤적: 피벗을 중심으로 한 호. 실제 위치에서 반대편 끝까지
        if (showTrail) {
            lastStep = "궤적 호";
            var trail = drawArc(group, pivotX, pivotY, length,
                -90 - angleDeg, -90 + angleDeg, black);
            setDashed(trail);
        }

        // 반대편 끝과 중앙: 파선 줄 + 파선 원 + 중심점
        lastStep = "중앙·반대편 위치";
        drawDashedPosition(group, center, ballDia, black);
        drawDashedPosition(group, opposite, ballDia, black);

        // 실제 위치: 실선 줄 + 3D 공
        lastStep = "진자 줄";
        var rod = drawLine(group, pivotX, pivotY, actual[0], actual[1], black);
        lastStep = "공";
        drawBall(group, actual[0], actual[1], ballDia, black);

        if (showRightAngle) {
            lastStep = "직각 표시";
            drawRightAngleMark(group, black);
        }
        if (showTheta) {
            lastStep = "θ 표시";
            drawThetaMark(group, length, radians, black);
        }
        if (showLength) {
            lastStep = "길이 표시";
            drawLengthLabel(group, actual, radians, black);
        }

        return group;

        function drawDashedPosition(container, point, dia, color) {
            var line = drawLine(container, pivotX, pivotY, point[0], point[1], color);
            setDashed(line);

            var circle = container.pathItems.ellipse(
                point[1] + dia / 2, point[0] - dia / 2, dia, dia);
            circle.filled = false;
            circle.stroked = true;
            circle.strokeColor = color;
            circle.strokeWidth = 0.4;
            setDashed(circle);

            // 중심점
            var dotDia = Math.max(0.8, dia * 0.16);
            var dot = container.pathItems.ellipse(
                point[1] + dotDia / 2, point[0] - dotDia / 2, dotDia, dotDia);
            dot.filled = true;
            dot.fillColor = color;
            dot.stroked = false;
        }

        // 원자 모형 핵과 같은 방식: 하이라이트를 중심에 둔 큰 원을 공 크기로 클리핑
        function drawBall(container, cx, cy, dia, edgeColor) {
            var radius = dia / 2;
            var outline = container.pathItems.ellipse(cy + radius, cx - radius, dia, dia);
            outline.filled = true;
            outline.fillColor = makeGray(35);
            outline.stroked = true;
            outline.strokeColor = edgeColor;
            outline.strokeWidth = 0.4;

            if (!ball3D) return outline;

            var gradient = getSphereGradient();
            if (!gradient) return outline;

            var clipGroup = container.groupItems.add();
            var highlightX = cx - radius * 0.35;   // 좌측 상단으로 치우친 하이라이트
            var highlightY = cy + radius * 0.35;
            var bigRadius = radius * 1.7;

            var big = clipGroup.pathItems.ellipse(
                highlightY + bigRadius, highlightX - bigRadius, bigRadius * 2, bigRadius * 2);
            big.stroked = false;

            // 그라데이션 적용이 거부되면 단색 공으로 남긴다
            try {
                var gradientColor = new GradientColor();
                gradientColor.gradient = gradient;
                big.filled = true;
                big.fillColor = gradientColor;
            } catch (gradientError) {
                clipGroup.remove();
                return outline;
            }

            var mask = clipGroup.pathItems.ellipse(cy + radius, cx - radius, dia, dia);
            mask.filled = false;
            mask.stroked = false;
            mask.clipping = true;
            clipGroup.clipped = true;

            // 테두리는 클리핑 그룹 위에 따로 둔다
            outline.filled = false;
            outline.zOrder(ZOrderMethod.BRINGTOFRONT);
            return clipGroup;
        }

        function drawRightAngleMark(container, color) {
            // 천장(수평)과 수직선이 이루는 직각. 반대편 쪽에 작은 사각형으로 표시
            var size = 2.2 * MM;
            var mark = container.pathItems.add();
            mark.setEntirePath([
                [pivotX + size, pivotY],
                [pivotX + size, pivotY - size],
                [pivotX, pivotY - size]
            ]);
            mark.closed = false;
            mark.filled = false;
            mark.stroked = true;
            mark.strokeColor = color;
            mark.strokeWidth = 0.4;
        }

        function drawThetaMark(container, length, radians, color) {
            // 수직선과 실선 사이의 호
            var arcRadius = length * (thetaRadiusPercent / 100);
            var arc = drawArc(container, pivotX, pivotY, arcRadius,
                -90 - angleDeg, -90, color);
            arc.strokeWidth = 0.4;

            // θ 는 호 바깥쪽, 두 선 사이 방향에 놓는다
            var midRadians = (radians / 2);
            var labelDistance = arcRadius + 2.6 * MM;
            var labelX = pivotX - labelDistance * Math.sin(midRadians);
            var labelY = pivotY - labelDistance * Math.cos(midRadians);
            placeCenteredText(container, "θ", labelX, labelY, color, "HyhwpEQ");
        }

        function drawLengthLabel(container, actual, radians, color) {
            // 진자 줄을 바깥쪽에서 감싸는 활 모양 파선. 이 선이 길이를 가리킨다.
            var bulge = length * (bulgePercent / 100);
            var brace = drawLengthBrace(container, actual, radians, bulge, color);

            // 활은 공 중심까지 이어지므로 공보다 뒤에 둬서 공에 가려지게 한다
            if (brace !== null) {
                try { brace.zOrder(ZOrderMethod.SENDTOBACK); } catch (e) {}
            }

            // 글자는 활의 가장 부푼 지점보다 조금 더 바깥에 둔다
            var midX = (pivotX + actual[0]) / 2;
            var midY = (pivotY + actual[1]) / 2;
            var offset = bulge * 0.75 + 3 * MM;
            var labelX = midX - offset * Math.cos(radians);
            var labelY = midY + offset * Math.sin(radians);
            placeCenteredText(container, lengthLabel, labelX, labelY, color, "GSMediItaC1");
            return brace;
        }

        // 고정점과 공 중심을 잇되 줄 바깥쪽으로 볼록한 3차 베지어 하나.
        // 길이를 나타내는 선이므로 양 끝은 실이 붙은 점과 공 중심에 정확히 맞춘다.
        function drawLengthBrace(container, actual, radians, bulge, color) {
            if (bulge <= 0) return null;

            var dirX = -Math.sin(radians);   // 고정점에서 공으로 향하는 단위 벡터
            var dirY = -Math.cos(radians);
            var normalX = -Math.cos(radians); // 줄 바깥쪽(왼쪽) 법선
            var normalY = Math.sin(radians);

            var path = container.pathItems.add();
            var first = path.pathPoints.add();
            first.anchor = [pivotX, pivotY];
            first.leftDirection = [pivotX, pivotY];
            first.rightDirection = [
                pivotX + dirX * length / 3 + normalX * bulge,
                pivotY + dirY * length / 3 + normalY * bulge
            ];
            first.pointType = PointType.CORNER;

            var last = path.pathPoints.add();
            last.anchor = [actual[0], actual[1]];
            last.leftDirection = [
                actual[0] - dirX * length / 3 + normalX * bulge,
                actual[1] - dirY * length / 3 + normalY * bulge
            ];
            last.rightDirection = [actual[0], actual[1]];
            last.pointType = PointType.CORNER;

            path.closed = false;
            path.filled = false;
            path.stroked = true;
            path.strokeColor = color;
            setDashed(path);
            return path;
        }
    }

    // 중심 좌표에 글자를 놓는다. 글리프의 실제 경계를 기준으로 맞춘다.
    function placeCenteredText(container, contents, cx, cy, color, fontName) {
        var frame = container.textFrames.add();
        frame.contents = contents;

        var attributes = frame.textRange.characterAttributes;
        attributes.size = 9;
        attributes.fillColor = color;
        var font = getFont(fontName);
        if (font !== null) {
            try { attributes.textFont = font; } catch (e) {}
        }

        var duplicate = frame.duplicate();
        var outlined = duplicate.createOutline();
        var bounds = outlined.geometricBounds;
        outlined.remove();

        var glyphCx = (bounds[0] + bounds[2]) / 2;
        var glyphCy = (bounds[1] + bounds[3]) / 2;
        frame.translate(cx - glyphCx, cy - glyphCy);
        return frame;
    }

    // 시작 각도에서 끝 각도까지의 원호. 90도 이하 구간마다 3차 베지어 하나로 그린다.
    function drawArc(container, cx, cy, radius, startDeg, endDeg, color) {
        var path = container.pathItems.add();
        var segments = Math.max(1, Math.ceil(Math.abs(endDeg - startDeg) / 90));
        var stepDeg = (endDeg - startDeg) / segments;
        var handle = radius * (4 / 3) * Math.tan((stepDeg * Math.PI / 180) / 4);

        for (var i = 0; i <= segments; i++) {
            var radians = (startDeg + stepDeg * i) * Math.PI / 180;
            var cos = Math.cos(radians);
            var sin = Math.sin(radians);
            var anchorX = cx + radius * cos;
            var anchorY = cy + radius * sin;
            var handleX = -sin * handle;
            var handleY = cos * handle;

            var point = path.pathPoints.add();
            point.anchor = [anchorX, anchorY];
            point.leftDirection = [anchorX - handleX, anchorY - handleY];
            point.rightDirection = [anchorX + handleX, anchorY + handleY];
            point.pointType = PointType.SMOOTH;
        }

        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = 0.4;
        return path;
    }

    function drawLine(container, x1, y1, x2, y2, color) {
        var line = container.pathItems.add();
        line.setEntirePath([[x1, y1], [x2, y2]]);
        line.closed = false;
        line.filled = false;
        line.stroked = true;
        line.strokeColor = color;
        line.strokeWidth = 0.6;
        return line;
    }

    function setDashed(item) {
        try {
            item.strokeDashes = [2, 1.4];
            item.strokeWidth = 0.4;
        } catch (e) {}
    }

    function getSphereGradient() {
        // 만들기를 이미 시도했으면 결과를 그대로 쓴다(성공한 그라데이션 또는 실패를 뜻하는 null).
        // 값 비교가 아니라 시도 여부로 판단해야 선언 전에 호출돼도 안전하다.
        if (_sphereGradientReady) return _sphereGradient;
        _sphereGradientReady = true;
        try {
            // 원자 모형(Object_AtomModel)에서 검증된 순서 그대로 만든다.
            // 그라데이션 정지점은 CMYK 색만 받으므로 문서 색상 모드와 무관하게 CMYK 로 넣는다.
            var stops = [
                {pos: 0, color: cmyk(0, 0, 0, 0), mid: 13.3},
                {pos: 100, color: cmyk(0, 0, 0, 70)}
            ];
            var gradient = doc.gradients.add();
            gradient.name = "PendulumSphere_" + (new Date().getTime());
            gradient.type = GradientType.RADIAL;
            while (gradient.gradientStops.length < stops.length) gradient.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                gradient.gradientStops[i].rampPoint = stops[i].pos;
                gradient.gradientStops[i].color = stops[i].color;
                if (stops[i].mid) gradient.gradientStops[i].midPoint = stops[i].mid;
            }
            _sphereGradient = gradient;
        } catch (e) {
            _sphereGradient = null;
        }
        return _sphereGradient;
    }

    function makeBlack() {
        return makeGray(100);
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
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    function getFont(name) {
        try {
            return app.textFonts.getByName(name);
        } catch (e) {
            return null;
        }
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
        try {
            previewGroup = drawPendulum();
            previewGroup.name = "Pendulum Preview";
        } catch (e) {
            clearPreview();
            previewEnabled = false;
            previewCheck.value = false;
            alert("미리보기를 그리는 중 오류가 발생했습니다.\n\n" +
                "단계: " + lastStep + "\n오류: " + e + (e && e.line ? " (줄 " + e.line + ")" : "") +
                "\n\n미리보기를 껐습니다. 옵션을 조정한 뒤 확인을 눌러보세요.");
        }
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function readFields(showAlert) {
        var length = parseNumber(lengthField.input.text);
        var angle = parseNumber(angleField.input.text);
        var ball = parseNumber(ballField.input.text);
        var bulge = parseNumber(bulgeField.input.text);
        var thetaRadius = parseNumber(thetaRadiusField.input.text);

        if (length === null || length <= 0) {
            if (showAlert) alert("진자 길이는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }
        if (angle === null || angle <= 0 || angle >= 90) {
            if (showAlert) alert("진자 각도는 0보다 크고 90보다 작은 숫자로 입력해주세요.");
            return false;
        }
        if (ball === null || ball <= 0) {
            if (showAlert) alert("공 크기는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }
        if (bulge === null || bulge < 0) {
            if (showAlert) alert("묶음 부풀기는 0 이상의 숫자로 입력해주세요.");
            return false;
        }
        if (thetaRadius === null || thetaRadius <= 0) {
            if (showAlert) alert("θ 호 거리는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }

        lengthMm = length;
        angleDeg = angle;
        ballMm = ball;
        bulgePercent = bulge;
        thetaRadiusPercent = thetaRadius;
        showTheta = thetaCheck.value;
        showLength = lengthCheck.value;
        lengthLabel = lengthLabelInput.text;
        showTrail = trailCheck.value;
        showRightAngle = rightAngleCheck.value;
        ball3D = ball3DCheck.value;
        return true;
    }

    function getSelectedLine(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem") return null;
        return item;
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
            input.text = formatValue(clampField(field, stepped));
            updatePreview();
        };
        input.onChanging = updatePreview;
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampField(field, parsed);
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
        value = clampField(field, value);
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
        updatePreview();
    }

    function clampField(field, value) {
        if (value < field.minimum) value = field.minimum;
        if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
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
        var parts = [
            "v4",
            lengthMm,
            angleDeg,
            ballMm,
            showTheta ? "1" : "0",
            showLength ? "1" : "0",
            showTrail ? "1" : "0",
            showRightAngle ? "1" : "0",
            ball3D ? "1" : "0",
            bulgePercent,
            thetaRadiusPercent,
            lengthLabel
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v4" || p.length < 12) return;

        var length = parseFloat(p[1]);
        var angle = parseFloat(p[2]);
        var ball = parseFloat(p[3]);
        if (length > 0) lengthMm = length;
        if (angle > 0 && angle < 90) angleDeg = angle;
        if (ball > 0) ballMm = ball;
        showTheta = (p[4] === "1");
        showLength = (p[5] === "1");
        showTrail = (p[6] === "1");
        showRightAngle = (p[7] === "1");
        ball3D = (p[8] === "1");
        var bulge = parseFloat(p[9]);
        if (bulge >= 0) bulgePercent = bulge;
        var thetaRadius = parseFloat(p[10]);
        if (thetaRadius > 0) thetaRadiusPercent = thetaRadius;
        if (p[11] !== "") lengthLabel = p[11];
    }
})();
