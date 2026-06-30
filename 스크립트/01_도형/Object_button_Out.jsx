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
    var previewItems = [];

    var depthMm = showDepthDialog(defaultDepthMm, function(valueMm) {
        clearPreview();
        previewItems = createButtons(valueMm * mmToPt, false);
        app.redraw();
    }, clearPreview);

    clearPreview();
    if (depthMm === null) {
        return;
    }

    saveDepth(depthMm);
    createButtons(depthMm * mmToPt, true);
    doc.selection = null;

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

        var backFace = frontFace.duplicate();
        backFace.name = "ButtonDepthOut";
        backFace.translate(depth, depth);
        backFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        backFace.move(frontFace, ElementPlacement.PLACEAFTER);

        var tangentPoints = getEllipseTangentPoints(bounds, depth, depth);
        var tangentA = makeTangentLine(frontFace, tangentPoints[0], depth, depth);
        var tangentB = makeTangentLine(frontFace, tangentPoints[1], depth, depth);

        try {
            tangentA.move(frontFace, ElementPlacement.PLACEAFTER);
            tangentB.move(frontFace, ElementPlacement.PLACEAFTER);
        } catch (e) {}

        if (makeGroup) {
            return [groupButtonItems(frontFace, [backFace, tangentA, tangentB])];
        }

        return [backFace, tangentA, tangentB];
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

        return buttonGroup;
    }

    function showDepthDialog(defaultValue, onPreview, onClearPreview) {
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

    function getEllipseTangentPoints(itemBounds, dx, dy) {
        var left = itemBounds[0];
        var top = itemBounds[1];
        var right = itemBounds[2];
        var bottom = itemBounds[3];
        var cx = (left + right) / 2;
        var cy = (top + bottom) / 2;
        var rx = (right - left) / 2;
        var ry = (top - bottom) / 2;
        var angle = Math.atan2(-ry * dx, rx * dy);

        var p1 = [
            cx + (rx * Math.cos(angle)),
            cy + (ry * Math.sin(angle))
        ];
        var p2 = [
            cx + (rx * Math.cos(angle + Math.PI)),
            cy + (ry * Math.sin(angle + Math.PI))
        ];

        return [p1, p2];
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

    function makeTangentLine(frontFace, startPoint, dx, dy) {
        var line = doc.pathItems.add();
        line.setEntirePath([
            [startPoint[0], startPoint[1]],
            [startPoint[0] + dx, startPoint[1] + dy]
        ]);
        line.closed = false;
        line.filled = false;
        line.stroked = true;

        if (frontFace.stroked) {
            line.strokeColor = frontFace.strokeColor;
            line.strokeWidth = frontFace.strokeWidth;
            line.strokeDashes = frontFace.strokeDashes;
            line.strokeCap = frontFace.strokeCap;
            line.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        }

        return line;
    }
})();
