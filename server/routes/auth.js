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
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const secPassword = await bcrypt.hash(password, salt);

        user = await User.create({
            name,
            email,
            password: secPassword,
            friends: [],
            pendingRequests: []
        });

        const data = { user: { id: user.id } };
        const authToken = jwt.sign(data, JWT_SECRET);
        res.json({ success: true, authToken, username: user.name, myId: user.id });
    } catch (error) {
        res.status(500).json({ error: "Server Error during Signup" });
    }
});

// 🔑 LOGIN: Authenticate User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid Credentials" });

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) return res.status(400).json({ error: "Invalid Credentials" });

        const data = { user: { id: user.id } };
        const authToken = jwt.sign(data, JWT_SECRET);
        
        // myId is sent back so the frontend knows who is the "Current User"
        res.json({ success: true, authToken, username: user.name, myId: user.id });
    } catch (error) {
        res.status(500).json({ error: "Server Error during Login" });
    }
});

// 🔍 SEARCH: Find users like Instagram
router.get('/search', async (req, res) => {
    try {
        const name = req.query.name;
        // Search by name (case-insensitive) and return only necessary info
        const users = await User.find({ 
            name: { $regex: name, $options: 'i' } 
        }).select("name _id").limit(10);
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

        if (targetId === myId) return res.status(400).json({ msg: "Can't follow yourself" });

        const targetUser = await User.findById(targetId);
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

// 💡 SUGGESTIONS: Get friend suggestions (Instagram-style)
router.get('/suggestions', async (req, res) => {
    try {
        const myId = req.query.myId;
        if (!myId) return res.status(400).json({ error: "myId is required" });

        const currentUser = await User.findById(myId);
        if (!currentUser) return res.status(404).json({ error: "User not found" });

        // Get users who are NOT already friends, NOT in pending requests, and NOT yourself
        const excludeIds = [
            ...currentUser.friends.map(id => id.toString()),
            ...currentUser.pendingRequests.map(id => id.toString()),
            myId
        ];

        // Find suggestions: users with most friends (popular) or recently created
        const suggestions = await User.find({
            _id: { $nin: excludeIds }
        })
        .select("name _id avatar friends createdAt")
        .sort({ friends: -1, createdAt: -1 }) // Sort by popularity (friend count) then by new users
        .limit(20);

        // Add mutual friends count for better suggestions
        const suggestionsWithMutuals = await Promise.all(
            suggestions.map(async (user) => {
                const mutualCount = user.friends.filter(friendId => 
                    currentUser.friends.some(myFriend => myFriend.toString() === friendId.toString())
                ).length;
                return {
                    _id: user._id,
                    name: user.name,
                    avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=a855f7&color=fff`,
                    mutualFriends: mutualCount,
                    followersCount: user.friends.length
                };
            })
        );

        // Sort by mutual friends first, then by followers
        suggestionsWithMutuals.sort((a, b) => {
            if (b.mutualFriends !== a.mutualFriends) {
                return b.mutualFriends - a.mutualFriends;
            }
            return b.followersCount - a.followersCount;
        });

        res.json(suggestionsWithMutuals.slice(0, 10)); // Return top 10
    } catch (err) {
        console.error('Suggestions error:', err);
        res.status(500).json({ error: "Failed to get suggestions" });
    }
});

module.exports = router;