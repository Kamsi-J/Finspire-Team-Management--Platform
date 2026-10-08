'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TeamMember } from '@/types'

type LoginForm = { memberId: string; email: string; password: string }
type DeleteTarget = { memberId: string; name: string; email?: string }
type OpenMenu = string | null

export default function MembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', whatsapp_number: '', telegram_chat_id: '', email: '', is_admin: false, preferred_platform: 'whatsapp', password: '' })
  const [saving, setSaving] = useState(false)
  const [loginForm, setLoginForm] = useState<LoginForm | null>(null)
  const [loginSaving, setLoginSaving] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)

  useEffect(() => { fetchMembers() }, [])
  useEffect(() => {
    function closeMenu(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-member-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  async function fetchMembers() {
    try {
      const res = await fetch('/api/members?active_only=false')
      if (res.ok) {
        const data = await res.json()
        setMembers(Array.isArray(data) ? data : [])
        return
      }
    } catch (err) {
      console.error('[Fetch Members Error]', err)
    }
    const { data } = await supabase.from('team_members').select('*').order('name')
    setMembers(data ?? [])
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const number = form.whatsapp_number.replace(/^\+/, '')
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, whatsapp_number: number }),
      })
    } catch (err) {
      console.error('[Save Member Error]', err)
      await supabase.from('team_members').insert({ ...form, whatsapp_number: number })
    }
    setForm({ name: '', role: '', whatsapp_number: '', telegram_chat_id: '', email: '', is_admin: false, preferred_platform: 'whatsapp', password: '' })
    setShowForm(false)
    setSaving(false)
    fetchMembers()
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !current }),
      })
    } catch (err) {
      console.error('[Toggle Active Error]', err)
      await supabase.from('team_members').update({ is_active: !current }).eq('id', id)
    }
    fetchMembers()
  }

  async function createLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginForm) return
    setLoginSaving(true)
    setLoginError('')
    const res = await fetch('/api/members/create-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    })
    const data = await res.json()
    if (data.error) { setLoginError(data.error); setLoginSaving(false); return }
    setLoginForm(null)
    setLoginSaving(false)
    fetchMembers()
  }

  async function deleteMember() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch('/api/members/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: deleteTarget.memberId, email: deleteTarget.email }),
    })
    const data = await res.json()
    setDeleting(false)
    if (!data.error) {
      setDeleteTarget(null)
      fetchMembers()
    }
  }

  const inputStyle = { border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>People</p>
          <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Team</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{members.length} members · add WhatsApp & Telegram IDs here</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand)' }}
        >
          + Add Member
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-xl p-6 mb-6 animate-fade-in"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
        >
          <h3 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text)' }}>Add Team Member</h3>
          <form onSubmit={saveMember}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Full Name', key: 'name', placeholder: 'Temi Adebayo', required: true },
                { label: 'Role', key: 'role', placeholder: 'Designer', required: true },
              ].map(({ label, key, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>
                    {label} {required && '*'}
                  </label>
                  <input
                    required={required}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={inputStyle}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>
                  WhatsApp Number *
                </label>
                <input
                  required
                  value={form.whatsapp_number}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none font-mono-code"
                  style={inputStyle}
                  placeholder="2348012345678"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Country code, no + or spaces</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>
                  Telegram Chat ID
                </label>
                <input
                  value={form.telegram_chat_id}
                  onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none font-mono-code"
                  style={inputStyle}
                  placeholder="5604614054"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>From /start on @Finspire_Team_Bot</p>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="temi@finspire.co"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Portal Password</label>
                <input
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="Leave blank to set later"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>Min 6 chars · Creates their portal login immediately</p>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--neutral)' }}>Messaging Platform</label>
                <div className="flex gap-2">
                  {[
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'telegram', label: 'Telegram' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, preferred_platform: value })}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        background: form.preferred_platform === value ? 'var(--brand)' : 'var(--canvas)',
                        color: form.preferred_platform === value ? 'white' : 'var(--text-2)',
                        border: `1px solid ${form.preferred_platform === value ? 'var(--brand)' : 'var(--border)'}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-3)' }}>Determines which channel bot messages are sent through</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="is_admin"
                checked={form.is_admin}
                onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                className="rounded"
                style={{ accentColor: 'var(--brand)' }}
              />
              <label htmlFor="is_admin" className="text-sm" style={{ color: 'var(--text-2)' }}>
                Admin — receives performance reports
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--brand)' }}>
                {saving ? 'Saving…' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Update Login Modal */}
      {loginForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Set Portal Login</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>Create credentials for this team member to access their task portal.</p>
            <form onSubmit={createLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Email *</label>
                <input
                  required type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="member@finspire.co"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--neutral)' }}>Temporary Password *</label>
                <input
                  required type="password" minLength={6}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="Min 6 characters"
                />
              </div>
              {loginError && <p className="text-xs" style={{ color: '#DC2626' }}>{loginError}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => { setLoginForm(null); setLoginError('') }}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity" style={{ color: 'var(--text-2)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loginSaving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: 'var(--brand)' }}>
                  {loginSaving ? 'Creating…' : 'Create Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text)' }}>Remove {deleteTarget.name}?</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
              This will permanently delete their record from the team.
              {deleteTarget.email && ' Their portal login will also be revoked.'}
              {' '}This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={deleteMember}
                disabled={deleting}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: '#DC2626' }}
              >
                {deleting ? 'Removing…' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {members.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>No team members yet.</div>
        )}
        {members.map((m, i) => (
          <div
            key={m.id}
            className="px-5 py-4 flex items-center justify-between gap-4"
            style={{
              borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
              borderRadius: i === 0 && members.length === 1 ? '12px' : i === 0 ? '12px 12px 0 0' : i === members.length - 1 ? '0 0 12px 12px' : undefined,
            }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid rgba(112,20,40,0.15)' }}
              >
                {m.name[0]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{m.name}</p>
                  {m.is_admin && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid rgba(112,20,40,0.15)' }}>
                      Admin
                    </span>
                  )}
                  {m.email && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                      Login set
                    </span>
                  )}
                  {(m as any).preferred_platform === 'telegram' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#E8F4FB', color: '#2CA5E0', border: '1px solid #BDE4F5' }}>
                      TG only
                    </span>
                  )}
                  {(m as any).preferred_platform === 'whatsapp' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                      WA only
                    </span>
                  )}
                  {!m.is_active && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--canvas)', color: 'var(--neutral)', border: '1px solid var(--border)' }}>
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                  {m.role} · <span className="font-mono-code">{m.whatsapp_number}</span>
                  {(m as any).telegram_chat_id && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5">
                      <span className="material-symbols-outlined text-[11px]" style={{ color: '#2CA5E0' }}>send</span>
                      <span className="font-mono-code" style={{ color: '#2CA5E0' }}>{(m as any).telegram_chat_id}</span>
                    </span>
                  )}
                  {m.email && <> · {m.email}</>}
                </p>
              </div>
            </div>
            <div className="relative flex-shrink-0" data-member-menu="">
              <button
                onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-lg leading-none transition-colors"
                style={{
                  color: 'var(--text-3)',
                  background: openMenu === m.id ? 'var(--canvas)' : 'transparent',
                  border: '1px solid ' + (openMenu === m.id ? 'var(--border)' : 'transparent'),
                }}
              >
                ···
              </button>
              {openMenu === m.id && (
                <div
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl overflow-hidden z-30"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                >
                  {!m.is_admin && (
                    <button
                      onClick={() => { setOpenMenu(null); setLoginForm({ memberId: m.id, email: m.email ?? '', password: '' }); setLoginError('') }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--canvas)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {m.email ? 'Update Login' : 'Set Login'}
                    </button>
                  )}
                  <button
                    onClick={() => { setOpenMenu(null); toggleActive(m.id, m.is_active) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: 'var(--text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--canvas)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={() => { setOpenMenu(null); setDeleteTarget({ memberId: m.id, name: m.name, email: m.email ?? undefined }) }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ color: '#DC2626' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF1F2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    Remove member
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
