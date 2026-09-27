// Object_Net.jsx
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

// 전개도: 정육면체(11가지), 직육면체, 각기둥, 각뿔, 원기둥, 원뿔, 정사면체, 정팔면체, 정이십면체.
// 면을 다각형으로 만든 뒤 두 면이 나누는 모서리는 접는 선(점선), 한 면에만 있는 모서리는 바깥선으로 그린다.
// 선 두께는 평가원 그림 기준: 바깥선 0.8pt, 접는 선 0.4pt.
// 정십이면체는 접히는지 검증할 방법이 없어 뺐다. 정육면체 11가지는 tests/check-net.js에서 굴려 접어 확인한다.
// 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "Net/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var LABEL_WIDTH = 100;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var OUTLINE_PT = 0.8;
    var FOLD_PT = 0.4;
    var FOLD_DASH = [2, 1.5];
    var KINDS = ["정육면체", "직육면체", "각기둥", "각뿔", "원기둥", "원뿔", "정사면체", "정팔면체", "정이십면체"];
    // 각 종류가 쓰는 입력 (다이얼로그에서 나머지는 끈다)
    var USES = [
        ["net", "side"], ["side", "depth", "height"], ["count", "side", "height"], ["count", "side", "lateral"],
        ["radius", "height"], ["radius", "slant"], ["side"], ["side"], ["side"]
    ];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var layer = findEditableLayer();

    // 옵션 (길이는 mm)
    var kind = 0;
    var values = { net: 1, count: 4, side: 15, depth: 10, height: 20, lateral: 20, radius: 8, slant: 20 };
    var dashedFolds = true;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    applySettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "전개도");
    win.alignChildren = "fill";

    var kindRow = win.add("group");
    kindRow.add("statictext", undefined, "종류:");
    var kindList = kindRow.add("dropdownlist", undefined, KINDS);
    kindList.selection = kind;

    var sizePanel = addPanel(win, "크기");
    var rows = {
        net: addValueRow(sizePanel, "전개도 번호", "", values.net, 1, 11, 1, 0),
        count: addValueRow(sizePanel, "밑면 변 수", "", values.count, 3, 8, 1, 0),
        side: addValueRow(sizePanel, "한 변 · 가로", "mm", values.side, 3, 60, 0.5, 1),
        depth: addValueRow(sizePanel, "세로", "mm", values.depth, 3, 60, 0.5, 1),
        height: addValueRow(sizePanel, "높이", "mm", values.height, 3, 80, 0.5, 1),
        lateral: addValueRow(sizePanel, "옆모서리", "mm", values.lateral, 3, 80, 0.5, 1),
        radius: addValueRow(sizePanel, "반지름", "mm", values.radius, 2, 40, 0.5, 1),
        slant: addValueRow(sizePanel, "모선", "mm", values.slant, 3, 80, 0.5, 1)
    };
    rows.net.input.helpTip = "1~6: 1-4-1형, 7~9: 2-3-1형, 10: 2-2-2형, 11: 3-3형";
    var dashedCheck = sizePanel.add("checkbox", undefined, "접는 선 점선");
    var messageText = win.add("statictext", undefined, " ");
    messageText.preferredSize.width = 360;

    var positionPanel = addPanel(win, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}

    dashedCheck.value = dashedFolds;
    previewCheck.value = previewEnabled;
    refreshEnabled();

    kindList.onChange = function() {
        kind = kindList.selection ? kindList.selection.index : 0;
        refreshEnabled();
        updatePreview();
    };
    for (var key in rows) bindKeyRow(key);
    dashedCheck.onClick = function() { dashedFolds = dashedCheck.value; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
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

    function bindKeyRow(key) {
        bindValueRow(rows[key], function(value) { values[key] = value; });
    }

    function refreshEnabled() {
        for (var key in rows) {
            var used = false;
            for (var i = 0; i < USES[kind].length; i++) if (USES[kind][i] === key) used = true;
            rows[key].input.parent.enabled = used;
        }
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
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
    }

    function buildPreview() {
        var sizes = {};
        for (var key in values) sizes[key] = key === "net" || key === "count" ? values[key] : values[key] * MM_TO_PT;
        var net = buildNet(kind, sizes);
        messageText.text = net.message || " ";
        if (net.faces.length === 0 && net.circles.length === 0 && net.sectors.length === 0) return;
        var drawing = netLines(net);

        previewGroup = layer.groupItems.add();
        previewGroup.name = "전개도 (" + KINDS[kind] + ")";
        for (var i = 0; i < drawing.length; i++) addPath(drawing[i]);
        for (var c = 0; c < net.circles.length; c++) addCircle(net.circles[c]);
        var b = netBounds(net);
        previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
            viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
    }

    // line: {points:[{anchor,left,right}], closed, fold}
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
        path.closed = line.closed;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = line.fold ? FOLD_PT : OUTLINE_PT;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
        if (line.fold && dashedFolds) path.strokeDashes = FOLD_DASH;
    }

    function addCircle(circle) {
        var r = circle.radius;
        var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = OUTLINE_PT;
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
    // 기하 (일러 DOM을 쓰지 않는다 → tests/check-net.js). 길이는 pt
    // -------------------------------------------------------
    // 정육면체 전개도 11가지: 칸 [열, 행] 6개
    function cubeNets() {
        var nets = [];
        var ends = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]];   // 1-4-1형: 가운데 줄 4칸 위·아래 한 칸씩
        for (var i = 0; i < ends.length; i++) {
            nets.push([[ends[i][0], 0], [0, 1], [1, 1], [2, 1], [3, 1], [ends[i][1], 2]]);
        }
        for (var x = 1; x <= 3; x++) nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [x, 2]]);   // 2-3-1형
        nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]]);   // 2-2-2형
        nets.push([[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]);   // 3-3형
        return nets;
    }

    // {faces:[[점…] 반시계], circles:[{center,radius}], sectors:[{center,radius,start,sweep}], message}
    function buildNet(kindIndex, v) {
        var net = { faces: [], circles: [], sectors: [], message: "" };
        var s = v.side;
        if (kindIndex === 0) {
            var cells = cubeNets()[Math.max(0, Math.min(10, Math.round(v.net) - 1))];
            for (var i = 0; i < cells.length; i++) {
                var x = cells[i][0] * s, y = -cells[i][1] * s;
                net.faces.push(rect(x, y - s, s, s));
            }
        } else if (kindIndex === 1) {
            // 옆면 네 개(가로 a·세로 b·a·b) 한 줄, 첫 a 면의 위·아래에 윗면·밑면
            var a = s, b = v.depth, c = v.height, xs = [0, a, a + b, 2 * a + b, 2 * a + 2 * b];
            for (var k = 0; k < 4; k++) net.faces.push(rect(xs[k], 0, xs[k + 1] - xs[k], c));
            net.faces.push(rect(0, c, a, b));
            net.faces.push(rect(0, -b, a, b));
        } else if (kindIndex === 2) {
            var n = Math.round(v.count), h = v.height, middle = Math.floor((n - 1) / 2);
            for (var f = 0; f < n; f++) net.faces.push(rect(f * s, 0, s, h));
            net.faces.push(regularOnEdge([middle * s, h], [(middle + 1) * s, h], n));
            net.faces.push(regularOnEdge([(middle + 1) * s, 0], [middle * s, 0], n));
        } else if (kindIndex === 3) {
            var m = Math.round(v.count);
            var circumradius = s / (2 * Math.sin(Math.PI / m));
            if (v.lateral <= s / 2) {
                net.message = "옆모서리가 한 변의 절반보다 길어야 합니다";
                return net;
            }
            if (v.lateral <= circumradius) net.message = "옆모서리가 짧아 각뿔로 접히지 않습니다 (" + (circumradius / 2.834645669).toFixed(1) + "mm보다 길게)";
            var base = regularOnEdge([0, 0], [s, 0], m);
            net.faces.push(base);
            var slantHeight = Math.sqrt(v.lateral * v.lateral - s * s / 4);
            for (var e = 0; e < m; e++) {
                var p = base[e], q = base[(e + 1) % m];
                var outward = unit([q[1] - p[1], -(q[0] - p[0])]);
                var apex = offset(midpoint(p, q), outward, slantHeight);
                net.faces.push([q, p, apex]);
            }
        } else if (kindIndex === 4) {
            var r = v.radius, width = 2 * Math.PI * r;
            net.faces.push(rect(0, 0, width, v.height));
            net.circles.push({ center: [width / 2, v.height + r], radius: r });
            net.circles.push({ center: [width / 2, -r], radius: r });
        } else if (kindIndex === 5) {
            if (v.radius >= v.slant) {
                net.message = "모선이 반지름보다 길어야 합니다";
                return net;
            }
            var angle = 2 * Math.PI * v.radius / v.slant;
            net.sectors.push({ center: [0, 0], radius: v.slant, start: -Math.PI / 2 - angle / 2, sweep: angle });
            net.circles.push({ center: [0, -v.slant - v.radius], radius: v.radius });
        } else if (kindIndex === 6) {
            var center = regularOnEdge([s, 0], [0, 0], 3);   // 꼭짓점이 아래로 향한 가운데 삼각형
            net.faces.push(center);
            for (var t = 0; t < 3; t++) net.faces.push(regularOnEdge(center[(t + 1) % 3], center[t], 3));
        } else if (kindIndex === 7) {
            // 한 꼭짓점에 모인 네 면(부채 모양)과 그 바깥 변마다 한 면
            var ring = [];
            for (var j = 0; j <= 4; j++) {
                var theta = (210 - 60 * j) * Math.PI / 180;
                ring.push([s * Math.cos(theta), s * Math.sin(theta)]);
            }
            for (var g = 0; g < 4; g++) {
                var fan = ccw([[0, 0], ring[g], ring[g + 1]]);
                net.faces.push(fan);
                net.faces.push(attachOutside(fan, ring[g], ring[g + 1], 3));
            }
        } else if (kindIndex === 8) {
            // 삼각형 10개 띠와 위·아래 5개씩
            var hh = s * Math.sqrt(3) / 2;
            for (var u = 0; u < 5; u++) {
                var b0 = [u * s, 0], b1 = [(u + 1) * s, 0], t0 = [(u + 0.5) * s, hh], t1 = [(u + 1.5) * s, hh];
                net.faces.push([b0, b1, t0]);
                net.faces.push([t0, b1, t1]);
                net.faces.push(regularOnEdge(t0, t1, 3));
                net.faces.push(regularOnEdge(b1, b0, 3));
            }
        }
        return net;
    }

    // 모서리 → 바깥선(한 면에만) · 접는 선(두 면이 나눔). 바깥선은 이어지는 한 패스로 묶는다
    function netLines(net) {
        var edges = {}, order = [];
        for (var f = 0; f < net.faces.length; f++) {
            var face = net.faces[f];
            for (var i = 0; i < face.length; i++) {
                var a = face[i], b = face[(i + 1) % face.length];
                var key = edgeKey(a, b);
                if (!edges[key]) { edges[key] = { a: a, b: b, count: 0 }; order.push(key); }
                edges[key].count++;
            }
        }
        var lines = [], boundary = [];
        for (var k = 0; k < order.length; k++) {
            var edge = edges[order[k]];
            if (edge.count > 1) lines.push(straight([edge.a, edge.b], false, true));
            else boundary.push(edge);
        }
        var loops = chainLoops(boundary);
        if (loops === null) {
            for (var j = 0; j < boundary.length; j++) lines.push(straight([boundary[j].a, boundary[j].b], false, false));
        } else {
            for (var l = 0; l < loops.length; l++) lines.push(straight(loops[l], true, false));
        }
        for (var s = 0; s < net.sectors.length; s++) {
            var sector = net.sectors[s];
            var points = [{ anchor: sector.center, left: sector.center, right: sector.center }].concat(
                arcPoints(sector.center, sector.radius, sector.start, sector.sweep));
            lines.push({ points: points, closed: true, fold: false });
        }
        return lines;
    }

    // 바깥 모서리를 이어 닫힌 고리들로. 한 점에 모서리가 2개가 아니면 null (따로 그린다)
    function chainLoops(edges) {
        var at = {};
        for (var i = 0; i < edges.length; i++) {
            var ka = pointKey(edges[i].a), kb = pointKey(edges[i].b);
            (at[ka] = at[ka] || []).push(i);
            (at[kb] = at[kb] || []).push(i);
        }
        for (var key in at) if (at[key].length !== 2) return null;
        var used = [], loops = [];
        for (var start = 0; start < edges.length; start++) {
            if (used[start]) continue;
            var loop = [edges[start].a], current = start, point = edges[start].b;
            used[start] = true;
            while (pointKey(point) !== pointKey(loop[0])) {
                loop.push(point);
                var pair = at[pointKey(point)];
                current = used[pair[0]] ? pair[1] : pair[0];
                if (used[current]) return null;
                used[current] = true;
                point = pointKey(edges[current].a) === pointKey(point) ? edges[current].b : edges[current].a;
            }
            loops.push(loop);
        }
        return loops;
    }

    function netBounds(net) {
        var b = [Infinity, -Infinity, -Infinity, Infinity];   // left, top, right, bottom
        function add(x, y) {
            b[0] = Math.min(b[0], x); b[2] = Math.max(b[2], x);
            b[1] = Math.max(b[1], y); b[3] = Math.min(b[3], y);
        }
        for (var f = 0; f < net.faces.length; f++) for (var i = 0; i < net.faces[f].length; i++) add(net.faces[f][i][0], net.faces[f][i][1]);
        for (var c = 0; c < net.circles.length; c++) {
            var circle = net.circles[c];
            add(circle.center[0] - circle.radius, circle.center[1] - circle.radius);
            add(circle.center[0] + circle.radius, circle.center[1] + circle.radius);
        }
        for (var s = 0; s < net.sectors.length; s++) {
            var sector = net.sectors[s];
            add(sector.center[0], sector.center[1]);
            for (var t = 0; t <= 32; t++) {
                var angle = sector.start + sector.sweep * t / 32;
                add(sector.center[0] + sector.radius * Math.cos(angle), sector.center[1] + sector.radius * Math.sin(angle));
            }
        }
        return b;
    }

    function rect(x, y, w, h) {
        return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    }

    // 모서리 a→b의 왼쪽에 정n각형 (반시계)
    function regularOnEdge(a, b, n) {
        var points = [a, b], d = sub(b, a);
        for (var i = 2; i < n; i++) {
            var angle = 2 * Math.PI * (i - 1) / n;
            var step = [d[0] * Math.cos(angle) - d[1] * Math.sin(angle), d[0] * Math.sin(angle) + d[1] * Math.cos(angle)];
            var last = points[points.length - 1];
            points.push([last[0] + step[0], last[1] + step[1]]);
        }
        return points;
    }

    // 반시계 face의 모서리 p–q 바깥에 정n각형
    function attachOutside(face, p, q, n) {
        for (var i = 0; i < face.length; i++) {
            var a = face[i], b = face[(i + 1) % face.length];
            if (pointKey(a) === pointKey(p) && pointKey(b) === pointKey(q)) return regularOnEdge(q, p, n);
            if (pointKey(a) === pointKey(q) && pointKey(b) === pointKey(p)) return regularOnEdge(p, q, n);
        }
        return regularOnEdge(q, p, n);
    }

    function ccw(points) {
        var area = 0;
        for (var i = 0; i < points.length; i++) {
            var a = points[i], b = points[(i + 1) % points.length];
            area += a[0] * b[1] - b[0] * a[1];
        }
        return area < 0 ? points.slice().reverse() : points;
    }

    function straight(anchors, closed, fold) {
        var points = [];
        for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
        return { points: points, closed: closed, fold: fold };
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

    function pointKey(p) { return Math.round(p[0] * 100) + "," + Math.round(p[1] * 100); }
    function edgeKey(a, b) {
        var ka = pointKey(a), kb = pointKey(b);
        return ka < kb ? ka + "|" + kb : kb + "|" + ka;
    }
    function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
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
        row.add("statictext", undefined, label + (unitText ? " (" + unitText + "):" : ":")).preferredSize.width = LABEL_WIDTH;
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
        var parts = ["v1", kind, values.net, values.count, values.side, values.depth, values.height, values.lateral,
            values.radius, values.slant, dashedFolds ? "1" : "0", offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 14) return;
        kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
        values.net = Math.round(restoreNumber(p[2], values.net, 1, 11));
        values.count = Math.round(restoreNumber(p[3], values.count, 3, 8));
        values.side = restoreNumber(p[4], values.side, 3, 60);
        values.depth = restoreNumber(p[5], values.depth, 3, 60);
        values.height = restoreNumber(p[6], values.height, 3, 80);
        values.lateral = restoreNumber(p[7], values.lateral, 3, 80);
        values.radius = restoreNumber(p[8], values.radius, 2, 40);
        values.slant = restoreNumber(p[9], values.slant, 3, 80);
        dashedFolds = p[10] === "1";
        offsetXmm = restoreNumber(p[11], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[12], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        previewEnabled = p[13] === "1";
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }
})();
