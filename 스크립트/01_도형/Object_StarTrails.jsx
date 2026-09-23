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

// 별의 일주 운동: 화면 가운데에 방향별 하늘의 별 궤적을 그린다. 한 시간에 15°씩 돈다.
//   - 북쪽: 북극성을 가운데 두고 시계 반대 방향으로 도는 동심원 호. 반지름은 고르게 나누고 시작 각은 배치 번호로 흩는다.
//     가장 바깥 호의 두 끝으로 반지름 파선과 각도 표시(예: 45°)를 넣을 수 있다.
//   - 동쪽: 지평선에서 오른쪽 위로 비스듬히 떠오르는 평행선, 서쪽: 오른쪽 아래로 지는 평행선.
//     지평선과 이루는 각은 90° − 위도.
//   - 남쪽: 지평선 아래에 중심을 둔 동심원 호. 왼쪽(동)에서 오른쪽(서)으로 움직인다.
//   - 궤적 끝에 방향 화살촉, 아래에 지평선과 방위 글자.

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
    // 화살촉 이름은 UI 언어를 따른다 (한국어판 '화살표 1')
    var ARROW_NAME = "화살표 1";
    var DIRECTIONS = ["북쪽", "동쪽", "남쪽", "서쪽"];
    var DIRECTION_LETTERS = ["북", "동", "남", "서"];
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

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);

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

    var skyPanel = addPanel(dlg, "하늘");
    var directionRow = skyPanel.add("group");
    directionRow.add("statictext", undefined, "방향:").preferredSize.width = LABEL_WIDTH;
    var directionRadios = [];
    for (var d = 0; d < DIRECTIONS.length; d++) directionRadios.push(directionRow.add("radiobutton", undefined, DIRECTIONS[d]));
    var sizeRow = addValueRow(skyPanel, "크기", "mm", sizeMm, SIZE_RANGE[0], SIZE_RANGE[1], 1, 0);
    var countRow = addValueRow(skyPanel, "별 수", "개", count, COUNT_RANGE[0], COUNT_RANGE[1], 1, 0);
    var hoursRow = addValueRow(skyPanel, "관측 시간", "h", hours, HOURS_RANGE[0], HOURS_RANGE[1], 0.5, 1);
    hoursRow.input.helpTip = "한 시간에 15°씩 돈다";
    var latitudeRow = addValueRow(skyPanel, "위도", "°", latitude, LATITUDE_RANGE[0], LATITUDE_RANGE[1], 0.5, 1);
    latitudeRow.input.helpTip = "동쪽·서쪽 하늘에서 궤적이 지평선과 이루는 각 = 90° − 위도";
    var seedRow = addValueRow(skyPanel, "배치 번호", "", seed, SEED_RANGE[0], SEED_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var headRow = addValueRow(markPanel, "화살촉 크기", "%", headScale, HEAD_RANGE[0], HEAD_RANGE[1], 10, 0);
    headRow.input.helpTip = "0이면 화살촉 없음";
    var checkRow = markPanel.add("group");
    var angleCheck = checkRow.add("checkbox", undefined, "각도 표시 (북쪽)");
    var horizonCheck = checkRow.add("checkbox", undefined, "지평선·방위");
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
    syncEnabled();

    for (var dr = 0; dr < directionRadios.length; dr++) {
        directionRadios[dr].onClick = (function(index) {
            return function() { direction = index; syncEnabled(); updatePreview(); };
        })(dr);
    }
    angleCheck.onClick = function() { angleMark = angleCheck.value; updatePreview(); };
    horizonCheck.onClick = function() { horizonOn = horizonCheck.value; updatePreview(); };
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

    // 각도 표시는 북쪽에서만, 위도는 동쪽·서쪽에서만 뜻이 있다
    function syncEnabled() {
        angleCheck.enabled = direction === 0;
        setRowEnabled(latitudeRow, direction === 1 || direction === 3);
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
        if (previewEnabled) buildPreview();
        app.redraw();
    }

    function buildPreview() {
        var size = sizeMm * MM;
        var cx = viewCenter[0];
        var cy = viewCenter[1];
        previewGroup = layer.groupItems.add();
        previewGroup.name = "별의 일주 운동 (" + DIRECTIONS[direction] + ")";
        var black = makeGray(100);
        var trails = previewGroup.groupItems.add();
        trails.name = "궤적";
        var paths = [];
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

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.textFont = korFont;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
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
        var parts = ["v1", direction, sizeMm, count, hours, latitude, headScale, seed, angleMark ? "1" : "0",
            horizonOn ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 14) return;
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
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
