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
    // Strip + from number if present
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-stone-900">Team</h1>
          <p className="text-stone-500 text-sm mt-1">{members.length} members · add their WhatsApp numbers here</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors"
        >
          + Add Member
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveMember} className="bg-white border border-stone-200 rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="font-display font-bold text-base text-stone-900 mb-4">Add Team Member</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Temi Adebayo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Role *</label>
              <input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Designer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">WhatsApp Number *</label>
              <input required value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand font-mono-code"
                placeholder="2348012345678 (no +)" />
              <p className="text-xs text-stone-400 mt-1">Include country code, no + or spaces. e.g. 2348012345678</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="temi@finspire.co" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <input type="checkbox" id="is_admin" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} className="rounded" />
            <label htmlFor="is_admin" className="text-sm text-stone-600">This person is an admin (receives performance reports)</label>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Member'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-stone-200 rounded-xl shadow-sm divide-y divide-stone-100">
        {members.length === 0 && (
          <div className="p-8 text-center text-stone-400 text-sm">No team members yet. Add your team above.</div>
        )}
        {members.map((m) => (
          <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-light border border-brand/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand font-display font-bold text-sm">{m.name[0]}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-stone-800">{m.name}</p>
                  {m.is_admin && <span className="text-xs bg-brand-light text-brand border border-brand/20 px-1.5 py-0.5 rounded font-medium">Admin</span>}
                  {!m.is_active && <span className="text-xs bg-stone-100 text-stone-400 border border-stone-200 px-1.5 py-0.5 rounded font-medium">Inactive</span>}
                </div>
                <p className="text-xs text-stone-400">{m.role} · <span className="font-mono-code">{m.whatsapp_number}</span></p>
              </div>
            </div>
            <button
              onClick={() => toggleActive(m.id, m.is_active)}
              className="text-xs text-stone-400 hover:text-stone-700 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
            >
              {m.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
