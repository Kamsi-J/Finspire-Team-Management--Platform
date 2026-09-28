'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const nav = [
  { href: '/',            label: 'Overview',     icon: '▦' },
  { href: '/tasks',       label: 'Tasks',        icon: '✓' },
  { href: '/transcripts', label: 'Transcripts',  icon: '↑' },
  { href: '/members',     label: 'Team',         icon: '○' },
  { href: '/meetings',    label: 'Meetings',     icon: '◷' },
  { href: '/broadcast',   label: 'Broadcast',    icon: '◈' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--canvas)' }}>
      {/* Sidebar */}
      <aside
        className="w-[220px] flex-shrink-0 flex flex-col scrollbar-thin"
        style={{ background: 'var(--charcoal)' }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--charcoal-3)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand)' }}
            >
              <span className="font-display font-bold text-white text-sm leading-none">F</span>
            </div>
            <div>
              <p className="text-white text-[13px] font-semibold leading-tight tracking-tight">Finspire</p>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--neutral)' }}>Team OS</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {nav.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors"
                style={
                  active
                    ? { background: 'var(--brand)', color: '#fff' }
                    : { color: '#A1A1AA' }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--charcoal-3)'
                    e.currentTarget.style.color = '#fff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#A1A1AA'
                  }
                }}
              >
                <span className="text-[11px] w-4 text-center opacity-70 font-mono-code">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--charcoal-3)' }}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors text-left"
            style={{ color: 'var(--neutral)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--charcoal-3)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--neutral)'
            }}
          >
            <span className="text-[11px] w-4 text-center font-mono-code">↗</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
