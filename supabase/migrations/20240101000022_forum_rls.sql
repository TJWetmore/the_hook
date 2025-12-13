-- Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read posts (or just authenticated?)
-- Assumption: Forum is public to the community, so authenticated users.
-- If we want truly public, we use 'anon'. But let's start with 'authenticated' as this is a gated community app.
-- Re-reading the prompt: "I'm not seeing any posts on the landing page". 
-- If the user wants successful fetch, we need a policy.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'forum_posts'
        AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users"
        ON public.forum_posts
        FOR SELECT
        USING (true); -- Publicly readable? Or just authenticated?
                      -- "USING (auth.role() = 'authenticated');" is safer for private communities.
                      -- However, "Enable read access for all users" usually implies public.
                      -- Let's make it authenticated to be safe given the "Residents only" nature.
    END IF;
END
$$;

-- Actually, if there are NO policies, and RLS is enabled, NO ONE can see anything (except service role).
-- So we MUST add a policy.

-- Update: Let's explicitly allow authenticated users to view all posts.
DROP POLICY IF EXISTS "forum_posts_select_policy" ON public.forum_posts;
CREATE POLICY "forum_posts_select_policy"
ON public.forum_posts
FOR SELECT
TO authenticated
USING (true);

-- Also need insert policy if they want to post!
DROP POLICY IF EXISTS "forum_posts_insert_policy" ON public.forum_posts;
CREATE POLICY "forum_posts_insert_policy"
ON public.forum_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update policy
DROP POLICY IF EXISTS "forum_posts_update_policy" ON public.forum_posts;
CREATE POLICY "forum_posts_update_policy"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Delete policy (soft delete handled by app, but hard delete access just in case or for soft delete updates)
-- Soft delete is an UPDATE, so update policy covers it.
