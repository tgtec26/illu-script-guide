#target illustrator

function exportHighResPNG() {
    if (app.documents.length === 0) {
        alert("열려있는 문서가 없습니다.");
        return;
    }

    var doc = app.activeDocument;
    
    // 파일 이름 확장자 제거
    var docName = doc.name.match(/(.*)\.[^\.]+$/) ? doc.name.match(/(.*)\.[^\.]+$/)[1] : doc.name;
    var destFolder = null;

    // 문서가 한 번이라도 저장된 적이 있다면 해당 경로를, 아니라면 바탕화면을 기본 경로로 설정
    try {
        destFolder = doc.path;
    } catch (e) {
        destFolder = Folder.desktop;
    }

    var defaultFile = new File(destFolder + "/" + docName + "_600ppi.png");
    
    // Mac 환경 및 Windows 환경 공통 저장 대화상자 호출
    var destFile = defaultFile.saveDlg("PNG 저장 위치를 선택하세요", "*.png");

    if (destFile !== null) {
        var options = new ExportOptionsPNG24();
        
        // PNG 내보내기 옵션 설정
        options.antiAliasing = true;      // 안티앨리어싱 적용
        options.transparency = true;      // 배경 투명하게 (원치 않으시면 false로 변경)
        options.artBoardClipping = true;  // 대지(Artboard) 크기에 맞춰 자르기

        // 600 ppi 스케일 계산 (72 ppi 기준)
        var targetPPI = 600;
        var scale = (targetPPI / 72.0) * 100.0;
        
        options.horizontalScale = scale;
        options.verticalScale = scale;

        try {
            doc.exportFile(destFile, ExportType.PNG24, options);
            alert("600 ppi PNG로 성공적으로 저장되었습니다!\n저장 경로: " + destFile.fsName);
        } catch (e) {
            alert("저장 중 오류가 발생했습니다: " + e.message);
        }
    }
}

exportHighResPNG();