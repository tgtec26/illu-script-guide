// 역학 장치.jsx
// 입력창 사이 탭 이동 (00_세팅/ui_tab_helper.jsxinc). 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 파선 양 끝 정렬 (01_도형/Object_setdash_align_helper.jsxinc): 파선 도형은 항상 '파선을 모퉁이와 패스 끝에 정렬하고 길이를 조정하여 맞추기'를 켠다. 파일이 없어도 스크립트는 동작한다
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/Object_setdash_align_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 10_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 역학 장치: 물리Ⅰ 시험지의 도르래·빗면·수평면 장치 그림을 장면별 탭으로 그린다. 선택 없이 화면 가운데에 만든다.
//   수평면 도르래 탭: 수평면 위 물체가 실로 도르래를 지나 매달린 추와 이어진 장면. 이전 위치(점선 물체)와 속도 화살표, 두 지점 사이 거리 표시를 고른다.
//   빗면 도르래 탭: 빗면 위 물체가 빗면과 나란한 실로 꼭대기 도르래를 지나 매달린 추와 이어진 장면. 빗면 각도(θ) 표시를 고른다.
// 선 두께는 테이블·바닥 0.8pt, 물체·도르래 겉 0.4pt, 실 0.4pt, 보조선·파선·도르래 안쪽 0.3pt이고 '선 두께' 패널에서 고친다. 파선은 2-1이다.
// 글자는 한글 Spoqa, 영문·숫자 GSMediumB1, 변수 GSMediItaC1, GSMediumB1에 없는 기호(θ)는 HancomEQN이다.

