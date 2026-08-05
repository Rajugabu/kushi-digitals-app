import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  fetchRazorpayPayment,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../supabase/functions/_shared/razorpay.ts";
import { pollStudioPurchaseUntilTerminal } from "../src/utils/studioPaymentPolling.js";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio payment migration seeds only the three trusted integer-paise packs", async () => {
  const source = await readProjectFile(
    "supabase/migrations/202608040002_studio_razorpay_payments.sql",
  );

  assert.match(source, /create table if not exists public\.studio_credit_packs/);
  assert.match(source, /create table if not exists public\.studio_credit_purchases/);
  assert.match(source, /create table if not exists public\.studio_payment_webhook_events/);
  assert.match(source, /'starter-3'[\s\S]*?3,[\s\S]*?3900,[\s\S]*?'INR'/);
  assert.match(source, /'couple-4'[\s\S]*?4,[\s\S]*?5200,[\s\S]*?'INR'/);
  assert.match(source, /'value-10'[\s\S]*?10,[\s\S]*?13000,[\s\S]*?'INR'/);
  assert.match(source, /currency = 'INR'/);
  assert.match(source, /amount_paise_snapshot bigint not null/);
});

test("Studio purchase RLS is read-only for owners and fulfilment is service-role-only", async () => {
  const source = await readProjectFile(
    "supabase/migrations/202608040002_studio_razorpay_payments.sql",
  );

  assert.match(source, /alter table public\.studio_credit_purchases enable row level security/);
  assert.match(source, /using \(auth\.uid\(\) = user_id\)/);
  assert.match(source, /grant select on table public\.studio_credit_purchases to authenticated/);
  assert.match(source, /revoke all on table public\.studio_credit_purchases[\s\S]*?from public, anon, authenticated/);
  assert.match(source, /revoke all on table public\.studio_payment_webhook_events[\s\S]*?from public, anon, authenticated/);
  assert.match(source, /revoke all on function public\.fulfill_studio_credit_purchase\([\s\S]*?from public, anon, authenticated/);
  assert.match(source, /grant execute on function public\.fulfill_studio_credit_purchase\([\s\S]*?to service_role/);
  assert.doesNotMatch(
    source,
    /(?:alter|update|insert into|delete from)\s+(?:table\s+)?public\.wallet_(?:accounts|transactions)/i,
  );
});

test("atomic fulfilment locks purchases and uses payment-wide ledger idempotency", async () => {
  const source = await readProjectFile(
    "supabase/migrations/202608040002_studio_razorpay_payments.sql",
  );

  assert.match(source, /perform public\.require_studio_credit_service_role\(\)/);
  assert.match(source, /from public\.studio_credit_purchases[\s\S]*?for update/);
  assert.match(source, /STUDIO_PURCHASE_USER_MISMATCH/);
  assert.match(source, /STUDIO_PURCHASE_ORDER_MISMATCH/);
  assert.match(source, /STUDIO_PURCHASE_AMOUNT_MISMATCH/);
  assert.match(source, /STUDIO_PURCHASE_CURRENCY_MISMATCH/);
  assert.match(source, /STUDIO_PURCHASE_PAYMENT_CONFLICT/);
  assert.match(source, /'razorpay:payment:' \|\| p_razorpay_payment_id/);
  assert.match(source, /public\.add_studio_credits\(/);
  assert.match(source, /'purchase'/);
  assert.match(source, /status = 'credited'/);
});

test("order creation authenticates before accepting only a trusted active pack ID", async () => {
  const [source, razorpayUtility] = await Promise.all([
    readProjectFile("supabase/functions/create-studio-credit-order/index.ts"),
    readProjectFile("supabase/functions/_shared/razorpay.ts"),
  ]);
  const authentication = source.indexOf("getRequiredPaymentUser(");
  const bodyRead = source.indexOf("request.json()", authentication);
  const packQuery = source.indexOf('.from("studio_credit_packs")', bodyRead);
  const purchaseInsert = source.indexOf('.from("studio_credit_purchases")', packQuery);
  const providerOrder = source.indexOf("createRazorpayOrder(", purchaseInsert);

  assert.ok(authentication >= 0 && authentication < bodyRead);
  assert.ok(bodyRead < packQuery && packQuery < purchaseInsert);
  assert.ok(purchaseInsert < providerOrder);
  assert.match(source, /key !== "packId"/);
  assert.match(source, /UNTRUSTED_PAYMENT_FIELDS/);
  assert.match(source, /\.eq\("active", true\)/);
  assert.match(source, /amount: amountPaise/);
  assert.match(source, /currency: "INR"/);
  assert.match(razorpayUtility, /partial_payment: false/);
  assert.doesNotMatch(source, /body\.(?:amount|credits|currency)/);
});

test("Checkout verification rejects ownership, signature, order, payment, amount and currency mismatches", async () => {
  const source = await readProjectFile(
    "supabase/functions/verify-studio-credit-payment/index.ts",
  );

  assert.match(source, /\.eq\("user_id", user\.id\)/);
  assert.match(source, /input\.checkoutOrderId !== purchase\.razorpay_order_id/);
  assert.match(source, /verifyCheckoutSignature\([\s\S]*?purchase\.razorpay_order_id/);
  assert.match(source, /INVALID_RAZORPAY_SIGNATURE/);
  assert.match(source, /payment\.order_id !== purchase\.razorpay_order_id/);
  assert.match(source, /payment\.id !== input\.paymentId/);
  assert.match(source, /RAZORPAY_PAYMENT_AMOUNT_MISMATCH/);
  assert.match(source, /RAZORPAY_PAYMENT_CURRENCY_MISMATCH/);
  assert.match(source, /payment\.status === "authorized"/);
  assert.match(source, /status: "capture_pending"/);
  assert.match(source, /payment\.status !== "captured"/);
  assert.match(source, /fulfill_studio_credit_purchase/);
});

test("webhook verifies exact raw body before parsing and records event idempotency", async () => {
  const source = await readProjectFile(
    "supabase/functions/razorpay-studio-webhook/index.ts",
  );
  const rawRead = source.indexOf("await request.text()");
  const signatureCheck = source.indexOf("verifyWebhookSignature(", rawRead);
  const jsonParse = source.indexOf("JSON.parse(rawBody)", signatureCheck);

  assert.ok(rawRead >= 0 && rawRead < signatureCheck);
  assert.ok(signatureCheck < jsonParse);
  assert.match(source, /x-razorpay-signature/);
  assert.match(source, /x-razorpay-event-id/);
  assert.match(source, /INVALID_WEBHOOK_SIGNATURE/);
  assert.match(source, /payload_sha256/);
  assert.match(source, /payment\.captured/);
  assert.match(source, /order\.paid/);
  assert.match(source, /payment\.failed/);
  assert.match(source, /refund\.failed/);
  assert.match(source, /payment\.dispute\.action_required/);
  assert.match(source, /process_studio_razorpay_webhook/);
  assert.equal(
    (source.match(/adminClient\.rpc\(/g) || []).length,
    1,
    "webhook must use exactly one transactional database RPC",
  );
  assert.doesNotMatch(source, /fetchRazorpayPayment|getRazorpayApiConfig/);
});

test("Razorpay API requests abort with a sanitized retryable timeout", async () => {
  const originalDeno = globalThis.Deno;
  const originalFetch = globalThis.fetch;

  globalThis.Deno = {
    env: {
      get: (name) => name === "RAZORPAY_API_TIMEOUT_MS" ? "1000" : undefined,
    },
  };
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });

  try {
    await assert.rejects(
      fetchRazorpayPayment(
        { keyId: "rzp_test_public", keySecret: "server-secret" },
        "pay_timeouttest",
      ),
      (error) => {
        assert.equal(error.code, "RAZORPAY_API_TIMEOUT");
        assert.equal(error.status, 504);
        assert.equal(error.retryable, true);
        assert.doesNotMatch(error.message, /server-secret|Basic/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = originalDeno;
  }
});

test("Web Crypto HMAC accepts a known vector and rejects tampered signatures", async () => {
  const payload = "The quick brown fox jumps over the lazy dog";
  const secret = "key";
  const knownHmac =
    "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8";

  assert.equal(
    await verifyWebhookSignature(payload, knownHmac, secret),
    true,
  );
  assert.equal(
    await verifyWebhookSignature(`${payload}.`, knownHmac, secret),
    false,
  );

  const orderId = "order_KnownVector1";
  const paymentId = "pay_KnownVector1";
  const checkoutSecret = "checkout-secret";
  const checkoutSignature = createHmac("sha256", checkoutSecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  assert.equal(
    await verifyCheckoutSignature(
      orderId,
      paymentId,
      checkoutSignature,
      checkoutSecret,
    ),
    true,
  );
  assert.equal(
    await verifyCheckoutSignature(
      orderId,
      `${paymentId}tampered`,
      checkoutSignature,
      checkoutSecret,
    ),
    false,
  );
});

test("atomic webhook RPC locks, deduplicates and rejects event hash conflicts", async () => {
  const source = await readProjectFile(
    "supabase/migrations/202608050001_fix_studio_razorpay_webhook_event_claim.sql",
  );

  assert.match(source, /create or replace function public\.process_studio_razorpay_webhook/);
  assert.match(source, /language plpgsql[\s\S]*?security definer[\s\S]*?set search_path = public, auth, pg_temp/);
  assert.match(source, /perform public\.require_studio_credit_service_role\(\)/);
  assert.match(source, /on conflict \(event_id\) do nothing/);
  assert.match(source, /if v_is_new is not true then/);
  assert.doesNotMatch(source, /if not v_is_new then/);
  assert.match(source, /from public\.studio_payment_webhook_events[\s\S]*?for update/);
  assert.match(source, /from public\.studio_credit_purchases[\s\S]*?for update/);
  assert.match(source, /RAZORPAY_WEBHOOK_EVENT_HASH_CONFLICT/);
  assert.match(source, /public\.fulfill_studio_credit_purchase\(/);
  assert.match(source, /processing_status = 'processed'/);
  assert.match(source, /exception when others then/);
  assert.match(source, /'refund\.failed'/);
  assert.match(source, /'payment\.dispute\.action_required'/);
  assert.match(source, /revoke all on function public\.process_studio_razorpay_webhook\([\s\S]*?from public, anon, authenticated/);
  assert.match(source, /grant execute on function public\.process_studio_razorpay_webhook\([\s\S]*?to service_role/);
});

test("capture-pending polling reaches credited without trusting a browser balance", async () => {
  const statuses = [
    { id: "purchase-1", status: "capture_pending", credits: 3 },
    { id: "purchase-1", status: "credited", credits: 3 },
  ];
  let calls = 0;
  const result = await pollStudioPurchaseUntilTerminal({
    fetchStatus: async () => statuses[Math.min(calls++, statuses.length - 1)],
    now: () => 0,
    wait: async () => true,
  });

  assert.equal(result.status, "credited");
  assert.equal(result.timedOut, false);
  assert.equal(calls, 2);
  assert.equal("availableCredits" in result, false);
});

test("capture-pending polling times out and supports abort cleanup", async () => {
  let clock = 0;
  let timeoutCalls = 0;
  const timedOut = await pollStudioPurchaseUntilTerminal({
    fetchStatus: async () => {
      timeoutCalls += 1;
      return { id: "purchase-2", status: "capture_pending", credits: 4 };
    },
    timeoutMs: 90_000,
    now: () => {
      const value = clock;
      clock = 90_001;
      return value;
    },
    wait: async () => true,
  });

  assert.equal(timedOut.timedOut, true);
  assert.equal(timeoutCalls, 1);

  const controller = new AbortController();
  let abortCalls = 0;
  const aborted = await pollStudioPurchaseUntilTerminal({
    fetchStatus: async () => {
      abortCalls += 1;
      return { id: "purchase-3", status: "capture_pending", credits: 3 };
    },
    signal: controller.signal,
    now: () => 0,
    wait: async () => {
      controller.abort();
      return false;
    },
  });

  assert.equal(aborted.aborted, true);
  assert.equal(abortCalls, 1);
});

test("polling recovery reloads server balance and is cancelled on modal cleanup", async () => {
  const [component, service] = await Promise.all([
    readProjectFile("src/components/studio/StudioCreditPurchase.jsx"),
    readProjectFile("src/services/studioPaymentService.js"),
  ]);
  const creditedStatus = component.indexOf('purchase.status === "credited"');
  const balanceReload = component.indexOf("getStudioCreditBalance()", creditedStatus);
  const callback = component.indexOf("onCreditsAdded(recoveredResult)", balanceReload);

  assert.ok(creditedStatus >= 0 && creditedStatus < balanceReload);
  assert.ok(balanceReload < callback);
  assert.match(component, /pollingControllerRef\.current\?\.abort\(\)/);
  assert.match(component, /stopCapturePolling\(\)/);
  assert.match(component, /Do not pay again/);
  assert.match(component, /Refresh Status/);
  assert.match(service, /\.from\("studio_credit_purchases"\)[\s\S]*?\.select\(/);
  assert.doesNotMatch(service, /getStudioPurchaseStatus[\s\S]*?\.(?:insert|update|delete)\(/);
});

test("Supabase function config enables JWT only for user-facing payment functions", async () => {
  const source = await readProjectFile("supabase/config.toml");

  assert.match(source, /\[functions\.create-studio-credit-order\][\s\S]*?verify_jwt = true/);
  assert.match(source, /\[functions\.verify-studio-credit-payment\][\s\S]*?verify_jwt = true/);
  assert.match(source, /\[functions\.razorpay-studio-webhook\][\s\S]*?verify_jwt = false/);
});

test("shared Razorpay utility uses Web Crypto and keeps every secret server-side", async () => {
  const [serverSource, frontendSource] = await Promise.all([
    readProjectFile("supabase/functions/_shared/razorpay.ts"),
    readProjectFile("src/services/studioPaymentService.js"),
  ]);

  assert.match(serverSource, /RAZORPAY_KEY_ID/);
  assert.match(serverSource, /RAZORPAY_KEY_SECRET/);
  assert.match(serverSource, /RAZORPAY_WEBHOOK_SECRET/);
  assert.match(serverSource, /crypto\.subtle\.importKey/);
  assert.match(serverSource, /crypto\.subtle\.sign/);
  assert.match(serverSource, /timingSafeHexEqual/);
  assert.match(serverSource, /\/payments\/\$\{encodeURIComponent\(paymentId\)\}/);
  assert.doesNotMatch(frontendSource, /RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET/);
  assert.doesNotMatch(frontendSource, /add_studio_credits|fulfill_studio_credit_purchase/);
  assert.doesNotMatch(frontendSource, /\.from\("studio_credit_(?:accounts|transactions|purchases)"\)\s*\.(?:insert|update|delete)/);
});

test("SQL behavior checks cover both fulfilment arrival orders and mismatch rejection", async () => {
  const source = await readProjectFile(
    "supabase/tests/studio_payment_behavior_checks.sql",
  );

  assert.match(source, /Duplicate Checkout verification was not idempotent/);
  assert.match(source, /Webhook followed by Checkout verification double-credited/);
  assert.match(source, /Checkout verification followed by webhook double-credited/);
  assert.match(source, /Amount mismatch was accepted/);
  assert.match(source, /Currency mismatch was accepted/);
  assert.match(source, /Order mismatch was accepted/);
  assert.match(source, /Atomic capture webhook did not credit the purchase/);
  assert.match(source, /Duplicate atomic capture event was not idempotent/);
  assert.match(source, /order\.paid after payment\.captured was not credit-idempotent/);
  assert.match(source, /expected 23514/);
  assert.match(source, /Concurrent-style capture events created duplicate ledger rows/);
  assert.match(source, /rollback;/);
});

test("Studio payment documentation keeps JWT bypass limited to the signed webhook", async () => {
  const source = await readProjectFile("docs/STUDIO_AI_SETUP.md");

  assert.match(source, /supabase\/config\.toml/);
  assert.match(source, /verify_jwt = false[^\n]*applies \*\*only\*\* to `razorpay-studio-webhook`/i);
  assert.match(source, /payment\.captured/);
  assert.match(source, /order\.paid/);
  assert.match(source, /payment\.failed/);
  assert.match(source, /refund\.failed/);
  assert.match(source, /payment\.dispute\.action_required/);
  assert.match(source, /https:\/\/kzoqlvcxwaqsabxqqpkm\.supabase\.co\/functions\/v1\/razorpay-studio-webhook/);
  assert.match(source, /RAZORPAY_KEY_ID=rzp_test_REPLACE_ME/);
  assert.match(source, /Automatic/);
});
