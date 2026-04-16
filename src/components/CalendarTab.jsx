import { useRef, useState, useEffect } from 'react'
import { useApp, formatRange } from '../context/AppContext'

const SLOT_H = 48

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function CalendarTab() {
  const [view, setView] = useState('day') // 'day' | 'month'

  return (
    <>
      <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('day')}
          style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans, DM Sans)', border: 'none', cursor: 'pointer', background: view === 'day' ? 'var(--green)' : 'transparent', color: view === 'day' ? '#fff' : 'var(--muted)' }}
        >Day</button>
        <button
          onClick={() => setView('month')}
          style={{ flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans, DM Sans)', border: 'none', cursor: 'pointer', background: view === 'month' ? 'var(--green)' : 'transparent', color: view === 'month' ? '#fff' : 'var(--muted)' }}
        >Month</button>
      </div>

      {view === 'day' ? <DayView /> : <MonthView />}
    </>
  )
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView() {
  const { tasks, scheduleTask, resizeTask, unscheduleTask, toggleReminder, autoSchedule, clearSchedule, COLORS, selectedDate, profile } = useApp()
  const [dropIndicator, setDropIndicator] = useState(null)
  const slotsRef = useRef(null)

  const START_HOUR = profile?.work_start ?? 8
  const END_HOUR = profile?.work_end ?? 20

  const scheduled = tasks.filter(t => t.scheduled_hour != null)
  const unscheduled = tasks.filter(t => t.scheduled_hour == null)

  function onRowDragOver(e, hour, rowEl) {
    e.preventDefault()
    const rect = rowEl.getBoundingClientRect()
    const half = (e.clientY - rect.top) > SLOT_H / 2
    setDropIndicator(((hour - START_HOUR) * 2 + (half ? 1 : 0)) * SLOT_H / 2)
  }

  function onRowDrop(e, hour, rowEl) {
    e.preventDefault()
    setDropIndicator(null)
    const rawId = e.dataTransfer.getData('taskId')
    if (!rawId) return
    const task = tasks.find(t => String(t.id) === rawId)
    if (!task) return
    const half = (e.clientY - rowEl.getBoundingClientRect().top) > SLOT_H / 2
    scheduleTask(task.id, hour, half)
  }

  return (
    <>
      <div className="cal-header">
        <span className="cal-header-title">
          {selectedDate === todayStr() ? "Today's schedule" : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <span className="cal-count">{scheduled.length} of {tasks.length} scheduled</span>
      </div>

      <div className="cal-actions">
        <button className="cal-btn primary" onClick={autoSchedule} disabled={unscheduled.length === 0}>Auto-schedule all</button>
        <button className="cal-btn secondary" onClick={clearSchedule}>Clear all</button>
      </div>

      <p className="cal-hint">Drag tasks onto the timeline or hit auto-schedule. Toggle 🔕 to set reminders.</p>

      <div className="sec-title">Unscheduled</div>
      <div className="unsched-list">
        {unscheduled.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>All tasks scheduled!</div>
          : unscheduled.map(t => (
            <div key={t.id} className="unsched-chip" style={{ borderLeft: `3px solid ${COLORS[t.color % COLORS.length]}` }}
              draggable onDragStart={e => e.dataTransfer.setData('taskId', String(t.id))}>
              {t.text}
            </div>
          ))
        }
      </div>

      <div className="timeline">
        <div className="time-labels">
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
            const h = START_HOUR + i
            return <div key={h} className="time-label">{h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}</div>
          })}
        </div>
        <div className="slots-col" ref={slotsRef} onDragLeave={e => { if (!slotsRef.current?.contains(e.relatedTarget)) setDropIndicator(null) }}>
          {dropIndicator !== null && <div className="drop-indicator" style={{ top: dropIndicator, display: 'block' }} />}
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
            const h = START_HOUR + i
            return (
              <div key={h} className="hour-row"
                onDragOver={e => onRowDragOver(e, h, e.currentTarget)}
                onDrop={e => onRowDrop(e, h, e.currentTarget)}>
                <div className="half-line" />
              </div>
            )
          })}
          {scheduled.map(task => (
            <CalBlock key={task.id} task={task} colors={COLORS} startHour={START_HOUR} endHour={END_HOUR}
              onUnschedule={() => unscheduleTask(task.id)}
              onToggleReminder={() => toggleReminder(task.id)}
              onResize={dur => resizeTask(task.id, dur)}
              onDragStart={e => { e.dataTransfer.setData('taskId', String(task.id)); unscheduleTask(task.id) }}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function CalBlock({ task, colors, startHour, endHour, onUnschedule, onToggleReminder, onResize, onDragStart }) {
  const color = colors[task.color % colors.length]
  const baseDur = task.scheduled_duration || 2
  const [livedur, setLiveDur] = useState(baseDur)
  const [resizing, setResizing] = useState(false)

  const dur = resizing ? livedur : baseDur
  const top = (task.scheduled_hour - startHour) * 2 + (task.scheduled_half ? 1 : 0)

  function handleResizeMouseDown(e) {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    const startY = e.clientY
    const startDur = baseDur
    const max = (endHour - task.scheduled_hour) * 2 - (task.scheduled_half ? 1 : 0)

    let latestDur = startDur

    function onMouseMove(ev) {
      const next = Math.min(max, Math.max(1, Math.round(startDur + (ev.clientY - startY) / (SLOT_H / 2))))
      setLiveDur(next)
      latestDur = next
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      setResizing(false)
      onResize(latestDur)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="cal-block" draggable={!resizing} onDragStart={resizing ? undefined : onDragStart}
      style={{ top: top * SLOT_H / 2 + 2, height: dur * SLOT_H / 2 - 4, background: color + '22', borderLeft: `3px solid ${color}`, color }}>
      <div className="cal-block-left">
        <span className="cal-block-text">{task.text}</span>
        <span className="cal-block-time">{formatRange(task.scheduled_hour, task.scheduled_half, dur)}</span>
      </div>
      <button className={`cal-block-bell${task.reminder ? ' on' : ''}`} onClick={e => { e.stopPropagation(); onToggleReminder() }}>
        {task.reminder ? '🔔' : '🔕'}
      </button>
      <button className="cal-block-remove" onClick={e => { e.stopPropagation(); onUnschedule() }}>×</button>
      {/* Visible resize grip */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 12,
          cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderTop: `1px solid ${color}44`,
        }}
      >
        <div style={{ width: 24, height: 3, borderRadius: 2, background: color, opacity: 0.5 }} />
      </div>
    </div>
  )
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView() {
  const { selectedDate, setSelectedDate, fetchMonthTaskCounts } = useApp()
  const today = todayStr()
  const [counts, setCounts] = useState({})

  const ref = new Date(selectedDate + 'T12:00:00')
  const [year, setYear] = useState(ref.getFullYear())
  const [month, setMonth] = useState(ref.getMonth() + 1) // 1-based

  useEffect(() => {
    fetchMonthTaskCounts(year, month).then(setCounts)
  }, [year, month])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function shiftMonth(dir) {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  function selectDay(day) {
    const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSelectedDate(d)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => shiftMonth(-1)} style={{ background: 'none', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>‹</button>
        <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{monthName}</span>
        <button onClick={() => shiftMonth(1)} style={{ background: 'none', border: '0.5px solid var(--border2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ textAlign: 'center', fontSize: 10, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{l}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const taskCount = counts[dateStr] || 0
          const isPast = dateStr < today

          return (
            <div key={day} onClick={() => selectDay(day)}
              style={{
                borderRadius: 8, padding: '6px 4px', textAlign: 'center', cursor: 'pointer',
                background: isSelected ? 'var(--green)' : isToday ? 'var(--green-light)' : 'var(--surface)',
                border: isToday && !isSelected ? '1.5px solid var(--green)' : '0.5px solid var(--border)',
                opacity: isPast ? 0.5 : 1,
              }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 600 : 400, color: isSelected ? '#fff' : 'var(--ink)', marginBottom: 3 }}>{day}</div>
              {taskCount > 0
                ? <div style={{ fontSize: 9, background: isSelected ? 'rgba(255,255,255,0.3)' : 'var(--green-light)', color: isSelected ? '#fff' : '#085041', borderRadius: 10, padding: '1px 4px', display: 'inline-block' }}>{taskCount}</div>
                : <div style={{ height: 14 }} />
              }
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
        Tap a day to view or add tasks for that date.
      </p>
    </>
  )
}
