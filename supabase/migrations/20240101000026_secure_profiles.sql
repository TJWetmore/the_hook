-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. VIEW Policies (Select)
-- Allow authenticated users to view all profiles (needed for the app to show authors)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. UPDATE Policies
-- Allow users to update their OWN profile
-- OR allow Admins to update ANY profile
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    -- User is editing themselves
    auth.uid() = id 
    OR 
    -- User is an admin
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
)
WITH CHECK (
    -- User is editing themselves
    auth.uid() = id 
    OR 
    -- User is an admin
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- 3. INSERT Policies
-- Profiles are typically created by triggers on auth.users, so we often don't need a public insert policy.
-- However, if manual creation is allowed, restrict it to admins or self (rare).
-- best practice: explicit deny for normal users, or just don't create a policy (default deny).
-- We will leave INSERT as default deny for authenticated users (trigger uses service_role).
