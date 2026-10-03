// Object_Karyotype.jsx
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

// 사람의 핵형: 사각형을 선택하고 실행하면 그 안에 데버(Denver) 배치로 22쌍의 상염색체와 성염색체를 그린다.
//   - 표시: 비우면 전체. "1, 2, 3~8, X, Y"처럼 쉼표로 나누고 연속은 ~ 로 쓴다.
//   - 핵형: 정상 / 다운(21번 3개) / 클라인펠터(XXY) / 터너(X0) / 고양이 울음(5번 한 쪽 5p15.2 끝까지 결실).
//   - 모양: 기하학적(둥근 사각형) · 중간 · 실제에 가까운 모양. 염색 분체 1개 또는 2개(벌림 가능). G 밴드 유무.
//   - 표현: 평면 단색 또는 입체(투명도 그라데이션 음영).
//   - 크기·p/q 비율·G 밴드는 UCSC hg38(GRCh38) cytoBand: 염색체 길이, 동원체 위치, 밴드 단계(gpos25~100·gvar).
//     1번 염색체 길이를 100으로 두고 나머지는 염기쌍 길이에 비례한다. 밴드는 염색체 길이의 1/64 칸으로 모았다.
//   - 사각형 크기에 맞춰 배치하고, 남는 가로·세로는 열·줄 간격으로 나눠 사각형을 채운다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    // ==== 순수 기하 시작 (tests/check-karyotype.js 가 이 구간을 그대로 읽는다) ====
    var KARYO_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "X", "Y"];
    var KARYO_DATA = {
        "1": [248.96, 123.4, "01020101101030112244441222230210", "55555020111021104141010343011320"],
        "2": [242.19, 93.9, "0102131122201424120144007", "702102112114241130320012313010430233010"],
        "3": [198.3, 90.9, "21100342222113001110120131127", "75503112221001010440211440221301300"],
        "4": [190.21, 50, "00002031024410207", "70144113111123231220023112144311010441441324101"],
        "5": [181.54, 48.8, "00012024240010027", "70013322202234430142431144004101003302024420100"],
        "6": [170.81, 59.8, "0112113331210110044240", "744200222210343340001344422211312202002100"],
        "7": [159.35, 60.1, "010442241022331331323207", "7002200344322231000233022130012101320100"],
        "8": [145.14, 45.2, "03200144201213331107", "70102222211143333044300100231442210121013100"],
        "9": [138.39, 43, "01002320134404420110", "75555555501102211202110110343011033101100000"],
        "10": [133.8, 39.8, "0003320023212201007", "700102444204440021024413221121144303301002100"],
        "11": [135.09, 53.4, "0122211200342320044410037", "733110102212444214400443444110001101200"],
        "12": [133.28, 35.5, "00101304424422107", "74444010011330210330034422410332122001212002200"],
        "13": [114.36, 17.7, "5556665557", "700101002133100022001440132034302044443044300024124100"],
        "14": [107.04, 17.2, "5566655557", "700034444211344201440010232012012100044224410102221100"],
        "15": [101.99, 19, "555666555557", "7000210103333000333003333111001110010220022100022100"],
        "16": [90.34, 36.8, "00000121021022200222000007", "75555550000221244444410021233300210010"],
        "17": [83.26, 25.1, "0012200023331000077", "770000122221110001100333332331120033300000000"],
        "18": [80.37, 18.5, "001222011000777", "7700000344444100133332000133330022004444001110000"],
        "19": [58.62, 26.2, "00000000111111011100005555577", "77555500001111111100111000011000111"],
        "20": [64.44, 28.1, "0000033331003333330001000077", "770001110013333111110003333301210000"],
        "21": [46.71, 12, "5555666665555557", "700034444444443000133333310000022100122210000000"],
        "22": [50.82, 15, "5555566666665555577", "777000001100022222000222222200002222000001200"],
        "X": [156.04, 61, "0010222120340442023201007", "702001244414413201003330044411003143000"],
        "Y": [57.23, 10.4, "100000000000", "0022222100222220005555555555555555555555555555555555"]
    };
    var KARYO_L1 = 248.96;       // 1번 염색체 길이(Mb) = 기준 길이 100 단위
    var KARYO_UNIT = 100;
    var CRI_CUT_MB = 15.0;       // 5p15.2 끝(hg38). 고양이 울음 증후군(5p-)은 여기까지 잘려 나간다

    // cap: 끝 모서리 가로 반지름 비율(1 = 반원), capY: 세로 반지름 배율, neck: 동원체 목 너비 비율
    // cusp: 알약 두 개를 겹친 V자 홈, notchLen: 부드러운 홈의 반 길이(a 배), bell: 홈 곡선 지수, bulge: 팔 가운데 부풂
    // stalk·knob: 달린 염색체 짧은 팔의 자루·위성 너비 비율
    var SHAPE_STYLES = [
        { name: "기하학적", cap: 1.0, capY: 1.0, neck: 0.64, cusp: true, notchLen: 1.0, bell: 1, bulge: 0, stalk: 0.55, knob: 0.92 },
        { name: "중간", cap: 1.0, capY: 1.1, neck: 0.58, cusp: false, notchLen: 1.0, bell: 1, bulge: 0, stalk: 0.45, knob: 0.88 },
        { name: "실제", cap: 1.0, capY: 1.4, neck: 0.38, cusp: false, notchLen: 1.4, bell: 1.5, bulge: 0.06, stalk: 0.30, knob: 0.74 }
    ];

    // 데버 배치: 줄 > 묶음 > 염색체. DENVER_GAPS[줄][g-1]은 g번째 묶음 앞의 빈 칸(열 단위)
    var DENVER_ROWS = [
        [["1", "2", "3"], ["4", "5"]],
        [["6", "7", "8", "9", "10", "11", "12"]],
        [["13", "14", "15"], ["16", "17", "18"]],
        [["19", "20"], ["21", "22"], ["X", "Y"]]
    ];
    var DENVER_GAPS = [[2], [], [1], [0.3, 0.7]];

    function indexOfValue(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (list[i] === value) return i;
        }
        return -1;
    }

    function smoothstep(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return t * t * (3 - 2 * t);
    }

    // "1, 2, 3~8, X, Y" → 순서대로 겹침 없이. 정규식 대신 글자 단위로 읽는다 (ExtendScript 멈춤 방지)
    function chromIndexOfName(name) {
        var upper = name.toUpperCase();
        if (upper === "X") return 22;
        if (upper === "Y") return 23;
        if (upper === "") return -1;
        for (var i = 0; i < upper.length; i++) {
            var code = upper.charCodeAt(i);
            if (code < 48 || code > 57) return -1;
        }
        var n = parseInt(upper, 10);
        return (n >= 1 && n <= 22) ? n - 1 : -1;
    }

    function parseChromList(text) {
        var separators = ",，、; \t";
        var rangeMarks = "~～∼〜-–—−";
        var tokens = [];
        var current = "";
        var i;
        for (i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (separators.indexOf(ch) >= 0) {
                if (current !== "") tokens.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
        if (current !== "") tokens.push(current);

        var picked = [];
        var bad = [];
        for (i = 0; i < KARYO_ORDER.length; i++) picked.push(false);
        for (i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            var mark = -1;
            for (var k = 1; k < token.length; k++) {
                if (rangeMarks.indexOf(token.charAt(k)) >= 0) { mark = k; break; }
            }
            var from, to;
            if (mark < 0) {
                from = chromIndexOfName(token);
                to = from;
            } else {
                from = chromIndexOfName(token.substring(0, mark));
                to = chromIndexOfName(token.substring(mark + 1));
            }
            if (from < 0 || to < 0) { bad.push(token); continue; }
            if (from > to) { var swap = from; from = to; to = swap; }
            for (var n = from; n <= to; n++) picked[n] = true;
        }
        var ids = [];
        for (i = 0; i < KARYO_ORDER.length; i++) {
            if (picked[i]) ids.push(KARYO_ORDER[i]);
        }
        return { ids: ids, bad: bad };
    }

    // kary: normal / down / klinefelter / turner / cridu,  sex: M / F
    function effectiveSex(kary, sex) {
        if (kary === "klinefelter") return "M";
        if (kary === "turner") return "F";
        return sex;
    }

    function chromCopies(id, kary, sex) {
        var s = effectiveSex(kary, sex);
        if (id === "X") {
            if (kary === "klinefelter") return 2;
            if (kary === "turner") return 1;
            return s === "M" ? 1 : 2;
        }
        if (id === "Y") return s === "M" ? 1 : 0;
        if (id === "21" && kary === "down") return 3;
        return 2;
    }

    function chromVariant(id, kary, copyIndex) {
        return (kary === "cridu" && id === "5" && copyIndex === 1) ? "del5p" : "";
    }

    // 표시할 칸 목록 (줄마다). 상염색체는 상동 염색체를 한 칸에, 성염색체는 한 개씩 칸을 쓴다
    function buildCells(ids, kary, sex) {
        var rows = [];
        for (var r = 0; r < DENVER_ROWS.length; r++) {
            var col = 0;
            var started = false;
            var row = [];
            for (var g = 0; g < DENVER_ROWS[r].length; g++) {
                var group = DENVER_ROWS[r][g];
                var groupCells = [];
                for (var k = 0; k < group.length; k++) {
                    var id = group[k];
                    if (indexOfValue(ids, id) < 0) continue;
                    var n = chromCopies(id, kary, sex);
                    if (n === 0) continue;
                    var m;
                    if (id === "X" || id === "Y") {
                        for (m = 0; m < n; m++) groupCells.push({ id: id, variants: [chromVariant(id, kary, m)] });
                    } else {
                        var variants = [];
                        for (m = 0; m < n; m++) variants.push(chromVariant(id, kary, m));
                        groupCells.push({ id: id, variants: variants });
                    }
                }
                if (groupCells.length === 0) continue;
                if (started) col += DENVER_GAPS[r][g - 1];
                started = true;
                for (var c = 0; c < groupCells.length; c++) {
                    groupCells[c].col = col;
                    col += 1;
                    row.push(groupCells[c]);
                }
            }
            if (row.length > 0) rows.push(row);
        }
        return rows;
    }

    // 염색체 한 가닥(분체)의 치수와 밴드. 단위: 1번 염색체 길이 = 100
    // o: { style, wc(분체 너비), chromatids(1|2), splay(도), gap(두 분체 사이) }
    function chromGeom(id, variant, o) {
        var d = KARYO_DATA[id];
        var st = SHAPE_STYLES[o.style];
        var f = KARYO_UNIT / KARYO_L1;
        var pStr = d[2];
        var qStr = d[3];
        var pLen = d[1] * f;
        var qLen = (d[0] - d[1]) * f;
        if (variant === "del5p") {
            var drop = Math.round(pStr.length * Math.min(CRI_CUT_MB / d[1], 0.9));
            pLen = pLen * (1 - drop / pStr.length);
            pStr = pStr.substring(drop);
        }
        var a = o.wc / 2;
        var g = {
            id: id, style: st, a: a, pLen: pLen, qLen: qLen, T: pLen + qLen, yc: pLen,
            pStr: pStr, qStr: qStr, stalk: null
        };
        g.reach = st.cusp ? a * Math.sqrt(1 - st.neck * st.neck) : a * st.notchLen;
        g.reachP = Math.min(g.reach, pLen * 0.5);
        g.reachQ = Math.min(g.reach, qLen * 0.5);
        var s0 = pStr.indexOf("6");
        if (s0 >= 0) {
            var s1 = pStr.lastIndexOf("6");
            g.stalk = [s0 / pStr.length * pLen, (s1 + 1) / pStr.length * pLen];
        }
        g.ryT = Math.min(st.cap * a * st.capY, Math.max(0.3 * a, g.yc - g.reachP));
        g.ryB = Math.min(st.cap * a * st.capY, Math.max(0.3 * a, g.qLen - g.reachQ));
        return g;
    }

    function chromHalf(g, y) {
        var a = g.a;
        var st = g.style;
        var w = 1;
        if (g.stalk) {
            var e = Math.min(a * 0.5, (g.stalk[1] - g.stalk[0]) / 3);
            w = st.knob + (st.stalk - st.knob) * smoothstep((y - (g.stalk[0] - e / 2)) / e)
                + (1 - st.stalk) * smoothstep((y - (g.stalk[1] - e / 2)) / e);
        }
        var t;
        if (st.bulge > 0) {
            t = y < g.yc ? y / g.yc : (y - g.yc) / g.qLen;
            w *= 1 + st.bulge * Math.sin(Math.PI * t);
        }
        if (y < g.ryT) {
            t = (g.ryT - y) / g.ryT;
            w *= 1 - st.cap + st.cap * Math.sqrt(1 - t * t);
        }
        var yb = g.T - y;
        if (yb < g.ryB) {
            t = (g.ryB - yb) / g.ryB;
            w *= 1 - st.cap + st.cap * Math.sqrt(1 - t * t);
        }
        var u = Math.abs(y - g.yc);
        var reach = y < g.yc ? g.reachP : g.reachQ;
        if (u < reach) {
            if (st.cusp) {
                t = (reach - u) / a;
                w *= Math.sqrt(1 - t * t);
            } else {
                t = (1 + Math.cos(Math.PI * u / reach)) / 2;
                w *= 1 - (1 - st.neck) * Math.pow(t, st.bell);
            }
        }
        return Math.max(0, a * w);
    }

    // 오른쪽 분체의 중심선 x. 동원체에서 안쪽 가장자리가 맞닿고 팔로 갈수록 벌어진다. 1분체면 0
    function chromAxis(g, y, o) {
        if (o.chromatids === 1) return 0;
        var a = g.a;
        var offArm = a + o.gap / 2;
        var offCen = a * g.style.neck * 0.9;
        var u = Math.abs(y - g.yc);
        // 짧은 팔(달린 염색체 p, Y p)에서는 끝까지 수렴하지 않게 팔 길이의 절반 남짓으로 줄인다
        var span = Math.min(Math.max(g.reach, 1.5 * a) * 1.6, (y < g.yc ? g.pLen : g.qLen) * 0.55);
        return offCen + (offArm - offCen) * smoothstep(u / span) + u * Math.tan(o.splay * Math.PI / 180);
    }

    function chromSampleYs(g, o) {
        var ys = [0, g.T];
        var a = g.a;
        var k;
        for (k = 1; k <= 8; k++) {
            var th = k / 8 * Math.PI / 2;
            ys.push(g.ryT * (1 - Math.cos(th)));
            ys.push(g.T - g.ryB * (1 - Math.cos(th)));
        }
        for (k = -6; k <= 6; k++) ys.push(g.yc + k / 6 * (k < 0 ? g.reachP : g.reachQ));
        if (g.stalk) {
            var e = Math.min(a * 0.5, (g.stalk[1] - g.stalk[0]) / 3);
            for (var edge = 0; edge < 2; edge++) {
                for (k = -3; k <= 3; k++) ys.push(g.stalk[edge] + k / 3 * e);
            }
        }
        if (g.style.bulge > 0 || o.chromatids === 2) {
            for (var y = a * 0.8; y < g.T; y += a * 0.8) ys.push(y);
        }
        ys.sort(function(p, q) { return p - q; });
        var out = [];
        for (var i = 0; i < ys.length; i++) {
            if (ys[i] < 0 || ys[i] > g.T) continue;
            if (out.length === 0 || ys[i] - out[out.length - 1] > 0.0001) out.push(ys[i]);
        }
        return out;
    }

    // sign: -1 왼쪽 분체, +1 오른쪽 분체. 점은 [x, y](y는 아래로 커짐), 1분체는 sign 무시
    function chromOutline(g, o, sign) {
        var ys = chromSampleYs(g, o);
        var left = [];
        var right = [];
        for (var i = 0; i < ys.length; i++) {
            var h = chromHalf(g, ys[i]);
            var c = sign * chromAxis(g, ys[i], o);
            left.push([c - h, ys[i]]);
            right.push([c + h, ys[i]]);
        }
        right.reverse();
        var all = left.concat(right);
        var pts = [];
        for (var j = 0; j < all.length; j++) {
            var last = pts.length > 0 ? pts[pts.length - 1] : null;
            if (last !== null && Math.abs(last[0] - all[j][0]) < 0.0001 && Math.abs(last[1] - all[j][1]) < 0.0001) continue;
            pts.push(all[j]);
        }
        var first = pts[0];
        var tail = pts[pts.length - 1];
        if (pts.length > 1 && Math.abs(first[0] - tail[0]) < 0.0001 && Math.abs(first[1] - tail[1]) < 0.0001) pts.pop();
        return pts;
    }

    // 밴드 단계: 1~4 gpos25~100, 5 변이 이질염색질. 0(밝음)·6(자루)·7(동원체)는 칠하지 않는다
    function chromBands(g) {
        var runs = [];
        function addArm(str, y0, len) {
            var n = str.length;
            var i = 0;
            while (i < n) {
                var j = i;
                while (j + 1 < n && str.charAt(j + 1) === str.charAt(i)) j++;
                var lev = str.charCodeAt(i) - 48;
                if (lev >= 1 && lev <= 5) runs.push({ y0: y0 + len * i / n, y1: y0 + len * (j + 1) / n, lev: lev });
                i = j + 1;
            }
        }
        addArm(g.pStr, 0, g.pLen);
        addArm(g.qStr, g.yc, g.qLen);
        return runs;
    }

    // 염색체 하나의 가로 너비(단위): 두 분체와 벌림을 모두 포함
    function chromWidth(g, o) {
        var ys = chromSampleYs(g, o);
        var wide = 0;
        for (var i = 0; i < ys.length; i++) {
            var edge = chromAxis(g, ys[i], o) + chromHalf(g, ys[i]);
            if (edge > wide) wide = edge;
        }
        return 2 * wide;
    }

    // 사각형(W×H, 왼쪽 위 기준, y는 아래로)에 맞춰 칸마다 위치를 정한다. 염색체 크기는 가장 빡빡한 쪽에 맞추고
    // 남는 가로·세로는 열 간격·줄 간격으로 나눠 사각형을 채운다.
    // o: chromGeom의 옵션 + { pairGap, labelGap, fontSize, margin } (뒤의 넷은 pt)
    function layoutKaryotype(rows, o, W, H) {
        var MIN_ROW_GAP = 10;      // 줄 사이 최소 간격(단위)
        var MIN_COL_GAP = 0.2;     // 열 사이 최소 간격(염색체 칸 너비의 배수)
        var r, c, i;
        var rowMax = [];
        var unitWmax = 0;
        var gapMax = 0;
        var colSpan = 0;
        var sumRowMax = 0;
        for (r = 0; r < rows.length; r++) {
            rowMax.push(0);
            for (c = 0; c < rows[r].length; c++) {
                var cell = rows[r][c];
                cell.widths = [];
                var sum = 0;
                for (i = 0; i < cell.variants.length; i++) {
                    var g = chromGeom(cell.id, cell.variants[i], o);
                    var w = chromWidth(g, o);
                    cell.widths.push(w);
                    sum += w;
                    if (g.T > rowMax[r]) rowMax[r] = g.T;
                }
                cell.sum = sum;
                if (sum > unitWmax) unitWmax = sum;
                var gaps = (cell.variants.length - 1) * o.pairGap;
                if (gaps > gapMax) gapMax = gaps;
                if (cell.col > colSpan) colSpan = cell.col;
            }
            sumRowMax += rowMax[r];
        }
        var nr = rows.length;
        var labelH = o.fontSize * 0.72;
        var labelBlock = o.labelGap + labelH;
        var availW = W - 2 * o.margin;
        var availH = H - 2 * o.margin;
        var sH = (availH - nr * labelBlock) / (sumRowMax + (nr - 1) * MIN_ROW_GAP);
        var sW = (availW - (colSpan + 1) * gapMax) / (unitWmax * ((1 + MIN_COL_GAP) * colSpan + 1));
        var s = Math.max(0.01, Math.min(sH, sW));
        var cellW = s * unitWmax + gapMax;
        var pitch = colSpan > 0 ? (availW - cellW) / colSpan : 0;
        var rowGap = nr > 1 ? (availH - s * sumRowMax - nr * labelBlock) / (nr - 1) : 0;
        var y = o.margin + (nr > 1 ? 0 : (availH - s * sumRowMax - labelBlock) / 2);
        var out = [];
        for (r = 0; r < nr; r++) {
            var bottom = y + s * rowMax[r];
            var labelBase = bottom + o.labelGap + labelH;
            for (c = 0; c < rows[r].length; c++) {
                var cl = rows[r][c];
                var cx = colSpan > 0 ? o.margin + cellW / 2 + cl.col * pitch : o.margin + availW / 2;
                var total = s * cl.sum + (cl.variants.length - 1) * o.pairGap;
                var x = cx - total / 2;
                var items = [];
                for (i = 0; i < cl.variants.length; i++) {
                    items.push({ variant: cl.variants[i], x: x + s * cl.widths[i] / 2 });
                    x += s * cl.widths[i] + o.pairGap;
                }
                out.push({ id: cl.id, cx: cx, bottom: bottom, labelBase: labelBase, items: items });
            }
            y = labelBase + rowGap;
        }
        return { s: s, cells: out };
    }
    // ==== 순수 기하 끝 ====


    var PREF_KEY = "ObjectKaryotype/settings";
    var SETTINGS_TAG = "v1";
    var SETTINGS_LENGTH = 18;
    var MM = 2.834645669;
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var PREVIEW_NAME = "Karyotype_Preview";
    var LABEL_WIDTH = 120;
    var SLIDER_WIDTH = 196;
    var BASE_WIDTH = 7;            // 분체 너비 (단위: 1번 염색체 길이 100)
    var CHROMATID_GAP = 0.8;       // 두 분체 사이 (같은 단위)
    var KARY_CODES = ["normal", "down", "klinefelter", "turner", "cridu"];
    var KARY_NAMES = ["정상", "다운 증후군 (21번 3개)", "클라인펠터 증후군 (XXY)", "터너 증후군 (X0)", "고양이 울음 증후군 (5p−)"];
    var SHAPE_NAMES = ["기하학적 (둥근 사각형)", "중간", "실제에 가까운 모양"];
    var COLORS = [
        { name: "검정", cmyk: [0, 0, 0, 100], rgb: [35, 31, 32] },
        { name: "파랑", cmyk: [85, 65, 30, 10], rgb: [58, 88, 130] },
        { name: "청록", cmyk: [80, 15, 25, 0], rgb: [20, 160, 185] },
        { name: "보라", cmyk: [65, 75, 10, 0], rgb: [115, 80, 150] }
    ];
    // 밴드 단계(1~4 = gpos25~100, 5 = 변이 이질염색질)별 진하기와 밑바탕 진하기
    var BAND_DARK = [0, 0.30, 0.52, 0.76, 1.0, 0.62];
    var BASE_TINT = 0.16;
    // 입체 음영: [위치%, 검정(0)/흰색(1), 불투명도%]. 좌우 대칭이라 오른쪽 분체를 그대로 따라 그려도 일관된다
    var SHADE_STOPS = [[0, 0, 55], [20, 0, 20], [42, 1, 14], [50, 1, 20], [58, 1, 14], [80, 0, 20], [100, 0, 55]];
    var SHADE_NAME = "Karyotype shade";
    var THICK_RANGE = [50, 200];
    var SPLAY_RANGE = [0, 15];
    var MARGIN_RANGE = [0, 30];
    var GAP_RANGE = [0, 10];
    var FONT_RANGE = [4, 24];
    var POSITION_LIMIT_MM = 200;

    var doc = app.activeDocument;
    var frameItem = findFrameItem(doc.selection);
    if (frameItem === null) {
        alert("핵형을 넣을 사각형을 선택해주세요.");
        return;
    }
    var fb = frameItem.geometricBounds;
    var frameLeft = Math.min(fb[0], fb[2]);
    var frameTop = Math.max(fb[1], fb[3]);
    var frameW = Math.abs(fb[2] - fb[0]);
    var frameH = Math.abs(fb[1] - fb[3]);

    var engFont = findTextFont([ENG_FONT_NAME]);
    var layer = findEditableLayer();
    removeLeftoverGroups();

    // 옵션
    var chromText = "";
    var karyIdx = 0;
    var sexIdx = 0;
    var shapeIdx = 2;
    var gbandOn = false;
    var chromatidCount = 2;
    var shadeOn = false;
    var colorIdx = 0;
    var splayDeg = 0;
    var thickPct = 100;
    var marginMm = 4;
    var pairGapMm = 1.5;
    var labelGapMm = 1.5;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var previewGroup = null;
    var shadeGradient = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "사람의 핵형");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var chromPanel = addPanel(dlg, "염색체");
    var listRow = chromPanel.add("group");
    listRow.alignChildren = ["left", "center"];
    listRow.add("statictext", undefined, "표시:").preferredSize.width = LABEL_WIDTH;
    var listInput = listRow.add("edittext", undefined, chromText);
    listInput.characters = 28;
    listInput.helpTip = "비우면 전체. 쉼표로 구분하고 연속은 ~ 로 쓴다. 예: 1, 2, 3~8, X, Y";
    var listNote = chromPanel.add("statictext", undefined, "");
    listNote.preferredSize.width = LABEL_WIDTH + 270;
    var karyRow = chromPanel.add("group");
    karyRow.alignChildren = ["left", "center"];
    karyRow.add("statictext", undefined, "핵형:").preferredSize.width = LABEL_WIDTH;
    var karyList = karyRow.add("dropdownlist", undefined, KARY_NAMES);
    var sexRow = chromPanel.add("group");
    sexRow.alignChildren = ["left", "center"];
    sexRow.add("statictext", undefined, "성별:").preferredSize.width = LABEL_WIDTH;
    var sexRadios = [sexRow.add("radiobutton", undefined, "남자 (XY)"), sexRow.add("radiobutton", undefined, "여자 (XX)")];

    var shapePanel = addPanel(dlg, "모양");
    var shapeRow = shapePanel.add("group");
    shapeRow.alignChildren = ["left", "center"];
    shapeRow.add("statictext", undefined, "염색체 모양:").preferredSize.width = LABEL_WIDTH;
    var shapeList = shapeRow.add("dropdownlist", undefined, SHAPE_NAMES);
    var chromatidRow = shapePanel.add("group");
    chromatidRow.alignChildren = ["left", "center"];
    chromatidRow.add("statictext", undefined, "염색 분체:").preferredSize.width = LABEL_WIDTH;
    var chromatidRadios = [chromatidRow.add("radiobutton", undefined, "1개"), chromatidRow.add("radiobutton", undefined, "2개")];
    var gbandCheck = chromatidRow.add("checkbox", undefined, "G 밴드");
    var renderRow = shapePanel.add("group");
    renderRow.alignChildren = ["left", "center"];
    renderRow.add("statictext", undefined, "표현:").preferredSize.width = LABEL_WIDTH;
    var renderRadios = [renderRow.add("radiobutton", undefined, "평면 (단색)"), renderRow.add("radiobutton", undefined, "입체")];
    var colorRow = shapePanel.add("group");
    colorRow.alignChildren = ["left", "center"];
    colorRow.add("statictext", undefined, "색:").preferredSize.width = LABEL_WIDTH;
    var colorNames = [];
    for (var cn = 0; cn < COLORS.length; cn++) colorNames.push(COLORS[cn].name);
    var colorList = colorRow.add("dropdownlist", undefined, colorNames);
    var splayRow = addValueRow(shapePanel, "분체 벌림", "°", splayDeg, SPLAY_RANGE[0], SPLAY_RANGE[1], 0.5, 1);
    splayRow.input.helpTip = "0이면 나란히, 키우면 X자로 벌어진다 (분체 2개일 때)";
    var thickRow = addValueRow(shapePanel, "굵기", "%", thickPct, THICK_RANGE[0], THICK_RANGE[1], 5, 0);

    var layoutPanel = addPanel(dlg, "배치");
    var marginRow = addValueRow(layoutPanel, "사각형 안쪽 여백", "mm", marginMm, MARGIN_RANGE[0], MARGIN_RANGE[1], 0.5, 1);
    var pairGapRow = addValueRow(layoutPanel, "상동 염색체 간격", "mm", pairGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.1, 1);
    var labelGapRow = addValueRow(layoutPanel, "번호 간격", "mm", labelGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.1, 1);
    labelGapRow.input.helpTip = "염색체 아래끝과 번호(X, Y 포함) 사이";
    var fontRow = addValueRow(layoutPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    listInput.text = chromText;
    karyList.selection = karyIdx;
    shapeList.selection = shapeIdx;
    colorList.selection = colorIdx;
    chromatidRadios[chromatidCount - 1].value = true;
    renderRadios[shadeOn ? 1 : 0].value = true;
    gbandCheck.value = gbandOn;
    previewCheck.value = previewEnabled;
    syncSex();
    syncEnabled();
    showListNote();

    listInput.onChanging = function() { showListNote(); };
    listInput.onChange = function() {
        chromText = listInput.text;
        showListNote();
        updatePreview();
    };
    karyList.onChange = function() {
        if (karyList.selection === null) return;
        karyIdx = karyList.selection.index;
        syncSex();
        updatePreview();
    };
    for (var sr = 0; sr < sexRadios.length; sr++) {
        sexRadios[sr].onClick = (function(index) {
            return function() { sexIdx = index; updatePreview(); };
        })(sr);
    }
    shapeList.onChange = function() {
        if (shapeList.selection === null) return;
        shapeIdx = shapeList.selection.index;
        updatePreview();
    };
    for (var cr = 0; cr < chromatidRadios.length; cr++) {
        chromatidRadios[cr].onClick = (function(index) {
            return function() { chromatidCount = index + 1; syncEnabled(); updatePreview(); };
        })(cr);
    }
    gbandCheck.onClick = function() { gbandOn = gbandCheck.value; updatePreview(); };
    for (var rr = 0; rr < renderRadios.length; rr++) {
        renderRadios[rr].onClick = (function(index) {
            return function() { shadeOn = index === 1; updatePreview(); };
        })(rr);
    }
    colorList.onChange = function() {
        if (colorList.selection === null) return;
        colorIdx = colorList.selection.index;
        updatePreview();
    };
    bindValueRow(splayRow, function() { return splayDeg; }, function(v) { splayDeg = v; });
    bindValueRow(thickRow, function() { return thickPct; }, function(v) { thickPct = v; });
    bindValueRow(marginRow, function() { return marginMm; }, function(v) { marginMm = v; });
    bindValueRow(pairGapRow, function() { return pairGapMm; }, function(v) { pairGapMm = v; });
    bindValueRow(labelGapRow, function() { return labelGapMm; }, function(v) { labelGapMm = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        chromText = listInput.text;
        if (previewGroup === null) buildPreview();
        saveSettings();
        dlg.close(1);
    };

    doc.selection = null;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var confirmed = dlg.show() === 1;
    if (!confirmed) clearPreview();
    if (confirmed && previewGroup !== null) {
        previewGroup.name = "핵형";
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // 클라인펠터·터너는 성별이 정해진다
    function syncSex() {
        var forced = effectiveSex(KARY_CODES[karyIdx], sexIdx === 0 ? "M" : "F");
        sexIdx = forced === "M" ? 0 : 1;
        sexRadios[sexIdx].value = true;
        sexRadios[1 - sexIdx].value = false;
        var fixed = KARY_CODES[karyIdx] === "klinefelter" || KARY_CODES[karyIdx] === "turner";
        sexRadios[0].enabled = !fixed;
        sexRadios[1].enabled = !fixed;
    }

    function syncEnabled() {
        splayRow.input.enabled = chromatidCount === 2;
        splayRow.slider.enabled = chromatidCount === 2;
    }

    function showListNote() {
        var parsed = parseChromList(listInput.text);
        var note;
        if (parsed.ids.length === 0) note = "전체 " + KARYO_ORDER.length + "종을 표시합니다.";
        else note = parsed.ids.length + "종: " + parsed.ids.join(", ");
        if (parsed.bad.length > 0) note += "  (알 수 없음: " + parsed.bad.join(", ") + ")";
        listNote.text = note;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
            previewGroup = null;
        }
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

    function removeLeftoverGroups() {
        for (var i = layer.groupItems.length - 1; i >= 0; i--) {
            try {
                if (layer.groupItems[i].name === PREVIEW_NAME) layer.groupItems[i].remove();
            } catch (e) {}
        }
    }

    function geomOptions() {
        var thick = thickPct / 100;
        return {
            style: shapeIdx, wc: BASE_WIDTH * thick, chromatids: chromatidCount, splay: splayDeg,
            gap: CHROMATID_GAP * thick, pairGap: pairGapMm * MM, labelGap: labelGapMm * MM,
            fontSize: fontPt, margin: marginMm * MM
        };
    }

    function buildPreview() {
        var parsed = parseChromList(chromText);
        var ids = parsed.ids.length > 0 ? parsed.ids : KARYO_ORDER.slice(0);
        var rows = buildCells(ids, KARY_CODES[karyIdx], sexIdx === 0 ? "M" : "F");
        previewGroup = layer.groupItems.add();
        previewGroup.name = PREVIEW_NAME;
        if (rows.length === 0) return;

        var opts = geomOptions();
        var lay = layoutKaryotype(rows, opts, frameW, frameH);
        var paint = makePaint();
        var protos = {};
        for (var i = 0; i < lay.cells.length; i++) {
            var cell = lay.cells[i];
            for (var k = 0; k < cell.items.length; k++) {
                var item = cell.items[k];
                var key = cell.id + "|" + item.variant;
                var g = chromGeom(cell.id, item.variant, opts);
                var ox = frameLeft + item.x;
                var oy = frameTop - (cell.bottom - g.T * lay.s);
                if (protos[key]) {
                    var copy = protos[key].group.duplicate(previewGroup, ElementPlacement.PLACEATBEGINNING);
                    copy.translate(ox - protos[key].ox, oy - protos[key].oy);
                } else {
                    var chrom = previewGroup.groupItems.add();
                    chrom.name = "염색체 " + cell.id;
                    drawChromosome(chrom, g, opts, lay.s, ox, oy, paint);
                    protos[key] = { group: chrom, ox: ox, oy: oy };
                }
            }
            addLabel(cell.id, frameLeft + cell.cx, frameTop - cell.labelBase);
        }
        movePreview(offsetXmm * MM, offsetYmm * MM);
    }

    // 염색체 하나: 분체 1개면 그대로, 2개면 왼쪽·오른쪽을 차례로 그린다
    function drawChromosome(parent, g, opts, s, ox, oy, paint) {
        if (opts.chromatids === 1) {
            drawChromatid(parent, g, opts, 1, s, ox, oy, paint);
        } else {
            drawChromatid(parent, g, opts, -1, s, ox, oy, paint);
            drawChromatid(parent, g, opts, 1, s, ox, oy, paint);
        }
    }

    function drawChromatid(parent, g, opts, sign, s, ox, oy, paint) {
        var outline = chromOutline(g, opts, sign);
        var pts = [];
        var minX = 1e9;
        var maxX = -1e9;
        for (var i = 0; i < outline.length; i++) {
            pts.push([ox + outline[i][0] * s, oy - outline[i][1] * s]);
            if (pts[i][0] < minX) minX = pts[i][0];
            if (pts[i][0] > maxX) maxX = pts[i][0];
        }
        if (!gbandOn && !shadeOn) {
            var flat = parent.pathItems.add();
            writePoly(flat, pts, paint.tint(1));
            return flat;
        }
        var box = parent.groupItems.add();
        var base = box.pathItems.add();
        writePoly(base, pts, paint.tint(gbandOn ? BASE_TINT : 1));
        if (gbandOn) {
            var runs = chromBands(g);
            for (var r = 0; r < runs.length; r++) {
                var band = box.pathItems.rectangle(oy - runs[r].y0 * s, minX - 1, maxX - minX + 2, (runs[r].y1 - runs[r].y0) * s);
                band.stroked = false;
                band.fillColor = paint.tint(BASE_TINT + (1 - BASE_TINT) * BAND_DARK[runs[r].lev]);
            }
        }
        if (shadeOn) {
            var shade = base.duplicate(box, ElementPlacement.PLACEATBEGINNING);
            applyShade(shade);
        }
        if (gbandOn) {
            base.duplicate(box, ElementPlacement.PLACEATBEGINNING);
            box.clipped = true;
        }
        return box;
    }

    function writePoly(path, pts, color) {
        path.setEntirePath(pts);
        path.closed = true;
        path.stroked = false;
        path.filled = true;
        path.fillColor = color;
    }

    // 색은 문서 색상 모드에 맞춘다. t = 진하기(0~1, 흰색 → 본색)
    function makePaint() {
        var main = COLORS[colorIdx];
        var cmyk = doc.documentColorSpace === DocumentColorSpace.CMYK;
        var cache = {};
        return {
            tint: function(t) {
                var key = String(Math.round(t * 1000));
                if (cache[key]) return cache[key];
                var color;
                if (cmyk) {
                    color = new CMYKColor();
                    color.cyan = main.cmyk[0] * t;
                    color.magenta = main.cmyk[1] * t;
                    color.yellow = main.cmyk[2] * t;
                    color.black = main.cmyk[3] * t;
                } else {
                    color = new RGBColor();
                    color.red = 255 - (255 - main.rgb[0]) * t;
                    color.green = 255 - (255 - main.rgb[1]) * t;
                    color.blue = 255 - (255 - main.rgb[2]) * t;
                }
                cache[key] = color;
                return color;
            }
        };
    }

    function solidColor(v) {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = v === 0 ? 100 : 0;
        } else {
            color = new RGBColor();
            color.red = v === 0 ? 0 : 255;
            color.green = v === 0 ? 0 : 255;
            color.blue = v === 0 ? 0 : 255;
        }
        return color;
    }

    // 입체 음영: 투명도가 있는 좌우 대칭 그라데이션을 위에 덧씌운다.
    // 스크립트에서는 그라데이션 각도가 무시되고 마지막 각도가 붙으므로 읽어서 0으로 되돌린다
    function applyShade(path) {
        if (shadeGradient === null) {
            try { shadeGradient = doc.gradients.getByName(SHADE_NAME); } catch (e) { shadeGradient = null; }
            if (shadeGradient === null) {
                shadeGradient = doc.gradients.add();
                shadeGradient.name = SHADE_NAME;
                shadeGradient.type = GradientType.LINEAR;
                while (shadeGradient.gradientStops.length < SHADE_STOPS.length) shadeGradient.gradientStops.add();
                for (var i = 0; i < SHADE_STOPS.length; i++) {
                    var stop = shadeGradient.gradientStops[i];
                    stop.rampPoint = SHADE_STOPS[i][0];
                    stop.color = solidColor(SHADE_STOPS[i][1]);
                    stop.opacity = SHADE_STOPS[i][2];
                }
            }
        }
        var gradientColor = new GradientColor();
        gradientColor.gradient = shadeGradient;
        path.filled = true;
        path.fillColor = gradientColor;
        path.rotate(0 - path.fillColor.angle, false, false, true, false, Transformation.CENTER);
    }

    // 번호는 영문·숫자라 GSMediumB1(기준선 +0.5pt). 글자 가운데를 x, 기준선을 baseline에 맞춘다
    function addLabel(text, x, baseline) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        var range = frame.textRange;
        var attributes = range.characterAttributes;
        attributes.size = fontPt;
        attributes.textFont = engFont;
        attributes.baselineShift = ENG_BASELINE_PT;
        attributes.fillColor = solidColor(0);
        var b = frame.geometricBounds;
        var anchor = frame.anchor;
        frame.translate(x - (b[0] + b[2]) / 2, baseline - anchor[1]);
        return frame;
    }

    // -------------------------------------------------------
    // 대상·레이어·서체
    // -------------------------------------------------------
    function findFrameItem(items) {
        if (!items) return null;
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i].geometricBounds) return items[i];
            } catch (e) {}
        }
        return null;
    }

    // 잠기거나 숨긴 레이어에 넣으면 MRAP 오류가 난다. 편집할 수 있는 레이어를 고른다
    function findEditableLayer() {
        var active = doc.activeLayer;
        if (!active.locked && active.visible) return active;
        for (var i = 0; i < doc.layers.length; i++) {
            if (!doc.layers[i].locked && doc.layers[i].visible) return doc.layers[i];
        }
        return doc.layers.add();
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.alignChildren = ["left", "top"];
        panel.margins = [12, 16, 12, 12];
        panel.spacing = 6;
        return panel;
    }

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(value, decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
    }

    // 값이 바뀌면 상태에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, getter, setter) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === getter()) return;
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM;
            setter(value);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function parseNumber(text) {
        var value = parseFloat(String(text).replace(",", ".").replace(/[^0-9.\-]/g, ""));
        return isNaN(value) ? null : value;
    }

    function clamp(value, minimum, maximum) {
        if (value < minimum) return minimum;
        if (value > maximum) return maximum;
        return value;
    }

    function roundTo(value, step) {
        if (step <= 0) return value;
        return Math.round(value / step) * step;
    }

    function formatNumber(value, decimals) {
        var factor = Math.pow(10, decimals);
        var rounded = Math.round(value * factor) / factor;
        var text = String(rounded);
        if (decimals <= 0) return text;
        var dot = text.indexOf(".");
        if (dot === -1) {
            text += ".";
            dot = text.length - 1;
        }
        while (text.length - dot - 1 < decimals) text += "0";
        return text;
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            SETTINGS_TAG,
            chromText.split("|").join(""),
            karyIdx, sexIdx, shapeIdx,
            gbandOn ? "1" : "0",
            chromatidCount,
            shadeOn ? "1" : "0",
            colorIdx, splayDeg, thickPct, marginMm, pairGapMm, labelGapMm, fontPt,
            offsetXmm, offsetYmm,
            previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== SETTINGS_TAG || p.length !== SETTINGS_LENGTH) return;
        chromText = p[1];
        karyIdx = restoreNumber(p[2], karyIdx, [0, KARY_CODES.length - 1], 1);
        sexIdx = restoreNumber(p[3], sexIdx, [0, 1], 1);
        shapeIdx = restoreNumber(p[4], shapeIdx, [0, SHAPE_NAMES.length - 1], 1);
        gbandOn = p[5] === "1";
        chromatidCount = restoreNumber(p[6], chromatidCount, [1, 2], 1);
        shadeOn = p[7] === "1";
        colorIdx = restoreNumber(p[8], colorIdx, [0, COLORS.length - 1], 1);
        splayDeg = restoreNumber(p[9], splayDeg, SPLAY_RANGE, 0.5);
        thickPct = restoreNumber(p[10], thickPct, THICK_RANGE, 5);
        marginMm = restoreNumber(p[11], marginMm, MARGIN_RANGE, 0.5);
        pairGapMm = restoreNumber(p[12], pairGapMm, GAP_RANGE, 0.1);
        labelGapMm = restoreNumber(p[13], labelGapMm, GAP_RANGE, 0.1);
        fontPt = restoreNumber(p[14], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[15], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[16], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[17] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
