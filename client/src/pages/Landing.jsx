import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, GitMerge, Users, X, FileText, ExternalLink, ArrowRight, Globe, Shield, Cpu } from 'lucide-react'
import { createDocument, listDocuments } from '../api'
import NewDocModal from '../components/NewDocModal'

// Animated canvas network background
function CanvasBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(52, 211, 153, 0.5)'
        ctx.fill()
      })
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(52, 211, 153, ${0.15 * (1 - dist / 120)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />
}

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
    <div className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(135deg, #020c07 0%, #041a0e 40%, #061f12 70%, #020c07 100%)' }}>

      <CanvasBackground />

      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 12px rgba(52,211,153,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }
        .hero-title {
          background: linear-gradient(135deg, #34d399, #10b981, #6ee7b7, #34d399);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s linear infinite;
        }
        .fade-up { animation: fadeUp 0.7s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.7s ease 0.15s forwards; opacity: 0; }
        .fade-up-3 { animation: fadeUp 0.7s ease 0.3s forwards; opacity: 0; }
        .fade-up-4 { animation: fadeUp 0.7s ease 0.45s forwards; opacity: 0; }
        .glow-btn {
          box-shadow: 0 0 20px rgba(52,211,153,0.3), 0 0 40px rgba(52,211,153,0.1);
          transition: all 0.2s ease;
        }
        .glow-btn:hover {
          box-shadow: 0 0 30px rgba(52,211,153,0.5), 0 0 60px rgba(52,211,153,0.2);
          transform: translateY(-2px);
        }
        .card-hover {
          transition: all 0.25s ease;
          border: 1px solid rgba(52,211,153,0.1);
        }
        .card-hover:hover {
          border-color: rgba(52,211,153,0.35);
          background: rgba(52,211,153,0.05);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(52,211,153,0.1);
        }
        .stat-num {
          background: linear-gradient(135deg, #34d399, #6ee7b7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .cursor-blink { animation: blink 1s step-end infinite; }
      `}</style>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SyncDocs</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenModal}
            className="px-4 py-2 text-sm text-emerald-300 hover:text-white transition-colors font-medium">
            Open Doc
          </button>
          <button onClick={() => navigate('/docs')}
            className="px-4 py-2 text-sm text-emerald-300 hover:text-white transition-colors font-medium">
            My Docs
          </button>
          <button onClick={() => setShowNewDocModal(true)}
            className="glow-btn px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-12 pb-8 text-center">

        {/* Badge */}
        <div className="fade-up mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Distributed Computing Project · Real-time Collaboration
        </div>

        {/* Title */}
        <h1 className="fade-up-2 hero-title text-8xl font-black tracking-tight mb-4 leading-none">
          SyncDocs
        </h1>

        <p className="fade-up-3 text-xl mb-3 font-light" style={{ color: '#a7f3d0' }}>
          Real-time collaborative editing.
        </p>
        <p className="fade-up-3 text-lg mb-10" style={{ color: '#6ee7b7', opacity: 0.7 }}>
          No conflicts. No chaos. Powered by Operational Transformation & Redis Pub/Sub.
        </p>

        {/* CTA Buttons */}
        <div className="fade-up-4 flex gap-4 flex-wrap justify-center mb-16">
          <button onClick={() => setShowNewDocModal(true)} disabled={loading}
            className="glow-btn flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #059669, #34d399)' }}>
            {loading ? 'Creating...' : 'Start Collaborating'}
            <ArrowRight size={16} />
          </button>
          <button onClick={handleOpenModal}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }}>
            <FileText size={16} />
            Open Document
          </button>
        </div>

        {/* Mock Editor Preview */}
        <div className="fade-up-4 w-full max-w-3xl mb-16">
          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: '1px solid rgba(52,211,153,0.15)', background: 'rgba(4,26,14,0.8)', backdropFilter: 'blur(20px)' }}>
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(52,211,153,0.1)', background: 'rgba(2,12,7,0.6)' }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="ml-3 text-xs font-mono" style={{ color: 'rgba(52,211,153,0.5)' }}>
                  syncdocs — distributed-notes.txt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {['#34d399','#f59e0b','#60a5fa'].map((c,i) => (
                    <div key={i} className="w-5 h-5 rounded-full border border-black/50 flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: c, fontSize: '8px' }}>
                      {['O','A','S'][i]}
                    </div>
                  ))}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                  ● 3 Live
                </span>
              </div>
            </div>
            {/* Editor content */}
            <div className="p-6 font-mono text-sm leading-7" style={{ color: '#a7f3d0' }}>
              <span style={{ color: '#34d399' }}>|</span>
              <span style={{ color: '#d1fae5' }}> Distributed systems enable </span>
              <span style={{ color: '#f59e0b' }}>|</span>
              <span style={{ color: '#a7f3d0' }}> multiple nodes to collaborate </span>
              <span style={{ color: '#60a5fa' }}>|</span>
              <span style={{ color: '#6ee7b7' }}> seamlessly in real-time</span>
              <span className="cursor-blink" style={{ color: '#34d399' }}>|</span>
            </div>
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-2 text-xs font-mono"
              style={{ borderTop: '1px solid rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.4)' }}>
              <span>OT Engine Active · Redis Pub/Sub Connected</span>
              <span>MongoDB Atlas · 3 ops synced</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="fade-up-4 grid grid-cols-3 gap-8 mb-16 max-w-lg w-full">
          {[
            { num: '< 50ms', label: 'Sync Latency' },
            { num: '∞', label: 'Concurrent Users' },
            { num: '100%', label: 'Conflict-Free' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="stat-num text-3xl font-black mb-1">{s.num}</div>
              <div className="text-xs" style={{ color: 'rgba(52,211,153,0.5)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mb-16">
          {[
            { icon: <Zap size={20} />, title: 'Instant Sync', desc: 'WebSocket-powered real-time updates via Socket.IO', color: '#fbbf24' },
            { icon: <GitMerge size={20} />, title: 'OT Algorithm', desc: 'Operational Transformation resolves all conflicts', color: '#34d399' },
            { icon: <Globe size={20} />, title: 'Redis Pub/Sub', desc: 'Multi-instance sync across distributed servers', color: '#60a5fa' },
            { icon: <Users size={20} />, title: 'Live Presence', desc: 'Colored cursors and real-time user indicators', color: '#f472b6' },
          ].map((f) => (
            <div key={f.title} className="card-hover rounded-2xl p-5 text-left"
              style={{ background: 'rgba(4,26,14,0.6)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: f.color + '18', color: f.color }}>
                {f.icon}
              </div>
              <h3 className="text-white font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(167,243,208,0.6)' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Tech Stack Pills */}
        <div className="fade-up-4 flex flex-wrap gap-2 justify-center mb-8">
          {['React', 'Node.js', 'Socket.IO', 'MongoDB', 'Redis', 'OT Algorithm', 'TailwindCSS'].map((t) => (
            <span key={t} className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#6ee7b7' }}>
              {t}
            </span>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'rgba(52,211,153,0.3)' }}>
          Built for Distributed Computing · University Project
        </p>
      </div>

      {/* New Document Modal */}
      {showNewDocModal && (
        <NewDocModal onConfirm={handleNewDoc} onCancel={() => setShowNewDocModal(false)} />
      )}

      {/* Open Document Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: '#041a0e', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="flex items-center justify-between p-5"
              style={{ borderBottom: '1px solid rgba(52,211,153,0.1)' }}>
              <h2 className="text-white font-semibold">Open Document</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'rgba(52,211,153,0.5)' }}
                className="hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {docs.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: 'rgba(52,211,153,0.4)' }}>No documents yet.</p>
              ) : (
                docs.map((doc) => (
                  <button key={doc._id} onClick={() => navigate(`/editor/${doc._id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left group"
                    style={{ hover: 'background: rgba(52,211,153,0.05)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <FileText size={16} style={{ color: 'rgba(52,211,153,0.5)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#d1fae5' }}>{doc.title}</p>
                      <p className="text-xs" style={{ color: 'rgba(52,211,153,0.4)' }}>
                        {new Date(doc.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <ExternalLink size={13} style={{ color: 'rgba(52,211,153,0.3)' }} />
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
