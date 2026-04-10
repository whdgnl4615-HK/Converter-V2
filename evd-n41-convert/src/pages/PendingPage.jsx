import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LangContext'

export default function PendingPage() {
  const { signOut, user, refreshProfile } = useAuth()
  const { T } = useLang()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  async function handleRefresh() {
    await refreshProfile()
    // navigate triggers re-render via App routing
    navigate(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-semibold mb-2 mono" style={{color:'var(--text)'}}>
          {T.auth.pending}
        </h1>
        <p className="text-sm mb-1" style={{color:'var(--text2)'}}>{T.auth.pendingMsg}</p>
        <p className="text-xs mb-6 mono" style={{color:'var(--text3)'}}>{user?.email}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={handleRefresh}
            className="px-4 py-2 rounded-lg text-sm mono transition-all"
            style={{background:'var(--accent-glow)',border:'1px solid var(--accent)',color:'var(--accent)'}}>
            ↻ 새로고침
          </button>
          <button onClick={handleLogout}
            className="px-4 py-2 rounded-lg text-sm mono transition-all"
            style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text2)'}}
            onMouseEnter={e => e.currentTarget.style.borderColor='var(--red)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--border2)'}>
            {T.nav.logout}
          </button>
        </div>
      </div>
    </div>
  )
}
