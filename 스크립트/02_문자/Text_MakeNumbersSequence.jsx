/*
  MakeNumbersSequence.jsx for Adobe Illustrator
  Description: Fills a range of selected text objects with numbers incremented based on the input data
  Date: December, 2022
  Modification date: March, 2024
  Author: Sergey Osokin, email: hi@sergosokin.ru
  Idea: Egor Chistyakov (@chegr)

  Installation: https://github.com/creold/illustrator-scripts#how-to-run-scripts

  Release notes:
  0.5 Added input of a fixed number of digits to control leading zeros
  0.4.2 Removed input activation on Windows OS below CC v26.4
  0.4.1 Fixed array of numbers with zero increment
  0.4 Redesigned, added dynamic example to side panel
  0.3 Added number replacement in a string
  0.2 Added sorting by position and placeholder replacement
  0.1.1 Added Shuffle option
  0.1.0 Initial version

  Donate (optional):
  If you find this script helpful, you can buy me a coffee
  - via Buymeacoffee: https://www.buymeacoffee.com/aiscripts
  - via Donatty https://donatty.com/sergosokin
  - via DonatePay https://new.donatepay.ru/en/@osokin
  - via YooMoney https://yoomoney.ru/to/410011149615582

  NOTICE:
  Tested with Adobe Illustrator CC 2019-2025 (Mac/Win).
  This script is provided "as is" without warranty of any kind.
  Free to use, not for sale

  Released under the MIT license
  http://opensource.org/licenses/mit-license.php

  Check my other scripts: https://github.com/creold
*/

//@target illustrator
app.preferences.setBooleanPreference('ShowExternalJSXWarning', false); // Fix drag and drop a .jsx file

