const scripts = [
  { id: "setup", category: "세팅", name: "setup", file: "00_세팅/setup.jsx", summary: "새 PC에서 Illustrator 환경을 한 번에 맞춥니다. 단위, 키보드 증감, 문자 증감, 고정점 표시, 액션 세트를 적용합니다.", tags: ["환경설정", "액션", "새 PC"] },
  { id: "atom-model", category: "도형", name: "원자 모형", file: "01_도형/Object_AtomModel.jsx", summary: "원자 구조를 빠르게 그릴 때 쓰는 생성 도구입니다. 과학 도판에서 반복되는 전자껍질 표현을 줄입니다.", tags: ["과학", "도형"] },
  { id: "axis-tick", category: "도형", name: "축 눈금", file: "01_도형/Object_AxisTickMarks.jsx", summary: "사각형을 기준으로 아래축과 왼쪽축을 만들고, 화살표와 눈금 숫자를 배치합니다.", tags: ["그래프", "축", "눈금"] },
  { id: "bohr-orbit", category: "도형", name: "보어 궤도", file: "01_도형/Object_BohrQuantumOrbit.jsx", summary: "보어 원자 모형의 궤도 표현을 만드는 스크립트입니다.", tags: ["과학", "원자"] },
  { id: "circular-align", category: "도형", name: "원형 정렬", file: "01_도형/Object_CircularAlignment.jsx", summary: "선택한 개체를 원형 구조로 정렬할 때 사용합니다.", tags: ["배치", "정렬"] },
  { id: "ext-ungroup", category: "기타", name: "확장 언그룹", file: "10_기타/ExtUngroup.jsx", summary: "복잡한 그룹을 작업하기 쉽게 풀어내는 보조 스크립트입니다.", tags: ["정리", "그룹"] },
  { id: "button-out", category: "도형", name: "버튼 입체화", file: "01_도형/Object_button_Out.jsx", summary: "선택한 원이나 타원을 뒤쪽으로 복제하고 접선 라인을 추가해 버튼처럼 입체화합니다.", tags: ["입체", "원"] },
  { id: "cabinet-inout", category: "도형", name: "캐비넷 투영 + 숨은선", file: "01_도형/Object_cabinet_InOut.jsx", summary: "사각형을 캐비넷 투영법으로 입체화하고 숨은 선을 파선으로 추가합니다.", tags: ["입체", "숨은선"] },
  { id: "cabinet-out", category: "도형", name: "캐비넷 투영", file: "01_도형/Object_cabinet_Out.jsx", summary: "선택한 사각형을 캐비넷 투영법으로 빠르게 입체화합니다.", tags: ["입체", "사각형"] },
  { id: "cylinder", category: "도형", name: "원기둥", file: "01_도형/Object_cylinder.jsx", summary: "선택한 원을 기준으로 원기둥을 세웁니다. 면별 K 농도 음영과 속이 비치는 관 구멍을 지원합니다.", tags: ["입체", "원기둥"] },
  { id: "cone", category: "도형", name: "원뿔", file: "01_도형/Object_cone.jsx", summary: "선택한 원을 기준으로 원뿔 또는 원뿔대를 만듭니다. 밑면·윗면 지름과 높이, 면별 K 농도, X·Y·Z축 시점을 조절합니다.", tags: ["입체", "원뿔", "원뿔대"] },
  { id: "sphere", category: "도형", name: "구", file: "01_도형/Object_sphere.jsx", summary: "선택한 원을 기준으로 구를 만들고 경도선과 위도선을 배치합니다. 경도선 회전과 X·Y·Z축 시점 조절을 지원합니다.", tags: ["입체", "구", "위도", "경도"] },
  { id: "circle-guide", category: "도형", name: "끝점 원 안내선", file: "01_도형/Object_circleguideline.jsx", summary: "선의 양 끝점에 반지름 0.5mm 원을 만들고 안내선으로 바꿉니다.", tags: ["안내선", "끝점"] },
  { id: "dash-shift", category: "도형", name: "파선 오프셋", file: "01_도형/Object_dashshift.jsx", summary: "파선의 시작 위치를 미세 조정합니다. 도판에서 점선이 모서리와 어긋날 때 유용합니다.", tags: ["파선", "미세조정"] },
  { id: "expand-arrow", category: "도형", name: "확장 화살표", file: "01_도형/Object_expand_arrow.jsx", summary: "선택한 패스에 지정된 선 두께, 화살표, 폭 속성을 적용합니다.", tags: ["화살표", "선"] },
  { id: "isometric", category: "도형", name: "아이소메트릭", file: "01_도형/Object_isometric.jsx", summary: "도형을 아이소메트릭 느낌으로 변형할 때 쓰는 보조 도구입니다.", tags: ["입체", "아이소"] },
  { id: "rotate3d", category: "도형", name: "3D 회전", file: "01_도형/Object_rotate3d.jsx", summary: "선택 개체를 3D 회전 스타일로 변형할 때 사용합니다.", tags: ["3D", "회전"] },
  { id: "dash-2-1", category: "도형", name: "점선 2-1", file: "01_도형/Object_setdash2-1.jsx", summary: "선택한 개체의 선을 2pt 점선, 1pt 간격으로 바꿉니다.", tags: ["파선", "선"] },
  { id: "dash-3-1", category: "도형", name: "점선 3-1", file: "01_도형/Object_setdash3-1.jsx", summary: "선택한 개체의 선을 3pt 점선, 1pt 간격으로 바꿉니다.", tags: ["파선", "선"] },
  { id: "chain-line", category: "도형", name: "1점 쇄선", file: "01_도형/Object_setdash4-1-1-1.jsx", summary: "긴선 4pt, 간격 1pt, 짧은선 1pt, 간격 1pt의 1점 쇄선을 적용합니다.", tags: ["쇄선", "선"] },
  { id: "area-text-box", category: "문자", name: "둥근 텍스트 박스", file: "02_문자/Text_AreaTextRoundedBox.jsx", summary: "영역 문자와 둥근 박스를 함께 다룰 때 쓰는 문자 보조 도구입니다.", tags: ["텍스트박스", "문자"] },
  { id: "chemical-formula", category: "문자", name: "화학식 서식", file: "02_문자/Text_ChemicalFormulaFormatter.jsx", summary: "선택한 텍스트에서 숫자는 아래첨자, 이온 전하는 위첨자로 자동 적용합니다.", tags: ["화학식", "첨자"] },
  { id: "make-number-seq", category: "문자", name: "숫자 시퀀스 만들기", file: "02_문자/Text_MakeNumbersSequence.jsx", summary: "연속 숫자 텍스트를 빠르게 생성합니다.", tags: ["숫자", "반복"] },
  { id: "nuclide", category: "문자", name: "핵종 표기", file: "02_문자/Text_NuclideNotation.jsx", summary: "예: 23H 입력을 왼쪽 위 2, 왼쪽 아래 3, 오른쪽 H 구조로 만듭니다.", tags: ["핵종", "첨자"] },
  { id: "number-seq", category: "문자", name: "번호 넣기", file: "02_문자/Text_NumberSequence.jsx", summary: "현재 화면 기준으로 번호 텍스트를 배치할 때 사용합니다.", tags: ["번호", "텍스트"] },
  { id: "subscript-variable", category: "문자", name: "첨자 변수", file: "02_문자/Text_SubscriptedVariable.jsx", summary: "변수 문자와 아래첨자, 이온 위첨자를 조합해 과학 표기용 텍스트를 만듭니다.", tags: ["변수", "첨자"] },
  { id: "white-stroke-text", category: "문자", name: "문자 흰색 외곽선", file: "02_문자/Text_WhiteStrokeFillAppearance.jsx", summary: "문자 모양 패널에 새 선과 새 면을 추가하고 흰색 1pt 외곽선을 적용합니다.", tags: ["외곽선", "문자"] },
  { id: "text-check", category: "문자", name: "폰트 이름 확인", file: "02_문자/Text_check.jsx", summary: "스크립트에서 사용할 수 있는 폰트 이름을 확인할 때 씁니다.", tags: ["폰트", "확인"] },
  { id: "text-input", category: "문자", name: "문자 입력 패널", file: "02_문자/Text_input.jsx", summary: "자주 쓰는 특수문자와 기호를 현재 화면 하단 중앙에 넣습니다.", tags: ["기호", "입력"] },
  { id: "ko-en", category: "문자", name: "한영 텍스트", file: "02_문자/Text_koen.jsx", summary: "한글과 영문 텍스트 크기나 스타일을 빠르게 맞출 때 쓰는 보조 스크립트입니다.", tags: ["한글", "영문"] },
  { id: "fill-20k", category: "색상", name: "면 20K", file: "03_색상/Color_Fill20K.jsx", summary: "선택한 개체의 면을 CMY가 섞이지 않은 순수 K=20 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "fill-30k", category: "색상", name: "면 30K", file: "03_색상/Color_Fill30K.jsx", summary: "선택한 개체의 면을 순수 K=30 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "fill-80k", category: "색상", name: "면 80K", file: "03_색상/Color_Fill80K.jsx", summary: "선택한 개체의 면을 순수 K=80 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "fill-90k", category: "색상", name: "면 90K", file: "03_색상/Color_Fill90K.jsx", summary: "선택한 개체의 면을 순수 K=90 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "k-convert", category: "색상", name: "K 변환", file: "03_색상/Color_Kconvert.jsx", summary: "색상 값을 순수 K 중심으로 정리할 때 쓰는 변환 도구입니다.", tags: ["K", "변환"] },
  { id: "random-gray", category: "색상", name: "랜덤 회색", file: "03_색상/Color_RandomFillGray.jsx", summary: "선택 개체에 회색 농도를 무작위로 적용합니다.", tags: ["회색", "랜덤"] },
  { id: "black-fill", category: "색상", name: "검정 면", file: "03_색상/Color_black.jsx", summary: "선택한 모든 개체의 면을 K=100 검정으로 바꿉니다. 면이 없으면 새로 만듭니다.", tags: ["검정", "면"] },
  { id: "black-stroke", category: "색상", name: "검정 선", file: "03_색상/Color_blackline.jsx", summary: "선택한 모든 개체의 선을 K=100 검정으로 바꿉니다. 선이 없으면 활성화합니다.", tags: ["검정", "선"] },
  { id: "gray-toggle", category: "색상", name: "회색 선택 적용", file: "03_색상/Color_graysel.jsx", summary: "면 또는 선에 순수 K 회색을 적용합니다. 낮은 농도에서 CMY가 섞이는 문제를 피합니다.", tags: ["회색", "K"] },
  { id: "white-fill", category: "색상", name: "흰색 면", file: "03_색상/Color_white.jsx", summary: "선택한 모든 개체의 면을 흰색으로 바꿉니다.", tags: ["흰색", "면"] },
  { id: "white-stroke", category: "색상", name: "흰색 선", file: "03_색상/Color_whiteline.jsx", summary: "선택한 모든 개체의 선을 흰색으로 바꿉니다.", tags: ["흰색", "선"] },
  { id: "textbox-4mm", category: "삽입", name: "4mm 텍스트 박스", file: "04_삽입/Input_4mmtextbox.jsx", summary: "현재 화면 중앙에 8mm x 4mm 사각형을 만듭니다.", tags: ["상자", "삽입"] },
  { id: "dash-cross", category: "삽입", name: "십자 파선", file: "04_삽입/Input_dashline.jsx", summary: "현재 화면 정중앙에 4mm 십자 파선을 만듭니다.", tags: ["십자", "파선"] },
  { id: "artboard", category: "삽입", name: "대지 만들기", file: "04_삽입/Input_setborard.jsx", summary: "설정에 맞는 새 문서와 대지를 생성합니다.", tags: ["대지", "문서"] },
  { id: "tick", category: "삽입", name: "중앙 십자선", file: "04_삽입/Input_tick.jsx", summary: "현재 화면 중앙에 1mm 길이의 수직/수평선을 개별 객체로 만듭니다.", tags: ["중심", "삽입"] },
  { id: "align-1mm-h-big", category: "정렬", name: "1mm 세로 정렬 - 큰 개체", file: "05_정렬/Align_1mmHcenterB.jsx", summary: "큰 개체를 기준으로 위아래 개체를 1mm 간격으로 쌓고 가로 중심을 맞춥니다.", tags: ["정렬", "1mm"] },
  { id: "align-1mm-h-small", category: "정렬", name: "1mm 세로 정렬 - 작은 개체", file: "05_정렬/Align_1mmHcenterS.jsx", summary: "작은 개체를 기준으로 위아래 개체를 1mm 간격으로 쌓고 가로 중심을 맞춥니다.", tags: ["정렬", "1mm"] },
  { id: "align-1mm-v-big", category: "정렬", name: "1mm 가로 정렬 - 큰 개체", file: "05_정렬/Align_1mmVcenterB.jsx", summary: "큰 개체를 기준으로 좌우 개체를 1mm 간격으로 배치하고 세로 중심을 맞춥니다.", tags: ["정렬", "1mm"] },
  { id: "align-1mm-v-small", category: "정렬", name: "1mm 가로 정렬 - 작은 개체", file: "05_정렬/Align_1mmVcenterS.jsx", summary: "작은 개체를 기준으로 좌우 개체를 1mm 간격으로 배치하고 세로 중심을 맞춥니다.", tags: ["정렬", "1mm"] },
  { id: "center-big", category: "정렬", name: "가운데 정렬 - 큰 개체", file: "05_정렬/Align_CenterB.jsx", summary: "가장 큰 개체를 기준으로 나머지 개체의 가로·세로 중심을 맞춥니다.", tags: ["가운데", "기준"] },
  { id: "center-small", category: "정렬", name: "가운데 정렬 - 작은 개체", file: "05_정렬/Align_CenterS.jsx", summary: "가장 작은 개체를 기준으로 나머지 개체의 가로·세로 중심을 맞춥니다.", tags: ["가운데", "기준"] },
  { id: "position-12", category: "정렬", name: "12방향 위치 정렬", file: "05_정렬/Align_Position12.jsx", summary: "두 개체를 선택하고 기준 개체 주변 12개 위치로 배치합니다. 보이는 영역 기준으로 계산합니다.", tags: ["12방향", "보이는 영역"] },
  { id: "repeat-last", category: "정렬", name: "마지막 정렬 반복", file: "05_정렬/Align_RepeatLast.jsx", summary: "마지막으로 실행한 정렬 스크립트를 다시 실행합니다. F4처럼 반복 작업에 씁니다.", tags: ["반복", "정렬"] },
  { id: "visible-h-left", category: "정렬", name: "보이는 영역 가로 왼쪽", file: "05_정렬/Align_VisibleHLeft.jsx", summary: "단독 텍스트와 그룹 텍스트 모두 글리프의 보이는 경계를 기준으로 왼쪽 정렬합니다.", tags: ["보이는 영역", "텍스트"] },
  { id: "visible-h-center", category: "정렬", name: "보이는 영역 가로 가운데", file: "05_정렬/Align_VisibleHCenter.jsx", summary: "글리프와 그룹 내부 보이는 경계를 기준으로 가로 가운데를 맞춥니다.", tags: ["보이는 영역", "텍스트"] },
  { id: "visible-h-right", category: "정렬", name: "보이는 영역 가로 오른쪽", file: "05_정렬/Align_VisibleHRight.jsx", summary: "글리프와 그룹 내부 보이는 경계를 기준으로 오른쪽 끝을 맞춥니다.", tags: ["보이는 영역", "텍스트"] },
  { id: "visible-v-top", category: "정렬", name: "보이는 영역 세로 위", file: "05_정렬/Align_VisibleVTop.jsx", summary: "글리프와 그룹 내부 보이는 경계를 기준으로 위쪽 끝을 맞춥니다.", tags: ["보이는 영역", "텍스트"] },
  { id: "visible-v-center", category: "정렬", name: "보이는 영역 세로 가운데", file: "05_정렬/Align_VisibleVCenter.jsx", summary: "글리프와 그룹 내부 보이는 경계를 기준으로 세로 가운데를 맞춥니다.", tags: ["보이는 영역", "텍스트"] },
  { id: "visible-v-bottom", category: "정렬", name: "보이는 영역 세로 아래", file: "05_정렬/Align_VisibleVBottom.jsx", summary: "글리프와 그룹 내부 보이는 경계를 기준으로 아래쪽 끝을 맞춥니다.", tags: ["보이는 영역", "텍스트"] },
  { id: "output-600png", category: "내보내기", name: "600ppi PNG", file: "06_내보내기/Output_600png.jsx", summary: "작업물을 600ppi PNG로 내보낼 때 사용합니다.", tags: ["PNG", "내보내기"] },
  { id: "dup-anchor", category: "기타", name: "선택 앵커에 복제", file: "10_기타/Dup At Selected Anchors.jsx", summary: "선택한 앵커 위치에 개체를 복제합니다.", tags: ["앵커", "복제"] },
  { id: "axis-label", category: "기타", name: "그래프 축 라벨", file: "10_기타/Graph_AxisLabel.jsx", summary: "L자 패스를 그래프 축 스타일로 정리하고 시간, 거리, 0 라벨을 배치합니다.", tags: ["그래프", "라벨"] },
  { id: "downsample", category: "기타", name: "이미지 600ppi 다운샘플", file: "10_기타/Image_Downsample600ppi.jsx", summary: "이미지 해상도를 600ppi 기준으로 정리할 때 사용합니다.", tags: ["이미지", "해상도"] },
  { id: "lock-raster", category: "기타", name: "래스터 잠금", file: "10_기타/Image_LockRaster.jsx", summary: "문서 안 래스터 이미지를 전용 레이어로 모으고 30% 불투명도로 잠급니다.", tags: ["이미지", "잠금"] },
  { id: "clip-crop", category: "기타", name: "클리핑 실제 자르기", file: "10_기타/clip_crop_visible.jsx", summary: "클리핑 마스크에서 가려진 부분을 실제로 삭제하고 보이는 부분만 남깁니다.", tags: ["클리핑", "자르기"] },
  { id: "embed", category: "기타", name: "이미지 포함", file: "10_기타/embed.jsx", summary: "링크 이미지를 포함하고, 불필요한 투명 클리핑 마스크를 정리합니다.", tags: ["이미지", "포함"] },
  { id: "empty-del", category: "기타", name: "빈 개체 삭제", file: "10_기타/emptydel.jsx", summary: "면과 선이 없고 투명한 빈 개체를 삭제합니다. 클리핑 마스크는 보존합니다.", tags: ["정리", "삭제"] },
  { id: "find-replace", category: "기타", name: "비슷한 개체 찾기/교체", file: "10_기타/find-replace.jsx", summary: "기준 개체와 비슷한 개체를 조건별로 찾아 선택하고, 교체본으로 일괄 교체합니다.", tags: ["찾기", "교체"] },
  { id: "fit-2mm", category: "기타", name: "대지 2mm 맞춤", file: "10_기타/fit2mm.jsx", summary: "선택한 에셋 또는 현재 대지 위 에셋에 맞춰 대지를 2mm 여백으로 조정합니다.", tags: ["대지", "여백"] },
  { id: "raster-del", category: "기타", name: "래스터 삭제", file: "10_기타/rasterdel.jsx", summary: "잠금 해제된 래스터 이미지만 제거합니다.", tags: ["이미지", "삭제"] },
  { id: "replace-items", category: "기타", name: "개체 교체", file: "10_기타/replaceItems.jsx", summary: "선택한 개체를 다른 개체로 교체하는 외부 스크립트 기반 도구입니다.", tags: ["교체", "개체"] },
  { id: "math-worksheet", category: "기타", name: "연산 워크시트", file: "99_지호/Math_worksheet.jsx", summary: "만 5세 연산 워크시트를 여러 유형으로 생성합니다.", tags: ["워크시트", "수학"] }
];

