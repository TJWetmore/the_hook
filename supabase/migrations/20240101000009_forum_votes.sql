-- 15. FORUM POST VOTES
create table public.forum_post_votes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

create index idx_forum_post_votes_post_id on public.forum_post_votes(post_id);
create index idx_forum_post_votes_user_id on public.forum_post_votes(user_id);

alter table public.forum_post_votes enable row level security;

create policy "Authenticated users can view votes"
  on public.forum_post_votes for select
  using ( true );

create policy "Verified residents can vote"
  on public.forum_post_votes for insert
  with check ( public.is_verified_resident() AND auth.uid() = user_id );

create policy "Users can remove their own votes"
  on public.forum_post_votes for delete
  using ( auth.uid() = user_id );
