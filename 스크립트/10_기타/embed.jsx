#target Illustrator
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}


/**
 * 개선된 이미지 포함 스크립트
 * - 에러 발생 시 해당 이미지를 건너뛰고 계속 진행합니다.
 * - 역순 반복문을 사용하여 무한 루프를 방지합니다.
 * - [수정] 잠긴 레이어나 개체는 자동으로 잠금 해제 후 포함합니다.
 * - [수정] 숨겨진(눈이 꺼진) 항목도 포함하여 처리합니다.
 * - [수정] 포함 후 생기는 불필요한 투명 클리핑 마스크를 해제하고 삭제합니다.
 */

if (app.documents.length > 0) {
    var doc = app.activeDocument;
    var successCount = 0;
    var failCount = 0;
    var embeddedItems = [];

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
            var parent = item.parent;
            var beforeItems = getDirectPageItems(parent);

            item.embed();
            collectNewPageItems(parent, beforeItems, embeddedItems);
            successCount++;
        } catch (e) {
            // 에러가 발생해도 멈추지 않고 카운트만 하고 다음으로 넘어갑니다.
            failCount++;
            // 디버깅을 위해 에러 로그를 남기고 싶다면 아래 주석 해제
            // $.writeln("Error on item " + i + ": " + e.message);
        }
    }

    if (embeddedItems.length > 0) {
        releaseTransparentClipMasks(embeddedItems);
    }

} else {
    alert("먼저 문서를 열어주세요.");
}

function getDirectPageItems(parent) {
    var items = [];
    try {
        for (var i = 0; i < parent.pageItems.length; i++) {
            items.push(parent.pageItems[i]);
        }
    } catch (e) {}
    return items;
}

function collectNewPageItems(parent, beforeItems, result) {
    var afterItems = getDirectPageItems(parent);

    for (var i = 0; i < afterItems.length; i++) {
        if (!containsPageItem(beforeItems, afterItems[i])) {
            result.push(afterItems[i]);
        }
    }
}

function containsPageItem(items, target) {
    for (var i = 0; i < items.length; i++) {
        if (items[i] === target) {
            return true;
        }
    }
    return false;
}

function releaseTransparentClipMasks(items) {
    var groups = [];

    for (var i = 0; i < items.length; i++) {
        collectGroups(items[i], groups);
    }

    for (var j = groups.length - 1; j >= 0; j--) {
        try {
            releaseGroupTransparentClipMask(groups[j]);
        } catch (e) {}
    }
}

function collectGroups(item, groups) {
    if (item.typename !== "GroupItem") {
        return;
    }

    groups.push(item);

    for (var i = 0; i < item.groupItems.length; i++) {
        collectGroups(item.groupItems[i], groups);
    }
}

function releaseGroupTransparentClipMask(group) {
    if (!group.clipped) {
        return;
    }

    unlockItem(group);

    var masks = [];
    for (var i = 0; i < group.pageItems.length; i++) {
        var child = group.pageItems[i];
        if (isTransparentClippingMask(child)) {
            masks.push(child);
        }
    }

    if (masks.length === 0) {
        return;
    }

    for (var j = 0; j < masks.length; j++) {
        clearClippingFlag(masks[j]);
    }
    group.clipped = false;

    for (var k = masks.length - 1; k >= 0; k--) {
        try {
            unlockItem(masks[k]);
            masks[k].remove();
        } catch (e) {}
    }
}

function isTransparentClippingMask(item) {
    if (item.typename === "PathItem") {
        return item.clipping && isTransparentPath(item);
    }

    if (item.typename === "CompoundPathItem") {
        return isClippingCompoundPath(item) && isTransparentCompoundPath(item);
    }

    return false;
}

function isClippingCompoundPath(item) {
    for (var i = 0; i < item.pathItems.length; i++) {
        if (item.pathItems[i].clipping) {
            return true;
        }
    }
    return false;
}

function isTransparentCompoundPath(item) {
    if (item.opacity <= 0) {
        return true;
    }

    for (var i = 0; i < item.pathItems.length; i++) {
        if (!isTransparentPath(item.pathItems[i])) {
            return false;
        }
    }

    return item.pathItems.length > 0;
}

function isTransparentPath(pathItem) {
    return pathItem.opacity <= 0 || (!pathItem.filled && !pathItem.stroked);
}

function clearClippingFlag(item) {
    if (item.typename === "PathItem") {
        item.clipping = false;
        return;
    }

    if (item.typename === "CompoundPathItem") {
        for (var i = 0; i < item.pathItems.length; i++) {
            item.pathItems[i].clipping = false;
        }
    }
}

function unlockItem(item) {
    try {
        if (item.layer && item.layer.locked) {
            item.layer.locked = false;
        }
    } catch (e) {}

    try {
        if (item.locked) {
            item.locked = false;
        }
    } catch (e2) {}
}
