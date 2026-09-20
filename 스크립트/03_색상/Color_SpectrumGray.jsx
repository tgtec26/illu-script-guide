// Color_SpectrumGray.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 파선 끝 정렬 (01_도형/Object_setdash_align_helper.jsxinc). 파일이 없어도 파선 자체는 그려진다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/01_도형/Object_setdash_align_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 선택한 가로 사각형을 스펙트럼 띠로 바꾼다. 연속 스펙트럼 · 선 방출 스펙트럼 · 선 흡수 스펙트럼(별) 중
// 고른 것을 위에서부터 그 순서로, 사각형과 같은 크기로 아래에 쌓는다. 확인하면 원본 사각형은 지운다.
//   - 연속 스펙트럼: 파장별 밝기 키포인트를 부드럽게 이은 K 농도 그라데이션. 정확한 색채계가 아니라 보기에 그럴듯한 수준이다.
//   - 선 방출: 배경(K) 위에 원소 하나의 방출선. 선 흡수: 연속 스펙트럼 위에 여러 원소의 흡수선(별의 스펙트럼).
//   - 선 위치는 NIST ASD 실측 파장. 주요 선만 또는 약한 선까지.
//   - 파장 범위(기본 380~780 nm), 좌우 반전(장파장 왼쪽), 양끝 파장 눈금, 띠 기호(㉠㉡㉢·ABC·ⅠⅡⅢ)를 고른다.
//   - 눈금 양끝에서 마지막 띠까지 파선 보조선(0.3pt, 2pt 선·1pt 간격)이 맨 뒤에 깔려 띠 사이에서만 보인다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

    var PREF_KEY = "SpectrumGray/settings";
    var MM = 2.834645669;
    var LABEL_WIDTH = 90;
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var SLIDER_WIDTH = 196;
    var WAVE_RANGE = [300, 1000];
    var WAVE_STEP = 10;
    var MIN_SPAN = 50;
    var BRIGHT_RANGE = [20, 300];
    var K_RANGE = [0, 100];
    var LINE_WIDTH_RANGE = [0.1, 3];
    var MERGE_RANGE = [0, 5];     // 이보다 가까운 선(나트륨 D선 같은 이중선)은 한 선으로 합친다. 0이면 모두 따로
    var GAP_RANGE = [0, 50];
    var LABEL_GAP_RANGE = [0, 20];
    var SCALE_GAP_MM = 1.5;     // 띠 위쪽과 파장 눈금선 사이
    var SCALE_TICK_MM = 1;      // 눈금선 양끝의 짧은 세로선 (위로, 숫자 쪽)
    var GUIDE_WIDTH = 0.3;      // 파선 보조선 두께(pt)와 파선 패턴
    var GUIDE_DASH = [2, 1];
    var TEXT_SIZE = 8;

    // 파장별 밝기 키포인트. 미리보기가 다이얼로그를 열자마자 돌기 때문에 여기(호출보다 위)에 둬야 한다.
    // 양 끝은 거의 검정(완전 검정은 아님), 570nm(노랑) 하나만 흰색, 파랑·청록 쪽에 작은 밝은 언덕, 빨강은 천천히 어두워진다.
    var GRAY_KEYS = [
        [380, 0.08], [410, 0.14], [440, 0.24], [475, 0.55], [500, 0.72], [530, 0.76],
        [570, 1.00], [600, 0.70], [640, 0.40], [690, 0.18], [740, 0.10], [780, 0.06]
    ];

    // 원소별 방출·흡수선 (파장 0.1 nm 단위 정수, 등급 1 = 주요 선, 2 = 약한 선). NIST ASD 실측 공기 파장.
    // 주요 선은 교과서·스펙트럼 도표에 흔히 실리는 선, 약한 선은 NIST 상대 세기 순으로 더한 선이다.
    var ELEMENTS = [
        {name: "H", lines: [[3835, 2], [3889, 2], [3970, 1], [4102, 1], [4340, 1], [4861, 1], [6563, 1]]},
        {name: "He", lines: [[3820, 2], [3889, 1], [3965, 2], [4026, 1], [4121, 2], [4388, 2], [4471, 1], [4713, 1], [4922, 1], [5016, 1], [5048, 2], [5876, 1], [6678, 1], [7065, 1], [7281, 2]]},
        {name: "Li", lines: [[3915, 2], [3985, 2], [4133, 1], [4273, 2], [4603, 1], [4972, 2], [6104, 1], [6708, 1]]},
        {name: "C", lines: [[4371, 2], [4763, 2], [4772, 1], [4776, 2], [4932, 1], [5024, 2], [5039, 2], [5052, 1], [5380, 1], [5793, 2], [5801, 2], [6001, 2], [6013, 1], [6588, 2], [7111, 2], [7113, 1], [7115, 1], [7117, 2], [7120, 2]]},
        {name: "N", lines: [[4935, 2], [4964, 1], [5752, 1], [5765, 2], [5830, 2], [5854, 2], [6008, 2], [6421, 2], [6441, 2], [6468, 2], [6483, 1], [6485, 2], [6645, 2], [6653, 2], [7406, 2], [7424, 1], [7442, 1], [7468, 1]]},
        {name: "O", lines: [[3823, 2], [3947, 2], [5329, 2], [5331, 2], [5437, 2], [5959, 2], [6046, 2], [6157, 1], [6158, 1], [6454, 1], [6456, 2], [7002, 1], [7157, 2], [7254, 1], [7476, 2], [7772, 1], [7774, 1], [7775, 1]]},
        {name: "Ne", lines: [[4538, 2], [4704, 2], [4709, 2], [4712, 2], [4715, 2], [4789, 2], [4827, 2], [4885, 2], [4957, 2], [5401, 2], [5852, 1], [6143, 1], [6266, 1], [6334, 1], [6383, 1], [6402, 1], [6507, 1], [6599, 1], [6929, 1], [7024, 2], [7032, 1], [7174, 2], [7245, 1], [7439, 1], [7489, 2], [7536, 2], [7544, 2]]},
        {name: "Na", lines: [[3866, 2], [3882, 2], [3918, 2], [3926, 2], [4186, 2], [4432, 2], [4665, 1], [4669, 1], [4979, 1], [4983, 1], [5071, 2], [5162, 2], [5683, 1], [5688, 1], [5890, 1], [5896, 1], [6154, 1], [6161, 1]]},
        {name: "Mg", lines: [[3829, 1], [3832, 1], [3838, 1], [4058, 2], [4167, 2], [4352, 2], [4571, 1], [4703, 1], [5167, 1], [5173, 1], [5184, 1], [5528, 1], [5711, 2], [7388, 2], [7658, 2], [7659, 2], [7692, 2]]},
        {name: "Ar", lines: [[4159, 1], [4191, 2], [4198, 2], [4201, 1], [4259, 2], [4266, 2], [4272, 1], [4300, 2], [4334, 2], [6753, 2], [6871, 2], [6965, 1], [7030, 2], [7067, 1], [7147, 2], [7273, 2], [7372, 2], [7384, 1], [7504, 1], [7515, 1], [7635, 1], [7724, 1]]},
        {name: "K", lines: [[4044, 1], [4047, 1], [5112, 2], [5323, 2], [5340, 2], [5343, 2], [5360, 2], [5782, 2], [5802, 2], [5812, 2], [5832, 2], [6911, 1], [6936, 2], [6939, 1], [7665, 1], [7699, 1]]},
        {name: "Ca", lines: [[3934, 1], [3968, 1], [4227, 1], [4303, 2], [4425, 2], [4435, 2], [4455, 1], [5349, 2], [5589, 1], [5594, 2], [5857, 1], [6103, 2], [6122, 2], [6162, 1], [6170, 2], [6439, 1], [6450, 2], [6463, 1], [6472, 2], [6494, 1], [6500, 2], [6718, 2], [7148, 1], [7202, 2], [7326, 2]]},
        {name: "Fe", lines: [[3813, 2], [3816, 2], [3824, 2], [3828, 2], [3834, 2], [3841, 2], [3856, 2], [3873, 2], [3879, 2], [3886, 2], [3896, 2], [3900, 2], [3903, 2], [3906, 2], [3920, 2], [3923, 2], [3930, 2], [3969, 2], [4046, 1], [4064, 1], [4072, 2], [4132, 2], [4144, 2], [4272, 1], [4308, 1], [4326, 1], [4384, 1], [4405, 1], [4415, 2], [4958, 1], [5167, 2], [5227, 2], [5270, 1], [5328, 1], [5371, 2], [6394, 2], [6400, 2], [6421, 2], [6495, 2], [6678, 2]]},
        {name: "Hg", lines: [[4047, 1], [4078, 1], [4108, 2], [4347, 2], [4358, 1], [4916, 1], [4960, 2], [5354, 2], [5461, 1], [5676, 2], [5770, 1], [5791, 1], [5804, 2], [5859, 2], [6234, 1], [6716, 2], [6907, 1], [7082, 2], [7092, 2]]}
    ];

    // 띠 기호. 서체·크기는 02_문자/Text_input.jsx와 같다 (원문자 바탕 9pt, 영문 GSMediumB1 8pt, 로마 숫자 KoPubWorld 바탕 Pro 8pt)
    var KOPUB_BATANG_NAMES = [
        "KoPubWorld바탕체_Pro", "KoPubWorld Batang Pro", "KoPubWorldBatangPro", "KoPubWorldBatang_Pro",
        "KoPubWorldBatangPM", "KoPubWorldBatangPL", "KoPubWorldBatangPB",
        "KoPubWorldBatangPro-Regular", "KoPubWorldBatangPro-Medium", "KoPubWorldBatangMedium"
    ];
    var LABEL_SETS = [
        {name: "없음", items: null},
        {name: "㉠ ㉡ ㉢", items: ["㉠", "㉡", "㉢"], fontNames: ["Batang"], size: 9},
        {name: "A B C", items: ["A", "B", "C"], fontNames: ["GSMediumB1"], size: 8},
        {name: "Ⅰ Ⅱ Ⅲ", items: ["Ⅰ", "Ⅱ", "Ⅲ"], fontNames: KOPUB_BATANG_NAMES, koPub: true, size: 8}
    ];

    var doc = app.activeDocument;
    var rect = getSelectedRectangle(doc.selection);
    if (rect === null) {
        alert("가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.");
        return;
    }
    var rectWasHidden = rect.hidden;

    // 옵션 (설정 저장 대상)
    var showContinuous = true;
    var showEmission = false;
    var showAbsorption = false;
    var waveMin = 380;
    var waveMax = 780;
    var flipDirection = false;
    var showScale = true;
    var brightness = 100;
    var emissionIndex = indexOfElement("Na");
    var emissionBackK = 100;
    var emissionLineK = 0;
    var absorptionMask = [];
    for (var e0 = 0; e0 < ELEMENTS.length; e0++) absorptionMask.push(ELEMENTS[e0].name === "H");
    var absorptionLineK = 100;
    var lineWidthPt = 0.5;
    var includeWeak = false;
    var mergeNm = 1;
    var gapMm = 2;
    var labelGapMm = 2;
    var labelIndex = 0;
    var previewEnabled = true;

    var previewGroup = null;
    var gradient = null;

    applySavedSettings();

    var black = makeGray(100);
    var numberFont = getFont("GSMediumB1");
    var korFont = getFont("SpoqaHanSansNeo-Regular");

    // -------------------------------------------------------
    // 다이얼로그
    // -------------------------------------------------------
    var dlg = new Window("dialog", "스펙트럼");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var kindPanel = addPanel(dlg, "종류 (위에서부터 이 순서로 쌓인다)");
    var kindRow = kindPanel.add("group");
    var continuousCheck = kindRow.add("checkbox", undefined, "연속 스펙트럼");
    var emissionCheck = kindRow.add("checkbox", undefined, "선 방출 스펙트럼");
    var absorptionCheck = kindRow.add("checkbox", undefined, "선 흡수 스펙트럼 (별)");
    continuousCheck.value = showContinuous;
    emissionCheck.value = showEmission;
    absorptionCheck.value = showAbsorption;
    var labelRow = kindPanel.add("group");
    labelRow.alignChildren = ["left", "center"];
    var labelCaption = labelRow.add("statictext", undefined, "띠 기호:");
    labelCaption.preferredSize.width = LABEL_WIDTH;
    var labelList = labelRow.add("dropdownlist", undefined, labelSetNames());
    labelList.preferredSize.width = 120;
    labelList.selection = labelIndex;
    var gapField = addNumberField(kindPanel, "띠 간격", "mm", gapMm, 0.5, GAP_RANGE[0], GAP_RANGE[1]);
    var labelGapField = addNumberField(kindPanel, "기호 간격", "mm", labelGapMm, 0.5, LABEL_GAP_RANGE[0], LABEL_GAP_RANGE[1]);

    var wavePanel = addPanel(dlg, "파장");
    var waveMinField = addNumberField(wavePanel, "최소 파장", "nm", waveMin, WAVE_STEP, WAVE_RANGE[0], WAVE_RANGE[1]);
    var waveMaxField = addNumberField(wavePanel, "최대 파장", "nm", waveMax, WAVE_STEP, WAVE_RANGE[0], WAVE_RANGE[1]);
    var waveRow = wavePanel.add("group");
    var flipCheck = waveRow.add("checkbox", undefined, "좌우 반전 (장파장 왼쪽)");
    var scaleCheck = waveRow.add("checkbox", undefined, "양끝 파장 · 파장(nm) 표시");
    flipCheck.value = flipDirection;
    scaleCheck.value = showScale;

    var continuousPanel = addPanel(dlg, "연속 스펙트럼 (흡수 스펙트럼 바탕에도 쓴다)");
    var brightField = addNumberField(continuousPanel, "전체 밝기", "%", brightness, 5, BRIGHT_RANGE[0], BRIGHT_RANGE[1]);

    var emissionPanel = addPanel(dlg, "선 방출 스펙트럼");
    var elementRow = emissionPanel.add("group");
    elementRow.alignChildren = ["left", "center"];
    var elementCaption = elementRow.add("statictext", undefined, "원소:");
    elementCaption.preferredSize.width = LABEL_WIDTH;
    var elementList = elementRow.add("dropdownlist", undefined, elementNames());
    elementList.preferredSize.width = 120;
    elementList.selection = emissionIndex;
    var emissionBackField = addNumberField(emissionPanel, "배경", "K", emissionBackK, 5, K_RANGE[0], K_RANGE[1]);
    var emissionLineField = addNumberField(emissionPanel, "선 색", "K", emissionLineK, 5, K_RANGE[0], K_RANGE[1]);

    var absorptionPanel = addPanel(dlg, "선 흡수 스펙트럼 (별) — 원소 여러 개");
    var absorptionChecks = [];
    var checkRow = null;
    for (var e1 = 0; e1 < ELEMENTS.length; e1++) {
        if (e1 % 5 === 0) checkRow = absorptionPanel.add("group");
        var elementCheck = checkRow.add("checkbox", undefined, ELEMENTS[e1].name);
        elementCheck.preferredSize.width = 62;
        elementCheck.value = absorptionMask[e1];
        absorptionChecks.push(elementCheck);
    }
    var absorptionLineField = addNumberField(absorptionPanel, "선 색", "K", absorptionLineK, 5, K_RANGE[0], K_RANGE[1]);

    var linePanel = addPanel(dlg, "선");
    var lineWidthField = addNumberField(linePanel, "두께", "pt", lineWidthPt, 0.1, LINE_WIDTH_RANGE[0], LINE_WIDTH_RANGE[1]);
    var mergeField = addNumberField(linePanel, "선 합치기", "nm", mergeNm, 0.5, MERGE_RANGE[0], MERGE_RANGE[1]);
    mergeField.input.helpTip = "이보다 가까운 선은 한 선으로 그린다 (나트륨 D선 589.0·589.6처럼 붙어 있는 이중선). 0이면 모두 따로";
    var weakCheck = linePanel.add("checkbox", undefined, "약한 선 포함");
    weakCheck.value = includeWeak;
    weakCheck.helpTip = "끄면 교과서·도표에 흔히 실리는 주요 선만, 켜면 NIST 상대 세기 순의 약한 선까지 넣는다";

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    continuousCheck.onClick = function() { showContinuous = continuousCheck.value; syncPanels(); updatePreview(); };
    emissionCheck.onClick = function() { showEmission = emissionCheck.value; syncPanels(); updatePreview(); };
    absorptionCheck.onClick = function() { showAbsorption = absorptionCheck.value; syncPanels(); updatePreview(); };
    labelList.onChange = function() {
        if (labelList.selection) labelIndex = labelList.selection.index;
        updatePreview();
    };
    flipCheck.onClick = function() { flipDirection = flipCheck.value; updatePreview(); };
    scaleCheck.onClick = function() { showScale = scaleCheck.value; updatePreview(); };
    elementList.onChange = function() {
        if (elementList.selection) emissionIndex = elementList.selection.index;
        updatePreview();
    };
    for (var e2 = 0; e2 < absorptionChecks.length; e2++) {
        absorptionChecks[e2].onClick = makeMaskHandler(e2);
    }
    weakCheck.onClick = function() { includeWeak = weakCheck.value; updatePreview(); };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        if (selectedKinds().length === 0) {
            alert("스펙트럼 종류를 하나 이상 골라주세요.");
            return;
        }
        if (showAbsorption && selectedAbsorptionElements().length === 0) {
            alert("선 흡수 스펙트럼에 넣을 원소를 하나 이상 골라주세요.");
            return;
        }
        dlg.close(1);
    };

    syncPanels();
    rect.hidden = true;
    rect.selected = false;
    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(dlg);
    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = buildSpectrum(true);
        rect.remove();
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        rect.hidden = rectWasHidden;
        rect.selected = true;
        removeGradient();
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    function selectedKinds() {
        var kinds = [];
        if (showContinuous) kinds.push("continuous");
        if (showEmission) kinds.push("emission");
        if (showAbsorption) kinds.push("absorption");
        return kinds;
    }

    function selectedAbsorptionElements() {
        var picked = [];
        for (var i = 0; i < ELEMENTS.length; i++) if (absorptionMask[i]) picked.push(ELEMENTS[i]);
        return picked;
    }

    function buildSpectrum(isFinal) {
        var kinds = selectedKinds();
        var group = doc.activeLayer.groupItems.add();
        group.name = "Spectrum";
        var bounds = rect.geometricBounds; // [left, top, right, bottom]
        var left = bounds[0], top = bounds[1], right = bounds[2], bottom = bounds[3];
        var height = top - bottom;
        var gapPt = gapMm * MM;
        var labelSet = LABEL_SETS[labelIndex];
        var lastBottom = bottom - (kinds.length - 1) * (height + gapPt);

        for (var k = 0; k < kinds.length; k++) {
            var rowGroup = group.groupItems.add();
            rowGroup.name = kinds[k];
            var shift = -k * (height + gapPt);
            var band = rect.duplicate(rowGroup, ElementPlacement.PLACEATEND);
            band.hidden = false;
            band.selected = false;
            band.stroked = false;   // 원본 사각형의 선(흰 선 등)은 띠에 넣지 않는다
            if (shift !== 0) band.translate(0, shift);
            var bandTop = top + shift, bandBottom = bottom + shift;

            if (kinds[k] === "emission") {
                band.filled = true;
                band.fillColor = makeGray(emissionBackK);
                addLines(rowGroup, [ELEMENTS[emissionIndex]], left, right, bandTop, bandBottom, makeGray(emissionLineK));
            } else {
                applyGradientFill(band);
                if (kinds[k] === "absorption") {
                    addLines(rowGroup, selectedAbsorptionElements(), left, right, bandTop, bandBottom, makeGray(absorptionLineK));
                }
            }

            if (labelSet.items !== null) {
                var label = addText(group, labelSet.items[k], findLabelFont(labelSet), labelSet.size);
                placeGlyph(label, left - labelGapMm * MM, (bandTop + bandBottom) / 2, "right", "center");
            }
        }

        if (showScale) {
            var tickBottom = addScale(group, left, right, top);
            addGuides(group, left, right, tickBottom, lastBottom, isFinal);
        }
        return group;
    }

    // 파장 → 띠 안의 x. 반전이면 왼쪽이 최대 파장
    function xOfWavelength(nm, left, right) {
        var t = (nm - waveMin) / (waveMax - waveMin);
        if (flipDirection) t = 1 - t;
        return left + (right - left) * t;
    }

    function addLines(container, elements, left, right, bandTop, bandBottom, color) {
        var lineGroup = container.groupItems.add();
        lineGroup.name = "Lines";
        var waves = lineWavelengths(elements, includeWeak, waveMin, waveMax, mergeNm);
        for (var i = 0; i < waves.length; i++) {
            var x = xOfWavelength(waves[i], left, right);
            var line = lineGroup.pathItems.add();
            line.setEntirePath([[x, bandBottom], [x, bandTop]]);
            line.stroked = true;
            line.strokeColor = color;
            line.strokeWidth = lineWidthPt;
            line.filled = false;
        }
        if (lineGroup.pathItems.length === 0) lineGroup.remove();
    }

    // 원소들의 선 파장(nm)을 범위 안에서 오름차순으로 모으고, mergeNm보다 가까운 이웃끼리는 평균 파장 하나로 합친다
    function lineWavelengths(elements, withWeak, minNm, maxNm, mergeNm) {
        var waves = [];
        for (var i = 0; i < elements.length; i++) {
            var lines = elements[i].lines;
            for (var j = 0; j < lines.length; j++) {
                if (lines[j][1] > 1 && !withWeak) continue;
                var nm = lines[j][0] / 10;
                if (nm >= minNm && nm <= maxNm) waves.push(nm);
            }
        }
        waves.sort(function(a, b) { return a - b; });
        var merged = [];
        var clusterSum = 0, clusterCount = 0, clusterLast = 0;
        for (var k = 0; k < waves.length; k++) {
            if (clusterCount > 0 && waves[k] - clusterLast >= mergeNm) {
                merged.push(clusterSum / clusterCount);
                clusterSum = 0;
                clusterCount = 0;
            }
            clusterSum += waves[k];
            clusterCount++;
            clusterLast = waves[k];
        }
        if (clusterCount > 0) merged.push(clusterSum / clusterCount);
        return merged;
    }

    // 첫 띠 위: 양끝에 위로 짧은 세로선이 달린 가로선, 그 위에 세로선 중심에 맞춘 양끝 파장과 가운데 "파장(nm)".
    // 가로선의 y를 돌려준다 (파선 보조선이 여기서 아래로 이어진다)
    function addScale(container, left, right, top) {
        var scaleGroup = container.groupItems.add();
        scaleGroup.name = "Scale";
        var y = top + SCALE_GAP_MM * MM;
        var tick = SCALE_TICK_MM * MM;
        // 선 두께의 절반만큼 안쪽에 그려 선의 바깥 가장자리가 띠 가장자리와 나란하다 (파선 보조선과 같은 x)
        var xl = left + GUIDE_WIDTH / 2, xr = right - GUIDE_WIDTH / 2;
        var bracket = scaleGroup.pathItems.add();
        bracket.setEntirePath([[xl, y + tick], [xl, y], [xr, y], [xr, y + tick]]);
        bracket.stroked = true;
        bracket.strokeColor = black;
        bracket.strokeWidth = GUIDE_WIDTH;
        bracket.filled = false;

        var textBottom = y + tick + 0.5 * MM;
        var leftValue = String(flipDirection ? waveMax : waveMin);
        var rightValue = String(flipDirection ? waveMin : waveMax);
        placeGlyph(addText(scaleGroup, leftValue, numberFont, TEXT_SIZE), xl, textBottom, "center", "bottom");
        placeGlyph(addText(scaleGroup, rightValue, numberFont, TEXT_SIZE), xr, textBottom, "center", "bottom");
        placeGlyph(addKoEnText(scaleGroup, "파장(nm)"), (left + right) / 2, textBottom, "center", "bottom");
        return y;
    }

    // 눈금선 양끝에서 마지막 띠 아래까지 세로 파선. 그룹 맨 뒤에 두어 띠가 덮고, 띠 사이·눈금 아래에서만 보인다.
    // 눈금 세로선과 같이 선 두께의 절반만큼 안쪽이라 띠 밖으로 삐져나오지 않는다
    function addGuides(container, left, right, fromY, toY, isFinal) {
        var guideGroup = container.groupItems.add();
        guideGroup.name = "Guides";
        var xs = [left + GUIDE_WIDTH / 2, right - GUIDE_WIDTH / 2];
        for (var i = 0; i < xs.length; i++) {
            var guide = guideGroup.pathItems.add();
            guide.setEntirePath([[xs[i], fromY], [xs[i], toY]]);
            guide.stroked = true;
            guide.strokeColor = black;
            guide.strokeWidth = GUIDE_WIDTH;
            guide.filled = false;
            try { guide.strokeDashes = GUIDE_DASH; } catch (dashError) {}
        }
        // 파선을 패스 끝에 맞춰 정렬(스트로크 패널의 두 번째 파선 옵션). 액션을 거치는 느린 작업이라 확인할 때만
        if (isFinal && typeof applyDashPatternToItems === "function") {
            try { applyDashPatternToItems([guideGroup], GUIDE_DASH, false); } catch (alignError) {}
        }
        guideGroup.zOrder(ZOrderMethod.SENDTOBACK);
    }

    // -------------------------------------------------------
    // 연속 스펙트럼 그라데이션
    // -------------------------------------------------------
    function applyGradientFill(path) {
        var stops = buildStops(brightness, flipDirection, waveMin, waveMax);
        var grad = getGradient(stops.length);
        if (!grad) return;
        for (var i = 0; i < stops.length; i++) {
            grad.gradientStops[i].rampPoint = stops[i].pos;
            grad.gradientStops[i].color = makeGray(stops[i].k);
        }
        try {
            var gc = new GradientColor();
            gc.gradient = grad;
            path.filled = true;
            path.fillColor = gc;
            // 새 그라데이션 칠에는 일러가 마지막에 쓴 각도가 찍힌다. 읽어서 0°(왼쪽 → 오른쪽)로 되돌린다
            var stamped = path.fillColor.angle;
            if (Math.abs(stamped) > 0.01) path.rotate(-stamped, false, false, true, false, Transformation.CENTER);
        } catch (fillError) {}
    }

    function getGradient(stopCount) {
        // 정지점 수가 달라지면 새로 만든다. 있는 정지점을 하나씩 옮기면 이웃과 겹쳐 오류가 난다
        if (gradient !== null && gradient.gradientStops.length !== stopCount) removeGradient();
        if (gradient === null) {
            try {
                gradient = doc.gradients.add();
                gradient.name = "SpectrumGray_" + (new Date().getTime());
                gradient.type = GradientType.LINEAR;
            } catch (gradientError) {
                gradient = null;
                return null;
            }
        }
        while (gradient.gradientStops.length < stopCount) gradient.gradientStops.add();
        return gradient;
    }

    function removeGradient() {
        if (gradient === null) return;
        try { gradient.remove(); } catch (e) {}
        gradient = null;
    }

    // rampPoint 오름차순으로 돌려준다. 최대 41개 정지점, 반전이면 왼쪽(0%)이 최대 파장이 된다.
    function buildStops(brightPercent, flipped, minNm, maxNm) {
        var stops = [];
        var span = maxNm - minNm;
        var count = Math.max(1, Math.min(40, Math.round(span / WAVE_STEP)));
        for (var i = 0; i <= count; i++) {
            var wave = minNm + span * i / count;
            var pos = i / count * 100;
            if (flipped) pos = 100 - pos;
            // 곱하면 밝은 쪽이 흰색으로 잘려 대비만 세진다. 감마로 올리면 어두운 쪽이 따라 올라온다.
            var lum = Math.pow(wavelengthToGray(wave), 100 / brightPercent);
            stops.push({pos: pos, k: Math.round((1 - lum) * 100)});
        }
        if (flipped) stops.reverse();
        return stops;
    }

    // 파장(nm) → 0~1 휘도 (키포인트 사이는 코사인 보간, 범위 밖은 양끝 값)
    function wavelengthToGray(wave) {
        if (wave <= GRAY_KEYS[0][0]) return GRAY_KEYS[0][1];
        for (var i = 1; i < GRAY_KEYS.length; i++) {
            if (wave > GRAY_KEYS[i][0]) continue;
            var a = GRAY_KEYS[i - 1], b = GRAY_KEYS[i];
            var t = (wave - a[0]) / (b[0] - a[0]);
            var smooth = (1 - Math.cos(t * Math.PI)) / 2;
            return a[1] + (b[1] - a[1]) * smooth;
        }
        return GRAY_KEYS[GRAY_KEYS.length - 1][1];
    }

    // -------------------------------------------------------
    // 일러스트레이터 개체
    // -------------------------------------------------------
    function makeGray(k) {
        var c = new CMYKColor();
        c.cyan = 0;
        c.magenta = 0;
        c.yellow = 0;
        c.black = clampValue(k, 0, 100);
        return c;
    }

    function getFont(name) {
        try {
            return app.textFonts.getByName(name);
        } catch (e) {
            return null;
        }
    }

    // 기호 세트의 서체. 이름으로 못 찾으면(KoPub) 설치된 서체의 이름·패밀리·스타일을 훑는다. 한 번 찾은 결과는 세트에 담아 둔다
    function findLabelFont(set) {
        if (set.font !== undefined) return set.font;
        set.font = null;
        for (var i = 0; i < set.fontNames.length && set.font === null; i++) set.font = getFont(set.fontNames[i]);
        if (set.font === null && set.koPub) {
            for (var j = 0; j < app.textFonts.length; j++) {
                if (nameMatchesKoPubWorldBatang(app.textFonts[j])) {
                    set.font = app.textFonts[j];
                    break;
                }
            }
        }
        return set.font;
    }

    function nameMatchesKoPubWorldBatang(font) {
        var all = (getFontText(font, "name") + " " + getFontText(font, "family") + " " + getFontText(font, "style")).toLowerCase();
        var hasKoPub = all.indexOf("kopubworld") >= 0 || all.indexOf("kopub") >= 0 || all.indexOf("코펍") >= 0;
        var hasBatang = all.indexOf("batang") >= 0 || all.indexOf("바탕") >= 0;
        var hasPro = all.indexOf("pro") >= 0 || /kopubworldbatangp[mlb]/.test(all);
        return hasKoPub && hasBatang && hasPro;
    }

    function getFontText(font, key) {
        try {
            return String(font[key] || "");
        } catch (e) {
            return "";
        }
    }

    function addText(container, text, font, size) {
        var tf = container.textFrames.add();
        tf.contents = text;
        var attr = tf.textRange.characterAttributes;
        if (font !== null) attr.textFont = font;
        attr.size = size;
        attr.fillColor = black;
        return tf;
    }

    // 서체 규칙(02_문자/Text_koen.jsx와 동일): 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)
    function addKoEnText(container, text) {
        var tf = addText(container, text, korFont, TEXT_SIZE);
        if (numberFont === null) return tf;
        try {
            var chars = tf.textRange.characters;
            for (var i = 0; i < chars.length; i++) {
                var code = chars[i].contents.charCodeAt(0);
                var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E);
                var space = code === 32 || code === 160;
                if (korean || space) continue;
                chars[i].characterAttributes.textFont = numberFont;
                chars[i].characterAttributes.baselineShift = 0.5;
            }
        } catch (fontError) {}
        return tf;
    }

    // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
    function glyphBounds(tf) {
        var dup = tf.duplicate();
        var outline = dup.createOutline();
        var gb = outline.geometricBounds; // [left, top, right, bottom]
        outline.remove();
        return gb;
    }

    // 글리프 경계를 (x, y)에 맞춘다. hAlign: left·center·right, vAlign: top·center·bottom
    function placeGlyph(tf, x, y, hAlign, vAlign) {
        var gb = glyphBounds(tf);
        var dx = (hAlign === "left") ? x - gb[0] : (hAlign === "right") ? x - gb[2] : x - (gb[0] + gb[2]) / 2;
        var dy = (vAlign === "top") ? y - gb[1] : (vAlign === "bottom") ? y - gb[3] : y - (gb[1] + gb[3]) / 2;
        tf.translate(dx, dy);
    }

    function getSelectedRectangle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
        if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;
        var xs = [];
        var ys = [];
        for (var i = 0; i < 4; i++) {
            var point = item.pathPoints[i];
            if (point.leftDirection[0] !== point.anchor[0] ||
                    point.leftDirection[1] !== point.anchor[1] ||
                    point.rightDirection[0] !== point.anchor[0] ||
                    point.rightDirection[1] !== point.anchor[1]) return null;
            pushDistinct(xs, point.anchor[0]);
            pushDistinct(ys, point.anchor[1]);
        }
        if (xs.length !== 2 || ys.length !== 2) return null;
        return item;
    }

    function pushDistinct(list, value) {
        for (var i = 0; i < list.length; i++) {
            if (Math.abs(list[i] - value) < 0.01) return;
        }
        list.push(value);
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
        if (!readFields(false) || selectedKinds().length === 0) {
            app.redraw();
            return;
        }
        previewGroup = buildSpectrum(false);
        previewGroup.name = "Spectrum Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function syncPanels() {
        continuousPanel.enabled = showContinuous || showAbsorption;
        emissionPanel.enabled = showEmission;
        absorptionPanel.enabled = showAbsorption;
        linePanel.enabled = showEmission || showAbsorption;
    }

    function makeMaskHandler(index) {
        return function() {
            absorptionMask[index] = absorptionChecks[index].value;
            updatePreview();
        };
    }

    function readFields(showAlert) {
        var minimum = parseNumber(waveMinField.input.text);
        var maximum = parseNumber(waveMaxField.input.text);
        var bright = parseNumber(brightField.input.text);
        var backK = parseNumber(emissionBackField.input.text);
        var lineK = parseNumber(emissionLineField.input.text);
        var absK = parseNumber(absorptionLineField.input.text);
        var width = parseNumber(lineWidthField.input.text);
        var merge = parseNumber(mergeField.input.text);
        var gap = parseNumber(gapField.input.text);
        var labelGap = parseNumber(labelGapField.input.text);

        if (!inRange(minimum, WAVE_RANGE) || !inRange(maximum, WAVE_RANGE) || maximum - minimum < MIN_SPAN) {
            if (showAlert) alert("파장은 " + WAVE_RANGE[0] + "~" + WAVE_RANGE[1] + "nm 사이로, 최대 파장은 최소 파장보다 " +
                MIN_SPAN + "nm 이상 크게 입력해주세요.");
            return false;
        }
        if (!inRange(bright, BRIGHT_RANGE)) {
            if (showAlert) alert("전체 밝기는 " + BRIGHT_RANGE[0] + "~" + BRIGHT_RANGE[1] + "% 사이로 입력해주세요.");
            return false;
        }
        if (!inRange(backK, K_RANGE) || !inRange(lineK, K_RANGE) || !inRange(absK, K_RANGE)) {
            if (showAlert) alert("배경과 선 색은 K 0~100 사이로 입력해주세요.");
            return false;
        }
        if (!inRange(width, LINE_WIDTH_RANGE)) {
            if (showAlert) alert("선 두께는 " + LINE_WIDTH_RANGE[0] + "~" + LINE_WIDTH_RANGE[1] + "pt 사이로 입력해주세요.");
            return false;
        }
        if (!inRange(merge, MERGE_RANGE)) {
            if (showAlert) alert("선 합치기는 " + MERGE_RANGE[0] + "~" + MERGE_RANGE[1] + "nm 사이로 입력해주세요.");
            return false;
        }
        if (!inRange(gap, GAP_RANGE)) {
            if (showAlert) alert("띠 간격은 " + GAP_RANGE[0] + "~" + GAP_RANGE[1] + "mm 사이로 입력해주세요.");
            return false;
        }
        if (!inRange(labelGap, LABEL_GAP_RANGE)) {
            if (showAlert) alert("기호 간격은 " + LABEL_GAP_RANGE[0] + "~" + LABEL_GAP_RANGE[1] + "mm 사이로 입력해주세요.");
            return false;
        }

        waveMin = minimum;
        waveMax = maximum;
        brightness = bright;
        emissionBackK = backK;
        emissionLineK = lineK;
        absorptionLineK = absK;
        lineWidthPt = width;
        mergeNm = merge;
        gapMm = gap;
        labelGapMm = labelGap;
        return true;
    }

    function inRange(value, range) {
        return value !== null && value >= range[0] && value <= range[1];
    }

    function indexOfElement(name) {
        for (var i = 0; i < ELEMENTS.length; i++) if (ELEMENTS[i].name === name) return i;
        return 0;
    }

    function elementNames() {
        var names = [];
        for (var i = 0; i < ELEMENTS.length; i++) names.push(ELEMENTS[i].name);
        return names;
    }

    function labelSetNames() {
        var names = [];
        for (var i = 0; i < LABEL_SETS.length; i++) names.push(LABEL_SETS[i].name);
        return names;
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

    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, labelText + " (" + unit + "):");
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.characters = 6;
        input.justify = "center";
        var slider = row.add("scrollbar", undefined, clampValue(value, minimum, maximum), minimum, maximum);
        slider.stepdelta = step;
        slider.jumpdelta = step * 10;
        slider.preferredSize.width = SLIDER_WIDTH;

        var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / step) * step;
            input.text = formatValue(clampValue(stepped, field.minimum, field.maximum));
            updatePreview();
        };
        input.onChanging = function() { updatePreview(); };
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampValue(parsed, field.minimum, field.maximum);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            updatePreview();
        };
        return field;
    }

    function clampValue(value, minimum, maximum) {
        if (value < minimum) value = minimum;
        if (value > maximum) value = maximum;
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
    // 설정 저장 · 복원
    // -------------------------------------------------------
    function saveSettings() {
        var mask = "";
        for (var i = 0; i < absorptionMask.length; i++) mask += absorptionMask[i] ? "1" : "0";
        var parts = ["v5", showContinuous ? 1 : 0, showEmission ? 1 : 0, showAbsorption ? 1 : 0,
            waveMin, waveMax, flipDirection ? 1 : 0, showScale ? 1 : 0, brightness,
            emissionIndex, emissionBackK, emissionLineK, mask, absorptionLineK,
            lineWidthPt, includeWeak ? 1 : 0, gapMm, labelIndex, previewEnabled ? 1 : 0, labelGapMm, mergeNm];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v5" || p.length !== 21) return;

        showContinuous = p[1] === "1";
        showEmission = p[2] === "1";
        showAbsorption = p[3] === "1";
        var minimum = parseFloat(p[4]);
        var maximum = parseFloat(p[5]);
        if (inRange(minimum, WAVE_RANGE) && inRange(maximum, WAVE_RANGE) && maximum - minimum >= MIN_SPAN) {
            waveMin = minimum;
            waveMax = maximum;
        }
        flipDirection = p[6] === "1";
        showScale = p[7] === "1";
        var bright = parseFloat(p[8]);
        if (inRange(bright, BRIGHT_RANGE)) brightness = bright;
        var element = parseInt(p[9], 10);
        if (element >= 0 && element < ELEMENTS.length) emissionIndex = element;
        var backK = parseFloat(p[10]);
        var lineK = parseFloat(p[11]);
        if (inRange(backK, K_RANGE)) emissionBackK = backK;
        if (inRange(lineK, K_RANGE)) emissionLineK = lineK;
        if (p[12].length === ELEMENTS.length) {
            for (var i = 0; i < ELEMENTS.length; i++) absorptionMask[i] = p[12].charAt(i) === "1";
        }
        var absK = parseFloat(p[13]);
        if (inRange(absK, K_RANGE)) absorptionLineK = absK;
        var width = parseFloat(p[14]);
        if (inRange(width, LINE_WIDTH_RANGE)) lineWidthPt = width;
        includeWeak = p[15] === "1";
        var gap = parseFloat(p[16]);
        if (inRange(gap, GAP_RANGE)) gapMm = gap;
        var labels = parseInt(p[17], 10);
        if (labels >= 0 && labels < LABEL_SETS.length) labelIndex = labels;
        previewEnabled = p[18] === "1";
        var labelGap = parseFloat(p[19]);
        if (inRange(labelGap, LABEL_GAP_RANGE)) labelGapMm = labelGap;
        var merge = parseFloat(p[20]);
        if (inRange(merge, MERGE_RANGE)) mergeNm = merge;
    }
})();
