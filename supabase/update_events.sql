-- 1. Add created_by column to events table
alter table public.events 
add column if not exists created_by uuid references public.profiles(id);

-- 2. Add index for performance
create index if not exists idx_events_created_by on public.events(created_by);

-- 3. Add policy for inserting events
-- Only verified residents can create events, and they must claim authorship
create policy "Verified residents can create events"
  on public.events for insert
  with check ( public.is_verified_resident() AND auth.uid() = created_by );

-- 4. Add policy for updating own events
create policy "Users can update own events"
  on public.events for update
  using ( auth.uid() = created_by );
