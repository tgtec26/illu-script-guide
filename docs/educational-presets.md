# 교육용 프리셋 어댑터

`config/educational-presets.json`은 웹 `src/config/educational-presets.json`과 동일한 데이터입니다. 일반적인 교과 개념형 자체 예시이며 특정 기출 그림 복제나 출제 빈도 분석이 아닙니다.

기존 열기관·피스톤 대화상자의 프리셋 패널에서 유형과 문제/해설을 고른 후 **폼에 적용**을 누릅니다. 고르기만 하면 현재 옵션은 바뀌지 않습니다. 기존 미리보기·취소·확인 경로를 그대로 사용하며 새 프리셋 자체는 문서나 설정을 쓰지 않습니다. 선택한 문제판은 과정명을 숨기고, 해설판은 과정명 또는 모식적 분자 표현을 추가합니다. 단열 조건·칸 이름 등 문제 조건은 유지합니다.

스크립트 개발자는 `스크립트/00_세팅/educational_presets.jsxinc`를 로드하고 다음 API를 사용할 수 있습니다.

```javascript
var data = EducationalPresets.load(repoRoot + '/config/educational-presets.json');
var contract = EducationalPresets.load(repoRoot + '/contracts/tool-contracts.json');
function validate(tool, params) {
    var result = normalizeOptions(contract.tools[tool], params);
    if (result.notes.length) throw Error(result.notes.join('\n'));
    return result.params;
}
var pairProblem = EducationalPresets.create(data, 'gas-motion', 'problem', 42, validate);
var pairSolution = EducationalPresets.create(data, 'gas-motion', 'explanation', 42, validate);
// 기존 폼/렌더러 어댑터에 전달합니다. 여기서는 문서를 변경하지 않습니다.
EducationalPresets.addPanel(parent, data, function (setting) {
    applyToYourForm(setting.params);
}, validate, 'heat-engine-cycle');
```

`normalizeOptions`는 별도 `option_contract.jsxinc`에서 로드합니다. `validate`는 검사한 params를 반환하고 오류 시 throw하는 선택 콜백입니다. 외부에서 받은 데이터는 반드시 계약 검사를 거칩니다. `create`는 기본적으로 JSON의 primitive params와 시드 범위를 검사하지만 계약 범위를 대체하지 않습니다. 반환값은 웹 도구 키이므로 기존 JSX 지역 변수와 다를 수 있습니다. 열기관은 계약 담당 어댑터의 매핑을 사용합니다. 입자 모형은 Illustrator에서 선택한 닫힌 패스를 용기로 사용하므로 웹의 container/widthMm/heightMm와 직접 일치하지 않습니다.

`addPanel(parent,data,onApply,validate,toolId)`는 해당 toolId만 골라 panel을 반환합니다(없으면 null). `onApply`에는 새 `{tool,params}`가 전달됩니다. 호스트가 폼 갱신·미리보기 예약·확인 저장을 담당합니다. 다른 도구의 설정을 직접 덮어쓰지 않습니다. 동일 배치 번호(1–99)는 각 도구 안에서 재현되며 웹과 JSX 전체 기하 일치 주장이 아닙니다. 패널은 기본 시드를 쓰며 개발 API에서 시드를 지정할 수 있습니다.

JSON 파서는 ES3로 작성되었고 `eval`을 쓰지 않습니다. 잘못된 JSON·중복/위험 키·비유한 숫자·과도한 깊이와 길이를 거부합니다. 어댑터만 로드해도 Illustrator 명령·문서·환경설정에는 변화가 없습니다.

검증: `node tests/check-educational-presets.js`. Illustrator 실제 실행과 PNG 확인은 수행하지 않았습니다.
