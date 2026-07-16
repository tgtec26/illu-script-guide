(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    // 1. 데이터 정의
    var elements = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];

    // 그라데이션은 문서당 1회만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
    var _gradCache = null, _gradCacheDoc = null;
    function getGradients(doc) {
        if (_gradCache && _gradCacheDoc === doc) return _gradCache;
        function cmyk(c, m, y, k) { var col = new CMYKColor(); col.cyan = c; col.magenta = m; col.yellow = y; col.black = k; return col; }
        var white = cmyk(0, 0, 0, 0), gray40 = cmyk(0, 0, 0, 40), gray80 = cmyk(0, 0, 0, 80);
        function uniq(baseName, stops) {
            var grad = doc.gradients.add();
            grad.name = baseName + "_" + (new Date().getTime());
            grad.type = GradientType.RADIAL;
            while (grad.gradientStops.length < stops.length) grad.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                grad.gradientStops[i].rampPoint = stops[i].pos;
                grad.gradientStops[i].color = stops[i].color;
                if (stops[i].mid) grad.gradientStops[i].midPoint = stops[i].mid;
            }
            return grad;
        }
        _gradCache = {
            shell: uniq("Shell", [{pos:0, color:white}, {pos:83, color:white, mid:87}, {pos:100, color:gray40}]),
            sphere: uniq("Sphere", [{pos:0, color:white, mid:13.3}, {pos:100, color:gray80}])
        };
        _gradCacheDoc = doc;
        return _gradCache;
    }

    var MM = 2.834645669;               // 1mm = 2.834645669pt
    var shellRatio = [11.5, 17.5, 23.5]; // 껍질 지름 비율(mm 기준). 최외곽 = 전체 크기.

    // 선택 오브젝트가 "가이드 정원"인지 판별. 맞으면 중심/지름(pt)을 돌려준다.
    // 하나의 닫힌 패스이고 가로·세로 차이가 5% 이내여야 원으로 간주.
    function detectGuideCircle() {
        if (app.documents.length === 0) return null;
        var d = app.activeDocument;
        if (!(d.selection && d.selection.length === 1)) return null;
        var s = d.selection[0];
        if (s.typename !== "PathItem" || !s.closed) return null;
        var gb = s.geometricBounds; // [left, top, right, bottom]
        var gw = gb[2] - gb[0], gh = gb[1] - gb[3];
        if (gw <= 0 || gh <= 0 || Math.abs(gw - gh) > gw * 0.05) return null;
        return { item: s, cx: (gb[0] + gb[2]) / 2, cy: (gb[1] + gb[3]) / 2, d: gw };
    }

    // 2. ScriptUI 창 구성
    var win = new Window("dialog", "원자 모형 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 15;
    win.margins = 20;

    // --- 원소 선택 패널 ---
    var pnlElement = win.add("panel", undefined, "원소 기호 (다중 선택)");
    pnlElement.alignChildren = "left";
    var gridGroup = pnlElement.add("group");
    gridGroup.orientation = "column";
    gridGroup.spacing = 5;

    var row;
    var checkBoxes = [];
    for (var i = 0; i < elements.length; i++) {
        if (i % 6 === 0) row = gridGroup.add("group");
        checkBoxes[i] = row.add("checkbox", undefined, elements[i]);
        checkBoxes[i].preferredSize.width = 50;
        if (elements[i] === "Na") checkBoxes[i].value = true;
    }

    var btnDeselect = pnlElement.add("button", undefined, "전체 해제");
    btnDeselect.alignment = "right";
    btnDeselect.onClick = function() { for (var i = 0; i < checkBoxes.length; i++) checkBoxes[i].value = false; updatePreview(); };

    // --- 이온 전하 패널 ---
    var pnlCharge = win.add("panel", undefined, "이온 전하");
    pnlCharge.orientation = "row";
    var chargeLabels = ["-3", "-2", "-1", "0", "+1", "+2", "+3"];
    var chargeRadios = [];
    for (var j = 0; j < chargeLabels.length; j++) {
        chargeRadios[j] = pnlCharge.add("radiobutton", undefined, chargeLabels[j]);
        if (chargeLabels[j] === "0") chargeRadios[j].value = true;
    }

    // --- 옵션 (2열 배치) ---
    var pnlOptions = win.add("panel", undefined, "옵션");
    pnlOptions.orientation = "row";
    pnlOptions.alignChildren = ["fill", "top"];
    pnlOptions.spacing = 20;
    var optCol1 = pnlOptions.add("group");
    optCol1.orientation = "column"; optCol1.alignChildren = "left"; optCol1.spacing = 6;
    var optCol2 = pnlOptions.add("group");
    optCol2.orientation = "column"; optCol2.alignChildren = "left"; optCol2.spacing = 6;

    // 1열: 배치 관련
    var chkNucleus = optCol1.add("checkbox", undefined, "핵 전하량 표시");
    chkNucleus.value = true;
    var chkHorizontalFirst = optCol1.add("checkbox", undefined, "1번 껍질 수평 배열");
    var chkRotateShell2 = optCol1.add("checkbox", undefined, "2번 껍질 22.5° 이동");
    var chkRotateShell3 = optCol1.add("checkbox", undefined, "3번 껍질 22.5° 이동");

    // 2열: 외형/미리보기 관련
    var chkShowMinus = optCol2.add("checkbox", undefined, "전자 - 기호 표시");
    chkShowMinus.value = true;
    var chkLit3DNucleus = optCol2.add("checkbox", undefined, "핵 3D 조명 효과");
    chkLit3DNucleus.value = true;
    var chkLit3DElectron = optCol2.add("checkbox", undefined, "전자 3D 조명 효과");
    chkLit3DElectron.value = true;
    var chkShellLine = optCol2.add("checkbox", undefined, "전자 껍질 선");
    var chkPreview = optCol2.add("checkbox", undefined, "미리보기 실시간 표시");
    chkPreview.value = true;

    // --- 크기 조절 슬라이더 ---
    var pnlSize = win.add("panel", undefined, "크기 조절");
    pnlSize.alignChildren = "left";
    pnlSize.spacing = 6;
    var sliderSyncers = []; // 값 변경(복원 등) 후 라벨 텍스트를 다시 맞추는 함수 목록
    function addSlider(labelText, minV, maxV, initV, fmt) {
        var g = pnlSize.add("group");
        var lab = g.add("statictext", undefined, labelText);
        lab.preferredSize.width = 70;
        var s = g.add("slider", undefined, initV, minV, maxV);
        s.preferredSize.width = 150;
        var t = g.add("statictext", undefined, fmt(initV));
        t.preferredSize.width = 55;
        s.syncLabel = function() { t.text = fmt(s.value); };
        // 드래그 중엔 라벨만(가벼움), 놓을 때(onChange) 무거운 미리보기 재드로우 → MRAP 부하 감소
        s.onChanging = function() { s.syncLabel(); };
        s.onChange = function() { s.syncLabel(); updatePreview(); };
        sliderSyncers.push(s.syncLabel);
        return s;
    }
    function syncSliderLabels() { for (var i = 0; i < sliderSyncers.length; i++) sliderSyncers[i](); }
    // 모든 크기는 실제 적용값(화면 실측치). 전체 크기 = 최외곽 껍질 지름(mm).
    var sldOverall = addSlider("전체 크기", 5, 300, 40, function(v){ return v.toFixed(1) + "mm"; });
    var sldNucleus = addSlider("핵 지름", 0.5, 40, 6, function(v){ return v.toFixed(1) + "mm"; });
    var sldElectron = addSlider("전자 지름", 0.2, 15, 2, function(v){ return v.toFixed(1) + "mm"; });
    var sldChargeFont = addSlider("핵 전하량 글자", 1, 100, 8, function(v){ return v.toFixed(1) + "pt"; });

    // 연동 규칙:
    //  전체 크기 변경 → 핵 지름·전자 지름·핵 전하량 글자가 같은 비율로 함께 조정(전체 비례).
    //  핵 지름 변경   → 핵 전하량 글자만 같은 비율로 조정.
    //  전자 지름/글자  → 개별 조정(다른 값에 영향 없음).
    var prevOverall = sldOverall.value;
    var prevNucleus = sldNucleus.value;
    function scaleSlider(sld, ratio) {
        if (!isFinite(ratio) || ratio <= 0) return;
        sld.value = sld.value * ratio; // 슬라이더가 [min,max]로 클램프
        sld.syncLabel();
    }
    // 드래그 중엔 연동+라벨만 갱신, 놓을 때(onChange) 미리보기 재드로우
    sldOverall.onChanging = function() {
        var r = sldOverall.value / prevOverall;
        scaleSlider(sldNucleus, r);
        scaleSlider(sldElectron, r);
        scaleSlider(sldChargeFont, r);
        prevOverall = sldOverall.value;
        prevNucleus = sldNucleus.value; // 핵 지름이 함께 바뀌었으므로 기준 갱신
        sldOverall.syncLabel();
    };
    sldOverall.onChange = function() { sldOverall.syncLabel(); updatePreview(); };
    sldNucleus.onChanging = function() {
        scaleSlider(sldChargeFont, sldNucleus.value / prevNucleus);
        prevNucleus = sldNucleus.value;
        sldNucleus.syncLabel();
    };
    sldNucleus.onChange = function() { sldNucleus.syncLabel(); updatePreview(); };


    var btnGenerate = win.add("button", undefined, "원자 모형 생성하기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

    // --- 현재 UI 값 읽기 / 그리기 호출 ---
    function getSelectedElements() {
        var sel = [];
        for (var k = 0; k < checkBoxes.length; k++) if (checkBoxes[k].value) sel.push(k + 1);
        return sel;
    }
    function currentCharge() {
        for (var r = 0; r < chargeRadios.length; r++) if (chargeRadios[r].value) return parseInt(chargeLabels[r], 10);
        return 0;
    }
    function drawWith(targetLayer, consumeGuide) {
        var sel = getSelectedElements();
        if (sel.length === 0) return [];
        return drawAtomModel(sel.join(","), String(currentCharge()), chkNucleus.value,
            chkHorizontalFirst.value, chkRotateShell2.value, chkRotateShell3.value, chkShowMinus.value,
            chkLit3DNucleus.value, chkLit3DElectron.value, chkShellLine.value,
            sldOverall.value, sldNucleus.value, sldElectron.value, sldChargeFont.value, targetLayer, consumeGuide);
    }

    // --- 아트보드 실시간 미리보기 (Object_sphere 방식) ---
    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) { try { previewItems[i].remove(); } catch (e) {} }
        previewItems = [];
    }
    // 이전 세션이 비정상 종료되며 남겼을 수 있는 미리보기 홀더를 정리 (이름이 고유해 안전)
    function removeLeftoverPreviews() {
        try {
            var d = app.activeDocument;
            for (var i = d.groupItems.length - 1; i >= 0; i--) {
                if (d.groupItems[i].name === "AtomModel_Preview") { try { d.groupItems[i].remove(); } catch (e) {} }
            }
        } catch (e) {}
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        clearPreview();
        if (chkPreview.value && getSelectedElements().length > 0) {
            // 그리기 도중 오류(MRAP 등)가 나도 남은 조각을 제거할 수 있도록,
            // 먼저 홀더 그룹을 만들어 캡처한 뒤 그 안에 그린다. (유령 누적 방지)
            // 미리보기는 가이드 원을 삭제하지 않는다(consumeGuide=false).
            try {
                var holder = app.activeDocument.activeLayer.groupItems.add();
                holder.name = "AtomModel_Preview";
                previewItems = [holder];
                drawWith(holder, false);
            } catch (e) {}
        }
        try { app.redraw(); } catch (e) {}
    }

    // 컨트롤 변경 시 미리보기 갱신
    for (var ci = 0; ci < checkBoxes.length; ci++) checkBoxes[ci].onClick = updatePreview;
    for (var ri = 0; ri < chargeRadios.length; ri++) chargeRadios[ri].onClick = updatePreview;
    chkNucleus.onClick = updatePreview;
    chkHorizontalFirst.onClick = updatePreview;
    chkRotateShell2.onClick = updatePreview;
    chkRotateShell3.onClick = updatePreview;
    chkShowMinus.onClick = updatePreview;
    chkLit3DNucleus.onClick = updatePreview;
    chkLit3DElectron.onClick = updatePreview;
    chkShellLine.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

    // 3. 핵심 그리기 로직 (추가된 파라미터 적용)
    function drawAtomModel(atomicNumbersStr, ionChargeStr, showNucleusTextStr, optHorizontalFirst, optRotateShell2, optRotateShell3, optShowMinus, optLit3DNucleus, optLit3DElectron, optShellLine, outerMM, nucMM, elecMM, fontPt, targetLayer, consumeGuide) {
        if (app.documents.length === 0) return [];

        var atomStrings = atomicNumbersStr.split(",");
        var atomicNumbers = [];
        for (var k = 0; k < atomStrings.length; k++) {
            atomicNumbers.push(parseInt(atomStrings[k], 10));
        }

        var ionCharge = parseInt(ionChargeStr, 10);
        var showNucleusText = (showNucleusTextStr === true);
        var elementSymbols = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
        var fontName = "GSMediumB1"; // 지정 서체명

        var doc = app.activeDocument;
        var layer = targetLayer ? targetLayer : doc.activeLayer;
        var centerPoint = doc.activeView.centerPoint;
        var startCx = centerPoint[0];
        var cy = centerPoint[1];

        // 선택된 정원(원)이 있으면 그 "중심"으로 모형을 옮기고 원은 삭제한다.
        // 크기는 이미 전체 크기(mm) 슬라이더에 원 지름이 반영돼 있으므로 별도 확대/축소는 하지 않는다.
        var g = detectGuideCircle();
        var guide = g ? g.item : null, guideCx = g ? g.cx : 0, guideCy = g ? g.cy : 0;

        // 선택된 원소들의 최대 껍질 수를 구해, 그 최외곽 껍질 지름 = 전체 크기(mm)가 되도록 배율(scale) 산출.
        function shellsFor(z) {
            var ec = Math.max(0, z - ionCharge);
            var c1 = Math.min(ec, 2), c2 = Math.min(Math.max(0, ec - 2), 8), c3 = Math.min(Math.max(0, ec - 10), 8);
            return (c3 > 0) ? 3 : (c2 > 0 ? 2 : (c1 > 0 ? 1 : 0));
        }
        var maxShells = 0;
        for (var mi = 0; mi < atomicNumbers.length; mi++) {
            var sc0 = shellsFor(atomicNumbers[mi]);
            if (sc0 > maxShells) maxShells = sc0;
        }
        // scale: 도형 전반(껍질·간격·괄호)에 곱하는 무차원 배율. 핵/전자/글자는 절대값을 그대로 사용.
        var refBase = shellRatio[(maxShells > 0 ? maxShells : 3) - 1];
        var scale = outerMM / refBase;
        // 실제 껍질 지름(pt): 최외곽 = outerMM(mm) 그대로.
        var shellD = [shellRatio[0]*MM*scale, shellRatio[1]*MM*scale, shellRatio[2]*MM*scale];

        function getCMYK(c, m, y, k) {
            var color = new CMYKColor();
            color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
            return color;
        }
        var colorWhite = getCMYK(0, 0, 0, 0);
        var colorGray80 = getCMYK(0, 0, 0, 80);

        // 그라데이션은 문서당 1회만 생성해 재사용 (미리보기 반복 대비)
        var grads = getGradients(doc);
        var shellGrad = grads.shell;
        var sphereGrad = grads.sphere;

        // 구(핵/전자)에 방사형 그라데이션을 적용하는 헬퍼
        // 주의: 최신 Illustrator에서는 GradientColor의 origin/matrix/hilite 속성이
        // 스크립트로는 무시되므로, 3D 조명은 "하이라이트를 중심으로 한 큰 원을
        // 원래 크기 원으로 클리핑"하는 방식으로 구현한다.
        function applySphereFill(item, ox, oy, dia, lit3D) {
            if (!lit3D) {
                // 3D 효과 꺼짐 → 그라데이션 없이 플랫 단색 (핵 전하량 표시와 동일한 톤)
                item.fillColor = colorGray80;
                return item;
            }
            var gc = new GradientColor();
            gc.gradient = sphereGrad;
            var r = dia / 2;
            var hx = ox - r * 0.35;  // 하이라이트 중심 (좌측 상단, 중심에서 살짝 치우침)
            var hy = oy + r * 0.35;
            var R = r * 1.7;         // 큰 원 반지름: 우하단 가장자리가 어두워지도록 확대
            var grp = item.parent.groupItems.add();
            var big = grp.pathItems.ellipse(hy + R, hx - R, R * 2, R * 2);
            big.filled = true; big.stroked = false;
            big.fillColor = gc;
            var mask = grp.pathItems.ellipse(oy + r, ox - r, dia, dia);
            mask.filled = false; mask.stroked = false;
            mask.clipping = true;
            grp.clipped = true;
            item.remove();
            return grp;
        }

        var currentCx = startCx;
        var GAP = 5 * MM * scale;
        var previousRightBounds = 0;
        var nDia = nucMM * MM; // 핵 지름: 절대 실측치(pt)

        // 가이드 원이 있으면 모든 원자를 하나의 그룹에 담아 마지막에 함께 이동한다.
        var masterGroup = guide ? layer.groupItems.add() : null;
        var container = masterGroup ? masterGroup : layer;
        var created = []; // 최상위로 추가된 항목(미리보기 제거용)

        for (var i = 0; i < atomicNumbers.length; i++) {
            var atomicNumber = atomicNumbers[i];
            var electronCount = Math.max(0, atomicNumber - ionCharge);
            var eCount1 = Math.min(electronCount, 2);
            var eCount2 = Math.min(Math.max(0, electronCount - 2), 8);
            var eCount3 = Math.min(Math.max(0, electronCount - 10), 8);
            var shellsNeeded = (eCount3 > 0) ? 3 : (eCount2 > 0 ? 2 : (eCount1 > 0 ? 1 : 0));

            var baseRadius = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
            var leftBounds = baseRadius + (1 * MM * scale);
            var rightBounds = baseRadius + (1 * MM * scale);

            if (ionCharge !== 0) {
                leftBounds = baseRadius + (4 * MM * scale);
                rightBounds = baseRadius + (7 * MM * scale);
            }

            if (i === 0) { currentCx = startCx; }
            else { currentCx = currentCx + previousRightBounds + GAP + leftBounds; }

            previousRightBounds = rightBounds;
            var cx = currentCx;

            var atomGroup = container.groupItems.add();
            atomGroup.name = "Atom_" + elementSymbols[atomicNumber-1];
            if (!masterGroup) created.push(atomGroup);

            // 1. 전자 껍질 (선 옵션: 내부 투명 + 0.3pt 선 / 기본: 그라데이션 면)
            for (var s = shellsNeeded; s >= 1; s--) {
                var dia = shellD[s-1];
                var shell = atomGroup.pathItems.ellipse(cy + dia/2, cx - dia/2, dia, dia);
                if (optShellLine) {
                    shell.filled = false; shell.stroked = true;
                    shell.strokeWidth = 0.3; shell.strokeColor = getCMYK(0, 0, 0, 100);
                } else {
                    shell.filled = true; shell.stroked = false;
                    var gc = new GradientColor(); gc.gradient = shellGrad;
                    gc.matrix = app.getIdentityMatrix();
                    gc.origin = [cx, cy]; gc.length = dia / 2;
                    shell.fillColor = gc;
                }
            }

            // 2. 원자핵
            var nucleus = atomGroup.pathItems.ellipse(cy + nDia/2, cx - nDia/2, nDia, nDia);
            nucleus.stroked = false;

            if (showNucleusText) {
                nucleus.fillColor = colorGray80;
                var t = atomGroup.textFrames.add();
                t.contents = atomicNumber + "+";
                t.textRange.characterAttributes.size = fontPt;
                t.textRange.characterAttributes.fillColor = colorWhite;
                try { t.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                
                var outlinedGroup = t.createOutline();
                var gb = outlinedGroup.geometricBounds;
                outlinedGroup.translate(cx - (gb[0] + gb[2]) / 2, cy - (gb[1] + gb[3]) / 2);
            } else {
                nucleus.filled = true;
                applySphereFill(nucleus, cx, cy, nDia, optLit3DNucleus);
            }

            // 3. 전자
            var counts = [eCount1, eCount2, eCount3];
            
            // 1번 껍질 전자 배열 옵션 (수평 옵션 체크 시 0/180도, 기본은 수직 90/270도)
            var angles1 = optHorizontalFirst ? [0, 180] : [90, 270];

            // 2, 3번 껍질 전자 회전 옵션 (각 껍질 독립)
            var baseAnglesO = [90, -90, 0, 180, -135, 45, 135, -45];
            function shellAngles(rotate) {
                var arr = [];
                for (var a = 0; a < baseAnglesO.length; a++) arr.push(rotate ? baseAnglesO[a] + 22.5 : baseAnglesO[a]);
                return arr;
            }
            var angles2 = shellAngles(optRotateShell2);
            var angles3 = shellAngles(optRotateShell3);

            var eDia = elecMM * MM; // 전자 지름: 절대 실측치(pt)

            for (var s = 1; s <= shellsNeeded; s++) {
                var shellR = shellD[s-1]/2;
                var curAngles = (s === 1) ? angles1 : (s === 2 ? angles2 : angles3);
                for (var e = 0; e < counts[s-1]; e++) {
                    var rad = curAngles[e] * Math.PI / 180;
                    var ex = cx + shellR * Math.cos(rad);
                    var ey = cy + shellR * Math.sin(rad);
                    var electron = atomGroup.pathItems.ellipse(ey + eDia/2, ex - eDia/2, eDia, eDia);
                    electron.filled = true; electron.stroked = false;
                    applySphereFill(electron, ex, ey, eDia, optLit3DElectron);
                    if (optShowMinus) {
                        // - 기호는 전자 지름에 비례 (기존 1.5mm 전자 기준 폭 1.2mm, 높이 0.2mm)
                        var mW = eDia * 0.8, mH = eDia * (0.2/1.5);
                        var minus = atomGroup.pathItems.rectangle(ey + mH/2, ex - mW/2, mW, mH);
                        minus.filled = true; minus.stroked = false;
                        minus.fillColor = colorWhite;
                    }
                }
            }

            // 4. 이온 대괄호 및 전하량 (서체 적용 부분)
            if (ionCharge !== 0) {
                var brR = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
                var gap = 2 * MM * scale;
                var brW = 2 * MM * scale;
                var drawBracket = function(isL, center_x, center_y, brRadius) {
                    var path = atomGroup.pathItems.add();
                    var m = isL ? -1 : 1;
                    var bx = center_x + (brRadius + gap) * m;
                    path.setEntirePath([[bx - brW*m, center_y + brRadius], [bx, center_y + brRadius], [bx, center_y - brRadius], [bx - brW*m, center_y - brRadius]]);
                    path.filled = false; path.stroked = true; path.strokeWidth = 0.3 * scale; path.strokeColor = getCMYK(0,0,0,100);
                };
                drawBracket(true, cx, cy, brR); drawBracket(false, cx, cy, brR);

                var lbl = atomGroup.textFrames.add();
                var absC = Math.abs(ionCharge);
                lbl.contents = (absC > 1 ? absC : "") + (ionCharge > 0 ? "+" : "-");
                lbl.textRange.characterAttributes.size = 8; // 이온 전하량 글자: 8pt 고정
                // 이온 전하량 서체 적용
                try { lbl.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}

                lbl.left = cx + brR + gap + 0.5*MM*scale;
                lbl.top = cy + brR + lbl.height * 0.7;
            }
        }

        // 가이드 원이 있으면 첫 원자의 중심(startCx, cy)을 원 중심으로 옮긴 뒤 원을 삭제.
        // 크기는 전체 크기(mm) 슬라이더에 이미 반영돼 있으므로 이동만 한다.
        if (guide && masterGroup) {
            masterGroup.translate(guideCx - startCx, guideCy - cy);
            if (consumeGuide !== false) guide.remove(); // 미리보기에서는 원을 지우지 않는다
        }
        if (masterGroup) created = [masterGroup];
        return created;
    }

    // --- 옵션 기억 (마지막 실행 설정을 다음 실행 때 복원) ---
    var PREF_KEY = "AtomModelMaker/settings";
    function collectSettings() {
        var parts = ["v4"];
        var elems = "";
        for (var i = 0; i < checkBoxes.length; i++) elems += checkBoxes[i].value ? "1" : "0";
        parts.push(elems);
        var ci = 3;
        for (var r = 0; r < chargeRadios.length; r++) if (chargeRadios[r].value) { ci = r; break; }
        parts.push(ci);
        parts.push(chkNucleus.value ? "1" : "0");
        parts.push(chkHorizontalFirst.value ? "1" : "0");
        parts.push(chkRotateShell2.value ? "1" : "0");
        parts.push(chkRotateShell3.value ? "1" : "0");
        parts.push(chkShowMinus.value ? "1" : "0");
        parts.push(chkLit3DNucleus.value ? "1" : "0");
        parts.push(chkLit3DElectron.value ? "1" : "0");
        parts.push(chkPreview.value ? "1" : "0");
        parts.push(sldOverall.value);
        parts.push(sldNucleus.value);
        parts.push(sldElectron.value);
        parts.push(sldChargeFont.value);
        parts.push(chkShellLine.value ? "1" : "0");
        return parts.join("|");
    }
    function saveSettings() {
        try { app.preferences.setStringPreference(PREF_KEY, collectSettings()); } catch (e) {}
    }
    function applySettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if (p[0] !== "v4" || p.length < 15) return;
        try {
            var elems = p[1];
            for (var i = 0; i < checkBoxes.length && i < elems.length; i++) checkBoxes[i].value = (elems.charAt(i) === "1");
            var ci = parseInt(p[2], 10);
            for (var r = 0; r < chargeRadios.length; r++) chargeRadios[r].value = (r === ci);
            chkNucleus.value = (p[3] === "1");
            chkHorizontalFirst.value = (p[4] === "1");
            chkRotateShell2.value = (p[5] === "1");
            chkRotateShell3.value = (p[6] === "1");
            chkShowMinus.value = (p[7] === "1");
            chkLit3DNucleus.value = (p[8] === "1");
            chkLit3DElectron.value = (p[9] === "1");
            chkPreview.value = (p[10] === "1");
            sldOverall.value = parseFloat(p[11]);
            sldNucleus.value = parseFloat(p[12]);
            sldElectron.value = parseFloat(p[13]);
            sldChargeFont.value = parseFloat(p[14]);
            if (p.length > 15) chkShellLine.value = (p[15] === "1"); // v4 후반 추가 필드(없으면 기본값 유지)
            syncSliderLabels();
            // 복원값을 기준선으로 삼아 이후 비율 계산이 맞도록 갱신
            prevOverall = sldOverall.value;
            prevNucleus = sldNucleus.value;
        } catch (e) {}
    }

    // 생성 버튼: 검증 후 설정 저장하고 닫는다. 실제 생성은 show() 반환 후 처리
    btnGenerate.onClick = function() {
        if (getSelectedElements().length === 0) { alert("원소를 선택하세요."); return; }
        saveSettings();
        win.close(1);
    };

    // 이전 세션 잔여 미리보기 정리 + 마지막 실행 설정 복원
    removeLeftoverPreviews();
    applySettings();

    // 가이드 원이 선택돼 있으면 '전체 크기'를 그 원 지름(mm)으로 세팅하고
    // 핵/전자/글자를 같은 비율로 함께 조정한다(전체 크기 변경과 동일 규칙).
    (function seedFromGuideCircle() {
        var g = detectGuideCircle();
        if (!g) return;
        var before = sldOverall.value;
        sldOverall.value = g.d / MM; // pt → mm (슬라이더 범위로 클램프)
        var r = sldOverall.value / before;
        scaleSlider(sldNucleus, r);
        scaleSlider(sldElectron, r);
        scaleSlider(sldChargeFont, r);
        sldOverall.syncLabel();
        prevOverall = sldOverall.value;
        prevNucleus = sldNucleus.value;
    })();

    // 초기 미리보기: 표시 전 1회 + 표시 시점(onShow)에 다시 그려야 화면에 보인다.
    // (show() 전 redraw는 모달 창이 뜨며 이전 화면으로 덮이므로 초기 미리보기가 안 보임)
    win.onShow = function() { updatePreview(); };
    updatePreview();

    var result = win.show();

    // 미리보기 정리 후, 확인(1)일 때만 최종 오브젝트 생성(가이드 원 삭제 포함)
    clearPreview();
    try { app.redraw(); } catch (e) {} // 미리보기 잔여 제거를 먼저 반영해 깨끗한 상태에서 생성
    if (result === 1 && app.documents.length > 0) {
        try { drawWith(app.activeDocument.activeLayer, true); } catch (e) { alert("생성 오류: " + e); }
        try { app.redraw(); } catch (e) {}
    }
})();