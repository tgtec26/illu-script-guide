// Object_LightMixing.jsx
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

// 빛의 합성: 화면 가운데에 두 모식도 중 하나를 그린다.
//   - 빛의 삼원색: 빨간색(위)·초록색(왼쪽 아래)·파란색(오른쪽 아래) 원을 정삼각형으로 겹친다.
//     두 빛이 겹친 곳은 노란색·청록색·자홍색, 셋이 겹친 곳은 흰색. 겹친 부분은 원을 다른 원으로 클리핑해 칠한다.
//     색 이름은 각 영역에서 경계와 가장 먼 점에 둔다. 검은 배경을 깔 수 있다.
//   - 프리즘 분산: 정삼각형 프리즘의 왼쪽 면 가운데로 백색광이 들어와 굴절률 1.5로 두 번 꺾이고,
//     나오는 빛을 빨간색(가장 덜 꺾임) → 보라색으로 '퍼짐' 각만큼 벌린다. 퍼짐은 실제보다 크게 보이게 하는 값이다.
//   - 색 채우기를 끄면 흑백(선만)으로 그린다. 검은 배경은 색을 칠할 때만 깐다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectLightMixing/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var RAY_WIDTH_PT = 0.75;
    var PRISM_INDEX = 1.5;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["빛의 삼원색", "프리즘 분산"];
    // 삼원색 영역: 들어 있는 원(빨·초·파) → 이름, CMYK, RGB
    var REGIONS = [
        {inside: [true, false, false], name: "빨간색", cmyk: [0, 100, 100, 0], rgb: [255, 0, 0]},
        {inside: [false, true, false], name: "초록색", cmyk: [100, 0, 100, 0], rgb: [0, 255, 0]},
        {inside: [false, false, true], name: "파란색", cmyk: [100, 100, 0, 0], rgb: [0, 0, 255]},
        {inside: [true, true, false], name: "노란색", cmyk: [0, 0, 100, 0], rgb: [255, 255, 0]},
        {inside: [false, true, true], name: "청록색", cmyk: [100, 0, 0, 0], rgb: [0, 255, 255]},
        {inside: [true, false, true], name: "자홍색", cmyk: [0, 100, 0, 0], rgb: [255, 0, 255]},
        {inside: [true, true, true], name: "흰색", cmyk: [0, 0, 0, 0], rgb: [255, 255, 255]}
    ];
    // 프리즘에서 나오는 빛, 덜 꺾이는 것부터
    var SPECTRUM = [
        {name: "빨간색", cmyk: [0, 100, 100, 0], rgb: [230, 0, 18]},
        {name: "주황색", cmyk: [0, 60, 100, 0], rgb: [243, 152, 0]},
        {name: "노란색", cmyk: [0, 0, 100, 0], rgb: [255, 241, 0]},
        {name: "초록색", cmyk: [100, 0, 100, 0], rgb: [0, 153, 68]},
        {name: "파란색", cmyk: [100, 50, 0, 0], rgb: [0, 104, 183]},
        {name: "남색", cmyk: [100, 100, 0, 20], rgb: [29, 32, 136]},
        {name: "보라색", cmyk: [60, 100, 0, 0], rgb: [146, 7, 131]}
    ];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var DIAMETER_RANGE = [10, 150];
    // 86.6%를 넘으면 세 원이 모두 겹치는 곳이 사라진다
    var SPACING_RANGE = [20, 85];
    var SIDE_RANGE = [10, 150];
    var INCIDENCE_RANGE = [30, 80];
    var SPREAD_RANGE = [0, 30];
    var RAY_RANGE = [10, 150];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var diameterMm = 40;
    var spacing = 55;
    var sideMm = 40;
    var incidence = 50;
    var spread = 12;
    var rayMm = 40;
    var colorOn = true;
    var backgroundOn = false;
    var namesOn = true;
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
    var dlg = new Window("dialog", "빛의 합성");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    var kindRow = shapePanel.add("group");
    kindRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var kindRadios = [];
    for (var k = 0; k < KINDS.length; k++) kindRadios.push(kindRow.add("radiobutton", undefined, KINDS[k]));
    var diameterRow = addValueRow(shapePanel, "원 지름", "mm", diameterMm, DIAMETER_RANGE[0], DIAMETER_RANGE[1], 1, 0);
    var spacingRow = addValueRow(shapePanel, "중심 간격", "%", spacing, SPACING_RANGE[0], SPACING_RANGE[1], 1, 0);
    spacingRow.input.helpTip = "원 중심 사이 거리 ÷ 지름. 작을수록 많이 겹친다";
    var sideRow = addValueRow(shapePanel, "프리즘 변", "mm", sideMm, SIDE_RANGE[0], SIDE_RANGE[1], 1, 0);
    var incidenceRow = addValueRow(shapePanel, "입사각", "°", incidence, INCIDENCE_RANGE[0], INCIDENCE_RANGE[1], 1, 0);
    var spreadRow = addValueRow(shapePanel, "퍼짐", "°", spread, SPREAD_RANGE[0], SPREAD_RANGE[1], 0.5, 1);
    spreadRow.input.helpTip = "빨간색과 보라색이 나오는 각의 차이 (실제보다 크게)";
    var rayRow = addValueRow(shapePanel, "광선 길이", "mm", rayMm, RAY_RANGE[0], RAY_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var checkRow = markPanel.add("group");
    var colorCheck = checkRow.add("checkbox", undefined, "색 채우기");
    var backgroundCheck = checkRow.add("checkbox", undefined, "검은 배경");
    var namesCheck = checkRow.add("checkbox", undefined, "색 이름");
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

    kindRadios[kind].value = true;
    colorCheck.value = colorOn;
    backgroundCheck.value = backgroundOn;
    namesCheck.value = namesOn;
    syncEnabled();

    for (var kr = 0; kr < kindRadios.length; kr++) {
        kindRadios[kr].onClick = (function(index) {
            return function() { kind = index; syncEnabled(); updatePreview(); };
        })(kr);
    }
    colorCheck.onClick = function() { colorOn = colorCheck.value; syncEnabled(); updatePreview(); };
    backgroundCheck.onClick = function() { backgroundOn = backgroundCheck.value; updatePreview(); };
    namesCheck.onClick = function() { namesOn = namesCheck.value; updatePreview(); };
    bindValueRow(diameterRow, function() { return diameterMm; }, function(v) { diameterMm = v; });
    bindValueRow(spacingRow, function() { return spacing; }, function(v) { spacing = v; });
    bindValueRow(sideRow, function() { return sideMm; }, function(v) { sideMm = v; });
    bindValueRow(incidenceRow, function() { return incidence; }, function(v) { incidence = v; });
    bindValueRow(spreadRow, function() { return spread; }, function(v) { spread = v; });
    bindValueRow(rayRow, function() { return rayMm; }, function(v) { rayMm = v; });
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
        setRowEnabled(diameterRow, kind === 0);
        setRowEnabled(spacingRow, kind === 0);
        setRowEnabled(sideRow, kind === 1);
        setRowEnabled(incidenceRow, kind === 1);
        setRowEnabled(spreadRow, kind === 1);
        setRowEnabled(rayRow, kind === 1);
        backgroundCheck.enabled = kind === 0 && colorOn;
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
        previewGroup = layer.groupItems.add();
        previewGroup.name = "빛의 합성 (" + KINDS[kind] + ")";
        if (kind === 0) {
            drawPrimaries(diameterMm * MM / 2);
        } else {
            drawPrism(sideMm * MM);
        }
        previewGroup.translate(viewCenter[0] + offsetXmm * MM, viewCenter[1] + offsetYmm * MM);
    }

    function drawPrimaries(r) {
        var centers = primaryCenters(r, spacing / 100);
        if (backgroundOn && colorOn) {
            var margin = r * 0.25;
            var extent = circlesBounds(centers, r);
            var back = previewGroup.pathItems.rectangle(extent[1] + margin, extent[0] - margin,
                extent[2] - extent[0] + margin * 2, extent[1] - extent[3] + margin * 2);
            back.stroked = false;
            back.filled = true;
            back.fillColor = makeGray(100);
            back.name = "배경";
        }
        if (colorOn) {
            for (var i = 0; i < 3; i++) addDisc(previewGroup, centers[i], r, REGIONS[i]).name = REGIONS[i].name;
            // 두 빛이 겹친 곳: 첫 원을 둘째 원으로 클리핑
            var pairs = [[0, 1, 3], [1, 2, 4], [0, 2, 5]];
            for (var p = 0; p < pairs.length; p++) {
                var clip = previewGroup.groupItems.add();
                clip.name = REGIONS[pairs[p][2]].name;
                addDisc(clip, centers[pairs[p][0]], r, REGIONS[pairs[p][2]]);
                addDisc(clip, centers[pairs[p][1]], r, null);
                clip.clipped = true;
            }
            // 셋이 겹친 곳: (빨간 원을 초록 원으로 클리핑)을 다시 파란 원으로 클리핑
            var outer = previewGroup.groupItems.add();
            outer.name = REGIONS[6].name;
            var inner = outer.groupItems.add();
            addDisc(inner, centers[0], r, REGIONS[6]);
            addDisc(inner, centers[1], r, null);
            inner.clipped = true;
            addDisc(outer, centers[2], r, null);
            outer.clipped = true;
        }
        if (!colorOn) {
            for (var j = 0; j < 3; j++) {
                var ring = addDisc(previewGroup, centers[j], r, null);
                ring.stroked = true;
                ring.strokeColor = makeGray(100);
                ring.strokeWidth = LINE_WIDTH_PT;
                ring.name = "테두리";
            }
        }
        if (!namesOn) return;
        for (var n = 0; n < REGIONS.length; n++) {
            var spot = regionPoint(centers, r, REGIONS[n].inside);
            var text = addText(REGIONS[n].name, spot[0], spot[1]);
            // 색을 칠했을 때 어두운 파란 면 위 글자만 흰색
            if (colorOn && n === 2) text.textRange.characterAttributes.fillColor = makeGray(0);
        }
    }

    function drawPrism(side) {
        var rays = prismRays(side, incidence, PRISM_INDEX, spread, SPECTRUM.length, rayMm * MM);
        var prism = previewGroup.pathItems.add();
        prism.setEntirePath(prismVertices(side));
        prism.closed = true;
        prism.filled = true;
        prism.fillColor = makeGray(8);
        prism.stroked = true;
        prism.strokeColor = makeGray(100);
        prism.strokeWidth = LINE_WIDTH_PT;
        prism.name = "프리즘";
        if (rays === null) return;
        addRay(rays.incoming, makeGray(100), "백색광");
        addRay(rays.inside, makeGray(100), "프리즘 속 빛");
        for (var i = 0; i < rays.out.length; i++) {
            addRay(rays.out[i], colorOn ? makeColor(SPECTRUM[i]) : makeGray(100), SPECTRUM[i].name);
        }
        if (!namesOn) return;
        var start = rays.incoming[0];
        addText("백색광", start[0], start[1] + fontPt);
        var gap = fontPt * 2.2;
        for (var e = 0; e < rays.out.length; e += rays.out.length - 1) {
            var end = rays.out[e][1];
            var dx = end[0] - rays.out[e][0][0], dy = end[1] - rays.out[e][0][1];
            var length = Math.sqrt(dx * dx + dy * dy);
            addText(SPECTRUM[e].name, end[0] + dx / length * gap, end[1] + dy / length * gap);
        }
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
    // 기하 (순수 계산, 가운데 (0, 0) 기준)
    // -------------------------------------------------------
    // 빨(위)·초(왼쪽 아래)·파(오른쪽 아래) 원 중심. 중심 사이 거리 = 지름 × ratio, 무게중심이 원점
    function primaryCenters(r, ratio) {
        var d = 2 * r * ratio;
        var h = d / Math.sqrt(3);
        return [[0, h], [-d / 2, -h / 2], [d / 2, -h / 2]];
    }

    function circlesBounds(centers, r) {
        var b = [Infinity, -Infinity, -Infinity, Infinity];
        for (var i = 0; i < centers.length; i++) {
            b[0] = Math.min(b[0], centers[i][0] - r);
            b[1] = Math.max(b[1], centers[i][1] + r);
            b[2] = Math.max(b[2], centers[i][0] + r);
            b[3] = Math.min(b[3], centers[i][1] - r);
        }
        return b;
    }

    // 원 안팎 조건이 inside와 같은 영역에서 경계(원 둘레)와 가장 먼 격자점
    function regionPoint(centers, r, inside) {
        var b = circlesBounds(centers, r);
        var steps = 60;
        var best = null, bestDistance = -1;
        for (var i = 0; i <= steps; i++) {
            for (var j = 0; j <= steps; j++) {
                var x = b[0] + (b[2] - b[0]) * i / steps;
                var y = b[3] + (b[1] - b[3]) * j / steps;
                var distance = Infinity, ok = true;
                for (var c = 0; c < centers.length; c++) {
                    var dx = x - centers[c][0], dy = y - centers[c][1];
                    var gap = r - Math.sqrt(dx * dx + dy * dy);
                    if ((gap > 0) !== inside[c]) { ok = false; break; }
                    distance = Math.min(distance, Math.abs(gap));
                }
                if (ok && distance > bestDistance) {
                    bestDistance = distance;
                    best = [x, y];
                }
            }
        }
        return best === null ? [0, 0] : best;
    }

    // 꼭짓점이 위인 정삼각형: 위, 왼쪽 아래, 오른쪽 아래. 무게중심이 원점
    function prismVertices(side) {
        var h = side * Math.sqrt(3) / 2;
        return [[0, h * 2 / 3], [-side / 2, -h / 3], [side / 2, -h / 3]];
    }

    // 스넬 법칙 (벡터). normal은 들어오는 쪽을 향한 단위 법선, eta = n1 / n2. 전반사면 null
    function refract(dir, normal, eta) {
        var cosI = -(dir[0] * normal[0] + dir[1] * normal[1]);
        var k = 1 - eta * eta * (1 - cosI * cosI);
        if (k < 0) return null;
        var f = eta * cosI - Math.sqrt(k);
        return [eta * dir[0] + f * normal[0], eta * dir[1] + f * normal[1]];
    }

    function rotate(v, degrees) {
        var a = degrees * Math.PI / 180;
        return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    }

    // 백색광이 왼쪽 면 가운데로 들어와 오른쪽 면에서 나간다. 나오는 빛은 빨간색 방향에서 시계 방향으로
    // 퍼짐 × i / (개수 − 1)씩 더 꺾인다 (보라색이 가장 많이). 빛이 오른쪽 면에 닿지 않거나 전반사면 null
    function prismRays(side, incidenceDeg, index, spreadDeg, count, length) {
        var v = prismVertices(side);
        var entry = [(v[0][0] + v[1][0]) / 2, (v[0][1] + v[1][1]) / 2];
        var leftOut = [-Math.sqrt(3) / 2, 0.5];
        var rightIn = [-Math.sqrt(3) / 2, -0.5];
        var dir = rotate([-leftOut[0], -leftOut[1]], incidenceDeg);
        var inside = refract(dir, leftOut, 1 / index);
        if (inside === null) return null;
        // 오른쪽 면(위 꼭짓점 → 오른쪽 아래)과 만나는 점
        var ex = v[2][0] - v[0][0], ey = v[2][1] - v[0][1];
        var det = inside[0] * (-ey) - inside[1] * (-ex);
        if (Math.abs(det) < 1e-12) return null;
        var rx = v[0][0] - entry[0], ry = v[0][1] - entry[1];
        var t = (rx * (-ey) - ry * (-ex)) / det;
        var s = (inside[0] * ry - inside[1] * rx) / det;
        if (t <= 0 || s < 0 || s > 1) return null;
        var exit = [entry[0] + inside[0] * t, entry[1] + inside[1] * t];
        var out = refract(inside, rightIn, index);
        if (out === null) return null;
        var rays = {incoming: [[entry[0] - dir[0] * length, entry[1] - dir[1] * length], entry], inside: [entry, exit], out: []};
        for (var i = 0; i < count; i++) {
            var d = rotate(out, count > 1 ? -spreadDeg * i / (count - 1) : 0);
            rays.out.push([exit, [exit[0] + d[0] * length, exit[1] + d[1] * length]]);
        }
        return rays;
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    // region이 null이면 칠·선 없는 원 (클리핑 마스크용)
    function addDisc(container, center, r, region) {
        var disc = container.pathItems.ellipse(center[1] + r, center[0] - r, r * 2, r * 2);
        disc.stroked = false;
        disc.filled = region !== null;
        if (region !== null) disc.fillColor = makeColor(region);
        return disc;
    }

    function addRay(points, color, name) {
        var ray = previewGroup.pathItems.add();
        ray.setEntirePath(points);
        ray.filled = false;
        ray.stroked = true;
        ray.strokeColor = color;
        ray.strokeWidth = RAY_WIDTH_PT;
        ray.name = name;
        return ray;
    }

    // 가운데가 (x, y)인 글자
    function addText(text, x, y) {
        var frame = previewGroup.textFrames.add();
        frame.contents = text;
        frame.textRange.characterAttributes.size = fontPt;
        frame.textRange.characterAttributes.fillColor = makeGray(100);
        applyTextFonts(frame);
        var b = frame.geometricBounds;
        frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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

    // 문서 색상 모드에 맞춰 {cmyk, rgb}에서 색을 만든다
    function makeColor(spec) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = spec.cmyk[0];
            cmyk.magenta = spec.cmyk[1];
            cmyk.yellow = spec.cmyk[2];
            cmyk.black = spec.cmyk[3];
            return cmyk;
        }
        var rgb = new RGBColor();
        rgb.red = spec.rgb[0];
        rgb.green = spec.rgb[1];
        rgb.blue = spec.rgb[2];
        return rgb;
    }

    // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
    function makeGray(k) {
        var value = Math.round(255 * (1 - k / 100));
        return makeColor({cmyk: [0, 0, 0, k], rgb: [value, value, value]});
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
        var parts = ["v1", kind, diameterMm, spacing, sideMm, incidence, spread, rayMm,
            colorOn ? "1" : "0", backgroundOn ? "1" : "0", namesOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 15) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        diameterMm = restoreNumber(p[2], diameterMm, DIAMETER_RANGE, 1);
        spacing = restoreNumber(p[3], spacing, SPACING_RANGE, 1);
        sideMm = restoreNumber(p[4], sideMm, SIDE_RANGE, 1);
        incidence = restoreNumber(p[5], incidence, INCIDENCE_RANGE, 1);
        spread = restoreNumber(p[6], spread, SPREAD_RANGE, 0.5);
        rayMm = restoreNumber(p[7], rayMm, RAY_RANGE, 1);
        colorOn = p[8] === "1";
        backgroundOn = p[9] === "1";
        namesOn = p[10] === "1";
        fontPt = restoreNumber(p[11], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[12], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[13], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[14] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
