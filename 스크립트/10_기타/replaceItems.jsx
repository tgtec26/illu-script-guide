// 마지막 실행 스크립트 기록 → 10_기타/RepeatLast.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

/* 

  Author: Alexander Ladygin (i@ladygin.pro)
  Program version: Adobe Illustrator CC+
  Name: replaceItems.jsx;

  Copyright (c) 2018
  www.ladyginpro.ru

*/

var scriptName = 'ReplaceItems',
    settingFile = {
        name: scriptName + '__setting.json',
        folder: Folder.myDocuments + '/LA_AI_Scripts/'
    };

var win = new Window('dialog', scriptName + ' \u00A9 www.ladyginpro.ru');
    win.orientation = 'column';
    win.alignChildren = ['fill', 'fill'];

with (win.add('group')) {
    orientation = 'row';

    var panel = add('panel', undefined, '무엇으로 바꿀까요?');
        panel.orientation = 'column';
        panel.alignChildren = ['fill', 'fill'];
        panel.margins = [20, 30, 20, 20];

        var bufferRadio = panel.add('radiobutton', undefined, '복사한 개체'),
            currentRadio = panel.add('radiobutton', undefined, '맨 위 개체'),
            groupSuccessively = panel.add('radiobutton', undefined, '그룹 전체 (순서대로)'),
            randomRadio = panel.add('radiobutton', undefined, '그룹 전체 (무작위)'),
            groupValue = panel.add('group'),
            randomValue = groupValue.add('edittext', undefined, '100'),
            randomValueUnit = groupValue.add('statictext', undefined, '%'),
            elementsInGroupCheckbox = panel.add('checkbox', undefined, '그룹 안의 개체까지 바꾸기');

        groupValue.orientation = 'row';
        groupValue.margins = 0;
        groupValue.alignChildren = ['fill', 'fill'];
        randomValue.minimumSize = [140, undefined];

    var panelCheckboxes = add('panel');
        panelCheckboxes.orientation = 'column';
        panelCheckboxes.alignChildren = ['fill', 'fill'];
        panelCheckboxes.margins = 20;

        var fitInSizeCheckbox = panelCheckboxes.add('checkbox', undefined, '원래 개체 크기에 맞추기');
            copyWHCheckbox = panelCheckboxes.add('checkbox', undefined, '가로·세로 크기 복사');
            saveOriginalCheckbox = panelCheckboxes.add('checkbox', undefined, '원래 개체 남겨두기'),
            copyColorsCheckbox = panelCheckboxes.add('checkbox', undefined, '원래 개체의 색 가져오기'),
            randomRotateCheckbox = panelCheckboxes.add('checkbox', undefined, '개체를 무작위로 회전'),
            symbolByRPCheckbox = panelCheckboxes.add('checkbox', [0, 0, 100, 40], '심볼을 등록점 기준으로\n정렬');

        bufferRadio.value = true;
        fitInSizeCheckbox.value = false;
        copyWHCheckbox.value = false;
        saveOriginalCheckbox.value = false;

}

var winButtons = win.add('group');
    winButtons.alignChildren = ['fill', 'fill'];
    winButtons.margins = [0, 0, 0, 0];

    var cancel = winButtons.add('button', undefined, '취소');
    cancel.helpTip = 'Esc를 누르면 닫힙니다';
    cancel.onClick = function () { win.close(); }

    var ok = winButtons.add('button', [0, 0, 100, 30], '확인');
    ok.helpTip = 'Enter를 누르면 실행됩니다';
    ok.onClick = startAction;
    ok.active = true;

    var progressBar = win.add('progressbar', [0, 0, 110, 5]),
        progressBarCounter = 100;
    progressBar.value = 0;
    progressBar.minvalue = 0;
    progressBar.maxvalue = progressBarCounter;

    copyWHCheckbox.onClick = function (e) {
        groupValue.enabled = !copyWHCheckbox.value;
        fitInSizeCheckbox.enabled = !this.value;
    }

    fitInSizeCheckbox.onClick = function (e) {
        copyWHCheckbox.enabled = !this.value;
    }

function randomRotation (item) {
    item.rotate(Math.floor(Math.random() * 360), true, true, true, true, Transformation.CENTER);
}

function setFillColor (items, color) {
    if (color) {
        var i = items.length;
        if (i) while (i--) {
            if (items[i].typename === 'GroupItem') {
                setFillColor(items[i].pageItems, color);
            }
                else if (items[i].typename === 'CompoundPathItem') {
                    if (items[i].pathItems.length) items[i].pathItems[0].fillColor = color;
                }
                else if (items[i].typename === 'PathItem') {
                    items[i].fillColor = color;
                }
        }
    }
}

function getFillColor (items) {
    var i = items.length, gc;
    if (i) while (i--) {
        if (items[i].typename === 'GroupItem' && (gc = getFillColor(items[i].pageItems))) return gc;
            else if (items[i].typename === 'CompoundPathItem' && items[i].pathItems.length) return items[i].pathItems[0].fillColor;
            else if (items[i].typename === 'PathItem') return items[i].fillColor;
    }
}

