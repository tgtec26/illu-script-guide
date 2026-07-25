(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;
    var FRAME_WIDTH_PT = 0.3;
    var SCREEN_X = [0, 0, 0];
    var SCREEN_Y = [0, 0, 0];
    var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;
    var DIAMOND_NEIGHBOR_DISTANCE = Math.sqrt(3) / 4;

    function clamp(value, minValue, maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    }

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
    setProjectionAngles(131, 109, 100);

    var DIAMOND_BASIS = [
        [0, 0, 0],
        [0, 0.5, 0.5],
        [0.5, 0, 0.5],
        [0.5, 0.5, 0],
        [0.25, 0.25, 0.25],
        [0.25, 0.75, 0.75],
        [0.75, 0.25, 0.75],
        [0.75, 0.75, 0.25]
    ];

    function coordinateKey(point) {
        return (
            Math.round(point[0] * 10000) + "_" +
            Math.round(point[1] * 10000) + "_" +
            Math.round(point[2] * 10000)
        );
    }

    function diamondSitesInBounds(minimum, maximum) {
        var sites = [];
        var seen = {};
        var translationMinimum = Math.floor(minimum) - 1;
        var translationMaximum = Math.ceil(maximum) + 1;
        for (var tx = translationMinimum; tx <= translationMaximum; tx++) {
            for (var ty = translationMinimum; ty <= translationMaximum; ty++) {
                for (var tz = translationMinimum; tz <= translationMaximum; tz++) {
                    for (var basisIndex = 0; basisIndex < DIAMOND_BASIS.length; basisIndex++) {
                        var basis = DIAMOND_BASIS[basisIndex];
                        var point = [
                            basis[0] + tx,
                            basis[1] + ty,
                            basis[2] + tz
                        ];
                        if (
                            point[0] < minimum - 1e-9 || point[0] > maximum + 1e-9 ||
                            point[1] < minimum - 1e-9 || point[1] > maximum + 1e-9 ||
                            point[2] < minimum - 1e-9 || point[2] > maximum + 1e-9
                        ) continue;
                        var key = coordinateKey(point);
                        if (seen[key]) continue;
                        seen[key] = true;
                        sites.push({ p: point, key: key });
                    }
                }
            }
        }
        return sites;
    }

    // 주변 주기 셀까지 생성한 뒤 지정한 셀 경계 안의 원자만 남긴다.
    // 이 방식으로 꼭짓점과 여섯 면의 FCC 원자가 빠지지 않는다.
    function diamondSites(span) {
        return diamondSitesInBounds(0, span);
    }

    function diamondBonds(sites) {
        var bonds = [];
        var targetSquared = DIAMOND_NEIGHBOR_DISTANCE * DIAMOND_NEIGHBOR_DISTANCE;
        for (var i = 0; i < sites.length; i++) {
            for (var j = i + 1; j < sites.length; j++) {
                var dx = sites[i].p[0] - sites[j].p[0];
                var dy = sites[i].p[1] - sites[j].p[1];
                var dz = sites[i].p[2] - sites[j].p[2];
                var distanceSquared = dx * dx + dy * dy + dz * dz;
                if (Math.abs(distanceSquared - targetSquared) < 1e-8) {
                    bonds.push({ a: i, b: j });
                }
            }
        }
        return bonds;
    }

    // 셀 경계 원자의 셀 밖 최근접 이웃을 한 겹 포함해 모든 경계 탄소의
    // 네 정사면체 결합이 끊기지 않도록 한다.
    function completeDiamondNetwork(span) {
        var coreSites = diamondSites(span);
        var extendedSites = diamondSitesInBounds(-0.25, span + 0.25);
        var extendedBonds = diamondBonds(extendedSites);
        var coreKeys = {};
        var keepKeys = {};
        var i;
        for (i = 0; i < coreSites.length; i++) {
            coreKeys[coreSites[i].key] = true;
            keepKeys[coreSites[i].key] = true;
        }
        for (i = 0; i < extendedBonds.length; i++) {
            var siteA = extendedSites[extendedBonds[i].a];
            var siteB = extendedSites[extendedBonds[i].b];
            if (coreKeys[siteA.key] || coreKeys[siteB.key]) {
                keepKeys[siteA.key] = true;
                keepKeys[siteB.key] = true;
            }
        }
        var sites = [];
        var oldToNew = {};
        for (i = 0; i < extendedSites.length; i++) {
            if (!keepKeys[extendedSites[i].key]) continue;
            oldToNew[i] = sites.length;
            sites.push(extendedSites[i]);
        }
        var bonds = [];
        for (i = 0; i < extendedBonds.length; i++) {
            if (
                oldToNew[extendedBonds[i].a] !== undefined &&
                oldToNew[extendedBonds[i].b] !== undefined
            ) {
                bonds.push({
                    a: oldToNew[extendedBonds[i].a],
                    b: oldToNew[extendedBonds[i].b]
                });
            }
        }
        return { sites: sites, bonds: bonds, coreKeys: coreKeys };
    }

    // 세 개의 정사면체 단으로 이루어진 유한 피라미드 클러스터.
    // 기하학적 행은 1-1-3-3-6이며, 마지막 경계 탄소는 1~2개의
    // 결합만 남겨 피라미드 실루엣을 유지한다.
    function diamondPyramidGeometry(levels) {
        var bondLength = DIAMOND_NEIGHBOR_DISTANCE;
        // 관찰 투영에서도 각 행이 위아래로 분리되도록 높이 성분을 충분히 둔다.
        var layerDrop = bondLength * 0.68;
        var horizontalRadius = Math.sqrt(
            bondLength * bondLength - layerDrop * layerDrop
        );
        var directions = [];
        for (var directionIndex = 0; directionIndex < 3; directionIndex++) {
            var angle = directionIndex * Math.PI * 2 / 3;
            directions.push([
                horizontalRadius * Math.cos(angle),
                horizontalRadius * Math.sin(angle)
            ]);
        }
        var sites = [];
        var bonds = [];
        var apexIndex = sites.length;
        sites.push({
            p: [0, bondLength, 0],
            key: "pyramid_apex",
            tier: 0,
            row: 0
        });
        var upperCenterIndex = sites.length;
        sites.push({
            p: [0, 0, 0],
            key: "pyramid_upper_center",
            tier: 0,
            row: 1
        });
        bonds.push({ a: apexIndex, b: upperCenterIndex });

        var upperLowerIndices = [];
        var lowerCenterIndices = [];
        var i, j;
        for (i = 0; i < 3; i++) {
            upperLowerIndices[i] = sites.length;
            sites.push({
                p: [directions[i][0], -layerDrop, directions[i][1]],
                key: "pyramid_upper_lower_" + i,
                tier: 0,
                row: 2
            });
            bonds.push({ a: upperCenterIndex, b: upperLowerIndices[i] });

            lowerCenterIndices[i] = sites.length;
            sites.push({
                p: [
                    directions[i][0],
                    -layerDrop - bondLength,
                    directions[i][1]
                ],
                key: "pyramid_lower_center_" + i,
                tier: 1,
                row: 3
            });
            bonds.push({ a: upperLowerIndices[i], b: lowerCenterIndices[i] });
        }
        var lowerMap = {};
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {
                var lowerPoint = [
                    directions[i][0] + directions[j][0],
                    -bondLength - layerDrop * 2,
                    directions[i][1] + directions[j][1]
                ];
                var lowerKey = coordinateKey(lowerPoint);
                var lowerIndex = lowerMap[lowerKey];
                if (lowerIndex === undefined) {
                    lowerIndex = sites.length;
                    lowerMap[lowerKey] = lowerIndex;
                    sites.push({
                        p: lowerPoint,
                        key: "pyramid_lower_" + lowerKey,
                        tier: 2,
                        row: 4
                    });
                }
                bonds.push({ a: lowerCenterIndices[i], b: lowerIndex });
            }
        }
        return { sites: sites, bonds: bonds };
    }

    function cellEdgeSegments(span) {
        var segments = [];
        function add(a, b) { segments.push({ a: a, b: b }); }
        var x, y, z;
        for (x = 0; x < span; x++) {
            for (y = 0; y <= span; y++) {
                for (z = 0; z <= span; z++) add([x, y, z], [x + 1, y, z]);
            }
        }
        for (x = 0; x <= span; x++) {
            for (y = 0; y < span; y++) {
                for (z = 0; z <= span; z++) add([x, y, z], [x, y + 1, z]);
            }
        }
        for (x = 0; x <= span; x++) {
            for (y = 0; y <= span; y++) {
                for (z = 0; z < span; z++) add([x, y, z], [x, y, z + 1]);
            }
        }
        return segments;
    }

    function screenPoint(point, edge, ox, oy) {
        return [
            ox + edge * (
                SCREEN_X[0] * point[0] +
                SCREEN_X[1] * point[1] +
                SCREEN_X[2] * point[2]
            ),
            oy + edge * (
                SCREEN_Y[0] * point[0] +
                SCREEN_Y[1] * point[1] +
                SCREEN_Y[2] * point[2]
            )
        ];
    }

    function viewDepth(point) {
        return VIEW_X * point[0] + VIEW_Y * point[1] + VIEW_Z * point[2];
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

    function getCarbonGradient(documentRef) {
        if (gradientCache && gradientCacheDoc === documentRef) return gradientCache;
        var gradient = documentRef.gradients.add();
        gradient.name = "DiamondCarbon_" + (new Date().getTime());
        gradient.type = GradientType.RADIAL;
        while (gradient.gradientStops.length < 2) gradient.gradientStops.add();
        gradient.gradientStops[0].rampPoint = 0;
        gradient.gradientStops[0].midPoint = 13.3;
        gradient.gradientStops[1].rampPoint = 100;
        gradientCache = gradient;
        gradientCacheDoc = documentRef;
        return gradient;
    }

    function configureGradient(gradient, options) {
        if (options.colorMode === "color") {
            var light = adjustedRgb([220, 236, 244], options.brightness);
            var dark = adjustedRgb([65, 89, 105], options.brightness);
            gradient.gradientStops[0].color = rgbColor(light[0], light[1], light[2]);
            gradient.gradientStops[1].color = rgbColor(dark[0], dark[1], dark[2]);
        } else {
            gradient.gradientStops[0].color = kColor(adjustedK(0, options.brightness));
            gradient.gradientStops[1].color = kColor(adjustedK(80, options.brightness));
        }
    }

    function flatAtomColor(options) {
        if (options.colorMode === "color") {
            var rgb = adjustedRgb([92, 118, 134], options.brightness);
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
            outline.strokeWidth = FRAME_WIDTH_PT;
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
        circle.fillColor = flatAtomColor(options);
        circle.stroked = options.outline;
        if (options.outline) {
            circle.strokeWidth = FRAME_WIDTH_PT;
            circle.strokeColor = kColor(100);
        }
    }

    function projectedBounds(sites, span, edge, includeFrame) {
        var points = [];
        for (var i = 0; i < sites.length; i++) points.push(sites[i].p);
        if (includeFrame) {
            points.push([0, 0, 0], [span, 0, 0], [0, span, 0], [0, 0, span]);
            points.push([span, span, 0], [span, 0, span], [0, span, span], [span, span, span]);
        }
        var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
        for (i = 0; i < points.length; i++) {
            var projected = screenPoint(points[i], edge, 0, 0);
            if (projected[0] < left) left = projected[0];
            if (projected[0] > right) right = projected[0];
            if (projected[1] > top) top = projected[1];
            if (projected[1] < bottom) bottom = projected[1];
        }
        return [left, top, right, bottom];
    }

    function drawTrimmedLine(parent, a, b, trimRadius, width, color, dashed) {
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var length = Math.sqrt(dx * dx + dy * dy);
        var start = [a[0], a[1]], end = [b[0], b[1]];
        if (length > trimRadius * 2 + 0.01) {
            var ratio = trimRadius / length;
            start = [a[0] + dx * ratio, a[1] + dy * ratio];
            end = [b[0] - dx * ratio, b[1] - dy * ratio];
        }
        var line = parent.pathItems.add();
        line.setEntirePath([start, end]);
        line.filled = false;
        line.stroked = true;
        line.strokeWidth = width;
        line.strokeColor = color;
        if (dashed) line.strokeDashes = [3, 2];
    }

    function drawDiamond(options, targetParent) {
        setProjectionAngles(options.angleR, options.angleL, options.depthPercent);
        var documentRef = app.activeDocument;
        var parent = targetParent ? targetParent : documentRef.activeLayer;
        var group = parent.groupItems.add();
        group.name = "DiamondCrystal";
        var isPyramid = options.shape === "pyramid";
        var span = isPyramid ? options.pyramidLevels : options.cellSpan;
        var edge = options.cellMM * MM;
        var atomDiameter = options.atomMM * MM;
        var atomRadius = atomDiameter / 2 + options.bondWidth / 2;
        var geometry;
        if (isPyramid) {
            geometry = diamondPyramidGeometry(options.pyramidLevels);
        } else if (options.completeBoundary) {
            geometry = completeDiamondNetwork(span);
        } else {
            var cellSites = diamondSites(span);
            geometry = { sites: cellSites, bonds: diamondBonds(cellSites) };
        }
        var sites = geometry.sites;
        var bonds = geometry.bonds;
        var frames = isPyramid ? [] : cellEdgeSegments(span);
        var bounds = projectedBounds(sites, span, edge, !isPyramid && options.showCell);
        var artboard = documentRef.artboards[documentRef.artboards.getActiveArtboardIndex()].artboardRect;
        var ox = (artboard[0] + artboard[2]) / 2 - (bounds[0] + bounds[2]) / 2;
        var oy = (artboard[1] + artboard[3]) / 2 - (bounds[1] + bounds[3]) / 2;
        var centerDepth = 0;
        for (var depthIndex = 0; depthIndex < sites.length; depthIndex++) {
            centerDepth += viewDepth(sites[depthIndex].p);
        }
        centerDepth = sites.length > 0 ? centerDepth / sites.length : 0;
        var records = [];
        var i;

        if (options.showCell && !isPyramid) {
            for (i = 0; i < frames.length; i++) {
                var frameMidpoint = [
                    (frames[i].a[0] + frames[i].b[0]) / 2,
                    (frames[i].a[1] + frames[i].b[1]) / 2,
                    (frames[i].a[2] + frames[i].b[2]) / 2
                ];
                records.push({
                    type: "frame",
                    a: frames[i].a,
                    b: frames[i].b,
                    depth: viewDepth(frameMidpoint),
                    hidden: viewDepth(frameMidpoint) < centerDepth - 1e-9
                });
            }
        }
        if (options.showBonds) {
            for (i = 0; i < bonds.length; i++) {
                var bondA = sites[bonds[i].a].p;
                var bondB = sites[bonds[i].b].p;
                var bondMidpoint = [
                    (bondA[0] + bondB[0]) / 2,
                    (bondA[1] + bondB[1]) / 2,
                    (bondA[2] + bondB[2]) / 2
                ];
                records.push({
                    type: "bond",
                    a: bondA,
                    b: bondB,
                    depth: viewDepth(bondMidpoint),
                    hidden: viewDepth(bondMidpoint) < centerDepth - 1e-9
                });
            }
        }
        for (i = 0; i < sites.length; i++) {
            records.push({
                type: "atom",
                site: sites[i],
                depth: viewDepth(sites[i].p)
            });
        }
        records.sort(function(a, b) {
            var difference = a.depth - b.depth;
            if (Math.abs(difference) > 1e-9) return difference;
            if (a.type !== b.type) return a.type === "atom" ? 1 : -1;
            return 0;
        });

        var gradient = getCarbonGradient(documentRef);
        configureGradient(gradient, options);
        for (i = 0; i < records.length; i++) {
            var record = records[i];
            if (record.type === "atom") {
                var atomPoint = screenPoint(record.site.p, edge, ox, oy);
                drawSphere(group, atomPoint[0], atomPoint[1], atomDiameter, options, gradient);
            } else {
                var start = screenPoint(record.a, edge, ox, oy);
                var end = screenPoint(record.b, edge, ox, oy);
                var dashed = options.hiddenDashed && record.hidden && (isPyramid || span === 1);
                drawTrimmedLine(
                    group,
                    start,
                    end,
                    atomRadius,
                    record.type === "frame" ? FRAME_WIDTH_PT : options.bondWidth,
                    record.type === "frame" ? kColor(100) : kColor(85),
                    dashed
                );
            }
        }
        return group;
    }

    // --- ScriptUI ---
    var win = new Window("dialog", "다이아몬드 결정 구조 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 18;

    var pnlCell = win.add("panel", undefined, "셀 구성");
    pnlCell.orientation = "row";
    var radOneCell = pnlCell.add("radiobutton", undefined, "1셀");
    var radEightCells = pnlCell.add("radiobutton", undefined, "8셀 (2×2×2)");
    var radPyramid = pnlCell.add("radiobutton", undefined, "피라미드 클러스터");
    radOneCell.value = true;

    var pnlDisplay = win.add("panel", undefined, "표현 방식");
    pnlDisplay.orientation = "row";
    pnlDisplay.spacing = 16;
    var chkCell = pnlDisplay.add("checkbox", undefined, "단위세포 라인");
    chkCell.value = true;
    var chkBonds = pnlDisplay.add("checkbox", undefined, "C-C 결합선");
    chkBonds.value = true;
    var chkCompleteBoundary = pnlDisplay.add("checkbox", undefined, "경계 결합 완성");
    chkCompleteBoundary.value = true;
    var chkHiddenDashed = pnlDisplay.add("checkbox", undefined, "숨김선 점선 (해제: 실선)");
    chkHiddenDashed.value = true;

    var pnlOptions = win.add("panel", undefined, "옵션");
    pnlOptions.orientation = "row";
    pnlOptions.spacing = 16;
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
    var sliderSyncers = [];

    function addSlider(parent, labelText, minValue, maxValue, initialValue, formatter) {
        var row = parent.add("group");
        row.orientation = "row";
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = 112;
        var slider = row.add("slider", undefined, initialValue, minValue, maxValue);
        slider.preferredSize.width = 142;
        var valueText = row.add("statictext", undefined, formatter(initialValue));
        valueText.preferredSize.width = 52;
        slider.syncLabel = function() { valueText.text = formatter(slider.value); };
        slider.onChanging = function() { slider.syncLabel(); };
        slider.onChange = function() { slider.syncLabel(); updatePreview(); };
        sliderSyncers.push(slider.syncLabel);
        return slider;
    }

    function mmFormat(value) { return value.toFixed(1) + "mm"; }
    function percentFormat(value) { return Math.round(value) + "%"; }

    var pnlSize = pnlAdjust.add("panel", undefined, "크기·밝기 조절");
    pnlSize.orientation = "column";
    pnlSize.alignChildren = "left";
    pnlSize.spacing = 6;
    var sldCell = addSlider(pnlSize, "셀 한 변", 8, 80, 28, mmFormat);
    var pyramidInfoRow = pnlSize.add("group");
    var pyramidInfoLabel = pyramidInfoRow.add("statictext", undefined, "피라미드 층");
    pyramidInfoLabel.preferredSize.width = 112;
    pyramidInfoRow.add("statictext", undefined, "3층 (고정)");
    var sldAtom = addSlider(pnlSize, "탄소 구 지름", 1, 12, 4, mmFormat);
    var sldBondWidth = addSlider(pnlSize, "결합선 굵기", 0.1, 2, 0.5, function(v) {
        return v.toFixed(1) + "pt";
    });
    var sldBrightness = addSlider(pnlSize, "탄소 밝기", 40, 160, 100, percentFormat);

    var pnlView = pnlAdjust.add("panel", undefined, "관찰 각도");
    pnlView.orientation = "column";
    pnlView.alignChildren = "left";
    pnlView.spacing = 6;
    var sldAngleR = addSlider(pnlView, "오른쪽 각도", 91, 179, 131, function(v) {
        return Math.round(v) + "°";
    });
    var sldAngleL = addSlider(pnlView, "왼쪽 각도", 91, 179, 109, function(v) {
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
    var btnTetra = presetRow.add("button", undefined, "Tetrahedral");
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
    btnTetra.onClick = function() { setViewPreset(131, 109, 88); };
    updateTopAngleText();

    var btnGenerate = win.add("button", undefined, "다이아몬드 결정 구조 생성하기", { name: "ok" });
    btnGenerate.preferredSize.height = 40;

    function syncEnabled() {
        var isPyramid = radPyramid.value;
        chkCell.enabled = !isPyramid;
        chkCompleteBoundary.enabled = !isPyramid;
        chkHiddenDashed.enabled =
            (isPyramid || radOneCell.value) &&
            ((!isPyramid && chkCell.value) || chkBonds.value);
    }

    function collectOptions() {
        return {
            shape: radPyramid.value ? "pyramid" : "cell",
            cellSpan: radEightCells.value ? 2 : 1,
            pyramidLevels: 3,
            showCell: chkCell.value && !radPyramid.value,
            showBonds: chkBonds.value,
            completeBoundary: chkCompleteBoundary.value && !radPyramid.value,
            hiddenDashed: chkHiddenDashed.value && (radOneCell.value || radPyramid.value),
            lit3D: chkLit3D.value,
            outline: chkOutline.value,
            colorMode: radColor.value ? "color" : "gray",
            cellMM: sldCell.value,
            atomMM: sldAtom.value,
            bondWidth: sldBondWidth.value,
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
                if (documentRef.groupItems[i].name === "DiamondCrystal_Preview") {
                    try { documentRef.groupItems[i].remove(); } catch (e) {}
                }
            }
        } catch (e) {}
    }

    function updatePreview() {
        syncEnabled();
        clearPreview();
        if (!chkPreview.value) {
            try { app.redraw(); } catch (e) {}
            return;
        }
        try {
            var holder = app.activeDocument.activeLayer.groupItems.add();
            holder.name = "DiamondCrystal_Preview";
            previewItems = [holder];
            drawDiamond(collectOptions(), holder);
            app.redraw();
        } catch (e) {
            clearPreview();
        }
    }

    radOneCell.onClick = updatePreview;
    radEightCells.onClick = updatePreview;
    radPyramid.onClick = updatePreview;
    chkCell.onClick = updatePreview;
    chkBonds.onClick = updatePreview;
    chkCompleteBoundary.onClick = updatePreview;
    chkHiddenDashed.onClick = updatePreview;
    chkLit3D.onClick = updatePreview;
    chkOutline.onClick = updatePreview;
    chkPreview.onClick = updatePreview;
    radColor.onClick = updatePreview;
    radGray.onClick = updatePreview;

    var PREF_KEY = "DiamondCrystalMaker/settings";
    function collectSettings() {
        var options = collectOptions();
        return [
            "v1",
            options.cellSpan,
            options.showCell ? "1" : "0",
            options.showBonds ? "1" : "0",
            chkHiddenDashed.value ? "1" : "0",
            options.lit3D ? "1" : "0",
            options.outline ? "1" : "0",
            chkPreview.value ? "1" : "0",
            options.colorMode,
            options.cellMM,
            options.atomMM,
            options.bondWidth,
            options.brightness,
            options.angleR,
            options.angleL,
            options.depthPercent,
            options.shape,
            options.pyramidLevels,
            chkCompleteBoundary.value ? "1" : "0"
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
        if (parts[0] !== "v1" || parts.length < 16) return;
        try {
            radEightCells.value = parts[1] === "2";
            radOneCell.value = !radEightCells.value;
            chkCell.value = parts[2] === "1";
            chkBonds.value = parts[3] === "1";
            chkHiddenDashed.value = parts[4] === "1";
            chkLit3D.value = parts[5] === "1";
            chkOutline.value = parts[6] === "1";
            chkPreview.value = parts[7] === "1";
            radColor.value = parts[8] === "color";
            radGray.value = !radColor.value;
            sldCell.value = parseFloat(parts[9]);
            sldAtom.value = parseFloat(parts[10]);
            sldBondWidth.value = parseFloat(parts[11]);
            sldBrightness.value = parseFloat(parts[12]);
            sldAngleR.value = parseFloat(parts[13]);
            sldAngleL.value = parseFloat(parts[14]);
            sldDepth.value = parseFloat(parts[15]);
            if (parts.length >= 17) {
                radPyramid.value = parts[16] === "pyramid";
                if (radPyramid.value) {
                    radOneCell.value = false;
                    radEightCells.value = false;
                }
            }
            if (parts.length >= 19) chkCompleteBoundary.value = parts[18] === "1";
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
    syncEnabled();
    win.onShow = function() { updatePreview(); };
    var result = win.show();
    clearPreview();
    if (result === 1) {
        try {
            drawDiamond(collectOptions(), app.activeDocument.activeLayer);
            app.redraw();
        } catch (e) {
            alert("생성 오류: " + e.message);
        }
    }
})();
