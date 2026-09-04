#include "Object_expand_arrow_helper.jsxinc"
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_Meiosis.jsx
  기능: 선택한 사각형을 비계 삼아 감수 분열 과정(G1기 → 중기 1 → 중기 2 → 딸세포 → 정자)을 그린다.
    - 사각형은 시작 크기만 정한다. 간격을 바꾸면 사각형 밖으로 나가도 된다.
    - 딸세포 4개는 사각형 가로 중심을 기준으로 등간격, 처음에는 좌우 끝이 사각형에 닿는다.
    - 위 단계의 원은 자기 딸세포 두 개의 중점 위로 따라온다.
    - 줄 사이 세로 간격은 넷(G1→중기 1, 중기 1→중기 2, 중기 2→딸세포, 딸세포→정자)을 따로 조절한다.
    - 화살표는 두 원의 중심을 잇는 선 위에 놓이고 양쪽 원에서 일정 거리만큼 떨어진다.
    - 정자는 딸세포 아래에 하나씩. 머리는 앞이 좁은 달걀꼴(흰 면 + 테두리), 꼬리는 시작 두께에서
      0까지 가늘어지는 물결 모양의 면이다 (획 두께로는 낼 수 없어 윤곽을 직접 계산한다).
      머리 중심을 축으로 회전할 수 있다.
  사용법: 그림이 들어갈 사각형 하나를 선택한 뒤 실행. 사각형은 확인 시 삭제된다.