(function() {
    if (app.documents.length === 0) { alert("문서를 열어주세요."); return; }

    var doc = app.activeDocument;
    var FORM_MM = 2.834645669;
    var FORM_KOR_FONT = formFindFont(["SpoqaHanSansNeo-Regular", "GSMediumB1"]);
    var FORM_ENG_FONT = formFindFont(["GSMediumB1", "SpoqaHanSansNeo-Regular"]);
    var FORM_ITALIC_FONT = formFindFont(["GSMediItaC1", "GSMediumB1"]);
    var FORM_MATH_FONT = formFindFont(["HancomEQN", "HancomEQN-Regular", "HancomEQNRegular", "GSMediumB1"]);
    var TAB_PREF_KEY = "MechanicsDevice/tab";
    var NAME_GAP_MM = 1;   // 물체·추 이름과 도형 사이 간격(글자 윤곽 기준)
    var ARROW_GAP_MM = 1;  // 속도 화살표와 물체 사이, 화살표와 속도 글자 사이 간격(화살촉 가장자리 기준)
    var ARROW_HEAD_MM = 1.4, ARROW_HALF_MM = 1.4 * 0.35;   // 속도 화살촉 길이와 반폭
    var GHOST_DASH = [2, 1];   // 파선 2-1 (선 2pt, 간격 1pt)
    // 화살촉 모양: 일러스트레이터 화살촉을 선 두께 1pt·100%로 확장해 잰 외곽. 끝이 원점, 뒤쪽이 +y. length는 끝에서 가장 먼 점, lineEnd는 선이 머리 속에서 끝나는 끝에서의 거리
    var HEAD_CATALOG = [
        {length: 8.6, lineEnd: 7.7, poly: [[0, 0], [4.95, 8.6], [-4.95, 8.6]]},
        {length: 12.1, lineEnd: 9, poly: [[0, 0], [1.4, 6.1], [3.7, 12], [0, 9.9], [-3.7, 12], [-1.4, 6.1]]}
    ];
    var HEAD_HARPOON = 1;   // 작살형(평가원식). 화살촉 목록의 1번

    runFormHost("역학 장치", [makeHorizontalPulleyEngine(), makeInclinePulleyEngine()], TAB_PREF_KEY);

    // ==== 수평면 도르래 탭 ====
    function makeHorizontalPulleyEngine() {
        return makeFormEngine({
            label: "수평면 도르래", name: "HorizontalPulley", prefKey: "MechanicsDevice/horizontalPulley",
            controls: [
                {panel: "물체와 추"},
                {key: "blockText", label: "물체 글자", text: true, value: "4 kg"},
                {key: "blockName", label: "물체 이름", text: true, value: "나무도막"},
                {key: "blockW", label: "물체 너비", unit: "mm", min: 6, max: 30, step: 0.5, value: 13},
                {key: "blockH", label: "물체 높이", unit: "mm", min: 5, max: 25, step: 0.5, value: 15},
                {key: "weightText", label: "추 글자", text: true, value: "1 kg"},
                {key: "weightName", label: "추 이름", text: true, value: "추"},
                {key: "weightW", label: "추 너비", unit: "mm", min: 4, max: 20, step: 0.5, value: 9},
                {key: "weightH", label: "추 높이", unit: "mm", min: 4, max: 20, step: 0.5, value: 8},
                {panel: "테이블·실·도르래"},
                {key: "tableEdge", check: "테이블 세로선", value: true},
                {key: "pulleyArm", check: "도르래 받침대", value: true},
                {key: "ropeLen", label: "물체~도르래", unit: "mm", min: 8, max: 80, step: 0.5, value: 28},
                {key: "cornerDist", label: "모서리~도르래 가운데", unit: "mm", min: -5, max: 15, step: 0.1, value: 3.8},
                {key: "armLen", label: "받침대 길이", unit: "mm", min: 3, max: 25, step: 0.5, value: 9},
                {key: "boltDepth", label: "볼트 깊이", unit: "mm", min: 0, max: 8, step: 0.1, value: 2.2},
                {key: "tableLeft", label: "바닥 왼쪽 여유", unit: "mm", min: 0, max: 40, step: 0.5, value: 8},
                {key: "pulleyR", label: "도르래 반지름", unit: "mm", min: 1.5, max: 6, step: 0.1, value: 3.6},
                {key: "drop", label: "추까지 길이", unit: "mm", min: 8, max: 90, step: 0.5, value: 42},
                {panel: "이동 (점선·거리)"},
                {key: "shift", label: "이동 거리", unit: "mm", min: 4, max: 60, step: 0.5, value: 24},
                {key: "ghostBlock", check: "점선 물체", value: true},
                {key: "ghostWeight", check: "점선 추", value: true},
                {key: "ghostSpeed", label: "물체 속력", text: true, value: "2 m/s"},
                {key: "weightSpeed", label: "추 속력", text: true, value: "2 m/s"},
                {key: "dim", check: "거리 표시", value: true},
                {key: "dimText", label: "거리", text: true, value: "1 m"},
                {key: "pName", label: "왼쪽 지점", text: true, value: "P"},
                {key: "qName", label: "오른쪽 지점", text: true, value: "Q"},
                {key: "dimDrop", label: "표시선 깊이", unit: "mm", min: 2, max: 12, step: 0.5, value: 4},
                {panel: "글자"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            draw: drawHorizontalPulley
        });
    }

    // 좌표는 pt(y 위쪽 +), 테이블 윗면이 y=0, 물체 왼쪽 끝이 x=0. 실은 물체 옆면 가운데에서 수평으로 나가 도르래 위를 지나 오른쪽에서 수직으로 내려온다.
    // 도르래는 받침대로 테이블 모서리(받침대 끝)에 고정한다. 이동 거리(shift)만큼 물체는 왼쪽(점선)에서 오른쪽으로, 추는 위(점선)에서 아래로 왔다 —
    // 실이 늘어나지 않으므로 물체가 간 거리와 추가 간 거리는 늘 같다.
    function drawHorizontalPulley(t, o) {
        var m = t.mm, wBody = o.wBody, wObj = o.wObj, wRope = o.wRope, wGuide = o.wGuide, size = o.font;
        var bw = o.blockW * m, bh = o.blockH * m, R = o.pulleyR * m, shift = o.shift * m;
        var attachY = bh / 2;
        var cx = bw + o.ropeLen * m, cy = attachY - R;
        // 도르래는 받침대(길쭉한 둥근 막대)로 테이블 안쪽에 볼트로 고정한다. 받침대 양 끝은 같은 볼트(도르래 가운데, 테이블 안)이고,
        // 테이블 쪽 볼트는 윗면 아래 boltDepth, 모서리보다 안쪽(왼쪽)에 있다. 모서리는 도르래 가운데에서 cornerDist만큼 왼쪽, armLen은 볼트~도르래 가운데 길이
        var boltY = -o.boltDepth * m, dyBolt = cy - boltY;
        var armLen = Math.max(o.armLen * m, dyBolt + 0.01), armDx = Math.sqrt(armLen * armLen - dyBolt * dyBolt);
        var mountX = cx - armDx;                                     // 볼트 x
        var edgeX = cx - o.cornerDist * m;                           // 테이블 모서리 x
        var wx = cx + R, wTop = cy - o.drop * m, ww = o.weightW * m, wh = o.weightH * m;
        var ghostLeft = -shift, ghostRight = bw - shift;             // 이전 위치의 물체
        // 테이블 윗면과 모서리의 세로선
        var left = Math.min(0, o.ghostBlock ? ghostLeft : 0) - o.tableLeft * m;
        t.line([left, 0], [edgeX, 0], wBody);
        if (o.tableEdge) t.line([edgeX, 0], [edgeX, wTop - wh - 4 * m], wBody);
        // 이전 위치의 물체: 파선 상자와 속도 화살표
        if (o.ghostBlock) {
            t.dashRect(ghostLeft, bh, ghostRight, 0, wGuide);
            // 속도 화살표는 이전 위치 물체의 가운데 위에, 물체에서 1mm(화살촉 가장자리 기준) 띄우고 글자는 화살표에서 1mm 위에 둔다
            var ay = bh + (ARROW_GAP_MM + ARROW_HALF_MM) * m, gcx = (ghostLeft + ghostRight) / 2, halfArrow = Math.min(3.5 * m, bw * 0.45);
            t.arrow([gcx - halfArrow, ay], [gcx + halfArrow, ay], wRope, 100, ARROW_HEAD_MM * m);
            if (o.ghostSpeed !== "") t.textAt(o.ghostSpeed, gcx, ay + (ARROW_HALF_MM + ARROW_GAP_MM) * m, size, "above");
        }
        // 물체
        t.rect(0, bh, bw, 0, 0, 100, wObj);
        if (o.blockText !== "") t.text(o.blockText, bw / 2, bh / 2, size, "center");
        if (o.blockName !== "") t.textAt(o.blockName, bw / 2, bh + NAME_GAP_MM * m, size, "above");
        // 도르래: 겉 테두리 wObj, 안쪽 원판·받침대·축 점 wGuide
        t.pulley(cx, cy, R, o.pulleyArm ? [mountX, boltY] : null, wObj, wGuide);
        // 실: 물체 가운데 → 도르래 위 → 오른쪽 수직
        t.line([bw, attachY], [cx, cy + R], wRope);
        t.arc(cx, cy, R, 0, Math.PI / 2, wRope);
        t.line([wx, cy], [wx, wTop], wRope);
        // 추: 점선은 shift만큼 위
        if (o.ghostWeight) {
            var gTop = wTop + shift;
            t.dashRect(wx - ww / 2, gTop, wx + ww / 2, gTop - wh, wGuide);
            // 속도 화살표는 점선 추의 오른쪽, 추에서 1mm(화살촉 가장자리 기준) 띄우고 글자는 화살표에서 1mm 오른쪽에 둔다
            var gmid = gTop - wh / 2, arrowX = wx + ww / 2 + (ARROW_GAP_MM + ARROW_HALF_MM) * m;
            t.arrow([arrowX, gmid + 3.5 * m], [arrowX, gmid - 3.5 * m], wRope, 100, ARROW_HEAD_MM * m);
            if (o.weightSpeed !== "") t.textAt(o.weightSpeed, arrowX + (ARROW_HALF_MM + ARROW_GAP_MM) * m, gmid, size, "right");
        }
        t.rect(wx - ww / 2, wTop, wx + ww / 2, wTop - wh, 0, 100, wObj);
        if (o.weightText !== "") t.text(o.weightText, wx, wTop - wh / 2, size, "center");
        if (o.weightName !== "") t.textAt(o.weightName, wx + ww / 2 + NAME_GAP_MM * m, wTop - wh / 2, size, "right");
        // 거리 표시: 이전 위치 오른쪽 끝(P)에서 지금 오른쪽 끝(Q)까지 = 이동 거리. P·Q의 보조선은 파선, 화살촉은 평가원 작살형
        if (o.dim) {
            var px = ghostRight, qx = bw;
            var dy = -o.dimDrop * m, tick = (o.dimDrop + 1.5) * m, head = 1.3 * m;
            t.dashLine([px, 0], [px, -tick], wGuide);
            t.dashLine([qx, 0], [qx, -tick], wGuide);
            var textW = o.dimText === "" ? 0 : (o.dimText.length * 0.55 + 0.6) * size;
            var mid = (px + qx) / 2;
            if (textW > 0 && textW < qx - px - 4 * m) {
                t.headArrow([mid - textW / 2, dy], [px, dy], wGuide, 100, head, HEAD_HARPOON);
                t.headArrow([mid + textW / 2, dy], [qx, dy], wGuide, 100, head, HEAD_HARPOON);
                t.text(o.dimText, mid, dy, size, "center");
            } else {
                t.headArrow([mid, dy], [px, dy], wGuide, 100, head, HEAD_HARPOON);
                t.headArrow([mid, dy], [qx, dy], wGuide, 100, head, HEAD_HARPOON);
            }
            var ny = -(o.dimDrop + 1.5) * m - 2.6 * m;
            // 글자가 선 사이에 안 들어가면 P·Q 이름 아래에 쓴다
            if (textW > 0 && !(textW < qx - px - 4 * m)) t.text(o.dimText, mid, ny - 3.6 * m, size, "center");
            if (o.pName !== "") t.text(o.pName, px, ny, size, "center");
            if (o.qName !== "") t.text(o.qName, qx, ny, size, "center");
        }
    }

    // ==== 빗면 도르래 탭 ====
    function makeInclinePulleyEngine() {
        return makeFormEngine({
            label: "빗면 도르래", name: "InclinePulley", prefKey: "MechanicsDevice/inclinePulley",
            controls: [
                {panel: "물체와 추"},
                {key: "blockText", label: "물체 글자", text: true, value: "4 kg"},
                {key: "blockName", label: "물체 이름", text: true, value: "나무도막"},
                {key: "blockW", label: "물체 너비", unit: "mm", min: 6, max: 30, step: 0.5, value: 13},
                {key: "blockH", label: "물체 높이", unit: "mm", min: 5, max: 25, step: 0.5, value: 15},
                {key: "weightText", label: "추 글자", text: true, value: "1 kg"},
                {key: "weightName", label: "추 이름", text: true, value: "추"},
                {key: "weightW", label: "추 너비", unit: "mm", min: 4, max: 20, step: 0.5, value: 9},
                {key: "weightH", label: "추 높이", unit: "mm", min: 4, max: 20, step: 0.5, value: 8},
                {panel: "빗면·실·도르래"},
                {key: "angle", label: "빗면 각도", unit: "°", min: 10, max: 60, step: 1, value: 30},
                {key: "slopeLen", label: "빗면 길이", unit: "mm", min: 30, max: 120, step: 0.5, value: 60},
                {key: "ropeLen", label: "물체~도르래", unit: "mm", min: 8, max: 80, step: 0.5, value: 28},
                {key: "groundLeft", label: "바닥 왼쪽 여유", unit: "mm", min: 0, max: 40, step: 0.5, value: 8},
                {key: "pulleyR", label: "도르래 반지름", unit: "mm", min: 1.5, max: 6, step: 0.1, value: 3.6},
                {key: "pulleyArm", check: "도르래 받침대", value: true},
                {key: "armLen", label: "받침대 길이", unit: "mm", min: 3, max: 25, step: 0.5, value: 13},
                {key: "boltDepth", label: "볼트 깊이", unit: "mm", min: 0, max: 8, step: 0.1, value: 2.2},
                {key: "drop", label: "추까지 길이", unit: "mm", min: 8, max: 90, step: 0.5, value: 18},
                {panel: "각도 표시"},
                {key: "angleMark", check: "각도 표시", value: true},
                {key: "angleText", label: "각도 글자", text: true, value: "θ"},
                {key: "arcR", label: "호 반지름", unit: "mm", min: 3, max: 20, step: 0.5, value: 9},
                {panel: "글자"},
                {key: "font", label: "글자 크기", unit: "pt", min: 5, max: 14, step: 0.5, value: 8}
            ],
            draw: drawInclinePulley
        });
    }

    // 좌표는 pt(y 위쪽 +), 바닥이 y=0, 빗면 아래 끝이 원점이고 오른쪽 위로 올라간다. 빗면 좌표 (u, v)는 u가 빗면을 따라 올라가는 거리, v가 빗면에서 수직으로 뜬 높이다.
    // 도르래는 꼭대기 위에 얹혀 실이 빗면과 나란히(물체 옆면 가운데 높이) 들어오고, 받침대 볼트는 빗면 몸통 안쪽에 있다. 추는 꼭대기 오른쪽에 수직으로 매달린다.
    function drawInclinePulley(t, o) {
        var m = t.mm, wBody = o.wBody, wObj = o.wObj, wRope = o.wRope, wGuide = o.wGuide, size = o.font;
        var th = o.angle * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
        var bw = o.blockW * m, bh = o.blockH * m, R = o.pulleyR * m, L = o.slopeLen * m;
        function W(u, v) { return [u * c - v * s, u * s + v * c]; }
        var off = bh / 2 - R;                                         // 도르래 가운데가 빗면에서 뜬 높이 (실이 물체 옆면 가운데 높이로 들어오게)
        var ww = o.weightW * m, wh = o.weightH * m;
        // 추가 꼭대기 아래 수직선에서 1.5mm 떨어져 매달리도록 도르래를 꼭대기보다 빗면 방향으로 ext만큼 내민다
        var ext = Math.max(0, (off * s - R + ww / 2 + 1.5 * m) / c), uP = L + ext;
        var apex = W(L, 0), C = W(uP, off), cx = C[0], cy = C[1], wx = cx + R;
        var ub = Math.max(uP - o.ropeLen * m, bw + 1.5 * m);          // 물체 위쪽 끝
        var wTop = cy - o.drop * m;
        // 바닥과 빗면, 꼭대기 아래 수직선
        t.line([-o.groundLeft * m, 0], [wx + ww / 2 + 8 * m, 0], wBody);
        t.path([[0, 0], apex, [apex[0], 0]], true, null, 100, wBody);
        // 물체 (빗면 위에 기울어져 놓임), 글자는 수평
        var b0 = W(ub - bw, 0), b1 = W(ub, 0), b2 = W(ub, bh), b3 = W(ub - bw, bh);
        t.path([b0, b1, b2, b3], true, null, 100, wObj);
        var bc = W(ub - bw / 2, bh / 2);
        if (o.blockText !== "") t.text(o.blockText, bc[0], bc[1], size, "center");
        var topY = Math.max(b2[1], b3[1]);
        if (o.blockName !== "") t.textAt(o.blockName, (Math.min(b0[0], b3[0]) + Math.max(b1[0], b2[0])) / 2, topY + NAME_GAP_MM * m, size, "above");
        // 도르래와 받침대 볼트(빗면 안쪽 boltDepth, 도르래 가운데에서 armLen)
        var mount = null;
        if (o.pulleyArm) {
            var dv = off + o.boltDepth * m, armLen = Math.max(o.armLen * m, dv + 0.01);
            mount = W(uP - Math.sqrt(armLen * armLen - dv * dv), -o.boltDepth * m);
        }
        t.pulley(cx, cy, R, mount, wObj, wGuide);
        // 실: 물체 옆면 가운데 → 빗면과 나란히 도르래 위 → 오른쪽 수직
        t.line(W(ub, bh / 2), W(uP, bh / 2), wRope);
        t.arc(cx, cy, R, 0, Math.PI / 2 + th, wRope);
        t.line([wx, cy], [wx, wTop], wRope);
        t.rect(wx - ww / 2, wTop, wx + ww / 2, wTop - wh, 0, 100, wObj);
        if (o.weightText !== "") t.text(o.weightText, wx, wTop - wh / 2, size, "center");
        if (o.weightName !== "") t.textAt(o.weightName, wx + ww / 2 + NAME_GAP_MM * m, wTop - wh / 2, size, "right");
        // 빗면 각도: 아래 끝의 호와 글자
        if (o.angleMark) {
            t.arc(0, 0, o.arcR * m, 0, th, wGuide);
            if (o.angleText !== "") {
                var half = th / 2, tr = (o.arcR + 3.2) * m;
                t.text(o.angleText, tr * Math.cos(half), tr * Math.sin(half), size, "center");
            }
        }
    }

    // ==== 창 ====
    // 엔진 인터페이스: label / addRows(page)→오류문 또는 null / setPreview(on) / updatePreview() / clearPreview() / commit()→확정했으면 true
    // 장면이 하나면 선택 줄 없이 창에 바로 행을 단다. 둘 이상이면 선택 줄(라디오)과 겹쳐 쌓은 페이지로 바꾼다
    function runFormHost(title, engines, tabPrefKey) {
        var win = new Window("dialog", title);
        win.orientation = "column";
        win.alignChildren = "fill";
        win.spacing = 4;
        win.margins = 12;

        var radios = [], pages = [];
        var holder = win;
        if (engines.length > 1) {
            var bar = win.add("group");
            bar.alignChildren = ["left", "center"];
            bar.spacing = 12;
            holder = win.add("group");
            holder.orientation = "stack";
            holder.alignChildren = ["fill", "top"];
            for (var r = 0; r < engines.length; r++) radios.push(bar.add("radiobutton", undefined, engines[r].label));
        }
        for (var i = 0; i < engines.length; i++) {
            var page = engines.length > 1 ? holder.add("group") : win;
            if (engines.length > 1) {
                page.orientation = "column";
                page.alignChildren = "fill";
                page.spacing = 4;
            }
            pages.push(page);
            engines[i].error = engines[i].addRows(page);
            if (engines[i].error) {
                if (engines.length === 1) { alert(engines[i].error); return; }
                page.enabled = false;
                radios[i].helpTip = engines[i].error;
            }
        }

        var footer = win.add("group");
        var previewCheck = footer.add("checkbox", undefined, "미리보기");
        previewCheck.value = true;
        var footerSpacer = footer.add("group");
        footerSpacer.alignment = ["fill", "center"];
        // 입력창에서 엔터를 쳐도 실행되지 않도록 기본 버튼을 두지 않는다
        var okButton = footer.add("button", undefined, "확인");
        try { win.defaultElement = null; } catch (defaultError) {}
        var cancelButton = footer.add("button", undefined, "취소", {name: "cancel"});

        var tabIndex = 0;
        if (engines.length > 1) {
            try {
                var savedTab = parseInt(app.preferences.getStringPreference(tabPrefKey), 10);
                if (isFinite(savedTab) && savedTab >= 0 && savedTab < engines.length) tabIndex = savedTab;
            } catch (tabError) {}
            if (engines[tabIndex].error) {
                for (var j = 0; j < engines.length; j++) if (!engines[j].error) { tabIndex = j; break; }
            }
            if (engines[tabIndex].error) { alert(engines[tabIndex].error); return; }
            radios[tabIndex].value = true;
            for (var q = 0; q < radios.length; q++) radios[q].onClick = radioHandler(q);
        }
        function radioHandler(index) {
            return function() {
                if (index === tabIndex) return;
                if (engines[index].error) {
                    radios[index].value = false;
                    radios[tabIndex].value = true;
                    alert(engines[index].error);
                    return;
                }
                engines[tabIndex].clearPreview();
                pages[tabIndex].visible = false;
                tabIndex = index;
                pages[tabIndex].visible = true;
                engines[tabIndex].setPreview(previewCheck.value);
            };
        }
        previewCheck.onClick = function() { engines[tabIndex].setPreview(previewCheck.value); };
        okButton.onClick = function() {
            if (!engines[tabIndex].commit()) return;
            if (engines.length > 1) {
                try { app.preferences.setStringPreference(tabPrefKey, String(tabIndex)); } catch (saveError) {}
            }
            win.close(1);
        };
        cancelButton.onClick = function() { win.close(0); };

        // 페이지는 겹쳐 쌓여 가장 큰 페이지 크기로 잡힌다. 선택되지 않은 페이지는 창이 뜬 뒤(onShow)에 숨긴다 (미리 layout()을 부르면 줄지 않는다)
        win.onShow = function() {
            if (engines.length > 1) for (var h = 0; h < pages.length; h++) pages[h].visible = h === tabIndex;
            engines[tabIndex].setPreview(previewCheck.value);
        };
        if (typeof bindTabOrder === "function") bindTabOrder(win);
        if (win.show() !== 1) engines[tabIndex].clearPreview();
        else engines[tabIndex].finish();
        try { app.redraw(); } catch (redrawError) {}
    }

    // ==== 폼 탭 공용 부품 ====
    // spec: label(탭 이름), name(그룹 이름), prefKey, controls[], draw(tools, o)
    // 컨트롤: {panel: "제목", fold: true} 새 패널(fold면 기본으로 접힘) / {key, label, unit, min, max, step, value} 숫자 행 /
    //         {key, check: "라벨", value: true} 체크(이어진 것은 한 행에 셋까지) / {key, label, items: [...], value} 드롭다운 /
    //         {key, label, text: true, value: "글"} 글 입력
    // '선 두께' 패널(wBody 테이블·바닥, wObj 물체·도르래 겉, wRope 실, wGuide 보조선·파선·도르래 안)과 '위치' 패널(가로·세로 이동)은 끝에 저절로 붙고,
    // 위치 이동은 다시 그리지 않고 그룹만 옮긴다. draw는 어디에 그려도 된다. 그린 뒤 그룹을 화면 가운데로 옮긴다.
    function makeFormEngine(spec) {
        var api = {label: spec.label, error: null, addRows: addRows,
            setPreview: function() {}, updatePreview: function() {}, clearPreview: function() {}, finish: function() {}, commit: function() { return false; }};
        var controls = spec.controls.concat([
            {panel: "선 두께", fold: true},
            {key: "wBody", label: "테이블·바닥", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.8},
            {key: "wObj", label: "물체·도르래 겉", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {key: "wRope", label: "실", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.4},
            {key: "wGuide", label: "보조선·파선·도르래 안", unit: "pt", min: 0.1, max: 2, step: 0.1, value: 0.3},
            {panel: "위치"},
            {key: "offsetX", label: "가로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 0},
            {key: "offsetY", label: "세로", unit: "mm", min: -100, max: 100, step: 0.1, value: 0, move: 1}
        ]);
        var o = {};
        var group = null, committed = false, previewOn = true, center = [0, 0], ui = {}, lastDashed = [];

        function addRows(page) {
            try { center = doc.activeView.centerPoint; } catch (viewError) {}
            for (var i = 0; i < controls.length; i++) if (controls[i].key) o[controls[i].key] = controls[i].value;
            loadSettings();
            var panel = page, checkRow = null;
            for (var c = 0; c < controls.length; c++) {
                var ctl = controls[c];
                if (ctl.panel) {
                    if (ctl.fold && typeof makeCollapsiblePanel === "function") {
                        // fold: true면 기본으로 접어 두고 접힌 상태는 다음에도 기억한다 (행이 많은 패널)
                        panel = makeCollapsiblePanel(page, ctl.panel, true, "MechanicsDevice/" + spec.name + "/" + ctl.panel);
                        panel.alignChildren = ["left", "top"];
                        panel.spacing = 4;
                    } else {
                        panel = page.add("panel", undefined, ctl.panel);
                        panel.alignChildren = ["left", "top"];
                        panel.margins = [12, 16, 12, 10];
                        panel.spacing = 4;
                    }
                    checkRow = null;
                } else if (ctl.check) {
                    if (checkRow === null || checkRow.children.length >= 3) checkRow = panel.add("group");
                    addCheck(checkRow, ctl);
                } else {
                    checkRow = null;
                    if (ctl.items) addChoice(panel, ctl);
                    else if (ctl.text) addText(panel, ctl);
                    else addNumber(panel, ctl);
                }
            }
            api.setPreview = function(on) { previewOn = on; redraw(); };
            api.updatePreview = redraw;
            api.clearPreview = function() { if (!committed) removeGroup(); };
            // 창이 닫힌 뒤 확정한 그림의 파선에 일러스트레이터의 '모퉁이·끝에 정렬' 옵션을 건다 (창이 떠 있는 동안에는 액션이 먹지 않는다)
            api.finish = function() { if (committed && group !== null) alignFormDashes(lastDashed); };
            api.commit = function() {
                if (group === null) build();
                if (group === null) return false;
                saveSettings();
                committed = true;
                doc.selection = null;
                group.selected = true;
                return true;
            };
            return null;
        }

        function addNumber(panel, ctl) {
            var decimals = ctl.step < 0.1 ? 2 : (ctl.step < 1 ? 1 : 0);
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + (ctl.unit ? " (" + ctl.unit + "):" : ":")).preferredSize.width = 100;
            var input = row.add("edittext", undefined, formFormat(o[ctl.key], decimals));
            input.characters = 6;
            var bar = row.add("scrollbar", undefined, o[ctl.key], ctl.min, ctl.max);
            bar.stepdelta = ctl.step;
            bar.jumpdelta = ctl.step * 10;
            bar.preferredSize.width = 196;
            var reset = row.add("button", undefined, "R");
            reset.preferredSize.width = 34;
            reset.helpTip = "처음 값으로 되돌리기";
            function apply(value) {
                if (isNaN(value)) value = o[ctl.key];
                value = Math.round(value / ctl.step) * ctl.step;
                value = Math.max(ctl.min, Math.min(ctl.max, Number(value.toFixed(decimals))));
                var delta = value - o[ctl.key];
                o[ctl.key] = value;
                input.text = formFormat(value, decimals);
                try { bar.value = value; } catch (e) {}
                if (delta === 0) return;
                if (ctl.move !== undefined) {
                    if (group !== null) {
                        try { group.translate(ctl.move === 0 ? delta * FORM_MM : 0, ctl.move === 1 ? delta * FORM_MM : 0, true, true, true, true); } catch (e2) {}
                        app.redraw();
                    }
                } else redraw();
            }
            bar.onChanging = function() { apply(bar.value); };
            bar.onChange = function() { apply(bar.value); };
            input.onChange = function() { apply(parseFloat(String(input.text).replace(",", "."))); };
            // 입력창에 처음 값을 친 것과 같은 경로로 되돌린다. 처음 값은 저장값을 덮기 전의 ctl.value
            reset.onClick = function() {
                input.text = formFormat(ctl.value, decimals);
                input.onChange();
            };
        }

        function addChoice(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            // order: 목록에 보이는 순서 → 값 번호 (화살촉 모양은 1 작살형, 2 제비꼬리, 3 삼각형, 4 꺾쇠 순으로 보인다)
            var order = ctl.order || null, shown = [], pos = o[ctl.key], k;
            for (k = 0; k < ctl.items.length; k++) shown.push(order ? ctl.items[order[k]] : ctl.items[k]);
            if (order) for (k = 0; k < order.length; k++) if (order[k] === o[ctl.key]) pos = k;
            var list = row.add("dropdownlist", undefined, shown);
            list.maximumSize.width = 230;
            list.selection = pos;
            ui[ctl.key] = list;
            list.onChange = function() {
                if (list.selection === null) { list.selection = pos; return; }
                pos = list.selection.index;
                o[ctl.key] = order ? order[pos] : pos;
                redraw();
            };
        }

        function addText(panel, ctl) {
            var row = panel.add("group");
            row.alignChildren = ["left", "center"];
            row.add("statictext", undefined, ctl.label + ":").preferredSize.width = 100;
            var input = row.add("edittext", undefined, o[ctl.key]);
            input.characters = 22;
            ui[ctl.key] = input;
            input.onChange = function() {
                o[ctl.key] = String(input.text).replace(/\|/g, "");
                redraw();
            };
        }

        function addCheck(row, ctl) {
            var box = row.add("checkbox", undefined, ctl.check);
            box.value = o[ctl.key];
            box.onClick = function() { o[ctl.key] = box.value; redraw(); };
        }

        function redraw() {
            removeGroup();
            if (previewOn) build();
            app.redraw();
        }

        function build() {
            var layer = doc.activeLayer;
            if (layer.locked || !layer.visible) {
                for (var i = 0; i < doc.layers.length; i++) {
                    if (!doc.layers[i].locked && doc.layers[i].visible) { layer = doc.layers[i]; break; }
                }
            }
            group = layer.groupItems.add();
            group.name = spec.name;
            try {
                var tools = makeFormTools(group, o);
                spec.draw(tools, o);
                lastDashed = tools.dashed;
                var b = group.geometricBounds;
                group.translate(center[0] - (b[0] + b[2]) / 2 + o.offsetX * FORM_MM,
                    center[1] - (b[1] + b[3]) / 2 + o.offsetY * FORM_MM, true, true, true, true);
            } catch (e) {
                removeGroup();
                alert("그리지 못했습니다: " + e);
            }
        }

        function removeGroup() {
            if (group === null) return;
            try { group.remove(); } catch (e) {}
            group = null;
        }

        function saveSettings() {
            var parts = ["v1"];
            for (var i = 0; i < controls.length; i++) {
                var ctl = controls[i];
                if (!ctl.key) continue;
                parts.push(ctl.check ? (o[ctl.key] ? "1" : "0") : String(o[ctl.key]));
            }
            try { app.preferences.setStringPreference(spec.prefKey, parts.join("|")); } catch (e) {}
        }

        // 태그·개수가 맞고 모든 값이 범위 안일 때만 복원한다
        function loadSettings() {
            var raw = "";
            try { raw = app.preferences.getStringPreference(spec.prefKey); } catch (e) { return; }
            if (!raw) return;
            var p = String(raw).split("|");
            var keyed = [];
            for (var i = 0; i < controls.length; i++) if (controls[i].key) keyed.push(controls[i]);
            if (p[0] !== "v1" || p.length !== keyed.length + 1) return;
            var values = [];
            for (var k = 0; k < keyed.length; k++) {
                var ctl = keyed[k], text = p[k + 1];
                if (ctl.check) {
                    if (text !== "0" && text !== "1") return;
                    values.push(text === "1");
                } else if (ctl.text) {
                    if (text.length > 200) return;
                    values.push(text);
                } else {
                    var value = Number(text);
                    if (text === "" || isNaN(value)) return;
                    if (ctl.items ? (value !== Math.floor(value) || value < 0 || value >= ctl.items.length)
                        : (value < ctl.min || value > ctl.max)) return;
                    values.push(value);
                }
            }
            for (var n = 0; n < keyed.length; n++) o[keyed[n].key] = values[n];
        }
        return api;
    }

    // 파선은 일러스트레이터의 '파선을 모퉁이와 패스 끝에 정렬하고 길이를 조정하여 맞추기'를 건다 (헬퍼가 없으면 건너뛴다).
    // 액션은 전체를 한 번에 돌리고, 끝나면 각 선의 파선 값(양 끝이 대시가 되게 길이를 맞춘 값)을 되돌려 놓는다
    function alignFormDashes(list) {
        if (list.length === 0 || typeof alignDashToCornersBatch !== "function") return;
        var paths = [], i;
        for (i = 0; i < list.length; i++) paths.push(list[i].item);
        alignDashToCornersBatch(paths, GHOST_DASH);
        for (i = 0; i < list.length; i++) {
            try { list[i].item.strokeDashes = list[i].dashes; } catch (e) {}
        }
    }

    // 끝 tip, 방향 단위 벡터 d, 배율 k(카탈로그 1pt가 k)로 shape 모양의 점들
    function catalogPoints(shape, tip, d, k) {
        var n = [-d[1], d[0]];
        var poly = HEAD_CATALOG[shape].poly;
        var out = [];
        for (var i = 0; i < poly.length; i++) {
            out.push([tip[0] - d[0] * poly[i][1] * k + n[0] * poly[i][0] * k, tip[1] - d[1] * poly[i][1] * k + n[1] * poly[i][0] * k]);
        }
        return out;
    }

    function formFormat(value, decimals) {
        return Number(value).toFixed(decimals);
    }

    // 그리기 도구. 좌표는 pt, 크기 인자는 따로 적지 않으면 pt다. 색은 K값(0~100, null이면 없음)
    function makeFormTools(g, o) {
        var t = {mm: FORM_MM, group: g, dashed: []}, parent = g;
        // 베지어 경로. points는 {a: 앵커, l: 들어오는 핸들, r: 나가는 핸들}
        t.curve = function(points, closed, fill, stroke, width, dashes) {
            var anchors = [], i;
            for (i = 0; i < points.length; i++) anchors.push(points[i].a);
            var p = parent.pathItems.add();
            p.setEntirePath(anchors);
            for (i = 0; i < points.length; i++) {
                p.pathPoints[i].leftDirection = points[i].l;
                p.pathPoints[i].rightDirection = points[i].r;
            }
            p.closed = !!closed;
            formPaint(p, fill, stroke, width, dashes);
            return p;
        };
        t.path = function(points, closed, fill, stroke, width, dashes) {
            var p = parent.pathItems.add();
            p.setEntirePath(points);
            p.closed = !!closed;
            formPaint(p, fill, stroke, width, dashes);
            if (dashes && dashes.length > 0) t.dashed.push({item: p, dashes: dashes});
            return p;
        };
        // 양 끝이 대시로 끝나게 파선(GHOST_DASH 비율, 2-1)의 길이를 이 선에 맞춘 선분. 대시 n개와 간격 n-1개가 선 길이를 정확히 채운다
        t.dashLine = function(a, b, width) {
            var len = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
            var d = GHOST_DASH[0], gap = GHOST_DASH[1];
            var n = Math.max(1, Math.round((len + gap) / (d + gap)));
            var k = len / (n * d + (n - 1) * gap);
            return t.line(a, b, width, 100, n === 1 ? null : [d * k, gap * k]);
        };
        // 파선 상자: 하나의 닫힌 사각형 패스. 둘레를 파선 한 바퀴에 맞춰 시작 모퉁이가 대시로 이어지게 길이를 조정하고,
        // 창이 닫힌 뒤 일러스트레이터의 '모퉁이·끝에 정렬' 옵션을 건다
        t.dashRect = function(left, top, right, bottom, width) {
            var perimeter = 2 * ((right - left) + (top - bottom));
            var d = GHOST_DASH[0], gap = GHOST_DASH[1];
            var n = Math.max(1, Math.round(perimeter / (d + gap))), k = perimeter / (n * (d + gap));
            return t.rect(left, top, right, bottom, null, 100, width, [d * k, gap * k]);
        };
        t.line = function(a, b, width, k, dashes) {
            return t.path([a, b], false, null, k === undefined ? 100 : k, width, dashes);
        };
        // 위쪽 top·아래쪽 bottom (일러 좌표, top > bottom)
        t.rect = function(left, top, right, bottom, fill, stroke, width, dashes) {
            return t.path([[left, top], [right, top], [right, bottom], [left, bottom]], true, fill, stroke, width, dashes);
        };
        t.circle = function(cx, cy, r, fill, stroke, width) {
            var p = parent.pathItems.ellipse(cy + r, cx - r, r * 2, r * 2);
            formPaint(p, fill, stroke, width);
            return p;
        };
        // 도르래: 바깥 테두리와 회색 홈 둘레, 흰 안쪽 원판, 가운데 축 점. mount([x, y])가 있으면 가운데에서 mount까지 받침대(양 끝이 둥근 막대)와 그 끝의 축 점을 그린다
        t.pulley = function(cx, cy, R, mount, wOuter, wInner) {
            t.circle(cx, cy, R, 22, 100, wOuter);
            t.circle(cx, cy, R * 0.66, 0, 100, wInner);
            var dot = R * 0.17;
            if (mount) {
                var dx = mount[0] - cx, dy = mount[1] - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
                var ux = dx / len, uy = dy / len, half = R * 0.3, nx = -uy, ny = ux, k = 0.5523 * half;
                // 받침대 윤곽: 앵커 6개 (양 끝 반원은 꼭짓점 앵커 하나씩과 베지어 핸들)
                var pts = [
                    {a: [cx + nx * half, cy + ny * half], l: [cx + nx * half - ux * k, cy + ny * half - uy * k], r: [cx + nx * half, cy + ny * half]},
                    {a: [mount[0] + nx * half, mount[1] + ny * half], l: [mount[0] + nx * half, mount[1] + ny * half], r: [mount[0] + nx * half + ux * k, mount[1] + ny * half + uy * k]},
                    {a: [mount[0] + ux * half, mount[1] + uy * half], l: [mount[0] + ux * half + nx * k, mount[1] + uy * half + ny * k], r: [mount[0] + ux * half - nx * k, mount[1] + uy * half - ny * k]},
                    {a: [mount[0] - nx * half, mount[1] - ny * half], l: [mount[0] - nx * half + ux * k, mount[1] - ny * half + uy * k], r: [mount[0] - nx * half, mount[1] - ny * half]},
                    {a: [cx - nx * half, cy - ny * half], l: [cx - nx * half, cy - ny * half], r: [cx - nx * half - ux * k, cy - ny * half - uy * k]},
                    {a: [cx - ux * half, cy - uy * half], l: [cx - ux * half - nx * k, cy - uy * half - ny * k], r: [cx - ux * half + nx * k, cy - uy * half + ny * k]}
                ];
                t.curve(pts, true, 0, 100, wInner);
                t.circle(mount[0], mount[1], dot, 45, 100, wInner);
            }
            t.circle(cx, cy, dot, 45, 100, wInner);
        };
        // 원호 (a0 → a1, 라디안, 반시계가 +). 열린 선
        t.arc = function(cx, cy, r, a0, a1, width, k) {
            // 90° 이하로 나눈 베지어 한 조각씩 (앵커는 조각 수 + 1개)
            var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9)), step = (a1 - a0) / n, h = 4 / 3 * Math.tan(step / 4) * r;
            var pts = [];
            for (var i = 0; i <= n; i++) {
                var ang = a0 + step * i, c = Math.cos(ang), sn = Math.sin(ang);
                var anchor = [cx + r * c, cy + r * sn];
                pts.push({a: anchor, l: [anchor[0] + h * sn, anchor[1] - h * c], r: [anchor[0] - h * sn, anchor[1] + h * c]});
            }
            return t.curve(pts, false, null, k === undefined ? 100 : k, width);
        };
        // a → b 화살표: 선은 촉 뿌리까지, 촉은 채운 삼각형
        t.arrow = function(a, b, width, k, headLength) {
            if (k === undefined) k = 100;
            var head = headLength || 1.6 * FORM_MM;
            var dx = b[0] - a[0], dy = b[1] - a[1];
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var ux = dx / len, uy = dy / len;
            if (head > len) head = len;
            var base = [b[0] - ux * head, b[1] - uy * head];
            var half = head * 0.35;
            if (len > head) t.line(a, [base[0] + ux * 0.2, base[1] + uy * 0.2], width, k);
            t.path([b, [base[0] - uy * half, base[1] + ux * half], [base[0] + uy * half, base[1] - ux * half]], true, k, null, 0);
        };
        // a → b 화살촉 카탈로그 모양(HEAD_HARPOON 등) 화살표. headLength는 삼각형 머리 길이 기준(pt), 선은 머리 속(lineEnd)에서 끝나 틈이 없다
        t.headArrow = function(a, b, width, k, headLength, shape) {
            if (k === undefined) k = 100;
            var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            var ux = dx / len, uy = dy / len;
            var head = Math.min(headLength || 1.6 * FORM_MM, len);
            var unit = head / HEAD_CATALOG[0].length, lineEnd = HEAD_CATALOG[shape].lineEnd * unit;
            if (len > lineEnd) t.line(a, [b[0] - ux * lineEnd, b[1] - uy * lineEnd], width, k);
            t.path(catalogPoints(shape, b, [ux, uy], unit), true, k, null, 0);
        };
        // (x, y)가 글자 가운데(align "left"면 왼쪽 끝, "right"면 오른쪽 끝). opts: italic 변수 글자(이탤릭), sub 글자 뒤 숫자를 아래 첨자로
        t.text = function(text, x, y, size, align, k, opts) {
            var frame = g.textFrames.add();
            frame.contents = String(text).replace(/°/g, "˘");
            var range = frame.textRange;
            range.characterAttributes.size = size;
            range.characterAttributes.fillColor = formGray(k === undefined ? 100 : k);
            formFonts(frame, opts);
            var b = frame.geometricBounds;
            var anchorX = align === "left" ? b[0] : (align === "right" ? b[2] : (b[0] + b[2]) / 2);
            frame.translate(x - anchorX, y - (b[1] + b[3]) / 2);
            return frame;
        };
        // 이름 글자: 글자 윤곽(글상자 여백 제외)이 도형에서 정확히 간격만큼 떨어지게 놓는다.
        // anchor "above": (x, y)가 글자 윤곽의 아래 가운데, "right": (x, y)가 글자 윤곽의 왼쪽 끝 세로 가운데
        t.textAt = function(text, x, y, size, anchor, k, opts) {
            var frame = t.text(text, x, y, size, "center", k, opts);
            var ink = formInkBounds(frame);
            var cx = (ink[0] + ink[2]) / 2, cy = (ink[1] + ink[3]) / 2;
            if (anchor === "above") frame.translate(x - cx, y - ink[3]);
            else frame.translate(x - ink[0], y - cy);
            return frame;
        };
        return t;
    }

    // 글자 윤곽의 경계: 복사본을 윤곽선으로 바꿔 재고 지운다. 실패하면 글상자 경계를 쓴다
    function formInkBounds(frame) {
        try {
            var copy = frame.duplicate();
            var outlined = copy.createOutline();
            var b = outlined.geometricBounds;
            var out = [b[0], b[1], b[2], b[3]];
            outlined.remove();
            return out;
        } catch (e) {
            var f = frame.geometricBounds;
            return [f[0], f[1], f[2], f[3]];
        }
    }

    function formPaint(p, fill, stroke, width, dashes) {
        p.filled = fill !== null && fill !== undefined;
        if (p.filled) p.fillColor = formGray(fill);
        p.stroked = stroke !== null && stroke !== undefined && width > 0;
        if (p.stroked) {
            p.strokeColor = formGray(stroke);
            p.strokeWidth = width;
            p.strokeDashes = dashes || [];
            p.strokeCap = StrokeCap.BUTTENDCAP;
            p.strokeJoin = StrokeJoin.MITERENDJOIN;
        }
    }

    // 한글·공백은 Spoqa(기준선 0), 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt), GSMediumB1에 없는 기호(θ)는 HancomEQN — 02_문자/한글·영문 서체 적용.jsx 규칙.
    // opts.italic이면 영문 글자를 변수 서체(GSMediItaC1)로, opts.sub이면 글자 뒤 숫자를 아래 첨자로 쓴다
    function formFonts(frame, opts) {
        var text = frame.contents, range = frame.textRange, italic = opts && opts.italic, sub = opts && opts.sub;
        for (var i = 0; i < text.length; i++) {
            var code = text.charCodeAt(i);
            var attributes = range.characters[i].characterAttributes;
            if ((code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E) || code === 32) {
                attributes.textFont = FORM_KOR_FONT;
                attributes.baselineShift = 0;
            } else if (code > 126 && "°±·˘".indexOf(text.charAt(i)) < 0) {
                attributes.textFont = FORM_MATH_FONT;
                attributes.baselineShift = 0;
            } else {
                attributes.textFont = italic && /[A-Za-z]/.test(text.charAt(i)) ? FORM_ITALIC_FONT : FORM_ENG_FONT;
                attributes.baselineShift = 0.5;
            }
        }
        if (sub) {
            var prevSub = false;
            for (var k = 0; k < text.length; k++) {
                var c = text.charCodeAt(k);
                var isDigit = c >= 48 && c <= 57;
                var after = k > 0 && (/[A-Za-zͰ-Ͽ)]/.test(text.charAt(k - 1)) || prevSub);
                prevSub = isDigit && after;
                if (prevSub) range.characters[k].characterAttributes.baselinePosition = FontBaselineOption.SUBSCRIPT;
            }
        }
    }

    function formFindFont(names) {
        for (var i = 0; i < names.length; i++) {
            try { return app.textFonts.getByName(names[i]); } catch (e) {}
        }
        return app.textFonts[0];
    }

    // K값(0~100) 회색. RGB 문서면 같은 밝기의 회색으로
    function formGray(k) {
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 0; cmyk.yellow = 0; cmyk.black = k;
            return cmyk;
        }
        var value = Math.round(255 * (100 - k) / 100);
        var rgb = new RGBColor();
        rgb.red = value; rgb.green = value; rgb.blue = value;
        return rgb;
    }
})();
