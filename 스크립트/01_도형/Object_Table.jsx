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

/*
  Object_Table.jsx
  기능: 선택한 사각형을 행·열로 나눈 표로 바꿉니다.
    - 셀 하나가 테두리 사각형 하나라서 셀에 글자를 정렬하기 쉽습니다
    - 행 높이·열 너비는 mm 슬라이더로 각각 조절합니다
    - 줄 앞 체크박스를 켜면 바로 위의 켜진 줄을 따라갑니다.
      1행만 끄고 2~5행을 켜면 2행 슬라이더가 3~5행을 함께 움직입니다(1행 = 머리글).
    - 1행에는 K 음영을 넣을 수 있습니다(0K = 음영 없음)
    - 표는 선택한 사각형의 왼쪽 위를 기준으로 자랍니다
  사용법: 가로·세로 변이 축에 나란한 사각형 하나를 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 사각형을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectTable/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var MAX_ROWS = 6;
    var MAX_COLS = 6;
    var SIZE_STEP_MM = 0.5;
    var SIZE_MIN_MM = 1;
    var SIZE_MAX_MM = 120;

    var doc = app.activeDocument;
    var source = getSelectedRectangle(doc.selection);
    if (source === null) {
        alert("가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.");
        return;
    }

    var bounds = source.geometricBounds; // [left, top, right, bottom]
    var tableLeft = bounds[0];
    var tableTop = bounds[1];
    var tableWidthMm = (bounds[2] - bounds[0]) / MM_TO_PT;
    var tableHeightMm = (bounds[1] - bounds[3]) / MM_TO_PT;
    if (tableWidthMm <= 0 || tableHeightMm <= 0) {
        alert("가로와 세로 크기가 있는 사각형을 선택해주세요.");
        return;
    }

    var rowCount = 3;
    var colCount = 3;
    // 각 줄이 바로 위의 켜진 줄을 따라갈지 여부. 전부 켜면 모든 줄이 첫 줄을 따라간다.
    var rowLinked = filledArray(MAX_ROWS, true);
    var colLinked = filledArray(MAX_COLS, true);
    var strokeWidthPt = 0.3;
    var headerK = 0;            // 1행 내부 음영. 0이면 채우지 않는다.
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    applySavedSettings();

    // 행 높이·열 너비는 선택한 사각형에서 나오는 값이라 저장하지 않고 매번 다시 나눈다
    var rowHeightsMm = seedSizes(tableHeightMm, rowCount, MAX_ROWS);
    var colWidthsMm = seedSizes(tableWidthMm, colCount, MAX_COLS);

    var LABEL_WIDTH = 52;
    var UNIT_WIDTH = 26;        // 단위 글자 수가 달라도 뒤 요소가 어긋나지 않도록 고정
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 91;

    var dlg = new Window("dialog", "표");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var countPanel = addPanel(dlg, "표");
    var rowCountField = addNumberField(countPanel, "행 수", "개", rowCount, 1, 1, MAX_ROWS, false);
    var colCountField = addNumberField(countPanel, "열 수", "개", colCount, 1, 1, MAX_COLS, false);
    var headerKField = addNumberField(countPanel, "1행 음영", "K", headerK, 10, 0, 100, false);

    var rowPanel = addPanel(dlg, "행 높이 (체크한 줄은 위 줄을 따라감)");
    var rowFields = [];
    for (var r = 0; r < MAX_ROWS; r++) {
        rowFields[r] = addNumberField(rowPanel, (r + 1) + "행", "mm", rowHeightsMm[r],
            SIZE_STEP_MM, SIZE_MIN_MM, SIZE_MAX_MM, true);
        rowFields[r].check.value = rowLinked[r];
        bindSizeField(rowFields[r]);
    }

    var colPanel = addPanel(dlg, "열 너비 (체크한 줄은 왼쪽 줄을 따라감)");
    var colFields = [];
    for (var c = 0; c < MAX_COLS; c++) {
        colFields[c] = addNumberField(colPanel, (c + 1) + "열", "mm", colWidthsMm[c],
            SIZE_STEP_MM, SIZE_MIN_MM, SIZE_MAX_MM, true);
        colFields[c].check.value = colLinked[c];
        bindSizeField(colFields[c]);
    }

    var linePanel = addPanel(dlg, "선");
    var strokeField = addNumberField(linePanel, "두께", "pt", strokeWidthPt, 0.1, 0.1, 3, false);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, false);
    var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, false);
    // 위치는 표를 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindOffsetField(offsetXField, true);
    bindOffsetField(offsetYField, false);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    // 행·열 수가 바뀌면 사각형을 다시 균등하게 나눈다
    rowCountField.onCommit = function() {
        var next = readCount(rowCountField, rowCount, MAX_ROWS);
        if (next !== rowCount) {
            rowCount = next;
            reseedFields(rowFields, tableHeightMm, rowCount);
        }
        refreshSizeFields();
    };
    colCountField.onCommit = function() {
        var next = readCount(colCountField, colCount, MAX_COLS);
        if (next !== colCount) {
            colCount = next;
            reseedFields(colFields, tableWidthMm, colCount);
        }
        refreshSizeFields();
    };

    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    refreshSizeFields(true);
    source.hidden = true;
    source.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = drawTable();
        moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        finalGroup.name = "Table";
        try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
        source.remove();
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    // 셀 하나가 테두리 사각형 하나. 인접한 셀은 변이 같은 자리에 겹치므로 선 굵기는 그대로다.
    function drawTable() {
        var group = doc.activeLayer.groupItems.add();
        var black = makeBlack();
        var y = tableTop;
        for (var i = 0; i < rowCount; i++) {
            var height = rowHeightsMm[i] * MM_TO_PT;
            var x = tableLeft;
            for (var j = 0; j < colCount; j++) {
                var width = colWidthsMm[j] * MM_TO_PT;
                var cell = group.pathItems.rectangle(y, x, width, height);
                if (i === 0 && headerK > 0) {
                    cell.filled = true;
                    cell.fillColor = makeGray(headerK);
                } else {
                    cell.filled = false;
                }
                cell.stroked = true;
                cell.strokeWidth = strokeWidthPt;
                cell.strokeColor = black;
                x += width;
            }
            y -= height;
        }
        return group;
    }

    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    function makeBlack() {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = 100;
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = 0;
        rgb.green = 0;
        rgb.blue = 0;
        return rgb;
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    // -------------------------------------------------------
    // 미리보기 · 입력
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        previewGroup = drawTable();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        previewGroup.name = "Table Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function readFields(showAlert) {
        var rows = parseNumber(rowCountField.input.text);
        var cols = parseNumber(colCountField.input.text);
        var width = parseNumber(strokeField.input.text);
        var header = parseNumber(headerKField.input.text);
        var offX = parseNumber(offsetXField.input.text);
        var offY = parseNumber(offsetYField.input.text);

        if (rows === null || rows < 1 || rows > MAX_ROWS ||
                cols === null || cols < 1 || cols > MAX_COLS) {
            if (showAlert) alert("행 수와 열 수는 1부터 " + MAX_ROWS + " 사이의 정수로 입력해주세요.");
            return false;
        }
        if (width === null || width < 0.1 || width > 3) {
            if (showAlert) alert("선 두께는 0.1부터 3 사이로 입력해주세요.");
            return false;
        }
        if (header === null || header < 0 || header > 100) {
            if (showAlert) alert("1행 음영은 0부터 100 사이로 입력해주세요.");
            return false;
        }
        if (offX === null || offX < -POSITION_LIMIT_MM || offX > POSITION_LIMIT_MM ||
                offY === null || offY < -POSITION_LIMIT_MM || offY > POSITION_LIMIT_MM) {
            if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " +
                POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
            return false;
        }

        var sizes = readSizeFields(rowFields, rowCount, showAlert, "행 높이");
        if (sizes === null) return false;
        rowHeightsMm = sizes;
        sizes = readSizeFields(colFields, colCount, showAlert, "열 너비");
        if (sizes === null) return false;
        colWidthsMm = sizes;

        rowCount = Math.round(rows);
        colCount = Math.round(cols);
        strokeWidthPt = width;
        headerK = header;
        offsetXmm = offX;
        offsetYmm = offY;
        readLinkedFlags();
        return true;
    }

    function readSizeFields(fields, count, showAlert, label) {
        var sizes = [];
        for (var i = 0; i < fields.length; i++) {
            var value = parseNumber(fields[i].input.text);
            if (i < count && (value === null || value < SIZE_MIN_MM || value > SIZE_MAX_MM)) {
                if (showAlert) alert(label + "는 " + SIZE_MIN_MM + "부터 " +
                    SIZE_MAX_MM + "mm 사이로 입력해주세요.");
                return null;
            }
            sizes.push(value === null ? SIZE_MIN_MM : value);
        }
        return sizes;
    }

    function readCount(field, fallback, maximum) {
        var value = parseNumber(field.input.text);
        if (value === null || value < 1 || value > maximum) return fallback;
        return Math.round(value);
    }

    function readLinkedFlags() {
        var i;
        for (i = 0; i < rowFields.length; i++) rowLinked[i] = rowFields[i].check.value;
        for (i = 0; i < colFields.length; i++) colLinked[i] = colFields[i].check.value;
    }

    // -------------------------------------------------------
    // 줄 잇기: 연속으로 켜진 구간에서 맨 앞 줄이 나머지를 이끈다
    // -------------------------------------------------------
    // 켜진 줄이면서 바로 앞 줄도 켜져 있으면 따라가는 줄이다
    function isFollower(linked, index) {
        return index > 0 && linked[index] && linked[index - 1];
    }

    function leaderIndexOf(linked, index) {
        var leader = 0;
        for (var i = 1; i <= index; i++) {
            if (!isFollower(linked, i)) leader = i;
        }
        return leader;
    }

    function syncLinkedFields(fields, linked, count) {
        for (var i = 1; i < count; i++) {
            if (!isFollower(linked, i)) continue;
            var value = parseNumber(fields[leaderIndexOf(linked, i)].input.text);
            if (value === null) continue;
            setFieldValue(fields[i], clampSize(value));
        }
    }

    // 크기 필드 하나에 값 변경·체크 변경 동작을 붙인다
    function bindSizeField(field) {
        field.onCommit = function() { refreshSizeFields(); };
        field.check.onClick = function() { refreshSizeFields(); };
    }

    // 체크 상태를 읽어 따라가는 줄을 채우고 잠근 뒤 미리보기를 다시 그린다
    function refreshSizeFields(skipPreview) {
        readLinkedFlags();
        syncLinkedFields(rowFields, rowLinked, rowCount);
        syncLinkedFields(colFields, colLinked, colCount);
        updateSizeFieldState();
        if (skipPreview !== true) updatePreview();
    }

    // 쓰지 않는 줄은 통째로, 따라가는 줄은 입력만 잠근다(체크박스는 계속 누를 수 있어야 한다)
    function updateSizeFieldState() {
        var i;
        for (i = 0; i < rowFields.length; i++) {
            setFieldState(rowFields[i], i < rowCount, isFollower(rowLinked, i));
        }
        for (i = 0; i < colFields.length; i++) {
            setFieldState(colFields[i], i < colCount, isFollower(colLinked, i));
        }
    }

    function setFieldState(field, inUse, follower) {
        field.row.enabled = inUse;
        var editable = inUse && !follower;
        field.input.enabled = editable;
        field.slider.enabled = editable;
        field.down.enabled = editable;
        field.up.enabled = editable;
        if (field.check) field.check.enabled = inUse;
    }

    // 선택한 사각형을 균등하게 나눈 값으로 채운다.
    // 0.5mm 격자에 맞추면 합이 사각형과 어긋나므로 나눈 값을 그대로 쓴다.
    function seedSizes(totalMm, count, maximum) {
        var each = clampSize(totalMm / count);
        var sizes = [];
        for (var i = 0; i < maximum; i++) sizes.push(each);
        return sizes;
    }

    function reseedFields(fields, totalMm, count) {
        var each = clampSize(totalMm / count);
        for (var i = 0; i < fields.length; i++) setFieldValue(fields[i], each);
    }

    function clampSize(value) {
        if (value < SIZE_MIN_MM) return SIZE_MIN_MM;
        if (value > SIZE_MAX_MM) return SIZE_MAX_MM;
        return value;
    }

    function filledArray(length, value) {
        var out = [];
        for (var i = 0; i < length; i++) out.push(value);
        return out;
    }

    // 가로·세로 변이 축에 나란한 사각형만 받는다 (기울어진 사각형은 경계 상자와 어긋난다)
    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;

        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            // 곡선 손잡이가 있으면 사각형이 아니다
            if (point.leftDirection[0] !== point.anchor[0] ||
                    point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] ||
                    point.rightDirection[1] !== point.anchor[1]) return null;
            pushDistinct(xs, point.anchor[0]);
            pushDistinct(ys, point.anchor[1]);
        }
        if (xs.length !== 2 || ys.length !== 2) return null;
        return item;
    }

    function pushDistinct(values, value) {
        for (var i = 0; i < values.length; i++) {
            if (Math.abs(values[i] - value) < 0.01) return;
        }
        values.push(value);
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

    function addNumberField(parent, labelText, unit, value, step, minimum, maximum, withCheck) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var check = null;
        if (withCheck) check = row.add("checkbox", undefined, "");
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.characters = 5;
        input.justify = "center";
        var unitLabel = row.add("statictext", undefined, unit);
        unitLabel.preferredSize.width = UNIT_WIDTH;
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;

        var field = {row: row, check: check, input: input, slider: slider,
            down: down, up: up, step: step,
            minimum: minimum, maximum: maximum, syncing: false};
        down.onClick = function() { stepField(field, -1); };
        up.onClick = function() { stepField(field, 1); };

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampField(field, stepped));
            commitField(field);
        };
        input.onChanging = function() { commitField(field); };
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampField(field, parsed);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            commitField(field);
        };
        return field;
    }

    // 값이 바뀌었을 때 할 일은 필드마다 다르다. 지정이 없으면 미리보기만 다시 그린다.
    function commitField(field) {
        if (field.onCommit) field.onCommit();
        else updatePreview();
    }

    // 위치 필드는 표를 다시 만들지 않고 미리보기만 옮긴다
    function bindOffsetField(field, isX) {
        field.onCommit = function() {
            var value = parseNumber(field.input.text);
            if (value === null) return;
            value = clampField(field, value);
            var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
            if (isX) offsetXmm = value;
            else offsetYmm = value;
            if (delta === 0 || previewGroup === null) return;
            moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        };
    }

    function setFieldValue(field, value) {
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
    }

    // 버튼 한 번 = step. step 격자에 맞춰 움직인다.
    function stepField(field, direction) {
        var value = parseNumber(field.input.text);
        if (value === null) value = field.minimum;
        value = Math.round((value + field.step * direction) / field.step) * field.step;
        value = clampField(field, value);
        setFieldValue(field, value);
        commitField(field);
    }

    function clampField(field, value) {
        if (value < field.minimum) value = field.minimum;
        if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
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

    // -------------------------------------------------------
    // 설정 기억 (행 높이·열 너비는 사각형에서 나오므로 저장하지 않는다)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v3", rowCount, colCount,
            flagsToText(rowLinked), flagsToText(colLinked),
            strokeWidthPt, offsetXmm, offsetYmm, headerK];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length < 9) return;

        var rows = parseInt(p[1], 10);
        var cols = parseInt(p[2], 10);
        var width = parseFloat(p[5]);
        var offX = parseFloat(p[6]);
        var offY = parseFloat(p[7]);
        if (rows >= 1 && rows <= MAX_ROWS) rowCount = rows;
        if (cols >= 1 && cols <= MAX_COLS) colCount = cols;
        textToFlags(p[3], rowLinked);
        textToFlags(p[4], colLinked);
        if (width >= 0.1 && width <= 3) strokeWidthPt = width;
        if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
        if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
        var header = parseFloat(p[8]);
        if (header >= 0 && header <= 100) headerK = header;
    }

    function flagsToText(flags) {
        var text = "";
        for (var i = 0; i < flags.length; i++) text += flags[i] ? "1" : "0";
        return text;
    }

    function textToFlags(text, flags) {
        if (!text || text.length !== flags.length) return;
        for (var i = 0; i < flags.length; i++) flags[i] = (text.charAt(i) === "1");
    }
})();
