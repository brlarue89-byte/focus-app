import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function TaskTemplatesModal({ onClose }) {
  const { fetchTemplates, saveTemplate, deleteTemplate, applyTemplate } = useApp()
  const [templates, setTemplates] = useState([])
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates().then(t => { setTemplates(t); setLoading(false) })
  }, [])

  async function handleSave() {
    const name = saveName.trim()
    if (!name) return
    setSaving(true)
    const ok = await saveTemplate(name)
    if (ok) {
      setSaveName('')
      fetchTemplates().then(setTemplates)
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await deleteTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function handleApply(t) {
    await applyTemplate(t.tasks)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000, padding: '0 0 24px',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 20, padding: '24px 20px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.28s ease',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 18, color: 'var(--ink)' }}>Task Templates</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>

        {/* Save current tasks */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Save today's tasks as a template</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text" placeholder="Template name…" value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              style={{ flex: 1, fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--border2)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif' }}
            />
            <button onClick={handleSave} disabled={saving || !saveName.trim()} style={{
              padding: '9px 14px', borderRadius: 8, background: 'var(--green)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
              opacity: !saveName.trim() ? 0.5 : 1,
            }}>{saving ? '…' : 'Save'}</button>
          </div>
        </div>

        {/* Saved templates */}
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Saved templates</div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--muted)', fontSize: 13 }}>No templates yet — save one above!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(t => (
                <div key={t.id} style={{
                  background: 'var(--raised)', borderRadius: 12,
                  border: '0.5px solid var(--border)', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {t.tasks.length} task{t.tasks.length !== 1 ? 's' : ''} · {t.tasks.slice(0, 3).map(tt => tt.text).join(', ')}{t.tasks.length > 3 ? '…' : ''}
                    </div>
                  </div>
                  <button onClick={() => handleApply(t)} style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none',
                    background: 'var(--green)', color: '#fff',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
                  }}>Apply</button>
                  <button onClick={() => handleDelete(t.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
