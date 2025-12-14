-- Fix missing RLS policies for Forum Comments

-- INSERT Policy: Verified residents (Admin/Full) can create comments
-- Drops policy first to ensure idempotency if run multiple times
DROP POLICY IF EXISTS "Verified residents can create forum comments" ON public.forum_comments;
CREATE POLICY "Verified residents can create forum comments"
  ON public.forum_comments FOR INSERT
  WITH CHECK (
    public.is_verified_resident() 
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

-- UPDATE Policy: Authors can update their own comments
DROP POLICY IF EXISTS "Users can update own forum comments" ON public.forum_comments;
CREATE POLICY "Users can update own forum comments"
  ON public.forum_comments FOR UPDATE
  USING ( auth.uid() = user_id );

-- DELETE Policy: Authors can delete their own comments
DROP POLICY IF EXISTS "Users can delete own forum comments" ON public.forum_comments;
CREATE POLICY "Users can delete own forum comments"
  ON public.forum_comments FOR DELETE
  USING ( auth.uid() = user_id );
