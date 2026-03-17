import React from 'react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';

function Dashboard() {
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
              <h2>Welcome to Cognix</h2>
              <p>
                Generate structured notes from YouTube lectures, visualize concepts, and build your own
                knowledge base.
              </p>
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Start a New Lecture</h3>
                <p>Paste a lecture link and let Cognix turn it into rich study notes.</p>
              </div>
              <div className="dashboard-card">
                <h3>Review Your Lectures</h3>
                <p>Revisit previously generated notes and continue learning at your pace.</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

