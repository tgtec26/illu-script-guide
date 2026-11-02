// Windows 더블클릭 진입점: 준비 확인 뒤 브라우저를 열고 서버 로그를 유지한다.
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

function adminUrl(value = process.env.UI_ADMIN_PORT || '5200') {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error('UI_ADMIN_PORT는 1~65535 정수여야 합니다.');
  }
  return `http://127.0.0.1:${Number(value)}/`;
}
function probe(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(res.statusCode === 200 && body.includes('<title>대화상자 편집</title>') ? 'ready' : 'occupied'));
      res.on('error', () => resolve('offline'));
    });
    req.setTimeout(1000, () => req.destroy());
    req.on('error', () => resolve('offline'));
  });
}
async function waitUntilReady(url, child) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode) throw new Error('서버가 종료됐습니다. 위 오류를 확인해주세요.');
    const state = await probe(url);
    if (state === 'ready') return;
    if (state === 'occupied') throw new Error('이 포트를 다른 프로그램이 사용 중입니다. UI_ADMIN_PORT를 변경해주세요.');
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('서버 준비 시간이 초과됐습니다. 위 오류를 확인해주세요.');
}
async function launch() {
  const url = adminUrl();
  const state = await probe(url);
  let child;
  if (state === 'occupied') throw new Error('이 포트를 다른 프로그램이 사용 중입니다. UI_ADMIN_PORT를 변경해주세요.');
  if (state === 'offline') {
    child = spawn(process.execPath, [path.join(__dirname, 'ui-admin.js'), ...process.argv.slice(2)], {
      cwd: path.join(__dirname, '..'), stdio: 'inherit'
    });
    const stop = () => { if (child.exitCode === null) child.kill(); };
    process.on('SIGINT', () => { stop(); process.exit(130); });
    process.on('SIGTERM', () => { stop(); process.exit(143); });
    try { await waitUntilReady(url, child); } catch (error) { stop(); throw error; }
    console.log('이 창을 열어 두세요. 서버 종료: Ctrl+C');
  } else console.log('이미 실행 중인 UI 관리 페이지를 엽니다.');
  console.log(url);
  const browser = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { stdio: 'ignore', windowsHide: true });
  browser.on('error', (error) => console.error('브라우저를 열지 못했습니다. 위 주소를 직접 열어주세요: ' + error.message));
}
module.exports = { adminUrl, probe, waitUntilReady };
if (require.main === module) launch().catch((error) => { console.error(error.message); process.exitCode = 1; });
