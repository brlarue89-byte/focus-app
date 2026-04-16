import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function WinWall() {
  const [wins, setWins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('wins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setWins(data || [])
        setLoading(false)
      })

    // Live updates via realtime
    const channel = supabase
      .channel('wins_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wins' }, payload => {
        setWins(prev => [payload.new, ...prev].slice(0, 50))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: 13, color: 'var(--muted)' }}>Loading…</div>

  if (!wins.length) return (
    <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>No wins yet</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Complete tasks and hit milestones to appear here!</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {wins.map(win => (
        <div key={win.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 12, padding: '11px 14px',
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{win.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
              {win.display_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{win.text}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{timeAgo(win.created_at)}</div>
        </div>
      ))}
    </div>
  )
}
