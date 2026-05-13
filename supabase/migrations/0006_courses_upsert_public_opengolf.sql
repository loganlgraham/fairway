-- Allow upsert updates for shared OpenGolf-backed courses.
-- Existing policy only allowed updates by created_by = auth.uid(), which blocks
-- upsert(on_conflict=opengolf_id) when the existing row is shared (created_by is null).

drop policy if exists "courses_update_creator" on public.courses;
create policy "courses_update_creator"
  on public.courses for update
  using (
    created_by = (select auth.uid())
    or (
      created_by is null
      and opengolf_id is not null
      and is_public = true
    )
  )
  with check (
    created_by = (select auth.uid())
    or (
      created_by is null
      and opengolf_id is not null
      and is_public = true
    )
  );
