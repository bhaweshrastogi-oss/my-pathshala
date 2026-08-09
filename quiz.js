/* ═════════════════════════════════════════════════════════════════════
   PMpathshala — quiz.js
   Handles: pre-homepage gate → lead capture (Web3Forms) → 5-question
            PM quiz → score → reveal homepage underneath.
   Separate Web3Forms key from enroll.js by design — keeps quiz-lead
   volume from eating into the enrollment notification quota.
   ════════════════════════════════════════════════════════════════ */

const QZ_CFG = {
  web3forms_key: '7fff73e4-c773-4578-8981-a11b37ef2f8f',
};

const QZ_QUESTIONS = [
  {
    q: "Your users are complaining that your app takes 10 seconds to load. What should a PM do FIRST?",
    options: [
      "Ask engineering to optimize the database",
      "Understand how many users are affected and why",
      "Immediately redesign the app",
      "Launch a new feature"
    ],
    correct: 1,
    explain: "Exactly! A PM should first understand the problem and its impact before jumping to a solution."
  },
  {
    q: "A user asks for a \u201cdark mode\u201d toggle. What's your best first move?",
    options: [
      "Add it immediately — it's a small ask",
      "Dig into WHY they want it — eye strain, battery life, or looks?",
      "Ignore it, one user isn't representative",
      "Add it to the public roadmap without digging further"
    ],
    correct: 1,
    explain: "Right! Feature requests are solutions in disguise — good PMs dig for the need underneath."
  },
  {
    q: "You've got 3 ready-to-build features: one loved by 5% of power users, one requested weekly in support tickets, and one that could unlock a new market. How do you decide?",
    options: [
      "Build whichever is fastest to ship",
      "Weigh impact, effort, and strategic fit — not just gut feel",
      "Let engineering pick",
      "Build all three at once"
    ],
    correct: 1,
    explain: "Spot on! Prioritization balances impact, effort, and strategy — not just who's loudest."
  },
  {
    q: "Daily signups are up 40%, but 90% of new users stop using the app after day 2. What should worry you more?",
    options: [
      "The signup growth — it's a great trend",
      "The day-2 drop-off — growth means little if no one sticks around",
      "Neither, both numbers are just noise",
      "Marketing spend"
    ],
    correct: 1,
    explain: "Exactly! Vanity metrics like signups can hide the real story — retention tells you if you're building something people want."
  },
  {
    q: "You want to know if people will actually pay for a new premium feature before building it. What's the smartest first step?",
    options: [
      "Build the full feature and launch it",
      "Create a simple landing page or fake-door test to gauge interest",
      "Ask two friends what they think",
      "Skip testing and trust your gut"
    ],
    correct: 1,
    explain: "Nice! Testing demand before building saves months of wasted engineering — that's MVP thinking in action."
  }
];

let qzCurrent = 0;
let qzScore = 0;
let qzLocked = false;
let qzLeadInfo = null;

function qzTrack(name, data){
  // No analytics platform detected in this codebase — stub for now.
  console.log('[quiz_event]', name, data || {});
}

