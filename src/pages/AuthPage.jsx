import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LangContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const { T, lang, setLang } = useLang()
  const [mode, setMode]         = useState('login') // login | signup
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')
  const [done, setDone]         = useState(false)

  async function handleSubmit(e) {
    e?.preventDefault()
    console.log('handleSubmit called', mode, email)
    setErr('')
    if (mode === 'signup' && password !== confirm) {
      setErr('Passwords do not match'); return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        console.log('calling signIn...')
        await signIn(email, password)
        console.log('signIn success')
      } else {
        await signUp(email, password, fullName)
        setDone(true)
      }
    } catch (e) {
      console.log('signIn error:', e.message)
      setErr(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Check your email
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text3)' }}>
          We sent a confirmation link to <strong>{email}</strong>.<br />
          After confirming, your account will be reviewed by an admin.
        </p>
        <button onClick={() => { setDone(false); setMode('login') }}
          className="btn-secondary text-sm">
          Back to Sign In
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(84,104,212,0.35)' }}>
            <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>N</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            N41 Converter
          </span>
        </div>

        {/* Card */}
        <div className="card-elevated rounded-2xl p-8">
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>
            {mode === 'login'
              ? 'Sign in to your N41 Converter account'
              : 'Sign up — admin approval required'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                  Full Name
                </label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="input-base w-full" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                Email
              </label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" placeholder="you@company.com" required
                className="input-base w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                Password
              </label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                type="password" placeholder="••••••••" required
                className="input-base w-full" />
            </div>
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text2)' }}>
                  Confirm Password
                </label>
                <input value={confirm} onChange={e => setConfirm(e.target.value)}
                  type="password" placeholder="••••••••" required
                  className="input-base w-full" />
              </div>
            )}

            {err && (
              <div className="text-xs px-3 py-2 rounded-lg"
                style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red-border)' }}>
                {err}
              </div>
            )}

            <button type="submit" onClick={handleSubmit} disabled={loading}
              className="btn-primary w-full py-2.5 mt-1 text-sm"
              style={{ opacity: loading ? 0.7 : 1, cursor: 'pointer' }}>
              {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr('') }}
              className="text-xs" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Lang toggle */}
        <div className="flex justify-center mt-4">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--s2)' }}>
            {['ko','en'].map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{
                  padding: '3px 12px', borderRadius: 6, fontSize: 11,
                  background: lang === l ? 'var(--s1)' : 'transparent',
                  color: lang === l ? 'var(--text2)' : 'var(--text4)',
                  fontWeight: lang === l ? 500 : 400,
                  border: 'none', cursor: 'pointer',
                  boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>
                {l === 'ko' ? '한국어' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
