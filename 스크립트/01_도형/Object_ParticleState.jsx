// Object_ParticleState.jsx
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

// 입자 상태 모형: 선택한 닫힌 패스(용기 안쪽·사각형 등) 안을 고체·액체·기체의 입자 배열로 채운다.
//   - 고체: 촘촘한 육방 격자로 바닥부터 채우는 높이까지. 액체: 조금 느슨한 격자를 흔들고 몇 개를 빼서 불규칙하게.
//     기체: 입자 수만큼 도형 전체에 멀리 떨어뜨려 흩는다. 입자는 도형 밖으로 삐져나오지 않는 것만 둔다.
//   - 운동 화살표: 입자 가장자리에서 무작위 방향으로 뻗는 선 + 끝 화살촉. 비율(%)만큼의 입자에 붙인다.
//   - 배치 번호가 같으면 늘 같은 배치. 원래 도형은 그대로 두고 그 위에 입자 그룹을 얹는다.
// 도형은 곡선을 짧은 직선으로 펴서(베지어 조각마다 16등분) 안쪽 판정을 한다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectParticleState/settings";
    var MM = 2.834645669;
    var FLATTEN_STEPS = 16;
    var STATES = ["고체", "액체", "기체"];
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    var LINE_WIDTH_PT = 0.3;
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 50;
    var DIAMETER_RANGE = [0.5, 20];
    var LEVEL_RANGE = [5, 100];
    var COUNT_RANGE = [1, 300];
    var K_RANGE = [0, 100];
    var RATIO_RANGE = [0, 100];
    var ARROW_RANGE = [0.5, 20];
    var HEAD_RANGE = [20, 200];
    var SEED_RANGE = [1, 99];
    var MAX_PARTICLES = 3000;

    var doc = app.activeDocument;
    var shape = getClosedPath(doc.selection);
    if (shape === null) {
        alert("입자를 채울 닫힌 패스 하나를 선택해주세요 (사각형·원·용기 안쪽 모양 등).");
        return;
    }
    var polygon = flattenPath(shape);
    var shapeBounds = shape.geometricBounds;

    // 옵션
    var state = 0;
    var diameterMm = 3;
    var levelPct = 60;        // 고체·액체가 차는 높이 (도형 높이 %)
    var gasCount = 20;
    var particleK = 40;
    var arrowRatio = 0;       // 화살표를 붙일 입자 비율 %
    var arrowMm = 3;
    var headScale = 50;
    var seed = 1;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "입자 상태 모형");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var statePanel = addPanel(dlg, "상태");
    var stateRow = statePanel.add("group");
    var stateRadios = [];
    for (var s = 0; s < STATES.length; s++) stateRadios.push(stateRow.add("radiobutton", undefined, STATES[s]));
    var diameterRow = addValueRow(statePanel, "입자 지름", "mm", diameterMm, DIAMETER_RANGE[0], DIAMETER_RANGE[1], 0.1, 1);
    var levelRow = addValueRow(statePanel, "채우는 높이", "%", levelPct, LEVEL_RANGE[0], LEVEL_RANGE[1], 1, 0);
    levelRow.input.helpTip = "고체·액체: 도형 바닥에서 이 높이까지 채운다";
    var countRow = addValueRow(statePanel, "기체 입자 수", "개", gasCount, COUNT_RANGE[0], COUNT_RANGE[1], 1, 0);
    countRow.input.helpTip = "자리가 모자라면 들어가는 만큼만 놓는다";
    var kRow = addValueRow(statePanel, "입자 색", "K", particleK, K_RANGE[0], K_RANGE[1], 10, 0);
    var seedRow = addValueRow(statePanel, "배치 번호", "", seed, SEED_RANGE[0], SEED_RANGE[1], 1, 0);

    var arrowPanel = addPanel(dlg, "운동 화살표");
    var ratioRow = addValueRow(arrowPanel, "붙일 비율", "%", arrowRatio, RATIO_RANGE[0], RATIO_RANGE[1], 5, 0);
    ratioRow.input.helpTip = "0이면 화살표 없음";
    var arrowRow = addValueRow(arrowPanel, "화살표 길이", "mm", arrowMm, ARROW_RANGE[0], ARROW_RANGE[1], 0.1, 1);
    var headRow = addValueRow(arrowPanel, "화살촉 크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);

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

    stateRadios[state].value = true;
    syncEnabled();
    for (var r = 0; r < stateRadios.length; r++) {
        stateRadios[r].onClick = (function(index) {
            return function() { state = index; syncEnabled(); updatePreview(); };
        })(r);
    }
    bindValueRow(diameterRow, function() { return diameterMm; }, function(v) { diameterMm = v; });
    bindValueRow(levelRow, function() { return levelPct; }, function(v) { levelPct = v; });
    bindValueRow(countRow, function() { return gasCount; }, function(v) { gasCount = v; });
    bindValueRow(kRow, function() { return particleK; }, function(v) { particleK = v; });
    bindValueRow(seedRow, function() { return seed; }, function(v) { seed = v; });
    bindValueRow(ratioRow, function() { return arrowRatio; }, function(v) { arrowRatio = v; syncEnabled(); });
    bindValueRow(arrowRow, function() { return arrowMm; }, function(v) { arrowMm = v; });
    bindValueRow(headRow, function() { return headScale; }, function(v) { headScale = v; });
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
    if (dlg.show() === 1) {
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    } else {
        clearPreview();
        shape.selected = true;
    }
    app.redraw();

    // 채우는 높이는 고체·액체에서만, 입자 수는 기체에서만, 화살표 길이·크기는 비율이 0보다 클 때만
    function syncEnabled() {
        setRowEnabled(levelRow, state !== 2);
        setRowEnabled(countRow, state === 2);
        setRowEnabled(arrowRow, arrowRatio > 0);
        setRowEnabled(headRow, arrowRatio > 0);
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
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
        var radius = diameterMm * MM / 2;
        var random = makeRandom(seed);
        var centers;
        if (state === 2) {
            centers = scatterGas(polygon, shapeBounds, radius, gasCount, random);
        } else {
            var top = shapeBounds[3] + (shapeBounds[1] - shapeBounds[3]) * levelPct / 100;
            centers = state === 0
                ? latticeFill(polygon, shapeBounds, top, radius, 2 * radius * 1.02, 0, 0, random)
                : latticeFill(polygon, shapeBounds, top, radius, 2 * radius * 1.16, 0.05, 0.12, random);
        }

        previewGroup = shape.parent.groupItems.add();
        previewGroup.name = "Particles " + STATES[state];
        previewGroup.move(shape, ElementPlacement.PLACEBEFORE);

        var stroke = makeGray(100);
        var fill = makeGray(particleK);
        var particles = previewGroup.groupItems.add();
        particles.name = "Particles";
        // 원 하나를 원점에 만들어 두고 복제해서 옮긴 뒤 원본은 지운다
        var prototype = particles.pathItems.ellipse(radius, -radius, 2 * radius, 2 * radius);
        prototype.stroked = true;
        prototype.strokeColor = stroke;
        prototype.strokeWidth = LINE_WIDTH_PT;
        prototype.filled = true;
        prototype.fillColor = fill;
        for (var i = 0; i < centers.length; i++) {
            prototype.duplicate(particles, ElementPlacement.PLACEATEND).translate(centers[i][0], centers[i][1]);
        }
        prototype.remove();

        if (arrowRatio > 0 && centers.length > 0) {
            var arrows = previewGroup.groupItems.add();
            arrows.name = "Motion";
            var paths = [];
            var picks = pickSome(centers.length, arrowRatio / 100, random);
            for (var a = 0; a < picks.length; a++) {
                var c = centers[picks[a]];
                var gap = radius + 0.3 * MM;
                // 화살표 끝이 도형 밖으로 나가지 않는 방향을 몇 번 골라 본다
                var dx, dy;
                for (var attempt = 0; attempt < 12; attempt++) {
                    var angle = random() * 2 * Math.PI;
                    dx = Math.cos(angle);
                    dy = Math.sin(angle);
                    var reach = gap + arrowMm * MM;
                    if (pointInPolygon(polygon, c[0] + dx * reach, c[1] + dy * reach)) break;
                }
                var line = arrows.pathItems.add();
                line.setEntirePath([[c[0] + dx * gap, c[1] + dy * gap],
                    [c[0] + dx * (gap + arrowMm * MM), c[1] + dy * (gap + arrowMm * MM)]]);
                line.filled = false;
                line.stroked = true;
                line.strokeColor = stroke;
                line.strokeWidth = LINE_WIDTH_PT;
                paths.push(line);
            }
            applyArrowheads(paths, LINE_WIDTH_PT, headScale);
        }
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
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
    // 배치 (순수 계산)
    // -------------------------------------------------------
    // 같은 seed면 같은 수열 (0 이상 1 미만)
    function makeRandom(seed) {
        var state = (seed * 2654435761) % 4294967296;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // 육방 격자(줄마다 반 칸 밀림)를 바닥부터 top까지 깐다. jitter는 지름에 대한 흔들림 비율, drop은 빼는 비율.
    // 흔들어도 겹치지 않으려면 pitch - 지름 > 지름 × jitter × 2√2 여야 한다 (액체 1.16배·0.05면 0.32r > 0.28r).
    // 밀리지 않은 줄이 가로 가운데 오도록 시작점을 잡고, 원이 도형 안에 다 들어가는 것만 남긴다
    function latticeFill(poly, bounds, top, radius, pitch, jitter, drop, random) {
        var result = [];
        var rowPitch = pitch * Math.sqrt(3) / 2;
        var right = bounds[2];
        var bottom = bounds[3];
        var columns = Math.floor((right - bounds[0] - 2 * radius) / pitch) + 1;
        var left = bounds[0] + Math.max(0, (right - bounds[0] - 2 * radius - (columns - 1) * pitch) / 2);
        for (var row = 0; ; row++) {
            var y = bottom + radius + row * rowPitch;
            if (y + radius > top + 0.01 || result.length >= MAX_PARTICLES) break;
            var shift = (row % 2) * pitch / 2;
            for (var x = left + radius + shift; x + radius <= right + 0.01; x += pitch) {
                var px = x + (random() * 2 - 1) * jitter * 2 * radius;
                var py = y + (random() * 2 - 1) * jitter * 2 * radius;
                if (drop > 0 && random() < drop) continue;
                if (circleInside(poly, px, py, radius)) result.push([px, py]);
            }
        }
        return result;
    }

    // 도형 안에 count개를 서로 지름 2.5배 이상 떨어뜨려 흩는다. 자리가 모자라면 들어가는 만큼만
    function scatterGas(poly, bounds, radius, count, random) {
        var result = [];
        var minDistance = radius * 5;
        var tries = count * 200;
        for (var t = 0; t < tries && result.length < count; t++) {
            var x = bounds[0] + random() * (bounds[2] - bounds[0]);
            var y = bounds[3] + random() * (bounds[1] - bounds[3]);
            if (!circleInside(poly, x, y, radius)) continue;
            var ok = true;
            for (var i = 0; i < result.length; i++) {
                var dx = result[i][0] - x;
                var dy = result[i][1] - y;
                if (dx * dx + dy * dy < minDistance * minDistance) { ok = false; break; }
            }
            if (ok) result.push([x, y]);
        }
        return result;
    }

    // n개 중 ratio만큼 골라 번호 목록으로 (섞은 뒤 앞에서부터)
    function pickSome(n, ratio, random) {
        var order = [];
        for (var i = 0; i < n; i++) order.push(i);
        for (var j = n - 1; j > 0; j--) {
            var k = Math.floor(random() * (j + 1));
            var tmp = order[j];
            order[j] = order[k];
            order[k] = tmp;
        }
        return order.slice(0, Math.round(n * ratio));
    }

    // 가운데가 안쪽이고 테두리 어느 변과도 반지름보다 멀면 원 전체가 안쪽
    function circleInside(poly, x, y, radius) {
        if (!pointInPolygon(poly, x, y)) return false;
        for (var i = 0; i < poly.length; i++) {
            var a = poly[i];
            var b = poly[(i + 1) % poly.length];
            if (distanceToSegment(x, y, a, b) < radius) return false;
        }
        return true;
    }

    function pointInPolygon(poly, x, y) {
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    function distanceToSegment(x, y, a, b) {
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        var lengthSq = dx * dx + dy * dy;
        var t = lengthSq > 0 ? ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSq : 0;
        t = Math.max(0, Math.min(1, t));
        var px = a[0] + t * dx - x;
        var py = a[1] + t * dy - y;
        return Math.sqrt(px * px + py * py);
    }

    // 베지어 조각 하나를 steps등분한 점들 (시작점 빼고 끝점 포함)
    function bezierPoints(p0, p1, p2, p3, steps) {
        var points = [];
        for (var i = 1; i <= steps; i++) {
            var t = i / steps;
            var u = 1 - t;
            points.push([
                u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
            ]);
        }
        return points;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function flattenPath(path) {
        var points = path.pathPoints;
        var poly = [];
        for (var i = 0; i < points.length; i++) {
            var a = points[i];
            var b = points[(i + 1) % points.length];
            poly = poly.concat(bezierPoints(a.anchor, a.rightDirection, b.leftDirection, b.anchor, FLATTEN_STEPS));
        }
        return poly;
    }

    function getClosedPath(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || !item.closed || item.guides || item.clipping) return null;
        if (item.pathPoints.length < 2) return null;
        return item;
    }

    // 화살촉은 DOM에 없는 속성이라 임시 액션으로 끝 화살촉만 넣는다
    function applyArrowheads(paths, weight, scale) {
        if (paths.length === 0) return;
        var actionSetName = "Codex_ParticleState";
        var actionName = "ParticleArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_ParticleArrowheads.aia");
        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) paths[i].selected = true;
            writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살촉 이름은 UI 언어에 따라 다르다. 실패해도 선은 그대로 남는다
        }
        try { app.unloadAction(actionSetName, ""); } catch (e2) {}
        try { actionFile.remove(); } catch (e3) {}
        doc.selection = null;
    }

    // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
    function toActionHex(text) {
        var bytes = [];
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }
        var hex = "";
        for (var j = 0; j < bytes.length; j++) {
            var part = bytes[j].toString(16).toUpperCase();
            if (part.length < 2) part = "0" + part;
            hex += part;
        }
        return {hex: hex, length: bytes.length};
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var arrow = toActionHex(ARROW_NAME);
        var lines = [
            "/version 3",
            "/name [ " + setName.length, "    " + setName.hex, "]",
            "/isOpen 1",
            "/actionCount 1",
            "/action-1 {",
            "    /name [ " + name.length, "        " + name.hex, "    ]",
            "    /keyIndex 0",
            "    /colorIndex 0",
            "    /isOpen 1",
            "    /eventCount 1",
            "    /event-1 {",
            "        /useRulersIn1stQuadrant 0",
            "        /internalName (ai_plugin_setStroke)",
            "        /localizedName [ 10", "            536574205374726F6B65", "        ]",
            "        /isOpen 1",
            "        /isOn 1",
            "        /hasDialog 0",
            "        /parameterCount 4",
            // 선 두께 (pt)
            "        /parameter-1 {",
            "            /key 2003072104",
            "            /showInPalette -1",
            "            /type (unit real)",
            "            /value " + weight,
            "            /unit 592476268",
            "        }",
            // 끝 화살촉
            "        /parameter-2 {",
            "            /key 1634231346",
            "            /showInPalette -1",
            "            /type (ustring)",
            "            /value [ " + arrow.length, "                " + arrow.hex, "            ]",
            "        }",
            // 끝 화살촉 크기 (%)
            "        /parameter-3 {",
            "            /key 1634951986",
            "            /showInPalette -1",
            "            /type (real)",
            "            /value " + scale + ".0",
            "        }",
            // 화살촉 정렬: 패스 끝의 팁
            "        /parameter-4 {",
            "            /key 1634230636",
            "            /showInPalette -1",
            "            /type (enumerated)",
            "            /name [ 17", "                ED8CA8EC8AA420EB819DEC9D9820ED8C81", "            ]",
            "            /value 0",
            "        }",
            "    }",
            "}"
        ];
        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
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
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v;
        rgb.green = v;
        rgb.blue = v;
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
        var parts = ["v1", state, diameterMm, levelPct, gasCount, particleK, arrowRatio, arrowMm, headScale, seed,
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 13) return;
        state = restoreNumber(p[1], state, [0, STATES.length - 1], 1);
        diameterMm = restoreNumber(p[2], diameterMm, DIAMETER_RANGE, 0.1);
        levelPct = restoreNumber(p[3], levelPct, LEVEL_RANGE, 1);
        gasCount = restoreNumber(p[4], gasCount, COUNT_RANGE, 1);
        particleK = restoreNumber(p[5], particleK, K_RANGE, 10);
        arrowRatio = restoreNumber(p[6], arrowRatio, RATIO_RANGE, 5);
        arrowMm = restoreNumber(p[7], arrowMm, ARROW_RANGE, 0.1);
        headScale = restoreNumber(p[8], headScale, HEAD_RANGE, 10);
        seed = restoreNumber(p[9], seed, SEED_RANGE, 1);
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
