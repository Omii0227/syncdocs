import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  Users, Share2, History, ChevronDown, ChevronRight,
  Copy, Check, X, RotateCcw, ArrowLeft, FileText,
  Upload, Download
} from 'lucide-react'
import mammoth from 'mammoth'
import { Document, Paragraph, TextRun, Packer } from 'docx'
import { getDocument, getHistory, restoreSnapshot, updateTitle } from '../api'
import { USER_COLORS, generateUserId } from '../utils/colors'
import { useToasts, ToastContainer } from '../components/Toast'
import { ConflictCard } from '../components/ConflictCard'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

// ─── Typing Dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className="flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1 h-1 rounded-full bg-blue-400"
          style={{ animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  )
}

// ─── Username Modal ───────────────────────────────────────────────────────────
function UsernameModal({ onConfirm }) {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 mx-auto">
          <Users size={22} className="text-blue-400" />
        </div>
        <h2 className="text-white font-bold text-xl text-center mb-2">Join Document</h2>
        <p className="text-slate-400 text-sm text-center mb-6">Enter your name to start collaborating</p>
        <input autoFocus type="text" placeholder="Your name..." value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors mb-4" />
        <button onClick={() => name.trim() && onConfirm(name.trim())} disabled={!name.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          Join Session
        </button>
      </div>
    </div>
  )
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ onClose }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.href
  function copy() { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">Share Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5">
          <p className="text-slate-400 text-sm mb-4">Anyone with this link can edit the document.</p>
          <div className="flex gap-2">
            <input readOnly value={url} className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm focus:outline-none" />
            <button onClick={copy} className="px-4 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-2 text-sm font-medium">
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-slate-600 text-xs mt-3">🔗 Share this URL — it's the live collaboration link</p>
        </div>
      </div>
    </div>
  )
}

