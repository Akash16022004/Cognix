import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';
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
  const timeoutMs = 45000; // 45s max timeout per call

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[GEMINI_CALL] Start (Attempt ${attempt})...`);

      const resultPromise = model.generateContent(prompt);

      // Add a timeout safety
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs)
      );

      const result = await Promise.race([resultPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      console.log(`[GEMINI_CALL] Success (Attempt ${attempt})`);
      return text;
    } catch (error) {
      lastError = error;
      const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
      const waitTime = Math.pow(2, attempt) * 2000; // Exponential backoff: 4s, 8s...

      console.warn(`[GEMINI_CALL] Error (Attempt ${attempt}): ${error.message}. ${isQuotaError ? 'Quota exceeded.' : 'Retrying...'}`);

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  throw lastError;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

function validateYoutubeUrl(urlString) {
  try {
    const url = new URL(urlString);
    const validHosts = ['www.youtube.com', 'youtube.com', 'youtu.be'];
    return validHosts.includes(url.hostname);
  } catch {
    return false;
  }
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
    console.error(`[AUTH_ERROR] Login failure for ${email}:`, error);
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

  if (!validateYoutubeUrl(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL provided.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('[CONFIG_ERROR] Gemini API Key missing');
    return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
  }

  const videoId = getVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: 'Could not extract Video ID from URL.' });
  }

  console.log(`[PROCESS_START] Generating notes for Video: ${videoId}`);

  try {
    // 1) Fetch transcript
    let transcriptData;
    try {
      console.log(`[FETCH_TRANSCRIPT] Requesting for ${videoId}...`);
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`[FETCH_TRANSCRIPT] Success for ${videoId}`);
    } catch (transcriptError) {
      console.error(`[FETCH_TRANSCRIPT] Error for ${videoId}:`, transcriptError);

      if (transcriptError.message?.includes('Too Many Requests') || transcriptError.message?.includes('captcha') || transcriptError.message?.toLowerCase().includes('rate')) {
        return res.status(429).json({
          error: "⚠️ YouTube is rate-limiting requests. Please try again later."
        });
      }

      return res.status(400).json({
        error: `Could not fetch transcript: ${transcriptError.message || 'Unknown error'}`,
      });
    }

    const fullTranscript = transcriptData.map((item) => item.text).join(' ');
    if (!fullTranscript.trim()) {
      return res.status(400).json({ error: 'Transcript was empty.' });
    }

    // 2) Chunk transcript (Increase to 25k for efficiency)
    const chunkSize = 25000;
    const chunks = [];
    for (let i = 0; i < fullTranscript.length; i += chunkSize) {
      chunks.push(fullTranscript.slice(i, i + chunkSize));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Use stable 1.5-flash

    // 3) Summarize chunks (SEQUENTIAL to avoid usage overload)
    console.log(`[PROCESS_CHUNKS] Processing ${chunks.length} chunks...`);
    const chunkSummaries = [];
    for (const [index, chunk] of chunks.entries()) {
      console.log(`[PROCESS_CHUNKS] Chunk ${index + 1}/${chunks.length}`);

      const chunkPrompt = `Summarize this video transcript section. Extract key points and concepts.\n\nSection:\n${chunk}`;

      try {
        const summary = await generateWithRetry(model, chunkPrompt, 2);
        chunkSummaries.push(summary);

        // Add 5s delay between chunks if there are more
        if (index < chunks.length - 1) {
          console.log(`[PROCESS_CHUNKS] Sleeping 5s...`);
          await sleep(5000);
        }
      } catch (err) {
        console.error(`[PROCESS_CHUNKS] Error summarizing chunk ${index + 1}:`, err);
      }
    }

    const combinedSummary = chunkSummaries.filter(Boolean).join('\n\n---\n\n');
    if (!combinedSummary) {
      return res.status(500).json({ error: 'Failed to generate any summaries from chunks.' });
    }

    // 4) Final structure
    console.log('[FINAL_PROMPT] Generating structured notes...');
    const finalPrompt = `
Generate high-quality academic notes from this combined summary. Use Markdown with sections for Summary, Key Concepts, Bullet Notes, Quiz Questions (5), and a Mermaid diagram if applicable.

Summary:\n${combinedSummary}
`;

    const markdownNotes = await generateWithRetry(model, finalPrompt, 2);

    // 5) Save to DB
    try {
      await Lecture.create({ youtubeLink: url, notes: markdownNotes });
      console.log(`[PROCESS_COMPLETE] Notes generated and saved for ${videoId}`);
    } catch (saveError) {
      console.error('[DB_ERROR] Failed to save lecture:', saveError);
      return res.status(200).json({
        notes: markdownNotes,
        dbError: 'Lecture saved in memory but failed to persist to DB.',
      });
    }

    return res.json({ notes: markdownNotes });
  } catch (error) {
    console.error(`[PROCESS_ERROR] Failed for ${videoId}:`, error);

    if (error.status === 429 || error.message?.includes('429')) {
      return res.status(429).json({ error: 'A quota limit was reached. Please try again in 1 minute.' });
    }

    return res.status(500).json({ error: 'An unexpected error occurred during note generation.' });
  }
});

// ================= START SERVER (VERY IMPORTANT) =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});