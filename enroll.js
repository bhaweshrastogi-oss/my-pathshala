/* ═════════════════════════════════════════════════════════════════
   PMpathshala — enroll.js
   Handles: form validation · Web3Forms (with timestamp) ·
            PhonePe payment redirect · email confirmation trigger
   ═══════════════════════════════════════════════════════════════ */

// ── CONFIG ───────────────────────────────────────────────
const CFG = {
  web3forms_key : 'cf83d387-9bb4-4849-a2aa-d982c809155e',

  // PhonePe: client_secret + OAuth happen only on the server (/api/create-payment).
  // Deploy this repo (or /api folder) on Vercel and set env vars there.

  courses: {
    basic: {
      name   : 'Basic to Advanced Product Management',
      price  : '₹25,000',        
      amount : 25,000,            
      batch  : 'August 22, 2026 · Weekends 2 PM – 5 PM IST',
    }
  },

  support_email : 'support@pmpathshala.com',
};

// ── CURRICULUM ────────────────────────────────────────────────
const CURRICULUM = {
  basic: {
    meta: '8 Weeks · 32+ Hours · 4 Assignments · Weekends 2 PM – 5 PM IST',
    weeks: [
      { t:'PM Foundations & User Research', i:['What is Product Management?','PM Roles & Responsibilities','Product Lifecycle Overview','User Interview Techniques','Creating User Personas','Jobs-to-be-Done Framework'] },
      { t:'Market Analysis & Strategy',     i:['Market Sizing (TAM/SAM/SOM)','Competitive Analysis & SWOT','Porter\'s Five Forces','Crafting Product Vision','OKRs & North Star Metrics','Strategic Roadmapping'] },
      { t:'Prioritisation & Requirements',  i:['RICE Scoring Model','MoSCoW & Kano Model','Value vs Effort Matrix','Writing User Stories','PRD Structure & Best Practices','Acceptance Criteria'] },
      { t:'UX Design & Prototyping',        i:['UX Fundamentals for PMs','Wireframing & Prototyping','Design Thinking Process','Usability Testing','Working with Designers','Design Review Best Practices'] },
      { t:'Agile & Engineering Collaboration',i:['Agile Methodology Deep Dive','Scrum Framework','Sprint Planning & Execution','Working with Engineers','Technical Debt Management','Release Management'] },
      { t:'Analytics & Metrics',            i:['Key Product Metrics','Analytics Tools (Mixpanel, Amplitude)','Funnel & Cohort Analysis','A/B Testing Methodology','Data-Driven Decisions','Experiment Design'] },
      { t:'Go-to-Market & Growth',          i:['GTM Strategy Framework','Launch Planning','Positioning & Messaging','Growth Frameworks','Feature Flags & Rollouts','Viral & Network Effects'] },
      { t:'Leadership & Career Growth',     i:['Stakeholder Management','Executive Communication','PM Career Ladder','Building Your PM Portfolio','Interview Preparation','Capstone Project Presentation'] },
    ]
  },
  ai: {
    meta: '8 Weeks · 40+ Hours · 4 Assignments · Weekends 6 PM – 9 PM IST',
    weeks: [
      { t:'AI/ML Fundamentals for PMs',  i:['AI vs ML vs Deep Learning','Types of ML Algorithms','Understanding Neural Networks','AI Capabilities & Limitations','Key AI Terminology'] },
      { t:'AI Product Discovery',        i:['Identifying AI Opportunities','AI Feasibility Assessment','Data Availability Analysis','Build vs Buy vs Partner','AI Use Case Prioritisation'] },
      { t:'Data Strategy & Management',  i:['Data Collection Strategies','Data Quality & Labelling','Data Pipelines Overview','Privacy & Compliance (GDPR)','Working with Data Teams'] },
      { t:'AI Product Development',      i:['ML Product Development Lifecycle','Model Requirements & Specs','Working with ML Engineers','Experiment Tracking','Model Versioning'] },
      { t:'AI Metrics & Evaluation',     i:['ML Model Metrics','Precision, Recall, F1 Score','Business vs Model Metrics','A/B Testing for AI Products','Continuous Monitoring'] },
      { t:'LLMs & Generative AI',        i:['Understanding LLMs (GPT, Claude)','Prompt Engineering','Fine-tuning vs RAG','Building GenAI Products','LLM Evaluation Methods'] },
      { t:'AI Ethics & Responsible AI',  i:['Bias in AI Systems','Fairness & Transparency','Explainable AI (XAI)','AI Governance Frameworks','Risk Management'] },
      { t:'AI Product Launch & Scale',   i:['MLOps Fundamentals','Model Deployment Strategies','Scaling AI Products','AI Product Roadmapping','Capstone Project Presentation'] },
    ]
  }
};

