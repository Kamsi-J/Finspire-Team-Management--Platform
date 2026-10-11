-- Allow Telegram-only members who don't have a WhatsApp number
ALTER TABLE team_members
  ALTER COLUMN whatsapp_number DROP NOT NULL;
