/**
 * pdf-extract.js — extract a spec-sheet PDF into the same product structure the
 * studio uses for Excel imports:
 *   { id, model, subtitle, subtitle2, series, overview, specs:[{section,name,value}] }
 *
 * Two layouts are supported and auto-detected per page:
 *
 *  1) TABLE layout (manufacturer datasheets, e.g. TVT): a real 3-column grid —
 *     a left CATEGORY column (merged cells that span several rows), a FIELD
 *     column and a VALUE column, all separated by drawn cell borders. Text runs
 *     alone can't tell us the category (the label is vertically centered in a
 *     merged cell, so it doesn't line up with any single field row). Instead we
 *     read the vector cell borders (getOperatorList) to recover the category
 *     bands and the field rows, then assign every field to the category band
 *     that vertically contains it. This is what gives the "Original" output real
 *     category bars even when the source table structure is irregular.
 *
 *  2) POSITIONAL layout (already-made AVYCON spec sheets): a two-column
 *     label/value list with full-width gray category bars. Grouped by y into
 *     rows; all-caps single items are category headers; value-only rows continue
 *     the previous field. Used when a page has no 3-column grid.
 *
 * export async function extractPdf(arrayBuffer) -> product
 */
const PDF_VER = '4.0.379';
const CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDF_VER + '/build/';

let _pdfjs = null;
async function lib() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import(CDN + 'pdf.min.mjs');
  _pdfjs.GlobalWorkerOptions.workerSrc = CDN + 'pdf.worker.min.mjs';
  return _pdfjs;
}

const SKIP = /^(AVYCON|www\.|Copyright|All the contents|identification letters|prohibited by|actual products|or contact|marketing@|In addition, graphical|SPECIFICATIONS|Specifications|Features|-- ?\d|Unit ?:|OVERVIEW|DIMENSIONS|Camera Dimension)/i;
const FOOTER = /avycon\.com|All rights reserved|marketing@|trademarks of AVYCON|unauthorized use|without notice|en\.tvt\.net\.cn|\*All pictures/i;
const isCat = (s) => /^[A-Z][A-Z0-9 &/\-]{2,}$/.test(s) && !/[a-z]/.test(s);
const VALX = 140;

// group text runs into rows by y (positional / legacy layout)
function rowsOf(tc, H) {
  const items = tc.items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ s: it.str.replace(/\s+/g, ' ').trim(), x: Math.round(it.transform[4]), y: Math.round(H - it.transform[5]) }));
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [];
  let cur = null;
  for (const it of items) {
    if (!cur || Math.abs(it.y - cur.y) > 5) { cur = { y: it.y, items: [it] }; rows.push(cur); }
    else cur.items.push(it);
  }
  return rows;
}

// individual text runs with absolute coordinates (table layout)
function itemsOf(tc, H) {
  return tc.items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({ s: it.str.replace(/\s+/g, ' ').trim(), x: it.transform[4], y: H - it.transform[5] }));
}

// horizontal cell-border lines of a page, in top-left coordinates.
// Walks the operator list tracking the CTM so path points land in page space.
async function linesOf(page, H) {
  const OPS = _pdfjs.OPS;
  const ol = await page.getOperatorList();
  const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
  const ap = (m, x, y) => [m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5]];
  let ctm = [1, 0, 0, 1, 0, 0]; const st = []; const hl = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    const fn = ol.fnArray[i], a = ol.argsArray[i];
    if (fn === OPS.save) st.push(ctm.slice());
    else if (fn === OPS.restore) ctm = st.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = mul(ctm, a);
    else if (fn === OPS.constructPath) {
      const ops = a[0], args = a[1]; let k = 0, sub = [];
      for (const op of ops) {
        if (op === OPS.moveTo) sub = [[args[k++], args[k++]]];
        else if (op === OPS.lineTo) sub.push([args[k++], args[k++]]);
        else if (op === OPS.rectangle) { const x = args[k++], y = args[k++], w = args[k++], ht = args[k++]; sub = [[x, y], [x + w, y], [x + w, y + ht], [x, y + ht], [x, y]]; }
        for (let s = 1; s < sub.length; s++) {
          const p0 = ap(ctm, sub[s - 1][0], sub[s - 1][1]), p1 = ap(ctm, sub[s][0], sub[s][1]);
          if (Math.abs(p0[1] - p1[1]) < 0.8 && Math.abs(p0[0] - p1[0]) > 3)
            hl.push({ y: H - p0[1], x0: Math.min(p0[0], p1[0]), x1: Math.max(p0[0], p1[0]) });
        }
      }
    }
  }
  hl.sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const u = [];
  for (const l of hl) { const p = u[u.length - 1]; if (p && Math.abs(p.y - l.y) <= 1.2 && Math.abs(p.x0 - l.x0) <= 1.2 && Math.abs(p.x1 - l.x1) <= 1.2) continue; u.push(l); }
  return u;
}