function qzShow(id){
  document.querySelectorAll('#qz-overlay .qz-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const overlay = document.getElementById('qz-overlay');
  if (overlay) overlay.scrollTop = 0;
}

function qzCloseOverlay(){
  const overlay = document.getElementById('qz-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

/* ═══ Gate ═══ */
function qzBeginFlow(){
  qzTrack('lead_form_started');
  qzShow('qz-lead');
}
function qzLaunchQuiz(){
  qzTrack('quiz_started');
  qzCurrent = 0; qzScore = 0;
  qzRenderQuestion();
  qzShow('qz-quiz');
}
function qzSkip(){
  qzTrack('quiz_skipped');
  qzCloseOverlay();
}

/* ═══ Quiz ═══ */
function qzRenderQuestion(){
  qzLocked = false;
  const item = QZ_QUESTIONS[qzCurrent];
  document.getElementById('qz-count').textContent = `Question ${qzCurrent+1} of ${QZ_QUESTIONS.length}`;
  document.getElementById('qz-bar-fill').style.width = `${(qzCurrent/QZ_QUESTIONS.length)*100 + 10}%`;

  const dots = document.getElementById('qz-dots');
  dots.innerHTML = '';
  for(let i=0;i<QZ_QUESTIONS.length;i++){
    const d = document.createElement('span');
    d.className = 'qz-dot' + (i<qzCurrent?' done':'') + (i===qzCurrent?' current':'');
    dots.appendChild(d);
  }

  document.getElementById('qz-q').textContent = item.q;
  const optWrap = document.getElementById('qz-options');
  optWrap.innerHTML = '';
  const letters = ['A','B','C','D'];
  item.options.forEach((opt, idx) => {
    const el = document.createElement('button');
    el.className = 'qz-opt';
    el.innerHTML = `<span class="qz-opt-letter">${letters[idx]}</span><span class="qz-opt-text">${opt}</span>`;
    el.onclick = () => qzSelectAnswer(idx, el);
    optWrap.appendChild(el);
  });

  document.getElementById('qz-explain').classList.remove('show');
  document.getElementById('qz-continue-btn').classList.remove('show');
}

function qzSelectAnswer(idx, el){
  if(qzLocked) return;
  qzLocked = true;
  const item = QZ_QUESTIONS[qzCurrent];
  const correct = idx === item.correct;
  if(correct) qzScore++;

  qzTrack('quiz_question_answered', { question: qzCurrent+1, correct });

  document.querySelectorAll('#qz-options .qz-opt').forEach((node, i) => {
    node.classList.add('locked');
    if(i === item.correct) node.classList.add('correct');
    else if(i === idx) node.classList.add('incorrect');
    else node.classList.add('dim');
  });

  if(!correct) el.classList.add('qz-shake');

  const explainBox = document.getElementById('qz-explain');
  explainBox.textContent = item.explain;
  explainBox.classList.add('show');

  const btn = document.getElementById('qz-continue-btn');
  btn.textContent = qzCurrent === QZ_QUESTIONS.length - 1 ? 'See my result →' : 'Continue →';
  btn.classList.add('show');
}

function qzNext(){
  qzCurrent++;
  if(qzCurrent >= QZ_QUESTIONS.length){
    qzShowResult();
  } else {
    qzRenderQuestion();
    qzShow('qz-quiz');
  }
}

/* ═══ Result ═══ */
function qzShowResult(){
  qzTrack('quiz_completed', { score: qzScore, total: QZ_QUESTIONS.length });
  document.getElementById('qz-result-score').textContent = `${qzScore}/${QZ_QUESTIONS.length}`;
  let msg, emoji;
  if(qzScore === 5){ msg = "PM instincts unlocked! \uD83D\uDE80"; emoji = "🚀"; }
  else if(qzScore >= 3){ msg = "Great start! You already think like a PM."; emoji = "🎉"; }
  else { msg = "Every great PM starts somewhere. Keep learning!"; emoji = "🌱"; }
  document.getElementById('qz-result-msg').textContent = msg;
  document.getElementById('qz-result-emoji').textContent = emoji;
  qzShow('qz-result');
}

/* ═══ Lead form (gate — must pass before the quiz unlocks) ═══ */
function qzValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

async function qzSubmitLead(){
  const nameEl = document.getElementById('qz-f-name');
  const emailEl = document.getElementById('qz-f-email');
  const phoneEl = document.getElementById('qz-f-phone');
  let ok = true;

  if(nameEl.value.trim() === ''){
    nameEl.classList.add('err'); document.getElementById('qz-err-name').classList.add('show'); ok = false;
  } else { nameEl.classList.remove('err'); document.getElementById('qz-err-name').classList.remove('show'); }

  if(!qzValidEmail(emailEl.value.trim())){
    emailEl.classList.add('err'); document.getElementById('qz-err-email').classList.add('show'); ok = false;
  } else { emailEl.classList.remove('err'); document.getElementById('qz-err-email').classList.remove('show'); }

  if(!ok) return;

  document.getElementById('qz-error-banner').classList.remove('show');
  const btn = document.getElementById('qz-submit-btn');
  btn.disabled = true;
  document.getElementById('qz-submit-text').textContent = 'Submitting…';

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const phone = phoneEl.value.trim();
  const timestamp = (typeof nowIST === 'function') ? nowIST() : new Date().toISOString();

  qzLeadInfo = { name, email, phone, timestamp };

  try {
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: QZ_CFG.web3forms_key,
        subject: `🎮 New Quiz Lead — ${name}`,
        from_name: 'PMpathshala Quiz',
        name, email, phone,
        source: 'PMPathshala Interactive Quiz',
        timestamp,
        status: 'QUIZ_LEAD_CAPTURED — Quiz not yet completed',
        message: [
          `🎮 NEW QUIZ LEAD`,
          `────────────────────────`,
          `Name      : ${name}`,
          `Email     : ${email}`,
          `Phone     : ${phone || '—'}`,
          `Timestamp : ${timestamp} IST`,
          `Status    : Quiz unlocked — awaiting completion`,
          `────────────────────────`,
        ].join('\n'),
      })
    });
    qzTrack('lead_form_submitted', qzLeadInfo);
    btn.disabled = false;
    document.getElementById('qz-submit-text').textContent = 'Start the Quiz →';
    qzLaunchQuiz();
  } catch(err){
    console.warn('Web3Forms (quiz lead):', err);
    btn.disabled = false;
    document.getElementById('qz-submit-text').textContent = 'Start the Quiz →';
    document.getElementById('qz-error-banner').classList.add('show');
  }
}

/* ═══ Init ═══ */
document.addEventListener('DOMContentLoaded', function(){
  // Don't show the gate on top of a PhonePe payment-return landing —
  // that flow (handlePaymentReturn in enroll.js) takes priority.
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    const overlay = document.getElementById('qz-overlay');
    if (overlay) overlay.style.display = 'none';
    return;
  }
  document.body.style.overflow = 'hidden';
});
