import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { memberId, email } = await req.json()

  if (email) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = (users as { id: string; email?: string }[]).find((u) => u.email === email)
    if (authUser) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id)
    }
  }

  const { error } = await supabaseAdmin.from('team_members').delete().eq('id', memberId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
