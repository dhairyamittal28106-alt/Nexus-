const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Message = require('./models/Message');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '200mb' }));

// Health check
app.get("/", (req, res) => res.json({ status: "Nexus Server Active" }));

// Routes
app.use("/api/posts", require("./routes/posts"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/messages", require("./routes/messages"));

// ================= SOCKET LOGIC =================

let onlineUsers = [];

io.on('connection', (socket) => {
  console.log('🟢 Socket connected', socket.id);

  socket.on('user_online', ({ name, userId }) => {
    if (!name || !userId) return;
    onlineUsers = onlineUsers.filter(u => u.userId !== userId);
    onlineUsers.push({ socketId: socket.id, name, userId });
    io.emit('update_user_list', onlineUsers);
  });

  socket.on('join_room', (room) => {
    if (!room) return;
    console.log(`🚪 User joined room: ${room}`);
    socket.join(room);
  });

  socket.on('typing', (data) => {
    socket.to(data.room).emit('display_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.room).emit('hide_typing', data);
  });

  socket.on('send_message', async (data) => {
    console.log("📩 SOCKET PAYLOAD:", data.author, "sending to ID:", data.receiverId);

    // ✨ FIX: Flexible validation for room and IDs
    if (!data?.senderId || !data?.receiverId || !data?.message) {
      console.log("❌ MESSAGE BLOCKED — missing sender/receiver IDs");
      return;
    }

    try {
      // Save to MongoDB
      const newMessage = new Message({
        sender: String(data.senderId),
        receiver: String(data.receiverId),
        text: String(data.message),
        timestamp: new Date()
      });

      const savedMessage = await newMessage.save();
      console.log("✅ MESSAGE SAVED TO ATLAS:", savedMessage._id);

      // Broadcast to room
      const broadcastData = {
        ...data,
        id: savedMessage._id.toString(),
        time: new Date(savedMessage.timestamp).toLocaleTimeString([], {
          hour: '2-digit', minute: '2-digit'
        })
      };

      io.to(data.room).emit('receive_message', broadcastData);
      
    } catch (err) {
      console.error("❌ DB SAVE ERROR:", err.message);
    }
  });

  socket.on('message_seen', (data) => {
    if (!data?.room || !data?.id) return;
    socket.to(data.room).emit('update_seen_status', data);
  });

  socket.on('disconnect', () => {
    onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);
    io.emit('update_user_list', onlineUsers);
  });
});

// ================= DATABASE =================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err.message));

const PORT = 5001;
server.listen(PORT, () => console.log(`🚀 Server on Port ${PORT}`));