-- Fix missing RLS policies for Event Comments

-- SELECT Policy: Authenticated users can view comments (if they exist)
DROP POLICY IF EXISTS "Authenticated users can view event comments" ON public.event_comments;
CREATE POLICY "Authenticated users can view event comments"
  ON public.event_comments FOR SELECT
  USING ( exists (select 1 from public.events where id = event_comments.event_id) );

-- INSERT Policy: Verified residents (Admin/Full) can create comments
DROP POLICY IF EXISTS "Verified residents can create event comments" ON public.event_comments;
CREATE POLICY "Verified residents can create event comments"
  ON public.event_comments FOR INSERT
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
DROP POLICY IF EXISTS "Users can update own event comments" ON public.event_comments;
CREATE POLICY "Users can update own event comments"
  ON public.event_comments FOR UPDATE
  USING ( auth.uid() = user_id );

-- DELETE Policy: Authors can delete their own comments
DROP POLICY IF EXISTS "Users can delete own event comments" ON public.event_comments;
CREATE POLICY "Users can delete own event comments"
  ON public.event_comments FOR DELETE
  USING ( auth.uid() = user_id );
