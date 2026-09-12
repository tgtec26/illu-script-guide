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

// Cabinet Projection Script for Adobe Illustrator
// 선택한 사각형을 캐비넷 투영법으로 입체화

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
    var PREF_KEY = "ObjectCabinetOut/settings";
    var POSITION_LIMIT_MM = 100;
    var OFFSET_STEP_MM = 0.1;
    var settings = loadSettings(0.5, 1, 45);
    var savedOffset = loadOffset();
    var offsetXmm = savedOffset[0];
    var offsetYmm = savedOffset[1];
    var previewItems = [];
    var targetShiftXPt = 0;
    var targetShiftYPt = 0;

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
    });

    clearPreview();
    restoreTargets();
    if (choice === null) {
        app.redraw();
        return;
    }

    saveSettings(choice.depthMm, choice.direction, choice.angleDeg, choice.cube);
    saveOffset(choice.offsetXmm, choice.offsetYmm);
    var createdItems = createCabinets(choice.depthMm * mmToPt, choice.direction, choice.angleDeg, choice.cube, true);
    moveItems(createdItems, choice.offsetXmm * mmToPt, choice.offsetYmm * mmToPt);
    doc.selection = null;

    // 위치는 깊이 설정과 따로 기억한다(설정 문자열 형식을 건드리지 않는다)
    function loadOffset() {
        var loaded = [0, 0];
        try {
            var parts = String(app.preferences.getStringPreference("ObjectCabinetOut_offsetMm")).split("|");
            var offX = parseFloat(parts[0]);
            var offY = parseFloat(parts[1]);
            if (!isNaN(offX) && Math.abs(offX) <= POSITION_LIMIT_MM) loaded[0] = offX;
            if (!isNaN(offY) && Math.abs(offY) <= POSITION_LIMIT_MM) loaded[1] = offY;
        } catch (e) {}
        return loaded;
    }

    function saveOffset(offXmm, offYmm) {
        try {
            app.preferences.setStringPreference("ObjectCabinetOut_offsetMm",
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

    function moveItems(items, deltaX, deltaY) {
        if (!items || (deltaX === 0 && deltaY === 0)) return;
        for (var i = 0; i < items.length; i++) {
            try { items[i].translate(deltaX, deltaY); } catch (e) {}
        }
    }

    function createCabinets(depth, dirX, angleDeg, cube, makeGroup) {
        var created = [];
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

        if (makeGroup) {
            return [groupCabinetItems(frontFace, [sideFace, topFace])];
        }

        return [sideFace, topFace];
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
            startXmm, startYmm, onOffsetChange) {
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
