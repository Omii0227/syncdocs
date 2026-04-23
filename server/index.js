require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const Document = require('./models/Document');
const { applyOp, transformOp } = require('./ot');
const { publisher, subscriber } = require('./redis');

const app = express();
const server = http.createServer(app);

// Unique ID for this server instance — used to prevent double-broadcasting
const SERVER_ID = uuidv4();
console.log(`[Server] Instance ID: ${SERVER_ID}`);

const REDIS_CHANNEL = 'syncdocs:operations';

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true); // allow all origins for WebSocket
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
});

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true); // allow all origins
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// In-memory store per document room
const rooms = {};
const saveTimers = {}; // debounce timers for MongoDB writes

function getRoom(docId) {
  if (!rooms[docId]) rooms[docId] = { content: '', operationHistory: [], operationCount: 0 };
  return rooms[docId];
}

// Debounced MongoDB save — fires 1 second after last operation
function scheduleSave(docId, content) {
  clearTimeout(saveTimers[docId]);
  saveTimers[docId] = setTimeout(async () => {
    try {
      await Document.findByIdAndUpdate(docId, { content, updatedAt: new Date() });
    } catch (err) {
      console.error('[Save] MongoDB write error:', err.message);
    }
  }, 1000);
}

// ─── REDIS SUBSCRIBER — set up ONCE outside socket handler ───────────────────
subscriber.subscribe(REDIS_CHANNEL, (err) => {
  if (err) console.error('[Redis] Subscribe error:', err.message);
  else console.log(`[Redis] Subscribed to channel: ${REDIS_CHANNEL}`);
});

subscriber.on('message', (channel, message) => {
  if (channel !== REDIS_CHANNEL) return;
  try {
    const data = JSON.parse(message);
    // Skip messages published by THIS instance (already broadcast locally)
    if (data.originServerId === SERVER_ID) return;

    if (data.type === 'operation') {
      io.to(data.docId).emit('operation', data.operation);
    }
    if (data.type === 'cursor') {
      io.to(data.docId).emit('cursor-update', data.cursor);
    }
    if (data.type === 'rename') {
      io.to(data.docId).emit('document-renamed', { newTitle: data.newTitle });
    }
    if (data.type === 'user-join') {
      io.to(data.docId).emit('user-join', data.user);
    }
    if (data.type === 'user-leave') {
      io.to(data.docId).emit('user-leave', { userId: data.userId, userName: data.userName, userColor: data.userColor });
    }
  } catch (err) {
    console.error('[Redis] Message parse error:', err.message);
  }
});

// ─── REST ENDPOINTS ──────────────────────────────────────────────────────────

app.post('/api/documents', async (req, res) => {
  try {
    const doc = await Document.create({ title: req.body.title || 'Untitled Document', content: '' });
    res.json({ docId: doc._id, title: doc.title });
  } catch (err) {
    console.error('Create doc error:', err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const docs = await Document.find({}, 'title createdAt updatedAt').sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/api/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.patch('/api/documents/:id/title', async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(req.params.id, { title: req.body.title }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ title: doc.title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update title' });
  }
});

app.put('/api/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(req.params.id, { title: req.body.title, updatedAt: new Date() }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename document' });
  }
});

app.delete('/api/documents/:id', async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

app.get('/api/documents/:id/history', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id, 'snapshots title');
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ snapshots: doc.snapshots, title: doc.title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/documents/:id/restore', async (req, res) => {
  try {
    const { content } = req.body;
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { content, $push: { snapshots: { content, operationCount: 0, savedAt: new Date() } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const room = getRoom(req.params.id);
    room.content = content;
    room.operationHistory = [];
    io.to(req.params.id).emit('document-restored', { content });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore document' });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: io.sockets.adapter.rooms.size,
    connectedClients: io.engine.clientsCount,
    serverId: SERVER_ID,
  });
});

