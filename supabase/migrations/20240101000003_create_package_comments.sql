-- Create package_comments table
create table public.package_comments (
  id uuid default gen_random_uuid() primary key,
  package_id uuid references public.package_reports(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Index for performance
create index idx_package_comments_package_id on public.package_comments(package_id);