const categoryColors = {
  "전체": ["#0b2344", "#e9eef6"],
  "세팅": ["#3b5bdb", "#e8ecfb"],
  "도형": ["#2f9e44", "#e6f4ea"],
  "문자": ["#7048e8", "#eee9fc"],
  "색상": ["#e8590c", "#fceee4"],
  "삽입": ["#0c8599", "#e1f2f4"],
  "정렬": ["#1971c2", "#e5eff9"],
  "내보내기": ["#c2830a", "#f8f0dd"],
  "기타": ["#596673", "#eceef1"]
};

const categoryOrder = Object.keys(categoryColors).filter((category) => category !== "전체");

function categoryRank(category) {
  const index = categoryOrder.indexOf(category);
  return index === -1 ? categoryOrder.length : index;
}

function orderedCategories() {
  return categoryOrder.filter((category) => scripts.some((script) => script.category === category));
}

const storageKey = "illuScriptGuideAdmin";
// 저장소에 커밋되어 모든 방문자에게 배포되는 콘텐츠 파일. 어드민에서 내보낸 JSON을 이 경로에 덮어쓰고 커밋하면 사이트에 반영됩니다.
const contentUrl = "assets/content.json";
const state = {
  category: "전체",
  query: "",
  route: { view: "home", id: null },
  custom: loadCustomData()
};

