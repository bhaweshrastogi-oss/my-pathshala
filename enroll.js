/* ══════════════════════════════════════════════
   PMpathshala — Enrollment & Payment Logic
   ══════════════════════════════════════════════ */

// ── CONFIG ────────────────────────────────────
const WEB3FORMS_KEY = 'cf83d387-9bb4-4849-a2aa-d982c809155e';
const UPI_ID        = 'pmpathshala@ybl'; // ← Replace with your actual PhonePe UPI ID from merchant dashboard

// PhonePe PG Credentials (use on server-side only — do NOT expose secret here in production)
// Merchant ID:    M23RVERLHV32L
// Client ID:      SU2512261330453294206129
// Client Secret:  221fb003-b76e-4669-9e1b-325e2dcdab86
// See payment-server/README.md for server-side integration guide

const COURSES = {
  basic: { name: 'Basic to Advanced PM', price: '₹20,000', amount: 20000 },
};

let selectedCourse = 'basic';

// ── CURRICULUM DATA ───────────────────────────
const curriculum = {
  basic: {
    meta: '8 Weeks • 32+ Hours • 4 Assignments • Weekends 12 PM – 3 PM',
    weeks: [
      { title: 'PM Foundations & User Research', topics: ['What is Product Management?','PM Roles & Responsibilities','Product Lifecycle Overview','User Interview Techniques','Creating User Personas','Jobs-to-be-Done Framework'] },
      { title: 'Market Analysis & Strategy', topics: ['Market Sizing (TAM/SAM/SOM)','Competitive Analysis & SWOT','Porter\'s Five Forces','Crafting Product Vision','OKRs & North Star Metrics','Strategic Roadmapping'] },
      { title: 'Prioritization & Requirements', topics: ['RICE Scoring Model','MoSCoW & Kano Model','Value vs Effort Matrix','Writing User Stories','PRD Structure & Best Practices','Acceptance Criteria'] },
      { title: 'UX Design & Prototyping', topics: ['UX Fundamentals for PMs','Wireframing & Prototyping','Design Thinking Process','Usability Testing','Working with Designers','Design Review Best Practices'] },
      { title: 'Agile & Development', topics: ['Agile Methodology Deep Dive','Scrum Framework','Sprint Planning & Execution','Working with Engineers','Technical Debt Management','Release Management'] },
      { title: 'Analytics & Metrics', topics: ['Key Product Metrics','Analytics Tools (Mixpanel, Amplitude)','Funnel & Cohort Analysis','A/B Testing Methodology','Data-Driven Decisions','Experiment Design'] },
      { title: 'Go-to-Market & Growth', topics: ['GTM Strategy Framework','Launch Planning','Positioning & Messaging','Growth Frameworks','Feature Flags & Rollouts','Viral & Network Effects'] },
      { title: 'Leadership & Career Growth', topics: ['Stakeholder Management','Executive Communication','PM Career Ladder','Building Your PM Portfolio','Interview Preparation','Capstone Project Presentation'] },
    ]
  },
  ai: {
    meta: '8 Weeks • 40+ Hours • 4 Assignments • Weekends 5 PM – 8 PM',
    weeks: [
      { title: 'AI/ML Fundamentals for PMs', topics: ['AI vs ML vs Deep Learning','Types of ML Algorithms','Understanding Neural Networks','AI Capabilities & Limitations','Key AI Terminology'] },
      { title: 'AI Product Discovery', topics: ['Identifying AI Opportunities','AI Feasibility Assessment','Data Availability Analysis','Build vs Buy vs Partner','AI Use Case Prioritization'] },
      { title: 'Data Strategy & Management', topics: ['Data Collection Strategies','Data Quality & Labeling','Data Pipelines Overview','Privacy & Compliance (GDPR)','Working with Data Teams'] },
      { title: 'AI Product Development', topics: ['ML Product Development Lifecycle','Model Requirements & Specs','Working with ML Engineers','Experiment Tracking','Model Versioning'] },
      { title: 'AI Metrics & Evaluation', topics: ['ML Model Metrics','Precision, Recall, F1 Score','Business vs Model Metrics','A/B Testing for AI Products','Continuous Monitoring'] },
      { title: 'LLMs & Generative AI', topics: ['Understanding LLMs (GPT, Claude)','Prompt Engineering','Fine-tuning vs RAG','Building GenAI Products','LLM Evaluation Methods'] },
      { title: 'AI Ethics & Responsible AI', topics: ['Bias in AI Systems','Fairness & Transparency','Explainable AI (XAI)','AI Governance Frameworks','Risk Management'] },
      { title: 'AI Product Launch & Scale', topics: ['MLOps Fundamentals','Model Deployment Strategies','Scaling AI Products','AI Product Roadmapping','Capstone Project Presentation'] },
    ]
  }
};

