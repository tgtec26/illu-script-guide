// Object_CircleProps.jsx
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

// 원의 성질: 선택한 원 위의 점 A·B·P·T를 각도(오른쪽 0°, 반시계)로 정하고
// 현 AB, 반지름 OA·OB, 원주각 ∠APB, 중심각·원주각 표시와 각도 값, 중심에서 현에 내린 수선 OM(직각 표시),
// 부채꼴 AOB(A에서 반시계로 B까지), T에서의 접선(직각 표시), 원 밖의 점 Q에서 그은 두 접선 QC·QD를 골라 그린다.
// 선 두께는 평가원 그림 기준: 현·반지름·접선 0.8pt, 수선·보조선(점선)·각 표시 0.3pt. 원 선은 기본으로 0.8pt로 맞춘다(끄면 그대로).

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "CircleProps/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 30;
    var LABEL_WIDTH = 100;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var MAIN_PT = 0.8;
    var GUIDE_PT = 0.3;
    var GUIDE_DASH = [2, 1.5];
    var SECTOR_K = 15;
    var SHAPE_STROKE_PT = 0.8;
    var DOT_RADIUS_MM = 0.6;
    var LABEL_GAP_MM = 0.8;
    // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
    var FLAG_KEYS = ["center", "chord", "radii", "inscribed", "inscribedMark", "centralMark", "values",
        "perpendicular", "sector", "tangent", "external", "names"];
    var ANGLE_KEYS = ["a", "b", "p", "t", "q"];

    var doc = app.activeDocument;

    var target = null;
    var sel = doc.selection;
    if (sel && sel.length === 1 && sel[0].typename === "PathItem" && sel[0].closed) target = sel[0];
    var bounds = target ? target.geometricBounds : null;
    if (target === null || Math.abs((bounds[2] - bounds[0]) - (bounds[1] - bounds[3])) > (bounds[2] - bounds[0]) * 0.01) {
        alert("가로·세로가 같은 원(패스) 하나를 선택해주세요.");
        return;
    }
    var center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
    var radius = (bounds[2] - bounds[0]) / 2;

    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

    // 옵션 (각도는 도)
    var opt = {
        center: true, chord: true, radii: true, inscribed: true, inscribedMark: true, centralMark: true, values: false,
        perpendicular: false, sector: false, tangent: false, external: false, names: true,
        a: 210, b: 330, p: 100, t: 45, q: 0, qDistance: 2, markMm: 3
    };
    var normalizeStroke = true;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    applySettings();

    var previewGroup = null;
    var originalStroked = target.stroked;
    var originalStrokeWidth = target.strokeWidth;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "원의 성질");
    win.alignChildren = "fill";

    var elementPanel = addPanel(win, "그릴 것");
    var checks = {};
    addCheckRow(elementPanel, [["center", "중심 O"], ["chord", "현 AB"], ["radii", "반지름 OA·OB"]]);
    addCheckRow(elementPanel, [["inscribed", "원주각 ∠APB"], ["inscribedMark", "원주각 표시"], ["centralMark", "중심각 표시"]]);
    addCheckRow(elementPanel, [["values", "각도 값"], ["perpendicular", "수선 OM"], ["sector", "부채꼴 AOB"]]);
    addCheckRow(elementPanel, [["tangent", "T의 접선"], ["external", "Q의 두 접선"], ["names", "점 이름"]]);
    checks.sector.helpTip = "A에서 반시계로 B까지";
    checks.external.helpTip = "원 밖의 점 Q에서 그은 두 접선 QC·QD";
    var normalizeCheck = elementPanel.add("checkbox", undefined, "원 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
    normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";

    var anglePanel = addPanel(win, "점 위치 (오른쪽 0°, 반시계)");
    var angleRows = {
        a: addValueRow(anglePanel, "A", "°", opt.a, 0, 359, 1, 0),
        b: addValueRow(anglePanel, "B", "°", opt.b, 0, 359, 1, 0),
        p: addValueRow(anglePanel, "P", "°", opt.p, 0, 359, 1, 0),
        t: addValueRow(anglePanel, "T", "°", opt.t, 0, 359, 1, 0),
        q: addValueRow(anglePanel, "Q 방향", "°", opt.q, 0, 359, 1, 0)
    };
    var distanceControls = addValueRow(anglePanel, "Q 거리", "반지름 배", opt.qDistance, 1.2, 4, 0.1, 1);

    var sizePanel = addPanel(win, "크기");
    var markControls = addValueRow(sizePanel, "각 표시 반지름", "mm", opt.markMm, 1, 10, 0.1, 1);
    var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

    var positionPanel = addPanel(win, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}

    normalizeCheck.value = normalizeStroke;
    normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
    previewCheck.value = previewEnabled;
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    for (var k = 0; k < ANGLE_KEYS.length; k++) bindAngleRow(ANGLE_KEYS[k]);
    bindValueRow(distanceControls, function(value) { opt.qDistance = value; });
    bindValueRow(markControls, function(value) { opt.markMm = value; });
    bindValueRow(fontControls, function(value) { fontPt = value; });
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        if (previewGroup !== null) previewGroup.selected = true;
        win.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    if (win.show() !== 1) {
        clearPreview();
        app.redraw();
    }

    function addCheckRow(parent, items) {
        var row = parent.add("group");
        for (var i = 0; i < items.length; i++) {
            var check = row.add("checkbox", undefined, items[i][1]);
            check.preferredSize.width = 120;
            bindOption(check, items[i][0]);
            checks[items[i][0]] = check;
        }
    }

    function bindOption(check, key) {
        check.value = opt[key];
        check.onClick = function() {
            opt[key] = check.value;
            updatePreview();
        };
    }

    function bindAngleRow(key) {
        bindValueRow(angleRows[key], function(value) { opt[key] = value; });
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function clearPreview() {
        try {
            target.stroked = originalStroked;
            target.strokeWidth = originalStrokeWidth;
        } catch (restoreError) {}
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
    }

    function buildPreview() {
        if (normalizeStroke) {
            target.stroked = true;
            target.strokeWidth = SHAPE_STROKE_PT;
        }
        // 부채꼴 채우기는 원 선의 안쪽 가장자리까지만 (선을 덮지 않게)
        var drawing = buildCircleFigure(center, radius, opt, opt.markMm * MM_TO_PT, target.stroked ? target.strokeWidth / 2 : 0);
        previewGroup = target.parent.groupItems.add();
        previewGroup.move(target, ElementPlacement.PLACEBEFORE);
        previewGroup.name = "원의 성질";
        for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
        for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
        for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
        for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
    }

    function drawBezier(points, closed) {
        var path = previewGroup.pathItems.add();
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

    // line: {points, kind:"main"|"guide"|"mark"}
    function addPath(line) {
        var path = drawBezier(line.points, false);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = line.kind === "main" ? MAIN_PT : GUIDE_PT;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
        if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
    }

    function addFill(points) {
        var path = drawBezier(points, true);
        path.stroked = false;
        path.filled = true;
        path.fillColor = makeGray(SECTOR_K);
    }

    function addDot(at) {
        var r = DOT_RADIUS_MM * MM_TO_PT;
        var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
        circle.stroked = false;
        circle.filled = true;
        circle.fillColor = makeGray(100);
    }

    // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
    function addLabel(label) {
        var frame = previewGroup.textFrames.add();
        frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
        var dir = label.dir;
        var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
        var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt). 점 이름은 똑바로
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var character = frame.textRange.characters[i];
            var attributes = character.characterAttributes;
            var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
            attributes.textFont = korean ? korFont : engFont;
            attributes.baselineShift = korean ? 0 : ENG_BASELINE_PT;
        }
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
    // 기하 (일러 DOM을 쓰지 않는다 → tests/check-circle-props.js)
    // -------------------------------------------------------
    function buildCircleFigure(O, r, o, markR, fillInset) {
        var out = { fills: [], lines: [], dots: [], texts: [] };
        var rad = Math.PI / 180;
        function on(deg) { return [O[0] + r * Math.cos(deg * rad), O[1] + r * Math.sin(deg * rad)]; }
        function name(text, point) { if (o.names) out.texts.push({ text: text, at: point, dir: unit(sub(point, O)) }); }
        var A = on(o.a), B = on(o.b), P = on(o.p);
        var sweep = ((o.b - o.a) % 360 + 360) % 360 * rad;   // A에서 반시계로 B까지 (중심각)
        var usesAB = o.chord || o.radii || o.inscribed || o.centralMark || o.perpendicular || o.sector;

        if (o.sector) out.fills.push([plain(O)].concat(arcPoints(O, r - (fillInset || 0), o.a * rad, sweep)));
        if (o.chord) out.lines.push(line([A, B], "main"));
        if (o.radii) {
            out.lines.push(line([O, A], "main"));
            out.lines.push(line([O, B], "main"));
        }
        if (o.centralMark && sweep > 0) {
            out.lines.push({ points: arcPoints(O, markR, o.a * rad, sweep), kind: "mark" });
            if (o.values) out.texts.push({ text: formatDegrees(sweep / rad), at: O, dir: unitAt(o.a * rad + sweep / 2), clear: markR });
        }
        if (o.inscribed) {
            out.lines.push(line([A, P, B], "main"));
            name("P", P);
            var span = smallAngle(P, A, B);
            if (o.inscribedMark) out.lines.push({ points: arcPoints(P, markR, span.start, span.sweep), kind: "mark" });
            if (o.values) out.texts.push({ text: formatDegrees(span.sweep / rad), at: P, dir: unitAt(span.start + span.sweep / 2), clear: markR });
        }
        if (o.perpendicular) {
            var M = midpoint(A, B);
            if (dist(O, M) > r * 1e-6) {
                out.lines.push(line([O, M], "guide"));
                out.lines.push(rightAngle(M, unit(sub(O, M)), unit(sub(B, M)), markR * 0.6));
                name("M", M);
            }
        }
        if (usesAB) {
            name("A", A);
            name("B", B);
        }
        if (o.tangent) {
            var T = on(o.t), along = [-Math.sin(o.t * rad), Math.cos(o.t * rad)];
            out.lines.push(line([offset(T, along, -r * 0.9), offset(T, along, r * 0.9)], "main"));
            out.lines.push(line([O, T], "main"));
            out.lines.push(rightAngle(T, unit(sub(O, T)), along, markR * 0.6));
            name("T", T);
        }
        if (o.external) {
            var Q = [O[0] + o.qDistance * r * Math.cos(o.q * rad), O[1] + o.qDistance * r * Math.sin(o.q * rad)];
            var alpha = Math.acos(1 / o.qDistance) / rad;
            var C = on(o.q + alpha), D = on(o.q - alpha);
            out.lines.push(line([C, Q, D], "main"));
            out.lines.push(line([O, C], "guide"));
            out.lines.push(line([O, D], "guide"));
            out.lines.push(line([O, Q], "guide"));
            out.lines.push(rightAngle(C, unit(sub(O, C)), unit(sub(Q, C)), markR * 0.6));
            out.lines.push(rightAngle(D, unit(sub(O, D)), unit(sub(Q, D)), markR * 0.6));
            name("Q", Q);
            name("C", C);
            name("D", D);
        }
        if (o.center) {
            out.dots.push(O);
            // 중심각·반지름·부채꼴이 있으면 그 반대쪽, 없으면 아래
            var away = (o.centralMark || o.radii || o.sector) && sweep > 0 ? unitAt(o.a * rad + sweep / 2 + Math.PI) : [0, -1];
            if (o.names) out.texts.push({ text: "O", at: O, dir: away, clear: DOT_RADIUS_MM * 2.834645669 });
        }
        return out;
    }

    // V에서 두 점 쪽 선분 사이의 작은 각: 시작 방향과 반시계 크기(라디안)
    function smallAngle(V, A, B) {
        var start = angleOf(sub(A, V)), sweep = angleOf(sub(B, V)) - start;
        while (sweep < 0) sweep += Math.PI * 2;
        if (sweep > Math.PI) {
            start = angleOf(sub(B, V));
            sweep = Math.PI * 2 - sweep;
        }
        return { start: start, sweep: sweep };
    }

    function rightAngle(V, d1, d2, size) {
        var p1 = offset(V, d1, size);
        return line([p1, offset(p1, d2, size), offset(V, d2, size)], "mark");
    }

    // 60°, 47.5° (소수 한 자리까지, .0은 뺀다)
    function formatDegrees(value) {
        var rounded = Math.round(value * 10) / 10;
        return (rounded === Math.round(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1)) + "°";
    }

    // 3차 베지어 원호 (90°씩 나눈다)
    function arcPoints(c, radiusValue, start, sweep) {
        var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
        var step = sweep / pieces;
        var handle = 4 / 3 * Math.tan(step / 4) * radiusValue;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var angle = start + step * i;
            var cos = Math.cos(angle), sin = Math.sin(angle);
            var a = [c[0] + radiusValue * cos, c[1] + radiusValue * sin];
            var tangent = [-sin * handle, cos * handle];
            points.push({
                anchor: a,
                left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
            });
        }
        return points;
    }

    function line(anchors, kind) {
        var points = [];
        for (var i = 0; i < anchors.length; i++) points.push(plain(anchors[i]));
        return { points: points, kind: kind };
    }

    function plain(p) { return { anchor: p, left: p, right: p }; }
    function unitAt(angle) { return [Math.cos(angle), Math.sin(angle)]; }
    function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
    function angleOf(v) { return Math.atan2(v[1], v[0]); }
    function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
    function unit(v) {
        var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        return length > 0 ? [v[0] / length, v[1] / length] : [0, -1];
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

    function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (" + unitText + "):").preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
    }

    function setRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindValueRow(controls, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setRowValue(controls, value);
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? controls.slider.value : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            setRowValue(controls, value);
            if (delta === 0 || previewGroup === null) return;
            previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var flags = "";
        for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
        var angles = [];
        for (var j = 0; j < ANGLE_KEYS.length; j++) angles.push(opt[ANGLE_KEYS[j]]);
        var parts = ["v1", flags, angles.join(","), opt.qDistance, opt.markMm, normalizeStroke ? "1" : "0", fontPt,
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 10 || p[1].length !== FLAG_KEYS.length) return;
        var angles = p[2].split(",");
        if (angles.length !== ANGLE_KEYS.length) return;
        for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
        for (var j = 0; j < ANGLE_KEYS.length; j++) opt[ANGLE_KEYS[j]] = Math.round(restoreNumber(angles[j], opt[ANGLE_KEYS[j]], 0, 359));
        opt.qDistance = restoreNumber(p[3], opt.qDistance, 1.2, 4);
        opt.markMm = restoreNumber(p[4], opt.markMm, 1, 10);
        normalizeStroke = p[5] === "1";
        fontPt = restoreNumber(p[6], fontPt, 5, 14);
        offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        previewEnabled = p[9] === "1";
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }
})();