*/

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
    if (sel.length !== 1 || sel[0].typename !== "PathItem") {
        alert("그림이 들어갈 사각형 하나를 선택해주세요.\n\n" +
            "사각형의 좌우 폭이 맨 아래 네 세포의 배치를, 높이가 세로 간격의 초기값을 정합니다.");
        return;
    }

    var MM_TO_PT = 2.834645669;
    var CIRCLE_WIDTH_PT = 0.4;
    var ARROW_WIDTH_PT = 0.3;
    var LEVEL_NAMES = ["G1기", "중기 1", "중기 2", "딸세포"];
    var GAP_NAMES = ["G1 → 중기 1", "중기 1 → 중기 2", "중기 2 → 딸세포", "딸세포 → 정자"];
    var POSITION_LIMIT_MM = 200;
    // 정자 꼬리: 아래로 내려가며 좌우로 물결치는 S자. 1.25번 흔들려 끝이 시작과 같은 쪽을 향한다.
    var TAIL_WAVES = 1.25;
    var TAIL_SAMPLES = 24;             // 한쪽 윤곽의 표본 수. 베지어 핸들을 붙이므로 이 정도로 매끈하다
    // 머리는 달걀꼴: 앞(위)이 좁고 뒤(꼬리 쪽)가 넓다. 앞 끝 폭 = (1 - HEAD_TAPER) × 뒤 끝 폭.
    var HEAD_TAPER = 0.35;
    var HEAD_SAMPLES = 24;
    // 화살표 이름은 Illustrator UI 언어를 따른다 (한국어판 기준)
    var ARROW_NAME_KO = "화살표 1";
    var ARROW_NAME_EN = "Arrow 1";
    var PREF_KEY = "ObjectMeiosis/settings";
    var PREVIEW_NAME = "Meiosis Preview";

    var rect = sel[0];
    var bounds = rect.geometricBounds;   // [left, top, right, bottom]
    var rectWasHidden = rect.hidden;
    // 비율 저장·복원의 기준. 0이면 나눗셈이 터지므로 1pt로 받친다.
    var rectWidthPt = Math.max(1, bounds[2] - bounds[0]);
    var rectHeightPt = Math.max(1, bounds[1] - bounds[3]);

    var diametersMm = [14, 14, 10, 7];
    var arrowGapMm = 0.5;
    var arrowScale = 100;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var showSperm = true;
    var headWidthMm = 2.5;
    var headHeightMm = 3.5;
    var tailLengthMm = 6;
    var tailWidthPt = 0.7;             // 꼬리 시작 두께. 끝은 0으로 가늘어진다
    var waveAmpMm = 0.8;               // 꼬리가 좌우로 흔들리는 폭(중심선 기준 편차)
    var spermRotationDeg = 0;          // 머리 중심 기준 회전. +는 시계 반대 방향
    var previewEnabled = true;
    var previewGroup = null;
    var previewSignature = "";
    // 간격·위치는 사각형에 대한 비율로 저장한다. 사각형은 이번 그림의 비계이므로
    // mm 값을 그대로 되살리면 엉뚱한 크기로 시작하지만, 비율은 새 사각형에 비례해 따라온다.
    // null이면 저장값이 없어 사각형에서 초기값을 잡는다.
    var gapRatios = null;          // 줄 간격 ÷ 사각형 높이 (4개)
    var daughterStepRatio = null;  // 딸세포 중심 거리 ÷ 사각형 폭
    var offsetXRatio = 0;          // 가로 이동 ÷ 사각형 폭
    var offsetYRatio = 0;          // 세로 이동 ÷ 사각형 높이

    applySavedSettings();

    // 처음에는 맨 위 원의 위 끝과 맨 아래(정자 꼬리 끝 또는 딸세포 아래 끝)가 사각형에 닿게 줄을 나눈다
    var startGapMm = clamp(defaultGapPt(bounds, getRadii()[0], bottomExtentPt(), showSperm ? 4 : 3) / MM_TO_PT, 1, 300);
    var gapsMm = [startGapMm, startGapMm, startGapMm, startGapMm];
    if (gapRatios !== null) {
        for (var gi = 0; gi < gapsMm.length; gi++) {
            gapsMm[gi] = clamp(roundTo(gapRatios[gi] * rectHeightPt / MM_TO_PT, 0.5), 1, 300);
        }
    }
    var daughterStepMm = clamp(defaultDaughterStepPt(bounds, getRadii()) / MM_TO_PT, 0.5, 300);
    if (daughterStepRatio !== null) {
        daughterStepMm = clamp(roundTo(daughterStepRatio * rectWidthPt / MM_TO_PT, 0.5), 0.5, 300);
    }
    offsetXmm = clamp(roundTo(offsetXRatio * rectWidthPt / MM_TO_PT, 0.1), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    offsetYmm = clamp(roundTo(offsetYRatio * rectHeightPt / MM_TO_PT, 0.1), -POSITION_LIMIT_MM, POSITION_LIMIT_MM);

    // 작업 영역을 덜 가리도록 좁게 잡는다. 단위는 줄마다 쓰지 않고 패널 제목·라벨에 넣는다.
    var LABEL_WIDTH = 92;
    var INPUT_CHARACTERS = 5;          // "-200.0"까지는 스크롤되지만 보통 값은 다 보인다
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 100;

    var dlg = new Window("dialog", "감수 분열");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    // 1280×800 화면에 들어가도록 두 열로 나눈다 (한 열이면 800px를 넘는다)
    var columns = dlg.add("group");
    columns.orientation = "row";
    columns.alignChildren = ["fill", "top"];
    columns.spacing = 8;
    var leftColumn = addColumn(columns);
    var rightColumn = addColumn(columns);

    var gapPanel = addPanel(leftColumn, "간격 · 위치 (중심 사이, mm)");
    var gapControls = [];
    for (var g = 0; g < GAP_NAMES.length; g++) {
        gapControls.push(addValueRow(gapPanel, GAP_NAMES[g], gapsMm[g], 1, 300, 0.5, 1));
    }
    var daughterStepControls = addValueRow(gapPanel, "딸세포 사이", daughterStepMm, 0.5, 300, 0.5, 1);
    var offsetXControls = addValueRow(gapPanel, "전체 가로 이동", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(gapPanel, "전체 세로 이동", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var sizePanel = addPanel(leftColumn, "세포 지름 (mm)");
    var diameterControls = [];
    for (var i = 0; i < LEVEL_NAMES.length; i++) {
        diameterControls.push(addValueRow(sizePanel, LEVEL_NAMES[i], diametersMm[i], 1, 100, 0.5, 1));
    }

    var arrowPanel = addPanel(rightColumn, "화살표");
    var arrowGapControls = addValueRow(arrowPanel, "원과의 간격 mm", arrowGapMm, 0, 10, 0.1, 1);
    var arrowScaleControls = addValueRow(arrowPanel, "화살촉 크기 %", arrowScale, 10, 800, 5, 0);

    var spermPanel = addPanel(rightColumn, "정자 (mm)");
    var spermCheck = spermPanel.add("checkbox", undefined, "정자 그리기");
    spermCheck.value = showSperm;
    var headWidthControls = addValueRow(spermPanel, "머리 폭", headWidthMm, 0.5, 20, 0.1, 1);
    var headHeightControls = addValueRow(spermPanel, "머리 높이", headHeightMm, 0.5, 20, 0.1, 1);
    var tailLengthControls = addValueRow(spermPanel, "꼬리 길이", tailLengthMm, 0.5, 50, 0.5, 1);
    var tailWidthControls = addValueRow(spermPanel, "꼬리 두께 pt", tailWidthPt, 0.1, 5, 0.1, 1);
    var waveAmpControls = addValueRow(spermPanel, "물결 폭", waveAmpMm, 0, 10, 0.1, 1);
    var rotationControls = addValueRow(spermPanel, "회전 °", spermRotationDeg, -180, 180, 1, 0);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    for (var v = 0; v < gapControls.length; v++) {
        bindValueRow(gapControls[v], makeArrayGetter(gapsMm, v), makeArraySetter(gapsMm, v));
    }
    bindValueRow(daughterStepControls,
        function() { return daughterStepMm; },
        function(value) { daughterStepMm = value; });
    bindPositionRow(offsetXControls,
        function() { return offsetXmm; },
        function(value) { offsetXmm = value; });
    bindPositionRow(offsetYControls,
        function() { return offsetYmm; },
        function(value) { offsetYmm = value; });
    for (var b = 0; b < diameterControls.length; b++) {
        bindValueRow(diameterControls[b], makeArrayGetter(diametersMm, b), makeArraySetter(diametersMm, b));
    }
    bindValueRow(arrowGapControls,
        function() { return arrowGapMm; },
        function(value) { arrowGapMm = value; });
    bindValueRow(arrowScaleControls,
        function() { return arrowScale; },
        function(value) { arrowScale = value; });
    bindValueRow(headWidthControls,
        function() { return headWidthMm; },
        function(value) { headWidthMm = value; });
    bindValueRow(headHeightControls,
        function() { return headHeightMm; },
        function(value) { headHeightMm = value; });
    bindValueRow(tailLengthControls,
        function() { return tailLengthMm; },
        function(value) { tailLengthMm = value; });
    bindValueRow(tailWidthControls,
        function() { return tailWidthPt; },
        function(value) { tailWidthPt = value; });
    bindValueRow(waveAmpControls,
        function() { return waveAmpMm; },
        function(value) { waveAmpMm = value; });
    bindValueRow(rotationControls,
        function() { return spermRotationDeg; },
        function(value) { spermRotationDeg = value; });

    spermCheck.onClick = function() {
        showSperm = spermCheck.value;
        updatePreview(true);
    };

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
    rect.hidden = true;
    rect.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = tryBuildDiagram(2);
        finalGroup.name = "Meiosis";
        try { rect.remove(); } catch (removeError) {}
        doc.selection = null;
        try { finalGroup.selected = true; } catch (selectError) {}
    } else {
        rect.hidden = rectWasHidden;
    }
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    // 화살촉은 액션으로만 붙일 수 있어 느리다. 슬라이더를 끄는 동안(withArrowheads=false)은
    // 몸통만 보여주고, 손을 뗀 순간 화살촉까지 그린다.
    function updatePreview(withArrowheads) {
        if (!previewEnabled) {
            clearPreview();
            app.redraw();
            return;
        }
        var lightweight = (withArrowheads === false);
        var signature = previewSettingsKey(lightweight);
        if (previewGroup !== null && signature === previewSignature) return;
        clearPreview();
        try {
            previewGroup = buildDiagram(!lightweight);
            previewGroup.name = PREVIEW_NAME;
            previewSignature = signature;
        } catch (e) {
            // 일시적 DOM 오류: 다음 조작에서 다시 그려지므로 경고 없이 넘어간다
            previewGroup = null;
        }
        app.redraw();
    }

    function previewSettingsKey(lightweight) {
        return [lightweight ? 1 : 0, gapsMm.join(","), daughterStepMm, arrowGapMm, arrowScale,
            offsetXmm, offsetYmm, diametersMm.join(","), showSperm ? 1 : 0,
            headWidthMm, headHeightMm, tailLengthMm, tailWidthPt, waveAmpMm, spermRotationDeg].join("|");
    }

    // 위치 이동은 도형을 다시 만들지 않고 현재 미리보기 그룹만 옮긴다
    function movePreviewGroup(group, previousXmm, previousYmm, nextXmm, nextYmm) {
        if (group === null) return true;
        var deltaX = (nextXmm - previousXmm) * MM_TO_PT;
        var deltaY = (nextYmm - previousYmm) * MM_TO_PT;
        if (deltaX === 0 && deltaY === 0) return true;
        try {
            group.translate(deltaX, deltaY);
            return true;
        } catch (e) {
            return false;
        }
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // 이전 실행이 오류로 중단되며 남긴 미리보기를 정리한다 (이름이 고유해 안전)
    function removeLeftoverPreviews() {
        for (var i = doc.groupItems.length - 1; i >= 0; i--) {
            try {
                if (doc.groupItems[i].name === PREVIEW_NAME) doc.groupItems[i].remove();
            } catch (e) {}
        }
    }

    // 최종 생성도 간헐적인 DOM 오류를 만날 수 있어 redraw로 상태를 정리한 뒤 한 번 더 시도한다
    function tryBuildDiagram(attempts) {
        var lastError = null;
        for (var attempt = 0; attempt < attempts; attempt++) {
            try {
                return buildDiagram(true);
            } catch (e) {
                lastError = e;
                try { $.sleep(100); app.redraw(); } catch (redrawError) {}
            }
        }
        throw lastError;
    }

    // -------------------------------------------------------
    // 도형 생성
    // -------------------------------------------------------
    function buildDiagram(withArrowheads) {
        var group = doc.groupItems.add();
        try {
            drawDiagram(group, withArrowheads);
        } catch (e) {
            try { group.remove(); } catch (removeError) {}
            throw e;
        }
        return group;
    }

    function drawDiagram(group, withArrowheads) {
        var rows = layoutCells(bounds, getRadii(), toPoints(gapsMm), daughterStepMm * MM_TO_PT,
            [offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT]);
        var black = makeBlackColor();
        var gapPt = arrowGapMm * MM_TO_PT;
        var arrows = [];

        for (var level = 0; level < rows.length; level++) {
            for (var i = 0; i < rows[level].length; i++) {
                var cell = rows[level][i];
                var circle = group.pathItems.ellipse(cell.y + cell.r, cell.x - cell.r, cell.r * 2, cell.r * 2);
                applyOutline(circle, black, CIRCLE_WIDTH_PT);
            }
        }

        for (var parentLevel = 0; parentLevel < rows.length - 1; parentLevel++) {
            var parents = rows[parentLevel];
            var children = rows[parentLevel + 1];
            var perParent = children.length / parents.length;
            for (var p = 0; p < parents.length; p++) {
                for (var c = 0; c < perParent; c++) {
                    var segment = arrowSegment(parents[p], children[p * perParent + c], gapPt);
                    if (segment === null) continue;
                    var arrow = group.pathItems.add();
                    arrow.setEntirePath(segment);
                    applyOutline(arrow, black, ARROW_WIDTH_PT);
                    arrows.push(arrow);
                }
            }
        }

        if (showSperm) {
            var daughters = rows[rows.length - 1];
            var headW = headWidthMm * MM_TO_PT;
            var headH = headHeightMm * MM_TO_PT;
            for (var s = 0; s < daughters.length; s++) {
                var headX = daughters[s].x;
                var headY = daughters[s].y - gapsMm[3] * MM_TO_PT;
                // 화살표는 세로로 내려와 머리 윤곽에 닿는다. 회전한 달걀꼴은 원이 아니므로
                // 중심에서 윤곽까지의 거리를 실제 윤곽에서 재어 화살표 간격이 원과 같게 유지되도록 한다.
                var rotation = spermRotationDeg * Math.PI / 180;
                var headPoints = rotatePoints(eggPoints(headX, headY, headW, headH, HEAD_TAPER, HEAD_SAMPLES),
                    headX, headY, rotation);
                var headReach = verticalReach(headPoints, headX, headY, headH / 2);
                var spermArrow = arrowSegment(daughters[s], {x: headX, y: headY, r: headReach}, gapPt);
                if (spermArrow !== null) {
                    var spermLine = group.pathItems.add();
                    spermLine.setEntirePath(spermArrow);
                    applyOutline(spermLine, black, ARROW_WIDTH_PT);
                    arrows.push(spermLine);
                }
                drawSperm(group, headX, headY, headH, headPoints, rotation, black);
            }
        }

        if (withArrowheads && arrows.length > 0) {
            applyArrowheads(arrows);
        }
    }

    // 꼬리(면)를 먼저 깔고 머리(흰 면 + 검은 테두리)를 위에 얹어 이음새가 머리 안에 숨는다.
    // 둘 다 머리 중심을 축으로 같은 각도만큼 돌린다.
    // headPoints는 이미 회전된 머리 윤곽(화살표 간격 계산에 먼저 쓰였다)
    function drawSperm(group, cx, cy, headH, headPoints, rotation, black) {
        var tailPoints = spermTailPoints(cx, cy, headH,
            tailLengthMm * MM_TO_PT, tailWidthPt, waveAmpMm * MM_TO_PT, TAIL_WAVES, TAIL_SAMPLES);
        var tail = buildPathFromPoints(group, rotatePoints(tailPoints, cx, cy, rotation), true);
        tail.stroked = false;
        tail.filled = true;
        tail.fillColor = black;

        var head = buildPathFromPoints(group, headPoints, true);
        applyOutline(head, black, CIRCLE_WIDTH_PT);
        head.filled = true;
        head.fillColor = makeWhiteColor(doc);
    }

    // 중심 (cx, cy)에서 바로 위로 올라가 닫힌 윤곽과 만나는 가장 높은 점까지의 거리.
    // 윤곽의 앵커를 잇는 선분과 x = cx의 교점을 찾는다 (표본이 촘촘해 곡선과의 차이는 무시할 만하다).
    // 교점이 없으면 fallback을 돌려준다.
    function verticalReach(points, cx, cy, fallback) {
        var highest = null;
        var count = points.length;
        for (var i = 0; i < count; i++) {
            var a = points[i].anchor;
            var b = points[(i + 1) % count].anchor;
            if ((a[0] - cx) * (b[0] - cx) > 0) continue;   // 선분이 세로선을 가로지르지 않는다
            var y;
            if (a[0] === b[0]) {
                y = Math.max(a[1], b[1]);
            } else {
                y = a[1] + (b[1] - a[1]) * (cx - a[0]) / (b[0] - a[0]);
            }
            if (y > cy && (highest === null || y > highest)) highest = y;
        }
        return highest === null ? fallback : highest - cy;
    }

    // 달걀꼴 머리. 타원의 가로 폭을 위로 갈수록 (1 - taper)까지 줄여 앞이 좁고 뒤가 넓다.
    // 가장 넓은 곳은 중심보다 아래(꼬리 쪽)로 내려간다.
    function eggPoints(cx, cy, width, height, taper, samples) {
        var offsets = [];
        var widest = 0;
        for (var i = 0; i < samples; i++) {
            var angle = Math.PI * 2 * i / samples;
            var upward = (1 + Math.sin(angle)) / 2;          // 아래 끝 0 → 위 끝 1
            var squeeze = 1 - taper * upward;
            var dx = Math.cos(angle) * squeeze;
            offsets.push([dx, Math.sin(angle)]);
            if (Math.abs(dx) > widest) widest = Math.abs(dx);
        }
        // 좁힌 만큼 가로를 다시 늘려 가장 넓은 곳이 정확히 '머리 폭'이 되게 한다
        var anchors = [];
        for (var j = 0; j < offsets.length; j++) {
            anchors.push([cx + offsets[j][0] / widest * width / 2, cy + offsets[j][1] * height / 2]);
        }
        return smoothClosedPoints(anchors, {});
    }

    // 점 목록(anchor · left · right)을 (cx, cy) 기준으로 radians만큼 회전한 새 목록
    function rotatePoints(points, cx, cy, radians) {
        var cosine = Math.cos(radians);
        var sine = Math.sin(radians);
        function turn(point) {
            var dx = point[0] - cx;
            var dy = point[1] - cy;
            return [cx + dx * cosine - dy * sine, cy + dx * sine + dy * cosine];
        }
        var rotated = [];
        for (var i = 0; i < points.length; i++) {
            rotated.push({
                anchor: turn(points[i].anchor),
                left: turn(points[i].left),
                right: turn(points[i].right),
                corner: points[i].corner
            });
        }
        return rotated;
    }

    // 꼬리 윤곽. 중심선은 머리 아래에서 시작해 tailLen만큼 내려가며 좌우로 waves번 물결친다.
    // 두께는 시작 tailW에서 끝 0까지 선형으로 줄어들어 획으로는 낼 수 없는 가늘어지는 꼬리가 된다.
    // 왼쪽 윤곽 → 끝점 → 오른쪽 윤곽(역순)으로 닫힌 면을 만든다. 시작 두 점과 끝점은 모서리.
    function spermTailPoints(cx, cy, headH, tailLen, tailW, waveAmp, waves, samples) {
        var startY = cy - headH / 2;
        var lefts = [];
        var rights = [];
        for (var i = 0; i < samples; i++) {
            var t = i / samples;
            var phase = Math.PI * 2 * waves * t;
            var x = cx + waveAmp * Math.sin(phase);
            var y = startY - tailLen * t;
            var dx = waveAmp * Math.PI * 2 * waves * Math.cos(phase);
            var dy = -tailLen;
            var length = Math.sqrt(dx * dx + dy * dy);
            var nx = -dy / length;
            var ny = dx / length;
            var half = tailW / 2 * (1 - t);
            lefts.push([x + nx * half, y + ny * half]);
            rights.push([x - nx * half, y - ny * half]);
        }
        var tipPhase = Math.PI * 2 * waves;
        var anchors = lefts.concat([[cx + waveAmp * Math.sin(tipPhase), startY - tailLen]]);
        for (var j = rights.length - 1; j >= 0; j--) anchors.push(rights[j]);

        var corners = {};
        corners[0] = true;
        corners[lefts.length] = true;
        corners[anchors.length - 1] = true;
        return smoothClosedPoints(anchors, corners);
    }

    // 표본점을 지나는 매끈한 닫힌 곡선(Catmull-Rom → 베지어 핸들). corners에 든 점은 각지게 둔다.
    function smoothClosedPoints(anchors, corners) {
        var count = anchors.length;
        var points = [];
        for (var i = 0; i < count; i++) {
            var anchor = anchors[i];
            if (corners[i]) {
                points.push({anchor: anchor, left: anchor, right: anchor, corner: true});
                continue;
            }
            var previous = anchors[(i + count - 1) % count];
            var next = anchors[(i + 1) % count];
            var tangent = [(next[0] - previous[0]) / 6, (next[1] - previous[1]) / 6];
            points.push({
                anchor: anchor,
                left: [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                right: [anchor[0] + tangent[0], anchor[1] + tangent[1]],
                corner: false
            });
        }
        return points;
    }

    function buildPathFromPoints(group, points, closed) {
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        var path = group.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = closed;
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.anchor = points[j].anchor;
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = points[j].corner ? PointType.CORNER : PointType.SMOOTH;
        }
        return path;
    }

    // 사각형 아래변에 닿아야 하는 맨 아래 끝: 정자를 그리면 꼬리 끝, 아니면 딸세포 아래 끝(중심 기준 거리)
    function bottomExtentPt() {
        if (!showSperm) return getRadii()[3];
        return headHeightMm * MM_TO_PT / 2 + tailLengthMm * MM_TO_PT;
    }

    // 사각형 가로 중심에 맞춘 맨 아랫줄에서 시작해, 위 단계는 딸세포들의 중점에 놓는다.
    // gapsPt는 줄 사이 중심 거리(G1→중기 1, 중기 1→중기 2, 중기 2→딸세포, …). 앞 3개만 쓴다.
    function layoutCells(rectBounds, radii, gapsPt, daughterStepPt, offsetPt) {
        var counts = [1, 1, 2, 4];
        var centerX = (rectBounds[0] + rectBounds[2]) / 2;
        var top = rectBounds[1];
        var bottomCount = counts[counts.length - 1];

        var centersByLevel = [[]];
        for (var i = 0; i < bottomCount; i++) {
            centersByLevel[0].push(centerX + (i - (bottomCount - 1) / 2) * daughterStepPt);
        }
        for (var level = counts.length - 2; level >= 0; level--) {
            var children = centersByLevel[0];
            var parents = [];
            var perParent = children.length / counts[level];
            for (var p = 0; p < counts[level]; p++) {
                var sum = 0;
                for (var c = 0; c < perParent; c++) sum += children[p * perParent + c];
                parents.push(sum / perParent);
            }
            centersByLevel.unshift(parents);
        }

        var rows = [];
        var y = top - radii[0] + offsetPt[1];
        for (var r = 0; r < counts.length; r++) {
            if (r > 0) y -= gapsPt[r - 1];
            var row = [];
            for (var k = 0; k < centersByLevel[r].length; k++) {
                row.push({x: centersByLevel[r][k] + offsetPt[0], y: y, r: radii[r]});
            }
            rows.push(row);
        }
        return rows;
    }

    // 맨 위 원의 위 끝과 맨 아래 끝(중심에서 bottomExtent 아래)이 사각형에 닿도록 gapCount등분한 간격
    function defaultGapPt(rectBounds, topRadius, bottomExtent, gapCount) {
        var span = rectBounds[1] - topRadius - bottomExtent - rectBounds[3];
        return span / gapCount;
    }

    // 좌우 끝 딸세포가 사각형 좌우변에 닿는 중심 거리
    function defaultDaughterStepPt(rectBounds, radii) {
        return (rectBounds[2] - rectBounds[0] - radii[radii.length - 1] * 2) / 3;
    }

    function toPoints(valuesMm) {
        var points = [];
        for (var i = 0; i < valuesMm.length; i++) points.push(valuesMm[i] * MM_TO_PT);
        return points;
    }

    // 두 원의 중심을 잇는 선 위에서, 양쪽 원 테두리로부터 gapPt만큼 떨어진 구간
    function arrowSegment(parent, child, gapPt) {
        var dx = child.x - parent.x;
        var dy = child.y - parent.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        if (length <= 0) return null;
        var startDistance = parent.r + gapPt;
        var endDistance = length - child.r - gapPt;
        if (endDistance - startDistance <= 0.01) return null;
        return [
            [parent.x + dx / length * startDistance, parent.y + dy / length * startDistance],
            [parent.x + dx / length * endDistance, parent.y + dy / length * endDistance]
        ];
    }

    function getRadii() {
        var radii = [];
        for (var i = 0; i < diametersMm.length; i++) radii.push(diametersMm[i] * MM_TO_PT / 2);
        return radii;
    }

    function applyOutline(pathItem, color, width) {
        pathItem.filled = false;
        pathItem.stroked = true;
        pathItem.strokeColor = color;
        pathItem.strokeWidth = width;
        pathItem.strokeCap = StrokeCap.BUTTENDCAP;
        pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        pathItem.strokeDashes = [];
    }

    function makeBlackColor() {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = 100;
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = 0;
        rgb.green = 0;
        rgb.blue = 0;
        return rgb;
    }

    // -------------------------------------------------------
    // 화살촉
    // -------------------------------------------------------
    // 화살촉은 DOM에 없어 임시 액션으로 적용한다 (AGENTS.md 참고)
    function applyArrowheads(paths) {
        var actionSetName = "Codex_Meiosis";
        var actionName = "MeiosisArrow";
        var actionFile = new File(Folder.temp + "/Codex_MeiosisArrow.aia");
        var locale = getAppLocale();
        var isKorean = locale === "" || locale.indexOf("ko") === 0;
        var arrowName = isKorean ? ARROW_NAME_KO : ARROW_NAME_EN;

        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) {
                paths[i].selected = true;
            }
            removeActionSetIfLoaded(actionSetName);
            writeArrowheadAction(actionFile, actionSetName, actionName, arrowName);
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (e) {
            // 화살표 이름은 UI 언어를 따른다. 실패해도 선 자체는 그대로 남는다.
        }

        removeActionSetIfLoaded(actionSetName);
        try { actionFile.remove(); } catch (removeError) {}
        doc.selection = null;
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, arrowName) {
        var lines = [];
        lines.push("/version 3");
        lines.push("/name [ " + actionSetName.length);
        lines.push("    " + asciiHex(actionSetName));
        lines.push("]");
        lines.push("/isOpen 1");
        lines.push("/actionCount 1");
        lines.push("/action-1 {");
        lines.push("    /name [ " + actionName.length);
        lines.push("        " + asciiHex(actionName));
        lines.push("    ]");
        lines.push("    /keyIndex 0");
        lines.push("    /colorIndex 0");
        lines.push("    /isOpen 1");
        lines.push("    /eventCount 1");
        lines.push("    /event-1 {");
        lines.push("        /useRulersIn1stQuadrant 0");
        lines.push("        /internalName (ai_plugin_setStroke)");
        lines.push("        /localizedName [ 10");
        lines.push("            536574205374726F6B65");
        lines.push("        ]");
        lines.push("        /isOpen 1");
        lines.push("        /isOn 1");
        lines.push("        /hasDialog 0");
        lines.push("        /parameterCount 5");
        addUnitRealParameter(lines, 1, 2003072104, ARROW_WIDTH_PT);
        addUStringParameter(lines, 2, 1634231345, getNoneArrowName());
        addUStringParameter(lines, 3, 1634231346, arrowName);
        addRealParameter(lines, 4, 1634951986, arrowScale);
        addEnumeratedParameter(lines, 5, 1634230636, "패스 끝의 팁", 0);
        lines.push("    }");
        lines.push("}");

        writeActionFile(actionFile, lines);
    }

    // -------------------------------------------------------
    // 다이얼로그 도우미
    // -------------------------------------------------------
    function makeArrayGetter(values, index) {
        return function() { return values[index]; };
    }

    function makeArraySetter(values, index) {
        return function(value) { values[index] = value; };
    }

    function addColumn(parent) {
        var column = parent.add("group");
        column.orientation = "column";
        column.alignChildren = ["fill", "top"];
        column.spacing = 6;
        return column;
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨 · 입력칸 · ◀ · 슬라이더 · ▶ 를 한 줄에 배치
    function addValueRow(parent, label, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.spacing = 4;
        var labelText = row.add("statictext", undefined, label);
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = INPUT_CHARACTERS;
        input.justify = "right";
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;
        return {
            row: row, input: input, slider: slider, down: down, up: up,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value, withArrowheads) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview(withArrowheads);
        }
        // 끄는 동안은 가벼운 미리보기, 손을 뗀 뒤(onChange)에 화살촉까지 그린다
        controls.slider.onChanging = function() { commit(controls.slider.value, false); };
        controls.slider.onChange = function() { commit(controls.slider.value, true); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value, true);
        };
        controls.down.onClick = function() { commit(getter() - controls.step, true); };
        controls.up.onClick = function() { commit(getter() + controls.step, true); };
    }

    // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다 (이동이 즉각 반응한다)
    function bindPositionRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var previousX = offsetXmm;
            var previousY = offsetYmm;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (!movePreviewGroup(previewGroup, previousX, previousY, offsetXmm, offsetYmm)) {
                updatePreview(true);
                return;
            }
            if (previewGroup !== null) app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
        controls.down.onClick = function() { commit(getter() - controls.step); };
        controls.up.onClick = function() { commit(getter() + controls.step); };
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
    // v4: 지름 4 · 화살표 간격 · 화살촉 크기 · 줄 간격 비율 4 · 딸세포 간격 비율 · 위치 비율 2
    //     · 정자(머리 폭 · 머리 높이 · 꼬리 길이 · 꼬리 두께 · 물결 폭 · 그리기 여부 · 회전)
    function saveSettings() {
        var parts = ["v4"];
        for (var i = 0; i < diametersMm.length; i++) parts.push(diametersMm[i]);
        parts.push(arrowGapMm, arrowScale);
        for (var g = 0; g < gapsMm.length; g++) parts.push(gapsMm[g] * MM_TO_PT / rectHeightPt);
        parts.push(daughterStepMm * MM_TO_PT / rectWidthPt);
        parts.push(offsetXmm * MM_TO_PT / rectWidthPt, offsetYmm * MM_TO_PT / rectHeightPt);
        parts.push(headWidthMm, headHeightMm, tailLengthMm, tailWidthPt, waveAmpMm, showSperm ? 1 : 0,
            spermRotationDeg);
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v4" || p.length !== 21) return;
        for (var i = 0; i < diametersMm.length; i++) {
            diametersMm[i] = restoreNumber(p[1 + i], diametersMm[i], 1, 100);
        }
        arrowGapMm = restoreNumber(p[5], arrowGapMm, 0, 10);
        arrowScale = restoreNumber(p[6], arrowScale, 10, 800);
        // 비율은 넷 모두 유효할 때만 받는다. 하나라도 깨졌으면 사각형 초기값으로 간다.
        var ratios = [];
        for (var g = 0; g < 4; g++) {
            var ratio = parseFloat(p[7 + g]);
            if (isNaN(ratio) || ratio <= 0 || ratio > 10) break;
            ratios.push(ratio);
        }
        if (ratios.length === 4) gapRatios = ratios;
        var stepRatio = parseFloat(p[11]);
        if (!isNaN(stepRatio) && stepRatio > 0 && stepRatio <= 10) daughterStepRatio = stepRatio;
        offsetXRatio = restoreNumber(p[12], 0, -10, 10);
        offsetYRatio = restoreNumber(p[13], 0, -10, 10);
        headWidthMm = restoreNumber(p[14], headWidthMm, 0.5, 20);
        headHeightMm = restoreNumber(p[15], headHeightMm, 0.5, 20);
        tailLengthMm = restoreNumber(p[16], tailLengthMm, 0.5, 50);
        tailWidthPt = restoreNumber(p[17], tailWidthPt, 0.1, 5);
        waveAmpMm = restoreNumber(p[18], waveAmpMm, 0, 10);
        showSperm = p[19] !== "0";
        spermRotationDeg = restoreNumber(p[20], spermRotationDeg, -180, 180);
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
