export type TaskPriority = 'urgent' | 'normal'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue'
export type TaskSource = 'manual' | 'transcript'
export type TranscriptStatus = 'uploaded' | 'processing' | 'reviewed' | 'applied'

export interface TeamMember {
  id: string
  name: string
  role: string
  whatsapp_number: string
  telegram_chat_id?: string
  email?: string
  is_admin: boolean
  is_active: boolean
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  assignee_id?: string
  assignee?: TeamMember
  priority: TaskPriority
  status: TaskStatus
  source: TaskSource
  due_date: string
  completed_at?: string
  rolled_over_from?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Meeting {
  id: string
  title: string
  description?: string
  scheduled_at: string
  join_link?: string
  notification_sent: boolean
  created_by?: string
  created_at: string
}

export interface Broadcast {
  id: string
  message: string
  sent_at: string
  sent_by?: string
  recipient_count: number
}

export interface Transcript {
  id: string
  meeting_title?: string
  content: string
  status: TranscriptStatus
  ai_extracted_tasks?: ExtractedTask[]
  uploaded_by?: string
  created_at: string
}

export interface ExtractedTask {
  title: string
  description?: string
  assignee_name: string
  assignee_id?: string
  due_date?: string
  priority: TaskPriority
  confidence: 'high' | 'medium' | 'low'
}
