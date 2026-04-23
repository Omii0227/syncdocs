# SyncDocs — Real-Time Collaborative Document Editor

> A Google Docs Lite clone built as a Distributed Computing university project.
> Demonstrates real-time pub/sub, Operational Transformation, eventual consistency, and fault tolerance.

---

## Distributed Architecture (with Redis Pub/Sub)

```
Client A ──┐                              ┌── Client C
           │                              │
           ▼                              ▼
[Server Instance 1] ──────────── [Server Instance 2]
        │         \              /        │
        │          \            /         │
        │        [Redis Pub/Sub]          │
        │          /            \         │
        └─────────┘              └────────┘
                        │
               [MongoDB Atlas]
              (shared persistent state)
```

**Flow:**
1. Client A sends operation to Server Instance 1
2. Server 1 applies OT transform, saves to MongoDB
3. Server 1 broadcasts to its local clients (same instance)
4. Server 1 publishes to Redis channel `syncdocs:operations`
5. Server 2 receives message from Redis
6. Server 2 checks `originServerId` — skips if same instance
7. Server 2 broadcasts to Client C
8. All clients converge to the same document state

**Distributed Computing Concepts Demonstrated:**
- Pub/Sub messaging across nodes (Redis channels)
- Eventual consistency (OT algorithm ensures convergence)
- Shared persistent state (MongoDB Atlas)
- Stateless server instances (any client can connect to any server)
- Horizontal scalability (add more server instances freely)
- Fault tolerance (if one server fails, Redis routes through surviving instances)
- Unique server identity (UUID per instance prevents double-broadcasting)

---

## Single-Instance Architecture (without Redis)

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENTS                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Client A    │    │  Client B    │    │  Client C    │      │
│  │  React+Vite  │    │  React+Vite  │    │  React+Vite  │      │
│  │  Port 5173   │    │  Port 5173   │    │  Port 5173   │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │  Socket.IO        │  Socket.IO         │              │
└─────────┼───────────────────┼────────────────────┼─────────────┘
          │                   │                    │
          ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS + EXPRESS SERVER                      │
│                         Port 3001                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Socket.IO Server                       │   │
│  │                                                          │   │
│  │  Room: docId_abc  ──────────────────────────────────    │   │
│  │  ├── operationHistory[]                                  │   │
│  │  ├── content (in-memory)                                 │   │
│  │  └── connectedSockets[]                                  │   │
│  │                                                          │   │
│  │  OT Engine (ot.js)                                       │   │
│  │  ├── transformOp(op1, op2)                               │   │
│  │  ├── applyOp(content, op)                                │   │
│  │  └── transformAgainstHistory(op, history)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  REST API: /api/documents (CRUD + history + restore)            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ Mongoose ODM
                                   ▼
                    ┌──────────────────────────┐
                    │       MongoDB Atlas       │
                    │                          │
                    │  Collection: documents   │
                    │  ├── title               │
                    │  ├── content             │
                    │  ├── operations[]        │
                    │  └── snapshots[]         │
                    └──────────────────────────┘
```

---

## Operational Transformation — How It Works

OT solves the problem of **concurrent edits** in distributed systems.

### The Problem

Two users edit the same document simultaneously:

```
Initial state: "Hello World"

User A (at pos 5): insert(" Beautiful")  → "Hello Beautiful World"
User B (at pos 6): insert("!")           → "Hello !World"

