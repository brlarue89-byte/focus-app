import { useState, useRef } from 'react'
import { useApp, formatTime } from '../context/AppContext'
import FocusTimerModal from './FocusTimerModal'
import TaskTemplatesModal from './TaskTemplatesModal'

const TASK_MIN = 5
const TASK_MAX = 20

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDateLabel(dateStr) {
  const today = todayStr()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TasksTab({ onNavigate }) {
  const { tasks, addTask, deleteTask, toggleTask, toggleReminder, carryoverTask, carryoverAllUnfinished, setRecurring, showBanner, selectedDate, setSelectedDate, profile } = useApp()
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const [showTimer, setShowTimer] = useState(false)
  const [timerTask, setTimerTask] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { showBanner('Voice input not supported on this device.'); return }
    if (listening) { recognitionRef.current?.stop(); return }
    const r = new SR()
    r.lang = 'en-US'
    r.interimResults = false
    r.onstart = () => setListening(true)
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    r.onresult = e => {
      const text = e.results[0][0].transcript
      setInput(text)
      inputRef.current?.focus()
    }
    recognitionRef.current = r
    r.start()
  }

  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const streak = profile?.streak || 0

  function handleAdd() {
    const val = input.trim()
    if (!val) return
    if (total >= TASK_MAX) { showBanner(`Max of ${TASK_MAX} tasks reached.`); return }
    addTask(val)
    setInput('')
    inputRef.current?.focus()
  }

  const fillPct = Math.min(Math.round(total / TASK_MAX * 100), 100)
  const isWarn = total < TASK_MIN

  function progNote() {
    if (total >= TASK_MAX) return `Max of ${TASK_MAX} tasks — great planning!`
    if (total >= TASK_MIN) return `You're set! ${TASK_MAX - total} slot${TASK_MAX - total !== 1 ? 's' : ''} remaining.`
    return `Add ${TASK_MIN - total} more task${TASK_MIN - total !== 1 ? 's' : ''} to meet the minimum.`
  }

  const isPast = selectedDate < todayStr()

  function shiftDate(days) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  if (isPast) {
    return (
      <>
        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={() => shiftDate(-1)} style={{ background: 'none', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>‹</button>
          <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{fmtDateLabel(selectedDate)}</span>
          <button onClick={() => shiftDate(1)} style={{ background: 'none', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>›</button>
        </div>

        <div style={{ background: 'var(--raised)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: 'var(--muted)', marginBottom: 14, textAlign: 'center' }}>
          Past day — read only
        </div>

        {tasks.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginTop: 32 }}>No tasks recorded for this day.</div>
          : <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="sec-title" style={{ marginBottom: 0 }}>Tasks</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{done}/{total} completed</span>
              </div>
              <div>
                {tasks.map(task => (
                  <div key={task.id} className={`task-item${task.done ? ' done' : ''}`} style={{ opacity: task.done ? 0.6 : 1 }}>
                    <div className="task-check" style={{ pointerEvents: 'none' }}>
                      <svg className="task-chk" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="task-text">{task.text}</span>
                    {task.scheduled_hour != null && (
                      <span className="task-time-badge">{formatTime(task.scheduled_hour, task.scheduled_half)}</span>
                    )}
                    {!task.done && (
                      <button title="Carry over to today" onClick={() => carryoverTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', padding: '0 2px' }}>↪</button>
                    )}
                  </div>
                ))}
              </div>
            </>
        }
      </>
    )
  }

  return (
    <>
      {showTimer && <FocusTimerModal task={timerTask} onClose={() => { setShowTimer(false); setTimerTask(null) }} />}
      {showTemplates && <TaskTemplatesModal onClose={() => setShowTemplates(false)} />}

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => shiftDate(-1)} style={{ background: 'none', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>‹</button>
        <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{fmtDateLabel(selectedDate)}</span>
        <button onClick={() => shiftDate(1)} style={{ background: 'none', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>›</button>
      </div>

      <NextUpWidget tasks={tasks} onNavigate={onNavigate} />

      <div className="metrics">
        <div className="metric">
          <div className="metric-val">{streak}</div>
          <div className="metric-lbl">Streak</div>
        </div>
        <div className="metric">
          <div className="metric-val">{done}</div>
          <div className="metric-lbl">Done</div>
        </div>
        <div className="metric">
          <div className="metric-val">{total}/{TASK_MAX}</div>
          <div className="metric-lbl">Tasks set</div>
        </div>
      </div>

      <div className="prog-label">
        <span>Daily task goal (5–20)</span>
        <span>{total} of 5–20</span>
      </div>
      <div className="prog-track">
        <div className={`prog-fill${isWarn ? ' warn' : ''}`} style={{ width: fillPct + '%' }} />
      </div>
      <div className="prog-note">{progNote()}</div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="sec-title" style={{ marginBottom: 0 }}>Tasks</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowTemplates(true)} style={{
            fontSize: 11, color: 'var(--muted)', background: 'none', border: '0.5px solid var(--border2)',
            borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
          }}>📋 Templates</button>
          {tasks.some(t => !t.done) && (
            <button onClick={carryoverAllUnfinished} style={{
              fontSize: 11, color: 'var(--muted)', background: 'none', border: '0.5px solid var(--border2)',
              borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif'
            }}>↪ Carry all</button>
          )}
        </div>
      </div>

      <div>
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task.id)}
            onDelete={() => deleteTask(task.id)}
            onReminder={() => toggleReminder(task.id)}
            onCarryover={() => carryoverTask(task.id)}
            onSetRecurring={(v, h, half) => setRecurring(task.id, v, h, half)}
            onFocus={() => { setTimerTask(task); setShowTimer(true) }}
          />
        ))}
      </div>

      <div className="add-row">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a task..."
          maxLength={80}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={startVoice} title="Voice input" style={{
          background: listening ? '#e74c3c' : 'var(--raised)',
          border: '0.5px solid var(--border2)', borderRadius: 8,
          padding: '0 10px', cursor: 'pointer', fontSize: 16,
          color: listening ? '#fff' : 'var(--ink)', flexShrink: 0,
        }}>{listening ? '⏹' : '🎤'}</button>
        <button onClick={handleAdd} disabled={total >= TASK_MAX}>Add</button>
      </div>

      <button onClick={() => { setTimerTask(null); setShowTimer(true) }} style={{
        width: '100%', padding: '10px', borderRadius: 10, marginBottom: 10,
        background: 'var(--raised)', border: '0.5px solid var(--border2)',
        color: 'var(--ink)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>🍅 Start Focus Timer</button>

      <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        <button className="link-btn link-green" onClick={() => onNavigate('chat')}>Ask AI for ideas →</button>
        &nbsp;|&nbsp;
        <button className="link-btn link-green" onClick={() => onNavigate('calendar')}>Schedule tasks →</button>
      </p>
    </>
  )
}

const RECUR_OPTIONS = [
  { value: null,       label: 'No repeat' },
  { value: 'daily',    label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly',   label: 'Weekly' },
]

function fmtHour(h) {
  if (h === 0) return '12 am'
  if (h === 12) return '12 pm'
  return h > 12 ? `${h - 12} pm` : `${h} am`
}

const HALF_LABELS = ['00', '30']

function TaskItem({ task, onToggle, onDelete, onReminder, onCarryover, onSetRecurring, onFocus }) {
  const hasSchedule = task.scheduled_hour != null
  const [showRepeat, setShowRepeat] = useState(false)
  const [recurHour, setRecurHour] = useState(task.recurring_hour ?? task.scheduled_hour ?? 8)
  const [recurHalf, setRecurHalf] = useState(task.recurring_half ?? false)

  function applyRecur(value) {
    if (!value) { onSetRecurring(null); setShowRepeat(false); return }
    onSetRecurring(value, recurHour, recurHalf)
    setShowRepeat(false)
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div className={`task-item${task.done ? ' done' : ''}`}>
        <div className="task-check" onClick={onToggle}>
          <svg className="task-chk" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <span className="task-text">{task.text}</span>

        {task.recurring && (
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 500, whiteSpace: 'nowrap' }}>🔁</span>
        )}

        {hasSchedule && (
          <span className="task-time-badge">{formatTime(task.scheduled_hour, task.scheduled_half)}</span>
        )}

        {hasSchedule && (
          <button className={`task-reminder-btn${task.reminder ? ' active' : ''}`} onClick={onReminder}>
            {task.reminder ? '🔔 on' : '🔕 remind'}
          </button>
        )}

        {!task.done && (
          <button title="Focus timer" onClick={e => { e.stopPropagation(); onFocus() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}>🍅</button>
        )}

        <button
          title="Set repeat"
          onClick={e => { e.stopPropagation(); setShowRepeat(s => !s) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: showRepeat ? 'var(--green)' : 'var(--muted)', padding: '0 2px' }}
        >↺</button>

        {!task.done && (
          <button title="Move to next day" onClick={e => { e.stopPropagation(); onCarryover() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', padding: '0 2px' }}>↪</button>
        )}

        <button className="task-del" onClick={e => { e.stopPropagation(); onDelete() }}>×</button>
      </div>

      {showRepeat && (
        <div style={{ padding: '6px 0 8px 36px' }}>
          {/* Frequency pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {RECUR_OPTIONS.map(opt => (
              <button key={String(opt.value)}
                onClick={() => applyRecur(opt.value)}
                style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', border: '0.5px solid var(--border2)',
                  background: task.recurring === opt.value ? 'var(--green)' : 'var(--raised)',
                  color: task.recurring === opt.value ? '#fff' : 'var(--ink)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Time picker — only shown when a repeat frequency is selected or being set */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Time:</span>
            <select value={recurHour} onChange={e => setRecurHour(Number(e.target.value))}
              style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '0.5px solid var(--border2)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif' }}>
              {Array.from({ length: 19 }, (_, i) => i + 5).map(h => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
            <select value={recurHalf ? '30' : '00'} onChange={e => setRecurHalf(e.target.value === '30')}
              style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '0.5px solid var(--border2)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif' }}>
              {HALF_LABELS.map(l => <option key={l} value={l}>:{l}</option>)}
            </select>
            {task.recurring && (
              <button onClick={() => { onSetRecurring(task.recurring, recurHour, recurHalf); setShowRepeat(false) }}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Save time
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NextUpWidget({ tasks, onNavigate }) {
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()

  const upcoming = tasks
    .filter(t => !t.done && t.scheduled_hour != null)
    .map(t => ({ ...t, startMins: t.scheduled_hour * 60 + (t.scheduled_half ? 30 : 0) }))
    .filter(t => t.startMins >= nowMins)
    .sort((a, b) => a.startMins - b.startMins)

  if (!upcoming.length) {
    return (
      <div className="nextup" style={{ borderColor: 'var(--border)' }}>
        <span className="nextup-empty">
          No upcoming tasks scheduled —{' '}
          <button className="link-btn link-green" onClick={() => onNavigate('calendar')}>add to calendar →</button>
        </span>
      </div>
    )
  }

  const next = upcoming[0]
  const minsAway = next.startMins - nowMins

  return (
    <div className="nextup">
      <div className="nextup-dot" />
      <div>
        <div className="nextup-label">Next up</div>
        <div className="nextup-task">{next.text}</div>
        <div className="nextup-time">
          {formatTime(next.scheduled_hour, next.scheduled_half)} ·{' '}
          {minsAway < 60 ? `starts in ${minsAway} min` : `at ${formatTime(next.scheduled_hour, next.scheduled_half)}`}
        </div>
      </div>
    </div>
  )
}
