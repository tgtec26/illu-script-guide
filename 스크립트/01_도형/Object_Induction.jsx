// Object_Induction.jsx
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

// 전자기 유도 실험 장치: 받침판 두 장 사이의 원통에 도선을 감은 코일, 그 위의 막대자석, 코일 단자와 도선으로 이은 검류계.
//   - 앞에서 조금 위로 내려다본 모습. 둥근 것은 세로로 눌린 타원, 상자(검류계·자석)는 깊이를 오른쪽 위로 비껴 그린다.
//   - 검류계와 도선은 교과서(완자 중3 266쪽) 그림을 따른다: 눈금판이 뒤로 기운 쐐기 모양 상자, 앞쪽 오목한 받침에 검정(−)·빨강(+) 단자,
//     코일 쪽은 아래 받침판의 나사 단자 둘. 도선 양 끝은 악어 집게. 검류계는 위 받침판 높이에 떠 있다.
//   - 사진처럼 보이도록 원통·도선·금속에 그라데이션을 쓰고, 코일 전체에 투명도 그라데이션 음영을 덧씌운다.
//   - 컬러(빨강 N·파랑 S, 구리 도선, 청회색 검류계) 또는 회색 음영.
//   - 코일: 두께(바깥 지름)·높이·감은 횟수. 도선 굵기는 0.75mm이고, 감은 간격이 더 좁으면 간격에 맞춘다(촘촘히 감김).
//     간격이 넓으면 도선 사이로 원통이 보인다. 앞쪽 반바퀴만 보이며 나선이라 오른쪽 끝이 반 간격 높다.
//   - 자석: 아래쪽 극(N/S)을 고른다. 손(선 그림, 흰 채움)으로 잡은 모습을 켜고 끌 수 있다. 교과서 사진처럼 왼쪽에서 온 손의 엄지가
//     자석 앞 왼쪽을 누르고, 네 손가락은 자석 뒤로 감겨 오른쪽 모서리 밖으로 손끝만 보인다.
//   - 검류계 바늘 각도(°, 오른쪽 +)를 정한다.
//   - 확인하면 장치 전체가 든 그룹 하나가 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    // ==== 순수 기하 시작 (tests/check-induction.js 가 이 구간을 그대로 읽는다) ====
    var MM = 2.834645669;
    var KAPPA = 0.5522847498;
    var TILT = 0.3;              // 위에서 비스듬히 본 원: 세로 반지름 / 가로 반지름
    var DEPTH = [0.35, 0.3];     // 상자 깊이 1이 화면에서 옮겨 가는 양 (검류계·자석, 오른쪽 위로)
    var WIRE_MM = 0.75;          // 도선 굵기 (감은 간격이 더 좁으면 간격의 92 %)
    var PLATE_MARGIN_MM = 7;     // 받침판이 코일보다 양옆으로 나오는 길이
    var PLATE_T_MM = 2.5;        // 받침판 두께
    var PLATE_BACK = 0.9;        // 받침판 윗면의 뒤쪽 폭 비율 (원근)
    var MAGNET = {w: 8, len: 40, depth: 5, gap: 6, handGap: 5};        // mm. gap: 위 받침판에서 자석 아래 끝까지, handGap: 자석 위끝에서 손 위끝까지
    // 검류계(mm): 옆에서 본 단면이 쐐기 모양. 앞 턱(높이 lipH, 앞면이 비스듬히 lipZ까지) 뒤에 단자가 서는 오목한 받침(바닥 trayY, 깊이 trayZ까지),
    // 그 뒤로 눈금판이 뒤로 기울어 높이 h(깊이 faceTopZ)까지 오른다. 코일 위 받침판 높이에 떠 있다 (교과서 그림 배치)
    var GALV = {gap: 8, w: 36, depth: 18, h: 26, lipH: 4, lipZ: 1.6, rimZ: 2.4, trayY: 2.6, trayZ: 9, faceTopZ: 14.5, wall: 1.2, frame: 2.2};
    var CLIP_MM = 8;             // 악어 집게 길이 (고무 5 + 쇠 집게 3)
    var SCALE_SPAN = 50;         // 눈금 양쪽 끝 각도(°)
    var SCALE_STEP = 5;
    var SCALE_MAJOR = 25;

    // 감은 간격·도선 굵기·도선 중심 반지름·원통 반지름 (pt). d: 바깥 지름, h: 높이
    function coilLayout(d, h, turns) {
        var pitch = h / turns;
        var wire = Math.min(WIRE_MM * MM, pitch * 0.92);
        return {pitch: pitch, wire: wire, rw: d / 2 - wire / 2, rc: d / 2 - wire};
    }

    // 앞쪽 반바퀴(왼쪽 끝 → 앞 → 오른쪽 끝)를 베지어 점 3개로. 나선 x = r·cosθ, y = y0 + pitch·(θ−π)/2π + e·sinθ (θ: π → 2π).
    // 점: {anchor, left, right}
    function frontHalfTurn(r, e, pitch, y0) {
        var points = [];
        var thetas = [Math.PI, Math.PI * 1.5, Math.PI * 2];
        for (var i = 0; i < 3; i++) {
            var t = thetas[i];
            var anchor = [r * Math.cos(t), y0 + pitch * (t - Math.PI) / (2 * Math.PI) + e * Math.sin(t)];
            var tangent = [-r * Math.sin(t) * KAPPA, (pitch / (2 * Math.PI) + e * Math.cos(t)) * KAPPA];
            points.push({
                anchor: anchor,
                left: i === 0 ? anchor : [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: i === 2 ? anchor : [anchor[0] + tangent[0], anchor[1] + tangent[1]]
            });
        }
        return points;
    }

    // 원통 앞면 실루엣: 위는 곧은 선(위 받침판에 가려짐), 아래는 앞쪽 반타원. 가운데 x=0, 아래 중심 y=bottom
    function cylinderFront(r, bottom, top) {
        var e = r * TILT;
        return [
            {anchor: [-r, top], left: [-r, top], right: [-r, top]},
            {anchor: [r, top], left: [r, top], right: [r, top]},
            {anchor: [r, bottom], left: [r, bottom], right: [r, bottom - e * KAPPA]},
            {anchor: [0, bottom - e], left: [r * KAPPA, bottom - e], right: [-r * KAPPA, bottom - e]},
            {anchor: [-r, bottom], left: [-r, bottom - e * KAPPA], right: [-r, bottom]}
        ];
    }

    // 상자 점 (x, y, 깊이 z) → 화면
    function project(x, y, z) {
        return [x + DEPTH[0] * z, y + DEPTH[1] * z];
    }

    // 평행사변형 면 위의 점: origin + u·ex + v·ey (u, v는 면의 가로·세로 길이 단위)
    function faceMapper(origin, ex, ey) {
        return function(u, v) {
            return [origin[0] + u * ex[0] + v * ey[0], origin[1] + u * ex[1] + v * ey[1]];
        };
    }

    // 눈금: 중심 (cx, cy), 반지름 r, 위쪽으로 ±span°. 눈금마다 [바깥 점, 안쪽 점, 큰 눈금?]
    function scaleTicks(cx, cy, r, major, minor) {
        var ticks = [];
        for (var a = -SCALE_SPAN; a <= SCALE_SPAN + 1e-9; a += SCALE_STEP) {
            var big = Math.abs(a % SCALE_MAJOR) < 1e-9;
            var len = big ? major : minor;
            var s = Math.sin(a * Math.PI / 180), c = Math.cos(a * Math.PI / 180);
            ticks.push([[cx + r * s, cy + r * c], [cx + (r - len) * s, cy + (r - len) * c], big]);
        }
        return ticks;
    }

    // 점을 지나는 매끄러운 곡선(캣멀-롬 → 베지어). 점에 세 번째 값 "c"가 있으면 꺾인 점
    function smoothPoints(pts, closed) {
        var n = pts.length, out = [];
        for (var i = 0; i < n; i++) {
            var p = pts[i];
            var prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
            var next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
            var corner = p[2] === "c" || (!closed && (i === 0 || i === n - 1));
            var tx = (next[0] - prev[0]) / 6, ty = (next[1] - prev[1]) / 6;
            out.push({
                anchor: [p[0], p[1]],
                left: corner ? [p[0], p[1]] : [p[0] - tx, p[1] - ty],
                right: corner ? [p[0], p[1]] : [p[0] + tx, p[1] + ty]
            });
        }
        return out;
    }

    // 손(선 그림, 교과서 사진을 본뜸): 자석 앞면 왼쪽 모서리 x=0, 손 위끝(집게손가락 마디) y=0, 단위 mm(자석 폭 8mm 기준, HAND_SCALE배로 그림).
    // 왼쪽 모서리에서 재므로 크기를 줄여도 손이 자석 모서리에 붙어 있다
    // 팔이 왼쪽에서 오고 손등이 보인다. 엄지는 자석 앞 왼쪽을 누르고, 네 손가락은 자석 뒤로 감겨 오른쪽 모서리 밖으로 손끝만 보인다.
    // back: 자석보다 먼저 그리는 손끝 [위, 아래, 자석 오른쪽 면에서 나온 길이]. 나머지는 자석 위에 그린다
    var HAND_SCALE = 0.85;
    var HAND = {
        tips: [[-9.6, -14.6, 3.6], [-14.4, -20.8, 4.2], [-20.6, -26.8, 3.9], [-26.6, -31.6, 3.0]],
        body: [[-26, -2.5, "c"], [-20, -1.7], [-14, -0.9], [-7, 0], [-3, -0.6], [-0.8, -2.6], [0, -5.2, "c"], [0, -12, "c"],
            [-2.5, -14], [-11, -21.3], [-17, -21.2], [-22, -19.6], [-26, -17.4, "c"]],
        topLine: [[-26, -2.5], [-20, -1.7], [-14, -0.9], [-7, 0], [-3, -0.6], [-0.8, -2.6], [0, -5.2]],
        bottomLine: [[-26, -17.4], [-22, -19.6], [-17, -21.2], [-12, -21.5], [-10.5, -21.4]],
        // 왼쪽에 보이는 굽은 집게·가운뎃손가락의 아래 가장자리
        folds: [[[-8, -3.2], [-3.5, -4.6], [0, -7.5]], [[-9, -7.2], [-4, -9], [0, -11.2]]],
        // 엄지: 채움은 전체, 선은 앞 thumbLine개 점만(손바닥에 붙은 뿌리에는 선이 없다)
        thumb: [[-13, -13.5], [-8, -15.2], [-3.5, -18.5], [-0.6, -21.5], [0.8, -23.6], [-0.2, -25.2], [-3, -25.4], [-7, -23.2], [-11, -21.3], [-15, -19]],
        thumbLine: 9,
        nail: [[-1.3, -21.6], [0, -22.6], [-0.1, -23.8]]
    };

    // 자석 뒤에서 오른쪽으로 나온 손끝 하나: 자석 오른쪽 면 x=edge에서 둥글게 나왔다가 돌아간다 (단위는 그림 좌표)
    function fingertipPoints(edge, top, bottom, out) {
        var mid = (top + bottom) / 2, h = top - bottom, hidden = edge - out * 0.3;
        return [[hidden, top, "c"], [edge + out * 0.55, top - h * 0.05], [edge + out, mid], [edge + out * 0.6, bottom + h * 0.08], [hidden, bottom, "c"]];
    }
    // ==== 순수 기하 끝 ====

    var PREF_KEY = "ObjectInduction/settings";
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var MARK_FONT_NAME = "SpoqaHanSansNeo-Bold";   // 자석 N·S, 검류계 G (물체에 새긴 굵은 글자)
    var EDGE_PT = 0.25;          // 면 가장자리 선
    var HAND_PT = 0.5;
    var CABLE_PT = 1.3;
    var NEEDLE_PT = 0.6;

    var MODES = ["컬러", "회색 음영"];
    var POLES = ["N극이 아래", "S극이 아래"];
    var LABEL_WIDTH = 110;
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var RADIO_KEYS = ["mode", "pole"];
    var CHECK_KEYS = ["hand"];
    var NUMBER_KEYS = ["coilD", "coilH", "turns", "needle", "offsetX", "offsetY"];
    var SPECS = {
        coilD: {range: [12, 40], step: 0.5, decimals: 1},
        coilH: {range: [12, 60], step: 0.5, decimals: 1},
        turns: {range: [3, 80], step: 1, decimals: 0},
        needle: {range: [-SCALE_SPAN, SCALE_SPAN], step: 1, decimals: 0},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1}
    };

    // 색: c = [C, M, Y, K] (컬러), k = 회색 음영의 K
    var COLORS = {
        white: {c: [0, 0, 0, 0], k: 0},
        black: {c: [0, 0, 0, 100], k: 100},
        edge: {c: [30, 20, 20, 60], k: 70},
        nLight: {c: [0, 70, 60, 0], k: 50}, nDark: {c: [5, 95, 90, 12], k: 66}, nSide: {c: [15, 100, 95, 40], k: 78}, nTop: {c: [0, 50, 40, 0], k: 40},
        sLight: {c: [70, 22, 0, 0], k: 20}, sDark: {c: [88, 52, 0, 8], k: 36}, sSide: {c: [95, 65, 10, 35], k: 52}, sTop: {c: [55, 8, 0, 0], k: 12},
        copperDark: {c: [30, 80, 100, 45], k: 75}, copper: {c: [12, 60, 95, 8], k: 48}, copperLight: {c: [0, 35, 60, 0], k: 20},
        metalDark: {c: [10, 5, 5, 55], k: 58}, metal: {c: [5, 2, 2, 22], k: 24}, metalLight: {c: [0, 0, 0, 4], k: 4},
        plateTop: {c: [4, 2, 2, 12], k: 12}, plateTopBack: {c: [8, 4, 4, 26], k: 26}, plateFront: {c: [10, 5, 5, 38], k: 38}, plateFrontDark: {c: [15, 8, 8, 55], k: 55},
        holeBack: {c: [10, 6, 6, 45], k: 45}, holeDeep: {c: [30, 25, 25, 90], k: 92},
        bodyLight: {c: [20, 5, 4, 6], k: 10}, body: {c: [32, 10, 8, 20], k: 26}, bodyDark: {c: [45, 20, 15, 42], k: 46},
        faceTop: {c: [0, 0, 0, 0], k: 0}, faceBottom: {c: [18, 3, 0, 0], k: 7}, scale: {c: [0, 0, 0, 90], k: 90},
        panelLight: {c: [22, 3, 0, 0], k: 10}, panel: {c: [40, 10, 3, 3], k: 22}, trayBack: {c: [8, 4, 4, 30], k: 32}, trayFront: {c: [4, 2, 2, 12], k: 14},
        redLight: {c: [0, 70, 55, 0], k: 35}, red: {c: [0, 95, 85, 5], k: 55}, redDark: {c: [15, 100, 95, 40], k: 72},
        blackLight: {c: [0, 0, 0, 50], k: 50}, blackPost: {c: [20, 15, 15, 85], k: 85},
        cableRed: {c: [0, 90, 80, 5], k: 50}, cableRedLight: {c: [0, 45, 35, 0], k: 25},
        cableBlack: {c: [20, 15, 15, 75], k: 75}, cableBlackLight: {c: [0, 0, 0, 40], k: 40}
    };

    var doc = app.activeDocument;
    var markFont = findTextFont([MARK_FONT_NAME, KOR_FONT_NAME]);
    var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var centerX = (artboardRect[0] + artboardRect[2]) / 2;
    var centerY = (artboardRect[1] + artboardRect[3]) / 2;

    var options = {
        mode: 0, pole: 0, hand: true,
        coilD: 22, coilH: 30, turns: 40, needle: 0,
        offsetX: 0, offsetY: 0, previewOn: true
    };
    applySettings();

    var previewGroup = null;
    var gradientCache = {};
    var rows = {};
    var radioSets = {};
    var checks = {};

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "전자기 유도 실험 장치");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var lookPanel = addPanel(dlg, "표현");
    addRadioRow(lookPanel, "색:", "mode", MODES);

    var coilPanel = addPanel(dlg, "코일");
    addRow(coilPanel, "coilD", "두께 (mm):");
    rows.coilD.input.helpTip = "코일 바깥 지름";
    addRow(coilPanel, "coilH", "높이 (mm):");
    addRow(coilPanel, "turns", "감은 횟수 (회):");

    var magnetPanel = addPanel(dlg, "자석 · 검류계");
    addRadioRow(magnetPanel, "자석:", "pole", POLES);
    addCheck(magnetPanel, "자석을 잡은 손 (선 그림)", "hand");
    addRow(magnetPanel, "needle", "바늘 각도 (°):");
    rows.needle.input.helpTip = "오른쪽으로 돌면 +";

    var positionPanel = addPanel(dlg, "위치");
    addRow(positionPanel, "offsetX", "가로 (mm):");
    addRow(positionPanel, "offsetY", "세로 (mm):");

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    for (var n = 0; n < NUMBER_KEYS.length; n++) {
        if (NUMBER_KEYS[n] === "offsetX") bindPositionRow(rows.offsetX, "offsetX", true);
        else if (NUMBER_KEYS[n] === "offsetY") bindPositionRow(rows.offsetY, "offsetY", false);
        else bindValueRow(rows[NUMBER_KEYS[n]], NUMBER_KEYS[n]);
    }
    previewCheck.value = options.previewOn;
    syncUi();

    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) clearPreview();
    app.redraw();

    function syncUi() {
        for (var key in radioSets) {
            for (var i = 0; i < radioSets[key].length; i++) radioSets[key][i].value = (options[key] === i);
        }
        for (var checkKey in checks) checks[checkKey].value = options[checkKey];
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (options.previewOn) buildPreview();
        app.redraw();
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

    // 코일 받침 아래 중심을 (0,0)으로 그린 뒤 전체를 대지 가운데로 옮긴다
    function buildPreview() {
        previewGroup = findEditableLayer().groupItems.add();
        previewGroup.name = "Induction";
        var g = previewGroup;

        var d = options.coilD * MM, h = options.coilH * MM;
        var coil = coilLayout(d, h, options.turns);
        var plate = d + 2 * PLATE_MARGIN_MM * MM;
        var t = PLATE_T_MM * MM;
        var hp = plate / 2 * TILT;

        drawPlate(g, 0, plate, t, false, coil.rc);
        drawCoil(g, d, h, coil);
        drawPlate(g, h + t, plate, t, true, coil.rc);

        // 코일 단자: 아래 받침판 오른쪽 앞 (뒤 하나, 앞 하나)
        var grip1 = drawScrewTerminal(g, d / 2 + 2.6 * MM, -hp * 0.3);
        var grip2 = drawScrewTerminal(g, d / 2 + 4.8 * MM, -hp * 0.75);
        var galvPosts = drawGalvanometer(g, plate / 2 + GALV.gap * MM, h + t - hp);

        // 도선: 코일 단자를 오른쪽에서 문 집게 → 검류계 단자에 아래에서 매달린 집게. 검정(−)이 뒤 단자, 빨강(+)이 앞 단자
        var toLeft = unit([-1, 0.15]), up = unit([0.15, 1]);
        var ends = [[grip1, galvPosts[0], "black", "cableBlack", "cableBlackLight"], [grip2, galvPosts[1], "red", "cableRed", "cableRedLight"]];
        for (var c = 0; c < ends.length; c++) {
            var coilEnd = clipTail(ends[c][0], toLeft), galvEnd = clipTail(ends[c][1], up);
            drawCable(g, coilEnd, [-toLeft[0], -toLeft[1]], galvEnd, [-up[0], -up[1]], ends[c][3], ends[c][4]);
        }
        for (var k = 0; k < ends.length; k++) {
            drawClip(g, ends[k][0], toLeft, ends[k][2]);
            drawClip(g, ends[k][1], up, ends[k][2]);
        }

        var magnetBottom = h + t + MAGNET.gap * MM;
        drawMagnet(g, magnetBottom);

        var b = g.geometricBounds; // [left, top, right, bottom]
        g.translate(centerX - (b[0] + b[2]) / 2 + options.offsetX * MM, centerY - (b[1] + b[3]) / 2 + options.offsetY * MM);
    }

    // 받침판: 윗면(사다리꼴, 위쪽 중심 높이 yTop)과 앞면. holed면 가운데에 원통 구멍(테두리 + 깊은 구멍)
    function drawPlate(g, yTop, plate, t, holed, rc) {
        var half = plate / 2, hp = half * TILT, back = half * PLATE_BACK;
        var top = poly(g, [[-half, yTop - hp], [half, yTop - hp], [back, yTop + hp], [-back, yTop + hp]], true);
        paintLinear(top, "plateTop", [[0, "plateTopBack"], [100, "plateTop"]], -90);
        edge(top);
        var front = poly(g, [[-half, yTop - hp], [half, yTop - hp], [half, yTop - hp - t], [-half, yTop - hp - t]], true);
        paintLinear(front, "plateFront", [[0, "plateFront"], [100, "plateFrontDark"]], -90);
        edge(front);
        if (!holed) return;
        var ring = ellipse(g, 0, yTop, rc * 1.12, rc * 1.12 * TILT);
        paintLinear(ring, "ring", [[0, "metal"], [45, "metalLight"], [100, "metal"]], -90);
        edge(ring);
        var hole = ellipse(g, 0, yTop, rc * 0.8, rc * 0.8 * TILT);
        paintLinear(hole, "hole", [[0, "holeBack"], [55, "holeDeep"], [100, "holeDeep"]], -90);
        edge(hole);
    }

    // 코일: 원통 → 앞쪽 반바퀴(구리 + 밝은 줄) → 음영 → 단자와 끌어낸 도선. 단자 두 개의 꼭대기 점을 돌려준다
    function drawCoil(g, d, h, coil) {
        var shadow = ellipse(g, 0, 0, d / 2 + 0.8 * MM, (d / 2 + 0.8 * MM) * TILT);
        shadow.filled = true;
        shadow.fillColor = solid("black");
        shadow.opacity = 30;

        var core = bez(g, cylinderFront(coil.rc, 0, h), true);
        paintLinear(core, "core", [[0, "metalDark"], [28, "metalLight"], [60, "metal"], [100, "metalDark"]], 0);

        // 촘촘히 감기면(도선 굵기가 간격에 맞춰 줄어듦) 도선 사이 틈이 어두운 구리색으로 보인다. 듬성하면 원통이 보인다
        if (coil.wire < WIRE_MM * MM) {
            var under = bez(g, cylinderFront(d / 2, 0, h), true);
            under.filled = true;
            under.fillColor = solid("copperDark");
        }
        var e = coil.rw * TILT;
        var turnsGroup = g.groupItems.add();
        var base = bez(turnsGroup, frontHalfTurn(coil.rw, e, coil.pitch, coil.wire / 2), false);
        strokeRound(base, "copper", coil.wire);
        var shine = bez(turnsGroup, frontHalfTurn(coil.rw, e, coil.pitch, coil.wire / 2 + coil.wire * 0.2), false);
        strokeRound(shine, "copperLight", coil.wire * 0.35);
        // 같은 모양이라 첫 바퀴만 그리고 간격만큼 올려 복제한다. 위 바퀴가 앞에 온다
        for (var i = 1; i < options.turns; i++) {
            base.duplicate(turnsGroup, ElementPlacement.PLACEATBEGINNING).translate(0, i * coil.pitch);
            shine.duplicate(turnsGroup, ElementPlacement.PLACEATBEGINNING).translate(0, i * coil.pitch);
        }

        // 원통 음영: 양 끝은 어둡게, 왼쪽에 밝은 띠 (투명도 그라데이션)
        var shade = bez(g, cylinderFront(d / 2, 0, h), true);
        paintLinear(shade, "coilShade", [[0, "black", 60], [16, "black", 20], [30, "white", 25], [42, "white", 0], [70, "black", 10], [100, "black", 65]], 0);

    }

    // 세운 원통 (x 가운데, 아래 y0 ~ 위 y1, 반지름 r): 몸통(가로 그라데이션) + 윗면 타원
    function cylinder(g, x, y0, y1, r, key, stops, topColor) {
        var points = cylinderFront(r, y0, y1);
        for (var i = 0; i < points.length; i++) {
            points[i] = {anchor: [points[i].anchor[0] + x, points[i].anchor[1]], left: [points[i].left[0] + x, points[i].left[1]],
                right: [points[i].right[0] + x, points[i].right[1]]};
        }
        var body = bez(g, points, true);
        paintLinear(body, key, stops, 0);
        edge(body);
        var cap = ellipse(g, x, y1, r, r * TILT);
        cap.filled = true;
        cap.fillColor = solid(topColor);
        edge(cap);
        return cap;
    }

    // 코일 단자(나사): 와셔 + 가는 축 + 머리(홈). 집게가 무는 점을 돌려준다
    function drawScrewTerminal(g, x, y) {
        var metalStops = [[0, "metalDark"], [35, "metalLight"], [100, "metalDark"]];
        var washer = ellipse(g, x, y, 1.4 * MM, 1.4 * MM * TILT);
        washer.filled = true;
        washer.fillColor = solid("metal");
        edge(washer);
        cylinder(g, x, y, y + 1.8 * MM, 0.5 * MM, "screw", metalStops, "metalLight");
        cylinder(g, x, y + 1.8 * MM, y + 2.4 * MM, 1.0 * MM, "screw", metalStops, "metalLight");
        var slot = poly(g, [[x - 0.7 * MM, y + 2.4 * MM], [x + 0.7 * MM, y + 2.4 * MM]], false);
        strokeLine(slot, "metalDark", 0.4);
        return [x + 0.35 * MM, y + 0.9 * MM];
    }

    // 검류계 단자: 쇠 너트 위에 색 손잡이(윗면 가운데 구멍). 집게가 무는 점을 돌려준다
    function drawBindingPost(g, x, y, colorName) {
        var dark = colorName === "red" ? "redDark" : "blackPost", light = colorName === "red" ? "redLight" : "blackLight";
        cylinder(g, x, y, y + 0.9 * MM, 1.9 * MM, "nut", [[0, "metalDark"], [35, "metalLight"], [100, "metalDark"]], "metal");
        cylinder(g, x, y + 0.9 * MM, y + 3.9 * MM, 1.45 * MM, "post_" + colorName, [[0, dark], [35, light], [100, dark]], light);
        var hole = ellipse(g, x, y + 3.9 * MM, 0.5 * MM, 0.5 * MM * TILT);
        hole.filled = true;
        hole.fillColor = solid("holeDeep");
        return [x, y + 1.7 * MM];
    }

    // 악어 집게: 끝(tip)이 dir 쪽을 향한다. 쇠 집게(위·아래 턱) 위에 고무 덮개. 도선이 붙는 꼬리 점은 clipTail
    function drawClip(g, tip, dir, colorName) {
        var n = [-dir[1], dir[0]];
        function at(list) {
            var out = [];
            for (var i = 0; i < list.length; i++) {
                var p = [tip[0] + (list[i][0] * dir[0] + list[i][1] * n[0]) * MM, tip[1] + (list[i][0] * dir[1] + list[i][1] * n[1]) * MM];
                if (list[i].length > 2) p.push(list[i][2]);
                out.push(p);
            }
            return out;
        }
        var across = Math.atan2(n[1], n[0]) * 180 / Math.PI;
        var jaws = [[[-3.3, 0.75], [-0.3, 0.38], [0, 0.12], [-3.3, 0.08]], [[-3.3, -0.08], [0, -0.12], [-0.3, -0.38], [-3.3, -0.75]]];
        for (var j = 0; j < 2; j++) {
            var jaw = poly(g, at(jaws[j]), true);
            paintLinear(jaw, "jaw", [[0, "metalDark"], [50, "metalLight"], [100, "metalDark"]], across);
            edge(jaw);
        }
        var dark = colorName === "red" ? "redDark" : "blackPost", light = colorName === "red" ? "redLight" : "blackLight";
        var boot = bez(g, smoothPoints(at([[-3, 0.95, "c"], [-5.5, 1.1], [-7.6, 0.95], [-8.3, 0], [-7.6, -0.95], [-5.5, -1.1], [-3, -0.95, "c"]]), true), true);
        paintLinear(boot, "boot_" + colorName, [[0, dark], [40, light], [100, dark]], across);
        edge(boot);
    }

    function clipTail(tip, dir) {
        return [tip[0] - dir[0] * (CLIP_MM - 0.2) * MM, tip[1] - dir[1] * (CLIP_MM - 0.2) * MM];
    }

    function unit(v) {
        var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        return [v[0] / length, v[1] / length];
    }

    // 검류계(교과서 그림처럼): 옆면(쐐기) → 윗면 → 기운 눈금판 → 오목한 받침과 단자 → 앞 턱.
    // 왼쪽 아래 앞 모서리 (x0, y0). 단자(검정 −, 빨강 +)에서 집게가 무는 점을 돌려준다
    function drawGalvanometer(g, x0, y0) {
        var w = GALV.w * MM, x1 = x0 + w, wall = GALV.wall * MM;
        function P(x, y, z) { return project(x, y0 + y * MM, z * MM); }
        var H = GALV.h, D = GALV.depth, lip = GALV.lipH, tray = GALV.trayY;

        var side = poly(g, [P(x1, 0, 0), P(x1, lip, GALV.lipZ), P(x1, lip, GALV.trayZ), P(x1, H, GALV.faceTopZ), P(x1, H, D), P(x1, 0, D)], true);
        paintLinear(side, "galvSide", [[0, "body"], [100, "bodyDark"]], -90);
        edge(side);
        var top = poly(g, [P(x0, H, GALV.faceTopZ), P(x1, H, GALV.faceTopZ), P(x1, H, D), P(x0, H, D)], true);
        paintLinear(top, "galvTop", [[0, "bodyLight"], [100, "body"]], -90);
        edge(top);

        // 눈금판: 기운 면 위의 좌표 (u 가로, v 기운 길이를 따라, pt)
        var bl = P(x0, lip, GALV.trayZ), br = P(x1, lip, GALV.trayZ), tl = P(x0, H, GALV.faceTopZ), tr = P(x1, H, GALV.faceTopZ);
        var panelLen = Math.sqrt(Math.pow(GALV.faceTopZ - GALV.trayZ, 2) + Math.pow(H - lip, 2)) * MM;
        var panel = poly(g, [bl, br, tr, tl], true);
        paintLinear(panel, "galvPanel", [[0, "panelLight"], [100, "panel"]], -90);
        edge(panel);
        var map = faceMapper(bl, [(br[0] - bl[0]) / w, (br[1] - bl[1]) / w], [(tl[0] - bl[0]) / panelLen, (tl[1] - bl[1]) / panelLen]);
        var frame = GALV.frame * MM, faceW = w - 2 * frame, faceH = panelLen - 2 * frame;
        var face = bez(g, mapPoints(roundedRect(frame, frame, faceW, faceH, 1.5 * MM), map), true);
        paintLinear(face, "galvFace", [[0, "faceTop"], [100, "faceBottom"]], -90);
        face.stroked = true;
        face.strokeColor = solid("bodyDark");
        face.strokeWidth = 0.4;

        var cx = frame + faceW / 2, cy = frame + faceH * 0.16, r = Math.min(faceW * 0.42, faceH * 0.74);
        var arcPath = bez(g, mapPoints(arcPoints(cx, cy, r, -SCALE_SPAN, SCALE_SPAN), map), false);
        strokeLine(arcPath, "scale", 0.3);
        var ticks = scaleTicks(cx, cy, r, 2.2 * MM, 1.3 * MM);
        for (var i = 0; i < ticks.length; i++) {
            var tick = poly(g, [map(ticks[i][0][0], ticks[i][0][1]), map(ticks[i][1][0], ticks[i][1][1])], false);
            strokeLine(tick, "scale", ticks[i][2] ? 0.4 : 0.25);
        }
        var label = makeMark(g, "G", 8, "scale");
        var labelAt = map(cx - r * 0.22, cy + r * 0.42);
        placeText(label, labelAt[0], labelAt[1]);
        var a = options.needle * Math.PI / 180;
        var needle = poly(g, [map(cx, cy), map(cx + r * 0.95 * Math.sin(a), cy + r * 0.95 * Math.cos(a))], false);
        strokeLine(needle, "black", NEEDLE_PT);
        var dome = bez(g, mapPoints(domePoints(cx, cy, 3 * MM), map), true);
        paintLinear(dome, "dome", [[0, "metalLight"], [100, "metal"]], -90);
        edge(dome);

        // 오목한 받침: 뒤 턱(눈금판 아래) → 바닥 → 왼쪽 안벽 → 오른쪽 벽 윗면
        var back = poly(g, [P(x0 + wall, tray, GALV.trayZ), P(x1 - wall, tray, GALV.trayZ), P(x1 - wall, lip, GALV.trayZ), P(x0 + wall, lip, GALV.trayZ)], true);
        back.filled = true;
        back.fillColor = solid("bodyDark");
        edge(back);
        var floor = poly(g, [P(x0 + wall, tray, GALV.rimZ), P(x1 - wall, tray, GALV.rimZ), P(x1 - wall, tray, GALV.trayZ), P(x0 + wall, tray, GALV.trayZ)], true);
        paintLinear(floor, "galvTray", [[0, "trayBack"], [100, "trayFront"]], -90);
        edge(floor);
        var inner = poly(g, [P(x0 + wall, tray, GALV.rimZ), P(x0 + wall, tray, GALV.trayZ), P(x0 + wall, lip, GALV.trayZ), P(x0 + wall, lip, GALV.rimZ)], true);
        inner.filled = true;
        inner.fillColor = solid("body");
        edge(inner);
        var leftRim = poly(g, [P(x0, lip, GALV.lipZ), P(x0 + wall, lip, GALV.rimZ), P(x0 + wall, lip, GALV.trayZ), P(x0, lip, GALV.trayZ)], true);
        leftRim.filled = true;
        leftRim.fillColor = solid("bodyLight");
        edge(leftRim);
        var rightRim = poly(g, [P(x1 - wall, lip, GALV.rimZ), P(x1, lip, GALV.lipZ), P(x1, lip, GALV.trayZ), P(x1 - wall, lip, GALV.trayZ)], true);
        rightRim.filled = true;
        rightRim.fillColor = solid("bodyLight");
        edge(rightRim);

        var postZ = (GALV.rimZ + GALV.trayZ) / 2;
        var blackBase = P(x0 + w * 0.28, tray, postZ), redBase = P(x0 + w * 0.72, tray, postZ);
        var blackGrip = drawBindingPost(g, blackBase[0], blackBase[1], "black");
        var redGrip = drawBindingPost(g, redBase[0], redBase[1], "red");

        // 앞 턱: 비스듬한 앞면과 좁은 윗면
        var lipFront = poly(g, [P(x0, 0, 0), P(x1, 0, 0), P(x1, lip, GALV.lipZ), P(x0, lip, GALV.lipZ)], true);
        paintLinear(lipFront, "galvLip", [[0, "bodyLight"], [100, "bodyDark"]], -90);
        edge(lipFront);
        var rim = poly(g, [P(x0, lip, GALV.lipZ), P(x1, lip, GALV.lipZ), P(x1 - wall, lip, GALV.rimZ), P(x0 + wall, lip, GALV.rimZ)], true);
        rim.filled = true;
        rim.fillColor = solid("bodyLight");
        edge(rim);
        return [blackGrip, redGrip];
    }

    // 도선(케이블): from에서 fromDir 쪽으로 나가 to에 toDir 쪽에서 들어오는 곡선 + 밝은 줄
    function drawCable(g, from, fromDir, to, toDir, colorName, lightName) {
        var pts = [
            {anchor: from, left: from, right: [from[0] + fromDir[0] * 12 * MM, from[1] + fromDir[1] * 12 * MM]},
            {anchor: to, left: [to[0] + toDir[0] * 16 * MM, to[1] + toDir[1] * 16 * MM], right: to}
        ];
        var cable = bez(g, pts, false);
        strokeRound(cable, colorName, CABLE_PT);
        var light = bez(g, pts, false);
        strokeRound(light, lightName, CABLE_PT * 0.3);
        light.translate(-CABLE_PT * 0.15, CABLE_PT * 0.2);
    }

    // 막대자석: 앞면(두 극), 오른쪽 옆면, 윗면, 글자 N·S. 손을 켜면 자석 뒤 손끝 → 자석 → 손등·엄지 순서로 그린다
    function drawMagnet(g, bottom) {
        var w = MAGNET.w * MM, len = MAGNET.len * MM, dz = MAGNET.depth * MM;
        var x0 = -w / 2 - DEPTH[0] * dz / 2, x1 = x0 + w, mid = bottom + len / 2, top = bottom + len;
        var cx = (x0 + x1) / 2, handTop = top - MAGNET.handGap * MM, unit = HAND_SCALE * w / 8;
        var lower = options.pole === 0 ? "n" : "s", upper = options.pole === 0 ? "s" : "n";
        if (options.hand) drawFingertips(g, x1 + DEPTH[0] * dz, handTop, unit);

        var halves = [[lower, bottom, mid], [upper, mid, top]];
        for (var i = 0; i < 2; i++) {
            var pole = halves[i][0], y0 = halves[i][1], y1 = halves[i][2];
            var side = poly(g, [project(x1, y0, 0), project(x1, y0, dz), project(x1, y1, dz), project(x1, y1, 0)], true);
            side.filled = true;
            side.fillColor = solid(pole + "Side");
            var front = poly(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true);
            paintLinear(front, "magnet_" + pole, [[0, pole + "Light"], [70, pole + "Dark"], [100, pole + "Dark"]], 0);
        }
        var cap = poly(g, [project(x0, top, 0), project(x1, top, 0), project(x1, top, dz), project(x0, top, dz)], true);
        cap.filled = true;
        cap.fillColor = solid(upper + "Top");

        // 글자는 각 반쪽 가운데 (손은 자석 왼쪽 모서리 언저리만 가린다)
        var letters = [[lower, (bottom + mid) / 2], [upper, (mid + top) / 2]];
        for (var k = 0; k < 2; k++) {
            var letter = makeMark(g, letters[k][0].toUpperCase(), 12, "white");
            placeText(letter, cx, letters[k][1]);
        }
        if (options.hand) drawHandFront(g, x0, handTop, unit);
    }

    // HAND 좌표(손 단위) → 그림 좌표. 꺾인 점 표시("c")는 그대로 둔다
    function handAt(list, x, y, unit) {
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var p = [x + list[i][0] * unit, y + list[i][1] * unit];
            if (list[i].length > 2) p.push(list[i][2]);
            out.push(p);
        }
        return out;
    }

    // 자석 뒤로 감긴 손가락의 손끝: 자석 오른쪽 면(edge) 밖으로 둥글게 나온다
    function drawFingertips(g, edge, y, unit) {
        var tips = g.groupItems.add();
        tips.name = "Fingertips";
        for (var i = 0; i < HAND.tips.length; i++) {
            var spec = HAND.tips[i];
            var tip = bez(tips, smoothPoints(fingertipPoints(edge, y + spec[0] * unit, y + spec[1] * unit, spec[2] * unit), true), true);
            tip.filled = true;
            tip.fillColor = solid("white");
            strokeRound(tip, "black", HAND_PT);
        }
    }

    // 손등·엄지(자석 앞): 흰 채움 위에 윤곽선. 엄지 뿌리와 손바닥에 붙은 곳에는 선이 없다
    function drawHandFront(g, x, y, unit) {
        var hand = g.groupItems.add();
        hand.name = "Hand";
        var body = bez(hand, smoothPoints(handAt(HAND.body, x, y, unit), true), true);
        body.filled = true;
        body.fillColor = solid("white");
        strokeRound(bez(hand, smoothPoints(handAt(HAND.topLine, x, y, unit), false), false), "black", HAND_PT);
        strokeRound(bez(hand, smoothPoints(handAt(HAND.bottomLine, x, y, unit), false), false), "black", HAND_PT);
        for (var f = 0; f < HAND.folds.length; f++) {
            strokeRound(bez(hand, smoothPoints(handAt(HAND.folds[f], x, y, unit), false), false), "black", HAND_PT);
        }
        var thumbPoints = handAt(HAND.thumb, x, y, unit);
        var thumb = bez(hand, smoothPoints(thumbPoints, true), true);
        thumb.filled = true;
        thumb.fillColor = solid("white");
        strokeRound(bez(hand, smoothPoints(thumbPoints.slice(0, HAND.thumbLine), false), false), "black", HAND_PT);
        strokeRound(bez(hand, smoothPoints(handAt(HAND.nail, x, y, unit), false), false), "black", HAND_PT * 0.7);
    }

    // -------------------------------------------------------
    // 모양 점 (pt)
    // -------------------------------------------------------
    function roundedRect(x, y, w, h, r) {
        var k = r * KAPPA;
        function p(ax, ay, lx, ly, rx, ry) { return {anchor: [ax, ay], left: [lx, ly], right: [rx, ry]}; }
        return [
            p(x + r, y, x + r - k, y, x + r, y), p(x + w - r, y, x + w - r, y, x + w - r + k, y),
            p(x + w, y + r, x + w, y + r - k, x + w, y + r), p(x + w, y + h - r, x + w, y + h - r, x + w, y + h - r + k),
            p(x + w - r, y + h, x + w - r + k, y + h, x + w - r, y + h), p(x + r, y + h, x + r, y + h, x + r - k, y + h),
            p(x, y + h - r, x, y + h - r + k, x, y + h - r), p(x, y + r, x, y + r, x, y + r - k)
        ];
    }

    // 중심 (cx, cy), 반지름 r, 위쪽 기준 a0°~a1° 호 (25°씩 베지어)
    function arcPoints(cx, cy, r, a0, a1) {
        var segments = Math.ceil((a1 - a0) / 25), step = (a1 - a0) / segments * Math.PI / 180;
        var k = 4 / 3 * Math.tan(step / 4) * r, points = [];
        for (var i = 0; i <= segments; i++) {
            var a = a0 * Math.PI / 180 + i * step, s = Math.sin(a), c = Math.cos(a);
            var anchor = [cx + r * s, cy + r * c], tangent = [c * k, -s * k];
            points.push({anchor: anchor, left: i === 0 ? anchor : [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: i === segments ? anchor : [anchor[0] + tangent[0], anchor[1] + tangent[1]]});
        }
        return points;
    }

    // 바늘 축의 반원 덮개
    function domePoints(cx, cy, r) {
        var k = r * KAPPA;
        return [
            {anchor: [cx - r, cy], left: [cx - r, cy], right: [cx - r, cy + k]},
            {anchor: [cx, cy + r], left: [cx - k, cy + r], right: [cx + k, cy + r]},
            {anchor: [cx + r, cy], left: [cx + r, cy + k], right: [cx + r, cy]}
        ];
    }

    function mapPoints(points, map) {
        var out = [];
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            out.push({anchor: map(p.anchor[0], p.anchor[1]), left: map(p.left[0], p.left[1]), right: map(p.right[0], p.right[1])});
        }
        return out;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function poly(container, pts, closed) {
        var path = container.pathItems.add();
        path.setEntirePath(pts);
        path.closed = closed;
        path.filled = false;
        path.stroked = false;
        return path;
    }

    function bez(container, points, closed) {
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
        path.filled = false;
        path.stroked = false;
        return path;
    }

    function ellipse(container, cx, cy, rx, ry) {
        var path = container.pathItems.ellipse(cy + ry, cx - rx, rx * 2, ry * 2);
        path.filled = false;
        path.stroked = false;
        return path;
    }

    function edge(path) {
        path.stroked = true;
        path.strokeColor = solid("edge");
        path.strokeWidth = EDGE_PT;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    }

    function strokeLine(path, colorName, width) {
        path.stroked = true;
        path.strokeColor = solid(colorName);
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
    }

    function strokeRound(path, colorName, width) {
        path.stroked = true;
        path.strokeColor = solid(colorName);
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.ROUNDENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    }

    function solid(name) {
        var entry = COLORS[name];
        if (options.mode === 1) return makeGray(entry.k);
        var color = new CMYKColor();
        color.cyan = entry.c[0];
        color.magenta = entry.c[1];
        color.yellow = entry.c[2];
        color.black = entry.c[3];
        return color;
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

    // 선형 그라데이션 채우기. stops: [[위치 %, 색 이름, 불투명도 %(생략하면 100)], ...], angle: 0 왼쪽→오른쪽, -90 위→아래.
    // 새 채우기에는 마지막 그라데이션 각도가 붙으므로 읽어서 차이만큼 채우기만 돌린다
    function paintLinear(path, key, stops, angle) {
        var gradientColor = new GradientColor();
        gradientColor.gradient = gradientFor(key, stops);
        path.filled = true;
        path.fillColor = gradientColor;
        path.rotate(angle - path.fillColor.angle, false, false, true, false, Transformation.CENTER);
    }

    // 같은 이름 그라데이션이 문서에 있으면 다시 쓴다 (실행마다 견본이 늘지 않게). 이름은 31자까지
    function gradientFor(key, stops) {
        var name = "IND_" + key + (options.mode === 1 ? "_g" : "_c");
        if (gradientCache[name]) return gradientCache[name];
        var gradient = null;
        try { gradient = doc.gradients.getByName(name); } catch (e) { gradient = null; }
        if (gradient === null) {
            // 이름을 붙이면 견본 목록이 다시 정렬돼 add()가 준 변수가 다른 견본을 가리킬 수 있다(그 견본의 정지점을 덮어씀).
            // 이름을 붙인 뒤 이름으로 다시 찾아 정지점을 쓴다. 이름 없는 새 견본은 정지점을 쓰면 MRAP 오류가 난다
            gradient = doc.gradients.add();
            gradient.name = name;
            gradient = doc.gradients.getByName(name);
            gradient.type = GradientType.LINEAR;
            while (gradient.gradientStops.length < stops.length) gradient.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                var stop = gradient.gradientStops[i];
                stop.rampPoint = stops[i][0];
                stop.color = solid(stops[i][1]);
                stop.opacity = stops[i].length > 2 ? stops[i][2] : 100;
            }
        }
        gradientCache[name] = gradient;
        return gradient;
    }

    // 물체에 새긴 글자(N, S, G): 굵은 고딕. 설명 글자가 아니라 GSMediumB1 규칙을 따르지 않는다
    function makeMark(container, text, size, colorName) {
        var frame = container.textFrames.add();
        frame.contents = text;
        var attributes = frame.textRange.characterAttributes;
        attributes.size = size;
        attributes.fillColor = solid(colorName);
        attributes.textFont = markFont;
        return frame;
    }

    // 글자 테두리 가운데를 (x, y)에
    function placeText(frame, x, y) {
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
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

    function addRadioRow(parent, label, key, names) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        radioSets[key] = [];
        for (var i = 0; i < names.length; i++) {
            var radio = row.add("radiobutton", undefined, names[i]);
            bindRadio(radio, key, i);
            radioSets[key].push(radio);
        }
    }

    function bindRadio(radio, key, index) {
        radio.onClick = function() {
            options[key] = index;
            syncUi();
            updatePreview();
        };
    }

    function addCheck(parent, text, key) {
        var check = parent.add("checkbox", undefined, text);
        check.onClick = function() {
            options[key] = check.value;
            updatePreview();
        };
        checks[key] = check;
    }

    // 라벨 (단위): | 입력창 | 스크롤바
    function addRow(parent, key, label) {
        var spec = SPECS[key];
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(options[key], spec.decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, options[key], spec.range[0], spec.range[1]);
        slider.stepdelta = spec.step;
        slider.jumpdelta = spec.step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        rows[key] = {input: input, slider: slider, min: spec.range[0], max: spec.range[1], step: spec.step, decimals: spec.decimals};
        return rows[key];
    }

    function showRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = clamp(value, controls.min, controls.max); } catch (e) {}
    }

    function bindValueRow(controls, key) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            showRowValue(controls, value);
            if (value === options[key]) return;
            options[key] = value;
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, key, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - options[key]) * MM;
            options[key] = value;
            showRowValue(controls, value);
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
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
        return Math.round(Math.round(value / step) * step * 1e6) / 1e6;
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
    // 설정 저장 · 복원 ("v1" + 라디오 2 + 체크 1 + 숫자 + 미리보기 순서. 확인할 때만 저장)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1"];
        for (var r = 0; r < RADIO_KEYS.length; r++) parts.push(options[RADIO_KEYS[r]]);
        for (var c = 0; c < CHECK_KEYS.length; c++) parts.push(options[CHECK_KEYS[c]] ? "1" : "0");
        for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        parts.push(options.previewOn ? "1" : "0");
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 1 + RADIO_KEYS.length + CHECK_KEYS.length + NUMBER_KEYS.length + 1) return;
        var radioLimits = [MODES.length, POLES.length];
        for (var r = 0; r < RADIO_KEYS.length; r++) {
            var index = parseInt(p[1 + r], 10);
            if (index >= 0 && index < radioLimits[r]) options[RADIO_KEYS[r]] = index;
        }
        for (var c = 0; c < CHECK_KEYS.length; c++) options[CHECK_KEYS[c]] = (p[1 + RADIO_KEYS.length + c] === "1");
        var base = 1 + RADIO_KEYS.length + CHECK_KEYS.length;
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[base + i]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
        options.previewOn = (p[base + NUMBER_KEYS.length] === "1");
    }
})();
