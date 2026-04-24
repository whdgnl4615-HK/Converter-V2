import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function PendingPage() {
  const { signOut, user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  async function handleRefresh() {
    await refreshProfile()
    navigate(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="card-elevated rounded-2xl p-10 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Pending Approval
        </h1>
        <p className="text-sm mb-1" style={{ color: 'var(--text2)' }}>
          Your account is pending admin review.
        </p>
        <p className="text-xs mb-6 font-mono" style={{ color: 'var(--text3)' }}>
          {user?.email}
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={handleRefresh}
            className="btn-secondary text-sm flex items-center gap-1.5">
            ↻ Refresh
          </button>
          <button onClick={handleLogout}
            className="btn-secondary text-sm"
            style={{ color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
