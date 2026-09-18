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

// DNA 모형: DNA 평면 모형과 DNA·RNA 염기 서열을 한 창의 탭으로 묶었다.
// 두 탭은 서로 다른 그림이라 옵션을 공유하지 않는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
//   평면 모형: 당·인산·염기 도형으로 1가닥·2가닥 DNA를 그린다.
//   염기 서열: DNA 1·2 가닥과 RNA 서열을 글자로 나열하고 가릴 서열을 박스로 가린다.
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

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = "fill";
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = tabs.add("tab", undefined, engines[engineIndex].label);
        page.orientation = "column";
        page.alignChildren = "fill";
        page.spacing = 4;
        engines[engineIndex].error = engines[engineIndex].addRows(page);
        if (engines[engineIndex].error) {
            page.enabled = false;
            page.helpTip = engines[engineIndex].error;
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
    tabs.selection = tabIndex;

    tabs.onChange = function() {
        // Tab에는 index가 없어 제목으로 찾는다
        var next = tabIndex;
        for (var i = 0; i < engines.length; i++) {
            if (tabs.selection && tabs.selection.text === engines[i].label) next = i;
        }
        if (next === tabIndex) return;
        if (engines[next].error) {
            tabs.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        engine.clearPreview();
        tabIndex = next;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    };
    previewCheck.onClick = function() { engine.setPreview(previewCheck.value); };
    okButton.onClick = function() {
        if (!engine.commit()) return;
        try { app.preferences.setStringPreference(TAB_PREF_KEY, String(tabIndex)); } catch (saveError) {}
        win.close(1);
    };
    cancelButton.onClick = function() { win.close(0); };

    // 초기 미리보기는 표시 시점(onShow)에 그려야 화면에 보인다
    win.onShow = function() { engine.setPreview(previewCheck.value); };
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

            applySavedSettings();

            var LABEL_WIDTH = 82;       // "당·인산 간격"이 잘리지 않는 너비
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

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
            var phosphateKField = addNumberField(shadePanel, "인산", "K", phosphateK, 10, 0, 100);
            var sugarKField = addNumberField(shadePanel, "당", "K", sugarK, 10, 0, 100);
            var purineKField = addNumberField(shadePanel, "A·G", "K", purineK, 10, 0, 100);
            var pyrimidineKField = addNumberField(shadePanel, "T·C", "K", pyrimidineK, 10, 0, 100);

            var sizePanel = addPanel(dlg, "크기");
            var purineLenField = addNumberField(sizePanel, "A·G 길이", "mm", purineLenMm, 0.1, 1, 30);
            var pyrimidineLenField = addNumberField(sizePanel, "T·C 길이", "mm", pyrimidineLenMm, 0.1, 1, 30);
            var baseThickField = addNumberField(sizePanel, "염기 두께", "mm", baseThickMm, 0.1, 0.5, 15);
            var sugarField = addNumberField(sizePanel, "당 크기", "mm", sugarMm, 0.1, 1, 20);
            var phosphateField = addNumberField(sizePanel, "인산 크기", "mm", phosphateMm, 0.1, 1, 20);
            var spacingField = addNumberField(sizePanel, "당·인산 간격", "mm", spacingMm, 0.1, 1, 30);
            var linkField = addNumberField(sizePanel, "당·염기 간격", "mm", linkMm, 0.1, 0, 15);
            var strandGapField = addNumberField(sizePanel, "두 가닥 간격", "mm", strandGapMm, 0.1, -5, 20);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
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
            var SYMBOL_FONT_NAME = "Batang";     // 원문자·로마자는 바탕체(Object_CellCycle과 동일)
            var RNA_GRAY_K = 50;                 // RNA 골격·연결선 회색
            var LABELS = ["?",
                String.fromCharCode(0x24D0), String.fromCharCode(0x24D1), String.fromCharCode(0x24D2),   // ⓐⓑⓒ
                String.fromCharCode(0x3260), String.fromCharCode(0x3261), String.fromCharCode(0x3262),   // ㉠㉡㉢
                String.fromCharCode(0x2160), String.fromCharCode(0x2161), String.fromCharCode(0x2162)];  // ⅠⅡⅢ

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var engFont = findTextFont([ENG_FONT_NAME]);
            var symbolFont = findTextFont([SYMBOL_FONT_NAME, ENG_FONT_NAME]);
            var options = readSettings();
            var previewGroup = null;
            var previewPending = false;
            var lastPreviewTime = 0;
            var PREVIEW_INTERVAL_MS = 40;
            var committed = false;

            removeLeftoverGroups();

            var win = page;

            // ---- 서열 입력 ----
            var seqRow = win.add("group");
            seqRow.alignChildren = ["left", "center"];
            addCaption(seqRow, "DNA 1 서열");
            var seqInput = seqRow.add("edittext", undefined, options.seq);
            seqInput.preferredSize.width = 220;
            seqInput.helpTip = "위쪽 가닥. A·C·G·T만 읽습니다";
            var seqButton = seqRow.add("button", undefined, "완료");
            seqButton.preferredSize.width = 50;
            seqButton.onClick = function() { snapshotInputs(); updatePreview(); };

            var maskPanel = win.add("panel", undefined, "가릴 서열 · 박스 문자");
            maskPanel.alignChildren = "fill";
            maskPanel.spacing = 2;
            maskPanel.margins = [8, 12, 8, 6];
            var maskInputs = [];
            var maskNames = ["DNA 1", "DNA 2", "RNA"];
            for (var m = 0; m < 3; m++) {
                var maskRow = maskPanel.add("group");
                maskRow.alignChildren = ["left", "center"];
                maskRow.spacing = 3;
                addCaption(maskRow, maskNames[m]);
                var maskInput = maskRow.add("edittext", undefined, options.masks[m]);
                maskInput.preferredSize.width = 90;
                maskInput.helpTip = "그 줄에 보이는 대로 입력 (RNA는 U)";
                maskInputs.push(maskInput);
                var labelList = maskRow.add("dropdownlist", undefined, LABELS);
                labelList.selection = options.labels[m];
                labelList.helpTip = "박스 안에 쓸 문자";
                labelList.onChange = makeLabelHandler(m, labelList);
                var maskButton = maskRow.add("button", undefined, "완료");
                maskButton.preferredSize.width = 50;
                maskButton.onClick = function() { snapshotInputs(); updatePreview(); };
            }

            // ---- 조절 ----
            var linePanel = win.add("panel", undefined, "선 · 글자");
            linePanel.alignChildren = "fill";
            linePanel.spacing = 2;
            addRow(linePanel, "골격 굵기", "backboneWidth", 0.1, 5, "pt", false);
            addRow(linePanel, "연결선 굵기", "tickWidth", 0.1, 5, "pt", false);
            addRow(linePanel, "연결선 길이", "tickLength", 0, 20, "mm", false);
            addRow(linePanel, "글자 크기", "fontSize", 4, 30, "pt", false);

            var gapPanel = win.add("panel", undefined, "간격");
            gapPanel.alignChildren = "fill";
            gapPanel.spacing = 2;
            addRow(gapPanel, "염기 간격", "baseGap", 1, 30, "mm", false);
            addRow(gapPanel, "DNA 1–2", "strandGap", 2, 60, "mm", false);
            addRow(gapPanel, "DNA 2–RNA", "rnaGap", 2, 60, "mm", false);

            var positionPanel = win.add("panel", undefined, "위치");
            positionPanel.alignChildren = "fill";
            positionPanel.spacing = 2;
            addRow(positionPanel, "가로 이동", "offsetX", -100, 100, "mm", true);
            addRow(positionPanel, "세로 이동", "offsetY", -100, 100, "mm", true);

            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 380;

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(); };
            api.updatePreview = function() { updatePreview(); };
            api.clearPreview = function() { if (!committed) clearPreview(); };
            api.commit = function() {
                if (snapshotInputs()) previewPending = true;
                if (options.seq === "") {
                    status.text = "DNA 1 서열을 입력해주세요.";
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
            function addCaption(row, text) {
                var caption = row.add("statictext", undefined, text);
                caption.preferredSize.width = 80;
                return caption;
            }

            function makeLabelHandler(index, list) {
                return function() {
                    if (list.selection === null) return;
                    options.labels[index] = list.selection.index;
                    updatePreview();
                };
            }

            // 입력창 글을 options로 옮긴다. 바뀐 게 있으면 true
            function snapshotInputs() {
                var changed = false;
                var seq = cleanSequence(seqInput.text, false);
                if (seq !== options.seq) { options.seq = seq; changed = true; }
                for (var i = 0; i < 3; i++) {
                    var mask = cleanSequence(maskInputs[i].text, true);
                    if (mask !== options.masks[i]) { options.masks[i] = mask; changed = true; }
                }
                return changed;
            }

            function addRow(panel, label, key, min, max, unit, positionOnly) {
                var row = panel.add("group");
                row.spacing = 3;
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = 80;
                var step = unit === "mm" ? 0.1 : (key === "fontSize" ? 0.5 : 0.1);
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 5;
                var slider = row.add("scrollbar", undefined, options[key], min, max);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = 196;
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
                if (options.seq === "") {
                    status.text = "DNA 1 서열을 입력하고 '완료'를 누르세요.";
                    return false;
                }
                previewGroup = doc.activeLayer.groupItems.add();
                previewGroup.name = PREVIEW_NAME;
                var missing = drawAll(previewGroup);
                previewGroup.translate(options.offsetX * mmToPt, options.offsetY * mmToPt);
                if (missing.length > 0) status.text = missing.join(", ") + " 가릴 서열을 찾지 못했습니다.";
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
            // 세 줄을 그리고, 못 찾은 가릴 서열의 줄 이름을 돌려준다
            function drawAll(group) {
                var seq1 = options.seq;
                var seq2 = complement(seq1);
                var rna = transcribe(seq1);
                var gap = options.baseGap * mmToPt;
                var tick = options.tickLength * mmToPt;
                var letterDrop = tick + options.fontSize * 0.65;      // 골격에서 글자 중심까지
                var width = seq1.length * gap;
                var height = options.strandGap * mmToPt + options.rnaGap * mmToPt + letterDrop + options.fontSize * 0.5;
                var x0 = viewCenter[0] - width / 2 + gap / 2;          // 첫 염기 중심
                var y1 = viewCenter[1] + height / 2;                   // DNA 1 골격
                var y2 = y1 - options.strandGap * mmToPt;              // DNA 2 골격
                var y3 = y2 - options.rnaGap * mmToPt;                 // RNA 골격
                var black = makeGray(100);
                var gray = makeGray(RNA_GRAY_K);
                var xs = [];
                for (var i = 0; i < seq1.length; i++) xs.push(x0 + i * gap);

                drawStrand(group, seq1, xs, y1, -1, black);
                drawStrand(group, seq2, xs, y2, 1, black);
                drawStrand(group, rna, xs, y3, -1, gray);

                var missing = [];
                var rows = [[seq1, y1 - letterDrop], [seq2, y2 + letterDrop], [rna, y3 - letterDrop]];
                for (var k = 0; k < 3; k++) {
                    if (options.masks[k] === "") continue;
                    var at = rows[k][0].indexOf(options.masks[k]);
                    if (at < 0) { missing.push(maskNames[k]); continue; }
                    drawMask(group, xs, at, options.masks[k].length, rows[k][1], LABELS[options.labels[k]]);
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
                placeText(group, label, (left + right) / 2, centerY, label === "?" ? engFont : symbolFont);
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

            // 글자 중심을 (x, y)에 맞춘다
            function placeText(group, text, x, y, font) {
                var frame = group.textFrames.add();
                frame.contents = text;
                var attrs = frame.textRange.characterAttributes;
                attrs.size = options.fontSize;
                attrs.fillColor = makeGray(100);
                try { attrs.textFont = font; } catch (e) {}
                var gb = frame.geometricBounds;
                frame.translate(x - (gb[0] + gb[2]) / 2, y - (gb[1] + gb[3]) / 2);
                return frame;
            }

            function complement(seq) {
                var map = { A: "T", T: "A", G: "C", C: "G" };
                var out = "";
                for (var i = 0; i < seq.length; i++) out += map[seq.charAt(i)];
                return out;
            }

            function transcribe(seq) {
                return seq.replace(/T/g, "U");
            }

            // 대문자로 바꾸고 염기 문자만 남긴다
            function cleanSequence(text, allowU) {
                return String(text).toUpperCase().replace(allowU ? /[^ACGTU]/g : /[^ACGT]/g, "");
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

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function readSettings() {
                var result = { seq: "", masks: ["", "", ""], labels: [0, 1, 4],
                    backboneWidth: 1, tickWidth: 0.3, tickLength: 3, fontSize: 10,
                    baseGap: 6, strandGap: 16, rnaGap: 14, offsetX: 0, offsetY: 0, preview: true };
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v1" || p.length !== 18) return result;
                    var keys = ["backboneWidth", "tickWidth", "tickLength", "fontSize", "baseGap", "strandGap", "rnaGap", "offsetX", "offsetY"];
                    var mins = [0.1, 0.1, 0, 4, 1, 2, 2, -100, -100];
                    var maxs = [5, 5, 20, 30, 30, 60, 60, 100, 100];
                    for (var i = 0; i < keys.length; i++) {
                        var value = Number(p[i + 1]);
                        if (!/\S/.test(p[i + 1]) || !isFinite(value) || value < mins[i] || value > maxs[i]) return result;
                    }
                    for (var j = 0; j < 3; j++) {
                        if (!/^[0-9]$/.test(p[10 + j])) return result;
                        if (!/^[ACGTU]*$/.test(p[14 + j])) return result;
                    }
                    if (!/^[ACGT]*$/.test(p[13]) || !/^[01]$/.test(p[17])) return result;
                    for (var k = 0; k < keys.length; k++) result[keys[k]] = Number(p[k + 1]);
                    for (var l = 0; l < 3; l++) {
                        result.labels[l] = Number(p[10 + l]);
                        result.masks[l] = p[14 + l];
                    }
                    result.seq = p[13];
                    result.preview = p[17] === "1";
                } catch (e) {}
                return result;
            }

            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY, ["v1", options.backboneWidth, options.tickWidth,
                        options.tickLength, options.fontSize, options.baseGap, options.strandGap, options.rnaGap,
                        options.offsetX, options.offsetY, options.labels[0], options.labels[1], options.labels[2],
                        options.seq, options.masks[0], options.masks[1], options.masks[2],
                        options.preview ? 1 : 0].join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }
})();
