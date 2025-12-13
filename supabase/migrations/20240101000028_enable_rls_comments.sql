-- Enable RLS on comments tables
ALTER TABLE public.package_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- Note: Policies for package_comments were likely already created but latent.
-- We verify/ensure a basic select policy exists if one was missing, 
-- though previous logs suggest policies might exist ('package_comments_insert_policy').

-- Let's ensure basic SELECT policies exist just in case they were missed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'package_comments' 
        AND policyname = 'Authenticated users can view package comments'
    ) THEN
        CREATE POLICY "Authenticated users can view package comments"
        ON public.package_comments FOR SELECT
        USING ( true );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_comments' 
        AND policyname = 'Authenticated users can view event comments'
    ) THEN
        CREATE POLICY "Authenticated users can view event comments"
        ON public.event_comments FOR SELECT
        USING ( true );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_comments' 
        AND policyname = 'Authenticated users can create event comments'
    ) THEN
        CREATE POLICY "Authenticated users can create event comments"
        ON public.event_comments FOR INSERT
        WITH CHECK ( auth.uid() = user_id );
    END IF;

END $$;
