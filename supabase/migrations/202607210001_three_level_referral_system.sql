-- Kushi Digitals: three-level transaction-based referral rewards
-- Safe to run from the Supabase SQL editor. This migration does not delete business data.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid,
  add column if not exists referral_joined_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_referred_by_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_referred_by_fkey
      foreign key (referred_by) references public.profiles(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_no_self_referral'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_no_self_referral
      check (referred_by is null or referred_by <> id);
  end if;
end $$;

create unique index if not exists profiles_referral_code_unique_idx
  on public.profiles (upper(referral_code))
  where referral_code is not null;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by)
  where referred_by is not null;

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  beneficiary_user_id uuid not null references public.profiles(id) on delete restrict,
  source_referral_user_id uuid references public.profiles(id) on delete restrict,
  reward_type text not null,
  referral_level smallint not null,
  commission_percentage numeric(7,4) not null,
  commission_base numeric(14,2) not null,
  commission_amount numeric(14,2) not null,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  available_at timestamptz,
  reversed_at timestamptz,
  reversal_reason text,
  reversed_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint referral_commissions_reward_type_check check (
    reward_type in ('buyer_cashback', 'level_1', 'level_2', 'level_3')
  ),
  constraint referral_commissions_level_check check (referral_level between 0 and 3),
  constraint referral_commissions_status_check check (
    status in ('pending', 'available', 'reversed', 'rejected')
  ),
  constraint referral_commissions_percentage_check check (
    commission_percentage >= 0 and commission_percentage <= 100
  ),
  constraint referral_commissions_base_check check (commission_base > 0),
  constraint referral_commissions_amount_check check (commission_amount >= 0),
  constraint referral_commissions_type_level_check check (
    (reward_type = 'buyer_cashback' and referral_level = 0)
    or (reward_type = 'level_1' and referral_level = 1)
    or (reward_type = 'level_2' and referral_level = 2)
    or (reward_type = 'level_3' and referral_level = 3)
  ),
  constraint referral_commissions_order_reward_unique unique (order_id, reward_type)
);

create index if not exists referral_commissions_beneficiary_idx
  on public.referral_commissions (beneficiary_user_id, created_at desc);
create index if not exists referral_commissions_buyer_idx
  on public.referral_commissions (buyer_id, created_at desc);
create index if not exists referral_commissions_status_idx
  on public.referral_commissions (status, created_at desc);
create index if not exists referral_commissions_order_idx
  on public.referral_commissions (order_id);

create table if not exists public.wallet_accounts (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  available_balance numeric(14,2) not null default 0,
  pending_balance numeric(14,2) not null default 0,
  debt_balance numeric(14,2) not null default 0,
  lifetime_earnings numeric(14,2) not null default 0,
  total_withdrawn numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint wallet_accounts_nonnegative_check check (
    available_balance >= 0 and pending_balance >= 0 and debt_balance >= 0
    and lifetime_earnings >= 0 and total_withdrawn >= 0
  )
);

create table if not exists public.wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null,
  payout_upi_id text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null,
  admin_note text,
  constraint wallet_withdrawal_amount_check check (amount >= 500),
  constraint wallet_withdrawal_status_check check (
    status in ('requested', 'processing', 'paid', 'rejected', 'cancelled')
  )
);

create index if not exists wallet_withdrawals_user_idx
  on public.wallet_withdrawal_requests (user_id, requested_at desc);
create index if not exists wallet_withdrawals_status_idx
  on public.wallet_withdrawal_requests (status, requested_at desc);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null,
  direction text not null,
  transaction_type text not null,
  status text not null default 'available',
  order_id uuid references public.orders(id) on delete restrict,
  referral_commission_id uuid references public.referral_commissions(id) on delete restrict,
  withdrawal_request_id uuid references public.wallet_withdrawal_requests(id) on delete restrict,
  reversal_of_transaction_id uuid references public.wallet_transactions(id) on delete restrict,
  description text not null,
  created_at timestamptz not null default now(),
  available_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint wallet_transactions_amount_check check (amount > 0),
  constraint wallet_transactions_direction_check check (direction in ('credit', 'debit')),
  constraint wallet_transactions_status_check check (
    status in ('pending', 'available', 'reversed', 'rejected')
  ),
  constraint wallet_transactions_type_check check (
    transaction_type in (
      'referral_buyer_cashback', 'referral_level_1', 'referral_level_2',
      'referral_level_3', 'referral_reversal', 'withdrawal',
      'withdrawal_refund', 'manual_adjustment'
    )
  )
);

