// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_DnaRnaSequence.jsx
  기능: DNA 위쪽 가닥 염기서열을 입력하면 당인산 골격(가로선) + 연결선 + 염기 글자로
        DNA 1(입력) · DNA 2(상보) · RNA(DNA 1의 T→U) 세 줄을 그립니다.
    - 가릴 서열을 입력하면 그 자리를 흰 사각 박스로 덮고 ? · ⓐⓑⓒ · ㉠㉡㉢ · ⅠⅡⅢ 중 하나를 씁니다
    - 서열 입력은 '완료'를 눌러야 반영됩니다(타이핑마다 다시 그리면 느려서)
  사용법: 그냥 실행하면 화면 중앙에 만듭니다
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectDnaRnaSequence/settings";
    var mmToPt = 2.83464567;
    var PREVIEW_NAME = "DnaRnaSequence_Preview";
    var STEP_BUTTON_WIDTH = 34;          // 더 좁히면 macOS 둥근 모서리가 맞붙어 타원처럼 보인다
    var ENG_FONT_NAME = "GSMediumB1";
    var SYMBOL_FONT_NAME = "Batang";     // 원문자·로마자는 바탕체(Object_CellCycle과 동일)
    var RNA_GRAY_K = 50;                 // RNA 골격·연결선 회색
    var LABELS = ["?",
        String.fromCharCode(0x24D0), String.fromCharCode(0x24D1), String.fromCharCode(0x24D2),   // ⓐⓑⓒ
        String.fromCharCode(0x3260), String.fromCharCode(0x3261), String.fromCharCode(0x3262),   // ㉠㉡㉢
        String.fromCharCode(0x2160), String.fromCharCode(0x2161), String.fromCharCode(0x2162)];  // ⅠⅡⅢ

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var engFont = findTextFont([ENG_FONT_NAME]);
    var symbolFont = findTextFont([SYMBOL_FONT_NAME, ENG_FONT_NAME]);
    var options = readSettings();
    var previewGroup = null;
    var previewPending = false;
    var lastPreviewTime = 0;
    var PREVIEW_INTERVAL_MS = 40;
    var committed = false;

    removeLeftoverGroups();

    var win = new Window("dialog", "DNA · RNA 염기 서열");
    win.alignChildren = "fill";
    win.spacing = 4;

    // ---- 서열 입력 ----
    var seqRow = win.add("group");
    seqRow.alignChildren = ["left", "center"];
    addCaption(seqRow, "DNA 1 서열");
    var seqInput = seqRow.add("edittext", undefined, options.seq);
    seqInput.preferredSize.width = 220;
    seqInput.helpTip = "위쪽 가닥. A·C·G·T만 읽습니다";
    var seqButton = seqRow.add("button", undefined, "완료");
    seqButton.preferredSize.width = 50;
    seqButton.onClick = function() { snapshotInputs(); updatePreview(); };

    var maskPanel = win.add("panel", undefined, "가릴 서열 · 박스 문자");
    maskPanel.alignChildren = "fill";
    maskPanel.spacing = 2;
    maskPanel.margins = [8, 12, 8, 6];
    var maskInputs = [];
    var maskNames = ["DNA 1", "DNA 2", "RNA"];
    for (var m = 0; m < 3; m++) {
        var maskRow = maskPanel.add("group");
        maskRow.alignChildren = ["left", "center"];
        maskRow.spacing = 3;
        addCaption(maskRow, maskNames[m]);
        var maskInput = maskRow.add("edittext", undefined, options.masks[m]);
        maskInput.preferredSize.width = 90;
        maskInput.helpTip = "그 줄에 보이는 대로 입력 (RNA는 U)";
        maskInputs.push(maskInput);
        var labelList = maskRow.add("dropdownlist", undefined, LABELS);
        labelList.selection = options.labels[m];
        labelList.helpTip = "박스 안에 쓸 문자";
        labelList.onChange = makeLabelHandler(m, labelList);
        var maskButton = maskRow.add("button", undefined, "완료");
        maskButton.preferredSize.width = 50;
        maskButton.onClick = function() { snapshotInputs(); updatePreview(); };
    }

    // ---- 조절 ----
    var linePanel = win.add("panel", undefined, "선 · 글자");
    linePanel.alignChildren = "fill";
    linePanel.spacing = 2;
    addRow(linePanel, "골격 굵기", "backboneWidth", 0.1, 5, "pt", false);
    addRow(linePanel, "연결선 굵기", "tickWidth", 0.1, 5, "pt", false);
    addRow(linePanel, "연결선 길이", "tickLength", 0, 20, "mm", false);
    addRow(linePanel, "글자 크기", "fontSize", 4, 30, "pt", false);

    var gapPanel = win.add("panel", undefined, "간격");
    gapPanel.alignChildren = "fill";
    gapPanel.spacing = 2;
    addRow(gapPanel, "염기 간격", "baseGap", 1, 30, "mm", false);
    addRow(gapPanel, "DNA 1–2", "strandGap", 2, 60, "mm", false);
    addRow(gapPanel, "DNA 2–RNA", "rnaGap", 2, 60, "mm", false);

    var positionPanel = win.add("panel", undefined, "위치");
    positionPanel.alignChildren = "fill";
    positionPanel.spacing = 2;
    addRow(positionPanel, "가로 이동", "offsetX", -100, 100, "mm", true);
    addRow(positionPanel, "세로 이동", "offsetY", -100, 100, "mm", true);

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
    status.preferredSize.width = 380;

    ok.onClick = function() {
        if (snapshotInputs()) previewPending = true;
        if (options.seq === "") {
            status.text = "DNA 1 서열을 입력해주세요.";
            return;
        }
        if (previewPending && !updatePreview()) return;
        if (previewGroup === null && !buildPreview()) return;
        committed = true;
        previewGroup.name = "DnaRnaSequence";
        saveSettings();
        doc.selection = null;
        previewGroup.selected = true;
        win.close(1);
    };

    win.onShow = function() { updatePreview(); };
    try { win.show(); }
    finally {
        if (!committed) clearPreview();
        app.redraw();
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addCaption(row, text) {
        var caption = row.add("statictext", undefined, text);
        caption.preferredSize.width = 80;
        return caption;
    }

    function makeLabelHandler(index, list) {
        return function() {
            if (list.selection === null) return;
            options.labels[index] = list.selection.index;
            updatePreview();
        };
    }

    // 입력창 글을 options로 옮긴다. 바뀐 게 있으면 true
    function snapshotInputs() {
        var changed = false;
        var seq = cleanSequence(seqInput.text, false);
        if (seq !== options.seq) { options.seq = seq; changed = true; }
        for (var i = 0; i < 3; i++) {
            var mask = cleanSequence(maskInputs[i].text, true);
            if (mask !== options.masks[i]) { options.masks[i] = mask; changed = true; }
        }
        return changed;
    }

    function addRow(panel, label, key, min, max, unit, positionOnly) {
        var row = panel.add("group");
        row.spacing = 3;
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = 80;
        var step = unit === "mm" ? 0.1 : (key === "fontSize" ? 0.5 : 0.1);
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        minus.helpTip = String(step) + unit + " 감소";
        var slider = row.add("slider", undefined, options[key], min, max);
        slider.preferredSize.width = 77;
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
        plus.helpTip = String(step) + unit + " 증가";
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 5;
        row.add("statictext", undefined, unit);
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
            } else if (!buildPreview()) {
                return false;
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

    function buildPreview() {
        clearPreview();
        if (options.seq === "") {
            status.text = "DNA 1 서열을 입력하고 '완료'를 누르세요.";
            return false;
        }
        previewGroup = doc.activeLayer.groupItems.add();
        previewGroup.name = PREVIEW_NAME;
        var missing = drawAll(previewGroup);
        previewGroup.translate(options.offsetX * mmToPt, options.offsetY * mmToPt);
        if (missing.length > 0) status.text = missing.join(", ") + " 가릴 서열을 찾지 못했습니다.";
        return true;
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {
                try { app.redraw(); previewGroup.remove(); } catch (e2) {}
            }
            previewGroup = null;
        }
        removeLeftoverGroups();
    }

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
    // 세 줄을 그리고, 못 찾은 가릴 서열의 줄 이름을 돌려준다
    function drawAll(group) {
        var seq1 = options.seq;
        var seq2 = complement(seq1);
        var rna = transcribe(seq1);
        var gap = options.baseGap * mmToPt;
        var tick = options.tickLength * mmToPt;
        var letterDrop = tick + options.fontSize * 0.65;      // 골격에서 글자 중심까지
        var width = seq1.length * gap;
        var height = options.strandGap * mmToPt + options.rnaGap * mmToPt + letterDrop + options.fontSize * 0.5;
        var x0 = viewCenter[0] - width / 2 + gap / 2;          // 첫 염기 중심
        var y1 = viewCenter[1] + height / 2;                   // DNA 1 골격
        var y2 = y1 - options.strandGap * mmToPt;              // DNA 2 골격
        var y3 = y2 - options.rnaGap * mmToPt;                 // RNA 골격
        var black = makeGray(100);
        var gray = makeGray(RNA_GRAY_K);
        var xs = [];
        for (var i = 0; i < seq1.length; i++) xs.push(x0 + i * gap);

        drawStrand(group, seq1, xs, y1, -1, black);
        drawStrand(group, seq2, xs, y2, 1, black);
        drawStrand(group, rna, xs, y3, -1, gray);

        var missing = [];
        var rows = [[seq1, y1 - letterDrop], [seq2, y2 + letterDrop], [rna, y3 - letterDrop]];
        for (var k = 0; k < 3; k++) {
            if (options.masks[k] === "") continue;
            var at = rows[k][0].indexOf(options.masks[k]);
            if (at < 0) { missing.push(maskNames[k]); continue; }
            drawMask(group, xs, at, options.masks[k].length, rows[k][1], LABELS[options.labels[k]]);
        }
        return missing;
    }

    // 골격 가로선 + 염기마다 연결선과 글자. dir: 연결선·글자가 놓이는 쪽(-1 아래, +1 위)
    function drawStrand(group, seq, xs, backboneY, dir, color) {
        var gap = options.baseGap * mmToPt;
        var tick = options.tickLength * mmToPt;
        drawLine(group, xs[0] - gap / 2, backboneY, xs[xs.length - 1] + gap / 2, backboneY, options.backboneWidth, color);
        for (var i = 0; i < seq.length; i++) {
            drawLine(group, xs[i], backboneY, xs[i], backboneY + dir * tick, options.tickWidth, color);
            placeText(group, seq.charAt(i), xs[i], backboneY + dir * (tick + options.fontSize * 0.65), engFont);
        }
    }

    // 글자 위를 흰 사각형으로 덮고 가운데에 표시 문자를 쓴다
    function drawMask(group, xs, at, length, centerY, label) {
        var gap = options.baseGap * mmToPt;
        var half = options.fontSize * 0.7;
        var left = xs[at] - gap / 2;
        var right = xs[at + length - 1] + gap / 2;
        var rect = group.pathItems.rectangle(centerY + half, left, right - left, half * 2);
        rect.filled = true;
        rect.fillColor = makeGray(0);
        rect.stroked = true;
        rect.strokeWidth = options.tickWidth;
        rect.strokeColor = makeGray(100);
        placeText(group, label, (left + right) / 2, centerY, label === "?" ? engFont : symbolFont);
    }

    function drawLine(group, x1, y1, x2, y2, width, color) {
        var path = group.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = width;
        path.strokeColor = color;
        try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e) {}
        return path;
    }

    // 글자 중심을 (x, y)에 맞춘다
    function placeText(group, text, x, y, font) {
        var frame = group.textFrames.add();
        frame.contents = text;
        var attrs = frame.textRange.characterAttributes;
        attrs.size = options.fontSize;
        attrs.fillColor = makeGray(100);
        try { attrs.textFont = font; } catch (e) {}
        var gb = frame.geometricBounds;
        frame.translate(x - (gb[0] + gb[2]) / 2, y - (gb[1] + gb[3]) / 2);
        return frame;
    }

    function complement(seq) {
        var map = { A: "T", T: "A", G: "C", C: "G" };
        var out = "";
        for (var i = 0; i < seq.length; i++) out += map[seq.charAt(i)];
        return out;
    }

    function transcribe(seq) {
        return seq.replace(/T/g, "U");
    }

    // 대문자로 바꾸고 염기 문자만 남긴다
    function cleanSequence(text, allowU) {
        return String(text).toUpperCase().replace(allowU ? /[^ACGTU]/g : /[^ACGT]/g, "");
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
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function readSettings() {
        var result = { seq: "", masks: ["", "", ""], labels: [0, 1, 4],
            backboneWidth: 1, tickWidth: 0.3, tickLength: 3, fontSize: 10,
            baseGap: 6, strandGap: 16, rnaGap: 14, offsetX: 0, offsetY: 0, preview: true };
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v1" || p.length !== 18) return result;
            var keys = ["backboneWidth", "tickWidth", "tickLength", "fontSize", "baseGap", "strandGap", "rnaGap", "offsetX", "offsetY"];
            var mins = [0.1, 0.1, 0, 4, 1, 2, 2, -100, -100];
            var maxs = [5, 5, 20, 30, 30, 60, 60, 100, 100];
            for (var i = 0; i < keys.length; i++) {
                var value = Number(p[i + 1]);
                if (!/\S/.test(p[i + 1]) || !isFinite(value) || value < mins[i] || value > maxs[i]) return result;
            }
            for (var j = 0; j < 3; j++) {
                if (!/^[0-9]$/.test(p[10 + j])) return result;
                if (!/^[ACGTU]*$/.test(p[14 + j])) return result;
            }
            if (!/^[ACGT]*$/.test(p[13]) || !/^[01]$/.test(p[17])) return result;
            for (var k = 0; k < keys.length; k++) result[keys[k]] = Number(p[k + 1]);
            for (var l = 0; l < 3; l++) {
                result.labels[l] = Number(p[10 + l]);
                result.masks[l] = p[14 + l];
            }
            result.seq = p[13];
            result.preview = p[17] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v1", options.backboneWidth, options.tickWidth,
                options.tickLength, options.fontSize, options.baseGap, options.strandGap, options.rnaGap,
                options.offsetX, options.offsetY, options.labels[0], options.labels[1], options.labels[2],
                options.seq, options.masks[0], options.masks[1], options.masks[2],
                options.preview ? 1 : 0].join("|"));
        } catch (e) {}
    }
})();
