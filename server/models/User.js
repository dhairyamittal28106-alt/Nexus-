const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ✨ Name is essential for the case-insensitive search logic
    name: { 
        type: String, 
        required: true,
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    // ✨ Ensuring every user has a default avatar for the search results
    avatar: { 
        type: String, 
        default: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png" 
    },
    // ✨ Friends list populated by 'User' ObjectIds
    friends: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    // ✨ Pending requests populated by 'User' ObjectIds
    pendingRequests: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }]
}, { 
    timestamps: true // ✨ Adds createdAt (used for Suggestions) and updatedAt
});

// ✨ Added an index for the name field to make searches faster as your app grows
UserSchema.index({ name: 'text' });

module.exports = mongoose.model('User', UserSchema);