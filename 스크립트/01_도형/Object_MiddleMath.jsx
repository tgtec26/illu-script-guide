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

// 중학교 수학: 도형 표기·수직선·좌표평면·통계·작도·전개도·원의 성질·수형도를 한 창의 탭으로 묶었다.
// 탭마다 필요한 선택이 다르다 (표기: 직선 패스, 작도: 선분·각·삼각형, 원: 원 패스, 나머지는 선택 없음).
// 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
// 선 두께는 평가원 수능 그림 측정값에 맞춘 과학 기준(축 0.4pt, 메인 0.8pt, 보조 0.3pt)이다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var TAB_PREF_KEY = "MiddleMath/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeGeoMarksEngine(), makeNumberLineEngine(), makeCoordPlaneEngine(), makeStatChartEngine(), makeConstructionEngine(), makeNetEngine(), makeCirclePropsEngine(), makeTreeDiagramEngine()];

    var win = new Window("dialog", "중학교 수학");
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

    // 저장된 탭이 선택에 맞지 않으면 선택을 쓰는 탭부터(앞에서부터) 가능한 탭을 연다
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

    // ==== 표기 (원래 Object_GeoMarks.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 도형 표기: 선택한 다각형(직선 패스 하나)에 수학 교재식 표기를 붙인다.
    // 꼭짓점 이름(A, B, C…: 맨 위 꼭짓점부터 반시계 방향), 각마다 호(1~3겹)·직각 표시와 글자(60°, x 등),
    // 변마다 같은 길이 눈금(1~3개)·평행 표시(>, >>)와 글자(6 cm 등).
    // 선 두께는 평가원 수능 그림 측정값(보조선 약 0.36pt)과 과학 스크립트 기준(보조선 0.3pt)에 맞춰 0.3pt가 기본이다.
    // 도형 선은 기본으로 0.8pt(평가원 메인 선 측정값 약 0.84pt, 과학 메인 선 0.8pt)로 맞춘다. 끄면 원래 두께 그대로.
    // 표기는 도형 바로 위에 그룹으로 만든다.
    function makeGeoMarksEngine() {
        var api = {label: "표기", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "GeoMarks/settings";
            var MM_TO_PT = 2.834645669;
            var MAX_VERTICES = 8;
            var POSITION_LIMIT_MM = 30;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_BASELINE_PT = 0.5;
            var MARK_GAP_MM = 0.7;   // 겹호·눈금·평행 표시 사이 간격
            var SHAPE_STROKE_PT = 0.8;

            var VERTEX_MARKS = ["없음", "호", "호 2겹", "호 3겹", "직각"];
            var SIDE_MARKS = ["없음", "눈금 1", "눈금 2", "눈금 3", "평행 >", "평행 >>"];

            var doc = app.activeDocument;

            var target = null;
            var sel = doc.selection;
            if (sel && sel.length === 1 && sel[0].typename === "PathItem") target = sel[0];
            if (target === null) {
                return "직선으로 된 도형(패스) 하나를 선택해주세요.";
            }

            var closed = target.closed;
            var rawPoints = [];
            for (var p = 0; p < target.pathPoints.length; p++) {
                var anchor = target.pathPoints[p].anchor;
                rawPoints.push([anchor[0], anchor[1]]);
            }
            rawPoints = dedupePoints(rawPoints, closed);
            if (rawPoints.length < (closed ? 3 : 2) || rawPoints.length > MAX_VERTICES) {
                return "꼭짓점이 " + (closed ? 3 : 2) + "~" + MAX_VERTICES + "개인 패스를 선택해주세요.";
            }
            var vertexCount = rawPoints.length;
            var sideCount = closed ? vertexCount : vertexCount - 1;

            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var showNames = true;
            var startLetter = "A";
            var clockwise = false;
            var fontPt = 8;
            var labelGapMm = 1.2;
            var arcRadiusMm = 3;
            var tickMm = 1.6;
            var strokePt = 0.3;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var normalizeStroke = true;
            var vertexMarks = [], vertexTexts = [], sideMarks = [], sideTexts = [];
            for (var v = 0; v < vertexCount; v++) {
                vertexMarks.push(0);
                vertexTexts.push("");
                sideMarks.push(0);
                sideTexts.push("");
            }
            applySettings();

            var previewGroup = null;
            var originalStroked = target.stroked;
            var originalStrokeWidth = target.strokeWidth;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var namePanel = addPanel(win, "꼭짓점 이름");
            var nameRow = namePanel.add("group");
            var showNamesCheck = nameRow.add("checkbox", undefined, "표시");
            nameRow.add("statictext", undefined, "시작 글자:");
            var startInput = nameRow.add("edittext", undefined, startLetter);
            startInput.characters = 3;
            var clockwiseCheck = nameRow.add("checkbox", undefined, "시계 방향");
            clockwiseCheck.helpTip = "맨 위 꼭짓점부터 이름을 붙인다. 기본은 반시계 방향(A 위, B 왼쪽 아래, C 오른쪽 아래)";

            var markPanel = addPanel(win, "각 · 변 표기");
            markPanel.add("statictext", undefined, "각: 표시 / 글자 (60°, x)      변: 표시 / 글자 (6 cm)");
            var markRows = [];
            for (var r = 0; r < vertexCount; r++) markRows.push(addMarkRow(markPanel, r));

            var sizePanel = addPanel(win, "크기");
            var normalizeCheck = sizePanel.add("checkbox", undefined, "도형 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
            normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var gapControls = addValueRow(sizePanel, "글자 간격", "mm", labelGapMm, 0, 5, 0.1, 1);
            var arcControls = addValueRow(sizePanel, "호 반지름", "mm", arcRadiusMm, 1, 10, 0.1, 1);
            var tickControls = addValueRow(sizePanel, "눈금 길이", "mm", tickMm, 0.5, 5, 0.1, 1);
            var strokeControls = addValueRow(sizePanel, "선 두께", "pt", strokePt, 0.1, 1, 0.05, 2);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);


            showNamesCheck.value = showNames;
            clockwiseCheck.value = clockwise;
            normalizeCheck.value = normalizeStroke;
            refreshRowCaptions();

            showNamesCheck.onClick = function() { showNames = showNamesCheck.value; updatePreview(); };
            clockwiseCheck.onClick = function() { clockwise = clockwiseCheck.value; updatePreview(); };
            startInput.onChanging = function() {
                var text = String(startInput.text).replace(/\s/g, "");
                if (text.length === 0) return;
                startLetter = text.charAt(0);
                refreshRowCaptions();
                updatePreview();
            };
            normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };

            bindValueRow(fontControls, function(value) { fontPt = value; });
            bindValueRow(gapControls, function(value) { labelGapMm = value; });
            bindValueRow(arcControls, function(value) { arcRadiusMm = value; });
            bindValueRow(tickControls, function(value) { tickMm = value; });
            bindValueRow(strokeControls, function(value) { strokePt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
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
                try {
                    target.stroked = originalStroked;
                    target.strokeWidth = originalStrokeWidth;
                } catch (restoreError) {}
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                if (normalizeStroke) {
                    target.stroked = true;
                    target.strokeWidth = SHAPE_STROKE_PT;
                }
                var order = orderVertices(rawPoints, closed, clockwise);
                var marks = buildMarks(order, closed, {
                    names: showNames ? vertexNames(startLetter, vertexCount) : null,
                    vertexMarks: vertexMarks, vertexTexts: vertexTexts,
                    sideMarks: sideMarks, sideTexts: sideTexts,
                    arcRadius: arcRadiusMm * MM_TO_PT, gap: MARK_GAP_MM * MM_TO_PT,
                    tick: tickMm * MM_TO_PT, labelGap: labelGapMm * MM_TO_PT
                });

                previewGroup = target.parent.groupItems.add();
                previewGroup.move(target, ElementPlacement.PLACEBEFORE);
                previewGroup.name = "도형 표기";
                for (var i = 0; i < marks.paths.length; i++) drawMarkPath(marks.paths[i]);
                for (var j = 0; j < marks.texts.length; j++) drawLabel(marks.texts[j]);
                if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            function drawMarkPath(mark) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < mark.points.length; i++) anchors.push(mark.points[i].anchor);
                path.setEntirePath(anchors);
                for (var j = 0; j < mark.points.length; j++) {
                    var point = path.pathPoints[j];
                    point.leftDirection = mark.points[j].left;
                    point.rightDirection = mark.points[j].right;
                }
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = strokePt;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            // at에서 dir 방향으로 gap만큼 떨어진 곳에 글자의 가까운 가장자리가 오게 둔다
            function drawLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text.replace(/\u00B0/g, "\u02D8");
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame, label.upright);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var reach = label.gap + halfW * Math.abs(label.dir[0]) + halfH * Math.abs(label.dir[1]);
                var x = label.at[0] + label.dir[0] * reach;
                var y = label.at[1] + label.dir[1] * reach;
                // 좁은 각: 글자를 감싸는 원이 두 변에 닿지 않을 만큼 꼭짓점에서 멀리
                if (label.vertex && label.halfAngle > 0 && label.halfAngle < Math.PI / 2) {
                    var fit = Math.sqrt(halfW * halfW + halfH * halfH) / Math.sin(label.halfAngle);
                    var current = Math.sqrt(Math.pow(x - label.vertex[0], 2) + Math.pow(y - label.vertex[1], 2));
                    if (fit > current) {
                        x = label.vertex[0] + label.dir[0] * fit;
                        y = label.vertex[1] + label.dir[1] * fit;
                    }
                }
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt).
            // 따로 떨어진 소문자 한 글자(x, a)는 변수라 GSMediItaC1. 꼭짓점 이름(upright)은 기울이지 않는다
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if (isKoreanOrSpace(code)) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (!upright && isVariableLetter(text, i)) {
                        attributes.textFont = italicFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    } else {
                        attributes.textFont = engFont;
                        attributes.baselineShift = ENG_BASELINE_PT;
                    }
                }
            }

            function isKoreanOrSpace(code) {
                return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160;
            }

            function isVariableLetter(text, i) {
                return /[a-z]/.test(text.charAt(i)) && !/[A-Za-z]/.test(text.charAt(i - 1)) && !/[A-Za-z]/.test(text.charAt(i + 1));
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-geo-marks.js)
            // -------------------------------------------------------
            // 겹친 점(닫힌 패스의 끝=처음 포함)을 지운다
            function dedupePoints(points, isClosed) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var last = out[out.length - 1];
                    if (last && Math.abs(last[0] - points[i][0]) < 0.01 && Math.abs(last[1] - points[i][1]) < 0.01) continue;
                    out.push(points[i]);
                }
                if (isClosed && out.length > 1) {
                    var first = out[0], end = out[out.length - 1];
                    if (Math.abs(first[0] - end[0]) < 0.01 && Math.abs(first[1] - end[1]) < 0.01) out.pop();
                }
                return out;
            }

            // 닫힌 도형: 맨 위(같으면 왼쪽) 꼭짓점부터 반시계(y 위쪽 좌표) 순서. 열린 패스: 패스 순서 그대로
            function orderVertices(points, isClosed, isClockwise) {
                var list = points.slice();
                if (isClosed) {
                    if (signedArea(list) < 0) list.reverse();
                    var top = 0;
                    for (var i = 1; i < list.length; i++) {
                        if (list[i][1] > list[top][1] + 0.5 || (Math.abs(list[i][1] - list[top][1]) <= 0.5 && list[i][0] < list[top][0])) top = i;
                    }
                    list = list.slice(top).concat(list.slice(0, top));
                    if (isClockwise) list = [list[0]].concat(list.slice(1).reverse());
                } else if (isClockwise) {
                    list.reverse();
                }
                return list;
            }

            function signedArea(points) {
                var sum = 0;
                for (var i = 0; i < points.length; i++) {
                    var a = points[i], b = points[(i + 1) % points.length];
                    sum += a[0] * b[1] - b[0] * a[1];
                }
                return sum / 2;
            }

            function vertexNames(first, count) {
                var names = [];
                for (var i = 0; i < count; i++) names.push(String.fromCharCode(first.charCodeAt(0) + i));
                return names;
            }

            // 표기를 경로(점마다 anchor·left·right)와 글자(at에서 dir 쪽으로 gap)로 만든다
            function buildMarks(points, isClosed, opt) {
                var n = points.length;
                var sides = isClosed ? n : n - 1;
                var turn = signedArea(points) < 0 ? -1 : 1;
                var paths = [], texts = [];

                for (var i = 0; i < n; i++) {
                    var vertex = points[i];
                    var hasPrev = isClosed || i > 0, hasNext = isClosed || i < n - 1;
                    var prev = hasPrev ? points[(i - 1 + n) % n] : null;
                    var next = hasNext ? points[(i + 1) % n] : null;

                    var outward;
                    if (prev && next) {
                        var span = angleSpan(vertex, prev, next, turn, isClosed);
                        var mid = span.start + span.sweep / 2;
                        var inward = [Math.cos(mid), Math.sin(mid)];
                        outward = [-inward[0], -inward[1]];
                        var mark = opt.vertexMarks[i] || 0;
                        var reach = opt.arcRadius;
                        if (mark >= 1 && mark <= 3) {
                            for (var k = 0; k < mark; k++) paths.push(arcPath(vertex, opt.arcRadius + k * opt.gap, span.start, span.sweep));
                            reach = opt.arcRadius + (mark - 1) * opt.gap;
                        } else if (mark === 4) {
                            paths.push(rightAnglePath(vertex, span.start, opt.arcRadius * 0.7));
                            reach = opt.arcRadius * 0.7 * Math.SQRT2;
                        }
                        if (opt.vertexTexts[i]) texts.push({ text: opt.vertexTexts[i], at: offsetPoint(vertex, inward, reach), dir: inward, gap: opt.labelGap, vertex: vertex, halfAngle: span.sweep / 2 });
                    } else {
                        // 열린 패스의 끝점: 이웃에서 멀어지는 쪽
                        outward = unit(sub(vertex, prev || next));
                    }
                    if (opt.names) texts.push({ text: opt.names[i], at: vertex, dir: outward, gap: opt.labelGap, upright: true });
                }

                for (var s = 0; s < sides; s++) {
                    var a = points[s], b = points[(s + 1) % n];
                    var along = unit(sub(b, a));
                    var normal = [along[1] * turn, -along[0] * turn];   // 도형 바깥쪽
                    var middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                    var sideMark = opt.sideMarks[s] || 0;
                    var count = sideMark <= 3 ? sideMark : sideMark - 3;
                    for (var c = 0; c < count; c++) {
                        var center = offsetPoint(middle, along, (c - (count - 1) / 2) * opt.gap);
                        if (sideMark <= 3) {
                            paths.push(linePath([offsetPoint(center, normal, -opt.tick / 2), offsetPoint(center, normal, opt.tick / 2)]));
                        } else {
                            // 평행 표시는 어느 변이든 오른쪽(세로 변은 위쪽)을 가리켜야 서로 평행으로 읽힌다
                            var pointing = (along[0] < -1e-6 || (Math.abs(along[0]) <= 1e-6 && along[1] < 0)) ? [-along[0], -along[1]] : along;
                            var tip = offsetPoint(center, pointing, opt.tick * 0.3);
                            var back = offsetPoint(tip, pointing, -opt.tick * 0.6);
                            paths.push(linePath([offsetPoint(back, normal, opt.tick * 0.45), tip, offsetPoint(back, normal, -opt.tick * 0.45)]));
                        }
                    }
                    var clear = sideMark >= 1 && sideMark <= 3 ? opt.tick / 2 : (sideMark > 3 ? opt.tick * 0.45 : 0);
                    if (opt.sideTexts[s]) texts.push({ text: opt.sideTexts[s], at: offsetPoint(middle, normal, clear), dir: normal, gap: opt.labelGap });
                }
                return { paths: paths, texts: texts };
            }

            // 꼭짓점 안쪽 각: start에서 반시계로 sweep(라디안). 열린 패스는 작은 쪽 각
            function angleSpan(vertex, prev, next, turn, isClosed) {
                var toPrev = Math.atan2(prev[1] - vertex[1], prev[0] - vertex[0]);
                var toNext = Math.atan2(next[1] - vertex[1], next[0] - vertex[0]);
                var start = turn > 0 ? toNext : toPrev;
                var end = turn > 0 ? toPrev : toNext;
                var sweep = end - start;
                while (sweep < 0) sweep += Math.PI * 2;
                while (sweep >= Math.PI * 2) sweep -= Math.PI * 2;
                if (!isClosed && sweep > Math.PI) {
                    start = end;
                    sweep = Math.PI * 2 - sweep;
                }
                return { start: start, sweep: sweep };
            }

            // 90°씩 나눈 3차 베지어 원호
            function arcPath(center, radius, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radius;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var anchor = [center[0] + radius * cos, center[1] + radius * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: anchor,
                        left: i === 0 ? anchor : [anchor[0] - tangent[0], anchor[1] - tangent[1]],
                        right: i === pieces ? anchor : [anchor[0] + tangent[0], anchor[1] + tangent[1]]
                    });
                }
                return { points: points };
            }

            // 직각 표시: 두 변을 따라 size만큼 간 두 점을 잇는 꺾은선
            function rightAnglePath(vertex, start, size) {
                var u = [Math.cos(start), Math.sin(start)];
                var w = [-u[1], u[0]];
                var p1 = offsetPoint(vertex, u, size);
                var p2 = offsetPoint(p1, w, size);
                return linePath([p1, p2, offsetPoint(vertex, w, size)]);
            }

            function linePath(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points };
            }

            function offsetPoint(point, dir, distance) {
                return [point[0] + dir[0] * distance, point[1] + dir[1] * distance];
            }

            function sub(a, b) {
                return [a[0] - b[0], a[1] - b[1]];
            }

            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
                return [v[0] / length, v[1] / length];
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

            // 한 행에 꼭짓점 하나와 그 꼭짓점에서 나가는 변 하나
            function addMarkRow(parent, index) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var vertexCaption = row.add("statictext", undefined, "∠W");
                vertexCaption.preferredSize.width = 26;
                var vertexList = row.add("dropdownlist", undefined, VERTEX_MARKS);
                vertexList.selection = vertexMarks[index];
                var vertexInput = row.add("edittext", undefined, vertexTexts[index]);
                vertexInput.characters = 6;
                var angleOn = closed || (index > 0 && index < vertexCount - 1);
                vertexList.enabled = angleOn;
                vertexInput.enabled = angleOn;

                var sideCaption = row.add("statictext", undefined, "WW");
                sideCaption.preferredSize.width = 26;
                var sideList = row.add("dropdownlist", undefined, SIDE_MARKS);
                sideList.selection = sideMarks[index];
                var sideInput = row.add("edittext", undefined, sideTexts[index]);
                sideInput.characters = 6;
                var sideOn = index < sideCount;
                sideCaption.visible = sideOn;
                sideList.visible = sideOn;
                sideInput.visible = sideOn;

                vertexList.onChange = function() { vertexMarks[index] = vertexList.selection ? vertexList.selection.index : 0; updatePreview(); };
                sideList.onChange = function() { sideMarks[index] = sideList.selection ? sideList.selection.index : 0; updatePreview(); };
                vertexInput.onChanging = function() { vertexTexts[index] = vertexInput.text; updatePreview(); };
                sideInput.onChanging = function() { sideTexts[index] = sideInput.text; updatePreview(); };
                return { vertexCaption: vertexCaption, sideCaption: sideCaption };
            }

            function refreshRowCaptions() {
                var names = vertexNames(startLetter, vertexCount);
                for (var i = 0; i < markRows.length; i++) {
                    markRows[i].vertexCaption.text = "∠" + names[i];
                    markRows[i].sideCaption.text = names[i] + names[(i + 1) % vertexCount];
                }
            }

            function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (" + unit + "):").preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatNumber(value, decimals));
                input.preferredSize.width = INPUT_WIDTH;
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;
                return { input: input, slider: slider, min: minimum, max: maximum, step: step, decimals: decimals };
            }

            function bindValueRow(controls, setter) {
                function commit(value) {
                    value = clamp(roundTo(value, controls.step), controls.min, controls.max);
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
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
                    controls.input.text = formatNumber(value, controls.decimals);
                    try { controls.slider.value = value; } catch (e) {}
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
            // 설정 저장 · 복원. 각·변 표기는 꼭짓점 수와 열림/닫힘이 같을 때만 되살린다
            // -------------------------------------------------------
            function saveSettings() {
                var parts = [
                    "v2",
                    showNames ? "1" : "0", encodeURIComponent(startLetter), clockwise ? "1" : "0",
                    fontPt, labelGapMm, arcRadiusMm, tickMm, strokePt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0", normalizeStroke ? "1" : "0",
                    vertexCount + (closed ? "c" : "o"),
                    vertexMarks.join(","), encodeList(vertexTexts), sideMarks.join(","), encodeList(sideTexts)
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function encodeList(list) {
                var out = [];
                for (var i = 0; i < list.length; i++) out.push(encodeURIComponent(list[i]));
                return out.join(",");
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v2" || p.length !== 18) return;
                try {
                    showNames = p[1] === "1";
                    var letter = decodeURIComponent(p[2]);
                    if (letter.length === 1) startLetter = letter;
                    clockwise = p[3] === "1";
                    fontPt = restoreNumber(p[4], fontPt, 5, 14);
                    labelGapMm = restoreNumber(p[5], labelGapMm, 0, 5);
                    arcRadiusMm = restoreNumber(p[6], arcRadiusMm, 1, 10);
                    tickMm = restoreNumber(p[7], tickMm, 0.5, 5);
                    strokePt = restoreNumber(p[8], strokePt, 0.1, 1);
                    offsetXmm = restoreNumber(p[9], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    offsetYmm = restoreNumber(p[10], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                    previewEnabled = p[11] === "1";
                    normalizeStroke = p[12] === "1";
                    if (p[13] !== vertexCount + (closed ? "c" : "o")) return;
                    var vm = p[14].split(","), vt = p[15].split(","), sm = p[16].split(","), st = p[17].split(",");
                    if (vm.length !== vertexCount || vt.length !== vertexCount || sm.length !== vertexCount || st.length !== vertexCount) return;
                    for (var i = 0; i < vertexCount; i++) {
                        vertexMarks[i] = restoreIndex(vm[i], VERTEX_MARKS.length);
                        sideMarks[i] = restoreIndex(sm[i], SIDE_MARKS.length);
                        vertexTexts[i] = decodeURIComponent(vt[i]);
                        sideTexts[i] = decodeURIComponent(st[i]);
                    }
                } catch (restoreError) {}
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }

            function restoreIndex(text, length) {
                var value = parseInt(text, 10);
                return (isNaN(value) || value < 0 || value >= length) ? 0 : value;
            }
        }
        return api;
    }

    // ==== 수직선 (원래 Object_NumberLine.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 수직선: 정수 눈금과 숫자, 보조 눈금, 점(A=-2.5, B=3/4, P=√2), 부등식의 해(-1<x<=3)를 그린다.
    // 해는 교과서처럼 경계에 ●(포함)·○(미포함)을 찍고 그 위로 꺾어 올린 선으로 범위를 표시한다.
    // 선 두께는 평가원 그림 측정값에 맞춘 과학 기준: 수직선·눈금 0.4pt, 해 선 0.8pt.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeNumberLineEngine() {
        var api = {label: "수직선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "NumberLine/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var SOLUTION_PT = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 1;

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var minValue = -5;
            var maxValue = 5;
            var unitMm = 8;
            var subdivisions = 1;
            var tickMm = 1.6;
            var solutionMm = 4;
            var fontPt = 8;
            var showNumbers = true;
            var pointsText = "";
            var inequalityText = "";
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var rangePanel = addPanel(win, "범위 · 눈금");
            var minControls = addValueRow(rangePanel, "최솟값", "", minValue, -20, 19, 1, 0);
            var maxControls = addValueRow(rangePanel, "최댓값", "", maxValue, -19, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 3, 40, 0.5, 1);
            var subControls = addValueRow(rangePanel, "칸 나누기", "칸", subdivisions, 1, 10, 1, 0);
            subControls.input.helpTip = "1 사이를 몇 칸으로 나눌지. 1이면 보조 눈금 없음";
            var tickControls = addValueRow(rangePanel, "눈금 길이", "mm", tickMm, 0.5, 5, 0.1, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var numbersCheck = rangePanel.add("checkbox", undefined, "정수 눈금에 숫자 표시");

            var markPanel = addPanel(win, "점 · 해");
            var pointsRow = markPanel.add("group");
            pointsRow.add("statictext", undefined, "점:").preferredSize.width = 40;
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 300;
            pointsInput.helpTip = "쉼표로 구분. 이름=값 (A=-2.5, B=3/4, P=√2, Q=1-√3). 이름 없이 값만 쓰면 점만 찍는다";
            var inequalityRow = markPanel.add("group");
            inequalityRow.add("statictext", undefined, "해:").preferredSize.width = 40;
            var inequalityInput = inequalityRow.add("edittext", undefined, inequalityText);
            inequalityInput.preferredSize.width = 300;
            inequalityInput.helpTip = "x>2, x<=-1, -1<x<=3, x≥2 처럼. <=는 ≤, >=는 ≥와 같다";
            var solutionControls = addValueRow(markPanel, "해 선 높이", "mm", solutionMm, 1, 15, 0.5, 1);
            var messageText = markPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 340;

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            numbersCheck.value = showNumbers;

            bindValueRow(minControls, function(value) {
                minValue = value;
                if (maxValue <= minValue) { maxValue = minValue + 1; setRowValue(maxControls, maxValue); }
            });
            bindValueRow(maxControls, function(value) {
                maxValue = value;
                if (minValue >= maxValue) { minValue = maxValue - 1; setRowValue(minControls, minValue); }
            });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(subControls, function(value) { subdivisions = value; });
            bindValueRow(tickControls, function(value) { tickMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            bindValueRow(solutionControls, function(value) { solutionMm = value; });
            numbersCheck.onClick = function() { showNumbers = numbersCheck.value; updatePreview(); };
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
            inequalityInput.onChanging = function() { inequalityText = inequalityInput.text; updatePreview(); };
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
                var points = parsePoints(pointsText);
                var solution = parseInequality(inequalityText);
                var problems = [];
                if (points.bad.length > 0) problems.push("읽지 못한 점: " + points.bad.join(", "));
                if (solution === null) problems.push("해를 읽지 못함");
                messageText.text = problems.length > 0 ? problems.join(" / ") : " ";

                var drawing = buildNumberLine({
                    min: minValue, max: maxValue, unit: unitMm * MM_TO_PT, subdivisions: subdivisions,
                    tick: tickMm * MM_TO_PT, showNumbers: showNumbers, points: points.list,
                    solution: solution, solutionHeight: solutionMm * MM_TO_PT, dotRadius: DOT_RADIUS_MM * MM_TO_PT
                });

                previewGroup = layer.groupItems.add();
                previewGroup.name = "수직선";
                for (var i = 0; i < drawing.lines.length; i++) addLine(drawing.lines[i].points, drawing.lines[i].main ? SOLUTION_PT : AXIS_PT);
                for (var j = 0; j < drawing.dots.length; j++) addDot(drawing.dots[j]);
                for (var k = 0; k < drawing.texts.length; k++) addLabel(drawing.texts[k]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            function addLine(points, width) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(points);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = width;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            // ● 포함(검정 채움) · ○ 미포함(흰 채움 + 선)
            function addDot(dot) {
                var r = DOT_RADIUS_MM * MM_TO_PT;
                var circle = previewGroup.pathItems.ellipse(dot.at[1] + r, dot.at[0] - r, r * 2, r * 2);
                circle.filled = true;
                circle.fillColor = makeGray(dot.open ? 0 : 100);
                circle.stroked = dot.open;
                if (dot.open) {
                    circle.strokeColor = makeGray(100);
                    circle.strokeWidth = AXIS_PT;
                }
            }

            // at에서 위(dir=1) 또는 아래(dir=-1)로 간격을 두고 글자 가운데를 맞춘다
            function addLabel(label) {
                var frame = previewGroup.textFrames.add();
                frame.contents = label.text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfH = (b[1] - b[3]) / 2;
                var y = label.at[1] + label.dir * (label.clear + LABEL_GAP_MM * MM_TO_PT + halfH);
                frame.translate(label.at[0] - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 따로 떨어진 소문자 한 글자(x)는 변수라 GSMediItaC1
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (/[a-z]/.test(text.charAt(i)) && !/[A-Za-z]/.test(text.charAt(i - 1)) && !/[A-Za-z]/.test(text.charAt(i + 1))) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-number-line.js). 0이 원점, 1 = unit pt
            // -------------------------------------------------------
            function buildNumberLine(opt) {
                var lines = [], dots = [], texts = [];
                var margin = opt.unit * 0.6;
                var left = opt.min * opt.unit - margin, right = opt.max * opt.unit + margin;
                lines.push({ points: [[left, 0], [right, 0]] });

                var steps = (opt.max - opt.min) * opt.subdivisions;
                for (var i = 0; i <= steps; i++) {
                    var value = opt.min + i / opt.subdivisions;
                    var major = i % opt.subdivisions === 0;
                    var half = (major ? opt.tick : opt.tick * 0.6) / 2;
                    var x = value * opt.unit;
                    lines.push({ points: [[x, -half], [x, half]] });
                    if (major && opt.showNumbers) texts.push({ text: String(Math.round(value)), at: [x, 0], dir: -1, clear: opt.tick / 2 });
                }

                var solution = opt.solution;
                if (solution && (solution.lower || solution.upper)) {
                    var h = opt.solutionHeight;
                    var lowX = solution.lower ? solution.lower.value * opt.unit : left;
                    var highX = solution.upper ? solution.upper.value * opt.unit : right;
                    var shape = [];
                    if (solution.lower) shape.push([lowX, opt.dotRadius]);
                    shape.push([lowX, h], [highX, h]);
                    if (solution.upper) shape.push([highX, opt.dotRadius]);
                    lines.push({ points: shape, main: true });
                    if (solution.lower) dots.push({ at: [lowX, 0], open: !solution.lower.closed });
                    if (solution.upper) dots.push({ at: [highX, 0], open: !solution.upper.closed });
                }

                for (var p = 0; p < opt.points.length; p++) {
                    var point = opt.points[p];
                    var px = point.value * opt.unit;
                    dots.push({ at: [px, 0], open: false });
                    if (point.name) texts.push({ text: point.name, at: [px, 0], dir: 1, clear: opt.dotRadius });
                }
                return { lines: lines, dots: dots, texts: texts };
            }

            // "A=-2.5, B=3/4, √2" → [{name, value}], 못 읽은 항목은 bad
            function parsePoints(text) {
                var list = [], bad = [];
                var parts = String(text).split(/[,，]/);
                for (var i = 0; i < parts.length; i++) {
                    var part = parts[i].replace(/^\s+|\s+$/g, "");
                    if (part === "") continue;
                    var name = "", expression = part;
                    var eq = part.indexOf("=");
                    if (eq >= 0) {
                        name = part.substring(0, eq).replace(/\s/g, "");
                        expression = part.substring(eq + 1);
                    }
                    var value = evaluate(expression);
                    if (value === null) bad.push(part);
                    else list.push({ name: name, value: value });
                }
                return { list: list, bad: bad };
            }

            // "-1<x<=3", "x≥2", "2>x" → {lower:{value,closed}|null, upper:…}. 빈 칸은 해 없음, 못 읽으면 null.
            // 정규식으로 통째 맞추지 않는다: ExtendScript는 (.+?)가 든 패턴이 실패하면 멈춘다("y" 입력 시 일러 정지)
            function parseInequality(text) {
                var source = String(text).replace(/\s/g, "").split("≤").join("<=").split("≥").join(">=").split("=<").join("<=").split("=>").join(">=");
                if (source === "") return { lower: null, upper: null };
                var at = -1;
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch >= "a" && ch <= "z") {
                        if (at >= 0) return null;
                        at = i;
                    }
                }
                if (at < 0) return null;
                var left = source.substring(0, at), right = source.substring(at + 1);
                if (left === "" && right === "") return null;
                var result = { lower: null, upper: null };
                if (left !== "") {
                    var leftOp = left.slice(-2) === "<=" || left.slice(-2) === ">=" ? left.slice(-2) : left.slice(-1);
                    if (leftOp !== "<" && leftOp !== ">" && leftOp !== "<=" && leftOp !== ">=") return null;
                    var leftValue = evaluate(left.substring(0, left.length - leftOp.length));
                    if (leftValue === null) return null;
                    var leftBound = { value: leftValue, closed: leftOp.length === 2 };
                    if (leftOp.charAt(0) === "<") result.lower = leftBound;
                    else result.upper = leftBound;
                }
                if (right !== "") {
                    var rightOp = right.substring(0, 2) === "<=" || right.substring(0, 2) === ">=" ? right.substring(0, 2) : right.charAt(0);
                    if (rightOp !== "<" && rightOp !== ">" && rightOp !== "<=" && rightOp !== ">=") return null;
                    var rightValue = evaluate(right.substring(rightOp.length));
                    if (rightValue === null) return null;
                    var rightBound = { value: rightValue, closed: rightOp.length === 2 };
                    if (rightOp.charAt(0) === "<") {
                        if (result.upper) return null;
                        result.upper = rightBound;
                    } else {
                        if (result.lower) return null;
                        result.lower = rightBound;
                    }
                }
                if (result.lower && result.upper && result.lower.value > result.upper.value) return null;
                return result;
            }

            // 숫자·분수·√·괄호·사칙연산만 계산한다 (eval을 쓰지 않는다). 못 읽으면 null
            function evaluate(text) {
                var s = String(text).replace(/\s/g, "").replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function expression() {
                    var value = term();
                    while (peek() === "+" || peek() === "-") {
                        var op = s.charAt(pos++);
                        var right = term();
                        value = op === "+" ? value + right : value - right;
                    }
                    return value;
                }
                function term() {
                    var value = unary();
                    while (peek() === "*" || peek() === "/" || peek() === "√" || peek() === "(") {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        var right = unary();
                        value = op === "/" ? value / right : value * right;   // 2√3, 2(1+√2)는 곱
                    }
                    return value;
                }
                function unary() {
                    if (peek() === "-") { pos++; return -unary(); }
                    if (peek() === "+") { pos++; return unary(); }
                    if (peek() === "√") { pos++; return Math.sqrt(unary()); }
                    if (peek() === "(") {
                        pos++;
                        var inner = expression();
                        if (peek() !== ")") throw new Error("paren");
                        pos++;
                        return inner;
                    }
                    var begin = pos;
                    var dots = 0;
                    while ((peek() >= "0" && peek() <= "9") || peek() === ".") {
                        if (peek() === ".") dots++;
                        pos++;
                    }
                    var number = parseFloat(s.substring(begin, pos));
                    if (pos === begin || dots > 1 || isNaN(number)) throw new Error("number");
                    return number;
                }
                try {
                    if (s === "") return null;
                    var result = expression();
                    if (pos !== s.length || isNaN(result) || !isFinite(result)) return null;
                    return result;
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

            function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
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
                var parts = [
                    "v1", minValue, maxValue, unitMm, subdivisions, tickMm, solutionMm, fontPt,
                    showNumbers ? "1" : "0", encodeURIComponent(pointsText), encodeURIComponent(inequalityText),
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14) return;
                try {
                    var low = restoreNumber(p[1], minValue, -20, 19);
                    var high = restoreNumber(p[2], maxValue, -19, 20);
                    if (low < high) { minValue = Math.round(low); maxValue = Math.round(high); }
                    unitMm = restoreNumber(p[3], unitMm, 3, 40);
                    subdivisions = Math.round(restoreNumber(p[4], subdivisions, 1, 10));
                    tickMm = restoreNumber(p[5], tickMm, 0.5, 5);
                    solutionMm = restoreNumber(p[6], solutionMm, 1, 15);
                    fontPt = restoreNumber(p[7], fontPt, 5, 14);
                    showNumbers = p[8] === "1";
                    pointsText = decodeURIComponent(p[9]);
                    inequalityText = decodeURIComponent(p[10]);
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

    // ==== 좌표평면 (원래 Object_CoordPlane.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 좌표평면: x축·y축(끝에 가늘고 뾰족한 화살촉, x·y·O), 격자, 정수 눈금과 숫자,
    // 함수 그래프 3개까지(y=2x+1, y=-x^2+4, y=6/x, y=1/2x, y=√x), 점(A(2,3))과 두 축으로 내린 점선을 그린다.
    // 선 두께는 평가원 수능 그림 측정값(축 약 0.36pt, 그래프 약 0.84pt)에 맞춘 과학 기준: 축 0.4pt, 그래프 0.8pt, 보조선 0.3pt.
    // 그래프는 함수값과 기울기로 만든 베지어(에르미트)라 적은 점으로 매끄럽고, 좌표 범위 밖은 잘라낸다.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    // 입력 파싱은 글자 단위로 한다: ExtendScript는 (.+?)가 든 정규식이 실패하면 멈추고, 등호로 시작하는 정규식은 문법 오류다.
    function makeCoordPlaneEngine() {
        var api = {label: "좌표평면", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "CoordPlane/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var FUNCTION_COUNT = 3;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var GRAPH_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GRID_K = 30;
            var GUIDE_DASH = [2, 1.5];
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };   // pt. 평가원 축 화살촉처럼 가늘고 뒤가 파인 모양

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var xMin = -5, xMax = 5, yMin = -5, yMax = 5;
            var unitMm = 6;
            var fontPt = 8;
            var showGrid = false;
            var showNumbers = true;
            var functionTexts = ["y=2x+1", "", ""];
            var pointsText = "";
            var showCoords = true;
            var showGuides = true;
            var showFormulas = true;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var rangePanel = addPanel(win, "범위 · 눈금");
            var xMinControls = addValueRow(rangePanel, "x 최솟값", "", xMin, -20, 0, 1, 0);
            var xMaxControls = addValueRow(rangePanel, "x 최댓값", "", xMax, 1, 20, 1, 0);
            var yMinControls = addValueRow(rangePanel, "y 최솟값", "", yMin, -20, 0, 1, 0);
            var yMaxControls = addValueRow(rangePanel, "y 최댓값", "", yMax, 1, 20, 1, 0);
            var unitControls = addValueRow(rangePanel, "단위 길이", "mm", unitMm, 2, 20, 0.5, 1);
            var fontControls = addValueRow(rangePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);
            var axisChecks = rangePanel.add("group");
            var gridCheck = axisChecks.add("checkbox", undefined, "격자");
            var numbersCheck = axisChecks.add("checkbox", undefined, "눈금 숫자");

            var functionPanel = addPanel(win, "함수 그래프");
            var functionInputs = [];
            for (var f = 0; f < FUNCTION_COUNT; f++) {
                var functionRow = functionPanel.add("group");
                functionRow.add("statictext", undefined, (f + 1) + ":").preferredSize.width = 20;
                var functionInput = functionRow.add("edittext", undefined, functionTexts[f]);
                functionInput.preferredSize.width = 320;
                functionInput.helpTip = "y=2x+1, y=-x^2+4, y=6/x, y=1/2x, y=√x, y=(x-1)^2. ^는 거듭제곱, 곱셈 기호는 생략해도 된다";
                functionInputs.push(functionInput);
            }
            var formulaCheck = functionPanel.add("checkbox", undefined, "그래프 끝에 식 표시");

            var pointPanel = addPanel(win, "점");
            var pointsRow = pointPanel.add("group");
            pointsRow.add("statictext", undefined, "점:").preferredSize.width = 20;
            var pointsInput = pointsRow.add("edittext", undefined, pointsText);
            pointsInput.preferredSize.width = 320;
            pointsInput.helpTip = "A(2,3) B(-1,-2) P(1/2,√2). 이름 없이 (2,3)만 써도 된다";
            var pointChecks = pointPanel.add("group");
            var coordsCheck = pointChecks.add("checkbox", undefined, "좌표 함께 표시");
            var guidesCheck = pointChecks.add("checkbox", undefined, "축까지 점선");
            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            gridCheck.value = showGrid;
            numbersCheck.value = showNumbers;
            formulaCheck.value = showFormulas;
            coordsCheck.value = showCoords;
            guidesCheck.value = showGuides;

            bindValueRow(xMinControls, function(value) { xMin = value; });
            bindValueRow(xMaxControls, function(value) { xMax = value; });
            bindValueRow(yMinControls, function(value) { yMin = value; });
            bindValueRow(yMaxControls, function(value) { yMax = value; });
            bindValueRow(unitControls, function(value) { unitMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            gridCheck.onClick = function() { showGrid = gridCheck.value; updatePreview(); };
            numbersCheck.onClick = function() { showNumbers = numbersCheck.value; updatePreview(); };
            formulaCheck.onClick = function() { showFormulas = formulaCheck.value; updatePreview(); };
            coordsCheck.onClick = function() { showCoords = coordsCheck.value; updatePreview(); };
            guidesCheck.onClick = function() { showGuides = guidesCheck.value; updatePreview(); };
            for (var fi = 0; fi < FUNCTION_COUNT; fi++) bindFunctionInput(fi);
            pointsInput.onChanging = function() { pointsText = pointsInput.text; updatePreview(); };
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

            function bindFunctionInput(index) {
                functionInputs[index].onChanging = function() {
                    functionTexts[index] = functionInputs[index].text;
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
                var functions = [];
                for (var i = 0; i < FUNCTION_COUNT; i++) {
                    if (String(functionTexts[i]).replace(/\s/g, "") === "") continue;
                    var compiled = compileFunction(functionTexts[i]);
                    if (compiled === null) problems.push((i + 1) + "번 식");
                    else functions.push({ fn: compiled, label: functionTexts[i] });
                }
                var points = parsePointList(pointsText);
                if (points.bad.length > 0) problems.push("점 " + points.bad.join(", "));
                messageText.text = problems.length > 0 ? "읽지 못함: " + problems.join(" / ") : " ";

                var drawing = buildPlane({
                    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, unit: unitMm * MM_TO_PT,
                    tick: TICK_MM * MM_TO_PT, grid: showGrid, numbers: showNumbers,
                    functions: functions, formulas: showFormulas,
                    points: points.list, coords: showCoords, guides: showGuides
                });

                previewGroup = layer.groupItems.add();
                previewGroup.name = "좌표평면";
                for (var j = 0; j < drawing.lines.length; j++) addPath(drawing.lines[j]);
                for (var k = 0; k < drawing.arrows.length; k++) addArrow(drawing.arrows[k]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                previewGroup.translate(viewCenter[0] + offsetXmm * MM_TO_PT, viewCenter[1] + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"axis"|"graph"|"grid"|"guide"}
            function addPath(line) {
                var path = previewGroup.pathItems.add();
                var anchors = [];
                for (var i = 0; i < line.points.length; i++) anchors.push(line.points[i].anchor);
                path.setEntirePath(anchors);
                if (line.kind === "graph") {
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

            // at에서 dir 쪽으로 gap(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다. sup: 위첨자 글자 위치
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
                        var character = frame.textRange.characters[label.sup[s]];
                        var supAttributes = character.characterAttributes;
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

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 소문자 변수(x, y, f)는 GSMediItaC1. 점 이름·O(upright)는 기울이지 않는다
            function applyTextFonts(frame, upright) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-coord-plane.js). 원점 (0,0), 1 = unit pt
            // -------------------------------------------------------
            function buildPlane(opt) {
                var u = opt.unit;
                var lines = [], arrows = [], dots = [], texts = [];
                var left = Math.min(opt.xMin, 0) - 0.5, right = opt.xMax + 0.8;
                var bottom = Math.min(opt.yMin, 0) - 0.5, top = opt.yMax + 0.8;

                if (opt.grid) {
                    for (var gx = opt.xMin; gx <= opt.xMax; gx++) if (gx !== 0) lines.push(straight([[gx * u, opt.yMin * u], [gx * u, opt.yMax * u]], "grid"));
                    for (var gy = opt.yMin; gy <= opt.yMax; gy++) if (gy !== 0) lines.push(straight([[opt.xMin * u, gy * u], [opt.xMax * u, gy * u]], "grid"));
                }

                // 축은 화살촉 뒤에서 끝낸다 (선 끝이 뾰족한 촉 밖으로 나오지 않게)
                lines.push(straight([[left * u, 0], [right * u - ARROW.length + ARROW.notch, 0]], "axis"));
                lines.push(straight([[0, bottom * u], [0, top * u - ARROW.length + ARROW.notch]], "axis"));
                arrows.push({ tip: [right * u, 0], dir: [1, 0] });
                arrows.push({ tip: [0, top * u], dir: [0, 1] });
                texts.push({ text: "x", at: [right * u, 0], dir: [0, -1], clear: 0 });
                texts.push({ text: "y", at: [0, top * u], dir: [-1, 0], clear: 0 });
                texts.push({ text: "O", at: [0, 0], dir: [-0.7071, -0.7071], clear: 0, upright: true });

                for (var tx = opt.xMin; tx <= opt.xMax; tx++) {
                    if (tx === 0) continue;
                    lines.push(straight([[tx * u, -opt.tick / 2], [tx * u, opt.tick / 2]], "axis"));
                    if (opt.numbers) texts.push({ text: String(tx), at: [tx * u, 0], dir: [0, -1], clear: opt.tick / 2 });
                }
                for (var ty = opt.yMin; ty <= opt.yMax; ty++) {
                    if (ty === 0) continue;
                    lines.push(straight([[-opt.tick / 2, ty * u], [opt.tick / 2, ty * u]], "axis"));
                    if (opt.numbers) texts.push({ text: String(ty), at: [0, ty * u], dir: [-1, 0], clear: opt.tick / 2 });
                }

                for (var f = 0; f < opt.functions.length; f++) {
                    var segments = plotFunction(opt.functions[f].fn, opt.xMin, opt.xMax, opt.yMin, opt.yMax);
                    for (var s = 0; s < segments.length; s++) {
                        if (segments[s].length < 2) continue;
                        lines.push({ points: toBezier(segments[s], u), kind: "graph" });
                    }
                    if (opt.formulas && segments.length > 0) {
                        var lastSegment = segments[segments.length - 1];
                        var end = lastSegment[lastSegment.length - 1];
                        var display = formulaDisplay(opt.functions[f].label);
                        texts.push({ text: display.text, sup: display.sup, at: [end.x * u, end.y * u], dir: [1, 0], clear: 0 });
                    }
                }

                for (var p = 0; p < opt.points.length; p++) {
                    var point = opt.points[p];
                    var at = [point.x * u, point.y * u];
                    if (opt.guides) {
                        if (point.y !== 0) lines.push(straight([at, [at[0], 0]], "guide"));
                        if (point.x !== 0) lines.push(straight([at, [0, at[1]]], "guide"));
                    }
                    dots.push(at);
                    var name = point.name;
                    if (opt.coords) name += "(" + point.xText + ", " + point.yText + ")";
                    if (name) texts.push({ text: name, at: at, dir: [point.x < 0 ? -0.7071 : 0.7071, 0.7071], clear: 0, upright: true });
                }
                return { lines: lines, arrows: arrows, dots: dots, texts: texts };
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

            // 식 표시: ^와 *는 빼고, ^ 다음 숫자·글자 하나(또는 숫자들)는 위첨자
            function formulaDisplay(text) {
                var source = String(text).replace(/\s/g, "");
                var out = "", sup = [];
                for (var i = 0; i < source.length; i++) {
                    var ch = source.charAt(i);
                    if (ch === "*") continue;
                    if (ch === "^") {
                        var next = source.charAt(i + 1);
                        if (next >= "0" && next <= "9") {
                            while (i + 1 < source.length && source.charAt(i + 1) >= "0" && source.charAt(i + 1) <= "9") {
                                sup.push(out.length);
                                out += source.charAt(++i);
                            }
                        } else if (next !== "") {
                            sup.push(out.length);
                            out += source.charAt(++i);
                        }
                        continue;
                    }
                    out += ch;
                }
                return { text: out, sup: sup };
            }

            // "y=…", "f(x)=…" 또는 식만. x의 함수(function)로 만들고, 못 읽으면 null
            function compileFunction(text) {
                var s = String(text).replace(/\s/g, "").split("−").join("-").split("×").join("*").split("÷").join("/").split("²").join("^2").split("³").join("^3");
                var eq = s.indexOf("=");
                if (eq >= 0) s = s.substring(eq + 1);
                if (s === "") return null;
                var pos = 0;
                function peek() { return s.charAt(pos); }
                function isDigit(ch) { return ch >= "0" && ch <= "9"; }
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
                    while (peek() === "*" || peek() === "/" || peek() === "√" || peek() === "(" || peek() === "x" || isDigit(peek()) || peek() === ".") {
                        var op = peek();
                        if (op === "*" || op === "/") pos++;
                        else op = "*";   // 2x, 2√3, 2(x+1)
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
                function primary() {
                    var ch = peek();
                    if (ch === "x") { pos++; return function(x) { return x; }; }
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

            // 숫자·분수·√ 값 (점 좌표용)
            function evaluateNumber(text) {
                var fn = compileFunction(text);
                if (fn === null || String(text).indexOf("x") >= 0) return null;
                var value = fn(0);
                return isFinite(value) ? value : null;
            }

            // "A(2,3) B(-1,-2) (1/2,√2)" → [{name, x, y, xText, yText}]. 괄호 밖의 공백·쉼표·세미콜론은 구분자
            function parsePointList(text) {
                var s = String(text);
                var list = [], bad = [];
                var i = 0;
                while (i < s.length) {
                    var ch = s.charAt(i);
                    if (ch === " " || ch === "," || ch === ";" || ch === "\t") { i++; continue; }
                    var open = s.indexOf("(", i);
                    var close = open >= 0 ? s.indexOf(")", open) : -1;
                    if (open < 0 || close < 0) {
                        bad.push(s.substring(i).replace(/\s+$/, ""));
                        break;
                    }
                    var name = s.substring(i, open).replace(/\s/g, "");
                    var inside = s.substring(open + 1, close);
                    var comma = inside.indexOf(",");
                    var xText = comma >= 0 ? inside.substring(0, comma).replace(/\s/g, "") : "";
                    var yText = comma >= 0 ? inside.substring(comma + 1).replace(/\s/g, "") : "";
                    var x = comma >= 0 ? evaluateNumber(xText) : null;
                    var y = comma >= 0 ? evaluateNumber(yText) : null;
                    if (x === null || y === null) bad.push(s.substring(i, close + 1));
                    else list.push({ name: name, x: x, y: y, xText: xText, yText: yText });
                    i = close + 1;
                }
                return { list: list, bad: bad };
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
                var parts = [
                    "v1", xMin, xMax, yMin, yMax, unitMm, fontPt,
                    showGrid ? "1" : "0", showNumbers ? "1" : "0", showFormulas ? "1" : "0",
                    encodeURIComponent(functionTexts[0]), encodeURIComponent(functionTexts[1]), encodeURIComponent(functionTexts[2]),
                    encodeURIComponent(pointsText), showCoords ? "1" : "0", showGuides ? "1" : "0",
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 19) return;
                try {
                    xMin = Math.round(restoreNumber(p[1], xMin, -20, 0));
                    xMax = Math.round(restoreNumber(p[2], xMax, 1, 20));
                    yMin = Math.round(restoreNumber(p[3], yMin, -20, 0));
                    yMax = Math.round(restoreNumber(p[4], yMax, 1, 20));
                    unitMm = restoreNumber(p[5], unitMm, 2, 20);
                    fontPt = restoreNumber(p[6], fontPt, 5, 14);
                    showGrid = p[7] === "1";
                    showNumbers = p[8] === "1";
                    showFormulas = p[9] === "1";
                    functionTexts = [decodeURIComponent(p[10]), decodeURIComponent(p[11]), decodeURIComponent(p[12])];
                    pointsText = decodeURIComponent(p[13]);
                    showCoords = p[14] === "1";
                    showGuides = p[15] === "1";
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

    // ==== 통계 (원래 Object_StatChart.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 통계 그래프: 중학교 통계 단원의 세 가지 그래프를 그린다.
    // - 히스토그램·도수분포다각형: 첫 계급의 시작값·계급 크기·도수(2, 5, 8, 4, 1)로 막대와 다각형(양 끝 도수 0인 계급까지), 상대도수로도
    // - 상자그림: 자료(3, 5, 7, …)로 최솟값·제1사분위수·중앙값·제3사분위수·최댓값 (사분위수는 중앙값을 뺀 아래·위 절반의 중앙값)
    // - 산점도: (160,50) (165,55) … 순서쌍
    // 선 두께는 평가원 그림 측정값에 맞춘 과학 기준: 축·막대 테두리 0.4pt, 다각형·상자 0.8pt.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    // 입력 파싱은 글자 단위로 한다: ExtendScript는 (.+?)가 든 정규식이 실패하면 멈추고, 등호로 시작하는 정규식은 문법 오류다.
    function makeStatChartEngine() {
        var api = {label: "통계", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "StatChart/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var TEXT_WIDTH = 300;
            var KINDS = ["히스토그램 · 도수분포다각형", "상자그림", "산점도"];
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ITALIC_FONT_NAME = "GSMediItaC1";
            var ENG_BASELINE_PT = 0.5;
            var AXIS_PT = 0.4;
            var MAIN_PT = 0.8;
            var BAR_K = 15;
            var TICK_MM = 1.2;
            var DOT_RADIUS_MM = 0.6;
            var BOX_HEIGHT_MM = 6;
            var LABEL_GAP_MM = 0.8;
            var ARROW = { length: 4, halfWidth: 1.3, notch: 1 };   // pt. 좌표평면과 같은 평가원식 화살촉

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);
            var italicFont = findTextFont([ITALIC_FONT_NAME, ENG_FONT_NAME]);

            // 옵션
            var kind = 0;
            var widthMm = 60;
            var heightMm = 40;
            var fontPt = 8;
            var classStart = 140;
            var classWidth = 5;
            var frequencyText = "2, 5, 8, 4, 1";
            var showBars = true;
            var showPolygon = false;
            var relative = false;
            var boxText = "3, 5, 6, 7, 8, 9, 10, 12, 15";
            var scatterText = "(160,50) (165,55) (170,58) (155,48) (175,65)";
            var xName = "(cm)";
            var yName = "(명)";
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var kindRow = win.add("group");
            kindRow.add("statictext", undefined, "종류:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;

            var sizePanel = addPanel(win, "크기");
            var widthControls = addValueRow(sizePanel, "가로", "mm", widthMm, 20, 150, 1, 0);
            var heightControls = addValueRow(sizePanel, "세로", "mm", heightMm, 15, 120, 1, 0);
            heightControls.input.helpTip = "상자그림에는 쓰지 않는다";
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var histogramPanel = addPanel(win, "도수분포");
            var startControls = addValueRow(histogramPanel, "첫 계급 시작", "", classStart, 0, 1000, 1, 0);
            var classControls = addValueRow(histogramPanel, "계급 크기", "", classWidth, 0.5, 100, 0.5, 1);
            var frequencyInput = addTextRow(histogramPanel, "도수:", frequencyText, "계급마다 도수를 쉼표로 (2, 5, 8, 4, 1)");
            var histogramChecks = histogramPanel.add("group");
            var barsCheck = histogramChecks.add("checkbox", undefined, "히스토그램");
            var polygonCheck = histogramChecks.add("checkbox", undefined, "도수분포다각형");
            var relativeCheck = histogramChecks.add("checkbox", undefined, "상대도수");

            var dataPanel = addPanel(win, "자료");
            var boxInput = addTextRow(dataPanel, "상자그림:", boxText, "자료 값을 쉼표로 (3, 5, 6, 7, …)");
            var scatterInput = addTextRow(dataPanel, "산점도:", scatterText, "(x,y) 순서쌍을 공백으로 ((160,50) (165,55))");

            var axisPanel = addPanel(win, "축 이름");
            var xNameInput = addTextRow(axisPanel, "가로:", xName, "가로축 끝에 붙는 글자 (cm), 키 (cm)");
            var yNameInput = addTextRow(axisPanel, "세로:", yName, "세로축 위에 붙는 글자 (명). 상대도수를 켜면 비워도 된다");
            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            barsCheck.value = showBars;
            polygonCheck.value = showPolygon;
            relativeCheck.value = relative;
            refreshEnabled();

            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            bindValueRow(widthControls, function(value) { widthMm = value; });
            bindValueRow(heightControls, function(value) { heightMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            bindValueRow(startControls, function(value) { classStart = value; });
            bindValueRow(classControls, function(value) { classWidth = value; });
            frequencyInput.onChanging = function() { frequencyText = frequencyInput.text; updatePreview(); };
            boxInput.onChanging = function() { boxText = boxInput.text; updatePreview(); };
            scatterInput.onChanging = function() { scatterText = scatterInput.text; updatePreview(); };
            xNameInput.onChanging = function() { xName = xNameInput.text; updatePreview(); };
            yNameInput.onChanging = function() { yName = yNameInput.text; updatePreview(); };
            barsCheck.onClick = function() { showBars = barsCheck.value; updatePreview(); };
            polygonCheck.onClick = function() { showPolygon = polygonCheck.value; updatePreview(); };
            relativeCheck.onClick = function() { relative = relativeCheck.value; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
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
                histogramPanel.enabled = kind === 0;
                boxInput.parent.enabled = kind === 1;
                scatterInput.parent.enabled = kind === 2;
                heightControls.input.parent.enabled = kind !== 1;
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
                var size = { width: widthMm * MM_TO_PT, height: heightMm * MM_TO_PT, tick: TICK_MM * MM_TO_PT, xName: xName, yName: yName };
                var drawing = null, problem = "";
                if (kind === 0) {
                    var frequencies = parseNumberList(frequencyText);
                    if (frequencies === null || frequencies.length === 0) problem = "도수를 읽지 못함";
                    else drawing = buildHistogram(size, classStart, classWidth, frequencies, showBars, showPolygon, relative);
                } else if (kind === 1) {
                    var values = parseNumberList(boxText);
                    if (values === null || values.length < 2) problem = "자료를 2개 이상 넣어주세요";
                    else drawing = buildBoxPlot(size, values, BOX_HEIGHT_MM * MM_TO_PT);
                } else {
                    var pairs = parsePairs(scatterText);
                    if (pairs === null || pairs.length === 0) problem = "순서쌍을 읽지 못함";
                    else drawing = buildScatter(size, pairs);
                }
                messageText.text = problem || " ";
                if (drawing === null) return;

                previewGroup = layer.groupItems.add();
                previewGroup.name = "통계 그래프 (" + KINDS[kind] + ")";
                for (var i = 0; i < drawing.bars.length; i++) addBar(drawing.bars[i]);
                for (var j = 0; j < drawing.lines.length; j++) addLine(drawing.lines[j]);
                for (var k = 0; k < drawing.arrows.length; k++) addArrow(drawing.arrows[k]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                previewGroup.translate(viewCenter[0] - size.width / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - size.height / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points, main}
            function addLine(line) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath(line.points);
                path.closed = !!line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.main ? MAIN_PT : AXIS_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
            }

            // [left, bottom, right, top]
            function addBar(bar) {
                var rect = previewGroup.pathItems.rectangle(bar[3], bar[0], bar[2] - bar[0], bar[3] - bar[1]);
                rect.filled = true;
                rect.fillColor = makeGray(BAR_K);
                rect.stroked = true;
                rect.strokeColor = makeGray(100);
                rect.strokeWidth = AXIS_PT;
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

            // at에서 dir 쪽으로 간격(+clear)을 두고 글자의 가까운 가장자리가 오게 둔다
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
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt).
            // 따로 떨어진 소문자 한 글자(x)는 변수라 GSMediItaC1
            function applyTextFonts(frame) {
                var text = frame.contents;
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    var character = frame.textRange.characters[i];
                    var attributes = character.characterAttributes;
                    if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32 || code === 160) {
                        attributes.textFont = korFont;
                        attributes.baselineShift = 0;
                    } else if (/[a-z]/.test(text.charAt(i)) && !/[A-Za-z]/.test(text.charAt(i - 1)) && !/[A-Za-z]/.test(text.charAt(i + 1))) {
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-stat-chart.js). 그래프 왼쪽 아래가 (0,0)
            // -------------------------------------------------------
            // 계급 i(0부터)는 가로 [i+1, i+2] 칸. 앞뒤 한 칸은 도수 0인 계급이라 다각형이 축에서 시작하고 끝난다
            function buildHistogram(size, start, width, frequencies, bars, polygon, isRelative) {
                var out = emptyDrawing();
                var n = frequencies.length;
                var total = 0, top = 0;
                for (var i = 0; i < n; i++) total += frequencies[i];
                var ys = [];
                for (var j = 0; j < n; j++) {
                    ys.push(isRelative ? (total > 0 ? frequencies[j] / total : 0) : frequencies[j]);
                    top = Math.max(top, ys[j]);
                }
                var yAxis = niceAxis(0, top > 0 ? top : 1);
                var sx = size.width / (n + 2), sy = size.height / yAxis.max;

                addAxes(out, size, size.xName, size.yName);
                addYTicks(out, yAxis, sy, size.tick);
                for (var b = 0; b <= n; b++) {
                    var x = (b + 1) * sx;
                    out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]] });
                    out.texts.push({ text: formatValue(start + b * width, width), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
                }
                if (bars) {
                    for (var c = 0; c < n; c++) if (ys[c] > 0) out.bars.push([(c + 1) * sx, 0, (c + 2) * sx, ys[c] * sy]);
                }
                if (polygon) {
                    var points = [[0.5 * sx, 0]];
                    for (var p = 0; p < n; p++) points.push([(p + 1.5) * sx, ys[p] * sy]);
                    points.push([(n + 1.5) * sx, 0]);
                    out.lines.push({ points: points, main: true });
                    for (var q = 0; q < points.length; q++) out.dots.push(points[q]);
                }
                return out;
            }

            // 가로 수직선 위에 상자그림. 상자는 축 위로 boxHeight
            function buildBoxPlot(size, values, boxHeight) {
                var out = emptyDrawing();
                var s = quartiles(values);
                var axis = niceAxis(s.min, s.max);
                var scale = size.width / (axis.max - axis.min);
                function X(v) { return (v - axis.min) * scale; }

                out.lines.push({ points: [[0, 0], [size.width, 0]] });
                for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
                    var x = X(v);
                    out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]] });
                    out.texts.push({ text: formatValue(v, axis.step), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
                }
                if (size.xName) out.texts.push({ text: size.xName, at: [size.width, 0], dir: [1, 0], clear: 0 });

                var y0 = boxHeight * 0.8, y1 = y0 + boxHeight, mid = (y0 + y1) / 2;
                out.lines.push({ points: [[X(s.q1), y0], [X(s.q3), y0], [X(s.q3), y1], [X(s.q1), y1]], closed: true, main: true });
                out.lines.push({ points: [[X(s.median), y0], [X(s.median), y1]], main: true });
                out.lines.push({ points: [[X(s.min), mid], [X(s.q1), mid]], main: true });
                out.lines.push({ points: [[X(s.q3), mid], [X(s.max), mid]], main: true });
                var cap = boxHeight * 0.25;
                out.lines.push({ points: [[X(s.min), mid - cap], [X(s.min), mid + cap]], main: true });
                out.lines.push({ points: [[X(s.max), mid - cap], [X(s.max), mid + cap]], main: true });
                return out;
            }

            function buildScatter(size, pairs) {
                var out = emptyDrawing();
                var xs = [], ys = [];
                for (var i = 0; i < pairs.length; i++) {
                    xs.push(pairs[i][0]);
                    ys.push(pairs[i][1]);
                }
                var xAxis = padAxis(niceAxis(Math.min.apply(null, xs), Math.max.apply(null, xs)), xs);
                var yAxis = padAxis(niceAxis(Math.min.apply(null, ys), Math.max.apply(null, ys)), ys);
                var sx = size.width / (xAxis.max - xAxis.min), sy = size.height / (yAxis.max - yAxis.min);

                addAxes(out, size, size.xName, size.yName);
                for (var v = xAxis.min; v <= xAxis.max + xAxis.step / 2; v += xAxis.step) {
                    var x = (v - xAxis.min) * sx;
                    if (v > xAxis.min) out.lines.push({ points: [[x, -size.tick / 2], [x, size.tick / 2]] });
                    out.texts.push({ text: formatValue(v, xAxis.step), at: [x, 0], dir: [0, -1], clear: size.tick / 2 });
                }
                for (var w = yAxis.min + yAxis.step; w <= yAxis.max + yAxis.step / 2; w += yAxis.step) {
                    var y = (w - yAxis.min) * sy;
                    out.lines.push({ points: [[-size.tick / 2, y], [size.tick / 2, y]] });
                    out.texts.push({ text: formatValue(w, yAxis.step), at: [0, y], dir: [-1, 0], clear: size.tick / 2 });
                }
                // 세로축 맨 아래 값은 가로축 첫 값과 겹치지 않게 모서리 왼쪽에
                out.texts.push({ text: formatValue(yAxis.min, yAxis.step), at: [0, 0], dir: [-1, 0], clear: size.tick / 2 });
                for (var p = 0; p < pairs.length; p++) out.dots.push([(pairs[p][0] - xAxis.min) * sx, (pairs[p][1] - yAxis.min) * sy]);
                return out;
            }

            // 산점도: 가장 작은 자료가 축 위에 얹히지 않게 한 칸 넓힌다
            function padAxis(axis, values) {
                if (Math.min.apply(null, values) - axis.min < axis.step * 0.25) axis.min = roundTo(axis.min - axis.step, axis.step / 1000);
                return axis;
            }

            function emptyDrawing() {
                return { bars: [], lines: [], arrows: [], dots: [], texts: [] };
            }

            // 왼쪽 아래 (0,0)에서 시작하는 두 축과 평가원식 화살촉, 축 이름
            function addAxes(out, size, xLabel, yLabel) {
                var right = size.width + ARROW.length * 2.5, top = size.height + ARROW.length * 2.5;
                out.lines.push({ points: [[0, 0], [right - ARROW.length + ARROW.notch, 0]] });
                out.lines.push({ points: [[0, 0], [0, top - ARROW.length + ARROW.notch]] });
                out.arrows.push({ tip: [right, 0], dir: [1, 0] });
                out.arrows.push({ tip: [0, top], dir: [0, 1] });
                if (xLabel) out.texts.push({ text: xLabel, at: [right, 0], dir: [1, 0], clear: 0 });
                if (yLabel) out.texts.push({ text: yLabel, at: [0, top], dir: [0, 1], clear: 0 });
            }

            function addYTicks(out, axis, scale, tick) {
                for (var v = axis.min; v <= axis.max + axis.step / 2; v += axis.step) {
                    var y = (v - axis.min) * scale;
                    if (v > axis.min) out.lines.push({ points: [[-tick / 2, y], [tick / 2, y]] });
                    out.texts.push({ text: formatValue(v, axis.step), at: [0, y], dir: [-1, 0], clear: tick / 2 });
                }
            }

            // low~high를 담는 눈금: 간격은 1·2·5×10ⁿ, 칸은 6개 이하 (상대도수는 0.1 간격이 되게)
            function niceAxis(low, high) {
                if (high <= low) high = low + 1;
                var raw = (high - low) / 5;
                var power = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
                var step = power;
                var candidates = [1, 2, 5, 10];
                for (var i = 0; i < candidates.length; i++) {
                    step = candidates[i] * power;
                    if ((high - low) / step <= 6) break;
                }
                var min = Math.floor(low / step + 1e-9) * step;
                var max = Math.ceil(high / step - 1e-9) * step;
                if (max <= min) max = min + step;
                return { min: roundTo(min, step / 1000), max: roundTo(max, step / 1000), step: step };
            }

            // 간격의 소수 자리에 맞춘 글자 (0은 그냥 0)
            function formatValue(value, step) {
                if (Math.abs(value) < step * 1e-6) return "0";
                var decimals = 0;
                while (decimals < 6 && Math.abs(step * Math.pow(10, decimals) - Math.round(step * Math.pow(10, decimals))) > 1e-9) decimals++;
                return (Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals);
            }

            // 중학교 교과서 방식: 중앙값을 뺀 아래·위 절반의 중앙값이 제1·제3사분위수
            function quartiles(values) {
                var sorted = values.slice().sort(function(a, b) { return a - b; });
                var n = sorted.length, half = Math.floor(n / 2);
                return {
                    min: sorted[0], max: sorted[n - 1], median: median(sorted),
                    q1: median(sorted.slice(0, half)), q3: median(sorted.slice(n - half))
                };
            }

            function median(sorted) {
                var n = sorted.length;
                return n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
            }

            // "2, 5, 8" 또는 "2 5 8" → [2,5,8]. 하나라도 숫자가 아니면 null
            function parseNumberList(text) {
                var parts = String(text).split(/[\s,，]+/);
                var list = [];
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i] === "") continue;
                    var value = strictNumber(parts[i]);
                    if (value === null) return null;
                    list.push(value);
                }
                return list;
            }

            // "(160,50) (165,55)" → [[160,50],[165,55]]. 괄호 밖 공백·쉼표·세미콜론은 구분자. 못 읽으면 null
            function parsePairs(text) {
                var s = String(text), list = [], i = 0;
                while (i < s.length) {
                    var ch = s.charAt(i);
                    if (ch === " " || ch === "," || ch === ";" || ch === "\t") { i++; continue; }
                    if (ch !== "(") return null;
                    var close = s.indexOf(")", i);
                    if (close < 0) return null;
                    var inner = s.substring(i + 1, close);
                    var comma = inner.indexOf(",");
                    if (comma < 0) return null;
                    var x = strictNumber(inner.substring(0, comma)), y = strictNumber(inner.substring(comma + 1));
                    if (x === null || y === null) return null;
                    list.push([x, y]);
                    i = close + 1;
                }
                return list;
            }

            // 부호·숫자·소수점만 있는 수 ("1e3", "12abc"는 null)
            function strictNumber(text) {
                var s = String(text).replace(/\s/g, "").split("−").join("-");
                if (s === "") return null;
                var dots = 0, digits = 0;
                for (var i = 0; i < s.length; i++) {
                    var ch = s.charAt(i);
                    if (ch === "-" && i === 0) continue;
                    if (ch === ".") { dots++; continue; }
                    if (ch < "0" || ch > "9") return null;
                    digits++;
                }
                if (digits === 0 || dots > 1) return null;
                return parseFloat(s);
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

            function addTextRow(parent, label, value, tip) {
                var row = parent.add("group");
                row.add("statictext", undefined, label).preferredSize.width = 60;
                var input = row.add("edittext", undefined, value);
                input.preferredSize.width = TEXT_WIDTH;
                input.helpTip = tip;
                return input;
            }

            function addValueRow(parent, label, unit, value, minimum, maximum, step, decimals) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":")).preferredSize.width = LABEL_WIDTH;
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
                var parts = [
                    "v1", kind, widthMm, heightMm, fontPt, classStart, classWidth, encodeURIComponent(frequencyText),
                    showBars ? "1" : "0", showPolygon ? "1" : "0", relative ? "1" : "0",
                    encodeURIComponent(boxText), encodeURIComponent(scatterText), encodeURIComponent(xName), encodeURIComponent(yName),
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 18) return;
                try {
                    kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                    widthMm = restoreNumber(p[2], widthMm, 20, 150);
                    heightMm = restoreNumber(p[3], heightMm, 15, 120);
                    fontPt = restoreNumber(p[4], fontPt, 5, 14);
                    classStart = restoreNumber(p[5], classStart, 0, 1000);
                    classWidth = restoreNumber(p[6], classWidth, 0.5, 100);
                    frequencyText = decodeURIComponent(p[7]);
                    showBars = p[8] === "1";
                    showPolygon = p[9] === "1";
                    relative = p[10] === "1";
                    boxText = decodeURIComponent(p[11]);
                    scatterText = decodeURIComponent(p[12]);
                    xName = decodeURIComponent(p[13]);
                    yName = decodeURIComponent(p[14]);
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

    // ==== 작도 (원래 Object_Construction.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 작도·삼각형의 오심: 선택한 직선 패스에 따라
    // - 선분(점 2개): 수직이등분선
    // - 각(열린 패스, 점 3개): 가운데 꼭짓점의 각의 이등분선
    // - 삼각형(닫힌 패스, 점 3개): 외심 O(수직이등분선·외접원), 내심 I(각의 이등분선·내접원·접점까지 수선), 무게중심 G(중선)
    // 작도 흔적을 켜면 교과서처럼 컴퍼스 호를 남긴다(수직이등분선: 두 끝점에서 같은 반지름, 각의 이등분선: 꼭짓점에서 한 번, 두 변 위의 점에서 한 번).
    // 선 두께는 평가원 그림 기준: 원 0.8pt, 보조선·작도 흔적 0.3pt. 도형 선은 기본으로 0.8pt로 맞춘다(끄면 그대로).
    function makeConstructionEngine() {
        var api = {label: "작도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "Construction/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 30;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var SHAPE_STROKE_PT = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["circumcenter", "perpBisectors", "circumcircle", "incenter", "angleBisectors", "incircle",
                "tangentFeet", "centroid", "medians", "traces", "dashed"];

            var doc = app.activeDocument;

            var target = null;
            var sel = doc.selection;
            if (sel && sel.length === 1 && sel[0].typename === "PathItem") target = sel[0];
            if (target === null) {
                return "선분(점 2개), 각(열린 패스, 점 3개), 삼각형(닫힌 패스, 점 3개) 중 하나를 선택해주세요.";
            }
            var rawPoints = [];
            for (var p = 0; p < target.pathPoints.length; p++) {
                var anchor = target.pathPoints[p].anchor;
                rawPoints.push([anchor[0], anchor[1]]);
            }
            rawPoints = dedupePoints(rawPoints, target.closed);
            var mode = detectMode(rawPoints, target.closed);
            if (mode === null) {
                return "선분(점 2개), 각(열린 패스, 점 3개), 삼각형(닫힌 패스, 점 3개) 중 하나를 선택해주세요.";
            }
            var MODE_NAMES = { segment: "선분 → 수직이등분선", angle: "각 → 각의 이등분선", triangle: "삼각형 → 오심" };

            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var opt = {
                circumcenter: true, perpBisectors: true, circumcircle: true,
                incenter: false, angleBisectors: false, incircle: false, tangentFeet: false,
                centroid: false, medians: false,
                traces: true, dashed: true, extendMm: 3
            };
            var normalizeStroke = true;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;
            var originalStroked = target.stroked;
            var originalStrokeWidth = target.strokeWidth;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다
            win.add("statictext", undefined, "대상: " + MODE_NAMES[mode]);

            var trianglePanel = addPanel(win, "삼각형");
            var circumRow = trianglePanel.add("group");
            var circumcenterCheck = circumRow.add("checkbox", undefined, "외심 O");
            var perpCheck = circumRow.add("checkbox", undefined, "수직이등분선");
            var circumcircleCheck = circumRow.add("checkbox", undefined, "외접원");
            var inRow = trianglePanel.add("group");
            var incenterCheck = inRow.add("checkbox", undefined, "내심 I");
            var angleCheck = inRow.add("checkbox", undefined, "각의 이등분선");
            var incircleCheck = inRow.add("checkbox", undefined, "내접원");
            var feetCheck = inRow.add("checkbox", undefined, "접점 수선");
            feetCheck.helpTip = "내심에서 세 변에 내린 수선 (내접원의 반지름)";
            var centroidRow = trianglePanel.add("group");
            var centroidCheck = centroidRow.add("checkbox", undefined, "무게중심 G");
            var mediansCheck = centroidRow.add("checkbox", undefined, "중선");
            trianglePanel.enabled = mode === "triangle";

            var stylePanel = addPanel(win, "표시");
            var styleRow = stylePanel.add("group");
            var tracesCheck = styleRow.add("checkbox", undefined, "작도 흔적(컴퍼스 호)");
            var dashedCheck = styleRow.add("checkbox", undefined, "보조선 점선");
            var normalizeCheck = stylePanel.add("checkbox", undefined, "도형 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
            normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";
            var extendControls = addValueRow(stylePanel, "보조선 연장", "mm", opt.extendMm, 0, 15, 0.5, 1);
            var fontControls = addValueRow(stylePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);


            bindOption(circumcenterCheck, "circumcenter");
            bindOption(perpCheck, "perpBisectors");
            bindOption(circumcircleCheck, "circumcircle");
            bindOption(incenterCheck, "incenter");
            bindOption(angleCheck, "angleBisectors");
            bindOption(incircleCheck, "incircle");
            bindOption(feetCheck, "tangentFeet");
            bindOption(centroidCheck, "centroid");
            bindOption(mediansCheck, "medians");
            bindOption(tracesCheck, "traces");
            bindOption(dashedCheck, "dashed");
            normalizeCheck.value = normalizeStroke;
            normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
            bindValueRow(extendControls, function(value) { opt.extendMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
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
                try {
                    target.stroked = originalStroked;
                    target.strokeWidth = originalStrokeWidth;
                } catch (restoreError) {}
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                if (normalizeStroke) {
                    target.stroked = true;
                    target.strokeWidth = SHAPE_STROKE_PT;
                }
                var drawing = buildConstruction(rawPoints, mode, opt, opt.extendMm * MM_TO_PT);
                previewGroup = target.parent.groupItems.add();
                previewGroup.move(target, ElementPlacement.PLACEBEFORE);
                previewGroup.name = "작도";
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var j = 0; j < drawing.circles.length; j++) addCircle(drawing.circles[j]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], kind:"guide"|"trace"}
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
                path.strokeWidth = GUIDE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                if (line.kind === "guide" && opt.dashed) path.strokeDashes = GUIDE_DASH;
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

            // at에서 dir 쪽으로 간격을 두고 글자의 가까운 가장자리가 오게 둔다
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
                var reach = DOT_RADIUS_MM * MM_TO_PT + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt). O·I·G는 똑바로
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-construction.js)
            // -------------------------------------------------------
            // 겹친 점(닫힌 패스의 끝=처음 포함)을 지운다
            function dedupePoints(points, isClosed) {
                var out = [];
                for (var i = 0; i < points.length; i++) {
                    var last = out[out.length - 1];
                    if (last && Math.abs(last[0] - points[i][0]) < 0.01 && Math.abs(last[1] - points[i][1]) < 0.01) continue;
                    out.push(points[i]);
                }
                if (isClosed && out.length > 1) {
                    var first = out[0], end = out[out.length - 1];
                    if (Math.abs(first[0] - end[0]) < 0.01 && Math.abs(first[1] - end[1]) < 0.01) out.pop();
                }
                return out;
            }

            // 점이 한 직선 위에 있으면(넓이 0) 각·삼각형이 아니다
            function detectMode(points, isClosed) {
                if (points.length === 2 && !isClosed) return "segment";
                if (points.length !== 3) return null;
                var area = cross(sub(points[1], points[0]), sub(points[2], points[0]));
                if (Math.abs(area) < 1e-6 * (1 + Math.pow(dist(points[0], points[1]) + dist(points[1], points[2]), 2))) return null;
                return isClosed ? "triangle" : "angle";
            }

            function buildConstruction(points, kind, o, extend) {
                var out = { lines: [], circles: [], dots: [], texts: [] };
                if (kind === "segment") {
                    perpendicularBisector(out, points[0], points[1], null, o.traces, extend);
                    return out;
                }
                if (kind === "angle") {
                    angleBisector(out, points[1], points[0], points[2], null, o.traces, extend);
                    return out;
                }
                var A = points[0], B = points[1], C = points[2];
                var sides = [[A, B, C], [B, C, A], [C, A, B]];   // [끝점, 끝점, 마주 보는 꼭짓점]

                var O = circumcenter(A, B, C);
                if (o.perpBisectors) for (var s = 0; s < 3; s++) perpendicularBisector(out, sides[s][0], sides[s][1], O, o.traces, extend);
                if (o.circumcircle) out.circles.push({ center: O, radius: dist(O, A) });
                if (o.circumcenter) addCenter(out, O, "O", points);

                var incircle = incenter(A, B, C);
                var I = incircle.center;
                if (o.angleBisectors) {
                    for (var v = 0; v < 3; v++) angleBisector(out, sides[v][2], sides[v][0], sides[v][1], I, o.traces, extend);
                }
                if (o.tangentFeet) {
                    for (var f = 0; f < 3; f++) out.lines.push(guide([I, footOfPerpendicular(I, sides[f][0], sides[f][1])]));
                }
                if (o.incircle) out.circles.push({ center: I, radius: incircle.radius });
                if (o.incenter) addCenter(out, I, "I", points);

                var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
                if (o.medians) {
                    for (var m = 0; m < 3; m++) out.lines.push(guide([sides[m][2], midpoint(sides[m][0], sides[m][1])]));
                }
                if (o.centroid) addCenter(out, G, "G", points);
                return out;
            }

            // 점과 이름. 이름은 가장 가까운 꼭짓점에서 멀어지는 쪽 (겹치면 오른쪽 아래)
            function addCenter(out, at, name, vertices) {
                var nearest = vertices[0];
                for (var i = 1; i < vertices.length; i++) if (dist(at, vertices[i]) < dist(at, nearest)) nearest = vertices[i];
                var away = dist(at, nearest) > 1e-6 ? unit(sub(at, nearest)) : [0.7071, -0.7071];
                out.dots.push(at);
                out.texts.push({ text: name, at: at, dir: away });
            }

            // 선분 AB의 수직이등분선. through(외심)가 있으면 그 점까지 덮고, 양 끝을 extend만큼 더 뻗는다
            function perpendicularBisector(out, A, B, through, traces, extend) {
                var M = midpoint(A, B), length = dist(A, B);
                var n = unit([-(B[1] - A[1]), B[0] - A[0]]);
                var radius = length * 0.7;
                var reach = Math.sqrt(radius * radius - length * length / 4);   // 두 호의 교점까지
                var low = -reach, high = reach;
                if (through) {
                    var t = dot(sub(through, M), n);
                    low = Math.min(0, t) - length * 0.15;
                    high = Math.max(0, t) + length * 0.15;
                    if (traces) { low = Math.min(low, -reach); high = Math.max(high, reach); }
                }
                out.lines.push(guide([offset(M, n, low - extend), offset(M, n, high + extend)]));
                if (traces) {
                    var sweep = 24 * Math.PI / 180;
                    for (var side = -1; side <= 1; side += 2) {
                        var P = offset(M, n, side * reach);
                        out.lines.push(trace(arcPoints(A, radius, angleOf(sub(P, A)) - sweep / 2, sweep)));
                        out.lines.push(trace(arcPoints(B, radius, angleOf(sub(P, B)) - sweep / 2, sweep)));
                    }
                }
            }

            // 꼭짓점 V에서 두 변 VP, VN 사이 각의 이등분선. through(내심)가 있으면 마주 보는 변까지(삼각형), 없으면 작도점 너머로
            function angleBisector(out, V, P, N, through, traces, extend) {
                var u = unit(sub(P, V)), w = unit(sub(N, V));
                var bisector = unit([u[0] + w[0], u[1] + w[1]]);
                var half = Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) / 2;
                var r1 = Math.min(dist(V, P), dist(V, N)) * 0.35;
                var X = offset(V, u, r1), Y = offset(V, w, r1);
                var r2 = dist(X, Y) * 0.8;
                // X, Y에서 같은 반지름 r2로 그린 호의 교점 (V에서 먼 쪽)
                var Z = offset(midpoint(X, Y), bisector, Math.sqrt(Math.max(0, r2 * r2 - Math.pow(dist(X, Y) / 2, 2))));
                var end;
                if (through) {
                    end = lineIntersection(V, bisector, P, sub(N, P));
                } else {
                    end = offset(V, bisector, Math.max(dist(V, Z), Math.min(dist(V, P), dist(V, N)) * 0.8) + extend);
                }
                out.lines.push(guide([V, end]));
                if (traces) {
                    // u에서 반시계로 w까지. 180°를 넘으면 w에서 반시계로 u까지 (작은 쪽 각)
                    var start = angleOf(u);
                    var sweep = angleOf(w) - start;
                    while (sweep < 0) sweep += Math.PI * 2;
                    if (sweep > Math.PI) { start = angleOf(w); sweep = Math.PI * 2 - sweep; }
                    var margin = 8 * Math.PI / 180;
                    out.lines.push(trace(arcPoints(V, r1, start - margin, sweep + margin * 2)));
                    var small = Math.max(20 * Math.PI / 180, half * 0.5);
                    out.lines.push(trace(arcPoints(X, r2, angleOf(sub(Z, X)) - small / 2, small)));
                    out.lines.push(trace(arcPoints(Y, r2, angleOf(sub(Z, Y)) - small / 2, small)));
                }
            }

            function circumcenter(A, B, C) {
                var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
                var a2 = A[0] * A[0] + A[1] * A[1], b2 = B[0] * B[0] + B[1] * B[1], c2 = C[0] * C[0] + C[1] * C[1];
                return [
                    (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d,
                    (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d
                ];
            }

            function incenter(A, B, C) {
                var a = dist(B, C), b = dist(C, A), c = dist(A, B), perimeter = a + b + c;
                var center = [(a * A[0] + b * B[0] + c * C[0]) / perimeter, (a * A[1] + b * B[1] + c * C[1]) / perimeter];
                var area = Math.abs(cross(sub(B, A), sub(C, A))) / 2;
                return { center: center, radius: area * 2 / perimeter };
            }

            function footOfPerpendicular(point, A, B) {
                var d = unit(sub(B, A));
                return offset(A, d, dot(sub(point, A), d));
            }

            // P + t·d와 Q + s·e의 교점
            function lineIntersection(P, d, Q, e) {
                var t = cross(sub(Q, P), e) / cross(d, e);
                return offset(P, d, t);
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

            function guide(anchors) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, kind: "guide" };
            }

            function trace(points) {
                return { points: points, kind: "trace" };
            }

            function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
            function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function angleOf(v) { return Math.atan2(v[1], v[0]); }
            function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
                return [v[0] / length, v[1] / length];
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
                var parts = ["v1", flags, opt.extendMm, normalizeStroke ? "1" : "0", fontPt, offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 8 || p[1].length !== FLAG_KEYS.length) return;
                for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
                opt.extendMm = restoreNumber(p[2], opt.extendMm, 0, 15);
                normalizeStroke = p[3] === "1";
                fontPt = restoreNumber(p[4], fontPt, 5, 14);
                offsetXmm = restoreNumber(p[5], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[6], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[7] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 전개도 (원래 Object_Net.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 전개도: 정육면체(11가지), 직육면체, 각기둥, 각뿔, 원기둥, 원뿔, 정사면체, 정팔면체, 정이십면체.
    // 면을 다각형으로 만든 뒤 두 면이 나누는 모서리는 접는 선(점선), 한 면에만 있는 모서리는 바깥선으로 그린다.
    // 선 두께는 평가원 그림 기준: 바깥선 0.8pt, 접는 선 0.4pt.
    // 정십이면체는 접히는지 검증할 방법이 없어 뺐다. 정육면체 11가지는 tests/check-net.js에서 굴려 접어 확인한다.
    // 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeNetEngine() {
        var api = {label: "전개도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "Net/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var OUTLINE_PT = 0.8;
            var FOLD_PT = 0.4;
            var FOLD_DASH = [2, 1.5];
            var KINDS = ["정육면체", "직육면체", "각기둥", "각뿔", "원기둥", "원뿔", "정사면체", "정팔면체", "정이십면체"];
            // 각 종류가 쓰는 입력 (다이얼로그에서 나머지는 끈다)
            var USES = [
                ["net", "side"], ["side", "depth", "height"], ["count", "side", "height"], ["count", "side", "lateral"],
                ["radius", "height"], ["radius", "slant"], ["side"], ["side"], ["side"]
            ];

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();

            // 옵션 (길이는 mm)
            var kind = 0;
            var values = { net: 1, count: 4, side: 15, depth: 10, height: 20, lateral: 20, radius: 8, slant: 20 };
            var dashedFolds = true;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var kindRow = win.add("group");
            kindRow.add("statictext", undefined, "종류:");
            var kindList = kindRow.add("dropdownlist", undefined, KINDS);
            kindList.selection = kind;

            var sizePanel = addPanel(win, "크기");
            var rows = {
                net: addValueRow(sizePanel, "전개도 번호", "", values.net, 1, 11, 1, 0),
                count: addValueRow(sizePanel, "밑면 변 수", "", values.count, 3, 8, 1, 0),
                side: addValueRow(sizePanel, "한 변 · 가로", "mm", values.side, 3, 60, 0.5, 1),
                depth: addValueRow(sizePanel, "세로", "mm", values.depth, 3, 60, 0.5, 1),
                height: addValueRow(sizePanel, "높이", "mm", values.height, 3, 80, 0.5, 1),
                lateral: addValueRow(sizePanel, "옆모서리", "mm", values.lateral, 3, 80, 0.5, 1),
                radius: addValueRow(sizePanel, "반지름", "mm", values.radius, 2, 40, 0.5, 1),
                slant: addValueRow(sizePanel, "모선", "mm", values.slant, 3, 80, 0.5, 1)
            };
            rows.net.input.helpTip = "1~6: 1-4-1형, 7~9: 2-3-1형, 10: 2-2-2형, 11: 3-3형";
            var dashedCheck = sizePanel.add("checkbox", undefined, "접는 선 점선");
            var messageText = win.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            dashedCheck.value = dashedFolds;
            refreshEnabled();

            kindList.onChange = function() {
                kind = kindList.selection ? kindList.selection.index : 0;
                refreshEnabled();
                updatePreview();
            };
            for (var key in rows) bindKeyRow(key);
            dashedCheck.onClick = function() { dashedFolds = dashedCheck.value; updatePreview(); };
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
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
                    for (var i = 0; i < USES[kind].length; i++) if (USES[kind][i] === key) used = true;
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
                var sizes = {};
                for (var key in values) sizes[key] = key === "net" || key === "count" ? values[key] : values[key] * MM_TO_PT;
                var net = buildNet(kind, sizes);
                messageText.text = net.message || " ";
                if (net.faces.length === 0 && net.circles.length === 0 && net.sectors.length === 0) return;
                var drawing = netLines(net);

                previewGroup = layer.groupItems.add();
                previewGroup.name = "전개도 (" + KINDS[kind] + ")";
                for (var i = 0; i < drawing.length; i++) addPath(drawing[i]);
                for (var c = 0; c < net.circles.length; c++) addCircle(net.circles[c]);
                var b = netBounds(net);
                previewGroup.translate(viewCenter[0] - (b[0] + b[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (b[1] + b[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            // line: {points:[{anchor,left,right}], closed, fold}
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
                path.closed = line.closed;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.fold ? FOLD_PT : OUTLINE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.fold && dashedFolds) path.strokeDashes = FOLD_DASH;
            }

            function addCircle(circle) {
                var r = circle.radius;
                var path = previewGroup.pathItems.ellipse(circle.center[1] + r, circle.center[0] - r, r * 2, r * 2);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = OUTLINE_PT;
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
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-net.js). 길이는 pt
            // -------------------------------------------------------
            // 정육면체 전개도 11가지: 칸 [열, 행] 6개
            function cubeNets() {
                var nets = [];
                var ends = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]];   // 1-4-1형: 가운데 줄 4칸 위·아래 한 칸씩
                for (var i = 0; i < ends.length; i++) {
                    nets.push([[ends[i][0], 0], [0, 1], [1, 1], [2, 1], [3, 1], [ends[i][1], 2]]);
                }
                for (var x = 1; x <= 3; x++) nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [x, 2]]);   // 2-3-1형
                nets.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]]);   // 2-2-2형
                nets.push([[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]);   // 3-3형
                return nets;
            }

            // {faces:[[점…] 반시계], circles:[{center,radius}], sectors:[{center,radius,start,sweep}], message}
            function buildNet(kindIndex, v) {
                var net = { faces: [], circles: [], sectors: [], message: "" };
                var s = v.side;
                if (kindIndex === 0) {
                    var cells = cubeNets()[Math.max(0, Math.min(10, Math.round(v.net) - 1))];
                    for (var i = 0; i < cells.length; i++) {
                        var x = cells[i][0] * s, y = -cells[i][1] * s;
                        net.faces.push(rect(x, y - s, s, s));
                    }
                } else if (kindIndex === 1) {
                    // 옆면 네 개(가로 a·세로 b·a·b) 한 줄, 첫 a 면의 위·아래에 윗면·밑면
                    var a = s, b = v.depth, c = v.height, xs = [0, a, a + b, 2 * a + b, 2 * a + 2 * b];
                    for (var k = 0; k < 4; k++) net.faces.push(rect(xs[k], 0, xs[k + 1] - xs[k], c));
                    net.faces.push(rect(0, c, a, b));
                    net.faces.push(rect(0, -b, a, b));
                } else if (kindIndex === 2) {
                    var n = Math.round(v.count), h = v.height, middle = Math.floor((n - 1) / 2);
                    for (var f = 0; f < n; f++) net.faces.push(rect(f * s, 0, s, h));
                    net.faces.push(regularOnEdge([middle * s, h], [(middle + 1) * s, h], n));
                    net.faces.push(regularOnEdge([(middle + 1) * s, 0], [middle * s, 0], n));
                } else if (kindIndex === 3) {
                    var m = Math.round(v.count);
                    var circumradius = s / (2 * Math.sin(Math.PI / m));
                    if (v.lateral <= s / 2) {
                        net.message = "옆모서리가 한 변의 절반보다 길어야 합니다";
                        return net;
                    }
                    if (v.lateral <= circumradius) net.message = "옆모서리가 짧아 각뿔로 접히지 않습니다 (" + (circumradius / 2.834645669).toFixed(1) + "mm보다 길게)";
                    var base = regularOnEdge([0, 0], [s, 0], m);
                    net.faces.push(base);
                    var slantHeight = Math.sqrt(v.lateral * v.lateral - s * s / 4);
                    for (var e = 0; e < m; e++) {
                        var p = base[e], q = base[(e + 1) % m];
                        var outward = unit([q[1] - p[1], -(q[0] - p[0])]);
                        var apex = offset(midpoint(p, q), outward, slantHeight);
                        net.faces.push([q, p, apex]);
                    }
                } else if (kindIndex === 4) {
                    var r = v.radius, width = 2 * Math.PI * r;
                    net.faces.push(rect(0, 0, width, v.height));
                    net.circles.push({ center: [width / 2, v.height + r], radius: r });
                    net.circles.push({ center: [width / 2, -r], radius: r });
                } else if (kindIndex === 5) {
                    if (v.radius >= v.slant) {
                        net.message = "모선이 반지름보다 길어야 합니다";
                        return net;
                    }
                    var angle = 2 * Math.PI * v.radius / v.slant;
                    net.sectors.push({ center: [0, 0], radius: v.slant, start: -Math.PI / 2 - angle / 2, sweep: angle });
                    net.circles.push({ center: [0, -v.slant - v.radius], radius: v.radius });
                } else if (kindIndex === 6) {
                    var center = regularOnEdge([s, 0], [0, 0], 3);   // 꼭짓점이 아래로 향한 가운데 삼각형
                    net.faces.push(center);
                    for (var t = 0; t < 3; t++) net.faces.push(regularOnEdge(center[(t + 1) % 3], center[t], 3));
                } else if (kindIndex === 7) {
                    // 한 꼭짓점에 모인 네 면(부채 모양)과 그 바깥 변마다 한 면
                    var ring = [];
                    for (var j = 0; j <= 4; j++) {
                        var theta = (210 - 60 * j) * Math.PI / 180;
                        ring.push([s * Math.cos(theta), s * Math.sin(theta)]);
                    }
                    for (var g = 0; g < 4; g++) {
                        var fan = ccw([[0, 0], ring[g], ring[g + 1]]);
                        net.faces.push(fan);
                        net.faces.push(attachOutside(fan, ring[g], ring[g + 1], 3));
                    }
                } else if (kindIndex === 8) {
                    // 삼각형 10개 띠와 위·아래 5개씩
                    var hh = s * Math.sqrt(3) / 2;
                    for (var u = 0; u < 5; u++) {
                        var b0 = [u * s, 0], b1 = [(u + 1) * s, 0], t0 = [(u + 0.5) * s, hh], t1 = [(u + 1.5) * s, hh];
                        net.faces.push([b0, b1, t0]);
                        net.faces.push([t0, b1, t1]);
                        net.faces.push(regularOnEdge(t0, t1, 3));
                        net.faces.push(regularOnEdge(b1, b0, 3));
                    }
                }
                return net;
            }

            // 모서리 → 바깥선(한 면에만) · 접는 선(두 면이 나눔). 바깥선은 이어지는 한 패스로 묶는다
            function netLines(net) {
                var edges = {}, order = [];
                for (var f = 0; f < net.faces.length; f++) {
                    var face = net.faces[f];
                    for (var i = 0; i < face.length; i++) {
                        var a = face[i], b = face[(i + 1) % face.length];
                        var key = edgeKey(a, b);
                        if (!edges[key]) { edges[key] = { a: a, b: b, count: 0 }; order.push(key); }
                        edges[key].count++;
                    }
                }
                var lines = [], boundary = [];
                for (var k = 0; k < order.length; k++) {
                    var edge = edges[order[k]];
                    if (edge.count > 1) lines.push(straight([edge.a, edge.b], false, true));
                    else boundary.push(edge);
                }
                var loops = chainLoops(boundary);
                if (loops === null) {
                    for (var j = 0; j < boundary.length; j++) lines.push(straight([boundary[j].a, boundary[j].b], false, false));
                } else {
                    for (var l = 0; l < loops.length; l++) lines.push(straight(loops[l], true, false));
                }
                for (var s = 0; s < net.sectors.length; s++) {
                    var sector = net.sectors[s];
                    var points = [{ anchor: sector.center, left: sector.center, right: sector.center }].concat(
                        arcPoints(sector.center, sector.radius, sector.start, sector.sweep));
                    lines.push({ points: points, closed: true, fold: false });
                }
                return lines;
            }

            // 바깥 모서리를 이어 닫힌 고리들로. 한 점에 모서리가 2개가 아니면 null (따로 그린다)
            function chainLoops(edges) {
                var at = {};
                for (var i = 0; i < edges.length; i++) {
                    var ka = pointKey(edges[i].a), kb = pointKey(edges[i].b);
                    (at[ka] = at[ka] || []).push(i);
                    (at[kb] = at[kb] || []).push(i);
                }
                for (var key in at) if (at[key].length !== 2) return null;
                var used = [], loops = [];
                for (var start = 0; start < edges.length; start++) {
                    if (used[start]) continue;
                    var loop = [edges[start].a], current = start, point = edges[start].b;
                    used[start] = true;
                    while (pointKey(point) !== pointKey(loop[0])) {
                        loop.push(point);
                        var pair = at[pointKey(point)];
                        current = used[pair[0]] ? pair[1] : pair[0];
                        if (used[current]) return null;
                        used[current] = true;
                        point = pointKey(edges[current].a) === pointKey(point) ? edges[current].b : edges[current].a;
                    }
                    loops.push(loop);
                }
                return loops;
            }

            function netBounds(net) {
                var b = [Infinity, -Infinity, -Infinity, Infinity];   // left, top, right, bottom
                function add(x, y) {
                    b[0] = Math.min(b[0], x); b[2] = Math.max(b[2], x);
                    b[1] = Math.max(b[1], y); b[3] = Math.min(b[3], y);
                }
                for (var f = 0; f < net.faces.length; f++) for (var i = 0; i < net.faces[f].length; i++) add(net.faces[f][i][0], net.faces[f][i][1]);
                for (var c = 0; c < net.circles.length; c++) {
                    var circle = net.circles[c];
                    add(circle.center[0] - circle.radius, circle.center[1] - circle.radius);
                    add(circle.center[0] + circle.radius, circle.center[1] + circle.radius);
                }
                for (var s = 0; s < net.sectors.length; s++) {
                    var sector = net.sectors[s];
                    add(sector.center[0], sector.center[1]);
                    for (var t = 0; t <= 32; t++) {
                        var angle = sector.start + sector.sweep * t / 32;
                        add(sector.center[0] + sector.radius * Math.cos(angle), sector.center[1] + sector.radius * Math.sin(angle));
                    }
                }
                return b;
            }

            function rect(x, y, w, h) {
                return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
            }

            // 모서리 a→b의 왼쪽에 정n각형 (반시계)
            function regularOnEdge(a, b, n) {
                var points = [a, b], d = sub(b, a);
                for (var i = 2; i < n; i++) {
                    var angle = 2 * Math.PI * (i - 1) / n;
                    var step = [d[0] * Math.cos(angle) - d[1] * Math.sin(angle), d[0] * Math.sin(angle) + d[1] * Math.cos(angle)];
                    var last = points[points.length - 1];
                    points.push([last[0] + step[0], last[1] + step[1]]);
                }
                return points;
            }

            // 반시계 face의 모서리 p–q 바깥에 정n각형
            function attachOutside(face, p, q, n) {
                for (var i = 0; i < face.length; i++) {
                    var a = face[i], b = face[(i + 1) % face.length];
                    if (pointKey(a) === pointKey(p) && pointKey(b) === pointKey(q)) return regularOnEdge(q, p, n);
                    if (pointKey(a) === pointKey(q) && pointKey(b) === pointKey(p)) return regularOnEdge(p, q, n);
                }
                return regularOnEdge(q, p, n);
            }

            function ccw(points) {
                var area = 0;
                for (var i = 0; i < points.length; i++) {
                    var a = points[i], b = points[(i + 1) % points.length];
                    area += a[0] * b[1] - b[0] * a[1];
                }
                return area < 0 ? points.slice().reverse() : points;
            }

            function straight(anchors, closed, fold) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push({ anchor: anchors[i], left: anchors[i], right: anchors[i] });
                return { points: points, closed: closed, fold: fold };
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

            function pointKey(p) { return Math.round(p[0] * 100) + "," + Math.round(p[1] * 100); }
            function edgeKey(a, b) {
                var ka = pointKey(a), kb = pointKey(b);
                return ka < kb ? ka + "|" + kb : kb + "|" + ka;
            }
            function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
            function unit(v) {
                var length = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
                return [v[0] / length, v[1] / length];
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
                var parts = ["v1", kind, values.net, values.count, values.side, values.depth, values.height, values.lateral,
                    values.radius, values.slant, dashedFolds ? "1" : "0", offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 14) return;
                kind = Math.round(restoreNumber(p[1], kind, 0, KINDS.length - 1));
                values.net = Math.round(restoreNumber(p[2], values.net, 1, 11));
                values.count = Math.round(restoreNumber(p[3], values.count, 3, 8));
                values.side = restoreNumber(p[4], values.side, 3, 60);
                values.depth = restoreNumber(p[5], values.depth, 3, 60);
                values.height = restoreNumber(p[6], values.height, 3, 80);
                values.lateral = restoreNumber(p[7], values.lateral, 3, 80);
                values.radius = restoreNumber(p[8], values.radius, 2, 40);
                values.slant = restoreNumber(p[9], values.slant, 3, 80);
                dashedFolds = p[10] === "1";
                offsetXmm = restoreNumber(p[11], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[12], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[13] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 원 (원래 Object_CircleProps.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 원의 성질: 선택한 원 위의 점 A·B·P·T를 각도(오른쪽 0°, 반시계)로 정하고
    // 현 AB, 반지름 OA·OB, 원주각 ∠APB, 중심각·원주각 표시와 각도 값, 중심에서 현에 내린 수선 OM(직각 표시),
    // 부채꼴 AOB(A에서 반시계로 B까지), T에서의 접선(직각 표시), 원 밖의 점 Q에서 그은 두 접선 QC·QD를 골라 그린다.
    // 선 두께는 평가원 그림 기준: 현·반지름·접선 0.8pt, 수선·보조선(점선)·각 표시 0.3pt. 원 선은 기본으로 0.8pt로 맞춘다(끄면 그대로).
    function makeCirclePropsEngine() {
        var api = {label: "원", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "CircleProps/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 30;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var MAIN_PT = 0.8;
            var GUIDE_PT = 0.3;
            var GUIDE_DASH = [2, 1.5];
            var SECTOR_K = 15;
            var SHAPE_STROKE_PT = 0.8;
            var DOT_RADIUS_MM = 0.6;
            var LABEL_GAP_MM = 0.8;
            // 저장 순서. applySettings()가 위에서 불리므로 여기서 선언한다
            var FLAG_KEYS = ["center", "chord", "radii", "inscribed", "inscribedMark", "centralMark", "values",
                "perpendicular", "sector", "tangent", "external", "names"];
            var ANGLE_KEYS = ["a", "b", "p", "t", "q"];

            var doc = app.activeDocument;

            var target = null;
            var sel = doc.selection;
            if (sel && sel.length === 1 && sel[0].typename === "PathItem" && sel[0].closed) target = sel[0];
            var bounds = target ? target.geometricBounds : null;
            if (target === null || Math.abs((bounds[2] - bounds[0]) - (bounds[1] - bounds[3])) > (bounds[2] - bounds[0]) * 0.01 ||
                    !anchorsOnCircle(target, bounds)) {
                return "가로·세로가 같은 원(패스) 하나를 선택해주세요.";
            }
            var center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
            var radius = (bounds[2] - bounds[0]) / 2;

            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션 (각도는 도)
            var opt = {
                center: true, chord: true, radii: true, inscribed: true, inscribedMark: true, centralMark: true, values: false,
                perpendicular: false, sector: false, tangent: false, external: false, names: true,
                a: 210, b: 330, p: 100, t: 45, q: 0, qDistance: 2, markMm: 3
            };
            var normalizeStroke = true;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;
            var originalStroked = target.stroked;
            var originalStrokeWidth = target.strokeWidth;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var elementPanel = addPanel(win, "그릴 것");
            var checks = {};
            addCheckRow(elementPanel, [["center", "중심 O"], ["chord", "현 AB"], ["radii", "반지름 OA·OB"]]);
            addCheckRow(elementPanel, [["inscribed", "원주각 ∠APB"], ["inscribedMark", "원주각 표시"], ["centralMark", "중심각 표시"]]);
            addCheckRow(elementPanel, [["values", "각도 값"], ["perpendicular", "수선 OM"], ["sector", "부채꼴 AOB"]]);
            addCheckRow(elementPanel, [["tangent", "T의 접선"], ["external", "Q의 두 접선"], ["names", "점 이름"]]);
            checks.sector.helpTip = "A에서 반시계로 B까지";
            checks.external.helpTip = "원 밖의 점 Q에서 그은 두 접선 QC·QD";
            var normalizeCheck = elementPanel.add("checkbox", undefined, "원 선 " + SHAPE_STROKE_PT + "pt로 맞춤");
            normalizeCheck.helpTip = "평가원 그림의 도형 선(약 0.84pt)·과학 메인 선 기준. 끄면 원래 두께 그대로";

            var anglePanel = addPanel(win, "점 위치 (오른쪽 0°, 반시계)");
            var angleRows = {
                a: addValueRow(anglePanel, "A", "°", opt.a, 0, 359, 1, 0),
                b: addValueRow(anglePanel, "B", "°", opt.b, 0, 359, 1, 0),
                p: addValueRow(anglePanel, "P", "°", opt.p, 0, 359, 1, 0),
                t: addValueRow(anglePanel, "T", "°", opt.t, 0, 359, 1, 0),
                q: addValueRow(anglePanel, "Q 방향", "°", opt.q, 0, 359, 1, 0)
            };
            var distanceControls = addValueRow(anglePanel, "Q 거리", "반지름 배", opt.qDistance, 1.2, 4, 0.1, 1);

            var sizePanel = addPanel(win, "크기");
            var markControls = addValueRow(sizePanel, "각 표시 반지름", "mm", opt.markMm, 1, 10, 0.1, 1);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.1, 1);


            normalizeCheck.value = normalizeStroke;
            normalizeCheck.onClick = function() { normalizeStroke = normalizeCheck.value; updatePreview(); };
            for (var k = 0; k < ANGLE_KEYS.length; k++) bindAngleRow(ANGLE_KEYS[k]);
            bindValueRow(distanceControls, function(value) { opt.qDistance = value; });
            bindValueRow(markControls, function(value) { opt.markMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
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

            function bindAngleRow(key) {
                bindValueRow(angleRows[key], function(value) { opt[key] = value; });
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
                try {
                    target.stroked = originalStroked;
                    target.strokeWidth = originalStrokeWidth;
                } catch (restoreError) {}
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {}
                }
                previewGroup = null;
            }

            function buildPreview() {
                if (normalizeStroke) {
                    target.stroked = true;
                    target.strokeWidth = SHAPE_STROKE_PT;
                }
                // 부채꼴 채우기는 원 선의 안쪽 가장자리까지만 (선을 덮지 않게)
                var drawing = buildCircleFigure(center, radius, opt, opt.markMm * MM_TO_PT, target.stroked ? target.strokeWidth / 2 : 0);
                previewGroup = target.parent.groupItems.add();
                previewGroup.move(target, ElementPlacement.PLACEBEFORE);
                previewGroup.name = "원의 성질";
                for (var f = 0; f < drawing.fills.length; f++) addFill(drawing.fills[f]);
                for (var i = 0; i < drawing.lines.length; i++) addPath(drawing.lines[i]);
                for (var d = 0; d < drawing.dots.length; d++) addDot(drawing.dots[d]);
                for (var t = 0; t < drawing.texts.length; t++) addLabel(drawing.texts[t]);
                if (offsetXmm !== 0 || offsetYmm !== 0) previewGroup.translate(offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
            }

            function drawBezier(points, closed) {
                var path = previewGroup.pathItems.add();
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

            // line: {points, kind:"main"|"guide"|"mark"}
            function addPath(line) {
                var path = drawBezier(line.points, false);
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = line.kind === "main" ? MAIN_PT : GUIDE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
                path.strokeJoin = StrokeJoin.MITERENDJOIN;
                if (line.kind === "guide") path.strokeDashes = GUIDE_DASH;
            }

            function addFill(points) {
                var path = drawBezier(points, true);
                path.stroked = false;
                path.filled = true;
                path.fillColor = makeGray(SECTOR_K);
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
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                var halfW = (b[2] - b[0]) / 2, halfH = (b[1] - b[3]) / 2;
                var dir = label.dir;
                var reach = (label.clear || 0) + LABEL_GAP_MM * MM_TO_PT + halfW * Math.abs(dir[0]) + halfH * Math.abs(dir[1]);
                var x = label.at[0] + dir[0] * reach, y = label.at[1] + dir[1] * reach;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt). 점 이름은 똑바로
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

            // 가로·세로가 같은 삼각형·사각형은 원이 아니다: 모든 앵커가 중심에서 반지름만큼 떨어져 있어야 한다
            function anchorsOnCircle(path, box) {
                var cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2, r = (box[2] - box[0]) / 2;
                if (path.pathPoints.length < 4) return false;
                for (var i = 0; i < path.pathPoints.length; i++) {
                    var a = path.pathPoints[i].anchor;
                    if (Math.abs(Math.sqrt((a[0] - cx) * (a[0] - cx) + (a[1] - cy) * (a[1] - cy)) - r) > r * 0.02) return false;
                }
                return true;
            }

            // -------------------------------------------------------
            // 기하 (일러 DOM을 쓰지 않는다 → tests/check-circle-props.js)
            // -------------------------------------------------------
            function buildCircleFigure(O, r, o, markR, fillInset) {
                var out = { fills: [], lines: [], dots: [], texts: [] };
                var rad = Math.PI / 180;
                function on(deg) { return [O[0] + r * Math.cos(deg * rad), O[1] + r * Math.sin(deg * rad)]; }
                function name(text, point) { if (o.names) out.texts.push({ text: text, at: point, dir: unit(sub(point, O)) }); }
                var A = on(o.a), B = on(o.b), P = on(o.p);
                var sweep = ((o.b - o.a) % 360 + 360) % 360 * rad;   // A에서 반시계로 B까지 (중심각)
                var usesAB = o.chord || o.radii || o.inscribed || o.centralMark || o.perpendicular || o.sector;

                if (o.sector) out.fills.push([plain(O)].concat(arcPoints(O, r - (fillInset || 0), o.a * rad, sweep)));
                if (o.chord) out.lines.push(line([A, B], "main"));
                if (o.radii) {
                    out.lines.push(line([O, A], "main"));
                    out.lines.push(line([O, B], "main"));
                }
                if (o.centralMark && sweep > 0) {
                    out.lines.push({ points: arcPoints(O, markR, o.a * rad, sweep), kind: "mark" });
                    if (o.values) out.texts.push({ text: formatDegrees(sweep / rad), at: O, dir: unitAt(o.a * rad + sweep / 2), clear: markR });
                }
                if (o.inscribed) {
                    out.lines.push(line([A, P, B], "main"));
                    name("P", P);
                    var span = smallAngle(P, A, B);
                    if (o.inscribedMark) out.lines.push({ points: arcPoints(P, markR, span.start, span.sweep), kind: "mark" });
                    if (o.values) out.texts.push({ text: formatDegrees(span.sweep / rad), at: P, dir: unitAt(span.start + span.sweep / 2), clear: markR });
                }
                if (o.perpendicular) {
                    var M = midpoint(A, B);
                    if (dist(O, M) > r * 1e-6) {
                        out.lines.push(line([O, M], "guide"));
                        out.lines.push(rightAngle(M, unit(sub(O, M)), unit(sub(B, M)), markR * 0.6));
                        name("M", M);
                    }
                }
                if (usesAB) {
                    name("A", A);
                    name("B", B);
                }
                if (o.tangent) {
                    var T = on(o.t), along = [-Math.sin(o.t * rad), Math.cos(o.t * rad)];
                    out.lines.push(line([offset(T, along, -r * 0.9), offset(T, along, r * 0.9)], "main"));
                    out.lines.push(line([O, T], "main"));
                    out.lines.push(rightAngle(T, unit(sub(O, T)), along, markR * 0.6));
                    name("T", T);
                }
                if (o.external) {
                    var Q = [O[0] + o.qDistance * r * Math.cos(o.q * rad), O[1] + o.qDistance * r * Math.sin(o.q * rad)];
                    var alpha = Math.acos(1 / o.qDistance) / rad;
                    var C = on(o.q + alpha), D = on(o.q - alpha);
                    out.lines.push(line([C, Q, D], "main"));
                    out.lines.push(line([O, C], "guide"));
                    out.lines.push(line([O, D], "guide"));
                    out.lines.push(line([O, Q], "guide"));
                    out.lines.push(rightAngle(C, unit(sub(O, C)), unit(sub(Q, C)), markR * 0.6));
                    out.lines.push(rightAngle(D, unit(sub(O, D)), unit(sub(Q, D)), markR * 0.6));
                    name("Q", Q);
                    name("C", C);
                    name("D", D);
                }
                if (o.center) {
                    out.dots.push(O);
                    // 중심각·반지름·부채꼴이 있으면 그 반대쪽, 없으면 아래
                    var away = (o.centralMark || o.radii || o.sector) && sweep > 0 ? unitAt(o.a * rad + sweep / 2 + Math.PI) : [0, -1];
                    if (o.names) out.texts.push({ text: "O", at: O, dir: away, clear: DOT_RADIUS_MM * 2.834645669 });
                }
                return out;
            }

            // V에서 두 점 쪽 선분 사이의 작은 각: 시작 방향과 반시계 크기(라디안)
            function smallAngle(V, A, B) {
                var start = angleOf(sub(A, V)), sweep = angleOf(sub(B, V)) - start;
                while (sweep < 0) sweep += Math.PI * 2;
                if (sweep > Math.PI) {
                    start = angleOf(sub(B, V));
                    sweep = Math.PI * 2 - sweep;
                }
                return { start: start, sweep: sweep };
            }

            function rightAngle(V, d1, d2, size) {
                var p1 = offset(V, d1, size);
                return line([p1, offset(p1, d2, size), offset(V, d2, size)], "mark");
            }

            // 60°, 47.5° (소수 한 자리까지, .0은 뺀다)
            function formatDegrees(value) {
                var rounded = Math.round(value * 10) / 10;
                return (rounded === Math.round(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1)) + "°";
            }

            // 3차 베지어 원호 (90°씩 나눈다)
            function arcPoints(c, radiusValue, start, sweep) {
                var pieces = Math.max(1, Math.ceil(sweep / (Math.PI / 2) - 1e-9));
                var step = sweep / pieces;
                var handle = 4 / 3 * Math.tan(step / 4) * radiusValue;
                var points = [];
                for (var i = 0; i <= pieces; i++) {
                    var angle = start + step * i;
                    var cos = Math.cos(angle), sin = Math.sin(angle);
                    var a = [c[0] + radiusValue * cos, c[1] + radiusValue * sin];
                    var tangent = [-sin * handle, cos * handle];
                    points.push({
                        anchor: a,
                        left: i === 0 ? a : [a[0] - tangent[0], a[1] - tangent[1]],
                        right: i === pieces ? a : [a[0] + tangent[0], a[1] + tangent[1]]
                    });
                }
                return points;
            }

            function line(anchors, kind) {
                var points = [];
                for (var i = 0; i < anchors.length; i++) points.push(plain(anchors[i]));
                return { points: points, kind: kind };
            }

            function plain(p) { return { anchor: p, left: p, right: p }; }
            function unitAt(angle) { return [Math.cos(angle), Math.sin(angle)]; }
            function midpoint(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
            function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
            function dist(a, b) { return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])); }
            function angleOf(v) { return Math.atan2(v[1], v[0]); }
            function offset(point, dir, distance) { return [point[0] + dir[0] * distance, point[1] + dir[1] * distance]; }
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
                var angles = [];
                for (var j = 0; j < ANGLE_KEYS.length; j++) angles.push(opt[ANGLE_KEYS[j]]);
                var parts = ["v1", flags, angles.join(","), opt.qDistance, opt.markMm, normalizeStroke ? "1" : "0", fontPt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 10 || p[1].length !== FLAG_KEYS.length) return;
                var angles = p[2].split(",");
                if (angles.length !== ANGLE_KEYS.length) return;
                for (var i = 0; i < FLAG_KEYS.length; i++) opt[FLAG_KEYS[i]] = p[1].charAt(i) === "1";
                for (var j = 0; j < ANGLE_KEYS.length; j++) opt[ANGLE_KEYS[j]] = Math.round(restoreNumber(angles[j], opt[ANGLE_KEYS[j]], 0, 359));
                opt.qDistance = restoreNumber(p[3], opt.qDistance, 1.2, 4);
                opt.markMm = restoreNumber(p[4], opt.markMm, 1, 10);
                normalizeStroke = p[5] === "1";
                fontPt = restoreNumber(p[6], fontPt, 5, 14);
                offsetXmm = restoreNumber(p[7], offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                offsetYmm = restoreNumber(p[8], offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                previewEnabled = p[9] === "1";
            }

            function restoreNumber(text, fallback, minimum, maximum) {
                var value = parseNumber(text);
                return value === null ? fallback : clamp(value, minimum, maximum);
            }
        }
        return api;
    }

    // ==== 수형도 (원래 Object_TreeDiagram.jsx) ====
    // 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
    try {
        var __memo = new File(Folder.temp + "/illu_last_script.txt");
        __memo.encoding = "UTF-8";
        __memo.open("w");
        __memo.write($.fileName);
        __memo.close();
    } catch (e) {}
    
    // 경우의 수 수형도: 단계별 선택지("앞, 뒤 / 앞, 뒤 / 앞, 뒤")를 왼쪽→오른쪽 나무로 펼친다.
    // '중복 없이'를 켜면 앞 단계에서 나온 것은 빼고 펼친다(A, B, C에서 두 개를 뽑아 세우기 등).
    // 끝 가지 오른쪽에 결과를 (앞, 뒤) 또는 AB처럼 붙인다. 분류 계통도(들여쓰기 입력)와 달리 가지를 자동으로 만든다.
    // 연결선은 0.4pt. 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.
    function makeTreeDiagramEngine() {
        var api = {label: "수형도", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "TreeDiagram/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var LABEL_WIDTH = 100;
            var INPUT_WIDTH = 50;
            var SLIDER_WIDTH = 196;
            var MAX_LEAVES = 200;
            var RESULT_STYLES = ["결과 없음", "(앞, 뒤)처럼 괄호", "AB처럼 붙여 쓰기"];
            var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
            var ENG_FONT_NAME = "GSMediumB1";
            var ENG_BASELINE_PT = 0.5;
            var LINE_PT = 0.4;
            var LINE_GAP_MM = 1;

            var doc = app.activeDocument;
            var viewCenter = doc.activeView.centerPoint;
            var layer = findEditableLayer();
            var korFont = findTextFont([KOR_FONT_NAME, ENG_FONT_NAME]);
            var engFont = findTextFont([ENG_FONT_NAME, KOR_FONT_NAME]);

            // 옵션
            var stagesText = "앞, 뒤 / 앞, 뒤 / 앞, 뒤";
            var noRepeat = false;
            var resultStyle = 1;
            var stageGapMm = 14;
            var rowGapMm = 5;
            var fontPt = 8;
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            applySettings();

            var previewGroup = null;

            // -------------------------------------------------------
            // 다이얼로그
            // -------------------------------------------------------
            var win = page;   // 탭 페이지에 그대로 쌓는다

            var inputPanel = addPanel(win, "단계별 선택지");
            var stagesInput = inputPanel.add("edittext", undefined, stagesText);
            stagesInput.preferredSize.width = 360;
            stagesInput.helpTip = "단계는 /, 선택지는 쉼표로 나눈다. 예: 앞, 뒤 / 앞, 뒤 / 1, 2, 3, 4, 5, 6";
            var optionRow = inputPanel.add("group");
            var noRepeatCheck = optionRow.add("checkbox", undefined, "중복 없이 (앞에서 나온 것 빼기)");
            var resultRow = inputPanel.add("group");
            resultRow.add("statictext", undefined, "끝 결과:");
            var resultList = resultRow.add("dropdownlist", undefined, RESULT_STYLES);
            resultList.selection = resultStyle;
            var messageText = inputPanel.add("statictext", undefined, " ");
            messageText.preferredSize.width = 360;

            var sizePanel = addPanel(win, "크기");
            var stageControls = addValueRow(sizePanel, "단계 간격", "mm", stageGapMm, 6, 40, 0.5, 1);
            var rowControls = addValueRow(sizePanel, "줄 간격", "mm", rowGapMm, 2, 15, 0.5, 1);
            var fontControls = addValueRow(sizePanel, "글자 크기", "pt", fontPt, 5, 14, 0.5, 1);

            var positionPanel = addPanel(win, "위치");
            var offsetXControls = addValueRow(positionPanel, "가로 이동", "mm", offsetXmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);
            var offsetYControls = addValueRow(positionPanel, "세로 이동", "mm", offsetYmm, -POSITION_LIMIT_MM, POSITION_LIMIT_MM, 0.5, 1);


            noRepeatCheck.value = noRepeat;

            stagesInput.onChanging = function() { stagesText = stagesInput.text; updatePreview(); };
            noRepeatCheck.onClick = function() { noRepeat = noRepeatCheck.value; updatePreview(); };
            resultList.onChange = function() { resultStyle = resultList.selection ? resultList.selection.index : 0; updatePreview(); };
            bindValueRow(stageControls, function(value) { stageGapMm = value; });
            bindValueRow(rowControls, function(value) { rowGapMm = value; });
            bindValueRow(fontControls, function(value) { fontPt = value; });
            // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
            bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

            // 탭 호스트가 부르는 훅. 확인: 저장하고 미리보기를 결과로 남긴다
            api.commit = function() {
                if (previewGroup === null) buildPreview();
                saveSettings();
                doc.selection = null;
                if (previewGroup !== null) previewGroup.selected = true;
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
                var stages = parseStages(stagesText);
                if (stages === null) {
                    messageText.text = "단계를 읽지 못함 (빈 단계가 있음)";
                    return;
                }
                var tree = layoutTree(stages, noRepeat, stageGapMm * MM_TO_PT, rowGapMm * MM_TO_PT, MAX_LEAVES);
                if (tree === null) {
                    messageText.text = "끝 가지가 " + MAX_LEAVES + "개를 넘습니다";
                    return;
                }
                messageText.text = "모두 " + tree.leaves + "가지";
                if (tree.nodes.length === 0) return;

                previewGroup = layer.groupItems.add();
                previewGroup.name = "수형도";
                var gap = LINE_GAP_MM * MM_TO_PT;
                var halfWidths = [];
                for (var i = 0; i < tree.nodes.length; i++) {
                    var node = tree.nodes[i];
                    var frame = addText(node.label, node.x, node.y);
                    var b = frame.geometricBounds;
                    halfWidths.push((b[2] - b[0]) / 2);
                    if (node.parent >= 0) {
                        var parent = tree.nodes[node.parent];
                        addLine([parent.x + halfWidths[node.parent] + gap, parent.y], [node.x - halfWidths[i] - gap, node.y]);
                    }
                    if (node.leaf && resultStyle > 0) {
                        var result = resultStyle === 1 ? "(" + node.path.join(", ") + ")" : node.path.join("");
                        var resultFrame = addText(result, 0, node.y);
                        var rb = resultFrame.geometricBounds;
                        resultFrame.translate(node.x + halfWidths[i] + stageGapMm * MM_TO_PT * 0.5 - rb[0], 0);
                    }
                }
                var bounds = previewGroup.geometricBounds;
                previewGroup.translate(viewCenter[0] - (bounds[0] + bounds[2]) / 2 + offsetXmm * MM_TO_PT,
                    viewCenter[1] - (bounds[1] + bounds[3]) / 2 + offsetYmm * MM_TO_PT);
            }

            function addLine(a, b) {
                var path = previewGroup.pathItems.add();
                path.setEntirePath([a, b]);
                path.closed = false;
                path.filled = false;
                path.stroked = true;
                path.strokeColor = makeGray(100);
                path.strokeWidth = LINE_PT;
                path.strokeCap = StrokeCap.BUTTENDCAP;
            }

            // 가운데가 (x, y)인 글자
            function addText(text, x, y) {
                var frame = previewGroup.textFrames.add();
                frame.contents = text;
                var range = frame.textRange;
                var attributes = range.characterAttributes;
                attributes.size = fontPt;
                attributes.fillColor = makeGray(100);
                applyTextFonts(frame);
                var b = frame.geometricBounds;
                frame.translate(x - (b[0] + b[2]) / 2, y - (b[1] + b[3]) / 2);
                return frame;
            }

            // 글자 서체 (02_문자/Text_koen.jsx 규칙): 한글·공백 Spoqa(기준선 0), 영문·숫자·기호 GSMediumB1(기준선 +0.5pt)
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
            // 계산 (일러 DOM을 쓰지 않는다 → tests/check-tree-diagram.js)
            // -------------------------------------------------------
            // "앞, 뒤 / 앞, 뒤" → [["앞","뒤"],["앞","뒤"]]. 빈 단계가 있으면 null (입력 중 끝의 /는 무시)
            function parseStages(text) {
                var parts = String(text).split("/");
                var stages = [];
                for (var i = 0; i < parts.length; i++) {
                    var items = [];
                    var pieces = parts[i].split(",");
                    for (var j = 0; j < pieces.length; j++) {
                        var item = pieces[j].replace(/^\s+|\s+$/g, "");
                        if (item !== "") items.push(item);
                    }
                    if (items.length === 0) {
                        if (i === parts.length - 1 && i > 0) continue;
                        return null;
                    }
                    stages.push(items);
                }
                return stages;
            }

            // 나무를 펼쳐 마디마다 {label, x, y, parent, leaf, path}. 끝 가지는 한 줄씩, 부모는 자식들 가운데.
            // 끝 가지가 limit를 넘으면 null
            function layoutTree(stages, withoutRepeat, stageGap, rowGap, limit) {
                var nodes = [], leafCount = 0, tooMany = false;
                function grow(depth, parentIndex, path) {
                    var ys = [];
                    var choices = stages[depth];
                    for (var i = 0; i < choices.length && !tooMany; i++) {
                        if (withoutRepeat && contains(path, choices[i])) continue;
                        var index = nodes.length;
                        var nextPath = path.concat([choices[i]]);
                        nodes.push({ label: choices[i], x: depth * stageGap, y: 0, parent: parentIndex, leaf: false, path: nextPath });
                        var last = depth + 1 >= stages.length;
                        var childYs = last ? [] : grow(depth + 1, index, nextPath);
                        if (!last && childYs.length === 0) {
                            nodes.pop();   // 중복 없이 뽑다가 다음 단계에 남은 게 없으면 이 가지는 없다
                            continue;
                        }
                        if (last) {
                            if (leafCount >= limit) { tooMany = true; nodes.pop(); break; }
                            nodes[index].leaf = true;
                            nodes[index].y = -leafCount * rowGap;
                            leafCount++;
                        } else {
                            nodes[index].y = (childYs[0] + childYs[childYs.length - 1]) / 2;
                        }
                        ys.push(nodes[index].y);
                    }
                    return ys;
                }
                grow(0, -1, []);
                if (tooMany) return null;
                return { nodes: nodes, leaves: leafCount };
            }

            function contains(list, value) {
                for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
                return false;
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
                var parts = ["v1", encodeURIComponent(stagesText), noRepeat ? "1" : "0", resultStyle, stageGapMm, rowGapMm, fontPt,
                    offsetXmm, offsetYmm, previewEnabled ? "1" : "0"];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v1" || p.length !== 10) return;
                try {
                    stagesText = decodeURIComponent(p[1]);
                    noRepeat = p[2] === "1";
                    resultStyle = Math.round(restoreNumber(p[3], resultStyle, 0, RESULT_STYLES.length - 1));
                    stageGapMm = restoreNumber(p[4], stageGapMm, 6, 40);
                    rowGapMm = restoreNumber(p[5], rowGapMm, 2, 15);
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
})();
