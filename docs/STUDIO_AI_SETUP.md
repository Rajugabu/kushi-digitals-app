# Studio AI generation setup

The `/studio` frontend sends the selected style ID, ratio, and one or two source files as multipart form data to the `generate-studio-design` Supabase Edge Function. A verified Supabase user session is required. Source files are sent directly to the configured provider and are not placed in a public bucket. The generated output is stored in the private `studio-results` bucket and returned through short-lived signed preview and download URLs.

## Apply database and Storage setup

Apply the migration before deploying the function:

```bash
supabase db push
```

The migration creates:

- `public.studio_generations`, with authenticated-user ownership and job status metadata for new credit-backed requests.
- `public.studio_credit_accounts` and `public.studio_credit_transactions`, which are isolated from the monetary earnings wallet.
- Service-role-only atomic reserve, finalize, release, reconciliation, and manual-add credit functions.
- A private `studio-results` Storage bucket.
- An authenticated read policy restricted to each user's top-level output folder. The Edge Function uses the service role only on the server and creates signed URLs for immediate Studio previews.

Input photos are not stored by this implementation. The `source_photo_1_path` and `source_photo_2_path` columns are reserved for a future private-input workflow if a different provider requires URL-based inputs.

## Configure Edge Function secrets

Required:

```bash
supabase secrets set OPENAI_API_KEY=your_server_side_key
```

Recommended production configuration:

```bash
supabase secrets set STUDIO_ALLOWED_ORIGINS=https://your-domain.example
supabase secrets set STUDIO_RATE_LIMIT_SALT=replace_with_a_long_random_value
```

Optional configuration:

