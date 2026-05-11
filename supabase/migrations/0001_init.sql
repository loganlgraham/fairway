-- Fairway: core schema
-- profiles, courses, course_holes, rounds, round_players, scores

create extension if not exists "pgcrypto";

-- =========================================================
-- profiles
-- =========================================================
-- One "self" row per auth user (user_id NOT NULL, owner_id NULL),
-- plus N "friend" rows each user owns (user_id NULL, owner_id = creator).
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  owner_id        uuid references auth.users(id) on delete cascade,
  display_name    text not null,
  ghin_number     text,
  handicap_index  numeric(4,1),
  low_hi          numeric(4,1),
  home_club       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_self_or_friend check (
    (user_id is not null and owner_id is null) or
    (user_id is null and owner_id is not null)
  )
);

create unique index if not exists profiles_user_id_uniq
  on public.profiles(user_id)
  where user_id is not null;

create index if not exists profiles_owner_id_idx on public.profiles(owner_id);

-- =========================================================
-- courses + course_holes
-- =========================================================
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  opengolf_id  text unique,
  name         text not null,
  city         text,
  state        text,
  country      text,
  num_holes    int not null default 18 check (num_holes in (9, 18)),
  is_public    boolean not null default true,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists courses_name_idx on public.courses (lower(name));

create table if not exists public.course_holes (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  hole_number   int not null check (hole_number between 1 and 18),
  par           int not null check (par between 3 and 6),
  hcp_rating    int not null check (hcp_rating between 1 and 18),
  yards         int,
  unique (course_id, hole_number)
);

create index if not exists course_holes_course_id_idx
  on public.course_holes(course_id);

-- =========================================================
-- rounds
-- =========================================================
create table if not exists public.rounds (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete restrict,
  played_on    date not null default current_date,
  formats      text[] not null
    check (
      array_length(formats, 1) >= 1
      and formats <@ array['stroke','match','stableford','skins']::text[]
    ),
  status       text not null default 'in_progress'
    check (status in ('in_progress','completed')),
  created_at   timestamptz not null default now()
);

create index if not exists rounds_owner_id_idx on public.rounds(owner_id);

-- =========================================================
-- round_players
-- =========================================================
create table if not exists public.round_players (
  id               uuid primary key default gen_random_uuid(),
  round_id         uuid not null references public.rounds(id) on delete cascade,
  profile_id       uuid not null references public.profiles(id) on delete restrict,
  position         int not null check (position between 1 and 12),
  course_handicap  int not null,
  unique (round_id, profile_id),
  unique (round_id, position)
);

create index if not exists round_players_round_id_idx
  on public.round_players(round_id);

-- =========================================================
-- scores
-- =========================================================
create table if not exists public.scores (
  id               uuid primary key default gen_random_uuid(),
  round_id         uuid not null references public.rounds(id) on delete cascade,
  round_player_id  uuid not null references public.round_players(id) on delete cascade,
  hole_number      int not null check (hole_number between 1 and 18),
  strokes          int check (strokes is null or strokes between 1 and 20),
  updated_at       timestamptz not null default now(),
  unique (round_player_id, hole_number)
);

create index if not exists scores_round_id_idx on public.scores(round_id);
create index if not exists scores_round_player_id_idx on public.scores(round_player_id);

-- Keep updated_at fresh on profiles / scores
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists scores_set_updated_at on public.scores;
create trigger scores_set_updated_at
  before update on public.scores
  for each row execute function public.set_updated_at();
