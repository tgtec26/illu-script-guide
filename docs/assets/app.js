const scripts = [
  { id: "setup", category: "세팅", name: "setup", file: "00_세팅/setup.jsx", summary: "새 PC에서 Illustrator 환경을 한 번에 맞춥니다. 단위, 키보드 증감, 문자 증감, 고정점 표시, 액션 세트를 적용합니다.", tags: ["환경설정", "액션", "새 PC"] },
  {
    id: "particle-model",
    category: "도형",
    name: "입자 모형",
    file: "01_도형/Object_ParticleModel.jsx",
    summary: "원자 모형·분자 모형·이온 결합 모형 생성기를 한 창의 탭으로 묶은 스크립트입니다. 세 탭이 옵션과 크기를 같이 쓰고, 실시간 미리보기를 지원합니다. 탭마다 '임시 생성하기'로 모형을 확정해 두고 마지막에 '완료하기'를 누르면 여러 탭의 모형을 한 번에 만듭니다. 임시 생성한 모형도 완료 전까지는 공통 옵션·크기 변경을 따라갑니다.",
    shared: "핵 전하량 표시, 전자 - 기호, 전자 껍질 선, 핵·전자 3D 조명 효과, 크기(1껍질 지름·핵 지름·전자 지름·핵 전하량 글자)를 세 탭이 같이 씁니다.",
    requires: "선택 없이 실행합니다. 정원을 하나 선택하고 실행하면 그 원을 최외곽 껍질로 삼아 크기를 맞추고, 만들 때 그 원은 지웁니다.",
    tags: ["원자", "분자", "이온", "전자", "껍질", "모형", "화학"],
    tabs: [
      { id: "atom", name: "원자", summary: "H~Ar 원소를 다중 선택해 원자 모형을 그립니다. 이온 전하(-3~+3)와 이온 전하 글자 크기, 1번 껍질 수평 배열, 2·3번 껍질 22.5° 이동을 고릅니다." },
      { id: "molecule", name: "분자", summary: "H₂·N₂·O₂·F₂·Cl₂·HCl·H₂O·CO₂·Cl₂O·NH₃·CH₄ 공유 결합 모형을 껍질 겹침(%)과 함께 그립니다." },
      { id: "ionic", name: "이온 결합", summary: "LiF·NaF·NaCl·KCl·Na₂O·K₂O·MgO·CaO·MgCl₂·CaCl₂ 화합물을 그립니다. 이온 전하 글자 크기·이온 간격·1껍질 전자 3시·9시 옵션을 조절합니다." }
    ]
  },
  {
    id: "graph-tools",
    category: "도형",
    name: "그래프·표",
    file: "01_도형/Object_GraphTools.jsx",
    summary: "축 눈금·그래프 마커·표·점선 분할선·모델 곡선·원그래프·태양 스펙트럼을 한 창의 탭으로 묶은 스크립트입니다. 창이 옆으로 늘어나지 않도록 탭 이름은 축·마커·표·분할·모델·원·복사로 줄여 표시합니다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로입니다.",
    requires: "탭마다 필요한 선택이 다릅니다. 원 탭은 원 하나, 마커 탭은 꺾은선 패스, 나머지 탭은 사각형 하나를 선택합니다. 선택에 맞지 않는 탭은 흐리게 표시되고 툴팁에 이유가 적히며, 아무것도 선택하지 않고 실행하면 도형을 먼저 그리라는 안내창이 뜹니다.",
    tags: ["그래프", "축", "눈금", "마커", "과학", "표", "정렬", "점선", "분할", "곡선", "정규분포", "생장", "하디바인베르크", "생명", "화학", "태양", "복사", "스펙트럼", "지구과학", "대기", "원그래프", "파이", "도넛", "비율", "입체"],
    tabs: [
      { id: "axis-ticks", name: "축", summary: "사각형을 기준으로 아래축과 왼쪽축을 만들고, 화살표와 눈금 숫자를 배치합니다.", requires: "사각형 하나를 선택합니다." },
      { id: "markers", name: "마커", summary: "선택한 꺾은선 그래프의 모든 고정점에 원·사각형·삼각형 마커를 넣습니다. 크기(0.5~2mm), 채움(K 10 단위), 테두리(0 또는 0.3~1pt, 100K)를 미리보기로 조절합니다.", requires: "꺾은선 그래프(패스)를 선택합니다." },
      { id: "table", name: "표", summary: "선택한 사각형을 행·열로 나눈 표로 바꿉니다. 셀마다 테두리 사각형이 생겨 글자를 정렬하기 쉽습니다.", requires: "가로·세로 변이 축에 나란한 사각형 하나를 선택합니다." },
      { id: "dashed-grid", name: "분할", summary: "선택한 사각형을 행·열 수만큼 나누는 점선(0.3pt, 2pt 선·1pt 간격)을 넣습니다. 2행 2열이면 가운데 가로·세로 점선 하나씩으로 4칸이 됩니다. 슬라이더로 수를 정한 뒤 완료를 누르면 그립니다.", requires: "가로·세로 변이 축에 나란한 사각형 하나를 선택합니다." },
      { id: "model-curves", name: "모델", summary: "선택한 사각형을 그래프 영역으로 삼아 과학의 이상적 모델 곡선을 그립니다. 정규분포, 이론적 생장 곡선(J형), 실제 생장 곡선(S형·로지스틱), 하디-바인베르크(p²·2pq·q²), 효소 반응 속도(미카엘리스-멘텐), 산소 해리 곡선(힐 식), 생존 곡선(Ⅰ·Ⅱ·Ⅲ형), 활성화 에너지 도표(촉매 곡선), 지수 감소(반감기), 맥스웰-볼츠만 분포, 반비례(보일 법칙), 거듭제곱 12종입니다. 사각형 너비가 x, 높이가 y 범위이고 종류마다 봉우리 위치·폭·가파름·환경 수용력·높이 같은 옵션과 K·Vmax 점선을 미리보기로 조절합니다. 사각형은 기본으로 남겨 두어 곡선을 그린 뒤 같은 사각형으로 축 눈금을 이어 만들 수 있습니다.", requires: "가로·세로 변이 축에 나란한 사각형 하나를 선택합니다." },
      { id: "pie-chart", name: "원", summary: "선택한 원을 바깥 지름으로 삼아 파이·도넛 그래프를 그립니다. 항목 수(2~7)를 라디오로 고르고 항목마다 이름과 비율을 넣으며, 세포 주기 탭과 같은 조절점 슬라이더로 비율을 끌어 조절합니다(합계 항상 100%). 비워 둔 이름은 A·㉠·ⓐ 중 고른 기호가 큰 비율부터 차례로 들어갑니다. 지시선 기준(기본 10%) 미만 항목은 바깥에 꺾인 지시선(둘째 선은 항상 가로)으로 이름을 달고 나머지는 안쪽에 둡니다. 채움은 큰 항목부터 K0·K10·K20…, 라벨은 ‘이름 12.3 %’ 꼴입니다. 외경은 선택한 원의 지름에서 시작하며 바꾸면 원의 가운데를 기준으로 커지거나 작아지고(선택에서 오는 값이라 저장하지 않음), 내경을 주면 도넛, 회전으로 시작 위치를 돌리고, 입체를 켜면 돌출 깊이와 위아래·좌우 기울기로 3D 라인 스크립트처럼 기울인 입체(평행 투영, 옆면은 윗면보다 K20 어둡게)로 그립니다. 확인하면 원본 원은 지워집니다.", requires: "원 하나를 선택합니다 (타원 도구로 그린 닫힌 4점 원. 돌린 원도 됩니다)." },
      { id: "solar-spectrum", name: "복사", summary: "대기 밖과 지표면에서의 태양 복사 에너지 그래프를 그립니다. NREL ASTM G173 표준 스펙트럼(대기 밖·지표면 AM1.5)을 내장하고, 단순화(가우시안 평활) 슬라이더로 교과서 수준까지 요철을 줄입니다. 오존(자외선)·수증기·CO₂(적외선) 흡수 영역을 닫힌 면으로 만들고, 축·0.5 µm 눈금·축 범례·자외선/가시광선/적외선 화살표를 함께 넣습니다. 흡수 영역 위쪽은 대기 밖 곡선까지(교과서식) 또는 포락선까지 중 고릅니다.", requires: "가로·세로 변이 축에 나란한 사각형 하나를 선택합니다. 그 사각형이 그래프 영역이 되고 확인할 때 지워집니다." }
    ]
  },
  { id: "bohr-orbit", category: "도형", name: "보어 궤도", file: "01_도형/Object_BohrQuantumOrbit.jsx", summary: "보어 원자 모형의 궤도 표현을 만드는 스크립트입니다.", tags: ["과학", "원자"] },
  { id: "circular-align", category: "도형", name: "원형 정렬", file: "01_도형/Object_CircularAlignment.jsx", summary: "선택한 개체를 원형 구조로 정렬할 때 사용합니다.", tags: ["배치", "정렬"] },
  { id: "ext-ungroup", category: "기타", name: "확장 언그룹", file: "10_기타/ExtUngroup.jsx", summary: "복잡한 그룹을 작업하기 쉽게 풀어내는 보조 스크립트입니다.", tags: ["정리", "그룹"] },
  { id: "button-out", category: "도형", name: "버튼 입체화", file: "01_도형/Object_button_Out.jsx", summary: "선택한 원이나 타원을 뒤쪽으로 복제하고 접선 라인을 추가해 버튼처럼 입체화합니다.", tags: ["입체", "원"] },
  { id: "cabinet-inout", category: "도형", name: "캐비넷 투영 + 숨은선", file: "01_도형/Object_cabinet_InOut.jsx", summary: "사각형을 캐비넷 투영법으로 입체화하고 숨은 선을 파선으로 추가합니다.", tags: ["입체", "숨은선"] },
  { id: "cabinet-out", category: "도형", name: "캐비넷 투영", file: "01_도형/Object_cabinet_Out.jsx", summary: "선택한 사각형을 캐비넷 투영법으로 빠르게 입체화합니다.", tags: ["입체", "사각형"] },
  {
    id: "round-solids",
    category: "도형",
    name: "원 입체",
    file: "01_도형/Object_RoundSolids.jsx",
    summary: "선택한 원을 기준으로 원기둥·원뿔·구를 만드는 세 스크립트를 한 창의 탭으로 묶은 스크립트입니다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로입니다.",
    requires: "세 탭 모두 가로·세로가 같은 원 패스 하나를 선택해야 합니다.",
    tags: ["입체", "원기둥", "원뿔", "원뿔대", "분할", "구", "위도", "경도"],
    tabs: [
      { id: "cylinder", name: "원기둥", summary: "선택한 원을 기준으로 원기둥을 세웁니다. 면별 K 농도 음영과 속이 비치는 관 구멍을 지원합니다.", requires: "가로·세로가 같은 원 패스 하나를 선택합니다." },
      { id: "cone", name: "원뿔", summary: "선택한 원을 기준으로 원뿔 또는 원뿔대를 만듭니다. 밑면·윗면 지름, 높이 균등 분할선, 면별 K 농도, X·Y·Z축 시점을 조절합니다.", requires: "가로·세로가 같은 원 패스 하나를 선택합니다." },
      { id: "sphere", name: "구", summary: "선택한 원을 기준으로 구를 만들고 경도선과 위도선을 배치합니다. 경도선 회전과 X·Y·Z축 시점 조절을 지원합니다.", requires: "가로·세로가 같은 원 패스 하나를 선택합니다." }
    ]
  },
  { id: "circle-guide", category: "도형", name: "끝점 원 안내선", file: "01_도형/Object_circleguideline.jsx", summary: "선의 양 끝점에 반지름 0.5mm 원을 만들고 안내선으로 바꿉니다.", tags: ["안내선", "끝점"] },
  { id: "offset-guide", category: "도형", name: "오프셋 안내선", file: "01_도형/Object_OffsetGuide.jsx", summary: "선택한 도형을 오프셋만큼 키우거나 줄인 모양을 안내선으로 만듭니다. 0.1mm 단위로 조절하고 미리보기로 확인합니다.", tags: ["안내선", "오프셋"] },
  { id: "dash-shift", category: "도형", name: "파선 오프셋", file: "01_도형/Object_dashshift.jsx", summary: "파선의 시작 위치를 미세 조정합니다. 도판에서 점선이 모서리와 어긋날 때 유용합니다.", tags: ["파선", "미세조정"] },
  { id: "expand-arrow", category: "도형", name: "확장 화살표", file: "01_도형/Object_expand_arrow.jsx", summary: "선택한 패스에 지정된 선 두께, 화살표, 폭 속성을 적용합니다.", tags: ["화살표", "선"] },
  { id: "isometric", category: "도형", name: "아이소메트릭", file: "01_도형/Object_isometric.jsx", summary: "가로·세로·높이와 코너 각도를 정해 등각 투상 상자 또는 원기둥(타원 기둥)을 만듭니다. 높이 분할, 위치 이동을 미리보기로 조절하고, 상자는 압축(휨) 옵션도 있습니다.", tags: ["입체", "아이소", "원기둥"] },
  { id: "rotate3d", category: "도형", name: "3D 회전", file: "01_도형/Object_rotate3d.jsx", summary: "선택 개체를 3D 회전 스타일로 변형할 때 사용합니다.", tags: ["3D", "회전"] },
  {
    id: "3dline",
    category: "도형",
    name: "3D → 2D 라인",
    file: "01_도형/Object_3DLine.jsx",
    summary: "입체 도형·돌출·회전체를 한 창의 탭으로 묶은 스크립트입니다. 라이노에서 3D를 만들고 2D로 뽑던 작업을 일러스트레이터 안에서 끝내려고 만들었습니다. 돌출·회전체처럼 볼록하지 않은 도형도 광선 교차로 숨은선을 정확히 가르고, 확인하면 원본 패스·축은 지워집니다.",
    shared: "시점, 숨은선(파선·실선·생략), 면 채우기(없음·단일 음영·광원 자동: 밝기·대비·광원 방위·높이), 위치 이동을 탭들이 같이 씁니다.",
    requires: "탭마다 필요한 선택이 다릅니다. 선택에 맞지 않는 탭은 흐리게 표시되고, 마지막에 쓴 탭이 선택에 맞으면 그 탭이 열립니다.",
    tags: ["입체", "3D", "숨은선", "음영", "정다면체", "원기둥", "원뿔", "돌출", "익스트루드", "회전체", "도넛", "파이프"],
    tabs: [
      { id: "solid-view", name: "입체 도형1", summary: "직육면체·정사면체·정팔면체·정십이면체·정이십면체·각기둥·각뿔·각뿔대·원기둥·원뿔·원뿔대·빨대(속 빈 원기둥)를 만듭니다. 가로 회전·위아래 기울기·화면 회전·커스텀 프리셋·원근으로 물체를 돌리는 카메라 방식입니다.", requires: "선택 없이 실행하거나, 기준이 될 개체 하나만 선택합니다." },
      { id: "solid-angle", name: "입체 도형2", summary: "입체 도형1과 같은 도형을 결정 구조와 같은 관찰 각도로 그립니다. 모서리의 화면 각도(오른쪽·왼쪽)와 앞·뒤 면 거리, 등각·2등각·3등각·사면체·층상 프리셋으로 그림을 정하는 제도 방식이고 원근은 없습니다.", requires: "선택 없이 실행하거나, 기준이 될 개체 하나만 선택합니다." },
      { id: "extrude", name: "돌출", summary: "패스를 앞뒤로 밀어 기둥을 만듭니다. 닫힌 패스는 뚜껑 있는 기둥, 열린 패스는 띠가 되고, 여러 개가 겹치면 겹친 깊이가 홀수인 안쪽이 구멍이 됩니다.", requires: "패스를 하나 이상 선택합니다." },
      { id: "revolve", name: "회전체", summary: "단면을 축 둘레로 돌린 회전체를 만듭니다. 사각형에 접한 축이면 원기둥, 원과 떨어진 축이면 도넛이 됩니다.", requires: "단면 패스와 축이 될 직선(앵커 2개)을 함께 선택합니다." }
    ]
  },
  { id: "dash-2-1", category: "도형", name: "점선 2-1", file: "01_도형/Object_setdash2-1.jsx", summary: "선택한 개체의 선을 2pt 점선, 1pt 간격으로 바꿉니다.", tags: ["파선", "선"] },
  { id: "dash-3-1", category: "도형", name: "점선 3-1", file: "01_도형/Object_setdash3-1.jsx", summary: "선택한 개체의 선을 3pt 점선, 1pt 간격으로 바꿉니다.", tags: ["파선", "선"] },
  { id: "chain-line", category: "도형", name: "1점 쇄선", file: "01_도형/Object_setdash4-1-1-1.jsx", summary: "긴선 4pt, 간격 1pt, 짧은선 1pt, 간격 1pt의 1점 쇄선을 적용합니다.", tags: ["쇄선", "선"] },
  {
    id: "electricity",
    category: "도형",
    name: "전기",
    file: "01_도형/Object_Electricity.jsx",
    summary: "회로 기호 삽입·코일 감긴 도선·에너지 흐름 화살표를 한 창의 탭으로 묶은 스크립트입니다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로입니다.",
    requires: "탭마다 필요한 선택이 다릅니다. 선택에 맞지 않는 탭은 흐리게 표시되고 툴팁에 이유가 적힙니다.",
    tags: ["회로", "물리", "기호", "과학", "전자기", "에너지", "화살표", "다이어그램"],
    tabs: [
      { id: "circuit-symbol", name: "회로 기호", summary: "직선을 선택하고 저항·직렬 전지·교류 전원·스위치·인덕터·축전기·전류계·전압계 기호를 클릭한 순서대로 선 위에 균등 배치합니다.", requires: "직선(앵커 2개짜리 패스) 하나를 선택합니다." },
      { id: "solenoid", name: "코일 도선", summary: "선택한 사각형을 도선으로 바꾸고 나선 투영으로 코일을 감습니다. 감는 횟수에 따라 코일 간격이 달라집니다.", requires: "도선이 될 사각형 하나를 선택합니다. 사각형의 가로가 도선 길이, 세로가 도선 굵기가 됩니다." },
      { id: "energy-flow", name: "에너지 흐름", summary: "선택한 사각형을 연료 에너지 상자로 삼아 그 위로 갈라져 올라가는 에너지 흐름 화살표를 그립니다. 상자 이름·값(숫자 뒤에 이탤릭 E 자동)을 넣고 2·3·4개로 나눈 뒤 구간 슬라이더나 값 입력으로 비율을 정하며, 항목마다 이름과 ?로 표시 여부를 고릅니다. 첫 화살표는 12시 방향으로 곧게, 마지막은 90° 꺾여 3시 방향으로 나가고 가운데 화살표는 각도를 조절합니다. 화살표마다 꺾임 높이·길이·꺾임 반지름·음영(K%), 공통으로 상자 폭·높이, 화살촉 길이·폭(몸통 폭 대비 %라 닮은꼴), 글자 크기, 값 높이, 위치를 조절합니다. 확인하면 원본 사각형은 지워집니다.", requires: "상자가 될 사각형(앵커 4개) 하나를 선택합니다. 사각형 폭이 화살표 전체 폭이 됩니다." }
    ]
  },
  { id: "anchor-angle", category: "도형", name: "앵커 기준 각도", file: "01_도형/Object_AnchorAngle.jsx", summary: "앵커 포인트 2개를 잡아 그 선분의 각도를 지정한 값으로 맞춥니다.", tags: ["앵커", "각도"] },
  {
    id: "smooth-path",
    category: "도형",
    name: "패스 정리",
    file: "01_도형/Object_SmoothPath_v2.jsx",
    summary: "연필·펜으로 그린 패스를 정리합니다. 앵커 제거와 부드럽게 두 탭으로 나뉘고, 확인은 열려 있는 탭의 작업만 적용합니다.",
    requires: "두 탭 모두 정리할 패스(그룹·복합 패스 포함)를 선택한 뒤 실행합니다.",
    tags: ["연필", "곡선", "앵커", "단순화", "세포막", "트레이스", "앵커 제거"],
    tabs: [
      { id: "remove-anchor", name: "앵커 제거", summary: "원본 핸들을 그대로 두고, 빼도 허용 오차(mm) 안에 맞는 고정점만 삭제합니다 — VectorFirstAid의 Super Smart Remove 방식. 이미지 트레이스처럼 핸들이 제대로 붙은 복잡한 그림에 맞습니다. 수천 패스·수만 앵커를 다루므로 미리보기 없이 확인 때 한 번에 적용하고, 시작할 때 좌표도 읽지 않아 다이얼로그가 바로 뜹니다." },
      { id: "smooth", name: "부드럽게", summary: "연필로 그린 패스용입니다. 앵커 줄이기(허용 오차 안에서 필요 없는 고정점 삭제)와 곡선 다듬기(꺾인 곳과 곡률이 튀는 곳을 펴서 부드럽게)를 0~100 강도로 각각 조절하고, 모서리 유지 각도보다 급하게 꺾인 점만 모서리로 남깁니다. '급한 곳만 다듬기'를 켜면 곡률 상위 N% 구간만 평활하고 나머지 앵커·핸들은 원본 그대로 둡니다. 세포막처럼 크기가 중요한 그림이 쪼그라들지 않도록 평활은 면적을 지키는 방식이고, 미리보기가 선택한 패스에 바로 적용되며 취소하면 원래 좌표로 돌아갑니다." }
    ]
  },
  {
    id: "cell-division",
    category: "도형",
    name: "염색체·세포 분열",
    file: "01_도형/Object_CellDivision.jsx",
    summary: "염색체 모형·상동 염색체·감수 분열·세포 주기를 한 창의 탭으로 묶은 스크립트입니다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로입니다.",
    requires: "염색체 모형과 세포 주기는 선택 없이 실행하고, 상동 염색체와 감수 분열은 그림이 들어갈 사각형 하나를 선택합니다. 선택에 맞지 않는 탭은 흐리게 표시됩니다.",
    tags: ["과학", "생물", "핵형", "다이어그램"],
    tabs: [
      { id: "chromosome", name: "염색체 모형", summary: "핵형 분석 설명용 염색체 모형을 최대 4개까지 한 번에 그립니다. 염색체마다 염색 분체 수(1·2개)·전체 길이·두께·중심절 위치와 지름·벌림 각도·p암/q암 휨·내부 음영을 따로 정하고, 켜진 염색체가 선택 개체(없으면 아트보드) 중심에 가로로 나란히 놓입니다. 암은 중심절 쪽이 좁고 끝이 둥근 형태, 중심절은 흰 원, 외곽선 0.3pt입니다.", requires: "선택 없이 실행합니다. 선택한 개체가 있으면 그 중심에 놓입니다." },
      { id: "homologous", name: "상동 염색체", summary: "선택한 사각형에 맞춰 상동 염색체 한 쌍을 그립니다. 좌우 두께·중심절 위치와 지름·염색체 간격을 조절하고 유전자 좌를 최대 3개까지 표시합니다. 중심절 지름을 바꾸면 p암·q암이 따라 붙습니다.", requires: "그림이 들어갈 사각형 하나를 선택합니다. 사각형의 높이가 염색체 전체 길이를, 좌우 폭이 두께와 간격의 초기값을 정합니다." },
      { id: "meiosis", name: "감수 분열", summary: "선택한 사각형을 비계로 감수 분열 과정(G1기 → 중기 1 → 중기 2 → 딸세포 → 정자)을 그립니다. 줄마다 세로 간격, 딸세포 사이 가로 간격, 단계별 지름, 정자 머리·꼬리 모양과 회전, 전체 위치를 조절하면 중기 2 위치와 화살표 각도가 따라옵니다.", requires: "그림이 들어갈 사각형 하나를 선택합니다. 사각형의 좌우 폭이 맨 아래 네 세포의 배치를, 높이가 세로 간격의 초기값을 정합니다." },
      { id: "cell-cycle", name: "세포 주기", summary: "세포 주기 도넛 다이어그램을 만듭니다. 외경·내경, 네 구간의 비율과 제목, 안쪽을 도는 화살표를 조절합니다.", requires: "선택 없이 실행합니다." }
    ]
  },
  { id: "light-burst", category: "도형", name: "빛 번짐 (별·광원·폭발)", file: "01_도형/Object_LightBurst.jsx", summary: "선택한 정원을 중심으로 사방으로 갈라지는 빛줄기와 후광을 만들어 밝게 빛나는 별·광원·폭발을 표현합니다. 스타일 프리셋(반짝임 4갈래·별빛 8갈래·조명·폭발)을 고르고, 빛줄기(중심 포함) 색과 번짐 색을 9종(흰·노랑·주황·하늘·파랑·빨강·연두·회색·검정)에서 따로 정하며, 갈라짐 수(2~64)·길이·폭·회전, 길이 변화·폭 변화(%)와 변화 방식(무작위·번갈아, 다시 섞기. 긴 줄기가 굵어짐), 번짐 크기, 밝기(전체 불투명도), 중심 원 크기(표시 여부 체크)를 조절합니다. 검정에 밝기를 낮추면 흰 종이 위 회색 빛이 됩니다. 중심은 흰색으로 타오르고 줄기·후광은 방사형 그라데이션으로 끝에서 투명해져 어떤 배경 위에도 올릴 수 있습니다. 확인하면 원본 원은 지워집니다.", tags: ["빛", "광원", "별", "폭발", "섬광", "후광", "밝기"] },
  { id: "cloud", category: "도형", name: "구름", file: "01_도형/Object_Cloud.jsx", summary: "직접 그려 둔 구름 10종(적운·층적운·적란운 등, 구름 K0 · 그림자 1 K20 · 그림자 2 K40 · 외곽선 0.3pt)을 5×2 번호 버튼으로 골라 선택한 사각형 안에 그립니다. 모양은 원본 그대로이고 크기(비율 유지 또는 꽉 채우기), 세 면의 K값(10 단위), 선 표시만 조절합니다. 외곽선은 크기를 바꿔도 0.3pt를 지킵니다. 모양 데이터는 같은 폴더의 Object_Cloud_library.jsxinc에 있고 tools/cloud-library로 다시 만들 수 있습니다. 확인하면 원본 사각형은 지워집니다.", tags: ["날씨", "구름", "하늘", "기상", "음영", "라이브러리"] },
  { id: "pedigree", category: "도형", name: "가계도", file: "01_도형/Object_Pedigree.jsx", summary: "선택한 사각형 중앙에 조부모·부모·형제·자녀 가계도를 그립니다. 친가·외가 형제 각 2명, 자녀 4명까지 추가하고, 구성원마다 (가) 사선·(나) 격자·둘 다 20% 음영 발현과 ⓐⓑⓒ 원문자 가림, 자녀는 물음표를 정합니다. 도형 크기, 부부·형제 간격, 세대별 거리, 형제 분기점, 가계도·범례 위치를 조절하면 번호가 왼쪽부터 자동으로 붙고, 그려진 표현만 담은 범례를 오른쪽에 넣을 수 있습니다.", tags: ["과학", "생물", "유전"] },
  {
    id: "crystal-structure",
    category: "도형",
    name: "결정 구조",
    file: "01_도형/Object_CrystalStructure.jsx",
    summary: "입방정계 단위세포·다이아몬드 결정·흑연 결정 생성기를 한 창의 탭으로 묶은 스크립트입니다. 각 탭의 격자 계산과 그리기는 원래 스크립트 그대로이고, 탭마다 자기 투영 행렬을 따로 가집니다.",
    shared: "구 3D 조명 효과, 구 외곽선, 색상 표현(컬러·회색 음영), 관찰 각도(오른쪽·왼쪽 각도, 앞·뒤 면 거리, Isometric·Dimetric·Trimetric·Tetrahedral·Layered 프리셋), 미리보기 위치 이동을 탭들이 같이 씁니다.",
    requires: "네 탭 모두 선택 없이 실행합니다.",
    tags: ["결정", "단위세포", "입방정계", "다이아몬드", "흑연", "격자", "3D"],
    tabs: [
      { id: "cubic-angle", name: "입방정계1", summary: "단순·체심·면심 입방과 NaCl·CsCl·I2·CO2 격자 유형을 다중 선택해 1셀 또는 2×2×2로 그립니다. 라인·밀집·절단 표현, 숨은선, 구 지름·밝기·셀 간격을 조절하고, 모서리 각도로 그림을 정하는 제도 방식으로 투영합니다." },
      { id: "cubic-view", name: "입방정계2", summary: "격자 계산과 그리기는 입방정계1과 같고, 투영만 3D → 2D 라인과 같은 시점(가로 회전·위아래 기울기·화면 회전, 정면·등각·측면·윗면 프리셋)으로 합니다." },
      { id: "diamond", name: "다이아몬드", summary: "1셀·8셀·피라미드 클러스터로 그리고 단위세포 라인, C-C 결합선, 경계 결합 완성, 숨은선, 탄소 구 지름·결합선 굵기·밝기를 조절합니다." },
      { id: "graphite", name: "흑연", summary: "AB·AA 적층으로 육각형 가로·세로 수, 적층 수, C-C 결합 길이, 층간 거리, 층간 점선, 탄소 구 지름·밝기를 조절합니다." }
    ]
  },
  {
    id: "mechanics",
    category: "도형",
    name: "역학",
    file: "01_도형/Object_Mechanics.jsx",
    summary: "진자 운동·수평 던지기 포물선·사인 곡선·코일 스프링을 한 창의 탭으로 묶은 스크립트입니다. 각 탭의 코드와 저장 키는 원래 스크립트 그대로입니다.",
    requires: "탭마다 필요한 선택이 다릅니다. 선택에 맞지 않는 탭은 흐리게 표시되고 툴팁에 이유가 적힙니다.",
    tags: ["과학", "역학", "포물선", "운동", "파동", "입체", "스프링"],
    tabs: [
      { id: "pendulum", name: "진자 운동", summary: "선택한 수평선을 천장 삼아 진자 그림을 그립니다. 각도 θ, 진자 길이, 궤적, 직각 표시를 넣습니다.", requires: "천장이 될 수평선 하나를 선택합니다. 그 선의 가운데가 진자의 고정점이 됩니다." },
      { id: "projectile", name: "수평 던지기", summary: "높은 곳에서 오른쪽으로 수평으로 던진 물체가 지면에 닿을 때까지의 포물선 궤적을 화면 중앙에 그립니다. 높이(m)·수평 속도(m/s)를 넣으면 낙하 시간과 수평 도달거리를 계산해 보여 주고, 도면 축척은 실제 1m = 2mm(가로·세로 동일), 중력 9.8m/s², 공기 저항은 없습니다. 선 두께와 위치를 미리보기로 조절하며 값을 바꿔도 투사 지점은 움직이지 않습니다.", requires: "선택 없이 실행합니다." },
      { id: "sine-wave", name: "사인 곡선", summary: "선택한 패스를 축으로 삼아 sin 곡선을 만듭니다. 직선은 그대로, 곡선·원은 그 곡선을 따라 파형이 감깁니다. 진폭·파장·축 이동·선 두께를 조절합니다.", requires: "패스 하나만 선택합니다. 직선도 곡선도 되고, 문자나 그룹은 먼저 패스로 만듭니다." },
      { id: "coil-spring", name: "코일 스프링", summary: "선택한 원을 기준으로 코일 스프링을 만듭니다. 좌우 폭, 위아래 높이, 감는 횟수를 조절합니다.", requires: "가로·세로 크기가 같은 원 패스 하나만 선택합니다." }
    ]
  },
  { id: "polymer", category: "도형", name: "중합체 생성기", file: "01_도형/Object_PolymerMaker.jsx", summary: "선택한 패스를 따라 단위체를 배치해 중합체를 만듭니다. 단위체 모양과 색상을 조절합니다.", tags: ["과학", "중합체"] },
  { id: "split-stroke-fill", category: "도형", name: "선·면 분리", file: "01_도형/Object_SplitStrokeFill.jsx", summary: "선과 면이 모두 있는 도형을 면 오브젝트(아래)와 선 오브젝트(위)로 나눕니다. 패스·복합 패스·그룹 안의 도형에 적용되고, 선만 또는 면만 있는 도형은 건너뜁니다.", tags: ["선", "면", "분리"] },
  { id: "periodic-table", category: "도형", name: "주기율표", file: "01_도형/Object_PeriodicTable.jsx", summary: "족(1, 2, 13~18처럼 입력)과 주기(체크박스)를 골라 빈 주기율표 틀을 만듭니다. 실제 주기율표 모양대로 없는 칸은 비우고, 셀 크기·간격·라운딩·1행 높이·1열 너비·키캡 돌출·테두리·모서리 대각선 모양(사선 또는 사선·수평·사선)·음영·숫자 크기를 미리보기로 조절합니다.", tags: ["과학", "화학", "표"] },
  { id: "quadrat", category: "도형", name: "방형구", file: "01_도형/Object_Quadrat.jsx", summary: "선택한 정사각형을 4×4 또는 5×5 방형구로 나누고 상대 밀도·상대 빈도 목표값에 맞춰 종을 배치합니다.", tags: ["과학", "생태"] },
  { id: "region-brace", category: "도형", name: "영역 중괄호", file: "01_도형/Object_RegionBrace.jsx", summary: "선택한 직선을 영역을 묶어 가리키는 중괄호로 바꿉니다. 0.5pt로 맞추고 가운데를 잘라 두 선으로 나눈 뒤 바깥 끝에는 화살표 7번, 가운데 끝에는 화살표 6번을 붙여 그룹으로 묶습니다. 가로선은 상하 반전, 세로선은 좌우 반전을 고를 수 있고, 미리보기를 보면서 가로·세로로 옮겨 자리를 잡습니다.", tags: ["중괄호", "영역", "화살표"] },
  { id: "step-flow", category: "도형", name: "단계 흐름도", file: "01_도형/Object_StepFlow.jsx", summary: "단계 수(3~6)와 이름을 넣으면 [박스] → [박스] → [박스]처럼 사각 박스와 화살표 3이 등간격으로 이어지는 흐름도를 만듭니다. 글자 크기, 박스 크기(공통 또는 글자 범위+여백)·코너 라운딩, 화살표 길이·두께·화살촉 크기·색(K 10 단위), 간격을 미리보기로 조절합니다.", tags: ["과학", "흐름도", "화살표"] },
  { id: "silicate-structure", category: "도형", name: "규산염 결합 구조", file: "01_도형/Object_SilicateStructure.jsx", summary: "감람석·휘석·각섬석·흑운모의 SiO₄ 사면체 배열을 그립니다. 원자 모형 또는 삼각형 세 면에 음영을 넣은 사면체 모형을 고르고, Si 수와 크기, K 음영, 산소 3D 조명을 조절합니다.", tags: ["과학", "광물"] },
  {
    id: "dna-model",
    category: "도형",
    name: "DNA 모형",
    file: "01_도형/Object_DnaModel.jsx",
    summary: "DNA 평면 모형과 DNA·RNA 염기 서열을 한 창의 탭으로 묶은 스크립트입니다. 두 탭은 서로 다른 그림이라 옵션을 공유하지 않고, 각 탭의 코드와 저장 키는 원래 스크립트 그대로입니다.",
    requires: "두 탭 모두 선택 없이 실행합니다.",
    tags: ["과학", "생명", "유전"],
    tabs: [
      { id: "flat", name: "평면 모형", summary: "염기서열을 입력하면 인산·당·염기 사다리 모양의 DNA 평면 모형을 그립니다. 1·2가닥, 가로·세로, 염기 모양·크기·음영, 범례를 조절합니다." },
      { id: "sequence", name: "염기 서열", summary: "DNA 위쪽 가닥 서열을 입력하면 골격선·연결선·염기 글자로 DNA 1·2와 RNA 세 줄을 그립니다. 가릴 서열을 지정해 ?·ⓐ·㉠·Ⅰ 박스로 덮고, 선 굵기·연결선 길이·염기 간격·줄 간격을 미리보기로 조절합니다." }
    ]
  },
  { id: "semiconductor", category: "도형", name: "반도체 모형", file: "01_도형/Object_Semiconductor.jsx", summary: "규소 원자를 3·4·5 행·열로 늘어놓은 공유 결합 모형을 그립니다. 5족·3족 불순물을 넣으면 자유 전자나 정공이 생기고, 핵·전자 크기·거리·음영·3D 조명과 지시선을 조절합니다.", tags: ["과학", "반도체"] },
  { id: "star-interior", category: "도형", name: "별 내부 구조", file: "01_도형/Object_StarInterior.jsx", summary: "선택한 원을 별의 내부 구조 절개도로 바꿉니다. 절단 각도와 회전, 시점을 조절합니다.", tags: ["과학", "천문"] },
  { id: "weather-front", category: "도형", name: "일기도 전선", file: "01_도형/Object_front.jsx", summary: "선택한 열린 패스를 온난·한랭·정체·폐색 전선으로 바꿉니다. 표준색, K 음영, HEX 색상을 지원합니다.", tags: ["과학", "일기도"] },
  { id: "phospholipid-bilayer", category: "도형", name: "인지질 2중층", file: "01_도형/Object_PhospholipidBilayer.jsx", summary: "기준선과 인지질 하나를 선택하면 선의 법선 방향으로 인지질을 위아래 두 층으로 세웁니다. 곡선에서는 바깥층 개수를 자동으로 늘려 머리 간격을 맞춥니다.", tags: ["과학", "세포막"] },
  { id: "area-text-box", category: "문자", name: "말풍선 만들기", file: "02_문자/Text_AreaTextRoundedBox.jsx", summary: "선택한 텍스트 둘레에 둥근 사각형 말풍선을 만듭니다. 여백·라운딩, 꼬리 방향(9·6·3·12시)·위치·크기·휘어짐, 위치 이동을 미리보기로 조절합니다.", tags: ["말풍선", "문자"] },
  { id: "chat-bubbles", category: "문자", name: "채팅 말풍선", file: "02_문자/Text_ChatBubbles.jsx", summary: "대화를 2~5개 입력하면 위에서부터 9시·3시 꼬리를 번갈아 단 채팅 말풍선을 만듭니다. 글자 크기·채팅창 너비·간격·같은 너비와 말풍선 옵션을 미리보기로 조절합니다.", tags: ["말풍선", "채팅", "문자"] },
  { id: "text-degree", category: "문자", name: "도(°) 기호 삽입", file: "02_문자/Text_degree.jsx", summary: "텍스트 편집 중 숫자를 선택(또는 커서 위치)하고 실행하면 GSMediumB1 서체의 도(°) 기호를 뒤에 삽입합니다.", tags: ["도", "각도", "기호"] },
  { id: "chemical-formula", category: "문자", name: "화학식 서식", file: "02_문자/Text_ChemicalFormulaFormatter.jsx", summary: "선택한 텍스트에서 숫자는 아래첨자, 이온 전하는 위첨자로 자동 적용합니다.", tags: ["화학식", "첨자"] },
  { id: "make-number-seq", category: "문자", name: "숫자 시퀀스 만들기", file: "02_문자/Text_MakeNumbersSequence.jsx", summary: "연속 숫자 텍스트를 빠르게 생성합니다.", tags: ["숫자", "반복"] },
  { id: "nuclide", category: "문자", name: "핵종 표기", file: "02_문자/Text_NuclideNotation.jsx", summary: "예: 23H 입력을 왼쪽 위 2, 왼쪽 아래 3, 오른쪽 H 구조로 만듭니다.", tags: ["핵종", "첨자"] },
  { id: "number-seq", category: "문자", name: "번호 넣기", file: "02_문자/Text_NumberSequence.jsx", summary: "현재 화면 기준으로 번호 텍스트를 배치할 때 사용합니다.", tags: ["번호", "텍스트"] },
  { id: "subscript-variable", category: "문자", name: "첨자 변수", file: "02_문자/Text_SubscriptedVariable.jsx", summary: "변수 문자와 아래첨자, 이온 위첨자를 조합해 과학 표기용 텍스트를 만듭니다.", tags: ["변수", "첨자"] },
  { id: "text-check", category: "문자", name: "폰트 이름 확인", file: "02_문자/Text_check.jsx", summary: "스크립트에서 사용할 수 있는 폰트 이름을 확인할 때 씁니다.", tags: ["폰트", "확인"] },
  { id: "text-input", category: "문자", name: "문자 입력 패널", file: "02_문자/Text_input.jsx", summary: "자주 쓰는 특수문자와 기호를 현재 화면 하단 중앙에 넣습니다.", tags: ["기호", "입력"] },
  { id: "ko-en", category: "문자", name: "한영 텍스트", file: "02_문자/Text_koen.jsx", summary: "한글과 영문 텍스트 크기나 스타일을 빠르게 맞출 때 쓰는 보조 스크립트입니다. 글자마다 한글은 Spoqa, 영문·숫자·기호는 GSMediumB1(기준선 +0.5pt) 8pt로 맞추고, (가)·(나)처럼 괄호 안 한글 한 글자 기호는 바탕체 10pt로 둡니다.", tags: ["한글", "영문", "바탕"] },
  { id: "lewis-dots", category: "문자", name: "루이스 전자점식", file: "02_문자/Text_LewisDots.jsx", summary: "선택한 원소 기호 텍스트 둘레에 루이스 전자점을 배치합니다. 방향마다 없음·1점·2점을 고릅니다.", tags: ["과학", "화학"] },
  { id: "fill-20k", category: "색상", name: "면 20K", file: "03_색상/Color_Fill20K.jsx", summary: "선택한 개체의 면을 CMY가 섞이지 않은 순수 K=20 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "fill-30k", category: "색상", name: "면 30K", file: "03_색상/Color_Fill30K.jsx", summary: "선택한 개체의 면을 순수 K=30 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "fill-80k", category: "색상", name: "면 80K", file: "03_색상/Color_Fill80K.jsx", summary: "선택한 개체의 면을 순수 K=80 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "fill-90k", category: "색상", name: "면 90K", file: "03_색상/Color_Fill90K.jsx", summary: "선택한 개체의 면을 순수 K=90 회색으로 바꿉니다.", tags: ["면", "회색"] },
  { id: "k-convert", category: "색상", name: "K 변환", file: "03_색상/Color_Kconvert.jsx", summary: "색상 값을 순수 K 중심으로 정리할 때 쓰는 변환 도구입니다.", tags: ["K", "변환"] },
  { id: "spectrum-gray", category: "색상", name: "스펙트럼 (회색)", file: "03_색상/Color_SpectrumGray.jsx", summary: "선택한 가로 사각형을 스펙트럼 띠로 바꿉니다. 연속 스펙트럼·선 방출 스펙트럼·선 흡수 스펙트럼(별) 중 고른 것을 위에서부터 그 순서로 같은 크기로 쌓고, 띠 간격, ㉠㉡㉢·ABC·ⅠⅡⅢ 기호(서체는 텍스트 삽입 스크립트와 같음)와 기호 간격을 고릅니다. 연속 스펙트럼은 파장별 밝기를 K 농도 그라데이션으로만 표현하고 전체 밝기·좌우 반전을 조절합니다. 방출선은 원소 하나(H·He·Li·C·N·O·Ne·Na·Mg·Ar·K·Ca·Fe·Hg), 흡수선은 여러 원소를 골라 NIST ASD 실측 파장 위치에 긋고, 주요 선만 또는 약한 선까지, 배경·선 K 농도와 선 두께를 정하고, 나트륨 D선처럼 붙어 있는 이중선은 합치기 간격(nm)으로 한 선으로 그립니다. 파장 범위(기본 380~780nm)를 바꿀 수 있고 첫 띠 위에 양끝 파장과 파장(nm) 눈금을 넣으며, 눈금 양끝에서 마지막 띠까지 파선 보조선(0.3pt, 2pt 선·1pt 간격)이 맨 뒤에 깔려 띠 사이에서만 보입니다. 확인하면 원본 사각형은 지워집니다.", requires: "가로·세로 변이 축에 나란한 사각형 하나를 선택합니다.", tags: ["과학", "스펙트럼", "그라데이션", "방출", "흡수", "원소", "별", "지구과학", "물리"] },
  { id: "random-gray", category: "색상", name: "랜덤 회색", file: "03_색상/Color_RandomFillGray.jsx", summary: "선택 개체에 회색 농도를 무작위로 적용합니다.", tags: ["회색", "랜덤"] },
  { id: "black-fill", category: "색상", name: "검정 면", file: "03_색상/Color_black.jsx", summary: "선택한 모든 개체의 면을 K=100 검정으로 바꿉니다. 면이 없으면 새로 만듭니다.", tags: ["검정", "면"] },
  { id: "black-stroke", category: "색상", name: "검정 선", file: "03_색상/Color_blackline.jsx", summary: "선택한 모든 개체의 선을 K=100 검정으로 바꿉니다. 선이 없으면 활성화합니다.", tags: ["검정", "선"] },
  { id: "gray-toggle", category: "색상", name: "회색 선택 적용", file: "03_색상/Color_graysel.jsx", summary: "면 또는 선에 순수 K 회색을 적용합니다. 낮은 농도에서 CMY가 섞이는 문제를 피합니다.", tags: ["회색", "K"] },
  { id: "white-fill", category: "색상", name: "흰색 면", file: "03_색상/Color_white.jsx", summary: "선택한 모든 개체의 면을 흰색으로 바꿉니다.", tags: ["흰색", "면"] },
  { id: "white-stroke", category: "색상", name: "흰색 선", file: "03_색상/Color_whiteline.jsx", summary: "선택한 모든 개체의 선을 흰색으로 바꿉니다.", tags: ["흰색", "선"] },
  { id: "textbox-4mm", category: "삽입", name: "4mm 텍스트 박스", file: "04_삽입/Input_4mmtextbox.jsx", summary: "현재 화면 중앙에 8mm x 4mm 사각형을 만듭니다.", tags: ["상자", "삽입"] },
  { id: "box-2mm", category: "삽입", name: "2mm 여백 사각형", file: "04_삽입/Input_2mmBox.jsx", summary: "선택한 개체(여러 개면 전체)의 보이는 영역에서 상하좌우 2mm 여백을 둔 0.3pt 사각형을 바로 그립니다.", tags: ["상자", "여백", "삽입"] },
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
  { id: "repeat-last", category: "기타", name: "마지막 스크립트 반복", file: "10_기타/RepeatLast.jsx", summary: "마지막으로 실행한 스크립트를 다시 실행합니다. F4처럼 반복 작업에 씁니다.", tags: ["반복", "스크립트"] },
  { id: "visible-bounds", category: "정렬", name: "보이는 영역 정렬", file: "05_정렬/Align_VisibleBounds.jsx", summary: "기준 개체(큰/작은)를 고르고 가로 좌·중·우, 세로 상·중·하, 가로+세로 중앙 버튼을 눌러 보이는 경계 기준으로 정렬합니다.", tags: ["보이는 영역", "텍스트", "기준"] },
  { id: "leader-symbol", category: "정렬", name: "지시선 기호 정렬", file: "05_정렬/Align_LeaderSymbol.jsx", summary: "사선 지시선과 기호를 함께 선택하면 지시선 연장선 위에 기호 중심을 놓고, 실제 잉크까지 0.5mm 간격을 맞춥니다.", tags: ["지시선", "정렬"] },
  { id: "output-600png", category: "내보내기", name: "600ppi PNG", file: "06_내보내기/Output_600png.jsx", summary: "작업물을 600ppi PNG로 내보낼 때 사용합니다.", tags: ["PNG", "내보내기"] },
  { id: "dup-anchor", category: "기타", name: "선택 앵커에 복제", file: "10_기타/Dup At Selected Anchors.jsx", summary: "선택한 앵커 위치에 개체를 복제합니다.", tags: ["앵커", "복제"] },
  { id: "downsample", category: "기타", name: "이미지 600ppi 다운샘플", file: "10_기타/Image_Downsample600ppi.jsx", summary: "이미지 해상도를 600ppi 기준으로 정리할 때 사용합니다.", tags: ["이미지", "해상도"] },
  { id: "lock-all-raster", category: "기타", name: "래스터 전체 잠금", file: "10_기타/Image_LockAllRaster.jsx", summary: "문서 안 포함·링크 래스터 이미지를 제자리에서 모두 잠급니다. 이동이나 삭제 없이 잠금만 처리합니다.", tags: ["이미지", "잠금"] },
  { id: "lock-raster", category: "기타", name: "트레이싱 준비", file: "10_기타/Image_TracingPrep.jsx", summary: "그룹·클리핑 마스크 해제, 투명 유령 개체 삭제 후 래스터 이미지를 전용 레이어로 모아 30% 불투명도로 잠급니다.", tags: ["이미지", "잠금"] },
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
  route: { view: "home", id: null, tab: null },
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
    if (state.route.view === "detail") renderDetail(state.route.id, state.route.tab);
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

// 탭으로 묶인 스크립트는 묶음 안내(중간 페이지) 아래에 탭마다 세부 페이지를 가진다.
function getTabs(script) {
  return (script && script.tabs) || [];
}

function getTab(script, tabId) {
  return getTabs(script).find((tab) => tab.id === tabId) || null;
}

// 세부 설명·이미지 저장 키. 탭 페이지는 "스크립트id/탭id"로 따로 저장한다.
function detailKey(scriptId, tabId) {
  return tabId ? `${scriptId}/${tabId}` : scriptId;
}

function customDetail(scriptId, tabId) {
  return state.custom.details[detailKey(scriptId, tabId)] || {};
}

// 탭 이전에 저장한 이미지(state.custom.images)는 스크립트 페이지에서만 이어 쓴다.
function detailShots(scriptId, tabId) {
  const detail = customDetail(scriptId, tabId);
  if (detail.images) return detail.images;
  return tabId ? [] : (state.custom.images[scriptId] || []);
}

// 탭에 적힌 조건이 없으면 묶음 전체의 선택 조건을 쓴다.
function tabRequires(script, tab) {
  return tab.requires || script.requires || "";
}

// 검색에는 탭 이름과 설명까지 넣는다. 묶기 전 이름(원기둥, 감수 분열 등)으로도 찾을 수 있어야 한다.
function scriptSearchText(script) {
  const tabText = getTabs(script)
    .map((tab) => `${tab.name} ${tab.summary} ${tab.requires || ""}`)
    .join(" ");
  return `${script.name} ${script.file} ${script.summary} ${script.shared || ""} ${script.requires || ""} ${tabText} ${script.tags.join(" ")}`.toLowerCase();
}

function tabMatchesQuery(tab, query) {
  if (!query) return false;
  return `${tab.name} ${tab.summary} ${tab.requires || ""}`.toLowerCase().includes(query);
}

// 첫 문장만 카드에 싣는다. "0.5~2mm"처럼 숫자 안의 점은 끊지 않도록 마침표+공백만 문장 끝으로 본다.
function firstSentence(text) {
  const value = String(text || "").trim();
  const end = value.indexOf(". ");
  return end === -1 ? value : value.slice(0, end + 1);
}

// 일러스트레이터 메뉴 경로. 설치 스크립트가 폴더 구조를 그대로 등록한다.
function menuPath(script) {
  const parts = script.file.split("/");
  const name = parts.pop().replace(/\.jsx$/, "");
  return ["파일", "스크립트"].concat(parts, name).join(" > ");
}

function categoryStyle(category) {
  const [color, soft] = categoryColors[category] || categoryColors["기타"];
  return `--category:${color};--category-soft:${soft}`;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "home") return { view: "home", id: null, tab: null };
  if (hash.startsWith("script/")) {
    const parts = hash.split("/");
    return { view: "detail", id: parts[1] || null, tab: parts[2] || null };
  }
  if (["catalog", "install", "loader", "admin"].includes(hash)) return { view: hash, id: null, tab: null };
  return { view: "home", id: null, tab: null };
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
  if (view === "detail") {
    renderDetail(state.route.id, state.route.tab);
    // 목록 → 묶음 → 탭으로 내려가므로 앞 화면의 스크롤 위치를 물려받지 않게 맨 위에서 시작한다.
    window.scrollTo({ top: 0 });
  }
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
      return categoryMatch && (!query || scriptSearchText(script).includes(query));
    })
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
}

