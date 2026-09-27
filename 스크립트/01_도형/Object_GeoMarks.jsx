// Object_GeoMarks.jsx
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

// 도형 표기: 선택한 다각형(직선 패스 하나)에 수학 교재식 표기를 붙인다.
// 꼭짓점 이름(A, B, C…: 맨 위 꼭짓점부터 반시계 방향), 각마다 호(1~3겹)·직각 표시와 글자(60°, x 등),
// 변마다 같은 길이 눈금(1~3개)·평행 표시(>, >>)와 글자(6 cm 등).
// 선 두께는 평가원 수능 그림 측정값(보조선 약 0.36pt)과 과학 스크립트 기준(보조선 0.3pt)에 맞춰 0.3pt가 기본이다.
// 도형 선은 기본으로 0.8pt(평가원 메인 선 측정값 약 0.84pt, 과학 메인 선 0.8pt)로 맞춘다. 끄면 원래 두께 그대로.
// 표기는 도형 바로 위에 그룹으로 만든다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "GeoMarks/settings";
    var MM_TO_PT = 2.834645669;
    var MAX_VERTICES = 8;
    var POSITION_LIMIT_MM = 30;
    var LABEL_WIDTH = 100;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ITALIC_FONT_NAME = "GSMediItaC1";
    var ENG_BASELINE_PT = 0.5;
    var MARK_GAP_MM = 0.7;
    var SHAPE_STROKE_PT = 0.8;   // 겹호·눈금·평행 표시 사이 간격

    var VERTEX_MARKS = ["없음", "호", "호 2겹", "호 3겹", "직각"];
    var SIDE_MARKS = ["없음", "눈금 1", "눈금 2", "눈금 3", "평행 >", "평행 >>"];

    var doc = app.activeDocument;

    var target = null;
    var sel = doc.selection;
    if (sel && sel.length === 1 && sel[0].typename === "PathItem") target = sel[0];
    if (target === null) {
        alert("직선으로 된 도형(패스) 하나를 선택해주세요.");
        return;
    }

    var closed = target.closed;
    var rawPoints = [];
    for (var p = 0; p < target.pathPoints.length; p++) {
        var anchor = target.pathPoints[p].anchor;
        rawPoints.push([anchor[0], anchor[1]]);
    }
    rawPoints = dedupePoints(rawPoints, closed);
    if (rawPoints.length < (closed ? 3 : 2) || rawPoints.length > MAX_VERTICES) {
        alert("꼭짓점이 " + (closed ? 3 : 2) + "~" + MAX_VERTICES + "개인 패스를 선택해주세요.");
        return;
    }
    var vertexCount = rawPoints.length;
    var sideCount = closed ? vertexCount : vertexCount - 1;

    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var showNames = true;
    var startLetter = "A";
    var clockwise = false;
    var fontPt = 8;
    var labelGapMm = 1.2;
    var arcRadiusMm = 3;
    var tickMm = 1.6;
    var strokePt = 0.3;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var normalizeStroke = true;
    var vertexMarks = [], vertexTexts = [], sideMarks = [], sideTexts = [];
    for (var v = 0; v < vertexCount; v++) {
        vertexMarks.push(0);
        vertexTexts.push("");
        sideMarks.push(0);
        sideTexts.push("");
    }
    applySettings();

    var previewGroup = null;
    var originalStroked = target.stroked;
    var originalStrokeWidth = target.strokeWidth;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "도형 표기");
    win.alignChildren = "fill";

    var namePanel = addPanel(win, "꼭짓점 이름");
    var nameRow = namePanel.add("group");
    var showNamesCheck = nameRow.add("checkbox", undefined, "표시");
    nameRow.add("statictext", undefined, "시작 글자:");
    var startInput = nameRow.add("edittext", undefined, startLetter);
    startInput.characters = 3;
    var clockwiseCheck = nameRow.add("checkbox", undefined, "시계 방향");
    clockwiseCheck.helpTip = "맨 위 꼭짓점부터 이름을 붙인다. 기본은 반시계 방향(A 위, B 왼쪽 아래, C 오른쪽 아래)";

    var markPanel = addPanel(win, "각 · 변 표기");
    markPanel.add("statictext", undefined, "각: 표시 / 글자 (60°, x)      변: 표시 / 글자 (6 cm)");
    var markRows = [];
    for (var r = 0; r < vertexCount; r++) markRows.push(addMarkRow(markPanel, r));

    var sizePanel = addPanel(win, "크기");
    var normalizeCheck = sizePanel.add("checkbox", undefined, "도형 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
    normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
    var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
    var gapControls = addValueRow(sizePanel, "글자 간격", "mm", labelGapMm, 0, 5, 0.1, 1);
    var arcControls = addValueRow(sizePanel, "호 반지름", "mm", arcRadiusMm, 1, 10, 0.1, 1);
    var tickControls = addValueRow(sizePanel, "눈금 길이", "mm", tickMm, 0.5, 5, 0.1, 1);
    var strokeControls = addValueRow(sizePanel, "선 두께", "pt", strokePt, 0.1, 1, 0.05, 2);

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

    showNamesCheck.value = showNames;
    clockwiseCheck.value = clockwise;
    previewCheck.value = previewEnabled;
    normalizeCheck.value = normalizeStroke;
    refreshRowCaptions();

    showNamesCheck.onClick = function() { showNames = showNamesCheck.value; updatePreview(); };
    clockwiseCheck.onClick = function() { clockwise = clockwiseCheck.value; updatePreview(); };
    startInput.onChanging = function() {
        var text = String(startInput.text).replace(/\s/g, "");
        if (text.length === 0) return;
        startLetter = text.charAt(0);
        refreshRowCaptions();
        updatePreview();
    };
    normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };

    bindValueRow(fontControls, function(value) { fontPt = value; });
    bindValueRow(gapControls, function(value) { labelGapMm = value; });
    bindValueRow(arcControls, function(value) { arcRadiusMm = value; });
    bindValueRow(tickControls, function(value) { tickMm = value; });
    bindValueRow(strokeControls, function(value) { strokePt = value; });
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
        var order = orderVertices(rawPoints, closed, clockwise);
        var marks = buildMarks(order, closed, {
            names: showNames ? vertexNames(startLetter, vertexCount) : null,
            vertexMarks: vertexMarks, vertexTexts: vertexTexts,
            sideMarks: sideMarks, sideTexts: sideTexts,
            arcRadius: arcRadiusMm * MM_TO_PT, gap: MARK_GAP_MM * MM_TO_PT,
            tick: tickMm * MM_TO_PT, labelGap: labelGapMm * MM_TO_PT
        });

        previewGroup = target.parent.groupItems.add();
        previewGroup.move(target, ElementPlacement.PLACEBEFORE);
        previewGroup.name = "도형 표기";
        for (var i = 0; i < marks.paths.length; i++) drawMarkPath(marks.paths[i]);
        for (var j = 0; j < marks.texts.length; j++) drawLabel(marks.texts[j]);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
    }

    function drawMarkPath(mark) {
        var path = previewGroup.pathItems.add();
        var anchors = [];
        for (var i = 0; i < mark.points.length; i++) anchors.push(mark.points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < mark.points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = mark.points[j].left;
            point.rightDirection = mark.points[j].right;
        }
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = strokePt;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
    }

    // at에서 dir 방향으로 gap만큼 떨어진 곳에 글자의 가까운 가장자리가 오게 둔다
    function drawLabel(label) {
        var frame = previewGroup.textFrames.add();
        frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame, label.upright);
        var b = frame.geometricBounds;
        var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
        var reach = label.gap + halfW * Math.abs(label.dir[0]) + halfH * Math.abs(label.dir[1]);
        var x = label.at[0] + label.dir[0] * reach;
        var y = label.at[1] + label.dir[1] * reach;
        // 좁은 각: 글자를 감싸는 원이 두 변에 닿지 않을 만큼 꼭짓점에서 멀리
        if (label.vertex && label.halfAngle > 0 && label.halfAngle < Math.PI / 2) {
            var fit = Math.sqrt(halfW * halfW + halfH * halfH) / Math.sin(label.halfAngle);
            var current = Math.sqrt(Math.pow(x - label.vertex[0], 2) + Math.pow(y - label.vertex[1], 2));
            if (fit > current) {
                x = label.vertex[0] + label.dir[0] * fit;
                y = label.vertex[1] + label.dir[1] * fit;
            }
        }
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt).
    // 따로 떨어진 소문자 한 글자(x, a)는 변수라 GSMediItaC1. 꼭짓점 이름(upright)은 기울이지 않는다
    function applyTextFonts(frame, upright) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var character = frame.textRange.characters[i];
            var attributes = character.characterAttributes;
            if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else if (!upright && isVariableLetter(text, i)) {
                attributes.textFont = italicFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    function isVariableLetter(text, i) {
        return /[a-z]/.test(text.charAt(i)) && !/[A-Za-z]/.test(text.charAt(i - 1)) && !/[A-Za-z]/.test(text.charAt(i + 1));
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
    // 기하 (일러 DOM을 쓰지 않는다 → tests/check-geo-marks.js)
    // -------------------------------------------------------
    // 겹친 점(닫힌 패스의 끝=처음 포함)을 지운다
    function dedupePoints(points, isClosed) {
        var out = [];
        for (var i = 0; i < points.length; i++) {
            var last = out[out.length - 1];
            if (last && Math.abs(last[0] - points[i][0]) < 0.01 && Math.abs(last[1] - points[i][1]) < 0.01) continue;
            out.push(points[i]);
        }
        if (isClosed && out.length > 1) {
            var first = out[0], end = out[out.length - 1];
            if (Math.abs(first[0] - end[0]) < 0.01 && Math.abs(first[1] - end[1]) < 0.01) out.pop();
        }
        return out;
    }

    // 닫힌 도형: 맨 위(같으면 왼쪽) 꼭짓점부터 반시계(y 위쪽 좌표) 순서. 열린 패스: 패스 순서 그대로
    function orderVertices(points, isClosed, isClockwise) {
        var list = points.slice();
        if (isClosed) {
            if (signedArea(list) < 0) list.reverse();
            var top = 0;
            for (var i = 1; i < list.length; i++) {
                if (list[i][1] > list[top][1] + 0.5 || (Math.abs(list[i][1] - list[top][1]) <= 0.5 && list[i][0] < list[top][0])) top = i;
            }
            list = list.slice(top).concat(list.slice(0, top));
            if (isClockwise) list = [list[0]].concat(list.slice(1).reverse());
        } else if (isClockwise) {
            list.reverse();
        }
        return list;
    }

    function signedArea(points) {
        var sum = 0;
        for (var i = 0; i < points.length; i++) {
            var a = points[i], b = points[(i + 1) % points.length];
            sum += a[0] * b[1] - b[0] * a[1];
        }
        return sum / 2;
    }

    function vertexNames(first, count) {
        var names = [];
        for (var i = 0; i < count; i++) names.push(String.fromCharCode(first.charCodeAt(0) + i));
        return names;
    }

    // 표기를 경로(점마다 anchor·left·right)와 글자(at에서 dir 쪽으로 gap)로 만든다
    function buildMarks(points, isClosed, opt) {
        var n = points.length;
        var sides = isClosed ? n : n - 1;
        var turn = signedArea(points) < 0 ? -1 : 1;
        var paths = [], texts = [];

        for (var i = 0; i < n; i++) {
            var vertex = points[i];
            var hasPrev = isClosed || i > 0, hasNext = isClosed || i < n - 1;
            var prev = hasPrev ? points[(i - 1 + n) % n] : null;
            var next = hasNext ? points[(i + 1) % n] : null;

            var outward;
            if (prev && next) {
                var span = angleSpan(vertex, prev, next, turn, isClosed);
                var mid = span.start + span.sweep / 2;
                var inward = [Math.cos(mid), Math.sin(mid)];
                outward = [-inward[0], -inward[1]];
                var mark = opt.vertexMarks[i] || 0;
                var reach = opt.arcRadius;
                if (mark >= 1 && mark <= 3) {
                    for (var k = 0; k < mark; k++) paths.push(arcPath(vertex, opt.arcRadius + k * opt.gap, span.start, span.sweep));
                    reach = opt.arcRadius + (mark - 1) * opt.gap;
                } else if (mark === 4) {
                    paths.push(rightAnglePath(vertex, span.start, opt.arcRadius * 0.7));
                    reach = opt.arcRadius * 0.7 * Math.SQRT2;
                }
                if (opt.vertexTexts[i]) texts.push({ text: opt.vertexTexts[i], at: offsetPoint(vertex, inward, reach), dir: inward, gap: opt.labelGap, vertex: vertex, halfAngle: span.sweep / 2 });
            } else {
                // 열린 패스의 끝점: 이웃에서 멀어지는 쪽
                outward = unit(sub(vertex, prev || next));
            }
            if (opt.names) texts.push({ text: opt.names[i], at: vertex, dir: outward, gap: opt.labelGap, upright: true });
        }

        for (var s = 0; s < sides; s++) {
            var a = points[s], b = points[(s + 1) % n];
            var along = unit(sub(b, a));
            var normal = [along[1] * turn, -along[0] * turn];   // 도형 바깥쪽
            var middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            var sideMark = opt.sideMarks[s] || 0;
            var count = sideMark <= 3 ? sideMark : sideMark - 3;
            for (var c = 0; c < count; c++) {
                var center = offsetPoint(middle, along, (c - (count - 1) / 2) * opt.gap);
                if (sideMark <= 3) {
                    paths.push(linePath([offsetPoint(center, normal, -opt.tick / 2), offsetPoint(center, normal, opt.tick / 2)]));
                } else {
                    // 평행 표시는 어느 변이든 오른쪽(세로 변은 위쪽)을 가리켜야 서로 평행으로 읽힌다
                    var pointing = (along[0] < -1e-6 || (Math.abs(along[0]) <= 1e-6 && along[1] < 0)) ? [-along[0], -along[1]] : along;
                    var tip = offsetPoint(center, pointing, opt.tick * 0.3);
                    var back = offsetPoint(tip, pointing, -opt.tick * 0.6);
                    paths.push(linePath([offsetPoint(back, normal, opt.tick * 0.45), tip, offsetPoint(back, normal, -opt.tick * 0.45)]));
                }
            }
            var clear = sideMark >= 1 && sideMark <= 3 ? opt.tick / 2 : (sideMark > 3 ? opt.tick * 0.45 : 0);
            if (opt.sideTexts[s]) texts.push({ text: opt.sideTexts[s], at: offsetPoint(middle, normal, clear), dir: normal, gap: opt.labelGap });
        }
        return { paths: paths, texts: texts };
    }

    // 꼭짓점 안쪽 각: start에서 반시계로 sweep(라디안). 열린 패스는 작은 쪽 각
    function angleSpan(vertex, prev, next, turn, isClosed) {
        var toPrev = Math.atan2(prev[1] - vertex[1], prev[0] - vertex[0]);
        var toNext = Math.atan2(next[1] - vertex[1], next[0] - vertex[0]);
        var start = turn > 0 ? toNext : toPrev;
        var end = turn > 0 ? toPrev : toNext;
        var sweep = end - start;
        while (sweep < 0) sweep += Math.PI * 2;
        while (sweep >= Math.PI * 2) sweep -= Math.PI * 2;
        if (!isClosed && sweep > Math.PI) {
            start = end;
            sweep = Math.PI * 2 - sweep;
        }
        return { start: start, sweep: sweep };
    }

    // 90°씩 나눈 3차 베지어 원호
    function arcPath(center, radius, start, sweep) {
        var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
        var step = sweep / pieces;
        var handle = 4 / 3 * Math.tan(step / 4) * radius;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var angle = start + step * i;
            var cos = Math.cos(angle), sin = Math.sin(angle);
            var anchor = [center[0] + radius * cos, center[1] + radius * sin];
            var tangent = [-sin * handle, cos * handle];
            points.push({
                anchor: anchor,
                left: i === 0 ? anchor : [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: i === pieces ? anchor : [anchor[0] + tangent[0], anchor[1] + tangent[1]]
            });
        }
        return { points: points };
    }

    // 직각 표시: 두 변을 따라 size만큼 간 두 점을 잇는 꺾은선
    function rightAnglePath(vertex, start, size) {
        var u = [Math.cos(start), Math.sin(start)];
        var w = [-u[1], u[0]];
        var p1 = offsetPoint(vertex, u, size);
        var p2 = offsetPoint(p1, w, size);
        return linePath([p1, p2, offsetPoint(vertex, w, size)]);
    }

    function linePath(anchors) {
        var points = [];
        for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
        return { points: points };
    }

    function offsetPoint(point, dir, distance) {
        return [point[0] + dir[0] * distance, point[1] + dir[1] * distance];
    }

    function sub(a, b) {
        return [a[0] - b[0], a[1] - b[1]];
    }

    function unit(v) {
        var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
        return [v[0] / length, v[1] / length];
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

    // 한 행에 꼭짓점 하나와 그 꼭짓점에서 나가는 변 하나
    function addMarkRow(parent, index) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var vertexCaption = row.add("statictext", undefined, "∠W");
        vertexCaption.preferredSize.width = 26;
        var vertexList = row.add("dropdownlist", undefined, VERTEX_MARKS);
        vertexList.selection = vertexMarks[index];
        var vertexInput = row.add("edittext", undefined, vertexTexts[index]);
        vertexInput.characters = 6;
        var angleOn = closed || (index > 0 && index < vertexCount - 1);
        vertexList.enabled = angleOn;
        vertexInput.enabled = angleOn;

        var sideCaption = row.add("statictext", undefined, "WW");
        sideCaption.preferredSize.width = 26;
        var sideList = row.add("dropdownlist", undefined, SIDE_MARKS);
        sideList.selection = sideMarks[index];
        var sideInput = row.add("edittext", undefined, sideTexts[index]);
        sideInput.characters = 6;
        var sideOn = index < sideCount;
        sideCaption.visible = sideOn;
        sideList.visible = sideOn;
        sideInput.visible = sideOn;

        vertexList.onChange = function() { vertexMarks[index] = vertexList.selection ? vertexList.selection.index : 0; updatePreview(); };
        sideList.onChange = function() { sideMarks[index] = sideList.selection ? sideList.selection.index : 0; updatePreview(); };
        vertexInput.onChanging = function() { vertexTexts[index] = vertexInput.text; updatePreview(); };
        sideInput.onChanging = function() { sideTexts[index] = sideInput.text; updatePreview(); };
        return { vertexCaption: vertexCaption, sideCaption: sideCaption };
    }

    function refreshRowCaptions() {
        var names = vertexNames(startLetter, vertexCount);
        for (var i = 0; i < markRows.length; i++) {
            markRows[i].vertexCaption.text = "∠" + names[i];
            markRows[i].sideCaption.text = names[i] + names[(i + 1) % vertexCount];
        }
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (" + unit + "):").preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
    }

    function bindValueRow(controls, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
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
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
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
    // 설정 저장 · 복원. 각·변 표기는 꼭짓점 수와 열림/닫힘이 같을 때만 되살린다
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            "v2",
            showNames ? "1" : "0", encodeURIComponent(startLetter), clockwise ? "1" : "0",
            fontPt, labelGapMm, arcRadiusMm, tickMm, strokePt,
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0", normalizeStroke ? "1" : "0",
            vertexCount + (closed ? "c" : "o"),
            vertexMarks.join(","), encodeList(vertexTexts), sideMarks.join(","), encodeList(sideTexts)
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function encodeList(list) {
        var out = [];
        for (var i = 0; i < list.length; i++) out.push(encodeURIComponent(list[i]));
        return out.join(",");
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 18) return;
        try {
            showNames = p[1] === "1";
            var letter = decodeURIComponent(p[2]);
            if (letter.length === 1) startLetter = letter;
            clockwise = p[3] === "1";
            fontPt = restoreNumber(p[4], fontPt, 5, 14);
            labelGapMm = restoreNumber(p[5], labelGapMm, 0, 5);
            arcRadiusMm = restoreNumber(p[6], arcRadiusMm, 1, 10);
            tickMm = restoreNumber(p[7], tickMm, 0.5, 5);
            strokePt = restoreNumber(p[8], strokePt, 0.1, 1);
            offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            previewEnabled = p[11] === "1";
            normalizeStroke = p[12] === "1";
            if (p[13] !== vertexCount + (closed ? "c" : "o")) return;
            var vm = p[14].split(","), vt = p[15].split(","), sm = p[16].split(","), st = p[17].split(",");
            if (vm.length !== vertexCount || vt.length !== vertexCount || sm.length !== vertexCount || st.length !== vertexCount) return;
            for (var i = 0; i < vertexCount; i++) {
                vertexMarks[i] = restoreIndex(vm[i], VERTEX_MARKS.length);
                sideMarks[i] = restoreIndex(sm[i], SIDE_MARKS.length);
                vertexTexts[i] = decodeURIComponent(vt[i]);
                sideTexts[i] = decodeURIComponent(st[i]);
            }
        } catch (restoreError) {}
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }

    function restoreIndex(text, length) {
        var value = parseInt(text, 10);
        return (isNaN(value) || value < 0 || value >= length) ? 0 : value;
    }
})();
