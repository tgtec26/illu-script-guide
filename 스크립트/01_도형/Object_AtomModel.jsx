(function() {
    // 1. 데이터 정의
    var elements = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];

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
    btnDeselect.onClick = function() { for (var i = 0; i < checkBoxes.length; i++) checkBoxes[i].value = false; };

    // --- 이온 전하 패널 ---
    var pnlCharge = win.add("panel", undefined, "이온 전하");
    pnlCharge.orientation = "row";
    var chargeLabels = ["-3", "-2", "-1", "0", "+1", "+2", "+3"];
    var chargeRadios = [];
    for (var j = 0; j < chargeLabels.length; j++) {
        chargeRadios[j] = pnlCharge.add("radiobutton", undefined, chargeLabels[j]);
        if (chargeLabels[j] === "0") chargeRadios[j].value = true;
    }

    // --- 옵션 ---
    var chkNucleus = win.add("checkbox", undefined, "핵 전하량 표시");
    chkNucleus.value = true;
    
    // 추가된 배열 옵션 체크박스
    var chkHorizontalFirst = win.add("checkbox", undefined, "1번 전자 껍질 수평 배열");
    var chkRotateElectrons = win.add("checkbox", undefined, "2, 3번 전자 껍질 22.5도 이동");

    // 전자 - 기호 표시 여부
    var chkShowMinus = win.add("checkbox", undefined, "전자 - 기호 표시");
    chkShowMinus.value = true;
    // 핵을 좌측 상단 조명(3D 구) 느낌으로
    var chkLit3D = win.add("checkbox", undefined, "핵 좌측 상단 조명 (3D)");
    chkLit3D.value = true;

    var btnGenerate = win.add("button", undefined, "원자 모형 생성하기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

    // 3. 핵심 그리기 로직 (추가된 파라미터 적용)
    function drawAtomModel(atomicNumbersStr, ionChargeStr, showNucleusTextStr, optHorizontalFirst, optRotateElectrons, optShowMinus, optLit3D) {
        if (app.documents.length === 0) return "에러: 열려있는 문서가 없습니다.";
        
        var atomStrings = atomicNumbersStr.split(",");
        var atomicNumbers = [];
        for (var k = 0; k < atomStrings.length; k++) {
            atomicNumbers.push(parseInt(atomStrings[k], 10));
        }

        var ionCharge = parseInt(ionChargeStr, 10);
        var showNucleusText = (showNucleusTextStr === true);
        var elementSymbols = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
        var MM = 2.834645669;
        var fontName = "GSMediumB1"; // 지정 서체명

        var doc = app.activeDocument;
        var layer = doc.activeLayer;
        var centerPoint = doc.activeView.centerPoint;
        var startCx = centerPoint[0];
        var cy = centerPoint[1];

        function getCMYK(c, m, y, k) {
            var color = new CMYKColor();
            color.cyan = c; color.magenta = m; color.yellow = y; color.black = k;
            return color;
        }
        var colorWhite = getCMYK(0, 0, 0, 0);
        var colorGray40 = getCMYK(0, 0, 0, 40);
        var colorGray80 = getCMYK(0, 0, 0, 80);

        function createUniqueGradient(baseName, stops) {
            var uniqueName = baseName + "_" + new Date().getTime();
            var grad = doc.gradients.add();
            grad.name = uniqueName;
            grad.type = GradientType.RADIAL;
            while (grad.gradientStops.length < stops.length) grad.gradientStops.add();
            for (var i = 0; i < stops.length; i++) {
                grad.gradientStops[i].rampPoint = stops[i].pos;
                grad.gradientStops[i].color = stops[i].color;
                if (stops[i].mid) grad.gradientStops[i].midPoint = stops[i].mid;
            }
            return grad;
        }

        var shellGrad = createUniqueGradient("Shell", [{pos:0, color:colorWhite}, {pos:83, color:colorWhite, mid:87}, {pos:100, color:colorGray40}]);
        var sphereGrad = createUniqueGradient("Sphere", [{pos:0, color:colorWhite, mid:13.3}, {pos:100, color:colorGray80}]);

        // 구(핵/전자)에 방사형 그라데이션을 적용하는 헬퍼
        // 주의: 최신 Illustrator에서는 GradientColor의 origin/matrix/hilite 속성이
        // 스크립트로는 무시되므로, 3D 조명은 "하이라이트를 중심으로 한 큰 원을
        // 원래 크기 원으로 클리핑"하는 방식으로 구현한다.
        function applySphereFill(item, ox, oy, dia, lit3D) {
            var gc = new GradientColor();
            gc.gradient = sphereGrad;
            if (!lit3D) {
                item.fillColor = gc;
                return item;
            }
            var r = dia / 2;
            var hx = ox - r * 0.5;  // 하이라이트 중심 (좌측 상단)
            var hy = oy + r * 0.5;
            var R = r * 1.7;        // 큰 원 반지름: 우하단 가장자리가 어두워지도록 확대
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
        var GAP = 5 * MM;
        var previousRightBounds = 0;

        for (var i = 0; i < atomicNumbers.length; i++) {
            var atomicNumber = atomicNumbers[i];
            var electronCount = Math.max(0, atomicNumber - ionCharge);
            var shellD = [11.5*MM, 17.5*MM, 23.5*MM];
            var nDia = 5.5 * MM;
            var eCount1 = Math.min(electronCount, 2);
            var eCount2 = Math.min(Math.max(0, electronCount - 2), 8);
            var eCount3 = Math.min(Math.max(0, electronCount - 10), 8);
            var shellsNeeded = (eCount3 > 0) ? 3 : (eCount2 > 0 ? 2 : (eCount1 > 0 ? 1 : 0));

            var baseRadius = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
            var leftBounds = baseRadius + (1 * MM);  
            var rightBounds = baseRadius + (1 * MM);

            if (ionCharge !== 0) {
                leftBounds = baseRadius + (4 * MM);
                rightBounds = baseRadius + (7 * MM);
            }

            if (i === 0) { currentCx = startCx; } 
            else { currentCx = currentCx + previousRightBounds + GAP + leftBounds; }
            
            previousRightBounds = rightBounds;
            var cx = currentCx;

            var atomGroup = layer.groupItems.add();
            atomGroup.name = "Atom_" + elementSymbols[atomicNumber-1];

            // 1. 전자 껍질
            for (var s = shellsNeeded; s >= 1; s--) {
                var dia = shellD[s-1];
                var shell = atomGroup.pathItems.ellipse(cy + dia/2, cx - dia/2, dia, dia);
                shell.filled = true; shell.stroked = false;
                var gc = new GradientColor(); gc.gradient = shellGrad;
                gc.matrix = app.getIdentityMatrix();
                gc.origin = [cx, cy]; gc.length = dia / 2;
                shell.fillColor = gc;
            }

            // 2. 원자핵
            var nucleus = atomGroup.pathItems.ellipse(cy + nDia/2, cx - nDia/2, nDia, nDia);
            nucleus.stroked = false;

            if (showNucleusText) {
                nucleus.fillColor = colorGray80;
                var t = atomGroup.textFrames.add();
                t.contents = atomicNumber + "+";
                t.textRange.characterAttributes.size = 7;
                t.textRange.characterAttributes.fillColor = colorWhite;
                try { t.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                
                var outlinedGroup = t.createOutline();
                var gb = outlinedGroup.geometricBounds;
                outlinedGroup.translate(cx - (gb[0] + gb[2]) / 2, cy - (gb[1] + gb[3]) / 2);
            } else {
                nucleus.filled = true;
                applySphereFill(nucleus, cx, cy, nDia, optLit3D);
            }

            // 3. 전자
            var counts = [eCount1, eCount2, eCount3];
            
            // 1번 껍질 전자 배열 옵션 (수평 옵션 체크 시 0/180도, 기본은 수직 90/270도)
            var angles1 = optHorizontalFirst ? [0, 180] : [90, 270];

            // 2, 3번 껍질 전자 회전 옵션
            var baseAnglesO = [90, -90, 0, 180, -135, 45, 135, -45];
            var anglesO = [];
            for (var a = 0; a < baseAnglesO.length; a++) {
                anglesO.push(optRotateElectrons ? baseAnglesO[a] + 22.5 : baseAnglesO[a]);
            }
            
            var eDia = 1.5 * MM;

            for (var s = 1; s <= shellsNeeded; s++) {
                var shellR = shellD[s-1]/2;
                var curAngles = (s === 1) ? angles1 : anglesO;
                for (var e = 0; e < counts[s-1]; e++) {
                    var rad = curAngles[e] * Math.PI / 180;
                    var ex = cx + shellR * Math.cos(rad);
                    var ey = cy + shellR * Math.sin(rad);
                    var electron = atomGroup.pathItems.ellipse(ey + eDia/2, ex - eDia/2, eDia, eDia);
                    electron.filled = true; electron.stroked = false;
                    applySphereFill(electron, ex, ey, eDia, false);
                    if (optShowMinus) {
                        var minus = atomGroup.pathItems.rectangle(ey + 0.1*MM, ex - 0.6*MM, 1.2*MM, 0.2*MM);
                        minus.fillColor = colorWhite;
                    }
                }
            }

            // 4. 이온 대괄호 및 전하량 (서체 적용 부분)
            if (ionCharge !== 0) {
                var brR = (shellsNeeded > 0) ? shellD[shellsNeeded-1]/2 : nDia/2;
                var gap = 2 * MM;
                var drawBracket = function(isL, center_x, center_y, brRadius) {
                    var path = atomGroup.pathItems.add();
                    var m = isL ? -1 : 1;
                    var bx = center_x + (brRadius + gap) * m;
                    path.setEntirePath([[bx - 2*MM*m, center_y + brRadius], [bx, center_y + brRadius], [bx, center_y - brRadius], [bx - 2*MM*m, center_y - brRadius]]);
                    path.filled = false; path.stroked = true; path.strokeWidth = 0.3; path.strokeColor = getCMYK(0,0,0,100);
                };
                drawBracket(true, cx, cy, brR); drawBracket(false, cx, cy, brR);
                
                var lbl = atomGroup.textFrames.add();
                var absC = Math.abs(ionCharge);
                lbl.contents = (absC > 1 ? absC : "") + (ionCharge > 0 ? "+" : "-");
                lbl.textRange.characterAttributes.size = 8;
                // 이온 전하량 서체 적용
                try { lbl.textRange.characterAttributes.textFont = app.textFonts.getByName(fontName); } catch(e) {}
                
                lbl.left = cx + brR + gap + 0.5*MM; 
                lbl.top = cy + brR + lbl.height * 0.7;
            }
        }
        return "성공";
    }

    // 실행 버튼 이벤트 연동 (새로 추가된 체크박스 값 전달)
    btnGenerate.onClick = function() {
        var selected = [];
        for (var k = 0; k < checkBoxes.length; k++) {
            if (checkBoxes[k].value) selected.push(k + 1);
        }
        if (selected.length === 0) { alert("원소를 선택하세요."); return; }

        var charge = 0;
        for (var r = 0; r < chargeRadios.length; r++) {
            if (chargeRadios[r].value) { charge = chargeLabels[r]; break; }
        }

        // 체크박스 값(.value)들을 함수로 넘겨줍니다.
        drawAtomModel(selected.join(","), charge, chkNucleus.value, chkHorizontalFirst.value, chkRotateElectrons.value, chkShowMinus.value, chkLit3D.value);
        
        // 원한다면 창을 닫지 않고 계속 생성하게 할 수도 있습니다. 현재는 생성 후 창 닫기 유지.
        win.close();
    };

    win.show();
})();