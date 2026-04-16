import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

const MODES = [
  { label: '25 min', work: 25, icon: '🍅' },
  { label: '50 min', work: 50, icon: '🔥' },
]
const BREAK_MINS = 5

export default function FocusTimerModal({ task, onClose }) {
  const { awardXP, toggleTask, showBanner } = useApp()
  const [modeIdx, setModeIdx] = useState(0)
  const [phase, setPhase] = useState('work') // 'work' | 'break' | 'done'
  const [secsLeft, setSecsLeft] = useState(MODES[0].work * 60)
  const [running, setRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const intervalRef = useRef(null)
  const audioCtx = useRef(null)

  const mode = MODES[modeIdx]
  const totalSecs = phase === 'work' ? mode.work * 60 : BREAK_MINS * 60
  const pct = ((totalSecs - secsLeft) / totalSecs) * 100
  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0')
  const secs = String(secsLeft % 60).padStart(2, '0')

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            handlePhaseEnd()
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, phase, modeIdx])

  function playDone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ;[0, 0.15, 0.3].forEach((delay, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = [523, 659, 784][i]
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.4)
      })
    } catch {}
  }

  async function handlePhaseEnd() {
    playDone()
    setRunning(false)
    if (phase === 'work') {
      const xp = modeIdx === 0 ? 25 : 50
      await awardXP(xp)
      setSessionsCompleted(n => n + 1)
      setPhase('break')
      setSecsLeft(BREAK_MINS * 60)
      showBanner(`Focus session done! +${xp} XP 🍅`)
    } else {
      setPhase('done')
    }
  }

  function selectMode(i) {
    if (running) return
    setModeIdx(i)
    setPhase('work')
    setSecsLeft(MODES[i].work * 60)
  }

  function reset() {
    setRunning(false)
    setPhase('work')
    setSecsLeft(mode.work * 60)
    setSessionsCompleted(0)
  }

  function startBreak() {
    setPhase('break')
    setSecsLeft(BREAK_MINS * 60)
    setRunning(true)
  }

  function skipBreak() {
    setPhase('work')
    setSecsLeft(mode.work * 60)
  }

  const radius = 72
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference

  const phaseColor = phase === 'work' ? '#1D9E75' : '#74C0FC'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000, padding: '0 0 24px'
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 24, padding: '28px 24px 24px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 -4px 40px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.28s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: 'var(--ink)' }}>Focus Timer</div>
            {task && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📌 {task.text}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>×</button>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {MODES.map((m, i) => (
            <button key={m.label} onClick={() => selectMode(i)} disabled={running} style={{
              flex: 1, padding: '6px 0', borderRadius: 10, border: 'none', cursor: running ? 'default' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500,
              background: modeIdx === i ? phaseColor : 'var(--raised)',
              color: modeIdx === i ? '#fff' : 'var(--muted)',
              opacity: running && modeIdx !== i ? 0.4 : 1,
            }}>{m.icon} {m.label}</button>
          ))}
        </div>

        {/* Ring timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <svg width={176} height={176} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={88} cy={88} r={radius} fill="none" stroke="var(--raised)" strokeWidth={10} />
            <circle cx={88} cy={88} r={radius} fill="none" stroke={phaseColor} strokeWidth={10}
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }} />
          </svg>
          <div style={{ marginTop: -108, textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 42, color: 'var(--ink)', letterSpacing: '-1px' }}>{mins}:{secs}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {phase === 'work' ? 'Focus' : phase === 'break' ? 'Break' : 'Done!'}
            </div>
          </div>
          <div style={{ marginTop: 62 }} />
        </div>

        {/* Sessions */}
        {sessionsCompleted > 0 && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--green)', marginBottom: 16 }}>
            {'🍅'.repeat(sessionsCompleted)} {sessionsCompleted} session{sessionsCompleted !== 1 ? 's' : ''} completed
          </div>
        )}

        {/* Controls */}
        {phase === 'done' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={skipBreak} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--green)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Another round 🍅
            </button>
            {task && <button onClick={async () => { await toggleTask(task.id); onClose() }} style={{ flex: 1, padding: 12, borderRadius: 12, border: '0.5px solid var(--border2)', background: 'var(--raised)', color: 'var(--ink)', fontSize: 14, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Mark done ✓
            </button>}
          </div>
        ) : phase === 'break' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRunning(r => !r)} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: phaseColor, color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {running ? '⏸ Pause' : '▶ Resume break'}
            </button>
            <button onClick={skipBreak} style={{ flex: 1, padding: 12, borderRadius: 12, border: '0.5px solid var(--border2)', background: 'var(--raised)', color: 'var(--ink)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Skip →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setRunning(r => !r)} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: phaseColor, color: '#fff', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {running ? '⏸ Pause' : secsLeft === mode.work * 60 ? '▶ Start' : '▶ Resume'}
            </button>
            <button onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 12, border: '0.5px solid var(--border2)', background: 'var(--raised)', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
