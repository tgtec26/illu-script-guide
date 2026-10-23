#target illustrator
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 활성 대지를 1200ppi PNG로 내보내고 그 이미지를 클립보드에 복사한다 (한글 등에 바로 붙여넣기)
// 일러스트레이터 스크립트에는 클립보드·외부 명령 기능이 없어, 임시 PowerShell 파일을 .vbs로 숨겨 실행한다(Windows 전용)
(function() {
    var TARGET_PPI = 1200;
    var WAIT_MS = 60000;      // 클립보드 복사를 기다리는 최대 시간
    var BACKGROUND_WHITE = true;   // 클립보드 이미지는 투명을 못 지켜 흰 배경으로 내보낸다

    if (app.documents.length === 0) { alert("열려있는 문서가 없습니다."); return; }
    if ($.os.indexOf("Windows") < 0) { alert("이 스크립트는 Windows에서만 클립보드에 복사할 수 있습니다."); return; }

    // vbs는 ANSI라 한글 경로를 못 읽는다. 임시 폴더 경로에 한글이 있으면 공용 폴더를 쓴다
    var base = Folder.temp.fsName;
    if (/[^\x00-\x7F]/.test(base)) base = "C:\\Users\\Public";
    var pngFile = new File(base + "\\illu_clip_" + TARGET_PPI + "ppi.png");
    var psFile = new File(base + "\\illu_clip_copy.ps1");
    var vbsFile = new File(base + "\\illu_clip_copy.vbs");
    var markFile = new File(base + "\\illu_clip_done.txt");

    function removeFile(f) { try { if (f.exists) f.remove(); } catch (e) {} }
    function writeFile(f, text, encoding) {
        f.encoding = encoding;
        f.open("w");
        f.write(text);
        f.close();
    }
    function psQuote(text) { return "'" + String(text).replace(/'/g, "''") + "'"; }

    var doc = app.activeDocument;
    removeFile(pngFile);
    removeFile(markFile);

    var options = new ExportOptionsPNG24();
    options.antiAliasing = true;
    options.transparency = !BACKGROUND_WHITE;
    options.artBoardClipping = true;
    options.horizontalScale = TARGET_PPI / 72.0 * 100.0;
    options.verticalScale = TARGET_PPI / 72.0 * 100.0;
    try {
        doc.exportFile(pngFile, ExportType.PNG24, options);
    } catch (exportError) {
        alert(TARGET_PPI + "ppi PNG 내보내기에 실패했습니다: " + exportError.message);
        return;
    }
    if (!pngFile.exists) { alert("PNG 파일이 만들어지지 않았습니다."); return; }

    // 이미지를 복사본(Bitmap)으로 읽어 파일 잠금을 풀고 클립보드에 넣은 뒤, 결과를 표시 파일에 남긴다
    var ps = [
        "$ErrorActionPreference = 'Stop'",
        "try {",
        "  Add-Type -AssemblyName System.Windows.Forms, System.Drawing",
        "  $src = [System.Drawing.Image]::FromFile(" + psQuote(pngFile.fsName) + ")",
        "  $bmp = New-Object System.Drawing.Bitmap($src)",
        "  $src.Dispose()",
        "  $bmp.SetResolution(" + TARGET_PPI + ", " + TARGET_PPI + ")",
        "  [System.Windows.Forms.Clipboard]::SetImage($bmp)",
        "  Set-Content -LiteralPath " + psQuote(markFile.fsName) + " -Value 'ok'",
        "} catch {",
        "  Set-Content -LiteralPath " + psQuote(markFile.fsName) + " -Value ('error: ' + $_.Exception.Message)",
        "}"
    ].join("\r\n");
    var vbs = 'CreateObject("WScript.Shell").Run "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File ""' +
        psFile.fsName + '""", 0, False';
    try {
        writeFile(psFile, "\uFEFF" + ps, "UTF-8");   // BOM이 있어야 PowerShell이 UTF-8로 읽는다
        writeFile(vbsFile, vbs, "UTF-8");
        vbsFile.execute();
    } catch (runError) {
        alert("클립보드 복사를 시작하지 못했습니다: " + runError.message + "\nPNG 파일: " + pngFile.fsName);
        return;
    }

    var waited = 0;
    while (!markFile.exists && waited < WAIT_MS) { $.sleep(200); waited += 200; }
    var result = "";
    if (markFile.exists) {
        markFile.encoding = "UTF-8";
        markFile.open("r");
        result = markFile.read();
        markFile.close();
    }
    removeFile(psFile);
    removeFile(vbsFile);
    removeFile(markFile);
    if (!/^\s*ok/.test(result)) {
        alert("클립보드 복사에 실패했습니다" + (result ? ": " + result : " (시간 초과)") + "\nPNG 파일: " + pngFile.fsName);
    }
})();
