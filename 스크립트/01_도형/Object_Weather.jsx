// Object_Weather.jsx
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

// 날씨: 기권(높이에 따른 기온)·기압과 바람(고기압·저기압)·해륙풍과 계절풍을 한 창의 탭으로 묶었다.
// 세 탭 모두 선택 없이 화면 가운데에 그린다. 탭마다 옵션을 따로 저장한다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);

    runFormHost("날씨", [makeAtmosphereEngine(), makePressureEngine(), makeBreezeEngine()], "Weather/tab");

    // ==== 기권 ====
    // 높이에 따른 기온 그래프와 네 층. 경계는 교과서 값(11·50·80km), 기온 축은 −100~20°C.
    function makeAtmosphereEngine() {
        return makeFormEngine({
            label: "기권", name: "Atmosphere", prefKey: "ObjectAtmosphere/settings",
            controls: [
                {panel: "그래프"},
                {key: "width", label: "너비", unit: "mm", min: 30, max: 150, step: 1, value: 60},
                {key: "height", label: "높이", unit: "mm", min: 40, max: 200, step: 1, value: 80},
                {key: "top", label: "최고 높이", unit: "km", min: 100, max: 150, step: 10, value: 120},
                {panel: "표시"},
                {key: "names", check: "층 이름", value: true},
                {key: "bounds", check: "계면 이름", value: false},
                {key: "ozone", check: "오존층", value: true},
                {key: "shade", check: "층 음영", value: true},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8}
            ],
            draw: drawAtmosphere
        });
    }

    // [기온 °C, 높이 km] 꺾은선. 최고 높이에서 자르고, 기온 축 오른쪽 끝(20°C)에 닿으면 끝낸다
    function atmosphereProfile(top) {
        var base = [[15, 0], [-56, 11], [-56, 20], [-2, 50], [-90, 80], [-88, 90], [-60, 100], [-20, 110], [20, 120]];
        var list = [base[0]];
        for (var i = 1; i < base.length; i++) {
            var a = base[i - 1], b = base[i];
            if (b[1] >= top) {
                var r = (top - a[1]) / (b[1] - a[1]);
                list.push([a[0] + (b[0] - a[0]) * r, top]);
                return list;
            }
            list.push(b);
        }
        return list;
    }

    function drawAtmosphere(t, o) {
        var mm = t.mm;
        var W = o.width * mm, H = o.height * mm, F = o.font;
        function X(temp) { return (temp + 100) / 120 * W; }
        function Y(km) { return km / o.top * H; }
        var ATMOSPHERE_LAYERS = [
            {name: "대류권", bound: "대류권 계면", top: 11},
            {name: "성층권", bound: "성층권 계면", top: 50},
            {name: "중간권", bound: "중간권 계면", top: 80},
            {name: "열권", bound: "", top: 1000}
        ];

        var bottom = 0;
        for (var i = 0; i < ATMOSPHERE_LAYERS.length; i++) {
            var layer = ATMOSPHERE_LAYERS[i], top = Math.min(layer.top, o.top);
            if (o.shade) t.rect(0, Y(top), W, Y(bottom), i % 2 === 0 ? 15 : 5, null, 0);
            // 오존층과 겹치면 오존층 위쪽 가운데에 쓴다
            var mid = (o.ozone && bottom < 30 && top > 20) ? (30 + top) / 2 : (bottom + top) / 2;
            if (o.names) t.text(layer.name, W - 1.5 * mm, Y(mid), F, "right");
            bottom = top;
        }
        if (o.ozone) {
            t.rect(0, Y(30), W, Y(20), 35, null, 0);
            t.text("오존층", 1.5 * mm, Y(25), F, "left");
        }
        for (var j = 0; j < 3; j++) {
            var y = Y(ATMOSPHERE_LAYERS[j].top);
            t.line([0, y], [W, y], 0.3, 100, [2, 1.5]);
            if (o.bounds) t.text(ATMOSPHERE_LAYERS[j].bound, 1.5 * mm, y + F * 0.65, F, "left");
        }

        // 축과 눈금
        t.line([0, 0], [0, H + 3 * mm], 0.5);
        t.line([0, 0], [W + 3 * mm, 0], 0.5);
        for (var km = 0; km <= o.top; km += 10) {
            t.line([0, Y(km)], [-1.2 * mm, Y(km)], 0.3);
            t.text(String(km), -2 * mm, Y(km), F, "right");
        }
        for (var temp = -100; temp <= 20; temp += 20) {
            t.line([X(temp), 0], [X(temp), -1.2 * mm], 0.3);
            if ((temp + 100) % 40 === 0) t.text(String(temp), X(temp), -1.5 * mm - F * 0.5, F);
        }
        t.text("높이(km)", 0, H + 3 * mm + F * 0.7, F);
        t.text("기온(°C)", W + 3 * mm, -1.5 * mm - F * 0.5, F, "left");

        var points = atmosphereProfile(o.top);
        var line = [];
        for (var p = 0; p < points.length; p++) line.push([X(points[p][0]), Y(points[p][1])]);
        t.path(line, false, null, 100, 0.75);
    }

    // ==== 기압과 바람 ====
    // 북반구 고기압(시계 방향으로 불어 나감)·저기압(시계 반대 방향으로 불어 듦). 위에서 본 등압선 또는 옆에서 본 기류.
    function makePressureEngine() {
        return makeFormEngine({
            label: "기압과 바람", name: "PressureSystem", prefKey: "ObjectPressureSystem/settings",
            controls: [
                {panel: "기압"},
                {key: "kind", label: "종류", items: ["고기압", "저기압"], value: 0},
                {key: "view", label: "모습", items: ["위에서 본 모습", "옆에서 본 모습"], value: 0},
                {key: "rings", label: "등압선 수", unit: "개", min: 2, max: 6, step: 1, value: 4},
                {key: "gap", label: "등압선 간격", unit: "mm", min: 2, max: 20, step: 0.5, value: 6},
                {key: "bend", label: "찌그러짐", unit: "%", min: 0, max: 30, step: 1, value: 12},
                {key: "seed", label: "모양 번호", unit: "", min: 1, max: 99, step: 1, value: 1},
                {key: "winds", label: "바람 화살표", unit: "개", min: 0, max: 12, step: 1, value: 6},
                {panel: "표시"},
                {key: "center", check: "중심 글자", value: true},
                {key: "values", check: "기압 값", value: false},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8}
            ],
            draw: drawPressure
        });
    }

    // 등압선 반지름. 모든 등압선이 같은 모양을 크기만 달리 쓰므로 서로 만나지 않는다
    function isobarRadius(theta, base, bend, seed) {
        return base * (1 + bend / 100 * (0.6 * Math.sin(2 * theta + seed * 1.7) + 0.4 * Math.sin(3 * theta + seed * 2.9)));
    }

    // 바람 방향(단위 벡터). 등압선에 30° 비스듬히: 고기압은 시계 방향+바깥, 저기압은 반시계+안쪽
    function windDirection(theta, high) {
        var a = 30 * Math.PI / 180;
        var tx = high ? Math.sin(theta) : -Math.sin(theta), ty = high ? -Math.cos(theta) : Math.cos(theta);
        var rx = high ? Math.cos(theta) : -Math.cos(theta), ry = high ? Math.sin(theta) : -Math.sin(theta);
        return [Math.cos(a) * tx + Math.sin(a) * rx, Math.cos(a) * ty + Math.sin(a) * ry];
    }

    function drawPressure(t, o) {
        var mm = t.mm, F = o.font, high = (o.kind === 0);
        var gap = o.gap * mm;
        if (o.view === 1) {
            drawPressureSide(t, o, high);
            return;
        }
        var STEPS = 24;
        for (var k = 1; k <= o.rings; k++) {
            var points = [];
            for (var s = 0; s < STEPS; s++) {
                var th = s / STEPS * 2 * Math.PI;
                var r = isobarRadius(th, k * gap, o.bend, o.seed);
                points.push([r * Math.cos(th), r * Math.sin(th)]);
            }
            t.smooth(points, true, null, 100, 0.5);
        }
        if (o.values) {
            for (var v = 1; v <= o.rings; v++) {
                var top = isobarRadius(Math.PI / 2, v * gap, o.bend, o.seed);
                var frame = t.text(String(high ? 1024 - 4 * v : 996 + 4 * v), 0, top, F * 0.85);
                var b = frame.geometricBounds;
                t.rect(b[0] - 0.5, b[1] + 0.5, b[2] + 0.5, b[3] - 0.5, 0, null, 0);
                frame.zOrder(ZOrderMethod.BRINGTOFRONT);
            }
        }
        if (o.center) t.text(high ? "고" : "저", 0, 0, F * 1.5);
        var ring = (Math.max(1, Math.floor(o.rings / 2)) + 0.5) * gap;
        var length = Math.min(gap * 1.4, 12 * mm);
        for (var w = 0; w < o.winds; w++) {
            var theta = (w + 0.5) / o.winds * 2 * Math.PI;
            var rr = isobarRadius(theta, ring, o.bend, o.seed);
            var c = [rr * Math.cos(theta), rr * Math.sin(theta)];
            var d = windDirection(theta, high);
            t.arrow([c[0] - d[0] * length / 2, c[1] - d[1] * length / 2], [c[0] + d[0] * length / 2, c[1] + d[1] * length / 2], 0.75);
        }
    }

    // 옆 모습: 가운데 하강(고기압)·상승(저기압) 기류, 지면에서 불어 나가거나 들어오는 바람, 위에서 반대로
    function drawPressureSide(t, o, high) {
        var mm = t.mm, F = o.font;
        var half = o.gap * o.rings * mm, H = half * 1.2, g = 2.5 * mm, low = 1.8 * mm;
        t.line([-half, 0], [half, 0], 0.5);
        if (high) t.arrow([0, H], [0, low + g], 0.75); else t.arrow([0, low + g], [0, H], 0.75);
        for (var side = -1; side <= 1; side += 2) {
            var near = side * g, far = side * half * 0.85;
            if (high) {
                t.arrow([near, low], [far, low], 0.75);
                t.arrow([far, H], [near, H], 0.75);
            } else {
                t.arrow([far, low], [near, low], 0.75);
                t.arrow([near, H], [far, H], 0.75);
            }
        }
        t.text(high ? "하강 기류" : "상승 기류", 1.5 * mm, H / 2, F, "left");
        if (o.center) t.text(high ? "고기압" : "저기압", 0, -F * 0.8, F);
    }

    // ==== 해륙풍·계절풍 ====
    // 육지(대륙)는 왼쪽, 바다(해양)는 오른쪽. 해풍·여름 계절풍은 바다 → 육지, 육풍·겨울 계절풍은 육지 → 바다.
    function makeBreezeEngine() {
        return makeFormEngine({
            label: "해륙풍·계절풍", name: "SeaLandBreeze", prefKey: "ObjectSeaLandBreeze/settings",
            controls: [
                {panel: "바람"},
                {key: "kind", label: "바람", items: ["해풍 (낮)", "육풍 (밤)", "남동 계절풍 (여름)", "북서 계절풍 (겨울)"], value: 0},
                {key: "width", label: "너비", unit: "mm", min: 40, max: 200, step: 1, value: 90},
                {key: "height", label: "높이", unit: "mm", min: 20, max: 120, step: 1, value: 45},
                {panel: "표시"},
                {key: "names", check: "육지·바다 이름", value: true},
                {key: "pressure", check: "기압", value: true},
                {key: "when", check: "때", value: false},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8}
            ],
            draw: drawBreeze
        });
    }

    // 순환 고리의 네 화살표 [시작, 끝]. 바다 → 육지면 지면에서 왼쪽으로 불고 육지 위에서 올라간다
    function breezeArrows(W, H, landHeight, seaToLand) {
        var L = W * 0.2, R = W * 0.8, B = landHeight + H * 0.1, T = H * 0.92, g = Math.min(W, H) * 0.08;
        var list = [
            [[R - g, B], [L + g, B]],
            [[L, B + g], [L, T - g]],
            [[L + g, T], [R - g, T]],
            [[R, T - g], [R, B + g]]
        ];
        if (!seaToLand) for (var i = 0; i < list.length; i++) list[i] = [list[i][1], list[i][0]];
        return list;
    }

    function drawBreeze(t, o) {
        var mm = t.mm, F = o.font;
        var W = o.width * mm, H = o.height * mm;
        var land = H * 0.18, sea = H * 0.1;
        var seaToLand = (o.kind === 0 || o.kind === 2);
        var monsoon = (o.kind >= 2);
        t.rect(0, land, W / 2, 0, 35, 100, 0.3);
        t.rect(W / 2, sea, W, 0, 12, 100, 0.3);
        var arrows = breezeArrows(W, H, land, seaToLand);
        for (var i = 0; i < arrows.length; i++) t.arrow(arrows[i][0], arrows[i][1], 1, 100, 2.2 * mm);
        if (o.pressure) {
            t.text(seaToLand ? "저기압" : "고기압", W / 4, land / 2, F);
            t.text(seaToLand ? "고기압" : "저기압", W * 3 / 4, sea / 2, F);
        }
        if (o.names) {
            t.text(monsoon ? "대륙" : "육지", W / 4, -F * 0.8, F);
            t.text(monsoon ? "해양" : "바다", W * 3 / 4, -F * 0.8, F);
        }
        if (o.when) t.text(["낮", "밤", "여름", "겨울"][o.kind], 0, H, F, "left");
    }

    // ==== 창 ====
    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null / setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    // 엔진이 하나면 탭 없이 창에 바로 행을 단다
    function runFormHost(title, engines, tabPrefKey) {
        var win = new Window("dialog", title);
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 4;
        win.margins = 12;

        var tabs = null;
        if (engines.length === 1) {
            engines[0].error = engines[0].addRows(win);
            if (engines[0].error) { alert(engines[0].error); return; }
        } else {
            tabs = win.add("tabbedpanel");
            tabs.alignChildren = "fill";
            for (var i = 0; i < engines.length; i++) {
                var page = tabs.add("tab", undefined, engines[i].label);
                page.orientation = "column";
                page.alignChildren = "fill";
                page.spacing = 4;
                engines[i].error = engines[i].addRows(page);
                if (engines[i].error) {
                    page.enabled = false;
                    page.helpTip = engines[i].error;
                }
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
        if (tabs !== null) {
            try {
                var savedTab = parseInt(app.preferences.getStringPreference(tabPrefKey), 10);
                if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
            } catch (tabError) {}
            if (engines[tabIndex].error) {
                for (var j = 0; j < engines.length; j++) if (!engines[j].error) { tabIndex = j; break; }
            }
            if (engines[tabIndex].error) { alert(engines[tabIndex].error); return; }
            tabs.selection = tabIndex;
            tabs.onChange = function() {
                // Tab에는 index가 없어 제목으로 찾는다
                var next = tabIndex;
                for (var k = 0; k < engines.length; k++) {
                    if (tabs.selection && tabs.selection.text === engines[k].label) next = k;
                }
                if (next === tabIndex) return;
                if (engines[next].error) {
                    tabs.selection = tabIndex;
                    alert(engines[next].error);
                    return;
                }
                engines[tabIndex].clearPreview();
                tabIndex = next;
                engines[tabIndex].setPreview(previewCheck.value);
            };
        }
        previewCheck.onClick = function() { engines[tabIndex].setPreview(previewCheck.value); };
        okButton.onClick = function() {
            if (!engines[tabIndex].commit()) return;
            if (tabs !== null) {
                try { app.preferences.setStringPreference(tabPrefKey, String(tabIndex)); } catch (saveError) {}
            }
            win.close(1);
        };
        cancelButton.onClick = function() { win.close(0); };

        // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
        win.onShow = function() { engines[tabIndex].setPreview(previewCheck.value); };
        if (typeof bindTabOrder === "function") bindTabOrder(win);
        if (win.show() !== 1) engines[tabIndex].clearPreview();
        try { app.redraw(); } catch (redrawError) {}
    }

    // ==== 폼 탭 공용 부품 ====
    // spec: label(탭 이름), name(그룹 이름), prefKey, controls[], draw(tools, o), check()→오류문(선택)
    // 컨트롤: {panel: "제목"} 새 패널 / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운
    // 위치 패널(가로·세로 이동)은 끝에 저절로 붙고, 이동은 다시 그리지 않고 그룹만 옮긴다.
    // draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "위치"},
            {key: "offsetX", label: "가로 이동", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 0},
            {key: "offsetY", label: "세로 이동", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 1}
        ]);
        var o = {};
        var group = null, committed = false, previewOn = true, center = [0, 0];

        function addRows(page) {
            if (spec.check) {
                var problem = spec.check();
                if (problem) return problem;
            }
            try { center = doc.activeView.centerPoint; } catch (viewError) {}
            for (var i = 0; i < controls.length; i++) if (controls[i].key) o[controls[i].key] = controls[i].value;
            loadSettings();
            var panel = page, checkRow = null;
            for (var c = 0; c < controls.length; c++) {
                var ctl = controls[c];
                if (ctl.panel) {
                    panel = page.add("panel", undefined, ctl.panel);
                    panel.alignChildren = ["left", "top"];
                    panel.margins = [12, 16, 12, 10];
                    panel.spacing = 4;
                    checkRow = null;
                } else if (ctl.check) {
                    if (checkRow === null || checkRow.children.length >= 3) checkRow = panel.add("group");
                    addCheck(checkRow, ctl);
                } else {
                    checkRow = null;
                    if (ctl.items) addChoice(panel, ctl); else addNumber(panel, ctl);
                }
            }
            api.setPreview = function(on) { previewOn = on; redraw(); };
            api.updatePreview = redraw;
            api.clearPreview = function() { if (!committed) removeGroup(); };
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
                        try { group.translate(ctl.move === 0 ? delta * FORM_MM : 0, ctl.move === 1 ? delta * FORM_MM : 0); } catch (e2) {}
                        app.redraw();
                    }
                } else redraw();
            }
            bar.onChanging = function() { apply(bar.value); };
            bar.onChange = function() { apply(bar.value); };
            input.onChange = function() { apply(parseFloat(String(input.text).replace(",", "."))); };
        }

        function addChoice(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            var list = row.add("dropdownlist", undefined, ctl.items);
            list.selection = o[ctl.key];
            list.onChange = function() {
                if (list.selection === null) { list.selection = o[ctl.key]; return; }
                o[ctl.key] = list.selection.index;
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
                spec.draw(makeFormTools(group), o);
                var b = group.geometricBounds;
                group.translate(center[0] - (b[0] + b[2]) / 2 + o.offsetX * FORM_MM,
                    center[1] - (b[1] + b[3]) / 2 + o.offsetY * FORM_MM);
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

    function formFormat(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    // 그리기 도구. 좌표는 pt, 크기 인자는 따로 적지 않으면 pt다
    function makeFormTools(g) {
        var t = {mm: FORM_MM, group: g};
        t.gray = formGray;
        t.path = function(points, closed, fillK, strokeK, width, dashes) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fillK, strokeK, width, dashes);
            return p;
        };
        t.line = function(a, b, width, k, dashes) {
            return t.path([a, b], false, null, k === undefined ? 100 : k, width, dashes);
        };
        t.rect = function(left, top, right, bottom, fillK, strokeK, width) {
            return t.path([[left, top], [right, top], [right, bottom], [left, bottom]], true, fillK, strokeK, width);
        };
        t.circle = function(cx, cy, r, fillK, strokeK, width) {
            var p = g.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
            formPaint(p, fillK, strokeK, width);
            return p;
        };
        // 점들을 지나는 매끈한 곡선 (Catmull-Rom → 베지어)
        t.smooth = function(points, closed, fillK, strokeK, width) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            var n = points.length;
            for (var i = 0; i < n; i++) {
                var prev = points[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)];
                var next = points[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
                var dx = (next[0] - prev[0]) / 6, dy = (next[1] - prev[1]) / 6;
                p.pathPoints[i].leftDirection = [points[i][0] - dx, points[i][1] - dy];
                p.pathPoints[i].rightDirection = [points[i][0] + dx, points[i][1] + dy];
            }
            p.closed = !!closed;
            formPaint(p, fillK, strokeK, width);
            return p;
        };
        // a → b 화살표. 선은 촉 뿌리까지, 촉은 채운 삼각형
        t.arrow = function(a, b, width, k, headLength) {
            if (k === undefined) k = 100;
            var head = headLength || 1.6 * FORM_MM;
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var ux = dx / len, uy = dy / len;
            if (head > len) head = len;
            var base = [b[0] - ux * head, b[1] - uy * head];
            var half = head * 0.35;
            if (len > head) t.line(a, [base[0] + ux * 0.2, base[1] + uy * 0.2], width, k);
            t.path([b, [base[0] - uy * half, base[1] + ux * half], [base[0] + uy * half, base[1] - ux * half]], true, k, null, 0);
        };
        // (x, y)가 글자 가운데(align "left"면 왼쪽 끝, "right"면 오른쪽 끝). sub: 글자 뒤 숫자를 아래 첨자로
        t.text = function(text, x, y, size, align, k, sub) {
            var frame = g.textFrames.add();
            frame.contents = String(text).replace(/°/g, "˘");
            var range = frame.textRange;
            range.characterAttributes.size = size;
            range.characterAttributes.fillColor = formGray(k === undefined ? 100 : k);
            formFonts(frame, sub);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
            return frame;
        };
        return t;
    }

    function formPaint(p, fillK, strokeK, width, dashes) {
        p.filled = fillK !== null && fillK !== undefined;
        if (p.filled) p.fillColor = formGray(fillK);
        p.stroked = strokeK !== null && strokeK !== undefined && width > 0;
        if (p.stroked) {
            p.strokeColor = formGray(strokeK);
            p.strokeWidth = width;
            p.strokeDashes = dashes || [];
        }
    }

    // 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt) — 02_문자/Text_koen.jsx 규칙
    function formFonts(frame, sub) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
                attributes.textFont = FORM_KOR_FONT;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = FORM_ENG_FONT;
                attributes.baselineShift = 0.5;
                if (sub && code >= 48 && code <= 57 && i > 0 && /[A-Za-z)]/.test(text.charAt(i - 1))) {
                    attributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                } else if (sub && code >= 48 && code <= 57 && i > 0 && /[0-9]/.test(text.charAt(i - 1))
                    && frame.textRange.characters[i - 1].characterAttributes.baselinePosition === FontBaselineOption.SUBSCRIPT) {
                    attributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                }
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
