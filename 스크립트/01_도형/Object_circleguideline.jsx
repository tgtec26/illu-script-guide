/*
  Illustrator Script: Create Guide Circles at Ends
  Description: 선택한 선의 양 끝점에 반지름 0.5mm 원을 생성하고 안내선으로 변경합니다.
*/

(function() {
    // 1. 문서 및 선택 확인
    if (app.documents.length === 0) return;

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length === 0) {
        alert("대상을 선택해주세요.");
        return;
    }

    // 2. 단위 변환 (mm -> point)
    // 1 mm = 2.834645 points
    var radiusMM = 0.5; 
    var radiusPt = radiusMM * 2.834645; 
    var diameterPt = radiusPt * 2;

    // 3. 메인 실행 루프
    for (var i = 0; i < sel.length; i++) {
        processItem(sel[i]);
    }

    // 4. 객체 처리 함수 (그룹 지원)
    function processItem(item) {
        if (item.typename === "GroupItem") {
            // 그룹이면 내부 아이템 순회
            for (var j = 0; j < item.pageItems.length; j++) {
                processItem(item.pageItems[j]);
            }
        } 
        else if (item.typename === "CompoundPathItem") {
            // 복합 패스면 내부 패스 순회
            for (var k = 0; k < item.pathItems.length; k++) {
                createCirclesForPath(item.pathItems[k]);
            }
        } 
        else if (item.typename === "PathItem") {
            // 일반 패스
            createCirclesForPath(item);
        }
    }

    // 5. 양 끝점에 원 생성 및 안내선 변환
    function createCirclesForPath(pathItem) {
        try {
            var points = pathItem.pathPoints;
            
            // 점이 2개 이상이어야 선이 성립됨
            if (points.length < 2) return;

            // (1) 시작점 좌표
            var startPoint = points[0].anchor; 
            drawGuideCircle(startPoint);

            // (2) 끝점 좌표
            // 닫힌 패스(Closed Path)가 아닐 경우에만 끝점이 의미가 있음
            // 하지만 요청하신 대로 '양 끝 앵커 포인트' 기준이므로 무조건 마지막 인덱스를 잡습니다.
            var endPoint = points[points.length - 1].anchor;
            
            // 시작점과 끝점이 다를 경우에만 생성 (점 하나짜리나 닫힌 패스 중복 방지 미세 조정)
            // 보통 선 작업에서는 시작!=끝 이므로 둘 다 생성합니다.
            if (startPoint[0] !== endPoint[0] || startPoint[1] !== endPoint[1]) {
                drawGuideCircle(endPoint);
            }

        } catch(e) {
            // 에러 무시
        }
    }

    // 6. 원 그리기 및 안내선 변환 함수
    function drawGuideCircle(centerCoords) {
        var x = centerCoords[0];
        var y = centerCoords[1];

        // Illustrator의 ellipse 메소드: (Top, Left, Width, Height)
        // Top은 Y좌표 + 반지름, Left는 X좌표 - 반지름
        var top = y + radiusPt;
        var left = x - radiusPt;

        var circle = doc.pathItems.ellipse(top, left, diameterPt, diameterPt);
        
        // 안내선으로 변경
        circle.guides = true;
        
        // (선택 사항) 안내선이지만 기본 색상/선 없음 처리 (깔끔하게)
        circle.filled = false;
        circle.stroked = false;
    }

})();