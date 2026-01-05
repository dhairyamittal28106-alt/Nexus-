const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Static AI-generated reels to keep the feed feeling rich
const aiReels = Array.from({ length: 40 }).map((_, i) => ({
    _id: `ai_${i}`,
    user: `Nexus_Creator_${i}`,
    caption: `Experience Nexus Vision #${i + 1} 🚀`,
    fileUrl: `https://picsum.photos/seed/${i + 800}/1080/1920`,
    likes: [],
    comments: []
}));

// GET /api/posts/feed - main reels feed
router.get('/feed', async (req, res) => {
    try {
        const dbPosts = await Post.find().sort({ createdAt: -1 });
        res.json([...dbPosts, ...aiReels]);
    } catch (err) {
        console.error('Error fetching posts feed:', err);
        // Always return an array so the client can safely map()
        res.status(500).json([]);
    }
});

// POST /api/posts/like/:id - like/unlike a real (non-AI) post
router.post('/like/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username } = req.body || {};

        if (!username) {
            return res.status(400).json({ error: 'Username is required to like a post.' });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        const alreadyLiked = post.likes.includes(username);

        if (alreadyLiked) {
            // Unlike
            post.likes = post.likes.filter(user => user !== username);
        } else {
            // Like
            post.likes.push(username);
        }

        await post.save();
        return res.json({ success: true, liked: !alreadyLiked, likes: post.likes.length });
    } catch (err) {
        console.error('Error liking post:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST /api/posts/create - create a new reel (after Cloudinary upload)
router.post('/create', async (req, res) => {
    try {
        const { user, caption, fileUrl, contentType } = req.body || {};

        if (!user || !fileUrl) {
            return res.status(400).json({ error: 'User and fileUrl are required.' });
        }

        const post = await Post.create({
            user,
            caption,
            fileUrl,
            contentType
        });

        return res.status(201).json(post);
    } catch (err) {
        console.error('Error creating post:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST /api/posts/comment/:id - add a comment to a real (non-AI) post
router.post('/comment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, text } = req.body || {};

        if (!username || !text) {
            return res.status(400).json({ error: 'Username and text are required.' });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        post.comments.push({ username, text });
        await post.save();

        return res.json(post);
    } catch (err) {
        console.error('Error adding comment:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

// DELETE /api/posts/delete/:id - delete a real post
router.delete('/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Post.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Error deleting post:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;