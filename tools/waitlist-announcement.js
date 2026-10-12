#!/usr/bin/env node
/**
 * PMpathshala — AI PM waitlist announcement
 *
 * Builds one personalised email per waitlist member, each with a personal
 * ₹30,000 enrol link (?offer=<code>) that only works for that person's email.
 *
 *   DRY RUN (default, sends nothing — writes previews + links.csv):
 *     WAITLIST_SECRET=xxxx node tools/waitlist-announcement.js waitlist.csv
 *
 *   SEND (via Resend):
 *     WAITLIST_SECRET=xxxx RESEND_API_KEY=re_xxx node tools/waitlist-announcement.js waitlist.csv --send
 *
 * waitlist.csv: header row `name,email` then one person per line.
 * WAITLIST_SECRET must be EXACTLY the same value as the WAITLIST_SECRET env
 * var set in Vercel, otherwise the links will be rejected at payment.
 *
 * Optional env: RESEND_FROM (default "PMpathshala <support@pmpathshala.com>"),
 *               SITE_URL   (default https://pmpathshala.com)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { makeOfferToken, normaliseEmail } = require('../lib/waitlist');

const SITE_URL = (process.env.SITE_URL || 'https://pmpathshala.com').replace(/\/$/, '');
const LOGO_URL = `${SITE_URL}/logo-email.png`;
const LOGO_WIDTH = 180;
const SUPPORT_EMAIL = 'support@pmpathshala.com';
const FROM = process.env.RESEND_FROM || `PMpathshala <${SUPPORT_EMAIL}>`;
const SUBJECT = "You're first in: AI PM enrolment is open — your ₹30,000 waitlist price inside";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmail({ firstName, link }) {
  const name = esc(firstName);
  const url = esc(link);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>AI Product Manager cohort — enrolment is open</title>
</head>
<body style="margin:0;padding:0;background:#f3f2fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f2fb;">Enrolment for the AI Product Manager cohort is open — and you get it first, at your waitlist price of ₹30,000. Only 30 seats.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f2fb;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td align="center" style="background:#ffffff;padding:22px 28px 18px;">
              <a href="${SITE_URL}" style="text-decoration:none;"><img src="${LOGO_URL}" width="${LOGO_WIDTH}" alt="PMpathshala" style="display:block;margin:0 auto;width:${LOGO_WIDTH}px;max-width:100%;height:auto;border:0;outline:none;font-size:22px;font-weight:700;color:#4f46e5;"></a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#4338ca;background-image:linear-gradient(135deg,#4338ca,#7c3aed);padding:32px 28px 32px;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);color:#e0e7ff;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">Waitlist members first</div>
              <h1 style="margin:16px 0 0;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;">Enrolment is now open for the AI Product Manager cohort</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 6px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#111827;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">You joined the waitlist for our AI Product Manager flagship, so you&#8217;re hearing this before anyone else. Enrolment is open now for an exclusive, limited-seat cohort &mdash; <strong style="color:#111827;">only 30 seats</strong>.</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">As a waitlist member, you get a price that isn&#8217;t available on the website.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:22px 20px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6d28d9;text-transform:uppercase;">Your waitlist price</div>
                    <div style="font-size:40px;line-height:1.15;font-weight:800;color:#111827;margin-top:6px;">&#8377;30,000</div>
                    <div style="font-size:14px;color:#6b7280;margin-top:4px;">Public price: <span style="text-decoration:line-through;">&#8377;40,000</span></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 4px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">Cohort details</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e7f0;font-size:13px;color:#6b7280;width:34%;vertical-align:top;">Starts</td>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e7f0;font-size:14px;color:#111827;font-weight:600;vertical-align:top;">Saturday, 12 December 2026</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e7f0;font-size:13px;color:#6b7280;vertical-align:top;">Schedule</td>
                  <td style="padding:12px 0;border-bottom:1px solid #e5e7f0;font-size:14px;color:#111827;font-weight:600;vertical-align:top;">Every Saturday &amp; Sunday &middot; 2 PM &ndash; 5 PM IST</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;font-size:13px;color:#6b7280;vertical-align:top;">Seats</td>
                  <td style="padding:12px 0;font-size:14px;color:#111827;font-weight:600;vertical-align:top;">30 only</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 8px;">
              <a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 34px;border-radius:999px;">Enrol at &#8377;30,000 &rarr;</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 6px;">
              <p style="margin:0;font-size:13px;line-height:1.65;color:#6b7280;text-align:center;">This link is personal to you &mdash; please enrol with the email address you used to join the waitlist, or the waitlist price won&#8217;t apply.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">Questions before you decide? Just reply to this email &mdash; I read every one.</p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#111827;">&mdash; Bhawesh<br><span style="color:#6b7280;font-size:13px;">Founder, PMpathshala</span></p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 24px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">Button not working? Copy this link into your browser:<br><a href="${url}" style="color:#4f46e5;word-break:break-all;">${url}</a></p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#f9fafb;padding:20px 28px;border-top:1px solid #eceef5;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">You&#8217;re receiving this because you joined the AI PM waitlist at pmpathshala.com. Don&#8217;t want these emails? Reply &ldquo;unsubscribe&rdquo; and we&#8217;ll stop.<br>&copy; 2026 PMpathshala &middot; Made with &#10084;&#65039; in India</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${firstName},`,
    '',
    'You joined the waitlist for our AI Product Manager flagship, so you are hearing this before anyone else.',
    'Enrolment is now open for an exclusive, limited-seat cohort — only 30 seats.',
    '',
    'YOUR WAITLIST PRICE: ₹30,000 (public price: ₹40,000)',
    '',
    'Starts: Saturday, 12 December 2026',
    'Schedule: Every Saturday & Sunday, 2 PM – 5 PM IST',
    'Seats: 30 only',
    '',
    `Enrol at ₹30,000: ${link}`,
    '',
    'This link is personal to you — please enrol with the email address you used to join the waitlist, or the waitlist price will not apply.',
    '',
    'Questions? Just reply to this email.',
    '',
    '— Bhawesh, Founder, PMpathshala',
    '',
    'You are receiving this because you joined the AI PM waitlist at pmpathshala.com. Reply "unsubscribe" and we will stop.',
  ].join('\n');

  return { html, text };
}

function parseCsv(file) {
  const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const head = split(rows[0]).map((h) => h.toLowerCase());
  const ni = head.indexOf('name'); const ei = head.indexOf('email');
  if (ei < 0) throw new Error('CSV needs a header row with an "email" column (and optionally "name").');
  return rows.slice(1).map((r) => { const c = split(r); return { name: ni >= 0 ? c[ni] || '' : '', email: c[ei] || '' }; });
}

async function main() {
  const file = process.argv[2];
  const doSend = process.argv.includes('--send');
  const secret = process.env.WAITLIST_SECRET;
  if (!file || !secret) {
    console.error('Usage: WAITLIST_SECRET=... node tools/waitlist-announcement.js waitlist.csv [--send]');
    process.exit(1);
  }
  if (doSend && !process.env.RESEND_API_KEY) { console.error('RESEND_API_KEY is required with --send'); process.exit(1); }

  const seen = new Set();
  const people = [];
  for (const p of parseCsv(file)) {
    const email = normaliseEmail(p.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { console.warn('Skipping invalid email:', p.email); continue; }
    if (seen.has(email)) { console.warn('Skipping duplicate:', email); continue; }
    seen.add(email);
    people.push({ name: p.name, email });
  }

  const outDir = path.join(process.cwd(), 'waitlist-out');
  fs.mkdirSync(outDir, { recursive: true });
  const linkRows = ['name,email,link'];
  let sent = 0; let failed = 0;

  for (const p of people) {
    const link = `${SITE_URL}/?offer=${makeOfferToken(p.email, secret)}`;
    const first = (p.name.split(/\s+/)[0] || 'there').replace(/[<>]/g, '');
    const { html, text } = buildEmail({ firstName: first, link });
    linkRows.push(`"${p.name.replace(/"/g, '')}",${p.email},${link}`);

    if (!doSend) {
      fs.writeFileSync(path.join(outDir, p.email.replace(/[^a-z0-9@._-]/g, '_') + '.html'), html);
      continue;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'waitlist-announce-' + crypto.createHash('sha256').update(p.email).digest('hex').slice(0, 40),
        },
        body: JSON.stringify({ from: FROM, to: [p.email], reply_to: SUPPORT_EMAIL, subject: SUBJECT, html, text }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      sent++; console.log('sent', p.email);
    } catch (e) { failed++; console.error('FAILED', p.email, e.message); }
    await new Promise((r) => setTimeout(r, 600)); // stay under Resend's rate limit
  }

  fs.writeFileSync(path.join(outDir, 'links.csv'), linkRows.join('\n'));
  console.log(doSend ? `Done. Sent ${sent}, failed ${failed}.` : `Dry run: ${people.length} previews + links.csv written to ${outDir}. Nothing was sent.`);
}

if (require.main === module) main();
module.exports = { buildEmail, SUBJECT };
