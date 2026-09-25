const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "01_도형", "Object_StarTrails.jsx"), "utf8");

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

// `var NAME = [ ... ];` 배열 리터럴을 꺼낸다
function extractArray(name) {
  const start = source.indexOf(`var ${name} = [`);
  assert.ok(start >= 0, `missing array: ${name}`);
  let depth = 0;
  for (let index = source.indexOf("[", start); index < source.length; index++) {
    if (source[index] === "[") depth++;
    if (source[index] === "]") {
      depth--;
      if (depth === 0) return new Function(`return ${source.slice(source.indexOf("[", start), index + 1)};`)();
    }
  }
  throw new Error(`unbalanced array: ${name}`);
}

const names = ["makeRandom", "northArcs", "northTrails", "southTrails", "slantTrails", "corner", "arcPoints",
  "clamp", "buildStarMap", "normalizeDeg", "localSiderealDeg", "skyPosition", "makeCamera", "trailSegments",
  "presetCenter", "nearestDirection", "dotDiameter"];
const lib = new Function(`${names.map(extractFunction).join("\n")}\nreturn {${names.join(",")}};`)();
const STARS = extractArray("STARS");
const PRESETS = extractArray("PRESETS");
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= (tol || 1e-9), `${label}: expected ${b}, got ${a}`);
const angleOf = (p) => Math.atan2(p[1], p[0]);

// 북쪽: 한 시간 15°, 시계 반대 방향, 반지름은 고르게, 가장 바깥은 크기의 45%
{
  const arcs = lib.northArcs(5, 100, 3, 1);
  assert.strictEqual(arcs.length, 5);
  near(arcs[4].r, 45, 1e-9, "outer radius");
  for (let i = 0; i < 5; i++) {
    near(arcs[i].r, 45 * (i + 1) / 5, 1e-9, "even radii");
    near(arcs[i].end - arcs[i].start, Math.PI / 4, 1e-9, "3 h = 45°");
  }
  const trails = lib.northTrails(5, 100, 3, 1);
  for (let i = 0; i < 5; i++) {
    const first = trails[i][0].anchor, last = trails[i][trails[i].length - 1].anchor;
    near(Math.hypot(first[0], first[1]), arcs[i].r, 1e-9, "starts on circle");
    // 끝이 시작보다 반시계 방향으로 45° 앞선다
    let turn = angleOf(last) - angleOf(first);
    if (turn < 0) turn += 2 * Math.PI;
    near(turn, Math.PI / 4, 1e-9, "counter-clockwise");
  }
  assert.deepStrictEqual(lib.northArcs(5, 100, 3, 1), arcs, "same seed, same start angles");
  // 12시간이면 반 바퀴: 호 조각은 90° 이하
  assert.strictEqual(lib.northTrails(1, 100, 12, 1)[0].length, 3);
}

// 남쪽: 왼쪽에서 오른쪽으로, 3시간 호의 두 끝이 지평선(y = -크기/2) 위
{
  for (const trail of lib.southTrails(6, 100, 3)) {
    const first = trail[0].anchor, last = trail[trail.length - 1].anchor;
    assert.ok(first[0] < last[0], "east to west");
    assert.ok(first[1] > -50 && last[1] > -50, "ends above the horizon");
  }
}

// 동쪽은 오른쪽 위, 서쪽은 오른쪽 아래. 지평선과의 각은 90° − 위도, 길이는 3시간에 크기의 30%
{
  for (const rising of [true, false]) {
    for (const line of lib.slantTrails(4, 100, 3, 37.5, rising, 2)) {
      const a = line[0].anchor, b = line[1].anchor;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      assert.ok(dx > 0 && (rising ? dy > 0 : dy < 0), "direction");
      near(Math.atan2(Math.abs(dy), dx) * 180 / Math.PI, 52.5, 1e-9, "tilt = 90 − latitude");
      near(Math.hypot(dx, dy), 30, 1e-9, "length");
    }
  }
}
// -------------------------------------------------------
// 실제 별
// -------------------------------------------------------
const stars = lib.buildStarMap(STARS);
const altAz = (v) => ({ alt: Math.asin(v[2]) * 180 / Math.PI, az: lib.normalizeDeg(Math.atan2(v[0], v[1]) * 180 / Math.PI) });
const LAT = 37.5, LON = 127, KST = 9;
// 계절 대표일 (2026-01-01부터 0으로 센 날): 봄 4/15, 여름 7/15, 가을 10/15, 겨울 1/15
const DAY = { spring: 104, summer: 195, autumn: 287, winter: 14 };
const skyAt = (key, day, hour) => altAz(lib.skyPosition(stars[key].ra, stars[key].dec, lib.localSiderealDeg(day, hour - KST, LON), LAT));

