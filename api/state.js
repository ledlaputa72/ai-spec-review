// Shared work-state API for AVYCON Spec Sheet Studio.
// Team-shared persistence: the last-saved working document per product model,
// a work-list index, and a history log — all in Vercel KV (Upstash Redis),
// so any user/device loads the state whoever saved last.
//
// Vercel setup (once): Storage → create/connect a KV (Upstash Redis) store to
// this project. That injects KV_REST_API_URL / KV_REST_API_TOKEN. Redeploy.
//
// Endpoints:
//   GET  /api/state?action=ping                 -> {ok, configured}
//   GET  /api/state?action=list                 -> {items:[{model,title,step,at,by}]}
//   GET  /api/state?action=load&model=AVC-...    -> {doc}          (null if none)
//   GET  /api/state?action=history&limit=100     -> {events:[...]}
//   POST /api/state  {action:'save', model, doc, title, step, by} -> {ok, at}
//   POST /api/state  {action:'delete', model}                     -> {ok}
import { Redis } from '@upstash/redis';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN_ = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const redis = (URL_ && TOKEN_) ? new Redis({ url: URL_, token: TOKEN_ }) : null;

const DOC = (model) => `sss:doc:${model}`;
const INDEX = 'sss:index';       // hash: model -> {model,title,step,at,by}
const HISTORY = 'sss:history';   // list: JSON events, newest first, capped
const HISTORY_MAX = 500;

const j = (res, code, body) => res.status(code).json(body);

export default async function handler(req, res) {
  try {
    if (!redis) return j(res, 503, { error: 'KV not configured', configured: false });

    const q = req.query || {};
    const action = String((req.method === 'POST' ? (req.body && req.body.action) : q.action) || '');

    if (req.method === 'GET') {
      if (action === 'ping') return j(res, 200, { ok: true, configured: true });
      if (action === 'list') {
        const idx = await redis.hgetall(INDEX);
        const items = idx ? Object.values(idx) : [];
        items.sort((a, b) => (b && b.at || 0) - (a && a.at || 0));
        return j(res, 200, { items });
      }
      if (action === 'load') {
        const model = String(q.model || '');
        if (!model) return j(res, 400, { error: 'model required' });
        const doc = await redis.get(DOC(model));
        return j(res, 200, { doc: doc || null });
      }
      if (action === 'history') {
        const limit = Math.min(500, Math.max(1, parseInt(q.limit, 10) || 100));
        const raw = await redis.lrange(HISTORY, 0, limit - 1);
        const events = (raw || []).map((x) => (typeof x === 'string' ? safeParse(x) : x)).filter(Boolean);
        return j(res, 200, { events });
      }
      return j(res, 400, { error: 'unknown action' });
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (action === 'save') {
        const model = String(b.model || '').trim();
        if (!model || !b.doc) return j(res, 400, { error: 'model & doc required' });
        const at = Date.now();
        const title = String(b.title || '');
        const step = Number(b.step) || 1;
        const by = String(b.by || '').slice(0, 60);
        await redis.set(DOC(model), b.doc);
        await redis.hset(INDEX, { [model]: { model, title, step, at, by } });
        await redis.lpush(HISTORY, JSON.stringify({ at, model, title, step, by, action: 'save' }));
        await redis.ltrim(HISTORY, 0, HISTORY_MAX - 1);
        return j(res, 200, { ok: true, at });
      }
      if (action === 'delete') {
        const model = String(b.model || '').trim();
        if (!model) return j(res, 400, { error: 'model required' });
        const at = Date.now();
        await redis.del(DOC(model));
        await redis.hdel(INDEX, model);
        await redis.lpush(HISTORY, JSON.stringify({ at, model, by: String(b.by || '').slice(0, 60), action: 'delete' }));
        await redis.ltrim(HISTORY, 0, HISTORY_MAX - 1);
        return j(res, 200, { ok: true });
      }
      return j(res, 400, { error: 'unknown action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return j(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error('state api error', e);
    return j(res, 500, { error: String((e && e.message) || e) });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }
