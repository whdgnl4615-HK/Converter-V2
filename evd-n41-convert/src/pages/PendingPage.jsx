import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LangContext'

export default function PendingPage() {
  const { signOut, user } = useAuth()
  const { T } = useLang()

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-semibold mb-2 mono" style={{color:'var(--text)'}}>
          {T.auth.pending}
        </h1>
        <p className="text-sm mb-1" style={{color:'var(--text2)'}}>{T.auth.pendingMsg}</p>
        <p className="text-xs mb-6 mono" style={{color:'var(--text3)'}}>{user?.email}</p>
        <button onClick={signOut}
          className="px-4 py-2 rounded-lg text-sm mono transition-all"
          style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text2)'}}
          onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='var(--border2)'}>
          {T.nav.logout}
        </button>
      </div>
    </div>
  )
}
