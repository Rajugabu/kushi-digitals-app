-- Kushi Digitals: production blog management system
-- Safe to run manually after 202607210001_three_level_referral_system.sql.
-- This migration is additive and does not delete or rewrite existing business data.

create extension if not exists pgcrypto;

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_name_not_blank check (length(trim(name)) > 0),
  constraint blog_categories_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and slug !~ '^[0-9]+$'
  )
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
  cover_image_path text,
  category_id uuid references public.blog_categories(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_title text,
  seo_description text,
  canonical_url text,
  reading_time_minutes integer,
  view_count bigint not null default 0,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_title_not_blank check (length(trim(title)) > 0),
  constraint blog_posts_content_not_blank check (length(trim(content)) > 0),
  constraint blog_posts_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and slug !~ '^[0-9]+$'
  ),
  constraint blog_posts_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint blog_posts_reading_time_check check (
    reading_time_minutes is null or reading_time_minutes > 0
  ),
  constraint blog_posts_view_count_check check (view_count >= 0),
  constraint blog_posts_published_cover_check check (
    status <> 'published'
    or (
      cover_image_url is not null
      and length(trim(cover_image_url)) > 0
    )
  ),
  constraint blog_posts_publish_date_check check (
    status <> 'published' or published_at is not null
  )
);

create index if not exists blog_posts_slug_idx
  on public.blog_posts (slug);
create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_category_published_idx
  on public.blog_posts (category_id, published_at desc);
create index if not exists blog_posts_featured_published_idx
  on public.blog_posts (is_featured, published_at desc);
create index if not exists blog_posts_updated_idx
  on public.blog_posts (updated_at desc);
create index if not exists blog_categories_slug_idx
  on public.blog_categories (slug);

create or replace function public.set_blog_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
before update of
  title,
  slug,
  excerpt,
  content,
  cover_image_url,
  cover_image_path,
  category_id,
  status,
  is_featured,
  published_at,
  scheduled_at,
  seo_title,
  seo_description,
  canonical_url,
  reading_time_minutes,
  tags
on public.blog_posts
for each row execute function public.set_blog_updated_at();

drop trigger if exists set_blog_categories_updated_at on public.blog_categories;
create trigger set_blog_categories_updated_at
before update on public.blog_categories
for each row execute function public.set_blog_updated_at();

create or replace function public.increment_blog_post_view(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_view_count bigint;
begin
  if p_slug is null
     or length(p_slug) > 120
     or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or p_slug ~ '^[0-9]+$' then
    return 0;
  end if;

  update public.blog_posts
  set view_count = view_count + 1
  where slug = p_slug
    and status = 'published'
    and published_at is not null
    and published_at <= now()
  returning view_count into v_view_count;

  return coalesce(v_view_count, 0);
end;
$$;

alter table public.blog_categories enable row level security;
alter table public.blog_posts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_categories'
      and policyname = 'Public can read blog categories'
  ) then
    create policy "Public can read blog categories"
      on public.blog_categories
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_categories'
      and policyname = 'Admins manage blog categories'
  ) then
    create policy "Admins manage blog categories"
      on public.blog_categories
      for all
      to authenticated
      using (public.is_referral_admin())
      with check (public.is_referral_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_posts'
      and policyname = 'Public can read published blog posts'
  ) then
    create policy "Public can read published blog posts"
      on public.blog_posts
      for select
      to anon, authenticated
      using (
        status = 'published'
        and published_at is not null
        and published_at <= now()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_posts'
      and policyname = 'Admins can read all blog posts'
  ) then
    create policy "Admins can read all blog posts"
      on public.blog_posts
      for select
      to authenticated
      using (public.is_referral_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_posts'
      and policyname = 'Admins can create blog posts'
  ) then
    create policy "Admins can create blog posts"
      on public.blog_posts
      for insert
      to authenticated
      with check (
        public.is_referral_admin()
        and author_id = auth.uid()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_posts'
      and policyname = 'Admins can update blog posts'
  ) then
    create policy "Admins can update blog posts"
      on public.blog_posts
      for update
      to authenticated
      using (public.is_referral_admin())
      with check (public.is_referral_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'blog_posts'
      and policyname = 'Admins can delete blog posts'
  ) then
    create policy "Admins can delete blog posts"
      on public.blog_posts
      for delete
      to authenticated
      using (public.is_referral_admin());
  end if;
end
$$;

revoke all on public.blog_categories, public.blog_posts
  from anon, authenticated;
grant select on public.blog_categories, public.blog_posts
  to anon, authenticated;
grant insert, update, delete on public.blog_categories, public.blog_posts
  to authenticated;

revoke all on function public.increment_blog_post_view(text)
  from public, anon, authenticated;
grant execute on function public.increment_blog_post_view(text)
  to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read blog images'
  ) then
    create policy "Public can read blog images"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'blog-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can upload blog images'
  ) then
    create policy "Admins can upload blog images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'blog-images'
        and public.is_referral_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can update blog images'
  ) then
    create policy "Admins can update blog images"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'blog-images'
        and public.is_referral_admin()
      )
      with check (
        bucket_id = 'blog-images'
        and public.is_referral_admin()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can delete blog images'
  ) then
    create policy "Admins can delete blog images"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'blog-images'
        and public.is_referral_admin()
      );
  end if;
end
$$;

insert into public.blog_categories (name, slug, description)
values
  (
    'Passport Photos',
    'passport-photos',
    'Guides and updates for professional passport and stamp-size photos.'
  ),
  (
    'Photo Restoration',
    'photo-restoration',
    'Advice and stories about restoring old, faded and damaged photographs.'
  ),
  (
    'Photo Frames',
    'photo-frames',
    'Frame sizing, materials, styling and display guidance.'
  ),
  (
    'Album Designing',
    'album-designing',
    'Wedding and event album planning, layouts and design tips.'
  ),
  (
    'Photography Tips',
    'photography-tips',
    'Practical photography, posing, lighting and event preparation advice.'
  ),
  (
    'Digital Services',
    'digital-services',
    'Helpful information about editing, digital delivery and online services.'
  ),
  (
    'Kushi Digitals Updates',
    'kushi-digitals-updates',
    'Studio news, service announcements and customer updates.'
  )
on conflict do nothing;

comment on table public.blog_posts is
  'Kushi Digitals blog articles. Public RLS exposes only published, non-future posts.';
comment on table public.blog_categories is
  'Admin-managed categories used to organize Kushi Digitals blog posts.';
comment on function public.increment_blog_post_view(text) is
  'Safely increments view_count for a currently public post without granting public row updates.';