const FAQS = [
  { q:'Do I need prior PM experience?', a:'No experience needed for Basic to Advanced PM — it starts from first principles. For the AI PM course we recommend having some PM foundations or completing the Basic course first.' },
  { q:'What are the class timings?',    a:'Both courses run on weekends (Saturday & Sunday). Basic to Advanced PM: 2 PM – 5 PM IST. AI Product Manager: 6 PM – 9 PM IST. All sessions are recorded and shared within 24 hours.' },
  { q:'Are sessions live or recorded?', a:'Every session is live on Zoom with full interaction — polls, breakouts, Q&A. Recordings are available within 24 hours and remain accessible for 1 year.' },
  { q:'What career support is included?', a:'Resume reviews, LinkedIn profile critiques, mock PM interviews, and warm referrals in our hiring network.' },
  { q:'What is the refund policy?',     a:'15-day money-back guarantee from the course start date. If you\'ve attended fewer than 3 sessions and aren\'t satisfied, we\'ll refund 100% — no questions asked. Email support@pmpathshala.com to request.' },
  { q:'How many students per batch?',   a:'Maximum 30 students per batch — this is a firm cap, not a sales tactic. It ensures every student gets direct attention from Bhawesh during sessions and 1:1s.' },
  { q:'Can I pay in instalments?',      a:'We currently offer one-time payment via PhonePe (UPI, Net Banking, Cards, Wallets). Reach out via WhatsApp if you\'d like to discuss alternative arrangements.' },
];

// ── CURRICULUM RENDER ───────────────────────────────────────────
function renderCurriculum(type) {
  const data = CURRICULUM[type];
  const metaEl = document.getElementById('curr-meta');
  const gridEl = document.getElementById('curr-grid');
  if (!metaEl || !gridEl) return;
  metaEl.textContent = data.meta;
  gridEl.innerHTML = data.weeks.map((w, i) => `
    <div class="week-card" id="wk-${i}">
      <div class="week-header" onclick="toggleWeek(${i})">
        <div class="week-num">${i+1}</div>
        <div class="week-label">${w.t}</div>
        <div class="week-chevron">▾</div>
      </div>
      <div class="week-body">
        <ul>${w.i.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
    </div>`).join('');
}

function toggleWeek(i) { document.getElementById('wk-'+i).classList.toggle('open'); }

