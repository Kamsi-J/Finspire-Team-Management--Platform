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

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-stone-900">Meetings</h1>
          <p className="text-stone-500 text-sm mt-1">Schedule meetings and notify the team via WhatsApp</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors">
          + Schedule Meeting
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveMeeting} className="bg-white border border-stone-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="font-display font-bold text-base text-stone-900 mb-4">Schedule a Meeting</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. Q4 Strategy Review" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Date & Time *</label>
              <input required type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Join Link</label>
              <input type="url" value={form.join_link} onChange={(e) => setForm({ ...form, join_link: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="https://meet.google.com/..." />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Agenda / Notes</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                placeholder="Optional agenda for the team…" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Meeting'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {meetings.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400 text-sm">No meetings scheduled yet.</div>
        )}
        {meetings.map((m) => (
          <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-stone-800">{m.title}</h3>
                {m.notification_sent && (
                  <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-medium">Notified ✓</span>
                )}
              </div>
              <p className="text-sm text-stone-500">📅 {formatDate(m.scheduled_at)}</p>
              {m.description && <p className="text-sm text-stone-400 mt-1">{m.description}</p>}
              {m.join_link && (
                <a href={m.join_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline mt-1 inline-block">🔗 Join link</a>
              )}
            </div>
            {!m.notification_sent && (
              <button
                onClick={() => notifyTeam(m)}
                disabled={sending === m.id}
                className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark disabled:opacity-50 flex-shrink-0"
              >
                {sending === m.id ? 'Sending…' : '📲 Notify Team'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
