-- Create dev_support_tickets table
CREATE TABLE dev_support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('bug', 'feature')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE dev_support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tickets are viewable by everyone"
    ON dev_support_tickets FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create tickets"
    ON dev_support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
    ON dev_support_tickets FOR UPDATE
    USING (auth.uid() = user_id);
