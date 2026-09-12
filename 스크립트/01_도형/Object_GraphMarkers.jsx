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
  Object_GraphMarkers.jsx
  기능: 선택한 꺾은선 그래프의 모든 고정점(양 끝 포함)에 마커를 넣습니다.
    - 모양: 원 · 사각형 · 삼각형(위쪽 꼭짓점) 중 라디오버튼으로 선택
    - 크기 0.5~2mm(0.1 단위), 채움 K 0~100(10 단위)
    - 테두리 0pt(없음) 또는 0.3~1pt(0.1 단위), 선은 100K
    - 미리보기로 조절하고 확인을 누르면 마커 그룹(GraphMarkers)이 그래프와 한 그룹(Graph)으로 묶입니다
  사용법: 꺾은선(패스 또는 패스가 든 그룹)을 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 꺾은선 그래프를 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectGraphMarkers/settings";
    var PREVIEW_NAME = "GraphMarkers_Preview";
    var PREVIEW_INTERVAL_MS = 80;
    var STEP_BUTTON_WIDTH = 34;
    var mmToPt = 72 / 25.4;
    var SHAPES = ["원", "사각형", "삼각형"];
    var SIZE_VALUES = rangeValues(0.5, 2, 0.1);      // mm
    var FILL_VALUES = rangeValues(0, 100, 10);       // K
    var STROKE_VALUES = [0].concat(rangeValues(0.3, 1, 0.1)); // pt, 0이면 선 없음

    var doc = app.activeDocument;
    var paths = [];
    var selected = [];
    for (var i0 = 0; i0 < doc.selection.length; i0++) selected.push(doc.selection[i0]);
    collectPaths(selected, paths);
    if (paths.length === 0) {
        alert("꺾은선 그래프(패스)를 선택해주세요.");
        return;
    }

    var options = readSettings();
    var previewGroup = null;
    var committed = false;
    var previewPending = false;
    var lastPreviewTime = 0;

    var win = new Window("dialog", "그래프 마커");
    win.alignChildren = "fill";
    win.spacing = 4;

    var shapePanel = win.add("panel", undefined, "모양");
    shapePanel.alignChildren = "left";
    var shapeRow = shapePanel.add("group");
    for (var s = 0; s < SHAPES.length; s++) {
        var radio = shapeRow.add("radiobutton", undefined, SHAPES[s]);
        radio.value = (options.shape === s);
        radio.onClick = makeShapeHandler(s);
    }

    var markerPanel = win.add("panel", undefined, "마커");
    markerPanel.alignChildren = "fill";
    markerPanel.spacing = 2;
    addRow(markerPanel, "크기", "size", SIZE_VALUES, "mm");
    addRow(markerPanel, "채움 (K)", "fillK", FILL_VALUES, "%").helpTip = "10 단위";
    addRow(markerPanel, "선 두께", "stroke", STROKE_VALUES, "pt").helpTip = "0이면 선 없음, 선은 100K";

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
    status.preferredSize.width = 360;

    ok.onClick = function() {
        options.preview = true;
        if (previewGroup === null || previewPending) {
            if (!buildPreview()) return;
        }
        committed = true;
        previewGroup.name = "GraphMarkers";
        saveSettings();
        var result = groupWithGraph();
        doc.selection = null;
        result.selected = true;
        win.close(1);
    };

    // 선택했던 그래프와 마커 그룹을 한 그룹으로 묶는다. 쌓임 순서는 유지하고 마커가 맨 위
    function groupWithGraph() {
        try {
            var wrapper = selected[0].parent.groupItems.add();
            wrapper.name = "Graph";
            wrapper.move(selected[0], ElementPlacement.PLACEBEFORE);
            for (var i = selected.length - 1; i >= 0; i--) {
                selected[i].move(wrapper, ElementPlacement.PLACEATBEGINNING);
            }
            previewGroup.move(wrapper, ElementPlacement.PLACEATBEGINNING);
            return wrapper;
        } catch (e) {
            status.text = "그룹으로 묶지 못했습니다: " + e;
            return previewGroup;
        }
    }

    win.onShow = function() { updatePreview(); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    try { win.show(); }
    finally {
        if (!committed) clearPreview();
        app.redraw();
    }

    function makeShapeHandler(index) {
        return function() {
            options.shape = index;
            updatePreview();
        };
    }

    // 숫자 조절 행: 라벨 | ◀ | 슬라이더 | ▶ | 입력창 | 단위. 슬라이더는 values의 인덱스를 움직인다
    function addRow(panel, label, key, values, unit) {
        var row = panel.add("group");
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = 60;
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, nearestIndex(values, options[key]), 0, values.length - 1);
        slider.preferredSize.width = 120;
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 5;
        row.add("statictext", undefined, unit);
        function apply(index, dragging) {
            index = Math.max(0, Math.min(values.length - 1, Math.round(index)));
            var value = values[index];
            slider.value = index;
            input.text = String(value);
            if (value === options[key]) {
                if (!dragging && previewPending) updatePreview();
                return;
            }
            options[key] = value;
            updatePreview(dragging);
        }
        minus.onClick = function() { apply(nearestIndex(values, options[key]) - 1); };
        plus.onClick = function() { apply(nearestIndex(values, options[key]) + 1); };
        slider.onChanging = function() { apply(slider.value, true); };
        slider.onChange = function() { apply(slider.value); };
        input.onChange = function() {
            var number = Number(input.text);
            if (!/\S/.test(input.text) || !isFinite(number)) { input.text = String(options[key]); return; }
            apply(nearestIndex(values, number));
        };
        return caption;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview(dragging) {
        previewPending = true;
        if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return;
        try {
            if (!options.preview) clearPreview();
            else if (!buildPreview()) return;
            previewPending = false;
            app.redraw();
            lastPreviewTime = new Date().getTime();
            status.text = " ";
        } catch (e) {
            clearPreview();
            status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
        }
    }

    // 마커 수가 적어 매번 새로 그린다. 그룹은 맨 위 선 바로 위에 둔다
    function buildPreview() {
        try {
            clearPreview();
            previewGroup = paths[0].parent.groupItems.add();
            previewGroup.name = PREVIEW_NAME;
            previewGroup.move(paths[0], ElementPlacement.PLACEBEFORE);
            var size = options.size * mmToPt;
            var fill = makeGray(options.fillK);
            var black = makeGray(100);
            for (var i = 0; i < paths.length; i++) {
                var points = paths[i].pathPoints;
                for (var j = 0; j < points.length; j++) {
                    var marker = makeMarker(previewGroup, points[j].anchor, size);
                    marker.closed = true;
                    marker.filled = true;
                    marker.fillColor = fill;
                    marker.stroked = options.stroke > 0;
                    if (marker.stroked) {
                        marker.strokeColor = black;
                        marker.strokeWidth = options.stroke;
                    }
                }
            }
            return true;
        } catch (e) {
            clearPreview();
            status.text = "미리보기 오류: " + e + " (" + e.line + "행)";
            return false;
        }
    }

    function makeMarker(container, anchor, size) {
        var x = anchor[0], y = anchor[1];
        if (options.shape === 0) return container.pathItems.ellipse(y + size / 2, x - size / 2, size, size);
        if (options.shape === 1) return container.pathItems.rectangle(y + size / 2, x - size / 2, size, size);
        var path = container.pathItems.add();
        path.setEntirePath(trianglePoints(x, y, size));
        return path;
    }

    // 한 변이 size인 정삼각형. 외접 사각형의 중심이 (x, y)에 오고 꼭짓점은 위를 향한다
    function trianglePoints(x, y, size) {
        var height = size * Math.sqrt(3) / 2;
        return [[x, y + height / 2], [x + size / 2, y - height / 2], [x - size / 2, y - height / 2]];
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {
                try { app.redraw(); previewGroup.remove(); } catch (e2) {}
            }
            previewGroup = null;
        }
        // 참조가 죽어 못 지운 미리보기 그룹을 이름으로 찾아 지운다
        try {
            var groups = paths[0].parent.groupItems;
            for (var i = groups.length - 1; i >= 0; i--) {
                if (groups[i].name === PREVIEW_NAME) {
                    try { groups[i].remove(); } catch (e3) {}
                }
            }
        } catch (e4) {}
    }

    // -------------------------------------------------------
    // 도우미
    // -------------------------------------------------------
    function collectPaths(items, out) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.typename === "PathItem") {
                if (!item.guides && !item.clipping && item.pathPoints.length > 0) out.push(item);
            } else if (item.typename === "GroupItem" || item.typename === "CompoundPathItem") {
                collectPaths(item.pageItems || item.pathItems, out);
            }
        }
    }

    function rangeValues(min, max, step) {
        var values = [];
        for (var v = min; v <= max + step / 2; v += step) values.push(Math.round(v * 100) / 100);
        return values;
    }

    function nearestIndex(values, value) {
        var best = 0;
        for (var i = 1; i < values.length; i++) {
            if (Math.abs(values[i] - value) < Math.abs(values[best] - value)) best = i;
        }
        return best;
    }

    function makeGray(k) {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = k;
        } else {
            color = new RGBColor();
            var level = Math.round(255 * (1 - k / 100));
            color.red = level; color.green = level; color.blue = level;
        }
        return color;
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function readSettings() {
        var result = { shape: 0, size: 1, fillK: 100, stroke: 0, preview: true };
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v1" || p.length !== 6) return result;
            var shape = Number(p[1]), size = Number(p[2]), fillK = Number(p[3]), stroke = Number(p[4]);
            if (shape >= 0 && shape < SHAPES.length && shape === Math.round(shape)) result.shape = shape;
            if (hasValue(SIZE_VALUES, size)) result.size = size;
            if (hasValue(FILL_VALUES, fillK)) result.fillK = fillK;
            if (hasValue(STROKE_VALUES, stroke)) result.stroke = stroke;
            result.preview = (p[5] !== "0");
        } catch (e) {}
        return result;
    }

    function hasValue(values, value) {
        return isFinite(value) && values[nearestIndex(values, value)] === value;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY,
                ["v1", options.shape, options.size, options.fillK, options.stroke, options.preview ? 1 : 0].join("|"));
        } catch (e) {}
    }
})();
