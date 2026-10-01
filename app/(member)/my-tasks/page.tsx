'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember } from '@/types'

const FILTERS = ['active', 'in_progress', 'done'] as const
const FILTER_LABELS: Record<string, string> = {
  active: 'Pending', in_progress: 'In Progress', done: 'Done',
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [member, setMember] = useState<TeamMember | null>(null)
  const [filter, setFilter] = useState('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])
  useEffect(() => { if (member) fetchTasks() }, [filter, member])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: m } = await supabase
      .from('team_members')
      .select('*')
      .eq('email', user.email)
      .single()
    setMember(m)
  }

  async function fetchTasks() {
    if (!member) return
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', member.id)
      .order('due_date', { ascending: true })

    if (filter === 'active') query = query.in('status', ['pending', 'overdue'])
    else query = query.eq('status', filter)

    const { data } = await query
    setTasks(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('tasks').update({
      status,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    fetchTasks()
  }

  const firstName = member?.name.split(' ')[0] ?? ''
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>My Workspace</p>
        <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {member ? `Hi ${firstName} 👋` : 'My Tasks'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {today}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: 'var(--border)' }}>
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
            style={filter === f
              ? { background: 'var(--card)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
              : { color: 'var(--neutral)' }
            }>
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {loading && (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div>
        )}
        {!loading && tasks.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>You're all caught up!</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>No tasks here.</p>
          </div>
        )}
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="px-5 py-4 flex items-start justify-between gap-4"
            style={{ borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {task.priority === 'urgent' && (
                  <span className="text-[10px] font-mono-code font-bold tracking-widest" style={{ color: 'var(--brand)' }}>URGENT</span>
                )}
                {task.status === 'overdue' && (
                  <span className="text-[10px] font-mono-code font-bold tracking-widest" style={{ color: '#DC2626' }}>OVERDUE</span>
                )}
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{task.title}</p>
              </div>
              {task.description && (
                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{task.description}</p>
              )}
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Due {task.due_date}</p>
            </div>
            <select
              value={task.status === 'overdue' ? 'pending' : task.status}
              onChange={(e) => updateStatus(task.id, e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-semibold focus:outline-none cursor-pointer flex-shrink-0"
              style={statusStyle(task.status)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done ✓</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

function statusStyle(status: string): React.CSSProperties {
  const s: Record<string, React.CSSProperties> = {
    pending:     { background: '#F4F4F5', color: '#71717A', border: '1px solid #E4E4E7' },
    in_progress: { background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' },
    done:        { background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' },
    overdue:     { background: '#FFF1F2', color: '#701428', border: '1px solid #FECDD3' },
  }
  return s[status] ?? s.pending
}
