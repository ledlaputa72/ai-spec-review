
// QC rule engine — AVYCON US/UL spec-sheet normalization.
// Mirrors the human review patterns: units, US/UL notation, standard
// terminology, typos. runQC(text, fieldName) -> { result, issues[] }.
// Each issue: { before, after, cat, note, id }.
//
// Two rule tiers:
//   BUILT-IN  — the fixed catalog below (shipped with the app).
//   CUSTOM    — user rules discovered from new data, registered at runtime via
//               setCustomRules(); persisted + exportable by the app.

const TYPOS = {
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
  makeRule('vdc', '표기', '전압 표기 통일 (DC 12V → 12VDC)', /\bDC\s?(\d+(?:\.\d+)?)\s?V\b/g, '$1VDC'),
  makeRule('vac', '표기', '전압 표기 통일 (AC 24V → 24VAC)', /\bAC\s?(\d+(?:\.\d+)?)\s?V\b/g, '$1VAC'),
  makeRule('vdc2', '표기', '전압 표기 통일 (12V DC → 12VDC)', /\b(\d+(?:\.\d+)?)V\s?DC\b/g, '$1VDC'),
  makeRule('vac2', '표기', '전압 표기 통일 (24V AC → 24VAC)', /\b(\d+(?:\.\d+)?)V\s?AC\b/g, '$1VAC'),

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
  makeRule('listsep', '표기', '빈 목록 항목·중복 쉼표 정리', /\s*,(?:\s*,)+\s*/g, () => ', '),
  makeRule('edgesep', '표기', '앞뒤 불필요한 쉼표 제거', /^\s*,\s*|\s*,\s*$/g, () => ''),
  makeRule('comma', '표기', '쉼표 뒤 공백', /(?<!\d),(?=\d)|,(?=[^\s\d])/g, () => ', '),
  makeRule('multispace', '표기', '이중 공백 제거', / {2,}/g, ' '),
  { id: 'strayparen', cat: '표기', note: '짝 없는 닫는 괄호 제거', run(str) {
    // Only remove a ")" that has no matching "(" — never touch balanced pairs like "(F1.2)".
    const hits = [];
    let opens = 0;
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '(') { opens++; out += ch; }
      else if (ch === ')') {
        if (opens > 0) { opens--; out += ch; }        // matched — keep
        else { hits.push({ before: ')', after: '' }); } // unmatched — drop
      } else out += ch;
    }
    if (hits.length) return { out, hits: [{ before: '…)', after: '…' }] };
    return { out: str, hits: [] };
  } },
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

// ── Custom (user-registered) rules ────────────────────────────────────────
// Spec shape: { id, cat, note, find, repl, regex?:bool, ci?:bool, scope?:string }
// `scope` optionally limits the rule to fields whose name matches that pattern.
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let CUSTOM = [];

function compileCustom(spec) {
  let re;
  try {
    re = new RegExp(spec.regex ? spec.find : esc(spec.find), 'g' + (spec.ci ? 'i' : ''));
  } catch (e) { return null; }
  const scopeRe = spec.scope ? new RegExp(spec.scope, 'i') : null;
  const repl = String(spec.repl == null ? '' : spec.repl);
  return {
    id: spec.id, cat: spec.cat || '표기', note: spec.note || (spec.find + ' → ' + repl),
    custom: true, scopeRe,
    run(str) {
      const hits = [];
      const out = str.replace(re, m => {
        const after = spec.regex ? m.replace(new RegExp(spec.find, spec.ci ? 'i' : ''), repl) : repl;
        if (after !== m) hits.push({ before: m, after });
        return after;
      });
      return { out, hits };
    },
  };
}

export function setCustomRules(list) {
  CUSTOM = (list || []).map(compileCustom).filter(Boolean);
  return CUSTOM.length;
}
export function customRuleCount() { return CUSTOM.length; }

