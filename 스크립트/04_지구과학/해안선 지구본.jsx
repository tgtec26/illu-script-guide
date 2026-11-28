// 해안선 지구본.jsx
try { $.evalFile(new File(new File($.fileName).parent.parent.fsName + "/00_세팅/ui_tab_helper.jsxinc")); } catch (e) {}
// 마지막 실행 스크립트 기록 → 12_기타/마지막 실행 반복.jsx(F4)가 다시 실행
try {
    var __memo = new File(Folder.temp + "/illu_last_script.txt");
    __memo.encoding = "UTF-8";
    __memo.open("w");
    __memo.write($.fileName);
    __memo.close();
} catch (e) {}

(function () {
    if (!app.documents.length) { alert("지구본을 넣을 문서를 열어 주세요."); return; }
    var doc = app.activeDocument, layer = doc.activeLayer;
    if (layer.locked || !layer.visible) { alert("보이고 잠금이 풀린 레이어를 선택해 주세요."); return; }
    var folder = new File($.fileName).parent.fsName + "/coast-globe/";
    var PREF_KEY = "CoastGlobe/settings", MM = 72 / 25.4;
    var sizes = [100, 50, 20];
    var keys = ["korea","pacific","western-pacific","americas","atlantic","africa-europe"];
    var names = ["한반도","태평양","서태평양·오세아니아","아메리카","대서양","아프리카·유럽"];
    var rect = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
    var center = [(rect[0]+rect[2])/2,(rect[1]+rect[3])/2];
    var limitX = Math.ceil(Math.abs(rect[2]-rect[0])/MM/2), limitY = Math.ceil(Math.abs(rect[1]-rect[3])/MM/2);
    var originalSelection = doc.selection, sizeIndex = 1, regionIndex = 0, dx = 0, dy = 0, enabled = true;
    var result = null, built = "", lastX = 0, lastY = 0, accepted = false;

    function bounded(n,min,max) { return isFinite(n) && n >= min && n <= max; }
    try {
        var fields = app.preferences.getStringPreference(PREF_KEY).split("|");
        if (fields.length === 6 && fields[0] === "v1" && /^[012]$/.test(fields[1]) && /^[0-5]$/.test(fields[2])
            && bounded(Number(fields[3]),-limitX,limitX) && bounded(Number(fields[4]),-limitY,limitY) && /^[01]$/.test(fields[5])) {
            sizeIndex = Number(fields[1]); regionIndex = Number(fields[2]); enabled = fields[5] === "1";
            if (originalSelection && originalSelection.length) { dx = Number(fields[3]); dy = Number(fields[4]); }
        }
    } catch (e) {}

    function ink(k) {
        var c = new CMYKColor(); c.cyan = 0; c.magenta = 0; c.yellow = 0; c.black = k;
        return c;
    }
    function paint(path, fill, stroke) {
        path.filled = fill !== null;
        if (path.filled) path.fillColor = ink(fill);
        path.stroked = stroke;
        if (stroke) {
            path.strokeColor = ink(100); path.strokeWidth = 0.3;
            path.strokeJoin = StrokeJoin.ROUNDENDJOIN; path.strokeCap = StrokeCap.ROUNDENDCAP;
        }
    }
    function makeLand(group, d, x, y) {
        var contours = d.match(/M[^M]+/g);
        var compound = contours.length > 1 ? group.compoundPathItems.add() : null;
        for (var i = 0; i < contours.length; i++) {
            var coords = contours[i].match(/[MLCZ]|-?[\d.]+/g);
            var anchors = [], incoming = [], outgoing = [];
            for (var j = 0; j < coords.length;) {
                var cmd = coords[j++];
                if (cmd === "Z") break;
                if (cmd === "C") {
                    outgoing[anchors.length-1] = [x+Number(coords[j++]),y-Number(coords[j++])];
                    incoming[anchors.length] = [x+Number(coords[j++]),y-Number(coords[j++])];
                }
                anchors.push([x+Number(coords[j++]),y-Number(coords[j++])]);
            }
            var last = anchors.length-1;
            if (last > 0 && anchors[0][0]===anchors[last][0] && anchors[0][1]===anchors[last][1]) {
                incoming[0] = incoming[last]; anchors.pop();
            }
            var path = (compound || group).pathItems.add();
            path.setEntirePath(anchors); path.closed = true; path.evenodd = true;
            var pp = path.pathPoints;
            for (var z = 0; z < anchors.length; z++) {
                if (incoming[z]) pp[z].leftDirection = incoming[z];
                if (outgoing[z]) pp[z].rightDirection = outgoing[z];
            }
            paint(path,0,true);
        }
    }
    function createGlobe(diameter, region, x, y) {
        var file = new File(folder + diameter + "-" + keys[region] + ".svg");
        if (!file.open("r")) throw Error("지구본 SVG를 읽을 수 없습니다. " + file.name);
        var svg; try { svg = file.read(); } finally { file.close(); }
        var paths = /<path d="([^"]+)"\/>/g, match;
        var r = (diameter*MM-0.3)/2;
        var group = layer.groupItems.add();
        try {
            group.name = "해안선 지구본 · " + names[region] + " · " + diameter + " mm";
            var sea = group.pathItems.ellipse(y+r,x-r,2*r,2*r); paint(sea,16,false); sea.name = "바다";
            var land = group.groupItems.add(); land.name = "육지";
            var count = 0;
            while ((match = paths.exec(svg)) !== null) { makeLand(land,match[1],x,y); count++; }
            if (!count) throw Error("해안선 경로가 없습니다.");
            var mask = land.pathItems.ellipse(y+r,x-r,2*r,2*r); paint(mask,null,false);
            mask.clipping = true; land.clipped = true;
            var rim = group.pathItems.ellipse(y+r,x-r,2*r,2*r); paint(rim,null,true); rim.name = "지구 외곽";
            return group;
        } catch (e) { group.remove(); throw e; }
    }
    function clear() { if (result) { result.remove(); result = null; } built = ""; }
    function update(force) {
        if (!enabled && !force) { clear(); app.redraw(); return; }
        var id = sizeIndex + "/" + regionIndex;
        if (built !== id) {
            var next = createGlobe(sizes[sizeIndex],regionIndex,center[0]+dx*MM,center[1]+dy*MM);
            clear(); result = next; built = id;
        } else if (dx !== lastX || dy !== lastY) result.translate((dx-lastX)*MM,(dy-lastY)*MM);
        lastX = dx; lastY = dy; app.redraw();
    }
    function preview() { try { update(false); } catch(e) { clear(); alert(String(e)); } }
    var win = new Window("dialog","해안선 지구본"); win.orientation = "column"; win.alignChildren = "fill";
    var options = win.add("panel",undefined,"지구본"); options.alignChildren = "left";
    function choice(label,items,index) {
        var row = options.add("group"); row.add("statictext",undefined,label);
        var list = row.add("dropdownlist",undefined,items); list.selection = index; return list;
    }
    var size = choice("지름",["100 mm","50 mm","20 mm"],sizeIndex);
    var region = choice("중심 지역",names,regionIndex);
    var pos = win.add("panel",undefined,"대지 중심에서 이동"); pos.alignChildren = "left";
    function positionRow(label,value,limit,apply) {
        var row = pos.add("group"); row.add("statictext",undefined,label);
        var input = row.add("edittext",undefined,String(value)); input.characters = 5;
        var slider = row.add("scrollbar",undefined,value,-limit,limit); slider.preferredSize.width = 118;
        var reset = row.add("button",undefined,"R"); reset.preferredSize.width = 34;
        reset.helpTip = "처음 값으로 되돌리기"; input.helpTip = "대지 중심 기준 이동 거리 (mm)";
        function setValue(n) {
            n = isFinite(n) ? Math.min(limit,Math.max(-limit,n)) : value;
            value = Math.round(n*10)/10; input.text = String(value); slider.value = value; apply(value); preview();
        }
        slider.onChanging = slider.onChange = function () { setValue(slider.value); };
        input.onChange = function () { setValue(Number(input.text)); };
        reset.onClick = function () { setValue(0); };
    }
    positionRow("가로",dx,limitX,function(n){dx=n;}); positionRow("세로",dy,limitY,function(n){dy=n;});
    var show = win.add("checkbox",undefined,"미리보기"); show.value = enabled;
    var buttons = win.add("group"); buttons.alignment = "right";
    buttons.add("button",undefined,"취소",{name:"cancel"}); var ok = buttons.add("button",undefined,"대지에 넣기",{name:"ok"});
    size.onChange = function(){sizeIndex=size.selection.index;preview();};
    region.onChange = function(){regionIndex=region.selection.index;preview();};
    show.onClick = function(){enabled=show.value;preview();};
    ok.onClick = function(){
        try {
            update(true); accepted = true; doc.selection = null; result.selected = true;
            try { app.preferences.setStringPreference(PREF_KEY,["v1",sizeIndex,regionIndex,dx,dy,enabled?1:0].join("|")); } catch(e) {}
            win.close(1);
        } catch(e) { clear(); alert(String(e)); }
    };
    try {
        if (typeof bindTabOrder === "function") bindTabOrder(win);
        preview(); win.show();
    } finally {
        if (!accepted) { clear(); doc.selection = originalSelection; app.redraw(); }
    }
})();
