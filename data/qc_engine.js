// QC rule engine — AVYCON US/UL spec-sheet normalization.
// Mirrors the human review patterns: units, US/UL notation, standard
// terminology, typos. runQC(text, fieldName) -> { result, issues[] }.
// Each issue: { before, after, cat, note, id }.

const TYPOS = {
  'Envieonmental': 'Environmental',
  'Envieonmental': 'Environmental',
  'authenication': 'authentication',
  'authenicacion': 'authentication',
  'Idetification': 'Identification',
  'Detectionn': 'Detection',
  'Recognise': 'Recognize',
  'Recognised': 'Recognized',
  'Observ ': 'Observe ',
  'Lisence': 'License',
  'Resolurion': 'Resolution',
};

// cat labels: '단위' units, '표기' notation/format, '오타' typo, '표준' standard term, '문법' grammar
function makeRule(id, cat, note, re, repl) {
  return { id, cat, note, run(str) {
    const hits = [];
    const flat = new RegExp(re.source, re.flags.replace('g', ''));
    const out = str.replace(re, (...a) => {
      const m = a[0];
      const after = typeof repl === 'function' ? repl(...a) : m.replace(flat, repl);
      if (after !== m) hits.push({ before: m, after });
      return after;
    });
    return { out, hits };
  } };
}

// Order matters — apply specific before generic.
const RULES = [
  // —— Standard terminology ——
  makeRule('microsd', '표준', 'microSD 표준 표기 (한 단어)', /\bmicro[\s-]?SD\b/gi, 'microSD'),
  makeRule('poe', '표준', 'PoE 표준 표기', /\bPOE\b/g, 'PoE'),
  makeRule('ieee', '표준', 'IEEE 표준번호 띄어쓰기', /\bIEEE\s?802\.(3|11)/g, 'IEEE 802.$1'),
  makeRule('onvif', '표준', 'ONVIF 대문자 표기', /\bOnvif\b/g, 'ONVIF'),

  // —— Voltage notation (UL 관례: 12VDC / 24VAC) ——
  makeRule('vdc', '표기', '전압 표기 통일 (12VDC)', /\bDC\s?(\d+(?:\.\d+)?)\s?V\b/g, '$1VDC'),
  makeRule('vac', '표기', '전압 표기 통일 (24VAC)', /\bAC\s?(\d+(?:\.\d+)?)\s?V\b/g, '$1VAC'),
  makeRule('vdc2', '표기', '전압 표기 통일 (12VDC)', /\b(\d+(?:\.\d+)?)V\s?DC\b/g, '$1VDC'),
  makeRule('vac2', '표기', '전압 표기 통일 (24VAC)', /\b(\d+(?:\.\d+)?)V\s?AC\b/g, '$1VAC'),

  // —— Units ——
  makeRule('lux', '단위', 'lux 소문자 표기', /\bLux\b/g, 'lux'),
  makeRule('unit-space', '단위', '수치·단위 사이 공백', /(\d)\s?(kg|lb|RH)\b/g, (m, n, u) => n + ' ' + u),
  makeRule('w-space', '단위', '수치·단위 사이 공백 (W)', /(\d)W\b/g, '$1 W'),
  makeRule('g-space', '단위', '수치·단위 사이 공백 (g)', /(\d)g\b(?!\/)/g, (m, n) => n + ' g'),
  makeRule('maxdot', '문법', "'max' 약물 표기 (max.)", /\bmax (?=\d)/g, () => 'max. '),
  makeRule('illum', '표기', '조도 형식 통일 (@ F·앞괄호 제거)', /@\s*\(\s*(F[\d.]+)\s*,\s*(AGC[^)]*)\)/g, '@ $1 ($2)'),
  makeRule('illum2', '단위', 'lux·@ 사이 공백', /(\d)lux\s*@\s*\(?\s*(F[\d.]+)/g, '$1 lux @ $2'),
  makeRule('lens', '문법', '복수형 (lenses)', /\bflexible lens\b/g, 'flexible lenses'),

  // —— Redundant / cleanup ——
  makeRule('lessthan', '문법', "'less than ≤' 중복 제거", /less\s+than\s*≤/gi, '≤'),
  makeRule('comma', '표기', '쉼표 뒤 공백', /,(?=[^\s\d])/g, () => ', '),
  makeRule('multispace', '표기', '이중 공백 제거', / {2,}/g, ' '),
  makeRule('strayparen', '표기', '불필요한 닫는 괄호 제거', /(\d)\)(?!\s*[a-zA-Z(])(?=\s|$)/g, '$1'),
];

