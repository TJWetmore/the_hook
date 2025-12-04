-- 16. FORUM COMMENT VOTES

-- Add upvotes column to forum_comments
alter table public.forum_comments 
add column upvotes int default 0;

-- Create votes table
create table public.forum_comment_votes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references public.forum_comments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(comment_id, user_id)
);

create index idx_forum_comment_votes_comment_id on public.forum_comment_votes(comment_id);
create index idx_forum_comment_votes_user_id on public.forum_comment_votes(user_id);

alter table public.forum_comment_votes enable row level security;

create policy "Authenticated users can view comment votes"
  on public.forum_comment_votes for select
  using ( true );

create policy "Verified residents can vote on comments"
  on public.forum_comment_votes for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can remove their own comment votes"
  on public.forum_comment_votes for delete
  using ( auth.uid() = user_id );
