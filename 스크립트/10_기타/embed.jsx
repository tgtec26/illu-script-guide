#target Illustrator

/**
 * 개선된 이미지 포함 스크립트
 * - 에러 발생 시 해당 이미지를 건너뛰고 계속 진행합니다.
 * - 역순 반복문을 사용하여 무한 루프를 방지합니다.
 * - [수정] 잠긴 레이어나 개체는 자동으로 잠금 해제 후 포함합니다.
 * - [수정] 숨겨진(눈이 꺼진) 항목도 포함하여 처리합니다.
 */

if (app.documents.length > 0) {
    var doc = app.activeDocument;
    var successCount = 0;
    var failCount = 0;

    // placedItems 컬렉션을 역순으로 순회합니다.
    // 역순으로 돌려야 중간에 객체가 embed되어 컬렉션에서 빠져나가도 인덱스 오류가 나지 않습니다.
    for (var i = doc.placedItems.length - 1; i >= 0; i--) {
        var item = doc.placedItems[i];
        
        // [수정] 숨겨진 항목도 포함하도록 건너뛰는 로직을 제거했습니다.

        // 2. 레이어가 잠겨있으면 잠금을 해제합니다.
        if (item.layer.locked) {
            item.layer.locked = false;
        }

        // 3. 객체 자체가 잠겨있으면 잠금을 해제합니다.
        if (item.locked) {
            item.locked = false;
        }

        try {
            item.embed();
            successCount++;
        } catch (e) {
            // 에러가 발생해도 멈추지 않고 카운트만 하고 다음으로 넘어갑니다.
            failCount++;
            // 디버깅을 위해 에러 로그를 남기고 싶다면 아래 주석 해제
            // $.writeln("Error on item " + i + ": " + e.message);
        }
    }

    var resultMessage = "처리가 완료되었습니다.\n";
    resultMessage += "- 성공: " + successCount + "개\n";
    
    if (failCount > 0) {
        resultMessage += "- 실패: " + failCount + "개 (링크 유실 또는 권한 문제)";
    }

    alert(resultMessage);

} else {
    alert("먼저 문서를 열어주세요.");
}