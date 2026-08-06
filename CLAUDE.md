# CLAUDE.md — AVYCON Spec Sheet Studio (AI 스펙 검수 앱)

Claude Code 작업용 프로젝트 컨텍스트.

## 프로젝트 개요
Claude Design에서 내보낸 **정적 웹사이트**. AVYCON CCTV 제품의 스펙시트를
가져와(제조사 엑셀 / 기제작 PDF) 규칙 기반 + AI로 **검수**하고, 레이아웃·편집기로
정리해 내보내는 클라이언트 사이드 앱. 빌드 단계 없음 → GitHub→Vercel 정적 배포.

## 구조
- `index.html` — 진입점. 메인 디자인 문서 `스펙시트 자동화 스튜디오.dc.html`의 **복사본**
- `스펙시트 자동화 스튜디오.dc.html` — 원본 디자인 문서(Claude Design export의 메인 페이지)
- `support.js` — Claude Design 런타임 (React를 CDN에서 로드)
- `data/` — 앱이 `fetch('./data/*')`로 읽는 데이터
  - `cms_order.json`(스펙 필드 순서/매핑), `sample_input.json`(샘플 제품), `qc_engine.js`(규칙 기반 검수 엔진)
- `image-slot.js` / `vector-slot.js` / `pdf-extract.js` — 이미지 슬롯 · 벡터 · PDF 텍스트 추출 로직
- `assets/` — 로고, 인증 배지(NDAA/TAA/CE/FCC/AI)
- `uploads/` — 샘플/참조용 원본 데이터(제품 DB CSV, 데이터시트 PDF, 이미지 등)
- `Canvas.dc.html` / `SpecSheet.dc.html` — 보조 디자인 페이지
- `vercel.json` — 정적 호스팅 설정(cleanUrls)

## 핵심 동작 / 제약
- **빌드 없음 · 서버리스 함수 없음**. 순수 정적 파일 + CDN 라이브러리로 동작.
  - CDN 의존성: Pretendard(폰트), pdfjs-dist, pptxgenjs, SheetJS(xlsx) → **인터넷 필요**.
- 데이터는 `./data/*`를 fetch → **정적 호스팅에서 정상**(단, `file://` 직접 열기로는 안 됨. 로컬 확인은 서버 필요).
- **"실시간 AI 심화 검수" 버튼**은 `window.claude.complete()`를 호출 → 이 함수는 **Claude Design 미리보기 안에서만** 존재.
  Vercel 배포 사이트에는 없어 **동작하지 않음**(코드에 try/catch 있어 크래시 대신 "이 미리보기 환경에서 사용할 수 없습니다" 안내만 표시).
  **규칙 기반 검수(`qc_engine.js`)는 100% 클라이언트에서 정상 작동**.
  → 라이브에서도 AI 검수를 쓰려면 `api/ai-review.js`(Anthropic 프록시) + `ANTHROPIC_API_KEY` 서버리스 함수 추가 필요(현재 미구현).
- 편집기 아티팩트 `.thumbnail`, `.image-slots.state.json`은 배포 불필요 → **`.gitignore`로 제외**.

## ⚠️ 재export 시 재적용 필요 패치 (local-only fixes)
Claude Design 산출물 JS를 로컬에서 직접 고친 부분 → **재export 시 사라짐**. 재export 후 diff 확인해 재적용할 것.
- **`_cmsFromRows` — Product_Scope 배열 파싱 & 표시 순서** (커밋 `d1b4612`, 2026-08):
  CMS 엑셀의 `Product_Scope` 컬럼은 `["Camera","Recorder"]` 같은 **JSON 배열**. 원본 코드는 이 문자열을
  통째로 하나의 제품군으로 취급 → 가짜 제품군 ~30개 생성, 표시 순서 탭 오작동.
  패치: 배열을 파싱해 각 토큰(Camera/Recorder/…)별 제품군에 필드 배치, `"All"`=전 제품군 공통,
  scope 미지정 행은 제외(Wix 시스템 잡필드 자동 제거). 카테고리는 **최소 Order number 순**, 필드는 order 순 정렬.
  → **가장 좋은 해법은 Claude Design 원본에도 동일 수정**을 넣어 export에 포함되게 하는 것.
- **대량 CMS import 매핑 규칙** (`_bulkProduct`/`_fieldIndex`/`_catScope`/`BULK_SPEC_MIN·MAX`, 2026-08):
  스펙시트 테이블 필드 = CMS **Order 48(imaging_device)~484(power_saving)** 만 사용. 특수 필드 매핑:
  model=`model_number_sku`, 제품 타이틀(subtitle)=`product_summary`, overview=`detailed_description`,
  카테고리=`main_category`/`sub_category`. 그 밖 필드는 참조용(Wix CMS)이라 스펙시트에서 제외.
  또 `_catScope`는 **camera를 network보다 먼저** 검사(`Network_Camera`가 Networking으로 오판되던 것 수정).
