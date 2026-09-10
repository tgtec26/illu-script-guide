// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 수평으로 던진 물체가 지면에 닿을 때까지의 궤적. 공기 저항은 무시한다.
(function() {
    var PREF_KEY = "ObjectHorizontalProjectile/settings";
    var MM_TO_PT = 2.834645669;
    var GRAVITY = 9.8;
    var SCALE_MM_PER_M = 2;
    var PREVIEW_INTERVAL_MS = 40;
    // 각 구간의 현에서 벗어나는 최대 거리를 최소 선폭(0.3pt)보다 충분히 작게 한다.
    var SEGMENT_SAG_PT = 0.025;
    if (!app.documents.length) {
        alert("문서를 먼저 열어주세요.");
        return;
    }
    var doc = app.activeDocument;
    if (doc.activeLayer.locked || !doc.activeLayer.visible) {
        alert("편집할 수 있는 레이어를 선택한 뒤 실행해주세요.");
        return;
    }
    var originalSelection = [];
    var selection = doc.selection;
    if (selection && selection.typename === "TextRange") {
        alert("텍스트 편집을 마친 뒤 실행해주세요.");
        return;
    }
    if (selection) {
        for (var i = 0; i < selection.length; i++) originalSelection.push(selection[i]);
    }
    var fields = [
        { key: "height", label: "높이", unit: "m", min: 0.1, max: 100, step: 0.1, initial: 20 },
        { key: "speed", label: "수평 속도", unit: "m/s", min: 0, max: 100, step: 0.1, initial: 10 },
        { key: "offsetX", label: "가로 이동", unit: "mm", min: -100, max: 100, step: 0.1, initial: 0 },
        { key: "offsetY", label: "세로 이동", unit: "mm", min: -100, max: 100, step: 0.1, initial: 0 },
        { key: "strokeWidth", label: "선 두께", unit: "pt", min: 0.3, max: 2, step: 0.1, initial: 0.3 }
    ];
    var options = readSettings();
    var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var initial = trajectory(options.height, options.speed);
    // 시작점은 처음 배치할 때만 정한다. 값을 바꿔도 투사 지점은 움직이지 않는다.
    var originX = (artboard[0] + artboard[2] - initial.width) / 2;
    var originY = (artboard[1] + artboard[3] + initial.height) / 2;
    var previewGroup = null;
    var previewPath = null;
    var appliedX = 0;
    var appliedY = 0;
    var pending = false;
    var lastPreviewTime = 0;
    var committed = false;

    var win = new Window("dialog", "수평으로 던진 물체의 포물선");
    win.alignChildren = "fill";
    var shapePanel = win.add("panel", undefined, "수평 던지기");
    shapePanel.alignChildren = "fill";
    addRow(shapePanel, fields[0], false);
    addRow(shapePanel, fields[1], false);
    shapePanel.add("statictext", undefined, "오른쪽으로 투사 · 중력 9.8m/s² · 공기 저항 없음");
    shapePanel.add("statictext", undefined, "도면 축척: 실제 1m = 도면 2mm (가로·세로 동일)");
    var resultText = shapePanel.add("statictext", undefined, " ");
    resultText.preferredSize.width = 440;
    var strokePanel = win.add("panel", undefined, "선");
    strokePanel.alignChildren = "fill";
    addRow(strokePanel, fields[4], false);
    var positionPanel = win.add("panel", undefined, "위치");
    positionPanel.alignChildren = "fill";
    addRow(positionPanel, fields[2], true);
    addRow(positionPanel, fields[3], true);
    positionPanel.add("statictext", undefined, "양수: 오른쪽 / 위쪽");
    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = options.preview;
    previewCheck.onClick = function() {
        options.preview = previewCheck.value;
        updatePreview(false, false);
    };
    var ok = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    var status = win.add("statictext", undefined, " ");
    status.preferredSize.width = 440;
    ok.onClick = function() {
        if (!updatePreview(false, true)) return;
        doc.selection = null;
        previewGroup.selected = true;
        previewGroup.name = "HorizontalProjectile";
        saveSettings();
        committed = true;
        win.close(1);
    };
    win.onShow = function() { updatePreview(false, false); };
    try { win.show(); }
    finally {
        if (!committed) clearPreview();
        app.redraw();
    }

    function addRow(panel, field, positionOnly) {
        var row = panel.add("group");
        row.add("statictext", undefined, field.label).preferredSize.width = 75;
        var minus = row.add("button", undefined, "−");
        minus.preferredSize.width = 34;
        var slider = row.add("slider", undefined, options[field.key], field.min, field.max);
        slider.preferredSize.width = 180;
        var plus = row.add("button", undefined, "+");
        plus.preferredSize.width = 34;
        var input = row.add("edittext", undefined, String(options[field.key]));
        input.characters = 6;
        row.add("statictext", undefined, field.unit);
        minus.helpTip = String(field.step) + field.unit + " 감소";
        plus.helpTip = String(field.step) + field.unit + " 증가";
        function apply(value, dragging) {
            if (field.key === "strokeWidth") value = Math.round(value * 10) / 10;
            value = Math.round(value * 100) / 100;
            if (!isFinite(value) || value < field.min || value > field.max) {
                input.text = String(options[field.key]);
                return;
            }
            var previous = options[field.key];
            options[field.key] = value;
            slider.value = value;
            input.text = String(value);
            if (previous === value) {
                if (!dragging && pending) updatePreview(false, false);
                return;
            }
            if (positionOnly) {
                try {
                    movePreview();
                    if (previewGroup) app.redraw();
                } catch (e) {
                    clearPreview();
                    status.text = "이동하지 못했습니다: " + e;
                }
            } else updatePreview(dragging, false);
        }
        minus.onClick = function() { apply(Math.max(field.min, options[field.key] - field.step), false); };
        plus.onClick = function() { apply(Math.min(field.max, options[field.key] + field.step), false); };
        slider.onChanging = function() { apply(slider.value, true); };
        slider.onChange = function() { apply(slider.value, false); };
        input.onChange = function() {
            if (!/\S/.test(input.text)) { input.text = String(options[field.key]); return; }
            apply(Number(input.text), false);
        };
    }

    function trajectory(height, speed) {
        var time = Math.sqrt(2 * height / GRAVITY);
        var range = speed * time;
        return { time: time, range: range,
            width: range * SCALE_MM_PER_M * MM_TO_PT,
            height: height * SCALE_MM_PER_M * MM_TO_PT };
    }

    function updatePreview(dragging, forceVisible) {
        pending = true;
        if (dragging && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
        var motion = trajectory(options.height, options.speed);
        resultText.text = "비행시간: " + motion.time.toFixed(2) + "s    수평 도달거리: " + motion.range.toFixed(2) + "m";
        status.text = " ";
        try {
            if (!options.preview && !forceVisible) {
                if (previewGroup) clearPreview();
            } else {
                if (!previewGroup) {
                    previewGroup = doc.activeLayer.groupItems.add();
                    previewGroup.name = "HorizontalProjectile Preview";
                    previewPath = previewGroup.pathItems.add();
                    previewPath.name = "ProjectileTrajectory";
                    previewPath.setEntirePath([[originX, originY], [originX, originY - 1]]);
                    // strokeWidth만 지정하면 물려받은 브러시/가변 폭은 남을 수 있다.
                    // 기본 그래픽 스타일로 외형을 먼저 초기화한다(생성 시 한 번만).
                    doc.graphicStyles[0].applyTo(previewPath);
                    appliedX = 0;
                    appliedY = 0;
                }
                movePreview();
                writeTrajectory(previewPath, originX + appliedX, originY + appliedY, motion);
                applyUniformStroke(previewPath);
            }
            pending = false;
            app.redraw();
            lastPreviewTime = new Date().getTime();
            return true;
        } catch (e) {
            clearPreview();
            status.text = "미리보기를 만들지 못했습니다: " + e;
            return false;
        }
    }

    function applyUniformStroke(path) {
        path.closed = false;
        path.filled = false;
        path.stroked = true;
        path.strokeColor = blackColor();
        path.strokeWidth = options.strokeWidth;
        path.strokeDashes = [];
        path.strokeDashOffset = 0;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        path.opacity = 100;
    }

    function trajectoryPoints(x, y, motion) {
        // 긴 단일 베지어의 얇은 획에서 나타나는 GPU 표시 깨짐을 줄이기 위해
        // 동일한 포물선을 짧은 베지어들로 정확히 분할한다. 직선 근사가 아니다.
        // 포물선과 각 구간의 현 사이 수직 거리 최댓값 = H / (4 * count²).
        var count = Math.max(16, Math.ceil(Math.sqrt(motion.height / (4 * SEGMENT_SAG_PT))));
        var dt = 1 / count;
        var points = [];
        for (var i = 0; i <= count; i++) {
            var t = i / count;
            var anchor = [x + motion.width * t, y - motion.height * t * t];
            var hx = motion.width * dt / 3;
            var hy = -2 * motion.height * t * dt / 3;
            points.push({
                anchor: anchor,
                left: i === 0 ? anchor : [anchor[0] - hx, anchor[1] - hy],
                right: i === count ? anchor : [anchor[0] + hx, anchor[1] + hy]
            });
        }
        return points;
    }

    function writeTrajectory(path, x, y, motion) {
        var points = trajectoryPoints(x, y, motion);
        // 경로와 미리보기 그룹을 재사용한다. 필요한 앵커 개수만 맞춘다.
        while (path.pathPoints.length > points.length) path.pathPoints[path.pathPoints.length - 1].remove();
        while (path.pathPoints.length < points.length) path.pathPoints.add();
        for (var i = 0; i < points.length; i++) {
            var point = path.pathPoints[i];
            point.pointType = PointType.CORNER;
            point.anchor = points[i].anchor;
            point.leftDirection = points[i].left;
            point.rightDirection = points[i].right;
        }
    }

    function movePreview() {
        if (!previewGroup) return;
        var x = options.offsetX * MM_TO_PT;
        var y = options.offsetY * MM_TO_PT;
        if (x !== appliedX || y !== appliedY) previewGroup.translate(x - appliedX, y - appliedY);
        appliedX = x;
        appliedY = y;
    }

    function clearPreview() {
        if (previewGroup) previewGroup.remove();
        previewGroup = null;
        previewPath = null;
        pending = false;
        doc.selection = null;
        for (var i = 0; i < originalSelection.length; i++) {
            try { originalSelection[i].selected = true; } catch (e) {}
        }
    }

    function readSettings() {
        var result = { preview: true };
        for (var i = 0; i < fields.length; i++) result[fields[i].key] = fields[i].initial;
        try {
            var parts = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (parts[0] !== "v2" || parts.length !== 7 || !/^[01]$/.test(parts[6])) return result;
            for (var j = 0; j < fields.length; j++) {
                var value = Number(parts[j + 1]);
                if (!/\S/.test(parts[j + 1]) || !isFinite(value) || value < fields[j].min || value > fields[j].max) return result;
                if (fields[j].key === "strokeWidth" && Math.abs(value * 10 - Math.round(value * 10)) > 0.000001) return result;
            }
            for (var k = 0; k < fields.length; k++) result[fields[k].key] = Number(parts[k + 1]);
            result.preview = parts[6] === "1";
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v2", options.height, options.speed,
                options.offsetX, options.offsetY, options.strokeWidth, options.preview ? 1 : 0].join("|"));
        } catch (e) {}
    }

    function blackColor() {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = 100;
        } else {
            color = new RGBColor();
            color.red = 0; color.green = 0; color.blue = 0;
        }
        return color;
    }
})();
