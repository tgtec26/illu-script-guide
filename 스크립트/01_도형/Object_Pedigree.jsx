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

// 가계도 그리기
// 선택한 사각형 중앙에 조부모(1세대) → 부모·형제(2세대) → 자녀(3세대) 가계도를 그린다.
// 사각형 = 남자, 원 = 여자. (가) 발현은 사선, (나) 발현은 격자, 둘 다 발현은 20% 음영.
(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 가계도가 들어갈 사각형 하나를 선택해주세요.");
        return;
    }
    var doc = app.activeDocument;
    if (doc.activeLayer.locked || !doc.activeLayer.visible) {
        alert("현재 레이어가 잠겨 있거나 숨겨져 있습니다.\n편집할 수 있는 레이어를 선택한 뒤 실행해주세요.");
        return;
    }
    var sel = doc.selection;
    if (!sel || sel.typename === "TextRange" || sel.length !== 1 || sel[0].typename !== "PathItem") {
        alert("가계도가 들어갈 사각형 하나를 선택해주세요.\n완성된 가계도는 사각형 중앙에 놓입니다.");
        return;
    }

    var MM_TO_PT = 2.834645669;
    var OUTLINE_PT = 0.4;          // 도형 테두리 · 부부선 · 자손선
    var PATTERN_PT = 0.3;          // 사선 · 격자
    var BOTH_GRAY = 20;            // (가), (나) 모두 발현: 내부 음영 K%
    var LABEL_GAP_MM = 0.5;        // 도형 아래 번호까지 간격
    var TEXT_PT = 8;
    var FONT_NAMES = ["GSMediumB1"];
    var LEGEND_RATIO = 0.7;        // 범례 도형 크기 / 가계도 도형 크기
    var LEGEND_ROW_GAP_MM = 1;     // 범례 도형 사이 위아래 간격
    var LEGEND_GAP_MM = 5;         // 가계도 오른쪽 끝에서 범례 도형까지
    var LEGEND_TEXT_GAP_MM = 1;    // 범례 도형에서 글자까지
    var LEGEND_KOR_FONTS = ["SpoqaHanSansNeo-Regular"];
    var LEGEND_LABEL_FONTS = ["Batang"];      // (가), (나)
    var LEGEND_LABELS = ["정상", "(가) 발현", "(나) 발현", "(가), (나) 발현"];
    var MARK_RATIO = 0.8;          // 원문자 지름 / 도형 크기
    var SIBLING_MAX = 2;
    var CHILD_MAX = 4;
    var POSITION_LIMIT_MM = 100;
    var PREF_KEY = "ObjectPedigree/settings";
    // v6: 크기 8개 · 이동 2개 · 범례 3개 · 형제 수 2개 · 구성원 10명 × (성별, 발현, 원문자) · 자녀 수 · 자녀 4명 × (종류, 발현, 원문자) = 59칸
    // applySavedSettings()보다 먼저 값이 있어야 하므로 여기(IIFE 맨 위)에 둔다
    var SETTINGS_TAG = "v6";
    var SETTINGS_LENGTH = 59;
    var PREVIEW_NAME = "Pedigree Preview";

    var PHENO_LABELS = ["정상", "(가)", "(나)", "(가)(나)"];
    var MARK_LABELS = ["없음", "ⓐ", "ⓑ", "ⓒ"];
    var MARK_LETTERS = ["", "a", "b", "c"];

    var rect = sel[0];
    var rectBounds = rect.geometricBounds;   // [left, top, right, bottom]
    var rectWasHidden = rect.hidden;

    // -------------------------------------------------------
    // 상태 (다이얼로그와 저장 옵션이 공유)
    // -------------------------------------------------------
    var sizeMm = 4.5;
    var coupleGapMm = 5;
    var siblingGapMm = 3;
    var upperGapMm = 11;       // F–P1: 조부모 → 부모 세대 (도형 중심 간)
    var lowerGapMm = 11;       // P1–P2: 부모 → 자녀 세대
    var branchPct = 50;
    var hatchCount = 5;
    var gridSize = 4;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var legendOn = false;
    var legendXmm = 0;
    var legendYmm = 0;
    var previewEnabled = true;

    // gender 0 = 남(사각형), 1 = 여(원). pheno 0 정상 1 (가) 2 (나) 3 둘 다. mark 0 없음 1~3 ⓐⓑⓒ
    function member(gender) { return {gender: gender, pheno: 0, mark: 0}; }
    function makeSide(title, siblingLabels) {
        var side = {title: title, siblingLabels: siblingLabels, count: 0,
            grand: [member(0), member(1)], parent: member(0), siblings: []};
        for (var i = 0; i < SIBLING_MAX; i++) side.siblings.push(member(0));
        return side;
    }
    var sides = [makeSide("친가", ["삼촌", "고모"]), makeSide("외가", ["외삼촌", "이모"])];
    sides[1].parent.gender = 1;
    // 자녀: kind 0 = 물음표, 1 = 아들, 2 = 딸
    var childCount = 1;
    var children = [];
    for (var c = 0; c < CHILD_MAX; c++) children.push({kind: 0, gender: 0, pheno: 0, mark: 0});

    applySavedSettings();

    var previewGroup = null;
    var previewLegend = null;       // previewGroup 안의 범례 그룹. 범례 이동은 이것만 옮긴다
    var builtLegend = null;         // drawPedigree가 마지막으로 만든 범례 그룹
    var previewSignature = "";
    var previewErrorShown = false;
    var font = findTextFont(FONT_NAMES);
    var legendKorFont = findTextFont(LEGEND_KOR_FONTS);
    var legendLabelFont = findTextFont(LEGEND_LABEL_FONTS);

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var LABEL_WIDTH = 64;
    var GENDER_WIDTH = 118;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 105;
    var UNIT_WIDTH = 24;

    var dlg = new Window("dialog", "가계도");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var columns = dlg.add("group");
    columns.orientation = "row";
    columns.alignChildren = ["fill", "top"];
    columns.spacing = 10;
    var leftColumn = columns.add("group");
    leftColumn.orientation = "column";
    leftColumn.alignChildren = "fill";
    leftColumn.spacing = 6;
    var rightColumn = columns.add("group");
    rightColumn.orientation = "column";
    rightColumn.alignChildren = "fill";
    rightColumn.spacing = 6;

    for (var s = 0; s < sides.length; s++) addSidePanel(leftColumn, sides[s]);

    var childPanel = addPanel(leftColumn, "자녀 (아버지·어머니)");
    var childCountRow = childPanel.add("group");
    childCountRow.alignChildren = ["left", "center"];
    childCountRow.add("statictext", undefined, "자녀 수").preferredSize.width = LABEL_WIDTH;
    var childCountList = childCountRow.add("dropdownlist", undefined, ["1", "2", "3", "4"]);
    childCountList.selection = childCount - 1;
    childCountList.preferredSize.width = 56;
    var childRows = [];
    for (c = 0; c < CHILD_MAX; c++) childRows.push(addChildRow(childPanel, "자녀 " + (c + 1), children[c]));
    function refreshChildRows() {
        for (var r = 0; r < childRows.length; r++) childRows[r].enabled = r < childCount;
    }
    childCountList.onChange = function() {
        childCount = childCountList.selection.index + 1;
        refreshChildRows();
        updatePreview();
    };
    refreshChildRows();

    var sizePanel = addPanel(rightColumn, "크기");
    var sizeControls = addValueRow(sizePanel, "도형 크기", "mm", sizeMm, 4, 6, 0.2, 1);
    var hatchControls = addValueRow(sizePanel, "(가) 사선 수", "개", hatchCount, 1, 9, 1, 0);
    var gridRow = sizePanel.add("group");
    gridRow.alignChildren = ["left", "center"];
    gridRow.add("statictext", undefined, "(나) 격자").preferredSize.width = LABEL_WIDTH;
    addRadios(gridRow, ["4 × 4", "5 × 5"], gridSize === 5 ? 1 : 0, function(index) {
        gridSize = index === 1 ? 5 : 4;
        updatePreview();
    });

    var layoutPanel = addPanel(rightColumn, "간격");
    var coupleControls = addValueRow(layoutPanel, "부부 사이", "mm", coupleGapMm, 2, 15, 0.5, 1);
    var siblingControls = addValueRow(layoutPanel, "형제 사이", "mm", siblingGapMm, 1, 15, 0.5, 1);
    var upperGapControls = addValueRow(layoutPanel, "F–P1 세대", "mm", upperGapMm, 8, 30, 0.5, 1);
    var lowerGapControls = addValueRow(layoutPanel, "P1–P2 세대", "mm", lowerGapMm, 8, 30, 0.5, 1);
    var branchControls = addValueRow(layoutPanel, "형제 분기점", "%", branchPct, 20, 80, 5, 0);
    var branchNote = layoutPanel.add("statictext", undefined,
        "세대 거리는 도형 중심 간 거리, 분기점은 부부선(0%)에서 자녀 위 끝(100%)까지의 위치입니다.", {multiline: true});
    branchNote.preferredSize.width = 330;

    var positionPanel = addPanel(rightColumn, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var legendPanel = addPanel(rightColumn, "범례");
    var legendCheck = legendPanel.add("checkbox", undefined, "가계도 오른쪽에 범례 넣기 (가계도에 있는 표현만)");
    legendCheck.value = legendOn;
    var legendXControls = addValueRow(legendPanel, "가로 이동", "mm", legendXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var legendYControls = addValueRow(legendPanel, "세로 이동", "mm", legendYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(sizeControls, function() { return sizeMm; }, function(v) { sizeMm = v; });
    bindValueRow(hatchControls, function() { return hatchCount; }, function(v) { hatchCount = v; });
    bindValueRow(coupleControls, function() { return coupleGapMm; }, function(v) { coupleGapMm = v; });
    bindValueRow(siblingControls, function() { return siblingGapMm; }, function(v) { siblingGapMm = v; });
    bindValueRow(upperGapControls, function() { return upperGapMm; }, function(v) { upperGapMm = v; });
    bindValueRow(lowerGapControls, function() { return lowerGapMm; }, function(v) { lowerGapMm = v; });
    bindValueRow(branchControls, function() { return branchPct; }, function(v) { branchPct = v; });
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true,
        function() { return previewGroup; });
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false,
        function() { return previewGroup; });
    bindPositionRow(legendXControls, function() { return legendXmm; }, function(v) { legendXmm = v; }, true,
        function() { return previewLegend; });
    bindPositionRow(legendYControls, function() { return legendYmm; }, function(v) { legendYmm = v; }, false,
        function() { return previewLegend; });
    legendCheck.onClick = function() {
        legendOn = legendCheck.value;
        updatePreview();
    };

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        saveSettings();
        dlg.close(1);
    };
    cancelButton.onClick = function() { dlg.close(0); };

    removeLeftoverPreviews();
    rect.hidden = true;
    rect.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = null;
        try {
            finalGroup = buildPedigree();
            finalGroup.name = "Pedigree";
        } catch (buildError) {
            if (finalGroup !== null) { try { finalGroup.remove(); } catch (e) {} }
            rect.hidden = rectWasHidden;
            alert("가계도를 그리지 못했습니다.\n" + buildError);
            app.redraw();
            return;
        }
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
    function updatePreview() {
        if (!previewEnabled) {
            clearPreview();
            app.redraw();
            return;
        }
        var signature = settingsParts().join("|");
        if (previewGroup !== null && signature === previewSignature) return;
        clearPreview();
        try {
            previewGroup = buildPedigree();
            previewGroup.name = PREVIEW_NAME;
            previewLegend = builtLegend;
            previewSignature = signature;
        } catch (e) {
            // buildPedigree가 만들다 만 그룹은 스스로 지운다. 원인은 한 번만 알린다
            previewGroup = null;
            if (!previewErrorShown) {
                previewErrorShown = true;
                alert("미리보기를 그리지 못했습니다.\n" + e + (e.line ? " (line " + e.line + ")" : ""));
            }
        }
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
            previewGroup = null;
        }
        previewLegend = null;
        previewSignature = "";
    }

    // 이전 실행이 비정상 종료되어 남은 미리보기 그룹 정리
    function removeLeftoverPreviews() {
        var groups = doc.activeLayer.groupItems;
        for (var i = groups.length - 1; i >= 0; i--) {
            try {
                if (groups[i].name === PREVIEW_NAME) groups[i].remove();
            } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 배치 계산 (DOM 없음 · tests/check-pedigree.js가 그대로 실행)
    // -------------------------------------------------------
    // spec: {size, coupleGap, siblingGap, upperGap, lowerGap, branchPct, markRatio,
    //        sides: [{count, grand:[남, 여], parent, siblings:[...]}, ...],
    //        childCount, children: [{kind, gender, pheno, mark}, ...]}   kind 0이면 도형 대신 물음표
    // 좌표는 pt, 1세대 중심 y = 0, 아래로 갈수록 음수.
    function layoutPedigree(spec) {
        var S = spec.size;
        var step = S + spec.siblingGap;
        var y1 = 0, y2 = -spec.upperGap, y3 = y2 - spec.lowerGap;
        var nodes = [];
        var lines = [];
        var i;

        function addNode(person, x, y, gen) {
            var question = person.kind === 0;
            var half = (!question && person.mark > 0) ? S * spec.markRatio / 2 : S / 2;
            var node = {person: person, x: x, y: y, gen: gen, half: half, number: 0, question: question};
            nodes.push(node);
            return node;
        }
        function coupleLine(left, right) {
            lines.push([left.x + left.half, left.y, right.x - right.half, right.y]);
        }
        // 부부선 가운데(dropX)에서 내려와 형제 가로선을 거쳐 각 자녀 위 끝까지. gap은 이 세대 사이 거리
        function descend(dropX, parentY, gap, children) {
            var first = children[0];
            var last = children[children.length - 1];
            if (children.length === 1 && Math.abs(first.x - dropX) < 0.0001) {
                lines.push([dropX, parentY, dropX, first.y + first.half]);
                return;
            }
            var childTop = parentY - gap + S / 2;
            var barY = parentY - (parentY - childTop) * spec.branchPct / 100;
            lines.push([dropX, parentY, dropX, barY]);
            lines.push([Math.min(dropX, first.x), barY, Math.max(dropX, last.x), barY]);
            for (var c = 0; c < children.length; c++) {
                lines.push([children[c].x, barY, children[c].x, children[c].y + children[c].half]);
            }
        }

        var pat = spec.sides[0];
        var mat = spec.sides[1];

        // 2세대: 친가 형제 → 아버지 → 어머니 → 외가 형제 (왼쪽부터)
        // 형제열이 둘이면 조부모 부부 간격으로 벌려 할아버지·할머니 바로 아래에 하나씩 놓는다
        var patStep = pat.count === 1 ? S + spec.coupleGap : step;
        var matStep = mat.count === 1 ? S + spec.coupleGap : step;
        var patRow = [];
        var matRow = [];
        for (i = 0; i < pat.count; i++) patRow.push(addNode(pat.siblings[i], i * patStep, y2, 2));
        var father = addNode(pat.parent, pat.count * patStep, y2, 2);
        patRow.push(father);
        var mother = addNode(mat.parent, father.x + S + spec.coupleGap, y2, 2);
        matRow.push(mother);
        for (i = 0; i < mat.count; i++) matRow.push(addNode(mat.siblings[i], mother.x + (i + 1) * matStep, y2, 2));

        // 1세대: 각 형제열 중앙 위에 부부. 형제가 없으면 부모 바로 위에 놓여 수직선으로 이어진다.
        // 두 부부가 부부 간격보다 가까우면 외가 쪽(어머니 · 외가 형제 · 외조부모)을 오른쪽으로 밀어
        // 아버지-어머니 부부선을 늘린다
        var h = (S + spec.coupleGap) / 2;
        var patMid = (patRow[0].x + father.x) / 2;
        var matMid = (mother.x + matRow[matRow.length - 1].x) / 2;
        var clearance = (matMid - h) - (patMid + h) - S;
        var shift = Math.max(0, spec.coupleGap - clearance);
        for (i = 0; i < matRow.length; i++) matRow[i].x += shift;
        matMid += shift;
        var patGF = addNode(pat.grand[0], patMid - h, y1, 1);
        var patGM = addNode(pat.grand[1], patMid + h, y1, 1);
        var matGF = addNode(mat.grand[0], matMid - h, y1, 1);
        var matGM = addNode(mat.grand[1], matMid + h, y1, 1);

        coupleLine(patGF, patGM);
        coupleLine(matGF, matGM);
        coupleLine(father, mother);
        descend((patGF.x + patGM.x) / 2, y1, spec.upperGap, patRow);
        descend((matGF.x + matGM.x) / 2, y1, spec.upperGap, matRow);

        // 3세대: 부부선 가운데 아래에 자녀들을 가운데 정렬. 둘이면 아버지·어머니 바로 아래에 하나씩
        var childX = (father.x + mother.x) / 2;
        var childStep = spec.childCount === 2 ? mother.x - father.x : step;
        var childRow = [];
        for (i = 0; i < spec.childCount; i++) {
            childRow.push(addNode(spec.children[i], childX + (i - (spec.childCount - 1) / 2) * childStep, y3, 3));
        }
        descend(childX, y2, spec.lowerGap, childRow);

        // 번호: 세대 순, 같은 세대는 왼쪽부터. 원문자로 가린 사람과 물음표는 건너뛴다
        var order = nodes.slice();
        order.sort(function(a, b) { return (a.gen - b.gen) || (a.x - b.x); });
        var number = 0;
        for (i = 0; i < order.length; i++) {
            if (!order[i].question && order[i].person.mark === 0) order[i].number = ++number;
        }
        return {nodes: nodes, lines: lines};
    }

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    function currentSpec() {
        return {
            size: sizeMm * MM_TO_PT,
            coupleGap: coupleGapMm * MM_TO_PT,
            siblingGap: siblingGapMm * MM_TO_PT,
            upperGap: upperGapMm * MM_TO_PT,
            lowerGap: lowerGapMm * MM_TO_PT,
            branchPct: branchPct,
            markRatio: MARK_RATIO,
            sides: sides,
            childCount: childCount,
            children: children
        };
    }

    // 실패하면 만들다 만 그룹을 지우고 오류를 다시 던진다
    function buildPedigree() {
        var group = doc.activeLayer.groupItems.add();
        try {
            drawPedigree(group);
        } catch (e) {
            try { group.remove(); } catch (removeError) {}
            throw e;
        }
        return group;
    }

    function drawPedigree(group) {
        var spec = currentSpec();
        var layout = layoutPedigree(spec);
        var black = makeColor(100);
        var i;

        for (i = 0; i < layout.lines.length; i++) {
            var seg = layout.lines[i];
            makeLine(group, [[seg[0], seg[1]], [seg[2], seg[3]]], OUTLINE_PT, black);
        }
        for (i = 0; i < layout.nodes.length; i++) {
            var node = layout.nodes[i];
            if (node.question) addText(group, "?", node.x, node.y, false);
            else if (node.person.mark > 0) drawMark(group, node, spec.size);
            else drawPerson(group, node, spec.size);
            if (node.number > 0) {
                addText(group, String(node.number), node.x, node.y - node.half - LABEL_GAP_MM * MM_TO_PT, true);
            }
        }

        // 선택한 사각형 중앙으로 이동. 클리핑 밖까지 뻗은 사선 때문에 DOM 경계는 쓰지 않고 배치 좌표로 잰다
        var b = layoutBounds(layout, LABEL_GAP_MM * MM_TO_PT + TEXT_PT * 0.75);
        builtLegend = legendOn ? drawLegend(group, layout, spec.size, b) : null;
        group.translate(
            (rectBounds[0] + rectBounds[2]) / 2 - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
            (rectBounds[1] + rectBounds[3]) / 2 - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
    }

    // 범례 항목: 정상 → (가) → (나) → (가)(나), 각각 남자 → 여자 순. 가계도에 실제로 그려진 표현만
    function legendEntries(nodes) {
        var entries = [];
        for (var pheno = 0; pheno < 4; pheno++) {
            for (var gender = 0; gender < 2; gender++) {
                var present = false;
                for (var i = 0; i < nodes.length && !present; i++) {
                    var n = nodes[i];
                    present = !n.question && n.person.mark === 0 &&
                        n.person.gender === gender && n.person.pheno === pheno;
                }
                if (present) entries.push({gender: gender, pheno: pheno});
            }
        }
        return entries;
    }

    // 가계도 오른쪽 위에 맞춰 범례를 세로로 놓는다. 항목이 없으면 null
    function drawLegend(group, layout, S, bounds) {
        var entries = legendEntries(layout.nodes);
        if (entries.length === 0) return null;
        var legend = group.groupItems.add();
        legend.name = "Legend";
        var size = S * LEGEND_RATIO;
        var pitch = size + LEGEND_ROW_GAP_MM * MM_TO_PT;
        var cx = bounds[2] + LEGEND_GAP_MM * MM_TO_PT + size / 2;
        for (var i = 0; i < entries.length; i++) {
            var cy = bounds[1] - size / 2 - i * pitch;
            var e = entries[i];
            drawPerson(legend, {person: {gender: e.gender, pheno: e.pheno, mark: 0}, x: cx, y: cy}, size);
            addLegendText(legend, LEGEND_LABELS[e.pheno] + (e.gender === 0 ? " 남자" : " 여자"),
                cx + size / 2 + LEGEND_TEXT_GAP_MM * MM_TO_PT, cy);
        }
        legend.translate(legendXmm * MM_TO_PT, legendYmm * MM_TO_PT);
        return legend;
    }

    // 범례 글자: 한글은 Spoqa, "(가)" "(나)"는 바탕. 왼쪽 끝을 x에, 글리프 세로 중심을 y에 맞춘다
    function addLegendText(container, contents, x, y) {
        var tf = container.textFrames.add();
        tf.contents = contents;
        var attr = tf.textRange.characterAttributes;
        attr.size = TEXT_PT;
        try { attr.textFont = legendKorFont; } catch (e) {}
        attr.fillColor = makeColor(100);
        attr.strokeColor = new NoColor();
        var labels = ["(가)", "(나)"];
        for (var l = 0; l < labels.length; l++) {
            var at = contents.indexOf(labels[l]);
            while (at >= 0) {
                for (var c = at; c < at + labels[l].length; c++) {
                    try { tf.textRange.characters[c].characterAttributes.textFont = legendLabelFont; } catch (fontError) {}
                }
                at = contents.indexOf(labels[l], at + labels[l].length);
            }
        }
        var gb = glyphBounds(tf);
        tf.translate(x - gb[0], y - (gb[1] + gb[3]) / 2);
        return tf;
    }

    // 도형(물음표 자리 포함) · 선 · 번호(도형 아래 labelDepth까지)를 감싸는 [left, top, right, bottom]
    function layoutBounds(layout, labelDepth) {
        var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
        function include(x, y) {
            if (x < left) left = x;
            if (x > right) right = x;
            if (y > top) top = y;
            if (y < bottom) bottom = y;
        }
        var i;
        for (i = 0; i < layout.nodes.length; i++) {
            var n = layout.nodes[i];
            include(n.x - n.half, n.y + n.half);
            include(n.x + n.half, n.y - n.half - (n.number > 0 ? labelDepth : 0));
        }
        for (i = 0; i < layout.lines.length; i++) {
            include(layout.lines[i][0], layout.lines[i][1]);
            include(layout.lines[i][2], layout.lines[i][3]);
        }
        return [left, top, right, bottom];
    }

    function drawPerson(group, node, S) {
        var person = node.person;
        var shape = makeShape(group, person.gender, node.x, node.y, S);
        shape.filled = true;
        shape.fillColor = makeColor(person.pheno === 3 ? BOTH_GRAY : 0);
        applyStroke(shape, OUTLINE_PT, makeColor(100));
        if (person.pheno !== 1 && person.pheno !== 2) return;

        // 무늬는 같은 모양의 마스크로 클리핑 (원 안 격자도 같은 방식). 마스크는 맨 나중에 넣어 맨 위에 둔다
        var clipGroup = group.groupItems.add();
        var strokeColor = makeColor(100);
        var k;
        if (person.pheno === 1) {
            // 사선: 가운데 한 줄을 기준으로 등간격. 대각선 방향 폭 S√2를 (n+1)등분 → x 간격 2S/(n+1)
            var spacing = 2 * S / (hatchCount + 1);
            for (k = 0; k < hatchCount; k++) {
                var d = (k - (hatchCount - 1) / 2) * spacing;
                makeLine(clipGroup, [[node.x + d - S, node.y - S], [node.x + d + S, node.y + S]], PATTERN_PT, strokeColor);
            }
        } else {
            var cell = S / gridSize;
            var left = node.x - S / 2;
            var top = node.y + S / 2;
            for (k = 1; k < gridSize; k++) {
                makeLine(clipGroup, [[left + k * cell, top], [left + k * cell, top - S]], PATTERN_PT, strokeColor);
                makeLine(clipGroup, [[left, top - k * cell], [left + S, top - k * cell]], PATTERN_PT, strokeColor);
            }
        }
        var mask = makeShape(clipGroup, person.gender, node.x, node.y, S);
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        clipGroup.clipped = true;
    }

    // 원문자: 도형보다 조금 작은 원 안에 a, b, c
    function drawMark(group, node, S) {
        var d = S * MARK_RATIO;
        var circle = makeShape(group, 1, node.x, node.y, d);
        circle.filled = true;
        circle.fillColor = makeColor(0);
        applyStroke(circle, OUTLINE_PT, makeColor(100));
        addText(group, MARK_LETTERS[node.person.mark], node.x, node.y, false);
    }

    function makeShape(container, gender, cx, cy, size) {
        var top = cy + size / 2;
        var left = cx - size / 2;
        if (gender === 0) return container.pathItems.rectangle(top, left, size, size);
        return container.pathItems.ellipse(top, left, size, size);
    }

    function makeLine(container, points, width, color) {
        var path = container.pathItems.add();
        path.setEntirePath(points);
        path.filled = false;
        applyStroke(path, width, color);
        return path;
    }

    function applyStroke(item, width, color) {
        item.stroked = true;
        item.strokeColor = color;
        item.strokeWidth = width;
        item.strokeCap = StrokeCap.BUTTENDCAP;
        item.strokeJoin = StrokeJoin.MITERENDJOIN;
        item.strokeDashes = [];
    }

    // 글자를 만들고 글리프 경계 기준으로 놓는다. alignTop이면 y가 글자 위 끝, 아니면 글자 중심.
    function addText(container, contents, cx, y, alignTop) {
        var tf = container.textFrames.add();
        tf.contents = contents;
        var attr = tf.textRange.characterAttributes;
        attr.size = TEXT_PT;
        try { attr.textFont = font; } catch (e) {}
        attr.fillColor = makeColor(100);
        attr.strokeColor = new NoColor();
        var gb = glyphBounds(tf);
        var targetY = alignTop ? y - gb[1] : y - (gb[1] + gb[3]) / 2;
        tf.translate(cx - (gb[0] + gb[2]) / 2, targetY);
        return tf;
    }

    // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
    function glyphBounds(tf) {
        var dup = tf.duplicate();
        try {
            var outline = dup.createOutline();
            var gb = outline.geometricBounds;
            outline.remove();
            return gb;
        } catch (e) {
            try { dup.remove(); } catch (removeError) {}
            return tf.geometricBounds;
        }
    }

    // GrayColor를 쓰면 개체 색 공간이 그레이스케일이 되어 나중에 색을 바꾸기 어렵다.
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

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
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

    function addSidePanel(parent, side) {
        var panel = addPanel(parent, side.title);
        var countRow = panel.add("group");
        countRow.alignChildren = ["left", "center"];
        countRow.add("statictext", undefined, "형제 수").preferredSize.width = LABEL_WIDTH;
        var countList = countRow.add("dropdownlist", undefined, ["0", "1", "2"]);
        countList.selection = side.count;
        countList.preferredSize.width = 56;

        var grandLabels = side.title === "친가" ? ["할아버지", "할머니", "아버지"] : ["외할아버지", "외할머니", "어머니"];
        addMemberRow(panel, grandLabels[0], side.grand[0], null);
        addMemberRow(panel, grandLabels[1], side.grand[1], null);
        addMemberRow(panel, grandLabels[2], side.parent, null);
        var siblingRows = [];
        for (var i = 0; i < SIBLING_MAX; i++) {
            siblingRows.push(addMemberRow(panel, "형제 " + (i + 1), side.siblings[i], side.siblingLabels));
        }
        function refreshRows() {
            for (var r = 0; r < siblingRows.length; r++) siblingRows[r].row.enabled = r < side.count;
        }
        countList.onChange = function() {
            side.count = countList.selection.index;
            refreshRows();
            updatePreview();
        };
        refreshRows();
        return {panel: panel, countList: countList, siblingRows: siblingRows};
    }

    // 자녀 한 줄: 이름 · 물음표/아들/딸 · 발현 · 원문자. 물음표면 발현·원문자를 잠근다
    function addChildRow(panel, label, person) {
        var row = panel.add("group");
        row.alignChildren = ["left", "center"];
        row.spacing = 6;
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var kind = addRadios(row, ["?", "아들", "딸"], person.kind, function(index) {
            person.kind = index;
            if (index > 0) person.gender = index - 1;
            pheno.group.enabled = index > 0 && person.mark === 0;
            mark.enabled = index > 0;
            updatePreview();
        });
        kind.group.preferredSize.width = GENDER_WIDTH;
        var pheno = addRadios(row, PHENO_LABELS, person.pheno, function(index) {
            person.pheno = index;
            updatePreview();
        });
        var mark = addMarkList(row, person, pheno.group);
        pheno.group.enabled = person.kind > 0 && person.mark === 0;
        mark.enabled = person.kind > 0;
        return row;
    }

    // 이름 · [성별] · 발현 · 원문자
    function addMemberRow(panel, label, person, genderLabels) {
        var row = panel.add("group");
        row.alignChildren = ["left", "center"];
        row.spacing = 6;
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var controls = {row: row};
        if (genderLabels !== null) {
            controls.gender = addRadios(row, genderLabels, person.gender, function(index) {
                person.gender = index;
                updatePreview();
            });
            controls.gender.group.preferredSize.width = GENDER_WIDTH;
        } else {
            row.add("group").preferredSize.width = GENDER_WIDTH;
        }
        controls.pheno = addRadios(row, PHENO_LABELS, person.pheno, function(index) {
            person.pheno = index;
            updatePreview();
        });
        controls.mark = addMarkList(row, person, controls.pheno.group);
        controls.pheno.group.enabled = person.mark === 0;
        return controls;
    }

    function addMarkList(row, person, phenoGroup) {
        var list = row.add("dropdownlist", undefined, MARK_LABELS);
        list.selection = person.mark;
        list.preferredSize.width = 56;
        list.onChange = function() {
            person.mark = list.selection.index;
            phenoGroup.enabled = person.mark === 0;
            updatePreview();
        };
        return list;
    }

    // 같은 group 안의 라디오 버튼은 서로 배타적이다
    function addRadios(parent, labels, index, onPick) {
        var group = parent.add("group");
        group.spacing = 2;
        var radios = [];
        for (var i = 0; i < labels.length; i++) {
            var radio = group.add("radiobutton", undefined, labels[i]);
            radio.value = i === index;
            radio.onClick = makePicker(i, onPick);
            radios.push(radio);
        }
        return {group: group, radios: radios};
    }

    function makePicker(index, onPick) {
        return function() { onPick(index); };
    }

    // 라벨 · 입력칸 · 단위 · ◀ · 슬라이더 · ▶ 를 한 줄에 배치
    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label);
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 5;
        input.justify = "right";
        var unitText = row.add("statictext", undefined, unit);
        unitText.preferredSize.width = UNIT_WIDTH;
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
        controls.down.onClick = function() { commit(getter() - controls.step); };
        controls.up.onClick = function() { commit(getter() + controls.step); };
    }

    // 위치 변경은 도형을 다시 만들지 않고 target()이 돌려주는 미리보기 그룹만 이동한다.
    function bindPositionRow(controls, getter, setter, isX, target) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (!moveItem(target(), isX ? delta : 0, isX ? 0 : delta)) {
                updatePreview();
                return;
            }
            previewSignature = settingsParts().join("|");
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

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return true;
        try {
            item.translate(deltaX, deltaY);
            return true;
        } catch (e) {
            return false;
        }
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
    function allMembers() {
        var list = [];
        for (var s = 0; s < sides.length; s++) {
            list.push(sides[s].grand[0], sides[s].grand[1], sides[s].parent);
            for (var i = 0; i < SIBLING_MAX; i++) list.push(sides[s].siblings[i]);
        }
        return list;
    }

    function settingsParts() {
        var parts = [SETTINGS_TAG, sizeMm, coupleGapMm, siblingGapMm, upperGapMm, lowerGapMm, branchPct,
            hatchCount, gridSize, offsetXmm, offsetYmm, legendOn ? 1 : 0, legendXmm, legendYmm,
            sides[0].count, sides[1].count];
        var members = allMembers();
        for (var i = 0; i < members.length; i++) {
            parts.push(members[i].gender, members[i].pheno, members[i].mark);
        }
        parts.push(childCount);
        for (i = 0; i < CHILD_MAX; i++) parts.push(children[i].kind, children[i].pheno, children[i].mark);
        return parts;
    }

    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, settingsParts().join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== SETTINGS_TAG || p.length !== SETTINGS_LENGTH) return;
        sizeMm = restoreNumber(p[1], sizeMm, 4, 6);
        coupleGapMm = restoreNumber(p[2], coupleGapMm, 2, 15);
        siblingGapMm = restoreNumber(p[3], siblingGapMm, 1, 15);
        upperGapMm = restoreNumber(p[4], upperGapMm, 8, 30);
        lowerGapMm = restoreNumber(p[5], lowerGapMm, 8, 30);
        branchPct = restoreNumber(p[6], branchPct, 20, 80);
        hatchCount = restoreNumber(p[7], hatchCount, 1, 9);
        gridSize = p[8] === "5" ? 5 : 4;
        offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        legendOn = p[11] === "1";
        legendXmm = restoreNumber(p[12], legendXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        legendYmm = restoreNumber(p[13], legendYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        sides[0].count = restoreNumber(p[14], 0, 0, SIBLING_MAX);
        sides[1].count = restoreNumber(p[15], 0, 0, SIBLING_MAX);
        var members = allMembers();
        var index = 16;
        for (var i = 0; i < members.length; i++) {
            var m = members[i];
            var fixedGender = m === sides[0].grand[0] || m === sides[0].grand[1] || m === sides[0].parent ||
                m === sides[1].grand[0] || m === sides[1].grand[1] || m === sides[1].parent;
            if (!fixedGender) m.gender = restoreNumber(p[index], m.gender, 0, 1);
            m.pheno = restoreNumber(p[index + 1], m.pheno, 0, 3);
            m.mark = restoreNumber(p[index + 2], m.mark, 0, 3);
            index += 3;
        }
        childCount = restoreNumber(p[index], childCount, 1, CHILD_MAX);
        index += 1;
        for (i = 0; i < CHILD_MAX; i++) {
            var kid = children[i];
            kid.kind = restoreNumber(p[index], kid.kind, 0, 2);
            kid.gender = kid.kind > 0 ? kid.kind - 1 : 0;
            kid.pheno = restoreNumber(p[index + 1], kid.pheno, 0, 3);
            kid.mark = restoreNumber(p[index + 2], kid.mark, 0, 3);
            index += 3;
        }
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
