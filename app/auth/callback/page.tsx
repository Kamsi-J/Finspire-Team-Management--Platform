'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    const type = params.get('type')
    const next = params.get('next') ?? '/'

    if (!code) {
      router.replace('/login')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace('/login')
        return
      }
      if (type === 'recovery') {
        router.replace('/auth/update-password')
      } else {
        router.replace(next)
      }
    })
  }, [params, router])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--charcoal)' }}
    >
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-lg mb-6 flex items-center justify-center mx-auto"
          style={{ background: 'var(--brand)' }}
        >
          <span className="font-display font-bold text-white text-lg leading-none">F</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--neutral)' }}>Signing you in…</p>
      </div>
    </div>
  )
}
