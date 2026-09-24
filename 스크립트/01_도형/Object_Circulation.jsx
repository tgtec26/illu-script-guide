// Object_Circulation.jsx
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


// 순환·배설: 화면 가운데에 두 모식도 중 하나를 그린다.
//   - 혈액 순환: 심장 네 칸(보는 사람 기준 왼쪽이 우심방·우심실), 위에 폐, 아래에 온몸. 우심실 → 폐동맥 → 폐 → 폐정맥 → 좌심방(폐순환),
//     좌심실 → 대동맥 → 온몸 → 대정맥 → 우심방(온몸 순환). 동맥혈은 빨간색, 정맥혈은 파란색(회색 모드는 연한·진한 회색).
//     혈관은 굵은 선 아래에 흰 테두리를 깔아 서로 지나가는 곳이 끊겨 보인다. 혈관 가운데와 심방 → 심실에 화살촉.
//     혈관이 꺾이는 곳은 '혈관 모서리' 반지름(mm)만큼 둥글린다 (0이면 각진 모서리).
//   - 화살표 두께(pt)는 심방 → 심실·여과·재흡수·분비 화살표 선에, 화살촉 크기(%)는 모든 화살촉에 쓴다.
//   - 네프론: 사구체와 보먼주머니, 세뇨관(근위 → 헨레 고리 → 원위), 집합관, 세뇨관을 둘러싼 모세 혈관.
//     관은 굵은 회색 선 아래에 더 굵은 검은 선을 깔아 테두리 있는 관으로 보인다. 여과·재흡수·분비 화살표를 넣을 수 있다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectCirculation/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    // 화살촉 기본 크기 (화살촉 크기 100%). 그릴 때 HEAD_LENGTH·HEAD_WIDTH를 배율에 맞춘다
    var BASE_HEAD_LENGTH = 1.8 * MM;
    var BASE_HEAD_WIDTH = 1.4 * MM;
    var HEAD_LENGTH = BASE_HEAD_LENGTH;
    var HEAD_WIDTH = BASE_HEAD_WIDTH;
    var ARTERIAL = {cmyk: [0, 90, 80, 0], rgb: [220, 40, 40], k: 15};
    var VENOUS = {cmyk: [85, 45, 0, 0], rgb: [40, 100, 200], k: 55};
    var TUBE_K = 12;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["혈액 순환", "네프론"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [30, 200];
    var VESSEL_RANGE = [0.5, 8];
    var CORNER_RANGE = [0, 20];
    var ARROW_RANGE = [0.1, 3];
    var HEAD_RANGE = [30, 300];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var sizeMm = 80;
    var vesselPt = 3;
    var cornerMm = 3;
    var arrowPt = 0.3;
    var headPct = 100;
    var colorOn = true;
    var labelsOn = true;
    var loopsOn = true;
    var transportOn = true;
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
    var dlg = new Window("dialog", "순환·배설");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    addRadioRow(shapePanel, "종류", KINDS, kind, function(i) { kind = i; syncEnabled(); updatePreview(); });
    var sizeRow = addValueRow(shapePanel, "높이", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 1, 0);
    var vesselRow = addValueRow(shapePanel, "관 굵기", "pt", vesselPt, VESSEL_RANGE[0], VESSEL_RANGE[1], 0.5, 1);
    var cornerRow = addValueRow(shapePanel, "혈관 모서리", "mm", cornerMm, CORNER_RANGE[0], CORNER_RANGE[1], 0.5, 1);
    cornerRow.input.helpTip = "혈관이 꺾이는 곳의 둥글기 반지름. 0이면 각진 모서리 (혈액 순환만)";

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var colorCheck = checkRow.add("checkbox", undefined, "색 (빨강·파랑)");
    var labelsCheck = checkRow.add("checkbox", undefined, "이름");
    var checkRow2 = markPanel.add("group");
    var loopsCheck = checkRow2.add("checkbox", undefined, "폐순환·온몸 순환");
    var transportCheck = checkRow2.add("checkbox", undefined, "여과·재흡수·분비");
    var arrowRow = addValueRow(markPanel, "화살표 두께", "pt", arrowPt, ARROW_RANGE[0], ARROW_RANGE[1], 0.1, 1);
    arrowRow.input.helpTip = "심방 → 심실, 여과·재흡수·분비 화살표 선";
    var headRow = addValueRow(markPanel, "화살촉 크기", "%", headPct, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);
    headRow.input.helpTip = "혈관 화살촉을 포함한 모든 화살촉";
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

    colorCheck.value = colorOn;
    labelsCheck.value = labelsOn;
    loopsCheck.value = loopsOn;
    transportCheck.value = transportOn;
    syncEnabled();
    colorCheck.onClick = function() { colorOn = colorCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    loopsCheck.onClick = function() { loopsOn = loopsCheck.value; updatePreview(); };
    transportCheck.onClick = function() { transportOn = transportCheck.value; updatePreview(); };
    bindValueRow(sizeRow, function() { return sizeMm; }, function(v) { sizeMm = v; });
    bindValueRow(vesselRow, function() { return vesselPt; }, function(v) { vesselPt = v; });
    bindValueRow(cornerRow, function() { return cornerMm; }, function(v) { cornerMm = v; });
    bindValueRow(arrowRow, function() { return arrowPt; }, function(v) { arrowPt = v; });
    bindValueRow(headRow, function() { return headPct; }, function(v) { headPct = v; });
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

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
    }

    function syncEnabled() {
        setRowEnabled(cornerRow, kind === 0);
        loopsCheck.enabled = kind === 0;
        transportCheck.enabled = kind === 1;
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
        previewGroup.name = KINDS[kind];
        HEAD_LENGTH = BASE_HEAD_LENGTH * headPct / 100;
        HEAD_WIDTH = BASE_HEAD_WIDTH * headPct / 100;
        var H = sizeMm * MM;
        if (kind === 0) {
            drawCirculation(H);
        } else {
            drawNephron(H);
        }
        var b = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM, viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM);
    }

    function bloodColor(spec) {
        return colorOn ? makeColor(spec) : makeGray(spec.k);
    }

    // 흰 테두리를 깐 굵은 혈관 선. smooth면 점을 부드럽게 잇고, 아니면 꺾은선의 모서리를 cornerMm만큼 둥글린다
    function addVessel(points, spec, name, smooth) {
        var bezier = smooth ? smoothPoints(points) : roundCorners(points, cornerMm * MM);
        var under = drawBezier(previewGroup, bezier, false);
        styleLine(under, vesselPt + 2, null, 0);
        under.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        var line = drawBezier(previewGroup, bezier, false);
        line.filled = false;
        line.stroked = true;
        line.strokeColor = bloodColor(spec);
        line.strokeWidth = vesselPt;
        line.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        line.name = name;
        return line;
    }

    // 꺾은선에서 가장 긴 조각의 가운데에 진행 방향 화살촉
    function addMidHead(points) {
        var best = 1, bestLength = -1;
        for (var i = 1; i < points.length; i++) {
            var l = Math.abs(points[i][0] - points[i - 1][0]) + Math.abs(points[i][1] - points[i - 1][1]);
            if (l > bestLength) { bestLength = l; best = i; }
        }
        var a = points[best - 1], b = points[best];
        var tip = [(a[0] + b[0]) / 2 + (b[0] - a[0]) * 0.05, (a[1] + b[1]) / 2 + (b[1] - a[1]) * 0.05];
        addHead(tip, b[0] - a[0], b[1] - a[1]);
    }

    function drawCirculation(H) {
        var c = circulationLayout(H);
        for (var v = 0; v < c.vessels.length; v++) {
            addVessel(c.vessels[v].points, c.vessels[v].arterial ? ARTERIAL : VENOUS, c.vessels[v].name, false);
            addMidHead(c.vessels[v].points);
        }
        for (var o = 0; o < c.organs.length; o++) {
            var organ = c.organs[o];
            var box = previewGroup.pathItems.roundedRectangle(organ.box[1], organ.box[0], organ.box[2] - organ.box[0], organ.box[1] - organ.box[3], H * 0.03, H * 0.03);
            styleFace(box, 5);
            box.name = organ.name;
            addText(organ.name, (organ.box[0] + organ.box[2]) / 2, (organ.box[1] + organ.box[3]) / 2, 0);
        }
        for (var h = 0; h < c.chambers.length; h++) {
            var ch = c.chambers[h];
            var room = previewGroup.pathItems.roundedRectangle(ch.box[1], ch.box[0], ch.box[2] - ch.box[0], ch.box[1] - ch.box[3], H * 0.015, H * 0.015);
            room.filled = true;
            room.fillColor = bloodColor(ch.arterial ? ARTERIAL : VENOUS);
            room.opacity = colorOn ? 35 : 60;
            room.stroked = true;
            room.strokeColor = makeGray(100);
            room.strokeWidth = LINE_WIDTH_PT;
            room.name = ch.name;
            if (labelsOn) addText(ch.name, (ch.box[0] + ch.box[2]) / 2, (ch.box[1] + ch.box[3]) / 2, 0);
        }
        for (var f = 0; f < c.valves.length; f++) addArrow(c.valves[f], "심방 → 심실").strokeWidth = arrowPt;
        if (labelsOn) {
            for (var l = 0; l < c.vesselLabels.length; l++) addText(c.vesselLabels[l].text, c.vesselLabels[l].p[0], c.vesselLabels[l].p[1], c.vesselLabels[l].align);
        }
        if (loopsOn) {
            addText("폐순환", 0, c.loopY[0], 0);
            addText("온몸 순환", 0, c.loopY[1], 0);
        }
    }

    function drawNephron(H) {
        var n = nephronLayout(H);
        var capillary = addVessel(n.capillary, VENOUS, "모세 혈관", true);
        capillary.strokeWidth = Math.max(0.5, vesselPt * 0.5);
        addVessel(n.afferent, ARTERIAL, "들세동맥", true);
        addVessel(n.efferent, ARTERIAL, "날세동맥", true);
        // 관: 검은 굵은 선 위에 회색 선
        var list = [n.tubule, n.duct];
        for (var i = 0; i < list.length; i++) {
            var outer = drawBezier(previewGroup, smoothPoints(list[i]), false);
            styleLine(outer, vesselPt * 1.6 + 0.6, null, 100);
            outer.strokeCap = StrokeCap.BUTTENDCAP;
            var inner = drawBezier(previewGroup, smoothPoints(list[i]), false);
            styleLine(inner, vesselPt * 1.6, null, TUBE_K);
            inner.name = i === 0 ? "세뇨관" : "집합관";
        }
        // 보먼주머니: 위가 열린 두 겹 원호, 안에 사구체
        for (var r = 0; r < 2; r++) {
            var cup = drawBezier(previewGroup, arcPoints(n.capsule[0], n.capsule[1], n.capsuleR * (1 + r * 0.25), Math.PI * 0.62, Math.PI * 2.38), false);
            styleLine(cup, 0.8, null);
            cup.name = "보먼주머니";
        }
        var knot = drawBezier(previewGroup, smoothPoints(n.glomerulus), false);
        knot.filled = false;
        knot.stroked = true;
        knot.strokeColor = bloodColor(ARTERIAL);
        knot.strokeWidth = Math.max(0.8, vesselPt * 0.6);
        knot.name = "사구체";
        if (transportOn) {
            for (var a = 0; a < n.transport.length; a++) {
                addArrow(n.transport[a].points, n.transport[a].text).strokeWidth = arrowPt;
                if (labelsOn) addText(n.transport[a].text, n.transport[a].label[0], n.transport[a].label[1], 0);
            }
        }
        if (!labelsOn) return;
        for (var l = 0; l < n.labels.length; l++) {
            addLine([n.labels[l].from, [n.labelX, n.labels[l].from[1]]], null, "지시선");
            addText(n.labels[l].text, n.labelX + fontPt * 0.3, n.labels[l].from[1], 1);
        }
    }

    // -------------------------------------------------------
    // 배치 (순수 계산, 심장 가운데 / 보먼주머니 가운데가 (0, 0))
    // -------------------------------------------------------
    // 심장 네 칸, 폐·온몸 상자, 혈관 네 개(꺾은선), 심방 → 심실 화살표, 혈관 이름 자리. 상자·칸은 [왼쪽, 위, 오른쪽, 아래]
    function circulationLayout(H) {
        var w = H * 0.16, h = H * 0.13, g = H * 0.02;
        var cx = (w + g) / 2, cy = (h + g) / 2;
        function box(x, y, bw, bh) { return [x - bw / 2, y + bh / 2, x + bw / 2, y - bh / 2]; }
        var chambers = [
            {name: "우심방", box: box(-cx, cy, w, h), arterial: false},
            {name: "좌심방", box: box(cx, cy, w, h), arterial: true},
            {name: "우심실", box: box(-cx, -cy, w, h), arterial: false},
            {name: "좌심실", box: box(cx, -cy, w, h), arterial: true}
        ];
        var organW = H * 0.34, organH = H * 0.12, lungY = H * 0.4, bodyY = -H * 0.4;
        var lung = box(0, lungY, organW, organH), body = box(0, bodyY, organW, organH);
        var inner = cx + w / 2 + H * 0.07, outer = inner + H * 0.07;
        var vessels = [
            {name: "폐동맥", arterial: false, points: [[-cx - w / 2, -cy], [-inner, -cy], [-inner, lungY], [lung[0], lungY]]},
            {name: "폐정맥", arterial: true, points: [[lung[2], lungY], [inner, lungY], [inner, cy], [cx + w / 2, cy]]},
            {name: "대동맥", arterial: true, points: [[cx + w / 2, -cy], [outer, -cy], [outer, bodyY], [body[2], bodyY]]},
            {name: "대정맥", arterial: false, points: [[body[0], bodyY], [-outer, bodyY], [-outer, cy], [-cx - w / 2, cy]]}
        ];
        var gap = H * 0.015;
        return {
            chambers: chambers,
            organs: [{name: "폐", box: lung}, {name: "온몸", box: body}],
            vessels: vessels,
            valves: [[[-cx, cy - h / 2 + gap], [-cx, -cy + h / 2 - gap]], [[cx, cy - h / 2 + gap], [cx, -cy + h / 2 - gap]]],
            vesselLabels: [
                {text: "폐동맥", p: [-inner + gap, (lungY + cy) / 2 + h * 0.3], align: 1},
                {text: "폐정맥", p: [inner - gap, (lungY + cy) / 2 + h * 0.3], align: -1},
                {text: "대동맥", p: [outer + gap * 2, (bodyY - cy) / 2], align: 1},
                {text: "대정맥", p: [-outer - gap * 2, (bodyY - cy) / 2], align: -1}
            ],
            loopY: [(lungY - organH / 2 + cy + h / 2) / 2, (bodyY + organH / 2 - cy - h / 2) / 2]
        };
    }

    // 꺾은선의 가운데 꼭짓점마다 반지름 r인 원호로 둥글린 베지어 점. 원호가 시작하는 거리(접선 길이)는
    // 이웃 조각 길이의 절반을 넘지 않게 줄인다. r이 0이면 꺾은선 그대로
    function roundCorners(list, r) {
        var points = [{anchor: list[0], left: list[0], right: list[0]}];
        for (var i = 1; i < list.length - 1; i++) {
            var p = list[i];
            var ax = list[i - 1][0] - p[0], ay = list[i - 1][1] - p[1];
            var bx = list[i + 1][0] - p[0], by = list[i + 1][1] - p[1];
            var la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
            var cosInner = (ax * bx + ay * by) / (la * lb);
            var turn = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosInner)));
            if (r <= 0 || turn < 1e-6 || la < 1e-9 || lb < 1e-9) {
                points.push({anchor: p, left: p, right: p});
                continue;
            }
            // 반지름 r인 원호의 접선 길이 r·tan(φ/2)
            var t = Math.min(r * Math.tan(turn / 2), la / 2, lb / 2);
            var radius = t / Math.tan(turn / 2);
            var handle = 4 / 3 * Math.tan(turn / 4) * radius;
            var ux = ax / la, uy = ay / la, vx = bx / lb, vy = by / lb;
            var a = [p[0] + ux * t, p[1] + uy * t], b = [p[0] + vx * t, p[1] + vy * t];
            points.push({anchor: a, left: a, right: [a[0] - ux * handle, a[1] - uy * handle]});
            points.push({anchor: b, left: [b[0] - vx * handle, b[1] - vy * handle], right: b});
        }
        var last = list[list.length - 1];
        points.push({anchor: last, left: last, right: last});
        return points;
    }

    // 두 점 사이를 진폭 amp, 반 파장 n개로 구불거리는 점 목록 (끝점 포함)
    function wiggle(a, b, amp, halves) {
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var length = Math.sqrt(dx * dx + dy * dy);
        var nx = -dy / length, ny = dx / length;
        var list = [], steps = halves * 4;
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var o = amp * Math.sin(Math.PI * halves * t);
            list.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
        }
        return list;
    }

    // 네프론: 보먼주머니 가운데 (0, 0), 단위 s = H / 100
    function nephronLayout(H) {
        var s = H / 100, r = 9 * s;
        var tubule = [[r * 0.75, -r * 0.8]];
        var proximal = wiggle([r * 1.2, -r * 1.1], [30 * s, -12 * s], 3 * s, 4);
        tubule = tubule.concat(proximal);
        tubule.push([32 * s, -22 * s], [32 * s, -70 * s], [36 * s, -78 * s], [41 * s, -78 * s], [45 * s, -70 * s], [45 * s, -22 * s]);
        tubule = tubule.concat(wiggle([47 * s, -14 * s], [62 * s, -6 * s], 2.5 * s, 3));
        tubule.push([74 * s, -8 * s]);
        var duct = [[74 * s, 12 * s], [74 * s, -40 * s], [74 * s, -95 * s]];
        // 사구체: 작은 고리를 여러 번 도는 실타래
        var knot = [];
        for (var k = 0; k <= 60; k++) {
            var t = k / 60 * Math.PI * 6;
            var rr = r * 0.55 * (0.55 + 0.45 * Math.sin(t * 1.7));
            knot.push([rr * Math.cos(t), rr * Math.sin(t)]);
        }
        var capillary = [[3 * s, r * 1.4], [18 * s, 8 * s], [26 * s, -18 * s], [27 * s, -75 * s], [38 * s, -86 * s], [51 * s, -75 * s],
            [51 * s, -24 * s], [60 * s, -18 * s], [68 * s, -25 * s]];
        return {
            capsule: [0, 0], capsuleR: r, tubule: tubule, duct: duct, glomerulus: knot, capillary: capillary,
            afferent: [[-22 * s, 18 * s], [-8 * s, r * 1.5], [-r * 0.3, r * 0.4]],
            efferent: [[r * 0.3, r * 0.4], [3 * s, r * 1.4]],
            transport: [
                {text: "여과", points: [[0, r * 0.1], [r * 0.55, -r * 0.55]], label: [-r * 1.8, -r * 1.1]},
                {text: "재흡수", points: [[32 * s, -45 * s], [27.5 * s, -45 * s]], label: [21 * s, -40 * s]},
                {text: "분비", points: [[51 * s, -55 * s], [45.5 * s, -55 * s]], label: [57 * s, -50 * s]}
            ],
            labelX: 84 * s,
            labels: [
                {text: "사구체", from: [r * 0.5, r * 0.2]},
                {text: "보먼주머니", from: [r * 1.25, -r * 0.2]},
                {text: "세뇨관", from: [45 * s, -30 * s]},
                {text: "모세 혈관", from: [51 * s, -65 * s]},
                {text: "집합관", from: [74 * s, -85 * s]}
            ]
        };
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v2", kind, sizeMm, vesselPt, colorOn ? "1" : "0", labelsOn ? "1" : "0", loopsOn ? "1" : "0", transportOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0", cornerMm, arrowPt, headPct];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 15) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        sizeMm = restoreNumber(p[2], sizeMm, SIZE_RANGE, 1);
        vesselPt = restoreNumber(p[3], vesselPt, VESSEL_RANGE, 0.5);
        colorOn = p[4] === "1";
        labelsOn = p[5] === "1";
        loopsOn = p[6] === "1";
        transportOn = p[7] === "1";
        fontPt = restoreNumber(p[8], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[9], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[10], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[11] === "1";
        cornerMm = restoreNumber(p[12], cornerMm, CORNER_RANGE, 0.5);
        arrowPt = restoreNumber(p[13], arrowPt, ARROW_RANGE, 0.1);
        headPct = restoreNumber(p[14], headPct, HEAD_RANGE, 10);
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

        // 꺾은선 화살표: 마지막 점에 화살촉
    function addArrow(points, name, container) {
        var line = addLine(points, null, name, container);
        var a = points[points.length - 2], b = points[points.length - 1];
        addHead(b, b[0] - a[0], b[1] - a[1], container);
        return line;
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

        // 문서 색상 모드에 맞춰 {cmyk, rgb}에서 색을 만든다
    function makeColor(spec) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = spec.cmyk[0];
            cmyk.magenta = spec.cmyk[1];
            cmyk.yellow = spec.cmyk[2];
            cmyk.black = spec.cmyk[3];
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = spec.rgb[0];
        rgb.green = spec.rgb[1];
        rgb.blue = spec.rgb[2];
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
