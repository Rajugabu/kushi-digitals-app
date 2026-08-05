-- Razorpay purchases for prepaid Studio credits. These tables and functions
-- are intentionally isolated from wallet_accounts and wallet_transactions.

create table if not exists public.studio_credit_packs (
  id text primary key,
  display_name text not null,
  description text not null,
  credits bigint not null,
  amount_paise bigint not null,
  currency text not null default 'INR',
  active boolean not null default true,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_credit_packs_id_check check (
    id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and length(id) between 3 and 64
  ),
  constraint studio_credit_packs_name_check check (
    length(trim(display_name)) between 1 and 100
  ),
  constraint studio_credit_packs_description_check check (
    length(trim(description)) between 1 and 300
  ),
  constraint studio_credit_packs_credits_check check (credits > 0),
  constraint studio_credit_packs_amount_check check (amount_paise > 0),
  constraint studio_credit_packs_currency_check check (currency = 'INR'),
  constraint studio_credit_packs_display_order_check check (display_order >= 0)
);

insert into public.studio_credit_packs (
  id,
  display_name,
  description,
  credits,
  amount_paise,
  currency,
  active,
  display_order
)
values
  (
    'starter-3',
    'Starter 3',
    '3 Studio credits for one single-photo design.',
    3,
    3900,
    'INR',
    true,
    10
  ),
  (
    'couple-4',
    'Couple 4',
    '4 Studio credits for one two-photo design.',
    4,
    5200,
    'INR',
    true,
    20
  ),
  (
    'value-10',
    'Value 10',
    '10 Studio credits for multiple creative generations.',
    10,
    13000,
    'INR',
    true,
    30
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  credits = excluded.credits,
  amount_paise = excluded.amount_paise,
  currency = excluded.currency,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();

create table if not exists public.studio_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  pack_id text not null references public.studio_credit_packs(id)
    on update restrict on delete restrict,
  pack_name_snapshot text not null,
  credits_snapshot bigint not null,
  amount_paise_snapshot bigint not null,
  currency_snapshot text not null,
  provider text not null default 'razorpay',
  status text not null default 'created',
  razorpay_order_id text,
  razorpay_payment_id text,
  failure_code text,
  failure_message text,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  credited_at timestamptz,
  constraint studio_credit_purchases_pack_name_check check (
    length(trim(pack_name_snapshot)) between 1 and 100
  ),
  constraint studio_credit_purchases_credits_check check (credits_snapshot > 0),
  constraint studio_credit_purchases_amount_check check (amount_paise_snapshot > 0),
  constraint studio_credit_purchases_currency_check check (currency_snapshot = 'INR'),
  constraint studio_credit_purchases_provider_check check (provider = 'razorpay'),
  constraint studio_credit_purchases_status_check check (
    status in (
      'created',
      'order_created',
      'capture_pending',
      'credited',
      'failed',
      'refund_review'
    )
  ),
  constraint studio_credit_purchases_order_id_check check (
    razorpay_order_id is null
    or (
      razorpay_order_id ~ '^order_[A-Za-z0-9]+$'
      and length(razorpay_order_id) <= 100
    )
  ),
  constraint studio_credit_purchases_payment_id_check check (
    razorpay_payment_id is null
    or (
      razorpay_payment_id ~ '^pay_[A-Za-z0-9]+$'
      and length(razorpay_payment_id) <= 100
    )
  ),
  constraint studio_credit_purchases_failure_code_check check (
    failure_code is null or length(failure_code) <= 100
  ),
  constraint studio_credit_purchases_failure_message_check check (
    failure_message is null or length(failure_message) <= 500
  ),
  constraint studio_credit_purchases_metadata_check check (
    jsonb_typeof(provider_metadata) = 'object'
    and octet_length(provider_metadata::text) <= 4096
  ),
  constraint studio_credit_purchases_credited_state_check check (
    status <> 'credited'
    or (
      razorpay_order_id is not null
      and razorpay_payment_id is not null
      and paid_at is not null
      and credited_at is not null
    )
  )
);

create unique index if not exists studio_credit_purchases_order_id_unique
  on public.studio_credit_purchases (razorpay_order_id)
  where razorpay_order_id is not null;

