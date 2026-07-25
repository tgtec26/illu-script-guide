// 스크립트 이름: Object_CircularAlignment.jsx
// 기능: 선택된 두 개체 중 작은 개체를 큰 개체의 경계선을 따라 등간격으로 복제 배치 후, 원본 작은 개체 삭제
// 옵션: 배열 개수(2개=180도, 3개=120도 ...), 배치 지름 조절(- 안쪽 / + 바깥쪽)

(function() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var selection = doc.selection;

    if (!selection || selection.length !== 2) {
        alert("정확히 두 개의 개체를 선택해야 합니다.");
        return;
    }

    // 1. 개체 크기 비교
    var itemA = selection[0];
    var itemB = selection[1];

    var areaA = (itemA.geometricBounds[2] - itemA.geometricBounds[0]) * (itemA.geometricBounds[1] - itemA.geometricBounds[3]);
    var areaB = (itemB.geometricBounds[2] - itemB.geometricBounds[0]) * (itemB.geometricBounds[1] - itemB.geometricBounds[3]);

    var largeItem, smallItem;
    if (areaA >= areaB) {
        largeItem = itemA;
        smallItem = itemB;
    } else {
        largeItem = itemB;
        smallItem = itemA;
    }

    // 2. 기준(큰) 개체 정보 계산
    var lBounds = largeItem.geometricBounds;
    var largeCenterX = lBounds[0] + (lBounds[2] - lBounds[0]) / 2;
    var largeCenterY = lBounds[1] + (lBounds[3] - lBounds[1]) / 2;
    var lRadiusX = (lBounds[2] - lBounds[0]) / 2;
    var lRadiusY = (lBounds[1] - lBounds[3]) / 2;

    var mmToPt = 2.83464567;
    // 안쪽으로는 중심까지만 들어가면 충분하므로 짧은 반지름을 슬라이더 한계로 쓴다
    var maxOffsetMm = Math.max(1, Math.round(Math.min(lRadiusX, lRadiusY) / mmToPt));
    var previewItems = [];

    var options = showOptionsDialog(function(count, offsetMm, rotationDeg) {
        clearPreview();
        previewItems = arrangeCopies(count, offsetMm * mmToPt, rotationDeg);
        app.redraw();
    }, clearPreview);

    clearPreview();
    if (options === null) {
        return;
    }

    arrangeCopies(options.count, options.offsetMm * mmToPt, options.rotationDeg);
    smallItem.remove();
    doc.selection = null;

    // 3. 복제 및 배치
    function arrangeCopies(count, offsetRadius, rotationDeg) {
        var created = [];
        var rotationRad = rotationDeg * (Math.PI / 180);
        try { doc.suspendRedraw(); } catch (e) {}

        for (var i = 0; i < count; i++) {
            var rad = ((2 * Math.PI / count) * i) + rotationRad;

            var duplicatedItem = smallItem.duplicate();

            // 배치 좌표 계산 (타원 방정식)
            var denom = Math.sqrt(Math.pow(lRadiusY * Math.cos(rad), 2) + Math.pow(lRadiusX * Math.sin(rad), 2));
            var ellipseRadius = denom === 0 ? 0 : (lRadiusX * lRadiusY) / denom;
            var finalDistance = ellipseRadius + offsetRadius;

            var targetX = largeCenterX + finalDistance * Math.cos(rad);
            var targetY = largeCenterY + finalDistance * Math.sin(rad);

            var dBounds = duplicatedItem.geometricBounds;
            var dCenterX = dBounds[0] + (dBounds[2] - dBounds[0]) / 2;
            var dCenterY = dBounds[1] + (dBounds[3] - dBounds[1]) / 2;

            duplicatedItem.translate(targetX - dCenterX, targetY - dCenterY);

            // 배치 위치와 함께 개체 자체도 같은 각도로 돌려 배열 전체가 통째로 회전하게 한다
            if (rotationDeg !== 0) {
                try {
                    duplicatedItem.rotate(rotationDeg, true, true, true, true, Transformation.CENTER);
                } catch (e) {}
            }

            created.push(duplicatedItem);
        }

        try { doc.resumeRedraw(); } catch (e) {}
        return created;
    }

    function clearPreview() {
        for (var i = previewItems.length - 1; i >= 0; i--) {
            try {
                previewItems[i].remove();
            } catch (e) {}
        }
        previewItems = [];
    }

    function showOptionsDialog(onPreview, onClearPreview) {
        var presetCounts = [2, 3, 4, 6, 8];
        var defaultCount = 8;
        var offsetStepMm = 0.05;
        var isSyncingControl = false;
        var result = null;

        var dialog = new Window("dialog", "원형 배열");
        dialog.orientation = "column";
        dialog.alignChildren = "fill";
        dialog.margins = 16;

        var countPanel = dialog.add("panel", undefined, "배열 개수");
        countPanel.orientation = "column";
        countPanel.alignChildren = "left";
        countPanel.margins = 12;

        var countRow = countPanel.add("group");
        var countRadios = [];
        for (var i = 0; i < presetCounts.length; i++) {
            var radio = countRow.add("radiobutton", undefined, presetCounts[i] + "개");
            if (presetCounts[i] === defaultCount) {
                radio.value = true;
            }
            countRadios.push(radio);
        }

        var countCustomRow = countPanel.add("group");
        countCustomRow.add("statictext", undefined, "직접 입력");
        var countInput = countCustomRow.add("edittext", undefined, "");
        countInput.characters = 6;
        countCustomRow.add("statictext", undefined, "개");

        var angleLabel = countPanel.add("statictext", undefined, "");
        angleLabel.characters = 20;

        var offsetPanel = dialog.add("panel", undefined, "지름 조절 (- 안쪽 / + 바깥쪽)");
        offsetPanel.orientation = "column";
        offsetPanel.alignChildren = "fill";
        offsetPanel.margins = 12;

        var offsetRow = offsetPanel.add("group");
        offsetRow.add("statictext", undefined, "중심 이동(mm)");
        var offsetInput = offsetRow.add("edittext", undefined, "0.00");
        offsetInput.characters = 8;

        var offsetControl = offsetPanel.add(
            "scrollbar",
            undefined,
            0,
            offsetToStep(-maxOffsetMm),
            offsetToStep(maxOffsetMm)
        );
        offsetControl.preferredSize.width = 360;
        offsetControl.stepdelta = 1;
        offsetControl.jumpdelta = 10;

        var rotationPanel = dialog.add("panel", undefined, "회전 (큰 개체 중심 기준)");
        rotationPanel.orientation = "column";
        rotationPanel.alignChildren = "fill";
        rotationPanel.margins = 12;

        var rotationRow = rotationPanel.add("group");
        rotationRow.add("statictext", undefined, "회전 각도(°)");
        var rotationInput = rotationRow.add("edittext", undefined, "0");
        rotationInput.characters = 8;

        var rotationControl = rotationPanel.add("scrollbar", undefined, 0, -180, 180);
        rotationControl.preferredSize.width = 360;
        rotationControl.stepdelta = 1;
        rotationControl.jumpdelta = 15;

        var previewCheck = dialog.add("checkbox", undefined, "미리보기");
        previewCheck.value = true;

        var buttons = dialog.add("group");
        buttons.alignment = "right";
        var okButton = buttons.add("button", undefined, "확인", {name: "ok"});
        var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

        function offsetToStep(value) {
            return Math.round(value / offsetStepMm);
        }

        function stepToOffset(step) {
            return step * offsetStepMm;
        }

        function formatOffset(value) {
            return (Math.round(value / offsetStepMm) * offsetStepMm).toFixed(2);
        }

        function readCount() {
            var text = String(countInput.text).replace(/^\s+|\s+$/g, "");
            if (text !== "") {
                var typed = Math.round(parseFloat(text));
                if (isNaN(typed) || typed < 1) {
                    return null;
                }
                return typed;
            }

            for (var i = 0; i < countRadios.length; i++) {
                if (countRadios[i].value) {
                    return presetCounts[i];
                }
            }
            return defaultCount;
        }

        function readOffset() {
            var value = parseFloat(String(offsetInput.text).replace(",", "."));
            return isNaN(value) ? null : value;
        }

        function readRotation() {
            var value = parseFloat(String(rotationInput.text).replace(",", "."));
            return isNaN(value) ? null : value;
        }

        function syncRotationControl(value) {
            if (isSyncingControl || value === null) {
                return;
            }

            isSyncingControl = true;
            rotationControl.value = Math.max(-180, Math.min(180, Math.round(value)));
            isSyncingControl = false;
        }

        function syncOffsetControl(value) {
            if (isSyncingControl || value === null) {
                return;
            }

            var step = offsetToStep(value);
            step = Math.max(offsetToStep(-maxOffsetMm), Math.min(offsetToStep(maxOffsetMm), step));
            isSyncingControl = true;
            offsetControl.value = step;
            isSyncingControl = false;
        }

        function updateAngleLabel() {
            var count = readCount();
            angleLabel.text = count === null ? "" : count + "개 = " + (Math.round(3600 / count) / 10) + "° 간격";
        }

        function updatePreview() {
            updateAngleLabel();

            if (!previewCheck.value) {
                onClearPreview();
                return;
            }

            var count = readCount();
            var offset = readOffset();
            var rotation = readRotation();
            if (count === null || offset === null || rotation === null) {
                onClearPreview();
                return;
            }

            onPreview(count, offset, rotation);
        }

        for (var j = 0; j < countRadios.length; j++) {
            countRadios[j].onClick = function() {
                countInput.text = "";
                updatePreview();
            };
        }
        countInput.onChanging = updatePreview;
        offsetInput.onChanging = updatePreview;
        offsetInput.onChange = function() {
            syncOffsetControl(readOffset());
        };
        offsetControl.onChanging = function() {
            if (isSyncingControl) {
                return;
            }

            offsetInput.text = formatOffset(stepToOffset(offsetControl.value));
            updatePreview();
        };
        rotationInput.onChanging = updatePreview;
        rotationInput.onChange = function() {
            syncRotationControl(readRotation());
        };
        rotationControl.onChanging = function() {
            if (isSyncingControl) {
                return;
            }

            rotationInput.text = String(rotationControl.value);
            updatePreview();
        };
        previewCheck.onClick = updatePreview;
        okButton.onClick = function() {
            var count = readCount();
            if (count === null) {
                alert("배열 개수는 1 이상의 정수로 입력해주세요.");
                return;
            }

            var offset = readOffset();
            if (offset === null) {
                alert("지름 조절 값을 숫자로 입력해주세요.");
                return;
            }

            var rotation = readRotation();
            if (rotation === null) {
                alert("회전 각도를 숫자로 입력해주세요.");
                return;
            }

            result = {
                count: count,
                offsetMm: parseFloat(formatOffset(offset)),
                rotationDeg: rotation
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
})();
