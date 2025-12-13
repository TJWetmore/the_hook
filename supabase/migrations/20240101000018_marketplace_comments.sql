-- Create marketplace_comments table
CREATE TABLE marketplace_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id UUID REFERENCES marketplace_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES marketplace_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    upvotes INTEGER DEFAULT 0,
    is_useful BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE marketplace_comments ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_comments
CREATE POLICY "Comments are viewable by everyone"
    ON marketplace_comments FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create comments"
    ON marketplace_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
    ON marketplace_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
    ON marketplace_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Create marketplace_comment_votes table for helpfulness
CREATE TABLE marketplace_comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES marketplace_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

ALTER TABLE marketplace_comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comment votes are viewable by everyone"
    ON marketplace_comment_votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can vote on comments"
    ON marketplace_comment_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes"
    ON marketplace_comment_votes FOR DELETE
    USING (auth.uid() = user_id);
