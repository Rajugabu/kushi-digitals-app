-- Run only against a migrated local or explicitly authorised staging database:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_payment_security_checks.sql

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'studio_credit_packs',
    'studio_credit_purchases',
    'studio_payment_webhook_events'
  ] loop
    if to_regclass('public.' || v_table) is null then
      raise exception '% is missing', v_table;
    end if;

    if not (
      select relrowsecurity
      from pg_class
      where oid = ('public.' || v_table)::regclass
    ) then
      raise exception 'RLS is not enabled on %', v_table;
    end if;
  end loop;

  if not has_table_privilege(
    'authenticated',
    'public.studio_credit_packs',
    'SELECT'
  ) then
    raise exception 'authenticated cannot read active Studio credit packs';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.studio_credit_packs',
    'INSERT, UPDATE, DELETE'
  ) then
    raise exception 'authenticated can mutate Studio credit packs';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.studio_credit_purchases',
    'SELECT'
  ) then
    raise exception 'authenticated cannot read owned Studio purchases';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.studio_credit_purchases',
    'INSERT, UPDATE, DELETE'
  ) then
    raise exception 'authenticated can mutate Studio purchases';
  end if;

  if has_table_privilege(
    'anon',
    'public.studio_credit_purchases',
    'SELECT, INSERT, UPDATE, DELETE'
  ) then
    raise exception 'anon has access to Studio purchases';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.studio_payment_webhook_events',
    'SELECT, INSERT, UPDATE, DELETE'
  ) or has_table_privilege(
    'anon',
    'public.studio_payment_webhook_events',
    'SELECT, INSERT, UPDATE, DELETE'
  ) then
    raise exception 'client roles can access Studio webhook events';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.fulfill_studio_credit_purchase(uuid,uuid,text,text,bigint,text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.fulfill_studio_credit_purchase(uuid,uuid,text,text,bigint,text,text)',
    'EXECUTE'
  ) then
    raise exception 'client roles can fulfil Studio purchases';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.fulfill_studio_credit_purchase(uuid,uuid,text,text,bigint,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot fulfil Studio purchases';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.process_studio_razorpay_webhook(text,text,text,text,bigint,text,text,text,text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.process_studio_razorpay_webhook(text,text,text,text,bigint,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'client roles can process Studio Razorpay webhooks';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.process_studio_razorpay_webhook(text,text,text,text,bigint,text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot process Studio Razorpay webhooks';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_credit_packs'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
      and qual like '%active%'
  ) then
    raise exception 'active-pack authenticated SELECT policy is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_credit_purchases'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
      and qual like '%auth.uid()%user_id%'
  ) then
    raise exception 'owned-purchase authenticated SELECT policy is missing';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'studio_credit_purchases'
      and indexname = 'studio_credit_purchases_order_id_unique'
  ) or not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'studio_credit_purchases'
      and indexname = 'studio_credit_purchases_payment_id_unique'
  ) then
    raise exception 'Razorpay purchase uniqueness indexes are missing';
  end if;
end $$;

select 'Studio payment schema, RLS, and privilege checks passed.' as result;
