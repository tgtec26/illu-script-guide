const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const alignFiles = [
  "스크립트/05_정렬/Align_1mmHcenterB.jsx",
  "스크립트/05_정렬/Align_1mmHcenterS.jsx",
  "스크립트/05_정렬/Align_1mmVcenterB.jsx",
  "스크립트/05_정렬/Align_1mmVcenterS.jsx",
];

const artboardGenerator = "스크립트/04_삽입/Input_setborard.jsx";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function lineOf(source, pattern) {
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return -1;
}

let failures = 0;

for (const file of alignFiles) {
  const source = read(file);
  const guardLine = lineOf(source, /app\.documents\.length\s*={2,3}\s*0/);
  const activeDocLine = lineOf(source, /app\.activeDocument/);

  if (guardLine < 1 || activeDocLine < 1 || guardLine > activeDocLine) {
    console.error(`${file}: app.documents.length guard must run before app.activeDocument`);
    failures++;
  }

  if (!/finally\s*\{[\s\S]*tempObj\.remove\(\)/.test(source)) {
    console.error(`${file}: temporary outlined text duplicate must be removed in finally`);
    failures++;
  }
}

{
  const source = read(artboardGenerator);
  if (!/setIntegerPreference\(\s*["']rulerType["']\s*,\s*unitValue\s*\)/.test(source) ||
      !/setGeneralUnits\(\s*1\s*\)/.test(source)) {
    console.error(`${artboardGenerator}: general units must be set to millimeters with rulerType=1`);
    failures++;
  }
  if (!/new\s+DocumentPreset\s*\(\s*\)/.test(source) ||
      !/preset\.units\s*=\s*isPixel\s*\?\s*RulerUnits\.Pixels\s*:\s*RulerUnits\.Millimeters/.test(source) ||
      !/documents\.addDocument\(/.test(source)) {
    console.error(`${artboardGenerator}: new documents must be created with DocumentPreset.units`);
    failures++;
  }
}

process.exit(failures === 0 ? 0 : 1);
