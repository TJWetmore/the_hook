-- Create event_comments table
create table public.event_comments (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Index for performance
create index idx_event_comments_event_id on public.event_comments(event_id);

-- Create storage bucket for event images
insert into storage.buckets (id, name, public)
values ('event_images', 'event_images', true);

-- Storage Policies
create policy "Event images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'event_images' );

create policy "Authenticated users can upload event images"
  on storage.objects for insert
  with check ( bucket_id = 'event_images' and auth.role() = 'authenticated' );
