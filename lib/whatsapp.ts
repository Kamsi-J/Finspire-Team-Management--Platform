// WhatsApp Cloud API client

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

// ---------------------------------------------------------------
// Core send functions
// ---------------------------------------------------------------

export async function sendTextMessage(to: string, text: string) {
  return waRequest('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  })
}

// Send a message with up to 3 quick-reply buttons
export async function sendButtonMessage(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
) {
  return waRequest('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  })
}

// Send a list message (up to 10 items) — used for task selection
export async function sendListMessage(
  to: string,
  body: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
) {
  return waRequest('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonLabel,
        sections,
      },
    },
  })
}

// Send a pre-approved template message (required for bot-initiated messages)
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: object[]
) {
  return waRequest('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  })
}

// ---------------------------------------------------------------
// High-level message builders
// ---------------------------------------------------------------

export function buildWeeklyDigestText(
  memberName: string,
  overdueTasks: { title: string; due_date: string }[],
  dueTasks: { title: string; due_date: string }[]
): string {
  const lines: string[] = [`Good morning ${memberName} 👋`, '']

  if (overdueTasks.length > 0) {
    lines.push(`🔴 *Overdue (${overdueTasks.length})*`)
    overdueTasks.forEach((t) => lines.push(`• ${t.title} — was due ${t.due_date}`))
    lines.push('')
  }

  if (dueTasks.length > 0) {
    lines.push(`📌 *Due this week (${dueTasks.length})*`)
    dueTasks.forEach((t) => lines.push(`• ${t.title} — due ${t.due_date}`))
    lines.push('')
  }

  if (overdueTasks.length === 0 && dueTasks.length === 0) {
    lines.push(`✅ You have no pending tasks this week. Great work!`)
    return lines.join('\n')
  }

  lines.push(`Reply to this message to update your task status.`)
  return lines.join('\n')
}

export function buildOverdueAlertText(memberName: string, taskTitle: string, dueDate: string): string {
  return `⚠️ Hi ${memberName}, a reminder that *"${taskTitle}"* was due on ${dueDate} and is now overdue.\n\nPlease update its status or let your manager know if there's a blocker.`
}

export function buildDueTodayAlertText(memberName: string, taskTitle: string): string {
  return `📅 Hi ${memberName}, just a reminder — *"${taskTitle}"* is due today.\n\nLet us know when it's done!`
}

export function buildMeetingNotificationText(
  title: string,
  scheduledAt: string,
  joinLink?: string,
  description?: string
): string {
  const lines = [
    `📅 *Meeting Scheduled*`,
    ``,
    `*${title}*`,
    `🕐 ${scheduledAt}`,
  ]
  if (description) lines.push(`📝 ${description}`)
  if (joinLink) lines.push(`🔗 Join: ${joinLink}`)
  return lines.join('\n')
}

export function buildPerformanceDigestText(
  recipientName: string,
  weekLabel: string,
  stats: {
    name: string
    completed: number
    overdue: number
    total: number
  }[]
): string {
  const lines = [
    `📊 *Weekly Performance Report*`,
    `_${weekLabel}_`,
    ``,
    `Here's how the team did this week:`,
    ``,
  ]

  stats.forEach((s) => {
    const rate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
    const emoji = rate >= 80 ? '🟢' : rate >= 50 ? '🟡' : '🔴'
    lines.push(`${emoji} *${s.name}*: ${s.completed}/${s.total} tasks done${s.overdue > 0 ? ` · ${s.overdue} overdue` : ''}`)
  })

  return lines.join('\n')
}

// ---------------------------------------------------------------
// Internal
// ---------------------------------------------------------------

async function waRequest(endpoint: string, body: object) {
  const res = await fetch(`${WA_API_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[WhatsApp] API error:', data)
    throw new Error(data?.error?.message ?? 'WhatsApp API error')
  }
  return data
}

// ---------------------------------------------------------------
// Webhook verification helper
// ---------------------------------------------------------------

export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return challenge
  }
  return null
}

// ---------------------------------------------------------------
// Parse inbound webhook payload
// ---------------------------------------------------------------

export interface InboundMessage {
  from: string       // phone number
  messageId: string
  type: 'text' | 'interactive' | 'other'
  text?: string
  buttonReplyId?: string
  buttonReplyTitle?: string
  listReplyId?: string
  listReplyTitle?: string
}

export function parseInboundWebhook(body: any): InboundMessage | null {
  try {
    const entry = body?.entry?.[0]
    const change = entry?.changes?.[0]
    const message = change?.value?.messages?.[0]
    if (!message) return null

    const base = {
      from: message.from,
      messageId: message.id,
    }

    if (message.type === 'text') {
      return { ...base, type: 'text', text: message.text?.body }
    }

    if (message.type === 'interactive') {
      const interactive = message.interactive
      if (interactive?.type === 'button_reply') {
        return {
          ...base,
          type: 'interactive',
          buttonReplyId: interactive.button_reply?.id,
          buttonReplyTitle: interactive.button_reply?.title,
        }
      }
      if (interactive?.type === 'list_reply') {
        return {
          ...base,
          type: 'interactive',
          listReplyId: interactive.list_reply?.id,
          listReplyTitle: interactive.list_reply?.title,
        }
      }
    }

    return { ...base, type: 'other' }
  } catch {
    return null
  }
}