```bash
supabase secrets set STUDIO_AI_PROVIDER=openai
supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-2
supabase secrets set STUDIO_PROVIDER_TIMEOUT_MS=240000
supabase secrets set RAZORPAY_API_TIMEOUT_MS=8000
supabase secrets set STUDIO_SIGNED_URL_SECONDS=3600
supabase secrets set STUDIO_RATE_LIMIT_MAX_REQUESTS=3
supabase secrets set STUDIO_RATE_LIMIT_WINDOW_MINUTES=15
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge Functions by Supabase. Never copy `OPENAI_API_KEY` or the service-role key into the Vite environment or React source.

For multiple production origins, use a comma-separated `STUDIO_ALLOWED_ORIGINS` value. When the variable is omitted, the function returns permissive CORS headers for setup compatibility; configure it before production launch.

## Deploy

```bash
supabase functions deploy generate-studio-design
```

The function requires the caller's user JWT and verifies it again with `auth.getUser()` before creating a generation. The service-role key, provider key, trusted prompts, credit price, database writes, and Storage writes remain server-side.

## Request contract

`POST /functions/v1/generate-studio-design`

Content type: `multipart/form-data`

- `styleId`: an ID recognized by the server-side preset map.
- `ratio`: a ratio allowed by that preset.
- `photo1`: required JPG, JPEG, PNG, or WEBP, maximum 20 MB.
- `photo2`: required only for two-image presets, maximum 20 MB.

Credit amounts are never accepted from the browser. The trusted server preset charges 3 credits for every one-photo style and 4 credits for every two-photo style. One credit is displayed as ₹13.

The server verifies the declared MIME type and image file signature. Browser-provided prompts, provider models, prices, file paths, and output URLs are never trusted.

Successful response:

```json
{
  "success": true,
  "generationId": "uuid",
  "status": "completed",
  "outputUrl": "short-lived signed preview URL",
  "downloadUrl": "short-lived signed attachment URL",
  "outputPath": "private storage path",
  "outputUrlExpiresAt": "ISO timestamp",
  "styleId": "digital-painting-forest-green",
  "ratio": "2:3",
  "createdAt": "ISO timestamp",
  "creditsCharged": 3,
  "availableCredits": 7,
  "metadata": {
    "provider": "openai",
    "model": "gpt-image-2",
    "width": 2336,
    "height": 3504,
    "format": "png",
    "generationMode": "single_portrait_style",
    "upscale": {
      "requested": true,
      "applied": false,
      "status": "not_configured"
    }
  }
}
```

Error response:

```json
{
  "success": false,
  "generationId": null,
  "code": "PROVIDER_NOT_CONFIGURED",
  "message": "Real AI generation is not configured yet. Add the server-side provider secret and try again.",
  "retryable": false
}
```

## Provider and preset architecture

Public display configuration lives in `src/config/studioStyles.js`. It exposes only a preset key and logical generation mode. Trusted prompts, file counts, allowed ratios, quality settings, and output instructions live in `supabase/functions/_shared/style-presets.ts`.

The provider interface is defined in `supabase/functions/_shared/providers/types.ts`. `openai-image.ts` is the first adapter. A future provider can implement the same `ImageProvider` interface and be selected in `providers/index.ts` without changing React.

The current adapter uses a synchronous image-edit request, so frontend polling is not used. The function returns only after the provider output has been saved and both signed URLs exist.

## Upscaling and credits

The Edge Function contains an explicit upscale extension point between provider generation and Storage upload. No upscaler is configured yet, and the response says `applied: false`.

Each request creates a new generation row, then atomically reserves the trusted credit cost before provider construction or the OpenAI request. A completed provider call, Storage upload, signed-link creation, and generation record update are followed by atomic finalization. Any failure before finalization attempts the idempotent release function and removes an unfinalized output only after the database confirms release. If release cannot be confirmed, the generation remains failed with reserved credits and returns `STUDIO_CREDIT_REFUND_PENDING` so `reconcile_studio_generation_credits` can safely release them later. Regenerate starts a new generation and therefore charges again.

The OpenAI provider timeout is 240 seconds. The installed `@supabase/functions-js` 2.110.7 client documents and implements the `timeout` invoke option; the frontend allows 330 seconds for upload, provider work, Storage, database finalization, and response overhead. A browser timeout, lost connection, or page navigation only stops the browser from waiting. It does not prove that the backend generation stopped, and it must not be treated as a cancellation or automatic refund.

Authenticated users receive SELECT-only access to their own Studio credit account and transactions through RLS. The mutation functions are revoked from `public`, `anon`, and `authenticated`, and granted only to `service_role`. `wallet_accounts` and `wallet_transactions` remain the separate monetary earnings/withdrawal system.

The `manual_add` mode of `add_studio_credits` is for controlled testing and audited administrative grants only. Supply a unique admin-event idempotency key so retries cannot add credits twice.

Customer credit purchases require a server-side Razorpay webhook that verifies the webhook signature, payment status, currency, amount, and provider event/payment ID before calling the service-role credit function with an idempotency key. Never credit a Studio account from a frontend callback, redirect parameter, or other unverified client payment response.

## Razorpay Studio credit purchases (Test Mode)

Studio credit purchases use dedicated tables and do not read from or write to `wallet_accounts` or `wallet_transactions`:

- `studio_credit_packs` is the server-controlled catalogue. The seeded packs are `starter-3` (3 credits, ₹39 / 3900 paise), `couple-4` (4 credits, ₹52 / 5200 paise), and `value-10` (10 credits, ₹130 / 13000 paise).
- `studio_credit_purchases` stores the authenticated owner, immutable pack/credit/amount/currency snapshots, Razorpay references, and fulfilment state.
- `studio_payment_webhook_events` stores only the Razorpay event ID, event type, safe order/payment references, a SHA-256 payload hash, and processing status. Full webhook bodies are not retained.
- `fulfill_studio_credit_purchase` locks the purchase and calls `add_studio_credits` with `razorpay:payment:<payment_id>`. Checkout verification and webhook delivery therefore share the same atomic idempotency boundary.
- `process_studio_razorpay_webhook` claims an event, locks the purchase, validates the trusted snapshots, fulfils or flags the purchase, and marks the event processed in one database transaction. Concurrent delivery, `payment.captured` plus `order.paid`, and retries cannot add credits twice. A reused event ID with a different payload hash is rejected.

The browser submits only a pack ID. It cannot submit or override credits, rupees, paise, or currency, cannot call either credit-mutation RPC, and cannot insert or update purchase rows.

### Apply the payment migration manually

Run these only after reviewing the migration. They are listed in the required order and are not part of application startup:

```powershell
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

