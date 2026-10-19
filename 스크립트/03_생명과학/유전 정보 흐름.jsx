// 유전 정보 흐름.jsx
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

// 유전 정보 흐름: 기출에 흔한 [DNA] →(나) [㉠] →(다) [㉡] 그림과 DNA 상자 왼쪽을 도는 복제 고리 (가)를 그린다.
//   (가) DNA 복제, (나) 전사, (다) 번역, ㉠ mRNA, ㉡ 단백질. 상자 글자와 과정 글자는 쉼표로 고쳐 쓴다(예: DNA, mRNA, 단백질).
//   고리는 DNA 상자 왼쪽 변 가운데를 중심으로 한 원에서 상자 밖으로 보이는 부분이다. 원이 상자 윗변과 만나는 점에서 출발해
//   왼쪽으로 돌아(약 320°) 아랫변과 만나는 점에서 촉이 상자를 향해 끝난다.
// 선 두께는 상자 테두리 0.3pt, 화살표 0.5pt이고 '선 두께' 패널에서 고친다. 선택 없이 화면 가운데에 그린다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 항목 기호 (가)(나)는 괄호까지 바탕체 1.25배, ㉠ ⓐ ①은 바탕체 1.125배,
// Ⅰ Ⅱ는 KoPubWorld바탕체 Pro다(07_문자/한글·영문 서체 적용.jsx·텍스트 삽입.jsx 규칙).

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_ITALIC_FONT = formFindFont(["GSMediItaC1", "GSMediumB1"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    var FORM_SYMBOL_FONT = formFindFont(["Batang", "BatangOTF", "SpoqaHanSansNeo-Regular"]);
    var FORM_ROMAN_FONT = formFindRomanFont();
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
    // 복제 고리: 원의 중심은 DNA 상자 왼쪽 변 가운데. 원이 윗변과 만나는 각에서 반시계로 아랫변과 만나는 각까지 그린다
    var LOOP_LABEL_DEG = 133;     // (가) 글자가 놓이는 방향
    var LOOP_LABEL_MM = 3;        // 고리 바깥으로 (가) 글자 가운데까지
    var LABEL_GAP_MM = 1.2;       // 화살표와 과정 글자 사이

    runFormHost("유전 정보 흐름", [makeDogmaEngine(), makeExpressionEngine()], "CentralDogma/tab");

    // ==== 중심 원리 ====
    function makeDogmaEngine() {
        return makeFormEngine({
            label: "중심 원리", name: "CentralDogma", prefKey: "CentralDogma/settings", settingsTag: "v2",
            controls: [
                {panel: "모양"},
                {key: "boxW", label: "상자 너비", unit: "mm", min: 5, max: 40, step: 0.5, value: 11},
                {key: "boxH", label: "상자 높이", unit: "mm", min: 3, max: 15, step: 0.5, value: 4.5},
                {key: "arrowLen", label: "화살표 길이", unit: "mm", min: 3, max: 40, step: 0.5, value: 7},
                {key: "gap", label: "상자와 화살표 간격", unit: "mm", min: 0, max: 5, step: 0.1, value: 1.2},
                {key: "boxK", label: "상자 회색", unit: "K", min: 0, max: 40, step: 5, value: 10},
                {key: "loopR", label: "고리 반지름", unit: "mm", min: 3, max: 20, step: 0.1, value: 6},
                {key: "showLoop", check: "DNA 복제 고리 (가)", value: true},
                {key: "headShape", label: "화살촉 모양", items: HEAD_SHAPES, order: [3, 2, 0, 1], value: 3},
                {key: "headSize", label: "화살촉 크기", unit: "%", min: 30, max: 300, step: 5, value: 100},
                {panel: "글자"},
                {key: "boxes", label: "상자", text: true, value: "DNA, ㉠, ㉡", tip: "쉼표로 구분한 세 상자의 글자. 예: DNA, mRNA, 단백질"},
                {key: "steps", label: "과정", text: true, value: "(가), (나), (다)", tip: "쉼표로 구분: 복제 고리, 첫째 화살표, 둘째 화살표. 예: 복제, 전사, 번역"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            lineWidths: [
                {key: "wBox", label: "상자 테두리", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.3},
                {key: "wArrow", label: "화살표", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.5}
            ],
            draw: drawDogma
        });
    }

    // "a, b, c" → ["a", "b", "c"] (앞뒤 공백 없앰, 모자라면 빈 글)
    function splitNames(text, count) {
        var parts = String(text).split(","), out = [];
        for (var i = 0; i < count; i++) out.push(i < parts.length ? parts[i].replace(/^\s+|\s+$/g, "") : "");
        return out;
    }

    // 그림의 좌표(pt). 첫 상자 왼쪽 아래가 원점. 상자 3개, 사이 화살표 2개, 복제 고리(원호)
    function dogmaLayout(o, m) {
        var w = o.boxW * m, h = o.boxH * m, gap = o.gap * m, len = o.arrowLen * m, pitch = w + 2 * gap + len;
        var boxes = [], arrows = [], i;
        for (i = 0; i < 3; i++) boxes.push({left: i * pitch, bottom: 0, width: w, height: h, cx: i * pitch + w / 2, cy: h / 2});
        for (i = 0; i < 2; i++) arrows.push({from: [i * pitch + w + gap, h / 2], to: [(i + 1) * pitch - gap, h / 2]});
        // 원이 윗변(y = h)과 만나는 각. 반지름이 상자 높이의 절반보다 작으면 윗변에 닿지 않으므로 90°(왼쪽 반원)
        var r = o.loopR * m, meet = Math.asin(Math.min(1, h / 2 / r)) * 180 / Math.PI, labelR = r + LOOP_LABEL_MM * m;
        var loop = {cx: 0, cy: h / 2, r: r, start: meet, end: 360 - meet,
            label: [Math.cos(LOOP_LABEL_DEG * Math.PI / 180) * labelR, h / 2 + Math.sin(LOOP_LABEL_DEG * Math.PI / 180) * labelR]};
        return {boxes: boxes, arrows: arrows, loop: loop};
    }

    // 원호(중심 cx, cy, 반지름 r, a0°→a1°, 반시계)를 90° 이하 조각으로 나눈 베지어 점 {a, l, r}
    function arcAnchors(cx, cy, r, a0, a1) {
        var sweep = a1 - a0, n = Math.max(1, Math.ceil(Math.abs(sweep) / 90)), step = sweep / n * Math.PI / 180;
        var k = 4 / 3 * Math.tan(step / 4), points = [];
        for (var i = 0; i <= n; i++) {
            var t = a0 * Math.PI / 180 + i * step, c = Math.cos(t), s = Math.sin(t);
            var p = [cx + r * c, cy + r * s], tx = -s * r * k, ty = c * r * k;
            points.push({a: p, l: [p[0] - tx, p[1] - ty], r: [p[0] + tx, p[1] + ty], smooth: true});
        }
        // 양 끝은 한쪽 핸들만 있는 끝점이다
        points[0].l = points[0].a;
        points[0].smooth = false;
        points[n].r = points[n].a;
        points[n].smooth = false;
        return points;
    }

    function drawDogma(t, o) {
        var m = t.mm, size = o.font, L = dogmaLayout(o, m), i;
        var boxes = splitNames(o.boxes, 3), steps = splitNames(o.steps, 3);
        for (i = 0; i < 3; i++) {
            var b = L.boxes[i];
            t.path([[b.left, b.bottom], [b.left + b.width, b.bottom], [b.left + b.width, b.bottom + b.height], [b.left, b.bottom + b.height]],
                true, o.boxK, 100, o.wBox);
            if (boxes[i] !== "") t.textInk(boxes[i], b.cx, b.cy, size);
        }
        for (i = 0; i < 2; i++) {
            var a = L.arrows[i];
            t.arrow(a.from, a.to, o.wArrow);
            if (steps[i + 1] !== "") t.textAt(steps[i + 1], (a.from[0] + a.to[0]) / 2, a.from[1] + LABEL_GAP_MM * m, size, "above");
        }
        if (o.showLoop) {
            var c = L.loop, back = t.headBack();
            // 선은 촉 속에서 끝나도록 끝 각을 촉 뒤 길이만큼 당긴다. 촉은 원호 끝에서 반시계 접선 방향
            var endLine = c.end - back / c.r * 180 / Math.PI, endRad = c.end * Math.PI / 180;
            t.curve(arcAnchors(c.cx, c.cy, c.r, c.start, endLine), false, null, 100, o.wArrow);
            t.head([c.cx + c.r * Math.cos(endRad), c.cy + c.r * Math.sin(endRad)], [-Math.sin(endRad), Math.cos(endRad)]);
            if (steps[0] !== "") t.textInk(steps[0], c.label[0], c.label[1], size);
        }
    }

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
    // spec: label(탭 이름), name(그룹 이름), prefKey, settingsTag(저장 형식 태그, 기본 v1), controls[], lineWidths[], draw(tools, o)
    // 컨트롤: {panel: "제목", fold: true} 새 패널(fold면 기본으로 접힘) / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운 /
    //         {key, label, text: true, value: "글", tip: "툴팁"} 글 입력
    // '선 두께' 패널(spec.lineWidths의 행)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([{panel: "선 두께", fold: true}], spec.lineWidths, [
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
                        panel = makeCollapsiblePanel(page, ctl.panel, true, spec.name + "/" + ctl.panel);
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
            if (ctl.tip) input.helpTip = ctl.tip;
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
            var parts = [spec.settingsTag || "v1"];
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
            if (p[0] !== (spec.settingsTag || "v1") || p.length !== keyed.length + 1) return;
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
        // 글자 윤곽 기준: anchor "below"면 (x, y)가 글자 윤곽의 위 가운데, "above"면 아래 가운데, "right"면 윤곽의 왼쪽 끝 세로 가운데, "left"면 윤곽의 오른쪽 끝 세로 가운데
        t.textAt = function(text, x, y, size, anchor, opts) {
            var frame = t.text(text, x, y, size, "center", opts);
            var ink = formInkBounds(frame), cx = (ink[0] + ink[2]) / 2, cy = (ink[1] + ink[3]) / 2;
            if (anchor === "below") frame.translate(x - cx, y - ink[1]);
            else if (anchor === "above") frame.translate(x - cx, y - ink[3]);
            else if (anchor === "left") frame.translate(x - ink[2], y - cy);
            else frame.translate(x - ink[0], y - cy);
            return frame;
        };
        // (x, y)가 글자 윤곽의 가운데 (상자 안 글자처럼 위아래 여백을 맞출 때)
        t.textInk = function(text, x, y, size, opts) {
            var frame = t.text(text, x, y, size, "center", opts);
            var ink = formInkBounds(frame);
            frame.translate(x - (ink[0] + ink[2]) / 2, y - (ink[1] + ink[3]) / 2);
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
    // 항목 기호 (가)(나)는 한글이어도 기호로 보고 괄호까지 바탕체 1.25배(8pt → 10pt), 원문자 ㉠ ⓐ ①은 바탕체 1.125배(8pt → 9pt),
    // 로마 숫자 Ⅰ Ⅱ는 KoPubWorld바탕체 Pro로 쓴다(서체 적용·텍스트 삽입·세포 등과 같은 규칙)
    // opts.italic이면 영문 글자를 변수 서체(GSMediItaC1)로, opts.sub이면 글자 뒤 숫자를 아래 첨자로 쓴다
    function formFonts(frame, opts) {
        var text = frame.contents, range = frame.textRange, italic = opts && opts.italic, sub = opts && opts.sub;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = range.characters[i].characterAttributes;
            var kind = formSymbolKind(text, i);
            if (kind === "bracket" || kind === "circle") {
                attributes.textFont = FORM_SYMBOL_FONT;
                attributes.baselineShift = 0;
                attributes.size = attributes.size * (kind === "bracket" ? 1.25 : 1.125);
            } else if (kind === "roman") {
                attributes.textFont = FORM_ROMAN_FONT;
                attributes.baselineShift = 0;
            } else if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
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

    // i번째 글자의 기호 종류: "bracket" (가)처럼 괄호 안 한글 한 글자의 세 글자, "circle" ㉠ ⓐ Ⓐ ① ⓪, "roman" Ⅰ ⅰ, 아니면 null
    function formSymbolKind(text, i) {
        for (var start = i - 2; start <= i; start++) {
            if (start < 0 || start + 2 >= text.length) continue;
            var inner = text.charCodeAt(start + 1);
            if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return "bracket";
        }
        var code = text.charCodeAt(i);
        if ((code >= 0x3260 && code <= 0x327F) || (code >= 0x24B6 && code <= 0x24E9) || (code >= 0x2460 && code <= 0x2473) || code === 0x24EA) return "circle";
        if (code >= 0x2160 && code <= 0x217F) return "roman";
        return null;
    }

    // 로마 숫자 서체: 텍스트 삽입.jsx와 같은 후보 이름 → 서체 정보(KoPub·바탕·Pro) → 바탕체
    function formFindRomanFont() {
        var names = ["KoPubWorld바탕체_Pro", "KoPubWorld Batang Pro", "KoPubWorldBatangPro", "KoPubWorldBatang_Pro",
            "KoPubWorldBatangPM", "KoPubWorldBatangPL", "KoPubWorldBatangPB", "KoPubWorldBatangPro-Regular", "KoPubWorldBatangPro-Medium", "KoPubWorldBatangMedium"];
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        for (var j = 0; j < app.textFonts.length; j++) {
            var all = "";
            try { all = (String(app.textFonts[j].name) + " " + String(app.textFonts[j].family) + " " + String(app.textFonts[j].style)).toLowerCase(); } catch (e2) {}
            if ((all.indexOf("kopub") >= 0 || all.indexOf("코펍") >= 0) && (all.indexOf("batang") >= 0 || all.indexOf("바탕") >= 0) &&
                (all.indexOf("pro") >= 0 || /kopubworldbatangp[mlb]/.test(all))) return app.textFonts[j];
        }
        return formFindFont(["Batang", "BatangOTF", "SpoqaHanSansNeo-Regular"]);
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

    // ==== 유전자 발현 ====
    // 아미노산 서열 → 코돈 → DNA·RNA·단백질 그림(DNA 모형.jsx의 염기 서열 탭에서 옮겨 옴. 저장 키 ObjectDnaRnaSequence/settings는 그대로).
    function makeExpressionEngine() {
        var api = {label: "유전자 발현", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectDnaRnaSequence/settings";
            var mmToPt = 2.83464567;
            var PREVIEW_NAME = "DnaRnaSequence_Preview";
            var ENG_FONT_NAME = "GSMediumB1";
            var MAX_AMINO = 8;                   // 코돈 행 수(아미노산 최대 개수)
            var BRACE_HEIGHT_MM = 3;             // 코돈 중괄호 높이
            var LABEL_STRAND_GAP_MM = 8.5;       // 줄 이름 칸과 염기 줄 사이
            var LABEL_PROCESS_GAP_MM = 1.5;      // 과정 이름(가)와 왼쪽 화살표 사이
            // 작살형 화살촉(끝이 원점, 뒤쪽이 +y, 선 두께 1pt 기준 pt). 선은 lineEnd만큼 줄인다
            var ARROW_HEAD = {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]};
            var LABELS = ["?",
                String.fromCharCode(0x24D0), String.fromCharCode(0x24D1), String.fromCharCode(0x24D2),   // ⓐⓑⓒ
                String.fromCharCode(0x3260), String.fromCharCode(0x3261), String.fromCharCode(0x3262),   // ㉠㉡㉢
                String.fromCharCode(0x2160), String.fromCharCode(0x2161), String.fromCharCode(0x2162)];  // ⅠⅡⅢ
            var PROTEIN_CHOICES = ["이름"].concat(LABELS);
            var TEMPLATE_CHOICES = ["위 가닥 (DNA 1)", "아래 가닥 (DNA 2)"];
            var NAME_CHOICES = ["한글", "3글자 (Met)"];
            var maskNames = ["DNA 1", "DNA 2", "RNA"];
            var NUMBER_KEYS = ["backboneWidth", "tickWidth", "tickLength", "arrowWidth", "fontSize", "baseGap", "strandGap", "rnaGap", "arrowLength", "offsetX", "offsetY"];
            var NUMBER_MINS = [0.1, 0.1, 0, 0.1, 4, 1, 2, 2, 2, -100, -100];
            var NUMBER_MAXS = [5, 5, 20, 3, 30, 30, 60, 60, 40, 100, 100];
            // 뒤에 덧붙인 숫자(칸 29~31): RNA–중괄호 간격, DNA·RNA 골격 색(K)
            var EXTRA_KEYS = ["braceGap", "dnaColor", "rnaColor"];
            var EXTRA_MINS = [0, 0, 0];
            var EXTRA_MAXS = [20, 100, 100];

            var doc = app.activeDocument;
            var viewCenter = (typeof getScriptStartCenter === "function" ? getScriptStartCenter(doc) : doc.activeView.centerPoint);
            var engFont = findTextFont([ENG_FONT_NAME]);
            var korFont = findTextFont(["SpoqaHanSansNeo-Regular", ENG_FONT_NAME]);
            var symbolFont = findTextFont(["Batang", "BatangOTF", ENG_FONT_NAME]);
            var romanFont = findRomanFont();
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = defaultOptions();
            var options = readSettings();
            var aaList = parseAminoAcids(options.aaText).list;
            var previewGroup = null;
            var previewPending = false;
            var lastPreviewTime = 0;
            var PREVIEW_INTERVAL_MS = 40;
            var committed = false;
            var refreshing = false;

            removeLeftoverGroups();

            var win = page;

            // ---- 아미노산 서열 입력 ----
            var seqRow = win.add("group");
            seqRow.alignChildren = ["left", "center"];
            addCaption(seqRow, "아미노산 서열");
            var seqInput = seqRow.add("edittext", undefined, options.aaText);
            seqInput.preferredSize.width = 220;
            seqInput.helpTip = "1글자(MSG)·3글자(Met Ser Gly)·한글 이름(메싸이오닌)을 공백·쉼표·하이픈으로 나눠 입력. 종결은 Stop 또는 *. 최대 " + MAX_AMINO + "개";
            var seqButton = seqRow.add("button", undefined, "완료");
            seqButton.preferredSize.width = 50;
            seqButton.applyTo = seqInput;   // ui_tab_helper: 이 단추는 이 입력칸을 확정한다
            seqButton.onClick = function() { applyInputs(); };
            seqInput.onChange = function() { applyInputs(); };

            // ---- 코돈 · 단백질 칸 ----
            var codonPanel = win.add("panel", undefined, "코돈 · 단백질 칸");
            codonPanel.alignChildren = "fill";
            codonPanel.spacing = 2;
            codonPanel.margins = [8, 12, 8, 6];
            var codonRows = [];
            for (var r = 0; r < MAX_AMINO; r++) {
                var codonRow = codonPanel.add("group");
                codonRow.alignChildren = ["left", "center"];
                codonRow.spacing = 3;
                var rowCaption = addCaption(codonRow, " ");
                rowCaption.preferredSize.width = 120;
                var codonList = codonRow.add("dropdownlist", undefined, []);
                codonList.preferredSize.width = 70;
                codonList.helpTip = "이 아미노산의 mRNA 코돈";
                var proteinList = codonRow.add("dropdownlist", undefined, PROTEIN_CHOICES);
                proteinList.preferredSize.width = 80;
                proteinList.helpTip = "단백질 줄에 쓸 표시 (이름 / 박스 문자)";
                codonList.onChange = makePickHandler(r, codonList, options.picks);
                proteinList.onChange = makePickHandler(r, proteinList, options.proteins);
                codonRows.push({caption: rowCaption, codons: codonList, protein: proteinList});
            }

            // ---- 구성 ----
            var buildPanel = win.add("panel", undefined, "구성");
            buildPanel.alignChildren = "fill";
            buildPanel.spacing = 2;
            buildPanel.margins = [8, 12, 8, 6];
            var templateRow = buildPanel.add("group");
            templateRow.alignChildren = ["left", "center"];
            addCaption(templateRow, "주형 가닥");
            var templateList = templateRow.add("dropdownlist", undefined, TEMPLATE_CHOICES);
            templateList.selection = options.templateTop ? 0 : 1;
            templateList.helpTip = "RNA를 만드는 쪽. RNA는 주형의 반대 가닥과 같은 서열(U)이 됩니다";
            templateList.onChange = function() {
                if (templateList.selection === null) return;
                options.templateTop = templateList.selection.index === 0;
                updatePreview();
            };
            var nameRow = buildPanel.add("group");
            nameRow.alignChildren = ["left", "center"];
            addCaption(nameRow, "이름 표기");
            var nameList = nameRow.add("dropdownlist", undefined, NAME_CHOICES);
            nameList.selection = options.nameKorean ? 0 : 1;
            nameList.helpTip = "코돈 행과 단백질 칸의 '이름'에 쓸 표기. 한글은 2022 개정 교육과정 유전 부호표 표기";
            nameList.onChange = function() {
                if (nameList.selection === null) return;
                options.nameKorean = nameList.selection.index === 0;
                refreshCodonRows();
                updatePreview();
            };
            var namesRow = buildPanel.add("group");
            namesRow.alignChildren = ["left", "center"];
            var namesCheck = namesRow.add("checkbox", undefined, "줄 이름");
            namesCheck.preferredSize.width = 80;
            namesCheck.value = options.showNames;
            namesCheck.onClick = function() { options.showNames = namesCheck.value; updatePreview(); };
            var namesInput = namesRow.add("edittext", undefined, options.names);
            namesInput.preferredSize.width = 160;
            namesInput.helpTip = "DNA, (DNA→RNA 과정), RNA, (RNA→단백질 과정), 단백질 순서로 쉼표로 나눠 입력 (비우면 그 이름만 생략)";
            namesInput.onChange = function() { applyInputs(); };
            var namesButton = namesRow.add("button", undefined, "완료");
            namesButton.preferredSize.width = 50;
            namesButton.applyTo = namesInput;
            namesButton.onClick = function() { applyInputs(); };
            var belowRow = buildPanel.add("group");
            belowRow.alignChildren = ["left", "center"];
            var braceCheck = belowRow.add("checkbox", undefined, "코돈 중괄호");
            braceCheck.value = options.showBraces;
            braceCheck.onClick = function() { options.showBraces = braceCheck.value; updatePreview(); };
            var arrowCheck = belowRow.add("checkbox", undefined, "화살표");
            arrowCheck.value = options.showArrows;
            arrowCheck.helpTip = "코돈 중괄호 아래 화살표와 왼쪽 줄 이름 사이 화살표";
            arrowCheck.onClick = function() { options.showArrows = arrowCheck.value; updatePreview(); };
            var proteinCheck = belowRow.add("checkbox", undefined, "단백질 줄");
            proteinCheck.value = options.showProtein;
            proteinCheck.onClick = function() { options.showProtein = proteinCheck.value; updatePreview(); };

            // ---- 가릴 서열 ----
            var maskPanel = win.add("panel", undefined, "가릴 염기 번호 · 박스 문자");
            maskPanel.alignChildren = "fill";
            maskPanel.spacing = 2;
            maskPanel.margins = [8, 12, 8, 6];
            var maskInputs = [];
            for (var m = 0; m < 3; m++) {
                var maskRow = maskPanel.add("group");
                maskRow.alignChildren = ["left", "center"];
                maskRow.spacing = 3;
                addCaption(maskRow, maskNames[m]);
                var maskInput = maskRow.add("edittext", undefined, options.masks[m]);
                maskInput.preferredSize.width = 120;
                maskInput.helpTip = "그 줄의 왼쪽부터 센 염기 번호. 예: 1~5, 8~10 (쉼표로 여러 구간). 비우면 가리지 않음";
                maskInput.onChange = function() { applyInputs(); };
                maskInputs.push(maskInput);
                var labelList = maskRow.add("dropdownlist", undefined, LABELS);
                labelList.selection = options.labels[m];
                labelList.helpTip = "박스 안에 쓸 문자";
                labelList.onChange = makePickHandler(m, labelList, options.labels);
                var maskButton = maskRow.add("button", undefined, "완료");
                maskButton.preferredSize.width = 50;
                maskButton.applyTo = maskInput;
                maskButton.onClick = function() { applyInputs(); };
            }

            // ---- 조절 ----
            var linePanel = foldPanel(win, "선 · 글자", true, "line");
            addRow(linePanel, "골격 굵기", "backboneWidth", 0.1, 5, "pt", false);
            addRow(linePanel, "연결선 굵기", "tickWidth", 0.1, 5, "pt", false);
            addRow(linePanel, "연결선 길이", "tickLength", 0, 20, "mm", false);
            addRow(linePanel, "화살표 굵기", "arrowWidth", 0.1, 3, "pt", false);
            addRow(linePanel, "글자 크기", "fontSize", 4, 30, "pt", false);
            addRow(linePanel, "DNA 골격 색", "dnaColor", 0, 100, "K", false);
            addRow(linePanel, "RNA 골격 색", "rnaColor", 0, 100, "K", false);

            var gapPanel = foldPanel(win, "간격", true, "gap");
            addRow(gapPanel, "염기 간격", "baseGap", 1, 30, "mm", false);
            addRow(gapPanel, "DNA 1–2", "strandGap", 2, 60, "mm", false);
            addRow(gapPanel, "DNA 2–RNA", "rnaGap", 2, 60, "mm", false);
            addRow(gapPanel, "RNA–중괄호", "braceGap", 0, 20, "mm", false);
            addRow(gapPanel, "화살표 길이", "arrowLength", 2, 40, "mm", false);

            var positionPanel = win.add("panel", undefined, "위치");
            positionPanel.alignChildren = "fill";
            positionPanel.spacing = 2;
            addRow(positionPanel, "가로", "offsetX", -100, 100, "mm", true);
            addRow(positionPanel, "세로", "offsetY", -100, 100, "mm", true);

            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 380;

            refreshCodonRows();

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(); };
            api.updatePreview = function() { updatePreview(); };
            api.clearPreview = function() { if (!committed) clearPreview(); };
            api.commit = function() {
                var parsedNow = parseAminoAcids(seqInput.text);
                if (parsedNow.error !== null) {
                    status.text = parsedNow.error;
                    return false;
                }
                if (applyInputs(true)) previewPending = true;
                if (aaList.length === 0) {
                    status.text = "아미노산 서열을 입력해주세요.";
                    return false;
                }
                if (previewPending && !updatePreview()) return false;
                if (previewGroup === null && !buildPreview()) return false;
                committed = true;
                previewGroup.name = "DnaRnaSequence";
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function foldPanel(parent, title, collapsed, key) {
                if (typeof makeCollapsiblePanel === "function") return makeCollapsiblePanel(parent, title, collapsed, "DnaSeq/" + key);
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = "fill";
                panel.spacing = 2;
                return panel;
            }

            function addCaption(row, text) {
                var caption = row.add("statictext", undefined, text);
                caption.preferredSize.width = 80;
                return caption;
            }

            // 드롭다운 선택을 values[index]에 쓰고 다시 그린다
            function makePickHandler(index, list, values) {
                return function() {
                    if (refreshing || list.selection === null) return;
                    values[index] = list.selection.index;
                    updatePreview();
                };
            }

            // 입력창 글을 options로 옮기고 아미노산이 바뀌면 코돈 행을 다시 채운다. 바뀐 게 있으면 true
            function applyInputs(quiet) {
                var changed = false;
                var parsed = parseAminoAcids(seqInput.text);
                if (parsed.error !== null) {
                    status.text = parsed.error;
                    return false;
                }
                if (parsed.list.length > MAX_AMINO) {
                    status.text = "아미노산은 " + MAX_AMINO + "개까지 입력할 수 있습니다.";
                    return false;
                }
                if (seqInput.text !== options.aaText) { options.aaText = seqInput.text; changed = true; }
                if (aaList.join(",") !== parsed.list.join(",")) {
                    aaList = parsed.list;
                    refreshCodonRows();
                    changed = true;
                }
                if (namesInput.text !== options.names) { options.names = namesInput.text.replace(/\|/g, ""); changed = true; }
                for (var i = 0; i < 3; i++) {
                    var mask = maskInputs[i].text.replace(/[^0-9~\-–, ]/g, "");
                    if (mask !== options.masks[i]) { options.masks[i] = mask; changed = true; }
                }
                if (changed && quiet !== true) updatePreview();
                return changed;
            }

            // 아미노산 목록에 맞춰 코돈 행의 이름·코돈 목록을 다시 채운다
            function refreshCodonRows() {
                refreshing = true;
                var table = codonTable();
                for (var i = 0; i < MAX_AMINO; i++) {
                    var row = codonRows[i];
                    row.codons.removeAll();
                    if (i < aaList.length) {
                        row.caption.text = (i + 1) + "  " + aminoName(aaList[i], options.nameKorean);
                        var codons = table[aaList[i]];
                        for (var c = 0; c < codons.length; c++) row.codons.add("item", codons[c]);
                        var pick = options.picks[i];
                        row.codons.selection = (pick >= 0 && pick < codons.length) ? pick : 0;
                        row.protein.selection = options.proteins[i];
                        row.codons.enabled = true;
                        row.protein.enabled = true;
                    } else {
                        row.caption.text = " ";
                        row.codons.enabled = false;
                        row.protein.selection = null;
                        row.protein.enabled = false;
                    }
                }
                refreshing = false;
            }

            function addRow(panel, label, key, min, max, unit, positionOnly) {
                var row = panel.add("group");
                row.spacing = 3;
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = 80;
                var step = unit === "K" ? 10 : (unit === "mm" ? 0.1 : (key === "fontSize" ? 0.5 : 0.1));
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 5;
                var slider = row.add("scrollbar", undefined, options[key], min, max);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = 196;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = 34;
                reset.helpTip = "처음 값으로 되돌리기";
                function apply(value, dragging) {
                    value = Math.round(value * 100) / 100;
                    if (!isFinite(value) || value < min || value > max) {
                        input.text = String(options[key]);
                        return;
                    }
                    var previous = options[key];
                    options[key] = value;
                    slider.value = value;
                    input.text = String(value);
                    if (value === previous) {
                        if (!dragging && previewPending) updatePreview();
                        return;
                    }
                    if (positionOnly) {
                        // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
                        try {
                            var delta = (value - previous) * mmToPt;
                            if (previewGroup !== null) {
                                previewGroup.translate(key === "offsetX" ? delta : 0, key === "offsetY" ? delta : 0);
                            }
                            app.redraw();
                        } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
                    } else {
                        updatePreview(dragging);
                    }
                }
                slider.onChanging = function() { apply(slider.value, true); };
                slider.onChange = function() { apply(slider.value); };
                input.onChange = function() {
                    if (!/\S/.test(input.text)) { input.text = String(options[key]); return; }
                    apply(Number(input.text));
                };
                // 입력창에 처음 값을 친 것과 같은 경로로 되돌린다
                reset.onClick = function() {
                    input.text = String(DEFAULTS[key]);
                    input.onChange();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview(dragging) {
                previewPending = true;
                if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
                status.text = " ";
                try {
                    if (!options.preview) {
                        clearPreview();
                    } else if (!buildPreview()) {
                        return false;
                    }
                    previewPending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
                    return false;
                }
            }

            function buildPreview() {
                clearPreview();
                if (aaList.length === 0) {
                    status.text = "아미노산 서열을 입력하고 '완료'를 누르세요.";
                    return false;
                }
                previewGroup = doc.activeLayer.groupItems.add();
                previewGroup.name = PREVIEW_NAME;
                var missing = drawAll(previewGroup);
                previewGroup.translate(options.offsetX * mmToPt, options.offsetY * mmToPt);
                if (missing.length > 0) status.text = missing.join(", ") + ": 가릴 염기 번호를 확인하세요.";
                return true;
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {
                        try { app.redraw(); previewGroup.remove(); } catch (e2) {}
                    }
                    previewGroup = null;
                }
                removeLeftoverGroups();
            }

            function removeLeftoverGroups() {
                try {
                    var groups = doc.activeLayer.groupItems;
                    for (var i = groups.length - 1; i >= 0; i--) {
                        if (groups[i].name === PREVIEW_NAME) {
                            try { groups[i].remove(); } catch (e) {}
                        }
                    }
                } catch (e2) {}
            }

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            // DNA 두 줄·RNA·(코돈 중괄호·화살표·단백질 줄·줄 이름)을 그리고, 번호가 틀린 가릴 줄 이름을 돌려준다
            function drawAll(group) {
                var count = aaList.length;
                var table = codonTable();
                var codons = [];
                for (var a = 0; a < count; a++) {
                    var choices = table[aaList[a]];
                    var pick = options.picks[a];
                    codons.push(choices[(pick >= 0 && pick < choices.length) ? pick : 0]);
                }
                var strands = buildStrands(codons, options.templateTop);
                var seq1 = strands.dna1;
                var seq2 = strands.dna2;
                var rna = strands.rna;
                var fs = options.fontSize;
                var gap = options.baseGap * mmToPt;
                var tick = options.tickLength * mmToPt;
                var letterDrop = tick + fs * 0.65;                    // 골격에서 글자 중심까지
                var boxHalf = fs * 0.7;                               // 글자 줄을 덮는 박스 반높이
                var braces = options.showBraces;
                var arrows = options.showArrows;
                var protein = options.showProtein;
                var names = splitNames(options.names, 5);
                var boxHeight = fs * 1.6;
                var codonWidth = 3 * gap;
                var braceWidth = codonWidth * 0.7;
                var braceDepth = braces ? 2 * Math.min(BRACE_HEIGHT_MM * mmToPt / 2, braceWidth / 4) : 0;
                var arrowLength = options.arrowLength * mmToPt;
                var arrowGap = 0.9 * fs;                              // 줄 이름과 가운데 화살표 끝 사이

                // 줄 이름은 먼저 만들어 폭을 잰 뒤 제자리로 옮긴다
                // DNA·RNA·단백질은 세로선(왼쪽 화살표) 가운데에 맞추고, 과정 이름(가)는 그 선 왼쪽에 둔다
                var labelFrames = [null, null, null, null, null];     // DNA, 과정(DNA→RNA), RNA, 과정(RNA→단백질), 단백질
                var centeredHalf = 0;                                 // 가운데 맞춘 이름의 반폭 최댓값
                var processWidth = 0;
                if (options.showNames) {
                    for (var n = 0; n < 5; n++) {
                        if (names[n] === "" || (!protein && n >= 3)) continue;
                        labelFrames[n] = placeText(group, names[n], 0, 0, null);
                        var nb = labelFrames[n].geometricBounds;
                        if (n === 1 || n === 3) processWidth = Math.max(processWidth, nb[2] - nb[0]);
                        else centeredHalf = Math.max(centeredHalf, (nb[2] - nb[0]) / 2);
                    }
                }
                var hasLabels = centeredHalf > 0 || processWidth > 0;
                var processGap = LABEL_PROCESS_GAP_MM * mmToPt;       // (가)와 세로선 사이
                var leftHalf = Math.max(centeredHalf, processWidth > 0 ? processWidth + processGap : 0);   // 세로선에서 왼쪽 끝까지
                var leftBlock = hasLabels ? leftHalf + centeredHalf + LABEL_STRAND_GAP_MM * mmToPt : 0;
                var width = leftBlock + count * codonWidth;
                var left = viewCenter[0] - width / 2;                 // 그림 왼쪽 끝
                var columnX = left + leftHalf;                        // 왼쪽 화살표를 놓는 세로선
                var x0 = left + leftBlock + gap / 2;                  // 첫 염기 중심

                var rnaLetterOffset = options.strandGap * mmToPt + options.rnaGap * mmToPt + letterDrop;   // y1에서 RNA 글자 중심까지
                var braceTopOffset = rnaLetterOffset + boxHalf + options.braceGap * mmToPt;
                var arrowStartOffset = braceTopOffset + braceDepth;
                var arrowEndOffset = arrowStartOffset + arrowLength;
                var proteinCenterOffset = arrowEndOffset + boxHeight / 2;
                var height = rnaLetterOffset + boxHalf;
                if (protein) height = proteinCenterOffset + boxHeight / 2;
                else if (arrows) height = arrowEndOffset;
                else if (braces) height = arrowStartOffset;
                var y1 = viewCenter[1] + height / 2;                  // DNA 1 골격
                var y2 = y1 - options.strandGap * mmToPt;             // DNA 2 골격
                var y3 = y2 - options.rnaGap * mmToPt;                // RNA 골격
                var rnaLetterY = y3 - letterDrop;
                var black = makeGray(100);
                var dnaColor = makeGray(options.dnaColor);            // 골격선·연결선 색(글자는 항상 검정)
                var rnaColor = makeGray(options.rnaColor);
                var xs = [];
                for (var i = 0; i < count * 3; i++) xs.push(x0 + i * gap);

                drawStrand(group, seq1, xs, y1, -1, dnaColor);
                drawStrand(group, seq2, xs, y2, 1, dnaColor);
                drawStrand(group, rna, xs, y3, -1, rnaColor);

                var missing = [];
                var rows = [y1 - letterDrop, y2 + letterDrop, rnaLetterY];
                for (var k = 0; k < 3; k++) {
                    var ranges = parseBaseRanges(options.masks[k], count * 3);
                    if (ranges === null) continue;
                    if (ranges.error) { missing.push(maskNames[k]); continue; }
                    for (var q = 0; q < ranges.list.length; q++) {
                        drawMask(group, xs, ranges.list[q].from - 1, ranges.list[q].to - ranges.list[q].from + 1, rows[k], LABELS[options.labels[k]]);
                    }
                }

                var proteinY = y1 - proteinCenterOffset;
                if (braces || arrows || protein) {
                    var lineLeft = null;
                    if (hasLabels && labelFrames[4] !== null) {
                        var pb = labelFrames[4].geometricBounds;
                        lineLeft = columnX + (pb[2] - pb[0]) / 2 + 1.5 * mmToPt;
                    }
                    drawBelow(group, xs, gap, count, y1 - braceTopOffset, y1 - arrowStartOffset, y1 - arrowEndOffset, braceWidth, proteinY, boxHeight, lineLeft, black);
                }

                if (hasLabels) {
                    var dnaMid = (y1 + y2) / 2;
                    var centers = [dnaMid, (dnaMid + rnaLetterY) / 2, rnaLetterY, (rnaLetterY + proteinY) / 2, proteinY];
                    for (var l = 0; l < 5; l++) {
                        if (labelFrames[l] === null) continue;
                        var lb = labelFrames[l].geometricBounds;
                        var targetX = (l === 1 || l === 3) ? columnX - processGap - (lb[2] - lb[0]) / 2 : columnX;
                        labelFrames[l].translate(targetX - (lb[0] + lb[2]) / 2, centers[l] - (lb[1] + lb[3]) / 2);
                    }
                    if (arrows) drawArrow(group, columnX, dnaMid - arrowGap, rnaLetterY + arrowGap, options.arrowWidth, black);
                    if (arrows && protein) drawArrow(group, columnX, rnaLetterY - arrowGap, proteinY + arrowGap, options.arrowWidth, black);
                }
                return missing;
            }

            // 골격 가로선 + 염기마다 연결선과 글자. dir: 연결선·글자가 놓이는 쪽(-1 아래, +1 위)
            function drawStrand(group, seq, xs, backboneY, dir, color) {
                var gap = options.baseGap * mmToPt;
                var tick = options.tickLength * mmToPt;
                drawLine(group, xs[0] - gap / 2, backboneY, xs[xs.length - 1] + gap / 2, backboneY, options.backboneWidth, color);
                for (var i = 0; i < seq.length; i++) {
                    drawLine(group, xs[i], backboneY, xs[i], backboneY + dir * tick, options.tickWidth, color);
                    placeText(group, seq.charAt(i), xs[i], backboneY + dir * (tick + options.fontSize * 0.65), engFont);
                }
            }

            // 글자 위를 흰 사각형으로 덮고 가운데에 표시 문자를 쓴다
            function drawMask(group, xs, at, length, centerY, label) {
                var gap = options.baseGap * mmToPt;
                var half = options.fontSize * 0.7;
                var left = xs[at] - gap / 2;
                var right = xs[at + length - 1] + gap / 2;
                var rect = group.pathItems.rectangle(centerY + half, left, right - left, half * 2);
                rect.filled = true;
                rect.fillColor = makeGray(0);
                rect.stroked = true;
                rect.strokeWidth = options.tickWidth;
                rect.strokeColor = makeGray(100);
                placeText(group, label, (left + right) / 2, centerY, null);
            }

            // 코돈마다 중괄호 → 화살표 → 단백질 칸을 (켠 것만) 그린다. 단백질 칸은 가장 큰 칸 크기로 통일하고
            // 칸 사이는 선으로 잇는다. 줄은 왼쪽(lineLeft)·오른쪽 끝까지 뻗는다
            function drawBelow(group, xs, gap, count, braceTop, arrowFrom, arrowTo, braceWidth, centerY, boxHeight, lineLeft, color) {
                var fs = options.fontSize;
                var maxHalf = (3 * gap - 3) / 2;                      // 이웃 칸과 닿지 않는 반폭
                var frames = [];
                var natural = fs * 1.1;                               // 칸 반폭(글자 반폭 + 여백)의 최댓값
                for (var i = 0; i < count; i++) {
                    var cx = xs[i * 3 + 1];
                    if (options.showBraces) drawBrace(group, bracePoints(cx - braceWidth / 2, cx + braceWidth / 2, braceTop, BRACE_HEIGHT_MM * mmToPt), options.arrowWidth, color);
                    if (options.showArrows) drawArrow(group, cx, arrowFrom, arrowTo, options.arrowWidth, color);
                    if (options.showProtein) {
                        var choice = options.proteins[i];
                        var text = choice === 0 ? aminoName(aaList[i], options.nameKorean) : LABELS[choice - 1];
                        var frame = placeText(group, text, cx, centerY, null);
                        var fb = frame.geometricBounds;
                        frames.push({frame: frame, half: (fb[2] - fb[0]) / 2, boxed: choice < 2 || choice > 4});   // ⓐⓑⓒ는 글자 자체가 원이라 박스를 두지 않는다
                        if (frames[i].boxed) natural = Math.max(natural, frames[i].half + fs * 0.45);
                    }
                }
                if (!options.showProtein) return;
                var boxHalf = Math.min(natural, maxHalf);
                var lineRight = xs[count * 3 - 1] + gap / 2;
                if (lineLeft === null) lineLeft = xs[0] - gap / 2;
                var cursor = lineLeft;
                var boxTop = centerY + boxHeight / 2;
                for (var j = 0; j < count; j++) {
                    var center = xs[j * 3 + 1];
                    var item = frames[j];
                    var edge = item.half;
                    if (item.boxed) {
                        // 가장 큰 칸이 코돈 폭을 넘으면 칸을 코돈 폭에 맞추고, 그 안에 안 들어가는 글자는 줄인다
                        if (item.half + fs * 0.3 > boxHalf) {
                            var shrink = Math.max(0.3, (boxHalf - fs * 0.3) / item.half);
                            item.frame.resize(shrink * 100, shrink * 100, true, true, true, true, shrink * 100, Transformation.CENTER);
                        }
                        var box = group.pathItems.rectangle(boxTop, center - boxHalf, boxHalf * 2, boxHeight);
                        box.filled = true;
                        box.fillColor = makeGray(0);
                        box.stroked = true;
                        box.strokeWidth = options.tickWidth;
                        box.strokeColor = makeGray(100);
                        item.frame.zOrder(ZOrderMethod.BRINGTOFRONT);
                        edge = boxHalf;
                    }
                    if (center - edge > cursor) drawLine(group, cursor, centerY, center - edge, centerY, options.arrowWidth, color);
                    cursor = center + edge;
                }
                if (lineRight > cursor) drawLine(group, cursor, centerY, lineRight, centerY, options.arrowWidth, color);
            }

            // 아래쪽 끝이 뾰족한 중괄호
            function drawBrace(group, pts, width, color) {
                var path = group.pathItems.add();
                var anchors = [];
                for (var i = 0; i < pts.length; i++) anchors.push(pts[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < pts.length; j++) {
                    path.pathPoints[j].leftDirection = pts[j].left;
                    path.pathPoints[j].rightDirection = pts[j].right;
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = width;
                path.strokeColor = color;
                try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e) {}
                return path;
            }

            // 위에서 아래로 향하는 화살표(작살형 촉). fromY에서 시작해 tipY에서 끝난다
            function drawArrow(group, x, fromY, tipY, width, color) {
                var scale = width;                                       // 촉은 선 두께에 비례
                drawLine(group, x, fromY, x, tipY + ARROW_HEAD.lineEnd * scale, width, color);
                var head = group.pathItems.add();
                var anchors = [];
                for (var i = 0; i < ARROW_HEAD.poly.length; i++) anchors.push([x + ARROW_HEAD.poly[i][0] * scale, tipY + ARROW_HEAD.poly[i][1] * scale]);
                head.setEntirePath(anchors);
                head.closed = true;
                head.stroked = false;
                head.filled = true;
                head.fillColor = color;
                return head;
            }

            function drawLine(group, x1, y1, x2, y2, width, color) {
                var path = group.pathItems.add();
                path.setEntirePath([[x1, y1], [x2, y2]]);
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = width;
                path.strokeColor = color;
                try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e) {}
                return path;
            }

            // 글자 중심을 (x, y)에 맞춘다. font가 null이면 글자 종류별 서체 규칙을 적용한다
            function placeText(group, text, x, y, font) {
                var frame = group.textFrames.add();
                frame.contents = text;
                var attrs = frame.textRange.characterAttributes;
                attrs.size = options.fontSize;
                attrs.fillColor = makeGray(100);
                if (font === null) styleText(frame); else { try { attrs.textFont = font; } catch (e) {} }
                var gb = frame.geometricBounds;
                frame.translate(x - (gb[0] + gb[2]) / 2, y - (gb[1] + gb[3]) / 2);
                return frame;
            }

            // 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt), 항목 기호 (가)는 괄호까지 바탕체 1.25배,
            // 원문자 ㉠ ⓐ는 바탕체 1.125배, 로마 숫자 Ⅰ Ⅱ는 KoPubWorld바탕체 Pro (07_문자/한글·영문 서체 적용.jsx 규칙)
            function styleText(frame) {
                var text = frame.contents;
                var range = frame.textRange;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var attrs = range.characters[i].characterAttributes;
                    var kind = symbolKind(text, i);
                    if (kind === "bracket" || kind === "circle") {
                        attrs.textFont = symbolFont;
                        attrs.baselineShift = 0;
                        attrs.size = attrs.size * (kind === "bracket" ? 1.25 : 1.125);
                    } else if (kind === "roman") {
                        attrs.textFont = romanFont;
                        attrs.baselineShift = 0;
                    } else if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
                        attrs.textFont = korFont;
                        attrs.baselineShift = 0;
                    } else {
                        attrs.textFont = engFont;
                        attrs.baselineShift = 0.5;
                    }
                }
            }

            // i번째 글자의 기호 종류: "bracket" (가)처럼 괄호 안 한글 한 글자의 세 글자, "circle" ㉠ ⓐ, "roman" Ⅰ, 아니면 null
            function symbolKind(text, i) {
                for (var start = i - 2; start <= i; start++) {
                    if (start < 0 || start + 2 >= text.length) continue;
                    var inner = text.charCodeAt(start + 1);
                    if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return "bracket";
                }
                var code = text.charCodeAt(i);
                if ((code >= 0x3260 && code <= 0x327F) || (code >= 0x24B6 && code <= 0x24E9) || (code >= 0x2460 && code <= 0x2473) || code === 0x24EA) return "circle";
                if (code >= 0x2160 && code <= 0x217F) return "roman";
                return null;
            }

            // -------------------------------------------------------
            // 서열 계산 (일러스트레이터와 무관한 순수 함수)
            // -------------------------------------------------------
            // 표준 유전 부호: 아미노산(3글자) → mRNA 코돈 목록. Stop은 종결 코돈
            function codonTable() {
                return {
                    Phe: ["UUU", "UUC"], Leu: ["UUA", "UUG", "CUU", "CUC", "CUA", "CUG"], Ile: ["AUU", "AUC", "AUA"], Met: ["AUG"],
                    Val: ["GUU", "GUC", "GUA", "GUG"], Ser: ["UCU", "UCC", "UCA", "UCG", "AGU", "AGC"], Pro: ["CCU", "CCC", "CCA", "CCG"],
                    Thr: ["ACU", "ACC", "ACA", "ACG"], Ala: ["GCU", "GCC", "GCA", "GCG"], Tyr: ["UAU", "UAC"], His: ["CAU", "CAC"],
                    Gln: ["CAA", "CAG"], Asn: ["AAU", "AAC"], Lys: ["AAA", "AAG"], Asp: ["GAU", "GAC"], Glu: ["GAA", "GAG"],
                    Cys: ["UGU", "UGC"], Trp: ["UGG"], Arg: ["CGU", "CGC", "CGA", "CGG", "AGA", "AGG"], Gly: ["GGU", "GGC", "GGA", "GGG"],
                    Stop: ["UAA", "UAG", "UGA"]
                };
            }

            // 아미노산 목록: 3글자 약어, 1글자 약어, 한글 이름. 한글 이름의 첫째는 2022 개정 교육과정 유전 부호표 표기이고 나머지는 입력만 받는 다른 표기
            function aminoList() {
                return [
                    {code: "Phe", one: "F", ko: ["페닐알라닌"]}, {code: "Leu", one: "L", ko: ["류신", "루신"]},
                    {code: "Ile", one: "I", ko: ["아이소류신", "이소류신", "아이소루신"]}, {code: "Met", one: "M", ko: ["메싸이오닌", "메티오닌"]},
                    {code: "Val", one: "V", ko: ["발린"]}, {code: "Ser", one: "S", ko: ["세린"]}, {code: "Pro", one: "P", ko: ["프롤린"]},
                    {code: "Thr", one: "T", ko: ["트레오닌"]}, {code: "Ala", one: "A", ko: ["알라닌"]},
                    {code: "Tyr", one: "Y", ko: ["타이로신", "티로신"]}, {code: "His", one: "H", ko: ["히스티딘"]},
                    {code: "Gln", one: "Q", ko: ["글루타민"]}, {code: "Asn", one: "N", ko: ["아스파라진", "아스파라긴"]},
                    {code: "Lys", one: "K", ko: ["라이신", "리신"]}, {code: "Asp", one: "D", ko: ["아스파트산", "아스파르트산"]},
                    {code: "Glu", one: "E", ko: ["글루탐산"]}, {code: "Cys", one: "C", ko: ["시스테인"]}, {code: "Trp", one: "W", ko: ["트립토판"]},
                    {code: "Arg", one: "R", ko: ["아르지닌"]}, {code: "Gly", one: "G", ko: ["글라이신", "글리신"]},
                    {code: "Stop", one: "*", ko: ["종결코돈", "종결", "정지"]}
                ];
            }

            // 화면에 쓸 아미노산 이름: 한글(유전 부호표 표기) 또는 3글자 약어
            function aminoName(code, korean) {
                if (!korean) return code;
                var list = aminoList();
                for (var i = 0; i < list.length; i++) {
                    if (list[i].code === code) return list[i].ko[0];
                }
                return code;
            }

            // 3글자 약어(대소문자 무관)나 한글 이름이면 코드를, 아니면 null
            function findAmino(token) {
                var list = aminoList();
                var lower = String(token).toLowerCase();
                for (var i = 0; i < list.length; i++) {
                    if (list[i].code.toLowerCase() === lower) return list[i].code;
                    for (var j = 0; j < list[i].ko.length; j++) {
                        if (list[i].ko[j] === token) return list[i].code;
                    }
                }
                return lower === "ter" ? "Stop" : null;
            }

            // 1글자 약어 하나의 코드, 없으면 null
            function oneLetter(ch) {
                var list = aminoList();
                for (var i = 0; i < list.length; i++) {
                    if (list[i].one === ch.toUpperCase()) return list[i].code;
                }
                return null;
            }

            // "Met Ser-Gly", "MSG", "메싸이오닌, 세린"처럼 쓴 아미노산 서열을 코드 목록으로 읽는다
            function parseAminoAcids(text) {
                var tokens = String(text).replace(/[\s,\-‐-―·\/>→]+/g, " ").replace(/^ +| +$/g, "").split(" ");
                var out = [];
                if (tokens.length === 1 && tokens[0] === "") return {list: out, error: null};
                for (var i = 0; i < tokens.length; i++) {
                    var whole = findAmino(tokens[i]);
                    if (whole !== null) { out.push(whole); continue; }
                    var letters = [];
                    for (var c = 0; c < tokens[i].length; c++) {
                        var one = oneLetter(tokens[i].charAt(c));
                        if (one === null) return {list: [], error: "알 수 없는 아미노산: " + tokens[i]};
                        letters.push(one);
                    }
                    for (var k = 0; k < letters.length; k++) out.push(letters[k]);
                }
                return {list: out, error: null};
            }

            // 고른 mRNA 코돈들로 DNA 두 줄과 RNA를 만든다. 주형이 위면 DNA 1이 주형(RNA는 DNA 2와 같은 서열)
            function buildStrands(codons, templateTop) {
                var rna = codons.join("");
                var coding = rna.replace(/U/g, "T");
                var template = complement(coding);
                return {rna: rna, coding: coding, template: template,
                    dna1: templateTop ? template : coding, dna2: templateTop ? coding : template};
            }

            // "1~5, 8~10", "3", "2-4" → {list: [{from, to}, ...], error: false}(왼쪽부터 센 염기 번호, 1부터). 비었으면 null, 틀리면 {error: true}
            function parseBaseRanges(text, length) {
                var s = String(text).replace(/\s+/g, "");
                if (s === "") return null;
                var parts = s.split(",");
                var list = [];
                for (var i = 0; i < parts.length; i++) {
                    var m = /^(\d{1,3})(?:[~\-–](\d{1,3}))?$/.exec(parts[i]);
                    if (m === null) return {error: true};
                    var from = parseInt(m[1], 10);
                    var to = m[2] === undefined || m[2] === "" ? from : parseInt(m[2], 10);
                    if (from < 1 || to < from || to > length) return {error: true};
                    list.push({from: from, to: to});
                }
                return {list: list, error: false};
            }

            // 쉼표로 나눈 이름 count개(모자라면 빈 글자)
            function splitNames(text, count) {
                var parts = String(text).split(",");
                var out = [];
                for (var i = 0; i < count; i++) out.push(i < parts.length ? parts[i].replace(/^\s+|\s+$/g, "") : "");
                return out;
            }

            // 아래쪽 끝이 뾰족한 중괄호의 앵커 7개(anchor·left=들어오는 핸들·right=나가는 핸들). top은 양끝의 y
            function bracePoints(left, right, top, height) {
                var k = 0.5522847498;
                var c = (left + right) / 2;
                var q = Math.min(height / 2, (right - left) / 4);
                var mid = top - q;
                var tip = top - 2 * q;
                function pt(x, y, lx, ly, rx, ry) { return {anchor: [x, y], left: [lx, ly], right: [rx, ry]}; }
                return [
                    pt(left, top, left, top, left, top - k * q),
                    pt(left + q, mid, left + q - k * q, mid, left + q, mid),
                    pt(c - q, mid, c - q, mid, c - q + k * q, mid),
                    pt(c, tip, c, tip + k * q, c, tip + k * q),
                    pt(c + q, mid, c + q - k * q, mid, c + q, mid),
                    pt(right - q, mid, right - q, mid, right - q + k * q, mid),
                    pt(right, top, right, top - k * q, right, top)
                ];
            }

            function complement(seq) {
                var map = { A: "T", T: "A", G: "C", C: "G" };
                var out = "";
                for (var i = 0; i < seq.length; i++) out += map[seq.charAt(i)];
                return out;
            }

            function makeGray(k) {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = k;
                    return cmyk;
                }
                var value = Math.round(255 * (100 - k) / 100);
                var rgb = new RGBColor();
                rgb.red = value;
                rgb.green = value;
                rgb.blue = value;
                return rgb;
            }

            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
            }

            // 로마 숫자 서체: 후보 이름 → 서체 정보(KoPub·바탕·Pro) → 바탕체
            function findRomanFont() {
                var names = ["KoPubWorld바탕체_Pro", "KoPubWorld Batang Pro", "KoPubWorldBatangPro", "KoPubWorldBatang_Pro",
                    "KoPubWorldBatangPM", "KoPubWorldBatangPL", "KoPubWorldBatangPB", "KoPubWorldBatangPro-Regular", "KoPubWorldBatangPro-Medium", "KoPubWorldBatangMedium"];
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                for (var j = 0; j < app.textFonts.length; j++) {
                    var all = "";
                    try { all = (String(app.textFonts[j].name) + " " + String(app.textFonts[j].family) + " " + String(app.textFonts[j].style)).toLowerCase(); } catch (e2) {}
                    if ((all.indexOf("kopub") >= 0 || all.indexOf("코펍") >= 0) && (all.indexOf("batang") >= 0 || all.indexOf("바탕") >= 0) &&
                        (all.indexOf("pro") >= 0 || /kopubworldbatangp[mlb]/.test(all))) return app.textFonts[j];
                }
                return findTextFont(["Batang", "BatangOTF", ENG_FONT_NAME]);
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            // 첨부 그림(기출형)을 처음 값으로 한다: Gly Arg Glu, 주형은 위 가닥, DNA 1의 염기 1~3·DNA 2와 RNA의 염기 4~9를 가림
            function defaultOptions() {
                return { aaText: "Gly Arg Glu", picks: [2, 0, 0, 0, 0, 0, 0, 0], proteins: [2, 1, 5, 0, 0, 0, 0, 0],
                    templateTop: true, showNames: true, showBraces: true, showArrows: true, showProtein: true, nameKorean: true, names: "DNA, , RNA, (가), 단백질",
                    masks: ["1-3", "4-9", "4-9"], labels: [0, 7, 8],
                    backboneWidth: 1, tickWidth: 0.3, tickLength: 3, arrowWidth: 0.5, fontSize: 10,
                    baseGap: 6, strandGap: 16, rnaGap: 14, arrowLength: 7, offsetX: 0, offsetY: 0, braceGap: 1.5, dnaColor: 100, rnaColor: 50, preview: true };
            }

            // v6: 숫자 11개, 주형·줄 이름 표시·단백질 줄 표시(0/1), 줄 이름, 아미노산 서열, 코돈 선택·단백질 칸(쉼표 목록),
            //     가릴 염기 번호 3개(예: 1~5, 8~10), 박스 문자 번호 3개, 미리보기(0/1), 한글 이름(0/1), 중괄호·화살표 표시(0/1), 덧붙인 숫자 3개
            function readSettings() {
                var result = defaultOptions();
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v6" || p.length !== 32) return result;
                    for (var i = 0; i < NUMBER_KEYS.length; i++) {
                        var value = Number(p[i + 1]);
                        if (!/\S/.test(p[i + 1]) || !isFinite(value) || value < NUMBER_MINS[i] || value > NUMBER_MAXS[i]) return result;
                    }
                    for (var e = 0; e < EXTRA_KEYS.length; e++) {
                        var extra = Number(p[29 + e]);
                        if (!/\S/.test(p[29 + e]) || !isFinite(extra) || extra < EXTRA_MINS[e] || extra > EXTRA_MAXS[e]) return result;
                    }
                    if (!/^[01]$/.test(p[12]) || !/^[01]$/.test(p[13]) || !/^[01]$/.test(p[14]) || !/^[01]$/.test(p[25]) || !/^[01]$/.test(p[26]) || !/^[01]$/.test(p[27]) || !/^[01]$/.test(p[28])) return result;
                    var parsed = parseAminoAcids(p[16]);
                    if (parsed.error !== null || parsed.list.length > MAX_AMINO) return result;
                    var picks = readList(p[17], MAX_AMINO, 5);
                    var proteins = readList(p[18], MAX_AMINO, PROTEIN_CHOICES.length - 1);
                    if (picks === null || proteins === null) return result;
                    for (var m = 0; m < 3; m++) {
                        if (!/^[0-9~\-–, ]*$/.test(p[19 + m]) || !/^[0-9]$/.test(p[22 + m])) return result;
                    }
                    for (var k = 0; k < NUMBER_KEYS.length; k++) result[NUMBER_KEYS[k]] = Number(p[k + 1]);
                    result.templateTop = p[12] === "1";
                    result.showNames = p[13] === "1";
                    result.showProtein = p[14] === "1";
                    result.names = p[15];
                    result.aaText = p[16];
                    result.picks = picks;
                    result.proteins = proteins;
                    for (var l = 0; l < 3; l++) {
                        result.masks[l] = p[19 + l];
                        result.labels[l] = Number(p[22 + l]);
                    }
                    result.preview = p[25] === "1";
                    result.nameKorean = p[26] === "1";
                    result.showBraces = p[27] === "1";
                    result.showArrows = p[28] === "1";
                    for (var x = 0; x < EXTRA_KEYS.length; x++) result[EXTRA_KEYS[x]] = Number(p[29 + x]);
                } catch (e) {}
                return result;
            }

            // "2,0,0,..." → 길이 count의 숫자 배열(0..max). 틀리면 null
            function readList(text, count, max) {
                var parts = String(text).split(",");
                if (parts.length !== count) return null;
                var out = [];
                for (var i = 0; i < count; i++) {
                    if (!/^[0-9]{1,2}$/.test(parts[i]) || Number(parts[i]) > max) return null;
                    out.push(Number(parts[i]));
                }
                return out;
            }

            function saveSettings() {
                try {
                    var parts = ["v6"];
                    for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
                    parts.push(options.templateTop ? 1 : 0, options.showNames ? 1 : 0, options.showProtein ? 1 : 0,
                        options.names, options.aaText, options.picks.join(","), options.proteins.join(","),
                        options.masks[0], options.masks[1], options.masks[2],
                        options.labels[0], options.labels[1], options.labels[2], options.preview ? 1 : 0, options.nameKorean ? 1 : 0,
                        options.showBraces ? 1 : 0, options.showArrows ? 1 : 0,
                        options.braceGap, options.dnaColor, options.rnaColor);
                    app.preferences.setStringPreference(PREF_KEY, parts.join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }
})();
