/* ═══════════════════════════════════════════
   PMpathshala — main.js (shared utilities)
   ═══════════════════════════════════════════ */

// Nav toggle
function toggleNav() {
  document.getElementById('nav-links').classList.toggle('open');
}

// Cookie bar
function acceptCookie()  { _hideCookie(); localStorage.setItem('pm_cookie','1'); }
function declineCookie() { _hideCookie(); }
function _hideCookie()   {
  const b = document.getElementById('cookie-bar');
  if (b) b.classList.add('hidden');
}
(function() {
  if (localStorage.getItem('pm_cookie')) {
    const b = document.getElementById('cookie-bar');
    if (b) b.classList.add('hidden');
  }
})();

// Scroll-reveal (IntersectionObserver)
(function() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animation = `fadeUp 0.6s ${e.target.dataset.delay||'0s'} ease both`;
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => {
    el.style.opacity = '0';
    io.observe(el);
  });
})();

// Logo SVG (cubes icon matching brand)
const LOGO_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L7 5v5l5 3 5-3V5L12 2z" fill="rgba(255,255,255,0.9)"/>
  <path d="M7 10v5l5 3V13L7 10z" fill="rgba(255,255,255,0.6)"/>
  <path d="M17 10l-5 3v5l5-3v-5z" fill="rgba(255,255,255,0.75)"/>
</svg>`;

document.querySelectorAll('.logo-svg').forEach(el => el.innerHTML = LOGO_SVG);