The payment migration is `supabase/migrations/202608040002_studio_razorpay_payments.sql` and must run after `202608040001_studio_credit_system.sql` because its fulfilment function calls the existing service-role-only Studio credit function.

### Required Razorpay secrets

Create or open a Razorpay account in **Test Mode**, obtain the Test Key ID and Test Key Secret, and create a separate webhook secret. Set them only in Supabase Edge Function secrets:

```powershell
npx supabase secrets set "RAZORPAY_KEY_ID=rzp_test_REPLACE_ME"
npx supabase secrets set "RAZORPAY_KEY_SECRET=REPLACE_ME"
npx supabase secrets set "RAZORPAY_WEBHOOK_SECRET=REPLACE_ME"
```

`RAZORPAY_MODE` defaults to `test`. It may be set explicitly to `test`, but it is not required for Test Mode. The server rejects a key whose `rzp_test_` or `rzp_live_` prefix does not match the configured mode. Never place the Key Secret or webhook secret in a `VITE_*` variable, React code, browser request, log, or source map. The public Key ID alone is returned by the order-creation function for Razorpay Checkout.

In Razorpay Test Mode, configure payment capture to **Automatic** in the Dashboard payment-capture settings. An `authorized` payment is not enough to add Studio credits; verification returns `capture_pending` until Razorpay reports `captured`.

Every server-to-server Razorpay API request has an abort timeout. It defaults to 8 seconds and can be adjusted with `RAZORPAY_API_TIMEOUT_MS` (accepted range: 1-30 seconds). A timeout returns the sanitized, retryable `RAZORPAY_API_TIMEOUT` error. Checkout verification still fetches the payment directly from Razorpay and requires a captured INR payment before fulfilment.

The signed capture-webhook path intentionally does not fetch the payment from Razorpay. It validates the signed payment entity and invokes the single transactional `process_studio_razorpay_webhook` RPC so the endpoint stays fast enough for provider retries. Invalid signatures are rejected before JSON parsing or any database call.

### Deploy the three payment functions manually

`supabase/config.toml` explicitly enables JWT verification for the two authenticated functions and disables it only for the Razorpay-signed webhook. Deploy with the checked-in configuration:

```powershell
npx supabase functions deploy create-studio-credit-order
npx supabase functions deploy verify-studio-credit-payment
npx supabase functions deploy razorpay-studio-webhook
```

The config's `verify_jwt = false` applies **only** to `razorpay-studio-webhook`, because Razorpay cannot send a Supabase user JWT. Do not disable verification for `create-studio-credit-order`, `verify-studio-credit-payment`, or `generate-studio-design`. The webhook still authenticates every request by checking Razorpay's HMAC signature over the exact raw request body.

### Razorpay Dashboard webhook configuration

In Razorpay Dashboard, switch to **Test Mode**, open **Accounts & Settings → Webhooks** (the label can vary slightly by Dashboard version), and add:

- URL: `https://kzoqlvcxwaqsabxqqpkm.supabase.co/functions/v1/razorpay-studio-webhook`
- Secret: the exact value stored as `RAZORPAY_WEBHOOK_SECRET`
- Active events: `payment.captured`, `order.paid`, and `payment.failed`
- Refund/manual-review events: `refund.created`, `refund.processed`, `refund.failed`, `payment.dispute.created`, `payment.dispute.action_required`, `payment.dispute.won`, and `payment.dispute.lost`

Do not configure Basic Auth for this endpoint. The Razorpay signature and `x-razorpay-event-id` headers provide authentication and event idempotency. Keep the webhook active only for the intended Test Mode account while testing.

### Test Mode verification

