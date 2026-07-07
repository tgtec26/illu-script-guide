/*
  Script: Graph Axis Label
  Description: 선택한 L자 형태의 패스를 그래프 축 스타일로 변환합니다.
    - 면 없음, 선 0.4pt (화살표는 스크립트 실행 후 수동 적용)
    - X축 오른쪽 끝 아래 1mm 간격으로 '시간' 배치 (오른쪽 정렬)
    - Y축 위 끝 왼쪽 1mm 간격으로 '거리' 배치 (세로쓰기, 윗정렬)
    - 원점에서 좌하단 45도 대각선 2mm 지점에 '0' 배치 (글자 중심 기준, GSMediumB1)
    - 글자: Spoqa Han Sans Neo Regular, 8pt
    - 간격은 글리프의 보이는 경계(윤곽선) 기준으로 계산
*/

(function() {
    // 1. 문서 및 선택 확인
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length !== 1 || sel[0].typename !== "PathItem") {
        alert("L자 형태의 패스 1개를 선택한 후 실행해주세요.");
        return;
    }

    var axisPath = sel[0];

    // 2. 수치 설정 (1mm = 2.834645pt)
    var mmToPt = 2.83464567;
    var gapX = 1 * mmToPt;                    // '시간' 간격 1mm
    var gapY = 1 * mmToPt;                    // '거리' 간격 1mm
    var gapZero = 2 * mmToPt / Math.sqrt(2);  // '0' 대각선 2mm의 수평/수직 성분
    var fontSize = 8;
    var fontName = "SpoqaHanSansNeo-Regular";
    var zeroFontName = "GSMediumB1";

    // 3. 색상 정의 (K100 or RGB Black)
    var blackColor;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        blackColor = new CMYKColor();
        blackColor.cyan = 0; blackColor.magenta = 0; blackColor.yellow = 0; blackColor.black = 100;
    } else {
        blackColor = new RGBColor();
        blackColor.red = 0; blackColor.green = 0; blackColor.blue = 0;
    }

    // 4. 폰트 확인
    var labelFont = null;
    try {
        labelFont = app.textFonts.getByName(fontName);
    } catch (e) {
        alert("Spoqa Han Sans Neo Regular 폰트를 찾을 수 없습니다.\n기본 폰트로 진행합니다.");
    }
    var zeroFont = null;
    try {
        zeroFont = app.textFonts.getByName(zeroFontName);
    } catch (e) {
        alert("GSMediumB1 폰트를 찾을 수 없습니다.\n기본 폰트로 진행합니다.");
    }

    // 5. 축 패스 스타일 적용
    axisPath.filled = false;
    axisPath.stroked = true;
    axisPath.strokeWidth = 0.4;
    axisPath.strokeColor = blackColor;

    // 6. 축 끝점 판별 (가장 오른쪽 앵커 = X축 끝, 가장 위 앵커 = Y축 끝)
    var points = axisPath.pathPoints;
    var xEnd = points[0].anchor;   // [x, y]
    var yEnd = points[0].anchor;
    for (var i = 1; i < points.length; i++) {
        var p = points[i].anchor;
        if (p[0] > xEnd[0]) xEnd = p;
        if (p[1] > yEnd[1]) yEnd = p;
    }
    var origin = [yEnd[0], xEnd[1]]; // 원점 = Y축의 x, X축의 y

    var activeLayer = doc.activeLayer;

    // 텍스트 프레임 공통 속성 적용
    function styleText(tf, font) {
        var attr = tf.textRange.characterAttributes;
        if (font !== null) attr.textFont = font;
        attr.size = fontSize;
        attr.fillColor = blackColor;
    }

    // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
    function glyphBounds(tf) {
        var dup = tf.duplicate();
        var outline = dup.createOutline();
        var gb = outline.geometricBounds; // [left, top, right, bottom]
        outline.remove();
        return gb;
    }

    // 글리프 경계의 (left, top)이 목표 지점에 오도록 이동
    function moveGlyphTo(tf, targetLeft, targetTop) {
        var gb = glyphBounds(tf);
        tf.translate(targetLeft - gb[0], targetTop - gb[1]);
    }

    // 7. '시간' 생성 - X축 오른쪽 끝 아래 1mm, 오른쪽 정렬
    var timeText = activeLayer.textFrames.add();
    timeText.contents = "시간";
    styleText(timeText, labelFont);
    timeText.paragraphs[0].paragraphAttributes.justification = Justification.RIGHT;
    var tb = glyphBounds(timeText);
    moveGlyphTo(timeText, xEnd[0] - (tb[2] - tb[0]), xEnd[1] - gapX);

    // 8. '거리' 생성 - 세로쓰기, Y축 왼쪽 1mm, 윗정렬
    var distText = activeLayer.textFrames.add();
    distText.contents = "거리";
    distText.orientation = TextOrientation.VERTICAL;
    styleText(distText, labelFont);
    var db = glyphBounds(distText);
    moveGlyphTo(distText, yEnd[0] - gapY - (db[2] - db[0]), yEnd[1]);

    // 9. '0' 생성 - 원점에서 좌하단 45도 대각선 2mm (글자 중심 기준, GSMediumB1)
    var zeroText = activeLayer.textFrames.add();
    zeroText.contents = "0";
    styleText(zeroText, zeroFont);
    var zb = glyphBounds(zeroText);
    var zw = zb[2] - zb[0];
    var zh = zb[1] - zb[3];
    moveGlyphTo(zeroText, origin[0] - gapZero - zw / 2, origin[1] - gapZero + zh / 2);

    // 10. 선택 상태 정리
    doc.selection = null;
    axisPath.selected = true;

})();
