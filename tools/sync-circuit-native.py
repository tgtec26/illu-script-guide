#!/usr/bin/env python3
"""웹의 ES3 호환 회로 기하·기호를 native 단독 JSX에 동기화한다. UI와 prefs는 건드리지 않는다."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
web = root.parent / 'sci-illu-web'
script = root / '스크립트/01_물리학/전기 회로도.jsx'
core = (web / 'src/generators/circuit.js').read_text() + '\n' + (web / 'src/generators/circuit-layout.js').read_text()
core = re.sub(r'^import .*?;\n', '', core, flags=re.M)
core = re.sub(r'\bexport\s+', '', core)
core = re.sub(r'\b(?:let|const)\b', 'var', core)
core = core.replace("var f = (X, Y) => ((X - 5.205) * s).toFixed(2) + ',' + ((Y - 2.69) * s).toFixed(2);", "var f = function(X, Y) {return ((X - 5.205) * s).toFixed(2) + ',' + ((Y - 2.69) * s).toFixed(2);};")
core = re.sub(r',(?=\s*(?:(?://[^\n]*\n|/\*.*?\*/)\s*)*[}\]])', '', core, flags=re.S)
core = core.replace("type: 'path', data,", "type: 'path', data: data,")
core = core.replace("y: 0, r,", "y: 0, r: r,")
text = script.read_text()
a = text.index('\n', text.index('// BEGIN CIRCUIT CORE')) + 1
b = text.index('    // END CIRCUIT CORE', a)
script.write_text(text[:a] + core + '\n' + text[b:])
print('circuit native core synced')
