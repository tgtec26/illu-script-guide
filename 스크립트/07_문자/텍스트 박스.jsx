// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
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

    var PREF_KEY = "TextBox/settings";

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("텍스트를 선택하고 실행해주세요.");
        return;
    }

    var mmToPt = 72 / 25.4;
    var STROKE_PT = 0.3;
    if (sel.typename === "TextRange") {
        alert("문자 편집을 마치고 선택 도구로 텍스트 개체를 선택해주세요.");
        return;
    }
    var targets = copySelection(sel);
    for (var t = 0; t < targets.length; t++) {
        if (targets[t].typename !== "TextFrame" || targets[t].locked || targets[t].hidden) {
            alert("잠기거나 숨겨지지 않은 텍스트 개체만 선택해주세요.");
            return;
        }
    }
    var entries = [];
    var previews = [];
    var committed = false;
    var previewPending = false;
    var lastPreviewTime = 0;
    var PREVIEW_INTERVAL_MS = 40;
    var DEFAULTS = defaultOptions();
    var options = readSettings();
    var lineColor = makeBlackColor(doc);
    for (var i = 0; i < targets.length; i++) {
        var bounds = getTargetBounds(targets[i]);
        if (!bounds) {
            alert("비어 있거나 글자 윤곽을 측정할 수 없는 텍스트가 있습니다. 선택을 확인해주세요.");
            return;
        }
        entries.push({ item: targets[i], bounds: bounds, hidden: targets[i].hidden });
    }
    if (!entries.length) {
        alert("선택한 항목 중 보이는 글자 윤곽을 측정할 수 있는 텍스트가 없습니다.");
        return;
    }

    var win = new Window("dialog", "텍스트 박스");
    win.alignChildren = "fill";
    var boxPanel = win.add("panel", undefined, "사각형 · 텍스트 주변 여백");
    boxPanel.alignChildren = "fill";
    addRow(boxPanel, "좌우 여백", "paddingX", 0, 50, "mm", false);
    addRow(boxPanel, "상하 여백", "paddingY", 0, 50, "mm", false);
    addRow(boxPanel, "코너 둥글기", "radius", 0, 50, "mm", false);
    var positionPanel = win.add("panel", undefined, "위치");
    positionPanel.alignChildren = "fill";
    addRow(positionPanel, "가로", "offsetX", -100, 100, "mm", true);
    addRow(positionPanel, "세로", "offsetY", -100, 100, "mm", true);
    positionPanel.add("statictext", undefined, "양수: 오른쪽 / 위쪽 · 텍스트와 박스을 함께 이동");
    var footer = win.add("group");
    footer.alignment = "right";
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = options.preview;
    previewCheck.onClick = function() { options.preview = previewCheck.value; updatePreview(); };
    var ok = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    var status = win.add("statictext", undefined, " ");
    status.preferredSize.width = 290;
    ok.onClick = function() {
        // 드래그 중 생략한 마지막 값을 확인 전에 반드시 반영한다.
        if (previewPending && !updatePreview()) return;
        if (!previews.length && !buildPreview()) return;
        try {
            // 원본 텍스트를 그대로 보존하고 미리보기 복제본만 교체한다.
            for (var j = 0; j < previews.length; j++) {
                var record = previews[j];
                record.entry.item.hidden = record.entry.hidden;
                record.entry.item.move(record.group, ElementPlacement.PLACEATBEGINNING);
                record.moved = true;
                record.entry.item.translate(options.offsetX * mmToPt, options.offsetY * mmToPt);
                record.shifted = true;
            }
            for (var k = 0; k < previews.length; k++) previews[k].copy.remove();
            committed = true;
            saveSettings();
            doc.selection = null;
            for (var n = 0; n < previews.length; n++) previews[n].group.selected = true;
            win.close(1);
        } catch (e) {
            clearPreview();
            status.text = "결과를 만들지 못했습니다: " + e;
        }
    };
    win.defaultElement = null;
    win.onShow = updatePreview;
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    try { win.show(); }
    finally {
        if (!committed) clearPreview();
        app.redraw();
    }

    function addRow(panel, label, key, min, max, unit, positionOnly) {
        var row = panel.add("group");
        var caption = row.add("statictext", undefined, label);
        caption.helpTip = label + " (" + unit + ")";
        var step = unit === "mm" ? 0.1 : 1;
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = positionOnly ? 7 : 4;
        input.preferredSize.width = positionOnly ? 65 : 46;
        input.helpTip = caption.helpTip;
        var slider = row.add("scrollbar", undefined, options[key], min, max);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = 118;
        slider.helpTip = caption.helpTip;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = 34;
        reset.helpTip = "처음 값으로 되돌리기";
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
                try {
                    var delta = (value - previous) * mmToPt;
                    for (var p = 0; p < previews.length; p++) {
                        previews[p].group.translate(key === "offsetX" ? delta : 0, key === "offsetY" ? delta : 0);
                    }
                    app.redraw();
                } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
            } else updatePreview(dragging);
        }
        slider.onChanging = function() { apply(slider.value, true); };
        slider.onChange = function() { apply(slider.value); };
        reset.onClick = function() { apply(DEFAULTS[key]); };
        input.onChange = function() {
            if (!/\S/.test(input.text)) { input.text = String(options[key]); return; }
            apply(Number(input.text));
        };
    }

    function updatePreview(dragging) {
        previewPending = true;
        if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
        status.text = " ";
        try {
            if (!options.preview) {
                if (previews.length) clearPreview();
            } else if (!previews.length) {
                if (!buildPreview()) return false;
            } else {
                // 텍스트와 그룹은 재사용하고 윤곽의 앵커와 핸들만 갱신한다.
                for (var i = 0; i < previews.length; i++) {
                    writeBoxPath(previews[i], options.offsetX * mmToPt, options.offsetY * mmToPt);
                }
            }
            previewPending = false;
            app.redraw();
            lastPreviewTime = new Date().getTime();
            return true;
        } catch (e) {
            clearPreview();
            status.text = "미리보기를 갱신하지 못했습니다: " + e;
            return false;
        }
    }

    function writeBoxPath(record, dx, dy) {
        var points = getBoxPoints(record.entry.bounds, options);
        var path = record.path;
        function shifted(point) { return [point[0] + dx, point[1] + dy]; }
        while (path.pathPoints.length > points.length) path.pathPoints[path.pathPoints.length - 1].remove();
        for (var q = 0; q < points.length; q++) {
            var point = q < path.pathPoints.length ? path.pathPoints[q] : path.pathPoints.add();
            point.anchor = shifted(points[q].anchor);
            point.leftDirection = shifted(points[q].left);
            point.rightDirection = shifted(points[q].right);
            point.pointType = PointType.CORNER;
        }
    }

    function buildPreview() {
        try {
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                var group = doc.groupItems.add();
                var record = { group: group, entry: entry, copy: null, moved: false, shifted: false };
                previews.push(record);
                group.name = "TextBoxGroup";
                group.move(entry.item, ElementPlacement.PLACEAFTER);
                var path = group.pathItems.add();
                path.name = "TextBox";
                record.path = path;
                writeBoxPath(record, 0, 0);
                path.closed = true;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = lineColor;
                path.strokeWidth = STROKE_PT;
                path.strokeDashes = [];
                try { path.strokeJoin = StrokeJoin.ROUNDENDJOIN; } catch (joinError) {}
                record.copy = entry.item.duplicate(group, ElementPlacement.PLACEATBEGINNING);
                record.copy.hidden = false;
                entry.item.hidden = true;
                group.translate(options.offsetX * mmToPt, options.offsetY * mmToPt);
            }
            return true;
        } catch (e) {
            clearPreview();
            status.text = "미리보기를 만들지 못했습니다: " + e;
            return false;
        }
    }

    function clearPreview() {
        for (var i = previews.length - 1; i >= 0; i--) {
            var record = previews[i];
            // 확인 처리 중 오류가 나도 원본이 미리보기와 함께 삭제되지 않도록 복구.
            if (record.moved) {
                if (record.shifted) record.entry.item.translate(-options.offsetX * mmToPt, -options.offsetY * mmToPt);
                record.entry.item.move(record.group, ElementPlacement.PLACEBEFORE);
            }
            record.entry.item.hidden = record.entry.hidden;
            record.group.remove();
        }
        previews = [];
        previewPending = false;
        doc.selection = null;
        for (var j = 0; j < targets.length; j++) {
            try { targets[j].selected = true; } catch (e) {}
        }
    }

    function defaultOptions() {
        return { paddingX: 3, paddingY: 1.5, radius: 0, offsetX: 0, offsetY: 0, preview: true };
    }

    function readSettings() {
        var result = defaultOptions();
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v1" || p.length !== 7) return result;
            var keys = ["paddingX", "paddingY", "radius", "offsetX", "offsetY"];
            var mins = [0, 0, 0, -100, -100];
            var maxs = [50, 50, 50, 100, 100];
            for (var i = 0; i < keys.length; i++) {
                var raw = p[i + 1];
                var value = Number(raw);
                if (!/\S/.test(raw) || !isFinite(value) || value < mins[i] || value > maxs[i]) return result;
            }
            if (!/^[01]$/.test(p[6])) return result;
            for (var j = 0; j < keys.length; j++) result[keys[j]] = Number(p[j + 1]);
            result.preview = p[6] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v1", options.paddingX, options.paddingY,
                options.radius, options.offsetX, options.offsetY, options.preview ? 1 : 0].join("|"));
        } catch (e) {}
    }

    function copySelection(selection) {
        var result = [];
        for (var i = 0; i < selection.length; i++) result.push(selection[i]);
        return result;
    }

    // 네 모서리를 같은 반지름으로 둥글린다. 반지름은 짧은 변의 절반 이하.
    function getBoxPoints(bounds, opts) {
        // 글자 외곽에서 박스 선 안쪽까지의 여백이므로 선 두께의 절반을 더한다.
        var padX = opts.paddingX * mmToPt + STROKE_PT / 2;
        var padY = opts.paddingY * mmToPt + STROKE_PT / 2;
        var left = bounds[0] - padX;
        var top = bounds[1] + padY;
        var width = bounds[2] - bounds[0] + 2 * padX;
        var height = bounds[1] - bounds[3] + 2 * padY;
        var radius = Math.min(opts.radius * mmToPt, width / 2, height / 2);
        var points = [];
        var k = 0.5522847498;
        function add(anchor, incoming, outgoing) {
            points.push({ anchor: anchor, left: incoming || anchor, right: outgoing || anchor });
        }
        function edge(origin, tangent, length) {
            function map(u) { return [origin[0] + tangent[0] * u, origin[1] + tangent[1] * u]; }
            if (radius === 0) { add(map(0)); return; }
            add(map(radius), map(radius - k * radius));
            add(map(length - radius), null, map(length - radius + k * radius));
        }
        edge([left, top], [1, 0], width);
        edge([left + width, top], [0, -1], height);
        edge([left + width, top - height], [-1, 0], width);
        edge([left, top - height], [0, 1], height);
        return points;
    }

    function getTargetBounds(item) {
        return item && item.typename === "TextFrame" ? getActualTextBounds(item) : null;
    }

    function getActualTextBounds(textFrame) {
        if (isReadableEmptyText(textFrame)) {
            return null;
        }

        var dup = null;
        var outline = null;
        try {
            dup = textFrame.duplicate();
            outline = dup.createOutline();
            return normalizeBounds(outline.visibleBounds);
        } catch (e) {
            // 윤곽 측정 실패를 프레임 크기로 대체하면 보이는 여백이 달라진다.
            return null;
        } finally {
            try {
                if (outline) {
                    outline.remove();
                } else if (dup) {
                    dup.remove();
                }
            } catch (e3) {}
        }
    }

    function isReadableEmptyText(textFrame) {
        try {
            return String(textFrame.contents).replace(/\s/g, "").length === 0;
        } catch (e) {
            return false;
        }
    }

    function normalizeBounds(bounds) {
        if (!bounds || bounds.length < 4) {
            return null;
        }

        var left = Number(bounds[0]);
        var top = Number(bounds[1]);
        var right = Number(bounds[2]);
        var bottom = Number(bounds[3]);

        if (isNaN(left) || isNaN(top) || isNaN(right) || isNaN(bottom)) {
            return null;
        }
        if (right <= left || top <= bottom) {
            return null;
        }

        return [left, top, right, bottom];
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
})();
