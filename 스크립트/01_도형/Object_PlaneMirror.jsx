// Object_PlaneMirror.jsx
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


// 평면거울: 화면 가운데에 평면거울에 비친 상의 작도를 그린다.
//   - 거울은 세로선이고 뒷면(오른쪽)에 빗금. 물체(위 화살표)는 거울 앞 '물체 거리'에, 상(파선 화살표)은 거울 뒤 같은 거리에 같은 크기로.
//   - 광선: 물체 끝점 P에서 나온 빛이 거울 M에서 반사해 눈으로 들어간다. M은 눈과 상 P'을 잇는 직선이 거울과 만나는 점이라
//     입사각 = 반사각이다. 거울 뒤 M → P'은 파선. 꼭대기·아래 끝 광선을 따로 켠다. M이 거울 밖이면 그 광선은 그리지 않는다.
//   - 법선·각: 반사점마다 파선 법선과 입사각(i)·반사각(r) 호.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectPlaneMirror/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var OBJECT_WIDTH_PT = 1;
    var GUIDE_DASH = [2, 1.5];
    var HEAD_LENGTH = 1.6 * MM;
    var HEAD_WIDTH = 1.1 * MM;
    var HATCH_MM = 1.5;
    var EYE_MM = 3;
    var IMAGE_K = 50;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var MIRROR_RANGE = [10, 200];
    var DISTANCE_RANGE = [5, 150];
    var HEIGHT_RANGE = [2, 150];
    var EYE_HEIGHT_RANGE = [0, 200];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var mirrorMm = 50;
    var objectDistMm = 25;
    var objectHeightMm = 18;
    var eyeDistMm = 40;
    var eyeHeightMm = 30;
    var topRayOn = true;
    var bottomRayOn = true;
    var normalOn = true;
    var labelsOn = true;
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
    var dlg = new Window("dialog", "평면거울의 상");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "배치");
    var mirrorRow = addValueRow(shapePanel, "거울 높이", "mm", mirrorMm, MIRROR_RANGE[0], MIRROR_RANGE[1], 1, 0);
    var objectDistRow = addValueRow(shapePanel, "물체 거리", "mm", objectDistMm, DISTANCE_RANGE[0], DISTANCE_RANGE[1], 1, 0);
    var objectHeightRow = addValueRow(shapePanel, "물체 높이", "mm", objectHeightMm, HEIGHT_RANGE[0], HEIGHT_RANGE[1], 1, 0);
    var eyeDistRow = addValueRow(shapePanel, "눈 거리", "mm", eyeDistMm, DISTANCE_RANGE[0], DISTANCE_RANGE[1], 1, 0);
    var eyeHeightRow = addValueRow(shapePanel, "눈 높이", "mm", eyeHeightMm, EYE_HEIGHT_RANGE[0], EYE_HEIGHT_RANGE[1], 1, 0);
    eyeHeightRow.input.helpTip = "거울 아래 끝에서 잰 높이";

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var topCheck = checkRow.add("checkbox", undefined, "꼭대기 광선");
    var bottomCheck = checkRow.add("checkbox", undefined, "아래 끝 광선");
    var checkRow2 = markPanel.add("group");
    var normalCheck = checkRow2.add("checkbox", undefined, "법선·입사각·반사각");
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

    topCheck.value = topRayOn;
    bottomCheck.value = bottomRayOn;
    normalCheck.value = normalOn;
    labelsCheck.value = labelsOn;
    topCheck.onClick = function() { topRayOn = topCheck.value; updatePreview(); };
    bottomCheck.onClick = function() { bottomRayOn = bottomCheck.value; updatePreview(); };
    normalCheck.onClick = function() { normalOn = normalCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    bindValueRow(mirrorRow, function() { return mirrorMm; }, function(v) { mirrorMm = v; });
    bindValueRow(objectDistRow, function() { return objectDistMm; }, function(v) { objectDistMm = v; });
    bindValueRow(objectHeightRow, function() { return objectHeightMm; }, function(v) { objectHeightMm = v; });
    bindValueRow(eyeDistRow, function() { return eyeDistMm; }, function(v) { eyeDistMm = v; });
    bindValueRow(eyeHeightRow, function() { return eyeHeightMm; }, function(v) { eyeHeightMm = v; });
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

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        var g = mirrorScene(mirrorMm * MM, objectDistMm * MM, objectHeightMm * MM, eyeDistMm * MM, eyeHeightMm * MM);
        previewGroup = layer.groupItems.add();
        previewGroup.name = "평면거울의 상";
        // 거울과 뒷면 빗금
        var mirror = addLine([[0, g.bottom], [0, g.top]], null, "거울");
        mirror.strokeWidth = OBJECT_WIDTH_PT;
        var hatch = HATCH_MM * MM;
        for (var y = g.bottom + hatch; y <= g.top + 1e-6; y += hatch) addLine([[0, y], [hatch, y - hatch]], null, "빗금");
        // 물체와 상
        var object = addArrow([g.object[0], g.object[1]], "물체");
        object.strokeWidth = OBJECT_WIDTH_PT;
        var image = addLine([g.image[0], g.image[1]], GUIDE_DASH, "상");
        image.strokeWidth = OBJECT_WIDTH_PT;
        image.strokeColor = makeGray(IMAGE_K);
        addHead(g.image[1], 0, 1).fillColor = makeGray(IMAGE_K);
        var rays = [];
        if (bottomRayOn) rays.push(0);
        if (topRayOn) rays.push(1);
        for (var r = 0; r < rays.length; r++) {
            var ray = reflectionRay(g.object[rays[r]], g.eye, g.bottom, g.top);
            if (ray === null) continue;
            addLine([g.object[rays[r]], ray.m], null, "입사 광선");
            addHead(midpoint(g.object[rays[r]], ray.m), ray.m[0] - g.object[rays[r]][0], ray.m[1] - g.object[rays[r]][1]);
            addLine([ray.m, g.eye], null, "반사 광선");
            addHead(midpoint(ray.m, g.eye), g.eye[0] - ray.m[0], g.eye[1] - ray.m[1]);
            addLine([ray.m, g.image[rays[r]]], GUIDE_DASH, "연장선");
            if (normalOn) drawNormal(ray.m, g.object[rays[r]], g.eye);
        }
        drawEye(g.eye);
        if (labelsOn) {
            var gap = fontPt * 0.9;
            addText("물체", g.object[1][0], g.object[1][1] + gap, 0);
            addText("상", g.image[1][0], g.image[1][1] + gap, 0);
            addText("거울", 0, g.top + gap, 0);
            addText("눈", g.eye[0], g.eye[1] - EYE_MM * MM / 2 - gap, 0);
        }
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    // 반사점에서 앞쪽으로 파선 법선, 법선과 두 광선 사이에 i·r 호
    function drawNormal(m, from, to) {
        var length = Math.max(8 * MM, Math.abs(from[0]) * 0.6);
        addLine([m, [m[0] - length, m[1]]], GUIDE_DASH, "법선");
        var radius = Math.min(6 * MM, length * 0.5);
        var marks = [[from, "i"], [to, "r"]];
        for (var i = 0; i < 2; i++) {
            var angle = Math.atan2(marks[i][0][1] - m[1], marks[i][0][0] - m[0]);
            var arc = drawBezier(previewGroup, arcPoints(m[0], m[1], radius, Math.PI, angle < 0 ? angle + 2 * Math.PI : angle), false);
            styleLine(arc, LINE_WIDTH_PT, null);
            arc.name = "각 표시";
            if (!labelsOn) continue;
            var middle = (Math.PI + (angle < 0 ? angle + 2 * Math.PI : angle)) / 2;
            addText(marks[i][1], m[0] + (radius + fontPt * 0.6) * Math.cos(middle), m[1] + (radius + fontPt * 0.6) * Math.sin(middle), 0);
        }
    }

    // 흰 원에 거울 쪽(오른쪽)으로 치우친 눈동자
    function drawEye(center) {
        var d = EYE_MM * MM;
        addDisc(center, d, 0, "눈");
        addDisc([center[0] + d * 0.2, center[1]], d * 0.45, 100, "눈동자");
    }

    // -------------------------------------------------------
    // 기하 (순수 계산, 거울 가운데 (0, 0), 앞쪽이 왼쪽)
    // -------------------------------------------------------
    // 물체 [아래, 위], 상 [아래, 위], 눈, 거울 위아래 끝. 물체 아래 끝은 거울 아래 끝 높이
    function mirrorScene(mirrorHeight, objectDist, objectHeight, eyeDist, eyeHeight) {
        var bottom = -mirrorHeight / 2, top = mirrorHeight / 2;
        return {
            bottom: bottom, top: top,
            object: [[-objectDist, bottom], [-objectDist, bottom + objectHeight]],
            image: [[objectDist, bottom], [objectDist, bottom + objectHeight]],
            eye: [-eyeDist, bottom + eyeHeight]
        };
    }

    // 점 p의 빛이 거울(x = 0)에서 반사해 눈으로 오는 반사점: 눈과 상(p를 거울에 대칭)을 잇는 직선이 거울과 만나는 점.
    // 거울 밖이면 null
    function reflectionRay(p, eye, bottom, top) {
        var image = [-p[0], p[1]];
        var t = -eye[0] / (image[0] - eye[0]);
        var y = eye[1] + (image[1] - eye[1]) * t;
        if (y < bottom - 1e-9 || y > top + 1e-9) return null;
        return {m: [0, y]};
    }

    function midpoint(a, b) {
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", mirrorMm, objectDistMm, objectHeightMm, eyeDistMm, eyeHeightMm, topRayOn ? "1" : "0",
            bottomRayOn ? "1" : "0", normalOn ? "1" : "0", labelsOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 14) return;
        mirrorMm = restoreNumber(p[1], mirrorMm, MIRROR_RANGE, 1);
        objectDistMm = restoreNumber(p[2], objectDistMm, DISTANCE_RANGE, 1);
        objectHeightMm = restoreNumber(p[3], objectHeightMm, HEIGHT_RANGE, 1);
        eyeDistMm = restoreNumber(p[4], eyeDistMm, DISTANCE_RANGE, 1);
        eyeHeightMm = restoreNumber(p[5], eyeHeightMm, EYE_HEIGHT_RANGE, 1);
        topRayOn = p[6] === "1";
        bottomRayOn = p[7] === "1";
        normalOn = p[8] === "1";
        labelsOn = p[9] === "1";
        fontPt = restoreNumber(p[10], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[11], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[12], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[13] === "1";
    }

    // -------------------------------------------------------
    // 공통 도우미
    // -------------------------------------------------------
        function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

        function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
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

        // 끝이 tip, 방향 (dx, dy)인 채운 삼각형의 세 점
    function arrowHeadPoints(tip, dx, dy) {
        var length = Math.sqrt(dx * dx + dy * dy);
        var ux = dx / length, uy = dy / length;
        var bx = tip[0] - ux * HEAD_LENGTH, by = tip[1] - uy * HEAD_LENGTH;
        return [tip, [bx - uy * HEAD_WIDTH / 2, by + ux * HEAD_WIDTH / 2], [bx + uy * HEAD_WIDTH / 2, by - ux * HEAD_WIDTH / 2]];
    }

        function styleLine(path, weight, dashes, k) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(k === undefined ? 100 : k);
        path.strokeWidth = weight;
        if (dashes) path.strokeDashes = dashes;
    }

        function styleFace(path, k, stroked) {
        path.filled = true;
        path.fillColor = makeGray(k);
        path.stroked = stroked !== false;
        if (path.stroked) {
            path.strokeColor = makeGray(100);
            path.strokeWidth = LINE_WIDTH_PT;
        }
    }

        function addLine(points, dashes, name, container) {
        var line = (container || previewGroup).pathItems.add();
        line.setEntirePath(points);
        styleLine(line, LINE_WIDTH_PT, dashes);
        line.name = name;
        return line;
    }

        function addHead(tip, dx, dy, container) {
        var head = (container || previewGroup).pathItems.add();
        head.setEntirePath(arrowHeadPoints(tip, dx, dy));
        head.closed = true;
        head.stroked = false;
        head.filled = true;
        head.fillColor = makeGray(100);
        head.name = "화살촉";
        return head;
    }

        // 꺾은선 화살표: 마지막 점에 화살촉
    function addArrow(points, name, container) {
        var line = addLine(points, null, name, container);
        var a = points[points.length - 2], b = points[points.length - 1];
        addHead(b, b[0] - a[0], b[1] - a[1], container);
        return line;
    }

        function addDisc(center, diameter, k, name, container) {
        var disc = (container || previewGroup).pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
        styleFace(disc, k);
        disc.name = name;
        return disc;
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

        // 세로 가운데가 y. align이 0이면 가로 가운데, 1이면 왼쪽 끝, -1이면 오른쪽 끝이 x
    function addText(text, x, y, align, container) {
        var frame = (container || previewGroup).textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        var b = frame.geometricBounds;
        var anchorX = align === 1 ? b[0] : (align === -1 ? b[2] : (b[0] + b[2]) / 2);
        frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
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

        function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
