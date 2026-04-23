import { useState, useEffect } from 'react'

export function useToasts() {
  const [toasts, setToasts] = useState([])

  function addToast(message, type = 'join') {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  return { toasts, addToast }
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

function ToastItem({ toast }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const isLeave = toast.type === 'leave'

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all duration-300"
      style={{
        background: isLeave ? '#1a0a0a' : '#0a1a0a',
        borderColor: isLeave ? '#ef444440' : '#22c55e40',
        color: isLeave ? '#fca5a5' : '#86efac',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        minWidth: '220px',
      }}
    >
      <span className="text-base">{isLeave ? '👋' : '🟢'}</span>
      <span>{toast.message}</span>
    </div>
  )
}
