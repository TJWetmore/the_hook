-- Add new columns to package_reports table
alter table public.package_reports
add column if not exists package_digits text,
add column if not exists image_url text,
add column if not exists is_food boolean default false;
