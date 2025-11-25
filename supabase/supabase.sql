-- 1. PROFILES (Extends Auth, handles Resident Verification)
create table public.profiles (
  id uuid references auth.users not null primary key,
  user_name text,
  coop_name text, -- e.g., "Hillman"
  building_address text, -- e.g., "573 Grand Street"
  unit_number text,
  is_verified boolean default false, -- Manual gatekeeping toggle
  avatar_url text
);

-- 2. CAMPAIGNS (The Bulk Buy Board)
create table public.campaigns (
  id uuid default gen_random_uuid() primary key,
  campaign_name text not null,
  description text,
  image_url text,
  price_per_unit numeric not null, -- Cost per user
  min_pledges_needed int not null, -- The "Tipping Point"
  current_pledges int default 0,
  deadline timestamp with time zone,
  delivery_date timestamp with time zone,
  status text default 'active' -- active, funded, closed
);

-- 3. PLEDGES (Who bought what)
create table public.pledges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  campaign_id uuid references public.campaigns(id),
  stripe_payment_intent_id text, -- For manual capture logic
  status text default 'pending', -- pending, captured, cancelled
  created_at timestamp with time zone default now()
);

-- 4. FORUM POSTS (The Knowledge Base)
create table public.forum_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  post_name text not null,
  content text,
  category text, -- 'Vendor Review', 'Renovation', 'General'
  tags text[], -- ['Plumber', 'Flooring']
  upvotes int default 0,
  created_at timestamp with time zone default now(),
  visibility text default 'public' -- public, private, East River Coop
);

-- 5. FORUM COMMENTS (Nested discussions)
create table public.forum_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamp with time zone default now(),
  visibility text default 'public' -- public, private, East River Coop
);

-- 6. PERKS (Local Discounts)
create table public.perks (
  id uuid default gen_random_uuid() primary key,
  business_name text not null,
  discount_offer text not null, -- "10% off coffee"
  redemption_code text, -- "HOOKRESIDENT24"
  category text, -- 'Food', 'Service', 'Retail'
  active boolean default true
);

-- 7. EVENTS (Calendar)
create table public.events (
  id uuid default gen_random_uuid() primary key,
  event_name text not null,
  host_organization text, -- 'Abrons', 'Board'
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  location text not null,
  description text,
  image_url text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  visibility text default 'public' -- public, private, East River Coop
);

-- 8. PACKAGE REPORTS (Lost & Found)
create table public.package_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  report_type text not null, -- 'found' or 'lost'
  item_description text not null, -- 'Blue Chewy Box'
  location_found text, -- 'Bldg 1 Lobby'
  status text default 'open', -- 'open', 'resolved'
  created_at timestamp with time zone default now(),
  visibility text default 'public', -- public, private, East River Coop
  tags text[] -- ['K line, G line, Building 1, Building 2, Building 3']
);

-- 9. INDEXES (Performance)
create index if not exists idx_pledges_user_id on public.pledges(user_id);
create index if not exists idx_pledges_campaign_id on public.pledges(campaign_id);
create index if not exists idx_forum_posts_user_id on public.forum_posts(user_id);
create index if not exists idx_forum_comments_post_id on public.forum_comments(post_id);
create index if not exists idx_forum_comments_user_id on public.forum_comments(user_id);
create index if not exists idx_package_reports_user_id on public.package_reports(user_id);