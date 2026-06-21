// Cabinet Projection Script for Adobe Illustrator
// 선택한 정사각형을 캐비넷 투영법으로 정육면체로 변환

if (app.documents.length > 0) {
    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length > 0 && sel[0].typename == "PathItem") {
        var frontFace = sel[0];
        var bounds = frontFace.geometricBounds; // [left, top, right, bottom]
        var width   = bounds[2] - bounds[0];
        var height  = bounds[1] - bounds[3];

        // 1. 앞면 모서리 둥근 연결(Round Join) 적용
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

        // 변형 전 먼저 앞면의 우측에 정확히 위치시킵니다.
        rightFace.translate(width, 0);

        // 가로 50% 축소 (좌측 하단 기준 - 앞면과 붙어있는 면이 움직이지 않게 고정)
        var scaleM = app.getScaleMatrix(50, 100);
        rightFace.transform(scaleM, true, false, false, false, 1, Transformation.BOTTOMLEFT);

        // Vertical shear: +45도 (위로 기울이기)
        var shearV = Math.tan(45 * Math.PI / 180); // 1
        var shearMV = makeShearMatrix(0, shearV);
        rightFace.transform(shearMV, true, false, false, false, 1, Transformation.BOTTOMLEFT);


        // ── 위쪽 면 (상면) ──────────────────────────────────────
        var topFace = frontFace.duplicate();
        topFace.strokeJoin = StrokeJoin.ROUNDENDJOIN;

        // 변형 전 먼저 앞면의 위쪽에 정확히 위치시킵니다.
        topFace.translate(0, height);

        // 세로 50% 축소 (하단 좌측 기준 - 앞면과 붙어있는 면 고정)
        var scaleMH = app.getScaleMatrix(100, 50);
        topFace.transform(scaleMH, true, false, false, false, 1, Transformation.BOTTOMLEFT);

        // Horizontal shear: +45도 (오른쪽으로 기울이기)
        var shearH = Math.tan(45 * Math.PI / 180); // 1
        var shearMH = makeShearMatrix(shearH, 0);
        topFace.transform(shearMH, true, false, false, false, 1, Transformation.BOTTOMLEFT);

        // 작업 완료 후 선택 해제 (결과를 한눈에 보기 위함)
        doc.selection = null;

    } else {
        alert("정사각형 패스를 선택해주세요.");
    }
} else {
    alert("열려있는 문서가 없습니다.");
}