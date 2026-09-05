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
    var settings = loadSettings(0.5, 1, 45);
    var previewItems = [];

    var choice = showDepthDialog(settings.depthMm, settings.direction, settings.angleDeg, settings.cube, function(valueMm, dirX, angleDeg, cube) {
        clearPreview();
        previewItems = createCabinets(valueMm * mmToPt, dirX, angleDeg, cube, false);
        app.redraw();
    }, clearPreview);

    clearPreview();
    if (choice === null) {
        return;
    }

    saveSettings(choice.depthMm, choice.direction, choice.angleDeg, choice.cube);
    createCabinets(choice.depthMm * mmToPt, choice.direction, choice.angleDeg, choice.cube, true);
    doc.selection = null;

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

    function showDepthDialog(defaultValue, defaultDirection, defaultAngle, defaultCube, onPreview, onClearPreview) {
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

        var previewCheck = dialog.add("checkbox", undefined, "미리보기");
        previewCheck.value = true;

        var buttons = dialog.add("group");
        buttons.alignment = "right";
        // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = buttons.add("button", undefined, "확인");
        try { dialog.defaultElement = null; } catch (defaultError) {}
        var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

        var result = null;

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
                cube: cubeCheck.value
            };
            dialog.close();
        };
        cancelButton.onClick = function() {
            result = null;
            dialog.close();
        };

        cubeCheck.onClick();
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
