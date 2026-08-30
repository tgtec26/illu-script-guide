// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/*
  Object_StarInterior.jsx
  기능: 선택한 원을 별의 내부 구조 모식도로 바꿉니다.
    - 구에서 세로축을 모서리로 하는 쐐기(wedge)를 잘라낸 절개도
    - 절단 각도 = 쐐기의 벌어진 각 (0° = 온전한 구, 90° = 1/4 절개, 180° = 반구)
    - 회전 = 절개 방향을 세로축 중심으로 회전 (0° = 정면, 90° = 옆, 180° = 뒤)
    - 시점 X/Y/Z 회전은 sphere 스크립트와 같은 방식 (Rx→Ry→Rz)
    - 절단면은 항상 구의 중심을 지나므로 모든 껍질의 단면이 보입니다
  사용법: 정원을 선택한 뒤 실행
*/

(function() {
    if (app.documents.length === 0) {
        alert("문서를 열고 원을 선택해주세요.");
        return;
    }

    var PREF_KEY = "ObjectStarInterior/settings";

    var doc = app.activeDocument;
    var source = getSelectedCircle(doc.selection);
    if (source === null) {
        alert("원 패스 하나만 선택해주세요.");
        return;
    }

    var bounds = source.geometricBounds;
    var diameter = bounds[2] - bounds[0];
    var sourceHeight = bounds[1] - bounds[3];
    if (diameter <= 0 ||
            Math.abs(diameter - sourceHeight) > Math.max(0.1, diameter * 0.01) ||
            !hasCircularPathPoints(source)) {
        alert("가로와 세로 크기가 같은 원을 선택해주세요.");
        return;
    }

    var centerX = (bounds[0] + bounds[2]) / 2;
    var centerY = (bounds[1] + bounds[3]) / 2;
    var radius = diameter / 2;

    var shellCount = 6;
    var cutDeg = 180;
    var rotationDeg = 40;
    var axisLineOn = true;
    var viewX = 0;
    var viewY = 0;
    var viewZ = 0;
    var previewEnabled = true;
    var previewGroup = null;
    var sourceWasHidden = source.hidden;

    applySavedSettings();

    var LABEL_WIDTH = 66;
    var UNIT_WIDTH = 26;        // 단위 글자 수가 달라도 뒤 요소가 어긋나지 않도록 고정
    // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
    var STEP_BUTTON_WIDTH = 34;
    var SLIDER_WIDTH = 180;

    var dlg = new Window("dialog", "별 내부 구조");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 12;

    var optionPanel = addPanel(dlg, "구조");
    var shellField = addNumberField(optionPanel, "껍질 수", "개", shellCount, 1, 2, 9);
    var cutField = addNumberField(optionPanel, "절단 각도", "°", cutDeg, 5, 0, 180);
    var rotationField = addNumberField(optionPanel, "회전", "°", rotationDeg, 5, -180, 180);
    var axisLineCheck = optionPanel.add("checkbox", undefined, "중심 축 선 표시");
    axisLineCheck.value = axisLineOn;

    var viewPanel = addPanel(dlg, "구를 바라보는 시점");
    var viewXField = addNumberField(viewPanel, "X축", "°", viewX, 5, -180, 180);
    var viewYField = addNumberField(viewPanel, "Y축", "°", viewY, 5, -180, 180);
    var viewZField = addNumberField(viewPanel, "Z축", "°", viewZ, 5, -180, 180);
    var resetViewButton = viewPanel.add("button", undefined, "시점 리셋");
    resetViewButton.alignment = "right";

    var footer = dlg.add("group");
    var previewCheck = footer.add("checkbox", undefined, "미리보기");
    previewCheck.value = previewEnabled;
    var footerSpacer = footer.add("group");
    footerSpacer.alignment = ["fill", "center"];
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var okButton = footer.add("button", undefined, "확인");
    try { dlg.defaultElement = null; } catch (defaultError) {}
    var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

    resetViewButton.onClick = function() {
        setFieldValue(viewXField, 0);
        setFieldValue(viewYField, 0);
        setFieldValue(viewZField, 0);
        updatePreview();
    };
    axisLineCheck.onClick = function() {
        axisLineOn = axisLineCheck.value;
        updatePreview();
    };
    previewCheck.onClick = function() {
        previewEnabled = previewCheck.value;
        updatePreview();
    };
    okButton.onClick = function() {
        if (!readFields(true)) return;
        dlg.close(1);
    };

    source.hidden = true;
    source.selected = false;
    updatePreview();

    var result = dlg.show();
    clearPreview();

    if (result === 1) {
        readFields(false);
        var finalGroup = drawStar();
        finalGroup.name = "Star Interior";
        try { finalGroup.move(source, ElementPlacement.PLACEBEFORE); } catch (e) {}
        source.remove();
        saveSettings();
        doc.selection = null;
        finalGroup.selected = true;
    } else {
        source.hidden = sourceWasHidden;
        source.selected = true;
    }
    app.redraw();

    // -------------------------------------------------------
    // 그리기
    // -------------------------------------------------------
    // 시점 좌표계: x 오른쪽, y 위, z 시청자 쪽. 좌표는 구 중심 기준, 그릴 때 centerX/Y를 더한다.
    // 쐐기: 세로축(회전 후) 둘레의 방위각이 (회전-절단/2, 회전+절단/2)인 영역을 제거.
    function drawStar() {
        var group = doc.activeLayer.groupItems.add();
        var black = makeGray(100);

        var axis = projectRotated(0, 1, 0);
        var e0 = projectRotated(0, 0, 1);
        var e90 = projectRotated(1, 0, 0);
        var psi1 = (rotationDeg - cutDeg / 2) * Math.PI / 180;
        var psi2 = (rotationDeg + cutDeg / 2) * Math.PI / 180;

        function eDir(psi) {
            return [e0[0] * Math.cos(psi) + e90[0] * Math.sin(psi),
                    e0[1] * Math.cos(psi) + e90[1] * Math.sin(psi),
                    e0[2] * Math.cos(psi) + e90[2] * Math.sin(psi)];
        }
        function inWedge(azDeg) {
            var d = normalizeAngle((azDeg - rotationDeg) * Math.PI / 180);
            return Math.abs(d) < cutDeg * Math.PI / 360 - 1e-12;
        }

        if (cutDeg < 0.5) {
            drawFullCircle(group, black, makeGray(4));
            return group;
        }

        var eA = eDir(psi1);
        var eB = eDir(psi2);
        var n1 = eDir(psi1 + Math.PI / 2);
        var n2 = eDir(psi2 - Math.PI / 2);
        var f1 = n1[2] > 1e-4;
        var f2 = n2[2] > 1e-4;
        var caseB = f1 && f2;      // 절개부를 들여다보는 시점: 두 절단면 모두 보임
        var caseA = !f1 && !f2;    // 절개부가 뒤쪽: 표면만 보임
        var sinHalf = Math.sin(cutDeg * Math.PI / 360);
        var bodyGray = 4 + 36 * sinHalf * sinHalf *
            (Math.max(0, n1[2]) + Math.max(0, n2[2])) / 2;
        var bodyFill = makeGray((f1 || f2) ? bodyGray : 4);

        var Pp = [axis[0] * radius, axis[1] * radius, axis[2] * radius];
        var Pm = [-Pp[0], -Pp[1], -Pp[2]];

        // 절단면 테두리(반원 대원): q(t) = R(cos t·축 + sin t·ek), t 0=윗극점, π=아랫극점
        function rimArc(ek, tFrom, tTo) {
            return paramArc([0, 0, 0],
                [axis[0] * radius, axis[1] * radius],
                [ek[0] * radius, ek[1] * radius], tFrom, tTo - tFrom);
        }
        function facePts(ek) {
            return joinLoop([segPts(Pp, Pm), rimArc(ek, Math.PI, 0)]);
        }
        function fullFacePts() { // 180°: 두 절단면이 한 평면 → 타원 하나 (가운데 접힘선 없음)
            return closedEllipsePts(
                [axis[0] * radius, axis[1] * radius],
                [eB[0] * radius, eB[1] * radius]);
        }
        function mergedFacePts() { // 축 선 없이 두 절단면을 한 패스로
            return joinLoop([rimArc(eA, 0, Math.PI), rimArc(eB, Math.PI, 0)]);
        }

        var isFullPlane = cutDeg > 179.99;

        // ---- 윤곽선에서 사라지는 실루엣 구간과 다리(절단면 테두리) 계산 ----
        var silArcPts = null;
        var bridgeArcs = null;

        if (Math.abs(axis[2]) < 1e-6) {
            // 축이 시점 평면 안: 실루엣의 방위각은 축의 좌/우 두 값뿐
            var d3 = [-axis[1], axis[0], 0]; // 시점 평면에서 축에 수직
            var azP = Math.atan2(dot(d3, e90), dot(d3, e0)) * 180 / Math.PI;
            var plusRemoved = inWedge(azP);
            var minusRemoved = inWedge(azP + 180);
            if (plusRemoved || minusRemoved) {
                var sideDir = plusRemoved ? d3 : [-d3[0], -d3[1], 0];
                var angP = Math.atan2(Pp[1], Pp[0]);
                var angM = Math.atan2(Pm[1], Pm[0]);
                var via = Math.atan2(-sideDir[1], -sideDir[0]);
                var kStar;
                if (!caseA && !caseB) {
                    kStar = f1 ? 2 : 1; // 숨은 절단면의 테두리가 표면의 경계
                } else {
                    kStar = (dot(eA, sideDir) >= dot(eB, sideDir)) ? 1 : 2;
                }
                silArcPts = arc2d(angP, angM, via);
                bridgeArcs = [rimArc(kStar === 1 ? eA : eB, Math.PI, 0)];
            }
        } else {
            // 축이 기울어짐: 실루엣 방위각이 한 바퀴를 돌아 제거 구간이 항상 존재
            var phi1 = silCross(psi1, eA);
            var phi2 = silCross(psi2, eB);
            var viaS = pickSurvivingVia();
            var poleT = caseB ? (axis[2] > 0 ? Math.PI : 0)
                              : (axis[2] > 0 ? 0 : Math.PI);
            var t1 = tOfCross(phi1, eA);
            var t2 = tOfCross(phi2, eB);
            silArcPts = arc2d(phi2, phi1, viaS);
            bridgeArcs = [rimArc(eA, t1, poleT), rimArc(eB, poleT, t2)];
        }

        function silCross(psi, ek) { // 방위각 psi인 실루엣 점의 2D 각도
            var mx = e90[0] * Math.cos(psi) - e0[0] * Math.sin(psi);
            var my = e90[1] * Math.cos(psi) - e0[1] * Math.sin(psi);
            var phi = Math.atan2(-mx, my);
            var p = [Math.cos(phi), Math.sin(phi), 0];
            if (dot(p, ek) < 0) phi += Math.PI;
            return phi;
        }
        function tOfCross(phi, ek) {
            var p = [Math.cos(phi), Math.sin(phi), 0];
            return Math.atan2(dot(p, ek), dot(p, axis));
        }
        function pickSurvivingVia() {
            for (var i = 0; i < 72; i++) {
                var phi = i * Math.PI / 36;
                var p = [Math.cos(phi), Math.sin(phi), 0];
                var az = Math.atan2(dot(p, e90), dot(p, e0)) * 180 / Math.PI;
                if (!inWedge(az)) return phi;
            }
            return 0;
        }
        function arc2d(a1, a2, via) {
            var sweep = normalizeAngle(a2 - a1);
            var mid = normalizeAngle(via - a1);
            var inside = (sweep > 0) ? (mid > 0 && mid < sweep) : (mid < 0 && mid > sweep);
            if (!inside) sweep = (sweep > 0) ? sweep - 2 * Math.PI : sweep + 2 * Math.PI;
            return paramArc([0, 0, 0], [radius, 0], [0, radius], a1, sweep);
        }

        var bodyPts = (silArcPts !== null)
            ? joinLoop([silArcPts].concat(bridgeArcs)) : null;

        function drawBody() {
            if (bodyPts !== null) stylePath(buildPath(group, bodyPts), black, bodyFill);
            else drawFullCircle(group, black, bodyFill);
        }
        function drawFaceWithRings(faceBase) { // 바깥 껍질부터 (나중에 그린 것이 위)
            for (var i = shellCount; i >= 1; i--) {
                var k = (shellCount <= 1) ? 8 : 8 + (shellCount - i) / (shellCount - 1) * 36;
                stylePath(buildPath(group, scalePts(faceBase, i / shellCount)), black, makeGray(k));
            }
        }

        if (caseA) {
            drawBody();
        } else if (caseB) {
            drawBody();
            if (isFullPlane) {
                drawFaceWithRings(fullFacePts());
            } else if (axisLineOn) {
                drawFaceWithRings(facePts(eA));
                drawFaceWithRings(facePts(eB));
            } else {
                drawFaceWithRings(mergedFacePts());
            }
        } else {
            // 절단면 하나만 보임: 절단면을 먼저 그리고 표면(몸체)으로 덮어
            // 가려지는 부분을 정확히 감춘다. 다리 너머로 삐져나온 조각만 남는다.
            drawFaceWithRings(isFullPlane ? fullFacePts() : facePts(f1 ? eA : eB));
            drawBody();
        }
        return group;
    }

    function drawFullCircle(group, black, fill) {
        var circle = group.pathItems.ellipse(
            centerY + radius, centerX - radius, radius * 2, radius * 2);
        stylePath(circle, black, fill);
        return circle;
    }

    // -------------------------------------------------------
    // 3D 기하
    // -------------------------------------------------------
    function projectRotated(x, y, z) {
        var rx = viewX * Math.PI / 180;
        var ry = viewY * Math.PI / 180;
        var rz = viewZ * Math.PI / 180;
        var c = Math.cos(rx);
        var s = Math.sin(rx);
        var ny = y * c - z * s;
        var nz = y * s + z * c;
        y = ny;
        z = nz;
        c = Math.cos(ry);
        s = Math.sin(ry);
        var nx = x * c + z * s;
        nz = -x * s + z * c;
        x = nx;
        z = nz;
        c = Math.cos(rz);
        s = Math.sin(rz);
        nx = x * c - y * s;
        ny = x * s + y * c;
        return [nx, ny, z];
    }

    function dot(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function normalizeAngle(a) {
        while (a <= -Math.PI) a += 2 * Math.PI;
        while (a > Math.PI) a -= 2 * Math.PI;
        return a;
    }

    // 3D 원호의 투영: point(t) = C + bu·cos t + bw·sin t (bu/bw는 2D 투영 벡터)
    function paramArc(C, bu, bw, t1, sweep) {
        var count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2)));
        var dt = sweep / count;
        var hf = 4 / 3 * Math.tan(dt / 4);
        var pts = [];
        for (var i = 0; i <= count; i++) {
            var a = t1 + dt * i;
            var ca = Math.cos(a);
            var sa = Math.sin(a);
            var px = C[0] + bu[0] * ca + bw[0] * sa;
            var py = C[1] + bu[1] * ca + bw[1] * sa;
            var dx = (-bu[0] * sa + bw[0] * ca) * hf;
            var dy = (-bu[1] * sa + bw[1] * ca) * hf;
            pts.push({
                anchor: [px, py],
                left: [px - dx, py - dy],
                right: [px + dx, py + dy]
            });
        }
        return pts;
    }

    function closedEllipsePts(bu, bw) {
        var pts = [];
        var hf = 4 / 3 * Math.tan(Math.PI / 8);
        for (var i = 0; i < 4; i++) {
            var a = i * Math.PI / 2;
            var ca = Math.cos(a);
            var sa = Math.sin(a);
            var px = bu[0] * ca + bw[0] * sa;
            var py = bu[1] * ca + bw[1] * sa;
            var dx = (-bu[0] * sa + bw[0] * ca) * hf;
            var dy = (-bu[1] * sa + bw[1] * ca) * hf;
            pts.push({
                anchor: [px, py],
                left: [px - dx, py - dy],
                right: [px + dx, py + dy]
            });
        }
        return pts;
    }

    function segPts(a, b) {
        return [
            {anchor: [a[0], a[1]], left: [a[0], a[1]], right: [a[0], a[1]]},
            {anchor: [b[0], b[1]], left: [b[0], b[1]], right: [b[0], b[1]]}
        ];
    }

    // 이어지는 호들을 닫힌 점 목록으로. 이음매는 코너.
    function joinLoop(arcs) {
        var pts = [];
        var i, k;
        for (k = 0; k < arcs.length; k++) {
            var arc = arcs[k];
            var start = (k === 0) ? 0 : 1;
            if (k > 0) {
                var tip = pts[pts.length - 1];
                tip.right = arc[0].right;
                tip.corner = true;
            }
            for (i = start; i < arc.length; i++) pts.push(arc[i]);
        }
        var tip2 = pts[pts.length - 1];
        pts[0].left = tip2.left;
        pts[0].corner = true;
        pts.pop();
        return pts;
    }

    function scalePts(pts, s) {
        var out = [];
        for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            out.push({
                anchor: [p.anchor[0] * s, p.anchor[1] * s],
                left: [p.left[0] * s, p.left[1] * s],
                right: [p.right[0] * s, p.right[1] * s],
                corner: p.corner
            });
        }
        return out;
    }

    function buildPath(container, pts) {
        var path = container.pathItems.add();
        for (var i = 0; i < pts.length; i++) {
            var p = path.pathPoints.add();
            p.anchor = [centerX + pts[i].anchor[0], centerY + pts[i].anchor[1]];
            p.leftDirection = [centerX + pts[i].left[0], centerY + pts[i].left[1]];
            p.rightDirection = [centerX + pts[i].right[0], centerY + pts[i].right[1]];
            p.pointType = pts[i].corner ? PointType.CORNER : PointType.SMOOTH;
        }
        path.closed = true;
        return path;
    }

    function stylePath(path, strokeColor, fillColor) {
        path.stroked = true;
        path.strokeColor = strokeColor;
        path.strokeWidth = 0.4;
        path.filled = true;
        path.fillColor = fillColor;
        return path;
    }

    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0;
            cmyk.magenta = 0;
            cmyk.yellow = 0;
            cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value;
        rgb.green = value;
        rgb.blue = value;
        return rgb;
    }

    // -------------------------------------------------------
    // 미리보기 · 입력
    // -------------------------------------------------------
    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }
        if (!readFields(false)) {
            app.redraw();
            return;
        }
        previewGroup = drawStar();
        previewGroup.name = "Star Interior Preview";
        app.redraw();
    }

    function clearPreview() {
        if (previewGroup === null) return;
        try { previewGroup.remove(); } catch (e) {}
        previewGroup = null;
    }

    function readFields(showAlert) {
        var shells = parseNumber(shellField.input.text);
        var cut = parseNumber(cutField.input.text);
        var rotation = parseNumber(rotationField.input.text);
        var vx = parseNumber(viewXField.input.text);
        var vy = parseNumber(viewYField.input.text);
        var vz = parseNumber(viewZField.input.text);

        if (shells === null || shells < 2) {
            if (showAlert) alert("껍질 수는 2 이상의 정수로 입력해주세요.");
            return false;
        }
        if (cut === null || cut < 0 || cut > 180) {
            if (showAlert) alert("절단 각도는 0부터 180 사이로 입력해주세요.");
            return false;
        }
        if (rotation === null || rotation < -180 || rotation > 180 ||
                vx === null || vx < -180 || vx > 180 ||
                vy === null || vy < -180 || vy > 180 ||
                vz === null || vz < -180 || vz > 180) {
            if (showAlert) alert("회전 각도는 -180부터 180 사이로 입력해주세요.");
            return false;
        }

        shellCount = Math.round(shells);
        cutDeg = cut;
        rotationDeg = rotation;
        viewX = vx;
        viewY = vy;
        viewZ = vz;
        return true;
    }

    function getSelectedCircle(selection) {
        if (!selection || selection.length !== 1) return null;
        var item = selection[0];
        if (!item || item.typename !== "PathItem" || item.guides || item.clipping || !item.closed) return null;
        return item;
    }

    function hasCircularPathPoints(item) {
        if (!item.pathPoints || item.pathPoints.length !== 4) return false;
        for (var i = 0; i < item.pathPoints.length; i++) {
            var point = item.pathPoints[i];
            var leftIsAnchor = point.leftDirection[0] === point.anchor[0] &&
                point.leftDirection[1] === point.anchor[1];
            var rightIsAnchor = point.rightDirection[0] === point.anchor[0] &&
                point.rightDirection[1] === point.anchor[1];
            if (leftIsAnchor && rightIsAnchor) return false;
        }
        return true;
    }

    // -------------------------------------------------------
    // 다이얼로그 부품
    // -------------------------------------------------------
    function addPanel(parent, title) {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = "left";
        panel.spacing = 4;
        panel.margins = [10, 14, 10, 8];
        return panel;
    }

    function addNumberField(parent, labelText, unit, value, step, minimum, maximum) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = LABEL_WIDTH;
        var input = row.add("edittext", undefined, formatValue(value));
        input.characters = 5;
        input.justify = "center";
        var unitLabel = row.add("statictext", undefined, unit);
        unitLabel.preferredSize.width = UNIT_WIDTH;
        var down = row.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = row.add("slider", undefined, value, minimum, maximum);
        slider.preferredSize.width = SLIDER_WIDTH;
        var up = row.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;

        var field = {row: row, input: input, slider: slider, step: step, minimum: minimum, maximum: maximum, syncing: false};
        down.onClick = function() { stepField(field, -1); };
        up.onClick = function() { stepField(field, 1); };

        slider.onChanging = function() {
            if (field.syncing) return;
            var stepped = Math.round(slider.value);
            input.text = formatValue(clampField(field, stepped));
            updatePreview();
        };
        input.onChanging = updatePreview;
        input.onChange = function() {
            var parsed = parseNumber(input.text);
            if (parsed === null) parsed = field.minimum;
            parsed = clampField(field, parsed);
            input.text = formatValue(parsed);
            field.syncing = true;
            slider.value = parsed;
            field.syncing = false;
            updatePreview();
        };
        return field;
    }

    function setFieldValue(field, value) {
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
    }

    // 버튼 한 번 = step. step 격자에 맞춰 움직인다.
    function stepField(field, direction) {
        var value = parseNumber(field.input.text);
        if (value === null) value = field.minimum;
        value = Math.round((value + field.step * direction) / field.step) * field.step;
        value = clampField(field, value);
        setFieldValue(field, value);
        updatePreview();
    }

    function clampField(field, value) {
        if (value < field.minimum) value = field.minimum;
        if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
        return value;
    }

    function parseNumber(text) {
        var normalized = String(text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (normalized === "") return null;
        var value = Number(normalized);
        return isFinite(value) ? value : null;
    }

    function formatValue(value) {
        return String(Math.round(value * 100) / 100);
    }

    function saveSettings() {
        var parts = ["v4", shellCount, cutDeg, rotationDeg, viewX, viewY, viewZ,
            axisLineOn ? 1 : 0];
        try { app.preferences.setStringPreference(PREF_KEY, parts.join("|")); } catch (e) {}
    }

    function applySavedSettings() {
        var raw = "";
        try { raw = app.preferences.getStringPreference(PREF_KEY); } catch (e) { return; }
        if (!raw) return;
        var p = raw.split("|");
        if ((p[0] !== "v3" && p[0] !== "v4") || p.length < 7) return;

        var shells = parseInt(p[1], 10);
        var cut = parseFloat(p[2]);
        var rotation = parseFloat(p[3]);
        var vx = parseFloat(p[4]);
        var vy = parseFloat(p[5]);
        var vz = parseFloat(p[6]);
        if (shells >= 2 && shells <= 9) shellCount = shells;
        if (cut >= 0 && cut <= 180) cutDeg = cut;
        if (rotation >= -180 && rotation <= 180) rotationDeg = rotation;
        if (vx >= -180 && vx <= 180) viewX = vx;
        if (vy >= -180 && vy <= 180) viewY = vy;
        if (vz >= -180 && vz <= 180) viewZ = vz;
        if (p[0] === "v4" && p.length >= 8) axisLineOn = p[7] === "1";
    }
})();
