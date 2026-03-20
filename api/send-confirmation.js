const { setCorsHeaders } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');

/**
 * Optional: plug in Resend / SendGrid here using env vars.
 * Frontend treats failures as non-blocking.
 */
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
    await readJsonBody(req);
    // TODO: send student email when RESEND_API_KEY + FROM_EMAIL are set
    res.statusCode = 200;
    return res.json({ ok: true });
  } catch (e) {
    console.error('[send-confirmation]', e);
    res.statusCode = 200;
    return res.json({ ok: true });
  }
};