function normalizeCustom(data) {
  data = data || {};
  return {
    notice: data.notice || null,
    images: data.images || {},
    details: data.details || {}
  };
}

// 브라우저 localStorage에 저장된 개인 작업본(아직 게시하지 않은 초안)
function loadCustomData() {
  try {
    return normalizeCustom(JSON.parse(localStorage.getItem(storageKey)));
  } catch (_) {
    return normalizeCustom(null);
  }
}

// 게시본(content.json)을 기준으로 하고, 로컬 초안이 있으면 위에 덮어씁니다.
function mergeCustom(base, overlay) {
  return {
    notice: overlay.notice || base.notice || null,
    images: Object.assign({}, base.images, overlay.images),
    details: Object.assign({}, base.details, overlay.details)
  };
}

// 배포된 content.json을 불러와 기준 콘텐츠로 삼습니다. 파일이 없으면(404) 조용히 넘어갑니다.
async function loadPublishedContent() {
  try {
    const response = await fetch(contentUrl, { cache: "no-cache" });
    if (!response.ok) return;
    const published = normalizeCustom(await response.json());
    state.custom = mergeCustom(published, loadCustomData());
    renderNotice();
    renderScripts();
    if (state.route.view === "detail") renderDetail(state.route.id);
    syncDetailForm();
  } catch (_) {
    /* content.json이 아직 없거나 읽기 실패 시 로컬/기본값 유지 */
  }
}

