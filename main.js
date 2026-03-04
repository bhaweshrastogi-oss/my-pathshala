/* ══════════════════════════════════════════════
   PMpathshala — Shared JavaScript
   ══════════════════════════════════════════════ */

// ── NAV TOGGLE ────────────────────────────────
function toggleNav() {
  document.getElementById('nav-links').classList.toggle('open');
}

// ── COOKIE BAR ────────────────────────────────
function closeCookie() {
  document.getElementById('cookie-bar').classList.add('hidden');
  localStorage.setItem('cookie_accepted', '1');
}
(function() {
  if (localStorage.getItem('cookie_accepted')) {
    const bar = document.getElementById('cookie-bar');
    if (bar) bar.classList.add('hidden');
  }
})();
