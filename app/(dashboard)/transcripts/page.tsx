'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Transcript, ExtractedTask, TeamMember } from '@/types'

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ meeting_title: '', content: '' })
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<Transcript | null>(null)
  const [reviewTasks, setReviewTasks] = useState<ExtractedTask[]>([])
  const [applying, setApplying] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from('transcripts').select('*').order('created_at', { ascending: false }),
      supabase.from('team_members').select('*').eq('is_active', true).eq('is_admin', false),
    ])
    setTranscripts(t ?? [])
    setMembers(m ?? [])
  }

  async function uploadTranscript(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('transcripts').insert({
      meeting_title: form.meeting_title, content: form.content, status: 'uploaded',
    }).select().single()
    setForm({ meeting_title: '', content: '' })
    setShowForm(false)
    setSaving(false)
    if (data) await parseTranscript(data.id)
    fetchData()
  }

  async function parseTranscript(id: string) {
    setParsing(id)
    const res = await fetch('/api/transcripts/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptId: id }),
    })
    setParsing(null)
    if (res.ok) fetchData()
  }

  function openReview(t: Transcript) {
    setReviewing(t)
    setReviewTasks((t.ai_extracted_tasks ?? []).map((task) => ({ ...task })))
  }

  async function applyTasks() {
    if (!reviewing) return
    setApplying(true)
    for (const task of reviewTasks) {
      if (!task.title) continue
      await supabase.from('tasks').insert({
        title: task.title,
        description: task.description ?? null,
        assignee_id: task.assignee_id ?? null,
        priority: task.priority,
        due_date: task.due_date ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'pending',
        source: 'transcript',
      })
    }
    await supabase.from('transcripts').update({ status: 'applied' }).eq('id', reviewing.id)
    setReviewing(null)
    setApplying(false)
    fetchData()
  }

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    uploaded:   { label: 'Uploaded',   bg: '#F4F4F5', color: '#71717A' },
    processing: { label: 'Processing', bg: '#EFF6FF', color: '#2563EB' },
    reviewed:   { label: 'Reviewed',   bg: '#FFFBEB', color: '#B45309' },
    applied:    { label: 'Applied',    bg: '#F0FDF4', color: '#16A34A' },
  }

  const inputStyle = { border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>AI</p>
          <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Transcripts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Upload a meeting transcript — AI extracts and assigns tasks</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)' }}>
          + Upload Transcript
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 mb-6 animate-fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text)' }}>Upload Meeting Transcript</h3>
          <form onSubmit={uploadTranscript} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Meeting Title</label>
              <input value={form.meeting_title} onChange={(e) => setForm({ ...form, meeting_title: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none" style={inputStyle}
                placeholder="e.g. Team Sync — Sept 13" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Transcript *</label>
              <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none resize-none font-mono-code"
                style={{ ...inputStyle, fontSize: '12px' }}
                placeholder="Paste the meeting transcript here. The AI will extract tasks and match them to team members by name…" />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>Cancel</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand)' }}>
                {saving ? 'Uploading…' : 'Upload & Parse'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--card)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>Review Extracted Tasks</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Edit before applying — then click Apply to create these tasks.</p>
            </div>
            <div className="p-6 space-y-4">
              {reviewTasks.map((task, i) => (
                <div key={i} className="rounded-xl p-4" style={{ border: '1px solid var(--border)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Title</label>
                      <input value={task.title}
                        onChange={(e) => { const u = [...reviewTasks]; u[i] = { ...task, title: e.target.value }; setReviewTasks(u) }}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Assign to</label>
                      <select value={task.assignee_id ?? ''}
                        onChange={(e) => { const u = [...reviewTasks]; u[i] = { ...task, assignee_id: e.target.value }; setReviewTasks(u) }}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle}>
                        <option value="">Unassigned</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Due Date</label>
                      <input type="date" value={task.due_date ?? ''}
                        onChange={(e) => { const u = [...reviewTasks]; u[i] = { ...task, due_date: e.target.value }; setReviewTasks(u) }}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide"
                      style={{
                        background: task.confidence === 'high' ? '#F0FDF4' : task.confidence === 'medium' ? '#FFFBEB' : '#FFF1F2',
                        color: task.confidence === 'high' ? '#16A34A' : task.confidence === 'medium' ? '#B45309' : 'var(--brand)',
                      }}>
                      {task.confidence} confidence
                    </span>
                    <button onClick={() => setReviewTasks(reviewTasks.filter((_, j) => j !== i))}
                      className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--brand)' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setReviewing(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>Cancel</button>
              <button onClick={applyTasks} disabled={applying || reviewTasks.length === 0}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand)' }}>
                {applying ? 'Applying…' : `Apply ${reviewTasks.length} tasks`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {transcripts.length === 0 && (
          <div className="rounded-xl p-10 text-center text-sm"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            No transcripts yet.
          </div>
        )}
        {transcripts.map((t) => {
          const s = statusConfig[t.status] ?? statusConfig.uploaded
          return (
            <div key={t.id} className="rounded-xl p-5 flex items-center justify-between gap-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t.meeting_title ?? 'Untitled meeting'}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: s.bg, color: s.color }}>{s.label}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {new Date(t.created_at).toLocaleDateString()} · {t.ai_extracted_tasks?.length ?? 0} tasks extracted
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {t.status === 'uploaded' && (
                  <button onClick={() => parseTranscript(t.id)} disabled={parsing === t.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 transition-opacity"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    {parsing === t.id ? 'Parsing…' : 'Parse with AI'}
                  </button>
                )}
                {t.status === 'reviewed' && (
                  <button onClick={() => openReview(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--brand)' }}>
                    Review & Apply →
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
