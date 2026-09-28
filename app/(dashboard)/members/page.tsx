'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TeamMember } from '@/types'

export default function MembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', whatsapp_number: '', email: '', is_admin: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data } = await supabase.from('team_members').select('*').order('name')
    setMembers(data ?? [])
  }

  async function saveMember(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const number = form.whatsapp_number.replace(/^\+/, '')
    await supabase.from('team_members').insert({ ...form, whatsapp_number: number })
    setForm({ name: '', role: '', whatsapp_number: '', email: '', is_admin: false })
    setShowForm(false)
    setSaving(false)
    fetchMembers()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('team_members').update({ is_active: !current }).eq('id', id)
    fetchMembers()
  }

  const inputStyle = { border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[11px] font-mono-code uppercase tracking-widest mb-2" style={{ color: 'var(--neutral)' }}>People</p>
          <h1 className="font-display font-bold text-[28px] leading-tight" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Team</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{members.length} members · add WhatsApp numbers here</p>
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

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {members.length === 0 && (
          <div className="p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>No team members yet.</div>
        )}
        {members.map((m, i) => (
          <div
            key={m.id}
            className="px-5 py-4 flex items-center justify-between gap-4"
            style={{ borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid rgba(112,20,40,0.15)' }}
              >
                {m.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{m.name}</p>
                  {m.is_admin && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--brand-light)', color: 'var(--brand)', border: '1px solid rgba(112,20,40,0.15)' }}>
                      Admin
                    </span>
                  )}
                  {!m.is_active && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--canvas)', color: 'var(--neutral)', border: '1px solid var(--border)' }}>
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {m.role} · <span className="font-mono-code">{m.whatsapp_number}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleActive(m.id, m.is_active)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--canvas)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {m.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
