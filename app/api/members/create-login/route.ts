import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { email, password, memberId } = await req.json()

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabaseAdmin.from('team_members').update({ email }).eq('id', memberId)

  return NextResponse.json({ ok: true })
}
