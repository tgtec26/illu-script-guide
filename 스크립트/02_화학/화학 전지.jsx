// 화학 전지.jsx
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

// 화학 전지: 화학Ⅱ(·Ⅰ) 기출에 가장 흔한 '염다리로 이은 두 비커 전지'(전극, 수용액, 염다리, 도선, 전구 또는 전압계)를 그린다. 선택 없이 화면 가운데에 만든다.
//   비커 크기·간격·수용액 높이를 정하고, 전극 이름(A, B)·수용액 글자('1 M A^2+(aq)'처럼 ^ 뒤의 전하는 위 첨자)·염다리 글자를 넣는다.
//   도선 가운데에 전구(⊗) 또는 전압계(V)를 넣고, 전자 이동 화살표(e⁻)의 방향을 '왼쪽 전극 → 오른쪽 전극' 또는 반대로 정한다.
//   화살촉은 측정한 일러스트레이터 화살촉 4종 중에서 고르고(기본 작살형) 크기를 %로 정한다.
// 선 두께는 비커·전극·염다리 0.7pt, 도선·화살표 0.5pt이고 '선 두께' 패널에서 고친다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
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
    var HEAD_EXAM_LENGTH_PT = 4.84;  // 크기 100%일 때 작살형의 길이(pt) = 일러스트레이터 100%(12.1 × 선 0.4pt, 그림 제작 규칙 4.7). 다른 모양도 같은 배율로 그린다

    // ==== 화학 전지 ====
    var DEVICE_ITEMS = ["전구 (⊗)", "전압계 (V)", "없음 (도선만)"];
    var FLOW_ITEMS = ["왼쪽 전극 → 오른쪽 전극", "오른쪽 전극 → 왼쪽 전극"];

    // 목록·표가 다 정해진 뒤에 창을 띄운다. 창은 runFormHost 안에서 닫힐 때까지 떠 있어서, 이 줄보다 아래의 var는 그동안 undefined다
    runFormHost("화학 전지", [makeCellEngine()], "GalvanicCell/tab");

    function makeCellEngine() {
        return makeFormEngine({
            label: "화학 전지", name: "GalvanicCell", prefKey: "GalvanicCell/settings",
            controls: [
                {panel: "비커"},
                {key: "beakerW", label: "비커 너비", unit: "mm", min: 14, max: 40, step: 0.5, value: 22},
                {key: "beakerH", label: "비커 높이", unit: "mm", min: 14, max: 40, step: 0.5, value: 24},
                {key: "gap", label: "비커 사이 간격", unit: "mm", min: 8, max: 40, step: 0.5, value: 16},
                {key: "level", label: "수용액 높이", unit: "%", min: 30, max: 95, step: 1, value: 70},
                {key: "shade", label: "수용액 음영", unit: "%", min: 0, max: 40, step: 1, value: 10},
                {panel: "장치"},
                {key: "device", label: "도선 가운데", items: DEVICE_ITEMS, value: 0},
                {key: "flow", label: "전자 이동", items: FLOW_ITEMS, value: 0},
                {key: "showFlow", check: "전자 이동 화살표", value: true},
                {key: "showBridge", check: "염다리 글자", value: true},
                {panel: "글자"},
                {key: "leftName", label: "왼쪽 전극", text: true, value: "A"},
                {key: "rightName", label: "오른쪽 전극", text: true, value: "B"},
                {key: "leftSol", label: "왼쪽 수용액", text: true, value: "1 M A^2+(aq)"},
                {key: "rightSol", label: "오른쪽 수용액", text: true, value: "1 M B^2+(aq)"},
                {key: "bridgeName", label: "염다리 글자", text: true, value: "염다리"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8},
                {panel: "화살촉"},
                {key: "headShape", label: "화살촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3},
                {key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100}
            ],
            draw: drawCell
        });
    }

    // '1 M A^2+(aq)'처럼 ^ 뒤의 숫자·부호(전하)를 위 첨자로 쓴 글자. ^는 글자에서 빠진다
    function supText(t, text, x, y, size, align, opts) {
        var plain = "", marks = [], i = 0, ch, k;
        while (i < text.length) {
            ch = text.charAt(i);
            if (ch === "^") {
                i++;
                while (i < text.length && "0123456789+-−".indexOf(text.charAt(i)) >= 0) { marks.push(plain.length); plain += text.charAt(i); i++; }
            } else { plain += ch; i++; }
        }
        var frame = t.text(plain, x, y, size, align, opts);
        try {
            for (k = 0; k < marks.length; k++) frame.textRange.characters[marks[k]].characterAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
        } catch (e) {}
        return frame;
    }

    // 좌표는 pt(y 위쪽 +). 두 비커 가운데 위쪽 가장자리의 가운데가 (0, 0). 비커 윗면 y = 0, 바닥 y = -높이
    function drawCell(t, o) {
        var m = t.mm, size = o.font, bw = o.beakerW * m, bh = o.beakerH * m, gap = o.gap * m, i;
        var lefts = [-gap / 2 - bw, gap / 2], names = [o.leftName, o.rightName], sols = [o.leftSol, o.rightSol];
        var liquidTop = -bh * (1 - o.level / 100);
        var plateW = 2.6 * m, stick = 11 * m, plateBottom = -bh * 0.88;
        var wireY = stick + 8 * m, tw = 2.4 * m, bridgeTop = 6 * m;
        var elX = [], bridgeX = [];
        for (i = 0; i < 2; i++) {
            var left = lefts[i], right = left + bw;
            // 수용액(음영 칠) → 비커(윗면이 열린 U자)
            if (o.shade > 0) t.rect(left, liquidTop, right, -bh, o.shade, null, 0);
            t.path([[left, 0], [left, -bh], [right, -bh], [right, 0]], false, null, 100, o.wBody);
            // 전극 판: 비커 바깥쪽 1/4 지점, 윗부분이 비커 위로 나온다
            var ex = i === 0 ? left + bw * 0.27 : right - bw * 0.27;
            elX.push(ex);
            t.rect(ex - plateW / 2, stick, ex + plateW / 2, plateBottom, 45, 100, o.wBody);
            if (names[i] !== "") t.textAt(names[i], ex - plateW / 2 - 1.2 * m, stick - 4 * m, size, "left");
            if (sols[i] !== "") supText(t, sols[i], (left + right) / 2, -bh - 3.2 * m, size, "center");
            bridgeX.push(i === 0 ? right - bw * 0.27 : left + bw * 0.27);
        }
        // 염다리: 두 비커 안쪽 1/4 지점에 다리를 꽂은 U자 관(속은 음영)
        var x1 = bridgeX[0], x2 = bridgeX[1], yb = -bh * 0.55, h = tw / 2;
        t.path([[x1 - h, yb], [x1 - h, bridgeTop], [x2 + h, bridgeTop], [x2 + h, yb], [x2 - h, yb], [x2 - h, bridgeTop - tw], [x1 + h, bridgeTop - tw], [x1 + h, yb]], true, 20, 100, o.wBody);
        if (o.showBridge && o.bridgeName !== "") t.text(o.bridgeName, 0, bridgeTop + size * 0.9, size, "center");
        // 도선: 왼쪽 전극 위 → 가운데 장치 → 오른쪽 전극 위
        var r = 3.2 * m, devLeft = -r, devRight = r;
        if (o.device === 2) { devLeft = 0; devRight = 0; }
        t.path([[elX[0], stick], [elX[0], wireY], [devLeft, wireY]], false, null, 100, o.wRope);
        t.path([[devRight, wireY], [elX[1], wireY], [elX[1], stick]], false, null, 100, o.wRope);
        if (o.device === 0) {
            t.circle(0, wireY, r, o.wRope);
            var d = r * 0.7071;
            t.line([-d, wireY - d], [d, wireY + d], o.wRope);
            t.line([-d, wireY + d], [d, wireY - d], o.wRope);
        } else if (o.device === 1) {
            t.circle(0, wireY, r, o.wRope);
            t.text("V", 0, wireY, size, "center");
        }
        // 전자 이동 화살표: 도선 위 가운데 근처, 방향은 선택대로
        if (o.showFlow) {
            var seg = (elX[1] - elX[0]) / 2 - r, len = Math.min(7 * m, seg * 0.7), cx = o.flow === 0 ? elX[0] + (elX[1] - elX[0]) * 0.22 : elX[1] - (elX[1] - elX[0]) * 0.22;
            var from = o.flow === 0 ? cx - len / 2 : cx + len / 2, to = o.flow === 0 ? cx + len / 2 : cx - len / 2;
            t.arrow([from, wireY + 2.2 * m], [to, wireY + 2.2 * m], o.wRope);
            supText(t, "e^-", cx, wireY + 2.2 * m + size * 1.1, size, "center", {italic: true});
        }
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
    // '선 두께' 패널(wBody 비커·전극·염다리, wRope 도선·화살표)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "비커·전극·염다리", unit: "pt", min: 0.1, max: 3, step: 0.1, value: 0.7},
            {key: "wRope", label: "도선·화살표", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.5},
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
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "GalvanicCell/" + spec.name + "/" + ctl.panel);
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

        // 선택지가 적고 짧으면 드롭다운 대신 한 줄 라디오 (클릭 1번)
        function addRadioChoice(parent, items) {
            var g = parent.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 12;
            g.radios = [];
            g.index = 0;
            for (var i = 0; i < items.length; i++) {
                var r = g.add("radiobutton", undefined, items[i]);
                r.onClick = (function(k) { return function() { g.index = k; if (g.onChange) g.onChange(); }; })(i);
                g.radios.push(r);
            }
            return g;
        }

        function setRadioChoice(g, n) {
            g.index = n;
            for (var i = 0; i < g.radios.length; i++) g.radios[i].value = (i === n);
        }

        // 항목 3개 이하, 글자 수 합 22 이하, 가장 긴 라벨 14자 이하면 라디오
        function choiceFitsRadio(items) {
            var total = 0;
            for (var i = 0; i < items.length; i++) {
                if (String(items[i]).length > 14) return false;
                total += String(items[i]).length;
            }
            return items.length <= 3 && total <= 22;
        }

        function addChoice(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            // order: 목록에 보이는 순서 → 값 번호 (화살촉 모양은 1 작살형, 2 제비꼬리, 3 삼각형, 4 꺾쇠 순으로 보인다)
            var order = ctl.order || null, shown = [], pos = o[ctl.key], k;
            for (k = 0; k < ctl.items.length; k++) shown.push(order ? ctl.items[order[k]] : ctl.items[k]);
            if (order) for (k = 0; k < order.length; k++) if (order[k] === o[ctl.key]) pos = k;
            var useRadio = choiceFitsRadio(shown);
            var list = useRadio ? addRadioChoice(row, shown) : row.add("dropdownlist", undefined, shown);
            if (useRadio) setRadioChoice(list, pos);
            else {
                list.maximumSize.width = 230;
                list.selection = pos;
            }
            ui[ctl.key] = list;
            list.onChange = function() {
                if (useRadio) pos = list.index;
                else {
                    if (list.selection === null) { list.selection = pos; return; }
                    pos = list.selection.index;
                }
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
        // 가운데 (cx, cy), 반지름 r인 윤곽선 원(칠 없음)
        t.circle = function(cx, cy, r, width) {
            var p = g.pathItems.ellipse(cy + r, cx - r, 2 * r, 2 * r);
            formPaint(p, null, 100, width);
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
