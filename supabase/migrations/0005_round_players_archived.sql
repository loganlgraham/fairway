-- Fairway: allow mid-round lineup edits with archived players.

alter table public.round_players
  add column if not exists archived_at timestamptz;

alter table public.round_players
  drop constraint if exists round_players_round_id_profile_id_key;

alter table public.round_players
  drop constraint if exists round_players_round_id_position_key;

create unique index if not exists round_players_active_profile_uniq
  on public.round_players(round_id, profile_id)
  where archived_at is null;

create unique index if not exists round_players_active_position_uniq
  on public.round_players(round_id, position)
  where archived_at is null;

create index if not exists round_players_round_active_position_idx
  on public.round_players(round_id, position)
  where archived_at is null;

create or replace function public.update_round_lineup(
  p_round_id uuid,
  p_players jsonb
)
returns void
language plpgsql
as $$
declare
  v_owner_id uuid;
  v_status text;
  v_len int;
  v_position int;
  v_profile_id uuid;
  v_course_handicap int;
  v_round_player_id uuid;
  v_existing_id uuid;
begin
  if p_round_id is null then
    raise exception 'round_id is required';
  end if;
  if p_players is null or jsonb_typeof(p_players) <> 'array' then
    raise exception 'players must be a JSON array';
  end if;

  select r.owner_id, r.status
    into v_owner_id, v_status
  from public.rounds r
  where r.id = p_round_id;

  if v_owner_id is null then
    raise exception 'Round not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'Only the round owner can edit players';
  end if;
  if v_status <> 'in_progress' then
    raise exception 'Can only edit players on in-progress rounds';
  end if;

  v_len := jsonb_array_length(p_players);
  if v_len < 1 then
    raise exception 'Add at least one player';
  end if;
  if v_len > 12 then
    raise exception 'Max 12 players';
  end if;

  if exists (
    with player_rows as (
      select (value->>'profile_id')::uuid as profile_id
      from jsonb_array_elements(p_players)
    )
    select 1
    from player_rows
    where profile_id is null
    group by profile_id
  ) then
    raise exception 'Every player needs a profile_id';
  end if;

  if exists (
    with player_rows as (
      select (value->>'profile_id')::uuid as profile_id
      from jsonb_array_elements(p_players)
    )
    select 1
    from player_rows
    group by profile_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate players are not allowed';
  end if;

  -- Temporarily archive active rows, then restore/insert desired active lineup.
  update public.round_players
  set archived_at = now()
  where round_id = p_round_id
    and archived_at is null;

  for v_position, v_profile_id, v_course_handicap, v_round_player_id, v_existing_id in
    with ordered_players as (
      select
        ordinality::int as position,
        (value->>'profile_id')::uuid as profile_id,
        coalesce((value->>'course_handicap')::int, 0) as course_handicap,
        nullif(value->>'id', '')::uuid as round_player_id
      from jsonb_array_elements(p_players) with ordinality
    )
    select
      op.position,
      op.profile_id,
      op.course_handicap,
      op.round_player_id,
      (
        select rp.id
        from public.round_players rp
        where rp.round_id = p_round_id
          and rp.profile_id = op.profile_id
        order by rp.archived_at desc nulls first
        limit 1
      ) as existing_id
    from ordered_players op
    order by op.position
  loop
    if v_round_player_id is not null then
      update public.round_players rp
      set
        position = v_position,
        course_handicap = v_course_handicap,
        archived_at = null
      where rp.id = v_round_player_id
        and rp.round_id = p_round_id;

      if found then
        continue;
      end if;
    end if;

    if v_existing_id is not null then
      update public.round_players
      set
        position = v_position,
        course_handicap = v_course_handicap,
        archived_at = null
      where id = v_existing_id;
    else
      insert into public.round_players (
        round_id,
        profile_id,
        position,
        course_handicap,
        archived_at
      ) values (
        p_round_id,
        v_profile_id,
        v_position,
        v_course_handicap,
        null
      );
    end if;
  end loop;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'round_players'
  ) then
    execute 'alter publication supabase_realtime add table public.round_players';
  end if;
end;
$$;
