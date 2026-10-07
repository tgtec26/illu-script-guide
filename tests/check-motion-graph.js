const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_MotionGraph.jsx");
const source = fs.readFileSync(scriptPath, "utf8");

// 문법만 확인 (실행하지 않는다)
new Function(source);

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing helper: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("{", start); index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unbalanced helper: ${name}`);
}

function extractVar(name) {
  const match = source.match(new RegExp(`var ${name} = (.*?);\\n`, "s"));
  assert.ok(match, `missing constant: ${name}`);
  return `var ${name} = ${match[1]};`;
}

const constants = ["ARROW", "HEAD_TRIANGLE", "HEAD_CHEVRON", "HEAD_SWALLOW", "GRAPH_X_RATIO", "Y_TOP_RATIO", "Y_START_DOWN_RATIO", "CURVE_START_HANDLE", "CURVE_END_HANDLE",
  "Y_CONST_MAX_RATIO", "WIDTH_RANGE", "HEIGHT_RANGE", "Y_VALUE_RANGE"];
const names = ["graphGeometry", "arrowHeadPoints", "arrowHeadShape", "shaftInset", "corner", "clampOptions", "clamp"];
const lib = new Function(`${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${[...constants, ...names].join(",")}};`)();

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const box = {left: 100, bottom: 200, width: 90, height: 80, yValue: 50};
const geo = (pattern) => lib.graphGeometry({...box, pattern});

// 축: 원점에서 오른쪽·위쪽, 선은 화살촉의 오목한 점에서 끝나고 끝점은 축 길이만큼
{
  const g = geo(0);
  assert.deepStrictEqual(g.axes[0].from, [100, 200], "x axis starts at the origin");
  assert.deepStrictEqual(g.axes[1].from, [100, 200], "y axis starts at the origin");
  assert.deepStrictEqual(g.axes[0].tip, [190, 200], "x axis tip is width away");
  assert.deepStrictEqual(g.axes[1].tip, [100, 280], "y axis tip is height away");
  near(g.axes[0].to[0], 190 - (lib.ARROW.length - lib.ARROW.notch), 1e-9, "x axis line stops at the notch");
  near(g.axes[1].to[1], 280 - (lib.ARROW.length - lib.ARROW.notch), 1e-9, "y axis line stops at the notch");
}

// 화살촉: 끝점, 날개 둘(대칭), 오목한 점
{
  const head = lib.arrowHeadPoints([190, 200], [1, 0]);
  assert.strictEqual(head.length, 4, "arrow head has four points");
  assert.deepStrictEqual(head[0].anchor, [190, 200], "tip first");
  near(head[1].anchor[0], 190 - lib.ARROW.length, 1e-9, "wing is one arrow length back");
  near(head[1].anchor[1] + head[3].anchor[1], 400, 1e-9, "wings mirror across the axis");
  near(Math.abs(head[1].anchor[1] - 200), lib.ARROW.halfWidth, 1e-9, "wing half width");
  near(head[2].anchor[0], 190 - lib.ARROW.length + lib.ARROW.notch, 1e-9, "notch point");
  const up = lib.arrowHeadPoints([100, 280], [0, 1]);
  near(up[1].anchor[1], 280 - lib.ARROW.length, 1e-9, "upward arrow wing is back along y");
}

// 화살촉 모양: 제비꼬리(평가원식)는 위 네 점 그대로, 삼각형은 끝·날개 둘, 꺾쇠는 열린 선. 배율은 길이·폭에 같이 적용
{
  const swallow = lib.arrowHeadShape([190, 200], [1, 0], 1, lib.HEAD_SWALLOW);
  assert.strictEqual(swallow.closed, true);
  assert.strictEqual(swallow.points.length, 4);
  assert.deepStrictEqual(swallow.points, lib.arrowHeadPoints([190, 200], [1, 0]), "default swallowtail is the exam-style head");
  const triangle = lib.arrowHeadShape([190, 200], [1, 0], 1, lib.HEAD_TRIANGLE);
  assert.strictEqual(triangle.closed, true);
  assert.strictEqual(triangle.points.length, 3);
  assert.deepStrictEqual(triangle.points[0].anchor, [190, 200], "triangle tip");
  near(triangle.points[1].anchor[1] + triangle.points[2].anchor[1], 400, 1e-9, "triangle wings mirror");
  const chevron = lib.arrowHeadShape([190, 200], [1, 0], 1, lib.HEAD_CHEVRON);
  assert.strictEqual(chevron.closed, false);
  assert.deepStrictEqual(chevron.points[1].anchor, [190, 200], "chevron apex is the tip");
  const big = lib.arrowHeadShape([190, 200], [1, 0], 2, lib.HEAD_SWALLOW);
  near(big.points[1].anchor[0], 190 - 2 * lib.ARROW.length, 1e-9, "scaled wing is further back");
  near(Math.abs(big.points[1].anchor[1] - 200), 2 * lib.ARROW.halfWidth, 1e-9, "scaled wing is wider");
  // 축 선 끝: 제비꼬리는 오목한 점, 삼각형은 밑변 조금 앞, 꺾쇠는 끝점
  near(lib.shaftInset(lib.HEAD_SWALLOW, 1), lib.ARROW.length - lib.ARROW.notch, 1e-9, "line stops at the notch");
  near(lib.shaftInset(lib.HEAD_SWALLOW, 2), 2 * (lib.ARROW.length - lib.ARROW.notch), 1e-9, "notch distance scales");
  near(lib.shaftInset(lib.HEAD_CHEVRON, 1), 0, 1e-9, "chevron line runs to the tip");
  assert.ok(lib.shaftInset(lib.HEAD_TRIANGLE, 1) > 0 && lib.shaftInset(lib.HEAD_TRIANGLE, 1) < lib.ARROW.length, "triangle line ends inside the head");
}

// 모양: 일정 / 직선 증가 / 직선 감소 / 아래로 볼록 곡선 / 위로 볼록 곡선
{
  const spanX = 90 * lib.GRAPH_X_RATIO;
  const top = 80 * lib.Y_TOP_RATIO;
  const flat = geo(0).graph;
  assert.deepStrictEqual([flat[0].anchor, flat[1].anchor], [[100, 250], [100 + spanX, 250]], "constant line at y value");
  const up = geo(1).graph;
  assert.deepStrictEqual([up[0].anchor, up[1].anchor], [[100, 200], [100 + spanX, 200 + top]], "increasing line from the origin");
  const down = geo(2).graph;
  assert.deepStrictEqual([down[0].anchor, down[1].anchor], [[100, 200 + 80 * lib.Y_START_DOWN_RATIO], [100 + spanX, 200]],
    "decreasing line ends on the x axis");
  const curve = geo(3).graph;
  assert.strictEqual(curve.length, 2, "curve is one Bezier segment");
  assert.deepStrictEqual(curve[0].anchor, [100, 200], "curve starts at the origin");
  near(curve[0].right[1], 200, 1e-9, "curve leaves the origin horizontally");
  assert.ok(curve[0].right[0] > 100, "start handle points right");
  near(curve[1].left[0], curve[1].anchor[0], 1e-9, "curve ends vertically");
  assert.ok(curve[1].left[1] < curve[1].anchor[1], "end handle points down");
  // 곡선은 아래로 볼록: 가운데 점이 직선보다 아래
  const t = 0.5;
  const y = (1 - t) ** 3 * 200 + 3 * (1 - t) ** 2 * t * curve[0].right[1] + 3 * (1 - t) * t ** 2 * curve[1].left[1] + t ** 3 * curve[1].anchor[1];
  assert.ok(y < 200 + top / 2, "curve sags below the straight chord");

  // 위로 볼록: 같은 두 끝점, 시작은 수직·끝은 수평, 가운데 점이 직선보다 위
  const bulge = geo(4).graph;
  assert.strictEqual(bulge.length, 2, "bulging curve is one Bezier segment");
  assert.deepStrictEqual([bulge[0].anchor, bulge[1].anchor], [curve[0].anchor, curve[1].anchor], "same end points as the sagging curve");
  near(bulge[0].right[0], 100, 1e-9, "bulging curve leaves the origin vertically");
  assert.ok(bulge[0].right[1] > 200, "start handle points up");
  near(bulge[1].left[1], bulge[1].anchor[1], 1e-9, "bulging curve ends horizontally");
  assert.ok(bulge[1].left[0] < bulge[1].anchor[0], "end handle points left");
  const by = (1 - t) ** 3 * 200 + 3 * (1 - t) ** 2 * t * bulge[0].right[1] + 3 * (1 - t) * t ** 2 * bulge[1].left[1] + t ** 3 * bulge[1].anchor[1];
  assert.ok(by > 200 + top / 2, "curve bulges above the straight chord");
  // 두 곡선은 y = x 기준 맞바꿈 관계(정규화 좌표): 아래로 볼록의 (x, y) 점 = 위로 볼록의 (y, x) 점
  const at = (c, u) => {
    const mix = (a, b, cc, d) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u ** 2 * cc + u ** 3 * d;
    return [mix(c[0].anchor[0], c[0].right[0], c[1].left[0], c[1].anchor[0]) - 100, mix(c[0].anchor[1], c[0].right[1], c[1].left[1], c[1].anchor[1]) - 200];
  };
  const p1 = at(curve, 0.3);
  const p2 = at(bulge, 0.3);
  near(p1[0] / spanX, p2[1] / top, 1e-9, "sagging x matches bulging y");
  near(p1[1] / top, p2[0] / spanX, 1e-9, "sagging y matches bulging x");
}

// 값 줄이기: 크기는 범위 안, y값은 축 높이의 95 %까지
{
  const base = {width: 32, height: 29, yValue: 18, offsetX: 0, offsetY: 0};
  assert.deepStrictEqual(lib.clampOptions(base), base, "default options pass through");
  assert.strictEqual(lib.clampOptions({...base, width: 500}).width, lib.WIDTH_RANGE[1], "width caps at its range");
  assert.strictEqual(lib.clampOptions({...base, height: 5}).height, lib.HEIGHT_RANGE[0], "height keeps room for the stacked label");
  near(lib.clampOptions({...base, yValue: 99}).yValue, 29 * lib.Y_CONST_MAX_RATIO, 1e-9, "y value stays under the axis tip");
  near(lib.clampOptions({...base, height: 20, yValue: 99}).yValue, 19, 1e-9, "y value follows a shorter axis");
}

// 설정 저장·복원
{
  const ioNames = ["saveSettings", "applySettings", "parseNumber", "roundTo", "clamp"];
  const prefs = {};
  const make = (options) => new Function("app", "options", `${["PREF_KEY", "PATTERNS", "Y_NAMES", "POSITION_LIMIT_MM", "WIDTH_RANGE",
    "HEIGHT_RANGE", "Y_VALUE_RANGE", "NUMBER_KEYS", "SPECS", "HEAD_SHAPES"].map(extractVar).join("\n")}\n${ioNames.map(extractFunction).join("\n")}\n` +
    "return {save: saveSettings, load: applySettings};")(
    {preferences: {setStringPreference: (k, v) => { prefs[k] = v; }, getStringPreference: (k) => prefs[k] || ""}}, options);
  const saved = {pattern: 3, yKind: 0, yValue: 12.5, width: 40, height: 33, offsetX: -2, offsetY: 4.5, headSize: 150, headShape: 1, previewOn: false};
  make(saved).save();
  assert.ok(prefs["ObjectMotionGraph/settings"].startsWith("v2|3|0|1|"), "settings start with the version tag");
  const restored = {pattern: 0, yKind: 1, yValue: 18, width: 32, height: 29, offsetX: 0, offsetY: 0, headSize: 100, headShape: 2, previewOn: true};
  make(restored).load();
  assert.deepStrictEqual(restored, saved, "saved options come back");
  prefs["ObjectMotionGraph/settings"] = "v2|1|2";
  const untouched = {pattern: 0, yKind: 1, yValue: 18, width: 32, height: 29, offsetX: 0, offsetY: 0, headSize: 100, headShape: 2, previewOn: true};
  make(untouched).load();
  assert.strictEqual(untouched.pattern, 0, "a different field count is ignored");
  prefs["ObjectMotionGraph/settings"] = "v2|9|9|9|999|999|999|999|999|999|0";
  const clamped = {pattern: 1, yKind: 0, yValue: 18, width: 32, height: 29, offsetX: 0, offsetY: 0, headSize: 100, headShape: 2, previewOn: true};
  make(clamped).load();
  assert.strictEqual(clamped.pattern, 1, "out-of-range pattern is ignored");
  assert.strictEqual(clamped.width, 200, "out-of-range number is clamped");
}
console.log("check-motion-graph: ok");
