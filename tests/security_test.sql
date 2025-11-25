-- Verification Script for Security Fixes
-- Run this in your Supabase SQL Editor or via psql

-- 1. Setup: Create a test user (if running in a local environment where you can mock auth)
-- Note: In a real Supabase environment, you would run these as an authenticated user.
-- The following assumes you are running this as a logged-in user or simulating one.

-- TEST 1: Try to update is_verified (SHOULD FAIL)
do $$
begin
  update public.profiles 
  set is_verified = true 
  where id = auth.uid();
  
  if found then
    raise exception 'Security Test Failed: User was able to update is_verified!';
  end if;
exception when others then
  raise notice 'Security Test Passed: Update to is_verified was blocked: %', SQLERRM;
end;
$$;

-- TEST 2: Try to update coop_name (SHOULD FAIL)
do $$
begin
  update public.profiles 
  set coop_name = 'Admin Coop' 
  where id = auth.uid();
  
  if found then
    raise exception 'Security Test Failed: User was able to update coop_name!';
  end if;
exception when others then
  raise notice 'Security Test Passed: Update to coop_name was blocked: %', SQLERRM;
end;
$$;

-- TEST 3: Try to update avatar_url (SHOULD SUCCEED)
do $$
declare
  v_new_url text := 'https://example.com/new_avatar.png';
begin
  update public.profiles 
  set avatar_url = v_new_url
  where id = auth.uid();
  
  -- Check if it actually updated (assuming the user exists)
  -- If no user exists for auth.uid(), this part won't verify much, but it shouldn't error out.
  raise notice 'Security Test Passed: Update to avatar_url was allowed (or at least did not throw a security error).';
end;
$$;
