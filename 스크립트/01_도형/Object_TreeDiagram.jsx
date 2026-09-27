// Object_TreeDiagram.jsx
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

// 경우의 수 수형도: 단계별 선택지("앞, 뒤 / 앞, 뒤 / 앞, 뒤")를 왼쪽→오른쪽 나무로 펼친다.
// '중복 없이'를 켜면 앞 단계에서 나온 것은 빼고 펼친다(A, B, C에서 두 개를 뽑아 세우기 등).
// 끝 가지 오른쪽에 결과를 (앞, 뒤) 또는 AB처럼 붙인다. 분류 계통도(들여쓰기 입력)와 달리 가지를 자동으로 만든다.
// 연결선은 0.4pt. 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "TreeDiagram/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var LABEL_WIDTH = 100;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var MAX_LEAVES = 200;
    var RESULT_STYLES = ["결과 없음", "(앞, 뒤)처럼 괄호", "AB처럼 붙여 쓰기"];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var LINE_PT = 0.4;
    var LINE_GAP_MM = 1;

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var layer = findEditableLayer();
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

    // 옵션
    var stagesText = "앞, 뒤 / 앞, 뒤 / 앞, 뒤";
    var noRepeat = false;
    var resultStyle = 1;
    var stageGapMm = 14;
    var rowGapMm = 5;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    applySettings();

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var win = new Window("dialog", "수형도");
    win.alignChildren = "fill";

    var inputPanel = addPanel(win, "단계별 선택지");
    var stagesInput = inputPanel.add("edittext", undefined, stagesText);
    stagesInput.preferredSize.width = 360;
    stagesInput.helpTip = "단계는 /, 선택지는 쉼표로 나눈다. 예: 앞, 뒤 / 앞, 뒤 / 1, 2, 3, 4, 5, 6";
    var optionRow = inputPanel.add("group");
    var noRepeatCheck = optionRow.add("checkbox", undefined, "중복 없이 (앞에서 나온 것 빼기)");
    var resultRow = inputPanel.add("group");
    resultRow.add("statictext", undefined, "끝 결과:");
    var resultList = resultRow.add("dropdownlist", undefined, RESULT_STYLES);
    resultList.selection = resultStyle;
    var messageText = inputPanel.add("statictext", undefined, " ");
    messageText.preferredSize.width = 360;

    var sizePanel = addPanel(win, "크기");
    var stageControls = addValueRow(sizePanel, "단계 간격", "mm", stageGapMm, 6, 40, 0.5, 1);
    var rowControls = addValueRow(sizePanel, "줄 간격", "mm", rowGapMm, 2, 15, 0.5, 1);
    var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

    var positionPanel = addPanel(win, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
    var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}

    noRepeatCheck.value = noRepeat;
    previewCheck.value = previewEnabled;

    stagesInput.onChanging = function() { stagesText = stagesInput.text; updatePreview(); };
    noRepeatCheck.onClick = function() { noRepeat = noRepeatCheck.value; updatePreview(); };
    resultList.onChange = function() { resultStyle = resultList.selection ? resultList.selection.index : 0; updatePreview(); };
    bindValueRow(stageControls, function(value) { stageGapMm = value; });
    bindValueRow(rowControls, function(value) { rowGapMm = value; });
    bindValueRow(fontControls, function(value) { fontPt = value; });
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        if (previewGroup !== null) previewGroup.selected = true;
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
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
    }

    function buildPreview() {
        var stages = parseStages(stagesText);
        if (stages === null) {
            messageText.text = "단계를 읽지 못함 (빈 단계가 있음)";
            return;
        }
        var tree = layoutTree(stages, noRepeat, stageGapMm * MM_TO_PT, rowGapMm * MM_TO_PT, MAX_LEAVES);
        if (tree === null) {
            messageText.text = "끝 가지가 " + MAX_LEAVES + "개를 넘습니다";
            return;
        }
        messageText.text = "모두 " + tree.leaves + "가지";
        if (tree.nodes.length === 0) return;

        previewGroup = layer.groupItems.add();
        previewGroup.name = "수형도";
        var gap = LINE_GAP_MM * MM_TO_PT;
        var halfWidths = [];
        for (var i = 0; i < tree.nodes.length; i++) {
            var node = tree.nodes[i];
            var frame = addText(node.label, node.x, node.y);
            var b = frame.geometricBounds;
            halfWidths.push((b[2] - b[0]) / 2);
            if (node.parent >= 0) {
                var parent = tree.nodes[node.parent];
                addLine([parent.x + halfWidths[node.parent] + gap, parent.y], [node.x - halfWidths[i] - gap, node.y]);
            }
            if (node.leaf && resultStyle > 0) {
                var result = resultStyle === 1 ? "(" + node.path.join(", ") + ")" : node.path.join("");
                var resultFrame = addText(result, 0, node.y);
                var rb = resultFrame.geometricBounds;
                resultFrame.translate(node.x + halfWidths[i] + stageGapMm * MM_TO_PT * 0.5 - rb[0], 0);
            }
        }
        var bounds = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (bounds[0] + bounds[2]) / 2 + offsetXmm * MM_TO_PT,
            viewCenter[1] - (bounds[1] + bounds[3]) / 2 + offsetYmm * MM_TO_PT);
    }

    function addLine(a, b) {
        var path = previewGroup.pathItems.add();
        path.setEntirePath([a, b]);
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_PT;
        path.strokeCap = StrokeCap.BUTTENDCAP;
    }

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
        return frame;
    }

    // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt)
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var character = frame.textRange.characters[i];
            var attributes = character.characterAttributes;
            var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
            attributes.textFont = korean ? korFont : engFont;
            attributes.baselineShift = korean ? 0 : ENG_BASELINE_PT;
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
        var value = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    // -------------------------------------------------------
    // 계산 (일러 DOM을 쓰지 않는다 → tests/check-tree-diagram.js)
    // -------------------------------------------------------
    // "앞, 뒤 / 앞, 뒤" → [["앞","뒤"],["앞","뒤"]]. 빈 단계가 있으면 null (입력 중 끝의 /는 무시)
    function parseStages(text) {
        var parts = String(text).split("/");
        var stages = [];
        for (var i = 0; i < parts.length; i++) {
            var items = [];
            var pieces = parts[i].split(",");
            for (var j = 0; j < pieces.length; j++) {
                var item = pieces[j].replace(/^\s+|\s+$/g, "");
                if (item !== "") items.push(item);
            }
            if (items.length === 0) {
                if (i === parts.length - 1 && i > 0) continue;
                return null;
            }
            stages.push(items);
        }
        return stages;
    }

    // 나무를 펼쳐 마디마다 {label, x, y, parent, leaf, path}. 끝 가지는 한 줄씩, 부모는 자식들 가운데.
    // 끝 가지가 limit를 넘으면 null
    function layoutTree(stages, withoutRepeat, stageGap, rowGap, limit) {
        var nodes = [], leafCount = 0, tooMany = false;
        function grow(depth, parentIndex, path) {
            var ys = [];
            var choices = stages[depth];
            for (var i = 0; i < choices.length && !tooMany; i++) {
                if (withoutRepeat && contains(path, choices[i])) continue;
                var index = nodes.length;
                var nextPath = path.concat([choices[i]]);
                nodes.push({ label: choices[i], x: depth * stageGap, y: 0, parent: parentIndex, leaf: false, path: nextPath });
                var last = depth + 1 >= stages.length;
                var childYs = last ? [] : grow(depth + 1, index, nextPath);
                if (!last && childYs.length === 0) {
                    nodes.pop();   // 중복 없이 뽑다가 다음 단계에 남은 게 없으면 이 가지는 없다
                    continue;
                }
                if (last) {
                    if (leafCount >= limit) { tooMany = true; nodes.pop(); break; }
                    nodes[index].leaf = true;
                    nodes[index].y = -leafCount * rowGap;
                    leafCount++;
                } else {
                    nodes[index].y = (childYs[0] + childYs[childYs.length - 1]) / 2;
                }
                ys.push(nodes[index].y);
            }
            return ys;
        }
        grow(0, -1, []);
        if (tooMany) return null;
        return { nodes: nodes, leaves: leafCount };
    }

    function contains(list, value) {
        for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
        return false;
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

    function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + " (" + unitText + "):").preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
    }

    function setRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindValueRow(controls, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setRowValue(controls, value);
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? controls.slider.value : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
            setter(value);
            setRowValue(controls, value);
            if (delta === 0 || previewGroup === null) return;
            previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", encodeURIComponent(stagesText), noRepeat ? "1" : "0", resultStyle, stageGapMm, rowGapMm, fontPt,
            offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 10) return;
        try {
            stagesText = decodeURIComponent(p[1]);
            noRepeat = p[2] === "1";
            resultStyle = Math.round(restoreNumber(p[3], resultStyle, 0, RESULT_STYLES.length - 1));
            stageGapMm = restoreNumber(p[4], stageGapMm, 6, 40);
            rowGapMm = restoreNumber(p[5], rowGapMm, 2, 15);
            fontPt = restoreNumber(p[6], fontPt, 5, 14);
            offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            previewEnabled = p[9] === "1";
        } catch (restoreError) {}
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        return value === null ? fallback : clamp(value, minimum, maximum);
    }
})();
