import { useState } from 'react'

const COLORS = [
  '#e53935', '#e53935', '#e57c35', '#e5a435',
  '#e5c435', '#b5c435', '#85c435', '#55c435',
  '#35c455', '#1D9E75'
]

export default function DayRatingModal({ onRate, onDismiss }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleRate(n) {
    setSelected(n)
    setSaving(true)
    await onRate(n)
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000, padding: '0 0 24px'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 20, padding: '28px 24px 24px',
        width: '100%', maxWidth: 420, boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.28s ease'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 32 }}>🌙</div>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: 'var(--ink)', marginTop: 8 }}>
            How did your day go?
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Rate yourself from 1 (rough) to 10 (crushed it)
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 22, justifyContent: 'center' }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              disabled={saving}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleRate(n)}
              style={{
                flex: 1, aspectRatio: '1', borderRadius: 10, border: 'none',
                cursor: saving ? 'default' : 'pointer',
                background: selected === n
                  ? COLORS[n - 1]
                  : hovered != null && n <= hovered
                    ? COLORS[hovered - 1] + '88'
                    : 'var(--raised)',
                color: selected === n ? '#fff' : 'var(--ink)',
                fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 14,
                transition: 'background 0.12s, transform 0.1s',
                transform: hovered === n ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <button onClick={onDismiss} style={{
          width: '100%', marginTop: 16, padding: '10px', border: 'none',
          background: 'transparent', color: 'var(--muted)', fontSize: 13,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
        }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
