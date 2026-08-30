// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 정사각형 하나를 선택해주세요.");
        return;
    }

    var doc = app.activeDocument;
    var guideSquare = getSelectedSquare(doc.selection);
    if (guideSquare === null) {
        alert("전체 방형구 크기로 사용할 정사각형 패스 하나를 선택해주세요.");
        return;
    }
    var guideBounds = guideSquare.geometricBounds;
    var guideWasHidden = guideSquare.hidden;

    var PREF_KEY = "ObjectQuadrat/settings";
    var MM = 2.834645669;
    var LINE_WIDTH_PT = 0.6;
    var TEXT_SIZE_PT = 8;
    var KOR_FONT_NAME = "SpoqaHanSansNeo-Regular";
    var ENG_FONT_NAME = "GSMediumB1";
    var korFont = findTextFont([KOR_FONT_NAME]);
    var engFont = findTextFont([ENG_FONT_NAME]);
    var gridSize = 4;
    var cellMeters = 10;
    var requestedDensity = [40, 30, 30];
    var requestedFrequency = [35, 35, 30];
    var previewEnabled = true;

    loadSettings();

    var dlg = new Window("dialog", "방형구 만들기");
    dlg.orientation = "column";
    dlg.alignChildren = ["fill", "top"];
    dlg.spacing = 12;
    dlg.margins = 18;

    var gridPanel = dlg.add("panel", undefined, "방형구 배열");
    gridPanel.orientation = "row";
    gridPanel.alignChildren = "center";
    var grid4Radio = gridPanel.add("radiobutton", undefined, "4 × 4");
    var grid5Radio = gridPanel.add("radiobutton", undefined, "5 × 5");
    grid4Radio.value = gridSize === 4;
    grid5Radio.value = gridSize === 5;

    var sizePanel = dlg.add("panel", undefined, "한 칸의 실제 크기");
    sizePanel.orientation = "row";
    sizePanel.alignChildren = "center";
    var size1Radio = sizePanel.add("radiobutton", undefined, "1 m × 1 m");
    var size10Radio = sizePanel.add("radiobutton", undefined, "10 m × 10 m");
    size1Radio.value = cellMeters === 1;
    size10Radio.value = cellMeters === 10;

    var speciesPanel = dlg.add("panel", undefined, "종별 목표값 (%)");
    speciesPanel.orientation = "column";
    speciesPanel.alignChildren = "left";
    var header = speciesPanel.add("group");
    header.add("statictext", undefined, "").preferredSize.width = 48;
    header.add("statictext", undefined, "상대 밀도").preferredSize.width = 92;
    header.add("statictext", undefined, "상대 빈도").preferredSize.width = 92;

    var densityInputs = [];
    var frequencyInputs = [];
    var speciesNames = ["종 A", "종 B", "종 C"];
    for (var i = 0; i < 3; i++) {
        var row = speciesPanel.add("group");
        row.add("statictext", undefined, speciesNames[i]).preferredSize.width = 48;
        densityInputs[i] = row.add("edittext", undefined, formatInput(requestedDensity[i]));
        densityInputs[i].characters = 8;
        row.add("statictext", undefined, "%");
        frequencyInputs[i] = row.add("edittext", undefined, formatInput(requestedFrequency[i]));
        frequencyInputs[i].characters = 8;
        row.add("statictext", undefined, "%");
    }
    speciesPanel.add("statictext", undefined,
        "각 열은 합계가 100이 아니어도 비율로 자동 환산됩니다.");
    speciesPanel.add("statictext", undefined,
        "실현 불가능한 값은 가장 가까운 배치 가능한 값으로 보정됩니다.");

    var info = dlg.add("statictext", undefined,
        "한 칸에는 종 A~C를 합쳐 최대 4개체를 배치합니다.");

    var previewRow = dlg.add("group");
    previewRow.orientation = "row";
    previewRow.alignChildren = "center";
    var previewCheck = previewRow.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var rearrangeButton = previewRow.add("button", undefined, "개체 재배치");

    var buttons = dlg.add("group");
    buttons.alignment = "right";
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var createButton = buttons.add("button", undefined, "방형구 만들기");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = buttons.add("button", undefined, "취소", {name: "cancel"});

    var solution = null;
    var solutionSignature = "";
    var previewGroup = null;
    var drawingGroup = null;

    grid4Radio.onClick = updatePreview;
    grid5Radio.onClick = updatePreview;
    size1Radio.onClick = updatePreview;
    size10Radio.onClick = updatePreview;
    for (i = 0; i < 3; i++) {
        densityInputs[i].onChange = updatePreview;
        frequencyInputs[i].onChange = updatePreview;
    }
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        if (previewEnabled) updatePreview();
        else {
            clearPreview();
            restoreGuide();
            app.redraw();
        }
    };
    rearrangeButton.onClick = function() {
        previewCheck.value = true;
        previewEnabled = true;
        updatePreview(true, true);
    };
    dlg.onShow = function() { updatePreview(true, false); };

    createButton.onClick = function() {
        var state = readDialogState(true);
        if (state === null) return;
        var signature = makeStateSignature(state);
        if (solution === null || signature !== solutionSignature) {
            solution = buildSolution(state, true);
            if (solution === null) return;
            solutionSignature = signature;
        }

        gridSize = state.gridSize;
        cellMeters = state.cellMeters;
        requestedDensity = state.density;
        requestedFrequency = state.frequency;
        previewEnabled = previewCheck.value;
        saveSettings();
        dlg.close(1);
    };
    cancelButton.onClick = function() { dlg.close(0); };

    var dialogResult = dlg.show();
    clearPreview();
    if (dialogResult !== 1 || solution === null) {
        restoreGuide();
        app.redraw();
        return;
    }

    var finalGroup = null;
    try {
        finalGroup = drawQuadrat(solution, gridSize, cellMeters, guideBounds);
        guideSquare.remove();
    } catch (drawError) {
        try { if (drawingGroup !== null) drawingGroup.remove(); } catch (cleanupError) {}
        restoreGuide();
        alert("방형구를 그리는 중 오류가 발생했습니다.\n" + drawError);
        return;
    }
    doc.selection = null;
    finalGroup.selected = true;
    app.redraw();

    if (wasAdjusted(requestedDensity, solution.densityPercent) ||
            wasAdjusted(requestedFrequency, solution.frequencyPercent)) {
        alert(
            "입력값을 배치 가능한 값으로 보정했습니다.\n\n" +
            resultLine("종 A", solution, 0) + "\n" +
            resultLine("종 B", solution, 1) + "\n" +
            resultLine("종 C", solution, 2)
        );
    }

    function updatePreview(forceRearrange, showErrors) {
        if (!previewCheck.value) return;
        var state = readDialogState(showErrors === true);
        if (state === null) return;
        var signature = makeStateSignature(state);
        if (forceRearrange === true || solution === null || signature !== solutionSignature) {
            var nextSolution = buildSolution(state, showErrors === true);
            if (nextSolution === null) return;
            solution = nextSolution;
            solutionSignature = signature;
        }

        clearPreview();
        guideSquare.selected = false;
        guideSquare.hidden = true;
        try {
            previewGroup = drawQuadrat(
                solution, state.gridSize, state.cellMeters, guideBounds);
            previewGroup.name = "ObjectQuadrat_Preview";
        } catch (previewError) {
            try { if (drawingGroup !== null) drawingGroup.remove(); } catch (cleanupError) {}
            previewGroup = null;
            restoreGuide();
            if (showErrors === true) {
                alert("미리보기를 그리는 중 오류가 발생했습니다.\n" + previewError);
            }
        }
        app.redraw();
    }

    function readDialogState(showErrors) {
        var density = readInputTriplet(densityInputs);
        var frequency = readInputTriplet(frequencyInputs);
        if (density === null || frequency === null) {
            if (showErrors) alert("상대 밀도와 상대 빈도에는 숫자를 입력해주세요.");
            return null;
        }
        return {
            gridSize: grid5Radio.value ? 5 : 4,
            cellMeters: size1Radio.value ? 1 : 10,
            density: normalizeTriplet(density),
            frequency: normalizeTriplet(frequency)
        };
    }

    function buildSolution(state, showErrors) {
        var result = findBestSolution(
            state.gridSize, state.density, state.frequency);
        if (result === null) {
            if (showErrors) alert("입력값에 맞는 방형구를 만들지 못했습니다.");
            return null;
        }
        result.layoutSeed = Math.floor(Math.random() * 2147483646) + 1;
        return result;
    }

    function makeStateSignature(state) {
        return [
            state.gridSize, state.cellMeters,
            state.density[0], state.density[1], state.density[2],
            state.frequency[0], state.frequency[1], state.frequency[2]
        ].join("|");
    }

    function clearPreview() {
        if (previewGroup !== null) {
            try { previewGroup.remove(); } catch (e) {}
            previewGroup = null;
        }
    }

    function restoreGuide() {
        try {
            guideSquare.hidden = guideWasHidden;
            guideSquare.selected = true;
        } catch (e) {}
    }

    function findBestSolution(size, densityTarget, frequencyTarget) {
        var cellCount = size * size;
        var capacity = cellCount * 4;
        var frequencyCandidates = makeFrequencyCandidates(cellCount, frequencyTarget);
        var countCandidates = makeCountCandidates(capacity, densityTarget);
        var best = null;

        countCandidates.sort(function(a, b) { return a.score - b.score; });
        frequencyCandidates.sort(function(a, b) { return a.score - b.score; });

        for (var ci = 0; ci < countCandidates.length; ci++) {
            var countCandidate = countCandidates[ci];
            if (best !== null && countCandidate.score >= best.score) break;

            for (var fi = 0; fi < frequencyCandidates.length; fi++) {
                var frequencyCandidate = frequencyCandidates[fi];
                var combinedScore = countCandidate.score + frequencyCandidate.score;
                if (best !== null && combinedScore >= best.score) break;
                if (!countsAndFrequenciesCompatible(
                        countCandidate.counts, frequencyCandidate.frequencies, cellCount)) {
                    continue;
                }

                var cells = arrangeIndividuals(
                    cellCount, countCandidate.counts, frequencyCandidate.frequencies);
                if (cells === null) continue;

                best = {
                    counts: countCandidate.counts,
                    frequencies: frequencyCandidate.frequencies,
                    densityPercent: countCandidate.percent,
                    frequencyPercent: frequencyCandidate.percent,
                    cells: cells,
                    score: combinedScore
                };
                break;
            }
        }
        return best;
    }

    function makeCountCandidates(capacity, target) {
        var result = [];
        var seen = {};
        for (var total = 1; total <= capacity; total++) {
            var idealA = total * target[0] / 100;
            var idealB = total * target[1] / 100;
            var centerA = Math.round(idealA);
            var centerB = Math.round(idealB);
            for (var da = -3; da <= 3; da++) {
                for (var db = -3; db <= 3; db++) {
                    var a = centerA + da;
                    var b = centerB + db;
                    var c = total - a - b;
                    if (a < 0 || b < 0 || c < 0) continue;
                    var key = a + "|" + b + "|" + c;
                    if (seen[key]) continue;
                    seen[key] = true;
                    var counts = [a, b, c];
                    if (!matchesRequestedPresence(counts, target)) continue;
                    var percent = percentTriplet(counts);
                    result.push({
                        counts: counts,
                        percent: percent,
                        score: percentScore(percent, target) +
                            integerPercentPenalty(counts, total) +
                            Math.abs(total - Math.round(capacity / 4 * 1.25)) * 0.01
                    });
                }
            }
        }
        return result;
    }

    function makeFrequencyCandidates(cellCount, target) {
        var result = [];
        for (var a = 0; a <= cellCount; a++) {
            for (var b = 0; b <= cellCount; b++) {
                for (var c = 0; c <= cellCount; c++) {
                    var total = a + b + c;
                    if (total === 0) continue;
                    var frequencies = [a, b, c];
                    if (!matchesRequestedPresence(frequencies, target)) continue;
                    var percent = percentTriplet(frequencies);
                    result.push({
                        frequencies: frequencies,
                        percent: percent,
                        score: percentScore(percent, target) +
                            integerPercentPenalty(frequencies, total) +
                            Math.abs(total - cellCount) * 0.01
                    });
                }
            }
        }
        return result;
    }

    function matchesRequestedPresence(values, target) {
        for (var i = 0; i < 3; i++) {
            if (target[i] === 0 && values[i] !== 0) return false;
            if (target[i] > 0 && values[i] === 0) return false;
        }
        return true;
    }

    function countsAndFrequenciesCompatible(counts, frequencies, cellCount) {
        var totalCount = 0;
        for (var i = 0; i < 3; i++) {
            var n = counts[i];
            var f = frequencies[i];
            totalCount += n;
            if (n === 0 && f !== 0) return false;
            if (n > 0 && (f < 1 || f > cellCount || f > n || n > f * 4)) return false;
        }
        return totalCount <= cellCount * 4;
    }

    function arrangeIndividuals(cellCount, counts, frequencies) {
        var orders = [
            [0, 1, 2], [0, 2, 1], [1, 0, 2],
            [1, 2, 0], [2, 0, 1], [2, 1, 0]
        ];
        for (var attempt = 0; attempt < 180; attempt++) {
            var cells = [];
            var i;
            for (i = 0; i < cellCount; i++) cells.push([0, 0, 0]);
            var order = orders[attempt % orders.length];
            var successful = true;

            for (var oi = 0; oi < 3; oi++) {
                var species = order[oi];
                if (counts[species] === 0) continue;
                if (!placeSpecies(
                        cells, species, counts[species], frequencies[species], attempt)) {
                    successful = false;
                    break;
                }
            }
            if (successful && verifyArrangement(cells, counts, frequencies)) {
                shuffleCells(cells);
                return cells;
            }
        }
        return null;
    }

    function placeSpecies(cells, species, count, frequency, salt) {
        var candidates = [];
        for (var i = 0; i < cells.length; i++) {
            var load = cells[i][0] + cells[i][1] + cells[i][2];
            if (load < 4) {
                candidates.push({
                    index: i,
                    capacity: 4 - load,
                    random: seededNoise(i + 1, salt + species * 97)
                });
            }
        }
        if (candidates.length < frequency) return false;
        candidates.sort(function(a, b) {
            if (a.capacity !== b.capacity) return b.capacity - a.capacity;
            return a.random - b.random;
        });

        var chosen = candidates.slice(0, frequency);
        var available = 0;
        for (i = 0; i < chosen.length; i++) available += chosen[i].capacity;
        if (available < count) return false;

        for (i = 0; i < chosen.length; i++) cells[chosen[i].index][species]++;
        var remaining = count - frequency;
        while (remaining > 0) {
            var bestIndexes = [];
            var bestCapacity = 0;
            for (i = 0; i < chosen.length; i++) {
                var cell = cells[chosen[i].index];
                var free = 4 - cell[0] - cell[1] - cell[2];
                if (free > bestCapacity) {
                    bestCapacity = free;
                    bestIndexes = [i];
                } else if (free === bestCapacity && free > 0) {
                    bestIndexes.push(i);
                }
            }
            if (bestCapacity === 0) return false;
            var pick = bestIndexes[Math.floor(Math.random() * bestIndexes.length)];
            cells[chosen[pick].index][species]++;
            remaining--;
        }
        return true;
    }

    function verifyArrangement(cells, counts, frequencies) {
        var foundCounts = [0, 0, 0];
        var foundFrequencies = [0, 0, 0];
        for (var i = 0; i < cells.length; i++) {
            var load = cells[i][0] + cells[i][1] + cells[i][2];
            if (load > 4) return false;
            for (var s = 0; s < 3; s++) {
                foundCounts[s] += cells[i][s];
                if (cells[i][s] > 0) foundFrequencies[s]++;
            }
        }
        for (s = 0; s < 3; s++) {
            if (foundCounts[s] !== counts[s] ||
                    foundFrequencies[s] !== frequencies[s]) return false;
        }
        return true;
    }

    function drawQuadrat(data, size, meters, bounds) {
        var group = guideSquare.layer.groupItems.add();
        drawingGroup = group;
        group.name = "Quadrat_" + size + "x" + size + "_" + meters + "m";
        try { group.move(guideSquare, ElementPlacement.PLACEBEFORE); } catch (moveError) {}

        var gridWidth = bounds[2] - bounds[0];
        var gap = gridWidth * 0.015;
        var cell = (gridWidth - (size - 1) * gap) / size;
        var pitch = cell + gap;
        var left = bounds[0];
        var top = bounds[1];
        var black = grayColor(100);
        var gray = grayColor(35);
        var white = grayColor(0);
        var layoutRandom = makeSeededRandom(data.layoutSeed);

        for (var row = 0; row < size; row++) {
            for (var col = 0; col < size; col++) {
                var cellLeft = left + col * pitch;
                var cellTop = top - row * pitch;
                var rect = group.pathItems.rectangle(cellTop, cellLeft, cell, cell);
                rect.filled = false;
                rect.stroked = true;
                rect.strokeColor = black;
                rect.strokeWidth = LINE_WIDTH_PT;

                drawCellIndividuals(
                    group, data.cells[row * size + col],
                    cellLeft, cellTop, cell, black, gray, white, layoutRandom);
            }
        }

        drawDimensions(group, left, top, gridWidth, cell, meters, black);
        drawLegend(group, data, left,
            top - gridWidth - Math.max(5 * MM, cell * 0.35),
            gridWidth, cell, black, gray, white);
        return group;
    }

    function drawCellIndividuals(
            group, speciesCounts, left, top, cell, black, gray, white, random) {
        var speciesList = [];
        for (var s = 0; s < 3; s++) {
            for (var n = 0; n < speciesCounts[s]; n++) speciesList.push(s);
        }
        shuffleArray(speciesList, random);
        var symbolSize = cell * 0.20;
        var positions = randomSymbolPositions(
            speciesList.length, cell, symbolSize, random);
        for (var i = 0; i < speciesList.length; i++) {
            var cx = left + cell * positions[i][0];
            var cy = top - cell * positions[i][1];
            drawSpeciesSymbol(
                group, speciesList[i], cx, cy, symbolSize,
                black, gray, white, true, random);
        }
    }

    function randomSymbolPositions(count, cell, symbolSize, random) {
        var positions = [];
        var marginRatio = symbolSize / cell * 0.72;
        var minDistanceRatio = symbolSize / cell * 1.18;
        for (var i = 0; i < count; i++) {
            var placed = false;
            for (var attempt = 0; attempt < 120; attempt++) {
                var x = marginRatio + random() * (1 - marginRatio * 2);
                var y = marginRatio + random() * (1 - marginRatio * 2);
                if (farEnoughFromOthers(x, y, positions, minDistanceRatio)) {
                    positions.push([x, y]);
                    placed = true;
                    break;
                }
            }
            if (!placed) return jitterFallbackPositions(count, random);
        }
        return positions;
    }

    function farEnoughFromOthers(x, y, positions, minimum) {
        for (var i = 0; i < positions.length; i++) {
            var dx = x - positions[i][0];
            var dy = y - positions[i][1];
            if (Math.sqrt(dx * dx + dy * dy) < minimum) return false;
        }
        return true;
    }

    function jitterFallbackPositions(count, random) {
        var bases;
        if (count === 1) bases = [[0.5, 0.5]];
        else if (count === 2) bases = [[0.34, 0.48], [0.66, 0.52]];
        else if (count === 3) bases = [[0.33, 0.35], [0.67, 0.38], [0.49, 0.68]];
        else bases = [[0.32, 0.31], [0.68, 0.34], [0.34, 0.69], [0.67, 0.66]];
        for (var i = 0; i < bases.length; i++) {
            bases[i][0] += (random() - 0.5) * 0.06;
            bases[i][1] += (random() - 0.5) * 0.06;
        }
        return bases;
    }

    function drawSpeciesSymbol(
            group, species, cx, cy, size, black, gray, white,
            randomRotation, random) {
        if (species === 0) {
            var h = size * 0.866;
            var triangle = group.pathItems.add();
            triangle.setEntirePath([
                [cx, cy + h * 0.62],
                [cx - size / 2, cy - h * 0.38],
                [cx + size / 2, cy - h * 0.38]
            ]);
            triangle.closed = true;
            triangle.filled = true;
            triangle.fillColor = white;
            triangle.stroked = true;
            triangle.strokeColor = black;
            triangle.strokeWidth = LINE_WIDTH_PT;
            if (randomRotation) triangle.rotate((random() - 0.5) * 18);
        } else if (species === 1) {
            var square = group.pathItems.rectangle(
                cy + size / 2, cx - size / 2, size, size);
            square.filled = true;
            square.fillColor = gray;
            square.stroked = true;
            square.strokeColor = black;
            square.strokeWidth = LINE_WIDTH_PT;
            if (randomRotation) square.rotate((random() - 0.5) * 14);
        } else {
            var circle = group.pathItems.ellipse(
                cy + size / 2, cx - size / 2, size, size);
            circle.filled = true;
            circle.fillColor = black;
            circle.stroked = false;
        }
    }

    function drawDimensions(group, left, top, gridWidth, cell, meters, black) {
        var curveBow = Math.max(2 * MM, cell * 0.12);
        var topY = top;
        var dimensionLeft = left + gridWidth - cell;
        addDashedCurve(group,
            dimensionLeft, topY, left + gridWidth, topY, 0, curveBow, black);
        addText(group, meters + " m",
            dimensionLeft + cell / 2, topY + curveBow + 2.5 * MM,
            Justification.CENTER);

        var rightX = left + gridWidth;
        addDashedCurve(group,
            rightX, top, rightX, top - cell, curveBow, 0, black);
        var rightLabel = addText(group, meters + " m",
            rightX + curveBow + 3 * MM, top - cell / 2,
            Justification.CENTER);
        rightLabel.rotate(-90);
    }

    function drawLegend(
            group, data, left, top, gridWidth, cell, black, gray, white) {
        var legendGroup = group.groupItems.add();
        legendGroup.name = "Quadrat_Legend";
        var symbolSize = cell * 0.20 * 1.30;
        var itemGap = cell * 0.50;
        var cursorX = left;
        for (var i = 0; i < 3; i++) {
            var itemGroup = legendGroup.groupItems.add();
            drawSpeciesSymbol(itemGroup, i, cursorX + symbolSize / 2, top,
                symbolSize, black, gray, white, false, null);
            var labelX = cursorX + symbolSize + 1.5 * MM;
            addText(itemGroup, "종 " + String.fromCharCode(65 + i),
                labelX, top, Justification.LEFT);
            addText(itemGroup,
                "상대 밀도 " + formatPercent(data.densityPercent[i]) +
                "   상대 빈도 " + formatPercent(data.frequencyPercent[i]),
                labelX + 15 * MM, top, Justification.LEFT);
            var itemBounds = itemGroup.visibleBounds;
            cursorX = itemBounds[2] + itemGap;
        }
        var legendBounds = legendGroup.visibleBounds;
        var legendCenterX = (legendBounds[0] + legendBounds[2]) / 2;
        legendGroup.translate(left + gridWidth / 2 - legendCenterX, 0);
    }

    function addDashedCurve(group, x1, y1, x2, y2, bowX, bowY, color) {
        var curve = group.pathItems.add();
        curve.setEntirePath([[x1, y1], [x2, y2]]);
        curve.filled = false;
        curve.stroked = true;
        curve.strokeColor = color;
        curve.strokeWidth = LINE_WIDTH_PT;
        try { curve.strokeDashes = [3, 2.4]; } catch (dashError) {}

        var dx = x2 - x1;
        var dy = y2 - y1;
        curve.pathPoints[0].rightDirection = [
            x1 + dx * 0.33 + bowX,
            y1 + dy * 0.33 + bowY
        ];
        curve.pathPoints[1].leftDirection = [
            x2 - dx * 0.33 + bowX,
            y2 - dy * 0.33 + bowY
        ];
        curve.pathPoints[0].pointType = PointType.SMOOTH;
        curve.pathPoints[1].pointType = PointType.SMOOTH;
        return curve;
    }

    function addText(group, contents, x, y, justification) {
        var text = group.textFrames.add();
        text.contents = contents;
        applyKoEnFont(text, TEXT_SIZE_PT);
        try { text.textRange.paragraphAttributes.justification = justification; } catch (e) {}
        try {
            if (justification === Justification.CENTER) {
                text.position = [x - text.width / 2, y + text.height / 2];
            } else {
                text.position = [x, y + text.height / 2];
            }
        } catch (positionError) {
            text.position = [x, y];
        }
        return text;
    }

    function applyKoEnFont(frame, size) {
        for (var i = 0; i < frame.characters.length; i++) {
            var character = frame.characters[i];
            var value = character.contents;
            var code = value.charCodeAt(0);
            var isKorean = (code >= 0xAC00 && code <= 0xD7A3) ||
                (code >= 0x3131 && code <= 0x318E);
            var isSpace = value === " " || code === 32 || code === 160;
            var attributes = character.characterAttributes;
            attributes.size = size;
            attributes.fillColor = grayColor(100);
            try {
                attributes.textFont = (isKorean || isSpace) ? korFont : engFont;
            } catch (fontError) {}
            attributes.baselineShift = (isKorean || isSpace) ? 0 : 0.5;
        }
    }

    function findTextFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    function getSelectedSquare(selection) {
        if (!selection || selection.typename === "TextRange" || selection.length !== 1) {
            return null;
        }
        var item = selection[0];
        if (item.typename !== "PathItem" || !item.closed ||
                item.pathPoints.length !== 4) return null;
        var bounds = item.geometricBounds;
        var width = bounds[2] - bounds[0];
        var height = bounds[1] - bounds[3];
        if (width <= 0 || height <= 0) return null;
        if (Math.abs(width - height) > Math.max(0.5, width * 0.01)) return null;
        return item;
    }

    function grayColor(gray) {
        var color = new GrayColor();
        color.gray = gray;
        return color;
    }

    function percentTriplet(values) {
        var total = values[0] + values[1] + values[2];
        if (total <= 0) return [0, 0, 0];
        return [
            values[0] * 100 / total,
            values[1] * 100 / total,
            values[2] * 100 / total
        ];
    }

    function percentScore(actual, target) {
        var score = 0;
        for (var i = 0; i < 3; i++) {
            var difference = actual[i] - target[i];
            score += difference * difference;
        }
        return score;
    }

    function integerPercentPenalty(values, total) {
        var nonIntegers = 0;
        for (var i = 0; i < 3; i++) {
            if ((values[i] * 100) % total !== 0) nonIntegers++;
        }
        return nonIntegers * 0.35;
    }

    function normalizeTriplet(values) {
        var result = [];
        var sum = 0;
        for (var i = 0; i < 3; i++) {
            var value = Math.max(0, Math.min(100, values[i]));
            result.push(value);
            sum += value;
        }
        if (sum === 0) result = [1, 1, 1];
        return percentTriplet(result);
    }

    function readInputTriplet(inputs) {
        var values = [];
        for (var i = 0; i < inputs.length; i++) {
            var text = String(inputs[i].text).replace(/,/g, ".").replace(/\s/g, "");
            if (text === "" || isNaN(Number(text))) return null;
            values.push(Number(text));
        }
        return values;
    }

    function wasAdjusted(requested, actual) {
        for (var i = 0; i < 3; i++) {
            if (Math.abs(requested[i] - actual[i]) > 0.051) return true;
        }
        return false;
    }

    function resultLine(name, data, index) {
        return name + ": 상대 밀도 " + formatPercent(data.densityPercent[index]) +
            ", 상대 빈도 " + formatPercent(data.frequencyPercent[index]);
    }

    function formatPercent(value) {
        var rounded = Math.round(value);
        if (Math.abs(value - rounded) < 0.0001) return rounded + "%";
        return (Math.round(value * 10) / 10).toFixed(1) + "%";
    }

    function formatInput(value) {
        var rounded = Math.round(value);
        if (Math.abs(value - rounded) < 0.0001) return String(rounded);
        return String(Math.round(value * 10) / 10);
    }

    function seededNoise(index, salt) {
        var x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
        return x - Math.floor(x);
    }

    function makeSeededRandom(seed) {
        var state = Math.floor(seed || 1) % 2147483647;
        if (state <= 0) state += 2147483646;
        return function() {
            state = state * 16807 % 2147483647;
            return (state - 1) / 2147483646;
        };
    }

    function shuffleCells(cells) {
        for (var i = cells.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = cells[i];
            cells[i] = cells[j];
            cells[j] = tmp;
        }
    }

    function shuffleArray(values, random) {
        for (var i = values.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = values[i];
            values[i] = values[j];
            values[j] = tmp;
        }
    }

    function saveSettings() {
        var parts = [
            "v2", gridSize, cellMeters,
            requestedDensity[0], requestedDensity[1], requestedDensity[2],
            requestedFrequency[0], requestedFrequency[1], requestedFrequency[2],
            previewEnabled ? 1 : 0
        ];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function loadSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var parts = raw.split("|");
        if (parts.length !== 10 || parts[0] !== "v2") return;

        var savedGrid = parseInt(parts[1], 10);
        var savedMeters = parseInt(parts[2], 10);
        var density = [
            parseFloat(parts[3]), parseFloat(parts[4]), parseFloat(parts[5])
        ];
        var frequency = [
            parseFloat(parts[6]), parseFloat(parts[7]), parseFloat(parts[8])
        ];
        if (savedGrid !== 4 && savedGrid !== 5) return;
        if (savedMeters !== 1 && savedMeters !== 10) return;
        if (!validSavedTriplet(density) || !validSavedTriplet(frequency)) return;
        if (parts[9] !== "0" && parts[9] !== "1") return;

        gridSize = savedGrid;
        cellMeters = savedMeters;
        requestedDensity = density;
        requestedFrequency = frequency;
        previewEnabled = parts[9] === "1";
    }

    function validSavedTriplet(values) {
        var sum = 0;
        for (var i = 0; i < 3; i++) {
            if (!isFinite(values[i]) || values[i] < 0 || values[i] > 100) return false;
            sum += values[i];
        }
        return sum > 0;
    }
})();
