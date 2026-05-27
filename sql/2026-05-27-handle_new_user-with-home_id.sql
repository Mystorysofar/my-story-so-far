-- Session 5 sitting 4: extend handle_new_user to read home_id from raw_user_meta_data
-- Backfilled joe's home_id manually after the function was updated
-- Run this if rebuilding the database from scratch

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, name, role, email, home_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    new.email,
    nullif(new.raw_user_meta_data->>'home_id', '')::uuid
  );
  return new;
end;
$function$;
