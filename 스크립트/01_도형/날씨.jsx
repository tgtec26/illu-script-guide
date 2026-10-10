// 날씨.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 날씨: 기권(높이에 따른 기온)·기압과 바람(고기압·저기압)·해륙풍과 계절풍을 한 창의 탭으로 묶었다.
// 세 탭 모두 선택 없이 화면 가운데에 그린다. 탭마다 옵션을 따로 저장한다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    // 화살촉 모양 4종류(tools/arrowheads.json과 같은 순서). 작살형(평가원식)이 1번이다.
    // 층 묶음 기호는 중괄호용 갈고리 촉(바깥 끝 화살표 7 모양, 가운데 끝 화살표 6 모양)으로 고정이다
    var HEAD_SHAPES = ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"];

    // 화살촉 4종류: 일러스트레이터 화살촉을 선 두께 1pt·100%로 확장해 잰 외곽(사용자가 준 SVG). 끝이 원점, 뒤쪽이 +y, 가로는 방향의 직각. 단위 pt.
    // 순서는 모양 목록(삼각형, 꺾쇠, 제비꼬리, 작살형)과 같다. length는 끝에서 가장 먼 점, lineEnd는 선이 머리 속에서 끝나는 끝에서의 거리다
    var HEAD_CATALOG = [
        {length: 8.6, lineEnd: 7.7, poly: [[0, 0], [4.95, 8.6], [-4.95, 8.6]]},
        {length: 8, lineEnd: 0.8, poly: [[0, 0], [4.8, 7.3], [4.84, 7.6], [4.8, 8], [4.45, 8], [4.1, 7.8], [0, 1.3], [-4.1, 7.8], [-4.45, 8], [-4.8, 8], [-4.84, 7.6], [-4.8, 7.3]]},
        {length: 9.9, lineEnd: 7, poly: [[0, 0], [4.1, 9.9], [0, 7.6], [-4.1, 9.9]]},
        {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]}
    ];
    // 화살촉 종류: 카탈로그 번호(0~3)이거나 중괄호 갈고리 "outer"(화살표 7 모양)·"inner"(화살표 6 모양)
    function headKindOf(shape) { return shape; }
    var HEAD_BRACE_OUTER = "outer";
    var HEAD_BRACE_INNER = "inner";
    // 중괄호 끝의 갈고리 촉: 일러스트레이터 화살표 6(안쪽 끝)·7(바깥 끝)의 아트워크를 선 두께 1pt·100%로 잰 베지어(화살표.ai).
    // 좌표는 (옆, 뒤) pt이고 끝(tip)이 원점, 뒤쪽이 +뒤, 옆은 진행 방향의 왼쪽이 +다. 선은 촉 뿌리(뒤 BRACE_HEAD_BACK)에서 끝난다
    var BRACE_HEAD_BACK = 2.1707;
    var BRACE_HEADS = {
        inner: [{a: [0.4988, 2.1707], l: [0.4988, 2.1707], r: [0.4988, 2.1707]}, {a: [-0.4988, 2.1707], l: [-0.4988, 2.1707], r: [-0.4988, 2.1707]}, {a: [-0.4988, 2.0155], l: [-0.4988, 2.0155], r: [-0.4988, 1.4577]}, {a: [2.8881, 0.0], l: [-0.1797, 0.3105], r: [2.8881, 0.0]}, {a: [2.8881, 0.1668], l: [2.8881, 0.1668], r: [0.9962, 0.4744]}, {a: [0.4988, 2.1679], l: [0.4988, 1.127], r: [0.4988, 2.1679]}],
        outer: [{a: [-0.4934, 2.1707], l: [-0.4934, 2.1707], r: [-0.4934, 2.1707]}, {a: [0.5043, 2.1707], l: [0.5043, 2.1707], r: [0.5043, 2.1707]}, {a: [0.5043, 2.0155], l: [0.5043, 2.0155], r: [0.5043, 1.4577]}, {a: [-2.8826, 0.0], l: [0.1851, 0.3105], r: [-2.8826, 0.0]}, {a: [-2.8826, 0.1668], l: [-2.8826, 0.1668], r: [-0.9908, 0.4744]}, {a: [-0.4934, 2.1679], l: [-0.4934, 1.127], r: [-0.4934, 2.1679]}]
    };
    var BRACE_PT = 0.5;

    runFormHost("날씨", [makeAtmosphereEngine(), makePressureEngine(), makeBreezeEngine()], "Weather/tab");

    // ==== 기권 ====
    // 높이에 따른 기온 그래프와 네 층. 경계는 교과서 값(11·50·80km), 기온 축은 −100~20°C.
    function makeAtmosphereEngine() {
        return makeFormEngine({
            label: "기권", name: "Atmosphere", prefKey: "ObjectAtmosphere/settings",
            controls: [
                {panel: "그래프"},
                {key: "width", label: "너비", unit: "mm", min: 30, max: 150, step: 1, value: 60},
                {key: "height", label: "높이", unit: "mm", min: 40, max: 200, step: 1, value: 80},
                {key: "top", label: "최고 높이", unit: "km", min: 100, max: 150, step: 10, value: 120},
                {key: "kmStep", label: "높이 눈금", items: ["10 km", "20 km"], value: 0},
                {key: "tickIn", label: "눈금 방향", items: ["바깥", "안쪽"], value: 0},
                {panel: "표시"},
                {key: "names", check: "층 이름", value: true},
                {key: "bounds", check: "계면 이름", value: false},
                {key: "ozone", check: "오존층", value: true},
                {key: "shade", check: "층 음영", value: true},
                {key: "arrows", check: "축 화살표", value: true},
                {key: "braces", check: "층 묶음 기호", value: false},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8},
                {panel: "화살촉"},
                {key: "headShape", label: "축 화살촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3},
                {key: "headScale", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100}
            ],
            draw: drawAtmosphere
        });
    }

    // [기온 °C, 높이 km] 꺾은선. 최고 높이에서 자르고, 기온 축 오른쪽 끝(20°C)에 닿으면 끝낸다
    function atmosphereProfile(top) {
        var base = [[15, 0], [-56, 11], [-56, 20], [-2, 50], [-90, 80], [-88, 90], [-60, 100], [-20, 110], [20, 120]];
        var list = [base[0]];
        for (var i = 1; i < base.length; i++) {
            var a = base[i - 1], b = base[i];
            if (b[1] >= top) {
                var r = (top - a[1]) / (b[1] - a[1]);
                list.push([a[0] + (b[0] - a[0]) * r, top]);
                return list;
            }
            list.push(b);
        }
        return list;
    }

    // 층마다 [아래, 위] 높이(km). 열권은 그래프 맨 위까지
    function atmosphereSpans(top) {
        var bounds = [0, 11, 50, 80, top];
        var list = [];
        for (var i = 0; i < 4; i++) list.push([bounds[i], bounds[i + 1]]);
        return list;
    }

    function drawAtmosphere(t, o) {
        var mm = t.mm;
        var W = o.width * mm, H = o.height * mm, F = o.font;
        var AXIS_PT = 0.4, GRAPH_PT = 0.8, TICK = 1 * mm, ARROW_MARGIN = 3 * mm;
        var NAMES = ["대류권", "성층권", "중간권", "열권"];
        var BOUNDS = ["대류권 계면", "성층권 계면", "중간권 계면"];
        function X(temp) { return (temp + 100) / 120 * W; }
        function Y(km) { return km / o.top * H; }
        var spans = atmosphereSpans(o.top);

        for (var i = 0; i < spans.length; i++) {
            var bottom = spans[i][0], top = spans[i][1];
            if (o.shade) t.rect(0, Y(top), W, Y(bottom), i % 2 === 0 ? 15 : 5, null, 0);
            // 묶음 기호가 없으면 그래프 안 오른쪽에. 오존층과 겹치면 오존층 위쪽 가운데에 쓴다
            var mid = (o.ozone && bottom < 30 && top > 20) ? (30 + top) / 2 : (bottom + top) / 2;
            if (o.names && !o.braces) t.text(NAMES[i], W - 1.5 * mm, Y(mid), F, "right");
        }
        if (o.ozone) {
            t.rect(0, Y(30), W, Y(20), 35, null, 0);
            t.text("오존층", 1.5 * mm, Y(25), F, "left");
        }
        for (var j = 0; j < 3; j++) {
            var y = Y(spans[j][1]);
            t.line([0, y], [W, y], 0.3, 100, [2, 1.5]);
            if (o.bounds) t.text(BOUNDS[j], 1.5 * mm, y + F * 0.65, F, "left");
        }

        // 눈금: 바깥이면 축 밖으로, 안쪽이면 그래프 안으로 1mm (그래프·표.jsx 축 탭과 같은 길이·두께)
        var tickSign = o.tickIn ? 1 : -1;
        var labelGap = (o.tickIn ? 1 : 2) * mm;
        var kmStep = o.kmStep ? 20 : 10;
        for (var km = 0; km <= o.top; km += kmStep) {
            t.line([0, Y(km)], [tickSign * TICK, Y(km)], AXIS_PT);
            t.text(String(km), -labelGap, Y(km), F, "right");
        }
        for (var temp = -100; temp <= 20; temp += 20) {
            t.line([X(temp), 0], [X(temp), tickSign * TICK], AXIS_PT);
            if ((temp + 100) % 40 === 0) t.text(String(temp), X(temp), -labelGap + 0.5 * mm - F * 0.5, F);
        }
        t.text("높이(km)", 0, H + ARROW_MARGIN + F * 0.7, F);
        t.text("기온(°C)", W + ARROW_MARGIN, -labelGap + 0.5 * mm - F * 0.5, F, "left");

        var points = atmosphereProfile(o.top);
        var line = [];
        for (var p = 0; p < points.length; p++) line.push([X(points[p][0]), Y(points[p][1])]);
        t.path(line, false, null, 100, GRAPH_PT);

        // 축은 한 패스(Y축 끝 → 원점 → X축 끝). 화살촉은 직접 그린 도형으로 단다
        var axis = t.path([[0, H + ARROW_MARGIN], [0, 0], [W + ARROW_MARGIN, 0]], false, null, 100, AXIS_PT);
        if (o.arrows) setStrokeArrowheads([axis], headKindOf(o.headShape), headKindOf(o.headShape), AXIS_PT, o.headScale);

        // 층 묶음 기호 (영역 중괄호.jsx): 층 높이만큼의 세로선을 가운데에서 잘라
        // 바깥 끝에 갈고리 촉(7 모양), 가운데 끝에 갈고리 촉(6 모양). 이웃한 기호가 붙지 않게 0.2mm씩 띄운다
        if (o.braces) {
            var bx = W + ARROW_MARGIN + 2 * mm, inset = 0.2 * mm;
            var heads = [], tails = [];
            for (var b = 0; b < spans.length; b++) {
                var y1 = Y(spans[b][1]) - inset, y0 = Y(spans[b][0]) + inset, ym = (y0 + y1) / 2;
                heads.push(t.line([bx, y1], [bx, ym], BRACE_PT));
                tails.push(t.line([bx, ym], [bx, y0], BRACE_PT));
                if (o.names) t.text(NAMES[b], bx + 2 * mm, ym, F, "left");
            }
            setStrokeArrowheads(heads, HEAD_BRACE_OUTER, HEAD_BRACE_INNER, BRACE_PT, o.headScale);
            setStrokeArrowheads(tails, HEAD_BRACE_INNER, HEAD_BRACE_OUTER, BRACE_PT, o.headScale);
        }
    }

    // 끝 tip, 방향 단위 벡터 d(바깥쪽), 배율 k로 갈고리 촉의 베지어 점 [{a, l, r}]
    function braceHeadPoints(kind, tip, d, k) {
        var n = [-d[1], d[0]], poly = BRACE_HEADS[kind], out = [];
        function at(p) {
            return [tip[0] - d[0] * p[1] * k + n[0] * p[0] * k, tip[1] - d[1] * p[1] * k + n[1] * p[0] * k];
        }
        for (var i = 0; i < poly.length; i++) out.push({a: at(poly[i].a), l: at(poly[i].l), r: at(poly[i].r)});
        return out;
    }

    // 직선·꺾은선 패스들의 끝에 화살촉을 직접 그려 단다: 선 끝을 촉 뿌리까지 줄이고 같은 그룹에 촉 도형을 더한다.
    // startKind·endKind는 headKindOf(카탈로그 번호) 또는 HEAD_BRACE_*, null이면 그 끝에는 달지 않는다. width는 선 두께(pt), scale은 촉 크기 %.
    // 두 끝이 모서리인 패스(직선, 축처럼 꺾인 선)에만 쓴다
    function setStrokeArrowheads(paths, startKind, endKind, width, scale) {
        for (var i = 0; i < paths.length; i++) {
            var path = paths[i], pp = path.pathPoints, n = pp.length;
            if (n < 2) continue;
            var color = path.strokeColor, container = path.parent;
            var ends = [{kind: startKind, tip: pp[0].anchor, from: pp[1].anchor, index: 0},
                {kind: endKind, tip: pp[n - 1].anchor, from: pp[n - 2].anchor, index: n - 1}];
            for (var e = 0; e < ends.length; e++) {
                var end = ends[e];
                if (end.kind === null) continue;
                var dx = end.tip[0] - end.from[0], dy = end.tip[1] - end.from[1], len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) continue;
                var d = [dx / len, dy / len], unit = width * scale / 100;
                var isBrace = typeof end.kind === "string";
                var back = isBrace ? BRACE_HEAD_BACK * unit : HEAD_CATALOG[end.kind].lineEnd * unit;
                if (len > back) {
                    var cut = [end.tip[0] - d[0] * back, end.tip[1] - d[1] * back];
                    pp[end.index].anchor = cut;
                    pp[end.index].leftDirection = cut;
                    pp[end.index].rightDirection = cut;
                }
                var head = container.pathItems.add();
                if (isBrace) {
                    var pts = braceHeadPoints(end.kind, end.tip, d, unit), anchors = [], q;
                    for (q = 0; q < pts.length; q++) anchors.push(pts[q].a);
                    head.setEntirePath(anchors);
                    for (q = 0; q < pts.length; q++) {
                        head.pathPoints[q].leftDirection = pts[q].l;
                        head.pathPoints[q].rightDirection = pts[q].r;
                    }
                } else {
                    head.setEntirePath(catalogPoints(end.kind, end.tip, d, unit));
                }
                head.closed = true;
                head.stroked = false;
                head.filled = true;
                head.fillColor = color;
                head.name = "화살촉";
            }
        }
    }

    // ==== 기압과 바람 ====
    // 북반구 고기압(시계 방향으로 불어 나감)·저기압(시계 반대 방향으로 불어 듦). 위에서 본 등압선 또는 옆에서 본 기류.
    function makePressureEngine() {
        return makeFormEngine({
            label: "기압과 바람", name: "PressureSystem", prefKey: "ObjectPressureSystem/settings",
            controls: [
                {panel: "기압"},
                {key: "kind", label: "종류", items: ["고기압", "저기압"], value: 0},
                {key: "view", label: "모습", items: ["위에서 본 모습", "옆에서 본 모습"], value: 0},
                {key: "rings", label: "등압선 수", unit: "개", min: 2, max: 6, step: 1, value: 4},
                {key: "gap", label: "등압선 간격", unit: "mm", min: 2, max: 20, step: 0.5, value: 6},
                {key: "bend", label: "찌그러짐", unit: "%", min: 0, max: 30, step: 1, value: 12},
                {key: "seed", label: "모양 번호", unit: "", min: 1, max: 99, step: 1, value: 1},
                {key: "winds", label: "바람 화살표", unit: "개", min: 0, max: 12, step: 1, value: 6},
                {panel: "표시"},
                {key: "center", check: "중심 글자", value: true},
                {key: "values", check: "기압 값", value: false},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8},
                {panel: "화살표"},
                {key: "arrowPt", label: "선 두께", unit: "pt", min: 0.3, max: 2, step: 0.05, value: 0.75},
                {key: "headScale", label: "촉 크기", unit: "%", min: 30, max: 200, step: 5, value: 100},
                {key: "headShape", label: "촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3},
                {panel: "축 (옆에서 본 모습)"},
                {key: "axes", check: "축", value: false},
                {key: "axisArrows", check: "축 화살표", value: true},
                {key: "ticks", label: "눈금 수", unit: "개", min: 0, max: 10, step: 1, value: 4},
                {key: "tickIn", label: "눈금 방향", items: ["바깥", "안쪽"], value: 0}
            ],
            draw: drawPressure
        });
    }

    // 등압선 반지름. 모든 등압선이 같은 모양을 크기만 달리 쓰므로 서로 만나지 않는다
    function isobarRadius(theta, base, bend, seed) {
        return base * (1 + bend / 100 * (0.6 * Math.sin(2 * theta + seed * 1.7) + 0.4 * Math.sin(3 * theta + seed * 2.9)));
    }

    // 바람 방향(단위 벡터). 등압선에 30° 비스듬히: 고기압은 시계 방향+바깥, 저기압은 반시계+안쪽
    function windDirection(theta, high) {
        var a = 30 * Math.PI / 180;
        var tx = high ? Math.sin(theta) : -Math.sin(theta), ty = high ? -Math.cos(theta) : Math.cos(theta);
        var rx = high ? Math.cos(theta) : -Math.cos(theta), ry = high ? Math.sin(theta) : -Math.sin(theta);
        return [Math.cos(a) * tx + Math.sin(a) * rx, Math.cos(a) * ty + Math.sin(a) * ry];
    }

    function drawPressure(t, o) {
        var mm = t.mm, F = o.font, high = (o.kind === 0);
        var gap = o.gap * mm;
        if (o.view === 1) {
            drawPressureSide(t, o, high);
            return;
        }
        var STEPS = 24;
        for (var k = 1; k <= o.rings; k++) {
            var points = [];
            for (var s = 0; s < STEPS; s++) {
                var th = s / STEPS * 2 * Math.PI;
                var r = isobarRadius(th, k * gap, o.bend, o.seed);
                points.push([r * Math.cos(th), r * Math.sin(th)]);
            }
            t.smooth(points, true, null, 100, 0.5);
        }
        if (o.values) {
            for (var v = 1; v <= o.rings; v++) {
                var top = isobarRadius(Math.PI / 2, v * gap, o.bend, o.seed);
                var frame = t.text(String(high ? 1024 - 4 * v : 996 + 4 * v), 0, top, F * 0.85);
                var b = frame.geometricBounds;
                t.rect(b[0] - 0.5, b[1] + 0.5, b[2] + 0.5, b[3] - 0.5, 0, null, 0);
                frame.zOrder(ZOrderMethod.BRINGTOFRONT);
            }
        }
        if (o.center) t.text(high ? "고" : "저", 0, 0, F * 1.5);
        var ring = (Math.max(1, Math.floor(o.rings / 2)) + 0.5) * gap;
        var length = Math.min(gap * 1.4, 12 * mm);
        var winds = [];
        for (var w = 0; w < o.winds; w++) {
            var theta = (w + 0.5) / o.winds * 2 * Math.PI;
            var rr = isobarRadius(theta, ring, o.bend, o.seed);
            var c = [rr * Math.cos(theta), rr * Math.sin(theta)];
            var d = windDirection(theta, high);
            winds.push(t.line([c[0] - d[0] * length / 2, c[1] - d[1] * length / 2], [c[0] + d[0] * length / 2, c[1] + d[1] * length / 2], o.arrowPt));
        }
        // 화살촉은 고른 종류(기본 작살형)
        if (winds.length) setStrokeArrowheads(winds, null, headKindOf(o.headShape), o.arrowPt, o.headScale);
    }

    // 옆 모습: 가운데 하강(고기압)·상승(저기압) 기류, 지면에서 불어 나가거나 들어오는 바람, 위에서 반대로.
    // 축을 켜면 지면이 가로축, 왼쪽 끝이 높이 축이다 (기권 탭과 같은 0.4pt 한 패스, 눈금 1mm)
    function drawPressureSide(t, o, high) {
        var mm = t.mm, F = o.font;
        var half = o.gap * o.rings * mm, H = half * 1.2, g = 2.5 * mm, low = 1.8 * mm;
        var AXIS_PT = 0.4, TICK = 1 * mm, ARROW_MARGIN = 3 * mm;
        var flows = [];
        function flow(a, b) { flows.push(t.line(a, b, o.arrowPt)); }
        if (high) flow([0, H], [0, low + g]); else flow([0, low + g], [0, H]);
        for (var side = -1; side <= 1; side += 2) {
            var near = side * g, far = side * half * 0.85;
            if (high) {
                flow([near, low], [far, low]);
                flow([far, H], [near, H]);
            } else {
                flow([far, low], [near, low]);
                flow([near, H], [far, H]);
            }
        }
        setStrokeArrowheads(flows, null, headKindOf(o.headShape), o.arrowPt, o.headScale);
        t.text(high ? "하강 기류" : "상승 기류", 1.5 * mm, H / 2, F, "left");

        if (o.axes) {
            var sign = o.tickIn ? 1 : -1;
            for (var i = 1; i <= o.ticks; i++) {
                var tx = -half + 2 * half * i / o.ticks, ty = H * i / o.ticks;
                t.line([tx, 0], [tx, sign * TICK], AXIS_PT);
                t.line([-half, ty], [-half + sign * TICK, ty], AXIS_PT);
            }
            var axis = t.path([[-half, H + ARROW_MARGIN], [-half, 0], [half + ARROW_MARGIN, 0]], false, null, 100, AXIS_PT);
            if (o.axisArrows) setStrokeArrowheads([axis], headKindOf(o.headShape), headKindOf(o.headShape), AXIS_PT, 100);
            t.text("높이", -half, H + ARROW_MARGIN + F * 0.7, F);
        } else {
            t.line([-half, 0], [half, 0], 0.5);
        }
        if (o.center) t.text(high ? "고기압" : "저기압", 0, -F * 0.8 - (o.axes && !o.tickIn ? TICK : 0), F);
    }

    // ==== 해륙풍·계절풍 ====
    // 육지(대륙)는 왼쪽, 바다(해양)는 오른쪽. 해풍·여름 계절풍은 바다 → 육지, 육풍·겨울 계절풍은 육지 → 바다.
    function makeBreezeEngine() {
        return makeFormEngine({
            label: "해륙풍·계절풍", name: "SeaLandBreeze", prefKey: "ObjectSeaLandBreeze/settings",
            controls: [
                {panel: "바람"},
                {key: "kind", label: "바람", items: ["해풍 (낮)", "육풍 (밤)", "남동 계절풍 (여름)", "북서 계절풍 (겨울)"], value: 0},
                {key: "width", label: "너비", unit: "mm", min: 40, max: 200, step: 1, value: 90},
                {key: "height", label: "높이", unit: "mm", min: 20, max: 120, step: 1, value: 45},
                {panel: "표시"},
                {key: "names", check: "육지·바다 이름", value: true},
                {key: "pressure", check: "기압", value: true},
                {key: "when", check: "때", value: false},
                {key: "headShape", label: "화살촉 모양", items: ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"], order: [3, 2, 0, 1], value: 0},
                {key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8}
            ],
            draw: drawBreeze
        });
    }

    // 순환 고리의 네 화살표 [시작, 끝]. 바다 → 육지면 지면에서 왼쪽으로 불고 육지 위에서 올라간다
    function breezeArrows(W, H, landHeight, seaToLand) {
        var L = W * 0.2, R = W * 0.8, B = landHeight + H * 0.1, T = H * 0.92, g = Math.min(W, H) * 0.08;
        var list = [
            [[R - g, B], [L + g, B]],
            [[L, B + g], [L, T - g]],
            [[L + g, T], [R - g, T]],
            [[R, T - g], [R, B + g]]
        ];
        if (!seaToLand) for (var i = 0; i < list.length; i++) list[i] = [list[i][1], list[i][0]];
        return list;
    }

    function drawBreeze(t, o) {
        var mm = t.mm, F = o.font;
        var W = o.width * mm, H = o.height * mm;
        var land = H * 0.18, sea = H * 0.1;
        var seaToLand = (o.kind === 0 || o.kind === 2);
        var monsoon = (o.kind >= 2);
        t.rect(0, land, W / 2, 0, 35, 100, 0.3);
        t.rect(W / 2, sea, W, 0, 12, 100, 0.3);
        var arrows = breezeArrows(W, H, land, seaToLand);
        for (var i = 0; i < arrows.length; i++) t.arrow(arrows[i][0], arrows[i][1], 1, 100, 2.2 * mm);
        if (o.pressure) {
            t.text(seaToLand ? "저기압" : "고기압", W / 4, land / 2, F);
            t.text(seaToLand ? "고기압" : "저기압", W * 3 / 4, sea / 2, F);
        }
        if (o.names) {
            t.text(monsoon ? "대륙" : "육지", W / 4, -F * 0.8, F);
            t.text(monsoon ? "해양" : "바다", W * 3 / 4, -F * 0.8, F);
        }
        if (o.when) t.text(["낮", "밤", "여름", "겨울"][o.kind], 0, H, F, "left");
    }

    // ==== 창 ====
    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null / setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    // 엔진이 하나면 탭 없이 창에 바로 행을 단다
    function runFormHost(title, engines, tabPrefKey) {
        var win = new Window("dialog", title);
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 4;
        win.margins = 12;

        var tabs = null;
        if (engines.length === 1) {
            engines[0].error = engines[0].addRows(win);
            if (engines[0].error) { alert(engines[0].error); return; }
        } else {
            tabs = win.add("tabbedpanel");
            tabs.alignChildren = "fill";
            for (var i = 0; i < engines.length; i++) {
                var page = tabs.add("tab", undefined, engines[i].label);
                page.orientation = "column";
                page.alignChildren = "fill";
                page.spacing = 4;
                engines[i].error = engines[i].addRows(page);
                if (engines[i].error) {
                    page.enabled = false;
                    page.helpTip = engines[i].error;
                }
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

        var tabIndex = 0;
        if (tabs !== null) {
            try {
                var savedTab = parseInt(app.preferences.getStringPreference(tabPrefKey), 10);
                if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
            } catch (tabError) {}
            if (engines[tabIndex].error) {
                for (var j = 0; j < engines.length; j++) if (!engines[j].error) { tabIndex = j; break; }
            }
            if (engines[tabIndex].error) { alert(engines[tabIndex].error); return; }
            tabs.selection = tabIndex;
            tabs.onChange = function() {
                // Tab에는 index가 없어 제목으로 찾는다
                var next = tabIndex;
                for (var k = 0; k < engines.length; k++) {
                    if (tabs.selection && tabs.selection.text === engines[k].label) next = k;
                }
                if (next === tabIndex) return;
                if (engines[next].error) {
                    tabs.selection = tabIndex;
                    alert(engines[next].error);
                    return;
                }
                engines[tabIndex].clearPreview();
                tabIndex = next;
                engines[tabIndex].setPreview(previewCheck.value);
            };
        }
        previewCheck.onClick = function() { engines[tabIndex].setPreview(previewCheck.value); };
        okButton.onClick = function() {
            if (!engines[tabIndex].commit()) return;
            if (tabs !== null) {
                try { app.preferences.setStringPreference(tabPrefKey, String(tabIndex)); } catch (saveError) {}
            }
            win.close(1);
        };
        cancelButton.onClick = function() { win.close(0); };

        // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
        win.onShow = function() { engines[tabIndex].setPreview(previewCheck.value); };
        if (typeof bindTabOrder === "function") bindTabOrder(win);
        if (win.show() !== 1) engines[tabIndex].clearPreview();
        try { app.redraw(); } catch (redrawError) {}
    }

    // ==== 폼 탭 공용 부품 ====
    // spec: label(탭 이름), name(그룹 이름), prefKey, controls[], draw(tools, o), check()→오류문(선택)
    // 컨트롤: {panel: "제목"} 새 패널 / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운
    // 위치 패널(가로·세로 이동)은 끝에 저절로 붙고, 이동은 다시 그리지 않고 그룹만 옮긴다.
    // draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "위치"},
            {key: "offsetX", label: "가로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 0},
            {key: "offsetY", label: "세로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 1}
        ]);
        var o = {};
        var group = null, committed = false, previewOn = true, center = [0, 0];

        function addRows(page) {
            if (spec.check) {
                var problem = spec.check();
                if (problem) return problem;
            }
            try { center = doc.activeView.centerPoint; } catch (viewError) {}
            for (var i = 0; i < controls.length; i++) if (controls[i].key) o[controls[i].key] = controls[i].value;
            loadSettings();
            var panel = page, checkRow = null;
            for (var c = 0; c < controls.length; c++) {
                var ctl = controls[c];
                if (ctl.panel) {
                    panel = page.add("panel", undefined, ctl.panel);
                    panel.alignChildren = ["left", "top"];
                    panel.margins = [12, 16, 12, 10];
                    panel.spacing = 4;
                    checkRow = null;
                } else if (ctl.check) {
                    if (checkRow === null || checkRow.children.length >= 3) checkRow = panel.add("group");
                    addCheck(checkRow, ctl);
                } else {
                    checkRow = null;
                    if (ctl.items) addChoice(panel, ctl); else addNumber(panel, ctl);
                }
            }
            api.setPreview = function(on) { previewOn = on; redraw(); };
            api.updatePreview = redraw;
            api.clearPreview = function() { if (!committed) removeGroup(); };
            api.commit = function() {
                if (group === null) build();
                if (group === null) return false;
                saveSettings();
                committed = true;
                doc.selection = null;
                group.selected = true;
                return true;
            };
            return null;
        }

        function addNumber(panel, ctl) {
            var decimals = ctl.step < 0.1 ? 2 : (ctl.step < 1 ? 1 : 0);
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + (ctl.unit ? " (" + ctl.unit + "):" : ":")).preferredSize.width = 100;
            var input = row.add("edittext", undefined, formFormat(o[ctl.key], decimals));
            input.characters = 6;
            var bar = row.add("scrollbar", undefined, o[ctl.key], ctl.min, ctl.max);
            bar.stepdelta = ctl.step;
            bar.jumpdelta = ctl.step * 10;
            bar.preferredSize.width = 196;
            var reset = row.add("button", undefined, "R");
            reset.preferredSize.width = 34;
            reset.helpTip = "처음 값으로 되돌리기";
            function apply(value) {
                if (isNaN(value)) value = o[ctl.key];
                value = Math.round(value / ctl.step) * ctl.step;
                value = Math.max(ctl.min, Math.min(ctl.max, Number(value.toFixed(decimals))));
                var delta = value - o[ctl.key];
                o[ctl.key] = value;
                input.text = formFormat(value, decimals);
                try { bar.value = value; } catch (e) {}
                if (delta === 0) return;
                if (ctl.move !== undefined) {
                    if (group !== null) {
                        try { group.translate(ctl.move === 0 ? delta * FORM_MM : 0, ctl.move === 1 ? delta * FORM_MM : 0); } catch (e2) {}
                        app.redraw();
                    }
                } else redraw();
            }
            bar.onChanging = function() { apply(bar.value); };
            bar.onChange = function() { apply(bar.value); };
            reset.onClick = function() { apply(ctl.value); };
            input.onChange = function() { apply(parseFloat(String(input.text).replace(",", "."))); };
        }

        function addChoice(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            // order: 목록에 보이는 순서 → 값 번호 (화살촉 모양은 1 작살형, 2 제비꼬리, 3 삼각형, 4 꺾쇠 순으로 보인다)
            var order = ctl.order || null, shown = [], pos = o[ctl.key], k;
            for (k = 0; k < ctl.items.length; k++) shown.push(order ? ctl.items[order[k]] : ctl.items[k]);
            if (order) for (k = 0; k < order.length; k++) if (order[k] === o[ctl.key]) pos = k;
            var list = row.add("dropdownlist", undefined, shown);
            list.selection = pos;
            list.onChange = function() {
                if (list.selection === null) { list.selection = pos; return; }
                pos = list.selection.index;
                o[ctl.key] = order ? order[pos] : pos;
                redraw();
            };
        }

        function addCheck(row, ctl) {
            var box = row.add("checkbox", undefined, ctl.check);
            box.value = o[ctl.key];
            box.onClick = function() { o[ctl.key] = box.value; redraw(); };
        }

        function redraw() {
            removeGroup();
            if (previewOn) build();
            app.redraw();
        }

        function build() {
            var layer = doc.activeLayer;
            if (layer.locked || !layer.visible) {
                for (var i = 0; i < doc.layers.length; i++) {
                    if (!doc.layers[i].locked && doc.layers[i].visible) { layer = doc.layers[i]; break; }
                }
            }
            group = layer.groupItems.add();
            group.name = spec.name;
            try {
                spec.draw(makeFormTools(group, o), o);
                var b = group.geometricBounds;
                group.translate(center[0] - (b[0] + b[2]) / 2 + o.offsetX * FORM_MM,
                    center[1] - (b[1] + b[3]) / 2 + o.offsetY * FORM_MM);
            } catch (e) {
                removeGroup();
                alert("그리지 못했습니다: " + e);
            }
        }

        function removeGroup() {
            if (group === null) return;
            try { group.remove(); } catch (e) {}
            group = null;
        }

        function saveSettings() {
            var parts = ["v1"];
            for (var i = 0; i < controls.length; i++) {
                var ctl = controls[i];
                if (!ctl.key) continue;
                parts.push(ctl.check ? (o[ctl.key] ? "1" : "0") : String(o[ctl.key]));
            }
            try { app.preferences.setStringPreference(spec.prefKey, parts.join("|")); } catch (e) {}
        }

        // 태그·개수가 맞고 모든 값이 범위 안일 때만 복원한다
        function loadSettings() {
            var raw = "";
            try { raw = app.preferences.getStringPreference(spec.prefKey); } catch (e) { return; }
            if (!raw) return;
            var p = String(raw).split("|");
            var keyed = [];
            for (var i = 0; i < controls.length; i++) if (controls[i].key) keyed.push(controls[i]);
            if (p[0] !== "v1" || p.length !== keyed.length + 1) return;
            var values = [];
            for (var k = 0; k < keyed.length; k++) {
                var ctl = keyed[k], text = p[k + 1];
                if (ctl.check) {
                    if (text !== "0" && text !== "1") return;
                    values.push(text === "1");
                } else {
                    var value = Number(text);
                    if (text === "" || isNaN(value)) return;
                    if (ctl.items ? (value !== Math.floor(value) || value < 0 || value >= ctl.items.length)
                        : (value < ctl.min || value > ctl.max)) return;
                    values.push(value);
                }
            }
            for (var n = 0; n < keyed.length; n++) o[keyed[n].key] = values[n];
        }
        return api;
    }

    function formFormat(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    // 끝 tip, 방향 단위 벡터 d, 배율 k(카탈로그 1pt가 k)로 shape 모양의 점들
    function catalogPoints(shape, tip, d, k) {
        var n = [-d[1], d[0]];
        var poly = HEAD_CATALOG[shape].poly;
        var out = [];
        for (var i = 0; i < poly.length; i++) {
            out.push([tip[0] - d[0] * poly[i][1] * k + n[0] * poly[i][0] * k, tip[1] - d[1] * poly[i][1] * k + n[1] * poly[i][0] * k]);
        }
        return out;
    }

    // 그리기 도구. 좌표는 pt, 크기 인자는 따로 적지 않으면 pt다
    function makeFormTools(g, o) {
        var t = {mm: FORM_MM, group: g};
        t.gray = formGray;
        t.path = function(points, closed, fillK, strokeK, width, dashes) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fillK, strokeK, width, dashes);
            return p;
        };
        t.line = function(a, b, width, k, dashes) {
            return t.path([a, b], false, null, k === undefined ? 100 : k, width, dashes);
        };
        t.rect = function(left, top, right, bottom, fillK, strokeK, width) {
            return t.path([[left, top], [right, top], [right, bottom], [left, bottom]], true, fillK, strokeK, width);
        };
        t.circle = function(cx, cy, r, fillK, strokeK, width) {
            var p = g.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
            formPaint(p, fillK, strokeK, width);
            return p;
        };
        // 점들을 지나는 매끈한 곡선 (Catmull-Rom → 베지어)
        t.smooth = function(points, closed, fillK, strokeK, width) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            var n = points.length;
            for (var i = 0; i < n; i++) {
                var prev = points[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
                var next = points[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
                var dx = (next[0] - prev[0]) / 6, dy = (next[1] - prev[1]) / 6;
                p.pathPoints[i].leftDirection = [points[i][0] - dx, points[i][1] - dy];
                p.pathPoints[i].rightDirection = [points[i][0] + dx, points[i][1] + dy];
            }
            p.closed = !!closed;
            formPaint(p, fillK, strokeK, width);
            return p;
        };
        // a → b 화살표. 촉 모양은 o.headShape(0 삼각형, 1 꺾쇠, 2 제비꼬리, 3 작살형), 크기는 o.headSize(%): 삼각형 머리 길이가 headLength × 크기이고 다른 모양도 같은 배율을 쓴다.
        // 선은 머리 속(lineEnd)에서 끝나 틈이 없다
        t.arrow = function(a, b, width, k, headLength) {
            if (k === undefined) k = 100;
            var scale = o && o.headSize ? o.headSize / 100 : 1;
            var shape = o && o.headShape ? o.headShape : 0;
            var head = (headLength || 1.6 * FORM_MM) * scale;
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var ux = dx / len, uy = dy / len;
            if (head > len) head = len;
            var unit = head / HEAD_CATALOG[0].length;
            var lineEnd = HEAD_CATALOG[shape].lineEnd * unit;
            if (len > lineEnd) t.line(a, [b[0] - ux * lineEnd, b[1] - uy * lineEnd], width, k);
            t.path(catalogPoints(shape, b, [ux, uy], unit), true, k, null, 0);
        };
        // (x, y)가 글자 가운데(align "left"면 왼쪽 끝, "right"면 오른쪽 끝). sub: 글자 뒤 숫자를 아래 첨자로
        t.text = function(text, x, y, size, align, k, sub) {
            var frame = g.textFrames.add();
            frame.contents = String(text).replace(/°/g, "˘");
            var range = frame.textRange;
            range.characterAttributes.size = size;
            range.characterAttributes.fillColor = formGray(k === undefined ? 100 : k);
            formFonts(frame, sub);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
            return frame;
        };
        return t;
    }

    function formPaint(p, fillK, strokeK, width, dashes) {
        p.filled = fillK !== null && fillK !== undefined;
        if (p.filled) p.fillColor = formGray(fillK);
        p.stroked = strokeK !== null && strokeK !== undefined && width > 0;
        if (p.stroked) {
            p.strokeColor = formGray(strokeK);
            p.strokeWidth = width;
            p.strokeDashes = dashes || [];
        }
    }

    // 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt) — 02_문자/한글·영문 서체 적용.jsx 규칙
    function formFonts(frame, sub) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
                attributes.textFont = FORM_KOR_FONT;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = FORM_ENG_FONT;
                attributes.baselineShift = 0.5;
                if (sub && code >= 48 && code <= 57 && i > 0 && /[A-Za-z)]/.test(text.charAt(i - 1))) {
                    attributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                } else if (sub && code >= 48 && code <= 57 && i > 0 && /[0-9]/.test(text.charAt(i - 1))
                    && frame.textRange.characters[i - 1].characterAttributes.baselinePosition === FontBaselineOption.SUBSCRIPT) {
                    attributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                }
            }
        }
    }

    function formFindFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100) 회색. RGB 문서면 같은 밝기의 회색으로
    function formGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 0; cmyk.yellow = 0; cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value; rgb.green = value; rgb.blue = value;
        return rgb;
    }
})();
