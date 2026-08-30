// RandomFillGray.jsx  ─  Illustrator ExtendScript
#target illustrator
// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}


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