// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_PhospholipidBilayer.jsx
  기능: 선을 따라 인지질을 두 줄로 세워 인지질 2중층을 만듭니다.
    - 선의 각 지점에서 접선과 직각인 법선 방향으로 인지질을 세웁니다.
    - 선 위쪽과 아래쪽에 한 층씩 배치하고, 아래층은 180° 뒤집어
      양쪽 모두 머리(원본의 위쪽)가 바깥, 꼬리가 선 쪽을 향하게 합니다.
    - 곡선 보정: 층마다 자기 평행 곡선 위에서 간격을 재므로, 굽은 구간에서
      바깥층 인지질이 몇 개 더 들어가고 안쪽층 머리가 겹치지 않습니다.
      "보정 시작 반지름"보다 완만한 굽이는 직선과 똑같이 배치합니다.
    - 곡선과 닫힌 패스도 지원합니다. 닫힌 패스는 간격을 둘레에 맞춰 균등 분배합니다.
  사용법: 기준선 하나와 인지질 하나를 함께 선택한 뒤 실행.
         둘 중 더 긴 쪽을 기준선으로 봅니다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 기준선과 인지질을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectPhospholipidBilayer/settings";
    var MM = 2.834645669;
    var SAMPLES_PER_SEGMENT = 60;
    var MAX_PER_LAYER = 300;    // 한 층의 인지질 개수 상한(간격을 너무 좁히면 문서가 멈춘다)

    var doc = app.activeDocument;
    var picked = pickLineAndUnit(doc.selection);
    if (picked === null) {
        alert("기준선 하나와 인지질 하나, 모두 두 개를 선택해주세요.\n\n" +
            "둘 중 더 긴 쪽을 기준선으로 보며, 기준선은 패스여야 합니다.");
        return;
    }

    var linePath = picked.line;
    var unitItem = picked.unit;
    var pathMetrics = buildPathMetrics(linePath, SAMPLES_PER_SEGMENT);
    if (pathMetrics.totalLength <= 0) {
        alert("기준선의 길이가 0입니다. 길이가 있는 패스를 선택해주세요.");
        return;
    }

    var unitBounds = unitItem.visibleBounds; // [left, top, right, bottom]
    var unitHeight = unitBounds[1] - unitBounds[3];
    var unitCenterX = (unitBounds[0] + unitBounds[2]) / 2;
    var unitCenterY = (unitBounds[1] + unitBounds[3]) / 2;
    if (unitHeight <= 0) {
        alert("인지질의 높이가 0입니다. 세로 크기가 있는 개체를 선택해주세요.");
        return;
    }

    var gapMm = 0.2;        // 선과 인지질 꼬리 끝 사이 거리
    var spacingMm = 2;      // 이웃한 인지질의 중심 간 거리
    var curvatureFixPercent = 100;  // 곡선 보정: 간격을 재는 기준선을 머리 높이까지 밀어내는 비율
    var startRadiusMm = 15;         // 굽이 반지름이 이 값보다 작아질 때부터 보정한다
    var previewEnabled = true;
    var previewGroup = null;
    var lineWasHidden = linePath.hidden;
    var unitWasHidden = unitItem.hidden;

    applySavedSettings();

    // 가장 긴 라벨("보정 시작 반지름")이 잘리지 않는 너비.
    var LABEL_WIDTH = 108;
    var UNIT_WIDTH = 26;        // mm와 % 폭이 달라 뒤 요소가 어긋나지 않도록 고정
    var INPUT_WIDTH = 54;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 180;

    var dlg = new Window("dialog", "인지질 2중층");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var spacingPanel = addPanel(dlg, "배치");
    var gapField = addNumberField(spacingPanel, "선과의 거리", "mm", gapMm, 0.1, 0, 20);
    var spacingField = addNumberField(spacingPanel, "인지질 간격", "mm", spacingMm, 0.1, 0.2, 30);
    var curvatureField = addNumberField(spacingPanel, "곡선 보정", "%", curvatureFixPercent, 5, 0, 100);
    var radiusField = addNumberField(spacingPanel, "보정 시작 반지름", "mm", startRadiusMm, 1, 1, 200);
    var countText = spacingPanel.add("statictext", undefined, "");
    countText.preferredSize.width = LABEL_WIDTH + INPUT_WIDTH + UNIT_WIDTH + SLIDER_WIDTH + STEP_BUTTON_WIDTH * 2;

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

    linePath.hidden = true;
    linePath.selected = false;
    unitItem.hidden = true;
    unitItem.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = drawBilayer();
        finalGroup.name = "Phospholipid Bilayer";
        try { finalGroup.move(linePath, ElementPlacement.PLACEBEFORE); } catch (e) {}
        linePath.remove();
        unitItem.remove();
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        linePath.hidden = lineWasHidden;
        unitItem.hidden = unitWasHidden;
        linePath.selected = true;
        unitItem.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    function drawBilayer() {
        var group = doc.activeLayer.groupItems.add();
        var centerOffset = gapMm * MM + unitHeight / 2;
        var measureOffset = getMeasureOffset();

        // 왼쪽 법선이 위층, 오른쪽 법선이 아래층. 아래층은 원본을 뒤집은 각도가 된다.
        placeLayer(group, getLayerDistances(measureOffset), 1, centerOffset);
        placeLayer(group, getLayerDistances(-measureOffset), -1, centerOffset);
        return group;
    }

    function placeLayer(group, distances, side, centerOffset) {
        for (var index = 0; index < distances.length; index++) {
            var frame = getFrameAtLength(pathMetrics, distances[index]);
            if (frame === null) continue;
            placeUnit(group, frame.x, frame.y, side * frame.nx, side * frame.ny, centerOffset);
        }
    }

    // 곡선에서는 바깥쪽 머리가 벌어지고 안쪽 머리가 겹친다. 중심선이 아니라
    // 각 층이 실제로 놓이는 평행 곡선 위에서 간격을 재면 두 층의 머리 간격이 고르게 되고,
    // 그 결과 바깥층 개수가 안쪽층보다 자연스럽게 늘어난다. 직선 구간은 두 길이가 같아 개수도 같다.
    function getLayerDistances(signedOffset) {
        var lengths = offsetPolylineLengths(pathMetrics, signedOffset, getBendDeadzone(signedOffset));
        var total = lengths[lengths.length - 1];
        var positions = getPlacementDistances(total, spacingMm * MM, linePath.closed, MAX_PER_LAYER);
        var distances = [];
        for (var index = 0; index < positions.length; index++) {
            distances.push(centerDistanceAt(pathMetrics, lengths, positions[index]));
        }
        return distances;
    }

    // 보정 100%면 머리 끝 높이에서, 0%면 중심선에서 간격을 잰다(= 두 층 개수가 같아진다).
    function getMeasureOffset() {
        return (curvatureFixPercent / 100) * (gapMm * MM + unitHeight);
    }

    // 굽이 정도 bend = offset / 곡률반지름. 시작 반지름에서의 bend만큼을 빼주면
    // 그보다 완만한 굽이(= 반지름이 더 큰 굽이)는 bend가 0이 되어 직선과 똑같이 배치된다.
    function getBendDeadzone(signedOffset) {
        var radiusPt = startRadiusMm * MM;
        if (radiusPt <= 0) return 0;
        return Math.abs(signedOffset) / radiusPt;
    }

    // 중심선 샘플을 법선 방향으로 offset한 평행 곡선의 누적 길이표.
    // 한 걸음의 길이는 이동량의 크기가 아니라 진행 방향 성분으로 잰다. 곡률 반지름보다
    // 깊게 안쪽으로 밀어내면 평행 곡선이 되접히는데, 크기로 재면 그 되접힘까지 더해져
    // 안쪽이 오히려 길어진다. 되접히는 구간은 MIN_STEP_FACTOR로 눌러 층이 사라지지 않게 한다.
    function offsetPolylineLengths(metrics, offset, bendDeadzone) {
        var MIN_STEP_FACTOR = 0.15; // 곡률이 너무 커서 안쪽 층이 접힐 때 남겨두는 최소 진행 비율
        var deadzone = bendDeadzone > 0 ? bendDeadzone : 0;
        var samples = metrics.samples;
        var lengths = [];
        var previousPoint = null;
        var previousTangent = null;
        for (var index = 0; index < samples.length; index++) {
            var tangent = unitTangentAt(samples, index);
            var point = {
                x: samples[index].x - tangent.y * offset,
                y: samples[index].y + tangent.x * offset
            };
            if (index === 0) {
                lengths.push(0);
            } else {
                var centerStep = samples[index].distance - samples[index - 1].distance;
                var projected = (point.x - previousPoint.x) * previousTangent.x +
                    (point.y - previousPoint.y) * previousTangent.y;
                // bend = offset / 곡률반지름. 완만한 구간은 데드존만큼 깎여 0이 된다.
                var bend = centerStep > 0 ? 1 - (projected / centerStep) : 0;
                if (bend > deadzone) bend -= deadzone;
                else if (bend < -deadzone) bend += deadzone;
                else bend = 0;
                var factor = 1 - bend;
                if (factor < MIN_STEP_FACTOR) factor = MIN_STEP_FACTOR;
                lengths.push(lengths[index - 1] + centerStep * factor);
            }
            previousPoint = point;
            previousTangent = tangent;
        }
        return lengths;
    }

    function unitTangentAt(samples, index) {
        var direction = sampleDirection(samples, index);
        var magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        if (magnitude < 0.0001) return {x: 1, y: 0};
        return {x: direction.x / magnitude, y: direction.y / magnitude};
    }

    // 평행 곡선 위의 길이를 같은 샘플의 중심선 길이로 되돌린다.
    function centerDistanceAt(metrics, lengths, offsetLength) {
        var samples = metrics.samples;
        var target = clampValue(offsetLength, 0, lengths[lengths.length - 1]);
        var low = 0;
        var high = lengths.length - 1;
        while (low < high) {
            var middle = Math.floor((low + high) / 2);
            if (lengths[middle] < target) low = middle + 1;
            else high = middle;
        }
        if (low === 0) return samples[0].distance;
        var span = lengths[low] - lengths[low - 1];
        var ratio = span > 0 ? (target - lengths[low - 1]) / span : 0;
        return samples[low - 1].distance + (samples[low].distance - samples[low - 1].distance) * ratio;
    }

    // 원본의 위쪽(0, 1)이 바깥 방향을 향하도록 돌린 뒤, 꼬리 끝이 선에서 gap만큼 떨어지게 옮긴다.
    function placeUnit(group, pointX, pointY, dirX, dirY, centerOffset) {
        var copy = unitItem.duplicate(group, ElementPlacement.PLACEATEND);
        copy.hidden = false;
        var angle = unitAngleDegrees(dirX, dirY);
        if (Math.abs(angle) > 0.0001) {
            copy.rotate(angle, true, true, true, true, Transformation.CENTER);
        }
        // 중심을 축으로 돌렸으므로 복제본의 중심은 원본 중심과 같다.
        copy.translate(
            pointX + dirX * centerOffset - unitCenterX,
            pointY + dirY * centerOffset - unitCenterY
        );
        return copy;
    }

    // 원본 위쪽 벡터 (0, 1)을 (dirX, dirY)로 보내는 반시계 회전 각도(도)
    function unitAngleDegrees(dirX, dirY) {
        var degrees = Math.atan2(dirY, dirX) * 180 / Math.PI - 90;
        while (degrees <= -180) degrees += 360;
        while (degrees > 180) degrees -= 360;
        return degrees;
    }

    // 열린 패스는 남는 여백을 양 끝에 반씩 나눠 가운데로 모으고,
    // 닫힌 패스는 둘레를 정수 개로 나눠 이음매가 벌어지지 않게 한다.
    function getPlacementDistances(totalLength, spacing, closed, maxCount) {
        var distances = [];
        if (totalLength <= 0 || spacing <= 0) return distances;

        if (closed) {
            var closedCount = Math.round(totalLength / spacing);
            if (closedCount < 1) closedCount = 1;
            if (closedCount > maxCount) closedCount = maxCount;
            var step = totalLength / closedCount;
            for (var i = 0; i < closedCount; i++) distances.push(i * step);
            return distances;
        }

        var openCount = Math.floor(totalLength / spacing) + 1;
        if (openCount > maxCount) openCount = maxCount;
        var margin = (totalLength - (openCount - 1) * spacing) / 2;
        for (var j = 0; j < openCount; j++) distances.push(margin + j * spacing);
        return distances;
    }

    // -------------------------------------------------------
    // 선택 판정
    // -------------------------------------------------------
    // 선이 인지질보다 훨씬 길다는 점을 이용해 둘을 구분한다.
    function pickLineAndUnit(selection) {
        if (!selection || selection.length !== 2) return null;
        var firstLength = spanOf(selection[0]);
        var secondLength = spanOf(selection[1]);
        var lineIndex = firstLength >= secondLength ? 0 : 1;
        var line = selection[lineIndex];
        var unit = selection[1 - lineIndex];
        if (line.typename !== "PathItem" || line.pathPoints.length < 2) return null;
        if (firstLength === secondLength) return null;
        return {line: line, unit: unit};
    }

    // 패스는 앵커를 이은 길이, 그 밖의 개체는 외곽 상자의 대각선 길이로 비교한다.
    function spanOf(item) {
        if (item.typename === "PathItem" && item.pathPoints.length >= 2) {
            var points = item.pathPoints;
            var total = 0;
            for (var index = 0; index < points.length - 1; index++) {
                total += distanceBetween(pointFromArray(points[index].anchor), pointFromArray(points[index + 1].anchor));
            }
            if (item.closed) {
                total += distanceBetween(
                    pointFromArray(points[points.length - 1].anchor),
                    pointFromArray(points[0].anchor)
                );
            }
            return total;
        }
        var bounds = item.visibleBounds;
        var width = bounds[2] - bounds[0];
        var height = bounds[1] - bounds[3];
        return Math.sqrt(width * width + height * height);
    }

    // -------------------------------------------------------
    // 경로 계산 (Object_front.jsx와 같은 방식)
    // -------------------------------------------------------
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

    // 닫힌 패스는 마지막 앵커에서 첫 앵커로 돌아오는 구간까지 포함한다.
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
        if (path.closed && points.length > 2) {
            var last = points.length - 1;
            segments.push({
                p0: pointFromArray(points[last].anchor),
                p1: pointFromArray(points[last].rightDirection),
                p2: pointFromArray(points[0].leftDirection),
                p3: pointFromArray(points[0].anchor)
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
        var clampedDistance = clampValue(distance, 0, metrics.totalLength);
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

    // -------------------------------------------------------
    // 미리보기 · 입력
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        updateCountText();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewGroup = drawBilayer();
        previewGroup.name = "Phospholipid Bilayer Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function updateCountText() {
        var measureOffset = getMeasureOffset();
        var upper = getLayerDistances(measureOffset).length;
        var lower = getLayerDistances(-measureOffset).length;
        var text = "위층 " + upper + "개 · 아래층 " + lower + "개 · 모두 " + (upper + lower) + "개";
        if (upper >= MAX_PER_LAYER || lower >= MAX_PER_LAYER) {
            text += " (상한 " + MAX_PER_LAYER + "개, 간격을 넓혀주세요)";
        }
        countText.text = text;
    }

    function readFields(showAlert) {
        var gap = parseNumber(gapField.input.text);
        var spacing = parseNumber(spacingField.input.text);
        var curvatureFix = parseNumber(curvatureField.input.text);
        var startRadius = parseNumber(radiusField.input.text);

        if (gap === null || gap < 0) {
            if (showAlert) alert("선과의 거리는 0 이상의 숫자로 입력해주세요.");
            return false;
        }
        if (spacing === null || spacing < 0.2) {
            if (showAlert) alert("인지질 간격은 0.2mm 이상의 숫자로 입력해주세요.");
            return false;
        }

        if (curvatureFix === null || curvatureFix < 0 || curvatureFix > 100) {
            if (showAlert) alert("곡선 보정은 0부터 100 사이로 입력해주세요.");
            return false;
        }

        if (startRadius === null || startRadius < 1 || startRadius > 200) {
            if (showAlert) alert("보정 시작 반지름은 1부터 200 사이로 입력해주세요.");
            return false;
        }

        gapMm = gap;
        spacingMm = spacing;
        curvatureFixPercent = curvatureFix;
        startRadiusMm = startRadius;
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
    // 모든 칸의 너비를 고정해야 행마다 단위 글자 수가 달라도 세로줄이 맞는다.
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
        var parts = ["v3", gapMm, spacingMm, curvatureFixPercent, startRadiusMm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v3" || p.length < 5) return;

        var gap = parseFloat(p[1]);
        var spacing = parseFloat(p[2]);
        var curvatureFix = parseFloat(p[3]);
        var startRadius = parseFloat(p[4]);
        if (gap >= 0) gapMm = clampValue(gap, 0, 20);
        if (spacing >= 0.2) spacingMm = clampValue(spacing, 0.2, 30);
        if (curvatureFix >= 0 && curvatureFix <= 100) curvatureFixPercent = curvatureFix;
        if (startRadius >= 1) startRadiusMm = clampValue(startRadius, 1, 200);
    }
})();