function saveCustomData() {
  localStorage.setItem(storageKey, JSON.stringify(state.custom));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getScript(id) {
  return scripts.find((script) => script.id === id);
}

function categoryStyle(category) {
  const [color, soft] = categoryColors[category] || categoryColors["기타"];
  return `--category:${color};--category-soft:${soft}`;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "home") return { view: "home", id: null };
  if (hash.startsWith("script/")) return { view: "detail", id: hash.split("/")[1] };
  if (["catalog", "install", "loader", "admin"].includes(hash)) return { view: hash, id: null };
  return { view: "home", id: null };
}

function renderRoute() {
  state.route = parseRoute();
  const view = state.route.view;
  // Home and catalog share one scrollable page: the hero flows straight into the catalog.
  const showLanding = view === "home" || view === "catalog";
  document.querySelectorAll("[data-view]").forEach((section) => {
    const sectionView = section.dataset.view;
    if (sectionView === "home" || sectionView === "catalog") {
      section.hidden = !showLanding;
    } else {
      section.hidden = sectionView !== view;
    }
  });
  document.querySelectorAll(".nav a").forEach((link) => {
    const target = link.getAttribute("href").replace("#", "");
    const active = target === view || (target === "catalog" && view === "home");
    link.classList.toggle("is-active", active);
  });
  if (view === "detail") renderDetail(state.route.id);
  if (view === "catalog") {
    const anchor = document.getElementById("catalog");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderTabs() {
  const categories = ["전체", ...orderedCategories()];
  const tabs = document.getElementById("categoryTabs");
  tabs.innerHTML = categories.map((category) => (
    `<button class="tab" type="button" style="${categoryStyle(category)}" aria-selected="${category === state.category}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
  )).join("");
  tabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderTabs();
      renderScripts();
    });
  });
}

function getFilteredScripts() {
  const query = state.query.trim().toLowerCase();
  return scripts
    .filter((script) => {
      const categoryMatch = state.category === "전체" || script.category === state.category;
      const text = `${script.name} ${script.file} ${script.summary} ${script.tags.join(" ")}`.toLowerCase();
      return categoryMatch && (!query || text.includes(query));
    })
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
}

function renderScripts() {
  const grid = document.getElementById("scriptGrid");
  const filtered = getFilteredScripts();
  document.getElementById("scriptCount").textContent = scripts.length;
  document.getElementById("categoryCount").textContent = orderedCategories().length;
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">검색 결과가 없습니다.</p>`;
    return;
  }

  grid.innerHTML = filtered.map((script) => {
    const customDetail = state.custom.details[script.id] || {};
    const shots = customDetail.images || state.custom.images[script.id] || [];
    return `
      <a class="script-card" style="${categoryStyle(script.category)}" href="#script/${escapeHtml(script.id)}">
        <div class="script-meta">
          <span class="category-label">${escapeHtml(script.category)}</span>
          <code>${escapeHtml(script.file)}</code>
        </div>
        <div>
          <h3>${escapeHtml(customDetail.title || script.name)}</h3>
          <p>${escapeHtml(script.summary)}</p>
        </div>
        <div class="tag-row">
          ${script.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${shots.length ? `<div class="shot-list">${shots.map((shot) => `
          <figure class="shot">
            <img src="${shot.src}" alt="${escapeHtml(shot.caption || script.name)}">
            <figcaption>${escapeHtml(shot.caption || "스크린샷")}</figcaption>
          </figure>
        `).join("")}</div>` : ""}
      </a>
    `;
  }).join("");
}

function renderDetail(id) {
  const script = getScript(id);
  const content = document.getElementById("detailContent");
  if (!script) {
    content.innerHTML = `
      <div class="detail-hero">
        <a class="back-link" href="#catalog">← 목록으로</a>
        <h2>스크립트를 찾지 못했습니다.</h2>
      </div>
    `;
    return;
  }

  const customDetail = state.custom.details[id] || {};
  const shots = customDetail.images || state.custom.images[id] || [];
  content.innerHTML = `
    <article class="detail-hero" style="${categoryStyle(script.category)}">
      <a class="back-link" href="#catalog">← 목록으로</a>
      <span class="category-label">${escapeHtml(script.category)}</span>
      <h2>${escapeHtml(customDetail.title || script.name)}</h2>
      <code>${escapeHtml(script.file)}</code>
      <p>${escapeHtml(customDetail.body || script.summary)}</p>
      <div class="tag-row">
        ${script.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${shots.length ? shots.map((shot) => `
        <figure class="detail-image">
          <img src="${shot.src}" alt="${escapeHtml(shot.caption || script.name)}">
          <figcaption>${escapeHtml(shot.caption || "스크린샷")}</figcaption>
        </figure>
      `).join("") : `
        <div class="detail-image">
          <figcaption>어드민에서 스크린샷을 추가하면 이곳에 표시됩니다.</figcaption>
        </div>
      `}
    </article>
  `;
}

function renderNotice() {
  const notice = document.getElementById("customNotice");
  const data = state.custom.notice;
  if (!data || (!data.title && !data.body)) {
    notice.hidden = true;
    notice.innerHTML = "";
    return;
  }
  notice.hidden = false;
  notice.innerHTML = `<strong>${escapeHtml(data.title)}</strong><p>${escapeHtml(data.body)}</p>`;
}

function renderScriptSelect() {
  const select = document.getElementById("scriptSelect");
  select.innerHTML = scripts.map((script) => (
    `<option value="${escapeHtml(script.id)}">${escapeHtml(script.category)} · ${escapeHtml(script.name)}</option>`
  )).join("");
}

function syncDetailForm() {
  const form = document.getElementById("detailForm");
  const scriptId = form.elements.scriptId.value;
  const script = getScript(scriptId);
  const detail = state.custom.details[scriptId] || {};
  form.elements.title.value = detail.title || script.name;
  form.elements.body.value = detail.body || script.summary;
  form.elements.caption.value = "";
  form.elements.image.value = "";
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(state.custom, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "content.json";
  link.click();
  URL.revokeObjectURL(url);
}

document.getElementById("searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderScripts();
});

document.getElementById("noticeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.custom.notice = {
    title: form.get("title"),
    body: form.get("body")
  };
  saveCustomData();
  renderNotice();
});

document.getElementById("scriptSelect").addEventListener("change", syncDetailForm);

document.getElementById("detailForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const file = form.get("image");
  const scriptId = form.get("scriptId");
  const script = getScript(scriptId);
  const current = state.custom.details[scriptId] || {};

  function persistDetail(image) {
    const images = current.images ? current.images.slice() : (state.custom.images[scriptId] || []).slice();
    if (image) images.push(image);
    state.custom.details[scriptId] = {
      title: form.get("title") || script.name,
      body: form.get("body") || script.summary,
      images
    };
    saveCustomData();
    renderScripts();
    if (state.route.view === "detail" && state.route.id === scriptId) renderDetail(scriptId);
    syncDetailForm();
  }

  if (!file || !file.size) {
    persistDetail(null);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    persistDetail({
      caption: form.get("caption"),
      src: reader.result
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById("exportBtn").addEventListener("click", downloadJson);

const publishPwKey = "illuScriptGuidePublishPw";
const publishPasswordInput = document.getElementById("publishPassword");
const publishStatusEl = document.getElementById("publishStatus");

// 편의를 위해 이 브라우저에 게시 비밀번호를 기억해 둡니다.
publishPasswordInput.value = localStorage.getItem(publishPwKey) || "";

function setPublishStatus(message, kind) {
  publishStatusEl.textContent = message;
  publishStatusEl.dataset.kind = kind || "";
}

document.getElementById("publishBtn").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const password = publishPasswordInput.value.trim();
  if (!password) {
    setPublishStatus("게시 비밀번호를 입력하세요.", "error");
    return;
  }

  button.disabled = true;
  setPublishStatus("게시 중…", "info");
  try {
    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, content: state.custom })
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok) {
      localStorage.setItem(publishPwKey, password);
      const short = (data.commit || "").slice(0, 7);
      setPublishStatus(`게시 완료${short ? ` (커밋 ${short})` : ""}. 1~2분 뒤 사이트에 반영됩니다.`, "success");
    } else {
      const detail = data.detail ? ` — ${data.detail}` : "";
      setPublishStatus(`게시 실패: ${data.error || `서버 응답 ${response.status}`}${detail}`, "error");
    }
  } catch (_) {
    setPublishStatus("네트워크 오류로 게시하지 못했습니다. 로컬 환경에서는 /api가 없어 실패할 수 있습니다.", "error");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("importInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state.custom = {
        notice: data.notice || null,
        images: data.images || {},
        details: data.details || {}
      };
      saveCustomData();
      renderNotice();
      renderScripts();
      if (state.route.view === "detail") renderDetail(state.route.id);
      syncDetailForm();
    } catch (_) {
      alert("JSON 파일을 읽을 수 없습니다.");
    }
  };
  reader.readAsText(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("저장한 문구와 이미지를 초기화할까요?")) return;
  state.custom = { notice: null, images: {}, details: {} };
  saveCustomData();
  renderNotice();
  renderScripts();
  if (state.route.view === "detail") renderDetail(state.route.id);
  syncDetailForm();
});

window.addEventListener("hashchange", renderRoute);

renderTabs();
renderNotice();
renderScriptSelect();
syncDetailForm();
renderScripts();
renderRoute();
loadPublishedContent();
