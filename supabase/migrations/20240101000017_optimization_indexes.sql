-- Indexes for optimized fetching based on date/status filters

-- Events: filter by start_time > now()
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);

-- Polls: filter by closes_at > now()
CREATE INDEX IF NOT EXISTS idx_polls_closes_at ON polls (closes_at);

-- Marketplace: filter by give_away_by (expiring soon/future)
CREATE INDEX IF NOT EXISTS idx_marketplace_give_away_by ON marketplace_items (give_away_by);

-- Forum Posts: generic sort by created_at, useful for limit queries
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts (created_at DESC);
