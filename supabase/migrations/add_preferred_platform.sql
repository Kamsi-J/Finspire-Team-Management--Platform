ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS preferred_platform TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (preferred_platform IN ('whatsapp', 'telegram'));
