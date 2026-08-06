# Claude Design 반영용 패치 모음 (재export 영구화)

이 문서는 Claude Code가 로컬 export 파일에 넣은 수정들을 **Claude Design 원본에도 반영**하기 위한 지시문 모음입니다.
Claude Design 채팅창에 아래 블록을 **하나씩 붙여넣어** 적용하면, 이후 재export ZIP에 수정이 포함되어 나와
매번 재적용할 필요가 없어집니다. (지금까지는 ZIP을 첨부하면 Claude Code가 매번 재적용해 왔습니다.)

> 우선순위 순. 각 블록은 독립적으로 적용 가능합니다. 적용 후 한 번 export → ZIP 첨부로 검증 권장.

---

## 1. CMS 표시 순서: Product_Scope 배열 파싱

````text
[버그] CMS 엑셀 업로드 시 표시 순서(제품군별 카테고리)가 잘못 나옵니다.
_cmsFromRows 함수가 Product_Scope 컬럼(예: ["Camera","Recorder"] JSON 배열)을 문자열
통째로 하나의 제품군으로 취급해서, 조합마다 가짜 제품군이 30개쯤 생깁니다.
다음처럼 고쳐줘:
1. Product_Scope 셀을 JSON 배열로 파싱(실패 시 콤마 구분 폴백)해 토큰 배열로 만든다.
2. 각 필드를 배열에 나열된 제품군마다 넣는다. 토큰이 "All"이면 모든 제품군 공통, scope가
   비어있으면 어느 제품군에도 넣지 않는다(Wix 시스템 잡필드 자동 제거).
3. 카테고리는 그 안 필드의 "최소 Order number 순"으로 배치, 필드는 카테고리 내 order 순 정렬.
name/field 컬럼 감지는 바꾸지 마(별칭 매칭에 쓰임). scope 파싱과 카테고리 정렬만 수정.
결과: 실제 제품군 10개(Camera, Recorder, Networking, JunctionBox, IPHornSpeaker,
HDMIVideoAccessories, Tester, PowerSupply, CameraRecorderKit, StorageDrivers).
````

## 2. 대량 CMS import 매핑 규칙

````text
[대량 CMS import] LiveProducts 엑셀에서 제품을 불러올 때 매핑을 이렇게 고쳐줘:
- 스펙시트 테이블에 들어가는 필드 = CMS Order number 48(imaging_device)~484(power_saving)만.
  그 밖 컬럼은 Wix CMS 참조용이라 스펙시트에서 제외.
- 특수 필드 매핑: 모델명 = model_number_sku, 제품 타이틀(subtitle) = product_summary,
  overview = detailed_description, 카테고리 = main_category / sub_category.
- _catScope는 "camera"를 "network"보다 먼저 검사할 것(Network_Camera가 Networking으로
  오판되어 스펙이 몇 개만 매핑되던 문제).
_fieldIndex가 필드의 order를 함께 담고, _bulkProduct에서 order 48~484만 spec으로 넣도록.
````

## 3. PDF 저장 크기 = US Letter

````text
[PDF] "PDF로 저장" 결과가 15.1×19.6in로 US Letter보다 큽니다. jsPDF가 unit:'px'에서
px→pt를 96/72로 잘못 환산하기 때문입니다. savePdf와 도움말 PDF의 jsPDF 옵션에
hotfixes:['px_scaling']를 추가해줘. 그러면 612×792pt(8.5×11in)로 정확히 나옵니다.
(format/좌표는 그대로 [816,1056] 유지)
````

## 4. UI 기본 언어 = 영어

````text
[언어] 저장된 언어 선호가 없을 때(시크릿모드 등) 기본을 영어로 해줘. state.lang 초기값과
localStorage 'specstudio:lang' 폴백을 'ko' → 'en'으로. (이전에 한국어를 고른 사용자는 유지)
````

## 5. i18n 사전 완성 (영어 모드 완전 영어화)

````text
[i18n] 영어 모드에서 설정 드로어(CMS 테이블/표시 순서/검수 규칙/규칙 라이브러리 4탭),
매핑 연결 모달, 리포트 라벨, 토스트·오류 메시지가 한글로 남습니다. i18n.js의 DICT/PATTERNS에
해당 한글 문구의 영어 번역을 모두 추가해줘. (제품명·모델코드·외래어는 번역 대상 아님)
원칙: 앞으로 새 한글 UI 문구를 넣을 때마다 i18n.js에 영어도 함께 넣어야 함.
````

## 6. 팀 공유 저장 + 히스토리 (프론트)

> 백엔드(`api/state.js` + Vercel KV)는 이미 저장소에 있고 재export와 무관하게 유지됩니다.
> 아래는 **프론트(export JS)** 배선입니다.

````text
[공유 저장] 작업을 서버(/api/state, Vercel KV)에 저장해 모든 사용자가 공유하게 해줘:
- 상단바 💾 저장 → 현재 작업 문서를 POST /api/state {action:'save', model, doc, title, step, by}로
  전송(로컬 localStorage 저장은 폴백 유지).
- 시작 시 GET /api/state?action=list로 서버 저장 목록을 작업 목록에 병합(모델 기준 매칭,
  없으면 "공유" 배지로 새 행 추가). 서버 행을 열면 GET ?action=load&model=…로 문서를 받아 로드.
- "Continue saved work"는 서버 최신본을 먼저 복원, 없으면 로컬.
- 상단바에 📜 히스토리 버튼 + 패널: GET ?action=history 로 저장 로그(모델·시각·작업자) 표시.
- 히스토리 패널 상단에 "작업자 이름" 입력 필드(localStorage 'specstudio:editor')를 두고,
  저장 시 그 이름을 by로 보냄. (예전 window.prompt 방식은 쓰지 말 것)
````

## 7. 치수 도면·사진: 제품별로 기억 (근본 해법)

> 현재 로컬은 "제품 전환 시 슬롯 초기화"(임시)로 처리 중. 아래가 정석입니다.

````text
[이미지 슬롯] SpecSheet의 이미지/벡터 슬롯이 고정 id(ss_dims_1/2, ss_product_photo, acc0~3)라
제품을 바꿔도 이전 제품의 도면·사진이 남습니다. 슬롯 id를 "제품별"로 만들어줘:
- SpecSheet에서 각 슬롯 id에 현재 model을 붙인다(예: id="ss_dims_1__{{ sheet.model }}",
  제품 사진/액세서리도 동일). sheet 데이터에 그 id들을 담아 바인딩.
- vector-slot.js에 observedAttributes=['id']와 attributeChangedCallback을 추가해, id가 바뀌면
  새 id 기준으로 _restore()를 다시 실행(요소가 재사용돼도 올바른 이미지로 갱신). image-slot도
  id 변경 시 해당 id의 저장 이미지로 갱신되게 확인.
결과: 각 제품이 자기 도면·사진을 따로 기억하고, 새 제품은 빈 슬롯으로 시작.
````

---

## 참고 — 백엔드/인프라 (Claude Design 아님, 저장소·Vercel)
- `api/state.js`(Vercel KV 공유 저장) + `package.json`의 `@upstash/redis` — 저장소에 있음(영구).
- Vercel: **Storage → Upstash for Redis** 스토어 생성 후 프로젝트 Connect(→ `KV_REST_API_URL`/`KV_REST_API_TOKEN`) → 재배포. 완료됨.
- 위 1~7을 Claude Design에 반영해도 이 백엔드/인프라는 그대로 유지됩니다.
