# PMpathshala — website + payment API

Static marketing site (HTML/JS/CSS) plus **Vercel serverless** functions under `/api` for **PhonePe Standard Checkout**.

You **cannot** put PhonePe `client_secret` in the browser. The flow is:

1. Browser → `POST /api/create-payment` (amount, order id, `redirect_url`, …)
2. Server → PhonePe OAuth + `checkout/v2/pay` → returns `redirectUrl`
3. Browser → redirects the user to PhonePe
4. After payment → PhonePe redirects to your `redirect_url` (e.g. `?payment=success`)
5. *(Recommended)* PhonePe **webhook** → `POST /api/phonepe-callback` for verified status

## Deploy on Vercel (recommended)

1. Import this repo in [Vercel](https://vercel.com).
2. **Disable** “Deployment Protection” for production (or payment calls get `401`).
3. **Environment variables** (Project → Settings → Environment Variables):

   | Variable | Description |
   |----------|-------------|
   | `PHONEPE_CLIENT_ID` | PhonePe Business → Developer Settings |
   | `PHONEPE_CLIENT_SECRET` | Same (server only) |
   | `PHONEPE_CLIENT_VERSION` | From PhonePe (often `1` in sandbox) |
   | `PHONEPE_ENV` | `sandbox` or `production` |
   | `CORS_ORIGINS` | Your site origins, comma-separated, e.g. `https://yourdomain.com,https://www.yourdomain.com` |
   | `PHONEPE_ALLOW_INSECURE_CORS` | Optional. `1` for local dev only — **never** in production |
   | `RESEND_API_KEY` | [Resend](https://resend.com) API key — **student** confirmation email after payment |
   | `RESEND_FROM` | Sender, e.g. `PMpathshala <onboarding@resend.dev>` (test) or verified domain sender in production |

4. PhonePe dashboard: set **webhook** to `https://<your-vercel-domain>/api/phonepe-callback`.

### Student confirmation email

After a successful payment, the browser calls `POST /api/send-confirmation`, which emails the **student** via **Resend** (if `RESEND_API_KEY` is set). Admin notifications still use **Web3Forms** from the browser. Without Resend keys, the endpoint returns `{ ok: true, skipped: true }` and the success page still works.

5. In `enroll.js`, **`BACKEND_URL`**:
   - `''` (empty) if the **same** Vercel project serves the HTML + `/api` (default).
   - Your full Vercel URL (e.g. `https://my-api.vercel.app`) if the site is on **GitHub Pages** and only the API is on Vercel.

See `env.example` for a checklist.

## GitHub Pages + API on Vercel

The included workflow deploys static files to Pages. Pages **do not** run `/api`. Set `BACKEND_URL` in `enroll.js` to your Vercel deployment URL and set `CORS_ORIGINS` to include your GitHub Pages origin.

## Local dev

```bash
npm i -g vercel
vercel dev
```

Use `CORS_ORIGINS` with `http://localhost:<port>` or enable `PHONEPE_ALLOW_INSECURE_CORS=1` on dev only.

## References

- [PhonePe — Authorisation](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/authorization)
- [PhonePe — Create payment](https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration/api-reference/create-payment)

## Secure payment fulfilment deployment

Checkout now requires durable Upstash Redis storage. Create an Upstash Redis database with eviction disabled, then set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel (never in frontend files). Orders contain purchaser contact details; restrict database access and define an appropriate retention policy. Do not flush the database while orders are outstanding.

Also configure `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL` (your notification inbox), `PHONEPE_WEBHOOK_USERNAME`, `PHONEPE_WEBHOOK_PASSWORD`, and a long random `CRON_SECRET`. Configure matching webhook credentials in PhonePe and point the webhook at `/api/phonepe-callback`. Missing required checkout configuration returns 503 before creating a payment.

The server generates the order ID and saves the buyer, course snapshot and charged price before contacting PhonePe. Confirmation requests accept only that reference; browser-supplied email/course/amount are ignored. Verified callbacks re-query PhonePe, require an exact numeric amount match, persist payment completion and send both student and admin emails. No browser Web3Forms message is proof of payment.

Duplicate callbacks are serialized with a Redis lock. Durable delivery flags avoid resending finished notifications; Resend idempotency keys cover short-term retries after an interrupted delivery. There is a rare crash window between email acceptance and storing its delivery flag: retries beyond Resend's 24-hour idempotency window can duplicate an email, but cannot change its recipient or payment amount.

The daily Vercel Cron at `/api/reconcile-payments` retries pending orders without an open browser (up to 10 per invocation). For higher volume, schedule it more often on a plan that supports it and monitor backlog/delivery failures. Do not treat daily recovery as an immediate notification SLA. Provider calls and Redis calls have finite timeouts; callback failures return 503 for provider retry. Check Vercel's Cron dashboard after deployment.

Rollout: old orders created before this change have no saved purchaser record. They deliberately cannot generate automatic confirmations through the new endpoint. Reconcile those orders against the PhonePe dashboard manually; never backfill buyer details from an untrusted browser request. Deploy the frontend and API together. If GitHub Pages serves the frontend, set `BACKEND_URL` to your Vercel origin before publishing. The supplied Pages workflow does not run serverless functions or Cron.

Validation: run `npm ci` and `npm test`; then use PhonePe sandbox to test a real checkout, close the browser after payment, verify webhook delivery to both inboxes, and replay the callback to confirm no duplicate notification. Test a failed payment and unavailable email provider before production rollout.
