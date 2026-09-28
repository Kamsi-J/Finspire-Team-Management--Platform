'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const nav = [
  { href: '/',             label: 'Overview',    icon: '◻' },
  { href: '/tasks',        label: 'Tasks',       icon: '✓' },
  { href: '/transcripts',  label: 'Transcripts', icon: '⬆' },
  { href: '/members',      label: 'Team',        icon: '◉' },
  { href: '/meetings',     label: 'Meetings',    icon: '📅' },
  { href: '/broadcast',    label: 'Broadcast',   icon: '📣' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-[#FAFAF9] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-stone-900 flex flex-col">
        <div className="px-5 py-5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display font-bold text-sm">F</span>
            </div>
            <span className="font-display font-bold text-white text-sm">Finspire OS</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand text-white'
                    : 'text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                <span className="text-xs w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-stone-800">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-500 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <span className="text-xs w-4 text-center">→</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
