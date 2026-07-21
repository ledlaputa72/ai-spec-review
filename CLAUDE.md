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
