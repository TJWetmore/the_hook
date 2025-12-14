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
  visibility text default 'public', -- public, private, East River Coop
  deleted_at timestamp with time zone
);

-- 5. FORUM COMMENTS (Nested discussions)
create table public.forum_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade,
  user_id uuid references public.profiles(id),
  content text not null,
  created_at timestamp with time zone default now(),
  visibility text default 'public', -- public, private, East River Coop
  parent_id uuid references public.forum_comments(id) on delete cascade,
  upvotes int default 0,
  deleted_at timestamp with time zone
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
  tags text[], -- ['K line, G line, Building 1, Building 2, Building 3']
  package_digits text, -- Last 4 digits
  image_url text,
  is_food boolean default false,
  additional_notes text
);

-- 10. PACKAGE COMMENTS
create table public.package_comments (
  id uuid default gen_random_uuid() primary key,
  package_id uuid references public.package_reports(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now(),
  parent_id uuid references public.package_comments(id) on delete cascade
);

-- 12. EVENT COMMENTS
create table public.event_comments (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- 13. USER ACTIVITY (Unread Badges)
create table public.user_activity (
  user_id uuid references public.profiles(id) primary key,
  last_seen_forum timestamp with time zone default now(),
  last_seen_events timestamp with time zone default now(),
  last_seen_packages timestamp with time zone default now(),
  last_seen_perks timestamp with time zone default now(),
  last_seen_dashboard timestamp with time zone default now()
);

-- 14. POLLS
create table public.polls (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  description text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  closes_at timestamp with time zone not null,
  visibility text default 'public'
);

create table public.poll_options (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_text text not null,
  description text,
  image_url text
);

create table public.poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(poll_id, user_id)
);

create table public.poll_comments (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now(),
  parent_id uuid references public.poll_comments(id) on delete cascade
);

-- 15. FORUM VOTES
create table public.forum_post_votes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

create table public.forum_comment_votes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references public.forum_comments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(comment_id, user_id)
);

-- 16. INDEXES (Performance)
create index if not exists idx_pledges_user_id on public.pledges(user_id);
create index if not exists idx_pledges_campaign_id on public.pledges(campaign_id);
create index if not exists idx_forum_posts_user_id on public.forum_posts(user_id);
create index if not exists idx_forum_comments_post_id on public.forum_comments(post_id);
create index if not exists idx_forum_comments_user_id on public.forum_comments(user_id);
create index if not exists idx_package_reports_user_id on public.package_reports(user_id);
create index if not exists idx_package_comments_package_id on public.package_comments(package_id);
create index if not exists idx_event_comments_event_id on public.event_comments(event_id);
create index if not exists idx_events_created_by on public.events(created_by);
create index if not exists idx_polls_created_by on public.polls(created_by);
create index if not exists idx_poll_options_poll_id on public.poll_options(poll_id);
create index if not exists idx_poll_votes_poll_id on public.poll_votes(poll_id);
create index if not exists idx_poll_votes_user_id on public.poll_votes(user_id);
create index if not exists idx_poll_comments_poll_id on public.poll_comments(poll_id);
create index if not exists idx_poll_comments_user_id on public.poll_comments(user_id);
create index if not exists idx_forum_post_votes_post_id on public.forum_post_votes(post_id);
create index if not exists idx_forum_post_votes_user_id on public.forum_post_votes(user_id);
create index if not exists idx_forum_comment_votes_comment_id on public.forum_comment_votes(comment_id);
create index if not exists idx_forum_comment_votes_user_id on public.forum_comment_votes(user_id);
create index if not exists idx_forum_comments_parent_id on public.forum_comments(parent_id);
create index if not exists idx_package_comments_parent_id on public.package_comments(parent_id);
create index if not exists idx_forum_posts_deleted_at on public.forum_posts(deleted_at);
create index if not exists idx_forum_comments_deleted_at on public.forum_comments(deleted_at);

-- ==========================================
-- 7. MARKETPLACE
-- ==========================================
create table if not exists public.marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    location TEXT, -- Optional
    price DECIMAL(10, 2),
    is_negotiable BOOLEAN DEFAULT false,
    give_away_by TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'given_away')),
    image_url TEXT,
    condition TEXT,
    contact_email TEXT,
    view_count INTEGER DEFAULT 0
);

create table if not exists public.marketplace_likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

create table if not exists public.marketplace_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.marketplace_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    upvotes INTEGER DEFAULT 0,
    is_useful BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE
);

create table if not exists public.marketplace_comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES public.marketplace_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- Marketplace Indexes
create index if not exists idx_marketplace_give_away_by on public.marketplace_items(give_away_by);
create index if not exists idx_marketplace_comments_item_id on public.marketplace_comments(item_id);

-- ==========================================
-- 8. DEV SUPPORT
-- ==========================================
create table if not exists public.dev_support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    upvotes INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0
);

create table if not exists public.dev_support_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.dev_support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

create table if not exists public.dev_support_ticket_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.dev_support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(ticket_id, user_id)
);

create table if not exists public.dev_support_ticket_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.dev_support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(ticket_id, user_id)
);

-- ==========================================
-- 9. SCHEMA UPDATES (Roles etc)
-- ==========================================
-- User Roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'full', 'limited', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'full';

-- Optimization Indexes
create index if not exists idx_events_start_time on public.events(start_time);
create index if not exists idx_polls_closes_at on public.polls(closes_at);
create index if not exists idx_forum_posts_created_at on public.forum_posts(created_at DESC);