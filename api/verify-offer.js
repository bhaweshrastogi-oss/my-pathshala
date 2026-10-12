const { setCorsHeaders } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');
const { getCourse } = require('../lib/courses');
const { isValidOfferToken } = require('../lib/waitlist');

/**
 * POST /api/verify-offer  { email, offer_token, course_key }
 * Tells the browser whether this waitlist link is valid for this email, so
 * the payment page can show the waitlist price. The real charge is decided
 * again, server-side, in create-payment.
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
    const { email, offer_token: token, course_key: courseKey } = await readJsonBody(req).catch(() => ({}));
    const course = getCourse(courseKey);
    const valid = !!(course && course.waitlistAmountPaise && isValidOfferToken(email, token));
    res.statusCode = 200;
    return res.json(valid ? { valid: true, amountPaise: course.waitlistAmountPaise } : { valid: false });
  } catch (e) {
    console.error('[verify-offer]', e.message || e);
    res.statusCode = 200;
    return res.json({ valid: false });
  }
};
