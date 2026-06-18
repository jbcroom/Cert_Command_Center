import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

function timeSince(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TYPE_ICONS = {
  readiness_alert: '📋',
  exam_reminder: '🎯',
  reflection_prompt: '📓',
  streak_warning: '🔥',
  milestone: '🏆',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.read).length)
  }, [])

  useEffect(() => { load() }, [load])

  // Poll every 60s for new notifications
  useEffect(() => {
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function openPanel() {
    setOpen(o => !o)
    if (unread > 0) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
      setNotifications(ns => ns.map(n => ({ ...n, read: true })))
      setUnread(0)
    }
  }

  async function dismiss(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(ns => ns.filter(n => n.id !== id))
  }

  function handleClick(n) {
    if (n.cert_id) navigate(`/cert/${n.cert_id}`)
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={openPanel}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        title="Notifications"
      >
        <div className="relative">
          <Bell size={15} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-danger text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        Notifications
        {unread > 0 && (
          <span className="ml-auto text-[10px] font-bold bg-danger text-white px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated flex-shrink-0">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No notifications yet.</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-bg-elevated last:border-0 hover:bg-bg-elevated/50 transition-colors ${!n.read ? 'bg-accent-blue/5' : ''}`}
                >
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{timeSince(n.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {n.cert_id && (
                      <button onClick={() => handleClick(n)}
                        className="text-text-muted hover:text-accent-blue transition-colors">
                        <ExternalLink size={12} />
                      </button>
                    )}
                    <button onClick={() => dismiss(n.id)}
                      className="text-text-muted hover:text-danger transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