function switchCurr(type, btn) {
  document.querySelectorAll('.curr-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderCurriculum(type);
}

renderCurriculum('basic');

// ── FAQ RENDER ─────────────────────────────────────────────────
(function() {
  const el = document.getElementById('faq-list');
  if (!el) return;
  el.innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" id="faq-${i}">
      <div class="faq-q" onclick="toggleFaq(${i})">
        <span>${f.q}</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-a">${f.a}</div>
    </div>`).join('');
})();

function toggleFaq(i) { document.getElementById('faq-'+i).classList.toggle('open'); }

// ── MODAL CONTROL ───────────────────────────────────────────────
let selectedCourse = 'basic';

function openModal(course) {
  if (course) selectCourse(course);
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('form-wrap').style.display = '';
  document.getElementById('form-success').style.display = 'none';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleOverlayClick(e) {
  if (e.target.id === 'modal-overlay') closeModal();
}

function selectCourse(key) {
  if (!CFG.courses[key]) return;
  selectedCourse = key;
  document.querySelectorAll('.course-option-card').forEach(c => c.classList.remove('selected'));
  const el = document.getElementById('opt-' + key);
  if (el) el.classList.add('selected');
  const sp = document.getElementById('submit-price');
  if (sp) sp.textContent = '— ' + CFG.courses[key].price;
}

// ── HELPERS ───────────────────────────────────────────────────
function nowIST() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  });
}

function generateRef() {
  return 'PMP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
}

// ── FORM SUBMIT ─────────────────────────────────────────────────
let enrollData = {};

async function handleSubmit() {
  // Validate
  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const agree = document.getElementById('f-agree').checked;
  const course = CFG.courses[selectedCourse];

  ['name','email','phone'].forEach(f => document.getElementById('err-'+f).style.display = 'none');
  let valid = true;
  if (!name)                        { document.getElementById('err-name').style.display  = 'block'; valid = false; }
  if (!email || !email.includes('@')){ document.getElementById('err-email').style.display = 'block'; valid = false; }
  if (!phone)                       { document.getElementById('err-phone').style.display = 'block'; valid = false; }
  if (!agree) { alert('Please agree to the Terms of Service and Privacy Policy.'); return; }
  if (!valid) return;

  const btn = document.getElementById('form-submit-btn');
  btn.disabled = true;
  document.getElementById('submit-text').textContent = 'Saving…';

  const orderRef  = generateRef();
  const timestamp = nowIST();

  enrollData = { name, email, phone, course, orderRef, timestamp };

  // ── 1. Push to Web3Forms (with timestamp) ──────────────
  // This fires a notification email to Bhawesh immediately on form submission
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key : CFG.web3forms_key,
        subject    : `🎓 New Enrollment Lead: ${course.name} — ${name}`,
        from_name  : 'PMpathshala Enrollment',
        name, email, phone,
        course     : course.name,
        amount     : course.price,
        batch      : course.batch,
        order_ref  : orderRef,
        timestamp  : timestamp,   // ← IST timestamp included
        status     : 'LEAD_CAPTURED — Awaiting Payment',
        message    : [
          `📋 NEW ENROLLMENT LEAD`,
          `────────────────────────`,
          `Name      : ${name}`,
          `Email     : ${email}`,
          `Phone     : ${phone}`,
          `Course    : ${course.name}`,
          `Amount    : ${course.price}`,
          `Batch     : ${course.batch}`,
          `Order Ref : ${orderRef}`,
          `Timestamp : ${timestamp} IST`,
          `Status    : Lead captured — redirecting to PhonePe`,
          `────────────────────────`,
        ].join('\n'),
      })
    });
  } catch(err) { console.warn('Web3Forms (non-blocking):', err); }

  // ── 2. Show success micro-state ──────────────────
  document.getElementById('form-wrap').style.display    = 'none';
  document.getElementById('form-success').style.display = '';

  setTimeout(() => {
    closeModal();
    showPayPage();
    btn.disabled = false;
    document.getElementById('submit-text').textContent = 'Continue to Secure Payment';
  }, 1200);
}

// ── PAYMENT PAGE ────────────────────────────────────────────
function showPayPage() {
  const { name, email, phone, course, orderRef } = enrollData;

  document.getElementById('pay-course').textContent  = course.name;
  document.getElementById('pay-amount').textContent  = course.price;
  document.getElementById('pay-btn-amount').textContent = course.price.replace('₹','');
  document.getElementById('ss-name').textContent  = name;
  document.getElementById('ss-email').textContent = email;
  document.getElementById('ss-phone').textContent = phone;
  document.getElementById('ss-ref').textContent   = orderRef;

  document.getElementById('pay-main').style.display    = '';
  document.getElementById('pay-success').style.display = 'none';
  document.getElementById('ps-confirm').className = 'ps';

  document.getElementById('pay-page').classList.add('show');
  window.scrollTo(0, 0);
  document.body.style.overflow = 'hidden';
}

// ── PHONEPE PAYMENT INITIATION (SDK + iframe checkout) ─────────

// ── PAYMENT API BASE URL ─────────────────────────────────
// • '' (empty)     → same origin: deploy static site + /api on ONE Vercel project
// • full URL       → e.g. GitHub Pages frontend calling a separate Vercel API project
// Example: 'https://my-pathshala-api.vercel.app'
const BACKEND_URL = '';

function isBackendReady() {
  if (typeof BACKEND_URL !== 'string' || BACKEND_URL.includes('YOUR')) return false;
  if (BACKEND_URL === '') return true;
  return BACKEND_URL.replace(/\/$/, '').length > 10;
}

function paymentApiUrl(path) {
  const base = BACKEND_URL.replace(/\/$/, '');
  return `${base}${path}`;
}

(function warnIfPagesNeedsBackendUrl() {
  if (typeof window === 'undefined') return;
  const h = window.location.hostname || '';
  if (!BACKEND_URL && (h.endsWith('.github.io') || h === 'localhost')) {
    console.warn(
      '[PMpathshala] Payment API: BACKEND_URL is empty. On GitHub Pages set BACKEND_URL in enroll.js to your Vercel API URL. On localhost use PHONEPE_ALLOW_INSECURE_CORS=1 on Vercel or test from the Vercel preview URL.'
    );
  }
})();

async function initiatePhonePePayment() {
  if (isBackendReady()) {
    await initiatePhonePeRedirect();
  } else {
    showContactFallback();
  }
}

async function initiatePhonePeRedirect() {
  const btn = document.getElementById('pay-cta-btn');
  btn.disabled = true;
  btn.innerHTML = '<span style="display:flex;align-items:center;gap:0.5rem"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Creating secure session…</span>';

  const { name, email, phone, course, orderRef, timestamp } = enrollData;
  try {
    const redirectUrl = `${window.location.origin}${window.location.pathname}?payment=success`;
    const res = await fetch(paymentApiUrl('/api/create-payment'), {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        order_id : orderRef,
        name, email, phone,
        course     : course.name,
        course_key : selectedCourse,
        timestamp,
        redirect_url: redirectUrl,
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Backend responded ${res.status}: ${errText}`);
    }

    const data = await res.json();

    if (!data.redirectUrl) {
      throw new Error('No redirectUrl in response: ' + JSON.stringify(data));
    }

    notifyPaymentInitiated(orderRef, name, email, course, timestamp).catch(() => {});

    if (window.PhonePeCheckout) {
      let _pollTimer   = null;
      let _concluded   = false;

      async function handleConcluded(fromCallback) {
        if (_concluded) return;
        _concluded = true;
        clearInterval(_pollTimer);
        try { window.PhonePeCheckout.closePage(); } catch (_) {}

        // Give PhonePe's servers a moment to settle
        await new Promise(r => setTimeout(r, 1200));

        try {
          const statusRes = await fetch(
            paymentApiUrl('/api/order-status?order_id=' + encodeURIComponent(orderRef))
          );
          const statusData = statusRes.ok ? await statusRes.json() : null;

          if (statusData && statusData.state === 'COMPLETED') {
            await confirmPaymentSuccess();
          } else {
            // FAILED, indeterminate, or the status check itself came back
            // unusable — never default an unclear result to "success".
            _concluded = false; // allow retry
            btn.disabled = false;
            btn.innerHTML = '<span>Pay ' + course.price + ' via PhonePe →</span>';
            alert(
              statusData && statusData.state === 'FAILED'
                ? 'Payment failed. Please try again or contact us.'
                : 'We could not confirm your payment status. Please check your email, or contact us with order ref ' + orderRef + ' before retrying to avoid a duplicate charge.'
            );
          }
        } catch (_e) {
          _concluded = false; // allow retry
          btn.disabled = false;
          btn.innerHTML = '<span>Pay ' + course.price + ' via PhonePe →</span>';
          alert('We could not confirm your payment status. Please check your email, or contact us with order ref ' + orderRef + ' before retrying to avoid a duplicate charge.');
        }
      }

      // Poll every 3 s — catches cases where the iframe callback never fires
      _pollTimer = setInterval(async () => {
        if (_concluded) { clearInterval(_pollTimer); return; }
        try {
          const r = await fetch(
            paymentApiUrl('/api/order-status?order_id=' + encodeURIComponent(orderRef))
          );
          const d = r.ok ? await r.json() : {};
          if (d.state === 'COMPLETED') await handleConcluded(false);
          if (d.state === 'FAILED')    await handleConcluded(false);
        } catch (_) {}
      }, 3000);

      window.PhonePeCheckout.transact({
        tokenUrl: data.redirectUrl,
        type: 'IFRAME',
        callback: async function (response) {
          if (response === 'USER_CANCEL') {
            _concluded = true;
            clearInterval(_pollTimer);
            try { window.PhonePeCheckout.closePage(); } catch (_) {}
            btn.disabled = false;
            btn.innerHTML = '<span>Pay ' + course.price + ' via PhonePe →</span>';
            return;
          }
          if (response === 'CONCLUDED') {
            await handleConcluded(true);
          }
        },
      });
    } else {
      window.location.href = data.redirectUrl;
    }

  } catch (err) {
    console.error('[PhonePe] Payment initiation failed:', err);
    btn.disabled = false;
    btn.innerHTML = '<span>Pay ' + course.price + ' via PhonePe →</span>';
    showContactFallback(err.message);
  }
}

