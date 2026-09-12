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

/*
  Text_ChatBubbles.jsx
  기능: 여러 사람이 주고받는 채팅 말풍선을 한 번에 만듭니다.
    - 말풍선 수(2~5)를 고르면 그만큼 입력창이 열리고, 입력한 글마다 말풍선이 생깁니다
    - 글을 다 넣고 '완료'를 눌러야 그리기 시작합니다(타이핑마다 다시 그리면 느려서)
    - 위에서부터 9시 꼬리(왼쪽 정렬) → 3시 꼬리(오른쪽 정렬)를 번갈아 놓습니다
    - '같은 너비'를 켜면 모든 말풍선을 '말풍선 너비'로 맞추고 왼쪽 끝을 나란히 세웁니다.
      글은 영역 텍스트로 만들어 그 너비 안에서 자동 줄바꿈되고(좁히면 줄이 늘고 넓히면 줄어듦),
      빈 입력칸도 빈 말풍선으로 만듭니다
    - 글자는 한글=Spoqa, 영문·숫자·기호=GSMediumB1 규칙을 글자마다 적용합니다
    - 여백·라운딩·꼬리 옵션은 Text_AreaTextRoundedBox와 같습니다. 글자 범위는 윤곽선 대신
      프레임 범위에 서체별 고정 비율을 적용해 어림합니다(윤곽선 변환을 되풀이하면 Illustrator가 불안정)
  사용법: 그냥 실행하면 화면 중앙에 만듭니다
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var PREF_KEY = "TextChatBubbles/settings";
    var mmToPt = 2.83464567;
    var MAX_BUBBLES = 5;
    var PREVIEW_NAME = "ChatBubbles_Preview";   // 확인 때 "ChatBubbles"로 바꾼다
    // 프레임 범위(em 박스) 안에서 실제 글자가 차지하는 자리. Spoqa·GSMediumB1을 8·10·12pt로 잰 값(글자 크기 배수).
    // 글자 아래 끝 = 프레임 아래 + 0.23, 한글 글자 높이 0.896, 줄 간격 1.2(자동 행간 120%), 좌우 여백 0.05.
    var GLYPH_BOTTOM = 0.23;
    var GLYPH_HEIGHT = 0.896;
    var LINE_LEADING = 1.2;
    var GLYPH_SIDE = 0.05;
    var AREA_GLYPH_TOP = 0.044;   // 영역 텍스트: 상자 위 끝에서 첫 줄 글자 위 끝까지 (Spoqa 10pt 실측)
    var AREA_HEIGHT_SLACK = 0.25; // 영역 텍스트 상자 높이 여유 (부족하면 마지막 줄이 넘쳐 숨는다)
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var lineColor = makeBlackColor(doc);
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var options = readSettings();
    var previewGroup = null;
    var previewPending = false;
    var lastPreviewTime = 0;
    var PREVIEW_INTERVAL_MS = 40;
    var committed = false;
    var texts = [];             // '완료'를 누른 시점의 대화. 미리보기는 이것으로 그린다
    var bubbles = [];           // 말풍선 기록 {side}. 부품은 bubbleParts(i)로 순서에서 다시 찾는다
    var rebuildPending = false; // 글·수·글자 크기가 바뀌면 글자부터 다시 만든다

    removeLeftoverGroups();     // 이전 실행이 비정상 종료하며 남긴 미리보기 그룹 정리

    var win = new Window("dialog", "채팅 말풍선 만들기");
    win.alignChildren = "fill";
    win.spacing = 4;

    var countPanel = win.add("panel", undefined, "말풍선 수");
    countPanel.orientation = "row";
    var countRadios = [];
    for (var c = 2; c <= MAX_BUBBLES; c++) {
        var countRadio = countPanel.add("radiobutton", undefined, String(c));
        countRadio.value = (options.count === c);
        countRadio.onClick = makeCountHandler(c);
        countRadios.push(countRadio);
    }

    var chatPanel = win.add("panel", undefined, "대화 (위에서부터 · 홀수 번째 9시, 짝수 번째 3시 꼬리)");
    chatPanel.orientation = "row";
    chatPanel.alignChildren = ["left", "center"];
    var inputColumn = chatPanel.add("group");
    inputColumn.orientation = "column";
    inputColumn.alignChildren = "fill";
    inputColumn.spacing = 2;
    var inputs = [];
    for (var t = 0; t < MAX_BUBBLES; t++) {
        var inputRow = inputColumn.add("group");
        inputRow.alignChildren = ["left", "top"];
        var caption = inputRow.add("statictext", undefined, String(t + 1));
        caption.preferredSize.width = 16;
        // 여러 줄 입력: 엔터로 줄을 바꾼다. 타이핑 중에는 그리지 않는다
        var input = inputRow.add("edittext", undefined, "", {multiline: true});
        input.preferredSize = [250, 32];
        inputs.push(input);
    }
    var doneButton = chatPanel.add("button", undefined, "완료");
    doneButton.preferredSize = [50, 32];
    doneButton.helpTip = "입력한 대화로 말풍선을 그립니다";
    doneButton.onClick = function() {
        snapshotTexts();
        rebuildPending = true;
        updatePreview();
    };

    var textPanel = win.add("panel", undefined, "글자 · 배치");
    textPanel.alignChildren = "fill";
    textPanel.spacing = 2;
    addRow(textPanel, "글자 크기", "fontSize", 4, 30, "pt", false);
    addRow(textPanel, "채팅창 너비", "chatWidth", 20, 200, "mm", false);
    addRow(textPanel, "말풍선 간격", "gap", 0, 30, "mm", false);
    var sameWidth = textPanel.add("checkbox", undefined, "같은 너비");
    sameWidth.value = options.sameWidth;
    sameWidth.helpTip = "모든 말풍선을 아래 '말풍선 너비'로 맞추고 글을 그 안에서 줄바꿈합니다";
    var bubbleWidthRow = addRow(textPanel, "말풍선 너비", "bubbleWidth", 10, 100, "mm", false).parent;
    bubbleWidthRow.enabled = options.sameWidth;
    sameWidth.onClick = function() {
        options.sameWidth = sameWidth.value;
        bubbleWidthRow.enabled = sameWidth.value;
        rebuildPending = true;   // 포인트 ↔ 영역 텍스트 전환
        updatePreview();
    };

    // ---- Text_AreaTextRoundedBox와 같은 옵션 ----
    var boxPanel = win.add("panel", undefined, "사각형 · 텍스트 주변 여백");
    boxPanel.alignChildren = "fill";
    boxPanel.spacing = 2;
    addRow(boxPanel, "좌우 여백", "paddingX", 0, 50, "mm", false);
    addRow(boxPanel, "상하 여백", "paddingY", 0, 50, "mm", false);
    addRow(boxPanel, "코너 라운딩", "radius", 0, 50, "mm", false);
    var tailPanel = win.add("panel", undefined, "꼬리");
    tailPanel.alignChildren = "fill";
    tailPanel.spacing = 2;
    addRow(tailPanel, "붙는 위치", "tailOffset", 0, 100, "%", false).helpTip = "0 → 100%: 위 → 아래";
    addRow(tailPanel, "꼬리 크기", "tailSize", 20, 400, "%", false);
    addRow(tailPanel, "휘어짐", "tailBend", 0, 100, "%", false).helpTip = "0%: 곧은 꼬리 · 100%: 곡선";
    var flip = tailPanel.add("checkbox", undefined, "꼬리 휘어짐 반전");
    flip.value = options.flip;
    flip.onClick = function() { options.flip = flip.value; updatePreview(); };
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
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});
    var status = win.add("statictext", undefined, " ");
    status.preferredSize.width = 400;

    ok.onClick = function() {
        // '완료'를 안 눌렀거나 그 뒤에 고쳤으면 지금 입력값으로 다시 그린다
        if (snapshotTexts()) {
            previewPending = true;
            rebuildPending = true;
        }
        if (!hasAnyText()) {
            status.text = "대화를 하나 이상 입력해주세요.";
            return;
        }
        // 드래그 중 생략한 마지막 값을 확인 전에 반드시 반영한다.
        if (previewPending && !updatePreview()) return;
        if (previewGroup === null && !buildPreview()) return;
        committed = true;
        previewGroup.name = "ChatBubbles";
        saveSettings();
        doc.selection = null;
        previewGroup.selected = true;
        win.close(1);
    };

    updateInputState();
    win.onShow = function() { updatePreview(); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
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

    // 고른 수만큼만 입력창을 연다
    function updateInputState() {
        for (var i = 0; i < inputs.length; i++) inputs[i].enabled = (i < options.count);
    }

    // 입력창 글을 texts로 옮긴다. 바뀐 게 있으면 true
    function snapshotTexts() {
        var changed = false;
        for (var i = 0; i < MAX_BUBBLES; i++) {
            var text = String(inputs[i].text).replace(/\r\n|\n/g, "\r");
            if (texts[i] !== text) changed = true;
            texts[i] = text;
        }
        return changed;
    }

    function hasAnyText() {
        for (var i = 0; i < options.count; i++) {
            if (/\S/.test(texts[i] || "")) return true;
        }
        return false;
    }

    // 설명은 라벨의 helpTip에 둔다. 라벨을 돌려준다
    function addRow(panel, label, key, min, max, unit, positionOnly) {
        var row = panel.add("group");
        var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
        caption.preferredSize.width = 85;
        var step = unit === "mm" ? 0.1 : (unit === "pt" ? 0.5 : 1);
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 6;
        var slider = row.add("scrollbar", undefined, options[key], min, max);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = 196;
        function apply(value, dragging) {
            value = Math.round(value * 100) / 100;
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
                // 글자 크기·말풍선 너비는 글자부터 다시 (영역 텍스트 상자는 고쳐도 화면이 안 바뀐다)
                if (key === "fontSize" || key === "bubbleWidth") rebuildPending = true;
                updatePreview(dragging);
            }
        }
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
                // 글자는 그대로 두고 윤곽과 배치만 다시 쓴다 (드래그 중 가벼움)
                layoutBubbles();
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

    // 글자부터 전부 다시 만든다. 만드는 도중 오류가 나도 previewGroup을 먼저 잡아 두어
    // clearPreview가 조각을 남기지 않는다.
    // 한 번 실행 중에 createOutline을 되풀이하면 Illustrator가 개체 참조를 엉뚱한 개체로 풀어
    // PARM·"Target layer cannot be modified"가 무작위로 난다(실험으로 확인). 그래서 이 스크립트는
    // 윤곽선으로 글자를 재지 않고 프레임 범위에 고정 비율(glyphBounds)을 적용한다. 그래도 안전하게,
    // 말풍선 부품은 쓸 때마다 previewGroup에서 순서로 다시 찾고, 미리보기 그룹은 고유한 이름을 두어
    // 참조가 죽어도 이름으로 지운다.
    // 텍스트 프레임을 지우고 다시 만드는 일을 되풀이하면 Illustrator 상태가 흐트러져
    // 몇 번째부터 무작위로 실패한다. 그래서 말풍선 수가 같으면 있는 글자에 내용만 다시 쓰고,
    // 수가 달라질 때만 새로 만든다. 새로 만들기가 실패하면 화면을 한 번 갱신하고 한 번 더 시도한다.
    function buildPreview() {
        var entries = [];
        for (var i = 0; i < options.count; i++) {
            var text = texts[i] || "";
            if (!/\S/.test(text)) {
                if (!options.sameWidth) continue;
                text = " ";   // 같은 너비: 빈 칸도 빈 말풍선으로 (공백 하나면 프레임 높이가 한 줄로 잡힌다)
            }
            entries.push({ text: text, side: (i % 2 === 0) ? "left" : "right" });
        }
        if (entries.length === 0) {
            clearPreview();
            return false;
        }
        var lastError = null;
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                // 영역 텍스트는 내용·상자를 고쳐 써도 화면이 안 바뀌므로(넘침 표시가 남는다) 늘 새로 만든다
                if (previewGroup !== null && bubbles.length === entries.length && !options.sameWidth) {
                    refillBubbles(entries);
                } else {
                    clearPreview();
                    previewGroup = doc.activeLayer.groupItems.add();
                    previewGroup.name = PREVIEW_NAME;
                    for (var j = 0; j < entries.length; j++) {
                        var made = makeBubble(previewGroup, entries[j].text);
                        bubbles.push({ side: entries[j].side, lines: lineCount(made.textFrames[0], entries[j].text) });
                    }
                }
                rebuildPending = false;
                layoutBubbles();
                return true;
            } catch (e) {
                lastError = e;
                clearPreview();
                try { app.redraw(); } catch (e2) {}
            }
        }
        status.text = "말풍선을 만들지 못했습니다: " + lastError + " (" + lastError.line + "행)";
        return false;
    }

    // 있는 글자에 내용·크기만 다시 쓴다 (포인트 텍스트 전용)
    function refillBubbles(entries) {
        for (var i = 0; i < entries.length; i++) {
            var frame = bubbleParts(i).frame;
            frame.contents = entries[i].text;
            frame.textRange.characterAttributes.size = options.fontSize;
            frame.textRange.characterAttributes.fillColor = lineColor;
            applyFontRule(frame);
            bubbles[i].side = entries[i].side;
            bubbles[i].lines = lineCount(frame, entries[i].text);
        }
    }

    // 영역 텍스트는 Illustrator가 줄바꿈한 줄 수를, 포인트 텍스트는 엔터 수를 센다
    function lineCount(frame, text) {
        if (isAreaFrame(frame)) return Math.max(1, frame.lines.length);
        return text.split("\r").length;
    }

    function isAreaFrame(frame) {
        try { return frame.kind === TextType.AREATEXT; } catch (e) { return false; }
    }

    // 영역 텍스트 상자 높이를 줄바꿈된 줄 수만큼 잡는다 (너비는 만들 때 정해진다)
    function fitAreaHeight(frame) {
        if (!isAreaFrame(frame)) return;
        var lines = Math.max(1, frame.lines.length);
        frame.textPath.height = (lines * LINE_LEADING + AREA_HEIGHT_SLACK) * options.fontSize;
    }

    // 프레임 범위에서 실제 글자 범위를 어림한다. 윤곽선을 만들지 않고도 글자에 맞춰 세로 중심을 잡기 위함.
    // 영역 텍스트는 상자 위 끝에서 아래로, 포인트 텍스트는 프레임 아래 끝에서 위로 잰다.
    function glyphBounds(frame, lines) {
        var fb = frame.geometricBounds;
        var size = options.fontSize;
        var top, bottom;
        if (isAreaFrame(frame)) {
            top = fb[1] - AREA_GLYPH_TOP * size;
            bottom = top - GLYPH_HEIGHT * size - (lines - 1) * LINE_LEADING * size;
        } else {
            bottom = fb[3] + GLYPH_BOTTOM * size;
            top = Math.min(fb[1], bottom + GLYPH_HEIGHT * size + (lines - 1) * LINE_LEADING * size);
        }
        return [fb[0] + GLYPH_SIDE * size, top, fb[2] - GLYPH_SIDE * size, bottom];
    }

    function clearPreview() {
        bubbles = [];
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {
                // 참조가 흐트러져 못 지우면 화면을 갱신한 뒤 한 번 더
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
    // 그리기
    // -------------------------------------------------------
    // 같은 너비 모드는 영역 텍스트(상자가 textPath가 되어 pathItems에는 남지 않는다), 아니면 포인트 텍스트
    function makeTextFrame(container, text) {
        var frame;
        if (options.sameWidth) {
            var box = container.pathItems.rectangle(0, 0, options.bubbleWidth * mmToPt, 100);
            frame = container.textFrames.areaText(box);
        } else {
            frame = container.textFrames.add();
        }
        frame.contents = text;
        frame.textRange.characterAttributes.size = options.fontSize;
        frame.textRange.characterAttributes.fillColor = lineColor;
        applyFontRule(frame);
        fitAreaHeight(frame);
        return frame;
    }

    // 말풍선 하나: 빈 경로를 먼저, 글자를 나중에 만들어 글자가 위에 오게 한다(zOrder 불필요).
    // 윤곽은 layoutBubbles가 쓴다.
    function makeBubble(container, text) {
        var bubble = container.groupItems.add();
        bubble.name = "TextSpeechBubbleGroup";
        var path = bubble.pathItems.add();
        path.name = "TextSpeechBubble";
        path.closed = true;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = lineColor;
        path.strokeWidth = 0.3;
        path.strokeDashes = [];
        try { path.strokeJoin = StrokeJoin.ROUNDENDJOIN; } catch (joinError) {}
        makeTextFrame(bubble, text);
        return bubble;
    }

    // i번째 말풍선 부품을 순서로 다시 찾는다. 나중에 만든 그룹이 위(index 0)에 오므로 뒤집는다.
    function bubbleParts(i) {
        var group = previewGroup.groupItems[bubbles.length - 1 - i];
        return { group: group, frame: group.textFrames[0], path: group.pathItems[0] };
    }


    // 윤곽을 현재 옵션으로 다시 쓰고, 위에서부터 쌓는다. 9시 꼬리는 채팅창 왼쪽 끝에,
    // 3시 꼬리는 오른쪽 끝에 맞춘 뒤 전체를 화면 중앙 + 이동값에 놓는다.
    function layoutBubbles() {
        var chatLeft = viewCenter[0] - options.chatWidth * mmToPt / 2;
        var chatRight = chatLeft + options.chatWidth * mmToPt;
        var cursorTop = viewCenter[1];
        // 같은 너비: 가장 넓은 글자 범위에 맞춰 나머지 말풍선을 꼬리 반대쪽으로 늘리고 왼쪽에 세운다
        var bounds = [];
        var maxWidth = 0;
        for (var b = 0; b < bubbles.length; b++) {
            bounds.push(glyphBounds(bubbleParts(b).frame, bubbles[b].lines));
            maxWidth = Math.max(maxWidth, bounds[b][2] - bounds[b][0]);
        }
        for (var i = 0; i < bubbles.length; i++) {
            var record = bubbles[i];
            var parts = bubbleParts(i);
            var gb = bounds[i];
            if (options.sameWidth) {
                if (record.side === "left") gb[2] = gb[0] + maxWidth;
                else gb[0] = gb[2] - maxWidth;
            }
            writePath(parts.path, getBubblePoints(gb, record.side));
            var pb = parts.path.geometricBounds;
            var dx;
            if (options.sameWidth) {
                dx = chatLeft - (gb[0] - options.paddingX * mmToPt);   // 꼬리를 뺀 몸통 왼쪽 끝을 맞춘다
            } else {
                dx = (record.side === "left") ? chatLeft - pb[0] : chatRight - pb[2];
            }
            parts.group.translate(dx, cursorTop - pb[1]);
            cursorTop -= (pb[1] - pb[3]) + options.gap * mmToPt;
        }
        var all = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (all[0] + all[2]) / 2 + options.offsetX * mmToPt,
            viewCenter[1] - (all[1] + all[3]) / 2 + options.offsetY * mmToPt);
    }

    // 점 수가 같으면 기존 앵커를 덮어쓴다 (Text_AreaTextRoundedBox와 같은 방식)
    function writePath(path, points) {
        for (var q = 0; q < points.length; q++) {
            var point = q < path.pathPoints.length ? path.pathPoints[q] : path.pathPoints.add();
            point.anchor = points[q].anchor;
            point.leftDirection = points[q].left;
            point.rightDirection = points[q].right;
            point.pointType = PointType.CORNER;
        }
        while (path.pathPoints.length > points.length) path.pathPoints[path.pathPoints.length - 1].remove();
    }

    // 둥근 사각형과 곡선 꼬리를 하나의 닫힌 경로로 직접 만든다 (Text_AreaTextRoundedBox와 동일).
    function getBubblePoints(bounds, tailPosition) {
        var opts = options;
        var left = bounds[0] - opts.paddingX * mmToPt;
        var top = bounds[1] + opts.paddingY * mmToPt;
        var width = bounds[2] - bounds[0] + 2 * opts.paddingX * mmToPt;
        var height = bounds[1] - bounds[3] + 2 * opts.paddingY * mmToPt;
        var horizontal = tailPosition === "top" || tailPosition === "bottom";
        var sideLength = horizontal ? width : height;
        var scale = opts.tailSize / 100;      // 꼬리 크기: 밑변과 길이를 같은 비율로
        var base = Math.min(1.26 * mmToPt * scale, sideLength / 3);
        // 꼬리가 붙는 직선 구간을 확보하고 모서리와의 겹침을 방지한다.
        var radius = Math.min(opts.radius * mmToPt, width / 2, height / 2, (sideLength - base) / 2);
        var points = [];
        var k = 0.5522847498;
        function add(anchor, incoming, outgoing) {
            points.push({ anchor: anchor, left: incoming || anchor, right: outgoing || anchor });
        }
        // 각 변의 진행 방향은 시계 방향, v는 바깥쪽을 향한다.
        function edge(name, origin, tangent, normal, length) {
            function map(u, v) {
                return [origin[0] + tangent[0] * u + normal[0] * v,
                    origin[1] + tangent[1] * u + normal[1] * v];
            }
            add(map(radius, 0), map(radius - k * radius, 0));
            if (tailPosition === name) {
                var ratio = opts.tailOffset / 100;
                if (name === "bottom" || name === "left") ratio = 1 - ratio;
                var center = radius + base / 2 + ratio * Math.max(0, length - 2 * radius - base);
                var reverse = opts.flip !== (name === "bottom" || name === "left");
                var tailMap = function(x, y) {
                    var u = (x - 2.25) * base / 3.49;
                    if (reverse) u = base - u;
                    return map(center - base / 2 + u, (y - 0.15) * 2.45 * mmToPt * scale / 6.9);
                };
                // 곧은 삼각형의 베지어 제어점에서 기존 곡선까지 보간한다.
                var bend = opts.tailBend / 100;
                var midX = (2.25 + 5.74) / 2;
                var curve = function(x, y, straightX, straightY) {
                    return tailMap(straightX + (x - straightX) * bend,
                        straightY + (y - straightY) * bend);
                };
                var tail = [
                    { anchor: tailMap(2.25, 0.15), left: tailMap(2.25, 0.15),
                        right: curve(3.22, 2.68, (2 * 2.25 + midX) / 3, 2.45) },
                    { anchor: curve(0.15, 7.05, midX, 7.05),
                        left: curve(2.21, 4.98, (2.25 + 2 * midX) / 3, 4.75),
                        right: curve(3.78, 5.43, (2 * midX + 5.74) / 3, 4.75) },
                    { anchor: tailMap(5.74, 0.15),
                        left: curve(5.6, 3.91, (midX + 2 * 5.74) / 3, 2.45), right: tailMap(5.74, 0.15) }
                ];
                if (reverse) {
                    tail.reverse();
                    for (var t = 0; t < tail.length; t++) {
                        var handle = tail[t].left;
                        tail[t].left = tail[t].right;
                        tail[t].right = handle;
                    }
                }
                for (var j = 0; j < tail.length; j++) points.push(tail[j]);
            }
            add(map(length - radius, 0), null, map(length - radius + k * radius, 0));
        }
        edge("top", [left, top], [1, 0], [0, 1], width);
        edge("right", [left + width, top], [0, -1], [1, 0], height);
        edge("bottom", [left + width, top - height], [-1, 0], [0, -1], width);
        edge("left", [left, top - height], [0, 1], [-1, 0], height);
        return points;
    }

    // 서체 규칙(02_문자/Text_koen.jsx와 동일): 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)
    function applyFontRule(frame) {
        var chars = frame.characters;
        for (var i = 0; i < chars.length; i++) {
            var code = chars[i].contents.charCodeAt(0);
            var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
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

    function makeBlackColor(documentRef) {
        var color;
        if (documentRef.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = 100;
        } else {
            color = new RGBColor();
            color.red = 0;
            color.green = 0;
            color.blue = 0;
        }
        return color;
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function readSettings() {
        var result = { count: 2, fontSize: 8, chatWidth: 60, gap: 2,
            paddingX: 2, paddingY: 1.5, radius: 1.5, tailOffset: 30, tailBend: 100, tailSize: 100,
            flip: false, offsetX: 0, offsetY: 0, preview: true, sameWidth: false, bubbleWidth: 40 };
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v4" || p.length !== 17) return result;
            var keys = ["count", "fontSize", "chatWidth", "gap", "paddingX", "paddingY", "radius",
                "tailOffset", "tailBend", "tailSize", "offsetX", "offsetY", "bubbleWidth"];
            var mins = [2, 4, 20, 0, 0, 0, 0, 0, 0, 20, -100, -100, 10];
            var maxs = [MAX_BUBBLES, 30, 200, 30, 50, 50, 50, 100, 100, 400, 100, 100, 100];
            for (var i = 0; i < keys.length; i++) {
                var raw = p[i + 1];
                var value = Number(raw);
                if (!/\S/.test(raw) || !isFinite(value) || value < mins[i] || value > maxs[i]) return result;
            }
            if (!/^[01]$/.test(p[14]) || !/^[01]$/.test(p[15]) || !/^[01]$/.test(p[16])) return result;
            for (var j = 0; j < keys.length; j++) result[keys[j]] = Number(p[j + 1]);
            result.count = Math.round(result.count);
            result.flip = p[14] === "1";
            result.preview = p[15] === "1";
            result.sameWidth = p[16] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v4", options.count, options.fontSize,
                options.chatWidth, options.gap, options.paddingX, options.paddingY, options.radius,
                options.tailOffset, options.tailBend, options.tailSize, options.offsetX, options.offsetY,
                options.bubbleWidth, options.flip ? 1 : 0, options.preview ? 1 : 0, options.sameWidth ? 1 : 0].join("|"));
        } catch (e) {}
    }
})();
