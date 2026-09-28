// Supabase Edge Function — runs on schedule via pg_cron
// Types: daily_task_board | weekly_digest | performance_report
// Deploy with: supabase functions deploy send-scheduled-messages

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const WA_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!

Deno.serve(async (req) => {
  const { type } = await req.json().catch(() => ({ type: 'daily_task_board' }))

  if (type === 'daily_task_board') await sendDailyTaskBoards()
  else if (type === 'performance_report') await sendPerformanceReport()

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ---------------------------------------------------------------
// Daily (9am): Send each member their 3-section task board
// Active tasks | Due soon (24hrs) | Overdue
// ---------------------------------------------------------------
async function sendDailyTaskBoards() {
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_active', true)
    .eq('is_admin', false)

  if (!members) return

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in24hStr = in24h.toISOString().split('T')[0]

  for (const member of members) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, due_date, status')
      .eq('assignee_id', member.id)
      .in('status', ['pending', 'in_progress', 'overdue'])
      .order('due_date', { ascending: true })

    if (!tasks || tasks.length === 0) continue

    const overdue = tasks.filter((t) => t.status === 'overdue' || t.due_date < todayStr)
    const dueSoon = tasks.filter(
      (t) => t.status !== 'overdue' && t.due_date >= todayStr && t.due_date <= in24hStr
    )
    const active = tasks.filter(
      (t) => t.status !== 'overdue' && t.due_date > in24hStr
    )

    const activeText = active.length > 0
      ? active.map((t) => `• ${t.title} — due ${t.due_date}`).join('\n')
      : '• —'
    const dueSoonText = dueSoon.length > 0
      ? dueSoon.map((t) => `• ${t.title} — due ${t.due_date}`).join('\n')
      : '• —'
    const overdueText = overdue.length > 0
      ? overdue.map((t) => `• ${t.title} — was due ${t.due_date}`).join('\n')
      : '• —'

    await sendWaTemplate(member.whatsapp_number, 'task_update', [
      { type: 'body', parameters: [
        { type: 'text', text: member.name },
        { type: 'text', text: activeText },
        { type: 'text', text: dueSoonText },
        { type: 'text', text: overdueText },
      ]},
    ])
  }
}

// ---------------------------------------------------------------
// Friday (5pm): Weekly performance digest to admins (Kamsi) only
// ---------------------------------------------------------------
async function sendPerformanceReport() {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { data: members } = await supabase
    .from('team_members')
    .select('id, name')
    .eq('is_active', true)
    .eq('is_admin', false)

  const { data: admins } = await supabase
    .from('team_members')
    .select('whatsapp_number')
    .eq('is_admin', true)
    .eq('is_active', true)

  if (!members || !admins) return

  const stats = []
  for (const m of members) {
    const [{ count: completed }, { count: overdue }, { count: total }] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', m.id).eq('status', 'done').gte('completed_at', weekStartStr),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', m.id).eq('status', 'overdue'),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', m.id).in('status', ['done', 'overdue', 'pending', 'in_progress']),
    ])
    stats.push({ name: m.name, completed: completed ?? 0, overdue: overdue ?? 0, total: total ?? 0 })
  }

  const weekLabel = `Week of ${weekStartStr}`
  const lines = [`📊 *Finspire Weekly Report*`, `_${weekLabel}_`, ``]
  stats.forEach((s) => {
    const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
    const emoji = rate >= 80 ? '🟢' : rate >= 50 ? '🟡' : '🔴'
    lines.push(`${emoji} *${s.name}*: ${s.completed}/${s.total} done${s.overdue > 0 ? ` · ${s.overdue} overdue` : ''}`)
  })

  const report = lines.join('\n')
  for (const admin of admins) {
    await sendWaText(admin.whatsapp_number, report)
  }
}

// ---------------------------------------------------------------
// Message builder — 3-section task board
// ---------------------------------------------------------------
function buildTaskBoardText(
  memberName: string,
  active: { title: string; due_date: string }[],
  dueSoon: { title: string; due_date: string }[],
  overdue: { title: string; due_date: string }[]
): string {
  const lines: string[] = []

  if (active.length > 0) {
    lines.push(`🟢 YOUR TASKS`)
    active.forEach((t) => lines.push(`• ${t.title} — due ${t.due_date}`))
    lines.push('')
  }

  if (dueSoon.length > 0) {
    lines.push(`⏰ DUE SOON (within 24hrs)`)
    dueSoon.forEach((t) => lines.push(`• ${t.title} — due ${t.due_date}`))
    lines.push('')
  }

  if (overdue.length > 0) {
    lines.push(`🔴 OVERDUE`)
    overdue.forEach((t) => lines.push(`• ${t.title} — was due ${t.due_date}`))
    lines.push('')
  }

  lines.push(`Tap below to manage your tasks.`)
  return lines.join('\n')
}

// ---------------------------------------------------------------
// WhatsApp API helpers
// ---------------------------------------------------------------

async function sendWaTemplate(to: string, templateName: string, components: object[]) {
  await waPost({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components,
    },
  })
}

async function sendWaText(to: string, text: string) {
  await waPost({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } })
}

async function waPost(body: object) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[WA Error]', err)
  }
}
