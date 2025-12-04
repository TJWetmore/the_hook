-- Add parent_id to package_comments for nested threading
alter table public.package_comments
add column parent_id uuid references public.package_comments(id) on delete cascade;

-- Index for performance
create index idx_package_comments_parent_id on public.package_comments(parent_id);
