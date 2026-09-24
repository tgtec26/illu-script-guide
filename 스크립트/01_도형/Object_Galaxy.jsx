// Object_Galaxy.jsx
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


// 우리은하: 화면 가운데에 우리은하나 성단을 점(별)으로 그린다. 같은 배치 번호면 같은 모양이 나온다.
//   - 위에서 본 모습: 가운데 막대 모양 중심부(팽대부)와 나선팔. 나선팔은 중심부 끝에서 가장자리까지 감기는 로그 나선을 따라 별을 흩는다.
//     태양계는 중심에서 반지름의 60%(약 3만 광년) 자리.
//   - 옆에서 본 모습: 얇은 원반, 볼록한 중심부, 둘레 헤일로에 흩어진 구상 성단. 지름은 약 10만 광년.
//   - 성단: 왼쪽 산개 성단(별이 적고 흩어짐), 오른쪽 구상 성단(별이 많고 가운데로 빽빽함).
//   - 별은 원 하나를 만들어 복제·이동한다(미리보기를 빠르게). 검은 배경을 켜면 별이 흰색이 된다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectGalaxy/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var HEAD_LENGTH = 1.4 * MM;
    var HEAD_WIDTH = 1 * MM;
    var STAR_K = 85;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["위에서 본 모습", "옆에서 본 모습", "성단"];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var SIZE_RANGE = [20, 200];
    var STARS_RANGE = [50, 1500];
    var ARMS_RANGE = [2, 4];
    var TURNS_RANGE = [0.3, 2];
    var DOT_RANGE = [0.2, 3];
    var SEED_RANGE = [1, 99];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

    // 옵션
    var kind = 0;
    var sizeMm = 80;
    var starCount = 500;
    var arms = 2;
    var turns = 0.8;
    var dotMm = 0.8;
    var seed = 1;
    var darkOn = false;
    var sunOn = true;
    var distanceOn = true;
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
    var dlg = new Window("dialog", "우리은하");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    addRadioRow(shapePanel, "종류", KINDS, kind, function(i) { kind = i; syncEnabled(); updatePreview(); });
    var sizeRow = addValueRow(shapePanel, "지름", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 1, 0);
    var starsRow = addValueRow(shapePanel, "별 수", "개", starCount, STARS_RANGE[0], STARS_RANGE[1], 10, 0);
    var armsRow = addValueRow(shapePanel, "나선팔 수", "개", arms, ARMS_RANGE[0], ARMS_RANGE[1], 1, 0);
    var turnsRow = addValueRow(shapePanel, "감긴 정도", "바퀴", turns, TURNS_RANGE[0], TURNS_RANGE[1], 0.1, 1);
    var dotRow = addValueRow(shapePanel, "별 크기", "mm", dotMm, DOT_RANGE[0], DOT_RANGE[1], 0.1, 1);
    var seedRow = addValueRow(shapePanel, "배치 번호", "", seed, SEED_RANGE[0], SEED_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var darkCheck = checkRow.add("checkbox", undefined, "검은 배경");
    var sunCheck = checkRow.add("checkbox", undefined, "태양계");
    var distanceCheck = checkRow.add("checkbox", undefined, "거리");
    var labelsCheck = checkRow.add("checkbox", undefined, "이름");
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

    darkCheck.value = darkOn;
    sunCheck.value = sunOn;
    distanceCheck.value = distanceOn;
    labelsCheck.value = labelsOn;
    syncEnabled();
    darkCheck.onClick = function() { darkOn = darkCheck.value; updatePreview(); };
    sunCheck.onClick = function() { sunOn = sunCheck.value; updatePreview(); };
    distanceCheck.onClick = function() { distanceOn = distanceCheck.value; updatePreview(); };
    labelsCheck.onClick = function() { labelsOn = labelsCheck.value; updatePreview(); };
    bindValueRow(sizeRow, function() { return sizeMm; }, function(v) { sizeMm = v; });
    bindValueRow(starsRow, function() { return starCount; }, function(v) { starCount = v; });
    bindValueRow(armsRow, function() { return arms; }, function(v) { arms = v; });
    bindValueRow(turnsRow, function() { return turns; }, function(v) { turns = v; });
    bindValueRow(dotRow, function() { return dotMm; }, function(v) { dotMm = v; });
    bindValueRow(seedRow, function() { return seed; }, function(v) { seed = v; });
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

    function syncEnabled() {
        setRowEnabled(armsRow, kind === 0);
        setRowEnabled(turnsRow, kind === 0);
        sunCheck.enabled = kind !== 2;
        distanceCheck.enabled = kind !== 2;
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
        previewGroup.name = "우리은하 (" + KINDS[kind] + ")";
        var R = sizeMm * MM / 2;
        var scene = kind === 0 ? galaxyTop(starCount, R, arms, turns, seed)
            : (kind === 1 ? galaxySide(starCount, R, seed) : clusters(starCount, R, seed));
        if (darkOn) {
            var margin = R * 0.12;
            var b = scene.bounds;
            var back = previewGroup.pathItems.rectangle(b[1] + margin, b[0] - margin, b[2] - b[0] + margin * 2, b[1] - b[3] + margin * 2);
            styleFace(back, 100, false);
            back.name = "배경";
        }
        drawDots(scene.dots);
        if (kind !== 2 && sunOn) {
            addDisc(scene.sun, 2 * MM, 0, "태양계").strokeWidth = 0.6;
            if (labelsOn) textOn("태양계", scene.sun[0], scene.sun[1] - 2 * MM - fontPt * 0.5, 0);
        }
        if (kind !== 2 && distanceOn) drawDistance(scene.distance);
        if (labelsOn) {
            for (var i = 0; i < scene.labels.length; i++) textOn(scene.labels[i].text, scene.labels[i].p[0], scene.labels[i].p[1], 0);
        }
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    // 원 하나를 만들어 복제·이동한다 (DOM 호출 3번)
    function drawDots(dots) {
        var group = previewGroup.groupItems.add();
        group.name = "별";
        var d0 = dotMm * MM;
        var proto = group.pathItems.ellipse(d0 / 2, -d0 / 2, d0, d0);
        proto.stroked = false;
        proto.filled = true;
        proto.fillColor = makeGray(darkOn ? 0 : STAR_K);
        for (var i = 0; i < dots.length; i++) {
            var copy = proto.duplicate(group, ElementPlacement.PLACEATEND);
            if (dots[i].s !== 1) copy.resize(dots[i].s * 100, dots[i].s * 100);
            copy.translate(dots[i].x, dots[i].y);
        }
        proto.remove();
    }

    // 양쪽 화살촉 치수선과 글자
    function drawDistance(d) {
        var line = addLine([d.from, d.to], null, "거리");
        if (darkOn) line.strokeColor = makeGray(0);
        var heads = [addHead(d.from, d.from[0] - d.to[0], d.from[1] - d.to[1]), addHead(d.to, d.to[0] - d.from[0], d.to[1] - d.from[1])];
        if (darkOn) for (var i = 0; i < 2; i++) heads[i].fillColor = makeGray(0);
        textOn(d.text, (d.from[0] + d.to[0]) / 2, (d.from[1] + d.to[1]) / 2 + fontPt * 0.9, 0);
    }

    function textOn(text, x, y, align) {
        var frame = addText(text, x, y, align);
        if (darkOn) frame.textRange.characterAttributes.fillColor = makeGray(0);
        return frame;
    }

    // -------------------------------------------------------
    // 별 배치 (순수 계산, 가운데 (0, 0)). 별은 {x, y, s(크기 배율)}
    // -------------------------------------------------------
    // 같은 seed면 같은 수열 (0 이상 1 미만)
    function makeRandom(seedValue) {
        var state = (seedValue * 2654435761) % 4294967296;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    // 표준 정규분포 (박스–뮬러)
    function gaussian(random) {
        var u = Math.max(1e-9, random()), v = random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function starSize(random) {
        var u = random();
        return 0.5 + u * u * 1.3;
    }

    // 위에서 본 모습: 18%는 가로로 긴 중심부, 나머지는 로그 나선 팔. 팔 i는 각 2πi/팔 수에서 시작한다
    function galaxyTop(n, R, armCount, turnCount, seedValue) {
        var random = makeRandom(seedValue);
        var dots = [];
        var bulge = Math.round(n * 0.18);
        for (var b = 0; b < bulge; b++) {
            dots.push({x: gaussian(random) * R * 0.13, y: gaussian(random) * R * 0.06, s: starSize(random)});
        }
        // 로그 나선: 막대 끝(반지름 15%)에서 시작해 turns바퀴 돌며 가장자리에 닿는다. 바깥일수록 별이 드물다
        var growth = Math.log(1 / 0.15) / (turnCount * 2 * Math.PI);
        for (var i = bulge; i < n; i++) {
            var arm = i % armCount;
            var t = random();
            var theta = t * turnCount * 2 * Math.PI;
            var r = R * 0.15 * Math.exp(growth * theta);
            var angle = 2 * Math.PI * arm / armCount + theta;
            var spread = R * 0.035 * (0.5 + t);
            dots.push({x: r * Math.cos(angle) + gaussian(random) * spread, y: r * Math.sin(angle) + gaussian(random) * spread, s: starSize(random)});
        }
        clampDots(dots, R);
        // 태양계: 첫 나선팔 위, 반지름 60%
        var sunAngle = Math.log(0.6 / 0.15) / growth;
        return {
            dots: dots, bounds: [-R, R, R, -R],
            sun: [R * 0.6 * Math.cos(sunAngle), R * 0.6 * Math.sin(sunAngle)],
            distance: {from: [0, 0], to: [R * 0.6 * Math.cos(sunAngle), R * 0.6 * Math.sin(sunAngle)], text: "약 3만 광년"},
            labels: [{text: "중심부", p: [0, R * 0.2]}, {text: "나선팔", p: [-R * 0.75, R * 0.8]}]
        };
    }

    // 옆에서 본 모습: 원반 60%, 중심부 25%, 헤일로 구상 성단(8개씩 뭉친 별) 15%
    function galaxySide(n, R, seedValue) {
        var random = makeRandom(seedValue);
        var dots = [];
        var disk = Math.round(n * 0.6), bulge = Math.round(n * 0.25);
        for (var d = 0; d < disk; d++) {
            var x = (random() * 2 - 1) * R;
            dots.push({x: x, y: gaussian(random) * R * 0.025 * (1 - 0.5 * Math.abs(x) / R), s: starSize(random)});
        }
        for (var b = 0; b < bulge; b++) {
            dots.push({x: gaussian(random) * R * 0.14, y: gaussian(random) * R * 0.09, s: starSize(random)});
        }
        var clusterCount = Math.max(1, Math.round((n - disk - bulge) / 8));
        var labelCluster = null;
        for (var c = 0; c < clusterCount; c++) {
            var a = random() * 2 * Math.PI, r = R * (0.35 + 0.5 * Math.sqrt(random()));
            var cx = r * Math.cos(a), cy = r * Math.sin(a) * 0.8;
            if (Math.abs(cy) < R * 0.12) cy = (cy < 0 ? -1 : 1) * R * 0.12;
            if (labelCluster === null || cy > labelCluster[1]) labelCluster = [cx, cy];
            for (var k = 0; k < 8; k++) dots.push({x: cx + gaussian(random) * R * 0.015, y: cy + gaussian(random) * R * 0.015, s: 0.6});
        }
        clampDots(dots, R);
        return {
            dots: dots, bounds: [-R, R * 0.85, R, -R * 0.85],
            sun: [R * 0.6, 0],
            distance: {from: [-R, -R * 0.95], to: [R, -R * 0.95], text: "약 10만 광년"},
            labels: [{text: "중심부", p: [0, R * 0.25]}, {text: "원반", p: [-R * 0.75, R * 0.1]},
                {text: "헤일로", p: [-R * 0.7, R * 0.75]}, {text: "구상 성단", p: [labelCluster[0], labelCluster[1] + R * 0.08]}]
        };
    }

    // 성단: 왼쪽 산개 성단(별 수의 10%, 고르게 흩어짐), 오른쪽 구상 성단(나머지, 가운데로 빽빽). 두 성단 지름은 R
    function clusters(n, R, seedValue) {
        var random = makeRandom(seedValue);
        var dots = [];
        var open = Math.max(10, Math.round(n * 0.1));
        var left = -R * 0.6, right = R * 0.6, r = R / 2;
        for (var i = 0; i < open; i++) {
            var a = random() * 2 * Math.PI, rr = r * Math.sqrt(random());
            dots.push({x: left + rr * Math.cos(a), y: rr * Math.sin(a), s: 1 + random()});
        }
        for (var j = open; j < n; j++) {
            var gx = gaussian(random) * r * 0.3, gy = gaussian(random) * r * 0.3;
            var dist = Math.sqrt(gx * gx + gy * gy);
            if (dist > r) { gx *= r / dist; gy *= r / dist; }
            dots.push({x: right + gx, y: gy, s: 0.7});
        }
        return {
            dots: dots, bounds: [left - r, r, right + r, -r],
            labels: [{text: "산개 성단", p: [left, -r * 1.2]}, {text: "구상 성단", p: [right, -r * 1.2]}]
        };
    }

    // 지름 밖으로 나간 별은 원 둘레로 당긴다
    function clampDots(dots, R) {
        for (var i = 0; i < dots.length; i++) {
            var d = Math.sqrt(dots[i].x * dots[i].x + dots[i].y * dots[i].y);
            if (d > R) {
                dots[i].x *= R / d;
                dots[i].y *= R / d;
            }
        }
    }

    // -------------------------------------------------------
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v1", kind, sizeMm, starCount, arms, turns, dotMm, seed, darkOn ? "1" : "0", sunOn ? "1" : "0",
            distanceOn ? "1" : "0", labelsOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 16) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        sizeMm = restoreNumber(p[2], sizeMm, SIZE_RANGE, 1);
        starCount = restoreNumber(p[3], starCount, STARS_RANGE, 10);
        arms = restoreNumber(p[4], arms, ARMS_RANGE, 1);
        turns = restoreNumber(p[5], turns, TURNS_RANGE, 0.1);
        dotMm = restoreNumber(p[6], dotMm, DOT_RANGE, 0.1);
        seed = restoreNumber(p[7], seed, SEED_RANGE, 1);
        darkOn = p[8] === "1";
        sunOn = p[9] === "1";
        distanceOn = p[10] === "1";
        labelsOn = p[11] === "1";
        fontPt = restoreNumber(p[12], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[13], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[14], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[15] === "1";
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

        function addDisc(center, diameter, k, name, container) {
        var disc = (container || previewGroup).pathItems.ellipse(center[1] + diameter / 2, center[0] - diameter / 2, diameter, diameter);
        styleFace(disc, k);
        disc.name = name;
        return disc;
    }

        // 세로 가운데가 y. align이 0이면 가로 가운데, 1이면 왼쪽 끝, -1이면 오른쪽 끝이 x
    function addText(text, x, y, align, container) {
        var frame = (container || previewGroup).textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
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
