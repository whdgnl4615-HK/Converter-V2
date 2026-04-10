import { Outlet, NavLink } from 'react-router-dom'
import { useLang } from '../../contexts/LangContext'
import { MODULES } from '../../lib/n41Schema'

const MODULE_PATHS = {
  sales_order: '/sales-order',
  purchase_order: '/purchase-order',
  style: '/style',
  customer: '/customer',
  inventory: '/inventory',
}

export default function Layout() {
  const { T, lang, setLang } = useLang()

  return (
    <div className="flex min-h-screen" style={{background:'var(--bg)'}}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{background:'var(--s1)',borderRight:'1px solid var(--border)'}}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{borderColor:'var(--border)'}}>
          <div className="mono text-base font-bold" style={{color:'var(--text)'}}>
            N41 <span style={{color:'var(--accent)'}}>Converter</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {MODULES.map(m => (
            <NavLink key={m.key} to={MODULE_PATHS[m.key]}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'active-nav' : ''}`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
              })}>
              <span>{m.icon}</span>
              <span>{lang === 'ko' ? m.label_ko : m.label_en}</span>
            </NavLink>
          ))}

          <div className="my-2 border-t" style={{borderColor:'var(--border)'}} />

          <NavLink to="/sync"
            className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all`}
            style={({ isActive }) => ({
              background: isActive ? 'rgba(92,190,247,0.1)' : 'transparent',
              color: isActive ? 'var(--blue)' : 'var(--text2)',
              border: isActive ? '1px solid rgba(92,190,247,0.3)' : '1px solid transparent',
            })}>
            <span>🔄</span>
            <span>Platform Sync</span>
          </NavLink>

          <div className="my-2 border-t" style={{borderColor:'var(--border)'}} />

          <NavLink to="/admin"
            className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all`}
            style={({ isActive }) => ({
              background: isActive ? 'rgba(247,163,92,0.1)' : 'transparent',
              color: isActive ? 'var(--orange)' : 'var(--text2)',
              border: isActive ? '1px solid rgba(247,163,92,0.3)' : '1px solid transparent',
            })}>
            <span>⚙️</span>
            <span>{T.admin.title}</span>
          </NavLink>
        </nav>

        {/* Footer - lang toggle only */}
        <div className="px-3 py-4 border-t" style={{borderColor:'var(--border)'}}>
          <div className="flex gap-1 rounded-lg p-1" style={{background:'var(--s2)',border:'1px solid var(--border)'}}>
            {['ko','en'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                className="flex-1 py-1 rounded text-xs mono transition-all"
                style={lang===l ? {background:'var(--accent)',color:'white'} : {color:'var(--text3)'}}>
                {l === 'ko' ? '한국어' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
