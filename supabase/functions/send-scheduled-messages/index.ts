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
const TG_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!

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

    const platform = member.preferred_platform ?? 'both'

    // WhatsApp template (uses pre-approved template)
    if (member.whatsapp_number && platform !== 'telegram') {
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

    // Telegram plain text
    if (member.telegram_chat_id && platform !== 'whatsapp') {
      const text = buildTaskBoardText(member.name, active, dueSoon, overdue)
      await sendTgMessage(member.telegram_chat_id, text)
    }
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
    .select('whatsapp_number, telegram_chat_id')
    .eq('is_admin', true)
    .eq('is_active', true)

  if (!members || !admins) return

  const stats: { name: string; completed: number; overdue: number; total: number; rate: number }[] = []
  for (const m of members) {
    const [{ count: completed }, { count: overdue }, { count: total }] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', m.id).eq('status', 'done').gte('completed_at', weekStartStr),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', m.id).eq('status', 'overdue'),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assignee_id', m.id).in('status', ['done', 'overdue', 'pending', 'in_progress']),
    ])
    const c = completed ?? 0
    const t = total ?? 0
    stats.push({
      name: m.name,
      completed: c,
      overdue: overdue ?? 0,
      total: t,
      rate: t > 0 ? Math.round((c / t) * 100) : 0,
    })
  }

  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0)
  const totalOutstanding = stats.reduce((sum, s) => sum + (s.total - s.completed), 0)
  const topPerformer = stats
    .filter((s) => s.total > 0)
    .sort((a, b) => b.rate - a.rate)[0]
  const weekLabel = `Week of ${weekStartStr}`
  const breakdownText = stats.map((s) => {
    const emoji = s.rate >= 80 ? '🟢' : s.rate >= 50 ? '🟡' : '🔴'
    const overdueNote = s.overdue > 0 ? ` · ${s.overdue} overdue` : ''
    return `${emoji} ${s.name} — ${s.completed}/${s.total} done${overdueNote}`
  }).join('\n')
  const topPerformerText = topPerformer
    ? `${topPerformer.name} (${topPerformer.rate}% completion rate)`
    : 'No data yet'

  for (const admin of admins) {
    const adminPlatform = (admin as any).preferred_platform ?? 'both'
    if (admin.whatsapp_number && adminPlatform !== 'telegram') {
      await sendWaTemplate(admin.whatsapp_number, 'weekly_digest', [
        { type: 'body', parameters: [
          { type: 'text', text: weekLabel },
          { type: 'text', text: String(totalCompleted) },
          { type: 'text', text: `${totalOutstanding} task${totalOutstanding !== 1 ? 's' : ''}` },
          { type: 'text', text: breakdownText },
          { type: 'text', text: topPerformerText },
        ]},
      ])
    }
    if (admin.telegram_chat_id && adminPlatform !== 'whatsapp') {
      const text = [
        `📊 *Weekly Performance Report*`,
        `_${weekLabel}_`,
        ``,
        `*${totalCompleted}* tasks completed · *${totalOutstanding}* outstanding`,
        ``,
        breakdownText,
        ``,
        `🏆 Top performer: ${topPerformerText}`,
      ].join('\n')
      await sendTgMessage(admin.telegram_chat_id, text)
    }
  }
}

// ---------------------------------------------------------------
// Message builder — 3-section task board for Telegram
// ---------------------------------------------------------------
function buildTaskBoardText(
  memberName: string,
  active: { title: string; due_date: string }[],
  dueSoon: { title: string; due_date: string }[],
  overdue: { title: string; due_date: string }[]
): string {
  const lines: string[] = [`Hi ${memberName}, here's your task board:`, '']

  if (active.length > 0) {
    lines.push(`🟢 *YOUR TASKS*`)
    active.forEach((t) => lines.push(`• ${t.title} — due ${t.due_date}`))
    lines.push('')
  }

  if (dueSoon.length > 0) {
    lines.push(`⏰ *DUE SOON (within 24hrs)*`)
    dueSoon.forEach((t) => lines.push(`• ${t.title} — due ${t.due_date}`))
    lines.push('')
  }

  if (overdue.length > 0) {
    lines.push(`🔴 *OVERDUE*`)
    overdue.forEach((t) => lines.push(`• ${t.title} — was due ${t.due_date}`))
    lines.push('')
  }

  if (active.length === 0 && dueSoon.length === 0 && overdue.length === 0) {
    return `Hi ${memberName}, you have no open tasks right now. ✅ Great work!`
  }

  return lines.join('\n').trimEnd()
}

// ---------------------------------------------------------------
// API helpers
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

async function sendTgMessage(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[Telegram Error]', err)
  }
}
