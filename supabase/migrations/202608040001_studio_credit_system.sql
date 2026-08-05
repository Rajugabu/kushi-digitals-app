-- Kushi Digitals Studio credits are a prepaid usage ledger. They are
-- intentionally isolated from wallet_accounts and wallet_transactions,
-- which continue to represent monetary earnings and withdrawals.

create extension if not exists pgcrypto;

alter table public.studio_generations
  add column if not exists credit_cost smallint,
  add column if not exists credit_status text not null default 'not_required';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_generations_credit_cost_check'
      and conrelid = 'public.studio_generations'::regclass
  ) then
    alter table public.studio_generations
      add constraint studio_generations_credit_cost_check
      check (
        credit_cost is null
        or (
          generation_mode = 'single_portrait_style'
          and credit_cost = 3
        )
        or (
          generation_mode in (
            'double_image_composition',
            'banner_or_template_style'
          )
          and credit_cost = 4
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'studio_generations_credit_status_check'
      and conrelid = 'public.studio_generations'::regclass
  ) then
    alter table public.studio_generations
      add constraint studio_generations_credit_status_check
      check (
        credit_status in (
          'not_required',
          'unreserved',
          'reserved',
          'finalized',
          'released'
        )
      );
  end if;
end $$;

alter table public.studio_generations
  alter column credit_status set default 'unreserved';

create or replace function public.validate_new_studio_generation_credit_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_id is null then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_GENERATION_USER_REQUIRED';
  end if;

  if new.credit_cost is null or new.credit_cost not in (3, 4) then
    raise exception using
      errcode = '23514',
      message = 'INVALID_STUDIO_CREDIT_COST';
  end if;

  if new.credit_status <> 'unreserved' then
    raise exception using
      errcode = '23514',
      message = 'NEW_STUDIO_GENERATION_MUST_BE_UNRESERVED';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_new_studio_generation_credit_fields
  on public.studio_generations;
create trigger validate_new_studio_generation_credit_fields
before insert on public.studio_generations
for each row execute function public.validate_new_studio_generation_credit_fields();

create table if not exists public.studio_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete restrict,
  available_credits bigint not null default 0,
  reserved_credits bigint not null default 0,
  lifetime_purchased bigint not null default 0,
  lifetime_used bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_credit_accounts_nonnegative_check check (
    available_credits >= 0
    and reserved_credits >= 0
    and lifetime_purchased >= 0
    and lifetime_used >= 0
  )
);

create table if not exists public.studio_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  generation_id uuid references public.studio_generations(id) on delete restrict,
  transaction_type text not null,
  credits bigint not null,
  available_delta bigint not null,
  reserved_delta bigint not null,
  available_credits_after bigint not null,
  reserved_credits_after bigint not null,
  idempotency_key text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint studio_credit_transactions_type_check check (
    transaction_type in (
      'purchase',
      'manual_add',
      'reserve',
      'finalize',
      'release'
    )
  ),
  constraint studio_credit_transactions_credits_check check (credits > 0),
  constraint studio_credit_transactions_balances_check check (
    available_credits_after >= 0
    and reserved_credits_after >= 0
  ),
  constraint studio_credit_transactions_idempotency_key_check check (
    length(trim(idempotency_key)) > 0
  ),
  constraint studio_credit_transactions_generation_check check (
    (
      transaction_type in ('reserve', 'finalize', 'release')
      and generation_id is not null
    )
    or (
      transaction_type in ('purchase', 'manual_add')
      and generation_id is null
    )
  ),
  constraint studio_credit_transactions_delta_check check (
    (
      transaction_type in ('purchase', 'manual_add')
      and available_delta = credits
      and reserved_delta = 0
    )
    or (
      transaction_type = 'reserve'
      and available_delta = -credits
      and reserved_delta = credits
    )
    or (
      transaction_type = 'finalize'
      and available_delta = 0
      and reserved_delta = -credits
    )
    or (
      transaction_type = 'release'
      and available_delta = credits
      and reserved_delta = -credits
    )
  ),
  constraint studio_credit_transactions_idempotency_unique unique (
    idempotency_key
  )
);

