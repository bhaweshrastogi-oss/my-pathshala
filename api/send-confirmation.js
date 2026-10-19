const { setCorsHeaders } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');
const { fulfilOrder } = require('../lib/fulfilOrder');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') { res.statusCode = 405; return res.json({ error: 'Method not allowed' }); }
  try {
    const { orderRef } = await readJsonBody(req);
    // Recipient, price and course always come from the saved checkout, never this request.
    const result = await fulfilOrder(orderRef);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[send-confirmation]', e.message);
    res.statusCode = e.statusCode || 503;
    return res.json({ error: 'Confirmation unavailable; please contact support with your order reference.' });
  }
};
