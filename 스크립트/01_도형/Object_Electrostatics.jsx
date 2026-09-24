// Object_Electrostatics.jsx
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


// 정전기: 화면 가운데에 검전기나 정전기 유도 모식도를 그린다.
//   - 검전기: 살짝 위에서 본 모습 (교재 그림 비율). 둥근 어깨의 유리병과 안쪽 바닥, 테 달린 원통 마개와 기둥,
//     얇은 원판 금속판, 굵은 금속 막대, 막대 끝에서 휘어 벌어지는 금속박 두 장. 음영은 면마다 단색 K 한 가지.
//     상태 '대전 안 됨'은 금속박이 닫히고 +−가 짝지어 있다. '대전체를 가까이'는 정전기 유도라 금속판에 대전체와 반대 전하,
//     금속박에 같은 전하가 모여 금속박이 벌어진다. '접촉 후'는 대전체를 뗀 뒤라 검전기 전체가 대전체와 같은 전하로 대전되어 벌어진다.
//   - 금속 막대 유도: 왼쪽 대전체에 가까운 A쪽에 반대 전하, 먼 B쪽에 같은 전하가 모인다.
//   - 전하 기호는 선으로 그린 +, − (원 테두리 선택).

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectElectrostatics/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var CHARGE_WIDTH_PT = 0.6;
    var HEAD_LENGTH = 1.4 * MM;
    var HEAD_WIDTH = 1 * MM;
    var GLASS_K = 5;
    var METAL_K = 25;
    var STOPPER_K = 50;
    var ROD_K = 12;
    // 살짝 위에서 본 원: 타원 세로 ÷ 가로
    var TILT = 0.17;
    var PLATE_K = 75;
    var ROD_METAL_K = 80;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["검전기", "금속 막대 유도"];
    var SIGNS = ["+ 대전체", "− 대전체"];
    var STATES = ["대전 안 됨", "대전체를 가까이", "접촉 후"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [20, 150];
    var ANGLE_RANGE = [5, 90];
    var CHARGE_RANGE = [1, 6];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var sign = 1;
    var state = 1;
    var sizeMm = 50;
    var foilAngle = 40;
    var chargeMm = 2.2;
    var ringOn = false;
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
    var dlg = new Window("dialog", "정전기");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    addRadioRow(shapePanel, "종류", KINDS, kind, function(i) { kind = i; syncEnabled(); updatePreview(); });
    addRadioRow(shapePanel, "대전체", SIGNS, sign, function(i) { sign = i; updatePreview(); });
    var stateRadios = addRadioRow(shapePanel, "상태", STATES, state, function(i) { state = i; updatePreview(); });
    var sizeRow = addValueRow(shapePanel, "크기", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 1, 0);
    sizeRow.input.helpTip = "검전기 높이 / 금속 막대 길이";
    var angleRow = addValueRow(shapePanel, "금속박 벌어짐", "°", foilAngle, ANGLE_RANGE[0], ANGLE_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var chargeRow = addValueRow(markPanel, "전하 기호", "mm", chargeMm, CHARGE_RANGE[0], CHARGE_RANGE[1], 0.1, 1);
    var checkRow = markPanel.add("group");
    var ringCheck = checkRow.add("checkbox", undefined, "기호 원 테두리");
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

    ringCheck.value = ringOn;
    labelsCheck.value = labelsOn;
    syncEnabled();
    ringCheck.onClick = function() { ringOn = ringCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    bindValueRow(sizeRow, function() { return sizeMm; }, function(v) { sizeMm = v; });
    bindValueRow(angleRow, function() { return foilAngle; }, function(v) { foilAngle = v; });
    bindValueRow(chargeRow, function() { return chargeMm; }, function(v) { chargeMm = v; });
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

    // 상태·금속박은 검전기에만 있다
    function syncEnabled() {
        for (var i = 0; i < stateRadios.length; i++) stateRadios[i].enabled = kind === 0;
        setRowEnabled(angleRow, kind === 0);
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
        var rodSign = sign === 0 ? 1 : -1;
        if (kind === 0) {
            drawElectroscope(sizeMm * MM, rodSign);
        } else {
            drawInduction(sizeMm * MM, rodSign);
        }
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    // 살짝 위에서 본 검전기 (오투 중학 과학 2-2 87쪽 검전기 비율): 둥근 어깨의 유리병, 병 목을 덮는 테와 긴 원통 마개,
    // 가는 기둥, 얇은 금속판, 굵은 금속 막대 끝에서 휘어 벌어지는 금속박.
    // 유리병 → 병 바닥 → 금속 막대·금속박 → 마개 → 기둥 → 금속판 순서로 겹친다
    function drawElectroscope(H, rodSign) {
        var p = electroscopeParts(H);
        var charges = electroscopeCharges(state, rodSign);
        var jar = addBezier(jarOutline(p), true, "유리병");
        styleFace(jar, GLASS_K);
        var dish = previewGroup.pathItems.ellipse(p.dish[1] + p.dish[3], -p.dish[2], p.dish[2] * 2, p.dish[3] * 2);
        styleLine(dish, LINE_WIDTH_PT, null, 40);
        dish.name = "병 바닥";
        var dishFront = addBezier(lowerHalfEllipse(0, p.dish[1] - p.dishThick, p.dish[2], p.dish[3]), false, "병 바닥");
        styleLine(dishFront, LINE_WIDTH_PT, null, 40);
        addPolygon([[-p.rodRx, p.cap[0]], [p.rodRx, p.cap[0]], [p.rodRx, p.foilTop[1]], [-p.rodRx, p.foilTop[1]]], ROD_METAL_K, "금속 막대");
        var angle = charges.foil.open ? foilAngle : 4;
        var foils = [];
        for (var side = -1; side <= 1; side += 2) {
            var foil = foilPoints(p.foilTop, p.foilLength, p.foilWidth, angle / 2 * side);
            addPolygon(foil.outline, METAL_K, "금속박");
            foils.push(foil);
        }
        addCylinder(p.rimRx, p.cap[0], p.rimTop, STOPPER_K + 10, "마개 테");
        addCylinder(p.capRx, p.rimTop, p.cap[1], STOPPER_K, "마개");
        addCylinder(p.stemRx, p.cap[1], p.plate[0], STOPPER_K, "마개 기둥");
        addCylinder(p.plateRx, p.plate[0], p.plate[1], PLATE_K, "금속판");
        var s = chargeMm * MM;
        placeCharges([0, p.plate[1] + p.plateRx * TILT + s * 0.8], p.plateRx * 1.6, 0, charges.plate, 3, s);
        // 닫힌 금속박은 붙어 있어 짝을 하나씩만 둔다
        for (var f = 0; f < 2; f++) placeCharges(foils[f].middle, p.foilLength * 0.5, foils[f].angle, charges.foil.sign, charges.foil.open ? 2 : 1, s);
        var rod = null;
        if (state === 1) {
            // 대전체: 금속판 위 왼쪽에서 비스듬히 다가오는 막대
            rod = rodShape([-H * 0.05, p.plate[1] + H * 0.16], H * 0.55, H * 0.09, 20);
            styleFace(addBezier(rod.capsule, true, "대전체"), ROD_K);
            placeCharges(rod.middle, H * 0.4, rod.angle, rodSign, 4, s);
        }
        if (!labelsOn) return;
        var gap = fontPt * 0.6;
        var right = p.bodyRx + gap * 2;
        addLabel("금속판", [p.plateRx, (p.plate[0] + p.plate[1]) / 2], right);
        addLabel("금속 막대", [p.rodRx, (p.cap[0] + p.foilTop[1]) / 2], right);
        addLabel("유리병", [p.bodyRx, p.sideTop - H * 0.08], right);
        addLabel("금속박", foils[1].tip, right);
        if (rod !== null) addText("대전체", rod.middle[0], rod.middle[1] + H * 0.14, 0);
    }

    // 원통: 옆면(아래는 앞쪽 반 타원) 위에 윗면 타원
    function addCylinder(rx, bottom, top, k, name) {
        var ry = rx * TILT;
        var side = [{anchor: [-rx, top], left: [-rx, top], right: [-rx, top]}].concat(lowerHalfEllipse(0, bottom, rx, ry));
        side.push({anchor: [rx, top], left: [rx, top], right: [rx, top]});
        styleFace(addBezier(side, true, name), k);
        var lid = previewGroup.pathItems.ellipse(top + ry, -rx, rx * 2, ry * 2);
        styleFace(lid, k);
        lid.name = name;
    }

    function addBezier(points, closed, name) {
        var path = previewGroup.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            path.pathPoints[j].leftDirection = points[j].left;
            path.pathPoints[j].rightDirection = points[j].right;
        }
        path.closed = closed;
        path.name = name;
        return path;
    }

    function drawInduction(L, rodSign) {
        var h = L * 0.22;
        var bar = previewGroup.pathItems.roundedRectangle(h / 2, 0, L, h, h * 0.45, h * 0.45);
        styleFace(bar, METAL_K);
        bar.name = "금속 막대";
        addLine([[L / 2, -h / 2], [L / 2, -h * 2]], null, "받침").strokeWidth = 1.2;
        addLine([[L / 2 - h, -h * 2], [L / 2 + h, -h * 2]], null, "받침").strokeWidth = 1.2;
        var gapX = L * 0.12;
        var rod = previewGroup.pathItems.roundedRectangle(h * 0.55, -gapX - L * 0.6, L * 0.6, h * 1.1, h * 0.3, h * 0.3);
        styleFace(rod, ROD_K);
        rod.name = "대전체";
        var s = chargeMm * MM;
        placeCharges([-gapX - L * 0.3, 0], L * 0.45, 0, rodSign, 4, s);
        var sides = inductionCharges(rodSign);
        placeCharges([h * 0.5, 0], h * 0.8, Math.PI / 2, sides.near, 3, s);
        placeCharges([L - h * 0.5, 0], h * 0.8, Math.PI / 2, sides.far, 3, s);
        if (!labelsOn) return;
        var gap = fontPt * 0.9;
        addText("A", 0, h / 2 + gap, 0);
        addText("B", L, h / 2 + gap, 0);
        addText("대전체", -gapX - L * 0.3, h * 0.55 + gap, 0);
        addText("금속 막대", L / 2, -h * 2 - gap, 0);
    }

    // 지시선: 점에서 오른쪽 x까지, 끝에 이름
    function addLabel(text, from, x) {
        addLine([from, [x, from[1]]], null, "지시선");
        addText(text, x + fontPt * 0.3, from[1], 1);
    }

    // center를 가운데로 angle 방향 길이 span에 count개. value가 0이면 +− 짝
    function placeCharges(center, span, angle, value, count, s) {
        var ux = Math.cos(angle), uy = Math.sin(angle);
        for (var i = 0; i < count; i++) {
            var t = count === 1 ? 0 : span * (i / (count - 1) - 0.5);
            var c = [center[0] + ux * t, center[1] + uy * t];
            if (value === 0) {
                // 짝: 막대 방향과 수직으로 나란히
                var off = s * 0.6;
                addCharge([c[0] - uy * off, c[1] + ux * off], 1, s);
                addCharge([c[0] + uy * off, c[1] - ux * off], -1, s);
            } else {
                addCharge(c, value, s);
            }
        }
    }

    // 선으로 그린 + / −, 원 테두리 선택
    function addCharge(c, value, s) {
        var h = s / 2 * 0.75;
        if (ringOn) {
            var ring = addDisc(c, s * 1.3, 0, "전하");
            ring.strokeWidth = LINE_WIDTH_PT;
        }
        addLine([[c[0] - h, c[1]], [c[0] + h, c[1]]], null, value > 0 ? "+" : "−").strokeWidth = CHARGE_WIDTH_PT;
        if (value > 0) addLine([[c[0], c[1] - h], [c[0], c[1] + h]], null, "+").strokeWidth = CHARGE_WIDTH_PT;
    }

    // -------------------------------------------------------
    // 기하 (순수 계산)
    // -------------------------------------------------------
    // 검전기 부품 자리 (높이 H, 병 바닥 앞 끝 y = −H/2 ~ 금속판 윗면 y ≈ H/2). 원통은 [아래 y, 위 y]와 가로 반지름,
    // 타원 세로 = 가로 × TILT. 비율은 교재 그림에서 쟀다
    function electroscopeParts(H) {
        return {
            bottom: -H / 2, bodyRx: H * 0.323, sideTop: -H * 0.04, sideBottom: -H * 0.40, neckRx: H * 0.126, neckTop: H * 0.22,
            dish: [0, -H * 0.28, H * 0.31, H * 0.31 * TILT], dishThick: H * 0.05,
            cap: [H * 0.19, H * 0.40], rimTop: H * 0.225, rimRx: H * 0.136, capRx: H * 0.126,
            stemRx: H * 0.045,
            plate: [H * 0.455, H * 0.473], plateRx: H * 0.188,
            rodRx: H * 0.017,
            foilTop: [0, -H * 0.134], foilLength: H * 0.3, foilWidth: H * 0.03
        };
    }

    // 유리병 앞모습: 목 → 둥근 어깨(목에서 가로로 나가 옆에서 세로로) → 곧은 옆 → 둥근 바닥(앞쪽 반 타원) → 반대편.
    // 목 위 끝은 마개 테가 덮는다
    function jarOutline(p) {
        var k = 0.5523;
        var w = p.bodyRx - p.neckRx, h = p.neckTop - p.sideTop;
        var pts = [];
        function corner(x, y) { pts.push({anchor: [x, y], left: [x, y], right: [x, y]}); }
        pts.push({anchor: [-p.neckRx, p.neckTop], left: [-p.neckRx, p.neckTop], right: [-p.neckRx - w * k, p.neckTop]});
        pts.push({anchor: [-p.bodyRx, p.sideTop], left: [-p.bodyRx, p.sideTop + h * k], right: [-p.bodyRx, p.sideTop]});
        pts = pts.concat(lowerHalfEllipse(0, p.sideBottom, p.bodyRx, p.sideBottom - p.bottom));
        pts.push({anchor: [p.bodyRx, p.sideTop], left: [p.bodyRx, p.sideTop], right: [p.bodyRx, p.sideTop + h * k]});
        pts.push({anchor: [p.neckRx, p.neckTop], left: [p.neckRx + w * k, p.neckTop], right: [p.neckRx, p.neckTop]});
        return pts;
    }

    // 중심 (cx, cy) 타원의 아래 반: 왼쪽 끝 → 아래 → 오른쪽 끝 (베지어 3점)
    function lowerHalfEllipse(cx, cy, rx, ry) {
        var k = 0.5523;
        return [
            {anchor: [cx - rx, cy], left: [cx - rx, cy], right: [cx - rx, cy - ry * k]},
            {anchor: [cx, cy - ry], left: [cx - rx * k, cy - ry], right: [cx + rx * k, cy - ry]},
            {anchor: [cx + rx, cy], left: [cx + rx, cy - ry * k], right: [cx + rx, cy]}
        ];
    }

    // 막대 아래 끝 top에 매달린 금속박: 처음엔 아래로 내려가다 휘어 끝이 세로에서 angleDeg만큼(+는 오른쪽) 벌어진 띠.
    // 끝점은 top에서 length 거리, angleDeg 방향
    function foilPoints(top, length, width, angleDeg) {
        var a = -Math.PI / 2 + angleDeg * Math.PI / 180;
        var tip = [top[0] + Math.cos(a) * length, top[1] + Math.sin(a) * length];
        var control = [top[0], top[1] - length * 0.5];
        var left = [], right = [];
        var steps = 8;
        for (var i = 0; i <= steps; i++) {
            var t = i / steps, u = 1 - t;
            var x = u * u * top[0] + 2 * u * t * control[0] + t * t * tip[0];
            var y = u * u * top[1] + 2 * u * t * control[1] + t * t * tip[1];
            var dx = 2 * u * (control[0] - top[0]) + 2 * t * (tip[0] - control[0]);
            var dy = 2 * u * (control[1] - top[1]) + 2 * t * (tip[1] - control[1]);
            var d = Math.sqrt(dx * dx + dy * dy);
            var nx = -dy / d * width / 2, ny = dx / d * width / 2;
            left.push([x + nx, y + ny]);
            right.unshift([x - nx, y - ny]);
        }
        var m = 0.55, mu = 1 - m;
        return {
            outline: left.concat(right), tip: tip, angle: a,
            middle: [mu * mu * top[0] + 2 * mu * m * control[0] + m * m * tip[0], mu * mu * top[1] + 2 * mu * m * control[1] + m * m * tip[1]]
        };
    }

    // 대전체 막대: 오른쪽 끝 end, 길이 length, 굵기 thick, 가로에서 angleDeg만큼 오른쪽 아래로 기운다
    function rodShape(end, length, thick, angleDeg) {
        var a = -angleDeg * Math.PI / 180;
        var ux = Math.cos(a), uy = Math.sin(a);
        var nx = -uy * thick / 2, ny = ux * thick / 2;
        var start = [end[0] - ux * length, end[1] - uy * length];
        return {
            outline: [[start[0] + nx, start[1] + ny], [end[0] + nx, end[1] + ny], [end[0] - nx, end[1] - ny], [start[0] - nx, start[1] - ny]],
            capsule: capsulePoints(start, end, thick / 2),
            middle: [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2], angle: a
        };
    }

    // 양 끝이 반원인 막대 (베지어 6점). 전체 길이가 start–end가 되도록 반원 중심을 r만큼 안으로 둔다
    function capsulePoints(start, end, r) {
        var dx = end[0] - start[0], dy = end[1] - start[1];
        var d = Math.sqrt(dx * dx + dy * dy);
        var u = [dx / d, dy / d], n = [-u[1], u[0]];
        var k = 0.5523 * r;
        var s0 = [start[0] + u[0] * r, start[1] + u[1] * r], e0 = [end[0] - u[0] * r, end[1] - u[1] * r];
        function at(c, a, b) { return [c[0] + a[0] * b, c[1] + a[1] * b]; }
        function pt(anchor, left, right) { return {anchor: anchor, left: left, right: right}; }
        var p1 = at(s0, n, r), p2 = at(e0, n, r), p3 = at(e0, u, r), p4 = at(e0, n, -r), p5 = at(s0, n, -r), p6 = at(s0, u, -r);
        return [
            pt(p1, at(p1, u, -k), p1), pt(p2, p2, at(p2, u, k)), pt(p3, at(p3, n, k), at(p3, n, -k)),
            pt(p4, at(p4, u, k), p4), pt(p5, p5, at(p5, u, -k)), pt(p6, at(p6, n, -k), at(p6, n, k))
        ];
    }

    // 상태별 전하: 0이면 +− 짝. 가까이면 금속판은 반대, 금속박은 같은 전하. 접촉 후면 모두 같은 전하
    function electroscopeCharges(stateIndex, rodSign) {
        if (stateIndex === 0) return {plate: 0, foil: {sign: 0, open: false}};
        if (stateIndex === 1) return {plate: -rodSign, foil: {sign: rodSign, open: true}};
        return {plate: rodSign, foil: {sign: rodSign, open: true}};
    }

    // 금속 막대 유도: 가까운 쪽은 반대, 먼 쪽은 같은 전하
    function inductionCharges(rodSign) {
        return {near: -rodSign, far: rodSign};
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", kind, sign, state, sizeMm, foilAngle, chargeMm, ringOn ? "1" : "0", labelsOn ? "1" : "0",
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
        sign = restoreNumber(p[2], sign, [0, SIGNS.length - 1], 1);
        state = restoreNumber(p[3], state, [0, STATES.length - 1], 1);
        sizeMm = restoreNumber(p[4], sizeMm, SIZE_RANGE, 1);
        foilAngle = restoreNumber(p[5], foilAngle, ANGLE_RANGE, 1);
        chargeMm = restoreNumber(p[6], chargeMm, CHARGE_RANGE, 0.1);
        ringOn = p[7] === "1";
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

        function addDisc(center, diameter, k, name, container) {
        var disc = (container || previewGroup).pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
        styleFace(disc, k);
        disc.name = name;
        return disc;
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
