const { createCheckoutPayment } = require('../lib/phonepe');
const { setCorsHeaders, isRedirectAllowed } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.json({ error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req).catch(() => ({}));

    const {
      amount,
      order_id: orderId,
      name,
      email,
      phone,
      course,
      redirect_url: redirectUrl,
    } = body;

    if (!orderId || typeof orderId !== 'string') {
      res.statusCode = 400;
      return res.json({ error: 'order_id required' });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 1) {
      res.statusCode = 400;
      return res.json({ error: 'amount must be a positive number (INR)' });
    }

    const amountPaise = Math.round(amountNum * 100);
    if (amountPaise < 100) {
      res.statusCode = 400;
      return res.json({ error: 'minimum amount is ₹1' });
    }

    if (!redirectUrl || !isRedirectAllowed(redirectUrl)) {
      res.statusCode = 400;
      return res.json({
        error:
          'redirect_url missing or origin not allowed. Set CORS_ORIGINS on Vercel to your website origins (e.g. https://pmpathshala.com). For local dev only, set PHONEPE_ALLOW_INSECURE_CORS=1.',
      });
    }

    const safeOrderId = String(orderId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 63);
    if (safeOrderId.length < 4) {
      res.statusCode = 400;
      return res.json({ error: 'order_id invalid after sanitization' });
    }

    const metaInfo = {
      udf1: String(name || '').slice(0, 256),
      udf2: String(email || '').slice(0, 256),
      udf3: String(phone || '').slice(0, 256),
      udf4: String(course || '').slice(0, 256),
    };

    const pp = await createCheckoutPayment({
      merchantOrderId: safeOrderId,
      amountPaise,
      redirectUrl,
      metaInfo,
    });

    res.statusCode = 200;
    return res.json({
      redirectUrl: pp.redirectUrl,
      orderId: pp.orderId,
      state: pp.state,
    });
  } catch (e) {
    console.error('[create-payment]', e);
    res.statusCode = 500;
    return res.json({
      error: e.message || 'Payment initiation failed',
    });
  }
};