1. Sign in to Kushi Digitals and open `/studio`.
2. Select **Buy Credits** and confirm all three packs display values returned from `studio_credit_packs`.
3. Complete a Test Mode payment using a Razorpay-documented test payment method.
4. Confirm the UI shows “Verifying” before it shows credits added. A Checkout handler response alone must never change the balance.
5. Confirm the purchase becomes `credited`, the account's `available_credits` and `lifetime_purchased` increase by the pack snapshot, and exactly one `purchase` ledger row uses the payment idempotency key.
6. Retry the same verification and resend both `payment.captured` and `order.paid`. The balance and ledger count must remain unchanged.
7. Test a failed payment, Checkout dismissal, invalid signature, and `authorized` payment. None may add credits.
8. Confirm another authenticated account cannot read or verify the first account's purchase.

If Checkout verification reports `capture_pending`, the purchase modal reads the authenticated user's purchase status about every 3 seconds for up to 90 seconds. A credited status triggers a fresh server-backed credit-account read before the UI callback. Closing the modal or leaving the component stops browser polling only; it does not cancel, refund, or otherwise alter the backend payment. If the 90-second window expires, the UI warns the customer not to pay again and offers **Refresh Status** for another status check.

### Refunds, disputes, and manual review

Refund and dispute webhook events never subtract Studio credits automatically because some or all purchased credits may already have been consumed. The webhook marks the purchase `refund_review`. An administrator must compare the Razorpay payment/refund, purchase, current credit account, purchase ledger entry, and generation usage before deciding on a compensating adjustment. Preserve the audit rows; do not delete or rewrite the immutable-style credit ledger.

### Reconciliation and duplicate-credit audits

Find captured-payment states that need investigation. Provider capture must be confirmed in Razorpay before a service-role reconciliation calls the fulfilment RPC:

```sql
select
  id,
  user_id,
  status,
  razorpay_order_id,
  razorpay_payment_id,
  amount_paise_snapshot,
  currency_snapshot,
  updated_at
from public.studio_credit_purchases
where status in ('order_created', 'capture_pending', 'failed')
order by updated_at;
```

Audit duplicate provider references and idempotency keys (both queries should return no rows):

```sql
select razorpay_payment_id, count(*)
from public.studio_credit_purchases
where razorpay_payment_id is not null
group by razorpay_payment_id
having count(*) > 1;

select idempotency_key, count(*)
from public.studio_credit_transactions
where idempotency_key like 'razorpay:payment:%'
group by idempotency_key
having count(*) > 1;
```

Reconcile purchases to their credit-ledger row:

```sql
select
  p.id as purchase_id,
  p.user_id,
  p.status,
  p.credits_snapshot,
  p.razorpay_payment_id,
  t.id as credit_transaction_id,
  t.credits as ledger_credits,
  t.created_at as ledger_created_at
from public.studio_credit_purchases p
left join public.studio_credit_transactions t
  on t.idempotency_key = 'razorpay:payment:' || p.razorpay_payment_id
where p.status in ('credited', 'refund_review')
  and (
    p.razorpay_payment_id is null
    or t.id is null
    or t.user_id <> p.user_id
    or t.credits <> p.credits_snapshot
    or t.transaction_type <> 'purchase'
  )
order by p.created_at;
```

### Live Mode checklist (future change only)

Do not switch this deployment to Live Mode until Test Mode verification, legal/payment policies, refund operations, monitoring, and an independent security review are complete. At go-live:

1. Create separate Live Mode API keys and a separate high-entropy Live webhook secret.
2. Create the same webhook in the Razorpay **Live Mode** Dashboard and verify its exact URL and enabled events.
3. Set `RAZORPAY_MODE=live` together with the `rzp_live_` Key ID, Live Key Secret, and Live webhook secret in one controlled maintenance window.
4. Redeploy the three reviewed functions; keep `--no-verify-jwt` limited to the webhook.
5. Run a small real payment and verify purchase, webhook, ledger, account, refunds, alerts, and reconciliation before opening purchases broadly.
6. Never reuse Test secrets in Live Mode or expose either mode's secrets to Vite.

## Local verification

```bash
npm test
npm run lint
npm run build
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_credit_security_checks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_credit_behavior_checks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_payment_security_checks.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_payment_behavior_checks.sql
```
