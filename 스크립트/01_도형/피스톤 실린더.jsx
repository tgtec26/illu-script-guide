// 피스톤 실린더.jsx
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

// 피스톤 실린더: 기출에 가장 흔한 '피스톤으로 나뉜 가로 실린더'(칸 A·B(·C)에 기체)를 그린다. 선택 없이 화면 가운데에 만든다.
//   피스톤 위치(%)는 슬라이더로 정하고(칸이 셋이면 피스톤 둘), 칸마다 기체 분자 점과 칸 이름(A, B, C)을 넣는다.
//   분자 점은 칸 안에 고르게 퍼지게 놓는다(촘촘한 후보 격자에서 이미 놓은 점과 가장 먼 자리를 차례로 고른다).
//   '단열된 실린더'·'단열된 피스톤' 지시선 글자와 열 Q 화살표(칸 A로 들어옴)를 넣을 수 있다.
//   화살촉은 측정한 일러스트레이터 화살촉 4종 중에서 고르고(기본 작살형) 크기를 %로 정한다.
// 선 두께는 실린더 벽 1pt, 칸막이 테두리 0, 화살표·지시선 0.4pt이고 '선 두께' 패널에서 고친다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 변수(Q)는 GSMediItaC1, GSMediumB1에 없는 기호는 HancomEQN이다.

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
    var HEAD_EXAM_LENGTH_PT = 4;  // 크기 100%일 때 작살형의 길이(pt). 다른 모양도 같은 배율로 그린다

    runFormHost("피스톤 실린더", [makePistonEngine()], "PistonCylinder/tab");

    // ==== 피스톤 실린더 ====
    function makePistonEngine() {
        return makeFormEngine({
            label: "피스톤 실린더", name: "PistonCylinder", prefKey: "PistonCylinder/settings",
            controls: [
                {panel: "실린더"},
                {key: "chambers", label: "칸 수", unit: "개", min: 2, max: 3, step: 1, value: 2},
                {key: "length", label: "실린더 길이", unit: "mm", min: 20, max: 120, step: 1, value: 45},
                {key: "height", label: "실린더 높이", unit: "mm", min: 6, max: 50, step: 1, value: 14},
                {key: "pistonMm", label: "피스톤 두께", unit: "mm", min: 0.5, max: 4, step: 0.1, value: 1.2},
                {panel: "피스톤 위치"},
                {key: "pos1", label: "피스톤 1", unit: "%", min: 5, max: 95, step: 1, value: 50},
                {key: "pos2", label: "피스톤 2 (칸 3개)", unit: "%", min: 5, max: 95, step: 1, value: 75},
                {panel: "기체"},
                {key: "showDots", check: "분자 점", value: true},
                {key: "dots", label: "칸당 점 수", unit: "개", min: 1, max: 30, step: 1, value: 6},
                {key: "dotMm", label: "점 지름", unit: "mm", min: 0.3, max: 2, step: 0.1, value: 0.8},
                {key: "seed", label: "배치 번호", unit: "", min: 1, max: 99, step: 1, value: 1},
                {panel: "글자"},
                {key: "showNames", check: "칸 이름", value: true},
                {key: "chamberNames", label: "칸 이름", text: true, value: "A, B, C"},
                {key: "cylLabel", label: "실린더 지시선", text: true, value: "단열된 실린더"},
                {key: "pistLabel", label: "피스톤 지시선", text: true, value: "단열된 피스톤"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8},
                {panel: "열 Q 화살표 (칸 A로 들어옴)"},
                {key: "heat", check: "열 Q 화살표", value: false},
                {key: "arrowMm", label: "화살표 길이", unit: "mm", min: 3, max: 20, step: 0.5, value: 8},
                {key: "headShape", label: "화살촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3},
                {key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100}
            ],
            draw: drawPiston
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

    // 피스톤 위치(%)를 칸 수 − 1개로: 5~95로 막고 앞 피스톤보다 8% 이상 오른쪽에 둔다
    function clampPositions(values, chambers) {
        var out = [];
        for (var i = 0; i < chambers - 1; i++) {
            var v = Math.max(5, Math.min(95, values[i]));
            if (i > 0 && v < out[i - 1] + 8) v = Math.min(95, out[i - 1] + 8);
            out.push(v);
        }
        return out;
    }

    // 같은 번호에 같은 수를 돌려주는 간단한 난수 (0 이상 1 미만)
    function seededRandom(seed) {
        var state = seed * 9301 + 49297;
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
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

    // 직사각형 [left, right] × [bottom, top] 안에 점 count개를 고르게 놓는다: 촘촘한 후보 격자(조금씩 흔든다)에서 이미 놓은 점과 가장 먼 후보를 차례로 고른다.
    // avoid는 비워 둘 가운데 영역 {x, y, rx, ry}(없으면 null). 첫 점과 흔들림이 난수로 정해져 번호마다 모양이 달라진다
    function spreadDots(random, left, right, bottom, top, count, avoid) {
        var area = (right - left) * (top - bottom), step = Math.sqrt(area / (count * 8)), candidates = [], x, y, i, j;
        if (!(step > 0)) return [];
        for (x = left + step / 2; x < right; x += step) {
            for (y = bottom + step / 2; y < top; y += step) {
                var px = x + (random() - 0.5) * step * 0.7, py = y + (random() - 0.5) * step * 0.7;
                px = Math.max(left, Math.min(right, px));
                py = Math.max(bottom, Math.min(top, py));
                if (avoid !== null && Math.abs(px - avoid.x) < avoid.rx && Math.abs(py - avoid.y) < avoid.ry) continue;
                candidates.push([px, py]);
            }
        }
        if (candidates.length === 0) return [];
        var chosen = [candidates.splice(Math.floor(random() * candidates.length), 1)[0]];
        while (chosen.length < count && candidates.length > 0) {
            var best = 0, bestDist = -1;
            for (i = 0; i < candidates.length; i++) {
                var near = 1e18;
                for (j = 0; j < chosen.length; j++) {
                    var d = Math.pow(candidates[i][0] - chosen[j][0], 2) + Math.pow(candidates[i][1] - chosen[j][1], 2);
                    if (d < near) near = d;
                }
                if (near > bestDist) { bestDist = near; best = i; }
            }
            chosen.push(candidates.splice(best, 1)[0]);
        }
        return chosen;
    }

    // 좌표는 pt(y 위쪽 +). 실린더의 왼쪽 위가 (0, 0).
    function drawPiston(t, o) {
        var m = t.mm, size = o.font, L = o.length * m, H = o.height * m, pw = o.pistonMm * m;
        var names = splitNames(o.chamberNames);
        var top = 0, bottom = -H, mid = -H / 2, i, k;
        var pcts = clampPositions([o.pos1, o.pos2], o.chambers), xs = [];
        for (i = 0; i < pcts.length; i++) xs.push(L * pcts[i] / 100);
        t.rect(0, top, L, bottom, null, 100, o.wBody);
        for (i = 0; i < xs.length; i++) t.rect(xs[i] - pw / 2, top, xs[i] + pw / 2, bottom, 100, o.wObj > 0 ? 100 : null, o.wObj);
        // 칸: 왼쪽 벽·피스톤·오른쪽 벽 사이
        for (i = 0; i < o.chambers; i++) {
            var left = i === 0 ? 0 : xs[i - 1] + pw / 2, right = i === o.chambers - 1 ? L : xs[i] - pw / 2;
            var cx = (left + right) / 2;
            if (o.showNames && i < names.length && names[i] !== "") t.text(names[i], cx, mid, size, "center");
            if (o.showDots) {
                var r = o.dotMm * m / 2, pad = r * 1.6 + o.wBody * 0.5, labelRoom = size * 0.9;
                var avoid = o.showNames ? {x: cx, y: mid, rx: labelRoom, ry: labelRoom * 0.8} : null;
                var dots = spreadDots(seededRandom(o.seed + i * 13), left + pad, right - pad, bottom + pad, top - pad, o.dots, avoid);
                for (k = 0; k < dots.length; k++) t.dot(dots[k][0], dots[k][1], r, 100);
            }
        }
        // 열 Q: 왼쪽 벽 바깥에서 칸 A로 들어오는 화살표와 글자
        if (o.heat) {
            var armLen = o.arrowMm * m;
            t.arrow([-armLen, mid], [0, mid], o.wRope);
            t.textAt("Q", -armLen - 1 * m, mid, size, "left", {italic: true});
        }
        // 지시선 글자: 실린더 위로 띄우고 지시선을 벽·피스톤 윗변까지 긋는다. 실린더 글자는 피스톤 지시선과 겹치지 않게 왼쪽으로 비킨다
        var labelY = 7 * m;
        function callout(text, x, raise) {
            if (text === "") return;
            var y = labelY + raise;
            t.text(text, x, y, size, "center");
            t.line([x, y - size * 0.5 - 0.8 * m], [x, 0], o.wRope);
        }
        var cylHalf = o.cylLabel.length * size * 0.45, pistHalf = o.pistLabel.length * size * 0.45, cylX = L * 0.2;
        cylX = Math.max(3 * m, Math.min(cylX, xs[0] - cylHalf - 1 * m));
        var overlap = Math.abs(xs[0] - cylX) < cylHalf + pistHalf;
        callout(o.cylLabel, cylX, 0);
        callout(o.pistLabel, xs[0], overlap ? size * 1.8 : 0);
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
    // '선 두께' 패널(wBody 실린더 벽, wObj 칸막이 테두리, wRope 화살표·지시선)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "실린더 벽", unit: "pt", min: 0.1, max: 3, step: 0.1, value: 1},
            {key: "wObj", label: "칸막이 테두리", unit: "pt", min: 0, max: 2, step: 0.1, value: 0},
            {key: "wRope", label: "화살표·지시선", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
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
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "PistonCylinder/" + spec.name + "/" + ctl.panel);
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
