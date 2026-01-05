const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Message = require('./models/Message'); // ✨ Import the Message model
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

// Health Check for Connection Stability
app.get("/", (req, res) => res.json({ status: "Nexus Server Active" }));

// ROUTES
app.use("/api/posts", require("./routes/posts"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/messages", require("./routes/messages")); // ✨ NEW: Message History Route

// 🔌 Realtime chat with Socket.IO logic
let onlineUsers = []; 

io.on('connection', (socket) => {
    console.log('🟢 Socket connected', socket.id);

    socket.on('user_online', ({ name }) => {
        if (!name) return;
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

    socket.on('typing', (data) => {
        socket.to(data.room).emit('display_typing', data);
    });

    socket.on('stop_typing', (data) => {
        socket.to(data.room).emit('hide_typing', data);
    });

    // ✨ UPDATED: Save message to DB then emit
    socket.on('send_message', async (data) => {
        if (!data?.room || !data?.senderId || !data?.receiverId) return;

        try {
            // Save to MongoDB so it persists after logout/refresh
            const newMessage = new Message({
                sender: data.senderId,
                receiver: data.receiverId,
                text: data.message,
                timestamp: new Date()
            });
            await newMessage.save();

            // Broadcast to everyone in the room
            io.to(data.room).emit('receive_message', data);
        } catch (err) {
            console.error("❌ Message Save Error:", err);
        }
    });

    socket.on('message_seen', (data) => {
        if (!data?.room) return;
        socket.to(data.room).emit('update_seen_status', data);
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