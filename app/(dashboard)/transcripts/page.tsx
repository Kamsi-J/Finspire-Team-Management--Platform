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
      meeting_title: form.meeting_title,
      content: form.content,
      status: 'uploaded',
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

  const statusColor: Record<string, string> = {
    uploaded: 'bg-stone-100 text-stone-500',
    processing: 'bg-blue-50 text-blue-600',
    reviewed: 'bg-amber-50 text-amber-600',
    applied: 'bg-green-50 text-green-600',
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-stone-900">Transcripts</h1>
          <p className="text-stone-500 text-sm mt-1">Upload meeting transcripts — AI extracts and assigns tasks automatically</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors">
          + Upload Transcript
        </button>
      </div>

      {showForm && (
        <form onSubmit={uploadTranscript} className="bg-white border border-stone-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="font-display font-bold text-base text-stone-900 mb-4">Upload Meeting Transcript</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Meeting Title</label>
              <input value={form.meeting_title} onChange={(e) => setForm({ ...form, meeting_title: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="e.g. Team Sync — Sept 13" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Transcript *</label>
              <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none font-mono-code text-xs"
                placeholder="Paste the meeting transcript here. The AI will extract tasks and match them to team members by name…" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Uploading…' : 'Upload & Parse'}
            </button>
          </div>
        </form>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-stone-100">
              <h2 className="font-display font-bold text-lg text-stone-900">Review Extracted Tasks</h2>
              <p className="text-sm text-stone-500 mt-0.5">Edit anything before applying — then click Apply to create these tasks.</p>
            </div>
            <div className="p-6 space-y-4">
              {reviewTasks.map((task, i) => (
                <div key={i} className="border border-stone-200 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wide">Title</label>
                      <input value={task.title} onChange={(e) => {
                        const updated = [...reviewTasks]; updated[i] = { ...task, title: e.target.value }; setReviewTasks(updated)
                      }} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wide">Assign to</label>
                      <select value={task.assignee_id ?? ''} onChange={(e) => {
                        const updated = [...reviewTasks]; updated[i] = { ...task, assignee_id: e.target.value }; setReviewTasks(updated)
                      }} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
                        <option value="">Unassigned</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-400 mb-1 uppercase tracking-wide">Due Date</label>
                      <input type="date" value={task.due_date ?? ''} onChange={(e) => {
                        const updated = [...reviewTasks]; updated[i] = { ...task, due_date: e.target.value }; setReviewTasks(updated)
                      }} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.confidence === 'high' ? 'bg-green-50 text-green-600' : task.confidence === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {task.confidence} confidence
                    </span>
                    <button onClick={() => setReviewTasks(reviewTasks.filter((_, j) => j !== i))}
                      className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3">
              <button onClick={() => setReviewing(null)} className="px-4 py-2 text-sm text-stone-600">Cancel</button>
              <button onClick={applyTasks} disabled={applying || reviewTasks.length === 0}
                className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {applying ? 'Applying…' : `Apply ${reviewTasks.length} tasks`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {transcripts.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400 text-sm">No transcripts yet.</div>
        )}
        {transcripts.map((t) => (
          <div key={t.id} className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-stone-800">{t.meeting_title ?? 'Untitled meeting'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[t.status]}`}>{t.status}</span>
              </div>
              <p className="text-xs text-stone-400">
                {new Date(t.created_at).toLocaleDateString()} · {t.ai_extracted_tasks?.length ?? 0} tasks extracted
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {t.status === 'uploaded' && (
                <button onClick={() => parseTranscript(t.id)} disabled={parsing === t.id}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                  {parsing === t.id ? 'Parsing…' : '🧠 Parse'}
                </button>
              )}
              {t.status === 'reviewed' && (
                <button onClick={() => openReview(t)}
                  className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark">
                  Review & Apply →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
