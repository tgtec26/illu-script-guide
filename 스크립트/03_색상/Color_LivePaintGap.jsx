#target illustrator
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 열린 패스의 틈을 보이지 않는 선으로 메운 뒤 라이브 페인트로 만든다.
// 라이브 페인트 자체의 틈 허용치(대형)보다 큰 틈도 닫을 수 있다.
// 미리보기: 실제 결과(틈 메우기 + 임의 색)를 그대로 보여 준다. 원본은 숨기고 복제본으로 만든다. 위치는 원본에 붙으므로 옮기기 행은 두지 않는다.
(function () {
    var PREF_KEY = "LivePaintGap/settings";
    var MM = 2.834645669;
    var TOL_MIN = 0.1, TOL_MAX = 30, TOL_STEP = 0.1;
    var TOUCH = 0.05;      // 이 거리 안이면 이미 붙은 것으로 본다 (pt)
    var CURVE_STEPS = 12;  // 곡선 마디를 꺾은선으로 근사하는 조각 수
    var HAIR = 0.01;       // 틈을 잇는 선의 두께 (pt). 확장 뒤 이 두께의 선을 지운다
    var PAD = 20;          // 배경 사각형이 선택 영역보다 더 나가는 거리 (pt)

    if (app.documents.length === 0) { alert("문서를 먼저 열어주세요."); return; }
    var doc = app.activeDocument;
    var picked = [];
    for (var s = 0; s < doc.selection.length; s++) picked.push(doc.selection[s]);
    if (picked.length === 0) { alert("라이브 페인트로 만들 패스를 먼저 선택하세요."); return; }

    // ---- 기하 ----
    function collectPaths(item, out) {
        if (item.typename === "PathItem") out.push(item);
        else if (item.typename === "GroupItem") for (var i = 0; i < item.pageItems.length; i++) collectPaths(item.pageItems[i], out);
        else if (item.typename === "CompoundPathItem") for (var j = 0; j < item.pathItems.length; j++) out.push(item.pathItems[j]);
    }

    function bez(p0, p1, p2, p3, t) {
        var u = 1 - t;
        return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
    }

    // 모든 패스를 짧은 선분으로 쪼개고, 열린 패스의 양 끝점을 모은다
    function buildGeometry(paths) {
        var segs = [], ends = [];
        for (var i = 0; i < paths.length; i++) {
            var pp = paths[i].pathPoints, n = pp.length;
            if (n < 2) continue;
            var last = paths[i].closed ? n : n - 1;
            for (var k = 0; k < last; k++) {
                var a = pp[k], b = pp[(k + 1) % n];
                var prev = a.anchor;
                for (var t = 1; t <= CURVE_STEPS; t++) {
                    var q = bez(a.anchor, a.rightDirection, b.leftDirection, b.anchor, t / CURVE_STEPS);
                    segs.push({ a: prev, b: q, path: i });
                    prev = q;
                }
            }
            if (!paths[i].closed) {
                ends.push({ pt: pp[0].anchor, path: i, other: pp[n - 1].anchor });
                ends.push({ pt: pp[n - 1].anchor, path: i, other: pp[0].anchor });
            }
        }
        return { segs: segs, ends: ends };
    }

    function nearestOnSeg(p, a, b) {
        var dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
        var t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        var q = [a[0] + t * dx, a[1] + t * dy];
        var ex = p[0] - q[0], ey = p[1] - q[1];
        return { q: q, d: Math.sqrt(ex * ex + ey * ey) };
    }

    // 끝점마다 허용치 안의 가장 가까운 점(다른 패스의 선 위, 또는 자기 반대쪽 끝점)으로 잇는 선을 정한다
    function findBridges(geo, tolPt) {
        var bridges = [];
        for (var i = 0; i < geo.ends.length; i++) {
            var e = geo.ends[i], best = null;
            for (var k = 0; k < geo.segs.length; k++) {
                if (geo.segs[k].path === e.path) continue;
                var r = nearestOnSeg(e.pt, geo.segs[k].a, geo.segs[k].b);
                if (best === null || r.d < best.d) best = r;
            }
            var self = nearestOnSeg(e.pt, e.other, e.other);
            if (best === null || self.d < best.d) best = self;
            if (best.d < TOUCH || best.d > tolPt) continue;
            if (!hasBridge(bridges, e.pt, best.q)) bridges.push([e.pt, best.q]);
        }
        return bridges;
    }

    function hasBridge(list, p, q) {
        function near(a, b) { return Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5; }
        for (var i = 0; i < list.length; i++) {
            if ((near(list[i][0], p) && near(list[i][1], q)) || (near(list[i][0], q) && near(list[i][1], p))) return true;
        }
        return false;
    }

    // ---- 그리기 ----
    var sourcePaths = [];
    for (var pi = 0; pi < picked.length; pi++) collectPaths(picked[pi], sourcePaths);
    var geo = buildGeometry(sourcePaths);
    if (geo.ends.length === 0) { alert("선택한 것 중에 열린 패스가 없습니다."); return; }

    var result = [], bridgeCount = 0;

    // ---- 확정 ----
    function randomColor() {
        function r(lo, hi) { return lo + Math.random() * (hi - lo); }
        if (doc.documentColorSpace === DocumentColorSpace.RGB) {
            var c = new RGBColor(); c.red = r(150, 255); c.green = r(150, 255); c.blue = r(150, 255); return c;
        }
        var k = new CMYKColor(); k.cyan = r(0, 45); k.magenta = r(0, 45); k.yellow = r(0, 45); k.black = 0; return k;
    }

    // 확장하면 칠하지 않은 면은 채우기가 없어 색을 줄 수 없다. 그래서 흰 배경 사각형을 함께 라이브 페인트로 만들어
    // 면마다 채우기를 갖게 하고, 확장 뒤 배경 면(사각형 전체 크기)은 지우고 나머지 면에 임의의 색을 준다.
    function selectionBounds() {
        var b = null;
        for (var i = 0; i < sourcePaths.length; i++) {
            var g = sourcePaths[i].geometricBounds; // [left, top, right, bottom]
            if (b === null) b = [g[0], g[1], g[2], g[3]];
            else b = [Math.min(b[0], g[0]), Math.max(b[1], g[1]), Math.max(b[2], g[2]), Math.min(b[3], g[3])];
        }
        return [b[0] - PAD, b[1] + PAD, b[2] + PAD, b[3] - PAD];
    }
    function sameBounds(g, b) {
        for (var i = 0; i < 4; i++) if (Math.abs(g[i] - b[i]) > 1) return false;
        return true;
    }
    function paintFaces(item, bg) {
        if (item.typename === "GroupItem") {
            for (var i = item.pageItems.length - 1; i >= 0; i--) paintFaces(item.pageItems[i], bg);
            return;
        }
        var path = item.typename === "CompoundPathItem" ? item.pathItems[0] : item;
        if (path.stroked && path.strokeWidth < HAIR * 2) { item.remove(); return; }
        if (!path.filled || path.stroked) return;
        if (sameBounds(item.geometricBounds, bg)) item.remove();
        else path.fillColor = randomColor();
    }

    // 미리보기와 확정이 같은 과정을 쓴다: 원본은 숨기고 복제본으로 결과를 만든다.
    // 확인하면 원본을 지우고 결과를 남기고, 취소하거나 미리보기를 끄면 결과를 지우고 원본을 되돌린다.
    function setOriginalsHidden(hidden) {
        for (var i = 0; i < picked.length; i++) { try { picked[i].hidden = hidden; } catch (e) {} }
    }
    function clearResult() {
        for (var i = 0; i < result.length; i++) { try { result[i].remove(); } catch (e) {} }
        result = [];
    }

    function build(tolMm, expandFaces) {
        clearResult();
        setOriginalsHidden(false);
        var bridges = findBridges(geo, tolMm * MM);
        bridgeCount = bridges.length;
        var parts = [];
        for (var i = 0; i < picked.length; i++) parts.push(picked[i].duplicate());
        var grey = new GrayColor(); grey.gray = 50;
        for (var k = 0; k < bridges.length; k++) {
            var bp = doc.activeLayer.pathItems.add();
            bp.setEntirePath(bridges[k]);
            bp.filled = false;
            bp.stroked = true; // 선이 없으면 라이브 페인트가 틈을 닫는 선으로 보지 않는다
            bp.strokeColor = grey;
            bp.strokeWidth = HAIR;
            parts.push(bp);
        }
        var bg = null;
        if (expandFaces) {
            bg = selectionBounds();
            var back = doc.activeLayer.pathItems.rectangle(bg[1], bg[0], bg[2] - bg[0], bg[1] - bg[3]);
            back.stroked = false;
            var white = randomColor();
            if (white.typename === "RGBColor") { white.red = white.green = white.blue = 255; }
            else { white.cyan = white.magenta = white.yellow = white.black = 0; }
            back.fillColor = white;
            back.zOrder(ZOrderMethod.SENDTOBACK);
            parts.push(back);
        }
        setOriginalsHidden(true);
        doc.selection = null;
        for (var j = 0; j < parts.length; j++) parts[j].selected = true;
        app.executeMenuCommand("Make Planet X");
        if (expandFaces) {
            app.executeMenuCommand("Expand Planet X");
            for (var m = doc.selection.length - 1; m >= 0; m--) paintFaces(doc.selection[m], bg);
        }
        for (var n = 0; n < doc.selection.length; n++) result.push(doc.selection[n]);
        app.redraw();
    }

    function discardPreview() {
        clearResult();
        setOriginalsHidden(false);
    }

    function acceptResult() {
        for (var i = 0; i < picked.length; i++) { try { picked[i].remove(); } catch (e) {} }
        doc.selection = null;
        for (var j = 0; j < result.length; j++) result[j].selected = true;
    }

    // ---- 설정 저장 ----
    function loadSettings() {
        try {
            var parts = app.preferences.getStringPreference(PREF_KEY).split("|");
            if (parts.length !== 3 || parts[0] !== "v1") return null;
            var tol = parseFloat(parts[1]);
            if (isNaN(tol) || tol < TOL_MIN || tol > TOL_MAX) return null;
            if (parts[2] !== "0" && parts[2] !== "1") return null;
            return { tol: tol, expand: parts[2] === "1" };
        } catch (e) { return null; }
    }
    function saveSettings(tol, expand) {
        try { app.preferences.setStringPreference(PREF_KEY, ["v1", tol, expand ? 1 : 0].join("|")); } catch (e) {}
    }

    // ---- 다이얼로그 ----
    var saved = loadSettings();
    var win = new Window("dialog", "라이브 페인트 틈 메우기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];

    var row = win.add("group");
    row.alignChildren = ["left", "center"];
    var label = row.add("statictext", undefined, "틈 허용치 (mm):");
    label.preferredSize.width = 110;
    var input = row.add("edittext", undefined, String(saved ? saved.tol : 3));
    input.characters = 6;
    var bar = row.add("scrollbar", undefined, Math.round((saved ? saved.tol : 3) / TOL_STEP), Math.round(TOL_MIN / TOL_STEP), Math.round(TOL_MAX / TOL_STEP));
    bar.preferredSize.width = 196;
    bar.stepdelta = 1;
    bar.jumpdelta = 10;

    var expandCheck = win.add("checkbox", undefined, "면을 임의 색으로 채우기 (라이브 페인트 확장)");
    expandCheck.value = saved ? saved.expand : true;
    expandCheck.helpTip = "끄면 틈만 메운 라이브 페인트 개체로 남아 페인트 통으로 직접 칠할 수 있다.";

    var previewRow = win.add("group");
    previewRow.alignChildren = ["left", "center"];
    var previewCheck = previewRow.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var info = previewRow.add("statictext", undefined, "메울 틈: 0개");
    info.characters = 14;

    var buttons = win.add("group");
    buttons.alignment = "right";
    var cancelBtn = buttons.add("button", undefined, "취소", { name: "cancel" });
    var okBtn = buttons.add("button", undefined, "확인", { name: "ok" });

    function currentTol() {
        var v = parseFloat(input.text);
        if (isNaN(v)) return null;
        return Math.max(TOL_MIN, Math.min(TOL_MAX, v));
    }
    function refresh() {
        var tol = currentTol();
        if (tol === null) return;
        if (previewCheck.value) {
            try { build(tol, expandCheck.value); }
            catch (e) { discardPreview(); previewCheck.value = false; alert("라이브 페인트로 만들지 못했습니다.\n" + e); }
        } else {
            discardPreview();
            bridgeCount = findBridges(geo, tol * MM).length;
        }
        info.text = "메울 틈: " + bridgeCount + "개";
    }
    var syncing = false;
    input.onChanging = function () { refresh(); };
    input.onChange = function () {
        var tol = currentTol();
        if (tol === null) return;
        input.text = String(tol);
        syncing = true; bar.value = Math.round(tol / TOL_STEP); syncing = false;
        refresh();
    };
    bar.onChanging = function () {
        if (syncing) return;
        input.text = (Math.round(bar.value) * TOL_STEP).toFixed(1);
        refresh();
    };
    bar.onChange = bar.onChanging;
    previewCheck.onClick = refresh;
    expandCheck.onClick = refresh;
    okBtn.onClick = function () { win.close(1); };
    cancelBtn.onClick = function () { win.close(0); };

    try { win.defaultElement = null; } catch (e) {}
    win.layout.layout(true);
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    refresh();
    var ok = win.show() === 1;
    var tolMm = currentTol();
    if (!ok || tolMm === null) { discardPreview(); return; }
    saveSettings(tolMm, expandCheck.value);
    try {
        if (!previewCheck.value || result.length === 0) build(tolMm, expandCheck.value);
        acceptResult();
    } catch (e) { discardPreview(); alert("라이브 페인트로 만들지 못했습니다.\n" + e); }
})();
