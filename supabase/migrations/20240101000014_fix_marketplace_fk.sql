-- Drop the existing foreign key to auth.users
ALTER TABLE marketplace_items DROP CONSTRAINT IF EXISTS marketplace_items_user_id_fkey;

-- Add new foreign key to public.profiles
ALTER TABLE marketplace_items
    ADD CONSTRAINT marketplace_items_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
