'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember } from '@/types'

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts)
  return res.json()
}

type TaskRow = Task & { team_members?: { name: string } }
type EditForm = {
  taskId: string; title: string; description: string
  assignee_id: string; priority: 'urgent' | 'normal'; due_date: string
}
type DeleteTarget = { taskId: string; title: string }

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'overdue', 'done'] as const
const FILTER_LABELS: Record<string, string> = {
  all: 'All', pending: 'Pending', in_progress: 'In Progress', overdue: 'Overdue', done: 'Done',
}

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     dot: '#F59E0B', pill: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' } as React.CSSProperties },
  in_progress: { label: 'In Progress', dot: '#3B82F6', pill: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' } as React.CSSProperties },
  done:        { label: 'Done',        dot: '#22C55E', pill: { background: '#F0FDF4', color: '#15803D', border: '1px solid #86EFAC' } as React.CSSProperties },
  overdue:     { label: 'Overdue',     dot: '#EF4444', pill: { background: '#FFF1F2', color: '#BE123C', border: '1px solid #FECACA' } as React.CSSProperties },
}
function statusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '', priority: 'normal' as 'urgent' | 'normal', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [statusMenu, setStatusMenu] = useState<string | null>(null)

  // All tasks unfiltered (for counts)
  const [allTasks, setAllTasks] = useState<TaskRow[]>([])

  useEffect(() => {
    function closeMenus(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (!t.closest('[data-task-menu]')) setOpenMenu(null)
      if (!t.closest('[data-status-menu]')) setStatusMenu(null)
    }
    document.addEventListener('mousedown', closeMenus)
    return () => document.removeEventListener('mousedown', closeMenus)
  }, [])

  useEffect(() => { fetchData() }, [filter, assigneeFilter])

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (assigneeFilter) params.set('assignee_id', assigneeFilter)

    const [tasks, { data: m }, allTasks] = await Promise.all([
      apiFetch(`/api/tasks?${params}`),
      supabase.from('team_members').select('*').eq('is_active', true),
      apiFetch('/api/tasks'),
    ])
    setTasks(Array.isArray(tasks) ? tasks : [])
    setMembers(m ?? [])
    setAllTasks(Array.isArray(allTasks) ? allTasks : [])
    setLoading(false)
  }

  function countFor(status: string) {
    if (status === 'all') return allTasks.length
    return allTasks.filter((t) => t.status === status).length
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, assignee_id: form.assignee_id || null, status: 'pending', source: 'manual' }),
    })
    setForm({ title: '', description: '', assignee_id: '', priority: 'normal', due_date: '' })
    setShowForm(false)
    setSaving(false)
    fetchData()
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm) return
    setEditSaving(true)
    await apiFetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editForm.taskId,
        title: editForm.title,
        description: editForm.description,
        assignee_id: editForm.assignee_id || null,
        priority: editForm.priority,
        due_date: editForm.due_date,
      }),
    })
    setEditForm(null)
    setEditSaving(false)
    fetchData()
  }

  async function updateStatus(id: string, status: string) {
    setStatusMenu(null)
    // optimistic update — color changes instantly
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    await apiFetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, status,
        ...(status === 'done' ? { completed_at: new Date().toISOString() } : { completed_at: null }),
      }),
    })
  }

  async function deleteTask() {
    if (!deleteTarget) return
    setDeleting(true)
    await apiFetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.taskId }),
    })
    setDeleting(false)
    setDeleteTarget(null)
    fetchData()
  }

  function openEdit(task: TaskRow) {
    setOpenMenu(null)
    setEditForm({
      taskId: task.id,
      title: task.title,
      description: task.description ?? '',
      assignee_id: task.assignee_id ?? '',
      priority: task.priority,
      due_date: task.due_date,
    })
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
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{allTasks.length} total tasks</p>
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
        <div className="rounded-xl p-6 mb-6 animate-fade-in" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
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

      {/* Edit modal */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text)' }}>Edit Task</h3>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Title *</label>
                <input required value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Description</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2} className={`${inputClass} resize-none`} style={inputStyle} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Assign to</label>
                  <select value={editForm.assignee_id} onChange={(e) => setEditForm({ ...editForm, assignee_id: e.target.value })}
                    className={inputClass} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as 'urgent' | 'normal' })}
                    className={inputClass} style={inputStyle}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Due date *</label>
                  <input required type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className={inputClass} style={inputStyle} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setEditForm(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: 'var(--brand)' }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Delete task?</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
              "{deleteTarget.title}" will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>
                Cancel
              </button>
              <button onClick={deleteTask} disabled={deleting}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: '#DC2626' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--border)' }}>
          {STATUS_FILTERS.map((f) => {
            const count = countFor(f)
            return (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5"
                style={filter === f
                  ? { background: 'var(--card)', color: 'var(--text)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                  : { color: 'var(--neutral)' }
                }>
                {FILTER_LABELS[f]}
                {count > 0 && (
                  <span className="text-[10px] font-bold px-1 rounded" style={{
                    background: filter === f ? 'var(--brand-light)' : 'rgba(0,0,0,0.06)',
                    color: filter === f ? 'var(--brand)' : 'inherit',
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {members.length > 0 && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg font-medium focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: assigneeFilter ? 'var(--text)' : 'var(--neutral)' }}
          >
            <option value="">All members</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      {/* Task list */}
      <div className="rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading && <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>Loading…</div>}
        {!loading && tasks.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>No tasks found.</div>
        )}
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className="px-5 py-4 flex items-center gap-4"
            style={{
              borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none',
              borderRadius: tasks.length === 1 ? '12px' : i === 0 ? '12px 12px 0 0' : i === tasks.length - 1 ? '0 0 12px 12px' : undefined,
            }}
          >
            {/* Task info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                {task.priority === 'urgent' && (
                  <span className="text-[10px] font-mono-code font-bold tracking-widest" style={{ color: 'var(--brand)' }}>URGENT</span>
                )}
                {task.status === 'overdue' && (
                  <span className="text-[10px] font-mono-code font-bold tracking-widest" style={{ color: '#DC2626' }}>OVERDUE</span>
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

            {/* Status pill */}
            <div className="relative flex-shrink-0" data-status-menu="">
              <button
                onClick={() => task.status !== 'overdue' && setStatusMenu(statusMenu === task.id ? null : task.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
                style={{
                  ...statusConfig(task.status).pill,
                  transition: 'background 0.25s, color 0.25s, border-color 0.25s',
                  cursor: task.status === 'overdue' ? 'default' : 'pointer',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: statusConfig(task.status).dot, transition: 'background 0.25s' }}
                />
                {statusConfig(task.status).label}
                {task.status !== 'overdue' && (
                  <span style={{ opacity: 0.5, fontSize: '9px', marginLeft: '1px' }}>▾</span>
                )}
              </button>
              {statusMenu === task.id && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-38 rounded-xl overflow-hidden z-30"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.14)', minWidth: '140px' }}
                >
                  {(['pending', 'in_progress', 'done'] as const).map((s) => {
                    const cfg = statusConfig(s)
                    const isActive = task.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(task.id, s)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors"
                        style={{
                          background: isActive ? cfg.pill.background : 'transparent',
                          color: isActive ? (cfg.pill as { color: string }).color : 'var(--text)',
                        }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--canvas)' }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                        {cfg.label}
                        {isActive && <span className="ml-auto" style={{ color: cfg.dot }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Kebab menu */}
            <div className="relative flex-shrink-0" data-task-menu="">
              <button
                onClick={() => setOpenMenu(openMenu === task.id ? null : task.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none transition-colors"
                style={{
                  color: 'var(--text-3)',
                  background: openMenu === task.id ? 'var(--canvas)' : 'transparent',
                  border: '1px solid ' + (openMenu === task.id ? 'var(--border)' : 'transparent'),
                }}
              >
                ···
              </button>
              {openMenu === task.id && (
                <div
                  className="absolute right-0 top-full mt-1 w-36 rounded-xl overflow-hidden z-30"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                >
                  <button
                    onClick={() => openEdit(task)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--canvas)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    Edit task
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={() => { setOpenMenu(null); setDeleteTarget({ taskId: task.id, title: task.title }) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: '#DC2626' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF1F2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    Delete task
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

