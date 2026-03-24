import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidBlock from './MermaidBlock.jsx';

function NotesDisplay({ parsedNotes, activeTab, setActiveTab }) {
  const notesRef = useRef(null);
  const [copied, setCopied] = useState(false);

  if (!parsedNotes) return null;

  const tabs = [
    { id: 'summary', label: 'Summary', icon: '📝' },
    { id: 'keyConcepts', label: 'Key Concepts', icon: '🔑' },
    { id: 'bulletNotes', label: 'Bullet Notes', icon: '📋' },
    { id: 'quizQuestions', label: 'Quiz Questions', icon: '❓' },
  ];

  if (parsedNotes.visualExplanation) {
    tabs.push({ id: 'visualExplanation', label: 'Visuals', icon: '📊' });
  }

  const downloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = notesRef.current;
    if (!element) return;

    // Build all sections into a single HTML string for full PDF
    const sectionOrder = [
      { key: 'summary', title: 'Summary' },
      { key: 'keyConcepts', title: 'Key Concepts' },
      { key: 'bulletNotes', title: 'Bullet Notes' },
      { key: 'quizQuestions', title: 'Quiz Questions' },
    ];
    if (parsedNotes.visualExplanation) {
      sectionOrder.push({ key: 'visualExplanation', title: 'Visual Explanation' });
    }

    // Create a temporary container with all sections for PDF
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'padding: 30px; font-family: Inter, system-ui, sans-serif; color: #1e293b; line-height: 1.7; max-width: 700px;';

    // Add Cognix header
    const header = document.createElement('div');
    header.innerHTML = `
      <h1 style="font-size: 28px; font-weight: 800; color: #6366f1; margin-bottom: 4px;">Cognix</h1>
      <p style="font-size: 13px; color: #64748b; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">AI-Generated Study Notes</p>
    `;
    tempDiv.appendChild(header);

    sectionOrder.forEach(({ key, title }) => {
      if (!parsedNotes[key]) return;
      const section = document.createElement('div');
      section.style.cssText = 'margin-bottom: 24px;';
      section.innerHTML = `<h2 style="font-size: 18px; font-weight: 700; color: #6366f1; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">${title}</h2>`;
      
      // Render markdown to HTML
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'font-size: 14px; color: #334155;';
      // Simple markdown to HTML conversion for PDF
      let html = parsedNotes[key]
        .replace(/### (.*)/g, '<h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:12px 0 6px;">$1</h3>')
        .replace(/## (.*)/g, '<h3 style="font-size:16px;font-weight:600;color:#1e293b;margin:12px 0 6px;">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*)/gm, '<li style="margin-bottom:4px;">$1</li>')
        .replace(/^\d+\. (.*)/gm, '<li style="margin-bottom:4px;">$1</li>')
        .replace(/(<li.*<\/li>)/g, '<ul style="padding-left:20px;margin:8px 0;">$1</ul>')
        .replace(/\n\n/g, '<br/>')
        .replace(/```mermaid[\s\S]*?```/g, '<p style="color:#64748b;font-style:italic;">[Mermaid diagram — view in app]</p>')
        .replace(/```[\s\S]*?```/g, '<pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px;overflow-x:auto;">$&</pre>');
      contentDiv.innerHTML = html;
      section.appendChild(contentDiv);
      tempDiv.appendChild(section);
    });

    document.body.appendChild(tempDiv);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: 'cognix-notes.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    await html2pdf().set(opt).from(tempDiv).save();
    document.body.removeChild(tempDiv);
  };

  return (
    <div className="content-card">
      <div className="tabs-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="tab-actions">
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={() => {
              navigator.clipboard.writeText(parsedNotes[activeTab]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Copy current tab to clipboard"
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
          <button
            className="download-pdf-btn"
            onClick={downloadPDF}
            title="Download all notes as PDF"
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      <div id="notes-content" ref={notesRef} className="tab-content-area markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (!inline && language === 'mermaid') {
                const code = String(children).replace(/\n$/, '');
                return <MermaidBlock code={code} />;
              }

              if (inline) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }

              return (
                <pre className={className}>
                  <code {...props}>{children}</code>
                </pre>
              );
            },
          }}
        >
          {parsedNotes[activeTab]}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default NotesDisplay;
