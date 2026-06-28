// Cabinet Projection Script for Adobe Illustrator
// 선택한 사각형을 캐비넷 투영법으로 입체화

(function() {
if (app.documents.length > 0) {
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length > 0 && sel[0].typename == "PathItem") {
        var frontFace = sel[0];
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
        var width   = bounds[2] - bounds[0];
        var height  = bounds[1] - bounds[3];
        var defaultDepthMm = Math.round(Math.min(width, height) / 2 / 2.83464567 * 100) / 100;
        var depthInput = prompt("뒤로 이동 거리(mm)를 입력하세요.", defaultDepthMm);

        if (depthInput === null) {
            return;
        }

        var depthMm = parseFloat(String(depthInput).replace(",", "."));
        if (isNaN(depthMm) || depthMm <= 0) {
            alert("0보다 큰 숫자를 입력해주세요.");
            return;
        }

        var depth = depthMm * 2.83464567;

        // 1. 앞면 모서리 둥근 연결(Round Join) 적용
        frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        // ── 오른쪽 면 (측면) ────────────────────────────────────
        var rightFace = doc.pathItems.add();
        rightFace.setEntirePath([
            [bounds[2], bounds[1]],
            [bounds[2] + depth, bounds[1] + depth],
            [bounds[2] + depth, bounds[3] + depth],
            [bounds[2], bounds[3]]
        ]);
        rightFace.closed = true;
        copyStyle(frontFace, rightFace);


        // ── 위쪽 면 (상면) ──────────────────────────────────────
        var topFace = doc.pathItems.add();
        topFace.setEntirePath([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[1]],
            [bounds[2] + depth, bounds[1] + depth],
            [bounds[0] + depth, bounds[1] + depth]
        ]);
        topFace.closed = true;
        copyStyle(frontFace, topFace);

        rightFace.move(frontFace, ElementPlacement.PLACEBEFORE);
        topFace.move(frontFace, ElementPlacement.PLACEBEFORE);

        // 작업 완료 후 선택 해제 (결과를 한눈에 보기 위함)
        doc.selection = null;

    } else {
        alert("사각형 패스를 선택해주세요.");
    }
} else {
    alert("열려있는 문서가 없습니다.");
}

function copyStyle(source, target) {
    target.filled = source.filled;
    if (source.filled) {
        target.fillColor = source.fillColor;
    }

    target.stroked = source.stroked;
    if (source.stroked) {
        target.strokeColor = source.strokeColor;
        target.strokeWidth = source.strokeWidth;
        target.strokeDashes = source.strokeDashes;
        target.strokeCap = source.strokeCap;
        target.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        target.opacity = source.opacity;
    }
}
})();
