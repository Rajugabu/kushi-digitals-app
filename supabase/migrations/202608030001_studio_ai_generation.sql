create table if not exists public.studio_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  style_id text not null,
  ratio text not null,
  generation_mode text not null check (
    generation_mode in (
      'single_portrait_style',
      'double_image_composition',
      'banner_or_template_style'
    )
  ),
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'completed', 'failed')
  ),
  source_photo_1_path text,
  source_photo_2_path text,
  output_path text,
  output_format text,
  output_width integer,
  output_height integer,
  provider text,
  provider_model text,
  provider_job_id text,
  provider_metadata jsonb not null default '{}'::jsonb,
  request_fingerprint text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_generations_user_created_idx
  on public.studio_generations (user_id, created_at desc);

create index if not exists studio_generations_fingerprint_created_idx
  on public.studio_generations (request_fingerprint, created_at desc);

create index if not exists studio_generations_status_idx
  on public.studio_generations (status, created_at desc);

create or replace function public.set_studio_generation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_studio_generations_updated_at
  on public.studio_generations;
create trigger set_studio_generations_updated_at
before update on public.studio_generations
for each row execute function public.set_studio_generation_updated_at();

alter table public.studio_generations enable row level security;

drop policy if exists "Users can view their studio generations"
  on public.studio_generations;
create policy "Users can view their studio generations"
on public.studio_generations
for select
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'studio-results',
  'studio-results',
  false,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own studio results"
  on storage.objects;
create policy "Users can read their own studio results"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'studio-results'
  and (storage.foldername(name))[1] = auth.uid()::text
);

comment on table public.studio_generations is
  'Tracks secure AI Studio generation jobs. Provider secrets and prompts remain inside Edge Functions.';
