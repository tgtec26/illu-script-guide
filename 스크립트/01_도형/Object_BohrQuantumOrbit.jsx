(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var MM = 2.83464567;
    var FONT_NAME = "GSMediItaC1";
    var NUCLEUS_FONT_NAMES = ["Spoqa Han Sans Neo", "SpoqaHanSansNeo-Regular", "SpoqaHanSansNeo"];

    var options = showDialog();
    if (!options) {
        return;
    }

    drawBohrQuantumOrbit(options.maxQuantumNumber, options.displayAngle);

    function showDialog() {
        var win = new Window("dialog", "보어 양자 궤도");
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 12;
        win.margins = 18;

        var quantumPanel = win.add("panel", undefined, "양자 수");
        quantumPanel.orientation = "column";
        quantumPanel.alignChildren = "left";
        quantumPanel.margins = 12;

        var quantumRadios = quantumPanel.add("group");
        quantumRadios.orientation = "row";
        var q2 = quantumRadios.add("radiobutton", undefined, "2");
        var q3 = quantumRadios.add("radiobutton", undefined, "3");
        var q4 = quantumRadios.add("radiobutton", undefined, "4");
        q4.value = true;

        var quantumCustomRow = quantumPanel.add("group");
        quantumCustomRow.orientation = "row";
        quantumCustomRow.add("statictext", undefined, "직접 입력");
        var quantumInput = quantumCustomRow.add("edittext", undefined, "");
        quantumInput.characters = 6;

        var anglePanel = win.add("panel", undefined, "표시 각도");
        anglePanel.orientation = "column";
        anglePanel.alignChildren = "left";
        anglePanel.margins = 12;

        var angleRadios = anglePanel.add("group");
        angleRadios.orientation = "row";
        var a30 = angleRadios.add("radiobutton", undefined, "30");
        var a45 = angleRadios.add("radiobutton", undefined, "45");
        var a60 = angleRadios.add("radiobutton", undefined, "60");
        a45.value = true;

        var angleCustomRow = anglePanel.add("group");
        angleCustomRow.orientation = "row";
        angleCustomRow.add("statictext", undefined, "직접 입력");
        var angleInput = angleCustomRow.add("edittext", undefined, "");
        angleInput.characters = 6;

        var buttons = win.add("group");
        buttons.alignment = "right";
        buttons.add("button", undefined, "취소", { name: "cancel" });
        buttons.add("button", undefined, "확인", { name: "ok" });

        if (win.show() !== 1) {
            return null;
        }

        var maxQuantumNumber = parseNumber(quantumInput.text);
        if (maxQuantumNumber === null) {
            maxQuantumNumber = q2.value ? 2 : (q3.value ? 3 : 4);
        }

        var displayAngle = parseNumber(angleInput.text);
        if (displayAngle === null) {
            displayAngle = a30.value ? 30 : (a60.value ? 60 : 45);
        }

        maxQuantumNumber = Math.round(maxQuantumNumber);
        if (maxQuantumNumber < 1) {
            alert("양자 수는 1 이상의 숫자로 입력해주세요.");
            return null;
        }
        if (displayAngle <= 0 || displayAngle >= 90) {
            alert("표시 각도는 0보다 크고 90보다 작은 숫자로 입력해주세요.");
            return null;
        }

        return {
            maxQuantumNumber: maxQuantumNumber,
            displayAngle: displayAngle
        };
    }

    function drawBohrQuantumOrbit(maxQuantumNumber, displayAngle) {
        var group = doc.activeLayer.groupItems.add();
        group.name = "BohrQuantumOrbit_n" + maxQuantumNumber;

        var center = doc.activeView.centerPoint;
        var cx = center[0];
        var cy = center[1];
        var radiusValuesMM = [3, 7, 14, 25];
        var strokeWidth = 0.8;
        var nucleusStrokeWidth = 0.3;
        var black = makeCMYK(0, 0, 0, 100);
        var gray20 = makeCMYK(0, 0, 0, 20);
        var font = getFont(FONT_NAME);
        var nucleusFont = getFirstFont(NUCLEUS_FONT_NAMES);

        drawNucleus(group, cx, cy, black, gray20, nucleusStrokeWidth, nucleusFont);

        for (var n = 1; n <= maxQuantumNumber; n++) {
            var radius = getOrbitRadius(n, maxQuantumNumber, radiusValuesMM) * MM;
            var arc = drawArc(group, cx, cy, radius, displayAngle, 180 - displayAngle, black, strokeWidth);
            arc.name = "n=" + n + " Orbit";
            drawOrbitLabel(group, "n=" + n, cx, cy, radius, 180 - displayAngle, font, black);
        }

        doc.selection = null;
        group.selected = true;
    }

    function getOrbitRadius(n, maxQuantumNumber, radiusValuesMM) {
        if (n <= radiusValuesMM.length) {
            return radiusValuesMM[n - 1];
        }

        return radiusValuesMM[radiusValuesMM.length - 1] * n / maxQuantumNumber;
    }

    function drawArc(container, cx, cy, radius, startDeg, endDeg, strokeColor, strokeWidth) {
        var arc = container.pathItems.add();
        var points = [];
        var steps = Math.max(16, Math.ceil(Math.abs(endDeg - startDeg) / 3));

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var deg = startDeg + ((endDeg - startDeg) * t);
            var rad = deg * Math.PI / 180;
            points.push([
                cx + (radius * Math.cos(rad)),
                cy + (radius * Math.sin(rad))
            ]);
        }

        arc.setEntirePath(points);
        arc.closed = false;
        arc.filled = false;
        arc.stroked = true;
        arc.strokeColor = strokeColor;
        arc.strokeWidth = strokeWidth;

        try {
            arc.strokeCap = StrokeCap.ROUNDENDCAP;
            arc.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        } catch (e) {}

        return arc;
    }

    function drawOrbitLabel(container, text, cx, cy, radius, labelDeg, font, color) {
        var rad = labelDeg * Math.PI / 180;
        var x = cx + (radius * Math.cos(rad));
        var y = cy + (radius * Math.sin(rad));
        var label = container.textFrames.add();
        label.contents = text;

        var attrs = label.textRange.characterAttributes;
        attrs.size = 8;
        attrs.fillColor = color;

        if (font) {
            try {
                attrs.textFont = font;
            } catch (e) {}
        }

        label.left = x - label.width - (0.8 * MM);
        label.top = y + (label.height * 0.35);

        return label;
    }

    function drawNucleus(container, cx, cy, strokeColor, fillColor, strokeWidth, font) {
        var nucleusRadius = 1.5 * MM;
        var crossHalfLength = 0.9 * MM;
        var crossStrokeWidth = 0.5;
        var nucleus = container.pathItems.ellipse(
            cy + nucleusRadius,
            cx - nucleusRadius,
            nucleusRadius * 2,
            nucleusRadius * 2
        );
        nucleus.name = "원자핵";
        nucleus.filled = true;
        nucleus.fillColor = fillColor;
        nucleus.stroked = true;
        nucleus.strokeColor = strokeColor;
        nucleus.strokeWidth = strokeWidth;

        drawLine(container, cx - crossHalfLength, cy, cx + crossHalfLength, cy, strokeColor, crossStrokeWidth);
        drawLine(container, cx, cy + crossHalfLength, cx, cy - crossHalfLength, strokeColor, crossStrokeWidth);
        drawNucleusLabel(container, cx, cy - nucleusRadius - (1 * MM), font, strokeColor);
    }

    function drawNucleusLabel(container, cx, topY, font, color) {
        var label = container.textFrames.add();
        label.contents = "원자핵";

        var attrs = label.textRange.characterAttributes;
        attrs.size = 8;
        attrs.fillColor = color;

        if (font) {
            try {
                attrs.textFont = font;
            } catch (e) {}
        }

        label.left = cx - (label.width / 2);
        label.top = topY;
        return label;
    }

    function drawLine(container, x1, y1, x2, y2, strokeColor, strokeWidth) {
        var line = container.pathItems.add();
        line.setEntirePath([[x1, y1], [x2, y2]]);
        line.filled = false;
        line.stroked = true;
        line.strokeColor = strokeColor;
        line.strokeWidth = strokeWidth;

        try {
            line.strokeCap = StrokeCap.ROUNDENDCAP;
        } catch (e) {}

        return line;
    }

    function makeCMYK(c, m, y, k) {
        var color = new CMYKColor();
        color.cyan = c;
        color.magenta = m;
        color.yellow = y;
        color.black = k;
        return color;
    }

    function getFont(fontName) {
        try {
            return app.textFonts.getByName(fontName);
        } catch (e) {
            return null;
        }
    }

    function getFirstFont(fontNames) {
        for (var i = 0; i < fontNames.length; i++) {
            var font = getFont(fontNames[i]);
            if (font) {
                return font;
            }
        }

        return null;
    }

    function parseNumber(value) {
        var text = String(value).replace(/^\s+|\s+$/g, "");
        if (text === "") {
            return null;
        }

        var number = Number(text);
        return isNaN(number) ? null : number;
    }
})();
