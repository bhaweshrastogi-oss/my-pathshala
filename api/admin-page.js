const { readJsonBody } = require('../lib/readBody');
const auth = require('../lib/adminAuth');
const APP_HTML = require('../lib/adminPage');

/**
 * /api/admin-page — the private waitlist tool.
 *  GET, signed in  -> the tool
 *  GET, otherwise  -> a bare sign-in box (no mention of what the tool does)
 *  POST {key}      -> checks ADMIN_KEY, sets an 8-hour HttpOnly cookie
 *  POST {logout}   -> clears the cookie
 */
const LOGIN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Sign in</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3f2fb;font-family:system-ui,sans-serif}form{background:#fff;padding:28px;border-radius:16px;width:min(340px,90vw)}input{width:100%;padding:11px 12px;border:1px solid #d3d1ee;border-radius:10px;font:inherit;box-sizing:border-box}button{margin-top:12px;width:100%;border:0;border-radius:999px;padding:12px;background:#4f46e5;color:#fff;font:inherit;font-weight:600;cursor:pointer}p{color:#b91c1c;font-size:13px;min-height:18px;margin:10px 0 0}</style></head>
<body><form id="f"><input id="k" type="password" placeholder="Key" autocomplete="off" aria-label="Key" autofocus><button>Continue</button><p id="e" role="alert"></p></form>
<script>document.getElementById('f').onsubmit=function(ev){ev.preventDefault();fetch('/api/admin-page',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:document.getElementById('k').value})}).then(function(r){if(r.ok)location.reload();else document.getElementById('e').textContent='Not accepted.'})}</script></body></html>`;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(auth.hasValidSession(req) ? APP_HTML : LOGIN_HTML);
  }
  if (req.method === 'POST') {
    const body = await readJsonBody(req).catch(() => ({}));
    if (body.logout) {
      res.setHeader('Set-Cookie', auth.clearCookie());
      res.statusCode = 200;
      return res.end('{}');
    }
    if (!auth.keyMatches(body.key)) {
      await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
      res.statusCode = 401;
      return res.end('{}');
    }
    res.setHeader('Set-Cookie', auth.makeCookie());
    res.statusCode = 200;
    return res.end('{}');
  }
  res.statusCode = 405;
  return res.end();
};
