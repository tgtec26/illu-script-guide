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

/*
  Object_Semiconductor.jsx
  기능: 규소 결정의 공유 결합 모형(반도체 모형)을 그립니다.
    - 규소 원자를 행·열(3·4·5)로 늘어놓고, 이웃한 원자 사이 접점마다 전자쌍을 놓습니다
    - 불순물 추가: 가운데 원자를 5족(P·As·Sb·Bi)이나 3족(B·Al·Ga·In)으로 바꿉니다
      5족이면 껍질 궤도 위에 자유 전자가 하나 더 생기고, 3족이면 위쪽 결합의 전자 하나가 정공이 됩니다
    - 핵·전자 3D 조명, K 음영, 크기, 핵·전자 거리는 슬라이더
    - 전자 − 기호, 핵 원소 기호, 정공·자유 전자 지시선은 체크박스
    - 주변 궤도 일부 표시: 이웃 원자의 껍질을 테두리 폭만큼만 보여 넓은 결정의 일부라는 느낌을 준다
  사용법: 그냥 실행하면 화면 중앙에 만듭니다
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "ObjectSemiconductor/settings";
    var MM_TO_PT = 2.834645669;
    var POSITION_LIMIT_MM = 100;
    var STROKE_PT = 0.3;
    var LABEL_PT = 8;
    var HALO_PT = 1;            // 지시선 글자 둘레의 흰 선 두께
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";

    var GRID_SIZES = [3, 4, 5];
    // 5족(n형)은 자유 전자, 3족(p형)은 정공
    var DOPANTS = [
        {symbol: "P",  label: "인(P)",       type: "n"},
        {symbol: "As", label: "비소(As)",    type: "n"},
        {symbol: "Sb", label: "안티모니(Sb)", type: "n"},
        {symbol: "Bi", label: "비스무트(Bi)", type: "n"},
        {symbol: "B",  label: "붕소(B)",     type: "p"},
        {symbol: "Al", label: "알루미늄(Al)", type: "p"},
        {symbol: "Ga", label: "갈륨(Ga)",    type: "p"},
        {symbol: "In", label: "인듐(In)",    type: "p"}
    ];

    var doc = app.activeDocument;
    var viewCenter = doc.activeView.centerPoint;
    var centerX = viewCenter[0];
    var centerY = viewCenter[1];
    var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

    // 옵션 (설정 저장 대상)
    var doped = false;
    var rows = 3;
    var cols = 3;
    var dopantIndex = 0;
    var showMinus = true;
    var showSymbol = true;
    var showCallout = true;
    var showSurround = true;     // 격자 바깥 이웃 원자의 껍질 일부
    var lit3DNucleus = true;
    var lit3DElectron = true;
    var siliconMm = 4.5;
    var dopantMm = 4.5;
    var electronMm = 1.2;
    var distanceMm = 5;         // 핵 중심 ↔ 전자 중심 = 껍질 반지름. 이웃 껍질은 맞닿는다.
    var surroundMm = 1.5;       // 격자 바깥으로 이웃 껍질이 보이는 폭
    var siliconK = 60;
    var dopantK = 40;
    var electronK = 80;
    var offsetXmm = 0;
    var offsetYmm = 0;
    var previewEnabled = true;
    var previewGroup = null;

    // 그라데이션은 종류마다 하나만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지)
    var _gradients = {};

    applySavedSettings();

    var LABEL_WIDTH = 74;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;

    var dlg = new Window("dialog", "반도체 모형");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var structurePanel = addPanel(dlg, "구조");
    var kindRow = structurePanel.add("group");
    var pureRadio = kindRow.add("radiobutton", undefined, "규소만");
    var dopedRadio = kindRow.add("radiobutton", undefined, "불순물 추가");
    pureRadio.value = !doped;
    dopedRadio.value = doped;
    var rowRadios = addRadioRow(structurePanel, "행", GRID_SIZES, rows);
    var colRadios = addRadioRow(structurePanel, "열", GRID_SIZES, cols);

    var dopantPanel = addPanel(dlg, "불순물");
    // 두 줄이라 ScriptUI 라디오 그룹이 나뉜다. 하나만 켜지도록 직접 관리한다.
    var dopantRadios = [];
    var nRow = dopantPanel.add("group");
    nRow.spacing = 2;
    nRow.add("statictext", undefined, "n형").preferredSize.width = 30;
    var pRow = dopantPanel.add("group");
    pRow.spacing = 2;
    pRow.add("statictext", undefined, "p형").preferredSize.width = 30;
    for (var d = 0; d < DOPANTS.length; d++) {
        // 기호만 보여 폭을 줄인다. 이름은 helpTip으로
        var radio = (DOPANTS[d].type === "n" ? nRow : pRow).add("radiobutton", undefined, DOPANTS[d].symbol);
        radio.helpTip = DOPANTS[d].label;
        radio.preferredSize.width = 44;
        radio.value = (d === dopantIndex);
        radio.onClick = makeDopantHandler(d);
        dopantRadios.push(radio);
    }

    var showPanel = addPanel(dlg, "표시");
    var showRow1 = showPanel.add("group");
    var minusCheck = showRow1.add("checkbox", undefined, "전자 − 기호");
    minusCheck.value = showMinus;
    var symbolCheck = showRow1.add("checkbox", undefined, "핵 원소 기호");
    symbolCheck.value = showSymbol;
    var showRow2 = showPanel.add("group");
    var calloutCheck = showRow2.add("checkbox", undefined, "정공·자유 전자 지시선과 이름");
    calloutCheck.value = showCallout;
    var surroundCheck = showRow2.add("checkbox", undefined, "주변 궤도 일부 표시");
    surroundCheck.value = showSurround;

    var shadePanel = addPanel(dlg, "음영");
    var siliconKField = addNumberField(shadePanel, "규소 핵", "K", siliconK, 10, 0, 100);
    var dopantKField = addNumberField(shadePanel, "불순물 핵", "K", dopantK, 10, 0, 100);
    var electronKField = addNumberField(shadePanel, "전자", "K", electronK, 10, 0, 100);
    var litRow = shadePanel.add("group");
    var litNucleusCheck = litRow.add("checkbox", undefined, "핵 3D 조명 효과");
    litNucleusCheck.value = lit3DNucleus;
    var litElectronCheck = litRow.add("checkbox", undefined, "전자 3D 조명 효과");
    litElectronCheck.value = lit3DElectron;

    var sizePanel = addPanel(dlg, "크기");
    var siliconField = addNumberField(sizePanel, "규소 핵 지름", "mm", siliconMm, 0.1, 0.5, 20);
    var dopantField = addNumberField(sizePanel, "불순물 핵 지름", "mm", dopantMm, 0.1, 0.5, 20);
    var electronField = addNumberField(sizePanel, "전자 지름", "mm", electronMm, 0.1, 0.2, 6);
    var distanceField = addNumberField(sizePanel, "핵·전자 거리", "mm", distanceMm, 0.1, 1, 30);
    var surroundField = addNumberField(sizePanel, "주변 궤도 폭", "mm", surroundMm, 0.1, 0, 10);

    var positionPanel = addPanel(dlg, "위치");
    var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
        -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
    // 위치는 모형을 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindOffsetField(offsetXField, true);
    bindOffsetField(offsetYField, false);

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    pureRadio.onClick = onKindChange;
    dopedRadio.onClick = onKindChange;
    bindRadios(rowRadios);
    bindRadios(colRadios);
    minusCheck.onClick = updatePreview;
    symbolCheck.onClick = updatePreview;
    calloutCheck.onClick = updatePreview;
    surroundCheck.onClick = updatePreview;
    litNucleusCheck.onClick = updatePreview;
    litElectronCheck.onClick = updatePreview;
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    updateDopantState();
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = drawModel();
        moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        finalGroup.name = "Semiconductor";
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    function drawModel() {
        var group = doc.activeLayer.groupItems.add();
        var r = distanceMm * MM_TO_PT;          // 껍질 반지름
        var pitch = r * 2;                      // 이웃 원자 간격: 껍질이 맞닿는다
        var eDia = electronMm * MM_TO_PT;
        var eR = eDia / 2;
        var left = centerX - (cols - 1) * pitch / 2;
        var top = centerY + (rows - 1) * pitch / 2;
        var dopant = doped ? DOPANTS[dopantIndex] : null;
        var dopantRow = doped ? Math.floor(rows / 2) : -1;
        var dopantCol = doped ? Math.floor(cols / 2) : -1;
        var i, j, x, y;

        // 0. 주변 궤도: 격자를 한 바퀴 두른 이웃 원자의 껍질을 테두리 폭만큼만 보인다
        if (showSurround && surroundMm > 0) drawSurround(group, left, top, pitch, r);

        // 1. 껍질 원
        for (i = 0; i < rows; i++) {
            for (j = 0; j < cols; j++) {
                var shell = group.pathItems.ellipse(top - i * pitch + r, left + j * pitch - r, pitch, pitch);
                shell.filled = false;
                shell.stroked = true;
                shell.strokeWidth = STROKE_PT;
                shell.strokeColor = makeGray(100);
            }
        }

        // 2. 핵
        for (i = 0; i < rows; i++) {
            for (j = 0; j < cols; j++) {
                var isDopant = (i === dopantRow && j === dopantCol);
                drawNucleus(group, left + j * pitch, top - i * pitch,
                    (isDopant ? dopantMm : siliconMm) * MM_TO_PT,
                    isDopant ? dopantK : siliconK,
                    isDopant ? dopant.symbol : "Si");
            }
        }

        // 3. 전자쌍: 이웃 원자 사이 접점마다 둘, 바깥 테두리 접점에도 둔다(결정이 이어진다는 뜻)
        // 세로 접선(원자 좌우) → 전자쌍은 위아래로
        for (i = 0; i < rows; i++) {
            for (j = 0; j <= cols; j++) {
                x = left + j * pitch - r;
                y = top - i * pitch;
                drawElectron(group, x, y + eR, eDia);
                drawElectron(group, x, y - eR, eDia);
            }
        }
        // 가로 접선(원자 상하) → 전자쌍은 좌우로. 정공은 불순물 위쪽 접점의 오른쪽 자리
        var holeAt = null;
        for (i = 0; i <= rows; i++) {
            for (j = 0; j < cols; j++) {
                x = left + j * pitch;
                y = top - i * pitch + r;
                drawElectron(group, x - eR, y, eDia);
                if (dopant !== null && dopant.type === "p" && i === dopantRow && j === dopantCol) {
                    holeAt = [x + eR, y];
                    drawHole(group, x + eR, y, eDia);
                } else {
                    drawElectron(group, x + eR, y, eDia);
                }
            }
        }

        // 4. 자유 전자: 불순물 껍질 궤도 위, 위쪽 전자쌍의 오른쪽(1시 방향)
        var freeAt = null;
        if (dopant !== null && dopant.type === "n") {
            var angle = 55 * Math.PI / 180;
            x = left + dopantCol * pitch + r * Math.cos(angle);
            y = top - dopantRow * pitch + r * Math.sin(angle);
            drawElectron(group, x, y, eDia);
            freeAt = [x, y];
        }

        // 5. 지시선과 이름
        if (showCallout) {
            if (freeAt !== null) drawCallout(group, freeAt[0], freeAt[1], eR, "자유 전자");
            if (holeAt !== null) drawCallout(group, holeAt[0], holeAt[1], eR, "정공");
        }
        return group;
    }

    // 이웃 껍질은 원 그대로 그리고, 격자 경계에서 폭만큼 넓힌 사각형으로 클리핑한다
    function drawSurround(group, left, top, pitch, r) {
        var margin = surroundMm * MM_TO_PT;
        var clip = group.groupItems.add();
        var i, j;
        for (i = -1; i <= rows; i++) {
            for (j = -1; j <= cols; j++) {
                if (i >= 0 && i < rows && j >= 0 && j < cols) continue;
                var shell = clip.pathItems.ellipse(top - i * pitch + r, left + j * pitch - r, pitch, pitch);
                shell.filled = false;
                shell.stroked = true;
                shell.strokeWidth = STROKE_PT;
                shell.strokeColor = makeGray(100);
            }
        }
        var mask = clip.pathItems.rectangle(top + r + margin, left - r - margin,
            (cols - 1) * pitch + 2 * (r + margin), (rows - 1) * pitch + 2 * (r + margin));
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        clip.clipped = true;
        return clip;
    }

    function drawNucleus(group, x, y, dia, k, symbol) {
        drawSphere(group, x, y, dia, k, lit3DNucleus, "N" + k);
        if (!showSymbol) return;
        // 3D는 가운데가 밝아 어두운 핵에도 검은 글자가 읽힌다. 아주 어두울 때만 흰 글자.
        var darkBackground = lit3DNucleus ? (k >= 80) : (k >= 50);
        placeText(group, symbol, x, y, dia * 0.55, darkBackground ? 0 : 100);
    }

    function drawElectron(group, x, y, dia) {
        drawSphere(group, x, y, dia, electronK, lit3DElectron, "E" + electronK);
        if (!showMinus) return;
        // − 기호는 전자 지름에 비례 (원자 모형과 같은 비율)
        var w = dia * 0.8;
        var h = dia * 0.13;
        var minus = group.pathItems.rectangle(y + h / 2, x - w / 2, w, h);
        minus.filled = true;
        minus.stroked = false;
        minus.fillColor = makeGray(0);
    }

    // 정공: 전자 자리에 남은 빈 원
    function drawHole(group, x, y, dia) {
        var hole = group.pathItems.ellipse(y + dia / 2, x - dia / 2, dia, dia);
        hole.filled = true;
        hole.fillColor = makeGray(0);
        hole.stroked = true;
        hole.strokeWidth = STROKE_PT;
        hole.strokeColor = makeGray(100);
        return hole;
    }

    // 구: 3D 조명은 원자 모형과 같이 하이라이트 중심의 큰 방사형 그라데이션 원을 원래 크기로 클리핑한다
    function drawSphere(group, x, y, dia, k, lit, gradientKey) {
        var radius = dia / 2;
        if (!lit) {
            var flat = group.pathItems.ellipse(y + radius, x - radius, dia, dia);
            flat.filled = true;
            flat.stroked = false;
            flat.fillColor = makeGray(k);
            return flat;
        }
        var sphere = group.groupItems.add();
        var highlightX = x - radius * 0.35;
        var highlightY = y + radius * 0.35;
        var big = radius * 1.7;
        var fill = sphere.pathItems.ellipse(highlightY + big, highlightX - big, big * 2, big * 2);
        fill.filled = true;
        fill.stroked = false;
        var gradientColor = new GradientColor();
        gradientColor.gradient = getSphereGradient(gradientKey, k);
        fill.fillColor = gradientColor;
        var mask = sphere.pathItems.ellipse(y + radius, x - radius, dia, dia);
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        sphere.clipped = true;
        return sphere;
    }

    // K는 가장자리 톤, 하이라이트는 그 15%로 거의 흰색이 된다
    function getSphereGradient(key, k) {
        var highlight = makeGray(Math.round(k * 0.15));
        var deep = makeGray(k);
        var cached = _gradients[key];
        if (cached) {
            try {
                cached.gradientStops[0].color = highlight;
                cached.gradientStops[1].color = deep;
                return cached;
            } catch (e) {
                _gradients[key] = null;
            }
        }
        var gradient = doc.gradients.add();
        // 그라데이션 이름은 31자 제한. 넘으면 "the name was not found"로 죽는다
        gradient.name = "Semi_" + key + "_" + (new Date().getTime());
        gradient.type = GradientType.RADIAL;
        while (gradient.gradientStops.length < 2) gradient.gradientStops.add();
        gradient.gradientStops[0].rampPoint = 0;
        gradient.gradientStops[0].midPoint = 13.3;
        gradient.gradientStops[0].color = highlight;
        gradient.gradientStops[1].rampPoint = 100;
        gradient.gradientStops[1].color = deep;
        _gradients[key] = gradient;
        return gradient;
    }

    // 지시선: 대상 가장자리에 닿아 오른쪽 위 45°로 뻗고, 글자는 선 끝에 왼쪽 아래를 맞춘다
    function drawCallout(group, x, y, targetRadius, text) {
        var cos = Math.SQRT1_2;
        var start = targetRadius;
        var end = targetRadius + 2.5 * MM_TO_PT;
        var line = group.pathItems.add();
        line.setEntirePath([[x + start * cos, y + start * cos], [x + end * cos, y + end * cos]]);
        line.closed = false;
        line.filled = false;
        line.stroked = true;
        line.strokeWidth = STROKE_PT;
        line.strokeColor = makeGray(100);
        placeLabel(group, text, x + end * cos + 0.3 * MM_TO_PT, y + end * cos);
    }

    // 글자의 왼쪽 아래를 (x, y)에 놓고, 다른 요소와 겹쳐도 읽히도록 뒤에 흰 테두리 윤곽선을 깐다.
    // 텍스트 프레임의 bounds는 글자 위아래 여백을 포함하므로, 실제 글자 크기는 윤곽선 쪽으로 잰다.
    function placeLabel(group, text, x, y) {
        var frame = group.textFrames.add();
        frame.contents = text;
        var attrs = frame.textRange.characterAttributes;
        attrs.size = LABEL_PT;
        attrs.fillColor = makeGray(100);
        applyFontRule(frame);

        var halo = frame.duplicate().createOutline();
        var gb = halo.geometricBounds;
        frame.translate(x - gb[0], y - gb[3]);
        halo.translate(x - gb[0], y - gb[3]);
        whiten(halo);
        halo.move(frame, ElementPlacement.PLACEAFTER);   // 글자 바로 아래
        return frame;
    }

    function whiten(item) {
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) whiten(item.pageItems[i]);
        } else if (item.typename === "CompoundPathItem") {
            for (var j = 0; j < item.pathItems.length; j++) whiten(item.pathItems[j]);
        } else if (item.typename === "PathItem") {
            item.filled = true;
            item.fillColor = makeGray(0);
            item.stroked = true;
            item.strokeWidth = HALO_PT;
            item.strokeColor = makeGray(0);
            item.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        }
    }

    // 글자를 (x, y) 중심에 놓는다
    function placeText(group, text, x, y, sizePt, k) {
        var frame = group.textFrames.add();
        frame.contents = text;
        var attrs = frame.textRange.characterAttributes;
        attrs.size = sizePt;
        attrs.fillColor = makeGray(k);
        applyFontRule(frame);
        var gb = frame.geometricBounds;
        frame.translate(x - (gb[0] + gb[2]) / 2, y - (gb[1] + gb[3]) / 2);
        return frame;
    }

    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    // 서체 규칙(02_문자/Text_koen.jsx와 동일): 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)
    function applyFontRule(frame) {
        var chars = frame.characters;
        for (var i = 0; i < chars.length; i++) {
            var code = chars[i].contents.charCodeAt(0);
            var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
            var space = (code === 32 || code === 160);
            var attrs = chars[i].characterAttributes;
            try {
                attrs.textFont = (korean || space) ? korFont : engFont;
                attrs.baselineShift = (korean || space) ? 0 : 0.5;
            } catch (e) {}
        }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    function moveItem(item, deltaX, deltaY) {
        if (item === null || (deltaX === 0 && deltaY === 0)) return;
        try { item.translate(deltaX, deltaY); } catch (e) {}
    }

    // -------------------------------------------------------
    // 미리보기 · 입력
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        previewGroup = drawModel();
        moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
        previewGroup.name = "Semiconductor Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function readFields(showAlert) {
        var fields = [
            [siliconField, "규소 핵 지름"], [dopantField, "불순물 핵 지름"],
            [electronField, "전자 지름"], [distanceField, "핵·전자 거리"],
            [surroundField, "주변 궤도 폭"],
            [siliconKField, "규소 핵 음영"], [dopantKField, "불순물 핵 음영"],
            [electronKField, "전자 음영"],
            [offsetXField, "가로 이동"], [offsetYField, "세로 이동"]
        ];
        var values = [];
        for (var i = 0; i < fields.length; i++) {
            var value = parseNumber(fields[i][0].input.text);
            if (value === null || value < fields[i][0].minimum || value > fields[i][0].maximum) {
                if (showAlert) alert(fields[i][1] + "은(는) " + fields[i][0].minimum + "부터 " +
                    fields[i][0].maximum + " 사이로 입력해주세요.");
                return false;
            }
            values.push(value);
        }

        doped = dopedRadio.value;
        rows = selectedSize(rowRadios, rows);
        cols = selectedSize(colRadios, cols);
        for (var d = 0; d < dopantRadios.length; d++) {
            if (dopantRadios[d].value) dopantIndex = d;
        }
        showMinus = minusCheck.value;
        showSymbol = symbolCheck.value;
        showCallout = calloutCheck.value;
        showSurround = surroundCheck.value;
        lit3DNucleus = litNucleusCheck.value;
        lit3DElectron = litElectronCheck.value;
        siliconMm = values[0];
        dopantMm = values[1];
        electronMm = values[2];
        distanceMm = values[3];
        surroundMm = values[4];
        siliconK = values[5];
        dopantK = values[6];
        electronK = values[7];
        offsetXmm = values[8];
        offsetYmm = values[9];
        return true;
    }

    function selectedSize(radios, fallback) {
        for (var i = 0; i < radios.length; i++) {
            if (radios[i].value) return GRID_SIZES[i];
        }
        return fallback;
    }

    function onKindChange() {
        updateDopantState();
        updatePreview();
    }

    // 규소만일 때는 불순물을 고를 수 없다
    function updateDopantState() {
        for (var i = 0; i < dopantRadios.length; i++) dopantRadios[i].enabled = dopedRadio.value;
    }

    function makeDopantHandler(index) {
        return function() {
            for (var i = 0; i < dopantRadios.length; i++) dopantRadios[i].value = (i === index);
            updatePreview();
        };
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    function addRadioRow(parent, labelText, sizes, selected) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, labelText).preferredSize.width = 30;
        var radios = [];
        for (var i = 0; i < sizes.length; i++) {
            radios[i] = row.add("radiobutton", undefined, String(sizes[i]));
            radios[i].preferredSize.width = 44;
            radios[i].value = (sizes[i] === selected);
        }
        return radios;
    }

    function bindRadios(radios) {
        for (var i = 0; i < radios.length; i++) radios[i].onClick = updatePreview;
    }

    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.characters = 5;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, value, minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;

        var field = {row: row, input: input, slider: slider, step: step,
            minimum: minimum, maximum: maximum, syncing: false};

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampField(field, stepped));
            commitField(field);
        };
        input.onChanging = function() { commitField(field); };
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampField(field, parsed);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            commitField(field);
        };
        return field;
    }

    // 값이 바뀌었을 때 할 일은 필드마다 다르다. 지정이 없으면 미리보기만 다시 그린다.
    function commitField(field) {
        if (field.onCommit) field.onCommit();
        else updatePreview();
    }

    // 위치 필드는 모형을 다시 만들지 않고 미리보기만 옮긴다
    function bindOffsetField(field, isX) {
        field.onCommit = function() {
            var value = parseNumber(field.input.text);
            if (value === null) return;
            value = clampField(field, value);
            var delta = (value - (isX ? offsetXmm : offsetYmm)) * MM_TO_PT;
            if (isX) offsetXmm = value;
            else offsetYmm = value;
            if (delta === 0 || previewGroup === null) return;
            moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
            app.redraw();
        };
    }

    function clampField(field, value) {
        if (value < field.minimum) value = field.minimum;
        if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
        return value;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function formatValue(value) {
        return String(Math.round(value * 100) / 100);
    }

    // -------------------------------------------------------
    // 설정 기억
    // -------------------------------------------------------
    function saveSettings() {
        var parts = ["v2", doped ? 1 : 0, rows, cols, dopantIndex,
            showMinus ? 1 : 0, showSymbol ? 1 : 0, showCallout ? 1 : 0,
            lit3DNucleus ? 1 : 0, lit3DElectron ? 1 : 0,
            siliconMm, dopantMm, electronMm, distanceMm,
            siliconK, dopantK, electronK, offsetXmm, offsetYmm,
            showSurround ? 1 : 0, surroundMm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v2" || p.length < 21) return;

        doped = (p[1] === "1");
        rows = restoreSize(p[2], rows);
        cols = restoreSize(p[3], cols);
        var index = parseInt(p[4], 10);
        if (index >= 0 && index < DOPANTS.length) dopantIndex = index;
        showMinus = (p[5] === "1");
        showSymbol = (p[6] === "1");
        showCallout = (p[7] === "1");
        lit3DNucleus = (p[8] === "1");
        lit3DElectron = (p[9] === "1");
        siliconMm = restoreNumber(p[10], siliconMm, 0.5, 20);
        dopantMm = restoreNumber(p[11], dopantMm, 0.5, 20);
        electronMm = restoreNumber(p[12], electronMm, 0.2, 6);
        distanceMm = restoreNumber(p[13], distanceMm, 1, 30);
        siliconK = restoreNumber(p[14], siliconK, 0, 100);
        dopantK = restoreNumber(p[15], dopantK, 0, 100);
        electronK = restoreNumber(p[16], electronK, 0, 100);
        offsetXmm = restoreNumber(p[17], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        offsetYmm = restoreNumber(p[18], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
        showSurround = (p[19] === "1");
        surroundMm = restoreNumber(p[20], surroundMm, 0, 10);
    }

    function restoreSize(text, fallback) {
        var value = parseInt(text, 10);
        for (var i = 0; i < GRID_SIZES.length; i++) {
            if (GRID_SIZES[i] === value) return value;
        }
        return fallback;
    }

    function restoreNumber(text, fallback, minimum, maximum) {
        var value = parseFloat(text);
        if (isNaN(value) || value < minimum || value > maximum) return fallback;
        return value;
    }
})();
