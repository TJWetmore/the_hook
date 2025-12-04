-- 17. SOFT DELETE
alter table public.forum_posts add column deleted_at timestamp with time zone;
alter table public.forum_comments add column deleted_at timestamp with time zone;

create index idx_forum_posts_deleted_at on public.forum_posts(deleted_at);
create index idx_forum_comments_deleted_at on public.forum_comments(deleted_at);
