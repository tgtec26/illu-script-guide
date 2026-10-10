// 화살촉 4종류의 기준 데이터(tools/arrowheads.json)와 비교 도구. 각 스크립트 안의 HEAD_CATALOG가 이 파일과 같은지 검사한다
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tools", "arrowheads.json"), "utf8"));
assert.strictEqual(catalog.types.length, 4);

// 스크립트의 `var HEAD_CATALOG = [...];` 블록을 꺼내 값으로 돌려준다
function loadCatalog(source, label) {
  const start = source.indexOf("var HEAD_CATALOG = [");
  assert.ok(start >= 0, `${label}: HEAD_CATALOG`);
  // 들여쓰기가 다른(탭 안쪽에 있는) 선언도 찾는다
  const closing = /\n\s*\];/.exec(source.slice(start));
  const stop = closing ? start + closing.index : -1;
  assert.ok(stop > start, `${label}: HEAD_CATALOG end`);
  return new Function(`${source.slice(start, stop)}\n];\nreturn HEAD_CATALOG;`)();
}

function assertSameCatalog(source, label) {
  const got = loadCatalog(source, label);
  assert.strictEqual(got.length, 4, `${label}: four heads`);
  catalog.types.forEach((type, i) => {
    assert.strictEqual(got[i].length, type.length, `${label}: ${type.id} length`);
    assert.strictEqual(got[i].lineEnd, type.lineEnd, `${label}: ${type.id} lineEnd`);
    assert.deepStrictEqual(got[i].poly, type.poly, `${label}: ${type.id} outline`);
  });
}

// 끝 tip, 방향 단위 벡터 d, 배율 k로 shape 모양의 기대 점들
function expectedPoints(shape, tip, d, k) {
  const n = [-d[1], d[0]];
  return catalog.types[shape].poly.map((p) => [tip[0] - d[0] * p[1] * k + n[0] * p[0] * k, tip[1] - d[1] * p[1] * k + n[1] * p[0] * k]);
}

function nearPoints(actual, expected, label) {
  assert.strictEqual(actual.length, expected.length, `${label}: point count`);
  actual.forEach((p, i) => {
    assert.ok(Math.abs(p[0] - expected[i][0]) < 1e-9 && Math.abs(p[1] - expected[i][1]) < 1e-9, `${label}: point ${i} ${p} vs ${expected[i]}`);
  });
}

module.exports = {catalog, loadCatalog, assertSameCatalog, expectedPoints, nearPoints};
