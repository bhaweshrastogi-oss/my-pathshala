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


function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SEGMENTS = {
  waitlist: {
    subject: 'Enrolment is open — your ₹30,000 waitlist seat is waiting',
    preheader: 'You asked to be first. The AI Product Manager cohort is open, and your waitlist price is ₹30,000. Only 30 seats.',
    pill: 'Waitlist members first',
    headline: 'You asked to be first. Enrolment is now open.',
    intro: 'you joined the waitlist for our AI Product Manager flagship cohort, so you are hearing this before anyone else. There are only <strong style="color:#111827;">30 seats</strong>, and classes start on <strong style="color:#111827;">Saturday, 12 December 2026</strong>.',
    offer: 'As a waitlist member, you get a price that is not available on the website.',
    offerLabel: 'Your waitlist price',
    emailNote: 'the email address you used to join the waitlist',
    reason: 'you joined the AI PM waitlist at pmpathshala.com',
    textIntro: 'You joined the waitlist for our AI Product Manager flagship cohort, so you are hearing this before anyone else. There are only 30 seats, and classes start on Saturday, 12 December 2026.',
    textOffer: 'As a waitlist member, you get a price that is not available on the website.',
  },
  quiz: {
    subject: 'Your next step after the AI PM quiz — a ₹30,000 seat inside',
    preheader: 'Thanks for taking the AI PM quiz. Enrolment is open, and we are giving you ₹30,000 as a thank-you. Only 30 seats.',
    pill: 'A thank-you for taking the quiz',
    headline: 'You took the AI PM quiz. Here is your next step.',
    intro: 'thank you for taking the AI PM quiz. Enrolment for our AI Product Manager flagship cohort is now open. There are only <strong style="color:#111827;">30 seats</strong>, and classes start on <strong style="color:#111827;">Saturday, 12 December 2026</strong>.',
    offer: 'As a thank-you from PMpathshala for taking the quiz, we are giving you a special price that is not available on the website.',
    offerLabel: 'Your thank-you price',
    emailNote: 'the email address you used for the quiz',
    reason: 'you took the AI PM quiz at pmpathshala.com',
    textIntro: 'Thank you for taking the AI PM quiz. Enrolment for our AI Product Manager flagship cohort is now open. There are only 30 seats, and classes start on Saturday, 12 December 2026.',
    textOffer: 'As a thank-you from PMpathshala for taking the quiz, we are giving you a special price that is not available on the website.',
  },
};

const SUBJECT = SEGMENTS.waitlist.subject; // default for the command-line script

function buildEmail({ firstName, link, segment }) {
  const seg = SEGMENTS[segment] || SEGMENTS.waitlist;
  const name = esc(firstName);
  const url = esc(link);
  const button = (label) => `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 34px;border-radius:999px;">${label}</a>`;
  const bullet = (t) => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.55;color:#374151;"><span style="color:#4f46e5;font-weight:700;">&#10003;</span>&nbsp; ${t}</td></tr>`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>AI Product Manager cohort — enrolment is open</title>
</head>
<body style="margin:0;padding:0;background:#f3f2fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f2fb;">${seg.preheader}</div>
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
              <div style="display:inline-block;background:rgba(255,255,255,0.16);color:#e0e7ff;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${seg.pill}</div>
              <h1 style="margin:16px 0 0;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;">${seg.headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 6px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#111827;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">${seg.intro[0].toUpperCase() + seg.intro.slice(1)}</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">${seg.offer}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:22px 20px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6d28d9;text-transform:uppercase;">${seg.offerLabel}</div>
                    <div style="font-size:40px;line-height:1.15;font-weight:800;color:#111827;margin-top:6px;">&#8377;30,000</div>
                    <div style="font-size:14px;color:#6b7280;margin-top:4px;">Public price: <span style="text-decoration:line-through;">&#8377;40,000</span></div>
                    <div style="margin-top:18px;">${button('Claim my &#8377;30,000 seat &rarr;')}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 4px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">What you will walk away with</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
                ${bullet('The judgment AI product managers actually need: scoping a feasible AI feature, writing an evaluation plan and defending a build-vs-buy call.')}
                ${bullet('Hands-on grounding in RAG, context engineering, AI agents, tool use and MCP.')}
                ${bullet('A capstone AI PRD that you defend in a Responsible AI review.')}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:18px 16px;">
                    <div style="font-size:14px;line-height:1.7;color:#111827;font-weight:600;">15+ years in product management &nbsp;&middot;&nbsp; 150+ students trained &nbsp;&middot;&nbsp; 4.9&#9733; course rating</div>
                    <div style="font-size:13px;line-height:1.6;color:#6b7280;margin-top:6px;">Our students work at Scotiabank, Capgemini and Microsoft.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px;">
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
            <td align="center" style="padding:26px 32px 8px;">
              ${button('Enrol at &#8377;30,000 &rarr;')}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 6px;">
              <p style="margin:0;font-size:13px;line-height:1.65;color:#6b7280;text-align:center;">This link is personal to you. Please enrol with ${seg.emailNote}, or the special price won&#8217;t apply.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">Not sure yet? Reply to this email with your question. I read every one.</p>
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
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">You&#8217;re receiving this because ${seg.reason}. Don&#8217;t want these emails? Reply &ldquo;unsubscribe&rdquo; and we&#8217;ll stop.<br>&copy; 2026 PMpathshala &middot; Made with &#10084;&#65039; in India</p>
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
    seg.textIntro,
    seg.textOffer,
    '',
    `YOUR PRICE: ₹30,000 (public price: ₹40,000)`,
    '',
    `Claim your seat: ${link}`,
    '',
    'WHAT YOU WILL WALK AWAY WITH',
    '- The judgment AI product managers actually need: scoping a feasible AI feature, writing an evaluation plan and defending a build-vs-buy call.',
    '- Hands-on grounding in RAG, context engineering, AI agents, tool use and MCP.',
    '- A capstone AI PRD that you defend in a Responsible AI review.',
    '',
    '15+ years in product management · 150+ students trained · 4.9★ course rating',
    'Our students work at Scotiabank, Capgemini and Microsoft.',
    '',
    'Starts: Saturday, 12 December 2026',
    'Schedule: Every Saturday & Sunday, 2 PM – 5 PM IST',
    'Seats: 30 only',
    '',
    `Enrol at ₹30,000: ${link}`,
    `This link is personal to you. Please enrol with ${seg.emailNote}, or the special price will not apply.`,
    '',
    'Not sure yet? Reply to this email with your question.',
    '',
    '— Bhawesh, Founder, PMpathshala',
    '',
    `You are receiving this because ${seg.reason}. Reply "unsubscribe" and we will stop.`,
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
module.exports = { buildEmail, SUBJECT, SEGMENTS };
