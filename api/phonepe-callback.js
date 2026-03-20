const { readJsonBody } = require('../lib/readBody');

/**
 * PhonePe server-to-server webhook (configure URL in PhonePe Business dashboard).
 * Verify signature in production — see PhonePe webhook docs.
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  try {
    const body = await readJsonBody(req);
    console.log('[phonepe-callback]', JSON.stringify(body).slice(0, 2000));
  } catch (e) {
    console.error('[phonepe-callback] parse error', e);
  }

  res.statusCode = 200;
  return res.json({ received: true });
};
