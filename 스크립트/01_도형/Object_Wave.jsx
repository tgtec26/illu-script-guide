// Object_Wave.jsx
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

// 파동: 화면 가운데에 파동 모식도를 그린다.
//   - 횡파: y = 진폭 × sin(2πx / 파장) 곡선. 마루·골 글자, 진폭(기준선 → 마루)·파장(마루 → 마루) 치수선을 넣는다.
//   - 종파: 세로선을 고르게 놓은 뒤 x0 − (밀도 차 / k) × sin(k x0)만큼 옮겨 밀(촘촘)·소(성김)를 만든다.
//     밀은 x = n × 파장, 소는 그 사이 반 파장 자리. 파장 치수선은 밀 → 밀.
//   - 소리 비교: 같은 크기의 파형을 2~3개 위아래로 놓는다. 크기는 진폭만, 높낮이는 진동수만(1·2·3배), 음색은
//     파형 모양(배음 섞기)만 다르다. 파형마다 기준선과 (가) (나) (다)를 붙인다.
//   - 진행 방향 화살표는 파형 오른쪽 위. 화살촉은 모두 채운 삼각형이다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectWave/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.3;
    var WAVE_WIDTH_PT = 0.5;
    var GUIDE_DASH = [2, 1.5];
    var HEAD_LENGTH = 1.6 * MM;
    var HEAD_WIDTH = 1.1 * MM;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var KINDS = ["횡파", "종파", "소리 비교"];
    var COMPARES = ["크기", "높낮이", "음색"];
    var PANEL_LABELS = ["(가)", "(나)", "(다)"];
    // 음색: 기본음과 배음(차수, 세기). 최댓값을 진폭에 맞춰 다시 늘린다
    var TIMBRES = [[[1, 1]], [[1, 1], [2, 0.5]], [[1, 1], [3, 0.45], [5, 0.25]]];
    var LABEL_WIDTH = 100;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var POSITION_LIMIT_MM = 100;
    var WIDTH_RANGE = [20, 200];
    var AMPLITUDE_RANGE = [1, 50];
    var WAVELENGTH_RANGE = [5, 150];
    var LINES_RANGE = [10, 120];
    var DENSITY_RANGE = [0, 90];
    var PANELS_RANGE = [2, 3];
    var FONT_RANGE = [5, 20];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
    var batangFont = findOptionalFont("Batang");
    var ENG_BASELINE_PT = 0.5;

    // 옵션
    var kind = 0;
    var widthMm = 100;
    var amplitudeMm = 10;
    var wavelengthMm = 40;
    var lineCount = 40;
    var density = 60;
    var compare = 0;
    var panelCount = 3;
    var crestOn = true;
    var amplitudeOn = true;
    var wavelengthOn = true;
    var directionOn = true;
    var axisOn = true;
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
    var dlg = new Window("dialog", "파동");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var shapePanel = addPanel(dlg, "모양");
    var kindRow = shapePanel.add("group");
    kindRow.add("statictext", undefined, "종류:").preferredSize.width = LABEL_WIDTH;
    var kindRadios = [];
    for (var k = 0; k < KINDS.length; k++) kindRadios.push(kindRow.add("radiobutton", undefined, KINDS[k]));
    var widthRow = addValueRow(shapePanel, "너비", "mm", widthMm, WIDTH_RANGE[0], WIDTH_RANGE[1], 1, 0);
    var amplitudeRow = addValueRow(shapePanel, "진폭", "mm", amplitudeMm, AMPLITUDE_RANGE[0], AMPLITUDE_RANGE[1], 0.5, 1);
    amplitudeRow.input.helpTip = "종파에서는 세로선 길이의 절반";
    var wavelengthRow = addValueRow(shapePanel, "파장", "mm", wavelengthMm, WAVELENGTH_RANGE[0], WAVELENGTH_RANGE[1], 1, 0);
    var linesRow = addValueRow(shapePanel, "선 수", "개", lineCount, LINES_RANGE[0], LINES_RANGE[1], 1, 0);
    var densityRow = addValueRow(shapePanel, "밀도 차", "%", density, DENSITY_RANGE[0], DENSITY_RANGE[1], 5, 0);
    densityRow.input.helpTip = "0이면 고른 간격, 클수록 밀·소 차이가 커진다";
    var compareRow = shapePanel.add("group");
    compareRow.add("statictext", undefined, "비교:").preferredSize.width = LABEL_WIDTH;
    var compareRadios = [];
    for (var c = 0; c < COMPARES.length; c++) compareRadios.push(compareRow.add("radiobutton", undefined, COMPARES[c]));
    var panelsRow = addValueRow(shapePanel, "파형 수", "개", panelCount, PANELS_RANGE[0], PANELS_RANGE[1], 1, 0);

    var markPanel = addPanel(dlg, "표시");
    var checkRow1 = markPanel.add("group");
    var crestCheck = checkRow1.add("checkbox", undefined, "마루·골 / 밀·소");
    var amplitudeCheck = checkRow1.add("checkbox", undefined, "진폭");
    var wavelengthCheck = checkRow1.add("checkbox", undefined, "파장");
    var checkRow2 = markPanel.add("group");
    var directionCheck = checkRow2.add("checkbox", undefined, "진행 방향");
    var axisCheck = checkRow2.add("checkbox", undefined, "기준선");
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
    compareRadios[compare].value = true;
    crestCheck.value = crestOn;
    amplitudeCheck.value = amplitudeOn;
    wavelengthCheck.value = wavelengthOn;
    directionCheck.value = directionOn;
    axisCheck.value = axisOn;
    syncEnabled();

    for (var kr = 0; kr < kindRadios.length; kr++) {
        kindRadios[kr].onClick = (function(index) {
            return function() { kind = index; syncEnabled(); updatePreview(); };
        })(kr);
    }
    for (var cr = 0; cr < compareRadios.length; cr++) {
        compareRadios[cr].onClick = (function(index) {
            return function() { compare = index; updatePreview(); };
        })(cr);
    }
    crestCheck.onClick = function() { crestOn = crestCheck.value; updatePreview(); };
    amplitudeCheck.onClick = function() { amplitudeOn = amplitudeCheck.value; updatePreview(); };
    wavelengthCheck.onClick = function() { wavelengthOn = wavelengthCheck.value; updatePreview(); };
    directionCheck.onClick = function() { directionOn = directionCheck.value; updatePreview(); };
    axisCheck.onClick = function() { axisOn = axisCheck.value; updatePreview(); };
    bindValueRow(widthRow, function() { return widthMm; }, function(v) { widthMm = v; });
    bindValueRow(amplitudeRow, function() { return amplitudeMm; }, function(v) { amplitudeMm = v; });
    bindValueRow(wavelengthRow, function() { return wavelengthMm; }, function(v) { wavelengthMm = v; });
    bindValueRow(linesRow, function() { return lineCount; }, function(v) { lineCount = v; });
    bindValueRow(densityRow, function() { return density; }, function(v) { density = v; });
    bindValueRow(panelsRow, function() { return panelCount; }, function(v) { panelCount = v; });
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
        setRowEnabled(linesRow, kind === 1);
        setRowEnabled(densityRow, kind === 1);
        setRowEnabled(panelsRow, kind === 2);
        for (var i = 0; i < compareRadios.length; i++) compareRadios[i].enabled = kind === 2;
        amplitudeCheck.enabled = kind === 0;
        crestCheck.enabled = kind !== 2;
        wavelengthCheck.enabled = kind !== 2;
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
        var width = widthMm * MM;
        var amplitude = amplitudeMm * MM;
        var wavelength = wavelengthMm * MM;
        var cx = viewCenter[0];
        var cy = viewCenter[1];
        previewGroup = layer.groupItems.add();
        previewGroup.name = "파동 (" + KINDS[kind] + ")";
        if (kind === 0) {
            drawTransverse(width, amplitude, wavelength);
        } else if (kind === 1) {
            drawLongitudinal(width, amplitude, wavelength);
        } else {
            drawSoundPanels(width, amplitude, wavelength);
        }
        previewGroup.translate(cx + offsetXmm * MM, cy + offsetYmm * MM);
    }

    function drawTransverse(width, amplitude, wavelength) {
        if (axisOn) addLine([[-width / 2, 0], [width / 2, 0]], GUIDE_DASH, "기준선");
        var wave = drawBezier(previewGroup, wavePoints(width, amplitude, wavelength, [[1, 1]]), false);
        styleLine(wave, WAVE_WIDTH_PT, null);
        wave.name = "파형";
        var crests = extremaX(width, wavelength, true);
        var troughs = extremaX(width, wavelength, false);
        var gap = fontPt * 0.9;
        if (crestOn) {
            if (crests.length > 0) addText("마루", crests[0], amplitude + gap);
            // 첫 마루 다음 골 (없으면 첫 골)
            var trough = troughs.length > 0 ? troughs[0] : null;
            for (var t = 0; t < troughs.length; t++) {
                if (crests.length > 0 && troughs[t] > crests[0]) { trough = troughs[t]; break; }
            }
            if (trough !== null) addText("골", trough, -amplitude - gap);
        }
        if (amplitudeOn && crests.length > 0) {
            // 첫 마루 아래 기준선 → 마루 세로 치수선
            addDimension([crests[0], 0], [crests[0], amplitude], "진폭", [fontPt * 1.4, -amplitude * 0.15]);
        }
        if (wavelengthOn && crests.length > 1) {
            var wy = amplitude + gap * (crestOn ? 2.4 : 1.2);
            addLine([[crests[0], amplitude], [crests[0], wy + gap * 0.4]], GUIDE_DASH, "파장 보조선");
            addLine([[crests[1], amplitude], [crests[1], wy + gap * 0.4]], GUIDE_DASH, "파장 보조선");
            addDimension([crests[0], wy], [crests[1], wy], "파장", [0, gap]);
        }
        if (directionOn) addDirection(width, amplitude + gap * 1.2);
    }

    function drawLongitudinal(width, height, wavelength) {
        var lines = longitudinalXs(width, wavelength, density / 100, lineCount);
        var h = height;
        var group = previewGroup.groupItems.add();
        group.name = "매질";
        for (var i = 0; i < lines.length; i++) {
            var line = group.pathItems.add();
            line.setEntirePath([[lines[i], -h], [lines[i], h]]);
            styleLine(line, LINE_WIDTH_PT, null);
        }
        if (axisOn) addLine([[-width / 2, -h], [width / 2, -h]], null, "기준선");
        var compressions = compressionXs(width, wavelength, true);
        var rarefactions = compressionXs(width, wavelength, false);
        var gap = fontPt * 0.9;
        if (crestOn) {
            if (compressions.length > 0) addText("밀", compressions[0], -h - gap);
            if (rarefactions.length > 0) addText("소", rarefactions[0], -h - gap);
        }
        if (wavelengthOn && compressions.length > 1) {
            var wy = h + gap * 1.2;
            addDimension([compressions[0], wy], [compressions[1], wy], "파장", [0, gap]);
        }
        if (directionOn) addDirection(width, h + gap * (wavelengthOn ? 3.4 : 1.2));
    }

    function drawSoundPanels(width, amplitude, wavelength) {
        var specs = soundPanels(compare, panelCount, amplitude, wavelength);
        var pitch = amplitude * 2 + fontPt * 2.2;
        var top = (specs.length - 1) * pitch / 2;
        for (var i = 0; i < specs.length; i++) {
            var y = top - pitch * i;
            if (axisOn) addLine([[-width / 2, y], [width / 2, y]], null, "기준선");
            var wave = drawBezier(previewGroup, wavePoints(width, specs[i].amplitude, specs[i].wavelength, specs[i].harmonics), false);
            styleLine(wave, WAVE_WIDTH_PT, null);
            wave.translate(0, y);
            wave.name = "파형 " + PANEL_LABELS[i];
            addText(PANEL_LABELS[i], -width / 2 - fontPt * 1.6, y);
        }
        if (directionOn) addDirection(width, top + amplitude + fontPt * 1.1);
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
    // 배음 목록 [[차수, 세기], ...]을 더한 파형 y(x). 가장 높은 곳이 amplitude가 되도록 늘린다
    function harmonicWave(amplitude, wavelength, harmonics) {
        var k = 2 * Math.PI / wavelength;
        var peak = 0;
        for (var s = 0; s <= 720; s++) {
            var sum = 0;
            for (var h = 0; h < harmonics.length; h++) sum += harmonics[h][1] * Math.sin(harmonics[h][0] * k * wavelength * s / 720);
            peak = Math.max(peak, Math.abs(sum));
        }
        var scale = amplitude / peak;
        return {
            y: function(x) {
                var sum = 0;
                for (var i = 0; i < harmonics.length; i++) sum += harmonics[i][1] * Math.sin(harmonics[i][0] * k * x);
                return scale * sum;
            },
            slope: function(x) {
                var sum = 0;
                for (var i = 0; i < harmonics.length; i++) sum += harmonics[i][1] * harmonics[i][0] * k * Math.cos(harmonics[i][0] * k * x);
                return scale * sum;
            }
        };
    }

    // 왼쪽 끝 −width/2에서 오른쪽 끝까지. 가장 높은 배음 한 파장을 8조각으로 나눠 베지어 손잡이를 기울기로 둔다
    function wavePoints(width, amplitude, wavelength, harmonics) {
        var wave = harmonicWave(amplitude, wavelength, harmonics);
        var top = 1;
        for (var h = 0; h < harmonics.length; h++) top = Math.max(top, harmonics[h][0]);
        var pieces = Math.max(1, Math.ceil(width / (wavelength / top / 8)));
        var step = width / pieces;
        var points = [];
        for (var i = 0; i <= pieces; i++) {
            var x = -width / 2 + step * i;
            var p = [x, wave.y(x)];
            var d = [step / 3, wave.slope(x) * step / 3];
            points.push({
                anchor: p,
                left: i === 0 ? p : [p[0] - d[0], p[1] - d[1]],
                right: i === pieces ? p : [p[0] + d[0], p[1] + d[1]]
            });
        }
        return points;
    }

    // sin(2πx/λ)의 마루(λ/4 + nλ) 또는 골(3λ/4 + nλ) 중 폭 안에 드는 x, 왼쪽부터
    function extremaX(width, wavelength, crest) {
        var first = crest ? wavelength / 4 : wavelength * 3 / 4;
        var n = Math.ceil((-width / 2 - first) / wavelength - 1e-9);
        var list = [];
        for (var x = first + n * wavelength; x <= width / 2 + 1e-9; x += wavelength) list.push(x);
        return list;
    }

    // 종파 세로선: 고른 자리 x0를 x0 − (s / k) sin(k x0)로 옮긴다. 간격이 1 − s cos(k x0)배라 x0 = nλ가 가장 촘촘
    function longitudinalXs(width, wavelength, strength, count) {
        var k = 2 * Math.PI / wavelength;
        var list = [];
        for (var i = 0; i < count; i++) {
            var x0 = -width / 2 + width * i / (count - 1);
            var x = x0 - strength / k * Math.sin(k * x0);
            list.push(Math.max(-width / 2, Math.min(width / 2, x)));
        }
        return list;
    }

    // 밀(nλ) 또는 소((n + ½)λ) 자리 중 폭 안에 드는 x, 왼쪽부터
    function compressionXs(width, wavelength, dense) {
        var first = dense ? 0 : wavelength / 2;
        var n = Math.ceil((-width / 2 - first) / wavelength - 1e-9);
        var list = [];
        for (var x = first + n * wavelength; x <= width / 2 + 1e-9; x += wavelength) list.push(x);
        return list;
    }

    // 소리 비교 파형: 크기는 진폭 1, ⅔, ⅓배, 높낮이는 진동수 1, 2, 3배(파장 1, ½, ⅓배), 음색은 배음만 다르다
    function soundPanels(compareIndex, count, amplitude, wavelength) {
        var list = [];
        for (var i = 0; i < count; i++) {
            var spec = {amplitude: amplitude, wavelength: wavelength, harmonics: TIMBRES[0]};
            if (compareIndex === 0) spec.amplitude = amplitude * (3 - i) / 3;
            if (compareIndex === 1) spec.wavelength = wavelength / (i + 1);
            if (compareIndex === 2) spec.harmonics = TIMBRES[i];
            list.push(spec);
        }
        return list;
    }

    // 끝이 tip, 방향 (dx, dy)인 채운 삼각형의 세 점
    function arrowHeadPoints(tip, dx, dy) {
        var length = Math.sqrt(dx * dx + dy * dy);
        var ux = dx / length, uy = dy / length;
        var bx = tip[0] - ux * HEAD_LENGTH, by = tip[1] - uy * HEAD_LENGTH;
        return [tip, [bx - uy * HEAD_WIDTH / 2, by + ux * HEAD_WIDTH / 2], [bx + uy * HEAD_WIDTH / 2, by - ux * HEAD_WIDTH / 2]];
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function styleLine(path, weight, dashes) {
        path.filled = false;
        path.stroked = true;
        path.strokeColor = makeGray(100);
        path.strokeWidth = weight;
        if (dashes) path.strokeDashes = dashes;
    }

    function addLine(points, dashes, name) {
        var line = previewGroup.pathItems.add();
        line.setEntirePath(points);
        styleLine(line, LINE_WIDTH_PT, dashes);
        line.name = name;
        return line;
    }

    function addHead(tip, dx, dy) {
        var head = previewGroup.pathItems.add();
        head.setEntirePath(arrowHeadPoints(tip, dx, dy));
        head.closed = true;
        head.stroked = false;
        head.filled = true;
        head.fillColor = makeGray(100);
        return head;
    }

    // 양쪽 화살촉 치수선과 가운데에서 textShift만큼 비킨 글자
    function addDimension(a, b, label, textShift) {
        addLine([a, b], null, label);
        addHead(a, a[0] - b[0], a[1] - b[1]);
        addHead(b, b[0] - a[0], b[1] - a[1]);
        addText(label, (a[0] + b[0]) / 2 + textShift[0], (a[1] + b[1]) / 2 + textShift[1]);
    }

    // 오른쪽 위에 오른쪽으로 가는 화살표와 '진행 방향'
    function addDirection(width, y) {
        var length = Math.min(20 * MM, width * 0.3);
        var end = width / 2;
        addLine([[end - length, y], [end, y]], null, "진행 방향");
        addHead([end, y], 1, 0);
        addText("진행 방향", end - length / 2, y + fontPt * 0.9);
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
        var parts = ["v1", kind, widthMm, amplitudeMm, wavelengthMm, lineCount, density, compare, panelCount,
            crestOn ? "1" : "0", amplitudeOn ? "1" : "0", wavelengthOn ? "1" : "0", directionOn ? "1" : "0", axisOn ? "1" : "0",
            fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function readSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v1" || p.length !== 18) return;
        kind = restoreNumber(p[1], kind, [0, KINDS.length - 1], 1);
        widthMm = restoreNumber(p[2], widthMm, WIDTH_RANGE, 1);
        amplitudeMm = restoreNumber(p[3], amplitudeMm, AMPLITUDE_RANGE, 0.5);
        wavelengthMm = restoreNumber(p[4], wavelengthMm, WAVELENGTH_RANGE, 1);
        lineCount = restoreNumber(p[5], lineCount, LINES_RANGE, 1);
        density = restoreNumber(p[6], density, DENSITY_RANGE, 5);
        compare = restoreNumber(p[7], compare, [0, COMPARES.length - 1], 1);
        panelCount = restoreNumber(p[8], panelCount, PANELS_RANGE, 1);
        crestOn = p[9] === "1";
        amplitudeOn = p[10] === "1";
        wavelengthOn = p[11] === "1";
        directionOn = p[12] === "1";
        axisOn = p[13] === "1";
        fontPt = restoreNumber(p[14], fontPt, FONT_RANGE, 0.5);
        offsetXmm = restoreNumber(p[15], offsetXmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        offsetYmm = restoreNumber(p[16], offsetYmm, [-POSITION_LIMIT_MM, POSITION_LIMIT_MM], 0.1);
        previewEnabled = p[17] === "1";
    }

    function restoreNumber(text, fallback, range, step) {
        var value = parseNumber(text);
        if (value === null) return fallback;
        return clamp(roundTo(value, step), range[0], range[1]);
    }
})();