const faqs = [
  { q: 'Do I need prior experience in Product Management?', a: 'No! Our Basic to Advanced PM course is designed for complete beginners. We start from fundamentals and progressively build up to advanced topics. For the AI PM course, we recommend basic PM knowledge or completion of the foundational course first.' },
  { q: 'What are the class timings?', a: 'Classes are held on weekends (Saturday & Sunday). Basic to Advanced PM: 12 PM – 3 PM IST. AI Product Manager: 5 PM – 8 PM IST. All sessions are recorded and available for lifetime access.' },
  { q: 'Are the sessions live or recorded?', a: 'All sessions are conducted live via Zoom with full interaction. Recordings are shared within 24 hours and available for lifetime access so you can revisit anytime.' },
  { q: 'What kind of job support do you provide?', a: 'We provide comprehensive career support including resume review, LinkedIn optimization, mock interviews, and direct referrals to our hiring network of 50+ companies. Placement support continues even after course completion.' },
  { q: 'Is there a refund policy?', a: 'Yes! We offer a 15-day money-back guarantee. If you\'re not satisfied within the first 15 days, we\'ll provide a full refund — no questions asked.' },
  { q: 'How many seats are available per batch?', a: 'Each batch is limited to 30 students to ensure personalized attention, meaningful interactions, and quality mentorship for every participant.' },
];

// ── RENDER FAQ ────────────────────────────────
(function renderFaq() {
  const el = document.getElementById('faq-list');
  if (!el) return;
  el.innerHTML = faqs.map((item, i) => `
    <div class="faq-item" id="faq-${i}">
      <div class="faq-q" onclick="toggleFaq(${i})">
        <span>${item.q}</span><span class="faq-icon">+</span>
      </div>
      <div class="faq-a">${item.a}</div>
    </div>`).join('');
})();

function toggleFaq(i) { document.getElementById('faq-'+i).classList.toggle('open'); }

// ── RENDER CURRICULUM ─────────────────────────
function renderCurriculum(type) {
  const data = curriculum[type];
  const metaEl = document.getElementById('curr-meta');
  const gridEl = document.getElementById('curr-grid');
  if (!metaEl || !gridEl) return;
  metaEl.textContent = data.meta;
  gridEl.innerHTML = data.weeks.map((w, i) => `
    <div class="week-card" id="wk-${i}">
      <div class="week-header" onclick="toggleWeek(${i})">
        <div class="week-num">${i+1}</div>
        <div class="week-title">${w.title}</div>
        <div class="week-chevron">▾</div>
      </div>
      <div class="week-body"><ul>${w.topics.map(t=>`<li>${t}</li>`).join('')}</ul></div>
    </div>`).join('');
}

function toggleWeek(i) { document.getElementById('wk-'+i).classList.toggle('open'); }

function switchCurr(type, btn) {
  document.querySelectorAll('.curr-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderCurriculum(type);
}

renderCurriculum('basic');

// ── MODAL ─────────────────────────────────────
function openModal(course) {
  if (course && COURSES[course]) selectCourse(course);
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const fw = document.getElementById('form-wrap');
  const fs = document.getElementById('form-success');
  if (fw) fw.style.display = 'block';
  if (fs) fs.style.display = 'none';
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function handleOverlayClick(e) {
  if (e.target.id === 'modal-overlay') closeModal();
}

function selectCourse(course) {
  if (!COURSES[course]) return;
  selectedCourse = course;
  document.querySelectorAll('.course-option').forEach(el => el.classList.remove('selected'));
  const opt = document.getElementById('opt-'+course);
  if (opt) opt.classList.add('selected');
  const priceEl = document.getElementById('submit-price');
  if (priceEl) priceEl.textContent = '— ' + COURSES[course].price;
}

// ── FORM SUBMIT ───────────────────────────────
async function handleSubmit() {
  const name  = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const agree = document.getElementById('f-agree').checked;

  ['name','email','phone'].forEach(f => { document.getElementById('err-'+f).style.display = 'none'; });

  let valid = true;
  if (!name)                        { document.getElementById('err-name').style.display  = 'block'; valid = false; }
  if (!email || !email.includes('@')){ document.getElementById('err-email').style.display = 'block'; valid = false; }
  if (!phone)                       { document.getElementById('err-phone').style.display = 'block'; valid = false; }
  if (!agree) { alert('Please agree to the Terms of Service and Privacy Policy to continue.'); valid = false; }
  if (!valid) return;

  const btn = document.getElementById('form-submit-btn');
  btn.disabled = true;
  document.getElementById('submit-text').textContent = 'Submitting...';

  // Push lead to Web3Forms → you receive email notification
  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        name, email, phone,
        course: COURSES[selectedCourse].name,
        amount: COURSES[selectedCourse].price,
        subject: `New Enrollment: ${COURSES[selectedCourse].name} – ${name}`,
        message: `New enrollment request received.\n\nCourse: ${COURSES[selectedCourse].name}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nAmount: ${COURSES[selectedCourse].price}`
      })
    });
  } catch(e) { console.warn('Web3Forms submit error (non-blocking):', e); }

  document.getElementById('form-wrap').style.display   = 'none';
  document.getElementById('form-success').style.display = 'block';

  setTimeout(() => {
    closeModal();
    showPaymentPage(name, email, phone);
    btn.disabled = false;
    document.getElementById('submit-text').textContent = 'Proceed to Payment';
  }, 1400);
}