// Main function
function main() {
  var SCRIPT = {
        name: '연속 숫자 채우기',
        version: 'v0.5'
      },
      CFG = {
        placeholder: '{%n}',
        aiVers: parseInt(app.version),
        isMac: /mac/i.test($.os)
      },
      SETTINGS = {
        name: SCRIPT.name.replace(/\s/g, '_') + '_data.json',
        folder: Folder.myDocuments + '/Adobe Scripts/'
      };
  
  if (!isCorrectEnv('selection:1')) return;

  var tfs = getTextFrames(selection).reverse();
  if (!tfs.length) {
    alert('텍스트를 찾지 못했습니다.\n\n선택 도구(V)로 숫자를 넣을 텍스트를 선택한 뒤 다시 실행해 주세요.', '스크립트 오류');
    return;
  }

  // Global variables
  var inc = 0, start = 0, end = 0, strLen = 0;

  // Dialog
  var win = new Window('dialog', SCRIPT.name + ' ' + SCRIPT.version);
      win.orientation = 'row';
      win.alignChildren = ['fill', 'top'];
      win.opacity = .97;

  var wrapper = win.add('group');
      wrapper.orientation = 'column';
      wrapper.alignChildren = ['fill', 'top'];

  // Start number
  var numPnl = wrapper.add('panel', undefined, '숫자');
      numPnl.alignChildren = 'left';
      numPnl.spacing = 15;
      numPnl.margins = [10, 15, 10, 10];

  var inpWrapper = numPnl.add('group');
      inpWrapper.spacing = 15;

  var startGrp = inpWrapper.add('group');
  startGrp.add('statictext', undefined, '시작:');
  var startInp = startGrp.add('edittext', undefined, 1);
      startInp.preferredSize.width = 48;
  if (CFG.isMac || CFG.aiVers >= 26.4 || CFG.aiVers <= 17) {
    startInp.active = true;
  }

  // End number
  var endGrp = inpWrapper.add('group');
  endGrp.add('statictext', undefined, '끝:');
  var endInp = endGrp.add('edittext', undefined, 50);
      endInp.preferredSize.width = 48;

  // Increment
  var incGrp = inpWrapper.add('group');
  incGrp.add('statictext', undefined, '증가값:');
  var incInp = incGrp.add('edittext', undefined, 5);
      incInp.preferredSize.width = 48;

  var numOptWrapper = numPnl.add('group');
      numOptWrapper.alignChildren = ['left', 'top'];

  // Options. Column #1
  var numOpt_1 = numOptWrapper.add('group');
      numOpt_1.orientation = 'column';
      numOpt_1.alignChildren = 'left';

  var isUseAll = numOpt_1.add('checkbox', undefined, '마지막 텍스트까지 번호 매기기');
  var isShuffle = numOpt_1.add('checkbox', undefined, '숫자 순서 섞기');
  var isRmvTf = numOpt_1.add('checkbox', undefined, '사용하지 않은 텍스트 삭제');

  // Divider
  var div = numOptWrapper.add('panel', undefined, undefined);
      div.alignment = 'fill';

  // Options. Column #2
  var numOpt_2 = numOptWrapper.add('group');
      numOpt_2.orientation = 'column';
      numOpt_2.alignChildren = 'left';

  var isPadZero = numOpt_2.add('checkbox', undefined, '앞에 0 채우기');
      isPadZero.helpTip = '예: 01, 02, 006, 00005';
  var isAutoZero = numOpt_2.add('radiobutton', undefined, '자릿수 자동');
      isAutoZero.value = true;

  var zeroOpt = numOpt_2.add('group');
  var isCstmZero = zeroOpt.add('radiobutton', undefined, '최소 자릿수 고정:');
  var zeroInp = zeroOpt.add('edittext', undefined, 3);
      zeroInp.characters = 3;

  var optWrapper = wrapper.add('group');
      optWrapper.alignChildren = ['fill', 'top'];

  // Sort objects
  var sortPnl = optWrapper.add('panel', undefined, '번호를 매기기 전 정렬');
      sortPnl.alignChildren = 'left';
      sortPnl.margins = [10, 15, 10, 10];

  var isOrder = sortPnl.add('radiobutton', undefined, '레이어 순서대로');
      isOrder.value = true;
  var isRows = sortPnl.add('radiobutton', undefined, '행 우선 (Z 모양)');
  var isCols = sortPnl.add('radiobutton', undefined, '열 우선 (\u0418 모양)');

  // Replace
  var rplcPnl = optWrapper.add('panel', undefined, '숫자로 바꿀 범위');
      rplcPnl.alignChildren = 'left';
      rplcPnl.margins = [10, 15, 10, 10];

  var isFullRplc = rplcPnl.add('radiobutton', undefined, '텍스트 전체');
      isFullRplc.value = true;
  var isNumRplc = rplcPnl.add('radiobutton', undefined, '텍스트 안의 숫자만');
  var isPhRplc = rplcPnl.add('radiobutton', undefined, '{%n} 자리표시자만');

  // Buttons
  var btns = win.add('group');
      btns.orientation = 'column';
      btns.alignChildren = ['fill', 'top'];
      btns.maximumSize.width = 80;

  var cancel, ok;
  if (CFG.isMac) {
    cancel = btns.add('button', undefined, '취소', { name: 'cancel' });
    ok = btns.add('button', undefined, '확인', { name: 'ok' });
  } else {
    ok = btns.add('button', undefined, '확인', { name: 'ok' });
    cancel = btns.add('button', undefined, '취소', { name: 'cancel' });
  }

  cancel.helpTip = 'Esc를 누르면 닫힙니다';
  ok.helpTip = 'Enter를 누르면 실행됩니다';

  btns.add('statictext', undefined, '미리보기');
  var prvwList = btns.add('statictext', undefined, '1\n2\n3\n4\n5\n6\n7\n8', {multiline: true});
  prvwList.preferredSize.height = 110;

  var copyright = btns.add('statictext', undefined, 'Github 방문');

  loadSettings(SETTINGS);
  preview();
  
  copyright.addEventListener('mousedown', function () {
    openURL('https://github.com/creold');
  });

  startInp.onChange = endInp.onChange = incInp.onChange = preview;
  isFullRplc.onClick = isNumRplc.onClick = isPhRplc.onClick = preview;
  zeroInp.onChange = isShuffle.onClick = preview;

  isPadZero.onClick = function () {
    isAutoZero.enabled = this.value;
    zeroOpt.enabled = this.value;
    preview();
  }

  isAutoZero.onClick = function () {
    isCstmZero.value = false;
    zeroInp.enabled = false;
    preview();
  }
  
  isCstmZero.onClick = function () {
    isAutoZero.value = false;
    zeroInp.enabled = true;
    preview();
  };

  isUseAll.onClick = function () {
    endGrp.enabled = !this.value;
    isRmvTf.enabled = !this.value;
    preview();
  }

  cancel.onClick = win.close;
  ok.onClick = okClick;

  function preview() {
    var tmpTFs = [].concat(tfs);
    var isPad = isPadZero.value;
    var tmpZero = Math.max(1, strToNum(zeroInp.text, 0)); // Total number length

    // Calc data
    inc = strToNum(incInp.text, 1);
    start = strToNum(startInp.text, 0);
    end = isUseAll.value ? start + (tmpTFs.length - 1) * inc : strToNum(endInp.text, 10);
    // Compare user-defined total length and length from calculated number range
    strLen = getMaxNumLength(start, end, (isPad && isCstmZero.value ? Math.pow(10, tmpZero - 1) : 1));

    // Filter text frames by criteria
    if (isNumRplc.value) {
      tmpTFs = filterByString(tmpTFs, '\\d');
    } else if (isPhRplc.value) {
      tmpTFs = filterByString(tmpTFs, CFG.placeholder);
    }

    var nums = calcNumbers(inc, start, end, tmpTFs.length);
    if (isShuffle.value) shuffle(nums);

    var i = 0, len = nums.length;
    while (i < len) {
      if (isPad && nums[i] >= 0) {
        nums[i] = padZero(nums[i], strLen);
      }
      i++;
    }

    // Preview array part
    prvwList.text = getShortArray(nums, 7, 2).join('\n');
  }

  function okClick() {
    var tolerance = getTextTolerance(tfs[0]);
    var isPad = isPadZero.value; // Add zeros
    var isNum = isNumRplc.value; // Numbers in text
    var isPh = isPhRplc.value; // Only placeholder

    if (isRows.value && !isShuffle.value) {
      sortByRows(tfs, tolerance);
    } else if (isCols.value && !isShuffle.value) {
      sortByColumns(tfs, tolerance);
    }

    if (isNum) {
      tfs = filterByString(tfs, '\\d');
    } else if (isPh) {
      tfs = filterByString(tfs, CFG.placeholder);
    }

    var nums = calcNumbers(inc, start, end, tfs.length);
    if (isShuffle.value) shuffle(nums);

    var i = 0;
    var curNum = 0;
    var regex = new RegExp(isNum ? '(\\d+([.,]\\d+)*)' : CFG.placeholder, 'gi');

    while (i < nums.length) {
      curNum = isPad && nums[i] >= 0 ? padZero(nums[i], strLen) : nums[i];
      tfs[i].contents = (isPh || isNum) ? tfs[i].contents.replace(regex, curNum) : curNum;
      i++;
    }

    if (isRmvTf.enabled && isRmvTf.value && i < tfs.length) {
      while (i < tfs.length) {
        tfs[i].remove();
        i++;
      }
    }

    saveSettings(SETTINGS);
    win.close();
  }

  /**
   * Save UI options to a file
   * @param {Object} prefs - Object containing preferences
   */
  function saveSettings(prefs) {
    if(!Folder(prefs.folder).exists) Folder(prefs.folder).create();
    var f = new File(prefs.folder + prefs.name);
    f.encoding = 'UTF-8';
    f.open('w');
    var pref = {};
    pref.start = startInp.text;
    pref.end = endInp.text;
    pref.inc = incInp.text;
    pref.sort = isOrder.value ? 0 : (isRows.value ? 1 : 2);
    pref.ph = isFullRplc.value ? 0 : (isNumRplc.value ? 1 : 2);
    pref.all = isUseAll.value;
    pref.rndm = isShuffle.value;
    pref.zero = isPadZero.value;
    pref.auto = isAutoZero.value;
    pref.total = zeroInp.text;
    pref.rmv = isRmvTf.value;
    var data = pref.toSource();
    f.write(data);
    f.close();
  }

  /**
   * Load options from a file
   * @param {Object} prefs - Object containing preferences
   */
  function loadSettings(prefs) {
    var f = File(prefs.folder + prefs.name);
    if (f.exists) {
      try {
        f.encoding = 'UTF-8';
        f.open('r');
        var json = f.readln();
        var pref = new Function('return ' + json)();
        f.close();
        if (typeof pref != 'undefined') {
          startInp.text = pref.start;
          endInp.text = pref.end;
          incInp.text = pref.inc;
          if (pref.sort == 0) isOrder.value = true;
          else if (pref.sort == 1) isRows.value = true;
          else if (pref.sort == 2) isCols.value = true;
          if (pref.ph == 0) isFullRplc.value = true;
          else if (pref.ph == 1) isNumRplc.value = true;
          else if (pref.ph == 2) isPhRplc.value = true;
          isUseAll.value = pref.all;
          isShuffle.value = pref.rndm;
          isPadZero.value = pref.zero;
          isAutoZero.value = pref.auto;
          isCstmZero.value = !pref.auto;
          zeroInp.text = pref.total ? pref.total : 1;
          isAutoZero.enabled = isPadZero.value;
          zeroOpt.enabled = isPadZero.value;
          zeroInp.enabled = !isAutoZero.value;
          isRmvTf.value = pref.rmv;
        }
      } catch (e) {}
    }
    endGrp.enabled = !isUseAll.value;
    isRmvTf.enabled = !isUseAll.value;
  }

  win.center();
  win.show();
}

