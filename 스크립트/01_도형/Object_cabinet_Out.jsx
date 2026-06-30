// Cabinet Projection Script for Adobe Illustrator
// 선택한 사각형을 캐비넷 투영법으로 입체화

(function() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0 || sel[0].typename !== "PathItem") {
        alert("사각형 패스를 선택해주세요.");
        return;
    }

    var frontFace = sel[0];
    var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
    var mmToPt = 2.83464567;
    var defaultDepthMm = getSavedDepth(0.5);
    var previewItems = [];

    var depthMm = showDepthDialog(defaultDepthMm, function(valueMm) {
        clearPreview();
        previewItems = createCabinet(valueMm * mmToPt);
        app.redraw();
    }, clearPreview);

    clearPreview();
    if (depthMm === null) {
        return;
    }

    saveDepth(depthMm);
    createCabinet(depthMm * mmToPt, true);
    doc.selection = null;

    function createCabinet(depth, makeGroup) {
        frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        var rightFace = doc.pathItems.add();
        rightFace.setEntirePath([
            [bounds[2], bounds[1]],
            [bounds[2] + depth, bounds[1] + depth],
            [bounds[2] + depth, bounds[3] + depth],
            [bounds[2], bounds[3]]
        ]);
        rightFace.closed = true;
        copyStyle(frontFace, rightFace);

        var topFace = doc.pathItems.add();
        topFace.setEntirePath([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[1]],
            [bounds[2] + depth, bounds[1] + depth],
            [bounds[0] + depth, bounds[1] + depth]
        ]);
        topFace.closed = true;
        copyStyle(frontFace, topFace);

        rightFace.move(frontFace, ElementPlacement.PLACEBEFORE);
        topFace.move(frontFace, ElementPlacement.PLACEBEFORE);

        if (makeGroup) {
            return [groupCabinetItems([rightFace, topFace])];
        }

        return [rightFace, topFace];
    }

    function groupCabinetItems(createdItems) {
        var cabinetGroup = doc.activeLayer.groupItems.add();
        cabinetGroup.name = "Cabinet Projection";
        try {
            cabinetGroup.move(frontFace, ElementPlacement.PLACEBEFORE);
        } catch (e) {}

        for (var i = 0; i < createdItems.length; i++) {
            createdItems[i].move(cabinetGroup, ElementPlacement.PLACEATEND);
        }
        frontFace.move(cabinetGroup, ElementPlacement.PLACEATEND);

        return cabinetGroup;
    }

    function showDepthDialog(defaultValue, onPreview, onClearPreview) {
        var depthStepMm = 0.05;
        var minDepthMm = depthStepMm;
        var maxSliderDepthMm = 10;
        var isSyncingControl = false;
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

        var previewCheck = dialog.add("checkbox", undefined, "미리보기");
        previewCheck.value = true;

        var buttons = dialog.add("group");
        buttons.alignment = "right";
        var okButton = buttons.add("button", undefined, "확인", {name: "ok"});
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
        minusButton.onClick = function() {
            changeValue(-depthStepMm);
        };
        plusButton.onClick = function() {
            changeValue(depthStepMm);
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
        dialog.show();

        return result;
    }

    function getSavedDepth(fallbackValue) {
        try {
            var saved = parseFloat(app.preferences.getStringPreference("ObjectCabinetOut_depthMm"));
            if (!isNaN(saved) && saved > 0) {
                return saved;
            }
        } catch (e) {}
        return fallbackValue;
    }

    function saveDepth(value) {
        try {
            app.preferences.setStringPreference("ObjectCabinetOut_depthMm", String(value));
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
