'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Confirm a recovery session exists before rendering the form
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setReady(true)
      }
    })
  }, [router])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Sign out so the user logs in fresh with the new password
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--charcoal)' }}
      >
        <p className="text-sm" style={{ color: 'var(--neutral)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--charcoal)' }}
    >
      <div className="w-full max-w-[360px]">
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
            Set new password
          </h1>
          <p className="text-sm" style={{ color: 'var(--neutral)' }}>
            Choose a new password for your account
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: 'var(--neutral)' }}
            >
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white focus:outline-none transition-colors"
              style={{ background: 'var(--charcoal-2)', border: '1px solid var(--charcoal-3)' }}
              placeholder="••••••••"
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--charcoal-3)' }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-semibold mb-2 uppercase tracking-wider"
              style={{ color: 'var(--neutral)' }}
            >
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white focus:outline-none transition-colors"
              style={{ background: 'var(--charcoal-2)', border: '1px solid var(--charcoal-3)' }}
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
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
