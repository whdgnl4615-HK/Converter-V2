import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LangContext'
import { useAuth } from '../contexts/AuthContext'

export default function AdminPage() {
  const { T } = useLang()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('users') // 'users' | 'pending' | 'invites'
  const [invitations, setInvitations] = useState([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: profiles }, { data: invs }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('invitations').select('*').order('created_at', { ascending: false }),
    ])
    setUsers(profiles || [])
    setInvitations(invs || [])
    setLoading(false)
  }

  function showMsg(type, text) {
    setInviteMsg({ type, text })
    setTimeout(() => setInviteMsg({ type: '', text: '' }), 3000)
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    try {
      const { error } = await supabase.from('invitations').insert({ email: inviteEmail.trim(), invited_by: user.id })
      if (error) throw error
      showMsg('ok', T.admin.inviteSent(inviteEmail.trim()))
      setInviteEmail('')
      fetchAll()
    } catch (e) { showMsg('err', e.message || T.admin.inviteErr) }
  }

  async function updateRole(id, role) {
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
      fetchAll()
    } catch (e) {
      showMsg('err', e.message || 'Failed to update role')
    }
  }

  async function deleteInvite(id) {
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', id)
      if (error) throw error
      fetchAll()
    } catch (e) {
      showMsg('err', e.message || 'Failed to delete invitation')
    }
  }

  const pending = users.filter(u => u.role === 'pending')
  const active  = users.filter(u => u.role !== 'pending')

  const ROLE_BADGE = {
    admin:   { bg: 'rgba(217,119,6,0.10)',  color: 'var(--orange)', label: 'admin' },
    user:    { bg: 'rgba(22,163,74,0.08)', color: 'var(--green)',  label: 'user' },
    pending: { bg: 'rgba(255,255,255,0.05)',color: 'var(--text3)', label: 'pending' },
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-bold mono mb-6" style={{color:'var(--text)'}}>{T.admin.title}</h1>

      {/* Invite */}
      <div className="rounded-xl p-5 mb-6" style={{background:'var(--s1)',border:'1px solid var(--border)'}}>
        <div className="text-xs mono uppercase mb-3" style={{color:'var(--text2)',letterSpacing:'1.5px'}}>{T.admin.invite}</div>
        <div className="flex gap-2">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInvite()}
            placeholder={T.admin.inviteEmail}
            type="email"
            className="flex-1 rounded-lg px-3 py-2 text-sm mono outline-none"
            style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)'}}
            onFocus={e => e.target.style.borderColor='var(--accent)'}
            onBlur={e => e.target.style.borderColor='var(--border2)'}
          />
          <button onClick={sendInvite}
            className="px-4 py-2 rounded-lg text-sm mono font-bold"
            style={{background:'var(--accent)',color:'white'}}>
            {T.admin.inviteBtn}
          </button>
        </div>
        {inviteMsg.text && (
          <p className="text-xs mt-2 mono" style={{color:inviteMsg.type==='ok'?'var(--green)':'var(--red)'}}>{inviteMsg.text}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          ['users', `${T.admin.activeUsers} (${active.length})`],
          ['pending', `${T.admin.pendingUsers} (${pending.length})`],
          ['invites', `Invitations (${invitations.length})`],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-3 py-1.5 rounded-lg text-xs mono transition-all"
            style={{
              background: tab===key ? 'var(--accent-glow)' : 'transparent',
              color: tab===key ? 'var(--accent)' : 'var(--text2)',
              border: `1px solid ${tab===key ? 'var(--accent)' : 'var(--border)'}`,
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm mono" style={{color:'var(--text3)'}}>Loading…</p>
      ) : (
        <>
          {/* Active users */}
          {tab === 'users' && (
            <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--border)'}}>
              {active.length === 0 ? (
                <p className="text-sm mono p-4 text-center" style={{color:'var(--text3)'}}>{T.admin.noUsers}</p>
              ) : active.map((u, i) => {
                const badge = ROLE_BADGE[u.role] || ROLE_BADGE.user
                return (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3"
                    style={{borderBottom: i<active.length-1 ? '1px solid var(--border)' : 'none',background:'var(--s1)'}}>
                    <div>
                      <div className="text-sm" style={{color:'var(--text)'}}>{u.email}</div>
                      <div className="text-xs mono mt-0.5" style={{color:'var(--text3)'}}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs mono px-2 py-0.5 rounded" style={{background:badge.bg,color:badge.color}}>
                        {badge.label}
                      </span>
                      {u.id !== user?.id && (
                        <>
                          {u.role !== 'admin' ? (
                            <button onClick={() => updateRole(u.id, 'admin')}
                              className="text-xs mono px-2 py-1 rounded transition-all"
                              style={{border:'1px solid var(--border2)',color:'var(--text2)'}}>
                              {T.admin.makeAdmin}
                            </button>
                          ) : (
                            <button onClick={() => updateRole(u.id, 'user')}
                              className="text-xs mono px-2 py-1 rounded transition-all"
                              style={{border:'1px solid var(--border2)',color:'var(--text2)'}}>
                              {T.admin.removeAdmin}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pending */}
          {tab === 'pending' && (
            <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--border)'}}>
              {pending.length === 0 ? (
                <p className="text-sm mono p-4 text-center" style={{color:'var(--text3)'}}>No pending users</p>
              ) : pending.map((u, i) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3"
                  style={{borderBottom: i<pending.length-1?'1px solid var(--border)':'none',background:'var(--s1)'}}>
                  <div>
                    <div className="text-sm" style={{color:'var(--text)'}}>{u.email}</div>
                    <div className="text-xs mono mt-0.5" style={{color:'var(--text3)'}}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateRole(u.id, 'user')}
                      className="text-xs mono px-3 py-1.5 rounded font-bold"
                      style={{background:'rgba(22,163,74,0.10)',color:'var(--green)',border:'1px solid rgba(22,163,74,0.20)'}}>
                      {T.admin.approve}
                    </button>
                    <button onClick={() => updateRole(u.id, 'rejected')}
                      className="text-xs mono px-3 py-1.5 rounded"
                      style={{background:'rgba(220,38,38,0.06)',color:'var(--red)',border:'1px solid rgba(220,38,38,0.15)'}}>
                      {T.admin.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invitations */}
          {tab === 'invites' && (
            <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--border)'}}>
              {invitations.length === 0 ? (
                <p className="text-sm mono p-4 text-center" style={{color:'var(--text3)'}}>No invitations</p>
              ) : invitations.map((inv, i) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3"
                  style={{borderBottom: i<invitations.length-1?'1px solid var(--border)':'none',background:'var(--s1)'}}>
                  <div>
                    <div className="text-sm mono" style={{color:'var(--text)'}}>{inv.email}</div>
                    <div className="text-xs mt-0.5 mono" style={{color:'var(--text3)'}}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs mono px-2 py-0.5 rounded"
                      style={inv.status==='accepted'
                        ? {background:'rgba(22,163,74,0.08)',color:'var(--green)'}
                        : {background:'rgba(37,99,235,0.06)',color:'var(--blue)'}}>
                      {inv.status}
                    </span>
                    {inv.status === 'pending' && (
                      <button onClick={() => deleteInvite(inv.id)}
                        className="text-xs mono px-2 py-1 rounded"
                        style={{border:'1px solid var(--border2)',color:'var(--text3)'}}>
                        취소
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
