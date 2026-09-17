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

// 그래프·표: 축 눈금·그래프 마커·표·점선 분할선을 한 창의 탭으로 묶었다.
// 탭마다 필요한 선택이 다르다 (축 눈금: 사각형, 마커: 꺾은선 패스, 표·점선 분할선: 축에 나란한 사각형).
// 선택에 맞지 않는 탭은 흐리게 두고 툴팁에 이유를 적는다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로다.
(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var TAB_PREF_KEY = "GraphTools/tab";   // 마지막에 쓴 탭. 각 탭의 옵션은 원래 스크립트의 키에 그대로 남는다

    var selectedItems = [];
    var sel = doc.selection;
    for (var selIndex = 0; sel && selIndex < sel.length; selIndex++) selectedItems.push(sel[selIndex]);

    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null (탭의 컨트롤을 만들고 미리보기 훅을 api에 단다) /
    // setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    var engines = [makeAxisTicksEngine(), makeGraphMarkersEngine(), makeTableEngine(), makeDashedGridEngine()];

    var win = new Window("dialog", "그래프·표");
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

    // ==== 축 눈금 ====
    function makeAxisTicksEngine() {
        var api = {label: "축 눈금", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "AxisTickMarks/settings";
            // 화살표 이름은 Illustrator UI 언어를 따른다 (한국어판 기준)
            var ARROW_NAME = "화살표 1";

            var doc = app.activeDocument;
            var sel = doc.selection;

            if (sel.length === 0) return "사각형을 선택해주세요.";
            var rect = sel[0];
            if (rect.typename !== "PathItem") return "PathItem(사각형)을 선택해주세요.";

            // 단위·스타일 상수
            var mmToPt = 2.834645669;
            var tickLength = 1.0 * mmToPt;
            var tickWeight = 0.4;
            var gridWeight = 0.3;
            var gridDashPattern = [2, 1];
            var axisWeight = 0.4;
            var arrowMargin = 3.0 * mmToPt;

            // 사각형 좌표 (원본은 미리보기 동안 숨겼다가 확정 시 삭제)
            var bounds = rect.geometricBounds;
            var leftX = bounds[0];
            var topY = bounds[1];
            var rightX = bounds[2];
            var bottomY = bounds[3];
            var originX = leftX;
            var originY = bottomY;
            var rectWasHidden = rect.hidden;

            var blackColor = new CMYKColor();
            blackColor.cyan = 0;
            blackColor.magenta = 0;
            blackColor.yellow = 0;
            blackColor.black = 100;

            var gridColor = new CMYKColor();
            gridColor.cyan = 0;
            gridColor.magenta = 0;
            gridColor.yellow = 0;
            gridColor.black = 80;

            var tickFont = app.textFonts.getByName("GSMediumB1");
            var legendFont = getFont("SpoqaHanSansNeo-Regular");

            // readOptions()가 채우는 옵션 값들
            var xCount = 5, yCount = 5;
            var xStart = 1, xStep = 1, yStart = 1, yStep = 1;
            var xLabelOffset = 0, yLabelOffset = 0;
            var useLegend = true, useZero = true, useArrow = true;
            var useBox = false, useXGrid = false, useYGrid = false;
            var legendAtCenter = false;
            var xLegendText = "", yLegendText = "";
            var legendGap = 1 * mmToPt;

            var POSITION_LIMIT_MM = 100;
            var OFFSET_STEP_MM = 0.1;
            var offsetXmm = 0;
            var offsetYmm = 0;

            var previewEnabled = true;
            var previewGroup = null;

            // -------------------------------------------------------
            // ScriptUI 다이얼로그
            // -------------------------------------------------------
            var dlg = page;

            var shapeGroup = dlg.add("group");
            shapeGroup.add("statictext", undefined, "형태:");
            var axisShapeRadio = shapeGroup.add("radiobutton", undefined, "축 2개 (L자 + 화살촉)");
            var boxShapeRadio = shapeGroup.add("radiobutton", undefined, "사각형 유지");
            axisShapeRadio.value = true;

            // 0 = 그 축에 눈금 없음
            var TICK_COUNT_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8];

            dlg.add("statictext", undefined, "Y축(왼쪽) 눈금 갯수:");
            var yGroup = dlg.add("group");
            var yBtns = [];
            for (var m = 0; m < TICK_COUNT_OPTIONS.length; m++) {
                var btn2 = yGroup.add("radiobutton", undefined, String(TICK_COUNT_OPTIONS[m]));
                if (TICK_COUNT_OPTIONS[m] === 5) btn2.value = true;
                yBtns.push(btn2);
            }

            var yValueGroup = dlg.add("group");
            yValueGroup.add("statictext", undefined, "Y축 시작 숫자:");
            var yStartInput = yValueGroup.add("edittext", undefined, "1");
            yStartInput.characters = 6;
            yValueGroup.add("statictext", undefined, "간격:");
            var yStepInput = yValueGroup.add("edittext", undefined, "1");
            yStepInput.characters = 6;

            var yOffsetGroup = dlg.add("group");
            yOffsetGroup.add("statictext", undefined, "Y축과 숫자 간격:");
            var yOffsetHalfBtn = yOffsetGroup.add("radiobutton", undefined, "0.5mm");
            var yOffsetOneBtn = yOffsetGroup.add("radiobutton", undefined, "1mm");
            yOffsetOneBtn.value = true;

            dlg.add("statictext", undefined, "X축(아래쪽) 눈금 갯수:");
            var xGroup = dlg.add("group");
            var xBtns = [];
            for (var n = 0; n < TICK_COUNT_OPTIONS.length; n++) {
                var btn = xGroup.add("radiobutton", undefined, String(TICK_COUNT_OPTIONS[n]));
                if (TICK_COUNT_OPTIONS[n] === 5) btn.value = true;
                xBtns.push(btn);
            }

            var xValueGroup = dlg.add("group");
            xValueGroup.add("statictext", undefined, "X축 시작 숫자:");
            var xStartInput = xValueGroup.add("edittext", undefined, "1");
            xStartInput.characters = 6;
            xValueGroup.add("statictext", undefined, "간격:");
            var xStepInput = xValueGroup.add("edittext", undefined, "1");
            xStepInput.characters = 6;

            var xOffsetGroup = dlg.add("group");
            xOffsetGroup.add("statictext", undefined, "X축과 숫자 간격:");
            var xOffsetHalfBtn = xOffsetGroup.add("radiobutton", undefined, "0.5mm");
            var xOffsetOneBtn = xOffsetGroup.add("radiobutton", undefined, "1mm");
            xOffsetOneBtn.value = true;

            var gridGroupRow = dlg.add("group");
            gridGroupRow.add("statictext", undefined, "보조선:");
            var xGridCheck = gridGroupRow.add("checkbox", undefined, "X축 보조선");
            var yGridCheck = gridGroupRow.add("checkbox", undefined, "Y축 보조선");

            var legendPanel = dlg.add("panel", undefined, "축 범례");
            legendPanel.orientation = "column";
            legendPanel.alignChildren = "left";
            legendPanel.margins = 10;

            var legendCheck = legendPanel.add("checkbox", undefined, "축 범례 넣기");
            legendCheck.value = true;

            var legendTextGroup = legendPanel.add("group");
            legendTextGroup.add("statictext", undefined, "X축:");
            var xLegendInput = legendTextGroup.add("edittext", undefined, "시간");
            xLegendInput.characters = 8;
            legendTextGroup.add("statictext", undefined, "Y축:");
            var yLegendInput = legendTextGroup.add("edittext", undefined, "거리");
            yLegendInput.characters = 8;

            var legendPosGroup = legendPanel.add("group");
            legendPosGroup.add("statictext", undefined, "범례 위치:");
            var legendEndRadio = legendPosGroup.add("radiobutton", undefined, "끝");
            var legendCenterRadio = legendPosGroup.add("radiobutton", undefined, "중앙");
            legendEndRadio.value = true;

            var legendGapGroup = legendPanel.add("group");
            legendGapGroup.alignChildren = ["left", "center"];
            legendGapGroup.add("statictext", undefined, "숫자와 범례 간격 (mm):");
            var legendGapInput = legendGapGroup.add("edittext", undefined, "1");
            legendGapInput.characters = 6;
            legendGapInput.justify = "center";
            var legendGapSlider = legendGapGroup.add("scrollbar", undefined, 1, 0, 10);
            legendGapSlider.preferredSize.width = 196;
            legendGapSlider.stepdelta = 0.1;
            legendGapSlider.jumpdelta = 1;

            var zeroCheck = legendPanel.add("checkbox", undefined, "원점에 0 넣기 (대각선 2mm)");
            zeroCheck.value = true;

            var arrowCheck = legendPanel.add("checkbox", undefined, "축 양 끝에 화살표 1 넣기");
            arrowCheck.value = true;

            var positionPanel = dlg.add("panel", undefined, "위치");
            positionPanel.orientation = "column";
            positionPanel.alignChildren = "left";
            var offsetXControls = addOffsetControls(positionPanel, "가로 이동", offsetXmm);
            var offsetYControls = addOffsetControls(positionPanel, "세로 이동", offsetYmm);


            function updateArrowEnabled() {
                // 사각형 유지 모드에서는 축 끝이 없어 화살표를 붙일 수 없다
                arrowCheck.enabled = axisShapeRadio.value;
            }

            // 모든 컨트롤 변경 시 미리보기 갱신
            function onOptionChanged() {
                updateArrowEnabled();
                updatePreview();
            }

            axisShapeRadio.onClick = onOptionChanged;
            boxShapeRadio.onClick = onOptionChanged;
            for (var rb = 0; rb < yBtns.length; rb++) {
                yBtns[rb].onClick = updatePreview;
                xBtns[rb].onClick = updatePreview;
            }
            yStartInput.onChanging = updatePreview;
            yStepInput.onChanging = updatePreview;
            xStartInput.onChanging = updatePreview;
            xStepInput.onChanging = updatePreview;
            yOffsetHalfBtn.onClick = updatePreview;
            yOffsetOneBtn.onClick = updatePreview;
            xOffsetHalfBtn.onClick = updatePreview;
            xOffsetOneBtn.onClick = updatePreview;
            xGridCheck.onClick = updatePreview;
            yGridCheck.onClick = updatePreview;
            legendCheck.onClick = updatePreview;
            xLegendInput.onChanging = updatePreview;
            yLegendInput.onChanging = updatePreview;
            legendEndRadio.onClick = updatePreview;
            legendCenterRadio.onClick = updatePreview;
            legendGapInput.onChanging = updatePreview;
            // 스크롤바는 0.1 격자에 맞춰 움직이고, 입력창 값은 스크롤바에 되돌려 준다
            legendGapSlider.onChanging = function() {
                legendGapInput.text = String(Math.round(legendGapSlider.value * 10) / 10);
                updatePreview();
            };
            legendGapInput.onChange = function() {
                var value = parseNumber(legendGapInput.text);
                if (value !== null) legendGapSlider.value = Math.max(0, Math.min(10, value));
            };
            zeroCheck.onClick = updatePreview;
            arrowCheck.onClick = updatePreview;
            // 위치는 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetControls(offsetXControls, true);
            bindOffsetControls(offsetYControls, false);
            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 사각형을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                rect.hidden = true;
                rect.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                rect.hidden = rectWasHidden;
                rect.selected = true;
            };
            api.commit = function() {
                if (!readOptions(true)) return false;
                saveSettings();
                clearPreview();
                var finalGroup = drawAxisTicks(true);
                moveItem(finalGroup, offsetXmm * mmToPt, offsetYmm * mmToPt);
                rect.remove();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            applySettings();
            updateArrowEnabled();

            // -------------------------------------------------------
            // 옵션 읽기
            // -------------------------------------------------------
            function readOptions(showAlert) {
                var values = [
                    parseNumber(xStartInput.text),
                    parseNumber(xStepInput.text),
                    parseNumber(yStartInput.text),
                    parseNumber(yStepInput.text)
                ];
                for (var v = 0; v < values.length; v++) {
                    if (values[v] === null) {
                        if (showAlert) alert("시작 숫자와 간격을 숫자로 입력해주세요.");
                        return false;
                    }
                }
                var gapValue = parseNumber(legendGapInput.text);
                if (legendCheck.value && gapValue === null) {
                    if (showAlert) alert("숫자와 범례 간격을 숫자로 입력해주세요.");
                    return false;
                }

                xStart = values[0];
                xStep = values[1];
                yStart = values[2];
                yStep = values[3];
                xCount = getSelectedCount(xBtns);
                yCount = getSelectedCount(yBtns);
                yLabelOffset = (yOffsetHalfBtn.value ? 0.5 : 1.0) * mmToPt;
                xLabelOffset = (xOffsetHalfBtn.value ? 0.5 : 1.0) * mmToPt;
                useLegend = legendCheck.value;
                useZero = zeroCheck.value;
                xLegendText = xLegendInput.text;
                yLegendText = yLegendInput.text;
                legendGap = (gapValue === null ? 1 : gapValue) * mmToPt;
                useBox = boxShapeRadio.value;
                useXGrid = xGridCheck.value;
                useYGrid = yGridCheck.value;
                useArrow = arrowCheck.value && !useBox;
                legendAtCenter = legendCenterRadio.value;
                return true;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview() {
                clearPreview();
                if (!previewEnabled) {
                    app.redraw();
                    return;
                }
                if (!readOptions(false)) {
                    app.redraw();
                    return;
                }
                previewGroup = drawAxisTicks(false);
                moveItem(previewGroup, offsetXmm * mmToPt, offsetYmm * mmToPt);
                previewGroup.name = "AxisTickMarks Preview";
                app.redraw();
            }

            // 위치 행: 라벨 · 입력칸 · 단위 · 화살표 버튼 · 슬라이더
            function addOffsetControls(parent, label, value) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                row.add("statictext", undefined, label + " (mm):").preferredSize.width = 70;
                var input = row.add("edittext", undefined, formatOffset(value));
                input.characters = 6;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value,
                    -POSITION_LIMIT_MM, POSITION_LIMIT_MM);
                slider.stepdelta = OFFSET_STEP_MM;
                slider.jumpdelta = OFFSET_STEP_MM * 10;
                slider.preferredSize.width = 196;
                return {input: input, slider: slider};
            }

            // 값이 바뀌면 도형을 다시 만들지 않고 미리보기 그룹만 옮긴다
            function bindOffsetControls(controls, isX) {
                function current() { return isX ? offsetXmm : offsetYmm; }
                function commit(value) {
                    if (value === null || !isFinite(value)) return;
                    value = Math.round(value / OFFSET_STEP_MM) * OFFSET_STEP_MM;
                    if (value < -POSITION_LIMIT_MM) value = -POSITION_LIMIT_MM;
                    if (value > POSITION_LIMIT_MM) value = POSITION_LIMIT_MM;
                    var delta = (value - current()) * mmToPt;
                    if (isX) offsetXmm = value;
                    else offsetYmm = value;
                    controls.input.text = formatOffset(value);
                    try { controls.slider.value = value; } catch (e) {}
                    if (delta === 0 || previewGroup === null) return;
                    moveItem(previewGroup, isX ? delta : 0, isX ? 0 : delta);
                    app.redraw();
                }
                controls.slider.onChanging = function() { commit(controls.slider.value); };
                controls.slider.onChange = function() { commit(controls.slider.value); };
                controls.input.onChange = function() {
                    var value = parseNumber(controls.input.text);
                    commit(value === null ? current() : value);
                };
            }

            function setOffsetValue(controls, isX, value) {
                if (value === null || !isFinite(value)) return;
                if (Math.abs(value) > POSITION_LIMIT_MM) return;
                if (isX) offsetXmm = value;
                else offsetYmm = value;
                controls.input.text = formatOffset(value);
                try { controls.slider.value = value; } catch (e) {}
            }

            function formatOffset(value) {
                return String(Math.round(value * 10) / 10);
            }

            function moveItem(item, deltaX, deltaY) {
                if (item === null || (deltaX === 0 && deltaY === 0)) return;
                try { item.translate(deltaX, deltaY); } catch (e) {}
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            // -------------------------------------------------------
            // 그리기. isFinal이 아니면 느린 액션(파선 정렬, 화살표)은 생략한다.
            // -------------------------------------------------------
            function drawAxisTicks(isFinal) {
                var group = doc.groupItems.add();
                group.name = "AxisTickMarks";

                var xLabelLowest = null;
                var yLabelLeftmost = null;

                // 축: L자(위쪽 끝 → 원점 → 오른쪽 끝) 또는 사각형 상자
                var axis = group.pathItems.add();
                if (useBox) {
                    axis.setEntirePath([
                        [originX, topY],
                        [originX, originY],
                        [rightX, originY],
                        [rightX, topY]
                    ]);
                    axis.closed = true;
                } else {
                    axis.setEntirePath([
                        [originX, topY],
                        [originX, originY],
                        [rightX, originY]
                    ]);
                }
                axis.stroked = true;
                axis.strokeColor = blackColor;
                axis.strokeWidth = axisWeight;
                axis.filled = false;

                // 보조선: 80K 파선. 눈금 위치를 따라 반대쪽 끝까지 긋는다
                var gridLineGroup = group.groupItems.add();
                gridLineGroup.name = "Grid Lines";

                function addGridLine(x1, y1, x2, y2) {
                    var line = gridLineGroup.pathItems.add();
                    line.setEntirePath([[x1, y1], [x2, y2]]);
                    line.filled = false;
                    line.stroked = true;
                    line.strokeColor = gridColor;
                    line.strokeWidth = gridWeight;
                    try { line.strokeDashes = gridDashPattern; } catch (e) {}
                }

                // 눈금 간격: 상자 모드는 화살표 여백이 필요 없어 모서리까지 편다
                var endMargin = useBox ? 0 : arrowMargin;
                var xSpacing = xCount > 0 ? (rightX - endMargin - originX) / xCount : 0;
                var ySpacing = yCount > 0 ? (topY - endMargin - originY) / yCount : 0;

                // 텍스트 아웃라인 기준 배치 함수
                function createAlignedLabel(text, anchorX, anchorY, alignMode) {
                    var tf = doc.textFrames.add();
                    tf.contents = text;
                    tf.textRange.characterAttributes.size = 8;
                    tf.textRange.characterAttributes.textFont = tickFont;
                    tf.textRange.characterAttributes.fillColor = blackColor;
                    tf.top = anchorY;
                    tf.left = anchorX;

                    var gb = glyphBounds(tf);
                    var glyphTop = gb[1];
                    var glyphRight = gb[2];
                    var glyphCenterX = (gb[0] + gb[2]) / 2;
                    var glyphCenterY = (gb[1] + gb[3]) / 2;

                    if (alignMode === "bottom") {
                        tf.top = tf.top + (anchorY - xLabelOffset - glyphTop);
                        tf.left = tf.left + (anchorX - glyphCenterX);
                        var placedBottom = anchorY - xLabelOffset - (glyphTop - gb[3]);
                        if (xLabelLowest === null || placedBottom < xLabelLowest) xLabelLowest = placedBottom;
                    } else if (alignMode === "left") {
                        tf.left = tf.left + (anchorX - yLabelOffset - glyphRight);
                        tf.top = tf.top + (anchorY - glyphCenterY);
                        var placedLeft = anchorX - yLabelOffset - (glyphRight - gb[0]);
                        if (yLabelLeftmost === null || placedLeft < yLabelLeftmost) yLabelLeftmost = placedLeft;
                    }

                    tf.move(group, ElementPlacement.PLACEATEND);
                }

                function createLegendText(text, font, vertical) {
                    var tf = doc.textFrames.add();
                    tf.contents = text;
                    if (vertical) tf.orientation = TextOrientation.VERTICAL;
                    var attr = tf.textRange.characterAttributes;
                    if (font !== null) attr.textFont = font;
                    attr.size = 8;
                    attr.fillColor = blackColor;
                    return tf;
                }

                // X축 눈금 (갯수 0이면 눈금 없는 축)
                for (var i = 0; xCount > 0 && i <= xCount; i++) {
                    var xPos = originX + xSpacing * i;

                    var tick = group.pathItems.add();
                    tick.setEntirePath([[xPos, originY], [xPos, originY + tickLength]]);
                    tick.stroked = true;
                    tick.strokeColor = blackColor;
                    tick.strokeWidth = tickWeight;
                    tick.filled = false;

                    if (i > 0) {
                        if (useXGrid && xPos < rightX - 0.01) {
                            addGridLine(xPos, originY, xPos, topY);
                        }
                        createAlignedLabel(formatNumber(xStart + xStep * (i - 1)), xPos, originY, "bottom");
                    }
                }

                // Y축 눈금 (갯수 0이면 눈금 없는 축)
                for (var j = 0; yCount > 0 && j <= yCount; j++) {
                    var yPos = originY + ySpacing * j;

                    var tick2 = group.pathItems.add();
                    tick2.setEntirePath([[originX, yPos], [originX + tickLength, yPos]]);
                    tick2.stroked = true;
                    tick2.strokeColor = blackColor;
                    tick2.strokeWidth = tickWeight;
                    tick2.filled = false;

                    if (j > 0) {
                        if (useYGrid && yPos < topY - 0.01) {
                            addGridLine(originX, yPos, rightX, yPos);
                        }
                        createAlignedLabel(formatNumber(yStart + yStep * (j - 1)), originX, yPos, "left");
                    }
                }

                // 축 범례: 숫자 라벨의 바깥 경계에서 지정한 간격만큼 더 바깥에 배치
                if (useLegend) {
                    var xLegendBase = (xLabelLowest === null) ? (originY - xLabelOffset) : xLabelLowest;
                    var yLegendBase = (yLabelLeftmost === null) ? (originX - yLabelOffset) : yLabelLeftmost;

                    if (xLegendText !== "") {
                        var xLegend = createLegendText(xLegendText, legendFont, false);
                        var xb = glyphBounds(xLegend);
                        // 끝: X축 오른쪽 끝 정렬 / 중앙: 축 가운데 정렬. 숫자줄 아래로 간격만큼
                        var xLegendLeft = legendAtCenter
                            ? (originX + rightX) / 2 - (xb[2] - xb[0]) / 2
                            : rightX - (xb[2] - xb[0]);
                        moveGlyphTo(xLegend, xLegendLeft, xLegendBase - legendGap);
                        xLegend.move(group, ElementPlacement.PLACEATEND);
                    }

                    if (yLegendText !== "") {
                        var yLegend = createLegendText(yLegendText, legendFont, true);
                        var yb = glyphBounds(yLegend);
                        // 끝: Y축 위 끝 정렬 / 중앙: 축 가운데 정렬. 숫자열 왼쪽으로 간격만큼
                        var yLegendTop = legendAtCenter
                            ? (originY + topY) / 2 + (yb[1] - yb[3]) / 2
                            : topY;
                        moveGlyphTo(yLegend, yLegendBase - legendGap - (yb[2] - yb[0]), yLegendTop);
                        yLegend.move(group, ElementPlacement.PLACEATEND);
                    }
                }

                // 원점 0: 원점에서 좌하단 45도 대각선 2mm (글자 중심 기준)
                if (useZero) {
                    var zeroGap = 2 * mmToPt / Math.sqrt(2);
                    var zeroText = createLegendText("0", tickFont, false);
                    var zb = glyphBounds(zeroText);
                    moveGlyphTo(
                        zeroText,
                        originX - zeroGap - (zb[2] - zb[0]) / 2,
                        originY - zeroGap + (zb[1] - zb[3]) / 2
                    );
                    zeroText.move(group, ElementPlacement.PLACEATEND);
                }

                if (gridLineGroup.pathItems.length > 0) {
                    // 파선을 모퉁이와 패스 끝에 맞춰 정렬(스트로크 패널의 두 번째 파선 옵션).
                    // 액션을 거치는 느린 작업이라 미리보기에서는 생략한다.
                    if (isFinal) {
                        applyDashPatternToItems([gridLineGroup], gridDashPattern, false);
                    }
                    gridLineGroup.zOrder(ZOrderMethod.SENDTOBACK);
                } else {
                    gridLineGroup.remove();
                }

                // 축 양 끝 화살표: DOM에 노출되지 않는 속성이라 액션으로 적용. 미리보기에서는 생략
                if (isFinal && useArrow) {
                    applyAxisArrowheads(axis);
                }

                return group;
            }

            // -------------------------------------------------------
            // 공용 헬퍼
            // -------------------------------------------------------
            function getFont(name) {
                try {
                    return app.textFonts.getByName(name);
                } catch (e) {
                    return null;
                }
            }

            // 글리프의 보이는 경계 측정 (복제 → 윤곽선 변환 → 경계 확인 → 삭제)
            function glyphBounds(tf) {
                var dup = tf.duplicate();
                var outline = dup.createOutline();
                var gb = outline.geometricBounds; // [left, top, right, bottom]
                outline.remove();
                return gb;
            }

            // 글리프 경계의 (left, top)이 목표 지점에 오도록 이동
            function moveGlyphTo(tf, targetLeft, targetTop) {
                var gb = glyphBounds(tf);
                tf.translate(targetLeft - gb[0], targetTop - gb[1]);
            }

            function getSelectedCount(btns) {
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].value) return TICK_COUNT_OPTIONS[i];
                }
                return 5;
            }

            function parseNumber(text) {
                var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (normalized === "") return null;
                var value = Number(normalized);
                return isFinite(value) ? value : null;
            }

            function formatNumber(value) {
                var rounded = Math.round(value * 10000) / 10000;
                return String(rounded);
            }

            // -------------------------------------------------------
            // 설정 저장 · 복원
            // -------------------------------------------------------
            function saveSettings() {
                var parts = [
                    "v7",
                    getSelectedCount(yBtns),
                    yStartInput.text,
                    yStepInput.text,
                    yOffsetHalfBtn.value ? "0.5" : "1",
                    getSelectedCount(xBtns),
                    xStartInput.text,
                    xStepInput.text,
                    xOffsetHalfBtn.value ? "0.5" : "1",
                    legendCheck.value ? "1" : "0",
                    xLegendInput.text,
                    yLegendInput.text,
                    legendGapInput.text,
                    zeroCheck.value ? "1" : "0",
                    arrowCheck.value ? "1" : "0",
                    boxShapeRadio.value ? "1" : "0",
                    legendCenterRadio.value ? "1" : "0",
                    xGridCheck.value ? "1" : "0",
                    yGridCheck.value ? "1" : "0",
                    offsetXmm,
                    offsetYmm
                ];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if ((p[0] !== "v6" && p[0] !== "v7") || p.length < 19) return;
                try {
                    selectCount(yBtns, parseInt(p[1], 10));
                    yStartInput.text = p[2];
                    yStepInput.text = p[3];
                    yOffsetHalfBtn.value = (p[4] === "0.5");
                    yOffsetOneBtn.value = !yOffsetHalfBtn.value;
                    selectCount(xBtns, parseInt(p[5], 10));
                    xStartInput.text = p[6];
                    xStepInput.text = p[7];
                    xOffsetHalfBtn.value = (p[8] === "0.5");
                    xOffsetOneBtn.value = !xOffsetHalfBtn.value;
                    legendCheck.value = (p[9] === "1");
                    xLegendInput.text = p[10];
                    yLegendInput.text = p[11];
                    if (parseNumber(p[12]) !== null) { legendGapInput.text = p[12]; legendGapInput.onChange(); }
                    zeroCheck.value = (p[13] === "1");
                    arrowCheck.value = (p[14] === "1");
                    boxShapeRadio.value = (p[15] === "1");
                    axisShapeRadio.value = !boxShapeRadio.value;
                    legendCenterRadio.value = (p[16] === "1");
                    legendEndRadio.value = !legendCenterRadio.value;
                    xGridCheck.value = (p[17] === "1");
                    yGridCheck.value = (p[18] === "1");
                    if (p[0] === "v7" && p.length >= 21) {
                        setOffsetValue(offsetXControls, true, parseNumber(p[19]));
                        setOffsetValue(offsetYControls, false, parseNumber(p[20]));
                    }
                } catch (e) {}
            }

            function selectCount(btns, count) {
                for (var i = 0; i < btns.length; i++) {
                    if (TICK_COUNT_OPTIONS[i] === count) {
                        for (var j = 0; j < btns.length; j++) {
                            btns[j].value = (j === i);
                        }
                        return;
                    }
                }
            }

            // -------------------------------------------------------
            // 화살표 액션
            // -------------------------------------------------------
            function applyAxisArrowheads(axisPath) {
                var actionSetName = "Codex_AxisTools";
                var actionName = "AxisArrowheads";
                var actionFile = new File(Folder.temp + "/Codex_AxisArrowheads.aia");

                try {
                    doc.selection = null;
                    axisPath.selected = true;

                    writeArrowheadAction(actionFile, actionSetName, actionName);
                    try { app.unloadAction(actionSetName, ""); } catch (e) {}
                    app.loadAction(actionFile);
                    app.doScript(actionName, actionSetName);
                } catch (actionError) {
                    // 화살표 이름은 UI 언어에 따라 다르다. 실패해도 축 자체는 그대로 남는다.
                }

                try { app.unloadAction(actionSetName, ""); } catch (e2) {}
                try { actionFile.remove(); } catch (e3) {}
                doc.selection = null;
            }

            // 액션 파일의 문자열은 UTF-8 바이트를 16진수로 적는다
            function toActionHex(text) {
                var bytes = [];
                for (var i = 0; i < text.length; i++) {
                    var code = text.charCodeAt(i);
                    if (code < 0x80) {
                        bytes.push(code);
                    } else if (code < 0x800) {
                        bytes.push(0xC0 | (code >> 6), 0x80 | (code & 0x3F));
                    } else {
                        bytes.push(0xE0 | (code >> 12), 0x80 | ((code >> 6) & 0x3F), 0x80 | (code & 0x3F));
                    }
                }
                var hex = "";
                for (var j = 0; j < bytes.length; j++) {
                    var part = bytes[j].toString(16).toUpperCase();
                    if (part.length < 2) part = "0" + part;
                    hex += part;
                }
                return {hex: hex, length: bytes.length};
            }

            function writeArrowheadAction(actionFile, actionSetName, actionName) {
                var setName = toActionHex(actionSetName);
                var name = toActionHex(actionName);
                var arrow = toActionHex(ARROW_NAME);
                var lines = [];

                lines.push("/version 3");
                lines.push("/name [ " + setName.length);
                lines.push("    " + setName.hex);
                lines.push("]");
                lines.push("/isOpen 1");
                lines.push("/actionCount 1");
                lines.push("/action-1 {");
                lines.push("    /name [ " + name.length);
                lines.push("        " + name.hex);
                lines.push("    ]");
                lines.push("    /keyIndex 0");
                lines.push("    /colorIndex 0");
                lines.push("    /isOpen 1");
                lines.push("    /eventCount 1");
                lines.push("    /event-1 {");
                lines.push("        /useRulersIn1stQuadrant 0");
                lines.push("        /internalName (ai_plugin_setStroke)");
                lines.push("        /localizedName [ 10");
                lines.push("            536574205374726F6B65");
                lines.push("        ]");
                lines.push("        /isOpen 1");
                lines.push("        /isOn 1");
                lines.push("        /hasDialog 0");
                lines.push("        /parameterCount 6");

                // 선 두께 (pt)
                lines.push("        /parameter-1 {");
                lines.push("            /key 2003072104");
                lines.push("            /showInPalette -1");
                lines.push("            /type (unit real)");
                lines.push("            /value " + axisWeight);
                lines.push("            /unit 592476268");
                lines.push("        }");
                // 시작 화살표
                lines.push("        /parameter-2 {");
                lines.push("            /key 1634231345");
                lines.push("            /showInPalette -1");
                lines.push("            /type (ustring)");
                lines.push("            /value [ " + arrow.length);
                lines.push("                " + arrow.hex);
                lines.push("            ]");
                lines.push("        }");
                // 끝 화살표
                lines.push("        /parameter-3 {");
                lines.push("            /key 1634231346");
                lines.push("            /showInPalette -1");
                lines.push("            /type (ustring)");
                lines.push("            /value [ " + arrow.length);
                lines.push("                " + arrow.hex);
                lines.push("            ]");
                lines.push("        }");
                // 시작/끝 화살표 크기 100%
                lines.push("        /parameter-4 {");
                lines.push("            /key 1634951985");
                lines.push("            /showInPalette -1");
                lines.push("            /type (real)");
                lines.push("            /value 100.0");
                lines.push("        }");
                lines.push("        /parameter-5 {");
                lines.push("            /key 1634951986");
                lines.push("            /showInPalette -1");
                lines.push("            /type (real)");
                lines.push("            /value 100.0");
                lines.push("        }");
                // 화살표 정렬: 패스 끝의 팁
                lines.push("        /parameter-6 {");
                lines.push("            /key 1634230636");
                lines.push("            /showInPalette -1");
                lines.push("            /type (enumerated)");
                lines.push("            /name [ 17");
                lines.push("                ED8CA8EC8AA420EB819DEC9D9820ED8C81");
                lines.push("            ]");
                lines.push("            /value 0");
                lines.push("        }");

                lines.push("    }");
                lines.push("}");

                actionFile.encoding = "UTF-8";
                actionFile.open("w");
                actionFile.write(lines.join("\n"));
                actionFile.close();
            }
            return null;
        }
        return api;
    }

    // ==== 그래프 마커 ====
    function makeGraphMarkersEngine() {
        var api = {label: "그래프 마커", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectGraphMarkers/settings";
            var PREVIEW_NAME = "GraphMarkers_Preview";
            var PREVIEW_INTERVAL_MS = 80;
            var LABEL_WIDTH = 90;    // Object_isometric.jsx와 같은 행 구성
            var SLIDER_WIDTH = 196;
            var mmToPt = 72 / 25.4;
            var SHAPES = ["원", "사각형", "삼각형"];
            var SIZE_VALUES = rangeValues(0.5, 2, 0.1);      // mm
            var FILL_VALUES = rangeValues(0, 100, 10);       // K
            var STROKE_VALUES = [0].concat(rangeValues(0.3, 1, 0.1)); // pt, 0이면 선 없음
            var LINE_VALUES = rangeValues(0.5, 2, 0.1);      // pt, 꺾은선 두께

            var doc = app.activeDocument;
            var paths = [];
            var selected = [];
            for (var i0 = 0; i0 < doc.selection.length; i0++) selected.push(doc.selection[i0]);
            collectPaths(selected, paths);
            if (paths.length === 0) return "꺾은선 그래프(패스)를 선택해주세요.";

            var originalWidths = [];
            for (var w = 0; w < paths.length; w++) originalWidths.push(paths[w].strokeWidth);

            var options = readSettings();
            var previewGroup = null;
            var committed = false;
            var previewPending = false;
            var lastPreviewTime = 0;

            var win = page;

            var shapePanel = win.add("panel", undefined, "모양");
            shapePanel.alignChildren = "left";
            var shapeRow = shapePanel.add("group");
            for (var s = 0; s < SHAPES.length; s++) {
                var radio = shapeRow.add("radiobutton", undefined, SHAPES[s]);
                radio.value = (options.shape === s);
                radio.onClick = makeShapeHandler(s);
            }

            var markerPanel = win.add("panel", undefined, "마커");
            markerPanel.alignChildren = "fill";
            markerPanel.spacing = 2;
            addRow(markerPanel, "크기", "size", SIZE_VALUES, "mm");
            addRow(markerPanel, "채움 (K)", "fillK", FILL_VALUES, "").helpTip = "10 단위";
            addRow(markerPanel, "선 두께", "stroke", STROKE_VALUES, "pt").helpTip = "0이면 선 없음, 선은 100K";

            var linePanel = win.add("panel", undefined, "꺾은선");
            linePanel.alignChildren = "fill";
            linePanel.spacing = 2;
            addRow(linePanel, "선 두께", "lineWidth", LINE_VALUES, "pt");

            var status = win.add("statictext", undefined, " ");
            status.preferredSize.width = 360;

            // 탭 호스트가 부르는 훅. 미리보기 체크는 호스트 것을 쓴다
            api.setPreview = function(on) { options.preview = on; updatePreview(); };
            api.updatePreview = function() { updatePreview(); };
            api.clearPreview = function() {
                if (committed) return;
                clearPreview();
                setLineWidths(null);
            };
            api.commit = function() {
                options.preview = true;
                if (previewGroup === null || previewPending) {
                    if (!buildPreview()) return false;
                }
                setLineWidths(options.lineWidth);
                committed = true;
                previewGroup.name = "GraphMarkers";
                saveSettings();
                var result = groupWithGraph();
                doc.selection = null;
                result.selected = true;
                return true;
            };

            // 선택했던 그래프와 마커 그룹을 한 그룹으로 묶는다. 쌓임 순서는 유지하고 마커가 맨 위
            function groupWithGraph() {
                try {
                    var wrapper = selected[0].parent.groupItems.add();
                    wrapper.name = "Graph";
                    wrapper.move(selected[0], ElementPlacement.PLACEBEFORE);
                    for (var i = selected.length - 1; i >= 0; i--) {
                        selected[i].move(wrapper, ElementPlacement.PLACEATBEGINNING);
                    }
                    previewGroup.move(wrapper, ElementPlacement.PLACEATBEGINNING);
                    return wrapper;
                } catch (e) {
                    status.text = "그룹으로 묶지 못했습니다: " + e;
                    return previewGroup;
                }
            }


            function makeShapeHandler(index) {
                return function() {
                    options.shape = index;
                    updatePreview();
                };
            }

            // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장). 스크롤바는 values의 인덱스를 움직인다
            function addRow(panel, label, key, values, unit) {
                var row = panel.add("group");
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 6;
                var slider = row.add("scrollbar", undefined, nearestIndex(values, options[key]), 0, values.length - 1);
                slider.preferredSize.width = SLIDER_WIDTH;
                slider.stepdelta = 1;
                slider.jumpdelta = 1;
                function apply(index, dragging) {
                    index = Math.max(0, Math.min(values.length - 1, Math.round(index)));
                    var value = values[index];
                    slider.value = index;
                    input.text = String(value);
                    if (value === options[key]) {
                        if (!dragging && previewPending) updatePreview();
                        return;
                    }
                    options[key] = value;
                    if (key === "lineWidth") {
                        // 마커는 그대로 두고 꺾은선 두께만 바꾼다
                        if (options.preview) { setLineWidths(value); app.redraw(); }
                        return;
                    }
                    updatePreview(dragging);
                }
                slider.onChanging = function() { apply(slider.value, true); };
                slider.onChange = function() { apply(slider.value); };
                input.onChange = function() {
                    var number = Number(input.text);
                    if (!/\S/.test(input.text) || !isFinite(number)) { input.text = String(options[key]); return; }
                    apply(nearestIndex(values, number));
                };
                return caption;
            }

            // -------------------------------------------------------
            // 미리보기
            // -------------------------------------------------------
            function updatePreview(dragging) {
                previewPending = true;
                if (dragging === true && new Date().getTime() - lastPreviewTime < PREVIEW_INTERVAL_MS) return;
                try {
                    if (!options.preview) {
                        clearPreview();
                        setLineWidths(null);
                    } else {
                        if (!buildPreview()) return;
                        setLineWidths(options.lineWidth);
                    }
                    previewPending = false;
                    app.redraw();
                    lastPreviewTime = new Date().getTime();
                    status.text = " ";
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기를 갱신하지 못했습니다: " + e + " (" + e.line + "행)";
                }
            }

            // 마커 수가 적어 매번 새로 그린다. 그룹은 맨 위 선 바로 위에 둔다
            function buildPreview() {
                try {
                    clearPreview();
                    previewGroup = paths[0].parent.groupItems.add();
                    previewGroup.name = PREVIEW_NAME;
                    previewGroup.move(paths[0], ElementPlacement.PLACEBEFORE);
                    var size = options.size * mmToPt;
                    var fill = makeGray(options.fillK);
                    var black = makeGray(100);
                    for (var i = 0; i < paths.length; i++) {
                        var points = paths[i].pathPoints;
                        for (var j = 0; j < points.length; j++) {
                            var marker = makeMarker(previewGroup, points[j].anchor, size);
                            marker.closed = true;
                            marker.filled = true;
                            marker.fillColor = fill;
                            marker.stroked = options.stroke > 0;
                            if (marker.stroked) {
                                marker.strokeColor = black;
                                marker.strokeWidth = options.stroke;
                            }
                        }
                    }
                    return true;
                } catch (e) {
                    clearPreview();
                    status.text = "미리보기 오류: " + e + " (" + e.line + "행)";
                    return false;
                }
            }

            function makeMarker(container, anchor, size) {
                var x = anchor[0], y = anchor[1];
                if (options.shape === 0) return container.pathItems.ellipse(y + size / 2, x - size / 2, size, size);
                if (options.shape === 1) return container.pathItems.rectangle(y + size / 2, x - size / 2, size, size);
                var path = container.pathItems.add();
                path.setEntirePath(trianglePoints(x, y, size));
                return path;
            }

            // 한 변이 size인 정삼각형. 외접 사각형의 중심이 (x, y)에 오고 꼭짓점은 위를 향한다
            function trianglePoints(x, y, size) {
                var height = size * Math.sqrt(3) / 2;
                return [[x, y + height / 2], [x + size / 2, y - height / 2], [x - size / 2, y - height / 2]];
            }

            // null이면 스크립트 실행 전 두께로 되돌린다
            function setLineWidths(width) {
                for (var i = 0; i < paths.length; i++) {
                    try {
                        paths[i].stroked = true;
                        paths[i].strokeWidth = (width === null) ? originalWidths[i] : width;
                    } catch (e) {}
                }
            }

            function clearPreview() {
                if (previewGroup !== null) {
                    try { previewGroup.remove(); } catch (e) {
                        try { app.redraw(); previewGroup.remove(); } catch (e2) {}
                    }
                    previewGroup = null;
                }
                // 참조가 죽어 못 지운 미리보기 그룹을 이름으로 찾아 지운다
                try {
                    var groups = paths[0].parent.groupItems;
                    for (var i = groups.length - 1; i >= 0; i--) {
                        if (groups[i].name === PREVIEW_NAME) {
                            try { groups[i].remove(); } catch (e3) {}
                        }
                    }
                } catch (e4) {}
            }

            // -------------------------------------------------------
            // 도우미
            // -------------------------------------------------------
            function collectPaths(items, out) {
                if (!items) return;
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (item.typename === "PathItem") {
                        if (!item.guides && !item.clipping && item.pathPoints.length > 0) out.push(item);
                    } else if (item.typename === "GroupItem" || item.typename === "CompoundPathItem") {
                        collectPaths(item.pageItems || item.pathItems, out);
                    }
                }
            }

            function rangeValues(min, max, step) {
                var values = [];
                for (var v = min; v <= max + step / 2; v += step) values.push(Math.round(v * 100) / 100);
                return values;
            }

            function nearestIndex(values, value) {
                var best = 0;
                for (var i = 1; i < values.length; i++) {
                    if (Math.abs(values[i] - value) < Math.abs(values[best] - value)) best = i;
                }
                return best;
            }

            function makeGray(k) {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = k;
                } else {
                    color = new RGBColor();
                    var level = Math.round(255 * (1 - k / 100));
                    color.red = level; color.green = level; color.blue = level;
                }
                return color;
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function readSettings() {
                var result = { shape: 0, size: 1, fillK: 100, stroke: 0, lineWidth: 1, preview: true };
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v2" || p.length !== 7) return result;
                    var shape = Number(p[1]), size = Number(p[2]), fillK = Number(p[3]), stroke = Number(p[4]);
                    var lineWidth = Number(p[5]);
                    if (shape >= 0 && shape < SHAPES.length && shape === Math.round(shape)) result.shape = shape;
                    if (hasValue(SIZE_VALUES, size)) result.size = size;
                    if (hasValue(FILL_VALUES, fillK)) result.fillK = fillK;
                    if (hasValue(STROKE_VALUES, stroke)) result.stroke = stroke;
                    if (hasValue(LINE_VALUES, lineWidth)) result.lineWidth = lineWidth;
                    result.preview = (p[6] !== "0");
                } catch (e) {}
                return result;
            }

            function hasValue(values, value) {
                return isFinite(value) && values[nearestIndex(values, value)] === value;
            }

            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY,
                        ["v2", options.shape, options.size, options.fillK, options.stroke, options.lineWidth, options.preview ? 1 : 0].join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }

    // ==== 표 ====
    function makeTableEngine() {
        var api = {label: "표", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectTable/settings";
            var MM_TO_PT = 2.834645669;
            var POSITION_LIMIT_MM = 100;
            var MAX_ROWS = 6;
            var MAX_COLS = 6;
            var SIZE_STEP_MM = 0.5;
            var SIZE_MIN_MM = 1;
            var SIZE_MAX_MM = 120;

            var doc = app.activeDocument;
            var source = getSelectedRectangle(doc.selection);
            if (source === null) return "가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.";

            var bounds = source.geometricBounds; // [left, top, right, bottom]
            var tableLeft = bounds[0];
            var tableTop = bounds[1];
            var tableWidthMm = (bounds[2] - bounds[0]) / MM_TO_PT;
            var tableHeightMm = (bounds[1] - bounds[3]) / MM_TO_PT;
            if (tableWidthMm <= 0 || tableHeightMm <= 0) return "가로와 세로 크기가 있는 사각형을 선택해주세요.";

            var rowCount = 3;
            var colCount = 3;
            // 각 줄이 바로 위의 켜진 줄을 따라갈지 여부. 전부 켜면 모든 줄이 첫 줄을 따라간다.
            var rowLinked = filledArray(MAX_ROWS, true);
            var colLinked = filledArray(MAX_COLS, true);
            var strokeWidthPt = 0.3;
            var headerK = 0;            // 1행 내부 음영. 0이면 채우지 않는다.
            var offsetXmm = 0;
            var offsetYmm = 0;
            var previewEnabled = true;
            var previewGroup = null;
            var sourceWasHidden = source.hidden;

            applySavedSettings();

            // 행 높이·열 너비는 선택한 사각형에서 나오는 값이라 저장하지 않고 매번 다시 나눈다
            var rowHeightsMm = seedSizes(tableHeightMm, rowCount, MAX_ROWS);
            var colWidthsMm = seedSizes(tableWidthMm, colCount, MAX_COLS);

            var LABEL_WIDTH = 52;
            // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
            var SLIDER_WIDTH = 196;

            var dlg = page;

            var countPanel = addPanel(dlg, "표");
            var rowCountField = addNumberField(countPanel, "행 수", "개", rowCount, 1, 1, MAX_ROWS, false);
            var colCountField = addNumberField(countPanel, "열 수", "개", colCount, 1, 1, MAX_COLS, false);
            var headerKField = addNumberField(countPanel, "1행 음영", "K", headerK, 10, 0, 100, false);

            var rowPanel = addPanel(dlg, "행 높이 (체크한 줄은 위 줄을 따라감)");
            var rowFields = [];
            for (var r = 0; r < MAX_ROWS; r++) {
                rowFields[r] = addNumberField(rowPanel, (r + 1) + "행", "mm", rowHeightsMm[r],
                    SIZE_STEP_MM, SIZE_MIN_MM, SIZE_MAX_MM, true);
                rowFields[r].check.value = rowLinked[r];
                bindSizeField(rowFields[r]);
            }

            var colPanel = addPanel(dlg, "열 너비 (체크한 줄은 왼쪽 줄을 따라감)");
            var colFields = [];
            for (var c = 0; c < MAX_COLS; c++) {
                colFields[c] = addNumberField(colPanel, (c + 1) + "열", "mm", colWidthsMm[c],
                    SIZE_STEP_MM, SIZE_MIN_MM, SIZE_MAX_MM, true);
                colFields[c].check.value = colLinked[c];
                bindSizeField(colFields[c]);
            }

            var linePanel = addPanel(dlg, "선");
            var strokeField = addNumberField(linePanel, "두께", "pt", strokeWidthPt, 0.1, 0.1, 3, false);

            var positionPanel = addPanel(dlg, "위치");
            var offsetXField = addNumberField(positionPanel, "가로 이동", "mm", offsetXmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, false);
            var offsetYField = addNumberField(positionPanel, "세로 이동", "mm", offsetYmm, 0.1,
                -POSITION_LIMIT_MM, POSITION_LIMIT_MM, false);
            // 위치는 표를 다시 만들지 않고 미리보기 그룹만 옮긴다
            bindOffsetField(offsetXField, true);
            bindOffsetField(offsetYField, false);


            // 행·열 수가 바뀌면 사각형을 다시 균등하게 나눈다
            rowCountField.onCommit = function() {
                var next = readCount(rowCountField, rowCount, MAX_ROWS);
                if (next !== rowCount) {
                    rowCount = next;
                    reseedFields(rowFields, tableHeightMm, rowCount);
                }
                refreshSizeFields();
            };
            colCountField.onCommit = function() {
                var next = readCount(colCountField, colCount, MAX_COLS);
                if (next !== colCount) {
                    colCount = next;
                    reseedFields(colFields, tableWidthMm, colCount);
                }
                refreshSizeFields();
            };

            refreshSizeFields(true);
            // 탭 호스트가 부르는 훅. 이 탭이 켜져 있는 동안만 원본 사각형을 숨긴다
            api.setPreview = function(on) {
                previewEnabled = on;
                source.hidden = true;
                source.selected = false;
                updatePreview();
            };
            api.updatePreview = updatePreview;
            api.clearPreview = function() {
                clearPreview();
                source.hidden = sourceWasHidden;
                source.selected = true;
            };
            api.commit = function() {
                if (!readFields(true)) return false;
                clearPreview();
                readFields(false);
                var finalGroup = drawTable();
                moveItem(finalGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                finalGroup.name = "Table";
                try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
                source.remove();
                saveSettings();
                doc.selection = null;
                finalGroup.selected = true;
                return true;
            };

            // -------------------------------------------------------
            // 그리기
            // -------------------------------------------------------
            // 셀 하나가 테두리 사각형 하나. 인접한 셀은 변이 같은 자리에 겹치므로 선 굵기는 그대로다.
            function drawTable() {
                var group = doc.activeLayer.groupItems.add();
                var black = makeBlack();
                var y = tableTop;
                for (var i = 0; i < rowCount; i++) {
                    var height = rowHeightsMm[i] * MM_TO_PT;
                    var x = tableLeft;
                    for (var j = 0; j < colCount; j++) {
                        var width = colWidthsMm[j] * MM_TO_PT;
                        var cell = group.pathItems.rectangle(y, x, width, height);
                        if (i === 0 && headerK > 0) {
                            cell.filled = true;
                            cell.fillColor = makeGray(headerK);
                        } else {
                            cell.filled = false;
                        }
                        cell.stroked = true;
                        cell.strokeWidth = strokeWidthPt;
                        cell.strokeColor = black;
                        x += width;
                    }
                    y -= height;
                }
                return group;
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

            function makeBlack() {
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    var cmyk = new CMYKColor();
                    cmyk.cyan = 0;
                    cmyk.magenta = 0;
                    cmyk.yellow = 0;
                    cmyk.black = 100;
                    return cmyk;
                }
                var rgb = new RGBColor();
                rgb.red = 0;
                rgb.green = 0;
                rgb.blue = 0;
                return rgb;
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
                previewGroup = drawTable();
                moveItem(previewGroup, offsetXmm * MM_TO_PT, offsetYmm * MM_TO_PT);
                previewGroup.name = "Table Preview";
                app.redraw();
            }

            function clearPreview() {
                if (previewGroup === null) return;
                try { previewGroup.remove(); } catch (e) {}
                previewGroup = null;
            }

            function readFields(showAlert) {
                var rows = parseNumber(rowCountField.input.text);
                var cols = parseNumber(colCountField.input.text);
                var width = parseNumber(strokeField.input.text);
                var header = parseNumber(headerKField.input.text);
                var offX = parseNumber(offsetXField.input.text);
                var offY = parseNumber(offsetYField.input.text);

                if (rows === null || rows < 1 || rows > MAX_ROWS ||
                        cols === null || cols < 1 || cols > MAX_COLS) {
                    if (showAlert) alert("행 수와 열 수는 1부터 " + MAX_ROWS + " 사이의 정수로 입력해주세요.");
                    return false;
                }
                if (width === null || width < 0.1 || width > 3) {
                    if (showAlert) alert("선 두께는 0.1부터 3 사이로 입력해주세요.");
                    return false;
                }
                if (header === null || header < 0 || header > 100) {
                    if (showAlert) alert("1행 음영은 0부터 100 사이로 입력해주세요.");
                    return false;
                }
                if (offX === null || offX < -POSITION_LIMIT_MM || offX > POSITION_LIMIT_MM ||
                        offY === null || offY < -POSITION_LIMIT_MM || offY > POSITION_LIMIT_MM) {
                    if (showAlert) alert("이동은 -" + POSITION_LIMIT_MM + "부터 " +
                        POSITION_LIMIT_MM + "mm 사이로 입력해주세요.");
                    return false;
                }

                var sizes = readSizeFields(rowFields, rowCount, showAlert, "행 높이");
                if (sizes === null) return false;
                rowHeightsMm = sizes;
                sizes = readSizeFields(colFields, colCount, showAlert, "열 너비");
                if (sizes === null) return false;
                colWidthsMm = sizes;

                rowCount = Math.round(rows);
                colCount = Math.round(cols);
                strokeWidthPt = width;
                headerK = header;
                offsetXmm = offX;
                offsetYmm = offY;
                readLinkedFlags();
                return true;
            }

            function readSizeFields(fields, count, showAlert, label) {
                var sizes = [];
                for (var i = 0; i < fields.length; i++) {
                    var value = parseNumber(fields[i].input.text);
                    if (i < count && (value === null || value < SIZE_MIN_MM || value > SIZE_MAX_MM)) {
                        if (showAlert) alert(label + "는 " + SIZE_MIN_MM + "부터 " +
                            SIZE_MAX_MM + "mm 사이로 입력해주세요.");
                        return null;
                    }
                    sizes.push(value === null ? SIZE_MIN_MM : value);
                }
                return sizes;
            }

            function readCount(field, fallback, maximum) {
                var value = parseNumber(field.input.text);
                if (value === null || value < 1 || value > maximum) return fallback;
                return Math.round(value);
            }

            function readLinkedFlags() {
                var i;
                for (i = 0; i < rowFields.length; i++) rowLinked[i] = rowFields[i].check.value;
                for (i = 0; i < colFields.length; i++) colLinked[i] = colFields[i].check.value;
            }

            // -------------------------------------------------------
            // 줄 잇기: 연속으로 켜진 구간에서 맨 앞 줄이 나머지를 이끈다
            // -------------------------------------------------------
            // 켜진 줄이면서 바로 앞 줄도 켜져 있으면 따라가는 줄이다
            function isFollower(linked, index) {
                return index > 0 && linked[index] && linked[index - 1];
            }

            function leaderIndexOf(linked, index) {
                var leader = 0;
                for (var i = 1; i <= index; i++) {
                    if (!isFollower(linked, i)) leader = i;
                }
                return leader;
            }

            function syncLinkedFields(fields, linked, count) {
                for (var i = 1; i < count; i++) {
                    if (!isFollower(linked, i)) continue;
                    var value = parseNumber(fields[leaderIndexOf(linked, i)].input.text);
                    if (value === null) continue;
                    setFieldValue(fields[i], clampSize(value));
                }
            }

            // 크기 필드 하나에 값 변경·체크 변경 동작을 붙인다
            function bindSizeField(field) {
                field.onCommit = function() { refreshSizeFields(); };
                field.check.onClick = function() { refreshSizeFields(); };
            }

            // 체크 상태를 읽어 따라가는 줄을 채우고 잠근 뒤 미리보기를 다시 그린다
            function refreshSizeFields(skipPreview) {
                readLinkedFlags();
                syncLinkedFields(rowFields, rowLinked, rowCount);
                syncLinkedFields(colFields, colLinked, colCount);
                updateSizeFieldState();
                if (skipPreview !== true) updatePreview();
            }

            // 쓰지 않는 줄은 통째로, 따라가는 줄은 입력만 잠근다(체크박스는 계속 누를 수 있어야 한다)
            function updateSizeFieldState() {
                var i;
                for (i = 0; i < rowFields.length; i++) {
                    setFieldState(rowFields[i], i < rowCount, isFollower(rowLinked, i));
                }
                for (i = 0; i < colFields.length; i++) {
                    setFieldState(colFields[i], i < colCount, isFollower(colLinked, i));
                }
            }

            function setFieldState(field, inUse, follower) {
                field.row.enabled = inUse;
                var editable = inUse && !follower;
                field.input.enabled = editable;
                field.slider.enabled = editable;
                if (field.check) field.check.enabled = inUse;
            }

            // 선택한 사각형을 균등하게 나눈 값으로 채운다.
            // 0.5mm 격자에 맞추면 합이 사각형과 어긋나므로 나눈 값을 그대로 쓴다.
            function seedSizes(totalMm, count, maximum) {
                var each = clampSize(totalMm / count);
                var sizes = [];
                for (var i = 0; i < maximum; i++) sizes.push(each);
                return sizes;
            }

            function reseedFields(fields, totalMm, count) {
                var each = clampSize(totalMm / count);
                for (var i = 0; i < fields.length; i++) setFieldValue(fields[i], each);
            }

            function clampSize(value) {
                if (value < SIZE_MIN_MM) return SIZE_MIN_MM;
                if (value > SIZE_MAX_MM) return SIZE_MAX_MM;
                return value;
            }

            function filledArray(length, value) {
                var out = [];
                for (var i = 0; i < length; i++) out.push(value);
                return out;
            }

            // 가로·세로 변이 축에 나란한 사각형만 받는다 (기울어진 사각형은 경계 상자와 어긋난다)
            function getSelectedRectangle(selection) {
                if (!selection || selection.length !== 1) return null;
                var item = selection[0];
                if (!item || item.typename !== "PathItem" || item.guides || item.clipping) return null;
                if (!item.closed || !item.pathPoints || item.pathPoints.length !== 4) return null;

                var xs = [];
                var ys = [];
                for (var i = 0; i < 4; i++) {
                    var point = item.pathPoints[i];
                    // 곡선 손잡이가 있으면 사각형이 아니다
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

            function pushDistinct(values, value) {
                for (var i = 0; i < values.length; i++) {
                    if (Math.abs(values[i] - value) < 0.01) return;
                }
                values.push(value);
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

            function addNumberField(parent, labelText, unit, value, step, minimum, maximum, withCheck) {
                var row = parent.add("group");
                row.alignChildren = ["left", "center"];
                var check = null;
                if (withCheck) check = row.add("checkbox", undefined, "");
                var label = row.add("statictext", undefined, labelText + (unit ? " (" + unit + "):" : ":"));
                label.preferredSize.width = LABEL_WIDTH;
                var input = row.add("edittext", undefined, formatValue(value));
                input.characters = 5;
                input.justify = "center";
                var slider = row.add("scrollbar", undefined, value, minimum, maximum);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = SLIDER_WIDTH;

                var field = {row: row, check: check, input: input, slider: slider, step: step,
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

            // 위치 필드는 표를 다시 만들지 않고 미리보기만 옮긴다
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

            function setFieldValue(field, value) {
                field.input.text = formatValue(value);
                field.syncing = true;
                field.slider.value = value;
                field.syncing = false;
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
            // 설정 기억 (행 높이·열 너비는 사각형에서 나오므로 저장하지 않는다)
            // -------------------------------------------------------
            function saveSettings() {
                var parts = ["v3", rowCount, colCount,
                    flagsToText(rowLinked), flagsToText(colLinked),
                    strokeWidthPt, offsetXmm, offsetYmm, headerK];
                try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
            }

            function applySavedSettings() {
                var raw = "";
                try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
                if (!raw) return;
                var p = raw.split("|");
                if (p[0] !== "v3" || p.length < 9) return;

                var rows = parseInt(p[1], 10);
                var cols = parseInt(p[2], 10);
                var width = parseFloat(p[5]);
                var offX = parseFloat(p[6]);
                var offY = parseFloat(p[7]);
                if (rows >= 1 && rows <= MAX_ROWS) rowCount = rows;
                if (cols >= 1 && cols <= MAX_COLS) colCount = cols;
                textToFlags(p[3], rowLinked);
                textToFlags(p[4], colLinked);
                if (width >= 0.1 && width <= 3) strokeWidthPt = width;
                if (offX >= -POSITION_LIMIT_MM && offX <= POSITION_LIMIT_MM) offsetXmm = offX;
                if (offY >= -POSITION_LIMIT_MM && offY <= POSITION_LIMIT_MM) offsetYmm = offY;
                var header = parseFloat(p[8]);
                if (header >= 0 && header <= 100) headerK = header;
            }

            function flagsToText(flags) {
                var text = "";
                for (var i = 0; i < flags.length; i++) text += flags[i] ? "1" : "0";
                return text;
            }

            function textToFlags(text, flags) {
                if (!text || text.length !== flags.length) return;
                for (var i = 0; i < flags.length; i++) flags[i] = (text.charAt(i) === "1");
            }
            return null;
        }
        return api;
    }

    // ==== 점선 분할선 ====
    function makeDashedGridEngine() {
        var api = {label: "점선 분할선", error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, commit: function() { return false; }};
        function addRows(page) {
            var PREF_KEY = "ObjectDashedGrid/settings";
            var STROKE_WIDTH = 0.3;
            var DASH_PATTERN = [2, 1];
            var MIN_COUNT = 1;
            var MAX_COUNT = 50;

            var doc = app.activeDocument;
            var source = getSelectedRectangle(doc.selection);
            if (source === null) return "가로·세로 변이 축에 나란한 사각형 하나를 선택해주세요.";
            var bounds = source.geometricBounds; // [left, top, right, bottom]

            var options = readSettings();
            var win = page;

            var panel = win.add("panel", undefined, "행 · 열");
            panel.alignChildren = "fill";
            panel.spacing = 2;
            addRow(panel, "행 수", "rows", MIN_COUNT, MAX_COUNT, 1, "개");
            addRow(panel, "열 수", "cols", MIN_COUNT, MAX_COUNT, 1, "개");
            addRow(panel, "선 색 (K)", "k", 0, 100, 10, "%");

            // 이 탭은 미리보기가 없다. 확인을 누르면 바로 그린다
            api.commit = function() {
                try {
                    drawDividers();
                    saveSettings();
                    return true;
                } catch (e) {
                    alert("점선을 만들지 못했습니다: " + e + " (" + e.line + "행)");
                    return false;
                }
            };

            // 숫자 조절 행: 라벨(단위) | 입력창 | 스크롤바(‹ › 내장)
            function addRow(parent, label, key, min, max, step, unit) {
                var row = parent.add("group");
                var caption = row.add("statictext", undefined, label + (unit ? " (" + unit + "):" : ":"));
                caption.preferredSize.width = 50;
                var input = row.add("edittext", undefined, String(options[key]));
                input.characters = 4;
                var slider = row.add("scrollbar", undefined, options[key], min, max);
                slider.stepdelta = step;
                slider.jumpdelta = step * 10;
                slider.preferredSize.width = 196;
                function apply(value) {
                    value = Math.round(value / step) * step;
                    if (!isFinite(value) || value < min || value > max) {
                        input.text = String(options[key]);
                        return;
                    }
                    options[key] = value;
                    slider.value = value;
                    input.text = String(value);
                }
                slider.onChanging = function() { apply(slider.value); };
                slider.onChange = function() { apply(slider.value); };
                input.onChange = function() { apply(Number(input.text)); };
            }

            // 사각형 안에 (행-1)개의 가로 점선, (열-1)개의 세로 점선을 등간격으로 넣고 그룹으로 묶는다
            function drawDividers() {
                var left = bounds[0], top = bounds[1], right = bounds[2], bottom = bounds[3];
                var group = source.parent.groupItems.add();
                group.name = "DashedGrid";
                group.move(source, ElementPlacement.PLACEBEFORE);
                var lines = [];
                for (var r = 1; r < options.rows; r++) {
                    var y = top - (top - bottom) * r / options.rows;
                    lines.push(addLine(group, [[left, y], [right, y]]));
                }
                for (var c = 1; c < options.cols; c++) {
                    var x = left + (right - left) * c / options.cols;
                    lines.push(addLine(group, [[x, top], [x, bottom]]));
                }
                if (lines.length === 0) {
                    group.remove();
                    return;
                }
                applyDashPatternToItems(lines, DASH_PATTERN, false);
                doc.selection = null;
                group.selected = true;
            }

            function addLine(container, points) {
                var line = container.pathItems.add();
                line.setEntirePath(points);
                line.closed = false;
                line.filled = false;
                line.stroked = true;
                line.strokeColor = makeGray(options.k);
                line.strokeWidth = STROKE_WIDTH;
                return line;
            }

            // K값(0~100)만 있는 회색. RGB 문서면 같은 밝기의 회색으로
            function makeGray(k) {
                var color;
                if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                    color = new CMYKColor();
                    color.cyan = 0; color.magenta = 0; color.yellow = 0; color.black = k;
                } else {
                    color = new RGBColor();
                    var level = Math.round(255 * (1 - k / 100));
                    color.red = level; color.green = level; color.blue = level;
                }
                return color;
            }

            // Object_Table.jsx와 같은 판정: 곡선 손잡이 없는 닫힌 4점 축 정렬 사각형
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

            function pushDistinct(values, value) {
                for (var i = 0; i < values.length; i++) {
                    if (Math.abs(values[i] - value) < 0.01) return;
                }
                values.push(value);
            }

            // -------------------------------------------------------
            // 설정 기억
            // -------------------------------------------------------
            function readSettings() {
                var result = { rows: 2, cols: 2, k: 100 };
                try {
                    var p = app.preferences.getStringPreference(PREF_KEY).split("|");
                    if (p[0] !== "v2" || p.length !== 4) return result;
                    var rows = Number(p[1]), cols = Number(p[2]), k = Number(p[3]);
                    if (!isFinite(rows) || !isFinite(cols) || !isFinite(k)) return result;
                    if (rows < MIN_COUNT || rows > MAX_COUNT || cols < MIN_COUNT || cols > MAX_COUNT) return result;
                    if (k < 0 || k > 100) return result;
                    result.rows = Math.round(rows);
                    result.cols = Math.round(cols);
                    result.k = Math.round(k / 10) * 10;
                } catch (e) {}
                return result;
            }

            function saveSettings() {
                try {
                    app.preferences.setStringPreference(PREF_KEY, ["v2", options.rows, options.cols, options.k].join("|"));
                } catch (e) {}
            }
            return null;
        }
        return api;
    }
})();
