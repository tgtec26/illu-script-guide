/* [위치 정렬 - 12방향 배치]
  1. 선택한 두 개체 중 기준 개체(큰/작은)를 라디오 버튼으로 선택 (기본: 큰 개체)
  2. 간격 옵션: 0mm / 0.5mm / 1.0mm (기본: 1.0mm)
  3. 기준 개체 주변 12개 위치 버튼을 클릭하면 즉시 배치
     - 위: 좌/중/우, 아래: 좌/중/우, 왼쪽: 상/중/하, 오른쪽: 상/중/하
  4. 모든 계산은 '눈에 보이는 영역' 기준 (선 두께/효과 포함)
     - 텍스트: 라이브 상태 유지. 임시 복제본만 외곽선화해 실측 후 삭제하므로
       깨서 정렬한 것과 같은 효과 (베이스라인 아래 빈 공간 제외)
     - 클리핑 마스크: 마스크 경로 기준
*/

// 마지막 실행 스크립트 기록 → Align_RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (sel.length !== 2) {
        alert("개체를 정확히 2개 선택해주세요.\n(현재 " + sel.length + "개 선택됨)");
        return;
    }

    var MM_TO_PT = 2.834645669;

    // -------------------------------------------------------
    // 경계 계산: 눈에 보이는 영역 기준 (선 두께/효과 포함)
    // 텍스트는 원본을 건드리지 않고 임시 복제본만 외곽선화해 실측 후 삭제
    // -------------------------------------------------------
    function getRealBounds(obj) {
        var bounds;

        if (obj.typename === "TextFrame") {
            var tempObj = obj.duplicate();
            var outlined = null;
            try {
                outlined = tempObj.createOutline();
                bounds = outlined.visibleBounds;
            } catch(e) {
                bounds = obj.visibleBounds;
            } finally {
                try {
                    if (outlined) outlined.remove();
                    if (tempObj) tempObj.remove();
                } catch(removeError) {}
            }
        } else if (obj.typename === "GroupItem") {
            bounds = getGroupRealBounds(obj);
            if (!bounds) bounds = obj.visibleBounds;
        } else {
            bounds = obj.visibleBounds;
        }

        return bounds;
    }

    function getGroupRealBounds(groupItem) {
        var bounds = null;

        if (groupItem.clipped) {
            bounds = getClippingBounds(groupItem);
            if (bounds) return bounds;
        }

        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (isClippingPath(child)) continue;

            var childBounds = getRealBounds(child);
            bounds = unionBounds(bounds, childBounds);
        }

        return bounds;
    }

    function getClippingBounds(groupItem) {
        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (isClippingPath(child)) {
                return child.geometricBounds;
            }
            if (child.typename === "GroupItem") {
                var nested = getClippingBounds(child);
                if (nested) return nested;
            }
        }
        return null;
    }

    function isClippingPath(item) {
        if (item.typename === "PathItem") {
            return item.clipping;
        }
        if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) {
                if (item.pathItems[i].clipping) return true;
            }
        }
        return false;
    }

    function unionBounds(boundsA, boundsB) {
        if (!boundsB) return boundsA;
        if (!boundsA) return [boundsB[0], boundsB[1], boundsB[2], boundsB[3]];

        return [
            Math.min(boundsA[0], boundsB[0]),
            Math.max(boundsA[1], boundsB[1]),
            Math.max(boundsA[2], boundsB[2]),
            Math.min(boundsA[3], boundsB[3])
        ];
    }

    function getArea(obj) {
        var b = getRealBounds(obj);
        return (b[2] - b[0]) * Math.abs(b[1] - b[3]);
    }

    // 이동 함수: 현재의 '진짜 경계'와 목표 위치의 차이만큼 이동
    function setPosition(obj, targetLeft, targetTop) {
        var currentBounds = getRealBounds(obj);
        obj.translate(targetLeft - currentBounds[0], targetTop - currentBounds[1]);
    }

    // -------------------------------------------------------
    // 이전 설정 불러오기 (기준 개체 / 간격)
    // -------------------------------------------------------
    var PREF_FILE = new File(Folder.temp + "/illu_align_position12_pref.txt");
    var pref = { ref: "big", gap: "1.0" };
    try {
        if (PREF_FILE.exists) {
            PREF_FILE.encoding = "UTF-8";
            PREF_FILE.open("r");
            var raw = PREF_FILE.read();
            PREF_FILE.close();
            var parts = raw.split("|");
            if (parts[0] === "big" || parts[0] === "small") pref.ref = parts[0];
            if (parts[1] === "0" || parts[1] === "0.5" || parts[1] === "1.0") pref.gap = parts[1];
        }
    } catch (e) {}

    function savePref(refMode, gapMode) {
        try {
            PREF_FILE.encoding = "UTF-8";
            PREF_FILE.open("w");
            PREF_FILE.write(refMode + "|" + gapMode);
            PREF_FILE.close();
        } catch (e) {}
    }

    // -------------------------------------------------------
    // ScriptUI 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "위치 정렬 (12방향)");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 10;
    dlg.margins = 14;

    // --- 기준 개체 선택 ---
    var refPanel = dlg.add("panel", undefined, "기준 개체");
    refPanel.orientation = "row";
    refPanel.alignChildren = "left";
    refPanel.margins = [15, 15, 15, 10];
    refPanel.spacing = 20;
    var refBig = refPanel.add("radiobutton", undefined, "큰 개체");
    var refSmall = refPanel.add("radiobutton", undefined, "작은 개체");
    if (pref.ref === "small") refSmall.value = true;
    else refBig.value = true;

    // --- 간격 옵션 ---
    var gapPanel = dlg.add("panel", undefined, "간격");
    gapPanel.orientation = "row";
    gapPanel.alignChildren = "left";
    gapPanel.margins = [15, 15, 15, 10];
    gapPanel.spacing = 20;
    var gap0 = gapPanel.add("radiobutton", undefined, "0mm");
    var gapHalf = gapPanel.add("radiobutton", undefined, "0.5mm");
    var gapOne = gapPanel.add("radiobutton", undefined, "1.0mm");
    if (pref.gap === "0") gap0.value = true;
    else if (pref.gap === "0.5") gapHalf.value = true;
    else gapOne.value = true;

    // --- 위치 버튼 (기준 개체 주변 12방향) ---
    var posPanel = dlg.add("panel", undefined, "위치 (클릭하면 바로 배치)");
    posPanel.orientation = "column";
    posPanel.alignChildren = "center";
    posPanel.margins = [15, 18, 15, 12];
    posPanel.spacing = 4;

    var BTN_W = 36;
    var BTN_H = 26;
    var SPACING = 4;

    var result = null; // { side, align }

    function makePosButton(parent, label, side, align, tip) {
        var btn = parent.add("button", undefined, label);
        btn.preferredSize = [BTN_W, BTN_H];
        btn.helpTip = tip;
        btn.onClick = function() {
            result = { side: side, align: align };
            dlg.close(1);
        };
        return btn;
    }

    // 윗줄: 위-좌 / 위-중 / 위-우
    var topRow = posPanel.add("group");
    topRow.spacing = SPACING;
    makePosButton(topRow, "좌", "top", "left",   "위쪽에 배치 (왼쪽 끝 맞춤)");
    makePosButton(topRow, "중", "top", "center", "위쪽에 배치 (가로 중앙 맞춤)");
    makePosButton(topRow, "우", "top", "right",  "위쪽에 배치 (오른쪽 끝 맞춤)");

    // 가운뎃줄: 왼쪽(상/중/하) + 기준 개체 표시 + 오른쪽(상/중/하)
    var midRow = posPanel.add("group");
    midRow.orientation = "row";
    midRow.alignChildren = "center";
    midRow.spacing = SPACING;

    var leftCol = midRow.add("group");
    leftCol.orientation = "column";
    leftCol.spacing = SPACING;
    makePosButton(leftCol, "상", "left", "top",    "왼쪽에 배치 (위쪽 끝 맞춤)");
    makePosButton(leftCol, "중", "left", "middle", "왼쪽에 배치 (세로 중앙 맞춤)");
    makePosButton(leftCol, "하", "left", "bottom", "왼쪽에 배치 (아래쪽 끝 맞춤)");

    var centerBox = midRow.add("panel", undefined, "");
    centerBox.preferredSize = [BTN_W * 3 + SPACING * 2, BTN_H * 3 + SPACING * 2];
    centerBox.orientation = "column";
    centerBox.alignChildren = ["center", "center"];
    centerBox.add("statictext", undefined, "기준 개체");

    var rightCol = midRow.add("group");
    rightCol.orientation = "column";
    rightCol.spacing = SPACING;
    makePosButton(rightCol, "상", "right", "top",    "오른쪽에 배치 (위쪽 끝 맞춤)");
    makePosButton(rightCol, "중", "right", "middle", "오른쪽에 배치 (세로 중앙 맞춤)");
    makePosButton(rightCol, "하", "right", "bottom", "오른쪽에 배치 (아래쪽 끝 맞춤)");

    // 아랫줄: 아래-좌 / 아래-중 / 아래-우
    var bottomRow = posPanel.add("group");
    bottomRow.spacing = SPACING;
    makePosButton(bottomRow, "좌", "bottom", "left",   "아래쪽에 배치 (왼쪽 끝 맞춤)");
    makePosButton(bottomRow, "중", "bottom", "center", "아래쪽에 배치 (가로 중앙 맞춤)");
    makePosButton(bottomRow, "우", "bottom", "right",  "아래쪽에 배치 (오른쪽 끝 맞춤)");

    // --- 취소 버튼 ---
    var btnGroup = dlg.add("group");
    btnGroup.alignment = "center";
    btnGroup.add("button", undefined, "취소", { name: "cancel" });

    if (dlg.show() !== 1 || !result) return;

    // -------------------------------------------------------
    // 선택값 확정 및 저장
    // -------------------------------------------------------
    var refMode = refBig.value ? "big" : "small";
    var gapMode = gap0.value ? "0" : (gapHalf.value ? "0.5" : "1.0");
    savePref(refMode, gapMode);

    var gap = parseFloat(gapMode) * MM_TO_PT;

    // -------------------------------------------------------
    // 기준 개체 / 이동 개체 결정
    // -------------------------------------------------------
    var areaA = getArea(sel[0]);
    var areaB = getArea(sel[1]);

    var keyObject, movObject;
    if (refMode === "big") {
        keyObject = (areaA >= areaB) ? sel[0] : sel[1];
    } else {
        keyObject = (areaA <= areaB) ? sel[0] : sel[1];
    }
    movObject = (keyObject === sel[0]) ? sel[1] : sel[0];

    var keyBounds = getRealBounds(keyObject); // [Left, Top, Right, Bottom]
    var movBounds = getRealBounds(movObject);
    var movW = movBounds[2] - movBounds[0];
    var movH = Math.abs(movBounds[1] - movBounds[3]);

    var keyCenterX = (keyBounds[0] + keyBounds[2]) / 2;
    var keyCenterY = (keyBounds[1] + keyBounds[3]) / 2;

    // -------------------------------------------------------
    // 목표 위치 계산 (일러스트레이터 좌표계: 위로 갈수록 Y+)
    // -------------------------------------------------------
    var targetLeft, targetTop;

    if (result.side === "top") {
        targetTop = keyBounds[1] + gap + movH;
        if (result.align === "left")        targetLeft = keyBounds[0];
        else if (result.align === "center") targetLeft = keyCenterX - movW / 2;
        else                                targetLeft = keyBounds[2] - movW;
    } else if (result.side === "bottom") {
        targetTop = keyBounds[3] - gap;
        if (result.align === "left")        targetLeft = keyBounds[0];
        else if (result.align === "center") targetLeft = keyCenterX - movW / 2;
        else                                targetLeft = keyBounds[2] - movW;
    } else if (result.side === "left") {
        targetLeft = keyBounds[0] - gap - movW;
        if (result.align === "top")         targetTop = keyBounds[1];
        else if (result.align === "middle") targetTop = keyCenterY + movH / 2;
        else                                targetTop = keyBounds[3] + movH;
    } else { // right
        targetLeft = keyBounds[2] + gap;
        if (result.align === "top")         targetTop = keyBounds[1];
        else if (result.align === "middle") targetTop = keyCenterY + movH / 2;
        else                                targetTop = keyBounds[3] + movH;
    }

    setPosition(movObject, targetLeft, targetTop);
})();
