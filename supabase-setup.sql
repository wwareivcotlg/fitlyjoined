-- ============================================================
-- Fitly Joined 3D — Supabase leaderboard setup
-- Safe to re-run: keeps your existing nut_sort_scores table and
-- data, and only adds anything that's missing.
-- Run in: Supabase dashboard → SQL Editor
-- ============================================================

create table if not exists nut_sort_scores (
  id bigserial primary key,
  player_name text not null unique,
  levels_completed integer not null default 0,
  total_score integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Guards in case the original table predates any of these columns
alter table nut_sort_scores add column if not exists levels_completed integer not null default 0;
alter table nut_sort_scores add column if not exists total_score integer not null default 0;
alter table nut_sort_scores add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at fresh on upsert
create or replace function touch_nut_sort_scores()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_nut_sort_scores on nut_sort_scores;
create trigger trg_touch_nut_sort_scores
before update on nut_sort_scores
for each row execute function touch_nut_sort_scores();

-- Anonymous read/write via the anon key (client-side game pattern)
alter table nut_sort_scores enable row level security;

drop policy if exists "anon read"   on nut_sort_scores;
drop policy if exists "anon insert" on nut_sort_scores;
drop policy if exists "anon update" on nut_sort_scores;

create policy "anon read"   on nut_sort_scores for select using (true);
create policy "anon insert" on nut_sort_scores for insert with check (true);
create policy "anon update" on nut_sort_scores for update using (true);
