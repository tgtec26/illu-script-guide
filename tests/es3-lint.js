// 일러스트레이터(ExtendScript, ES3)가 읽지 못하는 문법이 들어갔는지 훑는다. 노드 테스트가 통과해도 일러에서 멈추는 일을 막으려는 것
module.exports = function es3Lint(source, label) {
  const code = source.split("\n").map((line) => line.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/ .*$/, "")).join("\n");
  const banned = [[/=>/, "화살표 함수"], [/\blet\s/, "let"], [/\bconst\s/, "const"], [/`/, "템플릿 문자열"], [/\.(map|forEach|filter|reduce|some|every)\(/, "배열 고차 함수"],
    [/Object\.keys|Array\.isArray|\.trim\(\)|JSON\./, "ES5 내장"], [/\.\.\./, "펼침 연산자"], [/(?<!\\s),\s*[\]}]/, "끝 쉼표"]];
  for (const [re, name] of banned) {
    const hit = re.exec(code);
    if (hit) throw new Error(`${label}: ES3에서 못 읽는 문법(${name}): ...${code.slice(Math.max(0, hit.index - 30), hit.index + 30).replace(/\n/g, " ")}...`);
  }
};
