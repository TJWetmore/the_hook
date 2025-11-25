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

-- ==========================================
-- STEP 2: HELPER FUNCTIONS
-- ==========================================

-- A. Gatekeeper: Checks if user is verified
create or replace function public.is_verified_resident()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and is_verified = true
  );
end;
$$ language plpgsql security definer;

-- B. Scope Checker: Checks if the row's visibility matches user's coop
-- Usage: select public.can_view_scoped_content(visibility_column)
create or replace function public.can_view_scoped_content(content_visibility text)
returns boolean as $$
begin
  -- 1. If public, everyone can see
  if content_visibility = 'public' then
    return true;
  end if;

  -- 2. If private/scoped, check against user's coop_name
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and coop_name = content_visibility
  );
end;
$$ language plpgsql security definer;

-- ==========================================
-- STEP 3: DEFINE POLICIES
-- ==========================================

-- A. PROFILES
create policy "Profiles are viewable by everyone logged in"
  on public.profiles for select using ( auth.role() = 'authenticated' );

create policy "Users can update own profile"
  on public.profiles for update using ( auth.uid() = id );

-- Prevent users from updating sensitive fields (is_verified, coop_name)
create or replace function public.prevent_sensitive_updates()
returns trigger as $$
begin
  -- If the user is NOT a service role (i.e. is a regular authenticated user)
  -- AND they are trying to change restricted columns
  if (auth.role() = 'authenticated') then
    if (new.is_verified is distinct from old.is_verified) then
      raise exception 'You are not allowed to update is_verified.';
    end if;
    if (new.coop_name is distinct from old.coop_name) then
      raise exception 'You are not allowed to update coop_name.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_update on public.profiles;
create trigger on_profile_update
  before update on public.profiles
  for each row execute procedure public.prevent_sensitive_updates();

-- B. CAMPAIGNS & PERKS (Public Teasers)
create policy "Campaigns viewable by authenticated"
  on public.campaigns for select using ( auth.role() = 'authenticated' );

create policy "Perks viewable by authenticated"
  on public.perks for select using ( auth.role() = 'authenticated' );

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

create policy "Verified residents can insert posts"
  on public.forum_posts for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can edit own posts"
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

create policy "Verified residents can comment"
  on public.forum_comments for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

-- E. EVENTS (Scoped Visibility)
create policy "Authenticated users can view scoped events"
  on public.events for select
  using (
    public.can_view_scoped_content(visibility)
  );

create policy "Verified residents can create events"
  on public.events for insert
  with check ( public.is_verified_resident() AND auth.uid() = created_by );

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

-- G. PLEDGES
create policy "Users can view own pledges"
  on public.pledges for select using ( auth.uid() = user_id );

create policy "Verified residents can pledge"
  on public.pledges for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );