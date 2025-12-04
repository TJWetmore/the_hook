-- Create the storage bucket 'package_reports'
insert into storage.buckets (id, name, public)
values ('package_reports', 'package_reports', true)
on conflict (id) do nothing;

-- Set up access policies for the bucket
-- 1. Allow public read access to all files in the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'package_reports' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'package_reports' and auth.role() = 'authenticated' );
