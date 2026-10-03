// Object_ReactionModel.jsx
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

// 화학 반응 채움 모형: 분자를 공간 채움 모형(하이라이트가 있는 구)으로 그린다. 선택 없이 화면 가운데에 그린다.
// 화학 반응 탭: 반응물 + 반응물 → 생성물을 분자 모형으로 늘어놓고 +·화살표로 잇고 이름을 단다 (이온 반응 포함).
// 기체 반응 탭: 분자를 정육면체 안에 담는다. 계수만큼 칸을 이어 붙이고(모서리는 경사 연결), 표 선·값은 그리지 않는다. 이름표는 고를 수 있다.
// 두 탭 모두 컬러 / 회색 음영으로 바꿀 수 있다.
// 공간 채움 모형: 구 반지름 = 반데르발스 반지름(Bondi: H 1.20, C 1.70, N 1.55, O 1.52, Cl 1.75 Å), 구 중심 간격 = 실제 결합 길이·각도(NIST CCCBDB)라
// 결합한 원자의 구는 서로 많이 겹친다. 이온 결합은 이온 반지름(Shannon: Na+ 1.02, Cl- 1.81, Ag+ 1.15 Å)으로 맞닿게 그린다.
// 반응식은 "2H2+O2=2H2O"처럼 적는다. 화살표는 =, >, ->, → 모두 되고, ;로 이으면 반응 여러 개(기체 반응 탭은 세로로 쌓음).
// 쓸 수 있는 물질: H2 O2 N2 Cl2 H2O H2O2 NH3 HCl CH4 CO2 CO NO NO2 C NaCl AgCl AgNO3 NaNO3

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    var TAB_PREF_KEY = "ObjectReactionModel/tab";
    var MINUS = "−";
    var gradientCache = {};
    var regionCache = {};
    // 교재 비율: 결합한 두 구의 중심 간격 = 반지름 합 × 이 값, 수소 반지름 0.88 Å (참고 그림 실측: H 지름 ≈ O의 0.58배, 중심 간격 ≈ 반지름 합의 0.76배)
    var TEXTBOOK_OVERLAP = 0.76;
    var TEXTBOOK_H_RADIUS = 0.88;

    // ==== 표 ====
    // 공간 채움 모형의 구 지름 = 반데르발스 반지름(Bondi 1964)의 두 배. 이온 결합은 이온 반지름(Shannon). 산소 지름(2 × 1.52 Å = 3.04 Å)을 1로 둔다
    var ANGSTROM = 3.04;
    // 원자: d = 지름(산소 = 1), pal = 색 이름, text·sup = 원자에 쓰는 기호와 전하
    var ELEMENTS = {
        H: {d: dia(1.2), pal: "H", text: "H"},
        C: {d: dia(1.7), pal: "C", text: "C"},
        N: {d: dia(1.55), pal: "N", text: "N"},
        O: {d: dia(1.52), pal: "O", text: "O"},
        Cl: {d: dia(1.75), pal: "Cl", text: "Cl"},
        "Na+": {d: dia(1.02), pal: "Na", text: "Na", sup: "+"},
        "Cl-": {d: dia(1.81), pal: "Cl", text: "Cl", sup: MINUS},
        "Ag+": {d: dia(1.15), pal: "Ag", text: "Ag", sup: "+"}
    };
    // 구 색: [하이라이트, 본색, 가장자리] (RGB)
    var SPHERE_COLORS = {
        H: [[255, 255, 255], [228, 228, 228], [145, 145, 145]],
        C: [[135, 142, 145], [66, 74, 78], [28, 32, 35]],
        N: [[185, 222, 248], [62, 152, 218], [24, 92, 158]],
        O: [[255, 185, 155], [255, 62, 32], [175, 26, 10]],
        Cl: [[205, 240, 170], [92, 188, 72], [38, 118, 34]],
        Na: [[255, 252, 210], [252, 228, 84], [205, 168, 30]],
        Ag: [[190, 235, 225], [64, 164, 164], [24, 104, 110]]
    };
    // 회색 음영 구 색: [하이라이트, 본색, 가장자리] K값(0~100). 원소마다 밝기가 달라 구별된다
    var SPHERE_GRAYS = {
        H: [0, 12, 48],
        Na: [0, 25, 58],
        Cl: [8, 38, 68],
        Ag: [12, 48, 75],
        N: [15, 58, 82],
        O: [22, 70, 90],
        C: [55, 90, 100]
    };
    // 분자 모형: 원자는 [종류, x, y, z] (Å, 위쪽 +y, 보는 쪽 +z). 중심 간격이 실제 결합 길이·각도(NIST CCCBDB)이고
    // 보기 좋은 방향으로 돌려 놓았다. ref는 교재 비율에서 간격을 늘릴 기준 결합(원자 번호 둘)
    var NITRATE = [["O", 0, 1.24, 0], ["O", -1.074, -0.62, 0], ["O", 1.074, -0.62, 0], ["N", 0, 0, 0]];
    var BRACKET = {x0: -2.9, x1: 2.9, y0: -2.45, y1: 3.05};
    var MOLECULES = {
        H2: {name: "수소", ref: [0, 1], atoms: [["H", -0.371, 0, 0], ["H", 0.371, 0, 0]]},
        O2: {name: "산소", ref: [0, 1], atoms: [["O", -0.604, 0, 0], ["O", 0.604, 0, 0]]},
        N2: {name: "질소", ref: [0, 1], atoms: [["N", -0.549, 0, 0], ["N", 0.549, 0, 0]]},
        Cl2: {name: "염소", ref: [0, 1], atoms: [["Cl", -0.994, 0, 0], ["Cl", 0.994, 0, 0]]},
        H2O: {name: "물", ref: [0, 2], atoms: [["H", -0.757, -0.532, 0.248], ["H", 0.757, -0.532, 0.248], ["O", 0, 0, 0]]},
        H2O2: {name: "과산화 수소", ref: [2, 3], atoms: [["H", -0.818, -0.789, -0.553], ["H", 0.818, 0.804, -0.532], ["O", -0.738, 0, 0], ["O", 0.738, 0, 0]]},
        NH3: {name: "암모니아", ref: [2, 0], atoms: [["H", -0.812, 0.198, -0.425], ["H", 0.812, 0.198, -0.425], ["N", 0, 0.345, 0.161], ["H", 0, -0.396, 0.85]]},
        HCl: {name: "염화 수소", ref: [0, 1], atoms: [["H", -1.198, 0, 0.436], ["Cl", 0, 0, 0]]},
        CH4: {name: "메테인", ref: [2, 0], atoms: [["H", -0.888, -0.483, -0.401], ["H", 0.888, -0.483, -0.401], ["C", 0, 0, 0], ["H", 0, 1.05, -0.281], ["H", 0, -0.085, 1.084]]},
        CO2: {name: "이산화 탄소", ref: [0, 2], atoms: [["O", -1.162, 0, 0], ["O", 1.162, 0, 0], ["C", 0, 0, 0]]},
        CO: {name: "일산화 탄소", ref: [0, 1], atoms: [["C", -0.564, 0, 0], ["O", 0.564, 0, 0]]},
        NO: {name: "일산화 질소", ref: [0, 1], atoms: [["N", -0.576, 0, 0], ["O", 0.576, 0, 0]]},
        NO2: {name: "이산화 질소", ref: [0, 2], atoms: [["O", -0.964, -0.387, 0.588], ["O", 0.23, 0.959, -0.673], ["N", 0, 0, 0]]},
        C: {name: "탄소", atoms: [["C", 0, 0, 0]]},
        // 이온 결합: 양이온·음이온 구가 맞닿는다(중심 간격 = 이온 반지름의 합). 비율 선택과 상관없이 같다
        NaCl: {name: "염화 나트륨", ionic: true, atoms: [["Cl-", 0, 0, 0], ["Na+", -2.83, 0, 0]]},
        AgCl: {name: "염화 은", ionic: true, atoms: [["Cl-", 0, 0, 0], ["Ag+", -2.96, 0, 0]]},
        AgNO3: {name: "질산 은", ionic: true, bracket: BRACKET, atoms: NITRATE.concat([["Ag+", -4.39, 0, 0]])},
        NaNO3: {name: "질산 나트륨", ionic: true, bracket: BRACKET, atoms: NITRATE.concat([["Na+", -4.26, 0, 0]])}
    };
    // 반응 목록: eq는 입력창에 들어가는 반응식, 마지막은 직접 입력
    var REACT_PRESETS = [
        {title: "과산화 수소 분해 (2H₂O₂ → 2H₂O + O₂)", eq: "2H2O2=2H2O+O2"},
        {title: "암모니아 생성 (N₂ + 3H₂ → 2NH₃)", eq: "N2+3H2=2NH3"},
        {title: "메테인 연소 (CH₄ + 2O₂ → CO₂ + 2H₂O)", eq: "CH4+2O2=CO2+2H2O"},
        {title: "물 생성 (2H₂ + O₂ → 2H₂O)", eq: "2H2+O2=2H2O"},
        {title: "염화 은 침전 (NaCl + AgNO₃ → AgCl + NaNO₃)", eq: "NaCl+AgNO3=AgCl+NaNO3"},
        {title: "염화 수소 생성 (H₂ + Cl₂ → 2HCl)", eq: "H2+Cl2=2HCl"},
        {title: "일산화 탄소 연소 (2CO + O₂ → 2CO₂)", eq: "2CO+O2=2CO2"},
        {title: "이산화 질소 생성 (N₂ + 2O₂ → 2NO₂)", eq: "N2+2O2=2NO2"},
        {title: "직접 입력", eq: null}
    ];
    var GAS_PRESETS = [
        {title: "물 생성 (2H₂ + O₂ → 2H₂O)", eq: "2H2+O2=2H2O"},
        {title: "암모니아 생성 (N₂ + 3H₂ → 2NH₃)", eq: "N2+3H2=2NH3"},
        {title: "염화 수소 생성 (H₂ + Cl₂ → 2HCl)", eq: "H2+Cl2=2HCl"},
        {title: "이산화 질소 생성 (N₂ + 2O₂ → 2NO₂)", eq: "N2+2O2=2NO2"},
        {title: "일산화 탄소 연소 (2CO + O₂ → 2CO₂)", eq: "2CO+O2=2CO2"},
        {title: "일산화 질소 산화 (2NO + O₂ → 2NO₂)", eq: "2NO+O2=2NO2"},
        {title: "네 반응 모두", eq: "2H2+O2=2H2O;N2+3H2=2NH3;H2+Cl2=2HCl;N2+2O2=2NO2"},
        {title: "직접 입력", eq: null}
    ];
    // 화살표 색: 컬러(위·아래 RGB)와 회색 음영(위·아래 K값). null이면 검정
    var ARROW_COLORS = [
        {id: "blue", top: [190, 212, 242], bottom: [84, 128, 198], grayTop: 22, grayBottom: 55},
        {id: "red", top: [255, 165, 145], bottom: [226, 52, 40], grayTop: 40, grayBottom: 75},
        null
    ];
    // 더하기 색: 컬러 RGB와 회색 음영 K값. null이면 검정
    var PLUS_COLORS = [{rgb: [108, 152, 214], k: 40}, {rgb: [181, 172, 128], k: 58}, null];
    // 정육면체 면 색: 컬러(RGB)와 회색 음영(K값)
    var CUBE_COLORS = [{
        back: [196, 224, 238], left: [178, 212, 232], floor: [160, 200, 224],
        front: [222, 239, 248], top: [236, 247, 252], right: [138, 188, 216],
        edge: [92, 152, 188], edgeSoft: [140, 184, 208]
    }, {
        back: 10, left: 16, floor: 24, front: 6, top: 3, right: 32, edge: 60, edgeSoft: 40
    }];
    // 칸당 분자 수별 자리(칸 크기 대비 비율)
    var CELL_OFFSETS = {
        1: [[0, 0]],
        2: [[-0.2, 0.12], [0.2, -0.12]],
        3: [[0, 0.2], [-0.22, -0.2], [0.22, -0.2]],
        4: [[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.2], [0.22, -0.2]]
    };

    runFormHost("화학 반응 채움 모형", [makeReactEngine(), makeGasEngine()], TAB_PREF_KEY);

    // ==== 화학 반응 탭 ====
    function makeReactEngine() {
        return makeFormEngine({
            label: "화학 반응", name: "ReactionModel", prefKey: "ObjectReactionModel/react",
            presets: REACT_PRESETS,
            controls: [
                {panel: "반응"},
                {key: "reaction", label: "반응", items: presetTitles(REACT_PRESETS), value: 3},
                {key: "formula", label: "반응식", text: true, value: REACT_PRESETS[3].eq},
                {key: "arrange", label: "분자 배치", items: ["한 줄", "모아서"], value: 0},
                {panel: "크기·간격"},
                {key: "proportion", label: "원자 비율", items: ["교재 비율", "실제(반데르발스)"], value: 0},
                {key: "size", label: "원자 크기", unit: "mm", min: 2, max: 15, step: 0.5, value: 7},
                {key: "tilt", label: "기울임", unit: "°", min: 0, max: 45, step: 5, value: 0},
                {key: "molGap", label: "분자 간격", unit: "mm", min: 0, max: 8, step: 0.5, value: 1},
                {key: "gap", label: "항 간격", unit: "mm", min: 1, max: 15, step: 0.5, value: 4},
                {key: "arrowLen", label: "화살표 길이", unit: "mm", min: 6, max: 40, step: 1, value: 14},
                {panel: "표시"},
                {key: "label", label: "이름표", items: ["이름", "화학식", "이름(화학식)", "없음"], value: 0},
                {key: "labelPos", label: "이름표 위치", items: ["아래", "위"], value: 0},
                {key: "symbols", check: "원소 기호", value: false},
                {key: "coef", check: "화학식에 계수", value: false},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8},
                {key: "labelGap", label: "이름표 간격", unit: "mm", min: 0, max: 10, step: 0.5, value: 2.5},
                {key: "colorMode", label: "색상", items: ["컬러", "회색 음영"], value: 0},
                {key: "arrowColor", label: "화살표 색", items: ["파랑", "빨강", "검정"], value: 0},
                {key: "plusColor", label: "더하기 색", items: ["파랑", "황토", "검정"], value: 0}
            ],
            draw: drawReact
        });
    }

    function drawReact(t, o) {
        var parsed = parseEquations(o.formula);
        if (typeof parsed === "string") { t.text(parsed, 0, 0, o.font, "center", 100); return; }
        var reaction = parsed[0];
        t.setMode(o.colorMode);
        var mm = t.mm, F = o.font, unit = o.size * mm;
        var molGap = o.molGap * mm, gap = o.gap * mm, plusW = unit * 0.8, arrowL = o.arrowLen * mm;
        var sides = [reaction.left, reaction.right];
        var groups = [], plusX = [], arrowSpan = null, x = 0, lowest = 0, highest = 0;

        for (var s = 0; s < 2; s++) {
            for (var j = 0; j < sides[s].length; j++) {
                if (j > 0) {
                    x += gap;
                    plusX.push(x + plusW / 2);
                    x += plusW + gap;
                }
                var group = arrangeSpecies(sides[s][j][1], sides[s][j][0], o.arrange, o.tilt, unit, molGap, o.proportion === 0);
                group.cx = x + group.w / 2;
                group.formula = sides[s][j][1];
                group.coef = sides[s][j][0];
                x += group.w;
                groups.push(group);
                lowest = Math.min(lowest, -group.h / 2);
                highest = Math.max(highest, group.h / 2);
            }
            if (s === 0) {
                x += gap;
                arrowSpan = [x, x + arrowL];
                x += arrowL + gap;
            }
        }

        for (var g = 0; g < groups.length; g++) {
            for (var i = 0; i < groups[g].items.length; i++) {
                var item = groups[g].items[i];
                paintMolecule(t, item.lay, groups[g].cx + item.x, item.y, unit, o.symbols, F);
            }
        }
        for (var p = 0; p < plusX.length; p++) t.plus(plusX[p], 0, plusW, o.plusColor);
        t.blockArrow(arrowSpan[0], arrowSpan[1], 0, o.arrowColor);

        if (o.label < 3) {
            // 위쪽이면 가장 높은 분자 위에, 아래 첨자가 분자 쪽으로 내려오는 만큼(0.25 F) 더 띄운다
            var baseline = o.labelPos === 1 ? highest + o.labelGap * mm + F * 0.25 : lowest - o.labelGap * mm - F * 0.72;
            for (var n = 0; n < groups.length; n++) {
                var info = molLabel(o.label, groups[n].formula, groups[n].coef, o.coef);
                t.text(info, groups[n].cx, baseline, F, "center", 100, {sub: true});
            }
        }
    }

    // 이름표 글: 0 이름, 1 화학식, 2 이름(화학식)
    function molLabel(kind, formula, coef, withCoef) {
        var name = MOLECULES[formula].name;
        var text = (withCoef && coef > 1 ? coef : "") + formula;
        if (kind === 0) return name;
        if (kind === 1) return text;
        return name + "(" + text + ")";
    }

    // ==== 기체 반응 탭 ====
    function makeGasEngine() {
        return makeFormEngine({
            label: "기체 반응", name: "GasReactionModel", prefKey: "ObjectReactionModel/gas",
            presets: GAS_PRESETS,
            controls: [
                {panel: "반응"},
                {key: "reaction", label: "반응", items: presetTitles(GAS_PRESETS), value: 0},
                {key: "formula", label: "반응식", text: true, value: GAS_PRESETS[0].eq},
                {panel: "정육면체·분자"},
                {key: "proportion", label: "원자 비율", items: ["교재 비율", "실제(반데르발스)"], value: 0},
                {key: "cell", label: "칸 크기", unit: "mm", min: 8, max: 30, step: 0.5, value: 16},
                {key: "depth", label: "깊이", unit: "mm", min: 2, max: 15, step: 0.5, value: 5},
                {key: "angle", label: "깊이 각도", unit: "°", min: 10, max: 80, step: 5, value: 45},
                {key: "size", label: "원자 크기", unit: "mm", min: 2, max: 12, step: 0.1, value: 7},
                {key: "perCell", label: "칸당 분자 수", unit: "개", min: 1, max: 4, step: 1, value: 1},
                {key: "tilt", label: "기울임", unit: "°", min: 0, max: 45, step: 5, value: 0},
                {panel: "간격·색상"},
                {key: "gap", label: "항 간격", unit: "mm", min: 1, max: 15, step: 0.5, value: 4},
                {key: "arrowLen", label: "화살표 길이", unit: "mm", min: 6, max: 40, step: 1, value: 14},
                {key: "blockGap", label: "반응 간격", unit: "mm", min: 0, max: 30, step: 1, value: 8},
                {key: "colorMode", label: "색상", items: ["컬러", "회색 음영"], value: 0},
                {key: "arrowColor", label: "화살표 색", items: ["파랑", "빨강", "검정"], value: 1},
                {key: "plusColor", label: "더하기 색", items: ["파랑", "황토", "검정"], value: 1},
                {panel: "이름표"},
                {key: "label", label: "이름표", items: ["이름", "화학식", "이름(화학식)", "없음"], value: 0},
                {key: "labelPos", label: "이름표 위치", items: ["아래", "위"], value: 0},
                {key: "coef", check: "화학식에 계수", value: true},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 20, step: 0.5, value: 8},
                {key: "labelGap", label: "이름표 간격", unit: "mm", min: 0, max: 10, step: 0.5, value: 2.5}
            ],
            draw: drawGas
        });
    }

    function drawGas(t, o) {
        var parsed = parseEquations(o.formula);
        if (typeof parsed === "string") { t.text(parsed, 0, 0, o.font, "center", 100); return; }
        t.setMode(o.colorMode);
        var mm = t.mm, F = o.font, cell = o.cell * mm, rad = o.angle * Math.PI / 180;
        var dx = o.depth * mm * Math.cos(rad), dy = o.depth * mm * Math.sin(rad);
        var unit = o.size * mm, gap = o.gap * mm, arrowL = o.arrowLen * mm, plusW = cell * 0.45;
        var boxH = cell + dy;

        // 반응 하나를 왼쪽 끝 0에서 가로로 늘어놓고 가운데(0)에 맞춰 세로로 쌓는다
        var y = 0;
        for (var r = 0; r < parsed.length; r++) {
            var sides = [parsed[r].left, parsed[r].right], items = [], x = 0;
            for (var s = 0; s < 2; s++) {
                for (var j = 0; j < sides[s].length; j++) {
                    if (j > 0) {
                        x += gap;
                        items.push({type: "plus", cx: x + plusW / 2});
                        x += plusW + gap;
                    }
                    var w = sides[s][j][0] * cell + dx;
                    items.push({type: "box", x0: x, cx: x + w / 2, n: sides[s][j][0], formula: sides[s][j][1]});
                    x += w;
                }
                if (s === 0) {
                    x += gap;
                    items.push({type: "arrow", x0: x, x1: x + arrowL});
                    x += arrowL + gap;
                }
            }

            // 이름표가 위면 줄 맨 위에 이름표, 그 아래에 정육면체. 아래 첨자가 정육면체 쪽으로 내려오는 만큼(0.25 F) 더 띄운다
            var above = o.label < 3 && o.labelPos === 1;
            var frontBottom = (above ? y - F * 0.72 - F * 0.25 - o.labelGap * mm : y) - boxH;
            var offX = -x / 2, centerY = frontBottom + boxH / 2;
            var labelBase = above ? y - F * 0.72 : frontBottom - o.labelGap * mm - F * 0.72;
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                if (it.type === "box") {
                    drawBox(offX + it.x0, frontBottom, it.n, it.formula);
                    if (o.label < 3) t.text(molLabel(o.label, it.formula, it.n, o.coef), offX + it.cx, labelBase, F, "center", 100, {sub: true});
                } else if (it.type === "plus") {
                    t.plus(offX + it.cx, centerY, plusW, o.plusColor);
                    if (o.label === 1) t.text("+", offX + it.cx, labelBase, F, "center", 100);
                } else {
                    t.blockArrow(offX + it.x0, offX + it.x1, centerY, o.arrowColor);
                    if (o.label === 1) {
                        var mid = offX + (it.x0 + it.x1) / 2, half = (it.x1 - it.x0) * 0.35;
                        t.arrow([mid - half, labelBase + F * 0.3], [mid + half, labelBase + F * 0.3], 0.5, 100, 1.6 * mm);
                    }
                }
            }
            y = (o.label < 3 && !above ? labelBase - F * 0.3 : frontBottom) - o.blockGap * mm;
        }

        // 정육면체 하나(계수만큼 칸을 이어 붙임). (x0, y0)은 앞면 왼쪽 아래
        function drawBox(x0, y0, n, formula) {
            t.cubeBack(x0, y0, n * cell, cell, dx, dy);
            var offsets = CELL_OFFSETS[o.perCell], index = 0;
            for (var c = 0; c < n; c++) {
                for (var m = 0; m < offsets.length; m++) {
                    var lay = molLayout(formula, o.tilt * (index % 2 === 0 ? 1 : -1), o.proportion === 0);
                    index++;
                    paintMolecule(t, lay, x0 + (c + 0.5) * cell + dx / 2 + offsets[m][0] * cell,
                        y0 + cell / 2 + dy / 2 + offsets[m][1] * cell, unit, false, F);
                }
            }
            t.cubeFront(x0, y0, n * cell, cell, dx, dy, n);
        }
    }

    // ==== 분자 ====
    // 구 위에 쓰는 글자의 K값: 본색이 어두우면 흰색(0), 아니면 검정(100)
    function sphereTextK(pal, mode) {
        var luminance;
        if (mode === 1) {
            luminance = 255 * (100 - SPHERE_GRAYS[pal][1]) / 100;
        } else {
            var c = SPHERE_COLORS[pal][1];
            luminance = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
        }
        return luminance < 90 ? 0 : 100;
    }

    // 반응식 "2H2+O2=2H2O;..." → [{left: [[계수, 식], ...], right: [...]}, ...] 또는 오류문
    function parseEquations(text) {
        var out = [];
        var parts = String(text).replace(/\s+/g, "").replace(/(→|⟶|->|=>|>)/g, "=").split(";");
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === "") continue;
            var sides = parts[i].split("=");
            if (sides.length !== 2) return "반응식은 '왼쪽=오른쪽'으로 적어 주세요";
            var left = parseSide(sides[0]), right = parseSide(sides[1]);
            if (typeof left === "string") return left;
            if (typeof right === "string") return right;
            out.push({left: left, right: right});
        }
        if (out.length === 0) return "반응식을 적어 주세요";
        return out;
    }

    function parseSide(text) {
        var terms = text.split("+"), list = [];
        if (terms.length > 5) return "한쪽 항은 5개까지입니다";
        for (var i = 0; i < terms.length; i++) {
            var m = /^(\d*)([A-Za-z0-9]+)$/.exec(terms[i]);
            if (!m) return "읽을 수 없는 항: " + terms[i];
            var coef = m[1] === "" ? 1 : parseInt(m[1], 10);
            if (coef < 1 || coef > 8) return "계수는 1~8입니다: " + terms[i];
            if (!MOLECULES.hasOwnProperty(m[2])) return "목록에 없는 물질: " + m[2];
            list.push([coef, m[2]]);
        }
        return list;
    }

    function presetTitles(presets) {
        var titles = [];
        for (var i = 0; i < presets.length; i++) titles.push(presets[i].title);
        return titles;
    }

    // 원자 반지름(Å). 교재 비율이면 수소만 작다
    function atomRadius(key, textbook) {
        return textbook && key === "H" ? TEXTBOOK_H_RADIUS : ELEMENTS[key].d * ANGSTROM / 2;
    }

    // 분자를 화면 안에서 angle(°)만큼 돌려 경계 가운데가 원점이 되게 한 배치 (산소 지름 = 1). 원자는 뒤에서 앞(z 순)으로 정렬.
    // textbook이면 ref 결합의 중심 간격이 반지름 합의 TEXTBOOK_OVERLAP배가 되도록 분자 전체를 늘린다(각도는 그대로).
    // 이온 결합 분자는 돌리지도 늘리지도 않는다
    function molLayout(formula, angle, textbook) {
        var mol = MOLECULES[formula];
        var rad = mol.ionic ? 0 : angle * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
        var stretch = 1;
        if (textbook && mol.ref && !mol.ionic) {
            var p = mol.atoms[mol.ref[0]], q = mol.atoms[mol.ref[1]];
            var bond = Math.sqrt((p[1] - q[1]) * (p[1] - q[1]) + (p[2] - q[2]) * (p[2] - q[2]) + (p[3] - q[3]) * (p[3] - q[3]));
            stretch = TEXTBOOK_OVERLAP * (atomRadius(p[0], true) + atomRadius(q[0], true)) / bond;
        }
        var atoms = [], l = 1e9, t = -1e9, r = -1e9, b = 1e9;
        for (var i = 0; i < mol.atoms.length; i++) {
            var a = mol.atoms[i], d = atomRadius(a[0], textbook) * 2 / ANGSTROM;
            var px = a[1] * stretch / ANGSTROM, py = a[2] * stretch / ANGSTROM;
            var x = px * cos - py * sin, y = px * sin + py * cos;
            atoms.push({key: a[0], x: x, y: y, z: a[3] * stretch / ANGSTROM, d: d, order: i});
            l = Math.min(l, x - d / 2);
            r = Math.max(r, x + d / 2);
            t = Math.max(t, y + d / 2);
            b = Math.min(b, y - d / 2);
        }
        atoms.sort(function(p, q) { return p.z !== q.z ? p.z - q.z : p.order - q.order; });
        var br = mol.bracket;
        if (br) {
            l = Math.min(l, br.x0 / ANGSTROM);
            r = Math.max(r, br.x1 / ANGSTROM + 0.4);
            t = Math.max(t, br.y1 / ANGSTROM + 0.25);
            b = Math.min(b, br.y0 / ANGSTROM);
        }
        var cx = (l + r) / 2, cy = (t + b) / 2;
        for (var k = 0; k < atoms.length; k++) {
            atoms[k].x -= cx;
            atoms[k].y -= cy;
        }
        var shifted = br ? {x0: br.x0 / ANGSTROM - cx, x1: br.x1 / ANGSTROM - cx, y0: br.y0 / ANGSTROM - cy, y1: br.y1 / ANGSTROM - cy} : null;
        return {atoms: atoms, bracket: shifted, labeled: !!mol.ionic, w: r - l, h: t - b,
            key: formula + "|" + (mol.ionic ? 0 : angle) + "|" + (textbook ? 1 : 0)};
    }

    // 분자의 원자마다 실제로 보이는 부분(점마다 표면이 가장 앞선 구)을 윤곽선으로 구한다. 좌표는 분자 가운데 기준 단위.
    // 구 둘의 표면이 만나는 교차선이 경계가 되므로 겹친 구가 융합돼 보인다. 배치마다 한 번만 계산해 둔다.
    // 결과: 원자마다 {loops: 보이는 부분 윤곽선들(구멍은 시계 방향, 전체가 다 보이면 null), label: 기호 자리 [x, y] 또는 null}
    function molRegions(lay) {
        if (regionCache[lay.key]) return regionCache[lay.key];
        var atoms = lay.atoms, n = atoms.length, infos = [], overlapping = [], any = false, i, k;
        for (i = 0; i < n; i++) {
            overlapping[i] = false;
            for (k = 0; k < n; k++) {
                if (k === i) continue;
                var ddx = atoms[i].x - atoms[k].x, ddy = atoms[i].y - atoms[k].y, rr = (atoms[i].d + atoms[k].d) / 2;
                if (ddx * ddx + ddy * ddy < rr * rr - 1e-6) { overlapping[i] = true; any = true; }
            }
            infos.push({loops: null, label: [atoms[i].x, atoms[i].y]});
        }
        if (!any) { regionCache[lay.key] = infos; return infos; }

        // 점 (px, py)에서 표면이 가장 앞선 구
        function ownerAt(px, py) {
            var best = -1, bestZ = -1e9;
            for (var m = 0; m < n; m++) {
                var a = atoms[m], dx = px - a.x, dy = py - a.y, rr2 = a.d * a.d / 4, d2 = dx * dx + dy * dy;
                if (d2 <= rr2) {
                    var h = a.z + Math.sqrt(rr2 - d2);
                    if (h > bestZ) { bestZ = h; best = m; }
                }
            }
            return best;
        }

        // 격자: 구마다 덮는 줄 구간만 훑으며 더 앞선 구가 나오면 주인을 바꾼다
        var left = 1e9, right = -1e9, bottom = 1e9, top = -1e9;
        for (i = 0; i < n; i++) {
            left = Math.min(left, atoms[i].x - atoms[i].d / 2);
            right = Math.max(right, atoms[i].x + atoms[i].d / 2);
            bottom = Math.min(bottom, atoms[i].y - atoms[i].d / 2);
            top = Math.max(top, atoms[i].y + atoms[i].d / 2);
        }
        var N = 80, step = Math.max(right - left, top - bottom) / N;
        left -= step * 2; bottom -= step * 2; right += step * 2; top += step * 2;
        var nx = Math.ceil((right - left) / step) + 1, ny = Math.ceil((top - bottom) / step) + 1, owner = [], bestZ = [], ix, iy, idx;
        for (idx = 0; idx < nx * ny; idx++) { owner.push(-1); bestZ.push(-1e9); }
        for (k = 0; k < n; k++) {
            var ak = atoms[k], rk2 = ak.d * ak.d / 4;
            var row0 = Math.max(0, Math.ceil((ak.y - ak.d / 2 - bottom) / step)), row1 = Math.min(ny - 1, Math.floor((ak.y + ak.d / 2 - bottom) / step));
            for (iy = row0; iy <= row1; iy++) {
                var dy = bottom + iy * step - ak.y, w2 = rk2 - dy * dy;
                if (w2 < 0) continue;
                var half = Math.sqrt(w2);
                var col0 = Math.max(0, Math.ceil((ak.x - half - left) / step)), col1 = Math.min(nx - 1, Math.floor((ak.x + half - left) / step));
                for (ix = col0; ix <= col1; ix++) {
                    var dx = left + ix * step - ak.x, rest = rk2 - dx * dx - dy * dy;
                    var h = ak.z + Math.sqrt(rest > 0 ? rest : 0);
                    idx = iy * nx + ix;
                    if (h > bestZ[idx]) { bestZ[idx] = h; owner[idx] = k; }
                }
            }
        }
        var count = [], sumX = [], sumY = [];
        for (i = 0; i < n; i++) { count.push(0); sumX.push(0); sumY.push(0); }
        for (iy = 0; iy < ny; iy++) {
            for (ix = 0; ix < nx; ix++) {
                var o = owner[iy * nx + ix];
                if (o >= 0) { count[o]++; sumX[o] += left + ix * step; sumY[o] += bottom + iy * step; }
            }
        }

        // 마칭 스퀘어: 경계 칸의 선분(안쪽이 왼쪽). 모서리 번호 0 아래, 1 오른쪽, 2 위, 3 왼쪽
        var cases = {1: [[0, 3]], 2: [[1, 0]], 3: [[1, 3]], 4: [[2, 1]], 5: [[0, 3], [2, 1]], 6: [[2, 0]], 7: [[2, 3]],
            8: [[3, 2]], 9: [[0, 2]], 10: [[1, 0], [3, 2]], 11: [[1, 2]], 12: [[3, 1]], 13: [[0, 1]], 14: [[3, 0]]};
        var points = [], nexts = [];
        for (i = 0; i < n; i++) { points.push({}); nexts.push({}); }
        // 모서리 위 경계점(구 who의 안팎이 바뀌는 곳)을 이분법으로 찾는다. 같은 모서리는 한 번만 구한다
        function edgePoint(who, edge, cellX, cellY) {
            var horizontal = edge === 0 || edge === 2;
            var ex = edge === 1 ? cellX + 1 : cellX, ey = edge === 2 ? cellY + 1 : cellY;
            var key = (horizontal ? "h" : "v") + ex + "_" + ey;
            if (points[who][key]) return key;
            var ax = left + ex * step, ay = bottom + ey * step;
            var bx = horizontal ? ax + step : ax, by = horizontal ? ay : ay + step;
            var startInside = owner[ey * nx + ex] === who, lo = 0, hi = 1;
            for (var it = 0; it < 12; it++) {
                var mid = (lo + hi) / 2;
                if ((ownerAt(ax + (bx - ax) * mid, ay + (by - ay) * mid) === who) === startInside) lo = mid; else hi = mid;
            }
            var tt = (lo + hi) / 2;
            points[who][key] = [ax + (bx - ax) * tt, ay + (by - ay) * tt];
            return key;
        }
        for (iy = 0; iy < ny - 1; iy++) {
            for (ix = 0; ix < nx - 1; ix++) {
                var o0 = owner[iy * nx + ix], o1 = owner[iy * nx + ix + 1], o2 = owner[(iy + 1) * nx + ix + 1], o3 = owner[(iy + 1) * nx + ix];
                if (o0 === o1 && o1 === o2 && o2 === o3) continue;
                var corners = [o0, o1, o2, o3];
                for (var ci = 0; ci < 4; ci++) {
                    var who = corners[ci];
                    if (who < 0 || !overlapping[who]) continue;
                    var first = true;
                    for (var cj = 0; cj < ci; cj++) if (corners[cj] === who) first = false;
                    if (!first) continue;
                    var c = (o0 === who ? 1 : 0) | (o1 === who ? 2 : 0) | (o2 === who ? 4 : 0) | (o3 === who ? 8 : 0);
                    var list = cases[c];
                    for (var s2 = 0; s2 < list.length; s2++) {
                        nexts[who][edgePoint(who, list[s2][0], ix, iy)] = edgePoint(who, list[s2][1], ix, iy);
                    }
                }
            }
        }

        for (i = 0; i < n; i++) {
            if (count[i] === 0) { infos[i].loops = []; infos[i].label = null; continue; }
            if (!overlapping[i]) continue;
            var radius = atoms[i].d / 2, area = Math.PI * radius * radius, loops = [], visited = {};
            for (var startKey in nexts[i]) {
                if (visited[startKey]) continue;
                var loop = [], key = startKey;
                while (key !== undefined && !visited[key]) {
                    visited[key] = true;
                    loop.push(points[i][key]);
                    key = nexts[i][key];
                }
                if (loop.length >= 3) loops.push(loop);
            }
            infos[i].loops = mergeHoles(loops);
            // 윤곽이 원 전체와 같으면 전체 원으로 본다
            if (infos[i].loops.length === 1 && Math.abs(Math.abs(polygonArea(infos[i].loops[0])) - area) < area * 0.01) infos[i].loops = null;
        }

        // 기호 자리: 보이는 칸들의 무게중심에 가장 가까운 보이는 칸. 보이는 면적이 원의 10% 미만이면 기호를 달지 않는다
        for (i = 0; i < n; i++) {
            if (infos[i].label === null) continue;
            if (infos[i].loops === null) continue;
            var visibleArea = count[i] * step * step, circleArea = Math.PI * atoms[i].d * atoms[i].d / 4;
            if (visibleArea < circleArea * 0.1) { infos[i].label = null; continue; }
            var mx = sumX[i] / count[i], my = sumY[i] / count[i], bestD = 1e9, bestPoint = null;
            for (iy = 0; iy < ny; iy++) {
                for (ix = 0; ix < nx; ix++) {
                    if (owner[iy * nx + ix] !== i) continue;
                    var qx = left + ix * step, qy = bottom + iy * step, dd = (qx - mx) * (qx - mx) + (qy - my) * (qy - my);
                    if (dd < bestD) { bestD = dd; bestPoint = [qx, qy]; }
                }
            }
            infos[i].label = bestPoint;
        }
        regionCache[lay.key] = infos;
        return infos;
    }

    // 반시계 바깥 윤곽(넓이 +)과 시계 방향 구멍(넓이 -)이 섞인 윤곽선들을, 구멍마다 가장 가까운 두 꼭짓점을 폭 0인 다리로 이어
    // 바깥 윤곽에 합쳐 구멍 없는 경로들로 만든다 (일러의 클리핑 마스크는 복합 경로를 못 쓴다). 넓이의 합은 그대로다
    function mergeHoles(loops) {
        var outers = [], holes = [], i, j, k;
        for (i = 0; i < loops.length; i++) (polygonArea(loops[i]) > 0 ? outers : holes).push(loops[i]);
        for (i = 0; i < holes.length; i++) {
            var hole = holes[i], host = -1;
            for (j = 0; j < outers.length; j++) if (pointInPolygon(hole[0], outers[j])) { host = j; break; }
            if (host < 0) continue;
            var outer = outers[host], bestO = 0, bestH = 0, bestD = 1e9;
            for (j = 0; j < outer.length; j++) {
                for (k = 0; k < hole.length; k++) {
                    var dx = outer[j][0] - hole[k][0], dy = outer[j][1] - hole[k][1], dd = dx * dx + dy * dy;
                    if (dd < bestD) { bestD = dd; bestO = j; bestH = k; }
                }
            }
            var merged = outer.slice(0, bestO + 1);
            for (k = 0; k <= hole.length; k++) merged.push(hole[(bestH + k) % hole.length]);
            outers[host] = merged.concat(outer.slice(bestO));
        }
        return outers;
    }

    function pointInPolygon(point, polygon) {
        var inside = false;
        for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            var a = polygon[i], b = polygon[j];
            if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        return inside;
    }

    // 다각형 넓이(부호 있음: 반시계가 +)
    function polygonArea(points) {
        var sum = 0;
        for (var i = 0; i < points.length; i++) {
            var p = points[i], q = points[(i + 1) % points.length];
            sum += p[0] * q[1] - q[0] * p[1];
        }
        return sum / 2;
    }

    function dia(radius) {
        return radius * 2 / ANGSTROM;
    }

    // 개수 → 모아 놓을 때 줄별 개수(위에서 아래로, 아래 줄이 가득 찬다). 3개는 [1, 2]
    function clusterRows(count) {
        var cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols), lens = [], left = count;
        for (var r = rows - 1; r >= 0; r--) {
            lens[r] = Math.min(cols, left);
            left -= lens[r];
        }
        return lens;
    }

    // 같은 분자 count개를 한 줄(mode 0) 또는 모아서(mode 1) 놓는다. 좌표는 pt, 묶음 경계 가운데가 원점
    function arrangeSpecies(formula, count, mode, tilt, unit, gapPt, textbook) {
        var lays = [], maxW = 0, maxH = 0, i;
        for (i = 0; i < count; i++) {
            var lay = molLayout(formula, tilt * (i % 2 === 0 ? 1 : -1), textbook);
            lays.push(lay);
            maxW = Math.max(maxW, lay.w * unit);
            maxH = Math.max(maxH, lay.h * unit);
        }
        var items = [], w, h;
        if (mode === 0) {
            var x = 0;
            for (i = 0; i < count; i++) {
                items.push({lay: lays[i], x: x + lays[i].w * unit / 2, y: 0});
                x += lays[i].w * unit + gapPt;
            }
            w = x - gapPt;
            h = maxH;
            for (i = 0; i < items.length; i++) items[i].x -= w / 2;
        } else {
            var lens = clusterRows(count), rows = lens.length, cols = 0, index = 0;
            var cw = maxW + gapPt, ch = maxH + gapPt;
            for (var r = 0; r < rows; r++) {
                cols = Math.max(cols, lens[r]);
                for (var c = 0; c < lens[r]; c++) {
                    items.push({lay: lays[index], x: (c - (lens[r] - 1) / 2) * cw, y: ((rows - 1) / 2 - r) * ch});
                    index++;
                }
            }
            w = maxW + (cols - 1) * cw;
            h = maxH + (rows - 1) * ch;
        }
        return {items: items, w: w, h: h};
    }

    // 분자 하나를 (cx, cy)에 그린다. 같은 배치·크기는 처음 그린 그룹을 복제해 옮긴다.
    // 아래층에 구를 전체 원으로 뒤→앞 순서로 깔고(경계 틈 방지), 일부가 가려진 구는 보이는 부분만 위층에 다시 그려 교차선에서 맞닿게 한다
    function paintMolecule(t, lay, cx, cy, unit, showSymbols, F) {
        var withSymbols = showSymbols || lay.labeled;
        var key = lay.key + "|" + unit.toFixed(2) + "|" + (withSymbols ? 1 : 0) + "|" + F;
        var proto = t.molecules[key];
        if (proto) {
            var copy = proto.item.duplicate(t.group, ElementPlacement.PLACEATBEGINNING);
            copy.translate(cx - proto.cx, cy - proto.cy, true, true, true, true);
            return;
        }
        var mg = t.group.groupItems.add(), regions = molRegions(lay), i;
        for (i = 0; i < lay.atoms.length; i++) {
            var a = lay.atoms[i];
            t.sphere(mg, cx + a.x * unit, cy + a.y * unit, a.d * unit / 2, ELEMENTS[a.key].pal, null);
        }
        for (i = 0; i < lay.atoms.length; i++) {
            if (regions[i].loops === null || regions[i].loops.length === 0) continue;
            var atom = lay.atoms[i], moved = [];
            for (var m = 0; m < regions[i].loops.length; m++) {
                var loop = [];
                for (var q = 0; q < regions[i].loops[m].length; q++) loop.push([cx + regions[i].loops[m][q][0] * unit, cy + regions[i].loops[m][q][1] * unit]);
                moved.push(loop);
            }
            t.sphere(mg, cx + atom.x * unit, cy + atom.y * unit, atom.d * unit / 2, ELEMENTS[atom.key].pal, moved);
        }
        if (withSymbols) {
            for (i = 0; i < lay.atoms.length; i++) {
                if (regions[i].label === null) continue;
                var el = ELEMENTS[lay.atoms[i].key], size = Math.max(4.5, Math.min(F, lay.atoms[i].d * unit * 0.55));
                t.text(el.text + (el.sup || ""), cx + regions[i].label[0] * unit, cy + regions[i].label[1] * unit - size * 0.35, size, "center",
                    sphereTextK(el.pal, t.mode), el.sup ? {supLast: 1} : null, mg);
            }
        }
        var br = lay.bracket;
        if (br) {
            var x0 = cx + br.x0 * unit, x1 = cx + br.x1 * unit, y0 = cy + br.y0 * unit, y1 = cy + br.y1 * unit, prong = 0.2 * unit;
            t.path([[x0 + prong, y1], [x0, y1], [x0, y0], [x0 + prong, y0]], false, null, 100, 0.5, null, undefined, mg);
            t.path([[x1 - prong, y1], [x1, y1], [x1, y0], [x1 - prong, y0]], false, null, 100, 0.5, null, undefined, mg);
            t.text(MINUS, x1 + 0.1 * unit, y1 - F * 0.5, F * 1.2, "left", 100, null, mg);
        }
        t.molecules[key] = {item: mg, cx: cx, cy: cy};
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
    // spec: label(탭 이름), name(그룹 이름), prefKey, controls[], draw(tools, o), presets(선택, 반응 목록)
    // 컨트롤: {panel: "제목"} 새 패널 / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운 /
    //         {key, label, text: true, value: "글"} 글 입력
    // presets가 있으면 key "reaction" 드롭다운을 고를 때 key "formula" 글 입력을 그 반응식으로 바꾸고,
    // 글 입력을 고치면 드롭다운이 마지막 항목(직접 입력)으로 간다.
    // 위치 패널(가로·세로 이동)은 끝에 저절로 붙고, 이동은 다시 그리지 않고 그룹만 옮긴다.
    // draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
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
            var list = row.add("dropdownlist", undefined, ctl.items);
            list.selection = o[ctl.key];
            ui[ctl.key] = list;
            list.onChange = function() {
                if (list.selection === null) { list.selection = o[ctl.key]; return; }
                o[ctl.key] = list.selection.index;
                if (spec.presets && ctl.key === "reaction" && spec.presets[o.reaction].eq) {
                    o.formula = spec.presets[o.reaction].eq;
                    if (ui.formula) ui.formula.text = o.formula;
                }
                redraw();
            };
        }

        function addText(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            var input = row.add("edittext", undefined, o[ctl.key]);
            input.characters = 34;
            ui[ctl.key] = input;
            input.onChange = function() {
                o[ctl.key] = String(input.text).replace(/\|/g, "");
                if (spec.presets && ctl.key === "formula" && ui.reaction) {
                    o.reaction = spec.presets.length - 1;
                    ui.reaction.selection = o.reaction;
                }
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
            var parts = ["v6"];
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
            if (p[0] !== "v6" || p.length !== keyed.length + 1) return;
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

    // 그리기 도구. 좌표는 pt, 크기 인자는 따로 적지 않으면 pt다. 색은 K값(숫자) 또는 [r, g, b]
    function makeFormTools(g) {
        var t = {mm: FORM_MM, group: g, mode: 0, molecules: {}};
        // 0 컬러 / 1 회색 음영. 그리기 전에 한 번 정한다
        t.setMode = function(mode) { t.mode = mode; };
        t.path = function(points, closed, fill, stroke, width, dashes, join, parent) {
            var p = (parent || g).pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fill, stroke, width, dashes, join);
            return p;
        };
        t.poly = function(points, fill, stroke, width) {
            return t.path(points, true, fill, stroke, width);
        };
        // 정육면체 면: 선 모퉁이는 각진(마이터) 연결이 아니라 경사(베벨) 연결
        function cubePoly(points, fill, stroke, width) {
            return t.path(points, true, fill, stroke, width, null, StrokeJoin.BEVELENDJOIN);
        }
        t.line = function(a, b, width, k, dashes) {
            return t.path([a, b], false, null, k === undefined ? 100 : k, width, dashes);
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
        // 속 채운 화살표(위가 밝고 아래가 어두운 그라데이션). x0 → x1, 세로 가운데 y
        t.blockArrow = function(x0, x1, y, colorIndex) {
            var length = x1 - x0, headLength = length * 0.36, headHalf = length * 0.21, shaftHalf = length * 0.11;
            var p = t.path([[x0, y + shaftHalf], [x1 - headLength, y + shaftHalf], [x1 - headLength, y + headHalf], [x1, y],
                [x1 - headLength, y - headHalf], [x1 - headLength, y - shaftHalf], [x0, y - shaftHalf]], true, null, null, 0);
            p.filled = true;
            var color = ARROW_COLORS[colorIndex];
            if (color === null) {
                p.fillColor = formGray(100);
                return;
            }
            var gradientColor = new GradientColor();
            var gray = t.mode === 1;
            gradientColor.gradient = formGradient("RM_arrow_" + color.id + (gray ? "_gray" : ""), GradientType.LINEAR,
                gray ? [[0, color.grayTop], [100, color.grayBottom]] : [[0, color.top], [100, color.bottom]]);
            p.fillColor = gradientColor;
            // 새 채우기에는 마지막 그라데이션 각도가 붙으므로 읽어서 차이만큼만 돌린다 (위가 밝게 = -90)
            p.rotate(-90 - p.fillColor.angle, false, false, true, false, Transformation.CENTER);
        };
        // 십자(더하기) 기호. 가운데 (cx, cy), 폭 size
        t.plus = function(cx, cy, size, colorIndex) {
            var h = size / 2, w = size * 0.13;
            var p = t.path([[cx - w, cy + h], [cx + w, cy + h], [cx + w, cy + w], [cx + h, cy + w], [cx + h, cy - w], [cx + w, cy - w],
                [cx + w, cy - h], [cx - w, cy - h], [cx - w, cy - w], [cx - h, cy - w], [cx - h, cy + w], [cx - w, cy + w]],
                true, PLUS_COLORS[colorIndex] === null ? 100 : (t.mode === 1 ? PLUS_COLORS[colorIndex].k : PLUS_COLORS[colorIndex].rgb), null, 0);
            return p;
        };
        // 공간 채움 구: 왼쪽 위에 하이라이트. loops(구멍 없는 윤곽선들)가 있으면 그 안쪽만 보이게, 조각마다 클리핑 그룹 하나. parent 그룹 안에 만든다
        t.sphere = function(parent, cx, cy, r, pal, loops) {
            var pieces = loops === null || loops === undefined ? [null] : loops;
            for (var m = 0; m < pieces.length; m++) {
                var clip = parent.groupItems.add();
                var radius = r * 1.5, hx = cx - r * 0.3, hy = cy + r * 0.3;
                var big = clip.pathItems.ellipse(hy + radius, hx - radius, radius * 2, radius * 2);
                big.stroked = false;
                big.filled = true;
                var gradientColor = new GradientColor();
                var gray = t.mode === 1, colors = gray ? SPHERE_GRAYS[pal] : SPHERE_COLORS[pal];
                gradientColor.gradient = formGradient("RM_sphere_" + pal + (gray ? "_gray" : ""), GradientType.RADIAL,
                    [[0, colors[0]], [30, colors[1]], [100, colors[2]]]);
                big.fillColor = gradientColor;
                var mask;
                if (pieces[m] === null) {
                    mask = clip.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
                } else {
                    mask = clip.pathItems.add();
                    mask.setEntirePath(pieces[m]);
                    mask.closed = true;
                }
                mask.filled = false;
                mask.stroked = false;
                clip.clipped = true;
            }
        };
        // 정육면체의 뒤쪽 면(뒷면·왼쪽 안쪽 벽·바닥). 분자를 그리기 전에
        t.cubeBack = function(x0, y0, w, h, dx, dy) {
            var c = CUBE_COLORS[t.mode];
            cubePoly([[x0 + dx, y0 + dy], [x0 + w + dx, y0 + dy], [x0 + w + dx, y0 + h + dy], [x0 + dx, y0 + h + dy]], c.back, c.edgeSoft, 0.3);
            cubePoly([[x0, y0], [x0 + dx, y0 + dy], [x0 + dx, y0 + h + dy], [x0, y0 + h]], c.left, c.edgeSoft, 0.3);
            cubePoly([[x0, y0], [x0 + w, y0], [x0 + w + dx, y0 + dy], [x0 + dx, y0 + dy]], c.floor, c.edgeSoft, 0.3);
        };
        // 정육면체의 앞쪽 면(앞면·윗면·오른쪽 면은 반투명)과 모서리, n칸이면 칸막이. 분자를 그린 뒤에
        t.cubeFront = function(x0, y0, w, h, dx, dy, n) {
            var c = CUBE_COLORS[t.mode];
            var front = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
            var top = [[x0, y0 + h], [x0 + w, y0 + h], [x0 + w + dx, y0 + h + dy], [x0 + dx, y0 + h + dy]];
            var right = [[x0 + w, y0], [x0 + w + dx, y0 + dy], [x0 + w + dx, y0 + h + dy], [x0 + w, y0 + h]];
            cubePoly(front, c.front, null, 0).opacity = 15;
            cubePoly(top, c.top, null, 0).opacity = 75;
            cubePoly(right, c.right, null, 0).opacity = 80;
            cubePoly(front, null, c.edge, 0.4);
            cubePoly(top, null, c.edge, 0.4);
            cubePoly(right, null, c.edge, 0.4);
            for (var k = 1; k < n; k++) {
                var xk = x0 + w * k / n;
                t.line([xk, y0], [xk, y0 + h], 0.4, c.edge);
                t.line([xk, y0 + h], [xk + dx, y0 + h + dy], 0.4, c.edge);
                t.line([xk + dx, y0 + dy], [xk + dx, y0 + h + dy], 0.4, c.edgeSoft);
                t.line([xk, y0], [xk + dx, y0 + dy], 0.4, c.edgeSoft);
            }
        };
        // (x, baseline)이 글자의 가로 기준(align 가운데·"left"면 왼쪽 끝·"right"면 오른쪽 끝)과 기준선.
        // opts: sub 글자 뒤 숫자를 아래 첨자로 / supLast 끝에서 n글자를 위 첨자로
        t.text = function(text, x, baseline, size, align, k, opts, parent) {
            var frame = (parent || g).textFrames.add();
            frame.contents = String(text);
            var range = frame.textRange;
            var attributes = range.characterAttributes;
            attributes.size = size;
            attributes.fillColor = formGray(k === undefined ? 100 : k);
            formFonts(frame, opts);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            var anchor = frame.anchor;
            frame.translate(x - anchorX, baseline - anchor[1]);
            return frame;
        };
        return t;
    }

    // 같은 이름 그라데이션이 문서에 있으면 다시 쓴다 (실행마다 견본이 늘지 않게). stops: [[위치%, K값 또는 [r, g, b]], ...]
    function formGradient(name, type, stops) {
        if (gradientCache[name]) return gradientCache[name];
        var gradient = null;
        try { gradient = doc.gradients.getByName(name); } catch (e) { gradient = null; }
        if (gradient === null) {
            gradient = doc.gradients.add();
            gradient.name = name;
            gradient.type = type;
            for (var added = gradient.gradientStops.length; added < stops.length; added++) gradient.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                var stop = gradient.gradientStops[i];
                stop.rampPoint = stops[i][0];
                stop.color = formColor(stops[i][1]);
            }
        }
        gradientCache[name] = gradient;
        return gradient;
    }

    function formPaint(p, fill, stroke, width, dashes, join) {
        p.filled = fill !== null && fill !== undefined;
        if (p.filled) p.fillColor = formColor(fill);
        p.stroked = stroke !== null && stroke !== undefined && width > 0;
        if (p.stroked) {
            p.strokeColor = formColor(stroke);
            p.strokeWidth = width;
            p.strokeDashes = dashes || [];
            if (join !== undefined && join !== null) p.strokeJoin = join;
        }
    }

    // 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt), GSMediumB1에 없는 기호(−)는 HancomEQN — 02_문자/Text_koen.jsx 규칙
    function formFonts(frame, opts) {
        var text = frame.contents, range = frame.textRange, kinds = [], uniform = true, i;
        for (i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i), kind = 1;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) kind = 0;
            else if (code > 126 && "°±·˘∞≈≠".indexOf(text.charAt(i)) < 0) kind = 2;
            kinds.push(kind);
            if (kind !== kinds[0]) uniform = false;
        }
        if (uniform) {
            formSetFont(range.characterAttributes, kinds[0]);
        } else {
            for (i = 0; i < text.length; i++) {
                var charAttributes = range.characters[i].characterAttributes;
                formSetFont(charAttributes, kinds[i]);
            }
        }
        var subFlags = opts && opts.sub ? formSubFlags(text) : null;
        var supStart = opts && opts.supLast ? text.length - opts.supLast : text.length;
        for (i = 0; i < text.length; i++) {
            if (i >= supStart || (subFlags && subFlags[i])) {
                var scriptAttributes = range.characters[i].characterAttributes;
                scriptAttributes.baselinePosition = i >= supStart ? FontBaselineOption.SUPERSCRIPT : FontBaselineOption.SUBSCRIPT;
            }
        }
    }

    function formSetFont(attributes, kind) {
        attributes.textFont = kind === 0 ? FORM_KOR_FONT : (kind === 2 ? FORM_MATH_FONT : FORM_ENG_FONT);
        attributes.baselineShift = kind === 1 ? 0.5 : 0;
    }

    // 글자(또는 닫는 괄호) 뒤 숫자는 아래 첨자, 그 숫자에 이어진 숫자도 아래 첨자
    function formSubFlags(text) {
        var flags = [];
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            flags.push(code >= 48 && code <= 57 && i > 0 && (/[A-Za-z)]/.test(text.charAt(i - 1)) || flags[i - 1] === true));
        }
        return flags;
    }

    function formFindFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    function formColor(value) {
        return typeof value === "number" ? formGray(value) : formRgb(value);
    }

    function formRgb(values) {
        var rgb = new RGBColor();
        rgb.red = values[0]; rgb.green = values[1]; rgb.blue = values[2];
        return rgb;
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
