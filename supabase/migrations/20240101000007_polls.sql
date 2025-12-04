-- 1. POLLS TABLE
create table public.polls (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  description text,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  closes_at timestamp with time zone not null,
  visibility text default 'public' -- public, private, East River Coop
);

-- 2. POLL OPTIONS TABLE
create table public.poll_options (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_text text not null,
  description text,
  image_url text
);

-- 3. POLL VOTES TABLE
create table public.poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(poll_id, user_id) -- One vote per user per poll
);

-- 4. INDEXES
create index idx_polls_created_by on public.polls(created_by);
create index idx_poll_options_poll_id on public.poll_options(poll_id);
create index idx_poll_votes_poll_id on public.poll_votes(poll_id);
create index idx_poll_votes_user_id on public.poll_votes(user_id);

-- 5. RLS POLICIES
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

-- Polls Visibility
create policy "Authenticated users can view scoped polls"
  on public.polls for select
  using ( public.can_view_scoped_content(visibility) );

create policy "Verified residents can create polls"
  on public.polls for insert
  with check ( public.is_verified_resident() AND auth.uid() = created_by );

-- Poll Options Visibility
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

-- Votes Visibility
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

-- 6. POLL COMMENTS TABLE
create table public.poll_comments (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.polls(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now(),
  parent_id uuid references public.poll_comments(id) on delete cascade
);

create index idx_poll_comments_poll_id on public.poll_comments(poll_id);
create index idx_poll_comments_user_id on public.poll_comments(user_id);

alter table public.poll_comments enable row level security;

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
