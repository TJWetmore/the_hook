-- Update prevent_sensitive_updates to allow admins to bypass checks
-- Also adds protection for 'role' column updates by non-admins

create or replace function public.prevent_sensitive_updates()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
  if (auth.role() = 'authenticated') then
    -- Allow admins to bypass
    if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
      return new;
    end if;

    if (new.is_verified is distinct from old.is_verified) then
      raise exception 'You are not allowed to update is_verified.';
    end if;
    if (new.coop_name is distinct from old.coop_name) then
      raise exception 'You are not allowed to update coop_name.';
    end if;
    if (new.role is distinct from old.role) then
      raise exception 'You are not allowed to update role.';
    end if;
  end if;
  return new;
end;
$$;
