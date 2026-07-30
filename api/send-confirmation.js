const { setCorsHeaders } = require('../lib/cors');
const { readJsonBody } = require('../lib/readBody');
const { getOrderStatus } = require('../lib/phonepe');

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

    if (!orderRef || typeof orderRef !== 'string') {
      res.statusCode = 400;
      return res.json({ error: 'orderRef required' });
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
      <p>Hi <strong>${escapeHtml(safeName)}</strong>,</p>
      <p>Thank you for your payment. Your enrollment is <strong>confirmed</strong>.</p>
      <table>
        <tr><td>Course</td><td>${escapeHtml(String(course || '—'))}</td></tr>
        <tr><td>Batch</td><td>${escapeHtml(String(batch || '—'))}</td></tr>
        <tr><td>Amount</td><td>${escapeHtml(String(amount || '—'))}</td></tr>
        <tr><td>Order ref</td><td>${escapeHtml(String(orderRef || '—'))}</td></tr>
      </table>
      <p>Bhawesh will reach out within <strong>24 hours</strong> with batch joining instructions and the WhatsApp group link.</p>
      <p>Questions? Reply to this email or write to <a href="mailto:support@pmpathshala.com">support@pmpathshala.com</a></p>
      <p>— PMpathshala</p>
    `;

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
