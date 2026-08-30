/*
  Illustrator Script: Apply Expanding Arrow Style
  Description: 선택한 패스에 확장 화살표(선 + 끝 화살표 3 + 폭 속성1)를 적용합니다.
               면으로 확장할지, 확장한 면에 흰색 선을 넣을지 옵션으로 고릅니다.
*/

#include "Object_expand_arrow_helper.jsxinc"
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
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectExpandArrow/settings";

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("확장 화살표를 적용할 선을 선택해주세요.");
        return;
    }

    var sourcePaths = [];
    for (var i = 0; i < sel.length; i++) {
        collectPathItems(sel[i], sourcePaths);
    }

    if (sourcePaths.length === 0) {
        alert("선택 항목 안에 적용 가능한 패스가 없습니다.");
        return;
    }

    var strokeWidthPt = 8;
    var arrowScale = 20;
    var expandToFill = true;
    var addWhiteLine = true;
    var whiteLineWidthPt = 0.3;
    var previewEnabled = true;
    var previewItems = [];

    applySavedSettings();

    var LABEL_WIDTH = 74;
    var SLIDER_WIDTH = 180;

    var dlg = new Window("dialog", "확장 화살표");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var strokePanel = addPanel(dlg, "선");
    var strokeField = addNumberField(strokePanel, "획 굵기", "pt", strokeWidthPt, 0.5, 0.5, 200);
    var arrowField = addNumberField(strokePanel, "화살표 크기", "%", arrowScale, 1, 1, 1000);

    var outlinePanel = addPanel(dlg, "확장");
    var expandCheck = outlinePanel.add("checkbox", undefined, "선을 면으로 확장 (화살촉과 몸통 합치기)");
    expandCheck.value = expandToFill;
    var whiteRow = outlinePanel.add("group");
    whiteRow.alignChildren = ["left", "center"];
    var whiteCheck = whiteRow.add("checkbox", undefined, "흰색 선 추가");
    whiteCheck.value = addWhiteLine;
    var whiteField = addNumberField(whiteRow, "", "pt", whiteLineWidthPt, 0.1, 0.1, 20, true);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    expandCheck.onClick = function() {
        expandToFill = expandCheck.value;
        updateWhiteEnabled();
        updatePreview();
    };
    whiteCheck.onClick = function() {
        addWhiteLine = whiteCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    updateWhiteEnabled();

    // 원본은 숨겨두고 복제본으로 미리보기를 만든다.
    // 확인하면 그 복제본을 그대로 결과로 쓰고 원본을 지운다.
    var sourceHidden = [];
    for (var h = 0; h < sourcePaths.length; h++) {
        sourceHidden.push(sourcePaths[h].hidden);
    }
    hideSources(true);
    updatePreview();

    var result = dlg.show();

    if (result === 1) {
        readFields(false);
        if (previewItems.length === 0) {
            buildResult(true);
        }
        for (var r = 0; r < sourcePaths.length; r++) {
            try { sourcePaths[r].remove(); } catch (e) {}
        }
        doc.selection = null;
        for (var s = 0; s < previewItems.length; s++) {
            try { previewItems[s].selected = true; } catch (e2) {}
        }
        saveSettings();
    } else {
        clearPreview();
        hideSources(false);
        doc.selection = null;
        for (var t = 0; t < sourcePaths.length; t++) {
            try { sourcePaths[t].selected = true; } catch (e3) {}
        }
    }
    app.redraw();

    function hideSources(hidden) {
        for (var i = 0; i < sourcePaths.length; i++) {
            try {
                sourcePaths[i].hidden = hidden ? true : sourceHidden[i];
            } catch (e) {}
        }
    }

    function updateWhiteEnabled() {
        whiteRow.enabled = expandCheck.value;
    }

    // 원본을 복제해 전체 과정을 적용한다. 미리보기와 최종 결과가 같은 경로를 쓴다.
    function buildResult(warnMissingProfile) {
        var copies = [];
        for (var i = 0; i < sourcePaths.length; i++) {
            try {
                var copy = sourcePaths[i].duplicate();
                copy.hidden = false;
                copies.push(copy);
            } catch (e) {}
        }

        if (copies.length === 0) return;

        applyExpandArrow(doc, copies, strokeWidthPt, arrowScale, warnMissingProfile);

        if (expandToFill) {
            previewItems = outlineExpandArrow(doc, copies, addWhiteLine, whiteLineWidthPt);
        } else {
            previewItems = copies;
        }
    }

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        buildResult(false);
        app.redraw();
    }

    function clearPreview() {
        for (var i = previewItems.length - 1; i >= 0; i--) {
            try { previewItems[i].remove(); } catch (e) {}
        }
        previewItems = [];
    }

    function readFields(showAlert) {
        var width = parseNumber(strokeField.input.text);
        var scale = parseNumber(arrowField.input.text);
        var whiteWidth = parseNumber(whiteField.input.text);

        if (width === null || width <= 0) {
            if (showAlert) alert("획 굵기는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }
        if (scale === null || scale <= 0) {
            if (showAlert) alert("화살표 크기는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }
        if (whiteWidth === null || whiteWidth <= 0) {
            if (showAlert) alert("흰색 선 굵기는 0보다 큰 숫자로 입력해주세요.");
            return false;
        }

        strokeWidthPt = width;
        arrowScale = scale;
        whiteLineWidthPt = whiteWidth;
        expandToFill = expandCheck.value;
        addWhiteLine = whiteCheck.value;
        return true;
    }

    // 라벨 · 입력칸 · 단위 · 슬라이더를 한 줄에 배치.
    // 화살표 적용은 액션을 실행하는 무거운 작업이라 드래그 중에는 값만 바꾸고
    // 슬라이더에서 손을 뗐을 때 미리보기를 갱신한다.
    function addNumberField(parent, labelText, unit, value, step, minimum, maximum, compact) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        if (labelText !== "") {
            var label = row.add("statictext", undefined, labelText);
            label.preferredSize.width = compact ? 0 : LABEL_WIDTH;
        }
        var input = row.add("edittext", undefined, formatValue(value));
        input.characters = 5;
        input.justify = "center";
        row.add("statictext", undefined, unit);
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = 22;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = compact ? 110 : SLIDER_WIDTH;

        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = 22;

        var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};
        down.onClick = function() { stepField(field, -1); };
        up.onClick = function() { stepField(field, 1); };

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampField(field, stepped));
        };
        slider.onChange = function() {
            if (field.syncing) return;
            updatePreview();
        };
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampField(field, parsed);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            updatePreview();
        };
        return field;
    }

    // 버튼 한 번 = 1단계. 세밀 조절용.
    function stepField(field, direction) {
        var value = parseNumber(field.input.text);
        if (value === null) value = field.minimum;
        value = Math.round((value + (field.step * direction)) / field.step) * field.step;
        value = clampField(field, value);
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
        updatePreview();
    }

    function clampField(field, value) {
        if (value < field.minimum) value = field.minimum;
        if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
        return value;
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function formatValue(value) {
        return String(Math.round(value * 100) / 100);
    }

    function saveSettings() {
        var parts = [
            "v1",
            strokeWidthPt,
            arrowScale,
            expandToFill ? "1" : "0",
            addWhiteLine ? "1" : "0",
            whiteLineWidthPt
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 6) return;

        var width = parseFloat(p[1]);
        var scale = parseFloat(p[2]);
        var whiteWidth = parseFloat(p[5]);
        if (width > 0) strokeWidthPt = width;
        if (scale > 0) arrowScale = scale;
        if (whiteWidth > 0) whiteLineWidthPt = whiteWidth;
        expandToFill = (p[3] === "1");
        addWhiteLine = (p[4] === "1");
    }
})();
