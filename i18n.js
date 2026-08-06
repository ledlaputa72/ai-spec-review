/**
 * i18n.js — runtime KO→EN translation layer for the Spec Sheet Studio UI.
 *
 * The template/logic keep Korean as the single source of truth. When the user
 * switches to English we walk the app root's text nodes + placeholders after
 * every render and swap Korean → English using an exact dictionary plus a few
 * regex rules for strings that embed live numbers. Re-running each render keeps
 * it idempotent (React restores Korean, we translate again).
 *
 * export const DICT, PATTERNS; export function translateTree(root, lang)
 */
export const DICT = {
  // ---- header ----
  '저장': 'Save',
  '공유 · 내보내기': 'Share · Export',
  '설정': 'Settings',
  '📜 히스토리': '📜 History',
  '📜 저장 히스토리': '📜 Save history',
  '공유': 'Shared',
  '공유됨': 'Shared',
  '전체 단계 문서 내보내기': 'Export all-step documents',
  'PDF로 저장': 'Save as PDF',
  '인쇄': 'Print',
  'Word 문서 (.doc)': 'Word document (.doc)',
  'PowerPoint (.pptx)': 'PowerPoint (.pptx)',
  'AI 검수 엑셀 (.xlsx)': 'AI-reviewed Excel (.xlsx)',

  // ---- stepper ----
  '가져오기 · 정렬': 'Import · Map',
  'AI 검수': 'AI Review',
  '레이아웃': 'Layout',
  '편집기': 'Editor',

  // ---- loading ----
  'CMS 매핑·샘플 데이터 불러오는 중…': 'Loading CMS mapping & sample data…',

  // ---- step 1: import ----
  '중국 데이터 가져오기': 'Import manufacturer data',
  '기제작 PDF 스펙시트 가져오기': 'Import existing PDF spec sheet',
  '제조사 엑셀(.xlsx)을 업로드하면 CMS의 카테고리·표시 순서에 맞춰 자동 정렬됩니다. 아래 샘플로 바로 체험할 수도 있습니다.':
    'Upload a manufacturer Excel (.xlsx) and it is auto-sorted to the CMS category & display order. You can also try the samples below.',
  '이미 수동 제작된 AVYCON 스펙시트 PDF에서 스펙을 추출해 엑셀 데이터 포맷으로 변환합니다. 이후 AI 검수·레이아웃 단계로 그대로 진행됩니다. (중국 엑셀이 없는 제품용)':
    'Extracts specs from an already-made AVYCON spec-sheet PDF and converts them to the Excel data format, then continues to AI review & layout. (For products without a manufacturer Excel.)',
  '📑 제조사 엑셀(.xlsx)': '📑 Manufacturer Excel (.xlsx)',
  '📄 기제작 PDF 스펙시트': '📄 Existing PDF spec sheet',
  '제품 데이터 가져오기': 'Import product data',
  '제조사 엑셀 또는 기제작 PDF 스펙시트를 각 영역에 끌어다 놓으면 CMS 카테고리·표시 순서에 맞춰 자동 정렬되고, AI 검수·레이아웃 단계로 이어집니다.':
    'Drop a manufacturer Excel or an existing PDF spec sheet on the matching zone — it is auto-sorted to the CMS category & display order and continues to AI review & layout.',
  '제조사 데이터시트를 올리면 CMS 카테고리·표시 순서에 맞춰 자동 정렬됩니다.':
    'Upload a manufacturer datasheet and it is auto-sorted to the CMS category & display order.',
  '이미 제작된 AVYCON 스펙시트에서 스펙을 추출해 엑셀 데이터로 변환합니다.':
    'Extracts specs from an already-made AVYCON spec sheet and converts them to Excel data.',
  'PDF 파일만 이 영역에 놓을 수 있습니다.': 'Only PDF files can be dropped here.',
  '.pdf · AVYCON 포맷 스펙시트 · 텍스트 추출 → 엑셀 데이터': '.pdf · AVYCON-format spec sheet · text extraction → Excel data',
  '.xlsx · 제조사 데이터시트 양식 · 끌어다 놓거나 클릭': '.xlsx · manufacturer datasheet format · drag & drop or click',
  '제조사 엑셀을 끌어다 놓기': 'Drop the manufacturer Excel',
  '기제작 PDF 스펙시트를 끌어다 놓기': 'Drop an existing PDF spec sheet',
  '여기에 놓으세요': 'Drop it here',
  '모델명 검색': 'Search model name',
  '개 제품': ' products',
  '페이지당 표시': 'Rows per page',
  '총': 'Total', '개 · 표시': ' · shown', '개 열': ' cols', '제품군 자동 판별': 'Scope: auto',
  '🗂 대량 CMS 데이터 (.xlsx)': '🗂 Bulk CMS data (.xlsx)',
  'LiveProducts 형식의 전체 제품 엑셀을 올려 원하는 제품만 골라 작업 목록에 담습니다.':
    'Upload a LiveProducts-format all-products Excel and pick the ones you want into the work list.',
  '.xlsx · 1행 헤더 = CMS 필드명 · 제품 1행씩': '.xlsx · row 1 = CMS field names · one row per product',
  '전체 제품 엑셀을 끌어다 놓기': 'Drop the all-products Excel',
  '대량 데이터 분석 중…': 'Analyzing bulk data…',
  '대량 CMS 데이터 선택': 'Select bulk CMS data',
  '모델명 · 제품명 검색': 'Search model or product name',
  '대량 CMS 데이터는 .xlsx 파일만 지원합니다.': 'Bulk CMS data supports .xlsx files only.',
  '개 선택': ' selected',
  '⧉ 복제': '⧉ Duplicate', '🗑 삭제': '🗑 Delete', '취소': 'Cancel', '복제': 'Duplicate', '삭제': 'Delete',
  '선택한 제품을 삭제할까요?': 'Delete the selected products?',
  '선택한 제품을 복제할까요?': 'Duplicate the selected products?',
  '제품 작업 목록': 'Product work list',
  '지금까지 불러오거나 작업한 제품입니다. 행을 열면 해당 데이터로 바로 이어서 진행합니다.':
    'Products loaded or worked on so far. Open a row to continue with that data.',
  '모델명': 'Model name', '제품명': 'Product name', '스펙 필드': 'Spec fields',
  '소스': 'Source', '상태': 'Status', '작업': 'Action', '열기 →': 'Open →',
  '미작업': 'Not started', '샘플': 'Sample', '엑셀': 'Excel',
  '일치하는 제품이 없습니다.': 'No matching products.',
  '기제작 PDF 스펙시트를 끌어다 놓기': 'Drop an existing PDF spec sheet',
  '제조사 엑셀을 끌어다 놓기': 'Drop the manufacturer Excel',
  '여기에 놓으세요': 'Drop it here',
  'PDF 추출 중…': 'Extracting PDF…',
  '엑셀 분석 중…': 'Analyzing Excel…',
  '.pdf · AVYCON 포맷 스펙시트 · 텍스트 추출 → 엑셀 데이터로 변환': '.pdf · AVYCON-format spec sheet · text extraction → Excel data',
  '.xlsx · 제조사 데이터시트 양식 · 끌어다 놓거나 클릭': '.xlsx · manufacturer datasheet format · drag & drop or click',
  '샘플 데이터로 시작': 'Start with sample data',
  '↻ 저장된 작업 이어서 하기': '↻ Continue saved work',
  '← 처음으로': '← Home',
  '다른 파일': 'Other file',
  '다시 가져오기': 'Re-import',
  '📄 리포트 보기': '📄 View report',
  '📄 리포트': '📄 Report',
  '▦ 엑셀로 내보내기': '▦ Export to Excel',
  'CMS 표시 순서 기준으로 스펙을 재배열했습니다.': 'Specs rearranged by CMS display order.',
  '원본 · 제조사 데이터': 'Source · manufacturer data',
  '정렬·매핑 결과 · CMS 순서': 'Sorted & mapped · CMS order',
  'AI 검수로 진행 →': 'Proceed to AI review →',
  'CMS 항목에 연결하거나 사용 안 함으로 처리하세요': 'Link to a CMS field or mark as unused',
  '— 미지정 —': '— unassigned —',
  '사용 안 함': 'Do not use',
  '사용자 정의로 추가': 'Add as custom',

  // ---- step 2: review ----
  'AI 검수 · 미국/UL 표기 정규화': 'AI review · US/UL notation normalization',
  '단위·기호, UL 전압 표기, CCTV 표준 용어(microSD·PoE·IEC 62676-4 DORI), 오타·문법을 검출했습니다. 각 항목을 켜고 끄며 반영 여부를 결정하세요.':
    'Detected units/symbols, UL voltage notation, CCTV standard terms (microSD·PoE·IEC 62676-4 DORI), typos & grammar. Toggle each item to decide whether it is applied.',
  '실시간 AI 심화 검수': 'Live AI deep review',
  '— 규칙으로 못 잡은 항목을 Claude가 추가로 제안합니다.': '— Claude suggests additional items the rules missed.',
  '🔄 AI 심화 검수 실행': '🔄 Run AI deep review',
  'AI 검수 중…': 'AI reviewing…',
  '총 검출 항목': 'Total detections',
  '전체 승인': 'Approve all',
  '전체 해제': 'Clear all',
  '전체 보기 ▼': 'Show full ▼',
  '접기 ▲': 'Collapse ▲',
  '→ 수정 후': '→ after',
  '실시간 AI 심화 검수': 'Live AI deep review',
  '레이아웃 배치 →': 'Place in layout →',
  '← 정렬로': '← Back to mapping',
  '단위': 'Units', '표기': 'Notation', '오타': 'Typo', '표준': 'Standard', '문법': 'Grammar', '기본 정보': 'Basic',

  // ---- step 3: layout ----
  '레이아웃 옵션': 'Layout options',
  'US Letter 세로 · 2페이지': 'US Letter portrait · 2 pages',
  '출력 버전': 'Output version',
  '수정버전': 'Revised', '기존버전': 'Original',
  'AI 검수 반영': 'Apply AI review',
  'CMS 정렬·매핑': 'CMS sort & map',
  '페이지 보기': 'Page view',
  '양면': 'Both', '1면': 'Page 1', '2면': 'Page 2',
  '확대 · 맞춤': 'Zoom · fit',
  '↔ 너비': '↔ Width', '↕ 세로': '↕ Height', '□ 페이지': '□ Page',
  '사진·정보 편집 →': 'Edit photos & info →',

  // ---- step 4: editor ----
  '엑셀 데이터에서 가져온 값 · 모두 수정 가능': 'Values imported from Excel · all editable',
  '기본 정보': 'Basic info',
  '모델명': 'Model', '서브 타이틀': 'Subtitle', '서브 타이틀 (1행)': 'Subtitle (line 1)', '서브 타이틀 (2행)': 'Subtitle (line 2)',
  'OVERVIEW 불릿': 'OVERVIEW bullets', '+ 추가': '+ Add',
  '제품 사진 · 치수 도면': 'Product photos · dimension drawings',
  '왼쪽 미리보기의 제품 사진·치수 도면 영역에 이미지를 직접 끌어다 놓으세요. 드롭한 이미지는 자동 저장됩니다.':
    'Drag images onto the product-photo / dimension-drawing areas in the left preview. Dropped images are saved automatically.',
  '치수 수치': 'Dimension values',
  '도면 1개': '1 drawing', '도면 2개': '2 drawings',
  '↕ 위·아래': '↕ Stacked', '↔ 좌·우': '↔ Side by side',
  'OPTIONAL ACCESSORIES': 'OPTIONAL ACCESSORIES',
  '사진은 왼쪽 미리보기의 액세서리 칸에 직접 드롭하세요.': 'Drop photos onto the accessory cells in the left preview.',
  '인증 아이콘': 'Certification icons', '· 등록 후 선택': '· register then select',
  '스펙 값 인라인 수정': 'Inline spec-value edits',
  '필드 검색…': 'Search fields…',

  // ---- settings drawer ----
  '표시 순서': 'Display order', '검수 규칙': 'Review rules',
  '스펙시트의 카테고리 표시 순서입니다. 위/아래로 옮기면 레이아웃에 즉시 반영됩니다. (CMS Order number 기준이 기본값)':
    'Category display order of the spec sheet. Move up/down to apply instantly to the layout. (Default is CMS Order number.)',
  'AI 검수 규칙입니다. 끄면 해당 유형의 수정 제안이 검수 결과에서 제외됩니다.':
    'AI review rules. Turning one off excludes that type of suggestion from the review.',

  // ---- reports overlay ----
  '문서 리포트 미리보기': 'Document report preview',
  '· 전체 단계 · US Letter': '· all steps · US Letter',
  '🖨 인쇄 · PDF로 저장': '🖨 Print · Save as PDF',
  '정렬·매핑 리포트': 'Sort & map report',
  'AI 검수 · 검출 내역': 'AI review · detections',
  'AI 검수 리포트': 'AI review report',
  '반영 결과 · 최종 값': 'Applied result · final values',
  '⚠ 확인 필요 항목': '⚠ Items needing review',
  '· 추정 매핑 / 미매핑': '· inferred / unmapped',
  '완전 일치가 아니라 유사 항목으로 자동 추정한 필드와, 대응 항목을 찾지 못한 필드입니다. 편집기에서 확인·수정하세요.':
    'Fields auto-inferred by similarity (not exact match) plus fields with no counterpart. Review & fix in the editor.',
  '스펙시트 — AI 검수 반영본': 'Spec sheet — AI-reviewed',
  '스펙시트 — 원본(중국/PDF 데이터) 기반': 'Spec sheet — original (manufacturer/PDF data)',
  '수정 전': 'Before', '수정 후': 'After', '유형': 'Type', '수정 내용': 'Change', '변경 (전 → 후)': 'Change (before → after)',
  '반영': 'Applied', '제외': 'Excluded', '추정 매핑': 'Inferred', '추천 있음': 'Suggested', '미매핑': 'Unmapped', '추정': 'Inferred',

  // ---- split fragments (interpolation boundaries) ----
  '· 정렬·매핑': '· sort & map',
  'CMS 표시 순서 기준으로': 'By CMS display order,',
  '스펙을 재배열했습니다.': 'specs rearranged.',
  '개 매핑됨': ' mapped',
  '개 미매핑 · 연결하기': ' unmapped · link',
  '필드': 'fields',
  '레이아웃 배치 → (': 'Place in layout → (',
  '건 반영)': ' applied)',
  '건': '',

  // ---- QC rule notes (Settings + review tags) ----
  'microSD 표준 표기 (한 단어)': 'microSD standard notation (one word)',
  'PoE 표준 표기': 'PoE standard notation',
  'IEEE 표준번호 띄어쓰기': 'IEEE standard-number spacing',
  'ONVIF 대문자 표기': 'ONVIF uppercase notation',
  '전압 표기 통일 (12VDC)': 'Unified voltage notation (12VDC)',
  '전압 표기 통일 (24VAC)': 'Unified voltage notation (24VAC)',
  'lux 소문자 표기': 'lux lowercase notation',
  '수치·단위 사이 공백': 'Space between value & unit',
  '수치·단위 사이 공백 (W)': 'Space between value & unit (W)',
  '수치·단위 사이 공백 (g)': 'Space between value & unit (g)',
  "'max' 약물 표기 (max.)": "'max' abbreviation (max.)",
  '조도 형식 통일 (@ F·앞괄호 제거)': 'Illumination format (@ F · drop leading paren)',
  'lux·@ 사이 공백': 'Space between lux & @',
  '복수형 (lenses)': 'Plural form (lenses)',
  "'less than ≤' 중복 제거": "Remove redundant 'less than ≤'",
  '빈 목록 항목·중복 쉼표 정리': 'Clean empty list items & duplicate commas',
  '앞뒤 불필요한 쉼표 제거': 'Remove leading/trailing commas',
  '쉼표 뒤 공백': 'Space after comma',
  '이중 공백 제거': 'Remove double spaces',
  '짝 없는 닫는 괄호 제거': 'Remove unmatched closing paren',
  '오타 수정': 'Typo fix',
  '치수 기호·단위 정리 (× / mm)': 'Dimension symbol & unit (× / mm)',
  '앞뒤 공백·탭 제거': 'Trim spaces & tabs',
  'DORI 명사형 통일 (IEC 62676-4)': 'DORI noun form (IEC 62676-4)',
  '왼쪽 미리보기의': 'In the left preview, drag images onto the',
  '제품 사진': 'product photo',
  '치수 도면': 'dimension drawing',
  '영역에 이미지를 직접 끌어다 놓으세요. 드롭한 이미지는 자동 저장됩니다.': 'areas. Dropped images are saved automatically.',
  '치수 도면 개수': 'Number of drawings',

  // ---- settings drawer: CMS table tab ----
  'CMS 데이터 필드 테이블': 'CMS data field table',
  '매핑·정렬의 기준이 되는': 'The reference for mapping & sorting —',
  '입니다. 새 테이블을 업로드하면 이후 모든 매핑·정렬·레이아웃이 그 필드 정의를 기준으로 동작합니다.': '. Upload a new table and all mapping, sorting and layout follow its field definitions.',
  '현재 기준 테이블': 'Current reference table',
  'CMS 테이블 업로드': 'Upload CMS table',
  '기본값 복원': 'Restore default',
  'CMS 테이블 분석 중…': 'Analyzing CMS table…',
  '지원 형식': 'Supported formats',
  '— 열:': '— columns:',
  '(키) ·': '(key) ·',
  '(표시명) ·': '(display name) ·',
  '(Y/N, 선택). 헤더 행 자동 인식.': '(Y/N, optional). Header row auto-detected.',
  '— 내보내기와 동일한': '— same as export:',
  '구조.': 'structure.',
  // ---- settings drawer: display order tab ----
  '제품군(Scope)': 'Product group (Scope)',
  '데이터 필드': 'Data fields',
  // ---- settings drawer: review rules tab ----
  '기본 내장 검수 규칙': 'Built-in review rules',
  '입니다. 끄면 해당 유형의 수정 제안이 검수 결과에서 제외됩니다. 새로 발견한 오류는': '. Turn one off to exclude that suggestion type from results. New errors can be',
  '탭에서 추가하세요.': 'added from the tab.',
  '규칙:': 'Rules:',
  // ---- settings drawer: rule library tab ----
  '규칙 라이브러리': 'Rule library',
  '사용자 규칙 라이브러리': 'Custom rule library',
  '새로 들어온 데이터·기제작 스펙에서 발견한 오류를 규칙으로 누적하는': 'Accumulates errors found in incoming data and existing specs as rules —',
  '입니다. 내장 규칙과 별도로 저장되며 엑셀·CSV로 내보낼 수 있습니다.': '. Stored separately from built-in rules and exportable to Excel/CSV.',
  '누적 사용자 규칙': 'Accumulated custom rules',
  '새 규칙 후보 검사': 'Scan for rule candidates',
  '새 규칙 후보': 'Rule candidates',
  '새 데이터에서 규칙 후보 검출': 'Detect rule candidates from new data',
  '가져오기': 'Import',
  '규칙 직접 추가': 'Add a rule manually',
  '찾을 문자열 (예: 12V DC)': 'Find text (e.g. 12V DC)',
  '바꿀 문자열 (비우면 삭제)': 'Replace with (empty = delete)',
  '규칙 설명 (선택)': 'Rule description (optional)',
  '적용 필드 (선택, 예: dimension)': 'Target field (optional, e.g. dimension)',
  '규칙 추가': 'Add rule',
  '전체 규칙으로 추가': 'Add as global rule',
  '대소문자 무시': 'Ignore case',
  '정규식': 'Regex',
  '아직 누적된 사용자 규칙이 없습니다.': 'No custom rules yet.',
  '데이터를 불러온 뒤': 'After loading data, run',
  '를 실행하세요.': '.',
  '전체 비우기': 'Clear all',
  '검출': 'Detect',
  '검출된 새 패턴이 없습니다.': 'No new patterns detected.',
  '현재 규칙 라이브러리가 이 데이터를 모두 커버합니다.': 'The current rule library covers all of this data.',
  // ---- mapping-connection modal ----
  '매핑 연결 확인 · 수정': 'Check & edit mapping',
  'CMS 매핑 필드 (유사 매칭 포함)': 'CMS mapped fields (incl. fuzzy matches)',
  'CMS 필드': 'CMS field',
  '모델 코드': 'Model code',
  '현재 연결된 원본 필드': 'Currently linked source field',
  '연결된 원본 필드를 확인하고 다른 필드로 바꾸거나 해제하세요': 'Review the linked source field; change it or unlink',
  '연결 변경': 'Change link',
  '연결 해제': 'Unlink',
  '연결 해제 → 미매핑으로 이동': 'Unlink → move to unmapped',
  '다른 원본 필드를 선택하면 이 CMS 항목에 연결되고 기존 연결은 해제됩니다.': 'Pick another source field to link it to this CMS item; the existing link is removed.',
  '이 CMS 항목의 연결을 끊고 해당 원본 필드를 미매핑 목록으로 되돌립니다.': 'Unlinks this CMS item and returns its source field to the unmapped list.',
  '확인 필요 (추정·미매핑)': 'Needs review (guessed / unmapped)',
  // ---- report / misc ----
  '1. 정렬·매핑 리포트': '1. Sort & mapping report',
  '2. AI 검수 리포트': '2. AI review report',
  'STEP 3 · 스펙시트 — 기존버전 (중국/PDF 원본 데이터)': 'STEP 3 · Spec sheet — original (manufacturer/PDF source data)',
  'STEP 3 · 스펙시트 — 수정버전 (AI 검수 · CMS 정렬·매핑 반영)': 'STEP 3 · Spec sheet — revised (AI review · CMS sort & map applied)',
  '2번째 도면 배치': 'Second drawing layout',
  '설명': 'Description',
  '닫기': 'Close',
  '도움말': 'Help',
  '저장 히스토리': 'Save history',
  '제거': 'Remove',
  '(계속)': '(continued)',
};

