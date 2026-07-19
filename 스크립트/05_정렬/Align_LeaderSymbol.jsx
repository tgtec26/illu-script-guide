#target illustrator

/*
  Align_LeaderSymbol.jsx
  기능: 사선 지시선과 기호를 정렬합니다.
        직선(지시선)과 기호를 함께 선택하고 실행하면 직선은 고정되고 기호가 이동합니다.
        - 직선의 가상 연장선이 기호의 중심(글리프 실제 외곽 기준)을 지나도록
        - 연장선을 따라 직선 끝에서 실제 잉크(글리프/도형)까지의 거리가 0.5mm가 되도록
  복제본을 윤곽선화해 실제 외곽 곡선을 샘플링하므로 원문자·일반 문자 모두
  형태와 무관하게 시각적 간격이 일정합니다. (그림자 등 효과는 무시)
*/

// 마지막 실행 스크립트 기록 → Align_RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function () {
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    var GAP_MM = 0.5;
    var gap = GAP_MM * 2.834645; // mm → pt

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length !== 2) {
        alert("지시선(직선) 하나와 기호 하나, 총 2개를 선택한 뒤 실행해주세요.");
        return;
    }

    function isLine(item) {
        try {
            return item.typename === "PathItem" && !item.closed &&
                   item.pathPoints && item.pathPoints.length === 2;
        } catch (e) {
            return false;
        }
    }

    var line = null, symbol = null;
    var line0 = isLine(sel[0]), line1 = isLine(sel[1]);

    if (line0 && !line1) { line = sel[0]; symbol = sel[1]; }
    else if (line1 && !line0) { line = sel[1]; symbol = sel[0]; }
    else if (line0 && line1) {
        alert("둘 다 직선입니다. 직선 하나와 기호 하나를 선택해주세요.");
        return;
    } else {
        alert("앵커 2개짜리 열린 직선(지시선)을 찾지 못했습니다.");
        return;
    }

    var p0 = line.pathPoints[0].anchor;
    var p1 = line.pathPoints[1].anchor;

    // 기호의 실제 외곽 측정: 복제본을 윤곽선화한 뒤
    // - 타이트 바운즈(geometricBounds + 선굵기/2, 효과 무시) → 중심 계산용
    // - 외곽 곡선 샘플 점 목록 → 연장선 위 실제 잉크 거리 계산용
    var inkSamples = [];
    var vb = measureSymbol(symbol, inkSamples); // [left, top, right, bottom]
    var c0 = [(vb[0] + vb[2]) / 2, (vb[1] + vb[3]) / 2];
    var a = Math.abs(vb[2] - vb[0]) / 2; // 가로 반지름
    var b = Math.abs(vb[1] - vb[3]) / 2; // 세로 반지름

    if (a <= 0 || b <= 0) {
        alert("기호의 크기를 확인할 수 없습니다.");
        return;
    }

    function dist2(p, q) {
        var dx = p[0] - q[0], dy = p[1] - q[1];
        return dx * dx + dy * dy;
    }

    // 기호 중심에 가까운 끝 E(간격 기준점), 먼 끝 F(연장 방향 기준)
    var E, F;
    if (dist2(p0, c0) <= dist2(p1, c0)) { E = p0; F = p1; }
    else { E = p1; F = p0; }

    var dx = E[0] - F[0], dy = E[1] - F[1];
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.0001) {
        alert("직선의 길이가 0입니다.");
        return;
    }
    dx /= len;
    dy /= len;

    // 기호 중심을 지나는 연장선 위에서, 잉크가 선 끝 방향으로 얼마나 뻗어 있는지 계산.
    // 후보: 연장선에서 횡거리 EPS 이내의 잉크 샘플. m = (중심 기준 연장선 방향 투영)의 최솟값.
    var EPS = 0.2 * 2.834645; // 0.2mm
    var m = null;
    for (var siIdx = 0; siIdx < inkSamples.length; siIdx++) {
        var q = inkSamples[siIdx];
        var rx = q.x - c0[0], ry = q.y - c0[1];
        var lateral = Math.abs(dx * ry - dy * rx);
        if (lateral <= EPS) {
            var proj = rx * dx + ry * dy - q.swHalf;
            if (m === null || proj < m) m = proj;
        }
    }

    if (m === null) {
        // 샘플이 연장선 근처에 없으면 타이트 바운즈 내접 타원으로 대체
        m = -1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
    }

    // 목표 중심: 연장선 위에서 첫 잉크 지점이 선 끝 + 0.5mm가 되는 위치
    var s = gap - m;
    var targetX = E[0] + dx * s;
    var targetY = E[1] + dy * s;

    symbol.translate(targetX - c0[0], targetY - c0[1]);

    // 선택 상태 복원
    doc.selection = null;
    line.selected = true;
    symbol.selected = true;

    function measureSymbol(item, samples) {
        var dup = item.duplicate();
        var measured = null;
        var SUBDIV = 16; // 곡선 세그먼트당 샘플 수

        function unionBounds(L, T, R, B) {
            if (measured === null) {
                measured = [L, T, R, B];
            } else {
                if (L < measured[0]) measured[0] = L;
                if (T > measured[1]) measured[1] = T;
                if (R > measured[2]) measured[2] = R;
                if (B < measured[3]) measured[3] = B;
            }
        }

        function samplePath(path, swHalf) {
            var pts = path.pathPoints;
            var n = pts.length;
            if (n === 0) return;
            var segCount = path.closed ? n : n - 1;

            for (var i = 0; i < segCount; i++) {
                var pA = pts[i], pB = pts[(i + 1) % n];
                var a0 = pA.anchor, a3 = pB.anchor;
                var a1 = pA.rightDirection, a2 = pB.leftDirection;

                for (var k = 0; k < SUBDIV; k++) {
                    var t = k / SUBDIV;
                    var u = 1 - t;
                    var x = u * u * u * a0[0] + 3 * u * u * t * a1[0] + 3 * u * t * t * a2[0] + t * t * t * a3[0];
                    var y = u * u * u * a0[1] + 3 * u * u * t * a1[1] + 3 * u * t * t * a2[1] + t * t * t * a3[1];
                    samples.push({x: x, y: y, swHalf: swHalf});
                }
            }
            // 열린 패스 마지막 앵커
            if (!path.closed) {
                samples.push({x: pts[n - 1].anchor[0], y: pts[n - 1].anchor[1], swHalf: swHalf});
            }
        }

        // 그림자 등 효과는 무시하고 실제 도형만 잰다:
        // geometricBounds + (선이 있으면) 선굵기/2, 외곽 곡선은 베지어 샘플링
        function walk(it) {
            var tn = it.typename;

            if (tn === "GroupItem") {
                for (var gi = 0; gi < it.pageItems.length; gi++) {
                    walk(it.pageItems[gi]);
                }
                return;
            }

            var gb, half = 0;
            try {
                gb = it.geometricBounds;
            } catch (eGb) {
                return;
            }
            try {
                if (it.stroked && it.strokeWidth > 0) half = it.strokeWidth / 2;
            } catch (eSw) {}

            unionBounds(gb[0] - half, gb[1] + half, gb[2] + half, gb[3] - half);

            if (tn === "PathItem") {
                samplePath(it, half);
            } else if (tn === "CompoundPathItem") {
                for (var ci = 0; ci < it.pathItems.length; ci++) {
                    samplePath(it.pathItems[ci], half);
                }
            } else {
                // 래스터/배치 등: 바운딩 박스 테두리를 샘플로 사용
                var steps = 8;
                for (var bi = 0; bi <= steps; bi++) {
                    var f = bi / steps;
                    samples.push({x: gb[0] + (gb[2] - gb[0]) * f, y: gb[1], swHalf: 0});
                    samples.push({x: gb[0] + (gb[2] - gb[0]) * f, y: gb[3], swHalf: 0});
                    samples.push({x: gb[0], y: gb[3] + (gb[1] - gb[3]) * f, swHalf: 0});
                    samples.push({x: gb[2], y: gb[3] + (gb[1] - gb[3]) * f, swHalf: 0});
                }
            }
        }

        try {
            doc.selection = null;
            dup.selected = true;
            // 텍스트가 있으면 윤곽선화 (없으면 무시됨)
            try { app.executeMenuCommand("outline"); } catch (eOutline) {}

            var outlined = doc.selection;
            if (!outlined || outlined.length === 0) {
                outlined = [dup];
            }

            for (var i = 0; i < outlined.length; i++) {
                walk(outlined[i]);
            }

            for (var j = outlined.length - 1; j >= 0; j--) {
                try { outlined[j].remove(); } catch (eRemove) {}
            }
        } catch (eMeasure) {
            try { dup.remove(); } catch (eRemove2) {}
        }

        if (measured === null) {
            measured = item.visibleBounds;
        }

        return measured;
    }
})();
