-- Fix duplicate Razorpay webhook event claims when INSERT ... RETURNING assigns NULL.
-- The preceding payment migration has already been applied, so this is a forward-only
-- CREATE OR REPLACE FUNCTION patch that preserves the complete processing contract.

create or replace function public.process_studio_razorpay_webhook(
  p_event_id text,
  p_event_type text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint,
  p_currency text,
  p_payment_status text,
  p_payload_sha256 text,
  p_failure_code text,
  p_failure_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_event public.studio_payment_webhook_events%rowtype;
  v_purchase public.studio_credit_purchases%rowtype;
  v_fulfillment jsonb;
  v_is_new boolean := false;
  v_event_id text := trim(coalesce(p_event_id, ''));
  v_event_type text := trim(coalesce(p_event_type, ''));
  v_order_id text := nullif(trim(coalesce(p_razorpay_order_id, '')), '');
  v_payment_id text := nullif(trim(coalesce(p_razorpay_payment_id, '')), '');
  v_payload_hash text := lower(trim(coalesce(p_payload_sha256, '')));
  v_error_code text;
  v_retryable boolean;
  v_manual_review_events constant text[] := array[
    'refund.created',
    'refund.processed',
    'refund.failed',
    'payment.dispute.created',
    'payment.dispute.action_required',
    'payment.dispute.won',
    'payment.dispute.lost'
  ];
begin
  perform public.require_studio_credit_service_role();

  if v_event_id = ''
     or length(v_event_id) > 200
     or v_event_id !~ '^[A-Za-z0-9_.:-]+$' then
    raise exception using
      errcode = '22023',
      message = 'INVALID_RAZORPAY_WEBHOOK_EVENT_ID';
  end if;

  if v_event_type = '' or length(v_event_type) > 100 then
    raise exception using
      errcode = '22023',
      message = 'INVALID_RAZORPAY_WEBHOOK_EVENT_TYPE';
  end if;

  if v_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'INVALID_RAZORPAY_WEBHOOK_PAYLOAD_HASH';
  end if;

  insert into public.studio_payment_webhook_events (
    event_id,
    event_type,
    razorpay_order_id,
    razorpay_payment_id,
    payload_sha256,
    processing_status
  ) values (
    v_event_id,
    v_event_type,
    case when v_order_id ~ '^order_[A-Za-z0-9]+$' then v_order_id else null end,
    case when v_payment_id ~ '^pay_[A-Za-z0-9]+$' then v_payment_id else null end,
    v_payload_hash,
    'processing'
  )
  on conflict (event_id) do nothing
  returning true into v_is_new;

  if v_is_new is not true then
    select * into v_event
    from public.studio_payment_webhook_events
    where event_id = v_event_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'RAZORPAY_WEBHOOK_EVENT_NOT_FOUND';
    end if;

    if v_event.payload_sha256 <> v_payload_hash then
      raise exception using
        errcode = '23514',
        message = 'RAZORPAY_WEBHOOK_EVENT_HASH_CONFLICT';
    end if;

    if v_event.processing_status in ('processed', 'ignored') then
      return jsonb_build_object(
        'status', v_event.processing_status,
        'duplicate', true,
        'event_id', v_event_id
      );
    end if;

    update public.studio_payment_webhook_events
    set processing_status = 'processing',
        error_code = null,
        error_message = null,
        processed_at = null
    where event_id = v_event_id;
  end if;

  begin
    if v_event_type in ('payment.captured', 'order.paid') then
      if v_order_id is null or v_order_id !~ '^order_[A-Za-z0-9]+$'
         or v_payment_id is null or v_payment_id !~ '^pay_[A-Za-z0-9]+$' then
        raise exception using
          errcode = '22023',
          message = 'MALFORMED_CAPTURE_WEBHOOK_REFERENCES';
      end if;

      if p_amount_paise is null or p_amount_paise <= 0 then
        raise exception using
          errcode = '22023',
          message = 'MALFORMED_CAPTURE_WEBHOOK_AMOUNT';
      end if;

      if p_currency <> 'INR' or p_payment_status <> 'captured' then
        raise exception using
          errcode = '23514',
          message = 'CAPTURE_WEBHOOK_PAYMENT_NOT_CAPTURED_INR';
      end if;

      select * into v_purchase
      from public.studio_credit_purchases
      where razorpay_order_id = v_order_id
      for update;

      if not found then
        update public.studio_payment_webhook_events
        set processing_status = 'ignored',
            processed_at = now()
        where event_id = v_event_id;

        return jsonb_build_object(
          'status', 'ignored',
          'duplicate', false,
          'event_id', v_event_id
        );
      end if;

      if v_purchase.status = 'refund_review' then
        update public.studio_payment_webhook_events
        set processing_status = 'ignored',
            error_code = 'PURCHASE_IN_REFUND_REVIEW',
            error_message = 'Captured event was not fulfilled because the purchase requires refund review.',
            processed_at = now()
        where event_id = v_event_id;

        return jsonb_build_object(
          'status', 'ignored',
          'purchase_status', 'refund_review',
          'duplicate', false,
          'event_id', v_event_id
        );
      end if;

      if v_purchase.amount_paise_snapshot <> p_amount_paise then
        raise exception using
          errcode = '23514',
          message = 'RAZORPAY_WEBHOOK_AMOUNT_MISMATCH';
      end if;

      if v_purchase.currency_snapshot <> p_currency then
        raise exception using
          errcode = '23514',
          message = 'RAZORPAY_WEBHOOK_CURRENCY_MISMATCH';
      end if;

      if v_purchase.razorpay_payment_id is not null
         and v_purchase.razorpay_payment_id <> v_payment_id then
        raise exception using
          errcode = '23505',
          message = 'RAZORPAY_WEBHOOK_PAYMENT_CONFLICT';
      end if;

      v_fulfillment := public.fulfill_studio_credit_purchase(
        v_purchase.id,
        v_purchase.user_id,
        v_order_id,
        v_payment_id,
        p_amount_paise,
        p_currency,
        'webhook'
      );

      update public.studio_payment_webhook_events
      set processing_status = 'processed',
          razorpay_order_id = v_order_id,
          razorpay_payment_id = v_payment_id,
          processed_at = now()
      where event_id = v_event_id;

      return jsonb_build_object(
        'status', 'processed',
        'purchase_status', 'credited',
        'duplicate', coalesce((v_fulfillment ->> 'idempotent')::boolean, false),
        'event_id', v_event_id,
        'purchase_id', v_purchase.id,
        'credits_added', (v_fulfillment ->> 'credits_added')::bigint,
        'available_credits', (v_fulfillment ->> 'available_credits')::bigint
      );
    end if;

    if v_event_type = 'payment.failed' then
      if v_order_id is null or v_order_id !~ '^order_[A-Za-z0-9]+$'
         or v_payment_id is null or v_payment_id !~ '^pay_[A-Za-z0-9]+$' then
        raise exception using
          errcode = '22023',
          message = 'MALFORMED_FAILED_PAYMENT_WEBHOOK';
      end if;

      select * into v_purchase
      from public.studio_credit_purchases
      where razorpay_order_id = v_order_id
      for update;

      if found and v_purchase.status in (
        'created', 'order_created', 'capture_pending', 'failed'
      ) then
        update public.studio_credit_purchases
        set status = 'failed',
            failure_code = left(
              coalesce(nullif(trim(p_failure_code), ''), 'PAYMENT_FAILED'),
              100
            ),
            failure_message = left(
              coalesce(nullif(trim(p_failure_message), ''), 'The payment was not completed.'),
              500
            ),
            provider_metadata = jsonb_build_object('payment_status', 'failed')
        where id = v_purchase.id;
      end if;

      update public.studio_payment_webhook_events
      set processing_status = case when v_purchase.id is null then 'ignored' else 'processed' end,
          processed_at = now()
      where event_id = v_event_id;

      return jsonb_build_object(
        'status', case when v_purchase.id is null then 'ignored' else 'processed' end,
        'purchase_status', case when v_purchase.id is null then null else v_purchase.status end,
        'duplicate', false,
        'event_id', v_event_id
      );
    end if;

    if v_event_type = any(v_manual_review_events) then
      if (v_payment_id is null or v_payment_id !~ '^pay_[A-Za-z0-9]+$')
         and (v_order_id is null or v_order_id !~ '^order_[A-Za-z0-9]+$') then
        update public.studio_payment_webhook_events
        set processing_status = 'processed',
            error_code = 'MANUAL_REVIEW_PURCHASE_NOT_LINKED',
            error_message = 'Signed refund or dispute event requires manual purchase lookup.',
            processed_at = now()
        where event_id = v_event_id;

        return jsonb_build_object(
          'status', 'processed',
          'purchase_status', 'manual_review_unlinked',
          'duplicate', false,
          'event_id', v_event_id
        );
      end if;

      select * into v_purchase
      from public.studio_credit_purchases
      where (
        v_payment_id ~ '^pay_[A-Za-z0-9]+$'
        and razorpay_payment_id = v_payment_id
      ) or (
        v_order_id ~ '^order_[A-Za-z0-9]+$'
        and razorpay_order_id = v_order_id
      )
      order by case when razorpay_payment_id = v_payment_id then 0 else 1 end
      limit 1
      for update;

      if found then
        update public.studio_credit_purchases
        set status = 'refund_review',
            failure_code = 'REFUND_OR_DISPUTE_REVIEW',
            failure_message = 'A Razorpay refund or dispute requires administrator review.',
            provider_metadata = jsonb_build_object(
              'review_event_type', v_event_type
            )
        where id = v_purchase.id;
      end if;

      update public.studio_payment_webhook_events
      set processing_status = 'processed',
          error_code = case
            when v_purchase.id is null then 'MANUAL_REVIEW_PURCHASE_NOT_LINKED'
            else null
          end,
          error_message = case
            when v_purchase.id is null then 'Signed refund or dispute event requires manual purchase lookup.'
            else null
          end,
          processed_at = now()
      where event_id = v_event_id;

      return jsonb_build_object(
        'status', 'processed',
        'purchase_status', case
          when v_purchase.id is null then 'manual_review_unlinked'
          else 'refund_review'
        end,
        'duplicate', false,
        'event_id', v_event_id,
        'purchase_id', v_purchase.id
      );
    end if;

    update public.studio_payment_webhook_events
    set processing_status = 'ignored',
        processed_at = now()
    where event_id = v_event_id;

    return jsonb_build_object(
      'status', 'ignored',
      'duplicate', false,
      'event_id', v_event_id
    );
  exception when others then
    v_error_code := left(
      regexp_replace(upper(sqlerrm), '[^A-Z0-9_]+', '_', 'g'),
      100
    );
    v_retryable := sqlstate not in (
      '22023', '23514', '23505', '42501', 'P0002'
    );

    update public.studio_payment_webhook_events
    set processing_status = 'failed',
        error_code = coalesce(nullif(v_error_code, ''), 'WEBHOOK_PROCESSING_FAILED'),
        error_message = 'Signed webhook processing did not complete.',
        processed_at = now()
    where event_id = v_event_id;

    return jsonb_build_object(
      'status', 'failed',
      'duplicate', not v_is_new,
      'event_id', v_event_id,
      'error_code', coalesce(nullif(v_error_code, ''), 'WEBHOOK_PROCESSING_FAILED'),
      'retryable', v_retryable
    );
  end;
end;
$$;

revoke all on function public.process_studio_razorpay_webhook(
  text, text, text, text, bigint, text, text, text, text, text
)
  from public, anon, authenticated;

grant execute on function public.process_studio_razorpay_webhook(
  text, text, text, text, bigint, text, text, text, text, text
)
  to service_role;

comment on function public.process_studio_razorpay_webhook(
  text, text, text, text, bigint, text, text, text, text, text
) is
  'Service-role-only atomic Razorpay webhook event claim, purchase processing, fulfilment, and completion.';
