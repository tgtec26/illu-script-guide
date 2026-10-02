// Object_SaturatedVapor.jsx
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

// 포화 수증기량 곡선 그래프를 그린다.
// 사각형을 선택하고 실행하면 그 사각형의 왼쪽 위 모서리와 크기를 그래프 영역으로 쓰고(사각형은 확인 때 지운다),
// 선택이 없으면 대지 가운데에 기본 크기로 그린다.
// X축은 기온 0~35 ℃(눈금 5 간격), Y축은 수증기량 0~40 g/kg(눈금 10 간격).
// 곡선 값: 물의 포화 증기압 es(T)는 Wagner & Pruss (2002, J. Phys. Chem. Ref. Data 31, 387) 식으로 구한다.
//   이 식은 CRC Handbook (85판) 포화 증기압 표와 0.05 % 안에서 맞는다 (0 ℃ 0.6113 kPa, 25 ℃ 3.1690 kPa, 35 ℃ 5.6267 kPa).
//   포화 수증기량 w = 0.622·es/(P - es) (마른 공기 1 kg에 섞인 수증기의 g 수), P = 1기압 101.325 kPa.
//   5 ℃ 5.40, 15 ℃ 10.65, 25 ℃ 20.09, 35 ℃ 36.59 g/kg (교과서 그림은 5.4, 10.6, 20.0).
// 곡선은 0.5 ℃ 간격으로 계산한 점을 오차 CURVE_TOLERANCE_MM 안에서 마디 몇 개짜리 베지어 곡선으로 근사한 것이다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "SaturatedVapor/settings";
    var MM_TO_PT = 2.834645669;
    var SIZE_MIN_MM = 30;
    var SIZE_MAX_MM = 250;
    var POSITION_LIMIT_MM = 300;
    var LABEL_WIDTH = 70;
    var INPUT_WIDTH = 50;
    var SLIDER_WIDTH = 196;

    var AXIS_PT = 0.4;
    var TICK_PT = 0.4;
    var TICK_MM = 1;
    var GRID_PT = 0.3;
    var GRID_DASH = [2, 1];
    var CURVE_PT = 0.8;
    var FONT_PT = 8;
    var ENG_BASELINE_PT = 0.5;
    var TEXT_GAP_MM = 1;
    var AXIS_TITLE_GAP_MM = 1;
    var X_MAX = 35;
    var Y_MAX = 40;
    var X_STEP = 5;
    var Y_STEP = 10;
    var SAMPLE_STEP = 0.5;
    var CURVE_TOLERANCE_MM = 0.3;
    var PRESSURE_KPA = 101.325;
    var EPSILON = 0.622;
    var WP_TC = 647.096;
    var WP_PC = 22064;
    var WP_A = [-7.85951783, 1.84408259, -11.7866497, 22.6807411, -15.9618719, 1.80122502];
    // ° 는 GSMediumB1의 U+02D8 글리프로 넣는다
    var X_TITLE = "기온(˘C)";
    var Y_TITLE = "수증기량(g/kg)";

    var doc = app.activeDocument;
    var grayK100 = makeGray(100);
    var grayK80 = makeGray(80);
    var korFont = findTextFont(["SpoqaHanSansNeo-Regular"]);
    var engFont = findTextFont(["GSMediumB1"]);

    var curvePoints = [];
    for (var s = 0; s <= X_MAX; s += SAMPLE_STEP) {
        curvePoints.push([s, saturationMixingRatio(s)]);
    }

    // 선택된 사각형이 있으면 그래프 영역으로 쓴다
    var rect = null;
    for (var q = 0; q < doc.selection.length; q++) {
        if (doc.selection[q].typename === "PathItem" && doc.selection[q].closed) {
            rect = doc.selection[q];
            break;
        }
    }
    var rectHidden = rect ? rect.hidden : false;

    // 다이얼로그가 다루는 옵션 값
    var widthMm = 100;
    var heightMm = 70;
    var gridOn = false;
    var tickOutside = false;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;

    applySettings();

    // 그래프 왼쪽 위 기준점(pt). 사각형이 있으면 사각형 모서리, 없으면 대지 가운데에서 기본 크기로
    var originLeft, originTop;
    if (rect !== null) {
        var rb = rect.geometricBounds;
        originLeft = rb[0];
        originTop = rb[1];
        widthMm = clamp(Math.round((rb[2] - rb[0]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM);
        heightMm = clamp(Math.round((rb[1] - rb[3]) / MM_TO_PT), SIZE_MIN_MM, SIZE_MAX_MM);
    } else {
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
        originLeft = (ab[0] + ab[2]) / 2 - widthMm * MM_TO_PT / 2;
        originTop = (ab[1] + ab[3]) / 2 + heightMm * MM_TO_PT / 2;
    }

    var previewGroup = null;

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "포화 수증기량 곡선");
    dlg.alignChildren = "fill";

    var sizePanel = addPanel(dlg, "크기");
    var widthControls = addValueRow(sizePanel, "너비", "mm", widthMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);
    var heightControls = addValueRow(sizePanel, "높이", "mm", heightMm, SIZE_MIN_MM, SIZE_MAX_MM, 1, 0);

    var gridPanel = addPanel(dlg, "보조선·눈금");
    var gridCheck = gridPanel.add("checkbox", undefined, "파선 보조선 (끄면 축에 눈금)");
    var tickGroup = gridPanel.add("group");
    tickGroup.add("statictext", undefined, "눈금 위치:");
    var tickInRadio = tickGroup.add("radiobutton", undefined, "안쪽");
    var tickOutRadio = tickGroup.add("radiobutton", undefined, "바깥쪽");

    var positionPanel = addPanel(dlg, "위치");
    var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
    var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { dlg.defaultElement = null; } catch (defaultError) {}
    footer.add("button", undefined, "취소", { name: "cancel" });

    // 저장된 값을 화면에 반영
    gridCheck.value = gridOn;
    tickInRadio.value = !tickOutside;
    tickOutRadio.value = tickOutside;
    tickGroup.enabled = !gridOn;
    previewCheck.value = previewEnabled;
    setRowValue(widthControls, widthMm);
    setRowValue(heightControls, heightMm);
    setRowValue(offsetXControls, offsetXmm);
    setRowValue(offsetYControls, offsetYmm);

    gridCheck.onClick = function() {
        gridOn = gridCheck.value;
        tickGroup.enabled = !gridOn;
        updatePreview();
    };
    tickInRadio.onClick = tickOutRadio.onClick = function() {
        tickOutside = tickOutRadio.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };

    // 크기는 다시 그리고, 위치는 미리보기 그룹만 옮긴다
    bindSizeRow(widthControls, function(v) { widthMm = v; });
    bindSizeRow(heightControls, function(v) { heightMm = v; });
    bindPositionRow(offsetXControls, function() { return offsetXmm; },
        function(v) { offsetXmm = v; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; },
        function(v) { offsetYmm = v; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) {
            setOriginalHidden(true);
            buildPreview();
        }
        if (rect !== null) {
            try { rect.remove(); } catch (removeError) {}
        }
        saveSettings();
        doc.selection = null;
        try { previewGroup.selected = true; } catch (selectError) {}
        dlg.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    if (dlg.show() !== 1) {
        clearPreview();
        restoreOriginal();
        app.redraw();
    }

    // -------------------------------------------------------
    // 미리보기
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (previewEnabled) {
            setOriginalHidden(true);
            buildPreview();
        } else {
            restoreOriginal();
        }
        app.redraw();
    }

    function buildPreview() {
        previewGroup = buildGraph();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
        }
        previewGroup = null;
    }

    function movePreview(deltaX, deltaY) {
        if (previewGroup !== null) moveItem(previewGroup, deltaX, deltaY);
    }

    function moveItem(item, deltaX, deltaY) {
        if (deltaX === 0 && deltaY === 0) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    function setOriginalHidden(hidden) {
        if (rect !== null) try { rect.hidden = hidden; } catch (e) {}
    }

    function restoreOriginal() {
        if (rect !== null) try { rect.hidden = rectHidden; } catch (e) {}
    }

    // -------------------------------------------------------
    // 그래프 그리기
    // -------------------------------------------------------
    function buildGraph() {
        var group = findEditableLayer().groupItems.add();
        group.name = "포화 수증기량 곡선";

        var width = widthMm * MM_TO_PT;
        var height = heightMm * MM_TO_PT;
        var left = originLeft;
        var bottom = originTop - height;
        var right = left + width;
        var top = originTop;
        function px(t) { return left + t / X_MAX * width; }
        function py(v) { return bottom + v / Y_MAX * height; }

        var tick = TICK_MM * MM_TO_PT;
        var textGap = TEXT_GAP_MM * MM_TO_PT;
        var tickDirection = tickOutside ? -1 : 1;
        var labelGap = textGap + (!gridOn && tickOutside ? tick : 0);

        // 보조선은 맨 아래에 깔린다 (축 끝 값의 선이 위·오른쪽 테두리를 겸한다)
        if (gridOn) {
            for (var gx = X_STEP; gx <= X_MAX; gx += X_STEP) {
                addLine(group, px(gx), bottom, px(gx), top, GRID_PT, grayK80, GRID_DASH);
            }
            for (var gy = Y_STEP; gy <= Y_MAX; gy += Y_STEP) {
                addLine(group, left, py(gy), right, py(gy), GRID_PT, grayK80, GRID_DASH);
            }
        }

        // 곡선
        var points = [];
        for (var n = 0; n < curvePoints.length; n++) {
            points.push([px(curvePoints[n][0]), py(curvePoints[n][1])]);
        }
        var curve = group.pathItems.add();
        setBezierPath(curve, fitBezier(points, CURVE_TOLERANCE_MM * MM_TO_PT));
        styleStroke(curve, CURVE_PT, grayK100, null);

        addLine(group, left, bottom, right, bottom, AXIS_PT, grayK100, null);
        addLine(group, left, bottom, left, top, AXIS_PT, grayK100, null);

        // 눈금과 눈금 숫자: X는 축 아래, Y는 축 왼쪽
        var labelsBottom = bottom - labelGap;
        var labelsLeft = left - labelGap;
        for (var vx = 0; vx <= X_MAX; vx += X_STEP) {
            if (!gridOn) addLine(group, px(vx), bottom, px(vx), bottom + tick * tickDirection, TICK_PT, grayK100, null);
            var xLabel = addText(group, String(vx));
            var xb = xLabel.geometricBounds;
            xLabel.translate(px(vx) - (xb[0] + xb[2]) / 2, bottom - labelGap - xb[1]);
            labelsBottom = Math.min(labelsBottom, xLabel.geometricBounds[3]);
        }
        for (var vy = 0; vy <= Y_MAX; vy += Y_STEP) {
            if (!gridOn) addLine(group, left, py(vy), left + tick * tickDirection, py(vy), TICK_PT, grayK100, null);
            var yLabel = addText(group, String(vy));
            var yb = yLabel.geometricBounds;
            yLabel.translate(left - labelGap - yb[2], py(vy) - (yb[1] + yb[3]) / 2);
            labelsLeft = Math.min(labelsLeft, yLabel.geometricBounds[0]);
        }

        // 축 제목: X는 숫자 아래 가운데, Y는 숫자 왼쪽에 세로로
        var titleGap = AXIS_TITLE_GAP_MM * MM_TO_PT;
        var xTitle = addText(group, X_TITLE);
        var xtb = xTitle.geometricBounds;
        xTitle.translate((left + right) / 2 - (xtb[0] + xtb[2]) / 2, labelsBottom - titleGap - xtb[1]);
        var yTitle = addText(group, Y_TITLE);
        yTitle.rotate(90);
        var ytb = yTitle.geometricBounds;
        yTitle.translate(labelsLeft - titleGap - ytb[2], (bottom + top) / 2 - (ytb[1] + ytb[3]) / 2);
        return group;
    }

    function addLine(group, x1, y1, x2, y2, width, color, dashes) {
        var path = group.pathItems.add();
        path.setEntirePath([[x1, y1], [x2, y2]]);
        styleStroke(path, width, color, dashes);
        return path;
    }

    // 기온 celsius(℃)의 포화 수증기량(g/kg). 코드 맨 위 주석 참고
    function saturationMixingRatio(celsius) {
        var kelvin = celsius + 273.15;
        var theta = 1 - kelvin / WP_TC;
        var series = WP_A[0] * theta + WP_A[1] * Math.pow(theta, 1.5) + WP_A[2] * Math.pow(theta, 3)
            + WP_A[3] * Math.pow(theta, 3.5) + WP_A[4] * Math.pow(theta, 4) + WP_A[5] * Math.pow(theta, 7.5);
        var vapor = WP_PC * Math.exp(WP_TC / kelvin * series);
        return 1000 * EPSILON * vapor / (PRESSURE_KPA - vapor);
    }

    // 점 목록에 가장 가까운 베지어 곡선 마디들로 바꾼다 (Schneider 알고리즘, Graphics Gems "FitCurves").
    // 허용 오차(pt) 안에서 마디(앵커)가 가장 적게 나오도록 오차가 큰 곳에서 나눈다
    function setBezierPath(path, segments) {
        var anchors = [segments[0][0]];
        for (var i = 0; i < segments.length; i++) anchors.push(segments[i][3]);
        path.setEntirePath(anchors);
        for (var j = 0; j < segments.length; j++) {
            path.pathPoints[j].rightDirection = segments[j][1];
            path.pathPoints[j + 1].leftDirection = segments[j][2];
        }
    }

    function fitBezier(points, tolerance) {
        var n = points.length;
        var segments = [];
        fitCubic(points, 0, n - 1, vUnit(vSub(points[1], points[0])), vUnit(vSub(points[n - 2], points[n - 1])),
            tolerance * tolerance, segments);
        return segments;
    }

    function fitCubic(pts, first, last, tan1, tan2, errorSq, out) {
        if (last - first === 1) {
            var gap = vLen(vSub(pts[last], pts[first])) / 3;
            out.push([pts[first], vAdd(pts[first], vMul(tan1, gap)), vAdd(pts[last], vMul(tan2, gap)), pts[last]]);
            return;
        }
        var u = chordParameters(pts, first, last);
        var bezier = generateBezier(pts, first, last, u, tan1, tan2);
        var result = maxFitError(pts, first, last, bezier, u);
        if (result.error < errorSq) {
            out.push(bezier);
            return;
        }
        if (result.error < errorSq * 4) {
            for (var pass = 0; pass < 4; pass++) {
                u = reparameterize(pts, first, last, u, bezier);
                bezier = generateBezier(pts, first, last, u, tan1, tan2);
                result = maxFitError(pts, first, last, bezier, u);
                if (result.error < errorSq) {
                    out.push(bezier);
                    return;
                }
            }
        }
        var center = vUnit(vSub(pts[result.split - 1], pts[result.split + 1]));
        fitCubic(pts, first, result.split, tan1, center, errorSq, out);
        fitCubic(pts, result.split, last, vMul(center, -1), tan2, errorSq, out);
    }

    function generateBezier(pts, first, last, u, tan1, tan2) {
        var p0 = pts[first], p3 = pts[last];
        var c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
        for (var i = 0; i <= last - first; i++) {
            var t = u[i], m = 1 - t;
            var b1 = m * m * m, b2 = 3 * t * m * m, b3 = 3 * t * t * m, b4 = t * t * t;
            var a1 = vMul(tan1, b2), a2 = vMul(tan2, b3);
            c00 += vDot(a1, a1);
            c01 += vDot(a1, a2);
            c11 += vDot(a2, a2);
            var rest = vSub(pts[first + i], vAdd(vMul(p0, b1 + b2), vMul(p3, b3 + b4)));
            x0 += vDot(a1, rest);
            x1 += vDot(a2, rest);
        }
        var det = c00 * c11 - c01 * c01;
        var alpha1 = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det;
        var alpha2 = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
        var segment = vLen(vSub(p3, p0));
        if (alpha1 < 1e-6 * segment || alpha2 < 1e-6 * segment) alpha1 = alpha2 = segment / 3;
        return [p0, vAdd(p0, vMul(tan1, alpha1)), vAdd(p3, vMul(tan2, alpha2)), p3];
    }

    function bezierAt(b, t) {
        var m = 1 - t;
        return vAdd(vAdd(vMul(b[0], m * m * m), vMul(b[1], 3 * t * m * m)),
            vAdd(vMul(b[2], 3 * t * t * m), vMul(b[3], t * t * t)));
    }

    function maxFitError(pts, first, last, bezier, u) {
        var worst = 0;
        var split = Math.floor((last - first + 1) / 2) + first;
        for (var i = first + 1; i < last; i++) {
            var d = vSub(bezierAt(bezier, u[i - first]), pts[i]);
            var distSq = vDot(d, d);
            if (distSq >= worst) {
                worst = distSq;
                split = i;
            }
        }
        return { error: worst, split: split };
    }

    function chordParameters(pts, first, last) {
        var u = [0];
        for (var i = first + 1; i <= last; i++) u.push(u[i - first - 1] + vLen(vSub(pts[i], pts[i - 1])));
        for (var j = 1; j <= last - first; j++) u[j] = u[j] / u[last - first];
        return u;
    }

    // 뉴턴-랩슨으로 점마다 곡선 위 가장 가까운 매개변수를 다시 찾는다
    function reparameterize(pts, first, last, u, bezier) {
        var next = [];
        var d1 = [], d2 = [];
        for (var k = 0; k < 3; k++) d1.push(vMul(vSub(bezier[k + 1], bezier[k]), 3));
        for (var l = 0; l < 2; l++) d2.push(vMul(vSub(d1[l + 1], d1[l]), 2));
        for (var i = 0; i <= last - first; i++) {
            var t = u[i], m = 1 - t;
            var diff = vSub(bezierAt(bezier, t), pts[first + i]);
            var slope = vAdd(vAdd(vMul(d1[0], m * m), vMul(d1[1], 2 * m * t)), vMul(d1[2], t * t));
            var curve = vAdd(vMul(d2[0], m), vMul(d2[1], t));
            var denominator = vDot(slope, slope) + vDot(diff, curve);
            next.push(denominator === 0 ? t : t - vDot(diff, slope) / denominator);
        }
        return next;
    }

    function vAdd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function vSub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function vMul(a, k) { return [a[0] * k, a[1] * k]; }
    function vDot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    function vLen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
    function vUnit(a) { var l = vLen(a); return [a[0] / l, a[1] / l]; }

    function styleStroke(path, width, color, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeWidth = width;
        path.strokeColor = color;
        path.strokeCap = StrokeCap.BUTTENDCAP;
        path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        path.strokeDashes = dashes ? dashes : [];
    }

    // -------------------------------------------------------
    // 글자 (서체 규칙: 한글·공백 Spoqa, 영문·숫자·기호 GSMediumB1 +0.5pt)
    // -------------------------------------------------------
    function addText(group, text) {
        var frame = group.textFrames.add();
        frame.contents = text;
        var base = frame.textRange.characterAttributes;
        base.size = FONT_PT;
        base.fillColor = grayK100;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = frame.textRange.characters[i].characterAttributes;
            if (isKoreanOrSpace(code)) {
                attributes.textFont = korFont;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = engFont;
                attributes.baselineShift = ENG_BASELINE_PT;
            }
        }
        return frame;
    }

    function isKoreanOrSpace(code) {
        return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
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
        input.preferredSize.width = INPUT_WIDTH;
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;
        return {
            input: input, slider: slider,
            min: minimum, max: maximum, step: step, decimals: decimals
        };
    }

    function setRowValue(controls, value) {
        value = clamp(roundTo(value, controls.step), controls.min, controls.max);
        controls.input.text = formatNumber(value, controls.decimals);
        try { controls.slider.value = value; } catch (e) {}
    }

    function bindSizeRow(controls, setter) {
        var current = parseNumber(controls.input.text);
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            controls.input.text = formatNumber(value, controls.decimals);
            try { controls.slider.value = value; } catch (e) {}
            if (value === current) return;
            current = value;
            setter(value);
            updatePreview();
        }
        controls.slider.onChanging = function() { commit(controls.slider.value); };
        controls.slider.onChange = function() { commit(controls.slider.value); };
        controls.input.onChange = function() {
            var value = parseNumber(controls.input.text);
            commit(value === null ? current : value);
        };
    }

    function bindPositionRow(controls, getter, setter, isX) {
        function commit(value) {
            value = clamp(roundTo(value, controls.step), controls.min, controls.max);
            var delta = (value - getter()) * MM_TO_PT;
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
    // 설정 저장 · 복원 (사각형을 선택했으면 크기는 사각형을 따른다)
    // -------------------------------------------------------
    function saveSettings() {
        var parts = [
            "v1",
            widthMm,
            heightMm,
            gridOn ? "1" : "0",
            tickOutside ? "1" : "0",
            offsetXmm,
            offsetYmm,
            previewEnabled ? "1" : "0"
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 8) return;
        widthMm = restoreNumber(p[1], widthMm, SIZE_MIN_MM, SIZE_MAX_MM);
        heightMm = restoreNumber(p[2], heightMm, SIZE_MIN_MM, SIZE_MAX_MM);
        gridOn = (p[3] === "1");
        tickOutside = (p[4] === "1");
        offsetXmm = restoreNumber(p[5], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[6], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        previewEnabled = (p[7] === "1");
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(value, minimum, maximum);
    }
})();
