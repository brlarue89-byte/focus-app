import { createContext, useContext, useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const RC_IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY || 'appl_mfAvlFSkQwKAEyVhrRIsRVEXgJZ'

function urlBase64ToUint8(base64String) {
  const pad = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

const AppContext = createContext(null)

const QUOTES = [
  "Small steps every day lead to big results.",
  "You don't have to be perfect, just consistent.",
  "Progress, not perfection.",
  "One task at a time. You've got this.",
  "Show up today. Future you will thank you.",
  "Discipline is choosing what you want most over what you want now.",
  "The secret to getting ahead is getting started.",
  "Done is better than perfect.",
  "Every day is a chance to be better than yesterday.",
  "Focus on what matters. Let go of the rest.",
  "Your only competition is who you were yesterday.",
  "Great things are done by a series of small things brought together.",
  "Believe you can and you're halfway there.",
  "Action is the foundational key to all success.",
  "Start where you are. Use what you have. Do what you can.",
]

async function scheduleQuoteNotification() {
  if (!window.Capacitor) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.checkPermissions()
    if (display !== 'granted') {
      const { display: d } = await LocalNotifications.requestPermissions()
      if (d !== 'granted') return
    }
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.some(n => n.id === 1001)) return
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    const now = new Date()
    const fire = new Date(now)
    fire.setHours(8, 0, 0, 0)
    if (fire <= now) fire.setDate(fire.getDate() + 1)
    await LocalNotifications.schedule({ notifications: [{
      id: 1001, title: 'Good morning! 🌿', body: quote,
      schedule: { at: fire, repeats: true, every: 'day' },
      sound: null, smallIcon: 'ic_stat_icon_config_sample',
    }]})
  } catch {}
}

async function haptic(style = 'medium') {
  if (!window.Capacitor) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }
    await Haptics.impact({ style: map[style] || ImpactStyle.Medium })
  } catch {}
}

async function nativeShare(title, text) {
  if (!window.Capacitor) return false
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, text, dialogTitle: title })
    return true
  } catch { return false }
}

const TASK_MIN = 5
const TASK_MAX = 20
const TRIAL_DAYS = 7
const COLORS = ['#1D9E75','#185FA5','#BA7517','#993556','#534AB7','#3B6D11','#993C1D']

export const XP_RANKS = [
  { id: 'rank_silver',   min: 1000,  label: 'Silver',   color: '#9BA8B5', gradient: 'linear-gradient(135deg,#c8d6df,#8a9aaa)', glow: '#9BA8B580' },
  { id: 'rank_gold',     min: 2500,  label: 'Gold',     color: '#D4A017', gradient: 'linear-gradient(135deg,#ffe066,#c8860a)', glow: '#D4A01780' },
  { id: 'rank_platinum', min: 5000,  label: 'Platinum', color: '#4DD9C0', gradient: 'linear-gradient(135deg,#a0f0e0,#2ab8a0)', glow: '#4DD9C080' },
  { id: 'rank_diamond',  min: 10000, label: 'Diamond',  color: '#74C0FC', gradient: 'linear-gradient(135deg,#c0e8ff,#3a9fe0)', glow: '#74C0FC80' },
  { id: 'rank_master',   min: 25000, label: 'Master',   color: '#DA77F2', gradient: 'linear-gradient(135deg,#f0b8ff,#a83adc)', glow: '#DA77F280' },
]

export function getXPRank(xp) {
  for (let i = XP_RANKS.length - 1; i >= 0; i--) {
    if ((xp || 0) >= XP_RANKS[i].min) return XP_RANKS[i]
  }
  return null
}

