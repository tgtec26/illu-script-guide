// Object_ChemReaction.jsx
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

// 화학 반응 모형: 원자를 겹친 원으로 그린 분자로 반응 전후를 나타낸다 (물·암모니아·염화 수소 생성, 메테인·일산화 탄소 연소).
// 선택 없이 화면 가운데에 그린다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);

    runFormHost("화학 반응 모형", [makeChemEngine()], "");

    // ==== 화학 반응 모형 ====
    // 원자를 겹친 원(공간 채움 모형)으로 그린 분자로 반응 전후를 나타낸다.
    // 상자: 반응 전·후 상자에 분자를 계수 × 배수만큼 담는다. 나열: 계수만큼 분자를 늘어놓고 +·화살표로 잇는다.
    function makeChemEngine() {
        var reactions = chemReactions();
        var names = [];
        for (var i = 0; i < reactions.length; i++) names.push(reactions[i].title);
        return makeFormEngine({
            label: "화학 반응 모형", name: "ChemReactionModel", prefKey: "ObjectChemReaction/settings",
            controls: [
                {panel: "반응"},
                {key: "reaction", label: "반응", items: names, value: 0},
                {key: "layout", label: "배치", items: ["상자 (반응 전·후)", "나열"], value: 0},
                {key: "mult", label: "배수", unit: "배", min: 1, max: 3, step: 1, value: 1},
                {key: "size", label: "원자 크기", unit: "mm", min: 2, max: 15, step: 0.5, value: 5},
                {panel: "표시"},
                {key: "symbols", check: "원소 기호", value: true},
                {key: "labels", check: "이름", value: true},
                {key: "equation", check: "반응식", value: false},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8}
            ],
            draw: drawChem
        });
    }

    function chemReactions() {
        return [
            {title: "물 생성 (2H₂ + O₂)", left: [[2, "H2"], [1, "O2"]], right: [[2, "H2O"]]},
            {title: "암모니아 생성 (N₂ + 3H₂)", left: [[1, "N2"], [3, "H2"]], right: [[2, "NH3"]]},
            {title: "염화 수소 생성 (H₂ + Cl₂)", left: [[1, "H2"], [1, "Cl2"]], right: [[2, "HCl"]]},
            {title: "메테인 연소 (CH₄ + 2O₂)", left: [[1, "CH4"], [2, "O2"]], right: [[1, "CO2"], [2, "H2O"]]},
            {title: "일산화 탄소 연소 (2CO + O₂)", left: [[2, "CO"], [1, "O2"]], right: [[2, "CO2"]]}
        ];
    }

    // 원자 지름(산소 = 1)과 채움 K
    function chemElement(symbol) {
        var table = {H: [0.7, 0], O: [1, 35], N: [1, 15], C: [1.05, 70], Cl: [1.25, 55]};
        return {d: table[symbol][0], k: table[symbol][1]};
    }

    // 원자 배치 (산소 지름 = 1, 가운데가 원점). 바깥 원자를 먼저 적어 가운데 원자가 위에 그려진다
    function chemMolecule(formula) {
        var list = {
            H2: [["H", -0.25, 0], ["H", 0.25, 0]],
            O2: [["O", -0.38, 0], ["O", 0.38, 0]],
            N2: [["N", -0.38, 0], ["N", 0.38, 0]],
            Cl2: [["Cl", -0.48, 0], ["Cl", 0.48, 0]],
            H2O: [["H", -0.55, -0.3], ["H", 0.55, -0.3], ["O", 0, 0.1]],
            NH3: [["H", -0.6, 0.05], ["H", 0.6, 0.05], ["H", 0, -0.6], ["N", 0, 0.05]],
            HCl: [["H", -0.5, 0], ["Cl", 0.2, 0]],
            CH4: [["H", -0.6, 0], ["H", 0.6, 0], ["H", 0, 0.6], ["H", 0, -0.6], ["C", 0, 0]],
            CO2: [["O", -0.75, 0], ["O", 0.75, 0], ["C", 0, 0]],
            CO: [["C", -0.38, 0], ["O", 0.38, 0]]
        }[formula];
        var atoms = [];
        for (var i = 0; i < list.length; i++) atoms.push({symbol: list[i][0], x: list[i][1], y: list[i][2], d: chemElement(list[i][0]).d});
        return atoms;
    }

    // 분자의 경계 [왼, 위, 오른, 아래] (산소 지름 = 1)
    function chemBounds(atoms) {
        var b = [1e9, -1e9, -1e9, 1e9];
        for (var i = 0; i < atoms.length; i++) {
            var r = atoms[i].d / 2;
            b[0] = Math.min(b[0], atoms[i].x - r);
            b[1] = Math.max(b[1], atoms[i].y + r);
            b[2] = Math.max(b[2], atoms[i].x + r);
            b[3] = Math.min(b[3], atoms[i].y - r);
        }
        return b;
    }

    function chemName(formula) {
        return {H2: "수소", O2: "산소", N2: "질소", Cl2: "염소", H2O: "물", NH3: "암모니아",
            HCl: "염화 수소", CH4: "메테인", CO2: "이산화 탄소", CO: "일산화 탄소"}[formula];
    }

    // 상자 안 격자: 개수 → [열, 행]
    function chemGrid(count) {
        var cols = Math.ceil(Math.sqrt(count));
        return [cols, Math.ceil(count / cols)];
    }

    function drawChem(t, o) {
        var mm = t.mm, F = o.font, unit = o.size * mm;
        var reaction = chemReactions()[o.reaction];

        function molecule(formula, cx, cy) {
            var atoms = chemMolecule(formula);
            for (var i = 0; i < atoms.length; i++) {
                var el = chemElement(atoms[i].symbol);
                var x = cx + atoms[i].x * unit, y = cy + atoms[i].y * unit;
                t.circle(x, y, el.d * unit / 2, el.k, 100, 0.3);
                if (o.symbols) t.text(atoms[i].symbol, x, y, Math.min(F, el.d * o.size * 1.6), "center", el.k >= 60 ? 0 : 100);
            }
        }
        function sideText(side) {
            var parts = [];
            for (var i = 0; i < side.length; i++) parts.push((side[i][0] * o.mult > 1 ? side[i][0] * o.mult : "") + side[i][1]);
            return parts.join(" + ");
        }

        var arrowLength = 8 * mm, bottom;
        if (o.layout === 0) {
            var cell = 0, grids = [], lists = [];
            var sides = [reaction.left, reaction.right];
            for (var s = 0; s < 2; s++) {
                var list = [];
                for (var j = 0; j < sides[s].length; j++) {
                    for (var n = 0; n < sides[s][j][0] * o.mult; n++) list.push(sides[s][j][1]);
                    var mb = chemBounds(chemMolecule(sides[s][j][1]));
                    cell = Math.max(cell, mb[2] - mb[0], mb[1] - mb[3]);
                }
                lists.push(list);
                grids.push(chemGrid(list.length));
            }
            cell = (cell + 0.4) * unit;
            var cols = Math.max(grids[0][0], grids[1][0]), rows = Math.max(grids[0][1], grids[1][1]);
            var pad = 0.3 * unit, boxW = cols * cell + pad * 2, boxH = rows * cell + pad * 2;
            for (var side = 0; side < 2; side++) {
                var left = side * (boxW + arrowLength + 6 * mm);
                t.rect(left, boxH, left + boxW, 0, null, 100, 0.5);
                var g = grids[side];
                var offX = left + pad + (cols - g[0]) * cell / 2, offY = boxH - pad - (rows - g[1]) * cell / 2;
                for (var m = 0; m < lists[side].length; m++) {
                    var mb2 = chemBounds(chemMolecule(lists[side][m]));
                    var cx = offX + (m % g[0] + 0.5) * cell - (mb2[0] + mb2[2]) / 2 * unit;
                    var cy = offY - (Math.floor(m / g[0]) + 0.5) * cell - (mb2[1] + mb2[3]) / 2 * unit;
                    molecule(lists[side][m], cx, cy);
                }
                if (o.labels) t.text(side === 0 ? "반응 전" : "반응 후", left + boxW / 2, -F * 0.8, F);
            }
            t.arrow([boxW + 3 * mm, boxH / 2], [boxW + 3 * mm + arrowLength, boxH / 2], 1, 100, 2.2 * mm);
            bottom = o.labels ? -F * 1.6 : 0;
        } else {
            var x = 0, gap = 0.3 * unit, lowest = 0;
            var order = [reaction.left, reaction.right];
            // 분자는 세로 가운데를 0에 맞춘다. 이름은 가장 낮은 분자 아래에 한 줄로
            for (var sl = 0; sl < 2; sl++) {
                for (var sq = 0; sq < order[sl].length; sq++) {
                    var lb0 = chemBounds(chemMolecule(order[sl][sq][1]));
                    lowest = Math.min(lowest, -(lb0[1] - lb0[3]) / 2 * unit);
                }
            }
            for (var sd = 0; sd < 2; sd++) {
                for (var sp = 0; sp < order[sd].length; sp++) {
                    if (sp > 0) {
                        t.text("+", x + 3 * mm, 0, F * 1.4);
                        x += 6 * mm;
                    }
                    var formula = order[sd][sp][1], copies = order[sd][sp][0] * o.mult;
                    var b = chemBounds(chemMolecule(formula));
                    var start = x;
                    for (var c = 0; c < copies; c++) {
                        molecule(formula, x - b[0] * unit, -(b[1] + b[3]) / 2 * unit);
                        x += (b[2] - b[0]) * unit + gap;
                    }
                    x -= gap;
                    if (o.labels) t.text(chemName(formula), (start + x) / 2, lowest - F * 0.8, F);
                }
                if (sd === 0) {
                    t.arrow([x + 2 * mm, 0], [x + 2 * mm + arrowLength, 0], 1, 100, 2.2 * mm);
                    x += arrowLength + 4 * mm;
                }
            }
            bottom = o.labels ? lowest - F * 1.5 : lowest;
        }

        if (o.equation) {
            var y = bottom - F * 1.2;
            var leftText = t.text(sideText(reaction.left), 0, y, F, "right", 100, true);
            var lb = leftText.geometricBounds;
            var shift = -lb[0];
            leftText.translate(shift, 0);
            var ax = lb[2] + shift + 2 * mm;
            t.arrow([ax, y], [ax + 6 * mm, y], 0.5, 100, 1.4 * mm);
            t.text(sideText(reaction.right), ax + 8 * mm, y, F, "left", 100, true);
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
