// 스크립트 파일 이름만 알 때 과목별 폴더(01_물리학~06_도형)에서 경로를 찾는다
const fs = require("fs");
const path = require("path");
const FOLDERS = ["01_물리학", "02_화학", "03_생명과학", "04_지구과학", "05_수학", "06_도형"];
module.exports = function scriptPath(root, file) {
  for (const folder of FOLDERS) {
    const candidate = path.join(root, "스크립트", folder, file);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("script not found: " + file);
};
