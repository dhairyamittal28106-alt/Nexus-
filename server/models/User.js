const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    
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
    
    avatar: { 
        type: String, 
        default: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png" 
    },
    
    friends: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    
    pendingRequests: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }]
}, { 
    timestamps: true 
});


UserSchema.index({ name: 'text' });

module.exports = mongoose.model('User', UserSchema);