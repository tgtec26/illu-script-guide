// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_SplitStrokeFill.jsx
  기능: 선과 면이 모두 있는 도형을 면 오브젝트와 선 오브젝트로 나눕니다.
    - 원본은 그 자리에서 면만 남고, 바로 위에 선만 있는 복제본이 생깁니다 (면 아래 · 선 위)
    - 선만 있거나 면만 있는 도형은 건너뜁니다
  사용법: 도형(패스·복합 패스·그룹)을 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 도형을 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var items = [];
    collectShapes(doc.selection, items);
    if (items.length === 0) {
        alert("패스 또는 복합 패스를 선택해주세요.");
        return;
    }

    var count = 0;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var sample = firstPath(item);
        if (sample === null || !sample.filled || !sample.stroked) continue;
        var strokeCopy = item.duplicate(item, ElementPlacement.PLACEBEFORE);
        setFilled(strokeCopy, false);
        setStroked(item, false);
        strokeCopy.selected = true;
        count++;
    }
    if (count === 0) alert("선과 면이 모두 있는 도형이 없습니다.");

    function collectShapes(list, out) {
        if (!list) return;
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
                if (!item.guides && !item.clipping) out.push(item);
            } else if (item.typename === "GroupItem") {
                collectShapes(item.pageItems, out);
            }
        }
    }

    // 복합 패스는 선·면 속성이 안쪽 패스에 있다
    function firstPath(item) {
        if (item.typename === "PathItem") return item;
        return item.pathItems.length > 0 ? item.pathItems[0] : null;
    }

    function setFilled(item, value) {
        if (item.typename === "PathItem") { item.filled = value; return; }
        for (var i = 0; i < item.pathItems.length; i++) item.pathItems[i].filled = value;
    }

    function setStroked(item, value) {
        if (item.typename === "PathItem") { item.stroked = value; return; }
        for (var i = 0; i < item.pathItems.length; i++) item.pathItems[i].stroked = value;
    }
})();
