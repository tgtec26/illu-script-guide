// Object_NumberLine.jsx
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

// 수직선: 정수 눈금과 숫자, 보조 눈금, 점(A=-2.5, B=3/4, P=√2), 부등식의 해(-1<x<=3)를 그린다.
// 해는 교과서처럼 경계에 ●(포함)·○(미포함)을 찍고 그 위로 꺾어 올린 선으로 범위를 표시한다.
// 선 두께는 평가원 그림 측정값에 맞춘 과학 기준: 수직선·눈금 0.4pt, 해 선 0.8pt.
// 선택은 필요 없다. 화면 가운데에 만들고 미리보기를 보면서 옮긴다.

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열어주세요.");
        return;
    }

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
    var win = new Window("dialog", "수직선");
    win.alignChildren = "fill";

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

    var footer = win.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    var okButton = footer.add("button", undefined, "확인");
    footer.add("button", undefined, "취소", { name: "cancel" });
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    try { win.defaultElement = null; } catch (defaultError) {}

    numbersCheck.value = showNumbers;
    previewCheck.value = previewEnabled;

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
    previewCheck.onClick = function() { previewEnabled = previewCheck.value; updatePreview(); };
    // 위치는 다시 만들지 않고 미리보기 그룹만 옮긴다
    bindPositionRow(offsetXControls, function() { return offsetXmm; }, function(value) { offsetXmm = value; }, true);
    bindPositionRow(offsetYControls, function() { return offsetYmm; }, function(value) { offsetYmm = value; }, false);

    okButton.onClick = function() {
        if (previewGroup === null) buildPreview();
        saveSettings();
        doc.selection = null;
        previewGroup.selected = true;
        win.close(1);
    };

    updatePreview();

    if (typeof bindTabOrder === "function") bindTabOrder(win);
    if (win.show() !== 1) {
        clearPreview();
        app.redraw();
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
})();
