// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_OffsetGuide.jsx
  기능: 선택한 도형을 오프셋만큼 키우거나 줄인 모양을 안내선으로 만듭니다.
    - 양수는 바깥으로 확장, 음수는 안쪽으로 축소합니다.
    - 여러 개를 선택하면 각 개체마다 자기 모양을 기준으로 따로 오프셋합니다.
    - 원본은 그대로 두고, 안내선을 원본 바로 앞에 같은 부모 안에 넣습니다.
  사용법: 도형을 선택한 뒤 실행. 오프셋 값을 0.1mm 단위로 조절하고 확인.

  오프셋 계산은 DOM에 없어 "Adobe Offset Path" 라이브 효과를 걸고
  모양 확장(expandStyle)으로 실제 패스를 얻는다. 모서리 처리는 일러스트레이터
  오프셋 대화상자 기본값과 같은 마이터/한계 4다. 메뉴 명령 "OffsetPath v22"는
  이 환경에서 조용히 아무것도 하지 않으므로 쓰지 않는다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 도형을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectOffsetGuide/settings";
    var MM = 2.834645669;
    var MIN_OFFSET_MM = -50;
    var MAX_OFFSET_MM = 50;
    var PREVIEW_STROKE_WIDTH = 0.3;

    var doc = app.activeDocument;
    var sources = snapshotSelection(doc.selection);
    if (sources.length === 0) {
        alert("안내선으로 만들 도형을 선택해주세요.");
        return;
    }

    var offsetMm = 1;
    var previewEnabled = true;
    var previewItems = [];

    applySavedSettings();

    var LABEL_WIDTH = 46;
    var UNIT_WIDTH = 26;
    var INPUT_WIDTH = 54;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 180;

    var dlg = new Window("dialog", "오프셋 안내선");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var offsetPanel = addPanel(dlg, "오프셋");
    var offsetField = addNumberField(offsetPanel, "간격", "mm", offsetMm, 0.1, MIN_OFFSET_MM, MAX_OFFSET_MM);
    var infoText = offsetPanel.add("statictext", undefined, "");
    infoText.preferredSize.width = LABEL_WIDTH + INPUT_WIDTH + UNIT_WIDTH + SLIDER_WIDTH + STEP_BUTTON_WIDTH * 2;

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var guides = buildGuides();
        saveSettings();
        restoreSelection();
        if (guides.length === 0) {
            alert("안내선을 만들지 못했습니다.\n\n" +
                "오프셋 효과를 걸 수 없는 개체이거나, 모양 확장 결과에 패스가 없습니다.");
        }
    } else {
        restoreSelection();
    }
    app.redraw();

    // -------------------------------------------------------
    // 안내선 만들기
    // -------------------------------------------------------
    // 개체마다 복제 → 오프셋 효과 → 모양 확장 → 안내선. 확장은 선택을 갈아치우므로
    // 한 개씩 처리해야 어떤 조각이 어느 원본에서 나온 것인지 잃지 않는다.
    function buildGuides() {
        var made = [];
        var offsetPt = offsetMm * MM;

        for (var index = 0; index < sources.length; index++) {
            var source = sources[index];
            var copy = makeOffsetCopy(source, offsetPt);
            if (copy === null) continue;

            doc.selection = null;
            try {
                copy.selected = true;
            } catch (selectError) {
                try { copy.remove(); } catch (removeError) {}
                continue;
            }

            try {
                app.executeMenuCommand("expandStyle");
            } catch (expandError) {
                try { copy.remove(); } catch (removeError) {}
                continue;
            }

            var expanded = snapshotSelection(doc.selection);
            for (var k = 0; k < expanded.length; k++) {
                var paths = convertToGuides(expanded[k], source);
                for (var p = 0; p < paths.length; p++) made.push(paths[p]);
            }
        }

        doc.selection = null;
        return made;
    }

    // 확장 결과는 패스 하나일 수도, 그룹이나 복합 패스일 수도 있다.
    // 안내선은 낱개 패스여야 하므로 잎 패스를 원본 옆으로 꺼낸 뒤 빈 껍데기를 지운다.
    function convertToGuides(item, anchorItem) {
        var paths = [];
        gatherPaths(item, paths);

        var made = [];
        for (var index = 0; index < paths.length; index++) {
            var path = paths[index];
            try { path.move(anchorItem, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
            try {
                path.guides = true;
                path.filled = false;
                path.stroked = false;
                made.push(path);
            } catch (guideError) {}
        }

        if (item.typename !== "PathItem") {
            try { item.remove(); } catch (removeError) {}
        }
        return made;
    }

    // 컬렉션을 순회하면서 옮기면 인덱스가 밀린다. 먼저 배열로 모아둔다.
    function gatherPaths(item, out) {
        if (item.typename === "PathItem") {
            out.push(item);
        } else if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) out.push(item.pathItems[i]);
        } else if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pageItems.length; j++) gatherPaths(item.pageItems[j], out);
        }
    }

    // 오프셋 값을 포인트로 넣는다. mlim 4 · jntp 0(마이터)은 오프셋 대화상자 기본값과 같다.
    function makeOffsetCopy(source, offsetPt) {
        var copy;
        try {
            copy = source.duplicate();
        } catch (duplicateError) {
            return null;
        }
        try {
            copy.applyEffect(
                '<LiveEffect name="Adobe Offset Path">' +
                '<Dict data="R mlim 4 I jntp 0 R ofst ' + offsetPt + ' "/>' +
                '</LiveEffect>'
            );
        } catch (effectError) {
            try { copy.remove(); } catch (removeError) {}
            return null;
        }
        return copy;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    // 미리보기는 효과만 걸어 둔 복제본이다. 모양 확장은 메뉴 명령이라
    // 대화상자가 떠 있는 동안에는 부르지 않고, 확인을 누른 뒤에만 실행한다.
    function updatePreview() {
        clearPreview();
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        updateInfoText();
        if (!previewEnabled) {
            app.redraw();
            return;
        }

        var offsetPt = offsetMm * MM;
        for (var index = 0; index < sources.length; index++) {
            var copy = makeOffsetCopy(sources[index], offsetPt);
            if (copy === null) continue;
            stylePreview(copy);
            previewItems.push(copy);
        }
        app.redraw();
    }

    function clearPreview() {
        for (var index = 0; index < previewItems.length; index++) {
            try { previewItems[index].remove(); } catch (e) {}
        }
        previewItems = [];
    }

    // 원본 색을 그대로 두면 확장된 복제본이 원본을 덮어 가린다. 안내선 색의 가는 선만 남긴다.
    function stylePreview(item) {
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) stylePreview(item.pageItems[i]);
            return;
        }
        if (item.typename !== "PathItem" && item.typename !== "CompoundPathItem") return;

        var targets = [];
        if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) targets.push(item.pathItems[j]);
        } else {
            targets.push(item);
        }
        for (var k = 0; k < targets.length; k++) {
            try {
                targets[k].filled = false;
                targets[k].stroked = true;
                targets[k].strokeWidth = PREVIEW_STROKE_WIDTH;
                targets[k].strokeColor = guideColor();
            } catch (styleError) {}
        }
    }

    function guideColor() {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 70;
            cmyk.magenta = 15;
            cmyk.yellow = 0;
            cmyk.black = 0;
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = 0;
        rgb.green = 150;
        rgb.blue = 255;
        return rgb;
    }

    function updateInfoText() {
        var shape = offsetMm > 0 ? "확장" : (offsetMm < 0 ? "축소" : "같은 크기");
        infoText.text = "선택 " + sources.length + "개 · " + shape;
    }

    // -------------------------------------------------------
    // 선택
    // -------------------------------------------------------
    function snapshotSelection(selection) {
        var items = [];
        if (!selection) return items;
        for (var index = 0; index < selection.length; index++) {
            if (selection[index].typename === "TextRange") continue;
            items.push(selection[index]);
        }
        return items;
    }

    function restoreSelection() {
        doc.selection = null;
        for (var index = 0; index < sources.length; index++) {
            try { sources[index].selected = true; } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 입력
    // -------------------------------------------------------
    function readFields(showAlert) {
        var offset = parseNumber(offsetField.input.text);
        if (offset === null || offset < MIN_OFFSET_MM || offset > MAX_OFFSET_MM) {
            if (showAlert) {
                alert("간격은 " + MIN_OFFSET_MM + "부터 " + MAX_OFFSET_MM + " 사이로 입력해주세요.");
            }
            return false;
        }
        offsetMm = offset;
        return true;
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    // 라벨 · 입력칸 · 단위 · 슬라이더를 한 줄에 배치.
    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.spacing = 6;
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.preferredSize.width = INPUT_WIDTH;
        input.justify = "center";
        var unitLabel = row.add("statictext", undefined, unit);
        unitLabel.preferredSize.width = UNIT_WIDTH;
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;

        var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};
        down.onClick = function() { stepField(field, -1); };
        up.onClick = function() { stepField(field, 1); };

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampValue(stepped, field.minimum, field.maximum));
            updatePreview();
        };
        input.onChanging = updatePreview;
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampValue(parsed, field.minimum, field.maximum);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            updatePreview();
        };
        return field;
    }

    // 버튼 한 번 = 1단계. 세밀 조절용.
    function stepField(field, direction) {
        var value = parseNumber(field.input.text);
        if (value === null) value = field.minimum;
        value = Math.round((value + (field.step * direction)) / field.step) * field.step;
        value = clampValue(value, field.minimum, field.maximum);
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
        updatePreview();
    }

    function clampValue(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function formatValue(value) {
        return String(Math.round(value * 100) / 100);
    }

    function saveSettings() {
        var parts = ["v1", offsetMm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 2) return;

        var offset = parseFloat(p[1]);
        if (!isNaN(offset)) offsetMm = clampValue(offset, MIN_OFFSET_MM, MAX_OFFSET_MM);
    }
})();
