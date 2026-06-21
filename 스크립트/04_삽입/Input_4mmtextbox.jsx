/*
  Illustrator Script: View Center Rectangle
  Description: 현재 화면(View) 중앙에 8mm x 4mm, 0.3pt 두께의 실선 사각형 생성
*/

(function() {
    // 1. 문서 확인
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;

    // 2. 수치 설정 (1mm = 2.834645pt)
    var mmToPt = 2.83464567;
    var rectWidth = 8 * mmToPt;
    var rectHeight = 4 * mmToPt;
    var strokeThick = 0.3;

    // 3. 색상 정의 (K100 or RGB Black)
    var lineColor;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        lineColor = new CMYKColor();
        lineColor.cyan = 0; lineColor.magenta = 0; lineColor.yellow = 0; lineColor.black = 100;
    } else {
        lineColor = new RGBColor();
        lineColor.red = 0; lineColor.green = 0; lineColor.blue = 0;
    }

    // 4. 위치 계산 (현재 보고 있는 뷰의 중심)
    var currentView = doc.views[0];
    var centerPoint = currentView.centerPoint; // [x, y]
    var centerX = centerPoint[0];
    var centerY = centerPoint[1];

    // 사각형 생성을 위한 좌표 계산 (Top, Left)
    // 일러스트레이터의 rectangle 함수는 (Top, Left, Width, Height) 순서로 입력받습니다.
    var top = centerY + (rectHeight / 2);
    var left = centerX - (rectWidth / 2);

    // 5. 사각형 생성
    var rectObj = doc.pathItems.rectangle(top, left, rectWidth, rectHeight);

    // 6. 속성 적용
    rectObj.filled = false;          // 면 없음
    rectObj.stroked = true;          // 선 있음
    rectObj.strokeColor = lineColor; // 색상 적용
    rectObj.strokeWidth = strokeThick; // 두께 0.3pt
    rectObj.strokeDashes = [];       // 실선 (파선 배열 초기화)

    // 7. 선택 상태 변경
    doc.selection = null;
    rectObj.selected = true;

})();