// consecutive border y's → [top,bottom] bands
function bandsOf(ys) {
  const s = [...new Set(ys.map((y) => Math.round(y)))].sort((a, b) => a - b);
  const m = []; s.forEach((y) => { if (m.length && y - m[m.length - 1] <= 2) return; m.push(y); });
  const o = []; for (let i = 0; i < m.length - 1; i++) o.push([m[i], m[i + 1]]);
  return o;
}

// Reconstruct a 3-column category/field/value table from text + border lines.
// Returns specs[] with real sections, or null when the page isn't such a table.
function tableSpecs(items, lines) {
  if (!lines.length) return null;
  // column x-edges = frequent line endpoints (ignore page-frame artifacts)
  const xs = {};
  lines.forEach((l) => { xs[Math.round(l.x0)] = (xs[Math.round(l.x0)] || 0) + 1; xs[Math.round(l.x1)] = (xs[Math.round(l.x1)] || 0) + 1; });
  const edges = Object.keys(xs).map(Number).filter((x) => x >= 10 && xs[x] >= 5).sort((a, b) => a - b);
  const ce = []; edges.forEach((x) => { if (ce.length && x - ce[ce.length - 1] < 10) return; ce.push(x); });
  if (ce.length < 4) return null;                       // need at least 3 columns
  const catL = ce[0], catR = ce[1], valL = ce[2];
  const catBorders = lines.filter((l) => Math.abs(l.x0 - catL) < 12 && Math.abs(l.x1 - catR) < 16).map((l) => l.y);
  const rowBorders = lines.filter((l) => Math.abs(l.x0 - catR) < 12 && l.x1 > catR + 20).map((l) => l.y);
  const catBands = bandsOf(catBorders), rowBands = bandsOf(rowBorders);
  if (catBands.length < 2 || rowBands.length < 3) return null;
  const bandCenter = (b) => (b[0] + b[1]) / 2;
  const catName = (b) => items.filter((it) => it.x < catR - 4 && it.y > b[0] && it.y <= b[1])
    .sort((a, c) => a.y - c.y || a.x - c.x).map((it) => it.s).join(' ').replace(/\s+/g, ' ').trim();
  // precompute each category band's label; keep only non-empty for nearest-fallback
  const namedBands = catBands.map((b) => ({ b, c: bandCenter(b), name: catName(b) }));
  const named = namedBands.filter((x) => x.name);
  const specs = []; let lastSec = '';
  rowBands.forEach((rb) => {
    const toks = items.filter((it) => it.y > rb[0] && it.y <= rb[1]);
    const lab = toks.filter((it) => it.x >= catR - 4 && it.x < valL - 6).sort((a, b) => a.y - b.y || a.x - b.x);
    const vt = toks.filter((it) => it.x >= valL - 6).sort((a, b) => a.y - b.y || a.x - b.x);
    const name = lab.map((t) => t.s).join(' ').replace(/\s+/g, ' ').trim();
    // value tokens → text rows, joined (newline for a new "Label :" segment)
    const vr = []; let cur = null;
    vt.forEach((t) => { if (!cur || Math.abs(t.y - cur.y) > 5) { cur = { y: t.y, s: t.s }; vr.push(cur); } else cur.s += ' ' + t.s; });
    let value = '';
    vr.forEach((r, i) => { const s = r.s.replace(/\s+/g, ' ').trim();
      if (!i) value = s;
      else if (/^[A-Za-z][\w .\/&()\-]{0,30}:\s/.test(s)) value += '\n' + s;
      else if (/,\s*$/.test(value)) value += ' ' + s;
      else value += ', ' + s; });
    if (!name && !value) return;
    if (SKIP.test(name) || FOOTER.test(name) || FOOTER.test(value)) return;
    const c = bandCenter(rb);
    let sec = '';
    const own = namedBands.find((x) => c > x.b[0] + 0.5 && c <= x.b[1] + 0.5);
    if (own && own.name) sec = own.name;
    else if (named.length) { let best = null, bd = 1e9; named.forEach((x) => { const d = Math.abs(x.c - c); if (d < bd) { bd = d; best = x; } }); sec = best ? best.name : lastSec; }
    else sec = lastSec;
    if (sec) lastSec = sec;
    specs.push({ section: sec, name, value });
  });
  return specs.length ? specs : null;
}

