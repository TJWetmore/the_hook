-- Create event_images bucket
insert into storage.buckets (id, name, public) 
values ('event_images', 'event_images', true) 
on conflict (id) do nothing;

-- Ensure RLS is enabled for storage.objects (usually enabled by default or other policies, but good practice to verify context if needed, though typically handled globally)
-- The policies for this bucket are already defined in supabase_policies.sql
