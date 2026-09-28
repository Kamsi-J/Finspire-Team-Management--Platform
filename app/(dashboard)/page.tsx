import { supabaseAdmin } from '@/lib/supabase'

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

  const stats = [
    { label: 'Total Tasks', value: totalTasks ?? 0, color: 'text-stone-900' },
    { label: 'Completed', value: doneTasks ?? 0, color: 'text-green-600' },
    { label: 'Overdue', value: overdueTasks ?? 0, color: 'text-red-600' },
    { label: 'Team Members', value: activeMembers ?? 0, color: 'text-blue-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-stone-900">Overview</h1>
        <p className="text-stone-500 text-sm mt-1">Your team at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2">{s.label}</p>
            <p className={`font-display font-bold text-3xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent tasks */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h2 className="font-display font-bold text-base text-stone-900">Recent Tasks</h2>
          <a href="/tasks" className="text-xs text-brand font-semibold hover:underline">View all →</a>
        </div>
        <div className="divide-y divide-stone-100">
          {(recentTasks ?? []).map((task: any) => (
            <div key={task.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{task.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {task.team_members?.name ?? 'Unassigned'} · Due {task.due_date}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {task.priority === 'urgent' && (
                  <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">Urgent</span>
                )}
                <StatusBadge status={task.status} />
              </div>
            </div>
          ))}
          {!recentTasks?.length && (
            <div className="px-6 py-8 text-center text-stone-400 text-sm">No tasks yet. Create your first task.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-stone-100 text-stone-500 border-stone-200',
    in_progress: 'bg-blue-50 text-blue-600 border-blue-200',
    done: 'bg-green-50 text-green-600 border-green-200',
    overdue: 'bg-red-50 text-red-600 border-red-200',
  }
  const labels: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In progress',
    done: 'Done',
    overdue: 'Overdue',
  }
  return (
    <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  )
}