export async function extractPdf(arrayBuffer) {
  const pdfjs = await lib();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const product = { id: '', model: '', subtitle: '', subtitle2: '', series: 'DIVERSITY', overview: '', specs: [] };

  // ---- pages 2..N : spec table (table layout preferred, positional fallback) ----
  let section = '';   // carried across pages for the positional fallback
  let last = null;
  for (let p = 2; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const H = page.getViewport({ scale: 1 }).height;
    const tc = await page.getTextContent();

    // try the drawn-grid table layout first
    let lines = [];
    try { lines = await linesOf(page, H); } catch (e) { lines = []; }
    const t = tableSpecs(itemsOf(tc, H), lines);
    if (t && t.length) {
      t.forEach((rec) => {
        if (/^AVC-[A-Z0-9\-]+$/.test(rec.name)) { product.model = product.model || rec.name; return; }
        product.specs.push(rec);
      });
      continue;   // this page handled as a table
    }

    // positional fallback (AVYCON 2-column sheet)
    const rows = rowsOf(tc, H);
    for (const r of rows) {
      const txt = r.items.map((i) => i.s).join(' ').trim();
      if (!txt || SKIP.test(txt) || FOOTER.test(txt)) continue;
      if (/^AVC-[A-Z0-9\-]+$/.test(txt)) { product.model = product.model || txt; continue; }
      const label = r.items.filter((i) => i.x < VALX).map((i) => i.s).join(' ').trim();
      const value = r.items.filter((i) => i.x >= VALX).map((i) => i.s).join(' ').trim();
      if (r.items.length === 1 && isCat(txt)) { section = txt; last = null; continue; }
      if (label && value) { const rec = { section, name: label, value }; product.specs.push(rec); last = rec; }
      else if (!label && value) {
        if (last) {
          if (/^[A-Za-z][\w .\/&()\-]{0,30}:\s/.test(value)) last.value += '\n' + value;
          else if (/,\s*$/.test(last.value)) last.value = last.value.replace(/\s*$/, '') + ' ' + value;
          else last.value += ', ' + value;
        }
      }
    }
  }

  // ---- page 1 : model / subtitle / overview (positional, left column) ----
  try {
    const page = await doc.getPage(1);
    const H = page.getViewport({ scale: 1 }).height;
    const rows = rowsOf(await page.getTextContent(), H);
    const OVX = 210;           // overview column is left of this x
    const BULX = 30;           // bullet marker sits near x≈24
    const bullets = [];
    for (const r of rows) {
      const line = r.items.map((i) => i.s).join(' ').trim();
      if (/^AVC-[A-Z0-9\-]+$/.test(line)) product.model = product.model || line;
      if (/(NETWORK CAMERA|BULLET|DOME|TURRET|FISHEYE|MULTI-SENSOR|CAMERA)$/i.test(line) && /\d/.test(line) && line.length < 74 && !/^AVC/.test(line))
        product.subtitle = product.subtitle || line;

      const left = r.items.filter((i) => i.x < OVX);
      if (!left.length) continue;
      const hasBullet = left.some((i) => i.x < BULX && /^[•·]/.test(i.s));
      const text = left.filter((i) => !(i.x < BULX && /^[•·]$/.test(i.s.trim())))
        .map((i) => i.s.replace(/^[•·]\s*/, '')).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (/^OPTIONAL ACCESSORIES/i.test(text)) break;
      if (/^(OVERVIEW|DIMENSIONS|Unit ?:|Camera Dimension)/i.test(text)) continue;
      if (/avycon\.com|All rights reserved|marketing@|trademarks of AVYCON/i.test(text)) continue;
      if (text === 'AVYCON' || text === product.model || text === product.subtitle) continue;
      if (hasBullet) bullets.push(text);
      else if (bullets.length) bullets[bullets.length - 1] += ' ' + text;   // wrapped continuation
    }
    const HY = [[/LTETDD/g, 'LTE-TDD'], [/LTEFDD/g, 'LTE-FDD'], [/TDSCDMA/g, 'TD-SCDMA'], [/\bWCDMA\b/g, 'WCDMA']];
    product.overview = bullets.map((b) => { let t = b; HY.forEach(([re, s]) => { t = t.replace(re, s); }); return '• ' + t; }).join('\n');
  } catch (e) { /* page 1 optional */ }

  product.id = product.model || 'PDF-IMPORT';
  // ---- detect certification badges from all extracted text ----
  const allText = [product.overview, product.subtitle, ...product.specs.map((s) => s.name + ' ' + s.value)].join(' \n ');
  const certs = { ndaa: true, taa: true, ce: true, fcc: true };
  if (/\bAI\b/.test(allText) || /analytic|human & vehicle|smart feature|deep learning/i.test(allText)) certs.ai = true;
  product.certs = certs;
  if (!product.specs.length) throw new Error('스펙 표를 찾지 못했습니다. 스펙시트 PDF인지 확인하세요.');
  return product;
}