function renderScripts() {
  const grid = document.getElementById("scriptGrid");
  const filtered = getFilteredScripts();
  const featureCount = scripts.reduce((sum, script) => sum + Math.max(getTabs(script).length, 1), 0);
  document.getElementById("scriptCount").textContent = scripts.length;
  document.getElementById("featureCount").textContent = featureCount;
  document.getElementById("categoryCount").textContent = orderedCategories().length;
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">검색 결과가 없습니다.</p>`;
    return;
  }

  const query = state.query.trim().toLowerCase();
  grid.innerHTML = filtered.map((script) => {
    const detail = customDetail(script.id);
    const shots = detailShots(script.id);
    const tabs = getTabs(script);
    // 묶음 카드는 태그 대신 탭 이름을 보여 준다. 검색어에 걸린 탭은 진하게 표시한다.
    const chipRow = tabs.length
      ? `<div class="chip-row">${tabs.map((tab) => (
          `<span class="chip${tabMatchesQuery(tab, query) ? " is-match" : ""}">${escapeHtml(tab.name)}</span>`
        )).join("")}</div>`
      : `<div class="tag-row">${script.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
    return `
      <a class="script-card" style="${categoryStyle(script.category)}" href="#script/${escapeHtml(script.id)}">
        <div class="script-meta">
          <span class="category-label">${escapeHtml(script.category)}</span>
          <code>${escapeHtml(script.file)}</code>
        </div>
        <div>
          <h3>${escapeHtml(detail.title || script.name)}${tabs.length ? `<span class="bundle-badge">탭 ${tabs.length}</span>` : ""}</h3>
          <p>${escapeHtml(script.summary)}</p>
        </div>
        ${chipRow}
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

function crumbsHtml(items) {
  return `
    <nav class="crumbs" aria-label="현재 위치">
      ${items.map((item) => (
        item.href
          ? `<a href="${item.href}">${escapeHtml(item.label)}</a>`
          : `<span aria-current="page">${escapeHtml(item.label)}</span>`
      )).join(`<span class="crumb-sep" aria-hidden="true">›</span>`)}
    </nav>
  `;
}

function factHtml(label, value) {
  if (!value) return "";
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function shotsHtml(shots, alt) {
  if (!shots.length) {
    return `
      <div class="detail-image">
        <figcaption>어드민에서 스크린샷을 추가하면 이곳에 표시됩니다.</figcaption>
      </div>
    `;
  }
  return shots.map((shot) => `
    <figure class="detail-image">
      <img src="${shot.src}" alt="${escapeHtml(shot.caption || alt)}">
      <figcaption>${escapeHtml(shot.caption || "스크린샷")}</figcaption>
    </figure>
  `).join("");
}

function renderDetail(id, tabId) {
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

  const tab = tabId ? getTab(script, tabId) : null;
  if (tabId && !tab) {
    content.innerHTML = `
      <div class="detail-hero">
        <a class="back-link" href="#script/${escapeHtml(script.id)}">← ${escapeHtml(script.name)}</a>
        <h2>탭을 찾지 못했습니다.</h2>
      </div>
    `;
    return;
  }

  content.innerHTML = tab ? tabDetailHtml(script, tab) : scriptDetailHtml(script);
}

// 중간 페이지: 묶음 전체 안내와 탭 목록. 탭이 없는 스크립트는 여기가 곧 세부 페이지다.
function scriptDetailHtml(script) {
  const detail = customDetail(script.id);
  const shots = detailShots(script.id);
  const tabs = getTabs(script);
  const title = detail.title || script.name;
  return `
    <article class="detail-hero" style="${categoryStyle(script.category)}">
      ${crumbsHtml([
        { label: "스크립트", href: "#catalog" },
        { label: script.category, href: "#catalog" },
        { label: title }
      ])}
      <span class="category-label">${escapeHtml(script.category)}${tabs.length ? ` · 탭 ${tabs.length}개` : ""}</span>
      <h2>${escapeHtml(title)}</h2>
      <code>${escapeHtml(script.file)}</code>
      <p>${escapeHtml(detail.body || script.summary)}</p>
      <dl class="fact-list">
        ${factHtml("실행", menuPath(script))}
        ${factHtml(tabs.length ? "선택 조건" : "사용 방법", script.requires)}
        ${factHtml("공통 옵션", script.shared)}
      </dl>
      ${tabs.length ? `
        <section class="tab-index">
          <h3>탭 ${tabs.length}개</h3>
          <p class="tab-index-hint">한 창에서 탭으로 고릅니다. 탭을 누르면 세부 설명으로 갑니다.</p>
          <div class="tab-cards">
            ${tabs.map((tab, index) => {
              const tabDetail = customDetail(script.id, tab.id);
              const need = tabRequires(script, tab);
              return `
                <a class="tab-card" href="#script/${escapeHtml(script.id)}/${escapeHtml(tab.id)}">
                  <span class="tab-no">${index + 1}</span>
                  <h4>${escapeHtml(tabDetail.title || tab.name)}</h4>
                  <p>${escapeHtml(firstSentence(tabDetail.body || tab.summary))}</p>
                  ${need ? `<span class="tab-need">${escapeHtml(need)}</span>` : ""}
                </a>
              `;
            }).join("")}
          </div>
        </section>
      ` : ""}
      <div class="tag-row">
        ${script.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${shotsHtml(shots, title)}
    </article>
  `;
}

// 세부 페이지: 탭 하나. 같은 창의 다른 탭으로 바로 건너갈 수 있게 탭 줄을 둔다.
function tabDetailHtml(script, tab) {
  const tabs = getTabs(script);
  const index = tabs.indexOf(tab);
  const detail = customDetail(script.id, tab.id);
  const shots = detailShots(script.id, tab.id);
  const title = detail.title || tab.name;
  return `
    <article class="detail-hero" style="${categoryStyle(script.category)}">
      ${crumbsHtml([
        { label: "스크립트", href: "#catalog" },
        { label: script.name, href: `#script/${script.id}` },
        { label: title }
      ])}
      <span class="category-label">${escapeHtml(script.name)} · 탭 ${index + 1} / ${tabs.length}</span>
      <h2>${escapeHtml(title)}</h2>
      <code>${escapeHtml(script.file)}</code>
      <p>${escapeHtml(detail.body || tab.summary)}</p>
      <dl class="fact-list">
        ${factHtml("실행", `${menuPath(script)} → "${tab.name}" 탭`)}
        ${factHtml("필요한 선택", tabRequires(script, tab))}
        ${factHtml("공통 옵션", script.shared)}
      </dl>
      <nav class="sibling-tabs" aria-label="같은 창의 다른 탭">
        <span class="sibling-label">같은 창의 탭</span>
        ${tabs.map((other) => (
          other.id === tab.id
            ? `<span class="chip is-current" aria-current="page">${escapeHtml(other.name)}</span>`
            : `<a class="chip" href="#script/${escapeHtml(script.id)}/${escapeHtml(other.id)}">${escapeHtml(other.name)}</a>`
        )).join("")}
      </nav>
      ${shotsHtml(shots, title)}
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
  select.innerHTML = scripts.map((script) => {
    const tabs = getTabs(script);
    const head = `<option value="${escapeHtml(script.id)}">${escapeHtml(script.category)} · ${escapeHtml(script.name)}${tabs.length ? " (묶음 안내)" : ""}</option>`;
    return head + tabs.map((tab) => (
      `<option value="${escapeHtml(detailKey(script.id, tab.id))}">${escapeHtml(script.category)} · ${escapeHtml(script.name)} › ${escapeHtml(tab.name)}</option>`
    )).join("");
  }).join("");
}

