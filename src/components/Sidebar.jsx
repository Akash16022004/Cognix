import React from 'react';
import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-title">Navigation</p>
        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            🏠 Dashboard
          </NavLink>
          <NavLink to="/new" className="sidebar-link">
            ✨ New Lecture
          </NavLink>
          <NavLink to="/lectures" className="sidebar-link">
            📚 My Lectures
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;

