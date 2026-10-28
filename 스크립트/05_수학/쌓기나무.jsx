// 쌓기나무.jsx
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

// 쌓기나무: 초등 6학년 '공간과 입체'의 쌓기나무 그림을 그린다. 선택 없이 화면 가운데에 만든다. 웹 도구 "쌓기나무"와 같은 그림이다.
//   위에서 본 모양의 칸마다 쌓은 층수를 적으면(첫 줄이 뒤, 마지막 줄이 앞: "1 2 1 / 2 3 1 / 1 1 0") 쌓은 모양(입체),
//   위·앞·옆에서 본 모양, 위에서 본 모양에 수 쓰기, 층별로 나타낸 모양을 그린다.
//   입체는 등각(30°) 또는 사투상(앞면이 정사각형)으로, 오른쪽 앞 또는 왼쪽 앞에서 본다. 정육면체를 뒤에서 앞으로 칠해 앞의 것이 뒤를 가리고,
//   이웃한 쌓기나무와 맞닿아 늘 가려지는 면은 그리지 않는다. 옆에서 본 모양은 입체에서 보이는 옆면 쪽에서 본다.
// 선 두께는 모서리 0.5pt이고 '선 두께' 패널에서 고친다. 글자는 한글 Spoqa, 숫자 GSMediumB1이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var LEGEND_GAP_MM = 1;           // 축 범례와 축(또는 눈금 숫자·글자) 사이 간격
    var LEGEND_LINE_HEIGHT = 1;      // 세로로 쌓은 범례의 줄 간격(글자 크기 배). 1 = 일러스트레이터 세로쓰기와 같은 간격
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

    // ==== 쌓기나무 ====
    var CUBE_FIGURES = ["쌓은 모양", "쌓은 모양 + 위·앞·옆", "위·앞·옆에서 본 모양", "위에서 본 모양에 수 쓰기", "층별로 나타낸 모양"];
    var CUBE_PROJECTIONS = ["등각 (30°)", "사투상 (앞면 정사각형)"];
    var CUBE_SIDES = ["오른쪽 앞에서", "왼쪽 앞에서"];
    var CUBE_SHADES = ["없음 (모두 흰색)", "옅게 (0·10·25)", "진하게 (0·20·40)"];
    var CUBE_MAX = 9;           // 한 칸에 쌓는 최대 층수
    var CUBE_MAX_CELLS = 10;    // 가로·세로 최대 칸 수

    // 위에서 본 모양의 층수 글 → 줄 목록(첫 줄이 뒤). 줄은 / · 쉼표 · 줄바꿈으로, 칸은 공백으로 나눈다.
    // 공백 없이 숫자만 쓴 줄("121")은 한 글자가 한 칸이다. 숫자가 아닌 칸은 0(쌓기나무 없음)이다
    function parseCubeRows(text) {
        var rows = [], lines = String(text).split(/[\/,;\n\r]/), i, j;
        for (i = 0; i < lines.length && rows.length < CUBE_MAX_CELLS; i++) {
            var line = lines[i].replace(/^\s+|\s+$/g, "");
            if (line === "") continue;
            var cells = /^[0-9]+$/.test(line) ? line.split("") : line.split(/\s+/), row = [];
            for (j = 0; j < cells.length && j < CUBE_MAX_CELLS; j++) {
                var v = parseInt(cells[j], 10);
                row.push(isNaN(v) || v < 0 ? 0 : Math.min(v, CUBE_MAX));
            }
            rows.push(row);
        }
        return rows;
    }

    // 쌓기나무 칸 정보: 가로 칸 수 W, 세로 칸 수 D, 높이 h(x, d) — x는 왼쪽부터, d는 앞줄이 0
    function cubeGrid(text) {
        var rows = parseCubeRows(text), W = 0, i;
        for (i = 0; i < rows.length; i++) W = Math.max(W, rows[i].length);
        function h(x, d) {
            if (x < 0 || d < 0 || x >= W || d >= rows.length) return 0;
            var v = rows[rows.length - 1 - d][x];
            return v ? v : 0;
        }
        var maxH = 0, count = 0, x, d;
        for (d = 0; d < rows.length; d++) for (x = 0; x < W; x++) { maxH = Math.max(maxH, h(x, d)); count += h(x, d); }
        return {W: W, D: rows.length, h: h, maxH: maxH, count: count};
    }

    // 입체의 투영 축(화면 pt, 한 칸 = s). 보는 쪽 side 0 = 오른쪽 앞, 1 = 왼쪽 앞.
    // 등각: 가로(x)와 깊이(d) 축이 수평선과 30°. 사투상: 가로는 수평, 깊이는 45° 위로 반 길이
    function cubeAxes(projection, side, s) {
        var f = side === 0 ? 1 : -1, c30 = Math.cos(Math.PI / 6), k = 0.5 * Math.SQRT1_2;
        if (projection === 0) return {x: [s * c30, -s * 0.5 * f], d: [s * c30 * f, s * 0.5], z: [0, s]};
        return {x: [s, 0], d: [s * k * f, s * k], z: [0, s]};
    }

    // 입체 그림의 화면 범위(가장 왼쪽·아래·오른쪽·위)를 원점 기준으로 잰다
    function cubeExtent(g, ax) {
        var box = [Infinity, Infinity, -Infinity, -Infinity], x, d, z, a, b, c;
        for (d = 0; d < g.D; d++) for (x = 0; x < g.W; x++) {
            var top = g.h(x, d);
            if (top === 0) continue;
            for (a = 0; a <= 1; a++) for (b = 0; b <= 1; b++) for (c = 0; c <= 1; c++) {
                z = c === 0 ? 0 : top;
                var px = (x + a) * ax.x[0] + (d + b) * ax.d[0] + z * ax.z[0], py = (x + a) * ax.x[1] + (d + b) * ax.d[1] + z * ax.z[1];
                box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py);
            }
        }
        return box;
    }

    // 쌓은 모양: (ox, oy)가 그림 범위의 왼쪽 아래. 정육면체를 뒤에서 앞으로 칠하고, 맞닿아 늘 가려지는 면은 그리지 않는다
    function drawCubeSolid(t, o, g, ox, oy) {
        var s = o.cell * t.mm, ax = cubeAxes(o.projection, o.side, s), box = cubeExtent(g, ax);
        var f = o.side === 0 ? 1 : -1, shades = [[0, 0, 0], [0, 10, 25], [0, 20, 40]][o.shade], cubes = [], x, d, z, i;
        for (d = 0; d < g.D; d++) for (x = 0; x < g.W; x++) for (z = 0; z < g.h(x, d); z++) cubes.push([x, d, z]);
        // 보는 쪽에 가까울수록 나중에 칠한다. 등각은 같은 값끼리 겹치지 않고, 사투상은 앞줄이 뒷줄을 모두 가린다
        function nearness(cube) { return o.projection === 0 ? f * cube[0] - cube[1] + cube[2] : -1000 * cube[1] + f * cube[0] + cube[2]; }
        cubes.sort(function(a, b) { return nearness(a) - nearness(b); });
        function has(cx, cd, cz) { return cz >= 0 && cz < g.h(cx, cd); }
        function P(px, pd, pz) {
            return [ox - box[0] + px * ax.x[0] + pd * ax.d[0] + pz * ax.z[0], oy - box[1] + px * ax.x[1] + pd * ax.d[1] + pz * ax.z[1]];
        }
        for (i = 0; i < cubes.length; i++) {
            x = cubes[i][0]; d = cubes[i][1]; z = cubes[i][2];
            if (!has(x, d, z + 1)) t.path([P(x, d, z + 1), P(x + 1, d, z + 1), P(x + 1, d + 1, z + 1), P(x, d + 1, z + 1)], true, shades[0], 100, o.wBody);
            if (!has(x, d - 1, z)) t.path([P(x, d, z), P(x + 1, d, z), P(x + 1, d, z + 1), P(x, d, z + 1)], true, shades[1], 100, o.wBody);
            var sx = f > 0 ? x + 1 : x;
            if (!has(x + f, d, z)) t.path([P(sx, d, z), P(sx, d + 1, z), P(sx, d + 1, z + 1), P(sx, d, z + 1)], true, shades[2], 100, o.wBody);
        }
        return {w: box[2] - box[0], h: box[3] - box[1]};
    }

    // 모눈 모양: cells[r][c](첫 줄이 위)가 0이 아니면 칸을 그린다. (ox, oy)가 왼쪽 아래. 숫자(numbers)면 칸 가운데에 값을 쓴다
    function drawCubeCells(t, o, cells, ox, oy, numbers) {
        var s = o.cell * t.mm, rows = cells.length, cols = 0, r, c;
        for (r = 0; r < rows; r++) cols = Math.max(cols, cells[r].length);
        for (r = 0; r < rows; r++) for (c = 0; c < cells[r].length; c++) {
            if (!cells[r][c]) continue;
            var left = ox + c * s, top = oy + (rows - r) * s;
            t.rect(left, top, left + s, top - s, o.viewFill ? 15 : 0, 100, o.wBody);
            // 숫자 윤곽(높이 0.72배)의 가운데가 칸 가운데에 오게 윤곽 윗변을 놓는다
            if (numbers) t.textAt(String(cells[r][c]), left + s / 2, top - s / 2 + 0.36 * o.font, o.font, "below", null);
        }
        return {w: cols * s, h: rows * s};
    }

    // 위·앞·옆·층별 모눈: 각각 cells(첫 줄이 위)
    function cubeTopCells(g, layer) {
        var out = [], d, x;
        for (d = g.D - 1; d >= 0; d--) {
            var row = [];
            for (x = 0; x < g.W; x++) row.push(layer ? (g.h(x, d) >= layer ? 1 : 0) : g.h(x, d));
            out.push(row);
        }
        return out;
    }
    function cubeFrontCells(g) {
        var out = [], z, x, d;
        for (z = g.maxH - 1; z >= 0; z--) {
            var row = [];
            for (x = 0; x < g.W; x++) {
                var tall = 0;
                for (d = 0; d < g.D; d++) tall = Math.max(tall, g.h(x, d));
                row.push(tall > z ? 1 : 0);
            }
            out.push(row);
        }
        return out;
    }
    // 옆: 오른쪽 옆에서 보면 앞줄이 왼쪽, 왼쪽 옆에서 보면 앞줄이 오른쪽
    function cubeSideCells(g, side) {
        var out = [], z, i, x;
        for (z = g.maxH - 1; z >= 0; z--) {
            var row = [];
            for (i = 0; i < g.D; i++) {
                var d = side === 0 ? i : g.D - 1 - i, tall = 0;
                for (x = 0; x < g.W; x++) tall = Math.max(tall, g.h(x, d));
                row.push(tall > z ? 1 : 0);
            }
            out.push(row);
        }
        return out;
    }

    // 좌표는 pt(y 위쪽 +). 그림들은 왼쪽부터 가로로 늘어놓고 아랫선을 맞춘다. 이름 글자는 그림 아래 가운데
    function drawStackedCubes(t, o) {
        var m = t.mm, size = o.font, g = cubeGrid(o.heights), gap = o.gap * m, x = 0, i;
        if (g.count === 0) return;
        var labelY = -1.5 * m;
        function place(kind, title) {
            var made;
            if (kind === "solid") made = drawCubeSolid(t, o, g, x, 0);
            else if (kind === "top") made = drawCubeCells(t, o, cubeTopCells(g, 0), x, 0, false);
            else if (kind === "front") made = drawCubeCells(t, o, cubeFrontCells(g), x, 0, false);
            else if (kind === "side") made = drawCubeCells(t, o, cubeSideCells(g, o.side), x, 0, false);
            else if (kind === "numbers") made = drawCubeCells(t, o, cubeTopCells(g, 0), x, 0, true);
            else made = drawCubeCells(t, o, cubeTopCells(g, kind), x, 0, false);
            if (o.showTitles && title !== "") t.textAt(title, x + made.w / 2, labelY, size, "below");
            x += made.w + gap;
        }
        if (o.figure === 0 || o.figure === 1) place("solid", "");
        if (o.figure === 1 || o.figure === 2) {
            place("top", "위");
            place("front", "앞");
            place("side", "옆");
        }
        if (o.figure === 3) place("numbers", "");
        if (o.figure === 4) for (i = 1; i <= g.maxH; i++) place(i, i + "층");
    }

    // 목록·표가 다 정해진 뒤에 창을 띄운다. 창은 runFormHost 안에서 닫힐 때까지 떠 있어서, 이 줄보다 아래의 var는 그동안 undefined다
    runFormHost("쌓기나무", [makeCubeEngine()], "StackedCubes/tab");

    function makeCubeEngine() {
        return makeFormEngine({
            label: "쌓기나무", name: "StackedCubes", prefKey: "StackedCubes/settings",
            controls: [
                {panel: "쌓기나무"},
                {key: "heights", label: "층수", text: true, value: "1 2 1 / 2 3 1 / 1 1 0"},
                {key: "figure", label: "그림", items: CUBE_FIGURES, value: 0},
                {key: "cell", label: "한 칸", unit: "mm", min: 3, max: 15, step: 0.5, value: 6},
                {panel: "쌓은 모양"},
                {key: "projection", label: "그리는 방식", items: CUBE_PROJECTIONS, value: 0},
                {key: "side", label: "보는 방향", items: CUBE_SIDES, value: 0},
                {key: "shade", label: "면 음영", items: CUBE_SHADES, value: 1},
                {panel: "본 모양"},
                {key: "viewFill", check: "칸 칠하기", value: false},
                {key: "showTitles", check: "이름 (위·앞·옆·1층)", value: true},
                {key: "gap", label: "그림 사이", unit: "mm", min: 2, max: 20, step: 0.5, value: 6},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            draw: drawStackedCubes
        });
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
    // '선 두께' 패널(wBody 곡선, wRope 축·점선)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "모서리", unit: "pt", min: 0.1, max: 3, step: 0.1, value: 0.5},
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
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "StackedCubes/" + spec.name + "/" + ctl.panel);
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
        // stack 줄 사이를 글자 크기의 LEGEND_LINE_HEIGHT배(1)로 두고 가운데 맞춤(세로쓰기 축 범례)
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
        // 글자 윤곽 기준: anchor "below"면 (x, y)가 글자 윤곽의 위 가운데, "right"면 윤곽의 왼쪽 끝 세로 가운데, "left"면 윤곽의 오른쪽 끝 세로 가운데
        t.textAt = function(text, x, y, size, anchor, opts) {
            var frame = t.text(text, x, y, size, "center", opts);
            var ink = formInkBounds(frame), cx = (ink[0] + ink[2]) / 2, cy = (ink[1] + ink[3]) / 2;
            if (anchor === "below") frame.translate(x - cx, y - ink[1]);
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