// ── CONTACT FALLBACK (shown when backend is not yet configured) ────
// This replaces the old UPI fallback — no fake UPI IDs, no confusion.
// Students are directed to WhatsApp/phone to complete payment manually.
function showContactFallback(debugMsg) {
  const { course, orderRef } = enrollData;
  const info = document.querySelector('.phonepe-info');
  if (!info) return;

  // Log debug info to console only (not shown to user)
  if (debugMsg) console.warn('[Payment backend]', debugMsg);

  const waMsg = encodeURIComponent(
    `Hi Bhawesh! I'd like to enrol in ${course.name}.\n\nMy details:\nName: ${enrollData.name}\nEmail: ${enrollData.email}\nPhone: ${enrollData.phone}\nOrder Ref: ${orderRef}\nAmount: ${course.price}\n\nPlease find attached payment snapshot.`
  );

  info.innerHTML = `
    <div style="text-align:center;padding:0.3rem 0">
      <div style="font-size:2.2rem;margin-bottom:0.8rem">⚙️</div>
      <p style="font-weight:700;font-size:0.95rem;color:var(--ink);margin-bottom:0.5rem">Payment gateway is being activated</p>
      <p style="font-size:0.84rem;color:var(--ink2);line-height:1.7;margin-bottom:1.3rem">
        Our PhonePe checkout is currently being set up. Please make the payment on the UPI ID mentioned below and share the payment screenshot on WhatsApp to confirm your enrolment.
      </p>
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:0.9rem 1rem;margin-bottom:1.2rem;font-size:0.82rem;text-align:left">
        <div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--ink3)">Course</span><span style="font-weight:700;color:var(--ink)">${course.name}</span></div>
        <div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--ink3)">UPI ID</span><span style="font-weight:700;color:var(--ink)"> bhaweshrastogi@okhdfcbank</span></div>
        <div style="display:flex;justify-content:space-between;padding:0.25rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--ink3)">Amount</span><span style="font-weight:700;color:var(--indigo)">${course.price}</span></div>
        <div style="display:flex;justify-content:space-between;padding:0.25rem 0"><span style="color:var(--ink3)">Your Ref</span><span style="font-weight:700;font-family:monospace;font-size:0.78rem;color:var(--ink)">${orderRef}</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.6rem">
        <a href="https://wa.me/919667783900?text=${waMsg}"
           target="_blank"
           style="display:flex;align-items:center;justify-content:center;gap:0.6rem;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;padding:0.85rem 1.5rem;border-radius:50px;font-weight:700;font-size:0.9rem;text-decoration:none;box-shadow:0 4px 16px rgba(37,211,102,0.35)">
          💬 Message Bhawesh on WhatsApp
        </a>
        <a href="tel:+919667783900"
           style="display:flex;align-items:center;justify-content:center;gap:0.6rem;background:var(--bg2);border:1.5px solid var(--border2);color:var(--ink2);padding:0.75rem 1.5rem;border-radius:50px;font-weight:600;font-size:0.87rem;text-decoration:none">
          📞 Call +91-9667783900
        </a>
      </div>
      <p style="font-size:0.73rem;color:var(--ink3);margin-top:1rem">Your details and order reference have been saved. Bhawesh will confirm your seat within a few hours.</p>
    </div>`;

  // Update the Pay button to hide it (contact links above are the CTAs now)
  const btn = document.getElementById('pay-cta-btn');
  if (btn) btn.style.display = 'none';
}

