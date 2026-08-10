-- Kushi AI Studio: admin-managed reusable template publishing.
-- Additive only. Apply manually after the existing referral/admin migration.

create extension if not exists pgcrypto;

create table if not exists public.studio_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  type text not null default 'photo',
  is_premium boolean not null default false,
  status text not null default 'draft',
  canvas jsonb not null default '{"width":1080,"height":1350,"ratio":"4:5"}'::jsonb,
  background_path text,
  foreground_overlay_path text,
  photo_slot jsonb not null default '{}'::jsonb,
  name_slot jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint studio_templates_title_not_blank check (length(trim(title)) > 0),
  constraint studio_templates_category_not_blank check (length(trim(category)) > 0),
  constraint studio_templates_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and slug !~ '^[0-9]+$'
  ),
  constraint studio_templates_type_check check (type in ('photo', 'video')),
  constraint studio_templates_status_check check (status in ('draft', 'published')),
  constraint studio_templates_canvas_object_check check (jsonb_typeof(canvas) = 'object'),
  constraint studio_templates_photo_slot_object_check check (jsonb_typeof(photo_slot) = 'object'),
  constraint studio_templates_name_slot_object_check check (jsonb_typeof(name_slot) = 'object'),
  constraint studio_templates_publish_asset_check check (
    status <> 'published'
    or (background_path is not null and length(trim(background_path)) > 0)
  ),
  constraint studio_templates_publish_date_check check (
    status <> 'published' or published_at is not null
  )
);

create index if not exists studio_templates_published_feed_idx
  on public.studio_templates (status, sort_order asc, published_at desc);
create index if not exists studio_templates_category_published_idx
  on public.studio_templates (category, status, sort_order asc);
create index if not exists studio_templates_created_by_idx
  on public.studio_templates (created_by, updated_at desc);

create or replace function public.set_studio_template_timestamps()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();

  if new.status = 'published' then
    if tg_op = 'INSERT'
       or old.status is distinct from 'published'
       or new.published_at is null then
      new.published_at := now();
    end if;
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_studio_templates_timestamps
  on public.studio_templates;
create trigger set_studio_templates_timestamps
before insert or update on public.studio_templates
for each row execute function public.set_studio_template_timestamps();

alter table public.studio_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_templates'
      and policyname = 'Public can read published studio templates'
  ) then
    create policy "Public can read published studio templates"
      on public.studio_templates
      for select
      to anon, authenticated
      using (status = 'published' and published_at is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_templates'
      and policyname = 'Admins can read all studio templates'
  ) then
    create policy "Admins can read all studio templates"
      on public.studio_templates
      for select
      to authenticated
      using (public.is_referral_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_templates'
      and policyname = 'Admins can create studio templates'
  ) then
    create policy "Admins can create studio templates"
      on public.studio_templates
      for insert
      to authenticated
      with check (
        public.is_referral_admin()
        and created_by = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_templates'
      and policyname = 'Admins can update studio templates'
  ) then
    create policy "Admins can update studio templates"
      on public.studio_templates
      for update
      to authenticated
      using (public.is_referral_admin())
      with check (public.is_referral_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'studio_templates'
      and policyname = 'Admins can delete studio templates'
  ) then
    create policy "Admins can delete studio templates"
      on public.studio_templates
      for delete
      to authenticated
      using (public.is_referral_admin());
  end if;
end
$$;

revoke all on public.studio_templates from anon, authenticated;
grant select on public.studio_templates to anon, authenticated;
grant insert, update, delete on public.studio_templates to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'studio-template-assets',
  'studio-template-assets',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read studio template assets'
  ) then
    create policy "Public can read studio template assets"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'studio-template-assets');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can upload studio template assets'
  ) then
    create policy "Admins can upload studio template assets"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'studio-template-assets'
        and public.is_referral_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can update studio template assets'
  ) then
    create policy "Admins can update studio template assets"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'studio-template-assets'
        and public.is_referral_admin()
      )
      with check (
        bucket_id = 'studio-template-assets'
        and public.is_referral_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can delete studio template assets'
  ) then
    create policy "Admins can delete studio template assets"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'studio-template-assets'
        and public.is_referral_admin()
      );
  end if;
end
$$;

comment on table public.studio_templates is
  'Admin-authored reusable Studio templates. Published rows are public; drafts are admin-only.';
