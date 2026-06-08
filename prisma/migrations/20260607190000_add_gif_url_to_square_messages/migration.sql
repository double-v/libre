-- Add optional gif_url column to square_messages
-- Used to render a GIF (selected via the Tenor picker) in the feed.
-- NULL means regular text message.

ALTER TABLE "square_messages"
  ADD COLUMN IF NOT EXISTS "gif_url" TEXT;
