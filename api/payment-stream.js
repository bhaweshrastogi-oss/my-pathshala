/**
 * GET /api/payment-stream?order_id=<merchantOrderId>
 *
 * Server-Sent Events endpoint. Polls PhonePe's order status every 3 s and
 * pushes one event to the browser as soon as the order is COMPLETED or FAILED.
 * No database needed — all state lives in PhonePe's servers.
 */
const { getOrderStatus } = require('../lib/phonepe');
const { setCorsHeaders } = require('../lib/cors');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end();
  }

  const orderId =
    req.query?.order_id ||
    new URL(req.url, 'http://localhost').searchParams.get('order_id');

  if (!orderId || orderId.length < 4) {
    res.statusCode = 400;
    return res.end();
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering on some hosts
  res.statusCode = 200;

  function send(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  send({ status: 'watching' });

  let done       = false;
  let attempts   = 0;
  const MAX      = 25;   // 25 × 3 s = 75 s max window
  const INTERVAL = 3000;

  function finish() {
    done = true;
    try { res.end(); } catch (_) {}
  }

  req.on('close', () => { done = true; });

  async function poll() {
    if (done) return;
    attempts++;

    try {
      const status = await getOrderStatus(orderId);

      if (status.state === 'COMPLETED') {
        send({ status: 'completed', orderId });
        return finish();
      }

      if (status.state === 'FAILED') {
        send({ status: 'failed', orderId });
        return finish();
      }
    } catch (_) {
      // PhonePe API error — keep trying
    }

    if (attempts >= MAX) {
      send({ status: 'timeout' });
      return finish();
    }

    setTimeout(poll, INTERVAL);
  }

  // First check after 2 s (let PhonePe settle the order)
  setTimeout(poll, 2000);
};
