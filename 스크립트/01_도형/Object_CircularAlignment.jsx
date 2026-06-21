// 스크립트 이름: CircularAlignment_Fixed_WithDelete.jsx
// 기능: 선택된 두 개체 중 작은 개체를 큰 개체의 경계선 8방향에 복제 배치 후, 원본 작은 개체 삭제

var anglesInDegrees = [0, 45, 90, 135, 180, 225, 270, 315];
var anglesInRadians = [];
for (var k = 0; k < anglesInDegrees.length; k++) {
    anglesInRadians.push(anglesInDegrees[k] * (Math.PI / 180));
}

function runAlignmentScript() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var selection = doc.selection;

    if (!selection || selection.length !== 2) {
        alert("정확히 두 개의 개체를 선택해야 합니다.");
        return;
    }

    // 1. 개체 크기 비교
    var itemA = selection[0];
    var itemB = selection[1];

    var areaA = (itemA.geometricBounds[2] - itemA.geometricBounds[0]) * (itemA.geometricBounds[1] - itemA.geometricBounds[3]);
    var areaB = (itemB.geometricBounds[2] - itemB.geometricBounds[0]) * (itemB.geometricBounds[1] - itemB.geometricBounds[3]);

    var largeItem, smallItem;
    if (areaA >= areaB) {
        largeItem = itemA;
        smallItem = itemB;
    } else {
        largeItem = itemB;
        smallItem = itemA;
    }

    // 2. 기준(큰) 개체 정보 계산
    var lBounds = largeItem.geometricBounds;
    var largeCenterX = lBounds[0] + (lBounds[2] - lBounds[0]) / 2;
    var largeCenterY = lBounds[1] + (lBounds[3] - lBounds[1]) / 2;
    var lRadiusX = (lBounds[2] - lBounds[0]) / 2;
    var lRadiusY = (lBounds[1] - lBounds[3]) / 2;

    var offsetRadius = 0; 

    // 3. 복제 및 배치 루프
    try { doc.suspendRedraw(); } catch(e) {}

    for (var i = 0; i < anglesInRadians.length; i++) {
        var rad = anglesInRadians[i];

        // 3-1. 작은 개체 복제
        var duplicatedItem = smallItem.duplicate();

        // 3-2. 배치 좌표 계산 (타원 방정식)
        var denom = Math.sqrt(Math.pow(lRadiusY * Math.cos(rad), 2) + Math.pow(lRadiusX * Math.sin(rad), 2));
        var ellipseRadius = (lRadiusX * lRadiusY) / denom;
        var finalDistance = ellipseRadius + offsetRadius;

        var targetX = largeCenterX + finalDistance * Math.cos(rad);
        var targetY = largeCenterY + finalDistance * Math.sin(rad);
        
        // 3-3. 복제본 중심 좌표
        var dBounds = duplicatedItem.geometricBounds;
        var dCenterX = dBounds[0] + (dBounds[2] - dBounds[0]) / 2;
        var dCenterY = dBounds[1] + (dBounds[3] - dBounds[1]) / 2;

        // 3-4. 이동
        duplicatedItem.translate(targetX - dCenterX, targetY - dCenterY);
    }

    // ★ 추가된 부분: 배치가 끝난 후 원본 작은 개체 삭제
    smallItem.remove();

    try { doc.resumeRedraw(); } catch(e) {}
}

runAlignmentScript();