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
    var engines = [makeUnitCircleEngine(), makeTriangleEngine()];

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
})();
