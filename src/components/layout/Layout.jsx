import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useLang } from '../../contexts/LangContext'
import { useAuth } from '../../contexts/AuthContext'
import { MODULES } from '../../lib/n41Schema'

const MODULE_PATHS = {
  sales_order: '/sales-order',
  purchase_order: '/purchase-order',
  style: '/style',
  customer: '/customer',
  inventory: '/inventory',
}

const MODULE_ICONS = {
  sales_order:    { icon: '◈', color: '#5468d4' },
  purchase_order: { icon: '◎', color: '#0ea5e9' },
  style:          { icon: '◆', color: '#8b5cf6' },
  customer:       { icon: '◉', color: '#10b981' },
  inventory:      { icon: '▣', color: '#f59e0b' },
}

export default function Layout() {
  const { T, lang, setLang } = useLang()
  const { profile, isAdmin, signOut, unreadCount } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col"
        style={{
          background: 'var(--s1)',
          borderRight: '1px solid var(--border)',
          boxShadow: '1px 0 0 var(--border)',
        }}>

        {/* Logo */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent)', boxShadow: '0 1px 4px rgba(84,104,212,0.35)' }}>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'Inter' }}>N</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                N41 Converter
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 mb-2">
          <div style={{ height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">

          {/* Converter section */}
          <div className="px-2 pb-1 pt-1">
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Converter
            </span>
          </div>

          {MODULES.map(m => {
            const mi = MODULE_ICONS[m.key] || { icon: '◇', color: 'var(--accent)' }
            return (
              <NavLink key={m.key} to={MODULE_PATHS[m.key]}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all"
                style={({ isActive }) => ({
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text3)',
                  fontWeight: isActive ? 500 : 400,
                })}>
                {({ isActive }) => (
                  <>
                    <span style={{ fontSize: 12, color: isActive ? mi.color : 'var(--text4)', transition: 'color 0.15s' }}>
                      {mi.icon}
                    </span>
                    <span style={{ fontSize: 13 }}>{lang === 'ko' ? m.label_ko : m.label_en}</span>
                  </>
                )}
              </NavLink>
            )
          })}

          <div className="px-2 pb-1 pt-3">
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Tools
            </span>
          </div>

          <NavLink to="/pdf-converter"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all"
            style={({ isActive }) => ({
              background: isActive ? '#fff7ed' : 'transparent',
              color: isActive ? 'var(--orange)' : 'var(--text3)',
              fontWeight: isActive ? 500 : 400,
            })}>
            {({ isActive }) => (
              <>
                <span style={{ fontSize: 12, color: isActive ? 'var(--orange)' : 'var(--text4)' }}>⬡</span>
                <span style={{ fontSize: 13 }}>PDF → SO</span>
              </>
            )}
          </NavLink>

          <NavLink to="/sync"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all"
            style={({ isActive }) => ({
              background: isActive ? 'var(--blue-bg)' : 'transparent',
              color: isActive ? 'var(--blue)' : 'var(--text3)',
              fontWeight: isActive ? 500 : 400,
            })}>
            {({ isActive }) => (
              <>
                <span style={{ fontSize: 12, color: isActive ? 'var(--blue)' : 'var(--text4)' }}>⟳</span>
                <span style={{ fontSize: 13 }}>Platform Sync</span>
              </>
            )}
          </NavLink>

          {isAdmin && (
            <>
              <div className="px-2 pb-1 pt-3">
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Settings
                </span>
              </div>

              <NavLink to="/admin"
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all"
                style={({ isActive }) => ({
                  background: isActive ? 'var(--s2)' : 'transparent',
                  color: isActive ? 'var(--text2)' : 'var(--text3)',
                  fontWeight: isActive ? 500 : 400,
                })}>
                {({ isActive }) => (
                  <>
                    <span style={{ fontSize: 12, color: isActive ? 'var(--text2)' : 'var(--text4)' }}>⚙</span>
                    <span style={{ fontSize: 13 }}>{T.admin.title}</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto flex items-center justify-center rounded-full text-white"
                        style={{ background: 'var(--red)', fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, padding: '0 4px' }}>
                        {unreadCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          {/* User info + logout */}
          {profile && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>
                {(profile.full_name || profile.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text2)' }}>
                  {profile.full_name || profile.email?.split('@')[0]}
                </div>
                <div className="truncate" style={{ color: 'var(--text4)', fontSize: 10 }}>
                  {profile.email}
                </div>
              </div>
              <button onClick={handleLogout} title="Sign out"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text4)'}>
                ↪
              </button>
            </div>
          )}
          {/* Lang toggle */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--s2)' }}>
            {['ko', 'en'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="flex-1 py-1 rounded-md text-xs transition-all"
                style={{
                  background: lang === l ? 'var(--s1)' : 'transparent',
                  color: lang === l ? 'var(--text2)' : 'var(--text4)',
                  fontWeight: lang === l ? 500 : 400,
                  boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter',
                }}>
                {l === 'ko' ? '한국어' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
