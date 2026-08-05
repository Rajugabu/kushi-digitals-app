-- Transactional behavior checks. All test writes are rolled back.
-- The migrated target must contain at least one auth.users row.
-- Run with:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_credit_behavior_checks.sql

begin;

set local request.jwt.claims = '{"role":"service_role"}';

do $$
declare
  v_user_id uuid;
  v_generation_one uuid;
  v_generation_two uuid;
  v_key text := 'studio-credit-test:' || gen_random_uuid()::text;
  v_before public.studio_credit_accounts%rowtype;
  v_after public.studio_credit_accounts%rowtype;
  v_result jsonb;
begin
  if has_function_privilege(
    'authenticated',
    'public.reconcile_studio_generation_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute reconciliation';
  end if;

  if has_function_privilege(
    'anon',
    'public.reconcile_studio_generation_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute reconciliation';
  end if;

  select id into v_user_id
  from auth.users
  order by created_at
  limit 1;

  if v_user_id is null then
    raise exception 'Behavior checks require at least one auth.users row';
  end if;

  insert into public.studio_credit_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select * into v_before
  from public.studio_credit_accounts
  where user_id = v_user_id;

  perform public.add_studio_credits(
    v_user_id,
    10,
    v_key,
    'Rolled-back Studio credit behavior test',
    'purchase',
    '{"test":true}'::jsonb
  );
  perform public.add_studio_credits(
    v_user_id,
    10,
    v_key,
    'Rolled-back Studio credit behavior test retry',
    'purchase',
    '{"test":true}'::jsonb
  );

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 10
     or v_after.lifetime_purchased <> v_before.lifetime_purchased + 10 then
    raise exception 'Idempotent purchase add produced an invalid balance';
  end if;

  insert into public.studio_generations (
    user_id,
    style_id,
    ratio,
    generation_mode,
    status,
    credit_cost,
    credit_status
  ) values (
    v_user_id,
    'studio-credit-test-one',
    '2:3',
    'single_portrait_style',
    'processing',
    3,
    'unreserved'
  ) returning id into v_generation_one;

  perform public.reserve_studio_credits(v_generation_one);
  perform public.reserve_studio_credits(v_generation_one);

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 7
     or v_after.reserved_credits <> v_before.reserved_credits + 3 then
    raise exception 'Repeated reservation deducted credits more than once';
  end if;

  update public.studio_generations
  set status = 'completed'
  where id = v_generation_one;

  v_result := public.reconcile_studio_generation_credits(v_generation_one);
  if v_result ->> 'status' <> 'finalized'
     or (v_result ->> 'reconciled')::boolean is not true then
    raise exception 'Completed generation reconciliation did not finalize';
  end if;

  v_result := public.reconcile_studio_generation_credits(v_generation_one);
  if v_result ->> 'status' <> 'finalized'
     or (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'Repeated completed reconciliation was not idempotent';
  end if;

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 7
     or v_after.reserved_credits <> v_before.reserved_credits
     or v_after.lifetime_used <> v_before.lifetime_used + 3 then
    raise exception 'Repeated finalization produced an invalid balance';
  end if;

  v_result := public.release_studio_credits(v_generation_one);
  if v_result ->> 'status' <> 'finalized' then
    raise exception 'Release after finalization must not refund credits';
  end if;

  insert into public.studio_generations (
    user_id,
    style_id,
    ratio,
    generation_mode,
    status,
    credit_cost,
    credit_status
  ) values (
    v_user_id,
    'studio-credit-test-two',
    '3:2',
    'double_image_composition',
    'processing',
    4,
    'unreserved'
  ) returning id into v_generation_two;

  perform public.reserve_studio_credits(v_generation_two);

  update public.studio_generations
  set status = 'failed'
  where id = v_generation_two;

  v_result := public.reconcile_studio_generation_credits(v_generation_two);
  if v_result ->> 'status' <> 'released'
     or (v_result ->> 'reconciled')::boolean is not true then
    raise exception 'Failed generation reconciliation did not release credits';
  end if;

  v_result := public.reconcile_studio_generation_credits(v_generation_two);
  if v_result ->> 'status' <> 'released'
     or (v_result ->> 'idempotent')::boolean is not true then
    raise exception 'Repeated failed reconciliation was not idempotent';
  end if;

  select * into v_after
  from public.studio_credit_accounts
  where user_id = v_user_id;

  if v_after.available_credits <> v_before.available_credits + 7
     or v_after.reserved_credits <> v_before.reserved_credits
     or v_after.lifetime_used <> v_before.lifetime_used + 3 then
    raise exception 'Repeated release produced an invalid balance';
  end if;

  if (
    select count(*)
    from public.studio_credit_transactions
    where generation_id = v_generation_one
      and transaction_type = 'reserve'
  ) <> 1 then
    raise exception 'Generation has more than one reserve event';
  end if;

  if (
    select count(*)
    from public.studio_credit_transactions
    where generation_id = v_generation_one
      and transaction_type = 'finalize'
  ) <> 1 then
    raise exception 'Generation has more than one finalize event';
  end if;

  if (
    select count(*)
    from public.studio_credit_transactions
    where generation_id = v_generation_two
      and transaction_type = 'release'
  ) <> 1 then
    raise exception 'Generation has more than one release event';
  end if;
end $$;

rollback;

select 'Studio credit idempotency behavior checks passed.' as result;
