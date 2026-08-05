-- Transactional payment-ledger behavior checks. All writes are rolled back.
-- Run only against a migrated local or explicitly authorised staging database:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_payment_behavior_checks.sql

begin;

set local request.jwt.claims = '{"role":"service_role"}';

do $$
declare
  v_user_id uuid;
  v_before public.studio_credit_accounts%rowtype;
  v_after public.studio_credit_accounts%rowtype;
  v_purchase_one uuid;
  v_purchase_two uuid;
  v_purchase_three uuid;
  v_purchase_mismatch uuid;
  v_purchase_webhook uuid;
  v_order_one text := 'order_' || replace(gen_random_uuid()::text, '-', '');
  v_order_two text := 'order_' || replace(gen_random_uuid()::text, '-', '');
  v_order_three text := 'order_' || replace(gen_random_uuid()::text, '-', '');
  v_order_mismatch text := 'order_' || replace(gen_random_uuid()::text, '-', '');
  v_payment_one text := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  v_payment_two text := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  v_payment_three text := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  v_payment_mismatch text := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  v_order_webhook text := 'order_' || replace(gen_random_uuid()::text, '-', '');
  v_payment_webhook text := 'pay_' || replace(gen_random_uuid()::text, '-', '');
  v_event_capture text := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_event_order_paid text := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_event_refund_failed text := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_event_dispute_action text := 'evt_' || replace(gen_random_uuid()::text, '-', '');
  v_result jsonb;
  v_expected_failure boolean;
  v_conflict_sqlstate text;
