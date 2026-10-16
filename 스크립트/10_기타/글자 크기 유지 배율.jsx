// 글자 크기 유지 배율.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 선택한 그림 전체를 배율(%)만큼 키우거나 줄이되 글자(TextFrame)의 크기는 그대로 둔다.
//   - 배율의 기준점은 선택한 개체 전체의 가운데. 글자는 제 위치(가운데)만 배율에 맞춰 옮겨진다.
//   - 그룹 안에 든 글자도 찾아서 크기를 되돌린다. 글자의 서체·글자 크기·획은 바뀌지 않는다.
//   - 선 두께도 배율을 따를지 고를 수 있다. 끄면 선은 원래 두께 그대로.
//   - 미리보기는 복제본으로 그리고 원본은 숨긴다. 확인하면 원본이 지워지고 복제본이 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectScaleKeepText/settings";
    var MM = 2.834645669;
    var SCALE_RANGE = [10, 500];
    var POSITION_LIMIT_MM = 200;
    var LABEL_WIDTH = 60;
    var SLIDER_WIDTH = 118;
    var RESET_BUTTON_WIDTH = 34;

    var doc = app.activeDocument;
    var originals = [];
    for (var si = 0; si < doc.selection.length; si++) {
        var picked = doc.selection[si];
        try {
            if (picked.locked || picked.hidden || picked.guides) continue;
        } catch (pickError) {}
        originals.push(picked);
    }
    if (originals.length === 0) {
        alert("크기를 바꿀 그림을 선택해주세요.");
        return;
    }

    // 배율 기준점: 선택한 개체 전체의 가운데
    var refBounds = null;
    for (var bi = 0; bi < originals.length; bi++) {
        var gb = originals[bi].geometricBounds;
        if (refBounds === null) refBounds = [gb[0], gb[1], gb[2], gb[3]];
        else refBounds = [Math.min(refBounds[0], gb[0]), Math.max(refBounds[1], gb[1]),
            Math.max(refBounds[2], gb[2]), Math.min(refBounds[3], gb[3])];
    }
    var refX = (refBounds[0] + refBounds[2]) / 2;
    var refY = (refBounds[1] + refBounds[3]) / 2;

    // 옵션
    var scalePct = 50;
    var scaleLines = true;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previews = [];

    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {scalePct: scalePct, offsetXmm: offsetXmm, offsetYmm: offsetYmm};
    applySettings();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "글자 크기 유지 배율");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var sizePanel = addPanel(dlg, "크기");
    var scaleRow = addValueRow(sizePanel, "배율", scalePct, SCALE_RANGE[0], SCALE_RANGE[1], 1, 0);
    scaleRow.input.helpTip = "% — 100이면 원래 크기. 글자 크기는 그대로 두고 그림만 키우거나 줄인다";
    var lineCheck = sizePanel.add("checkbox", undefined, "선 두께도 배율 적용");
    lineCheck.value = scaleLines;

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
    offsetXRow.input.helpTip = "mm";
    var offsetYRow = addValueRow(positionPanel, "세로", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
    offsetYRow.input.helpTip = "mm";

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(scaleRow, function() { return scalePct; }, function(v) { scalePct = v; }, DEFAULTS.scalePct);
    lineCheck.onClick = function() { scaleLines = lineCheck.value; updatePreview(); };
    // 위치는 다시 만들지 않고 복제본만 옮긴다
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true, DEFAULTS.offsetXmm);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false, DEFAULTS.offsetYmm);

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previews.length === 0) buildPreview();
        for (var i = 0; i < originals.length; i++) {
            try { originals[i].remove(); } catch (removeError) {}
        }
        saveSettings();
        doc.selection = null;
        for (var j = 0; j < previews.length; j++) {
            try { previews[j].selected = true; } catch (selectError) {}
        }
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        restoreOriginals();
        for (var k = 0; k < originals.length; k++) {
            try { originals[k].selected = true; } catch (selectError2) {}
        }
    }
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            buildPreview();
        } else {
            restoreOriginals();
        }
        app.redraw();
    }

    function clearPreview() {
        for (var i = 0; i < previews.length; i++) {
            try { previews[i].remove(); } catch (e) {}
        }
        previews = [];
    }

    function restoreOriginals() {
        for (var i = 0; i < originals.length; i++) {
            try { originals[i].hidden = false; } catch (e) {}
        }
    }

    function buildPreview() {
        var s = scalePct / 100;
        var i;
        // 복제는 숨기기 전에 모두 끝낸다
        for (i = 0; i < originals.length; i++) {
            var copy = originals[i].duplicate(originals[i], ElementPlacement.PLACEAFTER);
            // 숨겨 둔 원본을 복제하면 복제본도 숨겨진다
            try { copy.hidden = false; } catch (showError) {}
            previews.push(copy);
        }
        for (i = 0; i < originals.length; i++) {
            try { originals[i].hidden = true; } catch (hideError) {}
        }
        for (i = 0; i < previews.length; i++) {
            scaleKeepingText(previews[i], s);
        }
        movePreview(offsetXmm * MM, offsetYmm * MM);
    }

    function movePreview(dx, dy) {
        for (var i = 0; i < previews.length; i++) {
            try { previews[i].translate(dx, dy); } catch (e) {}
        }
    }

    // 기준점에서 s배가 되도록 item을 옮기고 키운다. 글자는 크기를 되돌린다
    function scaleKeepingText(item, s) {
        if (s === 1) return;
        var p = centerOf(item);
        var tx = refX + s * (p[0] - refX);
        var ty = refY + s * (p[1] - refY);
        if (item.typename !== "TextFrame") {
            var lineScale = scaleLines ? s * 100 : 100;
            try {
                item.resize(s * 100, s * 100, true, true, true, true, lineScale, Transformation.CENTER);
            } catch (resizeError) {}
            var texts = [];
            collectText(item, texts);
            for (var i = 0; i < texts.length; i++) restoreText(texts[i], s);
        }
        var q = centerOf(item);
        item.translate(tx - q[0], ty - q[1]);
    }

    // 키워진 글자 하나를 제 가운데 기준으로 원래 크기로 되돌린다
    function restoreText(text, s) {
        var c = centerOf(text);
        var back = 100 / s;
        try {
            text.resize(back, back, true, true, true, true, scaleLines ? back : 100, Transformation.CENTER);
        } catch (resizeError) {}
        var d = centerOf(text);
        text.translate(c[0] - d[0], c[1] - d[1]);
    }

    function collectText(item, list) {
        if (item.typename === "TextFrame") {
            list.push(item);
        } else if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) collectText(item.pageItems[i], list);
        }
    }

    function centerOf(item) {
        var b = item.geometricBounds;
        return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
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

    function addValueRow(parent, label, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        return {
            input: input, slider: slider, reset: reset,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, getter, setter, initial) {
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
        controls.reset.onClick = function() { commit(initial); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX, initial) {
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
        controls.reset.onClick = function() { commit(initial); };
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
            "v1",
            scalePct,
            scaleLines ? "1" : "0",
            offsetXmm,
            offsetYmm,
            previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 6) return;
        scalePct = restoreNumber(p[1], scalePct, SCALE_RANGE, 1);
        scaleLines = (p[2] === "1");
        offsetXmm = restoreNumber(p[3], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.5);
        offsetYmm = restoreNumber(p[4], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.5);
        previewEnabled = (p[5] === "1");
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
