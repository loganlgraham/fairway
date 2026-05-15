-- Fix signup trigger conflict handling.
-- The profiles table uses a partial unique index on user_id, so
-- "ON CONFLICT (user_id)" cannot always infer a matching constraint.
-- Use generic conflict handling instead.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, owner_id, display_name)
  values (
    new.id,
    null,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Player'
    )
  )
  on conflict do nothing;

  return new;
end;
$$;
