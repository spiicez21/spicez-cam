const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Generate 5-char uppercase alphanumeric room ID
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const app = express();
const server = http.createServer(app);

// Allow multiple origins (local + production)
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  // Low-latency: skip HTTP long-polling, go straight to WebSocket
  transports: ['websocket'],
  // Tune ping/pong for faster dead-connection detection
  pingInterval: 10000,
  pingTimeout: 5000,
  // Disable per-message deflate — compression adds latency for small signaling payloads
  perMessageDeflate: false,
  // Allow larger payloads for batched ICE candidates
  maxHttpBufferSize: 1e6,
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// In-memory room storage — use Set for O(1) participant lookups
const rooms = new Map();
const userNames = new Map(); // socketId -> userName
const socketRooms = new Map(); // socketId -> roomId (reverse index for fast disconnect)

// Chat rate limiter: track last message timestamp per socket
const chatRateLimit = new Map();
const CHAT_RATE_MS = 200; // min 200ms between messages

// REST endpoint to check server status
app.get('/', (req, res) => {
  res.json({ status: 'SpiceZ-Cam signaling server running' });
});

// Socket.io signaling
io.on('connection', (socket) => {
  // Create room
  socket.on('create-room', ({ password, userName }, callback) => {
    let roomId = generateRoomId();
    while (rooms.has(roomId)) roomId = generateRoomId();
    if (userName) userNames.set(socket.id, userName);
    rooms.set(roomId, {
      id: roomId,
      password: password || null,
      creator: socket.id,
      participants: new Set([socket.id]),
    });
    socket.join(roomId);
    socketRooms.set(socket.id, roomId);
    callback({ roomId, success: true });
  });

  // Join room
  socket.on('join-room', ({ roomId, password, userName }, callback) => {
    const room = rooms.get(roomId);

    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }
    if (room.password && room.password !== password) {
      return callback({ success: false, error: 'Incorrect password' });
    }

    if (userName) userNames.set(socket.id, userName);
    room.participants.add(socket.id);
    socket.join(roomId);
    socketRooms.set(socket.id, roomId);

    // Send back list of existing participants with names
    const participantsList = [];
    for (const id of room.participants) {
      if (id !== socket.id) {
        participantsList.push({ id, name: userNames.get(id) || 'Anonymous' });
      }
    }

    callback({ success: true, participants: participantsList });
  });

  // WebRTC signaling: offer
  socket.on('offer', ({ to, offer }) => {
    const userName = userNames.get(socket.id) || 'Anonymous';
    socket.to(to).emit('offer', { from: socket.id, offer, userName });
  });

  // Ready signal — joiner's VideoCall mounted, re-broadcast to room
  socket.on('ready', ({ roomId }) => {
    const userName = userNames.get(socket.id) || 'Anonymous';
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName });
  });

  // WebRTC signaling: answer
  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { from: socket.id, answer });
  });

  // WebRTC signaling: single ICE candidate (backwards compat)
  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // WebRTC signaling: batched ICE candidates (low-latency path)
  socket.on('ice-candidates', ({ to, candidates }) => {
    if (Array.isArray(candidates) && candidates.length > 0) {
      socket.to(to).emit('ice-candidates', { from: socket.id, candidates });
    }
  });

  // Toggle media state
  socket.on('toggle-media', ({ roomId, type, enabled }) => {
    socket.to(roomId).emit('user-toggle-media', {
      userId: socket.id,
      type,
      enabled,
    });
  });

  // Screen share state — broadcast to room
  socket.on('screen-share-started', ({ roomId }) => {
    socket.to(roomId).emit('user-screen-share', { userId: socket.id, sharing: true });
  });

  socket.on('screen-share-stopped', ({ roomId }) => {
    socket.to(roomId).emit('user-screen-share', { userId: socket.id, sharing: false });
  });

  // Emoji reaction — broadcast to room
  socket.on('emoji-reaction', ({ roomId, emoji }) => {
    const userName = userNames.get(socket.id) || 'Anonymous';
    socket.to(roomId).emit('emoji-reaction', {
      userId: socket.id,
      userName,
      emoji,
    });
  });

  // Chat message with rate limiting
  socket.on('chat-message', ({ roomId, message }) => {
    // Rate limit check
    const now = Date.now();
    const lastMsg = chatRateLimit.get(socket.id) || 0;
    if (now - lastMsg < CHAT_RATE_MS) return;
    chatRateLimit.set(socket.id, now);

    // Sanitize: truncate long messages
    const sanitized = typeof message === 'string' ? message.slice(0, 1000) : '';
    if (!sanitized) return;

    const userName = userNames.get(socket.id) || 'Anonymous';
    io.to(roomId).emit('chat-message', {
      id: `${socket.id}-${now}`,
      userId: socket.id,
      userName,
      message: sanitized,
      timestamp: now,
    });
  });

  // Disconnect — use reverse index for O(1) room lookup
  socket.on('disconnect', () => {
    const roomId = socketRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        if (room.creator === socket.id) {
          io.to(roomId).emit('room-closed', { reason: 'Creator left the room' });
          rooms.delete(roomId);
        } else {
          room.participants.delete(socket.id);
          socket.to(roomId).emit('user-left', { userId: socket.id });
        }
      }
      socketRooms.delete(socket.id);
    }

    userNames.delete(socket.id);
    chatRateLimit.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SpiceZ-Cam server running on port ${PORT}`);
});
