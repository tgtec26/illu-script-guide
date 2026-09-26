// Object_PunnettSquare.jsx
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

// 퍼넷 사각형(교배표). 두 어버이의 유전자형(Rr, RrYy, RW…)을 넣으면
// 생식세포 조합과 자손의 유전자형을 표 또는 교과서식 마름모로 그린다.
// 어버이 1의 생식세포는 세로(마름모는 왼쪽 위 변), 어버이 2는 가로(오른쪽 위 변)에 놓인다.
// 대문자가 우성. 서로 다른 대문자 한 쌍(RW)은 중간 유전으로 보고 유전자형을 그대로 표현형으로 친다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectPunnettSquare/settings";
    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var GRID_PT = 0.4;
    var SECTION_PT = 0.8;
    var HEADER_K = 15;
    var DIAMOND_K = 10;
    // 표현형 음영: 첫 표현형(보통 모두 우성)부터 차례로
    var PHENO_K = [0, 20, 40, 60, 80];
    var SHAPES = ["표", "마름모"];
    var LABEL_WIDTH = 90;
    var INPUT_WIDTH = 50;
    var GENO_WIDTH = 100;
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var CELL_RANGE = [5, 30];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

    // 옵션
    var shape = 1;
    var parent1 = "Rr";
    var parent2 = "Rr";
    var mergeOn = true;
    var circleOn = true;
    var shadeOn = false;
    var cellMm = 10;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previewGroup = null;

    applySettings();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "퍼넷 사각형");
    win.alignChildren = "fill";

    var genoPanel = addPanel(win, "유전자형");
    var p1Input = addTextRow(genoPanel, "어버이 1 (세로):", parent1);
    var p2Input = addTextRow(genoPanel, "어버이 2 (가로):", parent2);
    p1Input.helpTip = p2Input.helpTip = "Rr, RrYy, RW처럼 한 쌍씩 적습니다. 대문자가 우성입니다(최대 3쌍).";
    var statusText = genoPanel.add("statictext", undefined, "");
    statusText.preferredSize.width = LABEL_WIDTH + GENO_WIDTH + 10;

    var shapePanel = addPanel(win, "모양");
    var shapeRow = shapePanel.add("group");
    shapeRow.add("statictext", undefined, "모양:").preferredSize.width = LABEL_WIDTH;
    var shapeList = shapeRow.add("dropdownlist", undefined, SHAPES);
    shapeList.selection = shape;
    var checkRow = shapePanel.add("group");
    var mergeCheck = checkRow.add("checkbox", undefined, "같은 생식세포 합치기");
    var circleCheck = checkRow.add("checkbox", undefined, "생식세포 원");
    var shadeCheck = checkRow.add("checkbox", undefined, "표현형 음영");
    mergeCheck.helpTip = "RR처럼 같은 생식세포만 만드는 어버이는 한 칸으로 줄입니다.";
    mergeCheck.value = mergeOn;
    circleCheck.value = circleOn;
    shadeCheck.value = shadeOn;

    var sizePanel = addPanel(win, "크기");
    var cellRow = addValueRow(sizePanel, "칸 크기", "mm", cellMm, CELL_RANGE[0], CELL_RANGE[1], 0.5, 1);
    var fontRow = addValueRow(sizePanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(win, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}

    p1Input.onChanging = function() { parent1 = p1Input.text; updatePreview(); };
    p2Input.onChanging = function() { parent2 = p2Input.text; updatePreview(); };
    shapeList.onChange = function() {
        if (shapeList.selection === null) { shapeList.selection = shape; return; }
        shape = shapeList.selection.index;
        updatePreview();
    };
    mergeCheck.onClick = function() { mergeOn = mergeCheck.value; updatePreview(); };
    circleCheck.onClick = function() { circleOn = circleCheck.value; updatePreview(); };
    shadeCheck.onClick = function() { shadeOn = shadeCheck.value; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    bindValueRow(cellRow, function(v) { cellMm = v; });
    bindValueRow(fontRow, function(v) { fontPt = v; });
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);

    okButton.onClick = function() {
        var cross = buildCross(parent1, parent2, mergeOn);
        if (cross.error) {
            alert(cross.error);
            return;
        }
        if (previewGroup === null) buildPreview(cross);
        saveSettings();
        doc.selection = null;
        previewGroup.selected = true;
        previewGroup = null;
        win.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    if (win.show() !== 1) {
        clearPreview();
        app.redraw();
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        var cross = buildCross(parent1, parent2, mergeOn);
        statusText.text = cross.error ? cross.error : ("생식세포 " + cross.rows.length + " × " + cross.cols.length);
        if (previewEnabled && !cross.error) buildPreview(cross);
        app.redraw();
    }

    function buildPreview(cross) {
        previewGroup = findEditableLayer().groupItems.add();
        previewGroup.name = "PunnettSquare";
        drawCross(cross);
        var b = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM,
            viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM);
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // -------------------------------------------------------
    // 교배 계산 (순수 함수)
    // -------------------------------------------------------
    // 결과: { rows, cols: 생식세포 문자열(유전자마다 한 글자), cells[i][j]: 유전자형, classes[i][j]: 표현형 번호 }
    // 또는 { error }
    function buildCross(text1, text2, merge) {
        var genes1 = parseGenotype(text1);
        var genes2 = parseGenotype(text2);
        if (genes1 === null || genes2 === null) return { error: "유전자형을 Rr, RrYy처럼 한 쌍씩 적어주세요." };
        if (genes1.length !== genes2.length) return { error: "두 어버이의 유전자 쌍 수가 다릅니다." };
        var orders = [];
        for (var k = 0; k < genes1.length; k++) {
            var order = alleleOrder(genes1[k].concat(genes2[k]));
            if (order === null) return { error: (k + 1) + "번째 쌍의 대립유전자가 맞지 않습니다." };
            orders.push(order);
        }
        var rows = makeGametes(genes1, merge);
        var cols = makeGametes(genes2, merge);
        var cells = [], classes = [], keys = [];
        for (var i = 0; i < rows.length; i++) {
            cells.push([]);
            classes.push([]);
            for (var j = 0; j < cols.length; j++) {
                var genotype = combineGametes(rows[i], cols[j], orders);
                var key = phenotypeKey(genotype);
                var index = -1;
                for (var n = 0; n < keys.length; n++) if (keys[n] === key) index = n;
                if (index < 0) { keys.push(key); index = keys.length - 1; }
                cells[i].push(genotype);
                classes[i].push(index);
            }
        }
        return { rows: rows, cols: cols, cells: cells, classes: classes };
    }

    // "RrYy" → [["R","r"],["Y","y"]]. 영문자 외는 무시한다. 1~3쌍
    function parseGenotype(text) {
        var letters = String(text).replace(/[^A-Za-z]/g, "");
        if (letters.length < 2 || letters.length > 6 || letters.length % 2 !== 0) return null;
        var genes = [];
        for (var i = 0; i < letters.length; i += 2) genes.push([letters.charAt(i), letters.charAt(i + 1)]);
        return genes;
    }

    // 한 유전자 자리의 대립유전자 순서: 대문자 먼저, 같으면 먼저 나온 순.
    // 같은 글자의 대소문자(R·r)이거나 모두 대문자(R·W, 중간 유전)여야 한다. 아니면 null
    function alleleOrder(letters) {
        var seen = [];
        var sameLetter = true, allUpper = true;
        for (var i = 0; i < letters.length; i++) {
            var c = letters[i];
            if (c.toUpperCase() !== letters[0].toUpperCase()) sameLetter = false;
            if (c !== c.toUpperCase()) allUpper = false;
            var known = false;
            for (var j = 0; j < seen.length; j++) if (seen[j] === c) known = true;
            if (!known) seen.push(c);
        }
        if (!sameLetter && !allUpper) return null;
        var upper = [], lower = [];
        for (var k = 0; k < seen.length; k++) (seen[k] === seen[k].toUpperCase() ? upper : lower).push(seen[k]);
        return upper.concat(lower);
    }

    // 유전자마다 하나씩 골라 만든 조합. 첫 유전자가 바깥 반복이라 RY, Ry, rY, ry 순이 된다
    function makeGametes(genes, merge) {
        var list = [""];
        for (var k = 0; k < genes.length; k++) {
            var next = [];
            for (var i = 0; i < list.length; i++) {
                for (var a = 0; a < 2; a++) {
                    var gamete = list[i] + genes[k][a];
                    var dup = false;
                    if (merge) for (var n = 0; n < next.length; n++) if (next[n] === gamete) dup = true;
                    if (!dup) next.push(gamete);
                }
            }
            list = next;
        }
        return list;
    }

    function combineGametes(egg, sperm, orders) {
        var text = "";
        for (var k = 0; k < egg.length; k++) {
            var a = egg.charAt(k), b = sperm.charAt(k);
            text += indexOf(orders[k], a) <= indexOf(orders[k], b) ? a + b : b + a;
        }
        return text;
    }

    // 쌍마다: 서로 다른 대문자면 그대로(중간 유전), 대문자가 있으면 그 글자(우성), 없으면 열성 쌍
    function phenotypeKey(genotype) {
        var key = "";
        for (var k = 0; k < genotype.length; k += 2) {
            var a = genotype.charAt(k), b = genotype.charAt(k + 1);
            var upperA = (a === a.toUpperCase()), upperB = (b === b.toUpperCase());
            if (upperA && upperB && a !== b) key += a + b;
            else if (upperA) key += a;
            else if (upperB) key += b;
            else key += a + b;
            key += "|";
        }
        return key;
    }

    function indexOf(list, value) {
        for (var i = 0; i < list.length; i++) if (list[i] === value) return i;
        return -1;
    }

    // 격자 좌표 (u: 가로 칸, v: 세로 칸, 왼쪽 위 모서리가 0,0) → 점(pt). 마름모는 그 모서리가 꼭짓점이 되도록 45° 돌린다
    function gridPoint(u, v, size, diamond) {
        if (!diamond) return [u * size, -v * size];
        var half = size / Math.SQRT2;
        return [(u - v) * half, -(u + v) * half];
    }

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    function drawCross(cross) {
        var diamond = (shape === 1);
        var size = cellMm * MM;
        var n = cross.rows.length, m = cross.cols.length;
        var black = makeGray(100), white = makeGray(0);

        for (var i = 0; i < n; i++) {
            for (var j = 0; j < m; j++) {
                var k = shadeOn ? PHENO_K[cross.classes[i][j] % PHENO_K.length] : 0;
                if (diamond) {
                    addCell(j, i, size, true, Math.max(k, DIAMOND_K), white, SECTION_PT);
                } else {
                    addCell(j, i, size, false, k, black, GRID_PT);
                }
                addCenteredText(cross.cells[i][j], gridPoint(j + 0.5, i + 0.5, size, diamond));
            }
        }

        if (!diamond) {
            addCell(-1, -1, size, false, HEADER_K, black, GRID_PT);
            for (var r = 0; r < n; r++) addCell(-1, r, size, false, HEADER_K, black, GRID_PT);
            for (var c = 0; c < m; c++) addCell(c, -1, size, false, HEADER_K, black, GRID_PT);
            // 머리 칸과 본문을 가르는 굵은 선
            addLine(gridPoint(-1, 0, size, false), gridPoint(m, 0, size, false), black);
            addLine(gridPoint(0, -1, size, false), gridPoint(0, n, size, false), black);
        }
        for (var gi = 0; gi < n; gi++) addGamete(cross.rows[gi], gridPoint(-0.5, gi + 0.5, size, diamond), size, diamond);
        for (var gj = 0; gj < m; gj++) addGamete(cross.cols[gj], gridPoint(gj + 0.5, -0.5, size, diamond), size, diamond);
    }

    function addCell(u, v, size, diamond, k, strokeColor, strokeWidth) {
        var path = previewGroup.pathItems.add();
        path.setEntirePath([gridPoint(u, v, size, diamond), gridPoint(u + 1, v, size, diamond),
            gridPoint(u + 1, v + 1, size, diamond), gridPoint(u, v + 1, size, diamond)]);
        path.closed = true;
        path.filled = k > 0;
        if (k > 0) path.fillColor = makeGray(k);
        path.stroked = true;
        path.strokeColor = strokeColor;
        path.strokeWidth = strokeWidth;
        return path;
    }

    function addLine(from, to, color) {
        var path = previewGroup.pathItems.add();
        path.setEntirePath([from, to]);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = SECTION_PT;
    }

    // 생식세포 글자. 원을 켜면 흰 원 위에 올린다
    function addGamete(text, center, size, diamond) {
        var frame = addCenteredText(text, center);
        if (!circleOn) return;
        var b = frame.geometricBounds;
        var radius = Math.max(size * (diamond ? 0.3 : 0.36), (b[2] - b[0]) / 2 + fontPt * 0.35);
        var circle = previewGroup.pathItems.ellipse(center[1] + radius, center[0] - radius, radius * 2, radius * 2);
        circle.filled = true;
        circle.fillColor = makeGray(0);
        circle.stroked = true;
        circle.strokeColor = makeGray(100);
        circle.strokeWidth = GRID_PT;
        frame.zOrder(ZOrderMethod.BRINGTOFRONT);
    }

    function addCenteredText(text, center) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(center[0] - (b[0] + b[2]) / 2, center[1] - (b[1] + b[3]) / 2);
        return frame;
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || code === 32) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
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
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
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

    function addTextRow(parent, label, value) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, value);
        input.preferredSize.width = GENO_WIDTH;
        return input;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (" + unit + "):").preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
    }

    function bindValueRow(controls, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? controls.slider.value : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0 || previewGroup === null) return;
            try { previewGroup.translate(isX ? delta : 0, isX ? 0 : delta); } catch (e2) {}
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
        var parts = [
            "v1", shape,
            String(parent1).replace(/[^A-Za-z]/g, ""), String(parent2).replace(/[^A-Za-z]/g, ""),
            mergeOn ? "1" : "0", circleOn ? "1" : "0", shadeOn ? "1" : "0",
            cellMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v1" || p.length !== 12) return;
        if (p[1] === "0" || p[1] === "1") shape = Number(p[1]);
        if (!buildCross(p[2], p[3], true).error) {
            parent1 = p[2];
            parent2 = p[3];
        }
        mergeOn = (p[4] === "1");
        circleOn = (p[5] === "1");
        shadeOn = (p[6] === "1");
        cellMm = restoreNumber(p[7], cellMm, CELL_RANGE[0], CELL_RANGE[1]);
        fontPt = restoreNumber(p[8], fontPt, FONT_RANGE[0], FONT_RANGE[1]);
        offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        previewEnabled = (p[11] === "1");
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, minimum, maximum);
    }
})();
