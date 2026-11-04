-- DreamCanvas schema. Every private row and file belongs to one user, enforced by Row Level Security.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  theme_json jsonb,
  canvas_json jsonb not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  thumbnail_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index boards_user_updated on public.boards (user_id, updated_at desc);

create table public.board_assets (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('upload', 'demo', 'openverse', 'generated')),
  storage_path text,
  source_url text,
  license text,
  license_url text,
  attribution text,
  created_at timestamptz not null default now()
);
create index board_assets_board on public.board_assets (board_id);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references public.boards (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  status text not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_assets enable row level security;
alter table public.generations enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "own profile: insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));

create policy "own boards: read" on public.boards for select to authenticated using (user_id = (select auth.uid()));
create policy "own boards: insert" on public.boards for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own boards: update" on public.boards for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own boards: delete" on public.boards for delete to authenticated using (user_id = (select auth.uid()));

create policy "own assets: read" on public.board_assets for select to authenticated using (user_id = (select auth.uid()));
create policy "own assets: insert" on public.board_assets for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.boards b where b.id = board_id and b.user_id = (select auth.uid())));
create policy "own assets: delete" on public.board_assets for delete to authenticated using (user_id = (select auth.uid()));

create policy "own generations: read" on public.generations for select to authenticated using (user_id = (select auth.uid()));
create policy "own generations: insert" on public.generations for insert to authenticated with check (user_id = (select auth.uid()));

-- A profile row appears with each new account.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 80));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Private bucket: 10 MB per file, images only, first path segment must be the owner's id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-images', 'board-images', false, 10485760, array['image/webp', 'image/jpeg', 'image/png']);

create policy "own files: read" on storage.objects for select to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: update" on storage.objects for update to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
