// 600ppi·1200ppi PNG 복사(11_내보내기/png_clip_helper.jsxinc)의 Mac 쪽을 확인한다
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const assert = require("assert");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const folder = path.join(root, "스크립트", "11_내보내기");
const source = fs.readFileSync(path.join(folder, "png_clip_helper.jsxinc"), "utf8");

// Mac에서 "Windows 전용" 알림으로 끝나지 않고 도우미 앱을 실행한다
assert.ok(!/Windows에서만/.test(source), "helper must not stop on Mac");
assert.ok(source.includes('"/png_clip_mac.app").execute()'), "Mac branch must launch png_clip_mac.app");
assert.ok(source.includes('requestFile.lineFeed = "Unix"'), "request file must end its line with LF (the default is CR)");

// 도우미 앱은 실행 권한이 저장소에 기록돼 있어야 한다 (일러 스크립트는 권한을 줄 수 없다)
const helperApp = "스크립트/11_내보내기/png_clip_mac.app/Contents/MacOS/png_clip_mac";
const mode = execFileSync("git", ["-c", "core.quotepath=off", "ls-files", "-s", "--", helperApp], { cwd: root, encoding: "utf8" });
assert.ok(/^100755 /.test(mode), "png_clip_mac must be committed as executable (100755): " + mode);
assert.ok(fs.existsSync(path.join(folder, "png_clip_mac.app", "Contents", "Info.plist")), "Info.plist must exist");

// setPngPpi: 해상도 정보(pHYs)를 IHDR 바로 뒤에 한 번만 적고 나머지 바이트는 그대로 둔다
const start = source.indexOf("    function setPngPpi(");
const end = source.indexOf("\n    }\n", start) + 6;
assert.ok(start > 0 && end > start, "setPngPpi must exist");
const setPngPpi = new Function(source.slice(start, end) + "\nreturn setPngPpi;")();

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) : crc32(body));
  return Buffer.concat([size, body, crc]);
}
function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function readChunks(buffer) {
  const chunks = [];
  for (let at = 8; at < buffer.length;) {
    const size = buffer.readUInt32BE(at);
    const body = buffer.subarray(at + 4, at + 8 + size);
    assert.strictEqual(buffer.readUInt32BE(at + 8 + size), crc32(body), "chunk CRC must match");
    chunks.push({ type: body.subarray(0, 4).toString("latin1"), data: body.subarray(4) });
    at += 12 + size;
  }
  return chunks;
}
function FakeFile(file) { this.file = file; }
FakeFile.prototype.open = function () { return true; };
FakeFile.prototype.read = function () { return fs.readFileSync(this.file, "latin1"); };   // 일러의 BINARY 인코딩과 같다
FakeFile.prototype.write = function (text) { fs.writeFileSync(this.file, text, "latin1"); return true; };
FakeFile.prototype.close = function () {};

const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
const idat = zlib.deflateSync(Buffer.from([0, 255, 0, 13, 10]));   // CR·LF 바이트가 바뀌지 않는지도 본다
const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const old72 = Buffer.from([0, 0, 0x0B, 0x13, 0, 0, 0x0B, 0x13, 1]);
const temp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "png-clip-")), "test.png");

for (const [label, parts] of [
  ["without pHYs", [chunk("IHDR", ihdr), chunk("tEXt", Buffer.from("Software\0Adobe")), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]],
  ["with old pHYs", [chunk("IHDR", ihdr), chunk("tEXt", Buffer.from("Software\0Adobe")), chunk("pHYs", old72), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]]
]) {
  for (const ppi of [600, 1200]) {
    fs.writeFileSync(temp, Buffer.concat([signature].concat(parts)));
    setPngPpi(new FakeFile(temp), ppi);
    const result = fs.readFileSync(temp);
    assert.ok(result.subarray(0, 8).equals(signature), label + ": signature must stay");
    const chunks = readChunks(result);
    assert.deepStrictEqual(chunks.map((c) => c.type), ["IHDR", "pHYs", "tEXt", "IDAT", "IEND"], label + ": pHYs once, right after IHDR");
    assert.strictEqual(chunks[1].data.readUInt32BE(0), Math.round(ppi / 0.0254), label + ": pixels per metre");
    assert.strictEqual(chunks[1].data.readUInt32BE(4), Math.round(ppi / 0.0254));
    assert.strictEqual(chunks[1].data[8], 1, "unit must be metre");
    assert.ok(chunks[3].data.equals(idat), label + ": image data must not change");
  }
}

fs.writeFileSync(temp, "not a png");
assert.throws(() => setPngPpi(new FakeFile(temp), 600), "a file that is not a PNG must be rejected");
assert.strictEqual(fs.readFileSync(temp, "utf8"), "not a png", "a rejected file must not be rewritten");
fs.rmSync(path.dirname(temp), { recursive: true });

console.log("PASS: Mac branch, executable helper app, pHYs written once after IHDR, non-PNG rejected");
