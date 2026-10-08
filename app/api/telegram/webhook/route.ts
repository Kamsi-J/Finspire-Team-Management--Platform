import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()

    if (update.message?.text) {
      const chatId: number = update.message.chat.id
      const text: string = update.message.text.trim()
      if (text.startsWith('/start') || text.startsWith('/mytasks')) {
        await sendTaskList(chatId)
      } else if (text.startsWith('/help')) {
        await tgPost('sendMessage', {
          chat_id: chatId,
          text: 'Commands:\n/mytasks — see your open tasks\n/help — show this message',
        })
      }
    }

    if (update.callback_query) {
      const { id: callbackId, data, message, from } = update.callback_query
      const chatId: number = from.id
      const messageId: number = message?.message_id

      if (data?.startsWith('done:')) {
        const taskId = data.slice(5)
        await handleMarkDone(chatId, messageId, callbackId, taskId)
      }
    }
  } catch (err) {
    console.error('[TG Webhook]', err)
  }

  return NextResponse.json({ ok: true })
}

async function getMember(chatId: number) {
  const { data } = await supabaseAdmin
    .from('team_members')
    .select('id, name')
    .eq('telegram_chat_id', String(chatId))
    .single()
  return data
}

async function buildTaskPayload(memberId: string, memberName: string) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const in24hStr = new Date(now.getTime() + 86_400_000).toISOString().split('T')[0]

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, due_date, status')
    .eq('assignee_id', memberId)
    .in('status', ['pending', 'in_progress', 'overdue'])
    .order('due_date', { ascending: true })

  if (!tasks || tasks.length === 0) {
    return {
      text: `Hi ${memberName}! ✅ No open tasks right now — great work!`,
      reply_markup: { inline_keyboard: [] },
    }
  }

  const overdue = tasks.filter((t) => t.status === 'overdue' || t.due_date < todayStr)
  const dueSoon = tasks.filter((t) => t.status !== 'overdue' && t.due_date >= todayStr && t.due_date <= in24hStr)
  const active = tasks.filter((t) => t.status !== 'overdue' && t.due_date > in24hStr)

  const lines: string[] = [`Hi ${memberName}! Here are your open tasks:\n`]
  const keyboard: { text: string; callback_data: string }[][] = []

  const addSection = (emoji: string, label: string, items: typeof tasks, datePrefix: string) => {
    if (items.length === 0) return
    lines.push(`${emoji} *${label}*`)
    items.forEach((t) => {
      lines.push(`• ${t.title} — ${datePrefix} ${t.due_date}`)
      const btnLabel = t.title.length > 28 ? t.title.slice(0, 27) + '…' : t.title
      keyboard.push([{ text: `✅ Done — ${btnLabel}`, callback_data: `done:${t.id}` }])
    })
    lines.push('')
  }

  addSection('🔴', 'OVERDUE', overdue, 'was due')
  addSection('⏰', 'DUE SOON', dueSoon, 'due')
  addSection('🟢', 'YOUR TASKS', active, 'due')

  return {
    text: lines.join('\n').trimEnd(),
    parse_mode: 'Markdown' as const,
    reply_markup: { inline_keyboard: keyboard },
  }
}

async function sendTaskList(chatId: number) {
  const member = await getMember(chatId)
  if (!member) {
    await tgPost('sendMessage', {
      chat_id: chatId,
      text: "I don't recognise this Telegram account. Ask your admin to link your chat ID.",
    })
    return
  }
  const payload = await buildTaskPayload(member.id, member.name)
  await tgPost('sendMessage', { chat_id: chatId, ...payload })
}

async function handleMarkDone(chatId: number, messageId: number, callbackId: string, taskId: string) {
  const member = await getMember(chatId)
  if (!member) {
    await tgPost('answerCallbackQuery', { callback_query_id: callbackId, text: 'Account not linked.' })
    return
  }

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('assignee_id', member.id)

  if (error) {
    await tgPost('answerCallbackQuery', { callback_query_id: callbackId, text: 'Could not update — try again.' })
    return
  }

  await tgPost('answerCallbackQuery', { callback_query_id: callbackId, text: '✅ Marked as done!', show_alert: false })

  const payload = await buildTaskPayload(member.id, member.name)
  await tgPost('editMessageText', { chat_id: chatId, message_id: messageId, ...payload })
}

async function tgPost(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error(`[TG] ${method} error:`, err)
  }
}
