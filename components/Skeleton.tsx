import React from 'react'

export function Skeleton({
  className = '',
  style = {},
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{
        background: 'var(--border, #E4E4E7)',
        opacity: 0.6,
        ...style,
      }}
    />
  )
}

export function SkeletonRow() {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-[var(--border)]">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-7 w-20 rounded-lg" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-3">
      <Skeleton className="h-3 w-1/4 font-mono-code" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}
