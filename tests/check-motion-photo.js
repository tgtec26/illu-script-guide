const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "스크립트", "01_도형", "Object_MotionPhoto.jsx");
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

const constants = ["ARROW", "SPAN_MAX_MM", "PREF_KEY", "DIRECTIONS", "MOTIONS", "BALLS", "POSITION_LIMIT_MM", "RADIO_KEYS",
  "CHECK_KEYS", "NUMBER_KEYS", "SPECS"];
const names = ["framePositions", "clampOptions", "distanceLabel", "trimText", "arrowHeadPoints", "cleanDistText",
  "saveSettings", "applySettings", "parseNumber", "roundTo", "clamp"];
const make = (options, prefs) => new Function("app", "options", `${constants.map(extractVar).join("\n")}\n${names.map(extractFunction).join("\n")}\n` +
  `return {${[...names, "SPAN_MAX_MM", "ARROW"].join(",")}};`)(
  {preferences: {setStringPreference: (k, v) => { prefs[k] = v; }, getStringPreference: (k) => prefs[k] || ""}}, options);

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: expected ${b}, got ${a}`);
const base = {direction: 0, motion: 0, ball: 0, bgOn: true, startOn: true, surfaceOn: false, distOn: true,
  speed: 100, accel: 500, interval: 0.1, count: 7, size: 8, ballK: 30, bgK: 90, distText: "d", offsetX: 0, offsetY: 0, previewOn: true};
const lib = make({...base}, {});

// 위치: 등속은 같은 간격, 가속은 구간 거리가 1:3:5…
{
  const uniform = lib.framePositions({...base, motion: 0});
  assert.strictEqual(uniform.length, 7, "one position per photo");
  near(uniform[0], 0, 1e-12, "first photo at the start");
  for (let i = 1; i < uniform.length; i++) near(uniform[i] - uniform[i - 1], 10, 1e-9, "uniform gap = v × interval");
  const accel = lib.framePositions({...base, motion: 1});
  const gaps = accel.slice(1).map((p, i) => p - accel[i]);
  gaps.forEach((gap, i) => near(gap / gaps[0], 2 * i + 1, 1e-9, "accelerating gaps go 1:3:5…"));
  near(gaps[0], 0.5 * 500 * 0.1 * 0.1, 1e-9, "first gap = ½ a Δt²");
  near(lib.framePositions({...base, motion: 1, interval: 0.2})[1], 0.5 * 500 * 0.04, 1e-9, "interval scales the positions");
}

// 길이 제한: 첫 사진에서 마지막 사진까지 1000 mm 안
{
  assert.deepStrictEqual(lib.clampOptions(base).speed, 100, "default speed passes through");
  const far = lib.clampOptions({...base, speed: 1000, accel: 5000, interval: 2, count: 30});
  near(lib.framePositions({...far, motion: 0}).pop(), lib.SPAN_MAX_MM, 1e-6, "uniform span is capped");
  near(lib.framePositions({...far, motion: 1}).pop(), lib.SPAN_MAX_MM, 1e-6, "accelerating span is capped");
}

// 거리 글자: 숫자로 시작하면 곱하고, 글자면 계수를 앞에 붙인다
{
  assert.deepStrictEqual(lib.distanceLabel("d", 1), {text: "d", italicFrom: 0}, "variable stays, italic from the start");
  assert.deepStrictEqual(lib.distanceLabel("d", 3), {text: "3d", italicFrom: 1}, "coefficient is upright, variable italic");
  assert.deepStrictEqual(lib.distanceLabel("10 cm", 5), {text: "50 cm", italicFrom: 5}, "number scales, unit stays");
  assert.strictEqual(lib.distanceLabel("1.1 m", 3).text, "3.3 m", "no float noise");
  assert.strictEqual(lib.distanceLabel("  0.5m ", 1).text, "0.5m", "whitespace around the value is trimmed");
}

// 화살촉: 끝점이 맨 앞, 날개는 축에 대칭, scale로 줄어든다
{
  const head = lib.arrowHeadPoints([100, 50], [1, 0], 1);
  assert.deepStrictEqual(head[0], [100, 50], "tip first");
  near(head[1][0], 100 - lib.ARROW.length, 1e-9, "wing is one arrow length back");
  near(head[1][1] + head[3][1], 100, 1e-9, "wings mirror across the axis");
  const small = lib.arrowHeadPoints([100, 50], [1, 0], 0.5);
  near(small[1][0], 98, 1e-9, "half scale halves the length");
}

// 설정 저장·복원
{
  const prefs = {};
  const saved = {...base, direction: 1, motion: 1, ball: 1, bgOn: false, surfaceOn: true, speed: 250, accel: 1200, interval: 0.05,
    count: 9, size: 6.5, ballK: 50, bgK: 70, distText: "12 cm", offsetX: -2, offsetY: 4.5, previewOn: false};
  make({...saved}, prefs).saveSettings();
  assert.ok(prefs["ObjectMotionPhoto/settings"].startsWith("v1|1|1|1|0|"), "settings start with the version tag and radios");
  const restored = {...base};
  make(restored, prefs).applySettings();
  assert.deepStrictEqual(restored, saved, "saved options come back");
  // 거리 글자의 | 는 저장 때 빠진다
  const piped = {...base, distText: "a|b"};
  make(piped, prefs).saveSettings();
  const back = {...base};
  make(back, prefs).applySettings();
  assert.strictEqual(back.distText, "ab", "separator is stripped from the text");
  // 필드 수가 다르면 무시
  prefs["ObjectMotionPhoto/settings"] = "v1|1|1";
  const untouched = {...base};
  make(untouched, prefs).applySettings();
  assert.deepStrictEqual(untouched, base, "a different field count is ignored");
  // 범위를 벗어난 값은 줄인다
  prefs["ObjectMotionPhoto/settings"] = "v1|9|9|9|1|1|1|1|99999|99999|99|99|99|999|999|999|999|x|1";
  const clamped = {...base};
  make(clamped, prefs).applySettings();
  assert.strictEqual(clamped.direction, 0, "out-of-range radio is ignored");
  assert.strictEqual(clamped.speed, 1000, "out-of-range number is clamped");
  assert.strictEqual(clamped.count, 30, "count is clamped");
}
console.log("check-motion-photo: ok");