export const BADGE_DEFS = [
  { id: 'first_step',    icon: '🌱', name: 'First Step',    desc: 'Complete your first task' },
  { id: 'on_a_roll',     icon: '🔥', name: 'On a Roll',     desc: 'Reach a 3-day streak' },
  { id: 'week_warrior',  icon: '⚡', name: 'Week Warrior',  desc: 'Reach a 7-day streak' },
  { id: 'perfect_day',   icon: '✅', name: 'Perfect Day',   desc: 'Complete every task in a day' },
  { id: 'planner',       icon: '📅', name: 'Planner',       desc: 'Add 5+ tasks in one day' },
  { id: 'shield_bearer', icon: '🛡️', name: 'Shield Bearer', desc: 'Use your streak shield' },
  { id: 'xp_100',        icon: '💯', name: 'Century',       desc: 'Earn 100 XP' },
  { id: 'xp_500',        icon: '🏆', name: 'Champion',      desc: 'Earn 500 XP' },
  { id: 'rank_silver',   icon: '🥈', name: 'Silver',        desc: 'Reach 1,000 XP' },
  { id: 'rank_gold',     icon: '🥇', name: 'Gold',          desc: 'Reach 2,500 XP' },
  { id: 'rank_platinum', icon: '💠', name: 'Platinum',      desc: 'Reach 5,000 XP' },
  { id: 'rank_diamond',  icon: '💎', name: 'Diamond',       desc: 'Reach 10,000 XP' },
  { id: 'rank_master',   icon: '👑', name: 'Master',        desc: 'Reach 25,000 XP' },
]

