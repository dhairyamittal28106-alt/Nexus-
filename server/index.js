const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
// ✨ MUST BE AT THE VERY TOP to load environment variables first
require('dotenv').config(); 

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// ✨ UPDATED: Matching your specific .env variable names exactly
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true
});

// ✨ Debug Log: Check your terminal to confirm keys are loading
console.log("☁️ Cloudinary Check:", process.env.API_KEY ? "Credentials Loaded" : "MISSING KEYS");

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(express.json({ limit: '200mb' }));

// Health check
app.get("/", (req, res) => res.json({ status: "Nexus Server Active" }));

// ✨ Dedicated Cloudinary Upload Route for Chat Images
app.post("/api/messages/upload", async (req, res) => {
    try {
        if (!req.body.data) return res.status(400).json({ error: "No image data provided" });
        
        const fileStr = req.body.data;
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            folder: "nexus_chat_images",
        });
        res.json({ url: uploadResponse.secure_url });
    } catch (err) {
        console.error("❌ Cloudinary Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// ✨ Delete History Route
app.delete("/api/messages/history/:myId/:targetId", async (req, res) => {
    try {
        const { myId, targetId } = req.params;
        await Message.deleteMany({
            $or: [
                { sender: myId, receiver: targetId },
                { sender: targetId, receiver: myId }
            ]
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✨ User Lookup Route (For Offline Identity)
app.get("/api/auth/user/:name", async (req, res) => {
    try {
        const user = await User.findOne({ name: req.params.name });
        res.json(user || {});
    } catch (err) { res.status(500).json({}); }
});

// Other Routes
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

    if (!data?.senderId || !data?.receiverId) {
       console.log("❌ MESSAGE BLOCKED — missing sender/receiver IDs");
       return;
    }

    try {
      const newMessage = new Message({
        sender: String(data.senderId),
        receiver: String(data.receiverId),
        text: String(data.message),
        image: data.image, // ✨ Storing the Cloudinary URL
        timestamp: new Date()
      });

      const savedMessage = await newMessage.save();
      console.log("✅ MESSAGE SAVED TO ATLAS:", savedMessage._id);

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
    console.log('🔴 Socket disconnected', socket.id);
  });
});

// ================= DATABASE =================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Active"))
  .catch(err => console.log("❌ MongoDB Error:", err.message));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🚀 Server on Port ${PORT}`);
});