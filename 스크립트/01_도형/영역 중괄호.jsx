// 영역 중괄호.jsx
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

// 어떤 영역을 묶어서 가리키는 중괄호 선을 만든다.
// 직선 선택 → 0.5pt로 맞추고 가운데를 잘라 두 선으로 나눈 뒤,
// 바깥 끝에는 갈고리 촉(화살표 7 모양), 가운데(자른) 끝에는 갈고리 촉(화살표 6 모양)을 직접 그려 붙이고 그룹으로 묶는다.
// 가로선은 왼쪽·오른쪽, 세로선은 위쪽·아래쪽을 바깥으로 본다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "RegionBrace/settings";
    var STROKE_WIDTH = 0.5;
    var ARROW_SCALE = 100.0;
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 30;
    var LABEL_WIDTH = 70;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;

    var doc = app.activeDocument;

    var targets = [];
    collectStraightPaths(doc.selection, targets);

    if (targets.length === 0) {
        alert("점 2개짜리 직선을 선택해주세요.");
        return;
    }

    // 원래 표시 상태를 기억해 두고 미리보기 동안만 숨긴다
    var originalHidden = [];
    for (var t = 0; t < targets.length; t++) {
        originalHidden.push(targets[t].hidden);
    }

    // 중괄호 끝의 갈고리 촉: 일러스트레이터 화살표 6(안쪽 끝)·7(바깥 끝)의 아트워크를 선 두께 1pt·100%로 잰 베지어(화살표.ai).
    // 좌표는 (옆, 뒤) pt이고 끝(tip)이 원점, 뒤쪽이 +뒤, 옆은 진행 방향의 왼쪽이 +다. 선은 촉 뿌리(뒤 BRACE_HEAD_BACK)에서 끝난다
    var BRACE_HEAD_BACK = 2.1707;
    var BRACE_HEADS = {
        inner: [{a: [0.4988, 2.1707], l: [0.4988, 2.1707], r: [0.4988, 2.1707]}, {a: [-0.4988, 2.1707], l: [-0.4988, 2.1707], r: [-0.4988, 2.1707]}, {a: [-0.4988, 2.0155], l: [-0.4988, 2.0155], r: [-0.4988, 1.4577]}, {a: [2.8881, 0.0], l: [-0.1797, 0.3105], r: [2.8881, 0.0]}, {a: [2.8881, 0.1668], l: [2.8881, 0.1668], r: [0.9962, 0.4744]}, {a: [0.4988, 2.1679], l: [0.4988, 1.127], r: [0.4988, 2.1679]}],
        outer: [{a: [-0.4934, 2.1707], l: [-0.4934, 2.1707], r: [-0.4934, 2.1707]}, {a: [0.5043, 2.1707], l: [0.5043, 2.1707], r: [0.5043, 2.1707]}, {a: [0.5043, 2.0155], l: [0.5043, 2.0155], r: [0.5043, 1.4577]}, {a: [-2.8826, 0.0], l: [0.1851, 0.3105], r: [-2.8826, 0.0]}, {a: [-2.8826, 0.1668], l: [-2.8826, 0.1668], r: [-0.9908, 0.4744]}, {a: [-0.4934, 2.1679], l: [-0.4934, 1.127], r: [-0.4934, 2.1679]}]
    };
    var HEAD_RANGE = [30, 300];

    // 다이얼로그가 다루는 옵션 값
    // 가로선은 상하로, 세로선은 좌우로 뒤집힌다
    var flipHorizontalLine = false;
    var flipVerticalLine = false;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var headScale = ARROW_SCALE;

    var previewGroups = [];

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "영역 중괄호");
    dlg.alignChildren = "fill";

    dlg.add("statictext", undefined, "대상: " + targets.length + "개");

    var flipPanel = addPanel(dlg, "화살표 반전");
    var flipHorizontalCheck = flipPanel.add("checkbox", undefined, "상하 반전 (가로선)");
    var flipVerticalCheck = flipPanel.add("checkbox", undefined, "좌우 반전 (세로선)");

    var headPanel = addPanel(dlg, "화살촉");
    var headScaleControls = addValueRow(headPanel, "크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {offsetXmm: offsetXmm, offsetYmm: offsetYmm, headScale: headScale};
    applySettings();
    flipHorizontalCheck.value = flipHorizontalLine;
    flipVerticalCheck.value = flipVerticalLine;
    previewCheck.value = previewEnabled;
    setRowValue(offsetXControls, offsetXmm);
    setRowValue(offsetYControls, offsetYmm);
    setRowValue(headScaleControls, headScale);

    flipHorizontalCheck.onClick = function() {
        flipHorizontalLine = flipHorizontalCheck.value;
        updatePreview();
    };
    flipVerticalCheck.onClick = function() {
        flipVerticalLine = flipVerticalCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    bindScaleRow(headScaleControls, function() { return headScale; }, function(v) { headScale = v; }, DEFAULTS.headScale);

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; },
        function(v) { offsetXmm = v; }, true, DEFAULTS.offsetXmm);
    bindPositionRow(offsetYControls, function() { return offsetYmm; },
        function(v) { offsetYmm = v; }, false, DEFAULTS.offsetYmm);

    okButton.onClick = function() {
        if (previewGroups.length === 0) {
            setOriginalsHidden(true);
            buildPreview();
        }
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].remove(); } catch (removeError) {}
        }
        saveSettings();
        doc.selection = null;
        for (var g = 0; g < previewGroups.length; g++) {
            try { previewGroups[g].selected = true; } catch (selectError) {}
        }
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        restoreOriginals();
        app.redraw();
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            setOriginalsHidden(true);
            buildPreview();
        } else {
            restoreOriginals();
        }
        app.redraw();
    }

    function buildPreview() {
        for (var i = 0; i < targets.length; i++) {
            var group = makeBrace(targets[i]);
            if (group === null) continue;
            moveItem(group, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            previewGroups.push(group);
        }
    }

    function clearPreview() {
        for (var i = 0; i < previewGroups.length; i++) {
            try { previewGroups[i].remove(); } catch (e) {}
        }
        previewGroups = [];
    }

    function movePreview(deltaX, deltaY) {
        for (var i = 0; i < previewGroups.length; i++) {
            moveItem(previewGroups[i], deltaX, deltaY);
        }
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function setOriginalsHidden(hidden) {
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].hidden = hidden; } catch (e) {}
        }
    }

    function restoreOriginals() {
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].hidden = originalHidden[i]; } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 한 직선을 두 조각으로 나누고 화살표를 붙인다 (원본은 그대로 둔다)
    // -------------------------------------------------------
    function makeBrace(path) {
        var a, b;
        try {
            a = path.pathPoints[0].anchor;
            b = path.pathPoints[1].anchor;
        } catch (pointError) {
            return null;
        }

        // 가로/세로 판정은 더 긴 축을 따른다 (사선은 가까운 쪽으로 본다)
        var horizontal = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);

        // 바깥 → 안쪽 순서가 되도록 시작점을 왼쪽(가로) 또는 위쪽(세로)으로 맞춘다
        var first = a, second = b;
        if (horizontal ? (a[0] > b[0]) : (a[1] < b[1])) {
            first = b;
            second = a;
        }

        var swap = horizontal ? flipHorizontalLine : flipVerticalLine;
        var outerKind = swap ? "inner" : "outer";
        var innerKind = swap ? "outer" : "inner";

        var mid = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];

        var group = path.parent.groupItems.add();
        group.move(path, ElementPlacement.PLACEBEFORE);

        // 원본을 복제해 색·레이어 같은 나머지 속성을 그대로 물려받는다
        var head = makeSegment(path, group, first, mid);
        var tail = makeSegment(path, group, mid, second);

        // 시작점이 바깥, 끝점이 가운데인 조각 / 그 반대인 조각
        addBraceHeads(group, head, outerKind, innerKind);
        addBraceHeads(group, tail, innerKind, outerKind);

        return group;
    }

    function makeSegment(path, group, startPoint, endPoint) {
        var segment = path.duplicate(group, ElementPlacement.PLACEATEND);
        segment.setEntirePath([[startPoint[0], startPoint[1]], [endPoint[0], endPoint[1]]]);
        segment.closed = false;
        segment.hidden = false;
        segment.stroked = true;
        segment.strokeWidth = STROKE_WIDTH;
        return segment;
    }

    // -------------------------------------------------------
    // 대상 수집
    // -------------------------------------------------------
    function collectStraightPaths(items, out) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            collectStraightPath(items[i], out);
        }
    }

    function collectStraightPath(item, out) {
        if (!item) return;

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectStraightPath(item.pageItems[i], out);
            }
        } else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                collectStraightPath(item.pathItems[j], out);
            }
        } else if (item.typename === "PathItem" && !item.closed && item.pathPoints.length === 2) {
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
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
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

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindPositionRow(controls, getter, setter, isX, initial) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
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

    // 값이 바뀌면 옵션에 쓰고 미리보기를 다시 그린다
    function bindScaleRow(controls, getter, setter, initial) {
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
            "v3",
            flipHorizontalLine ? "1" : "0",
            flipVerticalLine ? "1" : "0",
            offsetXmm,
            offsetYmm,
            previewEnabled ? "1" : "0",
            headScale
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length < 7) return;
        flipHorizontalLine = (p[1] === "1");
        flipVerticalLine = (p[2] === "1");
        offsetXmm = restoreNumber(p[3], offsetXmm);
        offsetYmm = restoreNumber(p[4], offsetYmm);
        previewEnabled = (p[5] === "1");
        var scale = parseNumber(p[6]);
        if (scale !== null) headScale = clamp(roundTo(scale, 10), HEAD_RANGE[0], HEAD_RANGE[1]);
    }

    function restoreNumber(text, fallback) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    }

    // 끝 tip, 방향 단위 벡터 d(바깥쪽), 배율 k로 갈고리 촉의 베지어 점 [{a, l, r}]
    function braceHeadPoints(kind, tip, d, k) {
        var n = [-d[1], d[0]], poly = BRACE_HEADS[kind], out = [];
        function at(p) {
            return [tip[0] - d[0] * p[1] * k + n[0] * p[0] * k, tip[1] - d[1] * p[1] * k + n[1] * p[0] * k];
        }
        for (var i = 0; i < poly.length; i++) out.push({a: at(poly[i].a), l: at(poly[i].l), r: at(poly[i].r)});
        return out;
    }

    // 갈고리 촉 도형 하나를 group에 채워 그린다
    function addBraceHead(group, kind, tip, d, k, color) {
        var pts = braceHeadPoints(kind, tip, d, k), anchors = [], i;
        for (i = 0; i < pts.length; i++) anchors.push(pts[i].a);
        var head = group.pathItems.add();
        head.setEntirePath(anchors);
        for (i = 0; i < pts.length; i++) {
            head.pathPoints[i].leftDirection = pts[i].l;
            head.pathPoints[i].rightDirection = pts[i].r;
        }
        head.closed = true;
        head.stroked = false;
        head.filled = true;
        head.fillColor = color;
        return head;
    }

    // 두 점 직선(segment)의 양 끝에 갈고리 촉을 단다: 선 끝을 촉 뿌리까지 줄이고 같은 그룹에 촉 도형을 더한다
    function addBraceHeads(group, segment, startKind, endKind) {
        var a = segment.pathPoints[0].anchor, b = segment.pathPoints[1].anchor;
        var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        var u = [dx / len, dy / len], k = STROKE_WIDTH * headScale / 100, back = BRACE_HEAD_BACK * k;
        var color = segment.strokeColor;
        if (len > 2 * back) {
            var first = [a[0] + u[0] * back, a[1] + u[1] * back], last = [b[0] - u[0] * back, b[1] - u[1] * back];
            segment.pathPoints[0].anchor = first;
            segment.pathPoints[0].leftDirection = first;
            segment.pathPoints[0].rightDirection = first;
            segment.pathPoints[1].anchor = last;
            segment.pathPoints[1].leftDirection = last;
            segment.pathPoints[1].rightDirection = last;
        }
        addBraceHead(group, startKind, a, [-u[0], -u[1]], k, color).name = "중괄호 촉";
        addBraceHead(group, endKind, b, u, k, color).name = "중괄호 촉";
    }

})();
