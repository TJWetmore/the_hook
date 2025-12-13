-- RPC for incrementing view count
CREATE OR REPLACE FUNCTION increment_marketplace_view(item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE marketplace_items
  SET view_count = view_count + 1
  WHERE id = item_id;
END;
$$;
