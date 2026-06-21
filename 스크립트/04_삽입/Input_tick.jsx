/*
  Script: Create Center Crosshair (Ungrouped)
  Description: 현재 뷰의 중앙에 1mm 길이, 0.4pt 두께의 수직/수평선을 개별 객체로 생성합니다.
*/

(function() {
    // 문서가 열려있는지 확인
    if (app.documents.length === 0) {
        alert("문서를 열고 실행해주세요.");
        return;
    }

    var doc = app.activeDocument;
    
    // 단위 변환 및 설정
    var mmToPt = 2.83464567; // 1 mm = 2.8346... pt
    var lineLengthMm = 1; 
    var lineLengthPt = lineLengthMm * mmToPt;
    var strokeWidthPt = 0.4; // 요청하신 두께 0.4pt

    // 현재 보고 있는 뷰(View)의 중앙 좌표 가져오기
    var activeView = doc.views[0];
    var centerPoint = activeView.centerPoint; // [x, y]
    var centerX = centerPoint[0];
    var centerY = centerPoint[1];

    // 색상 정의 (기본 검정)
    var strokeColor = new CMYKColor();
    strokeColor.cyan = 0;
    strokeColor.magenta = 0;
    strokeColor.yellow = 0;
    strokeColor.black = 100;

    // 현재 활성화된 레이어에 객체 생성
    var activeLayer = doc.activeLayer;

    // 1. 수평선 만들기 (Horizontal Line) - 그룹 없이 바로 레이어에 추가
    var hLine = activeLayer.pathItems.add();
    var hStart = [centerX - (lineLengthPt / 2), centerY];
    var hEnd = [centerX + (lineLengthPt / 2), centerY];
    
    hLine.setEntirePath([hStart, hEnd]);
    hLine.filled = false;
    hLine.stroked = true;
    hLine.strokeWidth = strokeWidthPt;
    hLine.strokeColor = strokeColor;

    // 2. 수직선 만들기 (Vertical Line) - 그룹 없이 바로 레이어에 추가
    var vLine = activeLayer.pathItems.add();
    var vStart = [centerX, centerY - (lineLengthPt / 2)];
    var vEnd = [centerX, centerY + (lineLengthPt / 2)];

    vLine.setEntirePath([vStart, vEnd]);
    vLine.filled = false;
    vLine.stroked = true;
    vLine.strokeWidth = strokeWidthPt;
    vLine.strokeColor = strokeColor;

    // 생성된 두 선을 모두 선택 상태로 변경 (위치 확인용)
    doc.selection = null;
    hLine.selected = true;
    vLine.selected = true;

})();