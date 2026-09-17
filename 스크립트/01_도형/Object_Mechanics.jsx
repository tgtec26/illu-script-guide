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

// 역학: 진자 운동·수평 던지기·사인 곡선·코일 스프링을 한 창의 탭으로 묶었다.
// 탭마다 필요한 선택이 다르다 (진자: 수평선, 수평 던지기: 없음, 사인 곡선: 패스 하나, 코일 스프링: 원 하나).
// 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "Mechanics/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makePendulumEngine(), makeProjectileEngine(), makeSineWaveEngine(), makeCoilSpringEngine()];

    var win = new Window("dialog", "역학");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.spacing = 4;
    win.margins = 12;

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = "fill";
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = tabs.add("tab", undefined, engines[engineIndex].label);
        page.orientation = "column";
        page.alignChildren = "fill";
        page.spacing = 4;
        engines[engineIndex].error = engines[engineIndex].addRows(page);
        if (engines[engineIndex].error) {
            page.enabled = false;
            page.helpTip = engines[engineIndex].error;
        }
    }

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    // 저장된 탭이 선택에 맞지 않으면 선택을 쓰는 탭부터(뒤에서부터) 가능한 탭을 연다
    var tabIndex = 0;
    try {
        var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
        if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
    } catch (tabError) {}
    if (engines[tabIndex].error) {
        for (engineIndex = engines.length - 1; engineIndex >= 0; engineIndex--) {
            if (!engines[engineIndex].error) { tabIndex = engineIndex; break; }
        }
    }
    var engine = engines[tabIndex];
    tabs.selection = tabIndex;

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        if (engines[next].error) {
            tabs.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        engine.clearPreview();
        tabIndex = next;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    };
    previewCheck.onClick = function() { engine.setPreview(previewCheck.value); };
    okButton.onClick = function() {
        if (!engine.commit()) return;
        try { app.preferences.setStringPreference(TAB_PREF_KEY, String(tabIndex)); } catch (saveError) {}
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
    win.onShow = function() { engine.setPreview(previewCheck.value); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    if (result !== 1) engine.clearPreview();
    try { app.redraw(); } catch (redrawError) {}

    // ==== 진자 운동 ====
    function makePendulumEngine() {
        var api = {label: "진자 운동", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectPendulum/settings";
            var MM = 2.834645669;

            var doc = app.activeDocument;
            var ceiling = getSelectedLine(doc.selection);
            if (ceiling === null) return "천장이 될 수평선 하나를 선택해주세요. 선택 도구(V)로 직선 패스 하나를 선택한 뒤 실행하면 그 선의 가운데를 진자의 고정점으로 삼습니다.";

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
            var POSITION_LIMIT_MM = 100;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;

            // 그라데이션은 문서당 한 번만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
            // 미리보기가 아래 함수 선언보다 먼저 실행되므로 상태는 여기서 초기화한다.
            var _sphereGradient = null;
            var _sphereGradientReady = false;

            applySavedSettings();

            var LABEL_WIDTH = 66;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

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

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);

            thetaCheck.onClick = updatePreview;
            lengthCheck.onClick = updatePreview;
            lengthLabelInput.onChanging = updatePreview;
            trailCheck.onClick = updatePreview;
            rightAngleCheck.onClick = updatePreview;
            ball3DCheck.onClick = updatePreview;
            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { previewEnabled = on; updatePreview(); };
            api.updatePreview = updatePreview;
            api.clearPreview = clearPreview;
            api.commit = function() {
                if (!readFields(true)) return false;
                clearPreview();
                readFields(false);
                try {
                    var finalGroup = drawPendulum();
                    moveItem(finalGroup, offsetXmm * MM, offsetYmm * MM);
                    finalGroup.name = "Pendulum";
                    saveSettings();
                    doc.selection = null;
                    finalGroup.selected = true;
                } catch (e) {
                    alert("진자를 그리는 중 오류가 발생했습니다.\n\n" +
                        "단계: " + lastStep + "\n오류: " + e + (e && e.line ? " (줄 " + e.line + ")" : ""));
                    return false;
                }
                return true;
            };


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
                    moveItem(previewGroup, offsetXmm * MM, offsetYmm * MM);
                    previewGroup.name = "Pendulum Preview";
                } catch (e) {
                    clearPreview();
                    previewEnabled = false;
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
                var offX = parseNumber(offsetXField.input.text);
                var offY = parseNumber(offsetYField.input.text);

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

                if (offX === null || offX < -POSITION_LIMIT_MM || offX > POSITION_LIMIT_MM ||
                        offY === null || offY < -POSITION_LIMIT_MM || offY > POSITION_LIMIT_MM) {
                    if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " +
                        POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
                    return false;
                }

                offsetXmm = offX;
                offsetYmm = offY;
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
                var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.characters = 5;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;


                var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};

                slider.onChanging = function() {
                    if (field.syncing) return;
                    var stepped = Math.round(slider.value / field.step) * field.step;
                    input.text = formatValue(clampField(field, stepped));
                    commitField(field);
                };
                input.onChanging = function() { commitField(field); };
                input.onChange = function() {
                    var parsed = parseNumber(input.text);
                    if (parsed === null) parsed = field.minimum;
                    parsed = clampField(field, parsed);
                    input.text = formatValue(parsed);
                    field.syncing = true;
                    slider.value = parsed;
                    field.syncing = false;
                    commitField(field);
                };
                return field;
            }

            // 위치 필드는 도형을 다시 만들지 않고 미리보기만 옮기도록 갈아끼운다
            function commitField(field) {
                if (field.onCommit) field.onCommit();
                else updatePreview();
            }

            function bindOffsetField(field, isX) {
                field.onCommit = function() {
                    var value = parseNumber(field.input.text);
                    if (value === null) return;
                    value = clampField(field, value);
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                };
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
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
                    "v5",
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
                    offsetXmm,
                    offsetYmm,
                    lengthLabel
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v5" || p.length < 14) return;

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
                var offX = parseFloat(p[11]);
                var offY = parseFloat(p[12]);
                if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
                if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
                if (p[13] !== "") lengthLabel = p[13];
            }
            return null;
        }
        return api;
    }

    // ==== 수평 던지기 ====
    function makeProjectileEngine() {
        var api = {label: "수평 던지기", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectHorizontalProjectile/settings";
            var MM_TO_PT = 2.834645669;
            var GRAVITY = 9.8;
            var SCALE_MM_PER_M = 2;
            var PREVIEW_INTERVAL_MS = 40;
            // 포물선은 2차 곡선이라 3차 베지어 하나로 정확히 그릴 수 있지만, 그 "정확히 2차인 3차 곡선"을
            // GPU 미리보기가 1pt 이하 얇은 선에서 잘못 그린다(현과 곡선 사이가 검게 채워짐). 그래서
            // 앵커는 2개로 두고 핸들 길이를 시작 쪽 (1+skew)배, 끝 쪽 (1−skew)배로 바꿔 2차 꼴을 깬다.
            // 접선 방향과 양 끝점은 그대로. 0.1이면 포물선과의 오차가 최대 0.13pt(0.04mm)로 눈에 띄지 않는다.
            var HANDLE_SKEW = 0.1;
            if (!app.documents.length) {
                alert("문서를 먼저 열어주세요.");
                return;
            }
            var doc = app.activeDocument;
            if (doc.activeLayer.locked || !doc.activeLayer.visible) return "편집할 수 있는 레이어를 선택한 뒤 실행해주세요.";
            var originalSelection = [];
            var selection = doc.selection;
            if (selection && selection.typename === "TextRange") return "텍스트 편집을 마친 뒤 실행해주세요.";
            if (selection) {
                for (var i = 0; i < selection.length; i++) originalSelection.push(selection[i]);
            }
            var fields = [
                { key: "height", label: "높이", unit: "m", min: 0.1, max: 40, step: 0.1, initial: 20 },
                { key: "speed", label: "수평 속도", unit: "m/s", min: 0, max: 20, step: 0.1, initial: 10 },
                { key: "offsetX", label: "가로 이동", unit: "mm", min: -100, max: 100, step: 0.1, initial: 0 },
                { key: "offsetY", label: "세로 이동", unit: "mm", min: -100, max: 100, step: 0.1, initial: 0 },
                { key: "strokeWidth", label: "선 두께", unit: "pt", min: 0.3, max: 2, step: 0.1, initial: 0.3 }
            ];
            var options = readSettings();
            var view = doc.activeView ? doc.activeView : doc.views[0];
            var viewCenter = view.centerPoint;
            var initial = trajectory(options.height, options.speed);
            // 시작점은 처음 배치할 때만 정한다. 값을 바꿔도 투사 지점은 움직이지 않는다.
            var originX = viewCenter[0] - initial.width / 2;
            var originY = viewCenter[1] + initial.height / 2;
            var previewGroup = null;
            var previewPath = null;
            var appliedX = 0;
            var appliedY = 0;
            var pending = false;
            var lastPreviewTime = 0;
            var committed = false;

            var win = page;
            var shapePanel = win.add("panel", undefined, "수평 던지기");
            shapePanel.alignChildren = "fill";
            addRow(shapePanel, fields[0], false);
            addRow(shapePanel, fields[1], false);
            shapePanel.add("statictext", undefined, "오른쪽으로 투사 · 중력 9.8m/s² · 공기 저항 없음");
            shapePanel.add("statictext", undefined, "도면 축척: 실제 1m = 도면 2mm (가로·세로 동일)");
            var resultText = shapePanel.add("statictext", undefined, " ");
            resultText.preferredSize.width = 440;
            var strokePanel = win.add("panel", undefined, "선");
            strokePanel.alignChildren = "fill";
            addRow(strokePanel, fields[4], false);
            var positionPanel = win.add("panel", undefined, "위치");
            positionPanel.alignChildren = "fill";
            addRow(positionPanel, fields[2], true);
            addRow(positionPanel, fields[3], true);
            positionPanel.add("statictext", undefined, "양수: 오른쪽 / 위쪽");
            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 440;
            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(false, false); };
            api.updatePreview = function() { updatePreview(false, false); };
            api.clearPreview = function() { if (!committed) clearPreview(); };
            api.commit = function() {
                if (!updatePreview(false, true)) return false;
                doc.selection = null;
                previewGroup.selected = true;
                previewGroup.name = "HorizontalProjectile";
                saveSettings();
                committed = true;
                return true;
            };

            function addRow(panel, field, positionOnly) {
                var row = panel.add("group");
                row.add("statictext", undefined, field.label + (field.unit ? " (" + field.unit + "):" : ":")).preferredSize.width = 75;
                var input = row.add("edittext", undefined, String(options[field.key]));
                input.characters = 6;
                var slider = row.add("scrollbar", undefined, options[field.key], field.min, field.max);
                slider.stepdelta = field.step;
                slider.jumpdelta = field.step * 10;
                slider.preferredSize.width = 196;
                function apply(value, dragging) {
                    if (field.key === "strokeWidth") value = Math.round(value * 10) / 10;
                    value = Math.round(value * 100) / 100;
                    if (!isFinite(value) || value < field.min || value > field.max) {
                        input.text = String(options[field.key]);
                        return;
                    }
                    var previous = options[field.key];
                    options[field.key] = value;
                    slider.value = value;
                    input.text = String(value);
                    if (previous === value) {
                        if (!dragging && pending) updatePreview(false, false);
                        return;
                    }
                    if (positionOnly) {
                        try {
                            movePreview();
                            if (previewGroup) app.redraw();
                        } catch (e) {
                            clearPreview();
                            status.text = "이동하지 못했습니다: " + e;
                        }
                    } else updatePreview(dragging, false);
                }
                slider.onChanging = function() { apply(slider.value, true); };
                slider.onChange = function() { apply(slider.value, false); };
                input.onChange = function() {
                    if (!/\S/.test(input.text)) { input.text = String(options[field.key]); return; }
                    apply(Number(input.text), false);
                };
            }

            function trajectory(height, speed) {
                var time = Math.sqrt(2 * height / GRAVITY);
                var range = speed * time;
                return { time: time, range: range,
                    width: range * SCALE_MM_PER_M * MM_TO_PT,
                    height: height * SCALE_MM_PER_M * MM_TO_PT };
            }

            function updatePreview(dragging, forceVisible) {
                pending = true;
                if (dragging && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
                var motion = trajectory(options.height, options.speed);
                resultText.text = "비행시간: " + motion.time.toFixed(2) + "s    수평 도달거리: " + motion.range.toFixed(2) + "m";
                status.text = " ";
                try {
                    if (!options.preview && !forceVisible) {
                        if (previewGroup) clearPreview();
                    } else {
                        if (!previewGroup) {
                            previewGroup = doc.activeLayer.groupItems.add();
                            previewGroup.name = "HorizontalProjectile Preview";
                            previewPath = previewGroup.pathItems.add();
                            previewPath.name = "ProjectileTrajectory";
                            previewPath.setEntirePath([[originX, originY], [originX, originY - 1]]);
                            // strokeWidth만 지정하면 물려받은 브러시/가변 폭은 남을 수 있다.
                            // 기본 그래픽 스타일로 외형을 먼저 초기화한다(생성 시 한 번만).
                            doc.graphicStyles[0].applyTo(previewPath);
                            appliedX = 0;
                            appliedY = 0;
                        }
                        movePreview();
                        writeTrajectory(previewPath, originX + appliedX, originY + appliedY, motion);
                        applyUniformStroke(previewPath);
                    }
                    pending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기를 만들지 못했습니다: " + e;
                    return false;
                }
            }

            function applyUniformStroke(path) {
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = blackColor();
                path.strokeWidth = options.strokeWidth;
                path.strokeDashes = [];
                path.strokeDashOffset = 0;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                path.opacity = 100;
            }

            // 포물선 P(s) = (x + w·s, y − h·s²)는 시작·끝 접선의 교점 (x + w/2, y)를 제어점으로 둔
            // 2차 베지어와 정확히 같다. 3차로 올리면 핸들이 그 교점 쪽 2/3 지점에 오는데,
            // 시작 핸들은 (1+skew), 끝 핸들은 (1−skew)배로 늘이고 줄여 정확한 2차 꼴을 깬다.
            function trajectoryPoints(x, y, motion) {
                var w = motion.width;
                var h = motion.height;
                var start = [x, y];
                var end = [x + w, y - h];
                var control = [x + w / 2, y];
                function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
                return [
                    { anchor: start, left: start, right: lerp(start, control, 2 / 3 * (1 + HANDLE_SKEW)) },
                    { anchor: end, left: lerp(end, control, 2 / 3 * (1 - HANDLE_SKEW)), right: end }
                ];
            }

            function writeTrajectory(path, x, y, motion) {
                var points = trajectoryPoints(x, y, motion);
                // 경로와 미리보기 그룹을 재사용한다. 필요한 앵커 개수만 맞춘다.
                while (path.pathPoints.length > points.length) path.pathPoints[path.pathPoints.length - 1].remove();
                while (path.pathPoints.length < points.length) path.pathPoints.add();
                for (var i = 0; i < points.length; i++) {
                    var point = path.pathPoints[i];
                    point.pointType = PointType.CORNER;
                    point.anchor = points[i].anchor;
                    point.leftDirection = points[i].left;
                    point.rightDirection = points[i].right;
                }
            }

            function movePreview() {
                if (!previewGroup) return;
                var x = options.offsetX * MM_TO_PT;
                var y = options.offsetY * MM_TO_PT;
                if (x !== appliedX || y !== appliedY) previewGroup.translate(x - appliedX, y - appliedY);
                appliedX = x;
                appliedY = y;
            }

            function clearPreview() {
                if (previewGroup) previewGroup.remove();
                previewGroup = null;
                previewPath = null;
                pending = false;
                doc.selection = null;
                for (var i = 0; i < originalSelection.length; i++) {
                    try { originalSelection[i].selected = true; } catch (e) {}
                }
            }

            function readSettings() {
                var result = { preview: true };
                for (var i = 0; i < fields.length; i++) result[fields[i].key] = fields[i].initial;
                try {
                    var parts = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (parts[0] !== "v4" || parts.length !== 7 || !/^[01]$/.test(parts[6])) return result;
                    for (var j = 0; j < fields.length; j++) {
                        var value = Number(parts[j + 1]);
                        if (!/\S/.test(parts[j + 1]) || !isFinite(value) || value < fields[j].min || value > fields[j].max) return result;
                        if (fields[j].key === "strokeWidth" && Math.abs(value * 10 - Math.round(value * 10)) > 0.000001) return result;
                    }
                    for (var k = 0; k < fields.length; k++) result[fields[k].key] = Number(parts[k + 1]);
                    result.preview = parts[6] === "1";
                } catch (e) {}
                return result;
            }

            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY, ["v4", options.height, options.speed,
                        options.offsetX, options.offsetY, options.strokeWidth, options.preview ? 1 : 0].join("|"));
                } catch (e) {}
            }

            function blackColor() {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = 100;
                } else {
                    color = new RGBColor();
                    color.red = 0; color.green = 0; color.blue = 0;
                }
                return color;
            }
            return null;
        }
        return api;
    }

    // ==== 사인 곡선 ====
    function makeSineWaveEngine() {
        var api = {label: "사인 곡선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectSineWave/settings";
            var MM = 2.834645669;

            // 슬라이더는 요청 범위, 입력칸은 더 큰 값도 받는다.
            var AMPLITUDE_STEP = 1;
            var AMPLITUDE_SLIDER_MAX = 30;
            var AMPLITUDE_MAX = 1000;
            var WAVELENGTH_STEP = 1;
            var WAVELENGTH_SLIDER_MAX = 30;
            var WAVELENGTH_MAX = 1000;
            var SHIFT_STEP = 1;
            var SHIFT_SLIDER_MAX = 30;
            var SHIFT_MAX = 1000;
            var WIDTH_STEP = 0.1;
            var WIDTH_SLIDER_MAX = 2;
            var WIDTH_MAX = 100;

            // 위상 90도마다 고정점 → 한 파장에 4개.
            var QUARTER_TURN = Math.PI / 2;
            // ponytail: 파장이 아주 짧으면 고정점이 폭발한다. 상한만 두고 그 위는 근사도를 포기한다.
            var MAX_ANCHORS = 2000;
            // 호길이 표 크기. 축 위 위치 ↔ 매개변수 변환에 쓴다. 표본 사이는 선형 보간이라
            // 오차는 간격의 제곱에 비례한다. 조각당 256이면 고정점 위치 오차가 0.001pt 아래다.
            // 고정점이 많은 패스에서 표가 폭발하지 않도록 전체 예산으로 나눠 쓴다.
            var ARC_SAMPLE_BUDGET = 4096;
            var MIN_SEGMENT_SAMPLES = 24;
            var MAX_SEGMENT_SAMPLES = 256;

            var doc = app.activeDocument;
            var source = getSelectedPath(doc.selection);
            if (source === null) return "패스 하나만 선택해주세요. 직선도 곡선도 됩니다. 문자나 그룹은 먼저 패스로 만들어주세요.";

            var axis = buildAxis(source);
            if (axis === null || axis.length <= 0) return "길이가 0인 패스는 사용할 수 없습니다.";

            var amplitudeMm = 5;
            var wavelengthMm = 20;
            var shiftMm = 0;
            var strokeWidthPt = source.stroked ? clampValue(roundToStep(source.strokeWidth, WIDTH_STEP), 0, WIDTH_MAX) : 0.3;
            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewItem = null;
            var sourceWasHidden = source.hidden;

            applySavedSettings();

            var LABEL_WIDTH = 62;
            var INPUT_WIDTH = 54;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;
            var INFO_WIDTH = LABEL_WIDTH + INPUT_WIDTH + SLIDER_WIDTH;

            var dlg = page;

            var wavePanel = addPanel(dlg, "파형");
            var amplitudeField = addNumberField(wavePanel, "진폭", "mm", amplitudeMm, AMPLITUDE_STEP,
                0, AMPLITUDE_SLIDER_MAX, 0, AMPLITUDE_MAX);
            var wavelengthField = addNumberField(wavePanel, "파장", "mm", wavelengthMm, WAVELENGTH_STEP,
                0, WAVELENGTH_SLIDER_MAX, 0, WAVELENGTH_MAX);
            var shiftField = addNumberField(wavePanel, "축 이동", "mm", shiftMm, SHIFT_STEP,
                -SHIFT_SLIDER_MAX, SHIFT_SLIDER_MAX, -SHIFT_MAX, SHIFT_MAX);
            var infoText = wavePanel.add("statictext", undefined, "");
            infoText.preferredSize.width = INFO_WIDTH;
            var warningText = wavePanel.add("statictext", undefined, "");
            warningText.preferredSize.width = INFO_WIDTH;

            var strokePanel = addPanel(dlg, "선");
            var widthField = addNumberField(strokePanel, "두께", "pt", strokeWidthPt, WIDTH_STEP,
                0, WIDTH_SLIDER_MAX, 0, WIDTH_MAX);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, OFFSET_STEP_MM,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, OFFSET_STEP_MM,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            // 위치는 곡선을 다시 만들지 않고 미리보기만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);

            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 패스를 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };
            api.commit = function() {
                if (!readFields(true)) return false;
                clearPreview();
                readFields(false);
                source.hidden = false;
                var curve = buildSineCurve();
                moveItem(curve, offsetXmm * MM, offsetYmm * MM);
                curve.name = "Sine Wave";
                try { curve.move(source, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
                source.remove();
                saveSettings();
                doc.selection = null;
                curve.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 곡선 만들기
            // -------------------------------------------------------
            function buildSineCurve() {
                var amplitude = amplitudeMm * MM;
                var wavelength = effectiveWavelength();
                var shift = shiftMm * MM;

                // 진폭이나 파장이 0이면 흔들 것이 없다. 기준 패스를 그대로 복제한다.
                if (amplitude === 0 || wavelength <= 0) {
                    var copy = source.duplicate();
                    applyStroke(copy);
                    return copy;
                }

                var waveNumber = Math.PI * 2 / wavelength;
                var positions = quarterPositions(wavelength, shift);
                var samples = [];
                var anchors = [];
                var index;
                for (index = 0; index < positions.length; index++) {
                    var sample = sampleWave(positions[index], amplitude, waveNumber, shift);
                    samples.push(sample);
                    anchors.push([sample.x, sample.y]);
                }

                var path = source.layer.pathItems.add();
                path.setEntirePath(anchors);
                path.closed = axis.closed;
                applyStroke(path);

                var last = anchors.length - 1;
                var handles = [];
                var segmentCount = axis.closed ? anchors.length : last;
                for (index = 0; index < segmentCount; index++) {
                    var next = (index + 1) % anchors.length;
                    var from = positions[index];
                    var to = positions[next] + (next === 0 ? axis.length : 0);
                    handles.push(solveHandles(samples[index], samples[next], from, to, amplitude, waveNumber, shift));
                }

                for (index = 0; index <= last; index++) {
                    var point = path.pathPoints[index];
                    var sampleAt = samples[index];
                    var anchor = anchors[index];
                    var incoming = axis.closed ? handles[(index + segmentCount - 1) % segmentCount] : handles[index - 1];
                    var outgoing = handles[index];
                    var left = (!axis.closed && index === 0)
                        ? [anchor[0], anchor[1]]
                        : [anchor[0] - sampleAt.dirX * incoming.into, anchor[1] - sampleAt.dirY * incoming.into];
                    var right = (!axis.closed && index === last)
                        ? [anchor[0], anchor[1]]
                        : [anchor[0] + sampleAt.dirX * outgoing.outOf, anchor[1] + sampleAt.dirY * outgoing.outOf];
                    point.leftDirection = left;
                    point.rightDirection = right;
                    point.pointType = (!axis.closed && (index === 0 || index === last))
                        ? PointType.CORNER
                        : PointType.SMOOTH;
                }
                return path;
            }

            // 닫힌 패스는 파장이 둘레의 약수여야 이음매가 매끈하다. 정수 개로 반올림한다.
            function effectiveWavelength() {
                var wavelength = wavelengthMm * MM;
                if (!axis.closed || wavelength <= 0) return wavelength;
                var count = Math.round(axis.length / wavelength);
                if (count < 1) count = 1;
                var limit = Math.floor(MAX_ANCHORS / 4);
                if (count > limit) count = limit;
                return axis.length / count;
            }

            // 축 위 고정점 위치: 위상이 90도 배수가 되는 지점(극값 · x축 교차점).
            // 열린 패스는 양 끝을 더한다. 닫힌 패스는 격자만으로 한 바퀴가 채워진다.
            function quarterPositions(wavelength, shift) {
                var stride = QUARTER_TURN / (Math.PI * 2 / wavelength);
                var positions = [];
                var s;

                if (axis.closed) {
                    var base = shift - Math.floor(shift / stride) * stride;
                    for (s = base; s < axis.length - stride * 0.001 && positions.length < MAX_ANCHORS; s += stride) {
                        positions.push(s);
                    }
                    if (positions.length === 0) positions.push(0);
                    return positions;
                }

                var epsilon = stride * 0.001;
                positions.push(0);
                var index = Math.ceil((-shift) / stride);
                s = shift + stride * index;
                while (s < axis.length - epsilon && positions.length < MAX_ANCHORS - 1) {
                    if (s > epsilon) positions.push(s);
                    index++;
                    s = shift + stride * index;
                }
                positions.push(axis.length);
                return positions;
            }

            // 파형 위 한 점과 그 접선 방향. 기준 곡선이 휘면 법선도 돌아가므로(dN/ds = −κT)
            // 접선은 T(1 − κ·A·sin) + N·A·k·cos가 된다.
            function sampleWave(s, amplitude, waveNumber, shift) {
                var frame = axis.frameAt(s);
                var phase = waveNumber * (s - shift);
                var offset = amplitude * Math.sin(phase);
                var along = 1 - frame.curvature * offset;
                var across = amplitude * waveNumber * Math.cos(phase);
                var dirX = frame.tangentX * along + frame.normalX * across;
                var dirY = frame.tangentY * along + frame.normalY * across;
                var speed = Math.sqrt(dirX * dirX + dirY * dirY);
                if (speed < 0.000001) {
                    dirX = frame.tangentX;
                    dirY = frame.tangentY;
                    speed = 1;
                }
                return {
                    x: frame.x + frame.normalX * offset,
                    y: frame.y + frame.normalY * offset,
                    dirX: dirX / speed,
                    dirY: dirY / speed,
                    speed: speed
                };
            }

            // 조각의 베지어 중점 B(0.5)가 실제 파형의 중점과 같아지도록 핸들 길이를 푼다.
            //   B(0.5) = (P0+P3)/2 + (3/8)(a·d0 − b·d1)
            // 접선이 나란하면 이 식이 풀리지 않는다(변곡점·직선). 그때만 원호 근사로 넘어간다.
            function solveHandles(from, to, fromS, toS, amplitude, waveNumber, shift) {
                var span = toS - fromS;
                var middle = sampleWave(fromS + span / 2, amplitude, waveNumber, shift);
                var wantX = (middle.x - (from.x + to.x) / 2) * 8 / 3;
                var wantY = (middle.y - (from.y + to.y) / 2) * 8 / 3;
                var determinant = to.dirX * from.dirY - from.dirX * to.dirY;

                if (Math.abs(determinant) > 0.000001) {
                    var outOf = (to.dirX * wantY - to.dirY * wantX) / determinant;
                    var into = (from.dirX * wantY - from.dirY * wantX) / determinant;
                    if (isFinite(outOf) && isFinite(into) && outOf > 0 && into > 0 &&
                            outOf < span * 2 && into < span * 2) {
                        return {outOf: outOf, into: into};
                    }
                }

                var ratio = span * handleRatio(waveNumber * span);
                return {outOf: ratio * from.speed, into: ratio * to.speed};
            }

            // 90도 조각이면 0.3516, 조각이 짧아질수록 3분의 1로 수렴한다(에르미트와 같아짐).
            function handleRatio(phaseSpan) {
                if (phaseSpan < 0.000001) return 1 / 3;
                return 4 / 3 * Math.tan(phaseSpan / 4) / phaseSpan;
            }

            function applyStroke(path) {
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = strokeWidthPt;
                if (source.stroked) {
                    try { path.strokeColor = source.strokeColor; } catch (e) {}
                    try { path.strokeDashes = source.strokeDashes; } catch (e2) {}
                    try { path.strokeDashOffset = source.strokeDashOffset; } catch (e3) {}
                    try { path.strokeCap = source.strokeCap; } catch (e4) {}
                    try { path.strokeJoin = source.strokeJoin; } catch (e5) {}
                    try { path.strokeMiterLimit = source.strokeMiterLimit; } catch (e6) {}
                } else {
                    try { path.strokeColor = doc.defaultStrokeColor; } catch (e7) {}
                }
                try { path.opacity = source.opacity; } catch (e8) {}
            }

            // -------------------------------------------------------
            // 기준 축: 호길이 매개화
            // -------------------------------------------------------
            // 표본으로 길이표를 만들어 s → (조각, t)로 되돌린다. 표본 사이는 선형 보간이라
            // 위치 오차는 표본 간격의 제곱에 비례한다. 조각당 64표본이면 무시할 수준이다.
            function buildAxis(item) {
                var points = item.pathPoints;
                if (!points || points.length < 2) return null;

                var segments = [];
                var index;
                for (index = 0; index < points.length - 1; index++) {
                    segments.push(makeSegment(points[index], points[index + 1]));
                }
                if (item.closed) segments.push(makeSegment(points[points.length - 1], points[0]));

                var perSegment = clampValue(Math.ceil(ARC_SAMPLE_BUDGET / segments.length),
                    MIN_SEGMENT_SAMPLES, MAX_SEGMENT_SAMPLES);
                var samples = [];
                var total = 0;
                var maxCurvature = 0;
                for (index = 0; index < segments.length; index++) {
                    var previous = segmentPoint(segments[index], 0);
                    samples.push({segment: index, t: 0, s: total});
                    for (var step = 1; step <= perSegment; step++) {
                        var t = step / perSegment;
                        var current = segmentPoint(segments[index], t);
                        total += Math.sqrt(Math.pow(current[0] - previous[0], 2) + Math.pow(current[1] - previous[1], 2));
                        samples.push({segment: index, t: t, s: total});
                        previous = current;
                        var frame = segmentFrame(segments[index], t);
                        if (Math.abs(frame.curvature) > maxCurvature) maxCurvature = Math.abs(frame.curvature);
                    }
                }

                return {
                    length: total,
                    closed: item.closed,
                    maxCurvature: maxCurvature,
                    frameAt: function(s) {
                        var position = s;
                        if (this.closed) {
                            position = position - Math.floor(position / total) * total;
                        } else {
                            position = clampValue(position, 0, total);
                        }
                        var low = 0;
                        var high = samples.length - 1;
                        while (high - low > 1) {
                            var middle = Math.floor((low + high) / 2);
                            if (samples[middle].s <= position) low = middle;
                            else high = middle;
                        }
                        var target = samples[low];
                        var next = samples[high];
                        if (target.segment === next.segment && next.s > target.s) {
                            var ratio = (position - target.s) / (next.s - target.s);
                            return segmentFrame(segments[target.segment], target.t + (next.t - target.t) * ratio);
                        }
                        return segmentFrame(segments[next.segment], next.t);
                    }
                };
            }

            function makeSegment(fromPoint, toPoint) {
                return [
                    [fromPoint.anchor[0], fromPoint.anchor[1]],
                    [fromPoint.rightDirection[0], fromPoint.rightDirection[1]],
                    [toPoint.leftDirection[0], toPoint.leftDirection[1]],
                    [toPoint.anchor[0], toPoint.anchor[1]]
                ];
            }

            function segmentPoint(segment, t) {
                var u = 1 - t;
                return [
                    u * u * u * segment[0][0] + 3 * u * u * t * segment[1][0] +
                        3 * u * t * t * segment[2][0] + t * t * t * segment[3][0],
                    u * u * u * segment[0][1] + 3 * u * u * t * segment[1][1] +
                        3 * u * t * t * segment[2][1] + t * t * t * segment[3][1]
                ];
            }

            // 접선 · 법선 · 부호 있는 곡률. 법선은 접선을 반시계로 90도 돌린 방향이고
            // κ는 dT/ds = κN이 되도록 잡는다.
            function segmentFrame(segment, t) {
                var point = segmentPoint(segment, t);
                var first = segmentDerivative(segment, t);
                var speed = Math.sqrt(first[0] * first[0] + first[1] * first[1]);

                // 핸들이 고정점에 붙은 직선 조각은 양 끝에서 미분이 0이 된다. 그때는 이웃 점으로 방향을 잡는다.
                if (speed < 0.000001) {
                    var nudge = t < 0.5 ? 0.001 : -0.001;
                    var neighbour = segmentPoint(segment, t + nudge);
                    first = [(neighbour[0] - point[0]) / nudge, (neighbour[1] - point[1]) / nudge];
                    speed = Math.sqrt(first[0] * first[0] + first[1] * first[1]);
                    if (speed < 0.000001) speed = 1;
                }

                var second = segmentSecondDerivative(segment, t);
                var curvature = (first[0] * second[1] - first[1] * second[0]) / Math.pow(speed, 3);
                if (!isFinite(curvature)) curvature = 0;
                var tangentX = first[0] / speed;
                var tangentY = first[1] / speed;
                return {
                    x: point[0],
                    y: point[1],
                    tangentX: tangentX,
                    tangentY: tangentY,
                    normalX: -tangentY,
                    normalY: tangentX,
                    curvature: curvature
                };
            }

            function segmentDerivative(segment, t) {
                var u = 1 - t;
                return [
                    3 * u * u * (segment[1][0] - segment[0][0]) + 6 * u * t * (segment[2][0] - segment[1][0]) +
                        3 * t * t * (segment[3][0] - segment[2][0]),
                    3 * u * u * (segment[1][1] - segment[0][1]) + 6 * u * t * (segment[2][1] - segment[1][1]) +
                        3 * t * t * (segment[3][1] - segment[2][1])
                ];
            }

            function segmentSecondDerivative(segment, t) {
                var u = 1 - t;
                return [
                    6 * u * (segment[2][0] - 2 * segment[1][0] + segment[0][0]) +
                        6 * t * (segment[3][0] - 2 * segment[2][0] + segment[1][0]),
                    6 * u * (segment[2][1] - 2 * segment[1][1] + segment[0][1]) +
                        6 * t * (segment[3][1] - 2 * segment[2][1] + segment[1][1])
                ];
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (!readFields(false)) {
                    app.redraw();
                    return;
                }
                updateInfoText();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                previewItem = buildSineCurve();
                moveItem(previewItem, offsetXmm * MM, offsetYmm * MM);
                previewItem.name = "Sine Wave Preview";
                try { previewItem.move(source, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
                app.redraw();
            }

            function clearPreview() {
                if (previewItem === null) return;
                try { previewItem.remove(); } catch (e) {}
                previewItem = null;
            }

            function updateInfoText() {
                var lengthMm = axis.length / MM;
                var wavelength = effectiveWavelength();
                if (wavelength <= 0 || amplitudeMm === 0) {
                    infoText.text = "축 길이 " + formatValue(lengthMm) + "mm · 파동 없음";
                } else {
                    var waves = axis.length / wavelength;
                    infoText.text = "축 길이 " + formatValue(lengthMm) + "mm · 파동 " + formatValue(waves) + "개" +
                        (axis.closed ? " · 실제 파장 " + formatValue(wavelength / MM) + "mm (닫힌 패스라 정수 개로 맞춤)" : "");
                }

                // 진폭이 곡률반지름보다 크면 안쪽에서 파형이 자기를 뚫고 지나간다.
                var amplitude = amplitudeMm * MM;
                if (axis.maxCurvature > 0 && amplitude >= 1 / axis.maxCurvature) {
                    warningText.text = "진폭이 축의 곡률반지름(" +
                        formatValue(1 / axis.maxCurvature / MM) + "mm)보다 큽니다. 안쪽이 겹칩니다.";
                } else {
                    warningText.text = "";
                }
            }

            // -------------------------------------------------------
            // 입력
            // -------------------------------------------------------
            function readFields(showAlert) {
                var amplitude = parseNumber(amplitudeField.input.text);
                if (amplitude === null || amplitude < 0 || amplitude > AMPLITUDE_MAX) {
                    if (showAlert) alert("진폭은 0부터 " + AMPLITUDE_MAX + "mm 사이로 입력해주세요.");
                    return false;
                }
                var wavelength = parseNumber(wavelengthField.input.text);
                if (wavelength === null || wavelength < 0 || wavelength > WAVELENGTH_MAX) {
                    if (showAlert) alert("파장은 0부터 " + WAVELENGTH_MAX + "mm 사이로 입력해주세요.");
                    return false;
                }
                var shift = parseNumber(shiftField.input.text);
                if (shift === null || shift < -SHIFT_MAX || shift > SHIFT_MAX) {
                    if (showAlert) alert("축 이동은 -" + SHIFT_MAX + "부터 " + SHIFT_MAX + "mm 사이로 입력해주세요.");
                    return false;
                }
                var width = parseNumber(widthField.input.text);
                if (width === null || width < 0 || width > WIDTH_MAX) {
                    if (showAlert) alert("선 두께는 0부터 " + WIDTH_MAX + "pt 사이로 입력해주세요.");
                    return false;
                }
                amplitudeMm = amplitude;
                wavelengthMm = wavelength;
                shiftMm = shift;
                strokeWidthPt = width;
                return true;
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY,
                        ["v2", amplitudeMm, wavelengthMm, shiftMm, strokeWidthPt,
                            offsetXmm, offsetYmm].join("|"));
                } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var parts = String(raw).split("|");
                if ((parts[0] !== "v1" && parts[0] !== "v2") || parts.length < 5) return;
                var amplitude = parseNumber(parts[1]);
                var wavelength = parseNumber(parts[2]);
                var shift = parseNumber(parts[3]);
                var width = parseNumber(parts[4]);
                if (amplitude === null || amplitude < 0 || amplitude > AMPLITUDE_MAX) return;
                if (wavelength === null || wavelength < 0 || wavelength > WAVELENGTH_MAX) return;
                if (shift === null || shift < -SHIFT_MAX || shift > SHIFT_MAX) return;
                if (width === null || width < 0 || width > WIDTH_MAX) return;
                amplitudeMm = amplitude;
                wavelengthMm = wavelength;
                shiftMm = shift;
                strokeWidthPt = width;
                if (parts[0] === "v2" && parts.length >= 7) {
                    var offX = parseNumber(parts[5]);
                    var offY = parseNumber(parts[6]);
                    if (offX !== null && Math.abs(offX) <= POSITION_LIMIT_MM) offsetXmm = offX;
                    if (offY !== null && Math.abs(offY) <= POSITION_LIMIT_MM) offsetYmm = offY;
                }
            }

            // -------------------------------------------------------
            // 선택
            // -------------------------------------------------------
            function getSelectedPath(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem") return null;
                if (item.guides || item.clipping) return null;
                if (!item.pathPoints || item.pathPoints.length < 2) return null;
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
            // 슬라이더는 요청 범위(sliderMin~sliderMax)까지만, 입력칸은 hardMin~hardMax까지 받는다.
            function addNumberField(parent, labelText, unit, value, step, sliderMin, sliderMax, hardMin, hardMax) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.spacing = 6;
                var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.preferredSize.width = INPUT_WIDTH;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, clampValue(value, sliderMin, sliderMax), sliderMin, sliderMax);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;

                var field = {
                    row: row, input: input, slider: slider, step: step,
                    sliderMinimum: sliderMin, sliderMaximum: sliderMax,
                    minimum: hardMin, maximum: hardMax, syncing: false
                };

                slider.onChanging = function() {
                    if (field.syncing) return;
                    var stepped = roundToStep(slider.value, field.step);
                    input.text = formatValue(clampValue(stepped, field.sliderMinimum, field.sliderMaximum));
                    commitField(field);
                };
                input.onChanging = function() { commitField(field); };
                input.onChange = function() {
                    var parsed = parseNumber(input.text);
                    if (parsed === null) parsed = field.minimum;
                    parsed = clampValue(parsed, field.minimum, field.maximum);
                    input.text = formatValue(parsed);
                    syncSlider(field, parsed);
                    commitField(field);
                };
                return field;
            }

            // 위치 필드는 곡선을 다시 만들지 않고 미리보기만 옮기도록 갈아끼운다
            function commitField(field) {
                if (field.onCommit) field.onCommit();
                else updatePreview();
            }

            function bindOffsetField(field, isX) {
                field.onCommit = function() {
                    var value = parseNumber(field.input.text);
                    if (value === null) return;
                    value = clampValue(value, field.minimum, field.maximum);
                    var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    if (delta === 0 || previewItem === null) return;
                    moveItem(previewItem, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                };
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            // 슬라이더 범위를 넘는 값은 입력칸에만 남기고 슬라이더는 끝에 붙여 둔다.
            function syncSlider(field, value) {
                field.syncing = true;
                field.slider.value = clampValue(value, field.sliderMinimum, field.sliderMaximum);
                field.syncing = false;
            }

            function clampValue(value, minimum, maximum) {
                if (value < minimum) return minimum;
                if (value > maximum) return maximum;
                return value;
            }

            function roundToStep(value, step) {
                return Math.round(value / step) * step;
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
            return null;
        }
        return api;
    }

    // ==== 코일 스프링 ====
    function makeCoilSpringEngine() {
        var api = {label: "코일 스프링", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var doc = app.activeDocument;
            var source = getSelectedCircle(doc.selection);
            if (source === null) return "원 패스 하나만 선택해주세요.";

            var bounds = source.geometricBounds;
            var sourceWidth = bounds[2] - bounds[0];
            var sourceHeight = bounds[1] - bounds[3];
            if (sourceWidth <= 0 ||
                    Math.abs(sourceWidth - sourceHeight) > Math.max(0.1, sourceWidth * 0.01) ||
                    !hasCircularPathPoints(source)) return "가로와 세로 크기가 같은 원을 선택해주세요.";

            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var MM_TO_PT = 2.83464567;
            var SIZE_STEP_MM = 0.05;
            var LINE_WIDTH_PT = 0.3;
            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var MIN_TURNS = 5;
            var MAX_TURNS = 30;
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

            var dlg = page;

            var sizePanel = dlg.add("panel", undefined, "크기");
            sizePanel.orientation = "column";
            sizePanel.alignChildren = "fill";

            var widthRow = sizePanel.add("group");
            widthRow.alignChildren = ["left", "center"];
            widthRow.add("statictext", undefined, "좌우 폭 (mm):").preferredSize.width = 90;
            var widthInput = widthRow.add("edittext", undefined, formatNumber(coilWidthMm, 2));
            widthInput.characters = 6;
            var widthSlider = addSliderWithSteps(widthRow, coilWidthMm, SIZE_STEP_MM, maxCoilWidthMm, SIZE_STEP_MM);

            var heightRow = sizePanel.add("group");
            heightRow.alignChildren = ["left", "center"];
            heightRow.add("statictext", undefined, "위아래 높이 (mm):").preferredSize.width = 90;
            var heightInput = heightRow.add("edittext", undefined, formatNumber(coilHeightMm, 2));
            heightInput.characters = 6;
            var heightSlider = addSliderWithSteps(heightRow, coilHeightMm, SIZE_STEP_MM, maxCoilHeightMm, SIZE_STEP_MM);

            var turnsPanel = dlg.add("panel", undefined, "코일");
            turnsPanel.orientation = "column";
            turnsPanel.alignChildren = "fill";
            var turnsRow = turnsPanel.add("group");
            turnsRow.alignChildren = ["left", "center"];
            var turnsLabel = turnsRow.add("statictext", undefined, "감는 횟수 (회):");
            turnsLabel.preferredSize.width = 90;
            turnsLabel.helpTip = "5 ~ 30";
            var turnsInput = turnsRow.add("edittext", undefined, String(turnCount));
            turnsInput.characters = 6;
            var turnsSlider = addSliderWithSteps(turnsRow, turnCount, MIN_TURNS, MAX_TURNS, 1);

            var positionPanel = dlg.add("panel", undefined, "위치");
            positionPanel.orientation = "column";
            positionPanel.alignChildren = "left";
            var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmm);
            var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmm);
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetControls(offsetXControls, true);
            bindOffsetControls(offsetYControls, false);



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


            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 원을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };
            api.commit = function() {
                var validWidth = parseNumber(widthInput.text);
                var validHeight = parseNumber(heightInput.text);
                var validTurns = parseNumber(turnsInput.text);
                if (validWidth === null || validWidth < SIZE_STEP_MM || validWidth > maxCoilWidthMm) {
                    alert("좌우 폭은 " + formatNumber(SIZE_STEP_MM, 2) + "mm부터 " +
                        formatNumber(maxCoilWidthMm, 2) + "mm 사이로 입력해주세요.");
                    return false;
                }
                if (validHeight === null || validHeight < SIZE_STEP_MM || validHeight > maxCoilHeightMm) {
                    alert("위아래 높이는 " + formatNumber(SIZE_STEP_MM, 2) + "mm부터 " +
                        formatNumber(maxCoilHeightMm, 2) + "mm 사이로 입력해주세요.");
                    return false;
                }
                if (validTurns === null || validTurns < MIN_TURNS || validTurns > MAX_TURNS) {
                    alert("코일 감는 횟수는 5부터 30 사이의 정수로 입력해주세요.");
                    return false;
                }
                coilWidthMm = roundTo(validWidth, SIZE_STEP_MM);
                coilHeightMm = roundTo(validHeight, SIZE_STEP_MM);
                turnCount = Math.round(validTurns);
                saveSettings();
                clearPreview();
                source.hidden = false;
                var finalGroup = createCoilSpring();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "Coil Spring";
                try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
                source.remove();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

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
                var input = row.add("edittext", undefined, formatNumber(value, 1));
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
            return null;
        }
        return api;
    }
})();
