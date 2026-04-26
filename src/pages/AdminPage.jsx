import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LangContext'
import { useAuth } from '../contexts/AuthContext'

export default function AdminPage() {
  const { T } = useLang()
  const { user, notifications, markNotificationRead, markAllRead } = useAuth()

  const [tab, setTab]           = useState('users')
  const [users, setUsers]       = useState([])
  const [brands, setBrands]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState({ type: '', text: '' })

  // Brand form
  const [brandName, setBrandName]   = useState('')
  const [brandSlug, setBrandSlug]   = useState('')
  const [savingBrand, setSavingBrand] = useState(false)

  // User → Brand assignment
  const [assigningUser, setAssigningUser] = useState(null)
  const [assignBrandId, setAssignBrandId] = useState('')
  const [assignBrandRole, setAssignBrandRole] = useState('member')
  const [pendingBrandId, setPendingBrandId] = useState({}) // userId → brandId

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: profiles }, { data: brandList }] = await Promise.all([
      supabase.rpc('get_all_profiles'),
      supabase.from('brands').select('*').order('name'),
    ])
    // attach brand info to profiles
    const brandsById = Object.fromEntries((brandList || []).map(b => [b.id, b]))
    const profilesWithBrand = (profiles || []).map(p => ({
      ...p,
      brands: p.brand_id ? brandsById[p.brand_id] : null
    }))
    setUsers(profilesWithBrand)
    setBrands(brandList || [])
    setLoading(false)
  }

  function showMsg(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3000)
  }

  // ── User role ──
  async function updateRole(id, role) {
    try {
      const { error } = await supabase.rpc('admin_update_user_role', { target_user_id: id, new_role: role })
      if (error) throw error
      const notif = notifications.find(n => n.payload?.user_id === id)
      if (notif) await markNotificationRead(notif.id)
      fetchAll()
      showMsg('ok', `Role updated to ${role}`)
    } catch (e) { showMsg('err', e.message) }
  }

  // ── Approve user (with optional brand) ──
  async function approveUser(userId) {
    try {
      await supabase.rpc('admin_update_user_role', { target_user_id: userId, new_role: 'user' })
      // brand 선택했으면 같이 assign
      const brandId = pendingBrandId[userId]
      if (brandId) {
        await supabase.rpc('admin_assign_brand', {
          target_user_id: userId,
          target_brand_id: brandId,
          member_role: 'member',
        })
      }
      const notif = notifications.find(n => n.payload?.user_id === userId)
      if (notif) await markNotificationRead(notif.id)
      setPendingBrandId(prev => { const n = {...prev}; delete n[userId]; return n })
      fetchAll()
      showMsg('ok', 'User approved' + (brandId ? ' & assigned to brand' : ''))
    } catch (e) { showMsg('err', e.message) }
  }

  // ── Brand CRUD ──
  async function createBrand() {
    if (!brandName.trim() || !brandSlug.trim()) { showMsg('err', 'Name and slug required'); return }
    setSavingBrand(true)
    try {
      const { error } = await supabase.rpc('admin_create_brand', {
        brand_name: brandName.trim(),
        brand_slug: brandSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      })
      if (error) throw error
      setBrandName(''); setBrandSlug('')
      fetchAll()
      showMsg('ok', `Brand "${brandName}" created`)
    } catch (e) { showMsg('err', e.message) }
    finally { setSavingBrand(false) }
  }

  async function deleteBrand(id, name) {
    if (!confirm(`Delete brand "${name}"? All members will be unassigned.`)) return
    try {
      const { error } = await supabase.rpc('admin_delete_brand', { brand_id: id })
      if (error) throw error
      fetchAll()
      showMsg('ok', `Brand "${name}" deleted`)
    } catch (e) { showMsg('err', e.message) }
  }

  // ── Assign user to brand ──
  async function assignToBrand(userId) {
    if (!assignBrandId) { showMsg('err', 'Select a brand'); return }
    try {
      const { error: assignErr } = await supabase.rpc('admin_assign_brand', {
        target_user_id: userId,
        target_brand_id: assignBrandId,
        member_role: assignBrandRole,
      })
      if (assignErr) throw assignErr

      setAssigningUser(null); setAssignBrandId(''); setAssignBrandRole('member')
      fetchAll()
      showMsg('ok', 'User assigned to brand')
    } catch (e) { showMsg('err', e.message) }
  }

  async function removeFromBrand(userId) {
    try {
      const userProfile = users.find(u => u.id === userId)
      if (!userProfile?.brand_id) return
      const { error: removeErr } = await supabase.rpc('admin_remove_brand', {
        target_user_id: userId,
        target_brand_id: userProfile.brand_id,
      })
      if (removeErr) throw removeErr
      fetchAll()
      showMsg('ok', 'Removed from brand')
    } catch (e) { showMsg('err', e.message) }
  }

  const pending  = users.filter(u => u.role === 'pending')
  const active   = users.filter(u => u.role !== 'pending' && u.role !== 'rejected')
  const rejected = users.filter(u => u.role === 'rejected')

  const ROLE_BADGE = {
    admin:    { bg: 'var(--orange-bg)',  color: 'var(--orange)', border: 'var(--orange-border)', label: 'Admin' },
    user:     { bg: 'var(--green-bg)',   color: 'var(--green)',  border: 'var(--green-border)',  label: 'User' },
    pending:  { bg: 'var(--s2)',         color: 'var(--text3)',  border: 'var(--border)',         label: 'Pending' },
    rejected: { bg: 'var(--red-bg)',     color: 'var(--red)',    border: 'var(--red-border)',     label: 'Rejected' },
  }

  const TABS = [
    { key: 'users',       label: `All Users (${users.length})` },
    { key: 'pending',     label: `Pending (${pending.length})`, badge: pending.length },
    { key: 'brands',      label: `Brands (${brands.length})` },
    { key: 'notifications', label: `Notifications`, badge: notifications.length },
  ]

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{T.admin.title}</h1>
        {msg.text && (
          <div className="text-xs px-3 py-1.5 rounded-lg"
            style={{
              background: msg.type === 'ok' ? 'var(--green-bg)' : 'var(--red-bg)',
              color: msg.type === 'ok' ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${msg.type === 'ok' ? 'var(--green-border)' : 'var(--red-border)'}`,
            }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: tab === t.key ? 'var(--accent-glow)' : 'transparent',
              color: tab === t.key ? 'var(--accent)' : 'var(--text3)',
              border: `1px solid ${tab === t.key ? 'var(--accent)' : 'var(--border)'}`,
            }}>
            {t.label}
            {t.badge > 0 && (
              <span className="flex items-center justify-center rounded-full text-white"
                style={{ background: 'var(--red)', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, padding: '0 4px' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text3)' }}>Loading…</div>
      ) : (
        <>
          {/* ── All Users ── */}
          {tab === 'users' && (
            <div className="card rounded-xl overflow-hidden">
              {users.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: 'var(--text3)' }}>No users</div>
              ) : users.map((u, i) => {
                const badge = ROLE_BADGE[u.role] || ROLE_BADGE.user
                const isAssigning = assigningUser === u.id
                return (
                  <div key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                        {(u.full_name || u.email || '?')[0].toUpperCase()}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {u.full_name || u.email}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs truncate" style={{ color: 'var(--text3)' }}>{u.email}</span>
                          {u.brands && (
                            <span className="badge badge-accent text-xs">{u.brands.name}</span>
                          )}
                        </div>
                      </div>
                      {/* Role badge */}
                      <span className="badge text-xs"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {badge.label}
                      </span>
                      {/* Actions */}
                      {u.id !== user?.id && (
                        <div className="flex gap-1">
                          {u.role !== 'admin' ? (
                            <button onClick={() => updateRole(u.id, 'admin')}
                              className="btn-ghost text-xs px-2 py-1">{T.admin.makeAdmin}</button>
                          ) : (
                            <button onClick={() => updateRole(u.id, 'user')}
                              className="btn-ghost text-xs px-2 py-1">{T.admin.removeAdmin}</button>
                          )}
                          <button onClick={() => setAssigningUser(isAssigning ? null : u.id)}
                            className="btn-ghost text-xs px-2 py-1"
                            style={{ color: 'var(--accent)' }}>
                            🏢 Brand
                          </button>
                          {u.brand_id && (
                            <button onClick={() => removeFromBrand(u.id)}
                              className="btn-ghost text-xs px-2 py-1"
                              style={{ color: 'var(--red)' }}>
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Brand assignment panel */}
                    {isAssigning && (
                      <div className="px-4 pb-3 flex items-center gap-2"
                        style={{ background: 'var(--s2)', borderTop: '1px solid var(--border)' }}>
                        <select value={assignBrandId} onChange={e => setAssignBrandId(e.target.value)}
                          className="input-base text-xs flex-1" style={{ padding: '5px 10px' }}>
                          <option value="">Select brand…</option>
                          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <select value={assignBrandRole} onChange={e => setAssignBrandRole(e.target.value)}
                          className="input-base text-xs" style={{ padding: '5px 10px', width: 100 }}>
                          <option value="member">Member</option>
                          <option value="owner">Owner</option>
                        </select>
                        <button onClick={() => assignToBrand(u.id)} className="btn-primary text-xs px-3 py-1.5">
                          Assign
                        </button>
                        <button onClick={() => setAssigningUser(null)} className="btn-ghost text-xs">✕</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Pending ── */}
          {tab === 'pending' && (
            <div className="card rounded-xl overflow-hidden">
              {pending.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: 'var(--text3)' }}>No pending users</div>
              ) : pending.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < pending.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--s2)', color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.full_name || u.email}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{u.email}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text4)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={pendingBrandId[u.id] || ''}
                      onChange={e => setPendingBrandId(prev => ({...prev, [u.id]: e.target.value}))}
                      className="input-base text-xs" style={{ padding: '4px 8px', minWidth: 120 }}>
                      <option value="">No brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <button onClick={() => approveUser(u.id)}
                      className="btn-secondary text-xs px-3 py-1.5"
                      style={{ borderColor: 'var(--green-border)', color: 'var(--green)', background: 'var(--green-bg)' }}>
                      ✓ {T.admin.approve}
                    </button>
                    <button onClick={() => updateRole(u.id, 'rejected')}
                      className="btn-secondary text-xs px-3 py-1.5"
                      style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-bg)' }}>
                      ✕ {T.admin.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Brands ── */}
          {tab === 'brands' && (
            <div className="flex flex-col gap-4">
              {/* Create brand */}
              <div className="card rounded-xl p-4">
                <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--text3)', letterSpacing: '0.06em' }}>
                  Create Brand
                </div>
                <div className="flex gap-2">
                  <input value={brandName} onChange={e => {
                    setBrandName(e.target.value)
                    setBrandSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
                  }}
                    placeholder="Brand name (e.g. Urban Outfitters)"
                    className="input-base flex-1 text-sm" />
                  <input value={brandSlug} onChange={e => setBrandSlug(e.target.value)}
                    placeholder="slug"
                    className="input-base text-sm" style={{ width: 140 }} />
                  <button onClick={createBrand} disabled={savingBrand} className="btn-primary text-sm px-4">
                    {savingBrand ? '…' : '+ Create'}
                  </button>
                </div>
              </div>
              {/* Brand list */}
              <div className="card rounded-xl overflow-hidden">
                {brands.length === 0 ? (
                  <div className="p-6 text-center text-sm" style={{ color: 'var(--text3)' }}>No brands yet</div>
                ) : brands.map((b, i) => {
                  const memberCount = users.filter(u => u.brand_id === b.id).length
                  return (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < brands.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>
                        {b.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{b.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text4)' }}>
                          slug: {b.slug} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <button onClick={() => deleteBrand(b.id, b.name)}
                        className="btn-ghost text-xs" style={{ color: 'var(--red)' }}>
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <div className="flex flex-col gap-3">
              {notifications.length > 0 && (
                <div className="flex justify-end">
                  <button onClick={markAllRead} className="btn-ghost text-xs">
                    Mark all read
                  </button>
                </div>
              )}
              <div className="card rounded-xl overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm" style={{ color: 'var(--text3)' }}>
                    No new notifications 🎉
                  </div>
                ) : notifications.map((n, i) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3"
                    style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--blue-bg)', color: 'var(--blue)', fontSize: 14 }}>
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{ color: 'var(--text)' }}>
                        New sign up: <strong>{n.payload?.email}</strong>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text4)' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => approveUser(n.payload?.user_id)}
                        className="btn-secondary text-xs px-2.5 py-1"
                        style={{ borderColor: 'var(--green-border)', color: 'var(--green)', background: 'var(--green-bg)' }}>
                        Approve
                      </button>
                      <button onClick={() => { updateRole(n.payload?.user_id, 'rejected'); markNotificationRead(n.id) }}
                        className="btn-secondary text-xs px-2.5 py-1"
                        style={{ borderColor: 'var(--red-border)', color: 'var(--red)', background: 'var(--red-bg)' }}>
                        Reject
                      </button>
                      <button onClick={() => markNotificationRead(n.id)}
                        className="btn-ghost text-xs" style={{ color: 'var(--text4)' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
