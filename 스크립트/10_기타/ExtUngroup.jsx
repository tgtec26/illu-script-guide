/*
  ExtUngroup.jsx for Adobe Illustrator
  Description: This script with UI is сan be easily custom ungrouping to all group items, releasing clipping masks in the document.
  Requirements: Adobe Illustrator CS/CC
  Author: Sergey Osokin (hi@sergosokin.ru), 2018
  Based on 'ungroupV1.js' script by Jiwoong Song (netbluew@nate.com), 2009 & modification by John Wundes (wundes.com), 2012

  Installation: https://github.com/creold/illustrator-scripts#how-to-run-scripts

  Donate (optional):
  If you find this script helpful, you can buy me a coffee
  - via DonatePay https://new.donatepay.ru/en/@osokin
  - via Donatty https://donatty.com/sergosokin
  - via YooMoney https://yoomoney.ru/to/410011149615582
  - via QIWI https://qiwi.com/n/OSOKIN
  - via PayPal (temporarily unavailable) http://www.paypal.me/osokin/usd

  Release notes:
  1.0 Initial version
  1.1 Added option to delete / save mask objects. Fixed a performance issue.
  1.2 Fixed ungrouping of the selected group inside another.
  1.2.1 Minor improvements

  Released under the MIT license.
  http://opensource.org/licenses/mit-license.php

  Check other author's scripts: https://github.com/creold
*/

//@target illustrator
app.preferences.setBooleanPreference('ShowExternalJSXWarning', false); // Fix drag and drop a .jsx file

// Global variables
var SCRIPT_NAME  = '그룹 해제',
    SCRIPT_VERSION = 'v.1.2.1';
var doc = app.activeDocument;

if (app.documents.length > 0) {
  try {
    var currLayer = doc.activeLayer,
        boardNum = doc.artboards.getActiveArtboardIndex() + 1,
        clearArr = [], // Array of Clipping Masks obj
        uiMargins = [10, 20, 10, 10];

    // Create Main Window
    var win = new Window('dialog', SCRIPT_NAME + ' ' + SCRIPT_VERSION, undefined);
    win.orientation = 'column';
    win.alignChildren = ['fill', 'fill'];

    // Target radiobutton
    var slctTarget = win.add('panel', undefined, '대상');
    slctTarget.alignChildren = 'left';
    slctTarget.margins = uiMargins;
    if (getSelection(doc).length > 0) {
      var currSelRadio = slctTarget.add('radiobutton', undefined, '선택한 오브젝트');
    }
    if (!currLayer.locked && currLayer.visible) {
      var currLayerRadio = slctTarget.add('radiobutton', undefined, '활성 레이어 "' + currLayer.name + '"');
      currLayerRadio.value = true;
    }
    var currBoardRadio = slctTarget.add('radiobutton', undefined, '현재 아트보드 ' + boardNum);
    var currDocRadio = slctTarget.add('radiobutton', undefined, '문서 전체');
    if (getSelection(doc).length > 0) {
      currSelRadio.value = true;
    } else if (typeof (currLayerRadio) == 'undefined') {
      currBoardRadio.value = true;
    }

    // Action checkbox
    var options = win.add('panel', undefined, '옵션');
    options.alignChildren = 'left';
    options.margins = uiMargins;
    var chkUnroup = options.add('checkbox', undefined, '전체 그룹 해제');
    chkUnroup.value = true;
    var chkClipping = options.add('checkbox', undefined, '클리핑 마스크 해제');
    var chkRmvClipping = options.add('checkbox', undefined, '마스크 도형 삭제');
    chkRmvClipping.enabled = false;

    // Show/hide checkbox '마스크 도형 삭제'
    chkClipping.onClick = function () {
      chkRmvClipping.enabled = !chkRmvClipping.enabled;
    }

    // Buttons
    var btns = win.add('group');
    btns.alignChildren = ['fill', 'fill'];
    btns.margins = [0, 10, 0, 0];
    var cancel = btns.add('button', undefined, '취소', { name: 'cancel' });
    cancel.helpTip = 'Esc 키를 누르면 닫습니다';
    var ok = btns.add('button', undefined, '확인', { name: 'ok' });
    ok.helpTip = 'Enter 키를 누르면 실행합니다';
    ok.onClick = okClick;

    // Copyright block
    var copyright = win.add('statictext', undefined, '\u00A9 Sergey Osokin, sergosokin.ru');
    copyright.justify = 'center';
    copyright.enabled = false;

    if (doc.groupItems.length > 0) {
      win.show();
    } else { 
      alert(SCRIPT_NAME + '\n문서에 그룹이 없습니다.'); 
    }

    cancel.onClick = function () {
      win.close();
    }

    function okClick() {
      // Ungroup selected objects
      if (typeof (currSelRadio) !== 'undefined' && currSelRadio.value) {
        var currSel = getSelection(doc);
        for (var i = 0; i < currSel.length; i++) {
          if (currSel[i].typename === 'GroupItem') ungroup(currSel[i]);
        }
      }
      // Ungroup in active Layer if it contains groups
      if (typeof (currLayerRadio) !== 'undefined' && currLayerRadio.value) {
        ungroup(currLayer);
      }
      // Ungroup in active Artboard only visible & unlocked objects
      if (currBoardRadio.value) {
        doc.selectObjectsOnActiveArtboard();
        ungroup(getSelection(doc));
        doc.selection = null;
      }
      // Ungroup all in the current Document
      if (currDocRadio.value) {
        for (var j = 0; j < doc.layers.length; j++) {
          var docLayer = doc.layers[j];
          // Run only for editable visible layers
          if (!docLayer.locked && docLayer.visible && docLayer.groupItems.length > 0) {
            ungroup(docLayer);
          }
        }
      }
      // Remove empty clipping masks after ungroup
      if (chkRmvClipping.value) {
        removeMasks(clearArr);
      }
      win.close();
    }
  } catch (e) {
    // showError(e);
  }
} else {
  alert(SCRIPT_NAME + '\n스크립트를 실행하기 전에 문서를 열어주세요.');
}

