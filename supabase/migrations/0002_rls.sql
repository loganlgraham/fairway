-- Fairway: RLS policies

alter table public.profiles      enable row level security;
alter table public.courses       enable row level security;
alter table public.course_holes  enable row level security;
alter table public.rounds        enable row level security;
alter table public.round_players enable row level security;
alter table public.scores        enable row level security;

-- =========================================================
-- profiles: user can read/write their own self row and the
-- friend rows they own (owner_id = auth.uid()).
-- =========================================================
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (
    user_id = (select auth.uid())
    or owner_id = (select auth.uid())
  );

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (
    -- self profile: created by the trigger normally, but allow the user to upsert their own
    (user_id = (select auth.uid()) and owner_id is null)
    -- friend profile: owner is the caller, no user_id
    or (owner_id = (select auth.uid()) and user_id is null)
  );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (
    user_id = (select auth.uid())
    or owner_id = (select auth.uid())
  )
  with check (
    user_id = (select auth.uid())
    or owner_id = (select auth.uid())
  );

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (
    -- only friend rows are deletable; self rows are tied to auth.users lifecycle
    owner_id = (select auth.uid()) and user_id is null
  );

-- =========================================================
-- courses + course_holes
-- =========================================================
drop policy if exists "courses_select_public_or_own" on public.courses;
create policy "courses_select_public_or_own"
  on public.courses for select
  using (is_public or created_by = (select auth.uid()));

drop policy if exists "courses_insert_self" on public.courses;
create policy "courses_insert_self"
  on public.courses for insert
  with check (created_by is null or created_by = (select auth.uid()));

drop policy if exists "courses_update_creator" on public.courses;
create policy "courses_update_creator"
  on public.courses for update
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "course_holes_select_via_course" on public.course_holes;
create policy "course_holes_select_via_course"
  on public.course_holes for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_holes.course_id
        and (c.is_public or c.created_by = (select auth.uid()))
    )
  );

drop policy if exists "course_holes_modify_via_course" on public.course_holes;
create policy "course_holes_modify_via_course"
  on public.course_holes for all
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_holes.course_id
        and (c.created_by = (select auth.uid()) or c.created_by is null)
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_holes.course_id
        and (c.created_by = (select auth.uid()) or c.created_by is null)
    )
  );

-- =========================================================
-- rounds, round_players, scores
-- Scorekeeper mode: only the round owner can write.
-- =========================================================
drop policy if exists "rounds_select_own" on public.rounds;
create policy "rounds_select_own"
  on public.rounds for select
  using (owner_id = (select auth.uid()));

drop policy if exists "rounds_modify_own" on public.rounds;
create policy "rounds_modify_own"
  on public.rounds for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "round_players_select_via_round" on public.round_players;
create policy "round_players_select_via_round"
  on public.round_players for select
  using (
    exists (
      select 1 from public.rounds r
      where r.id = round_players.round_id
        and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "round_players_modify_via_round" on public.round_players;
create policy "round_players_modify_via_round"
  on public.round_players for all
  using (
    exists (
      select 1 from public.rounds r
      where r.id = round_players.round_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rounds r
      where r.id = round_players.round_id
        and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "scores_select_via_round" on public.scores;
create policy "scores_select_via_round"
  on public.scores for select
  using (
    exists (
      select 1 from public.rounds r
      where r.id = scores.round_id
        and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "scores_modify_via_round" on public.scores;
create policy "scores_modify_via_round"
  on public.scores for all
  using (
    exists (
      select 1 from public.rounds r
      where r.id = scores.round_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.rounds r
      where r.id = scores.round_id
        and r.owner_id = (select auth.uid())
    )
  );
