const router = require('express').Router();
const Message = require('../models/Message');


router.get('/:userId/:peerId', async (req, res) => {
  try {
    const { userId, peerId } = req.params;
    
    console.log(`📜 API: Fetching messages between ${userId} and ${peerId}`);
    
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: peerId },
        { sender: peerId, receiver: userId }
      ]
    }).sort({ timestamp: 1 });
    
    console.log(`✅ Found ${messages.length} messages`);
    res.json(messages);
  } catch (err) {
    console.error('❌ History fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;