function getSelection(doc) {
  return doc.selection;
}

function getChildAll(obj) {
  var childsArr = [];
  if (Object.prototype.toString.call(obj) === '[object Array]') {
    childsArr.push.apply(childsArr, obj);
  } else {
    for (var i = 0; i < obj.pageItems.length; i++) {
      childsArr.push(obj.pageItems[i]);
    }
  }
  if (obj.layers) {
    for (var l = 0; l < obj.layers.length; l++) {
      childsArr.push(obj.layers[l]);
    }
  }
  return childsArr;
}

// Ungroup array of target objects
function ungroup(obj) {
  if (!chkClipping.value && obj.clipped) { 
    return; 
  }

  var childArr = getChildAll(obj);

  if (childArr.length < 1) {
    obj.remove();
    return;
  }

  for (var i = 0; i < childArr.length; i++) {
    var element = childArr[i];
    try {
      if (element.parent.typename !== 'Layer') {
        element.move(obj, ElementPlacement.PLACEBEFORE);
        // Push empty paths in array 
        if ((element.typename === 'PathItem' && !element.filled && !element.stroked) ||
          (element.typename === 'CompoundPathItem' && !element.pathItems[0].filled && !element.pathItems[0].stroked) ||
          (element.typename === 'TextFrame' && element.textRange.fillColor == '[NoColor]' && element.textRange.strokeColor == '[NoColor]'))
          clearArr.push(element);
      }
      if (element.typename === 'GroupItem' || element.typename === 'Layer') {
        ungroup(element);
      }
    } catch (e) { }
  }
}

// Remove empty clipping masks after ungroup
function removeMasks(arr) {
  for (var i = 0; i < arr.length; i++) {
    arr[i].remove();
  }
}

function showError(err) {
  if (confirm(SCRIPT_NAME + ': 알 수 없는 오류가 발생했습니다.\n' +
    '자세한 정보를 보시겠습니까?', true, '알 수 없는 오류')) {
    alert(err + ': ' + err.line + '번째 줄', '스크립트 오류', true);
  }
}
