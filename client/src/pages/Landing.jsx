import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, GitMerge, Users, X, FileText, ExternalLink } from 'lucide-react'
import { createDocument, listDocuments } from '../api'
import NetworkBackground from '../components/NetworkBackground'
import NewDocModal from '../components/NewDocModal'

export default function Landing() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [showNewDocModal, setShowNewDocModal] = useState(false)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)

  async function handleNewDoc(docTitle) {
    setShowNewDocModal(false)
    setLoading(true)
    try {
      const { docId } = await createDocument(docTitle)
      navigate(`/editor/${docId}`)
    } catch {
      alert('Failed to create document. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenModal() {
    setShowModal(true)
    try {
      const data = await listDocuments()
      setDocs(Array.isArray(data) ? data : [])
    } catch {
      setDocs([])
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #1a0a2e 50%, #0a0e1a 100%)' }}
    >
      <NetworkBackground />

      {/* No more manual orbs — tsparticles handles the network */}

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-30px) scale(1.08); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .gradient-text {
          background: linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6, #60a5fa);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s linear infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cursor-blink { animation: blink 1s step-end infinite; }
      `}</style>

      {/* Hero */}
      <div className="relative z-10 text-center px-6 max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Real-time collaboration, powered by WebSockets
        </div>

        <h1 className="text-7xl font-black mb-4 tracking-tight gradient-text">
          SyncDocs
        </h1>

        <p className="text-xl text-slate-400 mb-10 leading-relaxed">
          Real-time collaborative editing.<br />
          <span className="text-slate-300">No conflicts. No chaos.</span>
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => setShowNewDocModal(true)}
            disabled={loading}
            className="px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
          >
            {loading ? 'Creating...' : '+ New Document'}
          </button>
          <button
            onClick={handleOpenModal}
            className="px-8 py-3.5 rounded-xl font-semibold text-slate-300 border border-slate-600 hover:border-slate-400 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95 bg-white/5"
          >
            Open Document
          </button>
          <button
            onClick={() => navigate('/docs')}
            className="px-8 py-3.5 rounded-xl font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
          >
            My Documents
          </button>
        </div>
      </div>

      {/* Mock editor preview */}
      <div className="relative z-10 mt-16 w-full max-w-2xl px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/20">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-slate-500 text-xs font-mono">syncdocs — collaborative-notes.txt</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 text-xs">3 users live</span>
            </div>
          </div>
          <div className="p-6 font-serif text-slate-300 text-sm leading-7 bg-[#fafafa]/5 min-h-[120px]">
            <span style={{ color: '#4ECDC4' }}>|</span>
            <span> The quick brown fox jumps over the lazy dog. </span>
            <span style={{ color: '#FF6B6B' }}>|</span>
            <span className="text-slate-400"> Collaborative editing in real-time with zero conflicts</span>
            <span className="cursor-blink text-blue-400">|</span>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="relative z-10 mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-6 pb-16">
        {[
          { icon: <Zap size={22} />, title: 'Instant Sync', desc: 'WebSocket-powered real-time updates across all connected clients instantly.', color: '#FFEAA7' },
          { icon: <GitMerge size={22} />, title: 'Conflict-Free', desc: 'Operational Transformation algorithm resolves concurrent edits automatically.', color: '#4ECDC4' },
          { icon: <Users size={22} />, title: 'Live Presence', desc: 'See who\'s editing in real time with colored cursors and user indicators.', color: '#FF6B6B' },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/8 hover:border-white/20 transition-all duration-200 hover:-translate-y-1"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: f.color + '22', color: f.color }}>
              {f.icon}
            </div>
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* New Document Modal */}
      {showNewDocModal && (
        <NewDocModal onConfirm={handleNewDoc} onCancel={() => setShowNewDocModal(false)} />
      )}

      {/* Open Document Modal */}
      {showModal && (        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-white font-semibold text-lg">Open Document</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {docs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No documents yet.</p>
              ) : (
                docs.map((doc) => (
                  <button
                    key={doc._id}
                    onClick={() => navigate(`/editor/${doc._id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                  >
                    <FileText size={18} className="text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 font-medium truncate">{doc.title}</p>
                      <p className="text-slate-500 text-xs">{new Date(doc.updatedAt).toLocaleString()}</p>
                    </div>
                    <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
