import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTextMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('whatsapp_number')
    .eq('is_active', true)
    .eq('is_admin', false)

  if (!members) return NextResponse.json({ error: 'No members' }, { status: 500 })

  const results = await Promise.allSettled(
    members.map((m) => sendTextMessage(m.whatsapp_number, message))
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length

  await supabaseAdmin.from('broadcasts').insert({
    message,
    recipient_count: sent,
  })

  return NextResponse.json({ sent, total: members.length })
}
