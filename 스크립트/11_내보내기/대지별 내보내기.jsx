#target illustrator
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}
// 대화상자 정리 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}

// 고른 대지마다 그 대지에 걸친 개체를 AI 파일과 1200ppi PNG(배경 투명)로 내보낸다.
// 실행하면 대지 목록에서 내보낼 대지를 고른다. 선택한 개체가 걸친 대지(선택이 없으면 현재 대지)가 미리 골라져 있다.
// 원본 문서 폴더에 Ai·png 폴더를 만들고 "<대지 이름>.ai", "<대지 이름>.png"로 저장한다(같은 이름이 있으면 덮어쓴다).
// 대지마다 새 문서를 만들어 그 대지에 걸친 개체만 레이어째 복제한 뒤 AI로 저장하고,
// (원본 개체는 바꾸지 않지만, 복제하려고 임시 레이어를 만들었다 지우므로 원본 문서에 저장 안 됨 표시가 붙는다)
// 같은 문서에서 대지 없이 작업물 경계로 자른 PNG를 내보낸다(대지 밖으로 나간 부분도 잘리지 않는다).
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

    // 일러에 묻는 호출은 느리다. 단계별 걸린 시간을 재어 마지막 알림에 함께 보여 준다
    var times = { scan: 0, newDoc: 0, copy: 0, png: 0, save: 0, close: 0, items: 0 };
    function now() { return new Date().getTime(); }

    // 레이어(하위 레이어 포함)의 보이는 개체와 그 경계를 처음에 한 번만 읽어 둔다. 위에서 아래 순서
    function scanLayer(layer) {
        if (!layer.visible) return null;
        var node = { layer: layer, entries: [], subs: [] };
        var items = layer.pageItems, itemCount = items.length;   // 레이어의 pageItems는 바로 아래 개체만 담는다(하위 레이어 개체는 빠짐)
        var i, item;
        for (i = 0; i < itemCount; i++) {
            item = items[i];
            if (item.hidden) continue;
            node.entries.push({ item: item, bounds: item.visibleBounds });
        }
        var subLayers = layer.layers, subCount = subLayers.length;
        for (i = 0; i < subCount; i++) {
            var sub = scanLayer(subLayers[i]);
            if (sub !== null) node.subs.push(sub);
        }
        return node;
    }

    // 읽어 둔 경계로 대지에 걸친 개체만 고른다(일러에 다시 묻지 않는다)
    function pickNode(scanned, rect) {
        var node = { layer: scanned.layer, items: [], subs: [] };
        var i;
        for (i = 0; i < scanned.entries.length; i++) {
            if (intersects(scanned.entries[i].bounds, rect)) node.items.push(scanned.entries[i]);
        }
        for (i = 0; i < scanned.subs.length; i++) {
            var sub = pickNode(scanned.subs[i], rect);
            if (sub !== null) node.subs.push(sub);
        }
        return node.items.length > 0 || node.subs.length > 0 ? node : null;
    }

    // 새 문서에 원본과 같은 이름의 레이어를 만들고, 개체를 넣을 레이어마다 {target, entries}를 ctx.jobs에 모은다.
    // 잠긴 레이어는 개체를 다 넣은 뒤에 잠근다(먼저 잠그면 개체를 옮길 수 없다)
    function buildTargets(node, layers, ctx) {
        var target = layers.add();   // add는 맨 위에 넣으므로 아래 레이어부터 부른다
        target.name = node.layer.name;
        try { target.color = node.layer.color; } catch (colorError) {}
        for (var i = node.subs.length - 1; i >= 0; i--) buildTargets(node.subs[i], target.layers, ctx);
        if (node.items.length > 0) ctx.jobs.push({ target: target, entries: node.items });
        if (node.layer.locked) ctx.lockLayers.push(target);
    }

    // 활성이 아닌 문서의 개체를 만질 때마다 일러가 시간을 쓴다(개체당 Mac 약 17ms, Windows 약 150ms).
    // 그래서 원본을 앞에 둔 채 원본의 임시 레이어에 개체를 레이어별 그룹으로 복제하고(거의 0ms),
    // 그 묶음을 새 문서로 한 번만 복제한 뒤 임시 레이어를 지운다. 새 문서를 앞에 두고 묶음을 풀어 레이어마다 넣는다
    // (새 문서가 뒤에 있으면 푸는 move가 오류를 낸다). 원본 개체는 그대로지만 원본 문서에 저장 안 됨 표시가 붙는다
    function copyJobs(nd, ctx) {
        var jobs = ctx.jobs, i, k;
        doc.activate();
        var tempLayer = doc.layers.add();
        var copy;
        try {
            tempLayer.name = "대지별 내보내기 임시";
            var bundle = tempLayer.groupItems.add();
            for (i = 0; i < jobs.length; i++) {
                var group = bundle.groupItems.add();   // 맨 위에 들어가므로 묶음 안에서는 거꾸로 쌓인다
                for (k = 0; k < jobs[i].entries.length; k++) jobs[i].entries[k].item.duplicate(group, ElementPlacement.PLACEATEND);
            }
            copy = bundle.duplicate(nd.layers[nd.layers.length - 1], ElementPlacement.PLACEATBEGINNING);
        } finally {
            tempLayer.remove();
            nd.activate();
        }
        for (i = 0; i < jobs.length; i++) {
            var groupCopy = copy.pageItems[jobs.length - 1 - i], entries = jobs[i].entries;
            for (k = entries.length - 1; k >= 0; k--) {   // 아래 개체부터 맨 위로 옮겨 쌓임 순서를 지킨다
                var dup = groupCopy.pageItems[k], wasLocked = dup.locked;
                if (wasLocked) dup.locked = false;
                dup.move(jobs[i].target, ElementPlacement.PLACEATBEGINNING);
                if (wasLocked) dup.locked = true;
                ctx.copies.push({ bounds: entries[k].bounds, dup: dup });
            }
        }
        copy.remove();
    }

    // 다른 문서로 복제한 개체는 모두 같은 거리만큼 밀려 있다. 개체를 하나씩 옮기지 않고 새 대지를 그 거리만큼 옮긴다.
    // 거리는 첫 개체와 마지막 개체로 재고, 둘이 다르거나 대지를 옮기지 못하면 예전처럼 개체를 하나씩 옮긴다
    function placeCopies(nd, rect, ctx) {
        var copies = ctx.copies;
        function shiftOf(copy) {
            var db = copy.dup.visibleBounds;
            return [db[0] - copy.bounds[0], db[1] - copy.bounds[1]];
        }
        var first = shiftOf(copies[0]), last = shiftOf(copies[copies.length - 1]);
        var moved = false;
        if (Math.abs(first[0] - last[0]) < 0.01 && Math.abs(first[1] - last[1]) < 0.01) {
            try {
                nd.artboards[0].artboardRect = [rect[0] + first[0], rect[1] + first[1], rect[2] + first[0], rect[3] + first[1]];
                moved = true;
            } catch (rectError) {}   // 대지가 캔버스 밖으로 나가면 옮길 수 없다
        }
        if (!moved) {
            var dstRect = nd.artboards[0].artboardRect;
            for (var i = 0; i < copies.length; i++) {
                var sb = copies[i].bounds, dup = copies[i].dup, db = dup.visibleBounds;
                var dx = (sb[0] - rect[0]) - (db[0] - dstRect[0]);
                var dy = (sb[1] - rect[1]) - (db[1] - dstRect[1]);
                if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                    var wasLocked = dup.locked;
                    if (wasLocked) dup.locked = false;
                    dup.translate(dx, dy);
                    if (wasLocked) dup.locked = true;
                }
            }
        }
        for (var k = 0; k < ctx.lockLayers.length; k++) ctx.lockLayers[k].locked = true;
    }

    function saveArtboard(ab, rect, nodes, aiFile, pngFile) {
        var t = now(), t2;
        var width = rect[2] - rect[0], height = rect[1] - rect[3];
        var nd = app.documents.add(doc.documentColorSpace, width, height);
        try {
            try { nd.rasterEffectSettings.resolution = doc.rasterEffectSettings.resolution; } catch (effectError) {}
            nd.artboards[0].name = ab.name;
            var blank = nd.layers[0];
            t2 = now(); times.newDoc += t2 - t; t = t2;
            var ctx = { jobs: [], copies: [], lockLayers: [] };
            for (var i = nodes.length - 1; i >= 0; i--) buildTargets(nodes[i], nd.layers, ctx);
            copyJobs(nd, ctx);   // 묶음은 맨 아래 레이어(처음 있던 빈 레이어)에 잠깐 들어갔다 지워진다
            blank.remove();   // 새 문서에 처음 있던 빈 레이어
            placeCopies(nd, rect, ctx);
            times.items += ctx.copies.length;
            t2 = now(); times.copy += t2 - t; t = t2;
            exportPng(nd, pngFile);
            t2 = now(); times.png += t2 - t; t = t2;
            var options = new IllustratorSaveOptions();
            options.pdfCompatible = true;
            nd.saveAs(aiFile, options);
        } finally {
            t2 = now(); times.save += t2 - t; t = t2;
            try { nd.close(SaveOptions.DONOTSAVECHANGES); } catch (closeError) {}
            try { doc.activate(); } catch (activateError) {}
            times.close += now() - t;
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

    function exportPng(source, file) {
        var options = new ExportOptionsPNG24();
        options.antiAliasing = true;
        options.transparency = true;
        options.artBoardClipping = false;   // 대지가 아니라 작업물 경계로 자른다
        options.horizontalScale = TARGET_PPI / 72.0 * 100.0;
        options.verticalScale = TARGET_PPI / 72.0 * 100.0;
        if (tempPng.exists) tempPng.remove();
        source.exportFile(tempPng, ExportType.PNG24, options);
        if (!tempPng.exists) throw new Error("PNG 파일이 만들어지지 않았습니다.");
        setPngPpi(tempPng, TARGET_PPI);
        // png 폴더의 파일을 다른 프로그램(동기화·백신·썸네일·뷰어)이 잠깐 잡고 있으면 지우기·복사가 실패한다.
        // 0.5초씩 기다리며 5번까지 시도하고, 그래도 안 되면 일러가 알려 준 이유를 함께 띄운다
        var copied = false;
        for (var attempt = 0; attempt < 5 && !copied; attempt++) {
            if (attempt > 0) $.sleep(500);
            if (file.exists) file.remove();
            copied = tempPng.copy(file);
        }
        if (!copied) {
            var reason = tempPng.error || file.error;
            throw new Error("png 폴더에 복사하지 못했습니다" + (reason ? " (" + reason + ")" : "") + ".");
        }
        tempPng.remove();
    }

    // 내보낼 대지를 고른다. 대지마다 true/false 배열을 돌려주고, 취소하면 null
    function pickArtboards() {
        var count = doc.artboards.length, i, j, bounds;
        var initial = [], anyPicked = false, sel = [];
        for (i = 0; i < count; i++) initial.push(false);
        try { if (doc.selection && doc.selection.length) sel = doc.selection; } catch (selError) {}
        for (j = 0; j < sel.length; j++) {
            try { bounds = sel[j].visibleBounds; } catch (boundsError) { continue; }   // 글자 편집 중의 선택 등
            for (i = 0; i < count; i++) {
                if (intersects(bounds, doc.artboards[i].artboardRect)) { initial[i] = true; anyPicked = true; }
            }
        }
        if (!anyPicked) initial[doc.artboards.getActiveArtboardIndex()] = true;

        var names = [];
        for (i = 0; i < count; i++) names.push((i + 1) + ". " + doc.artboards[i].name);
        var dlg = new Window("dialog", "대지별 내보내기");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "내보낼 대지 (Shift·" + ($.os.indexOf("Windows") >= 0 ? "Ctrl" : "⌘") + " 클릭으로 여러 개)");
        var list = dlg.add("listbox", undefined, names, { multiselect: true });
        list.preferredSize = [280, Math.min(400, Math.max(120, count * 20 + 8))];
        for (i = 0; i < count; i++) if (initial[i]) list.items[i].selected = true;
        var row = dlg.add("group");
        row.alignment = ["fill", "top"];
        var allBtn = row.add("button", undefined, "모두 선택");
        var gap = row.add("group");
        gap.alignment = ["fill", "center"];
        var okBtn = row.add("button", undefined, "확인", { name: "ok" });
        row.add("button", undefined, "취소", { name: "cancel" });

        var result = null;
        list.onChange = function () { okBtn.enabled = list.selection !== null; };
        allBtn.onClick = function () {
            for (var k = 0; k < list.items.length; k++) list.items[k].selected = true;
            okBtn.enabled = true;
        };
        okBtn.onClick = function () {
            result = [];
            for (var k = 0; k < list.items.length; k++) result.push(list.items[k].selected);
            dlg.close(1);
        };
        if (typeof bindTabOrder === "function") bindTabOrder(dlg);
        if (dlg.show() !== 1) return null;
        return result;
    }

    var picked = pickArtboards();
    if (picked === null) return;
    // 파일 이름은 고른 대지와 상관없이 대지 전체 순서로 정한다(같은 이름의 " (2)"가 실행마다 바뀌지 않게)
    var baseNames = [];
    for (var n = 0; n < doc.artboards.length; n++) baseNames.push(fileBaseName(doc.artboards[n].name, n));

    var oldInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    var done = 0, skipped = [], failed = [];
    try {
        var t0 = now();
        var scanned = [], docLayers = doc.layers, layerCount = docLayers.length;
        for (var l = 0; l < layerCount; l++) {
            var layerScan = scanLayer(docLayers[l]);
            if (layerScan !== null) scanned.push(layerScan);
        }
        times.scan = now() - t0;
        for (var a = 0; a < doc.artboards.length; a++) {
            if (!picked[a]) continue;
            var ab = doc.artboards[a];
            var rect = ab.artboardRect;
            var nodes = [];
            for (var s = 0; s < scanned.length; s++) {
                var node = pickNode(scanned[s], rect);
                if (node !== null) nodes.push(node);
            }
            if (nodes.length === 0) { skipped.push(ab.name); continue; }
            var base = baseNames[a];
            try {
                saveArtboard(ab, rect, nodes, new File(aiFolder.fsName + sep + base + ".ai"), new File(pngFolder.fsName + sep + base + ".png"));
                done++;
            } catch (abError) {
                failed.push(ab.name + ": " + abError.message);
            }
        }
    } finally {
        app.userInteractionLevel = oldInteraction;
        try { doc.activate(); } catch (restoreError) {}
        try { if (tempPng.exists) tempPng.remove(); } catch (removeError) {}
    }

    var message = "대지 " + done + "개를 내보냈습니다.\nAi: " + aiFolder.fsName + "\npng: " + pngFolder.fsName;
    if (skipped.length > 0) message += "\n\n개체가 없어 건너뛴 대지: " + skipped.join(", ");
    if (failed.length > 0) message += "\n\n실패한 대지:\n" + failed.join("\n");
    function sec(ms) { return (ms / 1000).toFixed(1) + "초"; }
    message += "\n\n걸린 시간: 개체 읽기 " + sec(times.scan) + " · 새 문서 " + sec(times.newDoc) + " · 복제 " + sec(times.copy) + "(개체 " + times.items + "개)" +
        "\nPNG " + sec(times.png) + " · 저장 " + sec(times.save) + " · 닫기 " + sec(times.close);
    alert(message);
})();
