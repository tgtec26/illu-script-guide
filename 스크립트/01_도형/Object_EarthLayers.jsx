// Object_EarthLayers.jsx
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

// 지구 내부 구조: 화면 가운데에 지각·맨틀·외핵·내핵 단면을 그린다.
//   - 경계 깊이는 실제 비율: 맨틀–외핵 2900 km, 외핵–내핵 5100 km, 중심 6400 km.
//     지각(5~35 km)은 실제로는 보이지 않을 만큼 얇아서 반지름의 %로 두께를 과장한다.
//   - 모양: 원 단면, 반원 단면(위쪽 반), 부채꼴 절개(오른쪽 위 1/4을 잘라 층을 보이고 나머지는 겉면).
//   - 층 이름은 45° 방향 각 층 가운데에서 오른쪽으로 뽑은 지시선 끝에, 깊이(km)는 오른쪽 가로 반지름 아래에 적는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectEarthLayers/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var EARTH_RADIUS_KM = 6400;
    // 바깥부터 층 이름, 상태, 음영(K)
    var LAYERS = [
        {name: "지각", state: "고체", k: 50},
        {name: "맨틀", state: "고체", k: 20},
        {name: "외핵", state: "액체", k: 35},
        {name: "내핵", state: "고체", k: 60}
    ];
    var SURFACE_K = 8;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var SHAPES = ["원", "반원", "부채꼴 절개"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var RADIUS_RANGE = [10, 150];
    var CRUST_RANGE = [1, 15];
    var LEADER_RANGE = [2, 50];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var shape = 2;
    var radiusMm = 30;
    var crustPct = 4;
    var leaderMm = 8;
    var shadeOn = true;
    var namesOn = true;
    var stateOn = false;
    var depthOn = true;
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
    var dlg = new Window("dialog", "지구 내부 구조");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    var shapeRow = shapePanel.add("group");
    shapeRow.add("statictext", undefined, "단면:").preferredSize.width = LABEL_WIDTH;
    var shapeRadios = [];
    for (var s = 0; s < SHAPES.length; s++) shapeRadios.push(shapeRow.add("radiobutton", undefined, SHAPES[s]));
    var radiusRow = addValueRow(shapePanel, "반지름", "mm", radiusMm, RADIUS_RANGE[0], RADIUS_RANGE[1], 1, 0);
    var crustRow = addValueRow(shapePanel, "지각 두께", "%", crustPct, CRUST_RANGE[0], CRUST_RANGE[1], 0.5, 1);
    crustRow.input.helpTip = "반지름에 대한 %. 실제(35 km)는 0.5%라 보이게 과장한다";
    var shadeCheck = shapePanel.add("checkbox", undefined, "층마다 음영");

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var namesCheck = checkRow.add("checkbox", undefined, "층 이름");
    var stateCheck = checkRow.add("checkbox", undefined, "상태 (고체·액체)");
    var depthCheck = checkRow.add("checkbox", undefined, "깊이 (km)");
    var leaderRow = addValueRow(markPanel, "지시선 길이", "mm", leaderMm, LEADER_RANGE[0], LEADER_RANGE[1], 1, 0);
    leaderRow.input.helpTip = "단면 오른쪽 끝에서 글자까지";
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

    shapeRadios[shape].value = true;
    shadeCheck.value = shadeOn;
    namesCheck.value = namesOn;
    stateCheck.value = stateOn;
    depthCheck.value = depthOn;
    syncEnabled();

    for (var sr = 0; sr < shapeRadios.length; sr++) {
        shapeRadios[sr].onClick = (function(index) {
            return function() { shape = index; updatePreview(); };
        })(sr);
    }
    shadeCheck.onClick = function() { shadeOn = shadeCheck.value; updatePreview(); };
    namesCheck.onClick = function() { namesOn = namesCheck.value; syncEnabled(); updatePreview(); };
    stateCheck.onClick = function() { stateOn = stateCheck.value; updatePreview(); };
    depthCheck.onClick = function() { depthOn = depthCheck.value; updatePreview(); };
    bindValueRow(radiusRow, function() { return radiusMm; }, function(v) { radiusMm = v; });
    bindValueRow(crustRow, function() { return crustPct; }, function(v) { crustPct = v; });
    bindValueRow(leaderRow, function() { return leaderMm; }, function(v) { leaderMm = v; });
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

    // 상태·지시선 길이는 층 이름이 있을 때만 뜻이 있다
    function syncEnabled() {
        stateCheck.enabled = namesOn;
        leaderRow.input.enabled = namesOn;
        leaderRow.slider.enabled = namesOn;
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
        var R = radiusMm * MM;
        var radii = layerRadii(R, crustPct / 100);
        var range = shapeRange(shape);
        previewGroup = layer.groupItems.add();
        previewGroup.name = "지구 내부 구조";
        if (shape === 2) {
            // 잘라내지 않은 쪽의 겉면
            var surface = drawBezier(previewGroup, sectorPoints(R, range[1], range[0] + 2 * Math.PI), true);
            styleFace(surface, SURFACE_K);
            surface.name = "겉면";
        }
        for (var i = 0; i < radii.length; i++) {
            var face = shape === 0
                ? previewGroup.pathItems.ellipse(radii[i], -radii[i], radii[i] * 2, radii[i] * 2)
                : drawBezier(previewGroup, sectorPoints(radii[i], range[0], range[1]), true);
            styleFace(face, shadeOn ? LAYERS[i].k : 0);
            face.name = LAYERS[i].name;
        }
        if (namesOn) drawNames(radii, range);
        if (depthOn) drawDepths(radii);
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    // 45° 방향(부채꼴이면 절개 가운데) 각 층 가운데에서 오른쪽으로 지시선, 끝에 이름
    function drawNames(radii, range) {
        var angle = (range[0] + range[1]) / 2;
        if (shape !== 2) angle = Math.PI / 4;
        var anchors = labelAnchors(radii, angle);
        var endX = radii[0] + leaderMm * MM;
        for (var i = 0; i < anchors.length; i++) {
            var leader = previewGroup.pathItems.add();
            leader.setEntirePath([anchors[i], [endX, anchors[i][1]]]);
            leader.filled = false;
            leader.stroked = true;
            leader.strokeColor = makeGray(100);
            leader.strokeWidth = LINE_WIDTH_PT;
            leader.name = "지시선";
            var dot = previewGroup.pathItems.ellipse(anchors[i][1] + 0.4 * MM, anchors[i][0] - 0.4 * MM, 0.8 * MM, 0.8 * MM);
            dot.stroked = false;
            dot.filled = true;
            dot.fillColor = makeGray(100);
            var label = LAYERS[i].name + (stateOn ? " (" + LAYERS[i].state + ")" : "");
            addText(label, endX + fontPt * 0.4, anchors[i][1], true);
        }
    }

    // 오른쪽 가로 반지름에 경계마다 눈금, 아래에 겉면에서 잰 깊이
    function drawDepths(radii) {
        var marks = depthMarks(radii);
        var tick = 1 * MM;
        for (var i = 0; i < marks.length; i++) {
            var line = previewGroup.pathItems.add();
            line.setEntirePath([[marks[i].x, 0], [marks[i].x, -tick]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = makeGray(100);
            line.strokeWidth = LINE_WIDTH_PT;
            line.name = "깊이 눈금";
            addText(marks[i].text, marks[i].x, -tick - fontPt * (0.7 + 1.1 * marks[i].row), false);
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
    // 기하 (순수 계산, 지구 중심 (0, 0))
    // -------------------------------------------------------
    // 층마다 바깥 반지름. 지각 안쪽은 반지름 × (1 − 지각 비율), 나머지는 실제 깊이 비율
    function layerRadii(R, crustRatio) {
        return [R, R * (1 - crustRatio), R * (EARTH_RADIUS_KM - 2900) / EARTH_RADIUS_KM, R * (EARTH_RADIUS_KM - 5100) / EARTH_RADIUS_KM];
    }

    // 층을 그리는 각 구간 (라디안): 원은 한 바퀴, 반원은 위쪽 반, 부채꼴은 오른쪽 위 1/4
    function shapeRange(shapeIndex) {
        if (shapeIndex === 1) return [0, Math.PI];
        if (shapeIndex === 2) return [0, Math.PI / 2];
        return [0, 2 * Math.PI];
    }

    // 중심에서 시작해 반지름 r 원호(from → to)를 지나 중심으로 닫는 부채꼴
    function sectorPoints(r, from, to) {
        var points = [{anchor: [0, 0], left: [0, 0], right: [0, 0]}];
        var arc = arcPoints(0, 0, r, from, to);
        for (var i = 0; i < arc.length; i++) points.push(arc[i]);
        return points;
    }

    // 층마다 (바깥 반지름 + 안쪽 반지름) / 2 자리를 angle 방향에. 내핵 안쪽은 0
    function labelAnchors(radii, angle) {
        var list = [];
        for (var i = 0; i < radii.length; i++) {
            var inner = i + 1 < radii.length ? radii[i + 1] : 0;
            var r = (radii[i] + inner) / 2;
            list.push([r * Math.cos(angle), r * Math.sin(angle)]);
        }
        return list;
    }

    // 겉면(0 km)부터 경계마다 {x, 글자, 줄}. 지각 아래 경계는 실제 깊이가 아니라 빼고,
    // 중심(6400 km)은 가까운 5100과 겹치지 않게 한 줄 아래에 둔다
    function depthMarks(radii) {
        return [
            {x: radii[0], text: "0", row: 0},
            {x: radii[2], text: "2900", row: 0},
            {x: radii[3], text: "5100", row: 0},
            {x: 0, text: EARTH_RADIUS_KM + " km", row: 1}
        ];
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
    function styleFace(path, k) {
        path.filled = true;
        path.fillColor = makeGray(k);
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_WIDTH_PT;
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

    // 세로 가운데가 y. leftAligned면 왼쪽 끝이 x, 아니면 가로 가운데가 x
    function addText(text, x, y, leftAligned) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        var b = frame.geometricBounds;
        frame.translate(x - (leftAligned ? b[0] : (b[0] + b[2]) / 2), y - (b[1] + b[3]) / 2);
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
        var parts = ["v1", shape, radiusMm, crustPct, leaderMm, shadeOn ? "1" : "0", namesOn ? "1" : "0",
            stateOn ? "1" : "0", depthOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 13) return;
        shape = restoreNumber(p[1], shape, [0, SHAPES.length - 1], 1);
        radiusMm = restoreNumber(p[2], radiusMm, RADIUS_RANGE, 1);
        crustPct = restoreNumber(p[3], crustPct, CRUST_RANGE, 0.5);
        leaderMm = restoreNumber(p[4], leaderMm, LEADER_RANGE, 1);
        shadeOn = p[5] === "1";
        namesOn = p[6] === "1";
        stateOn = p[7] === "1";
        depthOn = p[8] === "1";
        fontPt = restoreNumber(p[9], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[10], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[11], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[12] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
