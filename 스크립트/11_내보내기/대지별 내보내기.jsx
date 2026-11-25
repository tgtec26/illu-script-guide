#target illustrator
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 대지마다 그 대지에 걸친 개체를 AI 파일과 1200ppi PNG(배경 투명, 대지 크기)로 내보낸다.
// 원본 문서 폴더에 Ai·png 폴더를 만들고 "<대지 이름>.ai", "<대지 이름>.png"로 저장한다(같은 이름이 있으면 덮어쓴다).
// AI는 대지마다 새 문서를 만들어 그 대지에 걸친 개체만 레이어째 복제해 저장한다(원본 문서는 바꾸지 않는다).
// 숨긴 레이어·개체는 빼고, 개체가 하나도 없는 대지는 건너뛴다.
(function () {
    var TARGET_PPI = 1200;
    if (app.documents.length === 0) { alert("열려있는 문서가 없습니다."); return; }
    var doc = app.activeDocument;
    var docFolder = null;
    try { if (doc.fullName && doc.path.exists) docFolder = doc.path; } catch (pathError) {}   // 저장한 적 없는 문서는 path를 읽을 수 없다
    if (docFolder === null) { alert("문서를 먼저 저장해 주세요. 원본이 있는 폴더에 Ai·png 폴더를 만듭니다."); return; }

    var sep = $.os.indexOf("Windows") >= 0 ? "\\" : "/";
    var aiFolder = new Folder(docFolder.fsName + sep + "Ai");
    var pngFolder = new Folder(docFolder.fsName + sep + "png");
    if (!aiFolder.exists && !aiFolder.create()) { alert("Ai 폴더를 만들지 못했습니다: " + aiFolder.fsName); return; }
    if (!pngFolder.exists && !pngFolder.create()) { alert("png 폴더를 만들지 못했습니다: " + pngFolder.fsName); return; }
    // 일러의 PNG 내보내기는 이름의 공백을 '-'로 바꾼다. 영문 임시 파일로 내보낸 뒤 대지 이름으로 복사한다
    var tempPng = new File(Folder.temp.fsName + sep + "illu_artboard_export.png");

    // 파일 이름에 못 쓰는 글자는 '_'로, 이름이 겹치면 뒤에 " (2)"를 붙인다
    var usedNames = {};
    function fileBaseName(name, index) {
        var base = String(name).replace(/[\\\/:*?"<>|]/g, "_").replace(/^\s+|\s+$/g, "").replace(/\.+$/, "");
        if (base === "") base = "대지 " + (index + 1);
        var candidate = base, n = 2;
        while (usedNames[candidate.toLowerCase()]) candidate = base + " (" + (n++) + ")";
        usedNames[candidate.toLowerCase()] = true;
        return candidate;
    }

    function intersects(b, r) {   // [왼, 위, 오른, 아래], 위가 아래보다 크다
        return b[0] < r[2] && b[2] > r[0] && b[1] > r[3] && b[3] < r[1];
    }

    // 레이어(하위 레이어 포함) 안에서 대지에 걸친 보이는 개체를 고른다. 위에서 아래 순서
    function pickLayer(layer, rect) {
        if (!layer.visible) return null;
        var node = { layer: layer, items: [], subs: [] };
        var i, item;
        for (i = 0; i < layer.pageItems.length; i++) {
            item = layer.pageItems[i];   // 레이어의 pageItems는 바로 아래 개체만 담는다(하위 레이어 개체는 빠짐)
            if (item.hidden) continue;
            if (intersects(item.visibleBounds, rect)) node.items.push(item);
        }
        for (i = 0; i < layer.layers.length; i++) {
            var sub = pickLayer(layer.layers[i], rect);
            if (sub !== null) node.subs.push(sub);
        }
        return node.items.length > 0 || node.subs.length > 0 ? node : null;
    }

    // 고른 개체를 새 문서의 같은 이름 레이어로 복제하고, 원본 대지 기준 위치를 새 대지에 그대로 맞춘다
    function copyNode(node, layers, srcRect, dstRect) {
        var target = layers.add();   // add는 맨 위에 넣으므로 아래 레이어부터 부른다
        target.name = node.layer.name;
        try { target.color = node.layer.color; } catch (colorError) {}
        var i;
        for (i = node.subs.length - 1; i >= 0; i--) copyNode(node.subs[i], target.layers, srcRect, dstRect);
        for (i = node.items.length - 1; i >= 0; i--) {
            var src = node.items[i];
            var dup = src.duplicate(target, ElementPlacement.PLACEATBEGINNING);
            var sb = src.visibleBounds, db = dup.visibleBounds;
            var dx = (sb[0] - srcRect[0]) - (db[0] - dstRect[0]);
            var dy = (sb[1] - srcRect[1]) - (db[1] - dstRect[1]);
            if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                var wasLocked = dup.locked;
                if (wasLocked) dup.locked = false;
                dup.translate(dx, dy);
                if (wasLocked) dup.locked = true;
            }
        }
        if (node.layer.locked) target.locked = true;
    }

    function saveArtboardAi(ab, rect, nodes, file) {
        var width = rect[2] - rect[0], height = rect[1] - rect[3];
        var nd = app.documents.add(doc.documentColorSpace, width, height);
        try {
            try { nd.rasterEffectSettings.resolution = doc.rasterEffectSettings.resolution; } catch (effectError) {}
            nd.artboards[0].name = ab.name;
            var blank = nd.layers[0];
            for (var i = nodes.length - 1; i >= 0; i--) copyNode(nodes[i], nd.layers, rect, nd.artboards[0].artboardRect);
            blank.remove();   // 새 문서에 처음 있던 빈 레이어
            var options = new IllustratorSaveOptions();
            options.pdfCompatible = true;
            nd.saveAs(file, options);
        } finally {
            try { nd.close(SaveOptions.DONOTSAVECHANGES); } catch (closeError) {}
            try { doc.activate(); } catch (activateError) {}
        }
    }

    // PNG의 해상도 정보(pHYs)를 ppi로 적는다. 일러의 스크립트 내보내기는 Windows에서 96ppi로 적고 Mac에서는 적지 않는다
    // (png_clip_helper.jsxinc의 setPngPpi와 같은 내용)
    function setPngPpi(f, ppi) {
        function u32(n) { return String.fromCharCode((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255); }
        function readU32(text, at) { return ((text.charCodeAt(at) << 24) | (text.charCodeAt(at + 1) << 16) | (text.charCodeAt(at + 2) << 8) | text.charCodeAt(at + 3)) >>> 0; }
        function crc32(text) {
            var crc = 0xFFFFFFFF, c, i, k;
            for (i = 0; i < text.length; i++) {
                c = (crc ^ text.charCodeAt(i)) & 255;
                for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                crc = (crc >>> 8) ^ c;
            }
            return (crc ^ 0xFFFFFFFF) >>> 0;
        }
        f.encoding = "BINARY";
        if (!f.open("r")) throw new Error("PNG 파일을 열지 못했습니다.");
        var data = f.read();
        f.close();
        if (data.substring(0, 8) !== "\x89PNG\r\n\x1a\n" || data.substring(12, 16) !== "IHDR") throw new Error("PNG 파일을 읽지 못했습니다.");
        var at = 33, size, type;
        while (at + 8 <= data.length) {
            size = readU32(data, at);
            type = data.substring(at + 4, at + 8);
            if (type === "IDAT") break;
            if (type === "pHYs") data = data.substring(0, at) + data.substring(at + 12 + size);
            else at += 12 + size;
        }
        var perMeter = Math.round(ppi / 0.0254);
        var body = "pHYs" + u32(perMeter) + u32(perMeter) + "\x01";
        data = data.substring(0, 33) + u32(9) + body + u32(crc32(body)) + data.substring(33);
        if (!f.open("w")) throw new Error("PNG 파일에 쓰지 못했습니다.");
        var written = f.write(data);
        f.close();
        if (!written) throw new Error("PNG 파일에 쓰지 못했습니다.");
    }

    function exportArtboardPng(index, file) {
        doc.artboards.setActiveArtboardIndex(index);
        var options = new ExportOptionsPNG24();
        options.antiAliasing = true;
        options.transparency = true;
        options.artBoardClipping = true;   // 활성 대지 크기로 자른다
        options.horizontalScale = TARGET_PPI / 72.0 * 100.0;
        options.verticalScale = TARGET_PPI / 72.0 * 100.0;
        if (tempPng.exists) tempPng.remove();
        doc.exportFile(tempPng, ExportType.PNG24, options);
        if (!tempPng.exists) throw new Error("PNG 파일이 만들어지지 않았습니다.");
        setPngPpi(tempPng, TARGET_PPI);
        if (file.exists) file.remove();
        if (!tempPng.copy(file)) throw new Error("png 폴더에 복사하지 못했습니다.");
        tempPng.remove();
    }

    var oldInteraction = app.userInteractionLevel;
    var oldArtboard = doc.artboards.getActiveArtboardIndex();
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    var done = 0, skipped = [], failed = [];
    try {
        for (var a = 0; a < doc.artboards.length; a++) {
            var ab = doc.artboards[a];
            var rect = ab.artboardRect;
            var nodes = [];
            for (var l = 0; l < doc.layers.length; l++) {
                var node = pickLayer(doc.layers[l], rect);
                if (node !== null) nodes.push(node);
            }
            if (nodes.length === 0) { skipped.push(ab.name); continue; }
            var base = fileBaseName(ab.name, a);
            try {
                exportArtboardPng(a, new File(pngFolder.fsName + sep + base + ".png"));
                saveArtboardAi(ab, rect, nodes, new File(aiFolder.fsName + sep + base + ".ai"));
                done++;
            } catch (abError) {
                failed.push(ab.name + ": " + abError.message);
            }
        }
    } finally {
        app.userInteractionLevel = oldInteraction;
        try { doc.activate(); doc.artboards.setActiveArtboardIndex(oldArtboard); } catch (restoreError) {}
        try { if (tempPng.exists) tempPng.remove(); } catch (removeError) {}
    }

    var message = "대지 " + done + "개를 내보냈습니다.\nAi: " + aiFolder.fsName + "\npng: " + pngFolder.fsName;
    if (skipped.length > 0) message += "\n\n개체가 없어 건너뛴 대지: " + skipped.join(", ");
    if (failed.length > 0) message += "\n\n실패한 대지:\n" + failed.join("\n");
    alert(message);
})();
