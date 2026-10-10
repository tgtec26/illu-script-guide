#!/usr/bin/env python3
"""탭 묶음 스크립트의 tabbedpanel 호스트를 선택 줄(라디오 또는 드롭다운) + 겹쳐 쌓은 페이지로 바꾼다.
탭 줄은 탭 수만큼 폭을 차지해 창이 넓어진다. 호스트 코드가 역학.jsx 이전 틀과 글자 그대로 같은 파일만 바꾼다."""
import re, sys

A = re.compile(r'    var tabs = win\.add\("tabbedpanel"\);\n    tabs\.alignChildren = "fill";\n    for \(var engineIndex = 0; engineIndex < engines\.length; engineIndex\+\+\) \{\n        var page = tabs\.add\("tab", undefined, engines\[engineIndex\]\.label\);\n        page\.orientation = "column";\n        page\.alignChildren = "fill";\n        page\.spacing = 4;\n        engines\[engineIndex\]\.error = engines\[engineIndex\]\.addRows\(page\);\n        if \(engines\[engineIndex\]\.error\) \{\n            page\.enabled = false;\n            page\.helpTip = engines\[engineIndex\]\.error;\n        \}\n    \}\n')
B = re.compile(r'    tabs\.selection = tabIndex;\n\n    tabs\.onChange = function\(\) \{\n(?:.*\n)*?    \};\n')

A_COMMON = '''    // 탭 줄(tabbedpanel)은 탭 수만큼 폭을 차지해 창이 넓어진다. 선택 줄과 겹쳐 쌓은 페이지로 대신한다
    var holder;
    var pages = [];
    var tabBar;
    var radios = [];
    var tabList = null;
'''
A_RADIO = A_COMMON + '''    tabBar = win.add("group");
    tabBar.alignChildren = ["left", "center"];
    tabBar.spacing = 12;
    holder = win.add("group");
'''
A_DROP = A_COMMON + '''    var tabLabels = [];
    for (engineIndex = 0; engineIndex < engines.length; engineIndex++) tabLabels.push(engines[engineIndex].label);
    tabList = win.add("dropdownlist", undefined, tabLabels);
    tabList.alignment = ["left", "center"];
    tabList.selection = 0;
    holder = win.add("group");
'''
A_BODY = '''    holder.orientation = "stack";
    holder.alignChildren = ["fill", "top"];
    for (var engineIndex = 0; engineIndex < engines.length; engineIndex++) {
        var page = holder.add("group");
        page.orientation = "column";
        page.alignChildren = "fill";
        page.spacing = 4;
        pages.push(page);
        if (tabList === null) radios.push(tabBar.add("radiobutton", undefined, engines[engineIndex].label));
        engines[engineIndex].error = engines[engineIndex].addRows(page);
        if (engines[engineIndex].error) {
            page.enabled = false;
            if (tabList === null) radios[engineIndex].helpTip = engines[engineIndex].error;
        }
    }
'''
B_NEW = '''    if (tabList === null) radios[tabIndex].value = true;
    else tabList.selection = tabIndex;

    function selectTab(next) {
        if (next === tabIndex) return;
        if (engines[next].error) {
            if (tabList === null) { radios[next].value = false; radios[tabIndex].value = true; }
            else tabList.selection = tabIndex;
            alert(engines[next].error);
            return;
        }
        engine.clearPreview();
        pages[tabIndex].visible = false;
        tabIndex = next;
        pages[tabIndex].visible = true;
        engine = engines[tabIndex];
        engine.setPreview(previewCheck.value);
    }
    function radioHandler(index) { return function() { selectTab(index); }; }
    if (tabList === null) {
        for (engineIndex = 0; engineIndex < engines.length; engineIndex++) radios[engineIndex].onClick = radioHandler(engineIndex);
    } else {
        tabList.onChange = function() { if (tabList.selection !== null) selectTab(tabList.selection.index); };
    }
    // 페이지는 겹쳐 쌓여 가장 큰 페이지 크기로 잡힌다. 선택되지 않은 페이지는 창이 뜬 뒤(onShow)에 숨긴다.
    // 레이아웃 전에 layout()을 부르면 늘어난 크기가 굳어 창이 줄지 않는다
    function hideInactivePages() {
        for (var pageIndex = 0; pageIndex < pages.length; pageIndex++) pages[pageIndex].visible = pageIndex === tabIndex;
    }
'''

def convert(path):
    s = open(path, encoding='utf-8').read()
    if not A.search(s) or not B.search(s):
        return 'skip (호스트 틀이 다름)'
    m = re.search(r'var engines = \[', s)
    # 라벨 길이는 makeXEngine의 label 문자열로 센다
    labels = re.findall(r'label: "([^"]+)"', s[m.start():]) if m else []
    first = re.findall(r'\{label: "([^"]+)"', s)
    labs = first if first else labels
    use_drop = sum(len(x) for x in labs) > 22 or len(labs) > 6
    head = A_DROP if use_drop else A_RADIO
    s = A.sub(lambda _: head + A_BODY, s, count=1)
    s = B.sub(lambda _: B_NEW, s, count=1)
    s = re.sub(r'win\.onShow = function\(\) \{', 'win.onShow = function() { hideInactivePages();', s, count=1)
    left = [i for i, l in enumerate(s.split('\n')) if re.search(r'\btabs\b', l) and not l.strip().startswith('//')]
    open(path, 'w', encoding='utf-8').write(s)
    return ('dropdown' if use_drop else 'radio') + (' | tabs 잔존 줄 %s' % left if left else '')

if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(p.split('/')[-1], convert(p))
