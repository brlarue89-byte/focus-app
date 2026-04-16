import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

const TASK_MIN = 5
const TASK_MAX = 10

export default function ChatTab() {
  const { tasks, addTask, chatHistory, setChatHistory, showBanner } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef(null)

  const initialized = useRef(false)

  useEffect(() => {
    if (chatHistory.length === 0 && !initialized.current) {
      initialized.current = true
      const n = tasks.length
      const need = Math.max(0, TASK_MIN - n)
      const greeting = n === 0
        ? `Hi! You'll need ${TASK_MIN}–${TASK_MAX} tasks for today. What kind of day do you have ahead? I'll suggest some tasks.`
        : `Hi! You have ${n} task${n !== 1 ? 's' : ''}${need > 0 ? ` — need ${need} more` : ''}. Want ideas?`
      setChatHistory([{ role: 'assistant', content: greeting }])
    }
  }, [])

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [chatHistory, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text }
    setChatHistory(prev => [...prev, userMsg])
    setLoading(true)

    const taskList = tasks.map((t, i) => `${i + 1}. ${t.text}${t.done ? ' (done)' : ''}`).join('\n') || 'None'
    const system = `You are a friendly productivity coach. The user must set ${TASK_MIN}–${TASK_MAX} tasks. They currently have ${tasks.length}:\n${taskList}\nNeeds ${Math.max(0, TASK_MIN - tasks.length)} more${tasks.length >= TASK_MAX ? ' (at max)' : ''}. Suggest tasks as a bullet list (- Task name). Keep it warm and concise, under 120 words. No markdown bold.`

    const messages = [...chatHistory, userMsg]
      .filter(m => m.role !== 'system')
      .slice(-8)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages }),
      })
      const data = await res.json()
      const reply = data.content?.map(b => b.text || '').join('') || 'Sorry, try again!'
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-msgs" ref={msgsRef}>
        {chatHistory.map((msg, i) => (
          <ChatMessage
            key={i}
            msg={msg}
            tasks={tasks}
            onAddTask={text => {
              if (tasks.length >= TASK_MAX) { showBanner(`Max of ${TASK_MAX} tasks reached.`); return }
              addTask(text)
            }}
          />
        ))}
        {loading && (
          <div className="msg ai" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Thinking…</div>
        )}
      </div>

      <div>
        <div className="chat-input-row">
          <input
            type="text"
            placeholder="Ask for task ideas..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button onClick={send} disabled={loading}>Send</button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
          Tap a suggested task to add it directly.
        </p>
      </div>
    </div>
  )
}

function ChatMessage({ msg, tasks, onAddTask }) {
  if (msg.role === 'user') {
    return <div className="msg user">{msg.content}</div>
  }

  const { prose, chips } = parseAssistantMessage(msg.content, tasks.length)

  return (
    <div className="msg ai">
      {prose}
      {chips.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {chips.map((chip, i) => (
            <SuggestionChip key={i} text={chip} onAdd={onAddTask} atMax={tasks.length >= TASK_MAX} />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionChip({ text, onAdd, atMax }) {
  const [added, setAdded] = useState(false)

  function handleClick() {
    if (added || atMax) return
    onAdd(text)
    setAdded(true)
  }

  return (
    <button
      className={`suggestion-chip${added ? ' added' : ''}${atMax && !added ? ' maxed' : ''}`}
      onClick={handleClick}
      disabled={added || atMax}
    >
      {added ? `✓ ${text}` : `+ ${text}`}
    </button>
  )
}

function parseAssistantMessage(text, taskCount) {
  const lines = text.split('\n')
  const chips = []
  const proseLines = []

  lines.forEach(line => {
    if (/^[-•*]\s/.test(line)) {
      const chip = line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, '').trim()
      if (chip.length > 3 && chip.length < 100) chips.push(chip)
    } else if (line.trim()) {
      proseLines.push(line.trim())
    }
  })

  return { prose: proseLines.join(' ') || text, chips }
}
