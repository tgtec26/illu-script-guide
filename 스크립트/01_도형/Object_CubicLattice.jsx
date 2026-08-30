// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var MM = 2.834645669;               // 1mm = 2.834645669pt
    var LINE_WIDTH_PT = 0.3;
    // Object_isometric.jsx와 같은 코너각 체계. x축은 오른쪽 아래, z축은
    // 왼쪽 아래, y축은 위를 향한다. 깊이 벡터도 같은 각도에서 계산한다.
    var SCREEN_X = [0, 0, 0];
    var SCREEN_Y = [0, 0, 0];
    var VIEW_X = 0, VIEW_Y = 0, VIEW_Z = 0;
    function setProjectionAngles(angleR, angleL, depthPercent) {
        var alphaR = (angleR - 90) * Math.PI / 180;
        var alphaL = (angleL - 90) * Math.PI / 180;
        var depthScale = (depthPercent === undefined ? 100 : depthPercent) / 100;
        var cosR = Math.cos(alphaR), sinR = Math.sin(alphaR);
        var cosL = Math.cos(alphaL), sinL = Math.sin(alphaL);
        // 가까운 면(x-y 평면)의 크기는 유지하고, 먼 면으로 이어지는 z축만
        // 압축·확장하여 두 평행한 면 사이의 화면상 거리를 조절한다.
        SCREEN_X = [cosR, 0, -depthScale * cosL];
        SCREEN_Y = [-sinR, 1, -depthScale * sinL];

        // 두 화면축의 영공간(null space)이 카메라 깊이 방향이다.
        var rawView = [
            depthScale * cosL,
            depthScale * Math.sin(alphaR + alphaL),
            cosR
        ];
        var viewLength = Math.sqrt(
            rawView[0] * rawView[0] +
            rawView[1] * rawView[1] +
            rawView[2] * rawView[2]
        );
        VIEW_X = rawView[0] / viewLength;
        VIEW_Y = rawView[1] / viewLength;
        VIEW_Z = rawView[2] / viewLength;
    }
    setProjectionAngles(131, 109, 100);

    // 단위세포 좌표는 격자상수를 1로 둔 분수 좌표.
    var CELL_CORNERS = [
        [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
        [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
    ];
    var CELL_EDGES = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    var FACE_CENTERS = [
        [0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5],
        [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5]
    ];
    var LATTICES = [
        { key: "sc",  label: "단순 입방" },
        { key: "bcc", label: "체심 입방" },
        { key: "fcc", label: "면심 입방" },
        { key: "nacl", label: "NaCl" },
        { key: "cscl", label: "CsCl" },
        { key: "i2", label: "I2 (아이오딘)" },
        { key: "co2", label: "CO2 (드라이아이스)" }
    ];
    var MODES = [
        { key: "wire", label: "라인 + 작은 구" },
        { key: "pack", label: "밀집 구(전체 원자)" },
        { key: "cut",  label: "단위세포 절단" }
    ];

    function latticePoints(key) {
        var pts = [], i;
        for (i = 0; i < CELL_CORNERS.length; i++) pts.push(CELL_CORNERS[i]);
        if (key === "bcc" || key === "cscl") pts.push([0.5, 0.5, 0.5]);
        if (key === "fcc" || key === "i2" || key === "co2") {
            for (i = 0; i < FACE_CENTERS.length; i++) pts.push(FACE_CENTERS[i]);
        }
        return pts;
    }

    // 구가 서로 닿는 지름 / 격자상수 비율. sc는 모서리, bcc는 체대각선, fcc는 면대각선으로 접촉.
    function touchRatio(key) {
        if (key === "bcc" || key === "cscl") return Math.sqrt(3) / 2;
        if (key === "fcc") return Math.sqrt(2) / 2;
        // I2는 FCC 격자점마다 작은 원자 두 개가 겹쳐 보이는 분자 모형이다.
        if (key === "i2") return 0.22;
        // CO2의 중앙 탄소 원자 지름. 말단 산소는 otherTouchRatio에서 정한다.
        if (key === "co2") return 0.22;
        if (key === "nacl") return 1;
        return 1;
    }

    function otherTouchRatio(key) {
        if (key === "co2") return 0.16;
        return touchRatio(key);
    }

    function siteRoleAtPoint(key, p) {
        if (key === "nacl") {
            return (Math.round(p[0]) + Math.round(p[1]) + Math.round(p[2])) % 2;
        }
        return 0;
    }

    function latticeSites(key, span) {
        var sites = [];
        var seen = {};
        function addSite(p, role) {
            var coordinateKey =
                Math.round(p[0] * 2) + "_" +
                Math.round(p[1] * 2) + "_" +
                Math.round(p[2] * 2);
            if (seen[coordinateKey]) return;
            seen[coordinateKey] = true;
            sites.push({ p: p, role: role });
        }
        function offsetPoint(p, x, y, z) {
            return [p[0] + x, p[1] + y, p[2] + z];
        }

        for (var x = 0; x < span; x++) {
            for (var y = 0; y < span; y++) {
                for (var z = 0; z < span; z++) {
                    var i;
                    for (i = 0; i < CELL_CORNERS.length; i++) {
                        var cornerPoint = offsetPoint(CELL_CORNERS[i], x, y, z);
                        addSite(cornerPoint, siteRoleAtPoint(key, cornerPoint));
                    }
                    if (key === "bcc" || key === "cscl") {
                        addSite([x + 0.5, y + 0.5, z + 0.5], 1);
                    } else if (key === "fcc" || key === "i2" || key === "co2") {
                        for (i = 0; i < FACE_CENTERS.length; i++) {
                            addSite(
                                offsetPoint(FACE_CENTERS[i], x, y, z),
                                (key === "i2" || key === "co2") ? 0 : 1
                            );
                        }
                    }
                }
            }
        }
        return sites;
    }

    // I2의 각 FCC 격자점은 같은 크기·색의 원자 두 개가 결합된 분자 중심이다.
    // 위치에 따라 세 방향을 순환시켜 모든 분자가 한 덩어리처럼 겹치지 않게 한다.
    function atomSites(key, span, atomDiameterRatio, otherDiameterRatio) {
        var centers = latticeSites(key, span);
        if (key !== "i2" && key !== "co2") return centers;
        var atoms = [];
        var iodineDirections = [[1, 0.35, 0], [0, 1, 0.35], [0.35, 0, 1]];
        // CO2 축은 카메라 깊이 방향에 수직인 화면 평면 안에서 회전시킨다.
        // 따라서 관찰 각도를 바꾸어도 O-C-O 세 원자가 한 점으로 겹치지 않는다.
        var carbonDioxideDirections = [];
        for (var directionIndex = 0; directionIndex < 4; directionIndex++) {
            var directionAngle = directionIndex * Math.PI / 4;
            var directionCos = Math.cos(directionAngle);
            var directionSin = Math.sin(directionAngle);
            carbonDioxideDirections.push([
                SCREEN_X[0] * directionCos + SCREEN_Y[0] * directionSin,
                SCREEN_X[1] * directionCos + SCREEN_Y[1] * directionSin,
                SCREEN_X[2] * directionCos + SCREEN_Y[2] * directionSin
            ]);
        }
        var directions = key === "i2" ? iodineDirections : carbonDioxideDirections;
        for (var i = 0; i < centers.length; i++) {
            var p = centers[i].p;
            var selector = Math.abs(
                Math.round(p[0] * 2) +
                Math.round(p[1] * 2) * 3 +
                Math.round(p[2] * 2) * 5
            ) % directions.length;
            var direction = directions[selector];
            var length = Math.sqrt(
                direction[0] * direction[0] +
                direction[1] * direction[1] +
                direction[2] * direction[2]
            );
            var separation = key === "i2" ?
                atomDiameterRatio * 0.72 :
                // CO2는 공간 채움 모형처럼 산소가 탄소 안쪽으로 깊게 겹친다.
                (atomDiameterRatio + otherDiameterRatio) / 2 * 0.52;
            var offset = [
                direction[0] / length * separation / 2,
                direction[1] / length * separation / 2,
                direction[2] / length * separation / 2
            ];
            if (key === "i2") {
                atoms.push({
                    p: [p[0] - offset[0], p[1] - offset[1], p[2] - offset[2]],
                    role: 0,
                    molecule: i
                });
                atoms.push({
                    p: [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]],
                    role: 0,
                    molecule: i
                });
            } else {
                // O=C=O: 중앙 탄소(role 0)와 동일 거리의 말단 산소(role 1).
                atoms.push({
                    p: [p[0] - offset[0] * 2, p[1] - offset[1] * 2, p[2] - offset[2] * 2],
                    role: 1,
                    molecule: i,
                    moleculeOrder: 0
                });
                atoms.push({
                    p: [p[0], p[1], p[2]],
                    role: 0,
                    molecule: i,
                    moleculeOrder: 1
                });
                atoms.push({
                    p: [p[0] + offset[0] * 2, p[1] + offset[1] * 2, p[2] + offset[2] * 2],
                    role: 1,
                    molecule: i,
                    moleculeOrder: 2
                });
            }
        }
        return atoms;
    }

    function cellEdgeSegments(span) {
        var segments = [];
        function add(a, b, hidden) {
            segments.push({ a: a, b: b, hidden: hidden });
        }
        var x, y, z;
        for (x = 0; x < span; x++) {
            for (y = 0; y <= span; y++) {
                for (z = 0; z <= span; z++) {
                    add([x, y, z], [x + 1, y, z], y === 0 && z === 0);
                }
            }
        }
        for (x = 0; x <= span; x++) {
            for (y = 0; y < span; y++) {
                for (z = 0; z <= span; z++) {
                    add([x, y, z], [x, y + 1, z], x === 0 && z === 0);
                }
            }
        }
        for (x = 0; x <= span; x++) {
            for (y = 0; y <= span; y++) {
                for (z = 0; z < span; z++) {
                    add([x, y, z], [x, y, z + 1], x === 0 && y === 0);
                }
            }
        }
        return segments;
    }

    function screenPoint(p, edge, ox, oy) {
        return [
            ox + edge * (SCREEN_X[0] * p[0] + SCREEN_X[1] * p[1] + SCREEN_X[2] * p[2]),
            oy + edge * (SCREEN_Y[0] * p[0] + SCREEN_Y[1] * p[1] + SCREEN_Y[2] * p[2])
        ];
    }

    // 값이 작은 원자부터 그리면 가까운 원자가 먼 원자를 자연스럽게 가린다.
    function viewDepth(p) {
        return VIEW_X * p[0] + VIEW_Y * p[1] + VIEW_Z * p[2];
    }

    // 직교투영 큐브의 실루엣(육각형). 절단 모드의 투영 경계로 쓴다.
    function convexHull(points) {
        var pts = points.slice(0);
        pts.sort(function(a, b) { return (a[0] - b[0]) || (a[1] - b[1]); });
        function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
        var lower = [], upper = [], i;
        for (i = 0; i < pts.length; i++) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
            lower.push(pts[i]);
        }
        for (i = pts.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
            upper.push(pts[i]);
        }
        lower.pop(); upper.pop();
        return lower.concat(upper);
    }
    function cellSilhouette(edge, ox, oy, span) {
        span = span ? span : 1;
        var projected = [];
        for (var i = 0; i < CELL_CORNERS.length; i++) {
            projected.push(screenPoint([
                CELL_CORNERS[i][0] * span,
                CELL_CORNERS[i][1] * span,
                CELL_CORNERS[i][2] * span
            ], edge, ox, oy));
        }
        return convexHull(projected);
    }

    function cellBounds(edge, ox, oy, span) {
        span = span ? span : 1;
        var left = 1e30, top = -1e30, right = -1e30, bottom = 1e30;
        for (var i = 0; i < CELL_CORNERS.length; i++) {
            var s = screenPoint([
                CELL_CORNERS[i][0] * span,
                CELL_CORNERS[i][1] * span,
                CELL_CORNERS[i][2] * span
            ], edge, ox, oy);
            if (s[0] < left) left = s[0];
            if (s[0] > right) right = s[0];
            if (s[1] > top) top = s[1];
            if (s[1] < bottom) bottom = s[1];
        }
        return [left, top, right, bottom];
    }

    function kColor(k) {
        var c = new CMYKColor();
        c.cyan = 0; c.magenta = 0; c.yellow = 0; c.black = k;
        return c;
    }

    function rgbColor(red, green, blue) {
        var c = new RGBColor();
        c.red = Math.max(0, Math.min(255, red));
        c.green = Math.max(0, Math.min(255, green));
        c.blue = Math.max(0, Math.min(255, blue));
        return c;
    }

    function adjustedRgb(rgb, brightness) {
        var value = Math.max(40, Math.min(160, brightness));
        var result = [], i;
        if (value <= 100) {
            for (i = 0; i < 3; i++) result[i] = rgb[i] * value / 100;
        } else {
            var towardWhite = (value - 100) / 60;
            for (i = 0; i < 3; i++) result[i] = rgb[i] + (255 - rgb[i]) * towardWhite;
        }
        return result;
    }

    function adjustedK(k, brightness) {
        var value = Math.max(40, Math.min(160, brightness));
        // 100%에서는 원래 K값을 유지하고, 최저 밝기(40%)에서는
        // 기본 음영과 관계없이 K90에 도달하도록 선형 보간한다.
        if (value <= 100) return Math.min(90, k + (90 - k) * (100 - value) / 60);
        return Math.max(0, k * (160 - value) / 60);
    }

    function roleBrightness(o, isCorner) {
        return isCorner ? o.cornerBrightness : o.otherBrightness;
    }

    function dot3(a, b) {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    function normalize3(v) {
        var len = Math.sqrt(dot3(v, v));
        if (len < 1e-12) return [0, 0, 0];
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    function cross3(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    function boundaryCount(p, span) {
        span = span ? span : 1;
        var count = 0;
        for (var i = 0; i < 3; i++) if (p[i] < 1e-9 || p[i] > span - 1e-9) count++;
        return count;
    }

    // 그라데이션은 문서당 1회만 만들어 재사용한다(미리보기 반복 시 스와치 폭증 방지).
    var _gradCache = null, _gradCacheDoc = null;
    function makeRadialGradient(doc, name, lightColor, darkColor, midPoint) {
        var grad = doc.gradients.add();
        grad.name = name + "_" + (new Date().getTime());
        grad.type = GradientType.RADIAL;
        while (grad.gradientStops.length < 2) grad.gradientStops.add();
        grad.gradientStops[0].rampPoint = 0;
        grad.gradientStops[0].midPoint = midPoint ? midPoint : 28;
        grad.gradientStops[0].color = lightColor;
        grad.gradientStops[1].rampPoint = 100;
        grad.gradientStops[1].color = darkColor;
        return grad;
    }

    function getGradients(doc) {
        if (_gradCache && _gradCacheDoc === doc) return _gradCache;
        _gradCache = {
            sphere: makeRadialGradient(doc, "CubicSphere", kColor(0), kColor(80), 13.3),
            wireSphere: makeRadialGradient(doc, "CubicWireSphere", kColor(0), kColor(80), 13.3),
            otherWireSphere: makeRadialGradient(doc, "OtherWire", kColor(0), kColor(80), 13.3),
            cutCenterGray: makeRadialGradient(doc, "CutGray", kColor(0), kColor(55), 13.3),
            corner: makeRadialGradient(
                doc, "CubicCorner",
                rgbColor(232, 105, 101), rgbColor(118, 25, 31), 28
            ),
            center: makeRadialGradient(
                doc, "CubicCenter",
                rgbColor(184, 214, 91), rgbColor(67, 103, 30), 28
            )
        };
        _gradCacheDoc = doc;
        return _gradCache;
    }

    function setGradientColors(gradient, lightColor, darkColor) {
        gradient.gradientStops[0].color = lightColor;
        gradient.gradientStops[1].color = darkColor;
    }

    function configureGradients(grads, o) {
        var cornerLight = adjustedRgb([232, 105, 101], o.cornerBrightness);
        var cornerDark = adjustedRgb([118, 25, 31], o.cornerBrightness);
        var otherLight = adjustedRgb([184, 214, 91], o.otherBrightness);
        var otherDark = adjustedRgb([67, 103, 30], o.otherBrightness);
        setGradientColors(
            grads.corner,
            rgbColor(cornerLight[0], cornerLight[1], cornerLight[2]),
            rgbColor(cornerDark[0], cornerDark[1], cornerDark[2])
        );
        setGradientColors(
            grads.center,
            rgbColor(otherLight[0], otherLight[1], otherLight[2]),
            rgbColor(otherDark[0], otherDark[1], otherDark[2])
        );
        setGradientColors(
            grads.wireSphere,
            kColor(adjustedK(0, o.cornerBrightness)),
            kColor(adjustedK(80, o.cornerBrightness))
        );
        setGradientColors(
            grads.otherWireSphere,
            kColor(adjustedK(0, o.otherBrightness)),
            kColor(adjustedK(80, o.otherBrightness))
        );
        setGradientColors(
            grads.cutCenterGray,
            kColor(adjustedK(0, o.otherBrightness)),
            kColor(adjustedK(55, o.otherBrightness))
        );
    }

    // --- ScriptUI ---
    var win = new Window("dialog", "입방정계 단위세포 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 20;

    var pnlLattice = win.add("panel", undefined, "격자 유형 (다중 선택)");
    pnlLattice.orientation = "row";
    pnlLattice.alignChildren = "left";
    var chkLattice = [];
    for (var li = 0; li < LATTICES.length; li++) {
        chkLattice[li] = pnlLattice.add("checkbox", undefined, LATTICES[li].label);
        chkLattice[li].value = li < 3;
    }

    var pnlCells = win.add("panel", undefined, "셀 구성");
    pnlCells.orientation = "row";
    pnlCells.alignChildren = "left";
    var radOneCell = pnlCells.add("radiobutton", undefined, "1셀");
    var radEightCells = pnlCells.add("radiobutton", undefined, "8셀 (2×2×2)");
    radOneCell.value = true;

    var pnlMode = win.add("panel", undefined, "표현 방식 (다중 선택)");
    pnlMode.orientation = "row";
    pnlMode.alignChildren = "left";
    var chkMode = [];
    for (var mi = 0; mi < MODES.length; mi++) {
        chkMode[mi] = pnlMode.add("checkbox", undefined, MODES[mi].label);
    }
    chkMode[0].value = true;

    var pnlOptions = win.add("panel", undefined, "옵션");
    pnlOptions.orientation = "row";
    pnlOptions.alignChildren = "left";
    pnlOptions.spacing = 20;
    var chkLit3D = pnlOptions.add("checkbox", undefined, "구 3D 조명 효과");
    chkLit3D.value = true;
    var chkOutline = pnlOptions.add("checkbox", undefined, "구 외곽선");
    chkOutline.value = true;
    var chkPreview = pnlOptions.add("checkbox", undefined, "미리보기 실시간 표시");
    chkPreview.value = true;

    var pnlLine = win.add("panel", undefined, "라인 표현");
    pnlLine.orientation = "row";
    pnlLine.alignChildren = "left";
    var chkHiddenDashed = pnlLine.add("checkbox", undefined, "숨김선 점선 표시 (해제: 실선)");
    chkHiddenDashed.value = true;

    var pnlColor = win.add("panel", undefined, "색상 표현");
    pnlColor.orientation = "row";
    pnlColor.alignChildren = "left";
    var radColor = pnlColor.add("radiobutton", undefined, "컬러");
    var radGray = pnlColor.add("radiobutton", undefined, "회색 음영");
    radColor.value = true;

    var pnlAdjustments = win.add("group");
    pnlAdjustments.orientation = "row";
    pnlAdjustments.alignChildren = ["fill", "top"];
    pnlAdjustments.spacing = 10;

    var pnlAngles = pnlAdjustments.add("panel", undefined, "관찰 각도 (오른쪽 + 왼쪽 + 상단 = 360°)");
    pnlAngles.orientation = "column";
    pnlAngles.alignChildren = "left";
    function addAngleSlider(labelText, initialValue) {
        var row = pnlAngles.add("group");
        row.orientation = "row";
        var label = row.add("statictext", undefined, labelText);
        label.preferredSize.width = 90;
        var slider = row.add("slider", undefined, initialValue, 91, 179);
        slider.preferredSize.width = 150;
        var valueText = row.add("statictext", undefined, Math.round(initialValue) + "°");
        valueText.preferredSize.width = 45;
        slider.syncLabel = function() {
            valueText.text = Math.round(slider.value) + "°";
            updateTopAngleText();
        };
        slider.onChanging = function() { slider.syncLabel(); };
        slider.onChange = function() { slider.syncLabel(); updatePreview(); };
        return slider;
    }
    var sldAngleR = addAngleSlider("오른쪽 각도", 131);
    var sldAngleL = addAngleSlider("왼쪽 각도", 109);
    function addDepthSlider() {
        var row = pnlAngles.add("group");
        row.orientation = "row";
        var label = row.add("statictext", undefined, "앞·뒤 면 거리");
        label.preferredSize.width = 90;
        var slider = row.add("slider", undefined, 100, 40, 160);
        slider.preferredSize.width = 150;
        var valueText = row.add("statictext", undefined, "100%");
        valueText.preferredSize.width = 45;
        slider.syncLabel = function() {
            valueText.text = Math.round(slider.value) + "%";
        };
        slider.onChanging = function() { slider.syncLabel(); };
        slider.onChange = function() { slider.syncLabel(); updatePreview(); };
        return slider;
    }
    var sldDepth = addDepthSlider();
    var angleInfoRow = pnlAngles.add("group");
    angleInfoRow.add("statictext", undefined, "상단 각도(자동):");
    var txtTopAngle = angleInfoRow.add("statictext", undefined, "120°");
    function updateTopAngleText() {
        if (!txtTopAngle) return;
        txtTopAngle.text = Math.round(360 - sldAngleR.value - sldAngleL.value) + "°";
    }
    function setAnglePreset(rightAngle, leftAngle) {
        sldAngleR.value = rightAngle;
        sldAngleL.value = leftAngle;
        sldAngleR.syncLabel();
        sldAngleL.syncLabel();
        updatePreview();
    }
    var anglePresetRow = pnlAngles.add("group");
    var btnAngleIso = anglePresetRow.add("button", undefined, "Isometric (120/120)");
    var btnAngleDi = anglePresetRow.add("button", undefined, "Dimetric (110/110)");
    var btnAngleTri = anglePresetRow.add("button", undefined, "Trimetric (120/105)");
    btnAngleIso.onClick = function() { setAnglePreset(120, 120); };
    btnAngleDi.onClick = function() { setAnglePreset(110, 110); };
    btnAngleTri.onClick = function() { setAnglePreset(120, 105); };
    updateTopAngleText();

    var pnlSize = pnlAdjustments.add("panel", undefined, "크기·밝기 조절");
    pnlSize.alignChildren = "left";
    pnlSize.spacing = 6;
    var sliderSyncers = [];
    function addSlider(labelText, minV, maxV, initV, fmt) {
        var g = pnlSize.add("group");
        var lab = g.add("statictext", undefined, labelText);
        lab.preferredSize.width = 135;
        var s = g.add("slider", undefined, initV, minV, maxV);
        s.preferredSize.width = 150;
        var t = g.add("statictext", undefined, fmt(initV));
        t.preferredSize.width = 55;
        s.syncLabel = function() { t.text = fmt(s.value); };
        s.onChanging = function() { s.syncLabel(); };
        s.onChange = function() { s.syncLabel(); updatePreview(); };
        sliderSyncers.push(s.syncLabel);
        return s;
    }
    function syncSliderLabels() { for (var i = 0; i < sliderSyncers.length; i++) sliderSyncers[i](); }
    // 밀집·절단 모드의 구 지름은 접촉 조건에서 자동 계산되므로 슬라이더는 라인 모드에만 쓰인다.
    var sldCell = addSlider("셀 한 변", 5, 80, 20, function(v) { return v.toFixed(1) + "mm"; });
    var sldCornerSphere = addSlider("꼭짓점 구 지름(라인)", 0.5, 20, 3, function(v) { return v.toFixed(1) + "mm"; });
    var sldOtherSphere = addSlider("나머지 구 지름(라인)", 0.5, 20, 3, function(v) { return v.toFixed(1) + "mm"; });
    var sldCornerBrightness = addSlider("꼭짓점 밝기", 40, 160, 100, function(v) { return Math.round(v) + "%"; });
    var sldOtherBrightness = addSlider("나머지 밝기", 40, 160, 100, function(v) { return Math.round(v) + "%"; });
    var sldGap = addSlider("셀 간격", 0, 40, 8, function(v) { return v.toFixed(1) + "mm"; });

    function isIodineSelected() {
        for (var i = 0; i < LATTICES.length; i++) {
            if (LATTICES[i].key === "i2") return chkLattice[i].value;
        }
        return false;
    }
    function syncIodinePair(source, target) {
        source.syncLabel();
        if (!isIodineSelected()) return;
        target.value = source.value;
        target.syncLabel();
    }
    function linkIodineSliders(first, second) {
        first.onChanging = function() { syncIodinePair(first, second); };
        first.onChange = function() { syncIodinePair(first, second); updatePreview(); };
        second.onChanging = function() { syncIodinePair(second, first); };
        second.onChange = function() { syncIodinePair(second, first); updatePreview(); };
    }
    function syncIodineControls() {
        if (!isIodineSelected()) return;
        sldOtherSphere.value = sldCornerSphere.value;
        sldOtherBrightness.value = sldCornerBrightness.value;
        sldOtherSphere.syncLabel();
        sldOtherBrightness.syncLabel();
    }
    linkIodineSliders(sldCornerSphere, sldOtherSphere);
    linkIodineSliders(sldCornerBrightness, sldOtherBrightness);

    // 셀 한 변을 바꾸면 구 지름과 간격이 같은 비율로 따라온다.
    var prevCell = sldCell.value;
    function scaleSlider(sld, ratio) {
        if (!isFinite(ratio) || ratio <= 0) return;
        sld.value = sld.value * ratio;
        sld.syncLabel();
    }
    sldCell.onChanging = function() {
        var r = sldCell.value / prevCell;
        scaleSlider(sldCornerSphere, r);
        scaleSlider(sldOtherSphere, r);
        scaleSlider(sldGap, r);
        prevCell = sldCell.value;
        sldCell.syncLabel();
    };
    sldCell.onChange = function() { sldCell.syncLabel(); updatePreview(); };

    var btnGenerate = win.add("button", undefined, "입방정계 생성하기", {name: "ok"});
    btnGenerate.preferredSize.height = 40;

    function getSelectedLattices() {
        var sel = [];
        for (var i = 0; i < chkLattice.length; i++) if (chkLattice[i].value) sel.push(LATTICES[i].key);
        return sel;
    }
    function getSelectedModes() {
        var sel = [];
        for (var i = 0; i < chkMode.length; i++) if (chkMode[i].value) sel.push(MODES[i].key);
        return sel;
    }
    function syncEnabled() {
        sldCornerSphere.enabled = chkMode[0].value;
        sldOtherSphere.enabled = chkMode[0].value;
        chkHiddenDashed.enabled = chkMode[0].value && radOneCell.value;
    }
    function drawWith(targetLayer) {
        var lattices = getSelectedLattices(), modes = getSelectedModes();
        if (lattices.length === 0 || modes.length === 0) return [];
        return drawCells({
            lattices: lattices,
            modes: modes,
            lit3D: chkLit3D.value,
            outline: chkOutline.value,
            hiddenDashed: chkHiddenDashed.value && radOneCell.value,
            colorMode: radColor.value ? "color" : "gray",
            cellSpan: radEightCells.value ? 2 : 1,
            angleR: sldAngleR.value,
            angleL: sldAngleL.value,
            depthPercent: sldDepth.value,
            cellMM: sldCell.value,
            cornerSphereMM: sldCornerSphere.value,
            otherSphereMM: sldOtherSphere.value,
            cornerBrightness: sldCornerBrightness.value,
            otherBrightness: sldOtherBrightness.value,
            gapMM: sldGap.value
        }, targetLayer);
    }

    // --- 아트보드 실시간 미리보기 ---
    var previewItems = [];
    function clearPreview() {
        for (var i = 0; i < previewItems.length; i++) { try { previewItems[i].remove(); } catch (e) {} }
        previewItems = [];
    }
    function removeLeftoverPreviews() {
        try {
            var d = app.activeDocument;
            for (var i = d.groupItems.length - 1; i >= 0; i--) {
                if (d.groupItems[i].name === "CubicLattice_Preview") { try { d.groupItems[i].remove(); } catch (e) {} }
            }
        } catch (e) {}
    }
    function updatePreview() {
        if (app.documents.length === 0) return;
        syncEnabled();
        clearPreview();
        if (chkPreview.value && getSelectedLattices().length > 0 && getSelectedModes().length > 0) {
            try {
                var holder = app.activeDocument.activeLayer.groupItems.add();
                holder.name = "CubicLattice_Preview";
                previewItems = [holder];
                drawWith(holder);
            } catch (e) {}
        }
        try { app.redraw(); } catch (e) {}
    }
    for (var ci = 0; ci < chkLattice.length; ci++) {
        chkLattice[ci].onClick = function() {
            syncIodineControls();
            updatePreview();
        };
    }
    for (var mj = 0; mj < chkMode.length; mj++) chkMode[mj].onClick = updatePreview;
    radOneCell.onClick = updatePreview;
    radEightCells.onClick = updatePreview;
    chkLit3D.onClick = updatePreview;
    chkOutline.onClick = updatePreview;
    chkHiddenDashed.onClick = updatePreview;
    radColor.onClick = updatePreview;
    radGray.onClick = updatePreview;
    chkPreview.onClick = updatePreview;

    // --- 그리기 ---
    // Object_MoleculeModel.jsx의 핵과 같은 방식: 좌측 상단에 중심을 둔 큰
    // 방사형 그라데이션 원을 실제 구 크기의 원으로 클리핑한다.
    function drawNucleusLitSphere(parent, cx, cy, dia, o, grads, isCorner, brightOtherGray) {
        var r = dia / 2;
        var hx = cx - r * 0.35;
        var hy = cy + r * 0.35;
        var gradientRadius = r * 1.7;
        var sphereGroup = parent.groupItems.add();
        var clippedGroup = sphereGroup.groupItems.add();

        var gc = new GradientColor();
        gc.gradient = o.colorMode === "color" ?
            (isCorner ? grads.corner : grads.center) :
            (isCorner ? grads.wireSphere :
                (brightOtherGray ? grads.cutCenterGray : grads.otherWireSphere));
        var big = clippedGroup.pathItems.ellipse(
            hy + gradientRadius,
            hx - gradientRadius,
            gradientRadius * 2,
            gradientRadius * 2
        );
        big.filled = true;
        big.stroked = false;
        big.fillColor = gc;

        var mask = clippedGroup.pathItems.ellipse(cy + r, cx - r, dia, dia);
        mask.filled = false;
        mask.stroked = false;
        mask.clipping = true;
        clippedGroup.clipped = true;

        if (o.outline) {
            var outline = sphereGroup.pathItems.ellipse(cy + r, cx - r, dia, dia);
            outline.filled = false;
            outline.stroked = true;
            outline.strokeWidth = LINE_WIDTH_PT;
            outline.strokeColor = kColor(100);
        }
        return sphereGroup;
    }

    function drawSphere(parent, cx, cy, dia, o, grads, nucleusLighting, isCorner, brightOtherGray) {
        if (o.lit3D && nucleusLighting) {
            return drawNucleusLitSphere(parent, cx, cy, dia, o, grads, isCorner, brightOtherGray);
        }
        var r = dia / 2;
        var circle = parent.pathItems.ellipse(cy + r, cx - r, dia, dia);
        circle.filled = true;
        if (o.lit3D) {
            var gc = new GradientColor();
            gc.gradient = grads.sphere;
            gc.matrix = app.getIdentityMatrix();
            gc.origin = [cx - r * 0.35, cy + r * 0.35]; // 왼쪽 위 하이라이트
            gc.length = r * 1.7;
            circle.fillColor = gc;
        } else {
            var brightness = roleBrightness(o, isCorner);
            if (o.colorMode === "color") {
                var flatRgb = adjustedRgb(
                    isCorner ? [184, 52, 55] : [132, 168, 47],
                    brightness
                );
                circle.fillColor = rgbColor(flatRgb[0], flatRgb[1], flatRgb[2]);
            } else {
                circle.fillColor = kColor(adjustedK(
                    !isCorner && brightOtherGray ? 0 : 15,
                    brightness
                ));
            }
        }
        circle.stroked = o.outline;
        if (o.outline) {
            circle.strokeWidth = LINE_WIDTH_PT;
            circle.strokeColor = kColor(100);
        }
        return circle;
    }

    function clipPolygonAtPlane(poly, axis, limit, keepGreater) {
        var out = [];
        if (poly.length === 0) return out;
        var previous = poly[poly.length - 1];
        var previousInside = keepGreater ? previous[axis] >= limit - 1e-9 : previous[axis] <= limit + 1e-9;
        for (var i = 0; i < poly.length; i++) {
            var current = poly[i];
            var currentInside = keepGreater ? current[axis] >= limit - 1e-9 : current[axis] <= limit + 1e-9;
            if (currentInside !== previousInside) {
                var denominator = current[axis] - previous[axis];
                var t = Math.abs(denominator) < 1e-12 ? 0 : (limit - previous[axis]) / denominator;
                out.push([
                    previous[0] + (current[0] - previous[0]) * t,
                    previous[1] + (current[1] - previous[1]) * t,
                    previous[2] + (current[2] - previous[2]) * t
                ]);
            }
            if (currentInside) out.push(current);
            previous = current;
            previousInside = currentInside;
        }
        return out;
    }

    function clipPolygonToCell(poly, span) {
        span = span ? span : 1;
        var out = poly, axis;
        for (axis = 0; axis < 3 && out.length > 0; axis++) {
            out = clipPolygonAtPlane(out, axis, 0, true);
            out = clipPolygonAtPlane(out, axis, span, false);
        }
        return out;
    }

    function addMeshFace(faces, polygon, normal, baseColor, isCutFace, span) {
        var clipped = clipPolygonToCell(polygon, span);
        if (clipped.length < 3) return;
        var clean = [];
        for (var c = 0; c < clipped.length; c++) {
            var previous = clean.length > 0 ? clean[clean.length - 1] : null;
            if (!previous ||
                Math.abs(previous[0] - clipped[c][0]) > 1e-8 ||
                Math.abs(previous[1] - clipped[c][1]) > 1e-8 ||
                Math.abs(previous[2] - clipped[c][2]) > 1e-8) {
                clean.push(clipped[c]);
            }
        }
        if (clean.length > 2 &&
            Math.abs(clean[0][0] - clean[clean.length - 1][0]) < 1e-8 &&
            Math.abs(clean[0][1] - clean[clean.length - 1][1]) < 1e-8 &&
            Math.abs(clean[0][2] - clean[clean.length - 1][2]) < 1e-8) {
            clean.pop();
        }
        if (clean.length < 3) return;
        var edgeA = [clean[1][0] - clean[0][0], clean[1][1] - clean[0][1], clean[1][2] - clean[0][2]];
        var edgeB = [clean[2][0] - clean[0][0], clean[2][1] - clean[0][1], clean[2][2] - clean[0][2]];
        var areaNormal = cross3(edgeA, edgeB);
        if (dot3(areaNormal, areaNormal) < 1e-14) return;
        var depth = 0;
        for (var i = 0; i < clean.length; i++) {
            depth += VIEW_X * clean[i][0] + VIEW_Y * clean[i][1] + VIEW_Z * clean[i][2];
        }
        faces.push({
            points: clean,
            normal: normalize3(normal),
            depth: depth / clean.length,
            baseColor: baseColor,
            cutFace: isCutFace
        });
    }

    function spherePoint(center, radius, latitude, longitude) {
        var cosLatitude = Math.cos(latitude);
        return [
            center[0] + radius * cosLatitude * Math.cos(longitude),
            center[1] + radius * Math.sin(latitude),
            center[2] + radius * cosLatitude * Math.sin(longitude)
        ];
    }

    function addSphereSurface(faces, center, radius, baseColor, span) {
        var latitudeSteps = span > 1 ? 8 : 12;
        var longitudeSteps = span > 1 ? 16 : 24;
        for (var la = 0; la < latitudeSteps; la++) {
            var lat0 = -Math.PI / 2 + Math.PI * la / latitudeSteps;
            var lat1 = -Math.PI / 2 + Math.PI * (la + 1) / latitudeSteps;
            for (var lo = 0; lo < longitudeSteps; lo++) {
                var lon0 = Math.PI * 2 * lo / longitudeSteps;
                var lon1 = Math.PI * 2 * (lo + 1) / longitudeSteps;
                var p00 = spherePoint(center, radius, lat0, lon0);
                var p01 = spherePoint(center, radius, lat0, lon1);
                var p10 = spherePoint(center, radius, lat1, lon0);
                var p11 = spherePoint(center, radius, lat1, lon1);
                var triangles = [[p00, p10, p11], [p00, p11, p01]];
                for (var t = 0; t < triangles.length; t++) {
                    var tri = triangles[t];
                    var centroidNormal = normalize3([
                        (tri[0][0] + tri[1][0] + tri[2][0]) / 3 - center[0],
                        (tri[0][1] + tri[1][1] + tri[2][1]) / 3 - center[1],
                        (tri[0][2] + tri[1][2] + tri[2][2]) / 3 - center[2]
                    ]);
                    if (dot3(centroidNormal, [VIEW_X, VIEW_Y, VIEW_Z]) > 0) {
                        addMeshFace(faces, tri, centroidNormal, baseColor, false, span);
                    }
                }
            }
        }
    }

    function addCutDisks(faces, center, radius, baseColor, span) {
        span = span ? span : 1;
        var diskSteps = span > 1 ? 24 : 32;
        for (var axis = 0; axis < 3; axis++) {
            var side = -1;
            if (center[axis] < 1e-9) side = 0;
            else if (center[axis] > span - 1e-9) side = 1;
            if (side < 0) continue;

            var normal = [0, 0, 0];
            normal[axis] = side === 0 ? -1 : 1;
            if (dot3(normal, [VIEW_X, VIEW_Y, VIEW_Z]) <= 0) continue;

            var axisU = (axis === 0) ? 1 : 0;
            var axisV = (axis === 2) ? 1 : 2;
            if (axis === 1) axisV = 2;
            for (var i = 0; i < diskSteps; i++) {
                var angle0 = Math.PI * 2 * i / diskSteps;
                var angle1 = Math.PI * 2 * (i + 1) / diskSteps;
                var p0 = [center[0], center[1], center[2]];
                var p1 = [center[0], center[1], center[2]];
                var p2 = [center[0], center[1], center[2]];
                p1[axisU] += radius * Math.cos(angle0);
                p1[axisV] += radius * Math.sin(angle0);
                p2[axisU] += radius * Math.cos(angle1);
                p2[axisV] += radius * Math.sin(angle1);
                addMeshFace(faces, [p0, p1, p2], normal, baseColor, true, span);
            }
        }
    }

    function shadeMeshColor(baseColor, normal, lit3D, isCutFace) {
        if (!lit3D) return rgbColor(baseColor[0], baseColor[1], baseColor[2]);
        var light = normalize3([-0.45, 0.8, 0.55]);
        var amount = Math.max(0, dot3(normal, light));
        // 절단면은 평면이므로 명암 범위를 좁혀 균일하게, 구면은 방사형
        // 그라데이션으로 표현한다. 둘의 경계가 색과 광택 모두에서 구분된다.
        var factor = (isCutFace ? 0.76 : 0.48) + (isCutFace ? 0.16 : 0.52) * amount;
        return rgbColor(baseColor[0] * factor, baseColor[1] * factor, baseColor[2] * factor);
    }

    function projectedHullFromFaces(faces, edge, ox, oy) {
        var projected = [];
        for (var i = 0; i < faces.length; i++) {
            for (var p = 0; p < faces[i].points.length; p++) {
                projected.push(screenPoint(faces[i].points[p], edge, ox, oy));
            }
        }
        return projected.length >= 3 ? convexHull(projected) : [];
    }

    function drawBezierHull(parent, hull, fillColor, o, useGradient) {
        if (hull.length < 3) return null;
        var path = parent.pathItems.add();
        path.setEntirePath(hull);
        path.closed = true;
        path.filled = true;
        path.fillColor = fillColor;
        path.stroked = o.outline;
        if (o.outline) {
            path.strokeWidth = LINE_WIDTH_PT;
            path.strokeColor = kColor(100);
        }

        var points = path.pathPoints;
        for (var i = 0; i < hull.length; i++) {
            var previous = hull[(i + hull.length - 1) % hull.length];
            var anchor = hull[i];
            var next = hull[(i + 1) % hull.length];
            var toPrevious = [previous[0] - anchor[0], previous[1] - anchor[1]];
            var toNext = [next[0] - anchor[0], next[1] - anchor[1]];
            var previousLength = Math.sqrt(toPrevious[0] * toPrevious[0] + toPrevious[1] * toPrevious[1]);
            var nextLength = Math.sqrt(toNext[0] * toNext[0] + toNext[1] * toNext[1]);
            var turn = 1;
            if (previousLength > 1e-9 && nextLength > 1e-9) {
                turn = (toPrevious[0] * toNext[0] + toPrevious[1] * toNext[1]) /
                    (previousLength * nextLength);
            }

            // 원호처럼 완만한 지점만 Catmull-Rom 방식의 베지어 핸들로 바꾼다.
            // 셀 절단선이 만나는 모서리는 코너로 남겨 절단 형상이 무너지지 않게 한다.
            if (turn < -0.82) {
                var tangentX = (next[0] - previous[0]) / 6;
                var tangentY = (next[1] - previous[1]) / 6;
                points[i].leftDirection = [anchor[0] - tangentX, anchor[1] - tangentY];
                points[i].rightDirection = [anchor[0] + tangentX, anchor[1] + tangentY];
                points[i].pointType = PointType.SMOOTH;
            } else {
                points[i].leftDirection = anchor;
                points[i].rightDirection = anchor;
                points[i].pointType = PointType.CORNER;
            }
        }

        if (useGradient && o.lit3D) {
            var left = 1e30, top = -1e30, right = -1e30, bottom = 1e30;
            for (i = 0; i < hull.length; i++) {
                if (hull[i][0] < left) left = hull[i][0];
                if (hull[i][0] > right) right = hull[i][0];
                if (hull[i][1] > top) top = hull[i][1];
                if (hull[i][1] < bottom) bottom = hull[i][1];
            }
            var gc = new GradientColor();
            gc.gradient = useGradient;
            gc.matrix = app.getIdentityMatrix();
            gc.origin = [left + (right - left) * 0.3, top - (top - bottom) * 0.28];
            gc.length = Math.max(right - left, top - bottom) * 0.82;
            path.fillColor = gc;
        }
        return path;
    }

    function drawCutCell(parent, key, o, ox, oy, edge, grads) {
        var atomRecords = [];
        var cornerDiameterRatio = touchRatio(key);
        var otherDiameterRatio = otherTouchRatio(key);
        var sites = atomSites(key, o.cellSpan, cornerDiameterRatio, otherDiameterRatio);
        for (var i = 0; i < sites.length; i++) {
            var point = sites[i].p;
            // role 0은 적색/어두운 이온, role 1은 녹색/밝은 이온이다.
            var isCorner = sites[i].role === 0;
            var rawBaseColor = o.colorMode === "color" ?
                (isCorner ? [184, 52, 55] : [132, 168, 47]) :
                (isCorner ? [128, 128, 128] : [180, 180, 180]);
            var baseColor = adjustedRgb(rawBaseColor, roleBrightness(o, isCorner));
            var radius = (isCorner ? cornerDiameterRatio : otherDiameterRatio) / 2;
            var parts = [];
            var atomFaces = [];
            addSphereSurface(atomFaces, point, radius, baseColor, o.cellSpan);
            addCutDisks(atomFaces, point, radius, baseColor, o.cellSpan);

            var curvedFaces = [];
            var cutGroups = {};
            for (var f = 0; f < atomFaces.length; f++) {
                if (!atomFaces[f].cutFace) {
                    curvedFaces.push(atomFaces[f]);
                } else {
                    var n = atomFaces[f].normal;
                    var groupKey = Math.round(n[0]) + "_" + Math.round(n[1]) + "_" + Math.round(n[2]);
                    if (!cutGroups[groupKey]) cutGroups[groupKey] = [];
                    cutGroups[groupKey].push(atomFaces[f]);
                }
            }

            var bodyHull = projectedHullFromFaces(curvedFaces, edge, ox, oy);
            if (bodyHull.length >= 3) {
                parts.push({
                    hull: bodyHull,
                    depth: -1e30,
                    baseColor: baseColor,
                    normal: normalize3([VIEW_X, VIEW_Y, VIEW_Z]),
                    cutFace: false,
                    gradient: o.colorMode === "color" ?
                        (isCorner ? grads.corner : grads.center) :
                        (isCorner ? grads.wireSphere : grads.cutCenterGray)
                });
            }

            for (var keyName in cutGroups) {
                if (!cutGroups.hasOwnProperty(keyName)) continue;
                var cutHull = projectedHullFromFaces(cutGroups[keyName], edge, ox, oy);
                if (cutHull.length < 3) continue;
                var averageDepth = 0;
                for (f = 0; f < cutGroups[keyName].length; f++) averageDepth += cutGroups[keyName][f].depth;
                parts.push({
                    hull: cutHull,
                    depth: averageDepth / cutGroups[keyName].length + 1e-5,
                    baseColor: baseColor,
                    normal: cutGroups[keyName][0].normal,
                    cutFace: true,
                    gradient: null
                });
            }
            // 한 원자의 구면과 절단면을 다른 원자의 패스 사이에 섞지 않는다.
            // 구면을 먼저 그리고, 보이는 절단 평면을 그 위에 깊이순으로 올린다.
            parts.sort(function(a, b) {
                if (a.cutFace !== b.cutFace) return a.cutFace ? 1 : -1;
                return a.depth - b.depth;
            });
            atomRecords.push({
                depth: viewDepth(point),
                parts: parts,
                corner: isCorner,
                index: i,
                molecule: sites[i].molecule,
                moleculeOrder: sites[i].moleculeOrder
            });
        }

        atomRecords.sort(function(a, b) {
            var depthDifference = a.depth - b.depth;
            if (Math.abs(depthDifference) > 1e-9) return depthDifference;
            if (key === "co2" && a.molecule === b.molecule) {
                return a.moleculeOrder - b.moleculeOrder;
            }
            // 접촉점에서 깊이가 같으면 꼭짓점 원자를 마지막에 두어 잘린
            // 1/8 구의 경계가 면심 원자 아래로 사라지지 않게 한다.
            if (a.corner !== b.corner) return a.corner ? 1 : -1;
            return a.index - b.index;
        });

        for (var atomIndex = 0; atomIndex < atomRecords.length; atomIndex++) {
            var atomGroup = parent.groupItems.add();
            atomGroup.name = "CubicAtom_" + atomRecords[atomIndex].index;
            var atomParts = atomRecords[atomIndex].parts;
            for (var partIndex = 0; partIndex < atomParts.length; partIndex++) {
                var part = atomParts[partIndex];
                var fill = shadeMeshColor(
                    part.baseColor,
                    part.normal,
                    o.lit3D,
                    part.cutFace
                );
                drawBezierHull(atomGroup, part.hull, fill, o, part.gradient);
            }
        }

        if (o.outline) {
            var hull = cellSilhouette(edge, ox, oy, o.cellSpan);
            var frame = parent.pathItems.add();
            frame.setEntirePath(hull);
            frame.closed = true;
            frame.filled = false;
            frame.stroked = true;
            frame.strokeWidth = LINE_WIDTH_PT;
            frame.strokeColor = kColor(100);
        }
    }

    function drawWireCell(parent, key, o, ox, oy, edge, grads) {
        var records = [];
        var segments = cellEdgeSegments(o.cellSpan);
        for (var e = 0; e < segments.length; e++) {
            // 격자 모서리는 꼭짓점 원자의 중심을 잇지만, 실제 그림에서는 구의
            // 외곽에서 끝나야 한다. 화면상 구 반지름만큼 양 끝을 먼저 잘라낸다.
            var rawStart = screenPoint(segments[e].a, edge, ox, oy);
            var rawEnd = screenPoint(segments[e].b, edge, ox, oy);
            var screenLength = Math.sqrt(
                (rawEnd[0] - rawStart[0]) * (rawEnd[0] - rawStart[0]) +
                (rawEnd[1] - rawStart[1]) * (rawEnd[1] - rawStart[1])
            );
            var startRole = siteRoleAtPoint(key, segments[e].a);
            var endRole = siteRoleAtPoint(key, segments[e].b);
            var startRadius =
                (startRole === 0 ? o.cornerSphereMM : o.otherSphereMM) * MM / 2 +
                LINE_WIDTH_PT / 2;
            var endRadius =
                (endRole === 0 ? o.cornerSphereMM : o.otherSphereMM) * MM / 2 +
                LINE_WIDTH_PT / 2;
            var trimStart = screenLength > 1e-9 ? Math.min(0.49, startRadius / screenLength) : 0;
            var trimEnd = screenLength > 1e-9 ? Math.min(0.49, endRadius / screenLength) : 0;
            var trimmedA = [
                segments[e].a[0] + (segments[e].b[0] - segments[e].a[0]) * trimStart,
                segments[e].a[1] + (segments[e].b[1] - segments[e].a[1]) * trimStart,
                segments[e].a[2] + (segments[e].b[2] - segments[e].a[2]) * trimStart
            ];
            var trimmedB = [
                segments[e].b[0] + (segments[e].a[0] - segments[e].b[0]) * trimEnd,
                segments[e].b[1] + (segments[e].a[1] - segments[e].b[1]) * trimEnd,
                segments[e].b[2] + (segments[e].a[2] - segments[e].b[2]) * trimEnd
            ];

            // 점선은 대시 간격이 이어지도록 한 패스로 유지하고, 실선은 깊이
            // 판정을 정밀하게 하기 위해 짧은 구간으로 나눈다.
            var subdivisions = segments[e].hidden && o.hiddenDashed ? 1 : 6;
            for (var part = 0; part < subdivisions; part++) {
                var t0 = part / subdivisions;
                var t1 = (part + 1) / subdivisions;
                var a = [
                    trimmedA[0] + (trimmedB[0] - trimmedA[0]) * t0,
                    trimmedA[1] + (trimmedB[1] - trimmedA[1]) * t0,
                    trimmedA[2] + (trimmedB[2] - trimmedA[2]) * t0
                ];
                var b = [
                    trimmedA[0] + (trimmedB[0] - trimmedA[0]) * t1,
                    trimmedA[1] + (trimmedB[1] - trimmedA[1]) * t1,
                    trimmedA[2] + (trimmedB[2] - trimmedA[2]) * t1
                ];
                records.push({
                    type: "line",
                    a: a,
                    b: b,
                    hidden: segments[e].hidden,
                    depth: (viewDepth(a) + viewDepth(b)) / 2
                });
            }
        }

        var wireCornerRatio = o.cornerSphereMM * MM / edge;
        var wireOtherRatio = o.otherSphereMM * MM / edge;
        var sites = atomSites(key, o.cellSpan, wireCornerRatio, wireOtherRatio);
        for (var i = 0; i < sites.length; i++) {
            records.push({
                type: "atom",
                site: sites[i],
                depth: viewDepth(sites[i].p)
            });
        }

        records.sort(function(a, b) {
            var depthDifference = a.depth - b.depth;
            if (Math.abs(depthDifference) > 1e-9) return depthDifference;
            if (
                key === "co2" &&
                a.type === "atom" && b.type === "atom" &&
                a.site.molecule === b.site.molecule
            ) {
                return a.site.moleculeOrder - b.site.moleculeOrder;
            }
            // 같은 깊이에서는 선을 먼저 그려 원자의 외곽이 연결선을 덮는다.
            if (a.type !== b.type) return a.type === "line" ? -1 : 1;
            return 0;
        });

        for (i = 0; i < records.length; i++) {
            if (records[i].type === "line") {
                var start = screenPoint(records[i].a, edge, ox, oy);
                var end = screenPoint(records[i].b, edge, ox, oy);
                var line = parent.pathItems.add();
                line.setEntirePath([start, end]);
                line.filled = false;
                line.stroked = true;
                line.strokeWidth = LINE_WIDTH_PT;
                line.strokeColor = kColor(100);
                if (records[i].hidden && o.hiddenDashed) line.strokeDashes = [3, 2];
            } else {
                var site = records[i].site;
                var center = screenPoint(site.p, edge, ox, oy);
                var isCorner = site.role === 0;
                var dia = (isCorner ? o.cornerSphereMM : o.otherSphereMM) * MM;
                drawSphere(parent, center[0], center[1], dia, o, grads, true, isCorner, false);
            }
        }
    }

    function drawCell(parent, key, mode, o, ox, oy, edge, grads) {
        var g = parent.groupItems.add();
        g.name = "CubicLattice_" + key + "_" + mode;

        if (mode === "cut") {
            drawCutCell(g, key, o, ox, oy, edge, grads);
            return g;
        }

        if (mode === "wire") {
            drawWireCell(g, key, o, ox, oy, edge, grads);
            return g;
        }

        // 카메라 깊이순으로 뒤에서 앞으로 그린다. z값만 비교하면 서로 다른
        // x/y 평면의 FCC 면심 원자가 잘못 포개진다.
        var packCornerRatio = touchRatio(key);
        var packOtherRatio = otherTouchRatio(key);
        var sites = atomSites(key, o.cellSpan, packCornerRatio, packOtherRatio);
        sites.sort(function(p, q) {
            var d = viewDepth(p.p) - viewDepth(q.p);
            if (Math.abs(d) > 1e-9) return d;
            if (key === "co2" && p.molecule === q.molecule) {
                return p.moleculeOrder - q.moleculeOrder;
            }
            var sp = screenPoint(p.p, 1, 0, 0);
            var sq = screenPoint(q.p, 1, 0, 0);
            return (sq[1] - sp[1]) || (sp[0] - sq[0]);
        });
        var holder = g;
        for (var i = 0; i < sites.length; i++) {
            var s = screenPoint(sites[i].p, edge, ox, oy);
            var isCorner = sites[i].role === 0;
            var dia = edge * (isCorner ? packCornerRatio : packOtherRatio);
            drawSphere(
                holder,
                s[0],
                s[1],
                dia,
                o,
                grads,
                mode === "pack",
                isCorner,
                mode === "pack"
            );
        }

        return g;
    }

    function drawCells(o, targetLayer) {
        if (app.documents.length === 0) return [];
        setProjectionAngles(o.angleR, o.angleL, o.depthPercent);
        var doc = app.activeDocument;
        var layer = targetLayer ? targetLayer : doc.activeLayer;
        var grads = getGradients(doc);
        configureGradients(grads, o);
        var edge = o.cellMM * MM;
        var gap = o.gapMM * MM;
        var unitBounds = cellBounds(1, 0, 0, o.cellSpan);
        var cellW = edge * (unitBounds[2] - unitBounds[0]);
        var cellH = edge * (unitBounds[1] - unitBounds[3]);
        var cols = o.lattices.length, rows = o.modes.length;
        var totalW = cols * cellW + (cols - 1) * gap;
        var totalH = rows * cellH + (rows - 1) * gap;
        var vc = doc.activeView.centerPoint;
        var left0 = vc[0] - totalW / 2, top0 = vc[1] + totalH / 2;

        var created = [];
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                // ox/oy는 격자 원점 [0,0,0]의 투영 위치다.
                var ox = left0 + c * (cellW + gap) - edge * unitBounds[0];
                var oy = top0 - r * (cellH + gap) - edge * unitBounds[1];
                created.push(drawCell(layer, o.lattices[c], o.modes[r], o, ox, oy, edge, grads));
            }
        }
        return created;
    }

    // --- 옵션 기억 ---
    var PREF_KEY = "CubicLatticeMaker/settings";
    function collectSettings() {
        var parts = ["v1"], i;
        var lat = "";
        for (i = 0; i < chkLattice.length; i++) lat += chkLattice[i].value ? "1" : "0";
        parts.push(lat);
        var mod = "";
        for (i = 0; i < chkMode.length; i++) mod += chkMode[i].value ? "1" : "0";
        parts.push(mod);
        parts.push(chkLit3D.value ? "1" : "0");
        parts.push(chkOutline.value ? "1" : "0");
        parts.push(chkPreview.value ? "1" : "0");
        parts.push(sldCell.value);
        parts.push(sldCornerSphere.value);
        parts.push(sldGap.value);
        parts.push(chkHiddenDashed.value ? "1" : "0");
        parts.push(radColor.value ? "color" : "gray");
        parts.push(sldOtherSphere.value);
        parts.push(radEightCells.value ? "2" : "1");
        parts.push(sldCornerBrightness.value);
        parts.push(sldOtherBrightness.value);
        parts.push(sldAngleR.value);
        parts.push(sldAngleL.value);
        parts.push(sldDepth.value);
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
        if (p[0] !== "v1" || p.length < 9) return;
        try {
            var i;
            for (i = 0; i < chkLattice.length && i < p[1].length; i++) chkLattice[i].value = (p[1].charAt(i) === "1");
            for (i = 0; i < chkMode.length && i < p[2].length; i++) chkMode[i].value = (p[2].charAt(i) === "1");
            chkLit3D.value = (p[3] === "1");
            chkOutline.value = (p[4] === "1");
            chkPreview.value = (p[5] === "1");
            sldCell.value = parseFloat(p[6]);
            sldCornerSphere.value = parseFloat(p[7]);
            sldGap.value = parseFloat(p[8]);
            // 기존 v1 설정에는 숨김선 항목이 없으므로 기본값(점선)을 유지한다.
            if (p.length >= 10) chkHiddenDashed.value = (p[9] === "1");
            // 기존 설정에는 색상 항목이 없으므로 기본값(컬러)을 유지한다.
            if (p.length >= 11) {
                radColor.value = (p[10] !== "gray");
                radGray.value = !radColor.value;
            }
            // 기존 설정은 구 지름이 하나뿐이므로 두 종류에 같은 값을 적용한다.
            sldOtherSphere.value = p.length >= 12 ? parseFloat(p[11]) : sldCornerSphere.value;
            if (p.length >= 13) {
                radEightCells.value = (p[12] === "2");
                radOneCell.value = !radEightCells.value;
            }
            if (p.length >= 14) sldCornerBrightness.value = parseFloat(p[13]);
            if (p.length >= 15) sldOtherBrightness.value = parseFloat(p[14]);
            if (p.length >= 16) sldAngleR.value = parseFloat(p[15]);
            if (p.length >= 17) sldAngleL.value = parseFloat(p[16]);
            if (p.length >= 18) sldDepth.value = parseFloat(p[17]);
            syncIodineControls();
            syncSliderLabels();
            sldAngleR.syncLabel();
            sldAngleL.syncLabel();
            sldDepth.syncLabel();
            prevCell = sldCell.value;
        } catch (e) {}
    }

    btnGenerate.onClick = function() {
        if (getSelectedLattices().length === 0) { alert("격자 유형을 선택하세요."); return; }
        if (getSelectedModes().length === 0) { alert("표현 방식을 선택하세요."); return; }
        saveSettings();
        win.close(1);
    };

    removeLeftoverPreviews();
    applySettings();
    syncEnabled();

    win.onShow = function() { updatePreview(); };
    updatePreview();

    var result = win.show();

    clearPreview();
    try { app.redraw(); } catch (e) {}
    if (result === 1 && app.documents.length > 0) {
        try { drawWith(app.activeDocument.activeLayer); } catch (e) { alert("생성 오류: " + e); }
        try { app.redraw(); } catch (e) {}
    }
})();
