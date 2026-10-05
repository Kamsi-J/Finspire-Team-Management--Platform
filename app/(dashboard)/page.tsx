import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [
    { count: totalTasks },
    { count: doneTasks },
    { count: overdueTasks },
    { count: activeMembers },
  ] = await Promise.all([
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
    supabaseAdmin.from('team_members').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_admin', false),
  ])

  const { data: recentTasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, priority, due_date, team_members(name)')
    .order('created_at', { ascending: false })
    .limit(8)

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Tasks" value={totalTasks ?? 0} />
        <StatCard label="Completed" value={doneTasks ?? 0} accent="green" />
        <StatCard label="Overdue" value={overdueTasks ?? 0} accent="overdue" />
        <StatCard label="Team Members" value={activeMembers ?? 0} />
      </div>

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
          {(recentTasks ?? []).map((task: any) => (
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
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                  <span className="font-bold text-[var(--text)]">👤 {task.team_members?.name ?? 'Unassigned'}</span> · Due {task.due_date}
                </p>
              </div>
              <StatusChip status={task.status} />
            </div>
          ))}
          {!recentTasks?.length && (
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
