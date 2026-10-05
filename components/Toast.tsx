'use client'
import React, { createContext, useContext, useState } from 'react'

interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

interface ToastContextType {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, text }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between px-4 py-3 rounded-xl shadow-lg border transition-all transform translate-y-0 animate-in fade-in slide-in-from-bottom-3 duration-200"
            style={{
              background: 'var(--card, #FFFFFF)',
              borderColor:
                toast.type === 'error'
                  ? '#FECDD3'
                  : toast.type === 'info'
                  ? '#BFDBFE'
                  : '#BBF7D0',
              color: 'var(--text, #18181B)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background:
                    toast.type === 'error'
                      ? '#DC2626'
                      : toast.type === 'info'
                      ? '#2563EB'
                      : '#16A34A',
                }}
              />
              <p className="text-xs font-semibold truncate">{toast.text}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-xs ml-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
