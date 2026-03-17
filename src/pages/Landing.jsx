import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f1a] via-[#0f172a] to-[#1e1b4b] text-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl tracking-tight">Cognix</div>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-white/10 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <section className="text-center py-24 max-w-3xl mx-auto px-6">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Turn 2-Hour Lectures into
          <br />
          5-Minute Study Notes
        </h1>
        <p className="text-lg text-gray-400 mb-8">
          Paste a YouTube lecture and Cognix will generate structured notes, key concepts, quiz
          questions, and diagrams instantly.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/signup"
            className="bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 rounded-lg font-medium hover:opacity-90 transition"
          >
            Try Cognix
          </Link>
          <Link
            to="/login"
            className="bg-slate-800 px-6 py-3 rounded-lg hover:bg-slate-700 transition"
          >
            Login
          </Link>
        </div>
      </section>

      <section className="py-16">
        <h2 className="text-3xl font-semibold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6">
          <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              1️⃣
            </div>
            <div className="font-semibold text-lg mb-2">Paste YouTube Link</div>
            <p className="text-gray-400">
              Simply paste any YouTube lecture link into Cognix. Works with any educational video.
            </p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              2️⃣
            </div>
            <div className="font-semibold text-lg mb-2">AI Processes Content</div>
            <p className="text-gray-400">
              Cognix extracts the transcript and analyzes it using advanced AI to understand the
              lecture.
            </p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              3️⃣
            </div>
            <div className="font-semibold text-lg mb-2">Get Study Notes</div>
            <p className="text-gray-400">
              Receive structured notes, key concepts, quiz questions, and visual diagrams instantly.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <h2 className="text-3xl font-semibold text-center mb-12 mt-20">Powerful Features</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-6">
          {[
            {
              title: 'AI Lecture Summaries',
              desc: 'Get concise, comprehensive summaries of entire lectures in seconds.',
              icon: '🧠',
            },
            {
              title: 'Key Concepts Extraction',
              desc: 'Automatically identify and explain the most important concepts from lectures.',
              icon: '💡',
            },
            {
              title: 'Quiz Questions',
              desc: 'Quiz yourself with AI-generated exam-style questions for each lecture.',
              icon: '❓',
            },
            {
              title: 'Visual Diagrams',
              desc: 'Understand complex concepts with AI-generated diagrams.',
              icon: '📊',
            },
            {
              title: 'Download PDF Notes',
              desc: 'Download your study notes as a neatly formatted PDF for offline use.',
              icon: '📄',
            },
            {
              title: 'Personal Lecture Library',
              desc: 'Save and organize all your generated notes in one convenient place.',
              icon: '📚',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-slate-900/60 backdrop-blur-lg border border-slate-800 rounded-2xl p-6 shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <div className="font-semibold text-lg mb-2">{f.title}</div>
              <p className="text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-20">
        <h3 className="text-3xl font-bold mb-6">Start studying smarter today</h3>
        <Link
          to="/signup"
          className="bg-gradient-to-r from-purple-500 to-blue-500 px-8 py-3 rounded-lg text-lg font-medium hover:opacity-90 transition inline-block"
        >
          Create Free Account
        </Link>
      </section>

      <footer className="text-center text-gray-500 py-6">Cognix © 2026</footer>
    </div>
  );
}

export default Landing;