// ── PAYMENT INITIATED NOTIFICATION ─────────────────────
async function notifyPaymentInitiated(orderRef, name, email, course, timestamp) {
  await fetch('https://api.web3forms.com/submit', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      access_key : CFG.web3forms_key,
      subject    : `💳 Payment Initiated: ${course.name} — ${name}`,
      from_name  : 'PMpathshala Payments',
      name, email,
      order_ref  : orderRef,
      course     : course.name,
      amount     : course.price,
      timestamp  : timestamp,
      status     : 'PAYMENT_INITIATED — Redirected to PhonePe',
      message    : [
        `💳 PAYMENT INITIATED`,
        `────────────────────────`,
        `Name      : ${name}`,
        `Email     : ${email}`,
        `Course    : ${course.name}`,
        `Amount    : ${course.price}`,
        `Order Ref : ${orderRef}`,
        `Timestamp : ${timestamp} IST`,
        `Status    : Student redirected to PhonePe checkout`,
        `────────────────────────`,
      ].join('\n'),
    })
  });
}

// ── PAYMENT SUCCESS (called from redirect landing) ────────────
// When PhonePe redirects back with ?payment=success in the URL,
// this function is triggered to:
//   1. Verify the payment server-side
//   2. Show the confirmation screen
//   3. Send a confirmation email notification via Web3Forms
//   4. Trigger the student email via backend
async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') !== 'success') return;

  // Clean the ?payment=success from the URL bar without reload
  try {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  } catch (_) {}

  const saved = JSON.parse(sessionStorage.getItem('pm_enroll') || '{}');

  if (!saved.name) {
    // sessionStorage lost (e.g. private browsing or cross-tab) — show generic success
    document.getElementById('pay-page').classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('pay-main').style.display    = 'none';
    document.getElementById('pay-success').style.display = 'block';
    document.getElementById('success-email').textContent = 'your registered email';
    return;
  }

  enrollData = saved;
  showPayPage();

  // SECURITY: the ?payment=success query param alone is not proof of
  // payment — it's just a redirect target, trivially forgeable by anyone
  // who visits that URL directly. Verify server-side before confirming.
  try {
    const statusRes = await fetch(
      paymentApiUrl('/api/order-status?order_id=' + encodeURIComponent(saved.orderRef))
    );
    const statusData = statusRes.ok ? await statusRes.json() : null;

    if (statusData && statusData.state === 'COMPLETED') {
      await confirmPaymentSuccess();
    } else {
      document.getElementById('pay-main').style.display    = '';
      document.getElementById('pay-success').style.display = 'none';
      alert('We could not confirm your payment yet. If you completed payment, please contact support with your order reference: ' + (saved.orderRef || ''));
    }
  } catch (_e) {
    document.getElementById('pay-main').style.display    = '';
    document.getElementById('pay-success').style.display = 'none';
    alert('We could not confirm your payment status. Please contact support with your order reference: ' + (saved.orderRef || ''));
  }
}

