-- ==========================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ==========================================
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.pledges enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.perks enable row level security;
alter table public.events enable row level security;
alter table public.package_reports enable row level security;
alter table public.package_comments enable row level security;
alter table public.event_comments enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.poll_comments enable row level security;
alter table public.forum_post_votes enable row level security;
alter table public.forum_comment_votes enable row level security;
alter table public.user_activity enable row level security;



-- C. FORUM (Scoped Visibility)
create policy "Verified residents can view scoped forum posts"
  on public.forum_posts for select
  using (
    public.is_verified_resident() 
    AND (
      public.can_view_scoped_content(visibility) 
      OR user_id = auth.uid() -- Author can always see their own
    )
  );

create policy "Verified residents can create forum posts"
  on public.forum_posts for insert
  with check (
    public.is_verified_resident() 
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

create policy "Users can update own forum posts"
  on public.forum_posts for update
  using ( auth.uid() = user_id );



-- D. COMMENTS (Scoped Visibility)
create policy "Verified residents can view scoped comments"
  on public.forum_comments for select
  using (
    public.is_verified_resident() 
    AND (
      public.can_view_scoped_content(visibility) 
      OR user_id = auth.uid()
    )
  );

create policy "Verified residents can create forum comments"
  on public.forum_comments for insert
  with check (
    public.is_verified_resident() 
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

create policy "Users can update own forum comments"
  on public.forum_comments for update
  using ( auth.uid() = user_id );

create policy "Users can delete own forum comments"
  on public.forum_comments for delete
  using ( auth.uid() = user_id );

-- E. EVENTS (Scoped Visibility)
create policy "Authenticated users can view scoped events"
  on public.events for select
  using (
    public.can_view_scoped_content(visibility)
  );

create policy "Verified residents can create events"
  on public.events for insert
  with check (
    created_by = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

insert into storage.buckets (id, name, public) values ('event_images', 'event_images', true) on conflict (id) do nothing;

create policy "Event images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'event_images' );

create policy "Authenticated users can upload event images"
  on storage.objects for insert
  with check ( bucket_id = 'event_images' and auth.role() = 'authenticated' );

create policy "Users can update own events"
  on public.events for update
  using ( auth.uid() = created_by );

-- F. PACKAGE REPORTS (Strict + Scoped)
create policy "Verified residents can view scoped packages"
  on public.package_reports for select
  using (
    public.is_verified_resident() 
    AND (
      public.can_view_scoped_content(visibility)
      OR user_id = auth.uid()
    )
  );

create policy "Verified residents can report packages"
  on public.package_reports for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can update own package reports"
  on public.package_reports for update
  using ( auth.uid() = user_id );

-- PACKAGE COMMENTS
create policy "Authenticated users can view package comments"
  on public.package_comments for select
  using ( exists (select 1 from public.package_reports where id = package_comments.package_id) );

create policy "Users can update own package comments"
  on public.package_comments for update
  using ( auth.uid() = user_id );

create policy "Users can delete own package comments"
  on public.package_comments for delete
  using ( auth.uid() = user_id );

insert into storage.buckets (id, name, public) values ('package_reports', 'package_reports', true) on conflict (id) do nothing;

create policy "Package report images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'package_reports' );

create policy "Authenticated users can upload package report images"
  on storage.objects for insert
  with check ( bucket_id = 'package_reports' and auth.role() = 'authenticated' );

-- EVENT COMMENTS
create policy "Authenticated users can view event comments"
  on public.event_comments for select
  using ( exists (select 1 from public.events where id = event_comments.event_id) );

create policy "Verified residents can create event comments"
  on public.event_comments for insert
  with check (
    public.is_verified_resident() 
    AND auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

create policy "Users can update own event comments"
  on public.event_comments for update
  using ( auth.uid() = user_id );

create policy "Users can delete own event comments"
  on public.event_comments for delete
  using ( auth.uid() = user_id );

-- G. PLEDGES
create policy "Users can view own pledges"
  on public.pledges for select using ( auth.uid() = user_id );

create policy "Verified residents can pledge"
  on public.pledges for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

-- H. POLLS
create policy "Authenticated users can view scoped polls"
  on public.polls for select
  using ( public.can_view_scoped_content(visibility) );

create policy "Verified residents can create polls"
  on public.polls for insert
  with check ( public.is_verified_resident() AND auth.uid() = created_by );

-- I. POLL OPTIONS
create policy "Authenticated users can view poll options"
  on public.poll_options for select
  using ( exists (select 1 from public.polls where id = poll_options.poll_id) );

create policy "Verified residents can create poll options"
  on public.poll_options for insert
  with check ( 
    exists (
      select 1 from public.polls 
      where id = poll_options.poll_id 
      and created_by = auth.uid()
    ) 
  );

-- J. POLL VOTES
create policy "Authenticated users can view votes"
  on public.poll_votes for select
  using ( exists (select 1 from public.polls where id = poll_votes.poll_id) );

create policy "Verified residents can vote"
  on public.poll_votes for insert
  with check ( 
    public.is_verified_resident() 
    AND auth.uid() = user_id 
    AND exists (
      select 1 from public.polls 
      where id = poll_votes.poll_id 
      and closes_at > now()
    )
  );

create policy "Users can change their vote"
  on public.poll_votes for update
  using ( auth.uid() = user_id )
  with check (
    exists (
      select 1 from public.polls 
      where id = poll_votes.poll_id 
      and closes_at > now()
    )
  );

-- K. POLL COMMENTS
create policy "Authenticated users can view poll comments"
  on public.poll_comments for select
  using ( exists (select 1 from public.polls where id = poll_comments.poll_id) );

create policy "Verified residents can comment on polls"
  on public.poll_comments for insert
  with check ( 
    public.is_verified_resident() 
    AND auth.uid() = user_id 
    AND exists (
      select 1 from public.polls 
      where id = poll_comments.poll_id 
    )
  );

-- L. FORUM VOTES
create policy "Authenticated users can view votes"
  on public.forum_post_votes for select
  using ( true );

create policy "Verified residents can vote"
  on public.forum_post_votes for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can remove their own votes"
  on public.forum_post_votes for delete
  using ( auth.uid() = user_id );

-- M. FORUM COMMENT VOTES
create policy "Authenticated users can view comment votes"
  on public.forum_comment_votes for select
  using ( true );

create policy "Verified residents can vote on comments"
  on public.forum_comment_votes for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can remove their own comment votes"
  on public.forum_comment_votes for delete
  using ( auth.uid() = user_id );

-- ==========================================
-- 7. MARKETPLACE POLICIES
-- ==========================================
alter table public.marketplace_items enable row level security;
alter table public.marketplace_likes enable row level security;
alter table public.marketplace_comments enable row level security;
alter table public.marketplace_comment_votes enable row level security;

-- Items
create policy "Marketplace items are viewable by everyone"
    on public.marketplace_items for select using (true);

create policy "Users can insert their own marketplace items"
    on public.marketplace_items for insert with check (auth.uid() = user_id);

create policy "Users can update their own marketplace items"
    on public.marketplace_items for update using (auth.uid() = user_id);

create policy "Users can delete their own marketplace items"
    on public.marketplace_items for delete using (auth.uid() = user_id);

-- Likes
create policy "Likes are viewable by everyone"
    on public.marketplace_likes for select using (true);

create policy "Authenticated users can toggle likes"
    on public.marketplace_likes for insert with check (auth.uid() = user_id);

create policy "Users can remove their own likes"
    on public.marketplace_likes for delete using (auth.uid() = user_id);

-- Comments
create policy "Marketplace comments are viewable by everyone"
    on public.marketplace_comments for select using (true);

create policy "Authenticated users can create marketplace comments"
    on public.marketplace_comments for insert with check (auth.uid() = user_id);

create policy "Users can update their own marketplace comments"
    on public.marketplace_comments for update using (auth.uid() = user_id);

create policy "Users can delete their own marketplace comments"
    on public.marketplace_comments for delete using (auth.uid() = user_id);

-- Comment Votes
create policy "Marketplace comment votes are viewable by everyone"
    on public.marketplace_comment_votes for select using (true);

create policy "Authenticated users can vote on marketplace comments"
    on public.marketplace_comment_votes for insert with check (auth.uid() = user_id);

create policy "Users can remove their own marketplace comment votes"
    on public.marketplace_comment_votes for delete using (auth.uid() = user_id);

-- Storage
insert into storage.buckets (id, name, public) values ('marketplace_images', 'marketplace_images', true) on conflict (id) do nothing;

create policy "Marketplace images are publicly accessible"
    on storage.objects for select using (bucket_id = 'marketplace_images');

create policy "Authenticated users can upload marketplace images"
    on storage.objects for insert with check (bucket_id = 'marketplace_images' and auth.role() = 'authenticated');

-- ==========================================
-- 8. DEV SUPPORT POLICIES
-- ==========================================
alter table public.dev_support_tickets enable row level security;
alter table public.dev_support_comments enable row level security;
alter table public.dev_support_ticket_votes enable row level security;
alter table public.dev_support_ticket_views enable row level security;

-- Tickets
create policy "Tickets are viewable by everyone"
    on public.dev_support_tickets for select using (true);

create policy "Authenticated users can create tickets"
    on public.dev_support_tickets for insert with check (auth.uid() = user_id);

create policy "Users can update their own tickets"
    on public.dev_support_tickets for update using (auth.uid() = user_id);

-- Interactions (Comments, Votes, Views)
create policy "Dev support interactions viewable by everyone"
    on public.dev_support_comments for select using (true);

create policy "Authenticated users can comment on tickets"
    on public.dev_support_comments for insert with check (auth.uid() = user_id);

create policy "Authenticated users can vote on tickets"
    on public.dev_support_ticket_votes for insert with check (auth.uid() = user_id);

create policy "Authenticated users can view tickets"
    on public.dev_support_ticket_views for insert with check (auth.uid() = user_id);

-- ==========================================
-- 9. ADMIN & SECURITY POLICIES
-- ==========================================

-- Refined Permissions (Limited Users)
-- Allow 'limited' users to INSERT into package_reports and package_comments
DROP POLICY IF EXISTS "package_reports_insert_policy" ON public.package_reports;
CREATE POLICY "package_reports_insert_policy" ON public.package_reports FOR INSERT TO authenticated
WITH CHECK ( auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'full', 'limited')) );

DROP POLICY IF EXISTS "package_comments_insert_policy" ON public.package_comments;
CREATE POLICY "package_comments_insert_policy" ON public.package_comments FOR INSERT TO authenticated
WITH CHECK ( auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'full', 'limited')) );

-- Enforce restrictions on Poll Votes for limited users
DROP POLICY IF EXISTS "poll_votes_insert_policy" ON public.poll_votes;
CREATE POLICY "poll_votes_insert_policy" ON public.poll_votes FOR INSERT TO authenticated
WITH CHECK ( auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'full')) );

-- Secure Profiles (Strict Update)
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
USING (
    auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
    auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User Activity (RLS was missing)
create policy "Users can view own activity"
    on public.user_activity for select
    using ( auth.uid() = user_id );

create policy "Users can update own activity"
    on public.user_activity for update
    using ( auth.uid() = user_id );

create policy "Users can insert own activity"
  on public.user_activity for insert
  with check ( auth.uid() = user_id );