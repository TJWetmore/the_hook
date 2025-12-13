-- Create Enum for User Roles
CREATE TYPE public.user_role AS ENUM ('admin', 'full', 'limited', 'blocked');

-- Add role column to profiles
ALTER TABLE public.profiles 
ADD COLUMN role public.user_role NOT NULL DEFAULT 'full';

-- Update RLS Policies to respect roles

-- 1. Forum Posts: Only 'admin' or 'full' can INSERT
DROP POLICY IF EXISTS "forum_posts_insert_policy" ON public.forum_posts;
CREATE POLICY "forum_posts_insert_policy"
ON public.forum_posts
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
);

-- 2. Forum Comments: Only 'admin' or 'full' can INSERT
-- (We assume we need to create this policy as we might not have explicitly defined it before with this granularity)
DROP POLICY IF EXISTS "forum_comments_insert_policy" ON public.forum_comments;
CREATE POLICY "forum_comments_insert_policy"
ON public.forum_comments
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
);

-- 3. Package Reports: Only 'admin' or 'full' can INSERT
DROP POLICY IF EXISTS "package_reports_insert_policy" ON public.package_reports;
CREATE POLICY "package_reports_insert_policy"
ON public.package_reports
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
);

-- 4. Marketplace: Only 'admin' or 'full' can INSERT
DROP POLICY IF EXISTS "marketplace_items_insert_policy" ON public.marketplace_items;
CREATE POLICY "marketplace_items_insert_policy"
ON public.marketplace_items
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
);

-- Blocked users shouldn't be able to read anything?
-- If we want to strictly enforce blocked users at the DB level:
-- We'd need to update ALL SELECT policies. 
-- For now, we will handle the "Blocked Screen" at the App level, 
-- but strict security would require updating every SELECT policy.
-- Let's update at least the Forum Read policy to show how it's done.

DROP POLICY IF EXISTS "forum_posts_select_policy" ON public.forum_posts;
CREATE POLICY "forum_posts_select_policy"
ON public.forum_posts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role != 'blocked'
    )
);
