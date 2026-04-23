import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Clock, Users, Copy, ExternalLink, ArrowLeft, Trash2, X } from 'lucide-react'
import { listDocuments, createDocument, deleteDocument } from '../api'
import NewDocModal from '../components/NewDocModal'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({ doc, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Delete Document?</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          This will permanently delete <span className="text-white font-medium">"{doc.title}"</span>. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-500/80 hover:bg-red-500 transition-colors text-sm">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Documents() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [showNewDocModal, setShowNewDocModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // doc to delete
  const [toast, setToast] = useState(null)

  useEffect(() => {
    listDocuments()
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCreate(docTitle) {
    setShowNewDocModal(false)
    try {
      const { docId } = await createDocument(docTitle)
      navigate(`/editor/${docId}`)
    } catch {
      alert('Failed to create document.')
    }
  }

  function copyLink(id) {
    navigator.clipboard.writeText(`${window.location.origin}/editor/${id}`)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const id = deleteTarget._id
    setDeleteTarget(null)
    try {
      await deleteDocument(id)
      setDocs((prev) => prev.filter((d) => d._id !== id))
      showToast('Document deleted')
    } catch {
      showToast('Failed to delete document')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Topbar */}
      <div className="border-b border-white/10 bg-[#0d1117] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <span className="text-xl font-black cursor-pointer"
            style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            onClick={() => navigate('/')}>SyncDocs</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-medium">My Documents</span>
        </div>
        <button onClick={() => setShowNewDocModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Plus size={16} /> New Document
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-8">All Documents</h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-24">
            <FileText size={48} className="text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-6">No documents yet</p>
            <button onClick={() => setShowNewDocModal(true)}
              className="px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
              Create your first document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div key={doc._id}
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-blue-500/40 hover:bg-white/8 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                onClick={() => navigate(`/editor/${doc._id}`)}>

                {/* Delete button — top right, visible on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc) }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Delete document">
                  <Trash2 size={13} />
                </button>

                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <FileText size={18} className="text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <Users size={11} className="text-green-400" />
                    <span className="text-green-400 text-xs font-medium">Live</span>
                  </div>
                </div>

                <h3 className="text-white font-semibold mb-1 truncate pr-6">{doc.title}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-4">
                  <Clock size={11} />
                  <span>{timeAgo(doc.updatedAt)}</span>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => navigate(`/editor/${doc._id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-medium">
                    <ExternalLink size={12} /> Open
                  </button>
                  <button onClick={() => copyLink(doc._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors text-xs font-medium">
                    <Copy size={12} />
                    {copied === doc._id ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Document Modal */}
      {showNewDocModal && <NewDocModal onConfirm={handleCreate} onCancel={() => setShowNewDocModal(false)} />}

      {/* Delete Confirmation Modal */}
      {deleteTarget && <DeleteModal doc={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}

      {/* Simple toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#0f1117] border border-white/10 text-slate-300 text-sm shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}