function getSymbolPositionByRegistrationPoint (item) {
    var bakupSymbol = item.symbol,
        newSymbol = activeDocument.symbols.add(item, SymbolRegistrationPoint.SYMBOLTOPLEFTPOINT);

    // replace symbol
    item.symbol = newSymbol;

    // set position
    var position = [
            item.left,
            item.top
        ];

    // restore symbol
    item.symbol = bakupSymbol;
    newSymbol.remove();
    
    return position;
}

function startAction() {
    if (selection.length) {
        panel.enabled = groupValue.enabled = panelCheckboxes.enabled = ok.enabled = cancel.enabled = false;

        var __ratio = !isNaN(parseFloat(randomValue.text)) ? parseFloat(randomValue.text) / 100 : 1,
            items = (!elementsInGroupCheckbox.value ? selection : selection[selection.length - 1].pageItems),
            nodes = (currentRadio.value ? selection[0] : (bufferRadio.value ? [] : selection[0].pageItems)),
            length = nodes.length,
            i = items.length,
            j = 0;

        progressBarCounter = progressBar.maxvalue / i;

        if (bufferRadio.value) {
            selection = null;
            app.paste();
            nodes = selection[0];
            selection = null;
        }

        function getNode (__index) {
            return ((currentRadio.value || bufferRadio.value) ? nodes : nodes[ typeof __index === 'number' ? __index : Math.floor(Math.random() * length) ]);
        }

        while (i--) {
            if (!bufferRadio.value && !i) break;
            if (j >= nodes.length) j = 0;
            var item = items[i],
                node = getNode(groupSuccessively.value ? j : undefined).duplicate(item, ElementPlacement.PLACEBEFORE),
                __fn = 'height',
                __fnReverse = 'width';

            j++;

            if (node.height <= node.width) {
                __fn = 'width';
                __fnReverse = 'height';
            }

            if (randomRotateCheckbox.value) randomRotation(node);

            if (!copyWHCheckbox.value) {
                var __size = (item.height >= item.width ? item.width : item.height) * __ratio,
                    precent = __size * 100 / node[__fn] / 100;

                if (fitInSizeCheckbox.value) {
                    node[__fn] = __size;
                    node[__fnReverse] *= precent;
                }
            }
                else {
                    node.width = item.width;
                    node.height = item.height;
                }

            node.left = item.left - (node.width - item.width) / 2;
            node.top = item.top + (node.height - item.height) / 2;

            if (symbolByRPCheckbox.value && node.typename === 'SymbolItem') {
                var __pos = getSymbolPositionByRegistrationPoint(node);
                node.left += (item.left + item.width / 2) - __pos[0];
                node.top += (item.top - item.height / 2) - __pos[1];
            }

            if (copyColorsCheckbox.value) {
                setFillColor([node], getFillColor([item]));
            }
            if (!saveOriginalCheckbox.value) item.remove();

            progressBar.value += progressBarCounter;
            win.update();
        }

        if (bufferRadio.value) nodes.remove();

    }

    win.close();
}

function saveSettings() {
    var $file = new File(settingFile.folder + settingFile.name),
        data = [
            bufferRadio.value,
            currentRadio.value,
            randomRadio.value,
            elementsInGroupCheckbox.value,
            copyWHCheckbox.value,
            saveOriginalCheckbox.value,
            copyColorsCheckbox.value,
            randomRotateCheckbox.value,
            symbolByRPCheckbox.value,
            randomValue.text,
            groupSuccessively.value,
            fitInSizeCheckbox.value
        ].toString();

    $file.open('w');
    $file.write(data);
    $file.close();
}

function loadSettings() {
    var $file = File(settingFile.folder + settingFile.name);
    if ($file.exists) {
        try {
            $file.open('r');
            var data = $file.read().split('\n'),
                $main = data[0].split(',');
                bufferRadio.value = ($main[0] === 'true');
                currentRadio.value = ($main[1] === 'true');
                randomRadio.value = ($main[2] === 'true');
                elementsInGroupCheckbox.value = ($main[3] === 'true');
                copyWHCheckbox.value = ($main[4] === 'true');
                saveOriginalCheckbox.value = ($main[5] === 'true');
                copyColorsCheckbox.value = ($main[6] === 'true');
                randomRotateCheckbox.value = ($main[7] === 'true');
                symbolByRPCheckbox.value = ($main[8] === 'true');
                randomValue.text = $main[9];
                groupSuccessively.value = ($main[10] === 'true');
                fitInSizeCheckbox.value = ($main[11] === 'true');

                groupValue.enabled = !copyWHCheckbox.value;
                fitInSizeCheckbox.enabled = !copyWHCheckbox.value;
                copyWHCheckbox.enabled = !fitInSizeCheckbox.value;
        } catch (e) {}
        $file.close();
    }
}

win.onClose = function() {
    saveSettings();
    return true;
}

function checkSettingFolder() {
    var $folder = new Folder(settingFile.folder);
    if (!$folder.exists) $folder.create();
}

checkSettingFolder();
loadSettings();
win.center();
win.show();