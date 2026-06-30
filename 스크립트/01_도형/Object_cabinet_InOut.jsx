// Cabinet Projection Script for Adobe Illustrator (With Hidden Lines)
// 선택한 사각형을 캐비넷 투영법으로 입체화하고 숨은 선(파선) 추가

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
    var defaultDepthMm = getSavedDepth(0.5);
    var previewItems = [];

    var depthMm = showDepthDialog(defaultDepthMm, function(valueMm) {
        clearPreview();
        previewItems = createCabinets(valueMm * mmToPt, false);
        app.redraw();
    }, clearPreview);

    clearPreview();
    if (depthMm === null) {
        return;
    }

    saveDepth(depthMm);
    createCabinets(depthMm * mmToPt, true);
    doc.selection = null;

    function createCabinets(depth, makeGroup) {
        var created = [];
        for (var i = 0; i < targets.length; i++) {
            var items = createCabinet(targets[i], depth, makeGroup);
            for (var j = 0; j < items.length; j++) {
                created.push(items[j]);
            }
        }
        return created;
    }

    function createCabinet(frontFace, depth, makeGroup) {
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
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

        var hiddenGroup = makeHiddenLines(frontFace, bounds, depth);
        hiddenGroup.zOrder(ZOrderMethod.SENDTOBACK);

        if (makeGroup) {
            return [groupCabinetItems(frontFace, [hiddenGroup, rightFace, topFace])];
        }

        return [rightFace, topFace, hiddenGroup];
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

        return cabinetGroup;
    }

    function makeHiddenLines(frontFace, bounds, depth) {
        var dx = depth;
        var dy = depth;
        var hiddenGroup = doc.activeLayer.groupItems.add();
        hiddenGroup.name = "Hidden Lines";

        var backL = hiddenGroup.pathItems.add();
        backL.setEntirePath([
            [bounds[0] + dx, bounds[1] + dy],
            [bounds[0] + dx, bounds[3] + dy],
            [bounds[2] + dx, bounds[3] + dy]
        ]);

        var backDiag = hiddenGroup.pathItems.add();
        backDiag.setEntirePath([
            [bounds[0], bounds[3]],
            [bounds[0] + dx, bounds[3] + dy]
        ]);

        var k60Color = makeK60Color();
        for (var i = 0; i < hiddenGroup.pathItems.length; i++) {
            var p = hiddenGroup.pathItems[i];
            p.filled = false;
            p.stroked = true;
            p.strokeWidth = frontFace.strokeWidth;
            p.strokeColor = k60Color;
            p.strokeDashes = [2, 1];
            p.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        }

        return hiddenGroup;
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
            var saved = parseFloat(app.preferences.getStringPreference("ObjectCabinetInOut_depthMm"));
            if (!isNaN(saved) && saved > 0) {
                return saved;
            }
        } catch (e) {}
        return fallbackValue;
    }

    function saveDepth(value) {
        try {
            app.preferences.setStringPreference("ObjectCabinetInOut_depthMm", String(value));
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
