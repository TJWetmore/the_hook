-- Add contact_email and view_count to marketplace_items
ALTER TABLE marketplace_items 
ADD COLUMN contact_email TEXT,
ADD COLUMN view_count INTEGER DEFAULT 0;

-- Create marketplace_likes table
CREATE TABLE marketplace_likes (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, item_id)
);

-- Enable RLS for likes
ALTER TABLE marketplace_likes ENABLE ROW LEVEL SECURITY;

-- Policies for likes
CREATE POLICY "Likes are viewable by everyone"
    ON marketplace_likes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can toggle likes"
    ON marketplace_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
    ON marketplace_likes FOR DELETE
    USING (auth.uid() = user_id);
