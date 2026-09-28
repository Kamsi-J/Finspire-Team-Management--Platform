'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Broadcast } from '@/types'

export default function BroadcastPage() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<Broadcast[]>([])
  const [memberCount, setMemberCount] = useState(0)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: broadcasts }, { count }] = await Promise.all([
      supabase.from('broadcasts').select('*').order('sent_at', { ascending: false }).limit(10),
      supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_admin', false),
    ])
    setHistory(broadcasts ?? [])
    setMemberCount(count ?? 0)
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (res.ok) { setMessage(''); fetchData() }
    setSending(false)
  }

  const charLimit = 1000
  const chars = message.length

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>Communications</p>
        <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Broadcast</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Send a message to all {memberCount} active members via WhatsApp</p>
      </div>

      <div className="rounded-xl p-6 mb-8"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <form onSubmit={sendBroadcast}>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--neutral)' }}>
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, charLimit))}
            rows={5}
            required
            className="w-full px-3 py-3 rounded-lg text-sm focus:outline-none resize-none"
            style={{ border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
            placeholder="Type your message. It will be sent to everyone on the team via WhatsApp…"
          />
          <div className="flex justify-between items-center mt-3">
            <span
              className="text-xs font-mono-code"
              style={{ color: chars > charLimit * 0.9 ? 'var(--brand)' : 'var(--text-3)' }}
            >
              {chars}/{charLimit}
            </span>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand)' }}
            >
              {sending ? 'Sending…' : `Send to ${memberCount} members`}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="font-display font-bold text-base mb-4" style={{ color: 'var(--text)' }}>Recent Broadcasts</h2>
        <div className="space-y-2">
          {history.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No broadcasts sent yet.</p>
          )}
          {history.map((b) => (
            <div key={b.id} className="rounded-xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <p className="text-sm whitespace-pre-wrap mb-2" style={{ color: 'var(--text)' }}>{b.message}</p>
              <p className="text-[11px] font-mono-code" style={{ color: 'var(--text-3)' }}>
                {b.recipient_count} recipients · {new Date(b.sent_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
