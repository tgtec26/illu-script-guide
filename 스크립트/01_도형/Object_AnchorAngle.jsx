(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 앵커 포인트 2개를 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectAnchorAngle/settings";

    var doc = app.activeDocument;
    var selectedPoints = [];
    var owners = [];
    collectSelectedPoints(doc.selection, selectedPoints, owners);

    if (selectedPoints.length !== 2) {
        alert("직접 선택 도구로 앵커 포인트를 정확히 2개 선택해주세요.");
        return;
    }

    var firstAnchor = copyPoint(selectedPoints[0].point.anchor);
    var secondAnchor = copyPoint(selectedPoints[1].point.anchor);
    if (pointsAreEqual(firstAnchor, secondAnchor)) {
        alert("서로 다른 위치의 앵커 포인트 2개를 선택해주세요.");
        return;
    }

    var currentAngle = getLineAngle(firstAnchor, secondAnchor);
    var dialogResult = showAngleDialog(currentAngle);
    if (dialogResult === null) return;

    var rotationAngle = getShortestRotation(currentAngle, dialogResult.angle);
    if (Math.abs(rotationAngle) < 0.000001) return;

    var pivot = dialogResult.pivotSide === "right"
        ? getRightAnchor(firstAnchor, secondAnchor)
        : getLeftAnchor(firstAnchor, secondAnchor);

    try {
        rotateOwners(owners, selectedPoints, pivot, rotationAngle);
        app.redraw();
    } catch (error) {
        alert("오브젝트를 회전하는 중 오류가 발생했습니다.");
    }

    function showAngleDialog(angle) {
        var result = null;
        var presetAngles = [0, 30, 45, 60, 90];
        var dlg = new Window("dialog", "앵커 기준 각도 맞추기");
        dlg.orientation = "column";
        dlg.alignChildren = "fill";
        dlg.margins = 16;

        var currentLabel = dlg.add("statictext", undefined, "수평선 기준 현재 각도: " + formatAngle(getSignedHorizontalAngle(angle)) + "°");
        currentLabel.alignment = "left";

        var presetPanel = dlg.add("panel", undefined, "각도 선택");
        presetPanel.orientation = "row";
        presetPanel.alignChildren = ["fill", "center"];

        var inputRow = dlg.add("group");
        inputRow.add("statictext", undefined, "직접 입력");
        var angleInput = inputRow.add("edittext", undefined, "0");
        angleInput.characters = 8;
        inputRow.add("statictext", undefined, "°");

        var pivotPanel = dlg.add("panel", undefined, "고정시킬 고정점");
        pivotPanel.orientation = "row";
        pivotPanel.alignChildren = ["left", "center"];
        var leftPivotRadio = pivotPanel.add("radiobutton", undefined, "왼쪽");
        var rightPivotRadio = pivotPanel.add("radiobutton", undefined, "오른쪽");
        leftPivotRadio.value = true;

        applySavedSettings();

        for (var i = 0; i < presetAngles.length; i++) {
            var presetButton = presetPanel.add("button", undefined, presetAngles[i] + "°");
            presetButton.onClick = makePresetHandler(presetAngles[i]);
        }

        var buttonRow = dlg.add("group");
        buttonRow.alignment = "right";
        var cancelButton = buttonRow.add("button", undefined, "취소", {name: "cancel"});
        // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = buttonRow.add("button", undefined, "확인");
        try { dlg.defaultElement = null; } catch (defaultError) {}

        okButton.onClick = function() {
            var parsed = parseAngle(angleInput.text);
            if (parsed === null) {
                alert("각도를 숫자로 입력해주세요.");
                angleInput.active = true;
                return;
            }
            result = {angle: parsed, pivotSide: getPivotSide()};
            saveSettings(result);
            dlg.close(1);
        };
        cancelButton.onClick = function() { dlg.close(0); };

        function makePresetHandler(value) {
            return function() {
                result = {angle: value, pivotSide: getPivotSide()};
                saveSettings(result);
                dlg.close(1);
            };
        }

        function getPivotSide() {
            return rightPivotRadio.value ? "right" : "left";
        }

        function saveSettings(settings) {
            var parts = ["v1", settings.angle, settings.pivotSide];
            try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
        }

        function applySavedSettings() {
            var raw = "";
            try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
            if (!raw) return;
            var p = raw.split("|");
            if (p[0] !== "v1" || p.length < 3) return;
            var savedAngle = parseAngle(p[1]);
            if (savedAngle !== null) angleInput.text = String(savedAngle);
            rightPivotRadio.value = (p[2] === "right");
            leftPivotRadio.value = !rightPivotRadio.value;
        }

        angleInput.active = true;
        return dlg.show() === 1 ? result : null;
    }

    function parseAngle(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function collectSelectedPoints(selection, points, ownerList) {
        if (!(selection instanceof Array)) return;
        for (var i = 0; i < selection.length; i++) {
            collectFromItem(selection[i], selection[i], points, ownerList);
        }
    }

    function collectFromItem(item, owner, points, ownerList) {
        if (item.locked || item.hidden) return;

        if (item.typename === "PathItem") {
            for (var i = 0; i < item.pathPoints.length; i++) {
                if (item.pathPoints[i].selected === PathPointSelection.ANCHORPOINT) {
                    points.push({point: item.pathPoints[i], owner: owner});
                    addUniqueOwner(ownerList, owner);
                }
            }
            return;
        }

        if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) {
                collectFromItem(item.pathItems[j], owner, points, ownerList);
            }
            return;
        }

        if (item.typename === "GroupItem") {
            for (var k = 0; k < item.pageItems.length; k++) {
                collectFromItem(item.pageItems[k], owner, points, ownerList);
            }
        }
    }

    function addUniqueOwner(ownersList, owner) {
        for (var i = 0; i < ownersList.length; i++) {
            if (ownersList[i] === owner) return;
        }
        ownersList.push(owner);
    }

    function rotateOwners(owners, selectedPoints, pivot, angleDegrees) {
        for (var i = 0; i < owners.length; i++) {
            var owner = owners[i];
            var marker = getOwnerMarker(owner, selectedPoints);
            var originalMarker = copyPoint(marker.point.anchor);
            var expectedMarker = rotatePoint(originalMarker, pivot, angleDegrees);

            owner.rotate(angleDegrees, true, true, true, true, Transformation.CENTER);

            var rotatedMarker = marker.point.anchor;
            owner.translate(
                expectedMarker[0] - rotatedMarker[0],
                expectedMarker[1] - rotatedMarker[1]
            );
        }
    }

    function getOwnerMarker(owner, points) {
        for (var i = 0; i < points.length; i++) {
            if (points[i].owner === owner) return points[i];
        }
        throw new Error("회전 기준 앵커를 찾을 수 없습니다.");
    }

    function getLeftAnchor(first, second) {
        return isLeftOf(first, second) ? first : second;
    }

    function getRightAnchor(first, second) {
        return isLeftOf(first, second) ? second : first;
    }

    function isLeftOf(candidate, other) {
        if (Math.abs(candidate[0] - other[0]) > 0.000001) return candidate[0] < other[0];
        return candidate[1] > other[1];
    }

    function normalizeLineAngle(angle) {
        angle %= 180;
        if (angle < 0) angle += 180;
        if (Math.abs(angle - 180) < 0.000001) return 0;
        return angle;
    }

    function getSignedHorizontalAngle(angle) {
        var normalized = normalizeLineAngle(angle);
        return normalized > 90 ? normalized - 180 : normalized;
    }

    function getLineAngle(first, second) {
        var radians = Math.atan2(second[1] - first[1], second[0] - first[0]);
        return normalizeLineAngle(radians * 180 / Math.PI);
    }

    function getShortestRotation(currentAngle, targetAngle) {
        var delta = normalizeLineAngle(targetAngle) - normalizeLineAngle(currentAngle);
        while (delta > 90) delta -= 180;
        while (delta < -90) delta += 180;
        return delta;
    }

    function rotatePoint(point, origin, angleDegrees) {
        var radians = angleDegrees * Math.PI / 180;
        var cosine = Math.cos(radians);
        var sine = Math.sin(radians);
        var x = point[0] - origin[0];
        var y = point[1] - origin[1];
        return [
            origin[0] + x * cosine - y * sine,
            origin[1] + x * sine + y * cosine
        ];
    }

    function copyPoint(point) {
        return [point[0], point[1]];
    }

    function pointsAreEqual(first, second) {
        return Math.abs(first[0] - second[0]) < 0.000001 &&
            Math.abs(first[1] - second[1]) < 0.000001;
    }

    function formatAngle(value) {
        var rounded = Math.round(value * 100) / 100;
        return String(rounded);
    }
})();
