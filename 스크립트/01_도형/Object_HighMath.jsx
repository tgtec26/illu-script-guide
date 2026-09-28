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

// 고등학교 수학: 고등학교 교재·평가원식 그림을 그리는 스크립트를 한 창의 탭으로 묶는다 (중학교 수학 묶음과 같은 구조).
// 탭마다 필요한 선택이 다르고, 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1(변수는 GSMediItaC1), GSMediumB1에 없는 π·θ·√ 같은 기호는 HancomEQN.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "HighMath/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 탭마다 따로 저장한다

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeUnitCircleEngine(), makeTriangleEngine(), makeVennEngine(), makeMoveEngine(), makeCountEngine(), makeCalculusEngine(), makeDistributionEngine(), makeSequenceEngine(), makeCircleLineEngine(), makeConicEngine(), makeExpLogEngine(), makeTrigEngine(), makeVectorEngine(), makeExtremaEngine(), makeInequalityEngine(), makePiecewiseEngine()];

    var win = new Window("dialog", "고등학교 수학");
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
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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

    // ==== 경우의 수 ====
    // 경우의 수 도식: 도로망(마을을 한 줄로 놓고 A-B:3처럼 준 도로 수만큼 곡선, 건너뛰는 도로는 가운데 마을 위로)과
    // 색칠 지도(가로 4칸, 가운데 원 + 네 조각, 위 한 칸 + 아래 세 칸), 격자 최단 경로(A 왼쪽 아래 → B 오른쪽 위, 지나는 점 P,
    // 막힌 길 ×, 교차점마다 A에서 오는 경로 수), 원순열(원탁·정사각형·직사각형 탁자에 둘러앉기)을 그린다. 선 0.8pt. 선택은 필요 없다.
    function makeCountEngine() {
        var api = {label: "경우의 수", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathCount/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var DOT_RADIUS_MM = 0.8;
            var LABEL_GAP_MM = 1;
            var MODES = ["도로망", "색칠 지도", "격자 최단 경로", "원순열 (둘러앉기)"];
            var TABLES = ["원탁", "정사각형 탁자", "직사각형 탁자"];
            var MAPS = ["가로 4칸 (A~D)", "가운데 원 + 네 조각 (A~E)", "위 한 칸 + 아래 세 칸 (A~D)"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var mode = 0;
            var roadsText = "A-B:3, B-C:2, A-C:1";
            var townGapMm = 25;
            var roadGapMm = 4;
            var mapIndex = 1;
            var mapMm = 40;
            var gridCols = 5, gridRows = 3, gridCellMm = 8;
            var passText = "";
            var blockedText = "";
            var gridNumbers = true;
            var tableShape = 0, seatCount = 5, sideA = 2, sideB = 1, tableMm = 30;
            var seatNames = "";
            var rotationArrow = false;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var modeRow = win.add("group");
            modeRow.add("statictext", undefined, "종류:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;

            var roadPanel = addPanel(win, "도로망");
            var roadsRow = roadPanel.add("group");
            roadsRow.add("statictext", undefined, "도로:");
            var roadsInput = roadsRow.add("edittext", undefined, roadsText);
            roadsInput.preferredSize.width = 300;
            roadsInput.helpTip = "A-B:3, B-C:2처럼 '마을-마을:도로 수'를 쉼표로. 마을은 나온 순서대로 한 줄에 놓는다";
            var townControls = addValueRow(roadPanel, "마을 간격", "mm", townGapMm, 10, 60, 0.5, 1);
            var roadControls = addValueRow(roadPanel, "도로 간격", "mm", roadGapMm, 1.5, 10, 0.5, 1);
            var messageText = roadPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var mapPanel = addPanel(win, "색칠 지도");
            var mapRow = mapPanel.add("group");
            mapRow.add("statictext", undefined, "모양:");
            var mapList = mapRow.add("dropdownlist", undefined, MAPS);
            mapList.selection = mapIndex;
            var mapControls = addValueRow(mapPanel, "크기", "mm", mapMm, 20, 100, 1, 0);

            var gridPanel = addPanel(win, "격자 최단 경로 (A 왼쪽 아래 → B 오른쪽 위)");
            var colsControls = addValueRow(gridPanel, "가로", "칸", gridCols, 1, 10, 1, 0);
            var rowsControls = addValueRow(gridPanel, "세로", "칸", gridRows, 1, 10, 1, 0);
            var cellControls = addValueRow(gridPanel, "칸 크기", "mm", gridCellMm, 4, 20, 0.5, 1);
            var passRow = gridPanel.add("group");
            passRow.add("statictext", undefined, "지나는 점 P:");
            var passInput = passRow.add("edittext", undefined, passText);
            passInput.preferredSize.width = 60;
            passInput.helpTip = "A에서 가로로 2칸, 세로로 1칸이면 2,1. 비우면 없음";
            var gridNumbersCheck = passRow.add("checkbox", undefined, "교차점에 경로 수");
            gridNumbersCheck.value = gridNumbers;
            var blockedRow = gridPanel.add("group");
            blockedRow.add("statictext", undefined, "막힌 길:");
            var blockedInput = blockedRow.add("edittext", undefined, blockedText);
            blockedInput.preferredSize.width = 280;
            blockedInput.helpTip = "이웃한 두 교차점을 잇는 길. 1,0-2,0; 3,2-3,3처럼 세미콜론으로. 길 위에 ×를 그린다";
            var gridMessage = gridPanel.add("statictext", undefined, " ");
            gridMessage.preferredSize.width = 360;

            var seatPanel = addPanel(win, "원순열 (둘러앉기)");
            var tableRow = seatPanel.add("group");
            tableRow.add("statictext", undefined, "탁자:");
            var tableList = tableRow.add("dropdownlist", undefined, TABLES);
            tableList.selection = tableShape;
            var arrowCheck = tableRow.add("checkbox", undefined, "회전 화살표");
            arrowCheck.value = rotationArrow;
            var seatControls = addValueRow(seatPanel, "원탁 인원", "명", seatCount, 3, 10, 1, 0);
            var sideAControls = addValueRow(seatPanel, "긴 변 인원", "명", sideA, 1, 4, 1, 0);
            sideAControls.input.helpTip = "정사각형 탁자는 모든 변이 이 인원";
            var sideBControls = addValueRow(seatPanel, "짧은 변 인원", "명", sideB, 0, 4, 1, 0);
            var tableControls = addValueRow(seatPanel, "탁자 크기", "mm", tableMm, 10, 80, 1, 0);
            var namesRow = seatPanel.add("group");
            namesRow.add("statictext", undefined, "이름:");
            var namesInput = namesRow.add("edittext", undefined, seatNames);
            namesInput.preferredSize.width = 280;
            namesInput.helpTip = "위 가운데 자리부터 시계 방향으로 쉼표로 (A, B, 엄마, 아빠). 비우면 A, B, C …, 모자라면 빈 자리";
            var seatMessage = seatPanel.add("statictext", undefined, " ");
            seatMessage.preferredSize.width = 360;

            var sizePanel = addPanel(win, "글자 · 위치");
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var offsetXControls = addValueRow(sizePanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(sizePanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            roadsInput.onChanging = function() { roadsText = roadsInput.text; updatePreview(); };
            mapList.onChange = function() { mapIndex = mapList.selection ? mapList.selection.index : 0; updatePreview(); };
            bindValueRow(townControls, function(value) { townGapMm = value; });
            bindValueRow(roadControls, function(value) { roadGapMm = value; });
            bindValueRow(mapControls, function(value) { mapMm = value; });
            bindValueRow(colsControls, function(value) { gridCols = value; });
            bindValueRow(rowsControls, function(value) { gridRows = value; });
            bindValueRow(cellControls, function(value) { gridCellMm = value; });
            passInput.onChanging = function() { passText = passInput.text; updatePreview(); };
            blockedInput.onChanging = function() { blockedText = blockedInput.text; updatePreview(); };
            gridNumbersCheck.onClick = function() { gridNumbers = gridNumbersCheck.value; updatePreview(); };
            tableList.onChange = function() { tableShape = tableList.selection ? tableList.selection.index : 0; refreshEnabled(); updatePreview(); };
            arrowCheck.onClick = function() { rotationArrow = arrowCheck.value; updatePreview(); };
            bindValueRow(seatControls, function(value) { seatCount = value; });
            bindValueRow(sideAControls, function(value) { sideA = value; });
            bindValueRow(sideBControls, function(value) { sideB = value; });
            bindValueRow(tableControls, function(value) { tableMm = value; });
            namesInput.onChanging = function() { seatNames = namesInput.text; updatePreview(); };
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 도로를 못 읽으면 확정하지 않는다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                if (previewGroup === null) {
                    alert(mode === 2 ? gridMessage.text : messageText.text);
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
                roadPanel.enabled = mode === 0;
                mapPanel.enabled = mode === 1;
                gridPanel.enabled = mode === 2;
                seatPanel.enabled = mode === 3;
                seatControls.input.parent.enabled = tableShape === 0;
                sideAControls.input.parent.enabled = tableShape !== 0;
                sideBControls.input.parent.enabled = tableShape === 2;
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
                if (mode === 0) {
                    var roads = parseRoads(roadsText);
                    if (roads === null || roads.edges.length === 0) {
                        messageText.text = "도로를 읽지 못함 (예: A-B:3, B-C:2)";
                        return;
                    }
                    messageText.text = " ";
                    drawing = buildRoads(roads, townGapMm * MM_TO_PT, roadGapMm * MM_TO_PT);
                } else if (mode === 1) {
                    drawing = buildMap(mapIndex, mapMm * MM_TO_PT);
                } else if (mode === 2) {
                    var pass = String(passText).replace(/\s/g, "") === "" ? null : parseLatticePoint(passText);
                    var blocked = parseBlocked(blockedText);
                    if ((pass === null && String(passText).replace(/\s/g, "") !== "") || blocked === null) {
                        gridMessage.text = pass === null && String(passText).replace(/\s/g, "") !== "" ? "P를 읽지 못함 (예: 2,1)" : "막힌 길을 읽지 못함 (예: 1,0-2,0; 3,2-3,3)";
                        return;
                    }
                    drawing = buildGrid(Math.round(gridCols), Math.round(gridRows), gridCellMm * MM_TO_PT, pass, blocked, gridNumbers);
                    gridMessage.text = drawing.note;
                } else {
                    drawing = buildSeats(tableShape, Math.round(seatCount), Math.round(sideA), Math.round(sideB), tableMm * MM_TO_PT, seatNames, rotationArrow, fontPt);
                    seatMessage.text = drawing.note;
                }
                previewGroup = layer.groupItems.add();
                previewGroup.name = MODES[mode];
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var c = 0; c < drawing.circles.length; c++) addCircle(drawing.circles[c]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                var b = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed}
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
                path.strokeWidth = MAIN_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = true;
                path.fillColor = makeGray(0);
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

            // dir이 [0,0]이면 at에 가운데를 맞추고, 아니면 dir 쪽으로 간격을 둔다
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = label.small ? fontPt * 0.8 : fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (dir[0] === 0 && dir[1] === 0) ? 0 : (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자 GSMediumB1(기준선 +0.5pt). 마을·영역 이름은 똑바로
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    var korean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
                    attributes.textFont = korean ? korFont : engFont;
                    attributes.baselineShift = korean ? 0 : ENG_BASELINE_PT;
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-count.js)
            // -------------------------------------------------------
            // "A-B:3, B-C:2" → {towns:["A","B","C"], edges:[{from, to, count}]}. 못 읽으면 null (글자 단위로 읽는다)
            function parseRoads(text) {
                var parts = String(text).split(","), towns = [], edges = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    var dash = part.indexOf("-"), colon = part.indexOf(":");
                    if (dash <= 0 || colon <= dash + 1 || colon === part.length - 1) return null;
                    var from = part.substring(0, dash), to = part.substring(dash + 1, colon), countText = part.substring(colon + 1);
                    for (var c = 0; c < countText.length; c++) if (countText.charAt(c) < "0" || countText.charAt(c) > "9") return null;
                    var count = parseInt(countText, 10);
                    if (count < 1 || count > 8 || from === to) return null;
                    if (indexOf(towns, from) < 0) towns.push(from);
                    if (indexOf(towns, to) < 0) towns.push(to);
                    edges.push({ from: indexOf(towns, from), to: indexOf(towns, to), count: count });
                }
                return { towns: towns, edges: edges };
            }

            function indexOf(list, value) {
                for (var i = 0; i < list.length; i++) if (list[i] === value) return i;
                return -1;
            }

            // 마을은 가로 한 줄. 이웃 마을 사이 도로는 가운데 기준 위아래로 나란히, 건너뛰는 도로는 위로 크게 휜다
            function buildRoads(roads, townGap, roadGap) {
                var out = { lines: [], circles: [], dots: [], texts: [] };
                var positions = [];
                for (var i = 0; i < roads.towns.length; i++) positions.push([i * townGap, 0]);
                for (var e = 0; e < roads.edges.length; e++) {
                    var edge = roads.edges[e];
                    var p = positions[Math.min(edge.from, edge.to)], q = positions[Math.max(edge.from, edge.to)];
                    var skip = Math.abs(edge.to - edge.from) - 1;
                    for (var k = 0; k < edge.count; k++) {
                        var height = skip > 0 ? townGap * 0.35 * skip + roadGap * (k + 1) : roadGap * (k - (edge.count - 1) / 2);
                        out.lines.push({ points: bentRoad(p, q, height), closed: false });
                    }
                }
                for (var t = 0; t < positions.length; t++) {
                    out.dots.push(positions[t]);
                    out.texts.push({ text: roads.towns[t], at: positions[t], dir: [0, -1], clear: DOT_RADIUS_MM * 2.834645669 });
                }
                return out;
            }

            // p에서 q로 가는 길. 가운데가 height만큼(위 +) 휘는 곡선 (2차 베지어를 3차로), 0이면 직선
            function bentRoad(p, q, height) {
                var mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + height * 2];   // 2차 베지어 조절점: 곡선 꼭대기가 height
                var h1 = [p[0] + (mid[0] - p[0]) * 2 / 3, p[1] + (mid[1] - p[1]) * 2 / 3];
                var h2 = [q[0] + (mid[0] - q[0]) * 2 / 3, q[1] + (mid[1] - q[1]) * 2 / 3];
                return [{ anchor: p, left: p, right: h1 }, { anchor: q, left: h2, right: q }];
            }

            // 색칠 지도: 바깥 사각형(가로 size, 세로 size·0.7)과 나누는 선, 영역 이름
            function buildMap(index, size) {
                var out = { lines: [], circles: [], dots: [], texts: [] };
                var w = size, h = size * 0.7;
                out.lines.push({ points: [plain([0, 0]), plain([w, 0]), plain([w, h]), plain([0, h])], closed: true });
                function cut(a, b) { out.lines.push({ points: [plain(a), plain(b)], closed: false }); }
                function name(text, x, y) { out.texts.push({ text: text, at: [x, y], dir: [0, 0] }); }
                if (index === 0) {
                    for (var i = 1; i < 4; i++) cut([w * i / 4, 0], [w * i / 4, h]);
                    for (var j = 0; j < 4; j++) name("ABCD".charAt(j), w * (j + 0.5) / 4, h / 2);
                } else if (index === 1) {
                    cut([w / 2, 0], [w / 2, h]);
                    cut([0, h / 2], [w, h / 2]);
                    out.circles.push({ center: [w / 2, h / 2], radius: h * 0.22 });
                    name("A", w / 4, h * 3 / 4); name("B", w * 3 / 4, h * 3 / 4);
                    name("C", w / 4, h / 4); name("D", w * 3 / 4, h / 4); name("E", w / 2, h / 2);
                } else {
                    cut([0, h / 2], [w, h / 2]);
                    cut([w / 3, 0], [w / 3, h / 2]);
                    cut([w * 2 / 3, 0], [w * 2 / 3, h / 2]);
                    name("A", w / 2, h * 3 / 4);
                    for (var k = 0; k < 3; k++) name("BCD".charAt(k), w * (k + 0.5) / 3, h / 4);
                }
                return out;
            }

            function plain(p) { return { anchor: p, left: p, right: p }; }

            // 둘러앉기: 탁자(원·정사각형·직사각형)와 자리(흰 원 + 이름). 자리는 위 가운데부터 시계 방향.
            // 경우의 수 = n! / (같은 배치가 되는 회전 수): 원탁 n, 정사각형 4, 직사각형 2
            function buildSeats(shape, count, sideA, sideB, size, namesText, arrow, fontSize) {
                var out = { lines: [], circles: [], dots: [], texts: [], note: "" };
                var seatR = Math.max(fontSize * 0.9, size * 0.07), gap = seatR * 1.5;
                var seats = [], turns;
                if (shape === 0) {
                    var R = size / 2;
                    out.circles.push({ center: [0, 0], radius: R });
                    for (var i = 0; i < count; i++) {
                        var angle = Math.PI / 2 - 2 * Math.PI * i / count;
                        seats.push([(R + gap) * Math.cos(angle), (R + gap) * Math.sin(angle)]);
                    }
                    turns = count;
                } else {
                    var perLong = sideA, perShort = shape === 1 ? sideA : sideB;
                    var w = size, h = shape === 1 ? size : size * 0.55;
                    out.lines.push({ points: [plain([-w / 2, -h / 2]), plain([w / 2, -h / 2]), plain([w / 2, h / 2]), plain([-w / 2, h / 2])], closed: true });
                    // 위 변(왼→오), 오른쪽 변(위→아래), 아래 변(오→왼), 왼쪽 변(아래→위)
                    function side(k, from, to, normal) {
                        for (var j = 0; j < k; j++) {
                            var t = (j + 0.5) / k;
                            seats.push([from[0] + (to[0] - from[0]) * t + normal[0] * gap, from[1] + (to[1] - from[1]) * t + normal[1] * gap]);
                        }
                    }
                    side(perLong, [-w / 2, h / 2], [w / 2, h / 2], [0, 1]);
                    side(perShort, [w / 2, h / 2], [w / 2, -h / 2], [1, 0]);
                    side(perLong, [w / 2, -h / 2], [-w / 2, -h / 2], [0, -1]);
                    side(perShort, [-w / 2, -h / 2], [-w / 2, h / 2], [-1, 0]);
                    // 정사각형은 90°마다, 직사각형은 180°마다 같은 배치
                    turns = shape === 1 ? 4 : 2;
                }
                var names = String(namesText).replace(/^\s+|\s+$/g, "") === "" ? [] : String(namesText).split(",");
                for (var s = 0; s < seats.length; s++) {
                    out.circles.push({ center: seats[s], radius: seatR });
                    var name = names.length === 0 ? String.fromCharCode(65 + s) : (s < names.length ? names[s].replace(/^\s+|\s+$/g, "") : "");
                    if (name !== "") out.texts.push({ text: name, at: seats[s], dir: [0, 0] });
                }
                // 회전 화살표: 탁자 오른쪽 위 바깥에서 시계 방향으로 도는 호와 V자 화살촉
                if (arrow) {
                    var r = (shape === 0 ? size / 2 : Math.sqrt(size * size / 4 + (shape === 1 ? size * size / 4 : size * size * 0.0756))) + gap + seatR * 2.2;
                    var a0 = Math.PI * 0.42, a1 = Math.PI * 0.08, k = 4 / 3 * Math.tan((a0 - a1) / 4);
                    var p0 = [r * Math.cos(a0), r * Math.sin(a0)], p1 = [r * Math.cos(a1), r * Math.sin(a1)];
                    out.lines.push({ points: [
                        { anchor: p0, left: p0, right: [p0[0] + r * k * Math.sin(a0), p0[1] - r * k * Math.cos(a0)] },
                        { anchor: p1, left: [p1[0] - r * k * Math.sin(a1), p1[1] + r * k * Math.cos(a1)], right: p1 }
                    ], closed: false });
                    var tangent = [Math.sin(a1), -Math.cos(a1)], normal = [Math.cos(a1), Math.sin(a1)], head = seatR * 0.8;
                    out.lines.push({ points: [
                        plain([p1[0] - tangent[0] * head + normal[0] * head * 0.6, p1[1] - tangent[1] * head + normal[1] * head * 0.6]),
                        plain(p1),
                        plain([p1[0] - tangent[0] * head - normal[0] * head * 0.6, p1[1] - tangent[1] * head - normal[1] * head * 0.6])
                    ], closed: false });
                }
                var n = seats.length, total = factorial(n) / turns;
                var how = shape === 0 ? "(" + n + "-1)! = " : n + "!/" + turns + " = ";
                out.note = TABLES[shape] + " " + n + "명: " + how + total + "가지";
                return out;
            }

            function factorial(n) {
                var value = 1;
                for (var i = 2; i <= n; i++) value *= i;
                return value;
            }

            // 격자 교차점 "2,1" 또는 "(2,1)" → [2, 1]. 못 읽으면 null
            function parseLatticePoint(text) {
                var s = String(text).replace(/[\s()]/g, ""), comma = s.indexOf(",");
                if (comma <= 0 || comma === s.length - 1) return null;
                var x = wholeNumber(s.substring(0, comma)), y = wholeNumber(s.substring(comma + 1));
                return x === null || y === null ? null : [x, y];
            }

            function wholeNumber(text) {
                if (text === "") return null;
                for (var i = 0; i < text.length; i++) if (text.charAt(i) < "0" || text.charAt(i) > "9") return null;
                return parseInt(text, 10);
            }

            // "1,0-2,0; 3,2-3,3" → ["1,0-2,0", "3,2-3,3"] (작은 쪽이 앞). 이웃한 두 교차점이 아니면 null, 빈 칸은 []
            function parseBlocked(text) {
                var parts = String(text).split(";"), list = [];
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/\s/g, "");
                    if (part === "") continue;
                    var dash = part.indexOf("-");
                    if (dash < 0) return null;
                    var p = parseLatticePoint(part.substring(0, dash)), q = parseLatticePoint(part.substring(dash + 1));
                    if (p === null || q === null || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) !== 1) return null;
                    list.push(edgeKey(p, q));
                }
                return list;
            }

            function edgeKey(p, q) {
                var first = p[0] + p[1] < q[0] + q[1] ? p : q, second = first === p ? q : p;
                return first[0] + "," + first[1] + "-" + second[0] + "," + second[1];
            }

            // (x0, y0)에서 (x1, y1)까지 오른쪽·위로만 가는 최단 경로 수 (막힌 길 제외). 각 교차점의 수를 담은 표도 돌려준다
            function countPaths(x0, y0, x1, y1, blocked) {
                var ways = {};
                function key(x, y) { return x + "," + y; }
                function isBlocked(a, b) { for (var i = 0; i < blocked.length; i++) if (blocked[i] === edgeKey(a, b)) return true; return false; }
                for (var x = x0; x <= x1; x++) {
                    for (var y = y0; y <= y1; y++) {
                        if (x === x0 && y === y0) { ways[key(x, y)] = 1; continue; }
                        var total = 0;
                        if (x > x0 && !isBlocked([x - 1, y], [x, y])) total += ways[key(x - 1, y)];
                        if (y > y0 && !isBlocked([x, y - 1], [x, y])) total += ways[key(x, y - 1)];
                        ways[key(x, y)] = total;
                    }
                }
                return { total: ways[key(x1, y1)], ways: ways };
            }

            // 격자: 가로 cols칸, 세로 rows칸 (칸 크기 cell). 막힌 길에 ×, A·B(·P) 점과 이름, 교차점마다 A에서 오는 경로 수
            function buildGrid(cols, rows, cell, pass, blocked, numbers) {
                var out = { lines: [], circles: [], dots: [], texts: [], note: "" };
                for (var gx = 0; gx <= cols; gx++) out.lines.push({ points: [plain([gx * cell, 0]), plain([gx * cell, rows * cell])], closed: false });
                for (var gy = 0; gy <= rows; gy++) out.lines.push({ points: [plain([0, gy * cell]), plain([cols * cell, gy * cell])], closed: false });
                var inside = [];
                for (var b = 0; b < blocked.length; b++) {
                    var ends = blocked[b].split("-"), p = ends[0].split(","), q = ends[1].split(",");
                    var px = parseInt(p[0], 10), py = parseInt(p[1], 10), qx = parseInt(q[0], 10), qy = parseInt(q[1], 10);
                    if (Math.max(px, qx) > cols || Math.max(py, qy) > rows) continue;
                    inside.push(blocked[b]);
                    var mx = (px + qx) / 2 * cell, my = (py + qy) / 2 * cell, s = cell * 0.14;
                    out.lines.push({ points: [plain([mx - s, my - s]), plain([mx + s, my + s])], closed: false });
                    out.lines.push({ points: [plain([mx - s, my + s]), plain([mx + s, my - s])], closed: false });
                }
                var all = countPaths(0, 0, cols, rows, inside);
                out.dots.push([0, 0], [cols * cell, rows * cell]);
                out.texts.push({ text: "A", at: [0, 0], dir: [-0.7071, -0.7071] }, { text: "B", at: [cols * cell, rows * cell], dir: [0.7071, 0.7071] });
                if (numbers) {
                    for (var x = 0; x <= cols; x++) {
                        for (var y = 0; y <= rows; y++) {
                            if ((x === 0 && y === 0)) continue;
                            out.texts.push({ text: String(all.ways[x + "," + y]), at: [x * cell, y * cell], dir: [-0.7071, 0.7071], small: true });
                        }
                    }
                }
                var note = "A → B 최단 경로 " + all.total + "가지";
                if (pass !== null) {
                    if (pass[0] > cols || pass[1] > rows) note += " (P가 격자 밖)";
                    else {
                        var first = countPaths(0, 0, pass[0], pass[1], inside), second = countPaths(pass[0], pass[1], cols, rows, inside);
                        out.dots.push([pass[0] * cell, pass[1] * cell]);
                        out.texts.push({ text: "P", at: [pass[0] * cell, pass[1] * cell], dir: [0.7071, -0.7071] });
                        note += ", P를 지나는 경로 " + first.total + " × " + second.total + " = " + first.total * second.total + "가지";
                    }
                }
                out.note = note;
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
                var parts = ["v3", mode, encodeURIComponent(roadsText), townGapMm, roadGapMm, mapIndex, mapMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0",
                    gridCols, gridRows, gridCellMm, encodeURIComponent(passText), encodeURIComponent(blockedText), gridNumbers ? "1" : "0",
                    tableShape, seatCount, sideA, sideB, tableMm, encodeURIComponent(seatNames), rotationArrow ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v3" || p.length !== 24) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    roadsText = decodeURIComponent(p[2]);
                    townGapMm = restoreNumber(p[3], townGapMm, 10, 60);
                    roadGapMm = restoreNumber(p[4], roadGapMm, 1.5, 10);
                    mapIndex = Math.round(restoreNumber(p[5], mapIndex, 0, MAPS.length - 1));
                    mapMm = restoreNumber(p[6], mapMm, 20, 100);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    offsetXmm = restoreNumber(p[8], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[9], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[10] === "1";
                    gridCols = Math.round(restoreNumber(p[11], gridCols, 1, 10));
                    gridRows = Math.round(restoreNumber(p[12], gridRows, 1, 10));
                    gridCellMm = restoreNumber(p[13], gridCellMm, 4, 20);
                    passText = decodeURIComponent(p[14]);
                    blockedText = decodeURIComponent(p[15]);
                    gridNumbers = p[16] === "1";
                    tableShape = Math.round(restoreNumber(p[17], tableShape, 0, TABLES.length - 1));
                    seatCount = Math.round(restoreNumber(p[18], seatCount, 3, 10));
                    sideA = Math.round(restoreNumber(p[19], sideA, 1, 4));
                    sideB = Math.round(restoreNumber(p[20], sideB, 0, 4));
                    tableMm = restoreNumber(p[21], tableMm, 10, 80);
                    seatNames = decodeURIComponent(p[22]);
                    rotationArrow = p[23] === "1";
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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

    // ==== 확률분포 ====
    // 확률분포 그림: 정규분포 N(m, σ²) 곡선(두 번째 분포를 겹쳐 비교할 수 있다)과 이항분포 B(n, p) 막대(정규분포 근사 곡선).
    // P(a≤X≤b), P(X≥a), P(X≤b) 영역을 칠하고, 확률(표준화한 Z 범위 포함)·평균·분산을 창에 보여 준다.
    // 축 아래 글자는 값(50, 60) 또는 문자(m, a, b, m+σ)로 고른다. 세로축은 두지 않는다(교과서·평가원 그림처럼).
    // 선 두께: 곡선 0.8pt, 축·막대 테두리 0.4pt, 평균 점선 0.3pt. 선택은 필요 없다.
    function makeDistributionEngine() {
        var api = {label: "확률분포", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathDistribution/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(σ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var CURVE_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var TAIL_SIGMAS = 3.5;   // 곡선은 평균에서 ±3.5σ까지 (끝 높이가 꼭대기의 0.2%라 축에 닿아 보인다)
            var BAR_RATIO = 0.6;     // 막대 폭 / 막대 간격
            var MODES = ["정규분포", "이항분포"];
            var AXIS_NAMES = ["x", "z", "없음"];
            var SHADES = ["칠하지 않음", "a ≤ X ≤ b", "X ≥ a", "X ≤ b"];
            var LABELS = ["값", "문자 (m, a, b)"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["second", "meanLine", "sigmaTicks", "approx"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var mode = 0;
            var axisName = 0;
            var mean = 50, sigma = 10;
            var mean2 = 60, sigma2 = 5;
            var trials = 10, chance = 0.5;
            var shade = 1;
            var labelKind = 0;
            var aValue = 40, bValue = 70;
            var widthMm = 80, heightMm = 25;
            var shadeK = 20;
            var fontPt = 8;
            var opt = { second: false, meanLine: true, sigmaTicks: false, approx: false };
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var distPanel = addPanel(win, "분포");
            var modeRow = distPanel.add("group");
            modeRow.add("statictext", undefined, "종류:");
            var modeList = modeRow.add("dropdownlist", undefined, MODES);
            modeList.selection = mode;
            modeRow.add("statictext", undefined, "축 이름:");
            var axisList = modeRow.add("dropdownlist", undefined, AXIS_NAMES);
            axisList.selection = axisName;
            var meanControls = addValueRow(distPanel, "평균 m", "", mean, -500, 500, 0.5, 1);
            var sigmaControls = addValueRow(distPanel, "표준편차 σ", "", sigma, 0.1, 100, 0.1, 1);
            var secondRow = distPanel.add("group");
            var secondCheck = secondRow.add("checkbox", undefined, "두 번째 정규분포 겹치기");
            bindOption(secondCheck, "second");
            var mean2Controls = addValueRow(distPanel, "평균 m₂", "", mean2, -500, 500, 0.5, 1);
            var sigma2Controls = addValueRow(distPanel, "표준편차 σ₂", "", sigma2, 0.1, 100, 0.1, 1);
            var trialsControls = addValueRow(distPanel, "시행 횟수 n", "", trials, 1, 40, 1, 0);
            var chanceControls = addValueRow(distPanel, "확률 p", "", chance, 0.01, 0.99, 0.01, 2);

            var probPanel = addPanel(win, "확률");
            var shadeRow = probPanel.add("group");
            shadeRow.add("statictext", undefined, "칠하기:");
            var shadeList = shadeRow.add("dropdownlist", undefined, SHADES);
            shadeList.selection = shade;
            shadeRow.add("statictext", undefined, "글자:");
            var labelList = shadeRow.add("dropdownlist", undefined, LABELS);
            labelList.selection = labelKind;
            var aControls = addValueRow(probPanel, "a", "", aValue, -500, 500, 0.5, 1);
            var bControls = addValueRow(probPanel, "b", "", bValue, -500, 500, 0.5, 1);
            var shadeControls = addValueRow(probPanel, "음영", "K", shadeK, 5, 60, 5, 0);

            var stylePanel = addPanel(win, "표시");
            var widthControls = addValueRow(stylePanel, "가로 길이", "mm", widthMm, 30, 200, 1, 0);
            var heightControls = addValueRow(stylePanel, "높이", "mm", heightMm, 10, 100, 1, 0);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var checkRow = stylePanel.add("group");
            var meanCheck = checkRow.add("checkbox", undefined, "평균 점선");
            bindOption(meanCheck, "meanLine");
            var sigmaCheck = checkRow.add("checkbox", undefined, "m±σ, m±2σ 눈금");
            bindOption(sigmaCheck, "sigmaTicks");
            var approxCheck = checkRow.add("checkbox", undefined, "정규분포 근사");
            approxCheck.helpTip = "이항분포 막대 위에 N(np, np(1-p)) 곡선을 겹친다";
            bindOption(approxCheck, "approx");

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            modeList.onChange = function() {
                mode = modeList.selection ? modeList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            axisList.onChange = function() { axisName = axisList.selection ? axisList.selection.index : 0; updatePreview(); };
            bindValueRow(meanControls, function(value) { mean = value; });
            bindValueRow(sigmaControls, function(value) { sigma = value; });
            bindValueRow(mean2Controls, function(value) { mean2 = value; });
            bindValueRow(sigma2Controls, function(value) { sigma2 = value; });
            bindValueRow(trialsControls, function(value) { trials = value; });
            bindValueRow(chanceControls, function(value) { chance = value; });
            shadeList.onChange = function() { shade = shadeList.selection ? shadeList.selection.index : 0; refreshEnabled(); updatePreview(); };
            labelList.onChange = function() { labelKind = labelList.selection ? labelList.selection.index : 0; updatePreview(); };
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(shadeControls, function(value) { shadeK = value; });
            bindValueRow(widthControls, function(value) { widthMm = value; });
            bindValueRow(heightControls, function(value) { heightMm = value; });
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

            function refreshEnabled() {
                var normal = mode === 0;
                meanControls.input.parent.enabled = normal;
                sigmaControls.input.parent.enabled = normal;
                secondRow.enabled = normal;
                mean2Controls.input.parent.enabled = normal;
                sigma2Controls.input.parent.enabled = normal;
                trialsControls.input.parent.enabled = !normal;
                chanceControls.input.parent.enabled = !normal;
                sigmaCheck.enabled = normal;
                approxCheck.enabled = !normal;
                aControls.input.parent.enabled = shade === 1 || shade === 2;
                bControls.input.parent.enabled = shade === 1 || shade === 3;
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
                var o = {
                    width: widthMm * MM_TO_PT, height: heightMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, shadeK: shadeK,
                    axisName: axisName < 2 ? AXIS_NAMES[axisName] : "", shade: shade, a: aValue, b: bValue, letters: labelKind === 1,
                    meanLine: opt.meanLine
                };
                var drawing;
                if (mode === 0) {
                    o.curves = [{ m: mean, s: sigma }];
                    if (opt.second) o.curves.push({ m: mean2, s: sigma2 });
                    o.sigmaTicks = opt.sigmaTicks;
                    drawing = buildNormal(o);
                } else {
                    o.n = Math.round(trials);
                    o.p = chance;
                    o.approx = opt.approx;
                    drawing = buildBinomial(o);
                }
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join(" · ") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "확률분포";
                for (var s = 0; s < drawing.fills.length; s++) addFill(drawing.fills[s]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                previewGroup.translate(viewCenter[0] - o.width / 2 + offsetXmm * MM_TO_PT, viewCenter[1] - o.height / 2 + offsetYmm * MM_TO_PT);
            }

            // 칠한 영역·막대: {points:[{anchor,left,right}], k, stroked}
            function addFill(fill) {
                var path = previewGroup.pathItems.add();
                setBezier(path, fill.points);
                path.closed = true;
                path.filled = fill.k > 0;
                if (fill.k > 0) path.fillColor = makeGray(fill.k);
                path.stroked = !!fill.stroked;
                if (fill.stroked) {
                    path.strokeColor = makeGray(100);
                    path.strokeWidth = AXIS_PT;
                    path.strokeJoin = StrokeJoin.MITERENDJOIN;
                }
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"curve"|"guide"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                setBezier(path, line.points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "curve" ? CURVE_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT);
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.ROUNDENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sub: 아래첨자 글자 위치
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                if (label.sub) {
                    for (var s = 0; s < label.sub.length; s++) {
                        var subAttributes = frame.textRange.characters[label.sub[s]].characterAttributes;
                        subAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
                    }
                }
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(σ)는 HancomEQN. 숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-distribution.js). 그림은 (0,0)~(width, height)
            // -------------------------------------------------------
            // 정규분포: o.curves [{m, s}], 가장 높은 꼭대기가 height, 모든 곡선의 ±3.5σ가 가로 길이에 들어간다
            function buildNormal(o) {
                var out = { fills: [], lines: [], arrows: [], texts: [], notes: [] };
                var lo = Infinity, hi = -Infinity, peak = 0;
                for (var i = 0; i < o.curves.length; i++) {
                    var c = o.curves[i];
                    lo = Math.min(lo, c.m - TAIL_SIGMAS * c.s);
                    hi = Math.max(hi, c.m + TAIL_SIGMAS * c.s);
                    peak = Math.max(peak, normalDensity(c.m, c.m, c.s));
                }
                var sx = o.width / (hi - lo), sy = o.height / peak;
                function X(v) { return (v - lo) * sx; }
                var first = o.curves[0];
                var range = shadeRange(o, lo, hi);

                // 칠하기 (첫 번째 분포)
                if (range !== null) {
                    var edge = normalPoints(first.m, first.s, range[0], range[1], lo, sx, sy);
                    var closing = straight([[X(range[1]), 0], [X(range[0]), 0]]);
                    out.fills.push({ points: edge.concat(closing), k: o.shadeK });
                    // 한쪽 확률은 그림 밖(±3.5σ 너머)의 꼬리까지 더한다
                    var upper = o.shade === 2 ? 1 : normalCdf((range[1] - first.m) / first.s);
                    var lower = o.shade === 3 ? 0 : normalCdf((range[0] - first.m) / first.s);
                    var p = upper - lower;
                    out.notes.push(probabilityText(o, range, first) + " = " + formatValue(p, 4));
                }

                addAxis(out, o, 0, o.width);
                for (var k = 0; k < o.curves.length; k++) {
                    var curve = o.curves[k];
                    out.lines.push({ points: normalPoints(curve.m, curve.s, curve.m - TAIL_SIGMAS * curve.s, curve.m + TAIL_SIGMAS * curve.s, lo, sx, sy), kind: "curve" });
                    if (o.meanLine) out.lines.push({ points: straight([[X(curve.m), 0], [X(curve.m), normalDensity(curve.m, curve.m, curve.s) * sy]]), kind: "guide" });
                }

                // 축 아래 글자: 평균, (m±σ, m±2σ), a·b. 같은 자리의 글자는 하나만
                var marks = [];
                for (var m = 0; m < o.curves.length; m++) {
                    var name = o.curves.length > 1 ? "m" + (m + 1) : "m";
                    marks.push({ v: o.curves[m].m, text: o.letters ? name : formatValue(o.curves[m].m, 2), sub: o.letters && o.curves.length > 1 ? [1] : null });
                }
                if (o.sigmaTicks) {
                    var steps = [-2, -1, 1, 2];
                    for (var st = 0; st < steps.length; st++) {
                        var n = steps[st], letter = (n < 0 ? "-" : "+") + (Math.abs(n) === 1 ? "" : String(Math.abs(n))) + "σ";
                        marks.push({ v: first.m + n * first.s, text: o.letters ? "m" + letter : formatValue(first.m + n * first.s, 2) });
                    }
                }
                addRangeMarks(marks, o, range);
                placeMarks(out, marks, X, o.tick);
                return out;
            }

            // 이항분포 B(n, p): k = 0 … n 막대, 가장 높은 막대가 height. 칠하는 범위의 막대는 K로
            function buildBinomial(o) {
                var out = { fills: [], lines: [], arrows: [], texts: [], notes: [] };
                var n = o.n, p = o.p, probs = [], top = 0;
                for (var k = 0; k <= n; k++) {
                    probs.push(binomialProbability(n, k, p));
                    top = Math.max(top, probs[k]);
                }
                var mu = n * p, variance = n * p * (1 - p), sd = Math.sqrt(variance);
                if (o.approx) top = Math.max(top, normalDensity(mu, mu, sd));
                var step = o.width / (n + 2), sy = o.height / top;
                function X(v) { return (v + 1) * step; }
                var range = shadeRange(o, -0.5, n + 0.5);
                var sum = 0;
                for (var b = 0; b <= n; b++) {
                    var shaded = range !== null && b >= range[0] - 1e-9 && b <= range[1] + 1e-9;
                    if (shaded) sum += probs[b];
                    var h = probs[b] * sy, half = step * BAR_RATIO / 2;
                    if (h < 0.05) continue;
                    out.fills.push({ points: straight([[X(b) - half, 0], [X(b) + half, 0], [X(b) + half, h], [X(b) - half, h]]), k: shaded ? o.shadeK : 0, stroked: true });
                }
                out.notes.push("E(X) = " + formatValue(mu, 2) + ", V(X) = " + formatValue(variance, 2) + ", σ(X) = " + formatValue(sd, 2));
                if (range !== null) out.notes.push(probabilityText(o, range, null) + " = " + formatValue(sum, 4));

                addAxis(out, o, 0, o.width);
                if (o.approx && sd > 0) {
                    var from = Math.max(-1, mu - TAIL_SIGMAS * sd), to = Math.min(n + 1, mu + TAIL_SIGMAS * sd);
                    out.lines.push({ points: normalPoints(mu, sd, from, to, -1, step, sy), kind: "curve" });
                }
                if (o.meanLine) out.lines.push({ points: straight([[X(mu), 0], [X(mu), o.height]]), kind: "guide" });

                // 막대 아래 k (많으면 5칸마다)
                var every = n <= 15 ? 1 : 5, marks = [];
                for (var t = 0; t <= n; t += every) marks.push({ v: t, text: String(t), tickless: true });
                addRangeMarks(marks, o, range);
                placeMarks(out, marks, X, o.tick);
                return out;
            }

            // 칠할 x 범위 [시작, 끝] (그림 범위로 자른다). 칠하지 않으면 null
            function shadeRange(o, lo, hi) {
                if (o.shade === 0) return null;
                var from = o.shade === 1 ? Math.min(o.a, o.b) : (o.shade === 2 ? o.a : lo);
                var to = o.shade === 1 ? Math.max(o.a, o.b) : (o.shade === 2 ? hi : o.b);
                from = Math.max(from, lo);
                to = Math.min(to, hi);
                return to - from > 1e-9 ? [from, to] : null;
            }

            // a·b 글자 (칠하는 쪽 끝만)
            function addRangeMarks(marks, o, range) {
                if (range === null) return;
                if (o.shade !== 3) marks.push({ v: o.a, text: o.letters ? "a" : formatValue(o.a, 2) });
                if (o.shade !== 2) marks.push({ v: o.b, text: o.letters ? "b" : formatValue(o.b, 2) });
            }

            function placeMarks(out, marks, X, tick) {
                var used = [];
                for (var i = 0; i < marks.length; i++) {
                    var x = X(marks[i].v), taken = false;
                    for (var j = 0; j < used.length; j++) if (Math.abs(used[j] - x) < 0.5) taken = true;
                    if (taken) continue;
                    used.push(x);
                    if (!marks[i].tickless) out.lines.push({ points: straight([[x, -tick / 2], [x, tick / 2]]), kind: "axis" });
                    var label = { text: marks[i].text, at: [x, 0], dir: [0, -1], clear: tick / 2, upright: !isNaN(parseFloat(marks[i].text)) };
                    if (marks[i].sub) label.sub = marks[i].sub;
                    out.texts.push(label);
                }
            }

            function addAxis(out, o, left, right) {
                var margin = o.width * 0.04, end = right + margin + ARROW.length;
                out.lines.push({ points: straight([[left - margin, 0], [end - ARROW.length + ARROW.notch, 0]]), kind: "axis" });
                out.arrows.push({ tip: [end, 0], dir: [1, 0] });
                if (o.axisName) out.texts.push({ text: o.axisName, at: [end, 0], dir: [0, -1] });
            }

            // P(a≤X≤b) = P(-1≤Z≤2). first가 없으면(이항분포) 표준화하지 않는다
            function probabilityText(o, range, first) {
                var v = o.axisName === "z" ? "Z" : "X";
                function part(a, b, fa, fb) {
                    if (o.shade === 2) return "P(" + v + "≥" + fa(a) + ")";
                    if (o.shade === 3) return "P(" + v + "≤" + fb(b) + ")";
                    return "P(" + fa(a) + "≤" + v + "≤" + fb(b) + ")";
                }
                function plain(value) { return formatValue(value, 2); }
                var text = part(range[0], range[1], plain, plain);
                if (first && v === "X") {
                    v = "Z";
                    text += " = " + part(range[0], range[1],
                        function(value) { return formatValue((value - first.m) / first.s, 2); },
                        function(value) { return formatValue((value - first.m) / first.s, 2); });
                }
                return text;
            }

            // 정규분포 곡선 [from, to]를 베지어로. 앵커는 끝점과 그 사이 평균에서 0.5σ 간격 (에르미트 → 베지어)
            function normalPoints(m, s, from, to, lo, sx, sy) {
                var xs = [from], k = Math.floor((from - m) / (s / 2)) + 1;
                for (var x = m + k * s / 2; x < to - s * 1e-6; x = m + (++k) * s / 2) if (x > from + s * 1e-6) xs.push(x);
                xs.push(to);
                var out = [];
                for (var i = 0; i < xs.length; i++) {
                    var v = xs[i], y = normalDensity(v, m, s), slope = -(v - m) / (s * s) * y;
                    var anchor = [(v - lo) * sx, y * sy], left = anchor, right = anchor;
                    if (i > 0) {
                        var hl = (v - xs[i - 1]) / 3;
                        left = [(v - hl - lo) * sx, (y - slope * hl) * sy];
                    }
                    if (i < xs.length - 1) {
                        var hr = (xs[i + 1] - v) / 3;
                        right = [(v + hr - lo) * sx, (y + slope * hr) * sy];
                    }
                    out.push({ anchor: anchor, left: left, right: right });
                }
                return out;
            }

            function normalDensity(x, m, s) {
                var z = (x - m) / s;
                return Math.exp(-z * z / 2) / (s * Math.sqrt(2 * Math.PI));
            }

            // 표준정규분포의 누적확률 P(Z≤z). erf 근사 (Abramowitz–Stegun 7.1.26, 오차 1.5e-7)
            function normalCdf(z) {
                var x = Math.abs(z) / Math.SQRT2, t = 1 / (1 + 0.3275911 * x);
                var erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
                return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
            }

            function binomialProbability(n, k, p) {
                var c = 1;
                for (var i = 1; i <= k; i++) c = c * (n - k + i) / i;
                return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
            }

            function straight(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return points;
            }

            // 소수 digits자리까지, 뒤의 0은 뺀다
            function formatValue(v, digits) {
                var scale = Math.pow(10, digits), r = Math.round(v * scale) / scale;
                return String(r === 0 ? 0 : r);
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
                var parts = ["v1", mode, axisName, mean, sigma, mean2, sigma2, trials, chance, shade, labelKind, aValue, bValue, shadeK,
                    widthMm, heightMm, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 21 || p[17].length !== FLAG_KEYS.length) return;
                try {
                    mode = Math.round(restoreNumber(p[1], mode, 0, MODES.length - 1));
                    axisName = Math.round(restoreNumber(p[2], axisName, 0, AXIS_NAMES.length - 1));
                    mean = restoreNumber(p[3], mean, -500, 500);
                    sigma = restoreNumber(p[4], sigma, 0.1, 100);
                    mean2 = restoreNumber(p[5], mean2, -500, 500);
                    sigma2 = restoreNumber(p[6], sigma2, 0.1, 100);
                    trials = Math.round(restoreNumber(p[7], trials, 1, 40));
                    chance = restoreNumber(p[8], chance, 0.01, 0.99);
                    shade = Math.round(restoreNumber(p[9], shade, 0, SHADES.length - 1));
                    labelKind = Math.round(restoreNumber(p[10], labelKind, 0, LABELS.length - 1));
                    aValue = restoreNumber(p[11], aValue, -500, 500);
                    bValue = restoreNumber(p[12], bValue, -500, 500);
                    shadeK = restoreNumber(p[13], shadeK, 5, 60);
                    widthMm = restoreNumber(p[14], widthMm, 30, 200);
                    heightMm = restoreNumber(p[15], heightMm, 10, 100);
                    fontPt = restoreNumber(p[16], fontPt, 5, 14);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[17].charAt(i) === "1";
                    offsetXmm = restoreNumber(p[18], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[19], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[20] === "1";
                } catch (restoreError) {}
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
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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

    // ==== 이차곡선 ====
    // 이차곡선: 포물선 y²=4px(x²=4py), 타원 x²/a²+y²/b²=1, 쌍곡선 x²/a²-y²/b²=±1을 좌표평면에 그린다. 중심(꼭짓점)을 (m, n)으로 옮길 수 있다.
    // 초점 F·F′, 꼭짓점, 준선(포물선)·점근선(쌍곡선), 곡선 위의 점 P와 초점까지 선분(포물선은 준선까지 수선 PH), P에서의 접선을 고른다.
    // 계산은 주축이 가로인 표준형에서 하고 세로면 x·y를 바꾼다. 타원은 4점 베지어, 포물선은 정확한 이차 베지어, 쌍곡선은 에르미트 베지어.
    // 선 두께: 축 0.4pt, 곡선·접선 0.8pt, 초점까지 선분 0.4pt, 준선·점근선·수선 점선 0.3pt. 선택은 필요 없다.
    function makeConicEngine() {
        var api = {label: "이차곡선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathConic/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(′, √ …)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var THIN_PT = 0.4;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var KAPPA = 0.5522847498;   // 타원을 베지어 4개로
            var KINDS = ["포물선", "타원", "쌍곡선"];
            var DIRECTIONS = ["가로 (y²=4px, =1)", "세로 (x²=4py, =-1)"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["foci", "vertices", "equation", "guides", "coords", "point", "focalLines", "tangent", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 1;
            var direction = 0;
            var pValue = 1;
            var aValue = 3, bValue = 2;
            var mValue = 0, nValue = 0;
            var angle = 60;
            var opt = { foci: true, vertices: true, equation: true, guides: true, coords: false, point: false, focalLines: true, tangent: false,
                grid: false, numbers: true };
            var unitMm = 6;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var curvePanel = addPanel(win, "곡선");
            var kindRow = curvePanel.add("group");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;
            var directionList = kindRow.add("dropdownlist", undefined, DIRECTIONS);
            directionList.selection = direction;
            directionList.helpTip = "포물선: 가로 y²=4px, 세로 x²=4py. 쌍곡선: 가로 …=1, 세로 …=-1. 타원은 a, b 중 큰 쪽이 장축";
            var pControls = addValueRow(curvePanel, "p", "", pValue, -5, 5, 0.5, 1);
            var aControls = addValueRow(curvePanel, "a", "", aValue, 0.5, 10, 0.5, 1);
            var bControls = addValueRow(curvePanel, "b", "", bValue, 0.5, 10, 0.5, 1);
            var mControls = addValueRow(curvePanel, "중심 이동 m", "", mValue, -10, 10, 0.5, 1);
            var nControls = addValueRow(curvePanel, "중심 이동 n", "", nValue, -10, 10, 0.5, 1);

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["foci", "초점 F, F′"], ["vertices", "꼭짓점"], ["equation", "식 글자"]]);
            addCheckRow(markPanel, [["guides", "준선·점근선"], ["coords", "좌표 함께"], ["point", "곡선 위의 점 P"]]);
            addCheckRow(markPanel, [["focalLines", "P에서 초점까지"], ["tangent", "P에서의 접선"]]);
            var angleControls = addValueRow(markPanel, "P 위치", "°", angle, -180, 180, 5, 0);
            angleControls.input.helpTip = "타원 (a cos θ, b sin θ), 쌍곡선 (a/cos θ, b tan θ), 포물선은 θ/2의 tan으로 곡선 전체를 돈다";

            var planePanel = addPanel(win, "좌표평면");
            var unitControls = addValueRow(planePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(planePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(planePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

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
            directionList.onChange = function() { direction = directionList.selection ? directionList.selection.index : 0; updatePreview(); };
            bindValueRow(pControls, function(value) { pValue = value; });
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(mControls, function(value) { mValue = value; });
            bindValueRow(nControls, function(value) { nValue = value; });
            bindValueRow(angleControls, function(value) { angle = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. p = 0이면 확정하지 않는다
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
                pControls.input.parent.enabled = kind === 0;
                aControls.input.parent.enabled = kind !== 0;
                bControls.input.parent.enabled = kind !== 0;
                directionList.enabled = kind !== 1;
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
                if (kind === 0 && Math.abs(pValue) < 1e-9) {
                    messageText.text = "포물선은 p가 0이 아니어야 함";
                    return;
                }
                var drawing = buildConic({
                    kind: kind, vertical: direction === 1, p: pValue, a: aValue, b: bValue, m: mValue, n: nValue, angle: angle,
                    unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, foci: opt.foci, vertices: opt.vertices, equation: opt.equation,
                    guides: opt.guides, coords: opt.coords, point: opt.point, focalLines: opt.focalLines, tangent: opt.tangent,
                    grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "이차곡선";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, kind:"axis"|"main"|"thin"|"guide"|"grid"}
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
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "thin" || line.kind === "axis" ? (line.kind === "thin" ? THIN_PT : AXIS_PT) : GUIDE_PT);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(′, √)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-conic.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            // 표준형(주축 가로, 중심 원점)의 모양: A(주축 쪽), B, c(초점), R(그리는 반폭), 세로인지
            function conicShape(o) {
                var shape = { kind: o.kind, vertical: o.vertical, A: 0, B: 0, c: 0, p: o.p };
                if (o.kind === 0) {
                    shape.c = o.p;
                    shape.R = Math.ceil(Math.abs(o.p) * 3) + 1;
                } else if (o.kind === 1) {
                    shape.vertical = o.b > o.a;
                    shape.A = Math.max(o.a, o.b);
                    shape.B = Math.min(o.a, o.b);
                    shape.c = Math.sqrt(shape.A * shape.A - shape.B * shape.B);
                    shape.R = Math.ceil(shape.A) + 1;
                } else {
                    shape.A = o.vertical ? o.b : o.a;
                    shape.B = o.vertical ? o.a : o.b;
                    shape.c = Math.sqrt(o.a * o.a + o.b * o.b);
                    shape.R = Math.ceil(Math.max(shape.c, shape.B) * 1.5) + 1;
                }
                return shape;
            }

            function buildConic(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var shape = conicShape(o), R = shape.R, A = shape.A, B = shape.B, c = shape.c, p = o.p;
                var center = [o.m, o.n];
                // 표준형 좌표 → 그림 좌표(pt)
                function W(q) { var v = shape.vertical ? [q[1], q[0]] : q; return [(center[0] + v[0]) * u, (center[1] + v[1]) * u]; }
                function real(q) { var v = shape.vertical ? [q[1], q[0]] : q; return [center[0] + v[0], center[1] + v[1]]; }
                function outward(q) { var v = shape.vertical ? [q[1], q[0]] : q; return unit(v); }
                function pathOf(points) {
                    var list = [];
                    for (var i = 0; i < points.length; i++) list.push({ anchor: W(points[i].anchor), left: W(points[i].left), right: W(points[i].right) });
                    return list;
                }

                // 축: 원점과 그리는 범위가 들어가게
                var xMin = Math.floor(Math.min(0, center[0] - R)), xMax = Math.ceil(Math.max(0, center[0] + R));
                var yMin = Math.floor(Math.min(0, center[1] - R)), yMax = Math.ceil(Math.max(0, center[1] + R));
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

                // 곡선
                var curves = conicCurves(shape);
                for (var k = 0; k < curves.length; k++) out.lines.push({ points: pathOf(curves[k].points), closed: curves[k].closed, kind: "main" });

                // 준선(포물선)·점근선(쌍곡선)
                if (o.guides && o.kind === 0) out.lines.push(straight([W([-p, -R]), W([-p, R])], "guide"));
                if (o.guides && o.kind === 2) {
                    var s = R / Math.max(A, B);
                    out.lines.push(straight([W([-A * s, -B * s]), W([A * s, B * s])], "guide"));
                    out.lines.push(straight([W([-A * s, B * s]), W([A * s, -B * s])], "guide"));
                }

                // 초점
                var foci = o.kind === 0 ? [[p, 0]] : (c > 1e-9 ? [[c, 0], [-c, 0]] : []);
                if (o.foci) {
                    var focusNames = ["F", "F′"];
                    for (var f = 0; f < foci.length; f++) {
                        out.dots.push(W(foci[f]));
                        var name = focusNames[f] + (o.coords ? pointText(real(foci[f])) : "");
                        out.texts.push({ text: name, at: W(foci[f]), dir: outward([0, -1]), upright: true });
                    }
                }
                // 꼭짓점: 포물선 V(원점이면 O라 생략), 타원 A A′ B B′, 쌍곡선 A A′
                if (o.vertices) {
                    var tips = o.kind === 0 ? [[[0, 0], "V"]] : [[[A, 0], "A"], [[-A, 0], "A′"]];
                    if (o.kind === 1) tips.push([[0, B], "B"], [[0, -B], "B′"]);
                    for (var v = 0; v < tips.length; v++) {
                        var tipReal = real(tips[v][0]);
                        if (Math.abs(tipReal[0]) < 1e-9 && Math.abs(tipReal[1]) < 1e-9) continue;
                        // 타원은 바깥쪽, 포물선은 열린 반대쪽, 쌍곡선은 두 가지 사이 쪽 (축 선을 피해 아래로 비스듬히)
                        var side = o.kind === 0 ? (p > 0 ? -1 : 1) : (tips[v][0][0] > 0 ? -1 : 1);
                        var dir = o.kind === 1 ? outward(tips[v][0]) : outward([side, -1]);
                        var label = tips[v][1] + (o.coords ? pointText(tipReal) : "");
                        out.texts.push({ text: label, at: W(tips[v][0]), dir: dir, upright: true });
                    }
                }

                // 식 글자 (그리는 범위 오른쪽 위)
                var equation = conicEquation(o);
                if (o.equation) out.texts.push({ text: equation.text, sup: equation.sup, at: [(center[0] + R) * u, (center[1] + R) * u], dir: [-0.7071, -0.7071] });
                out.notes.push(equationNote(o, shape));

                // 곡선 위의 점 P
                if (o.point) {
                    var P = pointOnConic(shape, o.angle);
                    if (P === null) out.notes.push("P가 무한히 멀어 그릴 수 없음 (θ를 바꾼다)");
                    else {
                        out.dots.push(W(P));
                        out.texts.push({ text: "P", at: W(P), dir: outward(o.kind === 0 ? [P[0] - p, P[1]] : P), upright: true });
                        if (o.focalLines) {
                            for (var fl = 0; fl < foci.length; fl++) out.lines.push(straight([W(P), W(foci[fl])], "thin"));
                            if (o.kind === 0) {
                                out.lines.push(straight([W(P), W([-p, P[1]])], "guide"));
                                out.texts.push({ text: "H", at: W([-p, P[1]]), dir: outward([p > 0 ? -1 : 1, 0]), upright: true });
                                out.notes.push("PF = PH = " + formatValue(dist(P, foci[0])));
                            } else if (o.kind === 1) {
                                var sum = foci.length === 2 ? dist(P, foci[0]) + dist(P, foci[1]) : 2 * dist(P, [0, 0]);
                                out.notes.push("PF + PF′ = " + formatValue(sum) + " (장축의 길이)");
                            } else {
                                out.notes.push("|PF - PF′| = " + formatValue(Math.abs(dist(P, foci[0]) - dist(P, foci[1]))) + " (주축의 길이)");
                            }
                        }
                        if (o.tangent) {
                            var normal = o.kind === 0 ? [-4 * p, 2 * P[1]] : (o.kind === 1 ? [P[0] / (A * A), P[1] / (B * B)] : [P[0] / (A * A), -P[1] / (B * B)]);
                            var nReal = shape.vertical ? [normal[1], normal[0]] : normal, PR = real(P);
                            var len = Math.sqrt(nReal[0] * nReal[0] + nReal[1] * nReal[1]);
                            var L = { a: nReal[0] / len, b: nReal[1] / len, c: -(nReal[0] * PR[0] + nReal[1] * PR[1]) / len };
                            var seg = clipLine(L, [center[0] - R, center[0] + R, center[1] - R, center[1] + R]);
                            if (seg !== null) out.lines.push(straight([[seg[0][0] * u, seg[0][1] * u], [seg[1][0] * u, seg[1][1] * u]], "main"));
                            out.notes.push("P" + "(" + formatValue(PR[0]) + ", " + formatValue(PR[1]) + ")에서의 접선 " + lineEquation(L));
                        }
                    }
                }
                return out;
            }

            // 표준형 곡선을 베지어로 (각 점 {anchor, left, right}, 표준형 좌표)
            function conicCurves(shape) {
                var R = shape.R, A = shape.A, B = shape.B;
                if (shape.kind === 1) {
                    var list = [], dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
                    for (var i = 0; i < 4; i++) {
                        var d = dirs[i], anchor = [d[0] * A, d[1] * B], t = [-d[1] * A * KAPPA, d[0] * B * KAPPA];
                        list.push({ anchor: anchor, left: [anchor[0] - t[0], anchor[1] - t[1]], right: [anchor[0] + t[0], anchor[1] + t[1]] });
                    }
                    return [{ points: list, closed: true }];
                }
                if (shape.kind === 0) {
                    // y² = 4px, |y| ≤ h (|x| ≤ R): 이차 베지어는 3차로 정확히 옮겨진다. 제어점은 두 끝 접선이 만나는 (-x끝, 0)
                    var p = shape.p, h = Math.min(R, Math.sqrt(4 * Math.abs(p) * R));
                    var x = h * h / (4 * p), Q = [-x, 0], P0 = [x, -h], P2 = [x, h];
                    var c1 = [P0[0] + (Q[0] - P0[0]) * 2 / 3, P0[1] + (Q[1] - P0[1]) * 2 / 3];
                    var c2 = [P2[0] + (Q[0] - P2[0]) * 2 / 3, P2[1] + (Q[1] - P2[1]) * 2 / 3];
                    return [{ points: [{ anchor: P0, left: P0, right: c1 }, { anchor: P2, left: c2, right: P2 }], closed: false }];
                }
                // 쌍곡선 (A cosh s, B sinh s): |x|, |y| ≤ R까지, 16칸 에르미트
                var S = Math.min(asinh(R / B), acosh(Math.max(1, R / A)));
                var curves = [];
                for (var side = 1; side >= -1; side -= 2) {
                    var points = [], N = 16;
                    for (var k = 0; k <= N; k++) {
                        var s = -S + 2 * S * k / N, h2 = 2 * S / N / 3;
                        var pt = [side * A * cosh(s), B * sinh(s)], dv = [side * A * sinh(s), B * cosh(s)];
                        points.push({ anchor: pt, left: k > 0 ? [pt[0] - dv[0] * h2, pt[1] - dv[1] * h2] : pt, right: k < N ? [pt[0] + dv[0] * h2, pt[1] + dv[1] * h2] : pt });
                    }
                    curves.push({ points: points, closed: false });
                }
                return curves;
            }

            // 표준형에서 θ에 해당하는 곡선 위의 점. 쌍곡선에서 cos θ ≈ 0이면 null
            function pointOnConic(shape, degrees) {
                var t = degrees * Math.PI / 180;
                if (shape.kind === 1) return [shape.A * Math.cos(t), shape.B * Math.sin(t)];
                if (shape.kind === 0) {
                    if (Math.abs(Math.cos(t / 2)) < 1e-3) return null;
                    var s = Math.tan(t / 2);
                    return [shape.p * s * s, 2 * shape.p * s];
                }
                if (Math.abs(Math.cos(t)) < 0.05) return null;
                return [shape.A / Math.cos(t), shape.B * Math.tan(t)];
            }

            // 식 글자와 위첨자 위치: x2/9+y2/4=1, (x-1)2/9-(y+2)2/4=-1, y2=8x, (y-1)2=-4(x+2)
            function conicEquation(o) {
                var text = "", sup = [];
                function square(name, shift) {
                    if (Math.abs(shift) < 1e-12) text += name;
                    else text += "(" + name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift)) + ")";
                    sup.push(text.length);
                    text += "2";
                }
                function linear(name, shift) {
                    return Math.abs(shift) < 1e-12 ? name : "(" + name + (shift > 0 ? "-" : "+") + formatValue(Math.abs(shift)) + ")";
                }
                if (o.kind === 0) {
                    var coef = formatValue(4 * o.p);
                    if (o.vertical) { square("x", o.m); text += "=" + (coef === "1" ? "" : (coef === "-1" ? "-" : coef)) + linear("y", o.n); }
                    else { square("y", o.n); text += "=" + (coef === "1" ? "" : (coef === "-1" ? "-" : coef)) + linear("x", o.m); }
                    return { text: text, sup: sup };
                }
                square("x", o.m);
                text += "/" + formatValue(o.a * o.a) + (o.kind === 1 ? "+" : "-");
                square("y", o.n);
                text += "/" + formatValue(o.b * o.b) + "=" + (o.kind === 2 && o.vertical ? "-1" : "1");
                return { text: text, sup: sup };
            }

            // 창에 보이는 첫 줄: 식과 초점·준선·점근선
            function equationNote(o, shape) {
                var eq = conicEquation(o), shown = "";
                for (var i = 0; i < eq.text.length; i++) {
                    var isSup = false;
                    for (var j = 0; j < eq.sup.length; j++) if (eq.sup[j] === i) isSup = true;
                    shown += isSup ? "²" : eq.text.charAt(i);
                }
                var c = shape.c, focusText;
                if (o.kind === 0) {
                    var f = shape.vertical ? [o.m, o.n + o.p] : [o.m + o.p, o.n];
                    focusText = "초점 (" + formatValue(f[0]) + ", " + formatValue(f[1]) + "), 준선 " + (shape.vertical ? "y=" + formatValue(o.n - o.p) : "x=" + formatValue(o.m - o.p));
                } else {
                    var cText = radicalText(shape.kind === 1 ? shape.A * shape.A - shape.B * shape.B : o.a * o.a + o.b * o.b);
                    focusText = "초점 " + (shape.vertical ? "(" + formatValue(o.m) + ", " + shiftText(o.n, cText) + ")" : "(" + shiftText(o.m, cText) + ", " + formatValue(o.n) + ")");
                    if (o.kind === 2) focusText += ", 점근선 기울기 ±" + formatValue(o.b / o.a);
                }
                return shown + " · " + focusText;
            }

            function pointText(realPoint) {
                return "(" + formatValue(realPoint[0]) + ", " + formatValue(realPoint[1]) + ")";
            }

            function shiftText(shift, radical) {
                return Math.abs(shift) < 1e-12 ? "±" + radical : formatValue(shift) + "±" + radical;
            }

            // √(value): 정수면 k√m으로 줄이고, 제곱수면 정수, 아니면 소수 둘째 자리
            function radicalText(value) {
                if (Math.abs(value - Math.round(value)) > 1e-9) return formatValue(Math.sqrt(value));
                var n = Math.round(value);
                if (n === 0) return "0";
                var outside = 1, inside = n;
                for (var k = 2; k * k <= inside; k++) {
                    while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
                }
                if (inside === 1) return String(outside);
                return (outside === 1 ? "" : String(outside)) + "√" + inside;
            }

            function cosh(x) { return (Math.exp(x) + Math.exp(-x)) / 2; }
            function sinh(x) { return (Math.exp(x) - Math.exp(-x)) / 2; }
            function asinh(x) { return Math.log(x + Math.sqrt(x * x + 1)); }
            function acosh(x) { return Math.log(x + Math.sqrt(x * x - 1)); }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }

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
                var parts = ["v1", kind, direction, pValue, aValue, bValue, mValue, nValue, angle, flags, unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 15 || p[9].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    direction = Math.round(restoreNumber(p[2], direction, 0, DIRECTIONS.length - 1));
                    pValue = restoreNumber(p[3], pValue, -5, 5);
                    aValue = restoreNumber(p[4], aValue, 0.5, 10);
                    bValue = restoreNumber(p[5], bValue, 0.5, 10);
                    mValue = restoreNumber(p[6], mValue, -10, 10);
                    nValue = restoreNumber(p[7], nValue, -10, 10);
                    angle = restoreNumber(p[8], angle, -180, 180);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[9].charAt(i) === "1";
                    unitMm = restoreNumber(p[10], unitMm, 2, 20);
                    fontPt = restoreNumber(p[11], fontPt, 5, 14);
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
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
    // 선 두께: 축 0.4pt, 그래프 0.8pt, 점선·치수선 0.3pt. 선택은 필요 없다.
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
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var SMALL_ARROW = { length: 2.4, halfWidth: 0.9, notch: 0.6 };
            var KINDS = ["sin", "cos", "tan"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["extremes", "period", "asymptotes", "reference", "formula", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 0;
            var aValue = 2, bValue = 2, cValue = 0, dValue = 0;
            var xMinHalf = -2, xMaxHalf = 6;   // π/2의 몇 배
            var piMm = 20, yUnitMm = 6;
            var fontPt = 8;
            var opt = { extremes: true, period: true, asymptotes: true, reference: false, formula: true, grid: false, numbers: true };
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
            kindList.selection = kind;
            var aControls = addValueRow(functionPanel, "a", "", aValue, -5, 5, 0.5, 1);
            var bControls = addValueRow(functionPanel, "b", "", bValue, 0.5, 6, 0.5, 1);
            var cControls = addValueRow(functionPanel, "c", "×π", cValue, -2, 2, 0.25, 2);
            cControls.input.helpTip = "π의 몇 배. 0.25 = π/4, 0.5 = π/2";
            var dControls = addValueRow(functionPanel, "d", "", dValue, -5, 5, 0.5, 1);

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["extremes", "최댓값·최솟값"], ["period", "주기"], ["asymptotes", "tan 점근선"]]);
            addCheckRow(markPanel, [["reference", "원래 그래프 점선"], ["formula", "식 글자"]]);

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "×π/2", xMinHalf, -8, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "×π/2", xMaxHalf, 1, 12, 1, 0);
            var piControls = addValueRow(rangePanel, "π의 길이", "mm", piMm, 8, 60, 1, 0);
            var yUnitControls = addValueRow(rangePanel, "세로 단위", "mm", yUnitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            addCheckRow(rangePanel, [["grid", "격자"], ["numbers", "눈금 숫자"]]);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 32];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            kindList.onChange = function() { kind = kindList.selection ? kindList.selection.index : 0; updatePreview(); };
            bindValueRow(aControls, function(value) { aValue = value; });
            bindValueRow(bControls, function(value) { bValue = value; });
            bindValueRow(cControls, function(value) { cValue = value; });
            bindValueRow(dControls, function(value) { dValue = value; });
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
                if (Math.abs(aValue) < 1e-9) {
                    messageText.text = "a는 0이 아니어야 함";
                    return;
                }
                var drawing = buildTrig({
                    kind: kind, a: aValue, b: bValue, c: cValue, d: dValue, xMinHalf: xMinHalf, xMaxHalf: xMaxHalf,
                    sx: piMm * MM_TO_PT / Math.PI, sy: yUnitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    extremes: opt.extremes, period: opt.period, asymptotes: opt.asymptotes, reference: opt.reference,
                    formula: opt.formula, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "삼각함수";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"guide"|"thin"|"grid"}
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
                var out = { lines: [], arrows: [], texts: [], notes: [] };
                var xLo = o.xMinHalf * Math.PI / 2, xHi = o.xMaxHalf * Math.PI / 2;
                var amp = Math.abs(o.a), top = o.d + amp, bottom = o.d - amp;
                var yMin, yMax;
                if (o.kind === 2) { yMin = Math.floor(Math.min(o.d - 4, 0)); yMax = Math.ceil(Math.max(o.d + 4, 0)); }
                else { yMin = Math.floor(Math.min(bottom, 0)) - 1; yMax = Math.ceil(Math.max(top, 0)) + (o.period ? 2 : 1); }
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
                    // 점근선: b(x - cπ) = π/2 + kπ
                    var asymptotes = [];
                    for (var k = -200; k <= 200; k++) {
                        var xa = o.c * Math.PI + (Math.PI / 2 + k * Math.PI) / o.b;
                        if (xa > xLo + 1e-9 && xa < xHi - 1e-9) asymptotes.push(xa);
                    }
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
                return out;
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
                var parts = ["v1", kind, aValue, bValue, cValue, dValue, xMinHalf, xMaxHalf, piMm, yUnitMm, fontPt, flags, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 15 || p[11].length !== FLAG_KEYS.length) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    aValue = restoreNumber(p[2], aValue, -5, 5);
                    bValue = restoreNumber(p[3], bValue, 0.5, 6);
                    cValue = restoreNumber(p[4], cValue, -2, 2);
                    dValue = restoreNumber(p[5], dValue, -5, 5);
                    xMinHalf = Math.round(restoreNumber(p[6], xMinHalf, -8, 0));
                    xMaxHalf = Math.round(restoreNumber(p[7], xMaxHalf, 1, 12));
                    piMm = restoreNumber(p[8], piMm, 8, 60);
                    yUnitMm = restoreNumber(p[9], yUnitMm, 2, 20);
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

    // ==== 벡터 ====
    // 평면벡터: a⃗=(a₁, a₂), b⃗=(b₁, b₂)를 원점에서 그리고, a⃗+b⃗(평행사변형·꼬리에 머리), a⃗-b⃗, ka⃗+lb⃗ 중 하나를 더한다.
    // 사잇각 θ(호), a⃗의 b⃗ 위로의 정사영(수선과 직각 표시), 성분(축까지 점선), 점 이름 O·A·B·C, 좌표축·격자를 고른다.
    // 벡터 글자는 글자 위에 작은 화살표를 직접 그린다(글꼴에 결합 화살표가 없어도 된다). 크기·내적·사잇각은 창에 보여 준다.
    // 선 두께: 벡터 0.8pt, 보조 벡터(ka⃗, lb⃗) 0.4pt, 축 0.4pt, 점선·호·직각 표시 0.3pt. 선택은 필요 없다.
    function makeVectorEngine() {
        var api = {label: "벡터", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "HighMathVector/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var EQN_FONT_NAME = "HancomEQN";   // GSMediumB1에 없는 기호(θ)
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var THIN_PT = 0.4;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.5;
            var RIGHT_MARK_MM = 1.5;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };
            var VECTOR_ARROW = { length: 3.2, halfWidth: 1.2, notch: 0.8 };
            var OVER_ARROW = { length: 1.4, halfWidth: 0.55, notch: 0.3 };   // 글자 위 화살표
            var OPERATIONS = ["a, b만", "a+b (평행사변형)", "a+b (꼬리에 머리)", "a-b", "ka+lb"];
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["angle", "projection", "components", "points", "axes", "grid", "numbers"];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);
            var eqnFont = findTextFont([EQN_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var a1 = 3, a2 = 1, b1 = 1, b2 = 2;
            var operation = 1;
            var kValue = 2, lValue = -1;
            var opt = { angle: true, projection: false, components: false, points: false, axes: true, grid: false, numbers: true };
            var unitMm = 8;
            var fontPt = 9;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            var win = page;   // 탭 페이지에 그대로 쌓는다

            var vectorPanel = addPanel(win, "벡터");
            var a1Controls = addValueRow(vectorPanel, "a 성분 x", "", a1, -10, 10, 0.5, 1);
            var a2Controls = addValueRow(vectorPanel, "a 성분 y", "", a2, -10, 10, 0.5, 1);
            var b1Controls = addValueRow(vectorPanel, "b 성분 x", "", b1, -10, 10, 0.5, 1);
            var b2Controls = addValueRow(vectorPanel, "b 성분 y", "", b2, -10, 10, 0.5, 1);
            var operationRow = vectorPanel.add("group");
            operationRow.add("statictext", undefined, "연산:");
            var operationList = operationRow.add("dropdownlist", undefined, OPERATIONS);
            operationList.selection = operation;
            var kControls = addValueRow(vectorPanel, "k", "", kValue, -5, 5, 0.5, 1);
            var lControls = addValueRow(vectorPanel, "l", "", lValue, -5, 5, 0.5, 1);

            var markPanel = addPanel(win, "표시");
            addCheckRow(markPanel, [["angle", "사잇각 θ"], ["projection", "a의 b 위 정사영"], ["components", "성분 점선"]]);
            addCheckRow(markPanel, [["points", "점 O, A, B, C"], ["axes", "좌표축"], ["grid", "격자"]]);
            addCheckRow(markPanel, [["numbers", "눈금 숫자"]]);
            var unitControls = addValueRow(markPanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(markPanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var messageText = win.add("statictext", undefined, " ", {multiline: true});
            messageText.preferredSize = [380, 46];

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);

            refreshEnabled();
            bindValueRow(a1Controls, function(value) { a1 = value; });
            bindValueRow(a2Controls, function(value) { a2 = value; });
            bindValueRow(b1Controls, function(value) { b1 = value; });
            bindValueRow(b2Controls, function(value) { b2 = value; });
            operationList.onChange = function() {
                operation = operationList.selection ? operationList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(kControls, function(value) { kValue = value; });
            bindValueRow(lControls, function(value) { lValue = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다. 영벡터면 확정하지 않는다
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
                kControls.input.parent.enabled = operation === 4;
                lControls.input.parent.enabled = operation === 4;
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
                if ((a1 === 0 && a2 === 0) || (b1 === 0 && b2 === 0)) {
                    messageText.text = "a, b는 영벡터가 아니어야 함";
                    return;
                }
                var drawing = buildVectors({
                    a: [a1, a2], b: [b1, b2], operation: operation, k: kValue, l: lValue, unit: unitMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT,
                    mark: RIGHT_MARK_MM * MM_TO_PT, angle: opt.angle, projection: opt.projection, components: opt.components, points: opt.points,
                    axes: opt.axes, grid: opt.grid, numbers: opt.numbers
                });
                messageText.text = drawing.notes.length > 0 ? drawing.notes.join("\n") : " ";

                previewGroup = layer.groupItems.add();
                previewGroup.name = "벡터";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var a = 0; a < drawing.arrows.length; a++) addArrow(drawing.arrows[a]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"main"|"thin"|"guide"|"mark"|"grid"}
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
                path.strokeWidth = line.kind === "main" ? MAIN_PT : (line.kind === "thin" ? THIN_PT : (line.kind === "axis" ? AXIS_PT : GUIDE_PT));
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
                if (line.kind === "grid") path.zOrder(ZOrderMethod.SENDTOBACK);
            }

            // 끝이 tip, 방향 dir인 채운 화살촉 (뒤가 notch만큼 파인 모양). shape: 축·벡터·글자 위 화살표
            function addArrow(arrow) {
                var shape = arrow.shape === "vector" ? VECTOR_ARROW : (arrow.shape === "over" ? OVER_ARROW : ARROW);
                var scale = arrow.scale || 1;
                var d = arrow.dir, n = [-d[1], d[0]];
                var tip = arrow.tip;
                var back = [tip[0] - d[0] * shape.length * scale, tip[1] - d[1] * shape.length * scale];
                var path = previewGroup.pathItems.add();
                path.setEntirePath([
                    tip,
                    [back[0] + n[0] * shape.halfWidth * scale, back[1] + n[1] * shape.halfWidth * scale],
                    [back[0] + d[0] * shape.notch * scale, back[1] + d[1] * shape.notch * scale],
                    [back[0] - n[0] * shape.halfWidth * scale, back[1] - n[1] * shape.halfWidth * scale]
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

            // 글자: {text 또는 parts:[{text, vector}], at, dir, clear, upright}. parts면 조각마다 글상자를 만들어 한 줄로 잇고,
            // vector인 조각(a, b) 위에 작은 화살표를 그린다. at에서 dir 쪽으로 간격을 두고 전체의 가까운 가장자리가 오게 둔다
            function addLabel(label) {
                var parts = label.parts || [{ text: label.text, vector: false }];
                var frames = [], x = 0;
                for (var i = 0; i < parts.length; i++) {
                    var frame = previewGroup.textFrames.add();
                    frame.contents = parts[i].text;
                    var attributes = frame.textRange.characterAttributes;
                    attributes.size = fontPt;
                    attributes.fillColor = makeGray(100);
                    applyTextFonts(frame, label.upright);
                    var fb = frame.geometricBounds;
                    frame.translate(x - fb[0], 0);
                    x += fb[2] - fb[0] + fontPt * 0.05;
                    frames.push(frame);
                }
                var left = Infinity, top = -Infinity, right = -Infinity, bottom = Infinity;
                for (var f = 0; f < frames.length; f++) {
                    var b = frames[f].geometricBounds;
                    left = Math.min(left, b[0]); top = Math.max(top, b[1]); right = Math.max(right, b[2]); bottom = Math.min(bottom, b[3]);
                }
                var hasArrow = false;
                for (var v = 0; v < parts.length; v++) if (parts[v].vector) hasArrow = true;
                var arrowRise = hasArrow ? fontPt * 0.28 : 0;
                var halfW = (right - left) / 2, halfH = (top + arrowRise - bottom) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var cx = label.at[0] + dir[0] * reach, cy = label.at[1] + dir[1] * reach;
                var dx = cx - (left + right) / 2, dy = cy - (bottom + top + arrowRise) / 2;
                for (var m = 0; m < frames.length; m++) {
                    frames[m].translate(dx, dy);
                    if (!parts[m].vector) continue;
                    // 글자 위 화살표: 글자 폭의 가운데 80%, 윗변에서 조금 위
                    var fb2 = frames[m].geometricBounds, w = fb2[2] - fb2[0];
                    var y = top + dy + fontPt * 0.12, x0 = fb2[0] + w * 0.1, x1 = fb2[2] - w * 0.02 + fontPt * 0.1;
                    var scale = fontPt / 9;
                    addPath({ points: [plain([x0, y]), plain([x1 - OVER_ARROW.length * scale + OVER_ARROW.notch * scale, y])], kind: "mark" });
                    addArrow({ tip: [x1, y], dir: [1, 0], shape: "over", scale: scale });
                }
            }

            function plain(p) { return { anchor: p, left: p, right: p }; }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa, 영문·숫자 GSMediumB1(기준선 +0.5pt), 소문자 변수 GSMediItaC1,
            // GSMediumB1에 없는 기호(θ)는 HancomEQN. 점 이름·숫자(upright)는 똑바로
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-vector.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function buildVectors(o) {
                var u = o.unit;
                var out = { lines: [], arrows: [], dots: [], texts: [], notes: [] };
                var A = o.a, B = o.b, O = [0, 0];
                function S(p) { return [p[0] * u, p[1] * u]; }
                var drawn = [];   // [from, to, kind, parts]
                var vA = [{ text: "a", vector: true }], vB = [{ text: "b", vector: true }];

                if (o.operation === 0) {
                    drawn.push([O, A, "main", vA], [O, B, "main", vB]);
                } else if (o.operation === 1) {
                    var C = add(A, B);
                    drawn.push([O, A, "main", vA], [O, B, "main", vB], [O, C, "main", vA.concat([{ text: "+" }], vB)]);
                    out.lines.push(straight([S(A), S(C)], "guide"), straight([S(B), S(C)], "guide"));
                } else if (o.operation === 2) {
                    var C2 = add(A, B);
                    drawn.push([O, A, "main", vA], [A, C2, "main", vB], [O, C2, "main", vA.concat([{ text: "+" }], vB)]);
                } else if (o.operation === 3) {
                    drawn.push([O, A, "main", vA], [O, B, "main", vB], [B, A, "main", vA.concat([{ text: "-" }], vB)]);
                } else {
                    var kA = scale(A, o.k), lB = scale(B, o.l), R = add(kA, lB);
                    drawn.push([O, A, "main", vA], [O, B, "main", vB]);
                    if (o.k !== 0 && o.k !== 1) drawn.push([O, kA, "thin", [{ text: coefText(o.k) }].concat(vA)]);
                    if (o.l !== 0 && o.l !== 1) drawn.push([O, lB, "thin", [{ text: coefText(o.l) }].concat(vB)]);
                    if (o.k !== 0 && o.l !== 0) out.lines.push(straight([S(kA), S(R)], "guide"), straight([S(lB), S(R)], "guide"));
                    if (Math.abs(R[0]) + Math.abs(R[1]) > 1e-9) drawn.push([O, R, "main", combinationParts(o.k, o.l)]);
                }

                // 좌표축: 모든 끝점과 원점이 들어가게
                var xs = [0], ys = [0];
                for (var i = 0; i < drawn.length; i++) { xs.push(drawn[i][0][0], drawn[i][1][0]); ys.push(drawn[i][0][1], drawn[i][1][1]); }
                var xMin = Math.floor(Math.min.apply(null, xs)) - 1, xMax = Math.ceil(Math.max.apply(null, xs)) + 1;
                var yMin = Math.floor(Math.min.apply(null, ys)) - 1, yMax = Math.ceil(Math.max.apply(null, ys)) + 1;
                if (o.axes) {
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
                }

                // 성분 점선 (원점에서 그린 a, b)
                if (o.components) {
                    var tips = [A, B];
                    for (var c = 0; c < tips.length; c++) {
                        if (tips[c][1] !== 0) out.lines.push(straight([S(tips[c]), S([tips[c][0], 0])], "guide"));
                        if (tips[c][0] !== 0) out.lines.push(straight([S(tips[c]), S([0, tips[c][1]])], "guide"));
                    }
                }

                // 사잇각 θ: 원점에서 a, b 사이 작은 호
                var theta = Math.acos(clampValue(dot(A, B) / (len(A) * len(B)), -1, 1));
                if (o.angle && theta > 1e-6) {
                    var r = Math.min(len(A), len(B), 2) * 0.3 * u, start = Math.atan2(A[1], A[0]), end = Math.atan2(B[1], B[0]);
                    var sweep = end - start;
                    while (sweep > Math.PI) sweep -= 2 * Math.PI;
                    while (sweep < -Math.PI) sweep += 2 * Math.PI;
                    out.lines.push({ points: arcPoints([0, 0], r, start, sweep), kind: "mark" });
                    var mid = start + sweep / 2;
                    out.texts.push({ text: "θ", at: [r * Math.cos(mid), r * Math.sin(mid)], dir: [Math.cos(mid), Math.sin(mid)] });
                }

                // 정사영: a의 b 위로의 정사영. 발 H, 수선(점선), 직각 표시, 정사영 벡터(0.4pt)
                if (o.projection) {
                    var H = scale(B, dot(A, B) / dot(B, B));
                    if (len(sub(A, H)) > 1e-9) {
                        out.lines.push(straight([S(A), S(H)], "guide"));
                        var along = unit(B), up = unit(sub(A, H)), s = o.mark;
                        var h = S(H);
                        out.lines.push(straight([[h[0] + along[0] * s, h[1] + along[1] * s], [h[0] + (along[0] + up[0]) * s, h[1] + (along[1] + up[1]) * s], [h[0] + up[0] * s, h[1] + up[1] * s]], "mark"));
                    }
                    if (len(H) > 1e-9) drawn.push([O, H, "thin", null]);
                    out.notes.push("정사영의 길이 |a|cos θ = " + formatValue(dot(A, B) / len(B)));
                }

                // 벡터: 선은 화살촉 뒤에서 끝낸다. 이름은 가운데에서 수직으로, 모든 끝점의 무게중심에서 먼 쪽
                var G = [0, 0];
                for (var gi = 0; gi < drawn.length; gi++) G = add(G, scale(S(drawn[gi][1]), 1 / drawn.length));
                for (var v = 0; v < drawn.length; v++) {
                    var from = S(drawn[v][0]), to = S(drawn[v][1]), d = unit(sub(to, from));
                    var cut = VECTOR_ARROW.length - VECTOR_ARROW.notch;
                    out.lines.push(straight([from, [to[0] - d[0] * cut, to[1] - d[1] * cut]], drawn[v][2]));
                    out.arrows.push({ tip: to, dir: d, shape: "vector" });
                    if (drawn[v][3]) {
                        var midpoint = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
                        var normal = [-d[1], d[0]];
                        if (dot(normal, sub(midpoint, G)) < 0) normal = [d[1], -d[0]];
                        out.texts.push({ parts: drawn[v][3], at: midpoint, dir: normal });
                    }
                }

                // 점 이름 O, A, B, C
                if (o.points) {
                    out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                    out.texts.push({ text: "A", at: S(A), dir: unit(A), upright: true });
                    out.texts.push({ text: "B", at: S(B), dir: unit(B), upright: true });
                    if (o.operation === 1 || o.operation === 2) out.texts.push({ text: "C", at: S(add(A, B)), dir: unit(add(A, B)), upright: true });
                } else if (o.axes) {
                    out.texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], upright: true });
                }

                out.notes.unshift("|a| = " + formatValue(len(A)) + ", |b| = " + formatValue(len(B)) + ", a·b = " + formatValue(dot(A, B)) +
                    ", θ = " + formatValue(theta * 180 / Math.PI) + "°");
                if (o.operation === 1 || o.operation === 2) out.notes.splice(1, 0, "a+b = " + pairText(add(A, B)) + ", |a+b| = " + formatValue(len(add(A, B))));
                if (o.operation === 3) out.notes.splice(1, 0, "a-b = " + pairText(sub(A, B)) + ", |a-b| = " + formatValue(len(sub(A, B))));
                if (o.operation === 4) {
                    var result = add(scale(A, o.k), scale(B, o.l));
                    out.notes.splice(1, 0, coefText(o.k) + "a" + (o.l < 0 ? "-" : "+") + coefText(Math.abs(o.l)) + "b = " + pairText(result) + ", 크기 " + formatValue(len(result)));
                }
                return out;
            }

            // 2a-b, -a+3b … 글자 조각
            function combinationParts(k, l) {
                var parts = [];
                if (k !== 0) parts.push({ text: coefText(k) }, { text: "a", vector: true });
                if (l !== 0) parts.push({ text: (l < 0 ? "-" : (k !== 0 ? "+" : "")) + coefText(Math.abs(l)) }, { text: "b", vector: true });
                var cleaned = [];
                for (var i = 0; i < parts.length; i++) if (parts[i].text !== "") cleaned.push(parts[i]);
                return cleaned;
            }

            // 계수 글자: 1은 비우고 -1은 -
            function coefText(k) {
                var text = formatValue(k);
                return text === "1" ? "" : (text === "-1" ? "-" : text);
            }

            // 원 위 호 (반시계 sweep, 90°마다 나눈 베지어)
            function arcPoints(c, r, start, sweep) {
                var pieces = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2))), step = sweep / pieces;
                var k = 4 / 3 * Math.tan(step / 4), out = [];
                for (var i = 0; i <= pieces; i++) {
                    var t = start + step * i, p = [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)], d = [-Math.sin(t) * r * k, Math.cos(t) * r * k];
                    out.push({ anchor: p, left: i > 0 ? [p[0] - d[0], p[1] - d[1]] : p, right: i < pieces ? [p[0] + d[0], p[1] + d[1]] : p });
                }
                return out;
            }

            function pairText(p) { return "(" + formatValue(p[0]) + ", " + formatValue(p[1]) + ")"; }
            function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function scale(a, k) { return [a[0] * k, a[1] * k]; }
            function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
            function len(a) { return Math.sqrt(dot(a, a)); }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                return length > 0 ? [v[0] / length, v[1] / length] : [0.7071, 0.7071];
            }
            function clampValue(value, minimum, maximum) {
                return value < minimum ? minimum : (value > maximum ? maximum : value);
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
                var parts = ["v1", a1, a2, b1, b2, operation, kValue, lValue, flags, unitMm, fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14 || p[8].length !== FLAG_KEYS.length) return;
                try {
                    a1 = restoreNumber(p[1], a1, -10, 10);
                    a2 = restoreNumber(p[2], a2, -10, 10);
                    b1 = restoreNumber(p[3], b1, -10, 10);
                    b2 = restoreNumber(p[4], b2, -10, 10);
                    operation = Math.round(restoreNumber(p[5], operation, 0, OPERATIONS.length - 1));
                    kValue = restoreNumber(p[6], kValue, -5, 5);
                    lValue = restoreNumber(p[7], lValue, -5, 5);
                    for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[8].charAt(i) === "1";
                    unitMm = restoreNumber(p[9], unitMm, 2, 20);
                    fontPt = restoreNumber(p[10], fontPt, 5, 14);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
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
})();
