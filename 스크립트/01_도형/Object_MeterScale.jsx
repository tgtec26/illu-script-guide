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

// 검류계·전류계·전압계의 눈금만 만든다. 선택한 사각형은 배치 기준이며 확인할 때 눈금으로 바뀐다.
// 선택이 없으면 마지막에 쓴 크기(없으면 기본 크기)로 대지 가운데에 그린다.
(function() {
    var MM_TO_PT = 2.834645669;
    var PREF_KEY = "Object_MeterScale/settings";
    var FRAME_KEY = PREF_KEY + "/frame";
    var DEFAULT_FRAME_MM = {w: 60, h: 35};
    var NAMES = ["검류계", "전류계", "전압계"];
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }
    var doc = app.activeDocument;
    var selected = doc.selection;
    var source = null;
    var originalHidden = false;
    var centerX = 0;
    var centerY = 0;
    var frameWidth = 0;
    var frameHeight = 0;
    if (selected && selected.length > 0) {
        if (selected.length !== 1 || !isRectangle(selected[0])) {
            alert("가로·세로 방향의 사각형 패스 하나를 선택해주세요."); return;
        }
        source = selected[0];
        var bounds = source.geometricBounds;
        centerX = (bounds[0] + bounds[2]) / 2;
        centerY = (bounds[1] + bounds[3]) / 2;
        originalHidden = source.hidden;
        frameWidth = clamp((bounds[2] - bounds[0]) / MM_TO_PT, 5, 500);
        frameHeight = clamp((bounds[1] - bounds[3]) / MM_TO_PT, 3, 300);
    } else {
        // 선택이 없으면 기억한 틀 크기로 대지 가운데에 그린다
        var frame = loadFrame(DEFAULT_FRAME_MM.w, DEFAULT_FRAME_MM.h);
        var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        centerX = (artboardRect[0] + artboardRect[2]) / 2;
        centerY = (artboardRect[1] + artboardRect[3]) / 2;
        frameWidth = clamp(frame.w, 5, 500);
        frameHeight = clamp(frame.h, 3, 300);
    }
    var settings = {
        kind: 0, width: frameWidth,
        height: frameHeight,
        curvature: 65, maximum: 30, divisions: 6, subdivisions: 10,
        tickLength: 2, stroke: 0.3, numbers: true, fontSize: 8, numberGap: 0.5, tiltNumbers: true,
        x: 0, y: 0, preview: true
    };
    var FIELDS = ["kind", "width", "height", "curvature", "maximum", "divisions", "subdivisions",
        "tickLength", "stroke", "numbers", "fontSize", "numberGap", "tiltNumbers", "x", "y", "preview"];
    var RANGES = {
        kind: [0, 2, true], width: [5, 500], height: [3, 300], curvature: [0, 100],
        maximum: [0.01, 10000], divisions: [2, 20, true], subdivisions: [1, 20, true],
        tickLength: [0.2, 20], stroke: [0.1, 5], fontSize: [3, 72], numberGap: [0, 20], x: [-500, 500], y: [-500, 500]
    };
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var defaultKey in settings) DEFAULTS[defaultKey] = settings[defaultKey];
    loadSettings();
    var previewGroup = null;
    var committed = false;
    var rows = {};
    var black = new GrayColor(); black.gray = 100;
    var font = null;
    var minusFont = null;
    try { font = app.textFonts.getByName("GSMediumB1"); }
    catch (fontError) { alert("GSMediumB1 서체를 설치한 뒤 실행해주세요."); return; }

    var win = new Window("dialog", "계기 눈금 — 검류계 · 전류계 · 전압계");
    win.orientation = "column";
    win.alignChildren = "fill";
    var typeRow = win.add("group");
    typeRow.add("statictext", undefined, "종류:");
    var kindList = typeRow.add("dropdownlist", undefined, NAMES);
    kindList.selection = settings.kind;
    kindList.helpTip = "검류계는 −최대값~최대값, 전류계·전압계는 0~최대값. 종류를 바꾸면 기본 눈금 범위를 적용합니다.";
    var shapePanel = panel("크기와 곡률");
    numberRow(shapePanel, "너비 (mm):", "width", 0.5);
    numberRow(shapePanel, "높이 (mm):", "height", 0.5);
    numberRow(shapePanel, "곡률 (%):", "curvature", 1);
    rows.curvature.input.helpTip = "0은 일자 눈금, 값이 클수록 위로 볼록한 눈금입니다.";
    var scalePanel = panel("눈금");
    numberRow(scalePanel, "최대값:", "maximum", 0.01);
    numberRow(scalePanel, "큰눈금 구간 (개):", "divisions", 1);
    numberRow(scalePanel, "구간별 분할 (개):", "subdivisions", 1);
    rows.divisions.input.helpTip = "검류계는 가운데 0이 오도록 짝수 구간만 사용합니다.";
    numberRow(scalePanel, "긴 눈금 길이 (mm):", "tickLength", 0.1);
    numberRow(scalePanel, "선 두께 (pt):", "stroke", 0.1);
    var textPanel = panel("숫자");
    var textOptions = textPanel.add("group");
    var numberCheck = textOptions.add("checkbox", undefined, "숫자 표시");
    numberCheck.value = settings.numbers;
    var tiltCheck = textOptions.add("checkbox", undefined, "곡선에 맞춰 기울이기");
    tiltCheck.value = settings.tiltNumbers;
    numberRow(textPanel, "숫자 크기 (pt):", "fontSize", 0.5);
    numberRow(textPanel, "숫자 간격 (mm):", "numberGap", 0.1);
    rows.numberGap.input.helpTip = "긴 눈금 끝과 숫자 사이의 간격입니다.";
    var positionPanel = panel("위치");
    numberRow(positionPanel, "가로 (mm):", "x", 0.1);
    numberRow(positionPanel, "세로 (mm):", "y", 0.1);
    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = settings.preview;
    var spacer = footer.add("group"); spacer.alignment = ["fill", "center"];
    var ok = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", {name: "cancel"});
    win.defaultElement = null;

    kindList.onChange = function() {
        settings.kind = kindList.selection.index;
        settings.maximum = settings.kind === 0 ? 30 : (settings.kind === 1 ? 3 : 15);
        settings.divisions = settings.kind === 0 ? 6 : 3;
        setRow("maximum"); setRow("divisions"); updatePreview();
    };
    numberCheck.onClick = function() {
        settings.numbers = numberCheck.value; syncTextControls(); updatePreview();
    };
    tiltCheck.onClick = function() { settings.tiltNumbers = tiltCheck.value; updatePreview(); };
    previewCheck.onClick = function() { settings.preview = previewCheck.value; updatePreview(); };
    ok.onClick = function() {
        if (!previewGroup && !buildPreview()) return;
        if (source) {
            try { source.remove(); } catch (removeError) { alert("원본 사각형을 제거할 수 없습니다."); return; }
        }
        committed = true;
        saveSettings();
        if (source) saveFrame(frameWidth, frameHeight);
        doc.selection = null; previewGroup.selected = true;
        win.close(1);
    };
    win.onClose = function() {
        if (!committed) { clearPreview(); if (source) source.hidden = originalHidden; app.redraw(); }
    };
    syncTextControls();
    updatePreview();
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    try { win.show(); }
    finally { if (!committed) { clearPreview(); if (source) source.hidden = originalHidden; } }

    function panel(title) {
        var p = win.add("panel", undefined, title);
        p.orientation = "column"; p.alignChildren = "fill";
        return p;
    }
    function numberRow(parent, label, key, step) {
        var range = RANGES[key];
        var row = parent.add("group"); row.alignChildren = ["left", "center"];
        var caption = row.add("statictext", undefined, label); caption.preferredSize.width = 145;
        var input = row.add("edittext", undefined, String(settings[key])); input.characters = 6;
        var bar = row.add("scrollbar", undefined, settings[key], range[0], range[1]);
        bar.preferredSize.width = 196; bar.stepdelta = step; bar.jumpdelta = step * 10;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = 34;
        reset.helpTip = "처음 값으로 되돌리기";
        rows[key] = {input: input, bar: bar, reset: reset};
        function apply(value, typing) {
            var n = Number(String(value).replace(",", "."));
            if (!isFinite(n) || String(value).replace(/\s/g, "") === "") { if (!typing) setRow(key); return; }
            if (typing && (n < range[0] || n > range[1])) return;
            n = clamp(n, range[0], range[1]);
            n = range[2] ? Math.round(n) : Math.round(n * 100) / 100;
            if (key === "divisions" && settings.kind === 0) n = Math.min(20, Math.round(n / 2) * 2);
            var old = settings[key]; settings[key] = n;
            if (typing) bar.value = n; else setRow(key);
            if (n === old) return;
            if (key === "x" || key === "y") {
                if (previewGroup) previewGroup.translate(key === "x" ? (n - old) * MM_TO_PT : 0,
                    key === "y" ? -(n - old) * MM_TO_PT : 0);
                app.redraw();
            } else updatePreview();
        }
        input.onChange = function() { apply(input.text); };
        input.onChanging = function() { apply(input.text, true); };
        bar.onChanging = function() { apply(bar.value); };
        bar.onChange = bar.onChanging;
        reset.onClick = function() { apply(DEFAULTS[key]); };
    }
    function setRow(key) { rows[key].input.text = String(settings[key]); rows[key].bar.value = settings[key]; }
    function syncTextControls() {
        tiltCheck.enabled = settings.numbers;
        rows.fontSize.input.enabled = rows.fontSize.bar.enabled = rows.fontSize.reset.enabled = settings.numbers;
        rows.numberGap.input.enabled = rows.numberGap.bar.enabled = rows.numberGap.reset.enabled = settings.numbers;
    }
    function updatePreview() {
        clearPreview();
        if (source) source.hidden = originalHidden;
        if (settings.preview) buildPreview();
        app.redraw();
    }
    function clearPreview() {
        if (previewGroup) { try { previewGroup.remove(); } catch (e) {} }
        previewGroup = null;
    }
    function buildPreview() {
        var group = null;
        try {
            group = (source ? source.layer : doc.activeLayer).groupItems.add();
            if (source) group.move(source, ElementPlacement.PLACEBEFORE);
            group.name = "MeterScale_" + NAMES[settings.kind];
            var geometry = buildScaleGeometry(settings);
            drawCurve(group, geometry.arc);
            for (var i = 0; i < geometry.ticks.length; i++) drawLine(group, geometry.ticks[i]);
            for (var j = 0; j < geometry.labels.length; j++) drawNumber(group, geometry.labels[j]);
            group.translate(centerX + settings.x * MM_TO_PT, centerY - settings.y * MM_TO_PT);
            previewGroup = group;
            if (source) source.hidden = true;
            return true;
        } catch (error) {
            if (group) { try { group.remove(); } catch (cleanupError) {} }
            if (source) source.hidden = originalHidden;
            alert("눈금을 만들지 못했습니다.\n" + error);
            return false;
        }
    }
    function strokePath(path) {
        path.filled = false; path.stroked = true; path.strokeColor = black;
        path.strokeWidth = settings.stroke; path.strokeDashes = [];
        path.strokeCap = StrokeCap.BUTTENDCAP;
    }
    function drawLine(group, points) {
        var path = group.pathItems.add(); path.setEntirePath(points); path.closed = false; strokePath(path);
    }
    function drawCurve(group, nodes) {
        var path = group.pathItems.add();
        var anchors = [];
        for (var i = 0; i < nodes.length; i++) anchors.push(nodes[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].right) path.pathPoints[j].rightDirection = nodes[j].right;
            if (nodes[j].left) path.pathPoints[j].leftDirection = nodes[j].left;
        }
        path.closed = false; strokePath(path);
    }
    function drawNumber(group, label) {
        var negative = label.text.charAt(0) === "-";
        var text = group.textFrames.add(); text.contents = negative ? label.text.substring(1) : label.text;
        var attr = text.textRange.characterAttributes;
        attr.size = settings.fontSize; attr.fillColor = black; attr.strokeColor = new NoColor();
        attr.textFont = font;
        var sign = null;
        var signDelta = null;
        if (negative) {
            if (!minusFont) {
                try { minusFont = app.textFonts.getByName("Batang"); }
                catch (fontError) { throw new Error("음수 기호에 사용할 바탕체(Batang)를 설치해주세요."); }
            }
            // 숫자 프레임으로 정렬하고 부호는 같은 기준선의 왼쪽에 붙인다.
            sign = group.textFrames.add(); sign.contents = "-";
            var signAttr = sign.textRange.characterAttributes;
            signAttr.size = settings.fontSize; signAttr.fillColor = black;
            signAttr.strokeColor = new NoColor(); signAttr.textFont = minusFont;
            sign.position = [text.position[0], text.position[1]];
            var numberBounds = text.geometricBounds;
            var signBounds = sign.geometricBounds;
            var signCenterY = (signBounds[1] + signBounds[3]) / 2;
            signDelta = [numberBounds[0] - (signBounds[2] - signBounds[0]) / 2 -
                (numberBounds[0] + numberBounds[2]) / 2,
                signCenterY - (numberBounds[1] + numberBounds[3]) / 2];
        }
        var initialBounds = text.geometricBounds;
        var halfHeight = (initialBounds[1] - initialBounds[3]) / 2;
        var halfWidth = (initialBounds[2] - initialBounds[0]) / 2;
        var extent = settings.tiltNumbers ? halfHeight : Math.abs(label.normal[0]) * halfWidth + label.normal[1] * halfHeight;
        if (settings.tiltNumbers) text.rotate(label.angle);
        var b = text.geometricBounds;
        text.translate(label.point[0] + label.normal[0] * extent - (b[0] + b[2]) / 2,
            label.point[1] + label.normal[1] * extent - (b[1] + b[3]) / 2);
        if (sign) {
            var angle = settings.tiltNumbers ? label.angle * Math.PI / 180 : 0;
            if (settings.tiltNumbers) sign.rotate(label.angle);
            var sb = sign.geometricBounds;
            var dx = signDelta[0] * Math.cos(angle) - signDelta[1] * Math.sin(angle);
            var dy = signDelta[0] * Math.sin(angle) + signDelta[1] * Math.cos(angle);
            sign.translate(label.point[0] + label.normal[0] * extent + dx - (sb[0] + sb[2]) / 2,
                label.point[1] + label.normal[1] * extent + dy - (sb[1] + sb[3]) / 2);
        }
    }
    // 중심 위치는 그린 뒤 이동한다. 곡률 0은 직선, 100은 사용할 수 있는 높이까지 휜다.
    function buildScaleGeometry(s) {
        var w = s.width * MM_TO_PT, h = s.height * MM_TO_PT;
        var length = s.tickLength * MM_TO_PT;
        var gap = Math.max(1, s.stroke * 2);
        var textSize = s.numbers ? s.fontSize : 0;
        var padX = Math.min(w * 0.25, length + textSize);
        var padY = Math.min(h * 0.4, length + textSize + gap);
        var halfW = (w - 2 * padX) / 2;
        var rise = (h - 2 * padY) * s.curvature / 100;
        var beta = s.curvature * 0.8 * Math.PI / 180;
        var rx = beta > 0 ? halfW / Math.sin(beta) : 0;
        var ry = beta > 0 ? rise / (1 - Math.cos(beta)) : 0;
        function pointAt(t) {
            if (beta === 0) return [halfW * t, 0];
            return [rx * Math.sin(beta * t), -rise / 2 + ry * (Math.cos(beta * t) - Math.cos(beta))];
        }
        var arc = [{anchor: pointAt(-1)}, {anchor: pointAt(0)}, {anchor: pointAt(1)}];
        if (beta > 0) {
            var k = 4 * Math.tan(beta / 4) / 3;
            for (var segment = 0; segment < 2; segment++) {
                var a = (segment - 1) * beta, b = segment * beta;
                var start = arc[segment].anchor, end = arc[segment + 1].anchor;
                arc[segment].right = [start[0] + k * rx * Math.cos(a), start[1] - k * ry * Math.sin(a)];
                arc[segment + 1].left = [end[0] - k * rx * Math.cos(b), end[1] + k * ry * Math.sin(b)];
            }
        }
        var ticks = [], labels = [], total = s.divisions * s.subdivisions;
        for (var i = 0; i <= total; i++) {
            var u = 2 * i / total - 1;
            var p = pointAt(u);
            var nx = beta > 0 ? ry * Math.sin(beta * u) : 0;
            var ny = beta > 0 ? rx * Math.cos(beta * u) : 1;
            var norm = Math.sqrt(nx * nx + ny * ny); nx /= norm; ny /= norm;
            var major = i % s.subdivisions === 0;
            var middle = !major && s.subdivisions % 2 === 0 && i % s.subdivisions === s.subdivisions / 2;
            var tick = length * (major ? 1 : (middle ? 0.72 : 0.45));
            ticks.push([p, [p[0] + nx * tick, p[1] + ny * tick]]);
            if (major && s.numbers) {
                var value = s.kind === 0 ? -s.maximum + 2 * s.maximum * i / total : s.maximum * i / total;
                var offset = length + s.numberGap * MM_TO_PT;
                labels.push({text: formatValue(value), point: [p[0] + nx * offset, p[1] + ny * offset],
                    normal: [nx, ny],
                    angle: -Math.atan2(nx, ny) * 180 / Math.PI});
            }
        }
        return {arc: arc, ticks: ticks, labels: labels};
    }
    function formatValue(value) {
        var rounded = Math.round(value * 10000) / 10000;
        return String(rounded === 0 ? 0 : rounded);
    }
    function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
    function isRectangle(item) {
        if (item.typename !== "PathItem" || !item.closed || item.pathPoints.length !== 4) return false;
        var pts = item.pathPoints;
        for (var i = 0; i < 4; i++) {
            var p = pts[i], a = p.anchor, b = pts[(i + 1) % 4].anchor;
            if (Math.abs(a[0] - p.leftDirection[0]) > 0.01 || Math.abs(a[1] - p.leftDirection[1]) > 0.01 ||
                Math.abs(a[0] - p.rightDirection[0]) > 0.01 || Math.abs(a[1] - p.rightDirection[1]) > 0.01) return false;
            var dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]);
            if (!((dx > 0.01 && dy < 0.01) || (dy > 0.01 && dx < 0.01))) return false;
            var c = pts[(i + 2) % 4].anchor;
            if ((dx > dy) === (Math.abs(b[0] - c[0]) > Math.abs(b[1] - c[1]))) return false;
        }
        return true;
    }
    // 선택한 사각형의 크기는 설정 문자열과 따로 기억한다(설정 형식을 건드리지 않는다)
    function loadFrame(fallbackW, fallbackH) {
        try {
            var p = app.preferences.getStringPreference(FRAME_KEY).split("|");
            if (p.length === 3 && p[0] === "v1") {
                var w = parseFloat(p[1]), h = parseFloat(p[2]);
                if (w > 0.1 && h > 0.1 && w <= 2000 && h <= 2000) return {w: w, h: h};
            }
        } catch (e) {}
        return {w: fallbackW, h: fallbackH};
    }
    function saveFrame(w, h) {
        try { app.preferences.setStringPreference(FRAME_KEY, ["v1", w.toFixed(2), h.toFixed(2)].join("|")); } catch (e) {}
    }
    function loadSettings() {
        try {
            var parts = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (parts[0] !== "v2" || parts.length !== FIELDS.length + 1) return;
            for (var i = 0; i < FIELDS.length; i++) {
                var key = FIELDS[i], raw = parts[i + 1], range = RANGES[key];
                if (!range) {
                    if (raw === "0" || raw === "1") settings[key] = raw === "1";
                } else {
                    var n = Number(raw);
                    if (raw !== "" && isFinite(n) && n >= range[0] && n <= range[1] && (!range[2] || n === Math.round(n))) settings[key] = n;
                }
            }
            if (settings.kind === 0 && settings.divisions % 2 !== 0) settings.divisions = 6;
        } catch (e) {}
    }
    function saveSettings() {
        try {
            var parts = ["v2"];
            for (var i = 0; i < FIELDS.length; i++) {
                var value = settings[FIELDS[i]];
                parts.push(typeof value === "boolean" ? (value ? "1" : "0") : value);
            }
            app.preferences.setStringPreference(PREF_KEY, parts.join("|"));
        } catch (e) {}
    }
})();
