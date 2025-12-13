-- Create marketplace_items table
CREATE TABLE marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    price DECIMAL(10, 2),
    is_negotiable BOOLEAN DEFAULT false,
    give_away_by TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'given_away')),
    image_url TEXT,
    condition TEXT -- optional: new, like new, used, etc.
);

-- Enable RLS
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;

-- Policies for marketplace_items
CREATE POLICY "Marketplace items are viewable by everyone"
    ON marketplace_items FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own marketplace items"
    ON marketplace_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marketplace items"
    ON marketplace_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marketplace items"
    ON marketplace_items FOR DELETE
    USING (auth.uid() = user_id);


-- Create marketplace_images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace_images', 'marketplace_images', true);

-- Storage policies
CREATE POLICY "Marketplace images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'marketplace_images');

CREATE POLICY "Authenticated users can upload marketplace images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'marketplace_images' AND auth.role() = 'authenticated');
