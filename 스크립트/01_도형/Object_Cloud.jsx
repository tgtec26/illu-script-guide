/*
  Illustrator Script: Cloud Library (3 tones)
  Description: 사용자가 일러스트레이터에서 그린 구름 10종(구름 K0 · 그림자 1 K20 · 그림자 2 K40 · 외곽선 0.3pt)을 5×2 번호 버튼으로 골라
               선택한 사각형 안에 그린다. 모양은 원본 그대로이고 크기와 세 면의 K값(10 단위), 선 표시만 조절한다.
               외곽선은 크기를 바꿔도 0.3pt를 지킨다.
  사용법: 구름이 들어갈 사각형 하나를 선택한 뒤 실행. 확인하면 원본 사각형은 지워진다.
  구름 모양 데이터: Object_Cloud_library.jsxinc (같은 폴더). 다시 만들려면 tools/cloud-library 참고
*/

#include "Object_Cloud_library.jsxinc"
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

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 사각형을 선택해주세요.");
        return;
    }
    if (typeof CLOUD_LIBRARY === "undefined" || CLOUD_LIBRARY.length === 0) {
        alert("구름 라이브러리(Object_Cloud_library.jsxinc)를 찾지 못했습니다.\n스크립트와 같은 폴더에 있어야 합니다.");
        return;
    }

    var doc = app.activeDocument;
    if (doc.activeLayer.locked || !doc.activeLayer.visible) {
        alert("현재 레이어가 잠겨 있거나 숨겨져 있습니다.\n편집할 수 있는 레이어를 선택한 뒤 실행해주세요.");
        return;
    }

    var source = getSelectedRect(doc.selection);
    if (source === null) {
        alert("구름이 들어갈 사각형 하나를 선택해주세요.");
        return;
    }
    var sourceWasHidden = source.hidden;
    var bounds = source.geometricBounds;   // [left, top, right, bottom]
    var box = {left: bounds[0], top: bounds[1], right: bounds[2], bottom: bounds[3]};
    if (box.right - box.left < 1 || box.top - box.bottom < 1) {
        alert("사각형이 너무 작습니다. 가로세로 1pt 이상이어야 합니다.");
        return;
    }

    var library = CLOUD_LIBRARY;
    var K_STEP = 10;
    var LABEL_WIDTH = 96;
    var SLIDER_WIDTH = 196;
    var PREF_KEY = "ObjectCloud/settings";
    var PREVIEW_NAME = "Cloud Preview";
    var K_LIMIT = [0, 100];
    var ROLE_NAMES = {cloud: "구름", shadow1: "그림자 1", shadow2: "그림자 2", outline: "외곽선", ink: "선(면)", line: "선"};

    // ---- 옵션 (저장) ----
    var cloudIndex = 0;
    var fitToRect = false;    // 켜면 비율을 무시하고 사각형에 꽉 채운다. 끄면 비율을 지키고 사각형 안 가운데
    var cloudK = 0;
    var shadow1K = 20;
    var shadow2K = 40;
    var linesOn = true;       // 외곽선·선 표시
    var previewEnabled = true;
    var previewGroup = null;
    var setPointType = false; // 확정 출력만 앵커 종류를 넣는다 (미리보기는 DOM 호출 절감)
    var kColorCache = {};
    var documentIsCmyk = false;
    try { documentIsCmyk = doc.documentColorSpace === DocumentColorSpace.CMYK; } catch (e) {}

    applySavedSettings();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "구름");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var shapePanel = dlg.add("panel", undefined, "모양");
    shapePanel.orientation = "column";
    shapePanel.alignChildren = "fill";
    // 구름 고르기: 5×2 격자의 라디오 버튼(번호만 표시, 10칸 고정 — 라이브러리에 없는 칸은 비활성).
    // 줄이 다르면 자동 배타가 안 되므로 직접 하나만 켠다
    var GRID_COLUMNS = 5, GRID_SLOTS = 10;
    var cloudRadios = [];
    for (var gridIndex = 0; gridIndex < GRID_SLOTS; gridIndex++) {
        if (gridIndex % GRID_COLUMNS === 0) {
            var gridRow = shapePanel.add("group");
            gridRow.alignChildren = ["left", "center"];
        }
        var radio = gridRow.add("radiobutton", undefined, String(gridIndex + 1));
        radio.preferredSize.width = 48;
        radio.value = gridIndex === cloudIndex;
        radio.enabled = gridIndex < library.length;
        radio.onClick = makeCloudPicker(gridIndex);
        cloudRadios.push(radio);
    }
    var fitCheck = shapePanel.add("checkbox", undefined, "사각형에 꽉 채우기 (비율 무시)");
    fitCheck.value = fitToRect;
    fitCheck.helpTip = "끄면 구름 비율을 지키고 사각형 안 가운데에 최대 크기로 넣는다";

    var shadePanel = dlg.add("panel", undefined, "음영");
    shadePanel.orientation = "column";
    shadePanel.alignChildren = "fill";
    var cloudKRow = addNumberRow(shadePanel, "구름 K (%):", "그림자가 지지 않는 윗부분. 10 단위", cloudK, K_LIMIT, K_STEP, 0);
    var shadow1KRow = addNumberRow(shadePanel, "그림자 1 K (%):", "봉우리가 빛을 가려 생기는 중간 그늘. 10 단위", shadow1K, K_LIMIT, K_STEP, 0);
    var shadow2KRow = addNumberRow(shadePanel, "그림자 2 K (%):", "구름 맨 아래 그늘. 10 단위", shadow2K, K_LIMIT, K_STEP, 0);
    var linesCheck = shadePanel.add("checkbox", undefined, "외곽선·선 (K100, 외곽선 0.3pt)");
    linesCheck.value = linesOn;

    var buttonRow = dlg.add("group");
    buttonRow.alignment = "right";
    var previewCheck = buttonRow.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = buttonRow.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = buttonRow.add("button", undefined, "취소", {name: "cancel"});

    fitCheck.onClick = function() {
        fitToRect = fitCheck.value;
        updatePreview();
    };
    bindNumberRow(cloudKRow, function(value) { cloudK = value; });
    bindNumberRow(shadow1KRow, function(value) { shadow1K = value; });
    bindNumberRow(shadow2KRow, function(value) { shadow2K = value; });
    linesCheck.onClick = function() {
        linesOn = linesCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        var rows = [cloudKRow, shadow1KRow, shadow2KRow];
        for (var i = 0; i < rows.length; i++) {
            var value = parseNumber(rows[i].input.text);
            if (value === null || value < rows[i].min || value > rows[i].max) {
                alert(rows[i].label + " 값은 " + rows[i].min + "부터 " + rows[i].max + " 사이로 입력해주세요.");
                return;
            }
            rows[i].setter(snap(value, rows[i].step));
        }
        saveSettings();
        dlg.close(1);
    };
    cancelButton.onClick = function() { dlg.close(0); };

    source.hidden = true;
    source.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        source.hidden = false;
        setPointType = true;
        var finalGroup = createCloud();
        finalGroup.name = "Cloud " + library[cloudIndex].name;
        try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
        source.remove();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 선택
    // -------------------------------------------------------

    // 앵커 4개짜리 패스 하나 (사각형). 크기는 geometricBounds로 읽으므로 회전된 사각형도 그 바운딩 박스를 쓴다
    function getSelectedRect(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (item.typename !== "PathItem" || item.pathPoints.length !== 4) return null;
        return item;
    }

    // -------------------------------------------------------
    // 다이얼로그 도우미
    // -------------------------------------------------------

    function makeCloudPicker(index) {
        return function() {
            cloudIndex = index;
            for (var i = 0; i < cloudRadios.length; i++) cloudRadios[i].value = i === index;
            updatePreview();
        };
    }

    // 숫자 행: 라벨 | 입력창 | 스크롤바(‹ › 내장)
    function addNumberRow(parent, label, help, value, limit, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var caption = row.add("statictext", undefined, label);
        caption.preferredSize.width = LABEL_WIDTH;
        caption.helpTip = help;
        var input = row.add("edittext", undefined, formatValue(value, decimals));
        input.characters = 6;
        input.helpTip = help;
        var slider = row.add("scrollbar", undefined, value, limit[0], limit[1]);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {label: label.replace(/\s*\(.*$/, "").replace(/:$/, ""), input: input, slider: slider,
            min: limit[0], max: limit[1], step: step, decimals: decimals, setter: null};
    }

    function bindNumberRow(row, setter) {
        row.setter = setter;
        function commit(value, fromSlider) {
            value = snap(clamp(value, row.min, row.max), row.step);
            setter(value);
            row.input.text = formatValue(value, row.decimals);
            if (!fromSlider) { try { row.slider.value = value; } catch (e) {} }
            updatePreview();
        }
        row.slider.onChanging = function() { commit(row.slider.value, true); };
        row.slider.onChange = function() { commit(row.slider.value, true); };
        // 타이핑 중에는 입력창 글자를 건드리지 않는다. 범위 안 값일 때만 즉시 반영한다
        row.input.onChanging = function() {
            var value = parseNumber(row.input.text);
            if (value === null || value < row.min || value > row.max) return;
            setter(snap(value, row.step));
            try { row.slider.value = value; } catch (e) {}
            updatePreview();
        };
        row.input.onChange = function() {
            var value = parseNumber(row.input.text);
            if (value === null) value = row.slider.value;
            commit(value, false);
        };
    }

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createCloud();
        previewGroup.name = PREVIEW_NAME;
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function saveSettings() {
        var parts = ["v3", library[cloudIndex].name, fitToRect ? 1 : 0, cloudK, shadow1K, shadow2K, linesOn ? 1 : 0];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = String(raw).split("|");
        if (p[0] !== "v3" || p.length !== 7) return;
        var found = findCloud(p[1]);
        if (found >= 0) cloudIndex = found;
        fitToRect = p[2] === "1";
        cloudK = snap(restoreNumber(p[3], cloudK, K_LIMIT), K_STEP);
        shadow1K = snap(restoreNumber(p[4], shadow1K, K_LIMIT), K_STEP);
        shadow2K = snap(restoreNumber(p[5], shadow2K, K_LIMIT), K_STEP);
        linesOn = p[6] === "1";
    }

    function findCloud(name) {
        for (var i = 0; i < library.length; i++) {
            if (library[i].name === name) return i;
        }
        return -1;
    }

    function restoreNumber(text, fallback, limit) {
        var value = parseNumber(text);
        if (value === null || value < limit[0] || value > limit[1]) return fallback;
        return value;
    }

    // -------------------------------------------------------
    // 구름 만들기
    // -------------------------------------------------------
    // 라이브러리 항목을 원본 순서(뒤→앞)대로 그린다. 새 항목은 그룹 맨 앞에 놓이므로 순서가 그대로 유지된다.
    // 흰 구름 면이 있으면 외곽선 링 대신 그 면에 획을 준다(면과 선이 한 오브젝트). 그림자가 그 위에 오면서 획 안쪽 절반을
    // 덮으므로, 맨 위에 같은 면의 획만 있는 복사본을 한 장 더 올려 선이 늘 온전히 보이게 한다

    function createCloud() {
        var cloud = library[cloudIndex];
        var fit = fitTransform(box, cloud.aspect, fitToRect);
        var group = source.layer.groupItems.add();
        var outlineWidth = mergedOutlineWidth(cloud);
        var cloudItem = null;
        for (var i = 0; i < cloud.items.length; i++) {
            var item = cloud.items[i];
            if (item.role === "outline" && outlineWidth > 0) continue;   // 구름 면의 획으로 대신한다
            if ((item.kind === "stroke" || item.role === "ink") && !linesOn) continue;   // ink: 면으로 된 K100 선
            var shape = drawShape(group, item.subpaths, fit);
            if (shape === null) continue;
            var paths = pathsOf(shape);
            for (var p = 0; p < paths.length; p++) {
                if (item.kind === "stroke") applyStroke(paths[p], item.width);
                else applyFill(paths[p], kForRole(item.role));
                if (item.role === "cloud" && outlineWidth > 0 && linesOn) applyStrokeStyle(paths[p], outlineWidth);
            }
            try { shape.name = ROLE_NAMES[item.role] || item.role; } catch (e) {}
            if (item.role === "cloud") cloudItem = item;
        }
        if (cloudItem !== null && outlineWidth > 0 && linesOn) {
            var top = drawShape(group, cloudItem.subpaths, fit);
            var topPaths = pathsOf(top);
            for (var t = 0; t < topPaths.length; t++) applyStroke(topPaths[t], outlineWidth);
            try { top.name = ROLE_NAMES.outline; } catch (e2) {}
        }
        return group;
    }

    // 흰 구름 면 하나 + 외곽선 하나면(면이 곧 실루엣) 외곽선 두께, 아니면 0 (합치지 않고 외곽선 링을 그대로 그린다).
    // 흰 면이 여럿이면 안쪽 하이라이트 조각이므로 획을 주면 원본에 없는 선이 생긴다
    function mergedOutlineWidth(cloud) {
        var clouds = 0, outlines = 0;
        var width = 0;
        for (var i = 0; i < cloud.items.length; i++) {
            if (cloud.items[i].role === "cloud") clouds++;
            if (cloud.items[i].role === "outline") { outlines++; width = cloud.items[i].width; }
        }
        return clouds === 1 && outlines === 1 ? width : 0;
    }

    function kForRole(role) {
        if (role === "cloud") return cloudK;
        if (role === "shadow1") return shadow1K;
        if (role === "shadow2") return shadow2K;
        return 100;
    }

    // 정규 좌표(높이 1) → 문서 좌표. exact면 사각형에 꽉 채우고, 아니면 비율을 지켜 가운데에 최대로
    function fitTransform(target, aspect, exact) {
        var width = target.right - target.left;
        var height = target.top - target.bottom;
        var sx;
        var sy;
        var originX;
        var originY;
        if (exact) {
            sx = width / aspect;
            sy = height;
            originX = target.left;
            originY = target.bottom;
        } else {
            sx = sy = Math.min(width / aspect, height);
            originX = target.left + (width - aspect * sx) / 2;
            originY = target.bottom + (height - sy) / 2;
        }
        return {
            height: sy,
            point: function(x, y) { return [originX + x * sx, originY + y * sy]; }
        };
    }

    // 서브패스가 둘 이상이면 복합 패스, 하나면 패스. 만든 항목을 돌려준다
    function drawShape(container, subpaths, fit) {
        if (subpaths.length === 0) return null;
        var target = container;
        if (subpaths.length > 1) {
            try { target = container.compoundPathItems.add(); } catch (e) { target = container; }
        }
        var first = null;
        for (var s = 0; s < subpaths.length; s++) {
            var path = makePath(target, subpaths[s], fit);
            if (first === null) first = path;
        }
        return target === container ? first : target;
    }

    // {closed, anchors: [x, y, lx, ly, rx, ry]...} → 패스
    function makePath(container, subpath, fit) {
        var anchors = subpath.anchors;
        var points = [];
        var i;
        for (i = 0; i < anchors.length; i++) points.push(fit.point(anchors[i][0], anchors[i][1]));
        var path = container.pathItems.add();
        path.setEntirePath(points);
        path.closed = !!subpath.closed;
        var pathPoints = path.pathPoints;
        for (i = 0; i < anchors.length; i++) {
            var a = anchors[i];
            var leftMoved = a[2] !== a[0] || a[3] !== a[1];
            var rightMoved = a[4] !== a[0] || a[5] !== a[1];
            if (!leftMoved && !rightMoved && !setPointType) continue;
            var point = pathPoints[i];
            var left = fit.point(a[2], a[3]);
            var right = fit.point(a[4], a[5]);
            if (leftMoved) point.leftDirection = left;
            if (rightMoved) point.rightDirection = right;
            if (setPointType) point.pointType = isSmoothAnchor(points[i], left, right) ? PointType.SMOOTH : PointType.CORNER;
        }
        return path;
    }

    // 두 핸들이 앵커를 사이에 두고 일직선이면 매끄러운 점
    function isSmoothAnchor(anchor, left, right) {
        var lx = left[0] - anchor[0];
        var ly = left[1] - anchor[1];
        var rx = right[0] - anchor[0];
        var ry = right[1] - anchor[1];
        var leftLen = Math.sqrt(lx * lx + ly * ly);
        var rightLen = Math.sqrt(rx * rx + ry * ry);
        if (leftLen < 1e-6 || rightLen < 1e-6) return false;
        var sine = (lx * ry - ly * rx) / (leftLen * rightLen);
        var cosine = (lx * rx + ly * ry) / (leftLen * rightLen);
        return Math.abs(sine) <= 0.01 && cosine < 0;
    }

    // ---- 스타일 ----

    function pathsOf(item) {
        if (item.typename === "CompoundPathItem") {
            var list = [];
            for (var i = 0; i < item.pathItems.length; i++) list.push(item.pathItems[i]);
            return list;
        }
        return [item];
    }

    function applyFill(path, k) {
        path.stroked = false;
        path.filled = true;
        path.fillColor = makeKColor(k);
    }

    function applyStroke(path, width) {
        path.filled = false;
        applyStrokeStyle(path, width);
    }

    // 채움은 건드리지 않고 획만 준다 (흰 구름 면에 외곽선을 합칠 때)
    function applyStrokeStyle(path, width) {
        path.stroked = true;
        path.strokeWidth = width;
        path.strokeColor = makeKColor(100);
        try { path.strokeDashes = []; } catch (e) {}
        try { path.strokeCap = StrokeCap.ROUNDENDCAP; } catch (e) {}
        try { path.strokeJoin = StrokeJoin.ROUNDENDJOIN; } catch (e) {}
    }

    function makeKColor(k) {
        if (kColorCache[k]) return kColorCache[k];
        var color;
        if (documentIsCmyk) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = k;
        } else {
            color = new RGBColor();
            var gray = Math.round(255 * (1 - k / 100));
            color.red = gray;
            color.green = gray;
            color.blue = gray;
        }
        kColorCache[k] = color;
        return color;
    }

    // -------------------------------------------------------
    // 숫자 도우미
    // -------------------------------------------------------

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function formatValue(value, decimals) {
        var factor = Math.pow(10, decimals);
        return String(Math.round(value * factor) / factor);
    }

    function snap(value, step) {
        return Math.round(value / step) * step;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
})();
