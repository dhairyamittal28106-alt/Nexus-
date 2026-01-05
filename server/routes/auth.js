const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "SecretNexusKey";

// 📝 SIGNUP: Create User
router.post('/createuser', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let user = await User.findOne({ email: email.toLowerCase() });
        if (user) return res.status(400).json({ error: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const secPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email: email.toLowerCase(),
            password: secPassword,
            friends: [],
            pendingRequests: []
        });

        const data = { user: { id: user.id } };
        const authToken = jwt.sign(data, JWT_SECRET);
        
        // ✨ FIXED: Added myId and preserved name/email features
        res.json({ 
            success: true, 
            authToken, 
            username: user.name, 
            myId: user._id.toString() 
        });
    } catch (error) {
        res.status(500).json({ error: "Server Error during Signup" });
    }
});

// 🔑 LOGIN: Authenticate User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(400).json({ error: "Invalid Credentials" });

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) return res.status(400).json({ error: "Invalid Credentials" });

        const data = { user: { id: user.id } };
        const authToken = jwt.sign(data, JWT_SECRET);
        
        // ✨ FIXED: Explicitly sending myId and preserving streak feature
        res.json({ 
            success: true, 
            authToken, 
            username: user.name, 
            myId: user._id.toString(),
            streak: user.streak || 0 // Preserving old streak feature
        });
    } catch (error) {
        res.status(500).json({ error: "Server Error during Login" });
    }
});

// 🔍 SEARCH: Find users (Case-Insensitive & Exclude Self)
router.get('/search', async (req, res) => {
    try {
        const { name, myId } = req.query;
        if (!name) return res.json([]);

        const users = await User.find({ 
            name: { $regex: name.trim(), $options: 'i' },
            _id: { $ne: myId } 
        }).select("name _id avatar").limit(10);

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

// ➕ ADD FRIEND: Send Request
router.post('/add-friend/:id', async (req, res) => {
    try {
        const targetId = req.params.id;
        const { myId } = req.body;

        if (!myId) return res.status(400).json({ error: "User ID is required" });
        if (targetId === myId) return res.status(400).json({ msg: "Can't follow yourself" });

        const targetUser = await User.findById(targetId);
        if (!targetUser) return res.status(404).json({ error: "Target user not found" });

        if (!targetUser.pendingRequests.includes(myId) && !targetUser.friends.includes(myId)) {
            targetUser.pendingRequests.push(myId);
            await targetUser.save();
            res.json({ success: true, msg: "Follow Request Sent!" });
        } else {
            res.json({ success: false, msg: "Already following or requested" });
        }
    } catch (err) {
        res.status(500).json({ error: "Friend request failed" });
    }
});

// 📥 GET PENDING REQUESTS (Enhanced Population)
router.get('/pending-requests', async (req, res) => {
    try {
        const { myId } = req.query;
        if (!myId) return res.status(400).json({ error: "myId is required" });

        const user = await User.findById(myId).populate({
            path: 'pendingRequests',
            model: 'User',
            select: 'name avatar'
        });

        res.json(user ? user.pendingRequests : []);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// ✅ HANDLE REQUEST: Accept or Reject
router.post('/handle-request', async (req, res) => {
    try {
        const { myId, targetId, action } = req.body;
        const me = await User.findById(myId);
        const sender = await User.findById(targetId);

        if (!me || !sender) return res.status(404).json({ error: "User not found" });

        me.pendingRequests = me.pendingRequests.filter(id => id.toString() !== targetId);

        if (action === 'accept') {
            if (!me.friends.includes(targetId)) me.friends.push(targetId);
            if (!sender.friends.includes(myId)) sender.friends.push(myId);
        }

        await me.save();
        await sender.save();
        res.json({ success: true, msg: `Request ${action}ed!` });
    } catch (err) {
        res.status(500).json({ error: "Action failed" });
    }
});

// 👫 GET FRIENDS LIST
router.get('/friends-list', async (req, res) => {
    try {
        const { myId } = req.query;
        const user = await User.findById(myId).populate({
            path: 'friends',
            model: 'User',
            select: 'name avatar'
        });
        res.json(user ? user.friends : []);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch friends list" });
    }
});

// 💡 SUGGESTIONS: Mutual Friends & Newest Members
router.get('/suggestions', async (req, res) => {
    try {
        const myId = req.query.myId;
        let excludeIds = [];
        let currentUser = null;

        if (myId) {
            currentUser = await User.findById(myId);
            if (currentUser) {
                excludeIds = [
                    ...currentUser.friends.map(id => id.toString()),
                    ...currentUser.pendingRequests.map(id => id.toString()),
                    myId
                ];
            }
        }

        const suggestions = await User.find({ _id: { $nin: excludeIds } })
            .select("name _id avatar friends createdAt")
            .sort({ createdAt: -1 }).limit(10);

        const suggestionsWithMutuals = await Promise.all(suggestions.map(async (user) => {
            let mutualCount = 0;
            if (currentUser) {
                mutualCount = user.friends.filter(fId => currentUser.friends.some(myF => myF.toString() === fId.toString())).length;
            }
            return {
                _id: user._id,
                name: user.name,
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=a855f7&color=fff`,
                mutualFriends: mutualCount,
                followersCount: user.friends ? user.friends.length : 0
            };
        }));

        suggestionsWithMutuals.sort((a, b) => b.mutualFriends - a.mutualFriends);
        res.json(suggestionsWithMutuals);
    } catch (err) {
        res.status(500).json({ error: "Failed to get suggestions" });
    }
});

module.exports = router;