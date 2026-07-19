#target illustrator

/*
  Align_LeaderSymbol.jsx
  기능: 사선 지시선과 기호를 정렬합니다.
        직선(지시선)과 기호를 함께 선택하고 실행하면 직선은 고정되고 기호가 이동합니다.
        - 직선의 가상 연장선이 기호의 중심을 지나도록
        - 직선 끝과 기호 외곽(보이는 영역) 사이 거리가 0.5mm가 되도록
  기호 외곽은 보이는 영역(visibleBounds)에 내접하는 타원으로 계산하므로
  원형 기호는 어떤 각도에서도 시각적 간격이 일정합니다.
*/

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

    // 기호의 실제 보이는 외곽을 측정. 텍스트가 포함된 경우 visibleBounds가
    // 행간/여백까지 포함해 실제 글리프보다 크므로, 복제본을 윤곽선화해서 재고 삭제한다.
    var vb = getTightBounds(symbol); // [left, top, right, bottom]
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

    // 연장선 방향으로 타원 중심~외곽까지의 거리
    var t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));

    // 목표 중심: 선 끝 E에서 연장 방향으로 (0.5mm + 타원 반경) 만큼
    var targetX = E[0] + dx * (gap + t);
    var targetY = E[1] + dy * (gap + t);

    symbol.translate(targetX - c0[0], targetY - c0[1]);

    // 선택 상태 복원
    doc.selection = null;
    line.selected = true;
    symbol.selected = true;

    function getTightBounds(item) {
        var dup = item.duplicate();
        var measured = null;

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
                var ob = outlined[i].visibleBounds;
                if (measured === null) {
                    measured = [ob[0], ob[1], ob[2], ob[3]];
                } else {
                    if (ob[0] < measured[0]) measured[0] = ob[0];
                    if (ob[1] > measured[1]) measured[1] = ob[1];
                    if (ob[2] > measured[2]) measured[2] = ob[2];
                    if (ob[3] < measured[3]) measured[3] = ob[3];
                }
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
