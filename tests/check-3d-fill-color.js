const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

// 3D.jsx 면 색: 색상·채도를 입힌 HSL(밝기 = 1 − K/100). 채도 0이면 예전 K 회색 그대로이고,
// 웹 solid-view.js kToColor와 같은 RGB가 나와야 한다
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "스크립트", "06_도형", "3D.jsx"), "utf8");
const colorCode = source.slice(source.indexOf("    function tintKey()"), source.indexOf("    function makeStrokeColor()"));

function load(cmyk) {
  const c = {
    fillHue: 210, fillSaturation: 0, documentIsCmyk: cmyk, kColorCache: {},
    CMYKColor: function () {}, RGBColor: function () {},
  };
  vm.createContext(c);
  vm.runInContext(colorCode, c);
  return c;
}
const rgbOf = (color) => [color.red, color.green, color.blue];
const cmykOf = (color) => [color.cyan, color.magenta, color.yellow, color.black];

{
  const rgb = load(false), cmyk = load(true);
  for (const k of [0, 30, 55, 100]) {
    const grey = Math.round(255 * (1 - k / 100));
    assert.deepStrictEqual(rgbOf(rgb.makeKColor(k)), [grey, grey, grey], "saturation 0 keeps the RGB grey");
    assert.deepStrictEqual(cmykOf(cmyk.makeKColor(k)), [0, 0, 0, k], "saturation 0 keeps CMYK 0,0,0,K");
  }
  rgb.fillHue = 0; rgb.fillSaturation = 100; cmyk.fillHue = 0; cmyk.fillSaturation = 100;
  assert.deepStrictEqual(rgbOf(rgb.makeKColor(50)), [255, 0, 0]);
  assert.deepStrictEqual(cmykOf(cmyk.makeKColor(50)), [0, 100, 100, 0]);
  assert.deepStrictEqual(rgbOf(rgb.makeKColor(0)), [255, 255, 255], "K0 stays white");
  assert.deepStrictEqual(cmykOf(cmyk.makeKColor(100)), [0, 0, 0, 100], "K100 stays black");
  // 색이 바뀌면 같은 K라도 캐시를 다시 쓰지 않는다
  rgb.fillHue = 120;
  assert.deepStrictEqual(rgbOf(rgb.makeKColor(50)), [0, 255, 0]);
}

// 웹 판이 형제 폴더에 있으면 같은 색인지 비교한다
const webFile = path.resolve(root, "..", "sci-illu-web", "src", "generators", "solid-view.js");
const done = () => console.log("3d fill colour checks passed");
if (fs.existsSync(webFile)) {
  import(webFile).then(({ kToColor }) => {
    const c = load(false);
    for (const hue of [0, 45, 210, 300, 359]) {
      for (const saturation of [0, 25, 60, 100]) {
        for (const k of [0, 12, 30, 64, 100]) {
          c.fillHue = hue; c.fillSaturation = saturation;
          const hex = "#" + rgbOf(c.makeKColor(k)).map((v) => v.toString(16).padStart(2, "0")).join("");
          assert.strictEqual(hex, kToColor(k, hue, saturation), `hue ${hue} saturation ${saturation} K ${k}`);
        }
      }
    }
    done();
  }).catch((error) => { console.error(error); process.exit(1); });
} else {
  done();
}
