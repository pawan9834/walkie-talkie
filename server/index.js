const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('<h1>📡 Walkie Talkie Backend is ONLINE</h1><p>Global Radio Hub is active and ready for signals.</p>');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e7 // 10MB to handle audio chunks if they get large
});

// Store room data
// rooms: { roomName: { users: { socketId: nickname } } }
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-frequency', ({ frequency, nickname }) => {
    socket.join(frequency);

    if (!rooms[frequency]) {
      rooms[frequency] = { users: {} };
    }

    rooms[frequency].users[socket.id] = nickname;

    console.log(`${nickname} joined frequency: ${frequency}`);

    // Broadcast updated user list to the room
    io.to(frequency).emit('room-users', Object.values(rooms[frequency].users));

    // Welcome message or logs
    socket.to(frequency).emit('user-joined', { nickname });
  });

  socket.on('leave-frequency', ({ frequency }) => {
    handleLeave(socket, frequency);
  });

  socket.on('audio-data', ({ frequency, audioChunk, senderNickname }) => {
    console.log(`🎙️ Broadcasting audio from ${senderNickname} to frequency: ${frequency}`);
    // Broadcast audio chunk to everyone else in the frequency
    socket.to(frequency).emit('incoming-audio', { audioChunk, senderNickname });
  });

  socket.on('get-active-frequencies', () => {
    // Filter rooms that have at least one user and are not private (if we add that later)
    const activeFrequencies = Object.keys(rooms).filter(room =>
      rooms[room].users && Object.keys(rooms[room].users).length > 0
    );
    socket.emit('active-frequencies', activeFrequencies);
  });

  socket.on('disconnecting', () => {
    // Handle disconnect for all rooms the socket was in
    for (const room of socket.rooms) {
      if (rooms[room] && rooms[room].users[socket.id]) {
        console.log(`📡 User ${rooms[room].users[socket.id]} disconnecting from room ${room}`);
      }
      if (rooms[room]) {
        handleLeave(socket, room);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

function handleLeave(socket, frequency) {
  socket.leave(frequency);
  if (rooms[frequency] && rooms[frequency].users[socket.id]) {
    const nickname = rooms[frequency].users[socket.id];
    delete rooms[frequency].users[socket.id];

    console.log(`${nickname} left frequency: ${frequency}`);

    // If room is empty, we could delete it, but let's keep it simple
    if (Object.keys(rooms[frequency].users).length === 0) {
      delete rooms[frequency];
    } else {
      io.to(frequency).emit('room-users', Object.values(rooms[frequency].users));
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Walkie Talkie Server running on port ${PORT}`);
});
