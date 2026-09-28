// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 미리보기 라벨 겹침 풀기 (07_수학/math_label_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/math_label_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 고등학교 수학Ⅱ: 함수의 극한과 연속, 미분(증가·감소와 극값), 적분(정적분·접선), 속도와 거리 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 고등학교 수학은 과목별 스크립트 다섯 개(공통수학·수학Ⅰ·수학Ⅱ·확률과 통계·기하)로 나뉘어 있고, 탭마다 저장 키는 예전 그대로다.
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighMath2/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makePiecewiseEngine(), makeExtremaEngine(), makeCalculusEngine(), makeMotionEngine()];

    var win = new Window("dialog", "수학Ⅱ");
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

    // 저장된 탭이 선택에 맞지 않으면 앞에서부터 가능한 탭을 연다
    var tabIndex = 0;
    try {
        var savedTab = parseInt(app.preferences.getStringPreference(TAB_PREF_KEY), 10);
        if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
    } catch (tabError) {}
    if (engines[tabIndex].error) {
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) {
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

    // 음수 숫자(-2, -1/2, -π)를 점 위·아래에 둘 때는 빼기 기호를 빼고 숫자 가운데를 점에 맞춘다(평가원 그림).
    // 글자를 이만큼 가로로 옮기면 된다. 빼기를 지운 사본으로 숫자 너비를 재므로 서체·크기가 달라도 맞다
    function negativeNumberShift(frame, dir) {
        if (dir[0] !== 0 || dir[1] === 0) return 0;
        if (!/^[-−][0-9.π]/.test(frame.contents)) return 0;
        try {
            var full = frame.geometricBounds;
            var probe = frame.duplicate();
            probe.textRange.characters[0].remove();
            var rest = probe.geometricBounds;
            probe.remove();
            return -((full[2] - full[0]) - (rest[2] - rest[0])) / 2;
        } catch (e) { return 0; }
    }

    // ==== 구간별 함수 ====
    // 구간별로 정의된 함수(함수의 극한·연속): 조각 4개까지 '식 + 범위'(x+1 / x<1, x^2 / 1<=x<3, 2 / x=1)로 그린다.
    // 범위 끝이 포함되면 채운 점(●), 아니면 속이 빈 점(○). 끝점에서 두 축까지 점선을 고를 수 있다.
    // 경계마다 좌극한·우극한·함숫값과 연속 여부를 창에 보여 준다. 식 읽기·그래프는 좌표평면 탭과 같은 코드다.
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 점선 0.3pt, 빈 점 테두리 0.5pt. 선택은 필요 없다.
    function makePiecewiseEngine() {
        var api = {label: "구간별 함수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathPiecewise/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var PIECE_COUNT = 4;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var OPEN_DOT_PT = 0.5;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.7;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["guides", "formulas", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var formulas = ["x+1", "-x+3", "1", ""];
            var ranges = ["x<1", "x>1", "x=1", ""];
            var xMin = -2, xMax = 4, yMin = -1, yMax = 4;
            var unitMm = 8;
            var fontPt = 8;
            var opt = { guides: true, formulas: false, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var piecePanel = addPanel(win, "조각 (식 · 범위)");
            var formulaInputs = [], rangeInputs = [];
            for (var q = 0; q < PIECE_COUNT; q++) {
                var row = piecePanel.add("group");
                row.add("statictext", undefined, (q + 1) + ":").preferredSize.width = 20;
                var formulaInput = row.add("edittext", undefined, formulas[q]);
                formulaInput.preferredSize.width = 170;
                formulaInput.helpTip = "x+1, x^2-2, √x, 2 (상수)";
                var rangeInput = row.add("edittext", undefined, ranges[q]);
                rangeInput.preferredSize.width = 130;
                rangeInput.helpTip = "x<1, x>=2, 1<=x<3, -1<x<=2, x=1 (한 점). <=는 ≤";
                formulaInputs.push(formulaInput);
                rangeInputs.push(rangeInput);
            }
            addCheckRow(piecePanel, [["guides", "끝점에서 축까지 점선"], ["formulas", "식 글자"]]);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 60];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            for (var bi = 0; bi < PIECE_COUNT; bi++) bindPiece(bi);
            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function bindPiece(index) {
                formulaInputs[index].onChanging = function() { formulas[index] = formulaInputs[index].text; updatePreview(); };
                rangeInputs[index].onChanging = function() { ranges[index] = rangeInputs[index].text; updatePreview(); };
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 150;
                    bindOption(check, items[i][0]);
                }
            }

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
                    updatePreview();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                var pieces = [], problems = [];
                for (var i = 0; i < PIECE_COUNT; i++) {
                    var hasFormula = String(formulas[i]).replace(/\s/g, "") !== "", hasRange = String(ranges[i]).replace(/\s/g, "") !== "";
                    if (!hasFormula && !hasRange) continue;
                    var fn = compileFunction(formulas[i]), range = parseRange(ranges[i]);
                    if (fn === null || range === null) problems.push((i + 1) + "번 " + (fn === null ? "식" : "범위") + "을 읽지 못함");
                    else pieces.push({ fn: fn, range: range, label: formulas[i] });
                }
                var drawing = buildPiecewise({
                    pieces: pieces, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    guides: opt.guides, formulas: opt.formulas, grid: opt.grid, numbers: opt.numbers
                });
                var notes = problems.concat(drawing.notes);
                messageText.text = notes.length > 0 ? notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "구간별 함수";
                for (var l = 0; l < drawing.lines.length; l++) addPath(drawing.lines[l]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                // 빈 점을 먼저, 채운 점을 나중에 (같은 자리면 채운 점이 보인다)
                for (var d = 0; d < drawing.dots.length; d++) if (drawing.dots[d].open) addDot(drawing.dots[d]);
                for (var e = 0; e < drawing.dots.length; e++) if (!drawing.dots[e].open) addDot(drawing.dots[e]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [], curved = false;
                for (var i = 0; i < line.points.length; i++) {
                    anchors.push(line.points[i].anchor);
                    if (line.points[i].left !== line.points[i].anchor || line.points[i].right !== line.points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (curved) {
                    for (var j = 0; j < line.points.length; j++) {
                        var point = path.pathPoints[j];
                        point.leftDirection = line.points[j].left;
                        point.rightDirection = line.points[j].right;
                    }
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var d = arrow.dir, n = [-d[1], d[0]];
                var tip = arrow.tip;
                var back = [tip[0] - d[0] * ARROW.length, tip[1] - d[1] * ARROW.length];
                var path = previewGroup.pathItems.add();
                path.setEntirePath([
                    tip,
                    [back[0] + n[0] * ARROW.halfWidth, back[1] + n[1] * ARROW.halfWidth],
                    [back[0] + d[0] * ARROW.notch, back[1] + d[1] * ARROW.notch],
                    [back[0] - n[0] * ARROW.halfWidth, back[1] - n[1] * ARROW.halfWidth]
                ]);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(100);
            }

            // 점 {at, open}: 채운 점(●) 또는 속이 흰 점(○, 테두리 0.5pt)
            function addDot(dot) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(dot.open ? 0 : 100);
                circle.stroked = !!dot.open;
                if (dot.open) {
                    circle.strokeColor = makeGray(100);
                    circle.strokeWidth = OPEN_DOT_PT;
                }
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup/sub/roman: 첨자·똑바로 쓸 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var marks = [[label.sup, "sup"], [label.sub, "sub"], [label.roman, "roman"]];
                for (var m = 0; m < marks.length; m++) {
                    if (!marks[m][0]) continue;
                    for (var s = 0; s < marks[m][0].length; s++) {
                        var markAttributes = frame.textRange.characters[marks[m][0][s]].characterAttributes;
                        if (marks[m][1] === "sup") markAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                        else if (marks[m][1] === "sub") markAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                        else markAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호는 HancomEQN. 숫자(upright)는 똑바로
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && code >= 97 && code <= 122) {
                        attributes.textFont = italicFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-piecewise.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 범위 → {lo, hi, loIn, hiIn} (끝이 없으면 ±Infinity). x=a는 lo = hi = a, 둘 다 포함. 못 읽으면 null
            // x<1, x<=1, x>2, x>=2, 1<x<3, 1<=x<=3, -1<x<=2, x=1 (≤ ≥ 도 된다)
            function parseRange(text) {
                var s = String(text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=");
                var xAt = s.indexOf("x");
                if (xAt < 0 || s.indexOf("x", xAt + 1) >= 0) return null;
                var before = s.substring(0, xAt), after = s.substring(xAt + 1);
                if (before === "" && after.charAt(0) === "=") {
                    var point = numberOf(after.substring(1));
                    return point === null ? null : { lo: point, hi: point, loIn: true, hiIn: true };
                }
                var range = { lo: -Infinity, hi: Infinity, loIn: false, hiIn: false };
                // 앞: "1<" 또는 "1<=" (x보다 작은 쪽), 또는 "3>" (x보다 큰 쪽)
                if (before !== "") {
                    var lead = splitOperator(before, true);
                    if (lead === null) return null;
                    if (lead.op.charAt(0) === "<") { range.lo = lead.value; range.loIn = lead.op.length === 2; }
                    else { range.hi = lead.value; range.hiIn = lead.op.length === 2; }
                }
                if (after !== "") {
                    var tail = splitOperator(after, false);
                    if (tail === null) return null;
                    if (tail.op.charAt(0) === "<") { range.hi = tail.value; range.hiIn = tail.op.length === 2; }
                    else { range.lo = tail.value; range.loIn = tail.op.length === 2; }
                }
                if (before === "" && after === "") return null;
                if (!(range.hi > range.lo)) return null;
                return range;
            }

            // "1<" (앞, 연산자가 끝) 또는 "<=3" (뒤, 연산자가 처음) → {op, value}
            function splitOperator(text, leading) {
                var ops = ["<=", ">=", "<", ">"];
                for (var i = 0; i < ops.length; i++) {
                    var op = ops[i];
                    if (leading && text.substring(text.length - op.length) === op) {
                        var v = numberOf(text.substring(0, text.length - op.length));
                        return v === null ? null : { op: op, value: v };
                    }
                    if (!leading && text.substring(0, op.length) === op) {
                        var w = numberOf(text.substring(op.length));
                        return w === null ? null : { op: op, value: w };
                    }
                }
                return null;
            }

            function numberOf(text) {
                if (text === "" || text.indexOf("x") >= 0 || text.indexOf("<") >= 0 || text.indexOf(">") >= 0) return null;
                var fn = compileFunction(text);
                if (fn === null) return null;
                var value = fn(0);
                return isFinite(value) ? value : null;
            }

            function safeValue(fn, x) {
                var y;
                try { y = fn(x); } catch (e) { return NaN; }
                return (typeof y === "number" && isFinite(y)) ? y : NaN;
            }

            // 끝점 쪽 극한 (끝에서 정의되면 그 값). 정의되지 않으면 안쪽 두 점을 보고, 크게 불어나면 ±Infinity
            function valueNear(fn, x, inward) {
                var y = safeValue(fn, x);
                if (!isNaN(y)) return y;
                var near = safeValue(fn, x + inward * 1e-6), far = safeValue(fn, x + inward * 1e-4);
                if (isNaN(near)) return NaN;
                if (Math.abs(near) > 1e4 && Math.abs(near) > 10 * Math.abs(far)) return near > 0 ? Infinity : -Infinity;
                return near;
            }

            function buildPiecewise(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var left = Math.min(o.xMin, 0) - 0.5, right = o.xMax + 0.8, bottom = Math.min(o.yMin, 0) - 0.5, top = o.yMax + 0.8;
                if (o.grid) {
                    for (var gx = o.xMin; gx <= o.xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, o.yMin * u], [gx * u, o.yMax * u]], "grid"));
                    for (var gy = o.yMin; gy <= o.yMax; gy++) if (gy !== 0) out.lines.push(straight([[o.xMin * u, gy * u], [o.xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = o.xMin; tx <= o.xMax; tx++) {
                    if (tx === 0) continue;
                    out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var ty = o.yMin; ty <= o.yMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                function inView(p) { return p[0] >= o.xMin - 1e-9 && p[0] <= o.xMax + 1e-9 && p[1] >= o.yMin - 1e-9 && p[1] <= o.yMax + 1e-9; }
                // 같은 자리의 끝점은 하나만 (어느 조각이든 포함하면 채운 점)
                var marked = {};
                function markEnd(x, y, closed) {
                    if (isNaN(y) || !isFinite(y) || !inView([x, y])) return;
                    var key = Math.round(x * 1e6) + "," + Math.round(y * 1e6);
                    if (marked[key]) {
                        if (closed) marked[key].open = false;
                        return;
                    }
                    marked[key] = { at: [x * u, y * u], open: !closed };
                    out.dots.push(marked[key]);
                    if (o.guides) {
                        if (Math.abs(y) > 1e-9) out.lines.push(straight([[x * u, y * u], [x * u, 0]], "guide"));
                        if (Math.abs(x) > 1e-9) out.lines.push(straight([[x * u, y * u], [0, y * u]], "guide"));
                    }
                }
                var breaks = [];
                for (var p = 0; p < o.pieces.length; p++) {
                    var piece = o.pieces[p], r = piece.range;
                    if (r.lo === r.hi) {
                        markEnd(r.lo, safeValue(piece.fn, r.lo), true);
                        breaks.push(r.lo);
                        continue;
                    }
                    var from = Math.max(r.lo, o.xMin), to = Math.min(r.hi, o.xMax);
                    if (to > from) {
                        var segments = plotFunction(piece.fn, from, to, o.yMin, o.yMax);
                        for (var s = 0; s < segments.length; s++) if (segments[s].length >= 2) out.lines.push({ points: toBezier(segments[s], u), kind: "graph" });
                        if (o.formulas && segments.length > 0) {
                            var mid = segments[Math.floor(segments.length / 2)], at = mid[Math.floor(mid.length / 2)];
                            var display = formulaDisplay("y=" + piece.label);
                            out.texts.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: [at.x * u, at.y * u], dir: [0.7071, 0.7071] });
                        }
                    }
                    if (isFinite(r.lo)) { markEnd(r.lo, valueNear(piece.fn, r.lo, 1), r.loIn); breaks.push(r.lo); }
                    if (isFinite(r.hi)) { markEnd(r.hi, valueNear(piece.fn, r.hi, -1), r.hiIn); breaks.push(r.hi); }
                }

                // 경계마다 좌극한·우극한·함숫값
                breaks.sort(function(p1, p2) { return p1 - p2; });
                for (var b = 0; b < breaks.length; b++) {
                    if (b > 0 && Math.abs(breaks[b] - breaks[b - 1]) < 1e-9) continue;
                    var a = breaks[b], leftLimit = NaN, rightLimit = NaN, value = NaN;
                    for (var k = 0; k < o.pieces.length; k++) {
                        var pr = o.pieces[k].range, fn = o.pieces[k].fn;
                        if (pr.lo < a - 1e-9 && pr.hi >= a - 1e-9) leftLimit = valueNear(fn, a, -1);
                        if (pr.hi > a + 1e-9 && pr.lo <= a + 1e-9) rightLimit = valueNear(fn, a, 1);
                        var contains = (pr.lo < a && a < pr.hi) || (Math.abs(pr.lo - a) < 1e-9 && pr.loIn) || (Math.abs(pr.hi - a) < 1e-9 && pr.hiIn);
                        if (contains) value = safeValue(fn, a);
                    }
                    var continuous = !isNaN(leftLimit) && !isNaN(rightLimit) && !isNaN(value) &&
                        Math.abs(leftLimit - rightLimit) < 1e-6 && Math.abs(leftLimit - value) < 1e-6;
                    out.notes.push("x=" + fmt(a) + ": 좌극한 " + fmt(leftLimit) + ", 우극한 " + fmt(rightLimit) + ", f(" + fmt(a) + ")=" + fmt(value) +
                        " → " + (continuous ? "연속" : "불연속"));
                }
                return out;
            }

            function fmt(v) {
                if (isNaN(v)) return "없음";
                if (v === Infinity) return "∞";
                if (v === -Infinity) return "-∞";
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // 좌표 범위 [x0,x1]×[y0,y1] 안에 드는 조각들. 각 점 {x, y, m(기울기)}
            function plotFunction(fn, x0, x1, y0, y1) {
                var TOLERANCE = 0.004, MAX_DEPTH = 10, STEP = 0.25, LIMIT = 4000;
                var margin = (y1 - y0) * 1e-9;
                var segments = [], current = null, count = 0;

                function value(x) {
                    var y;
                    try { y = fn(x); } catch (e) { return NaN; }
                    return (typeof y === "number" && isFinite(y)) ? y : NaN;
                }
                function inside(x) {
                    var y = value(x);
                    return !isNaN(y) && y >= y0 - margin && y <= y1 + margin;
                }
                function slope(x) {
                    var h = 1e-5 * (1 + Math.abs(x));
                    var a = value(x - h), b = value(x + h), c = value(x);
                    if (!isNaN(a) && !isNaN(b)) return (b - a) / (2 * h);
                    if (!isNaN(b)) return (b - c) / h;
                    if (!isNaN(a)) return (c - a) / h;
                    return 0;
                }
                function emit(x) {
                    if (current === null) {
                        current = [];
                        segments.push(current);
                    }
                    if (count++ > LIMIT) return;
                    var y = Math.min(y1, Math.max(y0, value(x)));
                    current.push({ x: x, y: y, m: slope(x) });
                }
                function finish() { current = null; }
                // 안(inX)과 밖(outX) 사이 경계. 안쪽 끝을 돌려준다
                function edge(inX, outX) {
                    for (var i = 0; i < 40; i++) {
                        var mid = (inX + outX) / 2;
                        if (inside(mid)) inX = mid;
                        else outX = mid;
                    }
                    return inX;
                }
                // a는 이미 넣었다. b까지 넣는다
                function refine(a, b, depth) {
                    var mid = (a + b) / 2;
                    if (!inside(mid)) {
                        var cut = edge(a, mid);
                        if (cut > a) refine(a, cut, depth + 1);
                        finish();
                        var resume = edge(b, mid);
                        emit(resume);
                        if (b > resume) refine(resume, b, depth + 1);
                        return;
                    }
                    var h = b - a;
                    var ya = value(a), yb = value(b);
                    var guess = (ya + yb) / 2 + h * (slope(a) - slope(b)) / 8;
                    if (depth < MAX_DEPTH && Math.abs(guess - value(mid)) > TOLERANCE) {
                        refine(a, mid, depth + 1);
                        refine(mid, b, depth + 1);
                    } else {
                        emit(b);
                    }
                }

                var steps = Math.ceil((x1 - x0) / STEP);
                for (var i = 0; i < steps; i++) {
                    var a = x0 + (x1 - x0) * i / steps, b = x0 + (x1 - x0) * (i + 1) / steps;
                    var inA = inside(a), inB = inside(b);
                    if (inA && current === null) emit(a);
                    if (inA && inB) {
                        refine(a, b, 0);
                    } else if (inA) {
                        var last = edge(a, b);
                        if (last > a) refine(a, last, 0);
                        finish();
                    } else if (inB) {
                        var first = edge(b, a);
                        emit(first);
                        refine(first, b, 0);
                    }
                }
                for (var k = 0; k < segments.length; k++) segments[k] = simplify(segments[k]);
                return segments;

                // 빼도 앞뒤 점의 에르미트 곡선이 함수에서 벗어나지 않는 점은 지운다 (직선은 두 점만 남는다)
                function simplify(points) {
                    if (points.length < 3) return points;
                    var kept = [points[0]];
                    for (var i = 1; i < points.length - 1; i++) {
                        if (!fits(kept[kept.length - 1], points[i + 1])) kept.push(points[i]);
                    }
                    kept.push(points[points.length - 1]);
                    return kept;
                }
                function fits(p, q) {
                    var h = q.x - p.x;
                    for (var j = 1; j < 8; j++) {
                        var t = j / 8, x = p.x + h * t, y = value(x);
                        if (isNaN(y) || y < y0 - margin || y > y1 + margin) return false;
                        var t2 = t * t, t3 = t2 * t;
                        var guess = (2 * t3 - 3 * t2 + 1) * p.y + (t3 - 2 * t2 + t) * h * p.m + (-2 * t3 + 3 * t2) * q.y + (t3 - t2) * h * q.m;
                        if (Math.abs(guess - y) > TOLERANCE) return false;
                    }
                    return true;
                }
            }

            // 에르미트 → 베지어: 핸들 = 이웃까지 x 간격의 1/3만큼 접선 방향
            function toBezier(points, unit) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    var anchor = [p.x * unit, p.y * unit];
                    var left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (p.x - points[i - 1].x) / 3;
                        left = [(p.x - hl) * unit, (p.y - p.m * hl) * unit];
                    }
                    if (i < points.length - 1) {
                        var hr = (points[i + 1].x - p.x) / 3;
                        right = [(p.x + hr) * unit, (p.y + p.m * hr) * unit];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
            }

            // 식 표시: ^와 *는 빼고 ^ 다음은 위첨자, _ 다음은 아래첨자(log_2 → log₂). sin·cos·tan·log·ln은 똑바로(roman),
            // 그 뒤에 괄호·첨자가 없으면 한 칸 띄운다 (sin x). pi는 π
            function formulaDisplay(text) {
                var source = String(text).replace(/\s/g, "").split("pi").join("π");
                var FUNCS = ["sin", "cos", "tan", "log", "ln"];
                var out = "", sup = [], sub = [], roman = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) {
                                marks.push(out.length);
                                out += source.charAt(j);
                            }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                                marks.push(out.length);
                                out += source.charAt(++i);
                            }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    var name = null;
                    for (var k = 0; k < FUNCS.length; k++) if (source.substr(i, FUNCS[k].length) === FUNCS[k]) { name = FUNCS[k]; break; }
                    if (name) {
                        for (var n = 0; n < name.length; n++) {
                            roman.push(out.length);
                            out += name.charAt(n);
                        }
                        i += name.length - 1;
                        var after = source.charAt(i + 1);
                        if (after !== "" && after !== "(" && after !== "_" && after !== "^") out += " ";
                        continue;
                    }
                    out += ch;
                }
                return { text: out, sup: sup, sub: sub, roman: roman };
            }

            // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null.
            // 2x, 1/2x(=½x), x^2, √x, |x-1|, 2^x, e^x, π(pi), sin 2x, cos(x+1), tan x, log_2 x, log x(밑 10), ln x
            function compileFunction(text) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["sin", "cos", "tan", "log", "ln", "pi", "e", "x"];
                var FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
                var pos = 0, absDepth = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function nameAt() {
                    for (var i = 0; i < NAMES.length; i++) if (s.substr(pos, NAMES[i].length) === NAMES[i]) return NAMES[i];
                    return null;
                }
                // 곱셈 기호 없이 이어지는 인수의 시작 (2x, 2√3, 2(x+1), 2sin x, 2|x|)
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || nameAt() !== null || (ch === "|" && absDepth === 0);
                }
                function expression() {
                    var node = term();
                    while (peek() === "+" || peek() === "-") {
                        var op = s.charAt(pos++);
                        node = binary(op, node, term());
                    }
                    return node;
                }
                function term() {
                    var node = unary();
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        else op = "*";
                        node = binary(op, node, power());
                    }
                    return node;
                }
                function unary() {
                    if (peek() === "-") { pos++; return negate(unary()); }
                    if (peek() === "+") { pos++; return unary(); }
                    return power();
                }
                function power() {
                    var base = primary();
                    if (peek() === "^") {
                        pos++;
                        return binary("^", base, unary());
                    }
                    return base;
                }
                // 함수 인수: 괄호면 그 괄호, 아니면 곱셈으로 이어진 인수들 (sin 2x = sin(2x), 다음 함수 이름 앞에서 끝)
                function argument() {
                    if (peek() === "(") return primary();
                    var node = power();
                    while (startsFactor() && peek() !== "(" && !isFunctionName(nameAt())) node = binary("*", node, power());
                    return node;
                }
                function isFunctionName(name) { return name === "sin" || name === "cos" || name === "tan" || name === "log" || name === "ln"; }
                function primary() {
                    var ch = peek();
                    if (ch === "|") {
                        pos++;
                        absDepth++;
                        var inside = expression();
                        if (peek() !== "|") throw new Error("abs");
                        pos++;
                        absDepth--;
                        return function(x) { return Math.abs(inside(x)); };
                    }
                    var name = nameAt();
                    if (name !== null) {
                        pos += name.length;
                        if (name === "x") return function(x) { return x; };
                        if (name === "pi") return function() { return Math.PI; };
                        if (name === "e") return function() { return Math.E; };
                        if (name === "log") {
                            var base = function() { return 10; };
                            if (peek() === "_") { pos++; base = primary(); }
                            var logArg = argument();
                            return function(x) { return Math.log(logArg(x)) / Math.log(base(x)); };
                        }
                        var arg = argument();
                        if (name === "ln") return function(x) { return Math.log(arg(x)); };
                        var fn = FUNCS[name];
                        return function(x) { return fn(arg(x)); };
                    }
                    if (ch === "√") { pos++; var inner = power(); return function(x) { return Math.sqrt(inner(x)); }; }
                    if (ch === "(") {
                        pos++;
                        var node = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return node;
                    }
                    var begin = pos, dots = 0;
                    while (isDigit(peek()) || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var number = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
                    return function() { return number; };
                }
                function negate(node) { return function(x) { return -node(x); }; }
                function binary(op, a, b) {
                    if (op === "+") return function(x) { return a(x) + b(x); };
                    if (op === "-") return function(x) { return a(x) - b(x); };
                    if (op === "*") return function(x) { return a(x) * b(x); };
                    if (op === "/") return function(x) { return a(x) / b(x); };
                    return function(x) { return Math.pow(a(x), b(x)); };
                }
                try {
                    var fn = expression();
                    if (pos !== s.length) return null;
                    return fn;
                } catch (e) {
                    return null;
                }
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

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unitText ? " (" + unitText + "):" : ":")).preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM_TO_PT;
                    setter(value);
                    setRowValue(controls, value);
                    if (delta === 0 || previewGroup === null) return;
                    previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
                return Math.round(value / step) * step;
            }

            function formatNumber(value, decimals) {
                return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
            }


            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1"];
                for (var k = 0; k < PIECE_COUNT; k++) parts.push(encodeURIComponent(formulas[k]), encodeURIComponent(ranges[k]));
                parts.push(xMin, xMax, yMin, yMax, unitMm, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0");
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 19 || p[15].length !== FLAG_KEYS.length) return;
                try {
                    for (var k = 0; k < PIECE_COUNT; k++) {
                        formulas[k] = decodeURIComponent(p[1 + k * 2]);
                        ranges[k] = decodeURIComponent(p[2 + k * 2]);
                    }
                    xMin = Math.round(restoreNumber(p[9], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[10], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[11], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[12], yMax, 1, 20));
                    unitMm = restoreNumber(p[13], unitMm, 2, 20);
                    fontPt = restoreNumber(p[14], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[15].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[16], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[17], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[18] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 증감·극값 ====
    // 함수의 증가·감소와 극값: f(x)의 그래프에 극대·극소 점(축까지 점선, 값 글자, 수평 접선)과 변곡점을 표시하고,
    // 증감표(x / f′(x) / f(x) 세 줄, + · - · 0, ↗ ↘ 화살표, 극대·극소 값)를 그래프 아래에 그린다. 그래프나 표만 그릴 수도 있다.
    // f′(x) = 0인 점은 f′의 부호가 바뀌는 곳(이분법)과 부호는 그대로인 채 0에 닿는 곳(x³의 0)을 모두 찾는다.
    // 값은 정수·분수(분모 6까지)·√n으로 알아볼 수 있으면 그렇게, 아니면 소수 둘째 자리. 식 읽기·그래프는 좌표평면 탭과 같은 코드다.
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 표 0.4pt, 점선·수평 접선 0.3pt. 선택은 필요 없다.
    function makeExtremaEngine() {
        var api = {label: "증감·극값", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathExtrema/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′, √)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var TABLE_PT = 0.4;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ROW_MM = 7;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var TREND_ARROW = { length: 1.8, halfWidth: 0.7, notch: 0.4 };   // 표 안의 ↗ ↘
            var MODES = ["그래프 + 증감표", "그래프만", "증감표만"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["extrema", "values", "flat", "inflection", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var fText = "y=x^3-3x";
            var mode = 0;
            var xMin = -3, xMax = 3, yMin = -3, yMax = 3;
            var unitMm = 7;
            var cellMm = 12;
            var fontPt = 8;
            var opt = { extrema: true, values: true, flat: false, inflection: false, formula: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "함수");
            var fRow = functionPanel.add("group");
            fRow.add("statictext", undefined, "f:").preferredSize.width = 20;
            var fInput = fRow.add("edittext", undefined, fText);
            fInput.preferredSize.width = 320;
            fInput.helpTip = "y=x^3-3x, y=-x^3+3x^2, y=x^4-2x^2, y=x+1/x, y=x e^x. ^는 거듭제곱";
            var modeRow = functionPanel.add("group");
            modeRow.add("statictext", undefined, "그림:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["extrema", "극대·극소 점"], ["values", "극값 글자"], ["flat", "수평 접선"]]);
            addCheckRow(markPanel, [["inflection", "변곡점"], ["formula", "식 글자"], ["grid", "격자"]]);
            addCheckRow(markPanel, [["numbers", "눈금 숫자"]]);

            var rangePanel = addPanel(win, "범위 · 크기");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var cellControls = addValueRow(rangePanel, "표 칸 너비", "mm", cellMm, 6, 30, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            fInput.onChanging = function() { fText = fInput.text; updatePreview(); };
            modeList.onChange = function() { mode = modeList.selection ? modeList.selection.index : 0; updatePreview(); };
            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(cellControls, function(value) { cellMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. f를 못 읽으면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(messageText.text);
                    return false;
                }
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                }
            }

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
                    updatePreview();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                var f = compileFunction(fText);
                if (f === null) {
                    messageText.text = "f를 읽지 못함 (예: y=x^3-3x)";
                    return;
                }
                var drawing = buildExtrema({
                    f: f, label: fText, mode: mode, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT,
                    tick: TICK_MM * MM_TO_PT, cell: cellMm * MM_TO_PT, row: ROW_MM * MM_TO_PT, fontSize: fontPt,
                    extrema: opt.extrema, values: opt.values, flat: opt.flat, inflection: opt.inflection, formula: opt.formula,
                    grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "증감·극값";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"table"|"guide"|"flat"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [], curved = false;
                for (var i = 0; i < line.points.length; i++) {
                    anchors.push(line.points[i].anchor);
                    if (line.points[i].left !== line.points[i].anchor || line.points[i].right !== line.points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (curved) {
                    for (var j = 0; j < line.points.length; j++) {
                        var point = path.pathPoints[j];
                        point.leftDirection = line.points[j].left;
                        point.rightDirection = line.points[j].right;
                    }
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : (line.kind === "table" ? TABLE_PT : GUIDE_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양). trend: 표 안의 작은 화살촉
            function addArrow(arrow) {
                var shape = arrow.trend ? TREND_ARROW : ARROW;
                var d = arrow.dir, n = [-d[1], d[0]];
                var tip = arrow.tip;
                var back = [tip[0] - d[0] * shape.length, tip[1] - d[1] * shape.length];
                var path = previewGroup.pathItems.add();
                path.setEntirePath([
                    tip,
                    [back[0] + n[0] * shape.halfWidth, back[1] + n[1] * shape.halfWidth],
                    [back[0] + d[0] * shape.notch, back[1] + d[1] * shape.notch],
                    [back[0] - n[0] * shape.halfWidth, back[1] - n[1] * shape.halfWidth]
                ]);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(100);
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다 (dir이 [0,0]이면 가운데).
            // sup/sub/roman: 위·아래첨자, 기울이지 않는 글자 위치. small: 글자 크기 80%
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = label.small ? fontPt * 0.8 : fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var marks = [[label.sup, "sup"], [label.sub, "sub"], [label.roman, "roman"]];
                for (var m = 0; m < marks.length; m++) {
                    if (!marks[m][0]) continue;
                    for (var s = 0; s < marks[m][0].length; s++) {
                        var markAttributes = frame.textRange.characters[marks[m][0][s]].characterAttributes;
                        if (marks[m][1] === "sup") markAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                        else if (marks[m][1] === "sub") markAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                        else markAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var centered = dir[0] === 0 && dir[1] === 0;
                var reach = centered ? 0 : (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(′, √)는 HancomEQN. 숫자(upright)는 똑바로
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && code >= 97 && code <= 122) {
                        attributes.textFont = italicFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-extrema.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function safeValue(fn, x) {
                var y;
                try { y = fn(x); } catch (e) { return NaN; }
                return (typeof y === "number" && isFinite(y)) ? y : NaN;
            }

            function derivativeAt(fn, x) {
                var h = 1e-5 * (1 + Math.abs(x));
                return (safeValue(fn, x + h) - safeValue(fn, x - h)) / (2 * h);
            }

            function secondDerivativeAt(fn, x) {
                var h = 1e-3 * (1 + Math.abs(x));
                return (safeValue(fn, x + h) - 2 * safeValue(fn, x) + safeValue(fn, x - h)) / (h * h);
            }

            // g(x) = 0인 점 (x 순서, [x0, x1] 안). 부호가 바뀌는 곳은 이분법, 부호는 그대로 0에 닿는 곳은 |g|의 작은 극소
            function zerosOf(g, x0, x1) {
                var N = 600, found = [], xs = [], vs = [];   // 미리보기마다 돌아서 적게 (ExtendScript는 느리다)
                for (var i = 0; i <= N; i++) { xs.push(x0 + (x1 - x0) * i / N); vs.push(g(xs[i])); }
                var scale = 0;
                for (var s = 0; s <= N; s++) if (!isNaN(vs[s])) scale = Math.max(scale, Math.abs(vs[s]));
                function add(x) {
                    for (var k = 0; k < found.length; k++) if (Math.abs(found[k] - x) < (x1 - x0) * 1e-4) return;
                    found.push(x);
                }
                for (var j = 1; j <= N; j++) {
                    var a = xs[j - 1], b = xs[j], va = vs[j - 1], vb = vs[j];
                    if (isNaN(va) || isNaN(vb)) continue;
                    if (va === 0) { add(a); continue; }
                    if (va * vb < 0) {
                        for (var t = 0; t < 60; t++) {
                            var m = (a + b) / 2, vm = g(m);
                            if (isNaN(vm)) break;
                            if (va * vm <= 0) b = m; else { a = m; va = vm; }
                        }
                        // 불연속에서 부호만 바뀐 곳(1/x)은 빼고
                        var root = (a + b) / 2;
                        if (Math.abs(g(root)) < 1e-4 * (1 + scale)) add(root);
                    }
                }
                // 닿기만 하는 0: |g|가 이웃보다 작고 거의 0
                for (var q = 1; q < N; q++) {
                    if (isNaN(vs[q - 1]) || isNaN(vs[q]) || isNaN(vs[q + 1])) continue;
                    if (Math.abs(vs[q]) <= Math.abs(vs[q - 1]) && Math.abs(vs[q]) <= Math.abs(vs[q + 1]) && vs[q - 1] * vs[q + 1] > 0) {
                        var lo = xs[q - 1], hi = xs[q + 1];
                        for (var it = 0; it < 80; it++) {
                            var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
                            if (Math.abs(g(m1)) < Math.abs(g(m2))) hi = m2; else lo = m1;
                        }
                        var touch = (lo + hi) / 2;
                        if (Math.abs(g(touch)) < 1e-6 * (1 + scale)) add(touch);
                    }
                }
                found.sort(function(p, r) { return p - r; });
                return found;
            }

            // f′ = 0인 점과 그 종류: {x, y, type:"max"|"min"|"flat"}. 범위 끝 가까이는 빼고
            function criticalPoints(fn, x0, x1) {
                var list = [], margin = (x1 - x0) * 1e-3;
                var zeros = zerosOf(function(x) { return derivativeAt(fn, x); }, x0, x1);
                for (var i = 0; i < zeros.length; i++) {
                    var x = zeros[i];
                    if (x < x0 + margin || x > x1 - margin) continue;
                    var h = (x1 - x0) * 1e-3;
                    var left = derivativeAt(fn, x - h), right = derivativeAt(fn, x + h);
                    var type = left > 0 && right < 0 ? "max" : (left < 0 && right > 0 ? "min" : "flat");
                    list.push({ x: x, y: safeValue(fn, x), type: type, left: left, right: right });
                }
                return list;
            }

            // f″의 부호가 바뀌는 곳
            function inflectionPoints(fn, x0, x1) {
                var list = [], margin = (x1 - x0) * 1e-3;
                var zeros = zerosOf(function(x) { return secondDerivativeAt(fn, x); }, x0, x1);
                for (var i = 0; i < zeros.length; i++) {
                    var x = zeros[i], h = (x1 - x0) * 2e-3;
                    if (x < x0 + margin || x > x1 - margin) continue;
                    if (secondDerivativeAt(fn, x - h) * secondDerivativeAt(fn, x + h) < 0) list.push({ x: x, y: safeValue(fn, x) });
                }
                return list;
            }

            function buildExtrema(o) {
                var u = o.unit, fn = o.f;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var points = criticalPoints(fn, o.xMin, o.xMax);
                var bends = o.inflection ? inflectionPoints(fn, o.xMin, o.xMax) : [];
                var showGraph = o.mode !== 2, showTable = o.mode !== 1;
                var tableTop = 0;

                if (showGraph) {
                    var left = Math.min(o.xMin, 0) - 0.5, right = o.xMax + 0.8, bottom = Math.min(o.yMin, 0) - 0.5, top = o.yMax + 0.8;
                    if (o.grid) {
                        for (var gx = o.xMin; gx <= o.xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, o.yMin * u], [gx * u, o.yMax * u]], "grid"));
                        for (var gy = o.yMin; gy <= o.yMax; gy++) if (gy !== 0) out.lines.push(straight([[o.xMin * u, gy * u], [o.xMax * u, gy * u]], "grid"));
                    }
                    out.lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                    out.lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                    out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                    out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                    out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                    out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                    out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                    for (var tx = o.xMin; tx <= o.xMax; tx++) {
                        if (tx === 0) continue;
                        out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                        if (o.numbers) out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = o.yMin; ty <= o.yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                        if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                    var segments = plotFunction(fn, o.xMin, o.xMax, o.yMin, o.yMax), end = null;
                    for (var s = 0; s < segments.length; s++) {
                        if (segments[s].length < 2) continue;
                        out.lines.push({ points: toBezier(segments[s], u), kind: "graph" });
                        var last = segments[s][segments[s].length - 1];
                        end = [last.x * u, last.y * u];
                    }
                    if (o.formula && end) {
                        var display = formulaDisplay(o.label);
                        out.texts.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: end, dir: [1, 0] });
                    }
                    // 극점: 점, 축까지 점선, 수평 접선, 값 글자
                    for (var p = 0; p < points.length; p++) {
                        var cp = points[p];
                        if (cp.type === "flat" || !o.extrema || isNaN(cp.y) || cp.y < o.yMin || cp.y > o.yMax) continue;
                        var at = [cp.x * u, cp.y * u];
                        out.dots.push(at);
                        if (Math.abs(cp.y) > 1e-9) out.lines.push(straight([at, [at[0], 0]], "guide"));
                        if (Math.abs(cp.x) > 1e-9) out.lines.push(straight([at, [0, at[1]]], "guide"));
                        if (o.flat) out.lines.push(straight([[at[0] - 0.6 * u, at[1]], [at[0] + 0.6 * u, at[1]]], "flat"));
                        if (o.values) {
                            out.texts.push({ text: niceNumber(cp.x), at: [at[0], 0], dir: [0, cp.y > 0 ? -1 : 1], clear: o.tick / 2, upright: true });
                            out.texts.push({ text: niceNumber(cp.y), at: [0, at[1]], dir: [cp.x > 0 ? -1 : 1, 0], clear: o.tick / 2, upright: true });
                        }
                    }
                    for (var b = 0; b < bends.length; b++) {
                        if (isNaN(bends[b].y) || bends[b].y < o.yMin || bends[b].y > o.yMax) continue;
                        out.dots.push([bends[b].x * u, bends[b].y * u]);
                    }
                    tableTop = bottom * u - o.row * 1.2;
                }

                if (showTable) buildTable(out, fn, points, o, showGraph ? Math.min(o.xMin, 0) * u - 0.5 * u : 0, tableTop);

                // 창: 극대·극소
                var parts = [];
                for (var n = 0; n < points.length; n++) {
                    if (points[n].type === "flat") continue;
                    parts.push((points[n].type === "max" ? "극대 " : "극소 ") + "f(" + niceNumber(points[n].x) + ") = " + niceNumber(points[n].y));
                }
                out.notes.push(parts.length > 0 ? parts.join(", ") : "극값 없음");
                if (bends.length > 0) {
                    var bendText = [];
                    for (var bi = 0; bi < bends.length; bi++) bendText.push("(" + niceNumber(bends[bi].x) + ", " + niceNumber(bends[bi].y) + ")");
                    out.notes.push("변곡점 " + bendText.join(", "));
                }
                return out;
            }

            // 증감표: 왼쪽 위 (left, top). 칸: [x | … | x₁ | … | x₂ | …], 줄: x, f′(x), f(x) (f(x) 줄은 극값·극대 두 줄이라 1.5배)
            function buildTable(out, fn, points, o, left, top) {
                var headW = o.cell * 0.9, w = o.cell, h = o.row, h3 = o.row * 1.5;
                var columns = points.length * 2 + 1;
                var right = left + headW + columns * w;
                var ys = [top, top - h, top - 2 * h, top - 2 * h - h3];
                for (var r = 0; r < ys.length; r++) out.lines.push(straight([[left, ys[r]], [right, ys[r]]], "table"));
                out.lines.push(straight([[left + headW, ys[0]], [left + headW, ys[3]]], "table"));
                var heads = [{ text: "x" }, { text: "f′(x)" }, { text: "f(x)" }];
                for (var hd = 0; hd < 3; hd++) {
                    out.texts.push({ text: heads[hd].text, at: [left + headW / 2, (ys[hd] + ys[hd + 1]) / 2], dir: [0, 0] });
                }
                for (var c = 0; c < columns; c++) {
                    var cx = left + headW + w * (c + 0.5);
                    var yX = (ys[0] + ys[1]) / 2, yD = (ys[1] + ys[2]) / 2, yF = (ys[2] + ys[3]) / 2;
                    if (c % 2 === 1) {
                        var cp = points[(c - 1) / 2];
                        out.texts.push({ text: niceNumber(cp.x), at: [cx, yX], dir: [0, 0], upright: true });
                        out.texts.push({ text: "0", at: [cx, yD], dir: [0, 0], upright: true });
                        if (cp.type === "flat") {
                            out.texts.push({ text: niceNumber(cp.y), at: [cx, yF], dir: [0, 0], upright: true });
                        } else {
                            out.texts.push({ text: niceNumber(cp.y), at: [cx, yF - h3 * 0.18], dir: [0, 0], upright: true });
                            out.texts.push({ text: cp.type === "max" ? "극대" : "극소", at: [cx, yF + h3 * 0.22], dir: [0, 0], small: true });
                        }
                    } else {
                        out.texts.push({ text: "…", at: [cx, yX], dir: [0, 0], upright: true });
                        // 사이 구간의 부호: 가운데에서 f′
                        var from = c === 0 ? o.xMin : points[c / 2 - 1].x, to = c === columns - 1 ? o.xMax : points[c / 2].x;
                        var slope = derivativeAt(fn, (from + to) / 2);
                        out.texts.push({ text: slope > 0 ? "+" : "-", at: [cx, yD], dir: [0, 0], upright: true });
                        var size = Math.min(w, h3) * 0.28, rise = slope > 0 ? 1 : -1;
                        var start = [cx - size, yF - rise * size], tip = [cx + size, yF + rise * size];
                        var d = [0.7071, rise * 0.7071];
                        out.lines.push(straight([start, [tip[0] - d[0] * (TREND_ARROW.length - TREND_ARROW.notch), tip[1] - d[1] * (TREND_ARROW.length - TREND_ARROW.notch)]], "table"));
                        out.arrows.push({ tip: tip, dir: d, trend: true });
                    }
                }
            }

            // 정수, 분모 6까지의 분수, ±√n, ±k√n으로 알아볼 수 있으면 그렇게. 아니면 소수 둘째 자리
            function niceNumber(v) {
                if (Math.abs(v) < 1e-7) return "0";
                var sign = v < 0 ? "-" : "", a = Math.abs(v);
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(a * q);
                    if (Math.abs(p / q - a) < 1e-6 * (1 + a)) return sign + (q === 1 ? String(p) : p + "/" + q);
                }
                var square = a * a;
                if (Math.abs(square - Math.round(square)) < 1e-6 * (1 + square)) {
                    var n = Math.round(square), outside = 1;
                    for (var k = 2; k * k <= n; k++) while (n % (k * k) === 0) { n /= k * k; outside *= k; }
                    return sign + (outside === 1 ? "" : String(outside)) + "√" + n;
                }
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // 좌표 범위 [x0,x1]×[y0,y1] 안에 드는 조각들. 각 점 {x, y, m(기울기)}
            function plotFunction(fn, x0, x1, y0, y1) {
                var TOLERANCE = 0.004, MAX_DEPTH = 10, STEP = 0.25, LIMIT = 4000;
                var margin = (y1 - y0) * 1e-9;
                var segments = [], current = null, count = 0;

                function value(x) {
                    var y;
                    try { y = fn(x); } catch (e) { return NaN; }
                    return (typeof y === "number" && isFinite(y)) ? y : NaN;
                }
                function inside(x) {
                    var y = value(x);
                    return !isNaN(y) && y >= y0 - margin && y <= y1 + margin;
                }
                function slope(x) {
                    var h = 1e-5 * (1 + Math.abs(x));
                    var a = value(x - h), b = value(x + h), c = value(x);
                    if (!isNaN(a) && !isNaN(b)) return (b - a) / (2 * h);
                    if (!isNaN(b)) return (b - c) / h;
                    if (!isNaN(a)) return (c - a) / h;
                    return 0;
                }
                function emit(x) {
                    if (current === null) {
                        current = [];
                        segments.push(current);
                    }
                    if (count++ > LIMIT) return;
                    var y = Math.min(y1, Math.max(y0, value(x)));
                    current.push({ x: x, y: y, m: slope(x) });
                }
                function finish() { current = null; }
                // 안(inX)과 밖(outX) 사이 경계. 안쪽 끝을 돌려준다
                function edge(inX, outX) {
                    for (var i = 0; i < 40; i++) {
                        var mid = (inX + outX) / 2;
                        if (inside(mid)) inX = mid;
                        else outX = mid;
                    }
                    return inX;
                }
                // a는 이미 넣었다. b까지 넣는다
                function refine(a, b, depth) {
                    var mid = (a + b) / 2;
                    if (!inside(mid)) {
                        var cut = edge(a, mid);
                        if (cut > a) refine(a, cut, depth + 1);
                        finish();
                        var resume = edge(b, mid);
                        emit(resume);
                        if (b > resume) refine(resume, b, depth + 1);
                        return;
                    }
                    var h = b - a;
                    var ya = value(a), yb = value(b);
                    var guess = (ya + yb) / 2 + h * (slope(a) - slope(b)) / 8;
                    if (depth < MAX_DEPTH && Math.abs(guess - value(mid)) > TOLERANCE) {
                        refine(a, mid, depth + 1);
                        refine(mid, b, depth + 1);
                    } else {
                        emit(b);
                    }
                }

                var steps = Math.ceil((x1 - x0) / STEP);
                for (var i = 0; i < steps; i++) {
                    var a = x0 + (x1 - x0) * i / steps, b = x0 + (x1 - x0) * (i + 1) / steps;
                    var inA = inside(a), inB = inside(b);
                    if (inA && current === null) emit(a);
                    if (inA && inB) {
                        refine(a, b, 0);
                    } else if (inA) {
                        var last = edge(a, b);
                        if (last > a) refine(a, last, 0);
                        finish();
                    } else if (inB) {
                        var first = edge(b, a);
                        emit(first);
                        refine(first, b, 0);
                    }
                }
                for (var k = 0; k < segments.length; k++) segments[k] = simplify(segments[k]);
                return segments;

                // 빼도 앞뒤 점의 에르미트 곡선이 함수에서 벗어나지 않는 점은 지운다 (직선은 두 점만 남는다)
                function simplify(points) {
                    if (points.length < 3) return points;
                    var kept = [points[0]];
                    for (var i = 1; i < points.length - 1; i++) {
                        if (!fits(kept[kept.length - 1], points[i + 1])) kept.push(points[i]);
                    }
                    kept.push(points[points.length - 1]);
                    return kept;
                }
                function fits(p, q) {
                    var h = q.x - p.x;
                    for (var j = 1; j < 8; j++) {
                        var t = j / 8, x = p.x + h * t, y = value(x);
                        if (isNaN(y) || y < y0 - margin || y > y1 + margin) return false;
                        var t2 = t * t, t3 = t2 * t;
                        var guess = (2 * t3 - 3 * t2 + 1) * p.y + (t3 - 2 * t2 + t) * h * p.m + (-2 * t3 + 3 * t2) * q.y + (t3 - t2) * h * q.m;
                        if (Math.abs(guess - y) > TOLERANCE) return false;
                    }
                    return true;
                }
            }

            // 에르미트 → 베지어: 핸들 = 이웃까지 x 간격의 1/3만큼 접선 방향
            function toBezier(points, unit) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    var anchor = [p.x * unit, p.y * unit];
                    var left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (p.x - points[i - 1].x) / 3;
                        left = [(p.x - hl) * unit, (p.y - p.m * hl) * unit];
                    }
                    if (i < points.length - 1) {
                        var hr = (points[i + 1].x - p.x) / 3;
                        right = [(p.x + hr) * unit, (p.y + p.m * hr) * unit];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
            }

            // 식 표시: ^와 *는 빼고 ^ 다음은 위첨자, _ 다음은 아래첨자(log_2 → log₂). sin·cos·tan·log·ln은 똑바로(roman),
            // 그 뒤에 괄호·첨자가 없으면 한 칸 띄운다 (sin x). pi는 π
            function formulaDisplay(text) {
                var source = String(text).replace(/\s/g, "").split("pi").join("π");
                var FUNCS = ["sin", "cos", "tan", "log", "ln"];
                var out = "", sup = [], sub = [], roman = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) {
                                marks.push(out.length);
                                out += source.charAt(j);
                            }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                                marks.push(out.length);
                                out += source.charAt(++i);
                            }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    var name = null;
                    for (var k = 0; k < FUNCS.length; k++) if (source.substr(i, FUNCS[k].length) === FUNCS[k]) { name = FUNCS[k]; break; }
                    if (name) {
                        for (var n = 0; n < name.length; n++) {
                            roman.push(out.length);
                            out += name.charAt(n);
                        }
                        i += name.length - 1;
                        var after = source.charAt(i + 1);
                        if (after !== "" && after !== "(" && after !== "_" && after !== "^") out += " ";
                        continue;
                    }
                    out += ch;
                }
                return { text: out, sup: sup, sub: sub, roman: roman };
            }

            // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null.
            // 2x, 1/2x(=½x), x^2, √x, |x-1|, 2^x, e^x, π(pi), sin 2x, cos(x+1), tan x, log_2 x, log x(밑 10), ln x
            function compileFunction(text) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["sin", "cos", "tan", "log", "ln", "pi", "e", "x"];
                var FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
                var pos = 0, absDepth = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function nameAt() {
                    for (var i = 0; i < NAMES.length; i++) if (s.substr(pos, NAMES[i].length) === NAMES[i]) return NAMES[i];
                    return null;
                }
                // 곱셈 기호 없이 이어지는 인수의 시작 (2x, 2√3, 2(x+1), 2sin x, 2|x|)
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || nameAt() !== null || (ch === "|" && absDepth === 0);
                }
                function expression() {
                    var node = term();
                    while (peek() === "+" || peek() === "-") {
                        var op = s.charAt(pos++);
                        node = binary(op, node, term());
                    }
                    return node;
                }
                function term() {
                    var node = unary();
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        else op = "*";
                        node = binary(op, node, power());
                    }
                    return node;
                }
                function unary() {
                    if (peek() === "-") { pos++; return negate(unary()); }
                    if (peek() === "+") { pos++; return unary(); }
                    return power();
                }
                function power() {
                    var base = primary();
                    if (peek() === "^") {
                        pos++;
                        return binary("^", base, unary());
                    }
                    return base;
                }
                // 함수 인수: 괄호면 그 괄호, 아니면 곱셈으로 이어진 인수들 (sin 2x = sin(2x), 다음 함수 이름 앞에서 끝)
                function argument() {
                    if (peek() === "(") return primary();
                    var node = power();
                    while (startsFactor() && peek() !== "(" && !isFunctionName(nameAt())) node = binary("*", node, power());
                    return node;
                }
                function isFunctionName(name) { return name === "sin" || name === "cos" || name === "tan" || name === "log" || name === "ln"; }
                function primary() {
                    var ch = peek();
                    if (ch === "|") {
                        pos++;
                        absDepth++;
                        var inside = expression();
                        if (peek() !== "|") throw new Error("abs");
                        pos++;
                        absDepth--;
                        return function(x) { return Math.abs(inside(x)); };
                    }
                    var name = nameAt();
                    if (name !== null) {
                        pos += name.length;
                        if (name === "x") return function(x) { return x; };
                        if (name === "pi") return function() { return Math.PI; };
                        if (name === "e") return function() { return Math.E; };
                        if (name === "log") {
                            var base = function() { return 10; };
                            if (peek() === "_") { pos++; base = primary(); }
                            var logArg = argument();
                            return function(x) { return Math.log(logArg(x)) / Math.log(base(x)); };
                        }
                        var arg = argument();
                        if (name === "ln") return function(x) { return Math.log(arg(x)); };
                        var fn = FUNCS[name];
                        return function(x) { return fn(arg(x)); };
                    }
                    if (ch === "√") { pos++; var inner = power(); return function(x) { return Math.sqrt(inner(x)); }; }
                    if (ch === "(") {
                        pos++;
                        var node = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return node;
                    }
                    var begin = pos, dots = 0;
                    while (isDigit(peek()) || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var number = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
                    return function() { return number; };
                }
                function negate(node) { return function(x) { return -node(x); }; }
                function binary(op, a, b) {
                    if (op === "+") return function(x) { return a(x) + b(x); };
                    if (op === "-") return function(x) { return a(x) - b(x); };
                    if (op === "*") return function(x) { return a(x) * b(x); };
                    if (op === "/") return function(x) { return a(x) / b(x); };
                    return function(x) { return Math.pow(a(x), b(x)); };
                }
                try {
                    var fn = expression();
                    if (pos !== s.length) return null;
                    return fn;
                } catch (e) {
                    return null;
                }
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

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unitText ? " (" + unitText + "):" : ":")).preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM_TO_PT;
                    setter(value);
                    setRowValue(controls, value);
                    if (delta === 0 || previewGroup === null) return;
                    previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
                return Math.round(value / step) * step;
            }

            function formatNumber(value, decimals) {
                return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
            }


            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", encodeURIComponent(fText), mode, xMin, xMax, yMin, yMax, unitMm, cellMm, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14 || p[10].length !== FLAG_KEYS.length) return;
                try {
                    fText = decodeURIComponent(p[1]);
                    mode = Math.round(restoreNumber(p[2], mode, 0, MODES.length - 1));
                    xMin = Math.round(restoreNumber(p[3], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[4], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[5], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[6], yMax, 1, 20));
                    unitMm = restoreNumber(p[7], unitMm, 2, 20);
                    cellMm = restoreNumber(p[8], cellMm, 6, 30);
                    fontPt = restoreNumber(p[9], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[10].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[11], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[12], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[13] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 미적분 ====
    // 미적분 그림: 함수 f(와 두 번째 곡선 g)의 그래프, 구간 [a, b]의 넓이 칠하기(정적분, 두 곡선 사이),
    // 구분구적법 직사각형(왼쪽 끝·오른쪽 끝), 점 P(t, f(t))에서의 접선을 그린다.
    // 정적분 값·넓이·직사각형 넓이 합·접선의 방정식은 창에 보여 준다.
    // 선 두께: 축 0.4pt, 그래프·접선 0.8pt, 경계·보조 점선 0.3pt, 직사각형 테두리 0.4pt. 선택은 필요 없다.
    // 식 읽기·그래프 베지어는 중학교 수학 좌표평면 탭(Object_MiddleMath.jsx)과 같은 코드다.
    function makeCalculusEngine() {
        var api = {label: "미적분", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathCalculus/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(π, √ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var SHADES = ["칠하지 않음", "넓이 칠하기", "직사각형 (왼쪽 끝)", "직사각형 (오른쪽 끝)"];
            var ENDS = ["a, b", "값", "없음"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["grid", "numbers", "formulas", "bounds", "tangent", "tangentGuides"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var xMin = -1, xMax = 5, yMin = -1, yMax = 5;
            var unitMm = 8;
            var fontPt = 8;
            var fText = "y=-x^2+4x";
            var gText = "";
            var shade = 1;
            var aValue = 0;
            var bValue = 4;
            var countValue = 8;
            var shadeK = 20;
            var areaName = "S";
            var ends = 0;
            var tangentName = "P";
            var tValue = 1;
            var opt = { grid: false, numbers: true, formulas: true, bounds: false, tangent: false, tangentGuides: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var checks = {};
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"], ["formulas", "그래프 끝에 식"]]);

            var functionPanel = addPanel(win, "함수");
            var fRow = functionPanel.add("group");
            fRow.add("statictext", undefined, "f:").preferredSize.width = 20;
            var fInput = fRow.add("edittext", undefined, fText);
            fInput.preferredSize.width = 320;
            fInput.helpTip = "y=-x^2+4x, y=x^3-3x, y=√x, y=e^x, y=ln x, y=sin x, y=1/x. ^는 거듭제곱, 곱셈 기호는 생략해도 된다";
            var gRow = functionPanel.add("group");
            gRow.add("statictext", undefined, "g:").preferredSize.width = 20;
            var gInput = gRow.add("edittext", undefined, gText);
            gInput.preferredSize.width = 320;
            gInput.helpTip = "두 곡선 사이의 넓이를 칠할 때만 넣는다 (예: y=x). 비우면 f와 x축 사이";

            var areaPanel = addPanel(win, "넓이");
            var shadeRow = areaPanel.add("group");
            shadeRow.add("statictext", undefined, "표시:");
            var shadeList = shadeRow.add("dropdownlist", undefined, SHADES);
            shadeList.selection = shade;
            shadeRow.add("statictext", undefined, "넓이 글자:");
            var areaNameInput = shadeRow.add("edittext", undefined, areaName);
            areaNameInput.preferredSize.width = 40;
            areaNameInput.helpTip = "칠한 영역 가운데에 넣는다. 비우면 넣지 않는다";
            var aControls = addValueRow(areaPanel, "a", "", aValue, -20, 20, 0.1, 1);
            var bControls = addValueRow(areaPanel, "b", "", bValue, -20, 20, 0.1, 1);
            var countControls = addValueRow(areaPanel, "직사각형 수", "", countValue, 1, 50, 1, 0);
            var shadeControls = addValueRow(areaPanel, "음영", "K", shadeK, 5, 60, 5, 0);
            var endRow = areaPanel.add("group");
            endRow.add("statictext", undefined, "끝 글자:");
            var endList = endRow.add("dropdownlist", undefined, ENDS);
            endList.selection = ends;
            var boundsCheck = endRow.add("checkbox", undefined, "경계 점선");
            bindOption(boundsCheck, "bounds");

            var tangentPanel = addPanel(win, "접선");
            var tangentRow = tangentPanel.add("group");
            var tangentCheck = tangentRow.add("checkbox", undefined, "접선");
            bindOption(tangentCheck, "tangent");
            tangentRow.add("statictext", undefined, "접점:");
            var tangentNameInput = tangentRow.add("edittext", undefined, tangentName);
            tangentNameInput.preferredSize.width = 40;
            var tangentGuidesCheck = tangentRow.add("checkbox", undefined, "축까지 점선");
            bindOption(tangentGuidesCheck, "tangentGuides");
            var tControls = addValueRow(tangentPanel, "접점 x", "", tValue, -20, 20, 0.1, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            fInput.onChanging = function() { fText = fInput.text; updatePreview(); };
            gInput.onChanging = function() { gText = gInput.text; updatePreview(); };
            shadeList.onChange = function() {
                shade = shadeList.selection ? shadeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            areaNameInput.onChanging = function() { areaName = areaNameInput.text; updatePreview(); };
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(countControls, function(value) { countValue = value; });
            bindValueRow(shadeControls, function(value) { shadeK = value; });
            endList.onChange = function() { ends = endList.selection ? endList.selection.index : 0; updatePreview(); };
            tangentNameInput.onChanging = function() { tangentName = tangentNameInput.text; updatePreview(); };
            bindValueRow(tControls, function(value) { tValue = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. f를 못 읽으면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(messageText.text);
                    return false;
                }
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function refreshEnabled() {
                areaNameInput.enabled = shade === 1;
                countControls.input.parent.enabled = shade >= 2;
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                    checks[items[i][0]] = check;
                }
            }

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
                    updatePreview();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                var f = compileFunction(fText);
                if (f === null) {
                    messageText.text = "f를 읽지 못함 (예: y=-x^2+4x)";
                    return;
                }
                var hasG = String(gText).replace(/\s/g, "") !== "";
                var g = hasG ? compileFunction(gText) : null;
                var drawing = buildCalculus({
                    f: f, fLabel: fText, g: g, gLabel: gText,
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    grid: opt.grid, numbers: opt.numbers, formulas: opt.formulas, fontSize: fontPt,
                    shade: shade, shadeK: shadeK, a: aValue, b: bValue, count: Math.round(countValue), areaName: areaName, ends: ends, bounds: opt.bounds,
                    tangent: opt.tangent, t: tValue, tangentName: tangentName, tangentGuides: opt.tangentGuides
                });
                var notes = drawing.notes;
                if (hasG && g === null) notes.unshift("g를 읽지 못함");
                messageText.text = notes.length > 0 ? notes.join(" · ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "미적분";
                for (var s = 0; s < drawing.fills.length; s++) addFill(drawing.fills[s]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // 칠한 영역·직사각형: {points:[{anchor,left,right}], k, stroked}
            function addFill(fill) {
                var path = previewGroup.pathItems.add();
                setBezier(path, fill.points);
                path.closed = true;
                path.filled = true;
                path.fillColor = makeGray(fill.k);
                path.stroked = !!fill.stroked;
                if (fill.stroked) {
                    path.strokeColor = makeGray(100);
                    path.strokeWidth = AXIS_PT;
                    path.strokeJoin = StrokeJoin.MITERENDJOIN;
                }
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"grid"|"guide"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                setBezier(path, line.points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            function setBezier(path, points) {
                var anchors = [], curved = false;
                for (var i = 0; i < points.length; i++) {
                    anchors.push(points[i].anchor);
                    if (points[i].left !== points[i].anchor || points[i].right !== points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (!curved) return;
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                }
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var d = arrow.dir, n = [-d[1], d[0]];
                var tip = arrow.tip;
                var back = [tip[0] - d[0] * ARROW.length, tip[1] - d[1] * ARROW.length];
                var path = previewGroup.pathItems.add();
                path.setEntirePath([
                    tip,
                    [back[0] + n[0] * ARROW.halfWidth, back[1] + n[1] * ARROW.halfWidth],
                    [back[0] + d[0] * ARROW.notch, back[1] + d[1] * ARROW.notch],
                    [back[0] - n[0] * ARROW.halfWidth, back[1] - n[1] * ARROW.halfWidth]
                ]);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(100);
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 gap(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다 (dir이 [0,0]이면 가운데).
            // sup/sub: 위·아래첨자 글자 위치, roman: 기울이지 않는 함수 이름
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                markCharacters(frame, label.sup, "sup");
                markCharacters(frame, label.sub, "sub");
                markCharacters(frame, label.roman, "roman");
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var centered = dir[0] === 0 && dir[1] === 0;
                var reach = centered ? 0 : (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            function markCharacters(frame, indices, how) {
                if (!indices) return;
                for (var i = 0; i < indices.length; i++) {
                    var character = frame.textRange.characters[indices[i]];
                    var attributes = character.characterAttributes;
                    if (how === "sup") attributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                    else if (how === "sub") attributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                    else attributes.textFont = engFont;
                }
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(π, √)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && code >= 97 && code <= 122) {
                        attributes.textFont = italicFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-calculus.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function buildCalculus(o) {
                var u = o.unit;
                var out = { fills: [], lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var left = Math.min(o.xMin, 0) - 0.5, right = o.xMax + 0.8;
                var bottom = Math.min(o.yMin, 0) - 0.5, top = o.yMax + 0.8;
                function value(fn, x) {
                    var y;
                    try { y = fn(x); } catch (e) { return NaN; }
                    return (typeof y === "number" && isFinite(y)) ? y : NaN;
                }
                function base(x) { return o.g ? value(o.g, x) : 0; }
                function inRange(y) { return !isNaN(y) && y >= o.yMin - 1e-9 && y <= o.yMax + 1e-9; }

                // 축·눈금
                if (o.grid) {
                    for (var gx = o.xMin; gx <= o.xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, o.yMin * u], [gx * u, o.yMax * u]], "grid"));
                    for (var gy = o.yMin; gy <= o.yMax; gy++) if (gy !== 0) out.lines.push(straight([[o.xMin * u, gy * u], [o.xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                var tickNumbers = {};
                for (var tx = o.xMin; tx <= o.xMax; tx++) {
                    if (tx === 0) continue;
                    out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                    if (o.numbers) {
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                        tickNumbers[tx] = true;
                    }
                }
                for (var ty = o.yMin; ty <= o.yMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 구간 [a, b]: 넓이 칠하기 또는 직사각형
                var a = Math.min(o.a, o.b), b = Math.max(o.a, o.b);
                if (o.shade > 0 && b - a > 1e-9) {
                    var integral = simpson(function(x) { return value(o.f, x) - base(x); }, a, b);
                    var area = simpson(function(x) { return Math.abs(value(o.f, x) - base(x)); }, a, b);
                    if (isNaN(integral)) out.notes.push("구간에서 정의되지 않음");
                    else if (o.g) out.notes.push("∫(f-g)dx = " + formatValue(integral) + ", 넓이 = " + formatValue(area));
                    else out.notes.push("∫f(x)dx = " + formatValue(integral) + ", 넓이 = " + formatValue(area));

                    if (o.shade === 1 && !isNaN(integral)) {
                        var region = regionPoints(o.f, o.g, a, b, o.yMin, o.yMax, u);
                        if (region === null) out.notes.push("칠할 곳이 y 범위를 벗어남");
                        else {
                            out.fills.push({ points: region, k: o.shadeK === undefined ? 20 : o.shadeK });
                            var name = String(o.areaName || "").replace(/^\s+|\s+$/g, "");
                            if (name !== "" && area > 1e-9) {
                                var cx = simpson(function(x) { return x * Math.abs(value(o.f, x) - base(x)); }, a, b) / area;
                                var cy = simpson(function(x) { return (value(o.f, x) + base(x)) / 2 * Math.abs(value(o.f, x) - base(x)); }, a, b) / area;
                                out.texts.push({ text: name, at: [cx * u, cy * u], dir: [0, 0], upright: true });
                            }
                        }
                    }
                    if (o.shade >= 2) {
                        var n = Math.max(1, Math.round(o.count)), w = (b - a) / n, sum = 0, broken = false;
                        for (var i = 0; i < n; i++) {
                            var x0 = a + w * i, x1 = x0 + w;
                            var at = o.shade === 2 ? x0 : x1;
                            var hi = value(o.f, at), lo = base(at);
                            if (isNaN(hi) || isNaN(lo)) { broken = true; continue; }
                            sum += (hi - lo) * w;
                            var yTop = clampValue(hi, o.yMin, o.yMax), yBottom = clampValue(lo, o.yMin, o.yMax);
                            if (Math.abs(yTop - yBottom) < 1e-9) continue;
                            out.fills.push({ points: straight([[x0 * u, yBottom * u], [x1 * u, yBottom * u], [x1 * u, yTop * u], [x0 * u, yTop * u]], "rect").points,
                                k: o.shadeK === undefined ? 20 : o.shadeK, stroked: true });
                        }
                        if (!broken) out.notes.push("직사각형 " + n + "개 넓이 합 = " + formatValue(sum));
                    }

                    // 끝 글자 (a, b 또는 값)와 경계 점선. 끝 글자는 그래프 반대쪽(축 아래·위)에 둔다
                    var edges = [a, b], edgeNames = ["a", "b"];
                    if (o.a > o.b) edgeNames = ["b", "a"];
                    for (var e = 0; e < 2; e++) {
                        var ex = edges[e], fy = value(o.f, ex), gy2 = base(ex);
                        if (o.bounds && !isNaN(fy) && !isNaN(gy2)) {
                            var y0 = clampValue(Math.min(fy, gy2), o.yMin, o.yMax), y1 = clampValue(Math.max(fy, gy2), o.yMin, o.yMax);
                            if (y1 - y0 > 1e-9) out.lines.push(straight([[ex * u, y0 * u], [ex * u, y1 * u]], "guide"));
                        }
                        if (o.ends === 2 || Math.abs(ex) < 1e-9) continue;
                        var below = isNaN(fy) || fy >= 0;
                        if (o.ends === 0) {
                            out.lines.push(straight([[ex * u, -o.tick / 2], [ex * u, o.tick / 2]], "axis"));
                            out.texts.push({ text: edgeNames[e], at: [ex * u, 0], dir: [0, below ? -1 : 1], clear: o.tick / 2 });
                        } else if (!(Math.abs(ex - Math.round(ex)) < 1e-9 && tickNumbers[Math.round(ex)])) {
                            out.lines.push(straight([[ex * u, -o.tick / 2], [ex * u, o.tick / 2]], "axis"));
                            out.texts.push({ text: formatValue(ex), at: [ex * u, 0], dir: [0, below ? -1 : 1], clear: o.tick / 2, upright: true });
                        }
                    }
                }

                // 그래프와 끝의 식
                var formulaLabels = [];
                var graphs = [{ fn: o.f, label: o.fLabel }];
                if (o.g) graphs.push({ fn: o.g, label: o.gLabel });
                for (var k = 0; k < graphs.length; k++) {
                    var segments = plotFunction(graphs[k].fn, o.xMin, o.xMax, o.yMin, o.yMax);
                    for (var s = 0; s < segments.length; s++) {
                        if (segments[s].length < 2) continue;
                        out.lines.push({ points: toBezier(segments[s], u), kind: "graph" });
                    }
                    if (o.formulas && segments.length > 0) {
                        var lastSegment = segments[segments.length - 1];
                        var end = lastSegment[lastSegment.length - 1];
                        var display = formulaDisplay(graphs[k].label);
                        formulaLabels.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: [end.x * u, end.y * u], dir: [1, 0] });
                    }
                }

                // 접선: P(t, f(t))에서 기울기 f′(t). 글자는 곡선이 휘는 반대쪽에
                if (o.tangent) {
                    var t = o.t, ft = value(o.f, t), m = derivative(o.f, t);
                    if (isNaN(ft) || isNaN(m)) out.notes.push("접점에서 미분할 수 없음");
                    else {
                        out.notes.push("접선 " + lineEquation(m, ft - m * t));
                        var clip = clipLine(t, ft, m, o.xMin, o.xMax, o.yMin, o.yMax);
                        if (clip !== null) {
                            out.lines.push(straight([[clip[0] * u, (ft + m * (clip[0] - t)) * u], [clip[1] * u, (ft + m * (clip[1] - t)) * u]], "graph"));
                            if (o.formulas) formulaLabels.push({ text: "", at: [clip[1] * u, (ft + m * (clip[1] - t)) * u], dir: [1, 0], skip: true });
                        }
                        if (inRange(ft)) {
                            var P = [t * u, ft * u];
                            if (o.tangentGuides) {
                                if (Math.abs(ft) > 1e-9) out.lines.push(straight([P, [P[0], 0]], "guide"));
                                if (Math.abs(t) > 1e-9) out.lines.push(straight([P, [0, P[1]]], "guide"));
                            }
                            out.dots.push(P);
                            var pName = String(o.tangentName || "").replace(/^\s+|\s+$/g, "");
                            if (pName !== "") {
                                var normal = unit([-m, 1]);
                                var bend = secondDerivative(o.f, t);
                                var side = bend > 0 ? -1 : 1;
                                out.texts.push({ text: pName, at: P, dir: [normal[0] * side, normal[1] * side], upright: true });
                            }
                        }
                    }
                }

                // 끝점이 가까운 식 글자는 위에서부터 한 줄 간격 이상 벌린다
                formulaLabels.sort(function(p, q) { return q.at[1] - p.at[1]; });
                var lineGap = (o.fontSize || 8) * 1.3;
                for (var fl = 0; fl < formulaLabels.length; fl++) {
                    for (var prior = 0; prior < fl; prior++) {
                        var upper = formulaLabels[prior], lower = formulaLabels[fl];
                        if (Math.abs(upper.at[0] - lower.at[0]) < lineGap * 4 && upper.at[1] - lower.at[1] < lineGap) {
                            lower.at = [lower.at[0], upper.at[1] - lineGap];
                        }
                    }
                    if (!formulaLabels[fl].skip) out.texts.push(formulaLabels[fl]);
                }
                return out;
            }

            // 구간 [a, b]에서 f와 g(없으면 x축) 사이를 닫힌 베지어 하나로. f·g가 y 범위를 벗어나거나 끊기면 null
            function regionPoints(f, g, a, b, y0, y1, u) {
                var upper = wholeCurve(f, a, b, y0, y1, u);
                if (upper === null) return null;
                var lower;
                if (g) {
                    lower = wholeCurve(g, a, b, y0, y1, u);
                    if (lower === null) return null;
                    lower = reverseBezier(lower);
                } else {
                    if (y0 > 0 || y1 < 0) return null;
                    lower = straight([[b * u, 0], [a * u, 0]], "fill").points;
                }
                return upper.concat(lower);
            }

            function wholeCurve(fn, a, b, y0, y1, u) {
                var segments = plotFunction(fn, a, b, y0, y1);
                if (segments.length !== 1) return null;
                var points = segments[0], span = b - a;
                if (points.length < 2 || points[0].x - a > span * 1e-6 || b - points[points.length - 1].x > span * 1e-6) return null;
                return toBezier(points, u);
            }

            function reverseBezier(points) {
                var out = [];
                for (var i = points.length - 1; i >= 0; i--) out.push({ anchor: points[i].anchor, left: points[i].right, right: points[i].left });
                return out;
            }

            // 심프슨 공식 (400칸). 정의되지 않는 점이 있으면 NaN
            function simpson(fn, a, b) {
                var n = 400, h = (b - a) / n, sum = fn(a) + fn(b);
                for (var i = 1; i < n; i++) sum += fn(a + h * i) * (i % 2 === 1 ? 4 : 2);
                return sum * h / 3;
            }

            function derivative(fn, x) {
                var h = 1e-5 * (1 + Math.abs(x)), p, q;
                try { p = fn(x + h); q = fn(x - h); } catch (e) { return NaN; }
                var m = (p - q) / (2 * h);
                return isFinite(m) ? m : NaN;
            }

            function secondDerivative(fn, x) {
                var h = 1e-3 * (1 + Math.abs(x)), p, c, q;
                try { p = fn(x + h); c = fn(x); q = fn(x - h); } catch (e) { return 0; }
                var d = (p - 2 * c + q) / (h * h);
                return isFinite(d) ? d : 0;
            }

            // 점 (t, y)를 지나는 기울기 m 직선이 [x0,x1]×[y0,y1] 안에 드는 x 구간. 안 지나면 null
            function clipLine(t, y, m, x0, x1, y0, y1) {
                var lo = x0, hi = x1;
                if (Math.abs(m) > 1e-12) {
                    var p = t + (y0 - y) / m, q = t + (y1 - y) / m;
                    lo = Math.max(lo, Math.min(p, q));
                    hi = Math.min(hi, Math.max(p, q));
                } else if (y < y0 || y > y1) {
                    return null;
                }
                return hi - lo > 1e-9 ? [lo, hi] : null;
            }

            // y = 2x + 1, y = -x - 3, y = 4 (소수 둘째 자리)
            function lineEquation(m, c) {
                var mText = formatValue(m), cText = formatValue(Math.abs(c));
                var text = "y = ";
                if (mText === "0") return text + formatValue(c);
                text += mText === "1" ? "" : (mText === "-1" ? "-" : mText);
                text += "x";
                if (cText !== "0") text += (c < 0 ? " - " : " + ") + cText;
                return text;
            }

            function clampValue(value, minimum, maximum) {
                return value < minimum ? minimum : (value > maximum ? maximum : value);
            }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // 좌표 범위 [x0,x1]×[y0,y1] 안에 드는 조각들. 각 점 {x, y, m(기울기)}
            function plotFunction(fn, x0, x1, y0, y1) {
                var TOLERANCE = 0.004, MAX_DEPTH = 10, STEP = 0.25, LIMIT = 4000;
                var margin = (y1 - y0) * 1e-9;
                var segments = [], current = null, count = 0;

                function value(x) {
                    var y;
                    try { y = fn(x); } catch (e) { return NaN; }
                    return (typeof y === "number" && isFinite(y)) ? y : NaN;
                }
                function inside(x) {
                    var y = value(x);
                    return !isNaN(y) && y >= y0 - margin && y <= y1 + margin;
                }
                function slope(x) {
                    var h = 1e-5 * (1 + Math.abs(x));
                    var a = value(x - h), b = value(x + h), c = value(x);
                    if (!isNaN(a) && !isNaN(b)) return (b - a) / (2 * h);
                    if (!isNaN(b)) return (b - c) / h;
                    if (!isNaN(a)) return (c - a) / h;
                    return 0;
                }
                function emit(x) {
                    if (current === null) {
                        current = [];
                        segments.push(current);
                    }
                    if (count++ > LIMIT) return;
                    var y = Math.min(y1, Math.max(y0, value(x)));
                    current.push({ x: x, y: y, m: slope(x) });
                }
                function finish() { current = null; }
                // 안(inX)과 밖(outX) 사이 경계. 안쪽 끝을 돌려준다
                function edge(inX, outX) {
                    for (var i = 0; i < 40; i++) {
                        var mid = (inX + outX) / 2;
                        if (inside(mid)) inX = mid;
                        else outX = mid;
                    }
                    return inX;
                }
                // a는 이미 넣었다. b까지 넣는다
                function refine(a, b, depth) {
                    var mid = (a + b) / 2;
                    if (!inside(mid)) {
                        var cut = edge(a, mid);
                        if (cut > a) refine(a, cut, depth + 1);
                        finish();
                        var resume = edge(b, mid);
                        emit(resume);
                        if (b > resume) refine(resume, b, depth + 1);
                        return;
                    }
                    var h = b - a;
                    var ya = value(a), yb = value(b);
                    var guess = (ya + yb) / 2 + h * (slope(a) - slope(b)) / 8;
                    if (depth < MAX_DEPTH && Math.abs(guess - value(mid)) > TOLERANCE) {
                        refine(a, mid, depth + 1);
                        refine(mid, b, depth + 1);
                    } else {
                        emit(b);
                    }
                }

                var steps = Math.ceil((x1 - x0) / STEP);
                for (var i = 0; i < steps; i++) {
                    var a = x0 + (x1 - x0) * i / steps, b = x0 + (x1 - x0) * (i + 1) / steps;
                    var inA = inside(a), inB = inside(b);
                    if (inA && current === null) emit(a);
                    if (inA && inB) {
                        refine(a, b, 0);
                    } else if (inA) {
                        var last = edge(a, b);
                        if (last > a) refine(a, last, 0);
                        finish();
                    } else if (inB) {
                        var first = edge(b, a);
                        emit(first);
                        refine(first, b, 0);
                    }
                }
                for (var k = 0; k < segments.length; k++) segments[k] = simplify(segments[k]);
                return segments;

                // 빼도 앞뒤 점의 에르미트 곡선이 함수에서 벗어나지 않는 점은 지운다 (직선은 두 점만 남는다)
                function simplify(points) {
                    if (points.length < 3) return points;
                    var kept = [points[0]];
                    for (var i = 1; i < points.length - 1; i++) {
                        if (!fits(kept[kept.length - 1], points[i + 1])) kept.push(points[i]);
                    }
                    kept.push(points[points.length - 1]);
                    return kept;
                }
                function fits(p, q) {
                    var h = q.x - p.x;
                    for (var j = 1; j < 8; j++) {
                        var t = j / 8, x = p.x + h * t, y = value(x);
                        if (isNaN(y) || y < y0 - margin || y > y1 + margin) return false;
                        var t2 = t * t, t3 = t2 * t;
                        var guess = (2 * t3 - 3 * t2 + 1) * p.y + (t3 - 2 * t2 + t) * h * p.m + (-2 * t3 + 3 * t2) * q.y + (t3 - t2) * h * q.m;
                        if (Math.abs(guess - y) > TOLERANCE) return false;
                    }
                    return true;
                }
            }

            // 에르미트 → 베지어: 핸들 = 이웃까지 x 간격의 1/3만큼 접선 방향
            function toBezier(points, unit) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    var anchor = [p.x * unit, p.y * unit];
                    var left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (p.x - points[i - 1].x) / 3;
                        left = [(p.x - hl) * unit, (p.y - p.m * hl) * unit];
                    }
                    if (i < points.length - 1) {
                        var hr = (points[i + 1].x - p.x) / 3;
                        right = [(p.x + hr) * unit, (p.y + p.m * hr) * unit];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
            }

            // 식 표시: ^와 *는 빼고 ^ 다음은 위첨자, _ 다음은 아래첨자(log_2 → log₂). sin·cos·tan·log·ln은 똑바로(roman),
            // 그 뒤에 괄호·첨자가 없으면 한 칸 띄운다 (sin x). pi는 π
            function formulaDisplay(text) {
                var source = String(text).replace(/\s/g, "").split("pi").join("π");
                var FUNCS = ["sin", "cos", "tan", "log", "ln"];
                var out = "", sup = [], sub = [], roman = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) {
                                marks.push(out.length);
                                out += source.charAt(j);
                            }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                                marks.push(out.length);
                                out += source.charAt(++i);
                            }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    var name = null;
                    for (var k = 0; k < FUNCS.length; k++) if (source.substr(i, FUNCS[k].length) === FUNCS[k]) { name = FUNCS[k]; break; }
                    if (name) {
                        for (var n = 0; n < name.length; n++) {
                            roman.push(out.length);
                            out += name.charAt(n);
                        }
                        i += name.length - 1;
                        var after = source.charAt(i + 1);
                        if (after !== "" && after !== "(" && after !== "_" && after !== "^") out += " ";
                        continue;
                    }
                    out += ch;
                }
                return { text: out, sup: sup, sub: sub, roman: roman };
            }

            // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null.
            // 2x, 1/2x(=½x), x^2, √x, |x-1|, 2^x, e^x, π(pi), sin 2x, cos(x+1), tan x, log_2 x, log x(밑 10), ln x
            function compileFunction(text) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["sin", "cos", "tan", "log", "ln", "pi", "e", "x"];
                var FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
                var pos = 0, absDepth = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function nameAt() {
                    for (var i = 0; i < NAMES.length; i++) if (s.substr(pos, NAMES[i].length) === NAMES[i]) return NAMES[i];
                    return null;
                }
                // 곱셈 기호 없이 이어지는 인수의 시작 (2x, 2√3, 2(x+1), 2sin x, 2|x|)
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || nameAt() !== null || (ch === "|" && absDepth === 0);
                }
                function expression() {
                    var node = term();
                    while (peek() === "+" || peek() === "-") {
                        var op = s.charAt(pos++);
                        node = binary(op, node, term());
                    }
                    return node;
                }
                function term() {
                    var node = unary();
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        else op = "*";
                        node = binary(op, node, power());
                    }
                    return node;
                }
                function unary() {
                    if (peek() === "-") { pos++; return negate(unary()); }
                    if (peek() === "+") { pos++; return unary(); }
                    return power();
                }
                function power() {
                    var base = primary();
                    if (peek() === "^") {
                        pos++;
                        return binary("^", base, unary());
                    }
                    return base;
                }
                // 함수 인수: 괄호면 그 괄호, 아니면 곱셈으로 이어진 인수들 (sin 2x = sin(2x), 다음 함수 이름 앞에서 끝)
                function argument() {
                    if (peek() === "(") return primary();
                    var node = power();
                    while (startsFactor() && peek() !== "(" && !isFunctionName(nameAt())) node = binary("*", node, power());
                    return node;
                }
                function isFunctionName(name) { return name === "sin" || name === "cos" || name === "tan" || name === "log" || name === "ln"; }
                function primary() {
                    var ch = peek();
                    if (ch === "|") {
                        pos++;
                        absDepth++;
                        var inside = expression();
                        if (peek() !== "|") throw new Error("abs");
                        pos++;
                        absDepth--;
                        return function(x) { return Math.abs(inside(x)); };
                    }
                    var name = nameAt();
                    if (name !== null) {
                        pos += name.length;
                        if (name === "x") return function(x) { return x; };
                        if (name === "pi") return function() { return Math.PI; };
                        if (name === "e") return function() { return Math.E; };
                        if (name === "log") {
                            var base = function() { return 10; };
                            if (peek() === "_") { pos++; base = primary(); }
                            var logArg = argument();
                            return function(x) { return Math.log(logArg(x)) / Math.log(base(x)); };
                        }
                        var arg = argument();
                        if (name === "ln") return function(x) { return Math.log(arg(x)); };
                        var fn = FUNCS[name];
                        return function(x) { return fn(arg(x)); };
                    }
                    if (ch === "√") { pos++; var inner = power(); return function(x) { return Math.sqrt(inner(x)); }; }
                    if (ch === "(") {
                        pos++;
                        var node = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return node;
                    }
                    var begin = pos, dots = 0;
                    while (isDigit(peek()) || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var number = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
                    return function() { return number; };
                }
                function negate(node) { return function(x) { return -node(x); }; }
                function binary(op, a, b) {
                    if (op === "+") return function(x) { return a(x) + b(x); };
                    if (op === "-") return function(x) { return a(x) - b(x); };
                    if (op === "*") return function(x) { return a(x) * b(x); };
                    if (op === "/") return function(x) { return a(x) / b(x); };
                    return function(x) { return Math.pow(a(x), b(x)); };
                }
                try {
                    var fn = expression();
                    if (pos !== s.length) return null;
                    return fn;
                } catch (e) {
                    return null;
                }
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

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unitText ? " (" + unitText + "):" : ":")).preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM_TO_PT;
                    setter(value);
                    setRowValue(controls, value);
                    if (delta === 0 || previewGroup === null) return;
                    previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
                return Math.round(value / step) * step;
            }

            function formatNumber(value, decimals) {
                return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", xMin, xMax, yMin, yMax, unitMm, fontPt, encodeURIComponent(fText), encodeURIComponent(gText),
                    shade, aValue, bValue, countValue, shadeK, encodeURIComponent(areaName), ends, encodeURIComponent(tangentName), tValue,
                    flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 22 || p[18].length !== FLAG_KEYS.length) return;
                try {
                    xMin = Math.round(restoreNumber(p[1], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[2], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[3], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[4], yMax, 1, 20));
                    unitMm = restoreNumber(p[5], unitMm, 2, 20);
                    fontPt = restoreNumber(p[6], fontPt, 5, 14);
                    fText = decodeURIComponent(p[7]);
                    gText = decodeURIComponent(p[8]);
                    shade = Math.round(restoreNumber(p[9], shade, 0, SHADES.length - 1));
                    aValue = restoreNumber(p[10], aValue, -20, 20);
                    bValue = restoreNumber(p[11], bValue, -20, 20);
                    countValue = Math.round(restoreNumber(p[12], countValue, 1, 50));
                    shadeK = restoreNumber(p[13], shadeK, 5, 60);
                    areaName = decodeURIComponent(p[14]);
                    ends = Math.round(restoreNumber(p[15], ends, 0, ENDS.length - 1));
                    tangentName = decodeURIComponent(p[16]);
                    tValue = restoreNumber(p[17], tValue, -20, 20);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[18].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[19], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[20], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[21] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 속도와 거리 ====
    // 수직선 위의 운동: 속도 v(t)의 그래프를 t–v 축에 그리고, 구간 [a, b]에서 v와 t축 사이를 칠한다.
    // v > 0(앞으로)인 부분은 연하게, v < 0(뒤로)인 부분은 진하게 칠해 변위(∫v dt)와 이동 거리(∫|v| dt)의 차이가 보이게 한다.
    // 운동 방향이 바뀌는 시각(v의 부호가 바뀌는 곳)은 t축 위에 점과 값. 변위·이동 거리·위치 x(b) = x(0) + ∫₀ᵇ v dt는 창에 보여 준다.
    // 식 읽기·그래프는 좌표평면 탭과 같은 코드다. 선 두께: 축 0.4pt, 그래프 0.8pt, 점선 0.3pt. 선택은 필요 없다.
    function makeMotionEngine() {
        var api = {label: "속도와 거리", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMath2Motion/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["shade", "turns", "bounds", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var vText = "v=t^2-4t+3";
            var tMax = 5, vMin = -2, vMax = 5;
            var aValue = 0, bValue = 4;
            var startValue = 0;
            var lightK = 20, darkK = 45;
            var unitMm = 8;
            var fontPt = 8;
            var opt = { shade: true, turns: true, bounds: true, formula: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var motionPanel = addPanel(win, "속도");
            var vRow = motionPanel.add("group");
            vRow.add("statictext", undefined, "v(t):").preferredSize.width = 30;
            var vInput = vRow.add("edittext", undefined, vText);
            vInput.preferredSize.width = 300;
            vInput.helpTip = "v=t^2-4t+3, v=3-t, v=2t-t^2, v=sin t. t 대신 x를 써도 된다";
            var aControls = addValueRow(motionPanel, "구간 a", "", aValue, 0, 20, 0.1, 1);
            var bControls = addValueRow(motionPanel, "구간 b", "", bValue, 0, 20, 0.1, 1);
            var startControls = addValueRow(motionPanel, "처음 위치 x(0)", "", startValue, -20, 20, 0.5, 1);
            var lightControls = addValueRow(motionPanel, "앞으로 음영", "K", lightK, 5, 60, 5, 0);
            var darkControls = addValueRow(motionPanel, "뒤로 음영", "K", darkK, 5, 80, 5, 0);
            addCheckRow(motionPanel, [["shade", "구간 칠하기"], ["turns", "방향 바뀌는 시각"], ["bounds", "a, b 점선"]]);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var tMaxControls = addValueRow(rangePanel, "t 최댓값", "", tMax, 1, 20, 1, 0);
            var vMinControls = addValueRow(rangePanel, "v 최솟값", "", vMin, -20, 0, 1, 0);
            var vMaxControls = addValueRow(rangePanel, "v 최댓값", "", vMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["formula", "식 글자"], ["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            vInput.onChanging = function() { vText = vInput.text; updatePreview(); };
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(startControls, function(value) { startValue = value; });
            bindValueRow(lightControls, function(value) { lightK = value; });
            bindValueRow(darkControls, function(value) { darkK = value; });
            bindValueRow(tMaxControls, function(value) { tMax = value; });
            bindValueRow(vMinControls, function(value) { vMin = value; });
            bindValueRow(vMaxControls, function(value) { vMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. v를 못 읽으면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(messageText.text);
                    return false;
                }
                saveSettings();
                doc.selection = null;
                previewGroup.selected = true;
                return true;
            };
            api.setPreview = function(on) {
                previewEnabled = on;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                app.redraw();
            };
            return null;

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    bindOption(check, items[i][0]);
                }
            }

            function bindOption(check, key) {
                check.value = opt[key];
                check.onClick = function() {
                    opt[key] = check.value;
                    updatePreview();
                };
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (previewEnabled) buildPreview();
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                var v = compileFunction(timeToX(vText));
                if (v === null) {
                    messageText.text = "v(t)를 읽지 못함 (예: v=t^2-4t+3)";
                    return;
                }
                var drawing = buildMotion({
                    v: v, label: vText, a: aValue, b: bValue, start: startValue, tMax: tMax, vMin: vMin, vMax: vMax,
                    unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, lightK: lightK, darkK: darkK,
                    shade: opt.shade, turns: opt.turns, bounds: opt.bounds, formula: opt.formula, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "속도와 거리";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // 칠한 면: {points:[{anchor,left,right}], k}
            function addFill(fill) {
                var path = previewGroup.pathItems.add();
                setBezier(path, fill.points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(fill.k);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                setBezier(path, line.points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            function setBezier(path, points) {
                var anchors = [], curved = false;
                for (var i = 0; i < points.length; i++) {
                    anchors.push(points[i].anchor);
                    if (points[i].left !== points[i].anchor || points[i].right !== points[i].anchor) curved = true;
                }
                path.setEntirePath(anchors);
                if (!curved) return;
                for (var j = 0; j < points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = points[j].left;
                    point.rightDirection = points[j].right;
                }
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var d = arrow.dir, n = [-d[1], d[0]];
                var tip = arrow.tip;
                var back = [tip[0] - d[0] * ARROW.length, tip[1] - d[1] * ARROW.length];
                var path = previewGroup.pathItems.add();
                path.setEntirePath([
                    tip,
                    [back[0] + n[0] * ARROW.halfWidth, back[1] + n[1] * ARROW.halfWidth],
                    [back[0] + d[0] * ARROW.notch, back[1] + d[1] * ARROW.notch],
                    [back[0] - n[0] * ARROW.halfWidth, back[1] - n[1] * ARROW.halfWidth]
                ]);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(100);
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup/sub/roman: 첨자·똑바로 쓸 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var marks = [[label.sup, "sup"], [label.sub, "sub"], [label.roman, "roman"]];
                for (var m = 0; m < marks.length; m++) {
                    if (!marks[m][0]) continue;
                    for (var s = 0; s < marks[m][0].length; s++) {
                        var markAttributes = frame.textRange.characters[marks[m][0][s]].characterAttributes;
                        if (marks[m][1] === "sup") markAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
                        else if (marks[m][1] === "sub") markAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                        else markAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호는 HancomEQN. 숫자(upright)는 똑바로
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && code >= 97 && code <= 122) {
                        attributes.textFont = italicFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-motion.js). 원점 (0,0), 1 = unit pt. 가로 t, 세로 v
            // -------------------------------------------------------
            // 식의 t를 x로 (compileFunction은 x의 식을 읽는다). tan의 t는 그대로
            function timeToX(text) {
                var s = String(text), out = "";
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    var inTan = s.substr(i, 3) === "tan";
                    out += ch === "t" && !inTan ? "x" : ch;
                }
                return out;
            }

            function safeValue(fn, x) {
                var y;
                try { y = fn(x); } catch (e) { return NaN; }
                return (typeof y === "number" && isFinite(y)) ? y : NaN;
            }

            // [a, b]에서 v의 부호가 바뀌는 시각들 (이분법)
            function signChanges(v, a, b) {
                var N = 400, list = [], prevX = a, prev = safeValue(v, a);
                for (var i = 1; i <= N; i++) {
                    var x = a + (b - a) * i / N, y = safeValue(v, x);
                    if (!isNaN(prev) && !isNaN(y) && prev * y < 0) {
                        var lo = prevX, hi = x, vlo = prev;
                        for (var k = 0; k < 60; k++) {
                            var mid = (lo + hi) / 2, vm = safeValue(v, mid);
                            if (vlo * vm <= 0) hi = mid; else { lo = mid; vlo = vm; }
                        }
                        list.push((lo + hi) / 2);
                    }
                    if (!isNaN(y) && y !== 0) { prev = y; prevX = x; }
                }
                return list;
            }

            function simpson(fn, a, b) {
                var n = 400, h = (b - a) / n, sum = fn(a) + fn(b);
                for (var i = 1; i < n; i++) sum += fn(a + h * i) * (i % 2 === 1 ? 4 : 2);
                return sum * h / 3;
            }

            function buildMotion(o) {
                var u = o.unit, v = o.v;
                var out = { fills: [], lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var right = o.tMax + 0.8, top = o.vMax + 0.8, bottom = o.vMin - 0.5;
                if (o.grid) {
                    for (var gx = 1; gx <= o.tMax; gx++) out.lines.push(straight([[gx * u, o.vMin * u], [gx * u, o.vMax * u]], "grid"));
                    for (var gy = o.vMin; gy <= o.vMax; gy++) if (gy !== 0) out.lines.push(straight([[0, gy * u], [o.tMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[-0.3 * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, Math.min(bottom, -0.3) * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "t", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "v", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = 1; tx <= o.tMax; tx++) {
                    out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var ty = o.vMin; ty <= o.vMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 그래프와 식 글자
                var segments = plotFunction(v, 0, o.tMax, o.vMin, o.vMax), end = null;
                for (var s = 0; s < segments.length; s++) {
                    if (segments[s].length < 2) continue;
                    out.lines.push({ points: toBezier(segments[s], u), kind: "graph" });
                    var last = segments[s][segments[s].length - 1];
                    end = [last.x * u, last.y * u];
                }
                if (o.formula && end) {
                    var display = formulaDisplay(o.label);
                    out.texts.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: end, dir: [1, 0] });
                }

                // 구간 [a, b]: 부호가 바뀌는 곳에서 나눠 앞으로(연하게)·뒤로(진하게) 칠하기
                var a = Math.max(0, Math.min(o.a, o.b)), b = Math.min(o.tMax, Math.max(o.a, o.b));
                var turnsAll = signChanges(v, 0, o.tMax);
                if (b - a > 1e-9) {
                    var cuts = [a], inside = signChanges(v, a, b);
                    for (var c = 0; c < inside.length; c++) cuts.push(inside[c]);
                    cuts.push(b);
                    var broken = false;
                    for (var p = 0; p + 1 < cuts.length; p++) {
                        var x0 = cuts[p], x1 = cuts[p + 1], midV = safeValue(v, (x0 + x1) / 2);
                        if (!o.shade || isNaN(midV)) continue;
                        var piece = plotFunction(v, x0, x1, o.vMin, o.vMax);
                        if (piece.length !== 1) { broken = true; continue; }
                        var curve = toBezier(piece[0], u);
                        var closing = straight([[x1 * u, 0], [x0 * u, 0]]).points;
                        out.fills.push({ points: curve.concat(closing), k: midV > 0 ? o.lightK : o.darkK });
                    }
                    if (broken) out.notes.push("그래프가 v 범위를 벗어나는 부분은 칠하지 않음");
                    if (o.bounds) {
                        var ends = [a, b];
                        for (var e = 0; e < 2; e++) {
                            var ve = safeValue(v, ends[e]);
                            if (!isNaN(ve) && Math.abs(ve) > 1e-9 && ve >= o.vMin && ve <= o.vMax) out.lines.push(straight([[ends[e] * u, 0], [ends[e] * u, ve * u]], "guide"));
                        }
                    }
                    var displacement = simpson(function(t) { return safeValue(v, t); }, a, b);
                    var distance = simpson(function(t) { return Math.abs(safeValue(v, t)); }, a, b);
                    var position = o.start + simpson(function(t) { return safeValue(v, t); }, 0, b);
                    out.notes.push("t=" + fmt(a) + "~" + fmt(b) + ": 변위 " + fmt(displacement) + ", 이동 거리 " + fmt(distance));
                    out.notes.push("위치 x(" + fmt(b) + ") = x(0) + ∫v dt = " + fmt(position));
                }
                // 운동 방향이 바뀌는 시각
                if (o.turns) {
                    for (var tt = 0; tt < turnsAll.length; tt++) {
                        out.dots.push([turnsAll[tt] * u, 0]);
                        if (!o.numbers || Math.abs(turnsAll[tt] - Math.round(turnsAll[tt])) > 1e-6) out.texts.push({ text: fmt(turnsAll[tt]), at: [turnsAll[tt] * u, 0], dir: [0.7071, 0.7071], upright: true });
                    }
                }
                if (turnsAll.length > 0) {
                    var list = [];
                    for (var q = 0; q < turnsAll.length; q++) list.push("t=" + fmt(turnsAll[q]));
                    out.notes.push("운동 방향이 바뀌는 시각 " + list.join(", "));
                }
                return out;
            }

            function fmt(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            // 좌표 범위 [x0,x1]×[y0,y1] 안에 드는 조각들. 각 점 {x, y, m(기울기)}
            function plotFunction(fn, x0, x1, y0, y1) {
                var TOLERANCE = 0.004, MAX_DEPTH = 10, STEP = 0.25, LIMIT = 4000;
                var margin = (y1 - y0) * 1e-9;
                var segments = [], current = null, count = 0;

                function value(x) {
                    var y;
                    try { y = fn(x); } catch (e) { return NaN; }
                    return (typeof y === "number" && isFinite(y)) ? y : NaN;
                }
                function inside(x) {
                    var y = value(x);
                    return !isNaN(y) && y >= y0 - margin && y <= y1 + margin;
                }
                function slope(x) {
                    var h = 1e-5 * (1 + Math.abs(x));
                    var a = value(x - h), b = value(x + h), c = value(x);
                    if (!isNaN(a) && !isNaN(b)) return (b - a) / (2 * h);
                    if (!isNaN(b)) return (b - c) / h;
                    if (!isNaN(a)) return (c - a) / h;
                    return 0;
                }
                function emit(x) {
                    if (current === null) {
                        current = [];
                        segments.push(current);
                    }
                    if (count++ > LIMIT) return;
                    var y = Math.min(y1, Math.max(y0, value(x)));
                    current.push({ x: x, y: y, m: slope(x) });
                }
                function finish() { current = null; }
                // 안(inX)과 밖(outX) 사이 경계. 안쪽 끝을 돌려준다
                function edge(inX, outX) {
                    for (var i = 0; i < 40; i++) {
                        var mid = (inX + outX) / 2;
                        if (inside(mid)) inX = mid;
                        else outX = mid;
                    }
                    return inX;
                }
                // a는 이미 넣었다. b까지 넣는다
                function refine(a, b, depth) {
                    var mid = (a + b) / 2;
                    if (!inside(mid)) {
                        var cut = edge(a, mid);
                        if (cut > a) refine(a, cut, depth + 1);
                        finish();
                        var resume = edge(b, mid);
                        emit(resume);
                        if (b > resume) refine(resume, b, depth + 1);
                        return;
                    }
                    var h = b - a;
                    var ya = value(a), yb = value(b);
                    var guess = (ya + yb) / 2 + h * (slope(a) - slope(b)) / 8;
                    if (depth < MAX_DEPTH && Math.abs(guess - value(mid)) > TOLERANCE) {
                        refine(a, mid, depth + 1);
                        refine(mid, b, depth + 1);
                    } else {
                        emit(b);
                    }
                }

                var steps = Math.ceil((x1 - x0) / STEP);
                for (var i = 0; i < steps; i++) {
                    var a = x0 + (x1 - x0) * i / steps, b = x0 + (x1 - x0) * (i + 1) / steps;
                    var inA = inside(a), inB = inside(b);
                    if (inA && current === null) emit(a);
                    if (inA && inB) {
                        refine(a, b, 0);
                    } else if (inA) {
                        var last = edge(a, b);
                        if (last > a) refine(a, last, 0);
                        finish();
                    } else if (inB) {
                        var first = edge(b, a);
                        emit(first);
                        refine(first, b, 0);
                    }
                }
                for (var k = 0; k < segments.length; k++) segments[k] = simplify(segments[k]);
                return segments;

                // 빼도 앞뒤 점의 에르미트 곡선이 함수에서 벗어나지 않는 점은 지운다 (직선은 두 점만 남는다)
                function simplify(points) {
                    if (points.length < 3) return points;
                    var kept = [points[0]];
                    for (var i = 1; i < points.length - 1; i++) {
                        if (!fits(kept[kept.length - 1], points[i + 1])) kept.push(points[i]);
                    }
                    kept.push(points[points.length - 1]);
                    return kept;
                }
                function fits(p, q) {
                    var h = q.x - p.x;
                    for (var j = 1; j < 8; j++) {
                        var t = j / 8, x = p.x + h * t, y = value(x);
                        if (isNaN(y) || y < y0 - margin || y > y1 + margin) return false;
                        var t2 = t * t, t3 = t2 * t;
                        var guess = (2 * t3 - 3 * t2 + 1) * p.y + (t3 - 2 * t2 + t) * h * p.m + (-2 * t3 + 3 * t2) * q.y + (t3 - t2) * h * q.m;
                        if (Math.abs(guess - y) > TOLERANCE) return false;
                    }
                    return true;
                }
            }

            // 에르미트 → 베지어: 핸들 = 이웃까지 x 간격의 1/3만큼 접선 방향
            function toBezier(points, unit) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var p = points[i];
                    var anchor = [p.x * unit, p.y * unit];
                    var left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (p.x - points[i - 1].x) / 3;
                        left = [(p.x - hl) * unit, (p.y - p.m * hl) * unit];
                    }
                    if (i < points.length - 1) {
                        var hr = (points[i + 1].x - p.x) / 3;
                        right = [(p.x + hr) * unit, (p.y + p.m * hr) * unit];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
            }

            // 식 표시: ^와 *는 빼고 ^ 다음은 위첨자, _ 다음은 아래첨자(log_2 → log₂). sin·cos·tan·log·ln은 똑바로(roman),
            // 그 뒤에 괄호·첨자가 없으면 한 칸 띄운다 (sin x). pi는 π
            function formulaDisplay(text) {
                var source = String(text).replace(/\s/g, "").split("pi").join("π");
                var FUNCS = ["sin", "cos", "tan", "log", "ln"];
                var out = "", sup = [], sub = [], roman = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^" || ch === "_") {
                        var marks = ch === "^" ? sup : sub;
                        var next = source.charAt(i + 1);
                        if (next === "(") {
                            var close = source.indexOf(")", i + 2);
                            if (close < 0) close = source.length;
                            for (var j = i + 2; j < close; j++) {
                                marks.push(out.length);
                                out += source.charAt(j);
                            }
                            i = close;
                        } else if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                                marks.push(out.length);
                                out += source.charAt(++i);
                            }
                        } else if (next !== "") {
                            marks.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    var name = null;
                    for (var k = 0; k < FUNCS.length; k++) if (source.substr(i, FUNCS[k].length) === FUNCS[k]) { name = FUNCS[k]; break; }
                    if (name) {
                        for (var n = 0; n < name.length; n++) {
                            roman.push(out.length);
                            out += name.charAt(n);
                        }
                        i += name.length - 1;
                        var after = source.charAt(i + 1);
                        if (after !== "" && after !== "(" && after !== "_" && after !== "^") out += " ";
                        continue;
                    }
                    out += ch;
                }
                return { text: out, sup: sup, sub: sub, roman: roman };
            }

            // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null.
            // 2x, 1/2x(=½x), x^2, √x, |x-1|, 2^x, e^x, π(pi), sin 2x, cos(x+1), tan x, log_2 x, log x(밑 10), ln x
            function compileFunction(text) {
                var s = String(text).split("−").join("-").split("×").join("*").split("÷").join("/")
                    .split("²").join("^2").split("³").join("^3").split("π").join("pi");
                // log_2 x처럼 밑 뒤의 빈칸은 밑의 끝이다 (빈칸을 지운 log_23x와 구별)
                s = s.replace(/log_(\d+)\s+/g, "log_($1)").replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var NAMES = ["sin", "cos", "tan", "log", "ln", "pi", "e", "x"];
                var FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
                var pos = 0, absDepth = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
                function nameAt() {
                    for (var i = 0; i < NAMES.length; i++) if (s.substr(pos, NAMES[i].length) === NAMES[i]) return NAMES[i];
                    return null;
                }
                // 곱셈 기호 없이 이어지는 인수의 시작 (2x, 2√3, 2(x+1), 2sin x, 2|x|)
                function startsFactor() {
                    var ch = peek();
                    return ch === "√" || ch === "(" || isDigit(ch) || ch === "." || nameAt() !== null || (ch === "|" && absDepth === 0);
                }
                function expression() {
                    var node = term();
                    while (peek() === "+" || peek() === "-") {
                        var op = s.charAt(pos++);
                        node = binary(op, node, term());
                    }
                    return node;
                }
                function term() {
                    var node = unary();
                    while (peek() === "*" || peek() === "/" || startsFactor()) {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        else op = "*";
                        node = binary(op, node, power());
                    }
                    return node;
                }
                function unary() {
                    if (peek() === "-") { pos++; return negate(unary()); }
                    if (peek() === "+") { pos++; return unary(); }
                    return power();
                }
                function power() {
                    var base = primary();
                    if (peek() === "^") {
                        pos++;
                        return binary("^", base, unary());
                    }
                    return base;
                }
                // 함수 인수: 괄호면 그 괄호, 아니면 곱셈으로 이어진 인수들 (sin 2x = sin(2x), 다음 함수 이름 앞에서 끝)
                function argument() {
                    if (peek() === "(") return primary();
                    var node = power();
                    while (startsFactor() && peek() !== "(" && !isFunctionName(nameAt())) node = binary("*", node, power());
                    return node;
                }
                function isFunctionName(name) { return name === "sin" || name === "cos" || name === "tan" || name === "log" || name === "ln"; }
                function primary() {
                    var ch = peek();
                    if (ch === "|") {
                        pos++;
                        absDepth++;
                        var inside = expression();
                        if (peek() !== "|") throw new Error("abs");
                        pos++;
                        absDepth--;
                        return function(x) { return Math.abs(inside(x)); };
                    }
                    var name = nameAt();
                    if (name !== null) {
                        pos += name.length;
                        if (name === "x") return function(x) { return x; };
                        if (name === "pi") return function() { return Math.PI; };
                        if (name === "e") return function() { return Math.E; };
                        if (name === "log") {
                            var base = function() { return 10; };
                            if (peek() === "_") { pos++; base = primary(); }
                            var logArg = argument();
                            return function(x) { return Math.log(logArg(x)) / Math.log(base(x)); };
                        }
                        var arg = argument();
                        if (name === "ln") return function(x) { return Math.log(arg(x)); };
                        var fn = FUNCS[name];
                        return function(x) { return fn(arg(x)); };
                    }
                    if (ch === "√") { pos++; var inner = power(); return function(x) { return Math.sqrt(inner(x)); }; }
                    if (ch === "(") {
                        pos++;
                        var node = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return node;
                    }
                    var begin = pos, dots = 0;
                    while (isDigit(peek()) || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var number = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
                    return function() { return number; };
                }
                function negate(node) { return function(x) { return -node(x); }; }
                function binary(op, a, b) {
                    if (op === "+") return function(x) { return a(x) + b(x); };
                    if (op === "-") return function(x) { return a(x) - b(x); };
                    if (op === "*") return function(x) { return a(x) * b(x); };
                    if (op === "/") return function(x) { return a(x) / b(x); };
                    return function(x) { return Math.pow(a(x), b(x)); };
                }
                try {
                    var fn = expression();
                    if (pos !== s.length) return null;
                    return fn;
                } catch (e) {
                    return null;
                }
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

            function addValueRow(parent, label, unitText, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unitText ? " (" + unitText + "):" : ":")).preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function setRowValue(controls, value) {
                controls.input.text = formatNumber(value, controls.decimals);
                try { controls.slider.value = value; } catch (e) {}
            }

            function bindValueRow(controls, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    setRowValue(controls, value);
                    setter(value);
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? controls.slider.value : value);
                };
            }

            function bindPositionRow(controls, getter, setter, isX) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    var delta = (value - getter()) * MM_TO_PT;
                    setter(value);
                    setRowValue(controls, value);
                    if (delta === 0 || previewGroup === null) return;
                    previewGroup.translate(isX ? delta : 0, isX ? 0 : delta);
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
                return Math.round(value / step) * step;
            }

            function formatNumber(value, decimals) {
                return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
            }


            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var flags = "";
                for (var i = 0; i < FLAG_KEYS.length; i++) flags += opt[FLAG_KEYS[i]] ? "1" : "0";
                var parts = ["v1", encodeURIComponent(vText), aValue, bValue, startValue, lightK, darkK, tMax, vMin, vMax, unitMm, fontPt, flags,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 16 || p[12].length !== FLAG_KEYS.length) return;
                try {
                    vText = decodeURIComponent(p[1]);
                    aValue = restoreNumber(p[2], aValue, 0, 20);
                    bValue = restoreNumber(p[3], bValue, 0, 20);
                    startValue = restoreNumber(p[4], startValue, -20, 20);
                    lightK = restoreNumber(p[5], lightK, 5, 60);
                    darkK = restoreNumber(p[6], darkK, 5, 80);
                    tMax = Math.round(restoreNumber(p[7], tMax, 1, 20));
                    vMin = Math.round(restoreNumber(p[8], vMin, -20, 0));
                    vMax = Math.round(restoreNumber(p[9], vMax, 1, 20));
                    unitMm = restoreNumber(p[10], unitMm, 2, 20);
                    fontPt = restoreNumber(p[11], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[12].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[13], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[14], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[15] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
})();
