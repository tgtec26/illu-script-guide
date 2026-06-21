// RandomFillGray.jsx  ─  Illustrator ExtendScript
#target illustrator

(function () {

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("개체를 하나 이상 선택하세요.");
        return;
    }

    // 10k ~ 80k 배열
    var graySteps = [10, 20, 30, 40, 50, 60, 70, 80];

    function randomGrayStep() {
        return graySteps[Math.floor(Math.random() * graySteps.length)];
    }

    function applyGray(item) {
        // 그룹이면 재귀
        if (item.typename === "GroupItem") {
            for (var i = 0; i < item.pageItems.length; i++) {
                applyGray(item.pageItems[i]);
            }
            return;
        }

        if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
            var k = randomGrayStep();
            var c = new CMYKColor();
            c.cyan    = 0;
            c.magenta = 0;
            c.yellow  = 0;
            c.black   = k;

            item.filled     = true;
            item.fillColor  = c;
        }
    }

    for (var i = 0; i < sel.length; i++) {
        applyGray(sel[i]);
    }

}());