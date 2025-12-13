-- Add foreign key to profiles to enable auto-joins in API
ALTER TABLE marketplace_comments
ADD CONSTRAINT marketplace_comments_profiles_fk
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Also for votes if needed later (good practice)
ALTER TABLE marketplace_comment_votes
ADD CONSTRAINT marketplace_comment_votes_profiles_fk
FOREIGN KEY (user_id) REFERENCES profiles(id)
ON DELETE CASCADE;
