'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, TeamMember } from '@/types'
import { SkeletonCard, SkeletonRow } from '@/components/Skeleton'

type TaskRow = Task & { team_members?: { name: string } }

async function apiFetch(path: string) {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function OverviewPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverviewData()
  }, [])

  async function fetchOverviewData() {
    setLoading(true)
    try {
      const [tasksRes, membersRes] = await Promise.all([
        apiFetch('/api/tasks'),
        apiFetch('/api/members?active_only=true'),
      ])

      let loadedTasks: TaskRow[] = Array.isArray(tasksRes) ? tasksRes : []
      let loadedMembers: TeamMember[] = Array.isArray(membersRes) ? membersRes : []

      // Fallbacks if API returned error/non-array
      if (loadedTasks.length === 0) {
        const { data: t } = await supabase
          .from('tasks')
          .select('*, team_members!assignee_id(name)')
          .order('created_at', { ascending: false })
        if (t && t.length > 0) loadedTasks = t as TaskRow[]
      }

      if (loadedMembers.length === 0) {
        const { data: m } = await supabase
          .from('team_members')
          .select('*')
          .eq('is_active', true)
          .order('name')
        if (m && m.length > 0) loadedMembers = m
      }

      setTasks(loadedTasks)
      setMembers(loadedMembers)
    } catch (err) {
      console.error('[Overview Fetch Error]', err)
    } finally {
      setLoading(false)
    }
  }

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const overdueTasks = tasks.filter((t) => t.status === 'overdue').length
  const activeMembers = members.length
  const recentTasks = tasks.slice(0, 8)

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>
          Dashboard
        </p>
        <h1 className="font-display text-[28px] font-bold leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Your team at a glance</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Tasks" value={totalTasks} />
          <StatCard label="Completed" value={doneTasks} accent="green" />
          <StatCard label="Overdue" value={overdueTasks} accent="overdue" />
          <StatCard label="Team Members" value={activeMembers} />
        </div>
      )}

      {/* Recent tasks */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div
          className="px-6 py-4 flex justify-between items-center"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-display text-base font-bold" style={{ color: 'var(--text)' }}>Recent Tasks</h2>
          <a
            href="/tasks"
            className="text-xs font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--brand)', fontFamily: 'var(--font-hanken)' }}
          >
            View all →
          </a>
        </div>
        <div>
          {loading && (
            <div>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {!loading && recentTasks.map((task: any) => {
            const assigneeName = task.team_members?.name ?? 'Unassigned'
            return (
              <div
                key={task.id}
                className="px-6 py-4 flex items-center justify-between gap-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {task.priority === 'urgent' && (
                      <span className="text-[10px] font-mono-code font-semibold tracking-wider" style={{ color: 'var(--brand)' }}>
                        URGENT
                      </span>
                    )}
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{task.title}</p>
                  </div>
                  <p className="text-xs mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: 'var(--text-3)' }}>
                    <span className="font-bold inline-flex items-center gap-1" style={{ color: 'var(--text)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}>person</span>
                      {assigneeName}
                    </span>
                    <span>· Due {task.due_date}</span>
                  </p>
                </div>
                <StatusChip status={task.status} />
              </div>
            )
          })}

          {!loading && recentTasks.length === 0 && (
            <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>
              No tasks yet. <a href="/tasks" style={{ color: 'var(--brand)' }}>Create your first task →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'green' | 'overdue' }) {
  const isOverdue = accent === 'overdue'
  const isGreen = accent === 'green'

  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        borderLeft: isOverdue ? '3px solid var(--brand)' : undefined,
      }}
    >
      <p className="text-[10px] uppercase tracking-wide font-semibold mb-3 leading-tight" style={{ color: 'var(--neutral)' }}>
        {label}
      </p>
      <p
        className="font-mono-code text-3xl font-bold leading-none"
        style={{ color: isOverdue ? 'var(--brand)' : isGreen ? '#16a34a' : 'var(--text)' }}
      >
        {value}
      </p>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    pending:     { label: 'Pending',     bg: '#F4F4F5', color: '#71717A' },
    in_progress: { label: 'In progress', bg: '#EFF6FF', color: '#2563EB' },
    done:        { label: 'Done',        bg: '#F0FDF4', color: '#16A34A' },
    overdue:     { label: 'Overdue',     bg: '#FFF1F2', color: '#701428' },
  }
  const c = config[status] ?? config.pending
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  )
}
