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

    var PREF_KEY = "TextAreaTextRoundedBox/settings";

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("텍스트를 선택하고 실행해주세요.");
        return;
    }

    var mmToPt = 2.83464567;
    var targets = copySelection(sel);
    var entries = [];
    var previews = [];
    var committed = false;
    var previewPending = false;
    var lastPreviewTime = 0;
    var PREVIEW_INTERVAL_MS = 40;
    var options = readSettings();
    var lineColor = makeBlackColor(doc);
    for (var i = 0; i < targets.length; i++) {
        var bounds = getTargetBounds(targets[i]);
        if (bounds) entries.push({ item: targets[i], bounds: bounds, hidden: targets[i].hidden });
    }
    if (!entries.length) {
        alert("선택한 항목 중 처리할 수 있는 텍스트가 없습니다.");
        return;
    }

    var STEP_BUTTON_WIDTH = 34;   // 더 좁히면 macOS 둥근 모서리가 맞붙어 타원처럼 보인다
    var win = new Window("dialog", "말풍선 만들기");
    win.alignChildren = "fill";
    var boxPanel = win.add("panel", undefined, "사각형 · 텍스트 주변 여백");
    boxPanel.alignChildren = "fill";
    addRow(boxPanel, "좌우 여백", "paddingX", 0, 50, "mm", false);
    addRow(boxPanel, "상하 여백", "paddingY", 0, 50, "mm", false);
    addRow(boxPanel, "코너 라운딩", "radius", 0, 50, "mm", false);
    var tailPanel = win.add("panel", undefined, "꼬리");
    tailPanel.alignChildren = "fill";
    var directionRow = tailPanel.add("group");
    directionRow.add("statictext", undefined, "방향");
    var directions = ["left", "bottom", "right", "top"];
    var direction = directionRow.add("dropdownlist", undefined, ["9시 (왼쪽)", "6시 (아래)", "3시 (오른쪽)", "12시 (위)"]);
    for (var d = 0; d < directions.length; d++) {
        if (directions[d] === options.tailPosition) direction.selection = d;
    }
    direction.onChange = function() {
        options.tailPosition = directions[direction.selection.index];
        updatePreview();
    };
    addRow(tailPanel, "붙는 위치", "tailOffset", 0, 100, "%", false);
    tailPanel.add("statictext", undefined, "0 → 100%: 가로변은 왼쪽 → 오른쪽, 세로변은 위 → 아래");
    addRow(tailPanel, "꼬리 크기", "tailSize", 20, 400, "%", false);
    addRow(tailPanel, "휘어짐", "tailBend", 0, 100, "%", false);
    tailPanel.add("statictext", undefined, "휘어짐 0%: 곧은 꼬리 · 100%: 기존 곡선");
    var flip = tailPanel.add("checkbox", undefined, "꼬리 휘어짐 반전");
    flip.value = options.flip;
    flip.onClick = function() { options.flip = flip.value; updatePreview(); };
    var positionPanel = win.add("panel", undefined, "위치");
    positionPanel.alignChildren = "fill";
    addRow(positionPanel, "가로 이동", "offsetX", -100, 100, "mm", true);
    addRow(positionPanel, "세로 이동", "offsetY", -100, 100, "mm", true);
    positionPanel.add("statictext", undefined, "양수: 오른쪽 / 위쪽 · 텍스트와 말풍선을 함께 이동");
    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = options.preview;
    previewCheck.onClick = function() { options.preview = previewCheck.value; updatePreview(); };
    var ok = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    var status = win.add("statictext", undefined, " ");
    status.preferredSize.width = 430;
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
    win.onShow = updatePreview;
    try { win.show(); }
    finally {
        if (!committed) clearPreview();
        app.redraw();
    }

    function addRow(panel, label, key, min, max, unit, positionOnly) {
        var row = panel.add("group");
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = 85;
        var step = unit === "mm" ? 0.1 : 1;
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        minus.helpTip = String(step) + unit + " 감소";
        var slider = row.add("slider", undefined, options[key], min, max);
        slider.preferredSize.width = 126;
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
        plus.helpTip = String(step) + unit + " 증가";
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 6;
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
                try {
                    var delta = (value - previous) * mmToPt;
                    for (var p = 0; p < previews.length; p++) {
                        previews[p].group.translate(key === "offsetX" ? delta : 0, key === "offsetY" ? delta : 0);
                    }
                    app.redraw();
                } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
            } else updatePreview(dragging);
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
                    writeBubblePath(previews[i], options.offsetX * mmToPt, options.offsetY * mmToPt);
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

    function writeBubblePath(record, dx, dy) {
        var points = getBubblePoints(record.entry.bounds, options);
        var path = record.path;
        function shifted(point) { return [point[0] + dx, point[1] + dy]; }
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
                group.name = "TextSpeechBubbleGroup";
                group.move(entry.item, ElementPlacement.PLACEAFTER);
                var path = group.pathItems.add();
                path.name = "TextSpeechBubble";
                record.path = path;
                writeBubblePath(record, 0, 0);
                path.closed = true;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = lineColor;
                path.strokeWidth = 0.3;
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

    function readSettings() {
        var result = { paddingX: 2, paddingY: 1.5, radius: 1.5, tailPosition: "bottom",
            tailOffset: 68, flip: false, offsetX: 0, offsetY: 0, preview: true, tailBend: 100, tailSize: 100 };
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v4" || p.length !== 12) return result;
            var keys = ["paddingX", "paddingY", "radius", "tailOffset", "offsetX", "offsetY", "tailBend", "tailSize"];
            var indices = [1, 2, 3, 5, 7, 8, 10, 11];
            var mins = [0, 0, 0, 0, -100, -100, 0, 20];
            var maxs = [50, 50, 50, 100, 100, 100, 100, 400];
            for (var i = 0; i < keys.length; i++) {
                var raw = p[indices[i]];
                var value = Number(raw);
                if (!/\S/.test(raw) || !isFinite(value) || value < mins[i] || value > maxs[i]) return result;
            }
            if (!/^(left|bottom|right|top)$/.test(p[4]) || !/^[01]$/.test(p[6]) || !/^[01]$/.test(p[9])) return result;
            for (var j = 0; j < keys.length; j++) result[keys[j]] = Number(p[indices[j]]);
            result.tailPosition = p[4];
            result.flip = p[6] === "1";
            result.preview = p[9] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v4", options.paddingX, options.paddingY,
                options.radius, options.tailPosition, options.tailOffset, options.flip ? 1 : 0,
                options.offsetX, options.offsetY, options.preview ? 1 : 0, options.tailBend,
                options.tailSize].join("|"));
        } catch (e) {}
    }

    function copySelection(selection) {
        var result = [];
        for (var i = 0; i < selection.length; i++) result.push(selection[i]);
        return result;
    }

    // 둥근 사각형과 곡선 꼬리를 하나의 닫힌 경로로 직접 만든다.
    function getBubblePoints(bounds, opts) {
        var left = bounds[0] - opts.paddingX * mmToPt;
        var top = bounds[1] + opts.paddingY * mmToPt;
        var width = bounds[2] - bounds[0] + 2 * opts.paddingX * mmToPt;
        var height = bounds[1] - bounds[3] + 2 * opts.paddingY * mmToPt;
        var horizontal = opts.tailPosition === "top" || opts.tailPosition === "bottom";
        var sideLength = horizontal ? width : height;
        var scale = opts.tailSize / 100;      // 꼬리 크기: 밑변과 길이를 같은 비율로
        var base = Math.min(1.26 * mmToPt * scale, sideLength / 3);
        // 꼬리가 붙는 직선 구간을 확보하고 모서리와의 겹침을 방지한다.
        var radius = Math.min(opts.radius * mmToPt, width / 2, height / 2, (sideLength - base) / 2);
        var points = [];
        var k = 0.5522847498;
        function add(anchor, incoming, outgoing) {
            points.push({ anchor: anchor, left: incoming || anchor, right: outgoing || anchor });
        }
        // 각 변의 진행 방향은 시계 방향, v는 바깥쪽을 향한다.
        function edge(name, origin, tangent, normal, length) {
            function map(u, v) {
                return [origin[0] + tangent[0] * u + normal[0] * v,
                    origin[1] + tangent[1] * u + normal[1] * v];
            }
            add(map(radius, 0), map(radius - k * radius, 0));
            if (opts.tailPosition === name) {
                var ratio = opts.tailOffset / 100;
                if (name === "bottom" || name === "left") ratio = 1 - ratio;
                var center = radius + base / 2 + ratio * Math.max(0, length - 2 * radius - base);
                var reverse = opts.flip !== (name === "bottom" || name === "left");
                function tailMap(x, y) {
                    var u = (x - 2.25) * base / 3.49;
                    if (reverse) u = base - u;
                    return map(center - base / 2 + u, (y - 0.15) * 2.45 * mmToPt * scale / 6.9);
                }
                // 곧은 삼각형의 베지어 제어점에서 기존 곡선까지 보간한다.
                var bend = opts.tailBend / 100;
                var midX = (2.25 + 5.74) / 2;
                function curve(x, y, straightX, straightY) {
                    return tailMap(straightX + (x - straightX) * bend,
                        straightY + (y - straightY) * bend);
                }
                var tail = [
                    { anchor: tailMap(2.25, 0.15), left: tailMap(2.25, 0.15),
                        right: curve(3.22, 2.68, (2 * 2.25 + midX) / 3, 2.45) },
                    { anchor: curve(0.15, 7.05, midX, 7.05),
                        left: curve(2.21, 4.98, (2.25 + 2 * midX) / 3, 4.75),
                        right: curve(3.78, 5.43, (2 * midX + 5.74) / 3, 4.75) },
                    { anchor: tailMap(5.74, 0.15),
                        left: curve(5.6, 3.91, (midX + 2 * 5.74) / 3, 2.45), right: tailMap(5.74, 0.15) }
                ];
                if (reverse) {
                    tail.reverse();
                    for (var t = 0; t < tail.length; t++) {
                        var handle = tail[t].left;
                        tail[t].left = tail[t].right;
                        tail[t].right = handle;
                    }
                }
                for (var j = 0; j < tail.length; j++) points.push(tail[j]);
            }
            add(map(length - radius, 0), null, map(length - radius + k * radius, 0));
        }
        edge("top", [left, top], [1, 0], [0, 1], width);
        edge("right", [left + width, top], [0, -1], [1, 0], height);
        edge("bottom", [left + width, top - height], [-1, 0], [0, -1], width);
        edge("left", [left, top - height], [0, 1], [-1, 0], height);
        return points;
    }

    function getTargetBounds(item) {
        if (!item) {
            return null;
        }
        if (item.typename === "TextFrame") {
            return getActualTextBounds(item);
        }
        if (item.typename === "GroupItem") {
            return getGroupContentBounds(item);
        }
        if (isOutlineLikeItem(item)) {
            return getVisibleBounds(item);
        }
        return null;
    }

    function getGroupContentBounds(group) {
        var bounds = null;

        try {
            for (var i = 0; i < group.pageItems.length; i++) {
                bounds = mergeBounds(bounds, getTargetBounds(group.pageItems[i]));
            }
        } catch (e) {}

        return bounds;
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
            return getVisibleBounds(textFrame);
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

    function isOutlineLikeItem(item) {
        return item.typename === "CompoundPathItem" ||
            item.typename === "PathItem";
    }

    function mergeBounds(a, b) {
        if (!a) {
            return b;
        }
        if (!b) {
            return a;
        }

        return [
            Math.min(a[0], b[0]),
            Math.max(a[1], b[1]),
            Math.max(a[2], b[2]),
            Math.min(a[3], b[3])
        ];
    }

    function getVisibleBounds(item) {
        try {
            return normalizeBounds(item.visibleBounds);
        } catch (e) {
            try {
                return normalizeBounds(item.geometricBounds);
            } catch (e2) {
                return null;
            }
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
