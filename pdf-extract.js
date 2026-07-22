/**
 * pdf-extract.js — extract an AVYCON-format spec sheet PDF into the same
 * product structure the studio uses for Excel imports:
 *   { id, model, subtitle, subtitle2, series, overview, specs:[{section,name,value}] }
 *
 * Strategy: positional text extraction. AVYCON datasheets lay page 2+ out as a
 * two-column table — a left label column and a value column near x≈146. pdf.js
 * returns glyph runs with transforms, so we group runs into rows by y, then
 * split each row into label (x < VALX) and value (x ≥ VALX). All-caps single
 * items are category headers; value-only rows continue the previous field.
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

const SKIP = /^(AVYCON|www\.|Copyright|All the contents|identification letters|prohibited by|actual products|or contact|marketing@|In addition, graphical|SPECIFICATIONS|-- ?\d|Unit ?:|OVERVIEW|DIMENSIONS|Camera Dimension)/i;
const FOOTER = /avycon\.com|All rights reserved|marketing@|trademarks of AVYCON|unauthorized use|without notice/i;
const isCat = (s) => /^[A-Z][A-Z0-9 &/\-]{2,}$/.test(s) && !/[a-z]/.test(s);
const VALX = 140;

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

export async function extractPdf(arrayBuffer) {
  const pdfjs = await lib();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const product = { id: '', model: '', subtitle: '', subtitle2: '', series: 'DIVERSITY', overview: '', specs: [] };

  // ---- page 2..N : spec table ----
  for (let p = 2; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const H = page.getViewport({ scale: 1 }).height;
    const rows = rowsOf(await page.getTextContent(), H);
    let section = '';
    let last = null;
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
          // A continuation that starts a new "Label :" segment (e.g. "Sub Stream : …",
          // "Mobile Stream : …") is a new line in the source — keep it on its own line.
          if (/^[A-Za-z][\w .\/&()\-]{0,30}:\s/.test(value)) last.value += '\n' + value;
          else if (/,\s*$/.test(last.value)) last.value = last.value.replace(/\s*$/, '') + ' ' + value; // line already ends with a separator — don't add another
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

      // overview column items only
      const left = r.items.filter((i) => i.x < OVX);
      if (!left.length) continue;
      const hasBullet = left.some((i) => i.x < BULX && /^[•·]/.test(i.s));
      const text = left.filter((i) => !(i.x < BULX && /^[•·]$/.test(i.s.trim())))
        .map((i) => i.s.replace(/^[•·]\s*/, '')).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (/^(OVERVIEW|DIMENSIONS|Unit ?:|Camera Dimension)/i.test(text)) continue;
      if (/avycon\.com|All rights reserved|marketing@|trademarks of AVYCON/i.test(text)) continue;
      if (text === 'AVYCON' || text === product.model || text === product.subtitle) continue;
      if (hasBullet) bullets.push(text);
      else if (bullets.length) bullets[bullets.length - 1] += ' ' + text;   // wrapped continuation
    }
    // restore hyphens dropped by the PDF text layer in common cellular tokens
    const HY = [[/LTETDD/g, 'LTE-TDD'], [/LTEFDD/g, 'LTE-FDD'], [/TDSCDMA/g, 'TD-SCDMA'], [/\bWCDMA\b/g, 'WCDMA']];
    product.overview = bullets.map((b) => { let t = b; HY.forEach(([re, s]) => { t = t.replace(re, s); }); return '• ' + t; }).join('\n');
  } catch (e) { /* page 1 optional */ }

  product.id = product.model || 'PDF-IMPORT';
  // ---- detect certification badges from all extracted text ----
  const allText = [product.overview, product.subtitle, ...product.specs.map((s) => s.name + ' ' + s.value)].join(' \n ');
  // Only the 4 badge logos are used (NDAA · TAA · CE · FCC). They're drawn as images
  // in AVYCON datasheets (not extractable text) and appear on essentially every model,
  // so seed all four on by default.
  const certs = { ndaa: true, taa: true, ce: true, fcc: true };
  // AI badge: analytics-capable models carry an "AI" badge
  if (/\bAI\b/.test(allText) || /analytic|human & vehicle|smart feature|deep learning/i.test(allText)) certs.ai = true;
  product.certs = certs;
  if (!product.specs.length) throw new Error('스펙 표를 찾지 못했습니다. AVYCON 스펙시트 PDF인지 확인하세요.');
  return product;
}
