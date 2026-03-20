/**
 * PhonePe Payment Gateway — Standard Checkout (v2)
 * OAuth token + create payment. Used only from serverless / Node.
 *
 * Docs: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/
 */

const SANDBOX = {
  tokenUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
  payUrl: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
};

const PRODUCTION = {
  tokenUrl: 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token',
  payUrl: 'https://api.phonepe.com/apis/pg/checkout/v2/pay',
};

function endpoints() {
  const env = (process.env.PHONEPE_ENV || 'production').toLowerCase();
  return env === 'sandbox' ? SANDBOX : PRODUCTION;
}

async function getAccessToken() {
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION || '1';

  if (!clientId || !clientSecret) {
    throw new Error('Missing PHONEPE_CLIENT_ID or PHONEPE_CLIENT_SECRET');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_version: clientVersion,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });

  const { tokenUrl } = endpoints();
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`PhonePe token error (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok) {
    throw new Error(data.message || `PhonePe token error (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!data.access_token) {
    throw new Error('PhonePe token response missing access_token');
  }

  return data.access_token;
}

/**
 * @param {object} opts
 * @param {string} opts.merchantOrderId
 * @param {number} opts.amountPaise — amount in paise (₹1 = 100)
 * @param {string} opts.redirectUrl — full HTTPS URL after pay (success/fail)
 * @param {object} [opts.metaInfo] — optional udf1..udf15 for webhooks
 */
async function createCheckoutPayment({ merchantOrderId, amountPaise, redirectUrl, metaInfo }) {
  const token = await getAccessToken();
  const { payUrl } = endpoints();

  const res = await fetch(payUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `O-Bearer ${token}`,
    },
    body: JSON.stringify({
      merchantOrderId,
      amount: amountPaise,
      expireAfter: 1800,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: 'PMpathshala enrolment',
        merchantUrls: { redirectUrl },
      },
      metaInfo: metaInfo && Object.keys(metaInfo).length ? metaInfo : undefined,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`PhonePe pay error (${res.status}): ${text.slice(0, 500)}`);
  }

  if (!res.ok || !data.redirectUrl) {
    const msg = data.message || data.code || text.slice(0, 500);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(data));
  }

  return data;
}

module.exports = { getAccessToken, createCheckoutPayment, endpoints };
