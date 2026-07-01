/**
 * <vector-slot> — drop target for crisp dimension drawings.
 *
 * Unlike <image-slot> (which re-encodes to a capped-size WebP raster), this
 * keeps vector quality:
 *   • SVG  → embedded as a vector data-URL (true vector, scales/prints crisp)
 *   • PDF  → first page rendered with pdf.js at high DPI (sharp raster)
 *   • PNG/JPEG/WebP/AVIF → kept full-resolution (no down-scaling)
 *
 * The dropped file persists in localStorage under the element's id, so it
 * survives reloads and shows in every <vector-slot> with the same id.
 *
 * Attributes:
 *   id           persistence key (required for the drop to survive reload)
 *   placeholder  empty-state caption
 *
 * Size/shape come from ordinary CSS on the element.
 */
(function () {
  if (customElements.get('vector-slot')) return;
  const KEY = (id) => 'omvec:' + id;
  const PDF_VER = '3.11.174';

  async function fileToDataUrl(file) {
    return await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function svgToVectorUrl(file) {
    const text = await file.text();
    // Embed as an <img>-safe vector data URL (no script execution).
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(text)));
  }

  async function pdfToImageUrl(file) {
    const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDF_VER + '/build/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDF_VER + '/build/pdf.worker.min.mjs';
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const page = await doc.getPage(1);
    let scale = 3;
    let vp = page.getViewport({ scale });
    const MAX = 2200;
    if (Math.max(vp.width, vp.height) > MAX) {
      scale = scale * MAX / Math.max(vp.width, vp.height);
      vp = page.getViewport({ scale });
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas.toDataURL('image/png');
  }

  class VectorSlot extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = this.style.display || 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.style.cursor = 'pointer';
      this.style.boxSizing = 'border-box';
      this._renderEmpty();
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((t) => this.addEventListener(t, this));
      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-act]')) return;
        this._pick();
      });
      this._depth = 0;
      this._restore();
    }

    _box(inner, dashed) {
      this.innerHTML =
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'border:' + (dashed ? '1.5px dashed #b9bfca' : '1px solid transparent') + ';border-radius:6px;' +
        'background:' + (dashed ? '#fafbfc' : 'transparent') + ';box-sizing:border-box;">' + inner + '</div>';
    }

    _renderEmpty() {
      const ph = this.getAttribute('placeholder') || '치수 도면 (SVG · PDF · 이미지)';
      this._box(
        '<div style="text-align:center;color:#9aa0aa;font:600 11px/1.4 Pretendard,sans-serif;padding:6px;">' +
        '<div style="font-size:18px;margin-bottom:4px;">⬚</div>' + ph +
        '<div style="font-size:9px;font-weight:500;color:#b6bcc6;margin-top:3px;">끌어다 놓거나 클릭 · <b>SVG 권장</b></div></div>',
        true
      );
    }

    _renderBusy() {
      this._box('<div style="color:#9aa0aa;font:600 11px Pretendard,sans-serif;">변환 중…</div>', true);
    }

    _renderError(msg) {
      this._box('<div style="color:#c0564f;font:600 10.5px/1.4 Pretendard,sans-serif;text-align:center;padding:8px;">' + msg + '</div>', true);
      setTimeout(() => { if (!this._data) this._renderEmpty(); }, 2600);
    }

    _renderImage(url) {
      this.innerHTML =
        '<img src="' + url + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" alt="dimension"/>' +
        '<button data-act="clear" title="제거" style="position:absolute;top:4px;right:4px;width:20px;height:20px;border:none;' +
        'border-radius:5px;background:rgba(20,30,50,.55);color:#fff;font-size:13px;line-height:1;cursor:pointer;opacity:0;transition:.15s;">×</button>';
      const btn = this.querySelector('[data-act="clear"]');
      this.onmouseenter = () => { btn.style.opacity = '1'; };
      this.onmouseleave = () => { btn.style.opacity = '0'; };
      btn.addEventListener('click', (e) => { e.stopPropagation(); this._clear(); });
    }

    _pick() {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/svg+xml,image/png,image/jpeg,image/webp,image/avif,application/pdf,.svg,.pdf';
      inp.onchange = () => { if (inp.files && inp.files[0]) this._ingest(inp.files[0]); };
      inp.click();
    }

    async _ingest(file) {
      try {
        const name = (file.name || '').toLowerCase();
        const isSvg = file.type === 'image/svg+xml' || name.endsWith('.svg');
        const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
        if (isPdf) this._renderBusy();
        let url;
        if (isSvg) url = await svgToVectorUrl(file);
        else if (isPdf) url = await pdfToImageUrl(file);
        else if (/^image\//.test(file.type)) url = await fileToDataUrl(file);
        else { this._renderError('SVG · PDF · 이미지 파일만 가능합니다.'); return; }
        this._data = url;
        this._renderImage(url);
        this._save(url);
      } catch (err) {
        console.error('vector-slot ingest failed', err);
        this._renderError('파일을 불러오지 못했습니다.');
      }
    }

    _clear() {
      this._data = null;
      try { localStorage.removeItem(KEY(this.id)); } catch (e) {}
      this._renderEmpty();
    }

    _save(url) {
      if (!this.id) return;
      try { localStorage.setItem(KEY(this.id), url); }
      catch (e) { console.warn('vector-slot: could not persist (storage full?)', e); }
    }

    _restore() {
      if (!this.id) return;
      let v = null;
      try { v = localStorage.getItem(KEY(this.id)); } catch (e) {}
      if (v) { this._data = v; this._renderImage(v); }
    }

    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        e.preventDefault(); e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.style.outline = '2px solid #8a1a2e';
      } else if (e.type === 'dragleave') {
        if (--this._depth <= 0) { this._depth = 0; this.style.outline = 'none'; }
      } else if (e.type === 'drop') {
        e.preventDefault(); e.stopPropagation();
        this._depth = 0; this.style.outline = 'none';
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
  }
  customElements.define('vector-slot', VectorSlot);
})();
