-- 1. Add created_by column to events table
alter table public.events 
add column if not exists created_by uuid references public.profiles(id);

-- 2. Add index for performance
create index if not exists idx_events_created_by on public.events(created_by);

-- 3. Create event_comments table
create table if not exists public.event_comments (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_event_comments_event_id on public.event_comments(event_id);

-- 4. Create storage bucket for event images
insert into storage.buckets (id, name, public)
values ('event_images', 'event_images', true)
on conflict (id) do nothing;

-- 5. POLICIES

-- Events
-- Events
-- Allow insert only for admin/full roles (not limited)
DROP POLICY IF EXISTS "Verified residents can create events" ON public.events;
CREATE POLICY "Verified residents can create events"
  ON public.events FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'full')
    )
  );

create policy "Users can update own events"
  on public.events for update
  using ( auth.uid() = created_by );

-- Event Images
create policy "Event images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'event_images' );

create policy "Authenticated users can upload event images"
  on storage.objects for insert
  with check ( bucket_id = 'event_images' and auth.role() = 'authenticated' );