Without OT, if both ops are applied naively:
  Apply A then B: "Hello Beautiful !World"  ✓ (B's pos 6 is now wrong)
  Apply B then A: "Hello! Beautiful World"  ✗ (wrong position)
```

### The Solution

```
transformOp(incomingOp, alreadyAppliedOp):

  Case 1: Both INSERT at same position
    → Shift incoming op's position +1
    → "Hello Beautiful World" stays consistent

  Case 2: INSERT vs DELETE at same position
    → Adjust position based on which came first

  Case 3: Both DELETE at same position
    → Mark second delete as no-op (char already gone)
```

### Example in SyncDocs

```
Server receives from User A: insert("a", pos=5)
Server receives from User B: insert("b", pos=5)  ← concurrent

OT Transform:
  op_B.position >= op_A.position → op_B.position += 1

Result:
  Apply A: insert("a", pos=5)
  Apply B: insert("b", pos=6)  ← transformed

Both clients converge to the same document. ✓
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Real-time | Socket.IO (WebSockets) |
| Backend | Node.js + Express |
| Database | MongoDB via Mongoose |
| OT Engine | Custom implementation (ot.js) |
| Animations | tsparticles + CSS |

---

## Setup & Running

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Install

```bash
# Root dependencies (concurrently)
npm install

# Server
cd server && npm install

# Client
cd client && npm install
```

### Configure

Edit `server/.env`:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/syncdocs
PORT=3001
CLIENT_URL=http://localhost:5173
```

### Run

```bash
# From project root — starts both server and client
npm run dev
```

Or separately:
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open http://localhost:5173

---

## Testing Collaboration (Multiple Tabs)

1. Open http://localhost:5173 in **Tab 1** → click "New Document"
2. Copy the URL from the editor
3. Open the same URL in **Tab 2** (or another browser)
4. Enter different names in each tab
5. Type in either tab — changes appear in real-time in both
6. Watch the **OT Debug Panel** in the sidebar for live operation logs
7. Type simultaneously in both tabs to trigger conflict resolution

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents` | Create new document |
| `GET` | `/api/documents` | List all documents |
| `GET` | `/api/documents/:id` | Get document by ID |
| `PATCH` | `/api/documents/:id/title` | Update title |
| `GET` | `/api/documents/:id/history` | Get version snapshots |
| `POST` | `/api/documents/:id/restore` | Restore a snapshot |

---

## Socket.IO Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join-document` | C→S | `{docId, userId, userName, userColor}` | Join a document room |
| `document-state` | S→C | `{content}` | Initial document state |
| `room-users` | S→C | `[{userId, userName, userColor}]` | Current users in room |
| `send-operation` | C→S | `{type, position, char, userId, docId, clientVersion}` | Send edit operation |
| `operation` | S→C | `{type, position, char, originalPosition?, version}` | Broadcast transformed op |
| `operation-ack` | S→C | `{version}` | Acknowledge sender's op |
| `cursor-move` | C→S | `{userId, position, docId}` | Cursor position update |
| `user-join` | S→C | `{userId, userName, userColor}` | New user joined |
| `user-leave` | S→C | `{userId, userName}` | User disconnected |
| `title-change` | C→S | `{docId, title}` | Rename document |
| `save-document` | C→S | `{docId, content}` | Persist content |
| `document-restored` | S→C | `{content}` | Version restored |

---

## Screenshots

> _Open the app and take screenshots here_

| Landing Page | Editor | OT Conflict |
|---|---|---|
| `[screenshot]` | `[screenshot]` | `[screenshot]` |

---

## Distributed Computing Concepts Demonstrated

### 1. Real-Time Pub/Sub Messaging
Socket.IO implements a publish/subscribe pattern where each document is a "room" (channel). Clients subscribe to a room on join and receive all published operations instantly via WebSocket connections.

### 2. Operational Transformation for Conflict Resolution
When two clients send concurrent operations, the server transforms them using the OT algorithm before applying and broadcasting. This ensures all clients converge to the same document state regardless of network latency or operation ordering.

### 3. Eventual Consistency
SyncDocs does not use distributed locks or consensus protocols. Instead, it relies on OT to guarantee that all replicas (clients) will eventually converge to the same state after all operations are applied — a classic eventual consistency model.

### 4. Fault Tolerance via Reconnection Logic
Socket.IO automatically handles reconnection with exponential backoff. When a client reconnects, it re-joins the document room and receives the current server-side state, resynchronizing without data loss.

### 5. State Synchronization Across Distributed Clients
Each client maintains a local copy of the document and a version counter. Operations are tagged with the client's version, allowing the server to identify which concurrent operations need transformation — similar to vector clocks in distributed systems.

### 6. Snapshot-Based Version History
Every 10 operations, the server saves a full document snapshot to MongoDB. This provides a form of checkpointing — a common pattern in distributed systems for recovery and audit trails.
