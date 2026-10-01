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
