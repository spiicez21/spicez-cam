const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

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
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// In-memory room storage
const rooms = new Map();
const userNames = new Map(); // socketId -> userName

// REST endpoint to check server status
app.get('/', (req, res) => {
  res.json({ status: 'SpiceZ-Cam signaling server running' });
});

// Socket.io signaling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create room
  socket.on('create-room', ({ password, userName }, callback) => {
    const roomId = uuidv4().slice(0, 8);
    if (userName) userNames.set(socket.id, userName);
    rooms.set(roomId, {
      id: roomId,
      password: password || null,
      creator: socket.id,
      participants: [socket.id],
    });
    socket.join(roomId);
    console.log(`Room created: ${roomId} by ${socket.id} (${userName || 'anonymous'})`);
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
    room.participants.push(socket.id);
    socket.join(roomId);

    // Notify existing participants with the new user's name
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName: userName || 'Anonymous' });

    // Send back list of existing participants with names
    const participantsList = room.participants
      .filter((id) => id !== socket.id)
      .map((id) => ({ id, name: userNames.get(id) || 'Anonymous' }));

    console.log(`User ${socket.id} (${userName || 'anonymous'}) joined room ${roomId}`);
    callback({ success: true, participants: participantsList });
  });

  // WebRTC signaling: offer
  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', { from: socket.id, offer });
  });

  // Ready signal — joiner's VideoCall mounted, re-broadcast to room
  socket.on('ready', ({ roomId }) => {
    const userName = userNames.get(socket.id) || 'Anonymous';
    socket.to(roomId).emit('user-joined', { userId: socket.id, userName });
    console.log(`User ${socket.id} (${userName}) ready in room ${roomId}`);
  });

  // WebRTC signaling: answer
  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', { from: socket.id, answer });
  });

  // WebRTC signaling: ICE candidate
  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // Toggle media state
  socket.on('toggle-media', ({ roomId, type, enabled }) => {
    socket.to(roomId).emit('user-toggle-media', {
      userId: socket.id,
      type,
      enabled,
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    rooms.forEach((room, roomId) => {
      if (room.participants.includes(socket.id)) {
        // If creator leaves, close the room
        if (room.creator === socket.id) {
          io.to(roomId).emit('room-closed', { reason: 'Creator left the room' });
          rooms.delete(roomId);
          console.log(`Room ${roomId} closed (creator left)`);
        } else {
          room.participants = room.participants.filter((id) => id !== socket.id);
          socket.to(roomId).emit('user-left', { userId: socket.id });
        }
      }
    });
    userNames.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SpiceZ-Cam server running on port ${PORT}`);
});
