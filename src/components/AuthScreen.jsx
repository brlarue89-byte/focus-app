import { useState } from 'react'
import { useApp } from '../context/AppContext'
import NotifBanner from './NotifBanner'

const RATE_KEY = 'auth_attempts'
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit() {
  const raw = localStorage.getItem(RATE_KEY)
  const attempts = raw ? JSON.parse(raw) : []
  const now = Date.now()
  const recent = attempts.filter(t => now - t < WINDOW_MS)
  recent.push(now)
  localStorage.setItem(RATE_KEY, JSON.stringify(recent))
  if (recent.length > MAX_ATTEMPTS) {
    const oldest = recent[recent.length - MAX_ATTEMPTS - 1]
    const unlockIn = Math.ceil((oldest + WINDOW_MS - now) / 60000)
    return `Too many attempts. Try again in ${unlockIn} minute${unlockIn !== 1 ? 's' : ''}.`
  }
  return null
}

export default function AuthScreen() {
  const { signIn, signUp } = useApp()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    const limited = checkRateLimit()
    if (limited) { setError(limited); return }
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Incorrect email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    const limited = checkRateLimit()
    if (limited) { setError(limited); return }
    setLoading(true)
    try {
      await signUp(name, email, password)
    } catch (err) {
      setError(err.message || 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setName('')
    setEmail('')
    setPassword('')
  }

  return (
    <>
      <NotifBanner />
      <div className="app auth-wrap">
        <div className="auth-logo">Focus</div>
        <div className="auth-tagline">
          {mode === 'login' ? 'Your intentional daily planner.' : 'Start your free 7-day trial.'}
        </div>

        {mode === 'register' && (
          <div className="trial-badge">7 days free · then $4.99/month</div>
        )}

        <div className="auth-card">
          <div className="auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            {mode === 'register' && (
              <div className="field">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus={mode === 'login'}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Start free trial'}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>No account? <button onClick={() => switchMode('register')}>Create one — free 7-day trial</button></>
            ) : (
              <>Already have an account? <button onClick={() => switchMode('login')}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
