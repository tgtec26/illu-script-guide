#target Illustrator

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 원소 기호 텍스트를 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var source = getSelectedTextFrame(doc.selection);
    if (source === null) {
        alert("검은 화살표로 원소 기호 텍스트 하나를 선택해주세요.");
        return;
    }

    var MM_TO_PT = 2.83464567;
    var DOT_DIAMETER_MM = 0.6;
    var GAP_MM = 1;
    var dotDiameter = DOT_DIAMETER_MM * MM_TO_PT;
    var gap = GAP_MM * MM_TO_PT;
    var dotCounts = {top: 0, right: 0, bottom: 0, left: 0};
    var previousCoordinateSystem = app.coordinateSystem;

    try {
        app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        var visibleBounds = getVisibleTextBounds(source);
        if (visibleBounds === null) {
            alert("원소 기호의 보이는 영역을 계산할 수 없습니다.");
            return;
        }

        var dlg = new Window("dialog", "루이스 전자점식");
        dlg.orientation = "column";
        dlg.alignChildren = "fill";

        addDotCountControls(dlg, "12시", dotCounts, "top");
        addDotCountControls(dlg, "3시", dotCounts, "right");
        addDotCountControls(dlg, "6시", dotCounts, "bottom");
        addDotCountControls(dlg, "9시", dotCounts, "left");

        var buttons = dlg.add("group");
        buttons.alignment = "right";
        buttons.add("button", undefined, "실행", {name: "ok"});
        buttons.add("button", undefined, "취소", {name: "cancel"});

        if (dlg.show() !== 1) return;

        if (dotCounts.top + dotCounts.right + dotCounts.bottom + dotCounts.left === 0) {
            alert("12시, 3시, 6시, 9시 중 한 곳 이상에 점을 선택해주세요.");
            return;
        }

        var finalGroup = source.layer.groupItems.add();
        try {
            finalGroup.name = "Lewis Electron Dots";
            drawDotsForDirection(finalGroup, visibleBounds, "top", dotCounts.top);
            drawDotsForDirection(finalGroup, visibleBounds, "right", dotCounts.right);
            drawDotsForDirection(finalGroup, visibleBounds, "bottom", dotCounts.bottom);
            drawDotsForDirection(finalGroup, visibleBounds, "left", dotCounts.left);
            try { finalGroup.move(source, ElementPlacement.PLACEAFTER); } catch(e) {}
            doc.selection = null;
            finalGroup.selected = true;
        } catch(e2) {
            try { finalGroup.remove(); } catch(e3) {}
            alert("루이스 전자점을 만드는 중 오류가 발생했습니다.");
        }
        app.redraw();
    } finally {
        app.coordinateSystem = previousCoordinateSystem;
    }

    function addDotCountControls(parent, label, counts, key) {
        var row = parent.add("panel", undefined, label);
        row.orientation = "row";
        row.alignChildren = "center";
        var none = row.add("radiobutton", undefined, "없음");
        var one = row.add("radiobutton", undefined, "1점");
        var two = row.add("radiobutton", undefined, "2점");
        none.value = true;
        none.onClick = function() { counts[key] = 0; };
        one.onClick = function() { counts[key] = 1; };
        two.onClick = function() { counts[key] = 2; };
    }

    function drawDotsForDirection(group, bounds, direction, count) {
        var centers = getDotCenters(bounds, direction, count, gap, dotDiameter);
        for (var i = 0; i < centers.length; i++) {
            drawDot(group, centers[i]);
        }
    }

    function getDotCenters(bounds, direction, count, gap, diameter) {
        if (count === 0) return [];
        var left = bounds[0];
        var top = bounds[1];
        var right = bounds[2];
        var bottom = bounds[3];
        var centerX = (left + right) / 2;
        var centerY = (top + bottom) / 2;
        var radius = diameter / 2;
        var separation = gap + diameter;
        var offset = count === 2 ? separation / 2 : 0;

        if (direction === "top") {
            return count === 1 ? [[centerX, top + gap + radius]] : [
                [centerX - offset, top + gap + radius],
                [centerX + offset, top + gap + radius]
            ];
        }
        if (direction === "right") {
            return count === 1 ? [[right + gap + radius, centerY]] : [
                [right + gap + radius, centerY + offset],
                [right + gap + radius, centerY - offset]
            ];
        }
        if (direction === "bottom") {
            return count === 1 ? [[centerX, bottom - gap - radius]] : [
                [centerX - offset, bottom - gap - radius],
                [centerX + offset, bottom - gap - radius]
            ];
        }
        return count === 1 ? [[left - gap - radius, centerY]] : [
            [left - gap - radius, centerY + offset],
            [left - gap - radius, centerY - offset]
        ];
    }

    function drawDot(group, center) {
        var radius = dotDiameter / 2;
        var dot = group.pathItems.ellipse(center[1] + radius, center[0] - radius, dotDiameter, dotDiameter);
        dot.stroked = false;
        dot.filled = true;
        dot.fillColor = makeBlackColor();
        return dot;
    }

    function makeBlackColor() {
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

    function getVisibleTextBounds(text) {
        var tempText = null;
        var outlined = null;
        try {
            tempText = text.duplicate();
            outlined = tempText.createOutline();
            return outlined.visibleBounds;
        } catch(e) {
            try { return text.visibleBounds; } catch(e2) { return null; }
        } finally {
            try { if (outlined) outlined.remove(); } catch(e3) {}
            try { if (tempText) tempText.remove(); } catch(e4) {}
        }
    }

    function getSelectedTextFrame(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "TextFrame" || item.locked || item.hidden || item.editable === false) return null;
        return item;
    }
})();