// 어드민 선택값은 "스크립트id" 또는 "스크립트id/탭id"다.
function parseDetailTarget(key) {
  const parts = String(key || "").split("/");
  const script = getScript(parts[0]);
  const tab = parts[1] ? getTab(script, parts[1]) : null;
  return { script: script, tab: tab, scriptId: parts[0], tabId: tab ? tab.id : null };
}

function syncDetailForm() {
  const form = document.getElementById("detailForm");
  const target = parseDetailTarget(form.elements.scriptId.value);
  if (!target.script) return;
  const detail = customDetail(target.scriptId, target.tabId);
  form.elements.title.value = detail.title || (target.tab ? target.tab.name : target.script.name);
  form.elements.body.value = detail.body || (target.tab ? target.tab.summary : target.script.summary);
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
  const target = parseDetailTarget(form.get("scriptId"));
  if (!target.script) return;
  const key = detailKey(target.scriptId, target.tabId);
  const current = state.custom.details[key] || {};

  function persistDetail(image) {
    const images = current.images ? current.images.slice() : detailShots(target.scriptId, target.tabId).slice();
    if (image) images.push(image);
    state.custom.details[key] = {
      title: form.get("title") || (target.tab ? target.tab.name : target.script.name),
      body: form.get("body") || (target.tab ? target.tab.summary : target.script.summary),
      images
    };
    saveCustomData();
    renderScripts();
    if (state.route.view === "detail" && state.route.id === target.scriptId) {
      renderDetail(state.route.id, state.route.tab);
    }
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
      if (state.route.view === "detail") renderDetail(state.route.id, state.route.tab);
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
  if (state.route.view === "detail") renderDetail(state.route.id, state.route.tab);
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