// Dimension-context rule: only normalize "x" -> "×" and add unit spacing
// when the field is a dimension/weight field (so resolutions stay "2688x1520").
function dimRule(str) {
  const hits = [];
  let out = str
    .replace(/(\d)\s*[x]\s*(\d)/g, (m, a, b) => { const r = a + ' × ' + b; if (r !== m) hits.push({ before: m, after: r }); return r; })
    .replace(/(\d)(mm|cm)\b/g, (m, n, u) => { const r = n + ' ' + u; hits.push({ before: m, after: r }); return r; });
  return { out, hits };
}

// ── US-format unit pairing — 미국규격(국제규격) ───────────────────────────
// 길이·무게·온도 필드의 값을 미국 단위 우선으로 병기한다:
//   inch(mm/cm) · lb(kg/g) · °F(°C).
// 이미 병기된 값(" / inch / lb / °F 포함)은 건너뛰어 재실행에도 안전(멱등).
const _trim0 = (v, dp) => v.toFixed(dp).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
function usUnitsRule(str, fieldName) {
  const isTemp = /temperat|온도/i.test(fieldName);
  const isWeight = /weight|무게/i.test(fieldName);
  const isLen = /dimension|치수|size|length|width|height|depth|diameter/i.test(fieldName) && !/focal/i.test(fieldName);
  const hits = [];
  let out = str;
  // 온도: -10°C ~ +50°C → 14°F ~ 122°F (-10°C ~ +50°C)
  if (isTemp && /(?:°|º|˚)\s*C\b/.test(out) && !/(?:°|º|˚)\s*F\b/.test(out)) {
    const f = out.replace(/([-+–−]?\s?\d+(?:\.\d+)?)\s*(?:°|º|˚)\s*C\b/g, (m, n) => {
      const c = parseFloat(String(n).replace(/[–−]/g, '-').replace(/\s+/g, ''));
      if (isNaN(c)) return m;
      return Math.round(c * 9 / 5 + 32) + '°F';
    });
    if (f !== out) { const res = f + ' (' + out + ')'; hits.push({ before: out, after: res }); out = res; }
  }
  // 무게: 0.95 kg → 2.09 lb (0.95 kg)
  if (isWeight && /\d\s*(?:kg|g)\b/i.test(out) && !/\b(?:lbs?|oz)\b/i.test(out)) {
    const f = out.replace(/(\d+(?:\.\d+)?)\s*(kg|g)\b(?!\/)/gi, (m, n, u) => {
      const v = parseFloat(n); if (isNaN(v)) return m;
      const lb = u.toLowerCase() === 'kg' ? v * 2.20462 : v * 0.00220462;
      return _trim0(lb, 2) + ' lb';
    });
    if (f !== out) { const res = f + ' (' + out + ')'; hits.push({ before: out, after: res }); out = res; }
  }
  // 길이: 300 × 248.4 × 45 mm → 11.81" × 9.78" × 1.77" (300 × 248.4 × 45 mm)
  // (× 로 묶인 숫자 그룹은 마지막에만 단위가 붙어도 전부 변환. 초점거리(focal)는 제외.)
  if (isLen && /\d\s*(?:mm|cm)\b/i.test(out) && !/["″]|\binch(?:es)?\b|\bin\b/.test(out)) {
    const f = out.replace(/((?:\d+(?:\.\d+)?\s*[×xX]\s*)*\d+(?:\.\d+)?)\s*(mm|cm)\b/gi, (m, nums, u) => {
      const div = u.toLowerCase() === 'mm' ? 25.4 : 2.54;
      const parts = nums.split(/\s*[×xX]\s*/).map(s => parseFloat(s));
      if (parts.some(isNaN)) return m;
      return parts.map(v => _trim0(v / div, 2) + '"').join(' × ');
    });
    if (f !== out) { const res = f + ' (' + out + ')'; hits.push({ before: out, after: res }); out = res; }
  }
  return { out, hits };
}

export function runQC(text, fieldName = '', disabled = []) {
  if (text == null) return { result: '', issues: [] };
  const off = new Set(disabled || []);
  let current = String(text);
  const issues = [];
  const isDim = /dimension|weight|치수/i.test(fieldName);
  const custom = CUSTOM.filter(r => !r.scopeRe || r.scopeRe.test(fieldName));
  const pipeline = [TYPO_RULE, ...RULES, ...custom].filter(r => !off.has(r.id));
  for (const rule of pipeline) {
    const { out, hits } = rule.run(current);
    current = out;
    for (const h of hits) issues.push({ ...h, cat: rule.cat, note: rule.note, id: rule.id, field: fieldName, custom: !!rule.custom });
  }
  if (isDim && !off.has('dim')) {
    const { out, hits } = dimRule(current);
    current = out;
    for (const h of hits) issues.push({ ...h, cat: '단위', note: '치수 기호·단위 정리 (× / mm)', id: 'dim', field: fieldName });
  }
  // 미국규격(국제규격) 병기 — 길이·무게·온도 필드
  if (!off.has('us-units')) {
    const { out, hits } = usUnitsRule(current, fieldName);
    current = out;
    for (const h of hits) issues.push({ ...h, cat: '단위', note: '미국 규격 병기 — inch(mm) · lb(kg) · °F(°C)', id: 'us-units', field: fieldName });
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

// ── Candidate discovery ───────────────────────────────────────────────────
// Scans data that has ALREADY been through runQC, so anything the current
// ruleset fixes never shows up here. What remains are patterns the catalog
// does not yet cover — the raw material for new rules.

const ACRONYMS = ['ONVIF','PoE','HDMI','RTSP','HTTP','HTTPS','DHCP','DNS','NTP','SMTP','UPnP','TCP/IP','IEEE','ANSI','NVR','DVR','GUI','API','SDK','WDR','BLC','HLC','AGC','ROI','VBR','CBR','LED','USB','SD','IR','DORI','NDAA','TAA','MJPEG','H.264','H.265','IK10','ONVIF-S'];
const ACRO_MAP = new Map(ACRONYMS.map(a => [a.toLowerCase(), a]));

// Each probe: re finds suspicious text; make() shows the concrete before/after;
// rule() generalizes the finding into ONE reusable regex rule, and group()
// collapses every occurrence of that pattern into a single candidate — so a
// sheet full of "12MP / 512GB / 30fps" yields three unit rules, not thirty.
const UNIT_CASE = { KG:'kg', MM:'mm', CM:'cm', Sec:'sec', Min:'min', HZ:'Hz', Db:'dB', LUX:'lux', MS:'ms', FPS:'fps' };

const PROBES = [
  { kind: 'unit-space-generic', cat: '단위', note: '수치·단위 사이 공백',
    re: /\b(\d+(?:\.\d+)?)(mA|dB|ms|fps|Mbps|Kbps|GB|TB|MB|Hz|KHz|MHz|Mpx|MP|ft|in|sec|min|hr)\b/g,
    make: (m, n, u) => ({ before: m, after: n + ' ' + u }),
    group: () => 'all',
    rule: () => ({ find: '(\\d)(mA|dB|ms|fps|Mbps|Kbps|GB|TB|MB|Hz|KHz|MHz|Mpx|MP|ft|in|sec|min|hr)\\b', repl: '$1 $2', note: '수치·단위 사이 공백 (모든 단위)' }) },
  { kind: 'unit-case', cat: '단위', note: '단위 대소문자 표기',
    re: /\b(\d+(?:\.\d+)?)\s?(KG|MM|CM|Sec|Min|HZ|Db|LUX|MS|FPS)\b/g,
    make: (m, n, u) => ({ before: m, after: n + ' ' + UNIT_CASE[u] }),
    group: (m, n, u) => u,
    rule: (m, n, u) => ({ find: '(\\d)\\s?' + esc(u) + '\\b', repl: '$1 ' + UNIT_CASE[u], note: '단위 표기 통일 (' + u + ' → ' + UNIT_CASE[u] + ')' }) },
  { kind: 'acronym-case', cat: '표준', note: '약어 표준 대소문자',
    re: /\b[A-Za-z][A-Za-z0-9./-]{1,8}\b/g,
    make: (m) => { const c = ACRO_MAP.get(m.toLowerCase()); return (c && c !== m) ? { before: m, after: c } : null },
    group: (m) => m,
    rule: (m) => { const c = ACRO_MAP.get(m.toLowerCase());
      return { find: '\\b' + esc(m) + '\\b', repl: c, note: '약어 표준 표기 (' + m + ' → ' + c + ')' } } },
  { kind: 'paren-space', cat: '표기', note: '괄호 앞 공백',
    re: /[A-Za-z0-9](?=\()/g,
    make: (m) => ({ before: m + '(', after: m + ' (' }),
    group: () => 'all',
    rule: () => ({ find: '([A-Za-z0-9])\\(', repl: '$1 (', note: '여는 괄호 앞 공백 추가' }) },
  { kind: 'range-dash', cat: '표기', note: '범위 표기 통일 (~)',
    re: /(-?\d+(?:\.\d+)?)\s?(?:--|—|–)\s?(-?\d+(?:\.\d+)?)/g,
    make: (m, a, b) => ({ before: m, after: a + ' ~ ' + b }),
    group: () => 'all',
    rule: () => ({ find: '(-?\\d+(?:\\.\\d+)?)\\s?(?:--|—|–)\\s?(-?\\d+(?:\\.\\d+)?)', repl: '$1 ~ $2', note: '범위 표기 통일 (– → ~)' }) },
  { kind: 'temp-unit', cat: '단위', note: '온도 기호 표기 (°C)',
    re: /(\d)\s?(?:˚|º|∘)\s?([CF])\b/g,
    make: (m, n, u) => ({ before: m, after: n + '°' + u }),
    group: () => 'all',
    rule: () => ({ find: '(\\d)\\s?(?:˚|º|∘)\\s?([CF])\\b', repl: '$1°$2', note: '온도 기호 표준화 (°C / °F)' }) },
  { kind: 'temp-space', cat: '단위', note: '온도 단위 앞 공백 제거',
    re: /(\d)\s+°([CF])\b/g,
    make: (m, n, u) => ({ before: m, after: n + '°' + u }),
    group: () => 'all',
    rule: () => ({ find: '(\\d)\\s+°([CF])\\b', repl: '$1°$2', note: '온도 단위 앞 공백 제거' }) },
  { kind: 'dup-punct', cat: '표기', note: '중복·오배치 문장부호',
    re: /\.{2,}(?!\.)|\s+[;:,]|[!?]{2,}/g,
    make: (m) => ({ before: m, after: m.trim().replace(/([.;:,!?])\1+/g, '$1') }),
    group: (m) => m.trim().slice(0, 2),
    rule: (m) => ({ find: esc(m), repl: m.trim().replace(/([.;:,!?])\1+/g, '$1'), note: '중복·오배치 문장부호 정리', literal: true }) },
  { kind: 'smart-quote', cat: '표기', note: '곧은 인용부호로 통일',
    re: /[\u2018\u2019\u201C\u201D]/g,
    make: (m) => ({ before: m, after: /[\u2018\u2019]/.test(m) ? "'" : '"' }),
    group: (m) => (/[\u2018\u2019]/.test(m) ? 'single' : 'double'),
    rule: (m) => (/[\u2018\u2019]/.test(m)
      ? { find: '[\\u2018\\u2019]', repl: "'", note: '생따옴표 곧은 부호로 통일' }
      : { find: '[\\u201C\\u201D]', repl: '"', note: '썼따옴표 곧은 부호로 통일' }) },
  { kind: 'fullwidth', cat: '표기', note: '전각 문자 → 반각',
    re: /[\uFF01-\uFF5E\u3000]/g,
    make: (m) => ({ before: m, after: m === '\u3000' ? ' ' : String.fromCharCode(m.charCodeAt(0) - 0xFEE0) }),
    group: (m) => (m === '\u3000' ? 'space' : m),
    rule: (m) => ({ find: esc(m), repl: m === '\u3000' ? ' ' : String.fromCharCode(m.charCodeAt(0) - 0xFEE0), note: '전각 문자 → 반각 (' + m + ')', literal: true }) },
  { kind: 'x-symbol', cat: '단위', note: '곱 기호 표기 (×)', fieldRe: /dimension|치수|size|weight/i,
    re: /\d\s*[Xx]\s*\d/g,
    make: (m) => ({ before: m, after: m.replace(/\s*[Xx]\s*/, ' × ') }),
    group: () => 'all',
    rule: () => ({ find: '(\\d)\\s*[Xx]\\s*(\\d)', repl: '$1 × $2', note: '치수 곱 기호 표기 (×)', scope: 'dimension|치수|size|weight' }) },
  { kind: 'trailing-period', cat: '문법', note: '항목 끝 마침표 제거',
    re: /[a-z)\]]\.$/g,
    make: (m) => ({ before: m, after: m.slice(0, -1) }),
    group: () => 'all',
    rule: () => ({ find: '([a-z)\\]])\\.$', repl: '$1', note: '항목 끝 마침표 제거' }) },
  { kind: 'ko-leftover', cat: '표기', note: '한글 잔존 (영문 시트)',
    re: /[\uAC00-\uD7A3]+/g,
    make: (m) => ({ before: m, after: '' }),
    group: (m) => m,
    rule: (m) => ({ find: esc(m), repl: '', note: '한글 잔존 제거 (' + m + ')', literal: true }) },
];

// items: [{ field, section, value }] — pass POST-QC values.
// Returns pattern-level candidates: one entry per reusable rule, with the
// concrete matches it would fix as evidence.
export function scanCandidates(items, opts = {}) {
  const dismissed = new Set(opts.dismissed || []);
  const knownFinds = new Set((opts.customRules || []).map(r => String(r.find)));
  const bag = new Map();
  for (const it of items || []) {
    const val = it && it.value != null ? String(it.value) : '';
    if (!val) continue;
    const field = it.field || '';
    for (const p of PROBES) {
      if (p.fieldRe && !p.fieldRe.test(field)) continue;
      const re = new RegExp(p.re.source, p.re.flags);
      let m;
      while ((m = re.exec(val)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue }
        const sug = p.make(...m);
        if (!sug || sug.after === sug.before) continue;
        const rule = p.rule(...m);
        const key = p.kind + '\u0000' + p.group(...m);
        if (dismissed.has(key) || knownFinds.has(rule.find)) continue;
        const prev = bag.get(key);
        if (prev) {
          prev.count++;
          if (!prev.fields.includes(field) && prev.fields.length < 8) prev.fields.push(field);
          if (prev.examples.length < 4 && !prev.examples.some(e => e.before === sug.before)) prev.examples.push(sug);
        } else bag.set(key, {
          key, kind: p.kind, cat: p.cat, note: rule.note || p.note,
          find: rule.find, repl: rule.repl, regex: !rule.literal, scope: rule.scope || '',
          count: 1, fields: [field], examples: [sug],
          sample: val.length > 110 ? val.slice(0, 110) + '…' : val,
        });
      }
    }
  }
  return [...bag.values()].sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
}

// Rule catalog (for Settings display)
const BUILTIN_CATALOG = [
  ...[TYPO_RULE, ...RULES].map(r => ({ id: r.id, cat: r.cat, note: r.note })),
  { id: 'dim', cat: '단위', note: '치수 기호·단위 정리 (× / mm)' },
  { id: 'us-units', cat: '단위', note: '미국 규격 병기 — inch(mm) · lb(kg) · °F(°C)' },
  { id: 'dori', cat: '표준', note: 'DORI 명사형 통일 (IEC 62676-4)' },
  { id: 'trim', cat: '표기', note: '앞뒤 공백·탭 제거' },
];

// De-duplicated by id AND by visible note, so the Settings list never shows
// the same rule text twice.
function dedupe(list) {
  const ids = new Set(), notes = new Set(), out = [];
  for (const r of list) {
    const nk = r.cat + '\u0000' + r.note;
    if (ids.has(r.id) || notes.has(nk)) continue;
    ids.add(r.id); notes.add(nk); out.push(r);
  }
  return out;
}

export const RULE_CATALOG = dedupe(BUILTIN_CATALOG);
export function getCatalog() {
  return [
    ...RULE_CATALOG.map(r => ({ ...r, custom: false })),
    ...dedupe(CUSTOM.map(r => ({ id: r.id, cat: r.cat, note: r.note, custom: true }))),
  ];
}