begin
  select id into v_user_id
  from auth.users
  order by created_at
  limit 1;

  if v_user_id is null then
    raise exception 'Payment behavior checks require at least one auth.users row';
  end if;

  insert into public.studio_credit_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select * into v_before
  from public.studio_credit_accounts
  where user_id = v_user_id;

  insert into public.studio_credit_purchases (
    user_id,
    pack_id,
    pack_name_snapshot,
    credits_snapshot,
    amount_paise_snapshot,
    currency_snapshot,
    status,
    razorpay_order_id
  ) values (
    v_user_id,
    'starter-3',
    'Starter 3',
    3,
    3900,
    'INR',
    'order_created',
    v_order_one
  ) returning id into v_purchase_one;

  v_result := public.fulfill_studio_credit_purchase(
    v_purchase_one,
    v_user_id,
    v_order_one,
    v_payment_one,
    3900,
    'INR',
    'checkout_verification'
  );
  if v_result ->> 'status' <> 'credited'
     or (v_result ->> 'idempotent')::boolean is true then
    raise exception 'First captured payment fulfillment did not credit';
  end if;

  v_result := public.fulfill_studio_credit_purchase(
    v_purchase_one,
    v_user_id,
    v_order_one,
    v_payment_one,
    3900,
    'INR',
    'checkout_verification'
  );
  if v_result ->> 'status' <> 'credited'
     or (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'Duplicate Checkout verification was not idempotent';
  end if;

  insert into public.studio_credit_purchases (
    user_id, pack_id, pack_name_snapshot, credits_snapshot,
    amount_paise_snapshot, currency_snapshot, status, razorpay_order_id
  ) values (
    v_user_id, 'couple-4', 'Couple 4', 4,
    5200, 'INR', 'order_created', v_order_two
  ) returning id into v_purchase_two;

  perform public.fulfill_studio_credit_purchase(
    v_purchase_two, v_user_id, v_order_two, v_payment_two,
    5200, 'INR', 'webhook'
  );
  v_result := public.fulfill_studio_credit_purchase(
    v_purchase_two, v_user_id, v_order_two, v_payment_two,
    5200, 'INR', 'checkout_verification'
  );
  if (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'Webhook followed by Checkout verification double-credited';
  end if;

  insert into public.studio_credit_purchases (
    user_id, pack_id, pack_name_snapshot, credits_snapshot,
    amount_paise_snapshot, currency_snapshot, status, razorpay_order_id
  ) values (
    v_user_id, 'value-10', 'Value 10', 10,
    13000, 'INR', 'order_created', v_order_three
  ) returning id into v_purchase_three;

  perform public.fulfill_studio_credit_purchase(
    v_purchase_three, v_user_id, v_order_three, v_payment_three,
    13000, 'INR', 'checkout_verification'
  );
  v_result := public.fulfill_studio_credit_purchase(
    v_purchase_three, v_user_id, v_order_three, v_payment_three,
    13000, 'INR', 'webhook'
  );
  if (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'Checkout verification followed by webhook double-credited';
  end if;

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 17
     or v_after.lifetime_purchased <> v_before.lifetime_purchased + 17 then
    raise exception 'Captured payments did not add exactly 17 credits once';
  end if;

  if (
    select count(*)
    from public.studio_credit_transactions
    where idempotency_key in (
      'razorpay:payment:' || v_payment_one,
      'razorpay:payment:' || v_payment_two,
      'razorpay:payment:' || v_payment_three
    )
  ) <> 3 then
    raise exception 'Purchase ledger contains duplicate or missing credit events';
  end if;

  insert into public.studio_credit_purchases (
    user_id, pack_id, pack_name_snapshot, credits_snapshot,
    amount_paise_snapshot, currency_snapshot, status, razorpay_order_id
  ) values (
    v_user_id, 'starter-3', 'Starter 3', 3,
    3900, 'INR', 'order_created', v_order_mismatch
  ) returning id into v_purchase_mismatch;

  v_expected_failure := false;
  begin
    perform public.fulfill_studio_credit_purchase(
      v_purchase_mismatch, v_user_id, v_order_mismatch,
      v_payment_mismatch, 5200, 'INR', 'webhook'
    );
  exception when check_violation then
    v_expected_failure := true;
  end;
  if not v_expected_failure then
    raise exception 'Amount mismatch was accepted';
  end if;

  v_expected_failure := false;
  begin
    perform public.fulfill_studio_credit_purchase(
      v_purchase_mismatch, v_user_id, v_order_mismatch,
      v_payment_mismatch, 3900, 'USD', 'webhook'
    );
  exception when check_violation then
    v_expected_failure := true;
  end;
  if not v_expected_failure then
    raise exception 'Currency mismatch was accepted';
  end if;

  v_expected_failure := false;
  begin
    perform public.fulfill_studio_credit_purchase(
      v_purchase_mismatch, v_user_id,
      'order_' || replace(gen_random_uuid()::text, '-', ''),
      v_payment_mismatch, 3900, 'INR', 'webhook'
    );
  exception when check_violation then
    v_expected_failure := true;
  end;
  if not v_expected_failure then
    raise exception 'Order mismatch was accepted';
  end if;

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 17
     or v_after.lifetime_purchased <> v_before.lifetime_purchased + 17 then
    raise exception 'Rejected or failed payments changed Studio credits';
  end if;

  insert into public.studio_credit_purchases (
    user_id, pack_id, pack_name_snapshot, credits_snapshot,
    amount_paise_snapshot, currency_snapshot, status, razorpay_order_id
  ) values (
    v_user_id, 'starter-3', 'Starter 3', 3,
    3900, 'INR', 'order_created', v_order_webhook
  ) returning id into v_purchase_webhook;

  v_result := public.process_studio_razorpay_webhook(
    v_event_capture,
    'payment.captured',
    v_order_webhook,
    v_payment_webhook,
    3900,
    'INR',
    'captured',
    repeat('a', 64),
    null,
    null
  );
  if v_result ->> 'status' <> 'processed'
     or v_result ->> 'purchase_status' <> 'credited'
     or (v_result ->> 'duplicate')::boolean is not false then
    raise exception 'Atomic capture webhook did not credit the purchase';
  end if;

  v_result := public.process_studio_razorpay_webhook(
    v_event_capture,
    'payment.captured',
    v_order_webhook,
    v_payment_webhook,
    3900,
    'INR',
    'captured',
    repeat('a', 64),
    null,
    null
  );
  if (v_result ->> 'duplicate')::boolean is not true then
    raise exception 'Duplicate atomic capture event was not idempotent';
  end if;

  v_result := public.process_studio_razorpay_webhook(
    v_event_order_paid,
    'order.paid',
    v_order_webhook,
    v_payment_webhook,
    3900,
    'INR',
    'captured',
    repeat('b', 64),
    null,
    null
  );
  if v_result ->> 'status' <> 'processed'
     or (v_result ->> 'duplicate')::boolean is not true then
    raise exception 'order.paid after payment.captured was not credit-idempotent';
  end if;

  v_conflict_sqlstate := null;
  begin
    perform public.process_studio_razorpay_webhook(
      v_event_capture,
      'payment.captured',
      v_order_webhook,
      v_payment_webhook,
      3900,
      'INR',
      'captured',
      repeat('c', 64),
      null,
      null
    );
  exception when others then
    get stacked diagnostics v_conflict_sqlstate = returned_sqlstate;
  end;
  if v_conflict_sqlstate is distinct from '23514' then
    raise exception
      'Webhook event-ID hash conflict returned SQLSTATE %, expected 23514',
      coalesce(v_conflict_sqlstate, '<none>');
  end if;

  v_result := public.process_studio_razorpay_webhook(
    v_event_refund_failed,
    'refund.failed',
    null,
    v_payment_webhook,
    null,
    null,
    null,
    repeat('d', 64),
    null,
    null
  );
  if v_result ->> 'purchase_status' <> 'refund_review' then
    raise exception 'refund.failed did not mark the purchase for review';
  end if;

  v_result := public.process_studio_razorpay_webhook(
    v_event_dispute_action,
    'payment.dispute.action_required',
    null,
    v_payment_webhook,
    null,
    null,
    null,
    repeat('e', 64),
    null,
    null
  );
  if v_result ->> 'purchase_status' <> 'refund_review' then
    raise exception 'payment.dispute.action_required did not preserve review state';
  end if;

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 20
     or v_after.lifetime_purchased <> v_before.lifetime_purchased + 20 then
    raise exception 'Duplicate or review webhooks changed credits incorrectly';
  end if;

  if (
    select count(*)
    from public.studio_credit_transactions
    where idempotency_key = 'razorpay:payment:' || v_payment_webhook
  ) <> 1 then
    raise exception 'Concurrent-style capture events created duplicate ledger rows';
  end if;
end $$;

rollback;

select 'Studio payment idempotency and mismatch behavior checks passed.' as result;
