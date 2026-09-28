import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, parseInboundWebhook, sendTextMessage, sendListMessage } from '@/lib/whatsapp'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET — webhook verification (Meta calls this once when you set up the webhook)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode') ?? ''
  const token = searchParams.get('hub.verify_token') ?? ''
  const challenge = searchParams.get('hub.challenge') ?? ''

  const result = verifyWebhook(mode, token, challenge)
  if (result) return new NextResponse(result, { status: 200 })
  return new NextResponse('Forbidden', { status: 403 })
}

// POST — inbound messages from team members
export async function POST(req: NextRequest) {
  const body = await req.json()
  const msg = parseInboundWebhook(body)

  if (!msg) return NextResponse.json({ status: 'ok' })

  // Log inbound message
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('whatsapp_number', msg.from)
    .single()

  if (member) {
    await supabaseAdmin.from('whatsapp_messages').insert({
      member_id: member.id,
      direction: 'inbound',
      message_type: msg.type,
      content: msg.text ?? msg.buttonReplyTitle ?? msg.listReplyTitle ?? '',
      wa_message_id: msg.messageId,
    })
  }

  // Handle button/list replies
  if (msg.type === 'interactive') {
    const btnId = msg.buttonReplyId?.toLowerCase() ?? ''
    const btnTitle = msg.buttonReplyTitle?.toLowerCase() ?? ''

    // "mark_done" button (interactive or template)
    if (btnId === 'mark_done' || btnTitle.includes('mark') || btnTitle.includes('done')) {
      await handleMarkDoneRequest(msg.from, member?.id)
      return NextResponse.json({ status: 'ok' })
    }

    // "view_tasks" / "view & update tasks" button (interactive or template)
    if (btnId === 'view_tasks' || btnTitle.includes('view') || btnTitle.includes('task')) {
      await handleViewTasks(msg.from, member?.id)
      return NextResponse.json({ status: 'ok' })
    }

    // Task selection from list — mark it done
    if (msg.listReplyId?.startsWith('task_')) {
      const taskId = msg.listReplyId.replace('task_', '')
      await handleTaskCompletion(msg.from, taskId, member?.id)
      return NextResponse.json({ status: 'ok' })
    }
  }

  // Handle text "help"
  if (msg.type === 'text' && msg.text?.toLowerCase() === 'help') {
    await sendTextMessage(
      msg.from,
      `Hi! Here's what you can do:\n\n• *Mark Done* — mark a task as complete\n• *View Tasks* — see all your open tasks\n• *Help* — show this message\n\nFor anything else, contact your manager directly.`
    )
  }

  return NextResponse.json({ status: 'ok' })
}

async function handleMarkDoneRequest(phone: string, memberId?: string) {
  if (!memberId) {
    await sendTextMessage(phone, "Sorry, I couldn't find your profile. Contact your manager.")
    return
  }

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, due_date')
    .eq('assignee_id', memberId)
    .in('status', ['pending', 'in_progress', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(10)

  if (!tasks || tasks.length === 0) {
    await sendTextMessage(phone, "✅ You have no open tasks right now. Great work!")
    return
  }

  await sendListMessage(
    phone,
    'Which task would you like to mark as done?',
    'Select task',
    [{
      title: 'Your open tasks',
      rows: tasks.map((t) => ({
        id: `task_${t.id}`,
        title: t.title.slice(0, 24),
        description: `Due: ${t.due_date}`,
      })),
    }]
  )
}

async function handleTaskCompletion(phone: string, taskId: string, memberId?: string) {
  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('assignee_id', memberId)  // ensure they can only complete their own tasks
    .select('title')
    .single()

  if (error || !task) {
    await sendTextMessage(phone, "Couldn't update that task. Please try again or contact your manager.")
    return
  }

  await sendTextMessage(phone, `✅ *"${task.title}"* marked as done. Keep it up! 🔥`)
}

async function handleViewTasks(phone: string, memberId?: string) {
  if (!memberId) return

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('title, due_date, status, priority')
    .eq('assignee_id', memberId)
    .in('status', ['pending', 'in_progress', 'overdue'])
    .order('due_date', { ascending: true })

  if (!tasks || tasks.length === 0) {
    await sendTextMessage(phone, "✅ You have no open tasks right now!")
    return
  }

  const lines = ['📋 *Your open tasks:*', '']
  tasks.forEach((t) => {
    const urgentFlag = t.priority === 'urgent' ? ' 🔴' : ''
    const overdueFlag = t.status === 'overdue' ? ' ⚠️ OVERDUE' : ''
    lines.push(`• ${t.title}${urgentFlag}${overdueFlag}`)
    lines.push(`  Due: ${t.due_date}`)
  })

  await sendTextMessage(phone, lines.join('\n'))
}
