// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_HomologousChromosome.jsx
  기능: 선택한 사각형의 높이와 좌우 폭에 맞춰 상동 염색체 한 쌍을 그린다.
    - p암·q암은 완전히 둥근 사각형(스타디움 형태), 중심절은 30% 음영으로 채운 원.
    - 두 암 사이 틈은 항상 중심절 지름과 같다. 지름을 바꾸면 암이 따라 붙어 늘 접해 있다.
    - 유전자 좌는 최대 3개까지 켜고 끌 수 있고, 각각 위 아래 위치를 슬라이더로 정한다.
    - 두 염색체는 같은 모양·같은 유전자 좌를 갖고 사각형 가운데를 기준으로 좌우 대칭 배치된다.
  사용법: 그림이 들어갈 사각형 하나를 선택한 뒤 실행. 사각형은 확인 시 삭제된다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 사각형을 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    if (doc.activeLayer.locked || !doc.activeLayer.visible) {
        alert("현재 레이어가 잠겨 있거나 숨겨져 있습니다.\n편집할 수 있는 레이어를 선택한 뒤 실행해주세요.");
        return;
    }

    var sel = doc.selection;
    if (sel.length !== 1 || sel[0].typename !== "PathItem") {
        alert("그림이 들어갈 사각형 하나를 선택해주세요.\n\n" +
            "사각형의 높이가 염색체 전체 길이를, 좌우 폭이 두께와 간격의 초기값을 정합니다.");
        return;
    }

    var MM_TO_PT = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var CENTROMERE_GRAY = 30;      // 중심절 내부 음영(%)
    var LOCUS_COUNT = 3;
    var POSITION_LIMIT_MM = 100;
    var PREF_KEY = "ObjectHomologousChromosome/settings";
    var PREVIEW_NAME = "Homologous Chromosome Preview";

    var rect = sel[0];
    var bounds = rect.geometricBounds;   // [left, top, right, bottom]
    var rectWasHidden = rect.hidden;
    var rectWidthMm = (bounds[2] - bounds[0]) / MM_TO_PT;

    // 사각형 폭에 대한 기본 비율. 0.33 + 0.28 + 0.33 = 0.94 로 좌우에 약간 여유를 둔다.
    var widthMm = clamp(rectWidthMm * 0.33, 1, 60);
    var spacingMm = clamp(rectWidthMm * 0.28, 0, 120);
    var centromereDiaMm = clamp(widthMm * 0.45, 0.5, 30);
    var centromerePct = 33;
    var locusWidthPt = LINE_WIDTH_PT;
    var lociOn = [true, true, true];
    var lociPct = [17, 60, 85];
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var previewSignature = "";

    applySavedSettings();

    var LABEL_WIDTH = 76;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 240;
    var UNIT_WIDTH = 28;

    var dlg = new Window("dialog", "상동 염색체");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "염색체");
    var widthControls = addValueRow(shapePanel, "좌우 두께", "mm", widthMm, 1, 60, 0.5, 1);
    var centromerePctControls = addValueRow(shapePanel, "중심절 위치", "%", centromerePct, 5, 95, 1, 0);
    var centromereDiaControls = addValueRow(shapePanel, "중심절 지름", "mm", centromereDiaMm, 0.5, 30, 0.1, 1);
    var shapeNote = shapePanel.add("statictext", undefined, "p암·중심절·q암은 항상 접합니다. 지름을 바꾸면 암이 따라 붙습니다.");
    shapeNote.preferredSize.width = 420;

    var layoutPanel = addPanel(dlg, "배치");
    var spacingControls = addValueRow(layoutPanel, "염색체 간격", "mm", spacingMm, 0, 120, 0.5, 1);
    var offsetXControls = addValueRow(layoutPanel, "가로 이동", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(layoutPanel, "세로 이동", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var locusPanel = addPanel(dlg, "유전자 좌");
    var locusWidthControls = addValueRow(locusPanel, "선 두께", "pt", locusWidthPt, 0.1, 5, 0.1, 1);
    var locusControls = [];
    for (var i = 0; i < LOCUS_COUNT; i++) {
        locusControls.push(addValueRow(locusPanel, "좌 " + (i + 1), "%", lociPct[i], 0, 100, 0.5, 1, true));
    }
    var locusNote = locusPanel.add("statictext", undefined, "위치는 염색체 위 끝이 0%, 아래 끝이 100%입니다.");
    locusNote.preferredSize.width = 420;

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(widthControls,
        function() { return widthMm; },
        function(value) { widthMm = value; });
    bindValueRow(centromerePctControls,
        function() { return centromerePct; },
        function(value) { centromerePct = value; });
    bindValueRow(centromereDiaControls,
        function() { return centromereDiaMm; },
        function(value) { centromereDiaMm = value; });
    bindValueRow(locusWidthControls,
        function() { return locusWidthPt; },
        function(value) { locusWidthPt = value; });
    bindValueRow(spacingControls,
        function() { return spacingMm; },
        function(value) { spacingMm = value; });
    bindPositionRow(offsetXControls,
        function() { return offsetXmm; },
        function(value) { offsetXmm = value; });
    bindPositionRow(offsetYControls,
        function() { return offsetYmm; },
        function(value) { offsetYmm = value; });
    for (var c = 0; c < locusControls.length; c++) {
        bindValueRow(locusControls[c], makeLocusGetter(c), makeLocusSetter(c));
        bindLocusCheck(locusControls[c], c);
    }

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        saveSettings();
        dlg.close(1);
    };

    cancelButton.onClick = function() {
        dlg.close(0);
    };

    removeLeftoverPreviews();
    rect.hidden = true;
    rect.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        var finalGroup = tryBuildDiagram(2);
        finalGroup.name = "Homologous Chromosome";
        try { rect.remove(); } catch (removeError) {}
        doc.selection = null;
        try { finalGroup.selected = true; } catch (selectError) {}
    } else {
        rect.hidden = rectWasHidden;
    }
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        if (!previewEnabled) {
            clearPreview();
            app.redraw();
            return;
        }
        var signature = previewSettingsKey();
        if (previewGroup !== null && signature === previewSignature) return;
        clearPreview();
        try {
            previewGroup = buildDiagram();
            previewGroup.name = PREVIEW_NAME;
            previewSignature = signature;
        } catch (e) {
            // 일시적 DOM 오류: 다음 조작에서 다시 그려지므로 경고 없이 넘어간다
            previewGroup = null;
        }
        app.redraw();
    }

    function previewSettingsKey() {
        return [widthMm, centromerePct, centromereDiaMm, spacingMm, locusWidthPt,
            offsetXmm, offsetYmm, lociOn.join(","), lociPct.join(",")].join("|");
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    // 이전 실행이 오류로 중단되며 남긴 미리보기를 정리한다 (이름이 고유해 안전)
    function removeLeftoverPreviews() {
        for (var i = doc.groupItems.length - 1; i >= 0; i--) {
            try {
                if (doc.groupItems[i].name === PREVIEW_NAME) doc.groupItems[i].remove();
            } catch (e) {}
        }
    }

    // 최종 생성도 간헐적인 DOM 오류를 만날 수 있어 redraw로 상태를 정리한 뒤 한 번 더 시도한다
    function tryBuildDiagram(attempts) {
        var lastError = null;
        for (var attempt = 0; attempt < attempts; attempt++) {
            try {
                return buildDiagram();
            } catch (e) {
                lastError = e;
                try { $.sleep(100); app.redraw(); } catch (redrawError) {}
            }
        }
        throw lastError;
    }

    // -------------------------------------------------------
    // 도형 생성
    // -------------------------------------------------------
    function buildDiagram() {
        var group = doc.groupItems.add();
        try {
            drawDiagram(group);
        } catch (e) {
            try { group.remove(); } catch (removeError) {}
            throw e;
        }
        return group;
    }

    function drawDiagram(group) {
        var layout = computeLayout();
        var black = makeColor(100);
        var shade = makeColor(CENTROMERE_GRAY);

        for (var i = 0; i < layout.centers.length; i++) {
            var cx = layout.centers[i];
            drawArm(group, cx, layout.top, layout.pLen, layout.w, black);
            drawArm(group, cx, layout.top - layout.pLen - layout.gap, layout.qLen, layout.w, black);
            drawLoci(group, cx, layout, black);
            drawCentromere(group, cx, layout, black, shade);
        }
    }

    // 완전히 둥근 사각형(반지름 = 짧은 변의 절반)
    function drawArm(group, centerX, armTop, armLen, w, black) {
        if (armLen <= 0.01 || w <= 0.01) return;
        var radius = Math.min(w, armLen) / 2;
        var arm = group.pathItems.roundedRectangle(armTop, centerX - w / 2, w, armLen, radius, radius, false);
        applyOutline(arm, black);
    }

    function drawCentromere(group, centerX, layout, black, shade) {
        if (layout.centromereDia <= 0.01) return;
        var r = layout.centromereDia / 2;
        var cy = layout.top - layout.pLen - layout.gap / 2;
        var circle = group.pathItems.ellipse(cy + r, centerX - r, r * 2, r * 2);
        applyOutline(circle, black);
        circle.filled = true;
        circle.fillColor = shade;
    }

    // 유전자 좌: 그 높이에서의 염색체 폭만큼 가로선을 긋는다. 중심절 틈에 걸리면 그리지 않는다.
    function drawLoci(group, centerX, layout, black) {
        for (var i = 0; i < LOCUS_COUNT; i++) {
            if (!lociOn[i]) continue;
            var y = layout.top - layout.height * lociPct[i] / 100;
            var half = locusHalfWidth(layout, y);
            if (half <= 0.05) continue;
            var line = group.pathItems.add();
            line.setEntirePath([[centerX - half, y], [centerX + half, y]]);
            applyOutline(line, black, locusWidthPt);
        }
    }

    // 위 끝을 기준으로 한 배치. 가로·세로 이동값이 이미 반영된 좌표를 돌려준다.
    // 두 암 사이 틈은 중심절 지름과 같게 잡는다. 그래야 암 끝의 반원이 중심절 원에 접한다.
    function computeLayout() {
        var w = widthMm * MM_TO_PT;
        var dia = centromereDiaMm * MM_TO_PT;
        var spacing = spacingMm * MM_TO_PT;
        var height = bounds[1] - bounds[3];
        var centerX = (bounds[0] + bounds[2]) / 2 + offsetXmm * MM_TO_PT;
        var top = bounds[1] + offsetYmm * MM_TO_PT;
        var gap = Math.min(dia, height);
        var armSpan = height - gap;
        var pLen = armSpan * centromerePct / 100;
        return {
            centers: [centerX - (spacing + w) / 2, centerX + (spacing + w) / 2],
            top: top,
            height: height,
            w: w,
            gap: gap,
            pLen: pLen,
            qLen: armSpan - pLen,
            centromereDia: dia
        };
    }

    // 두 암 중 y가 속한 쪽의 반폭. 어느 쪽에도 속하지 않으면 0.
    function locusHalfWidth(layout, y) {
        var pHalf = armHalfWidth(layout.top, layout.pLen, layout.w, y);
        if (pHalf > 0) return pHalf;
        return armHalfWidth(layout.top - layout.pLen - layout.gap, layout.qLen, layout.w, y);
    }

    // 완전히 둥근 사각형의 y 높이에서의 반폭
    function armHalfWidth(armTop, armLen, w, y) {
        if (armLen <= 0 || w <= 0) return 0;
        var depth = armTop - y;
        if (depth < 0 || depth > armLen) return 0;
        var radius = Math.min(w, armLen) / 2;
        var straightHalf = w / 2 - radius;
        var offset = 0;                          // 둥근 끝의 중심에서 y까지의 세로 거리
        if (depth < radius) offset = radius - depth;
        else if (depth > armLen - radius) offset = radius - (armLen - depth);
        else return w / 2;
        var inner = radius * radius - offset * offset;
        if (inner <= 0) return 0;
        return straightHalf + Math.sqrt(inner);
    }

    function applyOutline(pathItem, color, width) {
        pathItem.filled = false;
        pathItem.stroked = true;
        pathItem.strokeColor = color;
        pathItem.strokeWidth = (width === undefined) ? LINE_WIDTH_PT : width;
        pathItem.strokeCap = StrokeCap.BUTTENDCAP;
        pathItem.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        pathItem.strokeDashes = [];
    }

    // GrayColor를 쓰면 개체 색 공간이 그레이스케일이 되어 나중에 색을 바꾸기 어렵다.
    function makeColor(k) {
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
    // 다이얼로그 도우미
    // -------------------------------------------------------
    function makeLocusGetter(index) {
        return function() { return lociPct[index]; };
    }

    function makeLocusSetter(index) {
        return function(value) { lociPct[index] = value; };
    }

    function bindLocusCheck(controls, index) {
        controls.check.value = lociOn[index];
        setLocusEnabled(controls, lociOn[index]);
        controls.check.onClick = function() {
            lociOn[index] = controls.check.value;
            setLocusEnabled(controls, lociOn[index]);
            updatePreview();
        };
    }

    function setLocusEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
        controls.down.enabled = enabled;
        controls.up.enabled = enabled;
    }

    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨(또는 체크박스) · 입력칸 · 단위 · ◀ · 슬라이더 · ▶ 를 한 줄에 배치
    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals, useCheck) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var check = null;
        if (useCheck) {
            check = row.add("checkbox", undefined, label);
            check.preferredSize.width = LABEL_WIDTH;
        } else {
            var labelText = row.add("statictext", undefined, label);
            labelText.preferredSize.width = LABEL_WIDTH;
        }
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "right";
        var unitText = row.add("statictext", undefined, unit);
        unitText.preferredSize.width = UNIT_WIDTH;
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;
        return {
            row: row, check: check, input: input, slider: slider, down: down, up: up,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
        controls.down.onClick = function() { commit(getter() - controls.step); };
        controls.up.onClick = function() { commit(getter() + controls.step); };
    }

    // 위치 변경은 도형을 다시 만들지 않고 현재 미리보기 그룹만 이동한다.
    function bindPositionRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var previousX = offsetXmm;
            var previousY = offsetYmm;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (!movePreviewGroup(previewGroup, previousX, previousY, offsetXmm, offsetYmm)) {
                updatePreview();
                return;
            }
            previewSignature = previewSettingsKey();
            if (previewGroup !== null) app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
        controls.down.onClick = function() { commit(getter() - controls.step); };
        controls.up.onClick = function() { commit(getter() + controls.step); };
    }

    function movePreviewGroup(group, previousXmm, previousYmm, nextXmm, nextYmm) {
        if (group === null) return true;
        var deltaX = (nextXmm - previousXmm) * MM_TO_PT;
        var deltaY = (nextYmm - previousYmm) * MM_TO_PT;
        if (deltaX === 0 && deltaY === 0) return true;
        try {
            group.translate(deltaX, deltaY);
            return true;
        } catch (e) {
            return false;
        }
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(/[^0-9.\-]/g, ""));
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
    // 옵션 저장
    // -------------------------------------------------------
    // 크기는 사각형 폭에 대한 비율로 저장한다. 다음번에 다른 크기의 사각형을 써도 영역 안에 들어온다.
    function saveSettings() {
        var parts = ["v2",
            widthMm / rectWidthMm,
            spacingMm / rectWidthMm,
            centromereDiaMm / rectWidthMm,
            centromerePct,
            locusWidthPt];
        for (var i = 0; i < LOCUS_COUNT; i++) {
            parts.push(lociOn[i] ? 1 : 0);
            parts.push(lociPct[i]);
        }
        parts.push(offsetXmm, offsetYmm);
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 14) return;
        widthMm = restoreRatio(p[1], widthMm, 1, 60);
        spacingMm = restoreRatio(p[2], spacingMm, 0, 120);
        centromereDiaMm = restoreRatio(p[3], centromereDiaMm, 0.5, 30);
        centromerePct = restoreNumber(p[4], centromerePct, 5, 95);
        locusWidthPt = restoreNumber(p[5], locusWidthPt, 0.1, 5);
        for (var i = 0; i < LOCUS_COUNT; i++) {
            lociOn[i] = p[6 + i * 2] === "1";
            lociPct[i] = restoreNumber(p[7 + i * 2], lociPct[i], 0, 100);
        }
        offsetXmm = restoreNumber(p[12], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[13], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    }

    function restoreRatio(text, fallback, minimum, maximum) {
        var ratio = parseFloat(text);
        if (isNaN(ratio) || ratio < 0 || ratio > 10) return fallback;
        return clamp(ratio * rectWidthMm, minimum, maximum);
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
