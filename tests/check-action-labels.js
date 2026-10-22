// 액션 파일이 부르는 스크립트(메뉴 이름 "폴더: 스크립트")가 지금 폴더 구조에 실제로 있는지 검사한다
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../스크립트');
const aia = fs.readFileSync(path.join(root, '00_세팅/cjhaction_260624.aia'), 'utf8');

// 명령 메뉴 항목 이름(key 1818455661)은 UTF-8을 16진수로 적어 둔다
const labels = [...aia.matchAll(/\/key 1818455661\s*\/showInPalette -1\s*\/type \(ustring\)\s*\/value \[ \d+\s*([0-9a-f\s]+?)\s*\]/g)]
  .map((m) => Buffer.from(m[1].replace(/\s/g, ''), 'hex').toString('utf8'));
const scriptLabels = labels.filter((l) => l.includes(': '));
assert.ok(scriptLabels.length >= 19, `스크립트를 부르는 액션 단계가 너무 적다: ${scriptLabels.length}`);

const missing = scriptLabels.filter((label) => {
  const [folder, name] = label.split(': ');
  return !fs.existsSync(path.join(root, folder, name + '.jsx'));
});
assert.deepEqual(missing, [], `액션이 없는 스크립트를 부른다:\n${missing.join('\n')}`);
console.log(`액션 스크립트 호출 ${scriptLabels.length}개 모두 현재 폴더 구조에 있음`);
