(function() {
    if (app.documents.length === 0) { alert("문서를 열고 열린 패스를 선택해주세요."); return; }
    var doc = app.activeDocument;
    var source = getSelectedOpenPath(doc.selection);
    if (source === null) { alert("잠기지 않은 열린 패스 하나만 선택해주세요."); return; }
    var MM_TO_PT = 2.83464567;
    var shapeSizeMm = 2;
    var gapMm = 2;
    var strokeWidthPt = 0.5;
    var frontType = "warm";
    var reversed = false;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    var dlg = new Window("dialog", "오브젝트 전선");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var frontPanel = dlg.add("panel", undefined, "전선 종류");
    frontPanel.orientation = "column";
    frontPanel.alignChildren = "left";
    var warmRadio = frontPanel.add("radiobutton", undefined, "온난전선");
    var coldRadio = frontPanel.add("radiobutton", undefined, "한랭전선");
    var stationaryRadio = frontPanel.add("radiobutton", undefined, "정체전선");
    var occludedRadio = frontPanel.add("radiobutton", undefined, "폐색전선");
    warmRadio.value = true;

    var layoutPanel = dlg.add("panel", undefined, "도형 배치");
    layoutPanel.orientation = "column";
    layoutPanel.alignChildren = "fill";
    var shapeSizeControl = addNumericControl(layoutPanel, "도형 크기", shapeSizeMm, 0.5, 20, 0.1, "mm");
    var gapControl = addNumericControl(layoutPanel, "빈 간격", gapMm, 0, 20, 0.1, "mm");
    var reversedCheck = layoutPanel.add("checkbox", undefined, "방향 반전");

    var colorPanel = dlg.add("panel", undefined, "컬러");
    colorPanel.orientation = "column";
    colorPanel.alignChildren = "left";
    colorPanel.add("statictext", undefined, "표준색");

    var linePanel = dlg.add("panel", undefined, "라인");
    linePanel.orientation = "column";
    linePanel.alignChildren = "fill";
    var strokeWidthControl = addNumericControl(linePanel, "라인 두께", strokeWidthPt, 0.1, 10, 0.1, "pt");

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var buttons = dlg.add("group");
    buttons.alignment = "right";
    buttons.add("button", undefined, "확인", {name: "ok"});
    buttons.add("button", undefined, "취소", {name: "cancel"});

    warmRadio.onClick = function() { frontType = "warm"; updatePreview(); };
    coldRadio.onClick = function() { frontType = "cold"; updatePreview(); };
    stationaryRadio.onClick = function() { frontType = "stationary"; updatePreview(); };
    occludedRadio.onClick = function() { frontType = "occluded"; updatePreview(); };
    reversedCheck.onClick = function() { reversed = reversedCheck.value; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };

    bindNumericControl(shapeSizeControl, function(value) {
        shapeSizeMm = value;
        updatePreview();
    });
    bindNumericControl(gapControl, function(value) {
        gapMm = value;
        updatePreview();
    });
    bindNumericControl(strokeWidthControl, function(value) {
        strokeWidthPt = value;
        updatePreview();
    });

    source.hidden = true;
    source.selected = false;
    try {
        updatePreview();
    } catch(e) {
        clearPreview();
        source.hidden = sourceWasHidden;
        source.selected = true;
        alert("미리보기를 만드는 중 오류가 발생했습니다.");
        app.redraw();
        return;
    }
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        try {
            source.hidden = false;
            var finalGroup = createWeatherFront(false);
            finalGroup.name = "Weather Front";
            try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
            source.remove();
            doc.selection = null;
            finalGroup.selected = true;
        } catch(e2) {
            try { if (typeof finalGroup !== "undefined" && finalGroup !== null) finalGroup.remove(); } catch(e3) {}
            source.hidden = sourceWasHidden;
            source.selected = true;
            alert("전선을 만드는 중 오류가 발생했습니다.");
        }
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createWeatherFront(true);
        previewGroup.name = "Weather Front Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function createWeatherFront(isPreview) {
        var group = source.layer.groupItems.add();
        try {
            var baseline = source.duplicate(group, ElementPlacement.PLACEATEND);
            baseline.hidden = false;
            baseline.selected = false;
            return group;
        } catch(e) {
            try { group.remove(); } catch(e2) {}
            throw e;
        }
    }

    function addNumericControl(parent, label, value, minimum, maximum, step, unit) {
        var row = parent.add("group");
        row.add("statictext", undefined, label);
        var input = row.add("edittext", undefined, formatNumber(value));
        input.characters = 6;
        row.add("statictext", undefined, unit);
        var slider = parent.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = 260;
        slider.stepdelta = step;
        return {
            input: input,
            slider: slider,
            step: step,
            minimum: minimum,
            maximum: maximum,
            value: value
        };
    }

    function bindNumericControl(control, onValueChanged) {
        function setValue(value, updateInput) {
            var normalized = clamp(roundTo(value, control.step), control.minimum, control.maximum);
            control.value = normalized;
            control.slider.value = normalized;
            if (updateInput) control.input.text = formatNumber(normalized);
            onValueChanged(normalized);
        }

        control.slider.onChanging = function() {
            setValue(control.slider.value, true);
        };
        control.input.onChanging = function() {
            var value = parseNumber(control.input.text);
            if (value !== null && value >= control.minimum && value <= control.maximum) {
                setValue(value, false);
            }
        };
        control.input.onChange = function() {
            var value = parseNumber(control.input.text);
            if (value === null) value = control.value;
            setValue(value, true);
        };
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function roundTo(value, step) {
        return Math.round(value / step) * step;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function formatNumber(value) {
        return String(Math.round(value * 100) / 100);
    }

    function getSelectedOpenPath(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.closed || item.guides || item.clipping || item.locked || item.editable === false) return null;
        return item;
    }
})();
