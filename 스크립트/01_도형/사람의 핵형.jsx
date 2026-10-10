// 사람의 핵형.jsx
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

// 사람의 핵형: 사각형을 선택하고 실행하면 그 안에 데버(Denver) 배치로 22쌍의 상염색체와 성염색체를 그린다.
//   - 표시: 비우면 전체. "1, 2, 3~8, X, Y"처럼 쉼표로 나누고 연속은 ~ 로 쓴다.
//   - 핵형: 정상 / 다운(21번 3개) / 클라인펠터(XXY) / 터너(X0) / 고양이 울음(5번 한 쪽 5p15.2 끝까지 결실).
//   - 모양: 기하학적(Sadava 교재: 둥근 사각형 팔 + 동원체 원, 밴드는 한 색 줄) / 중간(Brown 교재: 부드러운 목으로 이어진 막대) /
//     실제(굵고 둥근 팔, 두 분체가 떨어져 서다 동원체에서 합쳐지는 X자). 염색 분체 1개 또는 2개. G 밴드 유무.
//     동원체는 원 하나(두 분체를 덮음) / 분체마다 맞닿는 원 / 없음. 벌림은 동원체에서 비스듬히 나가다 수직으로 꺾인다.
//     달린 염색체(13~15·21·22)의 p팔은 위성·자루 없이 짧은 팔로 그린다(중등 교재용).
//   - 표현: 평면 단색(K 10단위) / 윤곽선(흰 바탕 + 선) / 입체(투명도 그라데이션 음영, 강도 조절).
//   - 크기와 p/q 비율: RERF(방사선영향연구소) Giemsa 핵형 표 2의 상대 길이(p:q). 1번 염색체 길이를 100으로 둔다.
//     G 밴드 무늬: UCSC hg38 cytoBand의 밴드 단계(gpos25~100·gvar)를 각 팔 길이의 1/64 칸으로 모은 것.
//   - 사각형 크기에 맞춰 배치하고, 남는 가로·세로는 열·줄 간격으로 나눠 사각형을 채운다.
//   - 선택이 없으면 마지막에 쓴 크기(없으면 기본 크기)로 대지 가운데에 그린다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    // ==== 순수 기하 시작 (tests/check-karyotype.js 가 이 구간을 그대로 읽는다) ====
    var KARYO_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "X", "Y"];
    // 염색체: [상대 길이, p팔 상대 길이(RERF Giemsa 표 2), p팔 밴드, q팔 밴드(UCSC hg38, 팔을 1/64 칸으로 나눈 단계)]
    var KARYO_DATA = {
        "1": [9.11, 4.43, "01020101101030112244441222230210", "55555020111021104141010343011320"],
        "2": [8.61, 3.35, "0102131122201424120144007", "702102112114241130320012313010430233010"],
        "3": [6.97, 3.30, "21100342222113001110120131127", "75503112221001010440211440221301300"],
        "4": [6.49, 1.80, "00002031024410207", "70144113111123231220023112144311010441441324101"],
        "5": [6.21, 1.66, "00012024240010027", "70013322202234430142431144004101003302024420100"],
        "6": [6.07, 2.30, "0112113331210110044240", "744200222210343340001344422211312202002100"],
        "7": [5.43, 2.01, "010442241022331331323207", "7002200344322231000233022130012101320100"],
        "8": [4.94, 1.62, "03200144201213331107", "70102222211143333044300100231442210121013100"],
        "9": [4.78, 1.56, "01002320134404420110", "75555555501102211202110110343011033101100000"],
        "10": [4.80, 1.55, "0003320023212201007", "700102444204440021024413221121144303301002100"],
        "11": [4.82, 1.95, "0122211200342320044410037", "733110102212444214400443444110001101200"],
        "12": [4.50, 1.23, "00101304424422107", "74444010011330210330034422410332122001212002200"],
        "13": [3.87, 0.64, "5556665557", "700101002133100022001440132034302044443044300024124100"],
        "14": [3.74, 0.69, "5566655557", "700034444211344201440010232012012100044224410102221100"],
        "15": [3.30, 0.58, "555666555557", "7000210103333000333003333111001110010220022100022100"],
        "16": [3.14, 1.33, "00000121021022200222000007", "75555550000221244444410021233300210010"],
        "17": [2.97, 0.94, "0012200023331000077", "770000122221110001100333332331120033300000000"],
        "18": [2.78, 0.74, "001222011000777", "7700000344444100133332000133330022004444001110000"],
        "19": [2.46, 1.10, "00000000111111011100005555577", "77555500001111111100111000011000111"],
        "20": [2.25, 1.03, "0000033331003333330001000077", "770001110013333111110003333301210000"],
        "21": [1.70, 0.49, "5555666665555557", "700034444444443000133333310000022100122210000000"],
        "22": [1.80, 0.51, "5555566666665555577", "777000001100022222000222222200002222000001200"],
        "X": [5.16, 1.94, "0010222120340442023201007", "702001244414413201003330044411003143000"],
        "Y": [2.21, 0.51, "100000000000", "0022222100222220005555555555555555555555555555555555"]
    };
    var KARYO_L1 = 9.11;         // 1번 염색체 상대 길이 = 기준 길이 100 단위
    var KARYO_UNIT = 100;
    var CRI_CUT_FRAC = 0.307;    // 5p15.2 끝(hg38 15.0 Mb)이 p팔(48.8 Mb)에서 차지하는 비율. 고양이 울음 증후군(5p-)은 여기까지 잘려 나간다

    // 모양 3종은 사용자가 준 참고 그림을 쟀다. widthScale: 분체 너비 배율(기본 7 = 1번 길이의 7%), chromGap: 두 분체 사이(분체 너비 배)
    //   기하학적(Sadava): 둥근 사각형 팔 + 동원체 원 (beads). 바깥 끝 세로 0.81, 팔 끝 반원, 원 지름 0.65w, 팔 사이 틈 0.39w. 밴드는 한 색 줄(binaryBands)
    //   중간(Brown): 알약 두 개가 부드러운 목(0.69, 길이 1.2w)으로 이어진 막대
    //   실제(사람의 핵형.ai): 두 분체가 분체 너비의 0.6배쯤 떨어져 나란히 서다 동원체에서 합쳐지는 X자
    // cap·capY: 끝 모서리 가로 반지름 비율(1 = 반원)·세로 배율, neck: 동원체 목 너비 비율, notchLen: 목 홈의 반 길이(a 배),
    // bell: 홈 곡선 지수, bulge: 팔 가운데 부풂
    var SHAPE_STYLES = [
        { name: "기하학적", beads: true, widthScale: 0.95, chromGap: 0.11, binaryBands: true, neck: 0.654, cap: 1.0, capY: 1.0, notchLen: 1.0, bell: 1, bulge: 0 },
        { name: "중간", beads: false, widthScale: 0.65, chromGap: 0.11, binaryBands: false, neck: 0.69, cap: 1.0, capY: 1.0, notchLen: 1.2, bell: 1, bulge: 0 },
        { name: "실제", beads: false, widthScale: 1.4, chromGap: 0.35, binaryBands: false, neck: 0.6, cap: 1.0, capY: 1.1, notchLen: 1.3, bell: 1.3, bulge: 0.03 }
    ];
    // 모양을 바꾸면 분체 벌림도 그 모양의 기본값으로 돌아간다 (실제 모양은 p팔이 V자로 벌어진다)
    var SPLAY_PRESET = [0, 0, 10];
    // 분체 벌림: 동원체에서 벌림 각도로 비스듬히 나가다 이 길이(a 배) 안에서 수직으로 꺾인다. 짧은 팔은 끝까지 비스듬하다
    var KNEE_LEN = 4;
    // 기하학적 모양의 치수 (팔 너비의 반 a 기준). 동원체 원 반지름은 모든 모양의 동원체 원에 쓴다
    var BEAD_RADIUS = 0.654;
    var BEAD_GAP = 0.39;
    var BEAD_OUTER_CAP = 0.81;

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
    // o: { style, wc(분체 너비 기준값), chromatids(1|2), splay(도), centromere(one|each|none) }
    function chromGeom(id, variant, o) {
        var d = KARYO_DATA[id];
        var st = SHAPE_STYLES[o.style];
        var f = KARYO_UNIT / KARYO_L1;
        var pStr = d[2];
        var qStr = d[3];
        var pLen = d[1] * f;
        var qLen = (d[0] - d[1]) * f;
        if (variant === "del5p") {
            var drop = Math.round(pStr.length * Math.min(CRI_CUT_FRAC, 0.9));
            pLen = pLen * (1 - drop / pStr.length);
            pStr = pStr.substring(drop);
        }
        var wc = o.wc * st.widthScale;
        var a = wc / 2;
        var g = {
            id: id, style: st, a: a, pLen: pLen, qLen: qLen, T: pLen + qLen, yc: pLen,
            pStr: pStr, qStr: qStr, gap: wc * st.chromGap, beads: null
        };
        if (st.beads) {
            g.reach = a;
            g.beads = beadParts(g);
        } else {
            g.reach = a * st.notchLen;
            g.reachP = Math.min(g.reach, pLen * 0.3);
            g.reachQ = Math.min(g.reach, qLen * 0.5);
            g.ryT = Math.min(st.cap * a * st.capY, Math.max(0.3 * a, g.yc - g.reachP));
            g.ryB = Math.min(st.cap * a * st.capY, Math.max(0.3 * a, g.qLen - g.reachQ));
        }
        return g;
    }

    // 기하학적 모양: 위·아래 팔(둥근 사각형) 사이를 띄운다 (동원체 원은 centromereCircles가 따로 그린다).
    // 짧은 팔은 끝 둥글기를 같은 비율로 줄여 타원으로 만든다
    function beadParts(g) {
        var a = g.a;
        var pEnd = g.yc - BEAD_GAP * a;
        var qStart = g.yc + BEAD_GAP * a;
        var sp = Math.min(1, Math.max(0.05, pEnd) / ((BEAD_OUTER_CAP + 1) * a));
        var sq = Math.min(1, Math.max(0.05, g.T - qStart) / ((BEAD_OUTER_CAP + 1) * a));
        return {
            pEnd: pEnd, qStart: qStart,
            pOuter: BEAD_OUTER_CAP * a * sp, pInner: a * sp,
            qOuter: BEAD_OUTER_CAP * a * sq, qInner: a * sq
        };
    }

    function capFactor(t) {
        return t <= 0 ? 1 : Math.sqrt(Math.max(0, 1 - t * t));
    }

    function beadHalf(g, y) {
        var b = g.beads;
        var a = g.a;
        var h = 0;
        var t;
        if (y >= 0 && y <= b.pEnd) {
            t = 1;
            if (y < b.pOuter) t = capFactor((b.pOuter - y) / b.pOuter);
            if (y > b.pEnd - b.pInner) t = Math.min(t, capFactor((y - (b.pEnd - b.pInner)) / b.pInner));
            h = Math.max(h, a * t);
        }
        if (y >= b.qStart && y <= g.T) {
            t = 1;
            if (y > g.T - b.qOuter) t = capFactor((y - (g.T - b.qOuter)) / b.qOuter);
            if (y < b.qStart + b.qInner) t = Math.min(t, capFactor((b.qStart + b.qInner - y) / b.qInner));
            h = Math.max(h, a * t);
        }
        return h;
    }

    function chromHalf(g, y) {
        if (g.beads) return beadHalf(g, y);
        var a = g.a;
        var st = g.style;
        var w = 1;
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
            t = (1 + Math.cos(Math.PI * u / reach)) / 2;
            w *= 1 - (1 - st.neck) * Math.pow(t, st.bell);
        }
        return Math.max(0, a * w);
    }

    // 벌림으로 생기는 가로 이동: 동원체에서 u만큼 떨어진 곳. 처음엔 기울기 tan(벌림)으로 나가다 L 안에서 수직이 된다
    function kneeOffset(u, L, splayDeg) {
        var t = Math.min(u, L) / L;
        return Math.tan(splayDeg * Math.PI / 180) * L * (t - t * t * t / 3);
    }

    // 오른쪽 분체의 중심선 x. 동원체에서 안쪽 가장자리가 맞닿고 팔로 갈수록 벌어진다. 1분체면 0
    function chromAxis(g, y, o) {
        if (o.chromatids === 1) return 0;
        var a = g.a;
        var offArm = a + g.gap / 2;
        var u = Math.abs(y - g.yc);
        var bend = kneeOffset(u, KNEE_LEN * a, o.splay);
        // 기하학적 모양은 막대 두 개가 나란히 선다 (동원체 원도 따로)
        if (g.beads) return offArm + bend;
        var offCen = a * g.style.neck * 0.9;
        // 짧은 팔(달린 염색체 p, Y p)에서는 끝까지 수렴하지 않게 팔 길이의 절반 남짓으로 줄인다
        var span = Math.min(Math.max(g.reach, 1.5 * a) * 1.6, (y < g.yc ? g.pLen : g.qLen) * 0.55);
        return offCen + (offArm - offCen) * smoothstep(u / span) + bend;
    }

    // 동원체 원. mode: "one" 두 분체를 덮는 원 하나 / "each" 분체마다 서로 맞닿는 원 / "none"
    function centromereCircles(g, o, mode) {
        if (mode === "none") return [];
        var a = g.a;
        var ax = chromAxis(g, g.yc, o);
        if (o.chromatids === 2 && mode === "each") {
            var rEach = Math.max(BEAD_RADIUS * a, ax);
            return [{ x: -ax, y: g.yc, r: rEach }, { x: ax, y: g.yc, r: rEach }];
        }
        var rOne = Math.max(BEAD_RADIUS * a, ax + (o.chromatids === 2 ? 0.2 * a : 0), chromHalf(g, g.yc) + 0.1 * a);
        return [{ x: 0, y: g.yc, r: rOne }];
    }

    function chromSampleYs(g, o) {
        var ys = [0, g.T];
        var a = g.a;
        var k;
        var th;
        if (g.beads) {
            var b = g.beads;
            for (k = 1; k <= 8; k++) {
                th = k / 8 * Math.PI / 2;
                ys.push(b.pOuter * (1 - Math.cos(th)));
                ys.push(g.T - b.qOuter * (1 - Math.cos(th)));
                ys.push(b.pEnd - b.pInner * (1 - Math.sin(th)));
                ys.push(b.qStart + b.qInner * (1 - Math.sin(th)));
            }
            for (var yy = b.pEnd - b.pInner; yy < b.qStart + b.qInner; yy += a / 8) ys.push(yy);
        } else {
            for (k = 1; k <= 8; k++) {
                th = k / 8 * Math.PI / 2;
                ys.push(g.ryT * (1 - Math.cos(th)));
                ys.push(g.T - g.ryB * (1 - Math.cos(th)));
            }
            for (k = -6; k <= 6; k++) ys.push(g.yc + k / 6 * (k < 0 ? g.reachP : g.reachQ));
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

    // 밴드 단계: 1~4 gpos25~100, 5 변이 이질염색질. 0(밝음)·6(자루)·7(동원체)는 칠하지 않는다.
    // 기하학적 모양은 진한 띠(gpos75·100)만 한 색 줄로 그린다 (단계 4로 통일)
    function chromBands(g) {
        var runs = [];
        var binary = g.style.binaryBands;
        function level(ch) {
            var lev = ch.charCodeAt(0) - 48;
            if (binary) return (lev === 3 || lev === 4) ? 4 : 0;
            return lev;
        }
        function addArm(str, y0, len) {
            var n = str.length;
            var i = 0;
            while (i < n) {
                var j = i;
                var lev = level(str.charAt(i));
                while (j + 1 < n && level(str.charAt(j + 1)) === lev) j++;
                if (lev >= 1 && lev <= 5) runs.push({ y0: y0 + len * i / n, y1: y0 + len * (j + 1) / n, lev: lev });
                i = j + 1;
            }
        }
        addArm(g.pStr, 0, g.pLen);
        addArm(g.qStr, g.yc, g.qLen);
        return runs;
    }

    // 염색체 하나의 가로 너비(단위): 두 분체·벌림·동원체 원을 모두 포함
    function chromWidth(g, o) {
        var ys = chromSampleYs(g, o);
        var wide = 0;
        for (var i = 0; i < ys.length; i++) {
            var edge = chromAxis(g, ys[i], o) + chromHalf(g, ys[i]);
            if (edge > wide) wide = edge;
        }
        var circles = centromereCircles(g, o, o.centromere);
        for (var c = 0; c < circles.length; c++) {
            if (circles[c].x + circles[c].r > wide) wide = circles[c].x + circles[c].r;
        }
        return 2 * wide;
    }

    // 사각형(W×H, 왼쪽 위 기준, y는 아래로)에 맞춰 칸마다 위치를 정한다. 염색체 크기는 가장 빡빡한 쪽에 맞추고
    // 남는 가로·세로는 열 간격·줄 간격으로 나눠 사각형을 채운다.
    // 열(칸) 사이는 상동 염색체 간격의 2배 이상, 칸 너비의 15% 이상 띄운다 — 가로가 빡빡해도 짝이 이웃 칸보다 가깝게 보여야 한다.
    // 그러려면 배율을 최대 25%까지 줄이고, 그래도 모자라면 상동 염색체 간격 쪽을 줄인다 (염색체가 사라지지 않게)
    // o: chromGeom의 옵션 + { pairGap, labelGap, fontSize, margin } (뒤의 넷은 pt)
    function layoutKaryotype(rows, o, W, H) {
        var MIN_ROW_GAP = 10;      // 줄 사이 최소 간격(단위)
        var MIN_COL_GAP = 0.15;    // 열 사이 최소 간격(염색체 칸 너비의 배수)
        var PAIR_GAP_RATIO = 2;    // 열 사이 최소 간격(상동 염색체 간격의 배수)
        var r, c, i;
        var rowMax = [];
        var unitWmax = 0;
        var maxExtra = 0;
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
                if (cell.variants.length - 1 > maxExtra) maxExtra = cell.variants.length - 1;
                if (cell.col > colSpan) colSpan = cell.col;
            }
            sumRowMax += rowMax[r];
        }
        var nr = rows.length;
        var labelH = o.fontSize * 0.72;
        var labelBlock = o.labelGap + labelH;
        var availW = W - 2 * o.margin;
        var availH = H - 2 * o.margin;
        var pairGap = o.pairGap;
        var gapMax = maxExtra * pairGap;
        var sH = (availH - nr * labelBlock) / (sumRowMax + (nr - 1) * MIN_ROW_GAP);
        var sW = (availW - (colSpan + 1) * gapMax) / (unitWmax * ((1 + MIN_COL_GAP) * colSpan + 1));
        var s = Math.max(0.01, Math.min(sH, sW));
        var sP = (availW - (colSpan + 1) * gapMax - colSpan * PAIR_GAP_RATIO * pairGap) / (unitWmax * (colSpan + 1));
        if (sP < s) {
            s = Math.max(sP, 0.75 * s);
            var fit = (availW - (colSpan + 1) * s * unitWmax) / ((colSpan + 1) * maxExtra + colSpan * PAIR_GAP_RATIO);
            if (fit < pairGap) pairGap = Math.max(0, fit);
            gapMax = maxExtra * pairGap;
        }
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
                var total = s * cl.sum + (cl.variants.length - 1) * pairGap;
                var x = cx - total / 2;
                var items = [];
                for (i = 0; i < cl.variants.length; i++) {
                    items.push({ variant: cl.variants[i], x: x + s * cl.widths[i] / 2 });
                    x += s * cl.widths[i] + pairGap;
                }
                out.push({ id: cl.id, cx: cx, bottom: bottom, labelBase: labelBase, items: items });
            }
            y = labelBase + rowGap;
        }
        return { s: s, pairGap: pairGap, cells: out };
    }
    // ==== 순수 기하 끝 ====


    var PREF_KEY = "ObjectKaryotype/settings";
    var SETTINGS_TAG = "v4";
    var SETTINGS_LENGTH = 21;
    var MM = 2.834645669;
    var ENG_FONT_NAME = "GSMediumB1";
    var ENG_BASELINE_PT = 0.5;
    var PREVIEW_NAME = "Karyotype_Preview";
    var LABEL_WIDTH = 120;
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var BASE_WIDTH = 7;            // 분체 너비 기준값 (단위: 1번 염색체 길이 100). 모양마다 widthScale을 곱한다
    var OUTLINE_PT = 0.5;          // 윤곽선 판의 선 두께
    var KARY_CODES = ["normal", "down", "klinefelter", "turner", "cridu"];
    var KARY_NAMES = ["정상", "다운 증후군 (21번 3개)", "클라인펠터 증후군 (XXY)", "터너 증후군 (X0)", "고양이 울음 증후군 (5p−)"];
    var SHAPE_NAMES = ["기하학적 (둥근 사각형)", "중간", "실제에 가까운 모양"];
    var COLORS = [
        { name: "K (검정·회색)", cmyk: [0, 0, 0, 100], rgb: [35, 31, 32], gray: true },
        { name: "파랑", cmyk: [85, 65, 30, 10], rgb: [58, 88, 130] },
        { name: "청록", cmyk: [80, 15, 25, 0], rgb: [20, 160, 185] },
        { name: "보라", cmyk: [65, 75, 10, 0], rgb: [115, 80, 150] }
    ];
    // 밴드 단계(1~4 = gpos25~100, 5 = 변이 이질염색질)별 진하기와 밑바탕 진하기
    var BAND_DARK = [0, 0.30, 0.52, 0.76, 1.0, 0.62];
    var BASE_TINT = 0.16;
    // 입체 음영: [위치%, 검정(0)/흰색(1), 불투명도%]. 좌우 대칭이라 오른쪽 분체를 그대로 따라 그려도 일관된다.
    // 가장 센 값으로 만들어 두고 입체 강도(%)는 덮는 경로의 불투명도로 줄인다 (그라데이션을 강도마다 만들지 않으려고)
    var SHADE_STOPS = [[0, 0, 80], [20, 0, 35], [42, 1, 25], [50, 1, 35], [58, 1, 25], [80, 0, 35], [100, 0, 80]];
    var SHADE_NAME = "Karyotype shade";
    var SHADE_RANGE = [0, 100];
    var K_RANGE = [0, 100];
    var RENDER_NAMES = ["평면 (단색)", "윤곽선 (흰 바탕)", "입체"];
    var CEN_CODES = ["one", "each", "none"];
    var CEN_NAMES = ["원 하나", "분체마다 원 (맞닿음)", "없음"];
    var THICK_RANGE = [40, 250];
    var SPLAY_RANGE = [0, 25];
    var MARGIN_RANGE = [0, 30];
    var GAP_RANGE = [0, 10];
    var FONT_RANGE = [4, 24];
    var POSITION_LIMIT_MM = 200;
    var DEFAULT_FRAME_MM = { w: 120, h: 100 };   // 선택도 기억한 틀도 없을 때의 크기
    var FRAME_KEY = PREF_KEY + "/frame";

    var doc = app.activeDocument;
    var frameFromSelection = false;
    var frameLeft, frameTop, frameW, frameH;
    if (!doc.selection || doc.selection.length === 0) {
        // 선택이 없으면 기억한 틀(없으면 기본 크기)을 대지 가운데에 놓는다
        var rememberedFrame = loadFrame(DEFAULT_FRAME_MM.w, DEFAULT_FRAME_MM.h);
        var artboardRect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        frameW = rememberedFrame.w * MM;
        frameH = rememberedFrame.h * MM;
        frameLeft = (artboardRect[0] + artboardRect[2]) / 2 - frameW / 2;
        frameTop = (artboardRect[1] + artboardRect[3]) / 2 + frameH / 2;
    } else {
        var frameItem = findFrameItem(doc.selection);
        if (frameItem === null) {
            alert("핵형을 넣을 사각형을 선택해주세요.");
            return;
        }
        var fb = frameItem.geometricBounds;
        frameLeft = Math.min(fb[0], fb[2]);
        frameTop = Math.max(fb[1], fb[3]);
        frameW = Math.abs(fb[2] - fb[0]);
        frameH = Math.abs(fb[1] - fb[3]);
        frameFromSelection = true;
    }

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
    var cenIdx = 0;
    var renderIdx = 0;
    var shadePct = 70;
    var colorIdx = 0;
    var kPct = 100;
    var splayDeg = SPLAY_PRESET[shapeIdx];
    var thickPct = 100;
    var marginMm = 4;
    var pairGapMm = 1.5;
    var labelGapMm = 1.5;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = { kPct: kPct, shadePct: shadePct, splayDeg: splayDeg, thickPct: thickPct, marginMm: marginMm, pairGapMm: pairGapMm, labelGapMm: labelGapMm, fontPt: fontPt, offsetXmm: offsetXmm, offsetYmm: offsetYmm };
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
    var cenRow = shapePanel.add("group");
    cenRow.alignChildren = ["left", "center"];
    cenRow.add("statictext", undefined, "동원체:").preferredSize.width = LABEL_WIDTH;
    var cenList = cenRow.add("dropdownlist", undefined, CEN_NAMES);
    var renderRow = shapePanel.add("group");
    renderRow.alignChildren = ["left", "center"];
    renderRow.add("statictext", undefined, "표현:").preferredSize.width = LABEL_WIDTH;
    var renderRadios = [];
    for (var rn = 0; rn < RENDER_NAMES.length; rn++) renderRadios.push(renderRow.add("radiobutton", undefined, RENDER_NAMES[rn]));
    var colorRow = shapePanel.add("group");
    colorRow.alignChildren = ["left", "center"];
    colorRow.add("statictext", undefined, "색:").preferredSize.width = LABEL_WIDTH;
    var colorNames = [];
    for (var cn = 0; cn < COLORS.length; cn++) colorNames.push(COLORS[cn].name);
    var colorList = colorRow.add("dropdownlist", undefined, colorNames);
    var kRow = addValueRow(shapePanel, "농도 K", "%", kPct, K_RANGE[0], K_RANGE[1], 10, 0, DEFAULTS.kPct);
    kRow.input.helpTip = "K 색일 때 채움(윤곽선 판은 선) 농도. 100 = 검정";
    var shadeRow = addValueRow(shapePanel, "입체 강도", "%", shadePct, SHADE_RANGE[0], SHADE_RANGE[1], 5, 0, DEFAULTS.shadePct);
    shadeRow.input.helpTip = "입체 음영의 진하기 (입체일 때). 100이 가장 진하다";
    var splayRow = addValueRow(shapePanel, "분체 벌림", "°", splayDeg, SPLAY_RANGE[0], SPLAY_RANGE[1], 0.5, 1, DEFAULTS.splayDeg);
    splayRow.input.helpTip = "동원체에서 이 각도로 벌어지다 수직으로 꺾인다 (분체 2개일 때). 짧은 팔은 끝까지 비스듬하다";
    var thickRow = addValueRow(shapePanel, "두께", "%", thickPct, THICK_RANGE[0], THICK_RANGE[1], 5, 0, DEFAULTS.thickPct);
    thickRow.input.helpTip = "염색 분체의 너비. 100 = 1번 염색체 길이의 7% (모양마다 배율이 다르다)";

    var layoutPanel = addPanel(dlg, "배치");
    var marginRow = addValueRow(layoutPanel, "안쪽 여백", "mm", marginMm, MARGIN_RANGE[0], MARGIN_RANGE[1], 0.5, 1, DEFAULTS.marginMm);
    marginRow.input.helpTip = "선택한 사각형 가장자리와 염색체 사이";
    var pairGapRow = addValueRow(layoutPanel, "상동 간격", "mm", pairGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.1, 1, DEFAULTS.pairGapMm);
    pairGapRow.input.helpTip = "상동 염색체(짝) 사이 거리. 이웃 번호와는 이보다 2배 이상 띄운다";
    var labelGapRow = addValueRow(layoutPanel, "번호 간격", "mm", labelGapMm, GAP_RANGE[0], GAP_RANGE[1], 0.1, 1, DEFAULTS.labelGapMm);
    labelGapRow.input.helpTip = "염색체 아래끝과 번호(X, Y 포함) 사이";
    var fontRow = addValueRow(layoutPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1, DEFAULTS.fontPt);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1, DEFAULTS.offsetXmm);
    var offsetYRow = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1, DEFAULTS.offsetYmm);

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
    cenList.selection = cenIdx;
    colorList.selection = colorIdx;
    chromatidRadios[chromatidCount - 1].value = true;
    renderRadios[renderIdx].value = true;
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
        // 모양마다 어울리는 분체 벌림으로 되돌린다 (실제 모양은 살짝 벌어진 X자)
        splayDeg = SPLAY_PRESET[shapeIdx];
        setRowValue(splayRow, splayDeg);
        updatePreview();
    };
    for (var cr = 0; cr < chromatidRadios.length; cr++) {
        chromatidRadios[cr].onClick = (function(index) {
            return function() { chromatidCount = index + 1; syncEnabled(); updatePreview(); };
        })(cr);
    }
    gbandCheck.onClick = function() { gbandOn = gbandCheck.value; updatePreview(); };
    cenList.onChange = function() {
        if (cenList.selection === null) return;
        cenIdx = cenList.selection.index;
        updatePreview();
    };
    for (var rr = 0; rr < renderRadios.length; rr++) {
        renderRadios[rr].onClick = (function(index) {
            return function() { renderIdx = index; syncEnabled(); updatePreview(); };
        })(rr);
    }
    colorList.onChange = function() {
        if (colorList.selection === null) return;
        colorIdx = colorList.selection.index;
        syncEnabled();
        updatePreview();
    };
    bindValueRow(splayRow, function() { return splayDeg; }, function(v) { splayDeg = v; });
    bindValueRow(kRow, function() { return kPct; }, function(v) { kPct = v; });
    bindValueRow(shadeRow, function() { return shadePct; }, function(v) { shadePct = v; });
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
        if (frameFromSelection) saveFrame(frameW / MM, frameH / MM);
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
        splayRow.reset.enabled = chromatidCount === 2;
        shadeRow.input.enabled = renderIdx === 2;
        shadeRow.slider.enabled = renderIdx === 2;
        shadeRow.reset.enabled = renderIdx === 2;
        kRow.input.enabled = COLORS[colorIdx].gray === true;
        kRow.slider.enabled = COLORS[colorIdx].gray === true;
        kRow.reset.enabled = COLORS[colorIdx].gray === true;
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
            centromere: CEN_CODES[cenIdx], pairGap: pairGapMm * MM, labelGap: labelGapMm * MM,
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

    // 염색체 하나: 분체 1개면 그대로, 2개면 왼쪽·오른쪽을 차례로 그리고 동원체 원을 위에 얹는다
    function drawChromosome(parent, g, opts, s, ox, oy, paint) {
        if (opts.chromatids === 1) {
            drawChromatid(parent, g, opts, 1, s, ox, oy, paint);
        } else {
            drawChromatid(parent, g, opts, -1, s, ox, oy, paint);
            drawChromatid(parent, g, opts, 1, s, ox, oy, paint);
        }
        var circles = centromereCircles(g, opts, opts.centromere);
        for (var i = 0; i < circles.length; i++) {
            var c = circles[i];
            var r = c.r * s;
            var disc = parent.pathItems.ellipse(oy - c.y * s + r, ox + c.x * s - r, 2 * r, 2 * r);
            disc.stroked = false;
            disc.filled = true;
            disc.fillColor = paint.tint(renderIdx === 1 ? 0 : 1);
            if (renderIdx === 1) strokeEdge(disc, paint.tint(1));
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
        var outlineMode = renderIdx === 1;
        var shadeMode = renderIdx === 2;
        if (!gbandOn && !shadeMode) {
            var flat = parent.pathItems.add();
            writePoly(flat, pts, paint.tint(outlineMode ? 0 : 1));
            if (outlineMode) strokeEdge(flat, paint.tint(1));
            return flat;
        }
        var box = parent.groupItems.add();
        var base = box.pathItems.add();
        writePoly(base, pts, paint.tint(outlineMode ? 0 : (gbandOn ? BASE_TINT : 1)));
        if (gbandOn) {
            var runs = chromBands(g);
            for (var r = 0; r < runs.length; r++) {
                var band = box.pathItems.rectangle(oy - runs[r].y0 * s, minX - 1, maxX - minX + 2, (runs[r].y1 - runs[r].y0) * s);
                band.stroked = false;
                band.fillColor = paint.tint(BASE_TINT + (1 - BASE_TINT) * BAND_DARK[runs[r].lev]);
            }
        }
        if (shadeMode) {
            var shade = base.duplicate(box, ElementPlacement.PLACEATBEGINNING);
            applyShade(shade);
        }
        if (gbandOn) {
            base.duplicate(box, ElementPlacement.PLACEATBEGINNING);
            box.clipped = true;
        }
        if (outlineMode) {
            // 클리핑 그룹 밖에 선만 있는 윤곽을 얹는다 (그룹 안에서는 선이 바깥 절반 잘린다)
            var edge = parent.pathItems.add();
            writePoly(edge, pts, paint.tint(0));
            edge.filled = false;
            strokeEdge(edge, paint.tint(1));
        }
        return box;
    }

    function strokeEdge(path, color) {
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = OUTLINE_PT;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
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
        if (main.gray === true) {
            // K 색은 농도(K %)로 회색~검정을 만든다. RGB 문서에서는 같은 밝기의 회색
            var k = kPct / 100;
            main = { cmyk: [0, 0, 0, kPct], rgb: [255 - (255 - 35) * k, 255 - (255 - 31) * k, 255 - (255 - 32) * k] };
        }
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
        path.opacity = shadePct;
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

    // 틀 전용 설정: "v1|너비mm|높이mm". 확인을 누를 때 선택에서 읽은 틀만 저장한다
    function loadFrame(fallbackW, fallbackH) {
        try {
            var p = app.preferences.getStringPreference(FRAME_KEY).split("|");
            if (p.length === 3 && p[0] === "v1") {
                var w = parseFloat(p[1]), h = parseFloat(p[2]);
                if (w > 0.1 && h > 0.1 && w <= 2000 && h <= 2000) return {w: w, h: h};
            }
        } catch (e) {}
        return {w: fallbackW, h: fallbackH};
    }

    function saveFrame(w, h) {
        try { app.preferences.setStringPreference(FRAME_KEY, ["v1", w.toFixed(2), h.toFixed(2)].join("|")); } catch (e) {}
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

    function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals, initial) {
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
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        return { input: input, slider: slider, reset: reset, min: minimum, max: maximum, step: step, decimals: decimals, initial: initial };
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
        controls.reset.onClick = function() { commit(controls.initial); };
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
        controls.reset.onClick = function() { commit(controls.initial); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? getter() : value);
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
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
            cenIdx,
            renderIdx,
            colorIdx, kPct, shadePct, splayDeg, thickPct, marginMm, pairGapMm, labelGapMm, fontPt,
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
        cenIdx = restoreNumber(p[7], cenIdx, [0, CEN_CODES.length - 1], 1);
        renderIdx = restoreNumber(p[8], renderIdx, [0, RENDER_NAMES.length - 1], 1);
        colorIdx = restoreNumber(p[9], colorIdx, [0, COLORS.length - 1], 1);
        kPct = restoreNumber(p[10], kPct, K_RANGE, 10);
        shadePct = restoreNumber(p[11], shadePct, SHADE_RANGE, 5);
        splayDeg = restoreNumber(p[12], splayDeg, SPLAY_RANGE, 0.5);
        thickPct = restoreNumber(p[13], thickPct, THICK_RANGE, 5);
        marginMm = restoreNumber(p[14], marginMm, MARGIN_RANGE, 0.5);
        pairGapMm = restoreNumber(p[15], pairGapMm, GAP_RANGE, 0.1);
        labelGapMm = restoreNumber(p[16], labelGapMm, GAP_RANGE, 0.1);
        fontPt = restoreNumber(p[17], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[18], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[19], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[20] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
