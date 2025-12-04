-- ==========================================
-- 1. BASE SCHEMA (Tables)
-- ==========================================

-- PROFILES (Extends Auth, handles Resident Verification)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  user_name text,
  coop_name text,
  building_address text,
  unit_number text,
  is_verified boolean default false,
  avatar_url text
);

-- CAMPAIGNS (The Bulk Buy Board)
create table if not exists public.campaigns (
  id uuid default gen_random_uuid() primary key,
  campaign_name text not null,
  description text,
  image_url text,
  price_per_unit numeric not null,
  min_pledges_needed int not null,
  current_pledges int default 0,
  deadline timestamp with time zone,
  delivery_date timestamp with time zone,
  status text default 'active'
);

-- PLEDGES (Who bought what)
create table if not exists public.pledges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  campaign_id uuid references public.campaigns(id),
  stripe_payment_intent_id text,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- FORUM POSTS (The Knowledge Base)
create table if not exists public.forum_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  post_name text not null,
  content text,
  category text,
  tags text[],
  upvotes int default 0,
  created_at timestamp with time zone default now(),
  visibility text default 'public'
);

-- FORUM COMMENTS (Nested discussions)
create table if not exists public.forum_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamp with time zone default now(),
  visibility text default 'public'
);

-- PERKS (Local Discounts)
create table if not exists public.perks (
  id uuid default gen_random_uuid() primary key,
  business_name text not null,
  discount_offer text not null,
  redemption_code text,
  category text,
  active boolean default true
);

-- EVENTS (Calendar)
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  event_name text not null,
  host_organization text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  location text not null,
  description text,
  image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  visibility text default 'public'
);

-- PACKAGE REPORTS (Lost & Found)
create table if not exists public.package_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  report_type text not null,
  item_description text not null,
  location_found text,
  status text default 'open',
  created_at timestamp with time zone default now(),
  visibility text default 'public',
  tags text[],
  package_digits text,
  image_url text,
  is_food boolean default false,
  additional_notes text
);

-- PACKAGE COMMENTS
create table if not exists public.package_comments (
  id uuid default gen_random_uuid() primary key,
  package_id uuid references public.package_reports(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now(),
  parent_id uuid references public.package_comments(id) on delete cascade
);

-- EVENT COMMENTS
create table if not exists public.event_comments (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- USER ACTIVITY (Unread Badges)
create table if not exists public.user_activity (
  user_id uuid references public.profiles(id) primary key,
  last_seen_forum timestamp with time zone default now(),
  last_seen_events timestamp with time zone default now(),
  last_seen_packages timestamp with time zone default now(),
  last_seen_perks timestamp with time zone default now(),
  last_seen_dashboard timestamp with time zone default now()
);

-- ==========================================
-- 2. INDEXES
-- ==========================================
create index if not exists idx_pledges_user_id on public.pledges(user_id);
create index if not exists idx_pledges_campaign_id on public.pledges(campaign_id);
create index if not exists idx_forum_posts_user_id on public.forum_posts(user_id);
create index if not exists idx_forum_comments_post_id on public.forum_comments(post_id);
create index if not exists idx_forum_comments_user_id on public.forum_comments(user_id);
create index if not exists idx_package_reports_user_id on public.package_reports(user_id);
create index if not exists idx_package_comments_package_id on public.package_comments(package_id);
create index if not exists idx_package_comments_parent_id on public.package_comments(parent_id);
create index if not exists idx_event_comments_event_id on public.event_comments(event_id);
create index if not exists idx_events_created_by on public.events(created_by);

-- ==========================================
-- 3. STORAGE BUCKETS
-- ==========================================
insert into storage.buckets (id, name, public)
values 
  ('package_reports', 'package_reports', true),
  ('event_images', 'event_images', true)
on conflict (id) do nothing;

-- ==========================================
-- 4. FUNCTIONS & TRIGGERS
-- ==========================================

-- Auth Hook: Handle New User
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    user_name,
    coop_name,
    building_address,
    unit_number,
    is_verified,
    avatar_url
  )
  values (
    new.id,
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'coop_name',
    new.raw_user_meta_data->>'building_address',
    new.raw_user_meta_data->>'unit_number',
    false,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: Is Verified Resident
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

-- Helper: Can View Scoped Content
create or replace function public.can_view_scoped_content(content_visibility text)
returns boolean as $$
begin
  if content_visibility = 'public' then
    return true;
  end if;
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and coop_name = content_visibility
  );
end;
$$ language plpgsql security definer;

-- Helper: Prevent Sensitive Updates
create or replace function public.prevent_sensitive_updates()
returns trigger as $$
begin
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

-- ==========================================
-- 5. RLS POLICIES
-- ==========================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.pledges enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.perks enable row level security;
alter table public.events enable row level security;
alter table public.package_reports enable row level security;
alter table public.user_activity enable row level security;

-- Profiles
create policy "Profiles are viewable by everyone logged in"
  on public.profiles for select using ( auth.role() = 'authenticated' );

create policy "Users can update own profile"
  on public.profiles for update using ( auth.uid() = id );

-- Campaigns & Perks
create policy "Campaigns viewable by authenticated"
  on public.campaigns for select using ( auth.role() = 'authenticated' );

create policy "Perks viewable by authenticated"
  on public.perks for select using ( auth.role() = 'authenticated' );

-- Forum
create policy "Verified residents can view scoped forum posts"
  on public.forum_posts for select
  using (
    public.is_verified_resident() 
    AND (
      public.can_view_scoped_content(visibility) 
      OR user_id = auth.uid()
    )
  );

create policy "Verified residents can insert posts"
  on public.forum_posts for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can edit own posts"
  on public.forum_posts for update
  using ( auth.uid() = user_id );

-- Forum Comments
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

-- Events
create policy "Authenticated users can view scoped events"
  on public.events for select
  using ( public.can_view_scoped_content(visibility) );

create policy "Verified residents can create events"
  on public.events for insert
  with check ( public.is_verified_resident() AND auth.uid() = created_by );

create policy "Users can update own events"
  on public.events for update
  using ( auth.uid() = created_by );

-- Package Reports
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

-- Pledges
create policy "Users can view own pledges"
  on public.pledges for select using ( auth.uid() = user_id );

create policy "Verified residents can pledge"
  on public.pledges for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

-- User Activity
create policy "Users can view their own activity"
  on public.user_activity for select
  using ( auth.uid() = user_id );

create policy "Users can update their own activity"
  on public.user_activity for update
  using ( auth.uid() = user_id );

create policy "Users can insert their own activity"
  on public.user_activity for insert
  with check ( auth.uid() = user_id );

-- Storage Policies
create policy "Package reports are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'package_reports' );

create policy "Authenticated users can upload package reports"
  on storage.objects for insert
  with check ( bucket_id = 'package_reports' and auth.role() = 'authenticated' );

create policy "Event images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'event_images' );

create policy "Authenticated users can upload event images"
  on storage.objects for insert
  with check ( bucket_id = 'event_images' and auth.role() = 'authenticated' );