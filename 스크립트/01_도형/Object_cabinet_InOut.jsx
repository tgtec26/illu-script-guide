// Cabinet Projection Script for Adobe Illustrator (With Hidden Lines)
// 선택한 정사각형을 캐비넷 투영법으로 정육면체로 변환하고 숨은 선(파선) 추가

if (app.documents.length > 0) {
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length > 0 && sel[0].typename == "PathItem") {
        var frontFace = sel[0];
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
        var width   = bounds[2] - bounds[0];
        var height  = bounds[1] - bounds[3];

        frontFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        function makeShearMatrix(shearH, shearV) {
            var m = app.getIdentityMatrix();
            m.mValueA = 1;
            m.mValueB = shearV;
            m.mValueC = shearH;
            m.mValueD = 1;
            m.mValueTX = 0;
            m.mValueTY = 0;
            return m;
        }

        // ── 오른쪽 면 (측면) ────────────────────────────────────
        var rightFace = frontFace.duplicate();
        rightFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        rightFace.translate(width, 0);

        var scaleM = app.getScaleMatrix(50, 100);
        rightFace.transform(scaleM, true, false, false, false, 1, Transformation.BOTTOMLEFT);

        var shearV = Math.tan(45 * Math.PI / 180); // 1
        var shearMV = makeShearMatrix(0, shearV);
        rightFace.transform(shearMV, true, false, false, false, 1, Transformation.BOTTOMLEFT);


        // ── 위쪽 면 (상면) ──────────────────────────────────────
        var topFace = frontFace.duplicate();
        topFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        topFace.translate(0, height);

        var scaleMH = app.getScaleMatrix(100, 50);
        topFace.transform(scaleMH, true, false, false, false, 1, Transformation.BOTTOMLEFT);

        var shearH = Math.tan(45 * Math.PI / 180); // 1
        var shearMH = makeShearMatrix(shearH, 0);
        topFace.transform(shearMH, true, false, false, false, 1, Transformation.BOTTOMLEFT);


        // ── 숨겨진 선 (파선) 추가 ───────────────────────────────
        // 깊이(Depth) 이동량 계산 (가로/세로의 50%)
        var dx = width / 2;
        var dy = height / 2;

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
        alert("정사각형 패스를 선택해주세요.");
    }
} else {
    alert("열려있는 문서가 없습니다.");
}