const crypto = require('crypto');
const { readJsonBody } = require('../lib/readBody');
const adminAuth = require('../lib/adminAuth');
const { makeOfferToken, normaliseEmail } = require('../lib/waitlist');
const { buildEmail, SEGMENTS } = require('../tools/waitlist-announcement');

/**
 * POST /api/admin-waitlist   (used only by /admin/waitlist.html)
 * Auth:   the pm_admin cookie from /api/admin-page (or x-admin-key header)
 * Body:   { action: 'link' | 'send', name, email, segment: 'waitlist' | 'quiz' }
 *
 *  link -> returns the personal ₹30,000 link for that email (nothing is sent)
 *  send -> emails that person their link via Resend (one person per call, so
 *          the page can loop and stay inside Vercel's function time limit)
 *
 * Fails closed: without ADMIN_KEY (16+ chars) and WAITLIST_SECRET set,
 * nothing works. Same-origin only — no CORS headers are added on purpose.
 */
const SITE_URL = (process.env.SITE_URL || 'https://pmpathshala.com').replace(/\/$/, '');
const SUPPORT_EMAIL = 'support@pmpathshala.com';

function sha(s) { return crypto.createHash('sha256').update(String(s)).digest(); }

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  if (!adminAuth.configured() || !process.env.WAITLIST_SECRET) {
    return send(res, 503, { error: 'Server not configured: set ADMIN_KEY (16+ characters) and WAITLIST_SECRET in Vercel, then redeploy.' });
  }
  const secret = process.env.WAITLIST_SECRET;
  // Signed-in browser session (cookie) or the key itself in a header.
  if (!adminAuth.hasValidSession(req) && !adminAuth.keyMatches(req.headers['x-admin-key'])) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return send(res, 401, { error: 'Not signed in.' });
  }

  try {
    const { action, name, email: rawEmail, segment } = await readJsonBody(req).catch(() => ({}));
    const email = normaliseEmail(rawEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: 'Invalid email.' });

    const link = `${SITE_URL}/?offer=${makeOfferToken(email, secret)}`;
    if (action === 'link') return send(res, 200, { email, link });

    if (action === 'send') {
      if (!Object.prototype.hasOwnProperty.call(SEGMENTS, segment)) return send(res, 400, { error: 'Choose who this list is: waitlist or quiz.' });
      if (!process.env.RESEND_API_KEY) return send(res, 503, { error: 'RESEND_API_KEY is not set in Vercel.' });
      const first = (String(name || '').trim().split(/\s+/)[0] || 'there').replace(/[<>\r\n]/g, '').slice(0, 60);
      const { html, text } = buildEmail({ firstName: first, link, segment });
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          // Key = this exact email content for this person. Pressing Send twice with the same
          // content within 24h is a no-op; a changed name/link/text (e.g. after a test send) is a new email.
          'Idempotency-Key': 'waitlist-announce-' + crypto.createHash('sha256').update(email + '\n' + html).digest('hex').slice(0, 40),
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || `PMpathshala <${SUPPORT_EMAIL}>`,
          to: [email], reply_to: SUPPORT_EMAIL, subject: SEGMENTS[segment].subject, html, text,
        }),
      });
      if (!r.ok) return send(res, 502, { error: `Resend ${r.status}: ${(await r.text()).slice(0, 300)}` });
      return send(res, 200, { email, link, sent: true });
    }
    return send(res, 400, { error: 'Unknown action.' });
  } catch (e) {
    console.error('[admin-waitlist]', e.message || e);
    return send(res, 500, { error: 'Server error.' });
  }
};
