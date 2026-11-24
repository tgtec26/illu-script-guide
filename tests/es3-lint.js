// 일러스트레이터(ExtendScript, ES3)가 읽지 못하는 문법이 들어갔는지 훑는다. 노드 테스트가 통과해도 일러에서 멈추는 일을 막으려는 것
module.exports = function es3Lint(source, label) {
  const code = codeOnly(source);
  const banned = [[/=>/, "화살표 함수"], [/\blet\s/, "let"], [/\bconst\s/, "const"], [/`/, "템플릿 문자열"], [/\.(map|forEach|filter|reduce|some|every)\(/, "배열 고차 함수"],
    [/Object\.keys|Array\.isArray|\.trim\(\)|JSON\./, "ES5 내장"], [/\.\.\./, "펼침 연산자"], [/(?<!\\s),\s*[\]}]/, "끝 쉼표"], [/^\s*(export|import)\s/m, "모듈 문법(export·import)"]];
  for (const [re, name] of banned) {
    const hit = re.exec(code);
    if (hit) throw new Error(`${label}: ES3에서 못 읽는 문법(${name}): ...${code.slice(Math.max(0, hit.index - 30), hit.index + 30).replace(/\n/g, " ")}...`);
  }
};

// 주석은 지우고 문자열은 "", 정규식은 /x/로 바꾼다. 그 안의 글자는 문법이 아니다 (정규식 /[^0-9, ]/의 ", ]"를 끝 쉼표로 읽지 않게)
function codeOnly(source) {
  let out = "";
  for (let i = 0; i < source.length;) {
    const c = source[i];
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
    } else if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
    } else if (c === '"' || c === "'") {
      for (i++; i < source.length && source[i] !== c && source[i] !== "\n"; i++) if (source[i] === "\\") i++;
      if (source[i] === c) i++;
      out += '""';
    } else if (c === "/" && regexEnd(source, i) && /(^|[(,=:[!&|?{};]|\breturn|\btypeof|\bcase)$/.test(out.slice(-200).trimEnd())) {
      // 값이 올 자리의 /만 정규식이다. 값 뒤의 /는 나눗셈이므로 그대로 둔다
      i = regexEnd(source, i);
      out += "/x/";
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

// start의 /로 시작하는 정규식이 같은 줄에서 끝나면 그 다음 위치(플래그 뒤), 아니면 0
function regexEnd(source, start) {
  let inClass = false;
  for (let i = start + 1; i < source.length && source[i] !== "\n"; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === "[") inClass = true;
    else if (source[i] === "]") inClass = false;
    else if (source[i] === "/" && !inClass) {
      for (i++; /[a-z]/.test(source[i] || ""); i++);
      return i;
    }
  }
  return 0;
}
