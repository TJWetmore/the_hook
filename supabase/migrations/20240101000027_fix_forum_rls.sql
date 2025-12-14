-- Fix missing RLS policies for Forum Posts

-- INSERT Policy: Verified residents (Admin/Full) can create posts
-- Drops policy first to ensure idempotency if run multiple times
DROP POLICY IF EXISTS "Verified residents can create forum posts" ON public.forum_posts;
CREATE POLICY "Verified residents can create forum posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    public.is_verified_resident() 
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

-- UPDATE Policy: Authors can update their own posts (e.g. for soft delete or editing)
DROP POLICY IF EXISTS "Users can update own forum posts" ON public.forum_posts;
CREATE POLICY "Users can update own forum posts"
  ON public.forum_posts FOR UPDATE
  USING ( auth.uid() = user_id );
