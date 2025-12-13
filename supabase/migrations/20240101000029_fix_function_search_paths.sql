-- Fix function_search_path_mutable warnings by setting strict search_path

-- 1. increment_marketplace_view
CREATE OR REPLACE FUNCTION public.increment_marketplace_view(item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketplace_items
  SET view_count = view_count + 1
  WHERE id = item_id;
END;
$$;

-- 2. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    user_name,
    coop_name,
    building_address,
    unit_number,
    is_verified,
    avatar_url
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'coop_name',
    new.raw_user_meta_data->>'building_address',
    new.raw_user_meta_data->>'unit_number',
    false,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- 3. is_verified_resident
CREATE OR REPLACE FUNCTION public.is_verified_resident()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_verified = true
  );
END;
$$;

-- 4. can_view_scoped_content
CREATE OR REPLACE FUNCTION public.can_view_scoped_content(content_visibility text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF content_visibility = 'public' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND coop_name = content_visibility
  );
END;
$$;

-- 5. prevent_sensitive_updates
CREATE OR REPLACE FUNCTION public.prevent_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.role() = 'authenticated') THEN
    IF (new.is_verified IS DISTINCT FROM old.is_verified) THEN
      RAISE EXCEPTION 'You are not allowed to update is_verified.';
    END IF;
    IF (new.coop_name IS DISTINCT FROM old.coop_name) THEN
      RAISE EXCEPTION 'You are not allowed to update coop_name.';
    END IF;
  END IF;
  RETURN new;
END;
$$;
