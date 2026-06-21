/*
  Illustrator Script: Crosshair Dashed Line (View Center)
  Description: 현재 보고 있는 화면(View)의 정중앙에 4mm 십자 파선을 생성합니다.
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
    var lineLengthMm = 4; 
    var lineLengthPt = lineLengthMm * mmToPt; 
    
    var strokeWeight = 0.3;
    var dashPattern = [2, 1];

    // 3. 색상 정의
    var lineColor;
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        lineColor = new CMYKColor();
        lineColor.cyan = 0; lineColor.magenta = 0; lineColor.yellow = 0; lineColor.black = 100;
    } else {
        lineColor = new RGBColor();
        lineColor.red = 0; lineColor.green = 0; lineColor.blue = 0;
    }

    // 4. 위치 계산
    var currentView = doc.views[0];
    var centerPoint = currentView.centerPoint; 
    
    var centerX = centerPoint[0];
    var centerY = centerPoint[1];
    var halfLength = lineLengthPt / 2;

    // 선택 해제
    doc.selection = null;

    // --- 5. 수직선 생성 (기존 로직) ---
    var vLine = doc.pathItems.add();
    vLine.setEntirePath([
        [centerX, centerY + halfLength], // 위
        [centerX, centerY - halfLength]  // 아래
    ]);
    applyStyles(vLine);

    // --- 6. 수평선 생성 (추가된 로직) ---
    var hLine = doc.pathItems.add();
    hLine.setEntirePath([
        [centerX - halfLength, centerY], // 왼쪽
        [centerX + halfLength, centerY]  // 오른쪽
    ]);
    applyStyles(hLine);

    // 공통 속성 적용 함수
    function applyStyles(line) {
        line.filled = false;
        line.stroked = true;
        line.strokeColor = lineColor;
        line.strokeWidth = strokeWeight;
        line.strokeDashes = dashPattern;
        line.selected = true; // 생성된 선들을 선택 상태로 유지
    }

})();