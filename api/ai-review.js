// Serverless proxy to the Anthropic Messages API so "실시간 AI 심화 검수" works on
// the deployed site — window.claude only exists inside the Claude Design preview.
//
// Vercel setup (once): Project → Settings → Environment Variables → add
//   ANTHROPIC_API_KEY = sk-ant-...   (optionally ANTHROPIC_MODEL) → Redeploy.
//
// POST /api/ai-review  { prompt }  ->  { text }   (503 if the key isn't set)
const KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';

export default async function handler(req, res) {
  try {
    if (!KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured', configured: false });
    if (req.method === 'GET') return res.status(200).json({ ok: true, configured: true }); // health check
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }

    const prompt = String((req.body && req.body.prompt) || '').slice(0, 16000);
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ error: 'anthropic ' + r.status, detail: t.slice(0, 800) });
    }
    const j = await r.json();
    if (j.stop_reason === 'refusal') return res.status(200).json({ text: '', refused: true });
    const text = (j.content || []).filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
    return res.status(200).json({ text });
  } catch (e) {
    console.error('ai-review error', e);
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
