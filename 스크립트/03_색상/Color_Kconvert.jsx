// CMYK 변환 및 K값 정규화 스크립트
if (app.documents.length > 0) {
    var doc = app.activeDocument;
    
    if (doc.documentColorSpace == DocumentColorSpace.RGB) {
        var response = confirm(
            "현재 문서가 RGB 모드입니다.\n\n" +
            "스크립트는 색상을 K값으로 변환하지만,\n" +
            "문서 모드는 수동으로 변경해야 합니다.\n\n" +
            "[확인] = 색상만 변환 진행\n" +
            "[취소] = 중단 (먼저 CMYK로 변경하세요)"
        );
        
        if (!response) {
            alert("스크립트를 취소했습니다.\n\n" +
                  "파일 → 문서 색상 모드 → CMYK 색상으로\n" +
                  "변경한 후 다시 실행해주세요.");
        } else {
            alert("참고: RGB 모드에서 실행됩니다.\n\n" +
                  "완료 후 수동으로\n" +
                  "파일 → 문서 색상 모드 → CMYK 색상\n" +
                  "으로 변경해주세요.");
            
            processAllLayers(doc.layers);
            
            alert("변환 완료!\n" +
                  "- 모든 색상: K값으로 변환 (5% 단위)\n" +
                  "- 잠긴/숨겨진 개체 포함\n" +
                  "- 그라데이션/패턴 제외\n\n" +
                  "⚠️ 문서 모드를 CMYK로 수동 변경 필요!");
        }
    } else {
        processAllLayers(doc.layers);
        
        alert("변환 완료!\n" +
              "- 모든 색상: K값으로 변환 (5% 단위)\n" +
              "- 잠긴/숨겨진 개체 포함\n" +
              "- 그라데이션/패턴 제외");
    }
}

function processAllLayers(layers) {
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        
        var wasLocked = layer.locked;
        var wasHidden = !layer.visible;
        
        layer.locked = false;
        layer.visible = true;
        
        processAllItems(layer.pageItems);
        
        if (layer.layers.length > 0) {
            processAllLayers(layer.layers);
        }
        
        layer.locked = wasLocked;
        layer.visible = !wasHidden;
    }
}

function processAllItems(items) {
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        
        var wasLocked = item.locked;
        var wasHidden = item.hidden;
        
        item.locked = false;
        item.hidden = false;
        
        try {
            if (item.stroked && item.strokeColor) {
                var converted = convertToGray(item.strokeColor);
                if (converted !== null) item.strokeColor = converted;
            }
            
            if (item.filled && item.fillColor) {
                var converted = convertToGray(item.fillColor);
                if (converted !== null) item.fillColor = converted;
            }
            
            if (item.typename == "CompoundPathItem" && item.pathItems) {
                for (var j = 0; j < item.pathItems.length; j++) {
                    var subPath = item.pathItems[j];
                    if (subPath.stroked && subPath.strokeColor) {
                        var converted = convertToGray(subPath.strokeColor);
                        if (converted !== null) subPath.strokeColor = converted;
                    }
                    if (subPath.filled && subPath.fillColor) {
                        var converted = convertToGray(subPath.fillColor);
                        if (converted !== null) subPath.fillColor = converted;
                    }
                }
            }
            
            if (item.typename == "GroupItem" && item.clipped) {
                processAllItems(item.pageItems);
            }
            else if (item.pageItems && item.pageItems.length > 0) {
                processAllItems(item.pageItems);
            }
            
            if (item.typename == "TextFrame") {
                processTextFrame(item);
            }
            
        } catch (e) {
        }
        
        item.locked = wasLocked;
        item.hidden = wasHidden;
    }
}

function processTextFrame(textFrame) {
    if (textFrame.textRange && textFrame.textRange.characterAttributes) {
        var charAttr = textFrame.textRange.characterAttributes;
        
        if (charAttr.fillColor) {
            var converted = convertToGray(charAttr.fillColor);
            if (converted !== null) charAttr.fillColor = converted;
        }
        
        try {
            if (textFrame.stroked && charAttr.strokeColor) {
                var converted = convertToGray(charAttr.strokeColor);
                if (converted !== null) charAttr.strokeColor = converted;
            }
        } catch (e) {
        }
    }
}

function convertToGray(color) {
    // 그라데이션/패턴은 변환하지 않고 null 반환
    if (color.typename == "GradientColor" || color.typename == "PatternColor") {
        return null;
    }
    
    var grayColor = new GrayColor();
    var kValue = 0;
    
    if (color.typename == "RGBColor") {
        var brightness = (color.red * 0.299 + color.green * 0.587 + color.blue * 0.114) / 255;
        kValue = 100 - (brightness * 100);
    }
    else if (color.typename == "CMYKColor") {
        if (color.cyan > 0 || color.magenta > 0 || color.yellow > 0) {
            var brightness = 100 - Math.max(color.cyan, color.magenta, color.yellow);
            kValue = 100 - brightness;
        } else {
            kValue = color.black;
        }
    }
    else if (color.typename == "GrayColor") {
        kValue = color.gray;
    }
    else {
        kValue = 0;
    }
    
    kValue = Math.round(kValue / 5) * 5;
    kValue = Math.max(0, Math.min(100, kValue));
    
    grayColor.gray = kValue;
    return grayColor;
}