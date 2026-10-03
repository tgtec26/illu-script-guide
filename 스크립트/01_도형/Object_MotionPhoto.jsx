// Object_MotionPhoto.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 파선 양 끝 정렬 (01_도형/Object_setdash_align_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/Object_setdash_align_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 연속 촬영(스트로보) 운동 사진: 같은 간격으로 찍은 사진을 한 장에 겹쳐 놓은 모습을 그린다.
//   - 방향은 가로(왼쪽 → 오른쪽) 또는 세로(위 → 아래). 운동은 등속(속도) 또는 가속·감속(처음 속도 + 가속도).
//     i번째 사진의 위치는 등속이면 v·t, 가속이면 v0·t + ½·a·t² (t = i × 촬영 간격). 속도·가속도는 그림 위의 길이(mm) 기준이다.
//     가속도가 음수(감속)이면 속도가 0이 되는 순간까지만 찍는다. 처음 속도 0 + 양의 가속도가 정지에서 출발하는 가속이다.
//   - 물체: 테두리 없는 구형 그라데이션(왼쪽 위 하이라이트), 테두리가 있는 단색, 또는 시간기록 테이프(흰 종이띠 + 점).
//     색은 K 값(10 단위)이고 모두 회색 음영.
//     '지난 위치는 흐리게'를 켜면 마지막 사진만 그대로 두고 앞선 사진은 흐리게 그린다. 구는 반투명, 단색은 투명도 없이 흰 속 + 파선 테두리.
//   - 배경(검은 띠)은 켜고 끌 수 있고 K 값을 10 단위로 고른다. 뒤쪽 사진이 앞쪽 사진 위에 놓인다. 테이프는 종이띠가 배경을 대신한다.
//   - 거리 표시: 이웃한 사진 중심 사이에 양쪽 화살표를 긋고 값을 쓴다. 입력한 값이 숫자로 시작하면(예: "10 cm")
//     가장 짧은 구간 대비 구간 거리의 비를 곱해 쓰고(정지에서 출발한 가속은 1:3:5…), "d"처럼 글자면 d, 3d, 5d…로 쓴다.
//   - 출발 지점은 첫 사진 중심을 지나는 파선, 거리 표시의 연장선(사진 중심에서 내리는 보조선)도 파선(2-1). 지표면은 세로일 때만
//     (맨 아래 사진 밑에 위쪽 선 + 아래로 옅어지는 그라데이션, 오른쪽 위에 '지표면' 글자).
//     세로일 때 '원의 아래 기준'을 켜면 보조선·거리 표시·눈금자가 원의 중심 대신 원의 아래를 지나고, 파선 보조선은 원의 6시 지점까지 이어진다. '지표면에 닿기'를 켜면
//     마지막 사진이 지표면에 닿고(띠도 거기서 끝), 아래 기준이면 마지막 보조선은 지표면 선이 대신해 그리지 않는다.
//   - 거리 표시의 맞은편에 시간 표시(0초, 0.1초… 촬영 간격 기준), 눈금자(첫 사진이 0, 5칸마다 긴 눈금 + 칸 수 0·5·10…), 운동 방향 화살표를
//     띠에서 가까운 순서로 쌓는다.
//   - '배경 위 보조선은 흰색'을 켜면 파선 보조선(출발선, 거리 표시 연장선) 중 배경(띠) 위를 지나는 조각만 흰색, 띠 밖은 검정이다.
//   - 파선(출발선, 보조선, 지난 위치 단색 테두리)은 '파선을 모서리와 패스 끝에 정렬하고 길이를 조정해 맞추기'를 적용해 양 끝이 같다.
//   - 확인하면 파선·배경·지표면·표시선·글자·사진이 든 그룹 하나가 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectMotionPhoto/settings";
    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ITALIC_FONT_NAME = "GSMediItaC1";
    var ENG_BASELINE_PT = 0.5;
    var FONT_PT = 8;
    var LINE_PT = 0.4;
    var AUX_PT = 0.3;
    var GROUND_PT = 0.5;
    var BALL_STROKE_PT = 0.4;
    var LINE_K = 100;
    // 구 그라데이션: 하이라이트·가장자리가 기본 색 K보다 이만큼 밝고 어둡다
    var BALL_LIGHT_K = 30;
    var BALL_DARK_K = 30;
    // 지표면 그라데이션 위쪽 K (아래는 흰색)
    var GROUND_TOP_K = 25;
    // 파선 2-1 (선 2pt, 틈 1pt): 출발 지점선, 거리 표시 연장선, 지난 위치의 단색 테두리
    var DASHES = [2, 1];
    // 지난 위치 물체의 불투명도(%)
    var GHOST_OPACITY = 50;
    var GROUND_TEXT = "지표면";
    var GROUND_TEXT_GAP_MM = 1.5;
    // 거리 표시 화살촉(pt): 평가원식 (07_수학, MotionGraph와 같은 치수)
    var ARROW = {length: 4, halfWidth: 1.3, notch: 1};
    // 띠 가장자리 여백, 점선이 띠 밖으로 나오는 길이, 띠에서 표시선까지, 연장선이 표시선을 넘는 길이, 표시선과 글자 사이, 글자끼리
    var PAD_MM = 2;
    var EXT_MM = 6;
    var DIM_GAP_MM = 2;
    var DIM_OVERSHOOT_MM = 1;
    var TEXT_GAP_MM = 0.8;
    var LABEL_SPACE_MM = 0.5;   // 글자끼리 최소 간격
    var SURFACE_SIDE_MM = 12;
    var SURFACE_HEIGHT_MM = 8;
    // 첫 사진에서 마지막 사진까지의 최대 길이(mm). 넘으면 속도·가속도를 줄인다
    var SPAN_MAX_MM = 1000;
    // 시간기록 테이프: 종이띠 폭의 절반, 양 끝 여백의 최소값(처음 간격이 더 크면 그만큼), 점 반지름
    var TAPE_HALF_MM = 3;
    var TAPE_MARGIN_MM = 3;
    var TAPE_DOT_R_MM = 0.4;
    // 눈금자: 앞선 표시에서 눈금선까지, 눈금 길이(5칸마다 긴 것), 눈금 수 상한(넘으면 간격을 넓힌다)
    var RULER_GAP_MM = 1.5;
    var RULER_LONG_MM = 2;
    var RULER_SHORT_MM = 1;
    var RULER_MAX_TICKS = 60;
    // 운동 방향 화살표: 앞선 표시에서 떨어진 거리, 최소 길이, 마지막 사진까지 거리에 대한 비율, 글자와의 간격
    var MOTION_GAP_MM = 2;
    var MOTION_MIN_MM = 8;
    var MOTION_RATIO = 0.6;
    var MOTION_TEXT = "운동 방향";
    var MOTION_TEXT_GAP_MM = 1.5;

    var DIRECTIONS = ["가로", "세로 (아래로 운동)"];
    var MOTIONS = ["등속 운동", "가속·감속 운동"];
    var BALLS = ["구 (그라데이션)", "테두리 + 단색", "시간기록 테이프"];

    var LABEL_WIDTH = 120;
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var POSITION_LIMIT_MM = 100;

    // 저장 순서: 라디오, 체크박스, 숫자(NUMBER_KEYS)
    var RADIO_KEYS = ["direction", "motion", "ball"];
    var CHECK_KEYS = ["bgOn", "startOn", "surfaceOn", "distOn", "ghostOn", "rulerOn", "timeOn", "arrowOn", "bottomOn", "touchOn", "guideWhite"];

    // 숫자 옵션: 키, 범위, 한 단계, 소수 자리. 저장 순서도 이 순서다
    var NUMBER_KEYS = ["speed", "startSpeed", "accel", "interval", "count", "size", "ballK", "bgK", "tick", "offsetX", "offsetY"];
    var SPECS = {
        speed: {range: [5, 1000], step: 5, decimals: 0},
        startSpeed: {range: [0, 1000], step: 5, decimals: 0},
        accel: {range: [-5000, 5000], step: 10, decimals: 0},
        interval: {range: [0.01, 2], step: 0.01, decimals: 2},
        count: {range: [2, 30], step: 1, decimals: 0},
        size: {range: [2, 30], step: 0.5, decimals: 1},
        ballK: {range: [0, 100], step: 10, decimals: 0},
        bgK: {range: [0, 100], step: 10, decimals: 0},
        tick: {range: [1, 20], step: 0.5, decimals: 1},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1}
    };

    var doc = app.activeDocument;
    var korFont = findTextFont([KOR_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME]);
    var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

    var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var centerX = (artboardRect[0] + artboardRect[2]) / 2;
    var centerY = (artboardRect[1] + artboardRect[3]) / 2;

    var options = {
        direction: 0, motion: 0, ball: 0,
        bgOn: true, startOn: true, surfaceOn: false, distOn: true, ghostOn: false, rulerOn: false, timeOn: false, arrowOn: false, bottomOn: false, touchOn: false, guideWhite: false,
        speed: 100, startSpeed: 0, accel: 500, interval: 0.1, count: 7, size: 8, ballK: 30, bgK: 90, tick: 5,
        distText: "d",
        offsetX: 0, offsetY: 0,
        previewOn: true
    };
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var d = 0; d < NUMBER_KEYS.length; d++) DEFAULTS[NUMBER_KEYS[d]] = options[NUMBER_KEYS[d]];
    applySettings();

    var previewGroup = null;
    var rows = {};
    var radioSets = {};
    var checks = {};
    var distInput = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "연속 촬영 운동 사진");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var motionPanel = addPanel(dlg, "운동");
    addRadioRow(motionPanel, "방향:", "direction", DIRECTIONS);
    addRadioRow(motionPanel, "운동:", "motion", MOTIONS);
    addRow(motionPanel, "speed", "속도", "mm/s");
    addRow(motionPanel, "startSpeed", "처음 속도", "mm/s");
    addRow(motionPanel, "accel", "가속도", "mm/s²");
    rows.accel.input.helpTip = "음수이면 감속: 속도가 0이 되는 순간까지만 찍는다";
    addRow(motionPanel, "interval", "촬영 간격", "s");
    addRow(motionPanel, "count", "촬영 횟수", "회");

    var ballPanel = addPanel(dlg, "물체");
    addRadioRow(ballPanel, "모양:", "ball", BALLS);
    addRow(ballPanel, "size", "지름", "mm");
    addRow(ballPanel, "ballK", "색", "K");
    addCheck(ballPanel, "지난 위치는 흐리게 (구: 반투명, 단색: 흰 속 + 파선)", "ghostOn");

    var showPanel = addPanel(dlg, "배경·표시");
    var bgRow = showPanel.add("group");
    bgRow.alignChildren = ["left", "center"];
    addCheck(bgRow, "배경", "bgOn");
    addCheck(bgRow, "배경 위 보조선은 흰색", "guideWhite");
    checks.guideWhite.helpTip = "배경(띠) 위를 지나는 파선 보조선만 흰색으로 그린다. 띠 밖은 검정 그대로";
    addRow(showPanel, "bgK", "배경 색", "K");
    var markRow = showPanel.add("group");
    markRow.alignChildren = ["left", "center"];
    addCheck(markRow, "출발 지점 표시", "startOn");
    addCheck(markRow, "지표면 표시 (세로)", "surfaceOn");
    addCheck(markRow, "지표면에 닿기", "touchOn");
    checks.touchOn.helpTip = "마지막 사진이 지표면에 닿는다. 켜면 원의 아래 기준도 같이 켜지고(다시 끌 수 있다), 아래 기준이면 마지막 보조선은 지표면이 대신한다";
    var guideRow = showPanel.add("group");
    guideRow.alignChildren = ["left", "center"];
    addCheck(guideRow, "눈금자", "rulerOn");
    addCheck(guideRow, "시간 표시", "timeOn");
    addCheck(guideRow, "운동 방향", "arrowOn");
    checks.timeOn.helpTip = "사진마다 0초, 촬영 간격, 2×간격… 을 거리 표시의 맞은편에 쓴다";
    addRow(showPanel, "tick", "눈금 간격", "mm");
    var distRow = showPanel.add("group");
    distRow.alignChildren = ["left", "center"];
    addCheck(distRow, "중심 거리 표시:", "distOn");
    distInput = distRow.add("edittext", undefined, options.distText);
    distInput.characters = 12;
    distInput.helpTip = "숫자로 시작하면(예: 10 cm) 가속에서 구간마다 1, 3, 5배…로, 글자면(예: d) d, 3d, 5d…로 쓴다";
    distInput.onChange = function() { commitDistText(); };
    addCheck(distRow, "원의 아래 기준 (세로)", "bottomOn");
    checks.bottomOn.helpTip = "보조선·거리 표시·눈금자의 기준을 원의 중심이 아니라 원의 아래(운동 방향 끝)로 한다";

    var positionPanel = addPanel(dlg, "위치");
    addRow(positionPanel, "offsetX", "가로", "mm");
    addRow(positionPanel, "offsetY", "세로", "mm");

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    for (var n = 0; n < NUMBER_KEYS.length; n++) {
        if (NUMBER_KEYS[n] === "offsetX") {
            bindPositionRow(rows.offsetX, "offsetX", true);
        } else if (NUMBER_KEYS[n] === "offsetY") {
            bindPositionRow(rows.offsetY, "offsetY", false);
        } else {
            bindValueRow(rows[NUMBER_KEYS[n]], NUMBER_KEYS[n]);
        }
    }
    previewCheck.value = options.previewOn;
    syncUi();

    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        // 입력창에 쓰던 값이 아직 반영되지 않았을 수 있다
        var typed = cleanDistText(distInput.text);
        if (typed !== options.distText) {
            options.distText = typed;
            clearPreview();
        }
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

    // 라디오·체크박스 상태와 지금 쓰지 않는 입력의 꺼짐을 옵션에 맞춘다
    function syncUi() {
        for (var key in radioSets) {
            for (var i = 0; i < radioSets[key].length; i++) radioSets[key][i].value = (options[key] === i);
        }
        for (var checkKey in checks) checks[checkKey].value = options[checkKey];
        // 테이프는 종이띠와 점이라 지름·색·배경·반투명을 쓰지 않는다
        var tape = options.ball === 2;
        setRowEnabled(rows.speed, options.motion === 0);
        setRowEnabled(rows.startSpeed, options.motion === 1);
        setRowEnabled(rows.accel, options.motion === 1);
        setRowEnabled(rows.size, !tape);
        setRowEnabled(rows.ballK, !tape);
        setRowEnabled(rows.bgK, options.bgOn && !tape);
        setRowEnabled(rows.tick, options.rulerOn);
        checks.bgOn.enabled = !tape;
        checks.guideWhite.enabled = options.bgOn && !tape;
        checks.ghostOn.enabled = !tape;
        checks.surfaceOn.enabled = options.direction === 1;
        checks.touchOn.enabled = options.direction === 1 && options.surfaceOn;
        checks.bottomOn.enabled = options.direction === 1;
        distInput.enabled = options.distOn;
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
        controls.reset.enabled = enabled;
    }

    function commitDistText() {
        var typed = cleanDistText(distInput.text);
        if (typed === options.distText) return;
        options.distText = typed;
        updatePreview();
    }

    // 저장 문자열의 구분자 | 는 뺀다
    function cleanDistText(text) {
        return String(text).split("|").join("");
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

    function buildPreview() {
        // 너무 길어지는 값은 줄여서 입력창에도 되돌려 준다
        var o = clampOptions(options);
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var numberKey = NUMBER_KEYS[i];
            if (o[numberKey] !== options[numberKey]) {
                options[numberKey] = o[numberKey];
                showRowValue(rows[numberKey], o[numberKey]);
            }
        }

        var vertical = o.direction === 1;
        var tape = o.ball === 2;
        var pos = framePositions(o);
        var count = pos.length;
        var pad = PAD_MM * MM;
        var radius = tape ? TAPE_DOT_R_MM * MM : o.size * MM / 2;
        var half = tape ? TAPE_HALF_MM * MM : radius + pad;                     // 띠의 폭의 절반
        // 띠의 양 끝 여백: 사진은 물체 반지름 + 여백, 테이프는 처음 간격(최소 TAPE_MARGIN_MM)
        var endGap = tape ? Math.max(TAPE_MARGIN_MM, count > 1 ? pos[1] - pos[0] : 0) * MM : radius + pad;
        var sMin = -endGap;
        // 지표면에 닿으면 띠는 마지막 물체의 아래에서 끝난다 (지표면 선이 띠의 끝)
        var touch = vertical && o.surfaceOn && o.touchOn;
        var sMax = pos[count - 1] * MM + (touch ? radius : endGap);
        // 보조선·거리 표시·눈금자의 기준: 원의 중심, 또는 원의 아래(세로의 운동 방향 끝)
        var shift = vertical && o.bottomOn ? radius : 0;
        var sMid = (sMin + sMax) / 2;
        // s: 운동 방향 거리(첫 사진 중심이 0), c: 운동에 수직인 방향(가로: 위, 세로: 오른쪽) → 쪽 좌표
        function at(s, c) {
            return vertical ? [centerX + c, centerY - (s - sMid)] : [centerX + (s - sMid), centerY + c];
        }
        // 글자를 s의 가운데에 두고 c 쪽(c의 부호 방향)으로 놓는다. 앞 글자와 겹치면 한 줄씩 바깥으로 민다. 쓴 두께를 돌려준다
        function placeInRows(frame, s, c, rowEnds) {
            var box = frame.geometricBounds;   // [left, top, right, bottom]
            var width = box[2] - box[0];
            var height = box[1] - box[3];
            var along = vertical ? height : width;
            var thick = vertical ? width : height;
            var row = 0;
            while (rowEnds[row] !== undefined && rowEnds[row] > s - along / 2 - LABEL_SPACE_MM * MM) row++;
            rowEnds[row] = s + along / 2;
            var side = c > 0 ? 1 : -1;
            var spot = at(s, c + side * row * (thick + LABEL_SPACE_MM * MM));
            if (vertical) placeText(frame, spot[0], spot[1], side > 0 ? "l" : "r", "m");
            else placeText(frame, spot[0], spot[1], "c", side > 0 ? "b" : "t");
            return row * (thick + LABEL_SPACE_MM * MM) + thick;
        }
        var forward = vertical ? [0, -1] : [1, 0];
        var black = makeGray(LINE_K);
        var white = makeGray(0);
        // 배경(띠) 위에서만 흰색인 보조선: 띠 위 조각은 흰색으로 따로 그려 띠 위에 얹는다
        var whiteGuide = o.guideWhite && o.bgOn && !tape;
        var dashed = [];   // 양 끝 정렬을 적용할 파선들
        // 운동 방향 거리 s에서 c가 cFrom → cTo로 가는 파선 보조선
        function guide(s, cFrom, cTo, width, color, name) {
            var line = drawLine(group, at(s, cFrom), at(s, cTo), width, color);
            line.name = name;
            try { line.strokeDashes = DASHES; } catch (guideDashError) {}
            dashed.push(line);
            return line;
        }

        previewGroup = findEditableLayer().groupItems.add();
        previewGroup.name = "MotionPhoto";
        var group = previewGroup;

        // 거리 표시가 놓이는 쪽(가로: 아래, 세로: 오른쪽)
        var labelSign = vertical ? 1 : -1;
        var showDist = o.distOn && trimText(o.distText) !== "";
        var startInner = false;   // 띠 위의 출발선 조각은 띠를 그린 뒤에 얹는다
        if (o.startOn) {
            // 거리 표시가 있으면 그쪽은 표시선 연장선 끝까지만 (글자를 가로지르지 않게)
            // 시간 글자가 있는 쪽은 띠 가장자리에서 끝낸다 (글자를 가로지르지 않게)
            var otherReach = half + (o.timeOn ? 0 : EXT_MM * MM);
            var labelReach = showDist ? half + (DIM_GAP_MM + DIM_OVERSHOOT_MM) * MM : otherReach;
            if (whiteGuide) {
                if (labelReach > half) guide(shift, labelSign * labelReach, labelSign * half, LINE_PT, black, "StartLine");
                if (otherReach > half) guide(shift, -labelSign * half, -labelSign * otherReach, LINE_PT, black, "StartLine");
                startInner = true;
            } else {
                guide(shift, labelSign * labelReach, -labelSign * otherReach, LINE_PT, black, "StartLine");
            }
        }

        if (tape || o.bgOn) {
            var back = drawRect(group, at(sMin, half), at(sMax, -half));
            back.name = tape ? "Tape" : "Background";
            back.filled = true;
            back.fillColor = makeGray(tape ? 0 : o.bgK);
            back.stroked = tape;
            if (tape) {
                back.strokeColor = black;
                back.strokeWidth = AUX_PT;
            }
        }

        if (startInner) guide(shift, labelSign * half, -labelSign * half, LINE_PT, white, "StartLine");

        if (vertical && o.surfaceOn) {
            var wide = half + SURFACE_SIDE_MM * MM;
            var ground = drawRect(group, at(sMax, -wide), at(sMax + SURFACE_HEIGHT_MM * MM, wide));
            ground.name = "Ground";
            ground.stroked = false;
            ground.filled = true;
            var groundColor = new GradientColor();
            groundColor.gradient = grayGradient("MP_ground", GradientType.LINEAR, [[0, GROUND_TOP_K], [100, 0]]);
            ground.fillColor = groundColor;
            // 새 채우기에는 마지막 그라데이션 각도가 붙으므로 읽어서 차이만큼만 돌린다 (-90: 첫 색이 위)
            ground.rotate(-90 - ground.fillColor.angle, false, false, true, false, Transformation.CENTER);
            var groundLine = drawLine(group, at(sMax, -wide), at(sMax, wide), GROUND_PT, black);
            groundLine.name = "GroundLine";
            var groundTag = makeLabel(group, {text: GROUND_TEXT, italicFrom: GROUND_TEXT.length});
            groundTag.name = "GroundLabel";
            var corner = at(sMax, wide);
            placeText(groundTag, corner[0] - GROUND_TEXT_GAP_MM * MM, corner[1] - TEXT_GAP_MM * MM, "r", "t");
        }

        if (showDist) {
            var dimC = labelSign * (half + DIM_GAP_MM * MM);   // 표시선 자리
            // 원의 아래 기준이면 보조선이 띠를 지나 원의 6시 지점(운동 축)까지 이어진다
            var extFrom = shift > 0 ? 0 : labelSign * half;
            var extTo = dimC + labelSign * DIM_OVERSHOOT_MM * MM;
            for (var e = 0; e < count; e++) {
                // 출발 지점 파선이 이미 이 자리를 지난다
                if (e === 0 && o.startOn) continue;
                // 지표면 선이 마지막 보조선 자리를 지난다
                if (touch && shift > 0 && e === count - 1) continue;
                var extS = pos[e] * MM + shift;
                if (whiteGuide && shift > 0) {
                    // 띠 안(운동 축에서 띠 가장자리까지)은 흰색, 띠 밖은 검정
                    guide(extS, labelSign * half, extTo, AUX_PT, black, "Extension");
                    guide(extS, extFrom, labelSign * half, AUX_PT, white, "Extension");
                } else {
                    guide(extS, extFrom, extTo, AUX_PT, black, "Extension");
                }
            }
            var rowEnds = [];   // 글자 줄마다 마지막 글자가 끝나는 s 위치
            for (var k = 0; k < count - 1; k++) {
                var s0 = pos[k] * MM + shift;
                var s1 = pos[k + 1] * MM + shift;
                var scale = Math.min(1, (s1 - s0) / (2 * ARROW.length));
                var inset = (ARROW.length - ARROW.notch) * scale;
                var from = at(s0, dimC);
                var to = at(s1, dimC);
                var dimension = drawLine(group,
                    [from[0] + forward[0] * inset, from[1] + forward[1] * inset],
                    [to[0] - forward[0] * inset, to[1] - forward[1] * inset], LINE_PT, black);
                dimension.name = "Dimension";
                drawHead(group, from, [-forward[0], -forward[1]], scale, black);
                drawHead(group, to, forward, scale, black);

                var frame = makeLabel(group, distanceLabel(o.distText, gapRatio(pos, k)));
                frame.name = "Distance";
                // 앞 글자와 겹치면 한 줄 더 바깥으로 민다 (가속 운동 처음의 좁은 구간)
                placeInRows(frame, (s0 + s1) / 2, dimC + labelSign * TEXT_GAP_MM * MM, rowEnds);
            }
        }

        // 거리 표시의 맞은편: 띠에서 가까운 순서로 시간 글자 → 눈금자 → 운동 방향 화살표. stack은 띠 가운데에서 지금까지 쓴 거리
        var sideB = -labelSign;
        var stack = half;
        if (o.timeOn) {
            var timeEnds = [];
            var used = 0;
            for (var m = 0; m < count; m++) {
                var seconds = formatSeconds(m * o.interval) + "초";
                var tag = makeLabel(group, {text: seconds, italicFrom: seconds.length});
                tag.name = "Time";
                used = Math.max(used, placeInRows(tag, pos[m] * MM, sideB * (stack + TEXT_GAP_MM * MM), timeEnds));
            }
            stack += TEXT_GAP_MM * MM + used;
        }
        if (o.rulerOn) {
            var ruler = rulerMarks(pos[count - 1], o.tick);
            var rulerC = sideB * (stack + RULER_GAP_MM * MM);
            var numberC = rulerC + sideB * (RULER_LONG_MM + TEXT_GAP_MM) * MM;
            var numberThick = 0;
            drawLine(group, at(ruler.from * MM + shift, rulerC), at(ruler.to * MM + shift, rulerC), AUX_PT, black).name = "Ruler";
            for (var q = 0; q < ruler.marks.length; q++) {
                var mark = ruler.marks[q];
                var tickEnd = rulerC + sideB * (mark.major ? RULER_LONG_MM : RULER_SHORT_MM) * MM;
                drawLine(group, at(mark.s * MM + shift, rulerC), at(mark.s * MM + shift, tickEnd), AUX_PT, black).name = "RulerTick";
                if (!mark.major) continue;
                // 5칸마다 긴 눈금 끝에 칸 수(0, 5, 10…)
                var numberText = String(mark.k);
                var numberTag = makeLabel(group, {text: numberText, italicFrom: numberText.length});
                numberTag.name = "RulerNumber";
                var numberAt = at(mark.s * MM + shift, numberC);
                if (vertical) placeText(numberTag, numberAt[0], numberAt[1], "r", "m");
                else placeText(numberTag, numberAt[0], numberAt[1], "c", "b");
                var numberBox = numberTag.geometricBounds;
                numberThick = Math.max(numberThick, vertical ? numberBox[2] - numberBox[0] : numberBox[1] - numberBox[3]);
            }
            stack += (RULER_GAP_MM + RULER_LONG_MM + TEXT_GAP_MM) * MM + numberThick;
        }
        if (o.arrowOn) {
            // 출발 지점 파선이 이쪽으로 나와 있으면 그 바깥에 놓는다
            var clear = Math.max(stack, o.startOn && !o.timeOn ? half + EXT_MM * MM : 0);
            var arrowC = sideB * (clear + MOTION_GAP_MM * MM);
            var arrowLength = Math.max(pos[count - 1] * MM * MOTION_RATIO, MOTION_MIN_MM * MM);
            var tail = at(0, arrowC);
            var tip = at(arrowLength, arrowC);
            var shaftInset = ARROW.length - ARROW.notch;
            drawLine(group, tail, [tip[0] - forward[0] * shaftInset, tip[1] - forward[1] * shaftInset], LINE_PT, black).name = "MotionArrow";
            drawHead(group, tip, forward, 1, black);
            var motionTag = makeLabel(group, {text: MOTION_TEXT, italicFrom: MOTION_TEXT.length});
            motionTag.name = "MotionLabel";
            var tagAt = vertical ? at(arrowLength / 2, arrowC) : tail;
            placeText(motionTag, tagAt[0] - MOTION_TEXT_GAP_MM * MM, tagAt[1], "r", "m");
        }

        // 첫 사진만 그리고 나머지는 복제해 옮긴다. 새로 놓는 복제가 맨 앞이라 뒤쪽 사진이 위에 온다
        var balls = group.groupItems.add();
        balls.name = "Balls";
        var origin = at(0, 0);
        // 지난 위치를 흐리게 하면 마지막 사진만 따로 그린다 (테이프의 점은 흐리게 하지 않는다)
        var ghost = o.ghostOn && !tape;
        var proto = drawBall(balls, origin[0], origin[1], radius, o, ghost);
        var ghostSolid = ghost && o.ball === 1;   // 단색의 지난 위치는 파선 테두리
        if (ghostSolid) dashed.push(proto);
        for (var b = 1; b < count; b++) {
            var spot = at(pos[b] * MM, 0);
            if (ghost && b === count - 1) {
                drawBall(balls, spot[0], spot[1], radius, o, false);
                continue;
            }
            var copy = proto.duplicate(balls, ElementPlacement.PLACEATBEGINNING);
            copy.translate(spot[0] - origin[0], spot[1] - origin[1], true, true, true, true);
            if (ghostSolid) dashed.push(copy);
        }

        // 파선은 양 끝이 같도록 모서리·끝에 정렬한다 (헬퍼가 없으면 건너뛴다)
        if (dashed.length > 0 && typeof applyDashPatternToItems === "function") applyDashPatternToItems(dashed, DASHES, false);

        if (o.offsetX !== 0 || o.offsetY !== 0) group.translate(o.offsetX * MM, o.offsetY * MM);
    }

    // -------------------------------------------------------
    // 기하 · 글자 내용
    // -------------------------------------------------------
    // 사진마다 첫 사진에서 떨어진 거리(mm): 등속은 v·t, 가속은 v0·t + ½·a·t² (t = 번호 × 촬영 간격).
    // 감속으로 속도가 0 아래로 내려가면(또는 움직이지 않으면) 거기서 멈춘다
    function framePositions(o) {
        var positions = [];
        for (var i = 0; i < o.count; i++) {
            var t = i * o.interval;
            var s = o.motion === 0 ? o.speed * t : o.startSpeed * t + 0.5 * o.accel * t * t;
            if (i > 0 && (s <= positions[i - 1] + 1e-9 || (o.motion === 1 && o.startSpeed + o.accel * t < -1e-9))) break;
            positions.push(s);
        }
        return positions;
    }

    // 첫 사진에서 마지막 사진까지가 SPAN_MAX_MM을 넘지 않도록 속도·가속도를 줄인다 (감속은 처음 속도 × 시간을 넘지 않는다)
    function clampOptions(o) {
        var out = {};
        for (var key in o) out[key] = o[key];
        var total = (o.count - 1) * o.interval;
        out.speed = Math.min(o.speed, SPAN_MAX_MM / total);
        out.startSpeed = Math.min(o.startSpeed, SPAN_MAX_MM / total);
        if (o.accel > 0) out.accel = Math.min(o.accel, 2 * (SPAN_MAX_MM - out.startSpeed * total) / (total * total));
        return out;
    }

    // k번째 구간 거리가 가장 짧은 구간의 몇 배인지 (등속 1, 정지에서 출발한 가속 1·3·5…, 정지까지 감속 …5·3·1)
    function gapRatio(positions, k) {
        var shortest = positions[1] - positions[0];
        for (var i = 1; i < positions.length - 1; i++) shortest = Math.min(shortest, positions[i + 1] - positions[i]);
        return Math.round((positions[k + 1] - positions[k]) / shortest * 1e6) / 1e6;
    }

    // 눈금자: 첫 사진이 0, tick(mm) 간격으로 마지막 사진 너머 한 칸까지. 5칸마다 major(k가 칸 수). 눈금이 너무 많으면 간격을 넓힌다
    function rulerMarks(lastMm, tick) {
        var step = Math.max(tick, lastMm / RULER_MAX_TICKS);
        var last = Math.ceil(lastMm / step - 1e-9) + 1;
        var marks = [];
        for (var k = -1; k <= last; k++) marks.push({s: k * step, major: k % 5 === 0, k: k});
        return {from: -step, to: last * step, marks: marks};
    }

    function formatSeconds(value) {
        return String(Math.round(value * 100) / 100);
    }

    // 거리 표시값 → 구간 글자. 숫자로 시작하면 coef배한 숫자 + 나머지(단위), 아니면 계수(1이면 생략) + 입력 그대로(변수).
    // italicFrom: 이 위치부터의 영문자는 이탤릭 변수로 쓴다
    function distanceLabel(text, coef) {
        var s = trimText(text);
        var end = 0;
        while (end < s.length && "0123456789.".indexOf(s.charAt(end)) >= 0) end++;
        var number = end > 0 ? parseFloat(s.substring(0, end)) : NaN;
        if (!isNaN(number)) {
            var scaled = String(Math.round(number * coef * 1e6) / 1e6) + s.substring(end);
            return {text: scaled, italicFrom: scaled.length};
        }
        var rounded = Math.round(coef * 100) / 100;   // 변수 앞 계수는 소수 둘째 자리까지
        var prefix = rounded === 1 ? "" : String(rounded);
        return {text: prefix + s, italicFrom: prefix.length};
    }

    function trimText(text) {
        var start = 0;
        var end = text.length;
        while (start < end && text.charCodeAt(start) <= 32) start++;
        while (end > start && text.charCodeAt(end - 1) <= 32) end--;
        return text.substring(start, end);
    }

    // 화살촉: 끝점, 뒤쪽 두 날개, 오목한 점. scale로 줄여 좁은 구간에도 맞춘다
    function arrowHeadPoints(tip, d, scale) {
        var n = [-d[1], d[0]];
        var length = ARROW.length * scale;
        var back = [tip[0] - d[0] * length, tip[1] - d[1] * length];
        var wing = ARROW.halfWidth * scale;
        var notch = ARROW.notch * scale;
        return [
            [tip[0], tip[1]],
            [back[0] + n[0] * wing, back[1] + n[1] * wing],
            [back[0] + d[0] * notch, back[1] + d[1] * notch],
            [back[0] - n[0] * wing, back[1] - n[1] * wing]
        ];
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawLine(container, a, b, width, color) {
        var path = container.pathItems.add();
        path.setEntirePath([a, b]);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        return path;
    }

    function drawHead(container, tip, d, scale, color) {
        var head = container.pathItems.add();
        head.setEntirePath(arrowHeadPoints(tip, d, scale));
        head.closed = true;
        head.stroked = false;
        head.filled = true;
        head.fillColor = color;
        head.name = "DimensionHead";
        return head;
    }

    // 대각선 두 점으로 사각형
    function drawRect(container, a, b) {
        var left = Math.min(a[0], b[0]);
        var top = Math.max(a[1], b[1]);
        return container.pathItems.rectangle(top, left, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
    }

    // 중심 (cx, cy), 반지름 r인 물체. 구는 하이라이트(왼쪽 위)가 치우친 큰 원을 구 모양으로 잘라 만든다
    // (GradientColor의 origin·length는 무시되므로). 마스크가 그룹 맨 위의 패스여야 한다. 테이프는 검은 점.
    // faded이면 지난 위치: 구는 반투명, 단색은 흰 속 + 파선 테두리
    function drawBall(container, cx, cy, r, o, faded) {
        if (o.ball === 2) {
            var dot = container.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
            dot.filled = true;
            dot.fillColor = makeGray(LINE_K);
            dot.stroked = false;
            return dot;
        }
        if (o.ball === 1) {
            var disc = container.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
            disc.filled = true;
            disc.fillColor = makeGray(o.ballK);
            disc.stroked = true;
            disc.strokeColor = makeGray(LINE_K);
            disc.strokeWidth = BALL_STROKE_PT;
            if (faded) {
                // 단색은 투명도를 쓰지 않고 흰 속 + 파선 테두리
                disc.fillColor = makeGray(0);
                try { disc.strokeDashes = DASHES; } catch (ballDashError) {}
            }
            return disc;
        }
        var clip = container.groupItems.add();
        var big = r * 1.5;
        var light = clip.pathItems.ellipse(cy + r * 0.3 + big, cx - r * 0.3 - big, big * 2, big * 2);
        light.stroked = false;
        light.filled = true;
        var gradientColor = new GradientColor();
        gradientColor.gradient = grayGradient("MP_ball_" + o.ballK, GradientType.RADIAL,
            [[0, Math.max(0, o.ballK - BALL_LIGHT_K)], [30, o.ballK], [100, Math.min(100, o.ballK + BALL_DARK_K)]]);
        light.fillColor = gradientColor;
        var mask = clip.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
        mask.filled = false;
        mask.stroked = false;
        clip.clipped = true;
        if (faded) clip.opacity = GHOST_OPACITY;
        return clip;
    }

    // 같은 이름 그라데이션이 문서에 있으면 다시 쓴다 (실행마다 견본이 늘지 않게). stops: [[위치%, K값], ...]
    function grayGradient(name, type, stops) {
        var gradient = null;
        try { gradient = doc.gradients.getByName(name); } catch (e) { gradient = null; }
        if (gradient !== null) return gradient;
        gradient = doc.gradients.add();
        gradient.name = name;
        gradient.type = type;
        for (var added = gradient.gradientStops.length; added < stops.length; added++) gradient.gradientStops.add();
        for (var i = 0; i < stops.length; i++) {
            var stop = gradient.gradientStops[i];
            stop.rampPoint = stops[i][0];
            stop.color = makeGray(stops[i][1]);
        }
        return gradient;
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt),
    // 변수(italicFrom 뒤의 영문자)는 이탤릭 GSMediItaC1. 크기를 정한 뒤에 글자마다 서체를 정한다
    function makeLabel(container, label) {
        var frame = container.textFrames.add();
        frame.contents = label.text;
        frame.textRange.characterAttributes.size = FONT_PT;
        frame.textRange.characterAttributes.fillColor = makeGray(LINE_K);
        for (var i = 0; i < label.text.length; i++) {
            var code = label.text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = (i >= label.italicFrom && isAsciiLetter(code)) ? italicFont : engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
        return frame;
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    function isAsciiLetter(code) {
        return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    }

    // 글자 테두리의 가로 기준(l 왼쪽, c 가운데, r 오른쪽)과 세로 기준(t 위, m 가운데, b 아래)이 (x, y)에 오도록 옮긴다
    function placeText(frame, x, y, h, v) {
        var b = frame.geometricBounds; // [left, top, right, bottom]
        var dx = h === "l" ? x - b[0] : (h === "r" ? x - b[2] : x - (b[0] + b[2]) / 2);
        var dy = v === "t" ? y - b[1] : (v === "b" ? y - b[3] : y - (b[1] + b[3]) / 2);
        frame.translate(dx, dy);
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

    // 라벨 | 라디오 버튼들
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
            // 지표면에 닿으면 보조선은 원의 아래 기준이 자연스럽다 (켠 뒤에 다시 끌 수는 있다)
            if (key === "touchOn" && check.value) options.bottomOn = true;
            syncUi();
            updatePreview();
        };
        checks[key] = check;
    }

    // 라벨 (단위): | 입력창 | 스크롤바
    function addRow(parent, key, label, unit) {
        var spec = SPECS[key];
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (" + unit + "):").preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(options[key], spec.decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, options[key], spec.range[0], spec.range[1]);
        slider.stepdelta = spec.step;
        slider.jumpdelta = spec.step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        rows[key] = {input: input, slider: slider, reset: reset, min: spec.range[0], max: spec.range[1], step: spec.step, decimals: spec.decimals};
        return rows[key];
    }

    // 값을 그대로(단계로 반올림하지 않고) 입력창과 스크롤바에 보여 준다
    function showRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = clamp(value, controls.min, controls.max); } catch (e) {}
    }

    // 값이 바뀌면 옵션에 쓰고 미리보기를 다시 그린다
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
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
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
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
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
    // 설정 저장 · 복원 ("v5" + 라디오 3 + 체크 11 + 숫자 + 거리 글자 + 미리보기 순서. 확인할 때만 저장)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v5"];
        for (var r = 0; r < RADIO_KEYS.length; r++) parts.push(options[RADIO_KEYS[r]]);
        for (var c = 0; c < CHECK_KEYS.length; c++) parts.push(options[CHECK_KEYS[c]] ? "1" : "0");
        for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        parts.push(cleanDistText(options.distText));
        parts.push(options.previewOn ? "1" : "0");
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        var radioCount = RADIO_KEYS.length;
        var checkCount = CHECK_KEYS.length;
        if (p[0] !== "v5" || p.length !== 1 + radioCount + checkCount + NUMBER_KEYS.length + 2) return;
        var radioLimits = [DIRECTIONS.length, MOTIONS.length, BALLS.length];
        for (var r = 0; r < radioCount; r++) {
            var index = parseInt(p[1 + r], 10);
            if (index >= 0 && index < radioLimits[r]) options[RADIO_KEYS[r]] = index;
        }
        for (var c = 0; c < checkCount; c++) options[CHECK_KEYS[c]] = (p[1 + radioCount + c] === "1");
        var base = 1 + radioCount + checkCount;
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[base + i]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
        options.distText = p[base + NUMBER_KEYS.length];
        options.previewOn = (p[base + NUMBER_KEYS.length + 1] === "1");
    }
})();
