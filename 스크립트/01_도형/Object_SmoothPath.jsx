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
  Object_SmoothPath.jsx
  기능: 연필 도구로 그린 패스를 정리합니다. 세 가지를 따로 조절합니다.
    - 앵커 제거(형태 유지): 원본 핸들·접선을 그대로 둔 채, 빼도 옆 두 구간이 베지어 하나로
      허용 오차 안에 맞는 앵커만 지웁니다(VectorFirstAid의 Super Smart Remove와 같은 방식).
      이미지 트레이스처럼 핸들이 제대로 붙은 복잡한 그림에 맞습니다.
    - 앵커 줄이기: 모양을 유지하면서 필요 없는 앵커를 없앱니다(RDP 단순화).
    - 곡선 다듬기: 꺾인 곳(미분 불가능한 점)과 곡률이 튀는 곳을 펴서 부드러운 곡선으로 만듭니다(Taubin 평활).
    - 모서리 유지 각도보다 급하게 꺾인 점은 모서리로 남기고, 나머지는 핸들을 이어 붙여 매끄럽게 만듭니다.
  사용법: 패스(그룹·복합 패스 포함)를 선택한 뒤 실행. 탭을 골라 확인.
    - 앵커 제거 탭: 수천 패스·수만 앵커를 다루므로 미리보기 없이 확인 때 한 번에 적용한다.
      시작할 때 좌표도 읽지 않아 다이얼로그가 바로 뜬다.
    - 부드럽게 탭: 앵커 줄이기·곡선 다듬기. 값을 미리보기로 보며 맞춘다.
  확인은 열려 있는 탭의 작업만 적용한다.

  부드럽게 탭의 미리보기는 선택한 패스를 그 자리에서 바꾼다. 취소하거나 미리보기를 끄면 원래 좌표로 되돌리고,
  확인을 누르면 화면에 보이던 미리보기가 그대로 결과가 된다. 위치 이동 행은 두지 않는다.
  원본을 제자리에서 고치는 스크립트라 미리보기를 옮기면 그림이 밀려난다.
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 정리할 패스를 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectSmoothPath/settings";
    var MM = 2.834645669;
    var MAX_TOLERANCE_MM = 2;      // 정리 강도 100일 때의 허용 오차
    var MAX_REMOVE_MM = 0.5;       // 앵커 제거 허용 오차 슬라이더 최대
    var SAMPLE_STEP_MM = 0.25;     // 곡선을 점으로 잘게 나눌 간격
    var MIN_OPEN_POINTS = 2;
    var MIN_CLOSED_POINTS = 4;

    var doc = app.activeDocument;
    var targets = [];
    collectPaths(doc.selection, targets);
    if (targets.length === 0) {
        alert("정리할 패스를 선택해주세요.\n\n연필·펜으로 그린 패스, 그룹, 복합 패스를 선택할 수 있습니다.");
        return;
    }

    // 좌표 읽기는 비싸다(수천 패스·수만 앵커). 부드럽게 탭이 미리보기를 켤 때만 읽는다.
    var snapshots = null;
    var sourceAnchorCount = 0;

    var removeMm = 0.05;
    var simplifyStrength = 40;
    var smoothStrength = 40;
    var cornerAngle = 75;
    var previewEnabled = true;
    var activeTab = 0;             // 0: 앵커 제거, 1: 부드럽게
    var applied = false;

    applySavedSettings();

    var LABEL_WIDTH = 108;
    var INPUT_WIDTH = 54;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var HINT_WIDTH = LABEL_WIDTH + INPUT_WIDTH + SLIDER_WIDTH;

    var dlg = new Window("dialog", "패스 정리");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var tabs = dlg.add("tabbedpanel");
    tabs.alignChildren = "fill";

    // --- 탭 1: 앵커 제거 (미리보기 없음) ---
    var removeTab = tabs.add("tab", undefined, "앵커 제거");
    removeTab.orientation = "column";
    removeTab.alignChildren = "left";
    removeTab.spacing = 6;
    removeTab.margins = [10, 12, 10, 10];
    var removeField = addNumberField(removeTab, "허용 오차", "mm", removeMm, 0.01, 0, MAX_REMOVE_MM);
    var removeHint = removeTab.add("statictext", undefined,
        "원본 핸들을 그대로 두고, 빼도 이 오차 안에 맞는 앵커만 지웁니다.\n" +
        "수만 개 앵커를 다루므로 미리보기 없이 확인을 누를 때 한 번에 적용합니다.\n" +
        "결과가 마음에 안 들면 실행 취소(Ctrl+Z) 뒤 값을 바꿔 다시 실행하세요.", {multiline: true});
    removeHint.preferredSize.width = HINT_WIDTH;
    var removeInfo = removeTab.add("statictext", undefined, "패스 " + targets.length + "개 선택됨");
    removeInfo.preferredSize.width = HINT_WIDTH;

    // --- 탭 2: 부드럽게 (미리보기) ---
    var smoothTab = tabs.add("tab", undefined, "부드럽게");
    smoothTab.orientation = "column";
    smoothTab.alignChildren = "fill";
    smoothTab.spacing = 6;
    smoothTab.margins = [10, 12, 10, 10];

    var simplifyPanel = addPanel(smoothTab, "앵커 줄이기");
    var simplifyField = addNumberField(simplifyPanel, "정리 강도", "0~100", simplifyStrength, 1, 0, 100);

    var smoothPanel = addPanel(smoothTab, "곡선 다듬기");
    var smoothField = addNumberField(smoothPanel, "부드럽기 강도", "0~100", smoothStrength, 1, 0, 100);
    var cornerField = addNumberField(smoothPanel, "모서리 유지 각도", "°", cornerAngle, 5, 0, 180);
    var cornerHint = smoothPanel.add("statictext", undefined, "이 각도보다 급하게 꺾인 점은 모서리로 남깁니다. 0이면 모두 부드럽게.");
    cornerHint.preferredSize.width = HINT_WIDTH;

    var infoText = smoothTab.add("statictext", undefined, "");
    infoText.preferredSize.width = HINT_WIDTH;

    var previewRow = smoothTab.add("group");
    var previewCheck = previewRow.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;

    var footer = dlg.add("group");
    footer.alignment = "right";
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    tabs.onChange = function() {
        activeTab = (tabs.selection === smoothTab) ? 1 : 0;
        if (activeTab === 1) {
            updatePreview();
        } else {
            restoreAll();
            app.redraw();
        }
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        readFields();
        dlg.close(1);
    };
    cancelButton.onClick = function() { dlg.close(0); };

    doc.selection = null;
    tabs.selection = activeTab;
    if (activeTab === 1) updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();

    if (result === 1) {
        if (activeTab === 0) {
            restoreAll();
            runRemoveAnchors();
        } else {
            applyGeometry();
        }
        saveSettings();
    } else {
        restoreAll();
    }
    restoreSelection();
    app.redraw();

    // -------------------------------------------------------
    // 앵커 제거 (한 번에 적용)
    // -------------------------------------------------------
    // 패스 하나씩 읽고→계산하고→쓴다. 좌표를 모아 두지 않으므로 메모리도 시간도 절반이다.
    function runRemoveAnchors() {
        if (removeMm <= 0) return;
        var started = new Date().getTime();
        var before = 0;
        var after = 0;
        var tolerance = removeMm * MM;
        for (var i = 0; i < targets.length; i++) {
            var data = readPathData(targets[i]);
            before += data.points.length;
            var minPoints = data.closed ? MIN_CLOSED_POINTS : MIN_OPEN_POINTS;
            var next = removeAnchors(data, tolerance, minPoints);
            if (next !== data) {
                try { writePathData(targets[i], next); } catch (writeError) { next = data; }
            }
            after += next.points.length;
        }
        var seconds = Math.round((new Date().getTime() - started) / 100) / 10;
        alert("앵커 제거 완료\n\n패스 " + targets.length + "개 · 앵커 " + before + " → " + after +
            "\n허용 오차 " + removeMm + "mm · " + seconds + "초");
    }

    // -------------------------------------------------------
    // 미리보기 / 적용 (부드럽게 탭)
    // -------------------------------------------------------
    function ensureSnapshots() {
        if (snapshots !== null) return;
        snapshots = [];
        sourceAnchorCount = 0;
        for (var s = 0; s < targets.length; s++) {
            var data = readPathData(targets[s]);
            snapshots.push(data);
            sourceAnchorCount += data.points.length;
        }
    }

    function updatePreview() {
        if (activeTab !== 1) return;
        readFields();
        var resultCount;
        if (previewEnabled) {
            resultCount = applyGeometry();
        } else {
            restoreAll();
            ensureSnapshots();
            resultCount = sourceAnchorCount;
        }
        updateInfoText(resultCount);
        app.redraw();
    }

    // 계산은 언제나 원본 좌표(snapshots)에서 새로 한다. 화면에 있는 미리보기 결과를
    // 다시 입력으로 쓰면 슬라이더를 움직일수록 정리가 겹쳐 걸려 모양이 녹아내린다.
    function applyGeometry() {
        ensureSnapshots();
        var count = 0;
        for (var i = 0; i < targets.length; i++) {
            var next = processPathData(snapshots[i], buildOptions());
            try {
                writePathData(targets[i], next);
                count += next.points.length;
            } catch (writeError) {
                try { writePathData(targets[i], snapshots[i]); } catch (revertError) {}
                count += snapshots[i].points.length;
            }
        }
        applied = true;
        return count;
    }

    function restoreAll() {
        if (!applied) return;
        for (var i = 0; i < targets.length; i++) {
            try { writePathData(targets[i], snapshots[i]); } catch (e) {}
        }
        applied = false;
    }

    function buildOptions() {
        return {
            removeTolerance: 0,
            tolerance: toleranceFor(simplifyStrength),
            sampleStep: SAMPLE_STEP_MM * MM,
            smoothStrength: smoothStrength,
            cornerAngle: cornerAngle,
            minOpenPoints: MIN_OPEN_POINTS,
            minClosedPoints: MIN_CLOSED_POINTS
        };
    }
    }

    // 강도는 눈금이 고르게 느껴지도록 제곱으로 편다. 낮은 쪽에서 미세하게 조절된다.
    function toleranceFor(strength) {
        var ratio = strength / 100;
        return ratio * ratio * MAX_TOLERANCE_MM * MM;
    }

    function updateInfoText(resultCount) {
        var tolMm = Math.round(toleranceFor(simplifyStrength) / MM * 100) / 100;
        infoText.text = "패스 " + targets.length + "개 · 앵커 " + sourceAnchorCount + " → " + resultCount +
            " · 줄이기 허용 오차 " + tolMm + "mm";
    }

    // -------------------------------------------------------
    // 계산 (순수 함수 — tests/check-smooth-path.js가 이 함수들만 떼어 검증한다)
    // -------------------------------------------------------
    // 앵커 제거 → 단순화 → 평활 → 한 번 더 단순화 → 핸들 다시 붙이기.
    // 모두 0이면 원본을 그대로 돌려준다.
    function processPathData(data, options) {
        if (data.points.length < 2) return data;
        var minPoints = data.closed ? options.minClosedPoints : options.minOpenPoints;
        if (options.removeTolerance > 0) {
            data = removeAnchors(data, options.removeTolerance, minPoints);
        }
        if (options.tolerance <= 0 && options.smoothStrength <= 0) return data;

        var polyline;
        if (options.tolerance > 0) {
            polyline = samplePathPoints(data.points, data.closed, options.sampleStep);
            polyline = simplifyPoints(polyline, data.closed, options.tolerance, minPoints);
        } else {
            polyline = [];
            for (var i = 0; i < data.points.length; i++) {
                polyline.push([data.points[i].anchor[0], data.points[i].anchor[1]]);
            }
        }
        if (polyline.length < minPoints) return data;

        var window = cornerWindow(options);
        var corners = markCorners(polyline, data.closed, options.cornerAngle, window);
        if (options.smoothStrength > 0) {
            polyline = smoothPoints(polyline, data.closed, corners, options.smoothStrength);
            // 떨림이 펴지고 나면 나란히 선 점들이 생긴다. 같은 허용 오차로 한 번 더 걸러야
            // 연필 선처럼 흔들리는 입력에서도 앵커가 실제로 줄어든다.
            if (options.tolerance > 0) {
                polyline = simplifyPoints(polyline, data.closed, options.tolerance, minPoints);
            }
            corners = markCorners(polyline, data.closed, options.cornerAngle, window);
        }
        return {closed: data.closed, points: buildBezier(polyline, data.closed, corners)};
    }


    // -------------------------------------------------------
    // 앵커 제거 (형태 유지)
    // -------------------------------------------------------
    // 앵커 하나를 빼고 양옆 두 구간을 베지어 하나로 다시 맞춘다. 남는 앵커의 핸들 방향은
    // 원본 그대로 두고 길이만 다시 재므로 곡선의 흐름이 바뀌지 않는다.
    // 오차는 언제나 원본 곡선의 샘플점과 비교한다. 이미 합쳐진 구간을 기준으로 재면
    // 제거가 이어질수록 오차가 쌓여 허용치를 넘어선다.
    function removeAnchors(data, tolerance, minPoints) {
        if (tolerance <= 0 || data.points.length < 3) return data;
        var nodes = [];
        var count = data.closed ? data.points.length : data.points.length - 1;
        for (var i = 0; i < data.points.length; i++) {
            var point = data.points[i];
            var node = {
                anchor: [point.anchor[0], point.anchor[1]],
                left: [point.left[0], point.left[1]],
                right: [point.right[0], point.right[1]],
                corner: point.corner ? true : false,
                samples: null
            };
            if (i < count) node.samples = sampleSegment(point, data.points[(i + 1) % data.points.length], 8);
            nodes.push(node);
        }

        var removedAny = true;
        while (removedAny && nodes.length > minPoints) {
            removedAny = false;
            var index = data.closed ? 0 : 1;
            while (index < (data.closed ? nodes.length : nodes.length - 1) && nodes.length > minPoints) {
                var prev = nodes[(index - 1 + nodes.length) % nodes.length];
                var mid = nodes[index];
                var next = nodes[(index + 1) % nodes.length];
                if (prev === next) break;
                var merged = mergeSegments(prev, mid, next);
                if (merged.error <= tolerance) {
                    prev.right = merged.right;
                    next.left = merged.left;
                    prev.samples = prev.samples.concat(mid.samples.slice(1));
                    nodes.splice(index, 1);
                    removedAny = true;
                } else {
                    index++;
                }
            }
        }

        var points = [];
        for (var k = 0; k < nodes.length; k++) {
            points.push({anchor: nodes[k].anchor, left: nodes[k].left, right: nodes[k].right, corner: nodes[k].corner});
        }
        return {closed: data.closed, points: points};
    }

    function sampleSegment(from, to, pieces) {
        var result = [];
        for (var k = 0; k <= pieces; k++) {
            result.push(bezierPoint(from.anchor, from.right, to.left, to.anchor, k / pieces));
        }
        return result;
    }

    // prev → next를 베지어 하나로 맞춘 뒤, prev.samples + mid.samples(원본 점)와의 최대 거리를 돌려준다.
    function mergeSegments(prev, mid, next) {
        var samples = prev.samples.concat(mid.samples.slice(1));
        var p0 = prev.anchor;
        var p3 = next.anchor;
        var straight = isZeroHandle(prev.right, p0) && isZeroHandle(mid.left, mid.anchor) &&
            isZeroHandle(mid.right, mid.anchor) && isZeroHandle(next.left, p3);
        if (straight) {
            var worstLine = 0;
            for (var i = 0; i < samples.length; i++) {
                var dl = pointSegmentDistance(samples[i], p0, p3);
                if (dl > worstLine) worstLine = dl;
            }
            return {right: [p0[0], p0[1]], left: [p3[0], p3[1]], error: worstLine};
        }

        var t0 = tangentAt(prev.right, p0, samples[1]);
        var t1 = tangentAt(next.left, p3, samples[samples.length - 2]);
        var params = chordParams(samples);
        var handles = fitHandles(samples, params, p0, p3, t0, t1);
        var c1 = handles[0];
        var c2 = handles[1];
        var worst = 0;
        for (var j = 0; j < samples.length; j++) {
            var d = distance(samples[j], bezierPoint(p0, c1, c2, p3, params[j]));
            if (d > worst) worst = d;
        }
        return {right: c1, left: c2, error: worst};
    }

    function isZeroHandle(handle, anchor) {
        return Math.abs(handle[0] - anchor[0]) < 0.0001 && Math.abs(handle[1] - anchor[1]) < 0.0001;
    }

    // 핸들 방향. 핸들이 없으면(직선 구간) 곡선이 실제로 나아가는 쪽을 쓴다.
    function tangentAt(handle, anchor, fallbackPoint) {
        var direction = normalize([handle[0] - anchor[0], handle[1] - anchor[1]]);
        if (direction[0] === 0 && direction[1] === 0) {
            direction = normalize([fallbackPoint[0] - anchor[0], fallbackPoint[1] - anchor[1]]);
        }
        return direction;
    }

    function chordParams(samples) {
        var params = [0];
        var total = 0;
        for (var i = 1; i < samples.length; i++) {
            total += distance(samples[i - 1], samples[i]);
            params.push(total);
        }
        if (total === 0) return params;
        for (var j = 0; j < params.length; j++) params[j] /= total;
        return params;
    }

    // 양 끝 접선 방향이 정해진 베지어의 핸들 길이(α, β)를 최소제곱으로 푼다(Schneider 1990).
    // 풀이가 불안정하거나 핸들이 뒤로 접히면 현의 1/3 길이로 둔다.
    function fitHandles(samples, params, p0, p3, t0, t1) {
        var c11 = 0, c12 = 0, c22 = 0, x1 = 0, x2 = 0;
        for (var i = 0; i < samples.length; i++) {
            var t = params[i];
            var u = 1 - t;
            var b1 = 3 * u * u * t;
            var b2 = 3 * u * t * t;
            var a1 = [t0[0] * b1, t0[1] * b1];
            var a2 = [t1[0] * b2, t1[1] * b2];
            var base = [
                (u * u * u + b1) * p0[0] + (b2 + t * t * t) * p3[0],
                (u * u * u + b1) * p0[1] + (b2 + t * t * t) * p3[1]
            ];
            var rx = samples[i][0] - base[0];
            var ry = samples[i][1] - base[1];
            c11 += a1[0] * a1[0] + a1[1] * a1[1];
            c12 += a1[0] * a2[0] + a1[1] * a2[1];
            c22 += a2[0] * a2[0] + a2[1] * a2[1];
            x1 += a1[0] * rx + a1[1] * ry;
            x2 += a2[0] * rx + a2[1] * ry;
        }
        var det = c11 * c22 - c12 * c12;
        var alpha, beta;
        if (Math.abs(det) > 1e-12) {
            alpha = (x1 * c22 - x2 * c12) / det;
            beta = (c11 * x2 - c12 * x1) / det;
        }
        var chord = distance(p0, p3);
        if (!(alpha > 0) || !(beta > 0) || alpha > chord * 2 || beta > chord * 2) {
            alpha = chord / 3;
            beta = chord / 3;
        }
        return [
            [p0[0] + t0[0] * alpha, p0[1] + t0[1] * alpha],
            [p3[0] + t1[0] * beta, p3[1] + t1[1] * beta]
        ];
    }

    // 모서리인지 보는 거리. 샘플 간격·허용 오차보다 넉넉해야 떨림에 속지 않고,
    // 부드럽기 강도를 올릴수록 더 멀리서 본다(그만큼 큰 굴곡까지 떨림으로 친다).
    function cornerWindow(options) {
        var base = 4 * options.sampleStep;
        var fromTolerance = 3 * options.tolerance;
        if (fromTolerance > base) base = fromTolerance;
        return base * (1 + 2 * options.smoothStrength / 100);
    }

    // 베지어 구간을 일정 간격의 점으로 편다. 점 하나가 여러 번 겹치면 이후 계산이 0으로 나뉘므로 버린다.
    function samplePathPoints(points, closed, step) {
        var result = [];
        var count = closed ? points.length : points.length - 1;
        for (var i = 0; i < count; i++) {
            var current = points[i];
            var next = points[(i + 1) % points.length];
            var p0 = current.anchor;
            var c1 = current.right;
            var c2 = next.left;
            var p3 = next.anchor;
            var span = distance(p0, c1) + distance(c1, c2) + distance(c2, p3);
            var pieces = Math.ceil(span / step);
            if (pieces < 1) pieces = 1;
            if (pieces > 60) pieces = 60;
            for (var k = 0; k < pieces; k++) {
                pushUnique(result, bezierPoint(p0, c1, c2, p3, k / pieces));
            }
        }
        if (!closed) pushUnique(result, [points[points.length - 1].anchor[0], points[points.length - 1].anchor[1]]);
        return result;
    }

    function bezierPoint(p0, c1, c2, p3, t) {
        var u = 1 - t;
        var a = u * u * u;
        var b = 3 * u * u * t;
        var c = 3 * u * t * t;
        var d = t * t * t;
        return [
            a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
            a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]
        ];
    }

    // Ramer–Douglas–Peucker. 닫힌 패스는 시작점을 끝에 한 번 더 붙여 열린 선처럼 줄인 뒤 되돌린다.
    function simplifyPoints(points, closed, tolerance, minPoints) {
        if (points.length <= 2) return points;
        var working = points;
        if (closed) {
            working = points.concat([[points[0][0], points[0][1]]]);
        }
        var keep = [];
        for (var i = 0; i < working.length; i++) keep.push(false);
        keep[0] = true;
        keep[working.length - 1] = true;
        rdpMark(working, 0, working.length - 1, tolerance, keep);

        var reduced = [];
        for (var j = 0; j < working.length; j++) {
            if (keep[j]) reduced.push([working[j][0], working[j][1]]);
        }
        if (closed) reduced.pop();
        if (reduced.length < minPoints) return relaxedSample(points, minPoints);
        return reduced;
    }

    function rdpMark(points, first, last, tolerance, keep) {
        if (last <= first + 1) return;
        var worst = -1;
        var worstIndex = -1;
        for (var i = first + 1; i < last; i++) {
            var d = pointSegmentDistance(points[i], points[first], points[last]);
            if (d > worst) {
                worst = d;
                worstIndex = i;
            }
        }
        if (worst <= tolerance || worstIndex < 0) return;
        keep[worstIndex] = true;
        rdpMark(points, first, worstIndex, tolerance, keep);
        rdpMark(points, worstIndex, last, tolerance, keep);
    }

    // 너무 줄어들어 패스가 무너질 때 쓰는 최소 보루: 원래 점을 고르게 뽑아 개수만 맞춘다.
    function relaxedSample(points, minPoints) {
        var result = [];
        var wanted = Math.min(minPoints, points.length);
        for (var i = 0; i < wanted; i++) {
            var index = Math.round(i * (points.length - 1) / (wanted - 1 || 1));
            result.push([points[index][0], points[index][1]]);
        }
        return result;
    }

    function pointSegmentDistance(point, start, end) {
        var dx = end[0] - start[0];
        var dy = end[1] - start[1];
        var lengthSquared = dx * dx + dy * dy;
        if (lengthSquared === 0) return distance(point, start);
        var t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        return distance(point, [start[0] + t * dx, start[1] + t * dy]);
    }

    // 직선에서 벗어난 정도(도). 0이면 곧게 이어지고, 180이면 왔던 길로 되꺾인다.
    function turnDeviation(prev, current, next) {
        var ax = current[0] - prev[0];
        var ay = current[1] - prev[1];
        var bx = next[0] - current[0];
        var by = next[1] - current[1];
        var la = Math.sqrt(ax * ax + ay * ay);
        var lb = Math.sqrt(bx * bx + by * by);
        if (la === 0 || lb === 0) return 0;
        var cos = (ax * bx + ay * by) / (la * lb);
        if (cos > 1) cos = 1;
        if (cos < -1) cos = -1;
        return Math.acos(cos) * 180 / Math.PI;
    }

    // 모서리로 남길 점을 고른다. 각도 임계값이 0이면 아무것도 모서리로 두지 않는다.
    // 바로 옆 점끼리 재면 연필 선의 잔떨림이 모두 모서리로 잡히므로, 앞뒤로 window(pt)만큼
    // 떨어진 점까지의 방향을 비교한다. 진짜 모서리는 멀리서 봐도 꺾여 있고 떨림은 펴진다.
    function markCorners(points, closed, thresholdDeg, window) {
        var corners = [];
        for (var i = 0; i < points.length; i++) corners.push(false);
        if (thresholdDeg <= 0) return corners;
        for (var j = 0; j < points.length; j++) {
            if (!closed && (j === 0 || j === points.length - 1)) continue;
            var prev = neighborAt(points, closed, j, -1, window);
            var next = neighborAt(points, closed, j, 1, window);
            if (prev === null || next === null) continue;
            if (turnDeviation(prev, points[j], next) > thresholdDeg) corners[j] = true;
        }
        return corners;
    }

    // index에서 direction 쪽으로 window만큼 떨어진 점. 열린 패스는 끝에서 멈추고,
    // 닫힌 패스는 반대편까지 넘어가지 않도록 절반 지점에서 멈춘다.
    function neighborAt(points, closed, index, direction, window) {
        var count = points.length;
        var limit = closed ? Math.floor((count - 1) / 2) : count;
        var travelled = 0;
        var current = index;
        var last = null;
        for (var step = 0; step < limit; step++) {
            var nextIndex = current + direction;
            if (!closed && (nextIndex < 0 || nextIndex > count - 1)) break;
            nextIndex = (nextIndex + count) % count;
            travelled += distance(points[current], points[nextIndex]);
            current = nextIndex;
            last = points[current];
            if (travelled >= window) break;
        }
        return last;
    }

    // Taubin 평활(λ 펴기 → μ 되돌리기). 라플라시안만 반복하면 세포막이 쪼그라들지만,
    // 음수 계수로 한 번 되밀면 크기를 지키면서 곡률이 튀는 곳만 눌린다.
    function smoothPoints(points, closed, corners, strength) {
        var ratio = strength / 100;
        if (ratio <= 0 || points.length < 3) return points;
        var lambda = 0.5 * Math.min(1, ratio * 2);
        var mu = -lambda * 1.06;
        var iterations = Math.max(1, Math.round(ratio * 8));

        var current = [];
        for (var i = 0; i < points.length; i++) current.push([points[i][0], points[i][1]]);
        for (var pass = 0; pass < iterations; pass++) {
            current = relax(current, closed, corners, lambda);
            current = relax(current, closed, corners, mu);
        }
        return current;
    }

    function relax(points, closed, corners, factor) {
        var result = [];
        for (var i = 0; i < points.length; i++) {
            var fixed = corners[i] || (!closed && (i === 0 || i === points.length - 1));
            if (fixed) {
                result.push([points[i][0], points[i][1]]);
                continue;
            }
            var prev = points[(i - 1 + points.length) % points.length];
            var next = points[(i + 1) % points.length];
            var mx = (prev[0] + next[0]) / 2 - points[i][0];
            var my = (prev[1] + next[1]) / 2 - points[i][1];
            result.push([points[i][0] + factor * mx, points[i][1] + factor * my]);
        }
        return result;
    }

    // 점만 남은 상태에 핸들을 붙인다. 부드러운 점은 앞뒤를 잇는 방향(Catmull-Rom 접선)을
    // 공유해 좌우 핸들이 일직선이 되고, 모서리 점은 좌우가 각자 자기 변을 향해 꺾인 채로 남는다.
    function buildBezier(points, closed, corners) {
        var result = [];
        var count = points.length;
        for (var i = 0; i < count; i++) {
            var current = points[i];
            var hasPrev = closed || i > 0;
            var hasNext = closed || i < count - 1;
            var prev = hasPrev ? points[(i - 1 + count) % count] : current;
            var next = hasNext ? points[(i + 1) % count] : current;
            var prevLength = hasPrev ? distance(prev, current) : 0;
            var nextLength = hasNext ? distance(current, next) : 0;

            var leftDir;
            var rightDir;
            if (corners[i]) {
                leftDir = normalize([current[0] - prev[0], current[1] - prev[1]]);
                rightDir = normalize([next[0] - current[0], next[1] - current[1]]);
            } else {
                var tangent = normalize([next[0] - prev[0], next[1] - prev[1]]);
                leftDir = tangent;
                rightDir = tangent;
            }

            result.push({
                anchor: [current[0], current[1]],
                left: [current[0] - leftDir[0] * prevLength / 3, current[1] - leftDir[1] * prevLength / 3],
                right: [current[0] + rightDir[0] * nextLength / 3, current[1] + rightDir[1] * nextLength / 3],
                corner: corners[i] ? true : false
            });
        }
        return result;
    }

    function normalize(vector) {
        var length = Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1]);
        if (length === 0) return [0, 0];
        return [vector[0] / length, vector[1] / length];
    }

    function distance(a, b) {
        var dx = b[0] - a[0];
        var dy = b[1] - a[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    function pushUnique(points, point) {
        if (points.length > 0) {
            var last = points[points.length - 1];
            if (Math.abs(last[0] - point[0]) < 0.0001 && Math.abs(last[1] - point[1]) < 0.0001) return;
        }
        points.push(point);
    }

    // -------------------------------------------------------
    // 패스 읽기 / 쓰기
    // -------------------------------------------------------
    function collectPaths(selection, items) {
        if (!selection) return;
        for (var i = 0; i < selection.length; i++) collectFromItem(selection[i], items);
    }

    function collectFromItem(item, items) {
        if (!item || item.locked || item.hidden) return;
        if (item.typename === "PathItem") {
            if (item.pathPoints.length >= 2 && !item.guides) items.push(item);
            return;
        }
        if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) collectFromItem(item.pathItems[i], items);
            return;
        }
        if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pageItems.length; j++) collectFromItem(item.pageItems[j], items);
        }
    }

    function readPathData(path) {
        var points = [];
        for (var i = 0; i < path.pathPoints.length; i++) {
            var pp = path.pathPoints[i];
            points.push({
                anchor: [pp.anchor[0], pp.anchor[1]],
                left: [pp.leftDirection[0], pp.leftDirection[1]],
                right: [pp.rightDirection[0], pp.rightDirection[1]],
                corner: pp.pointType === PointType.CORNER
            });
        }
        return {closed: path.closed, points: points};
    }

    // setEntirePath는 앵커만 넣으므로 핸들은 한 점씩 따로 쓴다. 점 개수가 바뀌는 경우까지
    // 한 번에 처리되는 유일한 호출이라, 점을 지웠다 다시 만드는 방식보다 훨씬 빠르다.
    function writePathData(path, data) {
        var anchors = [];
        for (var i = 0; i < data.points.length; i++) {
            anchors.push([data.points[i].anchor[0], data.points[i].anchor[1]]);
        }
        if (anchors.length < 2) return;
        var wasClosed = path.closed;
        path.setEntirePath(anchors);
        path.closed = wasClosed;
        for (var j = 0; j < data.points.length && j < path.pathPoints.length; j++) {
            var source = data.points[j];
            var pp = path.pathPoints[j];
            pp.leftDirection = [source.left[0], source.left[1]];
            pp.rightDirection = [source.right[0], source.right[1]];
            // 핸들 좌표가 반올림으로 아주 조금 어긋나면 SMOOTH를 거부하는 경우가 있다.
            // 점 종류는 모양에 영향을 주지 않으므로 실패해도 그냥 넘어간다.
            try {
                pp.pointType = source.corner ? PointType.CORNER : PointType.SMOOTH;
            } catch (typeError) {}
        }
    }

    function restoreSelection() {
        doc.selection = null;
        for (var i = 0; i < targets.length; i++) {
            try { targets[i].selected = true; } catch (e) {}
        }
    }

    // -------------------------------------------------------
    // 입력
    // -------------------------------------------------------
    function readFields() {
        removeMm = fieldValue(removeField, removeMm);
        simplifyStrength = fieldValue(simplifyField, simplifyStrength);
        smoothStrength = fieldValue(smoothField, smoothStrength);
        cornerAngle = fieldValue(cornerField, cornerAngle);
    }

    function fieldValue(field, fallback) {
        var parsed = parseNumber(field.input.text);
        if (parsed === null) return fallback;
        return clampValue(parsed, field.minimum, field.maximum);
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

    // 라벨 · 입력칸 · 스크롤바를 한 줄에 배치.
    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.spacing = 6;
        var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.preferredSize.width = INPUT_WIDTH;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;

        var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampValue(stepped, field.minimum, field.maximum));
            updatePreview();
        };
        slider.onChange = slider.onChanging;
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
        var parts = ["v3", simplifyStrength, smoothStrength, cornerAngle, previewEnabled ? "1" : "0", removeMm, activeTab];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if ((p[0] !== "v1" && p[0] !== "v2" && p[0] !== "v3") || p.length < 5) return;

        var savedSimplify = parseFloat(p[1]);
        var savedSmooth = parseFloat(p[2]);
        var savedCorner = parseFloat(p[3]);
        if (!isNaN(savedSimplify)) simplifyStrength = clampValue(savedSimplify, 0, 100);
        if (!isNaN(savedSmooth)) smoothStrength = clampValue(savedSmooth, 0, 100);
        if (!isNaN(savedCorner)) cornerAngle = clampValue(savedCorner, 0, 180);
        previewEnabled = (p[4] !== "0");
        if (p.length >= 6) {
            var savedRemove = parseFloat(p[5]);
            if (!isNaN(savedRemove)) removeMm = clampValue(savedRemove, 0, MAX_REMOVE_MM);
        }
        if (p.length >= 7) activeTab = (p[6] === "1") ? 1 : 0;
    }
})();
