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

    var options = showOptionsDialog();
    if (!options) {
        return;
    }

    var mmToPt = 2.83464567;
    var paddingX = 2 * mmToPt;
    var paddingY = 1.5 * mmToPt;
    var radius = 1.5 * mmToPt;
    var tailBase = 1.26 * mmToPt;
    var tailLength = 2.45 * mmToPt;
    var tailOverlap = 0.3 * mmToPt;
    var tailInsetRatio = 0.32;
    var strokeWidth = 0.3;
    var lineColor = makeBlackColor(doc);
    var targets = copySelection(sel);
    var created = [];
    var skipped = 0;

    for (var i = 0; i < targets.length; i++) {
        var targetItem = targets[i];
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
        applyRoundStrokeJoin(box);

        var tail = makeTail(doc, options.tailPosition, left, top, width, height, tailBase, tailLength, tailOverlap, tailInsetRatio);
        tail.name = "TextRoundedBoxTail";
        tail.filled = false;
        tail.stroked = true;
        tail.strokeColor = lineColor;
        tail.strokeWidth = strokeWidth;
        tail.strokeDashes = [];
        applyRoundStrokeJoin(tail);

        var balloon = groupBalloonParts(doc, box, tail);
        balloon.name = "TextSpeechBubble";
        applyLiveUnite(balloon);

        try {
            balloon.move(targetItem, ElementPlacement.PLACEAFTER);
        } catch (e) {
            balloon.zOrder(ZOrderMethod.SENDTOBACK);
        }

        var textBalloonGroup = groupTextAndBalloon(doc, targetItem, balloon);
        created.push(textBalloonGroup);
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
        alert("선택 항목 " + created.length + "개에 말풍선을 만들었습니다.\n처리할 수 없거나 비어 있는 항목 " + skipped + "개는 건너뛰었습니다.");
    }

    function showOptionsDialog() {
        var win = new Window("dialog", "말풍선 만들기");
        win.orientation = "column";
        win.alignChildren = "left";

        win.add("statictext", undefined, "꼬리 위치");
        var group = win.add("group");
        group.orientation = "row";

        var tailLeft = group.add("radiobutton", undefined, "9시");
        var tailBottom = group.add("radiobutton", undefined, "6시");
        var tailRight = group.add("radiobutton", undefined, "3시");
        tailBottom.value = true;

        var buttons = win.add("group");
        buttons.alignment = "right";
        buttons.add("button", undefined, "취소", { name: "cancel" });
        buttons.add("button", undefined, "확인", { name: "ok" });

        if (win.show() !== 1) {
            return null;
        }

        return {
            tailPosition: tailLeft.value ? "left" : (tailRight.value ? "right" : "bottom")
        };
    }

    function copySelection(selection) {
        var items = [];

        for (var i = 0; i < selection.length; i++) {
            items.push(selection[i]);
        }

        return items;
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

    function makeTail(documentRef, position, left, top, width, height, baseSize, length, overlap, insetRatio) {
        var bottom = top - height;
        var right = left + width;
        var tail = documentRef.pathItems.add();
        var points = getTailBezierPoints(position, left, top, right, bottom, width, height, baseSize, length, overlap, insetRatio);

        addPathPoint(tail, points[0].anchor, points[0].left, points[0].right, PointType.CORNER);
        addPathPoint(tail, points[1].anchor, points[1].left, points[1].right, PointType.SMOOTH);
        addPathPoint(tail, points[2].anchor, points[2].left, points[2].right, PointType.CORNER);
        tail.closed = true;
        return tail;
    }

    function getTailBezierPoints(position, left, top, right, bottom, width, height, baseSize, length, overlap, insetRatio) {
        var svgTopY = 0.15;
        var svgLeftAttachX = 2.25;
        var svgRightAttachX = 5.74;
        var svgTipY = 7.05;
        var scaleX = baseSize / (svgRightAttachX - svgLeftAttachX);
        var scaleY = (length + overlap) / (svgTipY - svgTopY);
        var centerX = left + (width * (1 - insetRatio));
        var centerY = top - (height * insetRatio);
        var attachLeft = centerX - (baseSize / 2);
        var attachY = bottom + overlap;
        var attachX;

        if (position === "right") {
            attachX = right - overlap;
        } else if (position === "left") {
            attachX = left + overlap;
        }

        function mapPoint(point) {
            var u = (point[0] - svgLeftAttachX) * scaleX;
            var v = (point[1] - svgTopY) * scaleY;

            if (position === "right") {
                return [attachX + v, centerY + (baseSize / 2) - u];
            }
            if (position === "left") {
                return [attachX - v, centerY + (baseSize / 2) - u];
            }
            return [attachLeft + u, attachY - v];
        }

        return [
            {
                anchor: mapPoint([2.25, 0.15]),
                left: mapPoint([2.25, 0.15]),
                right: mapPoint([3.22, 2.68])
            },
            {
                anchor: mapPoint([0.15, 7.05]),
                left: mapPoint([2.21, 4.98]),
                right: mapPoint([3.78, 5.43])
            },
            {
                anchor: mapPoint([5.74, 0.15]),
                left: mapPoint([5.6, 3.91]),
                right: mapPoint([5.74, 0.15])
            }
        ];
    }

    function addPathPoint(pathItem, anchor, leftDirection, rightDirection, pointType) {
        var point = pathItem.pathPoints.add();
        point.anchor = anchor;
        point.leftDirection = leftDirection;
        point.rightDirection = rightDirection;
        point.pointType = pointType;
    }

    function applyRoundStrokeJoin(item) {
        try {
            item.strokeJoin = StrokeJoin.ROUNDENDJOIN;
        } catch (e) {}
    }

    function groupBalloonParts(documentRef, box, tail) {
        var group = documentRef.groupItems.add();

        box.move(group, ElementPlacement.PLACEATEND);
        tail.move(group, ElementPlacement.PLACEATEND);

        return group;
    }

    function groupTextAndBalloon(documentRef, targetItem, balloon) {
        var group = documentRef.groupItems.add();
        group.name = "TextSpeechBubbleGroup";

        try {
            group.move(targetItem, ElementPlacement.PLACEAFTER);
        } catch (e1) {}

        balloon.move(group, ElementPlacement.PLACEATEND);
        targetItem.move(group, ElementPlacement.PLACEATEND);

        try {
            targetItem.zOrder(ZOrderMethod.BRINGTOFRONT);
        } catch (e2) {}

        return group;
    }

    function applyLiveUnite(group) {
        try {
            doc.selection = null;
            group.selected = true;
            app.executeMenuCommand("Live Pathfinder Add");
            doc.selection = null;
            group.selected = true;
        } catch (e) {}
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