function todayStr() { return new Date().toISOString().slice(0, 10) }
function prevDayStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [banner, setBanner] = useState(null)
  const bannerTimer = useRef(null)
  const [chatHistory, setChatHistory] = useState([])
  const timerIds = useRef({})
  const [showDayRating, setShowDayRating] = useState(false)

  // ─── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    scheduleQuoteNotification()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setAuthLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setAuthLoading(false)
    return data
  }

  async function updateProfile(fields) {
    setProfile(prev => ({ ...prev, ...fields }))
    await supabase.from('profiles').update(fields).eq('id', session.user.id)
  }

  // ─── Push notifications ───────────────────────────────────────────────────

  async function registerPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
    try {
      // Check if already denied — browser won't prompt again
      if (Notification.permission === 'denied') return 'denied'

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return 'denied'

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8(VAPID_PUBLIC_KEY),
        })
      }

      const json = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: session.user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      }, { onConflict: 'user_id,endpoint' })

      if (error) { console.error('Push upsert error:', error); return 'db' }
      return true
    } catch (e) {
      console.error('Push registration failed:', e)
      return 'error'
    }
  }

  async function unregisterPush() {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete()
        .eq('user_id', session.user.id).eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
  }

  async function isPushEnabled() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub && Notification.permission === 'granted'
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(name, email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, name, trial_start: new Date().toISOString() })
      await fetchProfile(data.user.id)
    }
  }

  async function signOut() {
    Object.values(timerIds.current).forEach(clearTimeout)
    timerIds.current = {}
    setChatHistory([])
    setTasks([])
    await supabase.auth.signOut()
  }

  async function deleteAccount() {
    const uid = profile?.id
    if (!uid) return
    await supabase.from('tasks').delete().eq('user_id', uid)
    await supabase.from('progress_history').delete().eq('user_id', uid)
    await supabase.from('profiles').delete().eq('id', uid)
    await supabase.from('push_subscriptions').delete().eq('user_id', uid)
    await supabase.from('wins').delete().eq('user_id', uid)
    await supabase.from('task_templates').delete().eq('user_id', uid)
    await supabase.auth.signOut()
  }

  function daysLeft() {
    if (!profile?.trial_start) return TRIAL_DAYS
    const start = new Date(profile.trial_start).getTime()
    return Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - start) / 86400000))
  }

  const FREE_ACCESS = ['brlarue89@gmail.com', 'danglysaucer763@gmail.com', 'ash.wheeler0323@gmail.com']
  function isPro() { return !!profile?.subscribed || FREE_ACCESS.includes(profile?.email?.toLowerCase()) }
  function isExpired() { return daysLeft() === 0 && !isPro() }

  // ─── Win Wall ─────────────────────────────────────────────────────────────

  async function postWin(type, text, icon = '🏆') {
    if (!session || !profile) return
    const displayName = profile.name || profile.email?.split('@')[0] || 'Someone'
    await supabase.from('wins').insert({ user_id: session.user.id, display_name: displayName, type, text, icon })
  }

  // ─── Task Templates ───────────────────────────────────────────────────────

  async function fetchTemplates() {
    if (!session) return []
    const { data } = await supabase.from('task_templates').select('*')
      .eq('user_id', session.user.id).order('created_at', { ascending: false })
    return data || []
  }

  async function saveTemplate(name) {
    if (!tasks.length) { showBanner('No tasks to save as template.'); return false }
    const items = tasks.map(t => ({ text: t.text, color: t.color }))
    const { error } = await supabase.from('task_templates').insert({ user_id: session.user.id, name, tasks: items })
    if (error) { showBanner('Could not save template.'); return false }
    showBanner(`Template "${name}" saved!`)
    return true
  }

  async function deleteTemplate(id) {
    await supabase.from('task_templates').delete().eq('id', id).eq('user_id', session.user.id)
  }

  async function applyTemplate(templateTasks) {
    const existing = new Set(tasks.map(t => t.text.toLowerCase()))
    const toAdd = templateTasks.filter(t => !existing.has(t.text.toLowerCase()))
    if (!toAdd.length) { showBanner('All template tasks already added.'); return }
    const inserts = toAdd.map(t => ({ user_id: session.user.id, text: t.text, done: false, color: t.color, task_date: selectedDate }))
    const { data, error } = await supabase.from('tasks').insert(inserts).select()
    if (!error && data) setTasks(prev => [...prev, ...data])
    showBanner(`Added ${toAdd.length} task${toAdd.length !== 1 ? 's' : ''} from template.`)
  }

  // ─── XP & Badges ──────────────────────────────────────────────────────────

  async function awardXP(amount, updatedProfile) {
    const base = updatedProfile || profile
    const newXP = (base?.xp || 0) + amount
    const updates = { xp: newXP }
    setProfile(prev => ({ ...prev, ...updates }))
    await supabase.from('profiles').update(updates).eq('id', session.user.id)
    await checkBadges({ ...(base || {}), ...updates })
  }

  async function checkBadges(p) {
    const earned = new Set(Array.isArray(p.badges) ? p.badges : [])
    const newBadges = []
    const checks = {
      first_step:    () => (p.xp || 0) >= 10,
      on_a_roll:     () => (p.streak || 0) >= 3,
      week_warrior:  () => (p.streak || 0) >= 7,
      xp_100:        () => (p.xp || 0) >= 100,
      xp_500:        () => (p.xp || 0) >= 500,
      shield_bearer: () => !!p.shield_used,
      rank_silver:   () => (p.xp || 0) >= 1000,
      rank_gold:     () => (p.xp || 0) >= 2500,
      rank_platinum: () => (p.xp || 0) >= 5000,
      rank_diamond:  () => (p.xp || 0) >= 10000,
      rank_master:   () => (p.xp || 0) >= 25000,
      // perfect_day and planner are triggered ad-hoc
    }
    for (const [id, fn] of Object.entries(checks)) {
      if (!earned.has(id) && fn()) { earned.add(id); newBadges.push(id) }
    }
    if (newBadges.length) {
      const badges = [...earned]
      setProfile(prev => ({ ...prev, badges }))
      await supabase.from('profiles').update({ badges }).eq('id', session.user.id)
      for (const id of newBadges) {
        const badge = BADGE_DEFS.find(b => b.id === id)
        setTimeout(() => showBanner(`🏅 Badge unlocked: ${badge.name}!`), 300)
      }
    }
  }

  async function awardBadge(id) {
    const earned = new Set(Array.isArray(profile?.badges) ? profile.badges : [])
    if (earned.has(id)) return
    earned.add(id)
    const badges = [...earned]
    setProfile(prev => ({ ...prev, badges }))
    await supabase.from('profiles').update({ badges }).eq('id', session.user.id)
    const badge = BADGE_DEFS.find(b => b.id === id)
    if (badge) {
      haptic('heavy')
      showBanner(`🏅 Badge unlocked: ${badge.name}!`)
      const displayName = profile?.name || profile?.email?.split('@')[0] || 'Someone'
      postWin('badge', `${displayName} unlocked the ${badge.name} badge`, badge.icon)
    }
  }

  // ─── Streak ───────────────────────────────────────────────────────────────

  async function recalculateStreak(freshProfile) {
    const p = freshProfile || profile
    const yesterday = prevDayStr(todayStr())

    const { data: history } = await supabase
      .from('progress_history')
      .select('date')
      .eq('user_id', session.user.id)
      .gt('completion_pct', 0)
      .order('date', { ascending: false })
      .limit(60)

    if (!history?.length) {
      await supabase.from('profiles').update({ streak: 0 }).eq('id', session.user.id)
      setProfile(prev => ({ ...prev, streak: 0 }))
      return 0
    }

    const dates = history.map(h => h.date)
    const mostRecent = dates[0]

    // If most recent is older than yesterday, streak is broken
    if (mostRecent < yesterday) {
      if (!p?.shield_used && (p?.streak || 0) > 0) {
        // Shield saves the streak
        await supabase.from('profiles').update({ shield_used: true }).eq('id', session.user.id)
        setProfile(prev => ({ ...prev, shield_used: true }))
        showBanner('🛡️ Streak shield activated! Your streak is safe.')
        await awardBadge('shield_bearer')
        return p.streak
      }
      await supabase.from('profiles').update({ streak: 0 }).eq('id', session.user.id)
      setProfile(prev => ({ ...prev, streak: 0 }))
      return 0
    }

    // Count consecutive days backwards
    let streak = 0
    let expected = mostRecent
    for (const date of dates) {
      if (date === expected) {
        streak++
        expected = prevDayStr(expected)
      } else break
    }

    await supabase.from('profiles').update({ streak }).eq('id', session.user.id)
    setProfile(prev => ({ ...prev, streak }))
    await checkBadges({ ...(p || {}), streak })
    return streak
  }

  // ─── Day rating ───────────────────────────────────────────────────────────

  async function checkShouldShowRating() {
    const now = new Date()
    if (now.getHours() < 21) return // before 9pm
    const today = todayStr()
    const { data } = await supabase
      .from('progress_history').select('day_rating').eq('user_id', session.user.id).eq('date', today).single()
    if (!data || data.day_rating == null) setShowDayRating(true)
  }

  function arm9pmTimer() {
    const now = new Date()
    const fire = new Date()
    fire.setHours(21, 0, 0, 0)
    const ms = fire - now
    if (ms <= 0) return // already past 9pm — checkShouldShowRating handles it
    setTimeout(() => {
      checkShouldShowRating()
    }, ms)
  }

  async function saveDayRating(rating) {
    const today = todayStr()
    await supabase.from('progress_history').upsert(
      { user_id: session.user.id, date: today, day_rating: rating },
      { onConflict: 'user_id,date' }
    )
    setShowDayRating(false)
    showBanner(`Day rated ${rating}/10 — great reflection! 🌙`)
  }

  // ─── Daily cleanup ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    ;(async () => {
      const freshProfile = await fetchProfile(session.user.id)
      await syncRevenueCat(session.user.id)
      await cleanupPastTasks(freshProfile)
      await loadTasks(selectedDate)
      await checkShouldShowRating()
      arm9pmTimer()
    })()
  }, [session])

  async function cleanupPastTasks(freshProfile) {
    const today = todayStr()
    // Fetch full rows so we can clone incomplete tasks forward
    const { data: pastTasks } = await supabase
      .from('tasks').select('*')
      .eq('user_id', session.user.id).lt('task_date', today).eq('archived', false)
    if (!pastTasks?.length) {
      await recalculateStreak(freshProfile)
      return
    }

    // Save progress — incomplete tasks count as not done (completion_pct already correct)
    const byDate = {}
    pastTasks.forEach(t => {
      if (!byDate[t.task_date]) byDate[t.task_date] = { total: 0, done: 0 }
      byDate[t.task_date].total++
      if (t.done) byDate[t.task_date].done++
    })
    await Promise.all(Object.entries(byDate).map(([date, { total, done }]) =>
      supabase.from('progress_history').upsert({
        user_id: session.user.id, date, completion_pct: Math.round(done / total * 100),
      }, { onConflict: 'user_id,date' })
    ))

    // Archive all past tasks so they remain visible in history
    await supabase.from('tasks').update({ archived: true }).in('id', pastTasks.map(t => t.id))

    // Auto-carry incomplete, non-recurring tasks forward to today
    // (recurring tasks are handled separately below so we skip them here)
    const { data: existingToday } = await supabase.from('tasks').select('text')
      .eq('user_id', session.user.id).eq('task_date', today).eq('archived', false)
    const existingTexts = new Set((existingToday || []).map(t => t.text.toLowerCase()))

    const toCarry = pastTasks.filter(t =>
      !t.done &&
      !t.recurring &&
      !existingTexts.has(t.text.toLowerCase())
    )
    if (toCarry.length) {
      await supabase.from('tasks').insert(toCarry.map(t => ({
        user_id: session.user.id,
        text: t.text,
        done: false,
        color: t.color,
        task_date: today,
        archived: false,
        recurring: null,
        // Clear schedule so it's a fresh unscheduled task
        scheduled_hour: null,
        scheduled_half: false,
        scheduled_duration: null,
        reminder: false,
      })))
      // Add carried texts to the set so recurring logic doesn't double-add
      toCarry.forEach(t => existingTexts.add(t.text.toLowerCase()))
    }

    // Spawn recurring tasks for today if they don't already exist
    const todayDate = new Date(today + 'T12:00:00')
    const dayOfWeek = todayDate.getDay() // 0=Sun, 6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const recurring = pastTasks.filter(t => t.recurring)
    if (recurring.length) {
      // Check which ones already exist today (e.g. app opened twice)
      const { data: existing } = await supabase.from('tasks').select('text')
        .eq('user_id', session.user.id).eq('task_date', today).eq('archived', false)
      const existingTexts = new Set((existing || []).map(t => t.text.toLowerCase()))

      const toSpawn = recurring.filter(t => {
        if (existingTexts.has(t.text.toLowerCase())) return false
        if (t.recurring === 'daily') return true
        if (t.recurring === 'weekdays') return isWeekday
        if (t.recurring === 'weekends') return isWeekend
        if (t.recurring === 'weekly') {
          // Same day of week as the original task_date
          const orig = new Date(t.task_date + 'T12:00:00')
          return orig.getDay() === dayOfWeek
        }
        return false
      })

      if (toSpawn.length) {
        await supabase.from('tasks').insert(toSpawn.map(t => {
          // Use recurring_hour if explicitly set, otherwise fall back to last scheduled_hour
          const spawnHour = t.recurring_hour != null ? t.recurring_hour : t.scheduled_hour
          const spawnHalf = t.recurring_hour != null ? t.recurring_half : t.scheduled_half
          return {
            user_id: session.user.id,
            text: t.text,
            done: false,
            color: t.color,
            task_date: today,
            recurring: t.recurring,
            recurring_hour: t.recurring_hour,
            recurring_half: t.recurring_half,
            archived: false,
            scheduled_hour: spawnHour,
            scheduled_half: spawnHalf,
            scheduled_duration: t.scheduled_duration,
          }
        }))
      }
    }

    await recalculateStreak(freshProfile)
  }

  // ─── Tasks ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return
    loadTasks(selectedDate)
  }, [selectedDate])

  async function loadTasks(date) {
    const d = date || selectedDate
    setTasksLoading(true)
    const isPast = d < todayStr()
    let query = supabase.from('tasks').select('*').eq('user_id', session.user.id).eq('task_date', d)
    if (isPast) {
      query = query.eq('archived', true)
    } else {
      query = query.eq('archived', false)
    }
    const { data, error } = await query.order('created_at', { ascending: true })
    if (!error && data) {
      setTasks(data)
      data.forEach(t => { if (t.reminder && t.scheduled_hour != null) armReminder(t) })
    }
    setTasksLoading(false)
  }

  async function addTask(text) {
    const trimmed = text?.trim()
    if (!trimmed || tasks.length >= TASK_MAX) return
    if (tasks.some(t => t.text.toLowerCase() === trimmed.toLowerCase())) return
    const newTask = { user_id: session.user.id, text: trimmed, done: false, color: tasks.length % COLORS.length, task_date: selectedDate }
    const { data, error } = await supabase.from('tasks').insert(newTask).select().single()
    if (!error && data) {
      const newTasks = [...tasks, data]
      setTasks(newTasks)
      if (newTasks.length >= 5) awardBadge('planner')
    }
  }

  async function deleteTask(id) {
    cancelReminder(id)
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const done = !task.done
    const newTasks = tasks.map(t => t.id === id ? { ...t, done } : t)
    setTasks(newTasks)
    await supabase.from('tasks').update({ done }).eq('id', id)
    if (done) {
      haptic('medium')
      await awardXP(10)
      const allDone = newTasks.every(t => t.done)
      if (allDone && newTasks.length > 0) {
        haptic('heavy')
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#1D9E75','#4ecca3','#FFD700','#FF6B6B','#fff'] })
        await awardXP(50)
        awardBadge('perfect_day')
        showBanner('🎉 Perfect day! +50 XP bonus')
        postWin('perfect_day', `${profile?.name || profile?.email?.split('@')[0] || 'Someone'} completed all ${newTasks.length} tasks today`, '✅')
      }
    }
    if (selectedDate === todayStr()) saveDailyProgress(newTasks)
  }

  async function scheduleTask(id, hour, half, duration = 2) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, scheduled_hour: hour, scheduled_half: half, scheduled_duration: duration } : t))
    await supabase.from('tasks').update({ scheduled_hour: hour, scheduled_half: half, scheduled_duration: duration }).eq('id', id)
    const task = tasks.find(t => t.id === id)
    if (task?.reminder) armReminder({ ...task, scheduled_hour: hour, scheduled_half: half })
  }

  async function resizeTask(id, duration) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, scheduled_duration: duration } : t))
    await supabase.from('tasks').update({ scheduled_duration: duration }).eq('id', id)
  }

  function nextDayStr(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }

  async function setRecurring(id, value, hour = null, half = false) {
    // value: 'daily' | 'weekdays' | 'weekends' | 'weekly' | null
    const updates = { recurring: value, recurring_hour: value ? hour : null, recurring_half: value ? half : false }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    await supabase.from('tasks').update(updates).eq('id', id)
    if (value) showBanner(`Repeats ${value}${hour != null ? ` at ${formatTime(hour, half)}` : ''}.`)
    else showBanner('Repeat removed.')
  }

  async function carryoverTask(id) {
    const task = tasks.find(t => t.id === id)
    if (!task || task.done) return
    // From past days, carry to today; from today/future, carry to next day
    const isPast = selectedDate < todayStr()
    const targetDate = isPast ? todayStr() : nextDayStr(selectedDate)
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({
      task_date: targetDate,
      archived: false,
      scheduled_hour: null, scheduled_half: false, scheduled_duration: null, reminder: false,
    }).eq('id', id)
    cancelReminder(id)
    showBanner('Task moved to ' + (targetDate === todayStr() ? 'today' : new Date(targetDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })))
  }

  async function carryoverAllUnfinished() {
    const unfinished = tasks.filter(t => !t.done)
    if (!unfinished.length) { showBanner('No unfinished tasks to carry over.'); return }
    const nextDate = nextDayStr(selectedDate)
    const ids = unfinished.map(t => t.id)
    ids.forEach(cancelReminder)
    setTasks(prev => prev.filter(t => t.done))
    await supabase.from('tasks').update({
      task_date: nextDate,
      scheduled_hour: null, scheduled_half: false, scheduled_duration: null, reminder: false,
    }).in('id', ids)
    showBanner(`${unfinished.length} task${unfinished.length !== 1 ? 's' : ''} moved to tomorrow.`)
  }

  async function unscheduleTask(id) {
    cancelReminder(id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, scheduled_hour: null, scheduled_half: false, scheduled_duration: null, reminder: false } : t))
    await supabase.from('tasks').update({ scheduled_hour: null, scheduled_half: false, scheduled_duration: null, reminder: false }).eq('id', id)
  }

  async function toggleReminder(id) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (task.scheduled_hour == null) { showBanner('Schedule this task first to set a reminder.'); return }
    const active = !task.reminder
    setTasks(prev => prev.map(t => t.id === id ? { ...t, reminder: active } : t))
    await supabase.from('tasks').update({ reminder: active }).eq('id', id)
    if (active) { armReminder({ ...task, reminder: true }); showBanner(`Reminder set for ${formatTime(task.scheduled_hour, task.scheduled_half)}`) }
    else cancelReminder(id)
  }

  function armReminder(task) {
    if (timerIds.current[task.id]) clearTimeout(timerIds.current[task.id])
    const fire = new Date()
    fire.setHours(task.scheduled_hour, task.scheduled_half ? 30 : 0, 0, 0)
    const ms = fire - Date.now()
    if (ms <= 0) return
    timerIds.current[task.id] = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Focus — time to start!', { body: task.text })
      else showBanner('Reminder: ' + task.text)
    }, ms)
  }

  function cancelReminder(id) {
    if (timerIds.current[id]) clearTimeout(timerIds.current[id])
    delete timerIds.current[id]
  }

  async function autoSchedule() {
    const workStart = profile?.work_start ?? 8
    const workEnd = profile?.work_end ?? 18
    const unscheduled = tasks.filter(t => t.scheduled_hour == null)
    if (!unscheduled.length) { showBanner('All tasks already scheduled!'); return }
    const TOTAL = (workEnd - workStart) * 2
    const perTask = Math.max(2, Math.floor(TOTAL / tasks.length))
    const used = new Set()
    tasks.forEach(t => {
      if (t.scheduled_hour != null) {
        const s = (t.scheduled_hour - workStart) * 2 + (t.scheduled_half ? 1 : 0)
        for (let i = 0; i < (t.scheduled_duration || 2); i++) used.add(s + i)
      }
    })
    const nextFree = from => { for (let i = from; i < TOTAL; i++) if (!used.has(i)) return i; return from }
    const updates = []
    let cursor = 0
    for (const task of unscheduled) {
      const slot = nextFree(cursor)
      const h = workStart + Math.floor(slot / 2), half = slot % 2 === 1
      updates.push({ id: task.id, h, half, dur: perTask })
      for (let i = 0; i < perTask; i++) used.add(slot + i)
      cursor = slot + perTask
    }
    setTasks(prev => prev.map(t => { const u = updates.find(u => u.id === t.id); return u ? { ...t, scheduled_hour: u.h, scheduled_half: u.half, scheduled_duration: u.dur } : t }))
    await Promise.all(updates.map(u => supabase.from('tasks').update({ scheduled_hour: u.h, scheduled_half: u.half, scheduled_duration: u.dur }).eq('id', u.id)))
    showBanner(`Scheduled ${unscheduled.length} task${unscheduled.length !== 1 ? 's' : ''} across your day.`)
  }

  async function clearSchedule() {
    tasks.forEach(t => cancelReminder(t.id))
    setTasks(prev => prev.map(t => ({ ...t, scheduled_hour: null, scheduled_half: false, scheduled_duration: null, reminder: false })))
    await supabase.from('tasks').update({ scheduled_hour: null, scheduled_half: false, scheduled_duration: null, reminder: false })
      .eq('user_id', session.user.id).eq('task_date', selectedDate)
  }

  // ─── Progress ─────────────────────────────────────────────────────────────

  async function saveDailyProgress(currentTasks) {
    if (!session) return
    const t = currentTasks || tasks
    if (!t.length) return
    const done = t.filter(x => x.done).length
    const pct = Math.round(done / t.length * 100)
    await supabase.from('progress_history').upsert({
      user_id: session.user.id, date: todayStr(), completion_pct: pct,
    }, { onConflict: 'user_id,date' })
    if (pct > 0) recalculateStreak()
  }

  async function fetchProgressHistory() {
    if (!session) return []
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10)
    })
    const { data } = await supabase.from('progress_history').select('date, completion_pct')
      .eq('user_id', session.user.id).in('date', days)
    return days.map(date => {
      const row = data?.find(r => r.date === date)
      return { date, pct: row?.completion_pct ?? 0 }
    })
  }

  async function fetchMonthTaskCounts(year, month) {
    if (!session) return {}
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data } = await supabase.from('tasks').select('task_date')
      .eq('user_id', session.user.id).gte('task_date', start).lte('task_date', end)
    const counts = {}
    data?.forEach(t => { counts[t.task_date] = (counts[t.task_date] || 0) + 1 })
    return counts
  }

  // ─── Friends ──────────────────────────────────────────────────────────────

  async function fetchFriends() {
    if (!session) return []
    const { data: friendRows } = await supabase
      .from('friends').select('friend_id').eq('user_id', session.user.id)
    if (!friendRows?.length) return []
    const ids = friendRows.map(r => r.friend_id)
    const { data: profiles } = await supabase
      .from('profiles').select('id, name, email, streak, xp').in('id', ids)
    return profiles || []
  }

  async function addFriend(email) {
    const trimmed = email.trim().toLowerCase()
    if (trimmed === profile?.email?.toLowerCase()) { showBanner("You can't add yourself."); return false }
    const { data: found } = await supabase.from('profiles').select('id, name, email').ilike('email', trimmed).single()
    if (!found) { showBanner('No user found with that email.'); return false }
    const { error } = await supabase.from('friends').insert({ user_id: session.user.id, friend_id: found.id })
    if (error?.code === '23505') { showBanner('Already friends!'); return false }
    if (error) { showBanner('Could not add friend.'); return false }
    showBanner(`Added ${found.name || found.email} as a friend!`)
    return true
  }

  async function removeFriend(friendId) {
    await supabase.from('friends').delete().eq('user_id', session.user.id).eq('friend_id', friendId)
  }

  // ─── RevenueCat (iOS IAP) ─────────────────────────────────────────────────

  async function syncRevenueCat(userId) {
    if (!window.Capacitor || !RC_IOS_KEY) return
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      await Purchases.configure({ apiKey: RC_IOS_KEY, appUserID: userId })
      const { customerInfo } = await Purchases.getCustomerInfo()
      const active = !!customerInfo.entitlements.active['focus daily planner Pro']
      await supabase.from('profiles').update({ subscribed: active }).eq('id', userId)
    } catch (e) {
      console.error('RevenueCat sync failed:', e)
    }
  }

  // ─── Subscription ─────────────────────────────────────────────────────────

  async function startCheckout() {
    if (window.Capacitor && RC_IOS_KEY) {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor')
        await Purchases.configure({ apiKey: RC_IOS_KEY, appUserID: session.user.id })
        const { offerings } = await Purchases.getOfferings()
        const pkg = offerings.current?.monthly
          || offerings.current?.availablePackages?.[0]
        if (!pkg) { showBanner('Subscription not available right now.'); return }
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
        if (customerInfo.entitlements.active['focus daily planner Pro']) {
          await supabase.from('profiles').update({ subscribed: true }).eq('id', session.user.id)
          await fetchProfile(session.user.id)
          showBanner('Welcome to Pro! 🎉')
        }
      } catch (e) {
        if (e?.code !== 'PURCHASE_CANCELLED') showBanner('Purchase failed. Please try again.')
      }
    } else {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { email: session.user.email, userId: session.user.id } })
      if (error) throw error
      window.location.href = data.url
    }
  }

  async function cancelSubscription() {
    if (window.Capacitor) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: 'https://apps.apple.com/account/subscriptions' })
      showBanner('Manage your subscription in iOS Settings → Apple ID → Subscriptions.')
    } else {
      const { error } = await supabase.functions.invoke('cancel-subscription', { body: { userId: session.user.id } })
      if (error) throw error
      await supabase.from('profiles').update({ subscribed: false, stripe_subscription_id: null }).eq('id', session.user.id)
      await fetchProfile(session.user.id)
      showBanner('Subscription cancelled.')
    }
  }

  // ─── Banner ───────────────────────────────────────────────────────────────

  function showBanner(text) {
    setBanner(text)
    if (bannerTimer.current) clearTimeout(bannerTimer.current)
    bannerTimer.current = setTimeout(() => setBanner(null), 4000)
  }

  // ─── Context value ────────────────────────────────────────────────────────

  const value = {
    session, profile, authLoading,
    signIn, signUp, signOut, deleteAccount, updateProfile,
    daysLeft, isPro, isExpired,
    tasks, tasksLoading,
    selectedDate, setSelectedDate,
    addTask, deleteTask, toggleTask,
    scheduleTask, resizeTask, unscheduleTask,
    carryoverTask, carryoverAllUnfinished, setRecurring,
    toggleReminder, autoSchedule, clearSchedule,
    fetchProgressHistory, saveDailyProgress, fetchMonthTaskCounts,
    fetchFriends, addFriend, removeFriend,
    registerPush, unregisterPush, isPushEnabled,
    startCheckout, cancelSubscription,
    showDayRating, setShowDayRating, saveDayRating,
    postWin, fetchTemplates, saveTemplate, deleteTemplate, applyTemplate,
    nativeShare,
    banner, showBanner,
    chatHistory, setChatHistory,
    TASK_MIN, TASK_MAX, COLORS, BADGE_DEFS,
    awardXP,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() { return useContext(AppContext) }

export function formatTime(h, half) {
  const m = half ? '30' : '00'
  const ampm = h >= 12 ? 'pm' : 'am'
  const d = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${d}:${m}${ampm}`
}

export function formatRange(h, half, dur) {
  let eh = h, ef = half
  for (let i = 0; i < dur; i++) { if (ef) { eh++; ef = false } else ef = true }
  return `${formatTime(h, half)}–${formatTime(eh, ef)}`
}
