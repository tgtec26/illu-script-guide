// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var SQRT3 = Math.sqrt(3);
    var SCREEN_X = [0, 0, 0];
    var SCREEN_Y = [0, 0, 0];
    var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;

    function clamp(value, minValue, maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    }

    // Object_isometric.jsx와 같은 코너 각도 체계. x/z는 흑연 층,
    // y는 적층 방향이며 앞·뒤 면 거리는 z축 길이만 조절한다.
    function setProjectionAngles(angleR, angleL, depthPercent) {
        var alphaR = (angleR - 90) * Math.PI / 180;
        var alphaL = (angleL - 90) * Math.PI / 180;
        var depthScale = (depthPercent === undefined ? 100 : depthPercent) / 100;
        var cosR = Math.cos(alphaR), sinR = Math.sin(alphaR);
        var cosL = Math.cos(alphaL), sinL = Math.sin(alphaL);
        SCREEN_X = [cosR, 0, -depthScale * cosL];
        SCREEN_Y = [-sinR, 1, -depthScale * sinL];
        var rawView = [
            depthScale * cosL,
            depthScale * Math.sin(alphaR + alphaL),
            cosR
        ];
        var length = Math.sqrt(
            rawView[0] * rawView[0] +
            rawView[1] * rawView[1] +
            rawView[2] * rawView[2]
        );
        VIEW_X = rawView[0] / length;
        VIEW_Y = rawView[1] / length;
        VIEW_Z = rawView[2] / length;
    }
    setProjectionAngles(132, 108, 100);

    function pointKey(x, z) {
        return Math.round(x * 10000) + "_" + Math.round(z * 10000);
    }

    // 정육각형을 가로·세로로 융합하여 중복 원자와 중복 결합을 제거한다.
    function generateHoneycombSheet(columns, rows, shiftX, shiftZ) {
        var atoms = [];
        var bonds = [];
        var atomMap = {};
        var bondMap = {};

        function addAtom(x, z) {
            var key = pointKey(x, z);
            if (atomMap[key] !== undefined) return atomMap[key];
            var index = atoms.length;
            atoms.push({ x: x, z: z, key: key });
            atomMap[key] = index;
            return index;
        }

        function addBond(a, b) {
            var low = Math.min(a, b), high = Math.max(a, b);
            var key = low + "_" + high;
            if (bondMap[key]) return;
            bondMap[key] = true;
            bonds.push({ a: low, b: high });
        }

        for (var column = 0; column < columns; column++) {
            for (var row = 0; row < rows; row++) {
                var centerX = column * 1.5 + shiftX;
                var centerZ = SQRT3 * (row + (column % 2) * 0.5) + shiftZ;
                var vertexIndices = [];
                for (var corner = 0; corner < 6; corner++) {
                    var angle = corner * Math.PI / 3;
                    vertexIndices.push(addAtom(
                        centerX + Math.cos(angle),
                        centerZ + Math.sin(angle)
                    ));
                }
                for (corner = 0; corner < 6; corner++) {
                    addBond(vertexIndices[corner], vertexIndices[(corner + 1) % 6]);
                }
            }
        }
        return { atoms: atoms, bonds: bonds };
    }

    function buildGraphiteGeometry(columns, rows, layerCount, layerGapRatio, stacking, interlayer) {
        var atoms = [];
        var bonds = [];
        var layerMaps = [];
        var layerAtomIndices = [];

        for (var layer = 0; layer < layerCount; layer++) {
            var isShifted = stacking === "AB" && layer % 2 === 1;
            var sheet = generateHoneycombSheet(columns, rows, isShifted ? 1 : 0, 0);
            var indexMap = [];
            var positionMap = {};
            layerAtomIndices[layer] = [];
            for (var atomIndex = 0; atomIndex < sheet.atoms.length; atomIndex++) {
                var sheetAtom = sheet.atoms[atomIndex];
                var globalIndex = atoms.length;
                atoms.push({
                    p: [sheetAtom.x, layer * layerGapRatio, sheetAtom.z],
                    layer: layer,
                    sheetKey: sheetAtom.key
                });
                indexMap[atomIndex] = globalIndex;
                positionMap[sheetAtom.key] = globalIndex;
                layerAtomIndices[layer].push(globalIndex);
            }
            layerMaps[layer] = positionMap;
            for (var bondIndex = 0; bondIndex < sheet.bonds.length; bondIndex++) {
                bonds.push({
                    a: indexMap[sheet.bonds[bondIndex].a],
                    b: indexMap[sheet.bonds[bondIndex].b],
                    interlayer: false
                });
            }
        }

        if (interlayer) {
            for (layer = 1; layer < layerCount; layer++) {
                var lowerMap = layerMaps[layer - 1];
                var upperIndices = layerAtomIndices[layer];
                for (var upper = 0; upper < upperIndices.length; upper++) {
                    var upperIndex = upperIndices[upper];
                    var upperAtom = atoms[upperIndex];
                    if (lowerMap[upperAtom.sheetKey] !== undefined) {
                        bonds.push({
                            a: lowerMap[upperAtom.sheetKey],
                            b: upperIndex,
                            interlayer: true
                        });
                    }
                }
            }
        }
        return { atoms: atoms, bonds: bonds };
    }

    function screenPoint(p, scale, ox, oy) {
        return [
            ox + scale * (SCREEN_X[0] * p[0] + SCREEN_X[1] * p[1] + SCREEN_X[2] * p[2]),
            oy + scale * (SCREEN_Y[0] * p[0] + SCREEN_Y[1] * p[1] + SCREEN_Y[2] * p[2])
        ];
    }

    function viewDepth(p) {
        return VIEW_X * p[0] + VIEW_Y * p[1] + VIEW_Z * p[2];
    }

    function rgbColor(r, g, b) {
        var color = new RGBColor();
        color.red = clamp(r, 0, 255);
        color.green = clamp(g, 0, 255);
        color.blue = clamp(b, 0, 255);
        return color;
    }

    function kColor(k) {
        var color = new GrayColor();
        color.gray = clamp(k, 0, 100);
        return color;
    }

    function adjustedRgb(rgb, brightness) {
        var value = clamp(brightness, 40, 160);
        var result = [], i;
        if (value <= 100) {
            for (i = 0; i < 3; i++) result[i] = rgb[i] * value / 100;
        } else {
            var towardWhite = (value - 100) / 60;
            for (i = 0; i < 3; i++) {
                result[i] = rgb[i] + (255 - rgb[i]) * towardWhite;
            }
        }
        return result;
    }

    function adjustedK(k, brightness) {
        var value = clamp(brightness, 40, 160);
        if (value <= 100) return Math.min(90, k + (90 - k) * (100 - value) / 60);
        return Math.max(0, k * (160 - value) / 60);
    }

    var gradientCache = null;
    var gradientCacheDoc = null;

    function makeRadialGradient(doc, name) {
        var gradient = doc.gradients.add();
        gradient.name = name + "_" + (new Date().getTime());
        gradient.type = GradientType.RADIAL;
        while (gradient.gradientStops.length < 2) gradient.gradientStops.add();
        gradient.gradientStops[0].rampPoint = 0;
        gradient.gradientStops[0].midPoint = 13.3;
        gradient.gradientStops[1].rampPoint = 100;
        return gradient;
    }

    function getGradient(doc) {
        if (gradientCache && gradientCacheDoc === doc) return gradientCache;
        gradientCache = makeRadialGradient(doc, "GraphiteCarbon");
        gradientCacheDoc = doc;
        return gradientCache;
    }

    function configureGradient(gradient, options) {
        if (options.colorMode === "color") {
            var lightRgb = adjustedRgb([205, 218, 225], options.brightness);
            var darkRgb = adjustedRgb([42, 54, 62], options.brightness);
            gradient.gradientStops[0].color = rgbColor(lightRgb[0], lightRgb[1], lightRgb[2]);
            gradient.gradientStops[1].color = rgbColor(darkRgb[0], darkRgb[1], darkRgb[2]);
        } else {
            gradient.gradientStops[0].color = kColor(adjustedK(0, options.brightness));
            gradient.gradientStops[1].color = kColor(adjustedK(80, options.brightness));
        }
    }

    function flatCarbonColor(options) {
        if (options.colorMode === "color") {
            var rgb = adjustedRgb([72, 86, 96], options.brightness);
            return rgbColor(rgb[0], rgb[1], rgb[2]);
        }
        return kColor(adjustedK(55, options.brightness));
    }

    function drawLitSphere(parent, cx, cy, diameter, options, gradient) {
        var radius = diameter / 2;
        var highlightX = cx - radius * 0.35;
        var highlightY = cy + radius * 0.35;
        var gradientRadius = radius * 1.7;
        var sphereGroup = parent.groupItems.add();
        var clippedGroup = sphereGroup.groupItems.add();
        var gradientColor = new GradientColor();
        gradientColor.gradient = gradient;
        gradientColor.matrix = app.getIdentityMatrix();
        gradientColor.origin = [highlightX - gradientRadius, highlightY + gradientRadius];
        gradientColor.length = gradientRadius * 2;

        var largeCircle = clippedGroup.pathItems.ellipse(
            highlightY + gradientRadius,
            highlightX - gradientRadius,
            gradientRadius * 2,
            gradientRadius * 2
        );
        largeCircle.filled = true;
        largeCircle.stroked = false;
        largeCircle.fillColor = gradientColor;

        var mask = clippedGroup.pathItems.ellipse(
            cy + radius, cx - radius, diameter, diameter
        );
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        clippedGroup.clipped = true;

        if (options.outline) {
            var outline = sphereGroup.pathItems.ellipse(
                cy + radius, cx - radius, diameter, diameter
            );
            outline.filled = false;
            outline.stroked = true;
            outline.strokeWidth = LINE_WIDTH_PT;
            outline.strokeColor = kColor(100);
        }
    }

    function drawSphere(parent, cx, cy, diameter, options, gradient) {
        if (options.lit3D) {
            drawLitSphere(parent, cx, cy, diameter, options, gradient);
            return;
        }
        var radius = diameter / 2;
        var circle = parent.pathItems.ellipse(cy + radius, cx - radius, diameter, diameter);
        circle.filled = true;
        circle.fillColor = flatCarbonColor(options);
        circle.stroked = options.outline;
        if (options.outline) {
            circle.strokeWidth = LINE_WIDTH_PT;
            circle.strokeColor = kColor(100);
        }
    }

    function geometryProjectedBounds(geometry, scale) {
        var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
        for (var i = 0; i < geometry.atoms.length; i++) {
            var point = screenPoint(geometry.atoms[i].p, scale, 0, 0);
            if (point[0] < left) left = point[0];
            if (point[0] > right) right = point[0];
            if (point[1] > top) top = point[1];
            if (point[1] < bottom) bottom = point[1];
        }
        return [left, top, right, bottom];
    }

    function drawGraphite(options, targetParent) {
        setProjectionAngles(options.angleR, options.angleL, options.depthPercent);
        var documentRef = app.activeDocument;
        var parent = targetParent ? targetParent : documentRef.activeLayer;
        var group = parent.groupItems.add();
        group.name = "GraphiteCrystal";
        var scale = options.bondMM * MM;
        var layerGapRatio = options.layerGapMM / options.bondMM;
        var geometry = buildGraphiteGeometry(
            options.columns,
            options.rows,
            options.layers,
            layerGapRatio,
            options.stacking,
            options.interlayer
        );
        var bounds = geometryProjectedBounds(geometry, scale);
        var artboard = documentRef.artboards[documentRef.artboards.getActiveArtboardIndex()].artboardRect;
        var artCenterX = (artboard[0] + artboard[2]) / 2;
        var artCenterY = (artboard[1] + artboard[3]) / 2;
        var projectedCenterX = (bounds[0] + bounds[2]) / 2;
        var projectedCenterY = (bounds[1] + bounds[3]) / 2;
        var ox = artCenterX - projectedCenterX;
        var oy = artCenterY - projectedCenterY;
        var atomDiameter = options.atomMM * MM;
        var atomRadius = atomDiameter / 2 + LINE_WIDTH_PT / 2;
        var records = [];

        for (var bondIndex = 0; bondIndex < geometry.bonds.length; bondIndex++) {
            var bond = geometry.bonds[bondIndex];
            var atomA = geometry.atoms[bond.a];
            var atomB = geometry.atoms[bond.b];
            records.push({
                type: "bond",
                a: atomA.p,
                b: atomB.p,
                interlayer: bond.interlayer,
                depth: (viewDepth(atomA.p) + viewDepth(atomB.p)) / 2
            });
        }
        for (var atomIndex = 0; atomIndex < geometry.atoms.length; atomIndex++) {
            records.push({
                type: "atom",
                atom: geometry.atoms[atomIndex],
                depth: viewDepth(geometry.atoms[atomIndex].p)
            });
        }
        records.sort(function(a, b) {
            var difference = a.depth - b.depth;
            if (Math.abs(difference) > 1e-9) return difference;
            if (a.type !== b.type) return a.type === "bond" ? -1 : 1;
            return 0;
        });

        var gradient = getGradient(documentRef);
        configureGradient(gradient, options);
        for (var recordIndex = 0; recordIndex < records.length; recordIndex++) {
            var record = records[recordIndex];
            if (record.type === "atom") {
                var atomPoint = screenPoint(record.atom.p, scale, ox, oy);
                drawSphere(group, atomPoint[0], atomPoint[1], atomDiameter, options, gradient);
            } else {
                var start = screenPoint(record.a, scale, ox, oy);
                var end = screenPoint(record.b, scale, ox, oy);
                var dx = end[0] - start[0], dy = end[1] - start[1];
                var screenLength = Math.sqrt(dx * dx + dy * dy);
                if (screenLength > atomRadius * 2 + 0.01) {
                    var trim = atomRadius / screenLength;
                    start = [start[0] + dx * trim, start[1] + dy * trim];
                    end = [end[0] - dx * trim, end[1] - dy * trim];
                }
                var line = group.pathItems.add();
                line.setEntirePath([start, end]);
                line.filled = false;
                line.stroked = true;
                line.strokeWidth = LINE_WIDTH_PT;
                line.strokeColor = record.interlayer ? kColor(65) : kColor(100);
                if (record.interlayer) line.strokeDashes = [3, 2];
            }
        }
        return group;
    }

    // --- ScriptUI ---
    var win = new Window("dialog", "흑연 결정 구조 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 18;

    var pnlStack = win.add("panel", undefined, "적층 구조");
    pnlStack.orientation = "row";
    pnlStack.alignChildren = "left";
    var radAB = pnlStack.add("radiobutton", undefined, "AB 적층 (흑연)");
    var radAA = pnlStack.add("radiobutton", undefined, "AA 적층");
    radAB.value = true;

    var pnlOptions = win.add("panel", undefined, "표현 옵션");
    pnlOptions.orientation = "row";
    pnlOptions.alignChildren = "left";
    pnlOptions.spacing = 16;
    var chkInterlayer = pnlOptions.add("checkbox", undefined, "층간 점선");
    chkInterlayer.value = true;
    var chkLit3D = pnlOptions.add("checkbox", undefined, "구 3D 조명 효과");
    chkLit3D.value = true;
    var chkOutline = pnlOptions.add("checkbox", undefined, "구 외곽선");
    chkOutline.value = true;
    var chkPreview = pnlOptions.add("checkbox", undefined, "미리보기 실시간 표시");
    chkPreview.value = true;

    var pnlColor = win.add("panel", undefined, "색상 표현");
    pnlColor.orientation = "row";
    var radColor = pnlColor.add("radiobutton", undefined, "컬러");
    var radGray = pnlColor.add("radiobutton", undefined, "회색 음영");
    radGray.value = true;

    var pnlAdjust = win.add("group");
    pnlAdjust.orientation = "row";
    pnlAdjust.alignChildren = ["fill", "top"];
    pnlAdjust.spacing = 10;

    var pnlGeometry = pnlAdjust.add("panel", undefined, "격자·크기 조절");
    pnlGeometry.orientation = "column";
    pnlGeometry.alignChildren = "left";
    pnlGeometry.spacing = 6;
    var sliderSyncers = [];

    function addSlider(parent, labelText, minValue, maxValue, initialValue, formatValue) {
        var row = parent.add("group");
        row.orientation = "row";
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = 112;
        var slider = row.add("slider", undefined, initialValue, minValue, maxValue);
        slider.preferredSize.width = 142;
        var valueText = row.add("statictext", undefined, formatValue(initialValue));
        valueText.preferredSize.width = 52;
        slider.syncLabel = function() { valueText.text = formatValue(slider.value); };
        slider.onChanging = function() { slider.syncLabel(); };
        slider.onChange = function() { slider.syncLabel(); updatePreview(); };
        sliderSyncers.push(slider.syncLabel);
        return slider;
    }

    function integerFormat(value) { return String(Math.round(value)); }
    function mmFormat(value) { return value.toFixed(1) + "mm"; }
    function percentFormat(value) { return Math.round(value) + "%"; }

    var sldColumns = addSlider(pnlGeometry, "가로 육각형", 1, 10, 4, integerFormat);
    var sldRows = addSlider(pnlGeometry, "세로 육각형", 1, 8, 3, integerFormat);
    var sldLayers = addSlider(pnlGeometry, "적층 수", 1, 8, 3, integerFormat);
    var sldBond = addSlider(pnlGeometry, "C-C 결합 길이", 2, 15, 6, mmFormat);
    var sldLayerGap = addSlider(pnlGeometry, "층간 거리", 3, 35, 14, mmFormat);
    var sldAtom = addSlider(pnlGeometry, "탄소 구 지름", 1, 12, 4, mmFormat);
    var sldBrightness = addSlider(pnlGeometry, "탄소 밝기", 40, 160, 100, percentFormat);

    var pnlView = pnlAdjust.add("panel", undefined, "관찰 각도");
    pnlView.orientation = "column";
    pnlView.alignChildren = "left";
    pnlView.spacing = 6;
    var sldAngleR = addSlider(pnlView, "오른쪽 각도", 91, 179, 132, function(v) {
        return Math.round(v) + "°";
    });
    var sldAngleL = addSlider(pnlView, "왼쪽 각도", 91, 179, 108, function(v) {
        return Math.round(v) + "°";
    });
    var sldDepth = addSlider(pnlView, "앞·뒤 면 거리", 40, 160, 100, percentFormat);
    var topAngleRow = pnlView.add("group");
    topAngleRow.add("statictext", undefined, "상단 각도(자동):");
    var txtTopAngle = topAngleRow.add("statictext", undefined, "120°");

    function updateTopAngleText() {
        txtTopAngle.text = Math.round(360 - sldAngleR.value - sldAngleL.value) + "°";
    }

    var originalAngleRChange = sldAngleR.onChange;
    var originalAngleLChange = sldAngleL.onChange;
    sldAngleR.onChanging = function() { sldAngleR.syncLabel(); updateTopAngleText(); };
    sldAngleL.onChanging = function() { sldAngleL.syncLabel(); updateTopAngleText(); };
    sldAngleR.onChange = function() {
        sldAngleR.syncLabel(); updateTopAngleText(); originalAngleRChange();
    };
    sldAngleL.onChange = function() {
        sldAngleL.syncLabel(); updateTopAngleText(); originalAngleLChange();
    };

    var presetRow = pnlView.add("group");
    var btnIso = presetRow.add("button", undefined, "Isometric");
    var btnLayered = presetRow.add("button", undefined, "Layered");
    function setViewPreset(rightAngle, leftAngle, depth) {
        sldAngleR.value = rightAngle;
        sldAngleL.value = leftAngle;
        sldDepth.value = depth;
        sldAngleR.syncLabel();
        sldAngleL.syncLabel();
        sldDepth.syncLabel();
        updateTopAngleText();
        updatePreview();
    }
    btnIso.onClick = function() { setViewPreset(120, 120, 100); };
    btnLayered.onClick = function() { setViewPreset(132, 108, 78); };
    updateTopAngleText();

    var btnGenerate = win.add("button", undefined, "흑연 결정 구조 생성하기", { name: "ok" });
    btnGenerate.preferredSize.height = 40;

    function collectOptions() {
        return {
            stacking: radAB.value ? "AB" : "AA",
            interlayer: chkInterlayer.value,
            lit3D: chkLit3D.value,
            outline: chkOutline.value,
            colorMode: radColor.value ? "color" : "gray",
            columns: Math.round(sldColumns.value),
            rows: Math.round(sldRows.value),
            layers: Math.round(sldLayers.value),
            bondMM: sldBond.value,
            layerGapMM: sldLayerGap.value,
            atomMM: sldAtom.value,
            brightness: sldBrightness.value,
            angleR: sldAngleR.value,
            angleL: sldAngleL.value,
            depthPercent: sldDepth.value
        };
    }

    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) {
            try { previewItems[i].remove(); } catch (e) {}
        }
        previewItems = [];
    }

    function removeLeftoverPreviews() {
        try {
            var documentRef = app.activeDocument;
            for (var i = documentRef.groupItems.length - 1; i >= 0; i--) {
                if (documentRef.groupItems[i].name === "GraphiteCrystal_Preview") {
                    try { documentRef.groupItems[i].remove(); } catch (e) {}
                }
            }
        } catch (e) {}
    }

    function updatePreview() {
        clearPreview();
        if (!chkPreview.value) {
            try { app.redraw(); } catch (e) {}
            return;
        }
        try {
            var holder = app.activeDocument.activeLayer.groupItems.add();
            holder.name = "GraphiteCrystal_Preview";
            previewItems = [holder];
            drawGraphite(collectOptions(), holder);
            app.redraw();
        } catch (e) {
            clearPreview();
        }
    }

    radAB.onClick = updatePreview;
    radAA.onClick = updatePreview;
    chkInterlayer.onClick = updatePreview;
    chkLit3D.onClick = updatePreview;
    chkOutline.onClick = updatePreview;
    radColor.onClick = updatePreview;
    radGray.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

    var PREF_KEY = "GraphiteCrystalMaker/settings";
    function collectSettings() {
        var options = collectOptions();
        return [
            "v1",
            options.stacking,
            options.interlayer ? "1" : "0",
            options.lit3D ? "1" : "0",
            options.outline ? "1" : "0",
            chkPreview.value ? "1" : "0",
            options.colorMode,
            options.columns,
            options.rows,
            options.layers,
            options.bondMM,
            options.layerGapMM,
            options.atomMM,
            options.brightness,
            options.angleR,
            options.angleL,
            options.depthPercent
        ].join("|");
    }

    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, collectSettings()); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var parts = raw.split("|");
        if (parts[0] !== "v1" || parts.length < 17) return;
        try {
            radAB.value = parts[1] !== "AA";
            radAA.value = !radAB.value;
            chkInterlayer.value = parts[2] === "1";
            chkLit3D.value = parts[3] === "1";
            chkOutline.value = parts[4] === "1";
            chkPreview.value = parts[5] === "1";
            radColor.value = parts[6] === "color";
            radGray.value = !radColor.value;
            sldColumns.value = parseFloat(parts[7]);
            sldRows.value = parseFloat(parts[8]);
            sldLayers.value = parseFloat(parts[9]);
            sldBond.value = parseFloat(parts[10]);
            sldLayerGap.value = parseFloat(parts[11]);
            sldAtom.value = parseFloat(parts[12]);
            sldBrightness.value = parseFloat(parts[13]);
            sldAngleR.value = parseFloat(parts[14]);
            sldAngleL.value = parseFloat(parts[15]);
            sldDepth.value = parseFloat(parts[16]);
            for (var i = 0; i < sliderSyncers.length; i++) sliderSyncers[i]();
            updateTopAngleText();
        } catch (e) {}
    }

    btnGenerate.onClick = function() {
        saveSettings();
        win.close(1);
    };

    removeLeftoverPreviews();
    applySettings();
    win.onShow = function() { updatePreview(); };
    var result = win.show();
    clearPreview();
    if (result === 1) {
        try {
            drawGraphite(collectOptions(), app.activeDocument.activeLayer);
            app.redraw();
        } catch (e) {
            alert("생성 오류: " + e.message);
        }
    }
})();