create unique index if not exists studio_credit_transactions_generation_event_idx
  on public.studio_credit_transactions (generation_id, transaction_type)
  where generation_id is not null;

create index if not exists studio_credit_transactions_user_created_idx
  on public.studio_credit_transactions (user_id, created_at desc);

create index if not exists studio_credit_transactions_generation_idx
  on public.studio_credit_transactions (generation_id)
  where generation_id is not null;

create or replace function public.set_studio_credit_account_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_studio_credit_accounts_updated_at
  on public.studio_credit_accounts;
create trigger set_studio_credit_accounts_updated_at
before update on public.studio_credit_accounts
for each row execute function public.set_studio_credit_account_updated_at();

create or replace function public.initialize_studio_credit_account()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.studio_credit_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists zz_initialize_studio_credit_account on auth.users;
create trigger zz_initialize_studio_credit_account
after insert on auth.users
for each row execute function public.initialize_studio_credit_account();

insert into public.studio_credit_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.require_studio_credit_service_role()
returns void
language plpgsql
stable
security invoker
set search_path = auth, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'STUDIO_CREDIT_SERVICE_ROLE_REQUIRED';
  end if;
end;
$$;

create or replace function public.reserve_studio_credits(
  p_generation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_generation public.studio_generations%rowtype;
  v_account public.studio_credit_accounts%rowtype;
  v_existing public.studio_credit_transactions%rowtype;
begin
  perform public.require_studio_credit_service_role();

  if p_generation_id is null then
    raise exception using
      errcode = '22004',
      message = 'STUDIO_GENERATION_ID_REQUIRED';
  end if;

  select * into v_generation
  from public.studio_generations
  where id = p_generation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'STUDIO_GENERATION_NOT_FOUND';
  end if;

  if v_generation.user_id is null then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_GENERATION_USER_REQUIRED';
  end if;

  if v_generation.credit_cost is null
     or v_generation.credit_cost not in (3, 4) then
    raise exception using
      errcode = '23514',
      message = 'INVALID_STUDIO_CREDIT_COST';
  end if;

  insert into public.studio_credit_accounts (user_id)
  values (v_generation.user_id)
  on conflict (user_id) do nothing;

  select * into v_account
  from public.studio_credit_accounts
  where user_id = v_generation.user_id
  for update;

  select * into v_existing
  from public.studio_credit_transactions
  where generation_id = p_generation_id
    and transaction_type = 'reserve';

  if found then
    if v_existing.user_id <> v_generation.user_id
       or v_existing.credits <> v_generation.credit_cost then
      raise exception using
        errcode = '23505',
        message = 'STUDIO_CREDIT_IDEMPOTENCY_CONFLICT';
    end if;

    if exists (
      select 1 from public.studio_credit_transactions
      where generation_id = p_generation_id
        and transaction_type = 'finalize'
    ) then
      return jsonb_build_object(
        'status', 'finalized',
        'idempotent', true,
        'generation_id', p_generation_id,
        'credits', v_existing.credits,
        'available_credits', v_account.available_credits,
        'reserved_credits', v_account.reserved_credits
      );
    end if;

    if exists (
      select 1 from public.studio_credit_transactions
      where generation_id = p_generation_id
        and transaction_type = 'release'
    ) then
      return jsonb_build_object(
        'status', 'released',
        'idempotent', true,
        'generation_id', p_generation_id,
        'credits', v_existing.credits,
        'available_credits', v_account.available_credits,
        'reserved_credits', v_account.reserved_credits
      );
    end if;

    return jsonb_build_object(
      'status', 'reserved',
      'idempotent', true,
      'generation_id', p_generation_id,
      'credits', v_existing.credits,
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if v_generation.status not in ('pending', 'processing') then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_GENERATION_NOT_RESERVABLE';
  end if;

  if v_generation.credit_status in ('finalized', 'released') then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_GENERATION_CREDIT_STATE_INVALID';
  end if;

  if v_account.available_credits < v_generation.credit_cost then
    raise exception using
      errcode = 'P0001',
      message = 'INSUFFICIENT_STUDIO_CREDITS',
      detail = jsonb_build_object(
        'required_credits', v_generation.credit_cost,
        'available_credits', v_account.available_credits
      )::text;
  end if;

  update public.studio_credit_accounts
  set available_credits = available_credits - v_generation.credit_cost,
      reserved_credits = reserved_credits + v_generation.credit_cost
  where user_id = v_generation.user_id
  returning * into v_account;

  insert into public.studio_credit_transactions (
    user_id,
    generation_id,
    transaction_type,
    credits,
    available_delta,
    reserved_delta,
    available_credits_after,
    reserved_credits_after,
    idempotency_key,
    description,
    metadata
  ) values (
    v_generation.user_id,
    p_generation_id,
    'reserve',
    v_generation.credit_cost,
    -v_generation.credit_cost,
    v_generation.credit_cost,
    v_account.available_credits,
    v_account.reserved_credits,
    'studio:reserve:' || p_generation_id::text,
    'Credits reserved for Studio generation',
    jsonb_build_object(
      'style_id', v_generation.style_id,
      'ratio', v_generation.ratio
    )
  );

  update public.studio_generations
  set credit_status = 'reserved'
  where id = p_generation_id;

  return jsonb_build_object(
    'status', 'reserved',
    'idempotent', false,
    'generation_id', p_generation_id,
    'credits', v_generation.credit_cost,
    'available_credits', v_account.available_credits,
    'reserved_credits', v_account.reserved_credits
  );
end;
$$;

create or replace function public.finalize_studio_credits(
  p_generation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_generation public.studio_generations%rowtype;
  v_account public.studio_credit_accounts%rowtype;
  v_reservation public.studio_credit_transactions%rowtype;
begin
  perform public.require_studio_credit_service_role();

  select * into v_generation
  from public.studio_generations
  where id = p_generation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'STUDIO_GENERATION_NOT_FOUND';
  end if;

  select * into v_reservation
  from public.studio_credit_transactions
  where generation_id = p_generation_id
    and transaction_type = 'reserve';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_CREDITS_NOT_RESERVED';
  end if;

  select * into v_account
  from public.studio_credit_accounts
  where user_id = v_reservation.user_id
  for update;

  if exists (
    select 1 from public.studio_credit_transactions
    where generation_id = p_generation_id
      and transaction_type = 'finalize'
  ) then
    return jsonb_build_object(
      'status', 'finalized',
      'idempotent', true,
      'generation_id', p_generation_id,
      'credits', v_reservation.credits,
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if exists (
    select 1 from public.studio_credit_transactions
    where generation_id = p_generation_id
      and transaction_type = 'release'
  ) then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_CREDITS_ALREADY_RELEASED';
  end if;

  if v_generation.status <> 'completed' then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_GENERATION_NOT_COMPLETED';
  end if;

  if v_account.reserved_credits < v_reservation.credits then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_RESERVED_CREDIT_BALANCE_INVALID';
  end if;

  update public.studio_credit_accounts
  set reserved_credits = reserved_credits - v_reservation.credits,
      lifetime_used = lifetime_used + v_reservation.credits
  where user_id = v_reservation.user_id
  returning * into v_account;

  insert into public.studio_credit_transactions (
    user_id,
    generation_id,
    transaction_type,
    credits,
    available_delta,
    reserved_delta,
    available_credits_after,
    reserved_credits_after,
    idempotency_key,
    description,
    metadata
  ) values (
    v_reservation.user_id,
    p_generation_id,
    'finalize',
    v_reservation.credits,
    0,
    -v_reservation.credits,
    v_account.available_credits,
    v_account.reserved_credits,
    'studio:finalize:' || p_generation_id::text,
    'Credits used for completed Studio generation',
    jsonb_build_object('reservation_id', v_reservation.id)
  );

  update public.studio_generations
  set credit_status = 'finalized'
  where id = p_generation_id;

  return jsonb_build_object(
    'status', 'finalized',
    'idempotent', false,
    'generation_id', p_generation_id,
    'credits', v_reservation.credits,
    'available_credits', v_account.available_credits,
    'reserved_credits', v_account.reserved_credits
  );
end;
$$;

create or replace function public.release_studio_credits(
  p_generation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_generation public.studio_generations%rowtype;
  v_account public.studio_credit_accounts%rowtype;
  v_reservation public.studio_credit_transactions%rowtype;
begin
  perform public.require_studio_credit_service_role();

  select * into v_generation
  from public.studio_generations
  where id = p_generation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'STUDIO_GENERATION_NOT_FOUND';
  end if;

  select * into v_reservation
  from public.studio_credit_transactions
  where generation_id = p_generation_id
    and transaction_type = 'reserve';

  if not found then
    return jsonb_build_object(
      'status', 'not_reserved',
      'idempotent', true,
      'generation_id', p_generation_id,
      'credits', 0
    );
  end if;

  select * into v_account
  from public.studio_credit_accounts
  where user_id = v_reservation.user_id
  for update;

  if exists (
    select 1 from public.studio_credit_transactions
    where generation_id = p_generation_id
      and transaction_type = 'release'
  ) then
    return jsonb_build_object(
      'status', 'released',
      'idempotent', true,
      'generation_id', p_generation_id,
      'credits', v_reservation.credits,
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if exists (
    select 1 from public.studio_credit_transactions
    where generation_id = p_generation_id
      and transaction_type = 'finalize'
  ) then
    return jsonb_build_object(
      'status', 'finalized',
      'idempotent', true,
      'generation_id', p_generation_id,
      'credits', v_reservation.credits,
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if v_account.reserved_credits < v_reservation.credits then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_RESERVED_CREDIT_BALANCE_INVALID';
  end if;

  update public.studio_credit_accounts
  set available_credits = available_credits + v_reservation.credits,
      reserved_credits = reserved_credits - v_reservation.credits
  where user_id = v_reservation.user_id
  returning * into v_account;

  insert into public.studio_credit_transactions (
    user_id,
    generation_id,
    transaction_type,
    credits,
    available_delta,
    reserved_delta,
    available_credits_after,
    reserved_credits_after,
    idempotency_key,
    description,
    metadata
  ) values (
    v_reservation.user_id,
    p_generation_id,
    'release',
    v_reservation.credits,
    v_reservation.credits,
    -v_reservation.credits,
    v_account.available_credits,
    v_account.reserved_credits,
    'studio:release:' || p_generation_id::text,
    'Reserved credits returned after Studio generation did not complete',
    jsonb_build_object('reservation_id', v_reservation.id)
  );

  update public.studio_generations
  set credit_status = 'released'
  where id = p_generation_id;

  return jsonb_build_object(
    'status', 'released',
    'idempotent', false,
    'generation_id', p_generation_id,
    'credits', v_reservation.credits,
    'available_credits', v_account.available_credits,
    'reserved_credits', v_account.reserved_credits
  );
end;
$$;

create or replace function public.reconcile_studio_generation_credits(
  p_generation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_generation public.studio_generations%rowtype;
  v_account public.studio_credit_accounts%rowtype;
  v_reservation public.studio_credit_transactions%rowtype;
  v_result jsonb;
begin
  perform public.require_studio_credit_service_role();

  if p_generation_id is null then
    raise exception using
      errcode = '22004',
      message = 'STUDIO_GENERATION_ID_REQUIRED';
  end if;

  select * into v_generation
  from public.studio_generations
  where id = p_generation_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'STUDIO_GENERATION_NOT_FOUND';
  end if;

  if v_generation.user_id is null then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_GENERATION_USER_REQUIRED';
  end if;

  select * into v_account
  from public.studio_credit_accounts
  where user_id = v_generation.user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'STUDIO_CREDIT_ACCOUNT_NOT_FOUND';
  end if;

  select * into v_reservation
  from public.studio_credit_transactions
  where generation_id = p_generation_id
    and transaction_type = 'reserve';

  if exists (
    select 1 from public.studio_credit_transactions
    where generation_id = p_generation_id
      and transaction_type = 'finalize'
  ) or v_generation.credit_status = 'finalized' then
    return jsonb_build_object(
      'status', 'finalized',
      'idempotent', true,
      'reconciled', false,
      'generation_id', p_generation_id,
      'credits', coalesce(v_reservation.credits, v_generation.credit_cost, 0),
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if exists (
    select 1 from public.studio_credit_transactions
    where generation_id = p_generation_id
      and transaction_type = 'release'
  ) or v_generation.credit_status = 'released' then
    return jsonb_build_object(
      'status', 'released',
      'idempotent', true,
      'reconciled', false,
      'generation_id', p_generation_id,
      'credits', coalesce(v_reservation.credits, v_generation.credit_cost, 0),
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if v_generation.credit_status <> 'reserved' then
    return jsonb_build_object(
      'status', v_generation.credit_status,
      'idempotent', true,
      'reconciled', false,
      'generation_id', p_generation_id,
      'credits', coalesce(v_reservation.credits, v_generation.credit_cost, 0),
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if v_reservation.id is null then
    raise exception using
      errcode = '23514',
      message = 'STUDIO_CREDITS_NOT_RESERVED';
  end if;

  if v_generation.status = 'completed' then
    v_result := public.finalize_studio_credits(p_generation_id);
    return v_result || jsonb_build_object('reconciled', true);
  end if;

  if v_generation.status = 'failed' then
    v_result := public.release_studio_credits(p_generation_id);
    return v_result || jsonb_build_object('reconciled', true);
  end if;

  return jsonb_build_object(
    'status', 'reserved',
    'idempotent', true,
    'reconciled', false,
    'generation_id', p_generation_id,
    'credits', v_reservation.credits,
    'available_credits', v_account.available_credits,
    'reserved_credits', v_account.reserved_credits,
    'generation_status', v_generation.status
  );
end;
$$;

create or replace function public.add_studio_credits(
  p_user_id uuid,
  p_credits bigint,
  p_idempotency_key text,
  p_description text default 'Studio credits added manually',
  p_transaction_type text default 'manual_add',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_account public.studio_credit_accounts%rowtype;
  v_existing public.studio_credit_transactions%rowtype;
  v_transaction_id uuid;
  v_key text := trim(coalesce(p_idempotency_key, ''));
  v_description text := trim(coalesce(p_description, ''));
begin
  perform public.require_studio_credit_service_role();

  if p_user_id is null or not exists (
    select 1 from auth.users where id = p_user_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'STUDIO_CREDIT_USER_NOT_FOUND';
  end if;

  if p_credits is null or p_credits <= 0 then
    raise exception using
      errcode = '22003',
      message = 'STUDIO_CREDIT_AMOUNT_MUST_BE_POSITIVE';
  end if;

  if p_transaction_type is null
     or p_transaction_type not in ('purchase', 'manual_add') then
    raise exception using
      errcode = '23514',
      message = 'INVALID_STUDIO_CREDIT_ADD_TYPE';
  end if;

  if v_key = '' or length(v_key) > 200 then
    raise exception using
      errcode = '22023',
      message = 'VALID_STUDIO_CREDIT_IDEMPOTENCY_KEY_REQUIRED';
  end if;

  if v_description = '' then
    raise exception using
      errcode = '22023',
      message = 'STUDIO_CREDIT_DESCRIPTION_REQUIRED';
  end if;

  insert into public.studio_credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_account
  from public.studio_credit_accounts
  where user_id = p_user_id
  for update;

  select * into v_existing
  from public.studio_credit_transactions
  where idempotency_key = v_key;

  if found then
    if v_existing.user_id <> p_user_id
       or v_existing.credits <> p_credits
       or v_existing.transaction_type <> p_transaction_type then
      raise exception using
        errcode = '23505',
        message = 'STUDIO_CREDIT_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'status', 'added',
      'idempotent', true,
      'transaction_id', v_existing.id,
      'credits', v_existing.credits,
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  update public.studio_credit_accounts
  set available_credits = available_credits + p_credits,
      lifetime_purchased = lifetime_purchased
        + case when p_transaction_type = 'purchase' then p_credits else 0 end
  where user_id = p_user_id
  returning * into v_account;

  insert into public.studio_credit_transactions (
    user_id,
    transaction_type,
    credits,
    available_delta,
    reserved_delta,
    available_credits_after,
    reserved_credits_after,
    idempotency_key,
    description,
    metadata
  ) values (
    p_user_id,
    p_transaction_type,
    p_credits,
    p_credits,
    0,
    v_account.available_credits,
    v_account.reserved_credits,
    v_key,
    v_description,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'status', 'added',
    'idempotent', false,
    'transaction_id', v_transaction_id,
    'credits', p_credits,
    'available_credits', v_account.available_credits,
    'reserved_credits', v_account.reserved_credits
  );
end;
$$;

alter table public.studio_credit_accounts enable row level security;
alter table public.studio_credit_transactions enable row level security;

drop policy if exists "Users can view their own Studio credit account"
  on public.studio_credit_accounts;
create policy "Users can view their own Studio credit account"
on public.studio_credit_accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own Studio credit transactions"
  on public.studio_credit_transactions;
create policy "Users can view their own Studio credit transactions"
on public.studio_credit_transactions
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.studio_credit_accounts from public, anon, authenticated;
revoke all on table public.studio_credit_transactions from public, anon, authenticated;
grant select on table public.studio_credit_accounts to authenticated;
grant select on table public.studio_credit_transactions to authenticated;
grant select on table public.studio_credit_accounts to service_role;
grant select on table public.studio_credit_transactions to service_role;

revoke all on function public.require_studio_credit_service_role()
  from public, anon, authenticated;
revoke all on function public.validate_new_studio_generation_credit_fields()
  from public, anon, authenticated;
revoke all on function public.set_studio_credit_account_updated_at()
  from public, anon, authenticated;
revoke all on function public.initialize_studio_credit_account()
  from public, anon, authenticated;
revoke all on function public.reserve_studio_credits(uuid)
  from public, anon, authenticated;
revoke all on function public.finalize_studio_credits(uuid)
  from public, anon, authenticated;
revoke all on function public.release_studio_credits(uuid)
  from public, anon, authenticated;
revoke all on function public.reconcile_studio_generation_credits(uuid)
  from public, anon, authenticated;
revoke all on function public.add_studio_credits(uuid, bigint, text, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.reserve_studio_credits(uuid)
  to service_role;
grant execute on function public.finalize_studio_credits(uuid)
  to service_role;
grant execute on function public.release_studio_credits(uuid)
  to service_role;
grant execute on function public.reconcile_studio_generation_credits(uuid)
  to service_role;
grant execute on function public.add_studio_credits(uuid, bigint, text, text, text, jsonb)
  to service_role;

comment on table public.studio_credit_accounts is
  'Prepaid Studio usage balances. This table is separate from the monetary earnings wallet.';
comment on table public.studio_credit_transactions is
  'Immutable-style audit ledger for Studio credit purchases, reservations, usage, and releases.';
comment on column public.studio_generations.credit_cost is
  'Trusted server-side Studio price: 3 credits for one-photo styles and 4 for two-photo styles.';
comment on function public.reserve_studio_credits(uuid) is
  'Service-role-only atomic Studio credit reservation with row locking and generation idempotency.';
comment on function public.finalize_studio_credits(uuid) is
  'Service-role-only finalization of one previously reserved Studio generation.';
comment on function public.release_studio_credits(uuid) is
  'Service-role-only idempotent return of credits for an incomplete Studio generation.';
comment on function public.reconcile_studio_generation_credits(uuid) is
  'Service-role-only idempotent reconciliation of reserved credits from a terminal Studio generation state.';
