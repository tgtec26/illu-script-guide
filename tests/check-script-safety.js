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
const textInput = "스크립트/02_문자/Text_input.jsx";
const findSimilar = "스크립트/10_기타/find-replace.jsx";
const updaterFiles = ["update-mac.command", "update-windows.ps1", "UPDATE.md"];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function readBuffer(file) {
  return fs.readFileSync(path.join(root, file));
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

{
  const source = read(textInput);
  if (!source.includes('buttonGroup.add("button", undefined, "①, ②, ③, ④, ⑤")') ||
      !source.includes('selectedOption = 7') ||
      !source.includes('contentsArray = ["①", "②", "③", "④", "⑤"]')) {
    console.error(`${textInput}: must offer circled number text inserts`);
    failures++;
  }
}

for (const file of updaterFiles) {
  const source = read(file);
  if (!source.includes("https://github.com/tgtec26/illu-script.git")) {
    console.error(`${file}: updater must point to GitHub repository`);
    failures++;
  }
}

{
  const source = read("update-mac.command");
  if (!source.includes("rsync -a --delete") || !source.includes("sudo")) {
    console.error("update-mac.command: must sync managed folders and handle app-folder permissions");
    failures++;
  }
  if (!source.includes('TARGET_DIR="$APP_DIR/Presets.localized/ko_KR/스크립트"')) {
    console.error("update-mac.command: must prefer Korean localized Illustrator script folder");
    failures++;
  }
}

{
  const source = read("update-windows.ps1");
  const bytes = readBuffer("update-windows.ps1");
  if (!source.includes("Adobe Illustrator*") || !source.includes("Remove-Item") || !source.includes("Copy-Item")) {
    console.error("update-windows.ps1: must find Illustrator and replace managed folders");
    failures++;
  }
  if (!source.includes("InstallLocation") || !source.includes("Microsoft\\Windows\\CurrentVersion\\Uninstall")) {
    console.error("update-windows.ps1: must find Illustrator from Windows installed-app registry entries");
    failures++;
  }
  if (!source.includes("Join-Path $Root \"Adobe\"")) {
    console.error("update-windows.ps1: must search the common Program Files Adobe subfolder");
    failures++;
  }
  if (!source.includes("#Requires -Version 5.1")) {
    console.error("update-windows.ps1: must explicitly support Windows PowerShell 5.1 or newer");
    failures++;
  }
  if (bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) {
    console.error("update-windows.ps1: must be saved as UTF-8 with BOM for Windows PowerShell 5.1 Korean paths");
    failures++;
  }
}

{
  const source = read("update-windows.cmd");
  const bytes = readBuffer("update-windows.cmd");
  if (!source.includes("powershell.exe") ||
      !source.includes("-ExecutionPolicy Bypass") ||
      !source.includes("-File \"%SCRIPT_DIR%update-windows.ps1\"")) {
    console.error("update-windows.cmd: must launch the PowerShell updater by double-click");
    failures++;
  }
  if (!bytes.includes(Buffer.from("\r\n")) || bytes.includes(Buffer.from("@echo off\n"))) {
    console.error("update-windows.cmd: must use CRLF line endings for cmd.exe");
    failures++;
  }
}

{
  const source = read(findSimilar);
  const required = [
    'var chkGeometry',
    'geometry: true',
    'var chkObjectType',
    'objectType: true',
    'var chkFill',
    'fill: true',
    'var chkStroke',
    'stroke: true',
    'var chkStrokeWidth',
    'strokeWidth: true',
    'var chkSize',
    'size: true',
    'var chkScaleAllowed',
    'scaleAllowed: false',
    'var chkRotationAllowed',
    'rotationAllowed: false',
    'var chkMirrorAllowed',
    'mirrorAllowed: false',
    'function geometryMatches',
    'function collectPathItems',
    'function colorsMatch',
    'if (o.size && !o.scaleAllowed && !sizeMatchesBounds',
    'FindSimilar_settings.json',
    'function loadSettings',
    'function saveSettings',
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      console.error(`${findSimilar}: missing ${token}`);
      failures++;
    }
  }
}

process.exit(failures === 0 ? 0 : 1);
