import { useEffect, useState } from 'react'
import { Zap, Check } from 'lucide-react'

export function ConflictCard({ conflict, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="rounded-xl border p-3 text-xs font-mono transition-all duration-300 overflow-hidden"
      style={{
        borderColor: '#f97316',
        background: 'linear-gradient(135deg, #1a0800, #0f0500)',
        boxShadow: '0 0 16px #f9731640',
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        opacity: visible ? 1 : 0,
        maxHeight: visible ? '200px' : '0px',
      }}
    >
      <div className="flex items-center gap-1.5 text-orange-400 font-bold mb-2">
        <Zap size={12} />
        CONFLICT DETECTED & RESOLVED
      </div>
      <div className="space-y-1 text-slate-400">
        <div><span className="text-blue-400">User A:</span> {conflict.opA}</div>
        <div><span className="text-red-400">User B:</span> {conflict.opB}</div>
      </div>
      <div className="mt-2 pt-2 border-t border-white/10 text-slate-400">
        <div className="text-yellow-400 mb-1">OT Transform Applied:</div>
        <div>→ {conflict.resolution}</div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-green-400">
        <Check size={11} />
        Document consistent
      </div>
    </div>
  )
}
