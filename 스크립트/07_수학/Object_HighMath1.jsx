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

// 고등학교 수학Ⅰ: 지수·로그 함수, 삼각함수(그래프·단위원·단위원과 그래프·사인법칙과 코사인법칙), 수열 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 고등학교 수학은 과목별 스크립트 다섯 개(공통수학·수학Ⅰ·수학Ⅱ·확률과 통계·기하)로 나뉘어 있고, 탭마다 저장 키는 예전 그대로다.
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighMath1/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeExpLogEngine(), makeTrigEngine(), makeUnitCircleEngine(), makeCircleGraphEngine(), makeTriangleEngine(), makeSequenceEngine()];

    var win = new Window("dialog", "수학Ⅰ");
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

    // ==== 지수·로그 ====
    // 지수·로그 그래프: y=a^(x-m)+n, y=log_a(x-m)+n, 또는 지수와 그 역함수인 로그를 y=x 점선과 함께 그린다.
    // 점근선(점선), 지나는 점((m, 1+n), (m+1, a+n) …)과 좌표, 역함수에서 대칭인 두 점을 잇는 점선, 밑을 바꾼 비교 그래프(3, 1/2)를 고른다.
    // 증가·감소, 점근선, 정의역·치역은 창에 보여 준다. 식 읽기·그래프 베지어는 중학교 수학 좌표평면 탭과 같은 코드다.
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 점근선·y=x·대칭 점선 0.3pt. 선택은 필요 없다.
    function makeExpLogEngine() {
        var api = {label: "지수·로그", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathExpLog/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호
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
            var MODES = ["지수함수", "로그함수", "지수와 로그 (역함수)"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["asymptotes", "points", "coords", "mirror", "formulas", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var mode = 2;
            var baseValue = 2;
            var mValue = 0, nValue = 0;
            var compareText = "";
            var xMin = -3, xMax = 5, yMin = -3, yMax = 5;
            var unitMm = 6;
            var fontPt = 8;
            var opt = { asymptotes: true, points: true, coords: true, mirror: false, formulas: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "함수");
            var modeRow = functionPanel.add("group");
            modeRow.add("statictext", undefined, "그래프:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;
            var baseControls = addValueRow(functionPanel, "밑 a", "", baseValue, 0.1, 10, 0.1, 1);
            var mControls = addValueRow(functionPanel, "x축 방향 m", "", mValue, -10, 10, 0.5, 1);
            var nControls = addValueRow(functionPanel, "y축 방향 n", "", nValue, -10, 10, 0.5, 1);
            var compareRow = functionPanel.add("group");
            compareRow.add("statictext", undefined, "비교할 밑:");
            var compareInput = compareRow.add("edittext", undefined, compareText);
            compareInput.preferredSize.width = 260;
            compareInput.helpTip = "3, 1/2처럼 쉼표로. 같은 m, n으로 밑만 바꾼 그래프를 겹친다 (역함수 모드에서는 지수함수만)";

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["asymptotes", "점근선"], ["points", "지나는 점"], ["coords", "점 좌표"]]);
            addCheckRow(markPanel, [["mirror", "대칭인 점 잇기"], ["formulas", "그래프 끝에 식"]]);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            modeList.onChange = function() { mode = modeList.selection ? modeList.selection.index : 0; updatePreview(); };
            bindValueRow(baseControls, function(value) { baseValue = value; });
            bindValueRow(mControls, function(value) { mValue = value; });
            bindValueRow(nControls, function(value) { nValue = value; });
            compareInput.onChanging = function() { compareText = compareInput.text; updatePreview(); };
            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 밑이 1이면 확정하지 않는다
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
                if (Math.abs(baseValue - 1) < 1e-9) {
                    messageText.text = "밑 a는 1이 아니어야 함";
                    return;
                }
                var compare = parseBases(compareText);
                var drawing = buildExpLog({
                    mode: mode, a: baseValue, m: mValue, n: nValue, compare: compare === null ? [] : compare,
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, fontSize: fontPt,
                    asymptotes: opt.asymptotes, points: opt.points, coords: opt.coords, mirror: opt.mirror, formulas: opt.formulas,
                    grid: opt.grid, numbers: opt.numbers
                });
                if (compare === null) drawing.notes.push("비교할 밑을 읽지 못함 (양수, 1이 아닌 수: 3, 1/2)");
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "지수·로그";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
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

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다.
            // sup/sub: 위·아래첨자 글자 위치, roman: 기울이지 않는 함수 이름(log)
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-exp-log.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 그릴 그래프 목록: {kind:"exp"|"log", a, m, n}. 역함수 모드의 로그는 지수 y=a^(x-m)+n의 역함수 y=log_a(x-n)+m
            function graphList(o) {
                var list = [], bases = [o.a].concat(o.compare);
                for (var i = 0; i < bases.length; i++) {
                    if (o.mode === 1) list.push({ kind: "log", a: bases[i], m: o.m, n: o.n, main: i === 0 });
                    else list.push({ kind: "exp", a: bases[i], m: o.m, n: o.n, main: i === 0 });
                }
                if (o.mode === 2) list.push({ kind: "log", a: o.a, m: o.n, n: o.m, main: true, inverse: true });
                return list;
            }

            function graphFunction(g) {
                if (g.kind === "exp") return function(x) { return Math.pow(g.a, x - g.m) + g.n; };
                return function(x) { return x - g.m > 0 ? Math.log(x - g.m) / Math.log(g.a) + g.n : NaN; };
            }

            // formulaDisplay가 읽는 식: y=2^(x-1)+3, y=(1/2)^x, y=log_2(x+1)-2, y=log_(1/2)x
            function graphFormula(g) {
                var base = baseText(g.a), shift = shiftText("x", g.m), tail = g.n === 0 ? "" : (g.n > 0 ? "+" : "-") + formatValue(Math.abs(g.n));
                if (g.kind === "exp") {
                    var baseShown = base.indexOf("/") >= 0 ? "(" + base + ")" : base;
                    return "y=" + baseShown + "^" + (g.m === 0 ? "x" : "(" + shift + ")") + tail;
                }
                var sub = base.length > 1 ? "(" + base + ")" : base;
                return "y=log_" + sub + (g.m === 0 ? "x" : "(" + shift + ")") + tail;
            }

            // 1/2처럼 역수가 정수면 분수로, 아니면 소수
            function baseText(a) {
                var inverse = 1 / a;
                if (a < 1 && Math.abs(inverse - Math.round(inverse)) < 1e-9) return "1/" + Math.round(inverse);
                return formatValue(a);
            }

            function shiftText(name, shift) {
                return shift === 0 ? name : name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift));
            }

            function buildExpLog(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var box = [o.xMin, o.xMax, o.yMin, o.yMax];
                function inBox(p) { return p[0] >= o.xMin - 1e-9 && p[0] <= o.xMax + 1e-9 && p[1] >= o.yMin - 1e-9 && p[1] <= o.yMax + 1e-9; }

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

                var graphs = graphList(o), formulaLabels = [], marked = [];
                if (o.mode === 2) {
                    var lo = Math.max(o.xMin, o.yMin), hi = Math.min(o.xMax, o.yMax);
                    if (hi > lo) out.lines.push(straight([[lo * u, lo * u], [hi * u, hi * u]], "guide"));
                    if (o.formulas && hi > lo) out.texts.push({ text: "y=x", at: [hi * u, hi * u], dir: [0.7071, 0.7071] });
                }
                for (var k = 0; k < graphs.length; k++) {
                    var g = graphs[k], fn = graphFunction(g);
                    var segments = plotFunction(fn, o.xMin, o.xMax, o.yMin, o.yMax);
                    for (var s = 0; s < segments.length; s++) if (segments[s].length >= 2) out.lines.push({ points: toBezier(segments[s], u), kind: "graph" });
                    if (o.formulas && segments.length > 0) {
                        var lastSegment = segments[segments.length - 1], end = lastSegment[lastSegment.length - 1];
                        var display = formulaDisplay(graphFormula(g));
                        formulaLabels.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: [end.x * u, end.y * u], dir: [1, 0] });
                    }
                    if (!g.main) continue;
                    // 점근선: 지수 y=n, 로그 x=m
                    if (o.asymptotes) {
                        if (g.kind === "exp" && g.n >= o.yMin && g.n <= o.yMax && g.n !== 0) out.lines.push(straight([[o.xMin * u, g.n * u], [o.xMax * u, g.n * u]], "guide"));
                        if (g.kind === "log" && g.m >= o.xMin && g.m <= o.xMax && g.m !== 0) out.lines.push(straight([[g.m * u, o.yMin * u], [g.m * u, o.yMax * u]], "guide"));
                    }
                    // 지나는 점: 지수 (m, 1+n), (m+1, a+n) / 로그 (m+1, n), (m+a, 1+n)
                    var passes = g.kind === "exp" ? [[g.m, 1 + g.n], [g.m + 1, g.a + g.n]] : [[g.m + 1, g.n], [g.m + g.a, 1 + g.n]];
                    for (var p = 0; p < passes.length; p++) {
                        var at = passes[p];
                        if (!inBox(at)) continue;
                        marked.push({ point: at, kind: g.kind });
                        if (!o.points) continue;
                        out.dots.push([at[0] * u, at[1] * u]);
                        if (o.coords) out.texts.push({ text: "(" + formatValue(at[0]) + ", " + formatValue(at[1]) + ")", at: [at[0] * u, at[1] * u],
                            dir: g.kind === "exp" ? [-0.7071, 0.7071] : [0.7071, -0.7071], upright: true });
                    }
                    out.notes.push(noteFor(g));
                }
                // 역함수: 지수 위의 점 (p, q)와 로그 위의 점 (q, p)를 y=x에 수직인 점선으로 잇는다
                if (o.mode === 2 && o.mirror) {
                    for (var mk = 0; mk < marked.length; mk++) {
                        if (marked[mk].kind !== "exp") continue;
                        var P = marked[mk].point, Q = [P[1], P[0]];
                        if (inBox(Q) && Math.abs(P[0] - P[1]) > 1e-9) out.lines.push(straight([[P[0] * u, P[1] * u], [Q[0] * u, Q[1] * u]], "guide"));
                    }
                }

                // 끝점이 가까운 식 글자는 위에서부터 한 줄 간격 이상 벌린다
                formulaLabels.sort(function(pp, qq) { return qq.at[1] - pp.at[1]; });
                var lineGap = (o.fontSize || 8) * 1.3;
                for (var fl = 0; fl < formulaLabels.length; fl++) {
                    for (var prior = 0; prior < fl; prior++) {
                        var upper = formulaLabels[prior], lower = formulaLabels[fl];
                        if (Math.abs(upper.at[0] - lower.at[0]) < lineGap * 4 && upper.at[1] - lower.at[1] < lineGap) lower.at = [lower.at[0], upper.at[1] - lineGap];
                    }
                    out.texts.push(formulaLabels[fl]);
                }
                return out;
            }

            // y=2^x: 증가, 점근선 y=0, 치역 y>0
            function noteFor(g) {
                var shown = graphFormula(g);
                var trend = g.a > 1 ? "증가" : "감소";
                if (g.kind === "exp") return shown + ": " + trend + ", 점근선 y=" + formatValue(g.n) + ", 치역 y>" + formatValue(g.n);
                return shown + ": " + trend + ", 점근선 x=" + formatValue(g.m) + ", 정의역 x>" + formatValue(g.m);
            }

            // "3, 1/2" → [3, 0.5]. 빈 칸은 [], 양수가 아니거나 1이면 null
            function parseBases(text) {
                var parts = String(text).split(","), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    if (part.indexOf("x") >= 0) return null;
                    var fn = compileFunction(part);
                    if (fn === null) return null;
                    var value = fn(0);
                    if (!isFinite(value) || value <= 0 || Math.abs(value - 1) < 1e-9) return null;
                    list.push(value);
                }
                return list;
            }

            function formatValue(v) {
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
                var parts = ["v1", mode, baseValue, mValue, nValue, encodeURIComponent(compareText), xMin, xMax, yMin, yMax, unitMm, fontPt,
                    flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 16 || p[12].length !== FLAG_KEYS.length) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    baseValue = restoreNumber(p[2], baseValue, 0.1, 10);
                    mValue = restoreNumber(p[3], mValue, -10, 10);
                    nValue = restoreNumber(p[4], nValue, -10, 10);
                    compareText = decodeURIComponent(p[5]);
                    xMin = Math.round(restoreNumber(p[6], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[7], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[8], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[9], yMax, 1, 20));
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
    // ==== 삼각함수 ====
    // 삼각함수 그래프: y=a sin b(x-c)+d, y=a cos b(x-c)+d, y=a tan b(x-c)+d를 가로축 π/2 눈금 위에 그린다 (c는 π의 몇 배).
    // 최댓값·최솟값 점선, 주기(이웃한 두 꼭대기 사이 치수선과 2π/3 같은 글자), tan 점근선, 원래 그래프(y=sin x) 점선, 식 글자를 고른다.
    // 진폭·주기·최댓값·최솟값·점근선은 창에 보여 준다. 세로 범위는 그래프가 들어가게 자동으로 정한다.
    // 두 번째 그래프(y=cos x 등)를 겹쳐 그리고, 직선 y=k를 더해 교점(점·x축까지 점선·x좌표 글자)을 찍는다.
    // 부등식 f(x) > g(x) (≥, <, ≤, g는 y=k 또는 두 번째 그래프)의 해는 x축 위 굵은 선분(경계 ●/○)으로 그린다.
    // 교점의 x좌표는 π/6처럼 π의 분수로 나오면 그 값, 아니면 α, β, γ …로 쓴다. k는 1/2, √3/2로도 넣는다.
    // 선 두께: 축 0.4pt, 그래프·직선 0.8pt, 해 선분 2pt, 점선·치수선 0.3pt. 선택은 필요 없다.
    function makeTrigEngine() {
        var api = {label: "삼각함수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathTrig/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(π)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var SOLUTION_PT = 2;
            var GUIDE_PT = 0.3;
            var OPEN_DOT_PT = 0.5;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var SMALL_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 };
            var KINDS = ["sin", "cos", "tan"];
            var INEQUALITIES = ["없음", "f(x) > g(x)", "f(x) ≥ g(x)", "f(x) < g(x)", "f(x) ≤ g(x)"];
            var TARGETS = ["y=k", "두 번째 그래프"];
            var ROOT_NAMES = ["α", "β", "γ", "δ", "ε", "ζ", "η"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["extremes", "period", "asymptotes", "reference", "formula", "grid", "numbers", "second", "kLine", "meets"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션. graphs[0]이 f(x), graphs[1]이 겹쳐 그리는 두 번째 그래프
            var graphs = [{ kind: 0, a: 2, b: 2, c: 0, d: 0 }, { kind: 1, a: 1, b: 1, c: 0, d: 0 }];
            var editing = 0;   // 함수 행이 고치는 그래프
            var kValue = 0.5;
            var inequality = 0, target = 0;
            var xMinHalf = -2, xMaxHalf = 6;   // π/2의 몇 배
            var piMm = 20, yUnitMm = 6;
            var fontPt = 8;
            var opt = { extremes: true, period: true, asymptotes: true, reference: false, formula: true, grid: false, numbers: true,
                second: false, kLine: false, meets: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "y = a sin b(x - c) + d");
            var kindRow = functionPanel.add("group");
            kindRow.add("statictext", undefined, "함수:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = graphs[0].kind;
            kindRow.add("statictext", undefined, "고칠 그래프:");
            var editRadios = [kindRow.add("radiobutton", undefined, "첫째 f(x)"), kindRow.add("radiobutton", undefined, "둘째")];
            editRadios[0].value = true;
            editRadios[1].helpTip = "두 번째 그래프의 함수·a·b·c·d를 고친다. 고르면 「두 번째 그래프」가 켜진다";
            var aControls = addValueRow(functionPanel, "a", "", graphs[0].a, -5, 5, 0.5, 1);
            var bControls = addValueRow(functionPanel, "b", "", graphs[0].b, 0.5, 6, 0.5, 1);
            var cControls = addValueRow(functionPanel, "c", "×π", graphs[0].c, -2, 2, 0.25, 2);
            cControls.input.helpTip = "π의 몇 배. 0.25 = π/4, 0.5 = π/2";
            var dControls = addValueRow(functionPanel, "d", "", graphs[0].d, -5, 5, 0.5, 1);

            var checks = {};
            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["extremes", "최댓값·최솟값"], ["period", "주기"], ["asymptotes", "tan 점근선"]]);
            addCheckRow(markPanel, [["reference", "원래 그래프 점선"], ["formula", "식 글자"], ["second", "두 번째 그래프"]]);

            var solvePanel = addPanel(win, "방정식 · 부등식");
            addCheckRow(solvePanel, [["kLine", "직선 y=k"], ["meets", "교점 표시"]]);
            checks.meets.helpTip = "f(x)와 y=k, f(x)와 두 번째 그래프의 교점에 점을 찍고 x축까지 점선과 x좌표를 넣는다";
            var kControls = addValueRow(solvePanel, "k", "", kValue, -5, 5, 0.05, 2);
            kControls.input.text = kText(kValue);
            kControls.input.helpTip = "1/2, √3/2, -√2/2처럼 써도 된다 (√ 대신 r: r3/2)";
            var inequalityRow = solvePanel.add("group");
            inequalityRow.add("statictext", undefined, "부등식:");
            var inequalityList = inequalityRow.add("dropdownlist", undefined, INEQUALITIES);
            inequalityList.selection = inequality;
            inequalityList.helpTip = "f(x)는 첫째 그래프. 가로 범위 안의 해를 x축 위 굵은 선분(경계 ●/○)으로 그린다";
            inequalityRow.add("statictext", undefined, "g(x):");
            var targetList = inequalityRow.add("dropdownlist", undefined, TARGETS);
            targetList.selection = target;

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "×π/2", xMinHalf, -8, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "×π/2", xMaxHalf, 1, 12, 1, 0);
            var piControls = addValueRow(rangePanel, "π의 길이", "mm", piMm, 8, 60, 1, 0);
            var yUnitControls = addValueRow(rangePanel, "세로 단위", "mm", yUnitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 48];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            var syncing = false;   // 고칠 그래프를 바꿔 행을 채우는 동안은 다시 그리지 않는다
            kindList.onChange = function() {
                if (syncing) return;
                graphs[editing].kind = kindList.selection ? kindList.selection.index : 0;
                updatePreview();
            };
            for (var er = 0; er < editRadios.length; er++) bindEditRadio(er);
            bindValueRow(aControls, function(value) { graphs[editing].a = value; });
            bindValueRow(bControls, function(value) { graphs[editing].b = value; });
            bindValueRow(cControls, function(value) { graphs[editing].c = value; });
            bindValueRow(dControls, function(value) { graphs[editing].d = value; });
            bindKRow(kControls);
            inequalityList.onChange = function() { inequality = inequalityList.selection ? inequalityList.selection.index : 0; updatePreview(); };
            targetList.onChange = function() { target = targetList.selection ? targetList.selection.index : 0; updatePreview(); };
            bindValueRow(xMinControls, function(value) { xMinHalf = value; });
            bindValueRow(xMaxControls, function(value) { xMaxHalf = value; });
            bindValueRow(piControls, function(value) { piMm = value; });
            bindValueRow(yUnitControls, function(value) { yUnitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. a = 0이면 확정하지 않는다
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

            // 고칠 그래프를 바꾸면 함수·a·b·c·d 행을 그 그래프 값으로 채운다. 둘째를 고르면 두 번째 그래프를 켠다
            function bindEditRadio(index) {
                editRadios[index].onClick = function() {
                    editing = index;
                    var g = graphs[editing];
                    syncing = true;
                    kindList.selection = g.kind;
                    syncing = false;
                    setRowValue(aControls, g.a);
                    setRowValue(bControls, g.b);
                    setRowValue(cControls, g.c);
                    setRowValue(dControls, g.d);
                    if (index === 1 && !opt.second) {
                        opt.second = true;
                        checks.second.value = true;
                    }
                    updatePreview();
                };
            }

            // k 행: 스크롤바는 0.05 단위, 입력창은 1/2·√3/2 같은 값을 그대로 받는다
            function bindKRow(controls) {
                function commit(value) {
                    kValue = clamp(value, controls.min, controls.max);
                    controls.input.text = kText(kValue);
                    try { controls.slider.value = kValue; } catch (e) {}
                    updatePreview();
                }
                controls.slider.onChanging = function() { commit(roundTo(controls.slider.value, controls.step)); };
                controls.slider.onChange = function() { commit(roundTo(controls.slider.value, controls.step)); };
                controls.input.onChange = function() {
                    var value = parseSurd(controls.input.text);
                    commit(value === null ? kValue : value);
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
                var f = graphs[0], g = graphs[1];
                if (Math.abs(f.a) < 1e-9 || (opt.second && Math.abs(g.a) < 1e-9)) {
                    messageText.text = "a는 0이 아니어야 함";
                    return;
                }
                var drawing = buildTrig({
                    kind: f.kind, a: f.a, b: f.b, c: f.c, d: f.d, xMinHalf: xMinHalf, xMaxHalf: xMaxHalf,
                    sx: piMm * MM_TO_PT / Math.PI, sy: yUnitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    extremes: opt.extremes, period: opt.period, asymptotes: opt.asymptotes, reference: opt.reference,
                    formula: opt.formula, grid: opt.grid, numbers: opt.numbers,
                    second: opt.second ? { kind: g.kind, a: g.a, b: g.b, c: g.c, d: g.d } : null,
                    kLine: opt.kLine, k: kValue, meets: opt.meets, inequality: inequality, target: target
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "삼각함수";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"solution"|"guide"|"thin"|"grid"}
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
                path.strokeWidth = line.kind === "graph" ? GRAPH_PT : (line.kind === "solution" ? SOLUTION_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 점 {at, open}: 채운 점(●) 또는 속이 흰 점(○)
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

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양). small: 치수선 화살촉
            function addArrow(arrow) {
                var shape = arrow.small ? SMALL_ARROW : ARROW;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. roman: 기울이지 않는 sin·cos·tan
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                if (label.roman) {
                    for (var r = 0; r < label.roman.length; r++) {
                        var romanAttributes = frame.textRange.characters[label.roman[r]].characterAttributes;
                        romanAttributes.textFont = engFont;
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
            // GSMediumB1에 없는 기호(π)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-trig.js). 원점 (0,0). 가로 1(라디안) = sx pt, 세로 1 = sy pt
            // -------------------------------------------------------
            function trigFunction(kindIndex, a, b, c, d) {
                var shift = c * Math.PI, fn = [Math.sin, Math.cos, Math.tan][kindIndex];
                return function(x) {
                    var t = b * (x - shift);
                    // tan은 점근선 가까이(cos ≈ 0)에서 끊는다
                    if (kindIndex === 2 && Math.abs(Math.cos(t)) < 1e-9) return NaN;
                    return a * fn(t) + d;
                };
            }

            function buildTrig(o) {
                var sx = o.sx, sy = o.sy;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var xLo = o.xMinHalf * Math.PI / 2, xHi = o.xMaxHalf * Math.PI / 2;
                var amp = Math.abs(o.a), top = o.d + amp, bottom = o.d - amp;
                // 세로 범위: 그리는 그래프(tan은 d±4)와 직선 y=k가 모두 들어가게
                var drawn = o.second ? [o, o.second] : [o], lo = 0, hi = 0;
                for (var gi = 0; gi < drawn.length; gi++) {
                    var reach = drawn[gi].kind === 2 ? 4 : Math.abs(drawn[gi].a);
                    lo = Math.min(lo, drawn[gi].d - reach);
                    hi = Math.max(hi, drawn[gi].d + reach);
                }
                if (o.kLine) { lo = Math.min(lo, o.k); hi = Math.max(hi, o.k); }
                var yMin, yMax;
                if (o.kind === 2) { yMin = Math.floor(lo + 1e-9); yMax = Math.ceil(hi - 1e-9); }
                else { yMin = Math.floor(lo + 1e-9) - 1; yMax = Math.ceil(hi - 1e-9) + (o.period ? 2 : 1); }
                function P(x, y) { return [x * sx, y * sy]; }

                // 축과 눈금 (가로 π/2마다)
                var left = Math.min(xLo, 0) * sx - 0.3 * sx, right = xHi * sx + 0.4 * sx;
                var lowY = yMin * sy - 0.5 * sy, highY = yMax * sy + 0.8 * sy;
                if (o.grid) {
                    for (var gx = o.xMinHalf; gx <= o.xMaxHalf; gx++) if (gx !== 0) out.lines.push(straight([P(gx * Math.PI / 2, yMin), P(gx * Math.PI / 2, yMax)], "grid"));
                    for (var gy = yMin; gy <= yMax; gy++) if (gy !== 0) out.lines.push(straight([P(xLo, gy), P(xHi, gy)], "grid"));
                }
                out.lines.push(straight([[left, 0], [right - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, lowY], [0, highY - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, highY], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, highY], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = o.xMinHalf; tx <= o.xMaxHalf; tx++) {
                    if (tx === 0) continue;
                    var at = P(tx * Math.PI / 2, 0);
                    out.lines.push(straight([[at[0], -o.tick / 2], [at[0], o.tick / 2]], "axis"));
                    if (o.numbers) out.texts.push({ text: piText(tx / 2), at: at, dir: [0, -1], clear: o.tick / 2 });
                }
                for (var ty = yMin; ty <= yMax; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * sy], [o.tick / 2, ty * sy]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * sy], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 원래 그래프 (점선)
                if (o.reference && (o.a !== 1 || o.b !== 1 || o.c !== 0 || o.d !== 0)) {
                    addCurve(out, trigFunction(o.kind, 1, 1, 0, 0), xLo, xHi, yMin, yMax, sx, sy, "guide");
                }
                // 그래프
                var fn = trigFunction(o.kind, o.a, o.b, o.c, o.d);
                var lastEnd = addCurve(out, fn, xLo, xHi, yMin, yMax, sx, sy, "graph");

                var periodValue = (o.kind === 2 ? 1 : 2) / o.b;   // π의 몇 배
                if (o.kind === 2) {
                    out.notes.push("주기 " + piText(periodValue) + ", 최댓값·최솟값 없음");
                    var asymptotes = tanAsymptotes(o, xLo, xHi);
                    if (o.asymptotes) {
                        for (var s = 0; s < asymptotes.length; s++) out.lines.push(straight([P(asymptotes[s], yMin), P(asymptotes[s], yMax)], "guide"));
                    }
                    var firstAsymptote = o.c + (0.5) / o.b;
                    out.notes.push("점근선 x=" + piText(firstAsymptote) + "+" + piText(1 / o.b) + "×n (n은 정수)");
                    if (o.period && asymptotes.length >= 2) addPeriod(out, asymptotes[0], asymptotes[1], yMax - 0.5, periodValue, sx, sy);
                } else {
                    out.notes.push("진폭 " + formatValue(amp) + ", 주기 " + piText(periodValue) + ", 최댓값 " + formatValue(top) + ", 최솟값 " + formatValue(bottom));
                    if (o.extremes) {
                        out.lines.push(straight([P(xLo, top), P(xHi, top)], "guide"));
                        out.lines.push(straight([P(xLo, bottom), P(xHi, bottom)], "guide"));
                        if (o.numbers && Math.abs(top - Math.round(top)) > 1e-9) out.texts.push({ text: formatValue(top), at: [0, top * sy], dir: [-1, 0], clear: o.tick / 2, upright: true });
                        if (o.numbers && Math.abs(bottom - Math.round(bottom)) > 1e-9) out.texts.push({ text: formatValue(bottom), at: [0, bottom * sy], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                    if (o.period) {
                        // 최댓값이 되는 x: b(x - cπ) = (sin π/2, cos 0) + 2kπ (a < 0이면 반 주기 옮긴다)
                        var phase = (o.kind === 0 ? Math.PI / 2 : 0) + (o.a < 0 ? Math.PI : 0);
                        var T = 2 * Math.PI / o.b, first = o.c * Math.PI + phase / o.b;
                        first -= Math.ceil((first - xLo) / T - 1e-9) * T;
                        if (first < xLo - 1e-9) first += T;
                        if (first + T <= xHi + 1e-9) addPeriod(out, first, first + T, top + 1, periodValue, sx, sy, top);
                        else out.notes.push("주기 치수선: 가로 범위에 한 주기가 들어가지 않음");
                    }
                }

                if (o.formula && lastEnd) {
                    var eq = trigFormula(o);
                    out.texts.push({ text: eq.text, roman: eq.roman, at: lastEnd, dir: [1, 0] });
                }

                // 두 번째 그래프 (실선, 식 글자는 그 끝에)
                var secondFn = null;
                if (o.second) {
                    secondFn = trigFunction(o.second.kind, o.second.a, o.second.b, o.second.c, o.second.d);
                    var secondEnd = addCurve(out, secondFn, xLo, xHi, yMin, yMax, sx, sy, "graph");
                    if (o.second.kind === 2 && o.asymptotes) {
                        var secondAsymptotes = tanAsymptotes(o.second, xLo, xHi);
                        for (var sa = 0; sa < secondAsymptotes.length; sa++) out.lines.push(straight([P(secondAsymptotes[sa], yMin), P(secondAsymptotes[sa], yMax)], "guide"));
                    }
                    if (o.formula && secondEnd) {
                        var eq2 = trigFormula(o.second);
                        out.texts.push({ text: eq2.text, roman: eq2.roman, at: secondEnd, dir: [1, 0] });
                    }
                }

                // 직선 y=k. 정수가 아니면 세로축에 값 (최댓값·최솟값 글자와 겹치면 뺀다)
                var kFn = null;
                if (o.kLine) {
                    kFn = function() { return o.k; };
                    out.lines.push(straight([P(xLo, o.k), P(xHi, o.k)], "graph"));
                    out.texts.push({ text: "y=" + kText(o.k), at: P(xHi, o.k), dir: [1, 0] });
                    var onExtreme = o.extremes && o.kind !== 2 && (Math.abs(o.k - top) < 1e-9 || Math.abs(o.k - bottom) < 1e-9);
                    if (o.numbers && !onExtreme && Math.abs(o.k - Math.round(o.k)) > 1e-9) {
                        out.texts.push({ text: kText(o.k), at: [0, o.k * sy], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 교점과 부등식의 해. π의 분수가 아닌 x좌표는 작은 것부터 α, β, γ …
                var named = [];
                function rootText(x) {
                    var exact = exactPi(x);
                    if (exact !== null) return exact;
                    for (var n = 0; n < named.length; n++) if (Math.abs(named[n] - x) < 1e-6) return ROOT_NAMES[n] || formatValue(x);
                    named.push(x);
                    return ROOT_NAMES[named.length - 1] || formatValue(x);
                }
                var pairs = [];
                if (kFn) pairs.push({ fn: kFn, name: "y=" + kText(o.k) });
                if (secondFn) pairs.push({ fn: secondFn, name: "두 번째 그래프" });
                if (o.meets) {
                    var marked = [];
                    for (var pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
                        var eqResult = solveEquation(fn, pairs[pairIndex].fn, xLo, xHi);
                        if (eqResult.same) {
                            out.notes.push("겹침 (" + pairs[pairIndex].name + ")");
                            continue;
                        }
                        var texts = [];
                        for (var r = 0; r < eqResult.roots.length; r++) {
                            var rx = eqResult.roots[r], ry = fn(rx), label = rootText(rx);
                            texts.push(label);
                            if (!(ry >= yMin - 1e-9 && ry <= yMax + 1e-9)) continue;
                            var seen = false;
                            for (var m = 0; m < marked.length; m++) if (Math.abs(marked[m] - rx) < 1e-6) seen = true;
                            if (seen) continue;
                            out.dots.push({ at: P(rx, ry) });
                            marked.push(rx);
                            if (Math.abs(ry) > 1e-9) out.lines.push(straight([P(rx, 0), P(rx, ry)], "guide"));
                            // π/2의 배수는 눈금 숫자가 이미 있다
                            var onTick = Math.abs(rx / (Math.PI / 2) - Math.round(rx / (Math.PI / 2))) < 1e-9;
                            if (!(onTick && (o.numbers || Math.abs(rx) < 1e-9))) {
                                out.texts.push({ text: label, at: P(rx, 0), dir: [0, ry < -1e-9 ? 1 : -1], clear: o.tick / 2 });
                            }
                        }
                        out.notes.push("교점 (" + pairs[pairIndex].name + "): " + (texts.length > 0 ? "x = " + texts.join(", ") : "없음"));
                    }
                }
                if (o.inequality > 0) {
                    var other = o.target === 0 ? kFn : secondFn;
                    var relation = INEQUALITIES[o.inequality].replace("g(x)", o.target === 0 ? kText(o.k) : "g(x)");
                    if (!other) {
                        out.notes.push("부등식: " + (o.target === 0 ? "직선 y=k" : "두 번째 그래프") + "를 켜야 함");
                    } else {
                        var solution = solveInequality(fn, other, xLo, xHi, o.inequality);
                        var parts = [];
                        for (var iv = 0; iv < solution.intervals.length; iv++) {
                            var seg = solution.intervals[iv];
                            if (seg.hi - seg.lo > 1e-9) out.lines.push(straight([P(seg.lo, 0), P(seg.hi, 0)], "solution"));
                            if (seg.loType !== "edge") out.dots.push({ at: P(seg.lo, 0), open: seg.loType === "pole" || solution.strict });
                            if (seg.hiType !== "edge") out.dots.push({ at: P(seg.hi, 0), open: seg.hiType === "pole" || solution.strict });
                            var loClosed = seg.loType === "edge" || (seg.loType === "root" && !solution.strict);
                            var hiClosed = seg.hiType === "edge" || (seg.hiType === "root" && !solution.strict);
                            parts.push(rootText(seg.lo) + (loClosed ? " ≤ " : " < ") + "x" + (hiClosed ? " ≤ " : " < ") + rootText(seg.hi));
                        }
                        for (var sp = 0; sp < solution.points.length; sp++) {
                            out.dots.push({ at: P(solution.points[sp], 0) });
                            parts.push("x = " + rootText(solution.points[sp]));
                        }
                        out.notes.push(relation + "의 해: " + (parts.length > 0 ? parts.join(", ") : "없음"));
                    }
                }
                return out;
            }

            // tan 그래프의 점근선 b(x - cπ) = π/2 + kπ 중 범위 안
            function tanAsymptotes(g, xLo, xHi) {
                var list = [];
                for (var k = -200; k <= 200; k++) {
                    var xa = g.c * Math.PI + (Math.PI / 2 + k * Math.PI) / g.b;
                    if (xa > xLo + 1e-9 && xa < xHi - 1e-9) list.push(xa);
                }
                return list;
            }

            // [x0, x1]에서 f(x) = g(x)인 x(오름차순, π의 분수에 가까우면 그 값으로 맞춘다)와 끊긴 곳(tan 점근선).
            // 부호가 바뀌는 곳은 이분법, 닿기만 하는 곳(sin x = 1)은 |f - g|가 작아지는 곳을 황금분할로 찾는다. 두 식이 같으면 same
            function solveEquation(f, g, x0, x1) {
                var N = 2400, xs = [], hs = [], i;
                function h(x) {
                    var v = f(x) - g(x);
                    return (typeof v === "number" && isFinite(v)) ? v : NaN;
                }
                for (i = 0; i <= N; i++) {
                    xs.push(x0 + (x1 - x0) * i / N);
                    hs.push(h(xs[i]));
                }
                var same = true;
                for (i = 0; i <= N && same; i++) if (!(Math.abs(hs[i]) < 1e-9)) same = false;
                if (same) return { roots: [], poles: [], same: true };
                var roots = [], poles = [];
                for (i = 0; i <= N; i++) {
                    if (isNaN(hs[i])) { poles.push(xs[i]); continue; }
                    if (i < N && !isNaN(hs[i + 1]) && hs[i] * hs[i + 1] < 0) {
                        var a = xs[i], b = xs[i + 1], ha = hs[i];
                        for (var it = 0; it < 80; it++) {
                            var mid = (a + b) / 2, hm = h(mid);
                            if (isNaN(hm)) break;
                            if ((hm < 0) === (ha < 0)) { a = mid; ha = hm; } else { b = mid; }
                        }
                        var cross = (a + b) / 2, hc = h(cross);
                        if (isNaN(hc) || Math.abs(hc) > 1e-6) poles.push(cross);
                        else roots.push(cross);
                    }
                    // 닿는 근: |h|의 극소
                    var here = Math.abs(hs[i]);
                    if (here > 0.05) continue;
                    var lower = i > 0 ? Math.abs(hs[i - 1]) : Infinity, upper = i < N ? Math.abs(hs[i + 1]) : Infinity;
                    if (!(here <= lower && here <= upper)) continue;
                    if (here === 0) { roots.push(xs[i]); continue; }
                    var lo = xs[Math.max(0, i - 1)], hi = xs[Math.min(N, i + 1)], ratio = 0.6180339887;
                    for (var gs = 0; gs < 100; gs++) {
                        var p = hi - ratio * (hi - lo), q = lo + ratio * (hi - lo);
                        if (Math.abs(h(p)) < Math.abs(h(q))) hi = q; else lo = p;
                    }
                    var touch = (lo + hi) / 2;
                    if (Math.abs(h(touch)) < 1e-8) roots.push(touch);
                }
                return { roots: uniqueSorted(roots), poles: uniqueSorted(poles), same: false };

                function uniqueSorted(list) {
                    list.sort(function(u, v) { return u - v; });
                    var kept = [];
                    for (var k = 0; k < list.length; k++) {
                        var x = snapPi(list[k]);
                        if (kept.length === 0 || x - kept[kept.length - 1] > 1e-6) kept.push(x);
                    }
                    return kept;
                }
            }

            // π의 분수(분모 12까지)에 아주 가까우면 그 값으로
            function snapPi(x) {
                var v = x / Math.PI;
                for (var q = 1; q <= 12; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) < 1e-7) return p / q * Math.PI;
                }
                return x;
            }

            // x가 π의 분수(분모 12까지)면 π/6 같은 글자, 아니면 null
            function exactPi(x) {
                var v = x / Math.PI;
                for (var q = 1; q <= 12; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) < 1e-9) return piText(p / q);
                }
                return null;
            }

            // f(x) ? g(x) (1 >, 2 ≥, 3 <, 4 ≤)의 해. intervals: {lo, hi, loType, hiType} (type: root 근, pole 점근선, edge 범위 끝),
            // points: 등호일 때만 해가 되는 외딴 근 (sin x ≥ 1 → π/2)
            function solveInequality(f, g, x0, x1, relation) {
                var strict = relation === 1 || relation === 3, greater = relation <= 2;
                var eq = solveEquation(f, g, x0, x1);
                if (eq.same) return { intervals: strict ? [] : [{ lo: x0, hi: x1, loType: "edge", hiType: "edge" }], points: [], strict: strict };
                var cuts = [{ x: x0, type: "edge" }], i;
                for (i = 0; i < eq.roots.length; i++) cuts.push({ x: eq.roots[i], type: "root" });
                for (i = 0; i < eq.poles.length; i++) cuts.push({ x: eq.poles[i], type: "pole" });
                cuts.push({ x: x1, type: "edge" });
                cuts.sort(function(u, v) { return u.x - v.x; });
                // 범위 끝과 겹친 근·점근선은 근·점근선으로 본다
                var merged = [];
                for (i = 0; i < cuts.length; i++) {
                    var last = merged[merged.length - 1];
                    if (last && cuts[i].x - last.x < 1e-9) {
                        if (last.type === "edge") last.type = cuts[i].type;
                        continue;
                    }
                    merged.push({ x: cuts[i].x, type: cuts[i].type });
                }
                var intervals = [];
                for (i = 0; i + 1 < merged.length; i++) {
                    var a = merged[i], b = merged[i + 1], mid = (a.x + b.x) / 2, hm = f(mid) - g(mid);
                    if (!isFinite(hm) || !(greater ? hm > 0 : hm < 0)) continue;
                    var prev = intervals[intervals.length - 1];
                    // 등호가 있으면 닿는 근을 사이에 둔 두 구간을 잇는다
                    if (prev && prev.hi === a.x && a.type === "root" && !strict) {
                        prev.hi = b.x;
                        prev.hiType = b.type;
                    } else {
                        intervals.push({ lo: a.x, hi: b.x, loType: a.type, hiType: b.type });
                    }
                }
                var points = [];
                if (!strict) {
                    for (i = 0; i < eq.roots.length; i++) {
                        var x = eq.roots[i], inside = false;
                        for (var k = 0; k < intervals.length; k++) if (x >= intervals[k].lo - 1e-9 && x <= intervals[k].hi + 1e-9) inside = true;
                        if (!inside) points.push(x);
                    }
                }
                return { intervals: intervals, points: points, strict: strict };
            }

            // k 글자: 1/2, √3/2, -√2/2, 정수, 아니면 소수 둘째 자리 (3/10 같은 분수는 0.3)
            function kText(v) {
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) < 1e-9) return q === 1 ? String(p) : (p < 0 ? "-" : "") + Math.abs(p) + "/" + q;
                }
                var roots = [2, 3];
                for (var r = 0; r < roots.length; r++) {
                    for (var d = 1; d <= 6; d++) {
                        var n = Math.round(v * d / Math.sqrt(roots[r]));
                        if (n === 0 || Math.abs(n * Math.sqrt(roots[r]) / d - v) > 1e-9) continue;
                        return (n < 0 ? "-" : "") + (Math.abs(n) === 1 ? "" : String(Math.abs(n))) + "√" + roots[r] + (d === 1 ? "" : "/" + d);
                    }
                }
                return formatValue(v);
            }

            // "1/2", "-√3/2", "r2/2", "2√2", "0.5" → 수. 읽을 수 없으면 null (정규식 match는 ExtendScript가 멈출 수 있어 한 글자씩 읽는다)
            function parseSurd(text) {
                var s = String(text).replace(/\s/g, "").replace(/,/g, ".").replace(/−/g, "-").replace(/r/gi, "√");
                var pos = 0, sign = 1;
                if (s.charAt(0) === "-" || s.charAt(0) === "+") { sign = s.charAt(0) === "-" ? -1 : 1; pos = 1; }
                function number() {
                    var begin = pos;
                    while (pos < s.length && ((s.charAt(pos) >= "0" && s.charAt(pos) <= "9") || s.charAt(pos) === ".")) pos++;
                    if (pos === begin) return null;
                    var value = parseFloat(s.substring(begin, pos));
                    return isNaN(value) ? null : value;
                }
                var coefficient = number(), value;
                if (s.charAt(pos) === "√") {
                    pos++;
                    var radicand = number();
                    if (radicand === null) return null;
                    value = (coefficient === null ? 1 : coefficient) * Math.sqrt(radicand);
                } else {
                    if (coefficient === null) return null;
                    value = coefficient;
                }
                if (s.charAt(pos) === "/") {
                    pos++;
                    var denominator = number();
                    if (denominator === null || denominator === 0) return null;
                    value /= denominator;
                }
                return pos === s.length ? sign * value : null;
            }

            // 곡선을 그리고 마지막 조각의 끝(pt)을 돌려준다
            function addCurve(out, fn, xLo, xHi, yMin, yMax, sx, sy, kind) {
                var segments = plotFunction(fn, xLo, xHi, yMin, yMax), end = null;
                for (var s = 0; s < segments.length; s++) {
                    if (segments[s].length < 2) continue;
                    var bez = toBezier(segments[s], 1);
                    for (var b = 0; b < bez.length; b++) {
                        bez[b] = { anchor: [bez[b].anchor[0] * sx, bez[b].anchor[1] * sy], left: [bez[b].left[0] * sx, bez[b].left[1] * sy], right: [bez[b].right[0] * sx, bez[b].right[1] * sy] };
                    }
                    out.lines.push({ points: bez, kind: kind });
                    end = bez[bez.length - 1].anchor;
                }
                return end;
            }

            // 두 x 사이 주기 치수선: 높이 y에 양쪽 화살촉, 가운데 위에 주기 글자. from이 있으면 꼭대기에서 치수선까지 점선
            function addPeriod(out, x0, x1, y, periodValue, sx, sy, from) {
                var a = [x0 * sx, y * sy], b = [x1 * sx, y * sy];
                out.lines.push(straight([[a[0] + SMALL_ARROW.length - SMALL_ARROW.notch, a[1]], [b[0] - SMALL_ARROW.length + SMALL_ARROW.notch, b[1]]], "thin"));
                out.arrows.push({ tip: a, dir: [-1, 0], small: true });
                out.arrows.push({ tip: b, dir: [1, 0], small: true });
                if (from !== undefined) {
                    out.lines.push(straight([[a[0], from * sy], [a[0], a[1]]], "guide"));
                    out.lines.push(straight([[b[0], from * sy], [b[0], b[1]]], "guide"));
                }
                out.texts.push({ text: piText(periodValue), at: [(a[0] + b[0]) / 2, a[1]], dir: [0, 1] });
            }

            // π의 v배: 분모 12까지 분수로 (π, 2π, π/2, 2π/3, -π/4). 분수가 안 되면 소수
            function piText(v) {
                if (Math.abs(v) < 1e-9) return "0";
                for (var q = 1; q <= 12; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) > 1e-9) continue;
                    var sign = p < 0 ? "-" : "", n = Math.abs(p);
                    return sign + (n === 1 ? "" : String(n)) + "π" + (q === 1 ? "" : "/" + q);
                }
                return formatValue(v * Math.PI);
            }

            // y=2sin 2(x-π/4)+1 (a=1·b=1·c=0·d=0이면 뺀다). sin·cos·tan은 똑바로(roman)
            function trigFormula(o) {
                var name = KINDS[o.kind], text = "y=", roman = [];
                var aText = formatValue(o.a);
                text += aText === "1" ? "" : (aText === "-1" ? "-" : aText);
                for (var i = 0; i < name.length; i++) { roman.push(text.length); text += name.charAt(i); }
                var bText = formatValue(o.b), cText = piText(Math.abs(o.c));
                var inner = o.c === 0 ? "x" : "(x" + (o.c > 0 ? "-" : "+") + cText + ")";
                if (bText === "1") text += o.c === 0 ? " x" : inner;
                else text += " " + bText + inner;
                if (o.d !== 0) text += (o.d > 0 ? "+" : "-") + formatValue(Math.abs(o.d));
                return { text: text, roman: roman };
            }

            function formatValue(v) {
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
                var f = graphs[0], g = graphs[1];
                var parts = ["v2", f.kind, f.a, f.b, f.c, f.d, g.kind, g.a, g.b, g.c, g.d, xMinHalf, xMaxHalf, piMm, yUnitMm, fontPt, flags,
                    kValue, inequality, target, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v2" || p.length !== 23 || p[16].length !== FLAG_KEYS.length) return;
                try {
                    for (var gi = 0; gi < 2; gi++) {
                        var g = graphs[gi], base = 1 + gi * 5;
                        g.kind = Math.round(restoreNumber(p[base], g.kind, 0, KINDS.length - 1));
                        g.a = restoreNumber(p[base + 1], g.a, -5, 5);
                        g.b = restoreNumber(p[base + 2], g.b, 0.5, 6);
                        g.c = restoreNumber(p[base + 3], g.c, -2, 2);
                        g.d = restoreNumber(p[base + 4], g.d, -5, 5);
                    }
                    xMinHalf = Math.round(restoreNumber(p[11], xMinHalf, -8, 0));
                    xMaxHalf = Math.round(restoreNumber(p[12], xMaxHalf, 1, 12));
                    piMm = restoreNumber(p[13], piMm, 8, 60);
                    yUnitMm = restoreNumber(p[14], yUnitMm, 2, 20);
                    fontPt = restoreNumber(p[15], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[16].charAt(i) === "1";
                    kValue = restoreNumber(p[17], kValue, -5, 5);
                    inequality = Math.round(restoreNumber(p[18], inequality, 0, INEQUALITIES.length - 1));
                    target = Math.round(restoreNumber(p[19], target, 0, TARGETS.length - 1));
                    offsetXmm = restoreNumber(p[20], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[21], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[22] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 단위원 ====
    // 단위원·일반각: 좌표축 위의 원과 동경 OP, x축의 양의 방향에서 동경까지 도는 회전 호(끝에 화살표).
    // 각 θ는 -720~720°. 한 바퀴를 넘으면 회전 호가 한 바퀴마다 조금씩 커지는 나선이 된다(일반각).
    // 각 글자(θ, 120°, 2π/3), 점 P 글자(P, P(cos θ, sin θ), P(x, y)), 두 축으로 내린 수선, ±1 표시,
    // tan 선(x=1과 동경의 연장선이 만나는 점 T)을 고른다. 선 두께: 축 0.4pt, 원·동경 0.8pt, 수선·회전 호 0.3pt.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeUnitCircleEngine() {
        var api = {label: "단위원", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathUnitCircle/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 수학 기호(π, θ …)
            var GS_SYMBOLS = "\u02D8\u00B1\u00B7\u221E\u2248\u2260";   // GSMediumB1에 있는 기호 (˘ 자리에 °)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };   // 축 화살촉 (pt)
            var TURN_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 };   // 회전 호 끝 화살촉 (pt)
            var ANGLE_STYLES = ["θ", "도 (120°)", "호도법 (2π/3)", "없음"];
            var POINT_STYLES = ["P", "P(cos θ, sin θ)", "P(x, y)", "없음"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["circle", "radius", "arc", "perpendiculars", "units", "tangent"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var opt = { circle: true, radius: true, arc: true, perpendiculars: true, units: true, tangent: false };
            var thetaDeg = 120;
            var radiusMm = 20;
            var arcMm = 4;
            var angleStyle = 0;
            var pointStyle = 1;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var anglePanel = addPanel(win, "각");
            var thetaControls = addValueRow(anglePanel, "각 θ", "°", thetaDeg, -720, 720, 1, 0);
            thetaControls.input.helpTip = "x축의 양의 방향에서 반시계가 +. 360°를 넘으면 회전 호가 나선이 된다";
            var styleRow = anglePanel.add("group");
            styleRow.add("statictext", undefined, "각 글자:");
            var angleList = styleRow.add("dropdownlist", undefined, ANGLE_STYLES);
            angleList.selection = angleStyle;
            styleRow.add("statictext", undefined, "점 글자:");
            var pointList = styleRow.add("dropdownlist", undefined, POINT_STYLES);
            pointList.selection = pointStyle;

            var elementPanel = addPanel(win, "그릴 것");
            var checks = {};
            addCheckRow(elementPanel, [["circle", "원"], ["radius", "동경 OP"], ["arc", "회전 호"]]);
            addCheckRow(elementPanel, [["perpendiculars", "축까지 수선"], ["units", "1, -1 표시"], ["tangent", "tan 선 (x=1)"]]);
            checks.tangent.helpTip = "x=1 직선과 동경(또는 그 연장선)이 만나는 점 T(1, tan θ)";

            var sizePanel = addPanel(win, "크기");
            var radiusControls = addValueRow(sizePanel, "반지름", "mm", radiusMm, 10, 60, 0.5, 1);
            var arcControls = addValueRow(sizePanel, "회전 호", "mm", arcMm, 1.5, 15, 0.5, 1);
            arcControls.input.helpTip = "회전 호의 처음 반지름";
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            angleList.onChange = function() { angleStyle = angleList.selection ? angleList.selection.index : 0; updatePreview(); };
            pointList.onChange = function() { pointStyle = pointList.selection ? pointList.selection.index : 0; updatePreview(); };
            bindValueRow(thetaControls, function(value) { thetaDeg = value; });
            bindValueRow(radiusControls, function(value) { radiusMm = value; });
            bindValueRow(arcControls, function(value) { arcMm = value; });
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
                var drawing = buildUnitCircle({
                    theta: thetaDeg, radius: radiusMm * MM_TO_PT, arcRadius: arcMm * MM_TO_PT,
                    angleStyle: angleStyle, pointStyle: pointStyle, circle: opt.circle, showRadius: opt.radius, arc: opt.arc,
                    perpendiculars: opt.perpendiculars, units: opt.units, tangent: opt.tangent
                });
                previewGroup = layer.groupItems.add();
                previewGroup.name = "단위원";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var c = 0; c < drawing.circles.length; c++) addCircle(drawing.circles[c]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"main"|"guide"|"thin"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < line.points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = line.points[j].left;
                    point.rightDirection = line.points[j].right;
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var shape = arrow.small ? TURN_ARROW : ARROW;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. roman: 똑바로 쓸 글자 위치(cos, sin)
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                if (label.roman) {
                    for (var r = 0; r < label.roman.length; r++) {
                        var romanCharacter = frame.textRange.characters[label.roman[r]];
                        var romanAttributes = romanCharacter.characterAttributes;
                        romanAttributes.textFont = engFont;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt),
            // 소문자 변수(x, y)는 GSMediItaC1, GSMediumB1에 없는 기호(π, θ)는 HancomEQN. 점 이름·O(upright)는 기울이지 않는다
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126 && GS_SYMBOLS.indexOf(text.charAt(i)) < 0) {
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-unit-circle.js). 원점 (0,0), 반지름 r pt
            // -------------------------------------------------------
            function buildUnitCircle(o) {
                var r = o.radius, rad = o.theta * Math.PI / 180;
                var out = { lines: [], circles: [], arrows: [], dots: [], texts: [] };
                var P = [r * Math.cos(rad), r * Math.sin(rad)];
                var turns = Math.floor(Math.abs(o.theta) / 360 - 1e-9);   // 한 바퀴를 넘은 횟수
                var arcGap = Math.max(1.2, o.arcRadius * 0.25);
                var arcEnd = o.arcRadius + Math.max(0, turns) * arcGap;
                var reach = Math.max(r * 1.3, arcEnd + 6);
                if (o.tangent) reach = Math.max(reach, r * 1.15);
                var tangentOn = o.tangent && Math.abs(Math.cos(rad)) > 1e-6 && Math.abs(Math.tan(rad)) <= 3;

                // 축
                var top = tangentOn ? Math.max(reach, Math.abs(r * Math.tan(rad)) + r * 0.3) : reach;
                out.lines.push(straight([[-reach, 0], [reach - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, -top], [0, top - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [reach, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top], dir: [0, 1] });
                out.texts.push({ text: "x", at: [reach, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });

                if (o.circle) out.circles.push({ center: [0, 0], radius: r });
                if (o.units) {
                    out.texts.push({ text: "1", at: [r, 0], dir: [0.7071, -0.7071], upright: true });
                    out.texts.push({ text: "-1", at: [-r, 0], dir: [-0.7071, -0.7071], upright: true });
                    out.texts.push({ text: "1", at: [0, r], dir: [-0.7071, 0.7071], upright: true });
                    out.texts.push({ text: "-1", at: [0, -r], dir: [-0.7071, -0.7071], upright: true });
                }
                if (o.perpendiculars) {
                    if (Math.abs(P[1]) > r * 1e-6) out.lines.push(straight([P, [P[0], 0]], "guide"));
                    if (Math.abs(P[0]) > r * 1e-6) out.lines.push(straight([P, [0, P[1]]], "guide"));
                }
                if (o.showRadius) out.lines.push(straight([[0, 0], P], "main"));
                if (tangentOn) {
                    var T = [r, r * Math.tan(rad)];
                    out.lines.push(straight([[r, -top * 0.95], [r, top * 0.95]], "thin"));
                    // 동경이 T에 닿지 않으면(제2·3사분면) 원점 반대쪽으로 연장한 점선
                    if (Math.cos(rad) < 0) out.lines.push(straight([[0, 0], T], "guide"));
                    else if (dist(P, [0, 0]) < dist(T, [0, 0])) out.lines.push(straight([P, T], "guide"));
                    out.dots.push(T);
                    out.texts.push({ text: "T", at: T, dir: [0.7071, T[1] >= 0 ? 0.7071 : -0.7071], upright: true });
                }
                if (o.arc && o.theta !== 0) {
                    var arc = spiralPoints(o.arcRadius, arcGap, 0, rad);
                    out.lines.push({ points: arc, kind: "thin" });
                    var last = arc[arc.length - 1];
                    var tangentDir = unit([last.anchor[0] - last.left[0], last.anchor[1] - last.left[1]]);
                    out.arrows.push({ tip: last.anchor, dir: tangentDir, small: true });
                    var label = angleLabel(o.theta, o.angleStyle);
                    if (label) {
                        var mid = rad / 2;
                        if (Math.abs(o.theta) > 360) mid = rad - (rad > 0 ? 1 : -1) * Math.PI / 4;   // 나선이면 끝 가까이
                        var labelRadius = o.arcRadius + Math.max(0, turns) * arcGap * Math.abs(mid / rad);
                        out.texts.push({ text: label, at: [0, 0], dir: [Math.cos(mid), Math.sin(mid)], clear: labelRadius });
                    }
                }
                if (o.pointStyle !== 3) {
                    var text = ["P", "P(cos θ, sin θ)", "P(x, y)"][o.pointStyle];
                    var roman = o.pointStyle === 1 ? [2, 3, 4, 9, 10, 11] : [];
                    out.texts.push({ text: text, at: P, dir: unit(P), upright: o.pointStyle !== 2, roman: roman });
                    if (o.pointStyle === 2) out.texts[out.texts.length - 1].roman = [0];
                }
                out.dots.push(P);
                return out;
            }

            // 반지름이 한 바퀴마다 gap씩 커지는 나선 (start에서 end까지, 라디안). 15°마다 앵커, 접선 핸들
            function spiralPoints(r0, gap, start, end) {
                var sweep = end - start;
                var pieces = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 12)));
                var step = sweep / pieces, k = gap / (2 * Math.PI) * (sweep < 0 ? -1 : 1);
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var t = start + step * i;
                    var radius = r0 + k * (t - start);
                    var p = [radius * Math.cos(t), radius * Math.sin(t)];
                    var d = [k * Math.cos(t) - radius * Math.sin(t), k * Math.sin(t) + radius * Math.cos(t)];
                    var h = step / 3;
                    points.push({
                        anchor: p,
                        left: i === 0 ? p : [p[0] - d[0] * h, p[1] - d[1] * h],
                        right: i === pieces ? p : [p[0] + d[0] * h, p[1] + d[1] * h]
                    });
                }
                return points;
            }

            // 각 글자: θ / 120° / 2π/3 (도를 π의 기약분수로)
            function angleLabel(deg, style) {
                if (style === 0) return "θ";
                if (style === 1) return deg + "°";
                if (style === 3) return "";
                if (deg === 0) return "0";
                var sign = deg < 0 ? "-" : "", n = Math.abs(Math.round(deg)), d = 180;
                var g = gcd(n, d);
                n /= g;
                d /= g;
                return sign + (n === 1 ? "" : String(n)) + "π" + (d === 1 ? "" : "/" + d);
            }

            function gcd(a, b) {
                while (b) {
                    var t = a % b;
                    a = b;
                    b = t;
                }
                return a;
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
            }

            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [1, 0];
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
                row.add("statictext", undefined, label + " (" + unitText + "):").preferredSize.width = LABEL_WIDTH;
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
                var parts = ["v1", flags, thetaDeg, radiusMm, arcMm, angleStyle, pointStyle, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 11 || p[1].length !== FLAG_KEYS.length) return;
                for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
                thetaDeg = Math.round(restoreNumber(p[2], thetaDeg, -720, 720));
                radiusMm = restoreNumber(p[3], radiusMm, 10, 60);
                arcMm = restoreNumber(p[4], arcMm, 1.5, 15);
                angleStyle = Math.round(restoreNumber(p[5], angleStyle, 0, ANGLE_STYLES.length - 1));
                pointStyle = Math.round(restoreNumber(p[6], pointStyle, 0, POINT_STYLES.length - 1));
                fontPt = restoreNumber(p[7], fontPt, 5, 14);
                offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[10] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 단위원과 그래프 ====
    // 단위원 → 삼각함수 그래프 옮기기: 왼쪽에 단위원, 오른쪽에 y=sin x (또는 y=tan x) 그래프를 같은 높이로 두고,
    // 한 바퀴를 n등분한 각의 점에서 높이(sin θ, tan θ)를 가로 점선으로 그래프까지 옮긴다. tan은 x=1 직선 위의 점 T(1, tan θ)에서 옮긴다.
    // 강조 각 θ 하나는 동경 OP(0.8pt), 각 호와 θ, 점 P(T), 그래프의 θ와 sin θ 글자로 따로 보여 준다.
    // 원의 반지름이 그래프의 세로 1이다. 선 두께: 축 0.4pt, 원·그래프·강조 동경 0.8pt, 분할 동경·호 0.3pt, 옮기는 선·수선 0.3pt 점선.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeCircleGraphEngine() {
        var api = {label: "단위원과 그래프", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathCircleGraph/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(π, θ)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var SMALL_DOT_RADIUS_MM = 0.4;
            var LABEL_GAP_MM = 0.8;
            var TAN_LIMIT = 2.5;   // tan 그림의 세로 범위 (반지름의 몇 배)
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var KINDS = ["y=sin x", "y=tan x"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["divisions", "highlight", "drops", "numbers", "formula"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 0;
            var divisionCount = 12;
            var thetaDeg = 60;
            var radiusMm = 12;
            var piMm = 24;
            var gapMm = 6;
            var xMaxHalf = 4;   // π/2의 몇 배
            var fontPt = 8;
            var opt = { divisions: true, highlight: true, drops: true, numbers: true, formula: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "함수 · 각");
            var kindRow = functionPanel.add("group");
            kindRow.add("statictext", undefined, "함수:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var divisionControls = addValueRow(functionPanel, "분할 수", "", divisionCount, 4, 24, 1, 0);
            divisionControls.input.helpTip = "한 바퀴를 몇 등분해 점을 옮길지. 12 = 30°마다";
            var thetaControls = addValueRow(functionPanel, "강조 각 θ", "°", thetaDeg, 0, 360, 5, 0);

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["divisions", "분할 점"], ["highlight", "각 θ 강조"], ["drops", "x축까지 수선"]]);
            addCheckRow(markPanel, [["numbers", "눈금 숫자"], ["formula", "식 글자"]]);

            var sizePanel = addPanel(win, "크기");
            var radiusControls = addValueRow(sizePanel, "반지름", "mm", radiusMm, 6, 40, 0.5, 1);
            radiusControls.input.helpTip = "원의 반지름 = 그래프의 세로 1";
            var piControls = addValueRow(sizePanel, "π의 길이", "mm", piMm, 8, 60, 1, 0);
            var gapControls = addValueRow(sizePanel, "간격", "mm", gapMm, 0, 40, 0.5, 1);
            gapControls.input.helpTip = "원 쪽 x축 화살표 끝에서 그래프의 원점까지";
            var xMaxControls = addValueRow(sizePanel, "x 최댓값", "×π/2", xMaxHalf, 1, 8, 1, 0);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            kindList.onChange = function() { kind = kindList.selection ? kindList.selection.index : 0; updatePreview(); };
            bindValueRow(divisionControls, function(value) { divisionCount = value; });
            bindValueRow(thetaControls, function(value) { thetaDeg = value; });
            bindValueRow(radiusControls, function(value) { radiusMm = value; });
            bindValueRow(piControls, function(value) { piMm = value; });
            bindValueRow(gapControls, function(value) { gapMm = value; });
            bindValueRow(xMaxControls, function(value) { xMaxHalf = value; });
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
                var drawing = buildCircleGraph({
                    kind: kind, divisions: divisionCount, theta: thetaDeg, r: radiusMm * MM_TO_PT, sx: piMm * MM_TO_PT / Math.PI,
                    gap: gapMm * MM_TO_PT, xMaxHalf: xMaxHalf, tick: TICK_MM * MM_TO_PT,
                    showDivisions: opt.divisions, highlight: opt.highlight, drops: opt.drops, numbers: opt.numbers, formula: opt.formula
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";
                previewGroup = layer.groupItems.add();
                previewGroup.name = "단위원과 그래프";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var c = 0; c < drawing.circles.length; c++) addCircle(drawing.circles[c]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                // 원점이 아니라 그림 전체(원 왼쪽 끝 ~ 그래프 오른쪽 끝)의 가운데를 화면 가운데에 둔다
                previewGroup.translate(viewCenter[0] - drawing.centerX + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"main"|"guide"|"thin"}
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
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
            }

            // 점 {at, small}: 분할 점은 작게
            function addDot(dot) {
                var r = (dot.small ? SMALL_DOT_RADIUS_MM : DOT_RADIUS_MM) * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
            function addArrow(arrow) {
                var shape = ARROW;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. roman: 똑바로 쓸 글자 위치(sin, tan)
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                if (label.roman) {
                    for (var r = 0; r < label.roman.length; r++) {
                        var romanAttributes = frame.textRange.characters[label.roman[r]].characterAttributes;
                        romanAttributes.textFont = engFont;
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
            // GSMediumB1에 없는 기호(π)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-circle-graph.js). 그래프 원점 (0,0), 원의 중심 (cx, 0).
            // 가로 1(라디안) = sx pt, 세로 1 = 반지름 r pt
            // -------------------------------------------------------
            function buildCircleGraph(o) {
                var r = o.r, sx = o.sx, isTan = o.kind === 1;
                var out = { lines: [], circles: [], arrows: [], dots: [], texts: [], notes: [], centerX: 0 };
                var reach = isTan ? TAN_LIMIT + 0.3 : 1.3;   // 세로축 끝 (반지름의 몇 배)
                var cx = -(1.3 * r + o.gap), C = [cx, 0];
                var xHi = o.xMaxHalf * Math.PI / 2;
                var fn = isTan ? Math.tan : Math.sin, limit = isTan ? TAN_LIMIT : 1.2;
                function onCircle(t) { return [cx + r * Math.cos(t), r * Math.sin(t)]; }
                function G(x, y) { return [x * sx, y * r]; }
                // 그래프로 옮길 점: sin은 원 위의 P, tan은 x=1 위의 T. 그림 밖이면 null
                function source(t) {
                    if (!isTan) return onCircle(t);
                    if (Math.abs(Math.cos(t)) < 1e-9 || Math.abs(Math.tan(t)) > TAN_LIMIT + 1e-9) return null;
                    return [cx + r, r * Math.tan(t)];
                }

                // 원 쪽 좌표축
                out.lines.push(straight([[cx - 1.3 * r, 0], [cx + 1.3 * r - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[cx, -reach * r], [cx, reach * r - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [cx + 1.3 * r, 0], dir: [1, 0] });
                out.arrows.push({ tip: [cx, reach * r], dir: [0, 1] });
                out.texts.push({ text: "x", at: [cx + 1.3 * r, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [cx, reach * r], dir: [-1, 0] });
                out.texts.push({ text: "O", at: C, dir: [-0.7071, -0.7071], upright: true });
                out.circles.push({ center: C, radius: r });
                if (isTan) out.lines.push(straight([[cx + r, -TAN_LIMIT * r], [cx + r, TAN_LIMIT * r]], "thin"));

                // 그래프 쪽 좌표축과 눈금 (가로 π/2마다, 세로 1마다)
                var left = -Math.min(0.15 * sx, o.gap / 2), right = xHi * sx + 0.4 * sx;
                out.lines.push(straight([[left, 0], [right - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, -reach * r], [0, reach * r - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, reach * r], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, reach * r], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                for (var tx = 1; tx <= o.xMaxHalf; tx++) {
                    var at = G(tx * Math.PI / 2, 0);
                    out.lines.push(straight([[at[0], -o.tick / 2], [at[0], o.tick / 2]], "axis"));
                    if (o.numbers) out.texts.push({ text: piText(tx / 2), at: at, dir: [0, -1], clear: o.tick / 2 });
                }
                var yTicks = isTan ? Math.floor(TAN_LIMIT) : 1;
                for (var ty = -yTicks; ty <= yTicks; ty++) {
                    if (ty === 0) continue;
                    out.lines.push(straight([[-o.tick / 2, ty * r], [o.tick / 2, ty * r]], "axis"));
                    if (o.numbers) out.texts.push({ text: String(ty), at: [0, ty * r], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                // 그래프 (tan은 점근선 점선과 함께)
                var segments = plotFunction(fn, 0, xHi, -limit, limit), end = null;
                for (var s = 0; s < segments.length; s++) {
                    if (segments[s].length < 2) continue;
                    var bez = toBezier(segments[s], 1);
                    for (var b = 0; b < bez.length; b++) {
                        bez[b] = { anchor: G(bez[b].anchor[0], bez[b].anchor[1]), left: G(bez[b].left[0], bez[b].left[1]), right: G(bez[b].right[0], bez[b].right[1]) };
                    }
                    out.lines.push({ points: bez, kind: "main" });
                    end = bez[bez.length - 1].anchor;
                }
                if (isTan) {
                    for (var k = 0; Math.PI / 2 + k * Math.PI < xHi - 1e-9; k++) {
                        var xa = Math.PI / 2 + k * Math.PI;
                        out.lines.push(straight([G(xa, -TAN_LIMIT), G(xa, TAN_LIMIT)], "guide"));
                    }
                }
                if (o.formula && end) out.texts.push({ text: KINDS[o.kind], roman: [2, 3, 4], at: end, dir: [1, 0] });

                // 분할 점: 동경(tan은 T까지 연장), 가로 점선으로 그래프까지, 그래프 점에서 x축까지 수선
                var turn = Math.min(2 * Math.PI, xHi);
                if (o.showDivisions) {
                    for (var i = 0; i < o.divisions; i++) {
                        var t = 2 * Math.PI * i / o.divisions;
                        if (t > turn + 1e-9) break;
                        var P = onCircle(t), from = source(t);
                        out.dots.push({ at: P, small: true });
                        if (!from) {
                            out.lines.push(straight([C, P], "thin"));
                            continue;
                        }
                        // tan: 2·3사분면의 동경은 원점을 지나 반대쪽 T까지 이어진다
                        out.lines.push(straight([isTan && Math.cos(t) < 0 ? P : C, isTan ? from : P], "thin"));
                        if (isTan) out.dots.push({ at: from, small: true });
                        var y = fn(t), onGraph = G(t, y);
                        if (Math.abs(y) < 1e-9) { out.dots.push({ at: onGraph, small: true }); continue; }
                        out.lines.push(straight([from, onGraph], "guide"));
                        if (o.drops) out.lines.push(straight([G(t, 0), onGraph], "guide"));
                        out.dots.push({ at: onGraph, small: true });
                    }
                }

                // 강조 각 θ
                if (o.highlight) {
                    var theta = o.theta * Math.PI / 180, Ph = onCircle(theta), fromH = source(theta);
                    var sinName = isTan ? "tan" : "sin";
                    out.lines.push(straight([C, Ph], "main"));
                    if (theta > 1e-9) {
                        var arcRadius = 0.22 * r;
                        out.lines.push({ points: arcPoints(C, arcRadius, 0, theta), kind: "thin" });
                        out.texts.push({ text: "θ", at: C, dir: [Math.cos(theta / 2), Math.sin(theta / 2)], clear: arcRadius });
                    }
                    out.dots.push({ at: Ph });
                    out.texts.push({ text: "P", at: Ph, dir: [Math.cos(theta) >= 0 ? 0.7071 : -0.7071, Math.sin(theta) >= 0 ? 0.7071 : -0.7071] });
                    var note = "θ = " + formatValue(o.theta) + "° = " + piText(o.theta / 180);
                    if (!fromH) {
                        out.notes.push(note + ", tan θ " + (Math.abs(Math.cos(theta)) < 1e-9 ? "없음" : "= " + formatValue(Math.tan(theta)) + " (그림 밖)"));
                    } else {
                        var yh = fn(theta);
                        out.notes.push(note + ", " + sinName + " θ = " + formatValue(yh));
                        if (isTan) {
                            out.lines.push(straight([Math.cos(theta) < 0 ? Ph : C, fromH], "thin"));
                            out.dots.push({ at: fromH });
                            out.texts.push({ text: "T", at: fromH, dir: [1, 0] });
                        }
                        if (theta <= xHi + 1e-9) {
                            var Gh = G(theta, yh);
                            out.dots.push({ at: Gh });
                            if (Math.abs(yh) > 1e-9) {
                                out.lines.push(straight([fromH, Gh], "guide"));
                                out.lines.push(straight([G(theta, 0), Gh], "guide"));
                                out.texts.push({ text: sinName + " θ", roman: [0, 1, 2], at: G(theta, yh / 2), dir: [1, 0] });
                            }
                            out.texts.push({ text: "θ", at: G(theta, 0), dir: [0, yh < -1e-9 ? 1 : -1], clear: o.tick / 2 });
                        } else {
                            out.notes.push("θ가 가로 범위 밖이라 그래프에는 옮기지 않음");
                        }
                    }
                }

                out.centerX = (cx - 1.3 * r + right) / 2;
                return out;
            }

            // center를 중심으로 a0 → a1 (라디안, 반시계) 호. 90°마다 나눈 베지어
            function arcPoints(center, radius, a0, a1) {
                var pieces = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9));
                var step = (a1 - a0) / pieces, handle = 4 / 3 * Math.tan(step / 4) * radius, points = [];
                for (var i = 0; i <= pieces; i++) {
                    var a = a0 + step * i, c = Math.cos(a), s = Math.sin(a);
                    var anchor = [center[0] + radius * c, center[1] + radius * s];
                    var tangent = [-s * handle, c * handle];
                    points.push({
                        anchor: anchor,
                        left: i > 0 ? [anchor[0] - tangent[0], anchor[1] - tangent[1]] : anchor,
                        right: i < pieces ? [anchor[0] + tangent[0], anchor[1] + tangent[1]] : anchor
                    });
                }
                return points;
            }

            // π의 v배: 분모 12까지 분수로 (π, 2π, π/2, 2π/3, -π/4). 분수가 안 되면 소수
            function piText(v) {
                if (Math.abs(v) < 1e-9) return "0";
                for (var q = 1; q <= 12; q++) {
                    var p = Math.round(v * q);
                    if (Math.abs(p / q - v) > 1e-9) continue;
                    var sign = p < 0 ? "-" : "", n = Math.abs(p);
                    return sign + (n === 1 ? "" : String(n)) + "π" + (q === 1 ? "" : "/" + q);
                }
                return formatValue(v * Math.PI);
            }

            function formatValue(v) {
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

            // -------------------------------------------------------
            // 다이얼로그 부품
            // -------------------------------------------------------
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
                var parts = ["v1", kind, divisionCount, thetaDeg, radiusMm, piMm, gapMm, xMaxHalf, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 13 || p[9].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    divisionCount = Math.round(restoreNumber(p[2], divisionCount, 4, 24));
                    thetaDeg = restoreNumber(p[3], thetaDeg, 0, 360);
                    radiusMm = restoreNumber(p[4], radiusMm, 6, 40);
                    piMm = restoreNumber(p[5], piMm, 8, 60);
                    gapMm = restoreNumber(p[6], gapMm, 0, 40);
                    xMaxHalf = Math.round(restoreNumber(p[7], xMaxHalf, 1, 8));
                    fontPt = restoreNumber(p[8], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[9].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[10], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[11], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[12] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 삼각형 ====
    // 삼각형 만들기: 세 변(SSS), 두 변과 끼인각(SAS), 한 변과 양 끝 각(ASA)으로 삼각형을 그린다 (사인법칙·코사인법칙 단원).
    // BC를 밑변(B 왼쪽, C 오른쪽)으로, A를 위에 둔다. 변 a = BC, b = CA, c = AB.
    // 변 글자(a·b·c 또는 길이), 각 표시(주어진 각 또는 세 각, 호와 값), 외접원과 중심 O·반지름 R을 고르고,
    // 나머지 변·각·R·넓이를 계산해 창에 보여 준다. 선 두께: 삼각형·외접원 0.8pt, 각 표시·R 0.3pt.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeTriangleEngine() {
        var api = {label: "삼각형", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathTriangle/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 수학 기호(π, √ …)
            var GS_SYMBOLS = "\u02D8\u00B1\u00B7\u221E\u2248\u2260";   // GSMediumB1에 있는 기호 (˘ 자리에 °)
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var MODES = ["세 변 (a, b, c)", "두 변과 끼인각 (b, c, A)", "한 변과 양 끝 각 (a, B, C)"];
            var MODE_USES = [["a", "b", "c"], ["b", "c", "A"], ["a", "B", "C"]];
            var SIDE_STYLES = ["없음", "a, b, c", "길이"];
            var ANGLE_STYLES = ["없음", "주어진 각", "세 각"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션 (길이는 단위 없는 수, 각은 도)
            var mode = 1;
            var values = { a: 7, b: 5, c: 8, A: 60, B: 45, C: 75 };
            var unitMm = 5;
            var sideStyle = 1;
            var angleStyle = 1;
            var showCircle = false;
            var showCenter = false;
            var markMm = 3;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var modeRow = win.add("group");
            modeRow.add("statictext", undefined, "주어진 것:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;

            var valuePanel = addPanel(win, "변 · 각");
            var rows = {
                a: addValueRow(valuePanel, "변 a (BC)", "", values.a, 0.5, 30, 0.1, 1),
                b: addValueRow(valuePanel, "변 b (CA)", "", values.b, 0.5, 30, 0.1, 1),
                c: addValueRow(valuePanel, "변 c (AB)", "", values.c, 0.5, 30, 0.1, 1),
                A: addValueRow(valuePanel, "각 A", "°", values.A, 1, 178, 1, 0),
                B: addValueRow(valuePanel, "각 B", "°", values.B, 1, 178, 1, 0),
                C: addValueRow(valuePanel, "각 C", "°", values.C, 1, 178, 1, 0)
            };
            var resultText = valuePanel.add("statictext", undefined, " ", { multiline: true });
            resultText.preferredSize = [360, 34];

            var stylePanel = addPanel(win, "표시");
            var styleRow = stylePanel.add("group");
            styleRow.add("statictext", undefined, "변 글자:");
            var sideList = styleRow.add("dropdownlist", undefined, SIDE_STYLES);
            sideList.selection = sideStyle;
            styleRow.add("statictext", undefined, "각 표시:");
            var angleList = styleRow.add("dropdownlist", undefined, ANGLE_STYLES);
            angleList.selection = angleStyle;
            var circleRow = stylePanel.add("group");
            var circleCheck = circleRow.add("checkbox", undefined, "외접원");
            var centerCheck = circleRow.add("checkbox", undefined, "중심 O와 반지름 R");
            var unitControls = addValueRow(stylePanel, "단위 길이", "mm", unitMm, 1, 20, 0.5, 1);
            unitControls.input.helpTip = "변의 길이 1을 몇 mm로 그릴지";
            var markControls = addValueRow(stylePanel, "각 표시 반지름", "mm", markMm, 1, 10, 0.1, 1);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            circleCheck.value = showCircle;
            centerCheck.value = showCenter;
            refreshEnabled();

            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            for (var key in rows) bindKeyRow(key);
            sideList.onChange = function() { sideStyle = sideList.selection ? sideList.selection.index : 0; updatePreview(); };
            angleList.onChange = function() { angleStyle = angleList.selection ? angleList.selection.index : 0; updatePreview(); };
            circleCheck.onClick = function() { showCircle = circleCheck.value; updatePreview(); };
            centerCheck.onClick = function() { showCenter = centerCheck.value; updatePreview(); };
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(markControls, function(value) { markMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 삼각형이 안 되면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(resultText.text);
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

            function bindKeyRow(key) {
                bindValueRow(rows[key], function(value) { values[key] = value; });
            }

            function refreshEnabled() {
                for (var key in rows) {
                    var used = false;
                    for (var i = 0; i < MODE_USES[mode].length; i++) if (MODE_USES[mode][i] === key) used = true;
                    rows[key].input.parent.enabled = used;
                }
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
                var solved = solveTriangle(mode, values);
                if (solved.error) {
                    resultText.text = solved.error;
                    return;
                }
                resultText.text = describeTriangle(solved);
                var drawing = buildTriangle(solved, {
                    unit: unitMm * MM_TO_PT, mode: mode, sideStyle: sideStyle, angleStyle: angleStyle,
                    circle: showCircle, center: showCenter, markRadius: markMm * MM_TO_PT
                });
                previewGroup = layer.groupItems.add();
                previewGroup.name = "삼각형";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var c = 0; c < drawing.circles.length; c++) addCircle(drawing.circles[c]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                var b = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"main"|"mark"|"guide"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < line.points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = line.points[j].left;
                    point.rightDirection = line.points[j].right;
                }
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : GUIDE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
            }

            function addDot(at) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(at[1] + r, at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt),
            // 소문자 변 이름(a, b, c, R 제외)은 GSMediItaC1, GSMediumB1에 없는 기호는 HancomEQN. 꼭짓점 이름(upright)은 똑바로
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (code > 126 && GS_SYMBOLS.indexOf(text.charAt(i)) < 0) {
                        attributes.textFont = eqnFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && ((code >= 97 && code <= 122) || text.charAt(i) === "R")) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-triangle.js)
            // -------------------------------------------------------
            // {a, b, c, A, B, C(도), given:[주어진 각 이름]} 또는 {error}
            function solveTriangle(modeIndex, v) {
                var rad = Math.PI / 180, a, b, c, A, B, C, given;
                if (modeIndex === 0) {
                    a = v.a; b = v.b; c = v.c;
                    if (a + b <= c || b + c <= a || c + a <= b) return { error: "삼각형이 되지 않습니다 (두 변의 합이 나머지 한 변보다 커야 함)" };
                    A = Math.acos((b * b + c * c - a * a) / (2 * b * c)) / rad;
                    B = Math.acos((c * c + a * a - b * b) / (2 * c * a)) / rad;
                    C = 180 - A - B;
                    given = [];
                } else if (modeIndex === 1) {
                    b = v.b; c = v.c; A = v.A;
                    a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A * rad));
                    B = Math.acos(Math.max(-1, Math.min(1, (c * c + a * a - b * b) / (2 * c * a)))) / rad;
                    C = 180 - A - B;
                    given = ["A"];
                } else {
                    a = v.a; B = v.B; C = v.C;
                    if (B + C >= 180) return { error: "두 각의 합이 180°보다 작아야 합니다" };
                    A = 180 - B - C;
                    b = a * Math.sin(B * rad) / Math.sin(A * rad);
                    c = a * Math.sin(C * rad) / Math.sin(A * rad);
                    given = ["B", "C"];
                }
                return { a: a, b: b, c: c, A: A, B: B, C: C, given: given };
            }

            function describeTriangle(t) {
                var rad = Math.PI / 180;
                var R = t.a / (2 * Math.sin(t.A * rad));
                var area = t.b * t.c * Math.sin(t.A * rad) / 2;
                return "a = " + trim(t.a) + ", b = " + trim(t.b) + ", c = " + trim(t.c) +
                    ",  A = " + trim(t.A) + "°, B = " + trim(t.B) + "°, C = " + trim(t.C) + "°\n" +
                    "외접원 반지름 R = " + trim(R) + ",  넓이 = " + trim(area);
            }

            // 소수 둘째 자리까지, 끝의 0은 뺀다
            function trim(value) {
                var rounded = Math.round(value * 100) / 100;
                return String(rounded);
            }

            // B(0,0), C(a,0), A 위. 길이는 pt
            function buildTriangle(t, o) {
                var rad = Math.PI / 180, u = o.unit;
                var B = [0, 0], C = [t.a * u, 0], A = [t.c * u * Math.cos(t.B * rad), t.c * u * Math.sin(t.B * rad)];
                var out = { lines: [], circles: [], dots: [], texts: [] };
                out.lines.push({ points: [plain(A), plain(B), plain(C)], closed: true, kind: "main" });
                var centroid = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
                var vertices = [["A", A, t.A, B, C], ["B", B, t.B, C, A], ["C", C, t.C, A, B]];
                for (var i = 0; i < 3; i++) {
                    var name = vertices[i][0], V = vertices[i][1];
                    out.texts.push({ text: name, at: V, dir: unit(sub(V, centroid)), upright: true });
                    var marked = o.angleStyle === 2 || (o.angleStyle === 1 && contains(t.given, name));
                    if (marked) {
                        var span = smallAngle(V, vertices[i][3], vertices[i][4]);
                        out.lines.push({ points: arcPoints(V, o.markRadius, span.start, span.sweep), kind: "mark" });
                        var mid = span.start + span.sweep / 2;
                        out.texts.push({ text: trim(vertices[i][2]) + "°", at: V, dir: [Math.cos(mid), Math.sin(mid)], clear: o.markRadius, upright: true });
                    }
                }
                if (o.sideStyle > 0) {
                    var sides = [["a", t.a, B, C], ["b", t.b, C, A], ["c", t.c, A, B]];   // 반시계 순서의 모서리
                    for (var s = 0; s < 3; s++) {
                        var p = sides[s][2], q = sides[s][3];
                        var outward = unit([q[1] - p[1], -(q[0] - p[0])]);
                        out.texts.push({ text: o.sideStyle === 1 ? sides[s][0] : trim(sides[s][1]), at: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], dir: outward, upright: o.sideStyle === 2 });
                    }
                }
                if (o.circle || o.center) {
                    var R = t.a * u / (2 * Math.sin(t.A * rad));
                    var O = circumcenter(A, B, C);
                    if (o.circle) out.circles.push({ center: O, radius: R });
                    if (o.center) {
                        out.dots.push(O);
                        out.texts.push({ text: "O", at: O, dir: [0, -1], clear: DOT_RADIUS_MM * MM_TO_PT, upright: true });
                        out.lines.push({ points: [plain(O), plain(C)], kind: "guide" });
                        var along = unit(sub(C, O));
                        out.texts.push({ text: "R", at: [(O[0] + C[0]) / 2, (O[1] + C[1]) / 2], dir: [along[1], -along[0]] });
                    }
                }
                return out;
            }

            function circumcenter(A, B, C) {
                var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
                var a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
                return [
                    (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d,
                    (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d
                ];
            }

            // V에서 두 점 쪽 선분 사이의 작은 각: 시작 방향과 반시계 크기(라디안)
            function smallAngle(V, P, Q) {
                var start = Math.atan2(P[1] - V[1], P[0] - V[0]), sweep = Math.atan2(Q[1] - V[1], Q[0] - V[0]) - start;
                while (sweep < 0) sweep += Math.PI * 2;
                if (sweep > Math.PI) {
                    start = Math.atan2(Q[1] - V[1], Q[0] - V[0]);
                    sweep = Math.PI * 2 - sweep;
                }
                return { start: start, sweep: sweep };
            }

            // 3차 베지어 원호 (90°씩 나눈다)
            function arcPoints(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radius;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var a = [center[0] + radius * cos, center[1] + radius * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: a,
                        left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                        right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
                    });
                }
                return points;
            }

            function contains(list, value) {
                for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
                return false;
            }
            function plain(p) { return { anchor: p, left: p, right: p }; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0, -1];
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
                var parts = ["v1", mode, values.a, values.b, values.c, values.A, values.B, values.C, unitMm, sideStyle, angleStyle,
                    showCircle ? "1" : "0", showCenter ? "1" : "0", markMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 18) return;
                mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                values.a = restoreNumber(p[2], values.a, 0.5, 30);
                values.b = restoreNumber(p[3], values.b, 0.5, 30);
                values.c = restoreNumber(p[4], values.c, 0.5, 30);
                values.A = Math.round(restoreNumber(p[5], values.A, 1, 178));
                values.B = Math.round(restoreNumber(p[6], values.B, 1, 178));
                values.C = Math.round(restoreNumber(p[7], values.C, 1, 178));
                unitMm = restoreNumber(p[8], unitMm, 1, 20);
                sideStyle = Math.round(restoreNumber(p[9], sideStyle, 0, SIDE_STYLES.length - 1));
                angleStyle = Math.round(restoreNumber(p[10], angleStyle, 0, ANGLE_STYLES.length - 1));
                showCircle = p[11] === "1";
                showCenter = p[12] === "1";
                markMm = restoreNumber(p[13], markMm, 1, 10);
                fontPt = restoreNumber(p[14], fontPt, 5, 14);
                offsetXmm = restoreNumber(p[15], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[16], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[17] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 수열 ====
    // 수열 그림 세 가지. 수열은 일반항(a_n=2n-1, 2^n, (1/2)^(n-1))이나 나열(1, 3, 7, 15)로 넣는다.
    // - 수열 그래프: 점 (n, aₙ)을 좌표평면에 찍고, 축까지 점선·값 글자·y=f(x) 곡선(점선)을 고른다
    // - 규칙 도형: 성냥개비 정사각형·정삼각형 이어 붙이기, 계단, 점 삼각형, 점 정사각형을 단계별로 늘어놓는다
    // - 계차 도식: 항을 한 줄로 쓰고 이웃한 두 항 아래에 V자로 차(+2, +4 …)를, 필요하면 두 번째 계차까지
    // 선 두께: 축 0.4pt, 도형 0.8pt, 점선 0.3pt, 계차 V선 0.4pt. 선택은 필요 없다.
    function makeSequenceEngine() {
        var api = {label: "수열", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathSequence/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(〈〉, … )
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var THIN_PT = 0.4;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var MODES = ["수열 그래프", "규칙 도형", "계차 도식"];
            var PATTERNS = ["정사각형 이어 붙이기", "정삼각형 이어 붙이기", "계단", "점 삼각형", "점 정사각형"];
            var STAGE_NAMES = ["[1단계]", "〈그림 1〉", "없음"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["guides", "values", "curve", "numbers", "second", "plus", "ellipsis"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var mode = 0;
            var sequenceText = "a_n=2n-1";
            var termCount = 6;
            var cellMm = 8;
            var heightMm = 40;
            var pattern = 0;
            var stageName = 0;
            var stageCount = 3;
            var fontPt = 8;
            var opt = { guides: true, values: false, curve: false, numbers: true, second: false, plus: true, ellipsis: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var sequencePanel = addPanel(win, "수열");
            var modeRow = sequencePanel.add("group");
            modeRow.add("statictext", undefined, "그림:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;
            var inputRow = sequencePanel.add("group");
            inputRow.add("statictext", undefined, "수열:");
            var sequenceInput = inputRow.add("edittext", undefined, sequenceText);
            sequenceInput.preferredSize.width = 300;
            sequenceInput.helpTip = "일반항 a_n=2n-1, 3·2^(n-1), (1/2)^n, n^2+1 또는 나열 1, 3, 7, 15 (쉼표로)";
            var countControls = addValueRow(sequencePanel, "항 수", "", termCount, 2, 20, 1, 0);

            var graphPanel = addPanel(win, "수열 그래프 · 계차 도식");
            var cellControls = addValueRow(graphPanel, "항 간격", "mm", cellMm, 3, 30, 0.5, 1);
            var heightControls = addValueRow(graphPanel, "그래프 높이", "mm", heightMm, 15, 120, 1, 0);
            var graphChecks = graphPanel.add("group");
            var guidesCheck = graphChecks.add("checkbox", undefined, "n축까지 점선");
            bindOption(guidesCheck, "guides");
            var valuesCheck = graphChecks.add("checkbox", undefined, "값 글자");
            bindOption(valuesCheck, "values");
            var curveCheck = graphChecks.add("checkbox", undefined, "y=f(x) 곡선");
            curveCheck.helpTip = "일반항의 n을 실수 x로 본 곡선을 점선으로 겹친다 (일반항일 때만)";
            bindOption(curveCheck, "curve");
            var numbersCheck = graphChecks.add("checkbox", undefined, "눈금 숫자");
            bindOption(numbersCheck, "numbers");
            var diffChecks = graphPanel.add("group");
            var secondCheck = diffChecks.add("checkbox", undefined, "두 번째 계차");
            bindOption(secondCheck, "second");
            var plusCheck = diffChecks.add("checkbox", undefined, "차에 + 붙이기");
            bindOption(plusCheck, "plus");
            var ellipsisCheck = diffChecks.add("checkbox", undefined, "끝에 …");
            bindOption(ellipsisCheck, "ellipsis");

            var patternPanel = addPanel(win, "규칙 도형");
            var patternRow = patternPanel.add("group");
            var patternList = patternRow.add("dropdownlist", undefined, PATTERNS);
            patternList.selection = pattern;
            patternRow.add("statictext", undefined, "이름:");
            var stageNameList = patternRow.add("dropdownlist", undefined, STAGE_NAMES);
            stageNameList.selection = stageName;
            var stageControls = addValueRow(patternPanel, "단계 수", "", stageCount, 1, 6, 1, 0);

            var fontControls = addValueRow(win, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            sequenceInput.onChanging = function() { sequenceText = sequenceInput.text; updatePreview(); };
            bindValueRow(countControls, function(value) { termCount = value; });
            bindValueRow(cellControls, function(value) { cellMm = value; });
            bindValueRow(heightControls, function(value) { heightMm = value; });
            patternList.onChange = function() { pattern = patternList.selection ? patternList.selection.index : 0; updatePreview(); };
            stageNameList.onChange = function() { stageName = stageNameList.selection ? stageNameList.selection.index : 0; updatePreview(); };
            bindValueRow(stageControls, function(value) { stageCount = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 수열을 못 읽으면 확정하지 않는다
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
                var usesSequence = mode !== 1;
                inputRow.enabled = usesSequence;
                countControls.input.parent.enabled = usesSequence;
                graphPanel.enabled = usesSequence;
                heightControls.input.parent.enabled = mode === 0;
                graphChecks.enabled = mode === 0;
                diffChecks.enabled = mode === 2;
                patternPanel.enabled = mode === 1;
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
                var drawing;
                var cell = cellMm * MM_TO_PT;
                if (mode === 1) {
                    drawing = buildPattern(pattern, Math.round(stageCount), cell, stageName);
                } else {
                    var sequence = parseSequence(sequenceText, Math.round(termCount));
                    if (sequence === null) {
                        messageText.text = "수열을 읽지 못함 (예: a_n=2n-1 또는 1, 3, 7, 15)";
                        return;
                    }
                    if (mode === 0) {
                        drawing = buildSequenceGraph(sequence, {
                            cell: cell, height: heightMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, guides: opt.guides, values: opt.values,
                            curve: opt.curve, numbers: opt.numbers
                        });
                    } else {
                        drawing = buildDifferences(sequence.values, { gap: cell, lineGap: fontPt * 1.3, second: opt.second, plus: opt.plus, ellipsis: opt.ellipsis });
                    }
                }
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join(" · ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "수열";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                var bounds = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (bounds[0] + bounds[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (bounds[1] + bounds[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"main"|"guide"|"thin"}
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
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "guide" ? GUIDE_PT : (line.kind === "thin" ? THIN_PT : AXIS_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
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

            // dot: {at, r} (r가 없으면 기본 점)
            function addDot(dot) {
                var r = dot.r || DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.stroked = false;
                circle.filled = true;
                circle.fillColor = makeGray(100);
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다 (dir이 [0,0]이면 가운데).
            // sup/sub: 위·아래첨자 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var marks = [[label.sup, FontBaselineOption.SUPERSCRIPT], [label.sub, FontBaselineOption.SUBSCRIPT]];
                for (var m = 0; m < marks.length; m++) {
                    if (!marks[m][0]) continue;
                    for (var s = 0; s < marks[m][0].length; s++) {
                        var markAttributes = frame.textRange.characters[marks[m][0][s]].characterAttributes;
                        markAttributes.baselinePosition = marks[m][1];
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-sequence.js)
            // -------------------------------------------------------
            // "a_n=2n-1" → {values:[a₁…a_count], fn(일반항)}; "1, 3, 7" → {values, fn: null}. 못 읽으면 null
            function parseSequence(text, count) {
                var s = String(text).replace(/\s/g, "");
                if (s === "") return null;
                if (s.indexOf(",") >= 0) {
                    var parts = s.split(","), values = [];
                    for (var i = 0; i < parts.length; i++) {
                        if (parts[i] === "" || parts[i] === "…" || parts[i] === "...") continue;
                        var fn0 = parts[i].indexOf("n") >= 0 || parts[i].indexOf("x") >= 0 ? null : compileFunction(parts[i]);
                        if (fn0 === null) return null;
                        var v = fn0(0);
                        if (typeof v !== "number" || !isFinite(v)) return null;
                        values.push(v);
                    }
                    return values.length >= 2 ? { values: values, fn: null } : null;
                }
                var fn = compileFunction(sequenceToX(s));
                if (fn === null) return null;
                var list = [];
                for (var n = 1; n <= count; n++) {
                    var value = fn(n);
                    if (typeof value !== "number" || !isFinite(value)) return null;
                    list.push(Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) + 0 : value);   // + 0: -0 → 0
                }
                return { values: list, fn: fn };
            }

            // 일반항의 n을 x로 (sin·ln·tan 속의 n은 그대로). a_n= 앞부분은 compileFunction이 = 앞에서 버린다
            function sequenceToX(s) {
                var out = "";
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    var inName = i >= 2 && (s.substr(i - 2, 3) === "sin" || s.substr(i - 2, 3) === "tan") || i >= 1 && s.substr(i - 1, 2) === "ln";
                    out += ch === "n" && !inName ? "x" : ch;
                }
                return out;
            }

            // 점 (n, aₙ): 가로는 n마다 cell, 세로는 0과 모든 항이 height 안에 드는 눈금(1·2·5 단위)
            function buildSequenceGraph(sequence, o) {
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var values = sequence.values, count = values.length;
                var lo = 0, hi = 0;
                for (var i = 0; i < count; i++) { lo = Math.min(lo, values[i]); hi = Math.max(hi, values[i]); }
                if (hi - lo < 1e-9) hi = lo + 1;
                var step = niceStep((hi - lo) / 5);
                var bottom = Math.floor(lo / step + 1e-9) * step, top = Math.ceil(hi / step - 1e-9) * step;
                var sy = o.height / (top - bottom), u = o.cell;
                var right = (count + 0.8) * u, upper = top * sy + 0.5 * u, lower = bottom * sy - 0.5 * u;

                out.lines.push(straightLine([[-0.5 * u, 0], [right - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straightLine([[0, lower], [0, upper - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, upper], dir: [0, 1] });
                out.texts.push({ text: "n", at: [right, 0], dir: [0, -1] });
                out.texts.push({ text: "an", sub: [1], at: [0, upper], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                var every = count <= 15 ? 1 : 5;
                for (var n = 1; n <= count; n++) {
                    out.lines.push(straightLine([[n * u, -o.tick / 2], [n * u, o.tick / 2]], "axis"));
                    if (o.numbers && (n % every === 0 || every === 1)) out.texts.push({ text: String(n), at: [n * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                }
                for (var t = bottom; t <= top + step * 1e-6; t += step) {
                    var tv = Math.round(t / step) * step;
                    if (Math.abs(tv) < step * 1e-6) continue;
                    out.lines.push(straightLine([[-o.tick / 2, tv * sy], [o.tick / 2, tv * sy]], "axis"));
                    if (o.numbers) out.texts.push({ text: formatValue(tv), at: [0, tv * sy], dir: [-1, 0], clear: o.tick / 2, upright: true });
                }

                if (o.curve && sequence.fn) {
                    var segments = plotFunction(sequence.fn, 1, count, bottom, top);
                    for (var s = 0; s < segments.length; s++) {
                        if (segments[s].length < 2) continue;
                        var bez = toBezier(segments[s], 1);
                        for (var b = 0; b < bez.length; b++) {
                            bez[b] = { anchor: [bez[b].anchor[0] * u, bez[b].anchor[1] * sy], left: [bez[b].left[0] * u, bez[b].left[1] * sy], right: [bez[b].right[0] * u, bez[b].right[1] * sy] };
                        }
                        out.lines.push({ points: bez, kind: "guide" });
                    }
                }
                var sum = 0;
                for (var k = 0; k < count; k++) {
                    var at = [(k + 1) * u, values[k] * sy];
                    sum += values[k];
                    if (o.guides && Math.abs(values[k]) > 1e-9) {
                        out.lines.push(straightLine([at, [at[0], 0]], "guide"));
                    }
                    out.dots.push({ at: at });
                    if (o.values) out.texts.push({ text: formatValue(values[k]), at: at, dir: [0, values[k] < 0 ? -1 : 1], upright: true });
                }
                out.notes.push("a₁ … a" + count + ": " + listText(values));
                out.notes.push("S" + count + " = " + formatValue(sum));
                return out;
            }

            // 계차 도식: 항을 한 줄로, 이웃한 두 항 아래에서 만나는 V선과 그 아래 차. second면 차의 차도
            function buildDifferences(values, o) {
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var row = values.slice(0), depth = o.second ? 2 : 1, y = 0;
                var levels = [row];
                for (var d = 0; d < depth; d++) {
                    var next = [];
                    for (var i = 0; i + 1 < levels[d].length; i++) next.push(levels[d][i + 1] - levels[d][i]);
                    if (next.length === 0) break;
                    levels.push(next);
                }
                var drop = o.lineGap * 1.6;
                for (var level = 0; level < levels.length; level++) {
                    var items = levels[level], offset = level * o.gap / 2;
                    for (var k = 0; k < items.length; k++) {
                        var x = offset + k * o.gap;
                        var text = level > 0 && o.plus && items[k] > 0 ? "+" + formatValue(items[k]) : formatValue(items[k]);
                        out.texts.push({ text: text, at: [x, y], dir: [0, 0], upright: true });
                        if (level > 0) {
                            var topY = y + drop - o.lineGap * 0.55, bottomY = y + o.lineGap * 0.55;
                            out.lines.push(straightLine([[x - o.gap / 2 + o.gap * 0.12, topY], [x, bottomY], [x + o.gap / 2 - o.gap * 0.12, topY]], "thin"));
                        }
                    }
                    if (o.ellipsis) out.texts.push({ text: "…", at: [offset + items.length * o.gap - o.gap * 0.35, y], dir: [0, 0], upright: true });
                    y -= drop;
                }
                out.notes.push("차: " + listText(levels[1] || []));
                if (levels.length > 2) out.notes.push("두 번째 계차: " + listText(levels[2]));
                return out;
            }

            // 단계별 규칙 도형. 단계는 왼쪽부터, 바닥을 맞추고 두 칸 띄운다
            function buildPattern(kind, stages, cell, nameStyle) {
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var x = 0, counts = [];
                for (var k = 1; k <= stages; k++) {
                    var width = patternStage(out, kind, k, x, cell);
                    counts.push(patternCount(kind, k));
                    if (nameStyle < 2) {
                        var name = nameStyle === 0 ? "[" + k + "단계]" : "〈그림 " + k + "〉";
                        out.texts.push({ text: name, at: [x + width / 2, -cell * 0.3], dir: [0, -1], upright: true });
                    }
                    x += width + cell * 2;
                }
                var what = kind <= 1 ? "성냥개비" : (kind === 2 ? "정사각형" : "점");
                out.notes.push(what + ": " + listText(counts) + " → " + patternRule(kind));
                return out;
            }

            // 한 단계를 (x, 0)부터 그리고 폭을 돌려준다
            function patternStage(out, kind, k, x, c) {
                var i, j;
                if (kind === 0) {
                    out.lines.push(straightLine([[x, 0], [x + k * c, 0], [x + k * c, c], [x, c]], "main", true));
                    for (i = 1; i < k; i++) out.lines.push(straightLine([[x + i * c, 0], [x + i * c, c]], "main"));
                    return k * c;
                }
                if (kind === 1) {
                    // 위·아래를 번갈아 k개. 바닥선과 윗선은 한 줄로
                    var h = c * Math.sqrt(3) / 2, half = c / 2;
                    var bottomEnd = x + Math.ceil(k / 2) * c, topStart = x + half, topEnd = x + half + Math.floor(k / 2) * c;
                    out.lines.push(straightLine([[x, 0], [bottomEnd, 0]], "main"));
                    if (k >= 2) out.lines.push(straightLine([[topStart, h], [topEnd, h]], "main"));
                    var zig = [];
                    for (i = 0; i <= k + 1; i++) zig.push([x + i * half, i % 2 === 0 ? 0 : h]);
                    out.lines.push(straightLine(zig, "main"));
                    return (k + 1) * half;
                }
                if (kind === 2) {
                    // 높이 1 … k 기둥 (오른쪽으로 갈수록 높다)
                    var outline = [[x, 0], [x + k * c, 0], [x + k * c, k * c]];
                    for (i = k - 1; i >= 0; i--) {
                        outline.push([x + i * c, (i + 1) * c]);
                        if (i > 0) outline.push([x + i * c, i * c]);
                    }
                    out.lines.push(straightLine(outline, "main", true));
                    for (i = 1; i < k; i++) out.lines.push(straightLine([[x + i * c, 0], [x + i * c, i * c]], "main"));
                    for (j = 1; j < k; j++) out.lines.push(straightLine([[x + (j - 1) * c + c, j * c], [x + k * c, j * c]], "main"));
                    return k * c;
                }
                var r = c * 0.14;
                if (kind === 3) {
                    // 아래 줄 k개, 위로 한 개씩 줄어드는 점 삼각형
                    for (j = 0; j < k; j++) for (i = 0; i < k - j; i++) out.dots.push({ at: [x + r + (i + j / 2) * c * 0.6, r + j * c * 0.52], r: r });
                    return 2 * r + (k - 1) * c * 0.6;
                }
                for (j = 0; j < k; j++) for (i = 0; i < k; i++) out.dots.push({ at: [x + r + i * c * 0.6, r + j * c * 0.6], r: r });
                return 2 * r + (k - 1) * c * 0.6;
            }

            function patternCount(kind, k) {
                if (kind === 0) return 3 * k + 1;
                if (kind === 1) return 2 * k + 1;
                if (kind === 2 || kind === 3) return k * (k + 1) / 2;
                return k * k;
            }

            function patternRule(kind) {
                return ["3n+1", "2n+1", "n(n+1)/2", "n(n+1)/2", "n²"][kind];
            }

            // 1·2·5 × 10^k 중 raw 이상인 가장 작은 값
            function niceStep(raw) {
                var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
                var steps = [1, 2, 5, 10];
                for (var i = 0; i < steps.length; i++) if (steps[i] * mag >= raw - 1e-12) return steps[i] * mag;
                return 10 * mag;
            }

            function listText(values) {
                var parts = [];
                for (var i = 0; i < values.length; i++) parts.push(formatValue(values[i]));
                return parts.join(", ");
            }

            function formatValue(v) {
                var r = Math.round(v * 1000) / 1000;
                return String(r === 0 ? 0 : r);
            }

            function straightLine(anchors, kind, closed) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind, closed: !!closed };
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
                var parts = ["v1", mode, encodeURIComponent(sequenceText), termCount, cellMm, heightMm, pattern, stageName, stageCount, fontPt,
                    flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14 || p[10].length !== FLAG_KEYS.length) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    sequenceText = decodeURIComponent(p[2]);
                    termCount = Math.round(restoreNumber(p[3], termCount, 2, 20));
                    cellMm = restoreNumber(p[4], cellMm, 3, 30);
                    heightMm = restoreNumber(p[5], heightMm, 15, 120);
                    pattern = Math.round(restoreNumber(p[6], pattern, 0, PATTERNS.length - 1));
                    stageName = Math.round(restoreNumber(p[7], stageName, 0, STAGE_NAMES.length - 1));
                    stageCount = Math.round(restoreNumber(p[8], stageCount, 1, 6));
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
})();
