// 일러스트레이터 잠금 해제된 래스터 이미지만 제거하는 스크립트
// RemoveAllRasterImages.jsx

// 현재 활성화된 문서가 있는지 확인
if (app.documents.length > 0) {
  var doc = app.activeDocument;
  var rasterItems = [];
  var removedCount = 0;
  var skippedLockedCount = 0;
  
  // 문서 내 모든 래스터 이미지 수집
  findRasterImages(doc);
  
  // 찾은 래스터 이미지 제거 (잠금 해제된 것만)
  if (rasterItems.length > 0) {
      // 삭제 작업 전에 실행 취소 가능하도록 함
      app.executeMenuCommand("deselectall");
      
      // 뒤에서부터 삭제해야 인덱스 문제가 발생하지 않음
      for (var i = rasterItems.length - 1; i >= 0; i--) {
          try {
              if (!rasterItems[i].locked && !isInLockedLayer(rasterItems[i])) {
                  rasterItems[i].remove();
                  removedCount++;
              } else {
                  skippedLockedCount++;
              }
          } catch (e) {
              alert("오류: " + e);
          }
      }
      
      var resultMessage = removedCount + "개의 래스터 이미지가 제거되었습니다.";
      if (skippedLockedCount > 0) {
          resultMessage += "\n" + skippedLockedCount + "개의 잠금된 이미지는 건너뛰었습니다.";
      }
      alert(resultMessage);
  } else {
      alert("문서에 래스터 이미지가 없습니다.");
  }
} else {
  alert("열린 문서가 없습니다. 문서를 열고 다시 시도하세요.");
}

// 아이템이 잠긴 레이어에 있는지 확인하는 함수
function isInLockedLayer(item) {
  var parent = item.parent;
  while (parent) {
      if (parent.typename === "Layer" && parent.locked) {
          return true;
      }
      parent = parent.parent;
  }
  return false;
}

// 래스터 이미지를 찾는 재귀 함수
function findRasterImages(container) {
  // 레이어인 경우
  if (container.typename === "Layer") {
      // 서브레이어 처리
      for (var i = 0; i < container.layers.length; i++) {
          findRasterImages(container.layers[i]);
      }
      
      // 현재 레이어의 페이지 아이템 처리
      for (var j = 0; j < container.pageItems.length; j++) {
          var item = container.pageItems[j];
          checkIfRaster(item);
      }
  } 
  // 그룹인 경우
  else if (container.typename === "GroupItem") {
      for (var k = 0; k < container.pageItems.length; k++) {
          var groupItem = container.pageItems[k];
          checkIfRaster(groupItem);
      }
  }
  // 문서인 경우
  else if (container.typename === "Document") {
      for (var l = 0; l < container.layers.length; l++) {
          findRasterImages(container.layers[l]);
      }
  }
}

// 아이템이 래스터인지 확인하는 함수
function checkIfRaster(item) {
  if (item.typename === "RasterItem") {
      rasterItems.push(item);
  } else if (item.typename === "GroupItem") {
      findRasterImages(item); // 그룹 내 아이템을 재귀적으로 확인
  } else if (item.typename === "PlacedItem") {
      // 배치된 아이템도 래스터 이미지일 수 있음
      rasterItems.push(item);
  }
}