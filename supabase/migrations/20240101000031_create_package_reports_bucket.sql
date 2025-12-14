-- Create package_reports bucket
insert into storage.buckets (id, name, public) 
values ('package_reports', 'package_reports', true) 
on conflict (id) do nothing;

-- Ensure RLS is enabled for storage.objects (usually enabled by default or other policies)
-- The policies for this bucket are expected to be in supabase_policies.sql but we should ensure basic access
