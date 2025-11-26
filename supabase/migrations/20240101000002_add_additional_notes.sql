-- Add additional_notes column to package_reports table
alter table public.package_reports
add column if not exists additional_notes text;
