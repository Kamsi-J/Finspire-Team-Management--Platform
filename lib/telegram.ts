// Telegram Bot API client

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' | 'MarkdownV2' = 'Markdown'
) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  })

  const data = await res.json()
  if (!data.ok) {
    console.error('[Telegram] API error:', data)
    throw new Error(data.description ?? 'Telegram API error')
  }
  return data
}
