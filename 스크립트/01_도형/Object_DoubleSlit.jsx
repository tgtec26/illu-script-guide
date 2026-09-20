// Object_DoubleSlit.jsx
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

// 선택한 사각형을 이중 슬릿(영의 실험) 간섭무늬가 맺힌 스크린으로 바꾼다.
//   - 밝은 무늬(보강 간섭)와 어두운 무늬(상쇄 간섭)가 긴 변을 따라 번갈아 놓이고, 밝기는 cos² 곡선을 K 그라데이션으로 그린다.
//   - 무늬 간격 Δx = λL/d (파장 λ, 슬릿–스크린 거리 L, 슬릿 간격 d). 그림에서는 Δx = 사각형 길이 ÷ (무늬 수 ÷ 2)로
//     정해지므로 λ·L·d는 따로 받지 않는다. 광원–슬릿 거리는 무늬 위치와 무관하다.
//   - 슬릿 폭 a는 무늬 위치를 바꾸지 않고 밝기만 바꾼다(단일 슬릿 회절 봉투 sinc²). 슬릿 간격/폭(d/a)을 주면
//     가운데서 멀수록 어두워지고 d/a번째 밝은 무늬는 사라진다. 0이면 모든 무늬가 같은 밝기.
//   - 무늬가 번갈아 놓이므로 밝은·어두운 무늬 수의 차이는 1 이하다. 한쪽을 바꾸면 다른 쪽이 따라 맞춰진다.
//     많은 쪽이 양 끝에 오고, 같으면 왼쪽(아래)이 밝은 무늬로 시작한다.
//   - 확인하면 원본 사각형은 지워지고 스크린 하나가 든 그룹이 남는다. 선(테두리)은 넣지 않는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "DoubleSlit/settings";
    var MM = 2.834645669;
    var LABEL_WIDTH = 110;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var SIZE_RANGE = [1, 500];
    var BRIGHT_RANGE = [1, 21];
    var DARK_RANGE = [0, 22];
    var RATIO_RANGE = [0, 10];
    var GAIN_RANGE = [20, 300];
    var K_RANGE = [0, 100];
    var POSITION_LIMIT_MM = 50;
    // 그라데이션 정지점: 띠(무늬 하나)마다 최대 8개, 전체는 240개 안쪽. 띠가 많으면 띠당 개수를 줄인다
    var MAX_STOPS_PER_BAND = 8;
    var STOP_BUDGET = 240;

    var doc = app.activeDocument;
    var rect = getSelectedRectangle(doc.selection);
    if (rect === null) {
        alert("가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.");
        return;
    }
    var rectWasHidden = rect.hidden;
    var bounds = rect.geometricBounds; // [left, top, right, bottom]
    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;

    // 옵션 (크기는 선택한 사각형에서 오므로 저장하지 않는다)
    var widthMm = Math.round((bounds[2] - bounds[0]) / MM * 10) / 10;
    var heightMm = Math.round((bounds[1] - bounds[3]) / MM * 10) / 10;
    var brightCount = 5;
    var darkCount = 4;
    var slitRatio = 0;
    var gainPercent = 100;
    var lightK = 0;
    var darkK = 100;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    var previewGroup = null;
    var gradient = null;
    var stopCache = []; // 정지점마다 마지막으로 쓴 K. 같은 값을 다시 쓰면 그 그라데이션을 쓰는 개체가 모두 다시 그려진다

    applySettings();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "이중 슬릿 간섭무늬");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var sizePanel = addPanel(dlg, "스크린 크기 (무늬는 긴 변을 따라 놓인다)");
    var widthRow = addValueRow(sizePanel, "너비", "mm", widthMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);
    var heightRow = addValueRow(sizePanel, "높이", "mm", heightMm, SIZE_RANGE[0], SIZE_RANGE[1], 0.5, 1);

    var fringePanel = addPanel(dlg, "무늬 (밝은 무늬 = 보강 간섭, 어두운 무늬 = 상쇄 간섭)");
    var brightRow = addValueRow(fringePanel, "밝은 무늬", "개", brightCount, BRIGHT_RANGE[0], BRIGHT_RANGE[1], 1, 0);
    brightRow.input.helpTip = "밝은 무늬와 어두운 무늬는 번갈아 놓이므로 수의 차이는 1 이하. 한쪽을 바꾸면 다른 쪽이 따라 맞춰진다";
    var darkRow = addValueRow(fringePanel, "어두운 무늬", "개", darkCount, DARK_RANGE[0], DARK_RANGE[1], 1, 0);
    darkRow.input.helpTip = brightRow.input.helpTip;
    var ratioRow = addValueRow(fringePanel, "슬릿 간격/폭", "배", slitRatio, RATIO_RANGE[0], RATIO_RANGE[1], 0.5, 1);
    ratioRow.input.helpTip = "슬릿 간격 d ÷ 슬릿 폭 a. 0이면 슬릿 폭을 무시해 모든 무늬가 같은 밝기. " +
        "값을 주면 단일 슬릿 회절 때문에 가운데서 멀수록 어두워지고 d/a번째 밝은 무늬는 사라진다 (3이면 3번째)";

    var tonePanel = addPanel(dlg, "밝기");
    var gainRow = addValueRow(tonePanel, "전체 밝기", "%", gainPercent, GAIN_RANGE[0], GAIN_RANGE[1], 5, 0);
    gainRow.input.helpTip = "100이면 cos² 그대로. 올리면 밝은 무늬가 넓어지고 어두운 무늬가 가는 선처럼 좁아진다";
    var lightRow = addValueRow(tonePanel, "가장 밝은 곳", "K", lightK, K_RANGE[0], K_RANGE[1], 5, 0);
    var darkKRow = addValueRow(tonePanel, "가장 어두운 곳", "K", darkK, K_RANGE[0], K_RANGE[1], 5, 0);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(heightRow, function() { return heightMm; }, function(v) { heightMm = v; });
    // 두 무늬 수는 서로 1 이내로 묶여 있다. 한쪽을 바꾸면 다른 쪽을 끌어와 맞춘다
    bindValueRow(brightRow, function() { return brightCount; }, function(v) {
        brightCount = v;
        darkCount = clamp(clamp(darkCount, v - 1, v + 1), DARK_RANGE[0], DARK_RANGE[1]);
        setRowValue(darkRow, darkCount);
    });
    bindValueRow(darkRow, function() { return darkCount; }, function(v) {
        darkCount = v;
        brightCount = clamp(clamp(brightCount, v - 1, v + 1), BRIGHT_RANGE[0], BRIGHT_RANGE[1]);
        setRowValue(brightRow, brightCount);
    });
    bindValueRow(ratioRow, function() { return slitRatio; }, function(v) { slitRatio = v; });
    bindValueRow(gainRow, function() { return gainPercent; }, function(v) { gainPercent = v; });
    bindValueRow(lightRow, function() { return lightK; }, function(v) { lightK = v; });
    bindValueRow(darkKRow, function() { return darkK; }, function(v) { darkK = v; });
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) {
            rect.hidden = true;
            buildPreview();
        }
        try { rect.remove(); } catch (removeError) {}
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    rect.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        rect.hidden = rectWasHidden;
        rect.selected = true;
        removeGradient();
    }
    app.redraw();

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            rect.hidden = true;
            buildPreview();
        } else {
            rect.hidden = rectWasHidden;
        }
        app.redraw();
    }

    // 원본 사각형의 가운데를 기준으로 너비·높이를 잡은 스크린 하나를 그룹에 넣는다
    function buildPreview() {
        var width = widthMm * MM;
        var height = heightMm * MM;
        previewGroup = doc.activeLayer.groupItems.add();
        previewGroup.name = "DoubleSlit";
        var screen = previewGroup.pathItems.rectangle(centerY + height / 2, centerX - width / 2, width, height);
        screen.name = "Screen";
        screen.stroked = false;
        applyFringeFill(screen);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

    // -------------------------------------------------------
    // 간섭무늬 그라데이션
    // -------------------------------------------------------
    function applyFringeFill(path) {
        var stops = buildStops(brightCount, darkCount, slitRatio, gainPercent, lightK, darkK);
        var grad = getGradient(stops);
        path.filled = true;
        if (grad === null) {
            path.fillColor = makeGray(lightK);
            return;
        }
        for (var i = 0; i < stops.length; i++) {
            if (stopCache[i] === stops[i].k) continue;
            grad.gradientStops[i].color = makeGray(stops[i].k);
            stopCache[i] = stops[i].k;
        }
        // 긴 변을 따라 무늬가 놓인다. 가로가 길면 왼쪽 → 오른쪽(0°), 세로가 길면 아래 → 위(90°)
        var b = path.geometricBounds;
        var horizontal = widthMm >= heightMm;
        var angle = horizontal ? 0 : 90;
        var gc = new GradientColor();
        gc.gradient = grad;
        gc.origin = horizontal ? [b[0], (b[1] + b[3]) / 2] : [(b[0] + b[2]) / 2, b[3]];
        gc.length = horizontal ? b[2] - b[0] : b[1] - b[3];
        try {
            path.fillColor = gc;
            // 새 그라데이션 칠에는 일러가 마지막에 쓴 각도가 찍힌다. 읽어서 차이만큼만 돌린다
            var stamped = path.fillColor.angle;
            if (Math.abs(angle - stamped) > 0.01) path.rotate(angle - stamped, false, false, true, false, Transformation.CENTER);
        } catch (fillError) {}
    }

    function getGradient(stops) {
        // 정지점 수가 달라지면 새로 만든다. 있는 정지점을 하나씩 옮기면 이웃과 겹쳐 오류가 난다
        if (gradient !== null && gradient.gradientStops.length !== stops.length) removeGradient();
        if (gradient !== null) return gradient;
        try {
            gradient = doc.gradients.add();
            // 그라데이션 이름은 31자 제한
            gradient.name = "DoubleSlit_" + (new Date().getTime());
            gradient.type = GradientType.LINEAR;
            while (gradient.gradientStops.length < stops.length) gradient.gradientStops.add();
            for (var i = 0; i < stops.length; i++) gradient.gradientStops[i].rampPoint = stops[i].pos;
        } catch (gradientError) {
            removeGradient();
            return null;
        }
        stopCache = [];
        return gradient;
    }

    function removeGradient() {
        if (gradient === null) return;
        try { gradient.remove(); } catch (e) {}
        gradient = null;
        stopCache = [];
    }

    // 정지점 [{pos, k}]를 rampPoint 오름차순으로 돌려준다. 띠 하나(무늬 하나)마다 perBand개, 마지막에 하나 더.
    // perBand는 짝수여야 띠 가운데(가장 밝은 곳·가장 어두운 곳)에 정지점이 놓인다
    function buildStops(bright, dark, ratio, gain, lightGray, darkGray) {
        var bands = bright + dark;
        var perBand = Math.floor(STOP_BUDGET / bands);
        perBand = Math.max(2, Math.min(MAX_STOPS_PER_BAND, perBand - perBand % 2));
        var count = bands * perBand;
        var stops = [];
        for (var i = 0; i <= count; i++) {
            var s = bands * i / count;
            var lum = Math.pow(fringeIntensity(s, bands, dark > bright, ratio), 100 / gain);
            stops.push({pos: 100 * i / count, k: Math.round(darkGray - (darkGray - lightGray) * lum)});
        }
        return stops;
    }

    // 띠 단위 위치 s(0 ~ bands)의 밝기 0~1. 띠마다 밝은·어두운 무늬가 번갈아 온다(cos², 한 주기 Δx = 띠 2개).
    // ratio(d/a) > 0이면 스크린 가운데를 중심으로 단일 슬릿 회절 봉투 sinc²를 곱한다: ratio번째 밝은 무늬(x = ratio·Δx)에서 0
    function fringeIntensity(s, bands, darkFirst, ratio) {
        var phase = Math.PI * (s - 0.5) / 2; // 첫 띠 가운데(s = 0.5)에서 0
        var wave = darkFirst ? Math.sin(phase) : Math.cos(phase);
        var intensity = wave * wave;
        if (ratio > 0) {
            var u = Math.PI * (s - bands / 2) / (2 * ratio);
            if (Math.abs(u) > 1e-9) {
                var sinc = Math.sin(u) / u;
                intensity *= sinc * sinc;
            }
        }
        return intensity;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    // 그라데이션 정지점은 CMYK 색만 받으므로 문서 색상 모드와 무관하게 CMYK로 넣는다
    function makeGray(k) {
        var c = new CMYKColor();
        c.cyan = 0;
        c.magenta = 0;
        c.yellow = 0;
        c.black = clamp(k, 0, 100);
        return c;
    }

    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            if (point.leftDirection[0] !== point.anchor[0] ||
                    point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] ||
                    point.rightDirection[1] !== point.anchor[1]) return null;
            pushDistinct(xs, point.anchor[0]);
            pushDistinct(ys, point.anchor[1]);
        }
        if (xs.length !== 2 || ys.length !== 2) return null;
        return item;
    }

    function pushDistinct(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (Math.abs(list[i] - value) < 0.01) return;
        }
        list.push(value);
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
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {
            input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, getter, setter) {
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
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
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
            brightCount,
            darkCount,
            slitRatio,
            gainPercent,
            lightK,
            darkK,
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
        if (p[0] !== "v1" || p.length < 10) return;
        brightCount = restoreNumber(p[1], brightCount, BRIGHT_RANGE, 1);
        darkCount = restoreNumber(p[2], darkCount, DARK_RANGE, 1);
        if (Math.abs(brightCount - darkCount) > 1) darkCount = clamp(brightCount - 1, DARK_RANGE[0], DARK_RANGE[1]);
        slitRatio = restoreNumber(p[3], slitRatio, RATIO_RANGE, 0.5);
        gainPercent = restoreNumber(p[4], gainPercent, GAIN_RANGE, 5);
        lightK = restoreNumber(p[5], lightK, K_RANGE, 5);
        darkK = restoreNumber(p[6], darkK, K_RANGE, 5);
        offsetXmm = restoreNumber(p[7], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[8], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = (p[9] === "1");
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
