-- Refine RBAC for Limited Users

-- 1. Allow 'limited' users to INSERT into package_reports and package_comments
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
        AND role IN ('admin', 'full', 'limited') -- Added 'limited'
    )
);

DROP POLICY IF EXISTS "package_comments_insert_policy" ON public.package_comments;
CREATE POLICY "package_comments_insert_policy"
ON public.package_comments
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full', 'limited') -- Added 'limited'
    )
);

-- 2. Enforce restrictions on Poll Votes for limited users
DROP POLICY IF EXISTS "poll_votes_insert_policy" ON public.poll_votes;
CREATE POLICY "poll_votes_insert_policy"
ON public.poll_votes
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full') -- Omitted 'limited'
    )
);

-- 3. Enforce restrictions on Event creation (if not already restricted)
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
CREATE POLICY "events_insert_policy"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full') -- Omitted 'limited'
    )
);
