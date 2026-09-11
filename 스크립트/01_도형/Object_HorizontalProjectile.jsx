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
    // 포물선은 2차 곡선이라 3차 베지어 하나로 정확히 그릴 수 있지만, 그 "정확히 2차인 3차 곡선"을
    // GPU 미리보기가 1pt 이하 얇은 선에서 잘못 그린다(현과 곡선 사이가 검게 채워짐). 그래서
    // 앵커는 2개로 두고 핸들 길이를 시작 쪽 (1+skew)배, 끝 쪽 (1−skew)배로 바꿔 2차 꼴을 깬다.
    // 접선 방향과 양 끝점은 그대로. 0.1이면 포물선과의 오차가 최대 0.13pt(0.04mm)로 눈에 띄지 않는다.
    var HANDLE_SKEW = 0.1;
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
        { key: "height", label: "높이", unit: "m", min: 0.1, max: 40, step: 0.1, initial: 20 },
        { key: "speed", label: "수평 속도", unit: "m/s", min: 0, max: 20, step: 0.1, initial: 10 },
        { key: "offsetX", label: "가로 이동", unit: "mm", min: -100, max: 100, step: 0.1, initial: 0 },
        { key: "offsetY", label: "세로 이동", unit: "mm", min: -100, max: 100, step: 0.1, initial: 0 },
        { key: "strokeWidth", label: "선 두께", unit: "pt", min: 0.3, max: 2, step: 0.1, initial: 0.3 }
    ];
    var options = readSettings();
    var view = doc.activeView ? doc.activeView : doc.views[0];
    var viewCenter = view.centerPoint;
    var initial = trajectory(options.height, options.speed);
    // 시작점은 처음 배치할 때만 정한다. 값을 바꿔도 투사 지점은 움직이지 않는다.
    var originX = viewCenter[0] - initial.width / 2;
    var originY = viewCenter[1] + initial.height / 2;
    var previewGroup = null;
    var previewPath = null;
    var appliedX = 0;
    var appliedY = 0;
    var pending = false;
    var lastPreviewTime = 0;
    var committed = false;

    var STEP_BUTTON_WIDTH = 34;   // 더 좁히면 macOS 둥근 모서리가 맞붙어 타원처럼 보인다
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
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, options[field.key], field.min, field.max);
        slider.preferredSize.width = 126;
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
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

    // 포물선 P(s) = (x + w·s, y − h·s²)는 시작·끝 접선의 교점 (x + w/2, y)를 제어점으로 둔
    // 2차 베지어와 정확히 같다. 3차로 올리면 핸들이 그 교점 쪽 2/3 지점에 오는데,
    // 시작 핸들은 (1+skew), 끝 핸들은 (1−skew)배로 늘이고 줄여 정확한 2차 꼴을 깬다.
    function trajectoryPoints(x, y, motion) {
        var w = motion.width;
        var h = motion.height;
        var start = [x, y];
        var end = [x + w, y - h];
        var control = [x + w / 2, y];
        function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
        return [
            { anchor: start, left: start, right: lerp(start, control, 2 / 3 * (1 + HANDLE_SKEW)) },
            { anchor: end, left: lerp(end, control, 2 / 3 * (1 - HANDLE_SKEW)), right: end }
        ];
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
            if (parts[0] !== "v4" || parts.length !== 7 || !/^[01]$/.test(parts[6])) return result;
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
            app.preferences.setStringPreference(PREF_KEY, ["v4", options.height, options.speed,
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
