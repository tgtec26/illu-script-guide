// Object_PlateBoundary.jsx
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


// 판의 경계: 화면 가운데에 판 경계 모식도를 그린다. 장면은 도형(점 목록·K)·화살표·글자 목록으로 계산한 뒤 그대로 그린다.
//   - 발산형: 해양판 두 장이 가운데 해령에서 멀어지고, 그 아래에서 마그마가 올라온다.
//   - 섭입형(수렴): 왼쪽 해양판이 해구에서 '섭입 각'으로 대륙판 밑으로 내려가고, 대륙판 위에 화산과 그 아래 마그마.
//   - 충돌형(수렴): 대륙판 두 장이 부딪쳐 가운데가 솟아 습곡 산맥이 되고 아래로 뿌리가 깊어진다.
//   - 보존형: 위에서 본 모습. 어긋난 해령 두 토막 사이를 변환 단층이 잇고, 단층 양쪽 판이 서로 반대로 움직인다.
//   - 맨틀 대류 화살표를 켜면 맨틀에 올라오거나 내려가는 흐름을 넣는다(발산형·섭입형).

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectPlateBoundary/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var ARROW_WIDTH_PT = 1;
    var HEAD_LENGTH = 2 * MM;
    var HEAD_WIDTH = 1.6 * MM;
    var OCEAN_K = 25;
    var CONTINENT_K = 45;
    var CONTINENT2_K = 35;
    var MANTLE_K = 8;
    var MAGMA_K = 65;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["발산형", "섭입형", "충돌형", "보존형"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var WIDTH_RANGE = [40, 250];
    var THICK_RANGE = [3, 40];
    var DIP_RANGE = [15, 70];
    var RELIEF_RANGE = [0, 40];
    var MANTLE_RANGE = [0, 80];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 1;
    var widthMm = 120;
    var thickMm = 8;
    var dip = 35;
    var reliefMm = 8;
    var mantleMm = 25;
    var convectionOn = true;
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
    var dlg = new Window("dialog", "판의 경계");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    addRadioRow(shapePanel, "종류", KINDS, kind, function(i) { kind = i; syncEnabled(); updatePreview(); });
    var widthRow = addValueRow(shapePanel, "너비", "mm", widthMm, WIDTH_RANGE[0], WIDTH_RANGE[1], 1, 0);
    var thickRow = addValueRow(shapePanel, "판 두께", "mm", thickMm, THICK_RANGE[0], THICK_RANGE[1], 0.5, 1);
    var dipRow = addValueRow(shapePanel, "섭입 각", "°", dip, DIP_RANGE[0], DIP_RANGE[1], 1, 0);
    var reliefRow = addValueRow(shapePanel, "지형 높이", "mm", reliefMm, RELIEF_RANGE[0], RELIEF_RANGE[1], 0.5, 1);
    reliefRow.input.helpTip = "해령·화산·습곡 산맥 높이";
    var mantleRow = addValueRow(shapePanel, "맨틀 두께", "mm", mantleMm, MANTLE_RANGE[0], MANTLE_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var convectionCheck = checkRow.add("checkbox", undefined, "맨틀 대류 화살표");
    var labelsCheck = checkRow.add("checkbox", undefined, "이름");
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

    convectionCheck.value = convectionOn;
    labelsCheck.value = labelsOn;
    syncEnabled();
    convectionCheck.onClick = function() { convectionOn = convectionCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(thickRow, function() { return thickMm; }, function(v) { thickMm = v; });
    bindValueRow(dipRow, function() { return dip; }, function(v) { dip = v; });
    bindValueRow(reliefRow, function() { return reliefMm; }, function(v) { reliefMm = v; });
    bindValueRow(mantleRow, function() { return mantleMm; }, function(v) { mantleMm = v; });
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
        setRowEnabled(dipRow, kind === 1);
        setRowEnabled(thickRow, kind !== 3);
        setRowEnabled(mantleRow, kind !== 3);
        convectionCheck.enabled = kind === 0 || kind === 1;
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
        previewGroup.name = "판의 경계 (" + KINDS[kind] + ")";
        var scene = plateScene(kind, widthMm * MM, thickMm * MM, dip, reliefMm * MM, mantleMm * MM, convectionOn);
        for (var i = 0; i < scene.shapes.length; i++) {
            var s = scene.shapes[i];
            var shape = s.smooth ? drawBezier(previewGroup, smoothClosedPoints(s.points), true) : addPolygon(s.points, s.k, s.name);
            styleFace(shape, s.k);
            shape.name = s.name;
        }
        for (var l = 0; l < scene.lines.length; l++) {
            var line = addLine(scene.lines[l].points, scene.lines[l].dashed ? [2, 1.5] : null, scene.lines[l].name);
            line.strokeWidth = scene.lines[l].width || LINE_WIDTH_PT;
        }
        for (var a = 0; a < scene.arrows.length; a++) {
            var arrow = scene.arrows[a];
            var path = drawBezier(previewGroup, arrow.length > 2 ? smoothPoints(arrow) : cornerPoints(arrow), false);
            styleLine(path, ARROW_WIDTH_PT, null);
            path.name = "화살표";
            var p = arrow[arrow.length - 2], q = arrow[arrow.length - 1];
            addHead(q, q[0] - p[0], q[1] - p[1]);
        }
        if (labelsOn) {
            for (var t = 0; t < scene.labels.length; t++) {
                var label = addText(scene.labels[t].text, scene.labels[t].p[0], scene.labels[t].p[1], 0);
                if (scene.labels[t].white) label.textRange.characterAttributes.fillColor = makeGray(0);
            }
        }
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    // 닫힌 점 목록을 캣멀–롬으로 부드럽게 (마그마처럼 모양이 둥근 도형)
    function smoothClosedPoints(list) {
        var points = [];
        var n = list.length;
        for (var i = 0; i < n; i++) {
            var prev = list[(i - 1 + n) % n], next = list[(i + 1) % n], p = list[i];
            var d = [(next[0] - prev[0]) / 6, (next[1] - prev[1]) / 6];
            points.push({anchor: p, left: [p[0] - d[0], p[1] - d[1]], right: [p[0] + d[0], p[1] + d[1]]});
        }
        return points;
    }

    // -------------------------------------------------------
    // 장면 (순수 계산, 지표 가운데 (0, 0), 아래가 −)
    // -------------------------------------------------------
    // {shapes: [{points, k, name, smooth}], lines: [{points, name, dashed, width}], arrows: [점 목록], labels: [{text, p, white}]}
    function plateScene(kindIndex, W, t, dipDeg, relief, mantle, convection) {
        var scene = {shapes: [], lines: [], arrows: [], labels: []};
        var gap = Math.max(relief, t) * 0.6 + 3 * MM;
        if (kindIndex !== 3 && mantle > 0) {
            var bottom = kindIndex === 2 ? -t * 1.8 : -t;
            scene.shapes.push({points: [[-W / 2, bottom], [W / 2, bottom], [W / 2, bottom - mantle], [-W / 2, bottom - mantle]], k: MANTLE_K, name: "맨틀"});
            scene.labels.push({text: "맨틀", p: [W * 0.38, bottom - mantle / 2]});
        }
        if (kindIndex === 0) divergent(scene, W, t, relief, mantle, convection, gap);
        if (kindIndex === 1) subduction(scene, W, t, dipDeg, relief, mantle, convection, gap);
        if (kindIndex === 2) collision(scene, W, t, relief, gap);
        if (kindIndex === 3) transform(scene, W, t, gap);
        return scene;
    }

    function divergent(scene, W, t, relief, mantle, convection, gap) {
        var g = Math.max(t * 0.12, 0.5 * MM);
        function top(x) {
            var u = Math.max(0, 1 - Math.abs(x) / (W * 0.3));
            return relief * u * u;
        }
        for (var side = -1; side <= 1; side += 2) {
            var points = [];
            for (var i = 0; i <= 12; i++) {
                var x = side * (g + (W / 2 - g) * i / 12);
                points.push([x, top(x)]);
            }
            points.push([side * W / 2, -t]);
            points.push([side * g, -t]);
            scene.shapes.push({points: points, k: OCEAN_K, name: "해양판"});
            scene.arrows.push([[side * W * 0.12, relief + gap * 0.5], [side * W * 0.32, relief + gap * 0.5]]);
            scene.labels.push({text: "해양판", p: [side * W * 0.3, -t / 2]});
        }
        var depth = -t - mantle * 0.7;
        scene.shapes.push({points: [[-g * 3, depth], [-g, top(0) * 0.9], [g, top(0) * 0.9], [g * 3, depth]], k: MAGMA_K, name: "마그마", smooth: true});
        scene.labels.push({text: "해령", p: [0, relief + gap * 1.3]});
        if (convection && mantle > 0) {
            for (var s = -1; s <= 1; s += 2) {
                var y0 = -t - mantle * 0.85, y1 = -t - mantle * 0.2;
                scene.arrows.push([[s * W * 0.3, y0], [s * W * 0.1, y0 + (y1 - y0) * 0.15], [s * W * 0.06, y1]]);
            }
        }
    }

    function subduction(scene, W, t, dipDeg, relief, mantle, convection, gap) {
        var a = dipDeg * Math.PI / 180;
        var d = [Math.cos(a), -Math.sin(a)], n = [-Math.sin(a), -Math.cos(a)];
        var x0 = -W * 0.08, trench = Math.max(1 * MM, t * 0.3);
        var C = [x0, -trench];
        // 섭입 판의 아래 모서리가 맨틀 바닥(−t − mantle)을 넘지 않게
        var L = Math.max(t, Math.min((t + mantle - trench - t * Math.cos(a)) / Math.sin(a), W / 2 / Math.cos(a)));
        var D = [C[0] + d[0] * L, C[1] + d[1] * L];
        // 해양판: 수평 구간 → 해구 → 섭입 판
        var bend = t * 1.2;
        scene.shapes.push({points: [[-W / 2, 0], [x0 - bend, 0], C, D, [D[0] + n[0] * t, D[1] + n[1] * t],
            [C[0] + n[0] * t, C[1] + n[1] * t], [x0 - bend, -t], [-W / 2, -t]], k: OCEAN_K, name: "해양판"});
        // 대륙판: 섭입 판 위에 얹힘. 바닥 −1.8t에서 섭입 판 윗면을 따라 해구로
        var baseY = -t * 1.8;
        var meet = C[0] + (C[1] - baseY) / Math.tan(a);
        var xv = x0 + (meet - x0) * 0.75 + W * 0.05;
        var vw = Math.max(relief * 1.2, 4 * MM);
        scene.shapes.push({points: [C, [x0 + t * 0.4, 0], [xv - vw, 0], [xv - vw * 0.12, relief], [xv + vw * 0.12, relief], [xv + vw, 0],
            [W / 2, 0], [W / 2, baseY], [meet, baseY]], k: CONTINENT_K, name: "대륙판"});
        // 마그마: 섭입 판 윗면(대륙판 바닥보다 깊은 곳)에서 화산 아래로
        var s = (-baseY + t * 0.8 + C[1]) / Math.sin(a);
        var source = [C[0] + d[0] * s, C[1] + d[1] * s];
        scene.shapes.push({points: [source, [xv - vw * 0.08, relief * 0.85], [xv + vw * 0.08, relief * 0.85], [source[0] + t * 0.4, source[1]]], k: MAGMA_K, name: "마그마"});
        scene.arrows.push([[-W * 0.42, gap * 0.5], [-W * 0.22, gap * 0.5]]);
        scene.arrows.push([[W * 0.44, relief + gap * 0.5], [W * 0.3, relief + gap * 0.5]]);
        scene.arrows.push([[C[0] + d[0] * L * 0.35 + n[0] * t / 2, C[1] + d[1] * L * 0.35 + n[1] * t / 2], [C[0] + d[0] * L * 0.6 + n[0] * t / 2, C[1] + d[1] * L * 0.6 + n[1] * t / 2]]);
        scene.labels.push({text: "해구", p: [x0, gap * 1.3]});
        scene.labels.push({text: "해양판", p: [-W * 0.32, -t / 2]});
        scene.labels.push({text: "대륙판", p: [W * 0.36, baseY / 2], white: true});
        scene.labels.push({text: "화산", p: [xv, relief + gap * 1.3]});
        if (convection && mantle > 0) {
            var y0 = -t - mantle * 0.25, y1 = -t - mantle * 0.85;
            scene.arrows.push([[-W * 0.4, y0], [-W * 0.3, y1 + (y0 - y1) * 0.2], [-W * 0.15, y1]]);
        }
    }

    function collision(scene, W, t, relief, gap) {
        var width = W * 0.14;
        function bell(x) { return Math.exp(-(x / width) * (x / width)); }
        var base = -t * 1.8, root = t * 1.2;
        for (var side = -1; side <= 1; side += 2) {
            var points = [];
            for (var i = 0; i <= 16; i++) {
                var x = side * W / 2 * i / 16;
                points.push([x, relief * bell(x)]);
            }
            for (var j = 16; j >= 0; j--) {
                var xb = side * W / 2 * j / 16;
                points.push([xb, base - root * bell(xb)]);
            }
            scene.shapes.push({points: points, k: side < 0 ? CONTINENT_K : CONTINENT2_K, name: "대륙판"});
            scene.arrows.push([[side * W * 0.45, relief * 0.2 + gap * 0.5], [side * W * 0.27, relief * 0.2 + gap * 0.5]]);
            scene.labels.push({text: "대륙판", p: [side * W * 0.34, base / 2], white: side < 0});
        }
        scene.labels.push({text: "습곡 산맥", p: [0, relief + gap * 1.2]});
    }

    // 위에서 본 모습: 가운데 가로 단층, 왼쪽 위·오른쪽 아래 해령 토막
    function transform(scene, W, t, gap) {
        var h = W * 0.3, a = W * 0.2;
        scene.shapes.push({points: [[-W / 2, h], [W / 2, h], [W / 2, -h], [-W / 2, -h]], k: OCEAN_K, name: "해양판"});
        var ridgeGap = 1.2 * MM;
        for (var s = -1; s <= 1; s += 2) {
            var x = s * a, y1 = -s * h;
            scene.lines.push({points: [[x - ridgeGap / 2, 0], [x - ridgeGap / 2, y1]], name: "해령", width: 1});
            scene.lines.push({points: [[x + ridgeGap / 2, 0], [x + ridgeGap / 2, y1]], name: "해령", width: 1});
            // 해령 바깥 단열대(파선)
            scene.lines.push({points: [[x, 0], [s * W / 2, 0]], name: "단열대", dashed: true});
            // 해령에서 양쪽으로 멀어지는 판
            var ya = -s * h * 0.55;
            scene.arrows.push([[x + ridgeGap * 2, ya], [x + W * 0.12, ya]]);
            scene.arrows.push([[x - ridgeGap * 2, ya], [x - W * 0.12, ya]]);
            scene.labels.push({text: "해령", p: [x, -s * (h + gap * 0.6)]});
        }
        scene.lines.push({points: [[-a, 0], [a, 0]], name: "변환 단층", width: 1.5});
        scene.labels.push({text: "변환 단층", p: [0, -gap * 0.8]});
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", kind, widthMm, thickMm, dip, reliefMm, mantleMm, convectionOn ? "1" : "0", labelsOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 13) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        widthMm = restoreNumber(p[2], widthMm, WIDTH_RANGE, 1);
        thickMm = restoreNumber(p[3], thickMm, THICK_RANGE, 0.5);
        dip = restoreNumber(p[4], dip, DIP_RANGE, 1);
        reliefMm = restoreNumber(p[5], reliefMm, RELIEF_RANGE, 0.5);
        mantleMm = restoreNumber(p[6], mantleMm, MANTLE_RANGE, 1);
        convectionOn = p[7] === "1";
        labelsOn = p[8] === "1";
        fontPt = restoreNumber(p[9], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[10], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[11], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[12] === "1";
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

        function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
    }

        // 점 목록을 캣멀–롬 곡선으로 잇는 베지어 점 (양 끝 손잡이는 없음)
    function smoothPoints(list) {
        var points = [];
        for (var i = 0; i < list.length; i++) {
            var prev = list[Math.max(0, i - 1)], next = list[Math.min(list.length - 1, i + 1)];
            var d = [(next[0] - prev[0]) / 6, (next[1] - prev[1]) / 6];
            var p = list[i];
            points.push({
                anchor: p,
                left: i === 0 ? p : [p[0] - d[0], p[1] - d[1]],
                right: i === list.length - 1 ? p : [p[0] + d[0], p[1] + d[1]]
            });
        }
        return points;
    }

        // 꺾은선 점 목록 → 손잡이 없는 베지어 점
    function cornerPoints(list) {
        var points = [];
        for (var i = 0; i < list.length; i++) points.push({anchor: list[i], left: list[i], right: list[i]});
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

        function addPolygon(points, k, name, container) {
        var shape = (container || previewGroup).pathItems.add();
        shape.setEntirePath(points);
        shape.closed = true;
        styleFace(shape, k);
        shape.name = name;
        return shape;
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
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
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

        // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는
    // GSMediumB1(기준선 +0.5pt). 항목 기호 (가)(나)는 바탕 1.25배, ㉠·ⓐ는 바탕 1.125배 (8pt 기준 10pt·9pt).
    // 크기를 정한 뒤에 부른다
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            var bracket = batangFont !== null && isBracketLabel(text, i);
            if (bracket || (batangFont !== null && isCircledLabel(code))) {
                attributes.textFont = batangFont;
                attributes.size = attributes.size * (bracket ? 1.25 : 1.125);
                attributes.baselineShift = 0;
            } else if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    // i번째 글자가 "(한글 한 글자)" 세 글자 안에 드는가
    function isBracketLabel(text, i) {
        for (var start = i - 2; start <= i; start++) {
            if (start < 0 || start + 2 >= text.length) continue;
            var inner = text.charCodeAt(start + 1);
            if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return true;
        }
        return false;
    }

    // ㉠㉡… ⓐⓑ…
    function isCircledLabel(code) {
        return (code >= 0x3260 && code <= 0x327F) || (code >= 0x24D0 && code <= 0x24E9);
    }

    // 없으면 null (바탕이 없으면 항목 기호도 Spoqa로 둔다)
    function findOptionalFont(name) {
        try { return app.textFonts.getByName(name); } catch (e) { return null; }
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

        // 라벨 + 라디오 단추 행. 누르면 onPick(번호)
    function addRadioRow(parent, label, names, selected, onPick) {
        var row = parent.add("group");
        row.add("statictext", undefined, label + ":").preferredSize.width = LABEL_WIDTH;
        var radios = [];
        for (var i = 0; i < names.length; i++) {
            radios.push(row.add("radiobutton", undefined, names[i]));
            radios[i].onClick = (function(index) { return function() { onPick(index); }; })(i);
        }
        radios[selected].value = true;
        return radios;
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
