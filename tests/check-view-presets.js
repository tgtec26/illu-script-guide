const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 시점 프리셋 줄: 3D.jsx 버튼, 별 시차.jsx VIEW_PRESETS, 웹 SOLID3D_VIEW_PRESETS가 같은 이름·값·순서여야 한다
const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const NUM = "(-?[\\d.]+)";

function solid3dPresets() {
  const source = read("스크립트", "06_도형", "3D.jsx");
  const names = {};
  const order = [];
  const buttonPattern = /var (\w+) = presetRow\.add\("button", undefined, "([^"]+)"\);/g;
  let m;
  while ((m = buttonPattern.exec(source))) {
    names[m[1]] = m[2];
    order.push(m[1]);
  }
  const views = {};
  const clickPattern = new RegExp(`(\\w+)\\.onClick = function\\(\\) \\{ setView\\(${NUM}, ${NUM}, ${NUM}\\); \\};`, "g");
  while ((m = clickPattern.exec(source))) views[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return order.map((v) => {
    assert.ok(views[v], `3D.jsx: ${names[v]} 버튼에 setView가 없다`);
    return [names[v]].concat(views[v]);
  });
}

function listPresets(source, start, pattern) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `missing: ${start}`);
  const body = source.slice(from, source.indexOf("];", from));
  const out = [];
  let m;
  while ((m = pattern.exec(body))) out.push([m[1], Number(m[2]), Number(m[3]), Number(m[4])]);
  return out;
}

const solid = solid3dPresets();
const parallax = listPresets(read("스크립트", "04_지구과학", "별 시차.jsx"), "var VIEW_PRESETS = [",
  new RegExp(`\\{name: "([^"]+)", y: ${NUM}, x: ${NUM}, z: ${NUM}\\}`, "g"));

assert.deepStrictEqual(solid, [
  ["정면", 0, 0, 0], ["등각", 45, 35.3, 0], ["측면", 90, 0, 0], ["윗면", 0, 90, 0],
  // 요(가로 회전) 0, 롤(화면 회전) 0, 피치(위아래 기울기) 15: 정면에서 조금 위에서 내려다본다
  ["15", 0, 15, 0]
]);
assert.deepStrictEqual(parallax, solid, "별 시차.jsx 시점 프리셋은 3D.jsx와 같은 값");

// 웹 판이 형제 폴더에 있으면 같이 비교한다 (웹 distance-brightness·solid3d·model3d가 이 목록을 같이 쓴다)
const webFile = path.resolve(root, "..", "sci-illu-web", "src", "generators", "solid3d.js");
if (fs.existsSync(webFile)) {
  const web = listPresets(fs.readFileSync(webFile, "utf8"), "export const SOLID3D_VIEW_PRESETS = [",
    new RegExp(`\\{ label: '([^']+)', rotY: ${NUM}, rotX: ${NUM}, rotZ: ${NUM} \\}`, "g"));
  assert.deepStrictEqual(web, solid, "웹 SOLID3D_VIEW_PRESETS는 3D.jsx와 같은 값");
}

console.log("view preset checks passed");
