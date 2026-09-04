#target Illustrator

// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Image_LockAllRaster.jsx
  기능: 문서 전체의 포함된 래스터 이미지와 링크된 래스터 이미지를 잠급니다.
  PDF, AI, EPS 등 벡터 형식으로 배치된 항목은 제외합니다.
*/

(function () {
    if (app.documents.length === 0) {
        alert("열린 문서가 없습니다. 문서를 열고 다시 시도하세요.");
        return;
    }

    var doc = app.activeDocument;
    var lockedCount = 0;
    var alreadyLockedCount = 0;
    var failedCount = 0;
    var items = [];
    var itemsToLock = [];
    var ancestors = [];
    var ancestorStates = [];

    appendRasterItems(doc.rasterItems, items, false);
    appendRasterItems(doc.placedItems, items, true);

    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        if (isItemLocked(item)) {
            alreadyLockedCount++;
            continue;
        }

        itemsToLock.push(item);
        collectUniqueAncestors(item, ancestors);
    }

    for (var a = 0; a < ancestors.length; a++) {
        rememberAndMakeEditable(ancestorStates, ancestors[a]);
    }

    try {
        for (var j = 0; j < itemsToLock.length; j++) {
            try {
                itemsToLock[j].locked = true;

                if (itemsToLock[j].locked === true) {
                    lockedCount++;
                } else {
                    failedCount++;
                }
            } catch (e1) {
                failedCount++;
            }
        }
    } finally {
        restoreStates(ancestorStates);
    }

    alert(
        "래스터 이미지 잠금 완료\n" +
        "새로 잠금: " + lockedCount + "개\n" +
        "이미 잠김: " + alreadyLockedCount + "개\n" +
        "실패: " + failedCount + "개"
    );

    function appendRasterItems(collection, result, checkFileExtension) {
        var length = collection.length;

        for (var i = 0; i < length; i++) {
            var item = collection[i];

            if (!checkFileExtension || hasRasterFileExtension(item)) {
                result.push(item);
            }
        }
    }

    function hasRasterFileExtension(item) {
        try {
            var fileName = String(item.file.name).toLowerCase();
            return /\.(bmp|dib|rle|gif|jpe?g|png|psd|pdd|tif?f|tga|vda|icb|vst|pcx|pct|pict|pic|pix|raw|sct|dcm|dicom|webp|heic|heif)$/i.test(fileName);
        } catch (e) {
            return false;
        }
    }

    function isItemLocked(item) {
        try {
            return item.locked === true;
        } catch (e) {
            return false;
        }
    }

    function collectUniqueAncestors(item, result) {
        var chain = [];
        var current = item.parent;

        while (current && current.typename !== "Document") {
            chain.push(current);

            try {
                current = current.parent;
            } catch (e) {
                current = null;
            }
        }

        for (var i = chain.length - 1; i >= 0; i--) {
            if (!containsItem(result, chain[i])) {
                result.push(chain[i]);
            }
        }
    }

    function containsItem(items, target) {
        for (var i = 0; i < items.length; i++) {
            if (items[i] === target) {
                return true;
            }
        }

        return false;
    }

    function rememberAndMakeEditable(states, item) {
        rememberAndSet(states, item, "locked", false);
        rememberAndSet(states, item, "hidden", false);
        rememberAndSet(states, item, "visible", true);
    }

    function rememberAndSet(states, item, propertyName, editableValue) {
        try {
            if (typeof item[propertyName] === "undefined" || item[propertyName] === editableValue) {
                return;
            }

            var originalValue = item[propertyName];
            item[propertyName] = editableValue;
            states.push({
                item: item,
                propertyName: propertyName,
                value: originalValue
            });
        } catch (e) {}
    }

    function restoreStates(states) {
        for (var i = states.length - 1; i >= 0; i--) {
            try {
                states[i].item[states[i].propertyName] = states[i].value;
            } catch (e) {}
        }
    }
})();
