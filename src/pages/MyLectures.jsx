import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import NotesDisplay from '../components/NotesDisplay.jsx';
import { fetchLectures, deleteLecture } from '../services/api.js';

const getYouTubeVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
  } catch (e) {
    return null;
  }
  return null;
};

const getYouTubeThumbnail = (videoId) => {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

const getCleanTitle = (url) => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) return `YouTube Video (${videoId})`;
  return url.length > 40 ? url.substring(0, 40) + '...' : url;
};

function MyLectures() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedNotes, setSelectedNotes] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadLectures = async () => {
      try {
        const data = await fetchLectures();
        if (mounted) {
          // Fetch titles concurrently using noembed.com API
          const enrichedData = await Promise.all(
            data.map(async (lecture) => {
              try {
                const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(lecture.youtubeLink)}`);
                if (res.ok) {
                  const json = await res.json();
                  if (json.title) {
                    return { ...lecture, fetchedTitle: json.title };
                  }
                }
              } catch (e) {
                console.error('Failed to fetch title for', lecture.youtubeLink);
              }
              return lecture;
            })
          );
          setLectures(enrichedData);
        }
      } catch (err) {
        if (mounted) {
          const errorMsg = err.message || 'Failed to fetch lectures.';
          // Provide helpful error messages
          if (errorMsg.includes('Cannot connect') || errorMsg.includes('Failed to fetch')) {
            setError('🔌 Cannot connect to the server. Make sure it is running on port 5000.');
          } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
            setError('🔐 Authentication failed. Please log in again.');
          } else {
            setError(`❌ ${errorMsg}`);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadLectures();

    return () => {
      mounted = false;
    };
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const handleViewNotes = (lecture, index) => {
    if (expandedId === index) {
      setExpandedId(null);
      setSelectedNotes(null);
      return;
    }

    const markdownText = lecture.notes || '';

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
      keyConcepts:
        extractSection(markdownText, 'Key Concepts') || 'No key concepts could be generated.',
      bulletNotes:
        extractSection(markdownText, 'Bullet Notes') || 'No bullet notes could be generated.',
      quizQuestions:
        extractSection(markdownText, 'Quiz Questions') || 'No quiz questions could be generated.',
      visualExplanation: extractSection(markdownText, 'Visual'),
    };

    setExpandedId(index);
    setActiveTab('summary');
    setSelectedNotes(sections);
  };

  const handleDelete = async (lectureId, index) => {
    if (!window.confirm('Are you sure you want to delete this lecture?')) return;

    setDeletingId(lectureId);
    setDeleteError(null);

    try {
      await deleteLecture(lectureId);
      setLectures((prev) => prev.filter((_, i) => i !== index));
      if (expandedId === index) {
        setExpandedId(null);
        setSelectedNotes(null);
      }
      setDeletingId(null);
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete lecture.';
      // Show user-friendly error messages
      if (errorMsg.includes('Cannot connect') || errorMsg.includes('Failed to fetch')) {
        setDeleteError('🔌 Server connection failed. Please check if the server is running.');
      } else if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
        setDeleteError('🔐 Authentication failed. Please log in again.');
      } else {
        setDeleteError(`❌ ${errorMsg}`);
      }
      setDeletingId(null);
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
            <section className="dashboard-hero">
              <h2>My Lectures</h2>
              <p>Browse your saved lectures and revisit the generated notes.</p>
            </section>

            {loading && (
              <div className="lectures-status">
                <p>Loading your lectures...</p>
              </div>
            )}

            {error && (
              <div className="error-alert">
                {error}
              </div>
            )}

            {deleteError && (
              <div className="error-alert">
                {deleteError}
              </div>
            )}

            {!loading && !error && (
              <section className="lectures-list">
                {lectures.length === 0 ? (
                  <p className="lectures-empty">No lectures saved yet. Generate some notes first.</p>
                ) : (
                  lectures.map((lecture, index) => (
                    <article key={lecture._id || lecture.youtubeLink + index} className="lecture-item">
                      <div className="lecture-header">
                        <div className="lecture-info-wrapper">
                          <div className="lecture-thumbnail-container">
                            {getYouTubeVideoId(lecture.youtubeLink) ? (
                              <img
                                src={getYouTubeThumbnail(getYouTubeVideoId(lecture.youtubeLink))}
                                alt="Video Thumbnail"
                                className="lecture-thumbnail"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="lecture-thumbnail-fallback">
                                <span>No Thumbnail</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="lecture-meta">
                            <a 
                              href={lecture.youtubeLink}
                              target="_blank"
                              rel="noreferrer"
                              className="lecture-title-link"
                              title={lecture.fetchedTitle || getCleanTitle(lecture.youtubeLink)}
                            >
                              {lecture.fetchedTitle || getCleanTitle(lecture.youtubeLink)}
                            </a>
                            <span className="lecture-date">
                              {formatDate(lecture.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="lecture-actions">
                          <button
                            className="view-notes-btn"
                            onClick={() => handleViewNotes(lecture, index)}
                          >
                            {expandedId === index ? 'Hide Notes' : 'View Notes'}
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(lecture._id, index)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {expandedId === index && selectedNotes && (
                        <div className="lecture-notes">
                          <NotesDisplay
                            parsedNotes={selectedNotes}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                          />
                        </div>
                      )}
                    </article>
                  ))
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default MyLectures;
