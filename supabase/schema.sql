-- ==============================================================================
-- BEATS & PIECES - SUPABASE DATABASE SCHEMA & STORAGE SETUP
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- Drop old tables if they exist with conflicting schemas to ensure clean creation
drop table if exists public.ratings cascade;
drop table if exists public.submissions cascade;
drop table if exists public.beats cascade;
drop table if exists public.releases cascade;
drop table if exists public.battles cascade;
drop table if exists public.producers cascade;

-- 1. PRODUCERS (USER PROFILES)
create table public.producers (
  id text primary key,
  nickname text not null,
  email text unique not null,
  avatar_url text default '/avatars/default-avatar.png',
  bio text default '',
  location text default '',
  role text default 'producer', -- 'admin', 'host', 'judge', 'producer', 'user'
  discord_id text,
  discord_username text,
  discord_roles jsonb default '[]'::jsonb,
  links jsonb default '{}'::jsonb,
  stats jsonb default '{"battlesEntered": 0, "battlesWon": 0, "totalFlames": 0}'::jsonb,
  is_claimed boolean default false,
  claimed_at timestamptz,
  created_at timestamptz default now()
);

-- 2. BATTLES (COMPETITIONS)
create table public.battles (
  id text primary key, -- e.g. 'battle-8', 'battle-9'
  number integer not null,
  title text not null,
  slug text,
  cover_image text default '/covers/beat-battle-8.png',
  hosts text[] default array[]::text[],
  host_details jsonb default '[]'::jsonb,
  judges text[] default array[]::text[],
  judge_details jsonb default '[]'::jsonb,
  description text default '',
  prizes jsonb default '{"first": "", "second": "", "third": ""}'::jsonb,
  samples jsonb default '[]'::jsonb,
  phase text default 'submission', -- 'submission', 'rating', 'judging', 'completed'
  submission_starts_at timestamptz,
  submission_ends_at timestamptz,
  rating_ends_at timestamptz,
  judging_ends_at timestamptz,
  ended_at text,
  total_submissions integer default 0,
  min_votes_required integer default 5,
  top_finalists_cutoff integer default 10,
  youtube_vod_url text,
  rules text[] default array[]::text[],
  winner text,
  created_at timestamptz default now()
);

-- 3. SUBMISSIONS (BATTLE TRACKS)
create table public.submissions (
  id text primary key, -- e.g. 'sub-uuid'
  battle_id text references public.battles(id) on delete cascade not null,
  user_id text references public.producers(id) on delete cascade not null,
  beatmaker_tag text not null,
  beat_title text not null,
  audio_url text not null,
  waveform jsonb default '[]'::jsonb,
  duration numeric default 120,
  bpm numeric,
  flame_rating numeric default 0,
  total_votes integer default 0,
  jury_score numeric,
  jury_feedback text,
  judge_name text,
  jury_feedbacks jsonb default '[]'::jsonb,
  rank integer,
  submitted_at timestamptz default now()
);

-- 4. RATINGS (COMMUNITY VOTES)
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  battle_id text references public.battles(id) on delete cascade not null,
  submission_id text references public.submissions(id) on delete cascade not null,
  voter_id text references public.producers(id) on delete cascade not null,
  score numeric not null,
  created_at timestamptz default now(),
  constraint unique_submission_voter unique (submission_id, voter_id)
);

-- 5. BEATS (DISCOVERY SHOWCASE LIBRARY)
create table public.beats (
  id text primary key,
  title text not null,
  producer_id text references public.producers(id) on delete cascade not null,
  audio_url text not null,
  duration numeric default 120,
  waveform jsonb default '[]'::jsonb,
  bpm numeric,
  price_tag text default 'Not For Sale',
  genres text[] default array[]::text[],
  tags text[] default array[]::text[],
  flames numeric default 0,
  battle_source text,
  tier integer default 4,
  rank integer,
  created_at timestamptz default now()
);

