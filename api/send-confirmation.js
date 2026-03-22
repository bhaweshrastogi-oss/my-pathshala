const { setCorsHeaders } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');



async function sendWithResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'PMpathshala <onboarding@resend.dev>';

  if (!apiKey) {
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
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
    const {
      name,
      email,
      phone,
      course,
      amount,
      batch,
      orderRef,
    } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.statusCode = 400;
      return res.json({ error: 'valid email required' });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('[send-confirmation] RESEND_API_KEY not set — student email skipped');
      res.statusCode = 200;
      return res.json({ ok: true, skipped: true });
    }

    const safeName = String(name || 'there').slice(0, 200);
    const subject = `You're enrolled — ${course || 'PMpathshala'}`;

    const text = [
      `Hi ${safeName},`,
      '',
      'Thank you for your payment. Your enrollment is confirmed.',
      '',
      `Course: ${course || '—'}`,
      `Batch: ${batch || '—'}`,
      `Amount: ${amount || '—'}`,
      `Order ref: ${orderRef || '—'}`,
      phone ? `Phone: ${phone}` : '',
      '',
      'Bhawesh will reach out within 24 hours with batch joining instructions and the WhatsApp group link.',
      '',
      'Questions? Reply to this email or write to support@pmpathshala.com',
      '',
      '— PMpathshala',
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a2e;max-width:560px;margin:0 auto;padding:24px">
  <p>Hi <strong>${escapeHtml(safeName)}</strong>,</p>
  <p>Thank you for your payment. Your enrollment is <strong>confirmed</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Course</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${escapeHtml(String(course || '—'))}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Batch</td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(String(batch || '—'))}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Amount</td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(String(amount || '—'))}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Order ref</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${escapeHtml(String(orderRef || '—'))}</td></tr>
  </table>
  <p>Bhawesh will reach out within <strong>24 hours</strong> with batch joining instructions and the WhatsApp group link.</p>
  <p style="color:#666;font-size:13px">Questions? Reply to this email or write to <a href="mailto:support@pmpathshala.com">support@pmpathshala.com</a></p>
  <p style="margin-top:28px;font-size:13px;color:#888">— PMpathshala</p>
</body></html>`;

    await sendWithResend({ to: email.trim(), subject, html, text });

    res.statusCode = 200;
    return res.json({ ok: true, sent: true });
  } catch (e) {
    console.error('[send-confirmation]', e.message || e, e.data || '');
    res.statusCode = 200;
    return res.json({ ok: true, error: e.message || 'send failed' });
  }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
