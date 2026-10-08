import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTextMessage } from '@/lib/whatsapp'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('whatsapp_number, telegram_chat_id')
    .eq('is_active', true)
    .eq('is_admin', false)

  if (!members) return NextResponse.json({ error: 'No members' }, { status: 500 })

  const sends: Promise<unknown>[] = []
  for (const m of members) {
    const platform = (m as any).preferred_platform ?? 'whatsapp'
    if (platform === 'whatsapp' && m.whatsapp_number) sends.push(sendTextMessage(m.whatsapp_number, message))
    if (platform === 'telegram' && (m as any).telegram_chat_id) sends.push(sendTelegramMessage((m as any).telegram_chat_id, message))
  }

  const results = await Promise.allSettled(sends)
  const sent = results.filter((r) => r.status === 'fulfilled').length

  await supabaseAdmin.from('broadcasts').insert({
    message,
    recipient_count: members.length,
  })

  return NextResponse.json({ sent, total: members.length })
}