// ── QR CODE ───────────────────────────────────
function drawQR(canvasId, upiString) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => ctx.drawImage(img, 0, 0, size, size);
  img.onerror = () => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('UPI ID:', size/2, size/2 - 10);
    ctx.fillText(UPI_ID, size/2, size/2 + 10);
  };
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size
          + '&data=' + encodeURIComponent(upiString)
          + '&margin=0&color=1a1714&bgcolor=ffffff';
}

function buildUpiString(courseName, amount) {
  return 'upi://pay?pa=' + UPI_ID
       + '&pn=PMpathshala'
       + '&am=' + amount
       + '&cu=INR'
       + '&tn=' + encodeURIComponent('PMpathshala-' + courseName);
}

// ── PAYMENT PAGE ──────────────────────────────
function showPaymentPage(name, email, phone) {
  const c = COURSES[selectedCourse];

  document.getElementById('pa-course').textContent  = c.name;
  document.getElementById('pa-amount').textContent  = c.price;
  document.getElementById('pa-name').textContent    = name;
  document.getElementById('pa-email').textContent   = email;
  document.getElementById('pa-phone').textContent   = phone;
  document.getElementById('conf-email').textContent = email;
  document.getElementById('upi-id-display').textContent = UPI_ID;

  const upiStr = buildUpiString(c.name, c.amount);
  drawQR('qr-canvas', upiStr);

  ['phonepe-deeplink','gpay-deeplink','paytm-deeplink','bhim-deeplink'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = upiStr;
  });

  document.getElementById('payment-main').style.display      = 'block';
  document.getElementById('payment-confirmed').style.display = 'none';
  document.getElementById('step-confirm').classList.remove('active', 'done');

  // Reset to UPI tab
  switchPayTab('upi', document.querySelector('.pay-tab'));

  document.getElementById('payment-page').classList.add('show');
  window.scrollTo(0, 0);
  document.body.style.overflow = 'hidden';
}

// ── PAYMENT TAB SWITCHER ──────────────────────
function switchPayTab(tab, btn) {
  document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pay-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('panel-' + tab);
  if (panel) panel.classList.add('active');
}

// ── NET BANKING PROCEED ───────────────────────
function proceedNetBanking() {
  const bank = document.getElementById('nb-bank').value;
  if (!bank) { alert('Please select a bank'); return; }

  const res = await fetch('https://YOUR-PROJECT.vercel.app/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: COURSES[selectedCourse].amount,
      name: document.getElementById('pa-name').textContent,
      phone: document.getElementById('pa-phone').textContent,
      email: document.getElementById('pa-email').textContent,
      course: COURSES[selectedCourse].name,
    })
  });
  const data = await res.json();
  if (data.redirectUrl) window.location.href = data.redirectUrl;
}

// ── CONFIRM PAYMENT ───────────────────────────
function confirmPayment() {
  document.getElementById('step-confirm').classList.add('active');
  document.getElementById('payment-main').style.display      = 'none';
  document.getElementById('payment-confirmed').style.display = 'block';
}

function backToForm() {
  document.getElementById('payment-page').classList.remove('show');
  document.body.style.overflow = '';
  openModal(selectedCourse);
}