// 별 표: 키 유일, 좌표 범위, 프리셋의 별·선이 모두 표에 있고 계절마다 프리셋이 있다
{
  assert.strictEqual(Object.keys(stars).length, STARS.length, "unique star keys");
  for (const [key, name, ra, dec, mag] of STARS) {
    assert.ok(typeof key === "string" && typeof name === "string", key);
    assert.ok(ra >= 0 && ra < 360 && dec >= -90 && dec <= 90 && typeof mag === "number", `range: ${key}`);
  }
  const ids = new Set();
  const seasons = new Set();
  for (const preset of PRESETS) {
    assert.ok(!ids.has(preset.id), `duplicate preset: ${preset.id}`);
    ids.add(preset.id);
    seasons.add(preset.season);
    assert.ok(preset.season >= -1 && preset.season <= 3, preset.id);
    for (const key of preset.stars) assert.ok(stars[key], `${preset.id}: unknown star ${key}`);
    for (const chain of preset.lines) for (const key of chain) assert.ok(preset.stars.includes(key), `${preset.id}: line star ${key} not in stars`);
  }
  for (const season of [-1, 0, 1, 2, 3]) assert.ok(seasons.has(season), `season ${season} has presets`);
  assert.ok(ids.has("orion") && stars.polaris, "defaults exist");
}

// 항성시·지평 좌표: 잘 알려진 하늘 (서울 21시)
{
  // 4월 15일: 북두칠성이 북극성 위 높이 (남중 무렵)
  const dubheSpring = skyAt("dubhe", DAY.spring, 21);
  assert.ok(dubheSpring.alt > 55 && (dubheSpring.az < 25 || dubheSpring.az > 335), `Dubhe spring ${JSON.stringify(dubheSpring)}`);
  // 10월 15일: 북두칠성이 북쪽 지평선 가까이 (하방 남중 무렵)
  const dubheAutumn = skyAt("dubhe", DAY.autumn, 21);
  assert.ok(dubheAutumn.alt > 3 && dubheAutumn.alt < 22, `Dubhe autumn ${JSON.stringify(dubheAutumn)}`);
  // 1월 15일: 오리온이 남동쪽 하늘 높이
  const betelgeuse = skyAt("betelgeuse", DAY.winter, 21);
  assert.ok(betelgeuse.alt > 40 && betelgeuse.alt < 62 && betelgeuse.az > 120 && betelgeuse.az < 180, `Betelgeuse ${JSON.stringify(betelgeuse)}`);
  // 7월 15일: 전갈자리 안타레스가 남쪽 낮게
  const antares = skyAt("antares", DAY.summer, 21);
  assert.ok(antares.alt > 20 && antares.alt < 32 && antares.az > 160 && antares.az < 200, `Antares ${JSON.stringify(antares)}`);
  // 북극성은 언제나 고도 ≈ 위도, 자오선 위의 별은 고도 90 − 위도 + 적위, 방위 180
  for (const lst of [0, 90, 200, 330]) {
    near(altAz(lib.skyPosition(stars.polaris.ra, stars.polaris.dec, lst, LAT)).alt, LAT, 0.75, "Polaris altitude");
    const meridian = altAz(lib.skyPosition(lst, -10, lst, LAT));
    near(meridian.alt, 90 - LAT - 10, 1e-9, "meridian altitude");
    near(meridian.az, 180, 1e-9, "meridian azimuth");
  }
  near(lib.normalizeDeg(-30), 330, 1e-9, "normalize");
}

// 카메라: 가운데는 (0, 0), 지평선은 y = −focal·tan(고도), 북극을 가운데 둔 북쪽 시야에서 별의 궤적 반지름은 focal·tan(90° − 적위)
{
  const focal = 100;
  for (const az0 of [0, 90, 180, 270]) {
    const camera = lib.makeCamera(az0, 30, focal);
    const center = camera([Math.sin(az0 * Math.PI / 180) * Math.cos(Math.PI / 6), Math.cos(az0 * Math.PI / 180) * Math.cos(Math.PI / 6), 0.5]);
    near(center[0], 0, 1e-9, "center x");
    near(center[1], 0, 1e-9, "center y");
    for (const az of [az0 - 40, az0, az0 + 40]) {
      const rad = az * Math.PI / 180;
      near(camera([Math.sin(rad), Math.cos(rad), 0])[1], -focal * Math.tan(Math.PI / 6), 1e-9, "horizon is a straight line");
    }
    assert.strictEqual(camera([-Math.sin(az0 * Math.PI / 180), -Math.cos(az0 * Math.PI / 180), 0]), null, "behind the camera");
  }
  const north = lib.makeCamera(0, LAT, focal);
  const radius = focal * Math.tan((90 - stars.dubhe.dec) * Math.PI / 180);
  for (const lst of [0, 60, 120, 240]) {
    const p = north(lib.skyPosition(stars.dubhe.ra, stars.dubhe.dec, lst, LAT));
    near(Math.hypot(p[0], p[1]), radius, 1e-6, "concentric circle around the pole");
  }
  // 동쪽 시야: 오른쪽이 남쪽 (뜨는 별이 오른쪽 위로)
  const east = lib.makeCamera(90, 30, focal);
  assert.ok(east(lib.skyPosition(0, 0, -10, LAT))[0] > 0, "south is on the right when facing east");
}

