/*
  find-replace.jsx
  기능: 선택한 기준 개체와 비슷한 개체를 조건별로 찾아 선택하고,
        찾은 개체들을 교체본 개체로 일괄 교체합니다.
  특징: 비modal 패널(palette)로 떠서 찾기/교체를 반복 실행할 수 있습니다.

  구조 메모:
    palette + #targetengine 의 버튼 핸들러는 영속 엔진에서 실행되는데,
    이 엔진은 문서 DOM과 연결이 끊겨 app.activeDocument 접근이
    "there is no document" 로 실패합니다(Illustrator 동작).
    그래서 실제 찾기/교체 작업(fsRun)은 BridgeTalk로 "illustrator"
    메인 엔진에 보내 실행합니다. 메인 엔진에서는 문서 접근이 정상입니다.
    UI 읽기/설정 파일 입출력은 영속 엔진에서 그대로 동작합니다.
*/

#target illustrator
#targetengine "findsimilar"
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}


(function () {
    // 재실행 시 기존 패널은 닫고 새로 만듭니다(매 실행마다 최신 코드 로드).
    if ($.global.__findSimilarWin) {
        try { $.global.__findSimilarWin.close(); } catch (eClose) {}
        $.global.__findSimilarWin = null;
    }

    var win = buildPalette();
    $.global.__findSimilarWin = win;
    win.show();

    // ===================== UI (영속 엔진) =====================

    function buildPalette() {
        var settings = loadSettings();

        var w = new Window("palette", "find-replace");
        w.orientation = "column";
        w.alignChildren = "fill";
        w.margins = 16;

        var scopePanel = w.add("panel", undefined, "검색 범위");
        scopePanel.orientation = "column";
        scopePanel.alignChildren = "left";
        scopePanel.margins = 12;
        var scopeRow = scopePanel.add("group");
        scopeRow.orientation = "row";
        var rbDoc = scopeRow.add("radiobutton", undefined, "문서 전체");
        var rbSelection = scopeRow.add("radiobutton", undefined, "현재 선택 안");
        rbDoc.value = settings.scope !== "selection";
        rbSelection.value = settings.scope === "selection";
        var chkIncludeClipped = scopePanel.add("checkbox", undefined, "클리핑 마스크 내부 포함");
        chkIncludeClipped.value = settings.includeClipped;

        var conditionPanel = w.add("panel", undefined, "조건");
        conditionPanel.orientation = "column";
        conditionPanel.alignChildren = "left";
        conditionPanel.margins = 12;

        var row1 = conditionPanel.add("group");
        row1.orientation = "row";
        var chkGeometry = row1.add("checkbox", undefined, "Geometry");
        var chkObjectType = row1.add("checkbox", undefined, "Object Type");
        var chkSize = row1.add("checkbox", undefined, "Size");

        var row2 = conditionPanel.add("group");
        row2.orientation = "row";
        var chkFill = row2.add("checkbox", undefined, "Fill");
        var chkStroke = row2.add("checkbox", undefined, "Stroke");
        var chkStrokeWidth = row2.add("checkbox", undefined, "Stroke Width");
        var chkOpacity = row2.add("checkbox", undefined, "Opacity");

        chkGeometry.value = settings.geometry;
        chkObjectType.value = settings.objectType;
        chkFill.value = settings.fill;
        chkStroke.value = settings.stroke;
        chkStrokeWidth.value = settings.strokeWidth;
        chkSize.value = settings.size;
        chkOpacity.value = settings.opacity;

        var geoPanel = w.add("panel", undefined, "Geometry 옵션");
        geoPanel.orientation = "column";
        geoPanel.alignChildren = "left";
        geoPanel.margins = 12;

        var geoRow1 = geoPanel.add("group");
        geoRow1.orientation = "row";
        var chkScaleAllowed = geoRow1.add("checkbox", undefined, "Scale allowed");
        var chkRotationAllowed = geoRow1.add("checkbox", undefined, "Rotation allowed");
        var chkMirrorAllowed = geoRow1.add("checkbox", undefined, "Mirror allowed");

        chkScaleAllowed.value = settings.scaleAllowed;
        chkRotationAllowed.value = settings.rotationAllowed;
        chkMirrorAllowed.value = settings.mirrorAllowed;

        var tolPanel = w.add("panel", undefined, "Tolerance");
        tolPanel.orientation = "column";
        tolPanel.alignChildren = "left";
        tolPanel.margins = 12;

        var posRow = tolPanel.add("group");
        posRow.orientation = "row";
        posRow.add("statictext", undefined, "위치:");
        var inputPosTol = posRow.add("edittext", undefined, String(settings.tolerance));
        inputPosTol.characters = 6;
        posRow.add("statictext", undefined, "pt (size / geometry / stroke width / opacity)");

        var colRow = tolPanel.add("group");
        colRow.orientation = "row";
        colRow.add("statictext", undefined, "색상:");
        var inputColTol = colRow.add("edittext", undefined, String(settings.colorTolerance));
        inputColTol.characters = 6;
        colRow.add("statictext", undefined, "% (fill / stroke)");

        var replacePanel = w.add("panel", undefined, "교체");
        replacePanel.orientation = "row";
        replacePanel.alignChildren = "left";
        replacePanel.margins = 12;
        var chkFit = replacePanel.add("checkbox", undefined, "크기 맞춤(fit)");
        chkFit.value = settings.fit;
        var chkRotateMatch = replacePanel.add("checkbox", undefined, "회전 맞춤");
        chkRotateMatch.value = settings.rotateMatch;

        var statusText = w.add("statictext", undefined, "기준 개체 선택 후 [찾기]를 누르세요.");
        statusText.characters = 42;

        var btns = w.add("group");
        btns.alignment = "center";
        var btnFind = btns.add("button", undefined, "찾기");
        var btnReplace = btns.add("button", undefined, "교체");
        var btnClose = btns.add("button", undefined, "닫기");

        btnFind.onClick = doFind;
        btnReplace.onClick = doReplace;
        btnClose.onClick = function () { w.hide(); };

        w.onClose = function () {
            try { saveSettings(readOptions()); } catch (e) {}
            return true;
        };

        function readOptions() {
            var posTol = parseFloat(inputPosTol.text);
            if (isNaN(posTol) || posTol < 0) posTol = 0.5;
            var colTol = parseFloat(inputColTol.text);
            if (isNaN(colTol) || colTol < 0) colTol = 5;
            return {
                scope: rbSelection.value ? "selection" : "document",
                geometry: chkGeometry.value,
                objectType: chkObjectType.value,
                fill: chkFill.value,
                stroke: chkStroke.value,
                strokeWidth: chkStrokeWidth.value,
                size: chkSize.value,
                opacity: chkOpacity.value,
                scaleAllowed: chkScaleAllowed.value,
                rotationAllowed: chkRotationAllowed.value,
                mirrorAllowed: chkMirrorAllowed.value,
                tolerance: posTol,
                colorTolerance: colTol,
                fit: chkFit.value,
                rotateMatch: chkRotateMatch.value,
                includeClipped: chkIncludeClipped.value
            };
        }

        function doFind() {
            var options = readOptions();
            saveSettings(options);
            statusText.text = "찾는 중...";
            sendOp({ mode: "find", options: options }, onFindResult);
        }

        function doReplace() {
            var options = readOptions();
            saveSettings(options);
            statusText.text = "교체 중...";
            sendOp({ mode: "replace", options: options }, onReplaceResult);
        }

        function onFindResult(body) {
            if (startsWith(body, "FIND:")) {
                var total = parseInt(body.substring(5), 10);
                statusText.text = (total - 1) + "개 찾음(기준 제외). 교체본 선택 후 [교체].";
            } else if (body === "NO_DOC") {
                statusText.text = "기준 개체 선택 후 [찾기]를 누르세요.";
                alert("열린 문서가 없습니다.");
            } else if (body === "NO_REF") {
                statusText.text = "기준 개체 선택 후 [찾기]를 누르세요.";
                alert("기준 개체를 1개 선택한 뒤 [찾기]를 누르세요.");
            } else {
                statusText.text = "오류";
                alert("[찾기 오류] " + body);
            }
        }

        function onReplaceResult(body) {
            if (startsWith(body, "REPLACE:")) {
                var n = parseInt(body.substring(8), 10);
                statusText.text = n + "개 교체됨.";
            } else if (body === "NO_DOC") {
                alert("열린 문서가 없습니다.");
            } else if (body === "NO_FIND") {
                statusText.text = "기준 개체 선택 후 [찾기]를 누르세요.";
                alert("먼저 [찾기]를 실행하세요.");
            } else if (body === "NO_REPL") {
                alert("교체본 개체를 1개 선택한 뒤 [교체]를 누르세요.");
            } else if (body === "REPL_IN_FOUND") {
                alert("교체본이 찾은 개체에 포함됩니다. 교체본은 따로 선택하세요.");
            } else if (body === "NO_TARGET") {
                alert("교체할 대상이 없습니다.");
            } else {
                statusText.text = "오류";
                alert("[교체 오류] " + body);
            }
        }

        return w;
    }

    function startsWith(s, prefix) {
        return String(s).indexOf(prefix) === 0;
    }

    // ===================== BridgeTalk 디스패치 =====================
    // fsRun 함수의 소스를 문자열로 보내 메인 엔진에서 실행합니다.

    function sendOp(args, onDone) {
        try {
            var bt = new BridgeTalk();
            bt.target = "illustrator";
            bt.body = "(" + fsRun.toString() + ")(" + jsonArgs(args) + ");";
            bt.onResult = function (res) { onDone(res.body); };
            bt.onError = function (err) { onDone("ERR(BridgeTalk): " + (err && err.body ? err.body : err)); };
            bt.send();
        } catch (e) {
            onDone("ERR(전송): " + e);
        }
    }

    function jsonArgs(args) {
        var o = args.options;
        return "{" +
            "\"mode\":\"" + args.mode + "\"," +
            "\"options\":{" +
                "\"scope\":\"" + o.scope + "\"," +
                "\"geometry\":" + bool(o.geometry) + "," +
                "\"objectType\":" + bool(o.objectType) + "," +
                "\"fill\":" + bool(o.fill) + "," +
                "\"stroke\":" + bool(o.stroke) + "," +
                "\"strokeWidth\":" + bool(o.strokeWidth) + "," +
                "\"size\":" + bool(o.size) + "," +
                "\"opacity\":" + bool(o.opacity) + "," +
                "\"scaleAllowed\":" + bool(o.scaleAllowed) + "," +
                "\"rotationAllowed\":" + bool(o.rotationAllowed) + "," +
                "\"mirrorAllowed\":" + bool(o.mirrorAllowed) + "," +
                "\"tolerance\":" + num(o.tolerance) + "," +
                "\"colorTolerance\":" + num(o.colorTolerance) + "," +
                "\"fit\":" + bool(o.fit) + "," +
                "\"rotateMatch\":" + bool(o.rotateMatch) + "," +
                "\"includeClipped\":" + bool(o.includeClipped) +
            "}}";
    }

    function bool(v) { return v ? "true" : "false"; }
    function num(v) { var n = parseFloat(v); return isNaN(n) ? "0" : String(n); }

    // ===================== 실제 작업 (메인 엔진에서 실행) =====================
    // 이 함수는 .toString()으로 직렬화되어 BridgeTalk로 메인 엔진에 전달됩니다.
    // 따라서 자기완결형이어야 합니다(바깥 스코프 변수 참조 금지).

    function fsRun(args) {
        try {
            if (app.documents.length === 0) return "NO_DOC";
            var opts = args.options;
            var doc = app.activeDocument;

            if (args.mode === "find") {
                var sel = doc.selection;
                if (!sel || sel.length < 1) return "NO_REF";
                var reference = sel[0];

                var candidates = opts.scope === "selection"
                    ? selectionCandidates(sel, reference)
                    : documentCandidates(doc, reference, opts.includeClipped);

                var refProfile = buildProfile(reference, opts);
                var matches = [reference];
                for (var i = 0; i < candidates.length; i++) {
                    try {
                        if (candidateMatches(refProfile, candidates[i], opts)) matches.push(candidates[i]);
                    } catch (eMatch) {}
                }

                doc.selection = null;
                for (var m = 0; m < matches.length; m++) {
                    try { matches[m].selected = true; } catch (eSel) {}
                }

                // 교체 회전 맞춤용: 각 매치의 기준 대비 회전각(rad)을 함께 저장.
                var refAngle = firstPathAngle(reference);
                var angles = [];
                for (var ai = 0; ai < matches.length; ai++) {
                    try { angles.push(firstPathAngle(matches[ai]) - refAngle); }
                    catch (eA) { angles.push(0); }
                }

                $.global.__fsFound = matches;
                $.global.__fsAngles = angles;
                app.redraw();
                return "FIND:" + matches.length;
            }

            if (args.mode === "replace") {
                var found = $.global.__fsFound;
                if (!found || !found.length) return "NO_FIND";
                var foundAngles = $.global.__fsAngles || [];
                var rsel = doc.selection;
                if (!rsel || rsel.length < 1) return "NO_REPL";
                var replacement = rsel[0];

                var targets = [];
                for (var f = 0; f < found.length; f++) {
                    if (found[f] === replacement) return "REPL_IN_FOUND";
                    if (isAlive(found[f])) targets.push({ item: found[f], angle: foundAngles[f] || 0 });
                }
                if (targets.length === 0) return "NO_TARGET";

                var newItems = [];
                for (var t = 0; t < targets.length; t++) {
                    try {
                        var target = targets[t].item;
                        var dup = replacement.duplicate(target, ElementPlacement.PLACEBEFORE);
                        if (opts.fit) fitToTarget(dup, target);
                        if (opts.rotateMatch && targets[t].angle) {
                            dup.rotate(targets[t].angle * 180 / Math.PI, true, true, true, true, Transformation.CENTER);
                        }
                        centerOn(dup, target);
                        target.remove();
                        newItems.push(dup);
                    } catch (eRep) {}
                }

                $.global.__fsFound = null;
                $.global.__fsAngles = null;
                doc.selection = null;
                for (var n = 0; n < newItems.length; n++) {
                    try { newItems[n].selected = true; } catch (eNs) {}
                }
                app.redraw();
                return "REPLACE:" + newItems.length;
            }

            return "BAD_MODE";
        } catch (e) {
            return "ERR: " + e + " @line " + (e.line ? e.line : "?");
        }

        // ----- 후보 수집 -----

        function selectionCandidates(selectionItems, refItem) {
            var result = [];
            for (var i = 0; i < selectionItems.length; i++) {
                if (selectionItems[i] !== refItem && isUsableItem(selectionItems[i])) {
                    result.push(selectionItems[i]);
                }
            }
            return result;
        }

        function documentCandidates(document, refItem, includeClipped) {
            var result = [];
            var items = document.pageItems;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item === refItem) continue;
                if (item.clipping) continue;                 // 클리핑 마스크 path 자체는 후보에서 제외
                if (!isUsableItem(item)) continue;
                if (!isCandidateContext(item, includeClipped)) continue;
                // includeClipped면 클립 그룹은 통째 대신 내부 오브젝트를 후보로 쓰므로 그룹 자체는 건너뜀
                if (includeClipped && item.typename === "GroupItem" && item.clipped) continue;
                result.push(item);
            }
            return result;
        }

        // 후보 자격: 일반 그룹/컴파운드 안에 있으면 제외(그룹은 통째 매칭).
        // includeClipped면 클리핑 그룹은 투명하게 취급해 내부로 내려간다.
        function isCandidateContext(item, includeClipped) {
            var p = item.parent;
            while (p && p.typename !== "Document") {
                if (p.typename === "GroupItem") {
                    if (includeClipped && p.clipped) { p = p.parent; continue; }
                    return false;
                }
                if (p.typename === "CompoundPathItem") return false;
                p = p.parent; // Layer 등은 위로 통과
            }
            return true;
        }

        function isUsableItem(item) {
            if (!item || item.guides) return false;
            var current = item;
            while (current && current.typename !== "Document") {
                if (current.locked || current.hidden || current.visible === false) return false;
                current = current.parent;
            }
            return true;
        }

        function isAlive(item) {
            try {
                var t = item.typename;
                return !!t;
            } catch (e) {
                return false;
            }
        }

        // ----- 매칭 -----

        function buildProfile(item, o) {
            var paths = collectPathItems(item);
            return {
                typename: item.typename,
                opacity: item.opacity,
                bounds: safeBounds(item),
                fill: o.fill ? getStyleListFrom(paths, "fill") : null,
                stroke: o.stroke ? getStyleListFrom(paths, "stroke") : null,
                strokeWidth: o.strokeWidth ? getStrokeWidthListFrom(paths) : null,
                geometry: o.geometry ? sortedGeometryFrom(paths, o) : null
            };
        }

        function candidateMatches(refProfile, testItem, o) {
            if (o.objectType && refProfile.typename !== testItem.typename) return false;
            if (o.size && !o.scaleAllowed && !sizeMatchesBounds(refProfile.bounds, safeBounds(testItem), o.tolerance)) return false;
            if (o.opacity && Math.abs(refProfile.opacity - testItem.opacity) > o.tolerance) return false;

            if (o.fill || o.stroke || o.strokeWidth || o.geometry) {
                var paths = collectPathItems(testItem);
                if (o.fill && !styleListMatches(refProfile.fill, getStyleListFrom(paths, "fill"), o.colorTolerance)) return false;
                if (o.stroke && !styleListMatches(refProfile.stroke, getStyleListFrom(paths, "stroke"), o.colorTolerance)) return false;
                if (o.strokeWidth && !strokeWidthListMatches(refProfile.strokeWidth, getStrokeWidthListFrom(paths), o.tolerance)) return false;
                if (o.geometry && !geometryMatchesSorted(refProfile.geometry, sortedGeometryFrom(paths, o), o)) return false;
            }
            return true;
        }

        function sizeMatchesBounds(ab, bb, tol) {
            if (!ab || !bb) return false;
            var aw = Math.abs(ab[2] - ab[0]);
            var ah = Math.abs(ab[1] - ab[3]);
            var bw = Math.abs(bb[2] - bb[0]);
            var bh = Math.abs(bb[1] - bb[3]);
            return Math.abs(aw - bw) <= tol && Math.abs(ah - bh) <= tol;
        }

        function safeBounds(item) {
            try {
                return item.geometricBounds;
            } catch (e) {
                try {
                    return item.visibleBounds;
                } catch (e2) {
                    return null;
                }
            }
        }

        // ----- 경로 수집 -----

        function collectPathItems(item) {
            var result = [];
            collectPathItemsInto(item, result);
            return result;
        }

        function collectPathItemsInto(item, result) {
            if (!item) return;
            if (item.typename === "PathItem") {
                if (!item.guides && !item.clipping) result.push(item);
                return;
            }
            if (item.typename === "CompoundPathItem") {
                for (var i = 0; i < item.pathItems.length; i++) {
                    if (!item.pathItems[i].guides && !item.pathItems[i].clipping) result.push(item.pathItems[i]);
                }
                return;
            }
            if (item.typename === "GroupItem") {
                for (var g = 0; g < item.pageItems.length; g++) {
                    collectPathItemsInto(item.pageItems[g], result);
                }
                return;
            }
            if (item.typename === "TextFrame") {
                var temp = null;
                var outline = null;
                try {
                    temp = item.duplicate();
                    outline = temp.createOutline();
                    collectPathItemsInto(outline, result);
                } catch (e) {
                } finally {
                    try {
                        if (outline) outline.remove();
                        if (temp) temp.remove();
                    } catch (removeError) {}
                }
            }
        }

        // ----- Fill / Stroke 색상 -----

        function getStyleListFrom(paths, mode) {
            var result = [];
            for (var i = 0; i < paths.length; i++) {
                if (mode === "fill") {
                    result.push(paths[i].filled ? colorKey(paths[i].fillColor) : "NoFill");
                } else {
                    result.push(paths[i].stroked ? colorKey(paths[i].strokeColor) : "NoStroke");
                }
            }
            return result.sort();
        }

        function colorKey(color) {
            if (!color) return "None";
            try {
                if (color.typename === "RGBColor") {
                    return "RGB:" + roundN(color.red, 2) + "," + roundN(color.green, 2) + "," + roundN(color.blue, 2);
                }
                if (color.typename === "CMYKColor") {
                    return "CMYK:" + roundN(color.cyan, 2) + "," + roundN(color.magenta, 2) + "," + roundN(color.yellow, 2) + "," + roundN(color.black, 2);
                }
                if (color.typename === "GrayColor") {
                    return "Gray:" + roundN(color.gray, 2);
                }
                if (color.typename === "NoColor") {
                    return "NoColor";
                }
                return color.typename;
            } catch (e) {
                return "Unknown";
            }
        }

        function styleListMatches(a, b, colorTol) {
            if (!a || !b || a.length !== b.length) return false;
            for (var i = 0; i < a.length; i++) {
                if (!colorsMatch(a[i], b[i], colorTol)) return false;
            }
            return true;
        }

        function colorsMatch(a, b, colorTol) {
            if (a === b) return true;
            var pa = parseColorKey(a);
            var pb = parseColorKey(b);
            if (!pa || !pb || pa.type !== pb.type || pa.values.length !== pb.values.length) return false;
            var scale = (pa.type === "RGB") ? (100 / 255) : 1; // CMYK / Gray는 이미 0~100
            for (var i = 0; i < pa.values.length; i++) {
                if (Math.abs(pa.values[i] - pb.values[i]) * scale > colorTol) return false;
            }
            return true;
        }

        function parseColorKey(key) {
            var parts = String(key).split(":");
            if (parts.length !== 2) return null;
            var nums = parts[1].split(",");
            var values = [];
            for (var i = 0; i < nums.length; i++) {
                var n = parseFloat(nums[i]);
                if (isNaN(n)) return null;
                values.push(n);
            }
            return { type: parts[0], values: values };
        }

        // ----- Stroke Width -----

        function getStrokeWidthListFrom(paths) {
            var result = [];
            for (var i = 0; i < paths.length; i++) {
                result.push(paths[i].stroked ? paths[i].strokeWidth : 0);
            }
            return result.sort(numericSort);
        }

        function strokeWidthListMatches(a, b, tol) {
            if (!a || !b || a.length !== b.length) return false;
            for (var i = 0; i < a.length; i++) {
                if (Math.abs(a[i] - b[i]) > tol) return false;
            }
            return true;
        }

        // ----- Geometry (베지어 핸들 포함) -----

        function sortedGeometryFrom(paths, o) {
            var result = [];
            for (var i = 0; i < paths.length; i++) {
                result.push(pathSignature(paths[i], o));
            }
            result.sort(signatureSort);
            return result;
        }

        function pathSignature(pathItem, o) {
            var pts = pathItem.pathPoints;
            var raw = [];
            for (var i = 0; i < pts.length; i++) {
                var p = pts[i];
                raw.push({
                    anchor: [p.anchor[0], p.anchor[1]],
                    left: [p.leftDirection[0], p.leftDirection[1]],
                    right: [p.rightDirection[0], p.rightDirection[1]]
                });
            }
            var n = normalizePointSet(raw, o);
            return {
                closed: pathItem.closed,
                count: raw.length,
                points: n.points,
                scale: n.scale
            };
        }

        function normalizePointSet(pts, o) {
            if (!pts.length) return { points: [], scale: 1 };

            var cx = 0, cy = 0;
            for (var i = 0; i < pts.length; i++) {
                cx += pts[i].anchor[0];
                cy += pts[i].anchor[1];
            }
            cx /= pts.length;
            cy /= pts.length;

            var shifted = [];
            for (var j = 0; j < pts.length; j++) {
                shifted.push({
                    anchor: [pts[j].anchor[0] - cx, pts[j].anchor[1] - cy],
                    left: [pts[j].left[0] - cx, pts[j].left[1] - cy],
                    right: [pts[j].right[0] - cx, pts[j].right[1] - cy]
                });
            }

            if (o.rotationAllowed) {
                var first = firstNonZeroAnchor(shifted);
                var angle = Math.atan2(first[1], first[0]);
                rotatePointSet(shifted, -angle);
            }

            // 회전 후 좌표 기준으로 균일(uniform) 스케일 정규화.
            // 가로/세로를 같은 값으로 나눠 종횡비를 보존합니다.
            // (축별로 따로 나누면 직사각형이 정사각형과 같아져 잘못 매치됨)
            var maxX = 0, maxY = 0;
            for (var s = 0; s < shifted.length; s++) {
                if (Math.abs(shifted[s].anchor[0]) > maxX) maxX = Math.abs(shifted[s].anchor[0]);
                if (Math.abs(shifted[s].anchor[1]) > maxY) maxY = Math.abs(shifted[s].anchor[1]);
            }
            var scale = o.scaleAllowed ? (Math.max(maxX, maxY) || 1) : 1;

            var normalized = [];
            for (var k = 0; k < shifted.length; k++) {
                normalized.push({
                    anchor: [shifted[k].anchor[0] / scale, shifted[k].anchor[1] / scale],
                    left: [shifted[k].left[0] / scale, shifted[k].left[1] / scale],
                    right: [shifted[k].right[0] / scale, shifted[k].right[1] / scale]
                });
            }
            return { points: normalized, scale: scale };
        }

        function firstNonZeroAnchor(pts) {
            for (var i = 0; i < pts.length; i++) {
                if (Math.abs(pts[i].anchor[0]) > 0.0001 || Math.abs(pts[i].anchor[1]) > 0.0001) return pts[i].anchor;
            }
            return [1, 0];
        }

        // 첫 path의 (무게중심 기준) 첫 유효 앵커 각도(rad). 회전 맞춤에 사용.
        function firstPathAngle(item) {
            var paths = collectPathItems(item);
            if (!paths.length) return 0;
            var pp = paths[0].pathPoints;
            if (!pp || !pp.length) return 0;
            var cx = 0, cy = 0;
            for (var i = 0; i < pp.length; i++) {
                cx += pp[i].anchor[0];
                cy += pp[i].anchor[1];
            }
            cx /= pp.length;
            cy /= pp.length;
            for (var j = 0; j < pp.length; j++) {
                var x = pp[j].anchor[0] - cx;
                var y = pp[j].anchor[1] - cy;
                if (Math.abs(x) > 0.0001 || Math.abs(y) > 0.0001) return Math.atan2(y, x);
            }
            return 0;
        }

        function rotatePointSet(pts, angle) {
            var cos = Math.cos(angle);
            var sin = Math.sin(angle);
            for (var i = 0; i < pts.length; i++) {
                pts[i].anchor = rotateCoord(pts[i].anchor, cos, sin);
                pts[i].left = rotateCoord(pts[i].left, cos, sin);
                pts[i].right = rotateCoord(pts[i].right, cos, sin);
            }
        }

        function rotateCoord(p, cos, sin) {
            return [p[0] * cos - p[1] * sin, p[0] * sin + p[1] * cos];
        }

        function geometryMatchesSorted(refGeo, testGeo, o) {
            if (!refGeo || !testGeo || refGeo.length !== testGeo.length) return false;
            for (var i = 0; i < refGeo.length; i++) {
                if (!pathSignatureMatches(refGeo[i], testGeo[i], o)) return false;
            }
            return true;
        }

        function pathSignatureMatches(a, b, o) {
            if (a.closed !== b.closed || a.count !== b.count) return false;
            // scaleAllowed면 좌표가 단위(약 -1~1)로 정규화되므로,
            // pt 단위 tolerance를 기준 도형 크기로 나눠 정규화 공간 기준으로 환산합니다.
            var tol = o.scaleAllowed ? (o.tolerance / (a.scale || 1)) : o.tolerance;
            if (pointSetMatches(a.points, b.points, tol, false)) return true;
            if (o.mirrorAllowed && pointSetMatches(a.points, b.points, tol, true)) return true;
            return false;
        }

        function pointSetMatches(a, b, tol, mirror) {
            if (a.length !== b.length) return false;
            for (var i = 0; i < a.length; i++) {
                var ba = mirror ? [-b[i].anchor[0], b[i].anchor[1]] : b[i].anchor;
                var bl = mirror ? [-b[i].left[0], b[i].left[1]] : b[i].left;
                var br = mirror ? [-b[i].right[0], b[i].right[1]] : b[i].right;
                if (!coordClose(a[i].anchor, ba, tol)) return false;
                if (!coordClose(a[i].left, bl, tol)) return false;
                if (!coordClose(a[i].right, br, tol)) return false;
            }
            return true;
        }

        function coordClose(p, q, tol) {
            return Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol;
        }

        // ----- 교체 보조 -----

        function fitToTarget(dup, target) {
            var dw = dup.width;
            var dh = dup.height;
            if (dw <= 0 || dh <= 0) return;
            var ratio = Math.min(target.width / dw, target.height / dh);
            if (!(ratio > 0) || !isFinite(ratio)) return;
            var pct = ratio * 100;
            dup.resize(pct, pct, true, true, true, true, pct, Transformation.CENTER);
        }

        function centerOn(dup, target) {
            dup.left = target.left + (target.width - dup.width) / 2;
            dup.top = target.top - (target.height - dup.height) / 2;
        }

        // ----- 공통 -----

        function roundN(value, digits) {
            var m = Math.pow(10, digits);
            return Math.round(value * m) / m;
        }

        function numericSort(a, b) {
            return a - b;
        }

        function signatureSort(a, b) {
            if (a.count !== b.count) return a.count - b.count;
            if (a.closed !== b.closed) return a.closed ? -1 : 1;
            return 0;
        }
    }

    // ===================== 설정 저장/불러오기 (영속 엔진, File I/O 정상) =====================

    function defaultSettings() {
        return {
            scope: "document",
            geometry: true,
            objectType: true,
            fill: true,
            stroke: true,
            strokeWidth: true,
            size: true,
            opacity: false,
            scaleAllowed: false,
            rotationAllowed: false,
            mirrorAllowed: false,
            tolerance: 0.5,
            colorTolerance: 5,
            fit: false,
            rotateMatch: false,
            includeClipped: true
        };
    }

    function settingsFile() {
        var folder = new Folder(Folder.myDocuments + "/Adobe Scripts");
        if (!folder.exists) folder.create();
        return new File(folder.fsName + "/FindSimilar_settings.json");
    }

    function loadSettings() {
        var defaults = defaultSettings();
        var file = settingsFile();
        if (!file.exists) return defaults;

        try {
            file.open("r");
            var text = file.read();
            file.close();
            var loaded = JSON.parse(text);
            for (var key in defaults) {
                if (defaults.hasOwnProperty(key) && loaded.hasOwnProperty(key)) {
                    defaults[key] = loaded[key];
                }
            }
        } catch (e) {
            try { file.close(); } catch (closeError) {}
        }
        return defaults;
    }

    function saveSettings(options) {
        var file = settingsFile();
        try {
            file.open("w");
            file.write(JSON.stringify({
                scope: options.scope,
                geometry: options.geometry,
                objectType: options.objectType,
                fill: options.fill,
                stroke: options.stroke,
                strokeWidth: options.strokeWidth,
                size: options.size,
                opacity: options.opacity,
                scaleAllowed: options.scaleAllowed,
                rotationAllowed: options.rotationAllowed,
                mirrorAllowed: options.mirrorAllowed,
                tolerance: options.tolerance,
                colorTolerance: options.colorTolerance,
                fit: options.fit,
                rotateMatch: options.rotateMatch,
                includeClipped: options.includeClipped
            }, null, 2));
            file.close();
        } catch (e) {
            try { file.close(); } catch (closeError) {}
        }
    }
})();
