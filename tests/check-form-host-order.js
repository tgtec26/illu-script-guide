const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 폼 틀(피스톤 실린더.jsx에서 복사한 스크립트)은 runFormHost(...)가 창을 띄우고 닫힐 때까지 돌아온다.
// 그래서 그 줄보다 아래에 있는 IIFE 최상위 var는 창이 떠 있는 동안 내내 undefined다(선언만 끌어올려짐).
// 2026-10-14: 드롭다운 목록(var X_ITEMS)이 아래에 있어 items가 undefined → 숫자 행으로 그려져
// scrollbar.stepdelta = undefined에서 "데이터 유형이 일치하지 않습니다"가 났다(9개 스크립트).
// 함수만 잘라 검사하는 테스트는 표를 따로 잘라 넣어 이 순서를 보지 못하므로 여기서 따로 본다.
const root = path.join(__dirname, "..", "스크립트");
function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(p));
    else if (entry.name.endsWith(".jsx")) out.push(p);
  }
  return out;
}

const problems = [];
let checked = 0;
for (const file of walk(root)) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const call = lines.findIndex((line) => /^    runFormHost\(/.test(line));
  if (call < 0) continue;
  checked++;
  for (let i = call + 1; i < lines.length && !/^\}\)\(\);/.test(lines[i]); i++) {
    if (/^    var\s/.test(lines[i])) problems.push(`${path.relative(root, file)}:${i + 1} ${lines[i].trim().slice(0, 50)} (runFormHost는 ${call + 1}행)`);
  }
}
assert.ok(checked >= 10, `runFormHost 스크립트가 너무 적다: ${checked}`);
assert.deepStrictEqual(problems, [], "runFormHost(...)보다 아래에 최상위 var가 있다. 창이 떠 있는 동안 undefined이므로 위로 올린다:\n" + problems.join("\n"));
console.log(`form host order ok (${checked} scripts)`);
