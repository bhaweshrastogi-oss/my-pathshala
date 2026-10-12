/**
 * Per-person waitlist offer codes — no database needed.
 *
 * A code is an HMAC of the person's (lower-cased) email, signed with the
 * WAITLIST_SECRET env var. It can only be created by someone who knows the
 * secret (tools/waitlist-announcement.js) and it only validates for the
 * email it was made for, so a forwarded link does not work for a different
 * email address.
 *
 * The amount is NEVER taken from the browser: api/create-payment.js and
 * api/send-confirmation.js call resolveAmountPaise() below.
 */
const crypto = require('crypto');

function normaliseEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function makeOfferToken(email, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update('waitlist-offer:' + normaliseEmail(email))
    .digest('base64url')
    .slice(0, 22);
}

function isValidOfferToken(email, token) {
  const secret = process.env.WAITLIST_SECRET;
  if (!secret || !token || typeof token !== 'string' || !normaliseEmail(email)) return false;
  const expected = Buffer.from(makeOfferToken(email, secret));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/**
 * @returns {{ amountPaise:number, offer:string|null }}
 * With a valid token for this email and a course that has a waitlist price,
 * returns the waitlist price. With no token, returns the public price.
 * Throws if a token is supplied but invalid (we never silently change price).
 */
function resolveAmountPaise(courseInfo, email, token) {
  if (!token) return { amountPaise: courseInfo.amountPaise, offer: null };
  if (!courseInfo.waitlistAmountPaise || !isValidOfferToken(email, token)) {
    const err = new Error('Invalid or mismatched waitlist offer code');
    err.code = 'BAD_OFFER';
    throw err;
  }
  return { amountPaise: courseInfo.waitlistAmountPaise, offer: 'waitlist' };
}

module.exports = { normaliseEmail, makeOfferToken, isValidOfferToken, resolveAmountPaise };
