const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// 📩 GET messages between two specific users
router.get('/:myId/:targetId', async (req, res) => {
    try {
        const { myId, targetId } = req.params;
        // Find messages where (I am sender AND he is receiver) OR (He is sender AND I am receiver)
        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: targetId },
                { sender: targetId, receiver: myId }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Failed to load chat" });
    }
});

// 📤 SEND a new message
router.post('/send', async (req, res) => {
    try {
        const { sender, receiver, text } = req.body;
        const newMessage = new Message({ sender, receiver, text });
        await newMessage.save();
        res.json(newMessage);
    } catch (err) {
        res.status(500).json({ error: "Failed to send message" });
    }
});

module.exports = router;