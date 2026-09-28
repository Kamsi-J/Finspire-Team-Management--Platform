'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember } from '@/types'

const FILTERS = ['all', 'pending', 'in_progress', 'overdue', 'done']
const FILTER_LABELS: Record<string, string> = {
  all: 'All', pending: 'Pending', in_progress: 'In Progress', overdue: 'Overdue', done: 'Done',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<(Task & { team_members?: { name: string } })[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '', description: '', assignee_id: '',
    priority: 'normal' as 'urgent' | 'normal',
    due_date: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [filter])

  async function fetchData() {
    setLoading(true)
    let query = supabase.from('tasks').select('*, team_members(name)').order('due_date', { ascending: true })
    if (filter !== 'all') query = query.eq('status', filter)
    const [{ data: t }, { data: m }] = await Promise.all([
      query,
      supabase.from('team_members').select('*').eq('is_active', true).eq('is_admin', false),
    ])
    setTasks(t ?? [])
    setMembers(m ?? [])
    setLoading(false)
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('tasks').insert({ ...form, assignee_id: form.assignee_id || null, status: 'pending', source: 'manual' })
    setForm({ title: '', description: '', assignee_id: '', priority: 'normal', due_date: '' })
    setShowForm(false)
    setSaving(false)
    fetchData()
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('tasks').update({
      status,
      ...(status === 'done' ? { completed_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    fetchData()
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
  const inputStyle = { border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>Management</p>
          <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Tasks</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)' }}
        >
          + New Task
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="rounded-xl p-6 mb-6 animate-fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <h3 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text)' }}>Create Task</h3>
          <form onSubmit={createTask}>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass} style={inputStyle} placeholder="e.g. Update investor pitch deck" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className={`${inputClass} resize-none`} style={inputStyle} placeholder="Optional details…" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Assign to</label>
                  <select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                    className={inputClass} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as 'urgent' | 'normal' })}
                    className={inputClass} style={inputStyle}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Due date *</label>
                  <input required type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className={inputClass} style={inputStyle} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:opacity-70" style={{ color: 'var(--text-2)' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand)' }}>
                {saving ? 'Saving…' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

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
        {loading && <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div>}
        {!loading && tasks.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>No tasks found.</div>
        )}
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="px-5 py-4 flex items-center justify-between gap-4"
            style={{ borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                {task.priority === 'urgent' && (
                  <span className="text-[10px] font-mono-code font-bold tracking-widest" style={{ color: 'var(--brand)' }}>URGENT</span>
                )}
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
              </div>
              {task.description && (
                <p className="text-xs truncate mb-0.5" style={{ color: 'var(--text-3)' }}>{task.description}</p>
              )}
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {(task as any).team_members?.name ?? 'Unassigned'} · Due {task.due_date}
              </p>
            </div>
            <select
              value={task.status}
              onChange={(e) => updateStatus(task.id, e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-semibold focus:outline-none cursor-pointer"
              style={statusStyle(task.status)}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="overdue">Overdue</option>
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