/**
 * Check the script environment
 * @param {string} List of initial data for verification
 * @returns {boolean} Continue or abort script
 */
function isCorrectEnv() {
  var args = ['app', 'document'];
  args.push.apply(args, arguments);

  for (var i = 0; i < args.length; i++) {
    var arg = args[i].toString().toLowerCase();
    switch (true) {
      case /app/g.test(arg):
        if (!/illustrator/i.test(app.name)) {
          alert('실행 프로그램이 올바르지 않습니다.\n\nAdobe Illustrator에서 실행해 주세요.', '스크립트 오류');
          return false;
        }
        break;
      case /version/g.test(arg):
        var rqdVers = parseFloat(arg.split(':')[1]);
        if (parseFloat(app.version) < rqdVers) {
          alert('버전이 낮습니다.\n\n이 스크립트는 Illustrator ' + rqdVers + ' 이상에서만 동작합니다.', '스크립트 오류');
          return false;
        }
        break;
      case /document/g.test(arg):
        if (!app.documents.length) {
          alert('열린 문서가 없습니다.\n\n문서를 연 뒤 다시 실행해 주세요.', '스크립트 오류');
          return false;
        }
        break;
      case /selection/g.test(arg):
        var rqdLen = parseFloat(arg.split(':')[1]);
        if (app.selection.length < rqdLen || selection.typename === 'TextRange') {
          alert('선택한 개체가 부족합니다.\n\n텍스트를 ' + rqdLen + '개 이상 선택한 뒤 다시 실행해 주세요.\n문자 도구(T)로 글자를 드래그한 상태에서는 인식되지 않으니, 선택 도구(V)로 텍스트 개체를 선택해 주세요.', '스크립트 오류');
          return false;
        }
        break;
    }
  }

  return true;
}

