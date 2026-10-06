// Object_Refraction.jsx
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

// 빛의 반사와 굴절: 두 매질의 경계면에 비스듬히 들어온 빛이 반사하고 굴절하는 모습을 그린다.
//   - 틀(너비·높이)의 가운데 가로선이 경계면이고 그 가운데가 입사점이다. 위가 매질 1, 아래가 매질 2.
//   - 입사광은 왼쪽 위에서 입사점으로, 반사광은 오른쪽 위로(반사각 = 입사각), 굴절광은 오른쪽 아래로 나간다.
//     굴절각은 직접 정한다(공기→유리는 입사각보다 작게, 유리→공기는 크게).
//   - 광선 길이·빛 굵기·빛 색(K), 화살촉 크기와 위치(광선 길이의 %), 법선(점선)·경계면(0.5pt)을 켜고 끈다.
//   - 매질 이름(공기·유리)과 색은 K값 10 단위 회색 음영. 모든 색은 회색 음영이다.
//   - 글자: 입사광·반사광·굴절광, 각(호와 입사각·반사각·굴절각), 매질 이름, 법선·경계면 이름을 따로 켜고 끈다.
//   - 확인하면 미리보기 그룹이 그대로 결과로 남는다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectRefraction/settings";

    // ==== 순수 기하 시작 (tests/check-refraction.js 가 이 구간을 그대로 읽는다) ====
    // 좌표는 mm, 입사점이 원점, 위가 +. 각은 도. 법선은 세로선이다
    var DEG = Math.PI / 180;

    // 반지름 r, 각 a(도)의 점
    function polar(r, a) {
        return [r * Math.cos(a * DEG), r * Math.sin(a * DEG)];
    }

    // 세 광선의 양 끝 [시작, 끝](빛이 나아가는 순서). 입사광은 왼쪽 위에서 원점으로,
    // 반사광은 원점에서 오른쪽 위로(반사각 = 입사각), 굴절광은 원점에서 오른쪽 아래로
    function rayLines(angleI, angleT, len) {
        var si = Math.sin(angleI * DEG);
        var ci = Math.cos(angleI * DEG);
        var st = Math.sin(angleT * DEG);
        var ct = Math.cos(angleT * DEG);
        return {
            incident: [[-len * si, len * ci], [0, 0]],
            reflected: [[0, 0], [len * si, len * ci]],
            refracted: [[0, 0], [len * st, -len * ct]]
        };
    }

    // 광선 위 화살촉(채운 삼각형) 세 점 [끝, 밑변 왼쪽, 밑변 오른쪽]. 가운데가 시작점에서 길이의 pos%인 자리.
    // 길이 size, 밑변 폭은 길이의 0.7배
    function arrowHead(line, pos, size) {
        var dx = line[1][0] - line[0][0];
        var dy = line[1][1] - line[0][1];
        var len = Math.sqrt(dx * dx + dy * dy);
        var ux = dx / len;
        var uy = dy / len;
        var cx = line[0][0] + dx * pos / 100;
        var cy = line[0][1] + dy * pos / 100;
        var tip = [cx + ux * size / 2, cy + uy * size / 2];
        var bx = cx - ux * size / 2;
        var by = cy - uy * size / 2;
        var half = size * 0.35;
        return [tip, [bx - uy * half, by + ux * half], [bx + uy * half, by - ux * half]];
    }

    // 원점 중심, 반지름 r, a0→a1(도)의 호를 3차 베지어 점 목록으로. 90°를 넘으면 나눈다. 점: {anchor, left, right}
    function arcPoints(r, a0, a1) {
        var sweep = a1 - a0;
        var count = Math.max(1, Math.ceil(Math.abs(sweep) / 90 - 1e-9));
        var step = sweep / count;
        var k = 4 / 3 * Math.tan(step * DEG / 4);
        var points = [];
        for (var i = 0; i <= count; i++) {
            var a = a0 + step * i;
            var p = polar(r, a);
            var tx = -Math.sin(a * DEG) * r * k;
            var ty = Math.cos(a * DEG) * r * k;
            points.push({
                anchor: p,
                left: i === 0 ? p : [p[0] - tx, p[1] - ty],
                right: i === count ? p : [p[0] + tx, p[1] + ty]
            });
        }
        return points;
    }

    // 세 각의 호 범위 [시작각, 끝각](도): 입사각은 위쪽 법선(90°)과 입사광 사이,
    // 반사각은 반사광과 위쪽 법선 사이, 굴절각은 아래쪽 법선(-90°)과 굴절광 사이
    function angleArcs(angleI, angleT) {
        return {
            incident: [90, 90 + angleI],
            reflected: [90 - angleI, 90],
            refracted: [-90, -90 + angleT]
        };
    }

    // 법선 선분 [아래 끝, 위 끝]: 광선보다 조금 길게, 틀 안쪽에서 끊는다
    function normalSpan(rayLen, frameH, margin) {
        var half = Math.min(rayLen + 4, frameH / 2 - margin);
        return [[0, -half], [0, half]];
    }
    // ==== 순수 기하 끝 ====

    var MM = 2.834645669;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var FONT_PT = 8;
    var BOUNDARY_PT = 0.5;
    var NORMAL_PT = 0.5;
    var NORMAL_DASH_PT = [3, 2];
    var ARC_PT = 0.5;
    var NORMAL_MARGIN_MM = 2;
    var RAY_LABEL_GAP_MM = 4;
    var ANGLE_LABEL_GAP_MM = 1;
    var TEXT_GAP_MM = 1.5;
    var LINE_K = 100;

    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var RESET_BUTTON_WIDTH = 34;
    var POSITION_LIMIT_MM = 100;
    var NAME_CHARS = 8;

    var CHECK_KEYS = ["arrowOn", "normalOn", "boundaryOn", "rayLabelsOn", "angleOn", "mediumLabelsOn", "lineLabelsOn"];
    // 숫자 옵션: 키, 범위, 한 단계, 소수 자리. 저장 순서도 이 순서다
    var NUMBER_KEYS = ["angleI", "angleT", "rayLen", "rayWidth", "rayK", "headSize", "headPos",
        "frameW", "frameH", "medium1K", "medium2K", "arcRadius", "offsetX", "offsetY"];
    var SPECS = {
        angleI: {range: [0, 85], step: 1, decimals: 0},
        angleT: {range: [0, 85], step: 1, decimals: 0},
        rayLen: {range: [5, 100], step: 0.5, decimals: 1},
        rayWidth: {range: [0.25, 4], step: 0.05, decimals: 2},
        rayK: {range: [0, 100], step: 10, decimals: 0},
        headSize: {range: [1, 10], step: 0.1, decimals: 1},
        headPos: {range: [0, 100], step: 1, decimals: 0},
        frameW: {range: [20, 200], step: 1, decimals: 0},
        frameH: {range: [20, 200], step: 1, decimals: 0},
        medium1K: {range: [0, 100], step: 10, decimals: 0},
        medium2K: {range: [0, 100], step: 10, decimals: 0},
        arcRadius: {range: [2, 30], step: 0.5, decimals: 1},
        offsetX: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1},
        offsetY: {range: [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], step: 0.1, decimals: 1}
    };

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME]);

    // 옵션
    var options = {
        arrowOn: true, normalOn: true, boundaryOn: true,
        rayLabelsOn: true, angleOn: true, mediumLabelsOn: true, lineLabelsOn: true,
        medium1Name: "공기", medium2Name: "유리",
        angleI: 45, angleT: 28, rayLen: 30, rayWidth: 1, rayK: 100, headSize: 3, headPos: 50,
        frameW: 80, frameH: 60, medium1K: 0, medium2K: 20, arcRadius: 8,
        offsetX: 0, offsetY: 0,
        previewOn: true
    };
    // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
    var DEFAULTS = {};
    for (var d = 0; d < NUMBER_KEYS.length; d++) DEFAULTS[NUMBER_KEYS[d]] = options[NUMBER_KEYS[d]];
    applySettings();

    var previewGroup = null;
    var rows = {};
    var checks = {};

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "빛의 반사와 굴절");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var rayPanel = addPanel(dlg, "광선");
    addRow(rayPanel, "angleI", "입사각", "°");
    rows.angleI.input.helpTip = "법선과 입사광 사이의 각. 반사각은 입사각과 같습니다";
    addRow(rayPanel, "angleT", "굴절각", "°");
    rows.angleT.input.helpTip = "법선과 굴절광 사이의 각. 공기→유리는 입사각보다 작게, 유리→공기는 크게";
    addRow(rayPanel, "rayLen", "광선 길이", "mm");
    addRow(rayPanel, "rayWidth", "빛 굵기", "pt");
    addRow(rayPanel, "rayK", "빛 색", "K");

    var arrowPanel = addPanel(dlg, "화살촉");
    var arrowRow = arrowPanel.add("group");
    arrowRow.alignChildren = ["left", "center"];
    addCheck(arrowRow, "arrowOn", "화살촉");
    addRow(arrowPanel, "headSize", "크기", "mm");
    addRow(arrowPanel, "headPos", "위치", "%");
    rows.headPos.input.helpTip = "광선 시작점(입사광은 왼쪽 위 끝, 나머지는 입사점)에서 광선 길이의 몇 % 자리에 둘지";

    var framePanel = addPanel(dlg, "틀·매질");
    addRow(framePanel, "frameW", "너비", "mm");
    addRow(framePanel, "frameH", "높이", "mm");
    var nameRow = framePanel.add("group");
    nameRow.alignChildren = ["left", "center"];
    nameRow.add("statictext", undefined, "매질 이름:").preferredSize.width = LABEL_WIDTH;
    var medium1Input = nameRow.add("edittext", undefined, options.medium1Name);
    medium1Input.characters = NAME_CHARS;
    medium1Input.helpTip = "매질 1 (위)";
    var medium2Input = nameRow.add("edittext", undefined, options.medium2Name);
    medium2Input.characters = NAME_CHARS;
    medium2Input.helpTip = "매질 2 (아래)";
    addRow(framePanel, "medium1K", "매질 1 색 (위)", "K");
    addRow(framePanel, "medium2K", "매질 2 색 (아래)", "K");
    var lineRow = framePanel.add("group");
    lineRow.alignChildren = ["left", "center"];
    addCheck(lineRow, "normalOn", "법선 (점선)");
    addCheck(lineRow, "boundaryOn", "경계면 (0.5pt)");

    var textPanel = addPanel(dlg, "글자");
    var textRow = textPanel.add("group");
    textRow.alignChildren = ["left", "center"];
    addCheck(textRow, "rayLabelsOn", "입사광·반사광·굴절광");
    addCheck(textRow, "angleOn", "각 (호와 이름)");
    var textRow2 = textPanel.add("group");
    textRow2.alignChildren = ["left", "center"];
    addCheck(textRow2, "mediumLabelsOn", "매질 이름");
    addCheck(textRow2, "lineLabelsOn", "법선·경계면 이름");
    addRow(textPanel, "arcRadius", "각 호 반지름", "mm");

    var positionPanel = addPanel(dlg, "위치");
    addRow(positionPanel, "offsetX", "가로", "mm");
    addRow(positionPanel, "offsetY", "세로", "mm");

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", {name: "cancel"});

    for (var n = 0; n < NUMBER_KEYS.length; n++) {
        if (NUMBER_KEYS[n] === "offsetX") {
            bindPositionRow(rows.offsetX, "offsetX", true);
        } else if (NUMBER_KEYS[n] === "offsetY") {
            bindPositionRow(rows.offsetY, "offsetY", false);
        } else {
            bindValueRow(rows[NUMBER_KEYS[n]], NUMBER_KEYS[n]);
        }
    }
    previewCheck.value = options.previewOn;
    applyCheckModes();

    medium1Input.onChange = function() { options.medium1Name = medium1Input.text; updatePreview(); };
    medium2Input.onChange = function() { options.medium2Name = medium2Input.text; updatePreview(); };
    previewCheck.onClick = function() {
        options.previewOn = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
    }
    app.redraw();

    // 화살촉을 끄면 크기·위치 행을, 각을 끄면 호 반지름 행을 잠근다
    function applyCheckModes() {
        setRowEnabled(rows.headSize, options.arrowOn);
        setRowEnabled(rows.headPos, options.arrowOn);
        setRowEnabled(rows.arcRadius, options.angleOn);
        medium1Input.enabled = options.mediumLabelsOn;
        medium2Input.enabled = options.mediumLabelsOn;
    }

    function setRowEnabled(controls, enabled) {
        controls.input.enabled = enabled;
        controls.slider.enabled = enabled;
        controls.reset.enabled = enabled;
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (options.previewOn) buildPreview();
        app.redraw();
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

    function buildPreview() {
        var o = options;
        var rays = rayLines(o.angleI, o.angleT, o.rayLen);
        var halfW = o.frameW / 2;
        var halfH = o.frameH / 2;
        var rayColor = makeGray(o.rayK);
        var lineColor = makeGray(LINE_K);

        previewGroup = findEditableLayer().groupItems.add();
        previewGroup.name = "Refraction";
        var group = previewGroup;

        // 매질: 위 매질 1, 아래 매질 2
        drawRect(group, "Medium1", [-halfW, halfH], [halfW, 0], makeGray(o.medium1K));
        drawRect(group, "Medium2", [-halfW, 0], [halfW, -halfH], makeGray(o.medium2K));

        if (o.boundaryOn) {
            var boundary = drawLine(group, [-halfW, 0], [halfW, 0]);
            boundary.name = "Boundary";
            styleStroke(boundary, lineColor, BOUNDARY_PT);
        }

        var normalLine = normalSpan(o.rayLen, o.frameH, NORMAL_MARGIN_MM);
        if (o.normalOn) {
            var normal = drawLine(group, normalLine[0], normalLine[1]);
            normal.name = "Normal";
            styleStroke(normal, lineColor, NORMAL_PT);
            normal.strokeDashes = NORMAL_DASH_PT;
        }

        var arcs = angleArcs(o.angleI, o.angleT);
        var arcNames = {incident: "입사각", reflected: "반사각", refracted: "굴절각"};
        if (o.angleOn) {
            for (var key in arcs) {
                if (!arcs.hasOwnProperty(key)) continue;
                if (arcs[key][1] - arcs[key][0] < 0.5) continue;
                var arc = drawPath(group, toPage(arcPoints(o.arcRadius, arcs[key][0], arcs[key][1])));
                arc.name = "Arc" + capitalize(key);
                styleStroke(arc, lineColor, ARC_PT);
                // 각 이름은 법선 옆, 호 바깥쪽: 입사각은 위 왼쪽, 반사각은 위 오른쪽, 굴절각은 아래 왼쪽
                var outside = o.arcRadius + ANGLE_LABEL_GAP_MM;
                if (key === "incident") addLabel(group, "LabelIncidentAngle", arcNames[key], [-TEXT_GAP_MM, outside], "r", "b");
                else if (key === "reflected") addLabel(group, "LabelReflectedAngle", arcNames[key], [TEXT_GAP_MM, outside], "l", "b");
                else addLabel(group, "LabelRefractedAngle", arcNames[key], [-TEXT_GAP_MM, -outside], "r", "t");
            }
        }

        var rayNames = {incident: "입사광", reflected: "반사광", refracted: "굴절광"};
        for (var rayKey in rays) {
            if (!rays.hasOwnProperty(rayKey)) continue;
            var line = rays[rayKey];
            var ray = drawLine(group, line[0], line[1]);
            ray.name = "Ray" + capitalize(rayKey);
            styleStroke(ray, rayColor, o.rayWidth);
            if (o.arrowOn) {
                var headPoints = arrowHead(line, o.headPos, o.headSize);
                var head = group.pathItems.add();
                head.setEntirePath([pagePoint(headPoints[0]), pagePoint(headPoints[1]), pagePoint(headPoints[2])]);
                head.closed = true;
                head.name = "Head" + capitalize(rayKey);
                head.stroked = false;
                head.filled = true;
                head.fillColor = rayColor;
            }
            if (o.rayLabelsOn) {
                // 광선의 바깥쪽 끝에서 광선 방향으로 조금 더 나간 자리
                var outer = rayKey === "incident" ? line[0] : line[1];
                var ux = (outer[0] - (rayKey === "incident" ? line[1][0] : line[0][0])) / o.rayLen;
                var uy = (outer[1] - (rayKey === "incident" ? line[1][1] : line[0][1])) / o.rayLen;
                addLabel(group, "Label" + capitalize(rayKey), rayNames[rayKey],
                    [outer[0] + ux * RAY_LABEL_GAP_MM, outer[1] + uy * RAY_LABEL_GAP_MM], "c", "m");
            }
        }

        if (o.lineLabelsOn) {
            if (o.normalOn) addLabel(group, "LabelNormal", "법선", [0, normalLine[1][1] + TEXT_GAP_MM], "c", "b");
            if (o.boundaryOn) addLabel(group, "LabelBoundary", "경계면", [halfW - TEXT_GAP_MM, -TEXT_GAP_MM], "r", "t");
        }
        if (o.mediumLabelsOn) {
            if (o.medium1Name !== "") addLabel(group, "LabelMedium1", o.medium1Name, [-halfW + TEXT_GAP_MM, TEXT_GAP_MM], "l", "b");
            if (o.medium2Name !== "") addLabel(group, "LabelMedium2", o.medium2Name, [-halfW + TEXT_GAP_MM, -TEXT_GAP_MM], "l", "t");
        }

        if (o.offsetX !== 0 || o.offsetY !== 0) group.translate(o.offsetX * MM, o.offsetY * MM);
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // mm 점 목록(입사점이 원점, 위가 +) → 문서 좌표(pt)
    function toPage(points) {
        var out = [];
        for (var i = 0; i < points.length; i++) {
            out.push({
                anchor: pagePoint(points[i].anchor),
                left: pagePoint(points[i].left),
                right: pagePoint(points[i].right)
            });
        }
        return out;
    }

    function pagePoint(p) {
        return [viewCenter[0] + p[0] * MM, viewCenter[1] + p[1] * MM];
    }

    // 점마다 anchor·left·right가 문서 좌표인 열린 패스
    function drawPath(container, points) {
        var path = container.pathItems.add();
        var anchors = [];
        for (var i = 0; i < points.length; i++) anchors.push(points[i].anchor);
        path.setEntirePath(anchors);
        for (var j = 0; j < points.length; j++) {
            path.pathPoints[j].leftDirection = points[j].left;
            path.pathPoints[j].rightDirection = points[j].right;
        }
        path.closed = false;
        return path;
    }

    // 두 점(mm)을 잇는 직선
    function drawLine(container, from, to) {
        var path = container.pathItems.add();
        path.setEntirePath([pagePoint(from), pagePoint(to)]);
        path.closed = false;
        return path;
    }

    // 왼쪽 위·오른쪽 아래(mm)로 정한 채운 사각형
    function drawRect(container, name, topLeft, bottomRight, color) {
        var tl = pagePoint(topLeft);
        var br = pagePoint(bottomRight);
        var rect = container.pathItems.rectangle(tl[1], tl[0], br[0] - tl[0], tl[1] - br[1]);
        rect.name = name;
        rect.stroked = false;
        rect.filled = true;
        rect.fillColor = color;
        return rect;
    }

    function styleStroke(path, color, width) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = color;
        path.strokeWidth = width;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.MITERENDJOIN;
    }

    // 8pt 검정 글자를 (x, y)mm 기준점에 맞춰 놓는다
    function addLabel(container, name, text, at, h, v) {
        var frame = container.textFrames.add();
        frame.contents = text;
        frame.name = name;
        frame.textRange.characterAttributes.size = FONT_PT;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.fillColor = makeGray(LINE_K);
        var p = pagePoint(at);
        placeText(frame, p[0], p[1], h, v);
        return frame;
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        var color;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = k;
        } else {
            color = new RGBColor();
            var level = Math.round(255 * (1 - k / 100));
            color.red = level;
            color.green = level;
            color.blue = level;
        }
        return color;
    }

    // 글자 테두리의 가로 기준(l 왼쪽, c 가운데, r 오른쪽)과 세로 기준(t 위, m 가운데, b 아래)이 (x, y)에 오도록 옮긴다
    function placeText(frame, x, y, h, v) {
        var b = frame.geometricBounds; // [left, top, right, bottom]
        var dx = h === "l" ? x - b[0] : (h === "r" ? x - b[2] : x - (b[0] + b[2]) / 2);
        var dy = v === "t" ? y - b[1] : (v === "b" ? y - b[3] : y - (b[1] + b[3]) / 2);
        frame.translate(dx, dy);
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
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

    // 라벨 (단위): | 입력창 | 스크롤바 | R
    function addRow(parent, key, label, unit) {
        var spec = SPECS[key];
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var labelText = row.add("statictext", undefined, label + " (" + unit + "):");
        labelText.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatNumber(options[key], spec.decimals));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, options[key], spec.range[0], spec.range[1]);
        slider.stepdelta = spec.step;
        slider.jumpdelta = spec.step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        var reset = row.add("button", undefined, "R");
        reset.preferredSize.width = RESET_BUTTON_WIDTH;
        reset.helpTip = "처음 값으로 되돌리기";
        rows[key] = {label: labelText, input: input, slider: slider, reset: reset,
            min: spec.range[0], max: spec.range[1], step: spec.step, decimals: spec.decimals};
        return rows[key];
    }

    // 체크박스. 바꾸면 옵션에 쓰고 잠금 상태와 미리보기를 다시 맞춘다
    function addCheck(parent, key, label) {
        var check = parent.add("checkbox", undefined, label);
        check.value = options[key];
        check.onClick = function() {
            options[key] = check.value;
            applyCheckModes();
            updatePreview();
        };
        checks[key] = check;
        return check;
    }

    // 값을 그대로(단계로 반올림하지 않고) 입력창과 스크롤바에 보여 준다
    function showRowValue(controls, value) {
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = clamp(value, controls.min, controls.max); } catch (e) {}
    }

    // 값이 바뀌면 옵션에 쓰고 미리보기를 다시 그린다
    function bindValueRow(controls, key) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            showRowValue(controls, value);
            if (value === options[key]) return;
            options[key] = value;
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
        };
    }

    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    function bindPositionRow(controls, key, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - options[key]) * MM;
            options[key] = value;
            showRowValue(controls, value);
            if (delta === 0) return;
            movePreview(isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.reset.onClick = function() { commit(DEFAULTS[key]); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? options[key] : value);
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
        return Math.round(Math.round(value / step) * step * 1000000) / 1000000;
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
    // "v1" + 체크(CHECK_KEYS 순서) + 미리보기 + 매질 이름 둘 + 숫자(NUMBER_KEYS 순서). 확인할 때만 저장
    // -------------------------------------------------------
    function flag(value) { return value ? "1" : "0"; }

    function saveSettings() {
        var parts = ["v1"];
        for (var c = 0; c < CHECK_KEYS.length; c++) parts.push(flag(options[CHECK_KEYS[c]]));
        parts.push(flag(options.previewOn));
        // 구분자 | 는 이름에 쓸 수 없다
        parts.push(String(options.medium1Name).replace(/\|/g, "/"));
        parts.push(String(options.medium2Name).replace(/\|/g, "/"));
        for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        var head = 1 + CHECK_KEYS.length + 1 + 2;
        if (p[0] !== "v1" || p.length !== head + NUMBER_KEYS.length) return;
        for (var c = 0; c < CHECK_KEYS.length; c++) options[CHECK_KEYS[c]] = (p[1 + c] === "1");
        options.previewOn = (p[1 + CHECK_KEYS.length] === "1");
        options.medium1Name = p[2 + CHECK_KEYS.length];
        options.medium2Name = p[3 + CHECK_KEYS.length];
        for (var i = 0; i < NUMBER_KEYS.length; i++) {
            var spec = SPECS[NUMBER_KEYS[i]];
            var value = parseNumber(p[head + i]);
            if (value !== null) options[NUMBER_KEYS[i]] = clamp(roundTo(value, spec.step), spec.range[0], spec.range[1]);
        }
    }
})();
