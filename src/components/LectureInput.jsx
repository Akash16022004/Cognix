import React from 'react';

function LectureInput({ link, isGenerating, onChange, onSubmit }) {
  if (isGenerating) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)] p-8 shadow-2xl flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto w-full my-8">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute w-full h-full border-4 border-t-[var(--accent-primary)] border-r-[var(--accent-primary)] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute w-12 h-12 border-4 border-b-[var(--accent-secondary)] border-l-[var(--accent-secondary)] border-t-transparent border-r-transparent rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
        </div>
        
        <h3 className="text-[var(--text-main)] text-xl font-semibold mb-2 text-center">
          🧠 Cognix is analyzing the lecture...
        </h3>
        
        <div className="flex flex-col gap-3 w-full max-w-sm text-sm text-[var(--text-muted)] mt-2">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
            <span>Extracting transcript</span>
          </div>
          <div className="flex items-center gap-3 animate-pulse" style={{ animationDelay: '0.4s' }}>
            <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
            <span>Understanding the lecture</span>
          </div>
          <div className="flex items-center gap-3 animate-pulse" style={{ animationDelay: '0.8s' }}>
            <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
            <span>Generating structured study notes</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="input-card">
      <input
        type="text"
        className="workspace-input"
        placeholder="Paste a YouTube lecture link to analyze..."
        value={link}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit();
        }}
        disabled={isGenerating}
      />
      <button
        className={`generate-btn ${isGenerating ? 'generating' : ''}`}
        onClick={onSubmit}
        disabled={!link || isGenerating}
      >
        Generate Notes
        <span className="btn-icon">✨</span>
      </button>
    </div>
  );
}

export default LectureInput;

