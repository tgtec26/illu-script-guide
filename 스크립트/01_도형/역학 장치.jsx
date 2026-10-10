// 역학 장치.jsx
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

// 역학 장치: 물리Ⅰ 시험지의 도르래·빗면·수평면 장치 그림을 장면별 탭으로 그린다. 선택 없이 화면 가운데에 만든다.
//   수평면 도르래 탭: 수평면 위 물체가 실로 도르래를 지나 매달린 추와 이어진 장면. 이전 위치(점선 물체)와 속도 화살표, 두 지점 사이 거리 표시를 고른다.
// 선 두께는 물체·면 0.8pt, 실·도르래 0.4pt, 보조선(점선·치수선) 0.3pt이고 '선 두께' 패널에서 고친다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 변수 GSMediItaC1, GSMediumB1에 없는 기호(θ)는 HancomEQN이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_ITALIC_FONT = formFindFont(["GSMediItaC1", "GSMediumB1"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    var TAB_PREF_KEY = "MechanicsDevice/tab";
    var GHOST_DASH = [3, 2];

    runFormHost("역학 장치", [makeHorizontalPulleyEngine()], TAB_PREF_KEY);

    // ==== 수평면 도르래 탭 ====
    function makeHorizontalPulleyEngine() {
        return makeFormEngine({
            label: "수평면 도르래", name: "HorizontalPulley", prefKey: "MechanicsDevice/horizontalPulley",
            controls: [
                {panel: "물체와 추"},
                {key: "blockText", label: "물체 글자", text: true, value: "4 kg"},
                {key: "blockName", label: "물체 이름", text: true, value: "나무도막"},
                {key: "blockW", label: "물체 너비", unit: "mm", min: 6, max: 30, step: 0.5, value: 12},
                {key: "blockH", label: "물체 높이", unit: "mm", min: 5, max: 25, step: 0.5, value: 9},
                {key: "weightText", label: "추 글자", text: true, value: "1 kg"},
                {key: "weightName", label: "추 이름", text: true, value: "추"},
                {key: "weightW", label: "추 너비", unit: "mm", min: 4, max: 20, step: 0.5, value: 7},
                {key: "weightH", label: "추 높이", unit: "mm", min: 4, max: 20, step: 0.5, value: 8},
                {panel: "실과 도르래"},
                {key: "ropeLen", label: "물체~도르래", unit: "mm", min: 8, max: 80, step: 0.5, value: 28},
                {key: "tableLeft", label: "바닥 왼쪽", unit: "mm", min: 0, max: 80, step: 0.5, value: 26},
                {key: "pulleyArm", check: "도르래 받침대", value: true},
                {key: "pulleyR", label: "도르래 반지름", unit: "mm", min: 1.5, max: 8, step: 0.1, value: 4.2},
                {key: "drop", label: "추까지 길이", unit: "mm", min: 8, max: 60, step: 0.5, value: 24},
                {panel: "이전 위치 (점선)"},
                {key: "ghostBlock", check: "점선 물체", value: true},
                {key: "ghostWeight", check: "점선 추", value: true},
                {key: "ghostGap", label: "물체와 간격", unit: "mm", min: 2, max: 60, step: 0.5, value: 14},
                {key: "ghostSpeed", label: "물체 속력", text: true, value: "2 m/s"},
                {key: "weightUp", label: "점선 추 높이", unit: "mm", min: 3, max: 40, step: 0.5, value: 12},
                {key: "weightSpeed", label: "추 속력", text: true, value: "2 m/s"},
                {panel: "거리 표시"},
                {key: "dim", check: "거리 표시", value: true},
                {key: "dimText", label: "거리", text: true, value: "1 m"},
                {key: "pName", label: "왼쪽 지점", text: true, value: "P"},
                {key: "qName", label: "오른쪽 지점", text: true, value: "Q"},
                {key: "dimDrop", label: "표시선 깊이", unit: "mm", min: 2, max: 12, step: 0.5, value: 4},
                {panel: "글자"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            draw: drawHorizontalPulley
        });
    }

    // 좌표는 pt(y 위쪽 +), 바닥이 y=0, 물체 왼쪽 끝이 x=0. 실은 물체 위쪽에서 수평으로 나가 도르래 위를 지나 오른쪽에서 수직으로 내려온다
    function drawHorizontalPulley(t, o) {
        var m = t.mm, wBody = o.wBody, wRope = o.wRope, wGuide = o.wGuide, size = o.font;
        var bw = o.blockW * m, bh = o.blockH * m, R = o.pulleyR * m;
        var attachY = bh * 0.78;
        var cx = bw + o.ropeLen * m, cy = attachY - R;
        // 바닥
        t.line([-o.tableLeft * m, 0], [cx, 0], wBody);
        // 이전 위치의 물체: 점선 상자와 속도 화살표
        var ghostRight = -o.ghostGap * m;
        if (o.ghostBlock) {
            var ghostLeft = ghostRight - bw;
            t.rect(ghostLeft, bh, ghostRight, 0, null, 100, wGuide, GHOST_DASH);
            var ay = bh + 3 * m;
            t.arrow([ghostLeft + bw * 0.1, ay], [ghostLeft + bw * 0.1 + 7 * m, ay], wRope, 100, 1.4 * m);
            if (o.ghostSpeed !== "") t.text(o.ghostSpeed, ghostLeft + bw * 0.1 + 3.5 * m, ay + 2.6 * m, size, "center");
        }
        // 물체
        t.rect(0, bh, bw, 0, 0, 100, wBody);
        if (o.blockText !== "") t.text(o.blockText, bw / 2, bh / 2, size, "center");
        if (o.blockName !== "") t.text(o.blockName, bw / 2, bh + 3 * m + 2.6 * m, size, "center");
        // 도르래: 바닥에 받침대(막대 양 끝의 축 점)로 고정. 받침대는 도르래 가운데에서 왼쪽 아래 바닥으로 뻗는다
        var armLen = R * 2.1, armDx = armLen * armLen > cy * cy ? Math.sqrt(armLen * armLen - cy * cy) : 0;
        t.pulley(cx, cy, R, o.pulleyArm ? [cx - armDx, 0] : null, wBody, wRope);
        // 실: 물체 → 도르래 위 → 오른쪽 수직
        t.line([bw, attachY], [cx, cy + R], wRope);
        t.arc(cx, cy, R, 0, Math.PI / 2, wRope);
        var wx = cx + R, wTop = cy - o.drop * m;
        t.line([wx, cy], [wx, wTop], wRope);
        // 추
        var ww = o.weightW * m, wh = o.weightH * m;
        if (o.ghostWeight) {
            var gTop = wTop + o.weightUp * m;
            t.rect(wx - ww / 2, gTop, wx + ww / 2, gTop - wh, null, 100, wGuide, GHOST_DASH);
            var gmid = gTop - wh / 2, arrowX = wx + ww / 2 + 2.5 * m;
            t.arrow([arrowX, gmid + 3.5 * m], [arrowX, gmid - 3.5 * m], wRope, 100, 1.4 * m);
            if (o.weightSpeed !== "") t.text(o.weightSpeed, arrowX + 1.8 * m, gmid, size, "left");
        }
        t.rect(wx - ww / 2, wTop, wx + ww / 2, wTop - wh, 0, 100, wBody);
        if (o.weightText !== "") t.text(o.weightText, wx, wTop - wh / 2, size, "center");
        if (o.weightName !== "") t.text(o.weightName, wx + ww / 2 + 2 * m, wTop - wh / 2, size, "left");
        // 거리 표시: 점선 물체의 오른쪽 끝(없으면 물체 왼쪽 끝)에서 물체의 오른쪽 끝까지
        if (o.dim) {
            var px = o.ghostBlock ? ghostRight : 0, qx = bw;
            var dy = -o.dimDrop * m, tick = (o.dimDrop + 1.5) * m;
            t.line([px, 0], [px, -tick], wGuide);
            t.line([qx, 0], [qx, -tick], wGuide);
            var textW = o.dimText === "" ? 0 : (o.dimText.length * 0.55 + 0.6) * size;
            var mid = (px + qx) / 2;
            if (textW > 0 && textW < qx - px - 4 * m) {
                t.arrow([mid - textW / 2, dy], [px, dy], wGuide, 100, 1.2 * m);
                t.arrow([mid + textW / 2, dy], [qx, dy], wGuide, 100, 1.2 * m);
                t.text(o.dimText, mid, dy, size, "center");
            } else {
                t.arrow([mid, dy], [px, dy], wGuide, 100, 1.2 * m);
                t.arrow([mid, dy], [qx, dy], wGuide, 100, 1.2 * m);
            }
            var ny = -(o.dimDrop + 1.5) * m - 2.6 * m;
            // 글자가 선 사이에 안 들어가면 P·Q 이름 아래에 쓴다
            if (textW > 0 && !(textW < qx - px - 4 * m)) t.text(o.dimText, mid, ny - 3.6 * m, size, "center");
            if (o.pName !== "") t.text(o.pName, px, ny, size, "center");
            if (o.qName !== "") t.text(o.qName, qx, ny, size, "center");
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
        try { app.redraw(); } catch (redrawError) {}
    }

    // ==== 폼 탭 공용 부품 ====
    // spec: label(탭 이름), name(그룹 이름), prefKey, controls[], draw(tools, o)
    // 컨트롤: {panel: "제목", fold: true} 새 패널(fold면 기본으로 접힘) / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운 /
    //         {key, label, text: true, value: "글"} 글 입력
    // '선 두께' 패널(물체·면 wBody, 실·도르래 wRope, 보조선 wGuide)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "물체·면", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.8},
            {key: "wRope", label: "실·도르래", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {key: "wGuide", label: "보조선", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.3},
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
                spec.draw(makeFormTools(group, o), o);
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

    function formFormat(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    // 그리기 도구. 좌표는 pt, 크기 인자는 따로 적지 않으면 pt다. 색은 K값(0~100, null이면 없음)
    function makeFormTools(g, o) {
        var t = {mm: FORM_MM, group: g};
        t.path = function(points, closed, fill, stroke, width, dashes) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fill, stroke, width, dashes);
            return p;
        };
        t.line = function(a, b, width, k, dashes) {
            return t.path([a, b], false, null, k === undefined ? 100 : k, width, dashes);
        };
        // 위쪽 top·아래쪽 bottom (일러 좌표, top > bottom)
        t.rect = function(left, top, right, bottom, fill, stroke, width, dashes) {
            return t.path([[left, top], [right, top], [right, bottom], [left, bottom]], true, fill, stroke, width, dashes);
        };
        t.circle = function(cx, cy, r, fill, stroke, width) {
            var p = g.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
            formPaint(p, fill, stroke, width);
            return p;
        };
        // 도르래: 바깥 테두리와 회색 홈 둘레, 흰 안쪽 원판, 가운데 축 점. mount([x, y])가 있으면 가운데에서 mount까지 받침대(양 끝이 둥근 막대)와 그 끝의 축 점을 그린다
        t.pulley = function(cx, cy, R, mount, wBody, wRope) {
            t.circle(cx, cy, R, 22, 100, wBody);
            t.circle(cx, cy, R * 0.66, 0, 100, wRope);
            var dot = R * 0.17;
            if (mount) {
                var dx = mount[0] - cx, dy = mount[1] - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
                var ux = dx / len, uy = dy / len, half = R * 0.3, a = Math.atan2(uy, ux), pts = [], i;
                // 받침대 윤곽: 가운데 쪽 반원 → 한쪽 변 → mount 쪽 반원 → 반대 변
                for (i = 0; i <= 12; i++) pts.push([cx + half * Math.cos(a + Math.PI / 2 + Math.PI * i / 12), cy + half * Math.sin(a + Math.PI / 2 + Math.PI * i / 12)]);
                for (i = 0; i <= 12; i++) pts.push([mount[0] + half * Math.cos(a - Math.PI / 2 + Math.PI * i / 12), mount[1] + half * Math.sin(a - Math.PI / 2 + Math.PI * i / 12)]);
                t.path(pts, true, 0, 100, wRope);
                t.circle(mount[0], mount[1], dot, 45, 100, wRope);
            }
            t.circle(cx, cy, dot, 45, 100, wRope);
        };
        // 원호 (a0 → a1, 라디안, 반시계가 +). 열린 선
        t.arc = function(cx, cy, r, a0, a1, width, k) {
            var steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 36)));
            var pts = [];
            for (var i = 0; i <= steps; i++) pts.push([cx + r * Math.cos(a0 + (a1 - a0) * i / steps), cy + r * Math.sin(a0 + (a1 - a0) * i / steps)]);
            return t.path(pts, false, null, k === undefined ? 100 : k, width);
        };
        // a → b 화살표: 선은 촉 뿌리까지, 촉은 채운 삼각형
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
        // (x, y)가 글자 가운데(align "left"면 왼쪽 끝, "right"면 오른쪽 끝). opts: italic 변수 글자(이탤릭), sub 글자 뒤 숫자를 아래 첨자로
        t.text = function(text, x, y, size, align, k, opts) {
            var frame = g.textFrames.add();
            frame.contents = String(text).replace(/°/g, "˘");
            var range = frame.textRange;
            range.characterAttributes.size = size;
            range.characterAttributes.fillColor = formGray(k === undefined ? 100 : k);
            formFonts(frame, opts);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
            return frame;
        };
        return t;
    }

    function formPaint(p, fill, stroke, width, dashes) {
        p.filled = fill !== null && fill !== undefined;
        if (p.filled) p.fillColor = formGray(fill);
        p.stroked = stroke !== null && stroke !== undefined && width > 0;
        if (p.stroked) {
            p.strokeColor = formGray(stroke);
            p.strokeWidth = width;
            p.strokeDashes = dashes || [];
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