- **PDF 저장 페이지 크기 = US Letter** (`savePdf`/도움말 PDF의 jsPDF 옵션, 2026-08):
  jsPDF `unit:'px'`가 px→pt를 96/72로 잘못 환산해 페이지가 **15.11×19.56in**(=letter×1.333)으로 나옴.
  두 jsPDF 초기화에 **`hotfixes:['px_scaling']`** 추가 → 612×792pt(8.5×11in)로 정확. (좌표/W·H 변경 없음)
- **UI 기본 언어 = 영어** (`state.lang` 초기값 + init, 2026-08): 저장된 선호(`localStorage 'specstudio:lang'`) 없으면
  `'en'`. 이전엔 `'ko'`라 시크릿모드에서 한국어로 뜨던 것 수정.
- **i18n 사전 완성** (`i18n.js` DICT, 2026-08): 앱은 한글 소스 + `translateTree`가 DICT에 있는 문구만 EN 치환.
  설정 드로어(4탭)·매핑 연결 모달·리포트 라벨 등 미번역이던 71개 문구를 DICT에 추가 → 템플릿 미번역 0.
  ⚠️ 새 한글 UI 문구를 추가하면 반드시 `i18n.js` DICT에도 EN을 넣어야 영어모드에서 번역됨(제품명·모델코드·외래어는 제외).

## 팀 공유 작업 저장 (Vercel KV / Upstash) — 백엔드
- 목적: **누가 저장하든 마지막 저장 상태를 모든 사용자·기기가 공유**(localStorage는 브라우저별이라 불가).
- 서버리스 API: `api/state.js` — 제품 model별 작업문서 저장/불러오기 + work-list 인덱스 + 히스토리 로그.
  KV 키: `sss:doc:<model>`(문서), `sss:index`(해시), `sss:history`(리스트, 최대 500). 의존성 `@upstash/redis`(`package.json`).
- ⚠️ **Vercel 설정(1회)**: Storage → **KV(Upstash Redis) 스토어 생성 → 이 프로젝트에 Connect** → `KV_REST_API_URL`/`KV_REST_API_TOKEN` 주입 → **재배포**. 없으면 `/api/state`가 503.
- 프론트(상단바 저장 버튼 · 히스토리 패널 · 시작 시 서버 로드)는 **Claude Design 산출물 JS에 삽입** → 재export 시 사라짐(재적용 필요). ⇒ Claude Design 원본에 넣는 게 최선.

## 배포
- GitHub: `ledlaputa72/ai-spec-review` (Public)
- Vercel: 저장소 Import → Framework **"Other"**(빌드/명령 비움, 환경변수 없음) → Deploy.
  - **push 시 자동 재배포**. 라이브 반영까지 보통 1~2분.

## 🔁 업데이트 절차 (Claude Design에서 재작업 후) — **자동화됨**

> **사용자는 새로 export한 ZIP만 이 세션에 첨부하면 됨.**
> Claude Code는 아래를 자동 수행하고 결과를 보고한다.

**사용자 쪽 (수동, 1회):**
1. Claude Design → **Export HTML → `Project archive`(Instant) → Export** (⚠️ `Standalone HTML` 아님 — 단일 파일로 뭉쳐져 구조가 깨짐)
2. 다운로드된 ZIP을 이 세션에 첨부(경로 알려주기).

**Claude Code 쪽 (자동):**
1. ZIP 내용 확인(`unzip -l`) — 예상 밖 삭제/구조 변화 점검.
2. 앱 폴더에 **덮어쓰기 압축 해제**: `unzip -o "<ZIP>" -d "<APP>"`
   - ⚠️ `vercel.json`, `.gitignore`, `.git/`, `CLAUDE.md`는 ZIP에 없으므로 **그대로 보존됨**(덮어쓰기 방식이라 삭제 안 함).
3. **`index.html` 재생성**: `cp "<APP>/스펙시트 자동화 스튜디오.dc.html" "<APP>/index.html"`
4. `git -c core.autocrlf=false add -A` → `git status`로 변경 요약 확인.
5. 커밋(Co-Authored-By 포함) → `git push origin main`.
6. Vercel 자동 재배포 → 사용자에게 커밋 해시 + 변경 요약 보고.

경로(현재 기준):
- APP: `D:\=Steve\# 04. AI스펙 검수\AI reviewing prodcut data app`
- 메인 문서: `스펙시트 자동화 스튜디오.dc.html`

⚠️ 주의: **저장/파일 구조를 바꾸지 말 것.** 항상 `Project archive` ZIP을 그대로 덮어쓰고
`index.html`만 재생성한다. Standalone HTML export나 임의의 파일 재배치는 하지 않는다.
