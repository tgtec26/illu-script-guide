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

// 고등학교 공통수학: 이차함수(이차방정식·부등식)·도형의 이동·원과 직선·부등식의 영역·집합(벤다이어그램)·유리함수와 무리함수 그림을 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 고등학교 수학은 과목별 스크립트 다섯 개(공통수학·수학Ⅰ·수학Ⅱ·확률과 통계·기하)로 나뉘어 있고, 탭마다 저장 키는 예전 그대로다.
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighCommon/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeQuadraticEngine(), makeMoveEngine(), makeCircleLineEngine(), makeInequalityEngine(), makeVennEngine(), makeRationalEngine()];

    var win = new Window("dialog", "공통수학");
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

    // ==== 도형의 이동 ====
    // 도형의 이동: 점(A(1,2) B(4,1) C(2,4))으로 준 도형을 평행이동하거나 x축·y축·원점·y=x·y=-x, 점 (a, b), 직선 x=a·y=b에 대하여
    // 대칭이동한 그림을 좌표평면에 그린다. 옮긴 점은 A′, B′ …(프라임은 HancomEQN). 대칭축은 점선과 이름,
    // 대응점은 점선으로 잇고(평행이동은 끝에 작은 화살촉), 좌표 범위는 도형이 들어가게 자동으로 정한다.
    // 선 두께: 축 0.4pt, 도형 0.8pt, 대칭축·대응점 점선 0.3pt. 선택은 필요 없다.
    function makeMoveEngine() {
        var api = {label: "도형의 이동", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathMove/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var SMALL_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 };
            var KINDS = ["평행이동 (a, b)", "x축 대칭", "y축 대칭", "원점 대칭", "y=x 대칭", "y=-x 대칭",
                "점 (a, b) 대칭", "직선 x=a 대칭", "직선 y=b 대칭"];
            var KIND_USES = [[true, true], [false, false], [false, false], [false, false], [false, false], [false, false],
                [true, true], [true, false], [false, true]];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["grid", "numbers", "links", "coords", "dashedOriginal"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var pointsText = "A(1,2) B(4,1) C(2,4)";
            var kind = 4;
            var aValue = 2;
            var bValue = -1;
            var opt = { grid: false, numbers: true, links: true, coords: false, dashedOriginal: false };
            var unitMm = 5;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var shapePanel = addPanel(win, "도형과 이동");
            var pointsRow = shapePanel.add("group");
            pointsRow.add("statictext", undefined, "도형:");
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 300;
            pointsInput.helpTip = "A(1,2) B(4,1) C(2,4)처럼. 점 1개는 점, 2개는 선분, 3개 이상은 다각형. 1/2 같은 분수도 된다";
            var kindRow = shapePanel.add("group");
            kindRow.add("statictext", undefined, "이동:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var aControls = addValueRow(shapePanel, "a", "", aValue, -10, 10, 0.5, 1);
            var bControls = addValueRow(shapePanel, "b", "", bValue, -10, 10, 0.5, 1);
            var messageText = shapePanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var stylePanel = addPanel(win, "표시");
            var checks = {};
            addCheckRow(stylePanel, [["grid", "격자"], ["numbers", "눈금 숫자"], ["links", "대응점 잇기"]]);
            addCheckRow(stylePanel, [["coords", "좌표 함께"], ["dashedOriginal", "원래 도형 점선"]]);
            var unitControls = addValueRow(stylePanel, "단위 길이", "mm", unitMm, 2, 15, 0.5, 1);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 도형을 못 읽으면 확정하지 않는다
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
                aControls.input.parent.enabled = KIND_USES[kind][0];
                bControls.input.parent.enabled = KIND_USES[kind][1];
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
                var parsed = parseShape(pointsText);
                if (parsed === null || parsed.length === 0) {
                    messageText.text = "도형을 읽지 못함 (예: A(1,2) B(4,1))";
                    return;
                }
                messageText.text = " ";
                var drawing = buildMove(parsed, kind, aValue, bValue, {
                    unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, grid: opt.grid, numbers: opt.numbers,
                    links: opt.links, coords: opt.coords, dashedOriginal: opt.dashedOriginal
                });
                previewGroup = layer.groupItems.add();
                previewGroup.name = "도형의 이동";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[[x,y]…], closed, kind:"axis"|"main"|"guide"|"grid"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(line.points);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.dashed) path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양)
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
                frame.contents = label.text;
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

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(′)는 HancomEQN. 점 이름(upright)은 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-move.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // "A(1,2) B(4,1)" → [{name, x, y}]. 괄호 밖 공백·쉼표·세미콜론은 구분자. 못 읽으면 null
            function parseShape(text) {
                var s = String(text), list = [], i = 0;
                while (i < s.length) {
                    var ch = s.charAt(i);
                    if (ch === " " || ch === "," || ch === ";" || ch === "\t") { i++; continue; }
                    var open = s.indexOf("(", i), close = open >= 0 ? s.indexOf(")", open) : -1;
                    if (open < 0 || close < 0) return null;
                    var inner = s.substring(open + 1, close), comma = inner.indexOf(",");
                    if (comma < 0) return null;
                    var x = fraction(inner.substring(0, comma)), y = fraction(inner.substring(comma + 1));
                    if (x === null || y === null) return null;
                    list.push({ name: s.substring(i, open).replace(/\s/g, ""), x: x, y: y });
                    i = close + 1;
                }
                return list;
            }

            // "-3", "2.5", "1/2", "-3/4" (글자 단위로 읽는다)
            function fraction(text) {
                var s = String(text).replace(/\s/g, "").split("−").join("-");
                var slash = s.indexOf("/");
                if (slash >= 0) {
                    var top = fraction(s.substring(0, slash)), bottom = fraction(s.substring(slash + 1));
                    return top === null || bottom === null || bottom === 0 ? null : top / bottom;
                }
                if (s === "" || s === "-") return null;
                var dots = 0;
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "-" && i === 0) continue;
                    if (ch === ".") { dots++; continue; }
                    if (ch < "0" || ch > "9") return null;
                }
                return dots > 1 ? null : parseFloat(s);
            }

            function transformPoint(p, kindIndex, a, b) {
                var x = p[0], y = p[1];
                switch (kindIndex) {
                    case 0: return [x + a, y + b];
                    case 1: return [x, -y];
                    case 2: return [-x, y];
                    case 3: return [-x, -y];
                    case 4: return [y, x];
                    case 5: return [-y, -x];
                    case 6: return [2 * a - x, 2 * b - y];
                    case 7: return [2 * a - x, y];
                    default: return [x, 2 * b - y];
                }
            }

            function buildMove(shape, kindIndex, a, b, o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [] };
                var original = [], moved = [];
                for (var i = 0; i < shape.length; i++) {
                    original.push([shape[i].x, shape[i].y]);
                    moved.push(transformPoint(original[i], kindIndex, a, b));
                }
                // 좌표 범위: 도형·옮긴 도형·원점(·대칭점)이 들어가게, 정수로 한 칸 여유
                var xs = [0], ys = [0];
                for (var k = 0; k < original.length; k++) { xs.push(original[k][0], moved[k][0]); ys.push(original[k][1], moved[k][1]); }
                if (kindIndex === 6) { xs.push(a); ys.push(b); }
                if (kindIndex === 7) xs.push(a);
                if (kindIndex === 8) ys.push(b);
                var xMin = Math.floor(Math.min.apply(null, xs)) - 1, xMax = Math.ceil(Math.max.apply(null, xs)) + 1;
                var yMin = Math.floor(Math.min.apply(null, ys)) - 1, yMax = Math.ceil(Math.max.apply(null, ys)) + 1;
                var right = xMax + 0.6, top = yMax + 0.6;

                if (o.grid) {
                    for (var gx = xMin; gx <= xMax; gx++) if (gx !== 0) out.lines.push({ points: [[gx * u, yMin * u], [gx * u, yMax * u]], kind: "grid" });
                    for (var gy = yMin; gy <= yMax; gy++) if (gy !== 0) out.lines.push({ points: [[xMin * u, gy * u], [xMax * u, gy * u]], kind: "grid" });
                }
                out.lines.push({ points: [[xMin * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], kind: "axis" });
                out.lines.push({ points: [[0, yMin * u], [0, top * u - ARROW.length + ARROW.notch]], kind: "axis" });
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                if (o.numbers) {
                    for (var tx = xMin; tx <= xMax; tx++) {
                        if (tx === 0) continue;
                        out.lines.push({ points: [[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], kind: "axis" });
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = yMin; ty <= yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push({ points: [[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], kind: "axis" });
                        out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 대칭축(점선)과 이름, 대칭점
                var axis = null, axisName = "";
                if (kindIndex === 4) { axis = [[Math.max(xMin, yMin), Math.max(xMin, yMin)], [Math.min(xMax, yMax), Math.min(xMax, yMax)]]; axisName = "y=x"; }
                if (kindIndex === 5) { var lo = Math.max(xMin, -yMax), hi = Math.min(xMax, -yMin); axis = [[lo, -lo], [hi, -hi]]; axisName = "y=-x"; }
                if (kindIndex === 7) { axis = [[a, yMin], [a, yMax]]; axisName = "x=" + formatValue(a); }
                if (kindIndex === 8) { axis = [[xMin, b], [xMax, b]]; axisName = "y=" + formatValue(b); }
                if (axis) {
                    out.lines.push({ points: [[axis[0][0] * u, axis[0][1] * u], [axis[1][0] * u, axis[1][1] * u]], kind: "guide", dashed: true });
                    out.texts.push({ text: axisName, at: [axis[1][0] * u, axis[1][1] * u], dir: kindIndex === 8 ? [1, 0] : [0.7071, 0.7071] });
                }
                if (kindIndex === 6) {
                    out.dots.push([a * u, b * u]);
                    out.texts.push({ text: "(" + formatValue(a) + ", " + formatValue(b) + ")", at: [a * u, b * u], dir: [0.7071, -0.7071], upright: true });
                }

                // 도형과 옮긴 도형
                var closed = original.length >= 3;
                out.lines.push({ points: scale(original, u), closed: closed, kind: "main", dashed: o.dashedOriginal });
                out.lines.push({ points: scale(moved, u), closed: closed, kind: "main" });
                if (original.length === 1) {
                    out.dots.push([original[0][0] * u, original[0][1] * u]);
                    out.dots.push([moved[0][0] * u, moved[0][1] * u]);
                }
                var c0 = centroid(original), c1 = centroid(moved);
                for (var p = 0; p < original.length; p++) {
                    var from = [original[p][0] * u, original[p][1] * u], to = [moved[p][0] * u, moved[p][1] * u];
                    var name = shape[p].name;
                    if (o.links && dist(from, to) > 1e-6) {
                        if (kindIndex === 0) {
                            var along = unit(sub(to, from));
                            out.lines.push({ points: [from, [to[0] - along[0] * SMALL_ARROW.length * 0.9, to[1] - along[1] * SMALL_ARROW.length * 0.9]], kind: "guide", dashed: true });
                            out.arrows.push({ tip: to, dir: along, small: true });
                        } else {
                            out.lines.push({ points: [from, to], kind: "guide", dashed: true });
                        }
                    }
                    if (name) {
                        var t0 = name + (o.coords ? "(" + formatValue(original[p][0]) + ", " + formatValue(original[p][1]) + ")" : "");
                        var t1 = name + "′" + (o.coords ? "(" + formatValue(moved[p][0]) + ", " + formatValue(moved[p][1]) + ")" : "");
                        out.texts.push({ text: t0, at: from, dir: labelDir(original[p], c0, original.length), upright: true });
                        out.texts.push({ text: t1, at: to, dir: labelDir(moved[p], c1, moved.length), upright: true });
                    }
                }
                return out;
            }

            // 다각형이면 무게중심에서 멀어지는 쪽, 점·선분이면 오른쪽 위
            function labelDir(p, center, count) {
                if (count < 3) return [0.7071, 0.7071];
                return unit(sub(p, center));
            }

            function centroid(points) {
                var x = 0, y = 0;
                for (var i = 0; i < points.length; i++) { x += points[i][0]; y += points[i][1]; }
                return [x / points.length, y / points.length];
            }

            function formatValue(v) {
                return String(Math.round(v * 100) / 100);
            }

            function scale(points, u) {
                var out = [];
                for (var i = 0; i < points.length; i++) out.push([points[i][0] * u, points[i][1] * u]);
                return out;
            }

            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
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
                var parts = ["v1", encodeURIComponent(pointsText), kind, aValue, bValue, flags, unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 11 || p[5].length !== FLAG_KEYS.length) return;
                try {
                    pointsText = decodeURIComponent(p[1]);
                    kind = Math.round(restoreNumber(p[2], kind, 0, KINDS.length - 1));
                    aValue = restoreNumber(p[3], aValue, -10, 10);
                    bValue = restoreNumber(p[4], bValue, -10, 10);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[5].charAt(i) === "1";
                    unitMm = restoreNumber(p[6], unitMm, 2, 15);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[10] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 원과 직선 ====
    // 원과 직선의 방정식: 원 (x-a)²+(y-b)²=r², 직선(y=2x+1, x=3, 2x+y-4=0), 점 P를 좌표평면에 그린다.
    // 원과 직선의 교점(A, B 또는 접점 T)과 위치 관계, 중심에서 직선까지 거리 d(수선의 발 H·직각 표시),
    // 점 P에서 원에 그은 두 접선(접점 T₁, T₂), 점 P와 직선 사이 거리를 고른다. 값과 식은 창에 보여 준다.
    // 좌표 범위는 원·점이 들어가게 자동으로 정한다. 선 두께: 축 0.4pt, 원·직선·접선 0.8pt, 점선·직각 표시 0.3pt.
    function makeCircleLineEngine() {
        var api = {label: "원과 직선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathCircleLine/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(√ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var RIGHT_MARK_MM = 1.5;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var KAPPA = 0.5522847498;   // 원을 베지어 4개로
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["circle", "radius", "crossings", "centerDistance", "tangents", "pointDistance", "equations", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var centerX = 1, centerY = 1, radius = 2;
            var lineText = "y=x+2";
            var pointText = "P(4,3)";
            var opt = { circle: true, radius: true, crossings: true, centerDistance: true, tangents: false, pointDistance: false,
                equations: true, grid: false, numbers: true };
            var unitMm = 6;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var circlePanel = addPanel(win, "원 (x-a)²+(y-b)²=r²");
            addCheckRow(circlePanel, [["circle", "원"], ["radius", "중심·반지름"]]);
            var aControls = addValueRow(circlePanel, "중심 a", "", centerX, -10, 10, 0.5, 1);
            var bControls = addValueRow(circlePanel, "중심 b", "", centerY, -10, 10, 0.5, 1);
            var rControls = addValueRow(circlePanel, "반지름 r", "", radius, 0.5, 10, 0.5, 1);

            var linePanel = addPanel(win, "직선 · 점");
            var lineRow = linePanel.add("group");
            lineRow.add("statictext", undefined, "직선:").preferredSize.width = 36;
            var lineInput = lineRow.add("edittext", undefined, lineText);
            lineInput.preferredSize.width = 300;
            lineInput.helpTip = "y=2x+1, x=3, 2x+y-4=0, y=-1/2x+3. 비우면 직선을 그리지 않는다";
            var pointRow = linePanel.add("group");
            pointRow.add("statictext", undefined, "점:").preferredSize.width = 36;
            var pointInput = pointRow.add("edittext", undefined, pointText);
            pointInput.preferredSize.width = 300;
            pointInput.helpTip = "P(4,3)처럼 하나. 1/2, √2도 된다. 비우면 점을 그리지 않는다";
            addCheckRow(linePanel, [["crossings", "원과 직선의 교점"], ["centerDistance", "중심과 직선 거리"], ["equations", "식 글자"]]);
            addCheckRow(linePanel, [["tangents", "P에서 그은 접선"], ["pointDistance", "P와 직선 거리"]]);

            var planePanel = addPanel(win, "좌표평면");
            var unitControls = addValueRow(planePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(planePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(planePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            bindValueRow(aControls, function(value) { centerX = value; });
            bindValueRow(bControls, function(value) { centerY = value; });
            bindValueRow(rControls, function(value) { radius = value; });
            lineInput.onChanging = function() { lineText = lineInput.text; updatePreview(); };
            pointInput.onChanging = function() { pointText = pointInput.text; updatePreview(); };
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
                var problems = [];
                var line = null, point = null;
                if (String(lineText).replace(/\s/g, "") !== "") {
                    line = parseLine(lineText);
                    if (line === null) problems.push("직선을 읽지 못함 (예: y=2x+1, x=3, 2x+y-4=0)");
                }
                if (String(pointText).replace(/\s/g, "") !== "") {
                    point = parsePoint(pointText);
                    if (point === null) problems.push("점을 읽지 못함 (예: P(4,3))");
                }
                var drawing = buildCircleLine({
                    center: [centerX, centerY], r: radius, line: line, point: point, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    mark: RIGHT_MARK_MM * MM_TO_PT, circle: opt.circle, radius: opt.radius, crossings: opt.crossings,
                    centerDistance: opt.centerDistance, tangents: opt.tangents, pointDistance: opt.pointDistance,
                    equations: opt.equations, grid: opt.grid, numbers: opt.numbers
                });
                var notes = problems.concat(drawing.notes);
                messageText.text = notes.length > 0 ? notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "원과 직선";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"main"|"guide"|"mark"|"grid"}
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
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup/sub: 위·아래첨자 글자 위치
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
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(√)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-circle-line.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function buildCircleLine(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var C = o.center, r = o.r, L = o.line, P = o.point ? [o.point.x, o.point.y] : null;
                function S(p) { return [p[0] * u, p[1] * u]; }

                // 좌표 범위: 원·점·원점이 들어가게, 정수로 한 칸 여유
                var xs = [0], ys = [0];
                if (o.circle) { xs.push(C[0] - r, C[0] + r); ys.push(C[1] - r, C[1] + r); }
                if (P) { xs.push(P[0]); ys.push(P[1]); }
                var xMin = Math.floor(Math.min.apply(null, xs)) - 1, xMax = Math.ceil(Math.max.apply(null, xs)) + 1;
                var yMin = Math.floor(Math.min.apply(null, ys)) - 1, yMax = Math.ceil(Math.max.apply(null, ys)) + 1;
                var box = [xMin, xMax, yMin, yMax];
                var right = xMax + 0.6, top = yMax + 0.6;

                if (o.grid) {
                    for (var gx = xMin; gx <= xMax; gx++) if (gx !== 0) out.lines.push(straight([[gx * u, yMin * u], [gx * u, yMax * u]], "grid"));
                    for (var gy = yMin; gy <= yMax; gy++) if (gy !== 0) out.lines.push(straight([[xMin * u, gy * u], [xMax * u, gy * u]], "grid"));
                }
                out.lines.push(straight([[xMin * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                out.lines.push(straight([[0, yMin * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                out.arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top * u], dir: [0, 1] });
                out.texts.push({ text: "x", at: [right * u, 0], dir: [0, -1] });
                out.texts.push({ text: "y", at: [0, top * u], dir: [-1, 0] });
                out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                if (o.numbers) {
                    for (var tx = xMin; tx <= xMax; tx++) {
                        if (tx === 0) continue;
                        out.lines.push(straight([[tx * u, -o.tick / 2], [tx * u, o.tick / 2]], "axis"));
                        out.texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: o.tick / 2, upright: true });
                    }
                    for (var ty = yMin; ty <= yMax; ty++) {
                        if (ty === 0) continue;
                        out.lines.push(straight([[-o.tick / 2, ty * u], [o.tick / 2, ty * u]], "axis"));
                        out.texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: o.tick / 2, upright: true });
                    }
                }

                // 원, 중심, 반지름(오른쪽 위 45°)
                if (o.circle) {
                    out.lines.push({ points: circlePoints(S(C), r * u), closed: true, kind: "main" });
                    if (o.radius) {
                        out.dots.push(S(C));
                        out.texts.push({ text: "C", at: S(C), dir: [-0.7071, -0.7071], upright: true });
                        var rim = [C[0] + r * 0.7071, C[1] + r * 0.7071];
                        out.lines.push(straight([S(C), S(rim)], "main"));
                        out.texts.push({ text: "r", at: S([(C[0] + rim[0]) / 2, (C[1] + rim[1]) / 2]), dir: [-0.7071, 0.7071] });
                    }
                    if (o.equations) {
                        var eq = circleEquation(C, r);
                        out.texts.push({ text: eq.text, sup: eq.sup, at: S([C[0] - r * 0.7071, C[1] + r * 0.7071]), dir: [-0.7071, 0.7071] });
                    }
                }

                // 직선
                if (L) {
                    var seg = clipLine(L, box);
                    if (seg !== null) {
                        out.lines.push(straight([S(seg[0]), S(seg[1])], "main"));
                        if (o.equations) {
                            var end = seg[1][1] >= seg[0][1] ? seg[1] : seg[0];
                            out.texts.push({ text: lineEquation(L), at: S(end), dir: [0.7071, 0.7071] });
                        }
                    }
                    if (o.circle) {
                        var H = footOn(L, C), d = distanceTo(L, C);
                        var relation = d < r - 1e-9 ? "두 점에서 만남" : (d <= r + 1e-9 ? "접함" : "만나지 않음");
                        out.notes.push("중심과 직선 거리 d = " + formatValue(d) + ", r = " + formatValue(r) + " → " + relation);
                        if (o.centerDistance && d > 1e-9) {
                            out.lines.push(straight([S(C), S(H)], "guide"));
                            addRightMark(out, H, L, C, u, o.mark);
                            out.texts.push({ text: "H", at: S(H), dir: awayFrom(H, C), upright: true });
                            out.texts.push({ text: "d", at: S([(C[0] + H[0]) / 2, (C[1] + H[1]) / 2]), dir: perpendicular(sub(H, C)) });
                        }
                        if (o.crossings) {
                            var points = crossings(L, C, r);
                            var names = points.length === 1 ? ["T"] : ["A", "B"];
                            for (var k = 0; k < points.length; k++) {
                                out.dots.push(S(points[k]));
                                out.texts.push({ text: names[k], at: S(points[k]), dir: awayFrom(points[k], C), upright: true });
                            }
                            if (points.length > 0) out.notes.push("교점 " + pointList(points, names));
                        }
                    }
                }

                // 점 P, P에서 그은 접선, P와 직선 거리
                if (P) {
                    out.dots.push(S(P));
                    out.texts.push({ text: o.point.name || "P", at: S(P), dir: o.circle ? awayFrom(P, C) : [0.7071, 0.7071], upright: true });
                    if (o.tangents && o.circle) {
                        var touch = tangentPoints(P, C, r);
                        if (touch === null) out.notes.push("P가 원 안에 있어 접선을 그을 수 없음");
                        else {
                            var eqs = [];
                            for (var tp = 0; tp < touch.length; tp++) {
                                var tangent = touch.length === 1 ? lineThrough(P, [P[0] - (P[1] - C[1]), P[1] + (P[0] - C[0])]) : lineThrough(P, touch[tp]);
                                var tseg = clipLine(tangent, box);
                                if (tseg !== null) out.lines.push(straight([S(tseg[0]), S(tseg[1])], "main"));
                                eqs.push(lineEquation(tangent));
                                if (touch.length === 2) {
                                    out.dots.push(S(touch[tp]));
                                    out.texts.push({ text: "T" + (tp + 1), sub: [1], at: S(touch[tp]), dir: awayFrom(touch[tp], C), upright: true });
                                }
                            }
                            out.notes.push("접선 " + eqs.join(", "));
                        }
                    }
                    if (o.pointDistance && L) {
                        var F = footOn(L, P), pd = distanceTo(L, P);
                        out.notes.push("P와 직선 거리 = " + formatValue(pd));
                        if (pd > 1e-9) {
                            out.lines.push(straight([S(P), S(F)], "guide"));
                            addRightMark(out, F, L, P, u, o.mark);
                        }
                    }
                }
                return out;
            }

            // 발 F에서 직선 방향과 점 쪽 방향으로 한 변 size인 직각 표시
            function addRightMark(out, F, L, toward, u, size) {
                var along = unit([-L.b, L.a]), up = unit(sub(toward, F));
                var p = [F[0] * u, F[1] * u];
                out.lines.push(straight([
                    [p[0] + along[0] * size, p[1] + along[1] * size],
                    [p[0] + (along[0] + up[0]) * size, p[1] + (along[1] + up[1]) * size],
                    [p[0] + up[0] * size, p[1] + up[1] * size]
                ], "mark"));
            }

            // "y=2x+1", "x=3", "2x+y-4=0" → {a, b, c} (ax+by+c=0, a²+b²=1로 맞춘다). 일차식이 아니면 null
            function parseLine(text) {
                var s = String(text).replace(/\s/g, "");
                var eq = s.indexOf("=");
                if (eq <= 0 || eq === s.length - 1 || s.indexOf("=", eq + 1) >= 0) return null;
                var left = side(s.substring(0, eq)), right = side(s.substring(eq + 1));
                if (left === null || right === null) return null;
                function L(x, y) { return left(x, y) - right(x, y); }
                var c = L(0, 0), a = L(1, 0) - c, b = L(0, 1) - c;
                if (!isFinite(a) || !isFinite(b) || !isFinite(c)) return null;
                var tests = [[2, 3], [-1.5, 0.5], [4, -2]];
                for (var i = 0; i < tests.length; i++) {
                    var expect = a * tests[i][0] + b * tests[i][1] + c;
                    if (Math.abs(L(tests[i][0], tests[i][1]) - expect) > 1e-9 * (1 + Math.abs(expect))) return null;
                }
                var n = Math.sqrt(a * a + b * b);
                if (n < 1e-12) return null;
                return { a: a / n, b: b / n, c: c / n };
                // 한쪽 식을 (x, y)의 함수로. y는 괄호로 감싼 수로 바꿔 x의 식으로 읽는다
                function side(expr) {
                    var cache = {};
                    return function(x, y) {
                        var key = String(y);
                        if (!(key in cache)) cache[key] = compileFunction(expr.split("y").join("(" + (y < 0 ? "0" + y : y) + ")"));
                        if (cache[key] === null) return NaN;
                        return cache[key](x);
                    };
                }
            }

            // "P(4,3)" → {name, x, y}. 좌표는 1/2, √2도 된다
            function parsePoint(text) {
                var s = String(text).replace(/\s/g, "");
                var open = s.indexOf("("), close = s.lastIndexOf(")"), comma = s.indexOf(",", open);
                if (open < 0 || close < comma || comma < 0) return null;
                var fx = compileFunction(s.substring(open + 1, comma)), fy = compileFunction(s.substring(comma + 1, close));
                if (fx === null || fy === null || s.substring(open + 1, close).indexOf("x") >= 0) return null;
                var x = fx(0), y = fy(0);
                if (!isFinite(x) || !isFinite(y)) return null;
                return { name: s.substring(0, open), x: x, y: y };
            }

            function distanceTo(L, p) { return Math.abs(L.a * p[0] + L.b * p[1] + L.c); }
            function footOn(L, p) {
                var t = L.a * p[0] + L.b * p[1] + L.c;
                return [p[0] - L.a * t, p[1] - L.b * t];
            }

            // 원과 직선의 교점 (x 순서). 접하면 하나
            function crossings(L, C, r) {
                var d = distanceTo(L, C), H = footOn(L, C);
                if (d > r + 1e-9) return [];
                if (d >= r - 1e-9) return [H];
                var h = Math.sqrt(r * r - d * d), dir = [-L.b, L.a];
                var p = [H[0] + dir[0] * h, H[1] + dir[1] * h], q = [H[0] - dir[0] * h, H[1] - dir[1] * h];
                return p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) ? [p, q] : [q, p];
            }

            // P에서 원에 그은 접선의 접점 두 개. P가 원 위면 [P], 안이면 null
            function tangentPoints(P, C, r) {
                var v = sub(P, C), dist = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                if (dist < r - 1e-9) return null;
                if (dist <= r + 1e-9) return [P];
                var base = Math.atan2(v[1], v[0]), spread = Math.acos(r / dist);
                return [[C[0] + r * Math.cos(base + spread), C[1] + r * Math.sin(base + spread)],
                    [C[0] + r * Math.cos(base - spread), C[1] + r * Math.sin(base - spread)]];
            }

            function lineThrough(p, q) {
                var a = q[1] - p[1], b = p[0] - q[0], n = Math.sqrt(a * a + b * b);
                return { a: a / n, b: b / n, c: -(a * p[0] + b * p[1]) / n };
            }

            // 직선이 [x0,x1]×[y0,y1] 안에 드는 선분 (Liang–Barsky). 안 지나면 null
            function clipLine(L, box) {
                var p0 = [-L.a * L.c, -L.b * L.c], d = [-L.b, L.a];
                var t0 = -1e6, t1 = 1e6;
                var checks = [[-d[0], p0[0] - box[0]], [d[0], box[1] - p0[0]], [-d[1], p0[1] - box[2]], [d[1], box[3] - p0[1]]];
                for (var i = 0; i < checks.length; i++) {
                    var pk = checks[i][0], qk = checks[i][1];
                    if (Math.abs(pk) < 1e-12) {
                        if (qk < 0) return null;
                        continue;
                    }
                    var t = qk / pk;
                    if (pk < 0) t0 = Math.max(t0, t);
                    else t1 = Math.min(t1, t);
                }
                if (t1 - t0 < 1e-9) return null;
                var a = [p0[0] + d[0] * t0, p0[1] + d[1] * t0], b = [p0[0] + d[0] * t1, p0[1] + d[1] * t1];
                return a[0] < b[0] || (Math.abs(a[0] - b[0]) < 1e-12 && a[1] < b[1]) ? [a, b] : [b, a];
            }

            // y = 2x + 1, y = -x/2 … 대신 소수 둘째 자리 (y = -0.5x + 3), 세로선은 x = 3
            function lineEquation(L) {
                if (Math.abs(L.b) < 1e-12) return "x=" + formatValue(-L.c / L.a);
                var m = -L.a / L.b, k = -L.c / L.b;
                var mText = formatValue(m), kText = formatValue(Math.abs(k));
                if (mText === "0") return "y=" + formatValue(k);
                var text = "y=" + (mText === "1" ? "" : (mText === "-1" ? "-" : mText)) + "x";
                if (kText !== "0") text += (k < 0 ? "-" : "+") + kText;
                return text;
            }

            // (x-1)²+(y+2)²=4 (²는 위첨자 2)
            function circleEquation(C, r) {
                var text = "", sup = [];
                function square(name, center) {
                    if (Math.abs(center) < 1e-12) text += name;
                    else text += "(" + name + (center > 0 ? "-" : "+") + formatValue(Math.abs(center)) + ")";
                    sup.push(text.length);
                    text += "2";
                }
                square("x", C[0]);
                text += "+";
                square("y", C[1]);
                text += "=" + formatValue(r * r);
                return { text: text, sup: sup };
            }

            function pointList(points, names) {
                var parts = [];
                for (var i = 0; i < points.length; i++) parts.push(names[i] + "(" + formatValue(points[i][0]) + ", " + formatValue(points[i][1]) + ")");
                return parts.join(", ");
            }

            // 중심 (cx, cy), 반지름 r인 원: 오른쪽에서 시작해 반시계로 앵커 4개
            function circlePoints(c, r) {
                var h = r * KAPPA, out = [];
                var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                for (var i = 0; i < 4; i++) {
                    var d = dirs[i], t = [-d[1], d[0]];
                    var anchor = [c[0] + d[0] * r, c[1] + d[1] * r];
                    out.push({ anchor: anchor, left: [anchor[0] - t[0] * h, anchor[1] - t[1] * h], right: [anchor[0] + t[0] * h, anchor[1] + t[1] * h] });
                }
                return out;
            }

            function awayFrom(p, center) {
                var v = sub(p, center);
                return Math.abs(v[0]) + Math.abs(v[1]) < 1e-9 ? [0.7071, 0.7071] : unit(v);
            }

            function perpendicular(v) {
                var n = unit([-v[1], v[0]]);
                return n[1] < 0 ? [-n[0], -n[1]] : n;
            }

            function formatValue(v) {
                var r = Math.round(v * 100) / 100;
                return String(r === 0 ? 0 : r);
            }

            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
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
                var parts = ["v1", centerX, centerY, radius, encodeURIComponent(lineText), encodeURIComponent(pointText), flags,
                    unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 12 || p[6].length !== FLAG_KEYS.length) return;
                try {
                    centerX = restoreNumber(p[1], centerX, -10, 10);
                    centerY = restoreNumber(p[2], centerY, -10, 10);
                    radius = restoreNumber(p[3], radius, 0.5, 10);
                    lineText = decodeURIComponent(p[4]);
                    pointText = decodeURIComponent(p[5]);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[6].charAt(i) === "1";
                    unitMm = restoreNumber(p[7], unitMm, 2, 20);
                    fontPt = restoreNumber(p[8], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[11] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 부등식의 영역 ====
    // 부등식의 영역: 부등식 3개까지(y>2x+1, y<=-x^2+4, x^2+y^2<=4, 2x+3y<6, x>1)를 모두 만족하는 영역을 칠한다.
    // 경계선은 등호가 있으면(≤, ≥) 실선, 없으면(<, >) 점선 (교과서 규칙). 식 글자를 경계선 끝에 붙일 수 있다.
    // 읽는 꼴: y ⋚ f(x) (곡선), 일차식(직선), x ⋚ c (세로선), x²·y² 계수가 같은 이차식(원). 그 밖의 식은 알려 준다.
    // 칠하기는 가로로 촘촘히 나눈 x마다 모든 부등식을 만족하는 y 구간을 정확히 구해 위·아래 끝을 이은 면으로 만든다
    // (패스파인더를 쓰지 않는다). 선 두께: 축 0.4pt, 경계 0.8pt(점선 포함). 선택은 필요 없다.
    function makeInequalityEngine() {
        var api = {label: "부등식 영역", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathInequality/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var INEQUALITY_COUNT = 3;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(≤, ≥)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var BOUNDARY_PT = 0.8;
            var GRID_K = 30;
            var BOUNDARY_DASH = [3, 2];
            var TICK_MM = 1.2;
            var LABEL_GAP_MM = 0.8;
            var COLUMNS = 240;   // 칠하기 가로 나눔
            var KAPPA = 0.5522847498;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["shade", "formulas", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var texts = ["y<=-x^2+4", "y>=x", ""];
            var xMin = -3, xMax = 3, yMin = -3, yMax = 5;
            var unitMm = 6;
            var shadeK = 20;
            var fontPt = 8;
            var opt = { shade: true, formulas: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var inequalityPanel = addPanel(win, "부등식 (모두 만족하는 영역)");
            var inputs = [];
            for (var q = 0; q < INEQUALITY_COUNT; q++) {
                var row = inequalityPanel.add("group");
                row.add("statictext", undefined, (q + 1) + ":").preferredSize.width = 20;
                var input = row.add("edittext", undefined, texts[q]);
                input.preferredSize.width = 320;
                input.helpTip = "y>2x+1, y<=-x^2+4, x^2+y^2<=4, (x-1)^2+y^2>1, 2x+3y<6, x>1. <=는 ≤, >=는 ≥";
                inputs.push(input);
            }
            addCheckRow(inequalityPanel, [["shade", "영역 칠하기"], ["formulas", "식 글자"]]);
            var shadeControls = addValueRow(inequalityPanel, "음영", "K", shadeK, 5, 60, 5, 0);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            for (var bi = 0; bi < INEQUALITY_COUNT; bi++) bindInput(bi);
            bindValueRow(shadeControls, function(value) { shadeK = value; });
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

            function bindInput(index) {
                inputs[index].onChanging = function() { texts[index] = inputs[index].text; updatePreview(); };
            }

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
                var list = [], problems = [];
                for (var i = 0; i < INEQUALITY_COUNT; i++) {
                    if (String(texts[i]).replace(/\s/g, "") === "") continue;
                    var parsed = parseInequality(texts[i]);
                    if (parsed === null) problems.push((i + 1) + "번을 읽지 못함");
                    else list.push(parsed);
                }
                var drawing = buildInequality({
                    list: list, xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    shade: opt.shade, shadeK: shadeK, formulas: opt.formulas, grid: opt.grid, numbers: opt.numbers, fontSize: fontPt
                });
                var notes = problems.concat(drawing.notes);
                messageText.text = notes.length > 0 ? notes.join(" · ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "부등식의 영역";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var l = 0; l < drawing.lines.length; l++) addPath(drawing.lines[l]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // 칠한 영역: {points:[[x,y]…], k}
            function addFill(fill) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(fill.points);
                path.closed = true;
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(fill.k);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"boundary"|"grid", dashed}
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
                path.strokeColor = makeGray(line.kind === "grid" ? GRID_K : 100);
                path.strokeWidth = line.kind === "boundary" ? BOUNDARY_PT : AXIS_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.dashed) path.strokeDashes = BOUNDARY_DASH;
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
            // GSMediumB1에 없는 기호(≤, ≥)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-inequality.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 부등식 하나 → {text, strict, kind, …}
            //   kind "above"/"below": y > f(x) / y < f(x) (fn)
            //   kind "right"/"left":  x > c / x < c (c)
            //   kind "inside"/"outside": 원 (cx, cy, r)
            // 일차식 ax+by+c ⋚ 0은 b ≠ 0이면 above/below, b = 0이면 right/left로 바꾼다. 못 읽으면 null
            function parseInequality(text) {
                var s = String(text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=").split("=<").join("<=").split("=>").join(">=");
                var at = -1, op = "";
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "<" || ch === ">") { at = i; op = s.charAt(i + 1) === "=" ? ch + "=" : ch; break; }
                }
                if (at <= 0 || at + op.length >= s.length) return null;
                var left = s.substring(0, at), right = s.substring(at + op.length);
                if (left.indexOf("<") >= 0 || left.indexOf(">") >= 0 || right.indexOf("<") >= 0 || right.indexOf(">") >= 0) return null;
                var greater = op.charAt(0) === ">", strict = op.length === 1;
                var result = { text: text, strict: strict };
                // y ⋚ f(x), f(x) ⋚ y
                if ((left === "y" || right === "y") && (left === "y" ? right : left).indexOf("y") < 0) {
                    var other = left === "y" ? right : left;
                    var fn = compileFunction(other);
                    if (fn === null) return null;
                    var yGreater = left === "y" ? greater : !greater;
                    result.kind = yGreater ? "above" : "below";
                    result.fn = fn;
                    result.label = "y" + (yGreater ? ">" : "<") + other;
                    return result;
                }
                // 나머지는 G(x, y) = left - right ⋚ 0
                function G(x, y) { return evalSide(left, x, y) - evalSide(right, x, y); }
                var g00 = G(0, 0), g10 = G(1, 0), gm10 = G(-1, 0), g01 = G(0, 1), g0m1 = G(0, -1), g11 = G(1, 1);
                if (isNaN(g00) || isNaN(g10) || isNaN(gm10) || isNaN(g01) || isNaN(g0m1) || isNaN(g11)) return null;
                var k = (g10 + gm10 - 2 * g00) / 2, ky = (g01 + g0m1 - 2 * g00) / 2;
                var D = (g10 - gm10) / 2, E = (g01 - g0m1) / 2, F = g00;
                if (Math.abs(k - ky) > 1e-9 || Math.abs(g11 - (k * 2 + D + E + F)) > 1e-9) return null;
                // 다른 점에서도 맞는지 (x³ 같은 식 걸러내기)
                var probes = [[2, -3], [-1.5, 2.5], [3, 1]];
                for (var p = 0; p < probes.length; p++) {
                    var px = probes[p][0], py = probes[p][1], want = k * (px * px + py * py) + D * px + E * py + F;
                    if (Math.abs(G(px, py) - want) > 1e-7 * (1 + Math.abs(want))) return null;
                }
                if (Math.abs(k) < 1e-12) {
                    if (Math.abs(D) < 1e-12 && Math.abs(E) < 1e-12) return null;
                    if (Math.abs(E) < 1e-12) {
                        // D x + F ⋚ 0 → x ⋚ -F/D
                        result.c = -F / D;
                        result.kind = (greater === (D > 0)) ? "right" : "left";
                        return result;
                    }
                    // D x + E y + F ⋚ 0 → y ⋚ (-D x - F)/E
                    var slope = -D / E, cut = -F / E;
                    result.kind = (greater === (E > 0)) ? "above" : "below";
                    result.fn = function(x) { return slope * x + cut; };
                    result.line = { slope: slope, cut: cut };
                    return result;
                }
                // k(x² + y²) + D x + E y + F ⋚ 0 → 원
                var cx = -D / (2 * k) + 0, cy = -E / (2 * k) + 0, r2 = cx * cx + cy * cy - F / k;   // + 0: -0 → 0
                if (!(r2 > 1e-12)) return null;
                result.cx = cx;
                result.cy = cy;
                result.r = Math.sqrt(r2);
                result.kind = (greater === (k > 0)) ? "outside" : "inside";
                return result;
            }

            // 한쪽 식의 (x, y) 값. y는 괄호로 감싼 수로 바꿔 x의 식으로 읽는다
            function evalSide(expr, x, y) {
                if (expr.indexOf("y") < 0) {
                    var fx = compileFunction(expr);
                    return fx === null ? NaN : fx(x);
                }
                var fn = compileFunction(expr.split("y").join("(" + (y < 0 ? "0" + y : y) + ")"));
                return fn === null ? NaN : fn(x);
            }

            // x에서 부등식 하나를 만족하는 y 구간들 [[lo, hi]…] (등호 여부는 칠하기에서 무시한다)
            function intervalsAt(ineq, x) {
                var INF = 1e9;
                if (ineq.kind === "above" || ineq.kind === "below") {
                    var y;
                    try { y = ineq.fn(x); } catch (e) { return []; }
                    if (typeof y !== "number" || !isFinite(y)) return [];
                    return ineq.kind === "above" ? [[y, INF]] : [[-INF, y]];
                }
                if (ineq.kind === "right" || ineq.kind === "left") {
                    return (ineq.kind === "right" ? x > ineq.c : x < ineq.c) ? [[-INF, INF]] : [];
                }
                var dx = x - ineq.cx, h2 = ineq.r * ineq.r - dx * dx;
                if (h2 <= 0) return ineq.kind === "inside" ? [] : [[-INF, INF]];
                var h = Math.sqrt(h2);
                return ineq.kind === "inside" ? [[ineq.cy - h, ineq.cy + h]] : [[-INF, ineq.cy - h], [ineq.cy + h, INF]];
            }

            function intersectIntervals(a, b) {
                var out = [];
                for (var i = 0; i < a.length; i++) {
                    for (var j = 0; j < b.length; j++) {
                        var lo = Math.max(a[i][0], b[j][0]), hi = Math.min(a[i][1], b[j][1]);
                        if (hi > lo) out.push([lo, hi]);
                    }
                }
                out.sort(function(p, q) { return p[0] - q[0]; });
                return out;
            }

            // 영역을 면들로: x마다 구간을 구하고, 구간 수가 같은 동안 위·아래 끝을 이어 한 면으로. 반환 [[[x,y]…]…] (좌표 단위)
            function regionPolygons(list, x0, x1, y0, y1, columns) {
                var polygons = [], open = null;
                function close() {
                    if (open === null) return;
                    for (var i = 0; i < open.length; i++) {
                        var poly = open[i];
                        if (poly.upper.length >= 2) polygons.push(poly.lower.concat(poly.upper.reverse()));
                    }
                    open = null;
                }
                for (var c = 0; c <= columns; c++) {
                    var x = x0 + (x1 - x0) * c / columns;
                    var spans = [[y0, y1]];
                    for (var k = 0; k < list.length; k++) spans = intersectIntervals(spans, intervalsAt(list[k], x));
                    if (open !== null && open.length !== spans.length) close();
                    if (spans.length === 0) continue;
                    if (open === null) {
                        open = [];
                        for (var s = 0; s < spans.length; s++) open.push({ lower: [], upper: [] });
                    }
                    for (var t = 0; t < spans.length; t++) {
                        open[t].lower.push([x, spans[t][0]]);
                        open[t].upper.push([x, spans[t][1]]);
                    }
                }
                close();
                return polygons;
            }

            function buildInequality(o) {
                var u = o.unit;
                var out = { fills: [], lines: [], arrows: [], texts: [], notes: [] };
                var box = [o.xMin, o.xMax, o.yMin, o.yMax];

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

                // 영역
                if (o.list.length > 0 && o.shade) {
                    var polygons = regionPolygons(o.list, o.xMin, o.xMax, o.yMin, o.yMax, COLUMNS);
                    for (var p = 0; p < polygons.length; p++) {
                        var pts = [];
                        for (var q = 0; q < polygons[p].length; q++) pts.push([polygons[p][q][0] * u, polygons[p][q][1] * u]);
                        out.fills.push({ points: pts, k: o.shadeK });
                    }
                    if (polygons.length === 0) out.notes.push("모두 만족하는 영역이 범위 안에 없음");
                }

                // 경계선: 등호가 없으면 점선
                var formulaLabels = [];
                for (var b = 0; b < o.list.length; b++) {
                    var ineq = o.list[b], end = null;
                    if (ineq.kind === "above" || ineq.kind === "below") {
                        var segments = plotFunction(ineq.fn, o.xMin, o.xMax, o.yMin, o.yMax);
                        for (var s = 0; s < segments.length; s++) {
                            if (segments[s].length < 2) continue;
                            out.lines.push({ points: toBezier(segments[s], u), kind: "boundary", dashed: ineq.strict });
                            var last = segments[s][segments[s].length - 1];
                            end = [last.x * u, last.y * u];
                        }
                    } else if (ineq.kind === "right" || ineq.kind === "left") {
                        if (ineq.c >= o.xMin && ineq.c <= o.xMax) {
                            out.lines.push(straight([[ineq.c * u, o.yMin * u], [ineq.c * u, o.yMax * u]], "boundary", ineq.strict));
                            end = [ineq.c * u, o.yMax * u];
                        }
                    } else {
                        out.lines.push({ points: circlePoints([ineq.cx * u, ineq.cy * u], ineq.r * u), closed: true, kind: "boundary", dashed: ineq.strict });
                        end = [(ineq.cx + ineq.r * 0.7071) * u, (ineq.cy + ineq.r * 0.7071) * u];
                    }
                    if (o.formulas && end) {
                        var display = formulaDisplay(boundaryText(ineq));
                        formulaLabels.push({ text: display.text, sup: display.sup, sub: display.sub, roman: display.roman, at: end, dir: [0.7071, 0.7071] });
                    }
                }
                formulaLabels.sort(function(p1, p2) { return p2.at[1] - p1.at[1]; });
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

            // 경계선의 식 글자 (부등호를 =로): y=-x^2+4, x=1, x^2+y^2=4
            function boundaryText(ineq) {
                var s = String(ineq.text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=");
                var out = "";
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "<" || ch === ">") {
                        out += "=";
                        if (s.charAt(i + 1) === "=") i++;
                        continue;
                    }
                    out += ch;
                }
                return out;
            }

            // 중심 c, 반지름 r인 원: 오른쪽에서 시작해 반시계로 앵커 4개
            function circlePoints(c, r) {
                var h = r * KAPPA, out = [];
                var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                for (var i = 0; i < 4; i++) {
                    var d = dirs[i], t = [-d[1], d[0]];
                    var anchor = [c[0] + d[0] * r, c[1] + d[1] * r];
                    out.push({ anchor: anchor, left: [anchor[0] - t[0] * h, anchor[1] - t[1] * h], right: [anchor[0] + t[0] * h, anchor[1] + t[1] * h] });
                }
                return out;
            }

            function straight(anchors, kind, dashed) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind, dashed: !!dashed };
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
                var parts = ["v1", encodeURIComponent(texts[0]), encodeURIComponent(texts[1]), encodeURIComponent(texts[2]),
                    xMin, xMax, yMin, yMax, unitMm, shadeK, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 15 || p[11].length !== FLAG_KEYS.length) return;
                try {
                    texts = [decodeURIComponent(p[1]), decodeURIComponent(p[2]), decodeURIComponent(p[3])];
                    xMin = Math.round(restoreNumber(p[4], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[5], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[6], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[7], yMax, 1, 20));
                    unitMm = restoreNumber(p[8], unitMm, 2, 20);
                    shadeK = restoreNumber(p[9], shadeK, 5, 60);
                    fontPt = restoreNumber(p[10], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[11].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[12], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[13], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[14] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }
    // ==== 벤다이어그램 ====
    // 벤다이어그램: 전체집합 U(사각형) 안에 집합 2개(A, B) 또는 3개(A, B, C)를 교과서처럼 겹쳐 그리고,
    // 집합 식(A∩B, A∪B, A-B, (A∪B)ᶜ, A∩Bᶜ∩C …)이 나타내는 영역을 칠한다.
    // 칠하는 영역은 조각을 겹치지 않고 원호를 이어 붙인 패스 하나(구멍은 복합 패스)로 만들어 조각 사이 틈이 없다.
    // 입력은 ∩ 대신 n·&, ∪ 대신 u·+, ᶜ 대신 '·^c도 받는다. 선 두께: 원·사각형 0.8pt.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeVennEngine() {
        var api = {label: "벤다이어그램", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathVenn/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var LABEL_GAP_MM = 0.8;
            var COUNTS = ["2개 (A, B)", "3개 (A, B, C)"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var setCount = 0;
            var shadeText = "A∩B";
            var shadeK = 25;
            var radiusMm = 12;
            var overlapPct = 45;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var setPanel = addPanel(win, "집합");
            var countRow = setPanel.add("group");
            countRow.add("statictext", undefined, "집합 수:");
            var countList = countRow.add("dropdownlist", undefined, COUNTS);
            countList.selection = setCount;
            var shadeRow = setPanel.add("group");
            shadeRow.add("statictext", undefined, "색칠:");
            var shadeInput = shadeRow.add("edittext", undefined, shadeText);
            shadeInput.preferredSize.width = 300;
            shadeInput.helpTip = "A∩B, A∪B, A-B, (A∪B)ᶜ, A∩Bᶜ∩C, U, ∅. ∩ 대신 n 또는 &, ∪ 대신 u 또는 +, ᶜ 대신 ' 또는 ^c. 비우면 칠하지 않는다";
            var messageText = setPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var sizePanel = addPanel(win, "크기");
            var radiusControls = addValueRow(sizePanel, "원 반지름", "mm", radiusMm, 5, 40, 0.5, 1);
            var overlapControls = addValueRow(sizePanel, "겹침", "%", overlapPct, 10, 80, 1, 0);
            overlapControls.input.helpTip = "두 원이 겹치는 정도 (지름에 대한 비율)";
            var shadeControls = addValueRow(sizePanel, "음영 농도", "K", shadeK, 5, 60, 1, 0);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            countList.onChange = function() { setCount = countList.selection ? countList.selection.index : 0; updatePreview(); };
            shadeInput.onChanging = function() { shadeText = shadeInput.text; updatePreview(); };
            bindValueRow(radiusControls, function(value) { radiusMm = value; });
            bindValueRow(overlapControls, function(value) { overlapPct = value; });
            bindValueRow(shadeControls, function(value) { shadeK = value; });
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
                var n = setCount + 2;
                var layout = vennLayout(n, radiusMm * MM_TO_PT, overlapPct / 100);
                var masks = parseSetExpression(shadeText, n);
                messageText.text = masks === null ? "색칠 식을 읽지 못함" : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "벤다이어그램";
                if (masks !== null && masks.length > 0) addFill(regionLoops(layout, masks));
                var rect = layout.rect;
                addOutline([[rect[0], rect[1]], [rect[2], rect[1]], [rect[2], rect[3]], [rect[0], rect[3]]]);
                for (var c = 0; c < layout.circles.length; c++) addCircle(layout.circles[c]);
                for (var t = 0; t < layout.labels.length; t++) addLabel(layout.labels[t]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // 고리들 → 칠만 있는 복합 패스 (바깥 고리 반시계, 구멍 시계 방향이라 0이 아닌 감기 규칙으로 구멍이 뚫린다)
            function addFill(loops) {
                if (loops.length === 0) return;
                var compound = previewGroup.compoundPathItems.add();
                for (var i = 0; i < loops.length; i++) {
                    var path = compound.pathItems.add();
                    var anchors = [];
                    for (var j = 0; j < loops[i].length; j++) anchors.push(loops[i][j].anchor);
                    path.setEntirePath(anchors);
                    for (var k = 0; k < loops[i].length; k++) {
                        var point = path.pathPoints[k];
                        point.leftDirection = loops[i][k].left;
                        point.rightDirection = loops[i][k].right;
                    }
                    path.closed = true;
                    path.stroked = false;
                    path.filled = true;
                    path.fillColor = makeGray(shadeK);
                }
            }

            function addOutline(corners) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(corners);
                path.closed = true;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = MAIN_PT;
            }

            // at에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다 (inside면 at에 가운데를 맞춘다)
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x + negativeNumberShift(frame, dir) - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문 GSMediumB1(기준선 +0.5pt), 없는 기호는 HancomEQN. 집합 이름은 똑바로
            function applyTextFonts(frame) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-venn.js). 영역은 비트 마스크: A=1, B=2, C=4, 어느 집합에도 없음=0
            // -------------------------------------------------------
            // 원 배치: 2개는 좌우, 3개는 A 왼쪽 위·B 오른쪽 위·C 아래. overlap은 지름에 대한 겹침 비율
            function vennLayout(n, r, overlap) {
                var circles = [], labels = [];
                var d = r * (1 - overlap);   // 중심에서 원점까지 (2개일 때 두 중심 거리 = 2d)
                var names = ["A", "B", "C"];
                if (n === 2) {
                    circles = [{ center: [-d, 0], radius: r }, { center: [d, 0], radius: r }];
                } else {
                    var k = 2 * d / Math.sqrt(3);   // 세 중심이 한 변 2d인 정삼각형
                    circles = [
                        { center: [-d, k / 2], radius: r },
                        { center: [d, k / 2], radius: r },
                        { center: [0, -k], radius: r }
                    ];
                }
                var left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
                for (var i = 0; i < circles.length; i++) {
                    var c = circles[i];
                    left = Math.min(left, c.center[0] - r); right = Math.max(right, c.center[0] + r);
                    top = Math.max(top, c.center[1] + r); bottom = Math.min(bottom, c.center[1] - r);
                    // 이름은 원 바깥, 그림 가운데에서 멀어지는 쪽 위로
                    var away = c.center[0] === 0 ? [0.7071, -0.7071] : [c.center[0] < 0 ? -0.7071 : 0.7071, 0.7071];
                    if (n === 3 && i === 2) away = [0.7071, -0.7071];
                    labels.push({ text: names[i], at: [c.center[0] + away[0] * r, c.center[1] + away[1] * r], dir: away });
                }
                var margin = r * 0.35;
                var rect = [left - margin, top + margin + r * 0.15, right + margin, bottom - margin];   // left, top, right, bottom
                labels.push({ text: "U", at: [rect[0], rect[1]], dir: [0.7071, -0.7071] });
                return { circles: circles, rect: rect, labels: labels, n: n };
            }

            function membership(layout, p) {
                var mask = 0;
                for (var i = 0; i < layout.circles.length; i++) {
                    var c = layout.circles[i];
                    if ((p[0] - c.center[0]) * (p[0] - c.center[0]) + (p[1] - c.center[1]) * (p[1] - c.center[1]) < c.radius * c.radius) mask |= (1 << i);
                }
                return mask;
            }

            // 색칠할 영역(마스크 목록)의 경계 고리들. 각 고리는 {anchor,left,right} 점 목록 (칠할 쪽이 진행 방향 왼쪽)
            function regionLoops(layout, masks) {
                var inSet = {};
                for (var m = 0; m < masks.length; m++) inSet[masks[m]] = true;
                var arcs = [];
                for (var i = 0; i < layout.circles.length; i++) {
                    var c = layout.circles[i], angles = [];
                    for (var j = 0; j < layout.circles.length; j++) {
                        if (j === i) continue;
                        var hits = circleIntersections(c, layout.circles[j]);
                        for (var h = 0; h < hits.length; h++) angles.push(Math.atan2(hits[h][1] - c.center[1], hits[h][0] - c.center[0]));
                    }
                    angles.sort(function(p, q) { return p - q; });
                    if (angles.length === 0) angles = [0];
                    for (var a = 0; a < angles.length; a++) {
                        var a0 = angles[a], a1 = a + 1 < angles.length ? angles[a + 1] : angles[0] + Math.PI * 2;
                        if (a1 - a0 < 1e-9) continue;
                        var mid = (a0 + a1) / 2, eps = c.radius * 1e-4;
                        var inner = membership(layout, [c.center[0] + (c.radius - eps) * Math.cos(mid), c.center[1] + (c.radius - eps) * Math.sin(mid)]);
                        var outer = membership(layout, [c.center[0] + (c.radius + eps) * Math.cos(mid), c.center[1] + (c.radius + eps) * Math.sin(mid)]);
                        var insideShaded = !!inSet[inner], outsideShaded = !!inSet[outer];
                        if (insideShaded === outsideShaded) continue;
                        // 칠할 쪽이 원 안이면 반시계, 바깥이면 시계 방향으로 따라간다
                        arcs.push(insideShaded ? arcPoints(c.center, c.radius, a0, a1 - a0) : arcPoints(c.center, c.radius, a1, a0 - a1));
                    }
                }
                var loops = chainArcs(arcs);
                if (inSet[0]) {
                    var r = layout.rect;
                    loops.push([plain([r[0], r[3]]), plain([r[2], r[3]]), plain([r[2], r[1]]), plain([r[0], r[1]])]);   // 반시계
                }
                return loops;
            }

            // 끝점이 이어지는 호들을 닫힌 고리로 묶는다
            function chainArcs(arcs) {
                var used = [], loops = [];
                function key(p) { return Math.round(p[0] * 1000) + "," + Math.round(p[1] * 1000); }
                for (var s = 0; s < arcs.length; s++) {
                    if (used[s]) continue;
                    used[s] = true;
                    var loop = arcs[s].slice(), startKey = key(loop[0].anchor);
                    for (var guard = 0; guard < arcs.length && key(loop[loop.length - 1].anchor) !== startKey; guard++) {
                        var endKey = key(loop[loop.length - 1].anchor), next = -1;
                        for (var t = 0; t < arcs.length; t++) if (!used[t] && key(arcs[t][0].anchor) === endKey) { next = t; break; }
                        if (next < 0) break;
                        used[next] = true;
                        var last = loop.pop();
                        var first = arcs[next][0];
                        loop.push({ anchor: last.anchor, left: last.left, right: first.right });
                        for (var q = 1; q < arcs[next].length; q++) loop.push(arcs[next][q]);
                    }
                    // 닫기: 마지막 점(= 처음 점)의 들어오는 핸들을 처음 점으로 옮긴다
                    var tail = loop.pop();
                    loop[0] = { anchor: loop[0].anchor, left: tail.left, right: loop[0].right };
                    loops.push(loop);
                }
                return loops;
            }

            function circleIntersections(c1, c2) {
                var dx = c2.center[0] - c1.center[0], dy = c2.center[1] - c1.center[1];
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d === 0 || d >= c1.radius + c2.radius || d <= Math.abs(c1.radius - c2.radius)) return [];
                var a = (c1.radius * c1.radius - c2.radius * c2.radius + d * d) / (2 * d);
                var h = Math.sqrt(Math.max(0, c1.radius * c1.radius - a * a));
                var mx = c1.center[0] + a * dx / d, my = c1.center[1] + a * dy / d;
                return [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
            }

            // 집합 식 → 칠할 영역 마스크 목록 (마스크 0~2ⁿ-1). 빈 칸은 [], 못 읽으면 null
            // 우선순위: ᶜ(뒤에 붙음) > ∩ > ∪·- (왼쪽부터)
            function parseSetExpression(text, n) {
                var s = String(text).replace(/\s/g, "").split("^c").join("ᶜ").split("'").join("ᶜ").split("′").join("ᶜ");
                if (s === "") return [];
                var all = [];
                for (var m = 0; m < (1 << n); m++) all.push(m);
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function union() {
                    var left = intersection();
                    while (peek() === "∪" || peek() === "u" || peek() === "+" || peek() === "-" || peek() === "−") {
                        var op = s.charAt(pos++);
                        var right = intersection();
                        left = (op === "-" || op === "−") ? filter(left, function(x) { return !has(right, x); }) : merge(left, right);
                    }
                    return left;
                }
                function intersection() {
                    var left = complement();
                    while (peek() === "∩" || peek() === "n" || peek() === "&") {
                        pos++;
                        var right = complement();
                        left = filter(left, function(x) { return has(right, x); });
                    }
                    return left;
                }
                function complement() {
                    var value = primary();
                    while (peek() === "ᶜ") {
                        pos++;
                        var inner = value;
                        value = filter(all, function(x) { return !has(inner, x); });
                    }
                    return value;
                }
                function primary() {
                    var ch = peek();
                    if (ch === "(") {
                        pos++;
                        var inner = union();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return inner;
                    }
                    pos++;
                    if (ch === "U") return all.slice();
                    if (ch === "∅" || ch === "Ø") return [];
                    var index = "ABC".indexOf(ch);
                    if (index < 0 || index >= n) throw new Error("name");
                    return filter(all, function(x) { return (x & (1 << index)) !== 0; });
                }
                function has(list, x) { for (var i = 0; i < list.length; i++) if (list[i] === x) return true; return false; }
                function filter(list, keep) { var out = []; for (var i = 0; i < list.length; i++) if (keep(list[i])) out.push(list[i]); return out; }
                function merge(a, b) { var out = a.slice(); for (var i = 0; i < b.length; i++) if (!has(out, b[i])) out.push(b[i]); return out; }
                try {
                    var result = union();
                    if (pos !== s.length) return null;
                    result.sort(function(p, q) { return p - q; });
                    return result;
                } catch (e) {
                    return null;
                }
            }

            // 3차 베지어 원호 (90°씩 나눈다, sweep이 음수면 시계 방향)
            function arcPoints(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
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

            function plain(p) { return { anchor: p, left: p, right: p }; }

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
                var parts = ["v1", setCount, encodeURIComponent(shadeText), shadeK, radiusMm, overlapPct, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 10) return;
                try {
                    setCount = Math.round(restoreNumber(p[1], setCount, 0, COUNTS.length - 1));
                    shadeText = decodeURIComponent(p[2]);
                    shadeK = restoreNumber(p[3], shadeK, 5, 60);
                    radiusMm = restoreNumber(p[4], radiusMm, 5, 40);
                    overlapPct = restoreNumber(p[5], overlapPct, 10, 80);
                    fontPt = restoreNumber(p[6], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[9] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 이차함수 ====
    // 이차함수와 이차방정식·부등식: y=ax²+bx+c의 포물선(정확한 베지어)에 꼭짓점, 축(점선), x절편(값 또는 α·β), y절편을 표시하고,
    // 이차부등식 f(x)>0 (≥, <, ≤)의 해를 x축 위 굵은 선분(경계는 ●/○)으로 나타낸다. 직선 y=mx+n을 겹쳐 교점을 찍을 수 있다.
    // 판별식, 근, 부등식의 해, 직선과의 위치 관계를 창에 보여 준다.
    // 선 두께: 축 0.4pt, 포물선·직선 0.8pt, 해 선분 2pt, 점선 0.3pt. 선택은 필요 없다.
    function makeQuadraticEngine() {
        var api = {label: "이차함수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighCommonQuadratic/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(α, β, √)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var SOLUTION_PT = 2;
            var GUIDE_PT = 0.3;
            var OPEN_DOT_PT = 0.5;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.7;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var INEQUALITIES = ["없음", "f(x) > 0", "f(x) ≥ 0", "f(x) < 0", "f(x) ≤ 0"];
            var ROOT_LABELS = ["값", "α, β"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["vertex", "axisLine", "roots", "intercept", "line", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var aValue = 1, bValue = -4, cValue = 3;
            var mValue = 1, nValue = -1;
            var inequality = 3;
            var rootLabel = 0;
            var xMin = -2, xMax = 6, yMin = -2, yMax = 6;
            var unitMm = 6;
            var fontPt = 8;
            var opt = { vertex: true, axisLine: true, roots: true, intercept: true, line: false, formula: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "y = ax² + bx + c");
            var aControls = addValueRow(functionPanel, "a", "", aValue, -5, 5, 0.5, 1);
            var bControls = addValueRow(functionPanel, "b", "", bValue, -10, 10, 0.5, 1);
            var cControls = addValueRow(functionPanel, "c", "", cValue, -10, 10, 0.5, 1);
            var solveRow = functionPanel.add("group");
            solveRow.add("statictext", undefined, "부등식:");
            var inequalityList = solveRow.add("dropdownlist", undefined, INEQUALITIES);
            inequalityList.selection = inequality;
            solveRow.add("statictext", undefined, "근 글자:");
            var rootList = solveRow.add("dropdownlist", undefined, ROOT_LABELS);
            rootList.selection = rootLabel;
            addCheckRow(functionPanel, [["vertex", "꼭짓점"], ["axisLine", "축 점선"], ["roots", "x절편"]]);
            addCheckRow(functionPanel, [["intercept", "y절편"], ["formula", "식 글자"], ["line", "직선 y=mx+n"]]);
            var mControls = addValueRow(functionPanel, "직선 m", "", mValue, -10, 10, 0.5, 1);
            var nControls = addValueRow(functionPanel, "직선 n", "", nValue, -10, 10, 0.5, 1);

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
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(cControls, function(value) { cValue = value; });
            inequalityList.onChange = function() { inequality = inequalityList.selection ? inequalityList.selection.index : 0; updatePreview(); };
            rootList.onChange = function() { rootLabel = rootList.selection ? rootList.selection.index : 0; updatePreview(); };
            bindValueRow(mControls, function(value) { mValue = value; });
            bindValueRow(nControls, function(value) { nValue = value; });
            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
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

            function refreshEnabled() {
                mControls.input.parent.enabled = opt.line;
                nControls.input.parent.enabled = opt.line;
            }

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
                    refreshEnabled();
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
                if (Math.abs(aValue) < 1e-9) {
                    messageText.text = "a는 0이 아니어야 함";
                    return;
                }
                var drawing = buildQuadratic({
                    a: aValue, b: bValue, c: cValue, m: mValue, n: nValue, inequality: inequality, letters: rootLabel === 1,
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    vertex: opt.vertex, axisLine: opt.axisLine, roots: opt.roots, intercept: opt.intercept, line: opt.line,
                    formula: opt.formula, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "이차함수";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (typeof untangleLabels === "function") untangleLabels(previewGroup, drawing);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"solution"|"guide"|"grid"}
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                if (label.sup) {
                    for (var s = 0; s < label.sup.length; s++) {
                        var supAttributes = frame.textRange.characters[label.sup[s]].characterAttributes;
                        supAttributes.baselinePosition = FontBaselineOption.SUPERSCRIPT;
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
            // GSMediumB1에 없는 기호(α, β, √)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-quadratic.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // ax²+bx+c = 0의 실근 (작은 것부터). 중근은 하나
            function quadraticRoots(a, b, c) {
                var D = b * b - 4 * a * c;
                if (D < -1e-12) return [];
                if (Math.abs(D) <= 1e-12) return [-b / (2 * a)];
                var s = Math.sqrt(D), r1 = (-b - s) / (2 * a), r2 = (-b + s) / (2 * a);
                return r1 < r2 ? [r1, r2] : [r2, r1];
            }

            // 포물선 [x0, x1] 조각: 이차 베지어를 3차로 (정확). 조절점은 두 끝 접선의 교점
            function parabolaPiece(a, b, c, x0, x1, u) {
                function f(x) { return a * x * x + b * x + c; }
                var P0 = [x0, f(x0)], P2 = [x1, f(x1)], slope = 2 * a * x0 + b;
                var Q = [(x0 + x1) / 2, f(x0) + slope * (x1 - x0) / 2];
                var c1 = [P0[0] + (Q[0] - P0[0]) * 2 / 3, P0[1] + (Q[1] - P0[1]) * 2 / 3];
                var c2 = [P2[0] + (Q[0] - P2[0]) * 2 / 3, P2[1] + (Q[1] - P2[1]) * 2 / 3];
                function S(p) { return [p[0] * u, p[1] * u]; }
                return [{ anchor: S(P0), left: S(P0), right: S(c1) }, { anchor: S(P2), left: S(c2), right: S(P2) }];
            }

            // 포물선이 y 범위 [y0, y1] 안에 드는 x 구간들 (볼록한 쪽 끝만 자르면 된다; 꼭짓점이 범위 밖이면 둘로 나뉠 수 있다)
            function visibleIntervals(a, b, c, x0, x1, y0, y1) {
                var cuts = [x0, x1];
                var bounds = [y0, y1];
                for (var i = 0; i < 2; i++) {
                    var r = quadraticRoots(a, b, c - bounds[i]);
                    for (var j = 0; j < r.length; j++) if (r[j] > x0 && r[j] < x1) cuts.push(r[j]);
                }
                cuts.sort(function(p, q) { return p - q; });
                var list = [];
                for (var k = 0; k + 1 < cuts.length; k++) {
                    var mid = (cuts[k] + cuts[k + 1]) / 2, y = a * mid * mid + b * mid + c;
                    if (cuts[k + 1] - cuts[k] > 1e-9 && y >= y0 - 1e-9 && y <= y1 + 1e-9) list.push([cuts[k], cuts[k + 1]]);
                }
                return list;
            }

            // 부등식의 해: kind 1 >0, 2 ≥0, 3 <0, 4 ≤0 → {intervals:[[lo, hi, loIn, hiIn]], points:[x], text}
            function solveInequality(a, b, c, kind) {
                var roots = quadraticRoots(a, b, c), greater = kind === 1 || kind === 2, closed = kind === 2 || kind === 4;
                var positiveOutside = a > 0;   // a > 0이면 두 근 바깥에서 양수
                var outside = greater === positiveOutside, I = Infinity;
                var result = { intervals: [], points: [], text: "" };
                if (roots.length === 2) {
                    var p = fmt(roots[0]), q = fmt(roots[1]);
                    if (outside) {
                        result.intervals.push([-I, roots[0], false, closed], [roots[1], I, closed, false]);
                        result.text = "x " + (closed ? "≤ " : "< ") + p + " 또는 x " + (closed ? "≥ " : "> ") + q;
                    } else {
                        result.intervals.push([roots[0], roots[1], closed, closed]);
                        result.text = p + (closed ? " ≤ x ≤ " : " < x < ") + q;
                    }
                } else if (roots.length === 1) {
                    var r = fmt(roots[0]);
                    if (outside) {
                        if (closed) { result.intervals.push([-I, I, false, false]); result.text = "모든 실수"; }
                        else { result.intervals.push([-I, roots[0], false, false], [roots[0], I, false, false]); result.text = "x ≠ " + r + "인 모든 실수"; }
                    } else if (closed) { result.points.push(roots[0]); result.text = "x = " + r; }
                    else result.text = "해가 없음";
                } else {
                    if (outside) { result.intervals.push([-I, I, false, false]); result.text = "모든 실수"; }
                    else result.text = "해가 없음";
                }
                return result;
            }

            function buildQuadratic(o) {
                var u = o.unit, a = o.a, b = o.b, c = o.c;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                function f(x) { return a * x * x + b * x + c; }
                function inView(p) { return p[0] >= o.xMin - 1e-9 && p[0] <= o.xMax + 1e-9 && p[1] >= o.yMin - 1e-9 && p[1] <= o.yMax + 1e-9; }
                function S(p) { return [p[0] * u, p[1] * u]; }

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

                // 포물선 (y 범위 안 조각들)
                var pieces = visibleIntervals(a, b, c, o.xMin, o.xMax, o.yMin, o.yMax), lastEnd = null;
                for (var p = 0; p < pieces.length; p++) {
                    out.lines.push({ points: parabolaPiece(a, b, c, pieces[p][0], pieces[p][1], u), kind: "graph" });
                    lastEnd = S([pieces[p][1], f(pieces[p][1])]);
                }
                if (o.formula && lastEnd) {
                    var eq = quadraticText(a, b, c);
                    out.texts.push({ text: eq.text, sup: eq.sup, at: lastEnd, dir: [1, 0] });
                }

                var vx = -b / (2 * a), vy = f(vx), roots = quadraticRoots(a, b, c), D = b * b - 4 * a * c;
                if (o.axisLine) out.lines.push(straight([[vx * u, o.yMin * u], [vx * u, o.yMax * u]], "guide"));
                if (o.vertex && inView([vx, vy])) {
                    out.dots.push({ at: S([vx, vy]) });
                    out.texts.push({ text: "(" + fmt(vx) + ", " + fmt(vy) + ")", at: S([vx, vy]), dir: [0, a > 0 ? -1 : 1], upright: true });
                }
                if (o.roots) {
                    var names = roots.length === 2 ? ["α", "β"] : ["α"];
                    for (var r = 0; r < roots.length; r++) {
                        if (!inView([roots[r], 0])) continue;
                        out.dots.push({ at: S([roots[r], 0]) });
                        out.texts.push({ text: o.letters ? names[r] : fmt(roots[r]), at: S([roots[r], 0]), dir: [r === 0 ? -0.7071 : 0.7071, a > 0 ? 0.7071 : -0.7071], upright: !o.letters });
                    }
                }
                if (o.intercept && inView([0, c])) {
                    out.dots.push({ at: S([0, c]) });
                    out.texts.push({ text: fmt(c), at: S([0, c]), dir: [0.7071, 0.7071], upright: true });
                }

                // 부등식의 해: x축 위 굵은 선분과 경계 점
                if (o.inequality > 0) {
                    var solution = solveInequality(a, b, c, o.inequality);
                    for (var s = 0; s < solution.intervals.length; s++) {
                        var seg = solution.intervals[s], lo = Math.max(seg[0], o.xMin), hi = Math.min(seg[1], o.xMax);
                        if (hi - lo > 1e-9) out.lines.push(straight([[lo * u, 0], [hi * u, 0]], "solution"));
                        if (isFinite(seg[0]) && seg[0] >= o.xMin) out.dots.push({ at: [seg[0] * u, 0], open: !seg[2] });
                        if (isFinite(seg[1]) && seg[1] <= o.xMax) out.dots.push({ at: [seg[1] * u, 0], open: !seg[3] });
                    }
                    for (var sp = 0; sp < solution.points.length; sp++) out.dots.push({ at: [solution.points[sp] * u, 0] });
                    out.notes.push(INEQUALITIES[o.inequality] + "의 해: " + solution.text);
                }

                // 직선과 교점
                if (o.line) {
                    var yl0 = o.m * o.xMin + o.n, yl1 = o.m * o.xMax + o.n;
                    var seg2 = clipSegment([o.xMin, yl0], [o.xMax, yl1], o.yMin, o.yMax);
                    if (seg2) out.lines.push(straight([S(seg2[0]), S(seg2[1])], "graph"));
                    var meet = quadraticRoots(a, b - o.m, c - o.n), D2 = (b - o.m) * (b - o.m) - 4 * a * (c - o.n);
                    for (var k = 0; k < meet.length; k++) {
                        var P = [meet[k], f(meet[k])];
                        if (inView(P)) out.dots.push({ at: S(P) });
                    }
                    out.notes.push("직선과: D = " + fmt(D2) + " → " + (D2 > 1e-9 ? "두 점에서 만남" : (D2 >= -1e-9 ? "접함" : "만나지 않음")) +
                        (meet.length > 0 ? " (x = " + joinValues(meet) + ")" : ""));
                }

                out.notes.unshift("꼭짓점 (" + fmt(vx) + ", " + fmt(vy) + "), 판별식 D = " + fmt(D) + (roots.length > 0 ? ", 근 x = " + joinValues(roots) : ", 실근 없음"));
                return out;
            }

            // (x0, y0)-(x1, y1) 선분을 y 범위로 자른다. 안 지나면 null
            function clipSegment(p, q, y0, y1) {
                var t0 = 0, t1 = 1, dy = q[1] - p[1];
                if (Math.abs(dy) < 1e-12) return p[1] >= y0 && p[1] <= y1 ? [p, q] : null;
                var ta = (y0 - p[1]) / dy, tb = (y1 - p[1]) / dy;
                t0 = Math.max(t0, Math.min(ta, tb));
                t1 = Math.min(t1, Math.max(ta, tb));
                if (t1 - t0 < 1e-9) return null;
                function at(t) { return [p[0] + (q[0] - p[0]) * t, p[1] + dy * t]; }
                return [at(t0), at(t1)];
            }

            // y=x2-4x+3 (a=1, -1은 부호만), 위첨자 2 위치. 계수는 소수로 (1/2x²는 1/(2x²)로 읽히므로 분수로 쓰지 않는다)
            function quadraticText(a, b, c) {
                function coefText(v) { var r = Math.round(v * 100) / 100; return String(r === 0 ? 0 : r); }
                var text = "y=", sup = [];
                var aText = coefText(a);
                text += aText === "1" ? "" : (aText === "-1" ? "-" : aText);
                text += "x";
                sup.push(text.length);
                text += "2";
                if (b !== 0) {
                    var bText = coefText(Math.abs(b));
                    text += (b < 0 ? "-" : "+") + (bText === "1" ? "" : bText) + "x";
                }
                if (c !== 0) text += (c < 0 ? "-" : "+") + coefText(Math.abs(c));
                return { text: text, sup: sup };
            }

            function joinValues(list) {
                var parts = [];
                for (var i = 0; i < list.length; i++) parts.push(fmt(list[i]));
                return parts.join(", ");
            }

            // 정수·분수(분모 6까지)·√로 알아볼 수 있으면 그렇게 (p ± √q 꼴은 소수)
            function fmt(v) {
                if (Math.abs(v) < 1e-9) return "0";
                var sign = v < 0 ? "-" : "", a = Math.abs(v);
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(a * q);
                    if (Math.abs(p / q - a) < 1e-9 * (1 + a)) return sign + (q === 1 ? String(p) : p + "/" + q);
                }
                var square = a * a;
                if (Math.abs(square - Math.round(square)) < 1e-9 * (1 + square)) return sign + "√" + Math.round(square);
                return String(Math.round(v * 100) / 100);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
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
                var parts = ["v1", aValue, bValue, cValue, mValue, nValue, inequality, rootLabel, xMin, xMax, yMin, yMax, unitMm, fontPt, flags,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 18 || p[14].length !== FLAG_KEYS.length) return;
                try {
                    aValue = restoreNumber(p[1], aValue, -5, 5);
                    bValue = restoreNumber(p[2], bValue, -10, 10);
                    cValue = restoreNumber(p[3], cValue, -10, 10);
                    mValue = restoreNumber(p[4], mValue, -10, 10);
                    nValue = restoreNumber(p[5], nValue, -10, 10);
                    inequality = Math.round(restoreNumber(p[6], inequality, 0, INEQUALITIES.length - 1));
                    rootLabel = Math.round(restoreNumber(p[7], rootLabel, 0, ROOT_LABELS.length - 1));
                    xMin = Math.round(restoreNumber(p[8], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[9], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[10], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[11], yMax, 1, 20));
                    unitMm = restoreNumber(p[12], unitMm, 2, 20);
                    fontPt = restoreNumber(p[13], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[14].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[15], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[16], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[17] === "1";
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 유리·무리함수 ====
    // 유리함수 y=k/(x-p)+q의 두 가지(쌍곡선)와 점근선 x=p, y=q(점선), 무리함수 y=±√(a(x-p))+q와 시작점 (p, q)를 좌표평면에 그린다.
    // 무리함수는 r=√(a(x-p))로 놓으면 x가 r의 이차식, y가 일차식이라 베지어 한 조각이 정확하다. 쌍곡선은 ln|x-p|를 매개로
    // 한 도막씩 에르미트 3차 곡선으로 잇는다(오차는 단위 길이의 1/10000 아래). 절편, 식 글자, 정의역·치역을 창에 보여 준다.
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 점근선 0.3pt 점선. 선택은 필요 없다.
    function makeRationalEngine() {
        var api = {label: "유리·무리함수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighCommonRational/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(√)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.7;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var HYPERBOLA_STEP = 0.25;   // ln|x-p| 간격. 도막 하나의 오차가 단위 길이의 1/10000 아래
            var KINDS = ["유리함수 y = k/(x-p)+q", "무리함수 y = √(a(x-p))+q", "무리함수 y = -√(a(x-p))+q"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["asymptote", "start", "intercepts", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 0;
            var kValue = 2, aValue = 1, pValue = 1, qValue = 1;
            var xMin = -3, xMax = 6, yMin = -3, yMax = 6;
            var unitMm = 6;
            var fontPt = 8;
            var opt = { asymptote: true, start: true, intercepts: true, formula: true, grid: false, numbers: true };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var functionPanel = addPanel(win, "함수");
            var kindRow = functionPanel.add("group");
            kindRow.add("statictext", undefined, "함수:").preferredSize.width = LABEL_WIDTH;
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var kControls = addValueRow(functionPanel, "k (유리)", "", kValue, -10, 10, 0.5, 1);
            var aControls = addValueRow(functionPanel, "a (무리)", "", aValue, -5, 5, 0.5, 1);
            var pControls = addValueRow(functionPanel, "p", "", pValue, -10, 10, 0.5, 1);
            var qControls = addValueRow(functionPanel, "q", "", qValue, -10, 10, 0.5, 1);
            var checks = {};
            addCheckRow(functionPanel, [["asymptote", "점근선"], ["start", "시작점"], ["intercepts", "절편"]]);
            addCheckRow(functionPanel, [["formula", "식 글자"]]);

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
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(kControls, function(value) { kValue = value; });
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(pControls, function(value) { pValue = value; });
            bindValueRow(qControls, function(value) { qValue = value; });
            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. k = 0(유리)이나 a = 0(무리)이면 확정하지 않는다
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
                kControls.input.parent.enabled = kind === 0;
                aControls.input.parent.enabled = kind > 0;
                checks.asymptote.enabled = kind === 0;
                checks.start.enabled = kind > 0;
            }

            function addCheckRow(parent, items) {
                var row = parent.add("group");
                for (var i = 0; i < items.length; i++) {
                    var check = row.add("checkbox", undefined, items[i][1]);
                    check.preferredSize.width = 120;
                    checks[items[i][0]] = check;
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
                if (kind === 0 && Math.abs(kValue) < 1e-9) {
                    messageText.text = "k는 0이 아니어야 함";
                    return;
                }
                if (kind > 0 && Math.abs(aValue) < 1e-9) {
                    messageText.text = "a는 0이 아니어야 함";
                    return;
                }
                var drawing = buildRational({
                    kind: kind, k: kValue, a: aValue, p: pValue, q: qValue,
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    asymptote: opt.asymptote, start: opt.start, intercepts: opt.intercepts, formula: opt.formula,
                    grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = kind === 0 ? "유리함수" : "무리함수";
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

            function addDot(dot) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(100);
                circle.stroked = false;
            }

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var attributes = frame.textRange.characterAttributes;
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

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(√)는 HancomEQN. 숫자(upright)는 똑바로
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var attributes = frame.textRange.characters[i].characterAttributes;
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-rational.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 쌍곡선 한 가지에서 w = |x-p|가 범위 안에 드는 구간. kk = k × (가지 방향 ±1)이면 y - q = kk / w.
            // y - q ∈ [vLo, vHi], w ∈ [wLo, wHi]. 없으면 null
            function branchRange(kk, vLo, vHi, wLo, wHi) {
                var w0, w1;
                if (kk > 0) {
                    if (vHi <= 0) return null;
                    w0 = kk / vHi;
                    w1 = vLo > 0 ? kk / vLo : Infinity;
                } else {
                    if (vLo >= 0) return null;
                    w0 = kk / vLo;
                    w1 = vHi < 0 ? kk / vHi : Infinity;
                }
                w0 = Math.max(w0, wLo);
                w1 = Math.min(w1, wHi);
                return w1 - w0 > 1e-9 ? [w0, w1] : null;
            }

            // 쌍곡선 가지: x = p + side·w, y = q + k/(side·w), w ∈ [w0, w1]. t = ln w를 매개로 에르미트 도막을 잇는다
            function hyperbolaBranch(k, p, q, side, w0, w1, u) {
                var t0 = Math.log(w0), t1 = Math.log(w1);
                var count = Math.max(1, Math.ceil((t1 - t0) / HYPERBOLA_STEP)), h = (t1 - t0) / count;
                var points = [];
                for (var i = 0; i <= count; i++) {
                    var w = Math.exp(t0 + h * i);
                    var P = [p + side * w, q + k / (side * w)], D = [side * w, -k / (side * w)];   // dP/dt
                    var left = i === 0 ? P : [P[0] - D[0] * h / 3, P[1] - D[1] * h / 3];
                    var right = i === count ? P : [P[0] + D[0] * h / 3, P[1] + D[1] * h / 3];
                    points.push({ anchor: [P[0] * u, P[1] * u], left: [left[0] * u, left[1] * u], right: [right[0] * u, right[1] * u] });
                }
                return points;
            }

            // 무리함수에서 r = √(a(x-p))가 범위 안에 드는 구간 (x = p + r²/a, y = q + s·r). 없으면 null
            function rootRange(s, a, p, q, xMin, xMax, yMin, yMax) {
                var lo = Math.min(a * (xMin - p), a * (xMax - p)), hi = Math.max(a * (xMin - p), a * (xMax - p));
                if (hi < 0) return null;
                var r0 = Math.sqrt(Math.max(lo, 0)), r1 = Math.sqrt(hi);
                var y0 = s > 0 ? yMin - q : q - yMax, y1 = s > 0 ? yMax - q : q - yMin;   // s·r ∈ [yMin-q, yMax-q]
                r0 = Math.max(r0, y0, 0);
                r1 = Math.min(r1, y1);
                return r1 - r0 > 1e-9 ? [r0, r1] : null;
            }

            // 무리함수 [r0, r1] 조각: x가 r의 이차식, y가 일차식이라 에르미트 3차 한 조각이 정확하다
            function rootPiece(s, a, p, q, r0, r1, u) {
                var h = r1 - r0;
                function P(r) { return [p + r * r / a, q + s * r]; }
                function D(r) { return [2 * r / a, s]; }
                var A = P(r0), B = P(r1), DA = D(r0), DB = D(r1);
                function S(v) { return [v[0] * u, v[1] * u]; }
                return [
                    { anchor: S(A), left: S(A), right: S([A[0] + DA[0] * h / 3, A[1] + DA[1] * h / 3]) },
                    { anchor: S(B), left: S([B[0] - DB[0] * h / 3, B[1] - DB[1] * h / 3]), right: S(B) }
                ];
            }

            function buildRational(o) {
                var u = o.unit, p = o.p, q = o.q;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                function inView(v) { return v[0] >= o.xMin - 1e-9 && v[0] <= o.xMax + 1e-9 && v[1] >= o.yMin - 1e-9 && v[1] <= o.yMax + 1e-9; }
                function S(v) { return [v[0] * u, v[1] * u]; }

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

                // 절편 글자는 그래프가 지나지 않는 쪽에: 오르는 그래프면 x절편은 왼쪽 위, 내리는 그래프면 오른쪽 위. y절편은 축 오른쪽
                var rising, formulaAt = null, formulaDir = [1, 0], xCut = null, yCut = null;
                if (o.kind === 0) {
                    var k = o.k;
                    rising = k < 0;
                    var vLo = o.yMin - q, vHi = o.yMax - q;
                    var sides = [1, -1];
                    for (var b = 0; b < 2; b++) {
                        var side = sides[b];
                        var wLo = Math.max(side > 0 ? o.xMin - p : p - o.xMax, 0), wHi = side > 0 ? o.xMax - p : p - o.xMin;
                        var range = wHi > 0 ? branchRange(k * side, vLo, vHi, wLo, wHi) : null;
                        if (!range) continue;
                        out.lines.push({ points: hyperbolaBranch(k, p, q, side, range[0], range[1], u), kind: "graph" });
                        // 식 글자는 점근선 쪽 가파른 끝에 (먼 끝은 점근선 y=q의 이름과 겹친다)
                        if (formulaAt === null) {
                            formulaAt = S([p + side * range[0], q + k / (side * range[0])]);
                            formulaDir = [side, 0];
                        }
                    }
                    if (o.asymptote) {
                        if (p >= o.xMin && p <= o.xMax) {
                            out.lines.push(straight([[p * u, o.yMin * u], [p * u, o.yMax * u]], "guide"));
                            out.texts.push({ text: "x=" + fmt(p), at: [p * u, o.yMax * u], dir: [0, 1] });
                        }
                        if (q >= o.yMin && q <= o.yMax) {
                            out.lines.push(straight([[o.xMin * u, q * u], [o.xMax * u, q * u]], "guide"));
                            out.texts.push({ text: "y=" + fmt(q), at: [o.xMax * u, q * u], dir: [1, 0] });
                        }
                    }
                    if (Math.abs(p) > 1e-9) yCut = q - k / p;
                    if (Math.abs(q) > 1e-9) xCut = p - k / q;
                    if (o.formula && formulaAt) out.texts.push({ text: rationalText(k, p, q), at: formulaAt, dir: formulaDir });
                    out.notes.push("점근선 x = " + fmt(p) + ", y = " + fmt(q));
                    out.notes.push("정의역 {x | x ≠ " + fmt(p) + "}, 치역 {y | y ≠ " + fmt(q) + "}");
                } else {
                    var s = o.kind === 1 ? 1 : -1, a = o.a;
                    rising = s * a > 0;
                    var rr = rootRange(s, a, p, q, o.xMin, o.xMax, o.yMin, o.yMax);
                    if (rr) {
                        out.lines.push({ points: rootPiece(s, a, p, q, rr[0], rr[1], u), kind: "graph" });
                        formulaAt = S([p + rr[1] * rr[1] / a, q + s * rr[1]]);
                        formulaDir = [a > 0 ? 1 : -1, 0];
                    }
                    if (o.start && inView([p, q])) {
                        out.dots.push({ at: S([p, q]) });
                        out.texts.push({ text: "(" + fmt(p) + ", " + fmt(q) + ")", at: S([p, q]), dir: [a > 0 ? -0.7071 : 0.7071, s > 0 ? -0.7071 : 0.7071], upright: true });
                    }
                    if (-a * p >= 0) yCut = q + s * Math.sqrt(-a * p);
                    if (-q * s >= 0) xCut = p + q * q / a;
                    if (o.formula && formulaAt) out.texts.push({ text: rootText(s, a, p, q), at: formulaAt, dir: formulaDir });
                    out.notes.push("시작점 (" + fmt(p) + ", " + fmt(q) + ")");
                    out.notes.push("정의역 {x | x " + (a > 0 ? "≥ " : "≤ ") + fmt(p) + "}, 치역 {y | y " + (s > 0 ? "≥ " : "≤ ") + fmt(q) + "}");
                }

                if (o.intercepts) {
                    // 시작점이나 원점과 겹치는 절편은 한 번만. 정수 절편은 눈금 숫자가 이미 있으면 점만 찍는다
                    var cutText = function(v) { return o.numbers && Math.abs(v - Math.round(v)) < 1e-9 ? null : fmt(v); };
                    if (xCut !== null && inView([xCut, 0]) && Math.abs(xCut) > 1e-9 && !(o.kind > 0 && o.start && Math.abs(q) < 1e-9)) {
                        out.dots.push({ at: [xCut * u, 0] });
                        if (cutText(xCut)) out.texts.push({ text: fmt(xCut), at: [xCut * u, 0], dir: [rising ? -0.7071 : 0.7071, 0.7071], upright: true });
                    }
                    if (yCut !== null && inView([0, yCut]) && Math.abs(yCut) > 1e-9 && !(o.kind > 0 && o.start && Math.abs(p) < 1e-9)) {
                        out.dots.push({ at: [0, yCut * u] });
                        if (cutText(yCut)) out.texts.push({ text: fmt(yCut), at: [0, yCut * u], dir: [0.7071, rising ? -0.7071 : 0.7071], upright: true });
                    }
                }
                if (formulaAt === null) out.notes.push("그래프가 범위 밖에 있음");
                return out;
            }

            function coefText(v) { var r = Math.round(v * 100) / 100; return String(r === 0 ? 0 : r); }

            // x-p를 글자로: x, x-1, x+2.5
            function shiftText(p) {
                if (Math.abs(p) < 1e-9) return "x";
                return "x" + (p > 0 ? "-" : "+") + coefText(Math.abs(p));
            }

            function tailText(q) {
                if (Math.abs(q) < 1e-9) return "";
                return (q > 0 ? "+" : "-") + coefText(Math.abs(q));
            }

            // y=2/(x-1)+1, y=-3/x
            function rationalText(k, p, q) {
                var denominator = Math.abs(p) < 1e-9 ? "x" : "(" + shiftText(p) + ")";
                return "y=" + coefText(k) + "/" + denominator + tailText(q);
            }

            // y=√x, y=-√(2x-2)+1, y=√(-x+3). 근호 안은 ax-ap로 풀어 쓴다
            function rootText(s, a, p, q) {
                var aText = coefText(a), inner = aText === "1" ? "x" : (aText === "-1" ? "-x" : aText + "x");
                var c = -a * p;
                if (Math.abs(c) > 1e-9) inner += (c > 0 ? "+" : "-") + coefText(Math.abs(c));
                return "y=" + (s < 0 ? "-" : "") + "√" + (inner === "x" ? "x" : "(" + inner + ")") + tailText(q);
            }

            // 정수·분수(분모 6까지)·√로 알아볼 수 있으면 그렇게
            function fmt(v) {
                if (Math.abs(v) < 1e-9) return "0";
                var sign = v < 0 ? "-" : "", a = Math.abs(v);
                for (var q = 1; q <= 6; q++) {
                    var p = Math.round(a * q);
                    if (Math.abs(p / q - a) < 1e-9 * (1 + a)) return sign + (q === 1 ? String(p) : p + "/" + q);
                }
                var square = a * a;
                if (Math.abs(square - Math.round(square)) < 1e-9 * (1 + square)) return sign + "√" + Math.round(square);
                return String(Math.round(v * 100) / 100);
            }

            function straight(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: kind };
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
                var parts = ["v1", kind, kValue, aValue, pValue, qValue, xMin, xMax, yMin, yMax, unitMm, fontPt, flags,
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
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    kValue = restoreNumber(p[2], kValue, -10, 10);
                    aValue = restoreNumber(p[3], aValue, -5, 5);
                    pValue = restoreNumber(p[4], pValue, -10, 10);
                    qValue = restoreNumber(p[5], qValue, -10, 10);
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
})();
