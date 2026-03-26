import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { TranscriptClient } from 'youtube-transcript-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import connectDB from './backend/db.js';
import Lecture from './backend/models/Lecture.js';
import User from './backend/models/User.js';

dotenv.config();

console.log("🚀 Starting Cognix backend...");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ Health check route (VERY IMPORTANT)
app.get('/', (req, res) => {
  res.send('Cognix backend running 🚀');
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================= DB CONNECTION (NON-BLOCKING) =================
connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// ================= ERROR HANDLING =================
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// ================= AUTH =================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cognix-secret-key');
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ================= TEST ROUTE =================
app.get('/api/test', (req, res) => {
  res.json({ message: "API working ✅" });
});

// ================= HELPER =================
async function generateWithRetry(model, prompt, maxRetries = 2) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      console.warn(`Retry ${attempt}...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  throw lastError;
}

function getVideoId(urlString) {
  try {
    const url = new URL(urlString);

    // Handle youtu.be/VIDEOID links
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }

    // Handle youtube.com/watch?v=VIDEOID links
    if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
      if (url.pathname === '/watch') {
        return url.searchParams.get('v');
      }
      // Handle youtube.com/shorts/VIDEOID links
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2];
      }
      // Handle youtube.com/embed/VIDEOID links
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2];
      }
    }
    return null;
  } catch (error) {
    console.error('URL parsing error:', error);
    return null;
  }
}

// ================= AUTH ROUTES =================
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), password: hashedPassword });

    return res.status(201).json({ message: 'Signup successful!', userId: user._id });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Signup failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ Database not connected while attempting login.');
      return res.status(503).json({ error: 'Database connection issue. Please try again later.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'cognix-secret-key',
      { expiresIn: '7d' },
    );

    return res.json({ token, message: 'Login successful!' });
  } catch (error) {
    console.error('❌ Login error details:', error);
    return res.status(500).json({ 
      error: 'Login failed due to a server error.', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// ================= LECTURE ROUTES (PROTECTED) =================
app.get('/api/lectures', authMiddleware, async (req, res) => {
  try {
    const lectures = await Lecture.find().sort({ createdAt: -1 });
    return res.json(lectures);
  } catch (error) {
    console.error('Error fetching lectures:', error);
    return res.status(500).json({ error: 'Failed to fetch lectures.' });
  }
});

app.delete('/api/lectures/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Lecture.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }
    return res.json({ message: 'Lecture deleted.' });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return res.status(500).json({ error: 'Failed to delete lecture.' });
  }
});

// ================= GENERATE NOTES (PROTECTED) =================
app.post('/api/generate-notes', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
  }

  const videoId = getVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL. Could not extract Video ID.' });
  }

  try {
    // 1) Fetch transcript
    let transcriptData;
    try {
      transcriptData = await TranscriptClient.getTranscript(videoId);
    } catch (transcriptError) {
      console.error('Transcript Fetch Error:', transcriptError);
      const isTooManyRequests = transcriptError.message?.includes('Too Many Requests') || 
                                transcriptError.message?.includes('captcha');
      
      if (isTooManyRequests) {
        return res.status(429).json({
          error: "YouTube is temporarily blocking the server's IP address. Please try again later or use a video with a shorter transcript.",
          details: "YouTube IP Block / Captcha required."
        });
      }

      return res.status(400).json({
        error: `Transcript fetch failed: ${transcriptError.message || 'unknown error'}`,
      });
    }

    const fullTranscript = transcriptData.map((item) => item.text).join(' ');
    if (!fullTranscript.trim()) {
      return res.status(400).json({ error: 'Transcript was empty.' });
    }

    // 2) Chunk transcript
    const chunkSize = 5000;
    const chunks = [];
    for (let i = 0; i < fullTranscript.length; i += chunkSize) {
      chunks.push(fullTranscript.slice(i, i + chunkSize));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 3) Summarize chunks
    const chunkSummaries = await Promise.all(
      chunks.map(async (chunk) => {
        const chunkPrompt = `
Summarize the following section of a video transcript. Extract the key points, concepts, and relevant details. Keep it concise but comprehensive.

Transcript Section:
${chunk}
`;
        try {
          return await generateWithRetry(model, chunkPrompt, 2);
        } catch (err) {
          console.error('Error summarizing chunk:', err);
          return '';
        }
      }),
    );

    const combinedSummary = chunkSummaries.filter(Boolean).join('\n\n---\n\n');

    // 4) Final notes prompt (Mermaid + tables, no ASCII)
    const finalPrompt = `
You are an expert AI learning assistant for Cognix, an AI learning platform that converts lecture transcripts into structured study material.
I will provide you with a combined summary generated from the entire transcript of a YouTube lecture.
Your task is to generate high-quality academic notes with the following strict structure.

# Output format (Markdown):

## 1. Summary
Write a clear paragraph explaining the main idea of the lecture.

## 2. Key Concepts
List the most important concepts and define them clearly.

## 3. Bullet Notes
Create structured bullet-point notes explaining the lecture step-by-step.

## 4. Quiz Questions
Generate 5 conceptual questions students might see in exams.

## 5. Visual / Pictographic Explanation
If a concept would benefit from visual explanation:
- Prefer a Mermaid diagram using a fenced code block with the language "mermaid".
- Inside the Mermaid code block, only use valid Mermaid syntax. Do not include raw mathematical notation or long textual definitions inside the diagram.
- Any mathematical expressions or formal definitions must be written outside the Mermaid block as normal Markdown or in a Markdown table.
- If a Mermaid diagram is not suitable, use Markdown tables or other structured Markdown instead of ASCII art.

# Rules:
* Keep explanations clear and simple.
* Avoid copying sentences directly from the transcript.
* Focus on important concepts only.
* Use clean Markdown formatting compatible with ReactMarkdown.

Combined Lecture Summaries:
${combinedSummary}
`;

    const markdownNotes = await generateWithRetry(model, finalPrompt, 2);

    // 5) Save to DB (best-effort)
    try {
      await Lecture.create({ youtubeLink: url, notes: markdownNotes });
    } catch (saveError) {
      console.error('Failed to save lecture:', saveError);
      return res.status(200).json({
        notes: markdownNotes,
        dbError: 'Lecture could not be saved to the database.',
      });
    }

    return res.json({ notes: markdownNotes });
  } catch (error) {
    console.error('Error generating notes:', error);
    return res.status(500).json({ error: 'An error occurred while generating notes from the transcript.' });
  }
});

// ================= START SERVER (VERY IMPORTANT) =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});