-- 1. Create the Function
-- This function runs automatically whenever a new user signs up.
-- It grabs the data from the 'metadata' sent by the frontend and creates a profile.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    user_name,
    coop_name,
    building_address,
    unit_number,
    is_verified,
    avatar_url
  )
  values (
    new.id,
    -- We extract these values from the metadata sent by Supabase Auth
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'coop_name',
    new.raw_user_meta_data->>'building_address',
    new.raw_user_meta_data->>'unit_number',
    false, -- Default to unverified
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the Trigger
-- This tells Postgres: "After a row is inserted into auth.users, run the function above."
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();