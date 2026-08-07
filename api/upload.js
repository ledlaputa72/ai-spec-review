// Serverless: upload an image to Vercel Blob and return its public https URL.
// The browser POSTs raw image bytes (Content-Type: image/...) to
//   POST /api/upload?filename=foo.webp
// so slot images live in Blob and the saved document/KV only carries small URLs
// (instead of multi-MB base64). Needs BLOB_READ_WRITE_TOKEN, which Vercel injects
// once a Public Blob store is connected to the project (Storage → Connect).
import { put } from '@vercel/blob';

// Raw binary body — don't let Vercel try to JSON/urlencode-parse the image bytes.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Blob store not configured (missing BLOB_READ_WRITE_TOKEN)', configured: false });
  }
  try {
    const raw = (req.query && req.query.filename) ? String(req.query.filename) : 'image';
    const safe = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'image';
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const buffer = await readRawBody(req);
    if (!buffer || !buffer.length) return res.status(400).json({ error: 'empty body' });
    const blob = await put('spec-sheet-images/' + safe, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });
    return res.status(200).json({ url: blob.url });
  } catch (e) {
    console.error('upload api error', e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
