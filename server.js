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

// ================= YOUR MAIN ROUTES =================

// KEEP your existing routes SAME (generate-notes, auth, lectures, delete, etc.)

// ================= START SERVER (VERY IMPORTANT) =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});