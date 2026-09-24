// Object_Parallax.jsx
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

// 별까지의 거리: 화면 가운데에 두 모식도 중 하나를 그린다.
//   - 연주 시차: 태양을 가운데 둔 지구 공전 궤도(납작한 타원, 파선)의 양 끝에 6개월 간격 지구 두 개,
//     태양 바로 위 '별 거리'에 별. 두 지구에서 별을 지나는 시선을 배경 별 줄까지 늘려(별 너머는 파선) 별이 보이는
//     자리를 표시한다. 별에서 태양 쪽 선과 오른쪽 지구 쪽 선 사이 각이 연주 시차 p, 두 시선 사이 각이 시차(2p).
//   - 거리와 밝기: 광원에서 거리 r, 2r, 3r…에 놓은 정사각형 화면(한 변 1, 2, 3…배)을 사선 투영으로 그리고
//     화면마다 1, 4, 9…칸으로 나눈다. 광원에서 가장 먼 화면 꼭짓점까지 네 선이 모든 화면 꼭짓점을 지난다.
//     밝기는 1, 1/4, 1/9…

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectParallax/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var GUIDE_DASH = [2, 1.5];
    var SUN_DIAMETER = 5 * MM;
    var EARTH_DIAMETER = 2.4 * MM;
    var STAR_RADIUS = 1.8 * MM;
    // 사선 투영: 안쪽(z) 1만큼이 화면에서 오른쪽 위 45° 방향으로 0.5
    var OBLIQUE = [0.5 * Math.SQRT1_2, 0.5 * Math.SQRT1_2];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["연주 시차", "거리와 밝기"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var ORBIT_RANGE = [5, 80];
    var DISTANCE_RANGE = [20, 200];
    var FLATTEN_RANGE = [10, 100];
    var BACKGROUND_RANGE = [5, 60];
    var STEP_RANGE = [5, 80];
    var SCREEN_RANGE = [2, 40];
    var SCREENS_RANGE = [2, 4];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var kind = 0;
    var orbitMm = 20;
    var distanceMm = 70;
    var flatten = 35;
    var backgroundMm = 20;
    var stepMm = 25;
    var screenMm = 8;
    var screenCount = 3;
    var backgroundOn = true;
    var parallaxOn = true;
    var doubleOn = false;
    var labelsOn = true;
    var gridOn = true;
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
    var dlg = new Window("dialog", "별까지의 거리");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    var kindRow = shapePanel.add("group");
    kindRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var kindRadios = [];
    for (var k = 0; k < KINDS.length; k++) kindRadios.push(kindRow.add("radiobutton", undefined, KINDS[k]));
    var orbitRow = addValueRow(shapePanel, "궤도 반지름", "mm", orbitMm, ORBIT_RANGE[0], ORBIT_RANGE[1], 1, 0);
    var distanceRow = addValueRow(shapePanel, "별 거리", "mm", distanceMm, DISTANCE_RANGE[0], DISTANCE_RANGE[1], 1, 0);
    var flattenRow = addValueRow(shapePanel, "궤도 납작함", "%", flatten, FLATTEN_RANGE[0], FLATTEN_RANGE[1], 5, 0);
    flattenRow.input.helpTip = "궤도 세로 반지름 ÷ 가로 반지름. 100이면 원";
    var backgroundRow = addValueRow(shapePanel, "배경 별 간격", "mm", backgroundMm, BACKGROUND_RANGE[0], BACKGROUND_RANGE[1], 1, 0);
    backgroundRow.input.helpTip = "별에서 배경 별 줄까지 거리";
    var stepRow = addValueRow(shapePanel, "거리 간격 r", "mm", stepMm, STEP_RANGE[0], STEP_RANGE[1], 1, 0);
    var screenRow = addValueRow(shapePanel, "첫 화면 변", "mm", screenMm, SCREEN_RANGE[0], SCREEN_RANGE[1], 0.5, 1);
    var screensRow = addValueRow(shapePanel, "화면 수", "개", screenCount, SCREENS_RANGE[0], SCREENS_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var checkRow1 = markPanel.add("group");
    var backgroundCheck = checkRow1.add("checkbox", undefined, "배경 별");
    var parallaxCheck = checkRow1.add("checkbox", undefined, "연주 시차 p");
    var doubleCheck = checkRow1.add("checkbox", undefined, "시차 2p");
    var checkRow2 = markPanel.add("group");
    var gridCheck = checkRow2.add("checkbox", undefined, "화면 칸");
    var labelsCheck = checkRow2.add("checkbox", undefined, "글자");
    var fontRow = addValueRow(markPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

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

    kindRadios[kind].value = true;
    backgroundCheck.value = backgroundOn;
    parallaxCheck.value = parallaxOn;
    doubleCheck.value = doubleOn;
    gridCheck.value = gridOn;
    labelsCheck.value = labelsOn;
    syncEnabled();

    for (var kr = 0; kr < kindRadios.length; kr++) {
        kindRadios[kr].onClick = (function(index) {
            return function() { kind = index; syncEnabled(); updatePreview(); };
        })(kr);
    }
    backgroundCheck.onClick = function() { backgroundOn = backgroundCheck.value; syncEnabled(); updatePreview(); };
    parallaxCheck.onClick = function() { parallaxOn = parallaxCheck.value; updatePreview(); };
    doubleCheck.onClick = function() { doubleOn = doubleCheck.value; updatePreview(); };
    gridCheck.onClick = function() { gridOn = gridCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    bindValueRow(orbitRow, function() { return orbitMm; }, function(v) { orbitMm = v; });
    bindValueRow(distanceRow, function() { return distanceMm; }, function(v) { distanceMm = v; });
    bindValueRow(flattenRow, function() { return flatten; }, function(v) { flatten = v; });
    bindValueRow(backgroundRow, function() { return backgroundMm; }, function(v) { backgroundMm = v; });
    bindValueRow(stepRow, function() { return stepMm; }, function(v) { stepMm = v; });
    bindValueRow(screenRow, function() { return screenMm; }, function(v) { screenMm = v; });
    bindValueRow(screensRow, function() { return screenCount; }, function(v) { screenCount = v; });
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

    // 종류마다 쓰는 행만 켠다
    function syncEnabled() {
        var parallax = kind === 0;
        setRowEnabled(orbitRow, parallax);
        setRowEnabled(distanceRow, parallax);
        setRowEnabled(flattenRow, parallax);
        setRowEnabled(backgroundRow, parallax && backgroundOn);
        setRowEnabled(stepRow, !parallax);
        setRowEnabled(screenRow, !parallax);
        setRowEnabled(screensRow, !parallax);
        backgroundCheck.enabled = parallax;
        parallaxCheck.enabled = parallax;
        doubleCheck.enabled = parallax;
        gridCheck.enabled = !parallax;
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
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
        previewGroup.name = KINDS[kind];
        if (kind === 0) {
            drawParallax();
        } else {
            drawBrightness();
        }
        // 그린 것의 가운데를 화면 가운데로
        var b = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM,
            viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM);
    }

    function drawParallax() {
        var g = parallaxGeometry(orbitMm * MM, distanceMm * MM, flatten / 100, backgroundMm * MM);
        var orbit = previewGroup.pathItems.ellipse(g.orbitHeight / 2, -g.earths[1][0], g.earths[1][0] * 2, g.orbitHeight);
        styleLine(orbit, GUIDE_DASH);
        orbit.name = "공전 궤도";
        // 시선: 지구 → 별은 실선, 별 → 배경 별은 파선
        for (var i = 0; i < 2; i++) {
            addLine([g.earths[i], g.star], null, "시선");
            if (backgroundOn) addLine([g.star, g.apparent[i]], GUIDE_DASH, "시선 연장");
        }
        addLine([[0, 0], g.star], GUIDE_DASH, "별 – 태양");
        var gap = fontPt * 0.9;
        if (parallaxOn) {
            addArcMark(g.star, [0, -1], g.earths[1], Math.min(12 * MM, g.star[1] * 0.3), labelsOn ? "p" : "");
        }
        if (doubleOn) {
            addArcMark(g.star, [g.earths[0][0] - g.star[0], g.earths[0][1] - g.star[1]], g.earths[1],
                Math.min(20 * MM, g.star[1] * 0.5), labelsOn ? "2p" : "");
        }
        if (backgroundOn) {
            for (var s = 0; s < g.background.length; s++) addStar(g.background[s], STAR_RADIUS * 0.7, 20).name = "배경 별";
            for (var a = 0; a < 2; a++) {
                var ghost = addStar(g.apparent[a], STAR_RADIUS, 0);
                ghost.stroked = true;
                ghost.strokeColor = makeGray(100);
                ghost.strokeWidth = LINE_WIDTH_PT;
                ghost.strokeDashes = [1, 1];
                ghost.name = "보이는 위치";
            }
        }
        addDisc([0, 0], SUN_DIAMETER, 30, "태양");
        for (var e = 0; e < 2; e++) addDisc(g.earths[e], EARTH_DIAMETER, 60, "지구");
        addStar(g.star, STAR_RADIUS, 100).name = "별";
        if (!labelsOn) return;
        addText("태양", 0, -SUN_DIAMETER / 2 - gap);
        addText("지구", g.earths[0][0], g.earths[0][1] - EARTH_DIAMETER / 2 - gap);
        addText("6개월 후", g.earths[1][0], g.earths[1][1] - EARTH_DIAMETER / 2 - gap);
        addText("별", g.star[0] + STAR_RADIUS + gap * 1.2, g.star[1]);
        addLine([[0, 0], g.earths[1]], null, "1 AU");
        addText("1 AU", g.earths[1][0] / 2, gap * 0.9);
    }

    function drawBrightness() {
        var screens = brightnessScreens(stepMm * MM, screenMm * MM, screenCount);
        var last = screens[screens.length - 1].corners;
        for (var c = 0; c < 4; c++) addLine([[0, 0], last[c]], null, "빛");
        for (var i = 0; i < screens.length; i++) {
            var face = previewGroup.pathItems.add();
            face.setEntirePath(screens[i].corners);
            face.closed = true;
            face.filled = true;
            face.fillColor = makeGray(10);
            face.stroked = true;
            face.strokeColor = makeGray(100);
            face.strokeWidth = LINE_WIDTH_PT;
            face.name = "화면 " + (i + 1);
            if (gridOn) {
                for (var l = 0; l < screens[i].grid.length; l++) addLine(screens[i].grid[l], null, "칸");
            }
        }
        addDisc([0, 0], EARTH_DIAMETER, 100, "광원");
        if (!labelsOn) return;
        var gap = fontPt * 0.9;
        addText("광원", 0, -EARTH_DIAMETER / 2 - gap);
        for (var s = 0; s < screens.length; s++) {
            var n = s + 1;
            var low = screens[s].corners[0];
            addText((n === 1 ? "" : n) + "r", screens[s].x, low[1] - gap);
            addText(n === 1 ? "밝기 1" : "1/" + (n * n), screens[s].x, low[1] - gap * 2.4);
        }
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
    // 기하 (순수 계산, 태양·광원이 (0, 0))
    // -------------------------------------------------------
    // 연주 시차: 지구 두 개(궤도 양 끝), 별(태양 위), 배경 별 줄, 두 시선이 배경 줄과 만나는 점
    function parallaxGeometry(orbit, distance, flattenRatio, backgroundGap) {
        var star = [0, distance];
        var earths = [[-orbit, 0], [orbit, 0]];
        var rowY = distance + backgroundGap;
        var apparent = [];
        for (var i = 0; i < 2; i++) {
            var t = rowY / distance;
            apparent.push([earths[i][0] + (star[0] - earths[i][0]) * t, rowY]);
        }
        var span = Math.max(Math.abs(apparent[0][0]), orbit) * 1.4;
        var background = [];
        var count = 7;
        for (var s = 0; s < count; s++) {
            var x = -span + 2 * span * (s + 0.5) / count;
            // 보이는 위치와 겹치지 않게 조금 위아래로 흩는다
            background.push([x, rowY + (s % 2 === 0 ? 1 : -1) * backgroundGap * 0.15]);
        }
        return {
            star: star, earths: earths, orbitHeight: orbit * 2 * flattenRatio, apparent: apparent, background: background
        };
    }

    // center에서 from 방향(벡터) → to 점 방향까지 작은 쪽으로 도는 각 구간 (라디안)
    function arcBetween(center, from, to) {
        var a0 = Math.atan2(from[1], from[0]);
        var a1 = Math.atan2(to[1] - center[1], to[0] - center[0]);
        var sweep = a1 - a0;
        while (sweep > Math.PI) sweep -= 2 * Math.PI;
        while (sweep < -Math.PI) sweep += 2 * Math.PI;
        return {start: a0, end: a0 + sweep};
    }

    // 거리와 밝기: n번째 화면은 광원에서 n × step, 한 변 n × side인 정사각형(안쪽으로 사선 투영), n × n칸.
    // 꼭짓점 순서: 아래 앞, 위 앞, 위 뒤, 아래 뒤
    function brightnessScreens(step, side, count) {
        var list = [];
        for (var n = 1; n <= count; n++) {
            var x = step * n;
            var half = side * n / 2;
            var corners = [project(x, -half, -half), project(x, half, -half), project(x, half, half), project(x, -half, half)];
            var grid = [];
            for (var g = 1; g < n; g++) {
                var u = -half + side * g;
                grid.push([project(x, u, -half), project(x, u, half)]);
                grid.push([project(x, -half, u), project(x, half, u)]);
            }
            list.push({x: x, corners: corners, grid: grid});
        }
        return list;
    }

    // 3차원 (x 오른쪽, y 위, z 안쪽) → 화면
    function project(x, y, z) {
        return [x + z * OBLIQUE[0], y + z * OBLIQUE[1]];
    }

    // 중심 (cx, cy), 반지름 r인 원호를 from → to(라디안)로 90° 이하 조각마다 베지어 하나
    function arcPoints(cx, cy, r, from, to) {
        var sweep = to - from;
        var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
        var step = sweep / pieces;
        var handle = 4 / 3 * Math.tan(step / 4) * r;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var angle = from + step * i;
            var p = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
            var tangent = [-Math.sin(angle) * handle, Math.cos(angle) * handle];
            points.push({
                anchor: p,
                left: i === 0 ? p : [p[0] - tangent[0], p[1] - tangent[1]],
                right: i === pieces ? p : [p[0] + tangent[0], p[1] + tangent[1]]
            });
        }
        return points;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function styleLine(path, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_WIDTH_PT;
        if (dashes) path.strokeDashes = dashes;
    }

    function addLine(points, dashes, name) {
        var line = previewGroup.pathItems.add();
        line.setEntirePath(points);
        styleLine(line, dashes);
        line.name = name;
        return line;
    }

    function addDisc(center, diameter, k, name) {
        var disc = previewGroup.pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
        disc.filled = true;
        disc.fillColor = makeGray(k);
        disc.stroked = true;
        disc.strokeColor = makeGray(100);
        disc.strokeWidth = LINE_WIDTH_PT;
        disc.name = name;
        return disc;
    }

    // 다섯 꼭짓점 별. k가 0이면 칠하지 않는다
    function addStar(center, radius, k) {
        var star = previewGroup.pathItems.star(center[0], center[1], radius, radius * 0.45, 5);
        star.stroked = false;
        star.filled = k > 0;
        if (k > 0) star.fillColor = makeGray(k);
        return star;
    }

    // 각 표시: center에서 from 방향 → to 점 방향 원호와 그 바깥의 글자
    function addArcMark(center, from, to, r, label) {
        var arc = arcBetween(center, from, to);
        var mark = drawBezier(previewGroup, arcPoints(center[0], center[1], r, arc.start, arc.end), false);
        styleLine(mark, null);
        mark.name = "각 표시";
        if (!label) return;
        var middle = (arc.start + arc.end) / 2;
        var textR = r + fontPt * 0.9;
        addText(label, center[0] + textR * Math.cos(middle), center[1] + textR * Math.sin(middle));
    }

    function drawBezier(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
        }
        path.closed = closed;
        return path;
    }

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
        return frame;
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
        var parts = ["v1", kind, orbitMm, distanceMm, flatten, backgroundMm, stepMm, screenMm, screenCount,
            backgroundOn ? "1" : "0", parallaxOn ? "1" : "0", doubleOn ? "1" : "0", labelsOn ? "1" : "0", gridOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 18) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        orbitMm = restoreNumber(p[2], orbitMm, ORBIT_RANGE, 1);
        distanceMm = restoreNumber(p[3], distanceMm, DISTANCE_RANGE, 1);
        flatten = restoreNumber(p[4], flatten, FLATTEN_RANGE, 5);
        backgroundMm = restoreNumber(p[5], backgroundMm, BACKGROUND_RANGE, 1);
        stepMm = restoreNumber(p[6], stepMm, STEP_RANGE, 1);
        screenMm = restoreNumber(p[7], screenMm, SCREEN_RANGE, 0.5);
        screenCount = restoreNumber(p[8], screenCount, SCREENS_RANGE, 1);
        backgroundOn = p[9] === "1";
        parallaxOn = p[10] === "1";
        doubleOn = p[11] === "1";
        labelsOn = p[12] === "1";
        gridOn = p[13] === "1";
        fontPt = restoreNumber(p[14], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[15], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[16], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[17] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
