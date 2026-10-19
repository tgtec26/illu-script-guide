// 반응 경로 에너지 도표.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 반응 경로 에너지 도표: 화학Ⅱ 기출에 가장 흔한 '반응 진행에 따른 에너지' 도표(반응물 → 활성화 에너지 봉우리 → 생성물)를 그린다. 선택 없이 화면 가운데에 만든다.
//   반응물·생성물 높이, 봉우리 높이(활성화 에너지 Ea), 발열(생성물이 낮음)·흡열(생성물이 높음)을 슬라이더와 목록으로 정한다.
//   촉매를 쓰면 봉우리가 낮아진 둘째 곡선(파선)을 함께 그린다. 반응물·생성물 글자(A(g), B(g) …), 활성화 에너지 Ea 화살표, 반응 엔탈피 ΔH 화살표와 점선 안내선을 넣을 수 있다.
//   곡선은 앵커가 적은 베지어 패스 하나라 나중에 손으로 고치기 쉽다. 화살촉은 측정한 일러스트레이터 화살촉 4종 중에서 고르고(기본 작살형) 크기를 %로 정한다.
// 선 두께는 곡선 1pt, 축·점선·화살표 0.4pt이고 '선 두께' 패널에서 고친다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 변수(E, H)는 GSMediItaC1이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var LEGEND_GAP_MM = 1;           // 축 범례와 축(또는 눈금 숫자·글자) 사이 간격
    var LEGEND_LINE_HEIGHT = 1.2;    // 세로로 쌓은 범례의 줄 간격(글자 크기 배)
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_ITALIC_FONT = formFindFont(["GSMediItaC1", "GSMediumB1"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    // 화살촉 4종류: 일러스트레이터 화살촉을 선 두께 1pt·100%로 확장해 잰 외곽(tools/arrowheads.json과 같은 데이터). 끝이 원점, 뒤쪽이 +y, 가로는 방향의 직각. 단위 pt.
    // 순서는 모양 목록(삼각형, 꺾쇠, 제비꼬리, 작살형)과 같다. length는 끝에서 가장 먼 점, lineEnd는 선이 머리 속에서 끝나는 끝에서의 거리다
    var HEAD_SHAPES = ["삼각형", "꺾쇠 (열린 V)", "제비꼬리", "작살형 (평가원식)"];
    var HEAD_CATALOG = [
        {length: 8.6, lineEnd: 7.7, poly: [[0, 0], [4.95, 8.6], [-4.95, 8.6]]},
        {length: 8, lineEnd: 0.8, poly: [[0, 0], [4.8, 7.3], [4.84, 7.6], [4.8, 8], [4.45, 8], [4.1, 7.8], [0, 1.3], [-4.1, 7.8], [-4.45, 8], [-4.8, 8], [-4.84, 7.6], [-4.8, 7.3]]},
        {length: 9.9, lineEnd: 7, poly: [[0, 0], [4.1, 9.9], [0, 7.6], [-4.1, 9.9]]},
        {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]}
    ];
    var HEAD_EXAM = 3;            // 작살형(평가원식). 화살촉 목록의 1번
    var HEAD_EXAM_LENGTH_PT = 4;  // 크기 100%일 때 작살형의 길이(pt). 다른 모양도 같은 배율로 그린다

    // ==== 반응 경로 에너지 도표 ====
    var KIND_ITEMS = ["발열 반응 (생성물이 낮음)", "흡열 반응 (생성물이 높음)"];

    // 목록·표가 다 정해진 뒤에 창을 띄운다. 창은 runFormHost 안에서 닫힐 때까지 떠 있어서, 이 줄보다 아래의 var는 그동안 undefined다
    runFormHost("반응 경로 에너지 도표", [makeReactionPathEngine()], "ReactionPath/tab");

    function makeReactionPathEngine() {
        return makeFormEngine({
            label: "반응 경로 에너지 도표", name: "ReactionPath", prefKey: "ReactionPath/settings",
            controls: [
                {panel: "도표"},
                {key: "kind", label: "반응 종류", items: KIND_ITEMS, value: 0},
                {key: "width", label: "가로 길이", unit: "mm", min: 25, max: 100, step: 1, value: 50},
                {key: "reactant", label: "반응물 높이", unit: "mm", min: 6, max: 40, step: 0.5, value: 16},
                {key: "dH", label: "ΔH 크기", unit: "mm", min: 2, max: 25, step: 0.5, value: 8},
                {key: "ea", label: "봉우리 높이 Ea", unit: "mm", min: 4, max: 30, step: 0.5, value: 14},
                {panel: "촉매"},
                {key: "catalyst", check: "촉매 곡선 (파선)", value: false},
                {key: "catPct", label: "촉매 봉우리", unit: "%", min: 20, max: 90, step: 5, value: 55},
                {panel: "표시"},
                {key: "showNames", check: "반응물·생성물", value: true},
                {key: "showEa", check: "Ea 화살표", value: true},
                {key: "showDH", check: "ΔH 화살표", value: true},
                {key: "reactName", label: "반응물 글자", text: true, value: "A(g)"},
                {key: "prodName", label: "생성물 글자", text: true, value: "B(g)"},
                {key: "xName", label: "가로축 글자", text: true, value: "반응 진행"},
                {key: "yName", label: "세로축 글자", text: true, value: "에너지"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8},
                {panel: "화살촉"},
                {key: "headShape", label: "화살촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3},
                {key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100}
            ],
            draw: drawReactionPath
        });
    }

    // 반응물 높이 er, 생성물 높이 ep, 봉우리 높이 peak(모두 pt), 가로 w, 봉우리 x가 xp인 곡선의 베지어 점 다섯 개(수평 평탄 구간 + 매끄러운 봉우리)
    function pathPoints(w, er, ep, peak, xp) {
        var x1 = w * 0.18, x2 = w * 0.82, h1 = (xp - x1) * 0.5, h2 = (x2 - xp) * 0.5;
        return [
            {a: [0, er], l: [0, er], r: [0, er], smooth: false},
            {a: [x1, er], l: [x1 - h1 * 0.4, er], r: [x1 + h1, er], smooth: true},
            {a: [xp, peak], l: [xp - h1, peak], r: [xp + h2, peak], smooth: true},
            {a: [x2, ep], l: [x2 - h2, ep], r: [x2 + h2 * 0.4, ep], smooth: true},
            {a: [w, ep], l: [w, ep], r: [w, ep], smooth: false}
        ];
    }

    // 좌표는 pt(y 위쪽 +). 축의 원점이 (0, 0).
    function drawReactionPath(t, o) {
        var m = t.mm, size = o.font, w = o.width * m, er = o.reactant * m, dH = o.dH * m;
        var ep = o.kind === 0 ? er - dH : er + dH;
        if (ep < 2 * m) ep = 2 * m;
        var peak = Math.max(er, ep) + o.ea * m;
        var xp = w * 0.5, top = peak + 8 * m, xAxis = w + 6 * m;
        // 축
        t.arrow([0, 0], [xAxis, 0], o.wRope);
        t.arrow([0, 0], [0, top], o.wRope);
        // 곡선(반응 경로)과 촉매 곡선
        t.curve(pathPoints(w, er, ep, peak, xp), false, null, 100, o.wBody);
        if (o.catalyst) {
            var catPeak = Math.max(er, ep) + o.ea * m * o.catPct / 100;
            var cat = t.curve(pathPoints(w, er, ep, catPeak, xp), false, null, 100, o.wBody);
            cat.strokeDashes = [3, 2];
        }
        // 점선 안내선: 반응물·생성물 높이를 오른쪽 끝 너머까지
        var guideEnd = w + 4 * m;
        t.line([w * 0.18, er], [guideEnd, er], o.wRope, [1.5, 1.5]);
        t.line([w * 0.82, ep], [guideEnd, ep], o.wRope, [1.5, 1.5]);
        // 반응물·생성물 글자는 평탄 구간 바로 위 (글자 윤곽 아래가 곡선에서 1.2mm 위)
        if (o.showNames) {
            if (o.reactName !== "") t.textAt(o.reactName, w * 0.09, er + 1.2 * m, size, "above");
            if (o.prodName !== "") t.textAt(o.prodName, w * 0.91, ep + 1.2 * m, size, "above");
        }
        if (o.showEa) {
            t.arrow([xp, er], [xp, peak], o.wRope);
            t.textAt("Ea", xp - 1.2 * m, (er + peak) / 2, size, "left", {italic: true});
        }
        if (o.showDH) {
            var lo = Math.min(er, ep), hi = Math.max(er, ep);
            t.arrow(o.kind === 0 ? [guideEnd - 1 * m, hi] : [guideEnd - 1 * m, lo], o.kind === 0 ? [guideEnd - 1 * m, lo] : [guideEnd - 1 * m, hi], o.wRope);
            t.textAt("ΔH", guideEnd + 0.4 * m, (er + ep) / 2, size, "right");
        }
        // 축 범례(그림 제작 규칙): 화살촉 있는 축이라 X는 오른쪽 끝, Y는 위 끝에 맞추고 축에서 1mm.
        // 눈금 글자와 겹치면 그 글자에서 1mm 떨어진다. 글자를 모두 그린 뒤에 놓는다
        if (o.xName !== "") t.axisLegendX(o.xName, size, 0, xAxis, "right");
        if (o.yName !== "") t.axisLegendY(o.yName, size, 0, top, "top");
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

    // 고른 화살촉의 배율 k: 작살형 길이 HEAD_EXAM_LENGTH_PT × 크기%를 카탈로그 작살형 길이(12.1)로 나눈다
    function headUnit(o) {
        return HEAD_EXAM_LENGTH_PT * o.headSize / 100 / HEAD_CATALOG[HEAD_EXAM].length;
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
    // '선 두께' 패널(wBody 곡선, wRope 축·점선·화살표)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "곡선", unit: "pt", min: 0.1, max: 3, step: 0.1, value: 1},
            {key: "wRope", label: "축·점선·화살표", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {panel: "위치"},
            {key: "offsetX", label: "가로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 0},
            {key: "offsetY", label: "세로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 1}
        ]);
        var o = {};
        var group = null, committed = false, previewOn = true, center = [0, 0], ui = {};

        function addRows(page) {
            try { center = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint); } catch (viewError) {}
            for (var i = 0; i < controls.length; i++) if (controls[i].key) o[controls[i].key] = controls[i].value;
            loadSettings();
            var panel = page, checkRow = null;
            for (var c = 0; c < controls.length; c++) {
                var ctl = controls[c];
                if (ctl.panel) {
                    if (ctl.fold && typeof makeCollapsiblePanel === "function") {
                        // fold: true면 기본으로 접어 두고 접힌 상태는 다음에도 기억한다 (행이 많은 패널)
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "ReactionPath/" + spec.name + "/" + ctl.panel);
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
            // 글자마다 다시 그리지 않는다. [완료]를 누르거나 포커스를 옮기거나 Enter를 칠 때 반영한다
            var apply = row.add("button", undefined, "완료");
            apply.preferredSize.width = 44;
            apply.helpTip = "입력한 글을 미리보기에 반영";
            apply.applyTo = input;   // ui_tab_helper: 이 단추는 이 입력칸을 확정한다
            apply.onClick = input.onChange;
        }

        function addCheck(row, ctl) {
            var box = row.add("checkbox", undefined, ctl.check);
            box.value = o[ctl.key];
            box.onClick = function() { o[ctl.key] = box.value; redraw(); };
        }

        // 그리는 사이(app.redraw가 키 입력을 처리할 때) 다시 그리라는 요청이 오면 겹쳐 그리지 않고 끝난 뒤 한 번 더 그린다.
        // 겹쳐 그리면 그리던 그룹이 지워져 'Target layer cannot be modified'가 나고 조각이 남는다
        var drawing = false, drawAgain = false;
        function redraw() {
            if (drawing) { drawAgain = true; return; }
            drawing = true;
            try {
                do {
                    drawAgain = false;
                    removeGroup();
                    if (previewOn) build();
                    app.redraw();
                } while (drawAgain);
            } finally { drawing = false; }
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
        var frames = [];   // 그린 글자 글상자(축 범례가 눈금 숫자·다른 글자를 피하는 데 쓴다)
        t.path = function(points, closed, fill, stroke, width, dash) {
            var p = g.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fill, stroke, width);
            if (dash) p.strokeDashes = dash;
            return p;
        };
        t.line = function(a, b, width, dash) { return t.path([a, b], false, null, 100, width, dash); };
        // 사각형(왼쪽, 위, 오른쪽, 아래). fill은 K값(없으면 null), stroke·width는 테두리
        t.rect = function(left, top, right, bottom, fill, stroke, width) {
            return t.path([[left, top], [right, top], [right, bottom], [left, bottom]], true, fill, stroke, width);
        };
        // 가운데 (cx, cy), 반지름 r인 채운 점
        t.dot = function(cx, cy, r, fill) {
            var p = g.pathItems.ellipse(cy + r, cx - r, 2 * r, 2 * r);
            formPaint(p, fill, null, 0);
            return p;
        };
        // 베지어 경로. points는 {a: 앵커, l: 들어오는 핸들, r: 나가는 핸들, smooth: 매끄러운 점이면 true}
        t.curve = function(points, closed, fill, stroke, width) {
            var anchors = [], i;
            for (i = 0; i < points.length; i++) anchors.push(points[i].a);
            var p = g.pathItems.add();
            p.setEntirePath(anchors);
            for (i = 0; i < points.length; i++) {
                p.pathPoints[i].leftDirection = points[i].l;
                p.pathPoints[i].rightDirection = points[i].r;
            }
            for (i = 0; i < points.length; i++) {
                if (points[i].smooth) { try { p.pathPoints[i].pointType = PointType.SMOOTH; } catch (e) {} }
            }
            p.closed = !!closed;
            formPaint(p, fill, stroke, width);
            return p;
        };
        // 화살촉: 끝 tip, 방향 단위 벡터 d. 고른 모양(작살형이 기본)의 채운 도형. 선은 headBack()만큼 물러나 촉 속에서 끝낸다
        t.head = function(tip, d) {
            return t.path(catalogPoints(o.headShape, tip, d, headUnit(o)), true, 100, null, 0);
        };
        t.headBack = function() { return HEAD_CATALOG[o.headShape].lineEnd * headUnit(o); };
        t.headLength = function() { return HEAD_CATALOG[o.headShape].length * headUnit(o); };
        // a → b 화살표: 선은 촉 속에서 끝난다
        t.arrow = function(a, b, width) {
            var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var d = [dx / len, dy / len], back = t.headBack();
            if (len > back) t.line(a, [b[0] - d[0] * back, b[1] - d[1] * back], width);
            t.head(b, d);
        };
        // (x, y)가 글자 가운데(align "left"면 왼쪽 끝, "right"면 오른쪽 끝). opts: italic 변수 글자(이탤릭), sub 글자 뒤 숫자를 아래 첨자로,
        // stack 줄 사이를 글자 크기의 1.2배로 두고 가운데 맞춤(세로쓰기 축 범례)
        t.text = function(text, x, y, size, align, opts) {
            var frame = g.textFrames.add();
            frame.contents = String(text);
            var range = frame.textRange;
            range.characterAttributes.size = size;
            range.characterAttributes.fillColor = formGray(100);
            formFonts(frame, opts);
            if (opts && opts.stack) {
                range.paragraphAttributes.justification = Justification.CENTER;
                range.characterAttributes.autoLeading = false;
                range.characterAttributes.leading = size * LEGEND_LINE_HEIGHT;
            }
            frames.push(frame);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
            return frame;
        };
        // 글자 윤곽 기준: anchor "below"면 (x, y)가 글자 윤곽의 위 가운데, "above"면 윤곽의 아래 가운데, "right"면 윤곽의 왼쪽 끝 세로 가운데, "left"면 윤곽의 오른쪽 끝 세로 가운데
        t.textAt = function(text, x, y, size, anchor, opts) {
            var frame = t.text(text, x, y, size, "center", opts);
            var ink = formInkBounds(frame), cx = (ink[0] + ink[2]) / 2, cy = (ink[1] + ink[3]) / 2;
            if (anchor === "below") frame.translate(x - cx, y - ink[1]);
            else if (anchor === "above") frame.translate(x - cx, y - ink[3]);
            else if (anchor === "left") frame.translate(x - ink[2], y - cy);
            else frame.translate(x - ink[0], y - cy);
            return frame;
        };
        // 지금까지 그린 글자의 윤곽 상자 [왼쪽, 아래, 오른쪽, 위]
        function inkBoxes() {
            var boxes = [];
            for (var i = 0; i < frames.length; i++) {
                var ink = formInkBounds(frames[i]);
                boxes.push([ink[0], ink[3], ink[2], ink[1]]);
            }
            return boxes;
        }
        // 축 범례(그림 제작 규칙)는 눈금 숫자와 다른 글자를 모두 그린 뒤에 부른다.
        // X 범례: (x, axisY)는 축선 위의 점. align "right"면 x가 글자 윤곽의 오른쪽 끝(화살촉 있는 축의 끝), "center"면 가운데.
        //   윤곽 윗변이 축선에서 1mm 아래에 놓이고, 다른 글자와 겹치면 그 글자 아래 1mm로 내려간다
        t.axisLegendX = function(text, size, axisY, x, align, opts) {
            var boxes = inkBoxes();
            var frame = t.text(text, 0, 0, size, "center", opts);
            var ink = formInkBounds(frame), w = ink[2] - ink[0], h = ink[1] - ink[3];
            var x1 = align === "right" ? x : x + w / 2, x0 = x1 - w;
            var top = legendTop(axisY, x0, x1, h, LEGEND_GAP_MM * FORM_MM, boxes);
            frame.translate(x0 - ink[0], top - ink[1]);
            return frame;
        };
        // Y 범례: 글자를 곧게 세워 위→아래로 한 글자씩 쌓는다(글상자 하나, 줄은 \r). (axisX, y)는 축선 위의 점.
        //   align "top"이면 y가 글자 윤곽의 윗끝(화살촉 있는 축의 끝), "center"면 쌓은 글자 전체의 가운데.
        //   윤곽 오른쪽 끝이 축선에서 왼쪽 1mm에 놓이고, 다른 글자와 겹치면 그 글자 왼쪽 1mm로 옮겨진다
        t.axisLegendY = function(text, size, axisX, y, align) {
            var rows = legendRows(text);
            if (rows.length === 0) return null;
            var boxes = inkBoxes();
            var frame = t.text(rows.join("\r"), 0, 0, size, "center", {stack: true});
            var ink = formInkBounds(frame), w = ink[2] - ink[0], h = ink[1] - ink[3];
            var y1 = align === "top" ? y : y + h / 2, y0 = y1 - h;
            var right = legendRight(axisX, y0, y1, w, LEGEND_GAP_MM * FORM_MM, boxes);
            frame.translate(right - ink[2], y1 - ink[1]);
            return frame;
        };
        return t;
    }

    // 축 범례 배치 규칙(웹 generators/axis-legend.js와 같다). 사각형은 [왼쪽, 아래, 오른쪽, 위], y 위쪽 +
    // 세로 범례의 줄: 글자 하나씩(공백도 한 줄)
    function legendRows(text) {
        var rows = [], s = String(text);
        for (var i = 0; i < s.length; i++) rows.push(s.charAt(i));
        return rows;
    }

    // X 범례 윗변의 y. 축선 아래 gap에서 시작해, gap만큼 넓힌 글자 상자와 겹치면 그 글자 아래 gap으로 내린다
    function legendTop(axisY, x0, x1, h, gap, boxes) {
        var top = axisY - gap;
        for (var i = 0; i < 64; i++) {
            var hit = null;
            for (var k = 0; k < boxes.length; k++) {
                var b = boxes[k];
                if (b[2] + gap > x0 && b[0] - gap < x1 && top > b[1] - gap && top - h < b[3] + gap) { hit = b; break; }
            }
            if (!hit) break;
            top = hit[1] - gap;
        }
        return top;
    }

    // Y 범례 오른쪽 끝의 x. 축선 왼쪽 gap에서 시작해, gap만큼 넓힌 글자 상자와 겹치면 그 글자 왼쪽 gap으로 옮긴다
    function legendRight(axisX, y0, y1, w, gap, boxes) {
        var right = axisX - gap;
        for (var i = 0; i < 64; i++) {
            var hit = null;
            for (var k = 0; k < boxes.length; k++) {
                var b = boxes[k];
                if (b[3] + gap > y0 && b[1] - gap < y1 && right > b[0] - gap && right - w < b[2] + gap) { hit = b; break; }
            }
            if (!hit) break;
            right = hit[0] - gap;
        }
        return right;
    }

    function formFormat(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    // 글자 윤곽의 경계: 복사본을 윤곽선으로 바꿔 재고 지운다. 실패하면 글상자 경계를 쓴다
    function formInkBounds(frame) {
        var copy = null, outlined = null;
        try {
            copy = frame.duplicate();
            outlined = copy.createOutline();
            copy = null;   // 윤곽선으로 바뀌어 복제본은 없어졌다
            var b = outlined.geometricBounds;
            return [b[0], b[1], b[2], b[3]];
        } catch (e) {
            var f = frame.geometricBounds;
            return [f[0], f[1], f[2], f[3]];
        } finally {
            // 실패해도 잰 복제본·윤곽선을 남기지 않는다(남으면 글자가 겹쳐 보인다)
            try { if (outlined) outlined.remove(); } catch (e2) {}
            try { if (copy) copy.remove(); } catch (e3) {}
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

    // 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt), GSMediumB1에 없는 기호(θ)는 HancomEQN — 07_문자/한글·영문 서체 적용.jsx 규칙.
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
