// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_SineWave.jsx
  기능: 선택한 패스를 x축으로 삼아 sin 곡선을 만듭니다.
    - 직선이면 그 직선을 축으로, 곡선·원이면 그 곡선을 따라 파형이 감깁니다.
    - 진폭 · 파장 · 위상(x축 평행 이동) · 선 두께를 조절하고 미리보기로 확인합니다.
    - 원본 패스는 곡선으로 바뀝니다(같은 자리 · 같은 부모).
  사용법: 패스 하나를 선택한 뒤 실행.

  축은 호길이로 매개화한다. 기준 곡선 위 s에서 접선 T · 법선 N · 곡률 κ를 얻고
  파형은 P(s) = C(s) + N(s)·A·sin(k(s−이동))이다. 법선이 같이 도니까
  접선은 T(1 − κ·A·sin) + N·A·k·cos가 된다. 직선은 κ = 0인 특수 경우다.

  고정점은 위상 90도마다, 즉 극값과 x축 교차점에만 찍는다(한 파장에 4개).
  핸들 길이는 조각 중점이 실제 파형 위에 오도록 2원 1차식으로 푼다. 이 한 규칙이
  90도 조각 · 끝 자투리 · 많이 휜 축을 모두 처리한다. 접선이 나란해 풀 수 없는
  조각만 원호 근사식 (4/3)tan(위상/4)로 넘긴다.

  닫힌 패스는 파장을 "둘레 ÷ 정수"로 맞춰야 이음매에서 파형이 어긋나지 않는다.
  그래서 원에서는 입력한 파장이 근사값이 되고 실제 파동 개수가 반올림으로 정해진다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 패스를 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectSineWave/settings";
    var MM = 2.834645669;

    // 슬라이더는 요청 범위, 입력칸은 더 큰 값도 받는다.
    var AMPLITUDE_STEP = 1;
    var AMPLITUDE_SLIDER_MAX = 30;
    var AMPLITUDE_MAX = 1000;
    var WAVELENGTH_STEP = 1;
    var WAVELENGTH_SLIDER_MAX = 30;
    var WAVELENGTH_MAX = 1000;
    var SHIFT_STEP = 1;
    var SHIFT_SLIDER_MAX = 30;
    var SHIFT_MAX = 1000;
    var WIDTH_STEP = 0.1;
    var WIDTH_SLIDER_MAX = 2;
    var WIDTH_MAX = 100;

    // 위상 90도마다 고정점 → 한 파장에 4개.
    var QUARTER_TURN = Math.PI / 2;
    // ponytail: 파장이 아주 짧으면 고정점이 폭발한다. 상한만 두고 그 위는 근사도를 포기한다.
    var MAX_ANCHORS = 2000;
    // 호길이 표 크기. 축 위 위치 ↔ 매개변수 변환에 쓴다. 표본 사이는 선형 보간이라
    // 오차는 간격의 제곱에 비례한다. 조각당 256이면 고정점 위치 오차가 0.001pt 아래다.
    // 고정점이 많은 패스에서 표가 폭발하지 않도록 전체 예산으로 나눠 쓴다.
    var ARC_SAMPLE_BUDGET = 4096;
    var MIN_SEGMENT_SAMPLES = 24;
    var MAX_SEGMENT_SAMPLES = 256;

    var doc = app.activeDocument;
    var source = getSelectedPath(doc.selection);
    if (source === null) {
        alert("패스 하나만 선택해주세요.\n\n직선도 곡선도 됩니다. 문자나 그룹은 먼저 패스로 만들어주세요.");
        return;
    }

    var axis = buildAxis(source);
    if (axis === null || axis.length <= 0) {
        alert("길이가 0인 패스는 사용할 수 없습니다.");
        return;
    }

    var amplitudeMm = 5;
    var wavelengthMm = 20;
    var shiftMm = 0;
    var strokeWidthPt = source.stroked ? clampValue(roundToStep(source.strokeWidth, WIDTH_STEP), 0, WIDTH_MAX) : 0.3;
    var previewEnabled = true;
    var previewItem = null;
    var sourceWasHidden = source.hidden;

    applySavedSettings();

    var LABEL_WIDTH = 62;
    var UNIT_WIDTH = 26;
    var INPUT_WIDTH = 54;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 180;
    var INFO_WIDTH = LABEL_WIDTH + INPUT_WIDTH + UNIT_WIDTH + SLIDER_WIDTH + STEP_BUTTON_WIDTH * 2;

    var dlg = new Window("dialog", "사인 곡선");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var wavePanel = addPanel(dlg, "파형");
    var amplitudeField = addNumberField(wavePanel, "진폭", "mm", amplitudeMm, AMPLITUDE_STEP,
        0, AMPLITUDE_SLIDER_MAX, 0, AMPLITUDE_MAX);
    var wavelengthField = addNumberField(wavePanel, "파장", "mm", wavelengthMm, WAVELENGTH_STEP,
        0, WAVELENGTH_SLIDER_MAX, 0, WAVELENGTH_MAX);
    var shiftField = addNumberField(wavePanel, "축 이동", "mm", shiftMm, SHIFT_STEP,
        -SHIFT_SLIDER_MAX, SHIFT_SLIDER_MAX, -SHIFT_MAX, SHIFT_MAX);
    var infoText = wavePanel.add("statictext", undefined, "");
    infoText.preferredSize.width = INFO_WIDTH;
    var warningText = wavePanel.add("statictext", undefined, "");
    warningText.preferredSize.width = INFO_WIDTH;

    var strokePanel = addPanel(dlg, "선");
    var widthField = addNumberField(strokePanel, "두께", "pt", strokeWidthPt, WIDTH_STEP,
        0, WIDTH_SLIDER_MAX, 0, WIDTH_MAX);

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
    cancelButton.onClick = function() { dlg.close(0); };

    source.hidden = true;
    source.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        source.hidden = false;
        var curve = buildSineCurve();
        curve.name = "Sine Wave";
        try { curve.move(source, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
        source.remove();
        saveSettings();
        doc.selection = null;
        curve.selected = true;
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 곡선 만들기
    // -------------------------------------------------------
    function buildSineCurve() {
        var amplitude = amplitudeMm * MM;
        var wavelength = effectiveWavelength();
        var shift = shiftMm * MM;

        // 진폭이나 파장이 0이면 흔들 것이 없다. 기준 패스를 그대로 복제한다.
        if (amplitude === 0 || wavelength <= 0) {
            var copy = source.duplicate();
            applyStroke(copy);
            return copy;
        }

        var waveNumber = Math.PI * 2 / wavelength;
        var positions = quarterPositions(wavelength, shift);
        var samples = [];
        var anchors = [];
        var index;
        for (index = 0; index < positions.length; index++) {
            var sample = sampleWave(positions[index], amplitude, waveNumber, shift);
            samples.push(sample);
            anchors.push([sample.x, sample.y]);
        }

        var path = source.layer.pathItems.add();
        path.setEntirePath(anchors);
        path.closed = axis.closed;
        applyStroke(path);

        var last = anchors.length - 1;
        var handles = [];
        var segmentCount = axis.closed ? anchors.length : last;
        for (index = 0; index < segmentCount; index++) {
            var next = (index + 1) % anchors.length;
            var from = positions[index];
            var to = positions[next] + (next === 0 ? axis.length : 0);
            handles.push(solveHandles(samples[index], samples[next], from, to, amplitude, waveNumber, shift));
        }

        for (index = 0; index <= last; index++) {
            var point = path.pathPoints[index];
            var sampleAt = samples[index];
            var anchor = anchors[index];
            var incoming = axis.closed ? handles[(index + segmentCount - 1) % segmentCount] : handles[index - 1];
            var outgoing = handles[index];
            var left = (!axis.closed && index === 0)
                ? [anchor[0], anchor[1]]
                : [anchor[0] - sampleAt.dirX * incoming.into, anchor[1] - sampleAt.dirY * incoming.into];
            var right = (!axis.closed && index === last)
                ? [anchor[0], anchor[1]]
                : [anchor[0] + sampleAt.dirX * outgoing.outOf, anchor[1] + sampleAt.dirY * outgoing.outOf];
            point.leftDirection = left;
            point.rightDirection = right;
            point.pointType = (!axis.closed && (index === 0 || index === last))
                ? PointType.CORNER
                : PointType.SMOOTH;
        }
        return path;
    }

    // 닫힌 패스는 파장이 둘레의 약수여야 이음매가 매끈하다. 정수 개로 반올림한다.
    function effectiveWavelength() {
        var wavelength = wavelengthMm * MM;
        if (!axis.closed || wavelength <= 0) return wavelength;
        var count = Math.round(axis.length / wavelength);
        if (count < 1) count = 1;
        var limit = Math.floor(MAX_ANCHORS / 4);
        if (count > limit) count = limit;
        return axis.length / count;
    }

    // 축 위 고정점 위치: 위상이 90도 배수가 되는 지점(극값 · x축 교차점).
    // 열린 패스는 양 끝을 더한다. 닫힌 패스는 격자만으로 한 바퀴가 채워진다.
    function quarterPositions(wavelength, shift) {
        var stride = QUARTER_TURN / (Math.PI * 2 / wavelength);
        var positions = [];
        var s;

        if (axis.closed) {
            var base = shift - Math.floor(shift / stride) * stride;
            for (s = base; s < axis.length - stride * 0.001 && positions.length < MAX_ANCHORS; s += stride) {
                positions.push(s);
            }
            if (positions.length === 0) positions.push(0);
            return positions;
        }

        var epsilon = stride * 0.001;
        positions.push(0);
        var index = Math.ceil((-shift) / stride);
        s = shift + stride * index;
        while (s < axis.length - epsilon && positions.length < MAX_ANCHORS - 1) {
            if (s > epsilon) positions.push(s);
            index++;
            s = shift + stride * index;
        }
        positions.push(axis.length);
        return positions;
    }

    // 파형 위 한 점과 그 접선 방향. 기준 곡선이 휘면 법선도 돌아가므로(dN/ds = −κT)
    // 접선은 T(1 − κ·A·sin) + N·A·k·cos가 된다.
    function sampleWave(s, amplitude, waveNumber, shift) {
        var frame = axis.frameAt(s);
        var phase = waveNumber * (s - shift);
        var offset = amplitude * Math.sin(phase);
        var along = 1 - frame.curvature * offset;
        var across = amplitude * waveNumber * Math.cos(phase);
        var dirX = frame.tangentX * along + frame.normalX * across;
        var dirY = frame.tangentY * along + frame.normalY * across;
        var speed = Math.sqrt(dirX * dirX + dirY * dirY);
        if (speed < 0.000001) {
            dirX = frame.tangentX;
            dirY = frame.tangentY;
            speed = 1;
        }
        return {
            x: frame.x + frame.normalX * offset,
            y: frame.y + frame.normalY * offset,
            dirX: dirX / speed,
            dirY: dirY / speed,
            speed: speed
        };
    }

    // 조각의 베지어 중점 B(0.5)가 실제 파형의 중점과 같아지도록 핸들 길이를 푼다.
    //   B(0.5) = (P0+P3)/2 + (3/8)(a·d0 − b·d1)
    // 접선이 나란하면 이 식이 풀리지 않는다(변곡점·직선). 그때만 원호 근사로 넘어간다.
    function solveHandles(from, to, fromS, toS, amplitude, waveNumber, shift) {
        var span = toS - fromS;
        var middle = sampleWave(fromS + span / 2, amplitude, waveNumber, shift);
        var wantX = (middle.x - (from.x + to.x) / 2) * 8 / 3;
        var wantY = (middle.y - (from.y + to.y) / 2) * 8 / 3;
        var determinant = to.dirX * from.dirY - from.dirX * to.dirY;

        if (Math.abs(determinant) > 0.000001) {
            var outOf = (to.dirX * wantY - to.dirY * wantX) / determinant;
            var into = (from.dirX * wantY - from.dirY * wantX) / determinant;
            if (isFinite(outOf) && isFinite(into) && outOf > 0 && into > 0 &&
                    outOf < span * 2 && into < span * 2) {
                return {outOf: outOf, into: into};
            }
        }

        var ratio = span * handleRatio(waveNumber * span);
        return {outOf: ratio * from.speed, into: ratio * to.speed};
    }

    // 90도 조각이면 0.3516, 조각이 짧아질수록 3분의 1로 수렴한다(에르미트와 같아짐).
    function handleRatio(phaseSpan) {
        if (phaseSpan < 0.000001) return 1 / 3;
        return 4 / 3 * Math.tan(phaseSpan / 4) / phaseSpan;
    }

    function applyStroke(path) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = strokeWidthPt;
        if (source.stroked) {
            try { path.strokeColor = source.strokeColor; } catch (e) {}
            try { path.strokeDashes = source.strokeDashes; } catch (e2) {}
            try { path.strokeDashOffset = source.strokeDashOffset; } catch (e3) {}
            try { path.strokeCap = source.strokeCap; } catch (e4) {}
            try { path.strokeJoin = source.strokeJoin; } catch (e5) {}
            try { path.strokeMiterLimit = source.strokeMiterLimit; } catch (e6) {}
        } else {
            try { path.strokeColor = doc.defaultStrokeColor; } catch (e7) {}
        }
        try { path.opacity = source.opacity; } catch (e8) {}
    }

    // -------------------------------------------------------
    // 기준 축: 호길이 매개화
    // -------------------------------------------------------
    // 표본으로 길이표를 만들어 s → (조각, t)로 되돌린다. 표본 사이는 선형 보간이라
    // 위치 오차는 표본 간격의 제곱에 비례한다. 조각당 64표본이면 무시할 수준이다.
    function buildAxis(item) {
        var points = item.pathPoints;
        if (!points || points.length < 2) return null;

        var segments = [];
        var index;
        for (index = 0; index < points.length - 1; index++) {
            segments.push(makeSegment(points[index], points[index + 1]));
        }
        if (item.closed) segments.push(makeSegment(points[points.length - 1], points[0]));

        var perSegment = clampValue(Math.ceil(ARC_SAMPLE_BUDGET / segments.length),
            MIN_SEGMENT_SAMPLES, MAX_SEGMENT_SAMPLES);
        var samples = [];
        var total = 0;
        var maxCurvature = 0;
        for (index = 0; index < segments.length; index++) {
            var previous = segmentPoint(segments[index], 0);
            samples.push({segment: index, t: 0, s: total});
            for (var step = 1; step <= perSegment; step++) {
                var t = step / perSegment;
                var current = segmentPoint(segments[index], t);
                total += Math.sqrt(Math.pow(current[0] - previous[0], 2) + Math.pow(current[1] - previous[1], 2));
                samples.push({segment: index, t: t, s: total});
                previous = current;
                var frame = segmentFrame(segments[index], t);
                if (Math.abs(frame.curvature) > maxCurvature) maxCurvature = Math.abs(frame.curvature);
            }
        }

        return {
            length: total,
            closed: item.closed,
            maxCurvature: maxCurvature,
            frameAt: function(s) {
                var position = s;
                if (this.closed) {
                    position = position - Math.floor(position / total) * total;
                } else {
                    position = clampValue(position, 0, total);
                }
                var low = 0;
                var high = samples.length - 1;
                while (high - low > 1) {
                    var middle = Math.floor((low + high) / 2);
                    if (samples[middle].s <= position) low = middle;
                    else high = middle;
                }
                var target = samples[low];
                var next = samples[high];
                if (target.segment === next.segment && next.s > target.s) {
                    var ratio = (position - target.s) / (next.s - target.s);
                    return segmentFrame(segments[target.segment], target.t + (next.t - target.t) * ratio);
                }
                return segmentFrame(segments[next.segment], next.t);
            }
        };
    }

    function makeSegment(fromPoint, toPoint) {
        return [
            [fromPoint.anchor[0], fromPoint.anchor[1]],
            [fromPoint.rightDirection[0], fromPoint.rightDirection[1]],
            [toPoint.leftDirection[0], toPoint.leftDirection[1]],
            [toPoint.anchor[0], toPoint.anchor[1]]
        ];
    }

    function segmentPoint(segment, t) {
        var u = 1 - t;
        return [
            u * u * u * segment[0][0] + 3 * u * u * t * segment[1][0] +
                3 * u * t * t * segment[2][0] + t * t * t * segment[3][0],
            u * u * u * segment[0][1] + 3 * u * u * t * segment[1][1] +
                3 * u * t * t * segment[2][1] + t * t * t * segment[3][1]
        ];
    }

    // 접선 · 법선 · 부호 있는 곡률. 법선은 접선을 반시계로 90도 돌린 방향이고
    // κ는 dT/ds = κN이 되도록 잡는다.
    function segmentFrame(segment, t) {
        var point = segmentPoint(segment, t);
        var first = segmentDerivative(segment, t);
        var speed = Math.sqrt(first[0] * first[0] + first[1] * first[1]);

        // 핸들이 고정점에 붙은 직선 조각은 양 끝에서 미분이 0이 된다. 그때는 이웃 점으로 방향을 잡는다.
        if (speed < 0.000001) {
            var nudge = t < 0.5 ? 0.001 : -0.001;
            var neighbour = segmentPoint(segment, t + nudge);
            first = [(neighbour[0] - point[0]) / nudge, (neighbour[1] - point[1]) / nudge];
            speed = Math.sqrt(first[0] * first[0] + first[1] * first[1]);
            if (speed < 0.000001) speed = 1;
        }

        var second = segmentSecondDerivative(segment, t);
        var curvature = (first[0] * second[1] - first[1] * second[0]) / Math.pow(speed, 3);
        if (!isFinite(curvature)) curvature = 0;
        var tangentX = first[0] / speed;
        var tangentY = first[1] / speed;
        return {
            x: point[0],
            y: point[1],
            tangentX: tangentX,
            tangentY: tangentY,
            normalX: -tangentY,
            normalY: tangentX,
            curvature: curvature
        };
    }

    function segmentDerivative(segment, t) {
        var u = 1 - t;
        return [
            3 * u * u * (segment[1][0] - segment[0][0]) + 6 * u * t * (segment[2][0] - segment[1][0]) +
                3 * t * t * (segment[3][0] - segment[2][0]),
            3 * u * u * (segment[1][1] - segment[0][1]) + 6 * u * t * (segment[2][1] - segment[1][1]) +
                3 * t * t * (segment[3][1] - segment[2][1])
        ];
    }

    function segmentSecondDerivative(segment, t) {
        var u = 1 - t;
        return [
            6 * u * (segment[2][0] - 2 * segment[1][0] + segment[0][0]) +
                6 * t * (segment[3][0] - 2 * segment[2][0] + segment[1][0]),
            6 * u * (segment[2][1] - 2 * segment[1][1] + segment[0][1]) +
                6 * t * (segment[3][1] - 2 * segment[2][1] + segment[1][1])
        ];
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        updateInfoText();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        previewItem = buildSineCurve();
        previewItem.name = "Sine Wave Preview";
        try { previewItem.move(source, ElementPlacement.PLACEBEFORE); } catch (moveError) {}
        app.redraw();
    }

    function clearPreview() {
        if (previewItem === null) return;
        try { previewItem.remove(); } catch (e) {}
        previewItem = null;
    }

    function updateInfoText() {
        var lengthMm = axis.length / MM;
        var wavelength = effectiveWavelength();
        if (wavelength <= 0 || amplitudeMm === 0) {
            infoText.text = "축 길이 " + formatValue(lengthMm) + "mm · 파동 없음";
        } else {
            var waves = axis.length / wavelength;
            infoText.text = "축 길이 " + formatValue(lengthMm) + "mm · 파동 " + formatValue(waves) + "개" +
                (axis.closed ? " · 실제 파장 " + formatValue(wavelength / MM) + "mm (닫힌 패스라 정수 개로 맞춤)" : "");
        }

        // 진폭이 곡률반지름보다 크면 안쪽에서 파형이 자기를 뚫고 지나간다.
        var amplitude = amplitudeMm * MM;
        if (axis.maxCurvature > 0 && amplitude >= 1 / axis.maxCurvature) {
            warningText.text = "진폭이 축의 곡률반지름(" +
                formatValue(1 / axis.maxCurvature / MM) + "mm)보다 큽니다. 안쪽이 겹칩니다.";
        } else {
            warningText.text = "";
        }
    }

    // -------------------------------------------------------
    // 입력
    // -------------------------------------------------------
    function readFields(showAlert) {
        var amplitude = parseNumber(amplitudeField.input.text);
        if (amplitude === null || amplitude < 0 || amplitude > AMPLITUDE_MAX) {
            if (showAlert) alert("진폭은 0부터 " + AMPLITUDE_MAX + "mm 사이로 입력해주세요.");
            return false;
        }
        var wavelength = parseNumber(wavelengthField.input.text);
        if (wavelength === null || wavelength < 0 || wavelength > WAVELENGTH_MAX) {
            if (showAlert) alert("파장은 0부터 " + WAVELENGTH_MAX + "mm 사이로 입력해주세요.");
            return false;
        }
        var shift = parseNumber(shiftField.input.text);
        if (shift === null || shift < -SHIFT_MAX || shift > SHIFT_MAX) {
            if (showAlert) alert("축 이동은 -" + SHIFT_MAX + "부터 " + SHIFT_MAX + "mm 사이로 입력해주세요.");
            return false;
        }
        var width = parseNumber(widthField.input.text);
        if (width === null || width < 0 || width > WIDTH_MAX) {
            if (showAlert) alert("선 두께는 0부터 " + WIDTH_MAX + "pt 사이로 입력해주세요.");
            return false;
        }
        amplitudeMm = amplitude;
        wavelengthMm = wavelength;
        shiftMm = shift;
        strokeWidthPt = width;
        return true;
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function saveSettings() {
        try {
            app.preferences.setStringPreference(PREF_KEY,
                ["v1", amplitudeMm, wavelengthMm, shiftMm, strokeWidthPt].join("|"));
        } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var parts = String(raw).split("|");
        if (parts[0] !== "v1" || parts.length < 5) return;
        var amplitude = parseNumber(parts[1]);
        var wavelength = parseNumber(parts[2]);
        var shift = parseNumber(parts[3]);
        var width = parseNumber(parts[4]);
        if (amplitude === null || amplitude < 0 || amplitude > AMPLITUDE_MAX) return;
        if (wavelength === null || wavelength < 0 || wavelength > WAVELENGTH_MAX) return;
        if (shift === null || shift < -SHIFT_MAX || shift > SHIFT_MAX) return;
        if (width === null || width < 0 || width > WIDTH_MAX) return;
        amplitudeMm = amplitude;
        wavelengthMm = wavelength;
        shiftMm = shift;
        strokeWidthPt = width;
    }

    // -------------------------------------------------------
    // 선택
    // -------------------------------------------------------
    function getSelectedPath(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem") return null;
        if (item.guides || item.clipping) return null;
        if (!item.pathPoints || item.pathPoints.length < 2) return null;
        return item;
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
    // 슬라이더는 요청 범위(sliderMin~sliderMax)까지만, 입력칸은 hardMin~hardMax까지 받는다.
    function addNumberField(parent, labelText, unit, value, step, sliderMin, sliderMax, hardMin, hardMax) {
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
        var slider = row.add("slider", undefined, clampValue(value, sliderMin, sliderMax), sliderMin, sliderMax);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;

        var field = {
            row: row, input: input, slider: slider, step: step,
            sliderMinimum: sliderMin, sliderMaximum: sliderMax,
            minimum: hardMin, maximum: hardMax, syncing: false
        };
        down.onClick = function() { stepField(field, -1); };
        up.onClick = function() { stepField(field, 1); };

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = roundToStep(slider.value, field.step);
            input.text = formatValue(clampValue(stepped, field.sliderMinimum, field.sliderMaximum));
            updatePreview();
        };
        input.onChanging = updatePreview;
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampValue(parsed, field.minimum, field.maximum);
            input.text = formatValue(parsed);
            syncSlider(field, parsed);
            updatePreview();
        };
        return field;
    }

    // 버튼 한 번 = 1단계. 세밀 조절용.
    function stepField(field, direction) {
        var value = parseNumber(field.input.text);
        if (value === null) value = field.minimum;
        value = roundToStep(value + (field.step * direction), field.step);
        value = clampValue(value, field.minimum, field.maximum);
        field.input.text = formatValue(value);
        syncSlider(field, value);
        updatePreview();
    }

    // 슬라이더 범위를 넘는 값은 입력칸에만 남기고 슬라이더는 끝에 붙여 둔다.
    function syncSlider(field, value) {
        field.syncing = true;
        field.slider.value = clampValue(value, field.sliderMinimum, field.sliderMaximum);
        field.syncing = false;
    }

    function clampValue(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function roundToStep(value, step) {
        return Math.round(value / step) * step;
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
})();
