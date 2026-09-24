// Object_SeparationSetup.jsx
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


// 혼합물의 분리 장치: 화면 가운데에 네 가지 실험 장치 중 하나를 그린다. 선은 0.3pt 검정, 액체는 회색 면.
//   - 증류: 가지 달린 둥근바닥 플라스크(액체 높이 %, 끓임쪽), 마개와 온도계(구부는 가지 높이), 알코올램프,
//     가지에서 비스듬히 내려가는 리비히 냉각기(냉각수는 아래로 들어가 위로 나감), 끝에 받는 삼각 플라스크.
//   - 분별 깔때기: 서양배 모양 몸통에 두 액체 층(위층 연하게, 아래층 진하게, 이름은 다이얼로그에서), 마개·꼭지, 아래 비커.
//     액체는 몸통 모양으로 클리핑한다.
//   - 거름: 깔때기 안에 접은 거름종이(파선), 깔때기 끝은 비커 벽에 닿게, 비커에 거른 액체.
//   - 크로마토그래피: 비커의 용매에 거름종이를 담그고, 출발선(파선) 위 점마다 성분 반점을 그린다.
//     점 목록은 'A: 30 60 / B: 45'처럼 이름과 출발선 → 용매 전선 사이 높이(%)를 적는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectSeparationSetup/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var HEAD_LENGTH = 1.4 * MM;
    var HEAD_WIDTH = 1 * MM;
    var GUIDE_DASH = [2, 1.5];
    var LIQUID_K = 25;
    var LIGHT_LIQUID_K = 8;
    var GLASS_K = 0;
    var STOPPER_K = 50;
    var SPOT_K = 60;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["증류", "분별 깔때기", "거름", "크로마토그래피"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [30, 200];
    var LEVEL_RANGE = [5, 90];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var sizeMm = 70;
    var levelPct = 40;
    var upperPct = 30;
    var upperName = "식용유";
    var lowerName = "물";
    var spotsText = "A: 35 70 / B: 50 / C: 35 50 70";
    var labelsOn = true;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "혼합물의 분리 장치");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "장치");
    addRadioRow(shapePanel, "종류", KINDS, kind, function(i) { kind = i; syncEnabled(); updatePreview(); });
    var sizeRow = addValueRow(shapePanel, "높이", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 1, 0);
    var levelRow = addValueRow(shapePanel, "액체 높이", "%", levelPct, LEVEL_RANGE[0], LEVEL_RANGE[1], 1, 0);
    levelRow.input.helpTip = "분별 깔때기에서는 아래층 높이";
    var upperRow = addValueRow(shapePanel, "위층 두께", "%", upperPct, LEVEL_RANGE[0], LEVEL_RANGE[1], 1, 0);
    var namesRow = shapePanel.add("group");
    namesRow.add("statictext", undefined, "위층 · 아래층:").preferredSize.width = LABEL_WIDTH;
    var upperInput = namesRow.add("edittext", undefined, upperName);
    upperInput.characters = 8;
    var lowerInput = namesRow.add("edittext", undefined, lowerName);
    lowerInput.characters = 8;
    var spotsRow = shapePanel.add("group");
    spotsRow.add("statictext", undefined, "점 목록:").preferredSize.width = LABEL_WIDTH;
    var spotsInput = spotsRow.add("edittext", undefined, spotsText);
    spotsInput.characters = 24;
    spotsInput.helpTip = "이름: 높이(%) 높이 … 를 / 로 나눈다. 높이는 출발선 0, 용매 전선 100";

    var markPanel = addPanel(dlg, "표시");
    var labelsCheck = markPanel.add("checkbox", undefined, "기구 이름");
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

    labelsCheck.value = labelsOn;
    syncEnabled();
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    upperInput.onChange = function() { upperName = cleanText(upperInput.text); updatePreview(); };
    lowerInput.onChange = function() { lowerName = cleanText(lowerInput.text); updatePreview(); };
    spotsInput.onChange = function() { spotsText = cleanText(spotsInput.text); updatePreview(); };
    bindValueRow(sizeRow, function() { return sizeMm; }, function(v) { sizeMm = v; });
    bindValueRow(levelRow, function() { return levelPct; }, function(v) { levelPct = v; });
    bindValueRow(upperRow, function() { return upperPct; }, function(v) { upperPct = v; });
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

    // 종류마다 쓰는 행만 켠다
    function syncEnabled() {
        setRowEnabled(levelRow, true);
        setRowEnabled(upperRow, kind === 1);
        upperInput.enabled = kind === 1;
        lowerInput.enabled = kind === 1;
        spotsInput.enabled = kind === 3;
    }

    // 설정 문자열의 구분자(|)는 쓰지 못한다
    function cleanText(text) {
        return String(text).replace(/\|/g, "/");
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        previewGroup = layer.groupItems.add();
        previewGroup.name = KINDS[kind];
        var H = sizeMm * MM;
        if (kind === 0) drawDistillation(H);
        if (kind === 1) drawSeparatoryFunnel(H);
        if (kind === 2) drawFiltration(H);
        if (kind === 3) drawChromatography(H);
        // 그린 것의 가운데를 화면 가운데로
        var b = previewGroup.geometricBounds;
        previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM, viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM);
    }

    // ---- 증류 ----
    function drawDistillation(H) {
        var d = distillationParts(H);
        drawLamp(d.lamp, H);
        // 플라스크: 둥근 몸통 + 목, 액체는 원의 활꼴
        var body = addDisc(d.flask.center, d.flask.r * 2, GLASS_K, "둥근바닥 플라스크");
        var neck = addPolygon([[-d.neckW / 2, d.neckBottom], [-d.neckW / 2, d.neckTop], [d.neckW / 2, d.neckTop], [d.neckW / 2, d.neckBottom]], GLASS_K, "목");
        neck.stroked = false;
        addLine([[-d.neckW / 2, d.neckBottom], [-d.neckW / 2, d.neckTop]], null, "목");
        addLine([[d.neckW / 2, d.neckBottom], [d.neckW / 2, d.neckTop]], null, "목");
        var liquid = drawBezier(previewGroup, circleSegment(d.flask.center, d.flask.r, levelPct / 100), true);
        styleFace(liquid, LIQUID_K);
        liquid.name = "액체";
        for (var c = 0; c < 3; c++) {
            addDisc([d.flask.center[0] + d.flask.r * (c - 1) * 0.3, d.flask.center[1] - d.flask.r * 0.8], d.flask.r * 0.1, 0, "끓임쪽");
        }
        // 가지 → 냉각기 안쪽 관 → 받는 플라스크
        addLine([d.armStart, d.condenser.innerEnd], null, "가지").strokeWidth = 1;
        addPolygon(d.condenser.outer, GLASS_K, "냉각기");
        addLine([d.condenser.innerStart, d.condenser.innerEnd], null, "냉각기 안쪽 관").strokeWidth = 1;
        for (var w = 0; w < 2; w++) {
            addLine(d.condenser.water[w].pipe, null, "냉각수 관").strokeWidth = 1;
            addArrow(d.condenser.water[w].arrow, "냉각수");
        }
        addPolygon(d.receiver, GLASS_K, "삼각 플라스크");
        // 마개와 온도계 (구부는 가지 높이)
        addPolygon(d.stopper, STOPPER_K, "마개");
        addLine([d.thermometer.top, d.thermometer.bulb], null, "온도계").strokeWidth = 1.5;
        addDisc(d.thermometer.bulb, H * 0.02, 100, "온도계 구부");
        if (!labelsOn) return;
        var gap = fontPt * 0.9;
        addText("온도계", d.thermometer.top[0], d.thermometer.top[1] + gap, 0);
        addText("냉각기", d.condenser.label[0], d.condenser.label[1] + gap * 1.6, 0);
        addText("냉각수", d.condenser.water[0].arrow[0][0], d.condenser.water[0].arrow[0][1] - gap, 0);
        addText("냉각수", d.condenser.water[1].arrow[1][0], d.condenser.water[1].arrow[1][1] + gap, 0);
        addText("끓임쪽", d.flask.center[0] - d.flask.r - gap, d.flask.center[1] - d.flask.r * 0.8, -1);
        addText("알코올램프", d.lamp.center[0], d.lamp.bottom - gap, 0);
    }

    function drawLamp(lamp, H) {
        var body = previewGroup.pathItems.roundedRectangle(lamp.top, lamp.center[0] - lamp.width / 2, lamp.width, lamp.top - lamp.bottom, H * 0.03, H * 0.03);
        styleFace(body, 0);
        body.name = "알코올램프";
        addLine([[lamp.center[0], lamp.top], [lamp.center[0], lamp.top + H * 0.03]], null, "심지").strokeWidth = 1;
        var flame = drawBezier(previewGroup, flamePoints([lamp.center[0], lamp.top + H * 0.03], H * 0.1), true);
        styleFace(flame, 15);
        flame.name = "불꽃";
    }

    // ---- 분별 깔때기 ----
    function drawSeparatoryFunnel(H) {
        var f = separatoryFunnel(H);
        var outline = f.outline;
        var beaker = beakerOutline(f.beaker.center, f.beaker.width, f.beaker.height);
        addPolygon(beaker, GLASS_K, "비커");
        // 액체 두 층을 몸통 모양으로 클리핑
        var clip = previewGroup.groupItems.add();
        clip.name = "액체";
        var lowerTop = f.bottom + (f.shoulder - f.bottom) * levelPct / 100;
        var upperTop = Math.min(f.shoulder, lowerTop + (f.shoulder - f.bottom) * upperPct / 100);
        var lower = clip.pathItems.rectangle(lowerTop, -f.width, f.width * 2, lowerTop - f.bottom + H * 0.2);
        styleFace(lower, LIQUID_K);
        var upper = clip.pathItems.rectangle(upperTop, -f.width, f.width * 2, upperTop - lowerTop);
        styleFace(upper, LIGHT_LIQUID_K);
        var mask = drawBezier(clip, outline, true);
        mask.filled = false;
        mask.stroked = false;
        clip.clipped = true;
        var body = drawBezier(previewGroup, outline, true);
        styleLine(body, LINE_WIDTH_PT, null);
        body.name = "분별 깔때기";
        addLine([[f.stem[0][0], f.stem[0][1]], [f.stem[1][0], f.stem[1][1]]], null, "관").strokeWidth = 1.5;
        addPolygon(f.stopper, STOPPER_K, "마개");
        addPolygon(f.cock, 0, "꼭지");
        // 스탠드 고리
        var ring = previewGroup.pathItems.ellipse(f.ringY + H * 0.015, -f.width * 0.7, f.width * 1.4, H * 0.03);
        styleLine(ring, 1, null);
        ring.name = "고리";
        if (!labelsOn) return;
        var x = f.width + fontPt;
        addLabel(upperName, [f.width * 0.3, (lowerTop + upperTop) / 2], x);
        addLabel(lowerName, [f.width * 0.2, (lowerTop + f.bottom) / 2 + H * 0.02], x);
        addLabel("꼭지", [f.cock[1][0], (f.cock[1][1] + f.cock[2][1]) / 2], x);
        addLabel("비커", [f.beaker.center[0] + f.beaker.width / 2, f.beaker.center[1]], x);
    }

    // ---- 거름 ----
    function drawFiltration(H) {
        var f = filtrationParts(H);
        var beaker = beakerOutline(f.beaker.center, f.beaker.width, f.beaker.height);
        var filtrate = previewGroup.pathItems.rectangle(f.beaker.bottom + f.beaker.height * levelPct / 100 * 0.8,
            f.beaker.center[0] - f.beaker.width / 2, f.beaker.width, f.beaker.height * levelPct / 100 * 0.8);
        styleFace(filtrate, LIQUID_K, false);
        filtrate.name = "거른 액체";
        addPolygon(beaker, GLASS_K, "비커").filled = false;
        addPolygon(f.funnel, GLASS_K, "깔때기");
        addLine(f.paper, GUIDE_DASH, "거름종이").strokeWidth = 0.6;
        var ring = previewGroup.pathItems.ellipse(f.ringY + H * 0.015, -f.coneWidth * 0.45, f.coneWidth * 0.9, H * 0.03);
        styleLine(ring, 1, null);
        ring.name = "고리";
        if (!labelsOn) return;
        var x = f.coneWidth / 2 + fontPt * 2;
        addLabel("거름종이", f.paper[2], x);
        addLabel("깔때기", [f.funnel[2][0], (f.funnel[2][1] + f.funnel[3][1]) / 2], x);
        addLabel("비커", [f.beaker.center[0] + f.beaker.width / 2, f.beaker.center[1]], x);
    }

    // ---- 크로마토그래피 ----
    function drawChromatography(H) {
        var c = chromatographyParts(H, parseSpots(spotsText));
        var solvent = previewGroup.pathItems.rectangle(c.solventTop, c.beaker.center[0] - c.beaker.width / 2, c.beaker.width, c.solventTop - c.beaker.bottom);
        styleFace(solvent, LIGHT_LIQUID_K, false);
        solvent.name = "용매";
        var paper = previewGroup.pathItems.rectangle(c.paper.top, c.paper.left, c.paper.width, c.paper.top - c.paper.bottom);
        styleFace(paper, 0);
        paper.opacity = 85;
        paper.name = "거름종이";
        addPolygon(beakerOutline(c.beaker.center, c.beaker.width, c.beaker.height), GLASS_K, "비커").filled = false;
        addLine([[c.paper.left - H * 0.12, c.paper.top], [c.paper.left + c.paper.width + H * 0.12, c.paper.top]], null, "막대").strokeWidth = 1.5;
        addLine([[c.paper.left, c.baseY], [c.paper.left + c.paper.width, c.baseY]], GUIDE_DASH, "출발선");
        addLine([[c.paper.left, c.frontY], [c.paper.left + c.paper.width, c.frontY]], GUIDE_DASH, "용매 전선");
        for (var i = 0; i < c.spots.length; i++) {
            var s = c.spots[i];
            var spot = previewGroup.pathItems.ellipse(s.y + c.spotH / 2, s.x - c.spotW / 2, c.spotW, c.spotH);
            styleFace(spot, SPOT_K, false);
            spot.name = "반점";
        }
        for (var n = 0; n < c.columns.length; n++) addText(c.columns[n].name, c.columns[n].x, c.baseY - fontPt * 0.9, 0);
        if (!labelsOn) return;
        var x = c.beaker.center[0] + c.beaker.width / 2 + fontPt;
        addLabel("용매 전선", [c.paper.left + c.paper.width, c.frontY], x);
        addLabel("출발선", [c.paper.left + c.paper.width, c.baseY], x);
        addLabel("용매", [c.beaker.center[0] + c.beaker.width * 0.45, (c.solventTop + c.beaker.bottom) / 2], x);
    }

    // 지시선: 점에서 오른쪽 x까지, 끝에 이름
    function addLabel(text, from, x) {
        addLine([from, [x, from[1]]], null, "지시선");
        addText(text, x + fontPt * 0.3, from[1], 1);
    }

    // -------------------------------------------------------
    // 기하 (순수 계산)
    // -------------------------------------------------------
    // 원(중심, 반지름)에서 아래부터 fill(0~1) 높이까지 찬 활꼴: 수면 왼쪽 → 아래 호 → 수면 오른쪽 → 닫힘
    function circleSegment(center, r, fill) {
        var y = -r + 2 * r * Math.min(0.98, Math.max(0.02, fill));
        var half = Math.asin(y / r);
        var from = Math.PI - half, to = 2 * Math.PI + half;
        return arcPoints(center[0], center[1], r, from, to);
    }

    // 증류 장치 부품 (플라스크 중심이 원점)
    function distillationParts(H) {
        var r = H * 0.16;
        var neckW = r * 0.36;
        var neckBottom = Math.sqrt(r * r - neckW * neckW / 4);
        var neckTop = r + H * 0.2;
        var armY = neckTop - H * 0.07;
        var tilt = -14 * Math.PI / 180;
        var dir = [Math.cos(tilt), Math.sin(tilt)], nor = [-dir[1], dir[0]];
        function along(o, u, v) { return [o[0] + dir[0] * u + nor[0] * v, o[1] + dir[1] * u + nor[1] * v]; }
        var armStart = [neckW / 2, armY];
        var cStart = along(armStart, H * 0.14, 0);
        var cLength = H * 0.55, cWidth = H * 0.07;
        var cEnd = along(cStart, cLength, 0);
        var innerEnd = along(cEnd, H * 0.08, 0);
        var inlet = along(cStart, cLength * 0.85, -cWidth / 2);
        var outlet = along(cStart, cLength * 0.15, cWidth / 2);
        var receiverTop = innerEnd[1] - H * 0.02;
        var rx = innerEnd[0];
        var rW = H * 0.22, rH = H * 0.26, rNeck = H * 0.05;
        return {
            flask: {center: [0, 0], r: r}, neckW: neckW, neckBottom: neckBottom, neckTop: neckTop, armStart: armStart,
            stopper: [[-neckW * 0.6, neckTop + H * 0.04], [neckW * 0.6, neckTop + H * 0.04], [neckW * 0.45, neckTop - H * 0.01], [-neckW * 0.45, neckTop - H * 0.01]],
            thermometer: {top: [0, neckTop + H * 0.22], bulb: [0, armY]},
            condenser: {
                outer: [along(cStart, 0, cWidth / 2), along(cEnd, 0, cWidth / 2), along(cEnd, 0, -cWidth / 2), along(cStart, 0, -cWidth / 2)],
                innerStart: armStart, innerEnd: innerEnd, label: along(cStart, cLength / 2, cWidth / 2),
                water: [
                    {pipe: [inlet, [inlet[0], inlet[1] - H * 0.06]], arrow: [[inlet[0], inlet[1] - H * 0.14], [inlet[0], inlet[1] - H * 0.07]]},
                    {pipe: [outlet, [outlet[0], outlet[1] + H * 0.06]], arrow: [[outlet[0], outlet[1] + H * 0.07], [outlet[0], outlet[1] + H * 0.15]]}
                ]
            },
            receiver: [[rx - rNeck / 2, receiverTop], [rx + rNeck / 2, receiverTop], [rx + rNeck / 2, receiverTop - rH * 0.3],
                [rx + rW / 2, receiverTop - rH], [rx - rW / 2, receiverTop - rH], [rx - rNeck / 2, receiverTop - rH * 0.3]],
            lamp: {center: [0, 0], width: H * 0.2, top: -r - H * 0.14, bottom: -r - H * 0.28}
        };
    }

    // 불꽃: 아래 base에서 위로 height인 물방울 모양 (닫힌 베지어)
    function flamePoints(base, height) {
        var w = height * 0.32;
        return [
            {anchor: [base[0], base[1] + height], left: [base[0] + w * 0.2, base[1] + height * 0.8], right: [base[0] - w * 0.2, base[1] + height * 0.8]},
            {anchor: [base[0] - w / 2, base[1] + height * 0.25], left: [base[0] - w / 2, base[1] + height * 0.5], right: [base[0] - w / 2, base[1]]},
            {anchor: [base[0] + w / 2, base[1] + height * 0.25], left: [base[0] + w / 2, base[1]], right: [base[0] + w / 2, base[1] + height * 0.5]}
        ];
    }

    // 분별 깔때기 (몸통 가운데 x = 0). outline은 닫힌 베지어, 아래 끝(f.bottom)은 꼭지 바로 위
    function separatoryFunnel(H) {
        var w = H * 0.22;
        var top = H * 0.35, shoulder = H * 0.25, belly = H * 0.12, bottom = -H * 0.12;
        var neck = w * 0.18;
        var right = [[neck, top], [neck, shoulder + H * 0.03], [w * 0.85, belly + H * 0.04], [w * 0.5, 0], [neck * 0.6, bottom]];
        var list = [];
        for (var i = 0; i < right.length; i++) list.push(right[i]);
        for (var j = right.length - 1; j >= 0; j--) list.push([-right[j][0], right[j][1]]);
        var cockY = bottom - H * 0.03;
        return {
            outline: smoothClosed(list), width: w, bottom: bottom, shoulder: shoulder + H * 0.03, ringY: 0,
            stem: [[0, bottom], [0, -H * 0.4]],
            stopper: [[-neck * 1.4, top + H * 0.05], [neck * 1.4, top + H * 0.05], [neck, top - H * 0.01], [-neck, top - H * 0.01]],
            cock: [[-w * 0.35, cockY + H * 0.012], [w * 0.35, cockY + H * 0.012], [w * 0.35, cockY - H * 0.012], [-w * 0.35, cockY - H * 0.012]],
            beaker: {center: [0, -H * 0.5], width: H * 0.3, height: H * 0.2}
        };
    }

    // 점 목록을 닫힌 부드러운 곡선으로 (모서리 점은 손잡이 없이 두지 않고 이웃 두 점으로 기울기)
    function smoothClosed(list) {
        var points = [];
        var n = list.length;
        for (var i = 0; i < n; i++) {
            var prev = list[(i - 1 + n) % n], next = list[(i + 1) % n], p = list[i];
            // 목의 곧은 부분(가로가 같은 이웃)은 꺾인 점으로
            var straight = Math.abs(prev[0] - p[0]) < 1e-9 || Math.abs(next[0] - p[0]) < 1e-9 || Math.abs(next[1] - p[1]) < 1e-9 || Math.abs(prev[1] - p[1]) < 1e-9;
            var d = straight ? [0, 0] : [(next[0] - prev[0]) / 6, (next[1] - prev[1]) / 6];
            points.push({anchor: p, left: [p[0] - d[0], p[1] - d[1]], right: [p[0] + d[0], p[1] + d[1]]});
        }
        return points;
    }

    // 비커 윤곽: 위가 열린 컵 (왼쪽 위 → 바닥 → 오른쪽 위)
    function beakerOutline(center, width, height) {
        var l = center[0] - width / 2, r = center[0] + width / 2;
        var t = center[1] + height / 2, b = center[1] - height / 2;
        return [[l - width * 0.06, t + width * 0.03], [l, t], [l, b], [r, b], [r, t]];
    }

    // 거름 장치 (깔때기 위 가운데가 원점)
    function filtrationParts(H) {
        var cw = H * 0.4, ch = H * 0.3;
        var stemTop = -ch, stemBottom = -H * 0.62;
        var bw = H * 0.34, bh = H * 0.3, bBottom = -H * 0.95;
        return {
            coneWidth: cw, ringY: -ch * 0.45,
            funnel: [[-cw / 2, 0], [-H * 0.02, stemTop], [-H * 0.02, stemBottom], [H * 0.02, stemBottom - H * 0.03], [H * 0.02, stemTop], [cw / 2, 0]],
            paper: [[-cw * 0.42, -ch * 0.08], [0, -ch * 0.92], [cw * 0.42, -ch * 0.08]],
            beaker: {center: [H * 0.02 - bw / 2 + bw * 0.08, bBottom + bh / 2], width: bw, height: bh, bottom: bBottom}
        };
    }

    // 'A: 30 60 / B: 45' → [{name, heights[0~1]}]. 이름이 없으면 A, B, … 로
    function parseSpots(text) {
        var columns = [];
        var parts = String(text).split("/");
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i].replace(/^\s+|\s+$/g, "");
            if (part === "") continue;
            var colon = part.indexOf(":");
            var name = colon >= 0 ? part.slice(0, colon).replace(/^\s+|\s+$/g, "") : String.fromCharCode(65 + columns.length);
            var numbers = (colon >= 0 ? part.slice(colon + 1) : part).split(/[\s,]+/);
            var heights = [];
            for (var j = 0; j < numbers.length; j++) {
                var v = parseFloat(numbers[j]);
                if (!isNaN(v)) heights.push(Math.max(0, Math.min(100, v)) / 100);
            }
            columns.push({name: name, heights: heights});
        }
        return columns;
    }

    // 크로마토그래피: 비커 바닥 가운데 x = 0, 종이는 막대에 걸려 용매에 조금 잠긴다
    function chromatographyParts(H, columns) {
        var n = Math.max(1, columns.length);
        var bw = Math.max(H * 0.5, n * H * 0.12 + H * 0.12), bh = H * 0.85, bottom = 0;
        var pw = bw - H * 0.12, top = bh + H * 0.08, paperBottom = H * 0.05;
        var solventTop = H * 0.12;
        var baseY = solventTop + H * 0.06, frontY = top - H * 0.12;
        var spots = [], cols = [];
        for (var i = 0; i < columns.length; i++) {
            var x = -pw / 2 + pw * (i + 0.5) / n;
            cols.push({name: columns[i].name, x: x});
            for (var j = 0; j < columns[i].heights.length; j++) {
                spots.push({x: x, y: baseY + (frontY - baseY) * columns[i].heights[j]});
            }
        }
        return {
            beaker: {center: [0, bh / 2], width: bw, height: bh, bottom: bottom},
            paper: {left: -pw / 2, width: pw, top: top, bottom: paperBottom},
            solventTop: solventTop, baseY: baseY, frontY: frontY, spots: spots, columns: cols,
            spotW: Math.min(H * 0.07, pw / n * 0.6), spotH: H * 0.035
        };
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", kind, sizeMm, levelPct, upperPct, cleanText(upperName), cleanText(lowerName), cleanText(spotsText),
            labelsOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 13) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        sizeMm = restoreNumber(p[2], sizeMm, SIZE_RANGE, 1);
        levelPct = restoreNumber(p[3], levelPct, LEVEL_RANGE, 1);
        upperPct = restoreNumber(p[4], upperPct, LEVEL_RANGE, 1);
        upperName = p[5];
        lowerName = p[6];
        spotsText = p[7];
        labelsOn = p[8] === "1";
        fontPt = restoreNumber(p[9], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[10], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[11], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[12] === "1";
    }

    // -------------------------------------------------------
    // 공통 도우미
    // -------------------------------------------------------
        function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

        function movePreview(deltaX, deltaY) {
        if (previewGroup === null || (deltaX === 0 && deltaY === 0)) return;
        try { previewGroup.translate(deltaX, deltaY); } catch (e) {}
    }

        function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
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

        // 끝이 tip, 방향 (dx, dy)인 채운 삼각형의 세 점
    function arrowHeadPoints(tip, dx, dy) {
        var length = Math.sqrt(dx * dx + dy * dy);
        var ux = dx / length, uy = dy / length;
        var bx = tip[0] - ux * HEAD_LENGTH, by = tip[1] - uy * HEAD_LENGTH;
        return [tip, [bx - uy * HEAD_WIDTH / 2, by + ux * HEAD_WIDTH / 2], [bx + uy * HEAD_WIDTH / 2, by - ux * HEAD_WIDTH / 2]];
    }

        function styleLine(path, weight, dashes, k) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(k === undefined ? 100 : k);
        path.strokeWidth = weight;
        if (dashes) path.strokeDashes = dashes;
    }

        function styleFace(path, k, stroked) {
        path.filled = true;
        path.fillColor = makeGray(k);
        path.stroked = stroked !== false;
        if (path.stroked) {
            path.strokeColor = makeGray(100);
            path.strokeWidth = LINE_WIDTH_PT;
        }
    }

        function addLine(points, dashes, name, container) {
        var line = (container || previewGroup).pathItems.add();
        line.setEntirePath(points);
        styleLine(line, LINE_WIDTH_PT, dashes);
        line.name = name;
        return line;
    }

        function addPolygon(points, k, name, container) {
        var shape = (container || previewGroup).pathItems.add();
        shape.setEntirePath(points);
        shape.closed = true;
        styleFace(shape, k);
        shape.name = name;
        return shape;
    }

        function addHead(tip, dx, dy, container) {
        var head = (container || previewGroup).pathItems.add();
        head.setEntirePath(arrowHeadPoints(tip, dx, dy));
        head.closed = true;
        head.stroked = false;
        head.filled = true;
        head.fillColor = makeGray(100);
        head.name = "화살촉";
        return head;
    }

        // 꺾은선 화살표: 마지막 점에 화살촉
    function addArrow(points, name, container) {
        var line = addLine(points, null, name, container);
        var a = points[points.length - 2], b = points[points.length - 1];
        addHead(b, b[0] - a[0], b[1] - a[1], container);
        return line;
    }

        function addDisc(center, diameter, k, name, container) {
        var disc = (container || previewGroup).pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
        styleFace(disc, k);
        disc.name = name;
        return disc;
    }

        function drawBezier(container, points, closed) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            var point = path.pathPoints[j];
            point.leftDirection = points[j].left;
            point.rightDirection = points[j].right;
        }
        path.closed = closed;
        return path;
    }

        // 세로 가운데가 y. align이 0이면 가로 가운데, 1이면 왼쪽 끝, -1이면 오른쪽 끝이 x
    function addText(text, x, y, align, container) {
        var frame = (container || previewGroup).textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        var anchorX = align === 1 ? b[0] : (align === -1 ? b[2] : (b[0] + b[2]) / 2);
        frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
        return frame;
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

        function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.alignChildren = ["left", "top"];
        panel.margins = [12, 16, 12, 12];
        panel.spacing = 6;
        return panel;
    }

        // 라벨 + 라디오 단추 행. 누르면 onPick(번호)
    function addRadioRow(parent, label, names, selected, onPick) {
        var row = parent.add("group");
        row.add("statictext", undefined, label + ":").preferredSize.width = LABEL_WIDTH;
        var radios = [];
        for (var i = 0; i < names.length; i++) {
            radios.push(row.add("radiobutton", undefined, names[i]));
            radios[i].onClick = (function(index) { return function() { onPick(index); }; })(i);
        }
        radios[selected].value = true;
        return radios;
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

        function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
