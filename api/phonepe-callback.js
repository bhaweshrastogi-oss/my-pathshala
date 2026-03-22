const { validateCallback } = require('../lib/phonepe');
const { readJsonBody } = require('../lib/readBody');

/**
 * PhonePe server-to-server webhook (configure URL in PhonePe Business dashboard).
 * Uses SDK's validateCallback for signature verification.
 *
 * Set PHONEPE_WEBHOOK_USERNAME and PHONEPE_WEBHOOK_PASSWORD in Vercel env vars
 * (these are the credentials you configure in PhonePe dashboard for callback auth).
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
    const username = process.env.PHONEPE_WEBHOOK_USERNAME;
    const password = process.env.PHONEPE_WEBHOOK_PASSWORD;
    const authorization = req.headers['authorization'] || '';

    const body = await readJsonBody(req);
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);

    if (username && password) {
      const callbackResponse = validateCallback(username, password, authorization, bodyString);
      const { type, payload } = callbackResponse;

      console.log('[phonepe-callback] verified event=%s orderId=%s state=%s amount=%s',
        type, payload.originalMerchantOrderId || payload.orderId, payload.state, payload.amount);

      // TODO: Update your database / trigger fulfilment based on payload.state
      // e.g. if type === 'CHECKOUT_ORDER_COMPLETED' → mark order as paid
    } else {
      console.warn('[phonepe-callback] PHONEPE_WEBHOOK_USERNAME/PASSWORD not set — skipping verification');
      console.log('[phonepe-callback] raw body:', bodyString.slice(0, 2000));
    }
  } catch (e) {
    console.error('[phonepe-callback] validation/parse error:', e.message || e);
  }

  res.statusCode = 200;
  return res.json({ received: true });
};
