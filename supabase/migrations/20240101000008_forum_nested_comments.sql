-- Add parent_id to forum_comments for nested replies
alter table public.forum_comments 
add column parent_id uuid references public.forum_comments(id) on delete cascade;

create index idx_forum_comments_parent_id on public.forum_comments(parent_id);
