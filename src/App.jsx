import { useState, useEffect } from 'react'
import { useApp } from './context/AppContext'
import AuthScreen from './components/AuthScreen'
import PaywallScreen from './components/PaywallScreen'
import NotifBanner from './components/NotifBanner'
import TasksTab from './components/TasksTab'
import CalendarTab from './components/CalendarTab'
import ProgressTab from './components/ProgressTab'
import ChatTab from './components/ChatTab'
import AccountTab from './components/AccountTab'
import LeaderboardTab from './components/LeaderboardTab'
import HabitsTab from './components/HabitsTab'
import WinWall from './components/WinWall'
import DayRatingModal from './components/DayRatingModal'

const TABS = ['tasks', 'habits', 'calendar', 'progress', 'leaderboard', 'wins', 'chat', 'account']
const TAB_LABELS = ['Tasks', 'Habits', 'Calendar', 'Progress', 'Leaders', 'Wins', 'AI', 'Account']

export default function App() {
  const { session, authLoading, profile, isExpired, daysLeft, isPro, startCheckout, showDayRating, setShowDayRating, saveDayRating } = useApp()
  const [activeTab, setActiveTab] = useState('tasks')

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', profile?.theme || 'light')
  }, [profile?.theme])

  // Check for Stripe success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', '/')
    }
  }, [])

  if (authLoading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</span>
      </div>
    )
  }

  if (!session) return <AuthScreen />

  if (isExpired()) return <PaywallScreen />

  const left = daysLeft()
  const pro = isPro()

  return (
    <>
      <NotifBanner />
      {showDayRating && <DayRatingModal onRate={saveDayRating} onDismiss={() => setShowDayRating(false)} />}
      <div className="app">
        <h1>Focus</h1>
        <p className="sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

        {!pro && left > 0 && (
          <div className="trial-bar">
            <span>{left} day{left !== 1 ? 's' : ''} left in your trial</span>
            {!window.Capacitor && !window.location.protocol.startsWith('capacitor') && (
              <button className="trial-upgrade" onClick={startCheckout}>
                Upgrade $4.99/mo →
              </button>
            )}
          </div>
        )}

        <div className="tabs">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {TAB_LABELS[i]}
            </button>
          ))}
        </div>

        {activeTab === 'tasks' && <TasksTab onNavigate={setActiveTab} />}
        {activeTab === 'habits' && <HabitsTab onNavigate={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        {activeTab === 'wins' && <WinWall />}
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'account' && <AccountTab onNavigate={setActiveTab} />}
      </div>
    </>
  )
}