async function confirmPaymentSuccess() {
  const { name, email, phone, course, orderRef, timestamp } = enrollData;

  // Show success UI
  document.getElementById('ps-confirm').classList.add('active');
  document.getElementById('pay-main').style.display    = 'none';
  document.getElementById('pay-success').style.display = 'block';
  document.getElementById('success-email').textContent = email || '';

  // ── Send "Payment Confirmed" notification + student email trigger ──
  // Web3Forms sends YOU (Bhawesh) an email; the student email flow
  // is handled by your backend's /api/send-confirmation endpoint.
  try {
    // Notify admin
    await fetch('https://api.web3forms.com/submit', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        access_key : CFG.web3forms_key,
        subject    : `✅ PAYMENT CONFIRMED: ${course.name} — ${name}`,
        from_name  : 'PMpathshala Payments',
        name, email, phone,
        course     : course.name,
        amount     : course.price,
        order_ref  : orderRef,
        timestamp  : timestamp,
        confirmed_at: nowIST(),
        status     : 'PAYMENT_CONFIRMED ✅',
        message    : [
          `✅ PAYMENT CONFIRMED`,
          `══════════════════════════`,
          `Name         : ${name}`,
          `Email        : ${email}`,
          `Phone        : ${phone}`,
          `Course       : ${course.name}`,
          `Amount       : ${course.price}`,
          `Order Ref    : ${orderRef}`,
          `Lead Time    : ${timestamp} IST`,
          `Confirmed At : ${nowIST()} IST`,
          `══════════════════════════`,
          `ACTION: Send WhatsApp & batch joining instructions to student.`,
        ].join('\n'),
      })
    });

    // ── Trigger student confirmation email via backend ────────
    // Your backend endpoint reads the payload and sends an email
    // from support@pmpathshala.com using your email provider
    // (e.g. Resend, SendGrid, Nodemailer+SMTP).
    // Optional student email: extend /api/send-confirmation (e.g. Resend).
    await fetch(paymentApiUrl('/api/send-confirmation'), {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        name,
        email,
        phone,
        course: course.name,
        amount: course.price,
        batch: course.batch,
        orderRef,
      }),
    }).catch(() => {}); // non-blocking — confirmation still shows

  } catch(e) { console.warn('Confirmation notifications:', e); }
}



// ── SAVE ENROLL DATA TO SESSION (for post-redirect retrieval) ──────
function saveEnrollSession() {
  if (enrollData.name) {
    sessionStorage.setItem('pm_enroll', JSON.stringify(enrollData));
  }
}

// Override showPayPage to also save session
const _orig_showPayPage = showPayPage;
window.showPayPage = function() {
  saveEnrollSession();
  _orig_showPayPage();
};

// ── NAV HELPERS ───────────────────────────────────────────
function backToForm() {
  document.getElementById('pay-page').classList.remove('show');
  document.body.style.overflow = '';
  openModal(selectedCourse);
}

function closePay() {
  document.getElementById('pay-page').classList.remove('show');
  document.body.style.overflow = '';
  sessionStorage.removeItem('pm_enroll');
}

// ── INIT ──────────────────────────────────────────────────
// Check if returning from PhonePe redirect
document.addEventListener('DOMContentLoaded', handlePaymentReturn);
