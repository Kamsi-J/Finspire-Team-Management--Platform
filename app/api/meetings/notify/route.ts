import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTemplateMessage, buildMeetingNotificationText } from '@/lib/whatsapp'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: NextRequest) {
  const { meetingId } = await req.json()

  const { data: meeting } = await supabaseAdmin
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single()

  if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })

  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('name, whatsapp_number, telegram_chat_id')
    .eq('is_active', true)
    .eq('is_admin', false)

  if (!members) return NextResponse.json({ error: 'No members' }, { status: 500 })

  const formattedDate = new Date(meeting.scheduled_at).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

  const meetRoomCode = meeting.join_link
    ? meeting.join_link.replace(/^https?:\/\/meet\.google\.com\//, '').replace(/\/$/, '')
    : null

  const telegramText = buildMeetingNotificationText(
    meeting.title,
    formattedDate,
    meeting.join_link,
    meeting.description
  )

  const sends: Promise<unknown>[] = []
  for (const m of members) {
    const platform = (m as any).preferred_platform ?? 'both'
    if (m.whatsapp_number && platform !== 'telegram') {
      const components: object[] = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: m.name },
            { type: 'text', text: meeting.title },
            { type: 'text', text: formattedDate },
          ],
        },
      ]
      if (meetRoomCode) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: meetRoomCode }],
        })
      }
      sends.push(sendTemplateMessage(m.whatsapp_number, 'meeting_notification', 'en', components))
    }
    if (m.telegram_chat_id && platform !== 'whatsapp') {
      sends.push(sendTelegramMessage(m.telegram_chat_id, `Hi ${m.name}!\n\n${telegramText}`))
    }
  }

  const results = await Promise.allSettled(sends)
  const sent = results.filter((r) => r.status === 'fulfilled').length

  return NextResponse.json({ sent, total: members.length })
}