/**
 * Get an array of TextFrames from a collection
 * @param {(Object|Array)} coll - The collection to search for TextFrames
 * @returns {Array} An array of TextFrame objects
 */
function getTextFrames(coll) {
  var tfs = [];

  for (var i = 0, len = coll.length; i < len; i++) {
    if (/text/i.test(coll[i].typename)) {
      tfs.push(coll[i]);
    } else if (/group/i.test(coll[i].typename)) {
      tfs = tfs.concat(getTextFrames(coll[i].pageItems));
    }
  }

  return tfs;
}

/**
 * Converts a string to a number, handling commas and non-numeric characters
 * @param {string} str - The string to convert to a number
 * @param {number} def - The default value to return if the conversion fails
 * @returns {number} Returns the numeric value of the string or the default value if the conversion fails
 */
function strToNum(str, def) {
  if (arguments.length == 1 || def == undefined) def = 1;
  str = str.replace(/,/g, '.').replace(/[^\d.-]/g, '');
  str = str.split('.');
  str = str[0] ? str[0] + '.' + str.slice(1).join('') : '';
  str = str.substr(0, 1) + str.substr(1).replace(/-/g, '');
  if (isNaN(str) || !str.length) return parseFloat(def);
  else return parseFloat(str);
}

/**
 * Get maximum length of numbers among the provided arguments
 * @param {...number} arguments - The numbers to compare
 * @returns {number} The maximum length of numbers among the provided arguments
 */
function getMaxNumLength() {
  var max = 0;

  for (var i = 0, len = arguments.length; i < len; i++) {
    if (typeof arguments[i] === 'number') {
      var numLength = (Math.abs(arguments[i])).toString().length;
      if (numLength > max) max = numLength;
    }
  }

  return max;
}

