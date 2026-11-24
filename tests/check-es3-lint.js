// ES3 린트(tests/es3-lint.js)가 진짜 문법만 잡고, 주석·문자열·정규식 안의 글자는 지나치는지 확인한다
const assert = require("assert");
const es3Lint = require("./es3-lint.js");

// 문법이 아닌 곳: 걸리면 안 된다
const fine = [
  'var mask = text.replace(/[^0-9~\\-–, ]/g, "");',   // 정규식 글자 묶음 끝의 ", ]" (유전 정보 흐름.jsx)
  'if (!/^[0-9~\\-–, ]*$/.test(s) || !/^[0-9]{8}$/.test(t)) return;',
  'var quote = s.replace(/["\'], ]/g, "");',
  'var s = "a => b", t = "읽는 중...", u = \'`\', v = "[1, 2,]";',
  'var url = "http://example.com/a,]";',
  '/** @param {...number} rest 끝 쉼표 예: [1, 2,] */\nfunction f() {}',
  'var a = [1, 2]; //끝 쉼표 예: [1, 2,]',
  'var half = total / 2, ratio = a / b;'
];
for (const source of fine) es3Lint(source, "fine");

// 진짜 문법: 걸려야 한다
const broken = [
  ['var a = [1, 2,];', "끝 쉼표"],
  ['var o = {a: 1,\n};', "끝 쉼표"],
  ['var g = (x) => x;', "화살표 함수"],
  ['let a = 1;', "let"],
  ['const a = 1;', "const"],
  ['var s = `a`;', "템플릿 문자열"],
  ['list.forEach(function() {});', "배열 고차 함수"],
  ['var k = Object.keys(o);', "ES5 내장"],
  ['f(...args);', "펼침 연산자"],
  ['export function f() {}', "모듈 문법"],
  // 문자열·정규식·나눗셈 사이에 있는 진짜 문법을 같이 지우면 안 된다
  ['var s = "a"; var bad = [1,]; var t = "b";', "끝 쉼표"],
  ['var r = /a/g; var bad = [1,]; var q = /b/;', "끝 쉼표"],
  ['var half = a / 2; var bad = [1,]; var third = b / 3;', "끝 쉼표"],
  ['var n = count++ / 2; var bad = [1,]; var m = b / 3;', "끝 쉼표"]
];
for (const [source, name] of broken) {
  assert.throws(() => es3Lint(source, "broken"), (error) => error.message.includes(name), `must be caught as ${name}: ${source}`);
}

console.log(`PASS: es3 lint ignores ${fine.length} comment/string/regex cases and catches ${broken.length} real ES3 breaks`);
