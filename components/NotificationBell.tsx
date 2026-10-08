'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface TeamNotification {
  id: string
  title: string
  description?: string
  time: string
  type: 'task' | 'meeting' | 'broadcast'
}

interface Props {
  unreadCount?: number
  notifications?: TeamNotification[]
  onMarkAllRead?: () => void
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TYPE_ICON: Record<string, string> = {
  task: 'task_alt',
  meeting: 'event',
  broadcast: 'campaign',
}

export default function NotificationBell({
  unreadCount = 0,
  notifications = [],
  onMarkAllRead,
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const hasRungRef = useRef(false)
  const [ringing, setRinging] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (unreadCount > 0 && !hasRungRef.current) {
      hasRungRef.current = true
      setRinging(true)
      const t = setTimeout(() => setRinging(false), 900)
      return () => clearTimeout(t)
    }
    if (unreadCount === 0) hasRungRef.current = false
  }, [unreadCount])

  const handleClose = useCallback(() => setOpen(false), [])
  const handleMarkRead = useCallback(() => {
    onMarkAllRead?.()
    setOpen(false)
  }, [onMarkAllRead])

  const sheet = open ? (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        className="relative rounded-t-2xl flex flex-col"
        style={{ background: 'var(--card)', height: '82vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between px-5 pb-4 pt-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2
              className="font-display text-[20px] font-bold leading-tight"
              style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
            >
              {unreadCount > 0
                ? `${unreadCount} new alert${unreadCount === 1 ? '' : 's'}`
                : 'No new alerts'}
            </h2>
            {unreadCount > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                Tap any alert to view details
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkRead}
                className="text-xs font-semibold transition-opacity hover:opacity-75"
                style={{ color: 'var(--brand)' }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--canvas)]"
              style={{ color: 'var(--text-3)' }}
              aria-label="Close notifications"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center gap-4">
              <span
                className="material-symbols-outlined text-[48px]"
                style={{ color: 'var(--text-3)' }}
              >
                notifications_none
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Nothing yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                  Task updates, meeting reminders, and broadcasts will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-6 flex flex-col gap-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl px-4 py-3.5 flex flex-col gap-2"
                  style={{ background: 'var(--canvas)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white"
                        style={{ background: 'var(--brand)' }}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {TYPE_ICON[n.type] ?? 'notifications'}
                        </span>
                      </span>
                      <span
                        className="text-[13px] font-semibold truncate"
                        style={{ color: 'var(--text)' }}
                      >
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                      {relativeTime(n.time)}
                    </span>
                  </div>
                  {n.description && (
                    <p
                      className="text-xs leading-snug line-clamp-2"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {n.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-charcoal-3"
        aria-label={unreadCount > 0 ? `${unreadCount} new alerts` : 'Notifications'}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={{
            color: 'var(--neutral)',
            display: 'inline-block',
            transformOrigin: 'top center',
            animation: ringing ? 'bellRing 0.8s ease-in-out both' : 'none',
          }}
        >
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full text-white text-[9px] font-bold leading-none"
            style={{ background: 'var(--brand)', animation: 'badgePulse 2s ease-in-out infinite' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {mounted && createPortal(sheet, document.body)}
    </>
  )
}
