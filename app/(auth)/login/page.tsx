'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: member } = await supabase
      .from('team_members')
      .select('is_admin')
      .ilike('email', user.email?.trim() || '')
      .maybeSingle()
    router.push(member?.is_admin ? '/' : '/my-tasks')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--charcoal)' }}
    >
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="mb-10">
          <div
            className="w-10 h-10 rounded-lg mb-6 flex items-center justify-center"
            style={{ background: 'var(--brand)' }}
          >
            <span className="font-display font-bold text-white text-lg leading-none">F</span>
          </div>
          <h1
            className="font-display font-bold text-[26px] leading-tight text-white mb-1"
            style={{ letterSpacing: '-0.02em' }}
          >
            Finspire Team OS
          </h1>
          <p className="text-sm" style={{ color: 'var(--neutral)' }}>Sign in to your workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--neutral)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white focus:outline-none transition-colors"
              style={{
                background: 'var(--charcoal-2)',
                border: '1px solid var(--charcoal-3)',
              }}
              placeholder="you@finspire.co"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--charcoal-3)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--neutral)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white focus:outline-none transition-colors"
              style={{
                background: 'var(--charcoal-2)',
                border: '1px solid var(--charcoal-3)',
              }}
              placeholder="••••••••"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--charcoal-3)' }}
            />
          </div>

          {error && (
            <p
              className="text-sm px-4 py-3 rounded-lg"
              style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid var(--brand)' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50 mt-2"
            style={{ background: 'var(--brand)' }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--brand-dark)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
