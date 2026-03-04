// api/create-payment.js (Vercel Serverless Function)
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { amount, name, phone, email, course } = req.body;

  // PhonePe credentials (set as env variables in Vercel)
  const MERCHANT_ID     = process.env.PHONEPE_MERCHANT_ID;
  const CLIENT_ID       = process.env.PHONEPE_CLIENT_ID;
  const CLIENT_SECRET   = process.env.PHONEPE_CLIENT_SECRET;
  const REDIRECT_URL    = `${req.headers.origin}/payment-success.html`;

  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: `TXN_${Date.now()}`,
    amount: amount * 100, // in paise
    redirectUrl: REDIRECT_URL,
    redirectMode: 'REDIRECT',
    paymentInstrument: { type: 'NET_BANKING_REDIRECT' },
    mobileNumber: phone,
    merchantUserId: email,
  };

  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64 + '/pg/v1/pay' + CLIENT_SECRET)
    .digest('hex') + '###1';

  const response = await fetch('https://api.phonepe.com/apis/hermes/pg/v1/pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
    },
    body: JSON.stringify({ request: base64 }),
  });

  const data = await response.json();
  const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;

  if (redirectUrl) {
    res.status(200).json({ redirectUrl });
  } else {
    res.status(500).json({ error: 'Payment initiation failed' });
  }
};