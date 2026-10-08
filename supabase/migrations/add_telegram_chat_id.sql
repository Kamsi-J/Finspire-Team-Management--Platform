-- Add Telegram chat ID to team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Pre-populate known chat IDs
-- UPDATE team_members SET telegram_chat_id = '5604614054' WHERE name ILIKE '%Jesutomisin%';
-- UPDATE team_members SET telegram_chat_id = '5003486550' WHERE name ILIKE '%Joy%' OR name ILIKE '%Idala%';
-- UPDATE team_members SET telegram_chat_id = '7582041275' WHERE name ILIKE '%Semilore%';
