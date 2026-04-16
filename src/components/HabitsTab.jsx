import { useState } from 'react'
import { useApp } from '../context/AppContext'

const CATEGORIES = [
  {
    name: 'Mind',
    icon: '🧠',
    habits: [
      { icon: '🧘', name: 'Meditate', desc: '10 min of stillness' },
      { icon: '📖', name: 'Read', desc: 'Read for 20+ minutes' },
      { icon: '🙏', name: 'Pray', desc: 'Morning or evening prayer' },
      { icon: '✍️', name: 'Journal', desc: 'Write your thoughts' },
      { icon: '😮‍💨', name: 'Deep breathing', desc: '5 min breathwork' },
      { icon: '🎯', name: 'Set intentions', desc: 'Plan your day with purpose' },
    ],
  },
  {
    name: 'Body',
    icon: '💪',
    habits: [
      { icon: '🏃', name: 'Exercise', desc: '30 min of movement' },
      { icon: '🚶', name: 'Go for a walk', desc: 'Get outside & move' },
      { icon: '💧', name: 'Drink water', desc: 'Hit your daily water goal' },
      { icon: '🥗', name: 'Eat healthy', desc: 'Nourish your body well' },
      { icon: '😴', name: 'Sleep by 10pm', desc: 'Protect your sleep window' },
      { icon: '🧘‍♂️', name: 'Stretch', desc: '10 min morning stretch' },
      { icon: '🚫', name: 'No junk food', desc: 'Skip the processed stuff' },
    ],
  },
  {
    name: 'Home',
    icon: '🏠',
    habits: [
      { icon: '🛏️', name: 'Make bed', desc: 'Start the day with a win' },
      { icon: '🧹', name: 'Clean room', desc: 'Tidy your space' },
      { icon: '🍽️', name: 'Wash dishes', desc: 'Keep the kitchen clean' },
      { icon: '🧺', name: 'Do laundry', desc: 'Wash & put away clothes' },
      { icon: '🗑️', name: 'Take out trash', desc: 'Empty the bins' },
      { icon: '🧼', name: 'Deep clean', desc: 'Thorough clean of one room' },
    ],
  },
  {
    name: 'Growth',
    icon: '🌱',
    habits: [
      { icon: '📚', name: 'Study', desc: 'Learn something new' },
      { icon: '🎧', name: 'Listen to a podcast', desc: 'Growth content' },
      { icon: '💼', name: 'Work on a side project', desc: 'Build something' },
      { icon: '📝', name: 'Practice a skill', desc: 'Deliberate practice' },
      { icon: '🤝', name: 'Connect with someone', desc: 'Reach out & build bonds' },
      { icon: '📵', name: 'No social media', desc: 'Reclaim your focus' },
      { icon: '💰', name: 'Review finances', desc: 'Check budget & spending' },
    ],
  },
  {
    name: 'Wellness',
    icon: '✨',
    habits: [
      { icon: '🌅', name: 'Morning routine', desc: 'Complete your AM ritual' },
      { icon: '🌙', name: 'Evening routine', desc: 'Wind down intentionally' },
      { icon: '🛁', name: 'Cold shower', desc: 'Build mental toughness' },
      { icon: '🌿', name: 'Go outside', desc: 'Fresh air & sunlight' },
      { icon: '📴', name: 'Screen-free hour', desc: 'Disconnect to recharge' },
      { icon: '💌', name: 'Gratitude', desc: 'Write 3 things you\'re grateful for' },
    ],
  },
]

export default function HabitsTab({ onNavigate }) {
  const { addTask, tasks, showBanner, selectedDate } = useApp()
  const [activeCategory, setActiveCategory] = useState(0)
  const [added, setAdded] = useState({})

  const todayTaskTexts = new Set(tasks.map(t => t.text.toLowerCase()))

  async function handleAdd(habit) {
    if (todayTaskTexts.has(habit.name.toLowerCase())) {
      showBanner(`"${habit.name}" is already in your tasks.`)
      return
    }
    await addTask(habit.name)
    setAdded(prev => ({ ...prev, [habit.name]: true }))
    showBanner(`"${habit.name}" added to tasks!`)
  }

  const cat = CATEGORIES[activeCategory]

  return (
    <>
      <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
        Healthy Habits
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, marginTop: 0 }}>
        Tap + to add a habit to today's task list
      </p>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}>
        {CATEGORIES.map((c, i) => (
          <button key={c.name} onClick={() => setActiveCategory(i)} style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500,
            background: activeCategory === i ? 'var(--green)' : 'var(--raised)',
            color: activeCategory === i ? '#fff' : 'var(--ink)',
            transition: 'background 0.15s',
          }}>
            <span>{c.icon}</span> {c.name}
          </button>
        ))}
      </div>

      {/* Habits list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {cat.habits.map(habit => {
          const inTasks = todayTaskTexts.has(habit.name.toLowerCase()) || added[habit.name]
          return (
            <div key={habit.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 12, padding: '12px 14px',
              opacity: inTasks ? 0.55 : 1,
            }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{habit.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{habit.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{habit.desc}</div>
              </div>
              <button
                onClick={() => handleAdd(habit)}
                disabled={inTasks}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: inTasks ? 'var(--raised)' : 'var(--green)',
                  color: inTasks ? 'var(--muted)' : '#fff',
                  fontSize: inTasks ? 16 : 20, cursor: inTasks ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, lineHeight: 1,
                  transition: 'background 0.15s',
                }}
              >
                {inTasks ? '✓' : '+'}
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => onNavigate('tasks')}
        style={{
          width: '100%', padding: '11px', borderRadius: 10,
          background: 'var(--green)', color: '#fff', border: 'none',
          fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}
      >
        View my tasks →
      </button>
    </>
  )
}
