// Color_SpectrumGray.jsx
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 가로로 긴 사각형에 연속 스펙트럼(380~780nm)을 회색 음영 그라데이션으로 채운다.
// 파장별 밝기 키포인트를 부드럽게 이어 K 농도만 쓴다. 정확한 색채계가 아니라 보기에 그럴듯한 수준이다.
// 기본은 왼쪽 380nm(단파장) → 오른쪽 780nm(장파장). 반전 옵션으로 장파장을 왼쪽에 둘 수 있다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "SpectrumGray/settings";
    var WAVE_MIN = 380;
    var WAVE_MAX = 780;
    var WAVE_STEP = 10;
    var BRIGHT_MIN = 20;
    var BRIGHT_MAX = 300;
    var LABEL_WIDTH = 70;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 105;
    var STEP_BUTTON_WIDTH = 34;
    // 파장별 밝기 키포인트. 미리보기가 다이얼로그를 열자마자 돌기 때문에 여기(호출보다 위)에 둬야 한다.
    // 양 끝은 거의 검정(완전 검정은 아님), 570nm(노랑) 하나만 흰색, 파랑·청록 쪽에 작은 밝은 언덕, 빨강은 천천히 어두워진다.
    var GRAY_KEYS = [
        [380, 0.08], [410, 0.14], [440, 0.24], [475, 0.55], [500, 0.72], [530, 0.76],
        [570, 1.00], [600, 0.70], [640, 0.40], [690, 0.18], [740, 0.10], [780, 0.06]
    ];

    var doc = app.activeDocument;

    var targets = [];
    collectClosedPaths(doc.selection, targets);
    if (targets.length === 0) {
        alert("가로로 긴 사각형을 선택해주세요.");
        return;
    }

    // 원래 면 색을 기억해 두고 미리보기 동안만 바꾼다
    var originalFills = [];
    for (var t = 0; t < targets.length; t++) {
        originalFills.push({ filled: targets[t].filled, color: targets[t].fillColor });
    }

    // 다이얼로그가 다루는 옵션 값
    var brightness = 100;
    var flipDirection = false;
    var previewEnabled = true;

    var gradient = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "연속 스펙트럼 (회색)");
    dlg.alignChildren = "fill";

    dlg.add("statictext", undefined, "대상: " + targets.length + "개");

    var optionPanel = addPanel(dlg, "옵션");
    var brightControls = addValueRow(optionPanel, "전체 밝기", "%", brightness,
        BRIGHT_MIN, BRIGHT_MAX, 5, 0);
    var flipCheck = optionPanel.add("checkbox", undefined, "좌우 반전 (왼쪽 장파장 780 → 오른쪽 단파장 380)");

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    applySettings();
    setRowValue(brightControls, brightness);
    flipCheck.value = flipDirection;
    previewCheck.value = previewEnabled;

    bindValueRow(brightControls, function() { return brightness; },
        function(v) { brightness = v; });
    flipCheck.onClick = function() {
        flipDirection = flipCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    okButton.onClick = function() {
        if (!previewEnabled) {
            previewEnabled = true;
            updatePreview();
        }
        saveSettings();
        dlg.close(1);
    };

    updatePreview();

    if (dlg.show() !== 1) {
        restoreOriginals();
        removeGradient();
        app.redraw();
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        if (previewEnabled) {
            applySpectrum();
        } else {
            restoreOriginals();
        }
        app.redraw();
    }

    function applySpectrum() {
        var stops = buildStops(brightness, flipDirection);
        var grad = getGradient(stops.length);
        if (!grad) return;
        for (var i = 0; i < stops.length; i++) {
            grad.gradientStops[i].rampPoint = stops[i].pos;
            grad.gradientStops[i].color = makeGray(stops[i].k);
        }
        // 기본 GradientColor는 각도 0(왼쪽 → 오른쪽)으로 도형 전체에 걸친다
        for (var j = 0; j < targets.length; j++) {
            try {
                var gc = new GradientColor();
                gc.gradient = grad;
                targets[j].filled = true;
                targets[j].fillColor = gc;
            } catch (fillError) {}
        }
    }

    function getGradient(stopCount) {
        if (gradient === null) {
            try {
                gradient = doc.gradients.add();
                gradient.name = "SpectrumGray_" + (new Date().getTime());
                gradient.type = GradientType.LINEAR;
            } catch (gradientError) {
                gradient = null;
                return null;
            }
        }
        while (gradient.gradientStops.length < stopCount) gradient.gradientStops.add();
        return gradient;
    }

    function removeGradient() {
        if (gradient === null) return;
        try { gradient.remove(); } catch (e) {}
        gradient = null;
    }

    function restoreOriginals() {
        for (var i = 0; i < targets.length; i++) {
            try {
                targets[i].filled = originalFills[i].filled;
                if (originalFills[i].filled) targets[i].fillColor = originalFills[i].color;
            } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 파장 → 회색 정지점
    // -------------------------------------------------------
    // rampPoint 오름차순으로 돌려준다. 반전이면 왼쪽(0%)이 780nm이 된다.
    function buildStops(brightPercent, flipped) {
        var stops = [];
        var span = WAVE_MAX - WAVE_MIN;
        for (var wave = WAVE_MIN; wave <= WAVE_MAX; wave += WAVE_STEP) {
            var pos = (wave - WAVE_MIN) / span * 100;
            if (flipped) pos = 100 - pos;
            // 곱하면 밝은 쪽이 흰색으로 잘려 대비만 세진다. 감마로 올리면 어두운 쪽이 따라 올라온다.
            var lum = Math.pow(wavelengthToGray(wave), 100 / brightPercent);
            stops.push({ pos: pos, k: Math.round((1 - lum) * 100) });
        }
        if (flipped) stops.reverse();
        return stops;
    }

    // 파장(nm) → 0~1 휘도 (키포인트 사이는 코사인 보간)
    function wavelengthToGray(wave) {
        if (wave <= GRAY_KEYS[0][0]) return GRAY_KEYS[0][1];
        for (var i = 1; i < GRAY_KEYS.length; i++) {
            if (wave > GRAY_KEYS[i][0]) continue;
            var a = GRAY_KEYS[i - 1], b = GRAY_KEYS[i];
            var t = (wave - a[0]) / (b[0] - a[0]);
            var smooth = (1 - Math.cos(t * Math.PI)) / 2;
            return a[1] + (b[1] - a[1]) * smooth;
        }
        return GRAY_KEYS[GRAY_KEYS.length - 1][1];
    }

    function makeGray(k) {
        var c = new CMYKColor();
        c.cyan = 0; c.magenta = 0; c.yellow = 0;
        c.black = clamp(k, 0, 100);
        return c;
    }

    // -------------------------------------------------------
    // 대상 수집
    // -------------------------------------------------------
    function collectClosedPaths(items, out) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            collectClosedPath(items[i], out);
        }
    }

    function collectClosedPath(item, out) {
        if (!item) return;
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectClosedPath(item.pageItems[i], out);
            }
        } else if (item.typename === "PathItem" && item.closed) {
            out.push(item);
        }
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

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        row.add("statictext", undefined, unit);
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;
        return {
            input: input, slider: slider, down: down, up: up,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var changed = (value !== getter());
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (changed) updatePreview();
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
            brightness,
            flipDirection ? "1" : "0",
            previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 4) return;
        var value = parseNumber(p[1]);
        if (value !== null) brightness = clamp(roundTo(value, 5), BRIGHT_MIN, BRIGHT_MAX);
        flipDirection = (p[2] === "1");
        previewEnabled = (p[3] === "1");
    }
})();
