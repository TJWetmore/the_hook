-- Add upvotes to dev_support_tickets
ALTER TABLE dev_support_tickets
ADD COLUMN upvotes INTEGER DEFAULT 0;

-- Create dev_support_ticket_votes table
CREATE TABLE dev_support_ticket_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES dev_support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(ticket_id, user_id)
);

ALTER TABLE dev_support_ticket_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket votes are viewable by everyone"
    ON dev_support_ticket_votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can vote on tickets"
    ON dev_support_ticket_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own ticket votes"
    ON dev_support_ticket_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Create dev_support_comments table
CREATE TABLE dev_support_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES dev_support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE dev_support_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket comments are viewable by everyone"
    ON dev_support_comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create ticket comments"
    ON dev_support_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ticket comments"
    ON dev_support_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ticket comments"
    ON dev_support_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Add foreign key to profiles for auto-fetch if needed, but we often use manual fetch for robustness
-- Adding it anyway just in case
ALTER TABLE dev_support_comments
ADD CONSTRAINT dev_support_comments_profiles_fk
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;