-- 6. RELEASES (COMPILATIONS & TAPES)
create table public.releases (
  id text primary key,
  title text not null,
  slug text,
  cover_image text default '/covers/beat-battle-8.png',
  release_date timestamptz,
  description text default '',
  spotify_url text,
  apple_music_url text,
  youtube_url text,
  bandcamp_url text,
  soundcloud_url text,
  streaming_links jsonb default '{}'::jsonb,
  tracklist jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ==============================================================================
-- 7. STORAGE BUCKETS (AUDIO & COVERS)
-- ==============================================================================
insert into storage.buckets (id, name, public) 
values 
  ('audio', 'audio', true),
  ('covers', 'covers', true)
on conflict (id) do update set public = true;

-- Storage policies: Clean existing policies if any
drop policy if exists "Public Access Audio" on storage.objects;
drop policy if exists "Public Access Covers" on storage.objects;
drop policy if exists "Allow Upload Audio" on storage.objects;
drop policy if exists "Allow Upload Covers" on storage.objects;
drop policy if exists "Allow Update Covers" on storage.objects;

-- Storage policies: Public read access
create policy "Public Access Audio" 
  on storage.objects for select 
  using (bucket_id = 'audio');

create policy "Public Access Covers" 
  on storage.objects for select 
  using (bucket_id = 'covers');

-- Storage policies: Upload access
create policy "Allow Upload Audio" 
  on storage.objects for insert 
  with check (bucket_id = 'audio');

create policy "Allow Upload Covers" 
  on storage.objects for insert 
  with check (bucket_id = 'covers');

create policy "Allow Update Covers" 
  on storage.objects for update 
  using (bucket_id = 'covers');

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.producers enable row level security;
alter table public.battles enable row level security;
alter table public.submissions enable row level security;
alter table public.ratings enable row level security;
alter table public.beats enable row level security;
alter table public.releases enable row level security;

-- Public Read for all data
create policy "Allow public read producers" on public.producers for select using (true);
create policy "Allow public read battles" on public.battles for select using (true);
create policy "Allow public read submissions" on public.submissions for select using (true);
create policy "Allow public read ratings" on public.ratings for select using (true);
create policy "Allow public read beats" on public.beats for select using (true);
create policy "Allow public read releases" on public.releases for select using (true);

-- Write policies: Only authenticated users can modify their own data
create policy "Authenticated insert producers" on public.producers for insert with check (auth.uid()::text = id);
create policy "Authenticated update producers" on public.producers for update using (auth.uid()::text = id);

create policy "Admin modify battles" on public.battles for all using (
  exists (select 1 from public.producers where id = auth.uid()::text and role = 'admin')
) with check (
  exists (select 1 from public.producers where id = auth.uid()::text and role = 'admin')
);

create policy "Authenticated insert submissions" on public.submissions for insert with check (auth.uid()::text = user_id);
create policy "Authenticated update submissions" on public.submissions for update using (auth.uid()::text = user_id);
create policy "Authenticated delete submissions" on public.submissions for delete using (auth.uid()::text = user_id);

create policy "Authenticated insert ratings" on public.ratings for insert with check (auth.uid()::text = voter_id);
create policy "Authenticated update ratings" on public.ratings for update using (auth.uid()::text = voter_id);

create policy "Admin modify beats" on public.beats for all using (
  exists (select 1 from public.producers where id = auth.uid()::text and role in ('admin', 'host'))
) with check (
  exists (select 1 from public.producers where id = auth.uid()::text and role in ('admin', 'host'))
);

create policy "Admin modify releases" on public.releases for all using (
  exists (select 1 from public.producers where id = auth.uid()::text and role = 'admin')
) with check (
  exists (select 1 from public.producers where id = auth.uid()::text and role = 'admin')
);

-- Indexes for lightning fast queries
create index if not exists idx_submissions_battle on public.submissions(battle_id);
create index if not exists idx_submissions_user on public.submissions(user_id);
create index if not exists idx_ratings_submission on public.ratings(submission_id);
create index if not exists idx_ratings_battle on public.ratings(battle_id);
create index if not exists idx_beats_producer on public.beats(producer_id);
