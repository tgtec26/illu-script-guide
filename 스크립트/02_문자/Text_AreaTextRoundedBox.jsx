(function() {
    if (app.documents.length === 0) {
        alert("문서를 먼저 열어주세요.");
        return;
    }

    var doc = app.activeDocument;
    var sel = doc.selection;

    if (!sel || sel.length === 0) {
        alert("텍스트를 선택하고 실행해주세요.");
        return;
    }

    var mmToPt = 2.83464567;
    var paddingX = 2 * mmToPt;
    var paddingY = 1.5 * mmToPt;
    var radius = 1.5 * mmToPt;
    var strokeWidth = 0.3;
    var lineColor = makeBlackColor(doc);
    var created = [];
    var skipped = 0;

    for (var i = 0; i < sel.length; i++) {
        var targetItem = sel[i];
        var bounds = getTargetBounds(targetItem);
        if (!bounds) {
            skipped++;
            continue;
        }

        var left = bounds[0] - paddingX;
        var top = bounds[1] + paddingY;
        var width = (bounds[2] - bounds[0]) + (paddingX * 2);
        var height = (bounds[1] - bounds[3]) + (paddingY * 2);

        var box = makeLiveRoundedBox(doc, top, left, width, height, radius);
        box.name = "TextRoundedBox";
        box.filled = false;
        box.stroked = true;
        box.strokeColor = lineColor;
        box.strokeWidth = strokeWidth;
        box.strokeDashes = [];

        try {
            box.move(targetItem, ElementPlacement.PLACEAFTER);
        } catch (e) {
            box.zOrder(ZOrderMethod.SENDTOBACK);
        }

        created.push(box);
    }

    if (created.length === 0) {
        alert("선택한 항목 중 처리할 수 있는 텍스트가 없습니다.");
        return;
    }

    doc.selection = null;
    for (var j = 0; j < created.length; j++) {
        created[j].selected = true;
    }

    if (skipped > 0) {
        alert("선택 항목 " + created.length + "개에 둥근 사각형을 만들었습니다.\n처리할 수 없거나 비어 있는 항목 " + skipped + "개는 건너뛰었습니다.");
    }

    function makeLiveRoundedBox(documentRef, top, left, width, height, cornerRadius) {
        var box = documentRef.pathItems.rectangle(top, left, width, height);

        try {
            box.applyEffect(
                '<LiveEffect name="Adobe Round Corners">' +
                '<Dict data="R radius ' + cornerRadius + '"/>' +
                '</LiveEffect>'
            );
        } catch (e) {
            try {
                box.remove();
            } catch (e1) {}

            box = documentRef.pathItems.roundedRectangle(top, left, width, height, cornerRadius, cornerRadius);
        }

        return box;
    }

    function getTargetBounds(item) {
        if (!item) {
            return null;
        }
        if (item.typename === "TextFrame") {
            return getActualTextBounds(item);
        }
        if (isOutlineLikeItem(item)) {
            return getVisibleBounds(item);
        }
        return null;
    }

    function getActualTextBounds(textFrame) {
        if (isReadableEmptyText(textFrame)) {
            return null;
        }

        var dup = null;
        var outline = null;
        try {
            dup = textFrame.duplicate();
            outline = dup.createOutline();
            return normalizeBounds(outline.visibleBounds);
        } catch (e) {
            return getVisibleBounds(textFrame);
        } finally {
            try {
                if (outline) {
                    outline.remove();
                } else if (dup) {
                    dup.remove();
                }
            } catch (e3) {}
        }
    }

    function isReadableEmptyText(textFrame) {
        try {
            return String(textFrame.contents).replace(/\s/g, "").length === 0;
        } catch (e) {
            return false;
        }
    }

    function isOutlineLikeItem(item) {
        return item.typename === "GroupItem" ||
            item.typename === "CompoundPathItem" ||
            item.typename === "PathItem";
    }

    function getVisibleBounds(item) {
        try {
            return normalizeBounds(item.visibleBounds);
        } catch (e) {
            try {
                return normalizeBounds(item.geometricBounds);
            } catch (e2) {
                return null;
            }
        }
    }

    function normalizeBounds(bounds) {
        if (!bounds || bounds.length < 4) {
            return null;
        }

        var left = Number(bounds[0]);
        var top = Number(bounds[1]);
        var right = Number(bounds[2]);
        var bottom = Number(bounds[3]);

        if (isNaN(left) || isNaN(top) || isNaN(right) || isNaN(bottom)) {
            return null;
        }
        if (right <= left || top <= bottom) {
            return null;
        }

        return [left, top, right, bottom];
    }

    function makeBlackColor(documentRef) {
        var color;
        if (documentRef.documentColorSpace === DocumentColorSpace.CMYK) {
            color = new CMYKColor();
            color.cyan = 0;
            color.magenta = 0;
            color.yellow = 0;
            color.black = 100;
        } else {
            color = new RGBColor();
            color.red = 0;
            color.green = 0;
            color.blue = 0;
        }
        return color;
    }
})();
