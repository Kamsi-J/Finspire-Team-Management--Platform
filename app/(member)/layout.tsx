'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login')
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--canvas)' }}>
      <aside className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: 'var(--charcoal)' }}>
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--charcoal-3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brand)' }}>
              <span className="font-display font-bold text-white text-sm leading-none">F</span>
            </div>
            <div>
              <p className="text-white text-[13px] font-semibold leading-tight tracking-tight">Finspire</p>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--neutral)' }}>Team OS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium"
            style={{ background: 'var(--brand)', color: '#fff' }}
          >
            <span className="material-symbols-outlined text-[18px] w-5 text-center flex-shrink-0 opacity-80">task_alt</span>
            My Tasks
          </div>
        </nav>

        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--charcoal-3)' }}>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors text-left"
            style={{ color: 'var(--neutral)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--charcoal-3)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--neutral)' }}
          >
            <span className="material-symbols-outlined text-[18px] w-5 text-center flex-shrink-0">logout</span>
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
