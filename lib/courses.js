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

  // 'ai' intentionally omitted for now — the AI Product Manager course
  // isn't fully wired up in enroll.js's CFG.courses yet (no confirmed
  // price), so it can't be sold or charged until that's added here too.
};

function getCourse(courseKey) {
  if (!courseKey || typeof courseKey !== 'string') return null;
  return COURSES[courseKey] || null;
}

module.exports = { COURSES, getCourse };
