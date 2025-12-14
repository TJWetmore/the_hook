-- Fix Soft Delete Visibility
-- Update SELECT policies to allow owners and admins to see soft-deleted content
-- This fixes the 403 Forbidden error during "delete" (UPDATE) operations where the return value was blocked

-- 1. Forum
drop policy if exists "Verified residents can view scoped forum posts" on public.forum_posts;
create policy "Verified residents can view scoped forum posts"
  on public.forum_posts for select
  using (
    (
       public.is_verified_resident() 
       AND public.can_view_scoped_content(visibility)
       AND deleted_at IS NULL
    )
    OR (
       user_id = auth.uid() 
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

drop policy if exists "Verified residents can view scoped comments" on public.forum_comments;
create policy "Verified residents can view scoped comments"
  on public.forum_comments for select
  using (
    (
       public.is_verified_resident() 
       AND public.can_view_scoped_content(visibility)
       AND deleted_at IS NULL
    )
    OR (
       user_id = auth.uid() 
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- 2. Events
drop policy if exists "Authenticated users can view scoped events" on public.events;
create policy "Authenticated users can view scoped events"
  on public.events for select
  using (
    (
      public.can_view_scoped_content(visibility)
      AND deleted_at IS NULL
    )
    OR (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

drop policy if exists "Authenticated users can view event comments" on public.event_comments;
create policy "Authenticated users can view event comments"
  on public.event_comments for select
  using (
    (
      exists (select 1 from public.events where id = event_comments.event_id)
      AND deleted_at IS NULL
    )
    OR (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- 3. Packages
drop policy if exists "Verified residents can view scoped packages" on public.package_reports;
create policy "Verified residents can view scoped packages"
  on public.package_reports for select
  using (
    (
       public.is_verified_resident() 
       AND public.can_view_scoped_content(visibility)
       AND deleted_at IS NULL
    )
    OR (
       user_id = auth.uid() 
       OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

drop policy if exists "Authenticated users can view package comments" on public.package_comments;
create policy "Authenticated users can view package comments"
  on public.package_comments for select
  using (
    (
      exists (select 1 from public.package_reports where id = package_comments.package_id) 
      AND deleted_at IS NULL
    )
    OR (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- 4. Polls
drop policy if exists "Authenticated users can view scoped polls" on public.polls;
create policy "Authenticated users can view scoped polls"
  on public.polls for select
  using (
    (
      public.can_view_scoped_content(visibility)
      AND deleted_at IS NULL
    )
    OR (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

drop policy if exists "Authenticated users can view poll comments" on public.poll_comments;
create policy "Authenticated users can view poll comments"
  on public.poll_comments for select
  using (
    (
      exists (select 1 from public.polls where id = poll_comments.poll_id)
      AND deleted_at IS NULL
    )
    OR (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- 5. Marketplace
drop policy if exists "Marketplace items are viewable by everyone" on public.marketplace_items;
create policy "Marketplace items are viewable by everyone"
    on public.marketplace_items for select using (
        deleted_at IS NULL
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

drop policy if exists "Marketplace comments are viewable by everyone" on public.marketplace_comments;
create policy "Marketplace comments are viewable by everyone"
    on public.marketplace_comments for select using (
        deleted_at IS NULL
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. Dev Support
drop policy if exists "Tickets are viewable by everyone" on public.dev_support_tickets;
create policy "Tickets are viewable by everyone"
    on public.dev_support_tickets for select using (
        deleted_at IS NULL
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

drop policy if exists "Dev support interactions viewable by everyone" on public.dev_support_comments;
create policy "Dev support interactions viewable by everyone"
    on public.dev_support_comments for select using (
        deleted_at IS NULL
        OR user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
