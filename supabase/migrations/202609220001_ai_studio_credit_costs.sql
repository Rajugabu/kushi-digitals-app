alter table public.studio_generations
  drop constraint if exists studio_generations_credit_cost_check;

alter table public.studio_generations
  add constraint studio_generations_credit_cost_check
  check (
    credit_cost is null
    or credit_cost in (3, 4, 5, 6)
  );

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

  if new.credit_cost is null or new.credit_cost not in (3, 4, 5, 6) then
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
    raise exception using errcode = '22004', message = 'STUDIO_GENERATION_ID_REQUIRED';
  end if;

  select * into v_generation
  from public.studio_generations
  where id = p_generation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'STUDIO_GENERATION_NOT_FOUND';
  end if;

  if v_generation.user_id is null then
    raise exception using errcode = '23514', message = 'STUDIO_GENERATION_USER_REQUIRED';
  end if;

  if v_generation.credit_cost is null
     or v_generation.credit_cost not in (3, 4, 5, 6) then
    raise exception using errcode = '23514', message = 'INVALID_STUDIO_CREDIT_COST';
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
      raise exception using errcode = '23505', message = 'STUDIO_CREDIT_IDEMPOTENCY_CONFLICT';
    end if;

    if exists (
      select 1 from public.studio_credit_transactions
      where generation_id = p_generation_id and transaction_type = 'finalize'
    ) then
      return jsonb_build_object(
        'status', 'finalized', 'idempotent', true,
        'generation_id', p_generation_id, 'credits', v_existing.credits,
        'available_credits', v_account.available_credits,
        'reserved_credits', v_account.reserved_credits
      );
    end if;

    if exists (
      select 1 from public.studio_credit_transactions
      where generation_id = p_generation_id and transaction_type = 'release'
    ) then
      return jsonb_build_object(
        'status', 'released', 'idempotent', true,
        'generation_id', p_generation_id, 'credits', v_existing.credits,
        'available_credits', v_account.available_credits,
        'reserved_credits', v_account.reserved_credits
      );
    end if;

    return jsonb_build_object(
      'status', 'reserved', 'idempotent', true,
      'generation_id', p_generation_id, 'credits', v_existing.credits,
      'available_credits', v_account.available_credits,
      'reserved_credits', v_account.reserved_credits
    );
  end if;

  if v_generation.status not in ('pending', 'processing') then
    raise exception using errcode = '23514', message = 'STUDIO_GENERATION_NOT_RESERVABLE';
  end if;

  if v_generation.credit_status in ('finalized', 'released') then
    raise exception using errcode = '23514', message = 'STUDIO_GENERATION_CREDIT_STATE_INVALID';
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
    user_id, generation_id, transaction_type, credits, available_delta,
    reserved_delta, available_credits_after, reserved_credits_after,
    idempotency_key, description, metadata
  ) values (
    v_generation.user_id, p_generation_id, 'reserve', v_generation.credit_cost,
    -v_generation.credit_cost, v_generation.credit_cost,
    v_account.available_credits, v_account.reserved_credits,
    'studio:reserve:' || p_generation_id::text,
    'Credits reserved for Studio generation',
    jsonb_build_object('style_id', v_generation.style_id, 'ratio', v_generation.ratio)
  );

  update public.studio_generations
  set credit_status = 'reserved'
  where id = p_generation_id;

  return jsonb_build_object(
    'status', 'reserved', 'idempotent', false,
    'generation_id', p_generation_id, 'credits', v_generation.credit_cost,
    'available_credits', v_account.available_credits,
    'reserved_credits', v_account.reserved_credits
  );
end;
$$;
