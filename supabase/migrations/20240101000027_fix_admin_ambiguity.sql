-- Fix for ambiguous 'id' column reference in security checks
-- Previous definition used 'WHERE id = auth.uid()' which conflicted with output parameter 'id'

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
    -- FIXED: Used alias 'p' to avoid ambiguity with output 'id'
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

CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id uuid, new_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the requesting user is an admin
    -- FIXED: Used alias 'p'
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

CREATE OR REPLACE FUNCTION public.update_user_verification(target_user_id uuid, status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the requesting user is an admin
    -- FIXED: Used alias 'p'
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
