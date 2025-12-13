-- Secure function to get all users with their auth data
-- Only accessible by admins
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
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
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
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
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
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.profiles
    SET is_verified = status
    WHERE id = target_user_id;
END;
$$;
