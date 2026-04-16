import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function LeaderboardTab() {
  const { profile, fetchFriends, addFriend, removeFriend } = useApp()
  const [tab, setTab] = useState('global') // 'global' | 'friends'
  const [rows, setRows] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [friendInput, setFriendInput] = useState('')
  const [adding, setAdding] = useState(false)

  const medals = ['🥇', '🥈', '🥉']
  const myId = profile?.id
  const myName = profile?.name || profile?.email?.split('@')[0]

  useEffect(() => {
    supabase.rpc('get_leaderboard').then(({ data, error }) => {
      if (!error && data) setRows(data)
      setLoading(false)
    })
    fetchFriends().then(setFriends)
  }, [])

  async function handleAddFriend() {
    if (!friendInput.trim()) return
    setAdding(true)
    const ok = await addFriend(friendInput)
    if (ok) {
      setFriendInput('')
      fetchFriends().then(setFriends)
    }
    setAdding(false)
  }

  async function handleRemove(id) {
    await removeFriend(id)
    setFriends(prev => prev.filter(f => f.id !== id))
  }

  const displayRows = tab === 'global' ? rows : [
    // Include self in friends leaderboard
    { user_id: myId, name: myName + ' (you)', streak: profile?.streak || 0, xp: profile?.xp || 0 },
    ...friends.map(f => ({ user_id: f.id, name: f.name || f.email?.split('@')[0], streak: f.streak || 0, xp: f.xp || 0 }))
  ].sort((a, b) => b.streak - a.streak || b.xp - a.xp)

  return (
    <>
      {/* Tab toggle */}
      <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1.25rem' }}>
        {['global', 'friends'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            background: tab === t ? 'var(--green)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--muted)'
          }}>{t === 'global' ? '🌍 Global' : '👥 Friends'}</button>
        ))}
      </div>

      {/* Add friend (friends tab only) */}
      {tab === 'friends' && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Add a friend</div>
          <div style={{ display: 'flex', gap: 7 }}>
            <input
              type="email"
              placeholder="friend@email.com"
              value={friendInput}
              onChange={e => setFriendInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
              style={{ flex: 1, fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--border2)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif' }}
            />
            <button onClick={handleAddFriend} disabled={adding} style={{
              padding: '9px 14px', borderRadius: 8, background: 'var(--green)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', flexShrink: 0
            }}>{adding ? '…' : 'Add'}</button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {tab === 'global' ? 'All users · ranked by streak' : 'Friends · ranked by streak'}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: 13, color: 'var(--muted)' }}>Loading…</div>
      ) : displayRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: 13, color: 'var(--muted)' }}>
          {tab === 'friends' ? 'Add friends above to compare streaks!' : 'No data yet — complete tasks to appear here!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayRows.map((row, i) => {
            const isMe = row.user_id === myId || row.name?.includes('(you)')
            return (
              <div key={row.user_id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px',
                background: isMe ? 'var(--green-light)' : 'var(--surface)',
                border: isMe ? '0.5px solid var(--green)' : '0.5px solid var(--border)',
                borderRadius: 12,
              }}>
                <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>
                  {i < 3 ? medals[i] : <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>#{i + 1}</span>}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: isMe ? 500 : 400, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{row.xp || 0} xp</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 500,
                    color: row.streak > 0 ? 'var(--green)' : 'var(--muted)',
                    background: row.streak > 0 ? 'var(--green-light)' : 'var(--raised)',
                    borderRadius: 20, padding: '3px 10px',
                  }}>
                    {row.streak} day{row.streak !== 1 ? 's' : ''}
                  </span>
                  {tab === 'friends' && !isMe && (
                    <button onClick={() => handleRemove(row.user_id)} title="Remove friend" style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 0
                    }}>×</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
