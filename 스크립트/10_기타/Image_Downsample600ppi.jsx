#target Illustrator

(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var targetPpi = 600;
    var tolerance = 0.5;
    var items = [];

    if (doc.selection && doc.selection.length > 0) {
        collectImageItemsFromList(doc.selection, items);
    } else {
        collectImageItems(doc, items);
    }

    if (items.length === 0) {
        alert("처리할 이미지가 없습니다.\n이미지를 선택하거나, 선택을 해제한 상태에서 문서 전체를 대상으로 실행하세요.");
        return;
    }

    var options = new RasterizeOptions();
    options.resolution = targetPpi;
    options.transparency = true;
    options.antiAliasingMethod = AntiAliasingMethod.ARTOPTIMIZED;
    options.padding = 0;
    options.colorModel = RasterizationColorModel.DEFAULTCOLORMODEL;

    var processed = 0;
    var belowOrUnknown = 0;
    var skippedLocked = 0;
    var failed = 0;

    for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i];

        if (isLockedOrHidden(item)) {
            skippedLocked++;
            continue;
        }

        var ppi = estimateEffectivePpi(item);
        if (ppi <= targetPpi + tolerance) {
            belowOrUnknown++;
            continue;
        }

        try {
            var bounds = item.visibleBounds;
            doc.rasterize(item, bounds, options);
            processed++;
        } catch (e) {
            failed++;
        }
    }

    alert(
        "600ppi 초과 이미지 조정 완료\n" +
        "조정: " + processed + "개\n" +
        "600ppi 이하 또는 판별 불가: " + belowOrUnknown + "개\n" +
        "잠금/숨김 건너뜀: " + skippedLocked + "개\n" +
        "실패: " + failed + "개"
    );

    function collectImageItemsFromList(list, result) {
        for (var i = 0; i < list.length; i++) {
            collectImageItem(list[i], result);
        }
    }

    function collectImageItems(container, result) {
        if (!container) {
            return;
        }

        if (container.typename === "Document") {
            for (var i = 0; i < container.layers.length; i++) {
                collectImageItems(container.layers[i], result);
            }
            return;
        }

        if (container.typename === "Layer") {
            for (var j = 0; j < container.layers.length; j++) {
                collectImageItems(container.layers[j], result);
            }
            for (var k = 0; k < container.pageItems.length; k++) {
                collectImageItem(container.pageItems[k], result);
            }
            return;
        }

        collectImageItem(container, result);
    }

    function collectImageItem(item, result) {
        if (!item) {
            return;
        }

        if (item.typename === "RasterItem" || item.typename === "PlacedItem") {
            result.push(item);
            return;
        }

        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                collectImageItem(item.pageItems[i], result);
            }
        }
    }

    function estimateEffectivePpi(item) {
        try {
            if (!item.matrix) {
                return 0;
            }

            var m = item.matrix;
            var scaleX = Math.sqrt((m.mValueA * m.mValueA) + (m.mValueB * m.mValueB));
            var scaleY = Math.sqrt((m.mValueC * m.mValueC) + (m.mValueD * m.mValueD));

            if (scaleX <= 0 || scaleY <= 0) {
                return 0;
            }

            return Math.max(72 / scaleX, 72 / scaleY);
        } catch (e) {
            return 0;
        }
    }

    function isLockedOrHidden(item) {
        try {
            if (item.locked || item.hidden) {
                return true;
            }
        } catch (e) {}

        var parent = item;
        while (parent) {
            try {
                if (parent.typename === "Layer" && (parent.locked || !parent.visible)) {
                    return true;
                }
            } catch (e2) {}

            try {
                parent = parent.parent;
            } catch (e3) {
                break;
            }
        }

        return false;
    }
})();
