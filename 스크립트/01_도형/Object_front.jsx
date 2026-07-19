(function() {
    if (app.documents.length === 0) { alert("문서를 열고 열린 패스를 선택해주세요."); return; }
    var doc = app.activeDocument;
    var source = getSelectedOpenPath(doc.selection);
    if (source === null) { alert("잠기지 않은 열린 패스 하나만 선택해주세요."); return; }
    // 일부 객체는 Illustrator 내부 상태가 손상되어 (layer 참조 불가, hidden/remove 거부)
    // 모든 DOM 조작이 실패한다. 복제본은 정상이므로 복제본으로 대체해 진행한다.
    try {
        var layerCheck = source.layer.name;
        source.hidden = source.hidden;
    } catch (eBroken) {
        try {
            var healed = source.duplicate(doc.activeLayer, ElementPlacement.PLACEATEND);
            source = healed;
            alert("선택한 선의 내부 상태가 손상되어 복제본으로 진행합니다.\n" +
                  "원본 선은 스크립트로 삭제할 수 없으니, 완료 후 직접 선택해 삭제해주세요.\n" +
                  "(문서를 저장 후 다시 열면 이런 손상이 해소되는 경우가 많습니다.)");
        } catch (eHeal) {
            alert("선택한 선이 손상되어 처리할 수 없습니다.\n문서를 저장 후 다시 열어 재시도해주세요.");
            return;
        }
    }

    var previousCoordinateSystem = app.coordinateSystem;
    try {
    app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
    var MM_TO_PT = 2.83464567;
    var shapeSizeMm = 2;
    var gapMm = 2;
    var strokeWidthPt = 0.5;
    var frontType = "warm";
    var colorMode = "standard";
    var kValue = 100;
    var hexValue = "FF0000";
    var lastValidHex = hexValue;
    var K_STEP = 10;
    var STANDARD_RED = "FF0000";
    var STANDARD_BLUE = "0000FF";
    var STANDARD_PURPLE = "7030A0";
    var reversed = false;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;
    var TRIANGLE_SCALE = 0.85; // 삼각형은 반원 대비 살짝 작게
    var pathMetrics = buildPathMetrics(source, 200);

    var dlg = new Window("dialog", "오브젝트 전선");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    var frontPanel = dlg.add("panel", undefined, "전선 종류");
    frontPanel.orientation = "column";
    frontPanel.alignChildren = "left";
    var warmRadio = frontPanel.add("radiobutton", undefined, "온난전선");
    var coldRadio = frontPanel.add("radiobutton", undefined, "한랭전선");
    var stationaryRadio = frontPanel.add("radiobutton", undefined, "정체전선");
    var occludedRadio = frontPanel.add("radiobutton", undefined, "폐색전선");
    warmRadio.value = true;

    var layoutPanel = dlg.add("panel", undefined, "도형 배치");
    layoutPanel.orientation = "column";
    layoutPanel.alignChildren = "fill";
    var shapeSizeControl = addNumericControl(layoutPanel, "도형 크기", shapeSizeMm, 0.5, 20, 0.1, "mm");
    var gapControl = addNumericControl(layoutPanel, "빈 간격", gapMm, 0, 20, 0.1, "mm");
    var reversedCheck = layoutPanel.add("checkbox", undefined, "방향 반전");

    var colorPanel = dlg.add("panel", undefined, "컬러");
    colorPanel.orientation = "column";
    colorPanel.alignChildren = "left";
    var standardColorRadio = colorPanel.add("radiobutton", undefined, "표준색");
    var kColorRadio = colorPanel.add("radiobutton", undefined, "K 음영");
    var kRow = colorPanel.add("group");
    var kDecreaseButton = kRow.add("button", undefined, "<");
    var kLabel = kRow.add("statictext", undefined, "100K");
    var kIncreaseButton = kRow.add("button", undefined, ">");
    var kBounds = colorPanel.add("group");
    kBounds.add("statictext", undefined, "50K");
    kBounds.add("statictext", undefined, "100K");
    var hexColorRadio = colorPanel.add("radiobutton", undefined, "HEX");
    var hexInput = colorPanel.add("edittext", undefined, hexValue);
    hexInput.characters = 8;
    standardColorRadio.value = true;
    kRow.enabled = false;
    kBounds.enabled = false;
    hexInput.enabled = false;

    var linePanel = dlg.add("panel", undefined, "라인");
    linePanel.orientation = "column";
    linePanel.alignChildren = "fill";
    var strokeWidthControl = addNumericControl(linePanel, "라인 두께", strokeWidthPt, 0.1, 10, 0.1, "pt");

    var previewCheck = dlg.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var buttons = dlg.add("group");
    buttons.alignment = "right";
    buttons.add("button", undefined, "확인", {name: "ok"});
    buttons.add("button", undefined, "취소", {name: "cancel"});

    warmRadio.onClick = function() { frontType = "warm"; updatePreview(); };
    coldRadio.onClick = function() { frontType = "cold"; updatePreview(); };
    stationaryRadio.onClick = function() { frontType = "stationary"; updatePreview(); };
    occludedRadio.onClick = function() { frontType = "occluded"; updatePreview(); };
    reversedCheck.onClick = function() { reversed = reversedCheck.value; updatePreview(); };
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    standardColorRadio.onClick = function() { setColorMode("standard"); };
    kColorRadio.onClick = function() { setColorMode("k"); };
    hexColorRadio.onClick = function() { setColorMode("hex"); };
    kDecreaseButton.onClick = function() { stepK(-10); };
    kIncreaseButton.onClick = function() { stepK(10); };
    hexInput.onChange = function() {
        var value = hexInput.text;
        if (!/^#?[0-9a-fA-F]{6}$/.test(value)) {
            alert("HEX 색상은 6자리 16진수로 입력해주세요.");
            hexInput.text = lastValidHex;
            return;
        }
        hexValue = normalizeHex(value);
        lastValidHex = hexValue;
        hexInput.text = hexValue;
        updatePreview();
    };

    bindNumericControl(shapeSizeControl, function(value) {
        shapeSizeMm = value;
        updatePreview();
    });
    bindNumericControl(gapControl, function(value) {
        gapMm = value;
        updatePreview();
    });
    bindNumericControl(strokeWidthControl, function(value) {
        strokeWidthPt = value;
        updatePreview();
    });

    function setColorMode(mode) {
        colorMode = mode;
        kRow.enabled = mode === "k";
        kBounds.enabled = mode === "k";
        hexInput.enabled = mode === "hex";
        updatePreview();
    }

    function stepK(delta) {
        delta = delta < 0 ? -K_STEP : K_STEP;
        kValue = clamp(kValue + delta, 50, 100);
        kLabel.text = kValue + "K";
        updatePreview();
    }

    updatePreview();
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        try {
            source.hidden = false;
            var finalGroup = tryCreateWeatherFront(false, 3);
            finalGroup.name = "Weather Front";
            try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
            source.remove();
            doc.selection = null;
            finalGroup.selected = true;
        } catch(e2) {
            try { if (typeof finalGroup !== "undefined" && finalGroup !== null) finalGroup.remove(); } catch(e3) {}
            source.hidden = sourceWasHidden;
            source.selected = true;
            if (e2 && e2.weatherFrontTooShort) alert("선택한 패스가 도형 크기보다 짧습니다.");
            else alert("전선을 만드는 중 오류가 발생했습니다.\n" + e2 + " (line " + e2.line + ")");
        }
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();
    } finally {
        app.coordinateSystem = previousCoordinateSystem;
    }

    // Illustrator가 연속 DOM 수정 중 간헐적으로 'Target layer cannot be modified' 등을
    // 던지는 경우가 있어 전선 생성 전체를 재시도한다
    function tryCreateWeatherFront(isPreview, attempts) {
        var lastError = null;
        for (var attempt = 0; attempt < attempts; attempt++) {
            try {
                return createWeatherFront(isPreview);
            } catch (e) {
                if (e && e.weatherFrontTooShort) throw e;
                lastError = e;
                try { $.sleep(100); app.redraw(); } catch (e2) {}
            }
        }
        throw lastError;
    }

    function updatePreview() {
        try {
            clearPreview();
            if (!previewEnabled) {
                restoreSourceAfterPreviewFailure();
                app.redraw();
                return;
            }
            source.hidden = true;
            source.selected = false;
            previewGroup = tryCreateWeatherFront(true, 2);
            if (previewGroup === null) {
                app.redraw();
                return;
            }
            previewGroup.name = "Weather Front Preview";
            try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
            app.redraw();
        } catch(e2) {
            // 일시적 오류: 다음 조작에서 미리보기가 다시 그려지므로 경고 없이 넘어간다
            clearPreview();
            restoreSourceAfterPreviewFailure();
            app.redraw();
        }
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function restoreSourceAfterPreviewFailure() {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }

    // 일부 손상된 객체는 .layer 접근이 'No such element'로 실패하므로
    // parent(레이어/그룹) → activeLayer 순으로 대체 컨테이너를 찾는다
    function getItemContainer(item) {
        try {
            if (item.layer) return item.layer;
        } catch (eLayer) {}
        try {
            var p = item.parent;
            if (p && (p.typename === "Layer" || p.typename === "GroupItem")) return p;
        } catch (eParent) {}
        return doc.activeLayer;
    }

    function createWeatherFront(isPreview) {
        var group = getItemContainer(source).groupItems.add();
        try {
            var shapeSize = shapeSizeMm * MM_TO_PT;
            var gap = gapMm * MM_TO_PT;
            var placements = getSymbolPlacements(pathMetrics.totalLength, shapeSize, gap);
            if (placements.length === 0) {
                group.remove();
                if (isPreview) return null;
                var tooShort = new Error("선택한 패스가 도형 크기보다 짧습니다.");
                tooShort.weatherFrontTooShort = true;
                throw tooShort;
            }
            if (frontType === "stationary" && colorMode === "standard") {
                var boundaries = getStationaryBoundaries(placements, pathMetrics.totalLength);
                drawStationaryBaseline(group, boundaries, [makeHexColor(STANDARD_RED), makeHexColor(STANDARD_BLUE)]);
            } else {
                var baseline = source.duplicate(group, ElementPlacement.PLACEATEND);
                baseline.hidden = false;
                baseline.selected = false;
                styleBaseline(baseline, getFrontColors(0));
            }
            drawSymbols(group, placements, shapeSize);
            return group;
        } catch(e) {
            try { group.remove(); } catch(e2) {}
            throw e;
        }
    }

    function drawSymbols(group, placements, shapeSize) {
        var normalSign = reversed ? -1 : 1;

        for (var placementIndex = 0; placementIndex < placements.length; placementIndex++) {
            var placement = placements[placementIndex];
            var instruction = getSymbolInstruction(frontType, placement.index, normalSign);
            var color = getFrontColors(placement.index);
            if (instruction.shape === "semicircle") {
                drawWarmSymbol(group, placement.centerDistance, shapeSize, instruction.side, color);
            } else {
                drawColdSymbol(group, placement.centerDistance, shapeSize, instruction.side, color);
            }
        }
        return placements.length;
    }

    // 지정 구간의 실제 곡선을 따라 점 목록 생성 (양 끝 포함)
    function collectCurvePoints(startDistance, endDistance, steps) {
        var points = [];
        for (var i = 0; i <= steps; i++) {
            var frame = getFrameAtLength(pathMetrics, startDistance + (endDistance - startDistance) * i / steps);
            points.push([frame.x, frame.y]);
        }
        return points;
    }

    // 유한한 좌표만 남기고 닫힌 칠 도형 생성 (비정상 좌표로 인한 PARM 오류 방지)
    function makeFilledShape(group, points, color) {
        var clean = [];
        for (var i = 0; i < points.length; i++) {
            var x = points[i][0], y = points[i][1];
            if (typeof x !== "number" || typeof y !== "number" || !isFinite(x) || !isFinite(y)) continue;
            if (clean.length > 0) {
                var prev = clean[clean.length - 1];
                if (Math.abs(prev[0] - x) < 0.0001 && Math.abs(prev[1] - y) < 0.0001) continue;
            }
            clean.push([x, y]);
        }
        if (clean.length < 3) return null;
        return buildFilledPath(group, clean, null, color);
    }

    // anchors + (선택) 핸들로 닫힌 칠 도형 생성.
    // handles[i] = null(코너) 또는 [[lx,ly],[rx,ry]].
    // Illustrator가 연속 도형 생성 중 간헐적으로 'Target layer cannot be modified' /
    // PARM 오류를 던지는 경우가 있어 redraw로 상태를 정리한 뒤 재시도한다
    function buildFilledPath(group, anchors, handles, color) {
        var lastError = null;
        for (var attempt = 0; attempt < 3; attempt++) {
            var shape = null;
            try {
                shape = group.pathItems.add();
                shape.setEntirePath(anchors);
                if (handles !== null) {
                    for (var hi = 0; hi < shape.pathPoints.length && hi < handles.length; hi++) {
                        if (handles[hi] === null) continue;
                        shape.pathPoints[hi].leftDirection = handles[hi][0];
                        shape.pathPoints[hi].rightDirection = handles[hi][1];
                    }
                }
                shape.closed = true;
                shape.stroked = false;
                shape.filled = true;
                shape.fillColor = color;
                return shape;
            } catch (eShape) {
                lastError = eShape;
                try { if (shape !== null) shape.remove(); } catch (eCleanup) {}
                try { $.sleep(30); app.redraw(); } catch (eRedraw) {}
            }
        }
        throw lastError;
    }

    // Douglas-Peucker 단순화: 직선 구간의 불필요한 앵커 제거
    function simplifyPolyline(pts, tol) {
        if (pts.length <= 2) return pts;
        var a = pts[0], b = pts[pts.length - 1];
        var maxD = -1, maxI = -1;
        for (var i = 1; i < pts.length - 1; i++) {
            var d = perpDistance(pts[i], a, b);
            if (d > maxD) { maxD = d; maxI = i; }
        }
        if (maxD <= tol) return [a, b];
        var left = simplifyPolyline(pts.slice(0, maxI + 1), tol);
        var right = simplifyPolyline(pts.slice(maxI), tol);
        return left.slice(0, left.length - 1).concat(right);
    }

    function perpDistance(p, a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1];
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.000001) {
            var px = p[0] - a[0], py = p[1] - a[1];
            return Math.sqrt(px * px + py * py);
        }
        return Math.abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0])) / len;
    }

    // 중심에서 반지름 r인 원이 곡선과 만나는 지점(호 길이)을 탐색. dir: -1 뒤쪽, +1 앞쪽
    function findCircleCrossing(centerDistance, center, radius, dir) {
        var step = radius / 8;
        var limit = pathMetrics.totalLength;
        var sPrev = centerDistance;
        var s = centerDistance;

        for (var i = 0; i < 96; i++) {
            s += dir * step;
            if (s <= 0) return 0;
            if (s >= limit) return limit;
            var p = getFrameAtLength(pathMetrics, s);
            var dxp = p.x - center.x, dyp = p.y - center.y;
            if (Math.sqrt(dxp * dxp + dyp * dyp) >= radius) {
                var lo = sPrev, hi = s;
                for (var j = 0; j < 24; j++) {
                    var mid = (lo + hi) / 2;
                    var pm = getFrameAtLength(pathMetrics, mid);
                    var dxm = pm.x - center.x, dym = pm.y - center.y;
                    if (Math.sqrt(dxm * dxm + dym * dym) < radius) lo = mid;
                    else hi = mid;
                }
                return (lo + hi) / 2;
            }
            sPrev = s;
        }
        return clamp(s, 0, limit);
    }

    // 온난 기호: 곡선 위 중심에 정원을 그린 뒤, 곡선과의 두 교점 사이의
    // 실제 곡선(밑변) + 법선 쪽 원호(윗변, 베지어)로 닫아 채운다
    function drawWarmSymbol(group, centerDistance, size, side, color) {
        var radius = size / 2;
        var center = getFrameAtLength(pathMetrics, centerDistance);
        var s1 = findCircleCrossing(centerDistance, center, radius, -1);
        var s2 = findCircleCrossing(centerDistance, center, radius, 1);

        // 밑변: 직선 구간의 불필요한 앵커 제거
        var basePoints = simplifyPolyline(collectCurvePoints(s1, s2, 16), 0.05);
        var first = basePoints[0];
        var last = basePoints[basePoints.length - 1];

        var angleA = Math.atan2(first[1] - center.y, first[0] - center.x);
        var angleB = Math.atan2(last[1] - center.y, last[0] - center.x);
        var bulgeAngle = Math.atan2(center.ny * side, center.nx * side);

        function normAngle(a) {
            var TWO_PI = Math.PI * 2;
            return ((a % TWO_PI) + TWO_PI) % TWO_PI;
        }

        // 마지막 교점(B)에서 첫 교점(A)으로, 법선 쪽을 지나는 방향으로 원호를 돈다
        var sweep = normAngle(angleA - angleB);
        if (normAngle(bulgeAngle - angleB) > sweep) sweep -= Math.PI * 2;

        // 원호를 90도 이하 베지어 세그먼트로 분할
        var segCount = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
        var segAngle = sweep / segCount;
        var handleLen = (4 / 3) * Math.tan(Math.abs(segAngle) / 4) * radius;
        var dirSign = segAngle >= 0 ? 1 : -1;

        function arcTangent(ang) {
            return [-Math.sin(ang) * dirSign, Math.cos(ang) * dirSign];
        }

        var anchors = basePoints.slice(0);
        var handles = [];
        for (var bi = 0; bi < basePoints.length; bi++) handles.push(null);

        // B(밑변 끝, 원호 시작): 나가는 핸들만 원호 방향
        var tB = arcTangent(angleB);
        handles[handles.length - 1] = [
            [last[0], last[1]],
            [last[0] + tB[0] * handleLen, last[1] + tB[1] * handleLen]
        ];

        // 원호 내부 앵커
        for (var ai = 1; ai < segCount; ai++) {
            var ang = angleB + segAngle * ai;
            var ax = center.x + radius * Math.cos(ang);
            var ay = center.y + radius * Math.sin(ang);
            var t = arcTangent(ang);
            anchors.push([ax, ay]);
            handles.push([
                [ax - t[0] * handleLen, ay - t[1] * handleLen],
                [ax + t[0] * handleLen, ay + t[1] * handleLen]
            ]);
        }

        // A(밑변 시작, 원호 끝): 들어오는 핸들만 원호 방향
        var tA = arcTangent(angleA);
        handles[0] = [
            [first[0] - tA[0] * handleLen, first[1] - tA[1] * handleLen],
            [first[0], first[1]]
        ];

        return buildFilledPath(group, anchors, handles, color);
    }

    // 꼭짓점에서 특정 방향으로 나가는 광선이 곡선(샘플 폴리라인)과 처음 만나는 지점
    function rayCurveIntersect(apex, dirX, dirY, centerDistance, searchRange) {
        var samples = pathMetrics.samples;
        var best = null;

        for (var i = 0; i < samples.length - 1; i++) {
            var p = samples[i], q = samples[i + 1];
            if (q.distance < centerDistance - searchRange) continue;
            if (p.distance > centerDistance + searchRange) break;

            var ex = q.x - p.x, ey = q.y - p.y;
            var denom = dirX * ey - dirY * ex;
            if (Math.abs(denom) < 0.0000001) continue;

            var wx = p.x - apex.x, wy = p.y - apex.y;
            var u = (wx * ey - wy * ex) / denom;
            var v = (wx * dirY - wy * dirX) / denom;
            if (u > 0.0001 && v >= 0 && v <= 1) {
                if (best === null || u < best.u) {
                    best = {u: u, s: p.distance + (q.distance - p.distance) * v};
                }
            }
        }
        return best;
    }

    // 한랭 기호: 법선 위 꼭짓점에서 이등변 빗변을 곡선과 만날 때까지 내리고,
    // 두 접점 사이의 실제 곡선을 밑변으로 하여 채운다
    function drawColdSymbol(group, centerDistance, size, side, color) {
        var scaled = size * TRIANGLE_SCALE;
        var halfBase = scaled / 2;
        var height = Math.sqrt(3) * scaled / 2;
        var frame = getFrameAtLength(pathMetrics, centerDistance);
        var apex = {
            x: frame.x + frame.nx * height * side,
            y: frame.y + frame.ny * height * side
        };

        // 직선일 때의 밑변 꼭짓점 방향으로 광선을 쏜다
        var cornerL = {x: frame.x - frame.tx * halfBase, y: frame.y - frame.ty * halfBase};
        var cornerR = {x: frame.x + frame.tx * halfBase, y: frame.y + frame.ty * halfBase};

        function rayTo(corner) {
            var dx = corner.x - apex.x, dy = corner.y - apex.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.0001) return null;
            return rayCurveIntersect(apex, dx / len, dy / len, centerDistance, size * 2.5);
        }

        var hitL = rayTo(cornerL);
        var hitR = rayTo(cornerR);

        if (hitL === null || hitR === null || Math.abs(hitL.s - hitR.s) < 0.001) {
            // 곡선과 만나지 않으면 직선 근사 삼각형으로 대체
            return drawTriangle(group, frame, scaled, side, color);
        }

        var sStart = Math.min(hitL.s, hitR.s);
        var sEnd = Math.max(hitL.s, hitR.s);
        var basePoints = simplifyPolyline(collectCurvePoints(sStart, sEnd, 12), 0.05);
        var points = [[apex.x, apex.y]];
        if (hitL.s <= hitR.s) {
            points = points.concat(basePoints);
        } else {
            for (var i = basePoints.length - 1; i >= 0; i--) points.push(basePoints[i]);
        }

        return makeFilledShape(group, points, color);
    }

    function getSymbolPlacements(totalLength, shapeSize, gap) {
        var placements = [];
        var unitLength = shapeSize + gap;
        for (var index = 0; shapeSize + index * unitLength <= totalLength; index++) {
            var centerDistance = shapeSize / 2 + index * unitLength;
            placements.push({index: index, centerDistance: centerDistance});
        }
        return placements;
    }

    function getSymbolInstruction(frontType, index, normalSign) {
        if (frontType === "warm") return {shape: "semicircle", side: normalSign};
        if (frontType === "cold") return {shape: "triangle", side: normalSign};
        if (frontType === "stationary") {
            return index % 2 === 0 ?
                {shape: "semicircle", side: normalSign} :
                {shape: "triangle", side: -normalSign};
        }
        if (frontType === "occluded") {
            return index % 2 === 0 ?
                {shape: "semicircle", side: normalSign} :
                {shape: "triangle", side: normalSign};
        }
        return null;
    }

    function getFrontColors(index) {
        if (colorMode === "k") return makeKColor(kValue);
        if (colorMode === "hex") return makeHexColor(hexValue);
        if (frontType === "warm") return makeHexColor(STANDARD_RED);
        if (frontType === "cold") return makeHexColor(STANDARD_BLUE);
        if (frontType === "occluded") return makeHexColor(STANDARD_PURPLE);
        return makeHexColor(index % 2 === 0 ? STANDARD_RED : STANDARD_BLUE);
    }

    function normalizeHex(value) {
        var text = String(value);
        if (!/^#?[0-9a-fA-F]{6}$/.test(text)) return null;
        return text.replace(/^#/, "").toUpperCase();
    }

    function hexToRgb(hex) {
        var value = normalizeHex(hex);
        return {
            red: parseInt(value.substr(0, 2), 16),
            green: parseInt(value.substr(2, 2), 16),
            blue: parseInt(value.substr(4, 2), 16)
        };
    }

    function rgbToCmyk(rgb) {
        var red = rgb.red / 255;
        var green = rgb.green / 255;
        var blue = rgb.blue / 255;
        var blackRatio = 1 - Math.max(red, green, blue);
        if (blackRatio >= 1) return {cyan: 0, magenta: 0, yellow: 0, black: 100};
        return {
            cyan: (1 - red - blackRatio) / (1 - blackRatio) * 100,
            magenta: (1 - green - blackRatio) / (1 - blackRatio) * 100,
            yellow: (1 - blue - blackRatio) / (1 - blackRatio) * 100,
            black: blackRatio * 100
        };
    }

    function kToRgb(k) {
        var channel = 255 * (1 - k / 100);
        return {red: channel, green: channel, blue: channel};
    }

    function makeHexColor(hex) {
        var rgb = hexToRgb(hex);
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmykValues = rgbToCmyk(rgb);
            var cmykColor = new CMYKColor();
            cmykColor.cyan = cmykValues.cyan;
            cmykColor.magenta = cmykValues.magenta;
            cmykColor.yellow = cmykValues.yellow;
            cmykColor.black = cmykValues.black;
            return cmykColor;
        }
        var rgbColor = new RGBColor();
        rgbColor.red = rgb.red;
        rgbColor.green = rgb.green;
        rgbColor.blue = rgb.blue;
        return rgbColor;
    }

    function makeKColor(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmykColor = new CMYKColor();
            cmykColor.cyan = 0;
            cmykColor.magenta = 0;
            cmykColor.yellow = 0;
            cmykColor.black = k;
            return cmykColor;
        }
        var rgb = kToRgb(k);
        var rgbColor = new RGBColor();
        rgbColor.red = rgb.red;
        rgbColor.green = rgb.green;
        rgbColor.blue = rgb.blue;
        return rgbColor;
    }

    function drawTriangle(group, frame, size, side, color) {
        var halfSize = size / 2;
        var height = Math.sqrt(3) * size / 2;
        var left = offsetFrame(frame, -frame.tx * halfSize, -frame.ty * halfSize);
        var right = offsetFrame(frame, frame.tx * halfSize, frame.ty * halfSize);
        var apex = offsetFrame(frame, frame.nx * height * side, frame.ny * height * side);
        return makeFilledShape(group, [[left.x, left.y], [right.x, right.y], [apex.x, apex.y]], color);
    }

    function offsetFrame(frame, x, y) {
        return {x: frame.x + x, y: frame.y + y};
    }

    function styleBaseline(baseline, color) {
        baseline.closed = false;
        baseline.stroked = true;
        baseline.filled = false;
        baseline.strokeColor = color;
        baseline.strokeWidth = strokeWidthPt;
    }

    function getStationaryBoundaries(placements, totalLength) {
        var boundaries = [0];
        for (var index = 0; index < placements.length - 1; index++) {
            boundaries.push((placements[index].centerDistance + placements[index + 1].centerDistance) / 2);
        }
        boundaries.push(totalLength);
        return boundaries;
    }

    function lerpPoint(first, second, t) {
        return {
            x: first.x + (second.x - first.x) * t,
            y: first.y + (second.y - first.y) * t
        };
    }

    function splitCubic(cubic, t) {
        var p01 = lerpPoint(cubic.p0, cubic.p1, t);
        var p12 = lerpPoint(cubic.p1, cubic.p2, t);
        var p23 = lerpPoint(cubic.p2, cubic.p3, t);
        var p012 = lerpPoint(p01, p12, t);
        var p123 = lerpPoint(p12, p23, t);
        var midpoint = lerpPoint(p012, p123, t);
        return {
            left: {p0: cubic.p0, p1: p01, p2: p012, p3: midpoint},
            right: {p0: midpoint, p1: p123, p2: p23, p3: cubic.p3}
        };
    }

    function extractCubicRange(cubic, startT, endT) {
        var endSplit = splitCubic(cubic, endT);
        if (startT <= 0) return endSplit.left;
        var normalizedStart = endT === 0 ? 0 : startT / endT;
        return splitCubic(endSplit.left, normalizedStart).right;
    }

    function drawStationaryBaseline(group, boundaries, colors) {
        for (var boundaryIndex = 0; boundaryIndex < boundaries.length - 1; boundaryIndex++) {
            var start = getFrameAtLength(pathMetrics, boundaries[boundaryIndex]);
            var end = getFrameAtLength(pathMetrics, boundaries[boundaryIndex + 1]);
            var pieces = [];
            for (var segmentIndex = start.segmentIndex; segmentIndex <= end.segmentIndex; segmentIndex++) {
                var startT = segmentIndex === start.segmentIndex ? start.t : 0;
                var endT = segmentIndex === end.segmentIndex ? end.t : 1;
                if (endT - startT > 0.0000001) {
                    pieces.push(extractCubicRange(pathMetrics.segments[segmentIndex], startT, endT));
                }
            }
            if (pieces.length === 0) continue;

            var anchors = [[pieces[0].p0.x, pieces[0].p0.y]];
            for (var pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
                anchors.push([pieces[pieceIndex].p3.x, pieces[pieceIndex].p3.y]);
            }
            var baseline = group.pathItems.add();
            baseline.setEntirePath(anchors);
            for (var pointIndex = 0; pointIndex < baseline.pathPoints.length; pointIndex++) {
                var anchor = baseline.pathPoints[pointIndex].anchor;
                baseline.pathPoints[pointIndex].leftDirection = anchor;
                baseline.pathPoints[pointIndex].rightDirection = anchor;
            }
            for (var handleIndex = 0; handleIndex < pieces.length; handleIndex++) {
                baseline.pathPoints[handleIndex].rightDirection = [pieces[handleIndex].p1.x, pieces[handleIndex].p1.y];
                baseline.pathPoints[handleIndex + 1].leftDirection = [pieces[handleIndex].p2.x, pieces[handleIndex].p2.y];
            }
            styleBaseline(baseline, colors[boundaryIndex % colors.length]);
        }
    }

    function buildPathMetrics(path, samplesPerSegment) {
        var segments = getCubicSegments(path);
        var samples = [];
        var distance = 0;
        if (segments.length === 0) return {samples: samples, segments: segments, totalLength: distance};

        var firstPoint = cubicPoint(segments[0].p0, segments[0].p1, segments[0].p2, segments[0].p3, 0);
        samples.push({distance: 0, segmentIndex: 0, t: 0, x: firstPoint.x, y: firstPoint.y});
        var previousPoint = firstPoint;
        for (var segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
            var segment = segments[segmentIndex];
            for (var sampleIndex = 1; sampleIndex <= samplesPerSegment; sampleIndex++) {
                var t = sampleIndex / samplesPerSegment;
                var point = cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, t);
                distance += distanceBetween(previousPoint, point);
                samples.push({distance: distance, segmentIndex: segmentIndex, t: t, x: point.x, y: point.y});
                previousPoint = point;
            }
        }
        return {samples: samples, segments: segments, totalLength: distance};
    }

    function getCubicSegments(path) {
        var points = path.pathPoints;
        var segments = [];
        for (var index = 0; index < points.length - 1; index++) {
            segments.push({
                p0: pointFromArray(points[index].anchor),
                p1: pointFromArray(points[index].rightDirection),
                p2: pointFromArray(points[index + 1].leftDirection),
                p3: pointFromArray(points[index + 1].anchor)
            });
        }
        return segments;
    }

    function pointFromArray(point) {
        return {x: point[0], y: point[1]};
    }

    function cubicPoint(p0, p1, p2, p3, t) {
        var inverseT = 1 - t;
        var inverseTSquared = inverseT * inverseT;
        var tSquared = t * t;
        return {
            x: inverseTSquared * inverseT * p0.x + 3 * inverseTSquared * t * p1.x + 3 * inverseT * tSquared * p2.x + tSquared * t * p3.x,
            y: inverseTSquared * inverseT * p0.y + 3 * inverseTSquared * t * p1.y + 3 * inverseT * tSquared * p2.y + tSquared * t * p3.y
        };
    }

    function cubicDerivative(p0, p1, p2, p3, t) {
        var inverseT = 1 - t;
        return {
            x: 3 * inverseT * inverseT * (p1.x - p0.x) + 6 * inverseT * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
            y: 3 * inverseT * inverseT * (p1.y - p0.y) + 6 * inverseT * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
        };
    }

    function getFrameAtLength(metrics, distance) {
        var samples = metrics.samples;
        if (samples.length === 0) return null;
        var clampedDistance = clamp(distance, 0, metrics.totalLength);
        var low = 0;
        var high = samples.length - 1;
        while (low < high) {
            var middle = Math.floor((low + high) / 2);
            if (samples[middle].distance < clampedDistance) low = middle + 1;
            else high = middle;
        }
        var after = samples[low];
        var before = low > 0 ? samples[low - 1] : after;
        var span = after.distance - before.distance;
        var ratio = span > 0 ? (clampedDistance - before.distance) / span : 0;
        var segmentIndex = before.segmentIndex;
        var t = before.t + (after.t - before.t) * ratio;
        if (after.segmentIndex !== before.segmentIndex && ratio > 0) {
            segmentIndex = after.segmentIndex;
            t = after.t * ratio;
        }
        var segment = metrics.segments[segmentIndex];
        var point = cubicPoint(segment.p0, segment.p1, segment.p2, segment.p3, t);
        var derivative = cubicDerivative(segment.p0, segment.p1, segment.p2, segment.p3, t);
        var magnitude = Math.sqrt(derivative.x * derivative.x + derivative.y * derivative.y);
        if (magnitude < 0.0001) {
            derivative = sampleDirection(samples, low);
            magnitude = Math.sqrt(derivative.x * derivative.x + derivative.y * derivative.y);
        }
        if (magnitude < 0.0001) derivative = {x: 1, y: 0};
        else {
            derivative.x /= magnitude;
            derivative.y /= magnitude;
        }
        return {
            x: point.x, y: point.y,
            tx: derivative.x, ty: derivative.y,
            nx: -derivative.y, ny: derivative.x,
            segmentIndex: segmentIndex, t: t
        };
    }

    function sampleDirection(samples, index) {
        var before = samples[Math.max(0, index - 1)];
        var after = samples[Math.min(samples.length - 1, index + 1)];
        return {x: after.x - before.x, y: after.y - before.y};
    }

    function distanceBetween(first, second) {
        var x = second.x - first.x;
        var y = second.y - first.y;
        return Math.sqrt(x * x + y * y);
    }

    function addNumericControl(parent, label, value, minimum, maximum, step, unit) {
        var row = parent.add("group");
        row.add("statictext", undefined, label);
        var input = row.add("edittext", undefined, formatNumber(value));
        input.characters = 6;
        row.add("statictext", undefined, unit);
        var slider = parent.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = 260;
        slider.stepdelta = step;
        return {
            input: input,
            slider: slider,
            step: step,
            minimum: minimum,
            maximum: maximum,
            value: value
        };
    }

    function bindNumericControl(control, onValueChanged) {
        function setValue(value, updateInput) {
            var normalized = clamp(roundTo(value, control.step), control.minimum, control.maximum);
            control.value = normalized;
            control.slider.value = normalized;
            if (updateInput) control.input.text = formatNumber(normalized);
            onValueChanged(normalized);
        }

        control.slider.onChanging = function() {
            setValue(control.slider.value, true);
        };
        control.input.onChanging = function() {
            var value = parseNumber(control.input.text);
            if (value !== null && value >= control.minimum && value <= control.maximum) {
                setValue(value, false);
            }
        };
        control.input.onChange = function() {
            var value = parseNumber(control.input.text);
            if (value === null) value = control.value;
            setValue(value, true);
        };
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/\s/g, "");
        if (normalized === "" || normalized === "+" || normalized === "-") return null;
        var value = Number(normalized);
        return isNaN(value) ? null : value;
    }

    function roundTo(value, step) {
        return Math.round(value / step) * step;
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function formatNumber(value) {
        return String(Math.round(value * 100) / 100);
    }

    function getSelectedOpenPath(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem") return null;
        if (item.closed || item.guides || item.clipping || item.locked) return null;
        // 일부 손상된 객체는 editable 조회만으로 PARM을 던지므로 조회 실패는 통과시킨다
        try {
            if (item.editable === false) return null;
        } catch (eEditable) {}
        return item;
    }
})();
