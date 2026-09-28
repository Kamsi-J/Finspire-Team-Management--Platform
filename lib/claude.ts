import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedTask, TeamMember } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function parseTranscript(
  transcript: string,
  teamMembers: TeamMember[]
): Promise<ExtractedTask[]> {
  const memberList = teamMembers
    .map((m) => `- ${m.name} (${m.role})`)
    .join('\n')

  const prompt = `You are a meeting assistant. Extract all action items and tasks from the following meeting transcript.

Team members:
${memberList}

For each task you find:
1. Identify who it is assigned to (match to a team member by name)
2. Write a clear task title
3. Add a short description if needed
4. Suggest a due date if mentioned (format: YYYY-MM-DD), otherwise leave null
5. Rate priority as "urgent" or "normal"
6. Rate your confidence in the assignment as "high", "medium", or "low"

Respond ONLY with a valid JSON array. No markdown, no explanation. Example format:
[
  {
    "title": "Update brand deck",
    "description": "Revise the investor pitch deck with new Q3 numbers",
    "assignee_name": "Temi",
    "due_date": "2026-09-20",
    "priority": "urgent",
    "confidence": "high"
  }
]

Transcript:
${transcript}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []

  try {
    const tasks: ExtractedTask[] = JSON.parse(content.text)

    // Match assignee names to actual team member IDs
    return tasks.map((task) => {
      const member = teamMembers.find(
        (m) => m.name.toLowerCase().includes(task.assignee_name.toLowerCase()) ||
               task.assignee_name.toLowerCase().includes(m.name.toLowerCase())
      )
      return {
        ...task,
        assignee_id: member?.id,
      }
    })
  } catch {
    console.error('[Claude] Failed to parse extracted tasks')
    return []
  }
}
