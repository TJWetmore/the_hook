-- Make location optional
ALTER TABLE marketplace_items ALTER COLUMN location DROP NOT NULL;
