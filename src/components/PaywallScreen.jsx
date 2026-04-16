import { useState } from 'react'
import { useApp } from '../context/AppContext'
import NotifBanner from './NotifBanner'

const PRICE = 4.99

export default function PaywallScreen() {
  const { signOut, startCheckout } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    setError('')
    setLoading(true)
    try {
      await startCheckout()
    } catch (err) {
      setError('Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <NotifBanner />
      <div className="app paywall">
        <div className="paywall-icon">🔒</div>
        <h2>Your trial has ended</h2>
        <p>
          Subscribe to keep planning your days with Focus — unlimited tasks,
          AI help, calendar scheduling, and reminders.
        </p>

        <div className="price-card">
          <div>
            <span className="price-amt">${PRICE}</span>
            <span className="price-per">/month</span>
          </div>
          <ul className="price-features">
            <li>5–10 tasks per day</li>
            <li>Drag-and-drop calendar</li>
            <li>Browser reminders</li>
            <li>AI task coach</li>
            <li>Progress streaks &amp; charts</li>
          </ul>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</p>}

        <button className="btn-subscribe" onClick={handleSubscribe} disabled={loading}>
          {loading ? 'Redirecting to checkout…' : `Subscribe for $${PRICE}/mo`}
        </button>
        <p className="paywall-note">Cancel anytime. No hidden fees.</p>
        <button className="paywall-logout" onClick={signOut}>Sign out</button>
      </div>
    </>
  )
}
