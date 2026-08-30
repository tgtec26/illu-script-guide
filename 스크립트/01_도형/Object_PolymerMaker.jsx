// PolymerMaker.jsx ─ Illustrator ExtendScript (Standalone UI Version + Grouping + Multi-Path + Save Settings + Extra Options + UI Aligned + Centered Radios)
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
    // ── 1. 사전 확인 ────────────────────────
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }
    
    var doc = app.activeDocument;
    var sel = doc.selection;
    
    // 선택된 객체 중 일반 패스(PathItem)만 배열로 수집
    var selectedPaths = [];
    if (sel && sel.length > 0) {
        for (var i = 0; i < sel.length; i++) {
            if (sel[i].typename === "PathItem") {
                selectedPaths.push(sel[i]);
            }
        }
    }
    
    if (selectedPaths.length === 0) {
        alert("선택 툴(까만 화살표)로 곡선(Path)을 하나 이상 선택한 후 실행하세요.");
        return;
    }

    // ── 1-5. 저장된 환경설정 불러오기 ────────────────────────
    var PREF_PREFIX = "PolymerMaker_";
    var savedShape = app.preferences.getStringPreference(PREF_PREFIX + "Shape") || "circle";
    var savedWidth = app.preferences.getStringPreference(PREF_PREFIX + "Width") || "6";
    var savedGap = app.preferences.getStringPreference(PREF_PREFIX + "Gap") || "1";
    var savedShapeStroke = app.preferences.getStringPreference(PREF_PREFIX + "ShapeStroke") || "1";
    var savedConnStroke = app.preferences.getStringPreference(PREF_PREFIX + "ConnStroke") || "1";
    var savedInnerK = app.preferences.getStringPreference(PREF_PREFIX + "InnerK") || "0";
    // 헥사 코드는 특수한 경우에만 쓰므로 기본은 빈 값(= K값 사용)
    var savedHexColor = app.preferences.getStringPreference(PREF_PREFIX + "InnerHex") || "";
    var savedShade = app.preferences.getStringPreference(PREF_PREFIX + "Shade") === "true";

    var MM = 2.834645; // mm to points conversion
    var SAMPLES = 2000;
    var previewEnabled = true;
    var previewGroups = [];
    var pathMetrics = [];      // 패스는 변하지 않으므로 길이 계산은 한 번만 하고 재사용
    var originalHidden = [];

    // ── 2. ScriptUI 창 구성 ────────────────────────────────────────────
    var win = new Window("dialog", "중합체 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    
    // 단위체 모양 선택 패널 (중앙 정렬 및 일정 간격 배분)
    var panelShape = win.add("panel", undefined, "단위체 모양 선택");
    panelShape.orientation = "row";
    panelShape.alignChildren = ["center", "center"]; // 중앙 정렬
    panelShape.margins = 15;
    panelShape.spacing = 20; // 라디오 버튼 사이의 일정 간격

    var rCircle = panelShape.add("radiobutton", undefined, "원");
    var rRect = panelShape.add("radiobutton", undefined, "둥근 사각형");
    var rHex = panelShape.add("radiobutton", undefined, "육각형");
    var rRandom = panelShape.add("radiobutton", undefined, "랜덤");
    var btnShuffle = panelShape.add("button", undefined, "랜덤 재배치");

    if (savedShape === "rect") rRect.value = true;
    else if (savedShape === "hex") rHex.value = true;
    else if (savedShape === "random") rRandom.value = true;
    else rCircle.value = true;

    // 크기, 간격 및 굵기 패널 (2줄 배치, 좌우 버튼으로 증감)
    var panelSize = win.add("panel", undefined, "크기 및 굵기 설정");
    panelSize.orientation = "column";
    panelSize.alignChildren = ["left", "top"];
    panelSize.margins = 15;
    panelSize.spacing = 10;

    var fieldW = addNumberField(panelSize, "단위체 가로 폭 (mm):", 120, savedWidth, 1, 1, 100);
    var fieldSW = addNumberField(panelSize, "단위체 선 굵기 (pt):", 120, savedShapeStroke, 0.1, 0, 20);
    var fieldG = addNumberField(panelSize, "연결선 길이 (mm):", 120, savedGap, 0.1, 0, 50);
    var fieldCSW = addNumberField(panelSize, "연결선 굵기 (pt):", 120, savedConnStroke, 0.1, 0, 20);

    var inW = fieldW.input;
    var inSW = fieldSW.input;
    var inG = fieldG.input;
    var inCSW = fieldCSW.input;

    // 옵션 및 색상 패널
    var panelOpt = win.add("panel", undefined, "색상 옵션");
    panelOpt.orientation = "column";
    panelOpt.alignChildren = ["left", "center"];
    panelOpt.margins = 15;

    var groupColor = panelOpt.add("group");
    var fieldK = addNumberField(groupColor, "내부 컬러 (K):", 90, savedInnerK, 10, 0, 100);

    var groupHex = groupColor.add("group");
    groupHex.margins = [15, 0, 0, 0];
    groupHex.add("statictext", undefined, "특수 색상 Hex (비우면 K값): #");
    var inHexColor = groupHex.add("edittext", undefined, savedHexColor);
    inHexColor.characters = 8;

    var groupShade = panelOpt.add("group");
    groupShade.alignChildren = ["left", "center"];
    var chkShade = groupShade.add("checkbox", undefined, "내부 컬러 무시하고 단위체 내부 랜덤 음영(그레이스케일) 적용");
    chkShade.value = savedShade;
    var btnShadeShuffle = groupShade.add("button", undefined, "음영 재배치");

    // 하단 버튼
    var groupBtn = win.add("group");
    groupBtn.alignment = ["center", "top"];
    var chkPreview = groupBtn.add("checkbox", undefined, "미리보기");
    chkPreview.value = true;
    // 입력칸에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
    var btnOk = groupBtn.add("button", undefined, "중합체 생성기");
    try { win.defaultElement = null; } catch (defaultError) {}
    var btnCancel = groupBtn.add("button", undefined, "취소", {name: "cancel"});

    rCircle.onClick = updatePreview;
    rRect.onClick = updatePreview;
    rHex.onClick = updatePreview;
    rRandom.onClick = updatePreview;
    btnShuffle.onClick = function () {
        rollShapeSequence();
        updatePreview();
    };
    btnShadeShuffle.onClick = function () {
        rollShadeSequence();
        updatePreview();
    };
    inHexColor.onChanging = updatePreview;
    chkShade.onClick = updatePreview;
    chkPreview.onClick = function () {
        previewEnabled = chkPreview.value;
        updatePreview();
    };

    // 라벨 · 입력칸 · 슬라이더를 한 줄에 배치. 슬라이더를 끌면 step 단위로 값이 바뀐다.
    function addNumberField(parent, labelText, labelWidth, initialValue, step, minimum, maximum) {
        // 폭을 좁히면 둥근 모서리가 맞붙어 버튼이 타원으로 보인다. 사각 버튼이 유지되는 너비.
        var STEP_BUTTON_WIDTH = 34;
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"];
        var label = group.add("statictext", undefined, labelText);
        label.preferredSize.width = labelWidth;
        var initial = parseFloat(initialValue);
        if (isNaN(initial)) initial = minimum;
        var field = {group: group, step: step, minimum: minimum, maximum: maximum, syncing: false};
        initial = clampField(field, initial);
        var input = group.add("edittext", undefined, formatValue(initial));
        input.characters = 5;
        input.justify = "center";
        var down = group.add("button", undefined, "◀");
        down.preferredSize.width = STEP_BUTTON_WIDTH;
        var slider = group.add("slider", undefined, initial, minimum, maximum);
        slider.preferredSize.width = 150;
        var up = group.add("button", undefined, "▶");
        up.preferredSize.width = STEP_BUTTON_WIDTH;
        field.input = input;
        field.slider = slider;
        down.onClick = function () { stepField(field, -1); };
        up.onClick = function () { stepField(field, 1); };

        slider.onChanging = function () {
            if (field.syncing) return;
            var stepped = Math.round(slider.value / field.step) * field.step;
            input.text = formatValue(clampField(field, stepped));
            updatePreview();
        };
        input.onChanging = updatePreview;
        input.onChange = function () {
            var value = parseFloat(input.text);
            if (isNaN(value)) value = field.minimum;
            value = clampField(field, value);
            input.text = formatValue(value);
            field.syncing = true;
            slider.value = value;
            field.syncing = false;
            updatePreview();
        };
        return field;
    }

    // 버튼 한 번 = 1단계. 세밀 조절용.
    function stepField(field, direction) {
        var value = parseFloat(field.input.text);
        if (isNaN(value)) value = field.minimum;
        value = Math.round((value + (field.step * direction)) / field.step) * field.step;
        value = clampField(field, value);
        field.input.text = formatValue(value);
        field.syncing = true;
        field.slider.value = value;
        field.syncing = false;
        updatePreview();
    }

    function clampField(field, value) {
        if (value < field.minimum) value = field.minimum;
        if (field.maximum !== undefined && value > field.maximum) value = field.maximum;
        return value;
    }

    function formatValue(value) {
        if (isNaN(value)) return "0";
        return String(Math.round(value * 100) / 100);
    }

    // ── 3. 수학 및 그리기 로직 함수 ────────────────────────────────────
    function cubicBezier(t, p0, p1, p2, p3) {
        var u = 1 - t;
        return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
    }
    function cubicBezierDeriv(t, p0, p1, p2, p3) {
        var u = 1 - t;
        return 3*(u*u*(p1-p0) + 2*u*t*(p2-p1) + t*t*(p3-p2));
    }
    function getPointOnPath(pathItem, t) {
        var pts    = pathItem.pathPoints;
        var numSeg = pathItem.closed ? pts.length : pts.length - 1;
        if (numSeg <= 0) return { x: pts[0].anchor[0], y: pts[0].anchor[1], angle: 0 };
        var scaled = t * numSeg;
        var segIdx = Math.floor(scaled);
        if (segIdx >= numSeg) segIdx = numSeg - 1;
        var lt = scaled - segIdx;
        var p0 = pts[segIdx];
        var p1 = pts[(segIdx + 1) % pts.length];
        var x  = cubicBezier(lt, p0.anchor[0], p0.rightDirection[0], p1.leftDirection[0], p1.anchor[0]);
        var y  = cubicBezier(lt, p0.anchor[1], p0.rightDirection[1], p1.leftDirection[1], p1.anchor[1]);
        var dx = cubicBezierDeriv(lt, p0.anchor[0], p0.rightDirection[0], p1.leftDirection[0], p1.anchor[0]);
        var dy = cubicBezierDeriv(lt, p0.anchor[1], p0.rightDirection[1], p1.leftDirection[1], p1.anchor[1]);
        return { x: x, y: y, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
    function buildCumLen(pathItem, SAMPLES) {
        var cum = [0], prev = getPointOnPath(pathItem, 0), total = 0;
        for (var i = 1; i <= SAMPLES; i++) {
            var cur = getPointOnPath(pathItem, i / SAMPLES);
            var dx = cur.x - prev.x, dy = cur.y - prev.y;
            total += Math.sqrt(dx*dx + dy*dy);
            cum.push(total);
            prev = cur;
        }
        return { cum: cum, total: total };
    }
    function getTAtLength(cum, SAMPLES, target) {
        var lo = 0, hi = SAMPLES;
        while (lo < hi) {
            var mid = Math.floor((lo + hi) / 2);
            if (cum[mid] < target) lo = mid + 1; else hi = mid;
        }
        if (lo === 0) return 0;
        if (lo > SAMPLES) return 1;
        var p = cum[lo-1], n = cum[lo];
        return (lo - 1 + ((n > p) ? (target - p) / (n - p) : 0)) / SAMPLES;
    }
    function rotatePoint(x, y, cx, cy, angleDeg) {
        var rad = angleDeg * Math.PI / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);
        return [cos*(x-cx) - sin*(y-cy) + cx, sin*(x-cx) + cos*(y-cy) + cy];
    }
    
    // 색상 관련 함수
    var graySteps = [10, 20, 30, 40, 50, 60, 70, 80];
    // 음영·랜덤 모양 순서를 미리 뽑아두고 매번 같은 순서로 쓴다.
    // 미리보기를 갱신할 때마다 새로 섞이면 결과를 판단할 수 없기 때문이다.
    // "랜덤 재배치" 버튼이 이 순서를 새로 뽑는다.
    var randomShapePool = ["circle", "tri", "square", "penta", "hexa"];
    var shadeSequence = [];
    var shapeSequence = [];
    rollShadeSequence();
    rollShapeSequence();

    function rollShadeSequence() {
        shadeSequence = [];
        for (var s = 0; s < 512; s++) {
            shadeSequence.push(graySteps[Math.floor(Math.random() * graySteps.length)]);
        }
    }

    function rollShapeSequence() {
        shapeSequence = [];
        for (var s = 0; s < 512; s++) {
            shapeSequence.push(randomShapePool[Math.floor(Math.random() * randomShapePool.length)]);
        }
    }
    // 회색을 문서 색상 모드에 맞춰 만든다.
    // GrayColor를 쓰면 개체 색 공간이 그레이스케일이 되어, 나중에 색상 피커로
    // 색을 바꿀 때 회색으로 되돌아간다(견본은 정상). 그래서 쓰지 않는다.
    function makeGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 0; cmyk.yellow = 0; cmyk.black = k;
            return cmyk;
        }
        var v = Math.round(255 * (1 - k / 100));
        var rgb = new RGBColor();
        rgb.red = v; rgb.green = v; rgb.blue = v;
        return rgb;
    }

    function getShadeFill(index) {
        return makeGray(shadeSequence[index % shadeSequence.length]);
    }
    // 내부 색: 헥사 코드가 비어 있으면 K값, 값이 있으면 헥사 코드를 쓴다
    function getInnerFill(innerK, hexCode) {
        var hex = String(hexCode).replace(/^\s+|\s+$/g, "").replace(/^#/, "");
        if (hex !== "") return getHexFill(hex);
        return makeGray(innerK);
    }

    function getHexFill(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        if (hex.length !== 6) hex = "FFFFFF"; // 형식이 맞지 않으면 기본 흰색
        var c = new RGBColor();
        c.red = parseInt(hex.substring(0, 2), 16) || 255;
        c.green = parseInt(hex.substring(2, 4), 16) || 255;
        c.blue = parseInt(hex.substring(4, 6), 16) || 255;
        return c;
    }

    // 그리기 함수들
    function drawLine(container, x0, y0, x1, y1, strokeW, strokeColor) {
        var line = container.pathItems.add();
        line.setEntirePath([[x0, y0], [x1, y1]]);
        line.closed      = false;
        line.filled      = false;
        line.stroked     = true;
        line.strokeColor = strokeColor;
        line.strokeWidth = strokeW;
        line.zOrder(ZOrderMethod.SENDTOBACK);
        return line;
    }
    function drawCircle(container, cx, cy, d, strokeW, strokeColor, fillColor) {
        var r = d / 2;
        var item = container.pathItems.ellipse(cy + r, cx - r, d, d);
        item.closed      = true;
        item.filled      = true;
        item.fillColor   = fillColor;
        item.stroked     = true;
        item.strokeColor = strokeColor;
        item.strokeWidth = strokeW;
        return item;
    }
    function drawRotatedHexagon(container, cx, cy, w, h, angleDeg, strokeW, strokeColor, fillColor) {
        var w2 = w / 2, h2 = h / 2;
        var sideW = w2 * 0.53;
        var localPts = [ [-sideW, h2], [sideW, h2], [w2, 0], [sideW, -h2], [-sideW, -h2], [-w2, 0] ];
        var item = container.pathItems.add();
        item.closed      = true;
        item.filled      = true;
        item.fillColor   = fillColor;
        item.stroked     = true;
        item.strokeColor = strokeColor;
        item.strokeWidth = strokeW;
        for (var i = 0; i < localPts.length; i++) {
            var lp = localPts[i];
            var rotated = rotatePoint(cx + lp[0], cy + lp[1], cx, cy, angleDeg);
            var pp = item.pathPoints.add();
            pp.anchor = rotated;
            pp.leftDirection = rotated;
            pp.rightDirection = rotated;
            pp.pointType = PointType.CORNER;
        }
        return item;
    }
    // 정다각형: 외접원 지름 d, 꼭짓점 하나가 진행 방향(+x)을 향하도록 배치 후 경로 각도만큼 회전.
    // 홀수 다각형은 반대쪽이 변의 중심이 되고, 짝수 다각형은 반대쪽도 꼭짓점이 된다.
    // (정사각형은 마름모 방향) 연결선 접점 계산은 getAttachHalfWidth와 짝을 이룬다.
    function drawRegularPolygon(container, cx, cy, d, sides, angleDeg, strokeW, strokeColor, fillColor) {
        var radius = d / 2;
        var startDeg = 0; // 꼭짓점을 진행 방향으로
        var item = container.pathItems.add();
        item.closed      = true;
        item.filled      = true;
        item.fillColor   = fillColor;
        item.stroked     = true;
        item.strokeColor = strokeColor;
        item.strokeWidth = strokeW;
        for (var i = 0; i < sides; i++) {
            var vertexRad = (startDeg + (360 / sides) * i) * Math.PI / 180;
            var local = [cx + radius * Math.cos(vertexRad), cy + radius * Math.sin(vertexRad)];
            var rotated = rotatePoint(local[0], local[1], cx, cy, angleDeg);
            var pp = item.pathPoints.add();
            pp.anchor = rotated;
            pp.leftDirection = rotated;
            pp.rightDirection = rotated;
            pp.pointType = PointType.CORNER;
        }
        return item;
    }

    var K_BEZIER = 0.5522847;
    function drawRoundedRotatedRect(container, cx, cy, w, h, r, angleDeg, strokeW, strokeColor, fillColor) {
        var hw = w / 2, hh = h / 2;
        var localPts = [
            { ax:  hw-r,  ay:  hh,   lx:  hw-r-K_BEZIER*r, ly:  hh,        rx:  hw-r+K_BEZIER*r, ry:  hh       },
            { ax:  hw,    ay:  hh-r, lx:  hw,        ly:  hh-r+K_BEZIER*r,  rx:  hw,       ry:  hh-r-K_BEZIER*r },
            { ax:  hw,    ay: -hh+r, lx:  hw,        ly: -hh+r+K_BEZIER*r,  rx:  hw,       ry: -hh+r-K_BEZIER*r },
            { ax:  hw-r,  ay: -hh,   lx:  hw-r+K_BEZIER*r,  ly: -hh,        rx:  hw-r-K_BEZIER*r, ry: -hh       },
            { ax: -hw+r,  ay: -hh,   lx: -hw+r+K_BEZIER*r,  ly: -hh,        rx: -hw+r-K_BEZIER*r, ry: -hh       },
            { ax: -hw,    ay: -hh+r, lx: -hw,        ly: -hh+r-K_BEZIER*r,  rx: -hw,       ry: -hh+r+K_BEZIER*r },
            { ax: -hw,    ay:  hh-r, lx: -hw,        ly:  hh-r-K_BEZIER*r,  rx: -hw,       ry:  hh-r+K_BEZIER*r },
            { ax: -hw+r,  ay:  hh,   lx: -hw+r-K_BEZIER*r,  ly:  hh,        rx: -hw+r+K_BEZIER*r, ry:  hh       }
        ];
        var item = container.pathItems.add();
        item.closed      = true;
        item.filled      = true;
        item.fillColor   = fillColor;
        item.stroked     = true;
        item.strokeColor = strokeColor;
        item.strokeWidth = strokeW;
        for (var i = 0; i < localPts.length; i++) {
            var lp     = localPts[i];
            var anchor = rotatePoint(cx + lp.ax, cy + lp.ay, cx, cy, angleDeg);
            var left   = rotatePoint(cx + lp.lx, cy + lp.ly, cx, cy, angleDeg);
            var right  = rotatePoint(cx + lp.rx, cy + lp.ry, cx, cy, angleDeg);
            var pp            = item.pathPoints.add();
            pp.anchor         = anchor;
            pp.leftDirection  = left;
            pp.rightDirection = right;
            pp.pointType      = PointType.SMOOTH;
        }
        return item;
    }

    // ── 4. 옵션 읽기 · 생성 · 미리보기 ────────────────────────────────
    function readOptions(showAlert) {
        var wVal = parseFloat(inW.text);
        var gVal = parseFloat(inG.text);
        var swVal = parseFloat(inSW.text);
        var cswVal = parseFloat(inCSW.text);

        if (isNaN(wVal) || isNaN(gVal) || wVal <= 0 || gVal < 0 || isNaN(swVal) || isNaN(cswVal)) {
            if (showAlert) alert("올바른 숫자(0 이상)를 입력해주세요.");
            return null;
        }

        var shapeType = "circle";
        if (rRect.value) shapeType = "rect";
        if (rHex.value)  shapeType = "hex";
        if (rRandom.value) shapeType = "random";

        var kVal = parseFloat(fieldK.input.text);
        if (isNaN(kVal) || kVal < 0 || kVal > 100) {
            if (showAlert) alert("내부 컬러 K값은 0부터 100 사이로 입력해주세요.");
            return null;
        }

        return {
            shapeType: shapeType,
            width: wVal,
            gap: gVal,
            shapeStroke: swVal,
            connStroke: cswVal,
            innerK: kVal,
            hexCode: inHexColor.text,
            useShading: chkShade.value
        };
    }

    function saveOptions(options) {
        app.preferences.setStringPreference(PREF_PREFIX + "Shape", options.shapeType);
        app.preferences.setStringPreference(PREF_PREFIX + "Width", inW.text);
        app.preferences.setStringPreference(PREF_PREFIX + "Gap", inG.text);
        app.preferences.setStringPreference(PREF_PREFIX + "ShapeStroke", inSW.text);
        app.preferences.setStringPreference(PREF_PREFIX + "ConnStroke", inCSW.text);
        app.preferences.setStringPreference(PREF_PREFIX + "InnerK", fieldK.input.text);
        app.preferences.setStringPreference(PREF_PREFIX + "InnerHex", options.hexCode);
        app.preferences.setStringPreference(PREF_PREFIX + "Shade", options.useShading ? "true" : "false");
    }

    // 연결선이 도형 외곽에 닿는 거리(중심 기준).
    // side가 "front"면 진행 방향(꼭짓점), "back"이면 반대쪽.
    // 홀수 다각형(삼각형·오각형)의 반대쪽은 변의 중심이므로 내접원 반지름을 쓴다.
    // 랜덤 모드에서는 원이 다각형보다 커 보여 90%로 줄인다 (단일 원 모드는 그대로)
    var RANDOM_CIRCLE_SCALE = 0.9;
    function getUnitWidth(modeShape, unitShape, shapeWidth) {
        if (modeShape === "random" && unitShape === "circle") {
            return shapeWidth * RANDOM_CIRCLE_SCALE;
        }
        return shapeWidth;
    }

    function getAttachHalfWidth(shape, shapeWidth, side) {
        var radius = shapeWidth / 2;
        if (side === "back") {
            if (shape === "tri") return radius * Math.cos(Math.PI / 3);
            if (shape === "penta") return radius * Math.cos(Math.PI / 5);
        }
        return radius;
    }

    function getPathMetrics(index) {
        if (!pathMetrics[index]) {
            pathMetrics[index] = buildCumLen(selectedPaths[index], SAMPLES);
        }
        return pathMetrics[index];
    }

    // 중합체를 그려서 만든 그룹들을 돌려준다. 원본 패스는 건드리지 않는다.
    function buildPolymers(options) {
        var SHAPE_W  = options.width * MM;
        var CONN_LEN = options.gap * MM;
        var UNIT     = SHAPE_W + CONN_LEN;
        var FIRST_OFFSET = SHAPE_W / 2;
        var SW       = options.shapeStroke; // 외곽선 굵기는 pt 단위
        var CONN_SW  = options.connStroke;  // 연결선 굵기는 pt 단위

        var layer = doc.activeLayer;

        // 공통 선 색상 (검은색) — 문서 색상 모드에 맞춰 만든다
        var black = makeGray(100);

        // 선택된 커스텀 채우기 색상 준비
        var customFillColor = getInnerFill(options.innerK, options.hexCode);

        var groups = [];
        var skippedCount = 0;
        var shadeIndex = 0;

        for (var p = 0; p < selectedPaths.length; p++) {
            var path = selectedPaths[p];

            var polymerGroup = layer.groupItems.add();
            polymerGroup.name = options.shapeType + " 중합체";

            var metrics = getPathMetrics(p);
            var cum     = metrics.cum;
            var total   = metrics.total;

            var n = Math.floor((total - SHAPE_W + CONN_LEN) / UNIT) + 1;
            if (n < 1) {
                polymerGroup.remove();
                skippedCount++;
                continue;
            }

            for (var i = 0; i < n; i++) {
                var centerLen = FIRST_OFFSET + UNIT * i;
                if (centerLen + SHAPE_W/2 > total) break;

                var tC  = getTAtLength(cum, SAMPLES, centerLen);
                var ptC = getPointOnPath(path, tC);
                var ang = ptC.angle;

                // 랜덤 음영을 선택했으면 미리 뽑아둔 음영, 아니면 지정한 헥사 코드 색상 사용
                var currentFill = options.useShading ? getShadeFill(shadeIndex) : customFillColor;

                var unitShape = options.shapeType;
                if (unitShape === "random") {
                    unitShape = shapeSequence[shadeIndex % shapeSequence.length];
                }
                shadeIndex++;

                var unitW = getUnitWidth(options.shapeType, unitShape, SHAPE_W);

                if (unitShape === "circle") {
                    drawCircle(polymerGroup, ptC.x, ptC.y, unitW, SW, black, currentFill);
                } else if (unitShape === "hex") {
                    var HEX_H = SHAPE_W / 1.5;
                    drawRotatedHexagon(polymerGroup, ptC.x, ptC.y, SHAPE_W, HEX_H, ang, SW, black, currentFill);
                } else if (unitShape === "rect") {
                    var RECT_H = SHAPE_W * (2.0/3.0);
                    var RECT_R = SHAPE_W * 0.11;
                    drawRoundedRotatedRect(polymerGroup, ptC.x, ptC.y, SHAPE_W, RECT_H, RECT_R, ang, SW, black, currentFill);
                } else if (unitShape === "tri") {
                    drawRegularPolygon(polymerGroup, ptC.x, ptC.y, SHAPE_W, 3, ang, SW, black, currentFill);
                } else if (unitShape === "square") {
                    drawRegularPolygon(polymerGroup, ptC.x, ptC.y, SHAPE_W, 4, ang, SW, black, currentFill);
                } else if (unitShape === "penta") {
                    drawRegularPolygon(polymerGroup, ptC.x, ptC.y, SHAPE_W, 5, ang, SW, black, currentFill);
                } else if (unitShape === "hexa") {
                    drawRegularPolygon(polymerGroup, ptC.x, ptC.y, SHAPE_W, 6, ang, SW, black, currentFill);
                }

                // 연결선 그리기: 도형마다 외곽 접점 거리가 다르므로 개별 계산
                if (CONN_LEN > 0) {
                    var frontHalf = getAttachHalfWidth(unitShape, unitW, "front");
                    var rightVertex = rotatePoint(ptC.x + frontHalf, ptC.y, ptC.x, ptC.y, ang);
                    var nextCenterLen = centerLen + UNIT;

                    if (nextCenterLen + SHAPE_W/2 <= total) {
                        var nextShape = options.shapeType;
                        if (nextShape === "random") {
                            nextShape = shapeSequence[shadeIndex % shapeSequence.length];
                        }
                        var backHalf = getAttachHalfWidth(nextShape, getUnitWidth(options.shapeType, nextShape, SHAPE_W), "back");

                        var tN          = getTAtLength(cum, SAMPLES, nextCenterLen);
                        var ptN         = getPointOnPath(path, tN);
                        var leftVertexN = rotatePoint(ptN.x - backHalf, ptN.y, ptN.x, ptN.y, ptN.angle);

                        drawLine(polymerGroup, rightVertex[0], rightVertex[1], leftVertexN[0], leftVertexN[1], CONN_SW, black);
                    }
                }
            }

            groups.push(polymerGroup);
        }

        return {groups: groups, skipped: skippedCount};
    }

    function updatePreview() {
        clearPreview();
        if (!previewEnabled) {
            app.redraw();
            return;
        }

        var options = readOptions(false);
        if (options !== null) {
            previewGroups = buildPolymers(options).groups;
        }
        app.redraw();
    }

    function clearPreview() {
        for (var i = previewGroups.length - 1; i >= 0; i--) {
            try { previewGroups[i].remove(); } catch (e) {}
        }
        previewGroups = [];
    }

    function restoreOriginals() {
        for (var i = 0; i < selectedPaths.length; i++) {
            try {
                selectedPaths[i].hidden = originalHidden[i];
                selectedPaths[i].selected = true;
            } catch (e) {}
        }
    }

    var confirmedOptions = null;
    btnOk.onClick = function () {
        confirmedOptions = readOptions(true);
        if (confirmedOptions === null) return;
        win.close(1);
    };

    // 미리보기 동안에는 원본 패스를 숨겨서 최종 결과와 같은 화면을 보여준다
    for (var h = 0; h < selectedPaths.length; h++) {
        originalHidden.push(selectedPaths[h].hidden);
        try { selectedPaths[h].hidden = true; } catch (e) {}
    }
    doc.selection = null;
    updatePreview();

    var result = win.show();
    clearPreview();

    if (result === 1 && confirmedOptions !== null) {
        saveOptions(confirmedOptions);
        var built = buildPolymers(confirmedOptions);
        for (var r = 0; r < selectedPaths.length; r++) {
            try { selectedPaths[r].remove(); } catch (e) {}
        }
        if (built.skipped > 0) {
            alert(built.skipped + "개의 패스는 길이가 너무 짧아 중합체를 생성하지 못했습니다.");
        }
    } else {
        restoreOriginals();
    }
    app.redraw();
}());