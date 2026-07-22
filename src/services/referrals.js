import { supabase } from "./supabase";

export const normalizeReferralCode = (value = "") =>
  value.trim().replace(/\s+/g, "").toUpperCase();

async function callRpc(name, parameters = {}) {
  const { data, error } = await supabase.rpc(name, parameters);

  if (error) {
    throw error;
  }

  return data;
}

export const validateReferralCode = (code) =>
  callRpc("validate_referral_code", {
    p_code: normalizeReferralCode(code),
  });

export const claimReferralCode = (code) =>
  callRpc("claim_referral_code", {
    p_code: normalizeReferralCode(code),
  });

export const getMyReferralDashboard = () =>
  callRpc("get_my_referral_dashboard");

export const getMyWalletDashboard = () =>
  callRpc("get_my_wallet_dashboard");

export const requestWalletWithdrawal = (amount, upiId) =>
  callRpc("request_wallet_withdrawal", {
    p_amount: amount,
    p_upi_id: upiId.trim(),
  });

export const getAdminReferralDashboard = () =>
  callRpc("admin_get_referral_dashboard");

export const getAdminReferralMetrics = () =>
  callRpc("admin_get_referral_metrics");

export const retryOrderReferralRewards = (orderId) =>
  callRpc("admin_retry_order_referral_rewards", {
    p_order_id: orderId,
  });

export const reverseReferralReward = (commissionId, reason) =>
  callRpc("admin_reverse_referral_reward", {
    p_commission_id: commissionId,
    p_reason: reason.trim(),
  });

export const reverseOrderReferralRewards = (orderId, reason) =>
  callRpc("admin_reverse_order_referral_rewards", {
    p_order_id: orderId,
    p_reason: reason.trim(),
  });

export const updateWithdrawalStatus = (
  requestId,
  status,
  note = "",
) =>
  callRpc("admin_update_withdrawal", {
    p_request_id: requestId,
    p_status: status,
    p_note: note.trim() || null,
  });
