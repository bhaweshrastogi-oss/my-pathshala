/**
 * CORS + redirect URL allowlist (comma-separated full origins in CORS_ORIGINS).
 * Example: https://pmpathshala.com,https://www.pmpathshala.com,http://localhost:8888
 */

function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toOrigin(entry) {
  if (!entry) return '';
  if (entry === '*') return '*';
  try {
    const u = new URL(entry);
    return u.origin;
  } catch {
    return entry.replace(/\/$/, '');
  }
}

function sameOrigin(allowedEntry, requestOrigin) {
  if (allowedEntry === '*') return true;
  return toOrigin(allowedEntry) === requestOrigin;
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  const insecure = process.env.PHONEPE_ALLOW_INSECURE_CORS === '1';

  if (insecure && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (allowed.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowed.some((a) => sameOrigin(a, origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function originAllowedForRedirect(urlOrigin) {
  const allowed = getAllowedOrigins().filter((a) => a !== '*');
  const insecure = process.env.PHONEPE_ALLOW_INSECURE_CORS === '1';

  if (allowed.length === 0) {
    return insecure;
  }

  return allowed.some((a) => toOrigin(a) === urlOrigin);
}

/**
 * redirectUrl must be https (or http://localhost) and its origin must match CORS_ORIGINS.
 */
function isRedirectAllowed(redirectUrl) {
  if (!redirectUrl || typeof redirectUrl !== 'string') return false;
  let u;
  try {
    u = new URL(redirectUrl);
  } catch {
    return false;
  }

  const isLocalhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(isLocalhost && u.protocol === 'http:')) {
    return false;
  }

  return originAllowedForRedirect(u.origin);
}

module.exports = {
  setCorsHeaders,
  isRedirectAllowed,
  getAllowedOrigins,
};
