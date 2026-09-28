import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTextMessage, buildMeetingNotificationText } from '@/lib/whatsapp'

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
    .select('whatsapp_number')
    .eq('is_active', true)

  if (!members) return NextResponse.json({ error: 'No members' }, { status: 500 })

  const formattedDate = new Date(meeting.scheduled_at).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })

  const text = buildMeetingNotificationText(
    meeting.title,
    formattedDate,
    meeting.join_link,
    meeting.description
  )

  const results = await Promise.allSettled(
    members.map((m) => sendTextMessage(m.whatsapp_number, text))
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length

  return NextResponse.json({ sent, total: members.length })
}
