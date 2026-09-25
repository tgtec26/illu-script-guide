// Object_EarthLayers.jsx
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

// 지구 내부 구조: 화면 가운데에 지각·맨틀·외핵·내핵 단면을 그린다.
//   - 경계 깊이는 실제 비율: 맨틀–외핵 2900 km, 외핵–내핵 5100 km, 중심 6400 km.
//     지각(5~35 km)은 실제로는 보이지 않을 만큼 얇아서 반지름의 %로 두께를 과장한다.
//   - 창 맨 위 탭으로 그리는 방식을 고른다.
//     평면: 오른쪽 가로 반지름에서 시계 반대 방향으로 단면 각도만큼의 부채꼴 (360°면 원, 180°면 위쪽 반원, 90°면 1/4).
//       360°·180°·90°는 라디오 단추로, 그 밖의 각은 각도 행에 적는다. 깊이(km)는 오른쪽 가로 반지름 아래에.
//     3D 절단: 구를 시점(기울기·돌리기)에서 본 입체. '절개한 구'는 세로축 둘레로 절단 각도만큼 쐐기를 잘라낸 구이고
//       (Object_StarInterior.jsx와 같은 계산, 180°면 반구 단면), '잘라낸 조각'은 그 쐐기 조각만 보인다(위쪽 반만 선택).
//       조각은 볼록한 입체라 가장자리(절단면 테두리·구 실루엣)의 볼록 껍질이 윤곽이다.
//     반구 분리: 지각·맨틀·외핵은 안쪽 층이 빠져 속이 파인 왼쪽 반구 껍질(단면은 고리, 가운데는 파인 안쪽 면)이고
//       그릇처럼 포갠다(안쪽 층은 바깥 층 구멍이나 입구 밖으로 나온 부분만 보인다). 내핵은 입체 음영이 있는 구
//       (Object_ParticleModel.jsx 핵과 같은 방식). 층마다 위치(mm)를 손잡이 4개짜리 슬라이더나 숫자 칸으로 따로 정한다.
//       단면은 폭 %만큼 납작한 타원.
//   - 층 이름은 보이는 절단면(평면은 45° 방향, 반구 분리는 단면 꼭대기) 각 층 가운데에서 오른쪽으로 뽑은 지시선 끝에.
//   - 글자는 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)로 글자마다 나눈다 (02_문자/Text_koen.jsx 규칙).

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectEarthLayers/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var EARTH_RADIUS_KM = 6400;
    // 바깥부터 층 이름, 상태, 음영(K)
    var LAYERS = [
        {name: "지각", state: "고체", k: 50},
        {name: "맨틀", state: "고체", k: 20},
        {name: "외핵", state: "액체", k: 35},
        {name: "내핵", state: "고체", k: 60}
    ];
    var ENG_BASELINE_PT = 0.5;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var MODES = ["평면", "3D 절단", "반구 분리"];
    // 지시선 끝 글자: 층 이름 또는 지각부터 차례로 기호
    var LABEL_STYLES = [
        {label: "이름", chars: null},
        {label: "A B C", chars: ["A", "B", "C", "D"]},
        {label: "ⓐ ⓑ ⓒ", chars: ["ⓐ", "ⓑ", "ⓒ", "ⓓ"]},
        {label: "㉠ ㉡ ㉢", chars: ["㉠", "㉡", "㉢", "㉣"]}
    ];
    var CUT_VIEWS = ["절개한 구", "잘라낸 조각"];
    var SURFACE_K = 10;
    var ANGLE_PRESETS = [360, 180, 90];
    var ANGLE_RANGE = [1, 360];
    var CUT_RANGE = [1, 180];
    var ROT_RANGE = [-180, 180];
    var VIEW_RANGE = [-90, 90];
    var SPREAD_MAX_MM = 80;
    // 손잡이 슬라이더: 너비(입력칸 + 스크롤바 자리), 높이, 양 끝 여백(px)
    var TRACK_WIDTH = 260;
    var TRACK_HEIGHT = 30;
    var TRACK_PAD = 10;
    // 파인 안쪽 면은 단면보다 이만큼 어둡다 (K)
    var CAVITY_EXTRA_K = 25;
    var RATIO_RANGE = [5, 90];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var RADIUS_RANGE = [10, 150];
    var CRUST_RANGE = [1, 15];
    var LEADER_RANGE = [2, 50];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");

    // 옵션
    var mode = 0;
    var angleDeg = 90;
    var cutView = 0;
    var cutDeg = 90;
    var rotDeg = 30;
    var tiltDeg = -20;
    var turnDeg = 0;
    var upperOnly = true;
    var spread = [0, 8, 16, 24];
    var ratioPct = 30;
    var radiusMm = 30;
    var crustPct = 4;
    var leaderMm = 8;
    var shadeOn = true;
    var namesOn = true;
    var stateOn = false;
    var labelStyle = 0;
    var depthOn = true;
    var fontPt = 8;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    readSettings();

    var layer = findEditableLayer();
    var previewGroup = null;
    // 내핵 입체 음영 그라데이션 스와치 (처음 쓸 때 만든다)
    var litGradient = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "지구 내부 구조");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    // 그리는 방식: 탭마다 그 방식의 옵션
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
    var angleRadioRow = modeTabs[0].add("group");
    angleRadioRow.add("statictext", undefined, "단면:").preferredSize.width = LABEL_WIDTH;
    var angleRadios = [];
    for (var s = 0; s < ANGLE_PRESETS.length; s++) angleRadios.push(angleRadioRow.add("radiobutton", undefined, ANGLE_PRESETS[s] + "°"));
    var angleRow = addValueRow(modeTabs[0], "각도", "°", angleDeg, ANGLE_RANGE[0], ANGLE_RANGE[1], 1, 0);
    angleRow.input.helpTip = "오른쪽 가로 반지름에서 시계 반대 방향으로 그리는 부채꼴 각. 360이면 원";

    var cutViewRow = modeTabs[1].add("group");
    cutViewRow.add("statictext", undefined, "보기:").preferredSize.width = LABEL_WIDTH;
    var cutViewRadios = [];
    for (var c = 0; c < CUT_VIEWS.length; c++) cutViewRadios.push(cutViewRow.add("radiobutton", undefined, CUT_VIEWS[c]));
    var upperCheck = modeTabs[1].add("checkbox", undefined, "잘라낸 조각은 위쪽 반만");
    var cutRow = addValueRow(modeTabs[1], "절단 각도", "°", cutDeg, CUT_RANGE[0], CUT_RANGE[1], 1, 0);
    cutRow.input.helpTip = "세로축 둘레로 잘라내는 쐐기의 벌어진 각. 180이면 반구 단면";
    var rotRow = addValueRow(modeTabs[1], "절개 방향", "°", rotDeg, ROT_RANGE[0], ROT_RANGE[1], 5, 0);
    rotRow.input.helpTip = "쐐기를 세로축 둘레로 돌린다. 0이면 정면";
    var tiltRow = addValueRow(modeTabs[1], "시점 기울기", "°", tiltDeg, VIEW_RANGE[0], VIEW_RANGE[1], 5, 0);
    tiltRow.input.helpTip = "음수면 위에서 내려다본다";
    var turnRow = addValueRow(modeTabs[1], "시점 돌리기", "°", turnDeg, VIEW_RANGE[0], VIEW_RANGE[1], 5, 0);

    // 층 위치: 손잡이 4개(지·맨·외·내)를 끌어 층마다 가로 위치를 정한다. 아래 숫자 칸으로도 적을 수 있다
    var spreadRow = modeTabs[2].add("group");
    spreadRow.alignChildren = ["left", "center"];
    spreadRow.add("statictext", undefined, "층 위치 (mm):").preferredSize.width = LABEL_WIDTH;
    var track = spreadRow.add("group");
    track.preferredSize = [TRACK_WIDTH, TRACK_HEIGHT];
    track.helpTip = "손잡이를 끌어 층마다 위치를 정한다 (지각·맨틀·외핵·내핵)";
    var spreadInputRow = modeTabs[2].add("group");
    spreadInputRow.alignChildren = ["left", "center"];
    spreadInputRow.add("statictext", undefined, "").preferredSize.width = LABEL_WIDTH;
    var spreadInputs = [];
    for (var si = 0; si < LAYERS.length; si++) {
        spreadInputRow.add("statictext", undefined, LAYERS[si].name.charAt(0));
        var spreadInput = spreadInputRow.add("edittext", undefined, formatNumber(spread[si], 1));
        spreadInput.characters = 4;
        spreadInput.justify = "center";
        spreadInputs.push(spreadInput);
    }
    var ratioRow = addValueRow(modeTabs[2], "단면 폭", "%", ratioPct, RATIO_RANGE[0], RATIO_RANGE[1], 1, 0);
    ratioRow.input.helpTip = "잘린 면(원)을 옆에서 본 납작함. 작을수록 옆에서 본 모습";
    tabs.selection = modeTabs[mode];

    var shapePanel = addPanel(dlg, "구조");
    var radiusRow = addValueRow(shapePanel, "반지름", "mm", radiusMm, RADIUS_RANGE[0], RADIUS_RANGE[1], 1, 0);
    var crustRow = addValueRow(shapePanel, "지각 두께", "%", crustPct, CRUST_RANGE[0], CRUST_RANGE[1], 0.5, 1);
    crustRow.input.helpTip = "반지름에 대한 %. 실제(35 km)는 0.5%라 보이게 과장한다";
    var shadeCheck = shapePanel.add("checkbox", undefined, "층마다 음영");

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var namesCheck = checkRow.add("checkbox", undefined, "지시선·글자");
    var stateCheck = checkRow.add("checkbox", undefined, "상태 (고체·액체)");
    var depthCheck = checkRow.add("checkbox", undefined, "깊이 (km)");
    var styleRow = markPanel.add("group");
    styleRow.add("statictext", undefined, "글자:").preferredSize.width = LABEL_WIDTH;
    var styleRadios = [];
    for (var ls = 0; ls < LABEL_STYLES.length; ls++) {
        styleRadios.push(styleRow.add("radiobutton", undefined, LABEL_STYLES[ls].label));
        styleRadios[ls].onClick = (function(index) {
            return function() { labelStyle = index; syncEnabled(); updatePreview(); };
        })(ls);
    }
    styleRadios[labelStyle].value = true;
    styleRow.helpTip = "지각부터 내핵까지 차례로 붙인다";
    var leaderRow = addValueRow(markPanel, "지시선 길이", "mm", leaderMm, LEADER_RANGE[0], LEADER_RANGE[1], 1, 0);
    leaderRow.input.helpTip = "단면 오른쪽 끝에서 글자까지";
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

    syncAngleRadios();
    cutViewRadios[cutView].value = true;
    upperCheck.value = upperOnly;
    shadeCheck.value = shadeOn;
    namesCheck.value = namesOn;
    stateCheck.value = stateOn;
    depthCheck.value = depthOn;
    syncEnabled();

    for (var sr = 0; sr < angleRadios.length; sr++) {
        angleRadios[sr].onClick = (function(index) {
            return function() {
                angleDeg = ANGLE_PRESETS[index];
                angleRow.input.text = formatNumber(angleDeg, 0);
                try { angleRow.slider.value = angleDeg; } catch (e) {}
                updatePreview();
            };
        })(sr);
    }
    bindValueRow(angleRow, function() { return angleDeg; }, function(v) { angleDeg = v; syncAngleRadios(); });
    // Tab에는 index가 없어 제목으로 찾는다
    tabs.onChange = function() {
        if (!tabs.selection) return;
        for (var i = 0; i < MODES.length; i++) if (tabs.selection.text === MODES[i]) mode = i;
        syncEnabled();
        updatePreview();
    };
    for (var cv = 0; cv < cutViewRadios.length; cv++) {
        cutViewRadios[cv].onClick = (function(index) {
            return function() { cutView = index; syncEnabled(); updatePreview(); };
        })(cv);
    }
    upperCheck.onClick = function() { upperOnly = upperCheck.value; updatePreview(); };
    bindValueRow(cutRow, function() { return cutDeg; }, function(v) { cutDeg = v; });
    bindValueRow(rotRow, function() { return rotDeg; }, function(v) { rotDeg = v; });
    bindValueRow(tiltRow, function() { return tiltDeg; }, function(v) { tiltDeg = v; });
    bindValueRow(turnRow, function() { return turnDeg; }, function(v) { turnDeg = v; });
    bindSpreadSlider();
    bindValueRow(ratioRow, function() { return ratioPct; }, function(v) { ratioPct = v; });
    shadeCheck.onClick = function() { shadeOn = shadeCheck.value; updatePreview(); };
    namesCheck.onClick = function() { namesOn = namesCheck.value; syncEnabled(); updatePreview(); };
    stateCheck.onClick = function() { stateOn = stateCheck.value; updatePreview(); };
    depthCheck.onClick = function() { depthOn = depthCheck.value; updatePreview(); };
    bindValueRow(radiusRow, function() { return radiusMm; }, function(v) { radiusMm = v; });
    bindValueRow(crustRow, function() { return crustPct; }, function(v) { crustPct = v; });
    bindValueRow(leaderRow, function() { return leaderMm; }, function(v) { leaderMm = v; });
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
    // 취소했거나 결과에 쓰지 않았으면 만든 그라데이션 스와치를 지운다
    if (litGradient !== null && (!confirmed || mode !== 2 || !shadeOn)) {
        try { litGradient.remove(); } catch (gradientError) {}
    }
    if (confirmed && previewGroup !== null) {
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
    }
    app.redraw();

    // 각도가 360·180·90이면 그 라디오를, 아니면 아무것도 고르지 않는다
    function syncAngleRadios() {
        for (var i = 0; i < angleRadios.length; i++) angleRadios[i].value = ANGLE_PRESETS[i] === angleDeg;
    }

    // 상태는 층 이름일 때만, 기호·지시선 길이는 지시선이 있을 때만, 깊이는 평면에서만, 위쪽 반만은 잘라낸 조각에서만 뜻이 있다
    function syncEnabled() {
        depthCheck.enabled = mode === 0;
        upperCheck.enabled = cutView === 1;
        stateCheck.enabled = namesOn && labelStyle === 0;
        for (var r = 0; r < styleRadios.length; r++) styleRadios[r].enabled = namesOn;
        leaderRow.input.enabled = namesOn;
        leaderRow.slider.enabled = namesOn;
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
        var R = radiusMm * MM;
        var radii = layerRadii(R, crustPct / 100);
        previewGroup = layer.groupItems.add();
        previewGroup.name = "지구 내부 구조 (" + MODES[mode] + ")";
        var anchors = null, rightX = R;
        if (mode === 0) {
            var range = sectorRange(angleDeg);
            for (var i = 0; i < radii.length; i++) {
                var face = angleDeg >= 360
                    ? previewGroup.pathItems.ellipse(radii[i], -radii[i], radii[i] * 2, radii[i] * 2)
                    : drawBezier(previewGroup, sectorPoints(radii[i], range[0], range[1]), true);
                styleFace(face, layerK(i));
                face.name = LAYERS[i].name;
            }
            anchors = labelAnchors(radii, labelAngle(range));
            if (depthOn) drawDepths(radii);
        } else if (mode === 1) {
            var seen = cutView === 0 ? drawCutSphere(R, radii) : drawPiece(R, radii);
            anchors = pickFaceAnchors(seen, radii);
        } else {
            var spreadPt = [];
            for (var sp = 0; sp < spread.length; sp++) spreadPt.push(spread[sp] * MM);
            var shells = hemiLayers(radii, spreadPt, ratioPct / 100);
            drawNestedShell(previewGroup, shells, radii, 0);
            for (var h = 0; h < shells.length; h++) rightX = Math.max(rightX, shells[h].rightX);
            anchors = hemiAnchors(shells, radii);
        }
        if (namesOn && anchors !== null) drawNames(anchors, rightX);
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    // 반구 분리: 그릇을 포갠 모양. 층 i는 겉면 → 단면 고리 → 파인 안쪽 면을 그리고, 안쪽 층 전체를 하위 그룹에 그린 뒤
    // '층 i의 구멍 + 입구 면 가운데 선 오른쪽'으로 클리핑한다. 안쪽 층은 바깥 층 벽·테두리 뒤로 숨고, 구멍으로 보이거나
    // 입구 밖으로 나온 부분만 보인다. 마지막 층(내핵)은 입체 음영 구
    function drawNestedShell(container, shells, radii, i) {
        var shell = shells[i];
        if (shell.sphere) {
            drawLitSphere(container, [shell.cx, 0], radii[i], layerK(i), LAYERS[i].name);
            return;
        }
        var dome = drawBezier(container, shell.dome, true);
        styleFace(dome, shadeOn ? (i === 0 ? SURFACE_K : Math.min(100, LAYERS[i].k + 10)) : 0);
        dome.name = LAYERS[i].name + " 겉면";
        var cutFace = drawBezier(container, shell.face, true);
        styleFace(cutFace, layerK(i));
        cutFace.name = LAYERS[i].name + " 단면";
        // 안쪽 층이 빠진 자리: 파인 안쪽 면
        var hole = drawBezier(container, shell.hole, true);
        styleFace(hole, shadeOn ? Math.min(100, LAYERS[i].k + CAVITY_EXTRA_K) : 0);
        hole.name = LAYERS[i].name + " 파인 면";
        if (i + 1 >= shells.length) return;
        var inner = container.groupItems.add();
        inner.name = LAYERS[i + 1].name + "부터 안쪽";
        drawNestedShell(inner, shells, radii, i + 1);
        var mask = drawBezier(inner, shell.window, true);
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        inner.clipped = true;
    }

    // 입체 음영 구 (Object_ParticleModel.jsx의 applySphereFill과 같은 방식): 스크립트로는 방사형 그라데이션의 중심을
    // 옮길 수 없어, 왼쪽 위 하이라이트를 중심으로 한 큰 원을 그라데이션으로 채우고 구 크기 원으로 클리핑한다.
    // 음영을 끄면 테두리 있는 흰 원. 그라데이션 스와치는 한 번만 만들어 다시 쓴다 (litGradient)
    function drawLitSphere(container, center, r, k, name) {
        if (!shadeOn) {
            var flat = container.pathItems.ellipse(center[1] + r, center[0] - r, r * 2, r * 2);
            styleFace(flat, 0);
            flat.name = name;
            return;
        }
        if (litGradient === null) {
            litGradient = doc.gradients.add();
            litGradient.name = "지구 내핵 " + new Date().getTime();
            litGradient.type = GradientType.RADIAL;
            litGradient.gradientStops[0].rampPoint = 0;
            litGradient.gradientStops[0].color = makeGray(0);
            litGradient.gradientStops[0].midPoint = 13.3;
            litGradient.gradientStops[1].rampPoint = 100;
            litGradient.gradientStops[1].color = makeGray(k);
        }
        var group = container.groupItems.add();
        group.name = name;
        var hx = center[0] - r * 0.35, hy = center[1] + r * 0.35, big = r * 1.7;
        var fill = group.pathItems.ellipse(hy + big, hx - big, big * 2, big * 2);
        fill.stroked = false;
        fill.filled = true;
        var color = new GradientColor();
        color.gradient = litGradient;
        fill.fillColor = color;
        var mask = group.pathItems.ellipse(center[1] + r, center[0] - r, r * 2, r * 2);
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        group.clipped = true;
        var outline = container.pathItems.ellipse(center[1] + r, center[0] - r, r * 2, r * 2);
        styleLine(outline);
        outline.name = name + " 테두리";
    }

    function styleLine(path) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_WIDTH_PT;
    }

    // ---- 층 위치 슬라이더: 손잡이 4개를 직접 그리고 마우스로 끈다 ----
    function bindSpreadSlider() {
        var dragging = -1;
        track.onDraw = function() {
            var g = this.graphics;
            var width = this.size[0], height = this.size[1], mid = height / 2;
            var line = g.newBrush(g.BrushType.SOLID_COLOR, [0.55, 0.55, 0.55, 1]);
            g.newPath();
            g.rectPath(TRACK_PAD, mid - 1, width - TRACK_PAD * 2, 2);
            g.fillPath(line);
            var pen = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0, 1], 1);
            for (var i = 0; i < spread.length; i++) {
                var x = spreadToX(spread[i], width);
                var knob = g.newBrush(g.BrushType.SOLID_COLOR, i === dragging ? [1, 0.85, 0.3, 1] : [0.92, 0.92, 0.92, 1]);
                g.newPath();
                g.rectPath(x - 8, mid - 10, 16, 20);
                g.fillPath(knob);
                g.strokePath(pen);
                g.drawString(LAYERS[i].name.charAt(0), pen, x - 6, mid - 9);
            }
        };
        function moveTo(x) {
            var value = spreadFromX(x, track.size[0]);
            if (value === spread[dragging]) return;
            spread[dragging] = value;
            spreadInputs[dragging].text = formatNumber(value, 1);
            repaintTrack();
            updatePreview();
        }
        track.addEventListener("mousedown", function(event) {
            dragging = nearestHandle(spread, event.clientX, track.size[0]);
            moveTo(event.clientX);
            repaintTrack();
        });
        track.addEventListener("mousemove", function(event) {
            if (dragging >= 0) moveTo(event.clientX);
        });
        track.addEventListener("mouseup", function(event) {
            if (dragging < 0) return;
            moveTo(event.clientX);
            dragging = -1;
            repaintTrack();
        });
        for (var i = 0; i < spreadInputs.length; i++) {
            spreadInputs[i].onChange = (function(index) {
                return function() {
                    var value = parseNumber(spreadInputs[index].text);
                    if (value !== null) spread[index] = clamp(roundTo(value, 0.5), 0, SPREAD_MAX_MM);
                    spreadInputs[index].text = formatNumber(spread[index], 1);
                    repaintTrack();
                    updatePreview();
                };
            })(i);
        }
    }

    // 직접 그린 컨트롤은 숨겼다 보여야 다시 그려진다
    function repaintTrack() {
        track.visible = false;
        track.visible = true;
    }

    function layerK(i) {
        return shadeOn ? LAYERS[i].k : 0;
    }

    // 각 층 가운데 점에서 오른쪽으로 지시선, 끝에 이름. 이름이 겹칠 만큼 높이가 가까우면 아래로 벌리고
    // 지시선은 그림 오른쪽 끝에서 한 번 꺾어 이름 높이로 간다
    function drawNames(anchors, rightX) {
        var endX = rightX + leaderMm * MM;
        var kneeX = rightX + Math.min(leaderMm * MM * 0.4, 3 * MM);
        var ys = spreadLabels(anchors, fontPt * 1.3, kneeX);
        for (var i = 0; i < anchors.length; i++) {
            var leader = previewGroup.pathItems.add();
            leader.setEntirePath(Math.abs(ys[i] - anchors[i][1]) < 0.01 ? [anchors[i], [endX, ys[i]]]
                : [anchors[i], [kneeX, ys[i]], [endX, ys[i]]]);
            leader.filled = false;
            leader.stroked = true;
            leader.strokeColor = makeGray(100);
            leader.strokeWidth = LINE_WIDTH_PT;
            leader.name = "지시선";
            var dot = previewGroup.pathItems.ellipse(anchors[i][1] + 0.4 * MM, anchors[i][0] - 0.4 * MM, 0.8 * MM, 0.8 * MM);
            dot.stroked = false;
            dot.filled = true;
            dot.fillColor = makeGray(100);
            var chars = LABEL_STYLES[labelStyle].chars;
            var label = chars ? chars[i] : LAYERS[i].name + (stateOn ? " (" + LAYERS[i].state + ")" : "");
            addText(label, endX + fontPt * 0.4, ys[i], true);
        }
    }

    // 오른쪽 가로 반지름에 경계마다 눈금, 아래에 겉면에서 잰 깊이
    function drawDepths(radii) {
        var marks = depthMarks(radii);
        var tick = 1 * MM;
        for (var i = 0; i < marks.length; i++) {
            var line = previewGroup.pathItems.add();
            line.setEntirePath([[marks[i].x, 0], [marks[i].x, -tick]]);
            line.filled = false;
            line.stroked = true;
            line.strokeColor = makeGray(100);
            line.strokeWidth = LINE_WIDTH_PT;
            line.name = "깊이 눈금";
            addText(marks[i].text, marks[i].x, -tick - fontPt * (0.7 + 1.1 * marks[i].row), false);
        }
    }

    // ---- 3D 절단: 절개한 구 (Object_StarInterior.jsx의 drawStar와 같은 계산, 껍질 반지름만 지구 층) ----
    // 시점 좌표계: x 오른쪽, y 위, z 시청자 쪽. 쐐기: 세로축 둘레 방위각이 (방향 − 각/2, 방향 + 각/2)인 곳을 잘라낸다.
    // 돌려주는 것: {axis, faces: 보이는 절단면의 방향 벡터 목록, t: 이름을 달 테두리 매개변수}
    function drawCutSphere(R, radii) {
        var black = makeGray(100);
        var axis = projectView(0, 1, 0, tiltDeg, turnDeg);
        var e0 = projectView(0, 0, 1, tiltDeg, turnDeg);
        var e90 = projectView(1, 0, 0, tiltDeg, turnDeg);
        var psi1 = (rotDeg - cutDeg / 2) * Math.PI / 180;
        var psi2 = (rotDeg + cutDeg / 2) * Math.PI / 180;
        function eDir(psi) {
            return [e0[0] * Math.cos(psi) + e90[0] * Math.sin(psi),
                    e0[1] * Math.cos(psi) + e90[1] * Math.sin(psi),
                    e0[2] * Math.cos(psi) + e90[2] * Math.sin(psi)];
        }
        function inWedge(azDeg) {
            var d = normalizeAngle((azDeg - rotDeg) * Math.PI / 180);
            return Math.abs(d) < cutDeg * Math.PI / 360 - 1e-12;
        }
        var eA = eDir(psi1);
        var eB = eDir(psi2);
        var n1 = eDir(psi1 + Math.PI / 2);
        var n2 = eDir(psi2 - Math.PI / 2);
        var f1 = n1[2] > 1e-4;
        var f2 = n2[2] > 1e-4;
        var caseB = f1 && f2;      // 절개부를 들여다보는 시점: 두 절단면 모두 보임
        var caseA = !f1 && !f2;    // 절개부가 뒤쪽: 표면만 보임
        var sinHalf = Math.sin(cutDeg * Math.PI / 360);
        var bodyGray = 4 + 36 * sinHalf * sinHalf * (Math.max(0, n1[2]) + Math.max(0, n2[2])) / 2;
        var bodyFill = makeGray(shadeOn ? ((f1 || f2) ? bodyGray : 4) : 0);
        var Pp = [axis[0] * R, axis[1] * R, axis[2] * R];
        var Pm = [-Pp[0], -Pp[1], -Pp[2]];
        // 절단면 테두리(반원 대원): q(t) = R(cos t·축 + sin t·ek), t 0=윗극점, π=아랫극점
        function rimArc(ek, tFrom, tTo) {
            return paramArc([0, 0, 0], [axis[0] * R, axis[1] * R], [ek[0] * R, ek[1] * R], tFrom, tTo - tFrom);
        }
        function facePts(ek) {
            return joinLoop([segPts(Pp, Pm), rimArc(ek, Math.PI, 0)]);
        }
        function fullFacePts() { // 180°: 두 절단면이 한 평면 → 타원 하나
            return closedEllipsePts([axis[0] * R, axis[1] * R], [eB[0] * R, eB[1] * R]);
        }
        var isFullPlane = cutDeg > 179.99;
        // ---- 윤곽선에서 사라지는 실루엣 구간과 다리(절단면 테두리) ----
        var silArcPts = null;
        var bridgeArcs = null;
        if (Math.abs(axis[2]) < 1e-6) {
            // 축이 시점 평면 안: 실루엣의 방위각은 축의 좌/우 두 값뿐
            var d3 = [-axis[1], axis[0], 0];
            var azP = Math.atan2(dot(d3, e90), dot(d3, e0)) * 180 / Math.PI;
            var plusRemoved = inWedge(azP);
            var minusRemoved = inWedge(azP + 180);
            if (plusRemoved || minusRemoved) {
                var sideDir = plusRemoved ? d3 : [-d3[0], -d3[1], 0];
                var angP = Math.atan2(Pp[1], Pp[0]);
                var angM = Math.atan2(Pm[1], Pm[0]);
                var via = Math.atan2(-sideDir[1], -sideDir[0]);
                var kStar;
                if (!caseA && !caseB) {
                    kStar = f1 ? 2 : 1; // 숨은 절단면의 테두리가 표면의 경계
                } else {
                    kStar = (dot(eA, sideDir) >= dot(eB, sideDir)) ? 1 : 2;
                }
                silArcPts = arc2d(angP, angM, via);
                bridgeArcs = [rimArc(kStar === 1 ? eA : eB, Math.PI, 0)];
            }
        } else {
            // 축이 기울어짐: 실루엣 방위각이 한 바퀴를 돌아 제거 구간이 항상 존재
            var phi1 = silCross(psi1, eA);
            var phi2 = silCross(psi2, eB);
            var viaS = pickSurvivingVia();
            var poleT = caseB ? (axis[2] > 0 ? Math.PI : 0) : (axis[2] > 0 ? 0 : Math.PI);
            var t1 = tOfCross(phi1, eA);
            var t2 = tOfCross(phi2, eB);
            silArcPts = arc2d(phi2, phi1, viaS);
            bridgeArcs = [rimArc(eA, t1, poleT), rimArc(eB, poleT, t2)];
        }
        function silCross(psi, ek) { // 방위각 psi인 실루엣 점의 2D 각도
            var mx = e90[0] * Math.cos(psi) - e0[0] * Math.sin(psi);
            var my = e90[1] * Math.cos(psi) - e0[1] * Math.sin(psi);
            var phi = Math.atan2(-mx, my);
            var p = [Math.cos(phi), Math.sin(phi), 0];
            if (dot(p, ek) < 0) phi += Math.PI;
            return phi;
        }
        function tOfCross(phi, ek) {
            var p = [Math.cos(phi), Math.sin(phi), 0];
            return Math.atan2(dot(p, ek), dot(p, axis));
        }
        function pickSurvivingVia() {
            for (var i = 0; i < 72; i++) {
                var phi = i * Math.PI / 36;
                var p = [Math.cos(phi), Math.sin(phi), 0];
                var az = Math.atan2(dot(p, e90), dot(p, e0)) * 180 / Math.PI;
                if (!inWedge(az)) return phi;
            }
            return 0;
        }
        function arc2d(a1, a2, viaAngle) {
            var sweep = normalizeAngle(a2 - a1);
            var mid = normalizeAngle(viaAngle - a1);
            var within = (sweep > 0) ? (mid > 0 && mid < sweep) : (mid < 0 && mid > sweep);
            if (!within) sweep = (sweep > 0) ? sweep - 2 * Math.PI : sweep + 2 * Math.PI;
            return paramArc([0, 0, 0], [R, 0], [0, R], a1, sweep);
        }
        var bodyPts = (silArcPts !== null) ? joinLoop([silArcPts].concat(bridgeArcs)) : null;
        function drawBody() {
            var body = bodyPts !== null ? buildPath(previewGroup, bodyPts)
                : previewGroup.pathItems.ellipse(R, -R, R * 2, R * 2);
            styleFace(body, 0);
            body.fillColor = bodyFill;
            body.name = "겉면";
        }
        function drawFaceWithRings(faceBase) { // 바깥 층부터 (나중에 그린 것이 위)
            for (var i = 0; i < radii.length; i++) {
                var ring = buildPath(previewGroup, scalePts(faceBase, radii[i] / R));
                styleFace(ring, layerK(i));
                ring.name = LAYERS[i].name;
            }
        }
        if (caseA) {
            drawBody();
        } else if (caseB) {
            drawBody();
            if (isFullPlane) {
                drawFaceWithRings(fullFacePts());
            } else {
                drawFaceWithRings(facePts(eA));
                drawFaceWithRings(facePts(eB));
            }
        } else {
            // 절단면 하나만 보임: 절단면을 먼저 그리고 표면(몸체)으로 덮어 가려지는 부분을 감춘다
            drawFaceWithRings(isFullPlane ? fullFacePts() : facePts(f1 ? eA : eB));
            drawBody();
        }
        var visible = caseB ? [eA, eB] : (caseA ? [] : [f1 ? eA : eB]);
        return {axis: axis, faces: visible, t: Math.PI / 2};
    }

    // ---- 3D 절단: 잘라낸 조각 (절개한 구에서 뺀 쐐기, 같은 절개 방향에서 절단면이 보이도록 뒤로 돌려 놓는다) ----
    function drawPiece(R, radii) {
        var piece = wedgePiece(R, cutDeg, rotDeg + 180, tiltDeg, turnDeg, upperOnly);
        var body = buildPath(previewGroup, piece.outline);
        styleFace(body, shadeOn ? SURFACE_K : 0);
        body.name = "겉면";
        var faces = [];
        for (var f = 0; f < piece.faces.length; f++) {
            if (!piece.faces[f].visible) continue;
            for (var i = 0; i < radii.length; i++) {
                var ring = buildPath(previewGroup, scalePts(piece.faces[f].points, radii[i] / R));
                styleFace(ring, layerK(i));
                ring.name = LAYERS[i].name;
            }
            if (piece.faces[f].e) faces.push(piece.faces[f].e);
        }
        return {axis: piece.axis, faces: faces, t: upperOnly ? Math.PI / 4 : Math.PI / 2};
    }

    // 보이는 절단면 가운데 이름 자리가 가장 오른쪽인 면의 층 가운데 점들. 보이는 면이 없으면 null
    function pickFaceAnchors(seen, radii) {
        var best = null;
        for (var i = 0; i < seen.faces.length; i++) {
            var anchors = faceAnchors(seen.axis, seen.faces[i], radii, seen.t);
            if (best === null || anchors[1][0] > best[1][0]) best = anchors;
        }
        return best;
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
    // 기하 (순수 계산, 지구 중심 (0, 0))
    // -------------------------------------------------------
    // 층마다 바깥 반지름. 지각 안쪽은 반지름 × (1 − 지각 비율), 나머지는 실제 깊이 비율
    function layerRadii(R, crustRatio) {
        return [R, R * (1 - crustRatio), R * (EARTH_RADIUS_KM - 2900) / EARTH_RADIUS_KM, R * (EARTH_RADIUS_KM - 5100) / EARTH_RADIUS_KM];
    }

    // 층을 그리는 각 구간 (라디안): 오른쪽 가로 반지름(0)에서 시계 반대 방향으로 degrees만큼
    function sectorRange(degrees) {
        return [0, Math.min(360, Math.max(1, degrees)) * Math.PI / 180];
    }

    // 이름 지시선을 뽑는 방향: 부채꼴이 90° 이상이면 45°, 그보다 좁으면 부채꼴 가운데
    function labelAngle(range) {
        return Math.min(Math.PI / 4, (range[0] + range[1]) / 2);
    }

    // ---- 3D (순수 계산) ----
    // 시점 회전: X축으로 기울기, Y축으로 돌리기 (Object_StarInterior.jsx의 projectRotated, Z 회전 없음)
    function projectView(x, y, z, tilt, turn) {
        var c = Math.cos(tilt * Math.PI / 180), s = Math.sin(tilt * Math.PI / 180);
        var ny = y * c - z * s, nz = y * s + z * c;
        y = ny;
        z = nz;
        c = Math.cos(turn * Math.PI / 180);
        s = Math.sin(turn * Math.PI / 180);
        var nx = x * c + z * s;
        nz = -x * s + z * c;
        return [nx, y, nz];
    }

    function dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function normalizeAngle(a) {
        while (a <= -Math.PI) a += 2 * Math.PI;
        while (a > Math.PI) a -= 2 * Math.PI;
        return a;
    }

    // 3D 원호의 투영: point(t) = C + bu·cos t + bw·sin t (bu/bw는 2D 투영 벡터), 90° 이하 조각마다 베지어 하나
    function paramArc(C, bu, bw, t1, sweep) {
        var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
        var dt = sweep / count;
        var hf = 4 / 3 * Math.tan(dt / 4);
        var pts = [];
        for (var i = 0; i <= count; i++) {
            var a = t1 + dt * i;
            var ca = Math.cos(a), sa = Math.sin(a);
            var px = C[0] + bu[0] * ca + bw[0] * sa;
            var py = C[1] + bu[1] * ca + bw[1] * sa;
            var dx = (-bu[0] * sa + bw[0] * ca) * hf;
            var dy = (-bu[1] * sa + bw[1] * ca) * hf;
            pts.push({anchor: [px, py], left: [px - dx, py - dy], right: [px + dx, py + dy]});
        }
        return pts;
    }

    function closedEllipsePts(bu, bw) {
        return joinLoop([paramArc([0, 0, 0], bu, bw, 0, 2 * Math.PI)]);
    }

    function segPts(a, b) {
        return [
            {anchor: [a[0], a[1]], left: [a[0], a[1]], right: [a[0], a[1]]},
            {anchor: [b[0], b[1]], left: [b[0], b[1]], right: [b[0], b[1]]}
        ];
    }

    // 이어지는 호들을 닫힌 점 목록으로 (앞 호의 끝 = 다음 호의 처음, 마지막 호의 끝 = 첫 호의 처음). 이음매는 코너
    function joinLoop(arcs) {
        var pts = [];
        for (var k = 0; k < arcs.length; k++) {
            var arc = arcs[k];
            if (k > 0) {
                var tip = pts[pts.length - 1];
                tip.right = arc[0].right;
                tip.corner = true;
            }
            for (var i = (k === 0 ? 0 : 1); i < arc.length; i++) pts.push(arc[i]);
        }
        var last = pts[pts.length - 1];
        pts[0].left = last.left;
        pts[0].corner = true;
        pts.pop();
        return pts;
    }

    function scalePts(pts, s) {
        var out = [];
        for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            out.push({anchor: [p.anchor[0] * s, p.anchor[1] * s], left: [p.left[0] * s, p.left[1] * s],
                right: [p.right[0] * s, p.right[1] * s], corner: p.corner});
        }
        return out;
    }

    // 잘라낸 조각: 구 ∩ 방위각 [가운데 − 각/2, 가운데 + 각/2] (upper면 적도 위쪽만). 각 ≤ 180°라 볼록한 입체다.
    // 투영 윤곽은 가장자리(두 절단면 테두리, 적도 호, 중심, 조각 안의 구 실루엣)의 볼록 껍질이므로, 점을 촘촘히 뽑아
    // 껍질을 구한 뒤 같은 곡선에서 이어지는 구간은 정확한 호로 다시 만들고 구간 사이(껍질의 곧은 변)는 곧게 잇는다.
    // 돌려주는 것: {outline, axis, faces: [{points(면 모양), visible, e(이름용 방향, 적도면은 null)}]}
    function wedgePiece(R, pieceDeg, centerDeg, tilt, turn, upper) {
        var STEP = Math.PI / 720;
        var axis = projectView(0, 1, 0, tilt, turn);
        var e0 = projectView(0, 0, 1, tilt, turn), e90 = projectView(1, 0, 0, tilt, turn);
        function eDir(psi) {
            return [e0[0] * Math.cos(psi) + e90[0] * Math.sin(psi), e0[1] * Math.cos(psi) + e90[1] * Math.sin(psi),
                e0[2] * Math.cos(psi) + e90[2] * Math.sin(psi)];
        }
        var half = pieceDeg * Math.PI / 360, mid = centerDeg * Math.PI / 180;
        var psi1 = mid - half, psi2 = mid + half;
        var eA = eDir(psi1), eB = eDir(psi2);
        var tMax = upper ? Math.PI / 2 : Math.PI;
        function inside(p) {
            if (upper && dot(p, axis) < -1e-9) return false;
            var az = Math.atan2(dot(p, e90), dot(p, e0));
            return Math.abs(normalizeAngle(az - mid)) <= half + 1e-9;
        }
        // 가장자리 점: src 0·1 절단면 테두리(u = t), 2 구 실루엣(u = 화면 각), 3 적도 호(u = 방위각), 4 중심
        var rims = [eA, eB], samples = [];
        for (var f = 0; f < 2; f++) {
            for (var t = 0; t <= tMax + 1e-9; t += STEP) {
                samples.push({x: R * (Math.cos(t) * axis[0] + Math.sin(t) * rims[f][0]),
                    y: R * (Math.cos(t) * axis[1] + Math.sin(t) * rims[f][1]), src: f, u: t});
            }
        }
        for (var phi = -Math.PI; phi < Math.PI; phi += STEP) {
            if (inside([Math.cos(phi), Math.sin(phi), 0])) samples.push({x: R * Math.cos(phi), y: R * Math.sin(phi), src: 2, u: phi});
        }
        if (upper) {
            for (var psi = psi1; psi <= psi2 + 1e-9; psi += STEP) {
                var ep = eDir(psi);
                samples.push({x: R * ep[0], y: R * ep[1], src: 3, u: psi});
            }
            samples.push({x: 0, y: 0, src: 4, u: 0});
        }
        var hull = convexHull(samples);
        function continues(run, q) {
            var last = run.pts[run.pts.length - 1];
            return run.src === q.src && q.src !== 4 && Math.abs(normalizeAngle(q.u - last.u)) < STEP * 8;
        }
        var runs = [];
        for (var h = 0; h < hull.length; h++) {
            if (runs.length > 0 && continues(runs[runs.length - 1], hull[h])) runs[runs.length - 1].pts.push(hull[h]);
            else runs.push({src: hull[h].src, pts: [hull[h]]});
        }
        if (runs.length > 1 && continues(runs[runs.length - 1], runs[0].pts[0])) runs[0].pts = runs.pop().pts.concat(runs[0].pts);
        var outline = [];
        for (var r = 0; r < runs.length; r++) {
            var run = runs[r], first = run.pts[0], lastPt = run.pts[run.pts.length - 1], arc;
            if (run.src === 2) {
                var sweep = 0;
                for (var j = 1; j < run.pts.length; j++) sweep += normalizeAngle(run.pts[j].u - run.pts[j - 1].u);
                arc = paramArc([0, 0, 0], [R, 0], [0, R], first.u, sweep);
            } else if (run.src === 3) {
                arc = paramArc([0, 0, 0], [e0[0] * R, e0[1] * R], [e90[0] * R, e90[1] * R], first.u, lastPt.u - first.u);
            } else if (run.src === 4) {
                arc = segPts([0, 0], [0, 0]).slice(0, 1);
            } else {
                var ek = rims[run.src];
                arc = paramArc([0, 0, 0], [axis[0] * R, axis[1] * R], [ek[0] * R, ek[1] * R], first.u, lastPt.u - first.u);
            }
            arc[0].left = arc[0].anchor;
            arc[0].corner = true;
            arc[arc.length - 1].right = arc[arc.length - 1].anchor;
            arc[arc.length - 1].corner = true;
            for (var k = 0; k < arc.length; k++) outline.push(arc[k]);
        }
        // 절단면: 바깥 법선이 시청자 쪽이면 보인다 (A면은 방위각이 줄어드는 쪽, B면은 느는 쪽, 적도면은 아래쪽)
        var P = [axis[0] * R, axis[1] * R];
        var faces = [];
        for (var q = 0; q < 2; q++) {
            var e = rims[q];
            var normal = eDir(q === 0 ? psi1 - Math.PI / 2 : psi2 + Math.PI / 2);
            var edge = [e[0] * R, e[1] * R];
            var points = upper
                ? joinLoop([segPts([0, 0], P), paramArc([0, 0, 0], P, edge, 0, Math.PI / 2), segPts(edge, [0, 0])])
                : joinLoop([segPts(P, [-P[0], -P[1]]), paramArc([0, 0, 0], P, edge, Math.PI, -Math.PI)]);
            faces.push({points: points, visible: normal[2] > 1e-6, e: e});
        }
        if (upper) {
            faces.push({points: joinLoop([segPts([0, 0], [eA[0] * R, eA[1] * R]),
                paramArc([0, 0, 0], [e0[0] * R, e0[1] * R], [e90[0] * R, e90[1] * R], psi1, psi2 - psi1),
                segPts([eB[0] * R, eB[1] * R], [0, 0])]), visible: -axis[2] > 1e-6, e: null});
        }
        return {outline: outline, axis: axis, faces: faces};
    }

    // 볼록 껍질 (모노톤 체인), 시계 반대 방향
    function convexHull(points) {
        var p = points.slice().sort(function(a, b) { return a.x - b.x || a.y - b.y; });
        function cross(o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
        var lower = [], upperHull = [];
        for (var i = 0; i < p.length; i++) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 0) lower.pop();
            lower.push(p[i]);
        }
        for (var j = p.length - 1; j >= 0; j--) {
            while (upperHull.length >= 2 && cross(upperHull[upperHull.length - 2], upperHull[upperHull.length - 1], p[j]) <= 0) upperHull.pop();
            upperHull.push(p[j]);
        }
        upperHull.pop();
        lower.pop();
        return lower.concat(upperHull);
    }

    // 이름 높이: 정한 순서대로 위에서부터, 점 높이에서 시작해 바로 위 이름과 gap보다 가까우면 아래로 민다.
    // kneeX(꺾임점 x)를 주면 쌓는 순서를 모두 시도해 점 → 꺾임점 지시선이 가장 적게 교차하는 순서를 쓴다
    // (점들이 한 줄로 같은 높이에 있으면 높이 순서만으로는 선이 엇갈린다). 같으면 점 높이 순서에 가까운 것
    function spreadLabels(anchors, gap, kneeX) {
        var byHeight = [];
        for (var i = 0; i < anchors.length; i++) byHeight.push(i);
        byHeight.sort(function(a, b) { return anchors[b][1] - anchors[a][1] || a - b; });
        if (kneeX === undefined) return stackLabels(anchors, byHeight, gap);
        var best = null, bestScore = Infinity;
        permute(byHeight.slice(0), 0);
        return best;

        function permute(order, k) {
            if (k === order.length) {
                var ys = stackLabels(anchors, order, gap);
                var score = leaderCrossings(anchors, ys, kneeX) * 1000;
                for (var m = 0; m < order.length; m++) score += Math.abs(m - indexOf(byHeight, order[m]));
                if (score < bestScore) {
                    bestScore = score;
                    best = ys;
                }
                return;
            }
            for (var n = k; n < order.length; n++) {
                var t = order[k]; order[k] = order[n]; order[n] = t;
                permute(order, k + 1);
                t = order[k]; order[k] = order[n]; order[n] = t;
            }
        }
    }

    function stackLabels(anchors, order, gap) {
        var ys = [], previous = Infinity;
        for (var k = 0; k < order.length; k++) {
            var y = Math.min(anchors[order[k]][1], previous - gap);
            ys[order[k]] = y;
            previous = y;
        }
        return ys;
    }

    function indexOf(list, value) {
        for (var i = 0; i < list.length; i++) if (list[i] === value) return i;
        return -1;
    }

    // 점 i → (kneeX, ys[i]) 선분끼리 교차하는 쌍의 수 (꺾임점 뒤 가로선은 높이가 달라 만나지 않는다)
    function leaderCrossings(anchors, ys, kneeX) {
        var count = 0;
        for (var a = 0; a < anchors.length; a++) {
            for (var b = a + 1; b < anchors.length; b++) {
                if (segmentsCross(anchors[a], [kneeX, ys[a]], anchors[b], [kneeX, ys[b]])) count++;
            }
        }
        return count;
    }

    function segmentsCross(p1, p2, q1, q2) {
        function side(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
        var d1 = side(q1, q2, p1), d2 = side(q1, q2, p2), d3 = side(p1, p2, q1), d4 = side(p1, p2, q2);
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    }

    // 절단면(축과 방향 ek가 이루는 반평면) 위, 테두리 매개변수 t 방향의 층 가운데 점들
    function faceAnchors(axis, ek, radii, t) {
        var list = [];
        for (var i = 0; i < radii.length; i++) {
            var rm = (radii[i] + (i + 1 < radii.length ? radii[i + 1] : 0)) / 2;
            list.push([rm * (Math.cos(t) * axis[0] + Math.sin(t) * ek[0]), rm * (Math.cos(t) * axis[1] + Math.sin(t) * ek[1])]);
        }
        return list;
    }

    // 반구 분리: 층 i의 가운데 x는 offsets[i](pt)이고, 전체를 가운데 정렬한다. 지각·맨틀·외핵(마지막 층 전)은
    // 왼쪽 반구 겉면(dome) = 왼쪽 반원 + 단면 타원의 오른쪽 반, 단면(face) = 가로 반지름이 ratio배인 타원,
    // 파인 면(hole) = 바로 안쪽 층 반지름의 단면 타원. 마지막 층(내핵)은 구(sphere). 바깥 층부터 그린다
    function hemiLayers(radii, offsets, ratio) {
        var n = radii.length, list = [];
        var lo = Math.min.apply(null, offsets), hi = Math.max.apply(null, offsets);
        // 창(클리핑)의 오른쪽·위아래 끝: 그림을 넉넉히 덮을 만큼만 (너무 멀면 대지 밖 좌표가 된다)
        var far = radii[0] * 2 + (hi - lo);
        for (var i = 0; i < n; i++) {
            var cx = offsets[i] - (lo + hi) / 2, r = radii[i], a = r * ratio;
            if (i === n - 1) {
                list.push({cx: cx, rightX: cx + r, sphere: true});
                continue;
            }
            var inner = radii[i + 1], ia = inner * ratio;
            var holeLeft = paramArc([cx, 0, 0], [ia, 0], [0, inner], Math.PI / 2, Math.PI);
            list.push({
                cx: cx, rightX: cx + a, sphere: false,
                // 안쪽 층이 보이는 창: 구멍(왼쪽 반 타원) + 입구 면 가운데 선 오른쪽 전부
                window: joinLoop([holeLeft, segPts([cx, -inner], [cx, -far]), segPts([cx, -far], [cx + far, -far]),
                    segPts([cx + far, -far], [cx + far, far]), segPts([cx + far, far], [cx, far]),
                    segPts([cx, far], [cx, inner])]),
                dome: joinLoop([paramArc([cx, 0, 0], [r, 0], [0, r], Math.PI / 2, Math.PI), paramArc([cx, 0, 0], [a, 0], [0, r], -Math.PI / 2, Math.PI)]),
                face: joinLoop([paramArc([cx, 0, 0], [a, 0], [0, r], 0, 2 * Math.PI)]),
                hole: joinLoop([paramArc([cx, 0, 0], [inner * ratio, 0], [0, inner], 0, 2 * Math.PI)])
            });
        }
        return list;
    }

    // 층 위치 슬라이더: 값(mm) ↔ 컨트롤 안 x(px). 양 끝 TRACK_PAD만큼 비운다
    function spreadToX(value, width) {
        return TRACK_PAD + value / SPREAD_MAX_MM * (width - TRACK_PAD * 2);
    }

    function spreadFromX(x, width) {
        var value = (x - TRACK_PAD) / (width - TRACK_PAD * 2) * SPREAD_MAX_MM;
        return Math.min(SPREAD_MAX_MM, Math.max(0, Math.round(value * 2) / 2));
    }

    // 누른 곳에서 가장 가까운 손잡이. 같은 거리면 나중(안쪽) 층
    function nearestHandle(values, x, width) {
        var best = 0, bestDistance = Infinity;
        for (var i = 0; i < values.length; i++) {
            var d = Math.abs(spreadToX(values[i], width) - x);
            if (d <= bestDistance) {
                best = i;
                bestDistance = d;
            }
        }
        return best;
    }

    // 반구 분리 이름 자리: 층 i 단면 고리의 꼭대기 (다음 층이 덮지 않는 곳)
    function hemiAnchors(shells, radii) {
        var list = [];
        for (var i = 0; i < shells.length; i++) {
            // 고리는 바깥·안쪽 반지름 가운데, 내핵(구)은 반지름 절반 높이
            list.push([shells[i].cx, (radii[i] + (i + 1 < radii.length ? radii[i + 1] : 0)) / 2]);
        }
        return list;
    }

    // 중심에서 시작해 반지름 r 원호(from → to)를 지나 중심으로 닫는 부채꼴
    function sectorPoints(r, from, to) {
        var points = [{anchor: [0, 0], left: [0, 0], right: [0, 0]}];
        var arc = arcPoints(0, 0, r, from, to);
        for (var i = 0; i < arc.length; i++) points.push(arc[i]);
        return points;
    }

    // 층마다 (바깥 반지름 + 안쪽 반지름) / 2 자리를 angle 방향에. 내핵 안쪽은 0
    function labelAnchors(radii, angle) {
        var list = [];
        for (var i = 0; i < radii.length; i++) {
            var inner = i + 1 < radii.length ? radii[i + 1] : 0;
            var r = (radii[i] + inner) / 2;
            list.push([r * Math.cos(angle), r * Math.sin(angle)]);
        }
        return list;
    }

    // 겉면(0 km)부터 경계마다 {x, 글자, 줄}. 지각 아래 경계는 실제 깊이가 아니라 빼고,
    // 중심(6400 km)은 가까운 5100과 겹치지 않게 한 줄 아래에 둔다
    function depthMarks(radii) {
        return [
            {x: radii[0], text: "0", row: 0},
            {x: radii[2], text: "2900", row: 0},
            {x: radii[3], text: "5100", row: 0},
            {x: 0, text: EARTH_RADIUS_KM + " km", row: 1}
        ];
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
    function styleFace(path, k) {
        path.filled = true;
        path.fillColor = makeGray(k);
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = LINE_WIDTH_PT;
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

    // 세로 가운데가 y. leftAligned면 왼쪽 끝이 x, 아니면 가로 가운데가 x
    function addText(text, x, y, leftAligned) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        var attributes = frame.textRange.characterAttributes;
        attributes.size = fontPt;
        attributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(x - (leftAligned ? b[0] : (b[0] + b[2]) / 2), y - (b[1] + b[3]) / 2);
        return frame;
    }

    // 점 목록(점마다 corner면 모서리 점)으로 닫힌 패스
    function buildPath(container, pts) {
        var path = container.pathItems.add();
        for (var i = 0; i < pts.length; i++) {
            var p = path.pathPoints.add();
            p.anchor = pts[i].anchor;
            p.leftDirection = pts[i].left;
            p.rightDirection = pts[i].right;
            p.pointType = pts[i].corner ? PointType.CORNER : PointType.SMOOTH;
        }
        path.closed = true;
        return path;
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
        var parts = ["v5", angleDeg, radiusMm, crustPct, leaderMm, shadeOn ? "1" : "0", namesOn ? "1" : "0",
            stateOn ? "1" : "0", depthOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
            mode, cutView, cutDeg, rotDeg, tiltDeg, turnDeg, upperOnly ? "1" : "0", spread[0], spread[1], spread[2], spread[3], ratioPct, labelStyle];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v5" || p.length !== 26) return;
        angleDeg = restoreNumber(p[1], angleDeg, ANGLE_RANGE, 1);
        radiusMm = restoreNumber(p[2], radiusMm, RADIUS_RANGE, 1);
        crustPct = restoreNumber(p[3], crustPct, CRUST_RANGE, 0.5);
        leaderMm = restoreNumber(p[4], leaderMm, LEADER_RANGE, 1);
        shadeOn = p[5] === "1";
        namesOn = p[6] === "1";
        stateOn = p[7] === "1";
        depthOn = p[8] === "1";
        fontPt = restoreNumber(p[9], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[10], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[11], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[12] === "1";
        mode = restoreNumber(p[13], mode, [0, MODES.length - 1], 1);
        cutView = restoreNumber(p[14], cutView, [0, CUT_VIEWS.length - 1], 1);
        cutDeg = restoreNumber(p[15], cutDeg, CUT_RANGE, 1);
        rotDeg = restoreNumber(p[16], rotDeg, ROT_RANGE, 5);
        tiltDeg = restoreNumber(p[17], tiltDeg, VIEW_RANGE, 5);
        turnDeg = restoreNumber(p[18], turnDeg, VIEW_RANGE, 5);
        upperOnly = p[19] === "1";
        for (var s = 0; s < 4; s++) spread[s] = restoreNumber(p[20 + s], spread[s], [0, SPREAD_MAX_MM], 0.5);
        ratioPct = restoreNumber(p[24], ratioPct, RATIO_RANGE, 1);
        labelStyle = restoreNumber(p[25], labelStyle, [0, LABEL_STYLES.length - 1], 1);
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
