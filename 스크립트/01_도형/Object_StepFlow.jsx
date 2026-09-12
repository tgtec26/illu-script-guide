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
  Object_StepFlow.jsx
  기능: [단계] → [단계] → [단계] 처럼 사각 박스와 화살표가 번갈아 이어지는 단계 다이어그램을 만듭니다.
    - 단계 수(3~6)를 고르면 그만큼 입력창이 열립니다 (예: 용암 지대→초원→관목림→양수림→혼합림→음수림)
    - 글과 기호를 다 고른 뒤 '완료'를 눌러야 그립니다. 비워 둔 칸은 고른 기호(A B / ⓐ ⓑ / ㉠ ㉡ / Ⅰ Ⅱ)로 순서대로 채웁니다
    - 개별 크기일 때 기호 칸은 기호가 아닌 박스 중 가장 좁은 것과 같은 너비로 맞춥니다
    - 박스 크기는 '모두 같게'(공통 너비·높이) 또는 개별(글자 범위 + 좌우·상하 여백) 중 고릅니다.
      개별이라도 높이는 글자 높이 + 상하 여백이라 모든 박스가 같은 높이입니다
    - 박스 선 0.3pt 고정, 코너 라운딩 조절
    - 화살표: 길이·두께·화살촉(화살표 3) 크기·색(K, 10 단위) 조절
    - 박스와 화살표 사이 간격은 모두 같고 조절할 수 있습니다. 전체가 가로 한 줄, 세로 중앙 정렬
    - 글자는 한글=Spoqa, 영문·숫자·기호=GSMediumB1 규칙을 글자마다 적용합니다
    - 화살촉은 액션으로만 붙어 느리므로 슬라이더를 끄는 동안은 생략하고 손을 떼면 그립니다
  사용법: 그냥 실행하면 화면 중앙에 만듭니다
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectStepFlow/settings";
    var mmToPt = 2.83464567;
    var MIN_STEPS = 3;
    var MAX_STEPS = 6;
    var BOX_STROKE = 0.3;
    var PREVIEW_NAME = "StepFlow_Preview";
    var ARROW_NAME = (function() {
        var locale = getAppLocale();
        return locale === "" || locale.indexOf("ko") === 0 ? "화살표 3" : "Arrow 3";
    })();
    // 프레임 범위 안에서 실제 글자가 차지하는 자리 (Text_ChatBubbles와 같은 실측 배수)
    var GLYPH_BOTTOM = 0.23;
    var GLYPH_HEIGHT = 0.896;
    var GLYPH_SIDE = 0.05;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    // 빈 칸을 채우는 기호. 순서는 symbolSet 라디오 순서와 같다
    var SYMBOL_SETS = [
        { label: "없음", chars: [] },
        { label: "A B", chars: ["A", "B", "C", "D", "E", "F"] },
        { label: "ⓐ ⓑ", chars: ["ⓐ", "ⓑ", "ⓒ", "ⓓ", "ⓔ", "ⓕ"] },
        { label: "㉠ ㉡", chars: ["㉠", "㉡", "㉢", "㉣", "㉤", "㉥"] },
        { label: "Ⅰ Ⅱ", chars: ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"] }
    ];
    var ENG_FONT_NAME = "GSMediumB1";

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var black = makeGray(100);
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var options = readSettings();
    var previewGroup = null;
    var boxes = [];             // {group, frame, path} 순서대로
    var arrows = [];            // 화살표 패스
    var previewPending = false;
    var rebuildPending = true;  // 수·글·글자 크기가 바뀌면 글자부터 다시 만든다
    var arrowheadPending = true; // 화살촉 액션을 다시 걸어야 하는지
    var lastPreviewTime = 0;
    var PREVIEW_INTERVAL_MS = 40;
    var committed = false;
    var texts = [];             // '완료'를 누른 시점의 글. 미리보기는 이것으로 그린다
    var labels = [];            // texts에 기호를 채운 결과 {text, symbol}

    removeLeftoverGroups();

    var STEP_BUTTON_WIDTH = 34;
    var win = new Window("dialog", "단계 흐름도 만들기");
    win.alignChildren = "fill";
    win.spacing = 4;

    var countPanel = win.add("panel", undefined, "단계 수");
    countPanel.orientation = "row";
    var countRadios = [];
    for (var c = MIN_STEPS; c <= MAX_STEPS; c++) {
        var radio = countPanel.add("radiobutton", undefined, String(c));
        radio.value = (options.count === c);
        radio.onClick = makeCountHandler(c);
        countRadios.push(radio);
    }

    var textPanel = win.add("panel", undefined, "단계 이름 (왼쪽부터)");
    textPanel.alignChildren = "fill";
    textPanel.spacing = 2;
    var inputs = [];
    for (var r = 0; r < 2; r++) {
        var inputRow = textPanel.add("group");
        for (var col = 0; col < 3; col++) {
            var index = r * 3 + col;
            var caption = inputRow.add("statictext", undefined, String(index + 1));
            caption.preferredSize.width = 14;
            var input = inputRow.add("edittext", undefined, "");
            input.preferredSize.width = 100;
            input.addEventListener("keydown", makeTabHandler(index));
            inputs.push(input);
        }
    }
    var symbolRow = textPanel.add("group");
    symbolRow.add("statictext", undefined, "빈 칸 기호");
    var symbolRadios = [];
    for (var sy = 0; sy < SYMBOL_SETS.length; sy++) {
        var symbolRadio = symbolRow.add("radiobutton", undefined, SYMBOL_SETS[sy].label);
        symbolRadio.value = (options.symbolSet === sy);
        symbolRadio.onClick = makeSymbolHandler(sy);
        symbolRadios.push(symbolRadio);
    }
    var doneButton = symbolRow.add("button", undefined, "완료");
    doneButton.alignment = ["right", "center"];
    doneButton.helpTip = "입력한 글과 기호로 박스를 그립니다. 비워 둔 칸은 기호로 채웁니다";
    doneButton.onClick = function() {
        snapshotTexts();
        rebuildPending = true;
        updatePreview();
    };

    var fontPanel = win.add("panel", undefined, "글자");
    fontPanel.alignChildren = "fill";
    fontPanel.spacing = 2;
    addRow(fontPanel, "글자 크기", "fontSize", 4, 30, "pt", false);

    var boxPanel = win.add("panel", undefined, "박스 (선 0.3pt)");
    boxPanel.alignChildren = "fill";
    boxPanel.spacing = 2;
    var sameSize = boxPanel.add("checkbox", undefined, "너비·높이 모두 같게");
    sameSize.value = options.sameSize;
    sameSize.helpTip = "켜면 공통 너비·높이, 끄면 글자 범위에 좌우·상하 여백을 더한 크기";
    var boxWidthRow = addRow(boxPanel, "박스 너비", "boxWidth", 5, 20, "mm", false).parent;
    var boxHeightRow = addRow(boxPanel, "박스 높이", "boxHeight", 3, 10, "mm", false).parent;
    var paddingXRow = addRow(boxPanel, "좌우 여백", "paddingX", 0, 3, "mm", false).parent;
    var paddingYRow = addRow(boxPanel, "상하 여백", "paddingY", 0, 3, "mm", false).parent;
    addRow(boxPanel, "코너 라운딩", "radius", 0, 5, "mm", false);
    sameSize.onClick = function() {
        options.sameSize = sameSize.value;
        updateSizeRows();
        updatePreview();
    };

    var arrowPanel = win.add("panel", undefined, "화살표 (화살표 3)");
    arrowPanel.alignChildren = "fill";
    arrowPanel.spacing = 2;
    addRow(arrowPanel, "길이", "arrowLength", 1, 5, "mm", false);
    addRow(arrowPanel, "두께", "arrowWidth", 0.3, 4, "pt", false);
    addRow(arrowPanel, "화살촉 크기", "arrowScale", 10, 100, "%", false);
    addRow(arrowPanel, "색 (K)", "arrowK", 0, 100, "%", false).helpTip = "10 단위";
    addRow(arrowPanel, "박스·화살표 간격", "gap", 0, 3, "mm", false);

    var positionPanel = win.add("panel", undefined, "위치");
    positionPanel.alignChildren = "fill";
    positionPanel.spacing = 2;
    addRow(positionPanel, "가로 이동", "offsetX", -100, 100, "mm", true).helpTip = "양수: 오른쪽";
    addRow(positionPanel, "세로 이동", "offsetY", -100, 100, "mm", true).helpTip = "양수: 위쪽";

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = options.preview;
    previewCheck.onClick = function() { options.preview = previewCheck.value; updatePreview(); };
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var ok = footer.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});
    var status = win.add("statictext", undefined, " ");
    status.preferredSize.width = 400;

    ok.onClick = function() {
        // '완료'를 안 눌렀거나 그 뒤에 글·기호를 고쳤을 수 있으니 지금 값으로 다시 그린다
        snapshotTexts();
        previewPending = true;
        rebuildPending = true;
        arrowheadPending = true;
        if (previewPending && !updatePreview()) return;
        if (previewGroup === null && !buildPreview()) return;
        committed = true;
        previewGroup.name = "StepFlow";
        saveSettings();
        doc.selection = null;
        previewGroup.selected = true;
        win.close(1);
    };

    updateInputState();
    updateSizeRows();
    win.onShow = function() { updatePreview(); };
    try { win.show(); }
    finally {
        if (!committed) clearPreview();
        app.redraw();
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function makeCountHandler(count) {
        return function() {
            options.count = count;
            updateInputState();
            rebuildPending = true;
            updatePreview();
        };
    }

    // 탭이 다른 요소로 새지 않도록 켜진 다음(shift: 이전) 입력창으로 직접 옮긴다
    function makeTabHandler(index) {
        return function(event) {
            if (event.keyName !== "Tab") return;
            var step = event.shiftKey ? -1 : 1;
            for (var i = index + step; i >= 0 && i < inputs.length; i += step) {
                if (!inputs[i].enabled) continue;
                inputs[i].active = true;
                try { event.preventDefault(); } catch (e) {}
                return;
            }
        };
    }

    function makeSymbolHandler(index) {
        return function() { options.symbolSet = index; };
    }

    function updateInputState() {
        for (var i = 0; i < inputs.length; i++) inputs[i].enabled = (i < options.count);
    }

    function updateSizeRows() {
        boxWidthRow.enabled = options.sameSize;
        boxHeightRow.enabled = options.sameSize;
        paddingXRow.enabled = !options.sameSize;
        paddingYRow.enabled = !options.sameSize;
    }

    // 입력창 글을 texts로 옮긴다. 바뀐 게 있으면 true
    function snapshotTexts() {
        var changed = false;
        for (var i = 0; i < MAX_STEPS; i++) {
            var text = String(inputs[i].text);
            if (texts[i] !== text) changed = true;
            texts[i] = text;
        }
        // 빈 칸은 고른 기호로 순서대로 채운다. 기호가 '없음'이면 공백 하나(프레임 높이가 한 줄로 잡힌다)
        var chars = SYMBOL_SETS[options.symbolSet].chars;
        var next = 0;
        labels = [];
        for (var j = 0; j < MAX_STEPS; j++) {
            if (/\S/.test(texts[j])) {
                labels.push({ text: texts[j], symbol: false });
            } else {
                labels.push({ text: next < chars.length ? chars[next] : " ", symbol: true });
                next++;
            }
        }
        return changed;
    }

    // 숫자 조절 행: 라벨 | ◀ | 슬라이더 | ▶ | 입력창 | 단위. 라벨을 돌려준다
    function addRow(panel, label, key, min, max, unit, positionOnly) {
        var row = panel.add("group");
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = 95;
        var step = (key === "arrowK") ? 10 : (unit === "mm" ? 0.1 : (unit === "pt" ? 0.5 : 1));
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        minus.helpTip = String(step) + unit + " 감소";
        var slider = row.add("slider", undefined, options[key], min, max);
        slider.preferredSize.width = 105;
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
        plus.helpTip = String(step) + unit + " 증가";
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 6;
        row.add("statictext", undefined, unit);
        function apply(value, dragging) {
            value = (key === "arrowK") ? Math.round(value / 10) * 10 : Math.round(value * 100) / 100;
            if (!isFinite(value) || value < min || value > max) {
                input.text = String(options[key]);
                return;
            }
            var previous = options[key];
            options[key] = value;
            slider.value = value;
            input.text = String(value);
            if (value === previous) {
                if (!dragging && previewPending) updatePreview();
                return;
            }
            if (positionOnly) {
                // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
                try {
                    var delta = (value - previous) * mmToPt;
                    if (previewGroup !== null) {
                        previewGroup.translate(key === "offsetX" ? delta : 0, key === "offsetY" ? delta : 0);
                    }
                    app.redraw();
                } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
            } else {
                if (key === "fontSize") rebuildPending = true;
                if (key === "arrowScale" || key === "arrowWidth") arrowheadPending = true;
                updatePreview(dragging);
            }
        }
        minus.onClick = function() { apply(Math.max(min, options[key] - step)); };
        plus.onClick = function() { apply(Math.min(max, options[key] + step)); };
        slider.onChanging = function() { apply(slider.value, true); };
        slider.onChange = function() { apply(slider.value); };
        input.onChange = function() {
            if (!/\S/.test(input.text)) { input.text = String(options[key]); return; }
            apply(Number(input.text));
        };
        return caption;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview(dragging) {
        previewPending = true;
        if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
        status.text = " ";
        try {
            if (!options.preview) {
                clearPreview();
            } else if (previewGroup === null || rebuildPending) {
                if (!buildPreview()) return false;
            } else {
                layoutItems();
            }
            // 화살촉 액션은 느리므로 끄는 동안은 건너뛰고 손을 뗀 뒤 붙인다
            if (previewGroup !== null && arrowheadPending && dragging !== true) {
                applyArrowheads();
            }
            previewPending = false;
            app.redraw();
            lastPreviewTime = new Date().getTime();
            return true;
        } catch (e) {
            clearPreview();
            status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
            return false;
        }
    }

    // 글자부터 전부 다시 만든다. 박스 수가 같으면 있는 글자에 내용만 다시 쓴다
    // (텍스트 프레임을 되풀이해 지우고 만들면 Illustrator가 불안정, Text_ChatBubbles 참고)
    function buildPreview() {
        var lastError = null;
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                if (previewGroup !== null && boxes.length === options.count) {
                    for (var i = 0; i < boxes.length; i++) fillText(boxes[i].frame, labelText(i));
                    for (var m = 0; m < boxes.length; m++) measureGlyph(boxes[m]);
                } else {
                    clearPreview();
                    previewGroup = doc.activeLayer.groupItems.add();
                    previewGroup.name = PREVIEW_NAME;
                    for (var j = 0; j < options.count; j++) {
                        boxes.push(makeBox(previewGroup, labelText(j)));
                        if (j < options.count - 1) arrows.push(makeArrow(previewGroup));
                    }
                    for (var n = 0; n < boxes.length; n++) measureGlyph(boxes[n]);
                    arrowheadPending = true;
                }
                rebuildPending = false;
                layoutItems();
                return true;
            } catch (e) {
                lastError = e;
                clearPreview();
                try { app.redraw(); } catch (e2) {}
            }
        }
        status.text = "박스를 만들지 못했습니다: " + lastError + " (" + lastError.line + "행)";
        return false;
    }

    function labelText(i) {
        return labels[i] ? labels[i].text : " ";
    }

    function fillText(frame, text) {
        frame.contents = text;
        frame.textRange.characterAttributes.size = options.fontSize;
        frame.textRange.characterAttributes.fillColor = black;
        applyFontRule(frame);
    }

    // 박스 하나: 사각형을 먼저, 글자를 나중에 만들어 글자가 위에 오게 한다. 사각형은 layoutItems가 다시 쓴다
    function makeBox(container, text) {
        var group = container.groupItems.add();
        group.name = "StepBox";
        var path = group.pathItems.rectangle(0, 0, 10, 10);
        var frame = group.textFrames.add();
        fillText(frame, text);
        return { group: group, frame: frame, path: path };
    }

    function makeArrow(container) {
        var path = container.pathItems.add();
        path.name = "StepArrow";
        path.setEntirePath([[0, 0], [10, 0]]);
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        return path;
    }

    // 실제 글자 범위를 윤곽선으로 한 번 재서 프레임 기준 오프셋으로 기억한다 (글이 바뀔 때만).
    // 드래그마다 윤곽선을 만들면 Illustrator가 불안정해지므로 layoutItems는 이 오프셋만 쓴다.
    // 공백만 있으면 윤곽선이 비므로 실측 비율로 어림한다
    function measureGlyph(box) {
        var fb = box.frame.geometricBounds;
        var size = options.fontSize;
        var ob = null;
        try {
            var dup = box.frame.duplicate();
            var outline = dup.createOutline();
            ob = outline.geometricBounds;
            outline.remove();
        } catch (e) { ob = null; }
        if (ob === null || ob[2] - ob[0] <= 0 || ob[1] - ob[3] <= 0) {
            var bottom = fb[3] + GLYPH_BOTTOM * size;
            ob = [fb[0] + GLYPH_SIDE * size, bottom + GLYPH_HEIGHT * size, fb[2] - GLYPH_SIDE * size, bottom];
        }
        box.glyph = [ob[0] - fb[0], ob[1] - fb[1], ob[2] - fb[0], ob[3] - fb[1]];
    }

    function glyphBounds(box) {
        var fb = box.frame.geometricBounds;
        return [fb[0] + box.glyph[0], fb[1] + box.glyph[1], fb[0] + box.glyph[2], fb[1] + box.glyph[3]];
    }

    // 박스와 화살표를 왼쪽부터 등간격으로 놓고, 전체를 화면 중앙 + 이동값에 맞춘다. 세로는 모두 y=0 중심
    function layoutItems() {
        var gapPt = options.gap * mmToPt;
        var arrowLen = options.arrowLength * mmToPt;
        var arrowColor = makeGray(options.arrowK);
        var height = options.sameSize ? options.boxHeight * mmToPt
            : GLYPH_HEIGHT * options.fontSize + 2 * options.paddingY * mmToPt;
        // 개별 크기: 기호 칸은 기호가 아닌 박스 중 가장 좁은 너비를 따른다 (기호가 작아 박스가 너무 좁아지지 않게)
        var bounds = [];
        var widths = [];
        var minTextWidth = Infinity;
        for (var b = 0; b < boxes.length; b++) {
            // 윤곽선 측정으로 그룹 안 항목이 오가면 참조가 흐트러질 수 있어 순서로 다시 찾는다
            boxes[b].frame = boxes[b].group.textFrames[0];
            bounds.push(glyphBounds(boxes[b]));
            widths.push((bounds[b][2] - bounds[b][0]) + 2 * options.paddingX * mmToPt);
            if (!(labels[b] && labels[b].symbol)) minTextWidth = Math.min(minTextWidth, widths[b]);
        }
        var x = 0;
        for (var i = 0; i < boxes.length; i++) {
            var box = boxes[i];
            var gb = bounds[i];
            var width = options.sameSize ? options.boxWidth * mmToPt
                : ((labels[i] && labels[i].symbol && isFinite(minTextWidth)) ? minTextWidth : widths[i]);
            var radius = Math.min(options.radius * mmToPt, width / 2, height / 2);
            // 라운딩은 경로를 다시 만들어야 한다. 새 경로는 글자 아래(뒤)로 보낸다
            while (box.group.pathItems.length > 0) box.group.pathItems[0].remove();
            box.path = radius > 0
                ? box.group.pathItems.roundedRectangle(height / 2, x, width, height, radius, radius)
                : box.group.pathItems.rectangle(height / 2, x, width, height);
            box.path.name = "StepBoxRect";
            box.path.filled = false;
            box.path.stroked = true;
            box.path.strokeColor = black;
            box.path.strokeWidth = BOX_STROKE;
            box.path.strokeDashes = [];
            box.path.zOrder(ZOrderMethod.SENDTOBACK);
            // 글자 범위 중심을 박스 중심에 맞춘다
            box.frame.translate(x + width / 2 - (gb[0] + gb[2]) / 2, 0 - (gb[1] + gb[3]) / 2);
            x += width;
            if (i < arrows.length) {
                x += gapPt;
                var arrow = arrows[i];
                arrow.setEntirePath([[x, 0], [x + arrowLen, 0]]);
                arrow.strokeColor = arrowColor;
                arrow.strokeWidth = options.arrowWidth;
                arrow.strokeDashes = [];
                x += arrowLen + gapPt;
            }
        }
        var all = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (all[0] + all[2]) / 2 + options.offsetX * mmToPt,
            viewCenter[1] - (all[1] + all[3]) / 2 + options.offsetY * mmToPt);
    }

    function clearPreview() {
        boxes = [];
        arrows = [];
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {
                try { app.redraw(); previewGroup.remove(); } catch (e2) {}
            }
            previewGroup = null;
        }
        removeLeftoverGroups();
    }

    // 참조가 죽어 못 지운 미리보기 그룹을 이름으로 찾아 지운다 (이전 비정상 종료분 포함)
    function removeLeftoverGroups() {
        try {
            var groups = doc.activeLayer.groupItems;
            for (var i = groups.length - 1; i >= 0; i--) {
                if (groups[i].name === PREVIEW_NAME) {
                    try { groups[i].remove(); } catch (e) {}
                }
            }
        } catch (e2) {}
    }

    // -------------------------------------------------------
    // 화살촉 (DOM에 없어 임시 액션으로 적용, AGENTS.md 참고)
    // -------------------------------------------------------
    function applyArrowheads() {
        if (arrows.length === 0) { arrowheadPending = false; return; }
        var actionSetName = "Codex_StepFlow";
        var actionName = "StepFlowArrow";
        var actionFile = new File(Folder.temp + "/Codex_StepFlowArrow.aia");
        try {
            doc.selection = null;
            for (var i = 0; i < arrows.length; i++) arrows[i].selected = true;
            removeActionSetIfLoaded(actionSetName);
            writeArrowheadAction(actionFile, actionSetName, actionName);
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
            arrowheadPending = false;
        } catch (e) {
            // 화살표 이름은 UI 언어를 따른다. 실패해도 선 자체는 그대로 남는다
        }
        removeActionSetIfLoaded(actionSetName);
        try { actionFile.remove(); } catch (e2) {}
        doc.selection = null;
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName) {
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
        addUnitRealParameter(lines, 1, 2003072104, options.arrowWidth);
        addUStringParameter(lines, 2, 1634231345, getNoneArrowName());
        addUStringParameter(lines, 3, 1634231346, ARROW_NAME);
        addRealParameter(lines, 4, 1634951986, options.arrowScale);
        addEnumeratedParameter(lines, 5, 1634230636, "패스 끝의 팁", 0);
        lines.push("    }");
        lines.push("}");
        writeActionFile(actionFile, lines);
    }

    // -------------------------------------------------------
    // 글자 · 색
    // -------------------------------------------------------
    // 서체 규칙(02_문자/Text_koen.jsx와 동일): 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)
    function applyFontRule(frame) {
        var chars = frame.characters;
        for (var i = 0; i < chars.length; i++) {
            var code = chars[i].contents.charCodeAt(0);
            var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E)
                || (code >= 0x2160 && code <= 0x24FF) || (code >= 0x3200 && code <= 0x32FF);   // Ⅰ ⓐ ㉠ 기호
            var space = (code === 32 || code === 160 || code === 13 || code === 10);
            var attrs = chars[i].characterAttributes;
            try {
                attrs.textFont = (korean || space) ? korFont : engFont;
                attrs.baselineShift = (korean || space) ? 0 : 0.5;
            } catch (e) {}
        }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = k;
        } else {
            color = new RGBColor();
            var level = Math.round(255 * (1 - k / 100));
            color.red = level;
            color.green = level;
            color.blue = level;
        }
        return color;
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function settingKeys() {
        return {
            keys: ["count", "fontSize", "boxWidth", "boxHeight", "paddingX", "paddingY", "radius",
                "arrowLength", "arrowWidth", "arrowScale", "arrowK", "gap", "offsetX", "offsetY", "symbolSet"],
            mins: [MIN_STEPS, 4, 5, 3, 0, 0, 0, 1, 0.3, 10, 0, 0, -100, -100, 0],
            maxs: [MAX_STEPS, 30, 20, 10, 3, 3, 5, 5, 4, 100, 100, 3, 100, 100, SYMBOL_SETS.length - 1]
        };
    }

    function readSettings() {
        var result = { count: 4, fontSize: 8, boxWidth: 20, boxHeight: 8, paddingX: 2, paddingY: 1.5,
            radius: 1, arrowLength: 4, arrowWidth: 1, arrowScale: 100, arrowK: 100, gap: 1.5,
            offsetX: 0, offsetY: 0, symbolSet: 1, sameSize: false, preview: true };
        try {
            var spec = settingKeys();
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v2" || p.length !== spec.keys.length + 3) return result;
            for (var i = 0; i < spec.keys.length; i++) {
                var raw = p[i + 1];
                var value = Number(raw);
                if (!/\S/.test(raw) || !isFinite(value) || value < spec.mins[i] || value > spec.maxs[i]) return result;
            }
            var flags = p.slice(spec.keys.length + 1);
            if (!/^[01]$/.test(flags[0]) || !/^[01]$/.test(flags[1])) return result;
            for (var j = 0; j < spec.keys.length; j++) result[spec.keys[j]] = Number(p[j + 1]);
            result.count = Math.round(result.count);
            result.symbolSet = Math.round(result.symbolSet);
            result.sameSize = flags[0] === "1";
            result.preview = flags[1] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            var spec = settingKeys();
            var parts = ["v2"];
            for (var i = 0; i < spec.keys.length; i++) parts.push(options[spec.keys[i]]);
            parts.push(options.sameSize ? 1 : 0, options.preview ? 1 : 0);
            app.preferences.setStringPreference(PREF_KEY, parts.join("|"));
        } catch (e) {}
    }
})();