// ─── History Modal ────────────────────────────────────────────────────────────
function HistoryModal({ docId, onClose, onRestore }) {
  const [snapshots, setSnapshots] = useState([])
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    getHistory(docId).then((data) => setSnapshots(data.snapshots || [])).catch(() => setSnapshots([])).finally(() => setLoading(false))
  }, [docId])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-semibold flex items-center gap-2"><History size={18} /> Version History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-white/10 overflow-y-auto flex-shrink-0">
            {loading ? <div className="p-4 text-slate-500 text-sm">Loading...</div>
              : snapshots.length === 0 ? <div className="p-4 text-slate-500 text-sm">No snapshots yet.<br /><span className="text-xs">Saved every 10 operations.</span></div>
              : [...snapshots].reverse().map((snap, i) => (
                <button key={i} onClick={() => setPreview(snap)}
                  className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${preview === snap ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}>
                  <p className="text-slate-300 text-xs font-medium">Version {snapshots.length - i}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{new Date(snap.savedAt).toLocaleString()}</p>
                  <p className="text-slate-600 text-xs">{snap.operationCount} ops</p>
                </button>
              ))}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {preview ? (
              <>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="bg-white rounded-xl p-6 font-serif text-gray-800 text-sm leading-7 min-h-full whitespace-pre-wrap">
                    {preview.content || <span className="text-gray-400 italic">Empty document</span>}
                  </div>
                </div>
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <button onClick={() => { onRestore(preview.content); onClose() }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium">
                    <RotateCcw size={14} /> Restore this version
                  </button>
                </div>
              </>
            ) : <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Select a version to preview</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── OT Debug Panel ───────────────────────────────────────────────────────────
function OTDebugPanel({ logs, conflicts, onDismissConflict }) {
  const [open, setOpen] = useState(true)
  const logRef = useRef(null)
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [logs])
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 hover:bg-white/8 transition-colors text-xs font-medium text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" />OT Debug Panel</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="bg-black/40">
          {conflicts.length > 0 && (
            <div className="p-2 space-y-2">
              {conflicts.map((c) => <ConflictCard key={c.id} conflict={c} onDismiss={() => onDismissConflict(c.id)} />)}
            </div>
          )}
          <div ref={logRef} className="ot-log h-40 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
            {logs.length === 0 ? <p className="text-slate-600 italic">Waiting for operations...</p>
              : logs.slice(-60).map((log, i) => <div key={i} style={{ color: log.color || '#94a3b8' }}>{log.text}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cursor overlay using mirror-div technique ────────────────────────────────
function getCaretCoordinates(textarea, position) {
  let mirror = document.getElementById('syncdocs-cursor-mirror')
  if (!mirror) {
    mirror = document.createElement('div')
    mirror.id = 'syncdocs-cursor-mirror'
    mirror.style.position = 'absolute'
    mirror.style.top = '0'
    mirror.style.left = '-9999px'
    mirror.style.visibility = 'hidden'
    mirror.style.overflow = 'hidden'
    document.body.appendChild(mirror)
  }
  const cs = window.getComputedStyle(textarea)
  mirror.style.width = textarea.offsetWidth + 'px'
  mirror.style.fontSize = cs.fontSize
  mirror.style.fontFamily = cs.fontFamily
  mirror.style.fontWeight = cs.fontWeight
  mirror.style.lineHeight = cs.lineHeight
  mirror.style.letterSpacing = cs.letterSpacing
  mirror.style.paddingTop = cs.paddingTop
  mirror.style.paddingRight = cs.paddingRight
  mirror.style.paddingBottom = cs.paddingBottom
  mirror.style.paddingLeft = cs.paddingLeft
  mirror.style.borderTopWidth = cs.borderTopWidth
  mirror.style.borderRightWidth = cs.borderRightWidth
  mirror.style.borderBottomWidth = cs.borderBottomWidth
  mirror.style.borderLeftWidth = cs.borderLeftWidth
  mirror.style.boxSizing = cs.boxSizing
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.wordBreak = 'break-word'
  mirror.style.wordWrap = 'break-word'

  const safePos = Math.max(0, Math.min(position, textarea.value.length))
  mirror.textContent = textarea.value.substring(0, safePos)
  const span = document.createElement('span')
  span.textContent = '|'
  mirror.appendChild(span)
  return { top: span.offsetTop, left: span.offsetLeft }
}

function CursorOverlays({ cursors, textareaRef }) {
  const ta = textareaRef.current
  if (!ta || Object.keys(cursors).length === 0) return null
  return (
    <>
      {Object.values(cursors).map((cursor) => {
        let coords
        try { coords = getCaretCoordinates(ta, cursor.position) } catch { return null }
        const top = coords.top - ta.scrollTop
        const left = coords.left
        if (top < -30 || top > ta.offsetHeight + 10) return null
        return (
          <div key={cursor.userId || cursor.userName} style={{ position: 'absolute', top, left, pointerEvents: 'none', zIndex: 10 }}>
            {/* Username label ABOVE cursor */}
            <div style={{
              position: 'absolute', top: '-22px', left: '0px',
              backgroundColor: cursor.userColor, color: 'white',
              fontSize: '11px', fontWeight: '600', padding: '2px 8px',
              borderRadius: '4px', whiteSpace: 'nowrap', fontFamily: 'sans-serif',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}>
              {cursor.userName}
            </div>
            {/* Cursor line */}
            <div style={{
              width: '2px', height: '20px',
              backgroundColor: cursor.userColor,
              borderRadius: '1px',
              animation: 'blink 1s step-end infinite',
              boxShadow: `0 0 4px ${cursor.userColor}`,
            }} />
          </div>
        )
      })}
    </>
  )
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
export default function Editor() {
  const { id: docId } = useParams()
  const navigate = useNavigate()

  const [userName, setUserName] = useState(() => localStorage.getItem('syncdocs-username') || '')
  const [userId] = useState(() => {
    let uid = localStorage.getItem('syncdocs-userid')
    if (!uid) { uid = generateUserId(); localStorage.setItem('syncdocs-userid', uid) }
    return uid
  })
  const [userColor] = useState(() => {
    let idx = parseInt(localStorage.getItem('syncdocs-coloridx') || '0')
    if (!localStorage.getItem('syncdocs-coloridx')) {
      idx = Math.floor(Math.random() * USER_COLORS.length)
      localStorage.setItem('syncdocs-coloridx', idx)
    }
    return USER_COLORS[idx]
  })
  const [showNameModal, setShowNameModal] = useState(!localStorage.getItem('syncdocs-username'))

  const [title, setTitle] = useState('Untitled Document')
  const [editingTitle, setEditingTitle] = useState(false)
  const [content, setContent] = useState('')
  const contentRef = useRef('')
  const versionRef = useRef(0)

  const [connected, setConnected] = useState(false)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [activeUsers, setActiveUsers] = useState([])
  const [otLogs, setOtLogs] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [showShare, setShowShare] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState({})
  const [opsSynced, setOpsSynced] = useState(0)
  const [remoteCursors, setRemoteCursors] = useState({})
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const { toasts, addToast } = useToasts()

  const socketRef = useRef(null)
  const textareaRef = useRef(null)
  const editorContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const saveTimerRef = useRef(null)
  const typingTimerRef = useRef(null)
  const typingUserTimers = useRef({})
  const isRemoteOp = useRef(false)
  const activeUsersRef = useRef([])

  function addLog(text, color = '#94a3b8') {
    setOtLogs((prev) => [...prev.slice(-80), { text, color }])
  }
  function addConflict(opA, opB, resolution) {
    const id = Date.now()
    setConflicts((prev) => [...prev, { id, opA, opB, resolution }])
  }
  function dismissConflict(id) {
    setConflicts((prev) => prev.filter((c) => c.id !== id))
  }

  // ── Socket setup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userName) return
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-document', { docId, userId, userName, userColor })
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('document-state', ({ content: serverContent, operationHistory }) => {
      contentRef.current = serverContent
      setContent(serverContent)
      // Start version at the current history length so we don't re-transform old ops
      versionRef.current = Array.isArray(operationHistory) ? operationHistory.length : 0
    })

    socket.on('room-users', (users) => {
      setActiveUsers(users)
      activeUsersRef.current = users
    })

    socket.on('user-join', ({ userId: uid, userName: uname, userColor: ucolor }) => {
      setActiveUsers((prev) => {
        if (prev.find((u) => u.userId === uid)) return prev
        const next = [...prev, { userId: uid, userName: uname, userColor: ucolor }]
        activeUsersRef.current = next
        return next
      })
      addToast(`${uname} joined the document`, 'join')
      addLog(`👤 ${uname} joined`, '#4ECDC4')
    })

    socket.on('user-leave', ({ userId: uid, userName: uname }) => {
      setActiveUsers((prev) => {
        const next = prev.filter((u) => u.userId !== uid)
        activeUsersRef.current = next
        return next
      })
      setTypingUsers((prev) => { const n = { ...prev }; delete n[uid]; return n })
      setRemoteCursors((prev) => { const n = { ...prev }; delete n[uid]; return n })
      addToast(`${uname} left the document`, 'leave')
      addLog(`👋 ${uname} left`, '#FF6B6B')
    })

    // STEP 3 — store cursor-update in remoteCursors state
    socket.on('cursor-update', ({ userId: uid, position, userName: uname, userColor: ucolor }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [uid]: { userId: uid, position, userName: uname, userColor: ucolor },
      }))
    })

    socket.on('operation', (op) => {
      if (op.noOp) return
      addLog(`[RX] ${op.type}("${op.char || ''}", pos=${op.position}) from remote`, '#60a5fa')
      if (op.originalPosition !== undefined && op.originalPosition !== op.position) {
        addConflict(
          `${op.type}("${op.char || ''}", pos=${op.originalPosition})`,
          `concurrent op at pos=${op.originalPosition}`,
          `op shifted to pos=${op.position}`
        )
        addLog(`[⚡] Conflict resolved: pos ${op.originalPosition} → ${op.position}`, '#f97316')
      }
      setOpsSynced((n) => n + 1)
      if (op.userId) {
        setTypingUsers((prev) => ({ ...prev, [op.userId]: true }))
        clearTimeout(typingUserTimers.current[op.userId])
        typingUserTimers.current[op.userId] = setTimeout(() => {
          setTypingUsers((prev) => { const n = { ...prev }; delete n[op.userId]; return n })
        }, 2000)
      }
      isRemoteOp.current = true
      const ta = textareaRef.current
      const selStart = ta ? ta.selectionStart : 0
      const selEnd = ta ? ta.selectionEnd : 0
      let newContent = contentRef.current
      const pos = Math.max(0, Math.min(op.position, newContent.length))
      if (op.type === 'insert') {
        newContent = newContent.slice(0, pos) + (op.char || '') + newContent.slice(pos)
      } else if (op.type === 'delete') {
        if (pos < newContent.length) newContent = newContent.slice(0, pos) + newContent.slice(pos + 1)
      }
      contentRef.current = newContent
      // Sync to server version if it's ahead of our local version
      if (op.version !== undefined && op.version + 1 > versionRef.current) {
        versionRef.current = op.version + 1
      }
      setContent(newContent)
      if (ta) {
        requestAnimationFrame(() => {
          let newStart = selStart, newEnd = selEnd
          const insertLen = (op.char || '').length
          if (op.type === 'insert' && op.position <= selStart) newStart += insertLen
          if (op.type === 'insert' && op.position <= selEnd) newEnd += insertLen
          if (op.type === 'delete' && op.position < selStart) newStart--
          if (op.type === 'delete' && op.position < selEnd) newEnd--
          ta.setSelectionRange(Math.max(0, newStart), Math.max(0, newEnd))
          isRemoteOp.current = false
        })
      } else { isRemoteOp.current = false }
      addLog(`[✓] applied → content length: ${newContent.length}`, '#96CEB4')
    })

    socket.on('operation-ack', (op) => {
      // Only sync version if server is ahead (handles out-of-order acks)
      if (!op.noOp && op.version !== undefined && op.version + 1 > versionRef.current) {
        versionRef.current = op.version + 1
      }
    })
    socket.on('title-updated', ({ title: t }) => setTitle(t))
    socket.on('document-renamed', ({ newTitle }) => setTitle(newTitle))
    socket.on('document-restored', ({ content: c }) => {
      contentRef.current = c; setContent(c)
      addLog('[↩] Document restored to previous version', '#FFEAA7')
    })
    socket.on('save-ack', () => setSaveStatus('saved'))

    return () => socket.disconnect()
  }, [userName, docId, userId, userColor])

  useEffect(() => {
    getDocument(docId).then((doc) => { if (doc && doc.title) setTitle(doc.title) }).catch(() => {})
  }, [docId])

  // ── Handle textarea input (OT) ────────────────────────────────────────────────
  function handleInput(e) {
    if (isRemoteOp.current) return
    const newValue = e.target.value
    const oldValue = contentRef.current

    // Optimistically update local state immediately for responsiveness
    contentRef.current = newValue
    setContent(newValue)

    // Diff to find the operation
    let op = null
    if (newValue.length > oldValue.length) {
      let pos = 0
      while (pos < oldValue.length && oldValue[pos] === newValue[pos]) pos++
      const char = newValue[pos] || ''
      op = { type: 'insert', position: pos, char }
      addLog(`[TX] insert("${char}", pos=${pos})`, '#FFEAA7')
    } else if (newValue.length < oldValue.length) {
      let pos = 0
      while (pos < newValue.length && oldValue[pos] === newValue[pos]) pos++
      op = { type: 'delete', position: pos, char: '' }
      addLog(`[TX] delete(pos=${pos})`, '#FF6B6B')
    } else {
      // No change in length (e.g., selection replace) — just save
      scheduleSave(newValue)
      return
    }

    if (op && socketRef.current) {
      // Send with current version, then increment immediately
      // so the next keystroke uses the correct version
      socketRef.current.emit('send-operation', {
        ...op,
        userId,
        docId,
        timestamp: Date.now(),
        clientVersion: versionRef.current,
      })
      versionRef.current += 1  // increment immediately, don't wait for ack
      setOpsSynced((n) => n + 1)
      addLog(`[OT] sent to server (v${versionRef.current - 1})`, '#a78bfa')
    }

    scheduleSave(newValue)
    setIsTyping(true)
    clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1500)
  }

  // STEP 1 — emit cursor-move on keyup, mouseup, selectionchange
  function emitCursorMove() {
    if (!socketRef.current || !textareaRef.current) return
    const pos = textareaRef.current.selectionStart
    socketRef.current.emit('cursor-move', { userId, userName, userColor, position: pos, docId })
  }

  function scheduleSave(value) {
    setSaveStatus('saving')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      if (socketRef.current) socketRef.current.emit('save-document', { docId, content: value })
    }, 5000) // 5 seconds instead of 2
  }

  function handleTitleSave(newTitle) {
    setEditingTitle(false)
    const trimmed = newTitle.trim()
    if (trimmed && trimmed !== title) {
      setTitle(trimmed)
      updateTitle(docId, trimmed)
      if (socketRef.current) socketRef.current.emit('rename-document', { docId, newTitle: trimmed })
      addToast('Document renamed', 'join')
    }
  }

  async function handleRestore(snapshotContent) {
    await restoreSnapshot(docId, snapshotContent)
    contentRef.current = snapshotContent
    setContent(snapshotContent)
  }

  function handleNameConfirm(name) {
    localStorage.setItem('syncdocs-username', name)
    setUserName(name)
    setShowNameModal(false)
  }

  // ── FEATURE 2: Upload document ────────────────────────────────────────────────
  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    let text = ''
    try {
      if (file.name.endsWith('.txt')) {
        text = await file.text()
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        text = result.value
      } else {
        addToast('Only .txt and .docx files are supported', 'leave')
        return
      }
      // Set content locally
      contentRef.current = text
      setContent(text)
      scheduleSave(text)
      // Broadcast full content to all users via save-document
      if (socketRef.current) {
        socketRef.current.emit('save-document', { docId, content: text })
      }
      addToast('Document uploaded successfully', 'join')
      addLog(`[↑] Uploaded file: ${file.name}`, '#4ECDC4')
    } catch (err) {
      addToast('Failed to read file', 'leave')
      console.error(err)
    }
    // Reset file input so same file can be re-uploaded
    e.target.value = ''
  }

  // ── FEATURE 3: Download document ─────────────────────────────────────────────
  function downloadTxt() {
    const cleanText = content
    const blob = new Blob([cleanText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  async function downloadDocx() {
    const lines = content.split('\n')
    const doc = new Document({
      sections: [{
        properties: {},
        children: lines.map((line) => new Paragraph({ children: [new TextRun(line)] })),
      }],
    })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.docx`
    a.click()
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length

  if (showNameModal) return <UsernameModal onConfirm={handleNameConfirm} />

  return (
    <div className="h-screen flex flex-col bg-[#0a0e1a] text-white overflow-hidden" onClick={() => setShowDownloadMenu(false)}>
      {/* ── Topbar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#0d1117] gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
          <span className="text-lg font-black flex-shrink-0 cursor-pointer"
            style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            onClick={() => navigate('/')}>SyncDocs</span>
          <span className="text-slate-700 flex-shrink-0">/</span>
          {editingTitle ? (
            <input autoFocus defaultValue={title}
              onBlur={(e) => handleTitleSave(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(e.target.value); if (e.key === 'Escape') setEditingTitle(false) }}
              className="bg-white/5 border border-blue-500/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none min-w-0 w-48" />
          ) : (
            <span onClick={() => setEditingTitle(true)}
              className="text-slate-200 text-sm font-medium cursor-pointer hover:text-white truncate max-w-xs" title="Click to rename">
              {title}
            </span>
          )}
        </div>

        {/* Center: connection status */}
        <div className="flex-shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${connected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            {connected ? 'Live' : 'Connecting...'}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs ${saveStatus === 'saving' ? 'text-yellow-400' : 'text-slate-500'}`}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved ✓'}
          </span>

          {/* User avatars */}
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full border-2 border-[#0d1117] flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: userColor }} title={`${userName} (you)`}>
              {userName[0]?.toUpperCase()}
            </div>
            {activeUsers.slice(0, 4).map((u) => (
              <div key={u.userId} className="w-7 h-7 rounded-full border-2 border-[#0d1117] flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: u.userColor }} title={u.userName}>
                {u.userName[0]?.toUpperCase()}
              </div>
            ))}
            {activeUsers.length > 4 && (
              <div className="w-7 h-7 rounded-full border-2 border-[#0d1117] bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                +{activeUsers.length - 4}
              </div>
            )}
          </div>

          {/* Upload button */}
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-white/10">
            <Upload size={13} /> Upload
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.docx" className="hidden" onChange={handleUpload} />

          {/* Download button with dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowDownloadMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-white/10">
              <Download size={13} /> Download
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <button onClick={downloadTxt}
                  className="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-xs flex items-center gap-2">
                  <FileText size={12} /> Download as .txt
                </button>
                <button onClick={downloadDocx}
                  className="w-full text-left px-4 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-xs flex items-center gap-2">
                  <FileText size={12} /> Download as .docx
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-white/10">
            <Share2 size={13} /> Share
          </button>
          <button onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-white/10">
            <History size={13} /> History
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <div className="w-56 flex-shrink-0 border-r border-white/10 bg-[#0d1117] flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-white/10">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users size={11} /> Active Users
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: userColor }} />
                <span className="text-slate-300 text-xs truncate">{userName}</span>
                {isTyping && <TypingDots />}
                <span className="text-slate-600 text-xs ml-auto">(you)</span>
              </div>
              {activeUsers.map((u) => (
                <div key={u.userId} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: u.userColor }} />
                  <span className="text-slate-300 text-xs truncate">{u.userName}</span>
                  {typingUsers[u.userId] && <TypingDots />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-b border-white/10">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={11} /> Document Info
            </p>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between"><span>Words</span><span className="text-slate-300">{wordCount}</span></div>
              <div className="flex justify-between"><span>Characters</span><span className="text-slate-300">{charCount}</span></div>
              <div className="flex justify-between"><span>Status</span>
                <span className={saveStatus === 'saving' ? 'text-yellow-400' : 'text-green-400'}>
                  {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 flex-1">
            <OTDebugPanel logs={otLogs} conflicts={conflicts} onDismissConflict={dismissConflict} />
          </div>
        </div>

        {/* ── Editor Area ── */}
        <div className="flex-1 overflow-y-auto bg-[#0a0e1a] flex flex-col items-center py-10 px-4">
          {/* Paper with cursor overlay */}
          <div ref={editorContainerRef} style={{ maxWidth: '720px', width: '100%', background: '#fafafa', minHeight: '1000px', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
            {/* STEP 5 — textarea with cursor overlays inside relative wrapper */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              onKeyUp={emitCursorMove}
              onMouseUp={emitCursorMove}
              onSelect={emitCursorMove}
              placeholder="Start typing your document here..."
              className="w-full resize-none focus:outline-none text-gray-800 bg-transparent"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                lineHeight: '1.8',
                minHeight: '1000px',
                padding: '48px',
                display: 'block',
                position: 'relative',
                zIndex: 1,
              }}
              spellCheck={true}
            />
            {/* Cursor overlays — z-index 2, pointer-events none */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, overflow: 'hidden' }}>
              <CursorOverlays cursors={remoteCursors} textareaRef={textareaRef} />
            </div>
          </div>

          {/* Cursor color legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 max-w-[720px] w-full px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: userColor }} />
              <span className="text-slate-400">You ({userName})</span>
            </div>
            {activeUsers.map((u) => (
              <div key={u.userId} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: u.userColor }} />
                <span>{u.userName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      {showHistory && <HistoryModal docId={docId} onClose={() => setShowHistory(false)} onRestore={handleRestore} />}

      {/* Stats Footer */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-2 border-t border-white/10 bg-[#0d1117] text-xs text-slate-500 font-mono">
        <span>Words: <span className="text-slate-300">{wordCount}</span></span>
        <span className="text-slate-700">|</span>
        <span>Characters: <span className="text-slate-300">{charCount}</span></span>
        <span className="text-slate-700">|</span>
        <span>Lines: <span className="text-slate-300">{content.split('\n').length}</span></span>
        <span className="text-slate-700">|</span>
        <span>Users Online: <span className="text-green-400">{activeUsers.length + 1}</span></span>
        <span className="text-slate-700">|</span>
        <span>Ops Synced: <span className="text-blue-400">{opsSynced}</span></span>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
