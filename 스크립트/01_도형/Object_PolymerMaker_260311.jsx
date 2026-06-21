// PolymerMaker.jsx ─ Illustrator ExtendScript (Standalone UI Version + Grouping + Multi-Path + Save Settings + Extra Options + UI Aligned + Centered Radios)
#target illustrator

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
    var savedHexColor = app.preferences.getStringPreference(PREF_PREFIX + "HexColor") || "FFFFFF";
    var savedShade = app.preferences.getStringPreference(PREF_PREFIX + "Shade") === "true";

    // ── 2. ScriptUI 창 구성 ────────────────────────────────────────────
    var win = new Window("dialog", "중합체 생성기");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    
    // 단위체 모양 선택 패널 (중앙 정렬 및 일정 간격 배분)
    var panelShape = win.add("panel", undefined, "단위체 모양 선택");
    panelShape.orientation = "row";
    panelShape.alignChildren = ["center", "center"]; // 중앙 정렬
    panelShape.margins = 15;
    panelShape.spacing = 60; // 라디오 버튼 사이의 일정 간격
    
    var rCircle = panelShape.add("radiobutton", undefined, "원");
    var rRect = panelShape.add("radiobutton", undefined, "둥근 사각형");
    var rHex = panelShape.add("radiobutton", undefined, "육각형");
    
    if (savedShape === "rect") rRect.value = true;
    else if (savedShape === "hex") rHex.value = true;
    else rCircle.value = true;

    // 크기, 간격 및 굵기 패널 (2줄 배치)
    var panelSize = win.add("panel", undefined, "크기 및 굵기 설정");
    panelSize.orientation = "column";
    panelSize.alignChildren = ["left", "top"];
    panelSize.margins = 15;
    panelSize.spacing = 10;
    
    // 첫 번째 줄: 단위체 가로 폭 / 단위체 선 굵기
    var row1 = panelSize.add("group");
    row1.orientation = "row";
    row1.alignChildren = ["left", "center"];
    
    var groupW = row1.add("group");
    var stW = groupW.add("statictext", undefined, "단위체 가로 폭 (mm):");
    stW.preferredSize.width = 120; // 텍스트 길이 고정으로 열 맞춤
    var inW = groupW.add("edittext", undefined, savedWidth);
    inW.characters = 5;
    
    var groupSW = row1.add("group");
    groupSW.margins = [15, 0, 0, 0]; // 왼쪽 여백 추가
    var stSW = groupSW.add("statictext", undefined, "단위체 선 굵기 (pt):");
    stSW.preferredSize.width = 110;
    var inSW = groupSW.add("edittext", undefined, savedShapeStroke);
    inSW.characters = 5;

    // 두 번째 줄: 연결선 길이 / 연결선 굵기
    var row2 = panelSize.add("group");
    row2.orientation = "row";
    row2.alignChildren = ["left", "center"];
    
    var groupG = row2.add("group");
    var stG = groupG.add("statictext", undefined, "연결선 길이 (mm):");
    stG.preferredSize.width = 120;
    var inG = groupG.add("edittext", undefined, savedGap);
    inG.characters = 5;

    var groupCSW = row2.add("group");
    groupCSW.margins = [15, 0, 0, 0];
    var stCSW = groupCSW.add("statictext", undefined, "연결선 굵기 (pt):");
    stCSW.preferredSize.width = 110;
    var inCSW = groupCSW.add("edittext", undefined, savedConnStroke);
    inCSW.characters = 5;
    
    // 옵션 및 색상 패널
    var panelOpt = win.add("panel", undefined, "색상 옵션");
    panelOpt.orientation = "column";
    panelOpt.alignChildren = ["left", "center"];
    panelOpt.margins = 15;

    var groupColor = panelOpt.add("group");
    groupColor.add("statictext", undefined, "내부 컬러 (Hex 코드): #");
    var inHexColor = groupColor.add("edittext", undefined, savedHexColor);
    inHexColor.characters = 8;

    var chkShade = panelOpt.add("checkbox", undefined, "내부 컬러 무시하고 단위체 내부 랜덤 음영(그레이스케일) 적용");
    chkShade.value = savedShade;

    // 하단 버튼
    var groupBtn = win.add("group");
    groupBtn.alignment = ["center", "top"];
    var btnOk = groupBtn.add("button", undefined, "중합체 생성기", {name: "ok"});
    var btnCancel = groupBtn.add("button", undefined, "취소", {name: "cancel"});

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
    function getRandomFill() {
        var k = graySteps[Math.floor(Math.random() * graySteps.length)];
        var c = new CMYKColor();
        c.cyan = 0; c.magenta = 0; c.yellow = 0; c.black = k;
        return c;
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

    // ── 4. 생성 버튼 실행 이벤트 ──────────────────────────────────────
    btnOk.onClick = function () {
        var wVal = parseFloat(inW.text);
        var gVal = parseFloat(inG.text);
        var swVal = parseFloat(inSW.text);
        var cswVal = parseFloat(inCSW.text);
        var hexCode = inHexColor.text;

        if (isNaN(wVal) || isNaN(gVal) || wVal <= 0 || gVal < 0 || isNaN(swVal) || isNaN(cswVal)) {
            alert("올바른 숫자(0 이상)를 입력해주세요.");
            return;
        }

        var shapeType = "circle";
        if (rRect.value) shapeType = "rect";
        if (rHex.value)  shapeType = "hex";
        var useShading = chkShade.value;

        // ── 4-1. 현재 설정 저장 ──
        app.preferences.setStringPreference(PREF_PREFIX + "Shape", shapeType);
        app.preferences.setStringPreference(PREF_PREFIX + "Width", inW.text);
        app.preferences.setStringPreference(PREF_PREFIX + "Gap", inG.text);
        app.preferences.setStringPreference(PREF_PREFIX + "ShapeStroke", inSW.text);
        app.preferences.setStringPreference(PREF_PREFIX + "ConnStroke", inCSW.text);
        app.preferences.setStringPreference(PREF_PREFIX + "HexColor", hexCode);
        app.preferences.setStringPreference(PREF_PREFIX + "Shade", useShading ? "true" : "false");

        var MM       = 2.834645; // mm to points conversion
        var SHAPE_W  = wVal * MM;
        var CONN_LEN = gVal * MM;
        var UNIT     = SHAPE_W + CONN_LEN;
        var FIRST_OFFSET = SHAPE_W / 2;
        var SW       = swVal; // 외곽선 굵기는 pt 단위
        var CONN_SW  = cswVal; // 연결선 굵기는 pt 단위
        
        var layer    = doc.activeLayer;
        var SAMPLES  = 2000;
        
        // 공통 선 색상 (검은색)
        var black = new CMYKColor();
        black.cyan = 0; black.magenta = 0; black.yellow = 0; black.black = 100;

        // 선택된 커스텀 채우기 색상 준비
        var customFillColor = getHexFill(hexCode);

        var skippedCount = 0;

        // ── 4-2. 선택된 모든 패스를 순회 ──
        for (var p = 0; p < selectedPaths.length; p++) {
            var path = selectedPaths[p];
            
            var polymerGroup = layer.groupItems.add();
            polymerGroup.name = shapeType + " 중합체";
            
            var result  = buildCumLen(path, SAMPLES);
            var cum     = result.cum;
            var total   = result.total;
            
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
                
                // 랜덤 음영을 선택했으면 랜덤 색, 아니면 지정한 헥사 코드 색상 사용
                var currentFill = useShading ? getRandomFill() : customFillColor;
                
                if (shapeType === "circle") {
                    drawCircle(polymerGroup, ptC.x, ptC.y, SHAPE_W, SW, black, currentFill);
                } else if (shapeType === "hex") {
                    var HEX_H = SHAPE_W / 1.5;
                    drawRotatedHexagon(polymerGroup, ptC.x, ptC.y, SHAPE_W, HEX_H, ang, SW, black, currentFill);
                } else if (shapeType === "rect") {
                    var RECT_H = SHAPE_W * (2.0/3.0);
                    var RECT_R = SHAPE_W * 0.11;      
                    drawRoundedRotatedRect(polymerGroup, ptC.x, ptC.y, SHAPE_W, RECT_H, RECT_R, ang, SW, black, currentFill);
                }
                
                // 연결선 그리기
                if (CONN_LEN > 0) {
                    var rightVertex = rotatePoint(ptC.x + SHAPE_W/2, ptC.y, ptC.x, ptC.y, ang);
                    var nextCenterLen = centerLen + UNIT;
                    
                    if (nextCenterLen + SHAPE_W/2 <= total) {
                        var tN          = getTAtLength(cum, SAMPLES, nextCenterLen);
                        var ptN         = getPointOnPath(path, tN);
                        var leftVertexN = rotatePoint(ptN.x - SHAPE_W/2, ptN.y, ptN.x, ptN.y, ptN.angle);
                        
                        drawLine(polymerGroup, rightVertex[0], rightVertex[1], leftVertexN[0], leftVertexN[1], CONN_SW, black);
                    }
                }
            }
            // 작업 완료된 원본 패스 삭제
            path.remove();
        }panelShape.spacing

        if (skippedCount > 0) {
            alert(skippedCount + "개의 패스는 길이가 너무 짧아 중합체를 생성하지 못했습니다.");
        }

        win.close();
    };
    win.show();
}());