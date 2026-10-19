const orders = require('./orders');
const { getOrderStatus } = require('./phonepe');
const { buildEmail, sendWithResend, formatRupees } = require('./confirmationEmail');

async function fulfilOrder(id) {
  const existing = await orders.getOrder(id);
  if (!existing) { const e = new Error('Unknown order'); e.statusCode = 404; throw e; }
  return orders.withLock(id, async () => {
    const order = await orders.getOrder(id);
    const status = await getOrderStatus(id);
    if (status.state !== 'COMPLETED') {
      if (['FAILED', 'EXPIRED'].includes(status.state)) await orders.finishOrder(id);
      return { state: status.state, sent: false };
    }
    if (!Number.isSafeInteger(status.amount) || status.amount !== order.amountPaise ||
        (status.merchantOrderId && status.merchantOrderId !== id)) {
      throw new Error('Payment does not match stored order');
    }
    order.state = 'COMPLETED';
    order.paidAt = order.paidAt || new Date().toISOString();
    await orders.saveOrder(order);
    if (!process.env.RESEND_API_KEY || !process.env.ADMIN_NOTIFICATION_EMAIL) throw new Error('Payment email delivery is not configured');
    if (!order.studentEmailSentAt) {
      const email = buildEmail({ name: order.name, courseName: order.course.name,
        startsOn: order.course.startsOn || 'Date will be shared by Bhawesh',
        schedule: order.course.schedule || 'Schedule will be shared by Bhawesh',
        duration: order.course.duration, cohortLine: order.course.cohortLine,
        amount: formatRupees(order.amountPaise), orderRef: id });
      await sendWithResend({ to: order.email, ...email, idempotencyKey: `enrol-confirm-${id}` });
      order.studentEmailSentAt = new Date().toISOString();
      await orders.saveOrder(order);
    }
    if (!order.adminEmailSentAt) {
      await sendWithResend({ to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: `Payment verified: ${id}`,
        text: `Payment verified with PhonePe.\nName: ${order.name}\nEmail: ${order.email}\nPhone: ${order.phone}\nCourse: ${order.course.name}\nAmount: ${formatRupees(order.amountPaise)}\nOrder: ${id}`,
        idempotencyKey: `enrol-admin-${id}` });
      order.adminEmailSentAt = new Date().toISOString();
      await orders.saveOrder(order);
    }
    await orders.finishOrder(id);
    return { state: 'COMPLETED', sent: true };
  });
}
module.exports = { fulfilOrder };