// ─── SOCKET.IO ───────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── join-document ──────────────────────────────────────────────────────────
  socket.on('join-document', async ({ docId, userId, userName, userColor }) => {
    socket.join(docId);
    socket.docId = docId;
    socket.userId = userId;
    socket.userName = userName;
    socket.userColor = userColor;

    try {
      const room = getRoom(docId);

      // Always fetch fresh content from MongoDB to ensure correct state
      const doc = await Document.findById(docId);
      if (doc) {
        // Only update in-memory if DB has content (prevents overwriting active session)
        if (doc.content && doc.content.length > room.content.length) {
          room.content = doc.content;
        } else if (room.content === '') {
          room.content = doc.content || '';
        }
      }

      socket.emit('document-state', { content: room.content, operationHistory: room.operationHistory });

      // Broadcast to local clients on this instance
      socket.to(docId).emit('user-join', { userId, userName, userColor });

      const socketsInRoom = await io.in(docId).fetchSockets();
      const users = socketsInRoom
        .filter((s) => s.userId && s.id !== socket.id)
        .map((s) => ({ userId: s.userId, userName: s.userName, userColor: s.userColor }));
      socket.emit('room-users', users);

      // Publish to Redis so other server instances broadcast too
      publisher.publish(REDIS_CHANNEL, JSON.stringify({
        originServerId: SERVER_ID,
        type: 'user-join',
        docId,
        user: { userId, userName, userColor },
      }));

      console.log(`[Room] ${userName} joined doc ${docId}`);
    } catch (err) {
      console.error('[join-document] error:', err);
    }
  });

  // ── send-operation ─────────────────────────────────────────────────────────
  socket.on('send-operation', async ({ type, position, char, userId, docId, timestamp, clientVersion }) => {
    try {
      const room = getRoom(docId);
      const originalPosition = position;

      // clientVersion is what the client had when they sent this op
      // Concurrent ops = everything applied on server AFTER that version
      const baseVersion = (typeof clientVersion === 'number' && clientVersion >= 0)
        ? Math.min(clientVersion, room.operationHistory.length)
        : room.operationHistory.length;
      let op = { type, position, char: char || '', userId, timestamp };

      // Transform against all ops applied since the client's last known version
      const concurrentOps = room.operationHistory.slice(baseVersion);
      for (const histOp of concurrentOps) {
        op = transformOp(op, histOp);
        if (op.noOp || op.type === 'noop') break;
      }

      if (!op.noOp && op.type !== 'noop') {
        // Apply to server-side content
        room.content = applyOp(room.content, op);
        room.operationHistory.push(op);
        room.operationCount = (room.operationCount || 0) + 1;

        const wasTransformed = op.position !== originalPosition;
        const broadcastOp = {
          ...op,
          originalPosition: wasTransformed ? originalPosition : undefined,
          version: room.operationHistory.length - 1,
        };

        // Broadcast to local clients on this instance
        socket.to(docId).emit('operation', broadcastOp);

        // Ack to sender with the (possibly transformed) op + new version
        socket.emit('operation-ack', { ...op, version: room.operationHistory.length - 1 });

        // Non-blocking debounced save to MongoDB (1s after last op)
        scheduleSave(docId, room.content);

        // Snapshot every 10 ops (also non-blocking)
        if (room.operationCount % 10 === 0) {
          Document.findByIdAndUpdate(docId, {
            $push: { snapshots: { content: room.content, operationCount: room.operationCount, savedAt: new Date() } },
          }).catch((err) => console.error('[Snapshot] error:', err.message));
          console.log(`[Snapshot] Queued snapshot for doc ${docId} at op ${room.operationCount}`);
        }

        // Publish to Redis for other server instances
        publisher.publish(REDIS_CHANNEL, JSON.stringify({
          originServerId: SERVER_ID,
          type: 'operation',
          docId,
          operation: broadcastOp,
        }));

      } else {
        socket.emit('operation-ack', { noOp: true, version: room.operationHistory.length });
      }
    } catch (err) {
      console.error('[send-operation] error:', err);
    }
  });

  // ── cursor-move ────────────────────────────────────────────────────────────
  socket.on('cursor-move', ({ userId, position, docId, userName, userColor }) => {
    // Broadcast to local clients on this instance
    socket.to(docId).emit('cursor-update', { userId, position, userName, userColor });

    // Publish to Redis for other server instances
    publisher.publish(REDIS_CHANNEL, JSON.stringify({
      originServerId: SERVER_ID,
      type: 'cursor',
      docId,
      cursor: { userId, position, userName, userColor },
    }));
  });

  // ── save-document ──────────────────────────────────────────────────────────
  socket.on('save-document', async ({ docId, content }) => {
    try {
      const room = getRoom(docId);
      room.content = content;
      // Immediate write on explicit save
      await Document.findByIdAndUpdate(docId, { content, updatedAt: new Date() });
      socket.emit('save-ack', { savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[save-document] error:', err);
    }
  });

  // ── title-change (legacy) ──────────────────────────────────────────────────
  socket.on('title-change', async ({ docId, title }) => {
    try {
      await Document.findByIdAndUpdate(docId, { title });
      socket.to(docId).emit('title-updated', { title });
    } catch (err) {
      console.error('[title-change] error:', err);
    }
  });

  // ── rename-document ────────────────────────────────────────────────────────
  socket.on('rename-document', async ({ docId, newTitle }) => {
    try {
      await Document.findByIdAndUpdate(docId, { title: newTitle, updatedAt: new Date() });

      // Broadcast to local clients on this instance
      socket.to(docId).emit('document-renamed', { newTitle });

      // Publish to Redis for other server instances
      publisher.publish(REDIS_CHANNEL, JSON.stringify({
        originServerId: SERVER_ID,
        type: 'rename',
        docId,
        newTitle,
      }));
    } catch (err) {
      console.error('[rename-document] error:', err);
    }
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { docId, userId, userName, userColor } = socket;
    if (docId && userId) {
      // Broadcast to local clients on this instance
      io.to(docId).emit('user-leave', { userId, userName, userColor });

      // Publish to Redis for other server instances
      publisher.publish(REDIS_CHANNEL, JSON.stringify({
        originServerId: SERVER_ID,
        type: 'user-leave',
        docId,
        userId,
        userName,
        userColor,
      }));

      console.log(`[Room] ${userName} left doc ${docId}`);
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down gracefully...');
  await publisher.quit();
  await subscriber.quit();
  process.exit(0);
});

// ─── SELF-PING to prevent Render free tier spin-down ─────────────────────────
const RENDER_URL = process.env.RENDER_URL || '';
if (RENDER_URL) {
  setInterval(async () => {
    try {
      const res = await fetch(`${RENDER_URL}/health`);
      const data = await res.json();
      console.log(`[Ping] Self-ping ok — clients: ${data.connectedClients}`);
    } catch (err) {
      console.error('[Ping] Self-ping failed:', err.message);
    }
  }, 14 * 60 * 1000); // every 14 minutes
  console.log(`[Ping] Self-ping enabled for ${RENDER_URL}`);
}

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncdocs';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
