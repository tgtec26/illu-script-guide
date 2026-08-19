/* [보이는 영역 정렬 - 7방향 패널]
  1. 선택한 개체 중 기준 개체(큰/작은)를 라디오 버튼으로 선택 (기본: 큰 개체)
  2. 정렬 버튼을 클릭하면 즉시 적용
     - 박스 위: 가로 왼쪽 / 가로 가운데 / 가로 오른쪽
     - 박스 오른쪽: 세로 위 / 세로 가운데 / 세로 아래
     - 박스 안: 가로+세로 가운데
  3. 모든 계산은 '눈에 보이는 영역' 기준 (선 두께/효과 포함)
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

    if (!sel || sel.length < 2) {
        alert("최소 2개 이상의 개체를 선택해주세요.");
        return;
    }

    // -------------------------------------------------------
    // 경계 계산: 눈에 보이는 영역 기준 (선 두께/효과 포함)
    // 텍스트는 원본을 건드리지 않고 임시 복제본만 외곽선화해 실측 후 삭제
    // -------------------------------------------------------
    function isClippingPath(item) {
        if (!item) return false;
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

    function getGroupRealBounds(groupItem) {
        var bounds = null;

        if (groupItem.clipped) {
            bounds = getClippingBounds(groupItem);
            if (bounds) return bounds;
        }

        for (var i = 0; i < groupItem.pageItems.length; i++) {
            var child = groupItem.pageItems[i];
            if (!child || child.hidden || isClippingPath(child)) continue;

            var childBounds = getRealBounds(child);
            bounds = unionBounds(bounds, childBounds);
        }

        return bounds;
    }

    function getRealBounds(obj) {
        if (!obj || obj.hidden) return null;

        var bounds = null;

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

    function centerX(bounds) {
        return (bounds[0] + bounds[2]) / 2;
    }

    function centerY(bounds) {
        return (bounds[1] + bounds[3]) / 2;
    }

    function getArea(bounds) {
        return (bounds[2] - bounds[0]) * Math.abs(bounds[1] - bounds[3]);
    }

    // 다이얼로그 표시 전에 한 번만 실측 (임시 외곽선 생성 비용을 줄인다)
    var items = [];
    for (var i = 0; i < sel.length; i++) {
        var bounds = getRealBounds(sel[i]);
        if (!bounds) continue;
        items.push({ item: sel[i], bounds: bounds });
    }

    if (items.length < 2) {
        alert("정렬할 수 있는 개체를 2개 이상 선택해주세요.");
        return;
    }

    // -------------------------------------------------------
    // 이전 설정 불러오기 (기준 개체)
    // -------------------------------------------------------
    // 임시 폴더 파일은 재부팅 시 지워지므로 Illustrator 환경설정에 저장한다
    var PREF_KEY = "AlignVisibleBounds/settings";
    var pref = { ref: "big" };
    try {
        var raw = app.preferences.getStringPreference(PREF_KEY);
        if (raw) {
            var parts = raw.split("|");
            if (parts[0] === "v1" && parts.length >= 2) {
                if (parts[1] === "big" || parts[1] === "small") pref.ref = parts[1];
            }
        }
    } catch (e) {}

    function savePref(refMode) {
        try {
            app.preferences.setStringPreference(PREF_KEY, ["v1", refMode].join("|"));
        } catch (e) {}
    }

    // -------------------------------------------------------
    // ScriptUI 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "보이는 영역 정렬");
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

    // --- 정렬 버튼 (박스 위 3개 / 오른쪽 3개 / 안쪽 1개) ---
    var alignPanel = dlg.add("panel", undefined, "정렬 (클릭하면 바로 적용)");
    alignPanel.orientation = "column";
    alignPanel.alignChildren = "left";
    alignPanel.margins = [15, 18, 15, 12];
    alignPanel.spacing = 4;

    var BTN_W = 36;
    var BTN_H = 26;
    var SPACING = 4;
    var BOX_W = BTN_W * 3 + SPACING * 2;
    var BOX_H = BTN_H * 3 + SPACING * 2;

    var mode = null;

    function makeAlignButton(parent, label, alignMode, tip) {
        var btn = parent.add("button", undefined, label);
        btn.preferredSize = [BTN_W, BTN_H];
        btn.helpTip = tip;
        btn.onClick = function() {
            mode = alignMode;
            dlg.close(1);
        };
        return btn;
    }

    // 윗줄: 가로 왼쪽 / 가로 가운데 / 가로 오른쪽
    var topRow = alignPanel.add("group");
    topRow.orientation = "row";
    topRow.spacing = SPACING;
    makeAlignButton(topRow, "좌", "hLeft",   "기준 개체의 왼쪽 끝에 맞춤");
    makeAlignButton(topRow, "중", "hCenter", "기준 개체의 가로 중심에 맞춤");
    makeAlignButton(topRow, "우", "hRight",  "기준 개체의 오른쪽 끝에 맞춤");

    // 가운뎃줄: 박스(안쪽 중앙 버튼) + 오른쪽 세로 정렬 3개
    var midRow = alignPanel.add("group");
    midRow.orientation = "row";
    midRow.alignChildren = "center";
    midRow.spacing = SPACING;

    var box = midRow.add("panel", undefined, "");
    box.preferredSize = [BOX_W, BOX_H];
    box.orientation = "column";
    box.alignChildren = ["center", "center"];
    var centerBtn = box.add("button", undefined, "중앙");
    centerBtn.preferredSize = [BTN_W * 2, BTN_H];
    centerBtn.helpTip = "기준 개체의 가로·세로 중심에 모두 맞춤";
    centerBtn.onClick = function() {
        mode = "center";
        dlg.close(1);
    };

    var rightCol = midRow.add("group");
    rightCol.orientation = "column";
    rightCol.spacing = SPACING;
    makeAlignButton(rightCol, "상", "vTop",    "기준 개체의 위쪽 끝에 맞춤");
    makeAlignButton(rightCol, "중", "vCenter", "기준 개체의 세로 중심에 맞춤");
    makeAlignButton(rightCol, "하", "vBottom", "기준 개체의 아래쪽 끝에 맞춤");

    // --- 취소 버튼 ---
    var btnGroup = dlg.add("group");
    btnGroup.alignment = "center";
    btnGroup.add("button", undefined, "취소", { name: "cancel" });

    if (dlg.show() !== 1 || !mode) return;

    // -------------------------------------------------------
    // 선택값 확정 및 저장
    // -------------------------------------------------------
    var refMode = refBig.value ? "big" : "small";
    savePref(refMode);

    // -------------------------------------------------------
    // 기준 개체 결정 (보이는 영역 면적 기준)
    // -------------------------------------------------------
    var keyIndex = 0;
    var keyArea = getArea(items[0].bounds);

    for (var k = 1; k < items.length; k++) {
        var area = getArea(items[k].bounds);
        if (refMode === "big" ? (area > keyArea) : (area < keyArea)) {
            keyArea = area;
            keyIndex = k;
        }
    }

    var keyBounds = items[keyIndex].bounds; // [Left, Top, Right, Bottom]

    // -------------------------------------------------------
    // 기준 개체에 맞춰 나머지 개체 이동
    // -------------------------------------------------------
    for (var j = 0; j < items.length; j++) {
        if (j === keyIndex) continue;

        var obj = items[j].item;
        var b = items[j].bounds;
        var deltaX = 0;
        var deltaY = 0;

        if (mode === "hLeft") {
            deltaX = keyBounds[0] - b[0];
        } else if (mode === "hCenter") {
            deltaX = centerX(keyBounds) - centerX(b);
        } else if (mode === "hRight") {
            deltaX = keyBounds[2] - b[2];
        } else if (mode === "vTop") {
            deltaY = keyBounds[1] - b[1];
        } else if (mode === "vCenter") {
            deltaY = centerY(keyBounds) - centerY(b);
        } else if (mode === "vBottom") {
            deltaY = keyBounds[3] - b[3];
        } else { // center
            deltaX = centerX(keyBounds) - centerX(b);
            deltaY = centerY(keyBounds) - centerY(b);
        }

        obj.translate(deltaX, deltaY);
    }
})();
