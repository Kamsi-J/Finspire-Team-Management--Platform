import React from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon = '✨',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="p-10 text-center flex flex-col items-center justify-center">
      <span className="text-3xl mb-3 select-none">{icon}</span>
      <h3 className="text-sm font-semibold text-[var(--text,#18181B)]">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--text-3,#A1A1AA)] mt-1 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--brand, #701428)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
