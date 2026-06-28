// Button Projection Script for Adobe Illustrator
// 선택한 원/타원을 뒤쪽으로 복제하고 접선 라인을 추가해 버튼처럼 입체화

(function() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0 || sel[0].typename !== "PathItem") {
        alert("원 또는 타원 패스를 선택해주세요.");
        return;
    }

    var frontFace = sel[0];
    if (!frontFace.closed) {
        alert("닫힌 원 또는 타원 패스를 선택해주세요.");
        return;
    }

    var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
    var width = bounds[2] - bounds[0];
    var height = bounds[1] - bounds[3];
    var mmToPt = 2.83464567;
    var defaultDepthMm = Math.round(Math.min(width, height) / 5 / mmToPt * 100) / 100;
    var depthInput = prompt("뒤로 이동 거리(mm)를 입력하세요.", defaultDepthMm);

    if (depthInput === null) {
        return;
    }

    var depthMm = parseFloat(String(depthInput).replace(",", "."));
    if (isNaN(depthMm) || depthMm <= 0) {
        alert("0보다 큰 숫자를 입력해주세요.");
        return;
    }

    var depth = depthMm * mmToPt;
    frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

    var backFace = frontFace.duplicate();
    backFace.name = "ButtonDepthOut";
    backFace.translate(depth, depth);
    backFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;
    backFace.move(frontFace, ElementPlacement.PLACEAFTER);

    var tangentPoints = getEllipseTangentPoints(bounds, depth, depth);
    var tangentA = makeTangentLine(doc, tangentPoints[0], depth, depth, frontFace);
    var tangentB = makeTangentLine(doc, tangentPoints[1], depth, depth, frontFace);

    try {
        tangentA.move(frontFace, ElementPlacement.PLACEAFTER);
        tangentB.move(frontFace, ElementPlacement.PLACEAFTER);
    } catch (e) {}

    doc.selection = null;

    function getEllipseTangentPoints(itemBounds, dx, dy) {
        var left = itemBounds[0];
        var top = itemBounds[1];
        var right = itemBounds[2];
        var bottom = itemBounds[3];
        var cx = (left + right) / 2;
        var cy = (top + bottom) / 2;
        var rx = (right - left) / 2;
        var ry = (top - bottom) / 2;
        var angle = Math.atan2(-ry * dx, rx * dy);

        var p1 = [
            cx + (rx * Math.cos(angle)),
            cy + (ry * Math.sin(angle))
        ];
        var p2 = [
            cx + (rx * Math.cos(angle + Math.PI)),
            cy + (ry * Math.sin(angle + Math.PI))
        ];

        return [p1, p2];
    }

    function makeTangentLine(documentRef, startPoint, dx, dy, source) {
        var line = documentRef.pathItems.add();
        line.setEntirePath([
            [startPoint[0], startPoint[1]],
            [startPoint[0] + dx, startPoint[1] + dy]
        ]);
        line.closed = false;
        line.filled = false;
        line.stroked = true;

        if (source.stroked) {
            line.strokeColor = source.strokeColor;
            line.strokeWidth = source.strokeWidth;
            line.strokeDashes = source.strokeDashes;
            line.strokeCap = source.strokeCap;
            line.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        }

        return line;
    }
})();
