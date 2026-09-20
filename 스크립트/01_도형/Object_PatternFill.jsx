// Object_PatternFill.jsx
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

// 선택한 닫힌 도형(패스·복합 패스) 안을 점·사선·모눈으로 채운다.
// 원본 복제본을 클리핑 마스크로 써서 무늬를 도형 모양대로 자르고, 원본의 면은 무늬 아래에, 선은 무늬 위에
// 따로 복제해 둔다 (아래부터 면 → 무늬 클리핑 그룹 → 선). 확인하면 원본을 지워 그룹 하나로 남는다.
// 사선·모눈 간격은 도형 경계 상자를 분할 수로 나눠 정하고, 점은 지름·간격을 mm로 준다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 채울 도형을 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var targets = [];
    collectShapes(doc.selection, targets);
    if (targets.length === 0) {
        alert("닫힌 패스나 복합 패스를 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectPatternFill/settings";
    var MM = 2.834645669;
    var LABEL_WIDTH = 80;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;
    var MAX_DOTS = 4000;
    var PATTERN_NAMES = ["점 무늬", "사선 무늬", "모눈 무늬"];

    // 다이얼로그가 다루는 옵션 값
    var patternType = 0;        // 0 점, 1 사선, 2 모눈
    var dotDiameterMm = 0.5;
    var dotSpacingMm = 1.5;
    var dotStaggered = false;
    var hatchAngle = 45;        // 수평 기준 반시계 (45 = /)
    var hatchDivisions = 8;
    var hatchWeightPt = 0.3;
    var gridColumns = 8;
    var gridRows = 8;
    var gridWeightPt = 0.3;
    var previewEnabled = true;

    // 원래 표시 상태를 기억해 두고 미리보기 동안만 숨긴다
    var originalHidden = [];
    for (var t = 0; t < targets.length; t++) {
        originalHidden.push(targets[t].hidden);
    }
    // targets[i]에 대응하는 미리보기 그룹. 점이 너무 많아 건너뛴 도형은 null
    var previewGroups = [];

    applySettings();

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "무늬 채움");
    dlg.alignChildren = "fill";

    dlg.add("statictext", undefined, "대상: " + targets.length + "개");

    var typePanel = addPanel(dlg, "무늬");
    typePanel.orientation = "row";
    var typeRadios = [
        typePanel.add("radiobutton", undefined, "점"),
        typePanel.add("radiobutton", undefined, "사선"),
        typePanel.add("radiobutton", undefined, "모눈")
    ];

    // 세 옵션 패널을 같은 자리에 겹쳐 두고 고른 무늬 것만 보인다. 숨긴 쪽도 자리를 차지해 창 크기가 흔들리지 않는다
    var stack = dlg.add("group");
    stack.orientation = "stack";
    stack.alignChildren = ["fill", "top"];

    var dotPanel = addPanel(stack, "점");
    var dotDiameterControls = addValueRow(dotPanel, "지름", "mm", dotDiameterMm, 0.1, 5, 0.1, 1);
    var dotSpacingControls = addValueRow(dotPanel, "간격", "mm", dotSpacingMm, 0.3, 20, 0.1, 1);
    var arrangeRow = dotPanel.add("group");
    arrangeRow.alignChildren = ["left", "center"];
    arrangeRow.add("statictext", undefined, "배치:").preferredSize.width = LABEL_WIDTH;
    var alignedRadio = arrangeRow.add("radiobutton", undefined, "격자");
    var staggeredRadio = arrangeRow.add("radiobutton", undefined, "엇갈림");

    var hatchPanel = addPanel(stack, "사선");
    var hatchAngleControls = addValueRow(hatchPanel, "각도", "°", hatchAngle, 0, 180, 1, 0);
    var hatchDivisionControls = addValueRow(hatchPanel, "분할 수", "", hatchDivisions, 2, 60, 1, 0);
    var hatchWeightControls = addValueRow(hatchPanel, "굵기", "pt", hatchWeightPt, 0.1, 3, 0.1, 1);

    var gridPanel = addPanel(stack, "모눈");
    var gridColumnControls = addValueRow(gridPanel, "가로 분할", "", gridColumns, 1, 60, 1, 0);
    var gridRowControls = addValueRow(gridPanel, "세로 분할", "", gridRows, 1, 60, 1, 0);
    var gridWeightControls = addValueRow(gridPanel, "굵기", "pt", gridWeightPt, 0.1, 3, 0.1, 1);

    var statusText = dlg.add("statictext", undefined, "");
    statusText.characters = 44;

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    typeRadios[patternType].value = true;
    alignedRadio.value = !dotStaggered;
    staggeredRadio.value = dotStaggered;
    previewCheck.value = previewEnabled;
    showPatternPanel();

    for (var r = 0; r < typeRadios.length; r++) {
        typeRadios[r].onClick = makeTypePicker(r);
    }
    alignedRadio.onClick = function() { dotStaggered = false; updatePreview(); };
    staggeredRadio.onClick = function() { dotStaggered = true; updatePreview(); };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    bindValueRow(dotDiameterControls, function() { return dotDiameterMm; }, function(v) { dotDiameterMm = v; });
    bindValueRow(dotSpacingControls, function() { return dotSpacingMm; }, function(v) { dotSpacingMm = v; });
    bindValueRow(hatchAngleControls, function() { return hatchAngle; }, function(v) { hatchAngle = v; });
    bindValueRow(hatchDivisionControls, function() { return hatchDivisions; }, function(v) { hatchDivisions = v; });
    bindValueRow(hatchWeightControls, function() { return hatchWeightPt; }, function(v) { hatchWeightPt = v; });
    bindValueRow(gridColumnControls, function() { return gridColumns; }, function(v) { gridColumns = v; });
    bindValueRow(gridRowControls, function() { return gridRows; }, function(v) { gridRows = v; });
    bindValueRow(gridWeightControls, function() { return gridWeightPt; }, function(v) { gridWeightPt = v; });

    okButton.onClick = function() {
        if (previewGroups.length === 0) {
            setOriginalsHidden(true);
            buildPreview();
        }
        // 무늬를 만든 도형만 지운다. 건너뛴 도형은 원래대로 되돌린다
        var skipped = 0;
        for (var i = 0; i < targets.length; i++) {
            if (previewGroups[i] === null) {
                try { targets[i].hidden = originalHidden[i]; } catch (restoreError) {}
                skipped++;
            } else {
                try { targets[i].remove(); } catch (removeError) {}
            }
        }
        saveSettings();
        doc.selection = null;
        for (var g = 0; g < previewGroups.length; g++) {
            if (previewGroups[g] === null) continue;
            try { previewGroups[g].selected = true; } catch (selectError) {}
        }
        dlg.close(1);
        if (skipped > 0) alert("점이 너무 많은 도형 " + skipped + "개는 건너뛰었습니다. 간격을 키워 다시 실행해주세요.");
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        restoreOriginals();
        app.redraw();
    }

    function makeTypePicker(index) {
        return function() {
            patternType = index;
            showPatternPanel();
            updatePreview();
        };
    }

    function showPatternPanel() {
        dotPanel.visible = patternType === 0;
        hatchPanel.visible = patternType === 1;
        gridPanel.visible = patternType === 2;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            setOriginalsHidden(true);
            buildPreview();
        } else {
            restoreOriginals();
            statusText.text = "";
        }
        app.redraw();
    }

    function buildPreview() {
        var total = 0, skipped = 0;
        for (var i = 0; i < targets.length; i++) {
            var result = fillShape(targets[i]);
            previewGroups.push(result === null ? null : result.group);
            if (result === null) skipped++;
            else total += result.count;
        }
        var unit = patternType === 0 ? "점" : "선";
        statusText.text = unit + " " + total + "개" +
            (skipped > 0 ? " · 점이 너무 많은 도형 " + skipped + "개 건너뜀 (최대 " + MAX_DOTS + "개, 간격을 키우세요)" : "");
    }

    function clearPreview() {
        for (var i = 0; i < previewGroups.length; i++) {
            if (previewGroups[i] === null) continue;
            try { previewGroups[i].remove(); } catch (e) {}
        }
        previewGroups = [];
    }

    function setOriginalsHidden(hidden) {
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].hidden = hidden; } catch (e) {}
        }
    }

    function restoreOriginals() {
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].hidden = originalHidden[i]; } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 도형 하나를 무늬 그룹으로 만든다 (원본은 그대로 둔다). 아래부터
    //   면 복제본 (원본에 면이 있을 때) → 무늬 클리핑 그룹 [마스크 복제본 + 무늬] → 선 복제본 (원본에 선이 있을 때)
    // 클리핑을 켜면 마스크의 면·선이 없어지므로(일러 동작) 면과 선은 따로 복제해 둔다. 선·면 분리 스크립트와 같은 구조.
    // 점이 MAX_DOTS를 넘으면 null
    // -------------------------------------------------------
    function fillShape(shape) {
        var bounds = shape.geometricBounds;
        var centers = null, lines = null;
        if (patternType === 0) {
            centers = dotCenters(bounds, dotSpacingMm * MM, dotStaggered, MAX_DOTS);
            if (centers === null) return null;
        } else {
            lines = patternType === 1
                ? hatchLines(bounds, hatchAngle, hatchDivisions)
                : gridLines(bounds, gridColumns, gridRows);
        }

        var black = makeColor(100);
        var sample = firstPath(shape);
        var group = shape.parent.groupItems.add();
        group.move(shape, ElementPlacement.PLACEBEFORE);
        group.name = PATTERN_NAMES[patternType];

        if (sample !== null && sample.filled) {
            var base = shape.duplicate(group, ElementPlacement.PLACEATEND);
            base.hidden = false;
            setStroked(base, false);
        }

        var clipGroup = group.groupItems.add();
        var i;
        if (centers !== null) {
            // 점 하나만 만들고 나머지는 복제해 옮긴다 (DOM 호출 수 절감)
            var d = dotDiameterMm * MM;
            var proto = null;
            for (i = 0; i < centers.length; i++) {
                var c = centers[i];
                if (proto === null) {
                    proto = clipGroup.pathItems.ellipse(c[1] + d / 2, c[0] - d / 2, d, d);
                    proto.stroked = false;
                    proto.filled = true;
                    proto.fillColor = black;
                } else {
                    var dot = proto.duplicate(clipGroup, ElementPlacement.PLACEATEND);
                    dot.translate(c[0] - centers[0][0], c[1] - centers[0][1]);
                }
            }
        } else {
            var weight = patternType === 1 ? hatchWeightPt : gridWeightPt;
            for (i = 0; i < lines.length; i++) {
                makeLine(clipGroup, lines[i], weight, black);
            }
        }
        // 마스크는 맨 위에
        var mask = shape.duplicate(clipGroup, ElementPlacement.PLACEATBEGINNING);
        mask.hidden = false;
        setClipping(mask);
        clipGroup.clipped = true;

        if (sample !== null && sample.stroked) {
            var outline = shape.duplicate(group, ElementPlacement.PLACEATBEGINNING);
            outline.hidden = false;
            setFilled(outline, false);
        }
        return { group: group, count: centers !== null ? centers.length : lines.length };
    }

    // 복합 패스는 선·면·클리핑 속성이 안쪽 패스에 있다
    function firstPath(item) {
        if (item.typename === "PathItem") return item;
        return item.pathItems.length > 0 ? item.pathItems[0] : null;
    }

    function setFilled(item, value) {
        if (item.typename === "PathItem") { item.filled = value; return; }
        for (var i = 0; i < item.pathItems.length; i++) item.pathItems[i].filled = value;
    }

    function setStroked(item, value) {
        if (item.typename === "PathItem") { item.stroked = value; return; }
        for (var i = 0; i < item.pathItems.length; i++) item.pathItems[i].stroked = value;
    }

    function setClipping(item) {
        if (item.typename === "PathItem") { item.clipping = true; return; }
        for (var i = 0; i < item.pathItems.length; i++) item.pathItems[i].clipping = true;
    }

    // -------------------------------------------------------
    // 무늬 좌표 (경계 상자 bounds = [left, top, right, bottom], y는 위가 큼)
    // -------------------------------------------------------
    // 사선: 선에 수직인 상자 폭 E = W·|sinθ| + H·|cosθ| (정사각형 45°면 대각선)를 divisions 등분 →
    // 선 divisions−1개, 중심 대칭. 길이는 상자 대각선이라 상자를 덮고 클리핑으로 잘린다
    function hatchLines(bounds, angleDeg, divisions) {
        var w = bounds[2] - bounds[0], h = bounds[1] - bounds[3];
        var cx = (bounds[0] + bounds[2]) / 2, cy = (bounds[1] + bounds[3]) / 2;
        var rad = angleDeg * Math.PI / 180;
        var ux = Math.cos(rad), uy = Math.sin(rad);
        var extent = w * Math.abs(uy) + h * Math.abs(ux);
        var half = Math.sqrt(w * w + h * h) / 2;
        var lines = [];
        for (var k = 1; k < divisions; k++) {
            var d = (k - divisions / 2) * extent / divisions;
            var px = cx - uy * d, py = cy + ux * d;
            lines.push([[px - ux * half, py - uy * half], [px + ux * half, py + uy * half]]);
        }
        return lines;
    }

    // 모눈: 상자를 columns×rows 칸으로 나누는 안쪽 선. 테두리는 도형 선이 대신한다
    function gridLines(bounds, columns, rows) {
        var w = bounds[2] - bounds[0], h = bounds[1] - bounds[3];
        var lines = [];
        for (var c = 1; c < columns; c++) {
            var x = bounds[0] + w * c / columns;
            lines.push([[x, bounds[1]], [x, bounds[3]]]);
        }
        for (var r = 1; r < rows; r++) {
            var y = bounds[1] - h * r / rows;
            lines.push([[bounds[0], y], [bounds[2], y]]);
        }
        return lines;
    }

    // 점: 상자 중심을 격자점으로 잡고 중심이 상자 안에 드는 점만 둔다 (가장자리 점은 클리핑으로 잘린다).
    // 엇갈림은 홀수 행을 반 칸 밀고 행 간격을 spacing·√3/2로 둔 육각 배열. 개수가 limit를 넘으면 null
    function dotCenters(bounds, spacing, staggered, limit) {
        var w = bounds[2] - bounds[0], h = bounds[1] - bounds[3];
        var cx = (bounds[0] + bounds[2]) / 2, cy = (bounds[1] + bounds[3]) / 2;
        var rowStep = staggered ? spacing * Math.sqrt(3) / 2 : spacing;
        var rowCount = Math.floor(h / 2 / rowStep);
        var colCount = Math.floor(w / 2 / spacing) + 1;
        if ((2 * rowCount + 1) * (2 * colCount + 1) > limit) return null;
        var centers = [];
        for (var r = -rowCount; r <= rowCount; r++) {
            var shift = (staggered && r % 2 !== 0) ? spacing / 2 : 0;
            var y = cy + r * rowStep;
            for (var c = -colCount; c <= colCount; c++) {
                var x = cx + c * spacing + shift;
                if (x < bounds[0] || x > bounds[2]) continue;
                centers.push([x, y]);
            }
        }
        return centers;
    }

    // -------------------------------------------------------
    // 그리기 부품
    // -------------------------------------------------------
    function makeLine(container, points, width, color) {
        var path = container.pathItems.add();
        path.setEntirePath(points);
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
        path.strokeDashes = [];
        return path;
    }

    function makeColor(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v;
        rgb.green = v;
        rgb.blue = v;
        return rgb;
    }

    // -------------------------------------------------------
    // 대상 수집: 닫힌 패스와 복합 패스. 그룹은 안으로 들어가고, 안내선·클리핑 패스는 뺀다
    // -------------------------------------------------------
    function collectShapes(items, out) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            collectShape(items[i], out);
        }
    }

    function collectShape(item, out) {
        if (!item) return;
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectShape(item.pageItems[i], out);
            }
        } else if (item.typename === "CompoundPathItem") {
            out.push(item);
        } else if (item.typename === "PathItem" && item.closed && !item.guides && !item.clipping) {
            out.push(item);
        }
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.alignChildren = ["left", "top"];
        panel.margins = [12, 16, 12, 12];
        panel.spacing = 6;
        return panel;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {
            input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(",", ".").replace(/[^0-9.\-]/g, ""));
        return isNaN(value) ? null : value;
    }

    function clamp(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function roundTo(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        var factor = Math.pow(10, decimals);
        var rounded = Math.round(value * factor) / factor;
        var text = String(rounded);
        if (decimals <= 0) return text;
        var dot = text.indexOf(".");
        if (dot === -1) {
            text += ".";
            dot = text.length - 1;
        }
        while (text.length - dot - 1 < decimals) text += "0";
        return text;
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            "v1",
            patternType,
            dotDiameterMm,
            dotSpacingMm,
            dotStaggered ? "1" : "0",
            hatchAngle,
            hatchDivisions,
            hatchWeightPt,
            gridColumns,
            gridRows,
            gridWeightPt,
            previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length < 12) return;
        patternType = Math.round(restoreNumber(p[1], patternType, 0, 2));
        dotDiameterMm = restoreNumber(p[2], dotDiameterMm, 0.1, 5);
        dotSpacingMm = restoreNumber(p[3], dotSpacingMm, 0.3, 20);
        dotStaggered = (p[4] === "1");
        hatchAngle = restoreNumber(p[5], hatchAngle, 0, 180);
        hatchDivisions = restoreNumber(p[6], hatchDivisions, 2, 60);
        hatchWeightPt = restoreNumber(p[7], hatchWeightPt, 0.1, 3);
        gridColumns = restoreNumber(p[8], gridColumns, 1, 60);
        gridRows = restoreNumber(p[9], gridRows, 1, 60);
        gridWeightPt = restoreNumber(p[10], gridWeightPt, 0.1, 3);
        previewEnabled = (p[11] === "1");
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, minimum, maximum);
    }
})();