// number-embedding strings → regex replacers ($1 = captured number)
export const PATTERNS = [
  [/^✓\s*(\d+)개 매핑됨$/, '✓ $1 mapped'],
  [/^⚠\s*(\d+)개 미매핑 · 연결하기$/, '⚠ $1 unmapped · link'],
  [/^(\d+)개 스펙 필드 →$/, '$1 spec fields →'],
  [/^(\d+)개 제품$/, '$1 products'],
  [/^(\d+)개 선택$/, '$1 selected'],
  [/^총 (\d+)개 · 표시 (\d+)개$/, '$1 total · $2 shown'],
  [/^(\d+)개 제품을 작업 목록에 추가했습니다\.$/, 'Added $1 product(s) to the work list.'],
  [/^(.*)\(복사본 (\d+)\)$/, '$1(Copy $2)'],
  [/^(\d+)개 제품을 목록에서 제거합니다\. 이 작업은 되돌릴 수 없습니다\.$/, 'Removes $1 product(s) from the list. This cannot be undone.'],
  [/^(\d+)개 제품을 같은 데이터로 복사해 목록에 추가합니다\.$/, 'Copies $1 product(s) with the same data and adds them to the list.'],
  [/^작업함 · (.+)$/, 'Worked · $1'],
  [/^저장됨 · (.+)$/, 'Saved · $1'],
  [/^공유 저장 · (.+)$/, 'Shared · $1'],
  [/^미매핑 필드 · (\d+)건$/, 'Unmapped fields · $1'],
  [/^확인 필요 항목 · (\d+)건$/, 'Items to review · $1'],
  [/^(\d+)\s*\/\s*(\d+) 필드$/, '$1 / $2 fields'],
  [/^레이아웃 배치 → \((\d+)건 반영\)$/, 'Place in layout → ($1 applied)'],
  [/^승인 (\d+) · 제외 (\d+)$/, 'Approved $1 · excluded $2'],
  [/^(.+?) · 정렬·매핑$/, '$1 · sort & map'],
  [/^CMS 표시 순서 기준으로 (.+?) 스펙을 재배열했습니다\.$/, 'Specs for $1 rearranged by CMS display order.'],
  [/^총 (\d+)건 검출 · (\d+)건 반영$/, '$1 detected · $2 applied'],
  [/^✓ 저장됨 · (.+)$/, '✓ Saved · $1'],
  [/^(\d+) \/ (\d+)$/, '$1 / $2'],
  [/^(\d+)개 시트가 더 있습니다 \(첫 시트를 불러왔습니다\)\.$/, '$1 more sheets found (loaded the first).'],
];

