-- Create user_activity table to track last seen times
create table public.user_activity (
  user_id uuid references public.profiles(id) primary key,
  last_seen_forum timestamp with time zone default now(),
  last_seen_events timestamp with time zone default now(),
  last_seen_packages timestamp with time zone default now(),
  last_seen_perks timestamp with time zone default now(),
  last_seen_dashboard timestamp with time zone default now()
);

-- RLS Policies
alter table public.user_activity enable row level security;

create policy "Users can view their own activity"
  on public.user_activity for select
  using ( auth.uid() = user_id );

create policy "Users can update their own activity"
  on public.user_activity for update
  using ( auth.uid() = user_id );

create policy "Users can insert their own activity"
  on public.user_activity for insert
  with check ( auth.uid() = user_id );
