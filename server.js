import express from 'express';
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

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Start server FIRST (prevents Render timeout)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// ✅ Connect DB AFTER server starts (non-blocking)
connectDB()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error('❌ MongoDB connection failed:', err));

// ✅ CORS (allow all for production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ Health check route (VERY IMPORTANT for Render)
app.get('/', (req, res) => {
  res.send('Cognix backend running 🚀');
});

// ================= HELPER =================
async function generateWithRetry(model, prompt, maxRetries = 2, timeoutSeconds = 30) {
  let lastError;
  let baseWaitTime = 2000;
  const startTime = Date.now();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      if (elapsedSeconds > timeoutSeconds) {
        throw new Error(`Timeout after ${timeoutSeconds}s`);
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();

    } catch (error) {
      lastError = error;

      const isRateLimitError =
        error.status === 429 ||
        error.message.includes('quota') ||
        error.message.includes('rate');

      if (isRateLimitError && attempt < maxRetries) {
        console.warn(`Retry ${attempt}...`);
        await new Promise(r => setTimeout(r, baseWaitTime * attempt));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

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
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// ================= ROUTES =================

// Health
app.get('/api/test', (req, res) => {
  res.json({ message: "API working ✅" });
});

// ================= YOUR EXISTING ROUTES =================
// (KEEP YOUR generate-notes, auth, lectures routes SAME)
