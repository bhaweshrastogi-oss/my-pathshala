/**
 * PhonePe Payment Gateway — Official SDK Integration
 * Uses @phonepe-pg/pg-sdk-node StandardCheckoutClient.
 *
 * Docs: https://developer.phonepe.com/payment-gateway/backend-sdk/nodejs-be-sdk/
 */

const {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  MetaInfo,
  Env,
} = require('@phonepe-pg/pg-sdk-node');

let _client = null;

/**
 * Lazy-initialised singleton — credentials are read from env vars once.
 */
function getClient() {
  if (_client) return _client;

  const clientId     = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION || 1);

  if (!clientId || !clientSecret) {
    throw new Error('Missing PHONEPE_CLIENT_ID or PHONEPE_CLIENT_SECRET');
  }

  const env =
    (process.env.PHONEPE_ENV || 'production').toLowerCase() === 'sandbox'
      ? Env.SANDBOX
      : Env.PRODUCTION;

  _client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);
  return _client;
}

/**
 * Create a Standard Checkout payment via the SDK.
 *
 * @param {object} opts
 * @param {string} opts.merchantOrderId
 * @param {number} opts.amountPaise — amount in paise (₹1 = 100)
 * @param {string} opts.redirectUrl — full HTTPS URL after pay
 * @param {object} [opts.metaInfo]  — { udf1..udf5 }
 * @returns {Promise<{ redirectUrl: string, orderId: string, state: string, expireAt: string }>}
 */
async function createCheckoutPayment({ merchantOrderId, amountPaise, redirectUrl, metaInfo: metaObj }) {
  const client = getClient();

  const metaBuilder = MetaInfo.builder();
  if (metaObj) {
    if (metaObj.udf1) metaBuilder.udf1(metaObj.udf1);
    if (metaObj.udf2) metaBuilder.udf2(metaObj.udf2);
    if (metaObj.udf3) metaBuilder.udf3(metaObj.udf3);
    if (metaObj.udf4) metaBuilder.udf4(metaObj.udf4);
    if (metaObj.udf5) metaBuilder.udf5(metaObj.udf5);
  }

  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantOrderId)
    .amount(amountPaise)
    .redirectUrl(redirectUrl)
    .expireAfter(1800)
    .metaInfo(metaBuilder.build())
    .build();

  const response = await client.pay(request);
  return response;
}

/**
 * Check payment status using the SDK.
 */
async function getOrderStatus(merchantOrderId) {
  const client = getClient();
  return client.getOrderStatus(merchantOrderId);
}

/**
 * Validate a PhonePe webhook callback using the SDK.
 * Returns the parsed CallbackResponse with .type and .payload.
 */
function validateCallback(username, password, authorization, responseBody) {
  const client = getClient();
  return client.validateCallback(username, password, authorization, responseBody);
}

module.exports = { getClient, createCheckoutPayment, getOrderStatus, validateCallback };
