const crypto = require('crypto');
const orders = require('../lib/orders');
const { fulfilOrder } = require('../lib/fulfilOrder');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.statusCode = 405; return res.end(); }
  const expected = process.env.CRON_SECRET && `Bearer ${process.env.CRON_SECRET}`;
  const given = req.headers.authorization || '';
  const digest = s => crypto.createHash('sha256').update(s).digest();
  if (!expected || !crypto.timingSafeEqual(digest(expected), digest(given))) {
    res.statusCode = 401; return res.json({ error: 'Unauthorized' });
  }
  try {
    const ids = await orders.pendingOrders();
    let completed = 0, pending = 0;
    // Bound execution time and rotate failures so a bad order cannot starve the queue.
    for (const id of ids.slice(0, 10)) {
      try {
        const order = await orders.getOrder(id);
        if (!order) { await orders.finishOrder(id); continue; }
        const result = await fulfilOrder(id);
        if (result.sent) completed++; else { pending++; await orders.deferOrder(id); }
      } catch (e) { pending++; await orders.deferOrder(id); }
    }
    return res.json({ completed, pending });
  } catch (e) { res.statusCode = 503; return res.json({ error: 'Recovery unavailable' }); }
};
