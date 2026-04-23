import { useState, useEffect, useRef } from 'react'
import { X, FileText } from 'lucide-react'

export default function NewDocModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Auto-focus input when modal opens
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  function handleSubmit() {
    onConfirm(name.trim() || 'Untitled Document')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      style={{ animation: 'fadeIn 0.15s ease' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText size={16} className="text-blue-400" />
            </div>
            <h2 className="text-white font-semibold">Create New Document</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Enter document name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors mb-4 text-sm"
        />

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95 text-sm"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
