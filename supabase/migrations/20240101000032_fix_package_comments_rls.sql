-- Fix missing RLS policies for Package Comments (SELECT, UPDATE, DELETE)
-- INSERT policy already exists in "Admin & Security" migration

-- SELECT Policy: Authenticated users can view comments (if they can view the package)
-- Note: Logic relies on existence of package report. RLS on package_reports handles scoping.
DROP POLICY IF EXISTS "Authenticated users can view package comments" ON public.package_comments;
CREATE POLICY "Authenticated users can view package comments"
  ON public.package_comments FOR SELECT
  USING ( exists (select 1 from public.package_reports where id = package_comments.package_id) );

-- UPDATE Policy: Authors can update their own comments
DROP POLICY IF EXISTS "Users can update own package comments" ON public.package_comments;
CREATE POLICY "Users can update own package comments"
  ON public.package_comments FOR UPDATE
  USING ( auth.uid() = user_id );

-- DELETE Policy: Authors can delete their own comments
DROP POLICY IF EXISTS "Users can delete own package comments" ON public.package_comments;
CREATE POLICY "Users can delete own package comments"
  ON public.package_comments FOR DELETE
  USING ( auth.uid() = user_id );
