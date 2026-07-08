#target Illustrator

/*
  Image_LockRaster.jsx
  기능: 현재 문서 안의 모든 래스터 이미지를 30% 불투명도로 설정한 뒤 잠급니다.
  - 포함된 이미지는 RasterItem으로 처리합니다.
  - 링크된 이미지는 PlacedItem 중 래스터 이미지 확장자만 처리합니다.
  - 잠긴/숨겨진 상위 레이어나 그룹은 잠시 풀고, 작업 후 원래 상태로 되돌립니다.
*/

(function () {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var items = [];
    var lockedCount = 0;
    var alreadyLockedCount = 0;
    var skippedPlacedCount = 0;
    var failedCount = 0;

    collectRasterImages(doc, items);

    if (items.length === 0) {
        alert("잠글 래스터 이미지가 없습니다.");
        return;
    }

    app.executeMenuCommand("deselectall");

    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        if (isItemLocked(item)) {
            alreadyLockedCount++;
            continue;
        }

        if (lockImageItem(item)) {
            lockedCount++;
        } else {
            failedCount++;
        }
    }

    alert(
        "래스터 이미지 잠금 완료\n" +
        "새로 잠금: " + lockedCount + "개\n" +
        "이미 잠김: " + alreadyLockedCount + "개\n" +
        "래스터가 아닌 배치 파일 제외: " + skippedPlacedCount + "개\n" +
        "실패: " + failedCount + "개"
    );

    function collectRasterImages(documentRef, result) {
        for (var i = 0; i < documentRef.pageItems.length; i++) {
            var item = documentRef.pageItems[i];

            if (item.typename === "RasterItem") {
                result.push(item);
                continue;
            }

            if (item.typename === "PlacedItem") {
                if (isRasterPlacedItem(item)) {
                    result.push(item);
                } else {
                    skippedPlacedCount++;
                }
            }
        }
    }

    function isRasterPlacedItem(item) {
        try {
            if (!item.file) {
                return false;
            }

            var name = String(item.file.name).toLowerCase();
            return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|heic|heif)$/i.test(name);
        } catch (e) {
            return false;
        }
    }

    function lockImageItem(item) {
        var states = makeEditableForLock(item);

        try {
            restoreStates(states.targetDisplayStates);
            item.opacity = 30;
            item.locked = true;
            return item.locked === true;
        } catch (e) {
            return false;
        } finally {
            restoreStates(states.ancestorStates);
        }
    }

    function makeEditableForLock(item) {
        var targetDisplayStates = [];
        var ancestorStates = [];
        var current = item;
        var isTarget = true;

        while (current && current.typename !== "Document") {
            if (isTarget) {
                rememberState(targetDisplayStates, current, "hidden");
                rememberState(targetDisplayStates, current, "visible");
            } else {
                rememberState(ancestorStates, current, "locked");
                rememberState(ancestorStates, current, "hidden");
                rememberState(ancestorStates, current, "visible");
            }

            try {
                if (typeof current.locked !== "undefined") {
                    current.locked = false;
                }
            } catch (e1) {}

            try {
                if (typeof current.hidden !== "undefined") {
                    current.hidden = false;
                }
            } catch (e2) {}

            try {
                if (typeof current.visible !== "undefined") {
                    current.visible = true;
                }
            } catch (e3) {}

            isTarget = false;

            try {
                current = current.parent;
            } catch (e4) {
                break;
            }
        }

        return {
            targetDisplayStates: targetDisplayStates,
            ancestorStates: ancestorStates
        };
    }

    function rememberState(states, item, prop) {
        try {
            if (typeof item[prop] === "undefined") {
                return;
            }

            states.push({
                item: item,
                prop: prop,
                value: item[prop]
            });
        } catch (e) {}
    }

    function restoreStates(states) {
        for (var i = states.length - 1; i >= 0; i--) {
            try {
                states[i].item[states[i].prop] = states[i].value;
            } catch (e) {}
        }
    }

    function isItemLocked(item) {
        try {
            return item.locked === true;
        } catch (e) {
            return false;
        }
    }
})();
