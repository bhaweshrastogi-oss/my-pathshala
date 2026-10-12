/**
 * Admin sign-in for the private waitlist tool. No database: a session cookie
 * is an expiry time plus an HMAC of it made with ADMIN_KEY, so it cannot be
 * forged without the key and stops working when ADMIN_KEY is changed.
 */
const crypto = require('crypto');

const COOKIE = 'pm_admin';
const MAX_AGE_SECONDS = 8 * 60 * 60;

function sha(s) { return crypto.createHash('sha256').update(String(s)).digest(); }
function configured() { const k = process.env.ADMIN_KEY; return !!(k && k.length >= 16); }
function keyMatches(given) { return configured() && crypto.timingSafeEqual(sha(given || ''), sha(process.env.ADMIN_KEY)); }

function sign(exp) {
  return crypto.createHmac('sha256', process.env.ADMIN_KEY).update('admin-session:' + exp).digest('base64url');
}
function makeCookie() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}
function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
function hasValidSession(req) {
  if (!configured()) return false;
  const m = String(req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!m) return false;
  const [exp, sig] = m.slice(COOKIE.length + 1).split('.');
  if (!/^\d+$/.test(exp || '') || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig); const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { configured, keyMatches, makeCookie, clearCookie, hasValidSession };
