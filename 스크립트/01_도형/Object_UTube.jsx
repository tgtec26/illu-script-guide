// Object_UTube.jsx
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

// 선택한 사각형 자리에 J자관·U자관을 그린다.
//   - 사각형의 너비·높이가 관 전체 크기(긴 관 꼭대기 ~ 굽은 바닥 바깥)가 되고, 다이얼로그에서 고칠 수 있다.
//   - J자관: 왼쪽 관은 위가 시험관 바닥처럼 반원(반지름 = 관 두께 절반)으로 막혀 있고 오른쪽 관보다 높이 차만큼 낮다.
//     U자관: 두 관 모두 열려 있고 같은 높이.
//   - 관 두께는 관 안쪽 폭(두 선 사이 거리). 바닥이 반원이라 너비의 절반보다 작아야 한다.
//   - 유리 두께(mm)를 올리면 관 벽이 바깥쪽(액체 반대쪽)으로 두꺼운 두 겹 선(굵은 검정 선 위에 흰 선, 끝은 둥글게)이 되고,
//     열린 끝은 두께의 RIM_SCALE배인 둥근 알로 조금 더 두껍다. 0이면 한 줄 선. Object_LabGlassware.jsx와 같은 방식.
//   - 액체는 바닥부터 채우고, 높이는 관 바닥(바깥) 기준 mm. 반원 바닥이 끝나는 높이(너비의 절반)부터
//     관 꼭대기까지만 둔다. 좌우 같은 높이를 풀면 왼쪽·오른쪽을 따로 정한다. 색은 K 10 단위.
//   - 반투과성막: 굽은 바닥 가운데에 관을 가로지르는 세로 파선(2pt 선·1pt 간격). 굵기(pt)를 따로 정한다.
//   - 확인하면 원본 사각형은 지워지고 액체·관(·막)이 든 그룹 하나가 남는다. 관·액체 선은 0.3pt 검정.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectUTube/settings";
    var MM = 2.834645669;
    var KAPPA = 0.5522847498;
    var LINE_WIDTH_PT = 0.3;
    var MEMBRANE_DASH = [2, 1];
    // 유리 양 끝 알: 유리 두께의 몇 배
    var RIM_SCALE = 1.25;
    var GLASS_RANGE = [0, 5];
    var MEMBRANE_WEIGHT_RANGE = [0.1, 3];
    var K_RANGE = [0, 100];
    var MIN_INNER_RADIUS_MM = 0.5;
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var SIZE_RANGE = [2, 500];
    var BORE_RANGE = [0.5, 100];
    var POSITION_LIMIT_MM = 50;

    var doc = app.activeDocument;
    var rect = getSelectedRectangle(doc.selection);
    if (rect === null) {
        alert("가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.");
        return;
    }
    var rectWasHidden = rect.hidden;
    var bounds = rect.geometricBounds; // [left, top, right, bottom]
    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;

    // 옵션 (크기는 선택한 사각형에서 오므로 저장하지 않는다)
    var widthMm = Math.round((bounds[2] - bounds[0]) / MM * 10) / 10;
    var heightMm = Math.round((bounds[1] - bounds[3]) / MM * 10) / 10;
    var tubeType = 0;          // 0 J자관, 1 U자관
    var boreMm = 4;
    var glassMm = 0;
    var heightDiffMm = Math.round(heightMm * 0.3 * 2) / 2;
    var sameLevel = true;
    var levelLeftMm = Math.round(heightMm * 0.5 * 2) / 2;
    var levelRightMm = levelLeftMm;
    var membrane = false;
    var membraneWeightPt = 0.3;
    var liquidK = 30;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previewGroup = null;

    applySettings();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "J자관·U자관");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var tubePanel = addPanel(dlg, "관");
    var typeRow = tubePanel.add("group");
    typeRow.alignChildren = ["left", "center"];
    typeRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var jRadio = typeRow.add("radiobutton", undefined, "J자관 (왼쪽 관이 막히고 낮음)");
    var uRadio = typeRow.add("radiobutton", undefined, "U자관");
    var widthRow = addValueRow(tubePanel, "너비", "mm", widthMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
    var heightRow = addValueRow(tubePanel, "높이", "mm", heightMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
    heightRow.input.helpTip = "긴 관 꼭대기부터 굽은 바닥 바깥까지. 바닥이 반원이라 너비의 절반보다 작을 수 없다";
    var boreRow = addValueRow(tubePanel, "관 두께", "mm", boreMm, BORE_RANGE[0], BORE_RANGE[1], 0.1, 1);
    boreRow.input.helpTip = "관 안쪽 폭(두 선 사이 거리). 바닥이 반원이라 너비의 절반보다 작아야 한다";
    var glassRow = addValueRow(tubePanel, "유리 두께", "mm", glassMm, GLASS_RANGE[0], GLASS_RANGE[1], 0.1, 1);
    glassRow.input.helpTip = "0이면 한 줄 선, 올리면 흰 안쪽의 두 겹 유리(관 바깥쪽으로 두꺼워지고 열린 끝은 둥글게 조금 더 두껍다)";
    var diffRow = addValueRow(tubePanel, "높이 차", "mm", heightDiffMm, 0, SIZE_RANGE[1], 0.5, 1);
    diffRow.input.helpTip = "J자관에서 왼쪽(막힌) 관이 오른쪽 관보다 낮은 만큼";
    var membraneCheck = tubePanel.add("checkbox", undefined, "가운데 반투과성막 (파선)");
    var membraneWeightRow = addValueRow(tubePanel, "막 굵기", "pt", membraneWeightPt,
        MEMBRANE_WEIGHT_RANGE[0], MEMBRANE_WEIGHT_RANGE[1], 0.1, 1);

    var liquidPanel = addPanel(dlg, "액체 (높이는 관 바닥 기준)");
    var sameCheck = liquidPanel.add("checkbox", undefined, "좌우 같은 높이");
    var leftRow = addValueRow(liquidPanel, "왼쪽 높이", "mm", levelLeftMm, 0, SIZE_RANGE[1], 0.5, 1);
    var rightRow = addValueRow(liquidPanel, "오른쪽 높이", "mm", levelRightMm, 0, SIZE_RANGE[1], 0.5, 1);
    var liquidKRow = addValueRow(liquidPanel, "액체 색", "K", liquidK, K_RANGE[0], K_RANGE[1], 10, 0);

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

    jRadio.value = tubeType === 0;
    uRadio.value = tubeType === 1;
    membraneCheck.value = membrane;
    sameCheck.value = sameLevel;
    syncEnabled();

    jRadio.onClick = function() { tubeType = 0; syncEnabled(); updatePreview(); };
    uRadio.onClick = function() { tubeType = 1; syncEnabled(); updatePreview(); };
    membraneCheck.onClick = function() { membrane = membraneCheck.value; syncEnabled(); updatePreview(); };
    sameCheck.onClick = function() {
        sameLevel = sameCheck.value;
        if (sameLevel) {
            levelRightMm = levelLeftMm;
            setRowValue(rightRow, levelRightMm);
        }
        syncEnabled();
        updatePreview();
    };

    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(heightRow, function() { return heightMm; }, function(v) { heightMm = v; });
    bindValueRow(boreRow, function() { return boreMm; }, function(v) { boreMm = v; });
    bindValueRow(glassRow, function() { return glassMm; }, function(v) { glassMm = v; });
    bindValueRow(diffRow, function() { return heightDiffMm; }, function(v) { heightDiffMm = v; });
    bindValueRow(membraneWeightRow, function() { return membraneWeightPt; }, function(v) { membraneWeightPt = v; });
    bindValueRow(liquidKRow, function() { return liquidK; }, function(v) { liquidK = v; });
    // 좌우 같은 높이면 왼쪽 값이 오른쪽에도 들어간다
    bindValueRow(leftRow, function() { return levelLeftMm; }, function(v) {
        levelLeftMm = v;
        if (sameLevel) {
            levelRightMm = v;
            setRowValue(rightRow, v);
        }
    });
    bindValueRow(rightRow, function() { return levelRightMm; }, function(v) { levelRightMm = v; });
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) {
            rect.hidden = true;
            buildPreview();
        }
        try { rect.remove(); } catch (removeError) {}
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    rect.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        rect.hidden = rectWasHidden;
        rect.selected = true;
    }
    app.redraw();

    // 높이 차는 J자관에서만, 막 굵기는 막을 켰을 때만, 오른쪽 높이는 좌우 같은 높이를 풀었을 때만 만진다
    function syncEnabled() {
        setRowEnabled(diffRow, tubeType === 0);
        setRowEnabled(membraneWeightRow, membrane);
        setRowEnabled(rightRow, !sameLevel);
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
        if (previewEnabled) {
            rect.hidden = true;
            buildPreview();
        } else {
            rect.hidden = rectWasHidden;
        }
        app.redraw();
    }

    // 원본 사각형의 가운데를 기준으로 너비·높이를 잡은 관 하나를 그룹에 넣는다
    function buildPreview() {
        var o = clampOptions({
            width: widthMm, height: heightMm, bore: boreMm, glass: glassMm, diff: heightDiffMm,
            closedLeft: tubeType === 0, sameLevel: sameLevel,
            levelLeft: levelLeftMm, levelRight: levelRightMm
        });
        // 지금 크기에서 그릴 수 없는 값은 줄여서 입력창에도 되돌려 준다
        heightMm = o.height;
        boreMm = o.bore;
        glassMm = o.glass;
        levelLeftMm = o.levelLeft;
        levelRightMm = o.levelRight;
        setRowValue(heightRow, heightMm);
        setRowValue(boreRow, boreMm);
        setRowValue(glassRow, glassMm);
        setRowValue(leftRow, levelLeftMm);
        setRowValue(rightRow, levelRightMm);
        if (o.closedLeft) {
            heightDiffMm = o.diff;
            setRowValue(diffRow, heightDiffMm);
        }

        var geometry = tubeGeometry({
            left: centerX - o.width * MM / 2, top: centerY + o.height * MM / 2,
            width: o.width * MM, height: o.height * MM, bore: o.bore * MM, glass: o.glass * MM, diff: o.diff * MM,
            closedLeft: o.closedLeft, levelLeft: o.levelLeft * MM, levelRight: o.levelRight * MM,
            membrane: membrane
        });

        var black = makeColor(100);
        previewGroup = rect.parent.groupItems.add();
        previewGroup.name = "UTube";
        previewGroup.move(rect, ElementPlacement.PLACEBEFORE);

        var liquid = drawPath(previewGroup, geometry.liquid, true);
        liquid.name = "Liquid";
        styleStroke(liquid, black, LINE_WIDTH_PT, []);
        liquid.filled = true;
        liquid.fillColor = makeColor(liquidK);

        for (var i = 0; i < geometry.outlines.length; i++) {
            if (o.glass > 0) {
                drawGlassWall(previewGroup, geometry.outlines[i], o.glass * MM);
                continue;
            }
            var outline = drawPath(previewGroup, geometry.outlines[i], false);
            outline.name = "Tube";
            styleStroke(outline, black, LINE_WIDTH_PT, []);
        }
        if (geometry.membrane !== null) {
            var line = drawPath(previewGroup, [corner(geometry.membrane[0][0], geometry.membrane[0][1]),
                corner(geometry.membrane[1][0], geometry.membrane[1][1])], false);
            line.name = "Membrane";
            styleStroke(line, black, membraneWeightPt, MEMBRANE_DASH);
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
    // 기하 (mm 단위 옵션 → 그릴 수 있는 범위로 줄이기)
    // -------------------------------------------------------
    // 바닥 반원이 들어가려면 높이는 너비의 절반 이상, 관 두께는 너비의 절반에서 안쪽 반지름 최소값을 뺀 것 이하.
    // 유리 두께는 안쪽 유리 가운데 선(안쪽 반지름 − 두께/2)이 남는 값, 곧 안쪽 반지름의 두 배 이하.
    // J자관의 막힌 관은 바닥 반원 위에 뚜껑 반원(관 두께 절반)이 더 들어가야 하므로 높이 차가 그만큼 줄고,
    // 액체 높이는 반원이 끝나는 높이(너비의 절반)부터 그 관 꼭대기(막힌 관은 뚜껑 반원이 시작하는 높이)까지.
    // 좌우 같은 높이면 낮은 관 꼭대기까지
    function clampOptions(o) {
        var outerRadius = o.width / 2;
        var height = Math.max(o.height, outerRadius);
        var bore = clamp(o.bore, BORE_RANGE[0], Math.max(BORE_RANGE[0], outerRadius - MIN_INNER_RADIUS_MM));
        var glass = clamp(o.glass || 0, GLASS_RANGE[0], Math.min(GLASS_RANGE[1], Math.max(0, 2 * (outerRadius - bore))));
        var capRadius = o.closedLeft ? bore / 2 : 0;
        var diff = o.closedLeft ? clamp(o.diff, 0, height - outerRadius - capRadius) : 0;
        var leftTop = height - diff - capRadius;
        var levelLeft, levelRight;
        if (o.sameLevel) {
            levelLeft = levelRight = clamp(o.levelLeft, outerRadius, Math.min(leftTop, height));
        } else {
            levelLeft = clamp(o.levelLeft, outerRadius, leftTop);
            levelRight = clamp(o.levelRight, outerRadius, height);
        }
        return {
            width: o.width, height: height, bore: bore, glass: glass, diff: diff, closedLeft: o.closedLeft,
            levelLeft: levelLeft, levelRight: levelRight
        };
    }

    // 관 상자(left, top, width, height)와 옵션(pt)에서 관 윤곽·액체·막의 점 목록을 만든다.
    // closedLeft면 왼쪽 관이 diff만큼 낮고 위가 반원(반지름 bore/2)으로 막혀 윤곽이 한 패스, 아니면 바깥·안쪽 두 패스.
    // 유리(glass)가 있으면 윤곽은 관 벽에서 두께 절반만큼 바깥(액체 반대쪽)으로 옮긴 유리 가운데 선이다.
    // 액체는 닫힌 패스 하나, 막은 굽은 바닥 가운데를 가로지르는 두 점. 둘 다 유리와 관계없다
    function tubeGeometry(g) {
        var outerR = g.width / 2;
        var innerR = outerR - g.bore;
        var h = (g.glass || 0) / 2;
        var cx = g.left + outerR;
        var xl = g.left;
        var xr = g.left + g.width;
        var bottom = g.top - g.height;
        var bendY = bottom + outerR;   // 반원이 끝나고 곧은 관이 시작하는 높이
        var leftTop = g.top - (g.closedLeft ? g.diff : 0);
        var rightTop = g.top;

        var outlines;
        if (g.closedLeft) {
            outlines = [
                [corner(xr + h, rightTop)].concat(
                    arc(cx, bendY, outerR + h, -1),
                    arc(xl + g.bore / 2, leftTop - g.bore / 2, g.bore / 2 + h, 1, true),
                    arc(cx, bendY, innerR - h, 1),
                    [corner(xr - g.bore - h, rightTop)])
            ];
        } else {
            outlines = [
                [corner(xl - h, leftTop)].concat(arc(cx, bendY, outerR + h, 1), [corner(xr + h, rightTop)]),
                [corner(xr - g.bore - h, rightTop)].concat(arc(cx, bendY, innerR - h, -1), [corner(xl + g.bore + h, leftTop)])
            ];
        }

        // 액체 면이 반원 끝과 같은 높이면 모서리 점을 따로 두지 않는다 (반원 끝점이 그 자리다)
        var yl = bottom + g.levelLeft;
        var yr = bottom + g.levelRight;
        var liquid = [];
        if (yl > bendY + 0.01) liquid.push(corner(xl, yl));
        liquid = liquid.concat(arc(cx, bendY, outerR, 1));
        if (yr > bendY + 0.01) liquid.push(corner(xr, yr), corner(xr - g.bore, yr));
        liquid = liquid.concat(arc(cx, bendY, innerR, -1));
        if (yl > bendY + 0.01) liquid.push(corner(xl + g.bore, yl));

        var membrane = g.membrane ? [[cx, bottom], [cx, bottom + g.bore]] : null;
        return {outlines: outlines, liquid: liquid, membrane: membrane};
    }

    function corner(x, y) {
        return {anchor: [x, y], left: [x, y], right: [x, y]};
    }

    // (cx, cy)를 중심으로 아래로 볼록한 반원(up이면 위로 볼록). dir 1이면 왼쪽 → 오른쪽, -1이면 오른쪽 → 왼쪽
    function arc(cx, cy, r, dir, up) {
        var k = KAPPA * r;
        var s = up ? -1 : 1;
        return [
            {anchor: [cx - dir * r, cy], left: [cx - dir * r, cy], right: [cx - dir * r, cy - s * k]},
            {anchor: [cx, cy - s * r], left: [cx - dir * k, cy - s * r], right: [cx + dir * k, cy - s * r]},
            {anchor: [cx + dir * r, cy], left: [cx + dir * r, cy - s * k], right: [cx + dir * r, cy]}
        ];
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawPath(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            var smooth = (points[j].left[0] !== points[j].anchor[0] || points[j].left[1] !== points[j].anchor[1]) &&
                (points[j].right[0] !== points[j].anchor[0] || points[j].right[1] !== points[j].anchor[1]);
            point.pointType = smooth ? PointType.SMOOTH : PointType.CORNER;
        }
        path.closed = closed;
        return path;
    }

    // 두꺼운 유리 (Object_LabGlassware.jsx와 같은 방식): 유리 가운데 선에 검정(두께 + 테두리 두 줄) → 흰색(두께) 순서로
    // 겹쳐 흰 안쪽의 두 겹 선을 만든다. 끝과 모서리는 둥글고, 열린 양 끝에는 두께의 RIM_SCALE배인 둥근 알을 같은 순서로 겹친다
    function drawGlassWall(container, points, glass) {
        var group = container.groupItems.add();
        group.name = "Tube";
        var layers = [[100, glass + LINE_WIDTH_PT * 2], [0, glass]];
        var ends = [points[0].anchor, points[points.length - 1].anchor];
        for (var i = 0; i < layers.length; i++) {
            var wall = drawPath(group, points, false);
            styleStroke(wall, makeColor(layers[i][0]), layers[i][1], []);
            wall.strokeCap = StrokeCap.ROUNDENDCAP;
            wall.strokeJoin = StrokeJoin.ROUNDENDJOIN;
            for (var e = 0; e < ends.length; e++) {
                var d = glass * RIM_SCALE + (layers[i][1] - glass);
                var rim = group.pathItems.ellipse(ends[e][1] + d / 2, ends[e][0] - d / 2, d, d);
                rim.stroked = false;
                rim.filled = true;
                rim.fillColor = makeColor(layers[i][0]);
            }
        }
        return group;
    }

    function styleStroke(path, color, width, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
        try { path.strokeDashes = dashes; } catch (dashError) {}
    }

    function makeColor(k) {
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

    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            if (point.leftDirection[0] !== point.anchor[0] ||
                    point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] ||
                    point.rightDirection[1] !== point.anchor[1]) return null;
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
        return {
            input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
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
        var parts = [
            "v3",
            tubeType,
            boreMm,
            heightDiffMm,
            sameLevel ? "1" : "0",
            levelLeftMm,
            levelRightMm,
            membrane ? "1" : "0",
            membraneWeightPt,
            liquidK,
            offsetXmm,
            offsetYmm,
            previewEnabled ? "1" : "0",
            glassMm
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length !== 14) return;
        tubeType = (p[1] === "1") ? 1 : 0;
        boreMm = restoreNumber(p[2], boreMm, BORE_RANGE, 0.1);
        heightDiffMm = restoreNumber(p[3], heightDiffMm, [0, SIZE_RANGE[1]], 0.5);
        sameLevel = (p[4] === "1");
        levelLeftMm = restoreNumber(p[5], levelLeftMm, [0, SIZE_RANGE[1]], 0.5);
        levelRightMm = restoreNumber(p[6], levelRightMm, [0, SIZE_RANGE[1]], 0.5);
        membrane = (p[7] === "1");
        membraneWeightPt = restoreNumber(p[8], membraneWeightPt, MEMBRANE_WEIGHT_RANGE, 0.1);
        liquidK = restoreNumber(p[9], liquidK, K_RANGE, 10);
        offsetXmm = restoreNumber(p[10], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[11], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = (p[12] === "1");
        glassMm = restoreNumber(p[13], glassMm, GLASS_RANGE, 0.1);
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