create unique index if not exists wallet_transactions_commission_credit_unique_idx
  on public.wallet_transactions (referral_commission_id)
  where referral_commission_id is not null and direction = 'credit';
create unique index if not exists wallet_transactions_commission_reversal_unique_idx
  on public.wallet_transactions (referral_commission_id)
  where referral_commission_id is not null and transaction_type = 'referral_reversal';
create unique index if not exists wallet_transactions_withdrawal_debit_unique_idx
  on public.wallet_transactions (withdrawal_request_id)
  where withdrawal_request_id is not null and transaction_type = 'withdrawal';
create unique index if not exists wallet_transactions_withdrawal_refund_unique_idx
  on public.wallet_transactions (withdrawal_request_id)
  where withdrawal_request_id is not null and transaction_type = 'withdrawal_refund';
create index if not exists wallet_transactions_user_idx
  on public.wallet_transactions (user_id, created_at desc);

create or replace function public.is_referral_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g')), '');
$$;

create or replace function public.generate_unique_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_existing text;
  v_candidate text;
  v_attempt integer := 0;
begin
  select referral_code into v_existing
  from public.profiles where id = p_user_id for update;

  if v_existing is not null then
    return upper(v_existing);
  end if;

  loop
    v_candidate := 'KD-' || case
      when v_attempt = 0 then upper(substr(replace(p_user_id::text, '-', ''), 1, 8))
      else upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
    end;

    begin
      update public.profiles
      set referral_code = v_candidate
      where id = p_user_id and referral_code is null;

      if found then return v_candidate; end if;
      select referral_code into v_existing from public.profiles where id = p_user_id;
      if v_existing is not null then return upper(v_existing); end if;
    exception when unique_violation then
      null;
    end;

    v_attempt := v_attempt + 1;
    if v_attempt > 25 then
      raise exception 'Unable to generate a unique referral code';
    end if;
  end loop;
end;
$$;

create or replace function public.validate_referral_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when public.normalize_referral_code(p_code) is null then
      jsonb_build_object('valid', false, 'message', 'Enter a referral code.')
    when exists (
      select 1 from public.profiles
      where upper(referral_code) = public.normalize_referral_code(p_code)
        and coalesce(role, 'customer') <> 'admin'
    ) then jsonb_build_object(
      'valid', true,
      'code', public.normalize_referral_code(p_code),
      'message', 'Valid Kushi Digitals referral code.'
    )
    else jsonb_build_object(
      'valid', false,
      'code', public.normalize_referral_code(p_code),
      'message', 'This referral code is invalid or unavailable.'
    )
  end;
$$;

create or replace function public.claim_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := public.normalize_referral_code(p_code);
  v_referrer_id uuid;
  v_existing_parent uuid;
  v_cycle boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if v_code is null then return jsonb_build_object('success', false, 'message', 'Enter a referral code.'); end if;

  perform 1 from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Customer profile is not ready yet'; end if;

  select referred_by into v_existing_parent from public.profiles where id = v_user_id;
  if v_existing_parent is not null then
    return jsonb_build_object('success', true, 'already_claimed', true, 'message', 'Your permanent referrer is already assigned.');
  end if;

  select id into v_referrer_id from public.profiles
  where upper(referral_code) = v_code and coalesce(role, 'customer') <> 'admin';
  if v_referrer_id is null then return jsonb_build_object('success', false, 'message', 'This referral code is invalid or unavailable.'); end if;
  if v_referrer_id = v_user_id then return jsonb_build_object('success', false, 'message', 'You cannot use your own referral code.'); end if;

  if exists (
    select 1 from public.orders
    where user_id = v_user_id and status = 'completed' and payment_status = 'paid'
  ) then
    return jsonb_build_object('success', false, 'message', 'A referral parent cannot be added after an eligible completed order.');
  end if;

  with recursive ancestry as (
    select p.id, p.referred_by, array[p.id]::uuid[] as path, false as cycle
    from public.profiles p where p.id = v_referrer_id
    union all
    select p.id, p.referred_by, a.path || p.id, p.id = any(a.path)
    from public.profiles p join ancestry a on p.id = a.referred_by
    where not a.cycle
  )
  select coalesce(bool_or(id = v_user_id or cycle), false) into v_cycle from ancestry;

  if v_cycle then return jsonb_build_object('success', false, 'message', 'This referral relationship would create an invalid loop.'); end if;

  update public.profiles
  set referred_by = v_referrer_id, referral_joined_at = now()
  where id = v_user_id and referred_by is null;

  return jsonb_build_object('success', true, 'code', v_code, 'message', 'Referral code applied. Your referrer is now permanently assigned.');
