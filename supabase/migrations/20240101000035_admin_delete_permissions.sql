-- Admin Delete Permissions
-- Update DELETE policies for all relevant tables to allow admins to delete specific rows

-- 1. Forum Posts
drop policy if exists "Users can delete own forum posts" on public.forum_posts;
create policy "Users can delete own forum posts"
  on public.forum_posts for delete
  using ( 
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Forum Comments
drop policy if exists "Users can delete own forum comments" on public.forum_comments;
create policy "Users can delete own forum comments"
  on public.forum_comments for delete
  using ( 
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Events
drop policy if exists "Users can delete own events" on public.events;
create policy "Users can delete own events"
  on public.events for delete
  using ( 
    auth.uid() = created_by 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Event Comments
drop policy if exists "Users can delete own event comments" on public.event_comments;
create policy "Users can delete own event comments"
  on public.event_comments for delete
  using ( 
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Package Reports
drop policy if exists "Users can delete own package reports" on public.package_reports;
create policy "Users can delete own package reports"
  on public.package_reports for delete
  using ( 
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Package Comments
drop policy if exists "Users can delete own package comments" on public.package_comments;
create policy "Users can delete own package comments"
  on public.package_comments for delete
  using ( 
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Polls
drop policy if exists "Users can delete own polls" on public.polls;
create policy "Users can delete own polls"
  on public.polls for delete
  using ( 
    auth.uid() = created_by 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. Poll Comments
drop policy if exists "Users can delete own poll comments" on public.poll_comments;
create policy "Users can delete own poll comments"
  on public.poll_comments for delete
  using ( 
    auth.uid() = user_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9. Marketplace Items
drop policy if exists "Users can delete their own marketplace items" on public.marketplace_items;
drop policy if exists "Users can delete own marketplace items" on public.marketplace_items;
create policy "Users can delete own marketplace items"
    on public.marketplace_items for delete using (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 10. Marketplace Comments
drop policy if exists "Users can delete their own marketplace comments" on public.marketplace_comments;
drop policy if exists "Users can delete own marketplace comments" on public.marketplace_comments;
create policy "Users can delete own marketplace comments"
    on public.marketplace_comments for delete using (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 11. Dev Support Tickets
drop policy if exists "Users can delete own tickets" on public.dev_support_tickets;
create policy "Users can delete own tickets"
    on public.dev_support_tickets for delete using (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 12. Dev Support Comments
drop policy if exists "Users can delete own dev comments" on public.dev_support_comments;
create policy "Users can delete own dev comments"
    on public.dev_support_comments for delete using (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
