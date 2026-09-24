// Object_Convection.jsx
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

// 대류 순환 화살표: 선택한 개체(비커·사각형 등)의 경계 상자 안에 대류 고리를 그린다.
//   - 축에 나란한 사각형을 선택하면 그 자리에 비커(Object_LabGlassware.jsx와 같은 모양)를 그리고 물을 채운다.
//     너비·높이(mm)와 물 높이(%)를 고치고, 고리는 물 안에만 그린다. 확인하면 사각형은 지워진다.
//     유리는 '유리 두께'만큼 물 바깥쪽으로 두꺼운 두 겹 선(굵은 검정 선 위에 흰 선, 끝은 둥글게)이고,
//     양 끝(부리 끝·오른쪽 위 끝)은 두께의 RIM_SCALE배인 둥근 알로 조금 더 두껍다.
//   - 화살표 3개: 같은 방향으로 도는 고리를 '간격'만큼씩 안쪽으로 겹쳐 세 줄로 그린다.
//   - 가운데 가열: 두 고리. 가운데에서 올라가 위에서 양옆으로 퍼지고, 옆면을 따라 내려와 바닥에서 가운데로 모인다.
//   - 왼쪽·오른쪽 가열: 고리 하나. 가열한 쪽으로 올라가 반대쪽으로 내려온다.
//   - 고리는 둥근 사각형을 네 변으로 끊은 선이고, 조각 끝에 화살촉을 단다. 끊는 곳은 변의 곧은 부분에서 고른다
//     (끊김 위치 0%는 모서리를 막 돈 곳, 50%는 변 가운데). 곡선 위에서 끊으면 화살촉이 비틀려 보인다.
//   - 가열 표시: 가열하는 곳 아래에 짧은 위쪽 화살표 세 개와 '가열'.
// 결과는 선택한 개체와 따로 된 그룹 하나.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectConvection/settings";
    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    var HEAT_POSITIONS = ["가운데", "왼쪽", "오른쪽"];
    var LOOP_COUNTS = [1, 3];
    var LINE_WIDTH_PT = 0.3;
    var WATER_K = 15;
    var RIM_SCALE = 1.25;
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 50;
    var MARGIN_RANGE = [0, 30];
    var ROUND_RANGE = [0, 100];
    var GAP_RANGE = [0, 5];
    var BREAK_RANGE = [0, 100];
    var WIDTH_RANGE = [0.1, 3];
    var HEAD_RANGE = [20, 300];
    var FONT_RANGE = [5, 20];
    var SPACING_RANGE = [0.5, 15];
    var SIZE_RANGE = [3, 300];
    var LEVEL_RANGE = [10, 100];
    var GLASS_RANGE = [0.2, 5];

    var doc = app.activeDocument;
    if (!doc.selection || doc.selection.length !== 1) {
        alert("대류를 그릴 용기(비커·사각형 등) 하나를 선택해주세요.");
        return;
    }
    var target = doc.selection[0];
    var bounds = target.geometricBounds;
    // 사각형이면 비커로 바꾼다. 비커 크기는 사각형에서 오므로 저장하지 않는다
    var rect = getSelectedRectangle(doc.selection);
    var rectWasHidden = rect !== null ? rect.hidden : false;
    var center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
    var widthMm = Math.round((bounds[2] - bounds[0]) / MM * 10) / 10;
    var heightMm = Math.round((bounds[1] - bounds[3]) / MM * 10) / 10;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var heatAt = 0;
    var marginMm = 3;
    var roundPct = 50;
    var gapMm = 1;
    var breakPct = 50;
    var lineWidth = 0.5;
    var headScale = 60;
    var heatMark = true;
    var loopCount = 0;
    var spacingMm = 2.5;
    var levelPct = 75;
    var glassMm = 1;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "대류 순환 화살표");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var widthRow = null, heightRow = null, levelRow = null, glassRow = null;
    if (rect !== null) {
        var beakerPanel = addPanel(dlg, "비커");
        widthRow = addValueRow(beakerPanel, "너비", "mm", widthMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
        heightRow = addValueRow(beakerPanel, "높이", "mm", heightMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
        levelRow = addValueRow(beakerPanel, "물 높이", "%", levelPct, LEVEL_RANGE[0], LEVEL_RANGE[1], 1, 0);
        glassRow = addValueRow(beakerPanel, "유리 두께", "mm", glassMm, GLASS_RANGE[0], GLASS_RANGE[1], 0.1, 1);
        glassRow.input.helpTip = "물 바깥쪽으로 두꺼워진다. 양 끝은 조금 더 두껍고 둥글다";
    }

    var loopPanel = addPanel(dlg, "순환");
    var heatRow = loopPanel.add("group");
    heatRow.add("statictext", undefined, "가열 위치:").preferredSize.width = LABEL_WIDTH;
    var heatRadios = [];
    for (var h = 0; h < HEAT_POSITIONS.length; h++) heatRadios.push(heatRow.add("radiobutton", undefined, HEAT_POSITIONS[h]));
    var marginRow = addValueRow(loopPanel, "안쪽 여백", "mm", marginMm, MARGIN_RANGE[0], MARGIN_RANGE[1], 0.5, 1);
    marginRow.input.helpTip = "용기 테두리에서 고리까지";
    var roundRow = addValueRow(loopPanel, "둥글기", "%", roundPct, ROUND_RANGE[0], ROUND_RANGE[1], 1, 0);
    roundRow.input.helpTip = "고리 모서리 반지름 (짧은 변에 대한 비율)";
    var gapRow = addValueRow(loopPanel, "끊김 간격", "mm", gapMm, GAP_RANGE[0], GAP_RANGE[1], 0.1, 1);
    gapRow.input.helpTip = "화살촉 끝과 다음 변 사이";
    var breakRow = addValueRow(loopPanel, "끊김 위치", "%", breakPct, BREAK_RANGE[0], BREAK_RANGE[1], 5, 0);
    breakRow.input.helpTip = "변의 곧은 부분에서 끊는 자리. 0은 모서리를 막 돈 곳, 50은 변 가운데, 100은 다음 모서리 앞";
    var countRow = loopPanel.add("group");
    countRow.add("statictext", undefined, "화살표:").preferredSize.width = LABEL_WIDTH;
    var countRadios = [];
    for (var c = 0; c < LOOP_COUNTS.length; c++) countRadios.push(countRow.add("radiobutton", undefined, LOOP_COUNTS[c] + "개"));
    var spacingRow = addValueRow(loopPanel, "화살표 간격", "mm", spacingMm, SPACING_RANGE[0], SPACING_RANGE[1], 0.5, 1);
    spacingRow.input.helpTip = "겹친 고리 사이 거리";

    var stylePanel = addPanel(dlg, "모양");
    var lineWidthRow = addValueRow(stylePanel, "선 두께", "pt", lineWidth, WIDTH_RANGE[0], WIDTH_RANGE[1], 0.1, 1);
    var headRow = addValueRow(stylePanel, "화살촉 크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);
    var heatCheck = stylePanel.add("checkbox", undefined, "가열 표시 (아래 화살표와 '가열')");
    var fontRow = addValueRow(stylePanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

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

    heatRadios[heatAt].value = true;
    countRadios[loopCount].value = true;
    spacingRow.input.enabled = spacingRow.slider.enabled = loopCount === 1;
    heatCheck.value = heatMark;
    fontRow.input.enabled = fontRow.slider.enabled = heatMark;

    for (var hr = 0; hr < heatRadios.length; hr++) {
        heatRadios[hr].onClick = (function(index) {
            return function() { heatAt = index; updatePreview(); };
        })(hr);
    }
    for (var cr = 0; cr < countRadios.length; cr++) {
        countRadios[cr].onClick = (function(index) {
            return function() {
                loopCount = index;
                spacingRow.input.enabled = spacingRow.slider.enabled = loopCount === 1;
                updatePreview();
            };
        })(cr);
    }
    heatCheck.onClick = function() {
        heatMark = heatCheck.value;
        fontRow.input.enabled = fontRow.slider.enabled = heatMark;
        updatePreview();
    };
    bindValueRow(marginRow, function() { return marginMm; }, function(v) { marginMm = v; });
    bindValueRow(roundRow, function() { return roundPct; }, function(v) { roundPct = v; });
    bindValueRow(gapRow, function() { return gapMm; }, function(v) { gapMm = v; });
    bindValueRow(breakRow, function() { return breakPct; }, function(v) { breakPct = v; });
    bindValueRow(lineWidthRow, function() { return lineWidth; }, function(v) { lineWidth = v; });
    bindValueRow(spacingRow, function() { return spacingMm; }, function(v) { spacingMm = v; });
    if (rect !== null) {
        bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
        bindValueRow(heightRow, function() { return heightMm; }, function(v) { heightMm = v; });
        bindValueRow(levelRow, function() { return levelPct; }, function(v) { levelPct = v; });
        bindValueRow(glassRow, function() { return glassMm; }, function(v) { glassMm = v; });
    }
    bindValueRow(headRow, function() { return headScale; }, function(v) { headScale = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        if (rect !== null) {
            try { rect.remove(); } catch (removeError) {}
        }
        saveSettings();
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var confirmed = dlg.show() === 1;
    if (!confirmed) {
        clearPreview();
        if (rect !== null) rect.hidden = rectWasHidden;
    }
    doc.selection = null;
    try { (confirmed && previewGroup !== null ? previewGroup : target).selected = true; } catch (selectError) {}
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    // 비커로 바꾸는 동안 원래 사각형은 숨긴다
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            if (rect !== null) rect.hidden = true;
            buildPreview();
        } else if (rect !== null) {
            rect.hidden = rectWasHidden;
        }
        app.redraw();
    }

    function buildPreview() {
        var black = makeGray(100);
        // 고리를 그릴 상자와 가열 표시 기준 상자. 비커면 고리는 물 안에
        var loopBounds = bounds, heatBounds = bounds, beaker = null;
        if (rect !== null) {
            beaker = beakerShape(center, widthMm * MM, heightMm * MM, levelPct / 100, glassMm * MM);
            loopBounds = beaker.water;
            heatBounds = beaker.box;
        }
        var loops = convectionLoops(loopBounds, heatAt, marginMm * MM, roundPct / 100, LOOP_COUNTS[loopCount], spacingMm * MM);
        if (loops.length === 0 && beaker === null) return;
        previewGroup = target.layer.groupItems.add();
        previewGroup.name = beaker !== null ? "대류 (비커)" : "대류";
        previewGroup.move(target, ElementPlacement.PLACEBEFORE);
        if (beaker !== null) drawBeaker(beaker, black);
        var paths = [];
        for (var i = 0; i < loops.length; i++) {
            var pieces = loopPieces(loops[i], gapMm * MM, breakPct / 100);
            for (var p = 0; p < pieces.length; p++) {
                var path = drawBezier(previewGroup, pieces[p]);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = black;
                path.strokeWidth = lineWidth;
                paths.push(path);
            }
        }
        if (heatMark) {
            var marks = heatArrows(heatBounds, heatAt);
            for (var m = 0; m < marks.length; m++) {
                var arrow = previewGroup.pathItems.add();
                arrow.setEntirePath(marks[m]);
                arrow.filled = false;
                arrow.stroked = true;
                arrow.strokeColor = black;
                arrow.strokeWidth = lineWidth;
                paths.push(arrow);
            }
            var label = previewGroup.textFrames.add();
            label.contents = "가열";
            label.textRange.characterAttributes.textFont = korFont;
            label.textRange.characterAttributes.size = fontPt;
            label.textRange.characterAttributes.fillColor = black;
            var lb = label.geometricBounds;
            var lowest = marks[0][0][1];
            label.translate(marks[1][0][0] - (lb[0] + lb[2]) / 2, lowest - 1 * MM - lb[1]);
        }
        applyArrowheads(paths, lineWidth, headScale);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    // 물(면) → 수면 선 → 비커 윤곽 (고리는 그 위에 그린다)
    function drawBeaker(beaker, black) {
        if (beaker.water[1] > beaker.water[3]) {
            var water = drawBezier(previewGroup, beaker.waterPoints);
            water.closed = true;
            water.stroked = false;
            water.filled = true;
            water.fillColor = makeGray(WATER_K);
            water.name = "물";
            if (beaker.surface !== null) {
                var line = previewGroup.pathItems.add();
                line.setEntirePath(beaker.surface);
                line.filled = false;
                line.stroked = true;
                line.strokeColor = black;
                line.strokeWidth = LINE_WIDTH_PT;
                line.name = "수면";
            }
        }
        // 유리: 검정(두께 + 테두리 두 줄) → 흰색(두께) 순서로 겹치면 흰 안쪽을 가진 두 겹 선이 된다.
        // 양 끝 알도 같은 순서로 검정 원 → 흰 원을 겹쳐 하나로 이어진 윤곽이 되게 한다
        var glass = previewGroup.groupItems.add();
        glass.name = "비커";
        var layers = [[100, beaker.glass + LINE_WIDTH_PT * 2], [0, beaker.glass]];
        for (var i = 0; i < layers.length; i++) {
            var wall = drawBezier(glass, beaker.outline);
            wall.filled = false;
            wall.stroked = true;
            wall.strokeColor = makeGray(layers[i][0]);
            wall.strokeWidth = layers[i][1];
            wall.strokeCap = StrokeCap.ROUNDENDCAP;
            wall.strokeJoin = StrokeJoin.ROUNDENDJOIN;
            for (var e = 0; e < beaker.ends.length; e++) {
                var d = beaker.glass * RIM_SCALE + (layers[i][1] - beaker.glass);
                var rim = glass.pathItems.ellipse(beaker.ends[e][1] + d / 2, beaker.ends[e][0] - d / 2, d, d);
                rim.stroked = false;
                rim.filled = true;
                rim.fillColor = makeGray(layers[i][0]);
            }
        }
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
    // 고리 (순수 계산)
    // -------------------------------------------------------
    // 고리 목록: {left, top, right, bottom, r, clockwise}. 가운데 가열이면 여백만큼 들인 상자를 반으로 나눈 두 고리
    // (왼쪽은 반시계: 가운데로 오른다, 오른쪽은 시계), 왼쪽 가열이면 시계(왼쪽으로 오른다) 하나, 오른쪽이면 반시계 하나.
    // count가 3이면 고리마다 spacing씩 안쪽으로 들인 고리를 두 개 더 (바깥부터). 너무 작거나 납작한 고리는 뺀다
    function convectionLoops(b, heat, margin, round, count, spacing) {
        count = count || 1;
        spacing = spacing || 0;
        var base = baseLoops(b, heat, margin, round);
        var list = [];
        for (var i = 0; i < base.length; i++) {
            for (var k = 0; k < count; k++) {
                var inset = k * spacing;
                var l = base[i].left + inset, r = base[i].right - inset;
                var t = base[i].top - inset, bt = base[i].bottom + inset;
                // 안쪽 고리는 짧은 변이 간격보다 짧으면 납작하게 찌그러지므로 뺀다
                if (r - l <= 0 || t - bt <= 0 || (k > 0 && Math.min(r - l, t - bt) < spacing)) break;
                list.push({left: l, top: t, right: r, bottom: bt, r: Math.min(r - l, t - bt) / 2 * round, clockwise: base[i].clockwise});
            }
        }
        return list;
    }

    function baseLoops(b, heat, margin, round) {
        var left = b[0] + margin;
        var right = b[2] - margin;
        var top = b[1] - margin;
        var bottom = b[3] + margin;
        if (right - left <= 0 || top - bottom <= 0) return [];
        function loop(l, r, cw) {
            var radius = Math.min(r - l, top - bottom) / 2 * round;
            return {left: l, top: top, right: r, bottom: bottom, r: radius, clockwise: cw};
        }
        if (heat === 0) {
            var middle = (left + right) / 2;
            var inner = margin;
            return [loop(left, middle - inner / 2, false), loop(middle + inner / 2, right, true)];
        }
        return [loop(left, right, heat === 1)];
    }

    // 둥근 사각형 고리를 네 조각으로 끊는다. 변 i의 곧은 부분을 breakAt(0~1) 자리에서 끊어, 조각 i는
    // 변 i의 끊는 곳 → 모서리 i → 변 i+1의 끊는 곳이고 끝은 gap만큼 모자라게. breakAt이 0이면 모서리를 막 돈 곳에서 끊는다.
    // 돌아가는 차례는 오르는 변(시계면 왼쪽 변, 반시계면 오른쪽 변)부터
    function loopPieces(loop, gap, breakAt) {
        var r = loop.r;
        var f = breakAt || 0;
        var L = loop.left, R = loop.right, T = loop.top, B = loop.bottom;
        // 네 모서리의 중심과, 모서리 사분원이 시작·끝나는 방향(라디안). 시계 방향 차례: 왼쪽 위 → 오른쪽 위 → 오른쪽 아래 → 왼쪽 아래
        var corners = loop.clockwise
            ? [{c: [L + r, T - r], from: Math.PI, to: Math.PI / 2}, {c: [R - r, T - r], from: Math.PI / 2, to: 0},
                {c: [R - r, B + r], from: 0, to: -Math.PI / 2}, {c: [L + r, B + r], from: -Math.PI / 2, to: -Math.PI}]
            : [{c: [R - r, T - r], from: 0, to: Math.PI / 2}, {c: [L + r, T - r], from: Math.PI / 2, to: Math.PI},
                {c: [L + r, B + r], from: Math.PI, to: Math.PI * 1.5}, {c: [R - r, B + r], from: -Math.PI / 2, to: 0}];
        // 변 i: 앞 모서리의 끝 → 모서리 i의 시작 (곧은 부분)
        var sides = [];
        for (var s = 0; s < 4; s++) {
            var before = corners[(s + 3) % 4];
            var after = corners[s];
            sides.push([[before.c[0] + r * Math.cos(before.to), before.c[1] + r * Math.sin(before.to)],
                [after.c[0] + r * Math.cos(after.from), after.c[1] + r * Math.sin(after.from)]]);
        }
        function at(side, t) {
            return [side[0][0] + (side[1][0] - side[0][0]) * t, side[0][1] + (side[1][1] - side[0][1]) * t];
        }
        var pieces = [];
        for (var i = 0; i < 4; i++) {
            var cur = corners[i];
            var begin = at(sides[i], f);
            var arc = r > 0 ? arcPoints(cur.c[0], cur.c[1], r, cur.from, cur.to) : [corner(cur.c[0], cur.c[1])];
            var points = [corner(begin[0], begin[1])].concat(arc);
            if (f > 0) {
                var end = at(sides[(i + 1) % 4], f);
                points.push(corner(end[0], end[1]));
            }
            pieces.push(trimEnd(points, gap));
        }
        return pieces;
    }

    // 끝을 gap만큼 줄인다: 마지막 조각이 곡선이면 끝 점을 곡선을 따라 당기고, 곧으면 선을 따라 당긴다 (근사)
    function trimEnd(points, gap) {
        if (gap <= 0) return points;
        var last = points[points.length - 1];
        var before = points[points.length - 2];
        var dir = [last.anchor[0] - last.left[0], last.anchor[1] - last.left[1]];
        if (Math.abs(dir[0]) < 1e-9 && Math.abs(dir[1]) < 1e-9) dir = [last.anchor[0] - before.anchor[0], last.anchor[1] - before.anchor[1]];
        var length = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]);
        if (length < 1e-9) return points;
        var ux = dir[0] / length;
        var uy = dir[1] / length;
        var moved = {
            anchor: [last.anchor[0] - ux * gap, last.anchor[1] - uy * gap],
            left: [last.left[0] - ux * gap, last.left[1] - uy * gap],
            right: [last.anchor[0] - ux * gap, last.anchor[1] - uy * gap]
        };
        return points.slice(0, points.length - 1).concat([moved]);
    }

    // 가열하는 곳 아래 짧은 위쪽 화살표 세 개 (용기 바닥 아래 1mm에서 끝난다)
    function heatArrows(b, heat) {
        var width = b[2] - b[0];
        var x = heat === 0 ? (b[0] + b[2]) / 2 : (heat === 1 ? b[0] + width * 0.25 : b[2] - width * 0.25);
        var spread = width * 0.08;
        var top = b[3] - 1 * MM;
        var length = Math.max(2 * MM, width * 0.08);
        var list = [];
        for (var i = -1; i <= 1; i++) list.push([[x + i * spread, top - length], [x + i * spread, top]]);
        return list;
    }

    // 비커 (Object_LabGlassware.jsx와 같은 모양): 왼쪽 위 부리, 바닥 모서리만 둥글게. 가운데 center, 너비 w, 높이 h는 물이 닿는
    // 안쪽 벽 기준이고, 유리(두께 glass)는 그 바깥에 있다.
    // 돌려주는 것: outline(유리 가운데 선, 베지어 점), ends(유리 양 끝 점), glass, box [왼, 위, 오, 아래](유리 바깥까지),
    // waterPoints(물: 바닥 모서리만 둥근 사각형 베지어, 앵커 6개), surface(수면 선 또는 null), water(물이 찬 상자)
    function beakerShape(center, w, h, level, glass) {
        glass = glass || 0;
        var L = center[0] - w / 2, R = center[0] + w / 2;
        var T = center[1] + h / 2, B = center[1] - h / 2;
        var lip = w * 0.06;
        var r0 = Math.min(w * 0.08, h * 0.2);
        // 유리 가운데 선: 안쪽 벽에서 두께 절반만큼 바깥
        var g = glass / 2;
        var wall = [v(L - g - lip, T + lip * 0.3, 0), v(L - g, T - lip, lip * 0.8), v(L - g, B - g, r0 + g), v(R + g, B - g, r0 + g), v(R + g, T, 0)];
        // 안쪽 벽은 부리 아래(T − lip)부터 곧게 내려온다
        var top = T - lip;
        var levelY = B + (top - B) * level;
        // 수면이 바닥 모서리 원호에 걸리면 그 높이의 벽 안쪽으로 들인다
        var inset = 0;
        if (levelY < B + r0) {
            var dy = B + r0 - levelY;
            inset = r0 - Math.sqrt(Math.max(0, r0 * r0 - dy * dy));
        }
        var outline = roundPolyline(wall, false);
        return {
            outline: outline,
            ends: [outline[0].anchor, outline[outline.length - 1].anchor],
            glass: glass,
            box: [L - glass, T, R + glass, B - glass],
            waterPoints: roundPolyline([v(L, levelY, 0), v(L, B, r0), v(R, B, r0), v(R, levelY, 0)], true),
            surface: levelY < top - 0.01 ? [[L + inset, levelY], [R - inset, levelY]] : null,
            water: [L, levelY, R, B]
        };
    }

    function v(x, y, r) {
        return {x: x, y: y, r: r};
    }

    // 꼭짓점마다 반지름 r만큼 원호로 둥글린 꺾은선 → 베지어 점. r은 꼭짓점에서 원호가 시작하는 거리(접선 길이)로,
    // 이웃 변 길이의 절반을 넘지 않게 줄인다
    function roundPolyline(vertices, closed) {
        var points = [];
        var n = vertices.length;
        for (var i = 0; i < n; i++) {
            var cur = vertices[i];
            var hasPrev = closed || i > 0;
            var hasNext = closed || i < n - 1;
            if (cur.r <= 0 || !hasPrev || !hasNext) {
                points.push(corner(cur.x, cur.y));
                continue;
            }
            var prev = vertices[(i - 1 + n) % n];
            var next = vertices[(i + 1) % n];
            var d1 = unit(prev.x - cur.x, prev.y - cur.y);
            var d2 = unit(next.x - cur.x, next.y - cur.y);
            var t = Math.min(cur.r, d1.length / 2, d2.length / 2);
            // 꺾이는 각 φ: 접선 길이 t인 원호의 반지름 t / tan(φ/2), 손잡이 길이 4/3·tan(φ/4)·반지름
            var cosInner = d1.x * d2.x + d1.y * d2.y;
            var turn = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosInner)));
            if (turn < 1e-6) {
                points.push(corner(cur.x, cur.y));
                continue;
            }
            var radius = t / Math.tan(turn / 2);
            var handle = 4 / 3 * Math.tan(turn / 4) * radius;
            var a = [cur.x + d1.x * t, cur.y + d1.y * t];
            var b = [cur.x + d2.x * t, cur.y + d2.y * t];
            points.push({anchor: a, left: a, right: [a[0] - d1.x * handle, a[1] - d1.y * handle]});
            points.push({anchor: b, left: [b[0] - d2.x * handle, b[1] - d2.y * handle], right: b});
        }
        return points;
    }

    function unit(x, y) {
        var length = Math.sqrt(x * x + y * y);
        return length > 0 ? {x: x / length, y: y / length, length: length} : {x: 0, y: 0, length: 0};
    }

    function corner(x, y) {
        return {anchor: [x, y], left: [x, y], right: [x, y]};
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

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawBezier(container, points) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = PointType.CORNER;
        }
        path.closed = false;
        return path;
    }

    // 화살촉은 DOM에 없는 속성이라 임시 액션으로 끝 화살촉만 넣는다
    function applyArrowheads(paths, weight, scale) {
        if (paths.length === 0) return;
        var actionSetName = "Codex_Convection";
        var actionName = "ConvectionArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_ConvectionArrowheads.aia");
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

    // 축에 나란한 사각형 패스 하나면 그 패스, 아니면 null
    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            if (point.leftDirection[0] !== point.anchor[0] || point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] || point.rightDirection[1] !== point.anchor[1]) return null;
            pushDistinct(xs, point.anchor[0]);
            pushDistinct(ys, point.anchor[1]);
        }
        if (xs.length !== 2 || ys.length !== 2) return null;
        return item;
    }

    function pushDistinct(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (Math.abs(list[i] - value) < 0.01) return;
        }
        list.push(value);
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
        var parts = ["v4", heatAt, marginMm, roundPct, gapMm, lineWidth, headScale, heatMark ? "1" : "0", fontPt,
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0", loopCount, spacingMm, levelPct, breakPct, glassMm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v4" || p.length !== 17) return;
        heatAt = restoreNumber(p[1], heatAt, [0, HEAT_POSITIONS.length - 1], 1);
        marginMm = restoreNumber(p[2], marginMm, MARGIN_RANGE, 0.5);
        roundPct = restoreNumber(p[3], roundPct, ROUND_RANGE, 1);
        gapMm = restoreNumber(p[4], gapMm, GAP_RANGE, 0.1);
        lineWidth = restoreNumber(p[5], lineWidth, WIDTH_RANGE, 0.1);
        headScale = restoreNumber(p[6], headScale, HEAD_RANGE, 10);
        heatMark = p[7] === "1";
        fontPt = restoreNumber(p[8], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[9], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[10], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[11] === "1";
        loopCount = restoreNumber(p[12], loopCount, [0, LOOP_COUNTS.length - 1], 1);
        spacingMm = restoreNumber(p[13], spacingMm, SPACING_RANGE, 0.5);
        levelPct = restoreNumber(p[14], levelPct, LEVEL_RANGE, 1);
        breakPct = restoreNumber(p[15], breakPct, BREAK_RANGE, 5);
        glassMm = restoreNumber(p[16], glassMm, GLASS_RANGE, 0.1);
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
