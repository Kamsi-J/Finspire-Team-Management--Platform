// Supabase Edge Function — runs on schedule via pg_cron
// Handles: Monday digests, daily reminders, overdue alerts, Friday performance digest
// Deploy with: supabase functions deploy send-scheduled-messages

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const WA_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!

Deno.serve(async (req) => {
  const { type } = await req.json().catch(() => ({ type: 'daily' }))

  if (type === 'weekly_digest') await sendWeeklyDigests()
  else if (type === 'daily_reminders') await sendDailyReminders()
  else if (type === 'performance_report') await sendPerformanceReport()

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ---------------------------------------------------------------
// Monday: Send each member their tasks for the week
// ---------------------------------------------------------------
async function sendWeeklyDigests() {
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_active', true)
    .eq('is_admin', false)

  if (!members) return

  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  for (const member of members) {
    const { data: overdue } = await supabase
      .from('tasks')
      .select('title, due_date')
      .eq('assignee_id', member.id)
      .eq('status', 'overdue')

    const { data: upcoming } = await supabase
      .from('tasks')
      .select('title, due_date')
      .eq('assignee_id', member.id)
      .in('status', ['pending', 'in_progress'])
      .lte('due_date', weekEnd.toISOString().split('T')[0])
      .gte('due_date', today.toISOString().split('T')[0])

    const overdueList = overdue ?? []
    const upcomingList = upcoming ?? []

    if (overdueList.length === 0 && upcomingList.length === 0) continue

    const text = buildDigestText(member.name, overdueList, upcomingList)
    await sendWaButtonMessage(member.whatsapp_number, text, [
      { id: 'mark_done', title: '✓ Mark a task done' },
      { id: 'view_tasks', title: '📋 View all tasks' },
    ])
  }
}

// ---------------------------------------------------------------
// Daily: Reminders for tasks due today + overdue alerts
// ---------------------------------------------------------------
async function sendDailyReminders() {
  const today = new Date().toISOString().split('T')[0]

  // Tasks due today — send a reminder
  const { data: dueToday } = await supabase
    .from('tasks')
    .select('id, title, assignee_id, team_members(name, whatsapp_number)')
    .eq('due_date', today)
    .in('status', ['pending', 'in_progress'])
    .eq('reminder_sent_day_of', false)

  for (const task of dueToday ?? []) {
    const member = (task as any).team_members
    if (!member) continue
    const text = `📅 Hi ${member.name}, just a reminder — *"${task.title}"* is due *today*.\n\nLet us know once it's done! 💪`
    await sendWaButtonMessage(member.whatsapp_number, text, [
      { id: 'mark_done', title: '✓ Mark as done' },
    ])
    await supabase.from('tasks').update({ reminder_sent_day_of: true }).eq('id', task.id)
  }

  // Overdue tasks — send alert once
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, due_date, assignee_id, team_members(name, whatsapp_number)')
    .eq('status', 'overdue')
    .eq('reminder_sent_overdue', false)

  for (const task of overdueTasks ?? []) {
    const member = (task as any).team_members
    if (!member) continue
    const text = `⚠️ Hi ${member.name}, *"${task.title}"* was due on ${task.due_date} and is now overdue.\n\nPlease update its status or flag a blocker to your manager.`
    await sendWaText(member.whatsapp_number, text)
    await supabase.from('tasks').update({ reminder_sent_overdue: true }).eq('id', task.id)
  }
}

// ---------------------------------------------------------------
// Friday: Weekly performance digest to admins
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
    .select('whatsapp_number, name')
    .eq('is_admin', true)
    .eq('is_active', true)

  if (!members || !admins) return

  const stats = []
  for (const m of members) {
    const { count: completed } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', m.id)
      .eq('status', 'done')
      .gte('completed_at', weekStartStr)

    const { count: overdue } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', m.id)
      .eq('status', 'overdue')

    const { count: total } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assignee_id', m.id)
      .in('status', ['done', 'overdue', 'pending', 'in_progress'])

    stats.push({
      name: m.name,
      completed: completed ?? 0,
      overdue: overdue ?? 0,
      total: total ?? 0,
    })
  }

  const weekLabel = `Week of ${weekStartStr}`
  const lines = [`📊 *Weekly Performance Report*`, `_${weekLabel}_`, ``]

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
// Helpers
// ---------------------------------------------------------------

function buildDigestText(
  name: string,
  overdue: { title: string; due_date: string }[],
  upcoming: { title: string; due_date: string }[]
): string {
  const lines = [`Good morning ${name} 👋`, ``]
  if (overdue.length > 0) {
    lines.push(`🔴 *Overdue (${overdue.length})*`)
    overdue.forEach((t) => lines.push(`• ${t.title} — was due ${t.due_date}`))
    lines.push(``)
  }
  if (upcoming.length > 0) {
    lines.push(`📌 *Due this week (${upcoming.length})*`)
    upcoming.forEach((t) => lines.push(`• ${t.title} — due ${t.due_date}`))
    lines.push(``)
  }
  lines.push(`Reply to update your task status.`)
  return lines.join('\n')
}

async function sendWaText(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
}

async function sendWaButtonMessage(to: string, body: string, buttons: { id: string; title: string }[]) {
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: { buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) },
      },
    }),
  })
}
