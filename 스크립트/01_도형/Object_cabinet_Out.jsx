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
    var settings = loadSettings(0.5, 1);
    var previewItems = [];

    var choice = showDepthDialog(settings.depthMm, settings.direction, function(valueMm, dirX) {
        clearPreview();
        previewItems = createCabinets(valueMm * mmToPt, dirX, false);
        app.redraw();
    }, clearPreview);

    clearPreview();
    if (choice === null) {
        return;
    }

    saveSettings(choice.depthMm, choice.direction);
    createCabinets(choice.depthMm * mmToPt, choice.direction, true);
    doc.selection = null;

    function createCabinets(depth, dirX, makeGroup) {
        var created = [];
        for (var i = 0; i < targets.length; i++) {
            var items = createCabinet(targets[i], depth, dirX, makeGroup);
            for (var j = 0; j < items.length; j++) {
                created.push(items[j]);
            }
        }
        return created;
    }

    function createCabinet(frontFace, depth, dirX, makeGroup) {
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
        frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        var dx = depth * dirX;
        var sideX = dirX > 0 ? bounds[2] : bounds[0]; // 두께가 붙는 쪽 세로 모서리

        var sideFace = doc.pathItems.add();
        sideFace.setEntirePath([
            [sideX, bounds[1]],
            [sideX + dx, bounds[1] + depth],
            [sideX + dx, bounds[3] + depth],
            [sideX, bounds[3]]
        ]);
        sideFace.closed = true;
        copyStyle(frontFace, sideFace);

        var topFace = doc.pathItems.add();
        topFace.setEntirePath([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[1]],
            [bounds[2] + dx, bounds[1] + depth],
            [bounds[0] + dx, bounds[1] + depth]
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

    function getPathSelection(selection) {
        var items = [];
        for (var i = 0; selection && i < selection.length; i++) {
            if (selection[i].typename === "PathItem") {
                items.push(selection[i]);
            }
        }
        return items;
    }

    function showDepthDialog(defaultValue, defaultDirection, onPreview, onClearPreview) {
        var depthStepMm = 0.05;
        var minDepthMm = depthStepMm;
        var maxSliderDepthMm = 10;
        var isSyncingControl = false;
        var holdDelayMs = 400;
        var holdIntervalMs = 90;
        var holdMaxSteps = 400;
        var isHolding = false;
        var dialog = new Window("dialog", "캐비넷 깊이");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";

        var inputGroup = dialog.add("group");
        inputGroup.add("statictext", undefined, "뒤로 이동 거리(mm)");
        var minusButton = inputGroup.add("button", undefined, "-0.05");
        var input = inputGroup.add("edittext", undefined, String(defaultValue));
        input.characters = 8;
        var plusButton = inputGroup.add("button", undefined, "+0.05");

        var depthControl = dialog.add(
            "scrollbar",
            undefined,
            depthToStep(Math.min(maxSliderDepthMm, Math.max(minDepthMm, defaultValue))),
            depthToStep(minDepthMm),
            depthToStep(maxSliderDepthMm)
        );
        depthControl.preferredSize.width = 360;
        depthControl.stepdelta = 1;
        depthControl.jumpdelta = 10;

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

        function readDirection() {
            return rightRadio.value ? 1 : -1;
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

            onPreview(value, readDirection());
        }

        function stopHold() {
            isHolding = false;
        }

        // 버튼을 누르고 있으면 반복 증감한다. $.sleep 은 대기하는 동안 보류된
        // UI 이벤트를 처리하므로 루프 안에서도 mouseup/mouseout 이 들어와 반복을 멈춘다.
        function attachHoldRepeat(button, delta) {
            button.addEventListener("mousedown", function(event) {
                if (event && event.button !== undefined && event.button !== 0) {
                    return;
                }

                isHolding = true;
                changeValue(delta);

                var waited = 0;
                while (isHolding && waited < holdDelayMs) {
                    $.sleep(30);
                    waited += 30;
                }

                var steps = 0;
                while (isHolding && steps < holdMaxSteps) {
                    changeValue(delta);
                    steps++;
                    $.sleep(holdIntervalMs);
                }

                isHolding = false;
            });
            button.addEventListener("mouseup", stopHold);
            button.addEventListener("mouseout", stopHold);
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
        attachHoldRepeat(minusButton, -depthStepMm);
        attachHoldRepeat(plusButton, depthStepMm);
        dialog.addEventListener("mouseup", stopHold);
        rightRadio.onClick = updatePreview;
        leftRadio.onClick = updatePreview;
        previewCheck.onClick = updatePreview;
        okButton.onClick = function() {
            var value = readValue(true);
            if (value === null) {
                return;
            }
            result = {
                depthMm: parseFloat(formatDepth(value)),
                direction: readDirection()
            };
            dialog.close();
        };
        cancelButton.onClick = function() {
            result = null;
            dialog.close();
        };

        updatePreview();
        dialog.show();

        return result;
    }

    function loadSettings(fallbackDepthMm, fallbackDirection) {
        var loaded = {depthMm: fallbackDepthMm, direction: fallbackDirection};
        try {
            var parts = String(app.preferences.getStringPreference(PREF_KEY)).split("|");
            if (parts.length !== 3 || parts[0] !== "v1") {
                return loaded;
            }

            var depthMm = parseFloat(parts[1]);
            if (!isNaN(depthMm) && depthMm > 0) {
                loaded.depthMm = depthMm;
            }

            if (parts[2] === "1" || parts[2] === "-1") {
                loaded.direction = parseFloat(parts[2]);
            }
        } catch (e) {}
        return loaded;
    }

    function saveSettings(depthMm, direction) {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v1", depthMm, direction].join("|"));
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
