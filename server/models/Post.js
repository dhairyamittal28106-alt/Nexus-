const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user: { type: String, required: true },
    caption: { type: String },
    fileUrl: { type: String, required: true },
    // Optional MIME type (e.g. 'video/mp4', 'image/png') to help client decide player
    contentType: { type: String },
    likes: [{ type: String }], // Stores usernames of people who liked
    comments: [{
        username: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);