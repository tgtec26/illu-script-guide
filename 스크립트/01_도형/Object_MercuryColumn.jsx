// Object_MercuryColumn.jsx
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

// 토리첼리 실험 그림: 수은을 담은 수조에 거꾸로 세운 유리관과 수은 기둥의 높이를 그린다.
//   - 사각형을 선택하고 실행하면 그 사각형의 가운데와 크기를 그림 틀(전체 너비·높이)로 쓰고(사각형은 확인할 때 지운다),
//     선택이 없으면 대지 가운데에 기본 크기로 그린다.
//   - 전체 너비·높이는 그림 틀이다. 수조는 틀 아래쪽 가운데에 놓이고 틀보다 넓거나 높을 수 없으며, 유리관은 입구가 수조 가운데에 있고
//     틀의 위·옆을 넘지 않는 길이까지만 늘어난다. 그릴 수 없는 값은 줄여서 입력창에 되돌려 준다.
//   - 수조는 위가 열린 U자 선(바닥 모서리는 둥글게), 수은은 수조 바닥에서 수은 깊이(mm)까지 채운다(K 25).
//   - 유리관은 아래가 열리고 위가 둥글게 막힌 한 줄 선이다. 기울기(°)는 연직선에서 오른쪽(+)·왼쪽(−)으로 입구 가운데를 축으로 돌린 값이다.
//     입구는 수은 깊이의 절반 높이에 두고, 기울이면 바닥에 가까워진다.
//   - 수은 기둥 높이는 수조 수은 면에서 기둥 윗면까지의 연직 높이(mm)다. 기울여도 같고 유리관 안 수은 윗면은 수평이다.
//   - 높이 표시: 기둥 윗면 높이의 점선과 수은 면까지의 치수선(화살촉 양쪽)과 값 글자(치수선을 끊고 가운데에 넣는다).
//   - 기압 화살표: 수은 면 위 왼쪽·오른쪽의 B(기압), 유리관 안 수은 면 위의 A와 아래의 C. A·C는 관 안에 들어갈 때만 그린다.
//     색은 모두 회색 음영이다: 수은 K 25, B·C 화살표 K 60, A 화살표와 선·점선·글자 K 100.
//   - 글자 서체는 한글·공백 Spoqa, 영문·숫자·기호 GSMediumB1(기준선 +0.5pt)이고 지시선은 0.4pt 검정이다.
//   - 확인하면 원본 사각형은 지워지고 수조·수은·유리관·표시가 든 그룹 하나가 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectMercuryColumn/settings";
    var MM = 2.834645669;
    var KAPPA = 0.5522847498;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var FONT_PT = 8;
    var LINE_PT = 0.4;
    var DASH = [2, 2];
    var MERCURY_K = 25;
    var CORNER_R_MM = 3;
    // 입구의 가장 높은 모서리가 수은 면보다 이만큼 아래에 있어야 한다
    var MOUTH_MARGIN_MM = 0.5;
    // 기둥 윗면과 유리관 위 둥근 끝 사이의 최소 진공 길이
    var MIN_VACUUM_MM = 1.5;
    // 기압 화살표: 길이 = 유리관 너비 × 비율, 머리 너비 = 유리관 너비 × 비율 등
    var ARROW_LEN_RATIO = 1.3;
    var ARROW_HEAD_RATIO = 0.6;
    var ARROW_SHAFT_RATIO = 0.5;
    var ARROW_HEAD_LEN_RATIO = 0.7;
    var ARROW_GAP_MM = 0.5;
    var B_GAP_RATIO = 1;
    var MIN_ARROW_LEN_MM = 1.5;
    var MIN_ARROW_HEAD_MM = 1;
    var LEADER_MM = 5;
    var TEXT_GAP_MM = 1;
    var DIM_HEAD_LEN_MM = 1.8;
    var DIM_HEAD_WIDTH_MM = 0.9;
    var DIM_PAD_MM = 0.8;
    var DIM_GAP_MIN_MM = 8;
    var DIM_GAP_RATIO = 0.2;
    var LEVEL_EXTRA_MM = 4;
    var ARROW_A_K = 100;
    var ARROW_BC_K = 60;

    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var POSITION_LIMIT_MM = 100;
    var FRAME_W_RANGE = [20, 300];
    var FRAME_H_RANGE = [20, 300];
    var TROUGH_W_RANGE = [10, 300];
    var TROUGH_H_RANGE = [3, 200];
    var DEPTH_RANGE = [1, 200];
    var TUBE_W_RANGE = [1.5, 30];
    var TUBE_LEN_RANGE = [5, 300];
    var TILT_RANGE = [-60, 60];
    var COL_RANGE = [0, 300];
    var LINE_RANGE = [0.1, 5];

    // 숫자 옵션: 키, 범위, 한 단계, 소수 자리. 저장 순서도 이 순서다
    var NUMBER_KEYS = ["frameW", "frameH", "troughW", "troughH", "depth", "troughPt", "tubeW", "tubeLen", "tilt", "tubePt",
        "colH", "offsetX", "offsetY"];
    var SPECS = {
        frameW: {range: FRAME_W_RANGE, step: 0.5, decimals: 1},
        frameH: {range: FRAME_H_RANGE, step: 0.5, decimals: 1},
        troughW: {range: TROUGH_W_RANGE, step: 0.5, decimals: 1},
        troughH: {range: TROUGH_H_RANGE, step: 0.5, decimals: 1},
        depth: {range: DEPTH_RANGE, step: 0.5, decimals: 1},
        troughPt: {range: LINE_RANGE, step: 0.1, decimals: 1},
        tubeW: {range: TUBE_W_RANGE, step: 0.1, decimals: 1},
        tubeLen: {range: TUBE_LEN_RANGE, step: 0.5, decimals: 1},
        tilt: {range: TILT_RANGE, step: 1, decimals: 0},
        tubePt: {range: LINE_RANGE, step: 0.1, decimals: 1},
        colH: {range: COL_RANGE, step: 0.5, decimals: 1},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1}
    };
    var BOOL_KEYS = ["arrowsOn", "vacuumOn", "columnOn", "surfaceOn", "mercuryOn", "glassOn", "heightOn", "previewOn"];
    var TEXT_KEYS = ["glassText", "heightText"];
    var TEXT_MAX = 30;

    var doc = app.activeDocument;
    var korFont = findTextFont([KOR_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME]);

    // 선택한 사각형이 있으면 그 자리·크기를 쓴다
    var rect = getSelectedRectangle(doc.selection);
    var rectWasHidden = rect ? rect.hidden : false;
    var centerX;
    var centerY;
    var rectWidthMm = null;
    var rectHeightMm = null;
    if (rect) {
        var bounds = rect.geometricBounds; // [left, top, right, bottom]
        centerX = (bounds[0] + bounds[2]) / 2;
        centerY = (bounds[1] + bounds[3]) / 2;
        rectWidthMm = Math.round((bounds[2] - bounds[0]) / MM * 2) / 2;
        rectHeightMm = Math.round((bounds[1] - bounds[3]) / MM * 2) / 2;
    } else {
        var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        centerX = (artboardRect[0] + artboardRect[2]) / 2;
        centerY = (artboardRect[1] + artboardRect[3]) / 2;
    }

    // 옵션
    var options = {
        frameW: 70, frameH: 60,
        troughW: 60, troughH: 20, depth: 15, troughPt: 0.8,
        tubeW: 5.5, tubeLen: 50, tilt: 0, tubePt: 0.4,
        colH: 30,
        offsetX: 0, offsetY: 0,
        arrowsOn: true, vacuumOn: true, columnOn: true, surfaceOn: true, mercuryOn: true,
        glassOn: true, glassText: "1 m 유리관",
        heightOn: true, heightText: "76 cm",
        previewOn: true
    };
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var d = 0; d < NUMBER_KEYS.length; d++) DEFAULTS[NUMBER_KEYS[d]] = options[NUMBER_KEYS[d]];
    applySettings();
    if (rect) {
        options.frameW = clamp(rectWidthMm, FRAME_W_RANGE[0], FRAME_W_RANGE[1]);
        options.frameH = clamp(rectHeightMm, FRAME_H_RANGE[0], FRAME_H_RANGE[1]);
        // 사각형을 선택했으면 전체 너비·높이의 처음 값은 그 사각형 크기다
        DEFAULTS.frameW = options.frameW;
        DEFAULTS.frameH = options.frameH;
    }

    var previewGroup = null;
    var rows = {};

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "수은 기둥 높이 (토리첼리 실험)");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var framePanel = addPanel(dlg, "전체 그림");
    addRow(framePanel, "frameW", "전체 너비", "mm");
    addRow(framePanel, "frameH", "전체 높이", "mm");
    rows.frameW.input.helpTip = "그림 틀. 수조는 틀 아래쪽 가운데에 놓이고 틀보다 넓거나 높을 수 없다";
    rows.frameH.input.helpTip = "그림 틀. 유리관은 입구에서 틀 위까지만 늘어난다";

    var troughPanel = addPanel(dlg, "수조");
    addRow(troughPanel, "troughW", "너비", "mm");
    addRow(troughPanel, "troughH", "높이", "mm");
    addRow(troughPanel, "depth", "수은 깊이", "mm");
    addRow(troughPanel, "troughPt", "선 두께", "pt");
    rows.depth.input.helpTip = "수조 바닥에서 수은 면까지. 수조 높이보다 클 수 없다";

    var tubePanel = addPanel(dlg, "유리관");
    addRow(tubePanel, "tubeW", "너비", "mm");
    addRow(tubePanel, "tubeLen", "높이", "mm");
    addRow(tubePanel, "tilt", "기울기", "°");
    addRow(tubePanel, "tubePt", "선 두께", "pt");
    rows.tubeLen.input.helpTip = "입구 가운데에서 막힌 끝까지의 길이. 틀 위·옆을 넘거나 수은 기둥보다 짧을 수 없다";
    rows.tilt.input.helpTip = "연직선에서 오른쪽(+)·왼쪽(−)으로. 수은 기둥의 연직 높이는 그대로다";

    var columnPanel = addPanel(dlg, "수은 기둥");
    addRow(columnPanel, "colH", "높이", "mm");
    rows.colH.input.helpTip = "수조 수은 면에서 기둥 윗면까지의 연직 높이. 유리관 길이에서 진공 자리를 뺀 값까지";

    var showPanel = addPanel(dlg, "표시");
    var showRow1 = showPanel.add("group");
    showRow1.alignChildren = ["left", "center"];
    var arrowsCheck = showRow1.add("checkbox", undefined, "기압 화살표 (A·B·C)");
    var vacuumCheck = showRow1.add("checkbox", undefined, "진공");
    var showRow2 = showPanel.add("group");
    showRow2.alignChildren = ["left", "center"];
    var columnCheck = showRow2.add("checkbox", undefined, "수은 기둥");
    var surfaceCheck = showRow2.add("checkbox", undefined, "수은 면");
    var mercuryCheck = showRow2.add("checkbox", undefined, "수은");
    var heightRow = showPanel.add("group");
    heightRow.alignChildren = ["left", "center"];
    var heightCheck = heightRow.add("checkbox", undefined, "높이 표시 (치수선·점선)");
    var heightInput = heightRow.add("edittext", undefined, options.heightText);
    heightInput.characters = 10;
    heightInput.helpTip = "치수선 가운데에 넣을 글자";
    var glassRow = showPanel.add("group");
    glassRow.alignChildren = ["left", "center"];
    var glassCheck = glassRow.add("checkbox", undefined, "유리관 이름");
    var glassInput = glassRow.add("edittext", undefined, options.glassText);
    glassInput.characters = 14;

    var positionPanel = addPanel(dlg, "위치");
    addRow(positionPanel, "offsetX", "가로", "mm");
    addRow(positionPanel, "offsetY", "세로", "mm");

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    var checks = {
        arrowsOn: arrowsCheck, vacuumOn: vacuumCheck, columnOn: columnCheck, surfaceOn: surfaceCheck,
        mercuryOn: mercuryCheck, glassOn: glassCheck, heightOn: heightCheck
    };
    for (var key in checks) {
        if (checks.hasOwnProperty(key)) {
            checks[key].value = options[key];
            bindCheck(key, checks[key]);
        }
    }
    previewCheck.value = options.previewOn;
    syncEnabled();

    for (var n = 0; n < NUMBER_KEYS.length; n++) {
        if (NUMBER_KEYS[n] === "offsetX") {
            bindPositionRow(rows.offsetX, "offsetX", true);
        } else if (NUMBER_KEYS[n] === "offsetY") {
            bindPositionRow(rows.offsetY, "offsetY", false);
        } else {
            bindValueRow(rows[NUMBER_KEYS[n]], NUMBER_KEYS[n]);
        }
    }
    heightInput.onChange = function() { options.heightText = heightInput.text; updatePreview(); };
    glassInput.onChange = function() { options.glassText = glassInput.text; updatePreview(); };

    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) {
            if (rect) rect.hidden = true;
            buildPreview();
        }
        if (rect) { try { rect.remove(); } catch (removeError) {} }
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    if (rect) rect.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        if (rect) {
            rect.hidden = rectWasHidden;
            rect.selected = true;
        }
    }
    app.redraw();

    // 글자 입력칸은 그 표시를 켰을 때만 만진다
    function syncEnabled() {
        heightInput.enabled = options.heightOn;
        glassInput.enabled = options.glassOn;
    }

    function bindCheck(key, check) {
        check.onClick = function() {
            options[key] = check.value;
            syncEnabled();
            updatePreview();
        };
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (options.previewOn) {
            if (rect) rect.hidden = true;
            buildPreview();
        } else if (rect) {
            rect.hidden = rectWasHidden;
        }
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
        // 지금 크기에서 그릴 수 없는 값은 줄여서 입력창에도 되돌려 준다
        var o = clampOptions(options);
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var numberKey = NUMBER_KEYS[i];
            if (o[numberKey] !== options[numberKey]) {
                options[numberKey] = o[numberKey];
                showRowValue(rows[numberKey], o[numberKey]);
            }
        }

        var g = mercuryGeometry({
            cx: centerX, floorY: centerY - o.frameH * MM / 2,
            troughW: o.troughW * MM, troughH: o.troughH * MM, depth: o.depth * MM,
            tubeW: o.tubeW * MM, tubeLen: o.tubeLen * MM, tilt: o.tilt, colH: o.colH * MM,
            cornerR: CORNER_R_MM * MM, mouthMargin: MOUTH_MARGIN_MM * MM
        });

        var black = makeGray(100);
        var host = rect ? rect.parent : findEditableLayer();
        previewGroup = host.groupItems.add();
        previewGroup.name = "MercuryColumn";
        if (rect) previewGroup.move(rect, ElementPlacement.PLACEBEFORE);
        var group = previewGroup;

        // 수은 (수조 안과 유리관 안은 같은 색이라 경계가 보이지 않는다)
        var mercury = drawPath(group, g.troughFill, true);
        mercury.name = "Mercury";
        styleFill(mercury, makeGray(MERCURY_K));
        var column = drawPath(group, g.column, true);
        column.name = "MercuryColumn";
        styleFill(column, makeGray(MERCURY_K));
        var trough = drawPath(group, g.troughOutline, false);
        trough.name = "Trough";
        styleStroke(trough, black, o.troughPt, null);
        var tube = drawPath(group, g.tube, false);
        tube.name = "Tube";
        styleStroke(tube, black, o.tubePt, null);

        var surfY = g.surfY;
        var colTop = g.colTopY;
        var half = o.tubeW * MM / 2;
        var tubeLeftSurf = g.axisX(surfY) - g.hw;
        var tubeRightSurf = g.axisX(surfY) + g.hw;
        var headW = ARROW_HEAD_RATIO * o.tubeW * MM;
        var bGap = B_GAP_RATIO * o.tubeW * MM;
        var arrowGap = ARROW_GAP_MM * MM;
        var lenB = ARROW_LEN_RATIO * o.tubeW * MM;
        var tanT = g.sinT / g.cosT;
        // 기울어진 관이 B 화살표 쪽으로 눕는 만큼 화살표를 더 띄운다
        var bLeftX = tubeLeftSurf - lenB * Math.max(0, -tanT) - bGap - headW / 2;
        var bRightX = tubeRightSurf + lenB * Math.max(0, tanT) + bGap + headW / 2;
        var arrowA = makeGray(ARROW_A_K);
        var arrowBC = makeGray(ARROW_BC_K);

        // 왼쪽 표시가 차지한 가장 왼쪽 x (수은 면 글자를 그 왼쪽에 둔다)
        var leftLimit = tubeLeftSurf;
        if (options.arrowsOn) leftLimit = Math.min(leftLimit, bLeftX - headW / 2);

        var bTextTop = -Infinity;

        // 높이 표시: 점선 + 치수선 + 값
        if (options.heightOn && colTop - surfY > 2 * DIM_HEAD_LEN_MM * MM) {
            var tubeLeftTop = g.axisX(colTop) - g.hw;
            var dimX = Math.min(Math.min(tubeLeftSurf, tubeLeftTop) - Math.max(DIM_GAP_MIN_MM * MM, DIM_GAP_RATIO * o.troughW * MM),
                leftLimit - 3 * MM);
            leftLimit = Math.min(leftLimit, dimX);
            var level = addLine(group, dimX - LEVEL_EXTRA_MM * MM, colTop, tubeLeftTop, colTop, LINE_PT, black, DASH);
            level.name = "Level";

            var headLen = DIM_HEAD_LEN_MM * MM;
            var dimMid = (surfY + colTop) / 2;
            var dimText = options.heightText === "" ? null : makeText(group, options.heightText);
            var dimTextH = 0;
            if (dimText !== null) {
                var dimBounds = dimText.geometricBounds;
                dimTextH = dimBounds[1] - dimBounds[3];
            }
            var pad = DIM_PAD_MM * MM;
            var broken = dimText !== null && colTop - surfY >= 2 * headLen + dimTextH + 2 * pad + 2 * MM;
            if (broken) {
                addLine(group, dimX, colTop - headLen, dimX, dimMid + dimTextH / 2 + pad, LINE_PT, black, null).name = "Dimension";
                addLine(group, dimX, dimMid - dimTextH / 2 - pad, dimX, surfY + headLen, LINE_PT, black, null).name = "Dimension";
                placeText(dimText, dimX, dimMid, "c", "m");
            } else {
                addLine(group, dimX, colTop - headLen, dimX, surfY + headLen, LINE_PT, black, null).name = "Dimension";
                if (dimText !== null) placeText(dimText, dimX - TEXT_GAP_MM * MM, dimMid, "r", "m");
            }
            if (dimText !== null) dimText.name = "HeightValue";
            addHead(group, dimX, colTop, 1, black).name = "DimensionHead";
            addHead(group, dimX, surfY, -1, black).name = "DimensionHead";
        }

        // 기압 화살표: 수은 면 위 B 두 개, 관 안 A(수은 기둥이 누르는 쪽)와 C(수은 면 아래에서 받치는 쪽)
        if (options.arrowsOn) {
            var tipTop = surfY + arrowGap;
            addBlockArrow(group, bLeftX, tipTop + lenB, tipTop, headW, arrowBC).name = "PressureB";
            addBlockArrow(group, bRightX, tipTop + lenB, tipTop, headW, arrowBC).name = "PressureB";
            var bText = makeText(group, "기압(B)");
            bText.name = "LabelB";
            placeText(bText, bRightX, tipTop + lenB + TEXT_GAP_MM * MM, "c", "b");
            // 오른쪽으로 기운 관에 글자가 닿지 않게 관 오른쪽 벽 밖으로 민다
            var bBounds = bText.geometricBounds;
            var clearX = g.axisX(bBounds[1]) + g.hw + TEXT_GAP_MM * MM;
            if (bBounds[0] < clearX) bText.translate(clearX - bBounds[0], 0);
            bTextTop = bBounds[1];

            var spaceBelow = surfY - (g.mouthY + half * Math.abs(g.sinT)) - 2 * arrowGap;
            var lenIn = Math.min(lenB, spaceBelow, 0.7 * o.colH * MM);
            var headIn = Math.min(headW, 0.9 * (o.tubeW * MM / g.cosT) - lenIn * Math.abs(tanT));
            if (lenIn >= MIN_ARROW_LEN_MM * MM && headIn >= MIN_ARROW_HEAD_MM * MM) {
                var aTail = tipTop + lenIn;
                var aX = g.axisX((tipTop + aTail) / 2);
                addBlockArrow(group, aX, aTail, tipTop, headIn, arrowA).name = "PressureA";
                var aText = makeText(group, "A");
                aText.name = "LabelA";
                placeText(aText, g.axisX(aTail), aTail + TEXT_GAP_MM * MM, "c", "b");

                var cTip = surfY - arrowGap;
                var cTail = cTip - lenIn;
                var cX = g.axisX((cTip + cTail) / 2);
                addBlockArrow(group, cX, cTail, cTip, headIn, arrowBC).name = "PressureC";
                addSideLabel(group, g, "C", (cTip + cTail) / 2, "l", cX - headIn * ARROW_SHAFT_RATIO / 2, "LabelC");
            }
        }

        // 지시선이 있는 이름: 유리관(왼쪽 벽까지), 진공(관 안 가운데까지), 수은 기둥(기둥 가운데까지)
        var vacuumY = (colTop + g.capLowY) / 2;
        if (options.glassOn && options.glassText !== "") {
            addSideLabel(group, g, options.glassText, vacuumY, "l", g.axisX(vacuumY) - g.hw, "LabelGlass");
        }
        if (options.vacuumOn) addSideLabel(group, g, "진공", vacuumY, "r", g.axisX(vacuumY), "LabelVacuum");
        if (options.columnOn) {
            // 기압(B) 글자와 겹치지 않게 그 위로 올리되 기둥 윗면 아래에 둔다
            var columnY = Math.max((surfY + colTop) / 2, Math.min(bTextTop + 2 * MM, colTop - MM));
            addSideLabel(group, g, "수은 기둥", columnY, "r", g.axisX(columnY), "LabelColumn");
        }

        // 수은 면(수은 면 위 왼쪽)과 수은(수조 안 왼쪽)
        if (options.surfaceOn) {
            var surfaceText = makeText(group, "수은 면");
            surfaceText.name = "LabelSurface";
            placeText(surfaceText, leftLimit - 2 * MM, surfY + 0.8 * MM, "r", "b");
        }
        if (options.mercuryOn) {
            var mercuryText = makeText(group, "수은");
            mercuryText.name = "LabelMercury";
            placeText(mercuryText, g.left + 3 * MM, surfY - 0.45 * o.depth * MM, "l", "m");
        }

        if (o.offsetX !== 0 || o.offsetY !== 0) group.translate(o.offsetX * MM, o.offsetY * MM);
    }

    // 관 옆에서 지시선으로 가리키는 글자. side "l"이면 왼쪽, "r"이면 오른쪽. 지시선은 글자 쪽 끝에서 leaderEndX까지
    function addSideLabel(group, g, text, y, side, leaderEndX, name) {
        var label = makeText(group, text);
        label.name = name;
        var gap = TEXT_GAP_MM * MM;
        if (side === "r") {
            var textX = g.axisX(y) + g.hw + LEADER_MM * MM;
            placeText(label, textX, y, "l", "m");
            addLine(group, textX - gap, y, leaderEndX, y, LINE_PT, makeGray(100), null).name = name + "Leader";
        } else {
            var leftX = g.axisX(y) - g.hw - LEADER_MM * MM;
            placeText(label, leftX, y, "r", "m");
            addLine(group, leftX + gap, y, leaderEndX, y, LINE_PT, makeGray(100), null).name = name + "Leader";
        }
        return label;
    }

    // -------------------------------------------------------
    // 기하 (mm 옵션 → 그릴 수 있는 범위로 줄이기)
    // -------------------------------------------------------
    // 수조는 틀보다 넓거나 높을 수 없고, 수은 깊이는 수조 높이 이하, 유리관은 수조 너비의 절반 이하.
    // 기울기는 입구의 가장 높은 모서리가 수은 면 아래에 남는 값까지, 유리관 길이는 수은 기둥과 진공 자리를 담는 값부터 틀 위·옆을 넘지 않는 값까지
    // (틀이 모자라면 담는 값이 우선), 수은 기둥 높이는 유리관 위 둥근 끝 앞의 진공 자리를 남기는 값까지
    function clampOptions(o) {
        var frameW = clamp(o.frameW, FRAME_W_RANGE[0], FRAME_W_RANGE[1]);
        var frameH = clamp(o.frameH, FRAME_H_RANGE[0], FRAME_H_RANGE[1]);
        var troughW = clamp(o.troughW, TROUGH_W_RANGE[0], Math.min(TROUGH_W_RANGE[1], frameW));
        var troughH = clamp(o.troughH, TROUGH_H_RANGE[0], Math.min(TROUGH_H_RANGE[1], frameH));
        var depth = clamp(o.depth, DEPTH_RANGE[0], Math.min(DEPTH_RANGE[1], troughH));
        var tubeW = clamp(o.tubeW, TUBE_W_RANGE[0], Math.min(TUBE_W_RANGE[1], troughW / 2));
        var tiltMax = Math.floor(Math.min(TILT_RANGE[1],
            Math.asin(Math.min(1, (depth - MOUTH_MARGIN_MM) / tubeW)) * 180 / Math.PI));
        var tilt = clamp(Math.round(o.tilt), -tiltMax, tiltMax);
        var cosT = Math.cos(tilt * Math.PI / 180);
        var sinT = Math.abs(Math.sin(tilt * Math.PI / 180));
        var mouth = mouthHeights(depth, tubeW, tilt, MOUTH_MARGIN_MM);
        var lenMin = Math.max(TUBE_LEN_RANGE[0],
            tubeW / 2 + (depth + MIN_VACUUM_MM + tubeW / 2 * sinT - mouth.center) / cosT);
        var lenMax = Math.min(TUBE_LEN_RANGE[1], tubeW / 2 + (frameH - mouth.center - tubeW / 2) / cosT);
        if (sinT > 1e-9) lenMax = Math.min(lenMax, tubeW / 2 + (frameW / 2 - tubeW / 2) / sinT);
        var tubeLen = clamp(o.tubeLen, lenMin, Math.max(lenMin, lenMax));
        var colMax = Math.max(0, mouth.center + (tubeLen - tubeW / 2) * cosT - tubeW / 2 * sinT - MIN_VACUUM_MM - depth);
        var colH = clamp(o.colH, COL_RANGE[0], Math.min(COL_RANGE[1], colMax));
        return {
            frameW: frameW, frameH: frameH, troughW: troughW, troughH: troughH, depth: depth,
            troughPt: clamp(o.troughPt, LINE_RANGE[0], LINE_RANGE[1]),
            tubeW: tubeW, tubeLen: tubeLen, tilt: tilt,
            tubePt: clamp(o.tubePt, LINE_RANGE[0], LINE_RANGE[1]),
            colH: colH, offsetX: o.offsetX, offsetY: o.offsetY
        };
    }

    // 입구(기울기만큼 비스듬한 끝)의 가장 낮은 모서리 높이와 입구 가운데 높이, 수조 바닥 기준.
    // 곧게 세우면 수은 깊이의 절반, 기울이면 바닥에 가까워지되 가장 높은 모서리는 수은 면 아래에 둔다
    function mouthHeights(depth, tubeW, tiltDeg, margin) {
        var rad = tiltDeg * Math.PI / 180;
        var sinT = Math.abs(Math.sin(rad));
        var low = Math.min(0.5 * depth * Math.cos(rad), depth - tubeW * sinT - margin);
        return {low: low, center: low + tubeW / 2 * sinT};
    }

    // 수조·수은·유리관·수은 기둥의 점 목록(pt). 유리관은 입구 가운데(수조 가운데 위)를 축으로 기울기만큼 돌린다.
    // 수은 기둥은 입구에서 두 벽을 따라 올라가 수평으로 자른 닫힌 패스, 윗면 높이는 수은 면 + 기둥 높이
    function mercuryGeometry(g) {
        var rad = g.tilt * Math.PI / 180;
        var sinT = Math.sin(rad);
        var cosT = Math.cos(rad);
        var half = g.tubeW / 2;
        var left = g.cx - g.troughW / 2;
        var right = g.cx + g.troughW / 2;
        var surfY = g.floorY + g.depth;
        var mouthY = g.floorY + mouthHeights(g.depth, g.tubeW, g.tilt, g.mouthMargin).center;
        var radius = Math.min(g.cornerR, g.depth, g.troughW / 4);
        var capY = g.tubeLen - half;
        var k = KAPPA * half;

        // 관 안 좌표(축이 위, 입구 가운데가 원점) → 문서 좌표
        function toDoc(x, y) {
            return [g.cx + x * cosT + y * sinT, mouthY - x * sinT + y * cosT];
        }
        function point(ax, ay, lx, ly, rx, ry) {
            return {anchor: toDoc(ax, ay), left: toDoc(lx, ly), right: toDoc(rx, ry)};
        }
        // 벽(관 안 x)에서 문서 높이 y에 닿는 점
        function wall(x, y) {
            return toDoc(x, (y - mouthY + x * sinT) / cosT);
        }
        var colTopY = surfY + g.colH;
        var cap = toDoc(0, capY);

        return {
            sinT: sinT, cosT: cosT, left: left, right: right, floorY: g.floorY, surfY: surfY,
            colTopY: colTopY, mouthY: mouthY,
            hw: half / cosT,
            axisX: function(y) { return g.cx + (y - mouthY) * sinT / cosT; },
            capLowY: cap[1] - half * Math.abs(sinT),
            capTopY: cap[1] + half,
            troughOutline: uPath(left, right, g.floorY, g.floorY + g.troughH, radius),
            troughFill: uPath(left, right, g.floorY, surfY, radius),
            tube: [
                point(-half, 0, -half, 0, -half, 0),
                point(-half, capY, -half, capY, -half, capY + k),
                point(0, capY + half, -k, capY + half, k, capY + half),
                point(half, capY, half, capY + k, half, capY),
                point(half, 0, half, 0, half, 0)
            ],
            column: [cornerAt(toDoc(-half, 0)), cornerAt(toDoc(half, 0)),
                cornerAt(wall(half, colTopY)), cornerAt(wall(-half, colTopY))]
        };
    }

    // 위가 열린 U자: 왼쪽 위 → 둥근 바닥 모서리 → 오른쪽 위
    function uPath(left, right, floorY, topY, r) {
        var k = KAPPA * r;
        return [
            corner(left, topY),
            {anchor: [left, floorY + r], left: [left, floorY + r], right: [left, floorY + r - k]},
            {anchor: [left + r, floorY], left: [left + r - k, floorY], right: [left + r, floorY]},
            {anchor: [right - r, floorY], left: [right - r, floorY], right: [right - r + k, floorY]},
            {anchor: [right, floorY + r], left: [right, floorY + r - k], right: [right, floorY + r]},
            corner(right, topY)
        ];
    }

    function corner(x, y) {
        return {anchor: [x, y], left: [x, y], right: [x, y]};
    }

    function cornerAt(p) {
        return corner(p[0], p[1]);
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

    function addLine(container, x1, y1, x2, y2, width, color, dashes) {
        var path = container.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        styleStroke(path, color, width, dashes);
        return path;
    }

    // 속이 찬 화살표(세로): 꼬리 yTail에서 끝 yTip으로, 머리 너비 headW
    function addBlockArrow(container, x, yTail, yTip, headW, color) {
        var dir = yTip < yTail ? -1 : 1;
        var headLen = Math.min(headW * ARROW_HEAD_LEN_RATIO, Math.abs(yTip - yTail) * 0.6);
        var shaft = headW * ARROW_SHAFT_RATIO;
        var baseY = yTip - dir * headLen;
        var path = drawPath(container, [
            corner(x - shaft / 2, yTail), corner(x + shaft / 2, yTail),
            corner(x + shaft / 2, baseY), corner(x + headW / 2, baseY),
            corner(x, yTip),
            corner(x - headW / 2, baseY), corner(x - shaft / 2, baseY)
        ], true);
        styleFill(path, color);
        return path;
    }

    // 치수선 끝 화살촉: 끝이 (x, y), dir 1이면 위를 가리킨다
    function addHead(container, x, y, dir, color) {
        var len = DIM_HEAD_LEN_MM * MM;
        var halfW = DIM_HEAD_WIDTH_MM * MM / 2;
        var path = drawPath(container, [
            corner(x, y), corner(x + halfW, y - dir * len), corner(x - halfW, y - dir * len)
        ], true);
        styleFill(path, color);
        return path;
    }

    function styleFill(path, color) {
        path.stroked = false;
        path.filled = true;
        path.fillColor = color;
    }

    function styleStroke(path, color, width, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
        try { path.strokeDashes = dashes === null ? [] : dashes; } catch (dashError) {}
    }

    // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt).
    // 크기를 정한 뒤에 부른다
    function makeText(container, text) {
        var frame = container.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = FONT_PT;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        return frame;
    }

    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if (isKoreanOrSpace(code)) {
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
    // 설정 저장 · 복원 ("v1" + 숫자 + 켜고 끄는 항목 + 글자 순서. 확인할 때만 저장)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1"];
        var i;
        for (i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        for (i = 0; i < BOOL_KEYS.length; i++) parts.push(options[BOOL_KEYS[i]] ? "1" : "0");
        for (i = 0; i < TEXT_KEYS.length; i++) parts.push(String(options[TEXT_KEYS[i]]).replace(/\|/g, ""));
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 1 + NUMBER_KEYS.length + BOOL_KEYS.length + TEXT_KEYS.length) return;
        var at = 1;
        var i;
        for (i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[at++]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
        for (i = 0; i < BOOL_KEYS.length; i++) options[BOOL_KEYS[i]] = (p[at++] === "1");
        for (i = 0; i < TEXT_KEYS.length; i++) options[TEXT_KEYS[i]] = String(p[at++]).substring(0, TEXT_MAX);
    }
})();
