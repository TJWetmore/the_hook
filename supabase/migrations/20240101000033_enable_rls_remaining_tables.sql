-- Enable RLS on tables where it was missing
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.poll_comments enable row level security;
alter table public.forum_post_votes enable row level security;
alter table public.forum_comment_votes enable row level security;
alter table public.user_activity enable row level security;

-- Add RLS policies for user_activity (policies for others already existed but RLS wasn't enabled)
create policy "Users can view own activity"
    on public.user_activity for select
    using ( auth.uid() = user_id );

create policy "Users can update own activity"
    on public.user_activity for update
    using ( auth.uid() = user_id );

create policy "Users can insert own activity"
  on public.user_activity for insert
  with check ( auth.uid() = user_id );
