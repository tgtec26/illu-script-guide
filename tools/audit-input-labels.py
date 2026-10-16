"""입력 라벨 후보를 소스 전체와 실행 카탈로그에서 점검한다. 공백은 0.5자.

폼의 key/label, 숫자 행 생성 호출, 입력칸 앞 statictext를 수집한다.
동적으로 조합되는 라벨은 실행 카탈로그의 scrollbar.label로 보완한다.
패널·탭·독립 체크박스 문구는 변경 대상이 아니다.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / '스크립트'
ALIASES = json.loads((SCRIPTS / '00_세팅/ui_label_aliases.json').read_text())
UNIT = re.compile(r'\s*\((?:mm|cm|m|pt|px|%|°|deg|s|ms|배|개|회|번|도|단계|줄|칸|N|J|g|kg|K|℃|°C|m/s|m/s²)\)\s*[:：]?$')


def length(text):
    return sum(0.5 if c.isspace() else 1 for c in text)


def normalize(text):
    return UNIT.sub('', text.strip()).rstrip(':：')


def audit():
    labels = {}
    files = list(SCRIPTS.rglob('*.jsx'))

    def add(text, file):
        text = normalize(text)
        if text:
            labels.setdefault(text, set()).add(str(file.relative_to(ROOT)))

    for file in files:
        source = file.read_text()
        for match in re.finditer(r'''\blabel\s*:\s*["']([^"']+)["']''', source):
            obj = source[source.rfind('{', 0, match.start()):source.find('}', match.end())]
            if re.search(r'\bkey\s*:', obj):
                add(match[1], file)
        lines = source.splitlines()
        for i, line in enumerate(lines):
            if line.lstrip().startswith('//'):
                continue
            if re.search(r'\b(?:(?:add|bind|make)\w*(?:Number|Numeric|Slider|Row|Num|Field|Input)|addCaption|addLabel)\s*\(', line):
                texts = [t for t in re.findall(r'''["']([^"'\n]+)["']''', line) if re.search('[가-힣]', t)]
                if texts:
                    add(texts[0], file)
            match = re.search(r'''\.add\(["']statictext["'],\s*[^,]*,\s*["']([^"']+)["']''', line)
            if match and re.search(r'''add\(["'](edittext|dropdownlist)''', '\n'.join(lines[i+1:i+5])):
                add(match[1], file)
    catalogs = list((SCRIPTS / '00_세팅/ui_catalog').glob('*.json'))
    for file in catalogs:
        data = json.loads(file.read_text())
        controls = data.get('controls', [])
        for control in controls:
            if control['type'] == 'scrollbar':
                add(control.get('label', ''), file)
            elif control['type'] == 'statictext' and control['id'].split('/')[-1] == '0':
                parent = control['id'].rsplit('/', 1)[0]
                siblings = [c for c in controls if c['id'].rsplit('/', 1)[0] == parent]
                if any(c['type'] in ('scrollbar', 'dropdownlist') or
                       (c['type'] == 'button' and c.get('text') == '완료') for c in siblings):
                    add(control.get('text', ''), file)
    long = {text: paths for text, paths in labels.items() if length(text) > 6}
    missing = {text: sorted(paths) for text, paths in long.items()
               if length(ALIASES.get(text, text)) > 6}
    print(f'{len(files)}개 JSX·{len(catalogs)}개 실행 카탈로그: 라벨 후보 {len(labels)}종, 6자 초과 {len(long)}종, 미정리 {len(missing)}종')
    for text, paths in sorted(missing.items()):
        print(f'{text}: {paths[0]}')
    return missing


if __name__ == '__main__':
    raise SystemExit(bool(audit()))
