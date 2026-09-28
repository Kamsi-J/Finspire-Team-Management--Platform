'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Broadcast } from '@/types'

export default function BroadcastPage() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<Broadcast[]>([])
  const [memberCount, setMemberCount] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

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

    if (res.ok) {
      setMessage('')
      fetchData()
    }
    setSending(false)
  }

  const charLimit = 1000
  const chars = message.length

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-stone-900">Broadcast</h1>
        <p className="text-stone-500 text-sm mt-1">Send a message to all {memberCount} active team members via WhatsApp</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm mb-6">
        <form onSubmit={sendBroadcast}>
          <label className="block text-xs font-medium text-stone-600 mb-2 uppercase tracking-wide">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, charLimit))}
            rows={5}
            required
            className="w-full px-3 py-3 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            placeholder="Type your message here. It will be sent to everyone on the team via WhatsApp…"
          />
          <div className="flex justify-between items-center mt-3">
            <span className={`text-xs font-mono-code ${chars > charLimit * 0.9 ? 'text-amber-500' : 'text-stone-400'}`}>
              {chars}/{charLimit}
            </span>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending…' : `📲 Send to ${memberCount} members`}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="font-display font-bold text-base text-stone-900 mb-3">Recent Broadcasts</h2>
        <div className="space-y-2">
          {history.length === 0 && (
            <p className="text-sm text-stone-400">No broadcasts sent yet.</p>
          )}
          {history.map((b) => (
            <div key={b.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{b.message}</p>
              <p className="text-xs text-stone-400 mt-2">
                Sent to {b.recipient_count} members · {new Date(b.sent_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
