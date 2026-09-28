'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Meeting } from '@/types'

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', scheduled_at: '', join_link: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMeetings() }, [])

  async function fetchMeetings() {
    const { data } = await supabase.from('meetings').select('*').order('scheduled_at', { ascending: false })
    setMeetings(data ?? [])
  }

  async function saveMeeting(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('meetings').insert(form)
    setForm({ title: '', description: '', scheduled_at: '', join_link: '' })
    setShowForm(false)
    setSaving(false)
    fetchMeetings()
  }

  async function notifyTeam(meeting: Meeting) {
    setSending(meeting.id)
    const res = await fetch('/api/meetings/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId: meeting.id }),
    })
    if (res.ok) {
      await supabase.from('meetings').update({ notification_sent: true }).eq('id', meeting.id)
      fetchMeetings()
    }
    setSending(null)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const inputStyle = { border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>Scheduling</p>
          <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Meetings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Schedule and notify the team via WhatsApp</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)' }}>
          + Schedule Meeting
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 mb-6 animate-fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text)' }}>Schedule a Meeting</h3>
          <form onSubmit={saveMeeting}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Title *</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={inputStyle}
                  placeholder="e.g. Q4 Strategy Review" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Date & Time *</label>
                <input required type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Join Link</label>
                <input type="url" value={form.join_link} onChange={(e) => setForm({ ...form, join_link: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={inputStyle}
                  placeholder="https://meet.google.com/..." />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Agenda / Notes</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none resize-none" style={inputStyle}
                  placeholder="Optional agenda for the team…" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>Cancel</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand)' }}>
                {saving ? 'Saving…' : 'Save Meeting'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {meetings.length === 0 && (
          <div className="rounded-xl p-10 text-center text-sm"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            No meetings scheduled yet.
          </div>
        )}
        {meetings.map((m) => (
          <div key={m.id} className="rounded-xl p-5 flex items-start justify-between gap-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{m.title}</h3>
                {m.notification_sent && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                    Notified
                  </span>
                )}
              </div>
              <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>{formatDate(m.scheduled_at)}</p>
              {m.description && <p className="text-sm" style={{ color: 'var(--text-3)' }}>{m.description}</p>}
              {m.join_link && (
                <a href={m.join_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold mt-1.5 inline-block hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--brand)' }}>
                  Join link →
                </a>
              )}
            </div>
            {!m.notification_sent && (
              <button onClick={() => notifyTeam(m)} disabled={sending === m.id}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white flex-shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand)' }}>
                {sending === m.id ? 'Sending…' : 'Notify Team'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
