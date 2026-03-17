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

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Connect to MongoDB
connectDB().catch((err) => {
  console.error('Failed to connect to MongoDB on startup:', err);
});

// Configure CORS to explicitly allow the Vite frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Additional middleware to set explicit headers (resolves some strict CSP browser configurations)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.json());

// Helper function to handle Gemini API requests with retry logic for rate limiting
async function generateWithRetry(model, prompt, maxRetries = 2, timeoutSeconds = 30) {
  let lastError;
  let baseWaitTime = 2000; // Start with 2 seconds
  
  // Set total timeout
  const startTime = Date.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if we've exceeded total timeout
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      if (elapsedSeconds > timeoutSeconds) {
        throw new Error(`Request timeout after ${timeoutSeconds} seconds. Gemini API may be unresponsive due to quota limits.`);
      }
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      lastError = error;
      
      // Check if it's a 429 rate limit or quota exceeded error
      const isRateLimitError = error.status === 429 || 
                               error.message.includes('429') || 
                               error.message.includes('rate') ||
                               error.message.includes('quota') ||
                               error.message.includes('quota exceeded');
      
      if (isRateLimitError) {
        console.warn(`Rate limit/Quota error on attempt ${attempt}/${maxRetries}: ${error.message}`);
        
        if (attempt < maxRetries) {
          // Check remaining time
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const remainingSeconds = timeoutSeconds - elapsedSeconds;
          
          if (remainingSeconds < 2) {
            console.error(`Insufficient time remaining for retry. Throwing error.`);
            break;
          }
          
          const waitTime = Math.min(baseWaitTime * Math.pow(2, attempt - 1), remainingSeconds * 1000);
          console.warn(`Retrying in ${waitTime / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error(`Rate limit error persists after ${maxRetries} attempts.`);
        }
      } else {
        // If it's not a rate limit error, throw immediately
        throw error;
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw lastError || new Error('Failed to generate content after multiple attempts');
}

// Auth middleware — verifies JWT and sets req.userId
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cognix-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
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

app.post('/api/generate-notes', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  const videoId = getVideoId(url);
  console.log(`Extracted Video ID: ${videoId} from URL: ${url}`);
  
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL. Could not extract Video ID.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastReset = new Date(user.lastUsageReset);
    lastReset.setHours(0, 0, 0, 0);

    if (lastReset < today) {
      user.lecturesUsedToday = 0;
      user.lastUsageReset = new Date();
      await user.save();
    }

    // Enforce free plan limits
    if (user.plan === 'free') {
      // Check daily limit: max 5 lectures per day
      if (user.lecturesUsedToday >= 5) {
        return res.status(403).json({ error: 'Daily limit reached. Upgrade to Cognix Pro for unlimited lectures.' });
      }

      // Check cooldown: min 30 seconds between lecture generations
      if (user.lastLectureGeneratedAt) {
        const timeSinceLastGeneration = Date.now() - new Date(user.lastLectureGeneratedAt).getTime();
        const cooldownMs = 30000; // 30 seconds in milliseconds
        
        if (timeSinceLastGeneration < cooldownMs) {
          const secondsToWait = Math.ceil((cooldownMs - timeSinceLastGeneration) / 1000);
          return res.status(429).json({ 
            error: `Please wait ${secondsToWait} seconds before generating another lecture.`,
            secondsToWait 
          });
        }
      }
    }

    // 1. Fetch Transcript using the original youtube-transcript library
    console.log(`Fetching transcript for video ID: ${videoId}`);
    let transcriptData;
    try {
      transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (transcriptError) {
      console.error('Transcript Fetch Error:', transcriptError);
      
      const errorMsg = transcriptError.message || '';
      if (errorMsg.includes('Transcript is disabled') || errorMsg.includes('captions are disabled')) {
        return res.status(400).json({ 
          error: '📝 Transcript is disabled on this video. Please try a video with available captions.' 
        });
      }
      
      return res.status(400).json({ 
        error: `Fetch failed: ${errorMsg || 'unknown'}`
      });
    }

    // Process the transcript array into a single text block
    const fullTranscript = transcriptData.map(item => item.text).join(' ');
    
    // Check if it's empty
    if (!fullTranscript.trim()) {
      return res.status(400).json({ error: 'Transcript was empty.' });
    }

    // 2. Split Transcript into Chunks (larger chunks to reduce API calls and stay within quota limits)
    const chunkSize = 10000; // Increased from 5000 to minimize number of API requests on free tier
    const chunks = [];
    for (let i = 0; i < fullTranscript.length; i += chunkSize) {
      chunks.push(fullTranscript.slice(i, i + chunkSize));
    }
    
    console.log(`Transcript split into ${chunks.length} chunks. Summarizing...`);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 3. Generate a short summary for each chunk sequentially to respect rate limits
    const chunkSummaries = [];
    for (let index = 0; index < chunks.length; index++) {
      const chunkPrompt = `Summarize the following section of a video transcript. Extract the key points, concepts, and relevant details. Keep it concise but comprehensive.

Transcript Section:
${chunks[index]}`;
      try {
        // Add minimal delay between requests (except the first one) to avoid hitting quota limits
        if (index > 0) {
          console.log(`Processing chunk ${index + 1}/${chunks.length}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const summaryText = await generateWithRetry(model, chunkPrompt);
        chunkSummaries.push(summaryText);
        console.log(`Successfully summarized chunk ${index + 1}/${chunks.length}`);
      } catch (err) {
        console.error(`Error summarizing chunk ${index}:`, err);
        chunkSummaries.push(""); // Push empty to maintain structure or just skip
      }
    }

    // Combine the chunk summaries
    const combinedSummary = chunkSummaries.filter(Boolean).join('\n\n---\n\n');

    // 4. Send the combined summary to Gemini for the final structured notes
    console.log('Generating final structured notes from combined chunk summaries...');
    const finalPrompt = `You are an expert AI learning assistant for Cognix, an AI learning platform that converts lecture transcripts into structured study material.
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
- Prefer a Mermaid diagram using a fenced code block with the language "mermaid". For example:

\`\`\`mermaid
graph TD
NodeA --> NodeB
\`\`\`

- Use appropriate Mermaid diagram types (e.g., "graph TD" for flows, "sequenceDiagram" for interactions, "classDiagram" for structures) to clearly represent the concept.
- Inside the Mermaid code block, only use valid Mermaid syntax (nodes and arrows, sequence steps, classes, etc.). Do **not** include raw mathematical notation, long textual definitions, or sentences inside the diagram.
- Any mathematical expressions or formal definitions (for example, things like "δ : Q × Σ → Q") must be written **outside** the Mermaid block as normal Markdown, or presented in a **Markdown table**, not inside the Mermaid code.
- If the concept cannot be clearly expressed as a Mermaid diagram while following these rules, use **Markdown tables** or other structured Markdown instead of ASCII art.
- Do NOT use plain ASCII box diagrams; always choose Mermaid or tables.

# Rules:
* Keep explanations clear and simple.
* Avoid copying sentences directly from the transcript.
* Focus on important concepts only.
* Use clean Markdown formatting compatible with ReactMarkdown.
* Include visual explanations only when they help understanding; if no visual makes sense, you can omit this section or state why.

Combined Lecture Summaries:
${combinedSummary}`;

    const markdownNotes = await generateWithRetry(model, finalPrompt);
    console.log('Successfully generated complete notes.');

    // 5. Save lecture to MongoDB (non-blocking for notes response)
    try {
      const lecture = new Lecture({
        youtubeLink: url,
        notes: markdownNotes,
        userId: req.userId,
      });
      await lecture.save();
      console.log('Lecture saved to MongoDB');

      // Update user's lecture generation tracking
      user.lastLectureGeneratedAt = new Date();
      
      if (user.plan === 'free') {
        user.lecturesUsedToday += 1;
      }
      
      await user.save();
      console.log(`User ${req.userId} lecture generation recorded. Plan: ${user.plan}, Lectures today: ${user.lecturesUsedToday}`);
    } catch (saveError) {
      console.error('Failed to save lecture to MongoDB:', saveError);
      // Continue to return notes even if saving fails
      return res.status(200).json({
        notes: markdownNotes,
        dbError: 'Lecture could not be saved to the database.',
      });
    }

    // 6. Return the notes as JSON
    res.json({ notes: markdownNotes });

  } catch (error) {
    console.error('Error generating notes:', error);
    res.status(500).json({ error: error.message || 'An error occurred while generating notes from the transcript.' });
  }
});

// Fetch logged-in user's lectures
app.get('/api/lectures', authMiddleware, async (req, res) => {
  try {
    const lectures = await Lecture.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(lectures);
  } catch (error) {
    console.error('Error fetching lectures:', error);
    res.status(500).json({ error: 'Failed to fetch lectures from the database.' });
  }
});

// Delete a lecture by ID (only own lectures)
app.delete('/api/lectures/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Lecture.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ error: 'Lecture not found.' });
    }
    console.log(`Lecture ${id} deleted by user ${req.userId}`);
    res.json({ message: 'Lecture deleted successfully.' });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    res.status(500).json({ error: 'Failed to delete lecture.' });
  }
});

// ========== AUTH ROUTES ==========

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email: email.toLowerCase(), password: hashedPassword });
    await user.save();

    console.log(`User registered: ${email}`);
    res.status(201).json({ message: 'Account created successfully!' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
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
      { expiresIn: '7d' }
    );

    console.log(`User logged in: ${email}`);
    res.json({ token, message: 'Login successful!' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
