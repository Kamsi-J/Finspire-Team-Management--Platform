'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login')
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <>
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
              onClick={() => setSidebarOpen(false)}
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
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--canvas)' }}>

      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        className="hidden lg:flex w-[220px] flex-shrink-0 flex-col scrollbar-thin"
        style={{ background: 'var(--charcoal)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className="fixed top-0 left-0 h-full w-[220px] flex flex-col z-50 lg:hidden transition-transform duration-300 scrollbar-thin"
        style={{
          background: 'var(--charcoal)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Right side: mobile top bar + content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header
          className="flex lg:hidden items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ background: 'var(--charcoal)', borderBottom: '1px solid var(--charcoal-3)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1 p-1"
            aria-label="Open menu"
          >
            <span className="block w-5 h-0.5 bg-white rounded-full" />
            <span className="block w-5 h-0.5 bg-white rounded-full" />
            <span className="block w-5 h-0.5 bg-white rounded-full" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{ background: 'var(--brand)' }}
            >
              <span className="font-display font-bold text-white text-[11px] leading-none">F</span>
            </div>
            <span className="text-white text-[13px] font-semibold tracking-tight">Finspire</span>
            <span className="text-[11px]" style={{ color: 'var(--neutral)' }}>Team OS</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
