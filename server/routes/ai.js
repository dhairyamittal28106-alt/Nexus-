const express = require('express');
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// 1. SMART REPLY
router.post('/suggest', async (req, res) => {
    const { messageHistory } = req.body;
    try {
        const completion = await openai.chat.completions.create({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
                { role: "system", content: "You are a casual, helpful friend. Generate a short reply (max 10 words) to the last message." },
                ...messageHistory
            ],
        });
        res.json({ reply: completion.choices[0].message.content });
    } catch (error) { res.status(500).json({ reply: "Cool!" }); }
});

// 2. FACT CHECK (LIE DETECTOR)
router.post('/factcheck', async (req, res) => {
    const { text } = req.body;
    try {
        const completion = await openai.chat.completions.create({
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
                { role: "system", content: "You are a Truth Engine. Analyze the statement. Reply only with 'TRUE', 'FALSE', or 'OPINION'." },
                { role: "user", content: text }
            ],
        });
        res.json({ verdict: completion.choices[0].message.content });
    } catch (error) { res.status(500).json({ verdict: "ERROR" }); }
});

module.exports = router;