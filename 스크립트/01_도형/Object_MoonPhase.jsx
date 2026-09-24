// Object_MoonPhase.jsx
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

// 달의 위상·일식·월식: 화면 가운데에 그린다.
//   - 위상: 지구를 가운데 두고 공전 궤도(파선) 위에 달을 8개(또는 4개) 놓는다. 햇빛 쪽 반은 밝고 반대쪽 반은 어둡다.
//     달은 태양 쪽(0°)에서 시작해 시계 반대 방향으로 돈다. 궤도 바깥에 지구(북반구)에서 본 모양을 그리고,
//     이름(삭·초승달·상현달·망·하현달·그믐달)이나 기호를 붙인다. 햇빛은 태양 쪽에서 오는 평행 화살표.
//   - 일식: 태양–달–지구, 월식: 태양–지구–달을 일직선에 놓고 본그림자(진하게)·반그림자(연하게)를 그린다.
//     반그림자는 태양 반대쪽 가장자리에서 가려 주는 천체의 가장자리를 지나는 선, 본그림자는 같은 쪽 가장자리를 지나는 선
//     (월식). 두 경계를 태양 가장자리에서 오는 광선(선)으로도 그린다. 일식의 본그림자는 실제로는 지구에 겨우 닿으므로 그림에서는 꼭짓점을 지구 표면 조금 안쪽에 둔다.
// 크기는 실제 비율이 아닌 교과서식 모식도다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectMoonPhase/settings";
    var MM = 2.834645669;
    var KAPPA = 0.5522847498;
    var LINE_WIDTH_PT = 0.3;
    var ORBIT_DASH = [2, 1.5];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    var MODES = ["위상", "일식", "월식"];
    var LABEL_STYLES = ["없음", "기호", "이름"];
    var PHASE_NAMES = {0: "삭", 45: "초승달", 90: "상현달", 180: "망", 270: "하현달", 315: "그믐달"};
    var LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var ORBIT_RANGE = [10, 100];
    var BODY_RANGE = [2, 40];
    var WIDTH_RANGE = [40, 300];
    var K_RANGE = [0, 100];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var mode = 0;
    var positions = 8;
    var orbitMm = 28;
    var moonMm = 6;
    var earthMm = 12;
    var sunOnRight = true;
    var showApparent = true;
    var labelStyle = 2;
    var widthMm = 120;
    var darkK = 70;
    var umbraK = 60;
    var penumbraK = 20;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "달의 위상 · 일식 · 월식");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var modeRow = dlg.add("group");
    modeRow.add("statictext", undefined, "그림:").preferredSize.width = LABEL_WIDTH;
    var modeRadios = [];
    for (var m = 0; m < MODES.length; m++) modeRadios.push(modeRow.add("radiobutton", undefined, MODES[m]));

    var phasePanel = addPanel(dlg, "위상");
    var countRow = phasePanel.add("group");
    countRow.add("statictext", undefined, "달 위치:").preferredSize.width = LABEL_WIDTH;
    var count8 = countRow.add("radiobutton", undefined, "8곳");
    var count4 = countRow.add("radiobutton", undefined, "4곳");
    var sunRow = phasePanel.add("group");
    sunRow.add("statictext", undefined, "태양 쪽:").preferredSize.width = LABEL_WIDTH;
    var sunRight = sunRow.add("radiobutton", undefined, "오른쪽");
    var sunLeft = sunRow.add("radiobutton", undefined, "왼쪽");
    var orbitRow = addValueRow(phasePanel, "궤도 반지름", "mm", orbitMm, ORBIT_RANGE[0], ORBIT_RANGE[1], 0.5, 1);
    var moonRow = addValueRow(phasePanel, "달 지름", "mm", moonMm, BODY_RANGE[0], BODY_RANGE[1], 0.5, 1);
    var earthRow = addValueRow(phasePanel, "지구 지름", "mm", earthMm, BODY_RANGE[0], BODY_RANGE[1], 0.5, 1);
    var apparentCheck = phasePanel.add("checkbox", undefined, "지구에서 본 모양 (궤도 바깥)");
    var labelRow = phasePanel.add("group");
    labelRow.add("statictext", undefined, "표시:").preferredSize.width = LABEL_WIDTH;
    var labelRadios = [];
    for (var l = 0; l < LABEL_STYLES.length; l++) labelRadios.push(labelRow.add("radiobutton", undefined, LABEL_STYLES[l]));

    var eclipsePanel = addPanel(dlg, "일식 · 월식");
    var widthRow = addValueRow(eclipsePanel, "너비", "mm", widthMm, WIDTH_RANGE[0], WIDTH_RANGE[1], 1, 0);
    var umbraRow = addValueRow(eclipsePanel, "본그림자 색", "K", umbraK, K_RANGE[0], K_RANGE[1], 10, 0);
    var penumbraRow = addValueRow(eclipsePanel, "반그림자 색", "K", penumbraK, K_RANGE[0], K_RANGE[1], 10, 0);

    var commonPanel = addPanel(dlg, "공통");
    var darkRow = addValueRow(commonPanel, "어두운 면 색", "K", darkK, K_RANGE[0], K_RANGE[1], 10, 0);
    var fontRow = addValueRow(commonPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    modeRadios[mode].value = true;
    count8.value = positions === 8;
    count4.value = positions === 4;
    sunRight.value = sunOnRight;
    sunLeft.value = !sunOnRight;
    apparentCheck.value = showApparent;
    labelRadios[labelStyle].value = true;
    syncEnabled();

    for (var mr = 0; mr < modeRadios.length; mr++) {
        modeRadios[mr].onClick = (function(index) {
            return function() { mode = index; syncEnabled(); updatePreview(); };
        })(mr);
    }
    for (var lr = 0; lr < labelRadios.length; lr++) {
        labelRadios[lr].onClick = (function(index) {
            return function() { labelStyle = index; updatePreview(); };
        })(lr);
    }
    count8.onClick = function() { positions = 8; updatePreview(); };
    count4.onClick = function() { positions = 4; updatePreview(); };
    sunRight.onClick = function() { sunOnRight = true; updatePreview(); };
    sunLeft.onClick = function() { sunOnRight = false; updatePreview(); };
    apparentCheck.onClick = function() { showApparent = apparentCheck.value; updatePreview(); };
    bindValueRow(orbitRow, function() { return orbitMm; }, function(v) { orbitMm = v; });
    bindValueRow(moonRow, function() { return moonMm; }, function(v) { moonMm = v; });
    bindValueRow(earthRow, function() { return earthMm; }, function(v) { earthMm = v; });
    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(umbraRow, function() { return umbraK; }, function(v) { umbraK = v; });
    bindValueRow(penumbraRow, function() { return penumbraK; }, function(v) { penumbraK = v; });
    bindValueRow(darkRow, function() { return darkK; }, function(v) { darkK = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var confirmed = dlg.show() === 1;
    if (!confirmed) clearPreview();
    if (confirmed && previewGroup !== null) {
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    function syncEnabled() {
        phasePanel.enabled = mode === 0;
        eclipsePanel.enabled = mode !== 0;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        previewGroup = layer.groupItems.add();
        if (mode === 0) {
            previewGroup.name = "Moon Phases";
            buildPhases(viewCenter[0], viewCenter[1]);
        } else {
            previewGroup.name = mode === 1 ? "Solar Eclipse" : "Lunar Eclipse";
            buildEclipse(viewCenter[0], viewCenter[1]);
        }
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    function buildPhases(cx, cy) {
        var orbit = orbitMm * MM;
        var moonR = moonMm * MM / 2;
        var earthR = earthMm * MM / 2;
        var sunAngle = sunOnRight ? 0 : Math.PI;
        var black = makeGray(100);

        var orbitPath = previewGroup.pathItems.ellipse(cy + orbit, cx - orbit, 2 * orbit, 2 * orbit);
        orbitPath.filled = false;
        orbitPath.stroked = true;
        orbitPath.strokeColor = black;
        orbitPath.strokeWidth = LINE_WIDTH_PT;
        orbitPath.strokeDashes = ORBIT_DASH;
        orbitPath.name = "궤도";

        drawBody(cx, cy, earthR, sunAngle, "지구");
        var apparentR = moonR;
        var apparentDistance = orbit + moonR + Math.max(moonR * 1.6, 3 * MM);
        var labelDistance = apparentDistance + (showApparent ? apparentR : 0) + fontPt * 0.9;
        var step = 360 / positions;
        for (var i = 0; i < positions; i++) {
            var phase = i * step;                           // 0 = 태양 쪽(삭)
            var angle = sunAngle + phase * Math.PI / 180;   // 시계 반대 방향
            var dx = Math.cos(angle);
            var dy = Math.sin(angle);
            drawBody(cx + dx * orbit, cy + dy * orbit, moonR, sunAngle, "달");
            if (showApparent) drawApparent(cx + dx * apparentDistance, cy + dy * apparentDistance, apparentR, phase);
            var text = labelStyle === 1 ? LETTERS[i] : (labelStyle === 2 ? (PHASE_NAMES[phase] || "") : "");
            if (text !== "") addText(text, cx + dx * labelDistance, cy + dy * labelDistance);
        }
        drawSunlight(cx, cy, labelDistance + fontPt * 2, sunOnRight ? 1 : -1, orbit);
    }

    // 천체 하나: 흰 원 + 태양 반대쪽 반원(어두운 면)
    function drawBody(x, y, r, sunAngle, name) {
        var group = previewGroup.groupItems.add();
        group.name = name;
        var disk = group.pathItems.ellipse(y + r, x - r, 2 * r, 2 * r);
        styleFill(disk, 0, true);
        var dark = drawBezier(group, halfDisk(x, y, r, sunAngle + Math.PI), true);
        styleFill(dark, darkK, true);
    }

    // 지구에서 본 모양: 어두운 원 위에 밝은 부분
    function drawApparent(x, y, r, phase) {
        var group = previewGroup.groupItems.add();
        group.name = "보이는 모양 " + phase + "°";
        var disk = group.pathItems.ellipse(y + r, x - r, 2 * r, 2 * r);
        styleFill(disk, darkK, true);
        var lit = litShape(x, y, r, phase);
        if (lit !== null) {
            var litPath = drawBezier(group, lit, true);
            styleFill(litPath, 0, false);
            // 윤곽선은 원 하나로: 밝은 면 뒤에 원을 한 번 더 겹쳐 선을 살린다
            var outline = group.pathItems.ellipse(y + r, x - r, 2 * r, 2 * r);
            outline.filled = false;
            outline.stroked = true;
            outline.strokeColor = makeGray(100);
            outline.strokeWidth = LINE_WIDTH_PT;
        }
    }

    // 태양 쪽 바깥에서 지구 쪽으로 오는 평행 화살표 5개와 '햇빛'
    function drawSunlight(cx, cy, distance, side, spread) {
        var group = previewGroup.groupItems.add();
        group.name = "햇빛";
        var length = 10 * MM;
        var paths = [];
        for (var i = 0; i < 5; i++) {
            var y = cy + spread * (i - 2) / 2;
            var x0 = cx + side * (distance + length);
            var x1 = cx + side * distance;
            var line = group.pathItems.add();
            line.setEntirePath([[x0, y], [x1, y]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = makeGray(100);
            line.strokeWidth = LINE_WIDTH_PT;
            paths.push(line);
        }
        var label = addText("햇빛", cx + side * (distance + length / 2), cy + spread + fontPt);
        label.move(group, ElementPlacement.PLACEATEND);
        applyArrowheads(paths, LINE_WIDTH_PT, 100);
    }

    function buildEclipse(cx, cy) {
        var width = widthMm * MM;
        var g = eclipseGeometry(width, mode === 1);
        var left = cx - width / 2;
        var shadows = previewGroup.groupItems.add();
        shadows.name = "그림자";
        var pen = drawPolygon(shadows, offsetPoints(g.penumbra, left, cy));
        pen.name = "반그림자";
        styleFill(pen, penumbraK, false);
        var umb = drawPolygon(shadows, offsetPoints(g.umbra, left, cy));
        umb.name = "본그림자";
        styleFill(umb, umbraK, false);

        // 광선: 태양 가장자리에서 그림자 경계를 따라 가는 선
        var rays = previewGroup.groupItems.add();
        rays.name = "광선";
        for (var i = 0; i < g.rays.length; i++) {
            var ray = rays.pathItems.add();
            ray.setEntirePath(offsetPoints(g.rays[i], left, cy));
            ray.filled = false;
            ray.stroked = true;
            ray.strokeColor = makeGray(100);
            ray.strokeWidth = LINE_WIDTH_PT;
        }

        var sun = previewGroup.pathItems.ellipse(cy + g.sun.r, left + g.sun.x - g.sun.r, 2 * g.sun.r, 2 * g.sun.r);
        sun.name = "태양";
        styleFill(sun, 0, true);
        drawBody(left + g.moon.x, cy, g.moon.r, Math.PI, "달");
        drawBody(left + g.earth.x, cy, g.earth.r, Math.PI, "지구");
        var below = Math.max(g.earth.r, g.moon.r) + fontPt * 1.2;
        addText("태양", left + g.sun.x, cy - g.sun.r - fontPt * 1.2);
        addText("달", left + g.moon.x, cy - below);
        addText("지구", left + g.earth.x, cy - below);
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

    // -------------------------------------------------------
    // 기하 (순수 계산)
    // -------------------------------------------------------
    // 중심 (x, y), 반지름 r인 반원: 방향 angle 쪽 절반 (지름 양 끝 → 그 방향 → 반대 끝)
    function halfDisk(x, y, r, angle) {
        var ux = Math.cos(angle);
        var uy = Math.sin(angle);
        var px = -uy;      // 지름 방향
        var py = ux;
        var k = KAPPA * r;
        var a = [x + px * r, y + py * r];
        var mid = [x + ux * r, y + uy * r];
        var b = [x - px * r, y - py * r];
        return [
            {anchor: a, left: a, right: [a[0] + ux * k, a[1] + uy * k]},
            {anchor: mid, left: [mid[0] + px * k, mid[1] + py * k], right: [mid[0] - px * k, mid[1] - py * k]},
            {anchor: b, left: [b[0] + ux * k, b[1] + uy * k], right: b}
        ];
    }

    // 지구(북반구)에서 본 달의 밝은 부분. phase: 0 삭 → 90 상현 → 180 망 → 270 하현 (도).
    // 차는 달(0~180)은 오른쪽, 기우는 달은 왼쪽이 밝다. 명암 경계는 가로 반지름 |cos phase|·r인 반타원:
    // 초승·그믐(cos > 0)은 밝은 쪽으로, 볼록한 달(cos < 0)은 어두운 쪽으로 부푼다. 삭이면 null
    function litShape(x, y, r, phase) {
        var theta = ((phase % 360) + 360) % 360;
        var c = Math.cos(theta * Math.PI / 180);
        if (c > 0.999) return null;
        var side = theta <= 180 ? 1 : -1;          // 밝은 쪽 (1 오른쪽)
        var k = KAPPA * r;
        var top = [x, y + r];
        var bottom = [x, y - r];
        var rim = [x + side * r, y];
        var term = [x + side * c * r, y];
        var kt = KAPPA * c * r * side;
        if (c < -0.999) {
            // 망: 원 전체
            return [
                {anchor: top, left: [x - k, y + r], right: [x + k, y + r]},
                {anchor: [x + r, y], left: [x + r, y + k], right: [x + r, y - k]},
                {anchor: bottom, left: [x + k, y - r], right: [x - k, y - r]},
                {anchor: [x - r, y], left: [x - r, y - k], right: [x - r, y + k]}
            ];
        }
        return [
            {anchor: top, left: [x + kt, y + r], right: [x + side * k, y + r]},
            {anchor: rim, left: [x + side * r, y + k], right: [x + side * r, y - k]},
            {anchor: bottom, left: [x + side * k, y - r], right: [x + kt, y - r]},
            {anchor: term, left: [term[0], y - k], right: [term[0], y + k]}
        ];
    }

    // 일식·월식 배치 (왼쪽 끝 x = 0, 가운데 y = 0 기준, 너비 width). 태양은 왼쪽 끝에 반쯤 걸친 큰 원.
    // 반그림자: 태양 아래(위) 가장자리에서 가리는 천체 위(아래) 가장자리를 지나는 선 사이, 오른쪽 끝까지.
    // 본그림자: 가리는 천체 위·아래 가장자리에서 꼭짓점까지 (월식은 태양·지구 바깥 접선의 교점,
    // 일식은 지구 표면을 조금 파고드는 점)
    function eclipseGeometry(width, solar) {
        var sun = {x: 0, r: width * 0.16};
        var near = {x: width * 0.55, r: solar ? width * 0.025 : width * 0.075};
        var far = {x: width * 0.85, r: solar ? width * 0.075 : width * 0.025};
        var blocker = near;
        var end = width;
        function edgeLine(fromY, throughY, x) {
            return fromY + (throughY - fromY) * x / blocker.x;
        }
        var penumbra = [[blocker.x, blocker.r], [end, edgeLine(-sun.r, blocker.r, end)],
            [end, edgeLine(sun.r, -blocker.r, end)], [blocker.x, -blocker.r]];
        var apexX;
        if (solar) {
            apexX = far.x - far.r * 0.7;
        } else {
            apexX = sun.r > blocker.r ? blocker.x + blocker.x * blocker.r / (sun.r - blocker.r) : end;
            apexX = Math.min(apexX, end);
        }
        var umbra = [[blocker.x, blocker.r], [apexX, 0], [blocker.x, -blocker.r]];
        // 광선 네 개: 태양 가장자리 → 가리는 천체 가장자리 → 반그림자 끝 / 본그림자 꼭짓점
        var rays = [
            [[0, -sun.r], penumbra[0], penumbra[1]],
            [[0, sun.r], penumbra[3], penumbra[2]],
            [[0, sun.r], umbra[0], umbra[1]],
            [[0, -sun.r], umbra[2], umbra[1]]
        ];
        return {sun: sun, moon: solar ? near : far, earth: solar ? far : near, penumbra: penumbra, umbra: umbra, rays: rays};
    }

    function offsetPoints(points, dx, dy) {
        var out = [];
        for (var i = 0; i < points.length; i++) out.push([points[i][0] + dx, points[i][1] + dy]);
        return out;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawBezier(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = PointType.CORNER;
        }
        path.closed = closed;
        return path;
    }

    function drawPolygon(container, points) {
        var path = container.pathItems.add();
        path.setEntirePath(points);
        path.closed = true;
        return path;
    }

    function styleFill(path, k, stroked) {
        path.filled = true;
        path.fillColor = makeGray(k);
        path.stroked = stroked;
        if (stroked) {
            path.strokeColor = makeGray(100);
            path.strokeWidth = LINE_WIDTH_PT;
        }
    }

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
        return frame;
    }

    // 화살촉은 DOM에 없는 속성이라 임시 액션으로 끝 화살촉만 넣는다
    function applyArrowheads(paths, weight, scale) {
        if (paths.length === 0) return;
        var actionSetName = "Codex_MoonPhase";
        var actionName = "MoonPhaseArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_MoonPhaseArrowheads.aia");
        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) paths[i].selected = true;
            writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살촉 이름은 UI 언어에 따라 다르다. 실패해도 선은 그대로 남는다
        }
        try { app.unloadAction(actionSetName, ""); } catch (e2) {}
        try { actionFile.remove(); } catch (e3) {}
        doc.selection = null;
    }

    // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
    function toActionHex(text) {
        var bytes = [];
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }
        var hex = "";
        for (var j = 0; j < bytes.length; j++) {
            var part = bytes[j].toString(16).toUpperCase();
            if (part.length < 2) part = "0" + part;
            hex += part;
        }
        return {hex: hex, length: bytes.length};
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var arrow = toActionHex(ARROW_NAME);
        var lines = [
            "/version 3",
            "/name [ " + setName.length, "    " + setName.hex, "]",
            "/isOpen 1",
            "/actionCount 1",
            "/action-1 {",
            "    /name [ " + name.length, "        " + name.hex, "    ]",
            "    /keyIndex 0",
            "    /colorIndex 0",
            "    /isOpen 1",
            "    /eventCount 1",
            "    /event-1 {",
            "        /useRulersIn1stQuadrant 0",
            "        /internalName (ai_plugin_setStroke)",
            "        /localizedName [ 10", "            536574205374726F6B65", "        ]",
            "        /isOpen 1",
            "        /isOn 1",
            "        /hasDialog 0",
            "        /parameterCount 4",
            // 선 두께 (pt)
            "        /parameter-1 {",
            "            /key 2003072104",
            "            /showInPalette -1",
            "            /type (unit real)",
            "            /value " + weight,
            "            /unit 592476268",
            "        }",
            // 끝 화살촉
            "        /parameter-2 {",
            "            /key 1634231346",
            "            /showInPalette -1",
            "            /type (ustring)",
            "            /value [ " + arrow.length, "                " + arrow.hex, "            ]",
            "        }",
            // 끝 화살촉 크기 (%)
            "        /parameter-3 {",
            "            /key 1634951986",
            "            /showInPalette -1",
            "            /type (real)",
            "            /value " + scale + ".0",
            "        }",
            // 화살촉 정렬: 패스 끝의 팁
            "        /parameter-4 {",
            "            /key 1634230636",
            "            /showInPalette -1",
            "            /type (enumerated)",
            "            /name [ 17", "                ED8CA8EC8AA420EB819DEC9D9820ED8C81", "            ]",
            "            /value 0",
            "        }",
            "    }",
            "}"
        ];
        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
    }

    // 잠기거나 숨긴 레이어에 넣으면 MRAP 오류가 난다. 편집할 수 있는 레이어를 고른다
    function findEditableLayer() {
        var active = doc.activeLayer;
        if (!active.locked && active.visible) return active;
        for (var i = 0; i < doc.layers.length; i++) {
            if (!doc.layers[i].locked && doc.layers[i].visible) return doc.layers[i];
        }
        return doc.layers.add();
    }

    // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는
    // GSMediumB1(기준선 +0.5pt). 항목 기호 (가)(나)는 바탕 1.25배, ㉠·ⓐ는 바탕 1.125배 (8pt 기준 10pt·9pt).
    // 크기를 정한 뒤에 부른다
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            var bracket = batangFont !== null && isBracketLabel(text, i);
            if (bracket || (batangFont !== null && isCircledLabel(code))) {
                attributes.textFont = batangFont;
                attributes.size = attributes.size * (bracket ? 1.25 : 1.125);
                attributes.baselineShift = 0;
            } else if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    // i번째 글자가 "(한글 한 글자)" 세 글자 안에 드는가
    function isBracketLabel(text, i) {
        for (var start = i - 2; start <= i; start++) {
            if (start < 0 || start + 2 >= text.length) continue;
            var inner = text.charCodeAt(start + 1);
            if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return true;
        }
        return false;
    }

    // ㉠㉡… ⓐⓑ…
    function isCircledLabel(code) {
        return (code >= 0x3260 && code <= 0x327F) || (code >= 0x24D0 && code <= 0x24E9);
    }

    // 없으면 null (바탕이 없으면 항목 기호도 Spoqa로 둔다)
    function findOptionalFont(name) {
        try { return app.textFonts.getByName(name); } catch (e) { return null; }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.alignChildren = ["left", "top"];
        panel.margins = [12, 16, 12, 12];
        panel.spacing = 6;
        return panel;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals};
    }

    // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === getter()) return;
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(",", ".").replace(/[^0-9.\-]/g, ""));
        return isNaN(value) ? null : value;
    }

    function clamp(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function roundTo(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        var factor = Math.pow(10, decimals);
        var rounded = Math.round(value * factor) / factor;
        var text = String(rounded);
        if (decimals <= 0) return text;
        var dot = text.indexOf(".");
        if (dot === -1) {
            text += ".";
            dot = text.length - 1;
        }
        while (text.length - dot - 1 < decimals) text += "0";
        return text;
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", mode, positions, orbitMm, moonMm, earthMm, sunOnRight ? "1" : "0", showApparent ? "1" : "0",
            labelStyle, widthMm, darkK, umbraK, penumbraK, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 17) return;
        mode = restoreNumber(p[1], mode, [0, MODES.length - 1], 1);
        positions = p[2] === "4" ? 4 : 8;
        orbitMm = restoreNumber(p[3], orbitMm, ORBIT_RANGE, 0.5);
        moonMm = restoreNumber(p[4], moonMm, BODY_RANGE, 0.5);
        earthMm = restoreNumber(p[5], earthMm, BODY_RANGE, 0.5);
        sunOnRight = p[6] === "1";
        showApparent = p[7] === "1";
        labelStyle = restoreNumber(p[8], labelStyle, [0, LABEL_STYLES.length - 1], 1);
        widthMm = restoreNumber(p[9], widthMm, WIDTH_RANGE, 1);
        darkK = restoreNumber(p[10], darkK, K_RANGE, 10);
        umbraK = restoreNumber(p[11], umbraK, K_RANGE, 10);
        penumbraK = restoreNumber(p[12], penumbraK, K_RANGE, 10);
        fontPt = restoreNumber(p[13], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[14], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[15], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[16] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
