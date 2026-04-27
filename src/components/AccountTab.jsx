import { useState, useEffect } from 'react'
import { useApp, BADGE_DEFS, XP_RANKS, getXPRank } from '../context/AppContext'
import ShareableCard from './ShareableCard'

const PRICE = 4.99

export default function AccountTab() {
  const { profile, signOut, deleteAccount, daysLeft, isPro, startCheckout, cancelSubscription, updateProfile, showBanner, registerPush, unregisterPush, isPushEnabled } = useApp()
  const [cancelling, setCancelling] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [workStart, setWorkStart] = useState(profile?.work_start ?? 8)
  const [workEnd, setWorkEnd] = useState(profile?.work_end ?? 18)
  const [pushOn, setPushOn] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => { isPushEnabled().then(setPushOn) }, [])

  async function togglePush() {
    setPushLoading(true)
    if (pushOn) {
      await unregisterPush()
      setPushOn(false)
      showBanner('Push notifications disabled.')
    } else {
      const result = await registerPush()
      if (result === true) {
        setPushOn(true)
        showBanner('Push notifications enabled! You\'ll get lock screen alerts.')
      } else if (result === 'denied') {
        showBanner('Notifications blocked — go to your browser site settings and allow notifications for this site.')
      } else if (result === 'unsupported') {
        showBanner('Your browser doesn\'t support push notifications.')
      } else if (result === 'db') {
        showBanner('Enabled but couldn\'t save — try signing out and back in.')
      } else {
        showBanner('Could not enable notifications — check the browser console for details.')
      }
    }
    setPushLoading(false)
  }

  const isNativeApp = window.navigator.userAgent.includes('Capacitor') || !!window.Capacitor
  const pro = isPro()
  const left = daysLeft()
  const theme = profile?.theme || 'light'
  const xp = profile?.xp || 0
  const currentRank = getXPRank(xp)
  const nextRank = XP_RANKS.find(r => xp < r.min) || null
  const badges = Array.isArray(profile?.badges) ? profile.badges : []
  const RANK_IDS = new Set(['rank_silver','rank_gold','rank_platinum','rank_diamond','rank_master'])
  const earnedBadges = BADGE_DEFS.filter(b => badges.includes(b.id) && !RANK_IDS.has(b.id))
  const lockedBadges = BADGE_DEFS.filter(b => !badges.includes(b.id) && !RANK_IDS.has(b.id))

  async function handleSubscribe() {
    setSubscribing(true)
    try { await startCheckout() } catch { setSubscribing(false) }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel your subscription? You'll lose access when your billing period ends.")) return
    setCancelling(true)
    try { await cancelSubscription() } finally { setCancelling(false) }
  }

  async function toggleTheme() {
    await updateProfile({ theme: theme === 'light' ? 'dark' : 'light' })
  }

  async function saveWorkHours() {
    if (workStart >= workEnd) { showBanner('Start must be before end.'); return }
    await updateProfile({ work_start: workStart, work_end: workEnd })
    showBanner('Work hours saved.')
  }

  function fmtHour(h) {
    if (h === 0) return '12 am'
    if (h === 12) return '12 pm'
    return h > 12 ? `${h - 12} pm` : `${h} am`
  }

  return (
    <>
      {/* Profile */}
      <div className="account-card">
        <div className="account-row">
          <span className="account-row-label">Name</span>
          <span className="account-row-val">{profile?.name || '—'}</span>
        </div>
        <div className="account-row">
          <span className="account-row-label">Email</span>
          <span className="account-row-val">{profile?.email || '—'}</span>
        </div>
        <div className="account-row">
          <span className="account-row-label">Status</span>
          <span className={`status-pill ${pro ? 'pro' : 'trial'}`}>{pro ? 'Pro subscriber' : 'Free trial'}</span>
        </div>
        {pro
          ? <div className="account-row"><span className="account-row-label">Billing</span><span className="account-row-val">${PRICE}/month</span></div>
          : <div className="account-row"><span className="account-row-label">Trial days left</span><span className="account-row-val">{left}</span></div>
        }
        <div className="account-row">
          <span className="account-row-label">XP</span>
          <span className="account-row-val" style={{ color: 'var(--green)' }}>{profile?.xp || 0} xp</span>
        </div>
        <div className="account-row" style={{ borderBottom: 'none' }}>
          <span className="account-row-label">Streak</span>
          <span className="account-row-val">{profile?.streak || 0} days {!profile?.shield_used && '🛡️'}</span>
        </div>
      </div>

      {/* Theme */}
      <div className="account-card" style={{ marginBottom: 12 }}>
        <div className="account-row">
          <span className="account-row-label">Theme</span>
          <button onClick={toggleTheme} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'var(--raised)',
            border: '0.5px solid var(--border2)', borderRadius: 20, padding: '5px 14px',
            cursor: 'pointer', fontSize: 13, color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif'
          }}>
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div className="account-row" style={{ borderBottom: 'none' }}>
          <span className="account-row-label">Notifications</span>
          <button onClick={togglePush} disabled={pushLoading} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: pushOn ? 'var(--green)' : 'var(--raised)',
            border: '0.5px solid var(--border2)', borderRadius: 20, padding: '5px 14px',
            cursor: 'pointer', fontSize: 13, color: pushOn ? '#fff' : 'var(--ink)', fontFamily: 'DM Sans, sans-serif',
            opacity: pushLoading ? 0.6 : 1
          }}>
            {pushLoading ? '…' : pushOn ? '🔔 On' : '🔕 Off'}
          </button>
        </div>
      </div>

      {/* Work hours */}
      <div className="account-card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Work hours (used for auto-schedule)</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {[['Start', workStart, setWorkStart, 5, 20], ['End', workEnd, setWorkEnd, 6, 24]].map(([label, val, setter, min, max]) => (
            <div key={label} style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{label}</label>
              <select value={val} onChange={e => setter(Number(e.target.value))} style={{
                width: '100%', padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--border2)',
                background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif', fontSize: 13
              }}>
                {Array.from({ length: max - min }, (_, i) => i + min).map(h => <option key={h} value={h}>{fmtHour(h)}</option>)}
              </select>
            </div>
          ))}
          <button onClick={saveWorkHours} style={{
            padding: '7px 14px', borderRadius: 8, background: 'var(--green)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', flexShrink: 0
          }}>Save</button>
        </div>
      </div>

      {/* Rank */}
      <div className="sec-title">Rank</div>
      <div style={{ marginBottom: 16 }}>
        {currentRank ? (
          <div style={{
            background: currentRank.gradient, borderRadius: 14, padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10,
            boxShadow: `0 4px 24px ${currentRank.glow}`,
          }}>
            <div style={{ fontSize: 44, lineHeight: 1 }}>
              {BADGE_DEFS.find(b => b.id === currentRank.id)?.icon}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>{currentRank.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{xp.toLocaleString()} XP</div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--raised)', borderRadius: 14, padding: '14px 16px', fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
            No rank yet — reach 1,000 XP to earn Silver
          </div>
        )}
        {nextRank && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Next: <b style={{ color: 'var(--ink)' }}>{nextRank.label}</b> at {nextRank.min.toLocaleString()} XP</span>
            <span>{(nextRank.min - xp).toLocaleString()} XP to go</span>
          </div>
        )}
        {nextRank && (
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: nextRank.gradient,
              width: `${Math.min(100, Math.round(((xp - (currentRank?.min || 0)) / (nextRank.min - (currentRank?.min || 0))) * 100))}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}

        {/* Rank tiers overview */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, justifyContent: 'center' }}>
          {XP_RANKS.map(r => {
            const earned = xp >= r.min
            const badge = BADGE_DEFS.find(b => b.id === r.id)
            return (
              <div key={r.id} title={`${r.label} — ${r.min.toLocaleString()} XP`} style={{
                flex: 1, textAlign: 'center', opacity: earned ? 1 : 0.3,
                filter: earned ? 'none' : 'grayscale(1)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', margin: '0 auto 4px',
                  background: earned ? r.gradient : 'var(--raised)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                  boxShadow: earned && currentRank?.id === r.id ? `0 0 10px ${r.glow}` : 'none',
                  border: currentRank?.id === r.id ? `2px solid ${r.color}` : '2px solid transparent',
                }}>{badge?.icon}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 500 }}>{r.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="sec-title">Badges</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {earnedBadges.map(b => (
          <div key={b.id} style={{ background: 'var(--green-light)', border: '0.5px solid var(--green)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{b.icon}</span>
            <div><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{b.name}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>{b.desc}</div></div>
          </div>
        ))}
        {lockedBadges.map(b => (
          <div key={b.id} style={{ background: 'var(--raised)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.45 }}>
            <span style={{ fontSize: 22, filter: 'grayscale(1)' }}>{b.icon}</span>
            <div><div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{b.name}</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>{b.desc}</div></div>
          </div>
        ))}
      </div>

      {!pro && !isNativeApp && <button className="btn-primary" onClick={handleSubscribe} disabled={subscribing} style={{ marginBottom: 12 }}>{subscribing ? 'Redirecting…' : `Upgrade to Pro — $${PRICE}/mo`}</button>}
      {!pro && isNativeApp && <div style={{ background: 'var(--raised)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--muted)', marginBottom: 12, textAlign: 'center' }}>To subscribe, visit focus-app-zeta-two.vercel.app</div>}
      {pro && <button className="btn-danger" onClick={handleCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Cancel subscription'}</button>}
      {showShare && <ShareableCard onClose={() => setShowShare(false)} />}
      <button onClick={() => setShowShare(true)} style={{
        width: '100%', padding: '11px', borderRadius: 10, marginBottom: 10,
        background: 'var(--raised)', border: '0.5px solid var(--border2)',
        color: 'var(--ink)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif',
      }}>📤 Share my progress card</button>
      <button className="btn-danger" onClick={signOut}>Sign out</button>
      <button className="btn-danger" onClick={async () => {
        if (!window.confirm('Delete your account? This permanently removes all your data and cannot be undone.')) return
        await deleteAccount()
      }} style={{ marginTop: 8, background: '#fff', color: '#c0392b', border: '1px solid #c0392b' }}>Delete account</button>
    </>
  )
}
