const { getOrderStatus } = require('../lib/phonepe');
const { setCorsHeaders } = require('../lib/cors');

/**
 * GET /api/order-status?order_id=<merchantOrderId>
 * Frontend calls this after PhonePe iframe callback to verify payment server-side.
 */
module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.json({ error: 'Method not allowed' });
  }

  const orderId = req.query?.order_id || new URL(req.url, 'http://localhost').searchParams.get('order_id');

  if (!orderId || typeof orderId !== 'string' || orderId.length < 4) {
    res.statusCode = 400;
    return res.json({ error: 'order_id required' });
  }

  try {
    const status = await getOrderStatus(orderId);

    res.statusCode = 200;
    return res.json({
      orderId: status.orderId,
      state: status.state,
      amount: status.amount,
    });
  } catch (e) {
    console.error('[order-status]', e);
    res.statusCode = 500;
    return res.json({ error: e.message || 'Failed to fetch order status' });
  }
};
