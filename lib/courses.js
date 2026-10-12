/**
 * Server-side authoritative course registry.
 *
 * SECURITY: api/create-payment.js looks up the charge amount here by
 * course_key — it must NEVER trust an amount sent from the browser.
 * The client (enroll.js CFG.courses) is display-only; this file is the
 * one place that decides what a course actually costs.
 *
 * Keep this in sync with enroll.js's CFG.courses when a price changes.
 */

const COURSES = {
  basic: {
    name: 'Basic to Advanced Product Management',
    amountPaise: 2500000, // ₹25,000
  },

  ai: {
    name: 'AI Product Manager',
    amountPaise: 4000000, // ₹40,000
    // Used by api/send-confirmation.js (confirmation email content).
    startsOn: 'Saturday, 12 December 2026',
    schedule: 'Every Saturday & Sunday · 2 PM – 5 PM IST',
    batch: 'Starts 12 December 2026 · Saturdays & Sundays · 2 PM – 5 PM IST',
  },
};

function getCourse(courseKey) {
  if (!courseKey || typeof courseKey !== 'string') return null;
  return COURSES[courseKey] || null;
}

module.exports = { COURSES, getCourse };
