// Cabinet Projection Script for Adobe Illustrator (With Hidden Lines)
// 선택한 사각형을 캐비넷 투영법으로 입체화하고 숨은 선(파선) 추가

#include "Object_setdash_align_helper.jsxinc"
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


(function() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    var targets = getPathSelection(sel);
    if (targets.length === 0) {
        alert("사각형 패스를 선택해주세요.");
        return;
    }

    var mmToPt = 2.83464567;
    var hiddenDashPattern = [2, 1];
    var PREF_KEY = "ObjectCabinetInOut/settings";
    var POSITION_LIMIT_MM = 100;
    var OFFSET_STEP_MM = 0.1;
    var settings = loadSettings(0.5, 1, 45);
    var savedOffset = loadOffset();
    var offsetXmm = savedOffset[0];
    var offsetYmm = savedOffset[1];
    var previewItems = [];
    var hiddenGroups = [];
    var targetShiftXPt = 0;
    var targetShiftYPt = 0;
    var SIZE_MIN_MM = 0.5;
    var SIZE_MAX_MM = 100;    // 슬라이더 범위. 입력창으로는 더 큰 값도 된다
    var SIZE_STEP_MM = 0.1;

    // 사각형 크기는 다이얼로그에서 바꿀 수 있다. 취소하면 원래 앵커로 되돌린다
    var originalAnchors = snapshotAnchors(targets);
    var startSize = readSizeMm(targets[0]);

    // 미리보기에서는 원본 사각형까지 함께 옮겨야 최종 결과와 같은 위치가 보인다
    shiftTargets(offsetXmm * mmToPt, offsetYmm * mmToPt);

    var choice = showDepthDialog(settings.depthMm, settings.direction, settings.angleDeg, settings.cube, function(valueMm, dirX, angleDeg, cube) {
        clearPreview();
        previewItems = createCabinets(valueMm * mmToPt, dirX, angleDeg, cube, false);
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
    }, startSize.w, startSize.h, function(wMm, hMm) {
        // 원본 사각형을 중심 기준으로 다시 그린다. 미리보기는 호출한 쪽에서 다시 만든다
        resizeTargets(wMm * mmToPt, hMm * mmToPt);
    });

    clearPreview();
    restoreTargets();
    if (choice === null) {
        restoreAnchors(targets, originalAnchors);
        app.redraw();
        return;
    }

    saveSettings(choice.depthMm, choice.direction, choice.angleDeg, choice.cube);
    saveOffset(choice.offsetXmm, choice.offsetYmm);
    var createdItems = createCabinets(choice.depthMm * mmToPt, choice.direction, choice.angleDeg, choice.cube, true);
    moveItems(createdItems, choice.offsetXmm * mmToPt, choice.offsetYmm * mmToPt);
    alignHiddenDashes();
    doc.selection = null;

    // 파선을 모퉁이와 패스 끝에 맞춰 정렬(스트로크 패널의 두 번째 파선 옵션).
    // 액션을 거치는 느린 작업이라 미리보기에서는 생략하고 최종 생성에서만 실행한다.
    function alignHiddenDashes() {
        if (hiddenGroups.length === 0) {
            return;
        }

        applyDashPatternToItems(hiddenGroups, hiddenDashPattern, false);

        for (var i = 0; i < hiddenGroups.length; i++) {
            var paths = hiddenGroups[i].pathItems;
            for (var j = 0; j < paths.length; j++) {
                try {
                    paths[j].strokeJoin = StrokeJoin.ROUNDENDJOIN;
                } catch (e) {}
            }
        }
    }

    // 위치는 깊이 설정과 따로 기억한다(설정 문자열 형식을 건드리지 않는다)
    function loadOffset() {
        var loaded = [0, 0];
        try {
            var parts = String(app.preferences.getStringPreference("ObjectCabinetInOut_offsetMm")).split("|");
            var offX = parseFloat(parts[0]);
            var offY = parseFloat(parts[1]);
            if (!isNaN(offX) && Math.abs(offX) <= POSITION_LIMIT_MM) loaded[0] = offX;
            if (!isNaN(offY) && Math.abs(offY) <= POSITION_LIMIT_MM) loaded[1] = offY;
        } catch (e) {}
        return loaded;
    }

    function saveOffset(offXmm, offYmm) {
        try {
            app.preferences.setStringPreference("ObjectCabinetInOut_offsetMm",
                [offXmm, offYmm].join("|"));
        } catch (e) {}
    }

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

    function snapshotAnchors(items) {
        var all = [];
        for (var i = 0; i < items.length; i++) {
            var points = [];
            for (var j = 0; j < items[i].pathPoints.length; j++) {
                var a = items[i].pathPoints[j].anchor;
                points.push([a[0], a[1]]);
            }
            all.push(points);
        }
        return all;
    }

    function restoreAnchors(items, snapshot) {
        for (var i = 0; i < items.length; i++) {
            for (var j = 0; j < snapshot[i].length; j++) {
                try { setAnchor(items[i].pathPoints[j], snapshot[i][j]); } catch (e) {}
            }
        }
    }

    function setAnchor(point, xy) {
        point.anchor = xy;
        point.leftDirection = xy;
        point.rightDirection = xy;
    }

    function readSizeMm(item) {
        var b = item.geometricBounds;
        return {
            w: Math.round((b[2] - b[0]) / mmToPt * 10) / 10,
            h: Math.round((b[1] - b[3]) / mmToPt * 10) / 10
        };
    }

    // 각 사각형을 중심 고정으로 너비·높이에 맞춘다. 중심 왼쪽 점은 왼쪽 변, 오른쪽 점은 오른쪽 변으로
    function resizeTargets(widthPt, heightPt) {
        for (var i = 0; i < targets.length; i++) {
            var b = targets[i].geometricBounds;
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            var points = targets[i].pathPoints;
            for (var j = 0; j < points.length; j++) {
                var a = points[j].anchor;
                setAnchor(points[j], [
                    a[0] <= cx ? cx - widthPt / 2 : cx + widthPt / 2,
                    a[1] <= cy ? cy - heightPt / 2 : cy + heightPt / 2
                ]);
            }
        }
    }

    function moveItems(items, deltaX, deltaY) {
        if (!items || (deltaX === 0 && deltaY === 0)) return;
        for (var i = 0; i < items.length; i++) {
            try { items[i].translate(deltaX, deltaY); } catch (e) {}
        }
    }

    function createCabinets(depth, dirX, angleDeg, cube, makeGroup) {
        var created = [];
        hiddenGroups = [];
        for (var i = 0; i < targets.length; i++) {
            var items = createCabinet(targets[i], depth, dirX, angleDeg, cube, makeGroup);
            for (var j = 0; j < items.length; j++) {
                created.push(items[j]);
            }
        }
        return created;
    }

    function createCabinet(frontFace, depth, dirX, angleDeg, cube, makeGroup) {
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
        if (cube) {
            // 캐비넷 투영은 깊이를 실제의 절반으로 그린다 → 윗면이 정사각형인 육면체
            depth = (bounds[2] - bounds[0]) / 2;
        }
        frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        var offset = cabinetOffset(depth, angleDeg, dirX);
        var dx = offset.dx;
        var dy = offset.dy;
        var sideX = dirX > 0 ? bounds[2] : bounds[0]; // 두께가 붙는 쪽 세로 모서리

        var sideFace = doc.pathItems.add();
        sideFace.setEntirePath([
            [sideX, bounds[1]],
            [sideX + dx, bounds[1] + dy],
            [sideX + dx, bounds[3] + dy],
            [sideX, bounds[3]]
        ]);
        sideFace.closed = true;
        copyStyle(frontFace, sideFace);

        var topFace = doc.pathItems.add();
        topFace.setEntirePath([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[1]],
            [bounds[2] + dx, bounds[1] + dy],
            [bounds[0] + dx, bounds[1] + dy]
        ]);
        topFace.closed = true;
        copyStyle(frontFace, topFace);

        sideFace.move(frontFace, ElementPlacement.PLACEBEFORE);
        topFace.move(frontFace, ElementPlacement.PLACEBEFORE);

        var hiddenGroup = makeHiddenLines(frontFace, bounds, dx, dy);
        hiddenGroup.zOrder(ZOrderMethod.SENDTOBACK);

        if (makeGroup) {
            var cabinetGroup = groupCabinetItems(frontFace, [hiddenGroup, sideFace, topFace]);
            // 그룹으로 옮기는 과정에서 순서가 바뀌므로, 그룹 안에서 숨은 선을 다시 맨 뒤로 보낸다
            hiddenGroup.zOrder(ZOrderMethod.SENDTOBACK);
            return [cabinetGroup];
        }

        return [sideFace, topFace, hiddenGroup];
    }

    function groupCabinetItems(frontFace, createdItems) {
        var cabinetGroup = doc.activeLayer.groupItems.add();
        cabinetGroup.name = "Cabinet Projection";
        try {
            cabinetGroup.move(frontFace, ElementPlacement.PLACEBEFORE);
        } catch (e) {}

        for (var i = 0; i < createdItems.length; i++) {
            createdItems[i].move(cabinetGroup, ElementPlacement.PLACEATEND);
        }
        frontFace.move(cabinetGroup, ElementPlacement.PLACEATEND);
        try {
            frontFace.zOrder(ZOrderMethod.BRINGTOFRONT);
        } catch (e) {}

        return cabinetGroup;
    }

    function makeHiddenLines(frontFace, bounds, dx, dy) {
        var hiddenX = dx > 0 ? bounds[0] : bounds[2]; // 앞면에 가려지는 쪽 세로 모서리
        var otherX = dx > 0 ? bounds[2] : bounds[0];
        var hiddenGroup = doc.activeLayer.groupItems.add();
        hiddenGroup.name = "Hidden Lines";

        var backL = hiddenGroup.pathItems.add();
        backL.setEntirePath([
            [hiddenX + dx, bounds[1] + dy],
            [hiddenX + dx, bounds[3] + dy],
            [otherX + dx, bounds[3] + dy]
        ]);

        var backDiag = hiddenGroup.pathItems.add();
        backDiag.setEntirePath([
            [hiddenX, bounds[3]],
            [hiddenX + dx, bounds[3] + dy]
        ]);

        var k60Color = makeK60Color();
        for (var i = 0; i < hiddenGroup.pathItems.length; i++) {
            var p = hiddenGroup.pathItems[i];
            p.filled = false;
            p.stroked = true;
            p.strokeWidth = frontFace.strokeWidth;
            p.strokeColor = k60Color;
            p.strokeDashes = hiddenDashPattern;
            p.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        }

        hiddenGroups.push(hiddenGroup);
        return hiddenGroup;
    }

    // 사선 길이 depth 를 각도 angleDeg 로 분해한다 (45° 이면 dx = dy = depth/√2)
    function cabinetOffset(depth, angleDeg, dirX) {
        var rad = angleDeg * Math.PI / 180;
        return {dx: depth * Math.cos(rad) * dirX, dy: depth * Math.sin(rad)};
    }

    function getPathSelection(selection) {
        var items = [];
        for (var i = 0; selection && i < selection.length; i++) {
            if (selection[i].typename === "PathItem") {
                items.push(selection[i]);
            }
        }
        return items;
    }

    function showDepthDialog(defaultValue, defaultDirection, defaultAngle, defaultCube, onPreview, onClearPreview,
            startXmm, startYmm, onOffsetChange, startWmm, startHmm, onSizeChange) {
        var depthStepMm = 0.05;
        var bigStepMm = 1;
        var minDepthMm = depthStepMm;
        var maxSliderDepthMm = 50;
        var minAngleDeg = 5;
        var maxAngleDeg = 85;
        var isSyncingControl = false;
        var dialog = new Window("dialog", "캐비넷 깊이");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";

        // 사각형 크기: 선택한 사각형 자체의 너비·높이 (중심 고정)
        var sizePanel = dialog.add("panel", undefined, "사각형 크기");
        sizePanel.orientation = "column";
        sizePanel.alignChildren = "left";
        var widthMmValue = startWmm;
        var heightMmValue = startHmm;
        var widthControls = addMmRow(sizePanel, "너비", widthMmValue, SIZE_MIN_MM, SIZE_MAX_MM);
        var heightControls = addMmRow(sizePanel, "높이", heightMmValue, SIZE_MIN_MM, SIZE_MAX_MM);
        bindSizeControls(widthControls, true);
        bindSizeControls(heightControls, false);

        var inputGroup = dialog.add("group");
        inputGroup.add("statictext", undefined, "뒤로 이동 거리(mm)");
        var bigMinusButton = inputGroup.add("button", undefined, "-1");
        var minusButton = inputGroup.add("button", undefined, "-0.05");
        var input = inputGroup.add("edittext", undefined, String(defaultValue));
        input.characters = 5;
        var plusButton = inputGroup.add("button", undefined, "+0.05");
        var bigPlusButton = inputGroup.add("button", undefined, "+1");
        var stepButtons = [bigMinusButton, minusButton, plusButton, bigPlusButton];
        for (var b = 0; b < stepButtons.length; b++) {
            stepButtons[b].preferredSize.width = 50;
        }
        var hint = dialog.add("statictext", undefined, "키보드 ↑↓ 키를 누르고 있으면 연속 증감(Shift 는 1mm씩)");
        hint.alignment = "left";

        var depthControl = dialog.add(
            "scrollbar",
            undefined,
            depthToStep(Math.min(maxSliderDepthMm, Math.max(minDepthMm, defaultValue))),
            depthToStep(minDepthMm),
            depthToStep(maxSliderDepthMm)
        );
        depthControl.stepdelta = 1;
        depthControl.jumpdelta = 10;

        var angleGroup = dialog.add("group");
        angleGroup.add("statictext", undefined, "사선 각도(°)");
        var angleInput = angleGroup.add("edittext", undefined, String(defaultAngle));
        angleInput.characters = 5;
        var angleControl = angleGroup.add("scrollbar", undefined, defaultAngle, minAngleDeg, maxAngleDeg);
        angleControl.alignment = ["fill", "center"];
        angleControl.stepdelta = 1;
        angleControl.jumpdelta = 5;

        var cubeCheck = dialog.add("checkbox", undefined, "정육면체 (깊이 = 가로 폭 ÷ 2, 거리 입력 무시)");
        cubeCheck.value = defaultCube;

        var directionPanel = dialog.add("panel", undefined, "두께 방향");
        directionPanel.orientation = "row";
        directionPanel.alignChildren = "left";
        var rightRadio = directionPanel.add("radiobutton", undefined, "우측 위");
        var leftRadio = directionPanel.add("radiobutton", undefined, "좌측 위");
        rightRadio.value = defaultDirection > 0;
        leftRadio.value = !rightRadio.value;

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
        // mm 행: 라벨(단위) | 입력칸 | 스크롤바
        function addMmRow(parent, label, value, minMm, maxMm) {
            var row = parent.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, label + " (mm):").preferredSize.width = 70;
            var mmInput = row.add("edittext", undefined, formatOffset(value));
            mmInput.characters = 6;
            var slider = row.add("scrollbar", undefined, Math.max(minMm, Math.min(maxMm, value)), minMm, maxMm);
            slider.stepdelta = OFFSET_STEP_MM;
            slider.jumpdelta = OFFSET_STEP_MM * 10;
            slider.preferredSize.width = 196;
            return {input: mmInput, slider: slider};
        }

        function addOffsetControls(parent, label, value) {
            return addMmRow(parent, label, value, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        }

        // 크기가 바뀌면 원본 사각형을 다시 그리고 미리보기를 새로 만든다
        function bindSizeControls(controls, isWidth) {
            function current() { return isWidth ? widthMmValue : heightMmValue; }
            function commit(value) {
                if (value === null || isNaN(value)) return;
                value = Math.max(SIZE_STEP_MM, Math.round(value / SIZE_STEP_MM) * SIZE_STEP_MM);
                if (value === current()) return;
                // 정육면체면 앞면이 정사각형이어야 하므로 너비·높이를 같이 움직인다
                if (cubeCheck.value) setSizeValues(value, value);
                else if (isWidth) setSizeValues(value, heightMmValue);
                else setSizeValues(widthMmValue, value);
                onSizeChange(widthMmValue, heightMmValue);
                updatePreview();
            }
            controls.slider.onChanging = function() { commit(controls.slider.value); };
            controls.slider.onChange = function() { commit(controls.slider.value); };
            controls.input.onChange = function() {
                var value = parseFloat(String(controls.input.text).replace(",", "."));
                commit(isNaN(value) ? current() : value);
            };
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

        function setSizeValues(wMm, hMm) {
            widthMmValue = wMm;
            heightMmValue = hMm;
            widthControls.input.text = formatOffset(wMm);
            heightControls.input.text = formatOffset(hMm);
            try { widthControls.slider.value = Math.max(SIZE_MIN_MM, Math.min(SIZE_MAX_MM, wMm)); } catch (e) {}
            try { heightControls.slider.value = Math.max(SIZE_MIN_MM, Math.min(SIZE_MAX_MM, hMm)); } catch (e2) {}
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

        function changeValue(delta) {
            var value = readValue(false);
            if (value === null) {
                value = defaultValue;
            }

            setDepthValue(value + delta);
        }

        function readAngle(showAlert) {
            var value = parseFloat(String(angleInput.text).replace(",", "."));
            if (isNaN(value) || value < minAngleDeg || value > maxAngleDeg) {
                if (showAlert) {
                    alert("각도는 " + minAngleDeg + "~" + maxAngleDeg + " 사이 숫자를 입력해주세요.");
                }
                return null;
            }
            return Math.round(value);
        }

        function readDirection() {
            return rightRadio.value ? 1 : -1;
        }

        function updatePreview() {
            if (!previewCheck.value) {
                onClearPreview();
                return;
            }

            var value = cubeCheck.value ? 0 : readValue(false);
            var angle = readAngle(false);
            if (value === null || angle === null) {
                onClearPreview();
                return;
            }

            onPreview(value, readDirection(), angle, cubeCheck.value);
        }

        input.onChanging = updatePreview;
        angleInput.onChanging = function() {
            var angle = readAngle(false);
            if (angle !== null) {
                angleControl.value = angle;
            }
            updatePreview();
        };
        angleControl.onChanging = function() {
            angleInput.text = String(Math.round(angleControl.value));
            updatePreview();
        };
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
        minusButton.onClick = function() {
            changeValue(-depthStepMm);
        };
        plusButton.onClick = function() {
            changeValue(depthStepMm);
        };
        bigMinusButton.onClick = function() {
            changeValue(-bigStepMm);
        };
        bigPlusButton.onClick = function() {
            changeValue(bigStepMm);
        };
        // ScriptUI 는 스크립트가 도는 동안 이벤트를 전달하지 않아 버튼을 누르고 있는
        // 동안 반복시킬 수 없다(누르고 있는지를 알 방법이 없다).
        // 대신 ↑/↓ 키는 OS 키 반복이 keydown 을 계속 보내주므로 연속 증감이 된다.
        // 입력칸이 방향키를 먼저 소비하지 않도록 창에서 캐포처 단계로 받는다.
        dialog.addEventListener("keydown", function(event) {
            var step = event.shiftKey ? bigStepMm : depthStepMm;
            var delta = 0;
            if (event.keyName === "Up") {
                delta = step;
            } else if (event.keyName === "Down") {
                delta = -step;
            } else {
                return;
            }

            try { event.preventDefault(); } catch (preventError) {}
            changeValue(delta);
        }, true);
        rightRadio.onClick = updatePreview;
        leftRadio.onClick = updatePreview;
        previewCheck.onClick = updatePreview;
        cubeCheck.onClick = function() {
            var manual = !cubeCheck.value;
            input.enabled = manual;
            depthControl.enabled = manual;
            for (var i = 0; i < stepButtons.length; i++) {
                stepButtons[i].enabled = manual;
            }
            // 정육면체: 앞면이 정사각형이 되도록 너비·높이를 평균값으로 맞춘다
            if (cubeCheck.value && widthMmValue !== heightMmValue) {
                var side = Math.round((widthMmValue + heightMmValue) / 2 / SIZE_STEP_MM) * SIZE_STEP_MM;
                setSizeValues(side, side);
                onSizeChange(side, side);
            }
            updatePreview();
        };
        okButton.onClick = function() {
            var value = readValue(!cubeCheck.value);
            if (value === null) {
                if (!cubeCheck.value) {
                    return;
                }
                value = defaultValue;
            }
            var angle = readAngle(true);
            if (angle === null) {
                return;
            }
            result = {
                depthMm: parseFloat(formatDepth(value)),
                direction: readDirection(),
                angleDeg: angle,
                cube: cubeCheck.value,
                offsetXmm: offsetXmmValue,
                offsetYmm: offsetYmmValue
            };
            dialog.close();
        };
        cancelButton.onClick = function() {
            result = null;
            dialog.close();
        };

        cubeCheck.onClick();
        if (typeof bindTabOrder === "function") bindTabOrder(dialog);
        dialog.show();

        return result;
    }

    function loadSettings(fallbackDepthMm, fallbackDirection, fallbackAngleDeg) {
        var loaded = {depthMm: fallbackDepthMm, direction: fallbackDirection, angleDeg: fallbackAngleDeg, cube: false};
        try {
            var parts = String(app.preferences.getStringPreference(PREF_KEY)).split("|");
            if (parts.length < 3 || (parts[0] !== "v1" && parts[0] !== "v2")) {
                return loaded;
            }

            var depthMm = parseFloat(parts[1]);
            if (!isNaN(depthMm) && depthMm > 0) {
                loaded.depthMm = depthMm;
            }

            if (parts[2] === "1" || parts[2] === "-1") {
                loaded.direction = parseFloat(parts[2]);
            }

            var angleDeg = parseFloat(parts[3]);
            if (!isNaN(angleDeg) && angleDeg >= 5 && angleDeg <= 85) {
                loaded.angleDeg = angleDeg;
            }

            loaded.cube = parts[4] === "1";
        } catch (e) {}
        return loaded;
    }

    function saveSettings(depthMm, direction, angleDeg, cube) {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v2", depthMm, direction, angleDeg, cube ? 1 : 0].join("|"));
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

    function makeK60Color() {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = 60;
        } else {
            color = new RGBColor();
            color.red = 102;
            color.green = 102;
            color.blue = 102;
        }
        return color;
    }

    function copyStyle(source, target) {
        target.filled = source.filled;
        if (source.filled) {
            target.fillColor = source.fillColor;
        }

        target.stroked = source.stroked;
        if (source.stroked) {
            target.strokeColor = source.strokeColor;
            target.strokeWidth = source.strokeWidth;
            target.strokeDashes = source.strokeDashes;
            target.strokeCap = source.strokeCap;
            target.strokeJoin = StrokeJoin.ROUNDENDJOIN;
            target.opacity = source.opacity;
        }
    }
})();
