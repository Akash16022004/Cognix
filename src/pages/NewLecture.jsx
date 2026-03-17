import React, { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import LectureInput from '../components/LectureInput.jsx';
import NotesDisplay from '../components/NotesDisplay.jsx';
import { generateNotes } from '../services/api.js';

function NewLecture() {
  const [link, setLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [parsedNotes, setParsedNotes] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [error, setError] = useState(null);

  // Validate YouTube URL format
  const isValidYoutubeUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const isYoutube = hostname.includes('youtube.com') || hostname.includes('youtu.be');
      return isYoutube;
    } catch {
      return false;
    }
  };

  // Extract error details from backend response
  const parseErrorMessage = (errMessage) => {
    const msg = errMessage.toLowerCase();

    // Transcript-related errors
    if (msg.includes('transcript') || msg.includes('captions') || msg.includes('disabled') || msg.includes('available')) {
      return {
        title: '📝 Transcript Not Available',
        subtitle: 'This video has transcripts disabled or unavailable.\nTry a different lecture.',
      };
    }

    // Video unavailable errors
    if (msg.includes('video unavailable') || msg.includes('not found') || msg.includes('404')) {
      return {
        title: '🎥 Video Not Found',
        subtitle: 'This video is unavailable or has been removed.\nCheck the link and try again.',
      };
    }

    // Rate limit/quota errors
    if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429')) {
      return {
        title: '⏳ API Quota Exceeded',
        subtitle: 'Please wait a few moments before generating another lecture.\nYour quota will reset at midnight.',
      };
    }

    // Wait/cooldown errors
    if (msg.includes('please wait') && msg.includes('seconds')) {
      const secondsMatch = errMessage.match(/(\d+)\s*seconds?/);
      const seconds = secondsMatch ? secondsMatch[1] : '30';
      return {
        title: '⏱️ Please Wait',
        subtitle: `Come back in ${seconds} seconds to generate another lecture.`,
      };
    }

    // Daily limit errors
    if (msg.includes('daily limit')) {
      return {
        title: '📊 Daily Limit Reached',
        subtitle: 'You have used all 5 free lectures today.\nYour limit resets at midnight.',
      };
    }

    // Network errors
    if (msg.includes('fetch failed') || msg.includes('networkerror') || msg.includes('not connect')) {
      return {
        title: '🔌 Server Connection Failed',
        subtitle: 'Cannot reach the backend server on port 5000.\nMake sure the server is running.',
      };
    }

    // AI generation errors
    if (msg.includes('generation failed') || msg.includes('generation') || msg.includes('gemini')) {
      return {
        title: '🤖 AI Generation Failed',
        subtitle: 'Failed to generate notes from this lecture.\nTry a lecture with clearer audio.',
      };
    }

    // Default error
    return {
      title: '❌ Error',
      subtitle: errMessage || 'Something went wrong. Please try again.',
    };
  };

  const handleGenerate = async () => {
    if (!link) return;

    // Validate URL format before sending to backend
    if (!isValidYoutubeUrl(link)) {
      setError({
        title: '❌ Invalid YouTube Link',
        subtitle: 'Please paste a valid YouTube video link.',
      });
      return;
    }

    setIsGenerating(true);
    setParsedNotes(null);
    setError(null);

    try {
      const data = await generateNotes(link);
      const markdownText = data.notes;

      const extractSection = (text, keyword) => {
        const regex = new RegExp(`(?:#+)\\s*(?:\\d\\.)?\\s*${keyword}`, 'i');
        const match = text.match(regex);
        if (!match) return null;

        const startIndex = match.index + match[0].length;
        const remainingText = text.slice(startIndex);

        const nextHeadingMatch = remainingText.match(/\n#+\s/);
        if (!nextHeadingMatch) {
          return remainingText.trim();
        }
        return remainingText.slice(0, nextHeadingMatch.index).trim();
      };

      const sections = {
        summary: extractSection(markdownText, 'Summary') || 'No summary could be generated.',
        keyConcepts: extractSection(markdownText, 'Key Concepts') || 'No key concepts could be generated.',
        bulletNotes: extractSection(markdownText, 'Bullet Notes') || 'No bullet notes could be generated.',
        quizQuestions:
          extractSection(markdownText, 'Quiz Questions') || 'No quiz questions could be generated.',
        visualExplanation: extractSection(markdownText, 'Visual'),
      };

      setParsedNotes(sections);
      setActiveTab('summary');
    } catch (err) {
      console.error('Error calling backend:', err);
      const errorInfo = parseErrorMessage(err.message || '');
      setError(errorInfo);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="cognix-workspace">
      <div className="background-decorations">
        <div className="glow-orb top-left" />
        <div className="glow-orb bottom-right" />
      </div>

      <div className="dashboard-shell">
        <Navbar />
        <div className="dashboard-body">
          <Sidebar />
          <main className="dashboard-main">
            <LectureInput
              link={link}
              isGenerating={isGenerating}
              onChange={setLink}
              onSubmit={handleGenerate}
            />

            {error && (
              <div className="error-card">
                <p className="error-title">{error.title}</p>
                <p className="error-subtitle">{error.subtitle}</p>
              </div>
            )}

            <NotesDisplay parsedNotes={parsedNotes} activeTab={activeTab} setActiveTab={setActiveTab} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default NewLecture;

