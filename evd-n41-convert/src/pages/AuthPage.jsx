import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLang } from '../contexts/LangContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const { T, lang, setLang } = useLang()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (mode === 'signup' && password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.'); return
    }
    setLoading(true)
    try {
      if (mode === 'login') await signIn(email, password)
      else if (mode === 'signup') {
        await signUp(email, password)
        setInfo(lang === 'ko' ? '가입 완료! 관리자 승인 후 이용 가능합니다.' : 'Account created! Awaiting admin approval.')
      }
    } catch (err) {
      setError(err.message || T.auth.invalidCredentials)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--bg)'}}>
      {/* Lang toggle */}
      <div className="fixed top-4 right-4 flex gap-1 rounded-lg p-1" style={{background:'var(--s2)',border:'1px solid var(--border)'}}>
        {['ko','en'].map(l => (
          <button key={l} onClick={() => setLang(l)}
            className="px-3 py-1 rounded text-xs mono transition-all"
            style={lang===l ? {background:'var(--accent)',color:'white'} : {color:'var(--text3)'}}>
            {l === 'ko' ? '한국어' : 'EN'}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mono text-2xl font-bold mb-1" style={{color:'var(--text)'}}>
            N41 <span style={{color:'var(--accent)'}}>Converter</span>
          </div>
          <div className="text-sm" style={{color:'var(--text2)'}}>
            {mode === 'login' ? T.auth.login : mode === 'signup' ? T.auth.signup : T.auth.forgotPassword}
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{background:'var(--s1)',border:'1px solid var(--border)'}}>
          {info ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-3">✅</div>
              <p className="text-sm" style={{color:'var(--green)'}}>{info}</p>
              <button onClick={() => { setInfo(''); setMode('login') }}
                className="mt-4 text-xs underline" style={{color:'var(--text2)'}}>
                {T.auth.switchToLogin}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs mono mb-1" style={{color:'var(--text2)',letterSpacing:'1px',textTransform:'uppercase'}}>
                  {T.auth.email}
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full rounded-lg px-3 py-2 text-sm mono outline-none transition-all"
                  style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)'}}
                  onFocus={e => e.target.style.borderColor='var(--accent)'}
                  onBlur={e => e.target.style.borderColor='var(--border2)'}
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block text-xs mono mb-1" style={{color:'var(--text2)',letterSpacing:'1px',textTransform:'uppercase'}}>
                    {T.auth.password}
                  </label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full rounded-lg px-3 py-2 text-sm mono outline-none transition-all"
                    style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)'}}
                    onFocus={e => e.target.style.borderColor='var(--accent)'}
                    onBlur={e => e.target.style.borderColor='var(--border2)'}
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs mono mb-1" style={{color:'var(--text2)',letterSpacing:'1px',textTransform:'uppercase'}}>
                    {T.auth.confirmPassword}
                  </label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    className="w-full rounded-lg px-3 py-2 text-sm mono outline-none transition-all"
                    style={{background:'var(--s2)',border:'1px solid var(--border2)',color:'var(--text)'}}
                    onFocus={e => e.target.style.borderColor='var(--accent)'}
                    onBlur={e => e.target.style.borderColor='var(--border2)'}
                  />
                </div>
              )}

              {error && <p className="text-xs" style={{color:'var(--red)'}}>{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm mono font-bold transition-all mt-1"
                style={{background:'var(--accent)',color:'white',opacity:loading?0.6:1}}>
                {loading ? '…' : mode === 'login' ? T.auth.loginBtn : mode === 'signup' ? T.auth.signupBtn : (lang==='ko'?'발송':'Send')}
              </button>

              <div className="flex flex-col gap-1 pt-1">
                {mode === 'login' && (
                  <>
                    <button type="button" onClick={() => { setMode('signup'); setError('') }}
                      className="text-xs text-center transition-all"
                      style={{color:'var(--text2)'}}
                      onMouseEnter={e => e.target.style.color='var(--accent)'}
                      onMouseLeave={e => e.target.style.color='var(--text2)'}>
                      {T.auth.switchToSignup}
                    </button>
                  </>
                )}
                {mode !== 'login' && (
                  <button type="button" onClick={() => { setMode('login'); setError('') }}
                    className="text-xs text-center transition-all"
                    style={{color:'var(--text2)'}}
                    onMouseEnter={e => e.target.style.color='var(--accent)'}
                    onMouseLeave={e => e.target.style.color='var(--text2)'}>
                    {T.auth.switchToLogin}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
