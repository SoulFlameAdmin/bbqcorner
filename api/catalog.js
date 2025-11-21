// api/catalog.js
const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  try {
    const KEY = 'BBQ_MAIN_CATALOG';

    if (req.method === 'GET') {
      const data = await kv.get(KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data || {});
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid payload' });
      await kv.set(KEY, body);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await kv.del(KEY);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end('Method Not Allowed');
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
