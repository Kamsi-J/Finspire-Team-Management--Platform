import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTemplateMessage } from '@/lib/whatsapp'

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
    .select('name, whatsapp_number')
    .eq('is_active', true)
    .eq('is_admin', false)

  if (!members) return NextResponse.json({ error: 'No members' }, { status: 500 })

  const formattedDate = new Date(meeting.scheduled_at).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

  // Extract room code from Google Meet URL (last path segment)
  const meetRoomCode = meeting.join_link
    ? meeting.join_link.replace(/^https?:\/\/meet\.google\.com\//, '').replace(/\/$/, '')
    : null

  const results = await Promise.allSettled(
    members.map((m) => {
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
      // Only attach the URL button component if there's a Meet link
      if (meetRoomCode) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: meetRoomCode }],
        })
      }
      return sendTemplateMessage(m.whatsapp_number, 'meeting_notification', 'en', components)
    })
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length

  return NextResponse.json({ sent, total: members.length })
}
