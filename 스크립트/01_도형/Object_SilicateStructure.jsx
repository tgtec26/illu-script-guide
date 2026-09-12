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
  Object_SilicateStructure.jsx
  기능: 규산염 광물의 결합 구조(SiO4 사면체 배열)를 그립니다.
    - 사면체 = 밑면 산소 3개 + 가운데 산소 1개 + 규소 1개.
      산소는 한 변이 2s인 삼각 격자의 변 한가운데에 놓아(카고메 배열) 산소 하나를
      사면체 둘이 나눠 쓰게 하고, 그 결과 판상 구조에 육각 구멍이 남습니다
    - 이웃한 사면체가 공유하는 산소는 원 하나로 합쳐 그립니다
    - 줄 수는 광물마다 고정(감람석·휘석 1줄, 각섬석 2줄, 흑운모 4줄)이고
      Si 수를 고르면 가로 길이가 정해집니다
  사용법: 그냥 실행하면 화면 중앙에 만듭니다
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectSilicateStructure/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var OXYGEN_STROKE_PT = 0.3;

    // rows = 줄 수(고정), counts = 고를 수 있는 Si 수. 가로 길이 = Si 수 ÷ 줄 수.
    var MINERALS = [
        {key: "olivine",   label: "감람석 (독립 구조)", rows: 1, counts: [1]},
        {key: "pyroxene",  label: "휘석 (단쇄상)",      rows: 1, counts: [3, 4, 5, 6]},
        {key: "amphibole", label: "각섬석 (복쇄상)",    rows: 2, counts: [8, 12, 16, 20]},
        {key: "biotite",   label: "흑운모 (판상)",      rows: 4, counts: [20, 28, 36, 40]}
    ];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var centerX = viewCenter[0];
    var centerY = viewCenter[1];

    var mineralIndex = 1;
    var siCount = 4;
    var vertical = false;       // 사슬·판이 자라는 방향. 켜면 세로로 길어진다.
    var oxygenMm = 4;
    var siliconMm = 1.6;
    var gapMm = 0;              // 한 사면체 안에서 산소 사이 빈 간격. 0이면 맞닿는다.
    var oxygenK = 0;
    var siliconK = 0;
    var lit3DOxygen = false;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;

    // 그라데이션은 문서당 하나만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지)
    var _oxygenGradient = null;

    applySavedSettings();

    var LABEL_WIDTH = 62;
    var UNIT_WIDTH = 26;        // 단위 글자 수가 달라도 뒤 요소가 어긋나지 않도록 고정
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 105;

    var dlg = new Window("dialog", "규산염 광물 결합 구조");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var mineralPanel = addPanel(dlg, "광물");
    var mineralRadios = [];
    for (var m = 0; m < MINERALS.length; m++) {
        mineralRadios[m] = mineralPanel.add("radiobutton", undefined, MINERALS[m].label);
    }
    mineralRadios[mineralIndex].value = true;

    var countRow = mineralPanel.add("group");
    countRow.alignChildren = ["left", "center"];
    var countLabel = countRow.add("statictext", undefined, "Si 수");
    countLabel.preferredSize.width = LABEL_WIDTH;
    var countRadios = [];
    for (var cr = 0; cr < 4; cr++) {
        countRadios[cr] = countRow.add("radiobutton", undefined, "");
        countRadios[cr].preferredSize.width = 52;
    }

    var directionRow = mineralPanel.add("group");
    directionRow.alignChildren = ["left", "center"];
    var directionLabel = directionRow.add("statictext", undefined, "방향");
    directionLabel.preferredSize.width = LABEL_WIDTH;
    var horizontalRadio = directionRow.add("radiobutton", undefined, "가로로 길게");
    var verticalRadio = directionRow.add("radiobutton", undefined, "세로로 길게");
    horizontalRadio.value = !vertical;
    verticalRadio.value = vertical;

    var sizePanel = addPanel(dlg, "크기");
    var oxygenField = addNumberField(sizePanel, "산소 지름", "mm", oxygenMm, 0.1, 0.5, 20);
    var siliconField = addNumberField(sizePanel, "규소 지름", "mm", siliconMm, 0.1, 0.2, 10);
    var gapField = addNumberField(sizePanel, "산소 간격", "mm", gapMm, 0.1, -2, 10);

    var shadePanel = addPanel(dlg, "음영");
    var oxygenKField = addNumberField(shadePanel, "산소", "K", oxygenK, 10, 0, 100);
    var siliconKField = addNumberField(shadePanel, "규소", "K", siliconK, 10, 0, 100);
    var lit3DCheck = shadePanel.add("checkbox", undefined, "산소 3D 조명 효과");
    lit3DCheck.value = lit3DOxygen;

    var positionPanel = addPanel(dlg, "위치");
    var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    // 위치는 구조를 다시 만들지 않고 미리보기 그룹만 옮긴다
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

    for (var mi = 0; mi < mineralRadios.length; mi++) {
        mineralRadios[mi].onClick = (function(index) {
            return function() {
                mineralIndex = index;
                fillCountList(siCount);
                updateDirectionState();
                updatePreview();
            };
        })(mi);
    }
    for (var ci = 0; ci < countRadios.length; ci++) {
        countRadios[ci].onClick = (function(index) {
            return function() {
                var counts = MINERALS[mineralIndex].counts;
                if (index >= counts.length) return;
                siCount = counts[index];
                updatePreview();
            };
        })(ci);
    }
    horizontalRadio.onClick = function() {
        vertical = false;
        updatePreview();
    };
    verticalRadio.onClick = function() {
        vertical = true;
        updatePreview();
    };
    lit3DCheck.onClick = function() {
        lit3DOxygen = lit3DCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    fillCountList(siCount);
    updateDirectionState();
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = drawStructure();
        moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        finalGroup.name = "Silicate " + MINERALS[mineralIndex].key;
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    // 밑면 산소는 한 변이 2s인 삼각 격자의 변 한가운데에 놓는다(카고메 배열).
    // 사면체 하나 = 격자 삼각형 하나의 변 중점 3개. 이웃한 사면체는 중점 하나씩만
    // 나눠 쓰므로 사슬은 지그재그가 되고 판에는 육각 구멍이 남는다.
    function buildLayout() {
        var mineral = MINERALS[mineralIndex];
        var rows = mineral.rows;
        var columns = Math.max(1, Math.round(siCount / rows));
        var step = (oxygenMm + gapMm) * MM_TO_PT;   // 한 사면체 안에서 산소 중심 사이 거리
        var rowHeight = step * Math.sqrt(3);

        var lattice = [];   // 이웃과 나눠 쓰는 밑면 산소
        var centers = [];   // 사면체 가운데: 산소 하나 + 규소 하나
        var j, k, i;

        function corner(ci, cj) {
            return [2 * step * ci + step * cj, rowHeight * cj];
        }
        function addTetrahedron(a, b, c) {
            var ab = midpoint(a, b);
            var bc = midpoint(b, c);
            var ca = midpoint(c, a);
            pushUnique(lattice, ab[0], ab[1]);
            pushUnique(lattice, bc[0], bc[1]);
            pushUnique(lattice, ca[0], ca[1]);
            centers.push([(ab[0] + bc[0] + ca[0]) / 3, (ab[1] + bc[1] + ca[1]) / 3]);
        }

        // 감람석(사면체 하나)은 아래 산소 2개 위에 산소 1개가 얹힌 모양으로 고정한다.
        // 아래를 향한 격자 삼각형의 변 중점이 그 배치가 된다.
        if (isSingle()) {
            addTetrahedron(corner(1, 0), corner(0, 1), corner(1, 1));
            return {lattice: lattice, centers: centers};
        }

        // 한 줄은 위를 향한 사면체와 아래를 향한 사면체가 번갈아 붙은 지그재그다.
        // 짝수 줄은 위쪽 사면체로, 홀수 줄은 아래쪽 사면체로 시작해야 모든 줄이 같은
        // 구간을 차지해 리본·판의 양 끝이 반듯해진다. 격자는 두 줄마다 제자리로
        // 돌아오므로 시작 칸도 그만큼 되돌린다.
        for (j = 0; j < rows; j++) {
            var oddRow = (j % 2 === 1);
            var start = oddRow ? -Math.floor((j + 1) / 2) : -Math.floor(j / 2);
            for (k = 0; k < columns; k++) {
                var pointsUp = oddRow ? (k % 2 === 1) : (k % 2 === 0);
                i = start + Math.floor((oddRow ? k + 1 : k) / 2);
                if (pointsUp) {
                    addTetrahedron(corner(i, j), corner(i + 1, j), corner(i, j + 1));
                } else {
                    addTetrahedron(corner(i + 1, j), corner(i, j + 1), corner(i + 1, j + 1));
                }
            }
        }
        if (vertical) {
            rotateQuarter(lattice);
            rotateQuarter(centers);
        }
        return {lattice: lattice, centers: centers};
    }

    function isSingle() {
        return MINERALS[mineralIndex].rows === 1 && siCount === 1;
    }

    // 사면체 하나짜리는 자라는 방향이 없다
    function updateDirectionState() {
        var single = isSingle();
        horizontalRadio.enabled = !single;
        verticalRadio.enabled = !single;
    }

    // 세로로 길게: 전체를 90도 돌린다
    function rotateQuarter(points) {
        for (var i = 0; i < points.length; i++) {
            var x = points[i][0];
            points[i][0] = -points[i][1];
            points[i][1] = x;
        }
    }

    function midpoint(a, b) {
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }

    function pushUnique(points, x, y) {
        for (var i = 0; i < points.length; i++) {
            if (Math.abs(points[i][0] - x) < 0.01 && Math.abs(points[i][1] - y) < 0.01) return;
        }
        points.push([x, y]);
    }

    function drawStructure() {
        var layout = buildLayout();
        var group = doc.activeLayer.groupItems.add();
        var oxygenDia = oxygenMm * MM_TO_PT;
        var siliconDia = siliconMm * MM_TO_PT;

        // 전체를 화면 중앙에 놓기 위한 이동량
        var shift = centerShift(layout, oxygenDia);
        var i, x, y;

        // 1. 공유 산소 → 2. 사면체 가운데 산소 → 3. 규소 순으로 쌓는다
        for (i = 0; i < layout.lattice.length; i++) {
            drawOxygen(group, layout.lattice[i][0] + shift[0],
                layout.lattice[i][1] + shift[1], oxygenDia);
        }
        for (i = 0; i < layout.centers.length; i++) {
            drawOxygen(group, layout.centers[i][0] + shift[0],
                layout.centers[i][1] + shift[1], oxygenDia);
        }
        for (i = 0; i < layout.centers.length; i++) {
            x = layout.centers[i][0] + shift[0];
            y = layout.centers[i][1] + shift[1];
            var silicon = group.pathItems.ellipse(y + siliconDia / 2, x - siliconDia / 2,
                siliconDia, siliconDia);
            silicon.stroked = false;   // 규소는 선 없음
            silicon.filled = true;
            silicon.fillColor = makeGray(siliconK);
        }
        return group;
    }

    function centerShift(layout, oxygenDia) {
        var minX = null, maxX = null, minY = null, maxY = null;
        var points = layout.lattice.concat(layout.centers);
        for (var i = 0; i < points.length; i++) {
            if (minX === null || points[i][0] < minX) minX = points[i][0];
            if (maxX === null || points[i][0] > maxX) maxX = points[i][0];
            if (minY === null || points[i][1] < minY) minY = points[i][1];
            if (maxY === null || points[i][1] > maxY) maxY = points[i][1];
        }
        return [centerX - (minX + maxX) / 2, centerY - (minY + maxY) / 2];
    }

    // 산소는 선이 있다. 3D 조명은 원자 모형의 핵과 같은 방사형 그라데이션을 클리핑해서 만들고,
    // 그 위에 면 없는 원을 얹어 테두리를 남긴다.
    function drawOxygen(group, x, y, dia) {
        var radius = dia / 2;
        if (lit3DOxygen) {
            var lit = group.groupItems.add();
            var highlightX = x - radius * 0.35;
            var highlightY = y + radius * 0.35;
            var big = radius * 1.7;
            var fill = lit.pathItems.ellipse(highlightY + big, highlightX - big, big * 2, big * 2);
            fill.filled = true;
            fill.stroked = false;
            var gradientColor = new GradientColor();
            gradientColor.gradient = getOxygenGradient();
            fill.fillColor = gradientColor;
            var mask = lit.pathItems.ellipse(y + radius, x - radius, dia, dia);
            mask.filled = false;
            mask.stroked = false;
            mask.clipping = true;
            lit.clipped = true;
        }

        var circle = group.pathItems.ellipse(y + radius, x - radius, dia, dia);
        circle.stroked = true;
        circle.strokeWidth = OXYGEN_STROKE_PT;
        circle.strokeColor = makeGray(100);
        if (lit3DOxygen) {
            circle.filled = false;
        } else {
            circle.filled = true;
            circle.fillColor = makeGray(oxygenK);
        }
        return circle;
    }

    // 산소 K는 전체 톤, 3D 조명은 그 위에 얹는 명암이다.
    // 규소가 어둡게 들어가므로 산소는 밝게: 하이라이트 = K의 절반, 가장자리 = K + 10.
    // 0K면 흰색 → 10K의 아주 연한 구슬이 된다(원자 모형 핵의 60K보다 훨씬 밝다).
    function getOxygenGradient() {
        var highlight = makeGray(Math.round(oxygenK * 0.5));
        var deep = makeGray(Math.min(100, oxygenK + 10));
        if (_oxygenGradient !== null) {
            try {
                _oxygenGradient.gradientStops[0].color = highlight;
                _oxygenGradient.gradientStops[1].color = deep;
                return _oxygenGradient;
            } catch (e) {
                _oxygenGradient = null;
            }
        }
        var gradient = doc.gradients.add();
        gradient.name = "SilicateOxygen_" + (new Date().getTime());
        gradient.type = GradientType.RADIAL;
        while (gradient.gradientStops.length < 2) gradient.gradientStops.add();
        gradient.gradientStops[0].rampPoint = 0;
        gradient.gradientStops[0].midPoint = 13.3;
        gradient.gradientStops[0].color = highlight;
        gradient.gradientStops[1].rampPoint = 100;
        gradient.gradientStops[1].color = deep;
        _oxygenGradient = gradient;
        return gradient;
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
        previewGroup = drawStructure();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        previewGroup.name = "Silicate Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function readFields(showAlert) {
        var oxygen = parseNumber(oxygenField.input.text);
        var silicon = parseNumber(siliconField.input.text);
        var gap = parseNumber(gapField.input.text);
        var oK = parseNumber(oxygenKField.input.text);
        var siK = parseNumber(siliconKField.input.text);
        var offX = parseNumber(offsetXField.input.text);
        var offY = parseNumber(offsetYField.input.text);

        if (oxygen === null || oxygen < 0.5 || oxygen > 20 ||
                silicon === null || silicon < 0.2 || silicon > 10) {
            if (showAlert) alert("산소와 규소 지름은 슬라이더 범위 안의 숫자로 입력해주세요.");
            return false;
        }
        if (gap === null || gap < -2 || gap > 10 || oxygen + gap < 0.2) {
            if (showAlert) alert("산소 간격은 -2부터 10mm 사이로, 산소 지름보다 작게 겹치도록 입력해주세요.");
            return false;
        }
        if (oK === null || oK < 0 || oK > 100 || siK === null || siK < 0 || siK > 100) {
            if (showAlert) alert("음영은 0부터 100 사이로 입력해주세요.");
            return false;
        }
        if (offX === null || offX < -POSITION_LIMIT_MM || offX > POSITION_LIMIT_MM ||
                offY === null || offY < -POSITION_LIMIT_MM || offY > POSITION_LIMIT_MM) {
            if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " +
                POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
            return false;
        }

        oxygenMm = oxygen;
        siliconMm = silicon;
        gapMm = gap;
        oxygenK = oK;
        siliconK = siK;
        lit3DOxygen = lit3DCheck.value;
        vertical = verticalRadio.value;
        offsetXmm = offX;
        offsetYmm = offY;
        return true;
    }

    // 고른 광물이 가진 Si 수만 라디오로 보여준다. 감람석은 1뿐이라 고를 것이 없다.
    function fillCountList(preferred) {
        var counts = MINERALS[mineralIndex].counts;
        var selectedIndex = 0;
        var i;
        for (i = 0; i < counts.length; i++) {
            if (counts[i] === preferred) selectedIndex = i;
        }
        for (i = 0; i < countRadios.length; i++) {
            var inUse = (i < counts.length);
            countRadios[i].text = inUse ? String(counts[i]) : "";
            countRadios[i].visible = inUse;
            countRadios[i].value = (i === selectedIndex);
        }
        siCount = counts[selectedIndex];
        try { dlg.layout.layout(true); } catch (layoutError) {}
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

    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
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

        var field = {row: row, input: input, slider: slider, step: step,
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

    // 위치 필드는 구조를 다시 만들지 않고 미리보기만 옮긴다
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
    // 설정 기억
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v3", mineralIndex, siCount, oxygenMm, siliconMm,
            oxygenK, siliconK, lit3DOxygen ? 1 : 0, offsetXmm, offsetYmm,
            vertical ? 1 : 0, gapMm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length < 12) return;

        var index = parseInt(p[1], 10);
        var count = parseInt(p[2], 10);
        var oxygen = parseFloat(p[3]);
        var silicon = parseFloat(p[4]);
        var oK = parseFloat(p[5]);
        var siK = parseFloat(p[6]);
        var offX = parseFloat(p[8]);
        var offY = parseFloat(p[9]);
        if (index >= 0 && index < MINERALS.length) mineralIndex = index;
        if (hasCount(MINERALS[mineralIndex].counts, count)) siCount = count;
        if (oxygen >= 0.5 && oxygen <= 20) oxygenMm = oxygen;
        if (silicon >= 0.2 && silicon <= 10) siliconMm = silicon;
        if (oK >= 0 && oK <= 100) oxygenK = oK;
        if (siK >= 0 && siK <= 100) siliconK = siK;
        lit3DOxygen = (p[7] === "1");
        vertical = (p[10] === "1");
        var gap = parseFloat(p[11]);
        if (gap >= -2 && gap <= 10) gapMm = gap;
        if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
        if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
    }

    function hasCount(counts, value) {
        for (var i = 0; i < counts.length; i++) {
            if (counts[i] === value) return true;
        }
        return false;
    }
})();
