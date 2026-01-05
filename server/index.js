const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }
});

// 🛡️ Enhanced CORS to ensure no handshake failures
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increased limit for high-capacity media
app.use(express.json({ limit: '200mb' }));

// ROUTES
app.use("/api/posts", require("./routes/posts"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ai", require("./routes/ai"));

// 🔌 Realtime chat with Socket.IO
let onlineUsers = []; // { id, name }

io.on('connection', (socket) => {
    console.log('🟢 Socket connected', socket.id);

    socket.on('user_online', ({ name }) => {
        if (!name) return;
        // Track or update this user
        const existing = onlineUsers.find(u => u.id === socket.id);
        if (existing) {
            existing.name = name;
        } else {
            onlineUsers.push({ id: socket.id, name });
        }
        io.emit('update_user_list', onlineUsers);
    });

    socket.on('join_room', (room) => {
        if (!room) return;
        socket.join(room);
    });

    socket.on('send_message', (data) => {
        if (!data?.room) return;
        io.to(data.room).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        onlineUsers = onlineUsers.filter(u => u.id !== socket.id);
        io.emit('update_user_list', onlineUsers);
        console.log('🔴 Socket disconnected', socket.id);
    });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Active"))
  .catch((err) => console.log("❌ DB Error", err));

const PORT = 5001;
server.listen(PORT, () => console.log(`🚀 Server on Port ${PORT}`));