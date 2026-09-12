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

// Button Projection Script for Adobe Illustrator
// 선택한 원/타원을 뒤쪽으로 복제하고 접선 라인을 추가해 버튼처럼 입체화

(function() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    var targets = getClosedPathSelection(sel);
    if (targets.length === 0) {
        alert("원 또는 타원 패스를 선택해주세요.");
        return;
    }

    var bounds = targets[0].geometricBounds; // [left, top, right, bottom]
    var width = bounds[2] - bounds[0];
    var height = bounds[1] - bounds[3];
    var mmToPt = 2.83464567;
    var defaultDepthMm = getSavedDepth(Math.round(Math.min(width, height) / 5 / mmToPt * 100) / 100);
    var POSITION_LIMIT_MM = 100;
    var OFFSET_STEP_MM = 0.1;
    var savedOffset = getSavedOffset();
    var offsetXmm = savedOffset[0];
    var offsetYmm = savedOffset[1];
    var previewItems = [];
    var targetShiftXPt = 0;
    var targetShiftYPt = 0;

    // 미리보기에서는 원본 원까지 함께 옮겨야 최종 결과와 같은 위치가 보인다
    shiftTargets(offsetXmm * mmToPt, offsetYmm * mmToPt);

    var depthMm = showDepthDialog(defaultDepthMm, function(valueMm) {
        clearPreview();
        previewItems = createButtons(valueMm * mmToPt, false);
        app.redraw();
    }, clearPreview, offsetXmm, offsetYmm, function(nextXmm, nextYmm) {
        // 위치는 도형을 다시 만들지 않고 미리보기만 옮긴다
        var dx = (nextXmm - offsetXmm) * mmToPt;
        var dy = (nextYmm - offsetYmm) * mmToPt;
        offsetXmm = nextXmm;
        offsetYmm = nextYmm;
        shiftTargets(dx, dy);
        moveItems(previewItems, dx, dy);
        app.redraw();
    });

    clearPreview();
    restoreTargets();
    if (depthMm === null) {
        app.redraw();
        return;
    }

    saveDepth(depthMm);
    saveOffset(offsetXmm, offsetYmm);
    var createdItems = createButtons(depthMm * mmToPt, true);
    moveItems(createdItems, offsetXmm * mmToPt, offsetYmm * mmToPt);
    doc.selection = null;

    function shiftTargets(deltaX, deltaY) {
        moveItems(targets, deltaX, deltaY);
        targetShiftXPt += deltaX;
        targetShiftYPt += deltaY;
    }

    function restoreTargets() {
        moveItems(targets, -targetShiftXPt, -targetShiftYPt);
        targetShiftXPt = 0;
        targetShiftYPt = 0;
    }

    function moveItems(items, deltaX, deltaY) {
        if (!items || (deltaX === 0 && deltaY === 0)) return;
        for (var i = 0; i < items.length; i++) {
            try { items[i].translate(deltaX, deltaY); } catch (e) {}
        }
    }

    function createButtons(depth, makeGroup) {
        var created = [];
        for (var i = 0; i < targets.length; i++) {
            var items = createButton(targets[i], depth, makeGroup);
            for (var j = 0; j < items.length; j++) {
                created.push(items[j]);
            }
        }
        return created;
    }

    function createButton(frontFace, depth, makeGroup) {
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
        frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        var body = makeButtonBody(frontFace, bounds, depth, depth);
        body.move(frontFace, ElementPlacement.PLACEAFTER);

        if (makeGroup) {
            return [groupButtonItems(frontFace, [body])];
        }

        return [body];
    }

    // 앞면 원 + 뒷면 원의 외곽선만 남긴 원기둥 실루엣.
    // 뒷면의 가려지는 반원을 빼고 [뒤쪽 반원호 → 접선 → 앞쪽 반원호 → 접선]을 닫힌 패스 하나로 만든다.
    function makeButtonBody(frontFace, itemBounds, dx, dy) {
        var cx = (itemBounds[0] + itemBounds[2]) / 2;
        var cy = (itemBounds[1] + itemBounds[3]) / 2;
        var rx = (itemBounds[2] - itemBounds[0]) / 2;
        var ry = (itemBounds[1] - itemBounds[3]) / 2;

        // 접점: 이동 방향과 나란한 접선이 원에 닿는 두 지점(매개변수 각도)
        var startAngle = Math.atan2(-ry * dx, rx * dy);
        // 뒷면에서 그릴 반원이 이동 방향(바깥쪽)으로 부풀도록 시작 각도를 고른다
        if ((rx * Math.cos(startAngle + (Math.PI / 2)) * dx) + (ry * Math.sin(startAngle + (Math.PI / 2)) * dy) < 0) {
            startAngle += Math.PI;
        }

        var body = frontFace.duplicate();
        body.name = "ButtonDepthOut";
        body.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        var originalPointCount = body.pathPoints.length;
        var quarter = Math.PI / 2;
        var handleScale = (4 / 3) * Math.tan(quarter / 4);

        // 뒤쪽 반원(0~2) → 앞쪽 반원(3~5). 0-5, 2-3 구간이 접선이 된다.
        for (var i = 0; i < 6; i++) {
            var isBack = i < 3;
            var t = startAngle + (quarter * (isBack ? i : i - 1));
            var ox = isBack ? dx : 0;
            var oy = isBack ? dy : 0;
            var anchorX = cx + ox + (rx * Math.cos(t));
            var anchorY = cy + oy + (ry * Math.sin(t));
            var handleX = -rx * Math.sin(t) * handleScale;
            var handleY = ry * Math.cos(t) * handleScale;
            var isArcStart = (i === 0 || i === 3);
            var isArcEnd = (i === 2 || i === 5);

            var point = body.pathPoints.add();
            point.anchor = [anchorX, anchorY];
            point.leftDirection = isArcStart
                ? [anchorX, anchorY]
                : [anchorX - handleX, anchorY - handleY];
            point.rightDirection = isArcEnd
                ? [anchorX, anchorY]
                : [anchorX + handleX, anchorY + handleY];
            point.pointType = (isArcStart || isArcEnd) ? PointType.CORNER : PointType.SMOOTH;
        }

        for (var j = 0; j < originalPointCount; j++) {
            body.pathPoints[0].remove();
        }

        body.closed = true;
        return body;
    }

    function groupButtonItems(frontFace, createdItems) {
        var buttonGroup = doc.activeLayer.groupItems.add();
        buttonGroup.name = "Button Projection";
        try {
            buttonGroup.move(frontFace, ElementPlacement.PLACEBEFORE);
        } catch (e) {}

        for (var i = 0; i < createdItems.length; i++) {
            createdItems[i].move(buttonGroup, ElementPlacement.PLACEATEND);
        }
        frontFace.move(buttonGroup, ElementPlacement.PLACEATEND);
        try {
            frontFace.zOrder(ZOrderMethod.BRINGTOFRONT);
        } catch (e) {}

        return buttonGroup;
    }

    function showDepthDialog(defaultValue, onPreview, onClearPreview,
            startXmm, startYmm, onOffsetChange) {
        var depthStepMm = 0.05;
        var minDepthMm = depthStepMm;
        var maxSliderDepthMm = 10;
        var isSyncingControl = false;
        var dialog = new Window("dialog", "버튼 깊이");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";

        var inputGroup = dialog.add("group");
        inputGroup.add("statictext", undefined, "뒤로 이동 거리(mm)");
        var input = inputGroup.add("edittext", undefined, String(defaultValue));
        input.characters = 8;

        var depthControl = dialog.add(
            "scrollbar",
            undefined,
            depthToStep(Math.min(maxSliderDepthMm, Math.max(minDepthMm, defaultValue))),
            depthToStep(minDepthMm),
            depthToStep(maxSliderDepthMm)
        );
        depthControl.preferredSize.width = 252;
        depthControl.stepdelta = 1;
        depthControl.jumpdelta = 10;

        var positionPanel = dialog.add("panel", undefined, "위치");
        positionPanel.orientation = "column";
        positionPanel.alignChildren = "left";
        var offsetXmmValue = startXmm;
        var offsetYmmValue = startYmm;
        var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmmValue);
        var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmmValue);
        bindOffsetControls(offsetXControls, true);
        bindOffsetControls(offsetYControls, false);

        var previewCheck = dialog.add("checkbox", undefined, "미리보기");
        previewCheck.value = true;

        var buttons = dialog.add("group");
        buttons.alignment = "right";
        // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = buttons.add("button", undefined, "확인");
        try { dialog.defaultElement = null; } catch (defaultError) {}
        var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

        var result = null;

        // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
        // 위치 행: 라벨 · 입력칸 · 단위 · 화살표 버튼 · 슬라이더
        function addOffsetControls(parent, label, value) {
            var row = parent.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, label + " (mm):").preferredSize.width = 70;
            var offsetInput = row.add("edittext", undefined, formatOffset(value));
            offsetInput.characters = 6;
            var slider = row.add("scrollbar", undefined, value,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            slider.stepdelta = OFFSET_STEP_MM;
            slider.jumpdelta = OFFSET_STEP_MM * 10;
            slider.preferredSize.width = 196;
            return {input: offsetInput, slider: slider};
        }

        // 값이 바뀌면 도형을 다시 만들지 않고 미리보기만 옮긴다
        function bindOffsetControls(controls, isX) {
            function current() { return isX ? offsetXmmValue : offsetYmmValue; }
            function commit(value) {
                if (value === null || isNaN(value)) return;
                value = Math.round(value / OFFSET_STEP_MM) * OFFSET_STEP_MM;
                if (value < -POSITION_LIMIT_MM) value = -POSITION_LIMIT_MM;
                if (value > POSITION_LIMIT_MM) value = POSITION_LIMIT_MM;
                if (value === current()) return;
                if (isX) offsetXmmValue = value;
                else offsetYmmValue = value;
                controls.input.text = formatOffset(value);
                try { controls.slider.value = value; } catch (e) {}
                onOffsetChange(offsetXmmValue, offsetYmmValue);
            }
            controls.slider.onChanging = function() { commit(controls.slider.value); };
            controls.slider.onChange = function() { commit(controls.slider.value); };
            controls.input.onChange = function() {
                var value = parseFloat(String(controls.input.text).replace(",", "."));
                commit(isNaN(value) ? current() : value);
            };
        }

        function formatOffset(value) {
            return String(Math.round(value * 10) / 10);
        }

        function formatDepth(value) {
            value = Math.round(value / depthStepMm) * depthStepMm;
            value = Math.max(depthStepMm, value);
            return value.toFixed(2);
        }

        function depthToStep(value) {
            return Math.round(value / depthStepMm);
        }

        function stepToDepth(step) {
            return step * depthStepMm;
        }

        function syncDepthControl(value) {
            if (isSyncingControl || value === null) {
                return;
            }

            var step = depthToStep(value);
            step = Math.max(depthToStep(minDepthMm), Math.min(depthToStep(maxSliderDepthMm), step));
            isSyncingControl = true;
            depthControl.value = step;
            isSyncingControl = false;
        }

        function readValue(showAlert) {
            var value = parseFloat(String(input.text).replace(",", "."));
            if (isNaN(value) || value <= 0) {
                if (showAlert) {
                    alert("0보다 큰 숫자를 입력해주세요.");
                }
                return null;
            }
            return value;
        }

        function setDepthValue(value) {
            input.text = formatDepth(value);
            syncDepthControl(value);
            updatePreview();
        }

        function updatePreview() {
            if (!previewCheck.value) {
                onClearPreview();
                return;
            }

            var value = readValue(false);
            if (value === null) {
                onClearPreview();
                return;
            }

            onPreview(value);
        }

        input.onChanging = updatePreview;
        input.onChange = function() {
            var value = readValue(false);
            syncDepthControl(value);
        };
        depthControl.onChanging = function() {
            if (isSyncingControl) {
                return;
            }

            setDepthValue(stepToDepth(depthControl.value));
        };
        previewCheck.onClick = updatePreview;
        okButton.onClick = function() {
            var value = readValue(true);
            if (value === null) {
                return;
            }
            result = parseFloat(formatDepth(value));
            dialog.close();
        };
        cancelButton.onClick = function() {
            result = null;
            dialog.close();
        };

        updatePreview();
        if (typeof bindTabOrder === "function") bindTabOrder(dialog);
        dialog.show();

        return result;
    }

    function getSavedDepth(fallbackValue) {
        try {
            var saved = parseFloat(app.preferences.getStringPreference("ObjectButtonOut_depthMm"));
            if (!isNaN(saved) && saved > 0) {
                return saved;
            }
        } catch (e) {}
        return fallbackValue;
    }

    function getSavedOffset() {
        var loaded = [0, 0];
        try {
            var parts = String(app.preferences.getStringPreference("ObjectButtonOut_offsetMm")).split("|");
            var offX = parseFloat(parts[0]);
            var offY = parseFloat(parts[1]);
            if (!isNaN(offX) && Math.abs(offX) <= POSITION_LIMIT_MM) loaded[0] = offX;
            if (!isNaN(offY) && Math.abs(offY) <= POSITION_LIMIT_MM) loaded[1] = offY;
        } catch (e) {}
        return loaded;
    }

    function saveOffset(offXmm, offYmm) {
        try {
            app.preferences.setStringPreference("ObjectButtonOut_offsetMm",
                [offXmm, offYmm].join("|"));
        } catch (e) {}
    }

    function saveDepth(value) {
        try {
            app.preferences.setStringPreference("ObjectButtonOut_depthMm", String(value));
        } catch (e) {}
    }

    function clearPreview() {
        for (var i = previewItems.length - 1; i >= 0; i--) {
            try {
                previewItems[i].remove();
            } catch (e) {}
        }
        previewItems = [];
    }

    function getClosedPathSelection(selection) {
        var items = [];
        for (var i = 0; selection && i < selection.length; i++) {
            if (selection[i].typename === "PathItem" && selection[i].closed) {
                items.push(selection[i]);
            }
        }
        return items;
    }
})();
