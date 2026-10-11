const { setCorsHeaders } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');
const { getOrderStatus } = require('../lib/phonepe');
const { getCourse, COURSES } = require('../lib/courses');

const SUPPORT_EMAIL = 'support@pmpathshala.com';
// Hosted PNG of the site logo (email clients don't render SVG). Served from the site root: /logo-email.png
const LOGO_URL = 'https://pmpathshala.com/logo-email.png';
// Rendered width in px; height follows the image's own aspect ratio (no stretching/shrinking).
const LOGO_WIDTH = 180;
const DEFAULT_FROM = `PMpathshala <${SUPPORT_EMAIL}>`;

async function sendWithResend({ to, subject, html, text, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (!apiKey) {
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Same order => same key => Resend will not send a second copy if this
      // endpoint is called twice (retry, refresh, double-trigger). Keys are
      // remembered by Resend for 24 hours.
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: SUPPORT_EMAIL,
      subject,
      html,
      text,
    }),
  });

  const bodyText = await res.text();
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    data = { raw: bodyText };
  }

  if (!res.ok) {
    const err = new Error(data.message || `Resend ${res.status}`);
    err.data = data;
    throw err;
  }

  return { id: data.id };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRupees(paise) {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

/**
 * Builds the congratulatory enrolment email (HTML + plain-text fallback).
 * Table layout + inline CSS only, so it renders in Gmail, Outlook, Apple Mail.
 */
function buildEmail({ name, courseName, startsOn, schedule, amount, orderRef }) {
  const safe = {
    name: escapeHtml(name),
    course: escapeHtml(courseName),
    startsOn: escapeHtml(startsOn),
    schedule: escapeHtml(schedule),
    amount: escapeHtml(amount),
    orderRef: escapeHtml(orderRef),
  };

  const subject = `Congratulations ${name}, you're enrolled in ${courseName}!`;

  const row = (label, value, last) => `
                <tr>
                  <td style="padding:12px 0;${last ? '' : 'border-bottom:1px solid #e5e7f0;'}font-size:13px;color:#6b7280;width:38%;vertical-align:top;">${label}</td>
                  <td style="padding:12px 0;${last ? '' : 'border-bottom:1px solid #e5e7f0;'}font-size:14px;color:#111827;font-weight:600;vertical-align:top;">${value}</td>
                </tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${safe.course} — Enrolment confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f3f2fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f2fb;">Congratulations! Your seat in ${safe.course} is confirmed — classes start ${safe.startsOn}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f2fb;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td align="center" style="background:#ffffff;padding:22px 28px 18px;">
              <a href="https://pmpathshala.com" style="text-decoration:none;"><img src="${LOGO_URL}" width="${LOGO_WIDTH}" alt="PMpathshala" style="display:block;margin:0 auto;width:${LOGO_WIDTH}px;max-width:100%;height:auto;border:0;outline:none;font-size:22px;font-weight:700;color:#4f46e5;"></a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#4338ca;background-image:linear-gradient(135deg,#4338ca,#7c3aed);padding:30px 28px 30px;">
              <div style="font-size:44px;line-height:1.1;">🎉</div>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;color:#ffffff;font-weight:700;">Congratulations, ${safe.name}!</h1>
              <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#e0e7ff;">You&#8217;re officially enrolled.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 8px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#374151;">Your payment was successful and your seat in <strong style="color:#111827;">${safe.course}</strong> is confirmed. We&#8217;re delighted to have you in the cohort.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6d28d9;text-transform:uppercase;">Classes start</div>
                    <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;">${safe.startsOn}</div>
                    <div style="font-size:14px;color:#4b5563;margin-top:4px;">${safe.schedule}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">Your enrolment details</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${row('Course', safe.course)}${row('Amount paid', safe.amount)}${row('Order reference', safe.orderRef, true)}
              </table>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">Please keep this email for your records.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 32px 30px;">
              <a href="mailto:${SUPPORT_EMAIL}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;">Questions? Write to us</a>
              <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">or reply to this email &middot; <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#f9fafb;padding:20px 28px;border-top:1px solid #eceef5;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">You&#8217;re receiving this because you enrolled at pmpathshala.com.<br>&copy; 2026 PMpathshala &middot; Made with &#10084;&#65039; in India</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Congratulations, ${name}!`,
    '',
    `Your payment was successful and your seat in ${courseName} is confirmed.`,
    '',
    `Classes start: ${startsOn}`,
    `Schedule: ${schedule}`,
    '',
    `Course: ${courseName}`,
    `Amount paid: ${amount}`,
    `Order reference: ${orderRef}`,
    '',
    'Please keep this email for your records.',
    '',
    `Questions? Reply to this email or write to ${SUPPORT_EMAIL}`,
    '',
    '— PMpathshala',
  ].join('\n');

  return { subject, html, text };
}

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
    const body = await readJsonBody(req);
    const { name, email, orderRef } = body;
    // Prefer course_key; fall back to matching the course name so a browser
    // still running an older cached enroll.js keeps working.
    const courseKey = body.course_key ||
      Object.keys(COURSES).find((k) => COURSES[k].name === body.course);

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      res.statusCode = 400;
      return res.json({ error: 'valid email required' });
    }

    if (!orderRef || typeof orderRef !== 'string') {
      res.statusCode = 400;
      return res.json({ error: 'orderRef required' });
    }

    // Course name, dates and price come from the server-side registry
    // (lib/courses.js) — never from the browser.
    const courseInfo = getCourse(courseKey);
    if (!courseInfo) {
      res.statusCode = 400;
      return res.json({ error: 'Unknown or missing course_key' });
    }

    // SECURITY: this endpoint is publicly reachable, so it must never send
    // a "payment confirmed" email on the strength of client-supplied data
    // alone. Verify the order actually completed with PhonePe first.
    // Fail closed on any doubt — skip sending rather than risk a fake
    // confirmation.
    try {
      const status = await getOrderStatus(orderRef);
      if (!status || status.state !== 'COMPLETED') {
        console.warn('[send-confirmation] order not completed, skipping email:', orderRef, status && status.state);
        res.statusCode = 200;
        return res.json({ ok: true, skipped: true, reason: 'order not completed' });
      }
      // The amount PhonePe collected must match this course's price, so a
      // completed order for one course can't trigger another course's email.
      if (typeof status.amount === 'number' && status.amount !== courseInfo.amountPaise) {
        console.warn('[send-confirmation] amount mismatch, skipping email:', orderRef, status.amount, courseInfo.amountPaise);
        res.statusCode = 200;
        return res.json({ ok: true, skipped: true, reason: 'amount mismatch' });
      }
    } catch (e) {
      console.error('[send-confirmation] order verification failed:', e.message || e);
      res.statusCode = 200;
      return res.json({ ok: true, skipped: true, reason: 'order verification failed' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[send-confirmation] RESEND_API_KEY not set — student email skipped');
      res.statusCode = 200;
      return res.json({ ok: true, skipped: true });
    }

    const safeName = String(name || 'there').replace(/[\r\n<>]+/g, ' ').trim().slice(0, 100) || 'there';
    const { subject, html, text } = buildEmail({
      name: safeName,
      courseName: courseInfo.name,
      startsOn: courseInfo.startsOn || 'Date will be shared by Bhawesh',
      schedule: courseInfo.schedule || 'Schedule will be shared by Bhawesh',
      amount: formatRupees(courseInfo.amountPaise),
      orderRef: String(orderRef).slice(0, 80),
    });

    await sendWithResend({
      to: email.trim(),
      subject,
      html,
      text,
      idempotencyKey: `enrol-confirm-${String(orderRef).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100)}`,
    });

    res.statusCode = 200;
    return res.json({ ok: true, sent: true });
  } catch (e) {
    console.error('[send-confirmation]', e.message || e, e.data || '');
    res.statusCode = 200;
    return res.json({ ok: true, error: e.message || 'send failed' });
  }
};

module.exports.buildEmail = buildEmail;
