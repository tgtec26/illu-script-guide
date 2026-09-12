#include "Object_setdash_align_helper.jsxinc"

// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_DashedGrid.jsx
  기능: 선택한 사각형을 행·열 수만큼 나누는 점선 분할선을 넣습니다.
    - 2행 2열이면 가운데 세로 점선 하나, 가로 점선 하나가 생겨 4칸이 됩니다
    - 점선은 0.3pt, 2pt 선 · 1pt 간격이며 모서리와 패스 끝에 맞춰 정렬합니다. 색은 K값(10 단위)으로 고릅니다
    - 슬라이더로 행·열 수를 정한 뒤 '완료'를 눌러야 그립니다 (사각형 자체는 그대로 둡니다)
  사용법: 가로·세로 변이 축에 나란한 사각형 하나를 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 사각형을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectDashedGrid/settings";
    var STROKE_WIDTH = 0.3;
    var DASH_PATTERN = [2, 1];
    var MIN_COUNT = 1;
    var MAX_COUNT = 50;
    var STEP_BUTTON_WIDTH = 34;   // 더 좁히면 macOS 둥근 모서리가 맞붙어 타원처럼 보인다

    var doc = app.activeDocument;
    var source = getSelectedRectangle(doc.selection);
    if (source === null) {
        alert("가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.");
        return;
    }
    var bounds = source.geometricBounds; // [left, top, right, bottom]

    var options = readSettings();
    var inputs = [];   // 탭 순서: 입력창끼리만 오간다 (기본 순서는 다음 행의 ◀ 버튼으로 간다)
    var win = new Window("dialog", "점선 분할선");
    win.alignChildren = "fill";
    win.spacing = 4;

    var panel = win.add("panel", undefined, "행 · 열");
    panel.alignChildren = "fill";
    panel.spacing = 2;
    addRow(panel, "행 수", "rows", MIN_COUNT, MAX_COUNT, 1, "개");
    addRow(panel, "열 수", "cols", MIN_COUNT, MAX_COUNT, 1, "개");
    addRow(panel, "선 색 (K)", "k", 0, 100, 10, "%");

    var footer = win.add("group");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var done = footer.add("button", undefined, "완료");
    done.helpTip = "정한 행·열 수로 점선을 그립니다";
    try { win.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    done.onClick = function() {
        try {
            drawDividers();
            saveSettings();
            win.close(1);
        } catch (e) {
            alert("점선을 만들지 못했습니다: " + e + " (" + e.line + "행)");
        }
    };

    win.show();

    // 숫자 조절 행: 라벨 | ◀ | 슬라이더 | ▶ | 입력창 | 단위
    function addRow(parent, label, key, min, max, step, unit) {
        var row = parent.add("group");
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = 50;
        var minus = row.add("button", undefined, "◀");
        minus.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, options[key], min, max);
        slider.preferredSize.width = 120;
        var plus = row.add("button", undefined, "▶");
        plus.preferredSize.width = STEP_BUTTON_WIDTH;
        var input = row.add("edittext", undefined, String(options[key]));
        input.characters = 4;
        input.addEventListener("keydown", makeTabHandler(inputs.length));
        inputs.push(input);
        row.add("statictext", undefined, unit);
        function apply(value) {
            value = Math.round(value / step) * step;
            if (!isFinite(value) || value < min || value > max) {
                input.text = String(options[key]);
                return;
            }
            options[key] = value;
            slider.value = value;
            input.text = String(value);
        }
        minus.onClick = function() { apply(options[key] - step); };
        plus.onClick = function() { apply(options[key] + step); };
        slider.onChanging = function() { apply(slider.value); };
        slider.onChange = function() { apply(slider.value); };
        input.onChange = function() { apply(Number(input.text)); };
    }

    // 탭이 ◀ 버튼으로 새지 않도록 다음(shift: 이전) 입력창으로 직접 옮긴다
    function makeTabHandler(index) {
        return function(event) {
            if (event.keyName !== "Tab") return;
            var next = index + (event.shiftKey ? -1 : 1);
            if (next < 0 || next >= inputs.length) return;
            inputs[next].active = true;
            try { event.preventDefault(); } catch (e) {}
        };
    }

    // 사각형 안에 (행-1)개의 가로 점선, (열-1)개의 세로 점선을 등간격으로 넣고 그룹으로 묶는다
    function drawDividers() {
        var left = bounds[0], top = bounds[1], right = bounds[2], bottom = bounds[3];
        var group = source.parent.groupItems.add();
        group.name = "DashedGrid";
        group.move(source, ElementPlacement.PLACEBEFORE);
        var lines = [];
        for (var r = 1; r < options.rows; r++) {
            var y = top - (top - bottom) * r / options.rows;
            lines.push(addLine(group, [[left, y], [right, y]]));
        }
        for (var c = 1; c < options.cols; c++) {
            var x = left + (right - left) * c / options.cols;
            lines.push(addLine(group, [[x, top], [x, bottom]]));
        }
        if (lines.length === 0) {
            group.remove();
            return;
        }
        applyDashPatternToItems(lines, DASH_PATTERN, false);
        doc.selection = null;
        group.selected = true;
    }

    function addLine(container, points) {
        var line = container.pathItems.add();
        line.setEntirePath(points);
        line.closed = false;
        line.filled = false;
        line.stroked = true;
        line.strokeColor = makeGray(options.k);
        line.strokeWidth = STROKE_WIDTH;
        return line;
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = k;
        } else {
            color = new RGBColor();
            var level = Math.round(255 * (1 - k / 100));
            color.red = level; color.green = level; color.blue = level;
        }
        return color;
    }

    // Object_Table.jsx와 같은 판정: 곡선 손잡이 없는 닫힌 4점 축 정렬 사각형
    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
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
    // 설정 기억
    // -------------------------------------------------------
    function readSettings() {
        var result = { rows: 2, cols: 2, k: 100 };
        try {
            var p = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (p[0] !== "v2" || p.length !== 4) return result;
            var rows = Number(p[1]), cols = Number(p[2]), k = Number(p[3]);
            if (!isFinite(rows) || !isFinite(cols) || !isFinite(k)) return result;
            if (rows < MIN_COUNT || rows > MAX_COUNT || cols < MIN_COUNT || cols > MAX_COUNT) return result;
            if (k < 0 || k > 100) return result;
            result.rows = Math.round(rows);
            result.cols = Math.round(cols);
            result.k = Math.round(k / 10) * 10;
        } catch (e) {}
        return result;
    }

    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v2", options.rows, options.cols, options.k].join("|"));
        } catch (e) {}
    }
})();
