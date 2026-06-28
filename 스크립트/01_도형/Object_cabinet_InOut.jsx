// Cabinet Projection Script for Adobe Illustrator (With Hidden Lines)
// 선택한 사각형을 캐비넷 투영법으로 입체화하고 숨은 선(파선) 추가

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


        // ── 숨겨진 선 (파선) 추가 ───────────────────────────────
        var dx = depth;
        var dy = depth;

        var hiddenGroup = doc.activeLayer.groupItems.add();
        hiddenGroup.name = "Hidden Lines";

        // 1. 뒷면 좌측 상단 -> 뒷면 좌측 하단 -> 뒷면 우측 하단 (L자 형태)
        var backL = hiddenGroup.pathItems.add();
        backL.setEntirePath([
            [bounds[0] + dx, bounds[1] + dy], // 뒷면 좌측 상단
            [bounds[0] + dx, bounds[3] + dy], // 뒷면 좌측 하단
            [bounds[2] + dx, bounds[3] + dy]  // 뒷면 우측 하단
        ]);

        // 2. 앞면 좌측 하단 -> 뒷면 좌측 하단 (깊이를 연결하는 대각선)
        var backDiag = hiddenGroup.pathItems.add();
        backDiag.setEntirePath([
            [bounds[0], bounds[3]],           // 앞면 좌측 하단
            [bounds[0] + dx, bounds[3] + dy]  // 뒷면 좌측 하단
        ]);

        // 문서 색상 모드에 따른 60K 색상 설정
        var k60Color;
        if (doc.documentColorSpace == DocumentColorSpace.CMYK) {
            k60Color = new CMYKColor();
            k60Color.cyan = 0; k60Color.magenta = 0; k60Color.yellow = 0; k60Color.black = 60;
        } else {
            k60Color = new RGBColor();
            k60Color.red = 102; k60Color.green = 102; k60Color.blue = 102; // 60K와 유사한 RGB
        }

        // 숨겨진 선 속성 일괄 적용
        for (var i = 0; i < hiddenGroup.pathItems.length; i++) {
            var p = hiddenGroup.pathItems[i];
            p.filled = false;
            p.stroked = true;
            p.strokeWidth = frontFace.strokeWidth; // 원본 선 두께 반영
            p.strokeColor = k60Color;              // 60K 색상 적용
            p.strokeDashes = [2, 1];               // 2pt 선, 1pt 간격 파선
            p.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        }

        // 숨겨진 선 그룹을 실선들보다 맨 뒤(아래)로 보내기
        hiddenGroup.zOrder(ZOrderMethod.SENDTOBACK);

        // 작업 완료 후 선택 해제 (결과 확인용)
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
