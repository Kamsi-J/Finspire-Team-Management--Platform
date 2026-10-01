import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assigneeId = searchParams.get('assignee_id')

  let query = supabaseAdmin
    .from('tasks')
    .select('*, team_members!assignee_id(name)')
    .order('due_date', { ascending: true })

  if (status && status !== 'all') query = query.eq('status', status)
  if (assigneeId) query = query.eq('assignee_id', assigneeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await supabaseAdmin.from('tasks').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const { id, ...updates } = await req.json()
  const { error } = await supabaseAdmin.from('tasks').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
