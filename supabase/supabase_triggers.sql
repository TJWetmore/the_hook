-- ==========================================
-- 4. FUNCTIONS & TRIGGERS
-- ==========================================

-- Auth Hook: Handle New User
create or replace function public.handle_new_user()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
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
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'coop_name',
    new.raw_user_meta_data->>'building_address',
    new.raw_user_meta_data->>'unit_number',
    false,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: Is Verified Resident
create or replace function public.is_verified_resident()
returns boolean 
language plpgsql 
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_verified = true
  );
end;
$$;

-- Helper: Can View Scoped Content
create or replace function public.can_view_scoped_content(content_visibility text)
returns boolean 
language plpgsql 
security definer
set search_path = public
as $$
begin
  if content_visibility = 'public' then
    return true;
  end if;
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and coop_name = content_visibility
  );
end;
$$;

-- Helper: Prevent Sensitive Updates
create or replace function public.prevent_sensitive_updates()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
  if (auth.role() = 'authenticated') then
    if (new.is_verified is distinct from old.is_verified) then
      raise exception 'You are not allowed to update is_verified.';
    end if;
    if (new.coop_name is distinct from old.coop_name) then
      raise exception 'You are not allowed to update coop_name.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_update on public.profiles;
create trigger on_profile_update
  before update on public.profiles
  for each row execute procedure public.prevent_sensitive_updates();

-- ==========================================
-- 7. MARKETPLACE FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION increment_marketplace_view(item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketplace_items
  SET view_count = view_count + 1
  WHERE id = item_id;
END;
$$;

-- ==========================================
-- 8. ADMIN RPC FUNCTIONS
-- ==========================================

-- Secure function to get all users (Admin Only)
-- FIX: Includes alias to prevent ambiguous column reference
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
    id uuid,
    email text,
    user_name text,
    coop_name text,
    unit_number text,
    role public.user_role,
    is_verified boolean,
    created_at timestamptz,
    last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        au.id,
        au.email::text,
        p.user_name,
        p.coop_name,
        p.unit_number,
        p.role,
        p.is_verified,
        au.created_at,
        au.last_sign_in_at
    FROM auth.users au
    JOIN public.profiles p ON p.id = au.id
    ORDER BY au.created_at DESC;
END;
$$;

-- Function to update a user's role
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.profiles
    SET role = new_role
    WHERE id = target_user_id;
END;
$$;

-- Function to update a user's verification status
CREATE OR REPLACE FUNCTION public.update_user_verification(target_user_id uuid, status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.profiles
    SET is_verified = status
    WHERE id = target_user_id;
END;
$$;