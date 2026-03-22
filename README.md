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

See `.env.example` for a checklist.

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
