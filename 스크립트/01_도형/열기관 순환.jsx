// 열기관 순환.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 열기관 순환: 기출에 가장 흔한 '압력-부피 그래프의 닫힌 순환(A→B→C→D→A)'을 그린다. 선택 없이 화면 가운데에 만든다.
//   과정은 등압·등적·등온·단열 중에서 고르고, A→B(와 B→C)는 배율로 끝점을 정하며 마지막 두 과정은 교점으로 닫는다.
//   로그 좌표(x=ln V, y=ln P)에서 네 과정이 모두 직선이라 서로 다른 두 종류면 반드시 한 점에서 만난다. 단열 지수는 5/3.
//   그래프는 압력-부피 외에 압력-절대온도, 절대온도-부피로도 그린다(T는 P·V에 비례). 곡선 위 화살표, 점 이름(A, B…),
//   과정 이름(등온 등), 점선 안내선과 눈금 글(P0, 2V0 …)을 넣을 수 있다.
// 선 두께는 순환 곡선 0.8pt, 축 0.4pt, 점선 0.3pt이고 '선 두께' 패널에서 고친다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 변수(P, V, T)는 GSMediItaC1(아래 첨자 포함), GSMediumB1에 없는 기호는 HancomEQN이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_ITALIC_FONT = formFindFont(["GSMediItaC1", "GSMediumB1"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    var ARROW_HEAD_MM = 1.6;   // 화살촉 길이
    var GAMMA = 5 / 3;         // 단열 지수
    var PROCESS_NAMES = ["등압", "등적", "등온", "단열"];
    // 로그 좌표(x=ln V, y=ln P)에서 과정은 직선 a·x + b·y = c. 계수 (a, b): 등압 P=c, 등적 V=c, 등온 PV=c, 단열 PV^γ=c
    var PROCESS_AB = [[0, 1], [1, 0], [1, 1], [GAMMA, 1]];

    runFormHost("열기관 순환", [makeCycleEngine()], "HeatEngineCycle/tab");

    // ==== 열기관 순환 ====
    function makeCycleEngine() {
        return makeFormEngine({
            label: "열기관 순환", name: "HeatEngineCycle", prefKey: "HeatEngineCycle/settings",
            controls: [
                {panel: "그래프"},
                {key: "axes", label: "축", items: ["압력-부피", "압력-절대온도", "절대온도-부피"], value: 0},
                {key: "width", label: "가로 길이", unit: "mm", min: 20, max: 120, step: 1, value: 55},
                {key: "height", label: "세로 길이", unit: "mm", min: 20, max: 120, step: 1, value: 45},
                {panel: "과정"},
                {key: "p1", label: "A→B", items: PROCESS_NAMES, value: 2},
                {key: "r1", label: "A→B 배율", unit: "배", min: 0.2, max: 5, step: 0.05, value: 2},
                {key: "p2", label: "B→C", items: PROCESS_NAMES, value: 3},
                {key: "r2", label: "B→C 배율", unit: "배", min: 0.2, max: 5, step: 0.05, value: 2},
                {key: "p3", label: "C→D", items: PROCESS_NAMES, value: 2},
                {key: "p4", label: "D→A", items: PROCESS_NAMES.concat(["없음(A→B→C→A)"]), value: 3},
                {panel: "글자"},
                {key: "names", label: "점 이름", text: true, value: "A, B, C, D"},
                {key: "showProcess", check: "과정 이름(등온 등)", value: false},
                {key: "showGuides", check: "점선 안내선", value: false},
                {key: "xTicks", label: "가로 눈금 글", text: true, value: ""},
                {key: "yTicks", label: "세로 눈금 글", text: true, value: ""},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            draw: drawCycle
        });
    }

    function splitNames(text) {
        var out = [], token = "";
        for (var i = 0; i <= text.length; i++) {
            var ch = i < text.length ? text.charAt(i) : ",";
            if (ch === ",") { out.push(token); token = ""; } else if (ch !== " ") token += ch;
        }
        return out;
    }

    // 상태 A=(V 1, P 1)에서 시작해 순환의 꼭짓점 [{V, P}]를 돌려준다. 닫히지 않는 조합이면 null.
    // 앞의 (n-2)개 과정은 배율(등적이면 압력, 나머지는 부피)로 끝점을 정하고, 마지막 두 과정의 직선(둘째는 A를 지난다)의 교점이 마지막 꼭짓점이다.
    function solveCycle(o) {
        var types = [o.p1, o.p2, o.p3, o.p4], ratios = [o.r1, o.r2], n = o.p4 === 4 ? 3 : 4, s = [{x: 0, y: 0}], i;
        for (i = 0; i < n - 2; i++) {
            var step = Math.log(ratios[i]), prev = s[i];
            if (types[i] === 1) s.push({x: prev.x, y: prev.y + step});
            else s.push({x: prev.x + step, y: prev.y - PROCESS_AB[types[i]][0] * step});
        }
        var last = s[n - 2], l1 = PROCESS_AB[types[n - 2]], l2 = PROCESS_AB[types[n - 1]];
        var c1 = l1[0] * last.x + l1[1] * last.y, det = l1[0] * l2[1] - l2[0] * l1[1];
        if (Math.abs(det) < 1e-9) return null;
        s.push({x: c1 * l2[1] / det, y: -l2[0] * c1 / det});
        var out = [];
        for (i = 0; i < s.length; i++) out.push({V: Math.exp(s[i].x), P: Math.exp(s[i].y)});
        return out;
    }

    // 상태를 그래프 좌표 [가로, 세로]로: 0 압력-부피(가로 V, 세로 P), 1 압력-절대온도(T=PV), 2 절대온도-부피
    function plotPoint(s, axes) {
        if (axes === 1) return [s.P * s.V, s.P];
        if (axes === 2) return [s.V, s.P * s.V];
        return [s.V, s.P];
    }

    // 한 과정의 곡선 표본(그래프 좌표). 로그 좌표에서 직선이므로 로그 보간. 그래프에서도 직선인 과정은 두 점
    function sampleProcess(a, b, type, axes) {
        var straight = type !== 3 && !(axes === 0 && type === 2), count = straight ? 2 : 40, out = [], k;
        for (k = 0; k < count; k++) {
            var u = k / (count - 1);
            out.push(plotPoint({
                V: Math.exp(Math.log(a.V) + u * (Math.log(b.V) - Math.log(a.V))),
                P: Math.exp(Math.log(a.P) + u * (Math.log(b.P) - Math.log(a.P)))
            }, axes));
        }
        return out;
    }

    // 꺾은선의 길이 가운데 점과 그 방향 {x, y, ux, uy}. 너무 짧으면 null
    function midOnPolyline(pts, minLength) {
        var total = 0, k, d = [];
        for (k = 1; k < pts.length; k++) {
            d.push(Math.sqrt(Math.pow(pts[k][0] - pts[k - 1][0], 2) + Math.pow(pts[k][1] - pts[k - 1][1], 2)));
            total += d[k - 1];
        }
        if (total < minLength) return null;
        var run = 0;
        for (k = 1; k < pts.length; k++) {
            if (run + d[k - 1] >= total / 2) {
                var u = (total / 2 - run) / d[k - 1];
                return {x: pts[k - 1][0] + u * (pts[k][0] - pts[k - 1][0]), y: pts[k - 1][1] + u * (pts[k][1] - pts[k - 1][1]),
                    ux: (pts[k][0] - pts[k - 1][0]) / d[k - 1], uy: (pts[k][1] - pts[k - 1][1]) / d[k - 1]};
            }
            run += d[k - 1];
        }
        return null;
    }

    // 점 (x, y)가 닫힌 꺾은선 poly 안에 있는지 (짝수-홀수 규칙)
    function insidePolygon(x, y, poly) {
        var inside = false;
        for (var a = 0, b = poly.length - 1; a < poly.length; b = a++) {
            if ((poly[a][1] > y) !== (poly[b][1] > y) &&
                x < (poly[b][0] - poly[a][0]) * (y - poly[a][1]) / (poly[b][1] - poly[a][1]) + poly[a][0]) inside = !inside;
        }
        return inside;
    }

    // 값 목록에서 거의 같은 것을 합쳐 작은 순서로
    function distinctSorted(values) {
        var sorted = values.slice().sort(function(p, q) { return p - q; }), out = [];
        for (var i = 0; i < sorted.length; i++) if (out.length === 0 || sorted[i] - out[out.length - 1] > 0.01) out.push(sorted[i]);
        return out;
    }

    // 좌표는 pt(y 위쪽 +). 원점이 그래프 원점, 축은 오른쪽·위쪽. 가장 큰 값이 축 길이의 82%가 되게 늘린다.
    function drawCycle(t, o) {
        var m = t.mm, size = o.font, W = o.width * m, H = o.height * m, i, k;
        var states = solveCycle(o);
        if (states === null) { t.text("닫히지 않는 과정 조합입니다", W / 2, H / 2, size, "center"); return; }
        var n = states.length, types = [o.p1, o.p2, o.p3, o.p4], segs = [], xMax = 0, yMax = 0;
        for (i = 0; i < n; i++) {
            var pts = sampleProcess(states[i], states[(i + 1) % n], types[i], o.axes);
            segs.push(pts);
            for (k = 0; k < pts.length; k++) { xMax = Math.max(xMax, pts[k][0]); yMax = Math.max(yMax, pts[k][1]); }
        }
        var sx = 0.82 * W / xMax, sy = 0.82 * H / yMax;
        function toPt(p) { return [p[0] * sx, p[1] * sy]; }
        // 축과 이름
        t.arrow([0, 0], [W, 0], o.wObj, ARROW_HEAD_MM * m);
        t.arrow([0, 0], [0, H], o.wObj, ARROW_HEAD_MM * m);
        t.text(o.axes === 2 ? "절대 온도" : "압력", 0, H + 1.5 * m + size * 0.7, size, "center");
        t.textAt(o.axes === 1 ? "절대 온도" : "부피", W + 2 * m, -2 * m, size, "right");
        t.textAt("0", -1.5 * m, -2 * m, size, "left");
        // 꼭짓점과 점선·눈금
        var corners = [], xs = [], ys = [];
        for (i = 0; i < n; i++) { corners.push(toPt(plotPoint(states[i], o.axes))); xs.push(corners[i][0]); ys.push(corners[i][1]); }
        var xTicks = distinctSorted(xs), yTicks = distinctSorted(ys), ticks = splitNames(o.xTicks), yLabels = splitNames(o.yTicks);
        var tickFont = {italic: true, sub: true};
        for (k = 0; k < xTicks.length; k++) {
            if (o.showGuides) {
                for (i = 0; i < n; i++) if (Math.abs(corners[i][0] - xTicks[k]) <= 0.01) { t.line([xTicks[k], corners[i][1]], [xTicks[k], 0], o.wRope, [2, 1.5]); break; }
            }
            if (k < ticks.length && ticks[k] !== "") t.textAt(ticks[k], xTicks[k], -1 * m, size, "below", tickFont);
        }
        for (k = 0; k < yTicks.length; k++) {
            if (o.showGuides) {
                for (i = 0; i < n; i++) if (Math.abs(corners[i][1] - yTicks[k]) <= 0.01) { t.line([corners[i][0], yTicks[k]], [0, yTicks[k]], o.wRope, [2, 1.5]); break; }
            }
            if (k < yLabels.length && yLabels[k] !== "") t.textAt(yLabels[k], -1.5 * m, yTicks[k], size, "left", tickFont);
        }
        // 순환 곡선: 이어진 한 개의 닫힌 패스
        var path = [];
        for (i = 0; i < n; i++) for (k = 0; k < segs[i].length - 1; k++) path.push(toPt(segs[i][k]));
        t.path(path, true, null, 100, o.wBody);
        // 곡선 위 화살표(길이 가운데)와 과정 이름
        var cx = 0, cy = 0;   // 안쪽 기준점: 곡선 점들의 평균
        for (k = 0; k < path.length; k++) { cx += path[k][0] / path.length; cy += path[k][1] / path.length; }
        function outward(x, y) {
            var dx = x - cx, dy = y - cy, len = Math.sqrt(dx * dx + dy * dy);
            return len < 0.01 ? [0, 1] : [dx / len, dy / len];
        }
        var head = ARROW_HEAD_MM * m, half = head * 0.35;
        for (i = 0; i < n; i++) {
            var line = [];
            for (k = 0; k < segs[i].length; k++) line.push(toPt(segs[i][k]));
            var mid = midOnPolyline(line, 1.5 * m);
            if (mid === null) continue;
            t.path([[mid.x + mid.ux * head / 2, mid.y + mid.uy * head / 2],
                [mid.x - mid.ux * head / 2 - mid.uy * half, mid.y - mid.uy * head / 2 + mid.ux * half],
                [mid.x - mid.ux * head / 2 + mid.uy * half, mid.y - mid.uy * head / 2 - mid.ux * half]], true, 100, null, 0);
            if (o.showProcess) {
                // 곡선에 수직이고 순환 안쪽을 피하는 쪽
                var nx = -mid.uy, ny = mid.ux;
                if (insidePolygon(mid.x + nx * 2 * m, mid.y + ny * 2 * m, path)) { nx = -nx; ny = -ny; }
                t.text(PROCESS_NAMES[types[i]], mid.x + nx * 4.5 * m, mid.y + ny * 4.5 * m, size, "center");
            }
        }
        // 점 이름: 꼭짓점에서 바깥쪽으로
        var names = splitNames(o.names);
        for (i = 0; i < n && i < names.length; i++) {
            if (names[i] === "") continue;
            var out = outward(corners[i][0], corners[i][1]);
            t.text(names[i], corners[i][0] + out[0] * 3 * m, corners[i][1] + out[1] * 3 * m, size, "center");
        }
    }

    // ==== 창 ====
    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null / setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    // 장면이 하나면 선택 줄 없이 창에 바로 행을 단다. 둘 이상이면 선택 줄(라디오)과 겹쳐 쌓은 페이지로 바꾼다
    function runFormHost(title, engines, tabPrefKey) {
        var win = new Window("dialog", title);
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 4;
        win.margins = 12;

        var radios = [], pages = [];
        var holder = win;
        if (engines.length > 1) {
            var bar = win.add("group");
            bar.alignChildren = ["left", "center"];
            bar.spacing = 12;
            holder = win.add("group");
            holder.orientation = "stack";
            holder.alignChildren = ["fill", "top"];
            for (var r = 0; r < engines.length; r++) radios.push(bar.add("radiobutton", undefined, engines[r].label));
        }
        for (var i = 0; i < engines.length; i++) {
            var page = engines.length > 1 ? holder.add("group") : win;
            if (engines.length > 1) {
                page.orientation = "column";
                page.alignChildren = "fill";
                page.spacing = 4;
            }
            pages.push(page);
            engines[i].error = engines[i].addRows(page);
            if (engines[i].error) {
                if (engines.length === 1) { alert(engines[i].error); return; }
                page.enabled = false;
                radios[i].helpTip = engines[i].error;
            }
        }

        var footer = win.add("group");
        var previewCheck = footer.add("checkbox", undefined, "미리보기");
        previewCheck.value = true;
        var footerSpacer = footer.add("group");
        footerSpacer.alignment = ["fill", "center"];
        // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = footer.add("button", undefined, "확인");
        try { win.defaultElement = null; } catch (defaultError) {}
        var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

        var tabIndex = 0;
        if (engines.length > 1) {
            try {
                var savedTab = parseInt(app.preferences.getStringPreference(tabPrefKey), 10);
                if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
            } catch (tabError) {}
            if (engines[tabIndex].error) {
                for (var j = 0; j < engines.length; j++) if (!engines[j].error) { tabIndex = j; break; }
            }
            if (engines[tabIndex].error) { alert(engines[tabIndex].error); return; }
            radios[tabIndex].value = true;
            for (var q = 0; q < radios.length; q++) radios[q].onClick = radioHandler(q);
        }
        function radioHandler(index) {
            return function() {
                if (index === tabIndex) return;
                if (engines[index].error) {
                    radios[index].value = false;
                    radios[tabIndex].value = true;
                    alert(engines[index].error);
                    return;
                }
                engines[tabIndex].clearPreview();
                pages[tabIndex].visible = false;
                tabIndex = index;
                pages[tabIndex].visible = true;
                engines[tabIndex].setPreview(previewCheck.value);
            };
        }
        previewCheck.onClick = function() { engines[tabIndex].setPreview(previewCheck.value); };
        okButton.onClick = function() {
            if (!engines[tabIndex].commit()) return;
            if (engines.length > 1) {
                try { app.preferences.setStringPreference(tabPrefKey, String(tabIndex)); } catch (saveError) {}
            }
            win.close(1);
        };
        cancelButton.onClick = function() { win.close(0); };

        // 페이지는 겹쳐 쌓여 가장 큰 페이지 크기로 잡힌다. 선택되지 않은 페이지는 창이 뜬 뒤(onShow)에 숨긴다 (미리 layout()을 부르면 줄지 않는다)
        win.onShow = function() {
            if (engines.length > 1) for (var h = 0; h < pages.length; h++) pages[h].visible = h === tabIndex;
            engines[tabIndex].setPreview(previewCheck.value);
        };
        if (typeof bindTabOrder === "function") bindTabOrder(win);
        if (win.show() !== 1) engines[tabIndex].clearPreview();
        else engines[tabIndex].finish();
        try { app.redraw(); } catch (redrawError) {}
    }

    // ==== 폼 탭 공용 부품 ====
    // spec: label(탭 이름), name(그룹 이름), prefKey, controls[], draw(tools, o)
    // 컨트롤: {panel: "제목", fold: true} 새 패널(fold면 기본으로 접힘) / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운 /
    //         {key, label, text: true, value: "글"} 글 입력
    // '선 두께' 패널(wBody 순환 곡선, wObj 축, wRope 점선 안내선)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "순환 곡선", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.8},
            {key: "wObj", label: "축", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {key: "wRope", label: "점선 안내선", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.3},
            {panel: "위치"},
            {key: "offsetX", label: "가로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 0},
            {key: "offsetY", label: "세로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 1}
        ]);
        var o = {};
        var group = null, committed = false, previewOn = true, center = [0, 0], ui = {};

        function addRows(page) {
            try { center = doc.activeView.centerPoint; } catch (viewError) {}
            for (var i = 0; i < controls.length; i++) if (controls[i].key) o[controls[i].key] = controls[i].value;
            loadSettings();
            var panel = page, checkRow = null;
            for (var c = 0; c < controls.length; c++) {
                var ctl = controls[c];
                if (ctl.panel) {
                    if (ctl.fold && typeof makeCollapsiblePanel === "function") {
                        // fold: true면 기본으로 접어 두고 접힌 상태는 다음에도 기억한다 (행이 많은 패널)
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "HeatEngineCycle/" + spec.name + "/" + ctl.panel);
                        panel.alignChildren = ["left", "top"];
                        panel.spacing = 4;
                    } else {
                        panel = page.add("panel", undefined, ctl.panel);
                        panel.alignChildren = ["left", "top"];
                        panel.margins = [12, 16, 12, 10];
                        panel.spacing = 4;
                    }
                    checkRow = null;
                } else if (ctl.check) {
                    if (checkRow === null || checkRow.children.length >= 3) checkRow = panel.add("group");
                    addCheck(checkRow, ctl);
                } else {
                    checkRow = null;
                    if (ctl.items) addChoice(panel, ctl);
                    else if (ctl.text) addText(panel, ctl);
                    else addNumber(panel, ctl);
                }
            }
            api.setPreview = function(on) { previewOn = on; redraw(); };
            api.updatePreview = redraw;
            api.clearPreview = function() { if (!committed) removeGroup(); };
            api.finish = function() {};
            api.commit = function() {
                if (group === null) build();
                if (group === null) return false;
                saveSettings();
                committed = true;
                doc.selection = null;
                group.selected = true;
                return true;
            };
            return null;
        }

        function addNumber(panel, ctl) {
            var decimals = ctl.step < 0.1 ? 2 : (ctl.step < 1 ? 1 : 0);
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + (ctl.unit ? " (" + ctl.unit + "):" : ":")).preferredSize.width = 100;
            var input = row.add("edittext", undefined, formFormat(o[ctl.key], decimals));
            input.characters = 6;
            var bar = row.add("scrollbar", undefined, o[ctl.key], ctl.min, ctl.max);
            bar.stepdelta = ctl.step;
            bar.jumpdelta = ctl.step * 10;
            bar.preferredSize.width = 196;
            var reset = row.add("button", undefined, "R");
            reset.preferredSize.width = 34;
            reset.helpTip = "처음 값으로 되돌리기";
            function apply(value) {
                if (isNaN(value)) value = o[ctl.key];
                value = Math.round(value / ctl.step) * ctl.step;
                value = Math.max(ctl.min, Math.min(ctl.max, Number(value.toFixed(decimals))));
                var delta = value - o[ctl.key];
                o[ctl.key] = value;
                input.text = formFormat(value, decimals);
                try { bar.value = value; } catch (e) {}
                if (delta === 0) return;
                if (ctl.move !== undefined) {
                    if (group !== null) {
                        try { group.translate(ctl.move === 0 ? delta * FORM_MM : 0, ctl.move === 1 ? delta * FORM_MM : 0, true, true, true, true); } catch (e2) {}
                        app.redraw();
                    }
                } else redraw();
            }
            bar.onChanging = function() { apply(bar.value); };
            bar.onChange = function() { apply(bar.value); };
            input.onChange = function() { apply(parseFloat(String(input.text).replace(",", "."))); };
            // 입력창에 처음 값을 친 것과 같은 경로로 되돌린다. 처음 값은 저장값을 덮기 전의 ctl.value
            reset.onClick = function() {
                input.text = formFormat(ctl.value, decimals);
                input.onChange();
            };
        }

        function addChoice(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            // order: 목록에 보이는 순서 → 값 번호 (화살촉 모양은 1 작살형, 2 제비꼬리, 3 삼각형, 4 꺾쇠 순으로 보인다)
            var order = ctl.order || null, shown = [], pos = o[ctl.key], k;
            for (k = 0; k < ctl.items.length; k++) shown.push(order ? ctl.items[order[k]] : ctl.items[k]);
            if (order) for (k = 0; k < order.length; k++) if (order[k] === o[ctl.key]) pos = k;
            var list = row.add("dropdownlist", undefined, shown);
            list.maximumSize.width = 230;
            list.selection = pos;
            ui[ctl.key] = list;
            list.onChange = function() {
                if (list.selection === null) { list.selection = pos; return; }
                pos = list.selection.index;
                o[ctl.key] = order ? order[pos] : pos;
                redraw();
            };
        }

        function addText(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            var input = row.add("edittext", undefined, o[ctl.key]);
            input.characters = 22;
            ui[ctl.key] = input;
            input.onChange = function() {
                o[ctl.key] = String(input.text).replace(/\|/g, "");
                redraw();
            };
        }

        function addCheck(row, ctl) {
            var box = row.add("checkbox", undefined, ctl.check);
            box.value = o[ctl.key];
            box.onClick = function() { o[ctl.key] = box.value; redraw(); };
        }

        function redraw() {
            removeGroup();
            if (previewOn) build();
            app.redraw();
        }

        function build() {
            var layer = doc.activeLayer;
            if (layer.locked || !layer.visible) {
                for (var i = 0; i < doc.layers.length; i++) {
                    if (!doc.layers[i].locked && doc.layers[i].visible) { layer = doc.layers[i]; break; }
                }
            }
            group = layer.groupItems.add();
            group.name = spec.name;
            try {
                var tools = makeFormTools(group, o);
                spec.draw(tools, o);
                var b = group.geometricBounds;
                group.translate(center[0] - (b[0] + b[2]) / 2 + o.offsetX * FORM_MM,
                    center[1] - (b[1] + b[3]) / 2 + o.offsetY * FORM_MM, true, true, true, true);
            } catch (e) {
                removeGroup();
                alert("그리지 못했습니다: " + e);
            }
        }

        function removeGroup() {
            if (group === null) return;
            try { group.remove(); } catch (e) {}
            group = null;
        }

        function saveSettings() {
            var parts = ["v1"];
            for (var i = 0; i < controls.length; i++) {
                var ctl = controls[i];
                if (!ctl.key) continue;
                parts.push(ctl.check ? (o[ctl.key] ? "1" : "0") : String(o[ctl.key]));
            }
            try { app.preferences.setStringPreference(spec.prefKey, parts.join("|")); } catch (e) {}
        }

        // 태그·개수가 맞고 모든 값이 범위 안일 때만 복원한다
        function loadSettings() {
            var raw = "";
            try { raw = app.preferences.getStringPreference(spec.prefKey); } catch (e) { return; }
            if (!raw) return;
            var p = String(raw).split("|");
            var keyed = [];
            for (var i = 0; i < controls.length; i++) if (controls[i].key) keyed.push(controls[i]);
            if (p[0] !== "v1" || p.length !== keyed.length + 1) return;
            var values = [];
            for (var k = 0; k < keyed.length; k++) {
                var ctl = keyed[k], text = p[k + 1];
                if (ctl.check) {
                    if (text !== "0" && text !== "1") return;
                    values.push(text === "1");
                } else if (ctl.text) {
                    if (text.length > 200) return;
                    values.push(text);
                } else {
                    var value = Number(text);
                    if (text === "" || isNaN(value)) return;
                    if (ctl.items ? (value !== Math.floor(value) || value < 0 || value >= ctl.items.length)
                        : (value < ctl.min || value > ctl.max)) return;
                    values.push(value);
                }
            }
            for (var n = 0; n < keyed.length; n++) o[keyed[n].key] = values[n];
        }
        return api;
    }

    // 그리기 도구. 좌표는 pt, 색은 K값(0~100, null이면 없음)
    function makeFormTools(g, o) {
        var t = {mm: FORM_MM, group: g};
        t.path = function(points, closed, fill, stroke, width, dash) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fill, stroke, width);
            if (dash) p.strokeDashes = dash;
            return p;
        };
        t.line = function(a, b, width, dash) { return t.path([a, b], false, null, 100, width, dash); };
        // a → b 화살표: 선은 촉 뿌리까지, 촉은 채운 삼각형
        t.arrow = function(a, b, width, headLength) {
            var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var head = Math.min(headLength, len), ux = dx / len, uy = dy / len;
            var base = [b[0] - ux * head, b[1] - uy * head], half = head * 0.35;
            if (len > head) t.line(a, [base[0] + ux * 0.2, base[1] + uy * 0.2], width);
            t.path([b, [base[0] - uy * half, base[1] + ux * half], [base[0] + uy * half, base[1] - ux * half]], true, 100, null, 0);
        };
        // (x, y)가 글자 가운데(align "left"면 왼쪽 끝, "right"면 오른쪽 끝). opts: italic 변수 글자(이탤릭), sub 글자 뒤 숫자를 아래 첨자로
        t.text = function(text, x, y, size, align, opts) {
            var frame = g.textFrames.add();
            frame.contents = String(text);
            var range = frame.textRange;
            range.characterAttributes.size = size;
            range.characterAttributes.fillColor = formGray(100);
            formFonts(frame, opts);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
            return frame;
        };
        // 글자 윤곽 기준: anchor "below"면 (x, y)가 글자 윤곽의 위 가운데, "right"면 윤곽의 왼쪽 끝 세로 가운데, "left"면 윤곽의 오른쪽 끝 세로 가운데
        t.textAt = function(text, x, y, size, anchor, opts) {
            var frame = t.text(text, x, y, size, "center", opts);
            var ink = formInkBounds(frame), cx = (ink[0] + ink[2]) / 2, cy = (ink[1] + ink[3]) / 2;
            if (anchor === "below") frame.translate(x - cx, y - ink[1]);
            else if (anchor === "left") frame.translate(x - ink[2], y - cy);
            else frame.translate(x - ink[0], y - cy);
            return frame;
        };
        return t;
    }

    function formFormat(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    // 글자 윤곽의 경계: 복사본을 윤곽선으로 바꿔 재고 지운다. 실패하면 글상자 경계를 쓴다
    function formInkBounds(frame) {
        try {
            var copy = frame.duplicate();
            var outlined = copy.createOutline();
            var b = outlined.geometricBounds;
            var out = [b[0], b[1], b[2], b[3]];
            outlined.remove();
            return out;
        } catch (e) {
            var f = frame.geometricBounds;
            return [f[0], f[1], f[2], f[3]];
        }
    }

    function formPaint(p, fill, stroke, width) {
        p.filled = fill !== null && fill !== undefined;
        if (p.filled) p.fillColor = formGray(fill);
        p.stroked = stroke !== null && stroke !== undefined && width > 0;
        if (p.stroked) {
            p.strokeColor = formGray(stroke);
            p.strokeWidth = width;
            p.strokeCap = StrokeCap.BUTTENDCAP;
            p.strokeJoin = StrokeJoin.MITERENDJOIN;
        }
    }

    // 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt), GSMediumB1에 없는 기호(θ)는 HancomEQN — 02_문자/한글·영문 서체 적용.jsx 규칙.
    // opts.italic이면 영문 글자를 변수 서체(GSMediItaC1)로, opts.sub이면 글자 뒤 숫자를 아래 첨자로 쓴다
    function formFonts(frame, opts) {
        var text = frame.contents, range = frame.textRange, italic = opts && opts.italic, sub = opts && opts.sub;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = range.characters[i].characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
                attributes.textFont = FORM_KOR_FONT;
                attributes.baselineShift = 0;
            } else if (code > 126 && "°±·˘".indexOf(text.charAt(i)) < 0) {
                attributes.textFont = FORM_MATH_FONT;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = italic && /[A-Za-z]/.test(text.charAt(i)) ? FORM_ITALIC_FONT : FORM_ENG_FONT;
                attributes.baselineShift = 0.5;
            }
        }
        if (sub) {
            var prevSub = false;
            for (var k = 0; k < text.length; k++) {
                var c = text.charCodeAt(k);
                var isDigit = c >= 48 && c <= 57;
                var after = k > 0 && (/[A-Za-zͰ-Ͽ)]/.test(text.charAt(k - 1)) || prevSub);
                prevSub = isDigit && after;
                if (prevSub) range.characters[k].characterAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
            }
        }
    }

    function formFindFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100) 회색. RGB 문서면 같은 밝기의 회색으로
    function formGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 0; cmyk.yellow = 0; cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value; rgb.green = value; rgb.blue = value;
        return rgb;
    }
})();
