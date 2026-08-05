-- Run against a migrated local or staging database with:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/studio_credit_security_checks.sql

do $$
begin
  if to_regclass('public.studio_credit_accounts') is null then
    raise exception 'studio_credit_accounts is missing';
  end if;

  if to_regclass('public.studio_credit_transactions') is null then
    raise exception 'studio_credit_transactions is missing';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.studio_credit_accounts'::regclass
  ) then
    raise exception 'RLS is not enabled on studio_credit_accounts';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.studio_credit_transactions'::regclass
  ) then
    raise exception 'RLS is not enabled on studio_credit_transactions';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.reserve_studio_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute reserve_studio_credits';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.finalize_studio_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute finalize_studio_credits';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.release_studio_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute release_studio_credits';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.reserve_studio_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute reserve_studio_credits';
  end if;

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

  if not has_function_privilege(
    'service_role',
    'public.reconcile_studio_generation_credits(uuid)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute reconciliation';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.studio_credit_accounts',
    'SELECT'
  ) then
    raise exception 'service_role cannot select Studio credit accounts';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.studio_credit_transactions',
    'SELECT'
  ) then
    raise exception 'service_role cannot select Studio credit transactions';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'studio_credit_transactions'
      and indexname = 'studio_credit_transactions_generation_event_idx'
  ) then
    raise exception 'generation event idempotency index is missing';
  end if;
end $$;

select 'Studio credit schema and privilege checks passed.' as result;
