export const STUDIO_PAYMENT_POLL_INTERVAL_MS = 3_000;
export const STUDIO_PAYMENT_POLL_TIMEOUT_MS = 90_000;

const TERMINAL_PURCHASE_STATUSES = new Set([
  "credited",
  "failed",
  "refund_review",
]);

function waitForNextPoll(delayMs, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve(true);
    }, delayMs);
    const handleAbort = () => {
      globalThis.clearTimeout(timer);
      resolve(false);
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function pollStudioPurchaseUntilTerminal({
  fetchStatus,
  signal,
  intervalMs = STUDIO_PAYMENT_POLL_INTERVAL_MS,
  timeoutMs = STUDIO_PAYMENT_POLL_TIMEOUT_MS,
  now = () => Date.now(),
  wait = waitForNextPoll,
}) {
  if (typeof fetchStatus !== "function") {
    throw new TypeError("A purchase-status loader is required.");
  }

  const startedAt = now();

  while (!signal?.aborted) {
    const purchase = await fetchStatus();

    if (signal?.aborted) {
      return { status: "aborted", aborted: true, timedOut: false };
    }

    if (TERMINAL_PURCHASE_STATUSES.has(purchase.status)) {
      return { ...purchase, aborted: false, timedOut: false };
    }

    const elapsed = now() - startedAt;

    if (elapsed >= timeoutMs) {
      return {
        ...purchase,
        status: purchase.status || "capture_pending",
        aborted: false,
        timedOut: true,
      };
    }

    const shouldContinue = await wait(
      Math.min(intervalMs, Math.max(timeoutMs - elapsed, 0)),
      signal,
    );

    if (!shouldContinue || signal?.aborted) {
      return { status: "aborted", aborted: true, timedOut: false };
    }
  }

  return { status: "aborted", aborted: true, timedOut: false };
}
