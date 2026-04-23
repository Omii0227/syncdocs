const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
const BASE = `${SERVER_URL}/api`

export async function createDocument(title = 'Untitled Document') {
  const res = await fetch(`${BASE}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  return res.json()
}

export async function getDocument(id) {
  const res = await fetch(`${BASE}/documents/${id}`)
  return res.json()
}

export async function listDocuments() {
  const res = await fetch(`${BASE}/documents`)
  return res.json()
}

export async function getHistory(id) {
  const res = await fetch(`${BASE}/documents/${id}/history`)
  return res.json()
}

export async function updateTitle(id, title) {
  const res = await fetch(`${BASE}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  return res.json()
}

export async function deleteDocument(id) {
  const res = await fetch(`${BASE}/documents/${id}`, {
    method: 'DELETE',
  })
  return res.json()
}

export async function restoreSnapshot(id, content) {
  const res = await fetch(`${BASE}/documents/${id}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  return res.json()
}