create unique index if not exists studio_credit_purchases_payment_id_unique
  on public.studio_credit_purchases (razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists studio_credit_purchases_user_created_idx
  on public.studio_credit_purchases (user_id, created_at desc);

create index if not exists studio_credit_purchases_status_updated_idx
  on public.studio_credit_purchases (status, updated_at);

create table if not exists public.studio_payment_webhook_events (
  event_id text primary key,
  event_type text not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  payload_sha256 text not null,
  processing_status text not null default 'processing',
  error_code text,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint studio_payment_events_id_check check (
    length(trim(event_id)) between 1 and 200
  ),
  constraint studio_payment_events_type_check check (
    length(trim(event_type)) between 1 and 100
  ),
  constraint studio_payment_events_order_id_check check (
    razorpay_order_id is null
    or (
      razorpay_order_id ~ '^order_[A-Za-z0-9]+$'
      and length(razorpay_order_id) <= 100
    )
  ),
  constraint studio_payment_events_payment_id_check check (
    razorpay_payment_id is null
    or (
      razorpay_payment_id ~ '^pay_[A-Za-z0-9]+$'
      and length(razorpay_payment_id) <= 100
    )
  ),
  constraint studio_payment_events_hash_check check (
    payload_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint studio_payment_events_status_check check (
    processing_status in ('processing', 'processed', 'ignored', 'failed')
  ),
  constraint studio_payment_events_error_code_check check (
    error_code is null or length(error_code) <= 100
  ),
  constraint studio_payment_events_error_message_check check (
    error_message is null or length(error_message) <= 500
  )
);

create index if not exists studio_payment_events_order_idx
  on public.studio_payment_webhook_events (razorpay_order_id, received_at desc)
  where razorpay_order_id is not null;

create index if not exists studio_payment_events_payment_idx
  on public.studio_payment_webhook_events (razorpay_payment_id, received_at desc)
  where razorpay_payment_id is not null;

create or replace function public.set_studio_payment_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_studio_credit_packs_updated_at
  on public.studio_credit_packs;
create trigger set_studio_credit_packs_updated_at
before update on public.studio_credit_packs
for each row execute function public.set_studio_payment_updated_at();

drop trigger if exists set_studio_credit_purchases_updated_at
  on public.studio_credit_purchases;
create trigger set_studio_credit_purchases_updated_at
before update on public.studio_credit_purchases
for each row execute function public.set_studio_payment_updated_at();

create or replace function public.protect_studio_credit_purchase_snapshot()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.pack_id is distinct from old.pack_id
     or new.pack_name_snapshot is distinct from old.pack_name_snapshot
     or new.credits_snapshot is distinct from old.credits_snapshot
     or new.amount_paise_snapshot is distinct from old.amount_paise_snapshot
     or new.currency_snapshot is distinct from old.currency_snapshot
     or new.provider is distinct from old.provider
     or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_SNAPSHOT_IMMUTABLE';
  end if;

  if old.razorpay_order_id is not null
     and new.razorpay_order_id is distinct from old.razorpay_order_id then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_ORDER_IMMUTABLE';
  end if;

  if old.razorpay_payment_id is not null
     and new.razorpay_payment_id is distinct from old.razorpay_payment_id then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_PAYMENT_IMMUTABLE';
  end if;

  if old.status = 'credited'
     and new.status not in ('credited', 'refund_review') then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_CREDITED_STATE_IMMUTABLE';
  end if;

  if old.paid_at is not null and new.paid_at is distinct from old.paid_at then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_PAID_AT_IMMUTABLE';
  end if;

  if old.credited_at is not null
     and new.credited_at is distinct from old.credited_at then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_CREDITED_AT_IMMUTABLE';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_studio_credit_purchase_snapshot
  on public.studio_credit_purchases;
create trigger protect_studio_credit_purchase_snapshot
before update on public.studio_credit_purchases
for each row execute function public.protect_studio_credit_purchase_snapshot();

create or replace function public.fulfill_studio_credit_purchase(
  p_purchase_id uuid,
  p_user_id uuid,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint,
  p_currency text,
  p_source text default 'checkout_verification'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_purchase public.studio_credit_purchases%rowtype;
  v_credit_result jsonb;
  v_account public.studio_credit_accounts%rowtype;
  v_source text := trim(coalesce(p_source, ''));
begin
  perform public.require_studio_credit_service_role();

  if p_purchase_id is null or p_user_id is null then
    raise exception using
      errcode = '22004',
      message = 'STUDIO_PURCHASE_ID_AND_USER_REQUIRED';
  end if;

  if v_source not in ('checkout_verification', 'webhook', 'reconciliation') then
    raise exception using
      errcode = '22023',
      message = 'INVALID_STUDIO_PURCHASE_FULFILLMENT_SOURCE';
  end if;

  select * into v_purchase
  from public.studio_credit_purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'STUDIO_PURCHASE_NOT_FOUND';
  end if;

  if v_purchase.user_id <> p_user_id then
    raise exception using
      errcode = '42501',
      message = 'STUDIO_PURCHASE_USER_MISMATCH';
  end if;

  if v_purchase.razorpay_order_id is null
     or v_purchase.razorpay_order_id <> trim(coalesce(p_razorpay_order_id, '')) then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_ORDER_MISMATCH';
  end if;

  if trim(coalesce(p_razorpay_payment_id, '')) !~ '^pay_[A-Za-z0-9]+$' then
    raise exception using
      errcode = '22023',
      message = 'INVALID_STUDIO_PURCHASE_PAYMENT_ID';
  end if;

  if v_purchase.amount_paise_snapshot <> p_amount_paise then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_AMOUNT_MISMATCH';
  end if;

  if v_purchase.currency_snapshot <> p_currency or p_currency <> 'INR' then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_CURRENCY_MISMATCH';
  end if;

  if v_purchase.razorpay_payment_id is not null
     and v_purchase.razorpay_payment_id <> p_razorpay_payment_id then
    raise exception using
      errcode = '23505',
      message = 'STUDIO_PURCHASE_PAYMENT_CONFLICT';
  end if;

  if exists (
    select 1
    from public.studio_credit_purchases
    where razorpay_payment_id = p_razorpay_payment_id
      and id <> p_purchase_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'RAZORPAY_PAYMENT_ALREADY_ASSIGNED';
  end if;

  if v_purchase.status = 'refund_review' then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_PURCHASE_REQUIRES_REFUND_REVIEW';
  end if;

  if v_purchase.status = 'credited' then
    select * into v_account
    from public.studio_credit_accounts
    where user_id = v_purchase.user_id
    for update;

    return jsonb_build_object(
      'status', 'credited',
      'idempotent', true,
      'purchase_id', v_purchase.id,
      'payment_id', v_purchase.razorpay_payment_id,
      'credits_added', v_purchase.credits_snapshot,
      'available_credits', coalesce(v_account.available_credits, 0),
      'reserved_credits', coalesce(v_account.reserved_credits, 0)
    );
  end if;

  v_credit_result := public.add_studio_credits(
    v_purchase.user_id,
    v_purchase.credits_snapshot,
    'razorpay:payment:' || p_razorpay_payment_id,
    'Studio credits purchased: ' || v_purchase.pack_name_snapshot,
    'purchase',
    jsonb_build_object(
      'purchase_id', v_purchase.id,
      'pack_id', v_purchase.pack_id,
      'razorpay_order_id', v_purchase.razorpay_order_id,
      'razorpay_payment_id', p_razorpay_payment_id,
      'source', v_source
    )
  );

  update public.studio_credit_purchases
  set status = 'credited',
      razorpay_payment_id = p_razorpay_payment_id,
      paid_at = coalesce(paid_at, now()),
      credited_at = coalesce(credited_at, now()),
      failure_code = null,
      failure_message = null,
      provider_metadata = provider_metadata || jsonb_build_object(
        'fulfilled_via', v_source
      )
  where id = v_purchase.id;

  return jsonb_build_object(
    'status', 'credited',
    'idempotent', coalesce((v_credit_result ->> 'idempotent')::boolean, false),
    'purchase_id', v_purchase.id,
    'payment_id', p_razorpay_payment_id,
    'transaction_id', v_credit_result ->> 'transaction_id',
    'credits_added', v_purchase.credits_snapshot,
    'available_credits', (v_credit_result ->> 'available_credits')::bigint,
    'reserved_credits', (v_credit_result ->> 'reserved_credits')::bigint
  );
end;
$$;

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

  if not v_is_new then
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

alter table public.studio_credit_packs enable row level security;
alter table public.studio_credit_purchases enable row level security;
alter table public.studio_payment_webhook_events enable row level security;

drop policy if exists "Authenticated users can view active Studio credit packs"
  on public.studio_credit_packs;
create policy "Authenticated users can view active Studio credit packs"
on public.studio_credit_packs
for select
to authenticated
using (active);

drop policy if exists "Users can view their own Studio credit purchases"
  on public.studio_credit_purchases;
create policy "Users can view their own Studio credit purchases"
on public.studio_credit_purchases
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.studio_credit_packs
  from public, anon, authenticated;
revoke all on table public.studio_credit_purchases
  from public, anon, authenticated;
revoke all on table public.studio_payment_webhook_events
  from public, anon, authenticated;

grant select on table public.studio_credit_packs to authenticated;
grant select on table public.studio_credit_purchases to authenticated;

grant select, insert, update, delete on table public.studio_credit_packs
  to service_role;
grant select, insert, update, delete on table public.studio_credit_purchases
  to service_role;
grant select, insert, update, delete on table public.studio_payment_webhook_events
  to service_role;

revoke all on function public.set_studio_payment_updated_at()
  from public, anon, authenticated;
revoke all on function public.protect_studio_credit_purchase_snapshot()
  from public, anon, authenticated;
revoke all on function public.fulfill_studio_credit_purchase(
  uuid, uuid, text, text, bigint, text, text
)
  from public, anon, authenticated;
revoke all on function public.process_studio_razorpay_webhook(
  text, text, text, text, bigint, text, text, text, text, text
)
  from public, anon, authenticated;

grant execute on function public.fulfill_studio_credit_purchase(
  uuid, uuid, text, text, bigint, text, text
)
  to service_role;
grant execute on function public.process_studio_razorpay_webhook(
  text, text, text, text, bigint, text, text, text, text, text
)
  to service_role;

comment on table public.studio_credit_packs is
  'Server-controlled Razorpay packs for prepaid Studio credits.';
comment on table public.studio_credit_purchases is
  'Studio credit purchase state with immutable pack, amount, and currency snapshots.';
comment on table public.studio_payment_webhook_events is
  'Minimal Razorpay webhook idempotency records; full payment payloads are not stored.';
comment on function public.fulfill_studio_credit_purchase(
  uuid, uuid, text, text, bigint, text, text
) is
  'Service-role-only atomic and idempotent Razorpay Studio credit fulfilment.';
comment on function public.process_studio_razorpay_webhook(
  text, text, text, text, bigint, text, text, text, text, text
) is
  'Service-role-only atomic Razorpay webhook event claim, purchase processing, fulfilment, and completion.';
