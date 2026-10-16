// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// DNA 모형: DNA 평면 모형과 DNA·RNA 염기 서열을 한 창의 탭으로 묶었다.
// 두 탭은 서로 다른 그림이라 옵션을 공유하지 않는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
//   평면 모형: 당·인산·염기 도형으로 1가닥·2가닥 DNA를 그린다.
//   염기 서열: 아미노산 서열에서 코돈(드롭다운)을 골라 DNA 1·2 가닥과 RNA 서열을 글자로 나열하고, 코돈 중괄호·화살표·단백질 줄과 줄 이름까지 그린다. 가릴 코돈 번호를 박스로 가린다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "DnaModel/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeFlatEngine(), makeSequenceEngine()];

    var win = new Window("dialog", "DNA 모형");
    win.orientation = "column";
    win.alignChildren = "fill";
    win.spacing = 4;
    win.margins = 12;

    // 탭 줄(tabbedpanel)은 탭 수만큼 폭을 차지해 창이 넓어진다. 선택 줄과 겹쳐 쌓은 페이지로 대신한다
    var holder;
    var pages = [];
    var tabBar;
    var radios = [];
    var tabList = null;
    var tabLabels = [];
    for (engineIndex = 0; engineIndex < engines.length; engineIndex++) tabLabels.push(engines[engineIndex].label);
    tabList = win.add("dropdownlist", undefined, tabLabels);
    tabList.alignment = ["left", "center"];
    tabList.selection = 0;
    holder = win.add("group");
    holder.orientation = "stack";
    holder.alignChildren = ["fill", "top"];
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = holder.add("group");
        page.orientation = "column";
        page.alignChildren = "fill";
        page.spacing = 4;
        pages.push(page);
        if (tabList === null) radios.push(tabBar.add("radiobutton", undefined, engines[engineIndex].label));
        engines[engineIndex].error = engines[engineIndex].addRows(page);
        if (engines[engineIndex].error) {
            page.enabled = false;
            if (tabList === null) radios[engineIndex].helpTip = engines[engineIndex].error;
        }
    }

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = true;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { win.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    // 저장된 탭이 선택에 맞지 않으면 선택을 쓰는 탭부터(뒤에서부터) 가능한 탭을 연다
    var tabIndex = 0;
    try {
        var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
        if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
    } catch (tabError) {}
    if (engines[tabIndex].error) {
        for (engineIndex = engines.length - 1; engineIndex >= 0; engineIndex--) {
            if (!engines[engineIndex].error) { tabIndex = engineIndex; break; }
        }
    }
    // 어느 탭도 선택에 맞지 않으면 여기서 끝낸다 — 꺼진 탭을 tabs.selection에 넣으면 ScriptUI가 유형 오류를 던진다
    if (engines[tabIndex].error) {
        var problems = [];
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) problems.push("[" + engines[engineIndex].label + "] " + engines[engineIndex].error);
        alert("선택이 어느 탭에도 맞지 않습니다.\n\n" + problems.join("\n"));
        return;
    }
    var engine = engines[tabIndex];
    if (tabList === null) radios[tabIndex].value = true;
    else tabList.selection = tabIndex;

    function selectTab(next) {
        if (next === tabIndex) return;
        if (engines[next].error) {
            if (tabList === null) { radios[next].value = false; radios[tabIndex].value = true; }
            else tabList.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        engine.clearPreview();
        pages[tabIndex].visible = false;
        tabIndex = next;
        pages[tabIndex].visible = true;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    }
    function radioHandler(index) { return function() { selectTab(index); }; }
    if (tabList === null) {
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) radios[engineIndex].onClick = radioHandler(engineIndex);
    } else {
        tabList.onChange = function() { if (tabList.selection !== null) selectTab(tabList.selection.index); };
    }
    // 페이지는 겹쳐 쌓여 가장 큰 페이지 크기로 잡힌다. 선택되지 않은 페이지는 창이 뜬 뒤(onShow)에 숨긴다.
    // 레이아웃 전에 layout()을 부르면 늘어난 크기가 굳어 창이 줄지 않는다
    function hideInactivePages() {
        for (var pageIndex = 0; pageIndex < pages.length; pageIndex++) pages[pageIndex].visible = pageIndex === tabIndex;
    }
    previewCheck.onClick = function() { engine.setPreview(previewCheck.value); };
    okButton.onClick = function() {
        if (!engine.commit()) return;
        try { app.preferences.setStringPreference(TAB_PREF_KEY, String(tabIndex)); } catch (saveError) {}
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
    win.onShow = function() { hideInactivePages(); engine.setPreview(previewCheck.value); };
    if (typeof bindTabOrder === "function") bindTabOrder(win);
    var result = win.show();
    if (result !== 1) engine.clearPreview();
    try { app.redraw(); } catch (redrawError) {}

    // ==== 평면 모형 ====
    function makeFlatEngine() {
        var api = {label: "평면 모형", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectDnaFlat/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var STROKE_PT = 0.3;
            var MAX_BASES = 60;
            var KAPPA = 0.5522847;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var centerX = viewCenter[0];
            var centerY = viewCenter[1];
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션 (설정 저장 대상)
            var doubleStrand = true;
            var vertical = true;
            var sequence = "AGCTTCA";
            var showSugarO = true;
            var showLetters = true;
            var atSharp = true;           // A·T 뾰족 / G·C 둥글게. 끄면 반대
            var showOH = true;
            var showPrime = false;
            var showLegend = false;
            var purineLenMm = 6;
            var pyrimidineLenMm = 4;
            var baseThickMm = 2.4;        // 염기 네 종류 모두 같은 두께
            var sugarMm = 4;
            var phosphateMm = 3;
            var spacingMm = 4;            // 당 중심 ↔ 인산 중심
            var linkMm = 1.5;             // 당 C1′ 꼭짓점 ↔ 염기 시작
            var strandGapMm = 0.6;        // 짝지은 염기 끝 사이 빈틈
            var phosphateK = 0;
            var sugarK = 0;
            var purineK = 0;
            var pyrimidineK = 20;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;

            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = {purineLenMm: purineLenMm, pyrimidineLenMm: pyrimidineLenMm, baseThickMm: baseThickMm,
                sugarMm: sugarMm, phosphateMm: phosphateMm, spacingMm: spacingMm, linkMm: linkMm, strandGapMm: strandGapMm,
                phosphateK: phosphateK, sugarK: sugarK, purineK: purineK, pyrimidineK: pyrimidineK,
                offsetXmm: offsetXmm, offsetYmm: offsetYmm};
            applySavedSettings();

            var LABEL_WIDTH = 82;       // "당·인산 간격"이 잘리지 않는 너비
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;
            var RESET_BUTTON_WIDTH = 34;

            var dlg = page;

            var structurePanel = addPanel(dlg, "구조");
            var structureRow = structurePanel.add("group");
            structureRow.spacing = 16;
            var strandRow = structureRow.add("group");
            var singleRadio = strandRow.add("radiobutton", undefined, "1가닥");
            var doubleRadio = strandRow.add("radiobutton", undefined, "2가닥");
            singleRadio.value = !doubleStrand;
            doubleRadio.value = doubleStrand;
            var directionRow = structureRow.add("group");
            var horizontalRadio = directionRow.add("radiobutton", undefined, "가로");
            var verticalRadio = directionRow.add("radiobutton", undefined, "세로");
            horizontalRadio.value = !vertical;
            verticalRadio.value = vertical;

            var sequencePanel = addPanel(dlg, "염기서열 (5′ → 3′)");
            var sequenceRow = sequencePanel.add("group");
            var sequenceInput = sequenceRow.add("edittext", undefined, sequence);
            sequenceInput.characters = 22;
            var sequenceNote = sequenceRow.add("statictext", undefined, "A·T·G·C만, 최대 " + MAX_BASES + "개");

            var showPanel = addPanel(dlg, "표시");
            var showRow1 = showPanel.add("group");
            var sugarOCheck = showRow1.add("checkbox", undefined, "당의 산소(O)");
            sugarOCheck.value = showSugarO;
            var lettersCheck = showRow1.add("checkbox", undefined, "염기 글자");
            lettersCheck.value = showLetters;
            var jointRow = showPanel.add("group");
            jointRow.add("statictext", undefined, "접합부");
            var atSharpRadio = jointRow.add("radiobutton", undefined, "A·T 뾰족 / G·C 둥글게");
            var atRoundRadio = jointRow.add("radiobutton", undefined, "A·T 둥글게 / G·C 뾰족");
            atSharpRadio.value = atSharp;
            atRoundRadio.value = !atSharp;
            var showRow2 = showPanel.add("group");
            var ohCheck = showRow2.add("checkbox", undefined, "말단 OH");
            ohCheck.value = showOH;
            var primeCheck = showRow2.add("checkbox", undefined, "5′ · 3′ 표시");
            primeCheck.value = showPrime;
            var legendCheck = showRow2.add("checkbox", undefined, "범례 (그림 오른쪽)");
            legendCheck.value = showLegend;

            var shadePanel = addPanel(dlg, "음영");
            var phosphateKField = addNumberField(shadePanel, "인산", "K", phosphateK, 10, 0, 100, DEFAULTS.phosphateK);
            var sugarKField = addNumberField(shadePanel, "당", "K", sugarK, 10, 0, 100, DEFAULTS.sugarK);
            var purineKField = addNumberField(shadePanel, "A·G", "K", purineK, 10, 0, 100, DEFAULTS.purineK);
            var pyrimidineKField = addNumberField(shadePanel, "T·C", "K", pyrimidineK, 10, 0, 100, DEFAULTS.pyrimidineK);

            var sizePanel = addPanel(dlg, "크기");
            var purineLenField = addNumberField(sizePanel, "A·G 길이", "mm", purineLenMm, 0.1, 1, 30, DEFAULTS.purineLenMm);
            var pyrimidineLenField = addNumberField(sizePanel, "T·C 길이", "mm", pyrimidineLenMm, 0.1, 1, 30, DEFAULTS.pyrimidineLenMm);
            var baseThickField = addNumberField(sizePanel, "염기 두께", "mm", baseThickMm, 0.1, 0.5, 15, DEFAULTS.baseThickMm);
            var sugarField = addNumberField(sizePanel, "당 크기", "mm", sugarMm, 0.1, 1, 20, DEFAULTS.sugarMm);
            var phosphateField = addNumberField(sizePanel, "인산 크기", "mm", phosphateMm, 0.1, 1, 20, DEFAULTS.phosphateMm);
            var spacingField = addNumberField(sizePanel, "당·인산 간격", "mm", spacingMm, 0.1, 1, 30, DEFAULTS.spacingMm);
            var linkField = addNumberField(sizePanel, "당·염기 간격", "mm", linkMm, 0.1, 0, 15, DEFAULTS.linkMm);
            var strandGapField = addNumberField(sizePanel, "두 가닥 간격", "mm", strandGapMm, 0.1, -5, 20, DEFAULTS.strandGapMm);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로", "mm", offsetXmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, DEFAULTS.offsetXmm);
            var offsetYField = addNumberField(positionPanel, "세로", "mm", offsetYmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, DEFAULTS.offsetYmm);
            // 위치는 모형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);

            singleRadio.onClick = updatePreview;
            doubleRadio.onClick = updatePreview;
            horizontalRadio.onClick = updatePreview;
            verticalRadio.onClick = updatePreview;
            sequenceInput.onChanging = updatePreview;
            sugarOCheck.onClick = updatePreview;
            lettersCheck.onClick = updatePreview;
            atSharpRadio.onClick = updatePreview;
            atRoundRadio.onClick = updatePreview;
            ohCheck.onClick = updatePreview;
            primeCheck.onClick = updatePreview;
            legendCheck.onClick = updatePreview;
            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { previewEnabled = on; updatePreview(); };
            api.updatePreview = updatePreview;
            api.clearPreview = clearPreview;
            api.commit = function() {
                if (!readFields(true)) return false;
                clearPreview();
                readFields(false);
                var finalGroup = drawModel();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "DNA Flat";
                saveSettings();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 좌표계
            // -------------------------------------------------------
            // 모형은 (a, b)로 그린다. a = 가닥 방향(1번 가닥의 5′→3′), b = 가닥과 직각(1번→2번 가닥).
            // 세로: a는 아래로, b는 오른쪽으로. 가로: a는 오른쪽으로, b는 아래로. 단위 mm.
            function makeMapper(originX, originY, isVertical) {
                return function(a, b) {
                    if (isVertical) return [originX + b * MM_TO_PT, originY - a * MM_TO_PT];
                    return [originX + a * MM_TO_PT, originY - b * MM_TO_PT];
                };
            }

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            function drawModel() {
                var group = doc.activeLayer.groupItems.add();
                var map = makeMapper(centerX, centerY, vertical);
                var bases = sequence.split("");
                var n = bases.length;

                var sugarR = sugarMm / 2;
                var lateral = spacingMm / 2;                       // 인산이 바깥으로 벗어나는 거리
                var halfPitch = Math.sqrt(Math.max(0.01, spacingMm * spacingMm - lateral * lateral));
                var pitch = halfPitch * 2;                          // 뉴클레오타이드 간격
                var notch = baseThickMm / 2;                        // 피리미딘 홈 깊이 = 퓨린 끝 길이
                var baseStart = 0.951 * sugarR + linkMm;            // 당 중심에서 염기 시작까지
                var strand2 = 2 * baseStart + purineLenMm + pyrimidineLenMm - notch + strandGapMm;

                var i, a, s1, s2;

                // 1. 골격 선 (도형에 가려지도록 먼저)
                // 인산 → C5′(11시 꼭짓점에서 나온 선이 꺾이는 점) → 11시 꼭짓점, 7시 꼭짓점(C3′) → 다음 인산
                for (i = 0; i < n; i++) {
                    a = i * pitch;
                    s1 = sugarPoints(a, 0, -1);
                    drawLine(group, map, a - halfPitch, -lateral, s1.c5[0], s1.c5[1]);
                    drawLine(group, map, s1.c5[0], s1.c5[1], s1.v11[0], s1.v11[1]);
                    if (i < n - 1) drawLine(group, map, s1.v7[0], s1.v7[1], a + halfPitch, -lateral);
                    else if (showOH) drawLineTo(group, map, s1.v7, [a + halfPitch, -lateral], 0.55);
                    drawLine(group, map, s1.c1[0], s1.c1[1], a, baseStart);
                    if (doubleStrand) {
                        s2 = sugarPoints(a, strand2, 1);
                        drawLine(group, map, s2.c1[0], s2.c1[1], a, strand2 - baseStart);
                        drawLine(group, map, a + halfPitch, strand2 + lateral, s2.c5[0], s2.c5[1]);
                        drawLine(group, map, s2.c5[0], s2.c5[1], s2.v11[0], s2.v11[1]);
                        if (i > 0) drawLine(group, map, s2.v7[0], s2.v7[1], a - halfPitch, strand2 + lateral);
                        else if (showOH) drawLineTo(group, map, s2.v7, [a - halfPitch, strand2 + lateral], 0.55);
                    }
                }

                // 2. 염기 → 당 → 인산 (뒤에 그린 것이 위)
                for (i = 0; i < n; i++) {
                    a = i * pitch;
                    drawBase(group, map, bases[i], a, baseStart, 1);
                    if (doubleStrand) drawBase(group, map, complement(bases[i]), a, strand2 - baseStart, -1);
                }
                for (i = 0; i < n; i++) {
                    a = i * pitch;
                    drawSugar(group, map, a, 0, -1);
                    drawPhosphate(group, map, a - halfPitch, -lateral);
                    if (doubleStrand) {
                        drawSugar(group, map, a, strand2, 1);
                        drawPhosphate(group, map, a + halfPitch, strand2 + lateral);
                    }
                }

                // 3. 말단 글자
                var endPt = Math.max(5, phosphateMm * MM_TO_PT * 0.55);
                if (showOH) {
                    placeText(group, map, "OH", (n - 1) * pitch + halfPitch, -lateral, endPt);
                    if (doubleStrand) placeText(group, map, "OH", -halfPitch, strand2 + lateral, endPt);
                }
                if (showPrime) {
                    var reach = phosphateMm / 2 + 1.5;
                    placeText(group, map, "5'", -halfPitch - reach, -lateral, endPt);
                    placeText(group, map, "3'", (n - 1) * pitch + halfPitch + reach, -lateral, endPt);
                    if (doubleStrand) {
                        placeText(group, map, "3'", -halfPitch - reach, strand2 + lateral, endPt);
                        placeText(group, map, "5'", (n - 1) * pitch + halfPitch + reach, strand2 + lateral, endPt);
                    }
                }

                var gb = group.geometricBounds;
                moveItem(group, centerX - (gb[0] + gb[2]) / 2, centerY - (gb[1] + gb[3]) / 2);
                if (showLegend) drawLegend(group);
                return group;
            }

            function complement(base) {
                if (base === "A") return "T";
                if (base === "T") return "A";
                if (base === "G") return "C";
                return "G";
            }

            function isPurine(base) {
                return base === "A" || base === "G";
            }

            // 뾰족한 끝을 갖는 짝: A·T(기본) 또는 G·C
            function isSharp(base) {
                var atPair = (base === "A" || base === "T");
                return atSharp ? atPair : !atPair;
            }

            // 염기 막대. a = 가닥 위 위치, b0 = 당 가장자리, dir = 짝을 향한 방향(+1/-1)
            function drawBase(group, map, base, a, b0, dir) {
                var purine = isPurine(base);
                var length = purine ? purineLenMm : pyrimidineLenMm;
                var half = baseThickMm / 2;
                var tip = baseThickMm / 2;            // 퓨린 돌기와 피리미딘 홈은 같은 깊이
                var sharp = isSharp(base);
                var bEnd = b0 + dir * length;
                var bInner = bEnd - dir * tip;
                var ka = KAPPA * half;   // 가닥 방향 핸들
                var kb = KAPPA * tip;    // 짝 방향 핸들
                var pts;

                if (purine) {
                    // 튀어나온 끝
                    if (sharp) {
                        pts = [pt(a - half, b0), pt(a - half, bInner), pt(a, bEnd), pt(a + half, bInner), pt(a + half, b0)];
                    } else {
                        pts = [pt(a - half, b0),
                            pt(a - half, bInner, null, [a - half, bInner + dir * kb]),
                            pt(a, bEnd, [a - ka, bEnd], [a + ka, bEnd]),
                            pt(a + half, bInner, [a + half, bInner + dir * kb], null),
                            pt(a + half, b0)];
                    }
                } else {
                    // 파인 끝
                    if (sharp) {
                        pts = [pt(a - half, b0), pt(a - half, bEnd), pt(a, bInner), pt(a + half, bEnd), pt(a + half, b0)];
                    } else {
                        pts = [pt(a - half, b0),
                            pt(a - half, bEnd, null, [a - half, bEnd - dir * kb]),
                            pt(a, bInner, [a - ka, bInner], [a + ka, bInner]),
                            pt(a + half, bEnd, [a + half, bEnd - dir * kb], null),
                            pt(a + half, b0)];
                    }
                }
                var path = buildPath(group, map, pts, true);
                stylePath(path, purine ? purineK : pyrimidineK);

                if (showLetters) {
                    var textPt = Math.max(4, Math.min(baseThickMm, length) * MM_TO_PT * 0.7);
                    placeText(group, map, base, a, b0 + dir * (length - tip) / 2, textPt);
                }
            }

            // 당 오각형의 기준점. apexDir = 꼭짓점(O)이 향하는 가닥 방향(-1 = 5′ 쪽).
            // 1번 가닥(왼쪽, apexDir -1) 기준으로 12시 꼭짓점 = O, 11시 = C4′ 쪽, 7시 = C3′.
            // 2번 가닥은 180도 돌린 것이라 부호만 뒤집힌다.
            function sugarPoints(a, b, apexDir) {
                var r = sugarMm / 2;
                var s = apexDir;
                return {
                    apex: [a + s * r, b],
                    v11: [a + s * 0.309 * r, b + s * 0.951 * r],
                    v7: [a - s * 0.809 * r, b + s * 0.588 * r],
                    c1: [a + s * 0.309 * r, b - s * 0.951 * r],   // 2시 꼭짓점, 염기가 붙는 C1′
                    c5: [a + s * 0.66 * r, b + s * 1.30 * r]   // 11시 꼭짓점에서 바깥으로 꺾이는 C5′
                };
            }

            // 당: 정오각형. O는 12시 꼭짓점 중심에 놓고 뒤에 흰 사각형을 깔아 결합선을 끊는다.
            function drawSugar(group, map, a, b, apexDir) {
                var r = sugarMm / 2;
                var pts = [];
                for (var i = 0; i < 5; i++) {
                    var angle = i * 2 * Math.PI / 5;
                    // 꼭짓점 하나가 가닥 방향으로 향하도록 회전
                    pts.push(pt(a + apexDir * r * Math.cos(angle), b + r * Math.sin(angle)));
                }
                stylePath(buildPath(group, map, pts, true), sugarK);
                if (showSugarO) {
                    var textPt = Math.max(4, sugarMm * MM_TO_PT * 0.42);
                    // 꼭짓점 중심보다 조금 안쪽(반지름의 15%)에 둔다
                    var text = placeText(group, map, "O", a + apexDir * r * 0.85, b, textPt);
                    var gb = text.geometricBounds;
                    var pad = textPt * 0.12;
                    var mask = group.pathItems.rectangle(gb[1] + pad, gb[0] - pad,
                        (gb[2] - gb[0]) + pad * 2, (gb[1] - gb[3]) + pad * 2);
                    mask.filled = true;
                    mask.fillColor = makeGray(0);
                    mask.stroked = false;
                    mask.move(text, ElementPlacement.PLACEAFTER);   // 글자 바로 아래
                }
            }

            function drawPhosphate(group, map, a, b) {
                var center = map(a, b);
                var dia = phosphateMm * MM_TO_PT;
                var circle = group.pathItems.ellipse(center[1] + dia / 2, center[0] - dia / 2, dia, dia);
                stylePath(circle, phosphateK);
                placeText(group, map, "P", a, b, Math.max(4, dia * 0.7));
            }

            // from에서 to 쪽으로 ratio만큼만 긋는다 (말단 OH 글자 앞에서 멈추는 선)
            function drawLineTo(group, map, from, to, ratio) {
                return drawLine(group, map, from[0], from[1],
                    from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio);
            }

            function drawLine(group, map, a1, b1, a2, b2) {
                var path = group.pathItems.add();
                path.setEntirePath([map(a1, b1), map(a2, b2)]);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = STROKE_PT;
                path.strokeColor = makeGray(100);
                return path;
            }

            // -------------------------------------------------------
            // 범례: 그림 오른쪽에 인산·당·T·C·A·G
            // -------------------------------------------------------
            function drawLegend(group) {
                var bounds = group.geometricBounds; // [left, top, right, bottom]
                var marginMm = 5;
                var gapMm = 1;                                   // 항목 위아래 간격
                var symbolMm = Math.max(sugarMm, phosphateMm, purineLenMm, pyrimidineLenMm);
                var textPt = 8;
                var padMm = 2;                                   // 테두리와 내용 사이 여백
                var sugarHeightMm = sugarMm * 0.905;             // 꼭짓점이 위인 정오각형의 높이

                var legend = group.groupItems.add();
                legend.name = "Legend";
                // 범례는 항상 세로 좌표계(b → 오른쪽)로 그려 염기가 오른쪽을 향하게 한다
                var originX = bounds[2] + (marginMm + padMm) * MM_TO_PT;
                var originY = bounds[1] - padMm * MM_TO_PT;
                var map = makeMapper(originX, originY, true);

                // 항목마다 실제 높이를 써서 위아래 여백이 똑같이 1mm가 되게 한다
                var items = [
                    {label: "인산", height: phosphateMm,
                        draw: function(a) { drawPhosphate(legend, map, a, symbolMm / 2); }},
                    {label: "당", height: sugarHeightMm,
                        draw: function(a) { drawSugar(legend, map, a + (sugarMm / 2 - sugarHeightMm / 2), symbolMm / 2, -1); }},
                    {label: "타이민(T)", height: baseThickMm,
                        draw: function(a) { drawBase(legend, map, "T", a, symbolMm / 2 - pyrimidineLenMm / 2, 1); }},
                    {label: "사이토신(C)", height: baseThickMm,
                        draw: function(a) { drawBase(legend, map, "C", a, symbolMm / 2 - pyrimidineLenMm / 2, 1); }},
                    {label: "아데닌(A)", height: baseThickMm,
                        draw: function(a) { drawBase(legend, map, "A", a, symbolMm / 2 - purineLenMm / 2, 1); }},
                    {label: "구아닌(G)", height: baseThickMm,
                        draw: function(a) { drawBase(legend, map, "G", a, symbolMm / 2 - purineLenMm / 2, 1); }}
                ];
                var labelB = symbolMm + 3;
                var cursor = 0;                                  // 다음 항목의 위 끝
                for (var i = 0; i < items.length; i++) {
                    var a = cursor + items[i].height / 2;
                    items[i].draw(a);
                    placeText(legend, map, items[i].label, a, labelB, textPt, true);
                    cursor += items[i].height + gapMm;
                }

                // 테두리: 그려진 내용의 경계에 사방 2mm
                var content = legend.geometricBounds; // [left, top, right, bottom]
                var pad = padMm * MM_TO_PT;
                var box = legend.pathItems.rectangle(content[1] + pad, content[0] - pad,
                    (content[2] - content[0]) + pad * 2, (content[1] - content[3]) + pad * 2);
                box.filled = false;
                box.stroked = true;
                box.strokeWidth = STROKE_PT;
                box.strokeColor = makeGray(100);
                box.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // -------------------------------------------------------
            // 패스 · 글자 · 색
            // -------------------------------------------------------
            function pt(a, b, leftHandle, rightHandle) {
                return {a: a, b: b, left: leftHandle, right: rightHandle};
            }

            function buildPath(container, map, pts, closed) {
                var path = container.pathItems.add();
                for (var i = 0; i < pts.length; i++) {
                    var p = path.pathPoints.add();
                    var anchor = map(pts[i].a, pts[i].b);
                    p.anchor = anchor;
                    p.leftDirection = pts[i].left ? map(pts[i].left[0], pts[i].left[1]) : anchor;
                    p.rightDirection = pts[i].right ? map(pts[i].right[0], pts[i].right[1]) : anchor;
                    p.pointType = (pts[i].left && pts[i].right) ? PointType.SMOOTH : PointType.CORNER;
                }
                path.closed = closed;
                return path;
            }

            function stylePath(path, k) {
                path.filled = true;
                path.fillColor = makeGray(k);
                path.stroked = true;
                path.strokeWidth = STROKE_PT;
                path.strokeColor = makeGray(100);
                return path;
            }

            // 글자를 (a, b) 중심에 놓는다. alignLeft면 왼쪽 끝을 그 자리에 맞춘다.
            function placeText(container, map, text, a, b, sizePt, alignLeft) {
                var frame = container.textFrames.add();
                frame.contents = text;
                var attrs = frame.textRange.characterAttributes;
                attrs.size = sizePt;
                attrs.fillColor = makeGray(100);
                applyFontRule(frame);
                var target = map(a, b);
                var gb = frame.geometricBounds;
                var dx = alignLeft ? (target[0] - gb[0]) : (target[0] - (gb[0] + gb[2]) / 2);
                var dy = target[1] - (gb[1] + gb[3]) / 2;
                frame.translate(dx, dy);
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

            // 서체 규칙(07_문자/한글·영문 서체 적용.jsx와 동일): 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt)
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
                previewGroup.name = "DNA Flat Preview";
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            function readFields(showAlert) {
                var cleaned = String(sequenceInput.text).toUpperCase().replace(/[^ATGC]/g, "");
                if (cleaned.length < 1 || cleaned.length > MAX_BASES) {
                    if (showAlert) alert("염기서열은 A·T·G·C로 1개 이상 " + MAX_BASES + "개 이하로 입력해주세요.");
                    return false;
                }

                var fields = [
                    [purineLenField, "A·G 길이"], [pyrimidineLenField, "T·C 길이"],
                    [baseThickField, "염기 두께"],
                    [sugarField, "당 크기"], [phosphateField, "인산 크기"],
                    [spacingField, "당·인산 간격"], [linkField, "당·염기 간격"],
                    [strandGapField, "두 가닥 간격"],
                    [phosphateKField, "인산 음영"], [sugarKField, "당 음영"],
                    [purineKField, "A·G 음영"], [pyrimidineKField, "T·C 음영"],
                    [offsetXField, "가로"], [offsetYField, "세로"]
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

                sequence = cleaned;
                doubleStrand = doubleRadio.value;
                vertical = verticalRadio.value;
                showSugarO = sugarOCheck.value;
                showLetters = lettersCheck.value;
                atSharp = atSharpRadio.value;
                showOH = ohCheck.value;
                showPrime = primeCheck.value;
                showLegend = legendCheck.value;
                purineLenMm = values[0];
                pyrimidineLenMm = values[1];
                baseThickMm = values[2];
                sugarMm = values[3];
                phosphateMm = values[4];
                spacingMm = values[5];
                linkMm = values[6];
                strandGapMm = values[7];
                phosphateK = values[8];
                sugarK = values[9];
                purineK = values[10];
                pyrimidineK = values[11];
                offsetXmm = values[12];
                offsetYmm = values[13];
                return true;
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

            function addNumberField(parent, labelText, unit, value, step, minimum, maximum, initial) {
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
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = RESET_BUTTON_WIDTH;
                reset.helpTip = "처음 값으로 되돌리기";

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
                // 입력창에 처음 값을 친 것과 같은 경로로 되돌린다
                reset.onClick = function() {
                    input.text = formatValue(initial);
                    input.onChange();
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
                var parts = ["v3", doubleStrand ? 1 : 0, vertical ? 1 : 0, sequence,
                    showSugarO ? 1 : 0, showLetters ? 1 : 0, atSharp ? 1 : 0,
                    showOH ? 1 : 0, showPrime ? 1 : 0, showLegend ? 1 : 0,
                    purineLenMm, pyrimidineLenMm, baseThickMm,
                    sugarMm, phosphateMm, spacingMm, linkMm, strandGapMm,
                    phosphateK, sugarK, purineK, pyrimidineK,
                    offsetXmm, offsetYmm];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v3" || p.length < 24) return;

                doubleStrand = (p[1] === "1");
                vertical = (p[2] === "1");
                var seq = String(p[3]).toUpperCase().replace(/[^ATGC]/g, "");
                if (seq.length >= 1 && seq.length <= MAX_BASES) sequence = seq;
                showSugarO = (p[4] === "1");
                showLetters = (p[5] === "1");
                atSharp = (p[6] === "1");
                showOH = (p[7] === "1");
                showPrime = (p[8] === "1");
                showLegend = (p[9] === "1");
                purineLenMm = restoreNumber(p[10], purineLenMm, 1, 30);
                pyrimidineLenMm = restoreNumber(p[11], pyrimidineLenMm, 1, 30);
                baseThickMm = restoreNumber(p[12], baseThickMm, 0.5, 15);
                sugarMm = restoreNumber(p[13], sugarMm, 1, 20);
                phosphateMm = restoreNumber(p[14], phosphateMm, 1, 20);
                spacingMm = restoreNumber(p[15], spacingMm, 1, 30);
                linkMm = restoreNumber(p[16], linkMm, 0, 15);
                strandGapMm = restoreNumber(p[17], strandGapMm, -5, 20);
                phosphateK = restoreNumber(p[18], phosphateK, 0, 100);
                sugarK = restoreNumber(p[19], sugarK, 0, 100);
                purineK = restoreNumber(p[20], purineK, 0, 100);
                pyrimidineK = restoreNumber(p[21], pyrimidineK, 0, 100);
                offsetXmm = restoreNumber(p[22], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[23], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseFloat(text);
                if (isNaN(value) || value < minimum || value > maximum) return fallback;
                return value;
            }
            return null;
        }
        return api;
    }

    // ==== 염기 서열 ====
    function makeSequenceEngine() {
        var api = {label: "염기 서열", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectDnaRnaSequence/settings";
            var mmToPt = 2.83464567;
            var PREVIEW_NAME = "DnaRnaSequence_Preview";
            var ENG_FONT_NAME = "GSMediumB1";
            var MAX_AMINO = 8;                   // 코돈 행 수(아미노산 최대 개수)
            var BRACE_HEIGHT_MM = 3;             // 코돈 중괄호 높이
            var LABEL_STRAND_GAP_MM = 8.5;       // 줄 이름 칸과 염기 줄 사이
            var LABEL_PROCESS_GAP_MM = 1.5;      // 과정 이름(가)와 왼쪽 화살표 사이
            // 작살형 화살촉(끝이 원점, 뒤쪽이 +y, 선 두께 1pt 기준 pt). 선은 lineEnd만큼 줄인다
            var ARROW_HEAD = {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]};
            var LABELS = ["?",
                String.fromCharCode(0x24D0), String.fromCharCode(0x24D1), String.fromCharCode(0x24D2),   // ⓐⓑⓒ
                String.fromCharCode(0x3260), String.fromCharCode(0x3261), String.fromCharCode(0x3262),   // ㉠㉡㉢
                String.fromCharCode(0x2160), String.fromCharCode(0x2161), String.fromCharCode(0x2162)];  // ⅠⅡⅢ
            var PROTEIN_CHOICES = ["이름"].concat(LABELS);
            var TEMPLATE_CHOICES = ["위 가닥 (DNA 1)", "아래 가닥 (DNA 2)"];
            var NAME_CHOICES = ["한글", "3글자 (Met)"];
            var maskNames = ["DNA 1", "DNA 2", "RNA"];
            var NUMBER_KEYS = ["backboneWidth", "tickWidth", "tickLength", "arrowWidth", "fontSize", "baseGap", "strandGap", "rnaGap", "arrowLength", "offsetX", "offsetY"];
            var NUMBER_MINS = [0.1, 0.1, 0, 0.1, 4, 1, 2, 2, 2, -100, -100];
            var NUMBER_MAXS = [5, 5, 20, 3, 30, 30, 60, 60, 40, 100, 100];
            // 뒤에 덧붙인 숫자(칸 29~31): RNA–중괄호 간격, DNA·RNA 골격 색(K)
            var EXTRA_KEYS = ["braceGap", "dnaColor", "rnaColor"];
            var EXTRA_MINS = [0, 0, 0];
            var EXTRA_MAXS = [20, 100, 100];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var engFont = findTextFont([ENG_FONT_NAME]);
            var korFont = findTextFont(["SpoqaHanSansNeo-Regular", ENG_FONT_NAME]);
            var symbolFont = findTextFont(["Batang", "BatangOTF", ENG_FONT_NAME]);
            var romanFont = findRomanFont();
            // 저장된 값을 덮기 전의 값이 R 버튼의 초기값이다
            var DEFAULTS = defaultOptions();
            var options = readSettings();
            var aaList = parseAminoAcids(options.aaText).list;
            var previewGroup = null;
            var previewPending = false;
            var lastPreviewTime = 0;
            var PREVIEW_INTERVAL_MS = 40;
            var committed = false;
            var refreshing = false;

            removeLeftoverGroups();

            var win = page;

            // ---- 아미노산 서열 입력 ----
            var seqRow = win.add("group");
            seqRow.alignChildren = ["left", "center"];
            addCaption(seqRow, "아미노산 서열");
            var seqInput = seqRow.add("edittext", undefined, options.aaText);
            seqInput.preferredSize.width = 220;
            seqInput.helpTip = "1글자(MSG)·3글자(Met Ser Gly)·한글 이름(메싸이오닌)을 공백·쉼표·하이픈으로 나눠 입력. 종결은 Stop 또는 *. 최대 " + MAX_AMINO + "개";
            var seqButton = seqRow.add("button", undefined, "완료");
            seqButton.preferredSize.width = 50;
            seqButton.onClick = function() { applyInputs(); };
            seqInput.onChange = function() { applyInputs(); };

            // ---- 코돈 · 단백질 칸 ----
            var codonPanel = win.add("panel", undefined, "코돈 · 단백질 칸");
            codonPanel.alignChildren = "fill";
            codonPanel.spacing = 2;
            codonPanel.margins = [8, 12, 8, 6];
            var codonRows = [];
            for (var r = 0; r < MAX_AMINO; r++) {
                var codonRow = codonPanel.add("group");
                codonRow.alignChildren = ["left", "center"];
                codonRow.spacing = 3;
                var rowCaption = addCaption(codonRow, " ");
                rowCaption.preferredSize.width = 120;
                var codonList = codonRow.add("dropdownlist", undefined, []);
                codonList.preferredSize.width = 70;
                codonList.helpTip = "이 아미노산의 mRNA 코돈";
                var proteinList = codonRow.add("dropdownlist", undefined, PROTEIN_CHOICES);
                proteinList.preferredSize.width = 80;
                proteinList.helpTip = "단백질 줄에 쓸 표시 (이름 / 박스 문자)";
                codonList.onChange = makePickHandler(r, codonList, options.picks);
                proteinList.onChange = makePickHandler(r, proteinList, options.proteins);
                codonRows.push({caption: rowCaption, codons: codonList, protein: proteinList});
            }

            // ---- 구성 ----
            var buildPanel = win.add("panel", undefined, "구성");
            buildPanel.alignChildren = "fill";
            buildPanel.spacing = 2;
            buildPanel.margins = [8, 12, 8, 6];
            var templateRow = buildPanel.add("group");
            templateRow.alignChildren = ["left", "center"];
            addCaption(templateRow, "주형 가닥");
            var templateList = templateRow.add("dropdownlist", undefined, TEMPLATE_CHOICES);
            templateList.selection = options.templateTop ? 0 : 1;
            templateList.helpTip = "RNA를 만드는 쪽. RNA는 주형의 반대 가닥과 같은 서열(U)이 됩니다";
            templateList.onChange = function() {
                if (templateList.selection === null) return;
                options.templateTop = templateList.selection.index === 0;
                updatePreview();
            };
            var nameRow = buildPanel.add("group");
            nameRow.alignChildren = ["left", "center"];
            addCaption(nameRow, "이름 표기");
            var nameList = nameRow.add("dropdownlist", undefined, NAME_CHOICES);
            nameList.selection = options.nameKorean ? 0 : 1;
            nameList.helpTip = "코돈 행과 단백질 칸의 '이름'에 쓸 표기. 한글은 2022 개정 교육과정 유전 부호표 표기";
            nameList.onChange = function() {
                if (nameList.selection === null) return;
                options.nameKorean = nameList.selection.index === 0;
                refreshCodonRows();
                updatePreview();
            };
            var namesRow = buildPanel.add("group");
            namesRow.alignChildren = ["left", "center"];
            var namesCheck = namesRow.add("checkbox", undefined, "줄 이름");
            namesCheck.preferredSize.width = 80;
            namesCheck.value = options.showNames;
            namesCheck.onClick = function() { options.showNames = namesCheck.value; updatePreview(); };
            var namesInput = namesRow.add("edittext", undefined, options.names);
            namesInput.preferredSize.width = 220;
            namesInput.helpTip = "DNA, RNA, 과정, 단백질 순서로 쉼표로 나눠 입력 (비우면 그 이름만 생략)";
            namesInput.onChange = function() { applyInputs(); };
            var belowRow = buildPanel.add("group");
            belowRow.alignChildren = ["left", "center"];
            var braceCheck = belowRow.add("checkbox", undefined, "코돈 중괄호");
            braceCheck.value = options.showBraces;
            braceCheck.onClick = function() { options.showBraces = braceCheck.value; updatePreview(); };
            var arrowCheck = belowRow.add("checkbox", undefined, "화살표");
            arrowCheck.value = options.showArrows;
            arrowCheck.helpTip = "코돈 중괄호 아래 화살표와 왼쪽 줄 이름 사이 화살표";
            arrowCheck.onClick = function() { options.showArrows = arrowCheck.value; updatePreview(); };
            var proteinCheck = belowRow.add("checkbox", undefined, "단백질 줄");
            proteinCheck.value = options.showProtein;
            proteinCheck.onClick = function() { options.showProtein = proteinCheck.value; updatePreview(); };

            // ---- 가릴 서열 ----
            var maskPanel = win.add("panel", undefined, "가릴 염기 번호 · 박스 문자");
            maskPanel.alignChildren = "fill";
            maskPanel.spacing = 2;
            maskPanel.margins = [8, 12, 8, 6];
            var maskInputs = [];
            for (var m = 0; m < 3; m++) {
                var maskRow = maskPanel.add("group");
                maskRow.alignChildren = ["left", "center"];
                maskRow.spacing = 3;
                addCaption(maskRow, maskNames[m]);
                var maskInput = maskRow.add("edittext", undefined, options.masks[m]);
                maskInput.preferredSize.width = 150;
                maskInput.helpTip = "그 줄의 왼쪽부터 센 염기 번호. 예: 1~5, 8~10 (쉼표로 여러 구간). 비우면 가리지 않음";
                maskInput.onChange = function() { applyInputs(); };
                maskInputs.push(maskInput);
                var labelList = maskRow.add("dropdownlist", undefined, LABELS);
                labelList.selection = options.labels[m];
                labelList.helpTip = "박스 안에 쓸 문자";
                labelList.onChange = makePickHandler(m, labelList, options.labels);
            }

            // ---- 조절 ----
            var linePanel = foldPanel(win, "선 · 글자", true, "line");
            addRow(linePanel, "골격 굵기", "backboneWidth", 0.1, 5, "pt", false);
            addRow(linePanel, "연결선 굵기", "tickWidth", 0.1, 5, "pt", false);
            addRow(linePanel, "연결선 길이", "tickLength", 0, 20, "mm", false);
            addRow(linePanel, "화살표 굵기", "arrowWidth", 0.1, 3, "pt", false);
            addRow(linePanel, "글자 크기", "fontSize", 4, 30, "pt", false);
            addRow(linePanel, "DNA 골격 색", "dnaColor", 0, 100, "K", false);
            addRow(linePanel, "RNA 골격 색", "rnaColor", 0, 100, "K", false);

            var gapPanel = foldPanel(win, "간격", true, "gap");
            addRow(gapPanel, "염기 간격", "baseGap", 1, 30, "mm", false);
            addRow(gapPanel, "DNA 1–2", "strandGap", 2, 60, "mm", false);
            addRow(gapPanel, "DNA 2–RNA", "rnaGap", 2, 60, "mm", false);
            addRow(gapPanel, "RNA–중괄호", "braceGap", 0, 20, "mm", false);
            addRow(gapPanel, "화살표 길이", "arrowLength", 2, 40, "mm", false);

            var positionPanel = win.add("panel", undefined, "위치");
            positionPanel.alignChildren = "fill";
            positionPanel.spacing = 2;
            addRow(positionPanel, "가로", "offsetX", -100, 100, "mm", true);
            addRow(positionPanel, "세로", "offsetY", -100, 100, "mm", true);

            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 380;

            refreshCodonRows();

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(); };
            api.updatePreview = function() { updatePreview(); };
            api.clearPreview = function() { if (!committed) clearPreview(); };
            api.commit = function() {
                var parsedNow = parseAminoAcids(seqInput.text);
                if (parsedNow.error !== null) {
                    status.text = parsedNow.error;
                    return false;
                }
                if (applyInputs(true)) previewPending = true;
                if (aaList.length === 0) {
                    status.text = "아미노산 서열을 입력해주세요.";
                    return false;
                }
                if (previewPending && !updatePreview()) return false;
                if (previewGroup === null && !buildPreview()) return false;
                committed = true;
                previewGroup.name = "DnaRnaSequence";
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
            function foldPanel(parent, title, collapsed, key) {
                if (typeof makeCollapsiblePanel === "function") return makeCollapsiblePanel(parent, title, collapsed, "DnaSeq/" + key);
                var panel = parent.add("panel", undefined, title);
                panel.alignChildren = "fill";
                panel.spacing = 2;
                return panel;
            }

            function addCaption(row, text) {
                var caption = row.add("statictext", undefined, text);
                caption.preferredSize.width = 80;
                return caption;
            }

            // 드롭다운 선택을 values[index]에 쓰고 다시 그린다
            function makePickHandler(index, list, values) {
                return function() {
                    if (refreshing || list.selection === null) return;
                    values[index] = list.selection.index;
                    updatePreview();
                };
            }

            // 입력창 글을 options로 옮기고 아미노산이 바뀌면 코돈 행을 다시 채운다. 바뀐 게 있으면 true
            function applyInputs(quiet) {
                var changed = false;
                var parsed = parseAminoAcids(seqInput.text);
                if (parsed.error !== null) {
                    status.text = parsed.error;
                    return false;
                }
                if (parsed.list.length > MAX_AMINO) {
                    status.text = "아미노산은 " + MAX_AMINO + "개까지 입력할 수 있습니다.";
                    return false;
                }
                if (seqInput.text !== options.aaText) { options.aaText = seqInput.text; changed = true; }
                if (aaList.join(",") !== parsed.list.join(",")) {
                    aaList = parsed.list;
                    refreshCodonRows();
                    changed = true;
                }
                if (namesInput.text !== options.names) { options.names = namesInput.text.replace(/\|/g, ""); changed = true; }
                for (var i = 0; i < 3; i++) {
                    var mask = maskInputs[i].text.replace(/[^0-9~\-–, ]/g, "");
                    if (mask !== options.masks[i]) { options.masks[i] = mask; changed = true; }
                }
                if (changed && quiet !== true) updatePreview();
                return changed;
            }

            // 아미노산 목록에 맞춰 코돈 행의 이름·코돈 목록을 다시 채운다
            function refreshCodonRows() {
                refreshing = true;
                var table = codonTable();
                for (var i = 0; i < MAX_AMINO; i++) {
                    var row = codonRows[i];
                    row.codons.removeAll();
                    if (i < aaList.length) {
                        row.caption.text = (i + 1) + "  " + aminoName(aaList[i], options.nameKorean);
                        var codons = table[aaList[i]];
                        for (var c = 0; c < codons.length; c++) row.codons.add("item", codons[c]);
                        var pick = options.picks[i];
                        row.codons.selection = (pick >= 0 && pick < codons.length) ? pick : 0;
                        row.protein.selection = options.proteins[i];
                        row.codons.enabled = true;
                        row.protein.enabled = true;
                    } else {
                        row.caption.text = " ";
                        row.codons.enabled = false;
                        row.protein.selection = null;
                        row.protein.enabled = false;
                    }
                }
                refreshing = false;
            }

            function addRow(panel, label, key, min, max, unit, positionOnly) {
                var row = panel.add("group");
                row.spacing = 3;
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = 80;
                var step = unit === "K" ? 10 : (unit === "mm" ? 0.1 : (key === "fontSize" ? 0.5 : 0.1));
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 5;
                var slider = row.add("scrollbar", undefined, options[key], min, max);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = 196;
                var reset = row.add("button", undefined, "R");
                reset.preferredSize.width = 34;
                reset.helpTip = "처음 값으로 되돌리기";
                function apply(value, dragging) {
                    value = Math.round(value * 100) / 100;
                    if (!isFinite(value) || value < min || value > max) {
                        input.text = String(options[key]);
                        return;
                    }
                    var previous = options[key];
                    options[key] = value;
                    slider.value = value;
                    input.text = String(value);
                    if (value === previous) {
                        if (!dragging && previewPending) updatePreview();
                        return;
                    }
                    if (positionOnly) {
                        // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
                        try {
                            var delta = (value - previous) * mmToPt;
                            if (previewGroup !== null) {
                                previewGroup.translate(key === "offsetX" ? delta : 0, key === "offsetY" ? delta : 0);
                            }
                            app.redraw();
                        } catch (e) { clearPreview(); status.text = "이동 오류: " + e; }
                    } else {
                        updatePreview(dragging);
                    }
                }
                slider.onChanging = function() { apply(slider.value, true); };
                slider.onChange = function() { apply(slider.value); };
                input.onChange = function() {
                    if (!/\S/.test(input.text)) { input.text = String(options[key]); return; }
                    apply(Number(input.text));
                };
                // 입력창에 처음 값을 친 것과 같은 경로로 되돌린다
                reset.onClick = function() {
                    input.text = String(DEFAULTS[key]);
                    input.onChange();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview(dragging) {
                previewPending = true;
                if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return true;
                status.text = " ";
                try {
                    if (!options.preview) {
                        clearPreview();
                    } else if (!buildPreview()) {
                        return false;
                    }
                    previewPending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
                    return false;
                }
            }

            function buildPreview() {
                clearPreview();
                if (aaList.length === 0) {
                    status.text = "아미노산 서열을 입력하고 '완료'를 누르세요.";
                    return false;
                }
                previewGroup = doc.activeLayer.groupItems.add();
                previewGroup.name = PREVIEW_NAME;
                var missing = drawAll(previewGroup);
                previewGroup.translate(options.offsetX * mmToPt, options.offsetY * mmToPt);
                if (missing.length > 0) status.text = missing.join(", ") + ": 가릴 염기 번호를 확인하세요.";
                return true;
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {
                        try { app.redraw(); previewGroup.remove(); } catch (e2) {}
                    }
                    previewGroup = null;
                }
                removeLeftoverGroups();
            }

            function removeLeftoverGroups() {
                try {
                    var groups = doc.activeLayer.groupItems;
                    for (var i = groups.length - 1; i >= 0; i--) {
                        if (groups[i].name === PREVIEW_NAME) {
                            try { groups[i].remove(); } catch (e) {}
                        }
                    }
                } catch (e2) {}
            }

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            // DNA 두 줄·RNA·(코돈 중괄호·화살표·단백질 줄·줄 이름)을 그리고, 번호가 틀린 가릴 줄 이름을 돌려준다
            function drawAll(group) {
                var count = aaList.length;
                var table = codonTable();
                var codons = [];
                for (var a = 0; a < count; a++) {
                    var choices = table[aaList[a]];
                    var pick = options.picks[a];
                    codons.push(choices[(pick >= 0 && pick < choices.length) ? pick : 0]);
                }
                var strands = buildStrands(codons, options.templateTop);
                var seq1 = strands.dna1;
                var seq2 = strands.dna2;
                var rna = strands.rna;
                var fs = options.fontSize;
                var gap = options.baseGap * mmToPt;
                var tick = options.tickLength * mmToPt;
                var letterDrop = tick + fs * 0.65;                    // 골격에서 글자 중심까지
                var boxHalf = fs * 0.7;                               // 글자 줄을 덮는 박스 반높이
                var braces = options.showBraces;
                var arrows = options.showArrows;
                var protein = options.showProtein;
                var names = splitNames(options.names, 4);
                var boxHeight = fs * 1.6;
                var codonWidth = 3 * gap;
                var braceWidth = codonWidth * 0.7;
                var braceDepth = braces ? 2 * Math.min(BRACE_HEIGHT_MM * mmToPt / 2, braceWidth / 4) : 0;
                var arrowLength = options.arrowLength * mmToPt;
                var arrowGap = 0.9 * fs;                              // 줄 이름과 가운데 화살표 끝 사이

                // 줄 이름은 먼저 만들어 폭을 잰 뒤 제자리로 옮긴다
                // DNA·RNA·단백질은 세로선(왼쪽 화살표) 가운데에 맞추고, 과정 이름(가)는 그 선 왼쪽에 둔다
                var labelFrames = [null, null, null, null];
                var centeredHalf = 0;                                 // 가운데 맞춘 이름의 반폭 최댓값
                var processWidth = 0;
                if (options.showNames) {
                    for (var n = 0; n < 4; n++) {
                        if (names[n] === "" || (!protein && n >= 2)) continue;
                        labelFrames[n] = placeText(group, names[n], 0, 0, null);
                        var nb = labelFrames[n].geometricBounds;
                        if (n === 2) processWidth = nb[2] - nb[0];
                        else centeredHalf = Math.max(centeredHalf, (nb[2] - nb[0]) / 2);
                    }
                }
                var hasLabels = centeredHalf > 0 || processWidth > 0;
                var processGap = LABEL_PROCESS_GAP_MM * mmToPt;       // (가)와 세로선 사이
                var leftHalf = Math.max(centeredHalf, processWidth > 0 ? processWidth + processGap : 0);   // 세로선에서 왼쪽 끝까지
                var leftBlock = hasLabels ? leftHalf + centeredHalf + LABEL_STRAND_GAP_MM * mmToPt : 0;
                var width = leftBlock + count * codonWidth;
                var left = viewCenter[0] - width / 2;                 // 그림 왼쪽 끝
                var columnX = left + leftHalf;                        // 왼쪽 화살표를 놓는 세로선
                var x0 = left + leftBlock + gap / 2;                  // 첫 염기 중심

                var rnaLetterOffset = options.strandGap * mmToPt + options.rnaGap * mmToPt + letterDrop;   // y1에서 RNA 글자 중심까지
                var braceTopOffset = rnaLetterOffset + boxHalf + options.braceGap * mmToPt;
                var arrowStartOffset = braceTopOffset + braceDepth;
                var arrowEndOffset = arrowStartOffset + arrowLength;
                var proteinCenterOffset = arrowEndOffset + boxHeight / 2;
                var height = rnaLetterOffset + boxHalf;
                if (protein) height = proteinCenterOffset + boxHeight / 2;
                else if (arrows) height = arrowEndOffset;
                else if (braces) height = arrowStartOffset;
                var y1 = viewCenter[1] + height / 2;                  // DNA 1 골격
                var y2 = y1 - options.strandGap * mmToPt;             // DNA 2 골격
                var y3 = y2 - options.rnaGap * mmToPt;                // RNA 골격
                var rnaLetterY = y3 - letterDrop;
                var black = makeGray(100);
                var dnaColor = makeGray(options.dnaColor);            // 골격선·연결선 색(글자는 항상 검정)
                var rnaColor = makeGray(options.rnaColor);
                var xs = [];
                for (var i = 0; i < count * 3; i++) xs.push(x0 + i * gap);

                drawStrand(group, seq1, xs, y1, -1, dnaColor);
                drawStrand(group, seq2, xs, y2, 1, dnaColor);
                drawStrand(group, rna, xs, y3, -1, rnaColor);

                var missing = [];
                var rows = [y1 - letterDrop, y2 + letterDrop, rnaLetterY];
                for (var k = 0; k < 3; k++) {
                    var ranges = parseBaseRanges(options.masks[k], count * 3);
                    if (ranges === null) continue;
                    if (ranges.error) { missing.push(maskNames[k]); continue; }
                    for (var q = 0; q < ranges.list.length; q++) {
                        drawMask(group, xs, ranges.list[q].from - 1, ranges.list[q].to - ranges.list[q].from + 1, rows[k], LABELS[options.labels[k]]);
                    }
                }

                var proteinY = y1 - proteinCenterOffset;
                if (braces || arrows || protein) {
                    var lineLeft = null;
                    if (hasLabels && labelFrames[3] !== null) {
                        var pb = labelFrames[3].geometricBounds;
                        lineLeft = columnX + (pb[2] - pb[0]) / 2 + 1.5 * mmToPt;
                    }
                    drawBelow(group, xs, gap, count, y1 - braceTopOffset, y1 - arrowStartOffset, y1 - arrowEndOffset, braceWidth, proteinY, boxHeight, lineLeft, black);
                }

                if (hasLabels) {
                    var dnaMid = (y1 + y2) / 2;
                    var centers = [dnaMid, rnaLetterY, (rnaLetterY + proteinY) / 2, proteinY];
                    for (var l = 0; l < 4; l++) {
                        if (labelFrames[l] === null) continue;
                        var lb = labelFrames[l].geometricBounds;
                        var targetX = l === 2 ? columnX - processGap - (lb[2] - lb[0]) / 2 : columnX;
                        labelFrames[l].translate(targetX - (lb[0] + lb[2]) / 2, centers[l] - (lb[1] + lb[3]) / 2);
                    }
                    if (arrows) drawArrow(group, columnX, dnaMid - arrowGap, rnaLetterY + arrowGap, options.arrowWidth, black);
                    if (arrows && protein) drawArrow(group, columnX, rnaLetterY - arrowGap, proteinY + arrowGap, options.arrowWidth, black);
                }
                return missing;
            }

            // 골격 가로선 + 염기마다 연결선과 글자. dir: 연결선·글자가 놓이는 쪽(-1 아래, +1 위)
            function drawStrand(group, seq, xs, backboneY, dir, color) {
                var gap = options.baseGap * mmToPt;
                var tick = options.tickLength * mmToPt;
                drawLine(group, xs[0] - gap / 2, backboneY, xs[xs.length - 1] + gap / 2, backboneY, options.backboneWidth, color);
                for (var i = 0; i < seq.length; i++) {
                    drawLine(group, xs[i], backboneY, xs[i], backboneY + dir * tick, options.tickWidth, color);
                    placeText(group, seq.charAt(i), xs[i], backboneY + dir * (tick + options.fontSize * 0.65), engFont);
                }
            }

            // 글자 위를 흰 사각형으로 덮고 가운데에 표시 문자를 쓴다
            function drawMask(group, xs, at, length, centerY, label) {
                var gap = options.baseGap * mmToPt;
                var half = options.fontSize * 0.7;
                var left = xs[at] - gap / 2;
                var right = xs[at + length - 1] + gap / 2;
                var rect = group.pathItems.rectangle(centerY + half, left, right - left, half * 2);
                rect.filled = true;
                rect.fillColor = makeGray(0);
                rect.stroked = true;
                rect.strokeWidth = options.tickWidth;
                rect.strokeColor = makeGray(100);
                placeText(group, label, (left + right) / 2, centerY, null);
            }

            // 코돈마다 중괄호 → 화살표 → 단백질 칸을 (켠 것만) 그린다. 단백질 칸은 가장 큰 칸 크기로 통일하고
            // 칸 사이는 선으로 잇는다. 줄은 왼쪽(lineLeft)·오른쪽 끝까지 뻗는다
            function drawBelow(group, xs, gap, count, braceTop, arrowFrom, arrowTo, braceWidth, centerY, boxHeight, lineLeft, color) {
                var fs = options.fontSize;
                var maxHalf = (3 * gap - 3) / 2;                      // 이웃 칸과 닿지 않는 반폭
                var frames = [];
                var natural = fs * 1.1;                               // 칸 반폭(글자 반폭 + 여백)의 최댓값
                for (var i = 0; i < count; i++) {
                    var cx = xs[i * 3 + 1];
                    if (options.showBraces) drawBrace(group, bracePoints(cx - braceWidth / 2, cx + braceWidth / 2, braceTop, BRACE_HEIGHT_MM * mmToPt), options.arrowWidth, color);
                    if (options.showArrows) drawArrow(group, cx, arrowFrom, arrowTo, options.arrowWidth, color);
                    if (options.showProtein) {
                        var choice = options.proteins[i];
                        var text = choice === 0 ? aminoName(aaList[i], options.nameKorean) : LABELS[choice - 1];
                        var frame = placeText(group, text, cx, centerY, null);
                        var fb = frame.geometricBounds;
                        frames.push({frame: frame, half: (fb[2] - fb[0]) / 2, boxed: choice < 2 || choice > 4});   // ⓐⓑⓒ는 글자 자체가 원이라 박스를 두지 않는다
                        if (frames[i].boxed) natural = Math.max(natural, frames[i].half + fs * 0.45);
                    }
                }
                if (!options.showProtein) return;
                var boxHalf = Math.min(natural, maxHalf);
                var lineRight = xs[count * 3 - 1] + gap / 2;
                if (lineLeft === null) lineLeft = xs[0] - gap / 2;
                var cursor = lineLeft;
                var boxTop = centerY + boxHeight / 2;
                for (var j = 0; j < count; j++) {
                    var center = xs[j * 3 + 1];
                    var item = frames[j];
                    var edge = item.half;
                    if (item.boxed) {
                        // 가장 큰 칸이 코돈 폭을 넘으면 칸을 코돈 폭에 맞추고, 그 안에 안 들어가는 글자는 줄인다
                        if (item.half + fs * 0.3 > boxHalf) {
                            var shrink = Math.max(0.3, (boxHalf - fs * 0.3) / item.half);
                            item.frame.resize(shrink * 100, shrink * 100, true, true, true, true, shrink * 100, Transformation.CENTER);
                        }
                        var box = group.pathItems.rectangle(boxTop, center - boxHalf, boxHalf * 2, boxHeight);
                        box.filled = true;
                        box.fillColor = makeGray(0);
                        box.stroked = true;
                        box.strokeWidth = options.tickWidth;
                        box.strokeColor = makeGray(100);
                        item.frame.zOrder(ZOrderMethod.BRINGTOFRONT);
                        edge = boxHalf;
                    }
                    if (center - edge > cursor) drawLine(group, cursor, centerY, center - edge, centerY, options.arrowWidth, color);
                    cursor = center + edge;
                }
                if (lineRight > cursor) drawLine(group, cursor, centerY, lineRight, centerY, options.arrowWidth, color);
            }

            // 아래쪽 끝이 뾰족한 중괄호
            function drawBrace(group, pts, width, color) {
                var path = group.pathItems.add();
                var anchors = [];
                for (var i = 0; i < pts.length; i++) anchors.push(pts[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < pts.length; j++) {
                    path.pathPoints[j].leftDirection = pts[j].left;
                    path.pathPoints[j].rightDirection = pts[j].right;
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = width;
                path.strokeColor = color;
                try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e) {}
                return path;
            }

            // 위에서 아래로 향하는 화살표(작살형 촉). fromY에서 시작해 tipY에서 끝난다
            function drawArrow(group, x, fromY, tipY, width, color) {
                var scale = width;                                       // 촉은 선 두께에 비례
                drawLine(group, x, fromY, x, tipY + ARROW_HEAD.lineEnd * scale, width, color);
                var head = group.pathItems.add();
                var anchors = [];
                for (var i = 0; i < ARROW_HEAD.poly.length; i++) anchors.push([x + ARROW_HEAD.poly[i][0] * scale, tipY + ARROW_HEAD.poly[i][1] * scale]);
                head.setEntirePath(anchors);
                head.closed = true;
                head.stroked = false;
                head.filled = true;
                head.fillColor = color;
                return head;
            }

            function drawLine(group, x1, y1, x2, y2, width, color) {
                var path = group.pathItems.add();
                path.setEntirePath([[x1, y1], [x2, y2]]);
                path.filled = false;
                path.stroked = true;
                path.strokeWidth = width;
                path.strokeColor = color;
                try { path.strokeCap = StrokeCap.BUTTENDCAP; } catch (e) {}
                return path;
            }

            // 글자 중심을 (x, y)에 맞춘다. font가 null이면 글자 종류별 서체 규칙을 적용한다
            function placeText(group, text, x, y, font) {
                var frame = group.textFrames.add();
                frame.contents = text;
                var attrs = frame.textRange.characterAttributes;
                attrs.size = options.fontSize;
                attrs.fillColor = makeGray(100);
                if (font === null) styleText(frame); else { try { attrs.textFont = font; } catch (e) {} }
                var gb = frame.geometricBounds;
                frame.translate(x - (gb[0] + gb[2]) / 2, y - (gb[1] + gb[3]) / 2);
                return frame;
            }

            // 한글·공백은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt), 항목 기호 (가)는 괄호까지 바탕체 1.25배,
            // 원문자 ㉠ ⓐ는 바탕체 1.125배, 로마 숫자 Ⅰ Ⅱ는 KoPubWorld바탕체 Pro (07_문자/한글·영문 서체 적용.jsx 규칙)
            function styleText(frame) {
                var text = frame.contents;
                var range = frame.textRange;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var attrs = range.characters[i].characterAttributes;
                    var kind = symbolKind(text, i);
                    if (kind === "bracket" || kind === "circle") {
                        attrs.textFont = symbolFont;
                        attrs.baselineShift = 0;
                        attrs.size = attrs.size * (kind === "bracket" ? 1.25 : 1.125);
                    } else if (kind === "roman") {
                        attrs.textFont = romanFont;
                        attrs.baselineShift = 0;
                    } else if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
                        attrs.textFont = korFont;
                        attrs.baselineShift = 0;
                    } else {
                        attrs.textFont = engFont;
                        attrs.baselineShift = 0.5;
                    }
                }
            }

            // i번째 글자의 기호 종류: "bracket" (가)처럼 괄호 안 한글 한 글자의 세 글자, "circle" ㉠ ⓐ, "roman" Ⅰ, 아니면 null
            function symbolKind(text, i) {
                for (var start = i - 2; start <= i; start++) {
                    if (start < 0 || start + 2 >= text.length) continue;
                    var inner = text.charCodeAt(start + 1);
                    if (text.charAt(start) === "(" && text.charAt(start + 2) === ")" && inner >= 0xAC00 && inner <= 0xD7A3) return "bracket";
                }
                var code = text.charCodeAt(i);
                if ((code >= 0x3260 && code <= 0x327F) || (code >= 0x24B6 && code <= 0x24E9) || (code >= 0x2460 && code <= 0x2473) || code === 0x24EA) return "circle";
                if (code >= 0x2160 && code <= 0x217F) return "roman";
                return null;
            }

            // -------------------------------------------------------
            // 서열 계산 (일러스트레이터와 무관한 순수 함수)
            // -------------------------------------------------------
            // 표준 유전 부호: 아미노산(3글자) → mRNA 코돈 목록. Stop은 종결 코돈
            function codonTable() {
                return {
                    Phe: ["UUU", "UUC"], Leu: ["UUA", "UUG", "CUU", "CUC", "CUA", "CUG"], Ile: ["AUU", "AUC", "AUA"], Met: ["AUG"],
                    Val: ["GUU", "GUC", "GUA", "GUG"], Ser: ["UCU", "UCC", "UCA", "UCG", "AGU", "AGC"], Pro: ["CCU", "CCC", "CCA", "CCG"],
                    Thr: ["ACU", "ACC", "ACA", "ACG"], Ala: ["GCU", "GCC", "GCA", "GCG"], Tyr: ["UAU", "UAC"], His: ["CAU", "CAC"],
                    Gln: ["CAA", "CAG"], Asn: ["AAU", "AAC"], Lys: ["AAA", "AAG"], Asp: ["GAU", "GAC"], Glu: ["GAA", "GAG"],
                    Cys: ["UGU", "UGC"], Trp: ["UGG"], Arg: ["CGU", "CGC", "CGA", "CGG", "AGA", "AGG"], Gly: ["GGU", "GGC", "GGA", "GGG"],
                    Stop: ["UAA", "UAG", "UGA"]
                };
            }

            // 아미노산 목록: 3글자 약어, 1글자 약어, 한글 이름. 한글 이름의 첫째는 2022 개정 교육과정 유전 부호표 표기이고 나머지는 입력만 받는 다른 표기
            function aminoList() {
                return [
                    {code: "Phe", one: "F", ko: ["페닐알라닌"]}, {code: "Leu", one: "L", ko: ["류신", "루신"]},
                    {code: "Ile", one: "I", ko: ["아이소류신", "이소류신", "아이소루신"]}, {code: "Met", one: "M", ko: ["메싸이오닌", "메티오닌"]},
                    {code: "Val", one: "V", ko: ["발린"]}, {code: "Ser", one: "S", ko: ["세린"]}, {code: "Pro", one: "P", ko: ["프롤린"]},
                    {code: "Thr", one: "T", ko: ["트레오닌"]}, {code: "Ala", one: "A", ko: ["알라닌"]},
                    {code: "Tyr", one: "Y", ko: ["타이로신", "티로신"]}, {code: "His", one: "H", ko: ["히스티딘"]},
                    {code: "Gln", one: "Q", ko: ["글루타민"]}, {code: "Asn", one: "N", ko: ["아스파라진", "아스파라긴"]},
                    {code: "Lys", one: "K", ko: ["라이신", "리신"]}, {code: "Asp", one: "D", ko: ["아스파트산", "아스파르트산"]},
                    {code: "Glu", one: "E", ko: ["글루탐산"]}, {code: "Cys", one: "C", ko: ["시스테인"]}, {code: "Trp", one: "W", ko: ["트립토판"]},
                    {code: "Arg", one: "R", ko: ["아르지닌"]}, {code: "Gly", one: "G", ko: ["글라이신", "글리신"]},
                    {code: "Stop", one: "*", ko: ["종결코돈", "종결", "정지"]}
                ];
            }

            // 화면에 쓸 아미노산 이름: 한글(유전 부호표 표기) 또는 3글자 약어
            function aminoName(code, korean) {
                if (!korean) return code;
                var list = aminoList();
                for (var i = 0; i < list.length; i++) {
                    if (list[i].code === code) return list[i].ko[0];
                }
                return code;
            }

            // 3글자 약어(대소문자 무관)나 한글 이름이면 코드를, 아니면 null
            function findAmino(token) {
                var list = aminoList();
                var lower = String(token).toLowerCase();
                for (var i = 0; i < list.length; i++) {
                    if (list[i].code.toLowerCase() === lower) return list[i].code;
                    for (var j = 0; j < list[i].ko.length; j++) {
                        if (list[i].ko[j] === token) return list[i].code;
                    }
                }
                return lower === "ter" ? "Stop" : null;
            }

            // 1글자 약어 하나의 코드, 없으면 null
            function oneLetter(ch) {
                var list = aminoList();
                for (var i = 0; i < list.length; i++) {
                    if (list[i].one === ch.toUpperCase()) return list[i].code;
                }
                return null;
            }

            // "Met Ser-Gly", "MSG", "메싸이오닌, 세린"처럼 쓴 아미노산 서열을 코드 목록으로 읽는다
            function parseAminoAcids(text) {
                var tokens = String(text).replace(/[\s,\-‐-―·\/>→]+/g, " ").replace(/^ +| +$/g, "").split(" ");
                var out = [];
                if (tokens.length === 1 && tokens[0] === "") return {list: out, error: null};
                for (var i = 0; i < tokens.length; i++) {
                    var whole = findAmino(tokens[i]);
                    if (whole !== null) { out.push(whole); continue; }
                    var letters = [];
                    for (var c = 0; c < tokens[i].length; c++) {
                        var one = oneLetter(tokens[i].charAt(c));
                        if (one === null) return {list: [], error: "알 수 없는 아미노산: " + tokens[i]};
                        letters.push(one);
                    }
                    for (var k = 0; k < letters.length; k++) out.push(letters[k]);
                }
                return {list: out, error: null};
            }

            // 고른 mRNA 코돈들로 DNA 두 줄과 RNA를 만든다. 주형이 위면 DNA 1이 주형(RNA는 DNA 2와 같은 서열)
            function buildStrands(codons, templateTop) {
                var rna = codons.join("");
                var coding = rna.replace(/U/g, "T");
                var template = complement(coding);
                return {rna: rna, coding: coding, template: template,
                    dna1: templateTop ? template : coding, dna2: templateTop ? coding : template};
            }

            // "1~5, 8~10", "3", "2-4" → {list: [{from, to}, ...], error: false}(왼쪽부터 센 염기 번호, 1부터). 비었으면 null, 틀리면 {error: true}
            function parseBaseRanges(text, length) {
                var s = String(text).replace(/\s+/g, "");
                if (s === "") return null;
                var parts = s.split(",");
                var list = [];
                for (var i = 0; i < parts.length; i++) {
                    var m = /^(\d{1,3})(?:[~\-–](\d{1,3}))?$/.exec(parts[i]);
                    if (m === null) return {error: true};
                    var from = parseInt(m[1], 10);
                    var to = m[2] === undefined || m[2] === "" ? from : parseInt(m[2], 10);
                    if (from < 1 || to < from || to > length) return {error: true};
                    list.push({from: from, to: to});
                }
                return {list: list, error: false};
            }

            // 쉼표로 나눈 이름 count개(모자라면 빈 글자)
            function splitNames(text, count) {
                var parts = String(text).split(",");
                var out = [];
                for (var i = 0; i < count; i++) out.push(i < parts.length ? parts[i].replace(/^\s+|\s+$/g, "") : "");
                return out;
            }

            // 아래쪽 끝이 뾰족한 중괄호의 앵커 7개(anchor·left=들어오는 핸들·right=나가는 핸들). top은 양끝의 y
            function bracePoints(left, right, top, height) {
                var k = 0.5522847498;
                var c = (left + right) / 2;
                var q = Math.min(height / 2, (right - left) / 4);
                var mid = top - q;
                var tip = top - 2 * q;
                function pt(x, y, lx, ly, rx, ry) { return {anchor: [x, y], left: [lx, ly], right: [rx, ry]}; }
                return [
                    pt(left, top, left, top, left, top - k * q),
                    pt(left + q, mid, left + q - k * q, mid, left + q, mid),
                    pt(c - q, mid, c - q, mid, c - q + k * q, mid),
                    pt(c, tip, c, tip + k * q, c, tip + k * q),
                    pt(c + q, mid, c + q - k * q, mid, c + q, mid),
                    pt(right - q, mid, right - q, mid, right - q + k * q, mid),
                    pt(right, top, right, top - k * q, right, top)
                ];
            }

            function complement(seq) {
                var map = { A: "T", T: "A", G: "C", C: "G" };
                var out = "";
                for (var i = 0; i < seq.length; i++) out += map[seq.charAt(i)];
                return out;
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

            function findTextFont(names) {
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                return app.textFonts[0];
            }

            // 로마 숫자 서체: 후보 이름 → 서체 정보(KoPub·바탕·Pro) → 바탕체
            function findRomanFont() {
                var names = ["KoPubWorld바탕체_Pro", "KoPubWorld Batang Pro", "KoPubWorldBatangPro", "KoPubWorldBatang_Pro",
                    "KoPubWorldBatangPM", "KoPubWorldBatangPL", "KoPubWorldBatangPB", "KoPubWorldBatangPro-Regular", "KoPubWorldBatangPro-Medium", "KoPubWorldBatangMedium"];
                for (var i = 0; i < names.length; i++) {
                    try { return app.textFonts.getByName(names[i]); } catch (e) {}
                }
                for (var j = 0; j < app.textFonts.length; j++) {
                    var all = "";
                    try { all = (String(app.textFonts[j].name) + " " + String(app.textFonts[j].family) + " " + String(app.textFonts[j].style)).toLowerCase(); } catch (e2) {}
                    if ((all.indexOf("kopub") >= 0 || all.indexOf("코펍") >= 0) && (all.indexOf("batang") >= 0 || all.indexOf("바탕") >= 0) &&
                        (all.indexOf("pro") >= 0 || /kopubworldbatangp[mlb]/.test(all))) return app.textFonts[j];
                }
                return findTextFont(["Batang", "BatangOTF", ENG_FONT_NAME]);
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            // 첨부 그림(기출형)을 처음 값으로 한다: Gly Arg Glu, 주형은 위 가닥, DNA 1의 염기 1~3·DNA 2와 RNA의 염기 4~9를 가림
            function defaultOptions() {
                return { aaText: "Gly Arg Glu", picks: [2, 0, 0, 0, 0, 0, 0, 0], proteins: [2, 1, 5, 0, 0, 0, 0, 0],
                    templateTop: true, showNames: true, showBraces: true, showArrows: true, showProtein: true, nameKorean: true, names: "DNA, RNA, (가), 단백질",
                    masks: ["1-3", "4-9", "4-9"], labels: [0, 7, 8],
                    backboneWidth: 1, tickWidth: 0.3, tickLength: 3, arrowWidth: 0.5, fontSize: 10,
                    baseGap: 6, strandGap: 16, rnaGap: 14, arrowLength: 7, offsetX: 0, offsetY: 0, braceGap: 1.5, dnaColor: 100, rnaColor: 50, preview: true };
            }

            // v5: 숫자 11개, 주형·줄 이름 표시·단백질 줄 표시(0/1), 줄 이름, 아미노산 서열, 코돈 선택·단백질 칸(쉼표 목록),
            //     가릴 염기 번호 3개(예: 1~5, 8~10), 박스 문자 번호 3개, 미리보기(0/1), 한글 이름(0/1), 중괄호·화살표 표시(0/1), 덧붙인 숫자 3개
            function readSettings() {
                var result = defaultOptions();
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v5" || p.length !== 32) return result;
                    for (var i = 0; i < NUMBER_KEYS.length; i++) {
                        var value = Number(p[i + 1]);
                        if (!/\S/.test(p[i + 1]) || !isFinite(value) || value < NUMBER_MINS[i] || value > NUMBER_MAXS[i]) return result;
                    }
                    for (var e = 0; e < EXTRA_KEYS.length; e++) {
                        var extra = Number(p[29 + e]);
                        if (!/\S/.test(p[29 + e]) || !isFinite(extra) || extra < EXTRA_MINS[e] || extra > EXTRA_MAXS[e]) return result;
                    }
                    if (!/^[01]$/.test(p[12]) || !/^[01]$/.test(p[13]) || !/^[01]$/.test(p[14]) || !/^[01]$/.test(p[25]) || !/^[01]$/.test(p[26]) || !/^[01]$/.test(p[27]) || !/^[01]$/.test(p[28])) return result;
                    var parsed = parseAminoAcids(p[16]);
                    if (parsed.error !== null || parsed.list.length > MAX_AMINO) return result;
                    var picks = readList(p[17], MAX_AMINO, 5);
                    var proteins = readList(p[18], MAX_AMINO, PROTEIN_CHOICES.length - 1);
                    if (picks === null || proteins === null) return result;
                    for (var m = 0; m < 3; m++) {
                        if (!/^[0-9~\-–, ]*$/.test(p[19 + m]) || !/^[0-9]$/.test(p[22 + m])) return result;
                    }
                    for (var k = 0; k < NUMBER_KEYS.length; k++) result[NUMBER_KEYS[k]] = Number(p[k + 1]);
                    result.templateTop = p[12] === "1";
                    result.showNames = p[13] === "1";
                    result.showProtein = p[14] === "1";
                    result.names = p[15];
                    result.aaText = p[16];
                    result.picks = picks;
                    result.proteins = proteins;
                    for (var l = 0; l < 3; l++) {
                        result.masks[l] = p[19 + l];
                        result.labels[l] = Number(p[22 + l]);
                    }
                    result.preview = p[25] === "1";
                    result.nameKorean = p[26] === "1";
                    result.showBraces = p[27] === "1";
                    result.showArrows = p[28] === "1";
                    for (var x = 0; x < EXTRA_KEYS.length; x++) result[EXTRA_KEYS[x]] = Number(p[29 + x]);
                } catch (e) {}
                return result;
            }

            // "2,0,0,..." → 길이 count의 숫자 배열(0..max). 틀리면 null
            function readList(text, count, max) {
                var parts = String(text).split(",");
                if (parts.length !== count) return null;
                var out = [];
                for (var i = 0; i < count; i++) {
                    if (!/^[0-9]{1,2}$/.test(parts[i]) || Number(parts[i]) > max) return null;
                    out.push(Number(parts[i]));
                }
                return out;
            }

            function saveSettings() {
                try {
                    var parts = ["v2"];
                    for (var i = 0; i < NUMBER_KEYS.length; i++) parts.push(options[NUMBER_KEYS[i]]);
                    parts.push(options.templateTop ? 1 : 0, options.showNames ? 1 : 0, options.showProtein ? 1 : 0,
                        options.names, options.aaText, options.picks.join(","), options.proteins.join(","),
                        options.masks[0], options.masks[1], options.masks[2],
                        options.labels[0], options.labels[1], options.labels[2], options.preview ? 1 : 0, options.nameKorean ? 1 : 0,
                        options.showBraces ? 1 : 0, options.showArrows ? 1 : 0,
                        options.braceGap, options.dnaColor, options.rnaColor);
                    app.preferences.setStringPreference(PREF_KEY, parts.join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }
})();
