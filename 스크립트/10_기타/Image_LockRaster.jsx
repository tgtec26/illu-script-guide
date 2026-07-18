#target Illustrator

/*
  Image_LockRaster.jsx
  기능: PDF 트레이싱 준비를 한 번에 처리합니다.
  1단계: 문서 전체 그룹 해제 + 클리핑 마스크 해제 + 마스크 도형 삭제 (ExtUngroup 로직)
  2단계: 면/선이 없고 투명한 유령 개체 삭제 (emptydel 로직)
  3단계: 래스터 이미지를 전용 레이어로 이동 후 30% 불투명도로 잠금
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

    // ---------- 1단계: 그룹/클리핑 마스크 해제 ----------
    var maskArr = []; // 해제 과정에서 나온 빈 마스크 도형

    for (var l = 0; l < doc.layers.length; l++) {
        var docLayer = doc.layers[l];
        if (!docLayer.locked && docLayer.visible && docLayer.groupItems.length > 0) {
            ungroup(docLayer);
        }
    }

    var removedMaskCount = maskArr.length;
    for (var m = 0; m < maskArr.length; m++) {
        try {
            maskArr[m].remove();
        } catch (e) {
            removedMaskCount--;
        }
    }

    // ---------- 2단계: 투명 유령 개체 삭제 ----------
    var ghostCount = 0;

    for (var g = 0; g < doc.layers.length; g++) {
        var ghostLayer = doc.layers[g];
        if (!ghostLayer.locked && ghostLayer.visible) {
            checkAndDeleteTransparent(ghostLayer.pageItems);
        }
    }

    // ---------- 3단계: 래스터 이미지 잠금 ----------
    var items = [];
    var movedCount = 0;
    var alreadyInLayerCount = 0;
    var skippedPlacedCount = 0;
    var failedCount = 0;

    collectRasterImages(doc, items);

    app.executeMenuCommand("deselectall");

    if (items.length > 0) {
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
    }

    alert(
        "트레이싱 준비 완료\n" +
        "-- 1단계: 그룹/마스크 해제 --\n" +
        "삭제한 마스크 도형: " + removedMaskCount + "개\n" +
        "-- 2단계: 유령 개체 삭제 --\n" +
        "삭제한 투명 개체: " + ghostCount + "개\n" +
        "-- 3단계: 래스터 잠금 --\n" +
        "새로 이동: " + movedCount + "개\n" +
        "이미 전용 레이어에 있음: " + alreadyInLayerCount + "개\n" +
        "래스터가 아닌 배치 파일 제외: " + skippedPlacedCount + "개\n" +
        "실패: " + failedCount + "개" +
        (items.length > 0 ? "\n레이어: " + RASTER_LAYER_NAME + " (" + RASTER_LAYER_OPACITY + "%)" : "\n이동할 래스터 이미지 없음")
    );

    // ===== 1단계 함수 (ExtUngroup.jsx 기반) =====

    function getChildAll(obj) {
        var childsArr = [];
        for (var i = 0; i < obj.pageItems.length; i++) {
            childsArr.push(obj.pageItems[i]);
        }
        if (obj.layers) {
            for (var j = 0; j < obj.layers.length; j++) {
                childsArr.push(obj.layers[j]);
            }
        }
        return childsArr;
    }

    function ungroup(obj) {
        var childArr = getChildAll(obj);

        if (childArr.length < 1) {
            obj.remove();
            return;
        }

        for (var i = 0; i < childArr.length; i++) {
            var element = childArr[i];
            try {
                if (element.parent.typename !== 'Layer') {
                    element.move(obj, ElementPlacement.PLACEBEFORE);
                    // 해제 후 남는 빈 마스크 도형 수집
                    if ((element.typename === 'PathItem' && !element.filled && !element.stroked) ||
                        (element.typename === 'CompoundPathItem' && element.pathItems.length > 0 && !element.pathItems[0].filled && !element.pathItems[0].stroked) ||
                        (element.typename === 'TextFrame' && element.textRange.fillColor == '[NoColor]' && element.textRange.strokeColor == '[NoColor]'))
                        maskArr.push(element);
                }
                if (element.typename === 'GroupItem' || element.typename === 'Layer') {
                    ungroup(element);
                }
            } catch (e) { }
        }
    }

    // ===== 2단계 함수 (emptydel.jsx 기반) =====

    function isCompletelyTransparent(item) {
        if (isClippingItem(item)) {
            return false;
        }

        if (item.typename === "CompoundPathItem") {
            return isTransparentCompoundPath(item);
        }

        if (item.typename !== "PathItem") {
            return false;
        }

        return isTransparentPath(item);
    }

    function isTransparentCompoundPath(item) {
        if (item.opacity === 0) {
            return true;
        }

        if (item.pathItems.length === 0) {
            return true;
        }

        for (var i = 0; i < item.pathItems.length; i++) {
            if (!isTransparentPath(item.pathItems[i])) {
                return false;
            }
        }

        return true;
    }

    function isTransparentPath(pathItem) {
        if (isClippingItem(pathItem)) {
            return false;
        }

        if (pathItem.opacity === 0) {
            return true;
        }

        return !hasVisibleFill(pathItem) && !hasVisibleStroke(pathItem);
    }

    function hasVisibleFill(pathItem) {
        if (!pathItem.filled) {
            return false;
        }

        try {
            return pathItem.fillColor.typename !== "NoColor";
        } catch (e) {
            return false;
        }
    }

    function hasVisibleStroke(pathItem) {
        if (!pathItem.stroked) {
            return false;
        }

        try {
            return pathItem.strokeColor.typename !== "NoColor" && pathItem.strokeWidth > 0;
        } catch (e) {
            return false;
        }
    }

    function isClippingItem(item) {
        try {
            if (item.hasOwnProperty("clipping") && item.clipping === true) {
                return true;
            }
        } catch (e) {}

        if (item.typename === "CompoundPathItem") {
            try {
                for (var i = 0; i < item.pathItems.length; i++) {
                    if (isClippingItem(item.pathItems[i])) {
                        return true;
                    }
                }
            } catch (e) {}
        }

        return false;
    }

    function checkAndDeleteTransparent(pageItems) {
        for (var i = pageItems.length - 1; i >= 0; i--) {
            var item = pageItems[i];

            if (item.typename === "GroupItem") {
                checkAndDeleteTransparent(item.pageItems);
                continue;
            }

            if (isCompletelyTransparent(item)) {
                item.remove();
                ghostCount++;
            }
        }
    }

    // ===== 3단계 함수 (기존 Image_LockRaster 로직) =====

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