function tr(text) {
  const key = text.trim();
  if (!key) return null;
  if (DICT[key] != null) return text.replace(key, DICT[key]);
  for (const [re, rep] of PATTERNS) {
    if (re.test(key)) return text.replace(key, key.replace(re, rep));
  }
  // strip a leading emoji/symbol prefix (e.g. "💾 저장" → "저장") and retry
  const m = key.match(/^([^\p{L}\p{N}]+\s*)(.+)$/u);
  if (m && DICT[m[2]] != null) return text.replace(key, m[1] + DICT[m[2]]);
  // joined note strings ("a · b · c") → translate each segment
  if (key.includes(' · ')) {
    const parts = key.split(' · ');
    const tp = parts.map((p) => (DICT[p.trim()] != null ? DICT[p.trim()] : p));
    if (tp.some((v, i) => v !== parts[i])) return text.replace(key, tp.join(' · '));
  }
  return null;
}

export function translateTree(root, lang) {
  if (!root || lang !== 'en') return;
  // subtrees that supply their own localized copy opt out entirely
  const skip = (n) => (n.parentElement && n.parentElement.closest('[data-i18n-skip]'))
    ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
  // text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: skip });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (const node of nodes) {
    const out = tr(node.nodeValue);
    if (out != null && out !== node.nodeValue) {
      if (node.__ko == null) node.__ko = node.nodeValue;   // remember original
      node.nodeValue = out;
    }
  }
  // placeholders
  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    const cur = el.getAttribute('placeholder');
    const out = tr(cur);
    if (out != null && out !== cur) {
      if (el.__koPh == null) el.__koPh = cur;
      el.setAttribute('placeholder', out);
    }
  });
}

// Restore Korean originals stashed by translateTree.
export function restoreTree(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n;
  while ((n = walker.nextNode())) {
    if (n.__ko != null) { n.nodeValue = n.__ko; n.__ko = null; }
  }
  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    if (el.__koPh != null) { el.setAttribute('placeholder', el.__koPh); el.__koPh = null; }
  });
}
