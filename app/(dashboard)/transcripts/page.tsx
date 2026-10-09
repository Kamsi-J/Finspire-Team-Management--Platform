'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Transcript, ExtractedTask, TeamMember } from '@/types'
import { useToast } from '@/components/Toast'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

export default function TranscriptsPage() {
  const { showToast } = useToast()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ meeting_title: '', content: '' })
  
  // AI Parsing & Process Overlay States
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [aiStepMessage, setAiStepMessage] = useState('')
  const [parsingId, setParsingId] = useState<string | null>(null)
  
  // Review Modal States
  const [reviewing, setReviewing] = useState<Transcript | null>(null)
  const [reviewTasks, setReviewTasks] = useState<ExtractedTask[]>([])
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [transRes, { data: m }] = await Promise.all([
        fetch('/api/transcripts'),
        supabase.from('team_members').select('*').eq('is_active', true),
      ])

      if (transRes.ok) {
        const tData = await transRes.json()
        setTranscripts(Array.isArray(tData) ? tData : [])
      } else {
        const { data: t } = await supabase.from('transcripts').select('*').order('created_at', { ascending: false })
        setTranscripts(t ?? [])
      }
      setMembers(m ?? [])
    } catch (err) {
      console.error('[Fetch Transcripts Error]', err)
      const { data: t } = await supabase.from('transcripts').select('*').order('created_at', { ascending: false })
      setTranscripts(t ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function uploadAndParseTranscript(e: React.FormEvent) {
    e.preventDefault()
    if (!form.content.trim()) return

    setIsProcessingAI(true)
    setAiStepMessage('1. Saving transcript & starting GLM 4.5 Flash extraction…')

    try {
      const res = await fetch('/api/transcripts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_title: form.meeting_title.trim() || 'Untitled Meeting',
          content: form.content.trim(),
        }),
      })
      const result = await res.json()

      if (res.ok && result.transcript) {
        setAiStepMessage('2. AI Extraction complete! Preparing task review…')
        await new Promise((r) => setTimeout(r, 400))
        setIsProcessingAI(false)
        setForm({ meeting_title: '', content: '' })
        setShowForm(false)

        openReview(result.transcript)
        const count = result.tasks?.length ?? 0
        showToast(`Extracted ${count} action items!`, 'success')
      } else {
        setIsProcessingAI(false)
        console.error('[Upload & Parse Error]', result.error)
        showToast(result.error || 'Failed to save or parse transcript', 'error')
      }
    } catch (err) {
      console.error('[Upload & Parse Network Error]', err)
      setIsProcessingAI(false)
      showToast('Error connecting to AI service', 'error')
    } finally {
      fetchData()
    }
  }

  async function parseExistingTranscript(t: Transcript) {
    setParsingId(t.id)
    setIsProcessingAI(true)
    setAiStepMessage(`Parsing "${t.meeting_title}" with GLM 4.5 Flash…`)

    try {
      const res = await fetch('/api/transcripts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId: t.id }),
      })
      const result = await res.json()

      if (res.ok && result.transcript) {
        setIsProcessingAI(false)
        openReview(result.transcript)
        const count = result.tasks?.length ?? 0
        showToast(`AI extraction complete! (${count} tasks)`, 'success')
      } else {
        setIsProcessingAI(false)
        showToast(result.error || 'Failed to parse transcript', 'error')
      }
    } catch (err) {
      console.error('[Parse Existing Error]', err)
      setIsProcessingAI(false)
      showToast('Error parsing transcript', 'error')
    } finally {
      setParsingId(null)
      fetchData()
    }
  }

  function openReview(t: Transcript) {
    setReviewing(t)
    setReviewTasks((t.ai_extracted_tasks ?? []).map((task) => ({ ...task })))
  }

  async function applyTasks() {
    if (!reviewing) return
    setApplying(true)
    let appliedCount = 0

    try {
      for (const task of reviewTasks) {
        if (!task.title) continue
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: task.title,
            description: task.description ?? null,
            assignee_id: task.assignee_id ?? null,
            priority: task.priority || 'normal',
            due_date: task.due_date ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'pending',
            source: 'transcript',
          }),
        })
        if (res.ok) appliedCount++
      }

      await fetch('/api/transcripts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewing.id, status: 'applied' }),
      })

      setReviewing(null)
      showToast(`Successfully created ${appliedCount} tasks! 🎉`, 'success')
    } catch (err) {
      console.error('[Apply Tasks Error]', err)
      showToast('Failed to apply tasks', 'error')
    } finally {
      setApplying(false)
      fetchData()
    }
  }

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    uploaded: { label: 'Uploaded', bg: '#F4F4F5', color: '#71717A' },
    processing: { label: 'Parsing (GLM 4.5)', bg: '#EFF6FF', color: '#2563EB' },
    reviewed: { label: 'Ready to Review', bg: '#FFFBEB', color: '#B45309' },
    applied: { label: 'Applied ✓', bg: '#F0FDF4', color: '#16A34A' },
  }

  const inputStyle = { border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
        <div>
          <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>
            AI Operations
          </p>
          <h1 className="font-display font-bold text-[28px] leading-tight text-[var(--text)]" style={{ letterSpacing: '-0.02em' }}>
            Meeting Transcripts
          </h1>
          <p className="text-sm mt-1 text-[var(--text-2)]">
            Paste meeting notes or transcripts — GLM 4.5 Flash extracts tasks & maps them to team leads automatically
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4.5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{ background: 'var(--brand)' }}
        >
          {showForm ? '✕ Close Form' : '+ Upload Transcript'}
        </button>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div
          className="rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
        >
          <h3 className="font-display font-bold text-base mb-4 text-[var(--text)]">Upload & Parse Meeting Transcript</h3>
          <form onSubmit={uploadAndParseTranscript} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-[var(--neutral)]">
                Meeting Title
              </label>
              <input
                value={form.meeting_title}
                onChange={(e) => setForm({ ...form, meeting_title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
                style={inputStyle}
                placeholder="e.g. Weekly Strategy Sync & Content Review"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-[var(--neutral)]">
                Transcript Content *
              </label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={9}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none resize-none font-mono-code focus:ring-1 focus:ring-[var(--brand)]"
                style={{ ...inputStyle, fontSize: '12px' }}
                placeholder="Paste a raw transcript here (from Otter, Zoom, Google Meet, etc.). It should include speaker names and timestamps — not a summary or bullet-point recap. GLM 4.5 Flash will identify team leads and extract all action items."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity text-[var(--text-2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 flex items-center gap-2 shadow-xs"
                style={{ background: 'var(--brand)' }}
              >
                <span className="material-symbols-outlined text-[16px]">auto_fix_high</span> Upload & Extract Tasks with AI
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Processing Overlay Screen */}
      {isProcessingAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="rounded-2xl p-8 max-w-md w-full text-center space-y-5 animate-in zoom-in-95 duration-200"
            style={{ background: 'var(--card)', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}
          >
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center animate-bounce" style={{ background: 'var(--brand-light)' }}>
              <span className="material-symbols-outlined text-[28px]" style={{ color: 'var(--brand)' }}>bolt</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[var(--text)]">GLM 4.5 Flash AI Processing</h3>
              <p className="text-xs text-[var(--text-2)] mt-1.5 font-mono-code leading-relaxed">{aiStepMessage}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[var(--brand)] h-full rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

      {/* Review & Apply Modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{ background: 'var(--card)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
          >
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border)]">
              <div>
                <h2 className="font-display font-bold text-lg text-[var(--text)]">Review Extracted Tasks</h2>
                <p className="text-xs text-[var(--text-2)]">
                  {reviewing.meeting_title} · {reviewTasks.length} task{reviewTasks.length !== 1 ? 's' : ''} ready to apply
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {reviewTasks.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-[var(--neutral)]">search_off</span>
                  <p className="text-sm font-semibold text-[var(--text-2)]">No action items found</p>
                  <p className="text-xs text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">
                    GLM couldn&apos;t extract tasks from this transcript. Make sure you&apos;re pasting a <strong>raw transcript</strong> with speaker names and timestamps — not a summary or bullet-point recap.
                  </p>
                </div>
              )}

              {reviewTasks.map((task, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 transition-all hover:border-gray-300"
                  style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[var(--neutral)]">
                        Task Title
                      </label>
                      <input
                        value={task.title}
                        onChange={(e) => {
                          const u = [...reviewTasks]
                          u[i] = { ...task, title: e.target.value }
                          setReviewTasks(u)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg text-sm font-semibold focus:outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[var(--neutral)]">
                        Assignee (Team Lead)
                      </label>
                      <select
                        value={task.assignee_id ?? ''}
                        onChange={(e) => {
                          const u = [...reviewTasks]
                          u[i] = { ...task, assignee_id: e.target.value }
                          setReviewTasks(u)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                        style={inputStyle}
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[var(--neutral)]">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={task.due_date ?? ''}
                        onChange={(e) => {
                          const u = [...reviewTasks]
                          u[i] = { ...task, due_date: e.target.value }
                          setReviewTasks(u)
                        }}
                        className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                        style={{
                          background: task.confidence === 'high' ? '#F0FDF4' : task.confidence === 'medium' ? '#FFFBEB' : '#FFF1F2',
                          color: task.confidence === 'high' ? '#16A34A' : task.confidence === 'medium' ? '#B45309' : 'var(--brand)',
                        }}
                      >
                        {task.confidence ?? 'medium'} confidence
                      </span>
                      {task.priority === 'urgent' && (
                        <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-rose-50 text-[var(--brand)] uppercase tracking-wider">
                          Urgent
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setReviewTasks(reviewTasks.filter((_, j) => j !== i))}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 flex justify-end gap-3 border-t border-[var(--border)]">
              <button
                onClick={() => setReviewing(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity text-[var(--text-2)]"
              >
                Cancel
              </button>
              <button
                onClick={applyTasks}
                disabled={applying || reviewTasks.length === 0}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 shadow-xs"
                style={{ background: 'var(--brand)' }}
              >
                {applying ? 'Creating Tasks…' : `Apply ${reviewTasks.length} Tasks`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && transcripts.length === 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <EmptyState
              icon="mic"
              title="No meeting transcripts uploaded yet"
              description="Upload meeting notes to let GLM 4.5 Flash automatically extract tasks and map them to team leads."
              actionLabel="+ Upload First Transcript"
              onAction={() => setShowForm(true)}
            />
          </div>
        )}

        {!loading &&
          transcripts.map((t) => {
            const s = statusConfig[t.status] ?? statusConfig.uploaded

            return (
              <div
                key={t.id}
                className="rounded-xl p-5 flex items-center justify-between gap-4 transition-all hover:shadow-sm"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm text-[var(--text)]">{t.meeting_title ?? 'Untitled meeting'}</p>
                    <span
                      className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-3)]">
                    {new Date(t.created_at).toLocaleDateString()} · {t.ai_extracted_tasks?.length ?? 0} task
                    {(t.ai_extracted_tasks?.length ?? 0) !== 1 ? 's' : ''} extracted
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {t.status === 'uploaded' && (
                    <button
                      onClick={() => parseExistingTranscript(t)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text-2)] hover:bg-gray-50 transition-colors"
                    >
                      Parse with GLM 4.5
                    </button>
                  )}
                  {t.status === 'reviewed' && (
                    <button
                      onClick={() => openReview(t)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 shadow-xs"
                      style={{ background: 'var(--brand)' }}
                    >
                      Review & Apply →
                    </button>
                  )}
                  {t.status === 'applied' && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                      Applied ✓
                    </span>
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
