(function() {
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length === 0) {
        alert("변형할 객체를 선택해주세요.");
        return;
    }

    var isPreviewing = false;
    var PREF_PREFIX = "Custom3DRotator_";
    var angleStep = 1;
    var minAngle = 0;
    var maxAngle = 360;

    // --- 설정 불러오기 (환경설정에서 읽기) ---
    function getSavedSettings() {
        var defaults = { x: "45", y: "0", z: "0", d: "600", persp: true, preview: true };
        try {
            // 값이 존재할 때만 덮어쓰기
            if (app.preferences.getIntegerPreference(PREF_PREFIX + "exists") === 1) {
                defaults.x = app.preferences.getStringPreference(PREF_PREFIX + "x");
                defaults.y = app.preferences.getStringPreference(PREF_PREFIX + "y");
                defaults.z = app.preferences.getStringPreference(PREF_PREFIX + "z");
                defaults.d = app.preferences.getStringPreference(PREF_PREFIX + "d");
                defaults.persp = (app.preferences.getStringPreference(PREF_PREFIX + "persp") === "true");
                defaults.preview = (app.preferences.getStringPreference(PREF_PREFIX + "preview") === "true");
            }
        } catch(e) {
            // 에러 발생 시 기본값 사용
        }
        return defaults;
    }

    // --- 설정 저장하기 (환경설정에 기록) ---
    function saveSettings(x, y, z, d, persp, preview) {
        try {
            app.preferences.setIntegerPreference(PREF_PREFIX + "exists", 1);
            app.preferences.setStringPreference(PREF_PREFIX + "x", x);
            app.preferences.setStringPreference(PREF_PREFIX + "y", y);
            app.preferences.setStringPreference(PREF_PREFIX + "z", z);
            app.preferences.setStringPreference(PREF_PREFIX + "d", d);
            app.preferences.setStringPreference(PREF_PREFIX + "persp", String(persp));
            app.preferences.setStringPreference(PREF_PREFIX + "preview", String(preview));
        } catch(e) {}
    }

    var lastValues = getSavedSettings();

    // --- UI 구성 ---
    var win = new Window("dialog", "3D 라인 프로 (설정 저장 수정판)");
    win.orientation = "column";
    win.alignChildren = "fill";

    // 프리셋 버튼
    var pnlPreset = win.add("panel", undefined, "View Presets");
    pnlPreset.orientation = "row";
    var btnTop = pnlPreset.add("button", undefined, "Top View");
    var btnFront = pnlPreset.add("button", undefined, "Front");
    var btnSide = pnlPreset.add("button", undefined, "Side View");

    // 수치 입력
    var pnlInput = win.add("panel", undefined, "Rotation Settings");
    pnlInput.alignChildren = "fill";

    function addAngleInput(parent, label, defaultVal) {
        var control = {};
        var grp = parent.add("group");
        grp.alignChildren = ["left", "center"];
        grp.add("statictext", undefined, label);
        control.input = grp.add("edittext", undefined, normalizeAngleText(defaultVal));
        control.input.characters = 7;

        control.scrollbar = parent.add(
            "scrollbar",
            undefined,
            angleToStep(parseAngle(control.input.text)),
            angleToStep(minAngle),
            angleToStep(maxAngle)
        );
        control.scrollbar.preferredSize.width = 320;
        control.scrollbar.stepdelta = 1;
        control.scrollbar.jumpdelta = 15;
        control.isSyncing = false;

        control.input.onChange = function() {
            syncAngleScrollbar(control, parseAngle(control.input.text));
        };

        control.scrollbar.onChanging = function() {
            if (control.isSyncing) {
                return;
            }

            control.input.text = String(stepToAngle(control.scrollbar.value));
            if (checkPreview.value) runTransform();
        };

        return control;
    }

    function addInput(parent, label, defaultVal) {
        var grp = parent.add("group");
        grp.add("statictext", undefined, label);
        var txt = grp.add("edittext", undefined, defaultVal);
        txt.characters = 7;
        return txt;
    }

    var controlX = addAngleInput(pnlInput, "X Axis (Tilt):", lastValues.x);
    var controlY = addAngleInput(pnlInput, "Y Axis (Spin):", lastValues.y);
    var controlZ = addAngleInput(pnlInput, "Z Axis (Roll):", lastValues.z);
    var inputX = controlX.input;
    var inputY = controlY.input;
    var inputZ = controlZ.input;

    // 원근 옵션
    var pnlPersp = win.add("panel", undefined, "Perspective Options");
    var checkPersp = pnlPersp.add("checkbox", undefined, "Apply Perspective (사다리꼴)");
    checkPersp.value = lastValues.persp;
    var grpVal = pnlPersp.add("group");
    grpVal.add("statictext", undefined, "Strength:");
    var inputD = grpVal.add("edittext", undefined, lastValues.d);
    inputD.characters = 7;
    inputD.enabled = checkPersp.value;

    var checkPreview = win.add("checkbox", undefined, "미리보기 (Preview)");
    checkPreview.value = lastValues.preview;
    checkPreview.alignment = "center";

    var grpBtn = win.add("group");
    grpBtn.alignment = "center";
    var btnCancel = grpBtn.add("button", undefined, "Cancel");
    var btnOk = grpBtn.add("button", undefined, "OK");

    // --- 실행 함수 ---
    function runTransform() {
        if (isPreviewing) { app.undo(); isPreviewing = false; }
        
        // 사용자의 직관을 위해 X축 회전 방향 보정
        var ax = (parseFloat(inputX.text || 0) * -1) * (Math.PI / 180); 
        var ay = parseFloat(inputY.text || 0) * (Math.PI / 180);
        var az = parseFloat(inputZ.text || 0) * (Math.PI / 180);
        var d = parseFloat(inputD.text || 600);
        var usePersp = checkPersp.value;

        var center = getSelectionCenter(sel);
        for (var i = 0; i < sel.length; i++) processObject(sel[i], center, ax, ay, az, d, usePersp);
        
        app.redraw();
        isPreviewing = true;
    }

    function parseAngle(text) {
        var value = parseFloat(String(text).replace(",", "."));
        if (isNaN(value)) {
            return 0;
        }
        return value;
    }

    function normalizeAngleText(value) {
        return String(Math.max(minAngle, Math.min(maxAngle, Math.round(parseAngle(value) / angleStep) * angleStep)));
    }

    function angleToStep(value) {
        return Math.round(value / angleStep);
    }

    function stepToAngle(step) {
        return step * angleStep;
    }

    function syncAngleScrollbar(control, value) {
        if (control.isSyncing || isNaN(value)) {
            return;
        }

        value = Math.max(minAngle, Math.min(maxAngle, value));
        control.isSyncing = true;
        control.scrollbar.value = angleToStep(value);
        control.isSyncing = false;
    }

    function setAngle(control, value) {
        control.input.text = normalizeAngleText(value);
        syncAngleScrollbar(control, parseAngle(control.input.text));
    }

    // --- 이벤트 핸들러 ---
    btnTop.onClick = function() { setAngle(controlX, 60); setAngle(controlY, 0); setAngle(controlZ, 0); if (checkPreview.value) runTransform(); };
    btnFront.onClick = function() { setAngle(controlX, 0); setAngle(controlY, 0); setAngle(controlZ, 0); if (checkPreview.value) runTransform(); };
    btnSide.onClick = function() { setAngle(controlX, 0); setAngle(controlY, 60); setAngle(controlZ, 0); if (checkPreview.value) runTransform(); };

    inputX.onChanging = inputY.onChanging = inputZ.onChanging = inputD.onChanging = function() { if (checkPreview.value) runTransform(); };
    inputX.onChange = function() { syncAngleScrollbar(controlX, parseAngle(inputX.text)); };
    inputY.onChange = function() { syncAngleScrollbar(controlY, parseAngle(inputY.text)); };
    inputZ.onChange = function() { syncAngleScrollbar(controlZ, parseAngle(inputZ.text)); };
    checkPersp.onClick = function() { inputD.enabled = checkPersp.value; if (checkPreview.value) runTransform(); };
    checkPreview.onClick = function() { 
        if (checkPreview.value) runTransform(); 
        else if (isPreviewing) { app.undo(); isPreviewing = false; app.redraw(); } 
    };

    btnOk.onClick = function() {
        if (!isPreviewing) runTransform();
        // [OK]를 눌러 적용 시점에만 설정값 저장
        saveSettings(inputX.text, inputY.text, inputZ.text, inputD.text, checkPersp.value, checkPreview.value);
        win.close(1);
    };

    btnCancel.onClick = function() { if (isPreviewing) app.undo(); win.close(0); };

    // 최초 실행 시 미리보기가 켜져있으면 즉시 실행
    if (checkPreview.value) runTransform();

    win.show();

    // --- 엔진 (내부 로직) ---
    function processObject(item, origin, ax, ay, az, d, usePersp) {
        if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pageItems.length; j++) processObject(item.pageItems[j], origin, ax, ay, az, d, usePersp);
        } else if (item.typename === "PathItem") {
            transformPath(item, origin, ax, ay, az, d, usePersp);
        } else if (item.typename === "CompoundPathItem") {
            for (var k = 0; k < item.pathItems.length; k++) transformPath(item.pathItems[k], origin, ax, ay, az, d, usePersp);
        }
    }

    function transformPath(pathItem, origin, ax, ay, az, d, usePersp) {
        var pts = pathItem.pathPoints;
        for (var i = 0; i < pts.length; i++) {
            var pt = pts[i];
            pt.anchor = projectPoint(pt.anchor, origin, ax, ay, az, d, usePersp);
            pt.leftDirection = projectPoint(pt.leftDirection, origin, ax, ay, az, d, usePersp);
            pt.rightDirection = projectPoint(pt.rightDirection, origin, ax, ay, az, d, usePersp);
        }
    }

    function projectPoint(point, origin, ax, ay, az, d, usePersp) {
        var x = point[0] - origin[0];
        var y = -(point[1] - origin[1]);
        var z = 0;
        var y1 = y * Math.cos(ax) - z * Math.sin(ax);
        var z1 = y * Math.sin(ax) + z * Math.cos(ax);
        var x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
        var z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
        var x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
        var y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
        if (usePersp) {
            var factor = d / (d + z2); 
            return [(x3 * factor) + origin[0], -(y3 * factor) + origin[1]];
        }
        return [x3 + origin[0], -y3 + origin[1]];
    }

    function getSelectionCenter(selection) {
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (var i = 0; i < selection.length; i++) {
            var b = selection[i].controlBounds;
            if (b[0] < minX) minX = b[0]; if (b[1] > maxY) maxY = b[1];
            if (b[2] > maxX) maxX = b[2]; if (b[3] < minY) minY = b[3];
        }
        return [minX + (maxX - minX) / 2, maxY + (minY - maxY) / 2];
    }
})();