end;
$$;

create or replace function public.initialize_kd_referral_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_inviter_code text := public.normalize_referral_code(new.raw_user_meta_data ->> 'inviter_code');
  v_referrer_id uuid;
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'customer'
  )
  on conflict (id) do nothing;

  perform public.generate_unique_referral_code(new.id);
  insert into public.wallet_accounts (user_id) values (new.id) on conflict (user_id) do nothing;

  if v_inviter_code is not null then
    select id into v_referrer_id from public.profiles
    where upper(referral_code) = v_inviter_code
      and id <> new.id and coalesce(role, 'customer') <> 'admin';

    if v_referrer_id is not null then
      update public.profiles
      set referred_by = v_referrer_id, referral_joined_at = now()
      where id = new.id and referred_by is null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_kd_initialize_referral_profile on auth.users;
create trigger zz_kd_initialize_referral_profile
after insert on auth.users
for each row execute function public.initialize_kd_referral_profile();

create or replace function public.protect_profile_referral_fields()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if (old.referral_code, old.referred_by, old.referral_joined_at)
     is distinct from
     (new.referral_code, new.referred_by, new.referral_joined_at)
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Referral identity and parent are server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_referral_fields_trigger on public.profiles;
create trigger protect_profile_referral_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_referral_fields();

create or replace function public._credit_referral_reward(
  p_order_id uuid, p_buyer_id uuid, p_beneficiary_id uuid,
  p_source_user_id uuid, p_reward_type text, p_level smallint,
  p_percentage numeric, p_base numeric
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_amount numeric(14,2) := round((p_base * p_percentage / 100.0)::numeric, 2);
  v_commission public.referral_commissions%rowtype;
  v_inserted_transaction uuid;
  v_transaction_type text := 'referral_' || p_reward_type;
  v_account public.wallet_accounts%rowtype;
  v_debt_payment numeric(14,2);
begin
  if v_amount <= 0 then return; end if;

  insert into public.referral_commissions (
    order_id, buyer_id, beneficiary_user_id, source_referral_user_id,
    reward_type, referral_level, commission_percentage, commission_base,
    commission_amount, status, available_at
  ) values (
    p_order_id, p_buyer_id, p_beneficiary_id, p_source_user_id,
    p_reward_type, p_level, p_percentage, p_base, v_amount, 'available', now()
  )
  on conflict (order_id, reward_type) do nothing
  returning * into v_commission;

  if v_commission.id is null then return; end if;

  insert into public.wallet_accounts (user_id) values (p_beneficiary_id)
  on conflict (user_id) do nothing;

  insert into public.wallet_transactions (
    user_id, amount, direction, transaction_type, status, order_id,
    referral_commission_id, description, available_at
  ) values (
    p_beneficiary_id, v_amount, 'credit', v_transaction_type, 'available', p_order_id,
    v_commission.id,
    case p_reward_type
      when 'buyer_cashback' then 'Buyer cashback from an eligible completed order'
      when 'level_1' then 'Level 1 referral commission'
      when 'level_2' then 'Level 2 referral commission'
      else 'Level 3 referral commission'
    end,
    now()
  )
  on conflict do nothing returning id into v_inserted_transaction;

  if v_inserted_transaction is not null then
    select * into v_account from public.wallet_accounts
    where user_id = p_beneficiary_id for update;
    v_debt_payment := least(v_account.debt_balance, v_amount);

    update public.wallet_accounts
    set available_balance = available_balance + (v_amount - v_debt_payment),
        debt_balance = debt_balance - v_debt_payment,
        lifetime_earnings = lifetime_earnings + v_amount,
        updated_at = now()
    where user_id = p_beneficiary_id;
  end if;
end;
$$;

create or replace function public._process_order_referral_rewards(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_buyer_role text;
  v_level_1 uuid;
  v_level_2 uuid;
  v_level_3 uuid;
  v_ids uuid[];
  v_before integer;
  v_after integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if v_order.status <> 'completed' or coalesce(v_order.payment_status, '') <> 'paid'
     or v_order.final_price is null or v_order.final_price <= 0
     or v_order.archived_at is not null then
    return jsonb_build_object('processed', false, 'message', 'Order is not eligible. It must be completed, paid, positive-value, and active.');
  end if;

  select role, referred_by into v_buyer_role, v_level_1
  from public.profiles where id = v_order.user_id;
  if coalesce(v_buyer_role, 'customer') = 'admin' then
    return jsonb_build_object('processed', false, 'message', 'Admin accounts are not eligible for referral rewards.');
  end if;
  if v_level_1 is null then
    return jsonb_build_object('processed', false, 'message', 'Buyer has no permanent referral parent.');
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_level_1 and coalesce(role, 'customer') <> 'admin'
  ) then
    return jsonb_build_object('processed', false, 'message', 'The direct referrer is unavailable or ineligible.');
  end if;

  select referred_by into v_level_2 from public.profiles where id = v_level_1;
  if v_level_2 is not null and not exists (
    select 1 from public.profiles
    where id = v_level_2 and coalesce(role, 'customer') <> 'admin'
  ) then
    v_level_2 := null;
  end if;

  if v_level_2 is not null then
    select referred_by into v_level_3 from public.profiles where id = v_level_2;
  end if;

  if v_level_3 is not null and not exists (
    select 1 from public.profiles
    where id = v_level_3 and coalesce(role, 'customer') <> 'admin'
  ) then
    v_level_3 := null;
  end if;

  v_ids := array_remove(array[v_order.user_id, v_level_1, v_level_2, v_level_3], null);
  if (select count(*) from unnest(v_ids) as item(id))
     <> (select count(distinct id) from unnest(v_ids) as item(id)) then
    raise exception 'Corrupt referral chain detected; no rewards were created';
  end if;

  select count(*) into v_before from public.referral_commissions where order_id = p_order_id;
  perform public._credit_referral_reward(
    p_order_id,
    v_order.user_id,
    v_order.user_id,
    v_level_1,
    'buyer_cashback'::text,
    0::smallint,
    10::numeric,
    v_order.final_price::numeric
  );
  perform public._credit_referral_reward(
    p_order_id,
    v_order.user_id,
    v_level_1,
    v_order.user_id,
    'level_1'::text,
    1::smallint,
    10::numeric,
    v_order.final_price::numeric
  );
  if v_level_2 is not null then
    perform public._credit_referral_reward(
      p_order_id,
      v_order.user_id,
      v_level_2,
      v_level_1,
      'level_2'::text,
      2::smallint,
      3::numeric,
      v_order.final_price::numeric
    );
  end if;
  if v_level_3 is not null then
    perform public._credit_referral_reward(
      p_order_id,
      v_order.user_id,
      v_level_3,
      v_level_2,
      'level_3'::text,
      3::smallint,
      2::numeric,
      v_order.final_price::numeric
    );
  end if;
  select count(*) into v_after from public.referral_commissions where order_id = p_order_id;

  return jsonb_build_object('processed', true, 'created', v_after - v_before, 'total_rewards', v_after, 'message', 'Referral rewards synchronized successfully.');
end;
$$;

create or replace function public._reverse_referral_commission(
  p_commission_id uuid, p_reason text, p_actor uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reward public.referral_commissions%rowtype;
  v_credit public.wallet_transactions%rowtype;
  v_account public.wallet_accounts%rowtype;
  v_reversal_id uuid;
  v_from_available numeric(14,2);
  v_shortfall numeric(14,2);
begin
  if nullif(trim(p_reason), '') is null then raise exception 'A reversal reason is required'; end if;
  select * into v_reward from public.referral_commissions where id = p_commission_id for update;
  if not found then raise exception 'Referral reward not found'; end if;
  if v_reward.status = 'reversed' then return false; end if;

  select * into v_credit from public.wallet_transactions
  where referral_commission_id = v_reward.id and direction = 'credit' for update;
  select * into v_account from public.wallet_accounts
  where user_id = v_reward.beneficiary_user_id for update;

  insert into public.wallet_transactions (
    user_id, amount, direction, transaction_type, status, order_id,
    referral_commission_id, reversal_of_transaction_id, description, available_at,
    metadata
  ) values (
    v_reward.beneficiary_user_id, v_reward.commission_amount, 'debit',
    'referral_reversal', 'available', v_reward.order_id, v_reward.id, v_credit.id,
    'Referral reward reversed: ' || trim(p_reason), now(),
    jsonb_build_object('reason', trim(p_reason), 'actor', p_actor)
  ) on conflict do nothing returning id into v_reversal_id;

  if v_reversal_id is null then
    update public.referral_commissions
    set status = 'reversed', reversed_at = coalesce(reversed_at, now()),
        reversal_reason = coalesce(reversal_reason, trim(p_reason)),
        reversed_by = coalesce(reversed_by, p_actor)
    where id = v_reward.id;
    return false;
  end if;

  v_from_available := least(v_account.available_balance, v_reward.commission_amount);
  v_shortfall := v_reward.commission_amount - v_from_available;
  update public.wallet_accounts
  set available_balance = available_balance - v_from_available,
      debt_balance = debt_balance + v_shortfall,
      lifetime_earnings = greatest(
        lifetime_earnings - v_reward.commission_amount,
        0
      ),
      updated_at = now()
  where user_id = v_reward.beneficiary_user_id;

  update public.referral_commissions
  set status = 'reversed', reversed_at = now(), reversal_reason = trim(p_reason), reversed_by = p_actor
  where id = v_reward.id;
  update public.wallet_transactions set status = 'reversed' where id = v_credit.id;
  return true;
end;
$$;

create or replace function public._reverse_order_referral_rewards(p_order_id uuid, p_reason text, p_actor uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_row record; v_count integer := 0;
begin
  for v_row in select id from public.referral_commissions where order_id = p_order_id and status <> 'reversed' for update
  loop
    if public._reverse_referral_commission(v_row.id, p_reason, p_actor) then v_count := v_count + 1; end if;
  end loop;
  return jsonb_build_object('reversed', v_count, 'message', format('%s referral reward(s) reversed.', v_count));
end;
$$;

create or replace function public.sync_order_referral_rewards()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed' and new.payment_status = 'paid'
     and new.final_price is not null and new.final_price > 0
     and new.archived_at is null then
    perform public._process_order_referral_rewards(new.id);
  elsif new.status in ('cancelled', 'rejected') or new.payment_status = 'refunded' then
    perform public._reverse_order_referral_rewards(
      new.id,
      'Automatic reversal after order/payment changed to ' || coalesce(new.status, 'unknown') || '/' || coalesce(new.payment_status, 'unknown'),
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sync_order_referral_rewards_trigger on public.orders;
create trigger sync_order_referral_rewards_trigger
after insert or update of status, payment_status, final_price, archived_at on public.orders
for each row execute function public.sync_order_referral_rewards();

create or replace function public.admin_retry_order_referral_rewards(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_referral_admin() then raise exception 'Admin access is required'; end if;
  return public._process_order_referral_rewards(p_order_id);
end;
$$;

create or replace function public.admin_reverse_referral_reward(p_commission_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_changed boolean;
begin
  if not public.is_referral_admin() then raise exception 'Admin access is required'; end if;
  v_changed := public._reverse_referral_commission(p_commission_id, p_reason, auth.uid());
  return jsonb_build_object('reversed', v_changed, 'message', case when v_changed then 'Reward reversed successfully.' else 'Reward was already reversed.' end);
end;
$$;

create or replace function public.admin_reverse_order_referral_rewards(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_referral_admin() then raise exception 'Admin access is required'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'A reversal reason is required'; end if;
  return public._reverse_order_referral_rewards(p_order_id, trim(p_reason), auth.uid());
end;
$$;

create or replace function public.get_my_referral_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with recursive network as (
    select p.id, p.referred_by, p.referral_joined_at, 1 as level, array[p.id]::uuid[] as path
    from public.profiles p where p.referred_by = auth.uid()
    union all
    select p.id, p.referred_by, p.referral_joined_at, n.level + 1, n.path || p.id
    from public.profiles p join network n on p.referred_by = n.id
    where n.level < 3 and not p.id = any(n.path)
  )
  select jsonb_build_object(
    'referral_code', me.referral_code,
    'has_referrer', me.referred_by is not null,
    'summary', jsonb_build_object(
      'direct_referrals', (select count(*) from network where level = 1),
      'network_members', (select count(*) from network),
      'level_1_count', (select count(*) from network where level = 1),
      'level_2_count', (select count(*) from network where level = 2),
      'level_3_count', (select count(*) from network where level = 3),
      'pending_earnings', coalesce((select sum(commission_amount) from public.referral_commissions where beneficiary_user_id = auth.uid() and status = 'pending'), 0),
      'available_earnings', coalesce(wa.available_balance, 0),
      'lifetime_earnings', coalesce(wa.lifetime_earnings, 0),
      'buyer_cashback', coalesce((select sum(commission_amount) from public.referral_commissions where beneficiary_user_id = auth.uid() and reward_type = 'buyer_cashback'), 0)
    ),
    'network', coalesce((select jsonb_agg(jsonb_build_object(
      'id', n.id, 'label', left(coalesce(p.full_name, 'Customer'), 1) || '***',
      'level', n.level, 'joined_at', n.referral_joined_at
    ) order by n.level, n.referral_joined_at desc) from network n join public.profiles p on p.id = n.id), '[]'::jsonb),
    'earnings', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'order_id', c.order_id, 'reward_type', c.reward_type,
      'level', c.referral_level, 'percentage', c.commission_percentage,
      'base', c.commission_base, 'amount', c.commission_amount,
      'status', c.status, 'created_at', c.created_at, 'available_at', c.available_at,
      'reversed_at', c.reversed_at, 'reversal_reason', c.reversal_reason
    ) order by c.created_at desc) from public.referral_commissions c where c.beneficiary_user_id = auth.uid()), '[]'::jsonb)
  )
  from public.profiles me left join public.wallet_accounts wa on wa.user_id = me.id
  where me.id = auth.uid();
$$;

create or replace function public.get_my_wallet_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select jsonb_build_object(
    'available_balance', coalesce(wa.available_balance, 0),
    'pending_balance', coalesce(wa.pending_balance, 0),
    'debt_balance', coalesce(wa.debt_balance, 0),
    'lifetime_earnings', coalesce(wa.lifetime_earnings, 0),
    'total_withdrawn', coalesce(wa.total_withdrawn, 0),
    'referral_commission', coalesce((select sum(commission_amount) from public.referral_commissions where beneficiary_user_id = auth.uid() and reward_type <> 'buyer_cashback' and status = 'available'), 0),
    'buyer_cashback', coalesce((select sum(commission_amount) from public.referral_commissions where beneficiary_user_id = auth.uid() and reward_type = 'buyer_cashback' and status = 'available'), 0),
    'transactions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'amount', t.amount, 'direction', t.direction,
      'transaction_type', t.transaction_type, 'status', t.status,
      'order_id', t.order_id, 'description', t.description, 'created_at', t.created_at
    ) order by t.created_at desc) from public.wallet_transactions t where t.user_id = auth.uid()), '[]'::jsonb),
    'withdrawals', coalesce((select jsonb_agg(jsonb_build_object(
      'id', w.id, 'amount', w.amount, 'upi_id', w.payout_upi_id,
      'status', w.status, 'requested_at', w.requested_at, 'admin_note', w.admin_note
    ) order by w.requested_at desc) from public.wallet_withdrawal_requests w where w.user_id = auth.uid()), '[]'::jsonb)
  ) from public.wallet_accounts wa where wa.user_id = auth.uid();
