-- Add deleted_at to content tables for Soft Delete support
-- Uses IF NOT EXISTS to be idempotent and ensures all tables are covered

-- 1. Forum (Ensuring they exist)
alter table public.forum_posts add column if not exists deleted_at timestamp with time zone;
alter table public.forum_comments add column if not exists deleted_at timestamp with time zone;
create index if not exists idx_forum_posts_deleted_at on public.forum_posts(deleted_at);
create index if not exists idx_forum_comments_deleted_at on public.forum_comments(deleted_at);

-- 2. Events
alter table public.events add column if not exists deleted_at timestamp with time zone;
alter table public.event_comments add column if not exists deleted_at timestamp with time zone;
create index if not exists idx_events_deleted_at on public.events(deleted_at);
create index if not exists idx_event_comments_deleted_at on public.event_comments(deleted_at);

-- 3. Packages
alter table public.package_reports add column if not exists deleted_at timestamp with time zone;
alter table public.package_comments add column if not exists deleted_at timestamp with time zone;
create index if not exists idx_package_reports_deleted_at on public.package_reports(deleted_at);
create index if not exists idx_package_comments_deleted_at on public.package_comments(deleted_at);

-- 4. Polls
alter table public.polls add column if not exists deleted_at timestamp with time zone;
alter table public.poll_comments add column if not exists deleted_at timestamp with time zone;
create index if not exists idx_polls_deleted_at on public.polls(deleted_at);
create index if not exists idx_poll_comments_deleted_at on public.poll_comments(deleted_at);

-- 5. Marketplace
alter table public.marketplace_items add column if not exists deleted_at timestamp with time zone;
alter table public.marketplace_comments add column if not exists deleted_at timestamp with time zone;
create index if not exists idx_marketplace_items_deleted_at on public.marketplace_items(deleted_at);
create index if not exists idx_marketplace_comments_deleted_at on public.marketplace_comments(deleted_at);

-- 6. Dev Support
alter table public.dev_support_tickets add column if not exists deleted_at timestamp with time zone;
alter table public.dev_support_comments add column if not exists deleted_at timestamp with time zone;
create index if not exists idx_dev_support_tickets_deleted_at on public.dev_support_tickets(deleted_at);
create index if not exists idx_dev_support_comments_deleted_at on public.dev_support_comments(deleted_at);
