/**
 * Marketing email (promotions, webinars, seminars) in the same branded template
 * as the waitlist / quiz emails. Used by /api/admin-waitlist (segment "marketing").
 * Every text field is escaped; only https:// links are accepted.
 */
const SITE_URL = (process.env.SITE_URL || 'https://pmpathshala.com').replace(/\/$/, '');
const LOGO_URL = `${SITE_URL}/logo-email.png`;
const LOGO_WIDTH = 180;

const LIMITS = { subject: 150, preheader: 150, pill: 40, headline: 140, intro: 3000, details: 1200, bullets: 1500, bulletsTitle: 60, ctaText: 40, ctaUrl: 500, ctaNote: 300, closing: 600, signoff: 120, signoffRole: 120, reason: 200 };
const DEFAULTS = { signoff: 'Bhawesh', signoffRole: 'Founder, PMpathshala', reason: "you're on the PMpathshala list", bulletsTitle: "What you'll learn" };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const clean = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const lines = (v) => String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);

/** Validate + normalise the sections typed on the admin page. Returns {s} or {error}. */
function normaliseSections(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const s = {};
  for (const k of Object.keys(LIMITS)) s[k] = clean(raw[k], LIMITS[k]);
  s.subject = s.subject.replace(/\n/g, ' ');
  for (const k of ['preheader', 'pill', 'headline', 'ctaText', 'ctaUrl', 'signoff', 'signoffRole', 'reason', 'bulletsTitle']) s[k] = s[k].replace(/\n/g, ' ');
  if (!s.subject) return { error: 'Add a subject line.' };
  if (!s.headline) return { error: 'Add a headline.' };
  if (!s.intro) return { error: 'Add the main message (intro).' };
  if (s.ctaText && !s.ctaUrl) return { error: 'Add the button link, or clear the button text.' };
  if (s.ctaUrl) {
    if (!/^https:\/\/[^\s"'<>]+$/i.test(s.ctaUrl)) return { error: 'Button link must start with https://' };
    if (!s.ctaText) return { error: 'Add the button text.' };
  }
  for (const k of Object.keys(DEFAULTS)) if (!s[k]) s[k] = DEFAULTS[k];
  return { s };
}

function parseDetails(v) {
  return lines(v).map((l) => {
    const i = l.indexOf(':');
    return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { label: '', value: l };
  }).filter((r) => r.value);
}

function buildMarketingEmail({ firstName, sections }) {
  const { s, error } = normaliseSections(sections);
  if (error) throw new Error(error);
  const name = esc(firstName || 'there');
  const paras = s.intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const details = parseDetails(s.details);
  const bullets = lines(s.bullets);
  const url = esc(s.ctaUrl);
  const button = s.ctaUrl
    ? `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 34px;border-radius:999px;">${esc(s.ctaText)} &rarr;</a>`
    : '';
  const section = (inner, pad) => `<tr><td style="padding:${pad || '20px 32px 4px'};">${inner}</td></tr>`;

  const detailRows = details.map((r, i) => {
    const last = i === details.length - 1;
    const b = last ? '' : 'border-bottom:1px solid #e5e7f0;';
    return r.label
      ? `<tr><td style="padding:12px 0;${b}font-size:13px;color:#6b7280;width:34%;vertical-align:top;">${esc(r.label)}</td><td style="padding:12px 0;${b}font-size:14px;color:#111827;font-weight:600;vertical-align:top;">${esc(r.value)}</td></tr>`
      : `<tr><td colspan="2" style="padding:12px 0;${b}font-size:14px;color:#111827;font-weight:600;">${esc(r.value)}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(s.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f2fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f2fb;">${esc(s.preheader)}</div>
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
              ${s.pill ? `<div style="display:inline-block;background:rgba(255,255,255,0.16);color:#e0e7ff;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">${esc(s.pill)}</div>` : ''}
              <h1 style="margin:${s.pill ? '16px' : '0'} 0 0;font-size:28px;line-height:1.25;color:#ffffff;font-weight:700;">${esc(s.headline)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px 6px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#111827;">Hi ${name},</p>
              ${paras.map((p, i) => `<p style="margin:0${i === paras.length - 1 ? '' : ' 0 14px'};font-size:15px;line-height:1.7;color:#374151;">${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n              ')}
            </td>
          </tr>
          ${details.length ? section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ff;border-radius:14px;"><tr><td style="padding:8px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table></td></tr></table>`, '18px 32px 6px') : ''}
          ${bullets.length ? section(`<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#6b7280;text-transform:uppercase;">${esc(s.bulletsTitle)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">${bullets.map((b) => `<tr><td style="padding:6px 0;font-size:15px;line-height:1.55;color:#374151;"><span style="color:#4f46e5;font-weight:700;">&#10003;</span>&nbsp; ${esc(b)}</td></tr>`).join('')}</table>`, '24px 32px 4px') : ''}
          ${button ? `<tr><td align="center" style="padding:26px 32px 8px;">${button}</td></tr>` : ''}
          ${s.ctaNote ? `<tr><td style="padding:8px 32px 6px;"><p style="margin:0;font-size:13px;line-height:1.65;color:#6b7280;text-align:center;">${esc(s.ctaNote)}</p></td></tr>` : ''}
          <tr>
            <td style="padding:18px 32px 8px;">
              ${s.closing ? `<p style="margin:0;font-size:15px;line-height:1.7;color:#374151;">${esc(s.closing).replace(/\n/g, '<br>')}</p>` : ''}
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#111827;">&mdash; ${esc(s.signoff)}<br><span style="color:#6b7280;font-size:13px;">${esc(s.signoffRole)}</span></p>
            </td>
          </tr>
          ${button ? `<tr><td style="padding:14px 32px 24px;"><p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">Button not working? Copy this link into your browser:<br><a href="${url}" style="color:#4f46e5;word-break:break-all;">${url}</a></p></td></tr>` : '<tr><td style="padding:0 0 16px;"></td></tr>'}
          <tr>
            <td align="center" style="background:#f9fafb;padding:20px 28px;border-top:1px solid #eceef5;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">You&#8217;re receiving this because ${esc(s.reason)}. Don&#8217;t want these emails? Reply &ldquo;unsubscribe&rdquo; and we&#8217;ll stop.<br>&copy; 2026 PMpathshala &middot; Made with &#10084;&#65039; in India</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${firstName || 'there'},`, '',
    paras.join('\n\n'), '',
    ...(details.length ? [details.map((r) => (r.label ? `${r.label}: ${r.value}` : r.value)).join('\n'), ''] : []),
    ...(bullets.length ? [s.bulletsTitle.toUpperCase(), ...bullets.map((b) => `- ${b}`), ''] : []),
    ...(s.ctaUrl ? [`${s.ctaText}: ${s.ctaUrl}`, ''] : []),
    ...(s.ctaNote ? [s.ctaNote, ''] : []),
    ...(s.closing ? [s.closing, ''] : []),
    `— ${s.signoff}, ${s.signoffRole}`, '',
    `You are receiving this because ${s.reason}. Reply "unsubscribe" and we will stop.`,
  ].join('\n');

  return { html, text, subject: s.subject };
}

module.exports = { buildMarketingEmail, normaliseSections, DEFAULTS, LIMITS };
