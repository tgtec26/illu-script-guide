#target Illustrator

/*
  Image_LockRaster.jsx
  기능: 현재 문서 안의 모든 래스터 이미지를 전용 레이어로 이동한 뒤, 레이어를 30% 불투명도로 잠급니다.
  - 포함된 이미지는 RasterItem으로 처리합니다.
  - 링크된 이미지는 PlacedItem 중 래스터 이미지 확장자만 처리합니다.
  - 잠긴/숨겨진 상위 레이어나 그룹은 잠시 풀고, 작업 후 원래 상태로 되돌립니다.
*/

(function () {
    var RASTER_LAYER_NAME = "래스터 이미지 잠금";
    var RASTER_LAYER_OPACITY = 30;

    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var items = [];
    var movedCount = 0;
    var alreadyInLayerCount = 0;
    var skippedPlacedCount = 0;
    var failedCount = 0;

    collectRasterImages(doc, items);

    if (items.length === 0) {
        alert("이동할 래스터 이미지가 없습니다.");
        return;
    }

    app.executeMenuCommand("deselectall");

    var rasterLayer = getOrCreateRasterLayer(doc);
    prepareRasterLayer(rasterLayer);

    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        if (getItemLayer(item) === rasterLayer) {
            alreadyInLayerCount++;
            continue;
        }

        if (moveImageItemToLayer(item, rasterLayer)) {
            movedCount++;
        } else {
            failedCount++;
        }
    }

    finalizeRasterLayer(rasterLayer);

    alert(
        "래스터 이미지 레이어 이동 및 잠금 완료\n" +
        "새로 이동: " + movedCount + "개\n" +
        "이미 전용 레이어에 있음: " + alreadyInLayerCount + "개\n" +
        "래스터가 아닌 배치 파일 제외: " + skippedPlacedCount + "개\n" +
        "레이어: " + RASTER_LAYER_NAME + "\n" +
        "불투명도: " + RASTER_LAYER_OPACITY + "%\n" +
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

    function getOrCreateRasterLayer(documentRef) {
        try {
            return documentRef.layers.getByName(RASTER_LAYER_NAME);
        } catch (e) {
            var layer = documentRef.layers.add();
            layer.name = RASTER_LAYER_NAME;

            try {
                layer.zOrder(ZOrderMethod.SENDTOBACK);
            } catch (e1) {}

            return layer;
        }
    }

    function prepareRasterLayer(layer) {
        try {
            layer.visible = true;
        } catch (e1) {}

        try {
            layer.locked = false;
        } catch (e2) {}
    }

    function finalizeRasterLayer(layer) {
        try {
            layer.opacity = RASTER_LAYER_OPACITY;
        } catch (e1) {
            applyOpacityToLayerItems(layer);
        }

        try {
            layer.locked = true;
        } catch (e2) {}
    }

    function applyOpacityToLayerItems(layer) {
        for (var i = 0; i < layer.pageItems.length; i++) {
            try {
                layer.pageItems[i].opacity = RASTER_LAYER_OPACITY;
            } catch (e) {}
        }
    }

    function moveImageItemToLayer(item, targetLayer) {
        var states = makeEditableForMove(item);

        try {
            item.move(targetLayer, ElementPlacement.PLACEATEND);
            return getItemLayer(item) === targetLayer;
        } catch (e) {
            return false;
        } finally {
            restoreStates(states.targetDisplayStates);
            restoreStates(states.ancestorStates);
        }
    }

    function makeEditableForMove(item) {
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

    function getItemLayer(item) {
        var current = item;

        while (current && current.typename !== "Document") {
            if (current.typename === "Layer") {
                return current;
            }

            try {
                current = current.parent;
            } catch (e) {
                break;
            }
        }

        try {
            return item.layer;
        } catch (e1) {
            return null;
        }
    }
})();
