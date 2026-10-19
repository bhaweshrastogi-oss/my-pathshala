const { validateCallback } = require('../lib/phonepe');
const { readJsonBody } = require('../lib/readBody');
const { fulfilOrder } = require('../lib/fulfilOrder');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
  const username = process.env.PHONEPE_WEBHOOK_USERNAME;
  const password = process.env.PHONEPE_WEBHOOK_PASSWORD;
  if (!username || !password) { res.statusCode = 503; return res.json({ error: 'Webhook not configured' }); }
  let event;
  try {
    const body = await readJsonBody(req);
    event = validateCallback(username, password, req.headers.authorization || '', JSON.stringify(body));
  } catch (e) {
    res.statusCode = 401;
    return res.json({ error: 'Invalid callback' });
  }
  // Refund events must never trigger enrolment. SDK checkout callbacks carry merchantOrderId.
  if (!event.payload || event.payload.state !== 'COMPLETED' || event.payload.refundId || event.payload.merchantRefundId) {
    return res.json({ received: true });
  }
  const id = event.payload.merchantOrderId;
  if (!id) { res.statusCode = 400; return res.json({ error: 'Missing merchant order identifier' }); }
  try {
    // Re-query PhonePe; a callback payload is never used as the price/recipient source.
    const result = await fulfilOrder(id);
    if (result.state !== 'COMPLETED') { res.statusCode = 503; return res.json({ error: 'Payment status pending' }); }
    return res.json({ received: true });
  } catch (e) {
    console.error('[phonepe-callback]', e.message);
    res.statusCode = 503; // Ask the provider to retry; recovery job also tracks this order.
    return res.json({ error: 'Payment processing pending' });
  }
};
