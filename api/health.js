/**
 * Sanity check: open GET https://<your-project>.vercel.app/api/health in the browser.
 * If this 404s, functions aren't being deployed (see README troubleshooting).
 */
module.exports = function health(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, service: 'pmpathshala-api' }));
};
