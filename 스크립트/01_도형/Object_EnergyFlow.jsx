/*
  Illustrator Script: Energy Flow Arrows
  Description: 연료 에너지 상자 위로 갈라져 올라가는 에너지 흐름 화살표(전기로 이용·열로 이용·손실 등)를 그린다.
               선택한 사각형이 상자가 되고, 화살표 전체 폭 = 사각형 폭, 각 화살표 폭 = 값 비율.
               첫 화살표는 12시 방향으로 곧게, 마지막 화살표는 90° 꺾여 3시 방향으로 나가고
               가운데 화살표는 각도를 조절한다. 값은 숫자 뒤에 이탤릭 E를 붙여 표시한다.
  사용법: 상자가 될 사각형 하나를 선택한 뒤 실행. 확인하면 원본 사각형은 지워진다.
*/

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

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 사각형을 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    if (doc.activeLayer.locked || !doc.activeLayer.visible) {
        alert("현재 레이어가 잠겨 있거나 숨겨져 있습니다.\n편집할 수 있는 레이어를 선택한 뒤 실행해주세요.");
        return;
    }

    var sel = doc.selection;
    if (!sel || sel.length !== 1 || sel[0].typename !== "PathItem" || sel[0].pathPoints.length !== 4) {
        alert("상자가 될 사각형 하나를 선택해주세요.\n\n사각형 폭이 화살표 전체 폭이 됩니다.");
        return;
    }
    var sourceRect = sel[0];
    var rectBounds = sourceRect.geometricBounds;   // [left, top, right, bottom]
    // 상자 크기는 선택한 사각형에서 가져오고, 윗변 가운데를 고정한 채 다이얼로그에서 바꾼다 (저장하지 않음)
    var boxTopCenterX = (rectBounds[0] + rectBounds[2]) / 2;
    var boxTopY = rectBounds[1];

    var MM_TO_PT = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var MAX_ARROWS = 4;
    var POSITION_LIMIT_MM = 100;
    var PREF_KEY = "ObjectEnergyFlow/settings";
    var PREVIEW_NAME = "Energy Flow Preview";
    var ARROW_KEYS = ["angleDeg", "bendMm", "lengthMm", "radiusMm", "gray"];
    var MIN_SECTOR_PERCENT = 1;
    var SECTOR_DRAG_STEP = 0.5;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ITALIC_FONT_NAME = "GSMediItaC1";

    var korFont = getFont(KOR_FONT_NAME);
    var engFont = getFont(ENG_FONT_NAME);
    var italicFont = getFont(ITALIC_FONT_NAME);

    // ---- 옵션 ----
    var boxName = "연료 에너지";
    var boxValue = "100";
    var arrowCount = 3;
    var percents = [43, 38, 19, 0];          // 4칸 고정. 켜진 칸의 합 = 100
    var names = ["전기로/이용", "열로/이용", "손실", "기타"];
    var unknown = [false, false, false, false];
    var arrows = [
        {angleDeg: 0,  bendMm: 8, lengthMm: 16, radiusMm: 3, gray: 60},
        {angleDeg: 30, bendMm: 8, lengthMm: 14, radiusMm: 3, gray: 35},
        {angleDeg: 60, bendMm: 8, lengthMm: 12, radiusMm: 3, gray: 20},
        {angleDeg: 90, bendMm: 6, lengthMm: 10, radiusMm: 3, gray: 10}
    ];
    var RANGES = {
        angleDeg: [0, 90, 1, 0],
        bendMm: [0, 100, 0.5, 1],
        lengthMm: [0, 100, 0.5, 1],
        radiusMm: [0, 30, 0.5, 1],
        gray: [0, 100, 5, 0]
    };
    var boxWidthMm = clamp(roundTo((rectBounds[2] - rectBounds[0]) / MM_TO_PT, 0.5), 5, 200);
    var boxHeightMm = clamp(roundTo((rectBounds[1] - rectBounds[3]) / MM_TO_PT, 0.5), 2, 200);
    // 화살촉은 몸통 폭에 대한 비율이라 폭이 달라도 닮은꼴이 된다
    var headLengthPct = 60;
    var headScale = 160;
    var fontSize = 8;
    var valueHeightMm = 4;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var previewSignature = "";
    var textCache = {};                      // 이름 → 마지막으로 쓴 글자 (서체 재적용 최소화)

    applySavedSettings();

    var LABEL_WIDTH = 78;
    var SLIDER_WIDTH = 196;
    var SECTOR_SLIDER_HEIGHT = 34;
    var SECTOR_SLIDER_PAD = 8;
    var THUMB_HALF_WIDTH = 5;
    var THUMB_GRAB_RADIUS = 12;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "에너지 흐름 화살표");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var tabs = dlg.add("tabbedpanel");
    tabs.alignChildren = "fill";
    var contentTab = tabs.add("tab", undefined, "내용");
    contentTab.orientation = "column";
    contentTab.alignChildren = "fill";
    contentTab.spacing = 6;
    contentTab.margins = [10, 10, 10, 8];
    var shapeTab = tabs.add("tab", undefined, "모양");
    shapeTab.orientation = "column";
    shapeTab.alignChildren = "fill";
    shapeTab.spacing = 6;
    shapeTab.margins = [10, 10, 10, 8];
    tabs.selection = 0;

    // ---- 내용 탭 ----
    var boxPanel = addPanel(contentTab, "상자");
    var boxRow = boxPanel.add("group");
    boxRow.alignChildren = ["left", "center"];
    var boxNameLabel = boxRow.add("statictext", undefined, "이름:");
    boxNameLabel.preferredSize.width = 40;
    var boxNameInput = boxRow.add("edittext", undefined, boxName);
    boxNameInput.characters = 14;
    boxNameInput.helpTip = "/ 를 넣으면 줄이 바뀝니다";
    var boxValueLabel = boxRow.add("statictext", undefined, "값:");
    boxValueLabel.preferredSize.width = 28;
    var boxValueInput = boxRow.add("edittext", undefined, boxValue);
    boxValueInput.characters = 6;
    boxValueInput.justify = "right";
    boxValueInput.helpTip = "숫자를 넣으면 뒤에 이탤릭 E가 붙습니다 (100 → 100E)";
    boxRow.add("statictext", undefined, "E");

    var countPanel = addPanel(contentTab, "분할 수");
    var countRow = countPanel.add("group");
    countRow.alignChildren = ["left", "center"];
    countRow.spacing = 12;
    var countRadios = [];
    for (var cr = 2; cr <= MAX_ARROWS; cr++) {
        var countRadio = countRow.add("radiobutton", undefined, cr + "개");
        countRadio.value = (arrowCount === cr);
        countRadio.onClick = makeCountHandler(cr);
        countRadios.push(countRadio);
    }

    var sectorPanel = addPanel(contentTab, "항목 (왼쪽부터)");
    var sectorSlider = sectorPanel.add("customView");
    sectorSlider.alignment = ["fill", "top"];
    sectorSlider.preferredSize.height = SECTOR_SLIDER_HEIGHT;
    sectorSlider.onDraw = drawSectorSlider;
    var dragBoundary = -1;
    sectorSlider.addEventListener("mousedown", function(event) {
        dragBoundary = nearestBoundary(event.clientX);
        if (dragBoundary < 0) return;
        moveDraggedBoundary(event.clientX);
    });
    sectorSlider.addEventListener("mousemove", function(event) {
        if (dragBoundary < 0) return;
        moveDraggedBoundary(event.clientX);
    });
    sectorSlider.addEventListener("mouseup", function(event) {
        if (dragBoundary < 0) return;
        moveDraggedBoundary(event.clientX);
        dragBoundary = -1;
    });
    var itemRows = [];
    for (var s = 0; s < MAX_ARROWS; s++) itemRows.push(buildItemRow(sectorPanel, s));

    // ---- 모양 탭 ----
    var boxSizePanel = addPanel(shapeTab, "상자 크기");
    var boxWidthControls = addValueRow(boxSizePanel, "폭", "mm", boxWidthMm, 5, 200, 0.5, 1);
    var boxHeightControls = addValueRow(boxSizePanel, "높이", "mm", boxHeightMm, 2, 200, 0.5, 1);
    boxWidthControls.input.helpTip = boxWidthControls.slider.helpTip = "윗변 가운데를 고정하고 좌우로 늘어납니다";
    boxHeightControls.input.helpTip = boxHeightControls.slider.helpTip = "윗변을 고정하고 아래로 늘어납니다";

    var commonPanel = addPanel(shapeTab, "공통");
    var headLengthControls = addValueRow(commonPanel, "화살촉 길이", "%", headLengthPct, 10, 300, 5, 0);
    headLengthControls.input.helpTip = headLengthControls.slider.helpTip = "몸통 폭에 대한 화살촉 길이. 비율이라 화살표마다 화살촉이 닮은꼴이 됩니다";
    var headScaleControls = addValueRow(commonPanel, "화살촉 폭", "%", headScale, 100, 400, 5, 0);
    headScaleControls.input.helpTip = headScaleControls.slider.helpTip = "몸통 폭에 대한 화살촉 폭";
    var fontSizeControls = addValueRow(commonPanel, "글자 크기", "pt", fontSize, 4, 20, 0.5, 1);
    var valueHeightControls = addValueRow(commonPanel, "값 높이", "mm", valueHeightMm, 1, 50, 0.5, 1);
    valueHeightControls.input.helpTip = valueHeightControls.slider.helpTip = "상자 윗변에서 값 글자 가운데까지의 높이";

    var arrowTabs = shapeTab.add("tabbedpanel");
    arrowTabs.alignChildren = "fill";
    var arrowTabControls = [];
    for (var t = 0; t < MAX_ARROWS; t++) arrowTabControls.push(buildArrowTab(arrowTabs, t));
    arrowTabs.selection = 0;

    var positionPanel = addPanel(shapeTab, "위치 이동");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    // ---- 하단 ----
    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    boxNameInput.onChange = function() {
        boxName = cleanText(boxNameInput.text);
        updatePreview();
    };
    boxValueInput.onChange = function() {
        boxValue = cleanText(boxValueInput.text);
        syncSectorControls();
        updatePreview();
    };
    bindValueRow(boxWidthControls, function() { return boxWidthMm; }, function(v) { boxWidthMm = v; });
    bindValueRow(boxHeightControls, function() { return boxHeightMm; }, function(v) { boxHeightMm = v; });
    bindValueRow(headLengthControls, function() { return headLengthPct; }, function(v) { headLengthPct = v; });
    bindValueRow(headScaleControls, function() { return headScale; }, function(v) { headScale = v; });
    bindValueRow(fontSizeControls, function() { return fontSize; }, function(v) { fontSize = v; });
    bindValueRow(valueHeightControls, function() { return valueHeightMm; }, function(v) { valueHeightMm = v; });
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        saveSettings();
        dlg.close(1);
    };
    cancelButton.onClick = function() {
        dlg.close(0);
    };

    removeLeftoverPreviews();
    applyArrowCount(false);
    doc.selection = null;
    // 원본 사각형(굵은 선일 수 있음)은 미리보기 상자가 대신하므로 다이얼로그 동안 숨긴다
    try { sourceRect.hidden = true; } catch (hideError) {}
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();

    if (result === 1) {
        var finalGroup = finishPreview();
        if (finalGroup === null) {
            alert("도형을 만들지 못했습니다. 다시 실행해주세요.");
        } else {
            try { sourceRect.remove(); } catch (removeError) {}
            finalGroup.name = "Energy Flow";
            doc.selection = null;
            try { finalGroup.selected = true; } catch (selectError) {}
        }
    } else {
        clearPreview();
        try { sourceRect.hidden = false; } catch (unhideError) {}
        try { sourceRect.selected = true; } catch (reselectError) {}
    }
    app.redraw();

    // -------------------------------------------------------
    // 다이얼로그 조립
    // -------------------------------------------------------
    function buildItemRow(parent, index) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, "항목 " + (index + 1));
        label.preferredSize.width = 40;
        var nameInput = row.add("edittext", undefined, names[index]);
        nameInput.characters = 12;
        nameInput.helpTip = "/ 를 넣으면 줄이 바뀝니다";
        var valueInput = row.add("edittext", undefined, formatValue(index));
        valueInput.characters = 6;
        valueInput.justify = "right";
        row.add("statictext", undefined, "E");
        var unknownCheck = row.add("checkbox", undefined, "?로 표시");
        unknownCheck.value = unknown[index];

        nameInput.onChange = function() {
            names[index] = cleanText(nameInput.text);
            updatePreview();
        };
        // 값 입력은 그 항목의 오른쪽 경계를 옮기는 것과 같다. 마지막 항목은 왼쪽 경계를 옮긴다.
        valueInput.onChange = function() {
            var value = parseNumber(valueInput.text);
            var total = getBoxTotal();
            if (value !== null && total > 0) {
                var percent = value / total * 100;
                var boundaries = getBoundaries();
                if (index < arrowCount - 1) {
                    var left = index === 0 ? 0 : boundaries[index - 1];
                    setBoundary(index, left + percent);
                } else {
                    setBoundary(index - 1, 100 - percent);
                }
            }
            syncSectorControls();
            updatePreview();
        };
        unknownCheck.onClick = function() {
            unknown[index] = unknownCheck.value;
            updatePreview();
        };
        return {row: row, nameInput: nameInput, valueInput: valueInput, unknownCheck: unknownCheck};
    }

    function buildArrowTab(parent, index) {
        var a = arrows[index];
        var tab = parent.add("tab", undefined, "화살표 " + (index + 1));
        tab.orientation = "column";
        tab.alignChildren = "left";
        tab.spacing = 4;
        tab.margins = [10, 10, 10, 8];
        var rows = {};
        rows.angleDeg = addValueRow(tab, "각도", "°", a.angleDeg, 0, 90, 1, 0);
        rows.angleDeg.input.helpTip = rows.angleDeg.slider.helpTip = "0° = 12시 방향, 90° = 3시 방향. 첫 화살표는 0°, 마지막 화살표는 90° 고정";
        rows.bendMm = addValueRow(tab, "꺾임 높이", "mm", a.bendMm, 0, 100, 0.5, 1);
        rows.bendMm.input.helpTip = rows.bendMm.slider.helpTip = "상자 윗변에서 휘기 시작하는 높이. 곧은 화살표는 꺾임 높이 + 길이가 전체 높이";
        rows.lengthMm = addValueRow(tab, "길이", "mm", a.lengthMm, 0, 100, 0.5, 1);
        rows.lengthMm.input.helpTip = rows.lengthMm.slider.helpTip = "꺾인 뒤 화살촉까지 곧게 가는 길이";
        rows.radiusMm = addValueRow(tab, "꺾임 반지름", "mm", a.radiusMm, 0, 30, 0.5, 1);
        rows.radiusMm.input.helpTip = rows.radiusMm.slider.helpTip = "꺾이는 안쪽 모서리의 반지름. 바깥쪽은 여기에 몸통 폭이 더해집니다";
        rows.gray = addValueRow(tab, "음영", "K%", a.gray, 0, 100, 5, 0);
        for (var key in rows) {
            if (!rows.hasOwnProperty(key)) continue;
            bindValueRow(rows[key], makeGetter(index, key), makeSetter(index, key));
        }
        return {tab: tab, rows: rows};
    }

    function makeGetter(index, key) {
        return function() { return arrows[index][key]; };
    }

    function makeSetter(index, key) {
        return function(value) { arrows[index][key] = value; };
    }

    function makeCountHandler(count) {
        return function() {
            arrowCount = count;
            applyArrowCount(true);
            updatePreview();
        };
    }

    // 분할 수에 맞춰 각도를 0°~90°로 고르게 펴고, 남는 항목 행과 탭 비활성, 비율 재분배
    // resetAngles: 분할 수를 바꿀 때만 참. 시작할 때는 저장된 각도를 지키고 양 끝만 고정한다
    function applyArrowCount(resetAngles) {
        for (var d = 0; d < arrowCount; d++) {
            if (resetAngles) arrows[d].angleDeg = Math.round(90 * d / (arrowCount - 1));
        }
        arrows[0].angleDeg = 0;
        arrows[arrowCount - 1].angleDeg = 90;
        // 새로 켜진(0%) 항목에는 균등한 몫을 준 뒤 합을 100%로 맞춘다
        for (var e = 0; e < arrowCount; e++) {
            if (percents[e] < MIN_SECTOR_PERCENT) percents[e] = 100 / arrowCount;
        }
        var sum = 0;
        for (var i = 0; i < arrowCount; i++) sum += percents[i];
        for (var n = 0; n < arrowCount; n++) percents[n] = percents[n] * 100 / sum;
        for (var z = arrowCount; z < MAX_ARROWS; z++) percents[z] = 0;
        for (var k = 0; k < MAX_ARROWS; k++) {
            var on = k < arrowCount;
            itemRows[k].nameInput.enabled = on;
            itemRows[k].valueInput.enabled = on;
            itemRows[k].unknownCheck.enabled = on;
            var rows = arrowTabControls[k].rows;
            var angleFixed = (k === 0 || k === arrowCount - 1);
            rows.angleDeg.input.enabled = on && !angleFixed;
            rows.angleDeg.slider.enabled = on && !angleFixed;
            rows.angleDeg.input.text = formatNumber(arrows[k].angleDeg, 0);
            try { rows.angleDeg.slider.value = arrows[k].angleDeg; } catch (sliderError) {}
            rows.bendMm.input.enabled = rows.bendMm.slider.enabled = on;
            rows.lengthMm.input.enabled = rows.lengthMm.slider.enabled = on;
            rows.radiusMm.input.enabled = rows.radiusMm.slider.enabled = on;
            rows.gray.input.enabled = rows.gray.slider.enabled = on;
        }
        syncSectorControls();
    }

    // -------------------------------------------------------
    // 구간 슬라이더 (CellCycle과 같은 방식)
    // -------------------------------------------------------
    function getBoundaries() {
        var boundaries = [];
        var cumulative = 0;
        for (var i = 0; i < arrowCount - 1; i++) {
            cumulative += percents[i];
            boundaries.push(cumulative);
        }
        return boundaries;
    }

    function setBoundary(index, value) {
        var boundaries = getBoundaries();
        if (index < 0 || index >= boundaries.length) return;
        var lower = (index === 0 ? 0 : boundaries[index - 1]) + MIN_SECTOR_PERCENT;
        var upper = (index === boundaries.length - 1 ? 100 : boundaries[index + 1]) - MIN_SECTOR_PERCENT;
        if (lower > upper) return;
        boundaries[index] = clamp(value, lower, upper);
        var previous = 0;
        for (var i = 0; i < arrowCount; i++) {
            var next = i < boundaries.length ? boundaries[i] : 100;
            percents[i] = next - previous;
            previous = next;
        }
    }

    function sliderTrackRange() {
        return [SECTOR_SLIDER_PAD, sectorSlider.size.width - SECTOR_SLIDER_PAD];
    }

    function percentToX(percent) {
        var range = sliderTrackRange();
        return range[0] + (range[1] - range[0]) * percent / 100;
    }

    function xToPercent(x) {
        var range = sliderTrackRange();
        return (x - range[0]) / (range[1] - range[0]) * 100;
    }

    function nearestBoundary(x) {
        var boundaries = getBoundaries();
        var best = -1;
        var bestDistance = THUMB_GRAB_RADIUS;
        for (var i = 0; i < boundaries.length; i++) {
            var distance = Math.abs(percentToX(boundaries[i]) - x);
            if (distance <= bestDistance) {
                best = i;
                bestDistance = distance;
            }
        }
        return best;
    }

    function moveDraggedBoundary(x) {
        setBoundary(dragBoundary, roundTo(xToPercent(x), SECTOR_DRAG_STEP));
        syncSectorControls();
        updatePreview();
    }

    function syncSectorControls() {
        for (var i = 0; i < MAX_ARROWS; i++) {
            itemRows[i].valueInput.text = i < arrowCount ? formatValue(i) : "";
        }
        try { sectorSlider.notify("onDraw"); } catch (e) {}
    }

    function drawSectorSlider() {
        var g = this.graphics;
        var width = this.size.width;
        var height = this.size.height;
        var range = [SECTOR_SLIDER_PAD, width - SECTOR_SLIDER_PAD];
        var trackTop = 6;
        var trackHeight = height - 12;
        var textPen = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
        var font = g.font;
        var boundaries = getBoundaries();

        var previousX = range[0];
        for (var i = 0; i < arrowCount; i++) {
            var nextX = i < boundaries.length ? percentToX(boundaries[i]) : range[1];
            var level = 0.7 - 0.5 * (arrows[i].gray / 100);
            g.newPath();
            g.rectPath(previousX, trackTop, nextX - previousX, trackHeight);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [level, level, level, 1]));
            var label = formatValue(i);
            var labelSize = g.measureString(label, font);
            if (labelSize[0] + 4 < nextX - previousX) {
                g.drawString(label, textPen,
                    previousX + (nextX - previousX - labelSize[0]) / 2,
                    trackTop + (trackHeight - labelSize[1]) / 2, font);
            }
            previousX = nextX;
        }

        var thumbBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
        var thumbPen = g.newPen(g.PenType.SOLID_COLOR, [0.15, 0.15, 0.15, 1], 1);
        for (var k = 0; k < boundaries.length; k++) {
            var x = percentToX(boundaries[k]);
            g.newPath();
            g.rectPath(x - THUMB_HALF_WIDTH, 1, THUMB_HALF_WIDTH * 2, height - 2);
            g.fillPath(thumbBrush);
            g.strokePath(thumbPen);
        }
    }

    // -------------------------------------------------------
    // 값 · 글자
    // -------------------------------------------------------
    function getBoxTotal() {
        var value = parseNumber(boxValue);
        return value === null ? 0 : value;
    }

    // 항목 값 = 상자 값 × 비율. 소수 둘째 자리까지, 끝의 0은 지운다
    function formatValue(index) {
        var total = getBoxTotal();
        return trimNumber(total * percents[index] / 100);
    }

    function trimNumber(value) {
        var text = formatNumber(value, 2);
        return text.replace(/\.?0+$/, "");
    }

    // 숫자면 뒤에 E를 붙이고(E는 이탤릭), 아니면 그대로 쓴다. italicFrom: 이탤릭으로 바꿀 첫 글자 위치
    function valueLabel(text) {
        var value = parseNumber(text);
        if (value === null || String(text).replace(/\s/g, "") === "") return {contents: text, italicFrom: -1};
        var shown = trimNumber(value);
        return {contents: shown + "E", italicFrom: shown.length};
    }

    function cleanText(text) {
        return String(text).replace(/\|/g, "/");
    }

    // "/"는 줄바꿈
    function toLines(text) {
        return String(text).replace(/\//g, "\r");
    }

    // 글자 단위 서체 규칙: 한글·공백 Spoqa, 그 외 GSMediumB1(+0.5pt). italicFrom 이후 글자는 이탤릭
    function applyFontRule(frame, size, italicFrom) {
        for (var i = 0; i < frame.characters.length; i++) {
            var character = frame.characters[i];
            var text = character.contents;
            var code = text.charCodeAt(0);
            var isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
            var isSpace = (text === " " || code === 32 || code === 160);
            if (isKorean || isSpace) {
                applyFontToRange(character, korFont, size, 0);
            } else if (italicFrom >= 0 && i >= italicFrom) {
                applyFontToRange(character, italicFont, size, 0.5);
            } else {
                applyFontToRange(character, engFont, size, 0.5);
            }
        }
        try { frame.textRange.paragraphAttributes.justification = Justification.CENTER; } catch (e) {}
    }

    function applyFontToRange(range, font, size, baselineShift) {
        try { range.characterAttributes.size = size; } catch (e) {}
        try { range.characterAttributes.textFont = font; } catch (e2) {}
        try { range.characterAttributes.baselineShift = baselineShift; } catch (e3) {}
    }

    // 글자는 한 번 만든 뒤 contents만 갱신한다 (재생성을 되풀이하면 개체 참조가 깨진다)
    function writeText(frame, key, contents, italicFrom, size, x, y) {
        var cacheKey = contents + "|" + italicFrom + "|" + size;
        if (textCache[key] !== cacheKey) {
            frame.contents = contents;
            applyFontRule(frame, size, italicFrom);
            textCache[key] = cacheKey;
        }
        var bounds = frame.geometricBounds;
        var width = bounds[2] - bounds[0];
        var height = bounds[1] - bounds[3];
        frame.translate(x - width / 2 - bounds[0], y + height / 2 - bounds[1]);
    }

    function getFont(name) {
        try {
            return app.textFonts.getByName(name);
        } catch (e) {
            return app.textFonts[0];
        }
    }

    // -------------------------------------------------------
    // 기하
    // -------------------------------------------------------
    // 화살표 하나의 윤곽. 밑변 [xa, xb] × top 에서 출발해 bend 만큼 오르고,
    // 안쪽 반지름 r 의 동심 원호로 angle(라디안, 시계 방향)만큼 돈 뒤 length 만큼 곧게 가서 화살촉.
    // 왼쪽 밑에서 시계 방향으로 도는 점 목록 {anchor, left, right}.
    function arrowOutline(xa, xb, top, angle, bend, length, r, headLengthRatio, headWidthRatio) {
        var w = xb - xa;
        var headLength = w * headLengthRatio;
        var d = [Math.sin(angle), Math.cos(angle)];          // 꺾인 뒤 진행 방향
        var n = [-Math.cos(angle), Math.sin(angle)];         // 진행 방향의 왼쪽
        var cx = xb + r;
        var cy = top + bend;
        var points = [];
        var outerEnd, innerEnd;

        points.push(cornerPoint([xa, top]));
        if (angle > 1e-6) {
            var outerArc = arcPoints(cx, cy, r + w, Math.PI, -angle);
            appendArc(points, outerArc);
            outerEnd = outerArc[outerArc.length - 1].anchor;
        } else {
            points.push(cornerPoint([xa, cy]));
            outerEnd = [xa, cy];
        }
        var outerTip = [outerEnd[0] + d[0] * length, outerEnd[1] + d[1] * length];
        var innerStart = [cx - r * Math.cos(angle), cy + r * Math.sin(angle)];
        var innerTip = [innerStart[0] + d[0] * length, innerStart[1] + d[1] * length];
        var extra = w * (headWidthRatio - 1) / 2;
        var mid = [(outerTip[0] + innerTip[0]) / 2, (outerTip[1] + innerTip[1]) / 2];

        points.push(cornerPoint(outerTip));
        points.push(cornerPoint([outerTip[0] + n[0] * extra, outerTip[1] + n[1] * extra]));
        points.push(cornerPoint([mid[0] + d[0] * headLength, mid[1] + d[1] * headLength]));
        points.push(cornerPoint([innerTip[0] - n[0] * extra, innerTip[1] - n[1] * extra]));
        points.push(cornerPoint(innerTip));
        if (angle > 1e-6) {
            appendArc(points, arcPoints(cx, cy, r, Math.PI - angle, angle));
        } else {
            points.push(cornerPoint([xb, cy]));
        }
        points.push(cornerPoint([xb, top]));
        return points;
    }

    function cornerPoint(anchor) {
        return {anchor: anchor, left: anchor, right: anchor};
    }

    // 원호 양 끝은 직선과 만나므로 바깥쪽 핸들을 앵커에 붙인다
    function appendArc(points, arc) {
        arc[0].left = arc[0].anchor;
        arc[arc.length - 1].right = arc[arc.length - 1].anchor;
        for (var i = 0; i < arc.length; i++) points.push(arc[i]);
    }

    // 90°마다 나눈 베지어 호. 부호가 있는 sweep이 진행 방향(음수 = 시계 방향)
    function arcPoints(cx, cy, radius, startAngle, sweep) {
        var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 0.000001));
        var step = sweep / count;
        var handleScale = 4 / 3 * Math.tan(step / 4);
        var points = [];
        for (var i = 0; i <= count; i++) {
            var angle = startAngle + step * i;
            var anchor = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
            var tangent = [-radius * Math.sin(angle) * handleScale, radius * Math.cos(angle) * handleScale];
            points.push({
                anchor: anchor,
                left: [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: [anchor[0] + tangent[0], anchor[1] + tangent[1]]
            });
        }
        return points;
    }

    // 항목 이름 자리: 꺾인 뒤 곧은 구간의 가운데
    function arrowLabelCenter(xa, xb, top, angle, bend, length, r) {
        var w = xb - xa;
        var cx = xb + r;
        var cy = top + bend;
        var mid = r + w / 2;
        var start = [cx - mid * Math.cos(angle), cy + mid * Math.sin(angle)];
        return [start[0] + Math.sin(angle) * length / 2, start[1] + Math.cos(angle) * length / 2];
    }

    // 화살표마다 [xa, xb]. 켜진 항목 비율로 상자 폭을 나눈다
    function arrowSpans(left, right, count, ratios) {
        var total = 0;
        for (var i = 0; i < count; i++) total += ratios[i];
        var spans = [];
        var cumulative = 0;
        for (var k = 0; k < count; k++) {
            var xa = left + (right - left) * (total > 0 ? cumulative / total : k / count);
            cumulative += ratios[k];
            var xb = left + (right - left) * (total > 0 ? cumulative / total : (k + 1) / count);
            spans.push([xa, xb]);
        }
        return spans;
    }

    // -------------------------------------------------------
    // 미리보기 (부품은 한 번 만들고 앵커·글자만 덮어쓴다)
    // -------------------------------------------------------
    function updatePreview() {
        if (!previewEnabled) {
            clearPreview();
            app.redraw();
            return;
        }
        var signature = previewParts().join("|");
        if (previewGroup !== null && signature === previewSignature) return;
        try {
            if (previewGroup === null) previewGroup = createParts();
            writeParts(previewGroup);
            previewSignature = signature;
        } catch (e) {
            // 간헐적 DOM 오류: 부품을 버리고 다음 조작에서 처음부터 다시 만든다
            clearPreview();
            removeLeftoverPreviews();
        }
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
        previewSignature = "";
        textCache = {};
    }

    function removeLeftoverPreviews() {
        for (var i = doc.groupItems.length - 1; i >= 0; i--) {
            try {
                if (doc.groupItems[i].name === PREVIEW_NAME) doc.groupItems[i].remove();
            } catch (e) {}
        }
    }

    // 확인: 미리보기가 그대로 결과. 미리보기가 없으면 새로 만들고, 안 쓰는 부품은 지운다
    function finishPreview() {
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                if (previewGroup === null) {
                    previewGroup = createParts();
                    writeParts(previewGroup);
                }
                var group = previewGroup;
                var parts = readParts(group);
                for (var i = arrowCount; i < MAX_ARROWS; i++) {
                    try { parts["arrow" + i].remove(); } catch (e1) {}
                    try { parts["name" + i].remove(); } catch (e2) {}
                    try { parts["value" + i].remove(); } catch (e3) {}
                }
                previewGroup = null;
                return group;
            } catch (e) {
                clearPreview();
                removeLeftoverPreviews();
                try { $.sleep(100); app.redraw(); } catch (redrawError) {}
            }
        }
        return null;
    }

    // 상자 1 + 상자 글자 2 + 화살표 4 + 이름 4 + 값 4. 화살표는 왼쪽이 위에 오도록 역순으로 만든다
    function createParts() {
        var group = doc.groupItems.add();
        group.name = PREVIEW_NAME;
        var black = makeGray(100);
        var box = group.pathItems.add();
        box.name = "box";
        styleOutline(box, black);
        box.filled = true;
        box.fillColor = makeGray(0);
        for (var i = MAX_ARROWS - 1; i >= 0; i--) {
            var arrow = group.pathItems.add();
            arrow.name = "arrow" + i;
            styleOutline(arrow, black);
            arrow.filled = true;
        }
        var boxNameFrame = group.textFrames.add();
        boxNameFrame.name = "boxName";
        var boxValueFrame = group.textFrames.add();
        boxValueFrame.name = "boxValue";
        for (var t = 0; t < MAX_ARROWS; t++) {
            var nameFrame = group.textFrames.add();
            nameFrame.name = "name" + t;
            var valueFrame = group.textFrames.add();
            valueFrame.name = "value" + t;
        }
        return group;
    }

    function readParts(group) {
        var parts = {};
        for (var i = 0; i < group.pageItems.length; i++) {
            var item = group.pageItems[i];
            parts[item.name] = item;
        }
        return parts;
    }

    function writeParts(group) {
        var parts = readParts(group);
        var dx = offsetXmm * MM_TO_PT;
        var dy = offsetYmm * MM_TO_PT;
        var left = boxTopCenterX - boxWidthMm * MM_TO_PT / 2 + dx;
        var right = boxTopCenterX + boxWidthMm * MM_TO_PT / 2 + dx;
        var top = boxTopY + dy;
        var bottom = top - boxHeightMm * MM_TO_PT;

        writePath(parts.box, [cornerPoint([left, top]), cornerPoint([right, top]),
            cornerPoint([right, bottom]), cornerPoint([left, bottom])]);
        // 상자 글자: 이름 줄(들) 위, 값 줄 아래. 전체가 상자 가운데에 오도록 이름 줄 수만큼 나눈다
        var boxLabel = valueLabel(boxValue);
        var lineGap = fontSize * 1.3;
        var nameLines = toLines(boxName).split("\r").length;
        var boxCenterY = (top + bottom) / 2;
        writeText(parts.boxName, "boxName", toLines(boxName), -1, fontSize,
            (left + right) / 2, boxCenterY + lineGap / 2);
        writeText(parts.boxValue, "boxValue", boxLabel.contents, boxLabel.italicFrom, fontSize,
            (left + right) / 2, boxCenterY - lineGap * nameLines / 2);

        var spans = arrowSpans(left, right, arrowCount, percents);
        for (var i = 0; i < MAX_ARROWS; i++) {
            var arrow = parts["arrow" + i];
            var nameFrame = parts["name" + i];
            var valueFrame = parts["value" + i];
            var on = i < arrowCount;
            arrow.hidden = !on;
            nameFrame.hidden = !on;
            valueFrame.hidden = !on;
            if (!on) continue;
            var a = arrows[i];
            var angle = a.angleDeg * Math.PI / 180;
            var bend = a.bendMm * MM_TO_PT;
            var length = a.lengthMm * MM_TO_PT;
            var r = a.radiusMm * MM_TO_PT;
            var xa = spans[i][0];
            var xb = spans[i][1];
            writePath(arrow, arrowOutline(xa, xb, top, angle, bend, length, r, headLengthPct / 100, headScale / 100));
            setFillGray(arrow, a.gray);
            var labelCenter = arrowLabelCenter(xa, xb, top, angle, bend, length, r);
            writeText(nameFrame, "name" + i, toLines(names[i]), -1, fontSize, labelCenter[0], labelCenter[1]);
            var label = unknown[i] ? {contents: "?", italicFrom: -1} : valueLabel(formatValue(i));
            writeText(valueFrame, "value" + i, label.contents, label.italicFrom, fontSize,
                (xa + xb) / 2, top + valueHeightMm * MM_TO_PT);
        }
    }

    function writePath(path, points) {
        for (var i = 0; i < points.length; i++) {
            var point = i < path.pathPoints.length ? path.pathPoints[i] : path.pathPoints.add();
            point.anchor = points[i].anchor;
            point.leftDirection = points[i].left;
            point.rightDirection = points[i].right;
            point.pointType = PointType.CORNER;
        }
        for (var k = path.pathPoints.length - 1; k >= points.length; k--) {
            try { path.pathPoints[k].remove(); } catch (e) {}
        }
        path.closed = true;
    }

    function styleOutline(path, color) {
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = LINE_WIDTH_PT;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
        path.strokeDashes = [];
    }

    function setFillGray(path, gray) {
        var key = "fill:" + path.name;
        if (textCache[key] === gray) return;
        path.fillColor = makeGray(gray);
        textCache[key] = gray;
    }

    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var rgb = new RGBColor();
        var level = Math.round(255 * (100 - k) / 100);
        rgb.red = level;
        rgb.green = level;
        rgb.blue = level;
        return rgb;
    }

    // -------------------------------------------------------
    // 다이얼로그 도우미
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨(단위 병기) · 입력칸 · 스크롤바 를 한 줄에 배치
    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "right";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {
            row: row, input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    // 위치 변경은 부품을 다시 쓰지 않고 미리보기 그룹만 이동한다
    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (previewGroup === null || delta === 0) {
                updatePreview();
                return;
            }
            try {
                previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
                previewSignature = previewParts().join("|");
            } catch (moveError) {
                updatePreview();
                return;
            }
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
        var value = parseFloat(String(text).replace(/[^0-9.\-]/g, ""));
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
    // 옵션 저장
    // -------------------------------------------------------
    function settingsParts() {
        var parts = ["v3", boxName, boxValue, arrowCount];
        for (var i = 0; i < MAX_ARROWS; i++) parts.push(percents[i]);
        for (var n = 0; n < MAX_ARROWS; n++) parts.push(names[n]);
        for (var u = 0; u < MAX_ARROWS; u++) parts.push(unknown[u] ? 1 : 0);
        for (var a = 0; a < MAX_ARROWS; a++) {
            for (var k = 0; k < ARROW_KEYS.length; k++) parts.push(arrows[a][ARROW_KEYS[k]]);
        }
        parts.push(headLengthPct, headScale, fontSize, valueHeightMm, offsetXmm, offsetYmm);
        return parts;
    }

    // 미리보기 갱신 판단용. 저장하지 않는 상자 크기까지 넣는다
    function previewParts() {
        return settingsParts().concat([boxWidthMm, boxHeightMm]);
    }

    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, settingsParts().join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        var expected = 4 + MAX_ARROWS * 3 + MAX_ARROWS * ARROW_KEYS.length + 6;
        if (p[0] !== "v3" || p.length !== expected) return;
        boxName = p[1];
        boxValue = p[2];
        arrowCount = Math.round(restoreNumber(p[3], arrowCount, 2, MAX_ARROWS));
        var index = 4;
        for (var i = 0; i < MAX_ARROWS; i++) percents[i] = restoreNumber(p[index++], percents[i], 0, 100);
        for (var n = 0; n < MAX_ARROWS; n++) names[n] = p[index++];
        for (var u = 0; u < MAX_ARROWS; u++) unknown[u] = (p[index++] === "1");
        for (var a = 0; a < MAX_ARROWS; a++) {
            for (var k = 0; k < ARROW_KEYS.length; k++) {
                var key = ARROW_KEYS[k];
                arrows[a][key] = restoreNumber(p[index++], arrows[a][key], RANGES[key][0], RANGES[key][1]);
            }
        }
        headLengthPct = restoreNumber(p[index++], headLengthPct, 10, 300);
        headScale = restoreNumber(p[index++], headScale, 100, 400);
        fontSize = restoreNumber(p[index++], fontSize, 4, 20);
        valueHeightMm = restoreNumber(p[index++], valueHeightMm, 1, 50);
        offsetXmm = restoreNumber(p[index++], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[index++], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
