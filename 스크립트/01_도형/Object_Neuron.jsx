// Object_Neuron.jsx
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

// 뉴런: 운동·감각·연합 뉴런 모식도와 자극 전달 경로(감각 → 연합 → 운동 뉴런). 선택 없이 화면 가운데에 그린다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);

    // 화살촉 4종류: 일러스트레이터 화살촉을 선 두께 1pt·100%로 확장해 잰 외곽(사용자가 준 SVG). 끝이 원점, 뒤쪽이 +y, 가로는 방향의 직각. 단위 pt.
    // 순서는 모양 목록(삼각형, 꺾쇠, 제비꼬리, 작살형)과 같다. length는 끝에서 가장 먼 점, lineEnd는 선이 머리 속에서 끝나는 끝에서의 거리다
    var HEAD_CATALOG = [
        {length: 8.6, lineEnd: 7.7, poly: [[0, 0], [4.95, 8.6], [-4.95, 8.6]]},
        {length: 8, lineEnd: 0.8, poly: [[0, 0], [4.8, 7.3], [4.84, 7.6], [4.8, 8], [4.45, 8], [4.1, 7.8], [0, 1.3], [-4.1, 7.8], [-4.45, 8], [-4.8, 8], [-4.84, 7.6], [-4.8, 7.3]]},
        {length: 9.9, lineEnd: 7, poly: [[0, 0], [4.1, 9.9], [0, 7.6], [-4.1, 9.9]]},
        {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]}
    ];

    runFormHost("뉴런", [makeNeuronEngine()], "");

    // ==== 뉴런 ====
    // 교과서 모식도. 운동 뉴런: 왼쪽 세포체 + 긴 축삭 돌기. 감각 뉴런: 왼쪽 끝 가지 돌기, 축삭 돌기 옆으로 붙은 세포체.
    // 연합 뉴런: 짧고 가지 돌기가 많다. 자극 전달 경로: 감각 → 연합 → 운동 뉴런을 한 줄로 잇는다.
    function makeNeuronEngine() {
        return makeFormEngine({
            label: "뉴런", name: "Neuron", prefKey: "ObjectNeuron/settings",
            controls: [
                {panel: "뉴런"},
                {key: "kind", label: "종류", items: ["운동 뉴런", "감각 뉴런", "연합 뉴런", "자극 전달 경로"], value: 0},
                {key: "length", label: "길이", unit: "mm", min: 30, max: 200, step: 1, value: 70},
                {key: "body", label: "세포체 지름", unit: "mm", min: 3, max: 20, step: 0.5, value: 7},
                {panel: "표시"},
                {key: "myelin", check: "말이집", value: true},
                {key: "names", check: "이름", value: true},
                {key: "arrow", check: "전달 방향", value: true},
                {key: "headShape", label: "화살촉 모양", items: ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"], order: [3, 2, 0, 1], value: 0},
                {key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8}
            ],
            draw: drawNeuron
        });
    }

    // 말이집 조각 [시작, 끝] (mm). 조각 길이 5, 틈(랑비에 결절) 1.2. except 구간([a, b])에는 두지 않는다
    function myelinSegments(from, to, except) {
        var list = [], SEG = 5, GAP = 1.2;
        for (var x = from; x + SEG <= to + 0.001; x += SEG + GAP) {
            if (except && x + SEG > except[0] && x < except[1]) continue;
            list.push([x, x + SEG]);
        }
        return list;
    }

    function drawNeuron(t, o) {
        var mm = t.mm, F = o.font;
        var R = o.body / 2, L = o.length;
        var LINE = 0.6;

        function P(x, y) { return [x * mm, y * mm]; }
        // 가지 돌기: (x, y)에서 각도 a(°)로 len만큼, 끝에서 두 번 갈라진다
        function dendrite(x, y, a, len) {
            var r = a * Math.PI / 180;
            var ex = x + Math.cos(r) * len, ey = y + Math.sin(r) * len;
            t.line(P(x, y), P(ex, ey), LINE);
            for (var s = -1; s <= 1; s += 2) {
                var r2 = r + s * 0.5, l2 = len * 0.5;
                var fx = ex + Math.cos(r2) * l2, fy = ey + Math.sin(r2) * l2;
                t.line(P(ex, ey), P(fx, fy), LINE * 0.8);
                for (var u = -1; u <= 1; u += 2) {
                    t.line(P(fx, fy), P(fx + Math.cos(r2 + u * 0.45) * l2 * 0.5, fy + Math.sin(r2 + u * 0.45) * l2 * 0.5), LINE * 0.6);
                }
            }
        }
        function body(cx, cy) {
            t.circle(cx * mm, cy * mm, R * mm, 15, 100, 0.5);
            t.circle(cx * mm, cy * mm, R * 0.38 * mm, 60, null, 0);
        }
        // 축삭 돌기와 말이집. 말이집 첫 조각의 가운데를 돌려준다
        function axon(x1, x2, y, except) {
            t.line(P(x1, y), P(x2, y), 0.75);
            if (!o.myelin) return null;
            var segs = myelinSegments(x1 + 2, x2 - 3, except);
            for (var i = 0; i < segs.length; i++) {
                var p = t.group.pathItems.roundedRectangle((y + 1) * mm, segs[i][0] * mm, (segs[i][1] - segs[i][0]) * mm, 2 * mm, 1 * mm, 1 * mm);
                formPaint(p, 5, 100, 0.4);
            }
            if (!segs.length) return null;
            var pick = segs[Math.floor(segs.length / 4)];
            return [(pick[0] + pick[1]) / 2, y - 1];
        }
        // 축삭 말단: (x, y)에서 오른쪽으로 부채꼴 세 가닥, 끝에 작은 알
        function terminal(x, y) {
            var ends = [-35, 0, 35];
            for (var i = 0; i < ends.length; i++) {
                var r = ends[i] * Math.PI / 180;
                var ex = x + Math.cos(r) * 4, ey = y + Math.sin(r) * 4;
                t.line(P(x, y), P(ex, ey), LINE);
                t.circle(ex * mm, ey * mm, 0.6 * mm, 100, null, 0);
            }
            return x + 4.6;
        }

        // 한 뉴런을 x0에 그린다. 부위 위치를 돌려준다 (mm)
        function neuron(kind, x0, len) {
            var parts = {};
            if (kind === 0 || kind === 2) {
                var angles = kind === 0 ? [70, 120, 160, 200, 240, 290] : [60, 105, 150, 195, 240, 285, 330];
                var dlen = kind === 0 ? R * 1.3 + 2 : R + 1.5;
                for (var i = 0; i < angles.length; i++) {
                    var r = angles[i] * Math.PI / 180;
                    dendrite(x0 + Math.cos(r) * R * 0.9, Math.sin(r) * R * 0.9, angles[i], dlen);
                }
                var axonEnd = x0 + (kind === 0 ? len : len * 0.35);
                parts.myelin = kind === 0 ? axon(x0 + R, axonEnd, 0) : (t.line(P(x0 + R, 0), P(axonEnd, 0), 0.75), null);
                body(x0, 0);
                parts.body = [x0, R];
                parts.axon = [(x0 + R + axonEnd) / 2, 0];
                parts.left = x0 - R - dlen * 1.8;
                parts.clear = R + dlen * 1.7;   // 가지 돌기가 닿지 않는 거리
                parts.right = terminal(axonEnd, 0);
            } else {
                var stalk = x0 + len * 0.4, by = R + 3;
                var fan = [150, 180, 210];
                for (var f = 0; f < fan.length; f++) dendrite(x0, 0, fan[f], 3);
                parts.myelin = axon(x0, x0 + len, 0, [stalk - 3, stalk + 3]);
                t.line(P(stalk, 0), P(stalk, by - R), 0.75);
                body(stalk, by);
                parts.body = [stalk, by + R];
                parts.axon = [x0 + len * 0.72, 0];
                parts.left = x0 - 6;
                parts.clear = 6;
                parts.right = terminal(x0 + len, 0);
            }
            parts.center = (parts.left + parts.right) / 2;
            return parts;
        }

        // 이름표: 부위 점에서 위(dy>0)나 아래로 뺀 글자와 지시선
        function label(text, point, dy) {
            var ty = point[1] + dy;
            t.line(P(point[0], point[1]), P(point[0], ty - (dy > 0 ? 1 : -1)), 0.3);
            t.text(text, point[0] * mm, (ty + (dy > 0 ? 0.6 : -0.6)) * mm, F);
        }

        var top, left, right;
        if (o.kind < 3) {
            var kind = o.kind;
            var n = neuron(kind, 0, L);
            left = n.left; right = n.right;
            top = kind === 1 ? n.body[1] + 1 : R + 3;
            if (o.names && kind !== 1) top = n.clear + 1;
            if (o.names) {
                // 가지 돌기는 왼쪽 끝 옆에 쓴다 (세포체 이름표와 겹치지 않게)
                t.text("가지 돌기", (left - 1) * mm, 0, F, "right");
                label("신경 세포체", n.body, kind === 1 ? 5 : n.clear - R + 1);
                label("축삭 돌기", n.axon, kind === 2 ? -n.clear : -6);
                if (o.myelin && n.myelin) label("말이집", n.myelin, -6);
                top += 7;
            }
        } else {
            var s = neuron(1, 0, L * 0.45);
            // 앞 뉴런의 축삭 말단이 다음 뉴런의 가지 돌기 끝에 닿도록 둔다
            var i2 = neuron(2, s.right + 1 + R + (R + 1.5) * 1.2, L * 0.4);
            var m = neuron(0, i2.right + 1 + R + (R * 1.3 + 2) * 1.2, L * 0.5);
            left = s.left; right = m.right;
            top = s.body[1] + 1;
            if (o.names) {
                var y = -(R + (R * 1.3 + 2) * 1.6 + 2);
                t.text("감각 뉴런", s.center * mm, y * mm, F);
                t.text("연합 뉴런", i2.center * mm, y * mm, F);
                t.text("운동 뉴런", m.center * mm, y * mm, F);
                t.text("감각 기관", (left - 2) * mm, 0, F, "right");
                t.text("반응 기관", (right + 2) * mm, 0, F, "left");
            }
        }
        if (o.arrow) {
            var ay = top + 3;
            t.arrow(P(left + 2, ay), P(right - 2, ay), 0.5);
            t.text("자극 전달 방향", ((left + right) / 2) * mm, (ay + 0.5) * mm + F * 0.6, F);
        }
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
            {key: "offsetX", label: "가로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 0},
            {key: "offsetY", label: "세로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 1}
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
                        try { group.translate(ctl.move === 0 ? delta * FORM_MM : 0, ctl.move === 1 ? delta * FORM_MM : 0); } catch (e2) {}
                        app.redraw();
                    }
                } else redraw();
            }
            bar.onChanging = function() { apply(bar.value); };
            bar.onChange = function() { apply(bar.value); };
            reset.onClick = function() { apply(ctl.value); };
            input.onChange = function() { apply(parseFloat(String(input.text).replace(",", "."))); };
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
            list.selection = pos;
            list.onChange = function() {
                if (list.selection === null) { list.selection = pos; return; }
                pos = list.selection.index;
                o[ctl.key] = order ? order[pos] : pos;
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
                spec.draw(makeFormTools(group, o), o);
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

    // 끝 tip, 방향 단위 벡터 d, 배율 k(카탈로그 1pt가 k)로 shape 모양의 점들
    function catalogPoints(shape, tip, d, k) {
        var n = [-d[1], d[0]];
        var poly = HEAD_CATALOG[shape].poly;
        var out = [];
        for (var i = 0; i < poly.length; i++) {
            out.push([tip[0] - d[0] * poly[i][1] * k + n[0] * poly[i][0] * k, tip[1] - d[1] * poly[i][1] * k + n[1] * poly[i][0] * k]);
        }
        return out;
    }

    // 그리기 도구. 좌표는 pt, 크기 인자는 따로 적지 않으면 pt다
    function makeFormTools(g, o) {
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
        // a → b 화살표. 촉 모양은 o.headShape(0 삼각형, 1 꺾쇠, 2 제비꼬리, 3 작살형), 크기는 o.headSize(%): 삼각형 머리 길이가 headLength × 크기이고 다른 모양도 같은 배율을 쓴다.
        // 선은 머리 속(lineEnd)에서 끝나 틈이 없다
        t.arrow = function(a, b, width, k, headLength) {
            if (k === undefined) k = 100;
            var scale = o && o.headSize ? o.headSize / 100 : 1;
            var shape = o && o.headShape ? o.headShape : 0;
            var head = (headLength || 1.6 * FORM_MM) * scale;
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var ux = dx / len, uy = dy / len;
            if (head > len) head = len;
            var unit = head / HEAD_CATALOG[0].length;
            var lineEnd = HEAD_CATALOG[shape].lineEnd * unit;
            if (len > lineEnd) t.line(a, [b[0] - ux * lineEnd, b[1] - uy * lineEnd], width, k);
            t.path(catalogPoints(shape, b, [ux, uy], unit), true, k, null, 0);
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