$$;

create or replace function public.request_wallet_withdrawal(p_amount numeric, p_upi_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare v_user uuid := auth.uid(); v_account public.wallet_accounts%rowtype; v_request uuid;
begin
  if v_user is null then raise exception 'Authentication is required'; end if;
  if round(p_amount, 2) < 500 then raise exception 'Minimum withdrawal amount is ₹500'; end if;
  if nullif(trim(p_upi_id), '') is null or trim(p_upi_id) !~ '^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$' then raise exception 'Enter a valid UPI ID'; end if;
  select * into v_account from public.wallet_accounts where user_id = v_user for update;
  if v_account.debt_balance > 0 then raise exception 'Withdrawals are unavailable while the wallet has a reversal debt'; end if;
  if v_account.available_balance < round(p_amount, 2) then raise exception 'Insufficient available wallet balance'; end if;

  insert into public.wallet_withdrawal_requests (user_id, amount, payout_upi_id)
  values (v_user, round(p_amount, 2), lower(trim(p_upi_id))) returning id into v_request;
  insert into public.wallet_transactions (
    user_id, amount, direction, transaction_type, status, withdrawal_request_id, description
  ) values (v_user, round(p_amount, 2), 'debit', 'withdrawal', 'pending', v_request, 'Wallet withdrawal requested');
  update public.wallet_accounts set available_balance = available_balance - round(p_amount, 2), updated_at = now() where user_id = v_user;
  return jsonb_build_object('success', true, 'request_id', v_request, 'message', 'Withdrawal request submitted.');
end;
$$;

create or replace function public.admin_update_withdrawal(p_request_id uuid, p_status text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_request public.wallet_withdrawal_requests%rowtype;
  v_refund uuid;
  v_account public.wallet_accounts%rowtype;
  v_debt_payment numeric(14,2);
begin
  if not public.is_referral_admin() then raise exception 'Admin access is required'; end if;
  if p_status not in ('processing', 'paid', 'rejected') then raise exception 'Invalid withdrawal status'; end if;
  select * into v_request from public.wallet_withdrawal_requests where id = p_request_id for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if v_request.status in ('paid', 'rejected', 'cancelled') then raise exception 'This withdrawal request is already final'; end if;

  update public.wallet_withdrawal_requests set status = p_status, admin_note = nullif(trim(p_note), ''),
    processed_at = case when p_status in ('paid', 'rejected') then now() else processed_at end,
    processed_by = auth.uid() where id = p_request_id;
  if p_status = 'paid' then
    update public.wallet_accounts set total_withdrawn = total_withdrawn + v_request.amount, updated_at = now() where user_id = v_request.user_id;
    update public.wallet_transactions set status = 'available' where withdrawal_request_id = p_request_id and transaction_type = 'withdrawal';
  elsif p_status = 'rejected' then
    insert into public.wallet_transactions (
      user_id, amount, direction, transaction_type, status, withdrawal_request_id, description, available_at
    ) values (v_request.user_id, v_request.amount, 'credit', 'withdrawal_refund', 'available', p_request_id,
      'Rejected withdrawal returned to wallet', now()) on conflict do nothing returning id into v_refund;
    if v_refund is not null then
      select * into v_account from public.wallet_accounts where user_id = v_request.user_id for update;
      v_debt_payment := least(v_account.debt_balance, v_request.amount);
      update public.wallet_accounts
      set debt_balance = debt_balance - v_debt_payment,
          available_balance = available_balance + (v_request.amount - v_debt_payment),
          updated_at = now()
      where user_id = v_request.user_id;
      update public.wallet_transactions set status = 'rejected' where withdrawal_request_id = p_request_id and transaction_type = 'withdrawal';
    end if;
  end if;
  return jsonb_build_object('success', true, 'message', 'Withdrawal status updated.');
end;
$$;

create or replace function public.admin_get_referral_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare v_result jsonb;
begin
  if not public.is_referral_admin() then raise exception 'Admin access is required'; end if;
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'referral_members', (select count(*) from public.profiles where referred_by is not null),
      'relationships', (select count(*) from public.profiles where referred_by is not null),
      'pending_rewards', coalesce((select sum(commission_amount) from public.referral_commissions where status = 'pending'), 0),
      'available_rewards', coalesce((select sum(commission_amount) from public.referral_commissions where status = 'available'), 0),
      'reversed_rewards', coalesce((select sum(commission_amount) from public.referral_commissions where status = 'reversed'), 0),
      'total_distribution', coalesce((select sum(commission_amount) from public.referral_commissions), 0),
      'buyer_cashback', coalesce((select sum(commission_amount) from public.referral_commissions where reward_type = 'buyer_cashback'), 0),
      'level_1', coalesce((select sum(commission_amount) from public.referral_commissions where reward_type = 'level_1'), 0),
      'level_2', coalesce((select sum(commission_amount) from public.referral_commissions where reward_type = 'level_2'), 0),
      'level_3', coalesce((select sum(commission_amount) from public.referral_commissions where reward_type = 'level_3'), 0)
    ),
    'relationships', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'customer_name', p.full_name, 'referral_code', p.referral_code,
      'referrer_name', parent.full_name, 'referrer_code', parent.referral_code,
      'joined_at', p.referral_joined_at,
      'level_1_count', (select count(*) from public.profiles l1 where l1.referred_by = p.id),
      'level_2_count', (select count(*) from public.profiles l2 join public.profiles l1 on l2.referred_by = l1.id where l1.referred_by = p.id),
      'level_3_count', (select count(*) from public.profiles l3 join public.profiles l2 on l3.referred_by = l2.id join public.profiles l1 on l2.referred_by = l1.id where l1.referred_by = p.id)
    ) order by p.referral_joined_at desc) from public.profiles p join public.profiles parent on parent.id = p.referred_by), '[]'::jsonb),
    'commissions', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'order_id', c.order_id, 'buyer_name', buyer.full_name,
      'beneficiary_name', beneficiary.full_name, 'beneficiary_code', beneficiary.referral_code,
      'reward_type', c.reward_type, 'level', c.referral_level,
      'percentage', c.commission_percentage, 'base', c.commission_base,
      'amount', c.commission_amount, 'status', c.status, 'created_at', c.created_at,
      'available_at', c.available_at, 'reversed_at', c.reversed_at,
      'reversal_reason', c.reversal_reason
    ) order by c.created_at desc) from public.referral_commissions c
      join public.profiles buyer on buyer.id = c.buyer_id
      join public.profiles beneficiary on beneficiary.id = c.beneficiary_user_id), '[]'::jsonb),
    'withdrawals', coalesce((select jsonb_agg(jsonb_build_object(
      'id', w.id, 'customer_name', p.full_name, 'referral_code', p.referral_code,
      'amount', w.amount, 'upi_id', w.payout_upi_id, 'status', w.status,
      'requested_at', w.requested_at, 'admin_note', w.admin_note
    ) order by w.requested_at desc) from public.wallet_withdrawal_requests w join public.profiles p on p.id = w.user_id), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_get_referral_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_referral_admin() then raise exception 'Admin access is required'; end if;
  return jsonb_build_object(
    'total', coalesce((select sum(commission_amount) from public.referral_commissions), 0),
    'pending', coalesce((select sum(commission_amount) from public.referral_commissions where status = 'pending'), 0),
    'available', coalesce((select sum(commission_amount) from public.referral_commissions where status = 'available'), 0)
  );
end;
$$;

-- Backfill only identity codes and wallet rows. Existing users are not assigned parents.
do $$
declare v_profile record;
begin
  for v_profile in select id from public.profiles where coalesce(role, 'customer') <> 'admin'
  loop
    perform public.generate_unique_referral_code(v_profile.id);
    insert into public.wallet_accounts (user_id) values (v_profile.id) on conflict (user_id) do nothing;
  end loop;
end $$;

alter table public.referral_commissions enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_withdrawal_requests enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='referral_commissions' and policyname='Customers read own referral rewards') then
    create policy "Customers read own referral rewards" on public.referral_commissions for select to authenticated
      using (beneficiary_user_id = auth.uid() or public.is_referral_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wallet_accounts' and policyname='Customers read own wallet') then
    create policy "Customers read own wallet" on public.wallet_accounts for select to authenticated
      using (user_id = auth.uid() or public.is_referral_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wallet_transactions' and policyname='Customers read own wallet transactions') then
    create policy "Customers read own wallet transactions" on public.wallet_transactions for select to authenticated
      using (user_id = auth.uid() or public.is_referral_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wallet_withdrawal_requests' and policyname='Customers read own withdrawals') then
    create policy "Customers read own withdrawals" on public.wallet_withdrawal_requests for select to authenticated
      using (user_id = auth.uid() or public.is_referral_admin());
  end if;
end $$;

revoke all on public.referral_commissions, public.wallet_accounts, public.wallet_transactions, public.wallet_withdrawal_requests from anon, authenticated;
grant select on public.referral_commissions, public.wallet_accounts, public.wallet_transactions, public.wallet_withdrawal_requests to authenticated;

revoke all on function public.generate_unique_referral_code(uuid) from public, anon, authenticated;
revoke all on function public._credit_referral_reward(uuid,uuid,uuid,uuid,text,smallint,numeric,numeric) from public, anon, authenticated;
revoke all on function public._process_order_referral_rewards(uuid) from public, anon, authenticated;
revoke all on function public._reverse_referral_commission(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public._reverse_order_referral_rewards(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.claim_referral_code(text) from public, anon, authenticated;
revoke all on function public.get_my_referral_dashboard() from public, anon, authenticated;
revoke all on function public.get_my_wallet_dashboard() from public, anon, authenticated;
revoke all on function public.request_wallet_withdrawal(numeric,text) from public, anon, authenticated;
revoke all on function public.admin_retry_order_referral_rewards(uuid) from public, anon, authenticated;
revoke all on function public.admin_reverse_referral_reward(uuid,text) from public, anon, authenticated;
revoke all on function public.admin_reverse_order_referral_rewards(uuid,text) from public, anon, authenticated;
revoke all on function public.admin_update_withdrawal(uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_get_referral_dashboard() from public, anon, authenticated;
revoke all on function public.admin_get_referral_metrics() from public, anon, authenticated;
grant execute on function public.validate_referral_code(text) to anon, authenticated;
grant execute on function public.claim_referral_code(text) to authenticated;
grant execute on function public.get_my_referral_dashboard() to authenticated;
grant execute on function public.get_my_wallet_dashboard() to authenticated;
grant execute on function public.request_wallet_withdrawal(numeric,text) to authenticated;
grant execute on function public.admin_retry_order_referral_rewards(uuid) to authenticated;
grant execute on function public.admin_reverse_referral_reward(uuid,text) to authenticated;
grant execute on function public.admin_reverse_order_referral_rewards(uuid,text) to authenticated;
grant execute on function public.admin_update_withdrawal(uuid,text,text) to authenticated;
grant execute on function public.admin_get_referral_dashboard() to authenticated;
grant execute on function public.admin_get_referral_metrics() to authenticated;

comment on table public.referral_commissions is 'Immutable calculation records for buyer cashback and referral levels 1-3.';
comment on table public.wallet_transactions is 'Auditable wallet ledger. Balances change only inside server-side functions.';
comment on column public.wallet_accounts.debt_balance is 'Reversal shortfall after rewards were already withdrawn; blocks new withdrawals.';
