// Object_Cell.jsx
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

// 세포 모식도: 동물 세포·식물 세포의 단면을 화면 가운데에 그리고, 구성 요소에 지시선과 이름(또는 기호)을 붙인다.
//   - 세포 바깥 모양(세포벽·세포막·세포질)은 스크립트가 그린다. 동물 세포는 둥근 부정형, 식물 세포는 둥근 모서리 사각형.
//   - 핵·마이토콘드리아·엽록체 그림은 이 파일 옆 Object_Cell_art 폴더에서 '<이름>.ai'를 먼저, 없으면 '<이름>.svg'를 불러온다.
//     일러스트에서 그린 것을 같은 이름의 .ai로 저장하면 그 그림으로 바뀐다 (가로로 긴 모양으로 그린다. 크기는 상관없다).
//   - 핵은 가운데에서 조금 왼쪽에 두고, 마이토콘드리아·엽록체는 배치 번호로 정해지는 무작위 자리에 서로 겹치지 않게 놓는다
//     (같은 번호면 늘 같은 배치). 엽록체·세포벽은 식물 세포에만 있다. 세포질 지시선은 소기관에서 가장 먼 빈 곳을 가리킨다.
//   - 지시선은 세포 오른쪽으로 뽑고, 가리키는 점의 높이 순서대로 이름을 고르게 쌓는다.
//     마이토콘드리아·엽록체는 오른쪽에 가장 가까운 것 하나를 가리킨다.
// 구성 요소는 중학교 과학1(2022 개정) 생물의 구성 단원의 여섯 가지다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectCell/settings";
    var ART_FOLDER = new Folder(new File($.fileName).parent.fsName + "/Object_Cell_art");
    var MM = 2.834645669;
    var KAPPA = 0.5522847498;
    var LINE_WIDTH_PT = 0.3;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 지시선을 붙일 수 있는 구성 요소 (체크 박스·라벨 순서)
    var PARTS = ["핵", "마이토콘드리아", "세포막", "세포질", "엽록체", "세포벽"];
    var PLANT_ONLY = {"엽록체": true, "세포벽": true};
    var SYMBOL_SETS = [
        {label: "이름", chars: null},
        {label: "A B", chars: ["A", "B", "C", "D", "E", "F"]},
        {label: "㉠ ㉡", chars: ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥"]},
        {label: "(가) (나)", chars: ["(가)", "(나)", "(다)", "(라)", "(마)", "(바)"]}
    ];
    // 핵 자리: 세포 가운데 기준, 안쪽 가로·세로 반지름에 대한 비율
    var NUCLEUS_POSITION = [-0.2, 0.05];
    // 소기관 길이 (세포 가로에 대한 비율)
    var ORGANELLE_SCALE = {"핵": 0.3, "마이토콘드리아": 0.18, "엽록체": 0.15};
    var SCATTER_TRIES = 400;
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [10, 200];
    var WALL_RANGE = [0.3, 5];
    var K_RANGE = [0, 60];
    var MITO_RANGE = [0, 12];
    var CHLORO_RANGE = [0, 16];
    var SEED_RANGE = [1, 99];
    var FONT_RANGE = [5, 20];
    var LEADER_RANGE = [2, 40];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var cellType = 0;          // 0 동물 세포, 1 식물 세포
    var widthMm = 45;
    var heightMm = 32;
    var wallMm = 1.2;
    var cytoplasmK = 10;
    var showNucleus = true;
    var mitoCount = 4;
    var chloroCount = 6;
    var seed = 1;
    var labelOn = {};
    for (var p = 0; p < PARTS.length; p++) labelOn[PARTS[p]] = true;
    var symbolSet = 0;
    var fontPt = 8;
    var leaderMm = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var cache = {};
    var cacheGroup = null;
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "세포 모식도");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var cellPanel = addPanel(dlg, "세포");
    var typeRow = cellPanel.add("group");
    typeRow.alignChildren = ["left", "center"];
    typeRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var animalRadio = typeRow.add("radiobutton", undefined, "동물 세포");
    var plantRadio = typeRow.add("radiobutton", undefined, "식물 세포");
    var widthRow = addValueRow(cellPanel, "가로", "mm", widthMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
    var heightRow = addValueRow(cellPanel, "세로", "mm", heightMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
    var wallRow = addValueRow(cellPanel, "세포벽 두께", "mm", wallMm, WALL_RANGE[0], WALL_RANGE[1], 0.1, 1);
    var kRow = addValueRow(cellPanel, "세포질 색", "K", cytoplasmK, K_RANGE[0], K_RANGE[1], 5, 0);

    var organellePanel = addPanel(dlg, "세포소기관");
    var nucleusCheck = organellePanel.add("checkbox", undefined, "핵");
    var mitoRow = addValueRow(organellePanel, "마이토콘드리아", "개", mitoCount, MITO_RANGE[0], MITO_RANGE[1], 1, 0);
    var chloroRow = addValueRow(organellePanel, "엽록체", "개", chloroCount, CHLORO_RANGE[0], CHLORO_RANGE[1], 1, 0);
    var seedRow = addValueRow(organellePanel, "배치 번호", "", seed, SEED_RANGE[0], SEED_RANGE[1], 1, 0);
    seedRow.input.helpTip = "번호를 바꾸면 마이토콘드리아·엽록체 자리가 바뀐다. 자리가 모자라면 들어가는 만큼만 놓는다";

    var labelPanel = addPanel(dlg, "지시선");
    var partChecks = {};
    var partRow = null;
    for (var i = 0; i < PARTS.length; i++) {
        if (i % 3 === 0) {
            partRow = labelPanel.add("group");
            partRow.alignChildren = ["left", "center"];
        }
        var check = partRow.add("checkbox", undefined, PARTS[i]);
        check.preferredSize.width = 120;
        partChecks[PARTS[i]] = check;
    }
    var symbolRow = labelPanel.add("group");
    symbolRow.alignChildren = ["left", "center"];
    symbolRow.add("statictext", undefined, "표시:").preferredSize.width = LABEL_WIDTH;
    var symbolRadios = [];
    for (var s = 0; s < SYMBOL_SETS.length; s++) symbolRadios.push(symbolRow.add("radiobutton", undefined, SYMBOL_SETS[s].label));
    var fontRow = addValueRow(labelPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);
    var leaderRow = addValueRow(labelPanel, "지시선 길이", "mm", leaderMm, LEADER_RANGE[0], LEADER_RANGE[1], 0.5, 1);
    leaderRow.input.helpTip = "세포 오른쪽 끝에서 글자까지 거리";

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

    animalRadio.value = cellType === 0;
    plantRadio.value = cellType === 1;
    nucleusCheck.value = showNucleus;
    for (var c = 0; c < PARTS.length; c++) partChecks[PARTS[c]].value = labelOn[PARTS[c]];
    symbolRadios[symbolSet].value = true;
    syncEnabled();

    animalRadio.onClick = function() { cellType = 0; syncEnabled(); updatePreview(); };
    plantRadio.onClick = function() { cellType = 1; syncEnabled(); updatePreview(); };
    nucleusCheck.onClick = function() { showNucleus = nucleusCheck.value; syncEnabled(); updatePreview(); };
    for (var pc = 0; pc < PARTS.length; pc++) {
        partChecks[PARTS[pc]].onClick = (function(name) {
            return function() { labelOn[name] = partChecks[name].value; syncEnabled(); updatePreview(); };
        })(PARTS[pc]);
    }
    for (var sr = 0; sr < symbolRadios.length; sr++) {
        symbolRadios[sr].onClick = (function(index) {
            return function() { symbolSet = index; updatePreview(); };
        })(sr);
    }
    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(heightRow, function() { return heightMm; }, function(v) { heightMm = v; });
    bindValueRow(wallRow, function() { return wallMm; }, function(v) { wallMm = v; });
    bindValueRow(kRow, function() { return cytoplasmK; }, function(v) { cytoplasmK = v; });
    bindValueRow(mitoRow, function() { return mitoCount; }, function(v) { mitoCount = v; syncEnabled(); });
    bindValueRow(chloroRow, function() { return chloroCount; }, function(v) { chloroCount = v; syncEnabled(); });
    bindValueRow(seedRow, function() { return seed; }, function(v) { seed = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindValueRow(leaderRow, function() { return leaderMm; }, function(v) { leaderMm = v; });
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
    clearCache();
    if (confirmed && previewGroup !== null) {
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // 식물에만 있는 것은 동물 세포에서 끄고, 없는 소기관의 지시선도 끈다
    function syncEnabled() {
        var plant = cellType === 1;
        setRowEnabled(wallRow, plant);
        setRowEnabled(chloroRow, plant);
        for (var i = 0; i < PARTS.length; i++) {
            var name = PARTS[i];
            partChecks[name].enabled = partPresent(name);
        }
    }

    function partPresent(name) {
        if (PLANT_ONLY[name] && cellType !== 1) return false;
        if (name === "핵") return showNucleus;
        if (name === "마이토콘드리아") return mitoCount > 0;
        if (name === "엽록체") return chloroCount > 0;
        return true;
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
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        var plant = cellType === 1;
        var w = widthMm * MM;
        var h = heightMm * MM;
        var cx = viewCenter[0];
        var cy = viewCenter[1];
        var wall = plant ? Math.min(wallMm * MM, Math.min(w, h) / 4) : 0;
        var black = makeGray(100);

        previewGroup = layer.groupItems.add();
        previewGroup.name = plant ? "Plant Cell" : "Animal Cell";

        // 세포벽: 바깥 둥근 사각형(면 K30) 위에 세포막이 겹친다
        var targets = {};
        if (plant) {
            var outer = drawPath(previewGroup, roundedRectPoints(cx, cy, w, h, Math.min(w, h) * 0.12), true);
            outer.name = "세포벽";
            styleShape(outer, black, makeGray(30));
            targets["세포벽"] = [cx + w / 2, cy - h * 0.12];
        }
        var inW = w - 2 * wall;
        var inH = h - 2 * wall;
        var membranePoints = plant
            ? roundedRectPoints(cx, cy, inW, inH, Math.max(Math.min(w, h) * 0.12 - wall, Math.min(inW, inH) * 0.06))
            : blobPoints(cx, cy, w / 2, h / 2);
        var membrane = drawPath(previewGroup, membranePoints, true);
        membrane.name = "세포막";
        styleShape(membrane, black, makeGray(cytoplasmK));
        // 동물 세포는 오른쪽 위(45°) 앵커가 막 위의 점이다
        targets["세포막"] = plant ? [cx + inW / 2, cy + inH * 0.28] : membranePoints[1].anchor;

        var rx = inW / 2;
        var ry = inH / 2;
        var organelles = previewGroup.groupItems.add();
        organelles.name = "Organelles";
        // 자리 잡기는 세포 가운데를 원점으로 한 pt 좌표. 핵은 고정, 나머지는 겹치지 않게 흩는다
        var placed = [];
        if (showNucleus) {
            var nucleus = placeOrganelle(organelles, "핵", cx + NUCLEUS_POSITION[0] * rx, cy + NUCLEUS_POSITION[1] * ry, 0, w);
            var nb = nucleus.geometricBounds;
            placed.push({x: (nb[0] + nb[2]) / 2 - cx, y: (nb[1] + nb[3]) / 2 - cy, hx: (nb[2] - nb[0]) / 2, hy: (nb[1] - nb[3]) / 2});
            targets["핵"] = [(nb[0] + nb[2]) / 2 + (nb[2] - nb[0]) * 0.3, (nb[1] + nb[3]) / 2];
        }
        var specs = [];
        addSpecs(specs, "마이토콘드리아", mitoCount, w);
        if (plant) addSpecs(specs, "엽록체", chloroCount, w);
        var spots = scatter(specs, placed, rx, ry, !plant, seed);
        for (var i = 0; i < spots.length; i++) {
            var spot = spots[i];
            placeOrganelle(organelles, spot.name, cx + spot.x, cy + spot.y, spot.angle, w);
            // 오른쪽에 가장 가까운 것을 가리킨다
            if (!targets[spot.name] || cx + spot.x > targets[spot.name][0]) targets[spot.name] = [cx + spot.x, cy + spot.y];
        }
        var empty = emptiestPoint(placed.concat(spots), rx, ry, !plant);
        targets["세포질"] = [cx + empty[0], cy + empty[1]];

        addLeaders(targets, cx + w / 2, cy, h);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    // 흩을 소기관: 그림의 가로·세로 비율로 길이 L·두께 T(pt)를 정한다
    function addSpecs(specs, name, count, cellWidth) {
        if (count <= 0) return;
        var b = loadArt(name).geometricBounds;
        var length = cellWidth * ORGANELLE_SCALE[name];
        var thickness = length * (b[1] - b[3]) / Math.max(b[2] - b[0], 0.01);
        for (var i = 0; i < count; i++) specs.push({name: name, length: length, thickness: thickness});
    }

    // 그림을 가로 길이로 맞춰 줄이고 돌린 뒤 가운데를 (x, y)에 둔다
    function placeOrganelle(container, name, x, y, angle, cellWidth) {
        var art = loadArt(name).duplicate(container, ElementPlacement.PLACEATEND);
        art.hidden = false;
        art.name = name;
        var b = art.geometricBounds;
        var scale = cellWidth * ORGANELLE_SCALE[name] / Math.max(b[2] - b[0], 0.01) * 100;
        art.resize(scale, scale, true, true, true, true, scale, Transformation.CENTER);
        if (angle !== 0) art.rotate(angle, true, true, true, true, Transformation.CENTER);
        b = art.geometricBounds;
        art.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
        return art;
    }

    // 가리키는 점의 높이 순서대로 세포 높이에 고르게 쌓은 이름에 직선 지시선을 긋는다
    function addLeaders(targets, rightX, cy, cellHeight) {
        var list = [];
        for (var i = 0; i < PARTS.length; i++) {
            var name = PARTS[i];
            if (labelOn[name] && partPresent(name) && targets[name]) list.push({name: name, point: targets[name]});
        }
        if (list.length === 0) return;
        list.sort(function(a, b) { return b.point[1] - a.point[1]; });
        var ys = labelHeights(list.length, cy, cellHeight);
        var chars = SYMBOL_SETS[symbolSet].chars;
        var labels = previewGroup.groupItems.add();
        labels.name = "Labels";
        var textX = rightX + leaderMm * MM;
        for (var j = 0; j < list.length; j++) {
            var line = labels.pathItems.add();
            line.setEntirePath([list[j].point, [textX - 1 * MM, ys[j]]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = makeGray(100);
            line.strokeWidth = LINE_WIDTH_PT;
            var text = labels.textFrames.add();
            text.contents = chars === null ? list[j].name : chars[j];
            text.textRange.characterAttributes.textFont = korFont;
            text.textRange.characterAttributes.size = fontPt;
            text.textRange.characterAttributes.fillColor = makeGray(100);
            var tb = text.geometricBounds;
            text.translate(textX - tb[0], ys[j] - (tb[1] + tb[3]) / 2);
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
    // 기하 (순수 계산)
    // -------------------------------------------------------
    // n개 이름의 높이: 세포 높이의 80% 안에 위에서부터 고르게. 하나면 가운데
    function labelHeights(n, cy, cellHeight) {
        var ys = [];
        if (n === 1) return [cy];
        var span = cellHeight * 0.8;
        for (var i = 0; i < n; i++) ys.push(cy + span / 2 - span * i / (n - 1));
        return ys;
    }

    // 같은 seed면 같은 수열 (0 이상 1 미만)
    function makeRandom(seed) {
        var state = (seed * 2654435761) % 4294967296;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // 소기관(spec: 길이·두께)을 세포 안쪽(반지름 rx·ry, 동물 세포면 타원, 아니면 사각형)에 서로 겹치지 않게 흩는다.
    // 이미 놓인 것(fixed: 가운데·반너비·반높이)도 피한다. 자리를 못 찾은 것은 뺀다.
    // 돌려주는 자리는 세포 가운데 기준 {name, x, y, angle, hx, hy}
    function scatter(specs, fixed, rx, ry, elliptic, seed) {
        var random = makeRandom(seed);
        var placed = fixed.slice(0);
        var result = [];
        var pad = Math.min(rx, ry) * 0.04;
        for (var i = 0; i < specs.length; i++) {
            var spec = specs[i];
            for (var t = 0; t < SCATTER_TRIES; t++) {
                var angle = Math.round(random() * 180 - 90);
                var rad = angle * Math.PI / 180;
                var c = Math.abs(Math.cos(rad));
                var s = Math.abs(Math.sin(rad));
                var box = {
                    x: (random() * 2 - 1) * rx, y: (random() * 2 - 1) * ry,
                    hx: c * spec.length / 2 + s * spec.thickness / 2,
                    hy: s * spec.length / 2 + c * spec.thickness / 2
                };
                if (!boxInside(box, rx - pad, ry - pad, elliptic) || overlapsAny(box, placed, pad)) continue;
                placed.push(box);
                result.push({name: spec.name, x: box.x, y: box.y, angle: angle, hx: box.hx, hy: box.hy});
                break;
            }
        }
        return result;
    }

    function boxInside(box, rx, ry, elliptic) {
        if (!elliptic) return Math.abs(box.x) + box.hx <= rx && Math.abs(box.y) + box.hy <= ry;
        var xs = [box.x - box.hx, box.x + box.hx];
        var ys = [box.y - box.hy, box.y + box.hy];
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < 2; j++) {
                if (Math.pow(xs[i] / rx, 2) + Math.pow(ys[j] / ry, 2) > 1) return false;
            }
        }
        return true;
    }

    function overlapsAny(box, boxes, pad) {
        for (var i = 0; i < boxes.length; i++) {
            var other = boxes[i];
            if (Math.abs(box.x - other.x) < box.hx + other.hx + pad && Math.abs(box.y - other.y) < box.hy + other.hy + pad) {
                return true;
            }
        }
        return false;
    }

    // 세포 오른쪽 절반의 격자점 중 소기관 상자에서 가장 먼 점 (세포질을 가리킬 자리. 지시선이 오른쪽으로 나간다)
    function emptiestPoint(boxes, rx, ry, elliptic) {
        var best = [0, 0];
        var bestScore = -1;
        var steps = 12;
        for (var i = 0; i <= steps; i++) {
            for (var j = 0; j <= steps; j++) {
                var x = i / steps * rx * 0.85;
                var y = (j / steps * 2 - 1) * ry * 0.85;
                if (!boxInside({x: x, y: y, hx: 0, hy: 0}, rx * 0.85, ry * 0.85, elliptic)) continue;
                var clearance = Math.min(rx, ry);
                for (var k = 0; k < boxes.length; k++) {
                    var b = boxes[k];
                    var dx = Math.max(Math.abs(x - b.x) - b.hx, 0);
                    var dy = Math.max(Math.abs(y - b.y) - b.hy, 0);
                    clearance = Math.min(clearance, Math.sqrt(dx * dx + dy * dy));
                }
                if (clearance > bestScore) {
                    bestScore = clearance;
                    best = [x, y];
                }
            }
        }
        return best;
    }

    // 동물 세포: 가로·세로 반지름에 8방향마다 조금씩 다른 배율을 곱한 매끈한 닫힌 곡선
    function blobPoints(cx, cy, rx, ry) {
        var wobble = [1, 0.94, 1.03, 0.96, 1, 0.95, 1.02, 0.93];
        var n = wobble.length;
        var points = [];
        var k = 4 / 3 * Math.tan(Math.PI / (2 * n));
        for (var i = 0; i < n; i++) {
            var t = 2 * Math.PI * i / n;
            var x = cx + rx * wobble[i] * Math.cos(t);
            var y = cy + ry * wobble[i] * Math.sin(t);
            // 접선: 타원의 미분에 배율을 곱한다
            var tx = -rx * wobble[i] * Math.sin(t) * k;
            var ty = ry * wobble[i] * Math.cos(t) * k;
            points.push({anchor: [x, y], left: [x - tx, y - ty], right: [x + tx, y + ty]});
        }
        return points;
    }

    // 가운데 (cx, cy), 너비 w, 높이 h, 모서리 반지름 r인 둥근 사각형 (시계 반대 방향)
    function roundedRectPoints(cx, cy, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        var l = cx - w / 2;
        var rt = cx + w / 2;
        var t = cy + h / 2;
        var b = cy - h / 2;
        var k = KAPPA * r;
        return [
            {anchor: [rt, b + r], left: [rt, b + r - k], right: [rt, b + r]},
            {anchor: [rt, t - r], left: [rt, t - r], right: [rt, t - r + k]},
            {anchor: [rt - r, t], left: [rt - r + k, t], right: [rt - r, t]},
            {anchor: [l + r, t], left: [l + r, t], right: [l + r - k, t]},
            {anchor: [l, t - r], left: [l, t - r + k], right: [l, t - r]},
            {anchor: [l, b + r], left: [l, b + r], right: [l, b + r - k]},
            {anchor: [l + r, b], left: [l + r - k, b], right: [l + r, b]},
            {anchor: [rt - r, b], left: [rt - r, b], right: [rt - r + k, b]}
        ];
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    // 파일에서 한 번만 불러와 캐시에 숨겨 둔다. 미리보기는 복제본을 쓴다
    function loadArt(name) {
        if (cache[name]) return cache[name];
        if (cacheGroup === null) {
            cacheGroup = layer.groupItems.add();
            cacheGroup.name = "Cell Cache";
        }
        var art = null;
        var file = findArtFile(name);
        if (file !== null) {
            try {
                doc.activeLayer = layer;
                art = doc.groupItems.createFromFile(file);
                art.move(cacheGroup, ElementPlacement.PLACEATEND);
            } catch (loadError) {
                try { if (art !== null) art.remove(); } catch (e) {}
                art = null;
            }
        }
        if (art === null) art = drawPlaceholder(cacheGroup, name);
        // 숨긴 그룹에는 넣을 수 없어서 그룹 대신 그림마다 숨긴다
        art.hidden = true;
        cache[name] = art;
        return art;
    }

    // 그림 파일이 없을 때: 가로로 긴 타원
    function drawPlaceholder(container, name) {
        var group = container.groupItems.add();
        var shape = group.pathItems.ellipse(10, 0, 30, 20);
        styleShape(shape, makeGray(100), makeGray(40));
        return group;
    }

    function clearCache() {
        if (cacheGroup === null) return;
        try { cacheGroup.remove(); } catch (e) {}
        cacheGroup = null;
        cache = {};
    }

    function findArtFile(name) {
        var extensions = [".ai", ".svg"];
        for (var i = 0; i < extensions.length; i++) {
            var file = new File(ART_FOLDER.fsName + "/" + name + extensions[i]);
            if (file.exists) return file;
        }
        return null;
    }

    function drawPath(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = PointType.SMOOTH;
        }
        path.closed = closed;
        return path;
    }

    function styleShape(path, stroke, fill) {
        path.stroked = true;
        path.strokeColor = stroke;
        path.strokeWidth = LINE_WIDTH_PT;
        path.filled = true;
        path.fillColor = fill;
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
        var flags = [];
        for (var i = 0; i < PARTS.length; i++) flags.push(labelOn[PARTS[i]] ? "1" : "0");
        var parts = ["v2", cellType, widthMm, heightMm, wallMm, cytoplasmK, showNucleus ? "1" : "0", mitoCount,
            chloroCount, seed, flags.join(""), symbolSet, fontPt, leaderMm, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 17) return;
        cellType = p[1] === "1" ? 1 : 0;
        widthMm = restoreNumber(p[2], widthMm, SIZE_RANGE, 0.5);
        heightMm = restoreNumber(p[3], heightMm, SIZE_RANGE, 0.5);
        wallMm = restoreNumber(p[4], wallMm, WALL_RANGE, 0.1);
        cytoplasmK = restoreNumber(p[5], cytoplasmK, K_RANGE, 5);
        showNucleus = p[6] === "1";
        mitoCount = restoreNumber(p[7], mitoCount, MITO_RANGE, 1);
        chloroCount = restoreNumber(p[8], chloroCount, CHLORO_RANGE, 1);
        seed = restoreNumber(p[9], seed, SEED_RANGE, 1);
        if (p[10].length === PARTS.length) {
            for (var i = 0; i < PARTS.length; i++) labelOn[PARTS[i]] = p[10].charAt(i) === "1";
        }
        symbolSet = restoreNumber(p[11], symbolSet, [0, SYMBOL_SETS.length - 1], 1);
        fontPt = restoreNumber(p[12], fontPt, FONT_RANGE, 0.5);
        leaderMm = restoreNumber(p[13], leaderMm, LEADER_RANGE, 0.5);
        offsetXmm = restoreNumber(p[14], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[15], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[16] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
