(function() {
    if (app.documents.length === 0) { alert("문서를 열고 열린 패스를 선택해주세요."); return; }
    var doc = app.activeDocument;
    var source = getSelectedOpenPath(doc.selection);
    if (source === null) { alert("잠기지 않은 열린 패스 하나만 선택해주세요."); return; }
    var MM_TO_PT = 2.83464567;
    var shapeSizeMm = 2;
    var gapMm = 2;
    var strokeWidthPt = 0.5;
    var frontType = "warm";
    var reversed = false;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;
    var pathMetrics = buildPathMetrics(source, 80);

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
    colorPanel.add("statictext", undefined, "표준색");

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

    source.hidden = true;
    source.selected = false;
    try {
        updatePreview();
    } catch(e) {
        clearPreview();
        source.hidden = sourceWasHidden;
        source.selected = true;
        alert("미리보기를 만드는 중 오류가 발생했습니다.");
        app.redraw();
        return;
    }
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        try {
            source.hidden = false;
            var finalGroup = createWeatherFront(false);
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
            else alert("전선을 만드는 중 오류가 발생했습니다.");
        }
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = createWeatherFront(true);
        if (previewGroup === null) {
            app.redraw();
            return;
        }
        previewGroup.name = "Weather Front Preview";
        try { previewGroup.move(source, ElementPlacement.PLACEBEFORE); } catch(e) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch(e) {}
        previewGroup = null;
    }

    function createWeatherFront(isPreview) {
        var group = source.layer.groupItems.add();
        try {
            var baseline = source.duplicate(group, ElementPlacement.PLACEATEND);
            baseline.hidden = false;
            baseline.selected = false;
            baseline.strokeWidth = strokeWidthPt;
            if (drawSymbols(group) === 0) {
                group.remove();
                if (isPreview) return null;
                var tooShort = new Error("선택한 패스가 도형 크기보다 짧습니다.");
                tooShort.weatherFrontTooShort = true;
                throw tooShort;
            }
            return group;
        } catch(e) {
            try { group.remove(); } catch(e2) {}
            throw e;
        }
    }

    function drawSymbols(group) {
        var shapeSize = shapeSizeMm * MM_TO_PT;
        var gap = gapMm * MM_TO_PT;
        var unitLength = shapeSize + gap;
        var normalSign = reversed ? -1 : 1;
        var color = getPlaceholderColor();
        var count = 0;

        for (var index = 0; shapeSize + index * unitLength <= pathMetrics.totalLength; index++) {
            var centerDistance = shapeSize / 2 + index * unitLength;
            var frame = getFrameAtLength(pathMetrics, centerDistance);

            if (frontType === "warm") {
                drawSemicircle(group, frame, shapeSize, normalSign, color);
            } else if (frontType === "cold") {
                drawTriangle(group, frame, shapeSize, normalSign, color);
            } else if (frontType === "stationary") {
                if (index % 2 === 0) {
                    drawSemicircle(group, frame, shapeSize, normalSign, color);
                } else {
                    drawTriangle(group, frame, shapeSize, -normalSign, color);
                }
            } else if (frontType === "occluded") {
                if (index % 2 === 0) {
                    drawSemicircle(group, frame, shapeSize, normalSign, color);
                } else {
                    drawTriangle(group, frame, shapeSize, normalSign, color);
                }
            }
            count++;
        }
        return count;
    }

    function getPlaceholderColor() {
        if (source.stroked) return source.strokeColor;
        var color = new RGBColor();
        color.red = 0;
        color.green = 0;
        color.blue = 0;
        return color;
    }

    function drawTriangle(group, frame, size, side, color) {
        var halfSize = size / 2;
        var height = Math.sqrt(3) * size / 2;
        var left = offsetFrame(frame, -frame.tx * halfSize, -frame.ty * halfSize);
        var right = offsetFrame(frame, frame.tx * halfSize, frame.ty * halfSize);
        var apex = offsetFrame(frame, frame.nx * height * side, frame.ny * height * side);
        var triangle = group.pathItems.add();
        triangle.setEntirePath([[left.x, left.y], [right.x, right.y], [apex.x, apex.y]]);
        triangle.closed = true;
        triangle.stroked = false;
        triangle.filled = true;
        triangle.fillColor = color;
        return triangle;
    }

    function drawSemicircle(group, frame, size, side, color) {
        var halfSize = size / 2;
        var handleScale = 0.5522847498;
        var left = offsetFrame(frame, -frame.tx * halfSize, -frame.ty * halfSize);
        var right = offsetFrame(frame, frame.tx * halfSize, frame.ty * halfSize);
        var top = offsetFrame(frame, frame.nx * halfSize * side, frame.ny * halfSize * side);
        var semicircle = group.pathItems.add();
        semicircle.setEntirePath([[left.x, left.y], [top.x, top.y], [right.x, right.y]]);
        semicircle.closed = true;
        semicircle.stroked = false;
        semicircle.filled = true;
        semicircle.fillColor = color;

        semicircle.pathPoints[0].rightDirection = [
            left.x + frame.nx * halfSize * handleScale * side,
            left.y + frame.ny * halfSize * handleScale * side
        ];
        semicircle.pathPoints[0].leftDirection = [left.x, left.y];
        semicircle.pathPoints[1].leftDirection = [
            top.x - frame.tx * halfSize * handleScale,
            top.y - frame.ty * halfSize * handleScale
        ];
        semicircle.pathPoints[1].rightDirection = [
            top.x + frame.tx * halfSize * handleScale,
            top.y + frame.ty * halfSize * handleScale
        ];
        semicircle.pathPoints[2].leftDirection = [
            right.x + frame.nx * halfSize * handleScale * side,
            right.y + frame.ny * halfSize * handleScale * side
        ];
        semicircle.pathPoints[2].rightDirection = [right.x, right.y];
        return semicircle;
    }

    function offsetFrame(frame, x, y) {
        return {x: frame.x + x, y: frame.y + y};
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
        if (!item || item.typename !== "PathItem" || item.closed || item.guides || item.clipping || item.locked || item.editable === false) return null;
        return item;
    }
})();