// 궤적: 주극성은 24시간 한 조각(표본 수 + 1), 지평선을 드나드는 별은 조각마다 지평선 위, 늘 안 보이는 별은 없음.
// 북쪽 하늘의 궤적은 시계 반대 방향
{
  const focal = 100;
  const north = lib.makeCamera(0, LAT, focal);
  const horizonY = -focal * Math.tan(LAT * Math.PI / 180);
  const dubhe = lib.trailSegments(stars.dubhe, 0, 24, LAT, north, 2);
  assert.strictEqual(dubhe.length, 1, "circumpolar: one segment");
  assert.strictEqual(dubhe[0].length, 181, "sample count");
  const alkaid = lib.trailSegments(stars.alkaid, 0, 24, LAT, north, 2);
  assert.ok(alkaid.length >= 1 && alkaid.reduce((n, s) => n + s.length, 0) < 181, "Alkaid dips below the horizon");
  for (const segment of alkaid) for (const p of segment) assert.ok(p[1] >= horizonY - 1e-4, "clipped at the horizon");
  const ends = alkaid.map((s) => [s[0][1], s[s.length - 1][1]]).flat().filter((y) => Math.abs(y - horizonY) < 1e-4);
  assert.ok(ends.length >= 2, "segments start or end on the horizon");
  assert.strictEqual(lib.trailSegments({ ra: 0, dec: -80 }, 0, 24, LAT, north, 2).length, 0, "never rises");
  const arc = lib.trailSegments(stars.dubhe, 30, 3, LAT, north, 2)[0];
  for (let i = 1; i < arc.length; i++) {
    let turn = Math.atan2(arc[i][1], arc[i][0]) - Math.atan2(arc[i - 1][1], arc[i - 1][0]);
    if (turn < -Math.PI) turn += 2 * Math.PI;
    assert.ok(turn > 0, "counter-clockwise around the pole");
  }
}

// 방향 자동 선택과 별 점 크기
{
  assert.deepStrictEqual([350, 100, 150, 260].map(lib.nearestDirection), [0, 1, 2, 3]);
  const orion = PRESETS.find((p) => p.id === "orion").stars.map((k) => stars[k]);
  const center = lib.presetCenter(orion, lib.localSiderealDeg(DAY.winter, 21 - KST, LON), LAT);
  assert.strictEqual(lib.nearestDirection(center.az), 2, `Orion faces south in January: ${JSON.stringify(center)}`);
  const dipper = PRESETS.find((p) => p.id === "big-dipper").stars.map((k) => stars[k]);
  assert.strictEqual(lib.nearestDirection(lib.presetCenter(dipper, lib.localSiderealDeg(DAY.autumn, 21 - KST, LON), LAT).az), 0, "Big Dipper faces north in October");
  assert.ok(lib.dotDiameter(-1.5, 60) > lib.dotDiameter(0, 60) && lib.dotDiameter(0, 60) > lib.dotDiameter(3, 60), "brighter is bigger");
  near(lib.dotDiameter(0, 60), 1.6, 1e-9, "0 mag");
  near(lib.dotDiameter(6, 30), 0.2, 1e-9, "clamped and scaled");
}

assert.ok(source.includes('var PREF_KEY = "ObjectStarTrails/settings";'));
assert.ok(source.includes('["v2", direction') && source.includes('p[0] !== "v2" || p.length !== 21'), "settings v2");
// 안내 홈페이지 탭 이름은 스크립트의 탭 라벨과 같다
const app = fs.readFileSync(path.join(root, "docs", "assets", "app.js"), "utf8");
for (const name of ["개념도", "실제 별"]) {
  assert.ok(source.includes(`"${name}"`), `tab label ${name}`);
  assert.ok(app.includes(`name: "${name}"`), `app.js tab ${name}`);
}
assert.ok(app.includes('id: "real-stars"') && app.includes('id: "schematic"'));
// 각도 글자의 도(°)는 GSMediumB1의 U+02D8 글리프로 바꿔 넣는다
assert.ok(source.includes('var DEGREE_GLYPH = "\\u02D8";'));
assert.ok(source.includes("frame.contents = text.replace(/\\u00B0/g, DEGREE_GLYPH);"));
console.log("star trail checks passed");
