// 에너지 준위.jsx
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

// 에너지 준위: 수소 원자 모형의 에너지 준위(E_n = -13.6/n² eV)와 전이 화살표, 방출·흡수하는 빛의 스펙트럼선을 그린다. 선택 없이 화면 가운데에 만든다.
//   전이는 '3-1, 4-2'처럼 높은 준위-낮은 준위로 쓰고, 이름은 'a, b'처럼 같은 순서로 쓴다. 스펙트럼선은 파장(1/에너지 차)에 비례해 놓고 파장이 긴 쪽이 오른쪽이다.
// 선 두께는 준위 선 0.8pt, 전이 화살표 0.4pt, 스펙트럼 띠 겉 0.4pt, 스펙트럼선 0.8pt이고 '선 두께' 패널에서 고친다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 변수(n) GSMediItaC1, GSMediumB1에 없는 기호(−, ∞)는 HancomEQN이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_ITALIC_FONT = formFindFont(["GSMediItaC1", "GSMediumB1"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    var ARROW_HEAD_MM = 1.6;   // 전이 화살촉 길이
    var NAME_GAP_MM = 1;       // 전이 이름과 화살표·스펙트럼선 사이 간격(글자 윤곽 기준)
    var RYDBERG_EV = 13.6;

    runFormHost("에너지 준위", [makeLevelsEngine()], "EnergyLevels/tab");

    // ==== 에너지 준위 ====
    function makeLevelsEngine() {
        return makeFormEngine({
            label: "에너지 준위", name: "EnergyLevels", prefKey: "EnergyLevels/settings",
            controls: [
                {panel: "준위"},
                {key: "count", label: "준위 수", unit: "개", min: 2, max: 7, step: 1, value: 4},
                {key: "proportional", check: "에너지에 비례한 간격", value: true},
                {key: "infinity", check: "n=∞ 선", value: true},
                {key: "showN", check: "n 글자", value: true},
                {key: "showE", check: "에너지 값", value: true},
                {key: "showUnit", check: "단위 eV", value: true},
                {key: "width", label: "준위 선 길이", unit: "mm", min: 20, max: 120, step: 1, value: 50},
                {key: "height", label: "전체 높이", unit: "mm", min: 30, max: 120, step: 1, value: 60},
                {panel: "전이"},
                {key: "transitions", label: "전이", text: true, value: "3-1, 4-2, 2-1"},
                {key: "names", label: "이름", text: true, value: "a, b, c"},
                {key: "absorb", check: "흡수(위로)", value: false},
                {panel: "스펙트럼선"},
                {key: "spectrum", check: "스펙트럼선", value: true},
                {key: "stripGap", label: "준위와 띠 간격", unit: "mm", min: 4, max: 30, step: 0.5, value: 14},
                {key: "stripH", label: "띠 높이", unit: "mm", min: 3, max: 20, step: 0.5, value: 8},
                {panel: "글자"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            draw: drawLevels
        });
    }

    // 전이 목록: "3-1, 4-2"를 글자 단위로 읽는다 (게으른 정규식은 일러가 멈출 수 있다). 준위 수를 벗어나거나 같은 준위끼리는 건너뛴다
    function parseTransitions(text, count) {
        var out = [], token = "", i;
        var parts = [];
        for (i = 0; i <= text.length; i++) {
            var ch = i < text.length ? text.charAt(i) : ",";
            if (ch === ",") { parts.push(token); token = ""; } else if (ch !== " ") token += ch;
        }
        for (i = 0; i < parts.length; i++) {
            var dash = parts[i].indexOf("-");
            if (dash <= 0) continue;
            var hi = parseInt(parts[i].substring(0, dash), 10), lo = parseInt(parts[i].substring(dash + 1), 10);
            if (!isFinite(hi) || !isFinite(lo) || hi === lo || hi < 1 || lo < 1 || hi > count || lo > count) continue;
            out.push({hi: Math.max(hi, lo), lo: Math.min(hi, lo)});
        }
        return out;
    }

    function splitNames(text) {
        var out = [], token = "";
        for (var i = 0; i <= text.length; i++) {
            var ch = i < text.length ? text.charAt(i) : ",";
            if (ch === ",") { out.push(token); token = ""; } else if (ch !== " ") token += ch;
        }
        return out;
    }

    // 좌표는 pt(y 위쪽 +). n=1 준위가 y=0, 왼쪽 끝이 x=0. 에너지 E_n = -13.6/n² (n=∞가 0).
    function drawLevels(t, o) {
        var m = t.mm, size = o.font, W = o.width * m, H = o.height * m;
        var n, y = [];
        for (n = 1; n <= o.count; n++) {
            y.push(o.proportional ? (1 - 1 / (n * n)) * H : (n - 1) * H / o.count);
        }
        var infAt = H;
        // 준위 선과 글자
        var lastLabelY = null, colRight = null, unit = o.showUnit ? " eV" : "";
        // 에너지 값 글자는 오른쪽 끝(윤곽)을 맞춘 한 열로 놓는다: 첫 값(가장 긴 글자)이 열 너비를 정한다
        function putEnergy(text, yy) {
            if (colRight === null) colRight = formInkBounds(t.textAt(text, W + 1.5 * m, yy, size, "right"))[2];
            else t.textAt(text, colRight, yy, size, "left");
        }
        for (n = 1; n <= o.count; n++) {
            t.line([0, y[n - 1]], [W, y[n - 1]], o.wBody);
            if (o.showN) t.textAt("n=" + n, -1.5 * m, y[n - 1], size, "left", {italic: true});
            if (o.showE) {
                // 위 준위와 너무 가까우면 값 글자를 생략한다
                var gapPt = lastLabelY === null ? 1e9 : y[n - 1] - lastLabelY;
                if (lastLabelY === null || gapPt >= size * 0.95) {
                    var e = -RYDBERG_EV / (n * n);
                    putEnergy("−" + formFormat(-e, 2) + unit, y[n - 1]);
                    lastLabelY = y[n - 1];
                }
            }
        }
        if (o.infinity) {
            t.line([0, infAt], [W, infAt], o.wBody);
            if (o.showN) t.textAt("n=∞", -1.5 * m, infAt, size, "left", {italic: true});
            if (o.showE) putEnergy("0" + unit, infAt);
        }
        // 전이 화살표: 목록 순서대로 준위 선 폭을 (K+1)등분한 자리에 놓는다
        var list = parseTransitions(o.transitions, o.count), names = splitNames(o.names), k, positions = [];
        for (k = 0; k < list.length; k++) {
            var x = W * (k + 1) / (list.length + 1);
            var yHi = y[list[k].hi - 1], yLo = y[list[k].lo - 1];
            if (o.absorb) t.arrow([x, yLo], [x, yHi], o.wRope, ARROW_HEAD_MM * m);
            else t.arrow([x, yHi], [x, yLo], o.wRope, ARROW_HEAD_MM * m);
            var name = k < names.length ? names[k] : "";
            if (name !== "") t.textAt(name, x + NAME_GAP_MM * m, (yHi + yLo) / 2, size, "right");
            // 광자 에너지(eV 단위 비례값): 파장은 1/(1/lo² - 1/hi²)에 비례
            positions.push(1 / (1 / (list[k].lo * list[k].lo) - 1 / (list[k].hi * list[k].hi)));
        }
        // 스펙트럼선: 파장에 비례해 띠 안에 놓는다 (파장이 긴 쪽이 오른쪽)
        if (o.spectrum && list.length > 0) {
            var top = -o.stripGap * m, bottom = top - o.stripH * m;
            t.rect(0, top, W, bottom, null, 100, o.wObj);
            var lo = positions[0], hi = positions[0];
            for (k = 1; k < positions.length; k++) { lo = Math.min(lo, positions[k]); hi = Math.max(hi, positions[k]); }
            for (k = 0; k < list.length; k++) {
                var fx = hi === lo ? 0.5 : 0.1 + 0.8 * (positions[k] - lo) / (hi - lo);
                t.line([W * fx, top], [W * fx, bottom], o.wGuide);
                var label = k < names.length ? names[k] : "";
                if (label !== "") t.textAt(label, W * fx, bottom - NAME_GAP_MM * m, size, "below");
            }
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
    // '선 두께' 패널(wBody 준위 선, wObj 스펙트럼 띠 겉, wRope 전이 화살표, wGuide 스펙트럼선)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "준위 선", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.8},
            {key: "wObj", label: "스펙트럼 띠 겉", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {key: "wRope", label: "전이 화살표", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {key: "wGuide", label: "스펙트럼선", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.8},
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
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "MechanicsDevice/" + spec.name + "/" + ctl.panel);
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
        t.path = function(points, closed, fill, stroke, width) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fill, stroke, width);
            return p;
        };
        t.line = function(a, b, width) { return t.path([a, b], false, null, 100, width); };
        t.rect = function(left, top, right, bottom, fill, stroke, width) {
            return t.path([[left, top], [right, top], [right, bottom], [left, bottom]], true, fill, stroke, width);
        };
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
