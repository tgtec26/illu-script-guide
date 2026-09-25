// Object_StarTrails.jsx
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

// 별의 일주 운동: 화면 가운데에 방향별 하늘의 별 궤적을 그린다. 한 시간에 15°씩 돈다. 창 맨 위 탭으로 방식을 고른다.
//   [개념도] 교과서 모식도. 별 자리는 무작위.
//   - 북쪽: 북극성을 가운데 두고 시계 반대 방향으로 도는 동심원 호. 반지름은 고르게 나누고 시작 각은 배치 번호로 흩는다.
//     가장 바깥 호의 두 끝으로 반지름 파선과 각도 표시(예: 45°)를 넣을 수 있다.
//   - 동쪽: 지평선에서 오른쪽 위로 비스듬히 떠오르는 평행선, 서쪽: 오른쪽 아래로 지는 평행선.
//     지평선과 이루는 각은 90° − 위도.
//   - 남쪽: 지평선 아래에 중심을 둔 동심원 호. 왼쪽(동)에서 오른쪽(서)으로 움직인다.
//   [실제 별] 실제 별의 적경·적위로, 계절 대표일(봄 4/15·여름 7/15·가을 10/15·겨울 1/15)의 시각에 서울(동경 127°)에서
//     보이는 자리와 궤적을 계산한다. 시야는 카메라(직선 투영): 북쪽은 천구 북극을 가운데 두고(정확한 동심원), 동·남·서는
//     고도 30°를 가운데 둔다. 지평선 아래는 자른다. 별자리 프리셋을 고르면 그 시각 별자리가 있는 방향이 저절로 선택된다.
//     별 이름·별자리 선·밝기별 별 점을 켜고 끈다.
//   - 궤적 끝에 방향 화살촉, 아래에 지평선과 방위 글자. 방향·크기·관측 시간·위도·표시·위치는 두 탭이 같이 쓴다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectStarTrails/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var GUIDE_DASH = [2, 1.5];
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    // 도(°, U+00B0)는 GSMediumB1의 U+02D8(˘) 글리프로 넣는다 (02_문자/Text_degree.jsx)
    var DEGREE_GLYPH = "\u02D8";
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    var DIRECTIONS = ["북쪽", "동쪽", "남쪽", "서쪽"];
    var DIRECTION_LETTERS = ["북", "동", "남", "서"];
    var MODES = ["개념도", "실제 별"];
    var SEASONS = ["봄", "여름", "가을", "겨울"];
    // 계절 대표일: 4/15, 7/15, 10/15, 1/15 (2026년 1월 1일부터 센 날, 0부터)
    var SEASON_DAYS = [104, 195, 287, 14];
    var LONGITUDE_DEG = 127;       // 서울
    var TIME_ZONE_HOURS = 9;       // 한국 표준시
    var VIEW_ALT_DEG = 30;         // 동·남·서 시야 가운데 고도. 북쪽은 천구 북극(= 위도)을 가운데 둔다
    var TRAIL_STEP_DEG = 2;        // 궤적 표본 간격 (시간각)
    var POLE_TRAIL_MIN_DEG = 1.5;  // 북극에 이보다 가까운 별(북극성)은 궤적 없이 점만
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [20, 200];
    var COUNT_RANGE = [1, 20];
    var HOURS_RANGE = [0.5, 24];
    var LATITUDE_RANGE = [0, 90];
    var HEAD_RANGE = [0, 200];
    var SEED_RANGE = [1, 99];
    var FONT_RANGE = [5, 20];
    var HOUR_RANGE = [0, 24];

    // 실제 별: [키, 이름(없으면 ""), 적경(°), 적위(°), 겉보기 등급] (J2000)
    var STARS = [
        // 북두칠성 (큰곰자리)
        ["dubhe", "두베", 165.932, 61.751, 1.79],
        ["merak", "메라크", 165.460, 56.383, 2.37],
        ["phecda", "페크다", 178.458, 53.695, 2.44],
        ["megrez", "메그레즈", 183.857, 57.033, 3.31],
        ["alioth", "알리오트", 193.507, 55.960, 1.77],
        ["mizar", "미자르", 200.981, 54.925, 2.27],
        ["alkaid", "알카이드", 206.885, 49.313, 1.86],
        // 카시오페이아자리
        ["caph", "카프", 2.295, 59.150, 2.28],
        ["schedar", "셰다르", 10.127, 56.537, 2.24],
        ["gamma-cas", "", 14.177, 60.717, 2.2],
        ["ruchbah", "루크바", 21.454, 60.235, 2.68],
        ["segin", "세긴", 28.599, 63.670, 3.37],
        // 작은곰자리
        ["polaris", "북극성", 37.955, 89.264, 1.98],
        ["kochab", "코카브", 222.676, 74.156, 2.07],
        ["pherkad", "페르카드", 230.182, 71.834, 3.00],
        ["yildun", "", 263.054, 86.586, 4.35],
        ["eps-umi", "", 251.493, 82.037, 4.21],
        ["zeta-umi", "", 236.015, 77.794, 4.29],
        ["eta-umi", "", 244.376, 75.755, 4.95],
        // 사자자리
        ["regulus", "레굴루스", 152.093, 11.967, 1.40],
        ["denebola", "데네볼라", 177.265, 14.572, 2.14],
        ["algieba", "알기에바", 154.993, 19.841, 2.08],
        ["zosma", "조스마", 168.527, 20.524, 2.56],
        ["chertan", "", 168.560, 15.429, 3.33],
        ["adhafera", "", 154.173, 23.417, 3.44],
        ["rasalas", "", 148.191, 26.007, 3.88],
        ["algenubi", "", 146.463, 23.774, 2.98],
        ["eta-leo", "", 151.833, 16.763, 3.49],
        // 처녀자리
        ["spica", "스피카", 201.298, -11.161, 0.98],
        ["porrima", "", 190.415, -1.449, 2.74],
        ["vindemiatrix", "", 195.544, 10.959, 2.83],
        ["zavijava", "", 177.674, 1.765, 3.60],
        ["heze", "", 203.673, -0.596, 3.38],
        ["auva", "", 193.901, 3.398, 3.38],
        // 목동자리
        ["arcturus", "아르크투루스", 213.915, 19.183, -0.05],
        ["izar", "", 221.247, 27.074, 2.37],
        ["muphrid", "", 208.671, 18.398, 2.68],
        ["seginus", "", 218.019, 38.308, 3.03],
        ["nekkar", "", 225.487, 40.391, 3.49],
        ["delta-boo", "", 228.876, 33.315, 3.47],
        ["rho-boo", "", 217.958, 30.371, 3.57],
        // 전갈자리
        ["antares", "안타레스", 247.352, -26.432, 1.06],
        ["acrab", "", 241.359, -19.806, 2.62],
        ["dschubba", "", 240.083, -22.622, 2.29],
        ["pi-sco", "", 239.713, -26.114, 2.89],
        ["sigma-sco", "", 245.297, -25.593, 2.88],
        ["tau-sco", "", 248.971, -28.216, 2.82],
        ["eps-sco", "", 252.541, -34.293, 2.29],
        ["mu-sco", "", 252.968, -38.048, 3.0],
        ["zeta-sco", "", 253.646, -42.361, 3.6],
        ["eta-sco", "", 258.038, -43.239, 3.33],
        ["sargas", "", 264.330, -42.998, 1.86],
        ["iota-sco", "", 266.896, -40.127, 3.03],
        ["kappa-sco", "", 265.622, -39.030, 2.39],
        ["shaula", "샤울라", 263.402, -37.104, 1.62],
        ["lesath", "", 262.691, -37.296, 2.70],
        // 여름의 대삼각형 · 백조자리
        ["vega", "베가", 279.235, 38.784, 0.03],
        ["deneb", "데네브", 310.358, 45.280, 1.25],
        ["altair", "알타이르", 297.696, 8.868, 0.77],
        ["sadr", "사드르", 305.557, 40.257, 2.23],
        ["gienah", "", 311.553, 33.970, 2.48],
        ["delta-cyg", "", 296.244, 45.131, 2.87],
        ["albireo", "알비레오", 292.680, 27.960, 3.18],
        // 페가수스자리 · 안드로메다자리
        ["markab", "마르카브", 346.190, 15.205, 2.49],
        ["scheat", "셰아트", 345.944, 28.083, 2.42],
        ["algenib", "알게니브", 3.309, 15.184, 2.83],
        ["alpheratz", "알페라츠", 2.097, 29.091, 2.06],
        ["mirach", "미라크", 17.433, 35.621, 2.05],
        ["almach", "알마크", 30.975, 42.330, 2.10],
        ["delta-and", "", 9.832, 30.861, 3.27],
        // 남쪽물고기자리
        ["fomalhaut", "포말하우트", 344.413, -29.622, 1.16],
        // 오리온자리
        ["betelgeuse", "베텔게우스", 88.793, 7.407, 0.42],
        ["rigel", "리겔", 78.634, -8.202, 0.13],
        ["bellatrix", "벨라트릭스", 81.283, 6.350, 1.64],
        ["mintaka", "", 83.002, -0.299, 2.23],
        ["alnilam", "", 84.053, -1.202, 1.69],
        ["alnitak", "", 85.190, -1.943, 1.77],
        ["saiph", "사이프", 86.939, -9.670, 2.09],
        // 겨울의 대삼각형 · 대육각형
        ["sirius", "시리우스", 101.287, -16.716, -1.46],
        ["procyon", "프로키온", 114.825, 5.225, 0.34],
        ["aldebaran", "알데바란", 68.980, 16.509, 0.85],
        ["capella", "카펠라", 79.172, 45.998, 0.08],
        ["pollux", "폴룩스", 116.329, 28.026, 1.14],
        ["castor", "카스토르", 113.649, 31.888, 1.58]
    ];
    // 별자리 프리셋. season: -1 사계절(북쪽 주극성), 0 봄, 1 여름, 2 가을, 3 겨울. lines는 이어 그릴 별 순서
    var PRESETS = [
        {id: "big-dipper", name: "북두칠성", season: -1,
            stars: ["dubhe", "merak", "phecda", "megrez", "alioth", "mizar", "alkaid"],
            lines: [["dubhe", "merak", "phecda", "megrez", "dubhe"], ["megrez", "alioth", "mizar", "alkaid"]]},
        {id: "cassiopeia", name: "카시오페이아자리", season: -1,
            stars: ["caph", "schedar", "gamma-cas", "ruchbah", "segin"],
            lines: [["caph", "schedar", "gamma-cas", "ruchbah", "segin"]]},
        {id: "ursa-minor", name: "작은곰자리", season: -1,
            stars: ["polaris", "yildun", "eps-umi", "zeta-umi", "kochab", "pherkad", "eta-umi"],
            lines: [["polaris", "yildun", "eps-umi", "zeta-umi", "kochab", "pherkad", "eta-umi", "zeta-umi"]]},
        {id: "leo", name: "사자자리", season: 0,
            stars: ["regulus", "denebola", "algieba", "zosma", "chertan", "adhafera", "rasalas", "algenubi", "eta-leo"],
            lines: [["regulus", "eta-leo", "algieba", "adhafera", "rasalas", "algenubi"], ["regulus", "chertan", "denebola", "zosma", "algieba"]]},
        {id: "virgo", name: "처녀자리 (스피카)", season: 0,
            stars: ["spica", "porrima", "vindemiatrix", "zavijava", "heze", "auva"],
            lines: [["zavijava", "porrima", "spica", "heze", "auva", "porrima"], ["auva", "vindemiatrix"]]},
        {id: "bootes", name: "목동자리 (아르크투루스)", season: 0,
            stars: ["arcturus", "izar", "muphrid", "seginus", "nekkar", "delta-boo", "rho-boo"],
            lines: [["arcturus", "izar", "delta-boo", "nekkar", "seginus", "rho-boo", "arcturus", "muphrid"]]},
        {id: "scorpius", name: "전갈자리", season: 1,
            stars: ["antares", "acrab", "dschubba", "pi-sco", "sigma-sco", "tau-sco", "eps-sco", "mu-sco", "zeta-sco", "eta-sco", "sargas", "iota-sco", "kappa-sco", "shaula", "lesath"],
            lines: [["acrab", "dschubba", "pi-sco"], ["dschubba", "sigma-sco", "antares", "tau-sco", "eps-sco", "mu-sco", "zeta-sco", "eta-sco", "sargas", "iota-sco", "kappa-sco", "shaula", "lesath"]]},
        {id: "summer-triangle", name: "여름의 대삼각형", season: 1,
            stars: ["vega", "deneb", "altair"],
            lines: [["vega", "deneb", "altair", "vega"]]},
        {id: "cygnus", name: "백조자리", season: 1,
            stars: ["deneb", "sadr", "gienah", "delta-cyg", "albireo"],
            lines: [["deneb", "sadr", "albireo"], ["delta-cyg", "sadr", "gienah"]]},
        {id: "pegasus", name: "페가수스 사각형·안드로메다자리", season: 2,
            stars: ["markab", "scheat", "algenib", "alpheratz", "mirach", "almach", "delta-and"],
            lines: [["markab", "scheat", "alpheratz", "algenib", "markab"], ["alpheratz", "delta-and", "mirach", "almach"]]},
        {id: "fomalhaut", name: "남쪽물고기자리 (포말하우트)", season: 2,
            stars: ["fomalhaut"], lines: []},
        {id: "orion", name: "오리온자리", season: 3,
            stars: ["betelgeuse", "rigel", "bellatrix", "mintaka", "alnilam", "alnitak", "saiph"],
            lines: [["betelgeuse", "bellatrix", "mintaka", "alnilam", "alnitak", "saiph", "rigel", "mintaka"], ["alnitak", "betelgeuse"]]},
        {id: "winter-triangle", name: "겨울의 대삼각형", season: 3,
            stars: ["betelgeuse", "sirius", "procyon"],
            lines: [["betelgeuse", "sirius", "procyon", "betelgeuse"]]},
        {id: "winter-hexagon", name: "겨울의 대육각형", season: 3,
            stars: ["sirius", "procyon", "pollux", "castor", "capella", "aldebaran", "rigel", "betelgeuse"],
            lines: [["sirius", "procyon", "pollux", "capella", "aldebaran", "rigel", "sirius"], ["pollux", "castor"]]}
    ];
    var STAR_MAP = buildStarMap(STARS);

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var direction = 0;
    var sizeMm = 60;
    var count = 6;
    var hours = 3;
    var latitude = 37.5;
    var headScale = 60;
    var seed = 1;
    var angleMark = true;
    var horizonOn = true;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var mode = 0;
    var season = 3;
    var presetId = "orion";
    var clockHour = 21;
    var namesOn = true;
    var linesOn = true;
    var dotsOn = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "별의 일주 운동");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    // 방식은 탭으로 나누고, 탭마다 제 옵션만 둔다. 하늘·표시·위치는 두 탭이 같이 쓴다
    var tabs = dlg.add("tabbedpanel");
    tabs.alignChildren = "fill";
    var modeTabs = [];
    for (var m = 0; m < MODES.length; m++) {
        var tab = tabs.add("tab", undefined, MODES[m]);
        tab.alignChildren = ["left", "top"];
        tab.margins = [12, 12, 12, 12];
        tab.spacing = 6;
        modeTabs.push(tab);
    }
    var schematicTab = modeTabs[0], realTab = modeTabs[1];
    var countRow = addValueRow(schematicTab, "별 수", "개", count, COUNT_RANGE[0], COUNT_RANGE[1], 1, 0);
    var seedRow = addValueRow(schematicTab, "배치 번호", "", seed, SEED_RANGE[0], SEED_RANGE[1], 1, 0);
    var angleCheck = schematicTab.add("checkbox", undefined, "각도 표시 (북쪽)");

    var seasonRow = realTab.add("group");
    var seasonLabel = seasonRow.add("statictext", undefined, "계절:");
    seasonLabel.preferredSize.width = LABEL_WIDTH;
    seasonLabel.helpTip = "대표일: 봄 4월 15일, 여름 7월 15일, 가을 10월 15일, 겨울 1월 15일";
    var seasonRadios = [];
    for (var s = 0; s < SEASONS.length; s++) seasonRadios.push(seasonRow.add("radiobutton", undefined, SEASONS[s]));
    var presetRow = realTab.add("group");
    presetRow.add("statictext", undefined, "별자리:").preferredSize.width = LABEL_WIDTH;
    var presetList = presetRow.add("dropdownlist", undefined, []);
    presetList.preferredSize.width = 200;
    presetList.helpTip = "고르면 그 시각에 별자리가 있는 방향이 저절로 선택된다";
    var hourRow = addValueRow(realTab, "시각", "h", clockHour, HOUR_RANGE[0], HOUR_RANGE[1], 0.5, 1);
    hourRow.input.helpTip = "관측을 시작하는 시각(24시간제, 한국 표준시). 궤적은 여기서 관측 시간만큼 이어진다";
    var infoText = realTab.add("statictext", undefined, " ");
    infoText.preferredSize.width = 360;
    var realCheckRow = realTab.add("group");
    var namesCheck = realCheckRow.add("checkbox", undefined, "별 이름");
    var linesCheck = realCheckRow.add("checkbox", undefined, "별자리 선");
    var dotsCheck = realCheckRow.add("checkbox", undefined, "별 점 (밝을수록 크게)");
    tabs.selection = modeTabs[mode];

    var skyPanel = addPanel(dlg, "하늘");
    var directionRow = skyPanel.add("group");
    directionRow.add("statictext", undefined, "방향:").preferredSize.width = LABEL_WIDTH;
    var directionRadios = [];
    for (var d = 0; d < DIRECTIONS.length; d++) directionRadios.push(directionRow.add("radiobutton", undefined, DIRECTIONS[d]));
    var sizeRow = addValueRow(skyPanel, "크기", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 1, 0);
    var hoursRow = addValueRow(skyPanel, "관측 시간", "h", hours, HOURS_RANGE[0], HOURS_RANGE[1], 0.5, 1);
    hoursRow.input.helpTip = "한 시간에 15°씩 돈다";
    var latitudeRow = addValueRow(skyPanel, "위도", "°", latitude, LATITUDE_RANGE[0], LATITUDE_RANGE[1], 0.5, 1);
    latitudeRow.input.helpTip = "동쪽·서쪽 하늘에서 궤적이 지평선과 이루는 각 = 90° − 위도. 실제 별은 모든 방향에 쓴다";

    var markPanel = addPanel(dlg, "표시");
    var headRow = addValueRow(markPanel, "화살촉 크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);
    headRow.input.helpTip = "0이면 화살촉 없음";
    var horizonCheck = markPanel.add("checkbox", undefined, "지평선·방위");
    var fontRow = addValueRow(markPanel, "글자 크기", "pt", fontPt, FONT_RANGE[0], FONT_RANGE[1], 0.5, 1);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXRow = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYRow = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    directionRadios[direction].value = true;
    angleCheck.value = angleMark;
    horizonCheck.value = horizonOn;
    seasonRadios[season].value = true;
    namesCheck.value = namesOn;
    linesCheck.value = linesOn;
    dotsCheck.value = dotsOn;
    var fillingPresets = false;
    fillPresetList();
    syncEnabled();

    for (var dr = 0; dr < directionRadios.length; dr++) {
        directionRadios[dr].onClick = (function(index) {
            return function() { direction = index; syncEnabled(); updatePreview(); };
        })(dr);
    }
    angleCheck.onClick = function() { angleMark = angleCheck.value; updatePreview(); };
    horizonCheck.onClick = function() { horizonOn = horizonCheck.value; updatePreview(); };
    // Tab에는 index가 없어 제목으로 찾는다
    tabs.onChange = function() {
        if (!tabs.selection) return;
        for (var i = 0; i < MODES.length; i++) if (tabs.selection.text === MODES[i]) mode = i;
        if (mode === 1) faceConstellation();
        syncEnabled();
        updatePreview();
    };
    for (var sr = 0; sr < seasonRadios.length; sr++) {
        seasonRadios[sr].onClick = (function(index) {
            return function() { season = index; fillPresetList(); faceConstellation(); updatePreview(); };
        })(sr);
    }
    presetList.onChange = function() {
        if (fillingPresets || !presetList.selection) return;
        presetId = visiblePresets()[presetList.selection.index].id;
        faceConstellation();
        updatePreview();
    };
    namesCheck.onClick = function() { namesOn = namesCheck.value; updatePreview(); };
    linesCheck.onClick = function() { linesOn = linesCheck.value; updatePreview(); };
    dotsCheck.onClick = function() { dotsOn = dotsCheck.value; updatePreview(); };
    bindValueRow(hourRow, function() { return clockHour; }, function(v) { clockHour = v; });
    bindValueRow(sizeRow, function() { return sizeMm; }, function(v) { sizeMm = v; });
    bindValueRow(countRow, function() { return count; }, function(v) { count = v; });
    bindValueRow(hoursRow, function() { return hours; }, function(v) { hours = v; });
    bindValueRow(latitudeRow, function() { return latitude; }, function(v) { latitude = v; });
    bindValueRow(seedRow, function() { return seed; }, function(v) { seed = v; });
    bindValueRow(headRow, function() { return headScale; }, function(v) { headScale = v; });
    bindValueRow(fontRow, function() { return fontPt; }, function(v) { fontPt = v; });
    bindPositionRow(offsetXRow, function() { return offsetXmm; }, function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYRow, function() { return offsetYmm; }, function(v) { offsetYmm = v; }, false);
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
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
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // 각도 표시는 북쪽에서만, 위도는 실제 별과 개념도의 동쪽·서쪽에서 뜻이 있다
    function syncEnabled() {
        angleCheck.enabled = direction === 0;
        setRowEnabled(latitudeRow, mode === 1 || direction === 1 || direction === 3);
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (mode === 1) updateInfo();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        var size = sizeMm * MM;
        var cx = viewCenter[0];
        var cy = viewCenter[1];
        previewGroup = layer.groupItems.add();
        previewGroup.name = "별의 일주 운동 (" + DIRECTIONS[direction] + (mode === 1 ? ", " + findPreset(presetId).name : "") + ")";
        var black = makeGray(100);
        var trails = previewGroup.groupItems.add();
        trails.name = "궤적";
        var paths = [];
        if (mode === 1) {
            drawRealSky(size, cx, cy, trails, paths, black);
        } else {
            var lines = direction === 0 ? northTrails(count, size, hours, seed)
                : (direction === 2 ? southTrails(count, size, hours) : slantTrails(count, size, hours, latitude, direction === 1, seed));
            for (var i = 0; i < lines.length; i++) {
                var path = drawBezier(trails, lines[i], false);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = black;
                path.strokeWidth = LINE_WIDTH_PT;
                path.translate(cx, cy);
                paths.push(path);
            }
            if (direction === 0) {
                var star = previewGroup.pathItems.ellipse(cy + 1 * MM, cx - 1 * MM, 2 * MM, 2 * MM);
                star.stroked = false;
                star.filled = true;
                star.fillColor = black;
                star.name = "북극성";
                addText("북극성", cx, cy - 1 * MM - fontPt * 0.9);
                if (angleMark && lines.length > 0) drawAngleMark(cx, cy, size, hours, seed);
            }
        }
        if (horizonOn) {
            var horizonY = cy - size / 2;
            var horizon = previewGroup.pathItems.add();
            horizon.setEntirePath([[cx - size / 2, horizonY], [cx + size / 2, horizonY]]);
            horizon.filled = false;
            horizon.stroked = true;
            horizon.strokeColor = black;
            horizon.strokeWidth = LINE_WIDTH_PT * 2;
            horizon.name = "지평선";
            addText(DIRECTION_LETTERS[direction], cx, horizonY - fontPt * 0.9);
        }
        if (headScale > 0) applyArrowheads(paths, LINE_WIDTH_PT, headScale);
        if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM, offsetYmm * MM);
    }

    // 가장 바깥 호의 두 끝으로 반지름 파선을 긋고, 가운데 가까이에 작은 호와 각도 글자를 둔다
    function drawAngleMark(cx, cy, size, hours, seed) {
        var outer = northArcs(count, size, hours, seed);
        var arc = outer[outer.length - 1];
        var group = previewGroup.groupItems.add();
        group.name = "각도 표시";
        var ends = [arc.start, arc.end];
        for (var i = 0; i < 2; i++) {
            var line = group.pathItems.add();
            line.setEntirePath([[cx, cy], [cx + arc.r * Math.cos(ends[i]), cy + arc.r * Math.sin(ends[i])]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = makeGray(100);
            line.strokeWidth = LINE_WIDTH_PT;
            line.strokeDashes = GUIDE_DASH;
        }
        var markR = arc.r * 0.3;
        var mark = drawBezier(group, arcPoints(0, 0, markR, arc.start, arc.end), false);
        mark.filled = false;
        mark.stroked = true;
        mark.strokeColor = makeGray(100);
        mark.strokeWidth = LINE_WIDTH_PT;
        mark.translate(cx, cy);
        var middle = (arc.start + arc.end) / 2;
        var degrees = Math.round(hours * 15 * 10) / 10;
        var text = addText(degrees + "°", cx + markR * 1.5 * Math.cos(middle), cy + markR * 1.5 * Math.sin(middle));
        text.move(group, ElementPlacement.PLACEATEND);
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

    // -------------------------------------------------------
    // 궤적 (순수 계산, 가운데 (0, 0) 기준)
    // -------------------------------------------------------
    // 같은 seed면 같은 수열 (0 이상 1 미만)
    function makeRandom(seed) {
        var state = (seed * 2654435761) % 4294967296;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // 북쪽 하늘 호: 반지름은 (크기의 45%)를 별 수로 고르게 나눈 값, 시작 각은 무작위, 시계 반대 방향으로 시간 × 15°
    function northArcs(n, size, hours, seed) {
        var random = makeRandom(seed);
        var sweep = hours * 15 * Math.PI / 180;
        var maxR = size * 0.45;
        var arcs = [];
        for (var i = 1; i <= n; i++) {
            var start = random() * 2 * Math.PI;
            arcs.push({r: maxR * i / n, start: start, end: start + sweep});
        }
        return arcs;
    }

    function northTrails(n, size, hours, seed) {
        var arcs = northArcs(n, size, hours, seed);
        var list = [];
        for (var i = 0; i < arcs.length; i++) list.push(arcPoints(0, 0, arcs[i].r, arcs[i].start, arcs[i].end));
        return list;
    }

    // 남쪽 하늘: 지평선(아래 끝)에서 크기의 80%만큼 아래에 중심을 둔 동심원 호. 꼭대기를 가운데로 왼쪽 → 오른쪽 (시계 방향).
    // 가장 안쪽 반지름(크기의 95%)은 3시간 호의 두 끝이 지평선 위에 남는 값이다
    function southTrails(n, size, hours) {
        var sweep = hours * 15 * Math.PI / 180;
        var centerY = -size / 2 - size * 0.8;
        var list = [];
        for (var i = 0; i < n; i++) {
            var r = size * 0.95 + size * 0.65 * (i + 0.5) / n;
            list.push(arcPoints(0, centerY, r, Math.PI / 2 + sweep / 2, Math.PI / 2 - sweep / 2));
        }
        return list;
    }

    // 동쪽(rising)·서쪽 하늘: 지평선과 90° − 위도를 이루는 평행선. 동쪽은 오른쪽 위로, 서쪽은 오른쪽 아래로.
    // 길이는 시간에 비례(3시간 = 크기의 30%), 선 간격은 고르고 선마다 시작 위치를 조금 흩는다
    function slantTrails(n, size, hours, latitude, rising, seed) {
        var random = makeRandom(seed);
        var tilt = (90 - latitude) * Math.PI / 180;
        var dir = rising ? [Math.cos(tilt), Math.sin(tilt)] : [Math.cos(tilt), -Math.sin(tilt)];
        var normal = [-dir[1], dir[0]];
        var length = size * 0.1 * hours;
        var list = [];
        for (var i = 0; i < n; i++) {
            var offset = size * 0.8 * ((i + 0.5) / n - 0.5);
            var along = (random() - 0.5) * size * 0.3 - length / 2;
            var sx = normal[0] * offset + dir[0] * along;
            var sy = normal[1] * offset + dir[1] * along;
            var ex = sx + dir[0] * length;
            var ey = sy + dir[1] * length;
            list.push([corner(sx, sy), corner(ex, ey)]);
        }
        return list;
    }

    function corner(x, y) {
        return {anchor: [x, y], left: [x, y], right: [x, y]};
    }

    // 중심 (cx, cy), 반지름 r인 원호를 from → to(라디안)로 90° 이하 조각마다 베지어 하나
    function arcPoints(cx, cy, r, from, to) {
        var sweep = to - from;
        var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
        var step = sweep / pieces;
        var handle = 4 / 3 * Math.tan(step / 4) * r;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var angle = from + step * i;
            var p = [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
            var tangent = [-Math.sin(angle) * handle, Math.cos(angle) * handle];
            points.push({
                anchor: p,
                left: i === 0 ? p : [p[0] - tangent[0], p[1] - tangent[1]],
                right: i === pieces ? p : [p[0] + tangent[0], p[1] + tangent[1]]
            });
        }
        return points;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function drawBezier(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
            point.pointType = PointType.CORNER;
        }
        path.closed = closed;
        return path;
    }

    // -------------------------------------------------------
    // 실제 별
    // -------------------------------------------------------
    function buildStarMap(rows) {
        var map = {};
        for (var i = 0; i < rows.length; i++) {
            map[rows[i][0]] = {key: rows[i][0], name: rows[i][1], ra: rows[i][2], dec: rows[i][3], mag: rows[i][4]};
        }
        return map;
    }

    function findPreset(id) {
        for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
        return null;
    }

    // 고른 계절의 별자리 먼저, 사계절(북쪽) 별자리는 뒤에
    function visiblePresets() {
        var list = [];
        for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].season === season) list.push(PRESETS[i]);
        for (var j = 0; j < PRESETS.length; j++) if (PRESETS[j].season === -1) list.push(PRESETS[j]);
        return list;
    }

    // 목록을 계절에 맞게 다시 채운다. 고르고 있던 별자리가 목록에 없으면 첫 항목
    function fillPresetList() {
        var list = visiblePresets();
        var selected = 0;
        fillingPresets = true;
        presetList.removeAll();
        for (var i = 0; i < list.length; i++) {
            presetList.add("item", list[i].name);
            if (list[i].id === presetId) selected = i;
        }
        presetId = list[selected].id;
        presetList.selection = selected;
        fillingPresets = false;
    }

    function currentSiderealDeg() {
        return localSiderealDeg(SEASON_DAYS[season], clockHour - TIME_ZONE_HOURS, LONGITUDE_DEG);
    }

    function presetStars(preset) {
        var list = [];
        for (var i = 0; i < preset.stars.length; i++) list.push(STAR_MAP[preset.stars[i]]);
        return list;
    }

    // 그 시각에 별자리가 있는 방향을 고른다
    function faceConstellation() {
        var center = presetCenter(presetStars(findPreset(presetId)), currentSiderealDeg(), latitude);
        direction = nearestDirection(center.az);
        directionRadios[direction].value = true;
        syncEnabled();
    }

    function updateInfo() {
        var preset = findPreset(presetId);
        var center = presetCenter(presetStars(preset), currentSiderealDeg(), latitude);
        infoText.text = formatClock(clockHour) + " " + preset.name + ": 방위 " + Math.round(center.az) + "° ("
            + azimuthName(center.az) + ") · 고도 " + Math.round(center.alt) + "°";
    }

    function formatClock(hour) {
        var h = Math.floor(hour);
        var m = Math.round((hour - h) * 60);
        return h + ":" + (m < 10 ? "0" + m : m);
    }

    // 북쪽은 천구 북극(고도 = 위도)을, 나머지는 고도 30°를 가운데 둔다. 초점 거리는 지평선이 가운데에서 크기/2 아래에 오는 값
    function realCamera(size) {
        var alt0 = direction === 0 ? clamp(latitude, 10, 80) : VIEW_ALT_DEG;
        return makeCamera(direction * 90, alt0, (size / 2) / Math.tan(alt0 * Math.PI / 180));
    }

    // 프리셋 별들의 궤적은 trails 그룹에, 별자리 선·별 점·이름은 제 그룹에. 북쪽 하늘이면 북극성을 더한다
    function drawRealSky(size, cx, cy, trails, paths, black) {
        var camera = realCamera(size);
        var lst = currentSiderealDeg();
        var preset = findPreset(presetId);
        var keys = preset.stars.slice();
        if (direction === 0 && ("|" + keys.join("|") + "|").indexOf("|polaris|") < 0) keys.push("polaris");
        var starts = {};
        for (var i = 0; i < keys.length; i++) {
            var star = STAR_MAP[keys[i]];
            var v = skyPosition(star.ra, star.dec, lst, latitude);
            starts[keys[i]] = v[2] >= 0 ? camera(v) : null;
            if (90 - Math.abs(star.dec) < POLE_TRAIL_MIN_DEG) continue;
            var segments = trailSegments(star, lst, hours, latitude, camera, TRAIL_STEP_DEG);
            for (var t = 0; t < segments.length; t++) {
                var path = trails.pathItems.add();
                path.setEntirePath(shiftPoints(segments[t], cx, cy));
                path.filled = false;
                path.stroked = true;
                path.strokeColor = black;
                path.strokeWidth = LINE_WIDTH_PT;
                path.name = star.name || star.key;
                paths.push(path);
            }
        }
        if (linesOn) {
            var lineGroup = previewGroup.groupItems.add();
            lineGroup.name = "별자리 선";
            for (var l = 0; l < preset.lines.length; l++) {
                var chain = preset.lines[l];
                for (var c = 1; c < chain.length; c++) {
                    var a = starts[chain[c - 1]], b = starts[chain[c]];
                    if (!a || !b) continue;
                    var line = lineGroup.pathItems.add();
                    line.setEntirePath([[cx + a[0], cy + a[1]], [cx + b[0], cy + b[1]]]);
                    line.filled = false;
                    line.stroked = true;
                    line.strokeColor = makeGray(50);
                    line.strokeWidth = LINE_WIDTH_PT;
                }
            }
        }
        if (!dotsOn && !namesOn) return;
        var starGroup = previewGroup.groupItems.add();
        starGroup.name = "별";
        for (var k = 0; k < keys.length; k++) {
            var point = starts[keys[k]];
            if (!point) continue;
            var item = STAR_MAP[keys[k]];
            var d = dotsOn ? dotDiameter(item.mag, sizeMm) * MM : 0;
            if (dotsOn) {
                var dot = starGroup.pathItems.ellipse(cy + point[1] + d / 2, cx + point[0] - d / 2, d, d);
                dot.stroked = false;
                dot.filled = true;
                dot.fillColor = black;
                dot.name = item.name || item.key;
            }
            if (namesOn && item.name) {
                var label = addText(item.name, cx + point[0], cy + point[1]);
                var bounds = label.geometricBounds;
                label.translate(d / 2 + 0.6 * MM + (bounds[2] - bounds[0]) / 2, 0);
                label.move(starGroup, ElementPlacement.PLACEATEND);
            }
        }
    }

    function normalizeDeg(deg) {
        var value = deg % 360;
        return value < 0 ? value + 360 : value;
    }

    // 2026년 1월 1일부터 센 날(0부터)과 세계시(h)로 지방 항성시(°). 그리니치 항성시는 USNO 근사식
    function localSiderealDeg(dayOfYear, utHours, longitudeDeg) {
        // J2000.0(2000년 1월 1일 12h)부터 2026년 1월 1일 0h까지 9496.5일
        var days = 9496.5 + dayOfYear + utHours / 24;
        var gmstHours = 18.697374558 + 24.06570982441908 * days;
        return normalizeDeg(gmstHours * 15 + longitudeDeg);
    }

    // 적경·적위(°)인 별이 지방 항성시 lst(°), 위도 lat(°)에서 보이는 방향의 단위 벡터 [동, 북, 위]
    function skyPosition(raDeg, decDeg, lstDeg, latDeg) {
        var rad = Math.PI / 180;
        var h = (lstDeg - raDeg) * rad, d = decDeg * rad, p = latDeg * rad;
        return [
            -Math.cos(d) * Math.sin(h),
            Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(h),
            Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(p) * Math.cos(h)
        ];
    }

    // 방위 az(°, 북 0 → 동 90)·고도 alt(°)를 가운데 두고 초점 거리 focal(pt)인 직선 투영 카메라.
    // 방향 벡터를 [x, y](pt)로 옮기고, 가운데에서 78° 넘게 벗어난 곳은 null
    function makeCamera(azDeg, altDeg, focal) {
        var rad = Math.PI / 180;
        var f = [Math.sin(azDeg * rad) * Math.cos(altDeg * rad), Math.cos(azDeg * rad) * Math.cos(altDeg * rad), Math.sin(altDeg * rad)];
        var r = [Math.cos(azDeg * rad), -Math.sin(azDeg * rad), 0];
        var u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
        return function(v) {
            var depth = v[0] * f[0] + v[1] * f[1] + v[2] * f[2];
            if (depth < 0.2) return null;
            return [focal * (v[0] * r[0] + v[1] * r[1] + v[2] * r[2]) / depth, focal * (v[0] * u[0] + v[1] * u[1] + v[2] * u[2]) / depth];
        };
    }

    // lst(°)부터 hours 동안 별의 궤적을 카메라에 옮긴 점 목록. 지평선 아래와 시야 밖은 잘라 여러 조각이 될 수 있고,
    // 지평선을 지나는 조각은 지평선 위 점에서 시작하거나 끝난다
    function trailSegments(star, lstDeg, hours, latDeg, camera, stepDeg) {
        var sweep = hours * 15;
        var steps = Math.max(1, Math.ceil(sweep / stepDeg));
        var segments = [], current = [], previous = null;
        function at(lst) {
            var v = skyPosition(star.ra, star.dec, lst, latDeg);
            return {lst: lst, up: v[2], point: v[2] >= 0 ? camera(v) : null};
        }
        // 지평선(up = 0)을 지나는 순간을 두 표본 사이에서 할선법 세 번으로 찾는다
        function horizon(a, b) {
            var v = null;
            for (var k = 0; k < 3; k++) {
                var lst = a.lst + (b.lst - a.lst) * a.up / (a.up - b.up);
                v = skyPosition(star.ra, star.dec, lst, latDeg);
                if ((v[2] >= 0) === (a.up >= 0)) a = {lst: lst, up: v[2]}; else b = {lst: lst, up: v[2]};
            }
            return camera(v);
        }
        for (var i = 0; i <= steps; i++) {
            var sample = at(lstDeg + sweep * i / steps);
            if (sample.point !== null) {
                if (current.length === 0 && previous !== null && previous.up < 0) {
                    var rise = horizon(previous, sample);
                    if (rise !== null) current.push(rise);
                }
                current.push(sample.point);
            } else if (current.length > 0) {
                if (sample.up < 0 && previous.up >= 0) {
                    var set = horizon(previous, sample);
                    if (set !== null) current.push(set);
                }
                if (current.length > 1) segments.push(current);
                current = [];
            }
            previous = sample;
        }
        if (current.length > 1) segments.push(current);
        return segments;
    }

    // 별들 가운데(벡터 평균)의 방위·고도(°)
    function presetCenter(stars, lstDeg, latDeg) {
        var sum = [0, 0, 0];
        for (var i = 0; i < stars.length; i++) {
            var v = skyPosition(stars[i].ra, stars[i].dec, lstDeg, latDeg);
            sum[0] += v[0];
            sum[1] += v[1];
            sum[2] += v[2];
        }
        var flat = Math.sqrt(sum[0] * sum[0] + sum[1] * sum[1]);
        return {az: normalizeDeg(Math.atan2(sum[0], sum[1]) * 180 / Math.PI), alt: Math.atan2(sum[2], flat) * 180 / Math.PI};
    }

    // 방위(°)에 가장 가까운 방향 번호 (0 북, 1 동, 2 남, 3 서)
    function nearestDirection(azDeg) {
        return Math.round(normalizeDeg(azDeg) / 90) % 4;
    }

    function azimuthName(azDeg) {
        return ["북", "북동", "동", "남동", "남", "남서", "서", "북서"][Math.round(normalizeDeg(azDeg) / 45) % 8];
    }

    // 별 점 지름(mm): 0등성 1.6, 2등성 1.0, 어두우면 0.4까지. 크기 60mm 기준으로 비례
    function dotDiameter(mag, sizeMm) {
        return clamp(1.6 - 0.3 * mag, 0.4, 2.2) * sizeMm / 60;
    }

    function shiftPoints(points, dx, dy) {
        var list = [];
        for (var i = 0; i < points.length; i++) list.push([points[i][0] + dx, points[i][1] + dy]);
        return list;
    }

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text.replace(/\u00B0/g, DEGREE_GLYPH);
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
        return frame;
    }

    // 화살촉은 DOM에 없는 속성이라 임시 액션으로 끝 화살촉만 넣는다
    function applyArrowheads(paths, weight, scale) {
        if (paths.length === 0) return;
        var actionSetName = "Codex_StarTrails";
        var actionName = "StarTrailArrowheads";
        var actionFile = new File(Folder.temp + "/Codex_StarTrailArrowheads.aia");
        try {
            doc.selection = null;
            for (var i = 0; i < paths.length; i++) paths[i].selected = true;
            writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale);
            try { app.unloadAction(actionSetName, ""); } catch (e) {}
            app.loadAction(actionFile);
            app.doScript(actionName, actionSetName);
        } catch (actionError) {
            // 화살촉 이름은 UI 언어에 따라 다르다. 실패해도 선은 그대로 남는다
        }
        try { app.unloadAction(actionSetName, ""); } catch (e2) {}
        try { actionFile.remove(); } catch (e3) {}
        doc.selection = null;
    }

    // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
    function toActionHex(text) {
        var bytes = [];
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
            } else {
                bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
            }
        }
        var hex = "";
        for (var j = 0; j < bytes.length; j++) {
            var part = bytes[j].toString(16).toUpperCase();
            if (part.length < 2) part = "0" + part;
            hex += part;
        }
        return {hex: hex, length: bytes.length};
    }

    function writeArrowheadAction(actionFile, actionSetName, actionName, weight, scale) {
        var setName = toActionHex(actionSetName);
        var name = toActionHex(actionName);
        var arrow = toActionHex(ARROW_NAME);
        var lines = [
            "/version 3",
            "/name [ " + setName.length, "    " + setName.hex, "]",
            "/isOpen 1",
            "/actionCount 1",
            "/action-1 {",
            "    /name [ " + name.length, "        " + name.hex, "    ]",
            "    /keyIndex 0",
            "    /colorIndex 0",
            "    /isOpen 1",
            "    /eventCount 1",
            "    /event-1 {",
            "        /useRulersIn1stQuadrant 0",
            "        /internalName (ai_plugin_setStroke)",
            "        /localizedName [ 10", "            536574205374726F6B65", "        ]",
            "        /isOpen 1",
            "        /isOn 1",
            "        /hasDialog 0",
            "        /parameterCount 4",
            // 선 두께 (pt)
            "        /parameter-1 {",
            "            /key 2003072104",
            "            /showInPalette -1",
            "            /type (unit real)",
            "            /value " + weight,
            "            /unit 592476268",
            "        }",
            // 끝 화살촉
            "        /parameter-2 {",
            "            /key 1634231346",
            "            /showInPalette -1",
            "            /type (ustring)",
            "            /value [ " + arrow.length, "                " + arrow.hex, "            ]",
            "        }",
            // 끝 화살촉 크기 (%)
            "        /parameter-3 {",
            "            /key 1634951986",
            "            /showInPalette -1",
            "            /type (real)",
            "            /value " + scale + ".0",
            "        }",
            // 화살촉 정렬: 패스 끝의 팁
            "        /parameter-4 {",
            "            /key 1634230636",
            "            /showInPalette -1",
            "            /type (enumerated)",
            "            /name [ 17", "                ED8CA8EC8AA420EB819DEC9D9820ED8C81", "            ]",
            "            /value 0",
            "        }",
            "    }",
            "}"
        ];
        actionFile.encoding = "UTF-8";
        actionFile.open("w");
        actionFile.write(lines.join("\n"));
        actionFile.close();
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

    // 글자 서체 (02_문자/Text_koen.jsx·Text_input.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는
    // GSMediumB1(기준선 +0.5pt). 항목 기호 (가)(나)는 바탕 1.25배, ㉠·ⓐ는 바탕 1.125배 (8pt 기준 10pt·9pt).
    // 크기를 정한 뒤에 부른다
    function applyTextFonts(frame) {
        var text = frame.contents;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            var bracket = batangFont !== null && isBracketLabel(text, i);
            if (bracket || (batangFont !== null && isCircledLabel(code))) {
                attributes.textFont = batangFont;
                attributes.size = attributes.size * (bracket ? 1.25 : 1.125);
                attributes.baselineShift = 0;
            } else if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
    }

    // i번째 글자가 "(한글 한 글자)" 세 글자 안에 드는가
    function isBracketLabel(text, i) {
        for (var start = i - 2; start <= i; start++) {
            if (start < 0 || start + 2 >= text.length) continue;
            var inner = text.charCodeAt(start + 1);
            if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return true;
        }
        return false;
    }

    // ㉠㉡… ⓐⓑ…
    function isCircledLabel(code) {
        return (code >= 0x3260 && code <= 0x327F) || (code >= 0x24D0 && code <= 0x24E9);
    }

    // 없으면 null (바탕이 없으면 항목 기호도 Spoqa로 둔다)
    function findOptionalFont(name) {
        try { return app.textFonts.getByName(name); } catch (e) { return null; }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
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
        return {input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals};
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

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
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
        var parts = ["v2", direction, sizeMm, count, hours, latitude, headScale, seed, angleMark ? "1" : "0",
            horizonOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
            mode, season, presetId, clockHour, namesOn ? "1" : "0", linesOn ? "1" : "0", dotsOn ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length !== 21) return;
        direction = restoreNumber(p[1], direction, [0, DIRECTIONS.length - 1], 1);
        sizeMm = restoreNumber(p[2], sizeMm, SIZE_RANGE, 1);
        count = restoreNumber(p[3], count, COUNT_RANGE, 1);
        hours = restoreNumber(p[4], hours, HOURS_RANGE, 0.5);
        latitude = restoreNumber(p[5], latitude, LATITUDE_RANGE, 0.5);
        headScale = restoreNumber(p[6], headScale, HEAD_RANGE, 10);
        seed = restoreNumber(p[7], seed, SEED_RANGE, 1);
        angleMark = p[8] === "1";
        horizonOn = p[9] === "1";
        fontPt = restoreNumber(p[10], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[11], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[12], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[13] === "1";
        mode = restoreNumber(p[14], mode, [0, MODES.length - 1], 1);
        season = restoreNumber(p[15], season, [0, SEASONS.length - 1], 1);
        if (findPreset(p[16]) !== null) presetId = p[16];
        clockHour = restoreNumber(p[17], clockHour, HOUR_RANGE, 0.5);
        namesOn = p[18] === "1";
        linesOn = p[19] === "1";
        dotsOn = p[20] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
