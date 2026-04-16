import { useRef, useState } from 'react'
import { useApp, getXPRank } from '../context/AppContext'

export default function ShareableCard({ onClose }) {
  const { profile } = useApp()
  const cardRef = useRef(null)
  const [copying, setCopying] = useState(false)

  const xp = profile?.xp || 0
  const streak = profile?.streak || 0
  const rank = getXPRank(xp)
  const name = profile?.name || profile?.email?.split('@')[0] || 'Focuser'

  async function handleShare() {
    setCopying(true)
    try {
      // Use html2canvas if available, otherwise fall back to clipboard text
      if (window.html2canvas) {
        const canvas = await window.html2canvas(cardRef.current, { scale: 2, useCORS: true })
        canvas.toBlob(async blob => {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            alert('Card copied to clipboard! Paste it anywhere.')
          } catch {
            const url = canvas.toDataURL()
            const a = document.createElement('a'); a.href = url; a.download = 'focus-progress.png'; a.click()
          }
        })
      } else {
        // Text fallback
        const text = `🎯 Focus App Progress\n\n👤 ${name}\n🔥 ${streak} day streak\n⚡ ${xp.toLocaleString()} XP${rank ? `\n${rank.label} rank` : ''}\n\nfocus-app-zeta-two.vercel.app`
        await navigator.clipboard.writeText(text)
        alert('Progress copied to clipboard!')
      }
    } catch {}
    setCopying(false)
  }

  const rankBg = rank?.gradient || 'linear-gradient(135deg, #1D9E75, #0d6e52)'
  const rankGlow = rank?.glow || '#1D9E7580'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'slideUp 0.28s ease' }}>
        {/* The card itself */}
        <div ref={cardRef} style={{
          background: 'linear-gradient(145deg, #0f1f1a 0%, #0d2e22 50%, #0a1f18 100%)',
          borderRadius: 24, padding: '32px 28px',
          boxShadow: `0 0 60px ${rankGlow}, 0 20px 60px rgba(0,0,0,0.5)`,
          position: 'relative', overflow: 'hidden',
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {/* Background glow orbs */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: rankGlow, filter: 'blur(60px)', opacity: 0.6 }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: '#1D9E7540', filter: 'blur(50px)' }} />

          {/* App brand */}
          <div style={{ fontSize: 12, color: '#4ecca3', fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20, position: 'relative' }}>
            Focus — Daily Planner
          </div>

          {/* Name & rank */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, position: 'relative' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: rankBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
              boxShadow: `0 0 20px ${rankGlow}`,
            }}>
              {rank ? ['🥈','🥇','💠','💎','👑'][['rank_silver','rank_gold','rank_platinum','rank_diamond','rank_master'].indexOf(rank.id)] : '🌱'}
            </div>
            <div>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#fff' }}>{name}</div>
              {rank && <div style={{ fontSize: 12, marginTop: 2, background: rankBg, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>{rank.label} Rank</div>}
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, position: 'relative' }}>
            {[
              { val: `${streak}`, label: 'Day Streak', icon: '🔥' },
              { val: xp.toLocaleString(), label: 'Total XP', icon: '⚡' },
              { val: `${profile?.badges?.length || 0}`, label: 'Badges', icon: '🏅' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 14,
                padding: '14px 10px', textAlign: 'center',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)', position: 'relative' }}>
            focus-app-zeta-two.vercel.app
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={handleShare} disabled={copying} style={{
            flex: 2, padding: 13, borderRadius: 14, border: 'none',
            background: 'var(--green)', color: '#fff',
            fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
            {copying ? 'Copying…' : '📤 Share / Save'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: 14,
            border: '0.5px solid var(--border2)', background: 'var(--raised)',
            color: 'var(--ink)', fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>Close</button>
        </div>
      </div>
    </div>
  )
}
