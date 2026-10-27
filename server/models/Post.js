const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user: { type: String, required: true },
    caption: { type: String },
    fileUrl: { type: String, required: true },
    
    contentType: { type: String },
    likes: [{ type: String }], 
    comments: [{
        username: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);