/**
 * Filter an array of Text Frames by a given string
 * @param {Array} tfs - An array of TextFrame objects to filter
 * @param {string} str - The string to filter Text Frames by
 * @returns {Array} An array of TextFrame objects that match the filtering string
 */
function filterByString(tfs, str) {
  var result = [];
  var regex = new RegExp(str, 'gi');

  for (var i = 0, len = tfs.length; i < len; i++) {
    if (regex.test(tfs[i].contents)) result.push(tfs[i]);
  }

  return result;
}

/**
 * Calculate numbers within a specified range with a given increment
 * @param {number} inc - The increment between each calculated number
 * @param {number} start - The starting number of the range
 * @param {number} end - The ending number of the range
 * @param {number} amt - The maximum amount of numbers to calculate
 * @returns {Array} An array of numbers calculated from the specified range and increment
 */
function calcNumbers(inc, start, end, amt) {
  var result = [];
  var curNum = start;
  var i = 0;

  if (start <= end && inc > 0) {
    while ((curNum + inc <= end) && (i < amt)) {
      curNum = start + i * inc;
      result.push(curNum);
      i++;
    }
  } else if (inc < 0) {
    while ((curNum + inc >= end) && (i < amt)) {
      curNum = start + i * inc;
      result.push(curNum);
      i++;
    }
  } else if (inc == 0) {
    while (i < amt) {
      result.push(start);
      i++;
    }
  }

  return result;
}

/**
 * Shuffle the elements of an array randomly
 * @param {Array} arr - The array to shuffle
 * @returns {Array} The shuffled array
 */
function shuffle(arr) {
  var j, tmp;

  for (var i = arr.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    tmp = arr[j];
    arr[j] = arr[i];
    arr[i] = tmp;
  }

  return arr;
}

/**
 * Add leading zeros to a number to make it of a specified length
 * @param {number} num - The number to pad with leading zeros
 * @param {number} len - The desired length of the resulting padded number
 * @returns {string} The number with leading zeros
 */
function padZero(num, len) {
  num = num.toString();
  while (num.length < len) num = '0' + num;
  return num;
}

/**
 * Retrieves a shortened version of an array, including the first N elements and the last M elements, with ellipsis in between
 * @param {Array} arr - The array to shorten
 * @param {number} amt - The number of elements to include from the beginning of the array
 * @param {number} last - The number of elements to include from the end of the array
 * @returns {Array} A shortened version of the array with ellipsis separating the elements
 */
function getShortArray(arr, amt, last) {
  if (arr.length <= amt) {
    return arr;
  } else {
    var first = arr.slice(0, amt - (last + 1));
    var next = '...';
    var last = arr.slice(-last);
    return first.concat(next, last);
  }
}

/**
 * Get tolerance of symbol size for sorting
 * @param {Object} tf - The TextFrame to calculate the tolerance from
 * @returns {number} The tolerance of symbol size for sorting
 */
function getTextTolerance(tf) {
  var tolerance = 0;

  if (/text/i.test(tf.typename)) {
    var dup = tf.duplicate();
    dup.selected = false;
    dup.contents = '0';
    tolerance = dup.height;
    dup.remove();
  }

  return tolerance;
}

/**
 * Sorts objects' coordinates from left to right by rows
 * @param {Array} arr - An array of objects with coordinates
 * @param {number} tolerance - The tolerance value for determining row proximity
 */
function sortByRows(arr, tolerance) {
  arr.sort(function(a, b) {
    if (Math.abs(b.top - a.top) <= tolerance) {
      return a.left - b.left;
    }
    return b.top - a.top;
  });
}

/**
 * Sort objects' coordinates from top to bottom by columns
 * @param {Array} arr - An array of objects with coordinates
 * @param {number} tolerance - The tolerance value for determining column proximity
 */
function sortByColumns(arr, tolerance) {
  arr.sort(function(a, b) {
    if (Math.abs(a.left - b.left) <= tolerance) {
      return b.top - a.top;
    }
    return a.left - b.left;
  });
}

/**
 * Open a URL in the default web browser
 * @param {string} url - The URL to open in the web browser
 * @returns {void}
 */
function openURL(url) {
  var html = new File(Folder.temp.absoluteURI + '/aisLink.html');
  html.open('w');
  var htmlBody = '<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=' + url + '"></head><body> <p></body></html>';
  html.write(htmlBody);
  html.close();
  html.execute();
}

// Run script
try {
  main();
} catch (e) { }