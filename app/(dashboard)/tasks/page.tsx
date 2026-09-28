'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember } from '@/types'

export default function TasksPage() {
  const [tasks, setTasks] = useState<(Task & { team_members?: { name: string } })[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // New task form state
  const [form, setForm] = useState({
    title: '', description: '', assignee_id: '',
    priority: 'normal' as 'urgent' | 'normal',
    due_date: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [filter])

  async function fetchData() {
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*, team_members(name)')
      .order('due_date', { ascending: true })

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
    await supabase.from('tasks').insert({
      ...form,
      assignee_id: form.assignee_id || null,
      status: 'pending',
      source: 'manual',
    })
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

  const filters = ['all', 'pending', 'in_progress', 'overdue', 'done']

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-stone-900">Tasks</h1>
          <p className="text-stone-500 text-sm mt-1">{tasks.length} tasks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Create task form */}
      {showForm && (
        <form onSubmit={createTask} className="bg-white border border-stone-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="font-display font-bold text-base text-stone-900 mb-4">Create Task</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. Update investor pitch deck"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                placeholder="Optional details…"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Assign to</label>
                <select
                  value={form.assignee_id}
                  onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as 'urgent' | 'normal' })}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Due date *</label>
                <input
                  required
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-stone-100 p-1 rounded-lg w-fit">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
              filter === f ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {f === 'in_progress' ? 'In Progress' : f}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm divide-y divide-stone-100">
        {loading && <div className="p-8 text-center text-stone-400 text-sm">Loading…</div>}
        {!loading && tasks.length === 0 && (
          <div className="p-8 text-center text-stone-400 text-sm">No tasks found.</div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                {task.priority === 'urgent' && (
                  <span className="text-xs text-red-600 font-mono-code font-medium">URGENT</span>
                )}
                <p className="text-sm font-semibold text-stone-800 truncate">{task.title}</p>
              </div>
              {task.description && <p className="text-xs text-stone-400 truncate">{task.description}</p>}
              <p className="text-xs text-stone-400 mt-0.5">
                {(task as any).team_members?.name ?? 'Unassigned'} · Due {task.due_date}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={task.status}
                onChange={(e) => updateStatus(task.id, e.target.value)}
                className={`text-xs border px-2 py-1 rounded-lg font-medium focus:outline-none cursor-pointer ${statusStyle(task.status)}`}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function statusStyle(status: string) {
  const s: Record<string, string> = {
    pending: 'bg-stone-100 text-stone-600 border-stone-200',
    in_progress: 'bg-blue-50 text-blue-600 border-blue-200',
    done: 'bg-green-50 text-green-600 border-green-200',
    overdue: 'bg-red-50 text-red-600 border-red-200',
  }
  return s[status] ?? s.pending
}