const TYPO_RULE = { id: 'typo', cat: '오타', note: '오타 수정', run(str) {
  const hits = [];
  let out = str;
  for (const [bad, good] of Object.entries(TYPOS)) {
    const re = new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    out = out.replace(re, () => { hits.push({ before: bad.trim(), after: good.trim() }); return good; });
  }
  return { out, hits };
} };

// Dimension-context rule: only normalize "x" -> "×" and add unit spacing
// when the field is a dimension/weight field (so resolutions stay "2688x1520").
function dimRule(str) {
  const hits = [];
  let out = str
    .replace(/(\d)\s*[x]\s*(\d)/g, (m, a, b) => { const r = a + ' × ' + b; if (r !== m) hits.push({ before: m, after: r }); return r; })
    .replace(/(\d)(mm|cm)\b/g, (m, n, u) => { const r = n + ' ' + u; hits.push({ before: m, after: r }); return r; });
  return { out, hits };
}

export function runQC(text, fieldName = '', disabled = []) {
  if (text == null) return { result: '', issues: [] };
  const off = new Set(disabled || []);
  let current = String(text);
  const issues = [];
  const isDim = /dimension|weight|치수/i.test(fieldName);
  const pipeline = [TYPO_RULE, ...RULES].filter(r => !off.has(r.id));
  for (const rule of pipeline) {
    const { out, hits } = rule.run(current);
    current = out;
    for (const h of hits) issues.push({ ...h, cat: rule.cat, note: rule.note, id: rule.id, field: fieldName });
  }
  if (isDim && !off.has('dim')) {
    const { out, hits } = dimRule(current);
    current = out;
    for (const h of hits) issues.push({ ...h, cat: '단위', note: '치수 기호·단위 정리 (× / mm)', id: 'dim', field: fieldName });
  }
  // DORI context — verb forms to noun forms (US/IEC 62676-4)
  if (!off.has('dori') && /dori|detect|observe|recogni|identif/i.test(fieldName)) {
    const DORI = [['Detect\\b', 'Detection'], ['Observe\\b', 'Observation'], ['Recognize\\b', 'Recognition'], ['Recognise\\b', 'Recognition'], ['Identify\\b', 'Identification']];
    for (const [bad, good] of DORI) {
      const re = new RegExp('\\b' + bad, 'g');
      current = current.replace(re, () => { issues.push({ before: bad.replace('\\b', ''), after: good, cat: '표준', note: 'DORI 명사형 통일 (IEC 62676-4)', id: 'dori', field: fieldName }); return good; });
    }
  }
  // trim + tab cleanup (notation)
  const trimmed = current.replace(/\t/g, '').replace(/^[ \t]+|[ \t]+$/g, '');
  if (!off.has('trim') && trimmed !== current) {
    issues.push({ before: '…(공백/탭)', after: '정리됨', cat: '표기', note: '앞뒤 공백·탭 제거', id: 'trim', field: fieldName });
    current = trimmed;
  }
  return { result: current, issues };
}

// Rule catalog (for Settings display)
export const RULE_CATALOG = [
  ...[TYPO_RULE, ...RULES].map(r => ({ id: r.id, cat: r.cat, note: r.note })),
  { id: 'dim', cat: '단위', note: '치수 기호·단위 정리 (× / mm)' },
  { id: 'trim', cat: '표기', note: '앞뒤 공백·탭 제거' },
];
