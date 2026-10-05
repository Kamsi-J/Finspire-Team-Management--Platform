import type { ExtractedTask, TeamMember } from '@/types'

export async function parseTranscript(
  transcript: string,
  teamMembers: TeamMember[]
): Promise<ExtractedTask[]> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    console.error('[AI Parser] Missing GLM_API_KEY')
    return []
  }

  const memberList = teamMembers
    .map((m) => `- ${m.name} (${m.role})`)
    .join('\n')

  const systemPrompt = `You are the Lead Operations AI for Finspire Team OS. Your role is to read meeting transcripts, understand team operations, extract actionable tasks, and map them to the appropriate team lead or member.

=== FINSPIRE COMPANY OVERVIEW & STRATEGY ===
Finspire is a premium financial intelligence, stock market research, and investment education company. We produce deep equity research reports, valuation breakdowns, investment masterclasses, and manage an active investor community to help people build generational wealth.

=== OPERATIONAL MODEL & WHATSAPP BOT CONSTRAINTS ===
- Because Finspire operates on a non-verified Meta WhatsApp API account, WhatsApp recipient slots and automated template messages are strictly limited.
- Consequently, only KEY TEAM LEADS and CRITICAL OPERATIONS ROLES are registered in Finspire Team OS (e.g., Kamsi - CEO, Godsfavour - Manager/Operations, Joy Idala - Community Manager Team Lead, Video Editor Team Lead, etc.).
- TEAM LEAD DELEGATION RULE: Junior team members or sub-teams are NOT directly registered on the app. When a task in the transcript is mentioned for a junior member (e.g., community moderators, graphic designers, junior editors), assign that task to their respective TEAM LEAD (e.g., all community tasks -> Joy Idala; all video editing tasks -> Video Editor Team Lead / Kamsi).
- VIDEO EDITORS FOCUS: Video editing and content production tasks need constant tracking and tight follow-ups. Ensure video/content action items are extracted with precise due dates and flagged clearly.

=== CURRENT ACTIVE TEAM ROSTER ===
${memberList}

=== TASK EXTRACTION RULES ===
1. **Assignee Mapping**: Match tasks to an active team lead by name or role responsibility. If a sub-team member is named, map to their Team Lead.
2. **Action-Oriented Title**: Write a crisp, unambiguous title (e.g., "Review Q3 UACN Valuation Report", "Follow up with Video Editor on reel #4").
3. **Description**: Include key context from the discussion.
4. **Due Date**: Infer or calculate dates mentioned in discussion (e.g., "by Friday", "tomorrow", "next Monday") and format as YYYY-MM-DD. If unspecified, leave null.
5. **Priority**: Set to "urgent" if explicitly flagged as priority/ASAP/high importance, otherwise "normal".
6. **Confidence**: Set to "high" (explicit assignment), "medium" (probable assignment), or "low" (implied task).

=== REQUIRED RESPONSE FORMAT ===
Respond ONLY with a raw JSON array containing task objects. No markdown wrappers, no commentary.

JSON Schema:
[
  {
    "title": "Task title",
    "description": "Concise context",
    "assignee_name": "Matched Lead Name",
    "due_date": "YYYY-MM-DD or null",
    "priority": "normal" | "urgent",
    "confidence": "high" | "medium" | "low"
  }
]`

  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract action items from this transcript:\n\n${transcript}` },
        ],
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[GLM 4.5 Flash Error]', res.status, errText)
      return []
    }

    const data = await res.json()
    const contentText = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Clean JSON response (strip markdown wrappers if present)
    const jsonString = contentText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const rawTasks: ExtractedTask[] = JSON.parse(jsonString)

    // Map assignee names to actual team_member IDs
    return rawTasks.map((task) => {
      const matchedMember = teamMembers.find(
        (m) =>
          m.name.toLowerCase().includes(task.assignee_name.toLowerCase()) ||
          task.assignee_name.toLowerCase().includes(m.name.toLowerCase())
      )
      return {
        ...task,
        assignee_id: matchedMember?.id,
        assignee_name: matchedMember?.name ?? task.assignee_name,
      }
    })
  } catch (err) {
    console.error('[AI Parser] Error parsing transcript:', err)
    return []
  }
}
