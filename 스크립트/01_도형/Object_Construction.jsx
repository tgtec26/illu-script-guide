// Object_Construction.jsx
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

// 작도·삼각형의 오심: 선택한 직선 패스에 따라
// - 선분(점 2개): 수직이등분선
// - 각(열린 패스, 점 3개): 가운데 꼭짓점의 각의 이등분선
// - 삼각형(닫힌 패스, 점 3개): 외심 O(수직이등분선·외접원), 내심 I(각의 이등분선·내접원·접점까지 수선), 무게중심 G(중선)
// 작도 흔적을 켜면 교과서처럼 컴퍼스 호를 남긴다(수직이등분선: 두 끝점에서 같은 반지름, 각의 이등분선: 꼭짓점에서 한 번, 두 변 위의 점에서 한 번).
// 선 두께는 평가원 그림 기준: 원 0.8pt, 보조선·작도 흔적 0.3pt. 도형 선은 기본으로 0.8pt로 맞춘다(끄면 그대로).

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "Construction/settings";
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
    var SHAPE_STROKE_PT = 0.8;
    var DOT_RADIUS_MM = 0.6;
    var LABEL_GAP_MM = 0.8;
    // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
    var FLAG_KEYS = ["circumcenter", "perpBisectors", "circumcircle", "incenter", "angleBisectors", "incircle",
        "tangentFeet", "centroid", "medians", "traces", "dashed"];

    var doc = app.activeDocument;

    var target = null;
    var sel = doc.selection;
    if (sel && sel.length === 1 && sel[0].typename === "PathItem") target = sel[0];
    if (target === null) {
        alert("선분(점 2개), 각(열린 패스, 점 3개), 삼각형(닫힌 패스, 점 3개) 중 하나를 선택해주세요.");
        return;
    }
    var rawPoints = [];
    for (var p = 0; p < target.pathPoints.length; p++) {
        var anchor = target.pathPoints[p].anchor;
        rawPoints.push([anchor[0], anchor[1]]);
    }
    rawPoints = dedupePoints(rawPoints, target.closed);
    var mode = detectMode(rawPoints, target.closed);
    if (mode === null) {
        alert("선분(점 2개), 각(열린 패스, 점 3개), 삼각형(닫힌 패스, 점 3개) 중 하나를 선택해주세요.");
        return;
    }
    var MODE_NAMES = { segment: "선분 → 수직이등분선", angle: "각 → 각의 이등분선", triangle: "삼각형 → 오심" };

    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

    // 옵션
    var opt = {
        circumcenter: true, perpBisectors: true, circumcircle: true,
        incenter: false, angleBisectors: false, incircle: false, tangentFeet: false,
        centroid: false, medians: false,
        traces: true, dashed: true, extendMm: 3
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
    var win = new Window("dialog", "작도 · 삼각형의 오심");
    win.alignChildren = "fill";
    win.add("statictext", undefined, "대상: " + MODE_NAMES[mode]);

    var trianglePanel = addPanel(win, "삼각형");
    var circumRow = trianglePanel.add("group");
    var circumcenterCheck = circumRow.add("checkbox", undefined, "외심 O");
    var perpCheck = circumRow.add("checkbox", undefined, "수직이등분선");
    var circumcircleCheck = circumRow.add("checkbox", undefined, "외접원");
    var inRow = trianglePanel.add("group");
    var incenterCheck = inRow.add("checkbox", undefined, "내심 I");
    var angleCheck = inRow.add("checkbox", undefined, "각의 이등분선");
    var incircleCheck = inRow.add("checkbox", undefined, "내접원");
    var feetCheck = inRow.add("checkbox", undefined, "접점 수선");
    feetCheck.helpTip = "내심에서 세 변에 내린 수선 (내접원의 반지름)";
    var centroidRow = trianglePanel.add("group");
    var centroidCheck = centroidRow.add("checkbox", undefined, "무게중심 G");
    var mediansCheck = centroidRow.add("checkbox", undefined, "중선");
    trianglePanel.enabled = mode === "triangle";

    var stylePanel = addPanel(win, "표시");
    var styleRow = stylePanel.add("group");
    var tracesCheck = styleRow.add("checkbox", undefined, "작도 흔적(컴퍼스 호)");
    var dashedCheck = styleRow.add("checkbox", undefined, "보조선 점선");
    var normalizeCheck = stylePanel.add("checkbox", undefined, "도형 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
    normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
    var extendControls = addValueRow(stylePanel, "보조선 연장", "mm", opt.extendMm, 0, 15, 0.5, 1);
    var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

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

    bindOption(circumcenterCheck, "circumcenter");
    bindOption(perpCheck, "perpBisectors");
    bindOption(circumcircleCheck, "circumcircle");
    bindOption(incenterCheck, "incenter");
    bindOption(angleCheck, "angleBisectors");
    bindOption(incircleCheck, "incircle");
    bindOption(feetCheck, "tangentFeet");
    bindOption(centroidCheck, "centroid");
    bindOption(mediansCheck, "medians");
    bindOption(tracesCheck, "traces");
    bindOption(dashedCheck, "dashed");
    normalizeCheck.value = normalizeStroke;
    normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
    previewCheck.value = previewEnabled;
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    bindValueRow(extendControls, function(value) { opt.extendMm = value; });
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

    function bindOption(check, key) {
        check.value = opt[key];
        check.onClick = function() {
            opt[key] = check.value;
            updatePreview();
        };
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
        var drawing = buildConstruction(rawPoints, mode, opt, opt.extendMm * MM_TO_PT);
        previewGroup = target.parent.groupItems.add();
        previewGroup.move(target, ElementPlacement.PLACEBEFORE);
        previewGroup.name = "작도";
        for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
        for (var j = 0; j < drawing.circles.length; j++) addCircle(drawing.circles[j]);
        for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
        for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
    }

    // line: {points:[{anchor,left,right}], kind:"guide"|"trace"}
    function addPath(line) {
        var path = previewGroup.pathItems.add();
        var anchors = [];
        for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < line.points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = line.points[j].left;
            point.rightDirection = line.points[j].right;
        }
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = GUIDE_PT;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        if (line.kind === "guide" && opt.dashed) path.strokeDashes = GUIDE_DASH;
    }

    function addCircle(circle) {
        var r = circle.radius;
        var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = MAIN_PT;
    }

    function addDot(at) {
        var r = DOT_RADIUS_MM * MM_TO_PT;
        var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
        circle.stroked = false;
        circle.filled = true;
        circle.fillColor = makeGray(100);
    }

    // at에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다
    function addLabel(label) {
        var frame = previewGroup.textFrames.add();
        frame.contents = label.text;
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
        var dir = label.dir;
        var reach = DOT_RADIUS_MM * MM_TO_PT + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
        var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt). O·I·G는 똑바로
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
    // 기하 (일러 DOM을 쓰지 않는다 → tests/check-construction.js)
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

    // 점이 한 직선 위에 있으면(넓이 0) 각·삼각형이 아니다
    function detectMode(points, isClosed) {
        if (points.length === 2 && !isClosed) return "segment";
        if (points.length !== 3) return null;
        var area = cross(sub(points[1], points[0]), sub(points[2], points[0]));
        if (Math.abs(area) < 1e-6 * (1 + Math.pow(dist(points[0], points[1]) + dist(points[1], points[2]), 2))) return null;
        return isClosed ? "triangle" : "angle";
    }

    function buildConstruction(points, kind, o, extend) {
        var out = { lines: [], circles: [], dots: [], texts: [] };
        if (kind === "segment") {
            perpendicularBisector(out, points[0], points[1], null, o.traces, extend);
            return out;
        }
        if (kind === "angle") {
            angleBisector(out, points[1], points[0], points[2], null, o.traces, extend);
            return out;
        }
        var A = points[0], B = points[1], C = points[2];
        var sides = [[A, B, C], [B, C, A], [C, A, B]];   // [끝점, 끝점, 마주 보는 꼭짓점]

        var O = circumcenter(A, B, C);
        if (o.perpBisectors) for (var s = 0; s < 3; s++) perpendicularBisector(out, sides[s][0], sides[s][1], O, o.traces, extend);
        if (o.circumcircle) out.circles.push({ center: O, radius: dist(O, A) });
        if (o.circumcenter) addCenter(out, O, "O", points);

        var incircle = incenter(A, B, C);
        var I = incircle.center;
        if (o.angleBisectors) {
            for (var v = 0; v < 3; v++) angleBisector(out, sides[v][2], sides[v][0], sides[v][1], I, o.traces, extend);
        }
        if (o.tangentFeet) {
            for (var f = 0; f < 3; f++) out.lines.push(guide([I, footOfPerpendicular(I, sides[f][0], sides[f][1])]));
        }
        if (o.incircle) out.circles.push({ center: I, radius: incircle.radius });
        if (o.incenter) addCenter(out, I, "I", points);

        var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
        if (o.medians) {
            for (var m = 0; m < 3; m++) out.lines.push(guide([sides[m][2], midpoint(sides[m][0], sides[m][1])]));
        }
        if (o.centroid) addCenter(out, G, "G", points);
        return out;
    }

    // 점과 이름. 이름은 가장 가까운 꼭짓점에서 멀어지는 쪽 (겹치면 오른쪽 아래)
    function addCenter(out, at, name, vertices) {
        var nearest = vertices[0];
        for (var i = 1; i < vertices.length; i++) if (dist(at, vertices[i]) < dist(at, nearest)) nearest = vertices[i];
        var away = dist(at, nearest) > 1e-6 ? unit(sub(at, nearest)) : [0.7071, -0.7071];
        out.dots.push(at);
        out.texts.push({ text: name, at: at, dir: away });
    }

    // 선분 AB의 수직이등분선. through(외심)가 있으면 그 점까지 덮고, 양 끝을 extend만큼 더 뻗는다
    function perpendicularBisector(out, A, B, through, traces, extend) {
        var M = midpoint(A, B), length = dist(A, B);
        var n = unit([-(B[1] - A[1]), B[0] - A[0]]);
        var radius = length * 0.7;
        var reach = Math.sqrt(radius * radius - length * length / 4);   // 두 호의 교점까지
        var low = -reach, high = reach;
        if (through) {
            var t = dot(sub(through, M), n);
            low = Math.min(0, t) - length * 0.15;
            high = Math.max(0, t) + length * 0.15;
            if (traces) { low = Math.min(low, -reach); high = Math.max(high, reach); }
        }
        out.lines.push(guide([offset(M, n, low - extend), offset(M, n, high + extend)]));
        if (traces) {
            var sweep = 24 * Math.PI / 180;
            for (var side = -1; side <= 1; side += 2) {
                var P = offset(M, n, side * reach);
                out.lines.push(trace(arcPoints(A, radius, angleOf(sub(P, A)) - sweep / 2, sweep)));
                out.lines.push(trace(arcPoints(B, radius, angleOf(sub(P, B)) - sweep / 2, sweep)));
            }
        }
    }

    // 꼭짓점 V에서 두 변 VP, VN 사이 각의 이등분선. through(내심)가 있으면 마주 보는 변까지(삼각형), 없으면 작도점 너머로
    function angleBisector(out, V, P, N, through, traces, extend) {
        var u = unit(sub(P, V)), w = unit(sub(N, V));
        var bisector = unit([u[0] + w[0], u[1] + w[1]]);
        var half = Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) / 2;
        var r1 = Math.min(dist(V, P), dist(V, N)) * 0.35;
        var X = offset(V, u, r1), Y = offset(V, w, r1);
        var r2 = dist(X, Y) * 0.8;
        // X, Y에서 같은 반지름 r2로 그린 호의 교점 (V에서 먼 쪽)
        var Z = offset(midpoint(X, Y), bisector, Math.sqrt(Math.max(0, r2 * r2 - Math.pow(dist(X, Y) / 2, 2))));
        var end;
        if (through) {
            end = lineIntersection(V, bisector, P, sub(N, P));
        } else {
            end = offset(V, bisector, Math.max(dist(V, Z), Math.min(dist(V, P), dist(V, N)) * 0.8) + extend);
        }
        out.lines.push(guide([V, end]));
        if (traces) {
            // u에서 반시계로 w까지. 180°를 넘으면 w에서 반시계로 u까지 (작은 쪽 각)
            var start = angleOf(u);
            var sweep = angleOf(w) - start;
            while (sweep < 0) sweep += Math.PI * 2;
            if (sweep > Math.PI) { start = angleOf(w); sweep = Math.PI * 2 - sweep; }
            var margin = 8 * Math.PI / 180;
            out.lines.push(trace(arcPoints(V, r1, start - margin, sweep + margin * 2)));
            var small = Math.max(20 * Math.PI / 180, half * 0.5);
            out.lines.push(trace(arcPoints(X, r2, angleOf(sub(Z, X)) - small / 2, small)));
            out.lines.push(trace(arcPoints(Y, r2, angleOf(sub(Z, Y)) - small / 2, small)));
        }
    }

    function circumcenter(A, B, C) {
        var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
        var a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
        return [
            (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d,
            (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d
        ];
    }

    function incenter(A, B, C) {
        var a = dist(B, C), b = dist(C, A), c = dist(A, B), perimeter = a + b + c;
        var center = [(a * A[0] + b * B[0] + c * C[0]) / perimeter, (a * A[1] + b * B[1] + c * C[1]) / perimeter];
        var area = Math.abs(cross(sub(B, A), sub(C, A))) / 2;
        return { center: center, radius: area * 2 / perimeter };
    }

    function footOfPerpendicular(point, A, B) {
        var d = unit(sub(B, A));
        return offset(A, d, dot(sub(point, A), d));
    }

    // P + t·d와 Q + s·e의 교점
    function lineIntersection(P, d, Q, e) {
        var t = cross(sub(Q, P), e) / cross(d, e);
        return offset(P, d, t);
    }

    // 3차 베지어 원호 (90°씩 나눈다)
    function arcPoints(center, radius, start, sweep) {
        var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
        var step = sweep / pieces;
        var handle = 4 / 3 * Math.tan(step / 4) * radius;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var angle = start + step * i;
            var cos = Math.cos(angle), sin = Math.sin(angle);
            var a = [center[0] + radius * cos, center[1] + radius * sin];
            var tangent = [-sin * handle, cos * handle];
            points.push({
                anchor: a,
                left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
            });
        }
        return points;
    }

    function guide(anchors) {
        var points = [];
        for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
        return { points: points, kind: "guide" };
    }

    function trace(points) {
        return { points: points, kind: "trace" };
    }

    function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
    function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
    function angleOf(v) { return Math.atan2(v[1], v[0]); }
    function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
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
        var parts = ["v1", flags, opt.extendMm, normalizeStroke ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 8 || p[1].length !== FLAG_KEYS.length) return;
        for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
        opt.extendMm = restoreNumber(p[2], opt.extendMm, 0, 15);
        normalizeStroke = p[3] === "1";
        fontPt = restoreNumber(p[4], fontPt, 5, 14);
        offsetXmm = restoreNumber(p[5], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[6], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        previewEnabled = p[7] === "1";
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }
})();
