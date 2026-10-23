#target illustrator
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

// 작업물만 600ppi PNG(배경 투명)로 문서 폴더에 내보내고 그 파일을 클립보드에 복사한다. 본체는 png_clip_helper.jsxinc
try { $.evalFile(new File(new File($.fileName).parent.fsName + "/png_clip_helper.jsxinc")); } catch (helperError) {}
if (typeof exportPngToClipboard === "function") exportPngToClipboard(600);
else alert("png_clip_helper.jsxinc를 읽지 못했습니다. 스크립트 폴더를 다시 받아 주세요.");
