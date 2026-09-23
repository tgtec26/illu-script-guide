// Object_SolarSystem.jsx
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

// 태양계 행성: 화면 가운데에 여덟 행성을 그린다.
//   - 일렬: 크기 비교. 행성 가운데를 한 줄에 두고 가장자리 사이를 간격만큼 띄운다. 태양을 넣으면 왼쪽에 큰 원의 일부(호).
//     화성과 목성 사이에 파선과 '지구형 행성'·'목성형 행성' 글자를 넣을 수 있다.
//   - 궤도: 태양을 가운데 두고 같은 간격의 동심원 궤도(파선) 위에 행성을 놓는다. 각은 배치 번호로 흩는다. 거리는 실제 비율이 아니다.
//   - 크기 비율: 실제(지구 반지름 기준 수성 0.38 ~ 목성 11.2)나 완화(제곱근. 목성형이 너무 커지지 않게).
//     지구 지름(mm)이 기준이다. 토성 고리는 기울어진 타원 테.
//   - 행성 면은 회색 음영(행성마다 정한 K) 또는 흰색.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectSolarSystem/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var ORBIT_DASH = [2, 1.5];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 이름, 반지름(지구 = 1), 회색 음영 K
    var PLANETS = [
        {name: "수성", radius: 0.383, k: 40},
        {name: "금성", radius: 0.949, k: 20},
        {name: "지구", radius: 1, k: 50},
        {name: "화성", radius: 0.532, k: 60},
        {name: "목성", radius: 11.21, k: 30},
        {name: "토성", radius: 9.45, k: 20},
        {name: "천왕성", radius: 4.01, k: 15},
        {name: "해왕성", radius: 3.88, k: 45}
    ];
    var SUN_RADIUS = 109;
    var SATURN = 5;
    var LAYOUTS = ["일렬 (크기 비교)", "궤도"];
    var SCALES = ["실제 비율", "완화 (제곱근)"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var EARTH_RANGE = [1, 40];
    var GAP_RANGE = [0, 40];
    var ORBIT_RANGE = [3, 40];
    var SEED_RANGE = [1, 99];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var layout = 0;
    var scaleMode = 0;
    var earthMm = 4;
    var gapMm = 4;
    var orbitGapMm = 8;
    var seed = 1;
    var withSun = true;
    var shading = true;
    var groupMark = true;
    var labelsOn = true;
    var fontPt = 7;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "태양계 행성");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var layoutPanel = addPanel(dlg, "배치");
    var layoutRow = layoutPanel.add("group");
    layoutRow.add("statictext", undefined, "배치:").preferredSize.width = LABEL_WIDTH;
    var layoutRadios = [];
    for (var l = 0; l < LAYOUTS.length; l++) layoutRadios.push(layoutRow.add("radiobutton", undefined, LAYOUTS[l]));
    var scaleRow = layoutPanel.add("group");
    scaleRow.add("statictext", undefined, "크기:").preferredSize.width = LABEL_WIDTH;
    var scaleRadios = [];
    for (var sc = 0; sc < SCALES.length; sc++) scaleRadios.push(scaleRow.add("radiobutton", undefined, SCALES[sc]));
    var earthRow = addValueRow(layoutPanel, "지구 지름", "mm", earthMm, EARTH_RANGE[0], EARTH_RANGE[1], 0.5, 1);
    var gapRow = addValueRow(layoutPanel, "행성 간격", "mm", gapMm, GAP_RANGE[0], GAP_RANGE[1], 0.5, 1);
    gapRow.input.helpTip = "일렬: 이웃한 행성 가장자리 사이 거리";
    var orbitRow = addValueRow(layoutPanel, "궤도 간격", "mm", orbitGapMm, ORBIT_RANGE[0], ORBIT_RANGE[1], 0.5, 1);
    var seedRow = addValueRow(layoutPanel, "배치 번호", "", seed, SEED_RANGE[0], SEED_RANGE[1], 1, 0);
    seedRow.input.helpTip = "궤도: 행성이 놓이는 각이 바뀐다";

    var stylePanel = addPanel(dlg, "모양");
    var checkRow1 = stylePanel.add("group");
    var sunCheck = checkRow1.add("checkbox", undefined, "태양");
    var shadeCheck = checkRow1.add("checkbox", undefined, "회색 음영");
    var markCheck = checkRow1.add("checkbox", undefined, "지구형·목성형 구분 (일렬)");
    var labelCheck = stylePanel.add("checkbox", undefined, "행성 이름");
    var fontRow = addValueRow(stylePanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

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

    layoutRadios[layout].value = true;
    scaleRadios[scaleMode].value = true;
    sunCheck.value = withSun;
    shadeCheck.value = shading;
    markCheck.value = groupMark;
    labelCheck.value = labelsOn;
    syncEnabled();

    for (var lr = 0; lr < layoutRadios.length; lr++) {
        layoutRadios[lr].onClick = (function(index) {
            return function() { layout = index; syncEnabled(); updatePreview(); };
        })(lr);
    }
    for (var sr = 0; sr < scaleRadios.length; sr++) {
        scaleRadios[sr].onClick = (function(index) {
            return function() { scaleMode = index; updatePreview(); };
        })(sr);
    }
    sunCheck.onClick = function() { withSun = sunCheck.value; updatePreview(); };
    shadeCheck.onClick = function() { shading = shadeCheck.value; updatePreview(); };
    markCheck.onClick = function() { groupMark = markCheck.value; updatePreview(); };
    labelCheck.onClick = function() { labelsOn = labelCheck.value; syncEnabled(); updatePreview(); };
    bindValueRow(earthRow, function() { return earthMm; }, function(v) { earthMm = v; });
    bindValueRow(gapRow, function() { return gapMm; }, function(v) { gapMm = v; });
    bindValueRow(orbitRow, function() { return orbitGapMm; }, function(v) { orbitGapMm = v; });
    bindValueRow(seedRow, function() { return seed; }, function(v) { seed = v; });
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

    // 행성 간격·구분은 일렬에서만, 궤도 간격·배치 번호는 궤도에서만
    function syncEnabled() {
        setRowEnabled(gapRow, layout === 0);
        markCheck.enabled = layout === 0;
        setRowEnabled(orbitRow, layout === 1);
        setRowEnabled(seedRow, layout === 1);
        setRowEnabled(fontRow, labelsOn);
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
        var radii = planetRadii(earthMm * MM / 2, scaleMode === 1);
        previewGroup = layer.groupItems.add();
        previewGroup.name = "태양계";
        var placed = layout === 0
            ? rowLayout(radii, gapMm * MM, withSun ? sunRadius(earthMm * MM / 2, scaleMode === 1) : 0)
            : orbitLayout(radii, orbitGapMm * MM, withSun ? earthMm * MM * 1.5 : 0, seed);

        if (withSun) drawSun(placed.sun);
        if (layout === 1) {
            for (var o = 0; o < placed.orbits.length; o++) {
                var r = placed.orbits[o];
                var orbit = previewGroup.pathItems.ellipse(r, -r, 2 * r, 2 * r);
                orbit.filled = false;
                orbit.stroked = true;
                orbit.strokeColor = makeGray(100);
                orbit.strokeWidth = LINE_WIDTH_PT;
                orbit.strokeDashes = ORBIT_DASH;
            }
        }
        for (var i = 0; i < PLANETS.length; i++) {
            var p = placed.planets[i];
            drawPlanet(i, p.x, p.y, radii[i]);
            if (labelsOn) {
                var below = layout === 0 ? -placed.maxRadius - fontPt : -radii[i] - (i === SATURN ? radii[i] * 0.5 : 0) - fontPt * 0.8;
                addText(PLANETS[i].name, p.x, layout === 0 ? below : p.y + below);
            }
        }
        if (layout === 0 && groupMark) {
            // 화성과 목성 사이
            var x = (placed.planets[3].x + radii[3] + placed.planets[4].x - radii[4]) / 2;
            var top = placed.maxRadius + fontPt;
            var bottom = -placed.maxRadius - fontPt * 2.8;
            var line = previewGroup.pathItems.add();
            line.setEntirePath([[x, top], [x, bottom]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = makeGray(100);
            line.strokeWidth = LINE_WIDTH_PT;
            line.strokeDashes = ORBIT_DASH;
            var labelY = -placed.maxRadius - fontPt * 2.3;
            addText("지구형 행성", (placed.planets[0].x + placed.planets[3].x) / 2, labelY);
            addText("목성형 행성", (placed.planets[4].x + placed.planets[7].x) / 2, labelY);
        }
        previewGroup.translate(viewCenter[0] - placed.centerX + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    function drawPlanet(index, x, y, r) {
        var group = previewGroup.groupItems.add();
        group.name = PLANETS[index].name;
        // 토성 고리: 가로 2.2배·세로 0.5배 타원을 15° 기울인다. 타원 전체는 행성 뒤에, 아래(앞) 절반만 행성 위에 한 번 더
        if (index === SATURN) strokeRing(group, ringPoints(x, y, r, 0, 2 * Math.PI), true);
        var disk = group.pathItems.ellipse(y + r, x - r, 2 * r, 2 * r);
        disk.stroked = true;
        disk.strokeColor = makeGray(100);
        disk.strokeWidth = LINE_WIDTH_PT;
        disk.filled = true;
        disk.fillColor = makeGray(shading ? PLANETS[index].k : 0);
        if (index === SATURN) strokeRing(group, ringPoints(x, y, r, Math.PI, 2 * Math.PI), false);
    }

    function strokeRing(container, points, closed) {
        var ring = drawBezier(container, points, closed);
        ring.filled = false;
        ring.stroked = true;
        ring.strokeColor = makeGray(100);
        ring.strokeWidth = LINE_WIDTH_PT;
    }

    // 토성 고리 타원의 from → to 부분 (가로 반지름 2.2r, 세로 0.5r, 15° 기울임). π → 2π가 아래(앞) 절반
    function ringPoints(x, y, r, from, to) {
        var tilt = 15 * Math.PI / 180;
        var cos = Math.cos(tilt);
        var sin = Math.sin(tilt);
        var unitArc = arcPoints(0, 0, 1, from, to);
        function map(p) {
            var px = p[0] * r * 2.2;
            var py = p[1] * r * 0.5;
            return [x + px * cos - py * sin, y + px * sin + py * cos];
        }
        var out = [];
        for (var i = 0; i < unitArc.length; i++) {
            out.push({anchor: map(unitArc[i].anchor), left: map(unitArc[i].left), right: map(unitArc[i].right)});
        }
        // 닫힌 타원이면 겹친 끝 점을 하나로 (끝 점의 왼쪽 손잡이를 첫 점에)
        if (to - from >= 2 * Math.PI - 1e-9) {
            var last = out.pop();
            out[0] = {anchor: out[0].anchor, left: last.left, right: out[0].right};
        }
        return out;
    }

    // 태양: 일렬이면 왼쪽 끝에 큰 원의 오른쪽 조각만 보이게(호), 궤도면 가운데 원
    function drawSun(sun) {
        var path;
        if (sun.arc) {
            var half = sun.visibleHalfHeight;
            var angle = Math.asin(Math.min(1, half / sun.r));
            path = drawBezier(previewGroup, arcPoints(sun.x, 0, sun.r, -angle, angle), false);
            path.filled = true;
        } else {
            path = previewGroup.pathItems.ellipse(sun.r, sun.x - sun.r, 2 * sun.r, 2 * sun.r);
            path.filled = true;
        }
        path.name = "태양";
        path.fillColor = makeGray(shading ? 5 : 0);
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_WIDTH_PT;
        // 일렬이면 행성 이름과 같은 줄, 궤도면 가운데
        if (labelsOn) addText("태양", sun.labelX, sun.arc ? sun.labelY - fontPt : sun.labelY);
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
    // 배치 (순수 계산, 한 줄의 가운데 y = 0)
    // -------------------------------------------------------
    // 행성 반지름(pt). 완화면 지구 반지름 × √(실제 비율)
    function planetRadii(earthRadius, softened) {
        var list = [];
        for (var i = 0; i < PLANETS.length; i++) {
            list.push(earthRadius * (softened ? Math.sqrt(PLANETS[i].radius) : PLANETS[i].radius));
        }
        return list;
    }

    function sunRadius(earthRadius, softened) {
        return earthRadius * (softened ? Math.sqrt(SUN_RADIUS) : SUN_RADIUS);
    }

    // 일렬: 태양 조각(가장 큰 행성 높이의 1.3배만큼 보임)부터 오른쪽으로 가장자리 사이를 gap만큼 띄운다
    function rowLayout(radii, gap, sunR) {
        var maxRadius = 0;
        for (var i = 0; i < radii.length; i++) maxRadius = Math.max(maxRadius, radii[i]);
        var x = 0;
        var sun = null;
        if (sunR > 0) {
            var half = maxRadius * 1.3;
            var depth = sunR - Math.sqrt(Math.max(0, sunR * sunR - half * half));   // 보이는 조각의 너비
            sun = {arc: true, x: -sunR + depth, r: sunR, visibleHalfHeight: half, labelX: depth / 2, labelY: -maxRadius};
            x = depth + gap;
        }
        // 토성은 고리(가로 반지름 2.2배)까지 자리를 잡는다
        var planets = [];
        for (var p = 0; p < radii.length; p++) {
            var half = p === SATURN ? radii[p] * 2.2 : radii[p];
            planets.push({x: x + half, y: 0});
            x += 2 * half + gap;
        }
        var left = sun ? 0 : planets[0].x - radii[0];
        var right = planets[planets.length - 1].x + radii[radii.length - 1];
        return {sun: sun, planets: planets, maxRadius: maxRadius, centerX: (left + right) / 2};
    }

    // 궤도: 태양(반지름 sunR, 없으면 0) 둘레에 같은 간격으로. 첫 궤도는 태양 가장자리 + 간격 + 수성 반지름 바깥
    function orbitLayout(radii, gap, sunR, seed) {
        var random = makeRandom(seed);
        var orbits = [];
        var planets = [];
        var r = sunR;
        for (var i = 0; i < radii.length; i++) {
            r += gap + radii[i] + (i > 0 ? radii[i - 1] : 0) * 0.5;
            orbits.push(r);
            var angle = random() * 2 * Math.PI;
            planets.push({x: r * Math.cos(angle), y: r * Math.sin(angle)});
        }
        var sun = sunR > 0 ? {arc: false, x: 0, r: sunR, labelX: 0, labelY: 0} : null;
        return {sun: sun, planets: planets, orbits: orbits, maxRadius: 0, centerX: 0};
    }

    // 같은 seed면 같은 수열 (0 이상 1 미만)
    function makeRandom(seed) {
        var state = (seed * 2654435761) % 4294967296;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // 중심 (cx, cy), 반지름 r인 원호를 from → to(라디안, 반시계)로 90° 이하 조각마다 베지어 하나
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
        var parts = ["v1", layout, scaleMode, earthMm, gapMm, orbitGapMm, seed, withSun ? "1" : "0", shading ? "1" : "0",
            groupMark ? "1" : "0", labelsOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 15) return;
        layout = restoreNumber(p[1], layout, [0, LAYOUTS.length - 1], 1);
        scaleMode = restoreNumber(p[2], scaleMode, [0, SCALES.length - 1], 1);
        earthMm = restoreNumber(p[3], earthMm, EARTH_RANGE, 0.5);
        gapMm = restoreNumber(p[4], gapMm, GAP_RANGE, 0.5);
        orbitGapMm = restoreNumber(p[5], orbitGapMm, ORBIT_RANGE, 0.5);
        seed = restoreNumber(p[6], seed, SEED_RANGE, 1);
        withSun = p[7] === "1";
        shading = p[8] === "1";
        groupMark = p[9] === "1";
        labelsOn = p[10] === "1";
        fontPt = restoreNumber(p[11], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[12], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[13], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[14] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
