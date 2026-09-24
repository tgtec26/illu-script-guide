// Object_MagneticField.jsx
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


// 자기장: 화면 가운데에 자기력선 모식도를 그린다.
//   - 막대자석: N극(진한 회색)·S극(연한 회색) 막대. 자기력선은 두 극을 +1, −1 점 극으로 둔 평면 자기장을 N극에서 따라가며
//     그리고, 막대 밖에 나온 구간만 남긴다. N극에서 나와 S극으로 들어가는 방향으로 화살촉.
//   - 직선 도선(단면): 위에서 본 도선(⊙ 나오는 전류 / ⊗ 들어가는 전류) 둘레 동심원. 멀수록 간격이 넓고,
//     오른손 법칙대로 ⊙이면 시계 반대, ⊗이면 시계 방향 화살촉.
//   - 코일: 옆에서 본 코일 단면(위 줄·아래 줄 도선이 서로 반대 기호). 안쪽은 나란한 직선, 바깥은 막대자석처럼 도는 자기력선.
//     위 줄이 ⊗이면 N극이 왼쪽, ⊙이면 오른쪽.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectMagneticField/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var HEAD_LENGTH = 1.4 * MM;
    var HEAD_WIDTH = 1 * MM;
    var NORTH_K = 60;
    var SOUTH_K = 10;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["막대자석", "직선 도선", "코일"];
    var CURRENTS = ["⊗ 들어감", "⊙ 나옴"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var LENGTH_RANGE = [10, 150];
    var THICK_RANGE = [3, 60];
    var LINES_RANGE = [2, 24];
    var RANGE_RANGE = [120, 400];
    var TURNS_RANGE = [2, 20];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var lengthMm = 40;
    var thickMm = 10;
    var lineCount = 10;
    var rangePct = 200;
    var turns = 8;
    var current = 0;
    var arrowsOn = true;
    var labelsOn = true;
    var fontPt = 10;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "자기장");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    addRadioRow(shapePanel, "종류", KINDS, kind, function(i) { kind = i; syncEnabled(); updatePreview(); });
    var lengthRow = addValueRow(shapePanel, "길이", "mm", lengthMm, LENGTH_RANGE[0], LENGTH_RANGE[1], 1, 0);
    lengthRow.input.helpTip = "직선 도선에서는 가장 바깥 동심원의 반지름";
    var thickRow = addValueRow(shapePanel, "두께", "mm", thickMm, THICK_RANGE[0], THICK_RANGE[1], 0.5, 1);
    thickRow.input.helpTip = "막대 폭 / 코일 지름";
    var turnsRow = addValueRow(shapePanel, "감은 수", "회", turns, TURNS_RANGE[0], TURNS_RANGE[1], 1, 0);
    var currentRadios = addRadioRow(shapePanel, "전류", CURRENTS, current, function(i) { current = i; updatePreview(); });
    currentRadios[0].helpTip = "코일은 위 줄 도선의 전류 방향";

    var fieldPanel = addPanel(dlg, "자기력선");
    var linesRow = addValueRow(fieldPanel, "선 수", "개", lineCount, LINES_RANGE[0], LINES_RANGE[1], 1, 0);
    var rangeRow = addValueRow(fieldPanel, "그리는 범위", "%", rangePct, RANGE_RANGE[0], RANGE_RANGE[1], 10, 0);
    rangeRow.input.helpTip = "막대·코일 길이에 대한 %. 이 범위 밖으로 나가는 선은 잘린다";
    var checkRow = fieldPanel.add("group");
    var arrowsCheck = checkRow.add("checkbox", undefined, "화살촉");
    var labelsCheck = checkRow.add("checkbox", undefined, "N·S 글자");
    var fontRow = addValueRow(fieldPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

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

    arrowsCheck.value = arrowsOn;
    labelsCheck.value = labelsOn;
    syncEnabled();
    arrowsCheck.onClick = function() { arrowsOn = arrowsCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    bindValueRow(lengthRow, function() { return lengthMm; }, function(v) { lengthMm = v; });
    bindValueRow(thickRow, function() { return thickMm; }, function(v) { thickMm = v; });
    bindValueRow(turnsRow, function() { return turns; }, function(v) { turns = v; });
    bindValueRow(linesRow, function() { return lineCount; }, function(v) { lineCount = v; });
    bindValueRow(rangeRow, function() { return rangePct; }, function(v) { rangePct = v; });
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
        setRowEnabled(thickRow, kind !== 1);
        setRowEnabled(turnsRow, kind === 2);
        setRowEnabled(rangeRow, kind !== 1);
        for (var i = 0; i < currentRadios.length; i++) currentRadios[i].enabled = kind !== 0;
        labelsCheck.enabled = kind !== 1;
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
        previewGroup.name = "자기장 (" + KINDS[kind] + ")";
        var length = lengthMm * MM, thick = thickMm * MM;
        if (kind === 1) {
            drawWire(length);
        } else {
            // 코일은 위 줄이 ⊗이면 N극이 왼쪽 (오른손 법칙)
            var northLeft = kind === 0 ? true : current === 0;
            var body = [length / 2, thick / 2];
            var lines = fieldLines(length, kind === 0 ? 0.8 : 1, lineCount, rangePct / 100, body, northLeft);
            for (var i = 0; i < lines.length; i++) drawFieldLine(lines[i]);
            if (kind === 0) {
                drawMagnet(length, thick);
            } else {
                drawCoil(length, thick, northLeft);
            }
        }
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    function drawFieldLine(points) {
        var path = drawBezier(previewGroup, smoothPoints(points), false);
        styleLine(path, LINE_WIDTH_PT, null);
        path.name = "자기력선";
        if (!arrowsOn || points.length < 3) return;
        var m = Math.floor(points.length / 2);
        addHead(points[m], points[m + 1][0] - points[m - 1][0], points[m + 1][1] - points[m - 1][1]);
    }

    function drawMagnet(length, thick) {
        var north = previewGroup.pathItems.rectangle(thick / 2, -length / 2, length / 2, thick);
        styleFace(north, NORTH_K);
        north.name = "N극";
        var south = previewGroup.pathItems.rectangle(thick / 2, 0, length / 2, thick);
        styleFace(south, SOUTH_K);
        south.name = "S극";
        if (!labelsOn) return;
        // 호출 결과에 바로 .textRange...를 대입하면 일러스트레이터가 종료된다(확인됨). 변수에 담아 쓴다
        var northLabel = addText("N", -length / 4, 0, 0);
        northLabel.textRange.characterAttributes.fillColor = makeGray(0);
        addText("S", length / 4, 0, 0);
    }

    // 도선 단면 줄 두 개(위·아래 반대 기호), 안쪽 나란한 자기력선, 양 끝 N·S
    function drawCoil(length, thick, northLeft) {
        var d = Math.min(thick * 0.35, length / turns * 0.8);
        var inside = coilInsideLines(length, thick, Math.max(2, Math.round(lineCount / 3)), northLeft);
        for (var i = 0; i < inside.length; i++) drawFieldLine(inside[i]);
        for (var t = 0; t < turns; t++) {
            var x = -length / 2 + length * (t + 0.5) / turns;
            drawWireSymbol([x, thick / 2], d, current === 0);
            drawWireSymbol([x, -thick / 2], d, current !== 0);
        }
        if (!labelsOn) return;
        var gap = fontPt * 0.9;
        addText(northLeft ? "N" : "S", -length / 2 - gap, thick / 2 + gap, 0);
        addText(northLeft ? "S" : "N", length / 2 + gap, thick / 2 + gap, 0);
    }

    function drawWire(outer) {
        var radii = wireRadii(outer, lineCount);
        var outOfPage = current === 1;
        for (var i = 0; i < radii.length; i++) {
            var ring = previewGroup.pathItems.ellipse(radii[i], -radii[i], radii[i] * 2, radii[i] * 2);
            styleLine(ring, LINE_WIDTH_PT, null);
            ring.name = "자기력선";
            // 맨 위 점에서 나오는 전류면 왼쪽(시계 반대), 들어가는 전류면 오른쪽(시계 방향)으로
            if (arrowsOn) addHead([0, radii[i]], outOfPage ? -1 : 1, 0);
        }
        drawWireSymbol([0, 0], Math.min(4 * MM, radii[0] * 1.2), !outOfPage);
    }

    // 도선 단면: 흰 원 안에 ⊗(들어감)은 X, ⊙(나옴)은 점
    function drawWireSymbol(center, d, into) {
        addDisc(center, d, 0, into ? "도선 ⊗" : "도선 ⊙");
        if (into) {
            var s = d * 0.3;
            addLine([[center[0] - s, center[1] - s], [center[0] + s, center[1] + s]], null, "X");
            addLine([[center[0] - s, center[1] + s], [center[0] + s, center[1] - s]], null, "X");
        } else {
            var dot = addDisc(center, d * 0.3, 100, "점");
            dot.stroked = false;
        }
    }

    // -------------------------------------------------------
    // 기하 (순수 계산, 가운데 (0, 0))
    // -------------------------------------------------------
    // 점 극(+1, −1)이 만드는 평면 자기장 (1/r)
    function fieldAt(p, poles) {
        var fx = 0, fy = 0;
        for (var i = 0; i < poles.length; i++) {
            var dx = p[0] - poles[i].x, dy = p[1] - poles[i].y;
            var r2 = dx * dx + dy * dy;
            fx += poles[i].q * dx / r2;
            fy += poles[i].q * dy / r2;
        }
        return [fx, fy];
    }

    // RK4로 한 걸음(길이 h)씩 자기장 방향을 따라간다. S극에 닿거나 상자 밖으로 나가면 멈춘다
    function traceLine(start, poles, h, stopRadius, box) {
        function dir(p) {
            var f = fieldAt(p, poles);
            var n = Math.sqrt(f[0] * f[0] + f[1] * f[1]);
            return [f[0] / n, f[1] / n];
        }
        var points = [start];
        var p = start;
        for (var step = 0; step < 4000; step++) {
            var k1 = dir(p);
            var k2 = dir([p[0] + k1[0] * h / 2, p[1] + k1[1] * h / 2]);
            var k3 = dir([p[0] + k2[0] * h / 2, p[1] + k2[1] * h / 2]);
            var k4 = dir([p[0] + k3[0] * h, p[1] + k3[1] * h]);
            p = [p[0] + (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * h / 6, p[1] + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * h / 6];
            points.push(p);
            var south = poles[1];
            if (Math.sqrt((p[0] - south.x) * (p[0] - south.x) + (p[1] - south.y) * (p[1] - south.y)) < stopRadius) break;
            if (Math.abs(p[0]) > box[0] || Math.abs(p[1]) > box[1]) break;
        }
        return points;
    }

    // N극에서 S극 반대쪽으로 고르게 퍼지는 시작 각(S 쪽 ±25°는 뺀다)으로 선을 따라가고, 몸체(|x| < body[0], |y| < body[1])
    // 밖으로 처음 나온 뒤 다시 들어가기 전까지만 남긴다. 몸체 밖에 나오지 않는 선은 버린다. 점은 몇 걸음마다 하나씩.
    // 두 극의 세기가 같아 그림이 좌우 대칭이므로, 상자 밖으로 나간 선은 뒤집어 S극 쪽에 한 번 더 넣는다
    function fieldLines(length, poleRatio, count, range, body, northLeft) {
        var d = length / 2 * poleRatio;
        var sign = northLeft ? -1 : 1;
        var poles = [{x: sign * d, y: 0, q: 1}, {x: -sign * d, y: 0, q: -1}];
        var h = length / 150;
        var box = [length * range / 2, length * range / 2];
        var toSouth = northLeft ? 0 : Math.PI;
        var margin = 25 * Math.PI / 180;
        var lines = [];
        for (var i = 0; i < count; i++) {
            var angle = toSouth + margin + (2 * Math.PI - 2 * margin) * (count === 1 ? 0.5 : i / (count - 1));
            var start = [poles[0].x + h * Math.cos(angle), h * Math.sin(angle)];
            var trace = traceLine(start, poles, h * 1.5, h, box);
            var kept = [], state = 0;
            for (var j = 0; j < trace.length; j++) {
                var inside = Math.abs(trace[j][0]) < body[0] && Math.abs(trace[j][1]) < body[1];
                if (state === 0 && !inside) state = 1;
                if (state === 1 && inside) break;
                if (state === 1 && (j % 3 === 0 || j === trace.length - 1)) kept.push(trace[j]);
            }
            if (kept.length < 3) continue;
            lines.push(kept);
            // 상자 밖으로 나간 선은 S극 쪽에도 좌우 대칭으로 하나 더 (밖에서 S극으로 들어오는 방향)
            var last = kept[kept.length - 1];
            if (Math.abs(last[0]) > box[0] - h * 2 || Math.abs(last[1]) > box[1] - h * 2) {
                var mirror = [];
                for (var m = kept.length - 1; m >= 0; m--) mirror.push([-kept[m][0], kept[m][1]]);
                lines.push(mirror);
            }
        }
        return lines;
    }

    // 코일 안쪽 나란한 자기력선: S극 끝 → N극 끝
    function coilInsideLines(length, thick, count, northLeft) {
        var lines = [];
        for (var i = 0; i < count; i++) {
            var y = thick * 0.7 * ((i + 0.5) / count - 0.5);
            var a = [length / 2, y], b = [-length / 2, y];
            var from = northLeft ? a : b, to = northLeft ? b : a;
            lines.push([from, [(from[0] + to[0]) / 2, y], to]);
        }
        return lines;
    }

    // 직선 도선 둘레 동심원 반지름: 바깥으로 갈수록 간격이 넓어진다 (k + k(k−1)/4 비례)
    function wireRadii(outer, count) {
        var radii = [];
        var last = count + count * (count - 1) / 4;
        for (var k = 1; k <= count; k++) radii.push(outer * (k + k * (k - 1) / 4) / last);
        return radii;
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", kind, lengthMm, thickMm, lineCount, rangePct, turns, current, arrowsOn ? "1" : "0", labelsOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 14) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        lengthMm = restoreNumber(p[2], lengthMm, LENGTH_RANGE, 1);
        thickMm = restoreNumber(p[3], thickMm, THICK_RANGE, 0.5);
        lineCount = restoreNumber(p[4], lineCount, LINES_RANGE, 1);
        rangePct = restoreNumber(p[5], rangePct, RANGE_RANGE, 10);
        turns = restoreNumber(p[6], turns, TURNS_RANGE, 1);
        current = restoreNumber(p[7], current, [0, CURRENTS.length - 1], 1);
        arrowsOn = p[8] === "1";
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
