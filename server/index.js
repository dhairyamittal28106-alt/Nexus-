const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config(); 

const Message = require('./models/Message');
const User = require('./models/User');
const Post = require('./models/Post'); 

const app = express();
const server = http.createServer(app);

// ✨ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true
});

console.log("☁️ Cloudinary Check:", process.env.API_KEY ? "Credentials Loaded" : "MISSING KEYS");

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));

// Support for HD renders & Large Chat Images
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Health check
app.get("/", (req, res) => res.json({ status: "Nexus 2026 Server Active" }));

// ================= MISSION: POST TO REELS =================
app.post("/api/posts", async (req, res) => {
    try {
        const { user, username, fileUrl, mediaUrl, caption } = req.body;
        const finalImage = fileUrl || mediaUrl;
        const finalUser = user || username;

        if (!finalImage) {
            return res.status(400).json({ error: "Missing required parameter - file" });
        }

        const uploadRes = await cloudinary.uploader.upload(finalImage, {
            folder: "nexus_reels",
        });

        const newPost = new Post({
            user: finalUser,
            username: finalUser,
            fileUrl: uploadRes.secure_url,
            mediaUrl: uploadRes.secure_url,
            caption: caption || "Captured in Nexus Studio 2026 ✨",
            timestamp: new Date()
        });

        await newPost.save();
        res.status(201).json({ success: true, post: newPost });
    } catch (err) {
        console.error("❌ POST TO REELS ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✨ Dedicated Cloudinary Upload Route for Chat Images
app.post("/api/messages/upload", async (req, res) => {
    try {
        const imageData = req.body.data || req.body.image; 
        if (!imageData) return res.status(400).json({ error: "No image data provided" });

        const uploadResponse = await cloudinary.uploader.upload(imageData, {
            folder: "nexus_chat_images",
        });

        res.json({ url: uploadResponse.secure_url });
    } catch (err) {
        console.error("❌ Chat Image Upload Error:", err);
        res.status(500).json({ error: "Upload failed", details: err.message });
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

// ✨ User Lookup Route
app.get("/api/auth/user/:name", async (req, res) => {
    try {
        const user = await User.findOne({ name: req.params.name });
        res.json(user || {});
    } catch (err) { res.status(500).json({}); }
});

// Other Routes
app.use("/api/posts", require("./routes/posts"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/messages", require("./routes/messages"));

// ================= SOCKET LOGIC (DIRECT RINGING UPDATED) =================

let onlineUsers = [];
const userSocketMap = new Map(); // Store userId -> socketId

io.on('connection', (socket) => {
  console.log('🟢 Socket connected', socket.id);

  socket.on('user_online', ({ name, userId }) => {
    if (!name || !userId) return;
    onlineUsers = onlineUsers.filter(u => u.userId !== userId);
    onlineUsers.push({ socketId: socket.id, name, userId });
    userSocketMap.set(userId, socket.id); // Phonebook for direct rings
    io.emit('update_user_list', onlineUsers);
  });

  // ✨ INITIATE DIRECT RING
  socket.on('initiate_call', ({ targetUserId, callerName, callType, roomID }) => {
    const receiverSocketId = userSocketMap.get(targetUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call_alert', {
        callerName,
        callType,
        roomID
      });
    }
  });

  socket.on('join_room', (room) => { if (room) socket.join(room); });

  socket.on('typing', (data) => { socket.to(data.room).emit('display_typing', data); });

  socket.on('stop_typing', (data) => { socket.to(data.room).emit('hide_typing', data); });

  socket.on('send_message', async (data) => {
    if (!data?.senderId || !data?.receiverId) return;
    try {
      const newMessage = new Message({
        sender: String(data.senderId),
        receiver: String(data.receiverId),
        text: String(data.message),
        image: data.image,
        replyTo: data.replyTo, 
        timestamp: new Date()
      });
      const savedMessage = await newMessage.save();
      const broadcastData = {
        ...data,
        id: savedMessage._id.toString(),
        time: new Date(savedMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      io.to(data.room).emit('receive_message', broadcastData);
    } catch (err) { console.error("❌ DB SAVE ERROR:", err.message); }
  });

  socket.on('send_reaction', (data) => { if (data.room) socket.to(data.room).emit('update_reaction', data); });

  socket.on('message_seen', (data) => { if (data?.room && data?.id) socket.to(data.room).emit('update_seen_status', data); });

  socket.on('disconnect', () => {
    onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);
    for (let [uid, sid] of userSocketMap.entries()) {
        if (sid === socket.id) userSocketMap.delete(uid);
    }
    io.emit('update_user_list', onlineUsers);
    console.log('🔴 Socket disconnected', socket.id);
  });
});

// ================= MISSION: THE AUDIO DB & SAAVN ENGINE =================
app.get("/api/music/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Integrated Saavn Engine for 2026 High-speed streaming
        const streamRes = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}`);
        const streamData = await streamRes.json();

        if (streamData.success && streamData.data.results) {
            const results = streamData.data.results.map(song => ({
                title: song.name,
                artist: song.artists.primary[0]?.name || "Nexus Artist",
                url: song.downloadUrl[song.downloadUrl.length - 1]?.url,
                cover: song.image[song.image.length - 1]?.url,
                source: "AudioDB Node"
            }));
            return res.json(results);
        }

        res.json([{ title: `${q} (System Mix)`, artist: "Nexus Node", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400" }]);
    } catch (err) {
        console.error("❌ MUSIC HUB ERROR:", err.message);
        res.status(500).json({ error: "API unreachable" });
    }
});

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Active - Nexus 2026 Core"))
  .catch(err => console.log("❌ MongoDB Error:", err.message));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`🚀 Server on Port ${PORT} - READY FOR BIG 2026`);
});