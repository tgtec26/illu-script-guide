// Object_FoodChain.jsx
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

// 먹이 사슬·먹이그물: 두 번 실행해서 완성한다.
//   1) 배치: 선택한 생물이 없으면 생물을 체크 박스로 골라 배치한다. 먹이 단계(생산자 맨 아래)마다 한 줄씩 놓고,
//      'FoodChain' 그룹 하나에 생물 그룹('FoodChain:벼' 등)을 담는다. 배치한 뒤 생물 위치를 손으로 옮긴다.
//   2) 연결: 'FoodChain' 그룹이나 생물 2개 이상을 선택하고 다시 실행(F4)하면, 아래 FEEDS 표에 따라
//      피식자 → 포식자 화살표를 그린다. 다시 옮긴 뒤 또 실행하면 이전 화살표를 지우고 새로 그린다.
// 생물 그림: 이 파일 옆 Object_FoodChain_art 폴더에서 '<이름>.ai'를 먼저, 없으면 '<이름>.svg'를 찾는다.
//   둘 다 없으면 이름을 적은 둥근 상자를 넣는다. 그림을 바꾸려면 일러스트에서 그린 것을 '<이름>.ai'로 저장한다
//   (아트보드 하나에 생물 하나. 크기·위치는 상관없고 그림 크기 옵션에 맞춰 줄인다).
// 생물 목록(WEBS)과 먹이 관계(FEEDS)는 교재(비상 완자 기출픽·오투 1-1 생물다양성보전)의 먹이그물 그림을 옮긴 것이다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    // -------------------------------------------------------
    // 생물 · 먹이 관계
    // -------------------------------------------------------
    var WEBS = [
        {name: "육상", organisms: ["벼", "배추", "옥수수", "메뚜기", "배추흰나비", "개구리", "참새", "뱀", "매"]},
        {name: "해양", organisms: ["식물성 플랑크톤", "동물성 플랑크톤", "남극크릴", "남극은암치", "남극이빨고기",
            "아델리펭귄", "얼룩무늬물범", "코끼리물범", "범고래"]}
    ];
    // [피식자, 포식자]
    var FEEDS = [
        ["벼", "메뚜기"], ["벼", "참새"],
        ["배추", "배추흰나비"], ["배추", "메뚜기"], ["배추", "참새"],
        ["옥수수", "메뚜기"], ["옥수수", "참새"],
        ["메뚜기", "개구리"], ["메뚜기", "참새"],
        ["배추흰나비", "개구리"],
        ["개구리", "뱀"], ["개구리", "매"],
        ["참새", "매"],
        ["뱀", "매"],
        ["식물성 플랑크톤", "동물성 플랑크톤"], ["식물성 플랑크톤", "남극크릴"], ["식물성 플랑크톤", "남극은암치"],
        ["동물성 플랑크톤", "남극은암치"], ["동물성 플랑크톤", "남극이빨고기"],
        ["남극크릴", "남극은암치"], ["남극크릴", "아델리펭귄"],
        ["남극은암치", "남극이빨고기"], ["남극은암치", "아델리펭귄"], ["남극은암치", "얼룩무늬물범"],
        ["남극은암치", "코끼리물범"],
        ["남극이빨고기", "아델리펭귄"], ["남극이빨고기", "얼룩무늬물범"], ["남극이빨고기", "코끼리물범"],
        ["아델리펭귄", "얼룩무늬물범"], ["아델리펭귄", "범고래"],
        ["얼룩무늬물범", "범고래"],
        ["코끼리물범", "범고래"]
    ];

    var PLACE_PREF_KEY = "ObjectFoodChain/settings";
    var ARROW_PREF_KEY = "ObjectFoodChain/arrows";
    var GROUP_NAME = "FoodChain";
    var ITEM_PREFIX = "FoodChain:";
    var ARROWS_NAME = "FoodChain Arrows";
    var ART_FOLDER = new Folder(new File($.fileName).parent.fsName + "/Object_FoodChain_art");
    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    var LABEL_GAP_MM = 1;
    var CHECK_COLUMNS = 3;
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [5, 60];
    var GAP_RANGE = [0, 60];
    var FONT_RANGE = [5, 20];
    var LINE_RANGE = [0.1, 3];
    var HEAD_RANGE = [20, 300];
    var CLEAR_RANGE = [0, 10];
    var BEND_RANGE = [0, 45];
    var K_RANGE = [10, 100];

    var doc = app.activeDocument;
    var found = collectOrganisms(doc.selection);
    if (found.length >= 2) {
        runConnect(found);
    } else {
        runPlace();
    }

    // =======================================================
    // 1) 배치
    // =======================================================
    function runPlace() {
        var checked = {};
        var sizeMm = 15;
        var hGapMm = 10;
        var vGapMm = 10;
        var showLabel = true;
        var fontPt = 8;
        var offsetXmm = 0;
        var offsetYmm = 0;
        var previewEnabled = true;
        readPlaceSettings();

        var layer = findEditableLayer();
        var viewCenter = doc.activeView.centerPoint;
        var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
        var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
        var batangFont = findOptionalFont("Batang");
        var ENG_BASELINE_PT = 0.5;
        var cache = {};          // 이름 → 불러온 그림 (숨긴 캐시 그룹 안)
        var cacheGroup = null;
        var previewGroup = null;

        var dlg = new Window("dialog", "먹이 사슬 · 배치");
        dlg.orientation = "column";
        dlg.alignChildren = "fill";
        dlg.spacing = 6;
        dlg.margins = 12;

        var boxes = {};
        for (var w = 0; w < WEBS.length; w++) addWebPanel(WEBS[w]);

        var shapePanel = addPanel(dlg, "모양");
        var sizeRow = addValueRow(shapePanel, "그림 크기", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
        sizeRow.input.helpTip = "그림의 긴 변 길이";
        var hGapRow = addValueRow(shapePanel, "가로 간격", "mm", hGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.5, 1);
        var vGapRow = addValueRow(shapePanel, "단계 간격", "mm", vGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.5, 1);
        vGapRow.input.helpTip = "먹이 단계(줄) 사이 거리";
        var labelCheck = shapePanel.add("checkbox", undefined, "이름 표시");
        var fontRow = addValueRow(shapePanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

        var positionPanel = addPanel(dlg, "위치");
        var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
        var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

        var hint = dlg.add("statictext", undefined, "배치 → 위치 조정 → 그룹 선택 후 다시 실행하면 화살표 연결");
        hint.helpTip = "생물을 옮기려면 그룹을 더블클릭해 격리 모드로 들어가거나 직접 선택 도구를 쓴다";

        var footer = dlg.add("group");
        var previewCheck = footer.add("checkbox", undefined, "미리보기");
        previewCheck.value = previewEnabled;
        var footerSpacer = footer.add("group");
        footerSpacer.alignment = ["fill", "center"];
        // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = footer.add("button", undefined, "확인");
        try { dlg.defaultElement = null; } catch (defaultError) {}
        footer.add("button", undefined, "취소", {name: "cancel"});

        labelCheck.value = showLabel;
        fontRow.input.enabled = fontRow.slider.enabled = showLabel;
        labelCheck.onClick = function() {
            showLabel = labelCheck.value;
            fontRow.input.enabled = fontRow.slider.enabled = showLabel;
            updatePreview();
        };
        bindValueRow(sizeRow, function() { return sizeMm; }, function(v) { sizeMm = v; }, updatePreview);
        bindValueRow(hGapRow, function() { return hGapMm; }, function(v) { hGapMm = v; }, updatePreview);
        bindValueRow(vGapRow, function() { return vGapMm; }, function(v) { vGapMm = v; }, updatePreview);
        bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; }, updatePreview);
        bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true, movePreview);
        bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false, movePreview);
        previewCheck.onClick = function() {
            previewEnabled = previewCheck.value;
            updatePreview();
        };
        okButton.onClick = function() {
            if (selectedNames().length === 0) {
                alert("생물을 하나 이상 고르세요.");
                return;
            }
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

        function addWebPanel(web) {
            var panel = addPanel(dlg, web.name);
            var row = null;
            for (var i = 0; i < web.organisms.length; i++) {
                if (i % CHECK_COLUMNS === 0) {
                    row = panel.add("group");
                    row.alignChildren = ["left", "center"];
                }
                var name = web.organisms[i];
                var box = row.add("checkbox", undefined, name);
                box.preferredSize.width = 130;
                box.value = checked[name] === true;
                box.onClick = function() { updatePreview(); };
                boxes[name] = box;
            }
            var buttons = panel.add("group");
            var allButton = buttons.add("button", undefined, "모두 선택");
            var noneButton = buttons.add("button", undefined, "모두 해제");
            allButton.onClick = function() { setWeb(web, true); };
            noneButton.onClick = function() { setWeb(web, false); };
        }

        function setWeb(web, value) {
            for (var i = 0; i < web.organisms.length; i++) boxes[web.organisms[i]].value = value;
            updatePreview();
        }

        function selectedNames() {
            var names = [];
            for (var w = 0; w < WEBS.length; w++) {
                for (var i = 0; i < WEBS[w].organisms.length; i++) {
                    var name = WEBS[w].organisms[i];
                    if (boxes[name].value) names.push(name);
                }
            }
            return names;
        }

        function updatePreview() {
            clearPreview();
            if (previewEnabled) buildPreview();
            app.redraw();
        }

        // 먹이 단계마다 한 줄. 생산자가 맨 아래, 줄마다 화면 가운데에 맞춘다
        function buildPreview() {
            var names = selectedNames();
            if (names.length === 0) return;
            var levels = trophicLevels(names, FEEDS);
            var rows = [];
            for (var i = 0; i < names.length; i++) {
                var level = levels[names[i]];
                while (rows.length < level) rows.push([]);
                rows[level - 1].push(names[i]);
            }

            var size = sizeMm * MM;
            var labelHeight = showLabel ? fontPt * 1.2 + LABEL_GAP_MM * MM : 0;
            var rowPitch = size + labelHeight + vGapMm * MM;
            var colPitch = size + hGapMm * MM;
            var totalHeight = rows.length * rowPitch - vGapMm * MM;
            var bottom = viewCenter[1] - totalHeight / 2 + labelHeight;

            previewGroup = layer.groupItems.add();
            previewGroup.name = GROUP_NAME;
            for (var r = 0; r < rows.length; r++) {
                var rowWidth = rows[r].length * colPitch - hGapMm * MM;
                var left = viewCenter[0] - rowWidth / 2;
                var boxBottom = bottom + r * rowPitch;
                for (var c = 0; c < rows[r].length; c++) {
                    placeOrganism(rows[r][c], left + c * colPitch, boxBottom, size);
                }
            }
            if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
        }

        // 그림은 size × size 상자 안에 비율대로 줄여 가운데, 상자 바닥에 맞춘다. 이름은 상자 아래
        function placeOrganism(name, left, boxBottom, size) {
            var group = previewGroup.groupItems.add();
            group.name = ITEM_PREFIX + name;

            var art = loadArt(name).duplicate(group, ElementPlacement.PLACEATBEGINNING);
            art.hidden = false;
            art.name = "Art";
            var b = art.geometricBounds;
            var w = b[2] - b[0];
            var h = b[1] - b[3];
            var scale = size / Math.max(w, h, 0.01) * 100;
            art.resize(scale, scale, true, true, true, true, scale, Transformation.CENTER);
            b = art.geometricBounds;
            w = b[2] - b[0];
            art.translate(left + (size - w) / 2 - b[0], boxBottom - b[3]);

            if (showLabel) {
                var label = group.textFrames.add();
                label.name = "Label";
                label.contents = name;
                label.textRange.characterAttributes.size = fontPt;
                label.textRange.characterAttributes.fillColor = makeGray(100);
                applyTextFonts(label);
                label.textRange.paragraphAttributes.justification = Justification.CENTER;
                label.position = [0, 0];
                var lb = label.geometricBounds;
                label.translate(left + size / 2 - (lb[0] + lb[2]) / 2, boxBottom - LABEL_GAP_MM * MM - lb[1]);
            }
        }

        // 파일에서 한 번만 불러와 캐시 그룹에 숨겨 둔다. 미리보기는 복제본을 쓴다
        function loadArt(name) {
            if (cache[name]) return cache[name];
            if (cacheGroup === null) {
                cacheGroup = layer.groupItems.add();
                cacheGroup.name = GROUP_NAME + " Cache";
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

        // 이름을 적은 둥근 상자 (그림 파일이 없을 때)
        function drawPlaceholder(container, name) {
            var group = container.groupItems.add();
            var size = 30 * MM;
            var box = group.pathItems.roundedRectangle(size, 0, size, size, 3 * MM, 3 * MM);
            box.filled = true;
            box.fillColor = makeGray(10);
            box.stroked = true;
            box.strokeColor = makeGray(50);
            box.strokeWidth = 0.5;
            var text = group.textFrames.add();
            text.contents = name;
            text.textRange.characterAttributes.size = 7;
            text.textRange.characterAttributes.fillColor = makeGray(60);
            applyTextFonts(text);
            var tb = text.geometricBounds;
            text.translate(size / 2 - (tb[0] + tb[2]) / 2, size / 2 - (tb[1] + tb[3]) / 2);
            return group;
        }

        function clearPreview() {
            if (previewGroup === null) return;
            try { previewGroup.remove(); } catch (e) {}
            previewGroup = null;
        }

        function clearCache() {
            if (cacheGroup === null) return;
            try { cacheGroup.remove(); } catch (e) {}
            cacheGroup = null;
            cache = {};
        }

        function movePreview(deltaX, deltaY) {
            if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
            try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
        }

        function saveSettings() {
            var parts = ["v1", selectedNames().join(","), sizeMm, hGapMm, vGapMm, showLabel ? "1" : "0", fontPt,
                offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
            try { app.preferences.setStringPreference(PLACE_PREF_KEY, parts.join("|")); } catch (e) {}
        }

        function readPlaceSettings() {
            var raw = "";
            try { raw = app.preferences.getStringPreference(PLACE_PREF_KEY); } catch (e) { return; }
            if (!raw) return;
            var p = raw.split("|");
            if (p[0] !== "v1" || p.length !== 10) return;
            var names = p[1] === "" ? [] : p[1].split(",");
            for (var i = 0; i < names.length; i++) {
                if (isKnownOrganism(names[i])) checked[names[i]] = true;
            }
            sizeMm = restoreNumber(p[2], sizeMm, SIZE_RANGE, 0.5);
            hGapMm = restoreNumber(p[3], hGapMm, GAP_RANGE, 0.5);
            vGapMm = restoreNumber(p[4], vGapMm, GAP_RANGE, 0.5);
            showLabel = p[5] === "1";
            fontPt = restoreNumber(p[6], fontPt, FONT_RANGE, 0.5);
            offsetXmm = restoreNumber(p[7], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
            offsetYmm = restoreNumber(p[8], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
            previewEnabled = p[9] === "1";
        }
    }

    // =======================================================
    // 2) 연결
    // =======================================================
    function runConnect(organisms) {
        var lineWidthPt = 0.5;
        var headScale = 60;
        var clearMm = 1;
        var bendDeg = 0;
        var lineK = 100;
        var previewEnabled = true;
        readArrowSettings();

        var links = findLinks(organisms);
        var host = commonFoodChainGroup(organisms);
        var container = host !== null ? host : organisms[0].item.parent;
        var oldArrows = findOldArrows(host);
        var arrowGroup = null;

        var dlg = new Window("dialog", "먹이 사슬 · 화살표 연결");
        dlg.orientation = "column";
        dlg.alignChildren = "fill";
        dlg.spacing = 6;
        dlg.margins = 12;

        var info = dlg.add("statictext", undefined,
            "생물 " + organisms.length + "개 · 화살표 " + links.length + "개 (피식자 → 포식자)");
        if (oldArrows.length > 0) info.text += " · 이전 화살표는 지우고 다시 그림";

        var arrowPanel = addPanel(dlg, "화살표");
        var lineRow = addValueRow(arrowPanel, "선 두께", "pt", lineWidthPt, LINE_RANGE[0], LINE_RANGE[1], 0.1, 1);
        var headRow = addValueRow(arrowPanel, "화살촉 크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);
        var clearRow = addValueRow(arrowPanel, "그림과 간격", "mm", clearMm, CLEAR_RANGE[0], CLEAR_RANGE[1], 0.1, 1);
        var bendRow = addValueRow(arrowPanel, "휘기", "°", bendDeg, BEND_RANGE[0], BEND_RANGE[1], 1, 0);
        bendRow.input.helpTip = "0이면 직선. 화살표가 겹칠 때 휘어서 가른다";
        var kRow = addValueRow(arrowPanel, "선 색", "K", lineK, K_RANGE[0], K_RANGE[1], 10, 0);

        var footer = dlg.add("group");
        var previewCheck = footer.add("checkbox", undefined, "미리보기");
        previewCheck.value = previewEnabled;
        var footerSpacer = footer.add("group");
        footerSpacer.alignment = ["fill", "center"];
        // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = footer.add("button", undefined, "완료");
        try { dlg.defaultElement = null; } catch (defaultError) {}
        footer.add("button", undefined, "취소", {name: "cancel"});

        bindValueRow(lineRow, function() { return lineWidthPt; }, function(v) { lineWidthPt = v; }, updatePreview);
        bindValueRow(headRow, function() { return headScale; }, function(v) { headScale = v; }, updatePreview);
        bindValueRow(clearRow, function() { return clearMm; }, function(v) { clearMm = v; }, updatePreview);
        bindValueRow(bendRow, function() { return bendDeg; }, function(v) { bendDeg = v; }, updatePreview);
        bindValueRow(kRow, function() { return lineK; }, function(v) { lineK = v; }, updatePreview);
        previewCheck.onClick = function() {
            previewEnabled = previewCheck.value;
            updatePreview();
        };
        okButton.onClick = function() {
            if (arrowGroup === null) buildArrows();
            saveSettings();
            dlg.close(1);
        };

        if (links.length === 0) {
            alert("선택한 생물 사이에 먹이 관계가 없습니다.");
            return;
        }

        setHidden(oldArrows, true);
        updatePreview();

        if (typeof bindTabOrder === "function") bindTabOrder(dlg);
        if (dlg.show() === 1) {
            for (var i = 0; i < oldArrows.length; i++) {
                try { oldArrows[i].remove(); } catch (removeError) {}
            }
            doc.selection = null;
            try { (host !== null ? host : arrowGroup).selected = true; } catch (selectError) {}
        } else {
            clearArrows();
            setHidden(oldArrows, false);
        }
        app.redraw();

        function updatePreview() {
            clearArrows();
            if (previewEnabled) buildArrows();
            app.redraw();
        }

        // 화살표는 생물 뒤(그룹 맨 아래)에 둔다
        function buildArrows() {
            arrowGroup = container.groupItems.add();
            arrowGroup.name = ARROWS_NAME;
            arrowGroup.move(container, ElementPlacement.PLACEATEND);
            var color = makeGray(lineK);
            var paths = [];
            for (var i = 0; i < links.length; i++) {
                var from = links[i].prey.item.geometricBounds;
                var to = links[i].predator.item.geometricBounds;
                var points = arrowPoints(from, to, clearMm * MM, bendDeg);
                if (points === null) continue;
                var path = arrowGroup.pathItems.add();
                path.name = links[i].prey.name + " → " + links[i].predator.name;
                path.setEntirePath([points[0], points[3]]);
                path.pathPoints[0].rightDirection = points[1];
                path.pathPoints[1].leftDirection = points[2];
                path.filled = false;
                path.stroked = true;
                path.strokeColor = color;
                path.strokeWidth = lineWidthPt;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                paths.push(path);
            }
            applyArrowheads(paths, lineWidthPt, headScale);
        }

        function clearArrows() {
            if (arrowGroup === null) return;
            try { arrowGroup.remove(); } catch (e) {}
            arrowGroup = null;
        }

        function saveSettings() {
            var parts = ["v1", lineWidthPt, headScale, clearMm, bendDeg, lineK, previewEnabled ? "1" : "0"];
            try { app.preferences.setStringPreference(ARROW_PREF_KEY, parts.join("|")); } catch (e) {}
        }

        function readArrowSettings() {
            var raw = "";
            try { raw = app.preferences.getStringPreference(ARROW_PREF_KEY); } catch (e) { return; }
            if (!raw) return;
            var p = raw.split("|");
            if (p[0] !== "v1" || p.length !== 7) return;
            lineWidthPt = restoreNumber(p[1], lineWidthPt, LINE_RANGE, 0.1);
            headScale = restoreNumber(p[2], headScale, HEAD_RANGE, 10);
            clearMm = restoreNumber(p[3], clearMm, CLEAR_RANGE, 0.1);
            bendDeg = restoreNumber(p[4], bendDeg, BEND_RANGE, 1);
            lineK = restoreNumber(p[5], lineK, K_RANGE, 10);
            previewEnabled = p[6] === "1";
        }
    }

    // -------------------------------------------------------
    // 먹이 관계 (순수 계산)
    // -------------------------------------------------------
    // 먹이 단계: 고른 생물 안에서 먹는 것이 없으면 1, 아니면 먹이 중 가장 높은 단계 + 1
    function trophicLevels(names, feeds) {
        var inSet = {};
        for (var i = 0; i < names.length; i++) inSet[names[i]] = true;
        var levels = {};
        function levelOf(name, depth) {
            if (levels[name]) return levels[name];
            var level = 1;
            if (depth < names.length) {
                for (var f = 0; f < feeds.length; f++) {
                    if (feeds[f][1] === name && inSet[feeds[f][0]]) {
                        level = Math.max(level, levelOf(feeds[f][0], depth + 1) + 1);
                    }
                }
            }
            levels[name] = level;
            return level;
        }
        for (var n = 0; n < names.length; n++) levelOf(names[n], 0);
        return levels;
    }

    // 사각형 a에서 b로 가는 화살표의 베지어 네 점 [시작, 시작 핸들, 끝 핸들, 끝].
    // 가운데끼리 잇는 방향을 bend°만큼 (시작은 왼쪽, 끝은 오른쪽으로) 돌려 휘게 하고,
    // 두 끝은 사각형을 clear만큼 넓힌 테두리에서 멈춘다. 사각형이 겹쳐 그릴 수 없으면 null
    function arrowPoints(a, b, clear, bend) {
        var ca = [(a[0] + a[2]) / 2, (a[1] + a[3]) / 2];
        var cb = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
        var dx = cb[0] - ca[0];
        var dy = cb[1] - ca[1];
        var length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.01) return null;
        var base = Math.atan2(dy, dx);
        var turn = bend * Math.PI / 180;
        var startDir = [Math.cos(base + turn), Math.sin(base + turn)];
        var endDir = [Math.cos(base - turn), Math.sin(base - turn)];
        var start = rayExit(ca, startDir, (a[2] - a[0]) / 2 + clear, (a[1] - a[3]) / 2 + clear);
        var end = rayExit(cb, [-endDir[0], -endDir[1]], (b[2] - b[0]) / 2 + clear, (b[1] - b[3]) / 2 + clear);
        var ex = end[0] - start[0];
        var ey = end[1] - start[1];
        // 끝이 시작보다 뒤로 가면(겹침) 그리지 않는다
        if (ex * dx + ey * dy <= 0) return null;
        var reach = Math.sqrt(ex * ex + ey * ey) / 3;
        return [
            start,
            [start[0] + startDir[0] * reach, start[1] + startDir[1] * reach],
            [end[0] - endDir[0] * reach, end[1] - endDir[1] * reach],
            end
        ];
    }

    // 가운데 c에서 dir 방향으로 나가 반너비 hw·반높이 hh 사각형 테두리와 만나는 점
    function rayExit(c, dir, hw, hh) {
        var tx = Math.abs(dir[0]) > 1e-9 ? hw / Math.abs(dir[0]) : Infinity;
        var ty = Math.abs(dir[1]) > 1e-9 ? hh / Math.abs(dir[1]) : Infinity;
        var t = Math.min(tx, ty);
        return [c[0] + dir[0] * t, c[1] + dir[1] * t];
    }

    // -------------------------------------------------------
    // 문서에서 생물 찾기
    // -------------------------------------------------------
    // 선택 안의 생물 그룹('FoodChain:이름'). 'FoodChain' 그룹을 고르면 그 안의 생물 전부,
    // 생물 안쪽 조각을 고르면 그 생물. 같은 개체는 한 번만
    function collectOrganisms(selection) {
        var result = [];
        if (!selection || selection.length === undefined) return result;
        function add(item) {
            for (var i = 0; i < result.length; i++) if (result[i].item === item) return;
            result.push({item: item, name: item.name.substring(ITEM_PREFIX.length)});
        }
        function visit(item) {
            if (item.typename !== "GroupItem") return;
            if (isOrganism(item)) { add(item); return; }
            for (var i = 0; i < item.groupItems.length; i++) visit(item.groupItems[i]);
        }
        for (var s = 0; s < selection.length; s++) {
            var item = selection[s];
            var up = item;
            while (up && up.typename !== "Layer" && up.typename !== "Document") {
                if (up.typename === "GroupItem" && isOrganism(up)) break;
                up = up.parent;
            }
            if (up && up.typename === "GroupItem" && isOrganism(up)) add(up);
            else visit(item);
        }
        return result;
    }

    function isOrganism(item) {
        return item.name.indexOf(ITEM_PREFIX) === 0 && isKnownOrganism(item.name.substring(ITEM_PREFIX.length));
    }

    function isKnownOrganism(name) {
        for (var w = 0; w < WEBS.length; w++) {
            for (var i = 0; i < WEBS[w].organisms.length; i++) if (WEBS[w].organisms[i] === name) return true;
        }
        return false;
    }

    function findLinks(organisms) {
        var links = [];
        for (var f = 0; f < FEEDS.length; f++) {
            for (var i = 0; i < organisms.length; i++) {
                if (organisms[i].name !== FEEDS[f][0]) continue;
                for (var j = 0; j < organisms.length; j++) {
                    if (organisms[j].name === FEEDS[f][1]) links.push({prey: organisms[i], predator: organisms[j]});
                }
            }
        }
        return links;
    }

    // 모든 생물이 같은 'FoodChain' 그룹 안에 있으면 그 그룹
    function commonFoodChainGroup(organisms) {
        var parent = organisms[0].item.parent;
        if (parent.typename !== "GroupItem" || parent.name !== GROUP_NAME) return null;
        for (var i = 1; i < organisms.length; i++) if (organisms[i].item.parent !== parent) return null;
        return parent;
    }

    function findOldArrows(host) {
        var list = [];
        if (host === null) return list;
        for (var i = 0; i < host.groupItems.length; i++) {
            if (host.groupItems[i].name === ARROWS_NAME) list.push(host.groupItems[i]);
        }
        return list;
    }

    function setHidden(items, hidden) {
        for (var i = 0; i < items.length; i++) {
            try { items[i].hidden = hidden; } catch (e) {}
        }
    }

    function findArtFile(name) {
        var extensions = [".ai", ".svg"];
        for (var i = 0; i < extensions.length; i++) {
            var file = new File(ART_FOLDER.fsName + "/" + name + extensions[i]);
            if (file.exists) return file;
        }
        return null;
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
    // 화살촉 (DOM에 없는 속성이라 임시 액션으로 끝 화살촉만 넣는다)
    // -------------------------------------------------------
    function applyArrowheads(paths, weight, scale) {
        if (paths.length === 0) return;
        var actionSetName = "Codex_FoodChain";
        var actionName = "FoodChainArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_FoodChainArrowheads.aia");
        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) paths[i].selected = true;
            writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살촉 이름은 UI 언어에 따라 다르다. 실패해도 선은 그대로 남는다
        }
        try { app.unloadAction(actionSetName, ""); } catch (e2) {}
        try { actionFile.remove(); } catch (e3) {}
        doc.selection = null;
    }

    // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
    function toActionHex(text) {
        var bytes = [];
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }
        var hex = "";
        for (var j = 0; j < bytes.length; j++) {
            var part = bytes[j].toString(16).toUpperCase();
            if (part.length < 2) part = "0" + part;
            hex += part;
        }
        return {hex: hex, length: bytes.length};
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var arrow = toActionHex(ARROW_NAME);
        var lines = [
            "/version 3",
            "/name [ " + setName.length, "    " + setName.hex, "]",
            "/isOpen 1",
            "/actionCount 1",
            "/action-1 {",
            "    /name [ " + name.length, "        " + name.hex, "    ]",
            "    /keyIndex 0",
            "    /colorIndex 0",
            "    /isOpen 1",
            "    /eventCount 1",
            "    /event-1 {",
            "        /useRulersIn1stQuadrant 0",
            "        /internalName (ai_plugin_setStroke)",
            "        /localizedName [ 10", "            536574205374726F6B65", "        ]",
            "        /isOpen 1",
            "        /isOn 1",
            "        /hasDialog 0",
            "        /parameterCount 4",
            // 선 두께 (pt)
            "        /parameter-1 {",
            "            /key 2003072104",
            "            /showInPalette -1",
            "            /type (unit real)",
            "            /value " + weight,
            "            /unit 592476268",
            "        }",
            // 끝 화살촉
            "        /parameter-2 {",
            "            /key 1634231346",
            "            /showInPalette -1",
            "            /type (ustring)",
            "            /value [ " + arrow.length, "                " + arrow.hex, "            ]",
            "        }",
            // 끝 화살촉 크기 (%)
            "        /parameter-3 {",
            "            /key 1634951986",
            "            /showInPalette -1",
            "            /type (real)",
            "            /value " + scale + ".0",
            "        }",
            // 화살촉 정렬: 패스 끝의 팁
            "        /parameter-4 {",
            "            /key 1634230636",
            "            /showInPalette -1",
            "            /type (enumerated)",
            "            /name [ 17", "                ED8CA8EC8AA420EB819DEC9D9820ED8C81", "            ]",
            "            /value 0",
            "        }",
            "    }",
            "}"
        ];
        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
    }

    // -------------------------------------------------------
    // 공용 헬퍼
    // -------------------------------------------------------
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
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v;
        rgb.green = v;
        rgb.blue = v;
        return rgb;
    }

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

    // 값이 바뀌면 상태에 쓰고 onChange(미리보기 다시 그리기)를 부른다
    function bindValueRow(controls, getter, setter, onChange) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === getter()) return;
            setter(value);
            onChange();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, getter, setter, isX, move) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0) return;
            move(isX ? delta : 0, isX ? 0 : delta);
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
